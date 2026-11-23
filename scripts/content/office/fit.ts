/**
 * Does a string fit its box? (docs/design/office-design.md 4.1, 4.2.) The phone draws paper text at
 * 375 points wide with the system font scale capped at 1.3 (s = min(fontScale, 1.3)); every box of
 * the desk is sized for s = 1.3, so this file measures at 1.3.
 *
 * Widths come from a glyph-width table of the phone's system font (San Francisco Pro Text, the
 * iPhone's UI font): each character's advance as a fraction of the font size, compiled offline from
 * the font's published proportions (close to Helvetica's, a little wider at text sizes), with a
 * default for anything not in the table, and a 10 % safety margin on every width (4.2: "10 % margin
 * until calibrated once on a phone"). Wrapping is a greedy word wrap that may break after a hyphen,
 * as a Skia paragraph does; a single word wider than the box does not fit.
 *
 * The box sizes are the 4.1 / 4.2 numbers, read from the desk's own metrics where they exist
 * (src/ui/decree/paperMetrics.ts and layout.ts, owned by P6: font sizes, the photo, the paper's inner
 * width, the chip width, the proposal's lines, the bottom-row buttons); the rest (the 304 pt title
 * row, sheet widths, the Ledger, the map) are 4.1 / 4.2's numbers or this file's stated assumptions.
 * Pure: no file access.
 */
import { AT_13, CHIP_MAX_W, FONT, PHOTO } from '../../../src/ui/decree/paperMetrics';
import { BUTTON_W, FONT_SCALE_MAX, PAPER_INNER_W } from '../../../src/ui/decree/layout';

/** The font scale every box is sized for (4.1: s = min(fontScale, 1.3)). */
export const FONT_SCALE = FONT_SCALE_MAX;
/** The narrowest phone width the desk is laid out for. */
export const SCREEN_WIDTH = 375;
/** Safety margin on every measured width until calibrated on a phone (4.2). */
export const SAFETY = 1.1;

/**
 * Advances as fractions of the font size (SF Pro Text, approximate). Digits are tabular (the paper
 * uses tabular digits). Letters with accents are measured as their base letter.
 */
const ADV: Record<string, number> = {
  ' ': 0.27,
  a: 0.55, b: 0.6, c: 0.54, d: 0.6, e: 0.56, f: 0.34, g: 0.6, h: 0.59, i: 0.25, j: 0.25, k: 0.53, l: 0.25, m: 0.89,
  n: 0.59, o: 0.59, p: 0.6, q: 0.6, r: 0.37, s: 0.51, t: 0.35, u: 0.59, v: 0.53, w: 0.79, x: 0.52, y: 0.53, z: 0.52,
  A: 0.67, B: 0.65, C: 0.7, D: 0.71, E: 0.58, F: 0.56, G: 0.73, H: 0.73, I: 0.27, J: 0.51, K: 0.65, L: 0.55, M: 0.87,
  N: 0.73, O: 0.76, P: 0.62, Q: 0.76, R: 0.64, S: 0.61, T: 0.61, U: 0.72, V: 0.67, W: 0.97, X: 0.65, Y: 0.64, Z: 0.62,
  '0': 0.62, '1': 0.62, '2': 0.62, '3': 0.62, '4': 0.62, '5': 0.62, '6': 0.62, '7': 0.62, '8': 0.62, '9': 0.62,
  '.': 0.27, ',': 0.27, ':': 0.29, ';': 0.29, '!': 0.29, '?': 0.5, "'": 0.22, '"': 0.4, '’': 0.22, '‘': 0.22,
  '“': 0.4, '”': 0.4, '-': 0.38, '–': 0.55, '—': 1.0, '−': 0.62, '(': 0.35, ')': 0.35,
  '[': 0.35, ']': 0.35, '{': 0.35, '}': 0.35, '&': 0.69, '/': 0.38, '·': 0.27, '→': 0.8, '↑': 0.6,
  '↓': 0.6, '↩': 0.8, '×': 0.6, '%': 0.87, '+': 0.62, '=': 0.62, '#': 0.62, '@': 0.95, '*': 0.45,
  '…': 0.85, '£': 0.62, $: 0.62, _: 0.5, '<': 0.62, '>': 0.62, '|': 0.27, '~': 0.62,
};
/** Anything not in the table (a symbol, a letter of another script). */
export const DEFAULT_ADVANCE = 0.65;
/** Emoji and other wide pictographs. */
export const WIDE_ADVANCE = 1.2;

