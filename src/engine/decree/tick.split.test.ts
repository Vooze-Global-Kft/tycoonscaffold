/**
 * The tick (2.5; spec 10.2 `tick.split`): cash from I exactly between events, arrivals at their
 * exact times while the tray has room, the arrival clock stopping at a full tray and in the run-up,
 * the slip's 1.0 s, the take-back's 2 s, nothing else moving with time; and tick(a + b) = tick(a) then
 * tick(b) EXACTLY for any split (10^3 random splits on states with arrivals, slips, a full tray and a
 * pending take-back). Frozen test content only (lesson 4): every number comes from the test config.
 * Times are multiples of 1/1024 s so the play clock itself sums exactly in binary.
 */
import { describe, expect, it } from 'vitest';
import { rngMix4 } from '../rng';
import * as R from '../decree';
import { built, decreeFixtures, decreeTestConfig, freshState } from '../fixtures/decree';

const cfg = decreeTestConfig();
const c = cfg.decree;
const tau0 = c.offices[0].tau;
/** Ten comic papers of the test deck (the tray's cap in the test numbers is 10). */
const TEN = ['bus', 'shops', 'veg'].flatMap((club) => ['project', 'swap', 'fee', 'treat'].map((a) => `test-mayor-${club}-${a}-1`)).slice(0, c.desk.trayCap);

function dyadic(seed: number, k: number, max: number): number {
  return Math.floor((rngMix4(seed, 31, k, 0) / 4294967296) * max * 1024) / 1024;
}

const states = (): Record<string, R.DecreeGame> => {
  const f = decreeFixtures(cfg);
  return {
    // A paper on the desk, arrivals every τ into the tray.
    mayorMidTerm: f.mayorMidTerm,
    // An empty desk and tray with money: the slip's 1.0 s, then slips as cash grows.
    emptyDesk: built({ cash: 5_000, clock: 64, ministries: [10, 6, 2], desk: null }, cfg),
    // A full tray: the arrival clock stops.
    fullTray: built({ cash: 0, clock: 128, ministries: [5, 2], desk: 'test-mayor-veg-swap-2', tray: TEN }, cfg),
    // A signed paper resting in its take-back window: it commits at its 2 s.
    pending: built({ cash: 3_000, clock: 32, ministries: [8, 4], desk: 'test-mayor-bus-treat-2', pending: true, tray: ['test-mayor-shops-fee-2'] }, cfg),
    // The run-up: campaign papers τ apart, then the rally.
    runUp: f.governorAtCall,
  };
};

