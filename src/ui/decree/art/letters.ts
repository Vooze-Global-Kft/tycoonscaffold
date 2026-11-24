/**
 * Hand lettering without a font file: capitals, digits and a few signs as pen strokes, for the
 * words that belong to a drawing rather than to the interface: the loading card's motto, the
 * screenshot template's violet caption (7.9 "signature"), chalk figures on the tally board, the
 * in-tray's count, the drawer's counter. The words come from the caller (game.json, strings.ts);
 * this file holds shapes only.
 *
 * Each glyph is a list of strokes in a box 1 tall (0 = cap top, 1 = baseline) and `w` wide.
 * Styles: 'nib' (a broad pen at a fixed angle, slanted, a slight seeded waver: the mayor's hand),
 * 'chalk' (a rough doubled line, election night), 'print' (round-ended even strokes, small figures).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha } from './palette';
import { builder, fill, nibPath, sampleCurve, seeded, stroke } from './pen';

type Stroke = number[];
interface Glyph {
  w: number;
  s: Stroke[];
  /** Strokes drawn as smooth curves (true) or as straight segments. */
  round?: boolean;
}

const G: Record<string, Glyph> = {
  A: { w: 0.7, s: [[0, 1, 0.33, 0, 0.7, 1], [0.13, 0.62, 0.58, 0.6]] },
  B: { w: 0.62, s: [[0.02, 1, 0.02, 0], [0.02, 0, 0.42, 0, 0.56, 0.12, 0.54, 0.34, 0.38, 0.47, 0.02, 0.48], [0.3, 0.47, 0.6, 0.6, 0.62, 0.84, 0.46, 1, 0.02, 1]], round: true },
  C: { w: 0.64, s: [[0.62, 0.16, 0.44, 0.01, 0.16, 0.06, 0.02, 0.4, 0.06, 0.78, 0.3, 0.99, 0.56, 0.94, 0.66, 0.82]], round: true },
  D: { w: 0.66, s: [[0.03, 0, 0.03, 1], [0.03, 0, 0.4, 0.02, 0.64, 0.3, 0.62, 0.72, 0.38, 0.98, 0.03, 1]], round: true },
  E: { w: 0.56, s: [[0.56, 0.01, 0.03, 0, 0.03, 1, 0.56, 0.99], [0.03, 0.49, 0.44, 0.5]] },
  F: { w: 0.54, s: [[0.54, 0.01, 0.03, 0, 0.03, 1], [0.03, 0.5, 0.42, 0.5]] },
  G: { w: 0.68, s: [[0.62, 0.15, 0.44, 0.01, 0.16, 0.06, 0.02, 0.42, 0.08, 0.8, 0.32, 0.99, 0.6, 0.92, 0.68, 0.6, 0.38, 0.6]], round: true },
  H: { w: 0.64, s: [[0.02, 0, 0.02, 1], [0.62, 0, 0.62, 1], [0.02, 0.5, 0.62, 0.48]] },
  I: { w: 0.16, s: [[0.08, 0, 0.08, 1]] },
  J: { w: 0.5, s: [[0.48, 0, 0.48, 0.74, 0.36, 0.97, 0.14, 0.98, 0.0, 0.82]], round: true },
  K: { w: 0.62, s: [[0.03, 0, 0.03, 1], [0.6, 0, 0.04, 0.58], [0.24, 0.42, 0.62, 1]] },
  L: { w: 0.52, s: [[0.03, 0, 0.03, 1, 0.52, 0.98]] },
  M: { w: 0.8, s: [[0.02, 1, 0.06, 0, 0.4, 0.66, 0.74, 0, 0.78, 1]] },
  N: { w: 0.66, s: [[0.03, 1, 0.03, 0, 0.63, 1, 0.63, 0]] },
  O: { w: 0.72, s: [[0.36, 0, 0.08, 0.14, 0.02, 0.52, 0.16, 0.9, 0.4, 1, 0.64, 0.84, 0.7, 0.42, 0.56, 0.1, 0.34, 0.01]], round: true },
  P: { w: 0.6, s: [[0.03, 1, 0.03, 0], [0.03, 0, 0.42, 0.01, 0.58, 0.16, 0.56, 0.38, 0.38, 0.52, 0.03, 0.53]], round: true },
  Q: { w: 0.74, s: [[0.36, 0, 0.08, 0.14, 0.02, 0.52, 0.16, 0.9, 0.4, 1, 0.64, 0.84, 0.7, 0.42, 0.56, 0.1, 0.34, 0.01], [0.42, 0.7, 0.74, 1.04]], round: true },
  R: { w: 0.62, s: [[0.03, 1, 0.03, 0], [0.03, 0, 0.42, 0.01, 0.58, 0.16, 0.56, 0.38, 0.38, 0.52, 0.03, 0.53], [0.28, 0.53, 0.62, 1]], round: true },
  S: { w: 0.6, s: [[0.56, 0.12, 0.38, 0.0, 0.12, 0.04, 0.04, 0.24, 0.16, 0.44, 0.46, 0.56, 0.58, 0.78, 0.44, 0.98, 0.14, 0.98, 0.0, 0.86]], round: true },
  T: { w: 0.64, s: [[0, 0.01, 0.64, 0], [0.32, 0, 0.32, 1]] },
  U: { w: 0.64, s: [[0.02, 0, 0.02, 0.66, 0.12, 0.92, 0.32, 1, 0.52, 0.92, 0.62, 0.66, 0.62, 0]], round: true },
  V: { w: 0.66, s: [[0, 0, 0.33, 1, 0.66, 0]] },
  W: { w: 0.92, s: [[0, 0, 0.2, 1, 0.46, 0.36, 0.7, 1, 0.92, 0]] },
  X: { w: 0.62, s: [[0, 0, 0.62, 1], [0.62, 0, 0, 1]] },
  Y: { w: 0.64, s: [[0, 0, 0.32, 0.5, 0.64, 0], [0.32, 0.5, 0.32, 1]] },
  Z: { w: 0.6, s: [[0.02, 0.01, 0.6, 0, 0, 1, 0.6, 0.99]] },
  '0': { w: 0.58, s: [[0.29, 0, 0.06, 0.16, 0.02, 0.54, 0.12, 0.9, 0.3, 1, 0.5, 0.88, 0.56, 0.46, 0.48, 0.12, 0.28, 0.0]], round: true },
  '1': { w: 0.36, s: [[0.02, 0.2, 0.3, 0, 0.3, 1]] },
  '2': { w: 0.58, s: [[0.02, 0.2, 0.18, 0.02, 0.42, 0.02, 0.56, 0.2, 0.48, 0.44, 0.02, 1, 0.58, 0.99]], round: false },
  '3': { w: 0.58, s: [[0.04, 0.1, 0.26, 0, 0.5, 0.06, 0.54, 0.26, 0.3, 0.46], [0.3, 0.46, 0.56, 0.6, 0.56, 0.86, 0.36, 1, 0.1, 0.98, 0.0, 0.88]], round: true },
  '4': { w: 0.62, s: [[0.46, 1, 0.46, 0, 0.0, 0.66, 0.62, 0.66]] },
  '5': { w: 0.58, s: [[0.54, 0.01, 0.1, 0, 0.06, 0.44, 0.3, 0.38, 0.52, 0.5, 0.58, 0.76, 0.44, 0.97, 0.16, 1, 0.0, 0.9]], round: false },
  '6': { w: 0.58, s: [[0.5, 0.04, 0.26, 0.02, 0.06, 0.3, 0.02, 0.7, 0.14, 0.96, 0.36, 1, 0.54, 0.84, 0.54, 0.6, 0.34, 0.46, 0.12, 0.52, 0.03, 0.66]], round: true },
  '7': { w: 0.56, s: [[0, 0.01, 0.56, 0, 0.18, 1]] },
  '8': { w: 0.58, s: [[0.29, 0.47, 0.08, 0.32, 0.1, 0.08, 0.3, 0, 0.5, 0.08, 0.5, 0.3, 0.29, 0.47, 0.04, 0.66, 0.08, 0.92, 0.3, 1, 0.52, 0.92, 0.56, 0.66, 0.29, 0.47]], round: true },
  '9': { w: 0.58, s: [[0.54, 0.34, 0.44, 0.48, 0.2, 0.5, 0.04, 0.32, 0.1, 0.06, 0.3, 0.0, 0.5, 0.08, 0.56, 0.34, 0.52, 0.7, 0.36, 0.96, 0.08, 0.96]], round: true },
  '.': { w: 0.16, s: [[0.08, 0.95, 0.08, 0.98]] },
  ',': { w: 0.16, s: [[0.1, 0.92, 0.04, 1.12]] },
  ':': { w: 0.16, s: [[0.08, 0.34, 0.08, 0.37], [0.08, 0.94, 0.08, 0.97]] },
  "'": { w: 0.14, s: [[0.08, 0, 0.06, 0.24]] },
  '-': { w: 0.4, s: [[0.04, 0.56, 0.36, 0.55]] },
  '−': { w: 0.44, s: [[0.04, 0.56, 0.4, 0.55]] },
  '+': { w: 0.5, s: [[0.04, 0.56, 0.46, 0.55], [0.25, 0.34, 0.25, 0.78]] },
  '/': { w: 0.44, s: [[0.42, 0, 0.02, 1]] },
  '%': { w: 0.7, s: [[0.64, 0.02, 0.06, 0.98], [0.14, 0.04, 0.04, 0.16, 0.14, 0.3, 0.26, 0.16, 0.14, 0.04], [0.56, 0.7, 0.46, 0.82, 0.56, 0.96, 0.68, 0.82, 0.56, 0.7]], round: true },
  '&': { w: 0.66, s: [[0.66, 1, 0.16, 0.42, 0.12, 0.16, 0.3, 0.0, 0.46, 0.14, 0.4, 0.34, 0.06, 0.62, 0.08, 0.9, 0.3, 1, 0.52, 0.88, 0.64, 0.62]], round: true },
  '(': { w: 0.28, s: [[0.26, -0.04, 0.06, 0.3, 0.06, 0.7, 0.26, 1.04]], round: true },
  ')': { w: 0.28, s: [[0.02, -0.04, 0.22, 0.3, 0.22, 0.7, 0.02, 1.04]], round: true },
  '!': { w: 0.16, s: [[0.08, 0, 0.08, 0.68], [0.08, 0.95, 0.08, 0.98]] },
  '?': { w: 0.5, s: [[0.02, 0.16, 0.2, 0.0, 0.42, 0.04, 0.48, 0.24, 0.26, 0.46, 0.24, 0.7], [0.24, 0.95, 0.24, 0.98]], round: true },
  '·': { w: 0.2, s: [[0.1, 0.55, 0.1, 0.58]] },
  '→': { w: 0.7, s: [[0.02, 0.56, 0.66, 0.55], [0.46, 0.38, 0.68, 0.55, 0.46, 0.72]] },
};

