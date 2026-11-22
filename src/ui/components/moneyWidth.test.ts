import { describe, expect, it } from 'vitest';
import { formatMoney } from '../../engine/format';
import { GUESS_EM, fitFont, widestEm } from './moneyWidth';

/** Lilita One's real widths (from the font file) for the characters these tests use. */
const LILITA = {
  line: 1.143,
  advances: { '0': 0.639, '1': 0.406, '2': 0.525, '3': 0.528, '4': 0.598, '5': 0.524, '6': 0.575, '7': 0.5, '8': 0.57, '9': 0.565, '.': 0.229, $: 0.531, K: 0.62, M: 0.907, T: 0.502, Q: 0.706, a: 0.517 },
};
/** The exact width of a text in that font. */
const exact = (text: string) => Array.from(text).reduce((sum, ch) => sum + (LILITA.advances as Record<string, number>)[ch], 0);

describe('widest shape of an amount', () => {
  it('counts every digit as the widest digit', () => {
    expect(widestEm('$43.09T', LILITA)).toBeCloseTo(0.531 + 4 * 0.639 + 0.229 + 0.502, 6);
    expect(widestEm('$11.11T', LILITA)).toBe(widestEm('$00.00T', LILITA));
  });

  it('is never narrower than any amount of the same shape', () => {
    for (const value of [0, 7, 58, 111, 999, 1234, 43_090, 8_130_000, 49.96e12, 1.11e15, 999.99e15]) {
      const text = formatMoney(value, '$');
      expect(widestEm(text, LILITA)).toBeGreaterThanOrEqual(exact(text) - 1e-9);
    }
  });

  it('guesses wide without font measures and for characters the font lacks', () => {
    expect(widestEm('$43.09T', null)).toBeCloseTo(7 * GUESS_EM, 6);
    // The cedi sign is not in the font: the phone draws it in another font.
    expect(widestEm('₵1', LILITA)).toBeCloseTo(GUESS_EM + 0.639, 6);
  });
});

describe('fitting the amount', () => {
  it('uses the room it has: the widest text of the shape fits, and one size up would not', () => {
    for (const text of ['$0', '$580', '$8.13M', '$43.09T', '$999.99Qa']) {
      for (const width of [45, 57, 75.4, 86.5, 115, 140]) {
        const em = widestEm(text, LILITA);
        const size = fitFont(em, width, 11, 28);
        expect(size).toBeGreaterThanOrEqual(11);
        expect(size).toBeLessThanOrEqual(28);
        if (size > 11) expect(em * size).toBeLessThan(width);
        if (size < 28) expect(em * (size + 1) * 1.03).toBeGreaterThan(width - 1);
      }
    }
  });

  it('gives a late-game amount on a 390 point phone a readable size', () => {
    // 75.4 points is what the header leaves the amount there; a guess of 0.74 per character gave 14.
    expect(fitFont(widestEm('$43.09T', LILITA), 75.4, 11, 28)).toBe(18);
    expect(fitFont(widestEm('$43.09T', null), 75.4, 11, 28)).toBe(13);
  });

  it('falls back to the largest size before the width is known', () => {
    expect(fitFont(3.8, 0, 11, 28)).toBe(28);
  });
});
