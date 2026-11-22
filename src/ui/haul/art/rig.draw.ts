/**
 * Mining rigs, seen from above, standing on a rock (drawn centred on the rock's centre).
 * Five looks by tier (section 2.3): L1 Tripod, L4 Dual Bit, L10 Deep Bore, L20 Seam Detector,
 * L35 Twin Rig; past L35 hazard stripes on the collar, one per 15 levels (up to 3).
 *
 * The rig base is static; the drill heads (drawDrillHead) spin on top of it at `rigHeads(look)`,
 * and the status lamp (drawRigLamp) sits at `rigLamp(look)`. About 26 pt across, in steel, so the
 * rock (44 to 52 pt) still shows round it and the drones outrank it.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { SPACE, alpha, mix } from './palette';
import { DEG, TAU, circle, fill, glow, lamp, line, litStroke, poly, rrect, stroke } from './pen';

export type RigLook = 0 | 1 | 2 | 3 | 4;
export const RIG_LOOKS = ['Tripod', 'Dual Bit', 'Deep Bore', 'Seam Detector', 'Twin Rig'] as const;

/** The look of a rig at level `level` (tiers at 4, 10, 20, 35). */
export function rigLookFor(level: number): RigLook {
  if (level >= 35) return 4;
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  if (level >= 4) return 1;
  return 0;
}

/** Hazard stripes for a level: 0 to 3, one per 15 levels past 35. */
export function rigStripesFor(level: number): number {
  return Math.min(3, Math.floor(Math.max(0, level - 35) / 15));
}

/**
 * Rig scale: the second pass draws rigs at about 26 pt across (was 34), so the rock's shape,
 * craters and veins show round them (critique M2). Heads and lamp positions below are scaled.
 */
const K = 0.78;

/** Where the spinning drill heads sit, per look (points from the rock centre, rock radius 26). */
export function rigHeads(look: RigLook): { x: number; y: number; r: number }[] {
  switch (look) {
    case 0:
      return [{ x: 0, y: 0, r: 4.6 * K }];
    case 1:
      return [
        { x: -4.6 * K, y: 0, r: 4 * K },
        { x: 4.6 * K, y: 0, r: 4 * K },
      ];
    case 2:
      return [{ x: 0, y: 0, r: 5.6 * K }];
    case 3:
      return [{ x: 0, y: 1.5 * K, r: 5.2 * K }];
    case 4:
      return [
        { x: -8 * K, y: -4 * K, r: 4.4 * K },
        { x: 8 * K, y: 4 * K, r: 4.4 * K },
      ];
  }
}

/** Where the status lamp sits, per look. */
export function rigLamp(look: RigLook): { x: number; y: number } {
  switch (look) {
    case 0:
    case 1:
      return { x: 0, y: -14 * K };
    case 2:
      return { x: 10.5 * K, y: -10.5 * K };
    case 3:
      return { x: 11 * K, y: 6 * K };
    case 4:
      return { x: 1 * K, y: -11 * K };
  }
}

/** Struts and frames: steel at 60 % so the rig stays behind the rock, the drones and the chips. */
const LEG = alpha(SPACE.steel, 0.6);
const FRAME = alpha(SPACE.steel, 0.7);
const G = 0.2;

function tripod(c: SkCanvas, cx: number, cy: number, reach: number, a0: number): void {
  for (let i = 0; i < 3; i++) {
    const a = a0 + (TAU * i) / 3;
    const x = cx + Math.cos(a) * reach;
    const y = cy + Math.sin(a) * reach;
    const leg = line(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, x, y);
    c.drawPath(leg, stroke(alpha(SPACE.hull0, 0.8), 3.6));
    litStroke(c, leg, LEG, 1.5, G);
    // Foot pad clamped to the rock, with three bolts (visible from 2x).
    c.drawPath(circle(x, y, 2.1), fill(SPACE.hull2));
    c.drawPath(circle(x, y, 2.1), stroke(FRAME, 0.9));
    for (let b = 0; b < 3; b++) {
      const ba = a + (TAU * b) / 3;
      c.drawCircle(x + Math.cos(ba) * 1.1, y + Math.sin(ba) * 1.1, 0.3, fill(alpha(SPACE.steel, 0.8)));
    }
  }
}

function collar(c: SkCanvas, cx: number, cy: number, r: number): void {
  const ring = circle(cx, cy, r);
  c.drawPath(ring, fill(SPACE.hull1));
  litStroke(c, ring, FRAME, 1.2, G);
}

/**
 * Level stripes past L35: 1, 2 or 3 short white bars across the lamp mast (critique M5), readable
 * at real size without colour. (x0, y0) to (x1, y1) is the mast, bars spread along its middle.
 */
