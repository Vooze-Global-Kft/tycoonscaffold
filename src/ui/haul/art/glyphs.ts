/**
 * A tiny monospaced stroke font for text drawn inside art: call signs ("OPS-2"), ring labels
 * ("R2"), pile counts ("62/80"), price tags ("₵21"), route chips ("x3") and gallery labels.
 * Drawn as lit strokes, so it needs no font file in Node or on a phone, and it reads as the
 * station's own instrument lettering. Capitals, digits and a few signs; lower case draws as
 * capitals except "x", which draws as a small multiplication x.
 */
import { Skia, type SkCanvas, type SkPath } from '@shopify/react-native-skia';
import { alpha } from './palette';
import { stroke } from './pen';

type Stroke = number[]; // x, y, x, y, ... on a 4 x 6 grid (y down)

const O: Stroke = [1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0];
const P: Stroke = [0, 6, 0, 0, 3, 0, 4, 1, 4, 2.5, 3, 3.5, 0, 3.5];
const C: Stroke = [4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5];

const GLYPHS: Record<string, Stroke[]> = {
  A: [[0, 6, 0, 2, 2, 0, 4, 2, 4, 6], [0, 3.6, 4, 3.6]],
  B: [[0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3], [0, 0, 3, 0, 4, 1, 4, 2, 3, 3]],
  C: [C],
  D: [[0, 0, 0, 6, 2.5, 6, 4, 4.5, 4, 1.5, 2.5, 0, 0, 0]],
  E: [[4, 0, 0, 0, 0, 6, 4, 6], [0, 3, 3, 3]],
  F: [[4, 0, 0, 0, 0, 6], [0, 3, 3, 3]],
  G: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3.5, 2.2, 3.5]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
  I: [[1, 0, 3, 0], [2, 0, 2, 6], [1, 6, 3, 6]],
  J: [[4, 0, 4, 5, 3, 6, 1, 6, 0, 5]],
  K: [[0, 0, 0, 6], [4, 0, 0, 3.6], [1.4, 2.6, 4, 6]],
  L: [[0, 0, 0, 6, 4, 6]],
  M: [[0, 6, 0, 0, 2, 3, 4, 0, 4, 6]],
  N: [[0, 6, 0, 0, 4, 6, 4, 0]],
  O: [O],
  P: [P],
  Q: [O, [2.5, 4.5, 4, 6.4]],
  R: [P, [2, 3.5, 4, 6]],
  S: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5]],
  T: [[0, 0, 4, 0], [2, 0, 2, 6]],
  U: [[0, 0, 0, 5, 1, 6, 3, 6, 4, 5, 4, 0]],
  V: [[0, 0, 2, 6, 4, 0]],
  W: [[0, 0, 1, 6, 2, 3, 3, 6, 4, 0]],
  X: [[0, 0, 4, 6], [4, 0, 0, 6]],
  Y: [[0, 0, 2, 3, 4, 0], [2, 3, 2, 6]],
  Z: [[0, 0, 4, 0, 0, 6, 4, 6]],
  '0': [O, [3.2, 1.2, 0.8, 4.8]],
  '1': [[1, 1, 2, 0, 2, 6], [1, 6, 3, 6]],
  '2': [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 0, 6, 4, 6]],
  '3': [[0, 0, 4, 0, 2, 2.5, 3, 2.5, 4, 3.5, 4, 5, 3, 6, 1, 6, 0, 5]],
  '4': [[3, 6, 3, 0, 0, 4, 4, 4]],
  '5': [[4, 0, 0, 0, 0, 2.6, 3, 2.6, 4, 3.6, 4, 5, 3, 6, 0, 6]],
  '6': [[3.5, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3]],
  '7': [[0, 0, 4, 0, 1.5, 6]],
  '8': [[1, 3, 0, 2, 0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1, 3, 0, 4, 0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3]],
  '9': [[4, 3, 1, 3, 0, 2, 0, 1, 1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 0.5, 6]],
  '-': [[0.8, 3, 3.2, 3]],
  '+': [[2, 1.5, 2, 4.5], [0.5, 3, 3.5, 3]],
  '/': [[3.5, 0, 0.5, 6]],
  '.': [[2, 5.7, 2, 6]],
  ',': [[2, 5.4, 1.4, 6.8]],
  ':': [[2, 1.7, 2, 2], [2, 5.4, 2, 5.7]],
  '·': [[2, 2.9, 2, 3.2]],
  '!': [[2, 0, 2, 4], [2, 5.7, 2, 6]],
  '?': [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 2, 3.5, 2, 4.2], [2, 5.7, 2, 6]],
  '%': [[0, 6, 4, 0], [0.4, 0.4, 1.4, 0.4, 1.4, 1.6, 0.4, 1.6, 0.4, 0.4], [2.6, 4.4, 3.6, 4.4, 3.6, 5.6, 2.6, 5.6, 2.6, 4.4]],
  '×': [[0.6, 2.4, 3.4, 6], [3.4, 2.4, 0.6, 6]],
  '₵': [C, [2, -0.9, 2, 6.9]],
  '>': [[0.5, 1, 3.5, 3, 0.5, 5]],
  '<': [[3.5, 1, 0.5, 3, 3.5, 5]],
  '#': [[1.3, 0.5, 1.3, 5.5], [2.7, 0.5, 2.7, 5.5], [0, 2, 4, 2], [0, 4, 4, 4]],
};

