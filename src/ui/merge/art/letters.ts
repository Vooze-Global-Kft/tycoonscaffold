/**
 * Paper-cut letters: capitals, digits and a few signs drawn as thick paper strips (no font file).
 * Used for the name on the loading screen ("Lantern Row" in paper-cut letters, spec 4.6), the shelf
 * badge ("+n") and figures inside drawings. The words themselves come from the caller (game.json
 * or strings.ts); this file holds shapes only.
 *
 * Each glyph is a list of strokes in a box 1 tall (0 = cap top) and `w` wide. `style: 'paper'`
 * cuts each strip with square ends, tilts each letter a little (seeded by its position) and lays a
 * dark offset under it, like letters cut from rice paper and pinned up; `style: 'plain'` draws
 * round-ended strokes for small figures.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { NIGHT, alpha } from './palette';
import { builder, seeded, stroke } from './pen';

type Stroke = number[];
interface Glyph {
  w: number;
  s: Stroke[];
}

const O: Stroke = [0.2, 0, 0.5, 0, 0.7, 0.2, 0.7, 0.8, 0.5, 1, 0.2, 1, 0, 0.8, 0, 0.2, 0.2, 0];
const P: Stroke = [0, 1, 0, 0, 0.45, 0, 0.62, 0.15, 0.62, 0.4, 0.45, 0.55, 0, 0.55];

const GLYPHS: Record<string, Glyph> = {
  A: { w: 0.72, s: [[0, 1, 0.36, 0, 0.72, 1], [0.15, 0.64, 0.57, 0.64]] },
  B: { w: 0.66, s: [[0, 1, 0, 0, 0.45, 0, 0.6, 0.12, 0.6, 0.36, 0.45, 0.48, 0, 0.48], [0.45, 0.48, 0.66, 0.6, 0.66, 0.86, 0.5, 1, 0, 1]] },
  C: { w: 0.66, s: [[0.66, 0.14, 0.5, 0, 0.18, 0, 0, 0.2, 0, 0.8, 0.18, 1, 0.5, 1, 0.66, 0.86]] },
  D: { w: 0.66, s: [[0, 0, 0, 1, 0.4, 1, 0.66, 0.76, 0.66, 0.24, 0.4, 0, 0, 0]] },
  E: { w: 0.6, s: [[0.6, 0, 0, 0, 0, 1, 0.6, 1], [0, 0.5, 0.48, 0.5]] },
  F: { w: 0.6, s: [[0.6, 0, 0, 0, 0, 1], [0, 0.5, 0.48, 0.5]] },
  G: { w: 0.7, s: [[0.66, 0.14, 0.5, 0, 0.18, 0, 0, 0.2, 0, 0.8, 0.18, 1, 0.5, 1, 0.7, 0.84, 0.7, 0.56, 0.38, 0.56]] },
  H: { w: 0.66, s: [[0, 0, 0, 1], [0.66, 0, 0.66, 1], [0, 0.5, 0.66, 0.5]] },
  I: { w: 0.12, s: [[0.06, 0, 0.06, 1]] },
  J: { w: 0.56, s: [[0.56, 0, 0.56, 0.8, 0.38, 1, 0.15, 1, 0, 0.82]] },
  K: { w: 0.66, s: [[0, 0, 0, 1], [0.64, 0, 0, 0.6], [0.22, 0.42, 0.66, 1]] },
  L: { w: 0.58, s: [[0, 0, 0, 1, 0.58, 1]] },
  M: { w: 0.82, s: [[0, 1, 0, 0, 0.41, 0.6, 0.82, 0, 0.82, 1]] },
  N: { w: 0.66, s: [[0, 1, 0, 0, 0.66, 1, 0.66, 0]] },
  O: { w: 0.7, s: [O] },
  P: { w: 0.62, s: [P] },
  Q: { w: 0.74, s: [O, [0.42, 0.7, 0.76, 1.06]] },
  R: { w: 0.66, s: [P, [0.3, 0.55, 0.66, 1]] },
  S: { w: 0.66, s: [[0.62, 0.12, 0.48, 0, 0.15, 0, 0, 0.14, 0, 0.36, 0.15, 0.48, 0.5, 0.52, 0.66, 0.64, 0.66, 0.86, 0.5, 1, 0.15, 1, 0, 0.88]] },
  T: { w: 0.7, s: [[0, 0, 0.7, 0], [0.35, 0, 0.35, 1]] },
  U: { w: 0.66, s: [[0, 0, 0, 0.8, 0.18, 1, 0.48, 1, 0.66, 0.8, 0.66, 0]] },
  V: { w: 0.72, s: [[0, 0, 0.36, 1, 0.72, 0]] },
  W: { w: 0.94, s: [[0, 0, 0.22, 1, 0.47, 0.34, 0.72, 1, 0.94, 0]] },
  X: { w: 0.66, s: [[0, 0, 0.66, 1], [0.66, 0, 0, 1]] },
  Y: { w: 0.7, s: [[0, 0, 0.35, 0.5, 0.7, 0], [0.35, 0.5, 0.35, 1]] },
  Z: { w: 0.64, s: [[0, 0, 0.64, 0, 0, 1, 0.64, 1]] },
  '0': { w: 0.6, s: [[0.18, 0, 0.42, 0, 0.6, 0.2, 0.6, 0.8, 0.42, 1, 0.18, 1, 0, 0.8, 0, 0.2, 0.18, 0]] },
  '1': { w: 0.34, s: [[0, 0.2, 0.3, 0, 0.3, 1]] },
  '2': { w: 0.6, s: [[0, 0.16, 0.15, 0, 0.45, 0, 0.6, 0.15, 0.6, 0.38, 0, 1, 0.62, 1]] },
  '3': { w: 0.62, s: [[0, 0.1, 0.15, 0, 0.45, 0, 0.6, 0.14, 0.6, 0.36, 0.42, 0.48, 0.2, 0.48], [0.42, 0.48, 0.62, 0.62, 0.62, 0.86, 0.46, 1, 0.15, 1, 0, 0.9]] },
  '4': { w: 0.66, s: [[0.48, 1, 0.48, 0, 0, 0.68, 0.66, 0.68]] },
  '5': { w: 0.62, s: [[0.6, 0, 0.05, 0, 0, 0.46, 0.42, 0.42, 0.62, 0.58, 0.62, 0.84, 0.45, 1, 0.12, 1, 0, 0.9]] },
  '6': { w: 0.62, s: [[0.55, 0.04, 0.3, 0, 0.08, 0.2, 0, 0.6, 0, 0.82, 0.18, 1, 0.45, 1, 0.62, 0.84, 0.62, 0.62, 0.45, 0.46, 0.18, 0.46, 0, 0.6]] },
  '7': { w: 0.62, s: [[0, 0, 0.62, 0, 0.2, 1]] },
  '8': { w: 0.62, s: [[0.31, 0.48, 0.1, 0.36, 0.1, 0.12, 0.22, 0, 0.42, 0, 0.54, 0.12, 0.54, 0.36, 0.31, 0.48, 0.04, 0.62, 0.04, 0.86, 0.18, 1, 0.46, 1, 0.6, 0.86, 0.6, 0.62, 0.31, 0.48]] },
  '9': { w: 0.62, s: [[0.62, 0.4, 0.45, 0.54, 0.18, 0.54, 0, 0.38, 0, 0.16, 0.18, 0, 0.45, 0, 0.62, 0.18, 0.62, 0.6, 0.5, 0.88, 0.25, 1, 0.05, 0.96]] },
  '+': { w: 0.56, s: [[0, 0.56, 0.56, 0.56], [0.28, 0.28, 0.28, 0.84]] },
  '-': { w: 0.46, s: [[0, 0.56, 0.46, 0.56]] },
  '/': { w: 0.5, s: [[0.5, 0, 0, 1]] },
  '·': { w: 0.16, s: [[0.08, 0.52, 0.08, 0.53]] },
  '.': { w: 0.16, s: [[0.08, 0.98, 0.08, 0.99]] },
  '?': { w: 0.56, s: [[0, 0.16, 0.14, 0, 0.42, 0, 0.56, 0.16, 0.56, 0.34, 0.28, 0.52, 0.28, 0.7], [0.28, 0.97, 0.28, 0.98]] },
  '!': { w: 0.14, s: [[0.07, 0, 0.07, 0.66], [0.07, 0.97, 0.07, 0.98]] },
  '×': { w: 0.5, s: [[0.04, 0.4, 0.46, 0.88], [0.46, 0.4, 0.04, 0.88]] },
  "'": { w: 0.12, s: [[0.06, 0, 0.06, 0.24]] },
};

export interface LetterStyle {
  /** Cap height in points. */
  size: number;
  color?: string;
  /** 'paper' (cut strips, tilted, with a shadow) or 'plain' (round strokes). Default 'plain'. */
  style?: 'paper' | 'plain';
  /** Stroke weight as a share of the cap height (default 0.2 paper, 0.16 plain). */
  weight?: number;
  /** Horizontal anchor: 'left' (default), 'center', 'right'. */
  align?: 'left' | 'center' | 'right';
  /** Paper style: the shadow colour (default ink). */
  shadow?: string;
  /** Paper style: the rim colour of each strip (default paperEdge). */
  edge?: string;
  /** Paper style: the seed of the tilts. */
  seed?: number;
}

