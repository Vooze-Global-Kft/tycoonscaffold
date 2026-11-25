/**
 * PLACEHOLDER drawings of the yard's sprites: flat shapes with labels, honestly placeholders (boxes for
 * wrecks, a box with a hopper for the machine, a pawn for a person, a box on wheels for the truck). The
 * art package replaces this file; the atlas (./atlas.ts) keeps its sprite names and anchors.
 *
 * Every drawing is in points with its ANCHOR at the origin: the centre of the thing's footprint on the
 * ground. The three-quarter view (./yard.ts "COORDINATES"): a ground offset (x, y) metres draws at
 * (x * ppm, y * ppm * tilt), a height h metres `h * ppm * lift` points up. Pure Skia (no React, no
 * Reanimated): runs in the app and, with CanvasKit, in node.
 */
import { PaintStyle, Skia, StrokeCap, StrokeJoin, type SkCanvas, type SkPaint } from '@shopify/react-native-skia';

/** The view a drawing is made for (./yard.ts YardLayout's numbers). */
export interface View3q {
  ppm: number;
  tilt: number;
  lift: number;
}

export const INK = '#2B2622';

export function fill(color: string, alpha = 1): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  if (alpha < 1) p.setAlphaf(alpha);
  return p;
}

export function stroke(color: string, width: number, alpha = 1): SkPaint {
  const p = fill(color, alpha);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  return p;
}

/** A colour lighter (k > 0) or darker (k < 0), by mixing with white or black. */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k)));
  return '#' + ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

const builder = () => Skia.PathBuilder.Make();

/** A soft ground shadow: an ellipse of rx by ry metres on the ground. */
export function shadow(c: SkCanvas, v: View3q, rx: number, ry: number, dx = 0, dy = 0): void {
  const w = rx * v.ppm;
  const h = ry * v.ppm * v.tilt;
  c.drawOval({ x: dx * v.ppm - w, y: dy * v.ppm * v.tilt - h, width: w * 2, height: h * 2 }, fill('#000000', 0.22));
}

/**
 * A box standing on the ground: footprint `len` metres along `heading` (radians, 0 = east, y south) by
 * `wid` across, `h` metres high, its footprint centre at ground offset (ox, oy) metres and its bottom
 * `z` metres above the ground. Draws the sides that face the viewer, then the top. Returns the top's
 * screen centre (points) for a label.
 */
export function prism(c: SkCanvas, v: View3q, o: { len: number; wid: number; h: number; heading?: number; ox?: number; oy?: number; z?: number; color: string; line?: number }): { x: number; y: number } {
  const th = o.heading ?? 0;
  const fx = Math.cos(th);
  const fy = Math.sin(th);
  const lx = -fy;
  const ly = fx;
  const ox = o.ox ?? 0;
  const oy = o.oy ?? 0;
  const z = o.z ?? 0;
  const L = o.len / 2;
  const W = o.wid / 2;
  // Footprint corners in world metres, counter-clockwise on screen.
  const cw = [
    [ox + fx * L + lx * W, oy + fy * L + ly * W],
    [ox - fx * L + lx * W, oy - fy * L + ly * W],
    [ox - fx * L - lx * W, oy - fy * L - ly * W],
    [ox + fx * L - lx * W, oy + fy * L - ly * W],
  ];
  const X = (p: number[]) => p[0] * v.ppm;
  const Y = (p: number[], up: number) => p[1] * v.ppm * v.tilt - up * v.ppm * v.lift;
  const line = stroke(INK, o.line ?? 1.2);
  // The sides facing the viewer (outward normal pointing south, +y).
  const cx = ox;
  const cy = oy;
  for (let i = 0; i < 4; i++) {
    const a = cw[i];
    const b = cw[(i + 1) % 4];
    const mx = (a[0] + b[0]) / 2 - cx;
    const my = (a[1] + b[1]) / 2 - cy;
    const n = Math.hypot(mx, my) || 1;
    const ny = my / n;
    const nx = mx / n;
    if (ny <= 0.02) continue;
    const p = builder()
      .moveTo(X(a), Y(a, z))
      .lineTo(X(b), Y(b, z))
      .lineTo(X(b), Y(b, z + o.h))
      .lineTo(X(a), Y(a, z + o.h))
      .close()
      .build();
    c.drawPath(p, fill(shade(o.color, -0.28 + 0.12 * nx)));
    c.drawPath(p, line);
  }
  const top = builder();
  cw.forEach((p, i) => (i === 0 ? top.moveTo(X(p), Y(p, z + o.h)) : top.lineTo(X(p), Y(p, z + o.h))));
  top.close();
  const tp = top.build();
  c.drawPath(tp, fill(shade(o.color, 0.12)));
  c.drawPath(tp, line);
  return { x: ox * v.ppm, y: oy * v.ppm * v.tilt - (z + o.h) * v.ppm * v.lift };
}

