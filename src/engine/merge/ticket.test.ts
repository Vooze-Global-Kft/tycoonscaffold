/**
 * Tickets as MECHANICS keeps them (spec 2.5, 2.7, 5.7 with Decisions M14, M19, M26), spec 10.2
 * `ticket.test.ts`: a ticket's lines never change after the draw (only `filled`); the shown price is
 * the paid price, rises with a stall level and never falls; the Parade's timing (due at season
 * clock 360 s, no second while one is out, the clock restarted when it is sent off); the
 * "Fill one line" ad never fills the last line; "Call the dragon".
 *
 * Every rule is the real one (the Parade's draw included): no stand-in.
 */
import { describe, expect, it } from 'vitest';
import { fixtureProblems, mergeFixtures, mergeState, mergeTestConfig, playOnce, testPrng } from '../fixtures/merge';
import * as R from '../merge';

const cfg = mergeTestConfig();

describe('lines and prices over a long random run', () => {
  it('lines never change after the draw (only filled, false to true); the shown price never falls; the paid price is the price shown just before', () => {
    const rnd = testPrng(4242);
    let g = mergeFixtures(cfg).fresh;
    const seen = new Map<number, { lines: string; filled: boolean[]; price: number }>();
    let paidTickets = 0;
    let rises = 0;
    for (let step = 0; step < 6000; step++) {
      const ev: R.MergeEvent[] = [];
      const before = g;
      g = rnd() < 0.5 ? R.advanceMerge(cfg, g, 0.5 + rnd() * 2, 0, ev) : playOnce(cfg, g, rnd(), ev);
      if (step % 250 === 0) expect(fixtureProblems(cfg, g, { afterPlay: true }), `step ${step}`).toEqual([]);
      for (const e of ev) {
        if (e.type !== 'ticketPaid') continue;
        paidTickets++;
        const last = seen.get(e.ticket.id);
        // Shown = paid: the price of the ticket in the state just before the paying drop.
        const ct = before.merge.counters.find((x) => x.ticket?.id === e.ticket.id);
        expect(ct, `ticket ${e.ticket.id} was on a counter`).toBeDefined();
        expect(e.coins).toBe(R.ticketPrice(cfg, before, ct!.ticket!));
        if (last) expect(e.coins).toBeGreaterThanOrEqual(last.price);
      }
      for (const ct of g.merge.counters) {
        const t = ct.ticket;
        if (!t) continue;
        const lines = JSON.stringify(t.lines.map((l) => [l.c, l.k, !!l.stretch]));
        const price = R.ticketPrice(cfg, g, t);
        const prev = seen.get(t.id);
        if (prev) {
          expect(lines, `ticket ${t.id}`).toBe(prev.lines);
          t.lines.forEach((l, i) => expect(l.filled || !prev.filled[i], `ticket ${t.id} line ${i} unfilled again`).toBe(true));
          expect(price, `ticket ${t.id} price fell`).toBeGreaterThanOrEqual(prev.price);
          if (price > prev.price) rises++;
        }
        seen.set(t.id, { lines, filled: t.lines.map((l) => l.filled), price });
      }
    }
    expect(paidTickets).toBeGreaterThan(50);
    expect(rises).toBeGreaterThan(0); // stall levels raised prices live
  }, 60_000);

  it('a stall level raises the price of a ticket on that chain at once (M26), and is the price paid', () => {
    const g = mergeState(cfg, { clock: 100, cash: 5000, chains: [{ c: 0, gear: 3, best: 6 }], goods: [[R.cellAt(2, 0), 0, 6]], counters: [[[0, 6]], null] });
    const t = g.merge.counters[0].ticket!;
    const before = R.ticketPrice(cfg, g, t);
    const up = R.levelStall(cfg, g, 0);
    const after = R.ticketPrice(cfg, up, up.merge.counters[0].ticket!);
    expect(after).toBeGreaterThan(before);
    expect(after).toBe(R.roundCoins(cfg, R.value(cfg, up, 0, 6)));
    const paid = R.dropAt(cfg, up, R.cellAt(2, 0), { kind: 'counter', counter: 0 });
    expect(paid.result).toMatchObject({ kind: 'lineFill', paid: after });
  });
});

