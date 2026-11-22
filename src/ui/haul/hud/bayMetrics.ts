/**
 * The dock counter's text metrics (spec 4.1 bay text rule, errata 52), following the AGENTS.md
 * fixed-height rule like src/ui/components/headerMetrics.ts without importing it: two rows at
 * tops that add up, fonts sized by hand from fontScale, no lineHeight on the RollingNumber.
 * Pure. The "bay" package owns it and its test (src/ui/haul/hud/bayMetrics.test.ts, spec 10.2).
 */
export interface BayCounterMetrics {
  tickerFont: number;
  tickerRow: number;
  counterRow: number;
  counterFont: number;
  /** The counter shows format.ts's short form (the full number does not fit at 16 pt). */
  short: boolean;
}

const clamp = (lo: number, hi: number, x: number) => Math.min(hi, Math.max(lo, x));

/** The digital face's line, in em, when the font's own figure is not known (monospace faces run 1.15 to 1.2). */
export const COUNTER_LINE_EM = 1.2;
/** Points between the counter's row and the ticker's row. */
export const BAY_ROW_GAP = 2;

/** `compact`: the 375 x 667 layout. `block`: the counter's height (56 / 50). `lineEm`: the display font's line height in em. */
export function bayCounterMetrics(compact: boolean, block: number, fontScale: number, innerWidth: number, glyphCount: number, lineEm = COUNTER_LINE_EM): BayCounterMetrics {
  const scale = clamp(0.85, 1.2, Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1);
  const tickerFont = Math.round((compact ? 11 : 12) * scale * 10) / 10;
  const tickerRow = Math.ceil(tickerFont * 1.25);
  const counterRow = block - BAY_ROW_GAP - tickerRow;
  const counterMax = Math.floor(Math.min((compact ? 24 : 28) * scale, counterRow / lineEm));
  const fit = innerWidth / (Math.max(1, glyphCount) * 0.62);
  const short = fit < 16;
  const counterFont = Math.max(16, Math.min(counterMax, fit));
  return { tickerFont, tickerRow, counterRow, counterFont, short };
}

/**
 * Where the two rows go inside the block (absolute tops that add up, no negative margins): the
 * counter's box is only as tall as its own line and is centred in its row; the ticker sits under the
 * 2 pt gap. `counterBox` is the RollingNumber's `height` (it never gets a lineHeight).
 */
export function bayCounterRows(m: BayCounterMetrics, lineEm = COUNTER_LINE_EM): { counterTop: number; counterBox: number; counterBoxTop: number; tickerTop: number } {
  const counterBox = Math.min(m.counterRow, Math.ceil(m.counterFont * lineEm));
  return { counterTop: 0, counterBox, counterBoxTop: Math.floor((m.counterRow - counterBox) / 2), tickerTop: m.counterRow + BAY_ROW_GAP };
}

/** The smallest the ticker's text gets before a shorter form is used. */
export const TICKER_MIN_FONT = 9;

/** The longest of `texts` that fits `width` at `maxFont` or at least TICKER_MIN_FONT, and its font (0.62 em a glyph). */
export function fitTicker(texts: readonly string[], width: number, maxFont: number): { text: string; font: number } {
  for (const t of texts) {
    const font = Math.min(maxFont, width / (Math.max(1, t.length) * 0.62));
    if (font >= TICKER_MIN_FONT) return { text: t, font: Math.floor(font * 10) / 10 };
  }
  const t = texts[texts.length - 1] ?? '';
  // Nothing fits at the readable size: the shortest form, as large as fits (one line ellipsizes past it).
  return { text: t, font: Math.floor(Math.min(maxFont, width / (Math.max(1, t.length) * 0.62)) * 10) / 10 };
}