// --- a stroke font for the placeholder labels (uppercase only; unknown letters leave a gap) -------------

/** Strokes on a 4 x 6 grid (x right, y down), each a polyline [x0, y0, x1, y1, ...]. */
const GLYPHS: Record<string, number[][]> = {
  A: [[0, 6, 0, 2, 2, 0, 4, 2, 4, 6], [0, 3.5, 4, 3.5]],
  C: [[4, 0.5, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5.5]],
  D: [[0, 0, 0, 6, 2.5, 6, 4, 4.5, 4, 1.5, 2.5, 0, 0, 0]],
  E: [[4, 0, 0, 0, 0, 6, 4, 6], [0, 3, 3, 3]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
  I: [[2, 0, 2, 6], [1, 0, 3, 0], [1, 6, 3, 6]],
  K: [[0, 0, 0, 6], [4, 0, 0, 3.5, 4, 6]],
  L: [[0, 0, 0, 6, 4, 6]],
  M: [[0, 6, 0, 0, 2, 3, 4, 0, 4, 6]],
  N: [[0, 6, 0, 0, 4, 6, 4, 0]],
  O: [[1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0]],
  P: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3]],
  R: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3], [2, 3, 4, 6]],
  S: [[4, 0.5, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5.5]],
  T: [[0, 0, 4, 0], [2, 0, 2, 6]],
  U: [[0, 0, 0, 5, 1, 6, 3, 6, 4, 5, 4, 0]],
  W: [[0, 0, 1, 6, 2, 3, 3, 6, 4, 0]],
  Y: [[0, 0, 2, 3, 4, 0], [2, 3, 2, 6]],
};

/** Draws `text` centred at (x, y), letters `size` points high, light with a dark edge. */
export function label(c: SkCanvas, text: string, x: number, y: number, size: number): void {
  const k = size / 6;
  const adv = 5.4 * k;
  const w = text.length * adv - 1.4 * k;
  const b = builder();
  let px = x - w / 2;
  const py = y - size / 2;
  for (const ch of text.toUpperCase()) {
    for (const s of GLYPHS[ch] ?? []) {
      for (let i = 0; i + 1 < s.length; i += 2) {
        const gx = px + s[i] * k;
        const gy = py + s[i + 1] * k;
        if (i === 0) b.moveTo(gx, gy);
        else b.lineTo(gx, gy);
      }
    }
    px += adv;
  }
  const path = b.build();
  c.drawPath(path, stroke(INK, Math.max(1.6, k * 1.9)));
  c.drawPath(path, stroke('#FFF6E0', Math.max(0.9, k * 0.9)));
}

// --- the things -----------------------------------------------------------------------------------------

/** Directions a pawn faces: south (towards the viewer), east, north, west. */
export const DIRS = ['s', 'e', 'n', 'w'] as const;
/** Frames of a walk cycle. */
export const WALK_FRAMES = 4;

