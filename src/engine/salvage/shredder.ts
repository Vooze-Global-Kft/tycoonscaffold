/**
 * THE SHREDDER LINE AND THE BAY-FED PLATES (stage 2, docs/design/yard-stage2.md 2.8.1): the shredder, the
 * eddy current on its stream and the sensor sorter, and every plate fed from the bays (`feedBy: 'bays'`):
 * segments by the cumulative rule (`WorksState.segStart`, `drawn_g`), ending only when a routed bay empties
 * or refills from empty, a route or a level changes, or a heat starts or ends. Owner: rules-works (Phase B).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no line exists. The loop does not call this file: works.ts
 * dates and applies the queue kind `plate` and credits the draws (works.ts worksCredit) and calls in here.
 */
import type { Ctx } from './clock';
import type { PlateId } from './types';

/** The yard second the current segment of a bay-fed plate ends, or null. Stub: none. */
export function segmentEndsAt(x: Ctx, plate: PlateId): number | null {
  void x;
  void plate;
  return null;
}

/** Credit a bay-fed plate's draw and output to yard second t (eagerly, at every instant that reads or writes its bays). Stub: nothing. */
export function creditLine(x: Ctx, plate: PlateId, t: number): void {
  void x;
  void plate;
  void t;
}
