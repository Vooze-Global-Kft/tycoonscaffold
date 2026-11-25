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
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

// The rules' frozen test content (never the tuned game.json: tests pin no tuned number, BRIEF lesson 4).
const { SALVAGE_TEST: content } = await import('../../../engine/fixtures/salvage');
void fs;
void path;
void SalvageSchema;

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

  it('packs the solid props (not the truck) and the places as interactables (things are the rules\', per frame), and helpers through the wall\'s wide gap', () => {
    expect(y.solids.length / SOLID_STRIDE).toBe(y.props.filter((p) => p.solid && p.kind !== 'truck').length);
    expect(y.actList.filter((a) => a.kind === 1)).toHaveLength(y.props.filter((p) => p.kind === 'machine').length);
    expect(y.actList.length).toBe(y.props.filter((p) => p.kind === 'machine').length);
    expect(y.props.some((p) => p.kind === 'wreck')).toBe(false);
    const h6 = yardLayout(content, { helpers: 6 });
    expect(h6.helpers).toHaveLength(6);
    for (const h of h6.helpers) {
      const crosses = (h.pts[0] - 24) * (h.pts[h.pts.length - 2] - 24) < 0;
      if (crosses) {
        expect(h.pts[2]).toBe(24);
        expect(Math.abs(h.pts[3] - 12)).toBeLessThanOrEqual(0.5);
      } else expect(h.pts).toHaveLength(4);
    }
    expect(yardLayout(content, { helpers: 40, extraCrates: 50 }).helpers).toHaveLength(40);
    expect(yardLayout(content, { extraCrates: 50 }).props.length).toBe(y.props.length + 50);
  });

  it('opens the lane east of the gate: a body walks out through the gate and along the lane, never through the fence beside it', () => {
    expect(y.lane).toHaveLength(4);
    const gy = content.map.points.gate[1];
    const out = [0, 0];
    let x = y.width - 3;
    let yy = gy;
    for (let i = 0; i < 60 * 4; i++) {
      moveBody(out, x, yy, 6 / 60, 0, 0.35, y.solids, y.width, y.depth, 0, 0, 0, [], y.lane);
      x = out[0];
      yy = out[1];
    }
    expect(x).toBeGreaterThan(y.width + 10);
    // On the lane, steering north stops at the lane's edge, not back inside the yard.
    for (let i = 0; i < 60 * 3; i++) {
      moveBody(out, x, yy, 0, -6 / 60, 0.35, y.solids, y.width, y.depth, 0, 0, 0, [], y.lane);
      x = out[0];
      yy = out[1];
    }
    expect(x).toBeGreaterThan(y.width + 10);
    expect(yy).toBeCloseTo(y.lane[2] + 0.35, 5);
    // Beside the gate the fence holds.
    x = y.width - 3;
    yy = 5;
    for (let i = 0; i < 60 * 3; i++) {
      moveBody(out, x, yy, 6 / 60, 0, 0.35, y.solids, y.width, y.depth, 0, 0, 0, [], y.lane);
      x = out[0];
      yy = out[1];
    }
    expect(x).toBeCloseTo(y.width - 0.35, 5);
    // The lane ends before the weight-limited bridge.
    expect(y.lane[1]).toBeLessThan(y.drawW);
  });

  it('the rules\' whole things are solid: a body walks round a thing standing in its way', () => {
    const thing = [1, 40, 10, 0.5, 0.4];
    const out = [0, 0];
    let x = 37;
    let yy = 10;
    for (let i = 0; i < 60 * 2; i++) {
      moveBody(out, x, yy, 3 / 60, 0, 0.35, y.solids, y.width, y.depth, 0, 0, 0, thing, y.lane);
      x = out[0];
      yy = out[1];
      expect(Math.abs(x - 40) < 0.5 + 0.35 - 1e-6 && Math.abs(yy - 10) < 0.4 + 0.35 - 1e-6).toBe(false);
    }
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
  const { planSheet, MAX_SIDE, G_SIDE } = await import('./atlas');
  const { MANIFEST } = await import('../art/manifest');
  it("plans the manifest's three sheets inside the phone texture limit at a 3x screen", () => {
    for (const sheet of ['A', 'B', 'G'] as const) {
      const p = planSheet(sheet, 3);
      expect(p.width).toBeLessThanOrEqual(sheet === 'G' ? G_SIDE : MAX_SIDE);
      expect(p.height).toBeLessThanOrEqual(sheet === 'G' ? G_SIDE : MAX_SIDE);
      expect(p.density).toBeGreaterThanOrEqual(2);
    }
  });
  it('bakes every manifest entry (no old ground-work names remain)', () => {
    const ids = new Set((['A', 'B', 'G'] as const).flatMap((s) => planSheet(s, 2).cells.map((c) => c.id)));
    for (const e of MANIFEST) expect(ids.has(e.id), e.id).toBe(true);
    expect([...ids].some((id) => /^(worker|helper|truck|ring|prop|pieces)-/.test(id))).toBe(false);
  });
});

