/**
 * THE COST COUNTERS OF A FRAME (PLAN2 6.1; s2c-plan-world.md 3.3 "How it is measured": the development panel's `draws`,
 * `sprites`, `statics looped` beside `runs`). A stub of C-WORLD-1: C-WORLD-2 writes them in frameLoop.ts ONLY while the
 * development panel is on (`on` 1), so a first-yard frame does no work for them; the panel reads them.
 *
 * Layout: one Float64Array of CC_N numbers (a shared value's payload, or a plain array in node: costHarness.ts gives the
 * same figures). Pure; the writers are worklets and allocate nothing.
 */

export const CC_ON = 0;
export const CC_DRAWS = 1;
export const CC_SPRITES = 2;
export const CC_ACTORS = 3;
export const CC_STATICS = 4;
export const CC_RUNS = 5;
export const CC_N = 6;

/** A fresh set of counters, off. */
export function makeCostCounters(): Float64Array {
  return new Float64Array(CC_N);
}

/** Writes one frame's figures (nothing while off). A worklet. */
export function countFrame(cc: Float64Array, draws: number, sprites: number, actors: number, statics: number, runs: number): void {
  'worklet';
  if (cc[CC_ON] !== 1) return;
  cc[CC_DRAWS] = draws;
  cc[CC_SPRITES] = sprites;
  cc[CC_ACTORS] = actors;
  cc[CC_STATICS] = statics;
  cc[CC_RUNS] = runs;
}
