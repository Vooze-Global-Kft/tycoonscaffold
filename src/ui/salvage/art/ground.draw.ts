/**
 * The yard's ground (yard-style.md "Ground"): pale concrete slabs with joints, never sand or dust; oil
 * stains and rain puddles as flat decals; painted yellow bay lines; the asphalt lane outside the gate.
 * World rectangles in metres (x east, y south) drawn in the view's points; everything seeded, nothing
 * random. In the app the slab tile is baked once (world/ground.ts draws it repeated) and the decals go
 * into the atlas as ground decals drawn before every sprite.
 */
import { Skia, type SkCanvas } from '@shopify/react-native-skia';
import { YARD, shade } from './palette';
import { blob, fill, hash01, oval, poly, proj, segment, stroke, type View3q } from './pen';

/** One slab's size, metres (the tile the app repeats is 2 x 2 slabs). */
export const SLAB = 3;

/** Concrete slabs filling the world rectangle (x0, y0, w, d), metres. */
export function drawConcrete(c: SkCanvas, v: View3q, x0: number, y0: number, w: number, d: number, seed = 1): void {
  const [ax, ay] = proj(v, x0, y0, 0);
  const [bx, by] = proj(v, x0 + w, y0 + d, 0);
  c.drawRect({ x: ax, y: ay, width: bx - ax, height: by - ay }, fill(YARD.concrete));
  const i0 = Math.floor(x0 / SLAB);
  const j0 = Math.floor(y0 / SLAB);
  for (let j = j0; j * SLAB < y0 + d; j++)
    for (let i = i0; i * SLAB < x0 + w; i++) {
      const [sx, sy] = proj(v, i * SLAB, j * SLAB, 0);
      const sw = SLAB * v.ppm;
      const sh = SLAB * v.ppm * v.tilt;
      const tone = (hash01(seed, i, j) - 0.5) * 0.07;
      c.drawRect({ x: sx, y: sy, width: sw, height: sh }, fill(shade(YARD.concrete, tone)));
      // float marks: a few faint broad strokes in the slab's direction
      for (let k = 0; k < 3; k++) {
        const fy = sy + sh * (0.2 + 0.3 * k + hash01(seed, i * 7 + k, j) * 0.1);
        c.drawPath(segment(sx + sw * 0.1, fy, sx + sw * (0.5 + hash01(seed, i, j * 3 + k) * 0.4), fy), stroke(shade(YARD.concrete, 0.07), 3, 0.5));
      }
      // specks of aggregate
      for (let k = 0; k < 10; k++) {
        const px = sx + hash01(seed, i * 31 + k, j) * sw;
        const py = sy + hash01(seed, i, j * 29 + k) * sh;
        c.drawCircle(px, py, 0.6 + (k % 3) * 0.35, fill(k % 2 ? YARD.concreteDark : YARD.concreteLight, 0.8));
      }
      // a hairline crack in some slabs
      if (hash01(seed, i, j * 5) > 0.7) {
        const cx = sx + sw * (0.2 + hash01(seed, i, j) * 0.5);
        const cy = sy + sh * 0.2;
        c.drawPath(poly([cx, cy, cx + 6, cy + sh * 0.2, cx + 2, cy + sh * 0.4, cx + 9, cy + sh * 0.6], false), stroke(YARD.joint, 0.9, 0.7));
      }
      // joints: a dark line and a light lip below it
      c.drawPath(segment(sx, sy, sx + sw, sy), stroke(YARD.joint, 1.3));
      c.drawPath(segment(sx, sy + 1.2, sx + sw, sy + 1.2), stroke(YARD.concreteLight, 0.8, 0.7));
      c.drawPath(segment(sx, sy, sx, sy + sh), stroke(YARD.joint, 1.3));
    }
}

/** The asphalt lane (x0, y0, w, d) with a worn white edge line. */
export function drawAsphalt(c: SkCanvas, v: View3q, x0: number, y0: number, w: number, d: number, seed = 2): void {
  const [ax, ay] = proj(v, x0, y0, 0);
  const [bx, by] = proj(v, x0 + w, y0 + d, 0);
  c.drawRect({ x: ax, y: ay, width: bx - ax, height: by - ay }, fill(YARD.asphalt));
  for (let k = 0; k < (w * d) / 0.6; k++) c.drawCircle(ax + hash01(seed, k, 1) * (bx - ax), ay + hash01(seed, k, 2) * (by - ay), 0.7, fill(YARD.asphaltLight, 0.8));
  c.drawPath(segment(ax, ay + 4, bx, ay + 4), stroke('#D9DCD8', 2, 0.8));
}

