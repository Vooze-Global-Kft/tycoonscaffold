/**
 * Everything on wheels in the first yard (yard-stage1.md 6.1, STAGE1-RULING S1, S2, S8): the sack truck
 * and the flat trolley a person pushes, the hook-lift truck with its skip (8 headings; hook and tip), the
 * skip on the ground and the partners' loads in it, the merchant's flatbed with its small crane and grab
 * (arriving, loading at the bays, leaving), the public's van with its trailer at the drop-off and the
 * delivery van. Vehicles are two thirds of their true length (yard-style.md 6); every heading is the
 * world's one projection (x east, y south, tilt 0.7). No words and no marks: the merchant's mark goes in
 * the door slot the manifest names, drawn by the world.
 *
 * Shadows are not inside these drawings unless asked: drawActorShadow draws an actor's ground shadow
 * swept east by the low sun (pen SUN), so a sprite mirrored for a west heading never throws it west.
 * Headings: radians (0 east, pi/2 south) in the drawings; headingRad(i) converts the manifest's eight
 * (0 s, 1 se, 2 e, 3 ne, 4 n, 5 nw, 6 w, 7 sw).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, SHADOW_ALPHA, SHADOW_DX, SUN, YARD, shade } from './palette';
import {
  box,
  builder,
  circle,
  discPath,
  faceFill,
  facePath,
  facing,
  fill,
  freckles,
  groundShadow,
  hash01,
  hazard,
  oval,
  poly,
  proj,
  rrect,
  segment,
  stroke,
  subQuad,
  toneOf,
  type V3,
  type View3q,
} from './pen';
import { GRIP, type Dir, type LoadFamily, loadPiece, loadPieces } from './people.draw';
import { pieceGlyph } from './pieces.draw';

const INK = YARD.ink;

/** The manifest's eight headings (0 s, 1 se, 2 e, 3 ne, 4 n, 5 nw, 6 w, 7 sw) in radians (0 east, pi/2 south). */
export const headingRad = (i: number): number => Math.PI / 2 - (i * Math.PI) / 4;
/** The four directions of people (0 s, 1 e, 2 n, 3 w) in radians. */
export const dirRad = (d: Dir): number => ({ s: Math.PI / 2, e: 0, n: -Math.PI / 2, w: Math.PI })[d];

/** A frame of reference along a heading: forward f, left-hand l (for heading east, l points south). */
function frameOf(heading: number) {
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const lx = -fy;
  const ly = fx;
  const at = (u: number, s: number, z: number): V3 => [fx * u + lx * s, fy * u + ly * s, z];
  return { fx, fy, lx, ly, at, f: [fx, fy, 0] as V3, l: [lx, ly, 0] as V3 };
}

const P2 = (v: View3q, p: V3): [number, number] => proj(v, p[0], p[1], p[2]);

/** A thick member between two world points (an arm, a rail): an ink edge and a colour core, points wide. */
function member(c: SkCanvas, v: View3q, a: V3, b: V3, w: number, color: string): void {
  const [ax, ay] = P2(v, a);
  const [bx, by] = P2(v, b);
  c.drawPath(segment(ax, ay, bx, by), stroke(INK, w + 2));
  c.drawPath(segment(ax, ay, bx, by), stroke(color, w));
}

/**
 * A six-faced solid from its 8 corners (bottom a b c d, then top a b c d, counter-clockwise seen from
 * above): draws the faces turned to the eye in their flat tones. onFace decorates a face (its 4 corners
 * as bottom a, bottom b, top b, top a, and its outward normal). Returns the top quad.
 */
function solid(c: SkCanvas, v: View3q, q: V3[], color: string, o: { line?: number; onFace?: (pts: V3[], n: V3, top: boolean) => void } = {}): V3[] {
  const line = o.line ?? LINE_W;
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
  // the bottom face, seen only when tilted towards the eye (a tipped skip)
  const bottom = [q[0], q[3], q[2], q[1]];
  const nb = normal(bottom);
  const all = [bottom, ...faces];
  const ns = [nb, ...faces.map(normal)];
  all.forEach((f, i) => {
    const n = ns[i];
    if (facing(v, n) <= 0.01) return;
    const p = facePath(v, f);
    c.drawPath(p, fill(toneOf(color, n)));
    o.onFace?.(f, n, i === 5);
    if (line > 0) c.drawPath(p, stroke(INK, line));
  });
  return [q[4], q[5], q[6], q[7]];
}

/** The 8 corners of a box of len x wid x h along a frame, its bottom centre at (u0, s0, z0), pitched by `pitch` (radians, front up) about (pu, pz). */
function boxCorners(F: ReturnType<typeof frameOf>, len: number, wid: number, h: number, u0: number, s0: number, z0: number, pitch = 0, pu = u0, pz = z0): V3[] {
  const loc: [number, number, number][] = [
    [len / 2, wid / 2, 0],
    [-len / 2, wid / 2, 0],
    [-len / 2, -wid / 2, 0],
    [len / 2, -wid / 2, 0],
    [len / 2, wid / 2, h],
    [-len / 2, wid / 2, h],
    [-len / 2, -wid / 2, h],
    [len / 2, -wid / 2, h],
  ];
  const ca = Math.cos(pitch);
  const sa = Math.sin(pitch);
  return loc.map(([u, s, z]) => {
    let U = u0 + u - pu;
    let Z = z0 + z - pz;
    [U, Z] = [U * ca - Z * sa, U * sa + Z * ca];
    return F.at(U + pu, s0 + s, Z + pz);
  });
}

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

export type ActorKind = 'person' | 'truck' | 'flatbed' | 'van' | 'car' | 'trailer' | 'skip' | 'sack' | 'trolley';

/** Footprint (len along heading, wid) and height in metres of each actor, for its shadow. */
export const ACTOR_SIZE: Readonly<Record<ActorKind, { len: number; wid: number; h: number; ahead?: number }>> = {
  person: { len: 0.6, wid: 0.52, h: 1.1 },
  truck: { len: 4.6, wid: 2.0, h: 2.3 },
  flatbed: { len: 4.6, wid: 2.0, h: 2.2 },
  van: { len: 3.4, wid: 1.8, h: 1.9 },
  car: { len: 2.8, wid: 1.4, h: 1.3 },
  trailer: { len: 1.6, wid: 1.3, h: 0.7, ahead: -2.75 },
  skip: { len: 2.7, wid: 1.75, h: 0.95 },
  sack: { len: 0.6, wid: 0.5, h: 0.8, ahead: 0.65 },
  trolley: { len: 1.0, wid: 0.6, h: 0.5, ahead: 0.88 },
};

function hull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: [number, number][] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop();
    up.push(p[i]);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/**
 * An actor's ground shadow at its anchor: the footprint swept east by the low sun for its height, one
 * flat blue-grey path (never mirrored). heading: the manifest's eight for vehicles; ignored for a person.
 */
export function drawActorShadow(c: SkCanvas, v: View3q, kind: ActorKind, heading = 0): void {
  if (kind === 'person') {
    groundShadow(c, v, 0.3, 0.26, 0, 0, 1.1);
    return;
  }
  const S = ACTOR_SIZE[kind];
  const F = frameOf(headingRad(heading));
  const a = S.ahead ?? 0;
  const corners: [number, number][] = [];
  const sx = S.h * SUN.dx * 0.8;
  const sy = S.h * SUN.dy;
  for (const [u, s] of [
    [a + S.len / 2, S.wid / 2],
    [a - S.len / 2, S.wid / 2],
    [a - S.len / 2, -S.wid / 2],
    [a + S.len / 2, -S.wid / 2],
  ]) {
    const p = F.at(u, s, 0);
    corners.push([p[0] + SHADOW_DX, p[1] + 0.04], [p[0] + SHADOW_DX + sx, p[1] + 0.04 + sy]);
  }
  const h = hull(corners).map(([x, y]) => proj(v, x, y, 0));
  c.drawPath(poly(h.flat()), fill(YARD.shadow, SHADOW_ALPHA));
}

// ---------------------------------------------------------------------------
// The wheeled carriers a person pushes (S8): drawn at the PERSON's anchor, ahead of the person
// ---------------------------------------------------------------------------

