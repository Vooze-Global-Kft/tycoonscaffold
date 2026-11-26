/**
 * The drawing kit of "hi-vis-and-rust": paints, paths and the three-quarter view's solids. Pure Skia
 * (no React, no Reanimated): runs in the app (baked into the yard's atlas, world/atlas.ts) and in Node
 * (scripts/art/headless.ts).
 *
 * THE VIEW (docs/design/yard-ground.md): x east, y south, z up, metres; a point draws at
 *   sx = x * ppm,  sy = y * ppm * tilt - z * ppm * lift,  lift = sqrt(1 - tilt^2).
 * The eye looks north and down, so only TOP faces and SOUTH-facing faces show (an east or west face is
 * edge-on). Every drawing has its anchor at the origin: the centre of its footprint on the ground.
 *
 * THE LINE AND SHADING RULE (yard-style.md): flat fills in three tones from one base (top light, south
 * mid, turned faces darker by how far they turn), an ink outline (LINE_W) round every part, a light
 * bevel line along the top-front edge of metal, and one flat ground shadow per thing. No gradients
 * except heat (the glow and the pour) and the sky; never a blur or mask filter.
 */
import { BlendMode, ClipOp, PaintStyle, Skia, StrokeCap, StrokeJoin, TileMode, type SkCanvas, type SkPaint, type SkPath, type SkPathBuilder } from '@shopify/react-native-skia';
import { LINE_W, SHADOW_ALPHA, SHADOW_DX, SUN, YARD, rgbOf, shade } from './palette';

/** A hex colour as a CSS rgba() string at alpha a (for gradients that fade out). */
export const rgba = (hex: string, a: number): string => {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** The view a drawing is made for (the same three numbers as world/draw.ts View3q). */
export interface View3q {
  ppm: number;
  tilt: number;
  lift: number;
}

/** The ground work's view: 40 points a metre, tilt 0.7. */
export const VIEW: View3q = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.7 * 0.7) };

export const viewOf = (ppm: number, tilt: number): View3q => ({ ppm, tilt, lift: Math.sqrt(1 - tilt * tilt) });

// ---------------------------------------------------------------------------
// Paints
// ---------------------------------------------------------------------------

export function fill(color: string, alpha = 1): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  if (alpha < 1) p.setAlphaf(alpha);
  return p;
}

export function stroke(color: string, width = LINE_W, alpha = 1): SkPaint {
  const p = fill(color, alpha);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  return p;
}

export function butt(color: string, width: number, alpha = 1): SkPaint {
  const p = stroke(color, width, alpha);
  p.setStrokeCap(StrokeCap.Butt);
  p.setStrokeJoin(StrokeJoin.Miter);
  return p;
}

export function dashed(color: string, width: number, on: number, off: number, phase = 0): SkPaint {
  const p = butt(color, width);
  p.setPathEffect(Skia.PathEffect.MakeDash([on, off], phase));
  return p;
}

export function linear(x0: number, y0: number, x1: number, y1: number, colors: string[], pos?: number[]): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, colors.map((c) => Skia.Color(c)), pos ?? null, TileMode.Clamp));
  return p;
}

export function radial(x: number, y: number, r: number, colors: string[], pos?: number[]): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(Skia.Shader.MakeRadialGradient({ x, y }, Math.max(0.01, r), colors.map((c) => Skia.Color(c)), pos ?? null, TileMode.Clamp));
  return p;
}

// ---------------------------------------------------------------------------
// Flat paths (screen points)
// ---------------------------------------------------------------------------

export const builder = (): SkPathBuilder => Skia.PathBuilder.Make();

export function poly(pts: number[], close = true): SkPath {
  const b = builder();
  b.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) b.lineTo(pts[i], pts[i + 1]);
  if (close) b.close();
  return b.build();
}

