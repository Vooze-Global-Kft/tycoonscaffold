/**
 * The tick of spec 2.4 (src/engine/merge/tick.ts, events.ts), spec 10.2 `tick.split.test.ts`:
 * tick(a + b) = tick(a) then tick(b) EXACTLY (the whole state and the event list, compared as
 * JSON) over 10^3 random splits of states that run every event kind of 2.4, with player actions
 * at shared split points; the waiting gear's restart; the eligible-time rule of blocked releases,
 * gift goods and empty counters; the highest open chain releasing first (M22); MAX_TICK.
 *
 * Splits are whole multiples of 1/64 s on whole-second clocks, so the clock after a split lands
 * on exactly the same number as after one tick (floating-point addition of such numbers is exact);
 * event times themselves are whatever the rules make them.
 */
import { describe, expect, it } from 'vitest';
import { mergeFixtures, mergeState, mergeTestConfig } from '../fixtures/merge';
import * as R from '../merge';

const cfg = mergeTestConfig();

/** A small deterministic PRNG for the test's own choices (never the rules' streams). */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tick = (g: R.MergeGame, dt: number, ev?: R.MergeEvent[]) => R.advanceMerge(cfg, g, dt, 0, ev);
const open30 = () => [2, 3, 4, 5, 6].flatMap((r) => [0, 1, 2, 3, 4, 5].map((c) => R.cellAt(r, c)));

/** A crowded mid-game state: minders, a full waiting shelf, a blocked shelf, a releasing shelf, pending gift goods, an undo chip, an empty counter, the till. */
function crowded(): R.MergeGame {
  const cells = open30();
  const goods: [number, number, number][] = [];
  const mix = [
    [0, 3], [0, 4], [1, 3], [1, 2], [2, 2], [2, 4], [3, 1], [0, 5], [1, 4], [2, 3],
    [3, 2], [0, 2], [1, 5], [2, 1], [3, 3], [0, 6], [1, 1], [2, 5], [3, 2], [0, 3],
    [1, 3], [2, 2], [3, 1], [0, 4], [1, 2],
  ];
  mix.forEach(([c, k], i) => goods.push([cells[i], c, k]));
  const g = mergeState(cfg, {
    clock: 1000,
    cash: 500,
    chains: [
      { c: 0, gear: 8, stall: 3, minder: 2, best: 6, shelf: [1, 2, 1, 1, 2, 1], waiting: true },
      { c: 1, gear: 5, stall: 2, minder: 1, best: 5 },
      { c: 2, gear: 4, stall: 1, minder: 0, best: 5, shelf: [1, 1] },
      { c: 3, gear: 2, stall: 1, minder: 0, best: 3, shelf: [1] },
    ],
    goods,
    counters: [[[1, 4]], null, [[2, 4], [0, 5, true]]],
    lanterns: [1],
    pendingGoods: [{ c: 1, k: 4 }, { c: 2, k: 5 }],
    till: 30,
    feats: { merges: 300, tickets: 40 },
  });
  const m = g.merge;
  // Chain 2's shelf found no room a second ago; chain 3 releases soon; the reserved cell of an undo chip expires at 1002.5.
  const chains = m.chains.map((ch, c) => (c === 2 ? { ...ch, releaseAt: null, blockedAt: 999 } : c === 3 ? { ...ch, releaseAt: 1000.25 } : ch));
  return { ...g, merge: { ...m, chains, basketUndo: { cell: cells[29], good: { c: 0, k: 2 }, refund: 3, until: 1002.5 }, gift: { ...m.gift, nextAt: 1000.125 } } };
}

/** A full board, a counter in "Setting up…" from before the Parade falls due at season clock 1010: the Parade event wakes it. */
function paradeWake(): R.MergeGame {
  const cells = open30();
  const goods: [number, number, number][] = cells.map((cell, i) => [cell, i % 2, 1 + (i % 4)]);
  const g = mergeState(cfg, {
    clock: 1000,
    chains: [
      { c: 0, gear: 6, best: 5, minder: 1 },
      { c: 1, gear: 3, best: 5 },
    ],
    goods,
    counters: [[[0, 5]], null],
  });
  const m = g.merge;
  return { ...g, merge: { ...m, paradeAt: 1010, changedAt: 990, freedAt: 990, counters: m.counters.map((ct, j) => (j === 1 ? { ...ct, refillAt: null, blockedAt: 995 } : ct)) } };
}

/** Three blocked shelves and one cell an undo chip frees at 1001 (M22: the highest open chain releases first). */
function m22(): R.MergeGame {
  const cells = open30();
  const goods: [number, number, number][] = cells.slice(0, 29).map((cell, i) => [cell, i % 3, 3 + (i % 2)]);
  const g = mergeState(cfg, {
    clock: 1000,
    chains: [
      { c: 0, gear: 1, best: 5, shelf: [1] },
      { c: 1, gear: 1, best: 5, shelf: [1] },
      { c: 2, gear: 1, best: 5, shelf: [1] },
    ],
    goods,
    counters: [[[0, 5]], [[1, 5]]],
  });
  const m = g.merge;
  const chains = m.chains.map((ch, c) => (c <= 2 ? { ...ch, releaseAt: null, blockedAt: 998 - c, nextPopAt: 1003 + c } : ch));
  return { ...g, merge: { ...m, chains, freedAt: 990, basketUndo: { cell: cells[29], good: { c: 0, k: 4 }, refund: 5, until: 1001 } } };
}

