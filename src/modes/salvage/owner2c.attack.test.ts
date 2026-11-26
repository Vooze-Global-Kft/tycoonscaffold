/// <reference types="node" />
/**
 * owner2-fix-hud: the return, through THE REAL LOAD PATH (the shared store's boot: reconcileState with the mode's
 * reconcile, clampClock, the offline seam; native services stood in, as ./returning.test.ts). Each "start" is a new
 * JavaScript context (vi.resetModules: a fresh store, a fresh engine, the deferral put on it in place as the mode's
 * entry does, ./index.tsx) reading the save the last one left in storage, as a killed app does.
 *
 * A1 (the attacker's kill.test.ts, its two sequences, copied here): killed after resume's save; killed during the
 *   loading curtain after an autosave. Then: no double pay; a device clock set back while it waits.
 * A2: an action pressed while it waits is a refusal (`nothing`), not "applied".
 * A3: a pass that throws leaves a running yard; the 8 s safety net.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineMode } from '../../engine/mode';
import type { GameState } from '../../engine/types';

const storage = vi.hoisted(() => new Map<string, string>());
const crashes = vi.hoisted(() => [] as string[]);
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async (k: string) => storage.get(k) ?? null, setItem: async (k: string, v: string) => void storage.set(k, v), removeItem: async (k: string) => void storage.delete(k) },
}));
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'scrap-yard', rawGame: (await import('../../../games/scrap-yard/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, setAudience: () => {}, interstitials: true } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [], listing: async () => null, onTransactions: () => () => {} } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

const H = 3_600_000;
const MIN = 60_000;
let clock = Date.UTC(2026, 10, 26, 9, 0, 0);
const later = (ms: number) => vi.setSystemTime(Date.now() + ms);

type Yard = { t: number; away: { seconds: number; absentS?: number; money: number } | null; clock: { highMs: number }; counts: Record<string, number> };

/** A start of the app: a new context that boots from the save in storage. */
async function start() {
  vi.resetModules();
  const { baseGame } = await import('../../config/game');
  const { installEngineMode } = await import('../../engine/mode');
  const { salvageEngineMode } = await import('../../engine/salvageMode');
  Object.assign(baseGame, salvageEngineMode.config!(baseGame));
  const R = await import('./returning');
  R.recordPassErrorsWith((_e, where) => void crashes.push(where));
  installEngineMode(R.salvageReturningEngine);
  const { useGame } = await import('../../state/store');
  await useGame.getState().boot();
  const S = () => (useGame.getState().game as unknown as { salvage: Yard }).salvage;
  const cash = () => (useGame.getState().game as unknown as { cash: number }).cash;
  /** Live play: `n` ticks of 0.1 s. */
  const play = (n: number) => {
    for (let k = 0; k < n; k++) {
      later(100);
      useGame.getState().tick(0.1);
    }
  };
  return { useGame, R, S, cash, play, salvageEngineMode };
}
beforeEach(() => {
  storage.clear();
  crashes.length = 0;
  clock += 30 * 86_400_000;
  vi.useFakeTimers({ now: clock, toFake: ['Date'] });
});
afterEach(async () => {
  vi.useRealTimers();
  (await import('../../engine/mode')).installEngineMode(null);
});

async function played() {
  const a = await start();
  const g = a.useGame.getState().game as unknown as GameState & { salvage: Yard };
  a.useGame.setState({ game: { ...g, salvage: { ...g.salvage, counts: { ...g.salvage.counts, 'cut:washer': 1 } } } as never });
  a.play(10);
  await a.useGame.getState().save();
  return a;
}

describe('owner2c attack', () => {
  it('the rules object carries no deferral of its own (no in-place patch left)', async () => {
    const a = await start();
    expect(Object.getOwnPropertySymbols(a.salvageEngineMode)).toEqual([]);
    const { salvageEngineMode: again } = await import('../../engine/salvageMode');
    expect(again.offline).toBe(a.salvageEngineMode.offline);
    // the rules' own offline pays at once (no hold) when called past the wrapper
    expect(a.R.pendingAbsence()).toBeNull();
  });

  it('pause while counting, resume 30 s later: the net and the card do not both pay; paid once for the whole', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    const left = a.S().clock.highMs;
    later(3 * H);
    a.useGame.getState().resume();
    expect(a.R.pendingAbsence()).not.toBeNull();
    await a.useGame.getState().pause();
    later(30_000);
    a.useGame.getState().resume();
    a.useGame.getState().resume();
    // first tick after: the net (since is 30 s old)
    a.play(1);
    await Promise.resolve();
    expect(a.R.pendingAbsence()).toBeNull();
    const cash1 = a.cash();
    const away = a.S().away!;
    expect(away).not.toBeNull();
    expect(Math.abs(away.absentS! - (Date.now() - left) / 1000)).toBeLessThan(2);
    // the counting card's own two frames arrive late
    expect(a.R.runPending()).toBe(false);
    a.play(5);
    expect(a.cash()).toBeGreaterThanOrEqual(cash1);
    expect(a.S().away!.absentS).toBe(away.absentS);
    expect(crashes).toEqual([]);
  });

  it('the net under the curtain (no screen) after a cold start: one pass, the card is waiting in the store', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    later(5 * H);
    const b = await start();
    expect(b.R.pendingAbsence()).not.toBeNull();
    b.play(81); // 8.1 s of ticks with no counting card
    await Promise.resolve();
    expect(b.R.pendingAbsence()).toBeNull();
    expect(b.S().away).not.toBeNull();
    expect(b.S().away!.absentS!).toBeGreaterThan(5 * 3600 - 5);
    expect(b.R.runPending()).toBe(false);
  });

  it('a short trip (40 s) waits for nothing', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    later(40_000);
    a.useGame.getState().resume();
    expect(a.R.pendingAbsence()).toBeNull();
    a.play(3);
    expect(a.R.pendingAbsence()).toBeNull();
  });
});
