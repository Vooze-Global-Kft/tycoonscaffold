/**
 * Cut pieces by grade (yard-style.md 7): every grade has its own silhouette, so a bay, a heap, a skip
 * load or a stack on the worker's back says which metal it is without its colour.
 *
 * - copper (bare bright): looped wire bundles and short tube offcuts with bright cut ends
 * - brass: taps, valves and elbow fittings (spout, handle, hex)
 * - light iron: bent plate and angle iron, rust freckles
 * - hms (heavy steel): I-beam offcuts showing their section
 * - cast iron: radiator sections (two or three round columns)
 * - aluminium: crushed cans and channel profiles, near white
 * - enamel (white goods): a bent panel
 *
 * A piece is drawn in screen points round its centre, about `s` points long, turned by `turn` degrees,
 * with an ink outline; the sheen mark is never smaller than 4 pt (the judge's floor at 1x).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { METAL, YARD, shade } from './palette';
import { builder, circle, fill, hash01, oval, poly, rrect, segment, stroke } from './pen';

const INK = YARD.ink;

/** Copper's sheen mark: two short parallel strokes, at least 4 pt long. */
export function copperTicks(c: SkCanvas, x: number, y: number, s: number): void {
  const k = Math.max(4, s);
  const p = stroke(YARD.copperSheen, Math.max(1.2, k * 0.2));
  c.drawPath(segment(x - k * 0.45, y + k * 0.2, x - k * 0.1, y - k * 0.3), p);
  c.drawPath(segment(x + k * 0.05, y + k * 0.32, x + k * 0.4, y - k * 0.1), p);
}

function outlined(c: SkCanvas, p: ReturnType<typeof poly>, color: string, w = 0.9): void {
  c.drawPath(p, fill(color));
  c.drawPath(p, stroke(INK, w));
}

/** A ring of wire: an ink stroke then the metal on it (so loops read as wire, not a disc). */
function loop(c: SkCanvas, cx: number, cy: number, rx: number, ry: number, w: number, color: string): void {
  c.drawPath(oval(cx, cy, rx, ry), stroke(INK, w + 1.5));
  c.drawPath(oval(cx, cy, rx, ry), stroke(color, w));
}

/** A bundle of bare bright wire: three loose loops, a galvanised tie, the sheen ticks. */
export function wireBundle(c: SkCanvas, s: number, seed = 0): void {
  const rx = s * 0.36;
  const ry = rx * 0.58;
  const w = Math.max(1.6, s * 0.1);
  for (let i = 0; i < 3; i++) loop(c, (i - 1) * s * 0.1 + (hash01(seed, i) - 0.5) * s * 0.05, (1 - i) * s * 0.06, rx * (0.92 + 0.08 * i), ry, w, i === 1 ? YARD.copper : i === 2 ? YARD.copperLight : shade(YARD.copper, 0.15));
  c.drawPath(segment(-rx * 0.75, -ry * 0.9, -rx * 0.55, ry * 0.95), stroke(INK, 2.8));
  c.drawPath(segment(-rx * 0.75, -ry * 0.9, -rx * 0.55, ry * 0.95), stroke(YARD.galvanisedLight, 1.4));
  copperTicks(c, rx * 0.35, -ry * 0.85, s * 0.28);
}

/** A short tube offcut lying east-west: a round body and a bright cut end with its bore. */
export function tubeOffcut(c: SkCanvas, s: number, metal = 'copper'): void {
  const m = METAL[metal] ?? METAL.copper;
  const h = Math.max(4, s * 0.34);
  const L = s * 0.8;
  const body = rrect(-L / 2, -h / 2, L, h, h * 0.3);
  c.drawPath(body, fill(m.base));
  c.drawRect({ x: -L / 2 + 1, y: -h / 2 + 0.8, width: L - 2, height: h * 0.32 }, fill(m.light));
  c.drawPath(body, stroke(INK, 0.9));
  const ex = L / 2;
  c.drawPath(oval(ex, 0, h * 0.32, h / 2), fill(metal === 'copper' ? YARD.copperSheen : m.light));
  c.drawPath(oval(ex, 0, h * 0.32, h / 2), stroke(INK, 0.9));
  c.drawPath(oval(ex, 0, h * 0.16, h * 0.28), fill(shade(m.dark, -0.3)));
  if (metal === 'copper') copperTicks(c, -L * 0.15, -h * 0.05, s * 0.26);
}

