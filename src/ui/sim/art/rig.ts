/**
 * The character rig: turns "what is this character doing" into one matrix per
 * body part, every frame, on the UI thread.
 *
 * One worklet call per character does everything: blends pose weights, runs
 * the pose maths, and writes the matrices into a preallocated object that the
 * Skia nodes read through `select(rig, key)`. No allocation per frame and no
 * React involvement.
 */
import type { BodyDims } from './characterArt';
import { POSES, type Pose } from './types';

/** Screen pixels per drawing unit at `scale = 1`: a round adult stands about 50 px tall. */
export const UNIT = 0.52;
/** Hip height of a seated character above the floor point, in drawing units. Chairs are built to match. */
export const SEAT_HEIGHT = 15.5;
/** Height in pixels of a standing adult at `scale = 1`, hats not included. */
export const CHARACTER_HEIGHT = Math.round(96 * UNIT);

export const RIG_KEYS = [
  'shadow',
  'headBack',
  'legB',
  'legF',
  'torso',
  'armB',
  'handB',
  'head',
  'eyes',
  'eyesShut',
  'mouthSmile',
  'mouthOpen',
  'mouthChew',
  'spoon',
  'bowl',
  'steam',
  'armF',
  'handF',
  'tray',
  'dough',
  'bite',
  'bubble',
  'z1',
  'z2',
  'z3',
  'heart',
  'crumb1',
  'crumb2',
  'spark1',
  'spark2',
] as const;
export type RigKey = (typeof RIG_KEYS)[number];
/** One 3x3 matrix (row-major, 9 numbers) per part. */
export type Rig = Record<RigKey, number[]>;

export function makeRig(): Rig {
  const r = {} as Rig;
  for (const k of RIG_KEYS) r[k] = [0, 0, 0, 0, 0, 0, 0, 0, 1];
  return r;
}

export const POSE_INDEX = Object.fromEntries(POSES.map((p, i) => [p, i])) as Record<Pose, number>;

/** Per-character memory that lives on the UI thread between frames. */
export interface RigState {
  ready: boolean;
  /** Clock value of the previous frame, ms. */
  t: number;
  /** Blend weight of each pose; they always add up to 1. */
  w: number[];
  /** Facing, eased through 0 so a turn is a quick flip rather than a jump. */
  f: number;
  x: number;
  y: number;
  /** 0 standing still, 1 moving (used by `carry`). */
  mv: number;
  flip: number;
  /** Clock (ms) when the current `sit-wait` began, -1 when not waiting (a guest grows impatient after about 4 s). */
  wait: number;
  root: number[];
  a: Rig;
  b: Rig;
}

export function makeRigState(): RigState {
  return { ready: false, t: 0, w: POSES.map(() => 0), f: 1, x: 0, y: 0, mv: 0, flip: 0, wait: -1, root: [1, 0, 0, 0, 1, 0, 0, 0, 1], a: makeRig(), b: makeRig() };
}

/** What the rig needs to know about one character. */
export interface RigConfig {
  d: BodyDims;
  /** Mouth height in head units (moustaches push it down). */
  mouthY: number;
  /** Face shift towards the facing side, head units. */
  faceX: number;
  /** Seconds added to the clock so a crowd does not blink and breathe in step. */
  offset: number;
  /** Top of the head, hair and hat in head units (negative): a tossed pizza clears it. */
  top: number;
}

/** out = parent * translate(tx, ty) * rotate(rot) * scale(sx, sy) */
function put(o: number[], p: number[], tx: number, ty: number, rot: number, sx: number, sy: number) {
  'worklet';
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const a = c * sx;
  const b = s * sx;
  const cc = -s * sy;
  const d = c * sy;
  o[0] = p[0] * a + p[1] * b;
  o[1] = p[0] * cc + p[1] * d;
  o[2] = p[0] * tx + p[1] * ty + p[2];
  o[3] = p[3] * a + p[4] * b;
  o[4] = p[3] * cc + p[4] * d;
  o[5] = p[3] * tx + p[4] * ty + p[5];
}

