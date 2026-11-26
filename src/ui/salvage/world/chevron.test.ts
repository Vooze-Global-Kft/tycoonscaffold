/**
 * screens1 finding 5 (the owner's review, point 5; RULING-owner1 T2): the chevron draws the frame's own target
 * for the load's steps, the weighbridge's and the floor's stops on the drive line included.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));

const { SalvageSchema } = await import('../../../config/schema.salvage');
const R = await import('../../../engine/salvage');
const { chevronTarget, chevronZ } = await import('./chevron');
const GAME = SalvageSchema.parse(JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage);
const cfg = { mode: 'salvage', salvage: GAME } as unknown as import('../../../engine/salvage').SalvageConfig;

function loaded(weighed: boolean, x: number, y: number) {
  const s = R.freshSalvage(cfg, 0);
  const truck = { ...s.truck, owned: true, by: 'boss' as const, x, y, skip: { partner: 'partnerFarm', slot: 0, contents: {}, mass_g: 1, price: 0, trial: true, weighed } };
  return { cash: 0, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: { ...s, truck, presence: { ...s.presence, x, y, driving: true } } } as unknown as import('../../../engine/salvage').SalvageGame;
}

describe('the chevron over the load\'s steps', () => {
  it('a skip aboard, not weighed: the weighbridge\'s stop; weighed: the floor\'s stop (the frame\'s own targets)', () => {
    const stops = GAME.map.driveLine?.stops as Record<string, [number, number]>;
    for (const [weighed, id] of [[false, 'weighbridge'], [true, 'floor']] as const) {
      const g = loaded(weighed, GAME.yard.width + 60, GAME.map.points.gate[1]);
      const f = R.frame(cfg, g);
      expect(f.chevron?.id).toBe(id);
      const tg = chevronTarget(cfg, g, f);
      expect(tg).toEqual(f.chevron);
      expect(tg!.x).toBeCloseTo(stops[id][0]);
      expect(tg!.y).toBeCloseTo(stops[id][1]);
      const z = chevronZ(cfg, f, id);
      expect(Number.isFinite(z) && z > 0).toBe(true);
    }
  });
});