const SPACE_W = 0.42;
const GAP = 0.2;

function glyphOf(ch: string): Glyph | null {
  return GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? null;
}

/** Width of `text` in points at cap height `size`. */
export function lettersWidth(text: string, size: number, weight = 0.2): number {
  let w = 0;
  for (const ch of text) {
    const g = glyphOf(ch);
    w += (g ? g.w + weight : SPACE_W) * size + GAP * size;
  }
  return Math.max(0, w - GAP * size);
}

/** Whether every character of `text` has a shape here (space included). */
export function lettersCover(text: string): boolean {
  for (const ch of text) if (ch !== ' ' && !glyphOf(ch)) return false;
  return true;
}

/** Draws `text` with its cap top at y; returns the width drawn. */
export function drawLetters(c: SkCanvas, text: string, x: number, y: number, o: LetterStyle): number {
  const paper = o.style === 'paper';
  const weight = o.weight ?? (paper ? 0.2 : 0.16);
  const size = o.size;
  const sw = weight * size;
  const total = lettersWidth(text, size, weight);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const rnd = seeded(o.seed ?? 7);
  const color = o.color ?? NIGHT.paper;
  for (const ch of text) {
    const g = glyphOf(ch);
    if (!g) {
      cx += SPACE_W * size + GAP * size;
      continue;
    }
    const gw = (g.w + weight) * size;
    const b = builder();
    for (const s of g.s) {
      b.moveTo(cx + sw / 2 + s[0] * size, y + sw / 2 + s[1] * (size - sw));
      for (let i = 2; i < s.length; i += 2) b.lineTo(cx + sw / 2 + s[i] * size, y + sw / 2 + s[i + 1] * (size - sw));
    }
    const path = b.build();
    if (paper) {
      const tilt = (rnd() - 0.5) * 9;
      const lift = (rnd() - 0.5) * size * 0.08;
      c.save();
      c.rotate(tilt, cx + gw / 2, y + size / 2);
      c.translate(0, lift);
      c.save();
      c.translate(size * 0.05, size * 0.07);
      c.drawPath(path, stroke(alpha(o.shadow ?? NIGHT.ink, 0.55), sw, false));
      c.restore();
      // The cut edge: a darker rim round the strip.
      c.drawPath(path, stroke(o.edge ?? NIGHT.paperEdge, sw, false));
      c.drawPath(path, stroke(color, Math.max(0.3, sw - Math.max(0.5, sw * 0.18)), false));
      c.restore();
    } else {
      c.drawPath(path, stroke(color, sw));
    }
    cx += gw + GAP * size;
  }
  return total;
}