/** Shows a part at (tx, ty) with size `s` (0 hides it). */
function pop(o: number[], p: number[], tx: number, ty: number, rot: number, s: number) {
  'worklet';
  if (s < 0.02) {
    o[0] = 0;
    o[1] = 0;
    o[3] = 0;
    o[4] = 0;
    return;
  }
  put(o, p, tx, ty, rot, s, s);
}

/**
 * Leg swing for a walk cycle that never crosses the legs: each leg swings far to its own side
 * (front leg forwards, back leg backwards) and only a little past the centre line.
 */
function stride(s: number, own: number, other: number) {
  'worklet';
  return s > 0 ? own * s : other * s;
}

function ease(x: number) {
  'worklet';
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

/** 0 at the ends, 1 in the middle, with soft shoulders: fades things in and out over a 0..1 life. */
function life(u: number, fadeIn: number, fadeOut: number) {
  'worklet';
  if (u <= 0 || u >= 1) return 0;
  const a = u / fadeIn;
  const b = (1 - u) / fadeOut;
  const m = a < b ? a : b;
  return m > 1 ? 1 : m;
}

const TAU = Math.PI * 2;
const N = POSES.length;
const EYE_Y = 3.5;
/** How far a walking leg may swing past the centre line (rad): small, so the legs never cross. */
const LEG_BACK = 0.2;

/**
 * Advances one character by one frame and returns its matrices.
 * `clock` is in milliseconds (Skia's `useClock`), `facing` is 1 or -1.
 */
export function stepRig(st: RigState, c: RigConfig, x: number, y: number, facing: number, pose: number, clock: number, scale: number): Rig {
  'worklet';
  const d = c.d;
  const w = st.w;
  // --- time, blending -----------------------------------------------------
  let dt = clock - st.t;
  if (!st.ready) {
    st.ready = true;
    for (let i = 0; i < N; i++) w[i] = i === pose ? 1 : 0;
    st.f = facing;
    st.x = x;
    st.y = y;
    st.mv = 0;
    dt = 0;
  }
  if (dt < 0) dt = 0;
  if (dt > 100) dt = 100;
  st.t = clock;
  if (dt > 0) {
    const k = 1 - Math.exp(-dt / 85);
    let sum = 0;
    for (let i = 0; i < N; i++) {
      let v = w[i] + ((i === pose ? 1 : 0) - w[i]) * k;
      if (v < 0.003) v = 0;
      w[i] = v;
      sum += v;
    }
    if (sum > 0) for (let i = 0; i < N; i++) w[i] /= sum;
    st.f += (facing - st.f) * (1 - Math.exp(-dt / 55));
    if (Math.abs(facing - st.f) < 0.02) st.f = facing;
    const dx = x - st.x;
    const dy = y - st.y;
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;
    st.mv += ((speed > 0.006 ? 1 : 0) - st.mv) * (1 - Math.exp(-dt / 110));
  }
  // When this sit-wait began (clock ms), so impatience follows the scene clock even at a low frame rate.
  if (pose !== 5) st.wait = -1;
  else if (st.wait < 0) st.wait = clock;
  const imp = st.wait < 0 ? 0 : ease((clock - st.wait - 4000) / 600);
  st.x = x;
  st.y = y;
  const t = clock / 1000 + c.offset;

  // --- pose maths: every active pose adds its share ------------------------
  let by = 0; // body up
  let bt = 0; // body lean towards the facing side (rad)
  let bs = 0; // stretch (+) or squash (-)
  let hx = 0;
  let hy = 0;
  let ht = 0; // head nod towards the facing side
  let aF = 0; // arm angles: 0 hangs down, + swings towards the facing side
  let aB = 0;
  let sF = 0; // arm stretch
  let sB = 0;
  let lF = 0; // leg angles
  let lB = 0;
  let fF = 0; // foot lift
  let fB = 0;
  let air = 0; // 1 = feet off the floor (sitting, jumping)
  let jump = 0;
  let happy = 0;
  let sleepy = 0;
  let mo = 0; // mouth open
  let mc = 0; // chewing
  let chew = 0; // chew wobble, -1..1
  let wTray = 0;
  let wDough = 0;
  let doughH = 0;
  let doughSpin = 0;
  let wBowl = 0;
  let stir = 0;
  let wBite = 0;
  let wBub = 0;
  let wZ = 0;
  let wEat = 0;
  let eatU = 0;
  let wSpark = 0;
  let mImp = 0; // impatient "o" mouth

  const walkPh = t * TAU * 1.55;
  const ws = Math.sin(walkPh);
  const wc = Math.cos(walkPh);
  const breath = Math.sin(t * 1.9);

  let p = w[0]; // idle
  if (p > 0) {
    by += p * 0.5 * breath;
    bs += p * 0.014 * breath;
    hy += p * 0.6 * breath;
    ht += p * 0.025 * Math.sin(t * 0.73);
    aF += p * (0.13 + 0.03 * breath);
    aB += p * (-0.13 - 0.03 * breath);
  }
  p = w[1]; // walk
  if (p > 0) {
    lF += p * stride(ws, 0.55, LEG_BACK);
    lB -= p * stride(ws, 0.55, LEG_BACK);
    fF += p * 3.6 * (wc > 0 ? wc : 0);
    fB += p * 3.6 * (wc < 0 ? -wc : 0);
    aF += p * (0.1 - 0.6 * ws);
    aB += p * (-0.1 + 0.6 * ws);
    // A springy bob at twice the step rate (feet planted at the low point).
    by += p * (1.1 + 1.9 * Math.cos(2 * walkPh));
    bt += p * (0.075 + 0.02 * ws);
    ht += p * (-0.035 - 0.02 * ws);
    hy += p * 0.6 * Math.cos(2 * walkPh - 0.7);
  }
  p = w[2]; // carry
  if (p > 0) {
    const m = st.mv;
    lF += p * m * stride(ws, 0.5, LEG_BACK);
    lB -= p * m * stride(ws, 0.5, LEG_BACK);
    fF += p * m * 3.2 * (wc > 0 ? wc : 0);
    fB += p * m * 3.2 * (wc < 0 ? -wc : 0);
    by += p * (m * (0.9 + 1.5 * Math.cos(2 * walkPh)) + (1 - m) * 0.5 * breath);
    bt += p * m * 0.04;
    hy += p * (m * 0.5 * Math.cos(2 * walkPh - 0.7) + (1 - m) * 0.6 * breath);
    // The classic waiter hold: upper arm out, elbow bent, the tray up at shoulder height on the palm.
    aF += p * (2.25 + 0.03 * Math.sin(2 * walkPh) * m);
    sF += p * -0.36;
    aB += p * (-0.12 + m * 0.45 * ws);
    wTray += p;
  }
  p = w[3]; // cook
  if (p > 0) {
    const ph = t * TAU * 2;
    const bob = Math.abs(Math.sin(ph * 0.5));
    aB += p * 1.0;
    sB += p * -0.32;
    aF += p * (-0.35 + 0.36 * Math.sin(ph));
    sF += p * (-0.42 + 0.09 * Math.cos(ph));
    by += p * 0.7 * bob;
    bt += p * 0.05;
    ht += p * (0.11 + 0.035 * Math.sin(ph * 0.5));
    hy += p * 0.4 * bob;
    wBowl += p;
    stir += p * Math.sin(ph);
  }
  p = w[4]; // toss
  if (p > 0) {
    // One-handed pizzaiolo toss, 1.3 s: the dough lands on the raised fist (u = 0), the hand gives
    // with the weight and winds up, flicks it high over the hat (u = 0.22), and waits for it.
    const u = (t / 1.3) % 1;
    let a = 2.75; // front arm: raised, a little forward
    let s = 0.12;
    let b = 0;
    let sq = 0;
    let look = 0;
    if (u < 0.17) {
      const k = Math.sin((Math.PI * u) / 0.17);
      a -= 0.62 * k;
      s -= 0.3 * k;
      b = -1.6 * k;
      sq = -0.045 * k;
    } else if (u < 0.27) {
      const k = Math.sin((Math.PI * (u - 0.17)) / 0.1);
      a += 0.22 * k;
      s += 0.22 * k;
      b = 1.4 * k;
      sq = 0.04 * k;
    }
    if (u > 0.22) {
      const k = (u - 0.22) / 0.78;
      doughH += p * 4 * k * (1 - k);
      look = Math.sin(Math.PI * k);
    }
    aF += p * a;
    sF += p * s;
    aB += p * (-0.75 - 0.08 * Math.sin(t * 2.4));
    sB += p * -0.12;
    by += p * b;
    bs += p * sq;
    ht -= p * 0.1 * look;
    hy += p * 0.5 * look;
    wDough += p;
    doughSpin = u * TAU * 3;
  }
  const seat = SEAT_HEIGHT - d.leg;
  p = w[5]; // sit-wait
  if (p > 0) {
    const sw = Math.sin(t * 3.3);
    const swF = imp > 0 ? Math.sin(t * (3.3 + 5 * imp)) : sw;
    by += p * (seat + 0.3 * breath);
    air += p;
    // Knees bent so the feet hang down by the chair's front legs; an impatient guest taps faster.
    lF += p * (0.74 + (0.16 + 0.06 * imp) * swF);
    lB += p * (0.6 - 0.16 * swF);
    aF += p * 0.75;
    aB += p * 0.5;
    sF += p * -0.12;
    sB += p * -0.2;
    ht += p * (0.06 * Math.sin(t * 1.3) * (1 - imp) - 0.09 * imp);
    hy += p * 0.5 * breath;
    // Impatient after about 4 s: a small "o" mouth, a huff now and then, the head tipped back.
    mImp += p * imp;
    by += p * imp * 0.6 * Math.max(0, Math.sin(t * 2.1)) ** 8;
    wBub += p;
  }
  p = w[6]; // sit-eat
  if (p > 0) {
    const u = (t / 1.7) % 1;
    eatU = u;
    const r = u < 0.2 ? ease(u / 0.2) : u < 0.33 ? 1 : u < 0.52 ? 1 - ease((u - 0.33) / 0.19) : 0;
    const ch = ease((u - 0.3) / 0.08) * (1 - ease((u - 0.94) / 0.06));
    by += p * (seat + 0.5 * ch * Math.abs(Math.sin(t * TAU * 3)));
    air += p;
    lF += p * (0.74 + 0.1 * Math.sin(t * 5));
    lB += p * (0.6 - 0.1 * Math.sin(t * 5));
    aF += p * (0.85 + 1.2 * r);
    sF += p * (-0.1 + 0.1 * r);
    aB += p * 0.5;
    sB += p * -0.2;
    ht += p * (0.1 * r + 0.03 * ch * Math.sin(t * TAU * 3));
    hy += p * -0.6 * r;
    mo += p * life((u - 0.14) / 0.2, 0.3, 0.3);
    mc += p * ch;
    chew = Math.sin(t * TAU * 3);
    happy += p * ch;
    wBite += p;
    wEat += p;
  }
  p = w[7]; // cheer
  if (p > 0) {
    const u = (t / 0.64) % 1;
    let h = 0;
    let sq = 0;
    let up = 0;
    if (u < 0.16) sq = -0.07 * Math.sin((Math.PI * u) / 0.16);
    else if (u < 0.86) {
      const k = (u - 0.16) / 0.7;
      up = Math.sin(Math.PI * k);
      h = 9.5 * 4 * k * (1 - k);
      sq = 0.06 * up;
    } else sq = -0.07 * Math.sin((Math.PI * (u - 0.86)) / 0.14);
    by += p * h;
    bs += p * sq;
    air += p * (h > 0.5 ? 1 : h * 2);
    jump += p * (h / 9.5);
    lF += p * 0.3 * up;
    lB -= p * 0.3 * up;
    const wv = 0.16 * Math.sin(t * TAU * 3.1);
    aF += p * (2.25 + wv);
    aB -= p * (2.25 - wv);
    sF += p * (0.3 + 0.15 * up);
    sB += p * (0.3 + 0.15 * up);
    ht -= p * 0.06;
    hy += p * 0.8 * up;
    happy += p;
    mo += p;
    wSpark += p;
  }
  p = w[8]; // sleep
  if (p > 0) {
    const slow = Math.sin(t * 1.3);
    bt += p * 0.1;
    by += p * (-0.9 + 0.5 * slow);
    bs += p * 0.02 * slow;
    ht += p * (0.3 + 0.035 * slow);
    hy += p * (-1.6 + 0.7 * slow);
    hx += p * 1.2;
    aF += p * 0.06;
    aB += p * 0.02;
    sleepy += p;
    wZ += p;
  }
  p = w[9]; // wave
  if (p > 0) {
    const hop = Math.abs(Math.sin(t * TAU * 1.3));
    aF += p * (2.3 + 0.33 * Math.sin(t * TAU * 2.6));
    sF += p * 0.32;
    aB += p * -0.16;
    by += p * 0.7 * hop;
    ht -= p * 0.07;
    hy += p * 0.4 * hop;
    mo += p;
  }

  // --- forward kinematics --------------------------------------------------
  const o = st.flip === 0 ? st.a : st.b;
  st.flip = 1 - st.flip;
  const k = UNIT * scale;
  const R = st.root;
  // Turning: the facing sign flips at once and the width only dips to 55% (a quick pivot, never a paper-thin frame).
  const turn = st.f < 0 ? -st.f : st.f;
  R[0] = k * (facing < 0 ? -1 : 1) * (0.55 + 0.45 * turn);
  R[2] = x;
  R[4] = k * (1 + 0.05 * (1 - turn));
  R[5] = y;

  if (air > 1) air = 1;
  const sy = 1 + bs;
  const sx = 1 - bs * 0.6;
  const hipY = -(d.leg + by);
  const sb = Math.sin(bt);
  const cb = Math.cos(bt);

  const sh = 1 - 0.28 * (jump > 1 ? 1 : jump);
  put(o.shadow, R, 0, 0, 0, sh, sh);
  put(o.torso, R, 0, hipY, bt, sx, sy);

  // Legs: planted feet stay on the floor while the hips bob.
  let g = (d.leg + by - fF) / (d.leg * Math.cos(lF));
  g = g < 0.7 ? 0.7 : g > 1.3 ? 1.3 : g;
  put(o.legF, R, cb * d.hipX, hipY + sb * d.hipX, -lF, 1, 1 + (g - 1) * (1 - air));
  g = (d.leg + by - fB) / (d.leg * Math.cos(lB));
  g = g < 0.7 ? 0.7 : g > 1.3 ? 1.3 : g;
  put(o.legB, R, -cb * d.hipX, hipY - sb * d.hipX, -lB, 1, 1 + (g - 1) * (1 - air));

  // Head.
  const up = d.torso * sy + hy;
  const nx = sb * up + cb * hx;
  const ny = hipY - cb * up + sb * hx;
  const hr = bt * 0.5 + ht;
  const hcx = nx + Math.sin(hr) * d.headUp;
  const hcy = ny - Math.cos(hr) * d.headUp;
  const hs = d.headScale;
  put(o.head, R, hcx, hcy, hr, hs, hs);
  const H = o.head;
  const B = o.headBack;
  B[0] = H[0];
  B[1] = H[1];
  B[2] = H[2];
  B[3] = H[3];
  B[4] = H[4];
  B[5] = H[5];

  // Eyes: blink now and then; happy eyes arch up, sleeping eyes arch down.
  const tb = (t * 1.07) % 3.9;
  const tb2 = (t + 1.7) % 9.7;
  let blink = tb < 0.14 ? Math.sin((Math.PI * tb) / 0.14) : 0;
  if (tb2 < 0.14) blink = Math.sin((Math.PI * tb2) / 0.14);
  let shut = happy + sleepy;
  if (shut > 1) shut = 1;
  const open = (1 - 0.93 * blink) * (1 - shut);
  if (open < 0.04) pop(o.eyes, H, 0, 0, 0, 0);
  else put(o.eyes, H, 0, EYE_Y * (1 - open), 0, 1, open);
  if (shut < 0.04) pop(o.eyesShut, H, 0, 0, 0, 0);
  else {
    const dir = happy >= sleepy ? 1 : -1;
    put(o.eyesShut, H, 0, EYE_Y * (1 - dir * shut), 0, 1, dir * shut);
  }

  // Mouth: whichever expression is strongest shows; the others shrink away.
  if (mo < mImp * 0.85) mo = mImp * 0.85;
  if (mo > 1) mo = 1;
  if (mc > 1) mc = 1;
  const my = c.mouthY;
  const fx = c.faceX;
  const calm = 1 - (mo > mc ? mo : mc);
  if (calm < 0.04) pop(o.mouthSmile, H, 0, 0, 0, 0);
  else put(o.mouthSmile, H, fx * (1 - calm), my * (1 - calm), 0, calm, calm);
  const openM = mo * (1 - mc);
  if (openM < 0.04) pop(o.mouthOpen, H, 0, 0, 0, 0);
  else {
    // The impatient "o": the open mouth, narrower and rounder.
    const ow = openM * (1 - 0.45 * mImp);
    put(o.mouthOpen, H, fx * (1 - ow), my * (1 - openM), 0, ow, openM);
  }
  if (mc < 0.04) pop(o.mouthChew, H, 0, 0, 0, 0);
  else {
    const qx = mc * (1 + 0.1 * chew);
    const qy = mc * (1 - 0.12 * chew);
    put(o.mouthChew, H, (fx + 8) * (1 - qx), (my - 1) * (1 - qy), 0, qx, qy);
  }

  // Arms and hands.
  const shY = d.shoulderY * sy;
  const shX = d.shoulderX * sx;
  let px = cb * shX + sb * shY;
  let py = hipY + sb * shX - cb * shY;
  let len = 1 + sF;
  put(o.armF, R, px, py, -aF, 1, len);
  const hFx = px + Math.sin(aF) * d.arm * len;
  const hFy = py + Math.cos(aF) * d.arm * len;
  put(o.handF, R, hFx, hFy, -aF, 1, 1);
  px = -cb * shX + sb * shY;
  py = hipY - sb * shX - cb * shY;
  len = 1 + sB;
  put(o.armB, R, px, py, -aB, 1, len);
  const hBx = px + Math.sin(aB) * d.arm * len;
  const hBy = py + Math.cos(aB) * d.arm * len;
  put(o.handB, R, hBx, hBy, -aB, 1, 1);

  // Things in the hands.
  pop(o.tray, R, hFx + 5, hFy - 4.6, bt * 0.5, wTray);
  if (wDough < 0.02) pop(o.dough, R, 0, 0, 0, 0);
  else {
    // `doughH` is 0..1 of the flight; the peak clears the top of the hat by a dough's thickness.
    const rest = hFy - 5.5;
    const peak = hcy + c.top * hs - 14;
    const rise = rest - peak > 28 ? rest - peak : 28;
    const wob = Math.sin(doughSpin);
    const fly = doughH / (wDough > 0.02 ? wDough : 1);
    put(o.dough, R, hFx + 4 + 1.2 * wob * fly, rest - rise * doughH, 0.16 * wob * fly, wDough * (1 - 0.12 * fly * Math.cos(doughSpin) ** 2), wDough * (1 + 0.7 * fly * Math.sin(doughSpin) ** 2));
  }
  pop(o.bowl, R, hBx + 1.5, hBy + 1, bt, wBowl);
  // The spoon leans from the stirring hand down into the bowl.
  pop(o.spoon, R, hFx, hFy, 0.75 + 0.22 * stir, wBowl);
  if (wBowl < 0.02) pop(o.steam, R, 0, 0, 0, 0);
  else {
    // A puff of steam rises from the bowl about once a second.
    const u = (t * 0.95) % 1;
    pop(o.steam, R, hBx - 9 + 2 * Math.sin(u * 5) - 6 * u, hBy - 5 - 10 * u, 0.3 * Math.sin(u * 4), wBowl * (0.5 + 0.5 * u) * life(u, 0.2, 0.45));
  }
  pop(o.bite, R, hFx + 1, hFy - 1.5, 0, wBite);

  // Little effects around the head.
  if (wBub < 0.02) pop(o.bubble, R, 0, 0, 0, 0);
  else {
    // Up and to the face side of the head; a tall hat pushes it higher and further out.
    const tall = c.top < -30 ? -30 - c.top : 0;
    pop(o.bubble, R, hcx + (27 + 0.45 * tall) * hs, hcy - (34 + 0.55 * tall) * hs + 1.3 * Math.sin(t * 1.9), 0.04 * Math.sin(t * 1.3), wBub * (1 + 0.035 * Math.sin(t * 3.1)));
  }
  if (wZ < 0.02) {
    pop(o.z1, R, 0, 0, 0, 0);
    pop(o.z2, R, 0, 0, 0, 0);
    pop(o.z3, R, 0, 0, 0, 0);
  } else {
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.4 + i / 3) % 1;
      const size = wZ * (0.55 + 0.75 * u) * life(u, 0.15, 0.25);
      pop(i === 0 ? o.z1 : i === 1 ? o.z2 : o.z3, R, hcx + 17 + 13 * u + 2.5 * Math.sin(u * 9), hcy - 22 - 26 * u, 0.25 * Math.sin(u * 7), size);
    }
  }
  if (wEat < 0.02) {
    pop(o.heart, R, 0, 0, 0, 0);
    pop(o.crumb1, R, 0, 0, 0, 0);
    pop(o.crumb2, R, 0, 0, 0, 0);
  } else {
    const u = (t / 3.4 + 0.35) % 1;
    pop(o.heart, R, hcx - 23 + 3 * Math.sin(u * 9), hcy - 24 - 20 * u, 0.2 * Math.sin(u * 8), wEat * (0.6 + 0.6 * u) * life(u, 0.12, 0.3));
    const v = (eatU - 0.3) / 0.3;
    const cs = wEat * life(v, 0.1, 0.5);
    const mx = hcx + (fx + 6) * hs;
    const myy = hcy + (my + 1) * hs;
    pop(o.crumb1, R, mx + 13 * v, myy - 7 * v + 20 * v * v, v * 5, cs);
    pop(o.crumb2, R, mx + 7 * v, myy - 2 * v + 24 * v * v, -v * 4, cs * 0.8);
  }
  if (wSpark < 0.02) {
    pop(o.spark1, R, 0, 0, 0, 0);
    pop(o.spark2, R, 0, 0, 0, 0);
  } else {
    const u = (t * 1.5) % 1;
    const v = (t * 1.5 + 0.5) % 1;
    pop(o.spark1, R, hcx - 37, hcy - 16 - 6 * u, u * 1.5, wSpark * life(u, 0.25, 0.4) * 1.1);
    pop(o.spark2, R, hcx + 38, hcy - 27 - 6 * v, -v * 1.5, wSpark * life(v, 0.25, 0.4) * 0.9);
  }
  return o;
}