export const rect = (x: number, y: number, w: number, h: number): SkPath => builder().addRect({ x, y, width: w, height: h }).build();
export const rrect = (x: number, y: number, w: number, h: number, r: number): SkPath => builder().addRRect({ rect: { x, y, width: w, height: h }, rx: r, ry: r }).build();
export const circle = (cx: number, cy: number, r: number): SkPath => builder().addCircle(cx, cy, r).build();
export const oval = (cx: number, cy: number, rx: number, ry: number): SkPath => builder().addOval({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }).build();
export const segment = (x0: number, y0: number, x1: number, y1: number): SkPath => builder().moveTo(x0, y0).lineTo(x1, y1).build();
export const arcPath = (cx: number, cy: number, rx: number, ry: number, startDeg: number, sweepDeg: number): SkPath =>
  builder().addArc({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }, startDeg, sweepDeg).build();

/** A smooth closed blob through points (quadratic midpoints). */
export function blob(pts: number[]): SkPath {
  const n = pts.length / 2;
  const b = builder();
  const mid = (i: number) => [(pts[(2 * i) % (2 * n)] + pts[(2 * i + 2) % (2 * n)]) / 2, (pts[(2 * i + 1) % (2 * n)] + pts[(2 * i + 3) % (2 * n)]) / 2];
  const m0 = mid(n - 1);
  b.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(i);
    b.quadTo(pts[2 * i], pts[2 * i + 1], m[0], m[1]);
  }
  b.close();
  return b.build();
}

/** Fill then ink outline. */
export function shape(c: SkCanvas, p: SkPath, color: string, line = LINE_W, ink: string = YARD.ink): void {
  c.drawPath(p, fill(color));
  if (line > 0) c.drawPath(p, stroke(ink, line));
}

