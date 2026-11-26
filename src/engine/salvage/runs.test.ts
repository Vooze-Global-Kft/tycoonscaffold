/**
 * engine2-fixA (stage 2, 2.1; RULING2.md 14.1 to 14.3): THE RUN IS THE RULE, in the boss's sight and out
 * of it. From rung group.fromRung a crew member's work is a run (a kind, a place, a destination, a start
 * t0, kept on him as `course`): in sight he makes it trip by trip (ordinary trips, claims for the trip under
 * way only), out of sight the rest is planned ahead. On the frozen test content (no tuned number pinned:
 * the run limits here are the tests' own). What is proved:
 *  (a) a member in sight for a whole run makes trips of one kind until the limit, then chooses by the first
 *      yard's order (a full out tray waits for the run's end: how long, measured);
 *  (b) in sight against out of sight from the same state: the same run, the same trips of the same kind;
 *  (c) a run that goes out of sight plans only the rest (to t0 + the limit);
 *  (d) an opened run goes on with its kind;
 *  (e) a tick equals a jump with the boss walking in and out of sight of runs (whole state);
 *  (f) a save in the middle of an in-sight run reloads and goes on; an old save loads; a broken run's
 *      record is dropped;
 *  (g) the boss can pick up any piece not claimed by a trip under way while hands work in runs beside him;
 *  14.3: the merchant's round is away merchant.round_s in every presence state, and an absence of 61 s
 *      after one of 59 s pays more than nothing (finding 6).
 * Owner: engine2-fixA.
 */
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { FIXTURE_NOW, SALVAGE_TEST } from '../fixtures/salvage';
import gate5 from '../fixtures/salvage-gate5.json';
import * as R from '../salvage';
import { awayPass } from './away';
import { hireCheck } from './ladder';
import { piecePos, pointOf } from './positions';
import { reconcileSalvage } from './save';
import type { GroundPiece, SalvageConfig, SalvageEvent, SalvageGame } from './types';

const C = SALVAGE_TEST;
type Group = Record<string, number | boolean>;
/** The tests' run limits (a hand's run of 60 s holds about five trips from the floor to the scale here). */
const RUNS: Group = { fromRung: 1, handRun_s: 60, cutRun_s: 120, ahead: true };
const cfgOf = (group: Group = {}, more: Record<string, unknown> = {}): SalvageConfig =>
  ({ mode: 'salvage', salvage: { ...C, group: { ...RUNS, ...group }, ...more } }) as unknown as SalvageConfig;
