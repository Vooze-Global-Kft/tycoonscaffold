/**
 * THE ENGINE'S ONE LOOP (yard-stage1.md 2.12 to 2.14, E17): stocks, rates constant between events, a
 * queue DERIVED from the state's dated fields (never saved), one function `advance` for the 0.1 s tick,
 * the jump and time away. Owner: rules-sim.
 *
 * Order at one instant (2.12): (1) the day boundary; (2) completions: machines and the crucible, the
 * boss's act, cutters and yard hands, the driver; (3) arrivals: drop-off, skips, purchases; (4) the
 * round; (5) departures of idle agents: cutters, yard hands, the driver; (6) checks: rung, rivals passed,
 * the deal offer, partners opening, goals.
 *
 * Stage 2 (engine2-hooks, Phase A): the queue's new kinds (B9) come after `machine` and before the
 * crucible, in STAGE2_QUEUE_ORDER (plate, hall, commission, crane, lot, visitor, van), so every old kind
 * keeps its order relative to every other (QUEUE_ORDER below is the whole order, pinned by hooks.test.ts).
 * Each feature dates and applies its own kinds through a stub its package owns (works.ts, lots.ts,
 * reuse.ts); the works also credit at every instant (worksCredit) and depart after the first yard's
 * departures (worksDepart). With the stubs as written nothing of it dates or does anything.
 */