function stripeBars(c: SkCanvas, x0: number, y0: number, x1: number, y1: number, n: number): void {
  if (n <= 0) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d;
  const ny = dx / d;
  for (let i = 0; i < Math.min(3, n); i++) {
    const t = 0.3 + i * 0.22;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    c.drawPath(line(x - nx * 2.6, y - ny * 2.6, x + nx * 2.6, y + ny * 2.6), stroke(SPACE.bg, 2.6));
    c.drawPath(line(x - nx * 2.2, y - ny * 2.2, x + nx * 2.2, y + ny * 2.2), stroke('#FFFFFF', 1.3));
  }
}

export interface RigOptions {
  look: RigLook;
  /** 0 to 3 level stripes (rigStripesFor). */
  stripes?: number;
}

/** The static rig base: legs, frame, collars (no heads, no lamp). About 26 pt across. */
export function drawRigBase(c: SkCanvas, o: RigOptions): void {
  const stripes = o.stripes ?? 0;
  c.save();
  c.scale(K, K);
  switch (o.look) {
    case 0: {
      tripod(c, 0, 0, 13, -90 * DEG + Math.PI / 3);
      collar(c, 0, 0, 6.6);
      c.drawPath(line(0, -6.6, 0, -12.5), stroke(LEG, 1.6));
      stripeBars(c, 0, -6.6, 0, -12.5, stripes);
      break;
    }
    case 1: {
      tripod(c, 0, 0, 14, -90 * DEG + Math.PI / 3);
      // A crossbeam carries two bits.
      const beam = rrect(-10.5, -3.2, 21, 6.4, 3.2);
      c.drawPath(beam, fill(SPACE.hull1));
      litStroke(c, beam, FRAME, 1.2, G);
      for (const h of rigHeads(1)) collar(c, h.x / K, h.y / K, h.r / K + 1.4);
      c.drawPath(line(0, -3.2, 0, -12.5), stroke(LEG, 1.6));
      stripeBars(c, 0, -3.2, 0, -12.5, stripes);
      break;
    }
    case 2: {
      // Deep Bore: a square tower frame with cross-bracing and four legs.
      for (let i = 0; i < 4; i++) {
        const a = (45 + 90 * i) * DEG;
        const leg = line(Math.cos(a) * 9, Math.sin(a) * 9, Math.cos(a) * 16, Math.sin(a) * 16);
        c.drawPath(leg, stroke(alpha(SPACE.hull0, 0.8), 3.6));
        litStroke(c, leg, LEG, 1.5, G);
        c.drawPath(circle(Math.cos(a) * 16, Math.sin(a) * 16, 2.1), fill(SPACE.hull2));
        c.drawPath(circle(Math.cos(a) * 16, Math.sin(a) * 16, 2.1), stroke(FRAME, 0.9));
      }
      const frame = rrect(-9, -9, 18, 18, 2);
      c.drawPath(frame, fill(alpha(SPACE.hull1, 0.92)));
      litStroke(c, frame, FRAME, 1.2, G);
      c.drawPath(poly([-9, -9, 9, 9], false), stroke(alpha(SPACE.steel, 0.4), 0.9));
      c.drawPath(poly([9, -9, -9, 9], false), stroke(alpha(SPACE.steel, 0.4), 0.9));
      collar(c, 0, 0, 7.2);
      c.drawPath(line(6, -6, 10.5, -10.5), stroke(LEG, 1.6));
      stripeBars(c, 6, -6, 10.5, -10.5, stripes);
      break;
    }
    case 3: {
      // Seam Detector: a triangular frame, a tall mast with a sweeping fan antenna and a gold lamp
      // (gold = seams), unlike the square Deep Bore.
      const tri: number[] = [];
      for (let i = 0; i < 3; i++) {
        const a = -90 * DEG + (TAU * i) / 3;
        tri.push(Math.cos(a) * 12, 1.5 + Math.sin(a) * 12);
        const leg = line(Math.cos(a) * 12, 1.5 + Math.sin(a) * 12, Math.cos(a) * 17, 1.5 + Math.sin(a) * 17);
        litStroke(c, leg, LEG, 1.5, G);
        c.drawPath(circle(Math.cos(a) * 17, 1.5 + Math.sin(a) * 17, 2.1), fill(SPACE.hull2));
        c.drawPath(circle(Math.cos(a) * 17, 1.5 + Math.sin(a) * 17, 2.1), stroke(FRAME, 0.9));
      }
      const frame = poly(tri);
      c.drawPath(frame, fill(alpha(SPACE.hull1, 0.92)));
      litStroke(c, frame, FRAME, 1.2, G);
      collar(c, 0, 1.5, 6.8);
      // The mast rises from the frame's upper corner, the fan antenna sweeps above it.
      c.drawPath(line(0, -10.5, 0, -19), stroke(alpha(SPACE.steel, 0.85), 1.6));
      const fan = poly([0, -19, -8, -25, -4.5, -27.5, 0, -28.5, 4.5, -27.5, 8, -25]);
      c.drawPath(fan, fill(alpha(SPACE.gold, 0.16)));
      c.drawPath(fan, stroke(alpha(SPACE.gold, 0.75), 0.9));
      for (const a of [-118, -90, -62]) {
        const r = a * DEG;
        c.drawPath(line(0, -19, Math.cos(r) * 9, -19 + Math.sin(r) * 9), stroke(alpha(SPACE.gold, 0.45), 0.6));
      }
      lamp(c, 0, -19, 1.5, SPACE.gold, 5);
      c.drawPath(line(5, 4, 11, 6), stroke(LEG, 1.4));
      stripeBars(c, 0, -10.5, 0, -18, stripes);
      break;
    }
    case 4: {
      // Twin Rig: two tripods on one rock, joined by a walkway.
      tripod(c, -8, -4, 10, Math.PI);
      tripod(c, 8, 4, 10, 0);
      const walk = poly([-8, -6, 8, 2, 8, 6, -8, -2]);
      c.drawPath(walk, fill(SPACE.hull2));
      litStroke(c, walk, FRAME, 1, G);
      for (const h of rigHeads(4)) collar(c, h.x / K, h.y / K, h.r / K + 1.6);
      c.drawPath(line(0, 0, 1, -9.5), stroke(LEG, 1.6));
      stripeBars(c, 0, 0, 1, -9.5, stripes);
      break;
    }
  }
  c.restore();
}

