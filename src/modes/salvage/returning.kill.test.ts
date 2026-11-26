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

/** A first start, a yard in which something was done (the away card needs one), a second of play, saved. */
async function played() {
  const a = await start();
  const g = a.useGame.getState().game as unknown as GameState & { salvage: Yard };
  a.useGame.setState({ game: { ...g, salvage: { ...g.salvage, counts: { ...g.salvage.counts, 'cut:washer': 1 } } } as never });
  a.play(10);
  await a.useGame.getState().save();
  return a;
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

describe('A1: the absence survives a kill (the real load path)', () => {
  it('the entry hands over a wrapper: the rules themselves are left as they are', async () => {
    const a = await start();
    expect(a.R.salvageReturningEngine).not.toBe(a.salvageEngineMode);
    expect(a.R.salvageReturningEngine.offline).not.toBe(a.salvageEngineMode.offline);
    expect(a.R.salvageReturningEngine.create).toBe(a.salvageEngineMode.create);
  });

  it('(attacker, sequence 1) back after 3 h, resume holds it and saves, killed; restart an hour later: all 4 h are owed', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    const left = a.S().clock.highMs;
    later(3 * H);
    a.useGame.getState().resume();
    expect(a.R.pendingAbsence()).not.toBeNull();
    later(5_000);
    await a.useGame.getState().save();
    // Killed. The next start an hour later.
    later(1 * H);
    const b = await start();
    const p = b.R.pendingAbsence();
    expect(p).not.toBeNull();
    expect(p!.from).toBe(left);
    // Nothing paid at boot; the yard's clock is the saved one until the pass.
    expect(b.S().away).toBeNull();
    expect(b.R.runPending()).toBe(true);
    const away = b.S().away!;
    expect(away.absentS).toBeGreaterThan(4 * 3600 + 5 - 2);
    expect(away.absentS).toBeLessThan(4 * 3600 + 5 + 2);
    expect(Math.abs(b.S().clock.highMs - Date.now())).toBeLessThan(1000);
  });

  it('(attacker, sequence 2) a night away, killed under the loading curtain after an autosave: the night is owed', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    const left = a.S().clock.highMs;
    later(8 * H);
    const b = await start();
    expect(b.R.pendingAbsence()?.from).toBe(left);
    // The curtain holds; the 5 s autosave stamps the save; swiped away.
    later(5_000);
    await b.useGame.getState().save();
    later(10 * MIN);
    const c = await start();
    expect(c.R.pendingAbsence()?.from).toBe(left);
    c.R.runPending();
    const away = c.S().away!;
    expect(away.absentS).toBeGreaterThan(8 * 3600 + 600 + 5 - 2);
    expect(away.absentS).toBeLessThan(8 * 3600 + 600 + 5 + 2);
  });

  it('(the attacker case as written) reconcileState + clampClock on the disk copy, then absenceOf: counted from the yard clock', async () => {
    const a = await played();
    const E = await import('../../engine/economy');
    await a.useGame.getState().pause();
    const highBefore = a.S().clock.highMs;
    later(3 * H);
    a.useGame.getState().resume();
    later(5_000);
    await a.useGame.getState().save();
    const raw = JSON.parse([...storage.values()].pop()!);
    a.R.resetPendingForTests();
    later(1 * H);
    const cfg = a.useGame.getState().cfg;
    let g = E.reconcileState(cfg, raw, Date.now());
    g = E.clampClock(cfg, g, Date.now());
    expect((g as unknown as { salvage: Yard }).salvage.clock.highMs).toBe(highBefore);
    const p = a.R.absenceOf(cfg as never, g as never, Date.now());
    expect(p?.from).toBe(highBefore);
  });

  it('no double pay: after a pass that ran, a kill and a restart pay only the time since', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    later(3 * H);
    a.useGame.getState().resume();
    a.R.runPending();
    const first = a.S().away!;
    expect(first.absentS).toBeGreaterThan(3 * 3600 - 2);
    // The player reads the card and presses OK (an unread card would take the next absence into itself).
    (await import('./actions')).salvageActions.ackAway();
    expect(a.S().away).toBeNull();
    a.play(20);
    await a.useGame.getState().save();
    later(10 * MIN);
    const b = await start();
    expect(b.R.pendingAbsence()).not.toBeNull();
    b.R.runPending();
    const away = b.S().away!;
    // Ten minutes (and the moments of play), never the three hours again.
    expect(away.absentS).toBeGreaterThan(600 - 2);
    expect(away.absentS).toBeLessThan(600 + 5);
  });

  it('a pass, then a stretch with saves and no ticks (the page hidden, the phone upright), then a kill: the restart pays that stretch and the absence once', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    later(3 * H);
    a.useGame.getState().resume();
    a.R.runPending();
    (await import('./actions')).salvageActions.ackAway();
    a.play(20);
    const ran = a.S().clock.highMs;
    // Twenty minutes in which the app is up but nothing ticks; the autosave goes on stamping the save.
    for (let k = 0; k < 4; k++) {
      later(5 * MIN);
      await a.useGame.getState().save();
    }
    later(1 * H);
    const b = await start();
    expect(b.R.pendingAbsence()?.from).toBe(ran);
    b.R.runPending();
    const away = b.S().away!;
    expect(away.absentS).toBeGreaterThan(80 * 60 - 2);
    expect(away.absentS).toBeLessThan(80 * 60 + 2);
  });

  it('a device clock set back while it waits pays nothing; set right again, the absence is paid, not lost', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    const left = a.S().clock.highMs;
    later(3 * H);
    a.useGame.getState().resume();
    expect(a.R.pendingAbsence()?.from).toBe(left);
    const cash0 = a.cash();
    // Set back to two hours before he left.
    vi.setSystemTime(left - 2 * H);
    a.R.runPending();
    expect(a.cash()).toBe(cash0);
    expect(a.S().away?.seconds ?? 0).toBe(0);
    // Saved and killed while set back, then started with the clock set right (3 h and a minute after leaving).
    await a.useGame.getState().save();
    vi.setSystemTime(left + 3 * H + MIN);
    const b = await start();
    if (b.R.pendingAbsence()) b.R.runPending();
    else b.play(1);
    if (b.R.pendingAbsence()) b.R.runPending();
    const away = b.S().away!;
    expect(away).not.toBeNull();
    expect(away.absentS).toBeGreaterThan(3 * 3600 + 60 - 5);
    expect(away.absentS).toBeLessThan(3 * 3600 + 60 + 5);
  });
});

