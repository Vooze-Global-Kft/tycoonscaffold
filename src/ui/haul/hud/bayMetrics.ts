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

/** `compact`: the 375 x 667 layout. `block`: the counter's height (56 / 50). `lineEm`: the display font's line height in em. */
export function bayCounterMetrics(compact: boolean, block: number, fontScale: number, innerWidth: number, glyphCount: number, lineEm = 1.2): BayCounterMetrics {
  const scale = clamp(0.85, 1.2, fontScale);
  const tickerFont = Math.round((compact ? 11 : 12) * scale * 10) / 10;
  const tickerRow = Math.ceil(tickerFont * 1.25);
  const counterRow = block - 2 - tickerRow;
  const counterMax = Math.floor(Math.min((compact ? 24 : 28) * scale, counterRow / lineEm));
  const fit = innerWidth / (Math.max(1, glyphCount) * 0.62);
  const short = fit < 16;
  const counterFont = Math.max(16, Math.min(counterMax, fit));
  return { tickerFont, tickerRow, counterRow, counterFont, short };
}
