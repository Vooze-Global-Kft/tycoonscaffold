/**
 * Time away (2.15; spec 10.2 `offline`, H4): the closed form equals event stepping at 30 s, 299 s,
 * 301 s and 4 h; the caps (4 h, Long Lunch); the clock forward, back and forward pays once (the
 * store's own guard, economy.ts clampClock, as the store runs it); the carry; the boycott and
 * "Say nothing" factors frozen as they stand; nothing but cash and the tray changes. Frozen test
 * content only (lesson 4): every number comes from the test config.
 */
import { describe, expect, it } from 'vitest';
import { clampClock, grantCash } from '../economy';
import type { GameState } from '../types';
import * as R from '../decree';
import { FIXTURE_NOW, built, decreeFixtures, decreeTestConfig } from '../fixtures/decree';

const cfg = decreeTestConfig();
const a = cfg.decree.away;
const H = 3600;

/** A state saved at FIXTURE_NOW (the wall time the absence starts). */
const saved = (g: R.DecreeGame): R.DecreeGame => ({ ...g, lastSavedAt: FIXTURE_NOW, stats: { ...g.stats, clockHigh: FIXTURE_NOW } });

/** What the store does on a resume (src/state/store.ts `resume`, the paysOnCompute seam): the clock guard, the away rules, the pay, the save time. */
function resume(g: R.DecreeGame, now: number): { g: R.DecreeGame; earnings: number } {
  let s = clampClock(cfg, g as GameState, now) as R.DecreeGame;
  const r = R.decreeOffline(cfg, s, now);
  s = r.game;
  if (r.earnings > 0) s = grantCash(s as GameState, r.earnings) as R.DecreeGame;
  return { g: { ...s, lastSavedAt: now }, earnings: r.earnings };
}

/** The fields that must not move while away (2.15 "Unchanged while away"). */
function frozenPart(g: R.DecreeGame) {
  const d = g.decree;
  return { moods: d.moods, gossip: d.gossip, quiet: d.quiet, day: d.day, phase: d.phase, decisions: d.stats.decisions, strikes: d.strikes, armed: d.armed, scandal: d.scandal, cooldowns: d.cooldowns, adsUsed: d.adsUsed, ministries: d.ministries, nr: d.nr, losses: d.losses, campaign: d.campaign, followUps: d.followUps, clock: g.stats.playSeconds, poll: R.poll(cfg, g).rows.map((r) => r.share) };
}

const states = () => {
  const f = decreeFixtures(cfg);
  return {
    mayorMidTerm: saved(f.mayorMidTerm),
    emptyDesk: saved(built({ cash: 500, clock: 64, ministries: [10, 6, 2], desk: null }, cfg)),
    someTray: saved(built({ cash: 500, clock: 64, ministries: [6, 3], desk: 'test-mayor-bus-swap-1', tray: ['test-mayor-shops-fee-1', 'test-mayor-veg-treat-1'] }, cfg)),
    boycott: saved(built({ cash: 500, clock: 64, ministries: [6, 3, 2], moods: [50, 50, 15], boycott: { club: 2, papersLeft: 5 }, desk: 'test-mayor-bus-swap-1' }, cfg)),
  };
};