/** A deterministic pseudo-random number in [0, 1) from integers (no Math.random in art either). */
export function hash01(a: number, b = 0, c = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// The three-quarter view
// ---------------------------------------------------------------------------

export type V3 = [number, number, number];

export function proj(v: View3q, x: number, y: number, z: number): [number, number] {
  return [x * v.ppm, y * v.ppm * v.tilt - z * v.ppm * v.lift];
}

/** The path of a polygon of world points. */
export function facePath(v: View3q, pts: V3[]): SkPath {
  const b = builder();
  pts.forEach((p, i) => {
    const [sx, sy] = proj(v, p[0], p[1], p[2]);
    if (i === 0) b.moveTo(sx, sy);
    else b.lineTo(sx, sy);
  });
  b.close();
  return b.build();
}

/** How much a face of normal n faces the eye (> 0: visible). */
export function facing(v: View3q, n: V3): number {
  return n[1] * v.lift + n[2] * v.tilt;
}

/** The flat tone of a face of normal n (unit), from its base colour: top light, south mid, turned faces darker, west lit a little more than east. */
export function toneOf(base: string, n: V3): string {
  if (n[2] > 0.9) return shade(base, 0.14);
  const k = -0.1 - 0.2 * Math.abs(n[0]) + (n[0] < 0 ? 0.08 : 0) + 0.1 * Math.max(0, n[2]);
  return shade(base, k);
}

export interface SolidStyle {
  color: string;
  /** Top face colour (default: toneOf). */
  top?: string;
  /** Front (south) face colour (default: toneOf). */
  front?: string;
  line?: number;
  /** A light bevel line along the top's front edge (metal). */
  bevel?: boolean;
}

/**
 * A box of footprint len (along heading) x wid, height h, its footprint centre at (ox, oy), bottom at z.
 * heading in radians, 0 = east, pi/2 = south. Draws the visible faces; returns the top's corners.
 */
export function box(
  c: SkCanvas,
  v: View3q,
  o: { len: number; wid: number; h: number; ox?: number; oy?: number; z?: number; heading?: number; onFace?: (pts: V3[], n: V3) => void; onTop?: (pts: V3[]) => void } & SolidStyle,
): V3[] {
  const th = o.heading ?? 0;
  const fx = Math.cos(th);
  const fy = Math.sin(th);
  const lx = -fy;
  const ly = fx;
  const ox = o.ox ?? 0;
  const oy = o.oy ?? 0;
  const z0 = o.z ?? 0;
  const L = o.len / 2;
  const W = o.wid / 2;
  const foot: [number, number][] = [
    [ox + fx * L + lx * W, oy + fy * L + ly * W],
    [ox - fx * L + lx * W, oy - fy * L + ly * W],
    [ox - fx * L - lx * W, oy - fy * L - ly * W],
    [ox + fx * L - lx * W, oy + fy * L - ly * W],
  ];
  const line = o.line ?? LINE_W;
  for (let i = 0; i < 4; i++) {
    const a = foot[i];
    const b = foot[(i + 1) % 4];
    const mx = (a[0] + b[0]) / 2 - ox;
    const my = (a[1] + b[1]) / 2 - oy;
    const n = Math.hypot(mx, my) || 1;
    const nv: V3 = [mx / n, my / n, 0];
    if (facing(v, nv) <= 0.01) continue;
    const p = facePath(v, [
      [a[0], a[1], z0],
      [b[0], b[1], z0],
      [b[0], b[1], z0 + o.h],
      [a[0], a[1], z0 + o.h],
    ]);
    const frontish = nv[1] > 0.92;
    c.drawPath(p, fill(frontish && o.front ? o.front : toneOf(o.color, nv)));
    o.onFace?.(
      [
        [a[0], a[1], z0],
        [b[0], b[1], z0],
        [b[0], b[1], z0 + o.h],
        [a[0], a[1], z0 + o.h],
      ],
      nv,
    );
    if (line > 0) c.drawPath(p, stroke(YARD.ink, line));
  }
  const top: V3[] = foot.map(([x, y]) => [x, y, z0 + o.h]);
  const tp = facePath(v, top);
  c.drawPath(tp, fill(o.top ?? toneOf(o.color, [0, 0, 1])));
  o.onTop?.(top);
  if (line > 0) c.drawPath(tp, stroke(YARD.ink, line));
  if (o.bevel) {
    // The top's edge nearest the eye (largest y), drawn light just inside.
    let best = 0;
    for (let i = 0; i < 4; i++) {
      const my = (top[i][1] + top[(i + 1) % 4][1]) / 2;
      const mb = (top[best][1] + top[(best + 1) % 4][1]) / 2;
      if (my > mb) best = i;
    }
    const a = proj(v, ...top[best]);
    const b = proj(v, ...top[(best + 1) % 4]);
    c.drawPath(segment(a[0], a[1] - 1.2, b[0], b[1] - 1.2), stroke(shade(o.color, 0.55), 1));
  }
  return top;
}

/** A circle of radius r in the plane spanned by unit vectors u and w, centred at p (world), as a path. */
export function discPath(v: View3q, p: V3, u: V3, w: V3, r: number, steps = 28): SkPath {
  const b = builder();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const ca = Math.cos(a) * r;
    const sa = Math.sin(a) * r;
    const [sx, sy] = proj(v, p[0] + u[0] * ca + w[0] * sa, p[1] + u[1] * ca + w[1] * sa, p[2] + u[2] * ca + w[2] * sa);
    if (i === 0) b.moveTo(sx, sy);
    else b.lineTo(sx, sy);
  }
  b.close();
  return b.build();
}

/** An upright cylinder (axis z): body then top ellipse. Returns the top centre in points. */
export function cylinder(c: SkCanvas, v: View3q, o: { r: number; h: number; ox?: number; oy?: number; z?: number } & SolidStyle): [number, number] {
  const ox = o.ox ?? 0;
  const oy = o.oy ?? 0;
  const z0 = o.z ?? 0;
  const [cx, cyb] = proj(v, ox, oy, z0);
  const [, cyt] = proj(v, ox, oy, z0 + o.h);
  const rx = o.r * v.ppm;
  const ry = o.r * v.ppm * v.tilt;
  const line = o.line ?? LINE_W;
  const body = builder()
    .moveTo(cx - rx, cyt)
    .lineTo(cx - rx, cyb)
    .addArc({ x: cx - rx, y: cyb - ry, width: rx * 2, height: ry * 2 }, 180, -180)
    .lineTo(cx + rx, cyt)
    .close()
    .build();
  c.drawPath(body, fill(o.front ?? shade(o.color, -0.1)));
  // A darker east third: the round body turning away from the light.
  c.save();
  c.clipPath(body, ClipOp.Intersect, true);
  c.drawRect({ x: cx + rx * 0.45, y: cyt - 2, width: rx, height: cyb - cyt + ry + 4 }, fill(shade(o.color, -0.24)));
  c.drawRect({ x: cx - rx * 0.72, y: cyt, width: rx * 0.16, height: cyb - cyt + ry }, fill(shade(o.color, 0.2), 0.8));
  c.restore();
  if (line > 0) c.drawPath(body, stroke(YARD.ink, line));
  const top = oval(cx, cyt, rx, ry);
  c.drawPath(top, fill(o.top ?? shade(o.color, 0.14)));
  if (line > 0) c.drawPath(top, stroke(YARD.ink, line));
  return [cx, cyt];
}

