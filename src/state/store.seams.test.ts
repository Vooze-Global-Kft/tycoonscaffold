/// <reference types="node" />
/**
 * The two seams of office-design.md 2.15 in the shared store (src/engine/mode.ts `paysOnCompute`,
 * `catchUpSeconds`; src/state/store.ts resume, boot and collectOffline):
 * - a game whose mode sets neither (Pizza Empire, no engine at all; a stand-in engine without them)
 *   is caught up by ticking after a short absence, shown a report after a long one and paid only when
 *   it collects, exactly as before the seams existed;
 * - a mode with `paysOnCompute` has its earnings in cash in the same update that computed them, and
 *   its report's ad pays only the extra; `catchUpSeconds: 0` never ticks an absence.
 * The real store runs under node with the native services replaced by stand-ins (as store.pizza.test.ts).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { buildPreset } from '../dev/presets.web';
import * as E from '../engine/economy';
import type { EngineMode } from '../engine/mode';
import type { GameState } from '../engine/types';

const adResult = vi.hoisted(() => ({ ok: true, during: null as null | (() => void) }));
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async (k: string) => storage.get(k) ?? null, setItem: async (k: string, v: string) => void storage.set(k, v), removeItem: async (k: string) => void storage.delete(k) },
}));
vi.mock('../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'pizza-empire', rawGame: (await import('../../games/pizza-empire/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../services/ads', () => ({ ads: { showRewarded: async () => (adResult.during?.(), adResult.ok), maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
vi.mock('../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../services/region', () => ({ detectRegion: async () => null }));

const cfg = GameConfigSchema.parse(pizza);
const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);
/** Each test starts at its own later moment, so the store's module clock (lastTickAt) never covers it. */
let clock = T0;
const nextMoment = () => (clock += 30 * 86_400_000);

/** A stand-in engine for the sim config: earns 10/s ticking and 3/s away; `game` returned or not, seams as given. */
function standIn(seams: Partial<Pick<EngineMode, 'paysOnCompute' | 'catchUpSeconds'>>, returnsGame: boolean) {
  const ticked: number[] = [];
  const mode: EngineMode = {
    id: 'sim',
    saveTag: 'seams1',
    create: (_c, b) => b,
    reconcile: (_c, b) => b,
    tick: (_c, s, dt) => {
      ticked.push(dt);
      return { ...s, cash: s.cash + 10 * dt, stats: { ...s.stats, playSeconds: s.stats.playSeconds + dt } };
    },
    income: () => 3,
    activeIncome: () => 10,
    offline: (_c, s, now) => {
      const seconds = Math.max(0, (now - Math.max(s.lastSavedAt, s.stats.clockHigh ?? 0)) / 1000);
      return { seconds, earnings: 3 * seconds, game: (returnsGame ? s : undefined) as GameState };
    },
    prestige: (_c, s) => s,
    offlineAdMultiplier: () => 1.5,
    ...seams,
  };
  return { mode, ticked };
}

async function storeAway(seconds: number, mode: EngineMode | null) {
  const { installEngineMode } = await import('../engine/mode');
  installEngineMode(null);
  const now = nextMoment();
  vi.useFakeTimers({ now, toFake: ['Date'] });
  const { useGame } = await import('./store');
  // A game with income (the web preview's mid preset, played on the built-in rules), so Pizza earns while away.
  const game = { ...buildPreset(cfg, 'mid', now - seconds * 1000), cash: 1000 };
  installEngineMode(mode);
  useGame.setState({ cfg: cfg as never, game: { ...game, lastSavedAt: now - seconds * 1000 } as never, hydrated: true, offline: null });
  return { useGame, now, before: game };
}

afterEach(async () => {
  vi.useRealTimers();
  adResult.ok = true;
  adResult.during = null;
  (await import('../engine/mode')).installEngineMode(null);
});

