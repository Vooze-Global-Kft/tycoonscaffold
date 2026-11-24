/**
 * The paper, row by row (spec 4.2), as headerMetrics.ts does for the first game's header: rows whose
 * heights add up exactly to the paper's height from deskLayout (4.1), text sized by hand at
 * s = min(fontScale, 1.3) with allowFontScaling={false}, never with negative margins.
 *
 * At s = 1.3 (4.2): padding 6; SIGN strip 106 (4 + title row 22 at 12 × s + 2 chip rows of 28 at
 * 15 × s + note row 20 at 12 × s + 4); divider 2; header 62 (oval photo 44 × 54 with paperclip, name
 * 15 × s, role and badge 13 × s); proposal 112 (4 lines at 16 × s, line 26, + 8); divider 2; REFUSE
 * strip 106; padding 6: 402 ≤ 405. A row's height at another s is its 1.3 height × s / 1.3, rounded up
 * (the photo, paddings and dividers do not scale); whatever the paper has over the rows' sum goes to
 * the proposal box (below its 4 lines), so the rows always add up to the paper's height. A chip is at
 * most 151 pt (two fit the inner 315 with a 13 gap); a wide chip fills a row; a strip has 4 slots (2
 * rows of 2), a mayor's strip at most 3 chips.
 *
 * Written by the skeleton exactly as 4.2; owned afterwards by the desk package P6
 * (docs/design/office-build-plan.md). Pure.
 */
import { FONT_SCALE_MAX, PAPER_INNER_W, PAPER_W, type Rect } from './layout';

/** The heights and font sizes at s = 1.3 (4.2). */
export const AT_13 = {
  padding: 6,
  stripPad: 4,
  titleRow: 22,
  chipRow: 28,
  noteRow: 20,
  divider: 2,
  header: 62,
  proposalLine: 26,
  proposalLines: 4,
  proposalPad: 8,
} as const;
/** Font sizes at s = 1 (× s when drawn). */
export const FONT = { title: 12, chip: 15, note: 12, name: 15, role: 13, proposal: 16, label: 11 } as const;
export const PHOTO = { w: 44, h: 54 } as const;
export const CHIP_MAX_W = 151;
export const CHIP_GAP = PAPER_INNER_W - 2 * CHIP_MAX_W;
export const STRIP_SLOTS = 4;
export const MAYOR_STRIP_CHIPS = 3;

// ---------------------------------------------------------------------------------------------
// The named text boxes of the paper (the content desk's fit check, scripts/content/office/fit.ts,
// reads them; widths in points, fonts at s = 1, × s when drawn). Everything a paper prints lies in
// one of these boxes, so a string that fits its box at s = 1.3 never wraps or clips on 375 × 667.
// ---------------------------------------------------------------------------------------------

/** The paper's side padding: (343 − 315) / 2, from the paper's edge to the inner width. */
export const PAD_X = (PAPER_W - PAPER_INNER_W) / 2;
/** The strip title row (4.2: "IF SIGNED ↑ · Poll 3 → 4 of 5 ↩" ≤ 304 pt). */
export const TITLE_ROW_W = 304;
/**
 * A side's own label in place of "IF SIGNED" / "IF STUDIED" ("Return the scissors", "Apologise outside"),
 * drawn bold at FONT.title × s: the title row less the widest tail " ↑ · Poll 3 → 4 of 5" (an event's
 * side schedules no ↩). A longer label is cut by the desk with "…" (never wraps), so the content check
 * keeps labels inside it.
 */
