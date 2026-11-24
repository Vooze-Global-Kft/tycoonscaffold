/**
 * Budget slips, purchases and the reserve (spec 10.2 `slips`; 2.6, 2.7 "Budget slips", D16, D18): a
 * slip carries advice's purchase only when it is affordable above the reserve; on an empty desk with an
 * empty tray it also keeps back 15 s of B; up buys at the printed price, down puts it back; an arriving
 * visitor returns an undragged slip; never a day, never a counter; between two papers at most one slip
 * per decided paper; the reserve is the sign cost of the desk paper plus the next waiting one, and
 * from day C the run-up's prices; every refused purchase returns the SAME object. Frozen test content.
 *
 * Against the real modules: the slip is advice.ts's purchase (the test reads it from `advice`).
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { built, decreeTestConfig } from '../fixtures/decree';


const cfg = decreeTestConfig();

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

  it("a player's purchase commits a pending paper first; the Standing Order's (auto) waits instead", () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6, desk: 'test-mayor-bus-swap-1' });
    const signed = R.decide(cfg, g, 'sign', 0, []);
    expect(signed.decree.pending).not.toBeNull();
    expect(R.buy(cfg, signed, { type: 'level', ministry: 1 }, null, [], { auto: true })).toBe(signed);
    const mine = R.buy(cfg, signed, { type: 'level', ministry: 1 }, null, []);
    expect(mine.decree.pending).toBeNull();
    expect(mine.decree.ministries[1].level).toBe(8);
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
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 0 });
    expect(R.slipFor(cfg, g)).toBeNull();
    const extra = R.roundDibs(cfg, cfg.decree.desk.slipReserveSeconds * R.decreeParams(cfg, g).B);
    expect(extra).toBeGreaterThan(0);
    // Over a range of treasuries: a slip is exactly advice's purchase, and only with its price plus the 15 s kept back.
    let seen = 0;
    for (let cash = 0; cash < 20_000; cash += 37) {
      const s = { ...g, cash };
      const slip = R.slipFor(cfg, s);
      const a = R.advice(cfg, s).slip;
      expect(slip).toEqual(a && cash - a.price >= R.reserve(cfg, s) + extra - 1e-9 ? a : null);
      if (slip) {
        seen++;
        expect(cash - slip.price).toBeGreaterThanOrEqual(extra - 1e-9);
      }
    }
    expect(seen).toBeGreaterThan(0);
    // With a paper waiting the 15 s are not kept back, but the paper's cost is.
    const slipAt = (x: R.DecreeGame) => R.advice(cfg, { ...x, cash: 1e12 }).slip!;
    const w0 = built({ office: 0, ministries: [10, 7, 0, 0], cash: 0, tray: ['test-mayor-bus-swap-1'] });
    const ws = slipAt(w0);
    expect(R.costOf(R.freezeShown(cfg, w0, w0.decree.tray[0], R.neutralFactors()).sign)).toBe(0);
    const w = { ...w0, cash: ws.price };
    expect(R.slipFor(cfg, w)?.price).toBeLessThanOrEqual(ws.price);
    expect(R.slipFor(cfg, w)).not.toBeNull();
    const wc0 = built({ office: 0, ministries: [10, 7, 0, 0], cash: 0, tray: ['test-mayor-bus-project-1'] });
    const keep = R.reserve(cfg, wc0);
    expect(keep).toBeGreaterThan(0);
    const cheapest = Math.min(...R.candidates(cfg, wc0).map((c) => c.price));
    expect(R.slipFor(cfg, { ...wc0, cash: cheapest + keep - 1 })).toBeNull();
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
    let g = R.decide(cfg, g0, 'refuse', 1, []);
    expect(g.decree.desk?.type).toBe('slip');
    expect(g.decree.slipOffered).toBe(true);
    expect(g.decree.tray.length).toBe(2);
    // Up buys it at its printed price; the waiting paper lands after it, not another slip.
    const taken = g.decree.desk?.type === 'slip' ? g.decree.desk.slip : null;
    const before = g;
    g = R.decide(cfg, g, 'sign', 2, []);
    expect(g.cash).toBe(before.cash - taken!.price);
    if (taken!.purchase.type === 'level') expect(g.decree.ministries[taken!.purchase.ministry].level).toBe(before.decree.ministries[taken!.purchase.ministry].level + 1);
    expect(g.decree.desk?.type === 'paper' && g.decree.desk.paper.source).toBe('test-mayor-shops-swap-1');
    expect(g.decree.day).toBe(g0.decree.day + 1);
    // The next decided paper may bring one slip again; putting it back lands the paper.
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
    expect(R.advice(cfg, g0).slip).not.toBeNull();
    const g = R.decide(cfg, g0, 'refuse', 7, []);
    expect(g.decree.desk).toBeNull();
    expect(g.decree.emptySince).toBe(7);
  });
});

describe('the slip and an arrival: one rule, one switch (rules-lead)', () => {
  it('2.7 as written puts an undragged slip back; with desk.slipStays the slip stays and the visitor waits in the tray', () => {
    const stays = decreeTestConfig({ desk: { ...cfg.decree.desk, slipStays: true } });
    const g0 = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6 }, stays);
    const g = withSlip(g0, R.slipOf(stays, g0, { type: 'level', ministry: 1 })!);
    const events: R.DecreeEvent[] = [];
    const after = R.drawNext(stays, g, 1, events);
    expect(events.some((e) => e.type === 'slipReturned')).toBe(false);
    expect(after.decree.desk?.type).toBe('slip');
    expect(after.decree.tray.length).toBe(1);
    // Up still buys it; the visitor lands after it.
    const up = R.decide(stays, after, 'sign', 2, []);
    expect(up.decree.ministries[1].level).toBe(8);
    expect(up.decree.desk?.type).toBe('paper');
  });
});
