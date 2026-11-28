/**
 * The works' three-axle hook-lift (ART-TRUCK3; PLAN2 2.7, s2c-plan-world 1.4): the ONE truck's second body once the
 * shop key truckBridge is owned (FrameTruck.model 'truckBridge'; no second truck), drawn with the first yard's pen and
 * built the way vehicles.draw.ts builds the first yard's truck: the same projection (x east, y south, tilt 0.7, 40 pt a
 * metre), the same white raked cab with its hi-vis band and beacon, the same hi-vis hook arm, the same red-oxide skip with
 * ribbed sides and hazard end panels, the same wheels (a disc on a near or far side, a tread block end-on), the same
 * near/far drawing order, no shadow inside the sprite (the world's sheet S), vehicles at two thirds of true length.
 *
 * What makes it the bigger truck: a longer cab (1.35 m against 1.1), three axles (a steered front axle under the cab and a
 * tandem at the rear with a mudguard over it), bigger wheels (0.48 m), a fuel tank and a tool box on the chassis between the
 * axles, a longer roll-on skip (3.9 x 2.0 x 1.05 m) on a taller bed. Footprint 6.2 x 2.4 m, the TRUE ground outline: every
 * wheel, the cab, the bed and the skip lie inside it at every heading (the world keeps people out of it: the owner's
 * point 7). Anchor: the footprint's centre on the ground at every heading, every hook and tip frame too (the first yard's
 * code), so a change of heading or from driving to hooking never moves the truck (the owner's point 1).
 *
 * Frames (manifest/worksTruck3.ts):
 *  - driving: 8 headings with its skip on (empty: the partners' loads are the overlay `vehicle.skip.load.bridge`, drawn by
 *    the world at bridgeSkipTop) and bare (no skip); the manifest bakes headings 0..4 and mirrors 5..7 (the first yard's rule).
 *  - hook (at a partner's site, on the lane: east baked, west mirrored): hook1 the arm swung back to the skip on the ground
 *    behind; hook2 the skip's front lifted onto the rollers; hook3 the skip half up the bed; hook4 the skip almost on, the arm
 *    folding. Picking a skip up plays 1, 2, 3, 4 then the driving body; setting one off plays 4, 3, 2, 1 then the bare body.
 *  - tip (at the floor's stop, facing west there: the mirror of east): tip1 the skip's front raised a little; tip2 raised
 *    full, the load sliding out of the rear; tip3 raised full, the last of the load on the floor. Then tip1 again and the
 *    driving body (the floor's heap is the world's).
 *  - the bridge partners' loads (garage and plumber, trial and full): ONLY the things the partner's base trial / skip holds in
 *    the content (garage: wheels, a loom, brake discs, springs, converters in the full skip; plumber: copper pipe, bronze
 *    valves, a bath, cast radiators in the full skip). Nothing a later plate adds (bushings, sinks, batteries) is drawn: a
 *    dark item is never drawn.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, METAL, YARD, shade } from './palette';
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
import { TONE, alloyWheel, converter, radiatorSection, tubeOffcut, wireBundle } from './pieces.draw';

const INK = YARD.ink;

/** The hook-lift's geometry, metres along its heading from the footprint centre (u forward, s to the left, z up). */
export const BRIDGE = {
  len: 6.2,
  wid: 2.4,
  /** the cab's centre and length (its front at u 3.075, inside the footprint's 3.1) */
  cabU: 2.4,
  cabLen: 1.35,
  cabWid: 2.3,
  /** the bed's top (the skip's floor) */
  bedZ: 0.98,
  /** the skip's centre on the bed */
  skipU: -0.95,
  /** the arm's post and its rear pivot (on the rollers) */
  postU: 1.45,
  pivotU: -2.95,
  /** axles: the steered front axle under the cab, the rear tandem */
  axles: [2.32, -1.42, -2.42] as readonly number[],
  wheelR: 0.48,
  /** the wheels' centre line off the middle (tyre face at 1.16, inside the footprint's 1.2) */
  track: 1.0,
} as const;

/** The roll-on skip the hook-lift carries (longer than the first yard's 2.7 m skip). */
export const BRIDGE_SKIP = { len: 3.9, wid: 2.0, h: 1.05 } as const;

/** For the world's shadow (sheet S, drawActorShadow's ACTOR_SIZE row the world adds for 'truck3'): footprint and height. */
export const BRIDGE_SHADOW = { len: 6.2, wid: 2.4, h: 2.5 } as const;

/** The manifest's eight headings (0 s, 1 se, 2 e, 3 ne, 4 n, 5 nw, 6 w, 7 sw) in radians (0 east, pi/2 south). */
export const headingRad = (i: number): number => Math.PI / 2 - (i * Math.PI) / 4;

export type BridgeLoad = 'garage-trial' | 'garage-full' | 'plumbing-trial' | 'plumbing-full';
export const BRIDGE_LOADS: readonly BridgeLoad[] = ['garage-trial', 'garage-full', 'plumbing-trial', 'plumbing-full'];
export type BridgeHook = 'hook1' | 'hook2' | 'hook3' | 'hook4';
export const BRIDGE_HOOK_FRAMES: readonly BridgeHook[] = ['hook1', 'hook2', 'hook3', 'hook4'];
export type BridgeTip = 'tip1' | 'tip2' | 'tip3';
export const BRIDGE_TIP_FRAMES: readonly BridgeTip[] = ['tip1', 'tip2', 'tip3'];