const scenarios: Record<string, () => R.MergeGame> = {
  fresh: () => mergeFixtures(cfg).fresh,
  minute10: () => mergeFixtures(cfg).minute10,
  festivalNear: () => mergeFixtures(cfg).festivalNear,
  crowded,
  paradeWake,
  m22,
};

/** A player action both runs make at the same clock: the first merge on the board, else a Basket sale of the lowest good. */
function act(g: R.MergeGame, ev: R.MergeEvent[]): R.MergeGame {
  for (let from = 0; from < R.BOARD_CELLS; from++) {
    const t = R.targetsFor(cfg, g, from).find((code) => code < R.BOARD_CELLS);
    if (t !== undefined) return R.dropAt(cfg, g, from, R.decodeTarget(t), ev).game;
  }
  const from = g.merge.board.findIndex((c) => R.isGood(c));
  return from >= 0 ? R.dropAt(cfg, g, from, { kind: 'basket' }, ev).game : g;
}

/** Event kinds a stretch of play runs, by stepping the same queue one event at a time. */
function kindsRun(g0: R.MergeGame, seconds: number): Set<R.EventKind> {
  const seen = new Set<R.EventKind>();
  let g = g0;
  const end = g.stats.playSeconds + seconds;
  for (let i = 0; i < 100_000; i++) {
    const e = R.nextEvent(cfg, g, end);
    if (!e) break;
    seen.add(e.kind);
    g = R.runEvent(cfg, { ...g, stats: { ...g.stats, playSeconds: e.at } }, e);
  }
  return seen;
}

describe('tick(a + b) = tick(a) then tick(b), exactly (2.4)', () => {
  it('the scenarios together run every event kind of 2.4', () => {
    const seen = new Set<R.EventKind>();
    for (const make of Object.values(scenarios)) for (const k of kindsRun(make(), 400)) seen.add(k);
    expect([...seen].sort()).toEqual([...R.EVENT_KINDS].sort());
  });

  it('holds over 10^3 random splits of every scenario, with player actions at shared split points', () => {
    const rnd = prng(20261123);
    const names = Object.keys(scenarios);
    const kindsSeen = new Set<string>();
    for (let iter = 0; iter < 1000; iter++) {
      const g0 = scenarios[names[iter % names.length]]();
      // Total length: mostly short (many events per second), sometimes up to ten minutes.
      const units = 1 + Math.floor(rnd() * (rnd() < 0.85 ? 64 * 40 : 64 * 600));
      const pieces = 1 + Math.floor(rnd() * 9);
      const cuts = new Set<number>();
      while (cuts.size < Math.min(pieces - 1, units - 1)) cuts.add(1 + Math.floor(rnd() * (units - 1)));
      const sorted = [...cuts].sort((a, b) => a - b);
      // An action point shared by both runs (or none).
      const actAt = rnd() < 0.5 && sorted.length ? sorted[Math.floor(rnd() * sorted.length)] : -1;

      // Run A: one tick to the action point, the action, one tick to the end.
      const evA: R.MergeEvent[] = [];
      let a = g0;
      if (actAt > 0) {
        a = tick(a, actAt / 64, evA);
        a = act(a, evA);
        a = tick(a, (units - actAt) / 64, evA);
      } else a = tick(a, units / 64, evA);

      // Run B: a tick per piece, the same action at the same point.
      const evB: R.MergeEvent[] = [];
      let b = g0;
      let at = 0;
      for (const cut of [...sorted, units]) {
        b = tick(b, (cut - at) / 64, evB);
        at = cut;
        if (cut === actAt) b = act(b, evB);
      }
      expect(b.stats.playSeconds).toBe(a.stats.playSeconds);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
      expect(JSON.stringify(evB)).toBe(JSON.stringify(evA));
      for (const e of evA) kindsSeen.add(e.type);
    }
    // The event list of the splits covered drops, shelving, waiting, releases, gift goods, sales, till rolls, draws, the undo expiry.
    for (const t of ['drop', 'shelved', 'gearWaiting', 'released', 'giftGoodPlaced', 'sale', 'tillRoll', 'ticketDrawn', 'undoExpired']) expect(kindsSeen, t).toContain(t);
  }, 120_000);
});

