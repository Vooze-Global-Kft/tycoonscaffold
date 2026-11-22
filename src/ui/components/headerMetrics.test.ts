import { describe, expect, it } from 'vitest';
import { LINE_EM, ROW_GAP, cashBlockMetrics, cashBoxHeight } from './headerMetrics';

/** The two header heights in use (src/ui/home/layout.ts): tall phones and small phones. */
const HEADERS = [
  { compact: false, header: 56 },
  { compact: true, header: 48 },
];
/** Text-size settings from the smallest to the largest accessibility size, and broken values. */
const SCALES = [0.5, 0.82, 0.88, 1, 1.118, 1.235, 1.353, 1.786, 2.5, 3.1, 0, NaN, -1];

describe('header cash block', () => {
  it('keeps the amount and the income line inside the header, one under the other', () => {
    for (const { compact, header } of HEADERS) {
      for (const scale of SCALES) {
        const m = cashBlockMetrics(compact, header, scale);
        // Two stacked rows, a gap between them and 2 points of air at each edge of the header: they cannot overlap.
        expect(m.cashRow + ROW_GAP + m.ipsLine).toBeLessThanOrEqual(header - 4);
        // The amount's row pops to 1.14 times its size about its centre when a coin lands: the
        // growth below the row stays out of the income line's text (its line has a point of air on top).
        expect((m.cashRow * 0.14) / 2).toBeLessThanOrEqual(ROW_GAP + 1);
        // Each line of text fits its own row.
        expect(m.ipsLine).toBeGreaterThanOrEqual(m.ipsFont * 1.2);
        expect(m.cashMax * LINE_EM).toBeLessThanOrEqual(m.cashRow);
        // Still readable.
        expect(m.cashMax).toBeGreaterThanOrEqual(20);
        expect(m.ipsFont).toBeGreaterThanOrEqual(9);
      }
    }
  });

  it('keeps the usual sizes at the default text size', () => {
    expect(cashBlockMetrics(false, 56, 1)).toEqual({ ipsFont: 12, ipsLine: 15, cashRow: 34, cashMax: 28 });
    expect(cashBlockMetrics(true, 48, 1)).toEqual({ ipsFont: 11, ipsLine: 14, cashRow: 28, cashMax: 24 });
  });

  it('grows with the text-size setting, but only up to 1.2 times', () => {
    const big = cashBlockMetrics(false, 56, 1.353);
    expect(big.ipsFont).toBeCloseTo(14.4);
    expect(cashBlockMetrics(false, 56, 3.1)).toEqual(big);
  });

  it('plans with the font\'s own line height when it is known', () => {
    // Lilita One: 1.143. The usual sizes still fit.
    expect(cashBlockMetrics(false, 56, 1, 1.143).cashMax).toBe(28);
    expect(cashBlockMetrics(true, 48, 1, 1.143).cashMax).toBe(24);
    // A font with a very tall line gets a smaller largest size, so its line still fits the row.
    const tall = cashBlockMetrics(false, 56, 1, 1.6);
    expect(tall.cashMax).toBe(21);
    expect(tall.cashMax * 1.6).toBeLessThanOrEqual(tall.cashRow);
    expect(cashBoxHeight(21, tall.cashRow, 1.6)).toBe(34);
    // Nonsense from a broken font file is ignored.
    expect(cashBlockMetrics(false, 56, 1, NaN)).toEqual(cashBlockMetrics(false, 56, 1));
    expect(cashBlockMetrics(false, 56, 1, 9).cashMax).toBe(18);
  });

  it('gives the amount a box as tall as its own line, never a taller one', () => {
    for (const { compact, header } of HEADERS) {
      const m = cashBlockMetrics(compact, header, 1);
      for (let font = 14; font <= m.cashMax; font++) {
        const box = cashBoxHeight(font, m.cashRow);
        expect(box).toBeLessThanOrEqual(m.cashRow);
        // At most 3 points taller than the line: nowhere for the digits to sink to.
        expect(box - font * LINE_EM).toBeLessThanOrEqual(3);
        expect(box).toBeGreaterThanOrEqual(font * LINE_EM);
      }
    }
  });
});
