/**
 * How wide a money amount can get, so the cash counter can use the largest font that still fits.
 * The counter rolls: its digits change many times a second while its shape ("$00.00T") stays, so
 * the width that matters is the widest text of that shape.
 */
import type { FontMetrics } from '../../config/game';

/** Width per character, in font sizes, when the font's real widths are not known. Deliberately wide. */
export const GUESS_EM = 0.74;

/**
 * Width, in font sizes, of the widest text shaped like `text`: every digit counts as the font's
 * widest digit, every other character as itself. Without `metrics` (no display font: the system
 * font draws the text), or for a character the font does not have, a cautious guess.
 */
export function widestEm(text: string, metrics: FontMetrics | null): number {
  const chars = Array.from(text);
  if (!metrics) return chars.length * GUESS_EM;
  const adv = metrics.advances;
  let digit = 0;
  for (const d of '0123456789') digit = Math.max(digit, adv[d] ?? GUESS_EM);
  let sum = 0;
  for (const ch of chars) sum += ch >= '0' && ch <= '9' ? digit : (adv[ch] ?? GUESS_EM);
  return sum;
}

/** Air kept when fitting: text shaping differs by a hair between platforms, and a clipped amount is worse than a slightly smaller one. */
const FIT_MARGIN = 1.03;

/** True when a text `em` font sizes wide fits into `width` points at font size `size`. */
export function fitsAt(em: number, width: number, size: number): boolean {
  return em * FIT_MARGIN * size <= width - 1;
}

/** The largest whole font size at which a text `em` font sizes wide fits into `width` points, within `min` and `max`. */
export function fitFont(em: number, width: number, min: number, max: number): number {
  if (!(width > 0) || !(em > 0)) return max;
  return Math.max(min, Math.min(max, Math.floor((width - 1) / (em * FIT_MARGIN))));
}
