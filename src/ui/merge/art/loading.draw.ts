/**
 * The loading screen's pieces (spec 4.6): the street at dusk, a wire whose lanterns light one by one
 * as loading proceeds, and the name in paper-cut letters. The name is passed in (game.json
 * `app.displayName`); nothing here holds words.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawLantern } from './lantern.draw';
import { drawLetters, lettersWidth } from './letters';
import { NIGHT, alpha } from './palette';
import { at, builder, fill, glow, linearPaint, rrect, stroke, INK } from './pen';
import { drawStreet } from './street.draw';

/** Lanterns on the loading wire. */
export const LOADING_LANTERNS = 7;

/**
 * The name in paper-cut letters, centred on x with the cap top at y, at the largest size up to
 * `size` that fits `maxW`. Returns the size used.
 */
export function drawPaperName(c: SkCanvas, text: string, x: number, y: number, size: number, maxW = Infinity): number {
  const s = Math.min(size, (size * maxW) / Math.max(1, lettersWidth(text, size)));
  drawLetters(c, text, x, y, { size: s, style: 'paper', color: NIGHT.paperLight, align: 'center', seed: 11 });
  return s;
}

/** The loading wire across w at height y: `lit` of LOADING_LANTERNS glow (left first), the next one flickering by `flicker` 0..1. */
export function drawLoadingWire(c: SkCanvas, w: number, y: number, lit: number, flicker = 0): void {
  const n = LOADING_LANTERNS;
  const x0 = w * 0.08;
  const x1 = w * 0.92;
  const sag = 16;
  c.drawPath(builder().moveTo(x0 - 20, y - 6).quadTo(w / 2, y + sag * 2, x1 + 20, y - 6).build(), stroke(alpha(INK, 0.95), 1.4));
  const r = Math.min(12, w / 30);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const lx = x0 + (x1 - x0) * t;
    const ly = y - 6 + (sag * 2 + 6) * 2 * t * (1 - t) * 1.0;
    const on = i < lit;
    const next = i === lit && flicker > 0;
    at(c, lx, ly + r * 2, 1, 0, (q) => drawLantern(q, r, { look: on || next ? 'lit' : 'unlit', cord: r * 0.6, glow: next ? flicker * 0.6 : 1 }));
  }
}

/**
 * The whole loading screen, w x h from the top left: the street at dusk filling the screen, the
 * wire of lanterns lit to `progress` (0..1), the name in paper-cut letters under it.
 */
export function drawLoadingScreen(c: SkCanvas, w: number, h: number, progress: number, name: string): void {
  c.drawRect({ x: 0, y: 0, width: w, height: h }, fill(NIGHT.indigo));
  at(c, 0, h * 0.5, 1, 0, (q) => drawStreet(q, w, h * 0.5, { band: h * 0.22, lanterns: 0, seed: 5 }));
  c.drawRect({ x: 0, y: 0, width: w, height: h * 0.5 }, linearPaint(0, 0, 0, h * 0.5, [NIGHT.indigoDeep, NIGHT.dusk], [0, 1]));
  glow(c, w / 2, h * 0.34, w * 0.5, NIGHT.amber, 0.12);
  const p = Math.max(0, Math.min(1, progress));
  const lit = Math.floor(p * LOADING_LANTERNS + 1e-9);
  drawLoadingWire(c, w, h * 0.2, lit, p * LOADING_LANTERNS - lit);
  drawPaperName(c, name, w / 2, h * 0.36, Math.min(54, w / 7), w * 0.86);
  c.drawPath(rrect(w * 0.3, h * 0.36 + Math.min(54, w / 7) * 1.35, w * 0.4, 2, 1), fill(alpha(NIGHT.brass, 0.6)));
}