const base = (cash = 0) => ({ cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;

const FLOOR = pointOf(C, 'floor');
/** In sight of the tipping floor (5 m from its middle), not of the scale. */
const NEAR = { x: FLOOR.x, y: FLOOR.y + 5 };
/** Far from every station of the test map (out of reach.sight of all of them). */
const FAR = { x: 4, y: 4 };

function presence(cfg: SalvageConfig, g: SalvageGame, p: { x: number; y: number }, t: number, moving = false): SalvageGame {
  return R.setPresence(cfg, g, { x: p.x, y: p.y, moving, standingFor: moving ? 0 : 5, driving: false } as never, t);
}

/** An empty yard with `n` pieces of 10 kg on the tipping floor: no drop-off, the merchant out for good. */
function floorYard(cfg: SalvageConfig, n = 40): SalvageGame {
  const g = R.createSalvage(cfg, base(100_000), FIXTURE_NOW);
  const s = g.salvage;
  const pieces: GroundPiece[] = [];
  for (let i = 0; i < n; i++) pieces.push({ uid: `t${String(i).padStart(2, '0')}`, grade: 'li', g: 10_000, from: null, spec: 0, pile: 'floor', k: i, claim: null });
  return {
    ...g,
    salvage: { ...s, things: [], pieces, dropoff: { ...s.dropoff, nextAt: -1 }, merchant: { ...s.merchant, phase: 'away', since: s.t, endsAt: s.t + 1e7 }, presenceAt: -1000 },
  };
}

/** Hire a yard hand with the boss at `at` (null: away), samples every 0.25 s to T; the events and the course start. */
function hand(cfg: SalvageConfig, at: (t: number) => { x: number; y: number } | null, T: number, g0 = floorYard(cfg), onStep?: (g: SalvageGame) => SalvageGame) {
  const ev: SalvageEvent[] = [];
  let g = g0;
  const p0 = at(g.salvage.t);
  if (p0) g = presence(cfg, g, p0, g.salvage.t);
  g = R.hire(cfg, g, 'hand', hireCheck(cfg, g, 'hand').price ?? 0, g.salvage.t, ev);
  const t0 = g.salvage.crew[0].course!.t0;
  const states: SalvageGame[] = [g];
  while (g.salvage.t < T - 1e-9) {
    const p = at(g.salvage.t);
    if (p) g = presence(cfg, g, p, g.salvage.t);
    g = R.jump(cfg, g, Math.min(T, g.salvage.t + 0.25), ev);
    if (onStep) g = onStep(g);
    states.push(g);
  }
  // A trip is one weigh-in by the hand (dated at its own drop); its kind is where its pieces came from.
  const trips = ev
    .filter((e): e is Extract<SalvageEvent, { type: 'weighIn' }> => e.type === 'weighIn' && e.by === 'hand.0')
    .map((e) => ({ at: e.ticket.at, kind: e.pieces.every((u) => u.startsWith('t')) ? 'floor' : e.pieces.every((u) => u.startsWith('bench.')) ? 'tray' : 'mixed', n: e.pieces.length }));
  return { g, ev, t0, trips, states };
}

describe('the run is the rule in sight and out of sight (14.1)', () => {
  it('(a) in sight for a whole run: trips of one kind until the limit, then the first yard order (a tray waits for the run)', () => {
    const cfg = cfgOf();
    let trayAt = -1;
    const { t0, trips, states } = hand(cfg, () => NEAR, FIXTURE_T0() + 200, floorYard(cfg), (g) => {
      // An out tray fills while the run is under way (the bench owned, 30 kg waiting in its tray).
      if (trayAt >= 0 || g.salvage.t < FIXTURE_T0() + 5) return g;
      trayAt = g.salvage.t;
      const bench = { ...g.salvage.machines.bench, owned: true, level: 1, tray_g: { no2: 30_000 } };
      return { ...g, salvage: { ...g.salvage, machines: { ...g.salvage.machines, bench } } };
    });
    // Nothing of the floor run was planned ahead (the boss sees the floor): every trip an ordinary trip.
    expect(states.some((g) => g.salvage.crew[0].run && g.salvage.crew[0].course?.t0 === t0)).toBe(false);
    const lim = RUNS.handRun_s as number;
    const firstTray = trips.findIndex((r) => r.kind === 'tray');
    expect(firstTray).toBeGreaterThanOrEqual(3);
    // Before it: floor trips only, every one ending by t0 + the limit; the next floor trip would have ended later.
    const run = trips.slice(0, firstTray);
    expect(run.every((r) => r.kind === 'floor')).toBe(true);
    expect(run.every((r) => r.at <= t0 + lim + 1e-6)).toBe(true);
    const tripS = run[1].at - run[0].at;
    expect(run[run.length - 1].at + tripS).toBeGreaterThan(t0 + lim);
    // The tray trip set out at the run's last drop: the tray waited that long for him (at most the limit).
    const left = run[run.length - 1].at;
    const wait = left - trayAt;
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(lim + 1e-6);
    console.log(`(a) in sight: ${run.length} floor trips in the run (limit ${lim} s, a trip ${tripS.toFixed(2)} s); a tray full at t0 + ${(trayAt - t0).toFixed(2)} s waited ${wait.toFixed(2)} s`);
  });

  it('(b) in sight against out of sight from the same state: the same run, trips of the same kind, within one', () => {
    for (const lim of [45, 60, 90]) {
      const cfg = cfgOf({ handRun_s: lim });
      const T = FIXTURE_T0() + lim + 40;
      const seen = hand(cfg, () => NEAR, T);
      const far = hand(cfg, () => FAR, T);
      const away = hand(cfg, () => null, T);
      const trip = hand(cfgOf({ handRun_s: lim, ahead: false }), () => FAR, T);
      // Out of sight the run was planned ahead; in sight and with ahead false it was not.
      expect(far.states.some((g) => g.salvage.crew[0].run?.loads && g.salvage.crew[0].run.loads.length > 1)).toBe(true);
      expect(trip.states.some((g) => g.salvage.crew[0].run)).toBe(false);
      const first = (r: ReturnType<typeof hand>) => r.trips.filter((x) => x.at <= r.t0 + lim + 1e-6);
      const n = first(seen).length;
      expect(n).toBeGreaterThanOrEqual(2);
      for (const other of [far, away, trip]) {
        expect(other.t0).toBe(seen.t0);
        expect(Math.abs(first(other).length - n)).toBeLessThanOrEqual(1);
        expect(first(other).every((x) => x.kind === 'floor')).toBe(true);
      }
      // Trip by trip out of sight IS the in-sight run, drop for drop.
      expect(first(trip).map((x) => x.at)).toEqual(first(seen).map((x) => x.at));
      // Planned ahead, each load is dated at its own drop: the same dates.
      expect(first(far).map((x) => +x.at.toFixed(6))).toEqual(first(seen).map((x) => +x.at.toFixed(6)));
    }
  });

  it('(c) a run begun in sight that departs out of sight plans only the rest, to t0 + the limit', () => {
    const cfg = cfgOf();
    const T0 = FIXTURE_T0();
    const r = hand(cfg, (t) => (t < T0 + 8 ? NEAR : FAR), T0 + 90);
    const planned = r.states.map((g) => g.salvage.crew[0]).find((m) => m.run)!;
    expect(planned).toBeTruthy();
    expect(planned.course!.t0).toBe(r.t0);
    expect(planned.run!.t0).toBeGreaterThan(r.t0 + 1);
    expect(planned.run!.end).toBeLessThanOrEqual(r.t0 + (RUNS.handRun_s as number) + 1e-6);
    const seen = hand(cfg, () => NEAR, T0 + 90);
    const lim = RUNS.handRun_s as number;
    const k = (x: ReturnType<typeof hand>) => x.trips.filter((q) => q.at <= x.t0 + lim + 1e-6).length;
    expect(Math.abs(k(r) - k(seen))).toBeLessThanOrEqual(1);
  });

  it('(d) a planned run opened by the boss walking into sight goes on with its kind, trip by trip, to its limit', () => {
    const cfg = cfgOf();
    const T0 = FIXTURE_T0();
    const r = hand(cfg, (t) => (t < T0 + 15 ? FAR : NEAR), T0 + 120);
    const before = r.states.find((g) => g.salvage.t >= T0 + 14)!.salvage.crew[0];
    expect(before.run?.loads?.length ?? 0).toBeGreaterThan(1);
    // He walks over (no faster than truck.bossV): the run is opened when he comes within sight of it.
    const open = r.states.find((g) => g.salvage.t > T0 + 15 && !g.salvage.crew[0].run)!;
    expect(open.salvage.t).toBeLessThan(T0 + 30);
    const lastDrop = Math.max(...r.trips.filter((q) => q.at <= r.t0 + (RUNS.handRun_s as number) + 1e-6).map((q) => q.at));
    const after = r.states.filter((g) => g.salvage.t >= open.salvage.t && g.salvage.t < lastDrop - 1e-6);
    expect(after.length).toBeGreaterThan(10);
    for (const g of after) {
      const m = g.salvage.crew[0];
      expect(m.run).toBeUndefined();
      expect(m.course?.t0).toBe(r.t0);
      expect(m.course?.kind).toEqual({ k: 'pile', pile: 'floor' });
    }
    const lim = RUNS.handRun_s as number;
    const seen = hand(cfg, () => NEAR, T0 + 120);
    const first = (x: ReturnType<typeof hand>) => x.trips.filter((q) => q.at <= x.t0 + lim + 1e-6);
    expect(first(r).every((q) => q.kind === 'floor')).toBe(true);
    expect(Math.abs(first(r).length - first(seen).length)).toBeLessThanOrEqual(1);
  });

  it('(g) the boss picks up a piece no trip under way has claimed while a yard hand works a run beside him', () => {
    const cfg = cfgOf();
    const T0 = FIXTURE_T0();
    // He stands on the floor's pile, among the pieces the hand's later trips would take.
    const spot = piecePos(C, 'floor', 30);
    const r = hand(cfg, () => spot, T0 + 25);
    const mid = r.states.filter((g) => g.salvage.t > T0 + 1 && g.salvage.t < T0 + 25);
    for (const g of mid) {
      const m = g.salvage.crew[0];
      expect(m.run).toBeUndefined();
      // Only the trip under way holds claims.
      const claimed = g.salvage.pieces.filter((p) => p.claim).map((p) => p.uid);
      expect(claimed.every((u) => m.claims.includes(u))).toBe(true);
    }
    const bossPicks = r.ev.filter((e) => e.type === 'pickup' && e.by === 'boss').map((e) => (e as { piece: string }).piece);
    expect(bossPicks.length).toBeGreaterThan(0);
    const handPicks = r.ev.filter((e) => e.type === 'pickup' && e.by === 'hand.0').map((e) => (e as { piece: string }).piece);
    expect(bossPicks.filter((u) => handPicks.includes(u))).toEqual([]);
    expect(r.g.salvage.load.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------- a busy yard

/** Every purchase, two hands, a cutter and the driver, on the test content. */
function busy(cfg: SalvageConfig): SalvageGame {
  let g = R.createSalvage(cfg, base(100_000), FIXTURE_NOW);
  for (const item of ['sack', 'sledge', 'trolley', 'truck', 'stripper', 'bench']) g = R.buy(cfg, g, item, R.shopPrice(cfg, g, item) ?? 0, g.salvage.t);
  for (const role of ['hand', 'hand', 'cutter', 'driver'] as const) g = R.hire(cfg, g, role, hireCheck(cfg, g, role).price ?? 0, g.salvage.t);
  return { ...g, salvage: { ...g.salvage, presenceAt: -1000 } };
}

/** The boss's walk: in and out of sight of the floor, the drop-off and the scale, a sample a second. */
function walk(t: number): { x: number; y: number; moving: boolean } {
  const k = Math.floor(t / 40) % 4;
  const pts = [FAR, NEAR, pointOf(C, 'dropoff'), { x: 30, y: 10 }];
  const a = pts[k];
  const b = pts[(k + 1) % 4];
  const u = (t % 40) / 40;
  const moving = u > 0.6;
  const v = moving ? (u - 0.6) / 0.4 : 0;
  return { x: a.x + (b.x - a.x) * v, y: a.y + (b.y - a.y) * v, moving };
}

const whole = (g: SalvageGame): unknown => {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), earned: Math.round(g.lifetimeEarnings * 100), s };
};

describe('a tick equals a jump with the boss walking in and out of sight of runs (14.1, whole state)', () => {
  it('(e) ten minutes, a sample a second: 0.1 s ticks against one jump between samples', () => {
    for (const group of [{}, { handRun_s: 30, cutRun_s: 120 }, { ahead: false }] as Group[]) {
      const cfg = cfgOf(group);
      let a = busy(cfg);
      let b = a;
      let ms = a.salvage.clock.highMs;
      let courses = 0;
      let opened = 0;
      for (let sec = 0; sec < 600; sec++) {
        const t = a.salvage.t;
        const p = walk(sec);
        a = presence(cfg, a, p, t, p.moving);
        b = presence(cfg, b, p, b.salvage.t, p.moving);
        const runsBefore = a.salvage.crew.filter((m) => m.run).length;
        for (let i = 0; i < 10; i++) {
          ms += 100;
          a = R.advanceSalvage(cfg, a, 0.1, ms);
        }
        b = R.jump(cfg, b, a.salvage.t);
        courses += a.salvage.crew.filter((m) => m.course).length;
        if (a.salvage.crew.filter((m) => m.run).length < runsBefore) opened++;
        if (sec % 30 === 29) expect(whole(b), `${JSON.stringify(group)} at ${sec} s`).toEqual(whole(a));
      }
      expect(whole(b)).toEqual(whole(a));
      expect(courses).toBeGreaterThan(100);
      if ((group as Group).ahead !== false) expect(opened).toBeGreaterThan(0);
    }
  }, 300_000);
});

describe('saves and the run (14.1 d)', () => {
  it('(f) a save in the middle of an in-sight run reloads and goes on as the unsaved yard', () => {
    const cfg = cfgOf();
    const T0 = FIXTURE_T0();
    const r = hand(cfg, () => NEAR, T0 + 20);
    const g = r.g;
    const m = g.salvage.crew[0];
    expect(m.course).toBeTruthy();
    expect(m.run).toBeUndefined();
    expect(m.phase).not.toBe('wait');
    const loaded = reconcileSalvage(cfg, base(g.cash), JSON.parse(JSON.stringify({ salvage: g.salvage })), g.salvage.clock.highMs);
    expect(loaded.salvage.crew[0].course).toEqual(m.course);
    const go = (x: SalvageGame) => {
      let y = { ...x, cash: g.cash, lifetimeEarnings: g.lifetimeEarnings, stats: g.stats, lastSavedAt: g.lastSavedAt } as SalvageGame;
      while (y.salvage.t < T0 + 120 - 1e-9) {
        y = presence(cfg, y, NEAR, y.salvage.t);
        y = R.jump(cfg, y, Math.min(T0 + 120, y.salvage.t + 0.25));
      }
      return y;
    };
    const strip = (x: SalvageGame) => {
      const w = whole(x) as { s: Record<string, unknown> };
      delete w.s.presenceAt;
      delete w.s.presence;
      return w;
    };
    expect(strip(go(loaded))).toEqual(strip(go(g)));
  });

  it("(f) a broken run record is dropped (he chooses by the first yard's order); a stage-1 save loads with none", () => {
    const cfg = cfgOf();
    const r = hand(cfg, () => NEAR, FIXTURE_T0() + 20);
    for (const bad of [{ t0: 'x', job: 'floor', kind: { k: 'pile', pile: 'floor' } }, { t0: 0, job: 'floor', kind: { k: 'cut', where: 'floor' } }, { t0: 1e12, job: 'floor', kind: { k: 'pile', pile: 'floor' } }, { t0: 0, job: 'floor', kind: { k: 'tray', id: 'nope' } }, 7]) {
      const raw = JSON.parse(JSON.stringify({ salvage: r.g.salvage }));
      raw.salvage.crew[0].course = bad;
      const loaded = reconcileSalvage(cfg, base(r.g.cash), raw, r.g.salvage.clock.highMs);
      expect(loaded.salvage.crew[0].course, JSON.stringify(bad)).toBeUndefined();
      const on = R.jump(cfg, loaded, loaded.salvage.t + 60);
      expect(on.salvage.crew[0].course).toBeTruthy();
    }
    const c = SalvageSchema.parse(gate5.content);
    const g5 = { mode: 'salvage', salvage: { ...c, worldSeed: gate5.worldSeed, group: { fromRung: 1, handRun_s: 30, cutRun_s: 120, ahead: true } } } as unknown as SalvageConfig;
    const recorded = gate5.g as unknown as SalvageGame;
    const loaded = reconcileSalvage(g5, base(recorded.cash), JSON.parse(JSON.stringify({ salvage: recorded.salvage })), gate5.now);
    expect(loaded.salvage.crew.every((m) => m.course === undefined)).toBe(true);
    const on = R.jump(g5, loaded, loaded.salvage.t + 300);
    expect(on.salvage.crew.some((m) => m.course)).toBe(true);
  });
});

describe("the merchant's round is never lengthened (14.3)", () => {
  it('away round_s after every collection, the boss in sight, out of sight or away; a 61 s absence after a 59 s one pays', () => {
    const cfg = cfgOf();
    let g = busy(cfg);
    g = awayPass(cfg, { ...g, lastSavedAt: g.salvage.clock.highMs }, g.salvage.clock.highMs + 1800_000);
    g = R.ackAway(cfg, g);
    const ev: SalvageEvent[] = [];
    let away = 0;
    let s0 = g;
    for (let k = 0; k < 600; k++) {
      const p = k % 200 < 100 ? FAR : pointOf(C, 'merchant');
      s0 = presence(cfg, s0, p, s0.salvage.t);
      s0 = R.jump(cfg, s0, s0.salvage.t + 0.5, ev);
      const m = s0.salvage.merchant;
      if (m.phase === 'away' && m.endsAt !== null) {
        expect(m.endsAt - m.since).toBeCloseTo(C.merchant.round_s, 9);
        away++;
      }
    }
    expect(away).toBeGreaterThan(50);
    // The attacker's case: a busy yard, an absence of 59 s, then one of 61 s (a card): it paid.
    let dev = g.salvage.clock.highMs;
    for (const gap of [59, 61]) {
      dev += gap * 1000;
      const e0 = g.lifetimeEarnings;
      const n = R.advanceSalvage(cfg, g, 0.1, dev);
      if (gap === 61) {
        expect(n.salvage.away).toBeTruthy();
        expect(n.salvage.away!.money).toBeGreaterThan(0);
        expect(n.lifetimeEarnings - e0).toBeGreaterThan(0);
      }
      g = n.salvage.away ? R.ackAway(cfg, n) : n;
    }
  });
});

/** The test content's fresh yard clock (createSalvage starts it here). */
function FIXTURE_T0(): number {
  return R.createSalvage(cfgOf(), base(0), FIXTURE_NOW).salvage.t;
}

/**
 * engine2-hooks (26 Nov; the confirmation of the engine step, attack/engine2b/ahead.ts, ahead2.ts; ruling
 * 14.1 (b) "nothing a person can see is claimed ahead"): a yard hand's run was planned ahead after a sight
 * test of its start, its FIRST pick-up spot and its destination only, so a later trip from another spot of
 * the same pile could lie in the boss's sight and stay claimed there until the next presence sample (the
 * confirmer's smallest case: seed 263, minute 60, at +61.8 s, hand.0, a planned run of two loads whose
 * second spot a fresh boss saw). Now the plan stops before a trip whose pick-up spot he sees.
 */
describe('a planned run never holds a trip the boss can see (14.1 b; the confirmer\'s case)', () => {
  // Six 10 kg pieces at the floor pile's first spots and six from its spot k = 16: a hand's load (60 kg here)
  // takes six, so the run's first trip picks at k 0 and its second at k 16 (south-east of k 0 by 1.1 m).
  const pieceAt = (uid: string, k: number): GroundPiece => ({ uid, grade: 'li', g: 10_000, from: null, spec: 0, pile: 'floor', k, claim: null });
  const yard = (cfg: SalvageConfig): SalvageGame => {
    const g = floorYard(cfg, 0);
    const pieces = [0, 1, 2, 3, 4, 5].map((i) => pieceAt(`t0${i}`, i)).concat([0, 1, 2, 3, 4, 5].map((i) => pieceAt(`t1${i}`, 16 + i)));
    return { ...g, salvage: { ...g.salvage, pieces } };
  };
  const none = () => null;
  const A = piecePos(C, 'floor', 0, none);
  const B = piecePos(C, 'floor', 16, none);
  const d = Math.hypot(B.x - A.x, B.y - A.y);
  // The boss stands beyond spot k 16, within sight of it and out of sight of spot k 0, the scale and the office.
  const BOSS = { x: B.x + ((B.x - A.x) / d) * (C.reach.sight - 0.5), y: B.y + ((B.y - A.y) / d) * (C.reach.sight - 0.5) };
  const dist = (p: { x: number; y: number }) => Math.hypot(p.x - BOSS.x, p.y - BOSS.y);

  it('the geometry of the case: spot k 0, the scale and the office out of his sight, spot k 16 within it', () => {
    expect(dist(A)).toBeGreaterThan(C.reach.sight);
    expect(dist(B)).toBeLessThanOrEqual(C.reach.sight);
    expect(dist(pointOf(C, 'scale'))).toBeGreaterThan(C.reach.sight);
    expect(dist(pointOf(C, 'office'))).toBeGreaterThan(C.reach.sight + 2);
  });

  it('no planned load stands within his sight at any sample; the seen trip is made as an ordinary trip of the run', () => {
    const cfg = cfgOf();
    const r = hand(cfg, () => BOSS, FIXTURE_T0() + 90, yard(cfg));
    let planned = 0;
    for (const g of r.states)
      for (const m of g.salvage.crew) {
        if (!m.run) continue;
        planned++;
        for (const L of m.run.loads ?? []) {
          const sp = L.spot as { pile: string; k: number };
          expect(dist(piecePos(C, sp.pile, sp.k, none)), `planned load at k ${sp.k}`).toBeGreaterThan(C.reach.sight);
        }
      }
    // The first trip (out of his sight) was planned; the second (in his sight) was not planned ahead...
    expect(planned).toBeGreaterThan(0);
    // ...but made, as a trip of the same run (both trips from the floor, every piece weighed in once).
    expect(r.trips.length).toBeGreaterThanOrEqual(2);
    expect(r.trips.every((q) => q.kind === 'floor')).toBe(true);
    expect(r.trips.reduce((a, q) => a + q.n, 0)).toBe(12);
    expect(r.g.salvage.pieces.length).toBe(0);
  });

  it('a tick equals a jump on the case (whole state), the boss standing there with a sample every half second', () => {
    const cfg = cfgOf();
    let a = R.hire(cfg, presence(cfg, yard(cfg), BOSS, FIXTURE_T0()), 'hand', hireCheck(cfg, yard(cfg), 'hand').price ?? 0, FIXTURE_T0());
    let b = a;
    let ms = a.salvage.clock.highMs;
    for (let k = 0; k < 160; k++) {
      a = presence(cfg, a, BOSS, a.salvage.t);
      b = presence(cfg, b, BOSS, b.salvage.t);
      for (let i = 0; i < 5; i++) {
        ms += 100;
        a = R.advanceSalvage(cfg, a, 0.1, ms);
      }
      b = R.jump(cfg, b, a.salvage.t);
    }
    expect(whole(b)).toEqual(whole(a));
    expect(a.salvage.pieces.length).toBe(0);
  });
});