/** The advance of one character, as a fraction of the font size. */
export function advance(ch: string): number {
  const hit = ADV[ch];
  if (hit !== undefined) return hit;
  const base = ch.normalize('NFD').charAt(0);
  if (base !== ch && ADV[base] !== undefined) return ADV[base];
  const cp = ch.codePointAt(0) ?? 0;
  if (cp >= 0x1f000 || (cp >= 0x2600 && cp <= 0x27bf)) return WIDE_ADVANCE;
  return DEFAULT_ADVANCE;
}

/** Width in points of `text` at `fontSize` points, with the safety margin. */
export function measure(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) em += advance(ch);
  return em * fontSize * SAFETY;
}

/**
 * Bold rows (the visitor's name, the strip title row, a button label, the bottom row: DeskCanvas
 * draws them at fontWeight 700) are wider than the regular table: SF Pro Bold about 5 to 7 %, Inter
 * Bold 3 to 4 % (content-lint-attack.md M3). Measured with this factor on top of the margin.
 */
export const BOLD_FACTOR = 1.06;

/** A text box: font size in points at s = 1.3, width in points, lines allowed, optional char cap. */
export interface Box {
  /** Drawn bold: widths × BOLD_FACTOR. */
  bold?: boolean;
  /** The box is this file's assumption, not 4.1 / 4.2's or paperMetrics.ts's: a miss is a warning. */
  assumed?: boolean;
  font: number;
  width: number;
  lines: number;
  /** A character cap besides the width (the goal line's 34, 2.16). */
  maxChars?: number;
  /** Where the number comes from, for the writer. */
  what: string;
}

const s = FONT_SCALE;
/** Inner width of the paper (4.2: width 343, inner 315). */
export const PAPER_INNER = PAPER_INNER_W;
/** Inner width of a sheet at 375 (16 pt gutters, 16 pt padding). */
export const SHEET_INNER = 311;
/** Header: name and role sit right of the 44 pt oval photo with an 8 pt gap (4.2). */
export const HEADER_TEXT = PAPER_INNER - PHOTO.w - 8;
/** The SIGN / STUDY title row (4.2: "IF SIGNED ↑ · Poll 3 → 4 of 5 ↩" ≤ 304 pt). */
export const TITLE_ROW = 304;
/** What the title row holds besides a label, at its widest. */
export const TITLE_ROW_TAIL = ' ↑ · Poll 3 → 4 of 5 ↩';
/** What the title row of an event's strip holds besides its label (no ↩: settlements and scandals schedule nothing). */
export const EVENT_TITLE_TAIL = ' ↑ · Poll 3 → 4 of 5';

