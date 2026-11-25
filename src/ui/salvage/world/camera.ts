/**
 * The camera's limits (plain maths, a worklet: the frame loop calls it on the UI thread, the tests under
 * node). The camera may run PAST the yard by a margin on each side, so that a body standing at the edge
 * of the yard is still drawn inside the safe area (never under a notch or island on the left or the
 * right, never under the home indicator) with room round it, and a body at the north edge shows whole
 * (its sprite rises `topPx` above its feet). The strip outside the yard shows the outside colour
 * (./YardView.tsx).
 *
 * Writes [minX, maxX, minY, maxY] of the camera (the screen point of the world's origin is (-camX, -camY))
 * into `out`. When the yard and its margins fit the screen one way, the camera is centred that way.
 */

/** Room kept round a body at the yard's edge, metres. */
export const EDGE_ROOM_M = 1.2;

export function cameraBounds(
  out: number[],
  pxW: number,
  pxH: number,
  SW: number,
  SH: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
  room: number,
  topPx: number,
): void {
  'worklet';
  const minX = -(left + room);
  const maxX = pxW - SW + right + room;
  const minY = -(top + room + topPx);
  const maxY = pxH - SH + bottom + room;
  if (maxX < minX) {
    out[0] = (minX + maxX) / 2;
    out[1] = out[0];
  } else {
    out[0] = minX;
    out[1] = maxX;
  }
  if (maxY < minY) {
    out[2] = (minY + maxY) / 2;
    out[3] = out[2];
  } else {
    out[2] = minY;
    out[3] = maxY;
  }
}
