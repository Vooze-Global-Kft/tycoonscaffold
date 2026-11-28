/// <reference types="node" />
/**
 * C-WORLD-1 (PLAN2 2.8; critic-build F1 to F6, F14): the world's hooks for the works, put in once, and the proof that a
 * first-yard player's world does not move with them (rule 3.1.5). Runs under node with the world tests' mocks.
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
const At = await import('./atlas');
const WT = await import('./worksTable');
const WS = await import('./worksScene');
const WV = await import('./worksVehicleMotion');
const WP = await import('./worksPeopleMotion');
const WL = await import('./worksLabels');
const CC = await import('./costCounters');
const UY = await import('./useYard');
const MF = await import('../art/manifest');
const R = await import('../../../engine/salvage');
const { SALVAGE_TEST, FIXTURE_NOW } = await import('../../../engine/fixtures/salvage');
type C = import('../../../config/schema.salvage').SalvageContent;

// The shipped game's salvage block as written (works, worksLayer, map.works present; release.stage 1).
const SHIPPED = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage as C;

/** A resolver over named cells: sheets given by letter are "baked" (every id of them resolves), others are not. */
function namedRes(baked: readonly string[]) {
  const names: string[] = [];
  const all = new Map<string, { sheet: string }>([...MF.MANIFEST, ...MF.WORKS_MANIFEST].map((e) => [e.id, e]));
  const memo = new Map<string, number>();
  const res = (id: string, frame = 0, heading = 0) => {
    const e = all.get(id);
    if (!e || !baked.includes(e.sheet)) return -1;
    const k = `${id}#${frame}#${heading}`;
    const hit = memo.get(k);
    if (hit !== undefined) return hit;
    names.push(k);
    const c = A.packCell(A.SHEETS.indexOf(e.sheet as never), names.length - 1, false);
    memo.set(k, c);
    return c;
  };
  return { res, names };
}

describe('F1: sheets C and D come after S, so no first-yard cell index moves', () => {
  it('SHEETS is A, B, G, S, C, D', () => {
    expect(A.SHEETS).toEqual(['A', 'B', 'G', 'S', 'C', 'D']);
  });
  it('the resolver packs a works entry on sheet 4 or 5 once that sheet is baked, -1 while it is not', () => {
    const sheetLike = (ids: string[]) => ({ density: 2, rects: [], index: Object.fromEntries(ids.map((k, i) => [k, i])) });
    const hall = MF.WORKS_MANIFEST.find((e) => e.sheet === 'C')!;
    const truck3 = MF.WORKS_MANIFEST.find((e) => e.id === 'vehicle.truckBridge')!;
    const C = sheetLike([`${hall.id}#0#0`]);
    const D = sheetLike([`${truck3.id}#0#0`]);
    const A0 = sheetLike(['person.boss.stand#0#0']);
    const res = A.makeResolver([A0, null, null, null, C, D]);
    expect(A.unpackCell(res(hall.id)).sheet).toBe(4);
    expect(A.unpackCell(res(truck3.id)).sheet).toBe(5);
    expect(A.unpackCell(res('person.boss.stand')).sheet).toBe(0);
    const off = A.makeResolver([A0, null, null, null]);
    expect(off(hall.id)).toBe(-1);
    expect(off(truck3.id)).toBe(-1);
    expect(off('person.boss.stand')).toBe(res('person.boss.stand'));
  });
  it('atlas.ts plans C and D from WORKS_MANIFEST and the sold list, each inside 2048 x 2048 at density 2', () => {
    for (const s of At.WORKS_SHEETS) {
      const p = At.planSheet(s, 2);
      expect(p.cells.length).toBeGreaterThan(0);
      expect(p.density).toBe(2);
      expect(p.width).toBeLessThanOrEqual(At.MAX_SIDE);
      expect(p.height).toBeLessThanOrEqual(At.MAX_SIDE);
      expect(p.cells.every((c) => c.entry.sheet === s)).toBe(true);
    }
    const sold = WT.worksBakeList(SHIPPED);
    const plans = At.planWorks(2, sold);
    expect(plans.map((p) => p.sheet)).toEqual(['C', 'D']);
    const ids = new Set(plans.flatMap((p) => p.cells.map((c) => c.id)));
    expect(ids).toEqual(new Set(sold.map((e) => e.id)));
    // nothing of the first yard's lands on C or D, and A, B, G plan exactly MANIFEST's cells as before
    for (const s of ['A', 'B', 'G'] as const) expect(At.planSheet(s, 2).cells.every((c) => MF.MANIFEST.includes(c.entry as never))).toBe(true);
  });
});