export type CarrierKind = 'sack' | 'trolley';
/** Metres from the pushing person's anchor to the carrier's own footprint centre, along the heading. */
export const CARRIER_AHEAD: Readonly<Record<CarrierKind, number>> = { sack: 0.66, trolley: 0.9 };

function tyre(c: SkCanvas, v: View3q, p: V3, f: V3, r: number, side: V3, hub: string = YARD.galvanised): void {
  const z: V3 = [0, 0, 1];
  const face = facing(v, side);
  if (face < 0.3) {
    const [x, y] = P2(v, p);
    const w = r * v.ppm * 0.55;
    const h = r * 2 * v.ppm * v.lift * 0.95;
    c.drawPath(rrect(x - w / 2, y - h / 2, w, h, w * 0.3), fill(YARD.tyre));
    c.drawPath(rrect(x - w / 2, y - h / 2, w, h, w * 0.3), stroke(INK, 0.9));
    if (face <= 0.05) return;
  }
  c.drawPath(discPath(v, p, f, z, r, 18), fill(YARD.tyre));
  c.drawPath(discPath(v, p, f, z, r, 18), stroke(INK, 0.9));
  c.drawPath(discPath(v, p, f, z, r * 0.5, 14), fill(hub));
}

/**
 * The sack truck or the flat trolley, pushed by a person standing at the anchor and facing `dir`, empty
 * or loaded with a family's pieces strapped on. Draw it AFTER the person facing s, e or w and BEFORE the
 * person facing n (manifest actorLayers says so).
 */
export function drawCarrier(c: SkCanvas, v: View3q, kind: CarrierKind, dir: Dir, load?: LoadFamily, anchor: 'person' | 'self' = 'person'): void {
  if (dir === 'w') {
    c.save();
    c.scale(-1, 1);
    drawCarrier(c, v, kind, 'e', load, anchor);
    c.restore();
    return;
  }
  const F = frameOf(dirRad(dir));
  if (anchor === 'self') {
    // drawn round the carrier's own footprint centre, CARRIER_AHEAD metres ahead of the person
    const [px, py] = P2(v, F.at(CARRIER_AHEAD[kind], 0, 0));
    c.save();
    c.translate(-px, -py);
    drawCarrier(c, v, kind, dir, load, 'person');
    c.restore();
    return;
  }
  if (kind === 'sack') sackTruck(c, v, F, load);
  else flatTrolley(c, v, F, load);
}

function sackTruck(c: SkCanvas, v: View3q, F: ReturnType<typeof frameOf>, load?: LoadFamily): void {
  const gu = GRIP.ahead;
  const gz = GRIP.z;
  const bu = gu + 0.58; // the frame's foot
  const bz = 0.05;
  const half = 0.2;
  const wheelR = 0.13;
  // along the frame: t = 0 at the grips, 1 at the foot
  const on = (t: number, s: number, up = 0): V3 => {
    // up: off the frame's face, towards the load side (forward and up)
    const u = gu + (bu - gu) * t + up * 0.82;
    const z = gz + (bz - gz) * t + up * 0.57;
    return F.at(u, s, z);
  };
  const farS = F.ly >= 0 ? -1 : 1; // the side away from the eye
  const nearSide: V3 = [F.lx * -farS, F.ly * -farS, 0];
  const farSide: V3 = [F.lx * farS, F.ly * farS, 0];
  const behind = F.fy < -0.5; // pushed north: the load is on the far face
  const drawLoad = () => {
    if (!load) return;
    const pieces = loadPieces(load, 3);
    pieces.forEach((m, i) => {
      const t = 0.82 - i * 0.26;
      const [x, y] = P2(v, on(t, (hash01(i, 21) - 0.5) * 0.06, 0.14));
      loadPiece(c, m, x, y, 15, (F.fx !== 0 ? 90 : 0) + (hash01(i, 5) - 0.5) * 20, i * 4 + 2);
    });
    // the strap round load and frame
    const a = P2(v, on(0.42, -half - 0.03, 0.2));
    const b = P2(v, on(0.42, half + 0.03, 0.2));
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(INK, 3.6));
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.crateBlue, 2.2));
  };
  // the far wheel, the far rail, the load (unless hidden behind the frame), the near rail and wheel
  tyre(c, v, F.at(bu - 0.02, farS * (half + 0.06), wheelR), F.f, wheelR, farSide);
  if (behind) drawLoad();
  const rail = (s: number) => {
    member(c, v, on(0, s), on(1, s), 1.8, YARD.machine);
  };
  rail(farS * half);
  // cross bars and the toe plate
  for (const t of [0.3, 0.65]) member(c, v, on(t, -half), on(t, half), 1.2, YARD.machine);
  const toe = [on(1, -half - 0.02, 0), on(1, half + 0.02, 0), on(1, half + 0.02, 0.24), on(1, -half - 0.02, 0.24)].map((p) => P2(v, p));
  c.drawPath(poly(toe.flat()), fill(YARD.galvanisedLight));
  c.drawPath(poly(toe.flat()), stroke(INK, 1));
  if (!behind) drawLoad();
  rail(-farS * half);
  // the grips: black handles at the top
  for (const s of [-half, half]) {
    const g = P2(v, on(-0.04, s));
    c.drawPath(oval(g[0], g[1], 2.2, 1.8), fill(YARD.pvc));
  }
  tyre(c, v, F.at(bu - 0.02, -farS * (half + 0.06), wheelR), F.f, wheelR, nearSide);
}

function flatTrolley(c: SkCanvas, v: View3q, F: ReturnType<typeof frameOf>, load?: LoadFamily): void {
  const u0 = GRIP.ahead + 0.06; // the deck's back edge
  const len = 1.0;
  const wid = 0.6;
  const uc = u0 + len / 2;
  const deckZ = 0.14;
  const castor = 0.07;
  const farS = F.ly >= 0 ? -1 : 1;
  const behind = F.fy < -0.5;
  const handle = () => {
    // the U handle at the back edge, up to the grip height
    for (const s of [-wid / 2 + 0.04, wid / 2 - 0.04]) member(c, v, F.at(u0 + 0.03, s, deckZ + 0.04), F.at(GRIP.ahead, s, GRIP.z), 1.8, YARD.machine);
    member(c, v, F.at(GRIP.ahead, -wid / 2 + 0.04, GRIP.z), F.at(GRIP.ahead, wid / 2 - 0.04, GRIP.z), 2.4, YARD.pvc);
  };
  for (const [u, s] of [
    [u0 + 0.1, farS * (wid / 2 - 0.08)],
    [u0 + len - 0.1, farS * (wid / 2 - 0.08)],
  ] as const)
    castorAt(c, v, F.at(u, s, castor), castor);
  if (behind) {
    // pushed north: the handle stands nearest the eye, so the deck and its load go first
  } else handle();
  box(c, v, {
    len,
    wid,
    h: 0.06,
    ox: F.at(uc, 0, 0)[0],
    oy: F.at(uc, 0, 0)[1],
    z: deckZ - 0.02,
    heading: Math.atan2(F.fy, F.fx),
    color: YARD.galvanised,
    line: 1,
    onTop: (q) => {
      // the deck's anti-slip ribs
      for (const t of [0.2, 0.4, 0.6, 0.8]) faceFill(c, v, subQuad(q, t - 0.01, t + 0.01, 0.06, 0.94), shade(YARD.galvanised, -0.15));
    },
  });
  for (const [u, s] of [
    [u0 + 0.1, -farS * (wid / 2 - 0.08)],
    [u0 + len - 0.1, -farS * (wid / 2 - 0.08)],
  ] as const)
    castorAt(c, v, F.at(u, s, castor), castor);
  if (load) {
    // the load lies low on the deck (never above a short stack) under one strap
    const pieces = loadPieces(load, 3).concat(loadPieces(load, 2));
    const spots: [number, number, number][] = [
      [0.25, -0.13, 0.05],
      [0.62, 0.12, 0.05],
      [0.75, -0.12, 0.05],
      [0.4, 0.1, 0.16],
      [0.55, -0.02, 0.24],
    ];
    const order = spots.map((p, i) => ({ p, i, y: F.at(u0 + p[0] * len, p[1], 0)[1] - p[2] * 0.01 })).sort((a, b) => a.y - b.y);
    for (const { p, i } of order) {
      const [x, y] = P2(v, F.at(u0 + p[0] * len, p[1], deckZ + 0.06 + p[2]));
      loadPiece(c, pieces[i % pieces.length], x, y, 17, (F.fx !== 0 ? 0 : 90) + (hash01(i, 8) - 0.5) * 30, i * 5 + 1);
    }
    const a = P2(v, F.at(uc, -wid / 2 - 0.02, deckZ + 0.04));
    const m = P2(v, F.at(uc, 0, deckZ + 0.4));
    const b = P2(v, F.at(uc, wid / 2 + 0.02, deckZ + 0.04));
    const sp = builder().moveTo(a[0], a[1]).quadTo(m[0], m[1] - 4, b[0], b[1]).build();
    c.drawPath(sp, stroke(INK, 3.6));
    c.drawPath(sp, stroke(YARD.crateBlue, 2.2));
  }
  if (behind) handle();
}

