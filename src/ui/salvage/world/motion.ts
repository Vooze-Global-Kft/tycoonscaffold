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
 *    and tip frames standing. Since the rules date every point of a phase's own path (frame.ts V1: `leg.at`,
 *    inside the fence at most truck.yardV, the lane faster), the truck passes each point at ITS date
 *    (`timedShare`): never faster than the rules' speed on that stretch, never along another phase's path.
 * 3. A CREW MEMBER ALONG HIS LEG (`crewAt`).
 * 4. A FACING THAT TURNS (`turnFacing`): a pictured vehicle whose wanted heading changes steps through the
 *    eight headings one at a time, STEP_S apart, so a turn reads as a turn and never as a flip.
 */
import { along, heading8, pathLen } from './actors';

/** At most this many points of a vehicle's path (./actors.ts PATH_MAX). */
const PATH_MAX_PTS = 12;

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
 * The share of a polyline's LENGTH reached at time `tau` when its points are passed at the dates
 * TT[ti], TT[ti + 1], ... (the rules' `at`): before the first date it stands at the first point, after the last
 * at the last; between two dates it moves evenly along that segment. Pure.
 */
export function timedShare(pts: number[], np: number, TT: number[], ti: number, tau: number): number {
  'worklet';
  if (np < 2) return 1;
  const total = pathLen(pts, np);
  if (!(total > 0)) return tau >= TT[ti + np - 1] ? 1 : 0;
  let s = 0;
  for (let i = 1; i < np; i++) {
    const sx = pts[i * 2] - pts[i * 2 - 2];
    const sy = pts[i * 2 + 1] - pts[i * 2 - 1];
    const sl = Math.sqrt(sx * sx + sy * sy);
    const ta = TT[ti + i - 1];
    const tb = TT[ti + i];
    if (tau < tb) {
      const k = tb > ta ? Math.max(0, (tau - ta) / (tb - ta)) : 0;
      return (s + sl * Math.min(1, k)) / total;
    }
    s += sl;
  }
  return 1;
}

/**
 * The time to read a dated path at when its start was first seen late (`from` after its first date: the
 * same warp as `legStart`, the last date kept). Pure.
 */
export function warpTau(tNow: number, from: number, a0: number, aN: number): number {
  'worklet';
  if (!(from === from) || from <= a0 || aN <= from) return tNow;
  if (tNow <= from) return a0;
  return a0 + ((tNow - from) * (aN - a0)) / (aN - from);
}

/**
 * Where the driver's truck's leg is drawn from (`legStart` for a truck, keyed by the leg's start AND its
 * phase: two phases may share a date, e.g. weigh's last point and tip's first). `TA` the dated points (or
 * none: the leg's t0). K = [leg t0, drawn from, phase]. Returns NaN when the truck is on no leg.
 */
export function truckFrom(K: number[], TR: number[], TA: number[], tNow: number, snap: boolean): number {
  'worklet';
  if (TR[6] < 0) return NaN;
  const np = Math.min(TR[11], PATH_MAX_PTS);
  const timed = np >= 1 && TA.length >= np;
  if (K[0] !== TR[7] || K[2] !== TR[6]) {
    K[0] = TR[7];
    K[2] = TR[6];
    const a0 = timed ? TA[0] : TR[7];
    const end = timed ? TA[np - 1] : TR[12] === TR[12] ? TR[12] : TR[8];
    const late = tNow - a0;
    K[1] = !snap && late > 0 && late < LATE_MAX_S && end - tNow > late ? tNow : a0;
  }
  return K[1];
}

/** truckAt on a dated path (frame.ts V1): see `truckAt`. out[2] is NaN while it stands on a one-point phase with no facing of its own (keep the shown one). */
function truckTimed(out: number[], tmp: number[], TR: number[], TP: number[], TA: number[], np: number, tNow: number, from: number): boolean {
  'worklet';
  const leg = TR[6];
  const t0 = TR[7];
  const t1 = TR[8];
  const a0 = TA[0];
  const aN = TA[np - 1];
  const tau = warpTau(tNow, from, a0, aN);
  const face = TR[13] !== undefined && TR[13] >= 0 ? TR[13] : NaN;
  out[3] = -1;
  if (np >= 2 && tau < aN) {
    alongFacing(tmp, out, TP, np, timedShare(TP, np, TA, 0, tau));
    out[0] = tmp[0];
    out[1] = tmp[1];
    out[2] = heading8(Math.atan2(tmp[3], tmp[2]));
    return true;
  }
  if (np >= 2) {
    alongFacing(tmp, out, TP, np, 1);
    out[2] = heading8(Math.atan2(tmp[3], tmp[2]));
  } else out[2] = face;
  out[0] = TP[np * 2 - 2];
  out[1] = TP[np * 2 - 1];
  if (leg === LEG_HOOK) {
    const span = t1 - t0;
    out[3] = (span > 0 ? (tNow - t0) / span : 1) < 0.5 ? 1 : 0;
  } else if (leg === LEG_TIP) {
    const span = t1 - aN;
    out[3] = (span > 0 ? (tNow - aN) / span : 1) < 0.35 ? 2 : 3;
  }
  return true;
}

/**
 * The driver's truck at rules time `tNow` from the scene's truck numbers (./actors.ts RulesScene.truck)
 * and its leg's path: out = [x, y, heading8, hook frame (-1: none, 0..3 the hook-lift frames)]. Returns
 * false when the truck is on no leg (it stands where the rules put it). `tmp` is a scratch of four.
 *   out, back, park: along the path from t0 to t1 (the whole leg drives);
 *   tip: along the path until the drive's end (TR[12]), then the tip frames at the floor;
 *   hook: the hook frames at the skip; weigh: standing on the bridge (driving there first when the path
 *   has two points); walk: standing where it is (the driver walks to it).
 */
export function truckAt(out: number[], tmp: number[], TR: number[], TP: number[], tNow: number, from = NaN, TA?: number[]): boolean {
  'worklet';
  const leg = TR[6];
  if (leg < 0) return false;
  const np = Math.min(TR[11], PATH_MAX_PTS);
  if (TA !== undefined && np >= 1 && TA.length >= np) return truckTimed(out, tmp, TR, TP, TA, np, tNow, from);
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

/** Metres past the fence over which the boss's truck's top speed eases from bossYardV to bossV (about a second at their mean). */
export const GATE_EASE_M = 8;

/**
 * The boss's truck's top speed at x (owner1 V3): bossYardV inside the fence (x at most the yard's width),
 * bossV on the lane from GATE_EASE_M past it, eased between (smoothstep over the distance: driving out it
 * gathers pace over about a second, driving in it slows over the same stretch and is at the yard's pace at
 * the gate). Pure; the frame loop calls it each frame.
 */
export function bossDriveV(x: number, W: number, yardV: number, laneV: number): number {
  'worklet';
  if (x <= W) return yardV;
  const u = Math.min(1, (x - W) / GATE_EASE_M);
  return yardV + (laneV - yardV) * u * u * (3 - 2 * u);
}

// =====================================================================================================
// 5. THE PICTURED VEHICLES' PLACES (the frame loop draws them; the tests replay them): the merchant's
//    flatbed on its round, the public's car, a purchase arriving. Moved here unchanged from ./frameLoop.ts
//    (owner1 play 2) so that the people's step aside and its test read the very places the frame draws.
// =====================================================================================================

/**
 * The merchant's flatbed while away (phase 2): along its dated drive-line path out, the same way back at the
 * round's end (owner1 V3), or evenly at FEEL's vehicle speed when the path has no dates. FB the scene's
 * flatbed numbers, FP its path, FA its dates, P a scratch path of PATH_MAX points. out = [x, y, dx, dy];
 * returns false while it is out of sight.
 */
export function flatbedAway(out: number[], tmp: number[], P: number[], FB: number[], FP: number[], FA: number[], tNow: number, vehicleV: number): boolean {
  'worklet';
  const np = Math.min(FB[6], PATH_MAX_PTS);
  for (let q = 0; q < np * 2; q++) P[q] = FP[q];
  if (np >= 2 && FA.length >= np) {
    const span = FA[np - 1] - FA[0];
    if (tNow < FA[np - 1]) alongFacing(out, tmp, P, np, timedShare(P, np, FA, 0, tNow));
    else if (tNow > FB[2] - span) {
      alongFacing(out, tmp, P, np, timedShare(P, np, FA, 0, FA[0] + (FB[2] - tNow)));
      out[2] = -out[2];
      out[3] = -out[3];
    } else return false;
    return true;
  }
  if (np < 2) return false;
  const len = pathLen(P, np);
  const drive = Math.min((FB[2] - FB[1]) / 2, len / vehicleV);
  const since = tNow - FB[1];
  const left = FB[2] - tNow;
  if (since < drive) along(out, P, np, since / drive);
  else if (left < drive) {
    along(out, P, np, left / drive);
    out[2] = -out[2];
    out[3] = -out[3];
  } else return false;
  return true;
}

/** The public's car: in through the gate (gx, gy), standing at the drop-off, out again. CA the scene's car numbers; false: not drawn. */
export function carAt(out: number[], P: number[], CA: number[], gx: number, gy: number, tNow: number, vehicleV: number): boolean {
  'worklet';
  if (CA[0] !== 1) return false;
  P[0] = CA[1];
  P[1] = CA[2];
  P[2] = gx;
  P[3] = gy;
  P[4] = CA[3];
  P[5] = CA[4];
  const len = pathLen(P, 3);
  const drive = Math.min((CA[6] - CA[5]) / 2, len / vehicleV);
  const since = tNow - CA[5];
  const left = CA[6] - tNow;
  if (since < drive) along(out, P, 3, since / drive);
  else if (left < drive) {
    along(out, P, 3, left / drive);
    out[2] = -out[2];
    out[3] = -out[3];
  } else {
    out[0] = CA[3];
    out[1] = CA[4];
    out[2] = -1;
    out[3] = 0;
  }
  return !(since < 0 || left < 0);
}

/**
 * A purchase arriving (ARRIVAL numbers from `o` of AR): along the frame's dated path to its stop and set
 * down there (owner1 V4), else between from and to. out = [x, y]; returns the 4-heading to draw.
 * P a scratch path, TA a scratch of PATH_MAX dates.
 */
export function arrivalAt(out: number[], tmp: number[], P: number[], TA: number[], AR: number[], o: number, AP: number[], AT: number[], tNow: number): number {
  'worklet';
  const ph = AR[o + 1];
  const span = AR[o + 7] - AR[o + 6];
  const u = span > 0 ? Math.max(0, Math.min(1, (tNow - AR[o + 6]) / span)) : 1;
  out[0] = AR[o + 4];
  out[1] = AR[o + 5];
  let h4 = 1;
  const anp = Math.min(AR[o + 8] ?? 0, PATH_MAX_PTS);
  if (anp >= 2) {
    const p0 = AR[o + 9];
    for (let q = 0; q < anp * 2; q++) P[q] = AP[p0 * 2 + q];
    for (let q = 0; q < anp; q++) TA[q] = AT[p0 + q];
    alongFacing(out, tmp, P, anp, ph === 1 ? 1 : timedShare(P, anp, TA, 0, tNow));
    if (ph === 1) {
      out[0] = P[anp * 2 - 2];
      out[1] = P[anp * 2 - 1];
    } else {
      const dx = out[2];
      const dy = out[3];
      h4 = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 0 : 2;
    }
  } else if (ph !== 1) {
    const k = ph === 0 ? u : 1 - u;
    out[0] = AR[o + 2] + (AR[o + 4] - AR[o + 2]) * k;
    out[1] = AR[o + 3] + (AR[o + 5] - AR[o + 3]) * k;
    const dx = (AR[o + 4] - AR[o + 2]) * (ph === 0 ? 1 : -1);
    const dy = (AR[o + 5] - AR[o + 3]) * (ph === 0 ? 1 : -1);
    h4 = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 0 : 2;
  }
  return h4;
}

// =====================================================================================================
// 6. PEOPLE STEP ASIDE (owner1 play 2, the lead's ruling: "on the screen only; dated legs stay dated").
//    While a moving vehicle's drawn body (its footprint, plus ASIDE_PAD_M either side, swept over the next
//    ASIDE_AHEAD_S of its motion) would cover a person's place, that person is DRAWN stepped off its path to
//    the nearer side, eased out and back, by at most ASIDE_MAX_M. His rules place is untouched.
// =====================================================================================================

/** Numbers per vehicle body: x, y, ux, uy (unit facing as drawn), half length, half width, vx, vy (m/s). */
export const VB_STRIDE = 8;
export const ASIDE_PAD_M = 0.4;
export const ASIDE_AHEAD_S = 1;
export const ASIDE_MAX_M = 1.6;
/** Time constant of the step aside (out and back), seconds. */
export const ASIDE_EASE_S = 0.12;
/** Below this speed (m/s) a vehicle stands: nobody steps aside from it. */
export const MOVING_V = 0.3;
/** Vehicle slots of the previous-place memory: the truck, the flatbed, the van, its trailer, four arrivals. */
export const VB_SLOTS = 8;

/** The unit facing of an 8-heading (0 s, 2 e, 4 n, 6 w; y south): writes ux, uy into out[0], out[1]. */
export function facing8(out: number[], h8: number): void {
  'worklet';
  const a = Math.PI / 2 - (h8 * Math.PI) / 4;
  out[0] = Math.cos(a);
  out[1] = Math.sin(a);
}

/**
 * Appends a vehicle's drawn body to VB (n bodies in it) with its speed from its place in the previous frame
 * (PV, two numbers per slot; NaN: not drawn then). Returns the new count. `back` shifts the body's centre that
 * many metres behind (x, y) along the facing (the van's trailer).
 */
export function bodyInto(VB: number[] | Float64Array, n: number, PV: Float64Array, slot: number, x: number, y: number, ux: number, uy: number, halfL: number, halfW: number, dt: number, back: number): number {
  'worklet';
  const cx = x - ux * back;
  const cy = y - uy * back;
  const px = PV[slot * 2];
  const py = PV[slot * 2 + 1];
  PV[slot * 2] = cx;
  PV[slot * 2 + 1] = cy;
  const o = n * VB_STRIDE;
  if (o + VB_STRIDE > VB.length) return n;
  VB[o] = cx;
  VB[o + 1] = cy;
  VB[o + 2] = ux;
  VB[o + 3] = uy;
  VB[o + 4] = halfL;
  VB[o + 5] = halfW;
  VB[o + 6] = px === px && dt > 0 ? (cx - px) / dt : 0;
  VB[o + 7] = py === py && dt > 0 ? (cy - py) / dt : 0;
  return n + 1;
}

/**
 * Where a person whose RULES place is (px, py) should be drawn offset to, given the moving bodies VB: writes
 * the target offset (metres) into out[0], out[1]. The path is the vehicle's MOTION (its velocity), the body
 * is its drawn footprint seen along that motion; the person goes to the side of the path he is DRAWN on now
 * (rules place plus the current offset ox, oy), so somebody crossing the path never flips through the body.
 * Pure.
 */
export function asideTarget(out: number[], px: number, py: number, VB: number[] | Float64Array, n: number, ox0 = 0, oy0 = 0): void {
  'worklet';
  let ox = 0;
  let oy = 0;
  for (let i = 0; i < n; i++) {
    const o = i * VB_STRIDE;
    const vx = VB[o + 6];
    const vy = VB[o + 7];
    const sp = Math.sqrt(vx * vx + vy * vy);
    if (sp < MOVING_V) continue;
    // The motion's frame: p along it, q across it (q = (-py, px)).
    const mx = vx / sp;
    const my = vy / sp;
    const ux = VB[o + 2];
    const uy = VB[o + 3];
    const hl = VB[o + 4];
    const hw = VB[o + 5];
    // The footprint's half extents along and across the motion (a box turned to its facing).
    const ua = ux * mx + uy * my;
    const ub = -ux * my + uy * mx;
    const ea = hl * Math.abs(ua) + hw * Math.abs(ub) + ASIDE_PAD_M;
    const eb = hl * Math.abs(ub) + hw * Math.abs(ua) + ASIDE_PAD_M;
    const dx = px - VB[o];
    const dy = py - VB[o + 1];
    const a = dx * mx + dy * my;
    const b = -dx * my + dy * mx;
    if (a <= -ea || a >= ea + sp * ASIDE_AHEAD_S || b <= -eb || b >= eb) continue;
    // To the side he is drawn on now.
    const bDrawn = b + (-ox0 * my + oy0 * mx);
    const db = bDrawn < 0 ? -eb - b : eb - b;
    ox += -my * db;
    oy += mx * db;
  }
  const m = Math.sqrt(ox * ox + oy * oy);
  if (m > ASIDE_MAX_M) {
    ox *= ASIDE_MAX_M / m;
    oy *= ASIDE_MAX_M / m;
  }
  out[0] = ox;
  out[1] = oy;
}

/**
 * One person's drawn place this frame: the rules place (px, py) plus the eased step aside (OFF holds the
 * offset of slot i, two numbers). out[0], out[1] = the drawn place. `snap` sets the offset at once.
 */
export function stepAside(out: number[], OFF: Float64Array, i: number, px: number, py: number, VB: number[] | Float64Array, n: number, dt: number, snap: boolean): void {
  'worklet';
  asideTarget(out, px, py, VB, n, OFF[i * 2], OFF[i * 2 + 1]);
  const e = snap ? 1 : 1 - Math.exp(-dt / ASIDE_EASE_S);
  const ox = OFF[i * 2] + (out[0] - OFF[i * 2]) * e;
  const oy = OFF[i * 2 + 1] + (out[1] - OFF[i * 2 + 1]) * e;
  OFF[i * 2] = ox;
  OFF[i * 2 + 1] = oy;
  out[0] = px + ox;
  out[1] = py + oy;
}

/** Is (px, py) inside the drawn body o of VB (its footprint as drawn, no pad)? Pure (the test's measure). */
export function insideBody(VB: number[] | Float64Array, o: number, px: number, py: number): boolean {
  'worklet';
  const dx = px - VB[o];
  const dy = py - VB[o + 1];
  const a = dx * VB[o + 2] + dy * VB[o + 3];
  const b = -dx * VB[o + 3] + dy * VB[o + 2];
  return Math.abs(a) < VB[o + 4] && Math.abs(b) < VB[o + 5];
}