/** A person as a pawn: shadow, two legs (stepping by `frame`), a vest of `vest`, a head with a hard hat. */
export function pawn(c: SkCanvas, v: View3q, dir: (typeof DIRS)[number], frame: number, vest: string): void {
  const P = v.ppm;
  const up = (h: number) => -h * P * v.lift;
  shadow(c, v, 0.32, 0.32);
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const swing = Math.sin(ph) * 0.13 * P;
  const bob = Math.abs(Math.sin(ph)) * 0.04 * P;
  const side = dir === 'e' || dir === 'w';
  const legW = 0.13 * P;
  const hipY = up(0.85) - bob;
  const legs: [number, number][] = side ? [[-0.02 * P + swing, 0], [0.02 * P - swing, 0]] : [[-0.1 * P, swing * 0.35], [0.1 * P, -swing * 0.35]];
  for (const [lx, ly] of legs) {
    const p = builder().moveTo(lx, hipY).lineTo(lx + (side ? swing * 0.6 : 0), ly).build();
    c.drawPath(p, stroke(INK, legW + 2));
    c.drawPath(p, stroke('#3B4A5C', legW));
  }
  const bw = (side ? 0.34 : 0.5) * P;
  const body = { x: -bw / 2, y: up(1.5) - bob, width: bw, height: up(0.8) - up(1.5) };
  c.drawRRect({ rect: body, rx: bw * 0.35, ry: bw * 0.35 }, fill(vest));
  c.drawRRect({ rect: body, rx: bw * 0.35, ry: bw * 0.35 }, stroke(INK, 1.2));
  // A reflective stripe.
  c.drawRect({ x: body.x + 1, y: body.y + body.height * 0.45, width: body.width - 2, height: Math.max(1.5, body.height * 0.12) }, fill('#F4F0D8'));
  const hr = 0.17 * P;
  const hy = up(1.7) - bob;
  c.drawCircle(0, hy, hr, fill('#E8B48A'));
  c.drawCircle(0, hy, hr, stroke(INK, 1.2));
  // The hard hat and the face (eyes towards the facing; none from behind).
  c.drawPath(builder().addArc({ x: -hr * 1.1, y: hy - hr * 1.15, width: hr * 2.2, height: hr * 2 }, 180, 180).close().build(), fill('#F6C933'));
  const eye = (ex: number) => c.drawCircle(ex, hy + hr * 0.15, Math.max(1, hr * 0.14), fill(INK));
  if (dir === 's') {
    eye(-hr * 0.4);
    eye(hr * 0.4);
  } else if (dir === 'e') eye(hr * 0.55);
  else if (dir === 'w') eye(-hr * 0.55);
}

/** One carried piece: a small cube (drawn over the carrier's head, stacked). */
export function piece(c: SkCanvas, v: View3q): void {
  prism(c, v, { len: 0.42, wid: 0.42, h: 0.3, color: '#B87333', line: 1 });
}

/** A wreck: a car body and its cabin, rusty, with four dark wheels, labelled. */
export function wreck(c: SkCanvas, v: View3q, w: number, d: number, h: number, text: string): void {
  shadow(c, v, w * 0.55, d * 0.6);
  for (const [wx, wy] of [[-w * 0.32, d * 0.48], [w * 0.32, d * 0.48]])
    c.drawOval({ x: wx * v.ppm - 0.3 * v.ppm, y: wy * v.ppm * v.tilt - 0.3 * v.ppm * v.lift - 0.3 * v.ppm, width: 0.6 * v.ppm, height: 0.6 * v.ppm }, fill('#262626'));
  prism(c, v, { len: w, wid: d, h: h * 0.55, z: 0.25, color: '#9C5B3B' });
  const top = prism(c, v, { len: w * 0.5, wid: d * 0.86, h: h * 0.38, z: 0.25 + h * 0.55, ox: -w * 0.05, color: '#7E8A93' });
  label(c, text, top.x, top.y + (d * 0.43 * v.ppm * v.tilt) * 0.5, Math.max(6, v.ppm * 0.22));
}

/** A cut wreck: three pieces lying where it stood. */
export function wreckPieces(c: SkCanvas, v: View3q, w: number, d: number): void {
  shadow(c, v, w * 0.45, d * 0.5);
  prism(c, v, { len: w * 0.36, wid: d * 0.5, h: 0.35, ox: -w * 0.22, oy: -d * 0.1, heading: 0.3, color: '#9C5B3B' });
  prism(c, v, { len: w * 0.28, wid: d * 0.42, h: 0.3, ox: w * 0.22, oy: -d * 0.05, heading: -0.4, color: '#7E8A93' });
  prism(c, v, { len: w * 0.3, wid: d * 0.36, h: 0.25, ox: 0.05, oy: d * 0.25, heading: 0.9, color: '#B87333' });
}

