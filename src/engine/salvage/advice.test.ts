/**
 * advice.ts (2.10, E2, E19, E29): the advice line names the cheapest useful purchase within cash plus
 * advice.minutes of income, never a level that binds nothing, never something owned; the reserve.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../fixtures/salvage';
import { advice, binding, carryGrams, levelBinds, reserve } from './advice';
import { buyCheck, hireCheck } from './ladder';
import { incomeRate } from './tick';
import type { GroundPiece, SalvageGame, ThingState } from './types';

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

/**
 * The measure engineer's case (requests.md 21:05, the lead's 21:12 ruling): from minute ~35 some 2.2 t
 * of pieces ALREADY CUT lie on the tipping floor waiting for the yard hands. That is the carry's backlog:
 * the advice names a yard hand (another hand or a hand's level), never the cutter's level. The cutter
 * binds only when uncut things wait on the floor and the hands have no backlog.
 */
describe('what binds: cut pieces waiting are the carry, uncut things the cutter', () => {
  const m30 = () => fixtureGame('m30', base(), FIXTURE_NOW) as SalvageGame;
  const piecesOnFloor = (g: SalvageGame, kg: number): SalvageGame => {
    const grade = Object.keys(cfg.salvage.grades)[0];
    const add: GroundPiece[] = [];
    for (let n = 0, left = kg * 1000; left > 0; n++, left -= 20000) add.push({ uid: `t.p${n}`, grade, g: Math.min(20000, left), from: 't', spec: 0, pile: 'floor', k: 1000 + n, claim: null });
    return { ...g, salvage: { ...g.salvage, pieces: [...g.salvage.pieces.filter((p) => p.pile.startsWith('zone.')), ...add] } };
  };
  const uncutOnFloor = (g: SalvageGame, kg: number): SalvageGame => {
    const [obj, o] = Object.entries(cfg.salvage.objects).sort((a, b) => b[1].waste_g + b[1].pieces.reduce((x, p) => x + p[1] * p[2], 0) - (a[1].waste_g + a[1].pieces.reduce((x, p) => x + p[1] * p[2], 0)))[0];
    const each = o.waste_g + o.pieces.reduce((x, p) => x + p[1] * p[2], 0);
    const things: ThingState[] = [];
    for (let n = 0; n * each < kg * 1000; n++) things.push({ uid: `f${900 + n}`, obj, at: { at: 'floor', slot: n }, cut: 0, progress: 0, by: null });
    return { ...g, salvage: { ...g.salvage, things: [...g.salvage.things, ...things] } };
  };

  it('2.2 t cut on the floor at m30: the hand binds, the cutter does not; the advice names a yard hand', () => {
    const g0 = m30();
    expect(g0.salvage.crew.some((m) => m.role === 'cutter')).toBe(true);
    const g = { ...piecesOnFloor(g0, 2200), cash: 1e5 };
    expect(carryGrams(g)).toBe(2200 * 1000);
    const b = binding(cfg, g);
    expect(b.hand).toBe(true);
    expect(b.cutter).toBe(false);
    const cutter = g.salvage.crew.find((m) => m.role === 'cutter')!;
    const hand = g.salvage.crew.find((m) => m.role === 'hand')!;
    expect(levelBinds(cfg, g, { kind: 'crew', id: cutter.id }, b)).toBe(false);
    expect(levelBinds(cfg, g, { kind: 'crew', id: hand.id }, b)).toBe(true);
    const a = advice(cfg, g, FIXTURE_NOW)!;
    const namesHand = (a.action.act === 'hire' && a.action.role === 'hand') || (a.action.act === 'level' && a.action.target.kind === 'crew' && a.action.target.id.startsWith('hand.'));
    expect(namesHand, JSON.stringify(a.line)).toBe(true);
  });

  it('the same 2.2 t with uncut things on the floor too: still the carry, not the cutter', () => {
    const g = { ...uncutOnFloor(piecesOnFloor(m30(), 2200), 2000), cash: 1e5 };
    const b = binding(cfg, g);
    expect(b.hand).toBe(true);
    expect(b.cutter).toBe(false);
  });

  it('uncut things waiting and no cut pieces waiting: the cutter binds', () => {
    const g = { ...uncutOnFloor(piecesOnFloor(m30(), 0), 2000), cash: 1e5 };
    const b = binding(cfg, g);
    expect(b.hand).toBe(false);
    expect(b.cutter).toBe(true);
  });

  it('pieces in a zone pile are the boss\'s: no hand binds on them', () => {
    const g = m30();
    expect(g.salvage.pieces.some((p) => p.pile.startsWith('zone.'))).toBe(true);
    expect(carryGrams(g)).toBe(0);
  });
});