function castorAt(c: SkCanvas, v: View3q, p: V3, r: number): void {
  const [x, y] = P2(v, p);
  const R = r * v.ppm;
  c.drawPath(rrect(x - R * 0.45, y - R * 1.1, R * 0.9, R * 2, R * 0.4), fill(YARD.tyre));
  c.drawPath(rrect(x - R * 0.45, y - R * 1.1, R * 0.9, R * 2, R * 0.4), stroke(INK, 0.8));
}

// ---------------------------------------------------------------------------
// The skip and the partners' loads (content2.json partners: the objects each skip holds)
// ---------------------------------------------------------------------------

export type SkipLoad = 'farm-trial' | 'farm-full' | 'demolition-trial' | 'demolition-full';
export const SKIP_LOADS: readonly SkipLoad[] = ['farm-trial', 'farm-full', 'demolition-trial', 'demolition-full'];
export const SKIP = { len: 2.7, wid: 1.75, h: 0.95 } as const;

/** A farm sheet (corrugated galvanised), s points long. */
function farmSheet(c: SkCanvas, s: number, seed: number): void {
  const w = s;
  const h = s * 0.42;
  const b = builder().moveTo(-w / 2, -h / 2);
  for (let i = 0; i <= 6; i++) b.lineTo(-w / 2 + (w * i) / 6, -h / 2 + (i % 2 ? -1.2 : 0));
  b.lineTo(w / 2, h / 2).lineTo(-w / 2, h / 2).close();
  const p = b.build();
  c.drawPath(p, fill(YARD.galvanised));
  for (let i = 1; i < 6; i++) c.drawPath(segment(-w / 2 + (w * i) / 6, -h / 2, -w / 2 + (w * i) / 6, h / 2), stroke(shade(YARD.galvanised, i % 2 ? 0.25 : -0.15), 1));
  c.drawPath(p, stroke(INK, 0.9));
  freckles(c, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, seed, YARD.rust, 4);
}

/** A cast-iron stove: a dark box with a door and a flue stub. */
function stoveGlyph(c: SkCanvas, s: number): void {
  const w = s * 0.62;
  const h = s * 0.58;
  c.drawPath(rrect(-w / 2, -h / 2, w, h, 1.5), fill(YARD.castIron));
  c.drawPath(rrect(-w / 2, -h / 2, w, h * 0.22, 1.5), fill(shade(YARD.castIron, 0.25)));
  c.drawPath(rrect(-w / 2, -h / 2, w, h, 1.5), stroke(INK, 1));
  c.drawPath(rrect(-w * 0.28, -h * 0.12, w * 0.56, h * 0.48, 1), stroke(shade(YARD.castIron, 0.35), 1.1));
  c.drawPath(rrect(w * 0.12, -h / 2 - s * 0.2, s * 0.16, s * 0.2, 0.8), fill(YARD.castIron));
  c.drawPath(rrect(w * 0.12, -h / 2 - s * 0.2, s * 0.16, s * 0.2, 0.8), stroke(INK, 0.8));
}

/** A cast-iron trough: a long dark tub seen from above its rim. */
function troughGlyph(c: SkCanvas, s: number): void {
  const w = s;
  const h = s * 0.36;
  c.drawPath(rrect(-w / 2, -h / 2, w, h, h * 0.4), fill(YARD.castIron));
  c.drawPath(rrect(-w / 2 + 2, -h / 2 + 1.6, w - 4, h * 0.5, h * 0.25), fill(shade(YARD.castIron, -0.35)));
  c.drawPath(rrect(-w / 2, -h / 2, w, h, h * 0.4), stroke(INK, 1));
  for (const x of [-w * 0.3, 0, w * 0.3]) c.drawPath(circle(x, h * 0.25, 0.8), fill(shade(YARD.castIron, 0.4)));
}

/** A plough frame: a bent steel beam with three tines (heavy steel). */
function ploughGlyph(c: SkCanvas, s: number): void {
  const p = builder().moveTo(-s / 2, -s * 0.1).lineTo(s * 0.35, -s * 0.18).lineTo(s / 2, -s * 0.02).build();
  c.drawPath(p, stroke(INK, 4.2));
  c.drawPath(p, stroke(YARD.hms, 2.6));
  for (const x of [-s * 0.3, 0, s * 0.25]) {
    const t = builder().moveTo(x, -s * 0.12).quadTo(x + 1, s * 0.12, x + 4, s * 0.2).build();
    c.drawPath(t, stroke(INK, 3.4));
    c.drawPath(t, stroke(shade(YARD.hms, -0.1), 2));
  }
}

/** A profiled cladding sheet (light iron, painted, flaking). */
function claddingGlyph(c: SkCanvas, s: number, seed: number): void {
  const w = s;
  const h = s * 0.5;
  c.drawPath(rrect(-w / 2, -h / 2, w, h, 1), fill('#7C8F84'));
  for (let i = 1; i < 5; i++) c.drawPath(segment(-w / 2 + (w * i) / 5, -h / 2, -w / 2 + (w * i) / 5, h / 2), stroke(shade('#7C8F84', -0.25), 1.6));
  c.drawPath(rrect(-w / 2, -h / 2, w, h, 1), stroke(INK, 0.9));
  freckles(c, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, seed, YARD.rust, 5);
}

/** A bundle of copper pipe lengths tied together, cut ends bright. */
function pipeBundleGlyph(c: SkCanvas, s: number): void {
  for (let i = 0; i < 3; i++) {
    const y = (i - 1) * s * 0.11;
    const r = rrect(-s / 2, y - s * 0.06, s, s * 0.12, s * 0.05);
    c.drawPath(r, fill(i === 1 ? YARD.copperLight : YARD.copper));
    c.drawPath(r, stroke(INK, 0.8));
    c.drawPath(oval(s / 2, y, s * 0.04, s * 0.06), fill(YARD.copperSheen));
  }
  c.drawPath(segment(-s * 0.2, -s * 0.2, -s * 0.2, s * 0.2), stroke(INK, 2.4));
  c.drawPath(segment(-s * 0.2, -s * 0.2, -s * 0.2, s * 0.2), stroke(YARD.galvanisedLight, 1.2));
}

const LOAD_THINGS: Readonly<Record<SkipLoad, string[]>> = {
  // content2.json partners.partnerFarm.trial / .skip and partnerDemolition: the things each load holds
  'farm-trial': ['sheet', 'sheet', 'stove', 'sheet', 'trough', 'fittings', 'cable', 'stove'],
  'farm-full': ['sheet', 'stove', 'sheet', 'trough', 'sheet', 'plough', 'stove', 'fittings', 'sheet', 'cable', 'trough', 'stove', 'sheet', 'fittings'],
  'demolition-trial': ['cladding', 'beam', 'cladding', 'coil', 'pipe', 'cladding', 'coil', 'fittings'],
  'demolition-full': ['cladding', 'beam', 'coil', 'cladding', 'pipe', 'beam', 'cladding', 'coil', 'fittings', 'beam', 'pipe', 'cladding', 'coil', 'fittings'],
};

