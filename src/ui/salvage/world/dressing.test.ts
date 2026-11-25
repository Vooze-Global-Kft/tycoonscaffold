/**
 * The yard's dressing (./dressing.ts): the back wall spans the yard along map.north, the ground's wear keeps
 * off every place and bed, and a bed shrinks with its stock towards its wall side. On the rules' frozen test
 * content and on the shipped game's content (structure only: no tuned number is pinned).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { SalvageContent } from '../../../config/schema.salvage';

vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: {}, BlendMode: {}, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, TileMode: {} }));

const { SALVAGE_TEST } = await import('../../../engine/fixtures/salvage');
const game = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8'));
const shipped: SalvageContent | null = game.salvage ?? null;
const { dressing, bedDress, bedShares, bedZones, bedOf, northOf, BLOCK_M } = await import('./dressing');

const contents: [string, SalvageContent][] = [['test content', SALVAGE_TEST as SalvageContent]];
if (shipped) contents.push(['the game', shipped]);

describe.each(contents)('dressing on %s', (_name, c) => {
  const d = dressing(c);
  it('the back wall: lock blocks along map.north across the whole width, and floodlights', () => {
    const blocks = d.filter((x) => x.id === 'plant.block');
    expect(blocks.length).toBe(Math.ceil((c.yard.width - 0.01 - BLOCK_M / 2) / BLOCK_M));
    for (const b of blocks) expect(b.y).toBe(northOf(c));
    expect(Math.min(...blocks.map((b) => b.x))).toBeLessThan(1);
    expect(Math.max(...blocks.map((b) => b.x))).toBeGreaterThan(c.yard.width - 1);
    expect(d.filter((x) => x.id === 'plant.floodlight').length).toBeGreaterThanOrEqual(2);
  });
  it('wear on the ground, never on a place, a bed or north of the wall', () => {
    const wear = d.filter((x) => ['ground.oil', 'ground.puddle'].includes(x.id) || (x.id === 'ground.weeds' && x.y > northOf(c) + 1 && x.y < c.yard.depth - 1));
    expect(wear.length).toBeGreaterThan(10);
    for (const w of wear) {
      expect(w.y).toBeGreaterThan(northOf(c));
      for (const [id, pl] of Object.entries(c.map.places)) {
        const p = c.map.points[id];
        if (!p) continue;
        const inside = Math.abs(w.x - p[0]) < pl.w / 2 && Math.abs(w.y - p[1]) < pl.d / 2;
        expect(inside, `${w.id} at ${w.x},${w.y} in ${id}`).toBe(false);
      }
    }
  });
  it('the same content gives the same dressing', () => {
    expect(dressing(c)).toEqual(d);
  });
  it('a bed is laid over its rectangle when full and shrinks with its stock', () => {
    for (const z of bedZones(c)) {
      const b = bedOf(c, z)!;
      const full = bedDress(c, z, 1);
      expect(full.length).toBeGreaterThan(0);
      for (const t of full) {
        expect(t.x).toBeGreaterThanOrEqual(b.x0);
        expect(t.x).toBeLessThanOrEqual(b.x0 + b.w);
        expect(t.y).toBeGreaterThanOrEqual(b.y0);
        expect(t.y).toBeLessThanOrEqual(b.y0 + b.d);
        expect(t.alpha).toBeUndefined();
      }
      const solid = (s: number) => bedDress(c, z, s).filter((t) => t.alpha === undefined).length;
      expect(solid(0.5)).toBeLessThan(full.length);
      expect(solid(0.25)).toBeLessThanOrEqual(solid(0.5));
      expect(solid(0)).toBe(0);
      expect(bedDress(c, z, 0).length).toBeGreaterThan(0);
      // two looks per tier
      expect(new Set(full.map((t) => t.frame)).size).toBe(full.length > 3 ? 2 : new Set(full.map((t) => t.frame)).size);
    }
  });
  it('the share of stock left comes from the things of each zone', () => {
    const zs = bedZones(c);
    if (!zs.length) return;
    const z = zs[0];
    expect(bedShares(c, [])[z]).toBe(0);
    const total = Object.values(c.zones[z].things).reduce((a, n) => a + (n as number), 0);
    const things = Array.from({ length: total }, (_, k) => ({ uid: `${z}.x.${k}` }));
    expect(bedShares(c, things)[z]).toBe(1);
    expect(bedShares(c, things.slice(0, Math.floor(total / 2)))[z]).toBeCloseTo(Math.floor(total / 2) / total);
  });
});
