/**
 * SMOOTH MOTION FROM DATED DATA (the owner's review, 26 November, point 1: "truck animation, and helper
 * laggy"; point 7's drawing side: "trucks are sometimes speeding through the yard"). Worklets: the frame
 * loop (./frameLoop.ts) calls them on the UI thread every frame; the tests call them under node.
 *
 * 1. THE RULES' CLOCK ON THE UI THREAD (`rulesClock`). The rules' table arrives when the JavaScript thread
 *    has ticked and packed it (about ten times a second, later whenever JavaScript is busy). Every actor that
 *    the rules move (crew members on their legs, the driver's truck, the merchant's flatbed, the public's
 *    car, purchases arriving) is drawn at a time of the rules' clock. Before this file that time was
 *    "the table's t plus the time since this frame first saw the table, at most 0.25 s": every new table
 *    re-anchored it, so each tick moved every actor by the tick's jitter (a truck at 12 m/s jumped 8 to 30
 *    points back or forth ten times a second), and any tick later than 0.25 s froze them all. Now the clock
 *    runs at the display's rate and is only STEERED towards the tables (its rate between 0.5 and 1.5 of
 *    real time, a time constant of TAU_S): it never runs backwards, never re-anchors on an ordinary tick,
 *    carries on through a late tick (up to AHEAD_S past the newest table) and snaps only across an epoch (a
 *    preset, the away pass, a reload) or an error over SNAP_S. It is steered by the LEAST late of the
 *    recent tables (a table can come late, never early), so a busy thread does not slow the actors.
 * 2. THE DRIVER'S TRUCK ALONG ITS LEG (`truckAt`): a position on the leg's path at the leg's dates, a
 *    facing from the path ahead and behind (a corner turns through the art's in-between headings), the hook
 *    and tip frames standing.
 * 3. A CREW MEMBER ALONG HIS LEG (`crewAt`).
 * 4. A FACING THAT TURNS (`turnFacing`): a pictured vehicle whose wanted heading changes steps through the
 *    eight headings one at a time, STEP_S apart, so a turn reads as a turn and never as a flip.
 */
import { along, heading8, pathLen } from './actors';

/** Seconds the UI clock takes to absorb an error (the steering's time constant). */
export const TAU_S = 0.5;
/** An error over this many seconds is a jump (an epoch the table did not mark, a long stall): snap. */
export const SNAP_S = 0.75;
/** Seconds the UI clock may run past the newest table while JavaScript is late. */
export const AHEAD_S = 1.5;
/** Seconds a second by which the anchor forgets its least-late table (the tables may get later for good). */
export const FORGET = 0.02;
/** Slowest and fastest rate of the UI clock while it catches up (shares of real time). */
const RATE_MIN = 0.5;
const RATE_MAX = 1.5;

/**
 * The UI clock's state: [clock, newest table t, anchor (table t minus its frame second, the least late of the
 * recent tables), epoch, started (1)].
 */
export function makeClock(): Float64Array {
  'worklet';
  const c = new Float64Array(5);
  c[0] = NaN;
  return c;
}

/**
 * The rules' time to draw at in this frame. `fresh` is true on the first frame that sees a new table (its
 * yard second `t` and `epoch`); `nowMs` the frame's timestamp; `dt` the seconds since the previous frame.
 *
 * A table is never seen BEFORE its time, only later (the JavaScript thread was busy, the frame came after
 * it): so the best guess of the rules' time now is the frame's second plus the anchor of the LEAST late
 * recent table (forgotten at FORGET a second, so a thread that gets busier for good is followed down). The
 * clock itself advances by the frame's dt and is steered towards that guess.
 */
export function rulesClock(C: Float64Array, fresh: boolean, t: number, epoch: number, nowMs: number, dt: number): number {
  'worklet';
  const now = nowMs / 1000;
  const newEpoch = C[4] !== 1 || C[3] !== epoch;
  if (newEpoch) {
    C[1] = t;
    C[2] = t - now;
  } else if (fresh) {
    C[1] = t;
    const off = t - now;
    // The rules lost time (a tick's dt is clamped after a long stall) or a table arrived earlier than any:
    // take its anchor; else keep the least late, slowly forgotten.
    C[2] = off > C[2] || off < C[2] - SNAP_S ? off : C[2];
  }
  if (!fresh && !newEpoch) C[2] -= FORGET * dt;
  const est = Math.min(now + C[2], C[1] + AHEAD_S);
  if (newEpoch || !(C[0] === C[0]) || Math.abs(est - C[0]) > SNAP_S) {
    C[0] = est;
    C[3] = epoch;
    C[4] = 1;
    return est;
  }
  const pred = C[0] + dt;
  const step = Math.max(RATE_MIN * dt, Math.min(RATE_MAX * dt, dt + (est - pred) * Math.min(1, dt / TAU_S)));
  C[0] = Math.min(C[0] + step, C[1] + AHEAD_S);
  return C[0];
}