/**
 * The flat ground shadow of a footprint: an ellipse of rx by ry metres a little east of the anchor, swept
 * east by the low sun (SUN) for a thing h metres tall (one path, so the sweep never darkens twice).
 */
export function groundShadow(c: SkCanvas, v: View3q, rx: number, ry: number, dx = 0, dy = 0, h = 0): void {
  const [x, y] = proj(v, dx + SHADOW_DX, dy + 0.04, 0);
  const RX = rx * v.ppm;
  const RY = ry * v.ppm * v.tilt;
  const b = builder().addOval({ x: x - RX, y: y - RY, width: RX * 2, height: RY * 2 });
  if (h > 0) {
    const ex = h * SUN.dx * v.ppm;
    const ey = h * SUN.dy * v.ppm * v.tilt;
    const tip = Math.min(RX, RY) * 0.8;
    b.moveTo(x, y - RY).lineTo(x + ex, y + ey - tip).lineTo(x + ex, y + ey + tip).lineTo(x, y + RY).close();
    b.addOval({ x: x + ex - tip, y: y + ey - tip, width: tip * 2, height: tip * 2 });
  }
  c.drawPath(b.build(), fill(YARD.shadow, SHADOW_ALPHA));
}

/** A rectangular ground shadow (boxes, walls), its corners rounded, swept east by the sun for height h. */
export function boxShadow(c: SkCanvas, v: View3q, w: number, d: number, dx = 0, dy = 0, h = 0): void {
  const [x, y] = proj(v, dx - w / 2 + SHADOW_DX + 0.06, dy - d / 2 + 0.06, 0);
  const W = w * v.ppm;
  const D = d * v.ppm * v.tilt;
  const r = Math.min(6, D * 0.4);
  const b = builder().addRRect({ rect: { x, y, width: W, height: D }, rx: r, ry: r });
  if (h > 0) {
    const ex = h * SUN.dx * v.ppm;
    const ey = h * SUN.dy * v.ppm * v.tilt;
    b.moveTo(x + W - 1, y + 1).lineTo(x + W + ex - 1, y + ey + 1).lineTo(x + W + ex - 1, y + D + ey - 1).lineTo(x + 1, y + D + ey - 1).lineTo(x + 1, y + D - 1).close();
    b.addRRect({ rect: { x: x + ex, y: y + ey, width: W, height: D }, rx: r, ry: r });
  }
  c.drawPath(b.build(), fill(YARD.shadow, SHADOW_ALPHA));
}

/**
 * Draws `draw` lit from one side: whatever it paints is tinted by a radial light at (lx, ly) of radius r
 * (SrcATop on a layer, so only its own pixels warm). Used for the pour's glow on the furnace hand and on
 * nearby metal.
 */
export function lit(c: SkCanvas, lx: number, ly: number, r: number, color: string, alpha: number, draw: () => void): void {
  c.saveLayer();
  draw();
  const p = radial(lx, ly, r, [color, rgba(color, 0)]);
  p.setAlphaf(alpha);
  p.setBlendMode(BlendMode.SrcATop);
  c.drawRect({ x: lx - r, y: ly - r, width: r * 2, height: r * 2 }, p);
  c.restore();
}

