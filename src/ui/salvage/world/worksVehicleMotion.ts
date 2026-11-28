/**
 * THE WORKS' VEHICLES ON THE UI THREAD (PLAN2 2.8; a stub of C-WORLD-1, filled by WLD-VEHICLES1 and WLD-VEHICLES2): the
 * garage's recovery truck swinging a car onto the apron, the low-loader setting a heavy piece on the oversize pad, the
 * dealer's van at the Yard sale, the machine flatbed with the line's crates.
 *
 * The contract (C-WORLD-2 makes the call in frameLoop.ts): the frame loop draws the first yard's arrival kinds itself
 * (actors.ts ARRIVAL_CODE van, machineFlatbed, truck, crew, dropoff) and hands every other arrival (a code at or past
 * actors.ts ARRIVAL_WORKS_FIRST, or ARRIVAL_UNKNOWN) to `worksVehiclesInto`, with the scene's arrival numbers `AR` and the
 * arrival's offset `o` (actors.ts ARRIVAL numbers each), the yard clock `t`, the draw list and the view. It returns how
 * many vehicles it drew (the cost counters' actors). It draws from the frame's DATED facts only (lesson 13), every frame
 * (lesson 12: things that move move every frame), at most the content's speeds, and allocates nothing (pooled arrays).
 * Today: nothing drawn.
 */
import type { DrawList } from './actors';

/** Numbers per works vehicle the frame loop's scratch keeps between frames (facing, step aside): reserved, none used yet. */
export const WORKS_VEHICLE_SCRATCH = 4;

/** Draws one works arrival (stub: draws nothing, returns 0). A worklet. */
export function worksVehiclesInto(_L: DrawList, _SHD: DrawList, _V: Float64Array, _AR: readonly number[], _o: number, _t: number, _dt: number): number {
  'worklet';
  return 0;
}
