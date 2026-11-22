/**
 * Sizes of the header's cash block: the amount, and the income per second under it. Pure numbers,
 * so the rule "the two lines never run into each other" can be tested.
 */

/** A font's line is about this many times its size, when the font's own figure is not known. */
export const LINE_EM = 1.15;

/** The line height to plan with: the font's own (from its file) when known, kept within sane bounds. */
function lineOf(lineEm: number | undefined): number {
  return lineEm !== undefined && Number.isFinite(lineEm) ? Math.min(1.8, Math.max(1, lineEm)) : LINE_EM;
}

/**
 * Points of air between the amount's row and the income line. The amount's row pops a little when a
 * coin lands on it; the gap is where that growth goes.
 */
export const ROW_GAP = 2;

export interface CashBlockMetrics {
  /** Font size and line height of the income line. */
  ipsFont: number;
  ipsLine: number;
  /** Height of the amount's row, and the largest font the amount may use in it. */
  cashRow: number;
  cashMax: number;
}

/**
 * All sizes in real points. The header has a fixed height, so the phone's text-size setting is
 * applied here by hand (up to 1.2 times) instead of by the system: the two lines and the gap between
 * them always add up to less than the header, so they can never run into each other, whatever the
 * setting and the platform.
 */
export function cashBlockMetrics(compact: boolean, header: number, fontScale: number, lineEm?: number): CashBlockMetrics {
  const scale = Math.min(1.2, Math.max(0.85, Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1));
  const ipsFont = Math.round((compact ? 11 : 12) * scale * 10) / 10;
  const ipsLine = Math.ceil(ipsFont * 1.25);
  // The amount's row takes what the income line and the gap leave, 2 points clear of each header edge.
  const cashRow = Math.min(compact ? 30 : 34, header - 4 - ipsLine - ROW_GAP);
  // The amount's line has to fit its row: a font with a tall line gets a smaller largest size.
  const cashMax = Math.floor(Math.min((compact ? 24 : 28) * scale, cashRow / lineOf(lineEm)));
  return { ipsFont, ipsLine, cashRow, cashMax };
}

/** Height of the amount's own box for a font size: its line plus a point of air above and below, never more than the row. */
export function cashBoxHeight(fontSize: number, cashRow: number, lineEm?: number): number {
  return Math.min(cashRow, Math.ceil(fontSize * lineOf(lineEm)) + 2);
}
