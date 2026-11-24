/**
 * The cast's drawing kit (office-design.md 1.2, 4.6, 7.3): a thin warm-brown ink line of varying
 * width, one-direction hatching, two flat washes. Pure Skia (no React, no Reanimated), so it runs in
 * the app and in Node (scripts/art/decree-faces.ts) alike.
 *
 * The baize-and-ink tokens the cast uses come from the kit's palette (`../palette`, the props
 * package's file); the cast's own colours (skin tones, hair, cloth) live here, because they are
 * parameters of the bust part system and nothing else draws people.
 */
import { BlendMode, ClipOp, PaintStyle, PathOp, Skia, StrokeCap, StrokeJoin, type SkCanvas, type SkPaint, type SkPath, type SkPathBuilder, type SkRect } from '@shopify/react-native-skia';
import { DESK } from '../palette';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The kit's tokens the cast draws with (spec 4.6). */
export const P = {
  baize: DESK.baize,
  walnut: DESK.walnut,
  paper: DESK.paper,
  violet: DESK.violet,
  slate: DESK.slate,
  brass: DESK.brass,
  brassDeep: DESK.brassDeep,
  chalk: DESK.chalk,
  chalkLine: DESK.chalkLine,
  /** The warm-brown drawing ink of every person (never black): the kit's line, a touch warmer. */
  ink: '#46301F',
  /**
   * The ink of the face's features (eyes, brows, nose, mouth, glasses): the same warm brown, pressed
   * harder, on EVERY tone. With the pale under-stroke (`halo`) every feature reaches 3:1 against
   * every skin tone (faces.test.ts measures it): dark on the light tones, rimmed in pale on the deep
   * ones. One colour and one rim for everyone; nothing is chosen by tone.
   */
  feature: '#26170D',
  /** The pale under-stroke of every feature line (a 1-unit rim, drawn first, on every tone). */
  halo: '#F8F3EA',
  haloAlpha: 0.72,
  /** The photograph's ground inside the oval: the paper, a shade cooler. */
  photo: '#DCE2DF',
  photoShade: '#C9D1CF',
  white: '#FFFFFF',
} as const;

/**
 * Skin tones: a palette parameter, independent of every feature part (spec 7.3). Each tone is two
 * flat washes (base and a deeper second wash for the ear and lip lines); shading is hatching in
 * the same ink on every tone. Ordered light to deep.
 */
export const TONES = [
  { id: 't1', base: '#F3DCC8', deep: '#E2C1A8' },
  { id: 't2', base: '#EBC6A4', deep: '#D7A985' },
  { id: 't3', base: '#D9A87F', deep: '#C08C64' },
  { id: 't4', base: '#BC8A62', deep: '#A2724D' },
  { id: 't5', base: '#996748', deep: '#80543A' },
  { id: 't6', base: '#7C5239', deep: '#69442E' },
] as const;
export type ToneId = (typeof TONES)[number]['id'];
export const TONE_IDS: readonly ToneId[] = TONES.map((t) => t.id);
export function toneOf(id: ToneId): (typeof TONES)[number] {
  return TONES.find((t) => t.id === id) ?? TONES[0];
}

/** Hair colours (a parameter of its own, never derived from tone). */
export const HAIR = {
  black: '#2E2622',
  brown: '#5C3E2C',
  chestnut: '#7E4B2E',
  auburn: '#9A5634',
  sandy: '#C29A62',
  fair: '#DCC08A',
  grey: '#A3A29C',
  white: '#E6E3DC',
} as const;
export type HairColour = keyof typeof HAIR;

/** Cloth: the garment's wash. Muted, from the baize-and-ink family and the clubs' two-tone colours. */
export const CLOTH = {
  slate: '#6C7A89',
  navy: '#3E4A63',
  walnut: '#6B4A33',
  baize: '#3F6152',
  violet: '#6A5191',
  plum: '#7D4E6B',
  terracotta: '#B5704F',
  sage: '#8FA37F',
  slateBlue: '#5E7FA3',
  copper: '#A9683A',
  ochre: '#C29A45',
  dove: '#B9BCB8',
  charcoal: '#45474A',
  cream: '#E9E2D0',
  moss: '#6F7445',
  teal: '#3F7A78',
} as const;
export type Cloth = keyof typeof CLOTH;

