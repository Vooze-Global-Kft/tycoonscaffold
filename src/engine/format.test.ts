import { describe, expect, it } from 'vitest';
import { formatNumber, formatShort } from './format';

describe('formatShort: three significant digits', () => {
  it.each([
    [0, '0'],
    [5.25, '5.25'],
    [580, '580'],
    [999, '999'],
    [1000, '1.00K'],
    [1234, '1.23K'],
    [12_350, '12.3K'],
    [153_100, '153K'],
    [8_510_000, '8.51M'],
    [85_070_000_000, '85.1B'],
    [850_070_000_000, '850B'],
    [2e12, '2.00T'],
    [2.74e15, '2.74Qa'],
    [1e36, '1.00aa'],
  ])('%d -> %s', (n, s) => expect(formatShort(n)).toBe(s));

  it('carries when rounding reaches the next digit or the next suffix', () => {
    expect(formatShort(9_996)).toBe('10.0K');
    expect(formatShort(99_960)).toBe('100K');
    expect(formatShort(999_600)).toBe('1.00M');
    expect(formatShort(999_999_999)).toBe('1.00B');
  });

  it('is never longer than the full format and names the same magnitude', () => {
    for (let e = 0; e < 60; e += 0.37) {
      const v = Math.pow(10, e) * 1.2345;
      const short = formatShort(v);
      const full = formatNumber(v);
      expect(short.length).toBeLessThanOrEqual(full.length);
      expect(short.replace(/[\d.]/g, '')).toBe(full.replace(/[\d.]/g, ''));
      // At most four characters before the suffix: three digits and a point.
      expect(short.replace(/[^\d.]/g, '').length).toBeLessThanOrEqual(4);
    }
  });

  it('handles the edges like formatNumber', () => {
    expect(formatShort(Infinity)).toBe('∞');
    expect(formatShort(-1234)).toBe('-1.23K');
    // The largest numbers JavaScript has still get a letter suffix.
    expect(formatShort(1e305)).toBe('100dl');
    expect(formatShort(1.5e308)).toBe('150dm');
  });
});