function loadThing(c: SkCanvas, name: string, x: number, y: number, s: number, turn: number, seed: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(turn, 0, 0);
  switch (name) {
    case 'sheet':
      farmSheet(c, s * 1.3, seed);
      break;
    case 'stove':
      stoveGlyph(c, s);
      break;
    case 'trough':
      troughGlyph(c, s * 1.2);
      break;
    case 'plough':
      ploughGlyph(c, s * 1.3);
      break;
    case 'cladding':
      claddingGlyph(c, s * 1.3, seed);
      break;
    case 'pipe':
      pipeBundleGlyph(c, s * 1.2);
      break;
    case 'coil':
    case 'cable':
      loadPiece(c, 'cable', 0, 0, s * 0.9, 0, seed);
      break;
    case 'beam':
      pieceGlyph(c, 'hms', 0, 0, s * 1.3, 0, seed);
      break;
    case 'fittings':
    default:
      pieceGlyph(c, 'brass', -s * 0.15, 0, s * 0.6, 0, seed);
      pieceGlyph(c, 'brass', s * 0.2, s * 0.05, s * 0.6, 30, seed + 1);
  }
  c.restore();
}

/**
 * A partner's load as it shows over a skip's rim: a mound of the things content names, drawn round
 * (0, 0) = the centre of the skip's open top. Round in plan (radius about 0.8 m), so the one drawing
 * serves every heading of the truck and the skip on the ground.
 */
export function drawSkipLoad(c: SkCanvas, v: View3q, load: SkipLoad): void {
  const things = LOAD_THINGS[load];
  const full = load.endsWith('full');
  const k = v.ppm / 40;
  c.save();
  c.scale(k, k);
  const R = full ? 30 : 26;
  const H = full ? 15 : 6;
  const mound = builder()
    .moveTo(-R, 3)
    .quadTo(-R * 0.7, -H * 1.1, 0, -H)
    .quadTo(R * 0.7, -H * 1.1, R, 3)
    .quadTo(0, 10, -R, 3)
    .close()
    .build();
  const base = load.startsWith('farm') ? shade(YARD.castIron, -0.1) : shade('#6B6F66', -0.2);
  c.drawPath(mound, fill(base));
  c.drawPath(mound, stroke(INK, 1));
  const n = things.length;
  const pts = things.map((t, i) => {
    const a = hash01(i, 41) * Math.PI * 2;
    const r = Math.sqrt(hash01(i, 42)) * (R - 8);
    const x = Math.cos(a) * r;
    const yb = Math.sin(a) * r * 0.45;
    const up = (1 - (r / R) ** 2) * H * 0.8;
    return { t, i, x, y: yb - up + 2 };
  });
  pts.sort((a, b) => a.y - b.y);
  for (const p of pts) loadThing(c, p.t, p.x, p.y, 13, (hash01(p.i, 43) - 0.5) * 50, p.i + n);
  c.restore();
}

/**
 * A skip by itself (red-oxide, ribbed long sides, hazard corner panels, open top), its footprint centre
 * at (u0, z0) along the heading, pitched by `pitch` radians (front up) about the point (pu, pz). Used on
 * the ground at a partner's site (pitch 0) and on the hook in the hook and tip frames.
 */
export function drawSkip(c: SkCanvas, v: View3q, heading: number, o: { u0?: number; z0?: number; pitch?: number; pu?: number; pz?: number; load?: SkipLoad; spill?: boolean } = {}): void {
  const F = frameOf(heading);
  const u0 = o.u0 ?? 0;
  const z0 = o.z0 ?? 0;
  const pitch = o.pitch ?? 0;
  const q = boxCorners(F, SKIP.len, SKIP.wid, SKIP.h, u0, 0, z0, pitch, o.pu ?? u0, o.pz ?? z0);
  // the inside first: its far walls and floor, dark
  const inner = boxCorners(F, SKIP.len - 0.12, SKIP.wid - 0.12, SKIP.h - 0.04, u0, 0, z0 + 0.04, pitch, o.pu ?? u0, o.pz ?? z0);
  const top = [inner[4], inner[5], inner[6], inner[7]];
  const topOpen = facing(v, [0, 0, 1]) > 0 && Math.abs(pitch) < 1.2;
  solid(c, v, q, YARD.skip, {
    onFace: (f, n, isTop) => {
      if (isTop) {
        // the open top: the dark inside
        if (topOpen) faceFill(c, v, top, shade(YARD.skip, -0.55));
        return;
      }
      const along = Math.abs(n[0] * F.fx + n[1] * F.fy);
      if (along < 0.5) {
        for (const s of [0.2, 0.4, 0.6, 0.8]) faceFill(c, v, subQuad(f, s - 0.015, s + 0.015, 0.05, 0.95), shade(YARD.skip, -0.32));
        const [rx, ry] = P2(v, subQuad(f, 0.3, 0.3, 0.3, 0.3)[0]);
        freckles(c, rx, ry, 18, 8, 11, YARD.rustLight, 4);
      } else {
        const pp = subQuad(f, 0.05, 0.95, 0.62, 0.92).map((pt) => P2(v, pt));
        hazard(c, poly(pp.flat()), 3.4, 0.8);
      }
    },
  });
  if (o.load && Math.abs(pitch) < 0.2) {
    const cTop = [0, 1, 2].map((k) => (q[4][k] + q[5][k] + q[6][k] + q[7][k]) / 4) as V3;
    const [x, y] = P2(v, cTop);
    c.save();
    c.translate(x, y);
    drawSkipLoad(c, v, o.load);
    c.restore();
  }
  if (o.spill && o.load) {
    // tipping: the load slides out of the rear (the low end) onto the floor
    const rear = [0, 1, 2].map((k) => (q[1][k] + q[2][k]) / 2) as V3;
    const [x, y] = P2(v, rear);
    const things = LOAD_THINGS[o.load];
    for (let i = 0; i < 6; i++) {
      const dx = -8 - hash01(i, 51) * 26;
      const dy = -6 + i * 4 + hash01(i, 52) * 4;
      loadThing(c, things[i % things.length], x + dx * Math.sign(F.fx || 1), y + dy, 12, (hash01(i, 53) - 0.5) * 90, i + 3);
    }
  }
}

/** The centre of a skip's open top on the truck, in points from the truck's anchor (where drawSkipLoad goes). */
export function skipTopOnTruck(v: View3q, heading: number): [number, number] {
  const F = frameOf(heading);
  return P2(v, F.at(TRUCK.skipU, 0, TRUCK.bedZ + SKIP.h));
}

// ---------------------------------------------------------------------------
// The hook-lift truck
// ---------------------------------------------------------------------------

/** The hook-lift truck's geometry, metres along its heading from the footprint centre. */
export const TRUCK = { len: 4.6, wid: 2.0, cabU: 1.75, cabLen: 1.1, bedZ: 0.8, skipU: -0.75, postU: 0.95, pivotU: -2.2 } as const;

function truckWheel(c: SkCanvas, v: View3q, p: V3, f: V3, r: number, side: V3): void {
  const z: V3 = [0, 0, 1];
  const face = facing(v, side);
  if (face < 0.3) {
    box(c, v, { len: 2 * r * 0.92, wid: 0.32, h: 2 * r * 0.95, ox: p[0], oy: p[1], z: p[2] - r, heading: Math.atan2(f[1], f[0]), color: YARD.tyre, line: 1 });
    if (face <= 0.05) return;
  }
  const q: V3 = [p[0] + side[0] * 0.16, p[1] + side[1] * 0.16, p[2]];
  c.drawPath(discPath(v, q, f, z, r), fill(YARD.tyre));
  c.drawPath(discPath(v, q, f, z, r), stroke(INK, 1));
  c.drawPath(discPath(v, q, f, z, r * 0.5), fill(YARD.galvanised));
  c.drawPath(discPath(v, q, f, z, r * 0.2), fill(YARD.steelDark));
}

