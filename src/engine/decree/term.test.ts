/**
 * The term, the call, the run-up, the count, the result and a new term (2.10, 2.17, D15, D17, D26;
 * spec 10.2 `term`): call conditions, the set-aside, campaign papers that are not days and move no
 * counter, the run-up starting by itself at day D, the halfway reset ending boycotts at 25, 2.17's
 * order. Frozen test content only (lesson 4): every number comes from the test config.
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { built, decreeFixtures, decreeTestConfig } from '../fixtures/decree';

const cfg = decreeTestConfig();
const c = cfg.decree;
const row0 = c.offices[0];
const C0 = R.callDayOf(row0);

/** Decides everything the run-up brings (refusing: "No change"), until the votes may be counted. */
function finishRunUp(g: R.DecreeGame, choice: R.Choice = 'refuse'): R.DecreeGame {
  let s = g;
  for (let k = 0; k < 40 && !R.canCount(cfg, s); k++) {
    const clock = s.stats.playSeconds;
    if (s.decree.desk) {
      let next = R.decide(cfg, s, choice, clock, []);
      if (next === s) next = R.decide(cfg, s, 'refuse', clock, []);
      s = next;
      if (s.decree.pending) s = R.commitPending(cfg, s, clock, []);
    } else s = R.advanceDecree(cfg, s, 1, 0);
  }
  return s;
}

