/**
 * THE WORKS' PEOPLE ON THE UI THREAD (PLAN2 2.8; a stub of C-WORLD-1, filled by WLD-PEOPLE): the Yard sale's visitors
 * walking in through the wicket, paying at the reader and carrying a bath or a valve out (the frame's FrameVisitor:
 * t0 -> payAt -> t1 along map.works.visitorPath), drawn in every frame with what they carry (the owner's review, point 3:
 * the carrier drawn in EVERY pose), stepping aside from vehicles as the crew do (point 7).
 *
 * The contract: useRulesTable.ts (C-WORLD-2) packs the frame's visitors VISITOR numbers each (`packVisitors`); the frame
 * loop calls `visitorsInto` with them, the yard clock and the draw list, and it returns how many people it drew. A worklet;
 * no allocation per frame. Today: nothing packed, nothing drawn.
 */
import type * as R from '../../../engine/salvage';
import type { DrawList } from './actors';

/** Numbers per visitor in the packed list: t0, payAt, t1, object code, grams, tint index (reserved). */
export const VISITOR = 6;

/** The frame's visitors as numbers for the UI thread (stub: none). */
export function packVisitors(_vs: readonly R.FrameVisitor[] | undefined): number[] {
  return [];
}

/** Draws the visitors (stub: draws nothing, returns 0). A worklet. */
export function visitorsInto(_L: DrawList, _SHD: DrawList, _V: Float64Array, _VIS: readonly number[], _t: number): number {
  'worklet';
  return 0;
}
