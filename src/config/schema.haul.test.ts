/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HAUL_STARTING_CONTENT, HaulSchema, lintHaul } from './schema.haul';

describe('haul schema', () => {
  it('the starting content parses and lints clean', () => {
    const h = HaulSchema.parse(HAUL_STARTING_CONTENT);
    expect(h.rings.reduce((a, r) => a + r.slots.length, 0)).toBe(12);
    expect(h.conditions).toHaveLength(6);
    expect(h.starMap.nodes).toHaveLength(8);
    expect(h.modules).toHaveLength(8);
    expect(lintHaul(h, h.modules.map((m) => m.card), ['scrap', 'derelict'])).toEqual([]);
  });

  it('conditions default to "untouched"', () => {
    const h = HaulSchema.parse(HAUL_STARTING_CONTENT);
    const storms = h.conditions.find((c) => c.id === 'storms')!;
    expect(storms).toMatchObject({ interval: 0.5, drill: 1, life: 1, speed: 1, capacity: 1, distance: 1, pileCap: 1, freighterCap: 1, away: 1, contractAdd: 0 });
  });

  it('lint finds cross-field mistakes', () => {
    const bad = HaulSchema.parse({
      ...HAUL_STARTING_CONTENT,
      rings: [
        { name: 'A', distance: 2, slots: [0], drill: 1, life: [10, 20], weights: { iron: 1, gold: 2 } },
        { name: 'B', distance: 1, slots: [0], drill: 1, life: [10, 20], weights: { iron: 0 } },
      ],
      contracts: { ...HAUL_STARTING_CONTENT.contracts, first: { buyer: 99, ore: 'unobtainium', units: 10, mult: 1.5 } },
      modules: [{ card: 'diamondbit', socket: 'rig', stat: 'drillRate' }],
    });
    const problems = lintHaul(bad, ['other'], ['scrap']).join('\n');
    expect(problems).toContain('unknown ore "gold"');
    expect(problems).toContain('rings must move outward');
    expect(problems).toContain('needs at least one positive weight');
    expect(problems).toContain('contracts.first.ore');
    expect(problems).toContain('contracts.first.buyer');
    expect(problems).toContain('not a card in meta.cards');
    expect(problems).toContain('no module fits the fleet socket');
    expect(problems).toContain('"derelict" is not a chest');
    expect(problems).toContain('headStart');
  });

  it('rejects broken values', () => {
    expect(HaulSchema.safeParse({ ...HAUL_STARTING_CONTENT, ores: [] }).success).toBe(false);
    expect(HaulSchema.safeParse({ ...HAUL_STARTING_CONTENT, seam: { interval: [150, 90] } }).success).toBe(false);
    expect(HaulSchema.safeParse({ ...HAUL_STARTING_CONTENT, rig: { ...HAUL_STARTING_CONTENT.rig, levelGrowth: 1 } }).success).toBe(false);
  });

  it('keeps the buyer lines, the contract rule numbers and the seam floor', () => {
    const shipped = JSON.parse(readFileSync(join(__dirname, '../../games/space-miner/game.json'), 'utf8')).haul;
    const h = HaulSchema.parse(shipped);
    expect(h.contracts.buyers.every((b) => typeof b.calls === 'string' && typeof b.closed === 'string')).toBe(true);
    expect(h.contracts.buyers[0].calls).toContain('{ore}');
    const d = HaulSchema.parse(HAUL_STARTING_CONTENT);
    expect(d.contracts.reach).toEqual([0.35, 0.75]);
    expect(d.contracts.fleetShare).toBe(0.5);
    expect(d.contracts.minUnits).toBe(3);
    // Errata 20: the seam interval floor is 30 s, in the defaults too.
    expect(HaulSchema.parse({ ...HAUL_STARTING_CONTENT, seam: undefined }).seam.minInterval).toBe(30);
    expect(HaulSchema.safeParse({ ...HAUL_STARTING_CONTENT, contracts: { ...HAUL_STARTING_CONTENT.contracts, fleetShare: 0 } }).success).toBe(false);
  });
});