/** A brass tap: body, spout down, a cross handle on a stem (side view). */
export function brassTap(c: SkCanvas, s: number): void {
  const k = s / 12;
  const body = poly([-5 * k, -1.4 * k, 3 * k, -1.4 * k, 4.4 * k, 0, 4.4 * k, 1.6 * k, 6 * k, 2.4 * k, 6 * k, 5.2 * k, 3.4 * k, 5.2 * k, 3.2 * k, 3 * k, -5 * k, 3 * k]);
  outlined(c, body, YARD.brass);
  c.drawPath(segment(-4 * k, -0.4 * k, 2.6 * k, -0.4 * k), stroke(YARD.brassLight, Math.max(1, k * 1.1)));
  // the inlet thread
  for (let i = 0; i < 3; i++) c.drawPath(segment(-5 * k + i * 1.1 * k, -1.4 * k, -5 * k + i * 1.1 * k, 3 * k), stroke(YARD.brassDark, 0.7));
  // stem and the cross handle
  c.drawPath(rrect(-0.9 * k, -4.6 * k, 1.8 * k, 3.4 * k, 0.4 * k), fill(YARD.brassDark));
  c.drawPath(rrect(-0.9 * k, -4.6 * k, 1.8 * k, 3.4 * k, 0.4 * k), stroke(INK, 0.8));
  outlined(c, rrect(-4 * k, -6.2 * k, 8 * k, 2 * k, k), YARD.brass, 0.8);
  c.drawPath(circle(0, -5.2 * k, 1.1 * k), fill(YARD.brassDark));
}

/** A brass gate valve: a hex body with two threaded ends and a handwheel above. */
export function brassValve(c: SkCanvas, s: number): void {
  const k = s / 12;
  outlined(c, rrect(-6 * k, -1.6 * k, 12 * k, 3.6 * k, 0.6 * k), YARD.brassDark);
  outlined(c, poly([-3 * k, -3 * k, 3 * k, -3 * k, 4 * k, 0.2 * k, 3 * k, 3.4 * k, -3 * k, 3.4 * k, -4 * k, 0.2 * k]), YARD.brass);
  c.drawPath(segment(-2 * k, -2 * k, 2 * k, -2 * k), stroke(YARD.brassLight, Math.max(1, k)));
  c.drawPath(segment(0, -3 * k, 0, -6 * k), stroke(INK, 1.6 * k + 0.6));
  c.drawPath(oval(0, -6.4 * k, 4.4 * k, 1.6 * k), stroke(INK, 1.7 * k + 1));
  c.drawPath(oval(0, -6.4 * k, 4.4 * k, 1.6 * k), stroke(YARD.brass, 1.7 * k));
}

/** A brass elbow fitting. */
export function brassElbow(c: SkCanvas, s: number): void {
  const k = s / 12;
  const p = builder().moveTo(-6 * k, -1.8 * k).lineTo(0, -1.8 * k).quadTo(3.6 * k, -1.8 * k, 3.6 * k, 2 * k).lineTo(3.6 * k, 6 * k).lineTo(-0.2 * k, 6 * k).lineTo(-0.2 * k, 2.6 * k).quadTo(-0.2 * k, 2 * k, -1 * k, 2 * k).lineTo(-6 * k, 2 * k).close().build();
  outlined(c, p, YARD.brass);
  c.drawPath(oval(-6 * k, 0.1 * k, 1 * k, 1.9 * k), fill(YARD.brassLight));
  c.drawPath(oval(-6 * k, 0.1 * k, 1 * k, 1.9 * k), stroke(INK, 0.8));
  c.drawPath(segment(-4.5 * k, -0.9 * k, 0, -0.9 * k), stroke(YARD.brassLight, Math.max(1, k)));
}

/** A bent sheet of light iron: two planes at a fold, rust freckles. */
export function bentPlate(c: SkCanvas, s: number, seed = 0, color = METAL.light_iron.base, light = METAL.light_iron.light): void {
  const w = s / 2;
  const h = s * 0.3;
  const a = poly([-w, -h * 0.4, 0, -h, 0, h * 0.2, -w, h * 0.7]);
  const b = poly([0, -h, w, -h * 0.55, w * 0.95, h * 0.55, 0, h * 0.2]);
  outlined(c, a, light);
  outlined(c, b, color);
  if (color === METAL.light_iron.base)
    for (let i = 0; i < 4; i++) c.drawPath(circle(-w * 0.8 + hash01(seed, i) * w * 1.6, -h * 0.4 + hash01(seed, i, 2) * h, 0.9), fill(YARD.rust, 0.85));
}