describe('the rules table', async () => {
  const { rulesTable } = await import('./useRulesTable');
  const { yardLayout } = await import('./yard');
  const A = await import('./actors');
  const R = await import('../../../engine/salvage');
  const { MANIFEST } = await import('../art/manifest');
  // A resolver that knows every manifest id (cell = its index in the manifest), sheet by the entry's sheet.
  const res = (id: string, frame = 0) => {
    const i = MANIFEST.findIndex((e) => e.id === id);
    if (i < 0) return -1;
    return A.packCell({ A: 0, B: 1, G: 2 }[MANIFEST[i].sheet], i * 10 + frame, false);
  };
  const cfg = { mode: 'salvage', salvage: content } as unknown as import('../../../engine/salvage').SalvageConfig;
  const g = { cash: 0, stats: { playSeconds: 0 }, salvage: R.freshSalvage(cfg, 0) } as unknown as import('../../../engine/salvage').SalvageGame;

  it('draws every thing of the frame at its place, solid while whole, and carries the load', () => {
    const y = yardLayout(content);
    const s = { ...g.salvage, load: [{ uid: 'p1', grade: 'li', g: 10000, from: null }, { uid: 'p2', grade: 'li', g: 10000, from: null }] };
    const f = R.frame(cfg, { ...g, salvage: s as typeof g.salvage });
    const t = rulesTable(y, f, content, res, 7);
    expect(t.carried).toBe(2);
    expect(t.n).toBe(7);
    const at = (x: number, yy: number) => {
      for (let o = 0; o < t.items.length; o += A.ITEM) if (t.items[o + 3] === x && t.items[o + 4] === yy) return o;
      return -1;
    };
    for (const th of f.things) expect(at(th.x, th.y), th.obj).toBeGreaterThanOrEqual(0);
    expect(t.solids.length / 5).toBe(f.things.filter((th) => (th.off ?? th.stage) === 0).length);
    // The boss's carrier is the frame's.
    expect(t.boss[0]).toBe(f.load.carrier === 'sack' ? 1 : f.load.carrier === 'trolley' ? 2 : 0);
  });

  it('never decides: the same frame gives the same scene', () => {
    const y = yardLayout(content);
    const f = R.frame(cfg, g);
    expect(rulesTable(y, f, content, res, 1)).toEqual(rulesTable(y, f, content, res, 1));
  });
});

describe('the map', async () => {
  const A = await import('./actors');
  const { MANIFEST } = await import('../art/manifest');
  const res = (id: string, frame = 0) => {
    const i = MANIFEST.findIndex((e) => e.id === id);
    return i < 0 ? -1 : A.packCell({ A: 0, B: 1, G: 2 }[MANIFEST[i].sheet], i * 10 + frame, false);
  };
  const items = A.staticItems(content, res);
  const ids = () => {
    const out: string[] = [];
    for (let o = 0; o < items.length; o += A.ITEM) out.push(MANIFEST[Math.floor(A.unpackCell(items[o + 2]).cell / 10)].id);
    return out;
  };
  it('is built from content only: every place with art, the fence with a gate gap, the lane with its sites and the bridge', () => {
    const list = ids();
    expect(list.filter((i) => i === 'plant.fence.ew').length).toBeGreaterThan(40);
    expect(list).toContain('plant.portacabin');
    expect(list).toContain('plant.scale.platform');
    expect(list).toContain('plant.weighbridge.deck');
    expect(list).toContain('ground.asphalt');
    expect(list).toContain('lane.parapet');
    expect(list).toContain('lane.barrier');
    // No fence panel stands across the gate.
    const gy = content.map.points.gate[1];
    for (let o = 0; o < items.length; o += A.ITEM) {
      const id = MANIFEST[Math.floor(A.unpackCell(items[o + 2]).cell / 10)].id;
      if (id === 'plant.fence.ns' && items[o + 3] > content.yard.width - 1) expect(Math.abs(items[o + 4] - gy)).toBeGreaterThan(2);
    }
    // Decals are layer 0 and sheet G; nothing else is.
    for (let o = 0; o < items.length; o += A.ITEM) expect(items[o] === A.L_DECAL).toBe(A.unpackCell(items[o + 2]).sheet === 2);
  });
});