describe('the Parade (2.7, 2.4 events 6 and 7)', () => {
  it('is due at season clock 360 s: the next refill after it draws the gold ticket; no second while one is out', () => {
    let g = mergeState(cfg, { clock: 340, chains: [{ c: 0, gear: 3, best: 4 }, { c: 1, best: 3 }], goods: [], counters: [[[0, 4]], null] });
    g = { ...g, merge: { ...g.merge, paradeAt: 360, counters: g.merge.counters.map((ct, j) => (j === 1 ? { ...ct, refillAt: 350 } : ct)) } };
    const ev: R.MergeEvent[] = [];
    g = R.advanceMerge(cfg, g, 15, 0, ev);
    expect(g.merge.counters[1].ticket?.gold).toBeFalsy(); // 350 < 360: an ordinary ticket
    const paid = { ...g, merge: { ...g.merge, counters: g.merge.counters.map((ct, j) => (j === 0 ? { ...ct, ticket: null, refillAt: 362 } : ct)) } };
    const ev2: R.MergeEvent[] = [];
    const after = R.advanceMerge(cfg, paid, 10, 0, ev2);
    expect(after.merge.counters[0].ticket?.gold).toBe(true);
    expect(ev2).toContainEqual({ type: 'paradeArrive', counter: 0 });
    expect(after.merge.draws.parade).toBe(paid.merge.draws.parade + 2 * cfg.merge.parade.lines); // the Parade stream: 2 values per configured line
    expect(R.paradeOut(after.merge)).toBe(true);
    expect(R.paradeDue(after.merge, 400)).toBe(false);
  });

  it('sending the gold ticket off restarts the Parade clock (restartParade: season clock + the interval)', () => {
    const g = mergeFixtures(cfg).minute10;
    const j = g.merge.counters.findIndex((ct) => ct.ticket?.gold);
    const off = R.notTonight(cfg, g, j);
    expect(off).not.toBe(g);
    expect(off.merge.paradeAt).toBe(g.stats.playSeconds - g.merge.seasonStartedAt + R.currentMods(cfg, g.merge).paradeEvery);
    expect(R.restartParade(cfg, g.merge, 600).paradeAt).toBe(600 + R.currentMods(cfg, g.merge).paradeEvery);
  });

  it('"Call the dragon" (M14) seats the Parade now at an empty counter, then cools down 20 min of play; refused while one is out', () => {
    const g = mergeState(cfg, { clock: 100, chains: [{ c: 0, gear: 3, best: 4 }, { c: 1, best: 3 }], goods: [], counters: [[[0, 4]], null] });
    expect(R.canWatchAd(cfg, g, 'callDragon')).toBe(true);
    const ev: R.MergeEvent[] = [];
    const called = R.grantAd(cfg, g, 'callDragon', undefined, ev);
    expect(called.merge.counters[1].ticket?.gold).toBe(true);
    expect(called.merge.ads.callDragon).toBe(100 + cfg.merge.ads.callDragonCooldown);
    expect(ev.map((e) => e.type)).toEqual(['ticketDrawn', 'paradeArrive', 'adGranted']);
    expect(R.canWatchAd(cfg, called, 'callDragon')).toBe(false);
    expect(R.grantAd(cfg, called, 'callDragon')).toBe(called);
    // Decision M46: with no empty counter the ad still delivers: the Parade is due from this moment and
    // takes the next counter that frees; it is not offered again while one is due.
    const full = mergeState(cfg, { clock: 100, chains: [{ c: 0, gear: 3, best: 4 }, { c: 1, best: 3 }], goods: [], counters: [[[0, 4]], [[0, 3]]] });
    expect(R.paradeDue(full.merge, 100)).toBe(false);
    expect(R.canWatchAd(cfg, full, 'callDragon')).toBe(true);
    const due = R.grantAd(cfg, full, 'callDragon');
    expect(due).not.toBe(full);
    expect(due.merge.counters.some((ct) => ct.ticket?.gold)).toBe(false);
    expect(R.paradeDue(due.merge, 100)).toBe(true);
    expect(due.merge.ads.callDragon).toBe(100 + cfg.merge.ads.callDragonCooldown);
    expect(R.canWatchAd(cfg, due, 'callDragon')).toBe(false);
    // The next counter that frees seats it: send one ticket off and let its refill come due.
    const freed = R.notTonight(cfg, due, 0);
    expect(freed).not.toBe(due);
    const later = R.advanceMerge(cfg, freed, cfg.merge.tickets.refillDelay + 1, 0);
    expect(later.merge.counters.some((ct) => ct.ticket?.gold)).toBe(true);
  });
});