describe('only sold entries are baked (rule 5: nothing dark drawn)', () => {
  it('the shipped content bakes every hall, plot and crate of a sold plate and no dark one', () => {
    const sold = WT.soldPlatesOf(SHIPPED);
    const list = WT.worksBakeList(SHIPPED);
    for (const e of list) {
      const o = WT.ownerOf(e.id);
      if (o?.startsWith('plate:')) expect(sold.has(o.slice(6)), e.id).toBe(true);
      if (o?.startsWith('key:')) expect(WT.soldKey(SHIPPED, o.slice(4)), e.id).toBe(true);
    }
    for (const p of sold) if (['rotary', 'induction', 'copper'].includes(p)) expect(list.some((e) => e.id === `works.hall.${p}.shed`), p).toBe(true);
  });
  it('a plate made dark (its shop gate past the top rung) loses its hall, plot and crate; a content without works bakes nothing', () => {
    const dark: C = { ...SHIPPED, worksLayer: { ...SHIPPED.worksLayer!, shop: SHIPPED.worksLayer!.shop.map((i) => (i.key === 'rotary' ? { ...i, gate: 'rung99' } : i)) } };
    const list = WT.worksBakeList(dark);
    expect(list.some((e) => e.id.startsWith('works.hall.rotary.') || e.id === 'works.crate.rotary' || e.id.startsWith('works.plot.rotary.'))).toBe(false);
    expect(list.some((e) => e.id.startsWith('works.hall.induction.'))).toBe(true);
    expect(WT.worksBakeList(SALVAGE_TEST)).toEqual([]);
    expect(WT.worksBakeList({ ...SHIPPED, worksLayer: undefined })).toEqual([]);
  });
});

