/**
 * Time away (spec 2.9 with Decision M26; src/engine/merge/offline.ts), spec 10.2 `offline.test.ts`:
 * the closed form equals event stepping with the board frozen on shelves, sales and next-event
 * offsets (to the last bit, on random states); the earnings are returned and cash is unchanged;
 * nothing is more than one interval ahead of the clock; the caps (4 h, lantern 6, Late Hours);
 * the device clock moved forward 4 h, back, and forward again pays once; ad cooldowns, refills, the
 * Parade, releases and the undo chip keep their times; `reportAlone`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as E from '../economy';
import { FIXTURE_NOW, fixtureProblems, mergeFixtures, mergeState, mergeTestConfig } from '../fixtures/merge';
import * as R from '../merge';
import { mergeEngineMode } from '../mergeMode';
import { installEngineMode } from '../mode';
import type { GameState } from '../types';

const cfg = mergeTestConfig();
const H = 3600;
const T = cfg.merge.gear.interval;
const Q = cfg.merge.minders.interval;

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

/** A random mid-game state: open chains with gear, stall and minder levels, part-full shelves, waiting gears, clocks anywhere within their interval. */
function randomState(rnd: () => number, seed: number): R.MergeGame {
  const open = 1 + Math.floor(rnd() * 6);
  const clock = 100 + Math.floor(rnd() * 20_000) + rnd();
  const chains = Array.from({ length: open }, (_, c) => {
    const shelfLen = rnd() < 0.3 ? 0 : Math.floor(rnd() * 7);
    return { c, gear: 1 + Math.floor(rnd() * 40), stall: 1 + Math.floor(rnd() * 20), minder: Math.floor(rnd() * 5), shelf: Array.from({ length: shelfLen }, () => 1 + Math.floor(rnd() * 3)), waiting: shelfLen === 6 && rnd() < 0.5 };
  });
  const g = mergeState(cfg, { clock, seed, season: chains.length > 5 ? 1 : 0, chains: chains.map((ch) => ({ ...ch, best: 8 })), goods: [], lanterns: rnd() < 0.3 ? [3] : [] });
  const m = g.merge;
  return {
    ...g,
    merge: {
      ...m,
      chains: m.chains.map((ch) => (ch.open ? { ...ch, nextPopAt: clock + rnd() * T, nextSaleAt: clock + rnd() * Q, releaseAt: ch.shelf.length ? clock + 0.25 : null } : ch)),
    },
  };
}

describe('the closed form of 2.9 equals event stepping with the board frozen (M26, gate 9)', () => {
  it('on shelves, drawn tiers, waiting gears, sales, coins and next-event offsets, over 400 random states and absences', () => {
    const rnd = prng(99);
    for (let i = 0; i < 400; i++) {
      const g = randomState(rnd, 1000 + i);
      const tp = rnd() < 0.2 ? rnd() * 30 : rnd() * 8 * H;
      const closed = R.awayClosedForm(cfg, g, tp);
      const stepped = R.awayByEvents(cfg, g, tp);
      expect(JSON.stringify(closed.m), `state ${i}, t' ${tp}`).toBe(JSON.stringify(stepped.m));
      expect(closed.sales).toEqual(stepped.sales);
      expect(closed.shelved).toEqual(stepped.shelved);
      expect(closed.waiting).toEqual(stepped.waiting);
      expect(closed.coins).toBe(stepped.coins);
    }
  }, 60_000);

  it('no clock is left more than one interval ahead of the game clock, and none behind it', () => {
    const rnd = prng(7);
    for (let i = 0; i < 200; i++) {
      const g = randomState(rnd, 50 + i);
      const clock = g.stats.playSeconds;
      const r = R.mergeOffline(cfg, g, FIXTURE_NOW + Math.floor(rnd() * 6 * H * 1000));
      for (const ch of r.game.merge.chains) {
        if (!ch.open) continue;
        if (!ch.waiting) {
          expect(ch.nextPopAt).toBeGreaterThan(clock - 1e-9);
          expect(ch.nextPopAt).toBeLessThanOrEqual(clock + T + 1e-9);
        }
        if (ch.minder > 0) {
          expect(ch.nextSaleAt).toBeGreaterThan(clock - 1e-9);
          expect(ch.nextSaleAt).toBeLessThanOrEqual(clock + Q + 1e-9);
        }
        expect(ch.shelf.length).toBeLessThanOrEqual(R.currentMods(cfg, g.merge).shelfCap);
      }
      expect(r.game.stats.playSeconds).toBe(clock);
    }
  }, 60_000);
});

