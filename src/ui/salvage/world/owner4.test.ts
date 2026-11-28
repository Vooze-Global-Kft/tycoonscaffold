/**
 * o4-world, THE FOURTH PHONE UPDATE'S DRAWING (the owner's review of 26 November, points 1 and 7: "truck animation, and
 * helper laggy", "freeze and only restart", "trucks are sometimes speeding ... running people ... over"; measured in
 * scratchpad yard/notes/o3-diag-world.md F1, F2, F3, F5):
 *   F1  the step aside walks: the drawn offset from a person's rules place changes at most ASIDE_WALK_V a second, out or
 *       back, unless that would leave him inside a vehicle's body; a standing box keeps the side he is drawn off to;
 *   F2  the truck's picture turns to the hook and tip frames' heading a heading at a time before they show (the harness,
 *       ./costHarness.ts, mirrors frameLoop.ts's truck block: the game's own m30 through its first tip);
 *   F3  a dated drive first seen late whose phase then stands is drawn at its own dates shifted, never squeezed;
 *   F5  the hop pass (./actors.ts hopRuns) never reorders two sprites whose drawn rectangles meet, keeps each sheet's
 *       own order, and saves draws where a short run lies between two runs of the other sheet.
 * The pixel proof of F5 (whole frames drawn with the baked sheets both ways) is a node script:
 * scratchpad yard/owner4/o4-world/prove-hop.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

const A = await import('./actors');
const M = await import('./motion');
const H = await import('./costHarness');
const Cam = await import('./camera');
const Co = await import('./collide');
const Y = await import('./yard');
const { planSheet } = await import('./atlas');
const { YARD } = await import('../art/palette');
const { OBJECT_SPRITE } = await import('../art/manifest/things');
const R = await import('../../../engine/salvage');
const tick = await import('../../../engine/salvage/tick');
const { FIXTURE_NOW } = await import('../../../engine/fixtures/salvage');

const mods: import('./costHarness').HarnessMods = { A, M, Cam, Co, Y, frame: R.frame, planSheet, vests: { hand: YARD.vestYardHand, cutter: YARD.vestCutter, driver: YARD.vestDriver }, objectSprite: OBJECT_SPRITE };

describe('F1: the step aside walks out and back', () => {
  const dt = 1 / 60;
  it('a person held 3 m off his place by a vehicle that has passed walks back at ASIDE_WALK_V, never darts', () => {
    const OFF = new Float64Array(2);
    OFF[1] = 3;
    const VB = new Float64Array(M.VB_STRIDE);
    // the flatbed has passed: far ahead, moving away east
    VB.set([80, 25.6, 1, 0, 2.3, 1, 4, 0]);
    const out = [0, 0];
    let prev = 3;
    for (let f = 0; f < 60; f++) {
      M.stepAside(out, OFF, 0, 50, 22, VB, 1, dt, false);
      const off = Math.hypot(OFF[0], OFF[1]);
      expect(prev - off).toBeLessThanOrEqual(M.ASIDE_WALK_V * dt + 1e-9);
      prev = off;
    }
    expect(prev).toBeCloseTo(3 - 60 * M.ASIDE_WALK_V * dt, 6);
  });
  it('the walking pace yields where it would leave him inside a body (then the ease, as before)', () => {
    const OFF = new Float64Array(2);
    OFF[1] = 0.05;
    const VB = new Float64Array(M.VB_STRIDE);
    // a moving truck whose body covers his rules place and his drawn one: out at once (ASIDE_FAST), not at a walk
    VB.set([50, 22, 1, 0, 2.3, 1, 4, 0]);
    const out = [0, 0];
    M.stepAside(out, OFF, 0, 50, 22, VB, 1, dt, false);
    expect(M.insideBody(VB, 0, out[0], out[1])).toBe(false);
  });
  it('a standing box keeps him on the side he is drawn off to (no flip through the truck on the frame it stops)', () => {
    const VB = new Float64Array(M.VB_STRIDE);
    // a standing truck at (50.5, 25.6) with a picture box W -2.5 E 2.5 N -3.5 S 1.3
    VB.set([50.5, 25.6, 1, 0, 2.3, 1, 0, 0, -2.5, 2.5, -3.5, 1.3]);
    const out = [0, 0];
    // his rules place inside the box, south edge nearer; drawn off NORTH already (the moving rule put him there)
    M.asideTarget(out, 50.44, 25.72, VB, 1, 0, -1.09);
    expect(out[1]).toBeLessThan(0);
    expect(25.72 + out[1]).toBeCloseTo(25.6 - 3.5 - M.STAND_PAD_M, 6);
    // no side yet: the nearest edge, as before
    M.asideTarget(out, 50.44, 25.72, VB, 1, 0, 0);
    expect(out[1]).toBeGreaterThan(0);
  });
});

describe('F3: a late drive whose phase stands is drawn at its own dates, shifted', () => {
  // the tip: 3 m from the weighbridge to the floor at 4 m/s (0.75 s), then 10 s at the floor
  const TP = [50.5, 25.6, 47.5, 25.6];
  const TA = [100, 100.75];
  const TR = [1, 50.5, 25.6, 6, 1, 0, 4, 100, 110.75, -1, -1, 2, 100.75, -1];
  it('first seen 0.1 s late: every frame at the yard speed (never squeezed), arriving 0.1 s later', () => {
    const K = [NaN, NaN, NaN];
    const out = [0, 0, 0, 0];
    const tmp = [0, 0, 0, 0];
    let px = NaN;
    let fast = 0;
    for (let t = 100.1; t <= 102; t += 1 / 60) {
      M.truckAt(out, tmp, TR, TP, t, M.truckFrom(K, TR, TA, t, false), TA);
      if (px === px) fast = Math.max(fast, Math.abs(out[0] - px) * 60);
      px = out[0];
    }
    expect(fast).toBeLessThanOrEqual(4 * 1.02);
    // at 100.8 (0.05 s after the last date) it is still 0.05 s x 4 m/s short of the floor
    const K2 = [NaN, NaN, NaN];
    M.truckFrom(K2, TR, TA, 100.1, false);
    M.truckAt(out, tmp, TR, TP, 100.8, M.truckFrom(K2, TR, TA, 100.8, false), TA);
    expect(out[0]).toBeCloseTo(47.5 + 0.05 * 4, 6);
  });
  it('a drive that ends with its phase (park) keeps the warp (its end date kept)', () => {
    const TRp = [...TR];
    TRp[6] = 6;
    TRp[8] = 100.75;
    const K = [NaN, NaN, NaN];
    const out = [0, 0, 0, 0];
    const tmp = [0, 0, 0, 0];
    M.truckFrom(K, TRp, TA, 100.1, false);
    M.truckAt(out, tmp, TRp, TP, 100.75, M.truckFrom(K, TRp, TA, 100.75, false), TA);
    expect(out[0]).toBeCloseTo(47.5, 6);
  });
});

describe('F5: the hop pass', () => {
  const rect = (x: number, y: number, w: number, h: number) => [0, 0, w, h, 0, 0, x, y];
  // a list of sprites [sheet, x, y, w, h] in sortRuns' order; each its own cell; scale 1 at density 1
  const listOf = (items: number[][]) => {
    const L = A.makeListW(items.length + 4, 0);
    const rects: number[][] = [[], [], []];
    items.forEach(([sheet, x, y, w, h], i) => {
      const r = rect(x, y, w, h);
      const c = rects[sheet].length / 6;
      rects[sheet].push(...r.slice(0, 6));
      L.cell[i] = A.packCell(sheet, c, false);
      L.sx[i] = r[6];
      L.sy[i] = r[7];
      L.k[i] = 1;
      L.order[i] = i;
    });
    L.n = items.length;
    return { L, rects, dens: [1, 1, 1] };
  };
  const runs = (L: import('./actors').DrawList) => H.countRuns(L, true);
  it('a short run of people between two runs of the plant hops when it touches nothing of the run after it', () => {
    const { L, rects, dens } = listOf([
      [1, 0, 0, 10, 10],
      [0, 100, 0, 10, 10],
      [1, 20, 0, 10, 10],
    ]);
    expect(runs(L)).toBe(3);
    A.hopRuns(L, rects, dens);
    expect(Array.from(L.order.slice(0, 3))).toEqual([0, 2, 1]);
    expect(runs(L)).toBe(2);
  });
  it('never when one of its rectangles meets one of the next run (or comes within HOP_MARGIN_PT)', () => {
    for (const x of [25, 30 + A.HOP_MARGIN_PT - 0.01]) {
      const { L, rects, dens } = listOf([
        [1, 0, 0, 10, 10],
        [0, x, 0, 10, 10],
        [1, 40, 0, 10, 10],
        [1, 20, 0, 10, 10],
      ]);
      A.hopRuns(L, rects, dens);
      expect(Array.from(L.order.slice(0, 4))).toEqual([0, 1, 2, 3]);
    }
  });
  it('a run longer than HOP_RUN_MAX stays', () => {
    const items = [[1, 0, 0, 5, 5]];
    for (let i = 0; i <= A.HOP_RUN_MAX; i++) items.push([0, 200 + i * 20, 0, 5, 5]);
    items.push([1, 20, 0, 5, 5]);
    const { L, rects, dens } = listOf(items);
    A.hopRuns(L, rects, dens);
    expect(Array.from(L.order.slice(0, items.length))).toEqual(items.map((_, i) => i));
  });
  it('random lists: no meeting pair of two sheets and no pair of one sheet changes order; never more runs', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let trial = 0; trial < 300; trial++) {
      const n = 5 + Math.floor(rnd() * 40);
      const items: number[][] = [];
      for (let i = 0; i < n; i++) items.push([rnd() < 0.5 ? 0 : 1, rnd() * 300, rnd() * 120, 4 + rnd() * 40, 4 + rnd() * 40]);
      const { L, rects, dens } = listOf(items);
      const before = runs(L);
      A.hopRuns(L, rects, dens);
      expect(runs(L)).toBeLessThanOrEqual(before);
      const pos = new Map<number, number>();
      for (let i = 0; i < n; i++) pos.set(L.order[i], i);
      expect(pos.size).toBe(n);
      const meet = (a: number[], b: number[]) => !(a[1] + a[3] + A.HOP_MARGIN_PT <= b[1] || b[1] + b[3] + A.HOP_MARGIN_PT <= a[1] || a[2] + a[4] + A.HOP_MARGIN_PT <= b[2] || b[2] + b[4] + A.HOP_MARGIN_PT <= a[2]);
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          if (items[i][0] === items[j][0] || meet(items[i], items[j])) expect(pos.get(i)!).toBeLessThan(pos.get(j)!);
        }
    }
  });
  it('a mirrored cell is tested where drawRuns draws it (flipped about its anchor)', () => {
    // anchor at x 50, cell 10 wide with ax 2: unmirrored it covers 48..58, mirrored 42..52
    const L = A.makeListW(4, 0);
    const rects = [[0, 0, 10, 10, 2, 0], [0, 0, 10, 10, 0, 0], []];
    const put = (i: number, cell: number, sx: number) => {
      L.cell[i] = cell;
      L.sx[i] = sx;
      L.sy[i] = 0;
      L.k[i] = 1;
      L.order[i] = i;
    };
    put(0, A.packCell(1, 0, false), 0);
    put(1, A.packCell(0, 0, true), 50);
    put(2, A.packCell(1, 0, false), 30);
    L.n = 3;
    // B's second sprite covers 30..40: the mirrored A (42..52) is clear of it by 2 pt: hops
    A.hopRuns(L, rects, [1, 1, 1]);
    expect(Array.from(L.order.slice(0, 3))).toEqual([0, 2, 1]);
    // at 33..43 it meets the mirrored one (42..52) and the unmirrored rule (48..58) would have missed it
    put(0, A.packCell(1, 0, false), 0);
    put(1, A.packCell(0, 0, true), 50);
    put(2, A.packCell(1, 0, false), 33);
    A.hopRuns(L, rects, [1, 1, 1]);
    expect(Array.from(L.order.slice(0, 3))).toEqual([0, 1, 2]);
  });
  it("frameLoop.ts calls it between sortRuns and drawRuns with the baked rects and densities, and its truck block turns to TM.hookFace (the harness's copy)", () => {
    const src = fs.readFileSync(path.join(__dirname, 'frameLoop.ts'), 'utf8');
    expect(src).toMatch(/sortRuns\(L, runA, runB\);\s*\/\/[^\n]*\n\s*if \(K !== null\) hopRuns\(L, K\.rects, K\.dens\);/);
    expect(src).toMatch(/if \(hook >= 0\) h8 = TM\.hookFace;/);
    expect(src).toMatch(/h8 = turnFacing\(S\.face, h8, clock, driving \|\| snap\);\s*\n\s*if \(hook >= 0 && h8 !== TM\.hookFace\) hook = -1;/);
    expect(src).toMatch(/\} else facing8\(f2, pic\);/);
    const hs = fs.readFileSync(path.join(__dirname, 'costHarness.ts'), 'utf8');
    expect(hs).toMatch(/if \(hook >= 0 && h8 !== hookFace\) hook = -1;/);
    expect(hs).toMatch(/hopRuns\(L, rects, dens\)/);
  });
});

describe("F2: the game's own m30 through its first tip, at 30 frames a second (the harness's copy of the truck block)", async () => {
  const gameJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8'));
  const { GameConfigSchema } = await import('../../../config/schema');
  const { SalvageSchema } = await import('../../../config/schema.salvage');
  const PW = await import('../../../modes/salvage/presets.web');
  const cfg = { ...GameConfigSchema.parse(gameJson), salvage: SalvageSchema.parse(gameJson.salvage) } as unknown as import('../../../engine/salvage').SalvageConfig;
  it('the picture never changes by more than one heading a frame; the hook and tip frames show, always facing hookFace, with the hook picture as the body', { timeout: 120_000 }, () => {
    let g = PW.salvagePreset(cfg as never, 'mid', FIXTURE_NOW + 3_600_000) as unknown as import('../../../engine/salvage').SalvageGame;
    const h = H.makeHarness(mods, cfg.salvage, { SW: 844, SH: 390 });
    let ms = g.salvage.clock.highMs;
    let prev: number | null = null;
    let worst = 0;
    const seen = new Set<string>();
    let tips = 0;
    for (let k = 0; k < 900; k++) {
      ms += 100;
      g = tick.advanceSalvage(cfg, g, 0.1, ms, []);
      const f = R.frame(cfg, g);
      for (let j = 0; j < 3; j++) {
        const d = h.draw(f, { clock: k * 0.1 + j / 30, dt: 1 / 30, tNow: f.t + j / 30 });
        const tk = d.truck;
        if (!tk) {
          prev = null;
          continue;
        }
        if (prev !== null) worst = Math.max(worst, Math.min((((tk.art - prev) % 8) + 8) % 8, (((prev - tk.art) % 8) + 8) % 8));
        prev = tk.art;
        if (tk.hook >= 0) {
          expect(tk.h8).toBe(A.TRUCK_MODELS[0].hookFace);
          expect(tk.art).toBe(A.TRUCK_MODELS[0].hookFace);
          seen.add(`${f.truck.leg?.phase}:${tk.hook}`);
          if (f.truck.leg?.phase === 'tip') tips++;
        }
      }
    }
    expect(worst).toBeLessThanOrEqual(1);
    expect([...seen].some((s) => s.startsWith('tip:'))).toBe(true);
    expect([...seen].some((s) => s.startsWith('hook:'))).toBe(true);
    expect(tips).toBeGreaterThan(0);
  });
});