/**
 * One drill head (spins 4 turns/s while drilling, stops when stalled), radius `r`: a three-tooth
 * bit, a Y with short teeth at its tips (no aperture or shutter motif).
 */
export function drawDrillHead(c: SkCanvas, r = 4.6): void {
  c.drawPath(circle(0, 0, r), fill(SPACE.hull2));
  c.drawPath(circle(0, 0, r), stroke(alpha(SPACE.steel, 0.8), Math.max(0.6, r * 0.14)));
  const ink = mix(SPACE.steel, '#FFFFFF', 0.45);
  const w = Math.max(0.8, r * 0.26);
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (TAU * i) / 3;
    const ex = Math.cos(a) * r * 0.78;
    const ey = Math.sin(a) * r * 0.78;
    c.drawPath(line(0, 0, ex, ey), stroke(ink, w));
    // A short tooth bent the way the bit turns.
    const ta = a + Math.PI / 2;
    c.drawPath(line(ex, ey, ex + Math.cos(ta) * r * 0.4, ey + Math.sin(ta) * r * 0.4), stroke(ink, w * 0.85));
  }
  c.drawCircle(0, 0, r * 0.24, fill(SPACE.white));
}

export type LampState = 'run' | 'full' | 'dry' | 'off';

/**
 * The status lamp, readable by shape (critique M5): RUN a small green dot; FULL a 4 pt amber ring
 * (blink it at 1 Hz; the drill head stops); DRY a small red x; off a dim dot.
 */
export function drawRigLamp(c: SkCanvas, state: LampState): void {
  switch (state) {
    case 'off':
      c.drawCircle(0, 0, 1.4, fill('#3A4256'));
      return;
    case 'run':
      lamp(c, 0, 0, 1.5, SPACE.green, 4.5);
      return;
    case 'full':
      glow(c, 0, 0, 6.5, SPACE.amber, 0.5);
      c.drawPath(circle(0, 0, 2.6), stroke(SPACE.bg, 2.4));
      c.drawPath(circle(0, 0, 2.6), stroke(SPACE.amber, 1.4));
      c.drawCircle(0, 0, 0.8, fill(SPACE.amber));
      return;
    case 'dry':
      glow(c, 0, 0, 5.5, SPACE.red, 0.45);
      c.drawPath(line(-2.2, -2.2, 2.2, 2.2), stroke(SPACE.bg, 2.6));
      c.drawPath(line(2.2, -2.2, -2.2, 2.2), stroke(SPACE.bg, 2.6));
      c.drawPath(line(-2, -2, 2, 2), stroke(SPACE.red, 1.4));
      c.drawPath(line(2, -2, -2, 2), stroke(SPACE.red, 1.4));
      return;
  }
}

/** A complete rig as the Rig sheet shows it: base, heads and a lamp (default run). */
export function drawRig(c: SkCanvas, o: RigOptions & { lamp?: LampState }): void {
  drawRigBase(c, o);
  for (const h of rigHeads(o.look)) {
    c.save();
    c.translate(h.x, h.y);
    drawDrillHead(c, h.r);
    c.restore();
  }
  const l = rigLamp(o.look);
  c.save();
  c.translate(l.x, l.y);
  drawRigLamp(c, o.lamp ?? 'run');
  c.restore();
}