/** Angle iron: a long bar with its L section at the near end. */
export function angleIron(c: SkCanvas, s: number, seed = 0): void {
  const L = s;
  const h = Math.max(3, s * 0.18);
  outlined(c, rrect(-L / 2, -h / 2, L, h, 0.6), METAL.light_iron.base);
  c.drawPath(segment(-L / 2 + 1, -h * 0.1, L / 2 - h, -h * 0.1), stroke(METAL.light_iron.light, 1));
  const e = L / 2;
  outlined(c, poly([e - h, -h / 2 - 1, e + 0.6, -h / 2 - 1, e + 0.6, h / 2, e - h * 0.35, h / 2, e - h * 0.35, -h * 0.1, e - h, -h * 0.1]), METAL.light_iron.light, 0.8);
  c.drawPath(circle(-L * 0.2 + hash01(seed) * L * 0.3, h * 0.15, 0.9), fill(YARD.rust));
}

/** An I-beam offcut of heavy steel: a long bar, its I section at the near end, a band mark. */
export function beamOffcut(c: SkCanvas, s: number): void {
  const m = METAL.hms;
  const L = s;
  const h = Math.max(4, s * 0.26);
  outlined(c, rrect(-L / 2, -h / 2, L, h, 0.6), m.base);
  c.drawPath(rrect(-L / 2 + 1, -h / 2 + 1, L - h - 1, h * 0.22, 0.4), fill(m.light));
  c.drawRect({ x: -L * 0.1, y: -h / 2 + 0.6, width: Math.max(1.6, L * 0.07), height: h - 1.2 }, fill(m.dark, 0.7));
  const e = L / 2 - h * 0.5;
  const f = h * 0.5;
  outlined(c, poly([e - f, -h / 2, e + f, -h / 2, e + f, -h / 2 + f * 0.4, e + f * 0.18, -h / 2 + f * 0.4, e + f * 0.18, h / 2 - f * 0.4, e + f, h / 2 - f * 0.4, e + f, h / 2, e - f, h / 2, e - f, h / 2 - f * 0.4, e - f * 0.18, h / 2 - f * 0.4, e - f * 0.18, -h / 2 + f * 0.4, e - f, -h / 2 + f * 0.4]), m.light, 0.8);
}

/** A radiator section of cast iron: two or three round columns joined at the top and foot. */
export function radiatorSection(c: SkCanvas, s: number, n = 3, seed = 0): void {
  const m = METAL.cast_iron;
  const cw = s / (n + 0.4);
  const h = s * 0.62;
  outlined(c, rrect(-s / 2, -h / 2, s, h * 0.18, 1), m.dark, 0.8);
  outlined(c, rrect(-s / 2, h / 2 - h * 0.18, s, h * 0.18, 1), m.dark, 0.8);
  for (let i = 0; i < n; i++) {
    const x = -s / 2 + cw * (i + 0.2);
    outlined(c, rrect(x, -h / 2, cw * 0.86, h, cw * 0.4), i % 2 ? m.base : shade(m.base, 0.08), 0.9);
    c.drawPath(segment(x + cw * 0.25, -h / 2 + 2, x + cw * 0.25, h / 2 - 2), stroke(m.light, 1));
    c.drawPath(circle(x + cw * 0.55, -h * 0.1 + hash01(seed, i) * h * 0.3, 0.8), fill(m.light));
  }
}

/** A crushed aluminium can: a squashed cylinder with ridges, near white. */
export function crushedCan(c: SkCanvas, s: number): void {
  const m = METAL.aluminium;
  const w = s * 0.7;
  const h = s * 0.42;
  const p = poly([-w / 2, -h / 2, -w * 0.15, -h * 0.35, w * 0.12, -h * 0.55, w / 2, -h * 0.4, w / 2 + 1, h * 0.4, w * 0.1, h * 0.55, -w * 0.2, h * 0.38, -w / 2, h / 2]);
  outlined(c, p, m.base);
  for (const x of [-w * 0.15, w * 0.12]) c.drawPath(segment(x, -h * 0.35, x - 1, h * 0.4), stroke(m.dark, 0.9));
  c.drawPath(oval(-w / 2 + 0.5, 0, 1.4, h / 2), fill(m.dark));
  c.drawPath(segment(-w * 0.35, -h * 0.15, w * 0.35, -h * 0.25), stroke('#FFFFFF', 1.4));
}