/** A cab: a box with windows on its visible faces, a hi-vis band, a beacon, a driver's head in the side window. */
function cab(c: SkCanvas, v: View3q, F: ReturnType<typeof frameOf>, heading: number, u: number, len: number, wid: number, colour: string, o: { driver?: boolean; band?: string } = {}): void {
  const isFront = (n: V3) => n[0] * F.fx + n[1] * F.fy > 0.7;
  const isBack = (n: V3) => n[0] * F.fx + n[1] * F.fy < -0.7;
  const p = F.at(u, 0, 0);
  box(c, v, {
    len,
    wid,
    h: 1.5,
    z: 0.7,
    ox: p[0],
    oy: p[1],
    heading,
    color: colour,
    bevel: true,
    // the raked windscreen's top seen from above along the front edge, and a sun visor: so a cab seen
    // from the side reads as a cab, not a box (art-judge 11)
    onTop: (q) => {
      faceFill(c, v, subQuad(q, 0, 0.3, 0.05, 0.95), YARD.glassDark, 1);
      faceFill(c, v, subQuad(q, 0.04, 0.12, 0.1, 0.5), YARD.glass, 0, 0.8);
      faceFill(c, v, subQuad(q, 0.3, 0.36, 0.02, 0.98), shade(colour, -0.25), 0.8);
    },
    onFace: (q, n) => {
      if (isBack(n)) return;
      const win = isFront(n) ? subQuad(q, 0.1, 0.9, 0.5, 0.9) : subQuad(q, 0.12, 0.62, 0.5, 0.9);
      faceFill(c, v, win, YARD.glassDark, 1);
      if (o.driver !== false && !isFront(n)) {
        // the driver's head and shoulders in the side window (a dark silhouette in a hat)
        const hc = P2(v, subQuad(win, 0.5, 0.5, 0.35, 0.35)[0]);
        c.drawPath(oval(hc[0], hc[1] + 1, 3.4, 3.2), fill(shade(YARD.glassDark, -0.45)));
        c.drawPath(builder().moveTo(hc[0] - 4, hc[1] - 1.4).quadTo(hc[0], hc[1] - 6.5, hc[0] + 4, hc[1] - 1.4).close().build(), fill(shade(YARD.glassDark, -0.45)));
      } else if (o.driver !== false && isFront(n)) {
        const hc = P2(v, subQuad(win, 0.32, 0.32, 0.3, 0.3)[0]);
        c.drawPath(oval(hc[0], hc[1] + 1, 3.2, 3.2), fill(shade(YARD.glassDark, -0.45)));
      }
      faceFill(c, v, subQuad(win, 0.12, 0.26, 0.1, 0.9), YARD.glass, 0, 0.9);
      faceFill(c, v, subQuad(q, 0, 1, 0.08, 0.22), o.band ?? YARD.hivis, 0.9);
    },
  });
  const [bx, by] = P2(v, F.at(u, 0, 2.2));
  c.drawPath(rrect(bx - 3, by - 7, 6, 7, 2), fill(YARD.hivis));
  c.drawPath(rrect(bx - 3, by - 7, 6, 7, 2), stroke(INK, 1));
}

/** The door slot of a cab (where the world draws a firm's mark), points from the anchor, for a heading. */
export function doorSlot(v: View3q, heading: number, kind: 'truck' | 'flatbed'): { x: number; y: number; w: number; h: number } | null {
  const F = frameOf(heading);
  const near = F.ly >= 0 ? 1 : -1;
  const n: V3 = [F.lx * near, F.ly * near, 0];
  if (facing(v, n) < 0.3) return null;
  const u = kind === 'truck' ? TRUCK.cabU : FLATBED.cabU;
  const a = P2(v, F.at(u - 0.35, near * 1.0, 1.0));
  const b = P2(v, F.at(u + 0.25, near * 1.0, 1.25));
  return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.max(6, Math.abs(b[0] - a[0])), h: Math.max(6, Math.abs(b[1] - a[1])) };
}

type ArmPose = 'down' | 'reach' | 'incline' | 'raise';

/** The hook arm (hi-vis): a main frame on the bed from the rear pivot to the post, the post and its hook. */
function hookArm(c: SkCanvas, v: View3q, F: ReturnType<typeof frameOf>, pose: ArmPose): void {
  const W = 0.55;
  const pv = { u: TRUCK.pivotU, z: TRUCK.bedZ + 0.1 };
  const frameLen = TRUCK.postU - TRUCK.pivotU;
  const ang = pose === 'raise' ? 0.7 : 0;
  const end = { u: pv.u + Math.cos(ang) * frameLen, z: pv.z + Math.sin(ang) * frameLen };
  // the post's top: up from the frame's end; reach and incline swing it back over the rear
  let top = { u: end.u - Math.sin(ang) * 1.0, z: end.z + Math.cos(ang) * 1.0 };
  if (pose === 'reach') top = { u: pv.u - 1.1, z: 0.55 };
  if (pose === 'incline') top = { u: pv.u - 0.35, z: TRUCK.bedZ + 0.75 };
  const base = pose === 'reach' || pose === 'incline' ? { u: pv.u + 0.6, z: pv.z } : end;
  for (const s of [-W / 2, W / 2]) member(c, v, F.at(pv.u, s, pv.z), F.at(base.u, s, base.z), 3, YARD.hivis);
  member(c, v, F.at(base.u, 0, base.z), F.at(top.u, 0, top.z), 4, YARD.hivis);
  // the hook
  const [hx, hy] = P2(v, F.at(top.u, 0, top.z));
  c.drawPath(builder().moveTo(hx, hy).quadTo(hx - 5 * Math.sign(F.fx || 1), hy + 1, hx - 4 * Math.sign(F.fx || 1), hy + 5).build(), stroke(INK, 3));
  c.drawPath(builder().moveTo(hx, hy).quadTo(hx - 5 * Math.sign(F.fx || 1), hy + 1, hx - 4 * Math.sign(F.fx || 1), hy + 5).build(), stroke(YARD.steelDark, 1.6));
}

/**
 * The hook-lift truck at a heading (radians), its skip on the bed ('on'), none ('none'), with the arm in a
 * pose, a driver in the cab. No shadow (drawActorShadow). A skip load given here is drawn over the rim
 * (the atlas draws it as its own overlay: skipTopOnTruck). Footprint 4.6 x 2.0 m; anchor the centre.
 */
export function drawHookTruck(c: SkCanvas, v: View3q, heading: number, o: { skip?: 'on' | 'none'; arm?: ArmPose; load?: SkipLoad; driver?: boolean; shadow?: boolean } = {}): void {
  const F = frameOf(heading);
  if (o.shadow) {
    const i = Math.round((Math.PI / 2 - heading) / (Math.PI / 4));
    drawActorShadow(c, v, 'truck', ((i % 8) + 8) % 8);
  }
  const wheels: [number, number][] = [
    [1.45, 0.86],
    [-0.9, 0.86],
    [-1.6, 0.86],
    [1.45, -0.86],
    [-0.9, -0.86],
    [-1.6, -0.86],
  ];
  const nearSign = F.ly >= 0 ? 1 : -1;
  const sideOf = (s: number): V3 => [F.lx * Math.sign(s), F.ly * Math.sign(s), 0];
  for (const [u, s] of wheels) if (Math.sign(s) !== nearSign) truckWheel(c, v, F.at(u, s, 0.42), F.f, 0.42, sideOf(s));
  const ch = F.at(0, 0, 0);
  box(c, v, { len: TRUCK.len * 0.95, wid: TRUCK.wid * 0.7, h: 0.3, z: 0.5, ox: ch[0], oy: ch[1], heading, color: YARD.machineDark });
  // the bed's rear rollers
  member(c, v, F.at(TRUCK.pivotU, -0.6, TRUCK.bedZ), F.at(TRUCK.pivotU, 0.6, TRUCK.bedZ), 3.2, YARD.steelDark);
  const cabFirst = F.fy < -0.3; // driving away from the eye: the cab is farther than the skip
  const drawCab = () => cab(c, v, F, heading, TRUCK.cabU, TRUCK.cabLen, TRUCK.wid, YARD.cab, { driver: o.driver });
  if (cabFirst) drawCab();
  const arm = o.arm ?? 'down';
  if (o.skip !== 'none') {
    hookArm(c, v, F, arm);
    drawSkip(c, v, heading, { u0: TRUCK.skipU, z0: TRUCK.bedZ, load: o.load });
  } else hookArm(c, v, F, arm);
  if (!cabFirst) drawCab();
  for (const [u, s] of wheels) if (Math.sign(s) === nearSign) truckWheel(c, v, F.at(u, s, 0.42), F.f, 0.42, sideOf(s));
}

