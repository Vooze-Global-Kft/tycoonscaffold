/**
 * THE FORKLIFT (stage 2, docs/design/yard-stage2.md 2.9): the boss's only, entered by walking into it and
 * left with "Step out"; whole things and pieces up to `forklift.load`, a car from the car pad onto the
 * depollution apron; `SalvageState.forklift` (null until owned). Owner: rules-works (Phase B).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no forklift. The loop does not call this yet: the boss's
 * step (hand.ts bossStep) will hand him to it while he is in it (`forklift.by === 'boss'`), as it hands him
 * to the truck (truck.ts truckBossStep); ask engine2 for that line in hand.ts.
 */
import type { Ctx } from './clock';

/** The boss in the forklift at yard second t: true when this step was the forklift's. Stub: never. */
export function forkliftStep(x: Ctx, t: number): boolean {
  void x;
  void t;
  return false;
}