/** The boxes of 4.1 and 4.2, and of the sheets that show written lines. */
export const BOXES = {
  /** 4.2: proposal, 4 lines at 16 × s (line 26) in 315. */
  proposal: { font: FONT.proposal * s, width: PAPER_INNER, lines: AT_13.proposalLines, what: 'the proposal: 4 lines at 20.8 pt in 315 pt (4.2)' },
  /** A Clerk's note on a form: the form's own line takes the first two lines of the proposal box. */
  formNote: { font: FONT.proposal * s, width: PAPER_INNER, lines: 2, what: "a Clerk's note: the 2 proposal lines left under the form line" },
  /** 4.2 header: name at 15 × s. */
  name: { bold: true, font: FONT.name * s, width: HEADER_TEXT, lines: 1, maxChars: 24, what: 'a visitor name: 1 line at 19.5 pt in 263 pt, at most 24 characters (2.7)' },
  /** 4.2 header: role (and badge) at 13 × s. */
  role: { font: FONT.role * s, width: HEADER_TEXT, lines: 1, maxChars: 28, what: 'a role line: 1 line at 16.9 pt in 263 pt, at most 28 characters (2.7)' },
  /** 4.2: a chip ≤ 151 pt at 15 × s; a wide chip fills a row. */
  chip: { font: FONT.chip * s, width: CHIP_MAX_W, lines: 1, what: 'a chip: 151 pt at 19.5 pt (4.2)' },
  chipWide: { font: FONT.chip * s, width: PAPER_INNER, lines: 1, what: 'a wide chip: one row of 315 pt (4.2)' },
  /** 4.2: the strip title row at 12 × s. */
  stripTitle: { bold: true, font: FONT.title * s, width: TITLE_ROW, lines: 1, what: 'the strip title row: 304 pt at 15.6 pt (4.2)' },
  /**
   * A button label of a boycott or scandal ("Return the scissors") in place of "IF SIGNED" in the
   * title row, leaving room for "↑ · Poll 3 → 4 of 5" (an event schedules no ↩). An assumption:
   * 4.2 sizes the title row for "IF SIGNED"; P6's paperMetrics.ts decides.
   */
  stripLabel: { bold: true, assumed: true, font: FONT.title * s, width: TITLE_ROW - measure(EVENT_TITLE_TAIL, FONT.title * s * BOLD_FACTOR), lines: 1, what: 'a button label: the title row less "↑ · Poll 3 → 4 of 5" (4.2), about 151 pt at 15.6 pt bold, an assumption until the desk (P6) fixes the box; keep labels under about 18 characters' },
  /** 4.2: the note row at 12 × s. */
  noteRow: { font: FONT.note * s, width: PAPER_INNER, lines: 1, what: 'the note row: 1 line at 15.6 pt in 315 pt (4.2)' },
  /** 4.1 / 2.16: the goal line, at most 34 characters at 12 × s. */
  goalLine: { font: 12 * s, width: SCREEN_WIDTH - 32, lines: 1, maxChars: 34, what: 'the goal line: at most 34 characters (2.16)' },
  /** 4.1: the term ribbon's long form, only where it fits (about 400 pt). */
  ribbonLong: { font: 11 * s, width: 400, lines: 1, what: "the term ribbon's long form: about 400 pt at 14.3 pt (4.1)" },
  /** 4.1: the term ribbon's short form at 375. */
  ribbonShort: { font: 11 * s, width: SCREEN_WIDTH - 20, lines: 1, what: "the term ribbon's short form: 355 pt at 14.3 pt (4.1)" },
  /** 4.1: a bottom-row button label (64 pt; the in-tray 72). */
  bottomRow: { bold: true, font: FONT.label * s, width: BUTTON_W, lines: 1, what: 'a bottom-row label: 64 pt at 14.3 pt (4.1)' },
  /** A picket slogan on its Ledger row. */
  picket: { font: 11 * s, width: 200, lines: 1, what: 'a picket slogan: 200 pt at 14.3 pt on its Ledger row' },
  /** A ministry or Grand Project name in the Ledger. */
  ledgerName: { font: 12 * s, width: 200, lines: 1, what: 'a Ledger row name: 200 pt at 15.6 pt' },
  /** A clipping in the scrapbook. */
  clipping: { font: 12 * s, width: PAPER_INNER, lines: 3, what: 'a clipping: 3 lines at 15.6 pt in 315 pt' },
  /** A returning-visitor last line, printed under the returned text (see notes: no room is specified). */
  returning: { font: 12 * s, width: PAPER_INNER, lines: 2, what: 'a returning-visitor line: 2 lines at 15.6 pt in 315 pt (box not in 4.2: assumed)' },
  /** A line on a sheet (result, move, away report, election night, the shelf). */
  sheetLine: { font: 12 * s, width: SHEET_INNER, lines: 2, what: 'a sheet line: 2 lines at 15.6 pt in 311 pt' },
  sheetPara: { font: 12 * s, width: SHEET_INNER, lines: 3, what: 'a sheet paragraph: 3 lines at 15.6 pt in 311 pt' },
  /** A title on a sheet (a twist, a pair, a monument's name). */
  sheetTitle: { font: 15 * s, width: SHEET_INNER, lines: 1, what: 'a sheet title: 1 line at 19.5 pt in 311 pt' },
  /** A rival's name with its title ("Councillor Prudence Stitchley") on the poll sheet and the result. */
  rivalName: { bold: true, font: 15 * s, width: SHEET_INNER, lines: 1, maxChars: 32, what: "a rival's name with its title: 1 line at 19.5 pt bold in 311 pt, at most 32 characters" },
  /** A rival's slogan on the poll sheet. */
  slogan: { font: 12 * s, width: SHEET_INNER, lines: 1, what: 'a slogan: 1 line at 15.6 pt in 311 pt' },
  /** A district's name on the pinned map. */
  placeLabel: { font: 11 * s, width: 160, lines: 1, what: 'a map label: 160 pt at 14.3 pt' },
} satisfies Record<string, Box>;
export type BoxName = keyof typeof BOXES;