export type LetterStyle = 'nib' | 'chalk' | 'print';

export interface LetterOptions {
  /** Cap height in points. */
  size: number;
  style?: LetterStyle;
  color?: string;
  /** Slant (shear of x by y); 'nib' defaults to 0.18. */
  slant?: number;
  /** Space between letters, in cap heights. */
  tracking?: number;
  /** Stroke weight in cap heights ('nib': the nib's width). */
  weight?: number;
  seed?: number;
}

const SPACE = 0.36;

/** Width of `text` in points at these options (unknown characters count as a space). */
export function lettersWidth(text: string, o: LetterOptions): number {
  const tr = o.tracking ?? 0.14;
  let w = 0;
  for (const ch of text.toUpperCase()) w += ((G[ch]?.w ?? SPACE) + tr) * o.size;
  return Math.max(0, w - tr * o.size);
}

/**
 * Draws `text` (upper-cased; letters, digits and the signs above) with its baseline-left at (x, y).
 * Returns the width drawn.
 */
export function drawLetters(c: SkCanvas, text: string, x: number, y: number, o: LetterOptions): number {
  const style = o.style ?? 'print';
  const size = o.size;
  const color = o.color ?? (style === 'chalk' ? DESK.chalkLine : style === 'nib' ? DESK.violet : DESK.line);
  const slant = o.slant ?? (style === 'nib' ? 0.18 : 0);
  const tr = o.tracking ?? 0.14;
  const weight = o.weight ?? (style === 'nib' ? 0.16 : style === 'chalk' ? 0.11 : 0.12);
  const rnd = seeded(o.seed ?? 7);
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = G[ch];
    if (!g) {
      cx += (SPACE + tr) * size;
      continue;
    }
    const jitter = style === 'print' ? 0 : 0.035;
    const dy = (rnd() - 0.5) * jitter * size;
    for (const s of g.s) {
      const pts: [number, number][] = [];
      for (let i = 0; i < s.length; i += 2) {
        const gx = s[i] + (style === 'print' ? 0 : (rnd() - 0.5) * jitter);
        const gy = s[i + 1] + (style === 'print' ? 0 : (rnd() - 0.5) * jitter);
        const px = cx + gx * size + (1 - gy) * slant * size;
        const py = y - size + gy * size + dy;
        pts.push([px, py]);
      }
      if (pts.length === 2 && Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) < size * 0.06) {
        c.drawPath(builder().addCircle(pts[0][0], pts[0][1], weight * size * 0.62).build(), fill(color));
        continue;
      }
      if (style === 'nib') {
        const dense = g.round ? sampleCurve(pts, size * 0.04) : densify(pts, size * 0.05);
        c.drawPath(nibPath(dense, weight * size, -38), fill(color));
      } else {
        const b = builder();
        if (g.round && pts.length > 2) {
          const d = sampleCurve(pts, size * 0.05);
          b.moveTo(d[0], d[1]);
          for (let i = 2; i < d.length; i += 2) b.lineTo(d[i], d[i + 1]);
        } else {
          b.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1]);
        }
        const path = b.build();
        if (style === 'chalk') {
          c.drawPath(path, stroke(alpha(color, 0.55), weight * size * 1.35));
          c.save();
          c.translate(size * 0.02, -size * 0.015);
          c.drawPath(path, stroke(color, weight * size * 0.7));
          c.restore();
        } else c.drawPath(path, stroke(color, weight * size));
      }
    }
    cx += (g.w + tr) * size;
  }
  return cx - x - tr * size;
}

function densify(pts: [number, number][], step: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) out.push(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
  }
  out.push(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  return out;
}

/** True when every character of `text` has a glyph (or is a space). */
export function lettersCover(text: string): boolean {
  for (const ch of text.toUpperCase()) if (ch !== ' ' && !G[ch]) return false;
  return true;
}
