/**
 * The drawing kit behind every code-drawn character and prop.
 *
 * Art is drawn once, imperatively, into Skia pictures (`record`), then the
 * scene only moves those pictures around with matrices. That keeps a rich
 * drawing (outline, fill, shade, highlight) down to one scene-graph node and
 * leaves nothing to compute per frame except transforms.
 *
 * The look, shared by everything here so it sits next to the painted icons:
 * a thick warm dark-brown outline, a flat fill, one soft shade on the lower
 * right and one glossy highlight on the upper left.
 */
import {
  BlurStyle,
  ClipOp,
  PaintStyle,
  PathOp,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkColor,
  type SkPaint,
  type SkPath,
  type SkPathBuilder,
  type SkPicture,
} from '@shopify/react-native-skia';

export const OUTLINE = '#4A2C17';

// ---------------------------------------------------------------------------
// Colour helpers (plain functions; safe anywhere, including outside Skia)
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

export function toRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export function toHex([r, g, b]: RGB): string {
  return '#' + ((1 << 24) | (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b)).toString(16).slice(1).toUpperCase();
}

/** Linear mix of two #RRGGBB colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Adds alpha to a #RRGGBB colour. */
export function alpha(hex: string, a: number): string {
  const v = clamp255(a * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.slice(0, 7) + v;
}

export function luma(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function toHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * The one soft shade of a fill: darker, a little richer, and pushed towards
 * the warm side (yellows go orange, like the painted icons) rather than grey.
 */
export function shadeOf(hex: string, amount = 1): string {
  const [h, s, l] = toHsl(toRgb(hex));
  // Yellow to orange hues shade towards red; everything else keeps its hue.
  const warm = h > 18 && h < 75;
  const nh = warm ? h - 9 * amount : h;
  const ns = Math.min(1, s * (1 + 0.12 * amount) + (s < 0.08 ? 0.05 * amount : 0.03 * amount));
  const nl = Math.max(0, l - (0.085 + l * 0.085) * amount);
  // Near-neutral fills (white aprons, steel) get a warm grey so they never look dirty-blue.
  const tinted = s < 0.08 ? fromHsl(28, 0.22, nl) : fromHsl(nh, ns, nl);
  return toHex(tinted);
}

/** The glossy highlight of a fill. */
export function lightOf(hex: string, amount = 1): string {
  const [h, s, l] = toHsl(toRgb(hex));
  const nl = l + (1 - l) * 0.5 * amount;
  return toHex(fromHsl(h + (h > 18 && h < 75 ? 6 * amount : 0), s * (1 - 0.15 * amount), nl));
}

/** A colour for outlines that still reads when the fill itself is very dark. */
export function outlineFor(fill: string, outline: string): string {
  return luma(fill) < luma(outline) + 0.06 ? mix(fill, '#000000', 0.55) : outline;
}

const colorCache = new Map<string, SkColor>();
export function skColor(c: string): SkColor {
  let v = colorCache.get(c);
  if (!v) {
    v = Skia.Color(c);
    if (colorCache.size > 4000) colorCache.clear();
    colorCache.set(c, v);
  }
  return v;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Objects to free once the current recording is finished (matters on web, where WASM memory is not garbage collected). */
let trash: { dispose(): void }[] | null = null;

function track<T extends { dispose(): void }>(obj: T): T {
  if (trash) trash.push(obj);
  return obj;
}

export type Pt = readonly [number, number];
/** A point with an optional third value: 0 makes it a sharp corner in `blob` and `curve`. */
export type BlobPt = readonly [number, number, number?];

export const builder = (): SkPathBuilder => Skia.PathBuilder.Make();
export const done = (b: SkPathBuilder): SkPath => {
  const p = track(b.build());
  b.dispose();
  return p;
};

const R = (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h });

export function circle(cx: number, cy: number, r: number): SkPath {
  return done(builder().addCircle(cx, cy, r));
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, rotDeg = 0): SkPath {
  const b = builder().addOval(R(cx - rx, cy - ry, rx * 2, ry * 2));
  if (rotDeg !== 0) {
    const m = Skia.Matrix();
    m.translate(cx, cy);
    m.rotate((rotDeg * Math.PI) / 180);
    m.translate(-cx, -cy);
    b.transform(m);
  }
  return done(b);
}

export function rrect(x: number, y: number, w: number, h: number, r: number): SkPath {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return done(builder().addRRect({ rect: R(x, y, w, h), rx: rr, ry: rr }));
}

/** A rounded rectangle with a different radius per corner: top-left, top-right, bottom-right, bottom-left. */
export function rrect4(x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): SkPath {
  const b = builder();
  b.moveTo(x + tl, y);
  b.lineTo(x + w - tr, y);
  b.quadTo(x + w, y, x + w, y + tr);
  b.lineTo(x + w, y + h - br);
  b.quadTo(x + w, y + h, x + w - br, y + h);
  b.lineTo(x + bl, y + h);
  b.quadTo(x, y + h, x, y + h - bl);
  b.lineTo(x, y + tl);
  b.quadTo(x, y, x + tl, y);
  b.close();
  return done(b);
}

export function poly(pts: readonly Pt[], close = true): SkPath {
  const b = builder();
  pts.forEach(([x, y], i) => (i === 0 ? b.moveTo(x, y) : b.lineTo(x, y)));
  if (close) b.close();
  return done(b);
}

export function line(x0: number, y0: number, x1: number, y1: number): SkPath {
  return done(builder().moveTo(x0, y0).lineTo(x1, y1));
}

/** A thick line with round ends, as a closed shape (so it can be outlined). */
export function capsule(x0: number, y0: number, x1: number, y1: number, r: number): SkPath {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * r;
  const ny = (dx / len) * r;
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const b = builder();
  b.moveTo(x0 + nx, y0 + ny);
  b.lineTo(x1 + nx, y1 + ny);
  b.arcToOval(R(x1 - r, y1 - r, r * 2, r * 2), deg + 90, -180, false);
  b.lineTo(x0 - nx, y0 - ny);
  b.arcToOval(R(x0 - r, y0 - r, r * 2, r * 2), deg - 90, -180, false);
  b.close();
  return done(b);
}

function spline(b: SkPathBuilder, pts: readonly BlobPt[], closed: boolean, k: number) {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const sharp = (i: number) => at(i)[2] === 0;
  b.moveTo(pts[0][0], pts[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = sharp(i) ? p1[0] : p1[0] + ((p2[0] - p0[0]) * k) / 6;
    const c1y = sharp(i) ? p1[1] : p1[1] + ((p2[1] - p0[1]) * k) / 6;
    const c2x = sharp(i + 1) ? p2[0] : p2[0] - ((p3[0] - p1[0]) * k) / 6;
    const c2y = sharp(i + 1) ? p2[1] : p2[1] - ((p3[1] - p1[1]) * k) / 6;
    b.cubicTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (closed) b.close();
}

/** A closed, smooth shape through the given points (Catmull-Rom). `k` above 1 is rounder, below 1 tighter. */
export function blob(pts: readonly BlobPt[], k = 1): SkPath {
  const b = builder();
  spline(b, pts, true, k);
  return done(b);
}

/** An open smooth curve through the given points. */
export function curve(pts: readonly BlobPt[], k = 1): SkPath {
  const b = builder();
  spline(b, pts, false, k);
  return done(b);
}

/** A circular arc as an open path. Angles in degrees, 0 = right, clockwise. */
export function arc(cx: number, cy: number, rx: number, ry: number, startDeg: number, sweepDeg: number): SkPath {
  return done(builder().addArc(R(cx - rx, cy - ry, rx * 2, ry * 2), startDeg, sweepDeg));
}

/** A star / sparkle with `n` points. `inner` is the inner radius as a share of `r`. */
export function star(cx: number, cy: number, r: number, n = 4, inner = 0.4, rotDeg = -90): SkPath {
  const b = builder();
  for (let i = 0; i < n * 2; i++) {
    const a = (rotDeg * Math.PI) / 180 + (i * Math.PI) / n;
    const rr = i % 2 === 0 ? r : r * inner;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) b.moveTo(x, y);
    else b.lineTo(x, y);
  }
  b.close();
  return done(b);
}

/** A sparkle with curved-in sides (the classic four-point twinkle). */
export function twinkle(cx: number, cy: number, r: number, pinch = 0.18): SkPath {
  const b = builder();
  const q = r * pinch;
  b.moveTo(cx, cy - r);
  b.quadTo(cx + q, cy - q, cx + r, cy);
  b.quadTo(cx + q, cy + q, cx, cy + r);
  b.quadTo(cx - q, cy + q, cx - r, cy);
  b.quadTo(cx - q, cy - q, cx, cy - r);
  b.close();
  return done(b);
}

export function heart(cx: number, cy: number, s: number): SkPath {
  const b = builder();
  b.moveTo(cx, cy + s * 0.9);
  b.cubicTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.8, cy - s * 1.2, cx, cy - s * 0.4);
  b.cubicTo(cx + s * 0.8, cy - s * 1.2, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9);
  b.close();
  return done(b);
}

export function translated(path: SkPath, dx: number, dy: number): SkPath {
  return done(Skia.PathBuilder.MakeFromPath(path).offset(dx, dy));
}

/** Combines closed shapes into one path (overlaps stay filled). */
export function union(...paths: SkPath[]): SkPath {
  const b = builder();
  paths.forEach((p) => b.addPath(p));
  return done(b);
}

export function op(a: SkPath, b: SkPath, kind: PathOp): SkPath | null {
  const r = Skia.Path.MakeFromOp(a, b, kind);
  return r ? track(r) : null;
}

/** One outline around several overlapping shapes. */
export function merged(...paths: SkPath[]): SkPath {
  let acc = paths[0];
  for (let i = 1; i < paths.length; i++) acc = op(acc, paths[i], PathOp.Union) ?? acc;
  return acc;
}

/** What is left of `path` when a copy shifted by (dx, dy) is cut out: a crescent on the side opposite the shift. */
export function crescent(path: SkPath, dx: number, dy: number): SkPath | null {
  return op(path, translated(path, dx, dy), PathOp.Difference);
}

// ---------------------------------------------------------------------------
// The pen
// ---------------------------------------------------------------------------

export interface ShapeOpts {
  /** Outline width; 0 for none. Defaults to the pen's width. */
  ow?: number;
  /** Outline colour override. */
  outline?: string;
  /** Shade crescent size in units (lower right); 0 or false for a flat fill. Default: automatic. */
  shade?: number | false;
  /** Shade colour override. */
  shadeColor?: string;
  /** Highlight crescent size in units (upper left). Default: none. */
  light?: number | false;
  lightColor?: string;
}

/** A box in drawing units: left, top, right, bottom. */
export interface Bounds {
  l: number;
  t: number;
  r: number;
  b: number;
}

export const emptyBounds = (): Bounds => ({ l: Infinity, t: Infinity, r: -Infinity, b: -Infinity });

export class Pen {
  readonly c: SkCanvas;
  outline: string;
  ow: number;
  /**
   * Set to a box to have everything drawn from then on grow it (used to frame
   * portraits around whatever hair and hat a look has); null to stop measuring.
   */
  box: Bounds | null = null;
  /** While measuring: nothing above this y counts (hair hidden under a hat). */
  boxTop: number | null = null;
  private pf: SkPaint;
  private ps: SkPaint;

  constructor(canvas: SkCanvas, outline = OUTLINE, ow = 3.4) {
    this.c = canvas;
    this.outline = outline;
    this.ow = ow;
    this.pf = Skia.Paint();
    this.pf.setAntiAlias(true);
    this.pf.setStyle(PaintStyle.Fill);
    this.ps = Skia.Paint();
    this.ps.setAntiAlias(true);
    this.ps.setStyle(PaintStyle.Stroke);
    this.ps.setStrokeJoin(StrokeJoin.Round);
    this.ps.setStrokeCap(StrokeCap.Round);
  }

  dispose() {
    this.pf.dispose();
    this.ps.dispose();
  }

  /**
   * Everything drawn so far, in the picture's own units, always measured (unlike `box`, no top cut):
   * `record` keeps it with the picture so the picture can later be turned into an image that fits it.
   */
  readonly extent: Bounds = emptyBounds();
  /** The current transform (a, b, tx, c, d, ty), tracked here so measuring needs no call into Skia. */
  private m: number[] = [1, 0, 0, 0, 1, 0];

  /** Grows the boxes by a rectangle given in the current (possibly moved or rotated) coordinates. */
  private grow(x0: number, y0: number, x1: number, y1: number) {
    const m = this.m;
    const e = this.extent;
    const box = this.box;
    const top = this.boxTop;
    for (let i = 0; i < 4; i++) {
      const x = i & 1 ? x1 : x0;
      const y = i & 2 ? y1 : y0;
      const X = m[0] * x + m[1] * y + m[2];
      const Y = m[3] * x + m[4] * y + m[5];
      if (X < e.l) e.l = X;
      if (X > e.r) e.r = X;
      if (Y < e.t) e.t = Y;
      if (Y > e.b) e.b = Y;
    }
    if (!box) return;
    if (top !== null) {
      if (y1 <= top) return;
      if (y0 < top) y0 = top;
    }
    for (let i = 0; i < 4; i++) {
      const x = i & 1 ? x1 : x0;
      const y = i & 2 ? y1 : y0;
      const X = m[0] * x + m[1] * y + m[2];
      const Y = m[3] * x + m[4] * y + m[5];
      if (X < box.l) box.l = X;
      if (X > box.r) box.r = X;
      if (Y < box.t) box.t = Y;
      if (Y > box.b) box.b = Y;
    }
  }

  private growPath(path: SkPath, pad: number) {
    const b = path.computeTightBounds();
    this.grow(b.x - pad, b.y - pad, b.x + b.width + pad, b.y + b.height + pad);
  }

  /** Flat fill. */
  fill(path: SkPath, color: string) {
    this.pf.setColor(skColor(color));
    this.c.drawPath(path, this.pf);
    this.growPath(path, 0);
  }

  /** Stroke with round caps and joins. */
  stroke(path: SkPath, color: string, width: number, butt = false) {
    this.ps.setColor(skColor(color));
    this.ps.setStrokeWidth(width);
    this.ps.setStrokeCap(butt ? StrokeCap.Butt : StrokeCap.Round);
    this.c.drawPath(path, this.ps);
    this.growPath(path, width / 2);
  }

  /** A detail line in the outline colour. */
  ink(path: SkPath, width = this.ow * 0.7, color = this.outline) {
    this.stroke(path, color, width);
  }

  /** The house style in one call: fill, soft shade, optional highlight, thick outline. */
  shape(path: SkPath, color: string, o: ShapeOpts = {}) {
    const ow = o.ow ?? this.ow;
    this.fill(path, color);
    if (o.shade !== false && o.shade !== 0) {
      const s = o.shade ?? this.ow * 0.95;
      const cut = crescent(path, -s, -s * 0.85);
      if (cut) this.fill(cut, o.shadeColor ?? shadeOf(color));
    }
    if (o.light) {
      const cut = crescent(path, o.light, o.light * 0.85);
      if (cut) this.fill(cut, o.lightColor ?? lightOf(color));
    }
    if (ow > 0) this.stroke(path, o.outline ?? outlineFor(color, this.outline), ow);
  }

  /** A small glossy mark: a short fat stroke in a lighter tone. */
  shine(path: SkPath, color: string, width: number, a = 0.85) {
    this.stroke(path, alpha(color, a), width);
  }

  dot(cx: number, cy: number, r: number, color: string) {
    this.pf.setColor(skColor(color));
    this.c.drawCircle(cx, cy, r, this.pf);
    this.grow(cx - r, cy - r, cx + r, cy + r);
  }

  /** A soft blurred blob (glows, soft shadows). */
  glow(path: SkPath, color: string, sigma: number) {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(skColor(color));
    const mf = Skia.MaskFilter.MakeBlur(BlurStyle.Normal, sigma, true);
    p.setMaskFilter(mf);
    this.c.drawPath(path, p);
    this.growPath(path, sigma * 2);
    track(mf);
    track(p);
  }

  /** Fill with a vertical or diagonal two-colour gradient. */
  gradient(path: SkPath, x0: number, y0: number, x1: number, y1: number, colors: string[], pos: number[] | null = null) {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    const sh = Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, colors.map(skColor), pos, TileMode.Clamp);
    p.setShader(sh);
    this.c.drawPath(path, p);
    this.growPath(path, 0);
    track(sh);
    track(p);
  }

  radial(path: SkPath, cx: number, cy: number, r: number, colors: string[], pos: number[] | null = null) {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    const sh = Skia.Shader.MakeRadialGradient({ x: cx, y: cy }, r, colors.map(skColor), pos, TileMode.Clamp);
    p.setShader(sh);
    this.c.drawPath(path, p);
    this.growPath(path, 0);
    track(sh);
    track(p);
  }

  /** Runs `fn` with the canvas moved, rotated (degrees) and scaled. */
  at(x: number, y: number, fn: () => void, rotDeg = 0, sx = 1, sy = sx) {
    this.c.save();
    this.c.translate(x, y);
    if (rotDeg !== 0) this.c.rotate(rotDeg, 0, 0);
    if (sx !== 1 || sy !== 1) this.c.scale(sx, sy);
    const outer = this.m;
    const [a, b, tx, c, d, ty] = outer;
    const r = (rotDeg * Math.PI) / 180;
    const cs = Math.cos(r);
    const sn = Math.sin(r);
    // outer * translate(x, y) * rotate(r) * scale(sx, sy)
    this.m = [(a * cs + b * sn) * sx, (-a * sn + b * cs) * sy, a * x + b * y + tx, (c * cs + d * sn) * sx, (-c * sn + d * cs) * sy, c * x + d * y + ty];
    try {
      fn();
    } finally {
      this.m = outer;
      this.c.restore();
    }
  }

  /** Runs `fn` clipped to `path`. Used sparingly: clips are replayed every frame. */
  clipped(path: SkPath, fn: () => void) {
    this.c.save();
    this.c.clipPath(path, ClipOp.Intersect, true);
    fn();
    this.c.restore();
  }
}

/** Half-size of the square every picture is recorded in, in its own units. */
const BOUNDS = 640;

const BOUNDS_OF = new WeakMap<SkPicture, Bounds>();

/**
 * What a recorded picture covers, in its own units, measured while it was drawn (strokes and blurs
 * included; anything clipped away may still count). Undefined for a picture `record` did not make.
 */
export function pictureBounds(picture: SkPicture): Bounds | undefined {
  return BOUNDS_OF.get(picture);
}

/** Records a drawing into a picture. Everything built with the path helpers inside `draw` is freed afterwards. */
export function record(draw: (pen: Pen) => void, outline = OUTLINE, ow = 3.4): SkPicture {
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(R(-BOUNDS, -BOUNDS, BOUNDS * 2, BOUNDS * 2));
  const outer = trash;
  const mine: { dispose(): void }[] = [];
  trash = mine;
  const pen = new Pen(canvas, outline, ow);
  let picture: SkPicture;
  try {
    draw(pen);
  } finally {
    picture = rec.finishRecordingAsPicture();
    const e = pen.extent;
    if (Number.isFinite(e.l)) BOUNDS_OF.set(picture, { l: e.l, t: e.t, r: e.r, b: e.b });
    trash = outer;
    for (const t of mine) t.dispose();
    pen.dispose();
    rec.dispose();
  }
  return picture;
}

/** Deterministic pseudo-random numbers from a seed (mulberry32). */
export function rng(seed: number): () => number {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit hash of a string. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
