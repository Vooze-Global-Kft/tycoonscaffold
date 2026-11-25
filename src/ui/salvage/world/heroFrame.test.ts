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
const content = SalvageSchema.parse(raw.salvage);
const V = { ppm: 40, tilt: 0.7 };
const IPHONE = { left: 47, top: 0, right: 47, bottom: 21 };

/** A map of the third pass's shape (metres; footprints w x d): a compact core of about 21 x 9 m. */
const CORE = {
  points: { scale: [54, 22.5], weighbridge: [50.5, 25.5], stillage_cu: [43, 22], stillage_br: [43, 23.8], stripper: [47.5, 22.5], crucible: [38.5, 23], board: [45, 26.5] },
  places: { scale: { w: 1.5, d: 1.5 }, weighbridge: { w: 6, d: 3 }, stillage_cu: { w: 1.2, d: 1.2 }, stillage_br: { w: 1.2, d: 1.2 }, stripper: { w: 2.5, d: 1.5 }, crucible: { w: 3, d: 3 }, board: { w: 2, d: 0.4 } },
} as never;

describe('the hero frame', async () => {
  const { HERO, freeWorld, heroBox, heroCheck } = await import('./heroFrame');

  it('is off unless the preview asks (?view=hero)', () => {
    expect(HERO.on).toBe(false);
    expect(HERO.store).toBe(false);
  });

  it('the free world is 4.1\'s rows', () => {
    expect(freeWorld(844, 390, IPHONE)).toEqual({ x0: 47, y0: 64, x1: 797, y1: 301 });
    expect(freeWorld(667, 375, { left: 0, top: 0, right: 0, bottom: 0 })).toEqual({ x0: 16, y0: 60, x1: 651, y1: 299 });
  });

  it('a core of the third pass\'s shape lies whole between the bars at 844 x 390', () => {
    const map = { map: CORE };
    const b = heroBox(map);
    expect(b.missing).toEqual([]);
    expect(b.members.map((m) => m.id).sort()).toEqual(['board', 'crucible', 'scale', 'stillage_br', 'stillage_cu', 'stripper', 'weighbridge']);
    const r = heroCheck(map, V, 844, 390, IPHONE);
    for (const m of r.members) expect(m.inside, `${m.id} ${JSON.stringify(m)}`).toBe(true);
  });

  const box = heroBox(content);
  it.skipIf(box.missing.length > 0)(`the game's own content lies whole between the bars at 844 x 390 (missing now: ${box.missing.join(', ') || 'none'})`, () => {
    const r = heroCheck(content, V, 844, 390, IPHONE);
    for (const m of r.members) expect(m.inside, `${m.id} ${JSON.stringify(m)}`).toBe(true);
  });
});