describe('time away is additive (regression: an absence with nothing due used to count for nothing)', () => {
  /** Two absences a then b (the game clock does not move while away) against one of a + b. */
  function twoAgainstOne(g: R.MergeGame, a: number, b: number) {
    const one = R.awayClosedForm(cfg, g, a + b);
    const first = R.awayClosedForm(cfg, g, a);
    const second = R.awayClosedForm(cfg, { ...g, merge: first.m }, b);
    return { one, first, second };
  }

  it('away(a) then away(b) gives the sales, shelves, waiting gears and clocks of away(a + b), on 400 random states', () => {
    const rnd = prng(4242);
    for (let i = 0; i < 400; i++) {
      const g = randomState(rnd, 3000 + i);
      const total = rnd() < 0.5 ? rnd() * 40 : rnd() * 3 * H;
      const a = rnd() * total;
      const { one, first, second } = twoAgainstOne(g, a, total - a);
      expect(first.coins + second.coins, `state ${i}`).toBe(one.coins);
      const goods = (r: typeof one) => r.sales.reduce((x, s) => x + s.goods, 0);
      expect(goods(first) + goods(second), `state ${i}`).toBe(goods(one));
      one.m.chains.forEach((ch, c) => {
        const two = second.m.chains[c];
        expect(two.shelf, `state ${i} chain ${c}`).toEqual(ch.shelf);
        expect(two.waiting, `state ${i} chain ${c}`).toBe(ch.waiting);
        if (!ch.open) return;
        // A waiting gear's drop clock means nothing until a release restarts it.
        if (!ch.waiting) expect(Math.abs(two.nextPopAt - ch.nextPopAt), `state ${i} chain ${c} drop clock`).toBeLessThan(1e-6);
        if (ch.minder > 0) expect(Math.abs(two.nextSaleAt - ch.nextSaleAt), `state ${i} chain ${c} sale clock`).toBeLessThan(1e-6);
      });
      expect(second.m.draws.drop).toEqual(one.m.draws.drop);
      // The event stepping keeps the same rule.
      const stepped = R.awayByEvents(cfg, { ...g, merge: R.awayByEvents(cfg, g, a).m }, total - a);
      expect(stepped.m.chains.map((ch) => ch.shelf)).toEqual(one.m.chains.map((ch) => ch.shelf));
    }
  }, 60_000);

  it('5 s then 5 s away pays what 10 s pays when a sale falls due between 5 s and 10 s', () => {
    const g0 = mergeFixtures(cfg).minute10;
    const clock = g0.stats.playSeconds;
    const merge = { ...g0.merge, chains: g0.merge.chains.map((ch) => (ch.open ? { ...ch, minder: Math.max(1, ch.minder), nextSaleAt: clock + 8, nextPopAt: clock + 7 } : ch)) };
    const g = { ...g0, merge };
    const { one, first, second } = twoAgainstOne(g, 5, 5);
    expect(one.coins).toBeGreaterThan(0);
    expect(first.coins).toBe(0);
    expect(first.coins + second.coins).toBe(one.coins);
    expect(second.m.chains[0].shelf).toEqual(one.m.chains[0].shelf);
  });
});

