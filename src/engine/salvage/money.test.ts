/**
 * money.ts (yard-stage1.md 2.2): the one rounding, the formats, the one commit, printed arithmetic.
 * Frozen units only; no tuned number.
 */
import { describe, expect, it } from 'vitest';
import { commitCash, fmtMass, fmtMoney, fmtPrice, fmtTonnes, floorGrams, lineAmount, resolveGrams, roundMoney, sumAmounts } from './money';

describe('money.ts', () => {
  it('rounds money half up to the hundredth, mirrored for negatives', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.344)).toBe(2.34);
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(Number.NaN)).toBe(0);
  });
  it('formats money by size (2.2)', () => {
    expect(fmtMoney(12.3)).toBe('§12.30');
    expect(fmtMoney(999.99)).toBe('§999.99');
    expect(fmtMoney(3148.4)).toBe('§3,148');
    expect(fmtMoney(412_000)).toBe('§412k');
    expect(fmtMoney(1_250_000)).toBe('§1.25M');
    expect(fmtPrice(0.95)).toBe('§0.95');
  });
  it('formats mass by its step and size (2.2)', () => {
    expect(fmtMass(28_640)).toBe('28.6 kg');
    expect(fmtMass(1_020_000)).toBe('1,020 kg');
    expect(fmtMass(12_340_000)).toBe('12.34 t');
    expect(fmtMass(2_500_000, 'platform', true)).toBe('2.50 t');
    expect(fmtMass(1_029_000, 'bridge')).toBe('1,020 kg');
    expect(fmtTonnes(150_000)).toBe('0.15 t');
  });
  it('resolves grams half up on the platform and down on a lot', () => {
    expect(resolveGrams(28_650)).toBe(28_700);
    expect(resolveGrams(28_649)).toBe(28_600);
    expect(floorGrams(28_699)).toBe(28_600);
  });
  it('a line equals rounded kilograms times price; a total equals its lines', () => {
    for (let i = 0; i < 500; i++) {
      const lines = Array.from({ length: 1 + (i % 5) }, (_, k) => {
        const g = floorGrams(1000 + ((i * 7919 + k * 104729) % 300_000));
        const price = roundMoney(0.37 + ((i * 31 + k) % 4000) / 97);
        return { g, price, amount: lineAmount(g, price) };
      });
      for (const l of lines) expect(l.amount).toBe(roundMoney((l.g / 1000) * l.price));
      expect(sumAmounts(lines)).toBe(roundMoney(lines.reduce((a, l) => a + l.amount, 0)));
    }
  });
  it('commits cash once, rounded, earnings counted; never on account', () => {
    const g = { cash: 10, lifetimeEarnings: 5 };
    expect(commitCash(g, 2.345)).toEqual({ cash: 12.35, lifetimeEarnings: 7.35 });
    expect(commitCash(g, -4)).toEqual({ cash: 6, lifetimeEarnings: 5 });
    expect(commitCash(g, 0)).toBe(g);
    expect(() => commitCash(g, -10.01)).toThrow();
  });
});
