/**
 * ladder.ts (2.11, 2.15, E13a, E25): one check per purchase in the order of the actions' refusals;
 * levels open at their gate; level prices rise with the level; rungs and range; ceilings.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NOW, fixtureGame, withTestContent } from '../fixtures/salvage';
import { buyCheck, ceilingFor, hireCheck, levelCheck, levelPrice, rangeCount, rungReached, rungSign, shopPrice } from './ladder';
import type { SalvageGame } from './types';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const st = (n: Parameters<typeof fixtureGame>[0]) => fixtureGame(n, base(), FIXTURE_NOW) as SalvageGame;

describe('purchase checks', () => {
  it('owned, gate, cash, then buy', () => {
    const g = st('fresh');
    expect(buyCheck(cfg, { ...g, cash: 0 }, 'sack').refusal?.key).toBe('cash');
    expect(buyCheck(cfg, { ...g, cash: 0 }, 'sack').refusal?.args).toEqual({ x: { money: 50 } });
    expect(buyCheck(cfg, { ...g, cash: 1e6 }, 'sack').state).toBe('buy');
    expect(buyCheck(cfg, { ...g, cash: 1e6 }, 'torch').refusal?.key).toBe('rung');
    expect(shopPrice(cfg, { ...g, cash: 1e6 }, 'torch')).toBeNull();
    const owned = { ...g, salvage: { ...g.salvage, owned: ['sack'] } };
    expect(buyCheck(cfg, owned, 'sack').state).toBe('owned');
  });
  it('the driver earmark holds cash: earmark, not cash', () => {
    const g = st('fresh');
    const e = { ...g, cash: 60, salvage: { ...g.salvage, truck: { ...g.salvage.truck, earmark: { money: 20, floor_g: 0 } } } };
    expect(buyCheck(cfg, e, 'sack').refusal?.key).toBe('earmark');
  });
  it('a hire takes the next crew key of its role; none left: noPlace', () => {
    const g = { ...st('fresh'), cash: 1e6 };
    expect(hireCheck(cfg, g, 'hand').key).toBe('hand1');
    const m30 = { ...st('m30'), cash: 1e6 };
    expect(hireCheck(cfg, m30, 'driver').refusal?.key).toBe('noPlace');
  });
  it('levels: not owned, gated until their gate, rising in price with the level, top', () => {
    const f = { ...st('fresh'), cash: 1e9 };
    expect(levelCheck(cfg, f, { kind: 'machine', machine: 'bench' }).refusal?.key).toBe('notOwned');
    const g = { ...st('m30'), cash: 1e9 };
    const m = g.salvage.crew[0];
    const ch = levelCheck(cfg, g, { kind: 'crew', id: m.id });
    expect(['buy', 'locked']).toContain(ch.state);
    const p1 = levelPrice(cfg, g, { kind: 'crew', id: m.id })!;
    const up = { ...g, salvage: { ...g.salvage, crew: g.salvage.crew.map((x) => (x.id === m.id ? { ...x, level: x.level + 3 } : x)) } };
    expect(levelPrice(cfg, up, { kind: 'crew', id: m.id })!).toBeGreaterThanOrEqual(p1);
    const top = { ...g, salvage: { ...g.salvage, crew: g.salvage.crew.map((x) => (x.id === m.id ? { ...x, level: 999 } : x)) } };
    expect(levelPrice(cfg, top, { kind: 'crew', id: m.id })).toBeNull();
  });
});

describe('rungs, range, ceilings', () => {
  it('rung from tonnes and range, never down, stage 1 stops at 3', () => {
    const g = st('fresh');
    expect(rungReached(cfg, g)).toBe(1);
    const worth = Object.fromEntries(['lightiron', 'castiron', 'steel', 'alu', 'brass', 'copper'].map((m) => [m, 1e9]));
    const big = { ...g, salvage: { ...g.salvage, ladder: { ...g.salvage.ladder, supplied_g: 1e15, worth } } };
    expect(rungReached(cfg, big)).toBe(3);
    expect(rangeCount(cfg.salvage, worth)).toBeGreaterThanOrEqual(5);
    const noRange = { ...g, salvage: { ...g.salvage, ladder: { ...g.salvage.ladder, supplied_g: 1e15, worth: {} } } };
    expect(rungReached(cfg, noRange)).toBe(1);
  });
  it('the ceiling is the rung\'s; the rung sign names tonnes and what opens', () => {
    expect(ceilingFor(cfg, st('fresh'))).toBe(cfg.salvage.ceilings_t_h[0]);
    const s = rungSign(cfg.salvage, 2);
    expect(s.t_g).toBe(cfg.salvage.ladder.rung2.t * 1e6);
    expect(s.opens[0].key).toBe('opens.rung2');
  });
});