describe('the bake: with the switch off a save at rung 2 or 3 bakes the first yard exactly', () => {
  it('bakePlanOf off: A, B, G, S, no works shadows, never C or D, at any rung', () => {
    const off1 = UY.bakePlanOf(false, 1);
    for (const r of [0, 1, 2, 3, 5]) expect(UY.bakePlanOf(false, r)).toEqual(off1);
    expect(off1).toEqual({ sheets: ['A', 'B', 'G', 'S'], worksShadows: false, works: 'never' });
    expect(UY.bakePlanOf(true, 1).works).toBe('later');
    expect(UY.bakePlanOf(true, 2).works).toBe('now');
    expect(UY.bakePlanOf(true, 3)).toEqual({ sheets: ['A', 'B', 'G', 'S'], worksShadows: true, works: 'now' });
  });
  it("the bake line without the works' sheets is the first yard's line, word for word", () => {
    const sh = (w: number, h: number, d: number) => ({ width: w, height: h, density: d }) as unknown as import('./atlas').ManifestAtlas;
    const m = { ms: 812.4, A: sh(2046, 1040, 2), B: sh(2048, 1286, 2), G: sh(1024, 422, 2) };
    const art = { bakeMs: 1203, sheets: [m.A, m.B, m.G, null, null, null], ground: null, sheet: null } as unknown as import('./useYard').YardArt;
    expect(UY.bakeLineOf(art, m, 57, 3, null)).toBe('[yard] art baked in 1203 ms (manifest 812 ms in slices beside the loading animation; A 2046x1040@2, B 2048x1286@2, G 1024x422@2; floor and shadows 57 ms; density 3)');
    const w = { C: sh(2048, 1924, 2), D: null, ms: 300.2, cells: 172 };
    expect(UY.bakeLineOf(art, m, 57, 3, w)).toContain('; works 300 ms in 4 ms slices: C 2048x1924@2, D -, 172 cells)');
  });
  it('the works slices are 4 ms, the first yard keeps its 8 ms default', () => {
    expect(At.WORKS_SLICE_MS).toBe(4);
    const src = fs.readFileSync(path.join(__dirname, 'atlas.ts'), 'utf8');
    expect(src).toContain('export function bakeManifest(density: number, sliceMs = 8)');
    expect(src).toContain("const plans = (['A', 'B', 'G'] as const).map((s) => planSheet(s, density));");
  });
  it("the works' shadow kinds are separate from the first yard's (sheet S unchanged with the switch off)", () => {
    expect(A.SHADOW_CELLS.map((s) => s.kind)).toEqual(['person', 'truck', 'flatbed', 'van', 'trailer', 'skip', 'sack', 'trolley']);
    expect(A.WORKS_SHADOW_CELLS.map((s) => s.kind)).toEqual(['truck3', 'cranelorry', 'visitor']);
    const src = fs.readFileSync(path.join(__dirname, 'useYard.ts'), 'utf8');
    for (const k of ['truck3', 'cranelorry', 'visitor']) expect(src).toMatch(new RegExp(`\\n  ${k}: \\[`));
    expect(src).toContain('plan.worksShadows ? bakeShadows(SHADOW_DENSITY, WORKS_SHADOW_CELLS) : bakeShadows()');
  });
});