/** An aluminium channel profile: a long bar with a U section and a long sheen stripe. */
export function channelProfile(c: SkCanvas, s: number): void {
  const m = METAL.aluminium;
  const L = s;
  const h = Math.max(3.4, s * 0.2);
  outlined(c, rrect(-L / 2, -h / 2, L, h, 0.5), m.base);
  c.drawPath(segment(-L / 2 + 2, -h * 0.15, L / 2 - h, -h * 0.15), stroke('#FFFFFF', 1.3));
  const e = L / 2;
  outlined(c, poly([e - h, -h / 2, e + 0.5, -h / 2, e + 0.5, h / 2, e - h, h / 2, e - h, h / 2 - h * 0.28, e - h * 0.28, h / 2 - h * 0.28, e - h * 0.28, -h / 2 + h * 0.28, e - h, -h / 2 + h * 0.28]), m.dark, 0.8);
}

/** A bent white-goods panel. */
export function enamelPanel(c: SkCanvas, s: number, seed = 0): void {
  bentPlate(c, s, seed, YARD.enamel, '#FFFFFF');
  c.drawPath(circle(s * 0.1, 0, 1), fill(YARD.rust, 0.8));
}

/**
 * One piece of a grade at (x, y), about s points long, turned `turn` degrees; `seed` picks among the
 * grade's shapes.
 */
export function pieceGlyph(c: SkCanvas, metal: string, x: number, y: number, s: number, turn = 0, seed = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(turn, 0, 0);
  const pick = Math.floor(hash01(seed, 77) * 3);
  switch (metal) {
    case 'copper':
      if (pick === 2) tubeOffcut(c, s);
      else wireBundle(c, s, seed);
      break;
    case 'brass':
      if (pick === 0) brassTap(c, s);
      else if (pick === 1) brassValve(c, s);
      else brassElbow(c, s);
      break;
    case 'cast_iron':
      radiatorSection(c, s, pick === 0 ? 2 : 3, seed);
      break;
    case 'hms':
      beamOffcut(c, s);
      break;
    case 'aluminium':
      if (pick === 0) channelProfile(c, s);
      else crushedCan(c, s);
      break;
    case 'enamel':
      enamelPanel(c, s, seed);
      break;
    case 'light_iron':
    default:
      if (pick === 1) angleIron(c, s, seed);
      else bentPlate(c, s, seed);
  }
  c.restore();
}

/**
 * A heap of one or more grades as a bay or a skip shows it: a low mound in the first grade's dark tone
 * and n pieces piled on it, back to front (so nearer pieces overlap). Centre (0, 0) is the heap's foot;
 * w and h its width and height in points.
 */
export function pieceHeap(c: SkCanvas, metals: string[], w: number, h: number, n: number, seed = 1, size = 14): void {
  const m0 = METAL[metals[0]] ?? METAL.light_iron;
  const mound = builder()
    .moveTo(-w / 2, 0)
    .quadTo(-w * 0.42, -h * 0.9, 0, -h)
    .quadTo(w * 0.42, -h * 0.9, w / 2, 0)
    .quadTo(0, h * 0.22, -w / 2, 0)
    .close()
    .build();
  c.drawPath(mound, fill(shade(m0.dark, -0.15)));
  c.drawPath(mound, stroke(INK, 1));
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = hash01(seed, i, 1) * 2 - 1;
    const top = -h * (1 - a * a) * 0.92;
    const y = top + (h * 0.1 - top) * hash01(seed, i, 2) ** 1.4;
    pts.push([a * w * 0.42, y, i]);
  }
  pts.sort((p, q) => p[1] - q[1]);
  for (const [x, y, i] of pts) {
    const metal = metals[i % metals.length];
    pieceGlyph(c, metal, x, y, size * (0.85 + hash01(seed, i, 4) * 0.35), (hash01(seed, i, 3) - 0.5) * 50, seed * 31 + i);
  }
}
