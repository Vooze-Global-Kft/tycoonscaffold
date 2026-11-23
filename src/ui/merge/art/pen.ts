/**
 * The small drawing kit of the lantern-night art: paints, paths and picture recording. Pure Skia
 * (no React, no Reanimated), so it runs in the app and in Node (scripts/art/headless.ts) alike.
 *
 * The look: flat vector, soft dark-indigo ink outlines (`INK`, never black and never a bright line),
 * one flat light per shape (a highlight crescent), and warm lantern glow baked as radial gradients.
 * Never a blur or mask filter: a picture replays its filters on every frame.
 */
import {
  BlendMode,
  ClipOp,
  PaintStyle,
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
import { NIGHT, alpha } from './palette';

/** Outline width of goods and props at their design size, in points. */
export const INK_W = 1.25;
export const INK = NIGHT.ink;

// ---------------------------------------------------------------------------
// Paints
// ---------------------------------------------------------------------------

export function fill(color: string): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  return p;
}

export function stroke(color: string, width = INK_W, round = true): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setColor(Skia.Color(color));
  if (round) {
    p.setStrokeCap(StrokeCap.Round);
    p.setStrokeJoin(StrokeJoin.Round);
  } else {
    p.setStrokeCap(StrokeCap.Butt);
    p.setStrokeJoin(StrokeJoin.Miter);
  }
  return p;
}

/** A dashed stroke: `on` and `off` lengths in points. */
export function dashed(color: string, width: number, on: number, off: number, phase = 0): SkPaint {
  const p = stroke(color, width);
  p.setStrokeCap(StrokeCap.Butt);
  p.setPathEffect(Skia.PathEffect.MakeDash([on, off], phase));
  return p;
}

/** Additive paint for light: brightens what is under it. */
export function light(color: string): SkPaint {
  const p = fill(color);
  p.setBlendMode(BlendMode.Plus);
  return p;
}

/** A soft round glow: radial gradient from `color` at `a` to transparent at radius `r`. */
export function glowPaint(x: number, y: number, r: number, color: string, a = 0.5): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x, y },
      Math.max(0.01, r),
      [Skia.Color(alpha(color, a)), Skia.Color(alpha(color, a * 0.4)), Skia.Color(alpha(color, 0))],
      [0, 0.5, 1],
      TileMode.Clamp,
    ),
  );
  return p;
}

/** A linear gradient between two points. */
export function linearPaint(x0: number, y0: number, x1: number, y1: number, colors: string[], pos?: number[]): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, colors.map((c) => Skia.Color(c)), pos ?? null, TileMode.Clamp));
  return p;
}

// ---------------------------------------------------------------------------
// Drawing verbs
// ---------------------------------------------------------------------------

export function clip(c: SkCanvas, path: SkPath): void {
  c.clipPath(path, ClipOp.Intersect, true);
}

export function glow(c: SkCanvas, x: number, y: number, r: number, color: string, a = 0.5): void {
  c.drawCircle(x, y, r, glowPaint(x, y, r, color, a));
}

/** Fills `path` and draws its ink outline: the standard shape of the kit. */
export function shape(c: SkCanvas, path: SkPath, fillColor: string, width = INK_W, ink: string = INK): void {
  c.drawPath(path, fill(fillColor));
  if (width > 0) c.drawPath(path, stroke(ink, width));
}

/**
 * The kit's one light: the shape clipped, a lighter copy offset up-left inside it (the lit face),
 * then the outline. Reads as a soft rounded volume at 47 pt without any gradient.
 */
export function lit(c: SkCanvas, path: SkPath, base: string, top: string, dx = -1.2, dy = -1.4, width = INK_W): void {
  c.drawPath(path, fill(base));
  c.save();
  clip(c, path);
  c.translate(dx, dy);
  c.drawPath(path, fill(top));
  c.restore();
  c.save();
  clip(c, path);
  c.translate(-dx * 0.6, -dy * 0.6);
  c.restore();
  if (width > 0) c.drawPath(path, stroke(INK, width));
}

/** A small white gloss mark (an arc) for shine. */
export function gloss(c: SkCanvas, x: number, y: number, r: number, a = 0.8, startDeg = 200, sweep = 70, w = 1.1): void {
  c.drawPath(arc(x, y, r, startDeg, sweep), stroke(alpha(NIGHT.white, a), w));
}

/** A four-point sparkle star. */
export function sparkle(c: SkCanvas, x: number, y: number, r: number, color: string = NIGHT.white): void {
  const k = r * 0.28;
  const p = poly([x, y - r, x + k, y - k, x + r, y, x + k, y + k, x, y + r, x - k, y + k, x - r, y, x - k, y - k]);
  c.drawPath(p, fill(color));
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

export function ngon(cx: number, cy: number, r: number, n: number, a0 = 0): SkPath {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (Math.PI * 2 * i) / n;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return poly(pts);
}

export function circle(cx: number, cy: number, r: number): SkPath {
  return builder().addCircle(cx, cy, r).build();
}

export function oval(cx: number, cy: number, rx: number, ry: number): SkPath {
  return builder().addOval({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }).build();
}

export function rrect(x: number, y: number, w: number, h: number, r: number): SkPath {
  return builder().addRRect({ rect: { x, y, width: w, height: h }, rx: r, ry: r }).build();
}

export function line(x0: number, y0: number, x1: number, y1: number): SkPath {
  return builder().moveTo(x0, y0).lineTo(x1, y1).build();
}

/** An open arc, angles in degrees (0 = right, clockwise). */
export function arc(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): SkPath {
  return builder().addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg).build();
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

/** A scalloped edge (awnings, banners): `n` half-round bumps from (x0, y) to (x1, y), hanging down by `d`. */
export function scallops(x0: number, x1: number, y: number, n: number, d: number): SkPath {
  const b = builder();
  const w = (x1 - x0) / n;
  b.moveTo(x0, y);
  for (let i = 0; i < n; i++) b.quadTo(x0 + w * (i + 0.5), y + d * 2, x0 + w * (i + 1), y);
  return b.build();
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
// Seeded randomness (art only; never the engine's rng)
// ---------------------------------------------------------------------------

/** mulberry32: a small seeded generator in [0, 1). */
export function seeded(seed: number): () => number {
  let a = (seed | 0) ^ 0x2c1b3c6d;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