describe('F2: the truck model table', () => {
  it("row 0 is today's truck: its ids, boxes and the frame loop's fall-back 4.6 x 2; row 1 the hook-lift", () => {
    expect(A.TRUCK_MODELS[0]).toMatchObject({ model: 'truck', body: 'vehicle.truck', bare: 'vehicle.truck.bare', hook: 'vehicle.truck.hook', vbox: A.VBOX_TRUCK, vboxBare: A.VBOX_TRUCK_BARE, vboxHook: A.VBOX_TRUCK_HOOK, len: 4.6, wid: 2 });
    expect(A.TRUCK_MODELS[1].model).toBe('truckBridge');
    expect(A.TRUCK_MODEL_CODE).toEqual({ truck: 0, truckBridge: 1 });
    const f = A.entryOf('vehicle.truck')!.footprint;
    expect(A.truckHalf(A.TRUCK_MODELS[0])).toEqual([f.w / 2, f.d / 2]);
    const g = A.entryOf('vehicle.truckBridge')!.footprint;
    expect(A.truckHalf(A.TRUCK_MODELS[1])).toEqual([g.w / 2, g.d / 2]);
  });
  it("actorTable's row 0 IS today's arrays; row 1's cells resolve once sheet D is baked", () => {
    const { res } = namedRes(['A', 'B', 'G', 'S']);
    const T = A.actorTable(res, { hand: '#00FF00', cutter: '#0000FF', driver: '#00FFFF' });
    const m0 = T.models[0];
    expect(m0.body).toBe(T.truck);
    expect(m0.bare).toBe(T.truckBare);
    expect(m0.hook).toBe(T.truckHook);
    expect(m0.skipLoad).toBe(T.skipLoad);
    expect(m0.shadow).toBe(T.shTruck);
    expect(m0.scale).toBe(T.truckScale);
    expect(T.models[1].body.every((c) => c === -1)).toBe(true);
    // with the switch off the table asks no works id at all (the first yard's requests, in its order)
    const asked: string[] = [];
    A.actorTable((id, f = 0, h = 0) => (asked.push(`${id}#${f}#${h}`), res(id, f, h)), { hand: '#00FF00', cutter: '#0000FF', driver: '#00FFFF' }, false);
    expect(asked.filter((k) => MF.WORKS_MANIFEST.some((e) => k.startsWith(`${e.id}#`)) || k.startsWith('shadow.truck3') || /person\.\w+\.(plasma|analyse)#/.test(k))).toEqual([]);
    const on = A.actorTable(namedRes(['A', 'B', 'G', 'S', 'C', 'D']).res, { hand: '#00FF00', cutter: '#0000FF', driver: '#00FFFF' }, true);
    expect(on.models[1].body.every((c) => c >= 0)).toBe(true);
    expect(on.models[1].hook.length).toBe(4);
    expect(on.models[1].tip.length).toBe(3);
  });
  it("the vehicle boxes keep the first yard's indices and add the hook-lift's after them", () => {
    const vb = A.vehicleBoxes(0.7);
    expect(vb.length).toBe(10 * 8 * 4);
    expect([A.VBOX_BRIDGE, A.VBOX_BRIDGE_BARE, A.VBOX_BRIDGE_HOOK]).toEqual([7, 8, 9]);
    const o = (A.VBOX_BRIDGE * 8 + 2) * 4;
    expect(vb[o + 1] - vb[o]).toBeGreaterThan(0);
  });
  it('a scene of a frame without a model has no truckModel field; a hook-lift frame reads 1', () => {
    const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as import('../../../engine/salvage').SalvageConfig;
    const g0 = { cash: 0, stats: { playSeconds: 0 }, salvage: R.freshSalvage(cfg, FIXTURE_NOW) } as unknown as import('../../../engine/salvage').SalvageGame;
    const f = R.frame(cfg, g0);
    const { res } = namedRes(['A', 'B', 'G', 'S']);
    const s = A.rulesScene(SALVAGE_TEST, f, res, 1);
    expect('truckModel' in s).toBe(false);
    expect(Object.keys(s).sort()).toEqual(Object.keys(A.NO_SCENE).sort());
    const s2 = A.rulesScene(SALVAGE_TEST, { ...f, truck: { ...f.truck, model: 'truckBridge' } }, res, 2);
    expect(s2.truckModel).toBe(1);
    const s3 = A.rulesScene(SALVAGE_TEST, { ...f, truck: { ...f.truck, model: 'truck' } }, res, 3);
    expect('truckModel' in s3).toBe(false);
  });
});

describe('F3: arrival codes', () => {
  it("the first yard's kinds keep 0 to 4; recovery and lowLoader are 5 and 6; an unknown kind packs as ARRIVAL_UNKNOWN", () => {
    expect(A.ARRIVAL_CODE).toEqual({ van: 0, machineFlatbed: 1, truck: 2, crew: 3, dropoff: 4, recovery: 5, lowLoader: 6 });
    expect(A.ARRIVAL_WORKS_FIRST).toBe(5);
    expect(A.ARRIVAL_UNKNOWN).toBeLessThan(0);
    const src = fs.readFileSync(path.join(__dirname, 'actors.ts'), 'utf8');
    expect(src).toContain('arrivals.push(ARRIVAL_CODE[a.kind] ?? ARRIVAL_UNKNOWN,');
  });
});

describe('F4: poses appended at the end', () => {
  it("the first yard's nine poses keep their codes; plasma 9, analyse 10; the frame counts and N_POSES agree", () => {
    expect(A.POSES.slice(0, 9)).toEqual(['stand', 'walk', 'push', 'feed', 'pour', 'spanner', 'sledge', 'grinder', 'torch']);
    expect([A.P_PLASMA, A.P_ANALYSE]).toEqual([9, 10]);
    expect(A.POSES[A.P_PLASMA]).toBe('plasma');
    expect(A.POSES[A.P_ANALYSE]).toBe('analyse');
    expect(A.POSE_FRAMES.slice(0, 9)).toEqual([1, 4, 4, 2, 1, 2, 2, 2, 2]);
    expect(A.POSE_FRAMES.length).toBe(A.POSES.length);
    expect(A.N_POSES).toBe(A.POSES.length);
    expect(A.poseCode('plasma')).toBe(A.P_PLASMA);
    expect(A.poseCode('analyse')).toBe(A.P_ANALYSE);
    expect(A.poseCode('torch')).toBe(A.P_TORCH);
    expect(A.POSE_FRAMES[A.P_PLASMA]).toBe(MF.WORKS_MANIFEST.find((e) => e.id === 'person.boss.plasma')!.frames.length);
    expect(A.POSE_FRAMES[A.P_ANALYSE]).toBe(MF.WORKS_MANIFEST.find((e) => e.id === 'person.boss.analyse')!.frames.length);
  });
  it("the person table keeps the first yard's cells for every pose and heading; the boss's plasma falls back to stand until D is baked", () => {
    const { res, names } = namedRes(['A', 'B', 'G', 'S']);
    const T = A.actorTable(res, { hand: '#00FF00', cutter: '#0000FF', driver: '#00FFFF' });
    const L = A.makeListW(16, 0);
    const V = new Float64Array([0, 0, 40, 0.7, Math.sqrt(1 - 0.49), 2000, 2000, 1]);
    const drawn = (who: number, pose: number, h: number) => {
      L.n = 0;
      A.personInto(L, V, T, who, pose, 0, h, -1, -1, 0, -1, 10, 10, 10);
      return Array.from(L.cell.slice(0, L.n)).map((c) => names[A.unpackCell(c).cell]);
    };
    for (let who = 0; who < 2; who++)
      for (let p = 0; p < 9; p++)
        for (let h = 0; h < 4; h++) {
          const got = drawn(who, p, h)[0];
          const id = `person.${who === 0 ? 'boss' : 'crew'}.${A.POSES[p]}`;
          if (A.entryOf(id)) expect(got.split('#')[0], `${id} h${h}`).toBe(id);
        }
    expect(drawn(0, A.P_PLASMA, 1)[0].split('#')[0]).toBe('person.boss.stand');
    const on = namedRes(['A', 'B', 'G', 'S', 'D']);
    const T2 = A.actorTable(on.res, { hand: '#00FF00', cutter: '#0000FF', driver: '#00FFFF' }, true);
    L.n = 0;
    A.personInto(L, V, T2, 0, A.P_PLASMA, 1, 1, -1, -1, 0, -1, 10, 10, 10);
    // the 4-scheme east (1) is the 8-scheme east (2) of the works' 8-heading entry
    expect(on.names[A.unpackCell(L.cell[0]).cell]).toBe('person.boss.plasma#1#2');
  });
});

describe('F5: the works roofs', () => {
  const GAME = SHIPPED;
  it("with the works' sheets unbaked the roof table is the first yard's, entry for entry", () => {
    const { res } = namedRes(['A', 'B', 'G', 'S']);
    const statics = A.presortItems(A.staticItems(GAME, res));
    expect(A.roofTable(GAME, statics, res, 0.7)).toEqual(A.roofTable(GAME, statics, res, 0.7, []));
    expect(WT.worksRoofSpots(GAME).length).toBeGreaterThan(0);
  });
  it("the first yard's roofs plus every works roof the content can hold fit ROOF_MAX", () => {
    const { res } = namedRes(['A', 'B', 'G', 'S']);
    const statics = A.presortItems(A.staticItems(GAME, res));
    const first = A.roofTable(GAME, statics, res, 0.7, []).length / A.ROOF;
    expect(first + WT.worksRoofSpots(GAME).length).toBeLessThanOrEqual(A.ROOF_MAX);
  });
  it('a works roof drawn as a static at its anchor becomes a roof', () => {
    const { res } = namedRes(['A', 'B', 'G', 'S', 'C', 'D']);
    const spot = WT.worksRoofSpots(GAME)[0];
    const statics = A.presortItems(A.staticItems(GAME, res));
    const extra = [...statics];
    WT.worksSprite(extra, res, spot.id, spot.x, spot.y);
    const base = A.roofTable(GAME, statics, res, 0.7, [spot]).length;
    expect(A.roofTable(GAME, extra, res, 0.7, [spot]).length).toBe(base + A.ROOF);
  });
});

describe('F6: PATH_MAX 16 in actors.ts and motion.ts', () => {
  it('the two are equal and 16', () => {
    expect(A.PATH_MAX).toBe(16);
    expect(M.PATH_MAX_PTS).toBe(A.PATH_MAX);
  });
  it("a works path of 14 dated points (the recovery truck's turning loop) is never shortened", () => {
    const pts = Array.from({ length: 14 }, (_, i) => ({ x: -i * 4, y: 25 + (i % 3) }));
    const at = pts.map((_, i) => 100 + i * 2);
    const d = A.datedPath(pts, at)!;
    expect(d.path.length).toBe(28);
    expect(d.at).toEqual(at);
  });
});

describe('the scene and the stubs (F14): nothing below the works opening', () => {
  it('the item layout numbers of worksTable.ts equal actors.ts', () => {
    expect([WT.W_ITEM, WT.W_L_DECAL, WT.W_L_SORT]).toEqual([A.ITEM, A.L_DECAL, A.L_SORT]);
  });
  it('worksScene answers nothing for a first-yard frame, and the stubs draw nothing', () => {
    const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as import('../../../engine/salvage').SalvageConfig;
    const g0 = { cash: 0, stats: { playSeconds: 0 }, salvage: R.freshSalvage(cfg, FIXTURE_NOW) } as unknown as import('../../../engine/salvage').SalvageGame;
    const f = R.frame(cfg, g0);
    const { res } = namedRes(['A', 'B', 'G', 'S']);
    expect(f.works).toBeUndefined();
    expect(WS.worksItems(SALVAGE_TEST, f, res)).toEqual([]);
    expect(WS.floorItems(SALVAGE_TEST, f, res)).toBeNull();
    const open = { ...f, works: [] };
    expect(WS.worksOpenIn(open)).toBe(true);
    expect(WS.worksItems(SALVAGE_TEST, open, res)).toEqual([]);
    expect(WS.floorItems(SALVAGE_TEST, open, res)).toBeNull();
    expect(WL.worksLabels(cfg, g0, f)).toEqual([]);
    const L = A.makeListW(4, 0);
    expect(WV.worksVehiclesInto(L, L, new Float64Array(8), [], 0, 0, 1 / 60)).toBe(0);
    expect(WP.visitorsInto(L, L, new Float64Array(8), [], 0)).toBe(0);
    expect(WP.packVisitors(undefined)).toEqual([]);
    expect(L.n).toBe(0);
    const cc = CC.makeCostCounters();
    CC.countFrame(cc, 15, 228, 7, 900, 13);
    expect(Array.from(cc)).toEqual([0, 0, 0, 0, 0, 0]);
    cc[CC.CC_ON] = 1;
    CC.countFrame(cc, 15, 228, 7, 900, 13);
    expect(cc[CC.CC_DRAWS]).toBe(15);
    expect(cc.length).toBe(CC.CC_N);
  });
  it("rulesScene's list is the same with and without the works hooks on a first-yard frame", () => {
    const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as import('../../../engine/salvage').SalvageConfig;
    const g0 = { cash: 0, stats: { playSeconds: 0 }, salvage: R.freshSalvage(cfg, FIXTURE_NOW) } as unknown as import('../../../engine/salvage').SalvageGame;
    const f = R.frame(cfg, g0);
    const { res } = namedRes(['A', 'B', 'G', 'S', 'C', 'D']);
    const a = A.rulesScene(SALVAGE_TEST, f, res, 1);
    // an opened frame whose works draw nothing (the stubs) gives the same items as the first yard's
    const b = A.rulesScene(SALVAGE_TEST, { ...f, works: [] }, res, 2);
    expect(b.items).toEqual(a.items);
    expect(b.solids).toEqual(a.solids);
  });
});
