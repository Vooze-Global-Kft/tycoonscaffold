/**
 * Mining rigs, seen from above, standing on a rock (drawn centred on the rock's centre).
 * Five looks by tier (section 2.3): L1 Tripod, L4 Dual Bit, L10 Deep Bore, L20 Seam Detector,
 * L35 Twin Rig; past L35 hazard stripes on the collar, one per 15 levels (up to 3).
 *
 * The rig base is static; the drill heads (drawDrillHead) spin on top of it at `rigHeads(look)`,
 * and the status lamp (drawRigLamp) sits at `rigLamp(look)`. About 34 pt across, so the rock
 * (44 to 52 pt) still shows round it.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { SPACE, alpha, mix } from './palette';
import { DEG, LINE, TAU, arc, circle, clip, fill, glow, lamp, line, litStroke, part, poly, rrect, stroke } from './pen';

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

/** Where the spinning drill heads sit, per look. */
export function rigHeads(look: RigLook): { x: number; y: number; r: number }[] {
  switch (look) {
    case 0:
      return [{ x: 0, y: 0, r: 4.6 }];
    case 1:
      return [
        { x: -4.6, y: 0, r: 4 },
        { x: 4.6, y: 0, r: 4 },
      ];
    case 2:
    case 3:
      return [{ x: 0, y: 0, r: 5.6 }];
    case 4:
      return [
        { x: -8, y: -4, r: 4.4 },
        { x: 8, y: 4, r: 4.4 },
      ];
  }
}

/** Where the status lamp sits, per look. */
export function rigLamp(look: RigLook): { x: number; y: number } {
  switch (look) {
    case 0:
      return { x: 0, y: -14.5 };
    case 1:
      return { x: 0, y: -14.5 };
    case 2:
      return { x: 10.5, y: -10.5 };
    case 3:
      return { x: 10.5, y: -10.5 };
    case 4:
      return { x: 1, y: -11 };
  }
}

const LEG = SPACE.steel;

function tripod(c: SkCanvas, cx: number, cy: number, reach: number, a0: number): void {
  for (let i = 0; i < 3; i++) {
    const a = a0 + (TAU * i) / 3;
    const x = cx + Math.cos(a) * reach;
    const y = cy + Math.sin(a) * reach;
    const leg = line(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, x, y);
    c.drawPath(leg, stroke(SPACE.hull0, 4.4));
    litStroke(c, leg, LEG, 1.7, 0.4);
    // Foot pad clamped to the rock.
    part(c, circle(x, y, 2.1), SPACE.hull2, SPACE.line, 1.1, 0.6);
  }
}

function collar(c: SkCanvas, cx: number, cy: number, r: number, stripes: number): void {
  const ring = circle(cx, cy, r);
  part(c, ring, SPACE.hull1, stripes > 0 ? SPACE.amber : SPACE.line, LINE, 0.6);
  if (stripes > 0) {
    // Hazard band: amber ticks round the collar, more of them per stripe level.
    const band = circle(cx, cy, r - 1.2);
    c.save();
    clip(c, band);
    const n = 6 * stripes;
    for (let i = 0; i < n; i++) {
      const a = (TAU * i) / n;
      c.drawPath(poly([cx + Math.cos(a) * (r - 2.6), cy + Math.sin(a) * (r - 2.6), cx + Math.cos(a + 0.22) * r, cy + Math.sin(a + 0.22) * r], false), stroke(SPACE.amber, 2));
    }
    c.restore();
  }
}

export interface RigOptions {
  look: RigLook;
  /** 0 to 3 hazard stripes (rigStripesFor). */
  stripes?: number;
}

