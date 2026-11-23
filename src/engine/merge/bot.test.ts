/**
 * The merge balance bot (src/engine/merge/bot.ts): its measurements on small synthetic traces, its
 * view of the board on hand-made states, and a short real run that either plays or stops at the
 * first rule not built yet (so the file passes today and when every body lands).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeState, mergeTestConfig } from '../fixtures/merge';
import * as R from '../merge';
import * as B from './bot';

const cfg = mergeTestConfig();

/** A trace with only what a test sets. */
function tr(p: Partial<B.Trace> = {}): B.Trace {
  return { ...B.emptyTrace('active', 1, 1.5, 2.5, {}, 0), ...p };
}
const ticket = (p: Partial<B.TicketRecord>): B.TicketRecord => ({
  id: 0,
  season: 0,
  counter: 0,
  lines: [{ c: 0, k: 2 }],
  gold: false,
  scripted: false,
  drawn: 0,
  filled: null,
  shown: 10,
  maxShown: 10,
  lastShown: 10,
  paid: null,
  basket: false,
  sentOff: false,
  broken: [],
  ownReading: [],
  ...p,
});

describe('measurements over a trace', () => {
  it('quantiles interpolate like the prototype', () => {
    expect(B.median([3, 1, 2])).toBe(2);
    expect(B.quantile([0, 10], 0.9)).toBeCloseTo(9, 9);
    expect(Number.isNaN(B.median([]))).toBe(true);
  });

  it('coins by source leave out spending and away, and net an undo out of the Basket', () => {
    const t = tr({
      coins: [
        { t: 1, source: 'ticket', amount: 12 },
        { t: 2, source: 'spend', amount: -20 },
        { t: 3, source: 'basket', amount: 5 },
        { t: 4, source: 'undo', amount: -5 },
        { t: 5, source: 'away', amount: 100 },
        { t: 6, source: 'till', amount: 3 },
      ],
    });
    expect(B.coinsBySource(t)).toEqual({ ticket: 12, basket: 0, away: 100, till: 3 });
    expect(B.income(t, 0, 10)).toBe(15);
    expect(B.income(t, 0, 10, true)).toBe(115);
    expect(B.income(t, 0, 3)).toBe(12);
  });

  it('gate 1: first ticket, the gaps between paying moments, purchases', () => {
    const t = tr({
      tickets: [ticket({ filled: 8 }), ticket({ id: 1, filled: 30 })],
      purchases: [{ t: 50, kind: 'gear', c: 0, cost: 20, season: 0 }],
    });
    expect(B.firstTicketPaid(t)).toBe(8);
    const g = B.payingGaps(t, 100);
    // moments 8, 30, 50 and the end 100: gaps 8, 22, 20, 50
    expect(g.max).toBe(50);
    expect(g.median).toBe(21);
    expect(g.purchases).toBe(1);
    expect(B.firstTicketPaid(tr())).toBe(Infinity);
  });

  it('M3: useful actions per minute and the longest wait with none', () => {
    const slots = [] as { t: number; useful: boolean }[];
    for (let t = 0; t < 120; t += 1.5) slots.push({ t, useful: !(t >= 30 && t < 42) });
    const u = B.usefulPerMinute(tr({ slots }));
    expect(u.perMinute[0]).toBe(40 - 8);
    expect(u.perMinute[1]).toBe(40);
    expect(u.longestWait).toBeCloseTo(12, 9);
  });

  it('gate 3: fill times leave out gold and scripted tickets; the gear check compares n each side', () => {
    const tickets: B.TicketRecord[] = [];
    for (let i = 0; i < 6; i++) tickets.push(ticket({ id: i, drawn: i * 10, filled: i * 10 + (i < 3 ? 5 : 20) }));
    tickets.push(ticket({ id: 9, drawn: 0, filled: 100, gold: true }), ticket({ id: 10, drawn: 0, filled: 1, scripted: true }));
    const t = tr({ tickets, purchases: [{ t: 26, kind: 'gear', c: 0, cost: 1, season: 0 }] });
    expect(B.fillTimes(t, 0, 1000).sort((a, b) => a - b)).toEqual([5, 5, 5, 20, 20, 20]);
    expect(B.fillTimes(t, 0, 1000, 0, true)).toEqual([100]);
    // previous 3 fills: 5 s; next 3 drawn after 26 s: 20 s → slower than 1.3 ×
    expect(B.gearFillCheck(t, 1000, 3, 1.3)).toEqual({ bad: 1, total: 1 });
    expect(B.gearFillCheck(t, 1000, 4, 1.3)).toEqual({ bad: 0, total: 0 });
  });

  it('gates 4 and 5: board shares from the samples, cut to the window', () => {
    const s: B.Samples = { t: [0, 10, 20], dt: [10, 10, 10], f: [0, 1 | 2 | (1 << 2) | (1 << 8) | (1 << 9), 1 << (2 + 1) | (1 << 8) | (1 << 9)], n: [2, 2, 3], su: [0, 1, 0], occ: [0.2, 1, 0.5] };
    const b = B.boardShares(tr({ samples: s }), 0, 30);
    expect(b.f0).toBeCloseTo(1 / 3, 9);
    expect(b.deadlock).toBeCloseTo(1 / 3, 9);
    expect(b.setup).toBeCloseTo(10 / 70, 9);
    // chain 0 waits in the second sample, chain 1 in the third, each one of two top chains
    expect(b.waitTop2).toBeCloseTo((10 * 0.5 + 10 * 0.5) / 30, 9);
    expect(b.waitChain[0]).toBeCloseTo(1 / 3, 9);
    expect(B.boardShares(tr({ samples: s }), 15, 25).f0).toBeCloseTo(0.5, 9);
  });

  it('gate 6: gaps without something new and without a first-time tier', () => {
    expect(B.maxGap([10, 40], 0, 60)).toBe(30);
    expect(B.maxGap([], 0, 60)).toBe(60);
    const t = tr({ novelty: [{ t: 100, what: 'x' }, { t: 1700, what: 'y' }], firstTiers: [{ t: 3000, c: 0, k: 5, season: 0 }] });
    const n = B.noveltyGaps(t);
    expect(n.gap30).toBe(1600);
    expect(n.tierGapH1).toBe(3000);
    expect(n.tierGapH13).toBe(7200);
  });

  it('gate 7 and the c/s table', () => {
    const t = tr({
      t1: 10800,
      coins: [{ t: 100, source: 'ticket', amount: 100 }, { t: 3700, source: 'ticket', amount: 900 }],
      actions: [{ t: 1, what: 'merge' }, { t: 2, what: 'merge' }, { t: 3601, what: 'merge' }],
    });
    expect(B.valuePerAction(t, 3)).toEqual([50, 900, 0]);
    expect(B.coinsPerSecond(t, [1])[1]).toBeCloseTo(100 / 120, 9);
  });

  it('gate 8: shares in a window, gift share and boxes an hour (M24)', () => {
    const t = tr({
      t1: 7200,
      coins: [
        { t: 500, source: 'ticket', amount: 60 },
        { t: 550, source: 'till', amount: 30 },
        { t: 600, source: 'gift', amount: 10 },
      ],
      gifts: { earned: [100, 200, 4000], opened: [], slots: { coins: 0, good: 0, spark: 0 } },
    });
    const s = B.shareAt(t, 600);
    expect(s.ticket).toBeCloseTo(0.6, 9);
    expect(s.minder).toBeCloseTo(0.3, 9);
    expect(s.gift).toBeCloseTo(0.1, 9);
    expect(s.rate).toBeCloseTo(100 / 600, 9);
    const gs = B.giftShare(t, 10800);
    expect(gs.coinShare).toBeCloseTo(0.1, 9);
    expect(gs.boxesPerHour).toBeCloseTo(1.5, 9);
  });

  it('gate 8 (hard): unbooked cash changes are counted', () => {
    expect(B.unbookedCoins(tr({ coins: [{ t: 1, source: 'unbooked', amount: 4 }, { t: 2, source: 'ticket', amount: 1 }] }))).toEqual({ count: 1, amount: 4 });
  });

  it('gate 9: away ratios against the rate around the probe', () => {
    const t = tr({
      coins: [{ t: 1800, source: 'ticket', amount: 600 }],
      away: [{ t: 1800, late: false, seconds: 3600, earnings: 1800, cross: { ok: true, compared: [], detail: [] } }],
    });
    // 600 coins over 600 s = 1 c/s; 1 h away paid 1,800 = 0.5 of an hour of play
    expect(B.awayRatios(t)[0].ratio).toBeCloseTo(0.5, 9);
  });

  it('gate 4 (hard): bounds broken at the draw, shown ≠ paid, price fell, Basket-touched', () => {
    const h = B.honesty(
      tr({
        tickets: [
          ticket({ id: 1, broken: ['b'], filled: 5, paid: 10 }),
          ticket({ id: 2, filled: 5, paid: 11, lastShown: 10 }),
          ticket({ id: 3, broken: ['priceFell'] }),
          ticket({ id: 4, filled: 9, paid: 10, basket: true }),
        ],
      }),
    );
    expect(h).toEqual({ broken: 1, byBound: { b: 1 }, shownNotPaid: 1, priceFell: 1, basketTickets: 1, drawn: 4 });
  });

  it('gate 13: odds within ±0.5 points, or 3 standard errors on a small sample', () => {
    const good = B.oddsCheck(tr({ odds: { merges: 100000, luckies: 4000, luckyExpected: 4000, drops: 0, ripe: 0, ripeExpected: 0 } }))[0];
    expect(good.ok).toBe(true);
    const bad = B.oddsCheck(tr({ odds: { merges: 200000, luckies: 10000, luckyExpected: 8000, drops: 0, ripe: 0, ripeExpected: 0 } }))[0];
    expect(bad.ok).toBe(false);
    const small = B.oddsCheck(tr({ odds: { merges: 100, luckies: 8, luckyExpected: 4, drops: 0, ripe: 0, ripeExpected: 0 } }))[0];
    expect(small.ok).toBe(true);
  });

  it('8.5 and gate 11: the season table and the passive days', () => {
    const t = tr({
      kind: 'passive',
      sessions: [
        { day: 1, t0: 0, t1: 480 },
        { day: 2, t0: 480, t1: 960 },
        { day: 3, t0: 960, t1: 1440 },
      ],
      seasons: [{ season: 0, start: 0, stalls: [null, 60, 300, 500, 900, null], festival: 1000, closed: 1001 }],
      affordableUnbought: 144,
      sessionSeconds: 1440,
    });
    const p = B.passiveDays(t);
    expect(p).toMatchObject({ steamer: 1, sweets: 2, noodles: 2, festival: 3, seasons7: 1, seasons21: 1 });
    expect(p.affordableUnbought).toBeCloseTo(0.1, 9);
    expect(B.seasonTable(t)[0]).toMatchObject({ season: 1, festival: 1000 / 60 });
  });

  it('the across-seed aims of M3 and M25', () => {
    const rows = B.acrossSeeds([
      { seed: 1, useful: [20, 22, 22, 22, 22, 22, 22, 22, 22, 22], season1: 6000 },
      { seed: 2, useful: [20, 18, 22, 22, 22, 22, 22, 22, 22, 22], season1: 9000 },
      { seed: 3, useful: [20, 21, 22, 22, 22, 22, 22, 22, 22, 22], season1: 7000 },
    ]);
    expect(rows[0]).toMatchObject({ ok: true, value: 21 });
    expect(rows[1]).toMatchObject({ ok: true, value: 1.5 });
    expect(B.acrossSeeds([{ seed: 1, useful: [], season1: null }])[1].ok).toBe(false);
  });

  it('a trace compares as canonical text (float noise below 9 digits ignored)', () => {
    const a = tr({ t1: 1.0000000000001 });
    const b = tr({ t1: 1 });
    expect(B.canonicalTrace(a)).toBe(B.canonicalTrace(b));
    expect(B.canonicalTrace(tr({ t1: 1.001 }))).not.toBe(B.canonicalTrace(b));
  });

  it('evaluate names every gate with its kind (hard by M2, aim, report)', () => {
    const rows = B.evaluate(cfg, { seed: 1, active: tr({ t1: 600 }), states: {} });
    const hard = rows.filter((r) => r.kind === 'hard').map((r) => r.name.split(' ')[0]);
    expect(new Set(hard)).toEqual(new Set(['4', '8', '9', '13']));
    expect(rows.some((r) => r.kind === 'aim' && r.name.startsWith('2 Tea'))).toBe(true);
    for (const r of rows) expect(typeof r.ok).toBe('boolean');
  });

  it("M31: the season-1 Festival band depends on the bot's action time", () => {
    expect(B.festivalBand(2)).toEqual([110, 190]);
    expect(B.festivalBand(1.5)).toEqual([75, null]);
    expect(B.festivalBand(2.5)).toEqual([null, 280]);
    const rows = B.acrossSeeds(
      [6600, 7200, 12000].map((s1, i) => ({ seed: i, useful: Array.from({ length: 10 }, () => 25), season1: s1 })),
      2,
    );
    expect(rows.find((r) => r.name.includes('median seed, 2.0 s'))).toMatchObject({ ok: true, value: 120 });
  });

  it('M33: deadlock is an aim for every bot; gate 3 aims the hour-1 median at 5 to 25 s (M41)', () => {
    const lazy = tr({ kind: 'lazy', t1: 100, samples: { t: [0], dt: [100], f: [3], n: [2], su: [0], occ: [1] } });
    const rows = B.evaluate(cfg, { seed: 1, active: tr({ t1: 600 }), lazy, states: {} });
    expect(rows.find((r) => r.name.startsWith('5 deadlock, the lazy bot'))).toMatchObject({ kind: 'aim', ok: false });
    expect(rows.find((r) => r.name.startsWith('3 ticket fill time, hour 1: median'))?.aim).toBe('5 to 25');
  });

  it('M43: occupancy is the time-weighted median of goods over open cells in the window', () => {
    const s: B.Samples = { t: [0, 10, 20], dt: [10, 10, 30], f: [0, 0, 0], n: [2, 2, 2], su: [0, 0, 0], occ: [0.2, 0.9, 0.5] };
    expect(B.occupancy(tr({ samples: s }), 0, 50)).toBe(0.5);
    expect(B.occupancy(tr({ samples: s }), 0, 20)).toBe(0.2);
  });

  it('M41: gate 7 by thirds of season 1, null while season 1 is not filled', () => {
    expect(B.valuePerThird(tr())).toBeNull();
    const t = tr({
      seasons: [{ season: 0, start: 0, stalls: [], festival: 300, closed: 300 }],
      coins: [{ t: 50, source: 'ticket', amount: 10 }, { t: 150, source: 'ticket', amount: 40 }, { t: 250, source: 'ticket', amount: 90 }],
      actions: [{ t: 10, what: 'merge' }, { t: 110, what: 'merge' }, { t: 210, what: 'merge' }],
    });
    expect(B.valuePerThird(t)).toEqual([10, 40, 90]);
  });

  it('gate 13: the gift stream itself gives the printed slot odds over 100k draws', () => {
    const o = B.giftStreamOdds(cfg, mergeState(cfg, { chains: [{ c: 0 }, { c: 1 }] }), 100000);
    expect(o.n).toBeGreaterThanOrEqual(100000);
    expect(Math.abs(o.coins / o.n - cfg.merge.gift.odds.coins)).toBeLessThan(0.005);
    expect(Math.abs(o.spark / o.n - cfg.merge.gift.odds.spark)).toBeLessThan(0.005);
  });

  it('M50: the board is full at free cells <= gear.spare (the rules\' boardFull)', () => {
    const g = mergeState(cfg, { chains: [{ c: 0 }] });
    const filled = g.merge.board.map((c) => (c === null ? { c: 0, k: 1 } : c));
    const free = (n: number) => {
      let left = n;
      return filled.map((c) => (c !== 'shutter' && c !== 'block' && left-- > 0 ? null : c));
    };
    const c2 = { ...cfg, merge: { ...cfg.merge, gear: { ...cfg.merge.gear, spare: 2 } } } as R.MergeConfig;
    expect(B.boardFull(c2, { ...g.merge, board: free(2) })).toBe(true);
    expect(B.boardFull(c2, { ...g.merge, board: free(3) })).toBe(false);
    const c1 = { ...cfg, merge: { ...cfg.merge, gear: { ...cfg.merge.gear, spare: 1 } } } as R.MergeConfig;
    expect(B.boardFull(c1, { ...g.merge, board: free(2) })).toBe(false);
    expect(B.boardFull(c1, { ...g.merge, board: free(1) })).toBe(true);
  });

  it('a gate row carries its number and band for the tuner', () => {
    const rows = B.evaluate(cfg, { seed: 1, active: tr({ t1: 600, tickets: [ticket({ filled: 8 })] }), states: {} });
    expect(rows.find((r) => r.name.startsWith('1 first ticket'))).toMatchObject({ num: 8, lo: null, hi: 15, ok: true });
  });

  it('the away marks of gate 9: minutes 30, 60, 120 and every 2 h after', () => {
    expect(B.awayMarks(12)).toEqual([1800, 3600, 7200, 14400, 21600, 28800, 36000, 43200]);
    expect(B.awayMarks(1)).toEqual([1800, 3600]);
  });
});

