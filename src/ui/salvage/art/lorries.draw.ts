/**
 * The crane lorries of the works (PLAN2 2.7 worksLorries, s2c-plan-world 1.4; ART-LORRIES): ONE vehicle family, a rigid
 * lorry with a flat deck and a LOADER CRANE behind the cab (yard-style 11: never a tow truck's boom and hook at the rear,
 * never a magnet). It is the garage's recovery truck, which lifts a car off its deck by its WHEELS with a wheel-lift frame
 * (four forks cupped under the tyres, hung from a spreader) and swings it to the apron, and the heavy lorry, which brings
 * an oversize piece (at most 12 t, ruling 30.6 b) and sets it down with its own crane standing on its outriggers. The body
 * and the crane are baked near white (YARD.cab, as the first yard's hook-lift's cab) and modulated per sender
 * (LORRY_TINTS, keyed by the content's partner ids); glass, tyres, the chassis and the steel are dark or grey and stay
 * readable under the tint.
 *
 * The same pen as vehicles.draw.ts (the first yard's truck, flatbed and van): the world's one projection, 40 pt a metre,
 * tilt 0.7, flat three-tone faces (toneOf), 1.2 pt ink, the raked cab of finding L16, the same wheel (a disc seen from the
 * side, a tread block end-on), two thirds of true length (a 10.5 m crane lorry is 7.0 m here), headings 0 s ... 7 sw
 * (headingRad), anchor at the footprint's centre on the ground, no shadow inside a sprite (the world's sheet S). The
 * private helpers of vehicles.draw.ts (frameOf, solid, member, the wheel, the raked cab) are copied here, not imported:
 * that file is the first yard's and does not move.
 *
 * Geometry is ONE model drawn at every heading, so neighbouring headings cannot jump in size or anchor: every point is
 * F.at(u, s, z) round the footprint centre.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, YARD, shade } from './palette';
import { box, builder, discPath, faceFill, facePath, facing, fill, hazard, oval, poly, proj, rrect, segment, stroke, subQuad, toneOf, type V3, type View3q } from './pen';
import { drawPublicCar, headingRad } from './vehicles.draw';

const INK = YARD.ink;
/** The deck's chequer plate. */
const DECK = '#737B82';
/** The loader crane: a light grey (it stands out of the near-white cab behind which it folds; the tint shades it). */
const CRANE = '#B8C0C7';

// ---------------------------------------------------------------------------------------------------------------------
// The model (metres along the heading from the footprint centre: u forward, s to the left hand, which is SOUTH for a
// lorry facing east, z up)
// ---------------------------------------------------------------------------------------------------------------------

export const LORRY = {
  /** the true ground outline (bumper to tail, mirror arms excluded): the manifest's footprint */
  len: 7.0,
  wid: 2.2,
  /** the cab's centre and length */
  cabU: 2.8,
  cabLen: 1.3,
  /** the crane's column behind the cab (its slewing ring at slewZ) */
  colU: 1.72,
  slewZ: 2.2,
  /** the deck: front (headboard) and tail, its top */
  deckFront: 1.3,
  deckTail: -3.45,
  deckZ: 0.95,
  /** the load's place on the deck (its base centre) */
  bedU: -1.2,
  /** axles (front, then the rear tandem) and the wheel's radius */
  axles: [2.6, -1.75, -2.6],
  wheelR: 0.45,
  track: 0.9,
  /** outriggers: the front pair at the column, the rear pair at the tail; the pads' distance from the centre line */
  outU: [1.72, -3.1],
  outS: 2.15,
  /** booms: main and jib (the jib telescopes out to jibMax) */
  mainLen: 2.8,
  jibLen: 2.7,
  jibMax: 3.9,
} as const;

/** The crane entry's outline with the outriggers down (pads included): the manifest's footprint. */
export const LORRY_RIGGED = { len: LORRY.len, wid: 2 * LORRY.outS + 0.36 } as const;

/** The ring (master link) of a load's rigging, this far above the load's base: the crane's hook hangs on it. */
export const RING_Z = 1.9;

/** The tints per sender (content partner ids): the near-white body and crane modulated by these, never a real livery. */
export const LORRY_TINTS: Readonly<Record<string, string>> = {
  'partner.garage': '#D88A78',
  'partner.plumbing': '#9DB4D6',
  'partner.boatyard': '#86B8B8',
  partnerDemolition: '#E8B870',
};
/** The body's baked colour (the manifest's tint field). */
export const LORRY_BASE = YARD.cab;

// driving: what is on the deck
export type LorryDrive = 'stowed' | 'car' | 'piece';
export const LORRY_DRIVE: readonly LorryDrive[] = ['stowed', 'car', 'piece'];

// standing at its stop (east; west mirrored): the crane's frames
export type CraneFrame = 'stowed' | 'outriggers' | 'swingN1' | 'swingN2' | 'swingN3' | 'swingS1' | 'swingS2' | 'swingS3' | 'set';
export const CRANE_FRAMES: readonly CraneFrame[] = ['stowed', 'outriggers', 'swingN1', 'swingN2', 'swingN3', 'swingS1', 'swingS2', 'swingS3', 'set'];