describe('mergeOffline (2.9)', () => {
  const g = mergeFixtures(cfg).minute10;

  it('returns the earnings and never adds them to cash; the game clock does not move', () => {
    const r = R.mergeOffline(cfg, g, FIXTURE_NOW + H * 1000);
    expect(r.seconds).toBe(H);
    expect(r.earnings).toBeGreaterThan(0);
    expect(r.game.cash).toBe(g.cash);
    expect(r.game.merge.mstats.coins).toEqual(g.merge.mstats.coins);
    expect(r.game.stats.playSeconds).toBe(g.stats.playSeconds);
    expect(r.report).toMatchObject({ seconds: H, effective: H, earnings: r.earnings });
    // Each minder sold 1 + floor((t′ − d)/Q) house goods at its rounded sale amount (M19); the sum rounded once.
    let sum = 0;
    for (const ch of g.merge.chains.map((x, c) => ({ ...x, c })).filter((x) => x.open && x.minder > 0)) {
      const d = ch.nextSaleAt - g.stats.playSeconds;
      const sales = 1 + Math.floor((H - d) / Q);
      expect(r.report!.sales.find((s) => s.c === ch.c)).toEqual({ c: ch.c, goods: sales, coins: sales * R.saleAmount(cfg, g, ch.c) });
      sum += sales * R.saleAmount(cfg, g, ch.c);
    }
    expect(r.earnings).toBe(R.roundCoins(cfg, sum));
    expect(fixtureProblems(cfg, r.game)).toEqual([]);
  });

  it('the board, refills, the Parade, ad cooldowns, the till, releaseAt and the undo chip keep their times', () => {
    const chip = { ...g, merge: { ...g.merge, board: g.merge.board.map((x, i) => (i === 40 ? null : x)), basketUndo: { cell: 40, good: { c: 0, k: 1 }, refund: 2, until: 602 }, ads: { fillLine: 700, gearRush: 900, callDragon: 1500 } } };
    const r = R.mergeOffline(cfg, chip, FIXTURE_NOW + 3 * H * 1000);
    const m = r.game.merge;
    expect(m.board).toEqual(chip.merge.board);
    expect(m.counters).toEqual(chip.merge.counters);
    expect(m.paradeAt).toBe(chip.merge.paradeAt);
    expect(m.ads).toEqual(chip.merge.ads);
    expect(m.basketUndo).toEqual(chip.merge.basketUndo);
    expect(m.till).toBe(chip.merge.till);
    expect(m.tillAt).toBe(chip.merge.tillAt);
    // A shelf that already held goods keeps its release time; one that was empty releases at once on return.
    chip.merge.chains.forEach((ch, c) => {
      if (ch.shelf.length) expect(m.chains[c].releaseAt).toBe(ch.releaseAt);
      else if (m.chains[c].shelf.length) expect(m.chains[c].releaseAt).toBe(chip.stats.playSeconds);
    });
  });

  it('the cap: 4 h, +2 h with lantern 6, +4 h with Late Hours; and nothing for t ≤ 0', () => {
    const long = FIXTURE_NOW + 30 * H * 1000;
    expect(R.mergeOffline(cfg, g, long).report!.effective).toBe(4 * H);
    const late = { ...g, entitlements: { ...g.entitlements, products: [cfg.merge.products.lateHours] } };
    expect(R.mergeOffline(cfg, late, long).report!.effective).toBe(8 * H);
    const lit = { ...g, merge: { ...g.merge, lanterns: [...g.merge.lanterns, 6] } };
    expect(R.mergeParams(cfg, lit).mods.awayHours).toBe(2);
    expect(R.mergeOffline(cfg, lit, long).report!.effective).toBe(6 * H);
    expect(R.mergeOffline(cfg, { ...lit, entitlements: late.entitlements }, long).report!.effective).toBe(10 * H);
    for (const now of [FIXTURE_NOW, FIXTURE_NOW - H * 1000, Number.NaN]) {
      const r = R.mergeOffline(cfg, g, now);
      expect(r).toEqual({ seconds: 0, earnings: 0, game: g });
      expect(r.game).toBe(g);
    }
  });

  it('a gear fills its shelf while away and waits when more drops were due than the shelf holds', () => {
    const s = mergeState(cfg, { clock: 50, chains: [{ c: 0, gear: 1, shelf: [1, 1] }], goods: [] });
    const short = R.mergeOffline(cfg, s, FIXTURE_NOW + 9 * 1000); // drops at 52, 56: two more
    expect(short.game.merge.chains[0]).toMatchObject({ shelf: [1, 1, 1, 1], waiting: false, nextPopAt: 50 + (2 + 2 * T - 9) });
    const long = R.mergeOffline(cfg, s, FIXTURE_NOW + H * 1000);
    expect(long.game.merge.chains[0].shelf).toHaveLength(cfg.merge.gear.shelf);
    expect(long.game.merge.chains[0].waiting).toBe(true);
    expect(long.report).toMatchObject({ earnings: 0, sales: [], shelved: [{ c: 0, goods: 4 }], waiting: [0] });
  });
});