describe('"Fill one line" (5.7)', () => {
  const g = mergeState(cfg, { clock: 100, chains: [{ c: 0, gear: 3, best: 5 }, { c: 1, best: 4 }], goods: [], counters: [[[0, 5], [1, 3], [0, 2]], [[1, 4]]] });

  it('fills the cheapest unfilled line of a ticket with 2 or more unfilled lines, and cools down 5 min of play', () => {
    expect(R.canWatchAd(cfg, g, 'fillLine', 0)).toBe(true);
    const ev: R.MergeEvent[] = [];
    const x = R.grantAd(cfg, g, 'fillLine', 0, ev);
    expect(x.merge.counters[0].ticket!.lines.map((l) => l.filled)).toEqual([false, false, true]); // Grill 2 is the cheapest
    expect(x.cash).toBe(g.cash); // the ticket still ends with a drag
    expect(x.merge.ads.fillLine).toBe(100 + cfg.merge.ads.fillLineCooldown);
    expect(ev).toEqual([{ type: 'lineFill', counter: 0, line: 2 }, { type: 'adGranted', kind: 'fillLine' }]);
    expect(R.grantAd(cfg, x, 'fillLine', 0)).toBe(x);
    const later = { ...x, stats: { ...x.stats, playSeconds: 400 } };
    expect(R.canWatchAd(cfg, later, 'fillLine', 0)).toBe(true);
  });

  it('regression: a stretch line the ad filled comes back through "Not tonight" as a made good (best and the Ladder Book rise, M32)', () => {
    // Found by the long random run (seed 4242, step 3160): a Tea 6 stretch line filled by the ad,
    // then sent off, put a Tea 6 on the board above best 5 (bound (a) broken for the next draws).
    const s = mergeState(cfg, { clock: 100, chains: [{ c: 0, gear: 3, best: 5 }, { c: 1, best: 5 }], goods: [], counters: [[[1, 6], [1, 6]], null] });
    const filled = R.grantAd(cfg, s, 'fillLine', 0);
    expect(filled.merge.counters[0].ticket!.lines.filter((l) => l.filled)).toHaveLength(1);
    const off = R.notTonight(cfg, filled, 0);
    expect(off.merge.board.some((x) => R.isGood(x) && x.c === 1 && x.k === 6)).toBe(true);
    expect(off.merge.chains[1].best).toBe(6);
    expect(off.merge.book[1][5]).toBe(true);
    expect(fixtureProblems(cfg, off, { afterPlay: true })).toEqual([]);
  });

  it('never fills the last line: refused on a ticket with one unfilled line', () => {
    expect(R.canWatchAd(cfg, g, 'fillLine', 1)).toBe(false);
    expect(R.grantAd(cfg, g, 'fillLine', 1)).toBe(g);
    let x = g;
    for (let i = 0; i < 5; i++) {
      x = R.grantAd(cfg, { ...x, merge: { ...x.merge, ads: { ...x.merge.ads, fillLine: 0 } } }, 'fillLine', 0);
      expect(x.merge.counters[0].ticket!.lines.filter((l) => !l.filled).length).toBeGreaterThanOrEqual(1);
    }
    expect(x.merge.counters[0].ticket!.lines.filter((l) => !l.filled)).toHaveLength(1);
  });

  it('"Gear rush" drops up to 6 base-tier goods per open gear into free cells, never beyond F, then cools down 15 min', () => {
    const few = mergeState(cfg, { clock: 100, chains: [{ c: 0, gear: 12 }, { c: 1 }], goods: [], counters: [[[0, 3]], null] });
    const F = R.mergeParams(cfg, few).F;
    const x = R.grantAd(cfg, few, 'gearRush');
    const placed = x.merge.board.filter((c) => R.isGood(c));
    expect(placed).toHaveLength(Math.min(F, 12));
    expect(placed.filter((c) => R.isGood(c) && c.c === 0).every((c) => R.isGood(c) && c.k === 2)).toBe(true);
    expect(x.merge.ads.gearRush).toBe(100 + cfg.merge.ads.gearRushCooldown);
  });
});
