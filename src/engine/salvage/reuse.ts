/**
 * THE YARD SALE (stage 2, docs/design/yard-stage2.md 2.12; rulings 5, 13.1): tagged things fit for reuse,
 * who racks them (by sight, present and away alike), the public's visitors dated by value, the trade
 * corner's batches and the reclamation dealer's van. Owner: rules-works (Phase B fills the bodies).
 *
 * PHASE A STUB (engine2-hooks, 26 November): every function does nothing and returns what "no Yard sale"
 * means (nothing is tagged, nobody comes), so the first yard advances exactly as before. Where the loop
 * calls them:
 * - `rackChoice(x, who, t, th)` where a yard hand or the boss meets a tagged thing (ruling 13.1):
 *     · a yard hand at his departure, FIRST in his order (crew.ts handDepart, `th` null): true when the
 *       feature has set him off with a tagged thing for the rack (his leg, claims and `dest` are the
 *       feature's to set, as handDepart sets them);
 *     · the boss in bossStep, before he picks up or works (hand.ts, `th` null): true when the feature has
 *       acted for him (he lifts a tagged thing whole, or sets one on the rack in the chalk zone: the act
 *       kind `rack`); the rest of that step is skipped;
 *     · a cutter choosing what to cut (crew.ts cutCands, each candidate `th`): true when he must keep off it
 *       (the boss or a yard hand racks it); false lets him cut it as any other (no slot free, too heavy).
 *   Below rung 3 nothing is tagged: return false.
 * - `reuseDated(x, add)` from the derived queue: the visitor's date (`reuse.nextAt`, only while the rack
 *   holds a thing) as kind `visitor`, the van's (`reuse.vanAt`) as kind `van` (ref ''). Pure in `x.c`, `x.s`.
 * - `reuseApply(x, kind, t)` at that instant: a sale at the gate or the van's collection, each a LOT PAYMENT
 *   (2.14.4): `bank.ts payLot(x, gross, t)` before its ticket prints, then `clock.ts earn(x, z, t)`.
 *
 * EVERY DATE a body writes for the queue is at least the yard second t it is written at (s2a-fix): the loop never
 * applies a date before s.t (tick.ts drops it), so a date in the past stops the feature for ever; a saved one is
 * clamped to the save's clock (state2.ts repairStage2).
 */
import type { Ctx } from './clock';
import type { CrewMember, ThingState } from './types';
import type { DatedAdd } from './works';

export type ReuseKind = 'visitor' | 'van';

/** A yard hand (th null), the boss (th null) or a cutter (th a candidate) meets what may be a tagged thing. Stub: nothing is tagged. */
export function rackChoice(x: Ctx, who: 'boss' | CrewMember, t: number, th: ThingState | null): boolean {
  void x;
  void who;
  void t;
  void th;
  return false;
}

/** The visitor's and the van's dated ends. Stub: none. */
export function reuseDated(x: Ctx, add: DatedAdd<ReuseKind>): void {
  void x;
  void add;
}

/** A visitor buys, or the van collects, at its instant t. Stub: nothing dates one. */
export function reuseApply(x: Ctx, kind: ReuseKind, t: number): void {
  void x;
  void kind;
  void t;
}

/**
 * The works open (works.ts worksOpen, `backFieldOpen`): the Yard sale's first moment (2.12: `reuse.firstThing`,
 * the bath, set beside the canopy). WAVE 2's body (rules-works wave 1 calls it at the one instant the works open,
 * live only; counts.bathSet is already set, so it is never called again). Stub: nothing.
 */
export function reuseOpen(x: Ctx, t: number): void {
  void x;
  void t;
}