// ---------------------------------------------------------------------------
// Marks (sheen, wear, safety)
// ---------------------------------------------------------------------------

/** Two short parallel ticks (copper's sheen mark), at a point, size s points. */
export function ticks(c: SkCanvas, x: number, y: number, s: number, color: string = YARD.copperSheen): void {
  const p = stroke(color, Math.max(1, s * 0.22));
  c.drawPath(segment(x - s * 0.5, y + s * 0.25, x - s * 0.05, y - s * 0.35), p);
  c.drawPath(segment(x + s * 0.05, y + s * 0.4, x + s * 0.4, y - s * 0.05), p);
}

/** A four-point glint (brass's sheen mark). */
export function glint(c: SkCanvas, x: number, y: number, s: number, color = '#FFFFFF'): void {
  const k = s * 0.18;
  c.drawPath(poly([x, y - s, x + k, y - k, x + s, y, x + k, y + k, x, y + s, x - k, y + k, x - s, y, x - k, y - k]), fill(color));
}

/** Rust freckles (light iron's mark): a few irregular dots inside a rectangle of points. */
export function freckles(c: SkCanvas, x: number, y: number, w: number, h: number, seed: number, color: string = YARD.rust, n = 6): void {
  for (let i = 0; i < n; i++) {
    const px = x + hash01(seed, i, 1) * w;
    const py = y + hash01(seed, i, 2) * h;
    const r = 0.5 + hash01(seed, i, 3) * 1.0;
    c.drawPath(oval(px, py, r * 1.3, r), fill(color, 0.75));
  }
}

/** Yellow-and-ink hazard stripes filling a path (diagonal, 45 degrees). */
export function hazard(c: SkCanvas, p: SkPath, gap = 5, line = LINE_W): void {
  const b = p.computeTightBounds();
  c.save();
  c.clipPath(p, ClipOp.Intersect, true);
  c.drawPath(p, fill(YARD.hivis));
  const s = butt(YARD.ink, gap * 0.95);
  for (let x = b.x - b.height - gap; x < b.x + b.width + gap; x += gap * 2) c.drawPath(segment(x, b.y + b.height + 2, x + b.height + 4, b.y - 2), s);
  c.restore();
  if (line > 0) c.drawPath(p, stroke(YARD.ink, line));
}

/** Translate, draw, restore. */
export function at(c: SkCanvas, x: number, y: number, draw: () => void, scale = 1): void {
  c.save();
  c.translate(x, y);
  if (scale !== 1) c.scale(scale, scale);
  draw();
  c.restore();
}

/** Draw mirrored left-right about x = 0 (a west-facing pose from an east-facing one). */
export function mirrored(c: SkCanvas, draw: () => void): void {
  c.save();
  c.scale(-1, 1);
  draw();
  c.restore();
}

/** A point inside a quad of world points by its (s, t) in 0..1 (s along a->b, t along a->d). */
export function quadAt(q: V3[], s: number, t: number): V3 {
  const [a, b, , d] = q;
  return [a[0] + (b[0] - a[0]) * s + (d[0] - a[0]) * t, a[1] + (b[1] - a[1]) * s + (d[1] - a[1]) * t, a[2] + (b[2] - a[2]) * s + (d[2] - a[2]) * t];
}

/** The sub-quad of a quad between s0..s1 and t0..t1. */
export function subQuad(q: V3[], s0: number, s1: number, t0: number, t1: number): V3[] {
  return [quadAt(q, s0, t0), quadAt(q, s1, t0), quadAt(q, s1, t1), quadAt(q, s0, t1)];
}

/** A face given by its south-west, south-east... corners in the order box() hands them (bottom a, bottom b, top b, top a). */
export function faceFill(c: SkCanvas, v: View3q, pts: V3[], color: string, line = 0, alpha = 1): void {
  const p = facePath(v, pts);
  c.drawPath(p, fill(color, alpha));
  if (line > 0) c.drawPath(p, stroke(YARD.ink, line));
}
