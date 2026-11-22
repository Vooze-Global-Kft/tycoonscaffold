/**
 * The pure parts of the field gestures (spec 4.2, errata 46): thresholds, the drop target, the
 * flick. No React, no store; tested in ./gestureMath.test.ts.
 */
import type { FieldLayout, Pt, Rect } from '../layout';

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

/** The confirm chip's size: as wide as its longest price needs, one label row plus padding. */
export const CLAIM_CHIP_W = 128;
export const claimChipH = (row: number) => row + 14;

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Where the "Claim ₵21" chip of ghost slot `slot` sits (play-0, play-21): on the slot itself when
 * that covers nothing else, else under or over it, whichever covers the least of the other rocks
 * and their labels (a rock's circle and the label row under it), the top bars and the bay. The
 * gesture layer hit-tests the same rectangle, so a tap on the chip claims whichever view takes it.
 */
export function claimChipRect(layout: FieldLayout, slot: number, row: number): Rect | null {
  const rock = layout.rocks[slot];
  if (!rock) return null;
  const w = CLAIM_CHIP_W;
  const h = claimChipH(row);
  const x = Math.max(12, Math.min(layout.width - w - 12, rock.x - w / 2));
  const z = layout.zones;
  const top = z.comms.y + z.comms.height + 4;
  const bottom = z.bay.y - 4;
  const others: Rect[] = layout.rocks
    .filter((r) => r.slot !== slot)
    .map((r) => ({ x: r.x - Math.max(r.r, 30), y: r.y - r.r, width: 2 * Math.max(r.r, 30), height: 2 * r.r + 18 }));
  const candidates = [rock.y - h / 2, rock.y + rock.r + 4, rock.y - rock.r - h - 8];
  let best: Rect | null = null;
  let bestScore = Infinity;
  candidates.forEach((y0, i) => {
    const y = Math.max(top, Math.min(bottom - h, y0));
    const r = { x, y, width: w, height: h };
    // Pushed off its place by a bar counts against it; the first place wins ties.
    const score = others.reduce((a, o) => a + overlapArea(r, o), 0) + Math.abs(y - y0) * w + i;
    if (score < bestScore) {
      bestScore = score;
      best = r;
    }
  });
  return best;
}

/** A touch of a responder event: its finger's id and where it is. */
export interface TouchPoint {
  identifier?: string | number;
  pageX: number;
  pageY: number;
  timestamp?: number;
}

/**
 * Where the tracked finger is in a responder event, or null when the event is about other fingers
 * only (phone-2). The event's own pageX/pageY is its first changed touch, which can be another
 * finger; with no identifiers (a mouse on the web) the event's own point is the finger.
 */
export function fingerOf(ne: TouchPoint & { changedTouches?: readonly TouchPoint[] }, id: string | number | undefined | null): { p: Pt; t: number } | null {
  const own = { p: { x: ne.pageX, y: ne.pageY }, t: ne.timestamp || Date.now() };
  if (id === undefined || id === null) return own;
  const changed = ne.changedTouches ?? [];
  if (!changed.length) return own;
  const hit = changed.find((x) => x.identifier === id);
  if (!hit) return null;
  return { p: { x: hit.pageX, y: hit.pageY }, t: hit.timestamp || ne.timestamp || Date.now() };
}