// ---------------------------------------------------------------------------------------------------------------------
// The first yard's pen, as vehicles.draw.ts holds it privately (frameOf, member, solid, boxCorners, the wheel): the same
// few functions, so the two trucks are drawn by the same hand. vehicles.draw.ts is a first-yard file and does not move.
// ---------------------------------------------------------------------------------------------------------------------

function frameOf(heading: number) {
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const lx = -fy;
  const ly = fx;
  const at = (u: number, s: number, z: number): V3 => [fx * u + lx * s, fy * u + ly * s, z];
  return { fx, fy, lx, ly, at, f: [fx, fy, 0] as V3, l: [lx, ly, 0] as V3 };
}
type Frame = ReturnType<typeof frameOf>;

const P2 = (v: View3q, p: V3): [number, number] => proj(v, p[0], p[1], p[2]);

function member(c: SkCanvas, v: View3q, a: V3, b: V3, w: number, color: string): void {
  const [ax, ay] = P2(v, a);
  const [bx, by] = P2(v, b);
  c.drawPath(segment(ax, ay, bx, by), stroke(INK, w + 2));
  c.drawPath(segment(ax, ay, bx, by), stroke(color, w));
}

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
  const bottom = [q[0], q[3], q[2], q[1]];
  const all = [bottom, ...faces];
  const ns = [normal(bottom), ...faces.map(normal)];
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

function boxCorners(F: Frame, len: number, wid: number, h: number, u0: number, s0: number, z0: number, pitch = 0, pu = u0, pz = z0): V3[] {
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

/** A wheel (the first yard's truckWheel): a disc on a side turned to the eye, a tread block when seen end-on. */
function wheel(c: SkCanvas, v: View3q, p: V3, f: V3, r: number, side: V3): void {
  const z: V3 = [0, 0, 1];
  const face = facing(v, side);
  if (face < 0.3) {
    box(c, v, { len: 2 * r * 0.92, wid: 0.32, h: 2 * r * 0.95, ox: p[0], oy: p[1], z: p[2] - r, heading: Math.atan2(f[1], f[0]), color: YARD.tyre, line: 1 });
    if (face <= 0.05) return;
  }
  const q: V3 = [p[0] + side[0] * 0.16, p[1] + side[1] * 0.16, p[2]];
  c.drawPath(discPath(v, q, f, z, r), fill(YARD.tyre));
  c.drawPath(discPath(v, q, f, z, r), stroke(INK, 1));
  c.drawPath(discPath(v, q, f, z, r * 0.52), fill(YARD.galvanised));
  // the wheel nuts' ring: the heavy truck's hub
  c.drawPath(discPath(v, q, f, z, r * 0.36), stroke(shade(YARD.galvanised, -0.3), 0.9));
  c.drawPath(discPath(v, q, f, z, r * 0.2), fill(YARD.steelDark));
}

// ---------------------------------------------------------------------------------------------------------------------
// The cab (the first yard's raked cab, longer and a little taller)
// ---------------------------------------------------------------------------------------------------------------------

function rakedCab(c: SkCanvas, v: View3q, F: Frame, driver: boolean): void {
  const colour = YARD.cab;
  const len = BRIDGE.cabLen;
  const u0 = BRIDGE.cabU - len / 2;
  const u1 = BRIDGE.cabU + len / 2;
  const zb = 0.78;
  const zBack = 1.62;
  const zFront = 1.38;
  const zAt = (uu: number) => zBack + ((zFront - zBack) * (uu - u0)) / len;
  const w = BRIDGE.cabWid / 2;
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
        faceFill(c, v, subQuad(f, 0.16, 0.84, 0.3, 0.82), YARD.machineDark, 0.8); // grille
        for (const s of [0.24, 0.34, 0.44, 0.54, 0.64, 0.74]) faceFill(c, v, subQuad(f, 0.18, 0.82, s, s + 0.035), shade(YARD.machineDark, 0.25));
        faceFill(c, v, subQuad(f, 0.03, 0.14, 0.5, 0.75), YARD.hivisLight, 0.8); // lamps
        faceFill(c, v, subQuad(f, 0.86, 0.97, 0.5, 0.75), YARD.hivisLight, 0.8);
        faceFill(c, v, subQuad(f, 0, 1, 0, 0.18), YARD.tyre, 0.8); // bumper
      } else if (a > -0.7) {
        faceFill(c, v, subQuad(f, 0, 1, 0.1, 0.26), YARD.hivis, 0.9);
        faceFill(c, v, subQuad(f, 0.0, 1.0, 0, 0.08), YARD.tyre, 0);
        // the two steps up to the door, the longer cab's
        faceFill(c, v, subQuad(f, 0.52, 0.8, 0.0, 0.05), shade(YARD.galvanised, -0.1), 0.6);
      }
    },
  });
  const uS = u1 - 0.24;
  const uR = u1 - 0.66;
  const zr = 2.42;
  const w2 = w - 0.04;
  const upper: V3[] = [P(uS, w2, zAt(uS)), P(u0 + 0.02, w2, zAt(u0)), P(u0 + 0.02, -w2, zAt(u0)), P(uS, -w2, zAt(uS)), P(uR, w2, zr), P(u0 + 0.02, w2, zr), P(u0 + 0.02, -w2, zr), P(uR, -w2, zr)];
  solid(c, v, upper, colour, {
    onFace: (f, n, top) => {
      if (top) {
        faceFill(c, v, subQuad(f, 0.0, 0.1, 0.05, 0.95), shade(colour, -0.2), 0); // the visor
        // the roof's air deflector strip over the back half (the long-haul cab)
        faceFill(c, v, subQuad(f, 0.55, 0.95, 0.12, 0.88), shade(colour, -0.08), 0.8);
        return;
      }
      const a = along(n);
      if (a < -0.6) return;
      if (a > 0.3) {
        const win = subQuad(f, 0.06, 0.94, 0.08, 0.92);
        faceFill(c, v, win, YARD.glassDark, 1);
        if (driver) {
          const hc = P2(v, subQuad(win, 0.32, 0.32, 0.35, 0.35)[0]);
          c.drawPath(oval(hc[0], hc[1] + 1, 3.2, 3.2), fill(shade(YARD.glassDark, -0.45)));
        }
        faceFill(c, v, subQuad(win, 0.62, 0.74, 0.15, 0.95), YARD.glass, 0, 0.8);
        return;
      }
      const win = subQuad(f, 0.08, 0.56, 0.14, 0.86);
      faceFill(c, v, win, YARD.glassDark, 1);
      if (driver) {
        const hc = P2(v, subQuad(win, 0.5, 0.5, 0.4, 0.4)[0]);
        c.drawPath(oval(hc[0], hc[1] + 1, 3.4, 3.2), fill(shade(YARD.glassDark, -0.45)));
        c.drawPath(builder().moveTo(hc[0] - 4, hc[1] - 1.4).quadTo(hc[0], hc[1] - 6.5, hc[0] + 4, hc[1] - 1.4).close().build(), fill(shade(YARD.glassDark, -0.45)));
      }
      faceFill(c, v, subQuad(win, 0.1, 0.22, 0.1, 0.9), YARD.glass, 0, 0.9);
      faceFill(c, v, subQuad(f, 0.64, 0.66, 0.05, 0.95), shade(colour, -0.25), 0); // the door's rear line
      // the sleeper's small rear window
      faceFill(c, v, subQuad(f, 0.76, 0.92, 0.42, 0.7), YARD.glassDark, 0.8);
    },
  });
  for (const s of [-1, 1]) {
    const a = P(uS + 0.05, s * (w + 0.0), 1.9);
    const b = P(uS + 0.05, s * (w + 0.05), 1.9);
    member(c, v, a, b, 1, YARD.machineDark);
    const [mx, my] = P2(v, b);
    c.drawPath(rrect(mx - 2, my - 5, 4, 8, 1), fill(YARD.machineDark));
  }
  // two beacons on the roof's back corners (the big truck's), as the first yard's single one
  for (const s of [-0.75, 0.75]) {
    const [bx, by] = P2(v, F.at(u0 + 0.25, s, zr));
    c.drawPath(rrect(bx - 3, by - 7, 6, 7, 2), fill(YARD.hivis));
    c.drawPath(rrect(bx - 3, by - 7, 6, 7, 2), stroke(INK, 1));
  }
}

