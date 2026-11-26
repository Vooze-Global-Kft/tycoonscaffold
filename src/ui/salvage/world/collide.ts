'worklet';
/**
 * Moving a round body through the yard: plain maths, every function a worklet (the frame loop calls
 * them on the UI thread; the tests call them under node). No allocation: results go into an `out`
 * array the caller made once.
 *
 * The body is a circle on the ground plane (metres). A move is tried whole, then pushed out of every
 * solid it overlaps along the shortest way out, a few times over: so a body running into a wall at an
 * angle keeps the part of its motion along the wall (it slides) instead of stopping dead. Then it is
 * kept inside the yard. Solids are packed as in ./yard.ts ([kind, x, y, a, b]).
 */

/** Pushes the circle (out[0], out[1], radius r) out of one packed solid at `o`. Returns true when it moved. */
export function pushOut(out: number[], r: number, solids: readonly number[], o: number): boolean {
  const kind = solids[o];
  const sx = solids[o + 1];
  const sy = solids[o + 2];
  const a = solids[o + 3];
  const b = solids[o + 4];
  const x = out[0];
  const y = out[1];
  if (kind === 0) {
    const dx = x - sx;
    const dy = y - sy;
    const d = Math.sqrt(dx * dx + dy * dy);
    const min = r + a;
    if (d >= min) return false;
    if (d < 1e-6) {
      out[1] = sy + min;
      return true;
    }
    out[0] = sx + (dx / d) * min;
    out[1] = sy + (dy / d) * min;
    return true;
  }
  // A box: the closest point of the box to the centre.
  const cx = Math.max(sx - a, Math.min(sx + a, x));
  const cy = Math.max(sy - b, Math.min(sy + b, y));
  const dx = x - cx;
  const dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return false;
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2);
    out[0] = cx + (dx / d) * r;
    out[1] = cy + (dy / d) * r;
    return true;
  }
  // The centre is inside the box: out by the nearest side.
  const left = x - (sx - a);
  const right = sx + a - x;
  const top = y - (sy - b);
  const bottom = sy + b - y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) out[0] = sx - a - r;
  else if (m === right) out[0] = sx + a + r;
  else if (m === top) out[1] = sy - b - r;
  else out[1] = sy + b + r;
  return true;
}

/** Numbers per body of a vehicle list (./motion.ts VB_STRIDE: x, y, ux, uy, half length, half width, vx, vy, ...). Kept equal by a test. */
export const BODY_STRIDE = 13;
/** Below this speed (m/s) a vehicle stands (./motion.ts MOVING_V). */
const STAND_V = 0.3;

/**
 * owner2-fix P2: pushes the circle (out[0], out[1], radius r) out of the turned rectangle of body `o` of VB
 * (its footprint as drawn: centre, unit facing, half length, half width). Returns true when it moved.
 */
export function pushOutBody(out: number[], r: number, VB: readonly number[] | Float64Array, o: number): boolean {
  const ux = VB[o + 2];
  const uy = VB[o + 3];
  const hl = VB[o + 4];
  const hw = VB[o + 5];
  const dx = out[0] - VB[o];
  const dy = out[1] - VB[o + 1];
  const a = dx * ux + dy * uy;
  const b = -dx * uy + dy * ux;
  const ca = Math.max(-hl, Math.min(hl, a));
  const cb = Math.max(-hw, Math.min(hw, b));
  const na = a - ca;
  const nb = b - cb;
  const d2 = na * na + nb * nb;
  if (d2 >= r * r) return false;
  let ta = a;
  let tb = b;
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2);
    ta = ca + (na / d) * r;
    tb = cb + (nb / d) * r;
  } else {
    // The centre inside the rectangle: out by the nearest side.
    const ea = hl - Math.abs(a);
    const eb = hw - Math.abs(b);
    if (ea < eb) ta = (a < 0 ? -1 : 1) * (hl + r);
    else tb = (b < 0 ? -1 : 1) * (hw + r);
  }
  out[0] = VB[o] + ta * ux - tb * uy;
  out[1] = VB[o + 1] + ta * uy + tb * ux;
  return true;
}

/** Does the circle (x, y, r) overlap the turned rectangle of body `o` of VB? */
export function overlapsBody(x: number, y: number, r: number, VB: readonly number[] | Float64Array, o: number): boolean {
  const dx = x - VB[o];
  const dy = y - VB[o + 1];
  const a = dx * VB[o + 2] + dy * VB[o + 3];
  const b = -dx * VB[o + 3] + dy * VB[o + 2];
  const na = Math.abs(a) - VB[o + 4];
  const nb = Math.abs(b) - VB[o + 5];
  const qa = Math.max(0, na);
  const qb = Math.max(0, nb);
  return qa * qa + qb * qb < r * r;
}

/**
 * Keeps a body inside the yard [0, w] x [0, d] or, when `lane` ([x0, x1, y0, y1]) is given, inside the
 * lane east of the gate: a body may cross the east fence only inside the lane's band (the gate), and a
 * body already out on the lane stays in its band up to its end (the barrier before the bridge).
 */
