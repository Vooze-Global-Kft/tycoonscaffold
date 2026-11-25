/**
 * The tick (yard-stage1.md 2.14): the one function for the 0.1 s tick and the jump, the derived event
 * queue, the income measure. Owner: rules-sim.
 */
import { marketDay as marketDayOf } from './board';
import type { QueuedEvent, SalvageConfig, SalvageEvent, SalvageGame } from './types';
import { MAX_TICK } from './types';

/**
 * One tick (2.14): advances the state by `dt` seconds of live play (at most `away.gapS`; a longer gap
 * goes to the away pass first, 2.14 step 1) and reports the typed events in the order they happened.
 * It adds dt to BOTH `salvage.t` (yard seconds) and `stats.playSeconds` (time played; only here).
 * STUB(hour 0): the clocks advance; nothing else happens.
 */
export function advanceSalvage(cfg: SalvageConfig, g: SalvageGame, dt: number, now: number, events?: SalvageEvent[]): SalvageGame {
  // STUB(hour 0)
  const step = Math.max(0, Math.min(Math.max(MAX_TICK, cfg.salvage.away.gapS), Number.isFinite(dt) ? dt : 0));
  const s = g.salvage;
  const highMs = Math.max(s.clock.highMs + step * 1000, now);
  const day = marketDayOf(cfg.salvage, highMs);
  if (day !== s.clock.day) events?.push({ type: 'day', day });
  return { ...g, stats: { ...g.stats, playSeconds: g.stats.playSeconds + step }, salvage: { ...s, t: s.t + step, clock: { ...s.clock, highMs, day } } };
}

/** The same tick as a value: `{game, events}` (2.14's `tick(content, state, dt, now) → {state, events}`). */
export function tick(cfg: SalvageConfig, g: SalvageGame, dt: number, now: number): { game: SalvageGame; events: SalvageEvent[] } {
  const events: SalvageEvent[] = [];
  return { game: advanceSalvage(cfg, g, dt, now, events), events };
}

/**
 * The next dated event (E17): the minimum over the state's dated fields (act.endsAt, crew legs, the
 * driver's trip, machines' pieces, the crucible, the round, the drop-off, skips filling, purchases
 * arriving, the next day boundary). The queue is DERIVED: nothing else is saved. A jump is
 * advance(g, nextEvent(g).at). Machines' piece ends are rules-sim's (STUB(hour 0): not listed).
 */
export function nextEvent(cfg: SalvageConfig, g: SalvageGame): QueuedEvent | null {
  const s = g.salvage;
  const out: QueuedEvent[] = [];
  const add = (at: number | null | undefined, kind: QueuedEvent['kind'], ref = '') => {
    if (at !== null && at !== undefined && Number.isFinite(at) && at >= s.t - 1e-6) out.push({ at, kind, ref });
  };
  add(s.act.endsAt, 'act');
  for (const m of s.crew) if (m.t1 > m.t0) add(m.t1, 'crewLeg', m.id);
  if (s.truck.trip) add(s.truck.trip.endsAt, 'driverLeg', s.truck.trip.partner);
  add(s.machines.crucible.endsAt, 'crucible');
  add(s.merchant.endsAt, 'round');
  add(s.dropoff.nextAt, 'dropoffArrival');
  for (const [pid, p] of Object.entries(s.partners)) for (const sk of p.skips) if (sk.phase === 'filling') add(sk.fullAt, 'skipFull', `${pid}.${sk.slot}`);
  for (const a of s.arriving) add(a.at, 'arrival', a.item);
  const nextDayMs = cfg.salvage.board.epochMs + (s.clock.day + 1) * 86_400_000;
  add(s.t + Math.max(0, (nextDayMs - s.clock.highMs) / 1000), 'day');
  out.sort((a, b) => a.at - b.at || a.kind.localeCompare(b.kind) || a.ref.localeCompare(b.ref));
  return out[0] ?? null;
}

/**
 * incomeRate (2.13): § collected (collections and deal deliveries) in the last five minutes of yard
 * time ÷ 5, § A MINUTE (the advice line prices against cash + advice.minutes × incomeRate). Real.
 */
export function incomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  void cfg;
  const inc = g.salvage.income;
  const now = Math.floor(g.salvage.t / 60);
  const age = Math.max(0, now - inc.minute);
  const kept = inc.buckets.slice(Math.min(inc.buckets.length, age));
  return kept.reduce((a, x) => a + x, 0) / 5;
}

/** Income § a SECOND for the shared store while played (EngineMode.activeIncome): incomeRate / 60. */
export function activeIncomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  return incomeRate(cfg, g) / 60;
}

/** Income § a second the shared store shows as steady (EngineMode.income): the same measure (the yard has no separate idle rate). */
export function steadyIncomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  return incomeRate(cfg, g) / 60;
}

