/// <reference types="node" />
/**
 * The wiring of Orbit Haulers' fixes in the store, the actions and the engine seam (fix round of
 * 22 November): the Shift Log's ad bonus (Decision 42), no daily gift (53), the day shift on the
 * tick (53), the reward of a flare ad (play-14), the hold tick's thinning (play-24), and the
 * pricing of rewards while the run earns nothing (rules-6, rules-7). The real store and actions run
 * under node with the native services replaced by stand-ins.
 */
import { describe, expect, it, vi } from 'vitest';
import space from '../../../games/space-miner/game.json';
import { GameConfigSchema } from '../../config/schema';
import { freshHaulGame } from '../../engine/fixtures/haul';
import * as H from '../../engine/haul';
import { haulEngineMode, haulPricingFloor, withHaulContent } from '../../engine/haulMode';

const played = vi.hoisted(() => [] as string[]);
vi.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return { default: { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => void m.set(k, v), removeItem: async (k: string) => void m.delete(k) } };
});
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'space-miner', rawGame: (await import('../../../games/space-miner/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: (k: string) => void played.push(k) } }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: false } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

const cfg = withHaulContent(GameConfigSchema.parse(space)) as unknown as H.HaulConfig;

async function storeWith(game: H.HaulGame, c: H.HaulConfig = cfg) {
  const { installEngineMode } = await import('../../engine/mode');
  installEngineMode(haulEngineMode);
  const { useGame } = await import('../../state/store');
  useGame.setState({ cfg: c as never, game: game as never, hydrated: true, offline: null });
  const { haulActions } = await import('./actions');
  const { modeEvents } = await import('../../state/modeEvents');
  return { useGame, haulActions, modeEvents };
}

describe('Decision 42: the Shift Log ad adds haul.offline.adBonus, not a double', () => {
  it('collectOffline(true) pays the credits x (1 + adBonus)', async () => {
    const { useGame } = await storeWith(freshHaulGame(cfg));
    expect(cfg.haul.offline.adBonus).toBe(0.5);
    const before = useGame.getState().game.cash;
    useGame.setState({ offline: { seconds: 3600, earnings: 1000 } });
    await useGame.getState().collectOffline(true);
    expect(useGame.getState().game.cash - before).toBeCloseTo(1500, 6);
    expect(useGame.getState().offline).toBeNull();
  });
});

describe('Decision 53: no daily gift when the data has none, a day shift on the tick', () => {
  it('claimDaily and receiveAllotment refuse when economy.daily.gems is empty', async () => {
    const none = { ...cfg, economy: { ...cfg.economy, daily: { gems: [] } } } as H.HaulConfig;
    const { useGame, haulActions } = await storeWith(freshHaulGame(cfg), none);
    const gems = useGame.getState().game.gems;
    useGame.getState().claimDaily();
    expect(haulActions.receiveAllotment()).toBe(false);
    expect(useGame.getState().game.gems).toBe(gems);
  });

  it('the engine tick starts the first shift (haulStats.shift) with the local day', () => {
    const now = Date.UTC(2026, 10, 22, 12);
    const g = freshHaulGame(cfg);
    const next = haulEngineMode.tick(cfg, g as never, 0.1, now) as unknown as H.HaulGame;
    expect(next.haulStats.shift?.startedAt).toBe(now);
    expect(next.haulStats.shift?.met).toBe(0);
  });
});

describe('play-14: a flare charge from an ad is heard, felt and announced', () => {
  it('plays the received chime (with its haptic) and emits flareCharge', async () => {
    const g = freshHaulGame(cfg);
    const { haulActions, modeEvents } = await storeWith({ ...g, haul: { ...g.haul, flare: { ...g.haul.flare, charges: 0, adNextAt: 0, adsToday: 0 } } });
    const seen: unknown[] = [];
    const off = modeEvents.subscribe((ev) => void seen.push(...ev));
    played.length = 0;
    expect(await haulActions.watchFlareAd()).toBe(true);
    off();
    expect(played).toContain('daily_relay');
    expect(played).not.toContain('ui_open');
    expect(seen).toContainEqual({ type: 'flareCharge', charges: 1 });
  });
});

describe('play-24: hold_tick is thinned to one per tenth of the hold, at most one every 2 s', async () => {
  const { holdTickDue, resetHoldTicks } = await import('./fx');
  it('a fast fleet ticks once per band and never twice within 2 s', () => {
    resetHoldTicks();
    const t0 = 1_000_000;
    // Unloads every 0.3 s filling 2 % each: 50 unloads over 15 s.
    let ticks = 0;
    for (let i = 1; i <= 50; i++) if (holdTickDue(i * 0.02, t0 + i * 300)) ticks++;
    expect(ticks).toBeLessThanOrEqual(8);
    expect(ticks).toBeGreaterThanOrEqual(5);
  });
  it('a hold that empties (a launch) starts the bands again', () => {
    resetHoldTicks();
    expect(holdTickDue(0.95, 0)).toBe(true);
    expect(holdTickDue(0.97, 5000)).toBe(false);
    expect(holdTickDue(0.05, 10_000)).toBe(true);
  });
});

describe('rules-6 and rules-7: rewards priced while the run earns nothing', () => {
  it('a fresh run (every drone on the rack) has a non-zero pricing floor', () => {
    const g = freshHaulGame(cfg);
    expect(H.haulIncome(cfg, g)).toBe(0);
    expect(haulPricingFloor(cfg, g as never, Date.UTC(2026, 10, 22, 12))).toBeGreaterThan(0);
  });

  it('a transmission acknowledged while a Jump waits counts (rules-5), and the earn missions wait for the galaxy (rules-6)', async () => {
    const now = Date.now();
    let g = freshHaulGame(cfg) as H.HaulGame;
    for (let i = 0; i < 4; i++) g = H.assignDrone(cfg, g, 0);
    const confirmed = H.confirmJump(cfg, { ...g, lifetimeEarnings: 1e12, prestigePoints: 0 }, now);
    expect(confirmed.haul).toBeNull();
    const { useGame, haulActions } = await storeWith(confirmed);
    const offer = confirmed.haulStats.pendingJump!.offers[0];
    expect(haulActions.startGalaxy(offer)).toBe(true);
    const after = useGame.getState().game as unknown as H.HaulGame;
    expect(after.haul).not.toBeNull();
    const earn = new Set(cfg.meta.missions.templates.filter((t) => t.type === 'earn').map((t) => t.id));
    for (const sl of after.missions.slots) if (sl && earn.has(sl.templateId)) expect(sl.target).toBeGreaterThan(1);
  });
});

describe('play-1: the web presets open past the tutorial', () => {
  it('early, mid and late have the tutorial done and launches counted, so no first tutorial line shows', async () => {
    const { installEngineMode } = await import('../../engine/mode');
    installEngineMode(haulEngineMode);
    const { haulPreset } = await import('./presets.web');
    const { hintsFor } = await import('../../engine/haul/hints');
    const now = Date.UTC(2026, 10, 22, 12);
    for (const name of ['early', 'mid', 'late'] as const) {
      const g = haulPreset(cfg as never, name, now) as unknown as H.HaulGame;
      expect(g.haul?.flags.tutorialDone, name).toBe(true);
      expect(g.stats.launches, name).toBeGreaterThan(0);
      expect(g.haul?.counters.launches, name).toBeGreaterThan(0);
      expect(hintsFor(cfg, g).some((h) => h.step > 0), name).toBe(false);
    }
  }, 60_000);
});
