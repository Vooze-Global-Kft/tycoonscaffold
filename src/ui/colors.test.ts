import { describe, expect, it } from 'vitest';
import { contrast, inkOf, textOn } from './colors';

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
    expect(contrast('#FFF', '#000')).toBeCloseTo(21, 5);
  });
});

describe('textOn', () => {
  it('picks dark ink on a light orange and white on a deep red', () => {
    expect(textOn('#F4A261')).toBe('#2B1D12');
    expect(textOn('#C1121F')).toBe('#FFFFFF');
    expect(textOn('#FFFFFF')).toBe('#2B1D12');
    expect(textOn('#111133')).toBe('#FFFFFF');
  });
});

describe('inkOf', () => {
  it('leaves a colour that already reads well alone', () => {
    expect(inkOf('#3D2C1E', '#FFFFFF')).toBe('#3D2C1E');
  });
  it('darkens stage colours until they read on white, keeping them recognisable', () => {
    for (const c of ['#EF7D22', '#2A9D8F', '#7B5EA7', '#F4A261', '#FFAE22']) {
      const ink = inkOf(c, '#FFFFFF');
      expect(contrast(ink, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
      // Only as dark as needed: a colour that already reads well is returned as it is.
      if (contrast(c, '#FFFFFF') >= 4.5) expect(ink).toBe(c);
      else expect(contrast(ink, '#FFFFFF')).toBeLessThan(4.7);
    }
  });
  it('lightens on a dark background', () => {
    const ink = inkOf('#5522AA', '#0B0B2A');
    expect(contrast(ink, '#0B0B2A')).toBeGreaterThanOrEqual(4.5);
  });
});
