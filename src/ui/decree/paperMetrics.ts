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
import { FONT_SCALE_MAX, PAPER_INNER_W } from './layout';

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
  proposal: { y: number; h: number; line: number; lines: number };
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

/** The paper's rows for a paper `height` tall at font scale `fontScale` (4.2). */
export function paperMetrics(height: number, fontScale: number): PaperMetrics {
  const s = Math.min(fontScale > 0 ? fontScale : 1, FONT_SCALE_MAX);
  const title = at(AT_13.titleRow, s);
  const chip = at(AT_13.chipRow, s);
  const note = at(AT_13.noteRow, s);
  const stripH = AT_13.stripPad + title + 2 * chip + note + AT_13.stripPad;
  const line = at(AT_13.proposalLine, s);
  const proposalNatural = AT_13.proposalLines * line + AT_13.proposalPad;
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
  const proposal = { y, h: proposalNatural + spare, line, lines: AT_13.proposalLines };
  y += proposal.h;
  const dividerBottom = { y, h: AT_13.divider };
  y += AT_13.divider;
  const refuse = strip(y);
  y += stripH + AT_13.padding;
  const font = Object.fromEntries(Object.entries(FONT).map(([k, v]) => [k, v * s])) as PaperMetrics['font'];
  return { s, sign, dividerTop, header, proposal, dividerBottom, refuse, natural, total: y, fits: natural <= height, font };
}