describe('A2: an action while it waits is a refusal', () => {
  it('buy and hire while the absence waits: `nothing`, and the state does not move', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    later(3 * H);
    a.useGame.getState().resume();
    expect(a.R.heldForCount()).toBe(true);
    const { salvageActions } = await import('./actions');
    const before = a.useGame.getState().game;
    expect(salvageActions.buy('truck' as never, 1)).toEqual({ key: 'nothing', args: {}, retry: null });
    expect(salvageActions.skipGoal('x')).toEqual({ key: 'nothing', args: {}, retry: null });
    expect(a.useGame.getState().game).toBe(before);
  });
});

describe('A3: a pass that throws does not freeze the yard; nothing waits for ever', () => {
  it('a throwing engine: recorded, no pending absence, the yard clock at now, and the next ticks run the yard', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    later(3 * H);
    a.useGame.getState().resume();
    const throwing: EngineMode = {
      ...a.salvageEngineMode,
      offline: () => {
        throw new Error('boom');
      },
    };
    expect(a.R.runPending(Date.now(), throwing)).toBe(true);
    expect(crashes).toEqual(['salvage.awayPass']);
    expect(a.R.pendingAbsence()).toBeNull();
    expect(a.S().clock.highMs).toBe(Date.now());
    const t = a.S().t;
    a.play(5);
    expect(a.R.pendingAbsence()).toBeNull();
    expect(a.S().t).toBeGreaterThan(t);
  });

  it('the safety net: a tick 8 s after it began waiting makes the one pass itself (not before)', async () => {
    const a = await played();
    await a.useGame.getState().pause();
    later(3 * H);
    a.useGame.getState().resume();
    expect(a.R.pendingAbsence()).not.toBeNull();
    later(7_000);
    a.useGame.getState().tick(0.1);
    expect(a.R.pendingAbsence()).not.toBeNull();
    expect(a.S().away).toBeNull();
    later(1_100);
    a.useGame.getState().tick(0.1);
    expect(a.R.pendingAbsence()).toBeNull();
    const away = a.S().away!;
    expect(away.absentS).toBeGreaterThan(3 * 3600 + 8 - 2);
    // Exactly once: the screen's late call finds nothing waiting.
    expect(a.R.runPending()).toBe(false);
    expect(a.S().away!.absentS).toBe(away.absentS);
  });
});
