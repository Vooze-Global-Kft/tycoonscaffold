/**
 * save.ts: a save from each frozen state reloads equal (but the epoch, bumped, and the presence's
 * timing, never trusted); unknown content is dropped; positions outside the yard are not trusted; a
 * save of another layout starts afresh; the market clock never goes back.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../fixtures/salvage';
import { reconcileSalvage } from './save';
import type { SalvageGame } from './types';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const roundTrip = (g: SalvageGame) => JSON.parse(JSON.stringify(g));
const norm = (g: SalvageGame) => ({ ...g.salvage, epoch: 0, presenceAt: 0, presence: { ...g.salvage.presence, moving: false, standingFor: 0 } });

describe('save and reload', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name} reloads equal`, () => {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      const back = reconcileSalvage(cfg, base(), roundTrip(g), FIXTURE_NOW);
      expect(back.salvage.epoch).toBe(g.salvage.epoch + 1);
      expect(norm(back)).toEqual(norm(roundTrip(g) as SalvageGame));
    });
  }
  it('drops what content does not know, distrusts positions, keeps the clock forward', () => {
    const g = roundTrip(fixtureGame('m30', base(), FIXTURE_NOW) as SalvageGame);
    g.salvage.things.push({ uid: 'zz', obj: 'nosuch', at: { at: 'floor', slot: 9 }, cut: 0, progress: 0, by: null });
    g.salvage.bays.nosuch = { g: 5, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 };
    g.salvage.presence.x = 1e9;
    g.salvage.truck.x = Number.NaN;
    g.salvage.clock.highMs = FIXTURE_NOW - 1e9;
    const back = reconcileSalvage(cfg, base(), g, FIXTURE_NOW);
    expect(back.salvage.things.some((t) => t.uid === 'zz')).toBe(false);
    expect(back.salvage.bays.nosuch).toBeUndefined();
    expect(back.salvage.presence.x).toBeLessThan(1000);
    expect(Number.isFinite(back.salvage.truck.x)).toBe(true);
    expect(back.salvage.clock.highMs).toBeGreaterThanOrEqual(FIXTURE_NOW);
  });
  it('another layout or garbage starts afresh', () => {
    for (const raw of [null, 7, {}, { salvage: { v: 1 } }, { salvage: { v: 2, things: 'x' } }]) {
      const back = reconcileSalvage(cfg, base(), raw, FIXTURE_NOW);
      expect(back.salvage.t).toBe(0);
    }
  });
});