describe('the events of 2.4', () => {
  it('a waiting gear restarts at the release that frees its shelf: nextPopAt = that time + T', () => {
    const g = crowded();
    expect(g.merge.chains[0].waiting).toBe(true);
    // Free room for the Grill: take every loose Grill good off the board (the drop's loose cap), keep two cells free.
    const board = g.merge.board.map((c) => (R.isGood(c) && c.c === 0 && c.k <= 3 ? null : c));
    const s = { ...g, merge: { ...g.merge, board, basketUndo: null, chains: g.merge.chains.map((ch, c) => (c === 0 ? { ...ch, releaseAt: 1000.5, blockedAt: null } : ch)) } };
    const ev: R.MergeEvent[] = [];
    const after = tick(s, 0.5, ev);
    expect(ev.find((e) => e.type === 'released' && e.c === 0)).toMatchObject({ type: 'released', c: 0, k: 1 });
    expect(after.merge.chains[0]).toMatchObject({ waiting: false, nextPopAt: 1000.5 + cfg.merge.gear.interval, releaseAt: 1001 });
    expect(after.merge.chains[0].shelf).toHaveLength(5);
  });

  it('a full shelf makes the gear wait: no next drop, and the drop stream does not move', () => {
    const g = mergeState(cfg, { clock: 100, chains: [{ c: 0, gear: 1, shelf: [1, 1, 1, 1, 1, 1] }], goods: open30().map((cell) => [cell, 0, 3] as [number, number, number]) });
    const blocked = { ...g, merge: { ...g.merge, chains: g.merge.chains.map((ch, c) => (c === 0 ? { ...ch, releaseAt: null, blockedAt: 99 } : ch)) } };
    const ev: R.MergeEvent[] = [];
    const after = tick(blocked, 60, ev);
    expect(ev.filter((e) => e.type === 'gearWaiting')).toHaveLength(1);
    expect(after.merge.chains[0].waiting).toBe(true);
    expect(after.merge.draws.drop[0]).toBe(blocked.merge.draws.drop[0]);
    expect(R.nextEvent(cfg, after, Infinity)?.kind).not.toBe('drop');
  });

  it('a blocked release waits for the first freedAt after its block, and the highest open chain goes first (M22)', () => {
    const g = m22();
    const ev: R.MergeEvent[] = [];
    const after = tick(g, 1, ev);
    const released = ev.filter((e) => e.type === 'released');
    expect(released).toEqual([{ type: 'released', c: 2, k: 1, cell: g.merge.basketUndo!.cell }]);
    expect(after.merge.chains[0].blockedAt).toBe(1001);
    expect(after.merge.chains[1].blockedAt).toBe(1001);
    // Nothing more is due for them until another cell is freed.
    const later = tick(after, 1, []);
    expect(later.merge.chains[0].shelf).toHaveLength(1);
    expect(later.merge.chains[1].shelf).toHaveLength(1);
  });

  it('an empty counter that found no ticket redraws at the first changedAt after it; the Parade wakes one that sat from before it fell due', () => {
    const g = paradeWake();
    expect(R.nextEvent(cfg, g, Infinity)).not.toMatchObject({ kind: 'refill' });
    const due = R.dueEvents(cfg, g).find((e) => e.kind === 'parade');
    expect(due).toEqual({ at: 1010, kind: 'parade', index: 1 });
    const after = tick(g, 10);
    expect(after.merge.counters[1].blockedAt === null || after.merge.counters[1].blockedAt! >= 1010).toBe(true);
    // A board change (a player move) makes the blocked counter's redraw due at once.
    const blocked = { ...g, merge: { ...g.merge, paradeAt: 99_999 } };
    const moved = R.dropAt(cfg, { ...blocked, merge: { ...blocked.merge, board: blocked.merge.board.map((c, i) => (i === 0 ? null : c)) } }, R.cellAt(2, 0), { kind: 'cell', cell: 0 });
    expect(moved.result.kind).toBe('move');
    expect(R.nextEvent(cfg, moved.game, Infinity)).toMatchObject({ kind: 'refill', index: 1, at: 1000 });
  });

  it('the till rolls at each whole minute of the season clock; a sale goes to the till first', () => {
    const g = mergeState(cfg, { clock: 30, chains: [{ c: 0, gear: 1, minder: 1 }], goods: [] });
    const ev: R.MergeEvent[] = [];
    const after = tick(g, 31, ev);
    const sale = R.saleAmount(cfg, g, 0);
    expect(sale).toBe(R.roundCoins(cfg, R.value(cfg, g, 0, 2)));
    // Sales at 37 and 52 (nextSaleAt = 37, Q = 15) go to the till; the till joins the purse at 60.
    expect(ev.filter((e) => e.type === 'sale')).toHaveLength(2);
    expect(ev.filter((e) => e.type === 'tillRoll')).toEqual([{ type: 'tillRoll', coins: 2 * sale }]);
    expect(after.cash).toBe(2 * sale);
    expect(after.merge.till).toBe(0);
    expect(after.merge.tillAt).toBe(120);
    expect(after.merge.mstats.coins.till).toBe(2 * sale);
  });

  it('MAX_TICK cuts a tick to 3,600 s; dt ≤ 0 or not a number changes nothing', () => {
    const g = mergeFixtures(cfg).minute10;
    const long = tick(g, 1e7);
    expect(long.stats.playSeconds).toBe(g.stats.playSeconds + R.MAX_TICK);
    expect(JSON.stringify(long)).toBe(JSON.stringify(tick(g, R.MAX_TICK)));
    expect(tick(g, 0)).toBe(g);
    expect(tick(g, -5)).toBe(g);
    expect(tick(g, Number.NaN)).toBe(g);
  });
});
