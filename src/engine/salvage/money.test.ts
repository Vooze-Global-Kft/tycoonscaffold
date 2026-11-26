/**
 * money.ts (yard-stage1.md 2.2): the one rounding, the formats, the one commit, printed arithmetic.
 * Frozen units only; no tuned number.
 */
import { describe, expect, it } from 'vitest';
import { commitCash, fmtMass, fmtMoney, fmtMoneyExact, fmtPrice, fmtTonnes, tonnesStep_g, floorGrams, lineAmount, resolveGrams, roundMoney, sumAmounts } from './money';

describe('money.ts', () => {
  it('rounds money half up to the hundredth, mirrored for negatives', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.344)).toBe(2.34);
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(Number.NaN)).toBe(0);
  });
  it('formats money by size (2.2)', () => {
    expect(fmtMoney(12.3)).toBe('§12.30');
    expect(fmtMoney(99.99)).toBe('§99.99');
    // W11: no hundredths from §100 on bars, cards, shop prices and labels.
    expect(fmtMoney(100)).toBe('§100');
    expect(fmtMoney(340)).toBe('§340');
    expect(fmtMoney(800)).toBe('§800');
    expect(fmtMoney(999.99)).toBe('§1,000');
    expect(fmtMoney(-340)).toBe('−§340');
    expect(fmtMoney(3148.4)).toBe('§3,148');
    expect(fmtMoney(412_000)).toBe('§412k');
    expect(fmtMoney(1_250_000)).toBe('§1.25M');
    expect(fmtMoney(999_999)).toBe('§1.00M');
    expect(fmtMoney(99_999)).toBe('§99,999');
    expect(fmtMoney(199_960)).toBe('§200k');
    expect(fmtPrice(0.95)).toBe('§0.95');
  });
  it('a ticket keeps its hundredths below §1,000 (W11)', () => {
    expect(fmtMoneyExact(250.24)).toBe('§250.24');
    expect(fmtMoneyExact(12.3)).toBe('§12.30');
    expect(fmtMoneyExact(3148.4)).toBe('§3,148');
    expect(fmtMoneyExact(412_000)).toBe('§412k');
  });
  it('prints tonnes with at most three figures and no trailing zeros (W11)', () => {
    expect(fmtTonnes(0)).toBe('0 t');
    expect(fmtTonnes(90_000)).toBe('0.09 t');
    expect(fmtTonnes(390_000)).toBe('0.39 t');
    expect(fmtTonnes(2_200_000)).toBe('2.2 t');
    expect(fmtTonnes(2_400_000)).toBe('2.4 t');
    expect(fmtTonnes(21_500_000)).toBe('21.5 t');
    expect(fmtTonnes(150_000_000)).toBe('150 t');
    expect(fmtTonnes(707_200_000)).toBe('707 t');
    expect(fmtTonnes(1_273_000_000)).toBe('1,273 t');
    expect(fmtTonnes(500_000e6)).toBe('500,000 t');
    expect(fmtTonnes(9_996_000)).toBe('10 t');
    expect(fmtTonnes(99_960_000)).toBe('100 t');
    // Never more than three figures, never a trailing zero, for every gram figure on a sweep.
    for (let g = 0; g < 2e9; g = g * 1.37 + 7919) {
      const s = fmtTonnes(g).replace(' t', '').replace(/,/g, '');
      expect(s, String(g)).not.toMatch(/\.\d*0$/);
      if (Number(s) < 1000) expect(s.replace('.', '').replace(/^0+/, '').length, s).toBeLessThanOrEqual(3);
      // A figure on its own printed step prints the same as the grams it stands for.
      const u = tonnesStep_g(g);
      expect(fmtTonnes(Math.round(g / u) * u)).toBe(fmtTonnes(g));
    }
  });
  it('formats mass by its step and size (2.2)', () => {
    expect(fmtMass(28_640)).toBe('28.6 kg');
    expect(fmtMass(1_020_000)).toBe('1,020 kg');
    expect(fmtMass(12_340_000)).toBe('12.34 t');
    expect(fmtMass(2_500_000, 'platform', true)).toBe('2.5 t');
    expect(fmtMass(20_000_000, 'lot', true)).toBe('20 t');
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
