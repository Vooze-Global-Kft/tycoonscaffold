/**
 * The drop of spec 2.5 (src/engine/merge/drop.ts), spec 10.2 `drop.test.ts`: every row of the drop
 * table (without the Pocket, M5) by the hit test's code, as a drag and a tap-tap both hand it over
 * (the tap-tap through the store and the armed cell: src/modes/merge/wiring.test.ts runs the same
 * rows); the Lucky roll and Lucky Sparks; the Ladder Book stamp of a first-ever (c, k), a tier
 * skipped by Lucky included; best_c; the paid ticket (price computed then, the till rolled in, the
 * hooks in order); the Basket sale with its 4 s undo chip and reserved cell, and undoBasket's
 * refusals.
 */
import { describe, expect, it } from 'vitest';
import { dropRows, fixtureProblems, mergeState, mergeTestConfig } from '../fixtures/merge';
import * as R from '../merge';

const cfg = mergeTestConfig();
const c = R.cellAt;

describe('every row of the drop table (2.5)', () => {
  for (const row of dropRows(cfg)) {
    it(row.name, () => {
      expect(fixtureProblems(cfg, row.game)).toEqual([]);
      const ev: R.MergeEvent[] = [];
      const out = R.dropAt(cfg, row.game, row.from, R.decodeTarget(row.code), ev);
      expect(out.result.kind).toBe(row.kind);
      if (row.reason) expect(out.result).toEqual({ kind: 'return', reason: row.reason });
      // A refused drop and a shake change nothing: the same object (the screens play ui_denied / shake).
      if (row.kind === 'return' || row.kind === 'ticketShake') {
        expect(out.game).toBe(row.game);
      } else {
        expect(out.game).not.toBe(row.game);
        expect(out.game.merge.freedAt).toBe(row.game.stats.playSeconds);
        expect(out.game.merge.changedAt).toBe(row.game.stats.playSeconds);
        expect(fixtureProblems(cfg, out.game)).toEqual([]);
      }
    });
  }
});

describe('merge (2.5 row 1)', () => {
  const pairAt = (k: number, extra: Parameters<typeof mergeState>[1] = {}) =>
    mergeState(cfg, { clock: 50, chains: [{ c: 0, gear: 1, best: Math.min(8, k + 1) }], goods: [[c(2, 0), 0, k], [c(2, 1), 0, k]], ...extra });
  /** The first lifetime merge count n at which the Lucky stream says lucky for (c, k). */
  const luckyN = (g: R.MergeGame, good: R.Good, lucky: boolean) => {
    for (let n = 0; n < 10_000; n++) if (R.streamValue(g.merge, 'lucky', n, good.c * 8 + good.k) < 1 / cfg.merge.merges.luckyOdds === lucky) return n;
    throw new Error('no such n');
  };

  it('makes tier k + 1 in the target cell, frees the source, counts the merge, stamps a first-ever good and raises best', () => {
    const g0 = pairAt(2, { chains: [{ c: 0, gear: 1, best: 2 }] });
    const n = luckyN(g0, { c: 0, k: 2 }, false);
    const g = { ...g0, merge: { ...g0.merge, feats: { ...g0.merge.feats, merges: n } } };
    const ev: R.MergeEvent[] = [];
    const out = R.dropAt(cfg, g, c(2, 0), { kind: 'cell', cell: c(2, 1) }, ev);
    expect(out.result).toEqual({ kind: 'merge', cell: c(2, 1), made: { c: 0, k: 3 }, lucky: false, spark: false, discovered: [{ c: 0, k: 3 }] });
    expect(out.game.merge.board[c(2, 0)]).toBeNull();
    expect(out.game.merge.board[c(2, 1)]).toEqual({ c: 0, k: 3 });
    expect(out.game.merge.feats.merges).toBe(n + 1);
    expect(out.game.merge.book[0][2]).toBe(true);
    expect(out.game.merge.chains[0].best).toBe(3);
    expect(out.game.cash).toBe(g.cash); // a merge or a discovery pays nothing (2.3)
    expect(ev.map((e) => e.type)).toEqual(['merge', 'discovery']);
  });

  it('Lucky (1 in 25 by the Lucky stream at n = lifetime merges, x = c × 8 + k) goes two tiers up and stamps the skipped tier too', () => {
    const g0 = pairAt(2, { chains: [{ c: 0, gear: 1, best: 3 }] });
    const n = luckyN(g0, { c: 0, k: 2 }, true);
    const g = { ...g0, merge: { ...g0.merge, feats: { ...g0.merge.feats, merges: n } } };
    const out = R.dropAt(cfg, g, c(2, 0), { kind: 'cell', cell: c(2, 1) });
    expect(out.result).toMatchObject({ kind: 'merge', made: { c: 0, k: 4 }, lucky: true, spark: false });
    expect(out.result.kind === 'merge' && out.result.discovered).toEqual([{ c: 0, k: 4 }]);
    expect(out.game.merge.book[0].slice(0, 4)).toEqual([true, true, true, true]);
    expect(out.game.merge.chains[0].best).toBe(4);
    expect(out.game.merge.mstats.luckies).toBe(1);
    // A Lucky that skips a tier never made before stamps both.
    const fresh = { ...g, merge: { ...g.merge, book: g.merge.book.map((row, ch) => (ch === 0 ? row.map((_, i) => i < 2) : row)), chains: g.merge.chains.map((x, ch) => (ch === 0 ? { ...x, best: 2 } : x)) } };
    const skip = R.dropAt(cfg, fresh, c(2, 0), { kind: 'cell', cell: c(2, 1) });
    expect(skip.result.kind === 'merge' && skip.result.discovered).toEqual([{ c: 0, k: 3 }, { c: 0, k: 4 }]);
    expect(skip.game.merge.book[0][2]).toBe(true);
  });

  it('a held Lucky Spark is spent first and adds a tier (Lucky can add one more), capped at tier 8', () => {
    const g0 = pairAt(5, { luckySparks: 2 });
    const n = luckyN(g0, { c: 0, k: 5 }, false);
    const g = { ...g0, merge: { ...g0.merge, feats: { ...g0.merge.feats, merges: n } } };
    const out = R.dropAt(cfg, g, c(2, 0), { kind: 'cell', cell: c(2, 1) });
    expect(out.result).toMatchObject({ kind: 'merge', made: { c: 0, k: 7 }, lucky: false, spark: true });
    expect(out.game.merge.luckySparks).toBe(1);
    const g7 = pairAt(7, { luckySparks: 1 });
    const top = R.dropAt(cfg, g7, c(2, 0), { kind: 'cell', cell: c(2, 1) });
    expect(top.result).toMatchObject({ kind: 'merge', made: { c: 0, k: 8 }, spark: true });
    expect(top.game.merge.feats.tier8sThisSeason).toBe(1);
  });

  it('observed Lucky rate is the printed 1 in 25 within ±0.5 points over 100k merges (gate 13)', () => {
    const m = pairAt(1).merge;
    let lucky = 0;
    for (let n = 0; n < 100_000; n++) if (R.streamValue(m, 'lucky', n, (n % 6) * 8 + 1 + (n % 7)) < 1 / 25) lucky++;
    expect(Math.abs(lucky / 100_000 - 0.04)).toBeLessThan(0.005);
  });
});

