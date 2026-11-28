/// <reference types="node" />
/**
 * HARNESS (PLAN2 batch 0c): the node rebuild of the frame's draw list (./costHarness.ts) against the development panel.
 *
 * CALIBRATION: the preview's `?preset=m30&dev=1` at 844 x 390 (dsf 1), looked at on 28 Nov 01:40 (shot in
 * phasec/harness/shots/m30-dev.png), reads "actors 7  sprites 228  runs 15"; the harness reads draws 15 and actors 7
 * on the same preset at the settled camera (sprites 219: the preview had played about 45 s more of the rules and of
 * its own presence samples). The plan's "runs 17" is the 26 Nov reading of an older tree (PLAN2-errata, HARNESS).
 * This one test reads the game's own content (it measures the shipped first yard's frame, not a rule); the others
 * run on the rules' frozen test content.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

const H = await import('./costHarness');
const A = await import('./actors');
const M = await import('./motion');
const Cam = await import('./camera');
const Co = await import('./collide');
const Y = await import('./yard');
const { planSheet } = await import('./atlas');
const { YARD } = await import('../art/palette');
const { OBJECT_SPRITE } = await import('../art/manifest/things');
const R = await import('../../../engine/salvage');
const tick = await import('../../../engine/salvage/tick');
const { SALVAGE_TEST, FIXTURE_NOW } = await import('../../../engine/fixtures/salvage');

const mods: import('./costHarness').HarnessMods = {
  A,
  M,
  Cam,
  Co,
  Y,
  frame: R.frame,
  planSheet,
  vests: { hand: YARD.vestYardHand, cutter: YARD.vestCutter, driver: YARD.vestDriver },
  objectSprite: OBJECT_SPRITE,
};

describe('the harness reads what frameLoop.ts draws with', () => {
  it("holds frameLoop.ts's pool capacities and FEEL values (read from its source)", () => {
    const src = fs.readFileSync(path.join(__dirname, 'frameLoop.ts'), 'utf8');
    const num = (re: RegExp) => Number(re.exec(src)?.[1]);
    expect(num(/const CAP_DECAL = (\d+);/)).toBe(H.LOOP.CAP_DECAL);
    expect(num(/const CAP_SHADOW = (\d+);/)).toBe(H.LOOP.CAP_SHADOW);
    expect(num(/const CAP_SORT = (\d+);/)).toBe(H.LOOP.CAP_SORT);
    expect(num(/driveZoom: ([\d.]+),/)).toBe(H.LOOP.driveZoom);
    expect(num(/vehicleV: ([\d.]+),/)).toBe(H.LOOP.vehicleV);
    expect(num(/strideM: ([\d.]+),/)).toBe(H.LOOP.strideM);
    expect(num(/workFrameS: ([\d.]+),/)).toBe(H.LOOP.workFrameS);
  });

  it('counts runs as drawRuns does: one per change of sheet or mirroring, in the sorted order', () => {
    const L = A.makeListW(8, 0);
    const cells = [A.packCell(0, 1, false), A.packCell(0, 2, false), A.packCell(1, 1, false), A.packCell(1, 1, true), A.packCell(0, 3, false)];
    cells.forEach((c, i) => {
      L.cell[i] = c;
      L.order[i] = i;
    });
    L.n = cells.length;
    expect(H.countRuns(L, false)).toBe(4);
    L.order.set([0, 4, 1, 2, 3]);
    expect(H.countRuns(L, true)).toBe(3);
    L.n = 0;
    expect(H.countRuns(L, true)).toBe(0);
  });
});

describe('the harness on the frozen test content', () => {
  const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as import('../../../engine/salvage').SalvageConfig;
  const g0 = { cash: 0, stats: { playSeconds: 0 }, salvage: R.freshSalvage(cfg, FIXTURE_NOW) } as unknown as import('../../../engine/salvage').SalvageGame;

  it('draws a fresh yard: every map and scene id resolves, the boss is drawn, the counts add up', () => {
    const h = H.makeHarness(mods, SALVAGE_TEST, { SW: 844, SH: 390 });
    const d = h.draw(R.frame(cfg, g0));
    expect([...h.misses.statics.keys()]).toEqual([]);
    expect([...h.misses.scene.keys()]).toEqual([]);
    expect([...h.unknown.keys()]).toEqual([]);
    expect(d.people.some((p) => p.who === 'boss')).toBe(true);
    expect(d.cost.sprites).toBe(d.cost.lists.decal + d.cost.lists.shadow + d.cost.lists.sorted);
    expect(d.cost.draws).toBe(d.cost.runs.decal + d.cost.runs.shadow + d.cost.runs.sorted);
    expect(d.sorted.length).toBe(d.cost.lists.sorted);
    expect(d.cost.statics).toBe((h.statics.length + d.scene.items.length) / A.ITEM);
    expect(d.cost.draws).toBeGreaterThan(0);
  });

  it('is deterministic: two harnesses over the same frames give the same lists, tick after tick', () => {
    const a = H.makeHarness(mods, SALVAGE_TEST, { SW: 667, SH: 375 });
    const b = H.makeHarness(mods, SALVAGE_TEST, { SW: 667, SH: 375 });
    let g = g0;
    let ms = FIXTURE_NOW;
    for (let i = 0; i < 30; i++) {
      ms += 100;
      g = tick.advanceSalvage(cfg, g, 0.1, ms, []);
      const f = R.frame(cfg, g);
      const da = a.draw(f, { clock: i * 0.1, dt: 0.1 });
      const db = b.draw(f, { clock: i * 0.1, dt: 0.1 });
      expect(JSON.stringify([da.cost, da.sorted, da.shadow, da.decal])).toBe(JSON.stringify([db.cost, db.sorted, db.shadow, db.decal]));
    }
  });

  it('names a requested id that resolves to -1 and an id the manifest does not know (R5)', () => {
    const h = H.makeHarness(mods, SALVAGE_TEST, { SW: 844, SH: 390 });
    const f = R.frame(cfg, g0);
    const f2 = { ...f, fixtures: [...(f.fixtures ?? []), { id: 'x', sprite: 'works.nothing.here', x: 10, y: 10 }] } as typeof f;
    h.draw(f2);
    expect([...h.unknown.keys()]).toContain('fixture works.nothing.here');
    expect(h.res('plant.stillage', 0, 0)).toBeGreaterThanOrEqual(0);
    expect(h.res('works.not.baked', 1, 2)).toBe(-1);
    expect([...h.misses.scene.keys()]).toContain('works.not.baked#1#2');
  });
});

describe('calibration: the first yard m30 at 844 x 390 against the development panel', async () => {
  const gameJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8'));
  const { GameConfigSchema } = await import('../../../config/schema');
  const { SalvageSchema } = await import('../../../config/schema.salvage');
  const PW = await import('../../../modes/salvage/presets.web');
  const cfg = { ...GameConfigSchema.parse(gameJson), salvage: SalvageSchema.parse(gameJson.salvage) } as unknown as import('../../../engine/salvage').SalvageConfig;

  it('reads draws 15 and actors 7 (the panel: "actors 7  sprites 228  runs 15"); every id resolves', { timeout: 120_000 }, () => {
    const g = PW.salvagePreset(cfg as never, 'mid', FIXTURE_NOW + 3_600_000) as unknown as import('../../../engine/salvage').SalvageGame;
    const h = H.makeHarness(mods, cfg.salvage, { SW: 844, SH: 390 });
    const d = h.draw(R.frame(cfg, g));
    expect(d.cost.draws).toBe(15);
    expect(d.cost.actors).toBe(7);
    // within 10 % of the panel's sprites (it had played on)
    expect(Math.abs(d.cost.sprites - 228)).toBeLessThanOrEqual(23);
    expect([...h.misses.statics.keys(), ...h.misses.scene.keys(), ...h.unknown.keys()]).toEqual([]);
  });
});