/** The static rig base: legs, frame, collars (no heads, no lamp). */
export function drawRigBase(c: SkCanvas, o: RigOptions): void {
  const stripes = o.stripes ?? 0;
  glow(c, 0, 0, 18, SPACE.line, 0.08);
  switch (o.look) {
    case 0: {
      tripod(c, 0, 0, 13, -90 * DEG + Math.PI / 3);
      collar(c, 0, 0, 6.6, stripes);
      // Lamp mast.
      c.drawPath(line(0, -6.6, 0, -12.5), stroke(LEG, 1.4));
      break;
    }
    case 1: {
      tripod(c, 0, 0, 14, -90 * DEG + Math.PI / 3);
      // A crossbeam carries two bits.
      const beam = rrect(-10.5, -3.2, 21, 6.4, 3.2);
      part(c, beam, SPACE.hull1, SPACE.line, LINE, 1);
      for (const h of rigHeads(1)) collar(c, h.x, h.y, h.r + 1.4, stripes);
      c.drawPath(line(0, -3.2, 0, -12.5), stroke(LEG, 1.4));
      break;
    }
    case 2:
    case 3: {
      // Deep Bore: a square tower frame with cross-bracing and four legs.
      for (let i = 0; i < 4; i++) {
        const a = (45 + 90 * i) * DEG;
        const leg = line(Math.cos(a) * 9, Math.sin(a) * 9, Math.cos(a) * 16, Math.sin(a) * 16);
        c.drawPath(leg, stroke(SPACE.hull0, 4.4));
        litStroke(c, leg, LEG, 1.7, 0.4);
        part(c, circle(Math.cos(a) * 16, Math.sin(a) * 16, 2.1), SPACE.hull2, SPACE.line, 1.1, 0.6);
      }
      const frame = rrect(-9, -9, 18, 18, 2);
      part(c, frame, SPACE.hull1, SPACE.line, LINE, 1);
      c.drawPath(poly([-9, -9, 9, 9], false), stroke(alpha(SPACE.steel, 0.55), 0.9));
      c.drawPath(poly([9, -9, -9, 9], false), stroke(alpha(SPACE.steel, 0.55), 0.9));
      c.drawPath(rrect(-6, -6, 12, 12, 1.5), stroke(alpha(SPACE.line, 0.5), 0.8));
      collar(c, 0, 0, 7.2, stripes);
      if (o.look === 3) {
        // Seam Detector: a dish on an arm off the tower's left side.
        c.drawPath(line(-9, 4, -15.5, 9), stroke(LEG, 1.6));
        const dish = arc(-17, 11, 6, 130, 180);
        c.drawPath(circle(-17, 11, 5.2), fill(SPACE.hull2));
        litStroke(c, circle(-17, 11, 5.2), SPACE.line, 1.2, 0.8);
        c.drawPath(dish, stroke(alpha(SPACE.line, 0.5), 0.8));
        c.drawPath(circle(-17, 11, 2.6), stroke(alpha(SPACE.line, 0.7), 0.8));
        lamp(c, -17, 11, 1, SPACE.line, 3);
      }
      break;
    }
    case 4: {
      // Twin Rig: two tripods on one rock, joined by a walkway.
      tripod(c, -8, -4, 10, Math.PI);
      tripod(c, 8, 4, 10, 0);
      const walk = poly([-8, -6, 8, 2, 8, 6, -8, -2]);
      part(c, walk, SPACE.hull2, SPACE.line, 1.1, 0.6);
      for (const h of rigHeads(4)) collar(c, h.x, h.y, h.r + 1.6, stripes);
      c.drawPath(line(0, 0, 1, -9.5), stroke(LEG, 1.4));
      break;
    }
  }
}

/** One drill head (spins 4 turns/s while drilling), radius `r`. */
export function drawDrillHead(c: SkCanvas, r = 4.6): void {
  c.drawPath(circle(0, 0, r), fill(SPACE.hull3));
  // Three flutes: curved blades that make the spin visible.
  for (let i = 0; i < 3; i++) {
    const a = (TAU * i) / 3;
    const b = blade(r * 0.85, a);
    c.drawPath(b, stroke(mix(SPACE.steel, '#FFFFFF', 0.3), Math.max(0.9, r * 0.24)));
  }
  c.drawPath(circle(0, 0, r), stroke(SPACE.line, 1));
  c.drawCircle(0, 0, r * 0.28, fill(SPACE.white));
}

function blade(r: number, a: number) {
  // A blade from the centre curving out to the rim.
  return poly([0, 0, Math.cos(a + 0.5) * r * 0.55, Math.sin(a + 0.5) * r * 0.55, Math.cos(a + 1.1) * r, Math.sin(a + 1.1) * r], false);
}

export type LampState = 'run' | 'full' | 'dry' | 'off';
const LAMP: Record<LampState, string> = { run: SPACE.green, full: SPACE.amber, dry: SPACE.red, off: '#3A4256' };

/** The status lamp: green while drilling, amber FULL, red DRY. */
export function drawRigLamp(c: SkCanvas, state: LampState): void {
  if (state === 'off') {
    c.drawCircle(0, 0, 1.8, fill(LAMP.off));
    return;
  }
  lamp(c, 0, 0, 1.8, LAMP[state], 6);
}

/** A complete rig as the Rig sheet shows it: base, heads and a green lamp. */
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