export function parse(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length >= 8 ? n(6) / 255 : 1];
}
function hex2(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
}
export function toHex(r: number, g: number, b: number, a = 1): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a * 255) : ''}`;
}
export function alpha(hex: string, a: number): string {
  const [r, g, b] = parse(hex);
  return toHex(r, g, b, Math.max(0, Math.min(0.999, a)));
}
export function mix(a: string, b: string, t: number): string {
  const p = parse(a);
  const q = parse(b);
  return toHex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t);
}
/** Rec. 709 luminance 0..255. */
export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const GREY_MATRIX = [0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0, 0, 0, 1, 0];

/**
 * A colour matrix that turns a picture into one ink colour on paper (the Office wall's portraits):
 * luminance 0 gives `inkHex`, 255 gives `paperHex`. Translation terms are normalised (0..1).
 */
export function duotoneMatrix(inkHex: string, paperHex: string): number[] {
  const i = parse(inkHex);
  const p = parse(paperHex);
  const row = (k: number) => {
    const d = (p[k] - i[k]) / 255;
    return [0.2126 * d, 0.7152 * d, 0.0722 * d, 0, i[k] / 255];
  };
  return [...row(0), ...row(1), ...row(2), 0, 0, 0, 1, 0];
}

// ---------------------------------------------------------------------------
// Paints and paths
// ---------------------------------------------------------------------------

export function fill(color: string): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  return p;
}

export function stroke(color: string, width: number): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setColor(Skia.Color(color));
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  return p;
}

export function builder(): SkPathBuilder {
  return Skia.PathBuilder.Make();
}

export function poly(pts: number[], close = true): SkPath {
  const b = builder();
  b.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) b.lineTo(pts[i], pts[i + 1]);
  if (close) b.close();
  return b.build();
}

export function oval(cx: number, cy: number, rx: number, ry: number): SkPath {
  return builder().addOval({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }).build();
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

/** An open arc, degrees (0 = right, clockwise). */
export function arc(cx: number, cy: number, rx: number, ry: number, startDeg: number, sweepDeg: number): SkPath {
  return builder().addArc({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }, startDeg, sweepDeg).build();
}

type Pt = [number, number];

/** A smooth closed shape through points (Catmull-Rom). */
export function blob(pts: Pt[], tension = 1): SkPath {
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
export function curve(pts: Pt[], tension = 1): SkPath {
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

/** Mirror points about x = cx: [left half from top to bottom] -> a symmetric closed shape. */
export function mirrored(cx: number, half: Pt[], tension = 1): SkPath {
  const right = half.map(([x, y]) => [cx + (cx - x), y] as Pt).reverse();
  return blob([...half, ...right], tension);
}

export function union(...paths: SkPath[]): SkPath {
  let out = paths[0];
  for (let i = 1; i < paths.length; i++) out = Skia.Path.MakeFromOp(out, paths[i], PathOp.Union) ?? out;
  return out;
}

export function intersect(a: SkPath, b: SkPath): SkPath {
  return Skia.Path.MakeFromOp(a, b, PathOp.Intersect) ?? a;
}

export function clip(c: SkCanvas, path: SkPath): void {
  c.clipPath(path, ClipOp.Intersect, true);
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

/**
 * Draws `draw` through a colour matrix (greyscale, duotone). Give `bounds` (local units) whenever
 * the drawing is small on a large canvas: a layer without bounds is the whole canvas.
 */
export function filtered(c: SkCanvas, matrix: number[], draw: (c: SkCanvas) => void, bounds?: SkRect): void {
  const p = Skia.Paint();
  p.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));
  c.saveLayer(p, bounds ?? null);
  draw(c);
  c.restore();
}


// ---------------------------------------------------------------------------
// The pen: line of varying width, washes, hatching
// ---------------------------------------------------------------------------

/** Line width of the ink at the bust's design size (100 units wide). */
export const LINE = 1.15;

/** The drawing context of one person: their ink, and whether hatching is drawn (cut-outs are flat). */
export interface Pen {
  ink: string;
  hatch: boolean;
  /** Line width multiplier (the cut-outs draw a little heavier). */
  weight: number;
  /**
   * The edge pass of a cut-out: every wash and line is drawn in this one colour, grown by `grow`
   * units, so the figure stands on a paper margin (far cheaper than a dilate filter).
   */
  edge?: { color: string; grow: number };
}

export const DEFAULT_PEN: Pen = { ink: P.ink, hatch: true, weight: 1 };

/**
 * The ink line of varying width: the path stroked thin, then again shifted down-right, so the
 * lines on the shadow side (right, below) swell and those on the lit side stay hair-thin, like a
 * dip pen pressed on the down-stroke.
 */
export function ink(c: SkCanvas, pen: Pen, path: SkPath, w = LINE): void {
  const ww = w * pen.weight;
  if (pen.edge) {
    c.drawPath(path, stroke(pen.edge.color, ww + pen.edge.grow * 2));
    return;
  }
  c.drawPath(path, stroke(pen.ink, ww * 0.62));
  c.save();
  c.translate(ww * 0.42, ww * 0.38);
  c.drawPath(path, stroke(pen.ink, ww * 0.62));
  c.restore();
}

/** A flat wash with its ink outline. */
export function wash(c: SkCanvas, pen: Pen, path: SkPath, color: string, w = LINE): void {
  if (pen.edge) {
    c.drawPath(path, fill(pen.edge.color));
    c.drawPath(path, stroke(pen.edge.color, w * pen.weight + pen.edge.grow * 2));
    return;
  }
  c.drawPath(path, fill(color));
  if (w > 0) ink(c, pen, path, w);
}

/** Hatching angle: every hatch line of every drawing runs the same way (lower left to upper right). */
export const HATCH_DEG = -55;
export const HATCH_GAP = 2.4;

/**
 * One-direction hatching inside `region` (and inside `within`, if given): parallel thin ink lines at
 * HATCH_DEG, `gap` apart. The shading of every person; never cross-hatched.
 */
export function hatch(c: SkCanvas, pen: Pen, region: SkPath, opts: { gap?: number; a?: number; w?: number; within?: SkPath } = {}): void {
  if (!pen.hatch) return;
  const gap = opts.gap ?? HATCH_GAP;
  const b = region.computeTightBounds();
  c.save();
  clip(c, region);
  if (opts.within) clip(c, opts.within);
  const p = stroke(alpha(pen.ink, opts.a ?? 0.55), (opts.w ?? 0.45) * pen.weight);
  p.setStrokeCap(StrokeCap.Butt);
  const rad = (HATCH_DEG * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const R = Math.hypot(b.width, b.height) / 2 + 2;
  const hb = builder();
  for (let t = -R; t <= R; t += gap) {
    // A line through (cx, cy) + t * normal, along the hatch direction.
    const nx = cx - dy * t;
    const ny = cy + dx * t;
    hb.moveTo(nx - dx * R, ny - dy * R).lineTo(nx + dx * R, ny + dy * R);
  }
  c.drawPath(hb.build(), p);
  c.restore();
}

/** The area right of a vertical-ish curve through x0 at the top and x1 at the bottom (shadow sides). */
export function sideOf(x0: number, x1: number, y0: number, y1: number, right = true, bulge = 0): SkPath {
  const far = right ? 400 : -400;
  const midX = (x0 + x1) / 2 + bulge;
  return builder()
    .moveTo(x0, y0)
    .quadTo(midX, (y0 + y1) / 2, x1, y1)
    .lineTo(far, y1)
    .lineTo(far, y0)
    .close()
    .build();
}

/** Below a line (y at x = -inf ... x = +inf), as a region. */
export function below(y: number): SkPath {
  return poly([-400, y, 400, y, 400, 400, -400, 400]);
}
