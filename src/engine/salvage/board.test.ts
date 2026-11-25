/**
 * board.ts (2.8): the posted price is a pure function of the market day (two "phones" agree), the day
 * word, five days with the usual price, and the step a Sell carries (shown equals applied). Frozen
 * test content and frozen states.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame, withTestContent } from '../fixtures/salvage';
import { dayWord, marketDay, priceBoard, priceOf, sellShown } from './board';
import { floorGrams, lineAmount } from './money';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);

describe('the posted board', () => {
  it('is pure in the day: two phones (two copies of the content) print the same prices', () => {
    const other = structuredClone(SALVAGE_TEST);
    for (let d = 0; d < 400; d++) for (const gr of Object.keys(SALVAGE_TEST.grades)) expect(priceOf(other, gr, d)).toBe(priceOf(SALVAGE_TEST, gr, d));
  });
  it('prices stay near the usual price and step daily, in hundredths', () => {
    for (let d = 0; d < 200; d++) {
      const p = priceOf(SALVAGE_TEST, 'ci', d);
      expect(Math.round(p * 100) / 100).toBe(p);
      expect(Math.abs(p / SALVAGE_TEST.grades.ci.pbar - 1)).toBeLessThan(2 * SALVAGE_TEST.board.a + 1e-9);
    }
  });
  it('the day word follows the band', () => {
    const words = new Set(Array.from({ length: 200 }, (_, d) => dayWord(SALVAGE_TEST, 'ci', d)));
    expect(words.has('usual')).toBe(true);
  });
  it('the board lists the bays, five days (today last) and Sell only on a held bay with the shown step', () => {
    const g = fixtureGame('m30', base(), FIXTURE_NOW);
    const b = priceBoard(cfg, g, FIXTURE_NOW);
    const day = marketDay(SALVAGE_TEST, FIXTURE_NOW);
    expect(b.day).toBe(day);
    expect(b.rows.length).toBe(Object.keys(g.salvage.bays).length);
    for (const r of b.rows) {
      expect(r.days.length).toBe(5);
      expect(r.days[4]).toBe(r.price);
      expect(r.price).toBe(priceOf(SALVAGE_TEST, r.grade, day));
      const bay = g.salvage.bays[r.grade];
      if (!bay.held) expect(r.sell).toBeNull();
      if (r.sell && r.sell.action.act === 'sell') {
        const shown = r.sell.action.shown;
        expect(shown).toEqual(sellShown(cfg, g, r.grade, FIXTURE_NOW));
        expect(shown.grams).toBe(floorGrams(bay.g - bay.forCrucible_g - bay.forDeal_g - bay.aside.reduce((a, x) => a + x.g, 0)));
        expect(r.sell.label.args?.x).toEqual({ money: lineAmount(shown.grams, shown.price) });
      }
    }
    expect(b.rows.some((r) => r.held)).toBe(true);
  });
});