export type HookFrame = 'bare' | 'reach' | 'incline' | 'tipped';
export const HOOK_FRAMES: readonly HookFrame[] = ['bare', 'reach', 'incline', 'tipped'];

/**
 * The swap and the tip at heading east (the world parks the truck east-west for both; west is its
 * mirror): 'bare' no skip, arm down; 'reach' the arm swung back to a skip on the ground behind; 'incline'
 * the skip half up the rear rollers; 'tipped' the skip raised at the front, its load sliding out.
 * The hook sequence is reach, incline, then the truck with its skip on; the tip is incline, tipped,
 * incline. Anchor: the truck's footprint centre.
 */
export function drawHookFrame(c: SkCanvas, v: View3q, frame: HookFrame, load?: SkipLoad): void {
  const heading = 0;
  const F = frameOf(heading);
  if (frame === 'bare' || frame === 'reach') {
    drawHookTruck(c, v, heading, { skip: 'none', arm: frame === 'reach' ? 'reach' : 'down' });
    return;
  }
  // the truck without its skip, then the skip on the arm, then the near wheels again over it
  const wheels: [number, number][] = [
    [1.45, 0.86],
    [-0.9, 0.86],
    [-1.6, 0.86],
  ];
  if (frame === 'incline') {
    // the skip's rear on the ground behind, its front on the rollers
    const pitch = -0.32;
    drawHookTruck(c, v, heading, { skip: 'none', arm: 'incline' });
    drawSkip(c, v, heading, { u0: TRUCK.pivotU - SKIP.len / 2 + 0.25, z0: TRUCK.bedZ - 0.05, pitch: -pitch, pu: TRUCK.pivotU + 0.25, pz: TRUCK.bedZ - 0.05 });
    for (const [u, s] of wheels) truckWheel(c, v, F.at(u, s, 0.42), F.f, 0.42, [0, 1, 0]);
    return;
  }
  // tipped: the front raised, the rear down at the rollers
  drawHookTruck(c, v, heading, { skip: 'none', arm: 'raise' });
  drawSkip(c, v, heading, { u0: TRUCK.pivotU + SKIP.len / 2, z0: TRUCK.bedZ, pitch: 0.7, pu: TRUCK.pivotU, pz: TRUCK.bedZ, load, spill: true });
  for (const [u, s] of wheels) truckWheel(c, v, F.at(u, s, 0.42), F.f, 0.42, [0, 1, 0]);
}

// ---------------------------------------------------------------------------
// The merchant's flatbed with its small crane and grab
// ---------------------------------------------------------------------------

export const FLATBED = { len: 4.6, wid: 2.0, cabU: 1.75, cabLen: 1.1, bedZ: 0.85, bedU: -0.6, colU: 0.95 } as const;
export type CraneFrame = 'stowed' | 'reach' | 'lift' | 'swing';
export const CRANE_FRAMES: readonly CraneFrame[] = ['reach', 'lift', 'swing'];
/** The merchant's livery (the cab); the world's mark goes in doorSlot. */
export const MERCHANT_CAB = YARD.stampBlue;

/** The grab (a two-shell clamshell bucket) hanging at p, open or closed, with scrap in it when full. */
function grab(c: SkCanvas, v: View3q, p: V3, open: boolean, full: boolean): void {
  const [x, y] = P2(v, p);
  c.drawPath(segment(x, y - 10, x, y - 2), stroke(INK, 1.2));
  const sp = open ? 6.5 : 3.2;
  for (const sgn of [-1, 1]) {
    const shell = builder().moveTo(x, y - 2).quadTo(x + sgn * (sp + 3), y + 1, x + sgn * sp, y + 8).lineTo(x + sgn * (sp - 3.5), y + 8).quadTo(x + sgn * 2, y + 3, x, y - 1).close().build();
    c.drawPath(shell, fill(YARD.hivis));
    c.drawPath(shell, stroke(INK, 1));
  }
  if (full) {
    pieceGlyph(c, 'light_iron', x - 2, y + 2, 8, 20, 3);
    pieceGlyph(c, 'copper', x + 2, y + 1, 7, 0, 2);
  }
  c.drawPath(rrect(x - 2.5, y - 4, 5, 3, 1), fill(YARD.steelDark));
  c.drawPath(rrect(x - 2.5, y - 4, 5, 3, 1), stroke(INK, 0.8));
}

/** The knuckle crane behind the cab: column, two booms and the grab, in a frame (only the booms when `only`). */
function crane(c: SkCanvas, v: View3q, F: ReturnType<typeof frameOf>, frame: CraneFrame, column: boolean, booms = true): void {
  const colTop = F.at(FLATBED.colU, 0.3, 2.05);
  if (column) {
    const b = F.at(FLATBED.colU, 0.3, 0);
    box(c, v, { len: 0.36, wid: 0.36, h: 1.15, ox: b[0], oy: b[1], z: 0.9, heading: Math.atan2(F.fy, F.fx), color: YARD.hivis, line: 1 });
  }
  if (!booms) return;
  if (frame === 'stowed') {
    // folded tight behind the cab: up, back down, the grab on the bed
    const k1 = F.at(FLATBED.colU - 0.45, 0.3, 2.15);
    const k2 = F.at(FLATBED.colU - 0.1, 0.3, 1.45);
    member(c, v, colTop, k1, 3.6, YARD.hivis);
    member(c, v, k1, k2, 3, YARD.hivisDark);
    grab(c, v, F.at(FLATBED.colU - 0.55, 0.3, FLATBED.bedZ + 0.05), false, false);
    return;
  }
  // out over the bays (south of the truck facing east: the left-hand side l), or back over the bed
  const tip =
    frame === 'reach' ? F.at(FLATBED.colU - 0.6, 2.4, 2.4) : frame === 'lift' ? F.at(FLATBED.colU - 0.7, 2.0, 2.9) : F.at(FLATBED.bedU, 0.1, 2.9);
  const knuckle = frame === 'swing' ? F.at(FLATBED.colU - 0.2, 0.2, 3.1) : F.at(FLATBED.colU - 0.2, 1.0, 3.0);
  member(c, v, colTop, knuckle, 4, YARD.hivis);
  member(c, v, knuckle, tip, 3.2, YARD.hivisDark);
  const hang = frame === 'reach' ? 1.7 : frame === 'lift' ? 1.0 : 1.1;
  const g: V3 = [tip[0], tip[1], tip[2] - hang];
  const [tx, ty] = P2(v, tip);
  const [gx, gy] = P2(v, g);
  c.drawPath(segment(tx, ty, gx, gy - 10), stroke(INK, 1));
  grab(c, v, g, frame !== 'lift', frame === 'lift');
  if (frame === 'swing') {
    // the grab opening over the bed, pieces dropping
    for (let i = 0; i < 3; i++) pieceGlyph(c, i === 1 ? 'copper' : 'light_iron', gx - 4 + i * 4, gy + 12 + i * 3, 7, i * 40, i + 5);
  }
}

/** A heap of the merchant's collected lots on the bed, round (0, 0) = the bed's centre (one drawing for every heading). */
export function drawFlatbedCargo(c: SkCanvas, v: View3q, amount: 'part' | 'full'): void {
  const k = v.ppm / 40;
  c.save();
  c.scale(k, k);
  const R = amount === 'full' ? 28 : 20;
  const H = amount === 'full' ? 13 : 7;
  const mound = builder()
    .moveTo(-R, 3)
    .quadTo(-R * 0.7, -H * 1.1, 0, -H)
    .quadTo(R * 0.7, -H * 1.1, R, 3)
    .quadTo(0, 10, -R, 3)
    .close()
    .build();
  c.drawPath(mound, fill(shade(YARD.steel, -0.2)));
  c.drawPath(mound, stroke(INK, 1));
  const metals = ['light_iron', 'light_iron', 'cast_iron', 'copper', 'light_iron', 'brass', 'hms', 'light_iron', 'copper', 'cast_iron'];
  const n = amount === 'full' ? 10 : 6;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = hash01(i, 61) * Math.PI * 2;
    const r = Math.sqrt(hash01(i, 62)) * (R - 6);
    return { i, x: Math.cos(a) * r, y: Math.sin(a) * r * 0.45 - (1 - (r / R) ** 2) * H * 0.8 + 2 };
  }).sort((a, b) => a.y - b.y);
  for (const p of pts) pieceGlyph(c, metals[p.i % metals.length], p.x, p.y, 12, (hash01(p.i, 63) - 0.5) * 60, p.i);
  c.restore();
}

