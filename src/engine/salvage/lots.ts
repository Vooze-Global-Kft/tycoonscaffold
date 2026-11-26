/**
 * DELIVERED LOTS ("oversize pieces", stage 2, docs/design/yard-stage2.md 2.10.1): a named partner's lorry
 * sets a lot on the oversize pad at `lots.nextAt` (yard seconds, so they ride the away cap), at most
 * `lots.max` waiting, never a backlog; only the boss cuts one. Owner: rules-works (Phase B fills the bodies).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no lot is ever dated, so the first yard advances exactly as
 * before. Where the loop calls it:
 * - `lotsDated(x)` from the derived queue (kind `lot`, ref ''): the next arrival's yard second, or null.
 *   Read `x.s.lots.nextAt` here, not in the loop: a date the feature does not move would repeat its instant.
 * - `lotArrive(x, t)` at that instant: the lot set down, `nextAt` = max(nextAt, t) + period, or null when
 *   the arrival makes `lots.max` (B9).
 * Cutting a lot is the boss's act (`lot`, 2.18), not a dated event of the queue.
 * THE LEAD'S RULING 6 (26 Nov 09:50): there is no fallback thing. While no kind can be drawn (every kind of
 * lots.kinds needs the plasma cutter, or a line the yard does not own) the lots WAIT for a kind the yard can
 * open; each kind's cut seconds are its own (`lots.kinds[].cut_s`).
 *
 * EVERY DATE a body writes for the queue is at least the yard second t it is written at (s2a-fix): the loop never
 * applies a date before s.t (tick.ts drops it), so a date in the past stops the feature for ever; a saved one is
 * clamped to the save's clock (state2.ts repairStage2).
 */
import type { Ctx } from './clock';

/** The next lot's arrival, yard seconds, or null. Stub: none. */
export function lotsDated(x: Ctx): number | null {
  void x;
  return null;
}

/** A lot arrives at its instant t. Stub: nothing dates one. */
export function lotArrive(x: Ctx, t: number): void {
  void x;
  void t;
}

/**
 * The works open (works.ts worksOpen, `backFieldOpen`; rules-works wave 1): the first lot is dated
 * t + lots.period_s (2.10.1: `nextAt` is first set here, never at creation or migration). Arrivals and their
 * kinds are wave 2's (lotsDated, lotArrive).
 */
export function lotsOpen(x: Ctx, t: number): void {
  const L = x.c.lots;
  if (!L || x.s.lots.nextAt !== null) return;
  // Dated from the START of the transition in which the works open (x.t0), not from the instant inside it: they
  // open at the first live check, which a run of ticks meets at its first tick's horizon and one jump at its first
  // event or its own horizon; both are inside the transition that starts at the same yard second, so a tick and a
  // jump date the first lot alike. Never before t (a date in the past would stop the feature).
  x.s.lots.nextAt = Math.max(t, x.t0 + L.period_s);
}
