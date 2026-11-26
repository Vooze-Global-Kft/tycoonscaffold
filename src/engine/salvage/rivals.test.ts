/**
 * rivals.ts (2.11, S17, E27): tonnes pure in the days since the start; over sixty market days of random
 * player tonnage no passed rival passes back and no two rows print the same figure; 26 rows, the
 * player's rank = rows above him + 1. Frozen test content.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, SALVAGE_TEST, fixtureGame, withTestContent } from '../fixtures/salvage';
import { fmtTonnes } from './money';
import { passedCount, rankRows, rivalGrams, shownTonnes, tableOf } from './rivals';
import type { SalvageGame } from './types';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const C = SALVAGE_TEST;

/** A small counter hash (no Math.random in the tests either: reproducible). */
const rnd = (i: number) => {
  let x = (i * 2654435761) >>> 0;
  x ^= x >>> 13;
  x = (x * 1274126177) >>> 0;
  return (x >>> 0) / 4294967296;
};

describe('rivals', () => {
  it('a rival grows with the days since the start, flat after 40', () => {
    expect(rivalGrams(C, 0, 0)).toBe(Math.round(C.rivals.list[0].T0_t * 1e6));
    expect(rivalGrams(C, 3, 10)).toBeGreaterThan(rivalGrams(C, 3, 9));
    expect(rivalGrams(C, 3, 41)).toBe(rivalGrams(C, 3, 40));
  });
  it('sixty market days of random play: passed rivals never pass back, no two rows print alike', () => {
    for (let run = 0; run < 20; run++) {
      let supplied = 0;
      let passed = 0;
      for (let d = 0; d <= 60; d++) {
        for (let k = 0; k < 4; k++) {
          supplied += Math.floor(rnd(run * 1000 + d * 10 + k) ** 3 * 5e6 * (1 + d));
          const np = passedCount(C, supplied, d, passed);
          expect(np).toBeGreaterThanOrEqual(passed);
          passed = np;
          const shown = shownTonnes(C, supplied, d, passed);
          for (let i = 0; i < passed; i++) expect(shown.rivals[i]).toBeLessThan(shown.you);
          for (let i = passed; i < C.rivals.list.length; i++) expect(shown.rivals[i]).toBeGreaterThan(shown.you);
          const printed = [shown.you, ...shown.rivals].filter((x) => x > 0).map(fmtTonnes);
          expect(new Set(printed).size).toBe(printed.length);
        }
      }
    }
  });
  it('the k-th rival below shows at most (1 - 0.03 k) of the player', () => {
    const supplied = 40e6;
    const passed = passedCount(C, supplied, 3, 0);
    const shown = shownTonnes(C, supplied, 3, passed);
    for (let i = passed - 1, k = 1; i >= 0; i--, k++) expect(shown.rivals[i]).toBeLessThanOrEqual((1 - 0.03 * k) * supplied);
  });
  it('26 rows in each frozen state; the player once; rank = position; next is the row above', () => {
    for (const name of FIXTURE_NAMES) {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      const rows = rankRows(C, g);
      expect(rows.length).toBe(26);
      expect(rows.filter((r) => r.id === 'you').length).toBe(1);
      rows.forEach((r, i) => expect(r.rank).toBe(i + 1));
      const t = tableOf(C, g);
      if (t.next) expect(t.next.rival).toBe(rows[t.rank - 2].id);
      for (let i = 1; i < rows.length; i++) expect(rows[i].tonnes_g).toBeLessThanOrEqual(rows[i - 1].tonnes_g);
      expect(t.rungs.length).toBe(9);
    }
  });
});