/** The centre of the flatbed's bed in points from its anchor (where drawFlatbedCargo goes). */
export function flatbedBedCentre(v: View3q, heading: number): [number, number] {
  const F = frameOf(heading);
  return P2(v, F.at(FLATBED.bedU, 0, FLATBED.bedZ + 0.12));
}

/**
 * The merchant's flatbed (a crane lorry in the merchant's livery) at a heading: cab, a flat bed with low
 * galvanised sides, a knuckle crane behind the cab with a grab. crane: 'stowed' (driving) or a loading
 * frame; `parts`: 'all', 'body' (the crane's column only: the loading base) or 'crane' (the booms and
 * grab only: the loading overlay). Footprint 4.6 x 2.0 m.
 */
export function drawFlatbed(c: SkCanvas, v: View3q, heading: number, o: { crane?: CraneFrame; cargo?: 'part' | 'full'; parts?: 'all' | 'body' | 'crane'; driver?: boolean } = {}): void {
  const F = frameOf(heading);
  const parts = o.parts ?? 'all';
  const frame = o.crane ?? 'stowed';
  if (parts === 'crane') {
    crane(c, v, F, frame, false, true);
    return;
  }
  const wheels: [number, number][] = [
    [1.45, 0.86],
    [-1.0, 0.86],
    [-1.7, 0.86],
    [1.45, -0.86],
    [-1.0, -0.86],
    [-1.7, -0.86],
  ];
  const nearSign = F.ly >= 0 ? 1 : -1;
  const sideOf = (s: number): V3 => [F.lx * Math.sign(s), F.ly * Math.sign(s), 0];
  for (const [u, s] of wheels) if (Math.sign(s) !== nearSign) truckWheel(c, v, F.at(u, s, 0.42), F.f, 0.42, sideOf(s));
  const ch = F.at(0, 0, 0);
  box(c, v, { len: FLATBED.len * 0.95, wid: FLATBED.wid * 0.7, h: 0.3, z: 0.5, ox: ch[0], oy: ch[1], heading, color: YARD.machineDark });
  const cabFirst = F.fy < -0.3;
  const drawCab = () => cab(c, v, F, heading, FLATBED.cabU, FLATBED.cabLen, FLATBED.wid, MERCHANT_CAB, { driver: o.driver, band: YARD.reflect });
  if (cabFirst) drawCab();
  // the bed: a deck with low dropsides
  const bedLen = 3.1;
  const bc = F.at(FLATBED.bedU, 0, 0);
  box(c, v, {
    len: bedLen,
    wid: FLATBED.wid,
    h: 0.1,
    z: FLATBED.bedZ - 0.1,
    ox: bc[0],
    oy: bc[1],
    heading,
    color: YARD.wood,
    onTop: (q) => {
      for (const t of [0.2, 0.4, 0.6, 0.8]) faceFill(c, v, subQuad(q, 0.02, 0.98, t - 0.006, t + 0.006), shade(YARD.wood, -0.25));
    },
  });
  // the far dropside and the front bulkhead, the cargo, then the near dropside and the back
  const side = (s: number) => {
    const p = F.at(FLATBED.bedU, s, 0);
    box(c, v, { len: bedLen, wid: 0.06, h: 0.32, z: FLATBED.bedZ, ox: p[0], oy: p[1], heading, color: YARD.galvanised, line: 1 });
  };
  const end = (u: number) => {
    const p = F.at(u, 0, 0);
    box(c, v, { len: 0.06, wid: FLATBED.wid, h: 0.32, z: FLATBED.bedZ, ox: p[0], oy: p[1], heading, color: YARD.galvanised, line: 1 });
  };
  const farEndU = F.fy < 0 ? FLATBED.bedU - bedLen / 2 : FLATBED.bedU + bedLen / 2;
  const nearEndU = F.fy < 0 ? FLATBED.bedU + bedLen / 2 : FLATBED.bedU - bedLen / 2;
  side(-nearSign * (FLATBED.wid / 2 - 0.03));
  end(farEndU);
  if (o.cargo) {
    const [x, y] = flatbedBedCentre(v, heading);
    c.save();
    c.translate(x, y);
    drawFlatbedCargo(c, v, o.cargo);
    c.restore();
  }
  side(nearSign * (FLATBED.wid / 2 - 0.03));
  end(nearEndU);
  // the crane: its column always; the booms stowed (driving), out (loading) or left to the overlay
  crane(c, v, F, frame, true, parts === 'all');
  if (!cabFirst) drawCab();
  for (const [u, s] of wheels) if (Math.sign(s) === nearSign) truckWheel(c, v, F.at(u, s, 0.42), F.f, 0.42, sideOf(s));
}

// ---------------------------------------------------------------------------
// The vans: the public's (with a trailer at the drop-off) and the delivery van
// ---------------------------------------------------------------------------

export const VAN = { len: 3.4, wid: 1.8 } as const;

/** A box trailer behind a van: drawn round the van's anchor, its centre 2.75 m behind. */
export function drawTrailer(c: SkCanvas, v: View3q, heading: number, anchor: 'van' | 'self' = 'van'): void {
  const F = frameOf(heading);
  if (anchor === 'self') {
    const [px, py] = P2(v, F.at(ACTOR_SIZE.trailer.ahead ?? -2.75, 0, 0));
    c.save();
    c.translate(-px, -py);
    drawTrailer(c, v, heading, 'van');
    c.restore();
    return;
  }
  const u = ACTOR_SIZE.trailer.ahead ?? -2.75;
  const nearSign = F.ly >= 0 ? 1 : -1;
  const wheelAt = (s: number) => truckWheel(c, v, F.at(u, s * 0.62, 0.26), F.f, 0.26, [F.lx * Math.sign(s), F.ly * Math.sign(s), 0]);
  wheelAt(-nearSign);
  // the drawbar to the van's tow hitch
  member(c, v, F.at(u + 0.75, 0, 0.42), F.at(-VAN.len / 2 - 0.1, 0, 0.45), 2.2, YARD.steelDark);
  const p = F.at(u, 0, 0);
  box(c, v, {
    len: 1.5,
    wid: 1.25,
    h: 0.42,
    z: 0.32,
    ox: p[0],
    oy: p[1],
    heading,
    color: YARD.galvanised,
    onTop: (q) => faceFill(c, v, subQuad(q, 0.05, 0.95, 0.06, 0.94), shade(YARD.galvanised, -0.4)),
  });
  wheelAt(nearSign);
}

/**
 * A small panel van at a heading: enamel body (or `body`, which the atlas may tint), windscreen, a
 * driver; with the public's box trailer behind when `trailer`. Footprint 3.4 x 1.8 m (trailer 2.75 m behind).
 */