describe("the bot's view of the board", () => {
  it('allocates goods highest tier first and counts the missing pops', () => {
    const cnt = Array.from({ length: 6 }, () => Array.from({ length: 9 }, () => 0));
    cnt[0][2] = 1;
    cnt[0][1] = 3;
    const al = B.allocation(cnt, [{ c: 0, k: 3 }], [1, 1, 1, 1, 1, 1]);
    // a tier 3 holds 4 basic units: the tier 2 (2 units) and two tier 1s; nothing missing
    expect(al[0].pops).toBe(0);
    expect([...al[0].alloc.entries()]).toEqual([
      [2, 1],
      [1, 2],
    ]);
    const al2 = B.allocation(cnt, [{ c: 0, k: 4 }], [2, 1, 1, 1, 1, 1]);
    // 8 units, 5 at hand, base tier 2 drops hold 2 units: 2 pops
    expect(al2[0].pops).toBe(2);
  });

  it('delivers the Festival first, then a line that completes its ticket; merges toward the nearest line; lowest pair otherwise', () => {
    const g = mergeState(cfg, {
      chains: [{ c: 0 }, { c: 1 }],
      goods: [
        [10, 0, 2],
        [11, 0, 1],
        [12, 0, 1],
        [13, 1, 1],
        [14, 1, 1],
      ],
      counters: [[[0, 2], [1, 3]], [[0, 3]]],
    });
    const v = B.boardView(g.merge);
    expect(v.cnt[0][1]).toBe(2);
    expect(B.anyMerge(v)).toBe(true);
    const d = B.chooseDelivery(g.merge, v);
    expect(d).toMatchObject({ where: 'counter', i: 0, c: 0, k: 2 });
    // the tickets need grill 2 + tea 3 and grill 3: the path merge works on the nearest ticket's line
    const pm = B.pathMerge(g.merge, v, [1, 1, 1, 1, 1, 1]);
    expect(pm).not.toBeNull();
    expect(B.lowestPair(v)).toEqual({ c: 1, k: 1 });
  });

  it("works toward the goal line's Festival good first (M31)", () => {
    const g = mergeState(cfg, {
      chains: [{ c: 0, best: 3 }, { c: 1 }],
      goods: [
        [10, 0, 1],
        [11, 0, 1],
        [13, 1, 1],
        [14, 1, 1],
      ],
      counters: [[[1, 2]], null],
    });
    const v = B.boardView(g.merge);
    const base = [1, 1, 1, 1, 1, 1];
    // the ticket wants Tea 2: without a goal the Tea pair comes first
    expect(B.pathMerge(g.merge, v, base)).toEqual({ c: 1, k: 1 });
    const grillLine = g.merge.festival.lines.findIndex((l) => l.c === 0);
    expect(grillLine).toBeGreaterThanOrEqual(0);
    expect(B.pathMerge(g.merge, v, base, grillLine)).toEqual({ c: 0, k: 1 });
  });

  it('sells an unwanted tier 8 first (M22), else the lowest-value good no line wants', () => {
    const g = mergeState(cfg, { chains: [{ c: 0, best: 8 }], goods: [[10, 0, 8], [11, 0, 1]], counters: [[[0, 2]], null] });
    const P = R.mergeParams(cfg, g);
    const pick = B.basketChoice(g.merge, B.boardView(g.merge), P.chains.map((c) => c.base), P.chains.map((c) => c.values));
    expect(pick).toEqual({ c: 0, k: 8 });
  });
});

describe('the bot plays the real rules', () => {
  it('runs a minute, or stops at the first rule not built yet with NotBuiltError', () => {
    let run: B.BotRun | null = null;
    try {
      run = B.runMergeBot(cfg, { seed: 12345, hours: 1 / 60 });
    } catch (e) {
      expect(e).toBeInstanceOf(R.NotBuiltError);
      return;
    }
    expect(run.trace.t1 - run.trace.t0).toBeCloseTo(60, 6);
    expect(B.unbookedCoins(run.trace).count).toBe(0);
    // the same seed gives the same trace
    expect(B.canonicalTrace(B.runMergeBot(cfg, { seed: 12345, hours: 1 / 60 }).trace)).toBe(B.canonicalTrace(run.trace));
  });

  it('acts only through the public interface: it imports the rules index and nothing else', () => {
    const src = fs.readFileSync(path.join(__dirname, 'bot.ts'), 'utf8');
    const imports = [...src.matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]);
    expect(imports).toEqual(['../merge']);
  });
});