// the loads (their own entry; drawn at heading east)
export type LoadFrame = 'car-sheeted' | 'car-open' | 'obj-sheeted' | 'obj-open';
export const LOAD_FRAMES: readonly LoadFrame[] = ['car-sheeted', 'car-open', 'obj-sheeted', 'obj-open'];

/**
 * Where the load's base centre is in each crane frame, metres (u, s, z) round the lorry's anchor for a lorry facing EAST
 * (s < 0 is NORTH). null: no load on the hook or on the deck (set: the load is down and unhooked; the world draws what was
 * set down at its place). Mirror u for a lorry facing west.
 */
export const CRANE_LOAD: Readonly<Record<CraneFrame, V3 | null>> = {
  stowed: [LORRY.bedU, 0, LORRY.deckZ],
  outriggers: [LORRY.bedU, 0, LORRY.deckZ],
  swingN1: [LORRY.bedU + 0.3, -0.2, LORRY.deckZ + 0.75],
  swingN2: [LORRY.bedU + 0.7, -2.3, 1.75],
  swingN3: [LORRY.bedU + 0.7, -3.6, 0],
  swingS1: [LORRY.bedU + 0.3, 0.2, LORRY.deckZ + 0.75],
  swingS2: [LORRY.bedU + 0.7, 2.3, 1.75],
  swingS3: [LORRY.bedU + 0.7, 3.6, 0],
  set: null,
};

/**
 * Whether the world draws the load entry BEFORE the crane entry (the load is north of the lorry, farther from the eye)
 * or AFTER it (on the deck, lifted over it, or south of it, nearer the eye).
 */
export const LOAD_ORDER: Readonly<Record<CraneFrame, 'before' | 'after'>> = {
  stowed: 'after',
  outriggers: 'after',
  swingN1: 'after',
  swingN2: 'before',
  swingN3: 'before',
  swingS1: 'after',
  swingS2: 'after',
  swingS3: 'after',
  set: 'after',
};

/** A crane frame's load base in points from the lorry's anchor (true size, facing east), or null. */
export function craneLoadAt(v: View3q, frame: CraneFrame): [number, number] | null {
  const p = CRANE_LOAD[frame];
  return p ? proj(v, p[0], p[1], p[2]) : null;
}

/** The deck's load place in points from the anchor at a manifest heading (0 s ... 7 sw), true size. */
export function lorryBedAt(v: View3q, heading8: number): [number, number] {
  const F = frameOf(headingRad(heading8));
  return P2(v, F.at(LORRY.bedU, 0, LORRY.deckZ));
}

// ---------------------------------------------------------------------------------------------------------------------
// The pen (copied from vehicles.draw.ts: the same hand)
// ---------------------------------------------------------------------------------------------------------------------

type Frame = ReturnType<typeof frameOf>;
function frameOf(heading: number) {
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const lx = -fy;
  const ly = fx;
  const at = (u: number, s: number, z: number): V3 => [fx * u + lx * s, fy * u + ly * s, z];
  return { fx, fy, lx, ly, at, f: [fx, fy, 0] as V3, l: [lx, ly, 0] as V3 };
}
const P2 = (v: View3q, p: V3): [number, number] => proj(v, p[0], p[1], p[2]);

function member(c: SkCanvas, v: View3q, a: V3, b: V3, w: number, color: string): void {
  const [ax, ay] = P2(v, a);
  const [bx, by] = P2(v, b);
  c.drawPath(segment(ax, ay, bx, by), stroke(INK, w + 2));
  c.drawPath(segment(ax, ay, bx, by), stroke(color, w));
}

/** A thin dark line (a chain, a hydraulic ram's rod), no ink edge. */
function line(c: SkCanvas, v: View3q, a: V3, b: V3, w: number, color: string): void {
  const [ax, ay] = P2(v, a);
  const [bx, by] = P2(v, b);
  c.drawPath(segment(ax, ay, bx, by), stroke(color, w));
}

function solid(c: SkCanvas, v: View3q, q: V3[], color: string, o: { line?: number; onFace?: (pts: V3[], n: V3, top: boolean) => void } = {}): void {
  const ln = o.line ?? LINE_W;
  const cen: V3 = [0, 1, 2].map((k) => q.reduce((s, p) => s + p[k], 0) / 8) as V3;
  const faces: V3[][] = [
    [q[0], q[1], q[5], q[4]],
    [q[1], q[2], q[6], q[5]],
    [q[2], q[3], q[7], q[6]],
    [q[3], q[0], q[4], q[7]],
    [q[4], q[5], q[6], q[7]],
  ];
  const normal = (f: V3[]): V3 => {
    const u: V3 = [f[1][0] - f[0][0], f[1][1] - f[0][1], f[1][2] - f[0][2]];
    const w: V3 = [f[3][0] - f[0][0], f[3][1] - f[0][1], f[3][2] - f[0][2]];
    let n: V3 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const m = Math.hypot(...n) || 1;
    n = [n[0] / m, n[1] / m, n[2] / m];
    const fc = [0, 1, 2].map((k) => f.reduce((s, p) => s + p[k], 0) / 4);
    if ((fc[0] - cen[0]) * n[0] + (fc[1] - cen[1]) * n[1] + (fc[2] - cen[2]) * n[2] < 0) n = [-n[0], -n[1], -n[2]];
    return n;
  };
  faces.forEach((f, i) => {
    const n = normal(f);
    if (facing(v, n) <= 0.01) return;
    const p = facePath(v, f);
    c.drawPath(p, fill(toneOf(color, n)));
    o.onFace?.(f, n, i === 4);
    if (ln > 0) c.drawPath(p, stroke(INK, ln));
  });
}