/** The door slot of the cab (where the world draws a firm's mark), points from the anchor, for a heading (radians). */
export function bridgeDoorSlot(v: View3q, heading: number): { x: number; y: number; w: number; h: number } | null {
  const F = frameOf(heading);
  const near = F.ly >= 0 ? 1 : -1;
  const n: V3 = [F.lx * near, F.ly * near, 0];
  if (facing(v, n) < 0.3) return null;
  const a = P2(v, F.at(BRIDGE.cabU - 0.45, near * BRIDGE.cabWid / 2, 1.05));
  const b = P2(v, F.at(BRIDGE.cabU + 0.25, near * BRIDGE.cabWid / 2, 1.32));
  return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.max(6, Math.abs(b[0] - a[0])), h: Math.max(6, Math.abs(b[1] - a[1])) };
}

// ---------------------------------------------------------------------------------------------------------------------
// The chassis' side parts and the mudguards
// ---------------------------------------------------------------------------------------------------------------------

/** The fuel tank (a galvanised cylinder lying along the chassis) and the tool box on the other side, between the axles. */
function sideKit(c: SkCanvas, v: View3q, F: Frame, heading: number, near: boolean): void {
  const nearSign = F.ly >= 0 ? 1 : -1;
  for (const s of [-1, 1]) {
    if ((Math.sign(s) === nearSign) !== near) continue;
    const p = F.at(0.55, s * 0.98, 0);
    if (s > 0) {
      // the tool box: a hi-vis-rimmed steel box
      box(c, v, { len: 0.8, wid: 0.36, h: 0.42, ox: p[0], oy: p[1], z: 0.42, heading, color: YARD.steel, bevel: true });
    } else {
      // the fuel tank: a rounded box (a cylinder end-on reads the same at this size)
      box(c, v, { len: 1.0, wid: 0.38, h: 0.42, ox: p[0], oy: p[1], z: 0.4, heading, color: YARD.galvanisedLight, bevel: true });
    }
  }
}

