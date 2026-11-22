/**
 * The pure parts of the field gestures (spec 4.2, errata 46): thresholds, the drop target, the
 * flick. No React, no store; tested in ./gestureMath.test.ts.
 */
import type { FieldLayout, Pt } from '../layout';

/** Points of travel before a touch becomes a drag. */
export const SLOP = 10;
/** A release inside the slop before this is a tap; holding still this long is a press. */
export const TAP_MS = 350;
export const PRESS_MS = 350;
/** The launch swipe: the latch clicks at 30 pt, the freighter goes at 60 pt of rise. */
export const LAUNCH_ARM = 30;
export const LAUNCH_RISE = 60;
/** A drop locks onto the nearest rock within this distance of the finger. */
export const DROP_RADIUS = 40;
/** A flick: release speed over the last 80 ms of at least 0.5 pt/ms, aimed within 15° of a rock. */
export const FLICK_WINDOW_MS = 80;
export const FLICK_SPEED = 0.5;
export const FLICK_ANGLE_DEG = 15;

export interface Sample {
  x: number;
  y: number;
  t: number;
}

/** The nearest rock (by slot) whose centre is within DROP_RADIUS of `p` and that `ok` accepts, or null. */
export function dropTarget(p: Pt, layout: FieldLayout, ok: (slot: number) => boolean): number | null {
  let best: number | null = null;
  let bestD = DROP_RADIUS;
  for (const r of layout.rocks) {
    if (!ok(r.slot)) continue;
    const d = Math.hypot(p.x - r.x, p.y - r.y);
    if (d <= bestD) {
      bestD = d;
      best = r.slot;
    }
  }
  return best;
}

/** The release velocity (pt/ms) over the last FLICK_WINDOW_MS of `samples` (oldest first), or null. */
export function releaseVelocity(samples: readonly Sample[]): { vx: number; vy: number; speed: number } | null {
  if (samples.length < 2) return null;
  const last = samples[samples.length - 1];
  let first = samples[samples.length - 2];
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > FLICK_WINDOW_MS) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  if (!(dt > 0)) return null;
  const vx = (last.x - first.x) / dt;
  const vy = (last.y - first.y) / dt;
  return { vx, vy, speed: Math.hypot(vx, vy) };
}

/**
 * The flick's target: if the release was fast enough, the nearest rock `ok` accepts whose bearing
 * from the release point is within FLICK_ANGLE_DEG of the motion (errata 46: claimed rocks only).
 */
export function flickTarget(samples: readonly Sample[], layout: FieldLayout, ok: (slot: number) => boolean): number | null {
  const v = releaseVelocity(samples);
  if (!v || v.speed < FLICK_SPEED) return null;
  const p = samples[samples.length - 1];
  const cosMax = Math.cos((FLICK_ANGLE_DEG * Math.PI) / 180);
  let best: number | null = null;
  let bestD = Infinity;
  for (const r of layout.rocks) {
    if (!ok(r.slot)) continue;
    const dx = r.x - p.x;
    const dy = r.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) continue;
    const cos = (dx * v.vx + dy * v.vy) / (d * v.speed);
    if (cos >= cosMax && d < bestD) {
      bestD = d;
      best = r.slot;
    }
  }
  return best;
}

/** Whether `p` is on the rack's arms. */
export function onRack(p: Pt, layout: FieldLayout): boolean {
  const inR = (r: { x: number; y: number; width: number; height: number }) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
  return inR(layout.rack.left) || inR(layout.rack.right);
}

/** The centre of the rack cradle a dragged idle drone leaves from: the free cradle nearest the touch. */
export function rackGrabPoint(p: Pt, layout: FieldLayout): Pt {
  const r = p.x < layout.station.x ? layout.rack.left : layout.rack.right;
  return {
    x: Math.min(r.x + r.width, Math.max(r.x, p.x)),
    y: r.y + r.height * 0.35,
  };
}
