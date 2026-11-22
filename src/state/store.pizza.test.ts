/// <reference types="node" />
/**
 * The first game's store layer (guard:new:2): what the shared store pays Pizza Empire must stay what
 * the main branch paid. The engine guard (src/engine/modeRegression.test.ts) replays the engine
 * functions; these replay the store actions on top of them, where this round changed code that both
 * games run (the offline ad multiplier of Decision 42, the gem Time Warp of rules-7, the daily gift
 * switch of Decision 53). Pizza installs no engine mode, so every action takes the sim path.
 *
 * The real store runs under node with the native services replaced by stand-ins.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { buildPreset } from '../dev/presets.web';
import * as E from '../engine/economy';

const played = vi.hoisted(() => [] as string[]);
const adResult = vi.hoisted(() => ({ ok: true }));
vi.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return { default: { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => void m.set(k, v), removeItem: async (k: string) => void m.delete(k) } };
});
vi.mock('../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'pizza-empire', rawGame: (await import('../../games/pizza-empire/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../services/fx', () => ({ fx: { play: (k: string) => void played.push(k) } }));
vi.mock('../services/ads', () => ({ ads: { showRewarded: async () => adResult.ok, maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
vi.mock('../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../services/region', () => ({ detectRegion: async () => null }));

const cfg = GameConfigSchema.parse(pizza);
const NOW = Date.UTC(2026, 10, 1, 12, 0, 0);

async function storeWith(game: unknown) {
  const { installEngineMode } = await import('../engine/mode');
  installEngineMode(null);
  const { useGame } = await import('./store');
  useGame.setState({ cfg: cfg as never, game: game as never, hydrated: true, offline: null });
  return { useGame };
}

afterEach(() => {
  vi.useRealTimers();
  adResult.ok = true;
});

describe('Pizza Empire through the shared store', () => {
  it('is a sim game and the store has no engine mode for it', async () => {
    const { engineFor } = await import('../engine/mode');
    expect(cfg.mode).toBe('sim');
    await storeWith(E.createInitialState(cfg, NOW));
    expect(engineFor(cfg)).toBeNull();
  });

  it('collectOffline(true) pays exactly twice the offline earnings (the welcome back "x2")', async () => {
    const { useGame } = await storeWith(buildPreset(cfg, 'mid', NOW));
    const before = useGame.getState().game.cash;
    useGame.setState({ offline: { seconds: 3600, earnings: 1234.5 } });
    await useGame.getState().collectOffline(true);
    expect(useGame.getState().game.cash - before).toBe(2469);
    expect(useGame.getState().offline).toBeNull();
  });

  it('collectOffline(false), or a declined ad, pays the earnings once', async () => {
    const { useGame } = await storeWith(buildPreset(cfg, 'mid', NOW));
    const before = useGame.getState().game.cash;
    useGame.setState({ offline: { seconds: 3600, earnings: 1000 } });
    await useGame.getState().collectOffline(false);
    expect(useGame.getState().game.cash - before).toBe(1000);
    adResult.ok = false;
    useGame.setState({ offline: { seconds: 3600, earnings: 1000 } });
    await useGame.getState().collectOffline(true);
    expect(useGame.getState().game.cash - before).toBe(2000);
  });

  it('gemTimeWarp with income charges the price and pays an hour of income', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const mid = { ...buildPreset(cfg, 'mid', NOW), gems: 1000 };
    const { useGame } = await storeWith(mid);
    const income = E.incomePerSecond(cfg, mid, NOW);
    expect(income).toBeGreaterThan(0);
    const cash = useGame.getState().game.cash;
    played.length = 0;
    useGame.getState().gemTimeWarp();
    const g = useGame.getState().game;
    expect(g.gems).toBe(1000 - cfg.economy.timeWarp.gemCost);
    expect(g.cash - cash).toBeCloseTo(income * cfg.economy.timeWarp.hours * 3600, 3);
    expect(played).toContain('offline_collect');
  });

  it('gemTimeWarp without enough gems is denied and takes nothing', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const { useGame } = await storeWith({ ...buildPreset(cfg, 'mid', NOW), gems: cfg.economy.timeWarp.gemCost - 1 });
    const before = useGame.getState().game;
    played.length = 0;
    useGame.getState().gemTimeWarp();
    expect(useGame.getState().game.gems).toBe(before.gems);
    expect(useGame.getState().game.cash).toBe(before.cash);
    expect(played).toContain('ui_denied');
  });

  it('claimDaily pays the 7-day table once a day, as the main branch did', async () => {
    expect(cfg.economy.daily.gems).toStrictEqual([5, 5, 10, 10, 15, 20, 50]);
    const { useGame } = await storeWith({ ...E.createInitialState(cfg, NOW), gems: 0 });
    const paid: number[] = [];
    for (const day of [0, 0, 1, 2, 3, 4, 5, 6, 7]) {
      vi.useFakeTimers({ now: NOW + day * 86_400_000, toFake: ['Date'] });
      const before = useGame.getState().game.gems;
      useGame.getState().claimDaily();
      paid.push(useGame.getState().game.gems - before);
    }
    expect(paid).toStrictEqual([5, 0, 5, 10, 10, 15, 20, 50, 5]);
  });
});
