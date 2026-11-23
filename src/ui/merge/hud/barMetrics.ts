/**
 * The bars' text metrics (spec 4.1 "Text", AGENTS.md fixed-height rule): every font in the top bar
 * (40 pt), the goal line (20 pt) and the bottom row (48 pt) is sized by hand from the font scale
 * (the text itself has allowFontScaling={false}), in rows whose heights add up inside the bar, with
 * no negative margins; the purse (a RollingNumber) gets a box height, never a lineHeight. Widths are
 * estimated from the text with generous per-glyph widths, so a computed width never clips: the season
 * chip shortens to the Festival count before anything wraps (M35), the goal line's words are
 * truncated by a computed width (2.10).
 *
 * Pure: no React, no react-native. Owned by the bars package (BARS, 7a). Tested in barMetrics.test.ts.
 */

const clamp = (lo: number, hi: number, x: number) => Math.min(hi, Math.max(lo, x));

/** The font scale the bars honour: the phone's setting, clamped to 0.85 to 1.35 (1.3 is the checked size). */
export function barScale(fontScale: number): number {
  return clamp(0.85, 1.35, Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1);
}

/** A line's height for a font, in pt (the system face's line is about 1.2 em; a little room above it). */
export const LINE_EM = 1.25;
export const lineOf = (font: number) => Math.ceil(font * LINE_EM);

/**
 * The width of `text` at `font` pt, generously: digits 0.6 em, capitals 0.7, lower case 0.55 (0.3
 * for i, l, t, f, j, r), spaces 0.3, narrow punctuation 0.32, anything else (×, ·, →, …) 0.7. Bold
 * text adds 6 %. An estimate made never to be short of the real width.
 */
