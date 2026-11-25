/// <reference types="node" />
/**
 * The walkable yard's plain maths (docs/design/yard-ground.md): collision with sliding, the narrow gap
 * only the worker passes, the yard's size in screens, the stick, the atlas's size, and what the rules
 * table carries to the UI thread. On the scrap-yard block (until the content package writes the real one it is
 * the rules' frozen test content, which keeps the ground work's wall, gaps and solids).
 * Hour-0 contract step: the counts follow the rules' yard (places are "machine" props, things "wreck"
 * props, yard.ts rulesProps); the six helpers are asked for; the rules table reads the rules' FrameTable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SalvageSchema } from '../../../config/schema.salvage';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'games', 'scrap-yard', 'game.json'), 'utf8'));
const content = SalvageSchema.parse(raw.salvage);

describe('the test yard', async () => {
  const { yardLayout, screensSpanned, SOLID_STRIDE } = await import('./yard');
  const { moveBody, blocked, nearestAct } = await import('./collide');
  const y = yardLayout(content);
  const run = (x0: number, y0: number, vx: number, vy: number, r: number, seconds: number) => {
    const out = [0, 0];
    let x = x0;
    let yy = y0;
    for (let i = 0; i < seconds * 60; i++) {
      moveBody(out, x, yy, vx / 60, vy / 60, r, y.solids, y.width, y.depth, 0, 0, 0);
      x = out[0];
      yy = out[1];
    }
    return { x, y: yy };
  };

  it('is at least 3 screens wide and 2 high at 844 x 390 (and at 667 x 375)', () => {
    expect(screensSpanned(y, 844, 390).wide).toBeGreaterThanOrEqual(3);
    expect(screensSpanned(y, 844, 390).high).toBeGreaterThanOrEqual(2);
    expect(screensSpanned(y, 667, 375).wide).toBeGreaterThanOrEqual(3);
  });

  it('packs the solid props (not the truck), the things and the places as interactables, and six helpers through the wall\'s wide gap', () => {
    expect(y.solids.length / SOLID_STRIDE).toBe(y.props.filter((p) => p.solid && p.kind !== 'truck').length);
    expect(y.actList.filter((a) => a.kind === 1)).toHaveLength(y.props.filter((p) => p.kind === 'machine').length);
    expect(y.actList.length).toBe(y.props.filter((p) => p.kind === 'machine' || p.kind === 'wreck').length);
    const h6 = yardLayout(content, { helpers: 6 });
    expect(h6.helpers).toHaveLength(6);
    for (const h of h6.helpers) {
      expect(h.pts[2]).toBe(24);
      expect(Math.abs(h.pts[3] - 12)).toBeLessThanOrEqual(0.5);
    }
    expect(yardLayout(content, { helpers: 40, extraCrates: 50 }).helpers).toHaveLength(40);
    expect(yardLayout(content, { extraCrates: 50 }).props.length).toBe(y.props.length + 50);
  });

  it('a body running into the wall at an angle slides along it instead of stopping', () => {
    // Up and to the right from left of the wall (x 22.8 to 25.2, from y 14 to 22.6 in two sections): x stops at the wall, y keeps moving.
    const end = run(20, 20, 3, -3, 0.35, 1.5);
    expect(end.x).toBeCloseTo(24 - 1.2 - 0.35, 2);
    expect(end.y).toBeLessThan(20 - 3);
    expect(blocked(end.x, end.y, 0.35, y.solids, y.width, y.depth)).toBe(false);
  });

  it('the worker walks through the narrow gap (1.4 m) and the truck cannot; the truck takes the wide one', () => {
    const worker = run(21, 23.3, 3, 0, 0.35, 3);
    expect(worker.x).toBeGreaterThan(26);
    const truck = run(20, 23.3, 6, 0, 1.3, 3);
    expect(truck.x).toBeLessThan(24 - 1.2);
    const wide = run(18, 12, 6, 0, 1.3, 3);
    expect(wide.x).toBeGreaterThan(30);
  });

  it('never leaves the yard', () => {
    const end = run(2, 2, -5, -5, 0.35, 2);
    expect(end.x).toBeCloseTo(0.35, 5);
    expect(end.y).toBeCloseTo(0.35, 5);
  });

  it('finds the interactable next to the body (the machine from below it), and none in open ground', () => {
    const m = y.props.find((p) => p.kind === 'machine')!;
    const i = nearestAct(y.acts, m.x, m.y + m.d / 2 + 0.5, 0.35 + 0.8);
    expect(y.actList[i].id).toBe(m.id);
    expect(nearestAct(y.acts, 16, 30, 1.15)).toBe(-1);
  });
});

describe('the stick', async () => {
  const { follow, inZone, STICK_R } = await import('./stick');
  const z = { x: 0, y: 100, width: 380, height: 290, minX: 76, maxX: 328, minY: 76, maxY: 314 };
  it('takes touches in its zone only, clamps the knob to its travel and drags the base along', () => {
    expect(inZone(z, 100, 300)).toBe(true);
    expect(inZone(z, 600, 300)).toBe(false);
    expect(inZone(z, 100, 50)).toBe(false);
    expect(follow(z, 150, 250, 170, 250)).toEqual({ on: 1, bx: 150, by: 250, kx: 20, ky: 0 });
    const far = follow(z, 150, 250, 300, 250);
    expect(far.kx).toBeCloseTo(STICK_R, 6);
    expect(far.bx).toBeCloseTo(300 - STICK_R, 6);
  });
});

describe('the atlas', async () => {
  const { atlasDefs, atlasSize, MAX_SIDE } = await import('./atlas');
  const { yardLayout } = await import('./yard');
  it('fits one image under 2048 pixels a side at a 3x screen, also with 200 extra crates', () => {
    for (const extra of [0, 200]) {
      const s = atlasSize(atlasDefs(yardLayout(content, { extraCrates: extra })), 3);
      expect(s.width).toBeLessThanOrEqual(MAX_SIDE);
      expect(s.height).toBeLessThanOrEqual(MAX_SIDE);
      expect(s.density).toBeGreaterThanOrEqual(2);
    }
  });
  it('bakes every pawn frame, eight truck headings, the ring steps and one sprite per kind of prop', () => {
    const names = atlasDefs(yardLayout(content)).map((d) => d.name);
    expect(names.filter((n) => n.startsWith('worker-'))).toHaveLength(16);
    expect(names.filter((n) => n.startsWith('helper-'))).toHaveLength(16);
    expect(names.filter((n) => n.startsWith('truck-'))).toHaveLength(8);
    expect(names.filter((n) => n.startsWith('ring-'))).toHaveLength(9);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('the rules table', async () => {
  const { rulesTable } = await import('./useRulesTable');
  const { yardLayout } = await import('./yard');
  const R = await import('../../../engine/salvage');
  it('carries each thing\'s ring from the rules\' frame (2 when it is gone), -1 for a place, and the load', () => {
    const y = yardLayout(content);
    const cfg = { mode: 'salvage', salvage: content } as unknown as import('../../../engine/salvage').SalvageConfig;
    const g = { cash: 0, stats: { playSeconds: 0 }, salvage: R.freshSalvage(cfg, 0) } as unknown as import('../../../engine/salvage').SalvageGame;
    const things = g.salvage.things.slice();
    const worked = things[0].uid;
    const gone = things[1].uid;
    things[0] = { ...things[0], progress: 1, by: 'boss' };
    const s = { ...g.salvage, things: things.filter((t) => t.uid !== gone), load: [{ grade: 'li', g: 10000, from: null }, { grade: 'li', g: 10000, from: null }] };
    const t = rulesTable(y, R.frame(cfg, { ...g, salvage: s }));
    expect(t.carried).toBe(2);
    const at = (id: string) => t.cut[y.actList.findIndex((a) => a.id === id)];
    expect(at(worked)).toBeGreaterThan(0);
    expect(at(worked)).toBeLessThan(1);
    expect(at(gone)).toBe(2);
    expect(at('scale')).toBe(-1);
  });
});
