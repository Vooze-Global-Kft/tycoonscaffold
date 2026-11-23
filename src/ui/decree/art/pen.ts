/**
 * The drawing kit of the baize-and-ink art: paints, paths, hatching and picture recording. Pure Skia
 * (no React, no Reanimated), so it runs in the app and in Node (scripts/art/headless.ts) alike.
 *
 * The look (office-design.md 1.2, 4.6): flat vector in two washes, a thin warm-brown line
 * (`LINE`, never black) and one-direction hatching (45 degrees, lower left to upper right) for every
 * shadow, the same as the busts of faces/. No gradients on paper or props except the lamp's light
 * and the brass shine; never a blur or mask filter (a picture replays its filters each frame).
 */
import {
  BlendMode,
  ClipOp,
  FillType,
  PaintStyle,
  PathOp,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkPaint,
  type SkPath,
  type SkPathBuilder,
  type SkPicture,
} from '@shopify/react-native-skia';
import { DESK, GREY_MATRIX, alpha } from './palette';

/** Line width of props at their design size, in points. */
export const LINE_W = 1.1;
export const LINE = DESK.line;
/** The hatching's angle (degrees from the x axis, upward to the right) and spacing in points. */
export const HATCH_DEG = -45;
export const HATCH_GAP = 2.2;

// ---------------------------------------------------------------------------
// Paints
// ---------------------------------------------------------------------------

export function fill(color: string): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  return p;
}

export function stroke(color: string, width = LINE_W, round = true): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setColor(Skia.Color(color));
  p.setStrokeCap(round ? StrokeCap.Round : StrokeCap.Butt);
  p.setStrokeJoin(round ? StrokeJoin.Round : StrokeJoin.Miter);
  return p;
}

export function dashed(color: string, width: number, on: number, off: number, phase = 0): SkPaint {
  const p = stroke(color, width);
  p.setStrokeCap(StrokeCap.Butt);
  p.setPathEffect(Skia.PathEffect.MakeDash([on, off], phase));
  return p;
}

export function linearPaint(x0: number, y0: number, x1: number, y1: number, colors: string[], pos?: number[]): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, colors.map((c) => Skia.Color(c)), pos ?? null, TileMode.Clamp));
  return p;
}

export function radialPaint(x: number, y: number, r: number, colors: string[], pos?: number[]): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(Skia.Shader.MakeRadialGradient({ x, y }, Math.max(0.01, r), colors.map((c) => Skia.Color(c)), pos ?? null, TileMode.Clamp));
  return p;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function builder(): SkPathBuilder {
  return Skia.PathBuilder.Make();
}

/** A closed (or open) polygon through points [x, y, x, y, ...]. */
export function poly(pts: number[], close = true): SkPath {
  const b = builder();
  b.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) b.lineTo(pts[i], pts[i + 1]);
  if (close) b.close();
  return b.build();
}

export function rect(x: number, y: number, w: number, h: number): SkPath {
  return builder().addRect({ x, y, width: w, height: h }).build();
}

export function rrect(x: number, y: number, w: number, h: number, r: number): SkPath {
  return builder().addRRect({ rect: { x, y, width: w, height: h }, rx: r, ry: r }).build();
}

export function circle(cx: number, cy: number, r: number): SkPath {
  return builder().addCircle(cx, cy, r).build();
}

export function oval(cx: number, cy: number, rx: number, ry: number): SkPath {
  return builder().addOval({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }).build();
}

export function line(x0: number, y0: number, x1: number, y1: number): SkPath {
  return builder().moveTo(x0, y0).lineTo(x1, y1).build();
}

/** An open arc, angles in degrees (0 = right, clockwise). */
export function arc(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): SkPath {
  return builder().addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg).build();
}

/** A pie slice (closed), degrees as arc(). */
export function wedge(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): SkPath {
  const b = builder();
  b.moveTo(cx, cy);
  b.arcToOval({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg, false);
  b.close();
  return b.build();
}

export function ngon(cx: number, cy: number, r: number, n: number, a0 = -Math.PI / 2): SkPath {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (Math.PI * 2 * i) / n;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return poly(pts);
}

export function star(cx: number, cy: number, r: number, inner: number, n: number, a0 = -Math.PI / 2): SkPath {
  const pts: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = a0 + (Math.PI * i) / n;
    const k = i % 2 ? inner : r;
    pts.push(cx + k * Math.cos(a), cy + k * Math.sin(a));
  }
  return poly(pts);
}

/** A smooth closed blob through points (Catmull-Rom). */
export function blob(pts: [number, number][], tension = 1): SkPath {
  const n = pts.length;
  const b = builder();
  b.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const k = tension / 6;
    b.cubicTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  b.close();
  return b.build();
}

/** A smooth open curve through points (Catmull-Rom). */
export function curve(pts: [number, number][], tension = 1): SkPath {
  const n = pts.length;
  const b = builder();
  b.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const k = tension / 6;
    b.cubicTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  return b.build();
}