/** The machine: a box with a hopper on top, labelled. */
export function machine(c: SkCanvas, v: View3q, w: number, d: number, h: number, text: string): void {
  shadow(c, v, w * 0.6, d * 0.65);
  const top = prism(c, v, { len: w, wid: d, h: h * 0.7, color: '#5E7F6E' });
  // The hopper: a tray wider at the top, on the box's top.
  const P = v.ppm;
  const y0 = top.y;
  const rise = h * 0.3 * P * v.lift;
  const hw0 = w * 0.3 * P;
  const hw1 = w * 0.45 * P;
  const hopper = builder().moveTo(top.x - hw0, y0).lineTo(top.x + hw0, y0).lineTo(top.x + hw1, y0 - rise).lineTo(top.x - hw1, y0 - rise).close().build();
  c.drawPath(hopper, fill('#8FA89A'));
  c.drawPath(hopper, stroke(INK, 1.2));
  c.drawOval({ x: top.x - hw1, y: y0 - rise - d * 0.2 * P * v.tilt, width: hw1 * 2, height: d * 0.4 * P * v.tilt }, fill('#3C4F45'));
  c.drawOval({ x: top.x - hw1, y: y0 - rise - d * 0.2 * P * v.tilt, width: hw1 * 2, height: d * 0.4 * P * v.tilt }, stroke(INK, 1.2));
  label(c, text, 0, (d / 2) * P * v.tilt - h * 0.35 * P * v.lift, Math.max(7, P * 0.3));
}

/** The truck at a heading: a flat bed and a cabin at the front, on four wheels. */
export function truck(c: SkCanvas, v: View3q, heading: number, text: string): void {
  const len = 3.0;
  const wid = 1.8;
  shadow(c, v, 1.7, 1.3);
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const lx = -fy;
  const ly = fx;
  // Wheels first (the near ones are hidden by the body where they should be).
  for (const [u, s] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const wx = fx * u * len * 0.32 + lx * s * wid * 0.48;
    const wy = fy * u * len * 0.32 + ly * s * wid * 0.48;
    c.drawOval({ x: wx * v.ppm - 0.28 * v.ppm, y: wy * v.ppm * v.tilt - 0.36 * v.ppm * v.lift - 0.2 * v.ppm, width: 0.56 * v.ppm, height: 0.56 * v.ppm }, fill('#222222'));
  }
  const bed = prism(c, v, { len: len * 0.62, wid, h: 0.55, z: 0.35, heading, ox: -fx * len * 0.19, oy: -fy * len * 0.19, color: '#D9A520' });
  prism(c, v, { len: len * 0.36, wid, h: 1.1, z: 0.35, heading, ox: fx * len * 0.31, oy: fy * len * 0.31, color: '#E8B830' });
  label(c, text, bed.x, bed.y, Math.max(6, v.ppm * 0.2));
}

/** A wall section (a shipping container on its side), labelled at its middle. */
export function wall(c: SkCanvas, v: View3q, w: number, d: number, h: number): void {
  shadow(c, v, w * 0.52, d * 0.55);
  prism(c, v, { len: w, wid: d, h, color: '#46708F' });
}

/** A heap of loose scrap: a low mound. */
export function pile(c: SkCanvas, v: View3q, r: number, h: number): void {
  shadow(c, v, r * 1.05, r * 1.05);
  const P = v.ppm;
  const rx = r * P;
  const ry = r * P * v.tilt;
  const top = h * P * v.lift;
  const p = builder().moveTo(-rx, 0).quadTo(-rx * 0.6, -top * 1.1, 0, -top).quadTo(rx * 0.6, -top * 1.1, rx, 0).quadTo(0, ry * 1.2, -rx, 0).close().build();
  c.drawPath(p, fill('#7A6A5A'));
  c.drawPath(p, stroke(INK, 1.2));
  for (let i = 0; i < 5; i++) c.drawCircle(((i * 37) % 9 - 4) * rx * 0.15, -top * (0.25 + ((i * 3) % 5) * 0.12), Math.max(1.5, P * 0.07), fill(i % 2 ? '#B87333' : '#9AA3A8'));
}

/** A crate. */
export function crate(c: SkCanvas, v: View3q, w: number, d: number, h: number): void {
  shadow(c, v, w * 0.55, d * 0.55);
  prism(c, v, { len: w, wid: d, h, color: '#A57C4F', line: 1 });
}

/** A ring on the ground round a thing, filled `k` of `n` (the cut's progress), `r` metres. */
export function ring(c: SkCanvas, v: View3q, r: number, k: number, n: number, color: string): void {
  const rx = r * v.ppm;
  const ry = r * v.ppm * v.tilt;
  const oval = { x: -rx, y: -ry, width: rx * 2, height: ry * 2 };
  c.drawOval(oval, stroke('#000000', 5, 0.25));
  if (k > 0) c.drawPath(builder().addArc(oval, -90, (360 * k) / n).build(), stroke(color, 4));
}