/** A box along the frame: len (along u) x wid (along s) x h, its bottom centre at (u, s, z). */
function fbox(c: SkCanvas, v: View3q, F: Frame, u: number, s: number, z: number, len: number, wid: number, h: number, color: string, o: { line?: number; onTop?: (q: V3[]) => void; onFace?: (q: V3[], n: V3) => void; bevel?: boolean } = {}): void {
  const p = F.at(u, s, 0);
  box(c, v, { len, wid, h, z, ox: p[0], oy: p[1], heading: Math.atan2(F.fy, F.fx), color, line: o.line, onTop: o.onTop, onFace: o.onFace, bevel: o.bevel });
}

function wheel(c: SkCanvas, v: View3q, p: V3, f: V3, r: number, side: V3): void {
  const z: V3 = [0, 0, 1];
  const face = facing(v, side);
  if (face < 0.3) {
    box(c, v, { len: 2 * r * 0.92, wid: 0.34, h: 2 * r * 0.95, ox: p[0], oy: p[1], z: p[2] - r, heading: Math.atan2(f[1], f[0]), color: YARD.tyre, line: 1 });
    if (face <= 0.05) return;
  }
  const q: V3 = [p[0] + side[0] * 0.17, p[1] + side[1] * 0.17, p[2]];
  c.drawPath(discPath(v, q, f, z, r), fill(YARD.tyre));
  c.drawPath(discPath(v, q, f, z, r), stroke(INK, 1));
  c.drawPath(discPath(v, q, f, z, r * 0.5), fill(YARD.galvanised));
  c.drawPath(discPath(v, q, f, z, r * 0.2), fill(YARD.steelDark));
}

/** The raked cab (finding L16), the first yard's hook-lift's shape at this lorry's width; a reflective band, a beacon. */
function cab(c: SkCanvas, v: View3q, F: Frame, colour: string): void {
  const len = LORRY.cabLen;
  const u0 = LORRY.cabU - len / 2;
  const u1 = LORRY.cabU + len / 2;
  const zb = 0.75;
  const zBack = 1.55;
  const zFront = 1.32;
  const zAt = (uu: number) => zBack + ((zFront - zBack) * (uu - u0)) / len;
  const w = LORRY.wid / 2;
  const P = (uu: number, s: number, z: number) => F.at(uu, s, z);
  const along = (n: V3) => n[0] * F.fx + n[1] * F.fy;
  const lower: V3[] = [P(u1, w, zb), P(u0, w, zb), P(u0, -w, zb), P(u1, -w, zb), P(u1, w, zFront), P(u0, w, zBack), P(u0, -w, zBack), P(u1, -w, zFront)];
  solid(c, v, lower, colour, {
    onFace: (f, n, top) => {
      if (top) {
        faceFill(c, v, subQuad(f, 0.0, 0.08, 0.1, 0.9), shade(colour, -0.3), 0);
        return;
      }
      const a = along(n);
      if (a > 0.7) {
        faceFill(c, v, subQuad(f, 0.18, 0.82, 0.3, 0.8), YARD.machineDark, 0.8);
        for (const s of [0.24, 0.36, 0.48, 0.6, 0.72]) faceFill(c, v, subQuad(f, 0.2, 0.8, s, s + 0.04), shade(YARD.machineDark, 0.25));
        faceFill(c, v, subQuad(f, 0.03, 0.15, 0.5, 0.75), YARD.hivisLight, 0.8);
        faceFill(c, v, subQuad(f, 0.85, 0.97, 0.5, 0.75), YARD.hivisLight, 0.8);
        faceFill(c, v, subQuad(f, 0, 1, 0, 0.18), YARD.tyre, 0.8);
      } else if (a > -0.7) {
        faceFill(c, v, subQuad(f, 0, 1, 0.1, 0.26), YARD.reflect, 0.9);
        faceFill(c, v, subQuad(f, 0.0, 1.0, 0, 0.08), YARD.tyre, 0);
      }
    },
  });
  const uS = u1 - 0.24;
  const uR = u1 - 0.68;
  const zr = 2.3;
  const w2 = w - 0.04;
  const upper: V3[] = [P(uS, w2, zAt(uS)), P(u0 + 0.02, w2, zAt(u0)), P(u0 + 0.02, -w2, zAt(u0)), P(uS, -w2, zAt(uS)), P(uR, w2, zr), P(u0 + 0.02, w2, zr), P(u0 + 0.02, -w2, zr), P(uR, -w2, zr)];
  solid(c, v, upper, colour, {
    onFace: (f, n, top) => {
      if (top) {
        faceFill(c, v, subQuad(f, 0.0, 0.1, 0.05, 0.95), shade(colour, -0.2), 0);
        return;
      }
      const a = along(n);
      if (a < -0.6) return;
      if (a > 0.3) {
        const win = subQuad(f, 0.06, 0.94, 0.08, 0.92);
        faceFill(c, v, win, YARD.glassDark, 1);
        const hc = P2(v, subQuad(win, 0.32, 0.32, 0.35, 0.35)[0]);
        c.drawPath(oval(hc[0], hc[1] + 1, 3.2, 3.2), fill(shade(YARD.glassDark, -0.45)));
        faceFill(c, v, subQuad(win, 0.62, 0.74, 0.15, 0.95), YARD.glass, 0, 0.8);
        return;
      }
      const win = subQuad(f, 0.08, 0.62, 0.14, 0.86);
      faceFill(c, v, win, YARD.glassDark, 1);
      const hc = P2(v, subQuad(win, 0.5, 0.5, 0.4, 0.4)[0]);
      c.drawPath(oval(hc[0], hc[1] + 1, 3.4, 3.2), fill(shade(YARD.glassDark, -0.45)));
      c.drawPath(builder().moveTo(hc[0] - 4, hc[1] - 1.4).quadTo(hc[0], hc[1] - 6.5, hc[0] + 4, hc[1] - 1.4).close().build(), fill(shade(YARD.glassDark, -0.45)));
      faceFill(c, v, subQuad(win, 0.1, 0.22, 0.1, 0.9), YARD.glass, 0, 0.9);
      faceFill(c, v, subQuad(f, 0.7, 0.72, 0.05, 0.95), shade(colour, -0.25), 0);
    },
  });
  for (const s of [-1, 1]) {
    const a = P(uS + 0.05, s * (w + 0.02), 1.8);
    const b = P(uS + 0.05, s * (w + 0.18), 1.8);
    member(c, v, a, b, 1, YARD.machineDark);
    const [mx, my] = P2(v, b);
    c.drawPath(rrect(mx - 2, my - 5, 4, 8, 1), fill(YARD.machineDark));
  }
  const [bx, by] = P2(v, F.at(u0 + 0.3, 0, zr));
  c.drawPath(rrect(bx - 3, by - 7, 6, 7, 2), fill(YARD.hivis));
  c.drawPath(rrect(bx - 3, by - 7, 6, 7, 2), stroke(INK, 1));
}

