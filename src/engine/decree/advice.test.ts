/**
 * Advice and the goal line (2.16, D16, D17; spec 10.2 `advice`): each score against a hand
 * calculation; the reserve; the record weighting; the call; the free exit or the ad in trouble;
 * "about 20 s / 2 min / 1 h", none at I = 0; never something already bought, capped or never
 * affordable. Frozen test content only (lesson 4).
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { built, decreeTestConfig } from '../fixtures/decree';

const cfg = decreeTestConfig();
const c = cfg.decree;

describe('the score of 2.16', () => {
  it('equals the hand calculation: max(0, cost − cash + reserve)/I + cost/Δincome, a level ÷ 1.5 while the record is short', () => {
    const g = built({ cash: 300, ministries: [8, 3, 1], desk: 'test-mayor-bus-swap-1' }, cfg);
    const p = R.decreeParams(cfg, g);
    const res = R.slipReserve(cfg, g, p);
    const short = R.recordShort(cfg, g, p);
    expect(short).toBe(true);
    for (const cand of R.candidates(cfg, g, p)) {
      const hand = (Math.max(0, cand.price - g.cash + res) / p.I + cand.price / cand.gain) / (cand.purchase.type === 'level' ? c.advice.recordDivisor : 1);
      expect(R.scoreOf(cfg, cand, g.cash, res, p.I, short)).toBeCloseTo(hand, 9);
      // Δincome: a level's or an opening's gain is what it adds to I.
      if (cand.purchase.type === 'level') expect(cand.gain).toBeCloseTo(R.levelGain(cfg, g, cand.purchase.ministry, p), 12);
      if (cand.purchase.type === 'open') expect(cand.gain).toBeCloseTo(R.openGain(cfg, g, cand.purchase.ministry, p), 12);
    }
    // The monument's Δincome is deltaShare × I.
    const m = { ...g, decree: { ...g.decree, monumentOffer: 'bust' } };
    const mc = R.candidates(cfg, m).find((x) => x.purchase.type === 'monument')!;
    expect(mc.gain).toBeCloseTo(c.advice.deltaShare * R.decreeParams(cfg, m).I, 12);
    expect(mc.price).toBe(R.vanityPrice(cfg, m));
    // The goal is the lowest score.
    const goal = R.advice(cfg, g).goal;
    const best = R.candidates(cfg, g, p).reduce((a, b) => (R.scoreOf(cfg, b, g.cash, res, p.I, short) < R.scoreOf(cfg, a, g.cash, res, p.I, short) ? b : a));
    expect(goal).toMatchObject({ kind: 'purchase', purchase: best.purchase, price: best.price });
  });

  it('the record weighting: with the record met a level no longer wins by its ÷ 1.5', () => {
    const recordNeeded = c.offices[1].stand!.record;
    const g = built({ cash: 0, ministries: [recordNeeded, 1], desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.recordShort(cfg, g)).toBe(false);
    const p = R.decreeParams(cfg, g);
    for (const cand of R.candidates(cfg, g, p)) expect(R.scoreOf(cfg, cand, 0, 0, p.I, false)).toBeCloseTo(Math.max(0, cand.price) / p.I + cand.price / cand.gain, 9);
  });

  it('the reserve: a slip only above "Kept for the desk"; an empty desk also keeps back slipReserveSeconds of B (D16)', () => {
    const g = built({ cash: 1_000, ministries: [8, 3], desk: 'test-mayor-bus-project-1' }, cfg);
    const keep = R.reserve(cfg, g);
    expect(keep).toBeGreaterThan(0);
    expect(R.slipReserve(cfg, g)).toBe(keep);
    const s = R.advice(cfg, g).slip;
    if (s) expect(g.cash - s.price).toBeGreaterThanOrEqual(keep);
    const poor = { ...g, cash: keep };
    expect(R.advice(cfg, poor).slip).toBeNull();
    expect(R.advice(cfg, poor).next).not.toBeNull();
    const empty = built({ cash: 1_000, ministries: [8, 3], desk: null }, cfg);
    expect(R.slipReserve(cfg, empty)).toBe(R.roundDibs(cfg, c.desk.slipReserveSeconds * R.decreeParams(cfg, empty).B));
    // slipNeed is exactly where a slip becomes possible (the tick lands it then).
    const need = R.slipNeed(cfg, empty)!;
    expect(R.advice(cfg, { ...empty, cash: need }).slip).not.toBeNull();
    expect(R.advice(cfg, { ...empty, cash: need - 1e-6 }).slip).toBeNull();
  });

  it('never advises what is bought, capped or closed for good; at I = 0 no "about"', () => {
    const cap = c.ministry.levelCap;
    const g = built({ cash: 1e12, ministries: [cap, cap, cap, cap], desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.candidates(cfg, g)).toEqual([]);
    expect(R.advice(cfg, g).goal.kind).toBe('none');
    const bought = { ...g, decree: { ...g.decree, vanity: ['bust'], monumentOffer: 'bust' } };
    expect(R.candidates(cfg, bought)).toEqual([]);
    expect(R.slipNeed(cfg, g)).toBeNull();
    // Every candidate is a real purchase now: a finite price, something it adds.
    const h = built({ cash: 10, ministries: [3, 1], desk: 'test-mayor-bus-swap-1' }, cfg);
    for (const x of R.candidates(cfg, h)) {
      expect(Number.isFinite(x.price)).toBe(true);
      expect(x.gain).toBeGreaterThan(0);
    }
    const zero = { ...h, decree: { ...h.decree, scandal: { papersLeft: 3, factor: 0 } } };
    const goal = R.advice(cfg, zero).goal;
    if (goal.kind === 'purchase') expect(goal.about).toBeNull();
  });
});

describe('the goal line (2.16)', () => {
  it('"about 20 s / 2 min / 1 h"', () => {
    expect(R.about(20)).toEqual({ value: 20, unit: 's' });
    expect(R.about(0.4)).toEqual({ value: 1, unit: 's' });
    expect(R.about(119)).toEqual({ value: 2, unit: 'min' });
    expect(R.about(3600)).toEqual({ value: 1, unit: 'h' });
    expect(R.about(5 * 3600 + 100)).toEqual({ value: 5, unit: 'h' });
  });

  it('offers the call on the first allowed day with a majority (D17); in a boycott the free exit or the ad', () => {
    const C = R.callDayOf(c.offices[0]);
    const g = built({ day: C, moods: [80, 80, 80], desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.advice(cfg, g)).toMatchObject({ call: true, goal: { kind: 'call', of: c.offices[0].districts.length } });
    expect(R.advice(cfg, built({ day: C - 1, moods: [80, 80, 80], desk: 'test-mayor-bus-swap-1' }, cfg)).call).toBe(false);
    expect(R.advice(cfg, built({ day: C, moods: [20, 20, 20], desk: 'test-mayor-bus-swap-1' }, cfg)).call).toBe(false);
    const b = built({ moods: [50, 50, 15], boycott: { club: 2 }, desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.advice(cfg, b).goal).toEqual({ kind: 'ad', ad: 'courier' });
    const used = { ...b, decree: { ...b.decree, phase: 'campaign' as const } };
    expect(R.advice(cfg, used).goal).toEqual({ kind: 'settle', club: 2 });
    const sc = built({ scandal: { papersLeft: 5, factor: 0.8 }, desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.advice(cfg, sc).goal).toEqual({ kind: 'ad', ad: 'spinDoctor' });
    expect(R.goalLine(cfg, sc)).toEqual(R.advice(cfg, sc).goal);
  });

  it('the Standing Order buys the advised level at 3 × its price plus the reserve, never while away', () => {
    const g0 = built({ office: 1, term: c.standingOrder.fromGovernorTerm, cash: 0, ministries: [5, 3], desk: 'test-governor-bus-swap-1' }, cfg);
    const g = R.setStandingOrder(cfg, g0, true);
    expect(g.decree.standingOrder).toBe(true);
    expect(R.setStandingOrder(cfg, built({ cash: 0 }, cfg), true).decree.standingOrder).toBe(false);
    const pick = R.standingOrderPick(cfg, g)!;
    const need = c.standingOrder.times * pick.price + R.reserveNow(cfg, g);
    const I = R.decreeParams(cfg, g).I;
    const far = { ...g, decree: { ...g.decree, nextArrivalAt: 1e9 } };
    const before = R.advanceDecree(cfg, far, need / I * 0.99, 0);
    expect(before.decree.ministries).toEqual(g.decree.ministries);
    const after = R.advanceDecree(cfg, far, need / I * 1.01, 0);
    expect(after.decree.ministries[(pick.purchase as { ministry: number }).ministry].level).toBe(g.decree.ministries[(pick.purchase as { ministry: number }).ministry].level + 1);
    // Away: the closed form never buys.
    const away = R.decreeOffline(cfg, { ...far, cash: need * 10, lastSavedAt: 0, stats: { ...far.stats, clockHigh: 0 } }, 3_600_000);
    expect(away.game.decree.ministries).toEqual(g.decree.ministries);
    // With "Junior Clerk on Duty" (D11) it is there from the first day.
    const owned = { ...built({ cash: 0 }, cfg), entitlements: { ...g.entitlements, products: [c.products.standingOrder] } };
    expect(R.standingOrderAvailable(cfg, owned)).toBe(true);
  });
});
