/**
 * THE FURNACE HALLS (stage 2, docs/design/yard-stage2.md 2.8): the rotary hall and the induction hall (each
 * bought with its filter) and the lead smelter: the crucible's heat generalised to a plate (`WorksState.heat`),
 * charged by "Take from bays" by mass from covered bays only, reagents paid at a heat's start, the first pour
 * waiting for the boss. The first yard's crucible stays in crucible.ts. Owner: rules-works (Phase B).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no hall exists. The loop does not call this file: works.ts
 * dates and applies the queue kind `hall` (works.ts worksDated / worksApply) and calls in here.
 *
 * EVERY DATE a body writes for the queue is at least the yard second t it is written at (s2a-fix): the loop never
 * applies a date before s.t (tick.ts drops it), so a date in the past stops the feature for ever; a saved one is
 * clamped to the save's clock (state2.ts repairStage2).
 */
import type { Ctx } from './clock';
import type { PlateId } from './types';
import type { DatedAdd } from './works';

/** Every hall's dated end (a heat, a pour, a cooling, its idle start, its self-pour) as kind `hall`. Stub: none. */
export function hallsDated(x: Ctx, add: DatedAdd<'hall'>): void {
  void x;
  void add;
}

/** A hall's dated event at its instant t. Stub: nothing dates one. */
export function hallApply(x: Ctx, plate: PlateId, t: number): void {
  void x;
  void plate;
  void t;
}
