/**
 * THE CRATE ("the picking table", stage 2, docs/design/yard-stage2.md 2.10.2): from rung 3 a share of a
 * tipped load's things goes to the crate at the oversize pad instead of the floor (by hash, while it holds
 * fewer than `crate.max`); the boss sorts it one thing every `crate.sort_s`, each a LOT PAYMENT (2.14.4,
 * `bank.ts payLot` before the ticket prints, then `earn`). Nothing in it expires. Owner: rules-works
 * (Phase B fills the bodies).
 *
 * PHASE A STUB (engine2-hooks, 26 November): nothing is diverted, so the first yard advances exactly as
 * before. Where the loop calls it:
 * - `tipDivert(x, thing, partner, t)` in truck.ts tipNow, once for each thing of a tipped load, in the
 *   load's order, after its uid (`f<n>`) is drawn and BEFORE it takes a floor slot: return where it stands
 *   instead (`{at: 'crate', k, since: t}`), or null for the floor (the first yard's slot, as before). A car
 *   and a battery never reach a tip (2.9): they arrive by their own bodies.
 * Sorting is the boss's act (`crate`, 2.18), not a dated event of the queue.
 *
 * EVERY DATE a body writes for the queue is at least the yard second t it is written at (s2a-fix): the loop never
 * applies a date before s.t (tick.ts drops it), so a date in the past stops the feature for ever; a saved one is
 * clamped to the save's clock (state2.ts repairStage2).
 */
import type { Ctx } from './clock';
import type { ObjectId, PartnerId, ThingAt } from './types';

/** Where a tipped thing stands instead of the floor, or null (the floor). Stub: the floor. */
export function tipDivert(x: Ctx, thing: { uid: string; obj: ObjectId }, partner: PartnerId, t: number): ThingAt | null {
  void x;
  void thing;
  void partner;
  void t;
  return null;
}
