/**
 * The bars' text rule (spec 4.1 "Text", 10.1 check 5, AGENTS.md fixed-height rule): at 375 and 390
 * pt wide, at font scale 1 and 1.3, every row adds up inside its bar, nothing overlaps, the purse
 * fits its longest form, the season chip shortens to the Festival count before anything wraps (M35),
 * the goal line's parts fit its width, and each bottom-row label fits its button.
 */
import { describe, expect, it } from 'vitest';
import { S } from '../strings';
import { BAR_GUTTER, BOTTOM_H, GOAL_H, PURSE_ICON, TOP_BAR_H, TOP_BUTTON, buttonMetrics, goalMetrics, lineOf, textWidth, topBarMetrics } from './barMetrics';

const WIDTHS = [320, 375, 390, 430];
const SCALES = [0.85, 1, 1.3, 2];
const SEASONS = ['Spring Lanterns', 'Summer Fireflies', 'Second Autumn Moon', 'Fourth Winter Embers'];

describe('top bar', () => {
  for (const w of WIDTHS)
    for (const fs of SCALES)
      for (const bag of [false, true])
        it(`${w} pt, font scale ${fs}, ${bag ? 'with' : 'without'} the gift bag`, () => {
          for (const season of SEASONS) {
            const count = S.hud.festivalCount(5, 6);
            const m = topBarMetrics(w, fs, '000.00K', season, count, bag);
            // The purse's box is centred in the bar, as tall as its line, never with a lineHeight.
            expect(m.purseTop + m.purseBox).toBeLessThanOrEqual(TOP_BAR_H);
            expect(m.purseBox).toBeGreaterThanOrEqual(Math.ceil(m.purseFont * 1.2));
            expect(m.purseW).toBeGreaterThanOrEqual(textWidth('999.99K', m.purseFont, true));
            // Left to right without overlap: purse, chip, bag, menu.
            expect(BAR_GUTTER + PURSE_ICON + 4 + m.purseW).toBeLessThanOrEqual(m.chipX);
            expect(m.chipX + m.chipW).toBeLessThanOrEqual(m.bagX ?? m.menuX);
            if (m.bagX !== null) expect(m.bagX + TOP_BUTTON).toBeLessThanOrEqual(m.menuX);
            expect(m.menuX + TOP_BUTTON).toBeLessThanOrEqual(w);
            // The chip's rows add up inside the bar, and every row's text fits its width (no wrap).
            expect(m.chipTop).toBeGreaterThanOrEqual(0);
            expect(m.chipTop + m.chipRows * m.chipRowH).toBeLessThanOrEqual(TOP_BAR_H);
            m.chipText.forEach((t, i) => expect(textWidth(t, m.chipFont, i === 0 && m.chipRows === 2)).toBeLessThanOrEqual(m.chipW));
            if (m.chipRows === 1) expect(m.chipText).toEqual([count]);
          }
        });

  it('at 375 pt and font scale 1.3 the season name still shows for the first season (M35 shortens only when needed)', () => {
    const m = topBarMetrics(375, 1.3, '000.00K', 'Spring Lanterns', S.hud.festivalCount(0, 4), true);
    expect(m.chipRows).toBe(2);
    expect(m.chipFont).toBeGreaterThanOrEqual(14);
  });
});

describe('goal line', () => {
  const words = 'Grill gear 11: Twin Skewers drop and then some more words that run long';
  for (const w of WIDTHS)
    for (const fs of SCALES)
      it(`${w} pt, font scale ${fs}`, () => {
        const m = goalMetrics(w, fs, words, '1.78K', S.hud.about(20, 's'), 10);
        expect(lineOf(m.font)).toBeLessThanOrEqual(GOAL_H);
        expect(m.wordsW + m.priceW + m.estW + 10).toBeLessThanOrEqual(w - 2 * BAR_GUTTER);
        expect(m.wordsW).toBeGreaterThan(60);
      });

  it('a short goal is not stretched', () => {
    const m = goalMetrics(375, 1, S.hud.goalShutter, '30', '', 10);
    expect(m.wordsW).toBeLessThanOrEqual(textWidth(S.hud.goalShutter, m.font, true) + 2);
  });
});

describe('bottom row', () => {
  const labels = [S.hud.basket, S.hud.book, S.hud.lanterns, S.hud.season, S.hud.shop];
  for (const fs of SCALES)
    it(`font scale ${fs}: icon over label, rows add up inside 48, labels fit`, () => {
      for (const [i, label] of labels.entries()) {
        const w = i === 0 ? 68 : 64;
        const m = buttonMetrics(Math.min(w, 64), fs, labels);
        expect(m.iconTop).toBeGreaterThanOrEqual(0);
        expect(m.iconTop + m.iconSize).toBeLessThanOrEqual(m.labelTop);
        expect(m.labelTop + m.labelH).toBeLessThanOrEqual(BOTTOM_H);
        expect(textWidth(label, m.labelFont, true)).toBeLessThanOrEqual(w - 4);
        expect(m.labelFont).toBeGreaterThanOrEqual(8);
      }
    });
  it('every button of the row shares one icon box and one label baseline (review: "Lanterns" sat lower)', () => {
    for (const fs of SCALES) {
      const row = buttonMetrics(64, fs, labels);
      // The row's one font is the one its longest label fits, so no label is fitted smaller than another.
      for (const label of labels) expect(textWidth(label, row.labelFont, true)).toBeLessThanOrEqual(64 - 6 + 0.5);
      expect(row.labelFont).toBeLessThanOrEqual(buttonMetrics(64, fs, S.hud.book).labelFont);
    }
  });
});