export const STRIP_LABEL_W = 151;
/** The header's text column: right of the 44 pt photo with an 8 pt gap (name bold 15 × s, role 13 × s). */
export const HEADER_GAP = 8;
export const HEADER_TEXT_W = PAPER_INNER_W - PHOTO.w - HEADER_GAP;
/** The club badge after the role (13 × s tall) and the minister initials ("DP ×0.9") at the header's right. */
export const BADGE = 13;
/** A chip: its icon (at the chip font's size) and padding; the text box is what is left of CHIP_MAX_W. */
export const CHIP_ICON = 16;
export const CHIP_PAD = 6;
export const CHIP_TEXT_W = CHIP_MAX_W - CHIP_ICON - 3 * CHIP_PAD;
export const CHIP_WIDE_TEXT_W = PAPER_INNER_W - CHIP_ICON - 3 * CHIP_PAD;
/** The note row: one line across the inner width. */
export const NOTE_W = PAPER_INNER_W;
/** The proposal: 4 lines across the inner width (16 × s, line 26 at 1.3); a returning visitor's last line under it at the note font. */
export const PROPOSAL_W = PAPER_INNER_W;
/** A form's own line ("Requisition: Potholes Office +1 level", bold) takes up to the proposal's first two lines; the Clerk's note (at 0.85 of the proposal's size) the next two. */
export const FORM_LINE_LINES = 2;
export const FORM_NOTE_LINES = 2;
/** The comic front page (2.8): the headline beside the press photograph (the photo takes the right quarter), the masthead above it. */
export const HEADLINE_W = Math.round(PAPER_INNER_W * 0.68);
export const HEADLINE_FONT = 15;
export const HEADLINE_LINES = 4;
export const MASTHEAD_FONT = 13;
/** The picket board on a grievance (two lines at 7 × s on the board). */
export const PICKET_W = 52;
export const PICKET_FONT = 7;

/** Every box of the paper by name: font at s = 1, width at any s, lines (the fit check's table). */
export const PAPER_BOXES = {
  title: { font: FONT.title, width: TITLE_ROW_W, lines: 1, bold: true },
  label: { font: FONT.title, width: STRIP_LABEL_W, lines: 1, bold: true },
  chip: { font: FONT.chip, width: CHIP_TEXT_W, lines: 1, bold: false },
  chipWide: { font: FONT.chip, width: CHIP_WIDE_TEXT_W, lines: 1, bold: false },
  note: { font: FONT.note, width: NOTE_W, lines: 1, bold: false },
  name: { font: FONT.name, width: HEADER_TEXT_W, lines: 1, bold: true },
  role: { font: FONT.role, width: HEADER_TEXT_W - BADGE - 4, lines: 1, bold: false },
  proposal: { font: FONT.proposal, width: PROPOSAL_W, lines: AT_13.proposalLines, bold: false },
  formLine: { font: FONT.proposal, width: PROPOSAL_W, lines: FORM_LINE_LINES, bold: true },
  formNote: { font: FONT.proposal * 0.85, width: PROPOSAL_W, lines: FORM_NOTE_LINES, bold: false },
  returning: { font: FONT.note, width: PROPOSAL_W, lines: 1, bold: false },
  headline: { font: HEADLINE_FONT, width: HEADLINE_W, lines: HEADLINE_LINES, bold: true },
  masthead: { font: MASTHEAD_FONT, width: PAPER_INNER_W - 24, lines: 1, bold: true },
  picket: { font: PICKET_FONT, width: PICKET_W, lines: 2, bold: true },
} as const;

export interface StripRows {
  y: number;
  h: number;
  title: { y: number; h: number };
  chips: [{ y: number; h: number }, { y: number; h: number }];
  note: { y: number; h: number };
}

export interface PaperMetrics {
  s: number;
  /** The rows top to bottom, each with y relative to the paper's top. */
  sign: StripRows;
  dividerTop: { y: number; h: number };
  header: { y: number; h: number };
  proposal: { y: number; h: number; line: number; lines: number; returningLine: number };
  dividerBottom: { y: number; h: number };
  refuse: StripRows;
  /** The rows' natural sum before the proposal took the spare (402 at s = 1.3). */
  natural: number;
  /** Total: always the paper's height when it fits (fits = natural ≤ height). */
  total: number;
  fits: boolean;
  /** Font sizes at this s. */
  font: { [K in keyof typeof FONT]: number };
}

const at = (h13: number, s: number) => Math.ceil((h13 * s) / FONT_SCALE_MAX - 1e-9);