/** A painted line on the ground from (x0, y0) to (x1, y1), metres; `dash` for a dashed bay line. */
export function drawPaintLine(c: SkCanvas, v: View3q, x0: number, y0: number, x1: number, y1: number, width = 0.12, dash = false): void {
  const [ax, ay] = proj(v, x0, y0, 0);
  const [bx, by] = proj(v, x1, y1, 0);
  const p = stroke(YARD.linePaint, width * v.ppm * (Math.abs(by - ay) > Math.abs(bx - ax) ? 1 : v.tilt));
  if (dash) {
    p.setPathEffect(Skia.PathEffect.MakeDash([0.9 * v.ppm, 0.5 * v.ppm], 0));
  }
  c.drawPath(segment(ax, ay, bx, by), p);
  c.drawPath(segment(ax, ay, bx, by), stroke(YARD.linePaintWorn, 0.8, 0.6));
}

/** An oil stain decal at (x, y), radius r metres: an irregular dark blot with a soft rim and one sheen streak. */
export function drawOilStain(c: SkCanvas, v: View3q, x: number, y: number, r: number, seed = 3): void {
  const [cx, cy] = proj(v, x, y, 0);
  const pts: number[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.65 + hash01(seed, i) * 0.45;
    pts.push(cx + Math.cos(a) * r * v.ppm * k, cy + Math.sin(a) * r * v.ppm * v.tilt * k);
  }
  c.drawPath(blob(pts), fill(YARD.oil, 0.16));
  c.drawPath(blob(pts.map((p, i) => (i % 2 ? cy + (p - cy) * 0.62 : cx + (p - cx) * 0.62))), fill(YARD.oil, 0.22));
  c.drawPath(segment(cx - r * v.ppm * 0.3, cy - 1, cx + r * v.ppm * 0.1, cy - 2), stroke('#7E8FA8', 1.2, 0.35));
  // a drip trail
  c.drawCircle(cx + r * v.ppm * 0.9, cy + r * v.ppm * v.tilt * 0.3, 1.6, fill(YARD.oil, 0.25));
}

/** A rain puddle at (x, y), rx by ry metres: pale sky-blue with a light edge and a reflected highlight. */
export function drawPuddle(c: SkCanvas, v: View3q, x: number, y: number, rx: number, ry: number, seed = 4): void {
  const [cx, cy] = proj(v, x, y, 0);
  const pts: number[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.75 + hash01(seed, i) * 0.3;
    pts.push(cx + Math.cos(a) * rx * v.ppm * k, cy + Math.sin(a) * ry * v.ppm * v.tilt * k);
  }
  const p = blob(pts);
  c.drawPath(p, fill(shade(YARD.concrete, -0.18), 0.6));
  c.save();
  c.translate(0, -1.2);
  c.drawPath(p, fill(YARD.puddle));
  c.restore();
  c.drawPath(oval(cx - rx * v.ppm * 0.2, cy - ry * v.ppm * v.tilt * 0.25 - 1, rx * v.ppm * 0.35, 1.4), fill(YARD.puddleLight, 0.9));
  c.drawPath(segment(cx + rx * v.ppm * 0.15, cy + 1, cx + rx * v.ppm * 0.45, cy + 1), stroke(YARD.puddleLight, 1, 0.7));
}

/** A ground patch for the kit's sheet: slabs, a bay line, two stains and two puddles, w x d metres from its top-left. */
export function drawGroundPatch(c: SkCanvas, v: View3q, w: number, d: number, seed = 5): void {
  drawConcrete(c, v, 0, 0, w, d, seed);
  drawPaintLine(c, v, 0.4, d * 0.7, w - 0.4, d * 0.7, 0.12, true);
  drawOilStain(c, v, w * 0.3, d * 0.35, 0.6, seed);
  drawOilStain(c, v, w * 0.72, d * 0.25, 0.35, seed + 1);
  drawPuddle(c, v, w * 0.6, d * 0.55, 0.9, 0.5, seed);
  drawPuddle(c, v, w * 0.15, d * 0.85, 0.5, 0.3, seed + 2);
}
