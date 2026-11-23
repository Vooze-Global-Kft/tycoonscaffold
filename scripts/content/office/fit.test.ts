/** fit.ts on strings whose width can be reasoned about (4.1, 4.2: s = 1.3, 10 % margin). */
import { describe, expect, it } from 'vitest';
import { advance, BOLD_FACTOR, BOXES, DEFAULT_ADVANCE, fit, measure, SAFETY, wrap, type Box } from './fit';

describe('measure', () => {
  it('is the sum of advances × font size × the 10 % margin', () => {
    expect(SAFETY).toBe(1.1);
    expect(measure('nnnn', 10)).toBeCloseTo(4 * advance('n') * 10 * 1.1, 9);
    expect(measure('', 20)).toBe(0);
  });
  it('narrow letters are narrower than wide ones; capitals wider than lower case', () => {
    expect(measure('iiii', 16)).toBeLessThan(measure('mmmm', 16));
    expect(measure('WWWW', 16)).toBeGreaterThan(measure('wwww', 16));
  });
  it('unknown characters take the default, accented letters their base letter', () => {
    expect(advance('Ж')).toBe(DEFAULT_ADVANCE);
    expect(advance('é')).toBe(advance('e'));
  });
  it('digits are tabular', () => {
    expect(measure('1111', 15)).toBeCloseTo(measure('8888', 15), 9);
  });
});

describe('wrap and fit', () => {
  it('a line of exactly the width fits on one line, one more word wraps', () => {
    const word = 'nnnnn';
    const w = measure(word, 10);
    expect(wrap(word, 10, w).lines).toEqual([word]);
    expect(wrap(`${word} ${word}`, 10, w).lines).toEqual([word, word]);
  });
  it('a word wider than the box does not fit', () => {
    const r = fit('m'.repeat(40), 'proposal');
    expect(r.fits).toBe(false);
    expect(r.overflowWord).toBeDefined();
  });
  it('breaks after a hyphen', () => {
    const w = measure('Dithering-on-', 10) + 1;
    expect(wrap('Dithering-on-the-Dawdle', 10, w).lines[0]).toBe('Dithering-on-');
  });
  it("the proposal box takes 4 lines at 20.8 pt in 315 pt: the specification's longest example fits", () => {
    expect(BOXES.proposal.font).toBeCloseTo(20.8, 9);
    expect(BOXES.proposal.width).toBe(315);
    expect(BOXES.proposal.lines).toBe(4);
    const r = fit('The pumpkin, now a Freeman of the town, wishes to address the council. It has slides.', 'proposal');
    expect(r.fits).toBe(true);
    expect(r.lines).toBeLessThanOrEqual(4);
  });
  it('90 wide capitals do not fit the proposal box', () => {
    expect(fit(Array.from({ length: 15 }, () => 'WWWWW').join(' '), 'proposal').fits).toBe(false);
  });
  it('the goal line is capped at 34 characters (2.16)', () => {
    expect(fit('Ad: Send a Courier (ends it now)', 'goalLine').fits).toBe(true);
    expect(fit('Ad: Send a Courier (ends it right now)', 'goalLine').fits).toBe(false);
  });
  it('a 28-character role fits only if narrow enough; 2.7 caps it at 28', () => {
    expect(fit('Giant Vegetable Society', 'role').fits).toBe(true);
    expect(fit('Keeper of the Ceremonial Spoon', 'role').fits).toBe(false);
  });
  it("the term ribbon's two forms (4.1)", () => {
    expect(fit('Day 41/110 · NR 9/50', 'ribbonShort').fits).toBe(true);
    expect(fit('Acting Governor · Day 41/110 · NR 9/50 · Lv 152/170', 'ribbonLong').fits).toBe(true);
    // The long form is about 400 pt: it does not fit at 375, so the short form is shown there.
    expect(fit('Acting Governor · Day 41/110 · NR 9/50 · Lv 152/170', 'ribbonShort').fits).toBe(false);
  });
  it('the bottom row labels fit 64 pt', () => {
    for (const l of ['Ledger', 'Cabinet', 'Poll', 'Office']) expect(fit(l, 'bottomRow').fits).toBe(true);
  });
});

describe('bold rows and the cut estimate (content-lint-attack.md M1, M3)', () => {
  it('bold boxes measure wider by BOLD_FACTOR: a name that just fits regular does not fit bold', () => {
    expect(BOLD_FACTOR).toBeCloseTo(1.06, 9);
    for (const b of ['name', 'stripTitle', 'stripLabel', 'bottomRow'] as const) expect(BOXES[b].bold).toBe(true);
    expect((BOXES.proposal as Box).bold).toBeFalsy();
    // A run of "n" as wide as the name box at the regular width: 263 pt / (0.59 × 19.5 × 1.1) ≈ 20.8 letters.
    const regular = { ...BOXES.name, bold: false, maxChars: undefined };
    const bold = { ...BOXES.name, maxChars: undefined };
    expect(fit('n'.repeat(20), regular).fits).toBe(true);
    expect(fit('n'.repeat(20), bold).fits).toBe(false);
  });
  it('the cut is the excess, not the line ratio: "Apologise on the steps" is a few characters over the label box', () => {
    const r = fit('Apologise on the steps', 'stripLabel');
    expect(r.fits).toBe(false);
    expect(r.assumed).toBe(true);
    const cut = Number(/shorten by about (\d+) characters/.exec(r.reason ?? '')?.[1]);
    expect(cut).toBeGreaterThanOrEqual(1);
    expect(cut).toBeLessThanOrEqual(6);
    // Cutting that many characters from the end makes it fit.
    expect(fit('Apologise on the steps'.slice(0, 22 - cut), 'stripLabel').fits).toBe(true);
  });
  it("a rival's name with its title takes up to 32 characters", () => {
    expect(fit('Councillor Prudence Stitchley', 'rivalName').fits).toBe(true);
  });
});