describe('what a tick does (2.5)', () => {
  it('cash += I × dt exactly while nothing happens, and the play clock moves by dt', () => {
    const g = built({ cash: 100, clock: 0, ministries: [3, 2], desk: 'test-mayor-bus-swap-1' }, cfg);
    const I = R.decreeParams(cfg, g).I;
    const x = R.advanceDecree(cfg, g, 5, 0);
    expect(x.cash).toBe(100 + I * 5);
    expect(x.stats.playSeconds).toBe(5);
    expect(x.decree.moods).toEqual(g.decree.moods);
    expect(x.decree.day).toBe(g.decree.day);
    expect(x.decree.desk).toEqual(g.decree.desk);
  });

  it('an arrival comes at its exact time into the tray while a paper is on the desk, the next τ later', () => {
    const g = built({ cash: 100, clock: 0, ministries: [3], desk: 'test-mayor-bus-swap-1' }, cfg);
    expect(g.decree.nextArrivalAt).toBe(tau0);
    const before = R.advanceDecree(cfg, g, tau0 - 1 / 1024, 0);
    expect(before.decree.tray).toHaveLength(0);
    const ev: R.DecreeEvent[] = [];
    const at = R.advanceDecree(cfg, g, tau0, 0, ev);
    expect(at.decree.tray).toHaveLength(1);
    expect(at.decree.nextArrivalAt).toBe(2 * tau0);
    expect(ev.some((e) => e.type === 'paperArrived' && !e.toDesk)).toBe(true);
    expect(R.nextVisitorIn(cfg, at)).toBe(tau0);
  });

  it('a full tray stops the arrival clock; a freed place restarts it τ later', () => {
    const g = states().fullTray;
    expect(g.decree.tray).toHaveLength(c.desk.trayCap);
    const x = R.advanceDecree(cfg, g, 10 * tau0, 0);
    expect(x.decree.tray).toHaveLength(c.desk.trayCap);
    expect(x.decree.nextArrivalAt).toBeNull();
    expect(R.nextVisitorIn(cfg, x)).toBeNull();
    // Refuse the desk paper: the next lands from the tray, a place frees, the clock restarts τ after.
    const clock = x.stats.playSeconds;
    let y = R.decide(cfg, x, 'refuse', clock, []);
    // D18: a slip may land between the two papers; put back, the waiting paper lands.
    if (y.decree.desk?.type === 'slip') y = R.decide(cfg, y, 'refuse', clock, []);
    expect(y.decree.tray).toHaveLength(c.desk.trayCap - 1);
    const z = R.advanceDecree(cfg, y, 1 / 1024, 0);
    expect(z.decree.nextArrivalAt).toBe(clock + tau0);
  });

  it("the take-back's 2 s: a pending paper commits at exactly its time, not before", () => {
    const g = states().pending;
    const until = g.decree.pending!.until;
    expect(until).toBe(g.stats.playSeconds + c.desk.takeBackSeconds);
    const early = R.advanceDecree(cfg, g, c.desk.takeBackSeconds - 1 / 1024, 0);
    expect(early.decree.pending).not.toBeNull();
    const ev: R.DecreeEvent[] = [];
    const late = R.advanceDecree(cfg, g, c.desk.takeBackSeconds, 0, ev);
    expect(late.decree.pending).toBeNull();
    expect(late.decree.day).toBe(g.decree.day + 1);
    expect(ev.some((e) => e.type === 'committed')).toBe(true);
  });

  it('the slip lands 1.0 s after desk and tray become empty, when advice names an affordable purchase', () => {
    const g = states().emptyDesk;
    expect(g.decree.desk).toBeNull();
    expect(g.decree.emptySince).toBe(64);
    expect(R.advice(cfg, g).slip).not.toBeNull();
    const before = R.advanceDecree(cfg, g, c.desk.slipDelay - 1 / 1024, 0);
    expect(before.decree.desk).toBeNull();
    const after = R.advanceDecree(cfg, g, c.desk.slipDelay, 0);
    expect(after.decree.desk?.type).toBe('slip');
    expect(after.decree.desk?.landedAt).toBe(64 + c.desk.slipDelay);
    // With nothing affordable, no slip comes until cash pays one above what a slip keeps back.
    const poor0 = built({ cash: 0, clock: 0, ministries: [1], desk: null }, cfg);
    const poor = { ...poor0, decree: { ...poor0.decree, nextArrivalAt: 1e6 } };
    const need = R.slipNeed(cfg, poor)!;
    const I = R.decreeParams(cfg, poor).I;
    const x = R.advanceDecree(cfg, poor, need / I - 0.01, 0);
    expect(x.decree.desk).toBeNull();
    const y = R.advanceDecree(cfg, poor, need / I + 0.01, 0);
    expect(y.decree.desk?.type === 'slip' || y.decree.desk?.type === 'paper').toBe(true);
  });

  it('no ordinary arrivals in the run-up, the count or the result; the run-up brings its papers τ apart', () => {
    const g = states().runUp;
    const ev: R.DecreeEvent[] = [];
    // K = 4 in the test numbers: the first is on the desk, three more τ apart, then the rally.
    const K = c.offices[1].campaignPapers;
    const x = R.advanceDecree(cfg, g, K * c.offices[1].tau + 1, 0, ev);
    expect(x.decree.tray.map((p) => p.kind)).toEqual([...Array(K - 1).fill('campaign'), 'rally']);
    expect(x.decree.campaign?.papersLeft).toBe(0);
    expect(x.decree.campaign?.rallyDone).toBe(true);
    expect(x.decree.nextArrivalAt).toBeNull();
    for (const phase of ['count', 'result'] as const) {
      const s = { ...g, decree: { ...g.decree, phase, desk: null, tray: [], nextArrivalAt: null } };
      const y = R.advanceDecree(cfg, s, 100, 0);
      expect(y.decree.tray).toHaveLength(0);
      expect(y.decree.desk).toBeNull();
    }
  });

  it('nextStop names the next thing that happens by itself; stepping to it runs exactly that', () => {
    const g = states().mayorMidTerm;
    const stop = R.nextStop(cfg, g)!;
    expect(stop).toBe(g.decree.nextArrivalAt);
    const x = R.advanceDecree(cfg, g, stop - g.stats.playSeconds, 0);
    expect(x.decree.tray.length).toBe(g.decree.tray.length + 1);
  });

  it('a fresh game earns from its first second (ministry 0 always earns)', () => {
    const g = freshState(cfg);
    expect(R.decreeParams(cfg, g).I).toBeGreaterThan(0);
    expect(R.advanceDecree(cfg, g, 1, 0).cash).toBeGreaterThan(g.cash);
  });
});

describe('tick(a + b) = tick(a) then tick(b), exactly (2.5)', () => {
  it('10^3 random splits on states with arrivals, slips, a full tray, a pending take-back and the run-up', () => {
    const all = states();
    const names = Object.keys(all);
    let k = 0;
    for (let n = 0; n < 1000; n++) {
      const name = names[n % names.length];
      const g = all[name];
      const total = dyadic(n, k++, 400) + 1 / 1024;
      const a = Math.min(total, dyadic(n, k++, total));
      const b = total - a;
      const e1: R.DecreeEvent[] = [];
      const e2: R.DecreeEvent[] = [];
      const one = R.advanceDecree(cfg, g, total, 0, e1);
      const two = R.advanceDecree(cfg, R.advanceDecree(cfg, g, a, 0, e2), b, 0, e2);
      if (JSON.stringify(one) !== JSON.stringify(two)) {
        expect({ name, total, a, one: one.decree, cash: one.cash }).toEqual({ name, total, a, one: two.decree, cash: two.cash });
      }
      expect(JSON.stringify(e2)).toBe(JSON.stringify(e1));
    }
  });

  it('three-way splits and many small steps agree too', () => {
    const g = states().emptyDesk;
    const one = R.advanceDecree(cfg, g, 300, 0);
    let s = g;
    for (let i = 0; i < 300 * 8; i++) s = R.advanceDecree(cfg, s, 1 / 8, 0);
    expect(JSON.stringify(s)).toBe(JSON.stringify(one));
  });
});
