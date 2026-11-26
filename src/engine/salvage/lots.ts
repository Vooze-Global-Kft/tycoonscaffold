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