describe('a mode without the seams: paid and caught up exactly as before', () => {
  it('Pizza Empire (no engine): a 30 s absence is ticked at full speed, no report', async () => {
    const { useGame, now, before } = await storeAway(30, null);
    const expected = E.tick(cfg, { ...before, lastSavedAt: now - 30_000 }, 30, now);
    useGame.getState().resume();
    expect(useGame.getState().offline).toBeNull();
    expect(useGame.getState().game.cash).toBeCloseTo(expected.cash, 6);
  });

  it('Pizza Empire (no engine): an hour away shows the report and pays only on collect', async () => {
    const { useGame, now, before } = await storeAway(3600, null);
    const computed = E.computeOffline(cfg, { ...before, lastSavedAt: now - 3_600_000 }, now);
    useGame.getState().resume();
    const offline = useGame.getState().offline!;
    expect(offline.earnings).toBeCloseTo(computed.earnings, 6);
    expect(useGame.getState().game.cash).toBe(1000);
    await useGame.getState().collectOffline(false);
    expect(useGame.getState().game.cash).toBeCloseTo(1000 + computed.earnings, 6);
  });

  it('an engine without the seams: a short absence is ticked (300 s limit), a long one paid on collect with the ad multiplier', async () => {
    const short = standIn({}, false);
    let s = await storeAway(30, short.mode);
    s.useGame.getState().resume();
    expect(short.ticked).toEqual([30]);
    expect(s.useGame.getState().game.cash).toBe(1000 + 300);
    const long = standIn({}, true);
    s = await storeAway(3600, long.mode);
    s.useGame.getState().resume();
    expect(long.ticked).toEqual([]);
    expect(s.useGame.getState().game.cash).toBe(1000);
    expect(s.useGame.getState().offline?.earnings).toBe(10_800);
    await s.useGame.getState().collectOffline(true);
    expect(s.useGame.getState().game.cash).toBe(1000 + 10_800 * 1.5);
  });

  it('an engine without the seams: boot shows the report and leaves cash unchanged until collect', async () => {
    const m = standIn({}, true);
    // boot() runs once per store module: each boot test loads a fresh store (the mocks stay).
    vi.resetModules();
    const { installEngineMode } = await import('../engine/mode');
    installEngineMode(m.mode);
    const now = nextMoment();
    vi.useFakeTimers({ now, toFake: ['Date'] });
    const saved = { ...E.createInitialState(cfg, now - 3_600_000), cash: 500, lastSavedAt: now - 3_600_000 };
    storage.set('save:pizza-empire:seams1', JSON.stringify(saved));
    const { useGame } = await import('./store');
    useGame.setState({ hydrated: false, offline: null });
    await useGame.getState().boot();
    expect(useGame.getState().offline?.earnings).toBe(10_800);
    expect(useGame.getState().game.cash, 'not paid at boot').toBe(500);
    expect(m.ticked, 'a long absence is not ticked').toEqual([]);
    await useGame.getState().collectOffline(false);
    expect(useGame.getState().game.cash, 'paid on collect, as before').toBe(500 + 10_800);
  });
});

describe('the seams of 2.15', () => {
  it('catchUpSeconds 0: a 30 s absence is never ticked, its earnings are granted', async () => {
    const m = standIn({ catchUpSeconds: 0 }, false);
    const { useGame } = await storeAway(30, m.mode);
    useGame.getState().resume();
    expect(m.ticked).toEqual([]);
    expect(useGame.getState().game.cash).toBe(1000 + 90);
  });

  it('paysOnCompute: the earnings are in cash at resume; collect without the ad adds nothing, with it only the extra', async () => {
    const m = standIn({ paysOnCompute: true, catchUpSeconds: 0 }, true);
    const { useGame } = await storeAway(3600, m.mode);
    useGame.getState().resume();
    expect(useGame.getState().game.cash, 'paid when computed').toBe(1000 + 10_800);
    expect(useGame.getState().offline?.earnings, 'the report only informs').toBe(10_800);
    adResult.ok = false;
    await useGame.getState().collectOffline(true);
    expect(useGame.getState().game.cash, 'a declined ad adds nothing').toBe(1000 + 10_800);
    expect(useGame.getState().offline).toBeNull();
  });

  it('paysOnCompute: the report\'s ad grants earnings × (multiplier − 1)', async () => {
    const m = standIn({ paysOnCompute: true, catchUpSeconds: 0 }, true);
    const { useGame } = await storeAway(3600, m.mode);
    useGame.getState().resume();
    await useGame.getState().collectOffline(true);
    expect(useGame.getState().game.cash).toBe(1000 + 10_800 + 5_400);
  });

  it('paysOnCompute: a resume during the ad merges more time, already paid; the ad pays half of both parts', async () => {
    const m = standIn({ paysOnCompute: true, catchUpSeconds: 0 }, true);
    const { useGame } = await storeAway(3600, m.mode);
    useGame.getState().resume();
    // While the video plays the app went to the background and came back: 600 s more, paid when computed and merged into the report.
    adResult.during = () => {
      const s = useGame.getState();
      useGame.setState({ game: { ...s.game, cash: s.game.cash + 1_800 }, offline: { ...s.offline!, seconds: s.offline!.seconds + 600, earnings: s.offline!.earnings + 1_800 } });
    };
    await useGame.getState().collectOffline(true);
    expect(useGame.getState().game.cash).toBe(1000 + 10_800 + 1_800 + (10_800 + 1_800) * 0.5);
  });

  it('paysOnCompute: a short absence is paid with no report and no tick', async () => {
    const m = standIn({ paysOnCompute: true, catchUpSeconds: 0 }, true);
    const { useGame } = await storeAway(30, m.mode);
    useGame.getState().resume();
    expect(m.ticked).toEqual([]);
    expect(useGame.getState().offline).toBeNull();
    expect(useGame.getState().game.cash).toBe(1000 + 90);
  });

  it('paysOnCompute: boot pays a returning player in the update that loads the save', async () => {
    const m = standIn({ paysOnCompute: true, catchUpSeconds: 0 }, true);
    // boot() runs once per store module: each boot test loads a fresh store (the mocks stay).
    vi.resetModules();
    const { installEngineMode } = await import('../engine/mode');
    installEngineMode(m.mode);
    const now = nextMoment();
    vi.useFakeTimers({ now, toFake: ['Date'] });
    const saved = { ...E.createInitialState(cfg, now - 3_600_000), cash: 500, lastSavedAt: now - 3_600_000 };
    storage.set('save:pizza-empire:seams1', JSON.stringify(saved));
    const { useGame } = await import('./store');
    useGame.setState({ hydrated: false, offline: null });
    await useGame.getState().boot();
    expect(useGame.getState().game.cash).toBe(500 + 10_800);
    expect(useGame.getState().offline?.earnings).toBe(10_800);
  });
});