export interface FitResult {
  fits: boolean;
  lines: number;
  /** Width of the widest line, in points. */
  widest: number;
  /** A word wider than the box, if any. */
  overflowWord?: string;
  /** A plain sentence when it does not fit. */
  reason?: string;
  /** The box is an assumption (a miss is a warning). */
  assumed?: boolean;
}

/** Splits text into wrap segments: words, and the parts of hyphenated words (break after "-"). */
function segments(text: string): { piece: string; space: boolean }[] {
  const out: { piece: string; space: boolean }[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const parts = word.split(/(?<=-)/);
    parts.forEach((p, i) => out.push({ piece: p, space: i === 0 }));
  }
  return out;
}

/** Greedy word wrap of `text` into lines of at most `width` points at `font` points. */
export function wrap(text: string, font: number, width: number): { lines: string[]; widest: number; overflowWord?: string } {
  const lines: string[] = [];
  let cur = '';
  let overflowWord: string | undefined;
  for (const { piece, space } of segments(text)) {
    if (measure(piece, font) > width && !overflowWord) overflowWord = piece;
    const next = cur === '' ? piece : cur + (space ? ' ' : '') + piece;
    if (cur === '' || measure(next, font) <= width) cur = next;
    else {
      lines.push(cur);
      cur = piece;
    }
  }
  if (cur !== '') lines.push(cur);
  const widest = Math.max(0, ...lines.map((l) => measure(l, font)));
  return { lines, widest, overflowWord };
}

/** Does `text` fit `box`? */
export function fit(text: string, box: Box | BoxName): FitResult {
  const b: Box = typeof box === 'string' ? BOXES[box] : box;
  const font = b.bold ? b.font * BOLD_FACTOR : b.font;
  const { lines, widest, overflowWord } = wrap(text, font, b.width);
  const n = Math.max(1, lines.length);
  const chars = [...text].length;
  let reason: string | undefined;
  if (b.maxChars !== undefined && chars > b.maxChars) reason = `${chars} characters, the box takes ${b.maxChars} (${b.what}); cut ${chars - b.maxChars}`;
  else if (overflowWord) reason = `"${overflowWord}" alone is wider than the box (${b.what})`;
  else if (n > b.lines) reason = `needs ${n} lines at font scale 1.3, the box has ${b.lines} (${b.what}); shorten by about ${cutToFit(text, font, b)} characters`;
  return { fits: !reason, lines: n, widest, overflowWord, reason, assumed: !!b.assumed };
}

/** How many characters to cut from the end before the text fits its lines (at least 1). */
function cutToFit(text: string, font: number, b: Box): number {
  const chars = [...text];
  let lo = 0;
  let hi = chars.length;
  // The longest prefix that wraps into the box's lines (fitting is monotonic in the prefix length).
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (wrap(chars.slice(0, mid).join(''), font, b.width).lines.length <= b.lines) lo = mid;
    else hi = mid - 1;
  }
  return Math.max(1, chars.length - lo);
}