/** A leg first seen up to this many seconds after its start is drawn from its start (see `legStart`). */
export const LATE_MAX_S = 0.35;

/**
 * Where a leg is drawn from. A leg the rules began between two tables is first seen a little after its
 * start (up to a tick): drawn at its dates the actor would jump forward by what it should already have
 * covered (a truck at 7 m/s: half a metre). Instead the leg is drawn from its first point starting at the
 * frame that first sees it, and covers the rest by the leg's own end (a few per cent faster, the end date
 * kept). A leg seen later than LATE_MAX_S (a mount, a stall), or across a snap, is drawn at its dates.
 * K holds [t0 seen, start drawn from] per slot `i`. Returns the start to interpolate from.
 */
export function legStart(K: number[] | Float64Array, i: number, t0: number, t1: number, tNow: number, snap: boolean): number {
  'worklet';
  if (K[i * 2] !== t0) {
    K[i * 2] = t0;
    const late = tNow - t0;
    K[i * 2 + 1] = !snap && late > 0 && late < LATE_MAX_S && t1 - tNow > late ? tNow : t0;
  }
  return K[i * 2 + 1];
}

/** Metres behind and ahead of a vehicle that its facing is taken over (a corner turns through 45 degrees). */
export const FACE_LOOK_M = 1.6;

/** The point `s` metres along a polyline (clamped): writes x, y into out[0], out[1]. */
export function pointAtM(out: number[], pts: number[], np: number, s: number): void {
  'worklet';
  out[0] = pts[0];
  out[1] = pts[1];
  let rem = Math.max(0, s);
  for (let i = 1; i < np; i++) {
    const sx = pts[i * 2] - pts[i * 2 - 2];
    const sy = pts[i * 2 + 1] - pts[i * 2 - 1];
    const sl = Math.sqrt(sx * sx + sy * sy);
    if (rem <= sl || i === np - 1) {
      const f = sl > 0 ? Math.min(1, rem / sl) : 0;
      out[0] = pts[i * 2 - 2] + sx * f;
      out[1] = pts[i * 2 - 1] + sy * f;
      return;
    }
    rem -= sl;
  }
}

/**
 * The position at share u of a polyline and the direction of travel there, taken over FACE_LOOK_M behind
 * and ahead (a corner is turned, not snapped): out = [x, y, dx, dy]. `tmp` is a scratch of two.
 */
export function alongFacing(out: number[], tmp: number[], pts: number[], np: number, u: number): void {
  'worklet';
  along(out, pts, np, u);
  if (np < 2) return;
  const len = pathLen(pts, np);
  const s = Math.max(0, Math.min(1, u)) * len;
  pointAtM(tmp, pts, np, Math.min(len, s + FACE_LOOK_M));
  const ax = tmp[0];
  const ay = tmp[1];
  pointAtM(tmp, pts, np, Math.max(0, s - FACE_LOOK_M));
  const dx = ax - tmp[0];
  const dy = ay - tmp[1];
  if (dx * dx + dy * dy > 1e-6) {
    out[2] = dx;
    out[3] = dy;
  }
}

/** The driver's truck's legs (./actors.ts LEG_CODE). */
const LEG_OUT = 0;
const LEG_HOOK = 1;
const LEG_BACK = 2;
const LEG_WEIGH = 3;
const LEG_TIP = 4;
const LEG_WALK = 5;
const LEG_PARK = 6;

/**
 * The driver's truck at rules time `tNow` from the scene's truck numbers (./actors.ts RulesScene.truck)
 * and its leg's path: out = [x, y, heading8, hook frame (-1: none, 0..3 the hook-lift frames)]. Returns
 * false when the truck is on no leg (it stands where the rules put it). `tmp` is a scratch of four.
 *   out, back, park: along the path from t0 to t1 (the whole leg drives);
 *   tip: along the path until the drive's end (TR[12]), then the tip frames at the floor;
 *   hook: the hook frames at the skip; weigh: standing on the bridge (driving there first when the path
 *   has two points); walk: standing where it is (the driver walks to it).
 */