import { awayPass } from './away';
import { marketDay } from './board';
import { releaseHolds } from './bays';
import { accrueBoost, begin, boostEndsAt, finish, nextDayAt, bossFresh, shareUnchanged, type Ctx } from './clock';
import { crewDepart, crewLegEnd, showCrewRuns } from './crew';
import { crucibleCheckReady, crucibleEvent, crucibleFromBays } from './crucible';
import { dealDeliver, dealOffer, dealReprice } from './deal';
import { bossActEnd, bossStep } from './hand';
import { credit, finishPiece, RATE_MACHINES, rerate, rerateAll, workEndsAt } from './machines';
import { fillSkip, openPartners } from './partners';
import { roundEvent, roundTry } from './round';
import { contentAt } from './layer';
import { lotArrive, lotsDated } from './lots';
import { arrive, checks } from './rate';
import { reuseApply, reuseDated } from './reuse';
import { dropoffArrive } from './things';
import { driverDepart, driverLegEnd, showTrip, tripEndsAt } from './truck';
import type { MachineId, QueuedEvent, QueuedKind, SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from './types';
import { MAX_TICK, STAGE2_QUEUE_ORDER } from './types';
import { worksApply, worksCredit, worksDated, worksDepart } from './works';

/**
 * THE ORDER WITHIN ONE INSTANT (2.12; stage 2 B9): kinds earliest first. The first yard's eleven keep their
 * order; stage 2's seven stand together right after `machine` (after it and before `round`, in
 * STAGE2_QUEUE_ORDER's order). Ties within one kind go by ref.
 */
export const QUEUE_ORDER: readonly QueuedKind[] = ['day', 'machine', ...STAGE2_QUEUE_ORDER, 'crucible', 'act', 'crewLeg', 'driverLeg', 'boostEnd', 'dropoffArrival', 'skipFull', 'arrival', 'round'];
// A literal (one fixed shape: the hot comparisons in `consider` read it thousands of times a pass); a test pins it to QUEUE_ORDER.
export const ORDER: Record<QueuedKind, number> = { day: 0, machine: 1, plate: 2, hall: 3, commission: 4, crane: 5, lot: 6, visitor: 7, van: 8, crucible: 9, act: 10, crewLeg: 11, driverLeg: 12, boostEnd: 13, dropoffArrival: 14, skipFull: 15, arrival: 16, round: 17 };

/** A dated event of the derived queue with stage 2's kinds (QueuedEvent's kind is the first yard's union until the contract widens it). */
type QEvent = { at: number; kind: QueuedKind; ref: string };

const EPS = 1e-6;

/** Every dated event of a state (the queue is derived, 2.12), earliest first. `dayAt` is the yard second of the next day boundary. */
function eventsOf(x: Ctx, dayAt: number, boostAt: number | null = null): QEvent[] {
  const s = x.s;
  const out: QEvent[] = [];
  const add = (at: number | null | undefined, kind: QueuedKind, ref = '') => {
    if (at !== null && at !== undefined && Number.isFinite(at) && at >= s.t - EPS) out.push({ at, kind, ref });
  };
  add(s.act.endsAt, 'act');
  // A grouped run's member is dated by its run's end (2.1); his shown leg fields decide nothing.
  for (const m of s.crew) if (m.run) add(m.run.end, 'crewLeg', m.id);
  else if (m.phase !== 'wait' && m.t1 > m.t0) add(m.t1, 'crewLeg', m.id);
  if (s.truck.trip) add(tripEndsAt(s.truck.trip), 'driverLeg', s.truck.trip.partner);
  for (const id of RATE_MACHINES) add(workEndsAt(s.machines[id]), 'machine', id);
  // Stage 2's dated ends, each from its feature's stub (works.ts, lots.ts, reuse.ts).
  worksDated(x, add);
  add(lotsDated(x), 'lot');
  reuseDated(x, add);
  const cr = s.machines.crucible;
  if (cr.phase === 'filling' || cr.phase === 'heating') add(cr.endsAt, 'crucible');
  if (s.merchant.phase !== 'waiting') add(s.merchant.endsAt, 'round');
  if (s.dropoff.nextAt >= 0) add(s.dropoff.nextAt, 'dropoffArrival');
  for (const [pid, p] of Object.entries(s.partners)) if (p.open) for (const sk of p.skips) if (sk.phase === 'filling') add(sk.fullAt, 'skipFull', `${pid}.${sk.slot}`);
  for (const a of s.arriving) add(a.at, 'arrival', a.item);
  add(dayAt, 'day');
  add(boostAt, 'boostEnd');
  out.sort((a, b) => a.at - b.at || ORDER[a.kind] - ORDER[b.kind] || (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
  return out;
}

// The earliest event, found without allocating per candidate (the away pass calls this thousands of times).
let bAt = 0;
let bKind: QueuedKind = 'day';
let bRef = '';
let bSet = false;
let bMin = 0;
function consider(at: number | null | undefined, kind: QueuedKind, ref: string): void {
  if (at === null || at === undefined || !(at >= bMin) || !Number.isFinite(at)) return;
  if (!bSet || at < bAt - 1e-9 || (Math.abs(at - bAt) <= 1e-9 && (ORDER[kind] < ORDER[bKind] || (ORDER[kind] === ORDER[bKind] && ref < bRef)))) {
    bAt = at;
    bKind = kind;
    bRef = ref;
    bSet = true;
  }
}

function firstEvent(x: Ctx): QEvent | null {
  const s = x.s;
  bSet = false;
  bMin = s.t - EPS;
  consider(s.act.endsAt, 'act', '');
  // engine6: a candidate later than the earliest so far by more than consider's tie window is not offered at all (consider
  // would keep the earliest as it is: `at - bAt > 1e-9` is the negation of both of its tests, computed the same way).
  const crew = s.crew;
  for (let i = 0; i < crew.length; i++) {
    const m = crew[i];
    const at = m.run ? m.run.end : m.phase !== 'wait' && m.t1 > m.t0 ? m.t1 : undefined;
    if (at !== undefined && (!bSet || !(at - bAt > 1e-9))) consider(at, 'crewLeg', m.id);
  }
  if (s.truck.trip) consider(tripEndsAt(s.truck.trip), 'driverLeg', s.truck.trip.partner);
  for (let i = 0; i < RATE_MACHINES.length; i++) consider(workEndsAt(s.machines[RATE_MACHINES[i]]), 'machine', RATE_MACHINES[i]);
  // Stage 2's dated ends, each from its feature's stub (works.ts, lots.ts, reuse.ts).
  worksDated(x, consider);
  consider(lotsDated(x), 'lot', '');
  reuseDated(x, consider);
  const cr = s.machines.crucible;
  if (cr.phase === 'filling' || cr.phase === 'heating') consider(cr.endsAt, 'crucible', '');
  if (s.merchant.phase !== 'waiting') consider(s.merchant.endsAt, 'round', '');
  if (s.dropoff.nextAt >= 0) consider(s.dropoff.nextAt, 'dropoffArrival', '');
  for (const pid in s.partners) {
    const p = s.partners[pid];
    // The ref is built only when the skip can be the earliest (it decides ties only).
    if (p.open)
      for (let i = 0; i < p.skips.length; i++) {
        const sk = p.skips[i];
        if (sk.phase === 'filling' && (!bSet || sk.fullAt <= bAt + 1e-9)) consider(sk.fullAt, 'skipFull', `${pid}.${sk.slot}`);
      }
  }
  for (const a of s.arriving) if (!bSet || !(a.at - bAt > 1e-9)) consider(a.at, 'arrival', a.item);
  consider(nextDayAt(x), 'day', '');
  consider(boostEndsAt(x), 'boostEnd', '');
  return bSet ? { at: bAt, kind: bKind, ref: bRef } : null;
}

/** Apply one dated event at its instant. */
function apply(x: Ctx, e: QEvent): void {
  const s = x.s;
  const t = s.t;
  switch (e.kind) {
    case 'day': {
      s.clock.day += 1;
      x.ev.push({ type: 'day', day: s.clock.day });
      dealDeliver(x, t);
      dealReprice(x, t);
      if (s.foreman.day !== s.clock.day) s.foreman = { ...s.foreman, day: s.clock.day, used_s: 0 };
      releaseHolds(x);
      // The rivals' tonnes are by the day (rivals.ts rivalDay): the checks look again at this instant (2.17).
      x.dirty = true;
      return;
    }
    case 'machine':
      finishPiece(x, e.ref as MachineId, t);
      return;
    // Stage 2 (B9): the works, a delivered lot, a visitor at the Yard sale, the van (each its feature's).
    case 'plate':
    case 'hall':
    case 'commission':
    case 'crane':
      worksApply(x, e.kind, e.ref, t);
      return;
    case 'lot':
      lotArrive(x, t);
      return;
    case 'visitor':
    case 'van':
      reuseApply(x, e.kind, t);
      return;
    case 'crucible':
      crucibleEvent(x, t);
      return;
    case 'act':
      if (s.act.endsAt !== null) bossActEnd(x, t);
      return;
    case 'crewLeg': {
      const m = s.crew.find((c) => c.id === e.ref);
      if (m) crewLegEnd(x, m, t);
      return;
    }
    case 'driverLeg':
      driverLegEnd(x, t);
      return;
    case 'dropoffArrival':
      dropoffArrive(x, t);
      return;
    case 'skipFull': {
      const [pid, slot] = [e.ref.slice(0, e.ref.lastIndexOf('.')), Number(e.ref.slice(e.ref.lastIndexOf('.') + 1))];
      const sk = s.partners[pid]?.skips.find((q) => q.slot === slot);
      if (sk) fillSkip(x, pid, sk, t);
      return;
    }
    case 'arrival':
      arrive(x, e.ref, t);
      return;
    case 'round':
      roundEvent(x, t);
      return;
    case 'boostEnd':
      // The boost's end is derived (boostEndsAt): the tail re-rates the machines at this instant.
      return;
  }
}

/** After every instant: the boss (live), the round, departures, checks. */
function tail(x: Ctx, t: number): void {
  if (x.live) bossStep(x, t);
  else rerate(x, 'hand_stripper', t);
  // The foreman's boost started or ended at this instant (2.6): machines change rate here; crew from their next leg.
  rerateAll(x, t);
  crucibleFromBays(x, t);
  crucibleCheckReady(x, t);
  roundTry(x, t);
  crewDepart(x, t);
  driverDepart(x, t);
  // Stage 2: the works' departures, after the first yard's (works.ts worksDepart).
  worksDepart(x, t);
  checks(x, t, false);
}

/**
 * advance (2.14 step 3): repeatedly take the earliest event ≤ the horizon, apply it and the others at
 * that instant in 2.12's order, re-offer idle agents; then credit machines to the horizon.
 */
export function advance(x: Ctx, T: number): void {
  const s = x.s;
  let guard = 0;
  for (;;) {
    const e = firstEvent(x);
    if (!e || e.at > T + EPS) break;
    const tt = Math.max(s.t, e.at);
    accrueBoost(x, tt);
    s.t = tt;
    // The rate stocks are brought to this instant BEFORE anything reads them (a yard hand claiming a tray
    // at his departure): the cumulative rule makes this free of path, so ticking and jumping see the same
    // trays (the 17:30 gate case, bots/gate5-state.json: a stale tray claimed 45 g where the tick had 285 g).
    for (let i = 0; i < RATE_MACHINES.length; i++) credit(x, RATE_MACHINES[i], tt);
    worksCredit(x, tt);
    let inner = 0;
    for (let e2: QEvent | null = e; e2 && e2.at <= tt + EPS; e2 = firstEvent(x)) {
      apply(x, e2);
      if (++inner > 500) break;
    }
    tail(x, tt);
    if (++guard > 200_000) break;
  }
  if (T > s.t) {
    accrueBoost(x, T);
    s.t = T;
  }
  for (const id of RATE_MACHINES) credit(x, id, s.t);
  worksCredit(x, s.t);
  // Live play looks once more at the horizon; the away pass forces nothing at its end (RULING2.md 14.4: the
  // checks follow the state, not the pass: an absence cut into passes equals one pass).
  if (x.live) checks(x, s.t, false);
  // 2.1: what the frame draws of a grouped run (a pure function of its plan and this clock).
  showCrewRuns(x);
  showTrip(x);
}

/** Close a transition's clocks: the market high mark rises to max(market time at the yard clock, now). */
function closeClock(x: Ctx, now: number): void {
  const s = x.s;
  const ms = x.ms0 + (s.t - x.t0) * 1000;
  s.clock.highMs = Math.max(s.clock.highMs, ms, Number.isFinite(now) ? now : 0);
  s.clock.day = Math.max(s.clock.day, marketDay(x.c, s.clock.highMs));
  releaseHolds(x);
}

/**
 * One tick (2.14): t_m = max(now, highMs + dt); a gap over away.gapS goes to the away pass first (the same
 * engine, 2.16); then advance by dt of live play with the latest presence. dt is added to `salvage.t`
 * and `stats.playSeconds`.
 */
const SHARED_ON_TICK = ['things', 'pieces', 'crew', 'act'] as const;

export function advanceSalvage(cfg: SalvageConfig, g: SalvageGame, dt: number, now: number, events?: SalvageEvent[]): SalvageGame {
  const step = Math.max(0, Math.min(Math.max(MAX_TICK, cfg.salvage.away.gapS), Number.isFinite(dt) ? dt : 0));
  const s0 = g.salvage;
  const ev = events ?? [];
  const live = s0.clock.highMs + step * 1000;
  const gapS = Number.isFinite(now) ? (now - live) / 1000 : 0;
  let base = g;
  if (gapS > cfg.salvage.away.gapS) base = awayPass(cfg, g, now - step * 1000, ev);
  const x = begin(cfg, base, ev, true);
  advance(x, x.s.t + step);
  closeClock(x, now);
  // owner1 L1: things and pieces change only at events: a tick between them keeps the same lists (the frame reuses them).
  shareUnchanged(base.salvage, x.s, SHARED_ON_TICK);
  return finish(base, x, step);
}

/** The same tick as a value: `{game, events}`. */
export function tick(cfg: SalvageConfig, g: SalvageGame, dt: number, now: number): { game: SalvageGame; events: SalvageEvent[] } {
  const events: SalvageEvent[] = [];
  return { game: advanceSalvage(cfg, g, dt, now, events), events };
}

/**
 * A jump: advance the state to its next event (or `to`, whichever is first), live, with the presence as
 * it stands. The gate compares ticking at 0.1 s with jumping.
 */
export function jump(cfg: SalvageConfig, g: SalvageGame, to: number, events?: SalvageEvent[]): SalvageGame {
  const x = begin(cfg, g, events, true);
  advance(x, Math.max(x.s.t, to));
  closeClock(x, -Infinity);
  return finish(g, x, Math.max(0, x.s.t - g.salvage.t));
}

/** Advance the state by `seconds` with no boss (time away's engine; also the tests' and the bots'). */
export function advanceNoBoss(x: Ctx, seconds: number): void {
  const live = x.live;
  x.live = false;
  advance(x, x.s.t + Math.max(0, seconds));
  x.live = live;
}

/**
 * The next dated event of a state (E17): the minimum over its dated fields. The features' stubs see a
 * read-only view (`cfg`, `c`, `s`, `live`; no events, cash or away card). Its kind is typed as the first
 * yard's QueuedKind until the contract widens QueuedEvent.kind to QueuedKind (with the stubs as written
 * only the first yard's kinds occur).
 */
export function nextEvent(cfg: SalvageConfig, g: SalvageGame): QueuedEvent | null {
  const s = g.salvage;
  const nextDayMs = cfg.salvage.board.epochMs + (s.clock.day + 1) * 86_400_000;
  const live = { cfg, c: contentAt(cfg.salvage, s), s, live: true } as unknown as Ctx;
  return (eventsOf(live, s.t + Math.max(0, (nextDayMs - s.clock.highMs) / 1000), boostEndsAt(live))[0] ?? null) as QueuedEvent | null;
}

/**
 * incomeRate (2.13): § collected (collections and deal deliveries) in the last five minutes of yard
 * time ÷ 5, § A MINUTE.
 */
export function incomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  void cfg;
  const inc = g.salvage.income;
  const now = Math.floor(g.salvage.t / 60);
  const age = Math.max(0, now - inc.minute);
  const kept = inc.buckets.slice(Math.min(inc.buckets.length, age));
  return kept.reduce((a, x) => a + x, 0) / 5;
}

/** Income § a SECOND while played (EngineMode.activeIncome): incomeRate / 60. */
export function activeIncomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  return incomeRate(cfg, g) / 60;
}

/** Income § a second the shared store shows as steady (EngineMode.income). */
export function steadyIncomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  return incomeRate(cfg, g) / 60;
}

void bossFresh;
void openPartners;
void dealOffer;
void rerate;