// ---------------------------------------------------------------------------------------------------------------------
// The crane
// ---------------------------------------------------------------------------------------------------------------------

interface CranePose {
  /** the knuckle and the jib's tip (metres, lorry frame) */
  k: [number, number, number];
  t: [number, number, number];
  /** the hook hangs down to this point (the load's ring), or just under the tip */
  ring: [number, number, number] | null;
}

/** The two booms to reach the tip t from the slewing ring: the knuckle above the line (the jib telescopes if far). */
function reach(t: [number, number, number]): { k: [number, number, number]; jib: number } {
  const c0: [number, number, number] = [LORRY.colU, 0, LORRY.slewZ];
  const d = Math.hypot(t[0] - c0[0], t[1] - c0[1], t[2] - c0[2]);
  const jib = Math.min(LORRY.jibMax, Math.max(LORRY.jibLen, d - LORRY.mainLen + 0.6));
  const a = LORRY.mainLen;
  const b = jib;
  // the knuckle: distance a from c0, b from t, in the vertical plane through both, on the upper side
  const x = (d * d + a * a - b * b) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  const e = [(t[0] - c0[0]) / d, (t[1] - c0[1]) / d, (t[2] - c0[2]) / d];
  // "up" in that plane: the world z with its part along e removed
  let up = [-e[0] * e[2], -e[1] * e[2], 1 - e[2] * e[2]];
  const m = Math.hypot(up[0], up[1], up[2]) || 1;
  up = [up[0] / m, up[1] / m, up[2] / m];
  return { k: [c0[0] + e[0] * x + up[0] * h, c0[1] + e[1] * x + up[1] * h, c0[2] + e[2] * x + up[2] * h], jib };
}

function poseOf(frame: CraneFrame): CranePose {
  if (frame === 'stowed' || frame === 'outriggers') {
    // folded tight behind the cab: the main boom up and back, the jib folded forward and down over the headboard
    return { k: [LORRY.colU - 0.55, 0, 3.15], t: [LORRY.colU + 0.25, 0, 2.55], ring: null };
  }
  if (frame === 'set') {
    // the load is down and unhooked: the crane lifts its hook clear over the deck before folding
    const t: [number, number, number] = [LORRY.bedU + 0.4, 0, 4.4];
    return { k: reach(t).k, t, ring: null };
  }
  const l = CRANE_LOAD[frame]!;
  const ring: [number, number, number] = [l[0], l[1], l[2] + RING_Z];
  const t: [number, number, number] = [ring[0], ring[1], ring[2] + 0.55];
  return { k: reach(t).k, t, ring };
}

