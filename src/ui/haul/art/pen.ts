/**
 * The small drawing kit of Orbit Haulers' art: paints, paths, glow strokes and picture recording.
 * Pure Skia calls (no React, no Reanimated), so it runs in the app and in Node
 * (scripts/art/headless.ts) alike.
 *
 * The look: line-lit flat vector. Dark flat fills, a 1.5 pt bright outline, and glow baked into
 * the drawing as two wider, fainter strokes under the line (or a radial gradient for lamps).
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
import { alpha } from './palette';

/** Outline width of every machine and object, in points. */
export const LINE = 1.5;

// ---------------------------------------------------------------------------
// Paints
// ---------------------------------------------------------------------------

export function fill(color: string): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  return p;
}

export function stroke(color: string, width = LINE, round = true): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setColor(Skia.Color(color));
  if (round) {
    p.setStrokeCap(StrokeCap.Round);
    p.setStrokeJoin(StrokeJoin.Round);
  }
  return p;
}

/** A dashed stroke: `on` and `off` lengths in points, `phase` shifts the pattern. */
export function dashed(color: string, width: number, on: number, off: number, phase = 0): SkPaint {
  const p = stroke(color, width);
  p.setStrokeCap(StrokeCap.Butt);
  p.setPathEffect(Skia.PathEffect.MakeDash([on, off], phase));
  return p;
}

/** Additive paint for light (flames, flashes): brightens what is under it. */
export function light(color: string): SkPaint {
  const p = fill(color);
  p.setBlendMode(BlendMode.Plus);
  return p;
}

/** A soft round glow: a radial gradient from `color` at `a` to transparent at radius `r`. */
export function glowPaint(x: number, y: number, r: number, color: string, a = 0.5): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x, y },
      Math.max(0.01, r),
      [Skia.Color(alpha(color, a)), Skia.Color(alpha(color, a * 0.35)), Skia.Color(alpha(color, 0))],
      [0, 0.45, 1],
      TileMode.Clamp,
    ),
  );
  return p;
}

/** A linear gradient fill between two points. */
export function linearPaint(x0: number, y0: number, x1: number, y1: number, colors: string[], pos?: number[]): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, colors.map((c) => Skia.Color(c)), pos ?? null, TileMode.Clamp));
  return p;
}

// ---------------------------------------------------------------------------
// Drawing verbs
// ---------------------------------------------------------------------------

/** Clips the canvas to `path` (anti-aliased). Pair with save/restore. */
export function clip(c: SkCanvas, path: SkPath): void {
  c.clipPath(path, ClipOp.Intersect, true);
}

/** A soft glow disc. */
export function glow(c: SkCanvas, x: number, y: number, r: number, color: string, a = 0.5): void {
  c.drawCircle(x, y, r, glowPaint(x, y, r, color, a));
}

/**
 * A lit line: two faint wide strokes (the baked glow) under the line itself.
 * `g` scales the glow (0 = none).
 */
export function litStroke(c: SkCanvas, path: SkPath, color: string, width = LINE, g = 1): void {
  if (g > 0) {
    c.drawPath(path, stroke(alpha(color, 0.1 * g), width + 4.5));
    c.drawPath(path, stroke(alpha(color, 0.22 * g), width + 2));
  }
  c.drawPath(path, stroke(color, width));
}

/** Fills `path` and draws its lit outline: the standard machine part. */
export function part(c: SkCanvas, path: SkPath, fillColor: string, lineColor: string, width = LINE, g = 1): void {
  c.drawPath(path, fill(fillColor));
  litStroke(c, path, lineColor, width, g);
}

/** A lamp: glow, a coloured dot and a white hot centre. */
export function lamp(c: SkCanvas, x: number, y: number, r: number, color: string, glowR = r * 3.2): void {
  glow(c, x, y, glowR, color, 0.55);
  c.drawCircle(x, y, r, fill(color));
  c.drawCircle(x - r * 0.2, y - r * 0.2, r * 0.45, fill(alpha('#FFFFFF', 0.85)));
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function builder(): SkPathBuilder {
  return Skia.PathBuilder.Make();
}

/** A closed polygon through points [x, y, x, y, ...]. */
export function poly(pts: number[], close = true): SkPath {
  const b = builder();
  b.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) b.lineTo(pts[i], pts[i + 1]);
  if (close) b.close();
  return b.build();
}

/** A regular polygon of `n` sides, radius `r`, first corner at angle `a0` (radians, 0 = right). */
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

export function rrect(x: number, y: number, w: number, h: number, r: number): SkPath {
  return builder().addRRect({ rect: { x, y, width: w, height: h }, rx: r, ry: r }).build();
}

export function line(x0: number, y0: number, x1: number, y1: number): SkPath {
  return builder().moveTo(x0, y0).lineTo(x1, y1).build();
}

/** An open arc of a circle, angles in degrees (0 = right, clockwise). */
export function arc(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): SkPath {
  return builder().addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg).build();
}

/** A smooth closed blob through points, as Catmull-Rom curves. */
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

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

/** Bounds of a picture, in points, around its origin. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Records `draw` into a picture. `box` is its cull rectangle (points). */
export function picture(box: Box, draw: (c: SkCanvas) => void): SkPicture {
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(box.x, box.y, box.w, box.h));
  draw(c);
  return rec.finishRecordingAsPicture();
}

/** A square box of half-size `r` round the origin. */
export function around(r: number): Box {
  return { x: -r, y: -r, w: r * 2, h: r * 2 };
}

// ---------------------------------------------------------------------------
// Seeded randomness (art only; never the engine's rng)
// ---------------------------------------------------------------------------

/** mulberry32: a small fast seeded generator, returns numbers in [0, 1). */
export function seeded(seed: number): () => number {
  let a = (seed | 0) ^ 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
