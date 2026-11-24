/**
 * The flick (spec 4.3) as pure arithmetic: what a release does, how far the signature has written
 * itself and how far the drawer has opened at a given distance, and the finger's velocity from its
 * last samples. No React, no Reanimated: the responder (./useFlick.ts) calls `releaseOf` on the
 * JavaScript thread; the canvas calls `inkOf` and `drawerOf` (worklets) on the UI thread from the one
 * shared value `paperY`.
 *
 * Distances are layout points, `dy` positive DOWN (screen coordinates): up is the out-tray (sign),
 * down is the drawer (study). Velocities in points per millisecond, positive down.
 *
 * 4.3, exactly:
 * - from 40 pt the signature writes itself across the SIGN strip (up), or the drawer creaks open
 *   (down), growing with the distance, with a light haptic at 40 pt and no click;
 * - a release commits UP at 90 pt, or at 48 pt moving up at 0.8 pt/ms or faster; DOWN at 90 pt, or
 *   at 24 pt moving down at 0.5 pt/ms or faster (signing asks more: the up-swipe is the commonest
 *   habit and it spends money); anything else springs back;
 * - a second finger cancels (the paper springs back and the gesture is over until every finger lifts);
 * - a touch that hardly moved is a tap (the second path: tap a strip to arm it, tap it again to commit).
 */

/** From this distance the ink writes (up) or the drawer opens (down), with one light haptic. */
export const ARM_AT = 40;
/** Release thresholds of 4.3. */
export const COMMIT_UP = 90;
export const FAST_UP = 48;
export const FAST_UP_SPEED = 0.8;
export const COMMIT_DOWN = 90;
export const FAST_DOWN = 24;
export const FAST_DOWN_SPEED = 0.5;
/** The signature is fully written, and the drawer fully open, at the commit distance. */
export const FULL_AT = 90;
/** A tap: the finger moved at most this far and lifted within TAP_MS. */
export const TAP_SLOP = 8;
export const TAP_MS = 350;
/** The finger's velocity is measured over its last samples within this window (ms). */
export const VELOCITY_WINDOW_MS = 80;

export type Release = 'sign' | 'refuse' | 'spring';

/** The one spring that brings a paper back (4.5: one clock per animated thing). */
export const SPRING = { damping: 17, stiffness: 240, mass: 0.9 } as const;
/** A committed paper flies into the out-tray or the drawer in this long (ms); the next slides in from the in-tray 300 ms after the commit (4.3). */
export const LEAVE_MS = 260;
export const NEXT_AFTER_MS = 300;
export const ENTER_MS = 280;

export interface ReleaseInput {
  /** Distance moved, positive down (pt). */
  dy: number;
  /** Velocity at release, positive down (pt/ms). */
  vy: number;
  /** A second finger touched during the gesture. */
  cancelled: boolean;
}

/** What a release does (4.3): commit up, commit down, or spring back. */
export function releaseOf(r: ReleaseInput): Release {
  if (r.cancelled || !Number.isFinite(r.dy)) return 'spring';
  const up = -r.dy;
  const vUp = Number.isFinite(r.vy) ? -r.vy : 0;
  if (up >= COMMIT_UP || (up >= FAST_UP && vUp >= FAST_UP_SPEED)) return 'sign';
  const down = r.dy;
  const vDown = Number.isFinite(r.vy) ? r.vy : 0;
  if (down >= COMMIT_DOWN || (down >= FAST_DOWN && vDown >= FAST_DOWN_SPEED)) return 'refuse';
  return 'spring';
}

/** Which side the finger has armed at distance `dy` (from 40 pt), or null. */
export function armedAt(dy: number): 'sign' | 'refuse' | null {
  if (dy <= -ARM_AT) return 'sign';
  if (dy >= ARM_AT) return 'refuse';
  return null;
}

/** Was it a tap (the second path), not a drag? */
export function isTap(maxMove: number, ms: number): boolean {
  return maxMove <= TAP_SLOP && ms <= TAP_MS;
}

/**
 * The paper's drawn offset for a finger at `dy` (vertical only): it follows the finger 1:1 at first and
 * then gives like a rubber band, never further than the band beside it (`upRoom`: the out-tray band
 * above, `downRoom`: the drawer band below), so the strip the player is reading never slides under
 * the bars. The thresholds of 4.3 count the finger's distance, not the paper's.
 */
export function followOf(dy: number, upRoom: number, downRoom: number): number {
  'worklet';
  const room = dy < 0 ? upRoom : downRoom;
  if (room <= 0) return 0;
  return room * Math.tanh(dy / room);
}

/** How much of the signature is written at a finger distance `dy` (0..1: nothing before 40 pt up, all of it at 90). */
export function inkOf(dy: number): number {
  'worklet';
  const up = -dy;
  if (up <= ARM_AT) return 0;
  return Math.min(1, (up - ARM_AT) / (FULL_AT - ARM_AT));
}

/** How far the drawer is open at a finger distance `dy` (0..1: closed before 40 pt down, open at 90). */
export function drawerOf(dy: number): number {
  'worklet';
  const down = dy;
  if (down <= ARM_AT) return 0;
  return Math.min(1, (down - ARM_AT) / (FULL_AT - ARM_AT));
}

/** The drawer's picture to show for an opening (0..steps-1): the drawer is drawn at a few fixed openings. */
export function drawerStep(open: number, steps: number): number {
  'worklet';
  return Math.max(0, Math.min(steps - 1, Math.round(open * (steps - 1))));
}

/** One sample of the finger: page y (pt) and time (ms). */
export interface Sample {
  y: number;
  t: number;
}

/** The finger's velocity (pt/ms, positive down) over its samples of the last VELOCITY_WINDOW_MS; 0 with fewer than two. */
export function velocityOf(samples: readonly Sample[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let first = samples[samples.length - 2];
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > VELOCITY_WINDOW_MS) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.y - first.y) / dt;
}
