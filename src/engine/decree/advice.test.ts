/**
 * Advice and the goal line (2.16, D16, D17; spec 10.2 `advice`): each score against a hand
 * calculation; the reserve; the record weighting; the call; the free exit or the ad in trouble;
 * "about 20 s / 2 min / 1 h", none at I = 0; never something already bought, capped or never
 * affordable. Frozen test content only (lesson 4).
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { built, decreeTestConfig, freshState } from '../fixtures/decree';

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
    // D36: a monument on offer is never a candidate (advice, its slips and the goal line never name one).
    const m = { ...g, decree: { ...g.decree, monumentOffer: 'bust' } };
    expect(R.candidates(cfg, m).some((x) => x.purchase.type === 'monument')).toBe(false);
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

  it('D36: never names a monument, however rich the treasury and however cheap the monument', () => {
    const cap = c.ministry.levelCap;
    const g = built({ cash: 1e15, ministries: [cap, cap, cap, cap], desk: null }, cfg);
    const offered = { ...g, decree: { ...g.decree, monumentOffer: 'bust', vanity: [] } };
    const a = R.advice(cfg, offered);
    expect(a.slip).toBeNull();
    expect(a.next).toBeNull();
    expect(a.goal.kind).toBe('none');
    expect(R.goalLine(cfg, offered).kind).toBe('none');
    expect(R.slipNeed(cfg, offered)).toBeNull();
    expect(R.slipFor(cfg, offered)).toBeNull();
    // The monument is still bought from the result flow (buyVanity), at its own price.
    const ev: R.DecreeEvent[] = [];
    const bought = R.buyVanity(cfg, offered, ev);
    expect(bought.decree.vanity).toEqual(['bust']);
    expect(offered.cash - bought.cash).toBe(R.vanityPrice(cfg, offered));
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
    // D39: the free way out first, the ad second.
    expect(R.advice(cfg, b).goal).toEqual({ kind: 'ad', ad: 'courier', free: { kind: 'settle', club: 2 } });
    const used = { ...b, decree: { ...b.decree, phase: 'campaign' as const } };
    expect(R.advice(cfg, used).goal).toEqual({ kind: 'settle', club: 2 });
    const sc = built({ scandal: { papersLeft: 5, factor: 0.8 }, desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.advice(cfg, sc).goal).toEqual({ kind: 'ad', ad: 'spinDoctor', free: { kind: 'sayNothing', papersLeft: sc.decree.scandal!.papersLeft } });
    expect(R.goalLine(cfg, sc)).toEqual(R.advice(cfg, sc).goal);
  });

  it('the Standing Order buys the advised level at 3 × its price plus the reserve, never while away', () => {
    const g0 = built({ office: 1, term: c.standingOrder.fromGovernorTerm, cash: 0, ministries: [5, 3], desk: 'test-governor-bus-swap-1' }, cfg);
    const g = R.setStandingOrder(cfg, g0, true);
    expect(g.decree.standingOrder).toBe(true);
    expect(R.setStandingOrder(cfg, built({ cash: 0 }, cfg), true).decree.standingOrder).toBe(false);
    const pick = R.standingOrderPick(cfg, g)!;
    const need = c.standingOrder.times * pick.price + R.standingOrderReserve(cfg, g);
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

  it('D33: the Standing Order keeps back the sign cost of the desk paper and of EVERY waiting paper; the Ledger shows that sum while it is on', () => {
    const tray = ['test-governor-bus-project-1', 'test-governor-shops-project-1', 'test-governor-veg-project-1', 'test-governor-brass-project-1'];
    const g0 = built({ office: 1, term: c.standingOrder.fromGovernorTerm, cash: 0, ministries: [5, 3], desk: 'test-governor-bus-project-2', tray }, cfg);
    const two = R.reserve(cfg, g0);
    const every = R.standingOrderReserve(cfg, g0);
    const costs = g0.decree.tray.map((p) => R.costOf(R.freezeShown(cfg, g0, p, R.deskFactors(cfg, g0)).sign));
    const deskCost = R.costOf(g0.decree.desk!.type === 'paper' ? g0.decree.desk!.shown.sign : []);
    expect(two).toBe(deskCost + costs[0]);
    expect(every).toBe(deskCost + costs.reduce((a, b) => a + b, 0));
    expect(every).toBeGreaterThan(two);
    // Cash enough for 3 × the price above the two-paper reserve, not above every paper: no purchase.
    const g = R.setStandingOrder(cfg, g0, true);
    const pick = R.standingOrderPick(cfg, g)!;
    const between = { ...g, cash: c.standingOrder.times * pick.price + (two + every) / 2 };
    expect(R.standingOrderStep(cfg, between, [])).toBe(between);
    const enough = { ...g, cash: c.standingOrder.times * pick.price + every + 1 };
    expect(R.standingOrderStep(cfg, enough, [])).not.toBe(enough);
    // The Ledger: "Kept for the desk" is the Standing Order's sum while it is on, the 2.6 reserve otherwise.
    expect(R.ledger(cfg, g).reserve).toBe(R.roundDibs(cfg, every));
    expect(R.ledger(cfg, g0).reserve).toBe(R.roundDibs(cfg, two));
  });
});

describe('the grants of 5.11 (play-clock cooldowns, per-term limits)', () => {
  it('Check the Sofa: +checkSofaSeconds of B once a term, booked as its own source', () => {
    const g = built({ cash: 0, ministries: [6, 3], desk: 'test-mayor-bus-swap-1' }, cfg);
    const promised = R.sofaAmount(cfg, g);
    const x = R.grantAd(cfg, g, 'checkSofa', []);
    expect(x.cash).toBe(R.roundDibs(cfg, c.ads.checkSofaSeconds * R.decreeParams(cfg, g).B));
    // The amount the card prints before the video is the one paid.
    expect(x.cash - g.cash).toBe(promised);
    expect(x.decree.stats.book.checkSofa).toBe(x.cash);
    expect(R.canWatchAd(cfg, x, 'checkSofa')).toBe(false);
    expect(R.grantAd(cfg, x, 'checkSofa', [])).toBe(x);
  });

  it('Open the Doors fills the in-tray now, then waits its play-clock cooldown', () => {
    const g = built({ cash: 0, clock: 100, ministries: [6, 3], desk: 'test-mayor-bus-swap-1' }, cfg);
    const x = R.grantAd(cfg, g, 'openDoors', []);
    expect(x.decree.tray).toHaveLength(c.desk.trayCap);
    expect(x.decree.cooldowns.openDoors).toBe(100 + c.ads.openDoorsCooldown);
    expect(R.canWatchAd(cfg, x, 'openDoors')).toBe(false);
    expect(R.adCooldownLeft(cfg, g, 'openDoors')).toBe(0);
    expect(R.adCooldownLeft(cfg, x, 'openDoors')).toBe(c.ads.openDoorsCooldown);
    expect(R.adCooldownLeft(cfg, { ...x, stats: { ...x.stats, playSeconds: 160 } }, 'openDoors')).toBe(c.ads.openDoorsCooldown - 60);
    const later = { ...x, decree: { ...x.decree, tray: [] }, stats: { ...x.stats, playSeconds: 100 + c.ads.openDoorsCooldown } };
    expect(R.canWatchAd(cfg, later, 'openDoors')).toBe(true);
  });

  it('the Courier ends a boycott and the Spin Doctor "Say nothing", with no mood change; neither without its trouble', () => {
    const b = built({ moods: [50, 50, 15], boycott: { club: 2 }, desk: 'test-mayor-bus-swap-1' }, cfg);
    const x = R.grantAd(cfg, b, 'courier', []);
    expect(x.decree.strikes[2]).toBeNull();
    expect(x.decree.moods).toEqual(b.decree.moods);
    const calm = built({ desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.grantAd(cfg, calm, 'courier', [])).toBe(calm);
    expect(R.grantAd(cfg, calm, 'spinDoctor', [])).toBe(calm);
    const sc = built({ gossip: 4, scandal: { papersLeft: 5, factor: 0.8 }, desk: 'test-mayor-bus-swap-1' }, cfg);
    const y = R.grantAd(cfg, sc, 'spinDoctor', []);
    expect(y.decree.scandal).toBeNull();
    expect(y.decree.gossip).toBe(0);
    expect(y.decree.moods).toEqual(sc.decree.moods);
  });

  it('products: Long Lunch lengthens the away cap, the cosmetics are flags; none touches a mood, the poll or the count', () => {
    const g = built({ desk: 'test-mayor-bus-swap-1' }, cfg);
    const all = { ...g, entitlements: { ...g.entitlements, products: Object.values(c.products) } };
    expect(R.cosmetics(cfg, all)).toEqual({ walnutDesk: true, portraitFrames: true });
    expect(R.cosmetics(cfg, g)).toEqual({ walnutDesk: false, portraitFrames: false });
    expect(R.awayCap(cfg, all)).toBe((c.away.capHours + c.away.longLunchHours) * 3600);
    expect(R.poll(cfg, all)).toEqual(R.poll(cfg, g));
    expect(R.decreeParams(cfg, all)).toEqual(R.decreeParams(cfg, g));
    for (const id of Object.values(c.products)) expect(R.entitleDecree(cfg, g, id)).toBe(g);
  });
});

describe("the pen's hints (3.1)", () => {
  it('paper 1 down to the drawer, paper 2 up to the out-tray, the first slip; nothing after', () => {
    const g = freshState(cfg);
    expect(R.hintsFor(cfg, g)).toEqual(['paper', 'drawer']);
    const after1 = R.decide(cfg, g, 'refuse', 0, []);
    const desk = after1.decree.desk;
    if (desk?.type === 'paper' && desk.paper.kind === 'scripted') expect(R.hintsFor(cfg, after1)).toEqual(['paper', 'outTray']);
    const slip = built({ cash: 5_000, ministries: [5, 2], desk: null }, cfg);
    const s = R.advanceDecree(cfg, slip, 2, 0);
    expect(s.decree.desk?.type).toBe('slip');
    expect(R.hintsFor(cfg, { ...s, decree: { ...s.decree, office: 0, term: 1 } })).toEqual(['slip']);
    const taken = R.decide(cfg, s, 'sign', s.stats.playSeconds, []);
    expect(R.hintsFor(cfg, taken)).toEqual([]);
    expect(R.hintsFor(cfg, built({ office: 1, desk: 'test-governor-bus-swap-1' }, cfg))).toEqual([]);
  });
});

describe('the Standing Order and the take-back window (2.7, 5.10)', () => {
  it('Cuthbert Wimble never ends the 2 s: he waits until the pending paper commits', () => {
    const g0 = built({ office: 1, term: c.standingOrder.fromGovernorTerm, cash: 1e9, ministries: [5, 3], desk: 'test-governor-bus-treat-1', pending: true }, cfg);
    const g = R.setStandingOrder(cfg, g0, true);
    expect(R.standingOrderStep(cfg, g, [])).toBe(g);
    const until = g.decree.pending!.until;
    const mid = R.advanceDecree(cfg, g, (until - g.stats.playSeconds) / 2, 0);
    expect(mid.decree.pending).not.toBeNull();
    expect(mid.decree.ministries).toEqual(g.decree.ministries);
    const after = R.advanceDecree(cfg, g, until - g.stats.playSeconds + 0.5, 0);
    expect(after.decree.pending).toBeNull();
    expect(after.decree.ministries.reduce((s, m) => s + m.level, 0)).toBeGreaterThan(g.decree.ministries.reduce((s, m) => s + m.level, 0));
  });
});