/** The crane at its pose: the column and slewing ring (if `column`), the main boom with its ram, the jib, the hook. */
function drawCrane(c: SkCanvas, v: View3q, F: Frame, colour: string, frame: CraneFrame, part: 'column' | 'booms'): void {
  const P = (p: readonly number[]): V3 => F.at(p[0], p[1], p[2]);
  if (part === 'column') {
    fbox(c, v, F, LORRY.colU, 0, LORRY.deckZ - 0.15, 0.55, 0.55, LORRY.slewZ - LORRY.deckZ - 0.1, colour, { line: 1 });
    // the slewing ring (a short dark drum) on top
    fbox(c, v, F, LORRY.colU, 0, LORRY.slewZ - 0.25, 0.7, 0.7, 0.18, YARD.steelDark, { line: 1 });
    return;
  }
  const pose = poseOf(frame);
  const c0: V3 = P([LORRY.colU, 0, LORRY.slewZ]);
  const k = P(pose.k);
  const t = P(pose.t);
  // the lift ram from the column to the main boom's middle (dark rod in a body-coloured barrel)
  const mid: V3 = [(c0[0] + k[0]) / 2, (c0[1] + k[1]) / 2, (c0[2] + k[2]) / 2];
  const ramFoot = P([LORRY.colU + 0.05, 0, LORRY.slewZ - 0.75]);
  member(c, v, ramFoot, [(ramFoot[0] + mid[0]) / 2, (ramFoot[1] + mid[1]) / 2, (ramFoot[2] + mid[2]) / 2], 4, colour);
  line(c, v, ramFoot, mid, 1.8, YARD.steelDark);
  member(c, v, c0, k, 9, colour);
  // the jib: the outer section to its middle, the telescope's inner section (narrower) to the tip
  const jm: V3 = [k[0] + (t[0] - k[0]) * 0.55, k[1] + (t[1] - k[1]) * 0.55, k[2] + (t[2] - k[2]) * 0.55];
  member(c, v, k, jm, 7.5, colour);
  member(c, v, jm, t, 5.5, shade(colour, -0.12));
  // the knuckle's pin
  const [kx, ky] = P2(v, k);
  c.drawPath(oval(kx, ky, 3.4, 3.4), fill(YARD.steelDark));
  c.drawPath(oval(kx, ky, 3.4, 3.4), stroke(INK, 0.8));
  // the hook: a block under the tip, then (hooked) a short chain to the load's ring
  const [tx, ty] = P2(v, t);
  c.drawPath(segment(tx, ty, tx, ty + 4), stroke(INK, 1));
  c.drawPath(rrect(tx - 2.6, ty + 4, 5.2, 4.5, 1), fill(YARD.hivis));
  c.drawPath(rrect(tx - 2.6, ty + 4, 5.2, 4.5, 1), stroke(INK, 0.9));
  const hookTop = ty + 8.5;
  if (pose.ring) {
    const [rx, ry] = P2(v, P(pose.ring));
    c.drawPath(segment(tx, hookTop, rx, ry - 2), stroke(INK, 1.4));
    c.drawPath(segment(tx, hookTop, rx, ry - 2), stroke(YARD.steel, 0.6));
  } else {
    c.drawPath(builder().moveTo(tx, hookTop).quadTo(tx + 3, hookTop + 1.5, tx + 1.5, hookTop + 4).build(), stroke(INK, 1.6));
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The outriggers
// ---------------------------------------------------------------------------------------------------------------------

/** One outrigger at u on side `side` (+1 the left hand): the beam out of its box, the jack down to its pad (or stowed). */
function outrigger(c: SkCanvas, v: View3q, F: Frame, u: number, side: number, down: boolean): void {
  const zBeam = 0.62;
  const inner = LORRY.wid / 2 - 0.05;
  const outer = down ? LORRY.outS : inner + 0.04;
  if (down) {
    // the beam (hazard-striped end) out to the jack
    const sMid = (side * (inner + outer)) / 2;
    fbox(c, v, F, u, sMid, zBeam, 0.28, outer - inner, 0.22, YARD.steel, { line: 1 });
    const end = [F.at(u - 0.15, side * (outer - 0.3), zBeam + 0.22), F.at(u + 0.15, side * (outer - 0.3), zBeam + 0.22), F.at(u + 0.15, side * outer, zBeam + 0.22), F.at(u - 0.15, side * outer, zBeam + 0.22)].map((p) => P2(v, p));
    hazard(c, poly(end.flat()), 2.2, 0.8);
    // the jack: a barrel down to its pad on the ground
    fbox(c, v, F, u, side * outer, 0.08, 0.32, 0.32, 0.12, YARD.steelDark, { line: 1 });
    fbox(c, v, F, u, side * outer, 0.18, 0.18, 0.18, zBeam + 0.6 - 0.18, YARD.steel, { line: 1 });
  } else {
    fbox(c, v, F, u, side * (inner - 0.02), zBeam, 0.28, 0.08, 0.22, YARD.steelDark, { line: 0.8 });
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The lorry
// ---------------------------------------------------------------------------------------------------------------------

interface LorryOpts {
  colour?: string;
  crane?: CraneFrame;
  /** what lies on the deck (driving), drawn in its place and order */
  load?: LoadFrame;
  /** the outriggers down (standing) */
  rigged?: boolean;
}

/**
 * The crane lorry at a heading (radians): far wheels and outriggers, the chassis, the cab first when it is the farther
 * end, the deck and its headboard, the load on it, the crane's column, the booms, the cab when it is the nearer end,
 * the near outriggers and wheels. Footprint LORRY.len x LORRY.wid; anchor the centre.
 */
export function drawCraneLorry(c: SkCanvas, v: View3q, heading: number, o: LorryOpts = {}): void {
  const F = frameOf(heading);
  const colour = o.colour ?? LORRY_BASE;
  const frame = o.crane ?? 'stowed';
  const rigged = o.rigged ?? (frame !== 'stowed');
  const nearSign = F.ly >= 0 ? 1 : -1;
  const sideOf = (s: number): V3 => [F.lx * Math.sign(s), F.ly * Math.sign(s), 0];
  const wheels: [number, number][] = LORRY.axles.flatMap((u) => [[u, LORRY.track], [u, -LORRY.track]] as [number, number][]);
  for (const [u, s] of wheels) if (Math.sign(s) !== nearSign) wheel(c, v, F.at(u, s, LORRY.wheelR), F.f, LORRY.wheelR, sideOf(s));
  for (const u of LORRY.outU) outrigger(c, v, F, u, -nearSign, rigged);
  // the chassis rails
  fbox(c, v, F, -0.1, 0, 0.5, LORRY.len * 0.94, LORRY.wid * 0.62, 0.3, YARD.machineDark);
  const cabFirst = F.fy < -0.3;
  if (cabFirst) cab(c, v, F, colour);
  // the deck: a steel-edged timber floor with a tie rail, the headboard behind the crane
  const deckLen = LORRY.deckFront - LORRY.deckTail;
  const deckU = (LORRY.deckFront + LORRY.deckTail) / 2;
  fbox(c, v, F, deckU, 0, LORRY.deckZ - 0.14, deckLen, LORRY.wid, 0.14, colour, {
    onTop: (q) => {
      // a steel chequer-plate floor (dark: it stays steel under the sender's tint), its seams
      faceFill(c, v, subQuad(q, 0.02, 0.98, 0.06, 0.94), DECK);
      for (const t of [0.25, 0.5, 0.75]) faceFill(c, v, subQuad(q, 0.02, 0.98, t - 0.006, t + 0.006), shade(DECK, -0.3));
      for (let i = 1; i < 12; i++) faceFill(c, v, subQuad(q, i / 12 - 0.004, i / 12 + 0.004, 0.1, 0.9), shade(DECK, 0.12));
      // the low ramps' hinge plate at the tail
      faceFill(c, v, subQuad(q, 0.0, 0.04, 0.08, 0.92), YARD.steel);
    },
    onFace: (q, n) => {
      // the deck's side: lashing points
      if (Math.abs(n[0] * F.fx + n[1] * F.fy) < 0.5) for (const t of [0.15, 0.4, 0.65, 0.9]) faceFill(c, v, subQuad(q, t - 0.012, t + 0.012, 0.2, 0.8), YARD.steelDark);
    },
  });
  const crane = () => drawCrane(c, v, F, CRANE, frame, 'column');
  const headboard = () => fbox(c, v, F, LORRY.deckFront - 0.04, 0, LORRY.deckZ, 0.08, LORRY.wid - 0.1, 0.55, YARD.galvanised, { line: 1 });
  // the column stands ahead of the headboard: whichever is farther goes first
  if (F.fx >= 0) {
    headboard();
    if (o.load) loadOnDeck(c, v, F, o.load);
    crane();
  } else {
    crane();
    headboard();
    if (o.load) loadOnDeck(c, v, F, o.load);
  }
  // the booms stand highest; when the cab is the nearer end it covers their foot, so they go before it
  drawCrane(c, v, F, CRANE, frame, 'booms');
  if (!cabFirst) cab(c, v, F, colour);
  for (const u of LORRY.outU) outrigger(c, v, F, u, nearSign, rigged);
  for (const [u, s] of wheels) if (Math.sign(s) === nearSign) wheel(c, v, F.at(u, s, LORRY.wheelR), F.f, LORRY.wheelR, sideOf(s));
}

function loadOnDeck(c: SkCanvas, v: View3q, F: Frame, load: LoadFrame): void {
  drawLoadAt(c, v, F, load, F.at(LORRY.bedU, 0, LORRY.deckZ));
}

// ---------------------------------------------------------------------------------------------------------------------
// The loads
// ---------------------------------------------------------------------------------------------------------------------

/** The end-of-life car's faded paint (a load is not tinted by the sender). */
export const CAR_FADED = '#8C6F68';
const TARP = '#6B7A63';
const TARP_CAR = '#7E868A';
/** The car's wheels (vehicles.draw drawPublicCar: u +-0.88, s +-0.6, r 0.27) and the wheel-lift frame's legs (outside the body). */
export const CAR_WHEELS = { u: 0.88, s: 0.6, r: 0.27, legS: 0.86, frameZ: 1.5 } as const;
/** The piece under its sheet: footprint and height (metres; the 12 t press frame's own sprite is the world's thing.<obj>). */
export const PIECE = { len: 2.2, wid: 1.4, h: 1.0 } as const;

/** A load drawn at a heading (radians) with its base centre at the anchor. */
export function drawLorryLoad(c: SkCanvas, v: View3q, heading: number, load: LoadFrame): void {
  const F = frameOf(heading);
  drawLoadAt(c, v, F, load, [0, 0, 0]);
}

function drawLoadAt(c: SkCanvas, v: View3q, F: Frame, load: LoadFrame, at: V3): void {
  const A = (u: number, s: number, z: number): V3 => {
    const p = F.at(u, s, z);
    return [p[0] + at[0], p[1] + at[1], p[2] + at[2]];
  };
  const near = F.ly >= 0 ? 1 : -1;
  if (load === 'car-open' || load === 'car-sheeted') {
    // the wheel-lift frame: four legs outside the body down to forks cupped under the tyres, a spreader over the roof
    const W = CAR_WHEELS;
    const fork = (u: number, s: number) => {
      const sg = Math.sign(s);
      member(c, v, A(u, sg * W.legS, 0.1), A(u, sg * W.legS, W.frameZ), 1.6, YARD.steelDark);
      // two tines from the leg's foot in under the tyre, before and behind its contact point
      for (const du of [-W.r * 0.75, W.r * 0.75]) member(c, v, A(u + du, sg * W.legS, 0.07), A(u + du, sg * (W.s - 0.14), 0.07), 1.3, YARD.hivisDark);
      member(c, v, A(u - W.r * 0.75, sg * W.legS, 0.07), A(u + W.r * 0.75, sg * W.legS, 0.07), 1.3, YARD.hivisDark);
    };
    for (const u of [W.u, -W.u]) fork(u, -near * W.legS);
    // the car itself (vehicles.draw's public car, the first yard's model) or under its fitted cover
    const [cx, cy] = P2(v, A(0, 0, 0));
    c.save();
    c.translate(cx, cy);
    if (load === 'car-open') drawPublicCar(c, v, Math.atan2(F.fy, F.fx), { body: CAR_FADED, driver: false });
    else coveredCar(c, v, F);
    c.restore();
    if (load === 'car-open') {
      // an end-of-life car: a dent and a cracked side window, a missing hubcap's dark hub (no plate, no words)
      const d = P2(v, A(0.35, near * 0.71, 0.45));
      c.drawPath(oval(d[0], d[1], 3, 1.6), fill(shade(CAR_FADED, -0.3)));
      const g = P2(v, A(-0.2, near * 0.6, 0.95));
      c.drawPath(builder().moveTo(g[0] - 3, g[1] - 2).lineTo(g[0], g[1]).lineTo(g[0] + 2.5, g[1] - 2.5).moveTo(g[0], g[1]).lineTo(g[0] + 1, g[1] + 2.5).build(), stroke(YARD.paper, 0.6, 0.8));
    }
    for (const u of [W.u, -W.u]) fork(u, near * W.legS);
    // the spreader (a steel rectangle over the roof) and the four short chains to the ring
    const z = W.frameZ;
    const cs: V3[] = [A(W.u, W.legS, z), A(-W.u, W.legS, z), A(-W.u, -W.legS, z), A(W.u, -W.legS, z)];
    for (let i = 0; i < 4; i++) member(c, v, cs[i], cs[(i + 1) % 4], 1.8, YARD.steelDark);
    ringAndLegs(c, v, A(0, 0, RING_Z), cs);
    return;
  }
  if (load === 'obj-sheeted') {
    // two timber bearers, the piece under a roped sheet, ratchet straps, lifting eyes and a four-leg chain sling
    for (const s of [-0.45, 0.45]) {
      const p = A(0, s, 0);
      box(c, v, { len: PIECE.len + 0.2, wid: 0.18, h: 0.14, ox: p[0], oy: p[1], z: p[2], heading: Math.atan2(F.fy, F.fx), color: YARD.wood, line: 1 });
    }
    const p = A(0, 0, 0);
    box(c, v, {
      len: PIECE.len,
      wid: PIECE.wid,
      h: PIECE.h - 0.14,
      z: p[2] + 0.14,
      ox: p[0],
      oy: p[1],
      heading: Math.atan2(F.fy, F.fx),
      color: TARP,
      bevel: true,
      onTop: (q) => {
        // the sheet's folds and the ropes across it
        for (const t of [0.3, 0.62]) faceFill(c, v, subQuad(q, t - 0.01, t + 0.01, 0.05, 0.95), shade(TARP, -0.2));
        for (const t of [0.22, 0.78]) faceFill(c, v, subQuad(q, t - 0.025, t + 0.025, 0, 1), YARD.crateBlue);
      },
      onFace: (q, n) => {
        const along = Math.abs(n[0] * F.fx + n[1] * F.fy);
        if (along < 0.5) for (const t of [0.22, 0.78]) faceFill(c, v, subQuad(q, t - 0.025, t + 0.025, 0, 1), YARD.crateBlue);
        // the sheet's hem hanging loose at the foot
        faceFill(c, v, subQuad(q, 0, 1, 0, 0.12), shade(TARP, -0.18));
      },
    });
    const z = PIECE.h;
    const cs: V3[] = [A(PIECE.len / 2 - 0.15, PIECE.wid / 2 - 0.12, z), A(-PIECE.len / 2 + 0.15, PIECE.wid / 2 - 0.12, z), A(-PIECE.len / 2 + 0.15, -PIECE.wid / 2 + 0.12, z), A(PIECE.len / 2 - 0.15, -PIECE.wid / 2 + 0.12, z)];
    for (const e of cs) {
      const [ex, ey] = P2(v, e);
      c.drawPath(oval(ex, ey - 1, 1.8, 1.4), stroke(INK, 1.2));
    }
    ringAndLegs(c, v, A(0, 0, RING_Z), cs);
    return;
  }
  // obj-open: the four-leg chain sling and its ring only, drawn AFTER the world's thing.<obj> at the same place
  const z = PIECE.h;
  const cs: V3[] = [A(PIECE.len / 2 - 0.15, PIECE.wid / 2 - 0.12, z), A(-PIECE.len / 2 + 0.15, PIECE.wid / 2 - 0.12, z), A(-PIECE.len / 2 + 0.15, -PIECE.wid / 2 + 0.12, z), A(PIECE.len / 2 - 0.15, -PIECE.wid / 2 + 0.12, z)];
  for (const e of cs) {
    const [ex, ey] = P2(v, e);
    c.drawPath(builder().moveTo(ex - 2, ey).quadTo(ex, ey + 3, ex + 2, ey).build(), stroke(INK, 1.3));
  }
  ringAndLegs(c, v, A(0, 0, RING_Z), cs);
}

/** The master link at r and a chain leg from it to each of the points. */
function ringAndLegs(c: SkCanvas, v: View3q, r: V3, to: V3[]): void {
  const [rx, ry] = P2(v, r);
  for (const p of to) {
    const [px, py] = P2(v, p);
    c.drawPath(segment(rx, ry, px, py), stroke(INK, 1.4));
    c.drawPath(segment(rx, ry, px, py), stroke(YARD.steel, 0.6));
  }
  c.drawPath(oval(rx, ry - 1, 2, 2.6), stroke(INK, 1.4));
  c.drawPath(oval(rx, ry - 1, 2, 2.6), stroke(YARD.steelDark, 0.7));
}

/** The car under a fitted grey cover: the body and glasshouse shapes in sheet colour, the wheels showing, one strap. */
function coveredCar(c: SkCanvas, v: View3q, F: Frame): void {
  const W = CAR_WHEELS;
  const near = F.ly >= 0 ? 1 : -1;
  const side = (s: number): V3 => [F.lx * Math.sign(s), F.ly * Math.sign(s), 0];
  for (const u of [W.u, -W.u]) wheel(c, v, F.at(u, -near * W.s, W.r), F.f, W.r, side(-near));
  fbox(c, v, F, 0, 0, 0.2, 2.86, 1.44, 0.56, TARP_CAR, {
    bevel: true,
    onFace: (q) => faceFill(c, v, subQuad(q, 0, 1, 0, 0.14), shade(TARP_CAR, -0.2)),
  });
  fbox(c, v, F, -0.25, 0, 0.76, 1.5, 1.24, 0.42, TARP_CAR, {
    onTop: (q) => faceFill(c, v, subQuad(q, 0.45, 0.55, 0, 1), YARD.crateBlue),
    onFace: (q, n) => {
      if (Math.abs(n[0] * F.fx + n[1] * F.fy) < 0.5) faceFill(c, v, subQuad(q, 0.45, 0.55, 0, 1), YARD.crateBlue);
      else faceFill(c, v, subQuad(q, 0.1, 0.9, 0.3, 0.34), shade(TARP_CAR, -0.18));
    },
  });
  for (const u of [W.u, -W.u]) wheel(c, v, F.at(u, near * W.s, W.r), F.f, W.r, side(near));
}

// ---------------------------------------------------------------------------------------------------------------------
// The manifest's draws (true size; the manifest part scales them by its k)
// ---------------------------------------------------------------------------------------------------------------------

/** vehicle.cranelorry: driving, frame (LORRY_DRIVE) at a manifest heading (0 s ... 4 n baked; west mirrored by the world). */
export function drawLorryDriving(c: SkCanvas, v: View3q, frame: number, heading8: number): void {
  const d = LORRY_DRIVE[frame] ?? 'stowed';
  drawCraneLorry(c, v, headingRad(heading8), { crane: 'stowed', rigged: false, load: d === 'car' ? 'car-open' : d === 'piece' ? 'obj-sheeted' : undefined });
}

/** vehicle.cranelorry.crane: standing at its stop facing east, a crane frame (CRANE_FRAMES); its load is its own entry. */
export function drawLorryCrane(c: SkCanvas, v: View3q, frame: number): void {
  const f = CRANE_FRAMES[frame] ?? 'stowed';
  drawCraneLorry(c, v, 0, { crane: f, rigged: f !== 'stowed' });
}

/** vehicle.cranelorry.load: a load (LOAD_FRAMES) facing east, its base centre at the anchor. */
export function drawLorryLoadFrame(c: SkCanvas, v: View3q, frame: number): void {
  drawLorryLoad(c, v, 0, LOAD_FRAMES[frame] ?? 'car-open');
}

/**
 * The geometry the sheet's checks read (works-lorries.ts): where the crane's tip and hook are in every frame, the forks
 * under the car's wheels, the rear of the lorry. Metres, lorry facing east.
 */
export function lorryGeometry(): {
  tips: Record<CraneFrame, { t: [number, number, number]; ring: [number, number, number] | null }>;
  rearU: number;
  deckZ: number;
  forks: { wheel: [number, number]; tineS: [number, number]; z: number }[];
} {
  const tips = Object.fromEntries(CRANE_FRAMES.map((f) => [f, { t: poseOf(f).t, ring: poseOf(f).ring }])) as Record<CraneFrame, { t: [number, number, number]; ring: [number, number, number] | null }>;
  const W = CAR_WHEELS;
  const forks = [W.u, -W.u].flatMap((u) => [1, -1].map((sg) => ({ wheel: [u, sg * W.s] as [number, number], tineS: [sg * W.legS, sg * (W.s - 0.14)] as [number, number], z: 0.07 })));
  return { tips, rearU: -LORRY.len / 2, deckZ: LORRY.deckZ, forks };
}