/** A mudguard over the rear tandem on one side: a dark flat plate over both wheels. */
function mudguard(c: SkCanvas, v: View3q, F: Frame, s: number): void {
  const u0 = BRIDGE.axles[2] - 0.58;
  const u1 = BRIDGE.axles[1] + 0.58;
  const z = BRIDGE.wheelR * 2 + 0.06;
  const q: V3[] = [F.at(u1, s * 0.8, z), F.at(u0, s * 0.8, z), F.at(u0, s * 1.17, z), F.at(u1, s * 1.17, z)];
  c.drawPath(facePath(v, q), fill(YARD.machineDark));
  c.drawPath(facePath(v, q), stroke(INK, 0.9));
  // its outer lip, seen from the side
  const n: V3 = [F.lx * s, F.ly * s, 0];
  if (facing(v, n) > 0.05) {
    const lip: V3[] = [F.at(u1, s * 1.17, z), F.at(u0, s * 1.17, z), F.at(u0, s * 1.17, z - 0.14), F.at(u1, s * 1.17, z - 0.14)];
    c.drawPath(facePath(v, lip), fill(shade(YARD.machineDark, -0.2)));
    c.drawPath(facePath(v, lip), stroke(INK, 0.9));
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The skip
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The roll-on skip (the first yard's drawSkip, longer): red oxide, ribbed long sides, hazard end panels, the dark inside
 * with its lit far walls when level. Its footprint centre at (u0, z0) along the heading, pitched by `pitch` (front up) about
 * (pu, pz). `spill` draws the load sliding out of the rear (tipping).
 */
function drawBridgeSkip(c: SkCanvas, v: View3q, heading: number, o: { u0?: number; z0?: number; pitch?: number; pu?: number; pz?: number; spill?: 0 | 1 | 2 } = {}): void {
  const F = frameOf(heading);
  const S = BRIDGE_SKIP;
  const u0 = o.u0 ?? 0;
  const z0 = o.z0 ?? 0;
  const pitch = o.pitch ?? 0;
  const pu = o.pu ?? u0;
  const pz = o.pz ?? z0;
  const q = boxCorners(F, S.len, S.wid, S.h, u0, 0, z0, pitch, pu, pz);
  const inner = boxCorners(F, S.len - 0.12, S.wid - 0.12, S.h - 0.04, u0, 0, z0 + 0.04, pitch, pu, pz);
  const top = [inner[4], inner[5], inner[6], inner[7]];
  const topOpen = facing(v, [0, 0, 1]) > 0 && Math.abs(pitch) < 1.2;
  // the roll-on skip's runners under it (two steel rails along its length)
  for (const s of [-0.62, 0.62]) {
    const a = boxCorners(F, S.len, 0.14, 0.08, u0, s, z0 - 0.08, pitch, pu, pz);
    solid(c, v, a, YARD.steelDark, { line: 0.8 });
  }
  solid(c, v, q, YARD.skip, {
    onFace: (f, n, isTop) => {
      if (isTop) {
        if (topOpen) {
          faceFill(c, v, top, shade(YARD.skip, -0.55));
          const zLow = (inner[0][2] + inner[4][2]) / 2;
          for (let i = 0; i < 4 && Math.abs(pitch) < 0.2; i++) {
            const a = top[i];
            const b = top[(i + 1) % 4];
            const m: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0];
            const cx = (top[0][0] + top[2][0]) / 2;
            const cy = (top[0][1] + top[2][1]) / 2;
            const nOut: V3 = [m[0] - cx, m[1] - cy, 0];
            if (facing(v, nOut) >= 0) continue;
            const wall: V3[] = [a, b, [b[0], b[1], zLow], [a[0], a[1], zLow]];
            faceFill(c, v, wall, shade(YARD.skip, -0.28));
            for (const s of [0.2, 0.4, 0.6, 0.8]) faceFill(c, v, subQuad(wall, s - 0.015, s + 0.015, 0, 1), shade(YARD.skip, -0.42));
          }
        }
        return;
      }
      const along = Math.abs(n[0] * F.fx + n[1] * F.fy);
      if (along < 0.5) {
        for (const s of [0.14, 0.28, 0.42, 0.58, 0.72, 0.86]) faceFill(c, v, subQuad(f, s - 0.011, s + 0.011, 0.05, 0.95), shade(YARD.skip, -0.32));
        const [rx, ry] = P2(v, subQuad(f, 0.3, 0.3, 0.3, 0.3)[0]);
        freckles(c, rx, ry, 22, 9, 13, YARD.rustLight, 5);
        // the top rail along the side (a rolled lip)
        faceFill(c, v, subQuad(f, 0, 1, 0.9, 1), shade(YARD.skip, 0.12), 0.6);
      } else {
        const pp = subQuad(f, 0.05, 0.95, 0.62, 0.92).map((pt) => P2(v, pt));
        hazard(c, poly(pp.flat()), 3.4, 0.8);
      }
    },
  });
  // the front A-frame the hook takes (a hi-vis bar standing at the skip's front end)
  const fr = boxCorners(F, 0.12, 0.7, 0.55, u0 + S.len / 2 + 0.06, 0, z0 + S.h - 0.2, pitch, pu, pz);
  solid(c, v, fr, YARD.steelDark, { line: 0.8 });
  if (o.spill) spillOut(c, v, F, q, o.spill);
}

/** The load sliding out of the tipped skip's rear (2: the last of it on the floor). Mixed pieces, partner-neutral. */
function spillOut(c: SkCanvas, v: View3q, F: Frame, q: V3[], stage: 1 | 2): void {
  const rear = [0, 1, 2].map((k) => (q[1][k] + q[2][k]) / 2) as V3;
  const [x, y] = P2(v, rear);
  const dir = Math.sign(F.fx || 1);
  const n = stage === 1 ? 7 : 10;
  for (let i = 0; i < n; i++) {
    const dx = (stage === 1 ? -6 : -14) - hash01(i, 61) * (stage === 1 ? 22 : 34);
    const dy = -8 + i * (stage === 1 ? 4 : 3.2) + hash01(i, 62) * 4;
    c.save();
    c.translate(x + dx * dir, y + dy);
    c.rotate((hash01(i, 63) - 0.5) * 90, 0, 0);
    spillPiece(c, i, 12);
    c.restore();
  }
}

function spillPiece(c: SkCanvas, i: number, s: number): void {
  switch (i % 5) {
    case 0:
      alloyWheel(c, s);
      break;
    case 1:
      disc(c, s);
      break;
    case 2:
      tubeOffcut(c, s * 1.1);
      break;
    case 3:
      spring(c, s);
      break;
    default:
      radiatorSection(c, s, 3, i);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The hook arm (the first yard's, longer)
// ---------------------------------------------------------------------------------------------------------------------

/** The arm's pose: the post's top (u, z) and where the arm's main frame ends (base). */
interface ArmAt {
  top: { u: number; z: number };
  base: { u: number; z: number };
}

function armDown(): ArmAt {
  const pv = { u: BRIDGE.pivotU, z: BRIDGE.bedZ + 0.1 };
  const end = { u: BRIDGE.postU, z: pv.z };
  return { base: end, top: { u: end.u, z: end.z + 1.15 } };
}

function hookArm(c: SkCanvas, v: View3q, F: Frame, arm: ArmAt): void {
  const W = 0.62;
  const pv = { u: BRIDGE.pivotU, z: BRIDGE.bedZ + 0.1 };
  for (const s of [-W / 2, W / 2]) member(c, v, F.at(pv.u, s, pv.z), F.at(arm.base.u, s, arm.base.z), 3.2, YARD.hivis);
  member(c, v, F.at(arm.base.u, 0, arm.base.z), F.at(arm.top.u, 0, arm.top.z), 4.4, YARD.hivis);
  // the ram under the arm (a steel rod from the chassis to the frame's middle)
  const mid = { u: (pv.u + arm.base.u) / 2, z: (pv.z + arm.base.z) / 2 };
  member(c, v, F.at(mid.u + 0.6, 0, 0.75), F.at(mid.u, 0, mid.z), 1.6, YARD.galvanisedLight);
  const [hx, hy] = P2(v, F.at(arm.top.u, 0, arm.top.z));
  const d = Math.sign(F.fx || 1);
  const hook = builder().moveTo(hx, hy).quadTo(hx - 5 * d, hy + 1, hx - 4 * d, hy + 5).build();
  c.drawPath(hook, stroke(INK, 3));
  c.drawPath(hook, stroke(YARD.steelDark, 1.6));
}

// ---------------------------------------------------------------------------------------------------------------------
// The truck
// ---------------------------------------------------------------------------------------------------------------------

/** The hook-lift at a heading (radians): skip on or none, the arm in a pose, its driver. No shadow. Anchor: footprint centre. */
export function drawBridgeTruck(c: SkCanvas, v: View3q, heading: number, o: { skip?: 'on' | 'none'; arm?: ArmAt; driver?: boolean; after?: () => void } = {}): void {
  const F = frameOf(heading);
  const R = BRIDGE.wheelR;
  const wheels: [number, number][] = [];
  for (const u of BRIDGE.axles) wheels.push([u, BRIDGE.track], [u, -BRIDGE.track]);
  const nearSign = F.ly >= 0 ? 1 : -1;
  const sideOf = (s: number): V3 => [F.lx * Math.sign(s), F.ly * Math.sign(s), 0];
  // far wheels, far side kit, far mudguard
  for (const [u, s] of wheels) if (Math.sign(s) !== nearSign) wheel(c, v, F.at(u, s, R), F.f, R, sideOf(s));
  const ch = F.at(-0.1, 0, 0);
  box(c, v, { len: BRIDGE.len * 0.94, wid: BRIDGE.wid * 0.6, h: 0.34, z: 0.56, ox: ch[0], oy: ch[1], heading, color: YARD.machineDark });
  sideKit(c, v, F, heading, false);
  mudguard(c, v, F, -nearSign);
  // the rollers at the rear of the bed
  member(c, v, F.at(BRIDGE.pivotU, -0.7, BRIDGE.bedZ), F.at(BRIDGE.pivotU, 0.7, BRIDGE.bedZ), 3.6, YARD.steelDark);
  // the bed's two rails (on which the skip's runners sit)
  for (const s of [-0.62, 0.62]) member(c, v, F.at(BRIDGE.pivotU, s, BRIDGE.bedZ - 0.04), F.at(BRIDGE.postU - 0.1, s, BRIDGE.bedZ - 0.04), 2.2, YARD.steelDark);
  const cabFirst = F.fy < -0.3;
  const driver = o.driver !== false;
  if (cabFirst) rakedCab(c, v, F, driver);
  hookArm(c, v, F, o.arm ?? armDown());
  if (o.skip !== 'none') drawBridgeSkip(c, v, heading, { u0: BRIDGE.skipU, z0: BRIDGE.bedZ });
  o.after?.();
  // the near mudguard and side kit over the skip's foot, under a cab that is nearer the eye than they are
  mudguard(c, v, F, nearSign);
  sideKit(c, v, F, heading, true);
  // coming at the eye end-on, the front axle's tread blocks stand behind the cab's front (its top is over the cab's foot)
  const frontUnder = !cabFirst && F.fy > 0.3 && facing(v, F.l) < 0.3 && facing(v, [-F.l[0], -F.l[1], 0]) < 0.3;
  const front = BRIDGE.axles[0];
  if (frontUnder) for (const [u, s] of wheels) if (Math.sign(s) === nearSign && u === front) wheel(c, v, F.at(u, s, R), F.f, R, sideOf(s));
  if (!cabFirst) rakedCab(c, v, F, driver);
  for (const [u, s] of wheels) if (Math.sign(s) === nearSign && !(frontUnder && u === front)) wheel(c, v, F.at(u, s, R), F.f, R, sideOf(s));
}

/** The centre of the skip's open top on the truck, points from the anchor (where `vehicle.skip.load.bridge` goes). */
export function bridgeSkipTop(v: View3q, heading: number): [number, number] {
  const F = frameOf(heading);
  return P2(v, F.at(BRIDGE.skipU, 0, BRIDGE.bedZ + BRIDGE_SKIP.h));
}

/**
 * Each hook frame (east) as the skip's pose: its front bottom edge (u, z metres from the anchor) and its pitch (front up).
 * hook1 on the ground behind the rollers; hook2 its front drawn onto the rollers, its rear on the ground; hook3 drawn on, its
 * rear rolling up off the ground; hook4 almost down on the bed (its rear on the rollers). Picked up 1 to 4, set off 4 to 1.
 */
const HOOK_POSE: Readonly<Record<BridgeHook, { fu: number; fz: number; pitch: number; armBack: boolean }>> = {
  hook1: { fu: BRIDGE.pivotU - 0.45, fz: 0.08, pitch: 0, armBack: true },
  hook2: { fu: BRIDGE.pivotU + 0.3, fz: BRIDGE.bedZ + 0.05, pitch: 0.24, armBack: true },
  hook3: { fu: BRIDGE.pivotU + 1.95, fz: BRIDGE.bedZ + 0.55, pitch: 0.26, armBack: false },
  hook4: { fu: BRIDGE.skipU + BRIDGE_SKIP.len / 2 - 0.12, fz: BRIDGE.bedZ + 0.23, pitch: 0.06, armBack: false },
};

/** A hook frame's skip: its bottom centre (u0, z0), pitch, and the hook bar's point (where the arm's hook takes it). */
function hookSkip(frame: BridgeHook): { u0: number; z0: number; pitch: number; bar: { u: number; z: number }; armBack: boolean } {
  const S = BRIDGE_SKIP;
  const { fu, fz, pitch, armBack } = HOOK_POSE[frame];
  const ca = Math.cos(pitch);
  const sa = Math.sin(pitch);
  const u0 = fu - (S.len / 2) * ca;
  const z0 = fz - (S.len / 2) * sa;
  // the bar stands 0.06 m ahead of the front and S.h - 0.2 m up it, turned by the pitch
  const bu = 0.12;
  const bz = S.h - 0.05;
  return { u0, z0, pitch, armBack, bar: { u: fu + bu * ca - bz * sa, z: fz + bu * sa + bz * ca } };
}

/**
 * A hook frame at heading east (the world mirrors it for west). Anchor: the truck's footprint centre (as driving), so the
 * truck never moves between driving and hooking.
 */
export function drawBridgeHook(c: SkCanvas, v: View3q, frame: BridgeHook): void {
  const heading = 0;
  const k = hookSkip(frame);
  const arm: ArmAt = {
    base: { u: k.armBack ? BRIDGE.pivotU + 0.7 : Math.min(BRIDGE.postU, k.bar.u + 0.9), z: BRIDGE.bedZ + 0.1 },
    top: { u: k.bar.u, z: k.bar.z + 0.05 },
  };
  const F = frameOf(heading);
  const R = BRIDGE.wheelR;
  // the truck without its skip, then the skip on the hook, then the near wheels over it (the first yard's order)
  drawBridgeTruck(c, v, heading, { skip: 'none', arm, after: () => drawBridgeSkip(c, v, heading, { u0: k.u0, z0: k.z0, pitch: k.pitch }) });
  for (const u of BRIDGE.axles) wheel(c, v, F.at(u, BRIDGE.track, R), F.f, R, [0, 1, 0]);
}

/** The skip's open top centre in a hook frame at heading east (points from the anchor), or null where it is pitched. */
export function bridgeHookSkipTop(v: View3q, frame: BridgeHook): [number, number] | null {
  const k = hookSkip(frame);
  if (k.pitch !== 0) return null;
  return proj(v, k.u0, 0, k.z0 + BRIDGE_SKIP.h);
}

const TIP_POSE: Readonly<Record<BridgeTip, { pitch: number; spill: 0 | 1 | 2 }>> = {
  tip1: { pitch: 0.28, spill: 0 },
  tip2: { pitch: 0.66, spill: 1 },
  tip3: { pitch: 0.66, spill: 2 },
};

/** A tip frame at heading east (the floor's stop faces west: the world mirrors it). The skip pivots on the rear rollers. */
export function drawBridgeTip(c: SkCanvas, v: View3q, frame: BridgeTip): void {
  const heading = 0;
  const { pitch, spill } = TIP_POSE[frame];
  const S = BRIDGE_SKIP;
  const F = frameOf(heading);
  const R = BRIDGE.wheelR;
  const pu = BRIDGE.pivotU;
  const pz = BRIDGE.bedZ;
  const u0 = pu + S.len / 2;
  // the arm's frame raised with the skip about the pivot, its post upright on the frame
  const fl = BRIDGE.postU - pu;
  const end = { u: pu + Math.cos(pitch) * fl, z: pz + 0.1 + Math.sin(pitch) * fl };
  const arm: ArmAt = { base: end, top: { u: end.u - Math.sin(pitch) * 1.15, z: end.z + Math.cos(pitch) * 1.15 } };
  drawBridgeTruck(c, v, heading, {
    skip: 'none',
    arm,
    after: () => drawBridgeSkip(c, v, heading, { u0, z0: pz, pitch, pu, pz, spill }),
  });
  for (const u of BRIDGE.axles) wheel(c, v, F.at(u, BRIDGE.track, R), F.f, R, [0, 1, 0]);
}

// ---------------------------------------------------------------------------------------------------------------------
// The bridge partners' loads (the things of the content's base trial / skip; nothing a later plate adds)
// ---------------------------------------------------------------------------------------------------------------------

/** A brake disc: a grey disc with its raised hat and the bolt circle. */
function disc(c: SkCanvas, s: number): void {
  const rx = s * 0.46;
  const ry = s * 0.32;
  c.drawPath(oval(0, ry * 0.22, rx, ry), fill(shade(METAL.cast_iron.base, -0.1)));
  c.drawPath(oval(0, 0, rx, ry), fill(METAL.light_iron.base));
  c.drawPath(oval(0, 0, rx, ry), stroke(INK, 1));
  c.drawPath(oval(0, 0, rx * 0.86, ry * 0.86), stroke(shade(METAL.light_iron.base, 0.25), 0.8));
  c.drawPath(oval(0, -ry * 0.12, rx * 0.42, ry * 0.42), fill(shade(METAL.light_iron.base, -0.25)));
  c.drawPath(oval(0, -ry * 0.12, rx * 0.42, ry * 0.42), stroke(INK, 0.8));
  freckles(c, -rx * 0.8, -ry * 0.6, rx * 1.6, ry * 1.2, 7, YARD.rust, 3);
}

/** A coil spring lying on its side: loops of dark steel. */
function spring(c: SkCanvas, s: number): void {
  const w = s * 0.9;
  const r = s * 0.24;
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / 5;
    c.drawPath(oval(x, 0, s * 0.11, r), stroke(INK, 2.6));
    c.drawPath(oval(x, 0, s * 0.11, r), stroke(shade(YARD.steelDark, 0.3), 1.4));
  }
}

/** A bronze gate valve: a squat body, a bonnet, a handwheel; the works' bronze (METAL.bronze), never brass's olive. */
function bronzeValve(c: SkCanvas, s: number): void {
  const B = METAL.bronze;
  c.drawPath(rrect(-s * 0.4, -s * 0.12, s * 0.8, s * 0.26, s * 0.06), fill(B.dark));
  c.drawPath(rrect(-s * 0.4, -s * 0.12, s * 0.8, s * 0.26, s * 0.06), stroke(INK, 0.9));
  c.drawPath(oval(0, 0, s * 0.22, s * 0.2), fill(B.base));
  c.drawPath(oval(0, 0, s * 0.22, s * 0.2), stroke(INK, 0.9));
  c.drawPath(rrect(-s * 0.07, -s * 0.38, s * 0.14, s * 0.26, 1), fill(B.base));
  c.drawPath(rrect(-s * 0.07, -s * 0.38, s * 0.14, s * 0.26, 1), stroke(INK, 0.8));
  c.drawPath(oval(0, -s * 0.42, s * 0.22, s * 0.08), stroke(INK, 2.2));
  c.drawPath(oval(0, -s * 0.42, s * 0.22, s * 0.08), stroke(B.light, 1.1));
  c.drawPath(segment(-s * 0.15, -s * 0.03, s * 0.05, -s * 0.03), stroke(B.light, 1)); // the patina's light streak
}

/** An old cast-iron bath (enamel inside, rolled rim, two of its feet). s: its length in points. */
function bath(c: SkCanvas, s: number): void {
  const w = s;
  const h = s * 0.42;
  c.drawPath(rrect(-w / 2, -h * 0.15, w, h * 0.65, h * 0.3), fill(shade(METAL.cast_iron.base, 0.1)));
  c.drawPath(rrect(-w / 2, -h * 0.15, w, h * 0.65, h * 0.3), stroke(INK, 1));
  for (const x of [-w * 0.36, w * 0.36]) {
    c.drawPath(rrect(x - 2, h * 0.42, 4, 4, 1), fill(METAL.cast_iron.dark));
    c.drawPath(rrect(x - 2, h * 0.42, 4, 4, 1), stroke(INK, 0.8));
  }
  c.drawPath(oval(0, -h * 0.2, w / 2, h * 0.36), fill(YARD.enamel));
  c.drawPath(oval(0, -h * 0.2, w / 2, h * 0.36), stroke(INK, 1));
  c.drawPath(oval(0, -h * 0.16, w * 0.42, h * 0.26), fill(shade(YARD.enamel, -0.12)));
  c.drawPath(circle(-w * 0.3, -h * 0.12, 1.1), fill(YARD.steelDark));
  freckles(c, -w * 0.3, -h * 0.05, w * 0.6, h * 0.4, 5, YARD.rust, 3);
}

/** A copper pipe length (the plumber's): a long tube, bright cut ends. */
function pipe(c: SkCanvas, s: number): void {
  const r = rrect(-s / 2, -s * 0.06, s, s * 0.12, s * 0.05);
  c.drawPath(r, fill(TONE.copper));
  c.drawPath(r, stroke(INK, 0.8));
  c.drawPath(segment(-s * 0.45, -s * 0.02, s * 0.4, -s * 0.02), stroke(TONE.copperHi, 0.9));
  c.drawPath(oval(s / 2, 0, s * 0.03, s * 0.06), fill(YARD.copperSheen));
}

type LoadThing = 'wheel' | 'loom' | 'disc' | 'spring' | 'catcon' | 'pipe' | 'valve' | 'bath' | 'radiator';

/**
 * Each load as the things the content's partner sends in it (src/config/salvage.content.ts partners): the counts scaled to
 * what shows over a skip's rim (a mound of about 0.85 m round; the bath lies on top). Order: back to front by the draw.
 */
export const BRIDGE_LOAD_THINGS: Readonly<Record<BridgeLoad, readonly LoadThing[]>> = {
  // garage trial { wheels 4, loom 1, discs 6, springs 10 }
  'garage-trial': ['wheel', 'disc', 'spring', 'wheel', 'loom', 'disc', 'spring', 'disc', 'wheel'],
  // garage skip { wheels 6, loom 1, catcon 2, discs 10, springs 20 }
  'garage-full': ['wheel', 'spring', 'disc', 'wheel', 'catcon', 'spring', 'disc', 'loom', 'wheel', 'spring', 'disc', 'catcon', 'spring', 'disc', 'wheel', 'spring'],
  // plumbing trial { pipe 1, bronzeValve 4, bath 1 }
  'plumbing-trial': ['pipe', 'valve', 'valve', 'valve', 'bath', 'valve'],
  // plumbing skip { pipe 3, bronzeValve 8, bath 1, radiatorCI 3 }
  'plumbing-full': ['pipe', 'radiator', 'valve', 'pipe', 'valve', 'radiator', 'valve', 'pipe', 'valve', 'radiator', 'valve', 'bath', 'valve'],
};

function loadThing(c: SkCanvas, t: LoadThing, x: number, y: number, s: number, turn: number, seed: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(turn, 0, 0);
  switch (t) {
    case 'wheel':
      alloyWheel(c, s * 1.15);
      break;
    case 'loom':
      wireBundle(c, s * 1.1, seed);
      break;
    case 'disc':
      disc(c, s);
      break;
    case 'spring':
      spring(c, s);
      break;
    case 'catcon':
      converter(c, s * 1.1);
      break;
    case 'pipe':
      pipe(c, s * 2.4);
      break;
    case 'valve':
      bronzeValve(c, s);
      break;
    case 'radiator':
      radiatorSection(c, s * 1.2, 4, seed);
      break;
    case 'bath':
      bath(c, s * 3.6);
      break;
  }
  c.restore();
}

/**
 * A bridge partner's load as it shows over the skip's rim: a mound of its things round (0, 0) = the centre of the skip's open
 * top (bridgeSkipTop). Round in plan (radius about 0.85 m), so the one drawing serves every heading. Drawn at true size (the
 * manifest bakes it at its k).
 */
export function drawBridgeLoad(c: SkCanvas, v: View3q, load: BridgeLoad): void {
  const things = BRIDGE_LOAD_THINGS[load];
  const full = load.endsWith('full');
  const k = v.ppm / 40;
  c.save();
  c.scale(k, k);
  const R = full ? 34 : 29;
  const H = full ? 16 : 7;
  const mound = builder()
    .moveTo(-R, 3)
    .quadTo(-R * 0.7, -H * 1.1, 0, -H)
    .quadTo(R * 0.7, -H * 1.1, R, 3)
    .quadTo(0, 10, -R, 3)
    .close()
    .build();
  const base = load.startsWith('garage') ? shade('#5E5A55', -0.15) : shade(METAL.cast_iron.base, -0.05);
  c.drawPath(mound, fill(base));
  c.drawPath(mound, stroke(INK, 1));
  const big = things.filter((t) => t === 'bath');
  const small = things.filter((t) => t !== 'bath');
  const pts = small.map((t, i) => {
    const a = hash01(i, 71, load.length) * Math.PI * 2;
    const r = Math.sqrt(hash01(i, 72)) * (R - 9);
    const x = Math.cos(a) * r;
    const yb = Math.sin(a) * r * 0.45;
    const up = (1 - (r / R) ** 2) * H * 0.8;
    return { t, i, x, y: yb - up + 2 };
  });
  pts.sort((a, b) => a.y - b.y);
  const n = things.length;
  for (const p of pts) loadThing(c, p.t, p.x, p.y, 13, (hash01(p.i, 73) - 0.5) * 50, p.i + n);
  // the bath lies across the top of the heap, a little to the front
  for (const t of big) loadThing(c, t, 2, full ? -H * 0.55 : -2, 13, -6, 3);
  c.restore();
}
