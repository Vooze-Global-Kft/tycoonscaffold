/// <reference types="node" />
/**
 * The hero frame (heroFrame.ts; yard-stage1.md section 3, S19, E23): with the hero camera the platform
 * scale, the weighbridge, the stripper pad, the crucible pad, the copper and brass stillages and the
 * price board lie between the top bar and the bottom row at 844 x 390 (insets L 47, R 47, B 21).
 * On the game's own content once it has every member's footprint (the third numbers pass adds the price
 * board and the two stillages: until then that case is skipped and says which are missing); the maths
 * on a layout of the third pass's shape.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SalvageSchema } from '../../../config/schema.salvage';

vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }) }));

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'games', 'scrap-yard', 'game.json'), 'utf8'));
const parsed = SalvageSchema.safeParse(raw.salvage);
const content = parsed.success ? parsed.data : null;
const V = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };
const IPHONE = { left: 47, top: 0, right: 47, bottom: 21 };

/** A map of the third pass's shape (metres; footprints w x d): a compact core of about 21 x 9 m. */
const CORE = {
  points: { scale: [54, 22.5], weighbridge: [50.5, 25.5], stillage_cu: [43, 22], stillage_br: [43, 23.8], stripper: [47.5, 22.5], crucible: [38.5, 23], board: [45, 26.5] },
  places: { scale: { w: 1.5, d: 1.5 }, weighbridge: { w: 6, d: 3 }, stillage_cu: { w: 1.2, d: 1.2 }, stillage_br: { w: 1.2, d: 1.2 }, stripper: { w: 2.5, d: 1.5 }, crucible: { w: 3, d: 3 }, board: { w: 2, d: 0.4 } },
} as never;

describe('the hero frame', async () => {
  const { HERO, FAR_YARD_PT, freeWorld, heroBox, heroCheck } = await import('./heroFrame');

  it('is off unless the preview asks (?view=hero)', () => {
    expect(HERO.on).toBe(false);
    expect(HERO.store).toBe(false);
  });

  it('the free world is 4.1\'s rows', () => {
    expect(freeWorld(844, 390, IPHONE)).toEqual({ x0: 47, y0: 64, x1: 797, y1: 301 });
    expect(freeWorld(667, 375, { left: 0, top: 0, right: 0, bottom: 0 })).toEqual({ x0: 16, y0: 60, x1: 651, y1: 299 });
  });

  it('a frame of MAP.md M7\'s size (16.7 x 9.7 m south of the wall) holds whole at 667 x 375 and 844 x 390, the wall with 40 pt of far yard under the bar', () => {
    // A made-up map: the wall at y 10, the frame south of it, members at its corners.
    const map = {
      map: {
        north: 10,
        hero: { x0: 20, y0: 10, w: 16.7, d: 9.7, places: ['a', 'b'] },
        points: { a: [21, 11.2], b: [35.6, 19.0] },
        places: { a: { w: 1.5, d: 1.5 }, b: { w: 1.6, d: 1.2 } },
      },
    } as never;
    for (const [W, H, ins] of [[844, 390, IPHONE], [667, 375, { left: 0, top: 0, right: 0, bottom: 0 }]] as const) {
      const r = heroCheck(map, V, W, H, ins);
      for (const m of r.members) expect(m.inside, `${W}: ${m.id} ${JSON.stringify(m)}`).toBe(true);
      expect(r.farYard!, `${W}: far yard ${r.farYard}`).toBeGreaterThanOrEqual(FAR_YARD_PT);
    }
  });

  const box = content ? heroBox(content) : null;
  for (const [W, H, ins] of [[844, 390, IPHONE], [667, 375, { left: 0, top: 0, right: 0, bottom: 0 }]] as const)
    it.skipIf(!box || box.missing.length > 0)(`the game's own map.hero lies whole between the bars at ${W} x ${H} (missing now: ${box ? box.missing.join(', ') || 'none' : 'game.json does not parse'})`, () => {
      const r = heroCheck(content!, V, W, H, ins);
      for (const m of r.members) expect(m.inside, `${m.id} ${JSON.stringify(m)}`).toBe(true);
      // The back wall with the far yard over it (once the content has map.north).
      if (r.farYard !== null) expect(r.farYard, 'far yard under the top bar').toBeGreaterThanOrEqual(FAR_YARD_PT);
    });
});