/** The union of several paths (one outline round overlapping shapes). */
export function union(...paths: SkPath[]): SkPath {
  let out = paths[0];
  for (let i = 1; i < paths.length; i++) out = Skia.Path.MakeFromOp(out, paths[i], PathOp.Union) ?? out;
  return out;
}

export function minus(a: SkPath, b: SkPath): SkPath {
  return Skia.Path.MakeFromOp(a, b, PathOp.Difference) ?? a;
}

/** A scalloped edge: `n` half-round bumps from (x0, y) to (x1, y), hanging down by `d` (bunting, napkin edges). */
export function scallops(x0: number, x1: number, y: number, n: number, d: number): SkPath {
  const b = builder();
  const w = (x1 - x0) / n;
  b.moveTo(x0, y);
  for (let i = 0; i < n; i++) b.quadTo(x0 + w * (i + 0.5), y + d * 2, x0 + w * (i + 1), y);
  return b.build();
}

/** A wobbly hand-drawn line through points (seeded): election-night chalk, the crooked masthead. */
export function wobble(pts: [number, number][], amount: number, seed: number): SkPath {
  const r = seeded(seed);
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([x0 + (x1 - x0) * t + (r() - 0.5) * amount, y0 + (y1 - y0) * t + (r() - 0.5) * amount]);
    }
  }
  out.push(pts[pts.length - 1]);
  return curve(out, 0.8);
}

// ---------------------------------------------------------------------------
// Drawing verbs
// ---------------------------------------------------------------------------

export function clip(c: SkCanvas, path: SkPath): void {
  c.clipPath(path, ClipOp.Intersect, true);
}

/** Fills `path` and draws its line: the standard shape of the kit. */
export function shape(c: SkCanvas, path: SkPath, fillColor: string, width = LINE_W, ink: string = LINE): void {
  c.drawPath(path, fill(fillColor));
  if (width > 0) c.drawPath(path, stroke(ink, width));
}

/**
 * One-direction hatching inside `path` (the kit's only shading): parallel lines at HATCH_DEG,
 * `gap` apart, in `color`, `width` thick. `box` bounds the lines (path bounds by default).
 */
