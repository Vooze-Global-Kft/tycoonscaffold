/// <reference types="node" />
/**
 * No frozen screen on returning (owner2-hud, item 2): the loop's order through the REAL shared store (native
 * services replaced by stand-ins, as src/state/store.pause.test.ts) with the salvage engine wrapped as the mode
 * hands it over (./returning.ts deferAway). The pass of an absence with an away card waits for the screen's
 * runPending; nothing ticks before it; it runs exactly once; a short absence takes the old path; a kill while it
 * waits loses nothing.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import type { GameState } from '../../engine/types';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async (k: string) => storage.get(k) ?? null, setItem: async (k: string, v: string) => void storage.set(k, v), removeItem: async (k: string) => void storage.delete(k) },
}));
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'scrap-yard', rawGame: (await import('../../../games/scrap-yard/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [], listing: async () => null, onTransactions: () => () => {} } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

const T0 = Date.UTC(2026, 10, 26, 9, 0, 0);
let clock = T0;
const nextMoment = () => (clock += 30 * 86_400_000);
const later = (ms: number) => vi.setSystemTime(Date.now() + ms);
const H = 3_600_000;

async function running() {
  const gj = (await import('../../../games/scrap-yard/game.json')).default;
  const { installEngineMode } = await import('../../engine/mode');
  const { salvageEngineMode } = await import('../../engine/salvageMode');
  const R = await import('./returning');
  R.resetPendingForTests();
  const now = nextMoment();
  vi.useFakeTimers({ now, toFake: ['Date'] });
  const { useGame } = await import('../../state/store');
  const E = await import('../../engine/economy');
  const engine = R.deferAway(salvageEngineMode);
  installEngineMode(engine);
  const cfg = salvageEngineMode.config!(GameConfigSchema.parse(gj));
  let game = E.createInitialState(cfg, now) as GameState & { salvage: { counts: Record<string, number> } };
  // A yard in which something was done (the away card needs one: away.ts `played`).
  game = { ...game, lastSavedAt: now, salvage: { ...game.salvage, counts: { ...game.salvage.counts, 'cut:washer': 1 } } };
  useGame.setState({ cfg: cfg as never, game: game as never, hydrated: true, offline: null });
  // Live play for a second: the yard's clock is now.
  for (let k = 0; k < 10; k++) {
    later(100);
    useGame.getState().tick(0.1);
  }
  const S = () => (useGame.getState().game as unknown as { salvage: { t: number; away: { seconds: number } | null; clock: { highMs: number }; epoch: number } }).salvage;
  return { useGame, R, engine, S, cfg };
}

afterEach(async () => {
  vi.useRealTimers();
  (await import('../../engine/mode')).installEngineMode(null);
});

describe('the away pass waits for the counting card', () => {
  it('back after three hours: nothing is computed at resume, nothing ticks, then runPending makes the one pass', async () => {
    const { useGame, R, S } = await running();
    await useGame.getState().pause();
    later(3 * H);
    const before = useGame.getState().game;
    const t0 = S().t;
    useGame.getState().resume();
    expect(R.pendingAbsence()).not.toBeNull();
    expect(S().away).toBeNull();
    expect(S().t).toBe(t0);
    // The loop's ticks while the card is painted: the state does not move (no tick of live play with the old clock).
    const held = useGame.getState().game;
    for (let k = 0; k < 5; k++) {
      later(16);
      useGame.getState().tick(0.016);
    }
    expect((useGame.getState().game as unknown as { salvage: unknown }).salvage).toBe((held as unknown as { salvage: unknown }).salvage);
    // Nor the presence (the screen's samples keep coming under the card).
    const { salvageActions } = await import('./actions');
    expect(salvageActions.presence({ x: 1, y: 1, driving: false, moving: true, standingFor: 0 })).toBe(false);
    expect(S().t).toBe(t0);
    void before;
    // The screen calls the pass two frames after the card is on screen: exactly once.
    expect(R.runPending()).toBe(true);
    const away = S().away;
    expect(away).not.toBeNull();
    expect(away!.seconds).toBeGreaterThan(0);
    expect(R.pendingAbsence()).toBeNull();
    expect(R.runPending()).toBe(false);
    const after = S();
    // Live play goes on from there: one tick moves the yard by its dt, no second pass.
    later(100);
    useGame.getState().tick(0.1);
    expect(S().away!.seconds).toBe(away!.seconds);
    expect(S().t).toBeCloseTo(after.t + 0.1, 6);
  });

  it('the pass pays what the old path paid: the same absence, the same card', async () => {
    const a = await running();
    await a.useGame.getState().pause();
    const g0 = a.useGame.getState().game;
    later(3 * H);
    const at = Date.now();
    // The old path: the engine's own offline on the state the store's resume hands it.
    const { salvageEngineMode } = await import('../../engine/salvageMode');
    const old = salvageEngineMode.offline(a.cfg, { ...g0, lastSavedAt: g0.lastSavedAt }, at).game as unknown as { salvage: { away: { seconds: number; money: number } } };
    a.useGame.getState().resume();
    a.R.runPending(at);
    const now = a.S().away as unknown as { seconds: number; money: number };
    expect(now.seconds).toBe(old.salvage.away.seconds);
    expect(now.money).toBe(old.salvage.away.money);
  });

  it('two returns before the pass (background again while it waits): one pass, from the first absence', async () => {
    const { useGame, R, S } = await running();
    await useGame.getState().pause();
    const left = Date.now();
    later(1 * H);
    useGame.getState().resume();
    const p = R.pendingAbsence();
    expect(p).not.toBeNull();
    await useGame.getState().pause();
    later(1 * H);
    useGame.getState().resume();
    expect(R.pendingAbsence()).toBe(p);
    expect(R.runPending()).toBe(true);
    // Both hours: counted from the moment he first left (the card's absence; what was paid is that, capped).
    const away = S().away as unknown as { seconds: number; absentS: number };
    expect(away.absentS).toBeGreaterThan(2 * 3600 - 2);
    expect(away.absentS).toBeLessThan(2 * 3600 + 2);
    expect(Math.abs(S().clock.highMs - Date.now())).toBeLessThan(1000);
    expect(p!.from).toBeLessThanOrEqual(left);
    expect(R.runPending()).toBe(false);
  });

  it('a short absence (no away card) takes the old path: nothing waits, the yard ticks on', async () => {
    const { useGame, R, S } = await running();
    await useGame.getState().pause();
    later(30_000);
    useGame.getState().resume();
    expect(R.pendingAbsence()).toBeNull();
    const t = S().t;
    later(100);
    useGame.getState().tick(0.1);
    expect(S().t).toBeGreaterThan(t);
    expect(S().away).toBeNull();
  });

  it('the tick path (no resume: a stalled or hidden page): the first tick after the gap waits too', async () => {
    const { useGame, R, S } = await running();
    later(2 * H);
    const t = S().t;
    useGame.getState().tick(0.1);
    expect(R.pendingAbsence()).not.toBeNull();
    expect(S().t).toBe(t);
    expect(R.runPending()).toBe(true);
    expect(S().away).not.toBeNull();
  });

  it('killed while it waits: the save holds a later stamp than the yard clock, and the next start counts from the yard clock', async () => {
    const { useGame, R, cfg } = await running();
    await useGame.getState().pause();
    later(3 * H);
    useGame.getState().resume();
    expect(R.pendingAbsence()).not.toBeNull();
    later(5_000);
    await useGame.getState().save();
    const onDisk = [...storage.values()].map((v) => JSON.parse(v) as GameState).pop()! as unknown as Parameters<typeof R.absenceOf>[1];
    // The store stamped the save at now, the yard's clock is three hours older.
    expect(onDisk.lastSavedAt - onDisk.salvage.clock.highMs).toBeGreaterThan(3 * H - 1);
    // The next start (the app killed, the pending absence forgotten) an hour later: the whole four hours are owed.
    R.resetPendingForTests();
    const p = R.absenceOf(cfg as never, onDisk, Date.now() + H);
    expect(p).not.toBeNull();
    expect(p!.from).toBe(onDisk.salvage.clock.highMs);
  });
});
