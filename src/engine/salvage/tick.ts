/**
 * THE ENGINE'S ONE LOOP (yard-stage1.md 2.12 to 2.14, E17): stocks, rates constant between events, a
 * queue DERIVED from the state's dated fields (never saved), one function `advance` for the 0.1 s tick,
 * the jump and time away. Owner: rules-sim.
 *
 * Order at one instant (2.12): (1) the day boundary; (2) completions: machines and the crucible, the
 * boss's act, cutters and yard hands, the driver; (3) arrivals: drop-off, skips, purchases; (4) the
 * round; (5) departures of idle agents: cutters, yard hands, the driver; (6) checks: rung, rivals passed,
 * the deal offer, partners opening, goals.
 */
import { awayPass } from './away';
import { marketDay } from './board';
import { begin, finish, nextDayAt, bossFresh, type Ctx } from './clock';
import { crewDepart, crewLegEnd } from './crew';
import { crucibleCheckReady, crucibleEvent, crucibleFromBays } from './crucible';
import { dealDeliver, dealOffer, dealReprice } from './deal';
import { bossActEnd, bossStep } from './hand';
import { credit, finishPiece, RATE_MACHINES, rerate, workEndsAt } from './machines';
import { fillSkip, openPartners } from './partners';
import { roundEvent, roundTry } from './round';
import { arrive, checks } from './rate';
import { dropoffArrive } from './things';
import { driverDepart, driverLegEnd } from './truck';
import type { MachineId, QueuedEvent, QueuedKind, SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from './types';
import { MAX_TICK } from './types';

/** Kinds in 2.12's order at one instant. */
const ORDER: Record<QueuedKind, number> = { day: 0, machine: 1, crucible: 2, act: 3, crewLeg: 4, driverLeg: 5, boostEnd: 6, dropoffArrival: 7, skipFull: 8, arrival: 9, round: 10 };

const EPS = 1e-6;

/** Every dated event of a state (the queue is derived, 2.12), earliest first. `dayAt` is the yard second of the next day boundary. */
function eventsOf(s: SalvageState, dayAt: number): QueuedEvent[] {
  const out: QueuedEvent[] = [];
  const add = (at: number | null | undefined, kind: QueuedKind, ref = '') => {
    if (at !== null && at !== undefined && Number.isFinite(at) && at >= s.t - EPS) out.push({ at, kind, ref });
  };
  add(s.act.endsAt, 'act');
  for (const m of s.crew) if (m.phase !== 'wait' && m.t1 > m.t0) add(m.t1, 'crewLeg', m.id);
  if (s.truck.trip) add(s.truck.trip.endsAt, 'driverLeg', s.truck.trip.partner);
  for (const id of RATE_MACHINES) add(workEndsAt(s.machines[id]), 'machine', id);
  const cr = s.machines.crucible;
  if (cr.phase === 'filling' || cr.phase === 'heating') add(cr.endsAt, 'crucible');
  if (s.merchant.phase !== 'waiting') add(s.merchant.endsAt, 'round');
  if (s.dropoff.nextAt >= 0) add(s.dropoff.nextAt, 'dropoffArrival');
  for (const [pid, p] of Object.entries(s.partners)) if (p.open) for (const sk of p.skips) if (sk.phase === 'filling') add(sk.fullAt, 'skipFull', `${pid}.${sk.slot}`);
  for (const a of s.arriving) add(a.at, 'arrival', a.item);
  add(dayAt, 'day');
  out.sort((a, b) => a.at - b.at || ORDER[a.kind] - ORDER[b.kind] || (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
  return out;
}

function firstEvent(x: Ctx): QueuedEvent | null {
  const s = x.s;
  let best: QueuedEvent | null = null;
  const add = (at: number | null | undefined, kind: QueuedKind, ref = '') => {
    if (at === null || at === undefined || !(at >= s.t - EPS) || !Number.isFinite(at)) return;
    if (!best || at < best.at - 1e-9 || (Math.abs(at - best.at) <= 1e-9 && (ORDER[kind] < ORDER[best.kind] || (ORDER[kind] === ORDER[best.kind] && ref < best.ref)))) best = { at, kind, ref };
  };
  add(s.act.endsAt, 'act');
  for (const m of s.crew) if (m.phase !== 'wait' && m.t1 > m.t0) add(m.t1, 'crewLeg', m.id);
  if (s.truck.trip) add(s.truck.trip.endsAt, 'driverLeg', s.truck.trip.partner);
  for (const id of RATE_MACHINES) add(workEndsAt(s.machines[id]), 'machine', id);
  const cr = s.machines.crucible;
  if (cr.phase === 'filling' || cr.phase === 'heating') add(cr.endsAt, 'crucible');
  if (s.merchant.phase !== 'waiting') add(s.merchant.endsAt, 'round');
  if (s.dropoff.nextAt >= 0) add(s.dropoff.nextAt, 'dropoffArrival');
  for (const pid in s.partners) {
    const p = s.partners[pid];
    if (p.open) for (const sk of p.skips) if (sk.phase === 'filling') add(sk.fullAt, 'skipFull', `${pid}.${sk.slot}`);
  }
  for (const a of s.arriving) add(a.at, 'arrival', a.item);
  add(nextDayAt(x), 'day');
  return best;
}

/** Apply one dated event at its instant. */
function apply(x: Ctx, e: QueuedEvent): void {
  const s = x.s;
  const t = s.t;
  switch (e.kind) {
    case 'day': {
      s.clock.day += 1;
      x.ev.push({ type: 'day', day: s.clock.day });
      dealDeliver(x, t);
      dealReprice(x, t);
      if (s.foreman.day !== s.clock.day) s.foreman = { ...s.foreman, day: s.clock.day, used_s: 0 };
      return;
    }
    case 'machine':
      finishPiece(x, e.ref as MachineId, t);
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
      return;
  }
}

/** After every instant: the boss (live), the round, departures, checks. */
function tail(x: Ctx, t: number): void {
  if (x.live) bossStep(x, t);
  else rerate(x, 'hand_stripper', t);
  crucibleFromBays(x, t);
  crucibleCheckReady(x, t);
  roundTry(x, t);
  crewDepart(x, t);
  driverDepart(x, t);
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
    s.t = tt;
    let inner = 0;
    for (;;) {
      const e2 = firstEvent(x);
      if (!e2 || e2.at > tt + EPS) break;
      apply(x, e2);
      if (++inner > 500) break;
    }
    tail(x, tt);
    if (++guard > 200_000) break;
  }
  if (T > s.t) s.t = T;
  for (const id of RATE_MACHINES) credit(x, id, s.t);
  checks(x, s.t, !x.live);
}

/** Close a transition's clocks: the market high mark rises to max(market time at the yard clock, now). */
function closeClock(x: Ctx, now: number): void {
  const s = x.s;
  const ms = x.ms0 + (s.t - x.t0) * 1000;
  s.clock.highMs = Math.max(s.clock.highMs, ms, Number.isFinite(now) ? now : 0);
  s.clock.day = Math.max(s.clock.day, marketDay(x.c, s.clock.highMs));
}

/**
 * One tick (2.14): t_m = max(now, highMs + dt); a gap over away.gapS goes to the away pass first (the same
 * engine, 2.16); then advance by dt of live play with the latest presence. dt is added to `salvage.t`
 * and `stats.playSeconds`.
 */
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

/** The next dated event of a state (E17): the minimum over its dated fields. */
export function nextEvent(cfg: SalvageConfig, g: SalvageGame): QueuedEvent | null {
  const s = g.salvage;
  const nextDayMs = cfg.salvage.board.epochMs + (s.clock.day + 1) * 86_400_000;
  return eventsOf(s, s.t + Math.max(0, (nextDayMs - s.clock.highMs) / 1000))[0] ?? null;
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
