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

/** The share of the screen's height the followed body stands at: the middle of the free world under the bars (L6, MAP.md). */
export const FOLLOW_Y = 0.61;

/**
 * The camera (camX, camY before the zoom) that puts the world point (px, py) in points (x * ppm, y * ppm * tilt)
 * at the screen's middle across and at `fy` of its height, with the ground zoomed by `zoom` about the
 * screen's centre (the frame loop's transform). Writes out[0], out[1].
 */
export function followCam(out: number[], px: number, py: number, SW: number, SH: number, zoom: number, fy: number): void {
  'worklet';
  out[0] = px - SW / 2;
  out[1] = py - SH / 2 - (fy * SH - SH / 2) / zoom;
}

/**
 * The camera's limits at a zoom (see cameraBounds; the visible window is SW / zoom by SH / zoom points of
 * the world round the screen's centre), and, when `northPy` (the back wall's line in points, y * ppm * tilt)
 * is a number, never further north than the follow view of a body standing at the wall: the band over the
 * wall stays the look's sky and far yard. Writes [minX, maxX, minY, maxY] into out.
 */
export function zoomedBounds(out: number[], pxW: number, pxH: number, SW: number, SH: number, left: number, top: number, right: number, bottom: number, room: number, topPx: number, zoom: number, northPy: number, fy: number): void {
  'worklet';
  const z = zoom > 0.05 ? zoom : 1;
  const w = SW / z;
  const h = SH / z;
  // The window's top-left world point is camX + SW/2 - w/2: the bounds of that, shifted back.
  cameraBounds(out, pxW, pxH, w, h, left / z, top / z, right / z, bottom / z, room, topPx);
  const sx = SW / 2 - w / 2;
  const sy = SH / 2 - h / 2;
  out[0] -= sx;
  out[1] -= sx;
  out[2] -= sy;
  out[3] -= sy;
  if (northPy === northPy) {
    // The follow view of a body at the wall's line (its feet a little south of it).
    const minY = northPy - SH / 2 - (fy * SH - SH / 2) / z;
    if (minY > out[2]) out[2] = Math.min(minY, out[3]);
  }
}