export function textWidth(text: string, font: number, bold = false): number {
  let em = 0;
  for (const ch of text) {
    if (/[0-9]/.test(ch)) em += 0.6;
    else if (/[A-Z]/.test(ch)) em += ch === 'M' || ch === 'W' ? 0.85 : ch === 'I' ? 0.32 : 0.7;
    else if (/[iltfjr]/.test(ch)) em += 0.32;
    else if (/[mw]/.test(ch)) em += 0.85;
    else if (/[a-z]/.test(ch)) em += 0.56;
    else if (ch === ' ') em += 0.3;
    else if (/[.,:;'!|]/.test(ch)) em += 0.32;
    else if (/[-/()%]/.test(ch)) em += 0.42;
    else em += 0.7;
  }
  return Math.ceil(em * font * (bold ? 1.06 : 1));
}

// ----------------------------------------------------------------------------- the top bar (40)

export const TOP_BAR_H = 40;
/** Side gutter of the bars. */
export const BAR_GUTTER = 8;
/** A square button of the top bar (the gift bag, the menu): 44 wide, the bar's height; its hit slop makes 44 tall. */
export const TOP_BUTTON = 44;
export const TOP_GAP = 6;
/** The coin before the purse. */
export const PURSE_ICON = 22;

export interface TopBarMetrics {
  scale: number;
  purseFont: number;
  /** The purse's box: as tall as its own line, centred in the bar. */
  purseBox: number;
  purseTop: number;
  /** The width the purse's text gets (the longest of its current text and a 6-glyph floor, so small changes never move the bar). */
  purseW: number;
  /** The season chip's room and its form: the season over the count (two rows), or the count alone (one row). */
  chipX: number;
  chipW: number;
  chipFont: number;
  chipRows: 1 | 2;
  chipRowH: number;
  chipTop: number;
  /** The chip's text(s), shortened to fit. */
  chipText: string[];
  /** Buttons from the right: menu, then the gift bag (when boxes wait). */
  menuX: number;
  bagX: number | null;
  iconSize: number;
  badgeFont: number;
}

/**
 * The top bar at width `w`: the purse on the left, then the season chip, then (only while boxes
 * wait, M35) the gift bag, then the menu. `purseText` is what the purse shows now (format.ts's short
 * form); `season` the season's name and `count` the Festival count text.
 */
export function topBarMetrics(w: number, fontScale: number, purseText: string, season: string, count: string, bag: boolean): TopBarMetrics {
  const scale = barScale(fontScale);
  const purseFont = Math.min(Math.round(19 * scale), Math.floor((TOP_BAR_H - 4) / 1.2));
  const purseBox = Math.ceil(purseFont * 1.2);
  const purseTop = Math.floor((TOP_BAR_H - purseBox) / 2);
  const glyphs = Math.max(6, purseText.length);
  const purseW = Math.max(textWidth(purseText, purseFont, true), Math.ceil(glyphs * 0.62 * purseFont));
  const menuX = w - BAR_GUTTER - TOP_BUTTON;
  const bagX = bag ? menuX - TOP_BUTTON : null;
  const chipX = BAR_GUTTER + PURSE_ICON + 4 + purseW + TOP_GAP;
  const chipW = Math.max(0, (bagX ?? menuX) - TOP_GAP - chipX);
  // Two rows of 11 pt (14.4 at 1.3) add up to at most 36 of the bar's 40.
  let chipFont = Math.min(Math.round(11 * scale * 10) / 10, Math.floor(((TOP_BAR_H - 4) / 2 / LINE_EM) * 10) / 10);
  let chipRows: 1 | 2 = 2;
  let chipText = [season, count];
  if (Math.max(textWidth(season, chipFont, true), textWidth(count, chipFont)) > chipW) {
    // M35: the chip shortens to the Festival count before anything wraps; one row, a little larger.
    chipRows = 1;
    chipText = [count];
    chipFont = Math.min(Math.round(12 * scale * 10) / 10, Math.floor((chipW / Math.max(1, textWidth(count, 1))) * 10) / 10);
  }
  const chipRowH = lineOf(chipFont);
  const chipTop = Math.floor((TOP_BAR_H - chipRows * chipRowH) / 2);
  const iconSize = Math.min(28, Math.round(24 * Math.min(1.15, scale)));
  const badgeFont = Math.min(13, Math.round(10 * scale));
  return { scale, purseFont, purseBox, purseTop, purseW, chipX, chipW, chipFont, chipRows, chipRowH, chipTop, chipText, menuX, bagX, iconSize, badgeFont };
}

// ----------------------------------------------------------------------------- the goal line (20)

export const GOAL_H = 20;

export interface GoalMetrics {
  font: number;
  /** The words' width (truncated with an ellipsis past it), the price's and the estimate's. */
  wordsW: number;
  priceW: number;
  estW: number;
  /** Whether the estimate is shown (dropped first when the line is too narrow for words of 80 pt). */
  showEst: boolean;
}

/** The goal line's parts at width `w`: words, then " · price", then " · about 20 s"; the words shrink first (2.10). */
export function goalMetrics(w: number, fontScale: number, words: string, price: string, est: string, chevron: number): GoalMetrics {
  const scale = barScale(fontScale);
  const font = Math.min(Math.round(12 * scale * 10) / 10, Math.floor((GOAL_H / LINE_EM) * 10) / 10);
  const sep = textWidth(' · ', font);
  const priceW = price ? textWidth(price, font, true) + sep + 2 + Math.ceil(font) : 0;
  let estW = est ? textWidth(est, font) + sep : 0;
  const room = w - 2 * BAR_GUTTER - chevron;
  let showEst = !!est;
  if (showEst && room - priceW - estW < 80) {
    showEst = false;
    estW = 0;
  }
  const wordsW = Math.max(0, Math.min(textWidth(words, font, true) + 2, room - priceW - estW));
  return { font, wordsW, priceW, estW, showEst };
}

// ----------------------------------------------------------------------------- the bottom row (48)

export const BOTTOM_H = 48;

export interface ButtonMetrics {
  iconSize: number;
  iconTop: number;
  labelFont: number;
  labelTop: number;
  labelH: number;
}

/** A bottom-row button of width `w` (the Basket 68, the others 64): an icon over its label, rows adding up to 48. */
export function buttonMetrics(w: number, fontScale: number, label: string): ButtonMetrics {
  const scale = barScale(fontScale);
  const want = Math.round(10.5 * scale * 10) / 10;
  const fit = Math.floor(((w - 6) / Math.max(1, textWidth(label, 1, true))) * 10) / 10;
  const labelFont = Math.max(8, Math.min(want, fit, 13));
  const labelH = lineOf(labelFont);
  const iconSize = Math.min(26, BOTTOM_H - 6 - labelH - 2);
  const iconTop = Math.max(2, Math.floor((BOTTOM_H - labelH - 2 - iconSize) / 2));
  const labelTop = iconTop + iconSize + 2;
  return { iconSize, iconTop, labelFont, labelTop, labelH };
}