/**
 * A returning visitor's last line (2.7 "with one of 60 returning-visitor last lines"): under the returned
 * text, 2 lines at 12 × s (the content check's box BOXES.returning), line 20 at s = 1.3. A paper that
 * carries one gets this room on top of the proposal's 4 lines (finding 2: the boxes are the contract).
 */
export const RETURNING_FONT = 12;
export const RETURNING_LINES = 2;
export const RETURNING_LINE_13 = 20;

/** The paper's rows for a paper `height` tall at font scale `fontScale` (4.2); `returning` adds the returning line's room. */
export function paperMetrics(height: number, fontScale: number, opts: { returning?: boolean } = {}): PaperMetrics {
  const s = Math.min(fontScale > 0 ? fontScale : 1, FONT_SCALE_MAX);
  const title = at(AT_13.titleRow, s);
  const chip = at(AT_13.chipRow, s);
  const note = at(AT_13.noteRow, s);
  const stripH = AT_13.stripPad + title + 2 * chip + note + AT_13.stripPad;
  const line = at(AT_13.proposalLine, s);
  const returningLine = at(RETURNING_LINE_13, s);
  const proposalNatural = AT_13.proposalLines * line + AT_13.proposalPad + (opts.returning ? RETURNING_LINES * returningLine : 0);
  const natural = 2 * AT_13.padding + 2 * stripH + 2 * AT_13.divider + AT_13.header + proposalNatural;
  const spare = Math.max(0, height - natural);
  const strip = (y: number): StripRows => {
    const t = y + AT_13.stripPad;
    return { y, h: stripH, title: { y: t, h: title }, chips: [{ y: t + title, h: chip }, { y: t + title + chip, h: chip }], note: { y: t + title + 2 * chip, h: note } };
  };
  let y = AT_13.padding;
  const sign = strip(y);
  y += stripH;
  const dividerTop = { y, h: AT_13.divider };
  y += AT_13.divider;
  const header = { y, h: AT_13.header };
  y += AT_13.header;
  const proposal = { y, h: proposalNatural + spare, line, lines: AT_13.proposalLines, returningLine };
  y += proposal.h;
  const dividerBottom = { y, h: AT_13.divider };
  y += AT_13.divider;
  const refuse = strip(y);
  y += stripH + AT_13.padding;
  const font = Object.fromEntries(Object.entries(FONT).map(([k, v]) => [k, v * s])) as PaperMetrics['font'];
  return { s, sign, dividerTop, header, proposal, dividerBottom, refuse, natural, total: y, fits: natural <= height, font };
}

/**
 * How the paper is drawn in its zone (finding 1): its contents are laid out at the design width (343)
 * and at a height whose rows hold at least their natural sum, then the whole paper is scaled by `k`
 * about its centre so it fits a narrow (320 pt) or short (360 × 640) window. `k` is 1 at 375 × 667 and
 * 390 × 844. `design` is the paper's rectangle before the scale (same centre), `screen` after it (what
 * the finger touches). The flick's thresholds keep counting finger points.
 */
export interface PaperFit {
  k: number;
  design: Rect;
  screen: Rect;
  m: PaperMetrics;
}
export function paperFit(paper: Rect, width: number, fontScale: number, opts: { returning?: boolean } = {}): PaperFit {
  const natural = paperMetrics(0, fontScale, opts).natural;
  const raw = Math.min(1, (width - 16) / PAPER_W, paper.h > 0 ? paper.h / natural : 1);
  const k = raw > 0 ? raw : 1;
  const cx = paper.x + paper.w / 2;
  const cy = paper.y + paper.h / 2;
  const dw = k < 1 || paper.w < PAPER_W ? PAPER_W : paper.w;
  const dh = paper.h / k;
  const design = { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh };
  const screen = { x: cx - (dw * k) / 2, y: paper.y, w: dw * k, h: paper.h };
  return { k, design, screen, m: paperMetrics(dh, fontScale, opts) };
}
