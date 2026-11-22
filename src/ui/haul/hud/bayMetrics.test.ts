import { describe, expect, it } from 'vitest';
import { bayCounterMetrics, bayCounterRows, COUNTER_LINE_EM } from './bayMetrics';

// Spec 10.2: "₵999.99Qd" at fontScale 0.85, 1, 1.2 and 2 at both sizes: the rows add up to the block
// and the counter's line fits its row (so the counter can never run into the receipt ticker).
const SIZES = [
  { name: '390 x 844', compact: false, block: 56, width: 182 },
  { name: '375 x 667', compact: true, block: 50, width: 191 },
];
const SCALES = [0.85, 1, 1.2, 2];
const WIDEST = '₵999.99Qd';

describe('bayCounterMetrics', () => {
  for (const s of SIZES) {
    for (const fs of SCALES) {
      it(`${WIDEST} at ${s.name}, fontScale ${fs}`, () => {
        const m = bayCounterMetrics(s.compact, s.block, fs, s.width - 16, WIDEST.length);
        const rows = bayCounterRows(m);
        // Rows at tops that add up: counter, 2 pt gap, ticker, exactly the block.
        expect(rows.counterTop).toBe(0);
        expect(rows.tickerTop).toBe(m.counterRow + 2);
        expect(rows.tickerTop + m.tickerRow).toBe(s.block);
        // The counter's own line (its box) fits its row: it ends above the ticker's top.
        expect(rows.counterBox).toBeLessThanOrEqual(m.counterRow);
        expect(rows.counterBoxTop + rows.counterBox).toBeLessThanOrEqual(rows.tickerTop);
        expect(m.counterFont * COUNTER_LINE_EM).toBeLessThanOrEqual(m.counterRow + 1e-9);
        // The ticker's line fits its row.
        expect(m.tickerFont * 1.25).toBeLessThanOrEqual(m.tickerRow);
        // The widest number fits the counter at that font (0.62 em per glyph of the digital face).
        expect(WIDEST.length * 0.62 * m.counterFont).toBeLessThanOrEqual(s.width - 16 + 1e-9);
        expect(m.short).toBe(false);
        expect(m.counterFont).toBeGreaterThanOrEqual(16);
      });
    }
  }

  it('the text-size setting is applied by hand between 0.85 and 1.2', () => {
    const a = bayCounterMetrics(false, 56, 1.2, 166, 9);
    const b = bayCounterMetrics(false, 56, 3, 166, 9);
    expect(b).toEqual(a);
    expect(bayCounterMetrics(false, 56, 0.5, 166, 9)).toEqual(bayCounterMetrics(false, 56, 0.85, 166, 9));
    // Spec 4.1's rows (36 + 2 + 18) are the values at fontScale 1.2 (errata 52).
    expect(a.tickerRow).toBe(18);
    expect(a.counterRow).toBe(36);
  });

  it('switches to the short form when the full number would need less than 16 pt', () => {
    const m = bayCounterMetrics(false, 56, 1, 100, 16);
    expect(m.short).toBe(true);
    expect(m.counterFont).toBeGreaterThanOrEqual(16);
  });

  it('never returns NaN for odd inputs', () => {
    for (const fs of [NaN, 0, -1, Infinity]) {
      const m = bayCounterMetrics(true, 50, fs, 175, 9);
      expect(Number.isFinite(m.counterFont) && Number.isFinite(m.tickerFont)).toBe(true);
    }
  });
});