describe('the actors\' layers', async () => {
  const A = await import('./actors');
  const { personLayers } = await import('../art/manifest/people');
  const { MANIFEST, mirrorOf } = await import('../art/manifest');
  // Cells that name the id, frame and heading they stand for.
  const names: string[] = [];
  const res = (id: string, frame = 0, heading = 0) => {
    const e = MANIFEST.find((m) => m.id === id);
    if (!e) return -1;
    names.push(`${id}#${frame}#${heading}`);
    return A.packCell(0, names.length - 1, mirrorOf(e, heading) !== null);
  };
  const T = A.actorTable(res, { hand: '#00FF00', cutter: '#0000FF', driver: '#00FFFF' });
  const V = new Float64Array([0, 0, 40, 0.7, Math.sqrt(1 - 0.49), 2000, 2000, 1]);
  const poses = ['stand', 'walk', 'push', 'feed', 'pour', 'sledge', 'grinder', 'torch'] as const;

  it('draws a person, the hand load and the carrier in the order the people artist\'s personLayers gives, at every heading', () => {
    for (const who of ['boss', 'crew'] as const)
      for (const pose of poses)
        for (let h = 0; h < 4; h++)
          for (const variant of ['none', 'hand', 'sack', 'trolley'] as const) {
            if (variant === 'hand' && who === 'crew') continue;
            const L = A.makeListW(16, 0);
            const pi = A.POSES.indexOf(pose);
            const kind = variant === 'sack' ? 0 : variant === 'trolley' ? 1 : -1;
            A.personInto(L, V, T, who === 'boss' ? 0 : 1, pi, 0, h, variant === 'hand' ? 0 : -1, kind, 1, 0xffffff, 10, 10, 10);
            const got = Array.from(L.cell.slice(0, L.n)).map((c) => names[A.unpackCell(c).cell].split('#')[0]);
            const want = personLayers({ who, pose, frame: 0, heading: h, hand: variant === 'hand' ? 'fe' : undefined, carrier: kind >= 0 ? { kind: variant as 'sack' | 'trolley', load: 'fe' } : undefined }).map((l) => l.id);
            expect(got, `${who} ${pose} h${h} ${variant}`).toEqual(want);
          }
  });

  it('turns a heading angle into the art\'s eight and four headings', () => {
    expect(A.heading8(Math.PI / 2)).toBe(0);
    expect(A.heading8(0)).toBe(2);
    expect(A.heading8(-Math.PI / 2)).toBe(4);
    expect(A.heading8(Math.PI)).toBe(6);
    expect(A.heading4(1, 0)).toBe(1);
    expect(A.heading4(0, -1)).toBe(2);
  });
});

describe('the hand: presence samples (D12, the two binding tests)', async () => {
  const { presenceStep, SAMPLE_MS } = await import('./stick');
  const workDelay = content.feel.workDelay;
  const reach = content.reach.work;
  // A thing at x 10; the boss walks past it at walking speed, then stops beside it. Samples at the UI thread's pace.
  const simulate = (stopAt: number | null) => {
    const p = new Float64Array([0, -1e9]);
    const samples: { t: number; x: number; moving: boolean; standingFor: number }[] = [];
    let x = 5;
    for (let f = 0; f < 60 * 6; f++) {
      const t = f / 60;
      const steering = stopAt === null || x < stopAt;
      if (steering) x += content.walk / 60;
      if (presenceStep(p, 1 / 60, steering, t * 1000)) samples.push({ t, x, moving: steering, standingFor: p[0] });
    }
    return samples;
  };
  // The rules' contract (2.1, 2.15): work starts after feel.workDelay still within reach.work, never while moving.
  const works = (s: { x: number; moving: boolean; standingFor: number }) => !s.moving && s.standingFor >= workDelay && Math.abs(s.x - 10) <= reach;

  it('walking past a thing never works it', () => {
    const samples = simulate(null);
    expect(samples.filter((s) => Math.abs(s.x - 10) <= reach).length).toBeGreaterThan(0);
    expect(samples.some(works)).toBe(false);
  });

  it('stopping beside it starts work within half a second', () => {
    const samples = simulate(10);
    const stopped = samples.find((s) => !s.moving)!;
    const first = samples.find(works)!;
    expect(first).toBeDefined();
    expect(first.t - (stopped.t - SAMPLE_MS / 1000)).toBeLessThanOrEqual(0.5);
  });
});
