/**
 * The overlay frames' geometry (yard-stage1.md 4.3 and 4.5), pure so the tests can hold it to the
 * specification's numbers at 844 × 390 and 667 × 375, at font scale 1.0 and 1.3:
 * - the right panel: min(520, 0.58 W) on a wide phone (489 at 844), 0.62 W on a small one (413 at 667),
 *   from the top bar to the bottom inset, the place dimmed at its left;
 * - the wide card (the process board): the safe width less 12 pt a side (726 at 844, 611 at 667);
 * - the centred card: at most 520 × 300.
 * The safe area reads the insets on all four sides; where an inset is under 16 pt the 16 pt margin of
 * 4.1 stands in for it (the 667 phone has no insets). Text is sized by hand from
 * min(fontScale, 1.3) (`allowFontScaling={false}`), never under 11 pt.
 */
import { hudLayout } from '../hud/metrics';

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Type sizes of the frames at font scale 1 (4.3, 4.5, yard-style 8). */
export const TYPE = {
  title: 15,
  name: 13,
  line: 11,
  price: 13,
  tab: 13,
  plateName: 12,
  plateLine: 11,
  greyName: 11,
} as const;

/** The smallest text anywhere (4.6). */
export const MIN_PT = 11;
/** The margin of 4.1 where an inset is smaller. */
export const MARGIN = 16;
/** The panel's row (4.3): 44 pt at font scale 1; at 1.3 it grows to hold its two lines (31 pt of text) and its padding. */
export const ROW_H = 44;
/** The Buy button (4.3). */
export const BUY_W = 96;
export const BUY_H = 36;
/** A button grows with its text to at most this (the lead's ruling, 15:55: verb and price, "Level up §420"). */
export const BUY_MAX = 136;
/** The title row and the tab strip of a panel or card. */
export const TITLE_H = 32;
export const TAB_H = 32;
/** The padding inside a frame. */
export const PAD = 14;

/** The top bar's bottom edge (4.1: 36 at 844 × 390, 34 at 667 × 375): the bars engineer's layout. */
export function barBottom(width: number, height: number, insets: Insets): number {
  const h = hudLayout(width, height, insets);
  return h.barY + h.rows.bar;
}

/** The font scale the frames use: the system's, at most 1.3 (4.1), never below 1. */
export function frameScale(fontScale: number): number {
  if (!Number.isFinite(fontScale)) return 1;
  return Math.max(1, Math.min(1.3, fontScale));
}

/** A type size at the frames' scale, never under 11 pt. */
export function pt(size: number, fs: number): number {
  return Math.max(MIN_PT, Math.round(size * fs * 2) / 2);
}

/** A row's height at a font scale: 44 pt, or the two lines and 7 pt above and below them when larger. */
export function rowHeight(fs: number): number {
  const text = Math.ceil(pt(TYPE.name, fs) * 1.25 + pt(TYPE.line, fs) * 1.25);
  return Math.max(ROW_H, text + 12);
}

export interface FrameLayout {
  fs: number;
  /** The window's width and height. */
  width: number;
  height: number;
  /** The safe area with 4.1's margins (where the frames may put text). */
  safe: Box;
  /** The band the overlays live in: from under the top bar to the bottom inset. */
  band: { top: number; bottom: number; height: number };
  /** The right panel (its box reaches the screen's right edge; `padRight` keeps text inside the inset). */
  panel: Box & { padRight: number };
  /** The wide card. */
  wide: Box;
  /** The centred card's largest box. */
  centred: Box;
}

export function frameLayout(width: number, height: number, insets: Insets, fontScale = 1): FrameLayout {
  const fs = frameScale(fontScale);
  const left = Math.max(insets.left, MARGIN);
  const right = Math.max(insets.right, MARGIN);
  const bottomEdge = Math.max(insets.bottom, MARGIN);
  const safe = { x: left, y: insets.top, w: width - left - right, h: height - insets.top - insets.bottom };
  const top = barBottom(width, height, insets);
  const bottom = height - bottomEdge;
  const band = { top, bottom, height: bottom - top };
  const pw = width >= 736 ? Math.min(520, Math.floor(0.58 * width)) : Math.floor(0.62 * width);
  const panel = { x: width - pw, y: top, w: pw, h: band.height, padRight: Math.max(insets.right, PAD) };
  const wide = { x: left + 12, y: top, w: safe.w - 24, h: band.height };
  const cw = Math.min(520, safe.w - 24);
  const ch = Math.min(300, band.height);
  const centred = { x: Math.round(left + (safe.w - cw) / 2), y: Math.round(top + (band.height - ch) / 2), w: cw, h: ch };
  return { fs, width, height, safe, band, panel, wide, centred };
}

/** The process board's plates (4.5): sizes at 844 and at 667. */
export interface BoardLayout {
  plateW: number;
  plateH: number;
  greyW: number;
  barW: number;
  rowGap: number;
  title: number;
  /** The four rows and three gaps plus the title (308 pt), which must fit the band. */
  total: number;
}

export function boardLayout(width: number): BoardLayout {
  const wide = width >= 736;
  const plateH = 60;
  const rowGap = 12;
  const title = 32;
  return { plateW: wide ? 132 : 120, plateH, greyW: wide ? 108 : 112, barW: wide ? 24 : 20, rowGap, title, total: 4 * plateH + 3 * rowGap + title };
}

/**
 * Up to `lines` lines of at most `perLine` characters, broken at spaces (the plates' names: two of 12,
 * a greyed plate's three of 11). A word longer than a line stays whole on its own line.
 */
export function breakLines(text: string, perLine: number, lines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    const last = out[out.length - 1];
    if (last !== undefined && last.length + 1 + w.length <= perLine) out[out.length - 1] = `${last} ${w}`;
    else out.push(w);
  }
  if (out.length <= lines) return out;
  return [...out.slice(0, lines - 1), out.slice(lines - 1).join(' ')];
}
