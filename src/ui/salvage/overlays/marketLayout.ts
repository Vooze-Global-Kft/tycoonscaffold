/**
 * Geometry of the market's cards (yard-stage1.md 4.4, 2.11; the overlays-b engineer's), pure so the
 * tests hold it to 667 × 375 and 844 × 390 at font scale 1.0 and 1.3:
 * - the price board's rows: a pictogram column, three lines of text (name; today's price and the day
 *   word; the five bars and the bay's stock), one more line where the bay has a reservation or a set
 *   aside lot, and one button slot at the right (Hold, Sell with its total, or Held), 96 to 136 × 36;
 * - the industry table's rows: one line each (rank, the 24 pt plate logo, the chip name, tonnes,
 *   "simulated"), all of one height, so ONE canvas draws the 26 logos beside them (AGENTS.md: never one
 *   Skia canvas per list row);
 * - the nine rung cells of the table's ladder.
 * Text is sized as the frames size it (./layout.ts `pt`, min(fontScale, 1.3), never under 11 pt).
 */
import { textW } from '../hud/metrics';
import { BUY_H, BUY_MAX, BUY_W, PAD, TYPE, pt, type FrameLayout } from './layout';

/** A line's height at a type size (the frames' Line uses ceil(size × 1.25)). */
export function lineH(size: number, fs: number): number {
  return Math.ceil(pt(size, fs) * 1.25);
}

/** The width of the text inside the right panel (its padding on both sides; the right inset). */
export function panelTextW(L: FrameLayout): number {
  return L.panel.w - PAD - L.panel.padRight;
}

// ------------------------------------------------------------------------------- the price board

/** The pictogram (yard-stage1.md 6.1: the grade's pictogram, drawn at this size on the board). */
export const PICTO = 20;
/** The five days' bars (4.4): their box, and the gap between them. */
export const BARS = { w: 40, h: 14, gap: 2 } as const;
/** How much a bar moves for a price away from the usual one: ±1/BAR_GAIN of it fills or empties the half box (posted prices move a few hundredths). */
export const BAR_GAIN = 12;
/** The day word chip's padding (low day, high day). */
export const CHIP_PAD = 6;
/** The board row's least height (4.4: two-line rows of 56 pt; ours three short lines and a 36 pt button). */
export const BOARD_ROW_MIN = 56;

export interface BoardRowLayout {
  /** The row's height (fixed for the row, so one canvas draws every pictogram at known offsets). */
  h: number;
  /** The text column's width. */
  textW: number;
  /** The button slot's width (the widest button the row can show). */
  slotW: number;
  /** Text lines: name, price, bars and stock, and the extra line (reservation, set aside). */
  lines: number;
}

/** The slot every row reserves for its button: wide enough for "Sell §1,115" at the scale, 96 to 136. */
export function boardSlotW(fs: number): number {
  return Math.min(BUY_MAX, Math.max(BUY_W, Math.ceil(textW('Sell §12,345', pt(TYPE.price, fs))) + 20));
}

/** One board row's geometry: `extra` true when the row prints a reservation or a set-aside lot. */
export function boardRow(L: FrameLayout, extra: boolean): BoardRowLayout {
  const fs = L.fs;
  const lines = extra ? 4 : 3;
  const text = lineH(TYPE.name, fs) + (lines - 1) * lineH(TYPE.line, fs);
  const h = Math.max(BOARD_ROW_MIN, text + 10, BUY_H + 12);
  const slotW = boardSlotW(fs);
  return { h, textW: panelTextW(L) - PICTO - 8 - slotW - 8, slotW, lines };
}

/** The top of each row in the list and the list's height (rows in order; `extras[i]` as boardRow's). */
export function boardOffsets(L: FrameLayout, extras: boolean[]): { tops: number[]; heights: number[]; total: number } {
  const tops: number[] = [];
  const heights: number[] = [];
  let y = 0;
  for (const e of extras) {
    const h = boardRow(L, e).h;
    tops.push(y);
    heights.push(h);
    y += h;
  }
  return { tops, heights, total: y };
}

/** A bar's height in the five-day chart: the usual price at mid-height, a day's step from it drawn BAR_GAIN times larger (a picture, not a number shown). */
export function barHeight(price: number, pbar: number, h = BARS.h): number {
  if (!(pbar > 0) || !(price > 0)) return 1;
  const k = h / 2 + (price / pbar - 1) * BAR_GAIN * (h / 2);
  return Math.max(1, Math.min(h, Math.round(k * 2) / 2));
}

// ------------------------------------------------------------------------------- the industry table

/** The "simulated" tag's size on a table row (never scaled: the smallest text, 4.6). */
export const SIM_PT = 11;
/** The right padding of the tonnes column (the card's inner margin, W12). */
export const TONNES_PAD = 8;
/** The plate logo of a table row (2.11: 24 pt). */
export const LOGO = 24;

export interface TableCols {
  rowH: number;
  rank: number;
  logo: number;
  name: number;
  tonnes: number;
  sim: number;
  gap: number;
}

/**
 * The table's columns: rank ("26th"), the logo, the chip name (≤ 14 characters), tonnes ("24.50 t" up to
 * "123,456.00 t"), "simulated"; the name column takes what is left.
 */
export function tableCols(L: FrameLayout): TableCols {
  const fs = L.fs;
  const p = pt(TYPE.name, fs);
  const gap = 5;
  // L8 / W12: the widest ordinal ("22nd", "26th") in BOLD on one line at font scale 1.3: the estimate
  // is a regular face's, so a fifth more for the bold digits and the ordinal's letters.
  const rank = Math.ceil(textW('26th', p) * 1.2) + 4;
  // The largest rival passes ten million tonnes by day 40 ("10,603,412 t"); bold, with the card's inner
  // margin at the right so the last digit is never clipped at the row's edge (W12).
  const tonnes = Math.ceil(textW('12,345,678 t', p) * 1.08) + TONNES_PAD;
  // "simulated" is a quiet tag at the smallest size (11 pt at every font scale), so a 14-character chip name fits at 667 and 1.3.
  const sim = Math.ceil(textW('simulated', SIM_PT));
  const rowH = Math.max(30, lineH(TYPE.name, fs) + 10, LOGO + 6);
  const name = panelTextW(L) - rank - LOGO - tonnes - sim - 4 * gap;
  return { rowH, rank, logo: LOGO, name, tonnes, sim, gap };
}

/** The ladder's nine cells (2.11: nine rungs, the current lit, the next with its gates). */
export function rungCells(L: FrameLayout, n = 9): { cell: number; gap: number } {
  const w = panelTextW(L);
  const gap = 4;
  const cell = Math.min(40, Math.floor((w - (n - 1) * gap) / n));
  return { cell, gap };
}