export function keepInside(out: number[], r: number, w: number, d: number, lane: readonly number[] | undefined, fromX: number): void {
  if (lane && lane.length === 4 && out[0] > w - r) {
    const inBand = out[1] >= lane[2] + r && out[1] <= lane[3] - r;
    if (fromX > w - r || inBand) {
      out[1] = Math.max(lane[2] + r, Math.min(lane[3] - r, out[1]));
      out[0] = Math.min(lane[1] - r, out[0]);
      return;
    }
  }
  out[0] = Math.max(r, Math.min(w - r, out[0]));
  out[1] = Math.max(r, Math.min(d - r, out[1]));
}

/**
 * Moves a circle of radius `r` from (x, y) by (dx, dy) through `solids` (and one extra circle `ex, ey,
 * er` when er > 0: the parked truck), inside the yard [0, w] x [0, d]. Writes the new place into out[0], out[1].
 */
export function moveBody(out: number[], x: number, y: number, dx: number, dy: number, r: number, solids: readonly number[], w: number, d: number, ex: number, ey: number, er: number, solids2?: readonly number[], lane?: readonly number[], VB?: readonly number[] | Float64Array, nvb = 0): void {
  // Long steps (a stalled frame) are cut into pieces no longer than the radius, so nothing is tunnelled through.
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.min(8, Math.ceil(len / Math.max(0.05, r * 0.9))));
  out[0] = x;
  out[1] = y;
  for (let s = 0; s < steps; s++) {
    out[0] += dx / steps;
    out[1] += dy / steps;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (let o = 0; o + 4 < solids.length; o += 5) if (pushOut(out, r, solids, o)) moved = true;
      if (solids2) for (let o = 0; o + 4 < solids2.length; o += 5) if (pushOut(out, r, solids2, o)) moved = true;
      // owner2-fix P2: the STANDING vehicles' rectangles (VB, nvb bodies), except one he already stands in at the
      // start (a vehicle that stopped on him, a Step out at its end): that one lets him out.
      for (let q = 0; q < nvb; q++) {
        const o = q * BODY_STRIDE;
        if (VB![o + 6] * VB![o + 6] + VB![o + 7] * VB![o + 7] >= STAND_V * STAND_V) continue;
        if (overlapsBody(x, y, r, VB!, o)) continue;
        if (pushOutBody(out, r, VB!, o)) moved = true;
      }
      if (er > 0) {
        const qx = out[0] - ex;
        const qy = out[1] - ey;
        const q = Math.sqrt(qx * qx + qy * qy);
        const min = r + er;
        if (q < min && q > 1e-6) {
          out[0] = ex + (qx / q) * min;
          out[1] = ey + (qy / q) * min;
          moved = true;
        }
      }
      if (!moved) break;
    }
    keepInside(out, r, w, d, lane, x);
  }
}

/** Whether a circle at (x, y) of radius r overlaps any solid (or leaves the yard). */
export function blocked(x: number, y: number, r: number, solids: readonly number[], w: number, d: number, solids2?: readonly number[], lane?: readonly number[]): boolean {
  const onLane = !!lane && lane.length === 4 && x > w - r && x <= lane[1] - r && y >= lane[2] + r && y <= lane[3] - r;
  if (!onLane && (x < r || y < r || x > w - r || y > d - r)) return true;
  if (solids2 && blocked(x, y, r, solids2, Infinity, Infinity)) return true;
  for (let o = 0; o + 4 < solids.length; o += 5) {
    const sx = solids[o + 1];
    const sy = solids[o + 2];
    const a = solids[o + 3];
    const b = solids[o + 4];
    if (solids[o] === 0) {
      const dx = x - sx;
      const dy = y - sy;
      if (dx * dx + dy * dy < (r + a) * (r + a)) return true;
    } else {
      const cx = Math.max(sx - a, Math.min(sx + a, x));
      const cy = Math.max(sy - b, Math.min(sy + b, y));
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
    }
  }
  return false;
}

/** Distance from (x, y) to the edge of a packed shape (kind 0 circle a; 1 box a x b), metres; 0 inside. */
export function edgeDist(kind: number, sx: number, sy: number, a: number, b: number, x: number, y: number): number {
  if (kind === 0) return Math.max(0, Math.sqrt((x - sx) * (x - sx) + (y - sy) * (y - sy)) - a);
  const dx = Math.max(0, Math.abs(x - sx) - a);
  const dy = Math.max(0, Math.abs(y - sy) - b);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * The interactable (packed as ./yard.ts `acts`, seven numbers each) the body stands next to: the one
 * whose edge is nearest, within body radius + reach. Returns its index in the list, or -1.
 */
export function nearestAct(acts: readonly number[], x: number, y: number, reach: number): number {
  let best = -1;
  let bestD = reach;
  for (let i = 0, o = 0; o + 6 < acts.length; i++, o += 7) {
    const e = edgeDist(acts[o + 4], acts[o + 2], acts[o + 3], acts[o + 5], acts[o + 6], x, y);
    if (e <= bestD) {
      bestD = e;
      best = i;
    }
  }
  return best;
}