describe('a ticket line and the paid ticket (2.5, 2.7 "Paying")', () => {
  const ticketState = () =>
    mergeState(cfg, {
      clock: 300,
      cash: 10,
      till: 42,
      chains: [{ c: 0, gear: 3, best: 5, stall: 4 }, { c: 1, gear: 1, best: 4 }],
      goods: [[c(2, 0), 0, 2], [c(2, 1), 0, 2], [c(2, 2), 1, 3]],
      counters: [[[0, 2], [0, 2], [1, 3]], [[1, 4]]],
    });

  it('fills the FIRST unfilled line of exactly (c, k); only `filled` changes; nothing is paid before the last line', () => {
    const g = ticketState();
    const out = R.dropAt(cfg, g, c(2, 0), { kind: 'counter', counter: 0 });
    expect(out.result).toEqual({ kind: 'lineFill', counter: 0, line: 0, paid: null });
    const t = out.game.merge.counters[0].ticket!;
    expect(t.lines.map((l) => [l.c, l.k, l.filled])).toEqual([[0, 2, true], [0, 2, false], [1, 3, false]]);
    expect(t.id).toBe(g.merge.counters[0].ticket!.id);
    expect(out.game.cash).toBe(g.cash);
    expect(out.game.merge.board[c(2, 0)]).toBeNull();
  });

  it('the last line pays the price shown just before it (computed then), rolls the till in, books recent, empties the counter', () => {
    let g = ticketState();
    g = R.dropAt(cfg, g, c(2, 0), { kind: 'counter', counter: 0 }).game;
    g = R.dropAt(cfg, g, c(2, 1), { kind: 'counter', counter: 0 }).game;
    const shown = R.ticketPrice(cfg, g, g.merge.counters[0].ticket!);
    expect(shown).toBe(R.roundCoins(cfg, (R.value(cfg, g, 0, 2) * 2 + R.value(cfg, g, 1, 3)) * (1 + 0.15 * 2)));
    const ev: R.MergeEvent[] = [];
    const out = R.dropAt(cfg, g, c(2, 2), { kind: 'counter', counter: 0 }, ev);
    expect(out.result).toEqual({ kind: 'lineFill', counter: 0, line: 2, paid: shown });
    expect(out.game.cash).toBe(g.cash + shown + 42);
    expect(out.game.merge.till).toBe(0);
    expect(out.game.merge.mstats.coins.ticket).toBe(shown);
    expect(out.game.merge.mstats.coins.till).toBe(42);
    expect(out.game.merge.counters[0]).toMatchObject({ ticket: null, refillAt: 300 + cfg.merge.tickets.refillDelay, blockedAt: null });
    expect(out.game.merge.mstats.ticketsThisSeason).toBe(g.merge.mstats.ticketsThisSeason + 1);
    expect(R.recentCoins(out.game.merge, 300)).toBeCloseTo(shown, 9);
    // Split over its lines' chains by value.
    const v0 = R.value(cfg, g, 0, 2) * 2;
    const v1 = R.value(cfg, g, 1, 3);
    expect(R.recentCoins(out.game.merge, 300, 1)).toBeCloseTo((shown * v1) / (v0 + v1), 9);
    expect(ev.map((e) => e.type).slice(0, 3)).toEqual(['lineFill', 'tillRoll', 'ticketPaid']);
    expect(ev.find((e) => e.type === 'ticketPaid')).toMatchObject({ counter: 0, coins: shown });
  });
});