describe('calling the election (2.10)', () => {
  it('needs day ≥ C and phase governing; refused, it returns the same object', () => {
    expect(C0).toBe(Math.ceil(row0.callFraction * row0.termDays - 1e-9));
    const early = built({ day: C0 - 1, desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.canCall(cfg, early)).toBe(false);
    expect(R.callElection(cfg, early, 0, [])).toBe(early);
    const ok = built({ day: C0, desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.canCall(cfg, ok)).toBe(true);
    expect(R.termRibbon(cfg, ok)).toMatchObject({ day: C0, termDays: row0.termDays, callFrom: C0, canCall: true, acting: false });
    const run = decreeFixtures(cfg).governorAtCall;
    expect(R.canCall(cfg, run)).toBe(false);
    expect(R.callElection(cfg, run, 0, [])).toBe(run);
  });

  it('sets the ordinary papers aside in order, keeps a grievance on top, lands the first campaign paper at once', () => {
    const g0 = built({ day: C0, moods: [50, 50, 50], desk: 'test-mayor-bus-swap-1', tray: ['test-mayor-shops-fee-1', 'test-mayor-veg-treat-1'] }, cfg);
    const ev: R.DecreeEvent[] = [];
    const x = R.callElection(cfg, g0, g0.stats.playSeconds, ev);
    expect(x.decree.phase).toBe('campaign');
    expect(x.decree.asideTray.map((p) => p.source)).toEqual(['test-mayor-bus-swap-1', 'test-mayor-shops-fee-1', 'test-mayor-veg-treat-1']);
    expect(x.decree.desk?.type === 'paper' && x.decree.desk.paper.kind).toBe('campaign');
    expect(x.decree.campaign).toEqual({ C: row0.districts.map(() => 0), papersLeft: row0.campaignPapers - 1, rallyDone: false });
    expect(x.decree.nextArrivalAt).toBe(g0.stats.playSeconds + row0.tau);
    expect(ev.map((e) => e.type)).toEqual(expect.arrayContaining(['callElection', 'runUpStarted']));
    // A grievance waiting stays on top and is decided first.
    const g1 = built({ day: C0, moods: [50, 50, 15], boycott: { club: 2, waiting: true }, desk: 'test-mayor-bus-swap-1' }, cfg);
    const withGriev = R.checkStrikes(cfg, { ...g1, decree: { ...g1.decree, strikes: [null, null, null], armed: [true, true, true] } }, []);
    expect(withGriev.decree.tray[0]?.kind).toBe('strike');
    const y = R.callElection(cfg, withGriev, withGriev.stats.playSeconds, []);
    expect(y.decree.desk?.type === 'paper' && y.decree.desk.paper.kind).toBe('strike');
    expect(y.decree.tray.map((p) => p.kind)).toEqual(['campaign']);
    expect(y.decree.asideTray.map((p) => p.source)).toEqual(['test-mayor-bus-swap-1']);
  });

  it('a pending take-back commits first; a slip on the desk goes back; a scandal running ends', () => {
    const g = built({ day: C0, desk: 'test-mayor-bus-treat-1', pending: true, scandal: { papersLeft: 4, factor: 0.8 } }, cfg);
    const ev: R.DecreeEvent[] = [];
    const x = R.callElection(cfg, g, g.stats.playSeconds, ev);
    expect(x.decree.pending).toBeNull();
    expect(x.decree.day).toBe(C0 + 1);
    expect(x.decree.scandal).toBeNull();
    expect(x.decree.phase).toBe('campaign');
    expect(ev.some((e) => e.type === 'committed')).toBe(true);
  });

  it('at day D the run-up starts by itself, after the day is counted (2.17 steps 2 and 4)', () => {
    const g = built({ day: row0.termDays - 1, desk: 'test-mayor-bus-swap-1' }, cfg);
    const ev: R.DecreeEvent[] = [];
    const x = R.decide(cfg, g, 'refuse', g.stats.playSeconds, ev);
    expect(x.decree.day).toBe(row0.termDays);
    expect(x.decree.phase).toBe('campaign');
    expect(ev.find((e) => e.type === 'runUpStarted')).toEqual({ type: 'runUpStarted', byItself: true });
    // Step 5: the first campaign paper lands.
    expect(x.decree.desk?.type === 'paper' && x.decree.desk.paper.kind).toBe('campaign');
  });

  it('no ad and no product from the call to the end of election night', () => {
    const g = built({ day: C0, desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(R.canShop(cfg, g)).toBe(true);
    const run = R.callElection(cfg, g, g.stats.playSeconds, []);
    for (const ad of ['checkSofa', 'spinDoctor', 'courier', 'openDoors', 'awayBonus'] as const) {
      expect(R.canWatchAd(cfg, run, ad)).toBe(false);
      expect(R.grantAd(cfg, run, ad, [])).toBe(run);
    }
    expect(R.canShop(cfg, run)).toBe(false);
    const night = R.countVotes(cfg, finishRunUp(run), []);
    expect(night.decree.phase).toBe('count');
    expect(R.canShop(cfg, night)).toBe(false);
    expect(R.canWatchAd(cfg, night, 'awayBonus')).toBe(false);
    const sheet = R.endElectionNight(cfg, night);
    expect(sheet.decree.phase).toBe('result');
    expect(R.canShop(cfg, sheet)).toBe(true);
  });
});

describe('the run-up (2.10)', () => {
  it('campaign papers and the rally are not days and move no counter; signing adds campaign points', () => {
    const g0 = built({ day: C0, cash: 1e6, moods: [50, 15, 50], desk: 'test-mayor-bus-swap-1', boycott: { club: 1, papersLeft: 5 }, scandal: { papersLeft: 6, factor: 0.8 }, gossip: 3 }, cfg);
    const run = R.callElection(cfg, { ...g0, decree: { ...g0.decree, scandal: null } }, g0.stats.playSeconds, []);
    const desk = run.decree.desk as Extract<R.DeskItem, { type: 'paper' }>;
    const district = desk.paper.district!;
    const signed = R.decide(cfg, run, 'sign', run.stats.playSeconds, []);
    expect(signed.decree.pending).toBeNull();
    expect(signed.decree.day).toBe(run.decree.day);
    expect(signed.decree.stats.decisions).toBe(run.decree.stats.decisions);
    expect(signed.decree.strikes[1]?.papersLeft).toBe(run.decree.strikes[1]?.papersLeft);
    expect(signed.decree.gossip).toBe(run.decree.gossip);
    expect(signed.decree.quiet).toBe(run.decree.quiet);
    expect(signed.decree.campaign!.C[district]).toBe(c.forms.campaign.points);
    expect(signed.decree.moods).toEqual(run.decree.moods);
    // The campaign paper's district: within `within` points of 50 when one is, else the closest.
    const sh = R.shares(cfg, run);
    const near = sh.map((s, d) => ({ s, d })).filter((x) => Math.abs(x.s - 5000) <= c.forms.campaign.within * 100);
    if (near.length) expect(near.map((x) => x.d)).toContain(district);
    // Refusing: "No change".
    const refused = R.decide(cfg, run, 'refuse', run.stats.playSeconds, []);
    expect(refused.decree.campaign!.C).toEqual(run.decree.campaign!.C);
    expect(refused.cash).toBe(run.cash);
  });

  it('the K campaign papers come τ apart, then the rally; the votes may be counted once all are decided', () => {
    const g = built({ day: C0, desk: 'test-mayor-bus-swap-1' }, cfg);
    let s = R.callElection(cfg, g, g.stats.playSeconds, []);
    expect(R.canCount(cfg, s)).toBe(false);
    expect(R.countVotes(cfg, s, [])).toBe(s);
    s = finishRunUp(s);
    expect(s.decree.campaign).toMatchObject({ papersLeft: 0, rallyDone: true });
    expect(R.canCount(cfg, s)).toBe(true);
  });
});

describe('the count and the result (2.10, D26)', () => {
  const runUpAt = (moods: number[], losses = 0) => finishRunUp(R.callElection(cfg, built({ day: C0, moods, losses, desk: 'test-mayor-bus-swap-1' }, cfg), 0, []));

  it('counts the poll number for number and announces safest first; a win: NR by merit, losses 0, terms served', () => {
    const s0 = runUpAt([80, 80, 80]);
    const s = { ...s0, decree: { ...s0.decree, cabinet: { pockle: { club: 'bus' as const, termsServed: 2 } } } };
    const poll = R.poll(cfg, s);
    const ev: R.DecreeEvent[] = [];
    const night = R.countVotes(cfg, s, ev);
    expect(night.decree.count!.districts.map((d) => d.share)).toEqual(poll.rows.map((r) => r.share));
    expect(night.decree.count!.order).toEqual(R.announcementOrder(poll.rows.map((r) => r.share)));
    expect(ev.filter((e) => e.type === 'envelope').map((e) => (e as { district: number }).district)).toEqual(night.decree.count!.order);
    expect(ev.at(-1)).toEqual({ type: 'majority' });
    const merit = R.meritOf(cfg, s);
    expect(night.decree.nr).toBe(s.decree.nr + R.nrFor(cfg, 0, true, merit));
    expect(night.decree.losses).toBe(0);
    expect(night.decree.cabinet.pockle.termsServed).toBe(3);
    expect(night.decree.rivalIndex).toEqual(s.decree.rivalIndex);
    const sheet = R.resultSheet(cfg, R.endElectionNight(cfg, night))!;
    expect(sheet).toMatchObject({ won: true, nrGained: R.nrFor(cfg, 0, true, merit), meritHeld: merit.held, carried: [], resignation: null });
  });

  it('a loss: NR += O, losses + 1, "Acting", the next rival stands and the old one resigns over a hobby', () => {
    const s = runUpAt([20, 20, 20]);
    const night = R.countVotes(cfg, s, []);
    expect(night.decree.count!.won).toBe(false);
    expect(night.decree.nr).toBe(s.decree.nr + row0.winWeight);
    expect(night.decree.losses).toBe(1);
    expect(night.decree.rivalIndex[0]).toBe(1);
    expect(night.decree.formerOpponents).toEqual([row0.rivals[0].id]);
    const sheet = R.resultSheet(cfg, R.endElectionNight(cfg, night))!;
    expect(sheet.won).toBe(false);
    expect(sheet.resignation).toBe(row0.rivals[0].resignation);
    expect(sheet.canMoveUp).toBe(false);
    // Only "another term here" after a loss; the ribbon says Acting.
    const result = R.endElectionNight(cfg, night);
    expect(R.chooseAfterResult(cfg, result, 'moveUp', 0, [])).toBe(result);
    const next = R.chooseAfterResult(cfg, result, 'stay', 0, []);
    expect(next.decree.term).toBe(2);
    expect(R.termRibbon(cfg, next).acting).toBe(true);
    // The poll shows the disarray: Y(1).
    expect(R.poll(cfg, next).disarray).toBe(R.disarray(1, c.paperRules.disarray));
  });

  it('D26: a win carried by disarray counts as the win, but the districts it carried earn no NR', () => {
    const m = 50 + row0.rivalPull - 1;
    const s = runUpAt([m, m, m], 1);
    const night = R.countVotes(cfg, s, []);
    expect(night.decree.count!.won).toBe(true);
    expect(night.decree.nr - s.decree.nr).toBe(row0.winWeight * c.ladder.winBase);
    expect(R.resultSheet(cfg, night)!.carried).toEqual(row0.districts.map((_, k) => k));
  });
});

describe('a new term in the seat (2.10, 2.17 "At a new term")', () => {
  it('day 0, moods halfway back to 50 (toward 50), gossip and campaign 0, the aside papers back, boycotts at 25 end, a monument and the new thing', () => {
    let s = R.callElection(cfg, built({ day: C0, moods: [90, 11, 33], gossip: 3, desk: 'test-mayor-bus-swap-1', tray: ['test-mayor-shops-fee-1'], boycott: { club: 1, papersLeft: 6 } }, cfg), 0, []);
    const aside = s.decree.asideTray.map((p) => p.id);
    s = R.endElectionNight(cfg, R.countVotes(cfg, finishRunUp(s), []));
    const ev: R.DecreeEvent[] = [];
    const x = R.chooseAfterResult(cfg, s, 'stay', 0, ev);
    const half = (m: number) => c.mood.start + Math.trunc((m - c.mood.start) / 2);
    expect(x.decree.moods).toEqual(s.decree.moods.map(half));
    expect(R.halfwayBack(cfg, 11)).toBe(31);
    expect(R.halfwayBack(cfg, 90)).toBe(70);
    expect(R.halfwayBack(cfg, 33)).toBe(42);
    expect(x.decree).toMatchObject({ day: 0, term: 2, phase: 'governing', gossip: 0, campaign: null, count: null });
    // 11 → 31 (≥ 25): the boycott ends, and the club is armed again at 30.
    expect(x.decree.strikes[1]).toBeNull();
    expect(x.decree.armed[1]).toBe(true);
    expect(ev.some((e) => e.type === 'boycottEnd')).toBe(true);
    // The aside papers come back: the first lands, the rest wait in order.
    const back = [x.decree.desk?.type === 'paper' ? x.decree.desk.paper.id : null, ...x.decree.tray.map((p) => p.id)].filter(Boolean);
    expect(back).toEqual(aside);
    expect(x.decree.monumentOffer).toBe(R.monumentFor(cfg, 0, 2, []));
    expect(x.decree.twists).toEqual(R.newThingAt(cfg, 0, 2).twists);
    expect(ev.find((e) => e.type === 'termStarted')).toMatchObject({ term: 2, office: 0 });
  });

  it('the reset lifts every club to at least 25 (2.11), so every boycott ends at a new term', () => {
    const g = built({ day: C0, moods: [50, 50, 0], desk: 'test-mayor-bus-swap-1', boycott: { club: 2, papersLeft: 6 } }, cfg);
    const s = R.endElectionNight(cfg, R.countVotes(cfg, finishRunUp(R.callElection(cfg, g, 0, [])), []));
    const x = R.chooseAfterResult(cfg, s, 'stay', 0, []);
    expect(R.halfwayBack(cfg, 0)).toBeGreaterThanOrEqual(c.boycott.endsAt);
    expect(x.decree.moods[2]).toBe(R.halfwayBack(cfg, 0));
    expect(x.decree.strikes.every((st) => st === null)).toBe(true);
  });
});
