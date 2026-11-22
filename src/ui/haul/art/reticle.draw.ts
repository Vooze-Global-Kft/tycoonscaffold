/**
 * The hint pointer's drawing (section 3), second pass (critique S11): a survey frame of four
 * corner brackets round a bright dot, not a gunsight; and the drag guide's arrowhead. The guide
 * itself is a row of white dots (never dashed cyan, which would read as an ice route).
 * Pure Skia; Reticle.tsx animates it.
 */
import type { SkCanvas, SkPath } from '@shopify/react-native-skia';
import { SPACE, alpha } from './palette';
import { fill, glow, line, poly, stroke } from './pen';

/** Outer radius of the reticle (brackets included), points. */
export const RETICLE_R = 19;

/** The guide's dot pattern: Skia dash intervals for round-capped dots (dot, gap). */
export const GUIDE_DOTS = [0.1, 7];
/** The guide's colour: white, so it never reads as a route. */
export const GUIDE_COLOR = '#FFFFFF';

/** The reticle centred on the origin: four corner brackets and a dot (pulse the dot's scale). */
export function drawReticle(c: SkCanvas, color: string = SPACE.line): void {
  glow(c, 0, 0, 24, color, 0.22);
  const h = 14;
  const l = 6.5;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const p = poly([sx * h, sy * (h - l), sx * h, sy * h, sx * (h - l), sy * h], false);
    c.drawPath(p, stroke(alpha(color, 0.25), 5.5));
    c.drawPath(p, stroke(color, 2.2));
  }
  c.drawCircle(0, 0, 4.5, fill(alpha(color, 0.35)));
  c.drawCircle(0, 0, 2.6, fill('#FFFFFF'));
}

/** The guide's arrowhead path at (tx, ty), pointing along the line from (fx, fy). */
export function guideArrowPath(fx: number, fy: number, tx: number, ty: number, size = 7): SkPath {
  const d = Math.hypot(tx - fx, ty - fy) || 1;
  const ux = (tx - fx) / d;
  const uy = (ty - fy) / d;
  // Stop short of the target so the reticle's frame stays clear.
  const ax = tx - ux * (RETICLE_R + 2);
  const ay = ty - uy * (RETICLE_R + 2);
  return poly([ax + ux * size, ay + uy * size, ax - uy * size * 0.6, ay + ux * size * 0.6, ax + uy * size * 0.6, ay - ux * size * 0.6]);
}

/** The whole drag guide drawn statically (sheets and mocks): white dots and one arrowhead. */
export function drawGuide(c: SkCanvas, fx: number, fy: number, tx: number, ty: number): void {
  const d = Math.hypot(tx - fx, ty - fy) || 1;
  const ux = (tx - fx) / d;
  const uy = (ty - fy) / d;
  const end = d - RETICLE_R - 2;
  for (let s = 6; s < end - 4; s += 7) c.drawCircle(fx + ux * s, fy + uy * s, 1.2, fill(alpha(GUIDE_COLOR, 0.9)));
  c.drawPath(guideArrowPath(fx, fy, tx, ty), fill(GUIDE_COLOR));
  void line;
}