describe('the Basket and its undo (2.5)', () => {
  const g0 = mergeState(cfg, { clock: 100, cash: 0, chains: [{ c: 0, gear: 1, best: 4 }, { c: 1, gear: 1, best: 3 }], goods: [[c(2, 0), 0, 4], [c(2, 1), 1, 3]], counters: [[[0, 3]], null] });

  it('sells for 25 % of value (rounded once, M19) and reserves the source cell for 4 s', () => {
    const out = R.dropAt(cfg, g0, c(2, 0), { kind: 'basket' });
    const coins = R.roundCoins(cfg, 0.25 * R.value(cfg, g0, 0, 4));
    expect(out.result).toEqual({ kind: 'basket', coins });
    expect(out.game.cash).toBe(coins);
    expect(out.game.merge.mstats.coins.basket).toBe(coins);
    expect(out.game.merge.basketUndo).toEqual({ cell: c(2, 0), good: { c: 0, k: 4 }, refund: coins, until: 104 });
    expect(R.freeCells(out.game.merge)).not.toContain(c(2, 0));
    expect(R.mergeParams(cfg, out.game).F).toBe(R.mergeParams(cfg, g0).F);
    // A drop on the reserved cell returns.
    expect(R.dropAt(cfg, out.game, c(2, 1), { kind: 'cell', cell: c(2, 0) }).result).toEqual({ kind: 'return', reason: 'reserved' });
  });

  it('undoBasket returns the good to its cell and takes the refund back', () => {
    const sold = R.dropAt(cfg, g0, c(2, 0), { kind: 'basket' }).game;
    const ev: R.MergeEvent[] = [];
    const back = R.undoBasket(cfg, sold, ev);
    expect(back.merge.board[c(2, 0)]).toEqual({ c: 0, k: 4 });
    expect(back.cash).toBe(0);
    expect(back.merge.basketUndo).toBeNull();
    expect(back.merge.mstats.coins.undo).toBe(-sold.merge.basketUndo!.refund);
    expect(ev).toEqual([{ type: 'undo', cell: c(2, 0) }]);
  });

  it('undo is refused after any purchase (the chip disappears), when cash < refund, and after the chip expired', () => {
    const rich = { ...g0, cash: 500 };
    const sold = R.dropAt(cfg, rich, c(2, 0), { kind: 'basket' }).game;
    const bought = R.levelGear(cfg, sold, 0);
    expect(bought).not.toBe(sold);
    expect(bought.merge.basketUndo).toBeNull();
    expect(R.undoBasket(cfg, bought)).toBe(bought);
    // cash < refund
    const poor = { ...sold, cash: sold.merge.basketUndo!.refund - 1 };
    expect(R.undoBasket(cfg, poor)).toBe(poor);
    // expired: the tick frees the reserved cell at 104; the sale stands
    const ev: R.MergeEvent[] = [];
    const later = R.advanceMerge(cfg, sold, 4, 0, ev);
    expect(ev).toContainEqual({ type: 'undoExpired', cell: c(2, 0) });
    expect(later.merge.basketUndo).toBeNull();
    expect(later.cash).toBeGreaterThanOrEqual(sold.cash);
    expect(R.undoBasket(cfg, later)).toBe(later);
  });

  it('a second sale while a chip is out replaces the chip; the first sale stands', () => {
    const one = R.dropAt(cfg, g0, c(2, 0), { kind: 'basket' }).game;
    const two = R.dropAt(cfg, one, c(2, 1), { kind: 'basket' }).game;
    expect(two.merge.basketUndo?.cell).toBe(c(2, 1));
    expect(R.freeCells(two.merge)).toContain(c(2, 0));
    expect(two.merge.mstats.basketSales).toBe(2);
  });
});

describe('targetsFor: what glows while a good is armed or dragged (4.2)', () => {
  it('lists the identical goods below tier 8, the counters with a matching line and the Festival when it matches', () => {
    const [row] = dropRows(cfg);
    const g = row.game;
    expect(R.targetsFor(cfg, g, c(2, 0))).toEqual([c(2, 1)]);
    expect(R.targetsFor(cfg, g, c(2, 2))).toEqual([R.TARGET_COUNTER]);
    // A tier 8 has no merge, but the Festival of season 1 asks for a Dragon Grill Board.
    const wants8 = g.merge.festival.lines.some((l) => l.c === 0 && l.k === 8);
    expect(R.targetsFor(cfg, g, c(3, 0))).toEqual(wants8 ? [R.TARGET_FESTIVAL] : []);
    expect(R.targetsFor(cfg, g, c(4, 0))).toEqual([]); // an empty cell
  });
});
