import { describe, expect, it } from 'vitest';
import { dibs } from '../strings';
import { rollDibs } from './rollDibs';

describe('rollDibs (the treasury on the UI thread)', () => {
  it('prints exactly what strings.ts dibs prints, for whole amounts and rounded ones', () => {
    const xs: number[] = [0, 1, 9, 30, 999, 1000, 1001, 1234, 9995, 9999, 99_950, 99_999, 999_499, 999_500, 1e6, 2.12e10, 3.456e15, 9.995e20, 1e33, 5e35];
    for (let e = 0; e < 36; e += 0.37) xs.push(Math.round(10 ** e));
    for (const x of xs) expect(rollDibs(x)).toBe(dibs(x));
  });
});