export function drawVan(c: SkCanvas, v: View3q, heading: number, o: { body?: string; trailer?: boolean; driver?: boolean } = {}): void {
  const F = frameOf(heading);
  const body = o.body ?? YARD.enamel;
  const trailerFirst = F.fy > -0.3; // the trailer is farther from the eye than the van
  if (o.trailer && trailerFirst) drawTrailer(c, v, heading);
  const nearSign = F.ly >= 0 ? 1 : -1;
  const wheels: [number, number][] = [
    [1.05, 0.78],
    [-1.05, 0.78],
    [1.05, -0.78],
    [-1.05, -0.78],
  ];
  const sideOf = (s: number): V3 => [F.lx * Math.sign(s), F.ly * Math.sign(s), 0];
  for (const [u, s] of wheels) if (Math.sign(s) !== nearSign) truckWheel(c, v, F.at(u, s, 0.33), F.f, 0.33, sideOf(s));
  const isFront = (n: V3) => n[0] * F.fx + n[1] * F.fy > 0.7;
  const isBack = (n: V3) => n[0] * F.fx + n[1] * F.fy < -0.7;
  // the load box behind, the bonnet in front, the cab between
  const lb = F.at(-0.45, 0, 0);
  box(c, v, {
    len: 2.4,
    wid: VAN.wid,
    h: 1.45,
    z: 0.4,
    ox: lb[0],
    oy: lb[1],
    heading,
    color: body,
    bevel: true,
    onFace: (q, n) => {
      if (isBack(n)) {
        faceFill(c, v, subQuad(q, 0.495, 0.505, 0.05, 0.95), shade(body, -0.3));
        faceFill(c, v, subQuad(q, 0.1, 0.9, 0.12, 0.2), YARD.reflect, 0.8);
      } else if (!isFront(n)) {
        faceFill(c, v, subQuad(q, 0.62, 0.98, 0.5, 0.88), YARD.glassDark, 1);
        faceFill(c, v, subQuad(q, 0.02, 0.98, 0.14, 0.2), shade(body, -0.22));
      }
    },
  });
  const bn = F.at(1.35, 0, 0);
  box(c, v, {
    len: 0.6,
    wid: VAN.wid * 0.96,
    h: 0.55,
    z: 0.4,
    ox: bn[0],
    oy: bn[1],
    heading,
    color: body,
    onFace: (q, n) => {
      if (isFront(n)) {
        faceFill(c, v, subQuad(q, 0.08, 0.26, 0.55, 0.85), YARD.paper, 0.8);
        faceFill(c, v, subQuad(q, 0.74, 0.92, 0.55, 0.85), YARD.paper, 0.8);
        faceFill(c, v, subQuad(q, 0.3, 0.7, 0.2, 0.45), shade(body, -0.35), 0.8);
      }
    },
  });
  // the cab's nose between the bonnet and the box: the windscreen raked from the bonnet's back edge up to
  // the box's front top edge, its two side pillars filling the wedge (joined to the body, art-judge 11)
  const hw = VAN.wid / 2 - 0.02;
  const ws: V3[] = [F.at(1.05, -hw, 0.95), F.at(1.05, hw, 0.95), F.at(0.75, hw, 1.85), F.at(0.75, -hw, 1.85)];
  for (const sgn of [-1, 1]) {
    const n: V3 = [F.lx * sgn, F.ly * sgn, 0];
    if (facing(v, n) <= 0.01) continue;
    const wedge: V3[] = [F.at(0.75, sgn * hw, 0.95), F.at(1.05, sgn * hw, 0.95), F.at(0.75, sgn * hw, 1.85)];
    const p = facePath(v, wedge);
    c.drawPath(p, fill(shade(body, -0.12)));
    c.drawPath(p, stroke(INK, 1));
    faceFill(c, v, [F.at(0.8, sgn * hw, 1.0), F.at(0.98, sgn * hw, 1.0), F.at(0.8, sgn * hw, 1.6), F.at(0.8, sgn * hw, 1.6)], YARD.glassDark, 0.8);
  }
  const nws: V3 = [F.fx * 0.95, F.fy * 0.95, 0.3];
  if (facing(v, nws) > 0.02) {
    const p = facePath(v, ws);
    c.drawPath(p, fill(YARD.glassDark));
    c.drawPath(p, stroke(INK, 1));
    if (o.driver !== false) {
      const hc = P2(v, F.at(0.8, nearSign * 0.4, 1.45));
      c.drawPath(oval(hc[0], hc[1], 3.2, 3.2), fill(shade(YARD.glassDark, -0.45)));
    }
    faceFill(c, v, subQuad(ws, 0.15, 0.3, 0.1, 0.9), YARD.glass, 0, 0.85);
  }
  for (const [u, s] of wheels) if (Math.sign(s) === nearSign) truckWheel(c, v, F.at(u, s, 0.33), F.f, 0.33, sideOf(s));
  if (o.trailer && !trailerFirst) drawTrailer(c, v, heading);
}

// ---------------------------------------------------------------------------
// The public's car (a small hatchback that brings a washer in its boot or a trailer behind)
// ---------------------------------------------------------------------------

export const CAR = { len: 2.8, wid: 1.4 } as const;

/**
 * The public's car at a heading: a low body, a narrower glasshouse set back (glass on its sloped and side
 * faces, a body-coloured roof), four wheels, a driver. `body` its paint (the atlas may tint the enamel
 * one). Footprint 2.8 x 1.4 m (two thirds of a real car's length, as vehicles are); the trailer, when the
 * world draws one, hitches as it does to the van.
 */
export function drawPublicCar(c: SkCanvas, v: View3q, heading: number, o: { body?: string; driver?: boolean } = {}): void {
  const F = frameOf(heading);
  const body = o.body ?? YARD.enamel;
  const nearSign = F.ly >= 0 ? 1 : -1;
  const wheels: [number, number][] = [
    [0.88, 0.6],
    [-0.88, 0.6],
    [0.88, -0.6],
    [-0.88, -0.6],
  ];
  const sideOf = (s: number): V3 => [F.lx * Math.sign(s), F.ly * Math.sign(s), 0];
  for (const [u, s] of wheels) if (Math.sign(s) !== nearSign) truckWheel(c, v, F.at(u, s, 0.27), F.f, 0.27, sideOf(s));
  const isFront = (n: V3) => n[0] * F.fx + n[1] * F.fy > 0.7;
  const isBack = (n: V3) => n[0] * F.fx + n[1] * F.fy < -0.7;
  const b = F.at(0, 0, 0);
  box(c, v, {
    len: CAR.len,
    wid: CAR.wid,
    h: 0.5,
    z: 0.22,
    ox: b[0],
    oy: b[1],
    heading,
    color: body,
    bevel: true,
    onFace: (q, n) => {
      if (isFront(n)) {
        faceFill(c, v, subQuad(q, 0.06, 0.24, 0.5, 0.78), YARD.paper, 0.8);
        faceFill(c, v, subQuad(q, 0.76, 0.94, 0.5, 0.78), YARD.paper, 0.8);
        faceFill(c, v, subQuad(q, 0.32, 0.68, 0.2, 0.42), shade(body, -0.4), 0.8);
      } else if (isBack(n)) {
        faceFill(c, v, subQuad(q, 0.06, 0.22, 0.5, 0.78), '#9C3A33', 0.8);
        faceFill(c, v, subQuad(q, 0.78, 0.94, 0.5, 0.78), '#9C3A33', 0.8);
      } else {
        faceFill(c, v, subQuad(q, 0.02, 0.98, 0.0, 0.16), shade(body, -0.3));
        faceFill(c, v, subQuad(q, 0.47, 0.49, 0.18, 0.95), shade(body, -0.3));
      }
    },
  });
  // the glasshouse: a narrower box set back, its faces glass, its roof the body's colour
  const g = F.at(-0.25, 0, 0);
  box(c, v, {
    len: 1.4,
    wid: CAR.wid * 0.84,
    h: 0.42,
    z: 0.72,
    ox: g[0],
    oy: g[1],
    heading,
    color: YARD.glassDark,
    top: shade(body, 0.12),
    line: 1,
    onFace: (q, n) => {
      if (!isFront(n) && !isBack(n)) faceFill(c, v, subQuad(q, 0.46, 0.52, 0, 1), shade(body, -0.1));
      faceFill(c, v, subQuad(q, 0.1, 0.25, 0.15, 0.85), YARD.glass, 0, 0.7);
    },
  });
  if (o.driver !== false) {
    const hc = P2(v, F.at(0.05, nearSign * 0.3, 1.0));
    c.drawPath(oval(hc[0], hc[1], 3, 3), fill(shade(YARD.glassDark, -0.45)));
  }
  for (const [u, s] of wheels) if (Math.sign(s) === nearSign) truckWheel(c, v, F.at(u, s, 0.27), F.f, 0.27, sideOf(s));
}