const ADVANCE = 6;
const cache = new Map<string, SkPath | null>();

function glyphPath(ch: string): SkPath | null {
  const key = ch === 'x' ? '×' : ch.toUpperCase();
  if (cache.has(key)) return cache.get(key) ?? null;
  const strokes = GLYPHS[key];
  let path: SkPath | null = null;
  if (strokes) {
    const b = Skia.PathBuilder.Make();
    for (const s of strokes) {
      b.moveTo(s[0], s[1]);
      for (let i = 2; i < s.length; i += 2) b.lineTo(s[i], s[i + 1]);
    }
    path = b.build();
  }
  cache.set(key, path);
  return path;
}

/** Width of `text` at cap height `size`, in points. */
export function textWidth(text: string, size: number): number {
  const u = size / 6;
  return text.length > 0 ? (text.length * ADVANCE - 2) * u : 0;
}

export interface TextStyle {
  /** Cap height in points. */
  size: number;
  color: string;
  /** Stroke width; default 15 % of the size, at least 0.9 pt. */
  weight?: number;
  /** 'left' (default), 'center' or 'right' of x. */
  align?: 'left' | 'center' | 'right';
  /** Baked glow under the letters, 0 to 1. Default 0.6. */
  glow?: number;
}

/**
 * Draws `text` with its cap top at `y` (so it occupies y to y + size). Returns its width.
 */
export function drawText(c: SkCanvas, text: string, x: number, y: number, style: TextStyle): number {
  const { size, color } = style;
  const u = size / 6;
  const w = textWidth(text, size);
  const weight = style.weight ?? Math.max(0.9, size * 0.15);
  const g = style.glow ?? 0.6;
  let x0 = x;
  if (style.align === 'center') x0 = x - w / 2;
  else if (style.align === 'right') x0 = x - w;
  const paints = g > 0 ? [stroke(alpha(color, 0.18 * g), weight + Math.max(1.6, size * 0.22)), stroke(color, weight)] : [stroke(color, weight)];
  for (const paint of paints) {
    let cx = x0;
    for (const ch of text) {
      const path = glyphPath(ch);
      if (path) {
        c.save();
        c.translate(cx, y);
        c.scale(u, u);
        // Keep the stroke width in points under the glyph scale.
        const p = paint.copy();
        p.setStrokeWidth(paint.getStrokeWidth() / u);
        c.drawPath(path, p);
        c.restore();
      }
      cx += ADVANCE * u;
    }
  }
  return w;
}
