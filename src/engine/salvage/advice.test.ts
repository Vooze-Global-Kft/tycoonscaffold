/**
 * advice.ts (2.10, E2, E19, E29): the advice line names the cheapest useful purchase within cash plus
 * advice.minutes of income, never a level that binds nothing, never something owned; the reserve.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../fixtures/salvage';
import { advice, binding, levelBinds, reserve } from './advice';
import { buyCheck, hireCheck } from './ladder';
import { incomeRate } from './tick';
import type { SalvageGame } from './types';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);

describe('the advice line', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name}: within budget, useful, never owned, the check's price`, () => {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      for (const cash of [0, 100, 1000, 1e5]) {
        const h = { ...g, cash };
        const a = advice(cfg, h, FIXTURE_NOW);
        if (!a) continue;
        expect(a.price).toBeLessThanOrEqual(cash + cfg.salvage.advice.minutes * incomeRate(cfg, h) - reserve(cfg, h) + 1e-9);
        if (a.action.act === 'level') expect(levelBinds(cfg, h, a.action.target, binding(cfg, h))).toBe(true);
        if (a.action.act === 'buy') {
          const ch = buyCheck(cfg, h, a.action.item);
          expect(['owned', 'arriving', 'locked']).not.toContain(ch.state);
          expect(ch.price).toBe(a.price);
        }
        if (a.action.act === 'hire') expect(hireCheck(cfg, h, a.action.role).price).toBe(a.price);
      }
    });
  }
  it('the reserve is 0 without a driver', () => {
    expect(reserve(cfg, fixtureGame('fresh', base(), FIXTURE_NOW) as SalvageGame)).toBe(0);
  });
});