export function hatch(c: SkCanvas, path: SkPath, color: string, gap = HATCH_GAP, width = 0.5, deg = HATCH_DEG): void {
  const bb = path.computeTightBounds();
  c.save();
  clip(c, path);
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;
  const r = Math.hypot(bb.width, bb.height) / 2 + gap;
  const a = (deg * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const b = builder();
  for (let d = -r; d <= r; d += gap) {
    const ox = cx - uy * d;
    const oy = cy + ux * d;
    b.moveTo(ox - ux * r, oy - uy * r);
    b.lineTo(ox + ux * r, oy + uy * r);
  }
  c.drawPath(b.build(), stroke(color, width, false));
  c.restore();
}

/**
 * The two-wash volume of the kit: `base` fills the shape, `shade` fills the part of it outside a
 * copy moved up-left (the side away from the light), hatched in the line colour, then the line.
 */
export function washed(c: SkCanvas, path: SkPath, base: string, shadeColor: string, dx = 1.4, dy = 1.4, width = LINE_W, hatchIt = true): void {
  c.drawPath(path, fill(base));
  c.save();
  clip(c, path);
  const moved = Skia.PathBuilder.MakeFromPath(path).offset(-dx, -dy).build();
  const rim = minus(path, moved);
  c.drawPath(rim, fill(shadeColor));
  if (hatchIt) hatch(c, rim, alpha(LINE, 0.35), HATCH_GAP, 0.45);
  c.restore();
  if (width > 0) c.drawPath(path, stroke(LINE, width));
}

/** A soft shadow under a prop on the baize: the shape offset and darkened (no blur). */
export function dropShadow(c: SkCanvas, path: SkPath, dx = 1.5, dy = 2, a = 0.28): void {
  c.save();
  c.translate(dx, dy);
  c.drawPath(path, fill(alpha(DESK.shadow, a)));
  c.restore();
}

/** `path` moved by (dx, dy). */
export function moved(path: SkPath, dx: number, dy: number): SkPath {
  return Skia.PathBuilder.MakeFromPath(path).offset(dx, dy).build();
}

/** Draws `draw` flattened to one colour (silhouettes, dotted places in the cabinet frame). */
export function flat(c: SkCanvas, color: string, draw: (c: SkCanvas) => void): void {
  const p = Skia.Paint();
  p.setColorFilter(Skia.ColorFilter.MakeBlend(Skia.Color(color), BlendMode.SrcIn));
  c.saveLayer(p);
  draw(c);
  c.restore();
}

/** Draws `draw` in greyscale (luminance), for the contact sheet's greyscale switch. */
export function grey(c: SkCanvas, draw: (c: SkCanvas) => void): void {
  const p = Skia.Paint();
  p.setColorFilter(Skia.ColorFilter.MakeMatrix(GREY_MATRIX));
  c.saveLayer(p);
  draw(c);
  c.restore();
}

/** Draws `draw` at opacity `a`. */
export function faded(c: SkCanvas, a: number, draw: (c: SkCanvas) => void): void {
  const p = Skia.Paint();
  p.setAlphaf(Math.max(0, Math.min(1, a)));
  c.saveLayer(p);
  draw(c);
  c.restore();
}

/** Draws `draw` translated, scaled and turned (degrees) about the origin. */
export function at(c: SkCanvas, x: number, y: number, s: number, deg: number, draw: (c: SkCanvas) => void): void {
  c.save();
  c.translate(x, y);
  if (deg) c.rotate(deg, 0, 0);
  if (s !== 1) c.scale(s, s);
  draw(c);
  c.restore();
}

// ---------------------------------------------------------------------------
// The broad nib (signature, captions): a pen held at a fixed angle
// ---------------------------------------------------------------------------

/**
 * A filled ribbon along the polyline `pts` ([x, y, ...]) as a broad nib of width `nib` held at
 * `deg` would leave it: thick on strokes across the nib, thin along it. One path, nonzero winding,
 * every quad wound the same way, so overlaps join.
 */
export function nibPath(pts: ArrayLike<number>, nib: number, deg = -35, end = pts.length / 2): SkPath {
  const a = (deg * Math.PI) / 180;
  const nx = (Math.cos(a) * nib) / 2;
  const ny = (Math.sin(a) * nib) / 2;
  const b = builder();
  b.setFillType(FillType.Winding);
  const n = Math.min(pts.length / 2, Math.ceil(end));
  for (let i = 0; i < n - 1; i++) {
    let x0 = pts[i * 2];
    let y0 = pts[i * 2 + 1];
    let x1 = pts[i * 2 + 2];
    let y1 = pts[i * 2 + 3];
    if (i === n - 2 && end < n) {
      const t = end - Math.floor(end);
      x1 = x0 + (x1 - x0) * t;
      y1 = y0 + (y1 - y0) * t;
    }
    // Quad p0-n, p1-n, p1+n, p0+n; orient counter-clockwise.
    const q = [x0 - nx, y0 - ny, x1 - nx, y1 - ny, x1 + nx, y1 + ny, x0 + nx, y0 + ny];
    let area = 0;
    for (let k = 0; k < 4; k++) {
      const j = (k + 1) % 4;
      area += q[k * 2] * q[j * 2 + 1] - q[j * 2] * q[k * 2 + 1];
    }
    if (area < 0) {
      [x0, y0] = [q[6], q[7]];
      b.moveTo(q[6], q[7]).lineTo(q[4], q[5]).lineTo(q[2], q[3]).lineTo(q[0], q[1]).close();
    } else b.moveTo(q[0], q[1]).lineTo(q[2], q[3]).lineTo(q[4], q[5]).lineTo(q[6], q[7]).close();
    void x0;
    void y0;
  }
  // Round the ends a little so the stroke never looks cut.
  if (n > 0) {
    b.addCircle(pts[0], pts[1], nib * 0.22);
    const k = Math.max(0, n - 1);
    b.addCircle(pts[k * 2], pts[k * 2 + 1], nib * 0.22);
  }
  return b.build();
}

/** Samples a Catmull-Rom curve through `pts` into a dense polyline ([x, y, ...]), `step` points apart roughly. */
export function sampleCurve(pts: [number, number][], step = 1.5): number[] {
  const out: number[] = [];
  const n = pts.length;
  if (n === 1) return [pts[0][0], pts[0][1]];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const m = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < m; k++) {
      const t = k / m;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b2: number, c2: number, d: number) => 0.5 * (2 * b2 + (-a + c2) * t + (2 * a - 5 * b2 + 4 * c2 - d) * t2 + (-a + 3 * b2 - 3 * c2 + d) * t3);
      out.push(f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]));
    }
  }
  out.push(pts[n - 1][0], pts[n - 1][1]);
  return out;
}

/** Length of a polyline [x, y, ...]. */
export function polyLength(pts: ArrayLike<number>): number {
  let L = 0;
  for (let i = 2; i < pts.length; i += 2) L += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  return L;
}

/** The point count (fractional) at which a polyline reaches `dist` along it. */
export function indexAt(pts: ArrayLike<number>, dist: number): number {
  let L = 0;
  for (let i = 2; i < pts.length; i += 2) {
    const s = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
    if (L + s >= dist) return i / 2 + (s > 0 ? (dist - L) / s : 0);
    L += s;
  }
  return pts.length / 2;
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Records `draw` into a picture; `box` is its cull rectangle (points). */
export function picture(box: Box, draw: (c: SkCanvas) => void): SkPicture {
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(box.x, box.y, box.w, box.h));
  draw(c);
  return rec.finishRecordingAsPicture();
}

export function around(r: number, rh = r): Box {
  return { x: -r, y: -rh, w: r * 2, h: rh * 2 };
}

// ---------------------------------------------------------------------------
// Seeded randomness (art only; never the engine's rng)
// ---------------------------------------------------------------------------

/** mulberry32: a small seeded generator in [0, 1). */
export function seeded(seed: number): () => number {
  let a = (seed | 0) ^ 0x5b3e8c11;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable small number from a string (to seed per-name wobble). */
export function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