export function truckAt(out: number[], tmp: number[], TR: number[], TP: number[], tNow: number, from = NaN): boolean {
  'worklet';
  const leg = TR[6];
  if (leg < 0) return false;
  const np = Math.min(TR[11], 8);
  const t0 = from === from ? Math.max(TR[7], from) : TR[7];
  const t1 = TR[8];
  const driveEnd = TR[12] === TR[12] && TR[12] !== undefined ? Math.min(t1, TR[12]) : t1;
  const face = TR[13] !== undefined && TR[13] >= 0 ? TR[13] : TR[3];
  out[3] = -1;
  if (np < 1) {
    out[0] = TR[1];
    out[1] = TR[2];
    out[2] = face;
    return true;
  }
  const drives = np >= 2 && (leg === LEG_OUT || leg === LEG_BACK || leg === LEG_PARK || leg === LEG_TIP || leg === LEG_WEIGH);
  if (drives && tNow < driveEnd) {
    const span = driveEnd - t0;
    const u = span > 0 ? Math.max(0, Math.min(1, (tNow - t0) / span)) : 1;
    alongFacing(tmp, out, TP, np, u);
    out[0] = tmp[0];
    out[1] = tmp[1];
    out[2] = heading8(Math.atan2(tmp[3], tmp[2]));
    out[3] = -1;
    return true;
  }
  // Standing at the leg's end (its last point), facing the way it came in (or the frame's facing).
  out[0] = TP[np * 2 - 2];
  out[1] = TP[np * 2 - 1];
  if (np >= 2) {
    alongFacing(tmp, out, TP, np, 1);
    out[0] = TP[np * 2 - 2];
    out[1] = TP[np * 2 - 1];
    out[2] = heading8(Math.atan2(tmp[3], tmp[2]));
  } else out[2] = face;
  out[3] = -1;
  if (leg === LEG_HOOK) {
    const span = t1 - t0;
    const u = span > 0 ? (tNow - t0) / span : 1;
    out[3] = u < 0.5 ? 1 : 0;
  } else if (leg === LEG_TIP) {
    const span = t1 - driveEnd;
    const u = span > 0 ? (tNow - driveEnd) / span : 1;
    out[3] = u < 0.35 ? 2 : 3;
  } else if (leg === LEG_WALK || leg === LEG_WEIGH) out[3] = -1;
  return true;
}

/**
 * A crew member at rules time `tNow` (./actors.ts RulesScene.crew, CREW numbers from `o`): out = [x, y,
 * dx, dy] along his leg (from, via, to), from `from` when the leg was seen late (`legStart`). `P` is a
 * scratch path of at least six numbers. Returns the share
 * of the leg walked (1 when he stands: waiting or working at its end).
 */
export function crewAt(out: number[], P: number[], CR: number[], o: number, tNow: number, from = NaN): number {
  'worklet';
  const phase = CR[o + 10];
  const walking = phase === 1 || phase === 3;
  let np = 2;
  P[0] = CR[o + 2];
  P[1] = CR[o + 3];
  if (CR[o + 12] === CR[o + 12]) {
    P[2] = CR[o + 12];
    P[3] = CR[o + 13];
    np = 3;
  }
  P[np * 2 - 2] = CR[o + 4];
  P[np * 2 - 1] = CR[o + 5];
  const t0 = from === from ? Math.max(CR[o + 6], from) : CR[o + 6];
  const span = CR[o + 7] - t0;
  const u = walking ? (span > 0 ? Math.max(0, Math.min(1, (tNow - t0) / span)) : 1) : 1;
  along(out, P, np, u);
  return u;
}

/** Seconds between two steps of a turning facing (eight steps: a U-turn takes four, 0.4 s). */
export const STEP_S = 0.1;

/**
 * A facing of the eight that turns towards `want` one heading at a time (the shorter way), STEP_S apart;
 * F = [shown heading (NaN: none yet), time of the last step]. `snap` sets it at once (an epoch, the boss
 * at the wheel, the first frame). Returns the heading to draw.
 */
export function turnFacing(F: number[], want: number, clock: number, snap: boolean): number {
  'worklet';
  if (snap || !(F[0] === F[0])) {
    F[0] = want;
    F[1] = clock - STEP_S;
    return want;
  }
  if (F[0] === want) {
    // Settled: the next turn's first step comes at once.
    F[1] = clock - STEP_S;
    return want;
  }
  if (clock - F[1] < STEP_S - 1e-6) return F[0];
  const d = (((want - F[0]) % 8) + 8) % 8;
  F[0] = (((F[0] + (d <= 4 ? 1 : -1)) % 8) + 8) % 8;
  F[1] = clock;
  return F[0];
}