describe('the closed form of 2.15', () => {
  it('earnings = roundDibs(a × I × t′) with I as it stands; papers by the away interval into free places', () => {
    for (const g of Object.values(states())) {
      for (const s of [30, 299, 301, 4 * H]) {
        const r = R.decreeOffline(cfg, g, FIXTURE_NOW + s * 1000);
        expect(r.seconds).toBe(Math.min(s, a.capHours * H));
        expect(r.earnings).toBe(R.roundDibs(cfg, a.rate * R.decreeParams(cfg, g).I * Math.min(s, a.capHours * H)));
        expect(r.earnings).toBe(R.roundDibs(cfg, R.decreeIncome(cfg, g) * r.seconds));
        const free = R.freePlaces(cfg, g);
        const n = Math.min(free, Math.floor(r.seconds / a.arrivalSeconds));
        expect(r.report?.arrived).toBe(n);
        expect(r.game.decree.tray.length + (r.game.decree.desk?.type === 'paper' ? 1 : 0)).toBe(g.decree.tray.length + (g.decree.desk?.type === 'paper' ? 1 : 0) + n);
      }
    }
  });

  it('event stepping equals the closed form at 30 s, 299 s, 301 s and 4 h (the cross-check of 10.2)', () => {
    for (const [name, g] of Object.entries(states())) {
      for (const s of [30, 299, 301, 4 * H, 361, 725, 3 * 360]) {
        const now = FIXTURE_NOW + s * 1000;
        const closed = R.decreeOffline(cfg, g, now);
        const stepped = R.awayByEvents(cfg, g, now);
        expect(stepped.earnings, `${name} ${s}`).toBe(closed.earnings);
        expect(stepped.seconds).toBe(closed.seconds);
        expect(JSON.stringify(stepped.game), `${name} ${s}`).toBe(JSON.stringify(closed.game));
      }
    }
  });

  it('caps at 4 h, and at 6 h with Long Lunch (D11); the report says it was capped', () => {
    const g = states().emptyDesk;
    const r = R.decreeOffline(cfg, g, FIXTURE_NOW + 10 * H * 1000);
    expect(r.seconds).toBe(a.capHours * H);
    expect(r.report?.capped).toBe(true);
    const lunch = { ...g, entitlements: { ...g.entitlements, products: [cfg.decree.products.longLunch] } };
    const l = R.decreeOffline(cfg, lunch, FIXTURE_NOW + 10 * H * 1000);
    expect(l.seconds).toBe((a.capHours + a.longLunchHours) * H);
    expect(l.earnings).toBeGreaterThan(r.earnings);
    expect(R.decreeOffline(cfg, g, FIXTURE_NOW + 60_000).report?.capped).toBe(false);
  });

  it('the clock forward, back and forward pays once (the store’s guard)', () => {
    const g = states().mayorMidTerm;
    const fwd = resume(g, FIXTURE_NOW + 4 * H * 1000);
    expect(fwd.earnings).toBe(R.roundDibs(cfg, R.decreeIncome(cfg, g) * 4 * H));
    const back = resume(fwd.g, FIXTURE_NOW);
    expect(back.earnings).toBe(0);
    const again = resume(back.g, FIXTURE_NOW + 4 * H * 1000);
    expect(again.earnings).toBe(0);
    // A real hour after the forward jump is paid as an hour.
    const later = resume(again.g, FIXTURE_NOW + 5 * H * 1000);
    expect(later.earnings).toBe(R.roundDibs(cfg, R.decreeIncome(cfg, again.g) * H));
    // A broken timestamp earns nothing and changes nothing.
    expect(R.decreeOffline(cfg, g, Number.NaN).game).toBe(g);
    expect(R.decreeOffline(cfg, g, FIXTURE_NOW - 1).earnings).toBe(0);
  });

  it('the carry: time limits n, the remainder is kept; a full tray keeps nothing', () => {
    const g = states().someTray;
    const r1 = R.decreeOffline(cfg, g, FIXTURE_NOW + 500_000);
    expect(r1.report?.arrived).toBe(1);
    expect(r1.game.decree.awayCarry).toBeCloseTo(500 - a.arrivalSeconds, 9);
    const g2 = { ...r1.game, lastSavedAt: FIXTURE_NOW + 500_000, stats: { ...r1.game.stats, clockHigh: FIXTURE_NOW + 500_000 } };
    const r2 = R.decreeOffline(cfg, g2, FIXTURE_NOW + 800_000);
    // 140 carried + 300 = 440: one more paper, 80 carried.
    expect(r2.report?.arrived).toBe(1);
    expect(r2.game.decree.awayCarry).toBeCloseTo(500 + 300 - 2 * a.arrivalSeconds, 9);
    // 4 h fill the free places, and nothing is banked toward an arrival there is no room for.
    const r3 = R.decreeOffline(cfg, g, FIXTURE_NOW + 4 * H * 1000);
    expect(r3.report?.arrived).toBe(R.freePlaces(cfg, g));
    expect(r3.game.decree.tray).toHaveLength(cfg.decree.desk.trayCap);
    expect(r3.game.decree.awayCarry).toBe(0);
    expect(r3.game.decree.nextArrivalAt).toBeNull();
  });

  it('the boycott and "Say nothing" factors are frozen as they stand: the income they cut stays cut, their counters do not move', () => {
    const g = states().boycott;
    const calm = saved(built({ cash: 500, clock: 64, ministries: [6, 3, 2], moods: [50, 50, 15], desk: 'test-mayor-bus-swap-1' }, cfg));
    expect(R.decreeIncome(cfg, g)).toBeLessThan(R.decreeIncome(cfg, calm));
    const r = R.decreeOffline(cfg, g, FIXTURE_NOW + H * 1000);
    expect(r.earnings).toBe(R.roundDibs(cfg, a.rate * R.decreeParams(cfg, g).I * H));
    expect(r.game.decree.strikes).toEqual(g.decree.strikes);
    const sn = saved(built({ cash: 500, clock: 64, ministries: [6, 3], scandal: { papersLeft: 7, factor: 0.8 }, desk: 'test-mayor-bus-swap-1' }, cfg));
    const quiet = saved(built({ cash: 500, clock: 64, ministries: [6, 3], desk: 'test-mayor-bus-swap-1' }, cfg));
    expect(R.decreeIncome(cfg, sn)).toBeCloseTo(0.8 * R.decreeIncome(cfg, quiet), 9);
    expect(R.decreeOffline(cfg, sn, FIXTURE_NOW + H * 1000).game.decree.scandal).toEqual(sn.decree.scandal);
  });

  it('nothing but cash and the tray changes: moods, gossip, counters, the day, the poll, cooldowns stay', () => {
    for (const g0 of Object.values(states())) {
      const g = { ...g0, decree: { ...g0.decree, cooldowns: { openDoors: 5_000 } } };
      const r = resume(g, FIXTURE_NOW + 3 * H * 1000);
      expect(frozenPart(r.g)).toEqual(frozenPart(g));
      expect(r.g.cash).toBe(g.cash + r.earnings);
    }
  });

  it('none during a run-up, the count or the result; a pending take-back commits first; the report', () => {
    const f = decreeFixtures(cfg);
    const run = saved(f.governorAtCall);
    const r = R.decreeOffline(cfg, run, FIXTURE_NOW + 2 * H * 1000);
    expect(r.report?.arrived).toBe(0);
    expect(r.game.decree.tray).toEqual(run.decree.tray);
    expect(r.earnings).toBeGreaterThan(0);
    const pend = saved(built({ cash: 500, clock: 64, ministries: [6, 3], desk: 'test-mayor-bus-treat-1', pending: true }, cfg));
    const p = R.decreeOffline(cfg, pend, FIXTURE_NOW + 600_000);
    expect(p.game.decree.pending).toBeNull();
    expect(p.game.decree.day).toBe(pend.decree.day + 1);
    expect(p.report).toMatchObject({ seconds: 600, capped: false, line: 'Test away line.' });
    expect(p.report?.waiting).toBe(p.game.decree.tray.length + (p.game.decree.desk?.type === 'paper' ? 1 : 0));
    // Two reports of one absence are one; a report with arrivals speaks alone.
    const both = R.mergeAwayReports(p.report, { seconds: 10, capped: false, earnings: 5, arrived: 1, waiting: 4, line: null }) as R.AwayReport;
    expect(both).toMatchObject({ seconds: 610, earnings: p.report!.earnings + 5, arrived: p.report!.arrived + 1, waiting: 4, line: 'Test away line.' });
    expect(R.mergeAwayReports(undefined, p.report)).toBe(p.report);
    expect(R.awayReportAlone({ ...p.report!, earnings: 0, arrived: 2 })).toBe(true);
    expect(R.awayReportAlone({ ...p.report!, earnings: 0, arrived: 0 })).toBe(false);
    expect(R.awayReportAlone(undefined)).toBe(false);
  });

  it('the arrival clock is re-phased within one τ of the play clock', () => {
    const g = { ...states().someTray, decree: { ...states().someTray.decree, nextArrivalAt: 64 + 500 } };
    const r = R.decreeOffline(cfg, g, FIXTURE_NOW + 400_000);
    expect(r.game.decree.nextArrivalAt).toBe(64 + R.decreeParams(cfg, g).tau);
  });
});
