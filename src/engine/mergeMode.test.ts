/**
 * The merge engine mode (src/engine/mergeMode.ts) and what the skeleton's rules already hold
 * (spec 10.2 `mergeMode.test.ts`): create (2.3 with 2.7's scripted start), reconcile from a broken
 * save, the save tag, `config` rejecting an invalid block, `offlineAdMultiplier`, the clocks of the
 * tick, the shared engine delegating to it for merge configs only, the schema's ranges and the
 * fixtures' invariants. The rules packages extend this file; the `todo` entries are theirs.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { MERGE_STARTING_CONTENT } from '../config/merge.content';
import { MergeSchema, RANGES, lintMerge, valueAt } from '../config/schema.merge';
import * as E from './economy';
import { FIXTURE_NOW, MERGE_TEST_CONTENT, baseGameState, fixtureProblems, freshState, mergeFixtures, mergeState, mergeTestConfig } from './fixtures/merge';
import * as R from './merge';
import { mergeEngineMode, withMergeContent } from './mergeMode';
import { engineFor, installEngineMode } from './mode';
import type { GameState } from './types';

const cfg = mergeTestConfig();
const pizzaCfg = GameConfigSchema.parse(pizza);

describe('the merge engine mode', () => {
  it('is mode "merge" with its own save tag', () => {
    expect(mergeEngineMode.id).toBe('merge');
    expect(mergeEngineMode.saveTag).toBe('merge1');
  });

  it('config parses the opaque block with its defaults and throws on an invalid or missing one', () => {
    const raw = { ...cfg, merge: JSON.parse(JSON.stringify(MERGE_TEST_CONTENT)) };
    delete (raw.merge as Record<string, unknown>).basket;
    const parsed = withMergeContent(raw as never) as R.MergeConfig;
    expect(parsed.merge.basket).toEqual({ share: 0.25, undoSeconds: 4 });
    const broken = { ...cfg, merge: { ...JSON.parse(JSON.stringify(MERGE_TEST_CONTENT)), chains: [] } };
    expect(() => withMergeContent(broken as never)).toThrow(/"merge" block is invalid/);
    expect(() => withMergeContent({ ...cfg, merge: undefined } as never)).toThrow(/no "merge" block/);
    expect(withMergeContent(pizzaCfg)).toBe(pizzaCfg);
  });

  it('offlineAdMultiplier is 1.5 (Decision M8: "Watch ad: +50 %")', () => {
    expect(mergeEngineMode.offlineAdMultiplier!(cfg)).toBe(1.5);
  });

  it("canPrestige is the store's gate: the Festival filled (2.11), not prestige points", () => {
    const g = mergeFixtures(cfg).festivalNear;
    expect(E.prestigePointsAvailable(cfg, g)).toBe(0);
    expect(mergeEngineMode.canPrestige!(cfg, g)).toBe(false);
    expect(mergeEngineMode.canPrestige!(cfg, { ...g, merge: { ...g.merge, festival: { ...g.merge.festival, filledAt: 100 } } } as GameState)).toBe(true);
  });
});

describe('create (spec 2.3, 2.7)', () => {
  const g = freshState(cfg);
  const m = g.merge;

  it('opens 30 cells (columns 0 to 5, rows 2 to 6) and shuts the other 26', () => {
    expect(m.board).toHaveLength(56);
    expect(m.board.filter((c) => c === 'shutter')).toHaveLength(26);
    for (let row = 2; row <= 6; row++) for (let col = 0; col <= 5; col++) expect(m.board[R.cellAt(row, col)]).not.toBe('shutter');
    expect(m.shuttersOpened).toEqual([0, 0, 0, 0]);
  });

  it('puts 6 Pepper Skewers by the drop-cell rule (Decision M18; one stall: anchor column 3, the street row first)', () => {
    const goods = m.board.map((c, i) => [i, c] as const).filter(([, c]) => R.isGood(c));
    expect(goods).toEqual([0, 1, 2, 3, 4, 5].map((col) => [R.cellAt(2, col), { c: 0, k: 1 }]));
    // The fox's Twin Skewer (2) and the hedgehog's Glazed Skewer (4) need exactly these six.
    expect(2 + 4).toBe(goods.length);
  });

  it("the fox's Twin Skewer ticket at counter 1; counter 2 waits for the first merge", () => {
    expect(m.counters).toHaveLength(2);
    expect(m.counters[0].ticket).toMatchObject({ lines: [{ c: 0, k: 2, filled: false }], gold: false, scripted: true, customer: 0 });
    expect(m.counters[1]).toMatchObject({ ticket: null, refillAt: null });
    expect(m.script).toBe('fox');
  });

  it('the Grill is open at level 1 with best = maxPop = 1; the other stalls are closed', () => {
    expect(m.chains[0]).toMatchObject({ open: true, gear: 1, stall: 1, minder: 0, best: 1, shelf: [], waiting: false });
    expect(m.chains.slice(1).every((ch) => !ch.open && ch.best === 0)).toBe(true);
  });

  it("season 1's Festival, the first Parade at 360 s, no coins, no lanterns, no Pocket (M5)", () => {
    expect(m.festival.lines.map(({ c, k }) => [c, k])).toEqual([
      [0, 8],
      [1, 8],
      [2, 6],
      [4, 5],
    ]);
    expect(m.festival.filledAt).toBeNull();
    expect(m.paradeAt).toBe(360);
    expect(g.cash).toBe(0);
    expect(m.lanterns).toEqual([]);
    expect(m.gift.ticketsToBox).toBe(cfg.merge.gift.every);
    expect(cfg.merge.gift.every).toBe(25); // Decision M24's starting N
    expect('pocket' in m).toBe(false);
  });

  it('is deterministic for a seed and different across seeds', () => {
    expect(freshState(cfg, 7)).toEqual(freshState(cfg, 7));
    expect(freshState(cfg, 7).merge.seed).not.toBe(freshState(cfg, 8).merge.seed);
  });

  it('every fixture keeps the invariants of a reachable state', () => {
    for (const [name, f] of Object.entries(mergeFixtures(cfg))) expect(fixtureProblems(cfg, f), name).toEqual([]);
  });
});

describe('reconcile', () => {
  const base = baseGameState(FIXTURE_NOW);

  it('never throws: a broken or foreign save starts afresh', () => {
    for (const raw of [null, undefined, 42, 'x', {}, { merge: null }, { merge: { board: [1, 2] } }, { merge: { ...freshState(cfg).merge, chains: 'no' } }]) {
      const g = mergeEngineMode.reconcile(cfg, base, raw) as R.MergeGame;
      expect(g.merge.board).toHaveLength(56);
      expect(fixtureProblems(cfg, g)).toEqual([]);
    }
  });

  it('repairs a save broken field by field (300 corrupted saves): never throws, every invariant holds, the tick runs on', () => {
    const { minute10, festivalNear, minute3 } = mergeFixtures(cfg);
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    const junk = [null, undefined, 'x', -1, 1e308, Number.NaN, [], {}, true, 99, [1, 2, 3], { c: 9, k: 0 }];
    const paths = (o: unknown, pre: string[] = [], out: string[][] = []): string[][] => {
      if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
        out.push([...pre, k]);
        if (pre.length < 4) paths(v, [...pre, k], out);
      }
      return out;
    };
    for (let i = 0; i < 300; i++) {
      const src = [minute10, festivalNear, minute3][i % 3];
      const raw = JSON.parse(JSON.stringify(src)) as Record<string, unknown>;
      const all = paths(raw.merge, ['merge']);
      for (let n = 0; n < 1 + Math.floor(rnd() * 4); n++) {
        const p = all[Math.floor(rnd() * all.length)];
        let o = raw as Record<string, unknown>;
        for (const k of p.slice(0, -1)) o = (o?.[k] ?? {}) as Record<string, unknown>;
        if (o && typeof o === 'object') o[p[p.length - 1]] = junk[Math.floor(rnd() * junk.length)];
      }
      const g = mergeEngineMode.reconcile(cfg, { ...base, stats: { ...base.stats, playSeconds: src.stats.playSeconds } }, raw) as R.MergeGame;
      expect(g.merge.board, `save ${i}`).toHaveLength(56);
      expect(fixtureProblems(cfg, g, { afterPlay: true }), `save ${i}`).toEqual([]);
      const later = mergeEngineMode.tick(cfg, g, 30, FIXTURE_NOW) as R.MergeGame;
      expect(fixtureProblems(cfg, later, { afterPlay: true }), `save ${i} after 30 s`).toEqual([]);
    }
  }, 60_000);

  it('regression (M32): a reload never raises best_c for a gear level and never stamps a tier that was not made', () => {
    let g = { ...freshState(cfg, 4), cash: 20 };
    g = R.levelGear(cfg, g, 0);
    g = R.levelGear(cfg, { ...g, cash: 1000 }, 0);
    // Gear level 3: maxPop 2 (ripe drops), but nothing above a Pepper Skewer was made yet.
    expect(R.maxPopAt(cfg, R.currentMods(cfg, g.merge), g.merge.chains[0].gear)).toBe(2);
    expect(g.merge.chains[0].best).toBe(1);
    expect(g.merge.book[0][1]).toBe(false);
    const back = mergeEngineMode.reconcile(cfg, { ...base, stats: { ...base.stats, playSeconds: g.stats.playSeconds } }, JSON.parse(JSON.stringify(g))) as R.MergeGame;
    expect(back.merge.chains[0].best).toBe(1);
    expect(back.merge.book).toEqual(g.merge.book);
    // The next ticket draws are the same after a save and load.
    expect(R.drawTicket(cfg, back, 1)).toEqual(R.drawTicket(cfg, g, 1));
  });

  it('a reload during the opening script keeps every empty counter held (M42)', () => {
    const g = freshState(cfg, 4);
    const back = mergeEngineMode.reconcile(cfg, base, JSON.parse(JSON.stringify(g))) as R.MergeGame;
    expect(back.merge.script).toBe('fox');
    expect(back.merge.counters.map((ct) => [ct.refillAt, ct.blockedAt])).toEqual(g.merge.counters.map((ct) => [ct.refillAt, ct.blockedAt]));
    expect(fixtureProblems(cfg, back)).toEqual([]);
  });

  it('keeps a current save and clears the Basket undo chip (2.5)', () => {
    const { minute10 } = mergeFixtures(cfg);
    const saved = { ...minute10, merge: { ...minute10.merge, basketUndo: { cell: 40, good: { c: 0, k: 1 }, refund: 1, until: 999 } } };
    const g = mergeEngineMode.reconcile(cfg, base, JSON.parse(JSON.stringify(saved))) as R.MergeGame;
    expect(g.merge.basketUndo).toBeNull();
    expect(g.merge.board).toEqual(minute10.merge.board);
  });
});

describe('tick, income, offline, close, entitle through the engine mode', () => {
  it('adds stats.playSeconds itself, cut to MAX_TICK, runs the queue, and splits exactly (tick.split.test.ts has the property)', () => {
    const g = freshState(cfg);
    const t = (s: GameState, dt: number) => mergeEngineMode.tick(cfg, s, dt, FIXTURE_NOW);
    expect(t(g, 2.5).stats.playSeconds).toBe(2.5);
    expect(t(g, 99_999).stats.playSeconds).toBe(R.MAX_TICK);
    expect(t(g, -1)).toBe(g);
    expect(t(t(g, 1.25), 0.75)).toEqual(t(g, 2));
    // The Grill drops every 4 s (Decision M3): by 8 s two drops have come (the board has room).
    const ev: R.MergeEvent[] = [];
    mergeEngineMode.tick(cfg, g, 8, FIXTURE_NOW, ev);
    expect(ev.filter((e) => e.type === 'drop' || e.type === 'shelved')).toHaveLength(2);
  });

  it('income and activeIncome are finite and never negative', () => {
    for (const f of Object.values(mergeFixtures(cfg))) {
      expect(mergeEngineMode.income(cfg, f, FIXTURE_NOW)).toBeGreaterThanOrEqual(0);
      expect(mergeEngineMode.activeIncome(cfg, f, FIXTURE_NOW)).toBeGreaterThanOrEqual(0);
    }
  });

  it('offline adds nothing to cash and keeps the time already paid', () => {
    const g = mergeFixtures(cfg).minute10;
    const r = mergeEngineMode.offline(cfg, g, FIXTURE_NOW + 3600_000);
    expect(r.earnings).toBeGreaterThanOrEqual(0);
    expect((r.game as R.MergeGame).cash).toBe(g.cash);
  });

  it('closing the season is refused (the same object) while the Festival is not filled', () => {
    const g = mergeFixtures(cfg).festivalNear;
    expect(mergeEngineMode.prestige(cfg, g, FIXTURE_NOW)).toBe(g);
  });

  it('Late Hours adds 4 h to the away cap at once (5.7, M13: it no longer skips ads)', () => {
    const g = freshState(cfg);
    expect(R.mergeParams(cfg, g).awayCap).toBe(4 * 3600);
    const owned = { ...g, entitlements: { ...g.entitlements, products: [cfg.merge.products.lateHours] } };
    expect(R.mergeParams(cfg, owned).awayCap).toBe(8 * 3600);
    expect(owned.entitlements.skipRewarded).toBe(false);
  });
  it('entitle: Late Hours, Blue Silk Awnings and Quiet Evening change nothing in the state (the same object)', () => {
    const g = mergeFixtures(cfg).minute10;
    for (const id of [cfg.merge.products.lateHours, cfg.merge.products.awnings, cfg.merge.products.quietEvening, 'night_unknown']) expect(mergeEngineMode.entitle!(cfg, g, id)).toBe(g);
  });

  it('income = the minder rate; activeIncome = the recent ticket rate + the minder rate (2.9); reportAlone is the away rule', () => {
    const g = mergeFixtures(cfg).minute10;
    expect(mergeEngineMode.income(cfg, g, FIXTURE_NOW)).toBeCloseTo(R.mergeParams(cfg, g).minderRate, 12);
    expect(mergeEngineMode.activeIncome(cfg, g, FIXTURE_NOW)).toBeCloseTo(R.recentRate(g) + R.mergeParams(cfg, g).minderRate, 12);
    expect(mergeEngineMode.reportAlone!({ sales: [], shelved: [{ c: 0, goods: 3 }], seconds: 60, effective: 60, earnings: 0, waiting: [] })).toBe(true);
    expect(mergeEngineMode.reportAlone!({ sales: [{ c: 0, goods: 1, coins: 12 }], shelved: [{ c: 0, goods: 3 }], seconds: 60, effective: 60, earnings: 12, waiting: [] })).toBe(false);
  });
});

describe('params (2.2, 2.3: built by the skeleton so both rules packages test on real numbers)', () => {
  const g = freshState(cfg);
  const round = (x: number) => R.roundCost(cfg, x);

  it('roundCoins (M19): below 1,000 half up to a whole coin, from 1,000 to 3 significant digits; roundCost is the same function', () => {
    expect([43.5, 63.075, 999.4, 999.5, 1234.5, 1235, 172_800, 2_073_600, 0, -3, Number.NaN].map(round)).toEqual([44, 63, 999, 1000, 1230, 1240, 173_000, 2_070_000, 0, 0, 0]);
    expect([43.5, 172_800].map((x) => R.roundCoins(cfg, x))).toEqual([44, 173_000]);
    // Monotone: a price that rises never shows lower.
    let prev = 0;
    for (let x = 0; x < 5000; x += 0.37) {
      const r = R.roundCoins(cfg, x);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });

  it("prices the shutters, the gear, the stalls and the minders of 2.2", () => {
    const p = R.mergeParams(cfg, g);
    expect(p.shutters.map((s) => s && [s.n, s.cost, s.allowed])).toEqual([
      [0, 30, false],
      [6, 279, false],
      [14, 5450, false],
      [20, 50_600, false],
    ]);
    const shutterCosts = Array.from({ length: 6 }, (_, n) => round(30 * 1.45 ** n));
    expect(shutterCosts).toEqual([30, 44, 63, 91, 133, 192]);
    expect(round(30 * 1.45 ** 25)).toBe(325_000);
    const gear = (L: number) => round(20 * 1.45 ** (L - 1));
    expect([1, 2, 3, 4, 5].map(gear)).toEqual([20, 29, 42, 61, 88]);
    const sum = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => gear(a + i)).reduce((x, y) => x + y, 0);
    expect(sum(1, 11)).toBe(1782);
    // 2.2's "75.0K" is the sum of the unrounded costs (74,976); the paid, rounded steps add up to 75,074 (requests.md).
    expect(sum(1, 21)).toBe(75_074);
    expect(round(sum(1, 31))).toBe(3_080_000);
    expect(p.chains[0]).toMatchObject({ base: 1, ripe: 0, maxPop: 1, stallBonus: 1, gearCost: 20, stallCost: 50, minderCost: 150, houseTier: 0, openCost: null, loose: 6 });
    // Stall opening is the table of Decision M23 × F_s: only the next chain has a price.
    expect(p.chains[1].openCost).toBe(R.roundCoins(cfg, cfg.merge.costs.stallOpen[0]));
    expect(p.chains.slice(2).map((c) => c.openCost)).toEqual([null, null, null, null]);
    const later = { ...g, merge: { ...g.merge, feats: { ...g.merge.feats, seasonsClosed: 2 }, chains: g.merge.chains.map((ch, c) => (c <= 3 ? { ...ch, open: true } : ch)) } };
    expect(R.mergeParams(cfg, later).chains[4].openCost).toBe(R.roundCoins(cfg, cfg.merge.costs.stallOpen[3] * 0.85 ** 2));
    // Gear level 40 is the top (M28): no price at 40.
    const top = { ...g, merge: { ...g.merge, chains: g.merge.chains.map((ch, c) => (c === 0 ? { ...ch, gear: 40 } : ch)) } };
    expect(R.mergeParams(cfg, top).chains[0].gearCost).toBeNull();
    expect(R.mergeParams(cfg, { ...top, merge: { ...top.merge, chains: top.merge.chains.map((ch, c) => (c === 0 ? { ...ch, gear: 39 } : ch)) } }).chains[0].gearCost).toBe(round(20 * 1.45 ** 38));
    expect(p).toMatchObject({ O: 30, F: 24, beta: 0.15, familiar: 1, awayCap: 14_400, minderRate: 0 });
    expect(p.U).toBeCloseTo(12, 9); // value(grill, max(2, best − 1) = 2) = 5 × 2.4
  });

  it('gear: base tier, ripe chance and maxPop by level (2.2)', () => {
    const neutral = R.neutralMods(cfg);
    expect([1, 10, 11, 20, 21, 31, 40].map((L) => R.baseTier(cfg, L))).toEqual([1, 1, 2, 2, 3, 4, 4]);
    expect(R.ripeChance(cfg, neutral, 1)).toBe(0);
    expect(R.ripeChance(cfg, neutral, 10)).toBeCloseTo(0.45, 12);
    expect(R.maxPopAt(cfg, neutral, 11)).toBe(2);
    expect(R.maxPopAt(cfg, neutral, 12)).toBe(3);
    expect(R.ripeChance(cfg, { ripeAdd: 0.5 }, 10)).toBe(0.6);
  });

  it('values, ticket price, the Parade, U and the minder rate (2.3)', () => {
    expect(R.value(cfg, g, 0, 3)).toBeCloseTo(5 * 2.4 ** 2, 9);
    expect(R.value(cfg, g, 2, 1)).toBe(80);
    const two = { gold: false, lines: [{ c: 0, k: 2 }, { c: 1, k: 1 }] };
    // Computed from exact values, then rounded once (M19): (12 + 20) × 1.15 = 36.8 shows and pays 37.
    expect(R.ticketPrice(cfg, g, two)).toBe(37);
    expect(R.ticketPrice(cfg, g, { ...two, gold: true })).toBe(R.roundCoins(cfg, (12 + 20) * 1.15 * 2));
    expect(R.basketPrice(cfg, g, { c: 0, k: 3 })).toBe(R.roundCoins(cfg, 0.25 * 5 * 2.4 ** 2));
    const { minute10 } = mergeFixtures(cfg);
    const p = R.mergeParams(cfg, minute10);
    const hired = p.chains.filter((c) => c.houseTier > 0);
    expect(hired.length).toBeGreaterThan(0);
    for (const c of hired) expect(c.minderRate).toBeCloseTo(R.roundCoins(cfg, c.values[c.houseTier - 1]) / 15, 9);
    expect(p.minderRate).toBeCloseTo(hired.reduce((a, c) => a + c.minderRate, 0), 9);
    expect(R.looseCount(cfg, minute10.merge, 0)).toBe(p.chains[0].loose);
  });

  it('recent ticket coins per chain and R_t (2.10)', () => {
    const g0 = freshState(cfg);
    const clock = 120;
    const coins = g0.merge.recent.coins.map((row) => row.slice());
    coins[1][59] = 30;
    coins[0][58] = 10;
    const g1 = { ...g0, stats: { ...g0.stats, playSeconds: clock }, merge: { ...g0.merge, recent: { at: Math.floor(clock / 5), coins } } };
    expect(R.recentCoins(g1.merge, clock)).toBe(40);
    expect(R.recentCoins(g1.merge, clock, 1)).toBe(30);
    expect(R.recentRate(g1)).toBeCloseTo(40 / 120, 12);
    expect(R.recentRate(g1, 0)).toBeCloseTo(10 / 120, 12);
    expect(R.recentCoins(g1.merge, clock + 300)).toBe(0); // five minutes later every bucket is stale
  });
});

describe('seasons: closed forms and the season start (2.11)', () => {
  it('familiar faces and seasoned gear', () => {
    expect([0, 1, 4, 9].map((n) => R.familiarFactor(cfg, n))).toEqual([1, 0.85, 0.85 ** 4, 0.85 ** 4]);
    expect([0, 1, 3].map((s) => R.seasonedStartLevel(cfg, s))).toEqual([1, 11, 31]);
  });

  it("startSeason resets 2.11's list and keeps the rest", () => {
    const { festivalNear } = mergeFixtures(cfg);
    const m0 = { ...festivalNear.merge, chains: festivalNear.merge.chains.map((ch, c) => ({ ...ch, seasoned: c === 0 ? 1 : 0 })), luckySparks: 2 };
    const m = R.startSeason(cfg, m0, 1, 5000);
    expect(m.season).toBe(1);
    expect(m.seasonStartedAt).toBe(5000);
    expect(m.chains[0]).toMatchObject({ open: true, gear: 11, stall: 1, minder: 0, best: 2, seasoned: 1, shelf: [] });
    expect(m.chains.slice(1).every((ch) => !ch.open && ch.best === 0)).toBe(true);
    expect(m.board.filter((c) => c === 'shutter').length).toBe(festivalNear.merge.board.filter((c) => c === 'shutter').length);
    expect(m.board.filter((c) => R.isGood(c))).toHaveLength(cfg.merge.seasons.openingGoods);
    expect(m.counters.every((ct) => ct.ticket === null)).toBe(true);
    expect(m.festival.lines.map(({ c, k }) => [c, k])).toEqual(cfg.merge.festival[1].map((l) => [l.chain, l.tier]));
    expect(m).toMatchObject({ till: 0, basketUndo: null, script: 'done', luckySparks: 2, lanterns: m0.lanterns, book: expect.any(Array), shuttersOpened: m0.shuttersOpened });
  });
});

describe('the shared engine delegates to it for merge configs only', () => {
  beforeAll(() => installEngineMode(mergeEngineMode));
  afterAll(() => installEngineMode(null));

  it('dispatches by mode', () => {
    expect(engineFor(cfg)).toBe(mergeEngineMode);
    expect(engineFor(pizzaCfg)).toBeNull();
  });

  it('createInitialState, reconcileState and tick run the merge rules', () => {
    const g = E.createInitialState(cfg, FIXTURE_NOW) as R.MergeGame;
    expect(g.merge.counters[0].ticket?.scripted).toBe(true);
    const back = E.reconcileState(cfg, JSON.parse(JSON.stringify(g)), FIXTURE_NOW) as R.MergeGame;
    expect(back.merge.board).toEqual(g.merge.board);
    const later = E.tick(cfg, g, 1, FIXTURE_NOW + 1000) as R.MergeGame;
    expect(later.stats.playSeconds).toBeCloseTo(1, 9);
    expect(later.merge.board).toEqual(g.merge.board);
  });
});

describe('the merge schema (src/config/schema.merge.ts)', () => {
  // The rules' frozen test content (fixtures): the facts of the specification pinned below read it.
  const parsed = MergeSchema.parse(JSON.parse(JSON.stringify(MERGE_TEST_CONTENT)));
  // The shipped content (the numbers package's, tuned): only "it parses, lints clean, sits inside RANGES" reads it (the lead's order 6).
  const shipped = MergeSchema.parse(JSON.parse(JSON.stringify(MERGE_STARTING_CONTENT)));

  it('the shipped content parses, sits inside every range and lints clean; so does the frozen test content', () => {
    for (const r of RANGES) {
      const v = valueAt(shipped, r.path);
      expect(typeof v, r.path).toBe('number');
      expect(v as number, r.path).toBeGreaterThanOrEqual(r.low);
      expect(v as number, r.path).toBeLessThanOrEqual(r.high);
    }
    expect(lintMerge(shipped)).toEqual([]);
    for (const r of RANGES) {
      const v = valueAt(parsed, r.path);
      expect(typeof v, r.path).toBe('number');
      expect(v as number, r.path).toBeGreaterThanOrEqual(r.low);
      expect(v as number, r.path).toBeLessThanOrEqual(r.high);
    }
    expect(lintMerge(parsed)).toEqual([]);
  });

  it('holds the 20 lanterns with Decision M5 (14: a fourth gift-box slot, 16: Lucky 1 in 16) and no Pocket', () => {
    expect(parsed.lanterns.map((l) => l.n)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(parsed.lanterns[13]).toMatchObject({ effect: { type: 'giftSlots', value: 4 }, isNew: true });
    expect(parsed.lanterns[15].effect).toEqual({ type: 'luckyOdds', value: 16 });
    expect(JSON.stringify(parsed)).not.toMatch(/pocket/i);
  });

  it("has the chains' names of 2.2 and the Grill's values 5, 12, 29, 69, 166, 398, 955, 2,293", () => {
    expect(parsed.chains.map((c) => c.gear)).toEqual(['Ember Grill', 'Copper Urn', 'Bamboo Steamer', 'Sugar Pan', 'Noodle Wok', 'Lantern Pan']);
    expect(parsed.chains[0].tiers[7]).toBe('Dragon Grill Board');
    // value(c, k) is not rounded (2.3); 2.2 prints the Grill's values to a whole coin: 28.8 → 29,
    // 2,293.24 → 2,293, and only 955.51 is printed rounded down (955), so the check allows 0.52.
    const grill = Array.from({ length: 8 }, (_, k) => parsed.values.base * parsed.values.tierGrowth ** k);
    [5, 12, 29, 69, 166, 398, 955, 2293].forEach((printed, k) => expect(Math.abs(grill[k] - printed), `tier ${k + 1}`).toBeLessThan(0.52));
  });

  it('follows Decisions M13 to M15: three products, a third rewarded ad, Family Bowl', () => {
    expect(parsed.chains[4].tiers[5]).toBe('Family Bowl');
    expect(JSON.stringify(parsed)).not.toMatch(/Feast|Lamplighter/i);
    expect(parsed.products).toEqual({ awnings: 'night_awnings', lateHours: 'night_late_hours', quietEvening: 'night_quiet_evening' });
    expect(parsed.ads.callDragonCooldown).toBe(1200);
    expect(freshState(cfg).merge.ads).toEqual({ fillLine: 0, gearRush: 0, callDragon: 0 });
  });

  it('a range breach is a lint problem, never silently accepted', () => {
    expect(lintMerge({ ...parsed, gear: { ...parsed.gear, step: 13 } }).join('\n')).toMatch(/gear\.step = 13 is outside its range 8 to 12/);
    // The rules of section 11 that are fields but not knobs.
    expect(lintMerge({ ...parsed, gear: { ...parsed.gear, interval: 5 } }).join('\n')).toMatch(/T is 4 s for every gear/);
    expect(lintMerge({ ...parsed, costs: { ...parsed.costs, gearMaxLevel: 41 } }).join('\n')).toMatch(/gear level 40 is the top/);
    expect(lintMerge({ ...parsed, seasons: { ...parsed.seasons, levelsPerStep: 8 } }).join('\n')).toMatch(/N = s/);
    expect(lintMerge({ ...parsed, seasons: { ...parsed.seasons, openingGoods: 4 } }).join('\n')).toMatch(/6 Pepper Skewers/);
    expect(lintMerge({ ...parsed, festival: [parsed.festival[0].slice(0, 3), ...parsed.festival.slice(1)] }).join('\n')).toMatch(/4 to 6 lines/);
    expect(RANGES.some((r) => r.path === 'gear.interval')).toBe(false);
  });
});

describe('purchases and buttons (2.5), each checked against cash and conditions', () => {
  const c = R.cellAt;
  const rich = (extra: Parameters<typeof mergeState>[1] = {}) => mergeState(cfg, { clock: 100, cash: 10_000_000, chains: [{ c: 0, gear: 3, best: 4 }], goods: [], ...extra });

  it('openStall opens only the next chain, at its table price, with best = maxPop and the Ladder Book stamped', () => {
    const g = rich();
    expect(R.openStall(cfg, g, 2)).toBe(g); // not the next chain
    expect(R.openStall(cfg, g, 0)).toBe(g); // already open
    const ev: R.MergeEvent[] = [];
    const x = R.openStall(cfg, g, 1, ev);
    expect(x.cash).toBe(g.cash - R.roundCoins(cfg, cfg.merge.costs.stallOpen[0]));
    expect(x.merge.chains[1]).toMatchObject({ open: true, gear: 1, stall: 1, minder: 0, best: 1, nextPopAt: 100 + cfg.merge.gear.interval });
    expect(x.merge.book[1][0]).toBe(true);
    expect(ev[0]).toEqual({ type: 'stallOpen', c: 1 });
    expect(x.merge.mstats.coins.spend).toBe(-R.roundCoins(cfg, cfg.merge.costs.stallOpen[0]));
    const poor = { ...g, cash: 10 };
    expect(R.openStall(cfg, poor, 1)).toBe(poor);
    // Puffs only from season 2 (fromSeason 1).
    const five = rich({ chains: [0, 1, 2, 3, 4].map((ch) => ({ c: ch })) });
    expect(R.mergeParams(cfg, five).chains[5].openCost).toBeNull();
    expect(R.openStall(cfg, five, 5)).toBe(five);
  });

  it('levelGear makes drops finer, never faster, up to level 40 (M28), and does not raise best (M32)', () => {
    let g = rich();
    const T0 = g.merge.chains[0].nextPopAt;
    g = R.levelGear(cfg, g, 0);
    expect(g.merge.chains[0]).toMatchObject({ gear: 4, best: 4, nextPopAt: T0 });
    const top = rich({ chains: [{ c: 0, gear: 40, best: 5 }] });
    expect(R.levelGear(cfg, top, 0)).toBe(top);
    const ev: R.MergeEvent[] = [];
    R.levelGear(cfg, rich({ chains: [{ c: 0, gear: 10, best: 2 }] }), 0, ev);
    expect(ev[0]).toEqual({ type: 'gearLevel', c: 0, level: 11, baseStep: true });
    const raised = R.levelGear(cfg, rich({ chains: [{ c: 0, gear: 10, best: 2 }] }), 0);
    expect(raised.merge.chains[0].best).toBe(2);
  });

  it('levelStall, hireMinder and levelMinder: prices of 2.2, limits, the first sale one Q away', () => {
    let g = rich();
    g = R.levelStall(cfg, g, 0);
    expect(g.merge.chains[0].stall).toBe(2);
    expect(R.hireMinder(cfg, g, 1)).toBe(g); // a closed stall
    expect(R.levelMinder(cfg, g, 0)).toBe(g); // no minder yet
    g = R.hireMinder(cfg, g, 0);
    expect(g.merge.chains[0]).toMatchObject({ minder: 1, nextSaleAt: 100 + cfg.merge.minders.interval });
    expect(R.hireMinder(cfg, g, 0)).toBe(g);
    // M45: while the gear holds the house tier back, a minder level changes nothing and is refused.
    const b0 = R.baseTier(cfg, g.merge.chains[0].gear);
    expect(R.minderLevelBlock(cfg, g, 0)).toBe(1 >= b0 ? 'gear' : null);
    if (1 >= b0) expect(R.levelMinder(cfg, g, 0)).toBe(g);
    // At gear level 31 (base tier 4) every level up to the top raises the house tier.
    let h = rich({ chains: [{ c: 0, gear: 31, best: 5 }] });
    h = R.hireMinder(cfg, h, 0);
    for (let k = 1; k < cfg.merge.costs.minderMaxLevel; k++) {
      const before = R.mergeParams(cfg, h).chains[0].houseTier;
      h = R.levelMinder(cfg, h, 0);
      expect(R.mergeParams(cfg, h).chains[0].houseTier).toBe(before + 1);
    }
    expect(h.merge.chains[0].minder).toBe(cfg.merge.costs.minderMaxLevel);
    expect(R.minderLevelBlock(cfg, h, 0)).toBe('top');
    expect(R.levelMinder(cfg, h, 0)).toBe(h);
    expect(R.mergeParams(cfg, h).chains[0].houseTier).toBe(Math.min(cfg.merge.costs.minderMaxLevel + 1, R.baseTier(cfg, 31) + 1));
  });

  it('M45: levelMinder is refused while the gear holds the house tier back, and allowed once the gear rises', () => {
    let g = rich({ chains: [{ c: 0, gear: 11, best: 3 }] }); // base tier 2
    g = R.hireMinder(cfg, g, 0); // K = 1, h = 2
    g = R.levelMinder(cfg, g, 0); // K = 2, h = 3 = b + 1
    expect(g.merge.chains[0].minder).toBe(2);
    expect(R.minderLevelBlock(cfg, g, 0)).toBe('gear');
    expect(R.levelMinder(cfg, g, 0)).toBe(g);
    expect(R.advice(cfg, g)?.kind === 'minderLevel' && R.advice(cfg, g)?.target === 0).toBe(false);
    const raised = { ...g, merge: { ...g.merge, chains: g.merge.chains.map((ch, c) => (c === 0 ? { ...ch, gear: 21 } : ch)) } };
    expect(R.minderLevelBlock(cfg, raised, 0)).toBeNull();
    expect(R.levelMinder(cfg, raised, 0).merge.chains[0].minder).toBe(3);
  });

  it('openShutter: index order within a group, its printed condition, every third holds a good of the lowest-best chain', () => {
    const shut = rich({ chains: [{ c: 0, gear: 3, best: 2 }] });
    expect(R.openShutter(cfg, shut, 0)).toBe(shut); // "Grill 3" not yet made
    expect(R.openShutter(cfg, shut, 1)).toBe(shut); // "Steamer open" not yet
    let g = rich({ chains: [{ c: 0, gear: 3, best: 4 }, { c: 1, gear: 1, best: 1 }] });
    const cells = cfg.merge.board.shutterGroups[0].cells;
    for (let n = 0; n < 3; n++) {
      const ev: R.MergeEvent[] = [];
      g = R.openShutter(cfg, g, 0, ev);
      expect(ev[0]).toMatchObject({ type: 'shutterOpen', group: 0, cell: cells[n] });
      expect(g.merge.shuttersOpened[0]).toBe(n + 1);
      if (n < 2) expect(g.merge.board[cells[n]]).toBeNull();
    }
    // Shutter n = 2 holds tier b + 1 or b + 2 of the open chain with the lowest best (Tea, b = 1).
    const held = g.merge.board[cells[2]];
    expect(R.isGood(held) && held.c === 1 && (held.k === 2 || held.k === 3)).toBe(true);
    expect(g.merge.chains[1].best).toBe(R.isGood(held) ? held.k : -1);
    expect(g.cash).toBe(10_000_000 - [0, 1, 2].reduce((a, n) => a + R.roundCoins(cfg, cfg.merge.board.shutterBase * cfg.merge.board.shutterGrowth ** n), 0));
  });

  it('"Not tonight": the filled lines return as goods, refused without room (roomFor) or during the cooldown', () => {
    const g = mergeState(cfg, { clock: 100, chains: [{ c: 0, gear: 3, best: 5 }], goods: [], counters: [[[0, 3, true], [0, 4, true], [0, 5]], null] });
    const ev: R.MergeEvent[] = [];
    const x = R.notTonight(cfg, g, 0, ev);
    expect(x.merge.counters[0]).toMatchObject({ ticket: null, refillAt: 100 + cfg.merge.tickets.refillDelay, notTonightAt: 100 + cfg.merge.tickets.notTonightCooldown });
    expect(x.merge.board.filter((cell) => R.isGood(cell)).map((cell) => R.isGood(cell) && cell.k).sort()).toEqual([3, 4]);
    expect(ev).toEqual([{ type: 'notTonight', counter: 0 }]);
    expect(R.notTonightRoom(g, 0)).toEqual({ goods: 2, room: true, readyAt: 100 });
    const full = { ...g, merge: { ...g.merge, board: g.merge.board.map((cell, i) => (cell === null && i !== c(2, 0) ? ({ c: 0, k: 1 } as R.Good) : cell)) } };
    expect(R.notTonightRoom(full, 0).room).toBe(false);
    expect(R.notTonight(cfg, full, 0)).toBe(full);
    const cool = { ...g, merge: { ...g.merge, counters: g.merge.counters.map((ct, j) => (j === 0 ? { ...ct, notTonightAt: 120 } : ct)) } };
    expect(R.notTonight(cfg, cool, 0)).toBe(cool);
  });

  it('applyLantern: a counters effect appends the counter now; a shelfCap effect restarts a waiting gear', () => {
    const n1 = cfg.merge.lanterns.find((l) => l.effect.type === 'counters' && l.effect.value === 3)!.n;
    const g = mergeState(cfg, { clock: 100, chains: [{ c: 0 }], goods: [] });
    const lit = { ...g, merge: { ...g.merge, lanterns: [n1] } };
    const x = R.applyLantern(cfg, lit, n1, 100);
    expect(x.merge.counters).toHaveLength(3);
    expect(x.merge.counters[2]).toEqual({ ticket: null, refillAt: 100 + cfg.merge.tickets.refillDelay, blockedAt: null, notTonightAt: 100 });
    const n3 = cfg.merge.lanterns.find((l) => l.effect.type === 'shelfCap')!.n;
    const w = mergeState(cfg, { clock: 100, chains: [{ c: 0, shelf: [1, 1, 1, 1, 1, 1], waiting: true }], goods: [], lanterns: [n3] });
    const y = R.applyLantern(cfg, w, n3, 100);
    expect(y.merge.chains[0]).toMatchObject({ waiting: false, nextPopAt: 100 + cfg.merge.gear.interval });
    expect(R.applyLantern(cfg, g, 2, 100)).toBe(g);
  });
});
