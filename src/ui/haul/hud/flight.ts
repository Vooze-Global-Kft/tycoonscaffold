/**
 * The freighter's one flight path, shared by the bay and the scene (lead's decision 6): the bay
 * owns everything below its top edge (the panel, the pad, the docked freighter, lift-off and
 * landing), the scene draws the field above it. Both draw the SAME curve, each clipped to its own
 * side of the bay's crest, so the freighter crosses the edge without a jump.
 *
 * Climb (spec 2.3, 2.5 s): y = padY + (topY − padY) × p², p = time / climb.
 * Land (2 s): y = topY + (padY − topY) × easeOut(p), the scale easing from loaded to resting.
 * Pure functions; the two `*Worklet` ones also run on the UI thread.
 */
import type { FieldLayout, Rect } from '../layout';

/** Where the freighter rests on its pad, in screen points, and its scales. */
export interface PadSpot {
  x: number;
  y: number;
  /** Scale with cargo aboard (also the scale of the whole flight). */
  loaded: number;
  /** Scale of the empty freighter at rest. */
  empty: number;
}

/** The pad's scale in the launch track (0.72 on the 375 x 667 layout). */
export const padScaleFor = (compact: boolean) => (compact ? 0.72 : 0.8);

/** The resting spot for a freighter drawing of `size` (art/freighter.draw `freighterSize`) with `loadedScale` (LOADED_FREIGHTER_SCALE). */
export function padSpot(launch: Rect, compact: boolean, size: { w: number; h: number }, loadedScale: number): PadSpot {
  const padScale = padScaleFor(compact);
  const fit = Math.min(1, (launch.height - 6) / (size.h * loadedScale * padScale + 6));
  return {
    x: launch.x + launch.width / 2,
    y: launch.y + launch.height - 17 * (padScale / 0.8),
    loaded: loadedScale * padScale * fit,
    empty: padScale * fit,
  };
}

/** The top of the climb, off the top of the field (the warp flash happens there). */
export const flightTop = (layout: FieldLayout) => layout.zones.field.y - 90;
/** The handover line: the crest of the bay panel's curved top edge. */
export const bayCrest = (layout: FieldLayout) => layout.zones.bay.y;

/** Height of the freighter's centre at progress `p` (0..1) of a climb. */
export function climbY(p: number, padY: number, topY: number): number {
  'worklet';
  const u = Math.min(1, Math.max(0, p));
  return padY + (topY - padY) * u * u;
}

/** Height and scale at progress `p` (0..1) of a landing. */
export function landAt(p: number, padY: number, topY: number, loaded: number, rest: number): { y: number; scale: number } {
  'worklet';
  const u = Math.min(1, Math.max(0, p));
  const e = 1 - (1 - u) * (1 - u) * (1 - u);
  return { y: topY + (padY - topY) * e, scale: loaded + (rest - loaded) * e };
}