describe('reportAlone and two reports of one absence', () => {
  it('reportAlone is true when the shelves filled with no minder selling, false otherwise', () => {
    const alone = R.mergeOffline(cfg, mergeState(cfg, { clock: 50, chains: [{ c: 0 }], goods: [] }), FIXTURE_NOW + H * 1000).report;
    expect(R.awayReportAlone(alone)).toBe(true);
    expect(mergeEngineMode.reportAlone!(alone)).toBe(true);
    const withMinder = R.mergeOffline(cfg, mergeFixtures(cfg).minute10, FIXTURE_NOW + H * 1000).report;
    expect(R.awayReportAlone(withMinder)).toBe(false);
    expect(R.awayReportAlone(undefined)).toBe(false);
    expect(R.awayReportAlone({ sales: [], shelved: [], seconds: 9, effective: 9, earnings: 0, waiting: [] })).toBe(false);
  });

  it('mergeReport adds two reports of one absence', () => {
    const g = mergeFixtures(cfg).minute10;
    const a = R.mergeOffline(cfg, g, FIXTURE_NOW + 600_000);
    const b = R.mergeOffline(cfg, { ...a.game, lastSavedAt: FIXTURE_NOW + 600_000 }, FIXTURE_NOW + 1_200_000);
    const both = R.mergeAwayReports(a.report, b.report) as R.AwayReport;
    expect(both.seconds).toBe(1200);
    expect(both.earnings).toBe(a.earnings + b.earnings);
    expect(R.mergeAwayReports(undefined, b.report)).toBe(b.report);
  });
});

describe('the device clock moved: forward 4 h, back, forward again pays once (the shared guard)', () => {
  beforeAll(() => installEngineMode(mergeEngineMode));
  afterAll(() => installEngineMode(null));

  /** What the store's resume does with time away (src/state/store.ts resume): clampClock, computeOffline, keep the game, grant, save. */
  function resume(game: GameState, now: number): { game: GameState; paid: number } {
    let g = E.clampClock(cfg, game, now);
    const away = E.computeOffline(cfg, g, now);
    if (away.game && away.seconds > 0) g = away.game;
    if (away.earnings > 0) g = E.grantCash(g, away.earnings);
    return { game: { ...g, lastSavedAt: now }, paid: away.earnings };
  }

  it('pays the first 4 h once, and nothing for going back and forward again', () => {
    const g0 = { ...mergeFixtures(cfg).minute10, lastSavedAt: FIXTURE_NOW } as GameState;
    const fwd = resume(g0, FIXTURE_NOW + 4 * H * 1000);
    expect(fwd.paid).toBeGreaterThan(0);
    const back = resume(fwd.game, FIXTURE_NOW);
    expect(back.paid).toBe(0);
    const again = resume(back.game, FIXTURE_NOW + 4 * H * 1000);
    expect(again.paid).toBe(0);
    expect(again.game.cash).toBe(g0.cash + fwd.paid);
    // The merge clocks were re-phased once only.
    expect((again.game as R.MergeGame).merge.chains).toEqual((fwd.game as R.MergeGame).merge.chains);
  });

  it('ad cooldowns are on the play clock: moving the device clock does not move them', () => {
    const g0 = { ...mergeFixtures(cfg).minute10, lastSavedAt: FIXTURE_NOW } as R.MergeGame;
    const cooled = { ...g0, merge: { ...g0.merge, ads: { fillLine: 900, gearRush: 1500, callDragon: 1800 } } } as GameState;
    const fwd = resume(cooled, FIXTURE_NOW + 15 * 60 * 1000);
    expect((fwd.game as R.MergeGame).merge.ads).toEqual({ fillLine: 900, gearRush: 1500, callDragon: 1800 });
    expect(fwd.game.stats.playSeconds).toBe(g0.stats.playSeconds);
    expect(R.canWatchAd(cfg, fwd.game as R.MergeGame, 'gearRush')).toBe(false);
  });
});

describe('income readings (2.9)', () => {
  it('income() is the minder rate as the till takes it; activeIncome() adds the recent ticket rate', () => {
    const g = mergeFixtures(cfg).minute10;
    const rate = g.merge.chains.reduce((a, ch, c) => a + (ch.open && ch.minder > 0 ? R.saleAmount(cfg, g, c) / Q : 0), 0);
    expect(R.mergeIncome(cfg, g)).toBeCloseTo(rate, 12);
    expect(R.mergeParams(cfg, g).minderRate).toBeCloseTo(rate, 12);
    const coins = g.merge.recent.coins.map((row) => row.slice());
    coins[0][59] = 120;
    const busy = { ...g, merge: { ...g.merge, recent: { at: Math.floor(g.stats.playSeconds / 5), coins } } };
    expect(R.mergeActiveIncome(cfg, busy)).toBeCloseTo(rate + 120 / 300, 12);
    expect(mergeEngineMode.income(cfg, busy, 0)).toBeCloseTo(rate, 12);
    expect(mergeEngineMode.activeIncome(cfg, busy, 0)).toBeCloseTo(rate + 120 / 300, 12);
  });
});
