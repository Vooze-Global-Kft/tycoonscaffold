/**
 * Budget slips, purchases and the reserve (spec 10.2 `slips`; 2.6, 2.7 "Budget slips", D16, D18): a
 * slip carries advice's purchase only when it is affordable above the reserve; on an empty desk with an
 * empty tray it also keeps back 15 s of B; up buys at the printed price, down puts it back; an arriving
 * visitor returns an undragged slip; never a day, never a counter; between two papers at most one slip
 * per decided paper; the reserve is the sign cost of the desk paper plus the next waiting one, and
 * from day C the run-up's prices; every refused purchase returns the SAME object. Frozen test content.
 *
 * The other rules package's functions are stand-ins (twists: neutral; advice: the slip the test
 * names; term and ministers: not built, so decide.ts uses its own day count and no run-up starts).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as R from '../decree';
import { built, decreeTestConfig } from '../fixtures/decree';

const mocked = vi.hoisted(() => ({ slip: null as R.Slip | null }));
vi.mock('./twists', () => {
  const neutralFactors = () => ({ mixAdd: [0, 0, 0, 0, 0, 0, 0], list: [] });
  return {
    QUIET_TERM: 'quiet_term',
    neutralFactors,
    combineFactors: (a: R.Factors, b: R.Factors) => ({ mixAdd: a.mixAdd.map((x, i) => x + (b.mixAdd[i] ?? 0)), list: [...a.list, ...b.list] }),
    factorFor: () => ({ mul: 1, add: 0, sources: [] }),
    deskFactors: neutralFactors,
    twistFactors: neutralFactors,
    twistIdsFactors: neutralFactors,
    ruleFactors: neutralFactors,
    newThingAt: () => ({ twists: [], grandProject: null, quiet: false }),
    newThingLabel: () => null,
    compositionProblems: () => [],
  };
});
vi.mock('./advice', () => ({
  advice: () => ({ goal: { kind: 'none' }, slip: mocked.slip, next: null, call: false }),
  goalLine: () => ({ kind: 'none' }),
  about: (seconds: number) => ({ value: Math.max(1, Math.round(seconds)), unit: 's' }),
  slipNeed: () => null,
  standingOrderPick: () => null,
  candidates: () => [],
  callNow: () => false,
}));
vi.mock('./term', async () => {
  const { notBuilt } = await import('./notBuilt');
  return { countDay: () => notBuilt('countDay'), checkTermEnd: () => notBuilt('checkTermEnd'), canCall: () => false };
});
vi.mock('./ministers', async () => {
  const { notBuilt } = await import('./notBuilt');
  return { nextApplication: () => null, appoint: () => notBuilt('appoint'), sendAway: () => notBuilt('sendAway'), ministerFactors: () => ({ mixAdd: [0, 0, 0, 0, 0, 0, 0], list: [] }), cabinet: () => [] };
});

const cfg = decreeTestConfig();
beforeEach(() => {
  mocked.slip = null;
});

const deskShown = (g: R.DecreeGame) => (g.decree.desk?.type === 'paper' ? g.decree.desk.shown : null);
const withSlip = (g: R.DecreeGame, slip: R.Slip): R.DecreeGame => ({ ...g, decree: { ...g.decree, desk: { type: 'slip', slip, landedAt: 0 }, emptySince: null } });

describe('the reserve (2.6, D16)', () => {
  it('is the sign cost of the desk paper plus the next waiting one (a pending paper counts as the desk paper)', () => {
    const g = built({ office: 0, ministries: [10, 7, 3, 0], cash: 1e6, desk: 'test-mayor-bus-project-1', tray: ['test-mayor-veg-committee-1', 'test-mayor-shops-project-1', 'test-mayor-bus-fee-1'] });
    const desk = R.costOf(deskShown(g)!.sign);
    const next = R.costOf(R.freezeShown(cfg, g, g.decree.tray[0], R.neutralFactors()).sign);
    expect(desk).toBeGreaterThan(0);
    expect(next).toBeGreaterThan(0);
    expect(R.reserveParts(cfg, g)).toEqual({ desk: desk + next, runUp: 0 });
    const pending = R.decide(cfg, g, 'sign', 0, []);
    expect(pending.decree.pending).not.toBeNull();
    expect(R.reserve(cfg, pending)).toBe(desk + next);
    // A fee pays: it keeps nothing back.
    const fee = built({ office: 0, ministries: [10, 7, 3, 0], desk: 'test-mayor-bus-fee-1' });
    expect(R.reserve(cfg, fee)).toBe(0);
  });

  it('from the call day C until the count also keeps back the run-up ("Kept for the run-up")', () => {
    const C = R.callFrom(cfg, built({ office: 0 }));
    expect(C).toBe(Math.ceil(0.6 * cfg.decree.offices[0].termDays));
    const before = built({ office: 0, ministries: [10, 7, 3, 0], day: C - 1 });
    expect(R.reserveParts(cfg, before).runUp).toBe(0);
    const at = built({ office: 0, ministries: [10, 7, 3, 0], day: C });
    const prices = R.runUpPrices(cfg, at);
    const B = R.decreeParams(cfg, at).B;
    expect(prices).toEqual({ campaign: Math.max(5, R.roundDibs(cfg, 45 * B)), rally: Math.max(5, R.roundDibs(cfg, 60 * B)) });
    expect(R.reserveParts(cfg, at).runUp).toBe(cfg.decree.offices[0].campaignPapers * prices.campaign + prices.rally);
    const camp = { ...at, decree: { ...at.decree, phase: 'campaign' as const, campaign: { C: [0, 0, 0, 0, 0], papersLeft: 1, rallyDone: false } } };
    expect(R.reserveParts(cfg, camp).runUp).toBe(prices.campaign + prices.rally);
    const done = { ...camp, decree: { ...camp.decree, campaign: { C: [0, 0, 0, 0, 0], papersLeft: 0, rallyDone: true } } };
    expect(R.reserveParts(cfg, done).runUp).toBe(0);
    expect(R.ledger(cfg, at).reserveRunUp).toBe(R.roundDibs(cfg, R.reserveParts(cfg, at).runUp));
  });
});

describe('purchases (2.6): one path, the reserve kept, the SAME object when refused', () => {
  it('raise buys at the live price; a purchase that cuts into the reserve, or that the treasury cannot pay, or that changes nothing is refused', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1000 });
    const price = R.levelCost(cfg, g, 1);
    const up = R.raise(cfg, g, 1, []);
    expect(up.decree.ministries[1].level).toBe(8);
    expect(up.cash).toBe(1000 - price);
    const poor = { ...g, cash: price - 1 };
    expect(R.raise(cfg, poor, 1, [])).toBe(poor);
    expect(R.canBuy(cfg, poor, { type: 'level', ministry: 1 }, null)).toBe('cash');
    const kept = built({ office: 0, ministries: [10, 7, 0, 0], cash: price + 10, desk: 'test-mayor-bus-project-1' });
    expect(R.reserve(cfg, kept)).toBeGreaterThan(10);
    expect(R.raise(cfg, kept, 1, [])).toBe(kept);
    expect(R.canBuy(cfg, kept, { type: 'level', ministry: 1 }, null)).toBe('reserve');
    expect(R.ledger(cfg, kept).rows[1].refusal).toBe('reserve');
    const cap = cfg.decree.ministry.levelCap;
    const capped = built({ office: 0, ministries: [10, cap, 0, 0], cash: 1e15 });
    expect(R.raise(cfg, capped, 1, [])).toBe(capped);
    expect(R.raise(cfg, g, 2, [])).toBe(g);
    expect(R.openMinistry(cfg, g, 1, [])).toBe(g);
    const opened = R.openMinistry(cfg, { ...g, cash: 1e6 }, 2, []);
    expect(opened.decree.ministries[2]).toEqual({ open: true, level: 1 });
    expect(opened.cash).toBe(1e6 - R.openCost(cfg, g, 2));
    expect(R.buyVanity(cfg, g, [])).toBe(g);
  });

  it('a level reaching a storey (every 12) brings its ribbon form', () => {
    const g = built({ office: 0, ministries: [11, 0, 0, 0], cash: 1e6 });
    const events: R.DecreeEvent[] = [];
    const up = R.raise(cfg, g, 0, events);
    expect(up.decree.ministries[0].level).toBe(12);
    expect(events).toContainEqual({ type: 'storey', ministry: 0, storey: 1 });
    expect(up.decree.ribbonsDue).toEqual([{ ministry: 0, storey: 1 }]);
  });
});

describe('budget slips (2.7, D16, D18)', () => {
  it("carries advice's purchase only when it is affordable above the reserve; on an empty desk and tray it also keeps back 15 s of B; never at the count", () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1000 });
    expect(R.slipFor(cfg, g)).toBeNull();
    const slip = R.slipOf(cfg, g, { type: 'level', ministry: 1 })!;
    mocked.slip = slip;
    const extra = R.roundDibs(cfg, 15 * R.decreeParams(cfg, g).B);
    expect(extra).toBeGreaterThan(0);
    expect(R.slipFor(cfg, { ...g, cash: slip.price + extra })).toEqual(slip);
    expect(R.slipFor(cfg, { ...g, cash: slip.price + extra - 1 })).toBeNull();
    // With a paper waiting the 15 s are not kept back, but the paper's cost is.
    const w = built({ office: 0, ministries: [10, 7, 0, 0], cash: slip.price, tray: ['test-mayor-bus-swap-1'] });
    expect(R.slipFor(cfg, w)).toEqual(slip);
    const wc = built({ office: 0, ministries: [10, 7, 0, 0], cash: slip.price, tray: ['test-mayor-bus-project-1'] });
    expect(R.slipFor(cfg, wc)).toBeNull();
    for (const phase of ['count', 'result'] as const) expect(R.slipFor(cfg, { ...g, cash: 1e9, decree: { ...g.decree, phase } })).toBeNull();
  });

  it('an arriving visitor returns an undragged slip', () => {
    const g0 = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6 });
    const g = withSlip(g0, R.slipOf(cfg, g0, { type: 'level', ministry: 1 })!);
    const events: R.DecreeEvent[] = [];
    const after = R.drawNext(cfg, g, 1, events);
    expect(events[0]).toEqual({ type: 'slipReturned' });
    expect(after.decree.desk?.type).toBe('paper');
    expect(after.cash).toBe(g.cash);
    expect(after.decree.ministries[1].level).toBe(7);
  });

  it('D18: after a decided paper, with a paper waiting and a purchase affordable, the slip lands first; at most one slip per decided paper', () => {
    const g0 = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6, desk: 'test-mayor-bus-swap-1', tray: ['test-mayor-shops-swap-1', 'test-mayor-veg-swap-1'] });
    mocked.slip = R.slipOf(cfg, g0, { type: 'level', ministry: 1 });
    let g = R.decide(cfg, g0, 'refuse', 1, []);
    expect(g.decree.desk?.type).toBe('slip');
    expect(g.decree.slipOffered).toBe(true);
    expect(g.decree.tray.length).toBe(2);
    // Up buys it; the waiting paper lands after it, not another slip.
    g = R.decide(cfg, g, 'sign', 2, []);
    expect(g.decree.ministries[1].level).toBe(8);
    expect(g.decree.desk?.type === 'paper' && g.decree.desk.paper.source).toBe('test-mayor-shops-swap-1');
    expect(g.decree.day).toBe(g0.decree.day + 1);
    // The next decided paper may bring one slip again; putting it back lands the paper.
    mocked.slip = R.slipOf(cfg, g, { type: 'level', ministry: 1 });
    g = R.decide(cfg, g, 'refuse', 3, []);
    expect(g.decree.desk?.type).toBe('slip');
    const cash = g.cash;
    g = R.decide(cfg, g, 'refuse', 4, []);
    expect(g.cash).toBe(cash);
    expect(g.decree.desk?.type === 'paper' && g.decree.desk.paper.source).toBe('test-mayor-veg-swap-1');
    expect(g.decree.day).toBe(g0.decree.day + 2);
    expect(g.decree.stats.decisions).toBe(g0.decree.stats.decisions + 2);
  });

  it('on an empty desk the slip waits for the 1.0 s that tick.ts counts: a commit with nothing waiting only starts the clock', () => {
    const g0 = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6, desk: 'test-mayor-bus-swap-1' });
    mocked.slip = R.slipOf(cfg, g0, { type: 'level', ministry: 1 });
    const g = R.decide(cfg, g0, 'refuse', 7, []);
    expect(g.decree.desk).toBeNull();
    expect(g.decree.emptySince).toBe(7);
  });
});
