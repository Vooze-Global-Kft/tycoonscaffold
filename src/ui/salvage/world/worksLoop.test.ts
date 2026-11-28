/// <reference types="node" />
/**
 * C-WORLD-2 (PLAN2 2.8; critic-build F2, F3, F7): the frame loop's hooks for the works, and the proof that with the
 * switch off (or below the works' opening) each of them takes the first yard's path number for number (rule 3.1.5).
 * - frameLoop.ts: the truck's model row (F2), the arrival slots and the bodies' array (F3), the kinds handed on to
 *   ./worksVehicleMotion.ts with their dated place, the works' pack gating the works' worklets;
 * - useRulesTable.ts: the works' vehicles and visitors packed for the UI thread, pushed only on a change, never below the
 *   opening;
 * - idleTags.ts: placeTags' extra anchors (F7): empty, the crew's tags as today; given, plates and tags never overlap;
 *   the driver's 'bridge' reason in the quiet ink;
 * - labels.ts: worksLabels appended (nothing below the opening).
 * Runs under node with the world tests' mocks (frameLoop.ts's own React, Skia and store imports mocked: only its pure
 * worklets are exercised here; costHarness.ts and scene.mts measure the drawing).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The works' drawers as a test sets them (the real ones are stubs that draw nothing: the default below is the stub's).
const hooks = vi.hoisted(() => ({
  vehicle: null as null | ((L: { n: number }, V: Float64Array, AR: readonly number[], o: number) => number),
  labels: null as null | ((f: { works?: unknown }) => unknown[]),
  calls: 0,
}));

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 }, AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) }, StyleSheet: { create: (s: unknown) => s, absoluteFill: {} } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {}, FilterMode: {}, MipmapMode: {}, createPicture: () => ({}) }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }), runOnJS: (f: unknown) => f, useFrameCallback: () => ({ setActive: () => {} }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));
vi.mock('../../../modes/salvage/actions', () => ({ salvageActions: {} }));
vi.mock('../hud/pump', () => ({ yardSound: { step: () => {}, truck: () => {} } }));
vi.mock('./worksVehicleMotion', () => ({
  WORKS_VEHICLE_SCRATCH: 4,
  worksVehiclesInto: (L: { n: number }, _SHD: unknown, V: Float64Array, AR: readonly number[], o: number) => {
    hooks.calls++;
    return hooks.vehicle ? hooks.vehicle(L, V, AR, o) : 0;
  },
}));
vi.mock('./worksLabels', () => ({ worksLabels: (_c: unknown, _g: unknown, f: { works?: unknown }) => (f.works === undefined || !hooks.labels ? [] : hooks.labels(f)) }));

const A = await import('./actors');
const M = await import('./motion');
const FL = await import('./frameLoop');
const U = await import('./useRulesTable');
const IT = await import('./idleTags');
const LB = await import('./labels');
const MF = await import('../art/manifest');
const R = await import('../../../engine/salvage');
const F = await import('../../../engine/fixtures/salvage');
const W2 = await import('../../../engine/fixtures/salvage2works');
const { SalvageSchema } = await import('../../../config/schema.salvage');

const GAME = SalvageSchema.parse(JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage);
const gcfg = { mode: 'salvage', salvage: GAME } as unknown as import('../../../engine/salvage').SalvageConfig;
const base = { cash: 0, stats: { playSeconds: 0 }, lifetimeEarnings: 0 } as unknown as import('../../../engine/types').GameState;

/** A resolver over named cells: entries of the given sheets resolve (a cell per id, frame and heading), others are -1. */
function namedRes(baked: readonly string[]) {
  const all = new Map<string, { sheet: string }>([...MF.MANIFEST, ...MF.WORKS_MANIFEST].map((e) => [e.id, e]));
  const memo = new Map<string, number>();
  return (id: string, frame = 0, heading = 0) => {
    const e = all.get(id);
    if (!e || !baked.includes(e.sheet)) return -1;
    const k = `${id}|${frame}|${heading}`;
    if (!memo.has(k)) memo.set(k, memo.size + 1);
    return memo.get(k)!;
  };
}
const VESTS = { hand: '#FFAA00', cutter: '#00AAFF', driver: '#AA00FF' };

describe('F2: the truck from the model table', () => {
  it('switch off (or truckModel absent / 0): row 0, which holds the very arrays and sizes of today', () => {
    const T = A.actorTable(namedRes(['A', 'B', 'G', 'S']), VESTS, false);
    for (const code of [undefined, 0, 1, 7]) {
      const m = FL.truckModelRow(T.models, code);
      expect(m).toBe(T.models[0]);
    }
    const m0 = T.models[0];
    expect(m0.body).toBe(T.truck);
    expect(m0.bare).toBe(T.truckBare);
    expect(m0.hook).toBe(T.truckHook);
    expect(m0.shadow).toBe(T.shTruck);
    expect(m0.skipLoad).toBe(T.skipLoad);
    expect(m0.scale).toBe(T.truckScale);
    expect([m0.vbox, m0.vboxBare, m0.vboxHook]).toEqual([A.VBOX_TRUCK, A.VBOX_TRUCK_BARE, A.VBOX_TRUCK_HOOK]);
    // The half-sizes the loop read before (frameLoop's own `half('vehicle.truck', 4.6, 2)`).
    const f = A.entryOf('vehicle.truck')?.footprint;
    expect(m0.half).toEqual([(f?.w ?? 4.6) / 2, (f?.d ?? 2) / 2]);
  });
  it("the hook-lift's row only once its body is baked (sheet D); unbaked, the truck is drawn as today's", () => {
    const unbaked = A.actorTable(namedRes(['A', 'B', 'G', 'S']), VESTS, true);
    expect(FL.truckModelRow(unbaked.models, A.TRUCK_MODEL_CODE.truckBridge)).toBe(unbaked.models[0]);
    const baked = A.actorTable(namedRes(['A', 'B', 'G', 'S', 'C', 'D']), VESTS, true);
    const m1 = FL.truckModelRow(baked.models, A.TRUCK_MODEL_CODE.truckBridge);
    expect(m1).toBe(baked.models[1]);
    expect(m1.half).toEqual(A.truckHalf(A.TRUCK_MODELS[1]));
    expect(m1.vbox).toBe(A.VBOX_BRIDGE);
    // Its box per heading exists in the loop's VX table (the step aside reads it).
    const VX = A.vehicleBoxes(0.7);
    expect(VX.length).toBeGreaterThanOrEqual((A.VBOX_BRIDGE_HOOK * 8 + 8) * 4);
  });
  it('a first-yard scene carries no truckModel (the loop reads row 0)', () => {
    const g = F.fixtureGame('m30', base);
    const sc = A.rulesScene(gcfg.salvage, R.frame(gcfg, g), () => -1, 1);
    expect('truckModel' in sc).toBe(false);
  });
});

describe('F3: six arrival slots, the bodies array, the kinds handed on', () => {
  it("off: the slot formula is today's `4 + Math.min(3, i)` for every index; on: six slots, 4 to 9", () => {
    for (let i = 0; i < 20; i++) expect(FL.arrivalSlot(i, FL.ARRIVAL_SLOTS_FIRST_YARD)).toBe(4 + Math.min(3, i));
    expect([0, 1, 2, 3, 4, 5, 6, 9].map((i) => FL.arrivalSlot(i, FL.ARRIVAL_SLOTS))).toEqual([4, 5, 6, 7, 8, 9, 9, 9]);
    // The first yard's slots are motion.ts's VB_SLOTS; the scratch holds all six arrivals; every slot fits the `seen` bits.
    expect(FL.FIRST_SLOTS + FL.ARRIVAL_SLOTS_FIRST_YARD).toBe(M.VB_SLOTS);
    expect(FL.LOOP_SLOTS).toBe(10);
    expect(FL.LOOP_SLOTS).toBeLessThan(31);
    // Bodies: truck, flatbed, van, trailer and six arrivals.
    expect(FL.VB_BODIES).toBeGreaterThanOrEqual(FL.FIRST_SLOTS + FL.ARRIVAL_SLOTS);
  });
  it('only the works\' kinds and unknown ones are handed on; the first yard\'s codes never are', () => {
    for (const [k, code] of Object.entries(A.ARRIVAL_CODE)) expect([k, FL.handedOn(code)]).toEqual([k, code >= A.ARRIVAL_WORKS_FIRST]);
    expect(FL.handedOn(A.ARRIVAL_UNKNOWN)).toBe(true);
    expect(FL.handedOn(U.WORKS_VEHICLE_CODE.dealerVan)).toBe(true);
    // No code of the works' pack collides with an arrival code.
    for (const c of Object.values(U.WORKS_VEHICLE_CODE)) expect(Object.values(A.ARRIVAL_CODE)).not.toContain(c);
  });
  it('the first yard packs no handed-on arrival on any played state', () => {
    for (const n of F.FIXTURE_NAMES) {
      const sc = A.rulesScene(gcfg.salvage, R.frame(gcfg, F.fixtureGame(n, base)), () => -1, 1);
      for (let o = 0; o < sc.arrivals.length; o += A.ARRIVAL) expect(FL.handedOn(sc.arrivals[o])).toBe(false);
    }
  });

  /** The loop's scratch for one handed-on vehicle. */
  function scratch() {
    const L = A.makeListW(64, 0);
    const SHD = A.makeListW(16, 64);
    const V = new Float64Array(FL.VW_N);
    V.set([0, 0, 40, 0.7, 1, 844, 390, 1]);
    return { L, SHD, V, P: new Array(A.PATH_MAX * 2).fill(0), TA: new Array(A.PATH_MAX).fill(0), o4: [0, 0, 0, 0], tmp2: [0, 0, 0, 0], f2: [0, 0, 0, 0], VB: new Float64Array(FL.VB_BODIES * M.VB_STRIDE), PV: new Float64Array(FL.LOOP_SLOTS * 2).fill(NaN), VR: new Int32Array(FL.LOOP_SLOTS * 3).fill(-1), cnt: [0] };
  }
  // A recovery truck coming in straight from (40, 10) to (10, 10) over yard seconds 100 to 120.
  const AR = [A.ARRIVAL_CODE.recovery, A.ARRIVAL_PHASE.in, 40, 10, 10, 10, 100, 120, 0, 0];

  it('the stub draws nothing: no body, no slot, nothing counted (what the works add today)', () => {
    hooks.vehicle = null;
    const s = scratch();
    const n = FL.worksVehicleOne(s.L, s.SHD, s.V, AR, 0, [], [], 110, 1 / 60, s.P, s.TA, s.o4, s.tmp2, s.f2, s.VB, 3, s.PV, s.VR, 8, 3.5, 1.25, s.cnt);
    expect(n).toBe(3);
    expect(s.cnt[0]).toBe(0);
    expect([...s.VR]).toEqual(new Array(FL.LOOP_SLOTS * 3).fill(-1));
  });
  it('a drawn vehicle gets its DATED place in V (as arrivalAt gives it), its slot\'s drawn range and its body', () => {
    const s = scratch();
    const seen: number[][] = [];
    hooks.vehicle = (L, V, ar, o) => {
      seen.push([V[FL.VW_X], V[FL.VW_Y], V[FL.VW_H4], V[FL.VW_U], V[FL.VW_SLOT], ar[o]]);
      L.n += 2;
      return 1;
    };
    const n = FL.worksVehicleOne(s.L, s.SHD, s.V, AR, 0, [], [], 110, 1 / 60, s.P, s.TA, s.o4, s.tmp2, s.f2, s.VB, 0, s.PV, s.VR, 8, 3.5, 1.25, s.cnt);
    hooks.vehicle = null;
    const o4 = [0, 0, 0, 0];
    const h4 = M.arrivalAt(o4, [0, 0, 0, 0], new Array(32).fill(0), new Array(16).fill(0), AR, 0, [], [], 110);
    expect(seen).toEqual([[o4[0], o4[1], h4, 0.5, 8, A.ARRIVAL_CODE.recovery]]);
    expect(o4.slice(0, 2)).toEqual([25, 10]);
    expect(n).toBe(1);
    expect(s.cnt[0]).toBe(1);
    expect([s.VR[24], s.VR[25], s.VR[26]]).toEqual([0, 2, 0]);
    // The body: at its place, facing west (heading4 3), the given half-sizes.
    expect([s.VB[0], s.VB[1], Math.round(s.VB[2]), Math.round(s.VB[3]) + 0, s.VB[4], s.VB[5]]).toEqual([25, 10, -1, 0, 3.5, 1.25]);
  });
  it("the works' crane lorry and dealer's van have their art's footprints (the halves the loop hands the body)", () => {
    for (const id of ['vehicle.cranelorry', 'vehicle.van.dealer']) expect(A.entryOf(id)?.footprint.w ?? 0).toBeGreaterThan(0);
  });
});

describe("useRulesTable: the works' vehicles and visitors, packed for the UI thread", () => {
  const frameLike = (o: Partial<import('../../../engine/salvage').FrameTable>) => o as import('../../../engine/salvage').FrameTable;
  it('below the works\' opening: NO_WORKS on every first-yard state, and the pusher pushes nothing of the works', () => {
    for (const n of F.FIXTURE_NAMES) expect(U.worksPack(R.frame(gcfg, F.fixtureGame(n, base)))).toBe(U.NO_WORKS);
    expect(U.worksPack(frameLike({ van: { phase: 'load', span: { t0: 1, t1: 2 }, stop: { x: 1, y: 2 } } }))).toBe(U.NO_WORKS);
    let g = F.fixtureGame('m30', base);
    const store = { cfg: gcfg, game: g };
    const works: unknown[] = [];
    const P = U.makeRulesPusher({ actList: [] } as never, () => store, { scene: () => {}, items: () => {}, works: (w) => works.push(w) }, () => () => -1);
    for (let k = 0; k < 20; k++) {
      g = R.tick(gcfg, g, 0.1, F.FIXTURE_NOW + k * 100).game;
      store.game = g;
      P.read();
    }
    expect(P.stats.reads).toBeGreaterThan(0);
    expect(works).toEqual([]);
    expect(P.stats.works).toBe(0);
  });
  it("from the opening: the dealer's van in the arrivals' layout; the same numbers keep the same object (no push)", () => {
    const f = frameLike({ works: [], van: { phase: 'load', span: { t0: 100, t1: 160 }, stop: { x: -20, y: 30 } }, visitors: [] });
    const p = U.worksPack(f);
    expect(p.vehicles).toEqual([U.WORKS_VEHICLE_CODE.dealerVan, A.ARRIVAL_PHASE.setDown, -20, 30, -20, 30, 100, 160, 0, 0]);
    expect(p.vehicles.length).toBe(A.ARRIVAL);
    expect(p.visitors).toEqual([]);
    expect(p.n).toBe(1);
    expect(U.worksPack(f, p)).toBe(p);
    const q = U.worksPack(frameLike({ ...f, van: { ...f.van!, phase: 'out' } }), p);
    expect(q).not.toBe(p);
    expect(q.n).toBe(2);
    expect(q.vehicles[1]).toBe(A.ARRIVAL_PHASE.out);
    // Nothing left: back to NO_WORKS (the loop calls nothing).
    expect(U.worksPack(frameLike({ works: [], van: null, visitors: [] }), q)).toBe(U.NO_WORKS);
    expect(FL.worksEmpty(U.NO_WORKS)).toBe(true);
    expect(FL.worksEmpty(q)).toBe(false);
  });
  it('on a works state (r3 of the works\' test content): the frame has works and the pack is built from it', () => {
    const cfg = W2.worksCfg();
    const g = W2.r3Works();
    const f = R.frame(cfg, g);
    expect(f.works).toBeDefined();
    const p = U.worksPack(f);
    expect(p.vehicles.length % A.ARRIVAL).toBe(0);
    expect(p === U.NO_WORKS).toBe(!(f.van && f.van.stop));
  });
});

describe('F7: placeTags takes extra anchors (the works\' plot reasons)', () => {
  const ax = [400, 420, 600, 120, 820];
  const ay = [200, 205, 120, 330, 250];
  const w = [100, 120, 90, 140, 80];
  it('with none (the first yard): exactly the placement of before, for many layouts', () => {
    for (let s = 0; s < 40; s++) {
      const n = 1 + (s % 5);
      const AX = ax.map((x, i) => x + ((s * 37 + i * 11) % 90) - 45);
      const AY = ay.map((y, i) => y + ((s * 53 + i * 7) % 70) - 35);
      const a = [[], []] as number[][];
      const b = [[], []] as number[][];
      IT.placeTags(a[0], a[1], AX, AY, w, 20, n, 10, 834, 44, 380, [760, 300, 834, 380]);
      IT.placeTags(b[0], b[1], AX, AY, w, 20, n, 10, 834, 44, 380, [760, 300, 834, 380], [], []);
      expect(b).toEqual(a);
    }
  });
  it('given: every plate and every tag stays inside the screen, below the bars, and none overlaps another', () => {
    const box = (l: number, t: number, ww: number, hh: number) => [l, t, l + ww, t + hh];
    const meet = (p: number[], q: number[]) => p[0] < q[2] && p[2] > q[0] && p[1] < q[3] && p[3] > q[1];
    for (let s = 0; s < 40; s++) {
      const AX = ax.map((x, i) => x + ((s * 29 + i * 13) % 60) - 30);
      const AY = ay.map((y, i) => y + ((s * 41 + i * 5) % 50) - 25);
      // Two plot reasons right where the first two tags would go, one off screen.
      const extra = [AX[0] + 10, AY[0] + 4, 150, 22, AX[2] - 5, AY[2], 110, 22, 2000, 100, 100, 22];
      const eo: number[] = [];
      const left: number[] = [];
      const tops: number[] = [];
      IT.placeTags(left, tops, AX, AY, w, 20, 5, 10, 834, 44, 380, [], extra, eo);
      const shown: number[][] = [];
      for (let e = 0; e < 3; e++) {
        if (!(eo[e * 2 + 1] === eo[e * 2 + 1])) continue;
        shown.push(box(eo[e * 2], eo[e * 2 + 1], extra[e * 4 + 2], extra[e * 4 + 3]));
      }
      expect(eo[5]).toBeNaN();
      expect(shown.length).toBe(2);
      for (let i = 0; i < 5; i++) if (tops[i] === tops[i]) shown.push(box(left[i], tops[i], w[i], 20));
      for (const b of shown) {
        expect(b[0]).toBeGreaterThanOrEqual(10);
        expect(b[2]).toBeLessThanOrEqual(834);
        expect(b[1]).toBeGreaterThanOrEqual(44);
        expect(b[3]).toBeLessThanOrEqual(380);
      }
      for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) expect(meet(shown[i], shown[j])).toBe(false);
    }
  });
  it("the cap of three and the order of the crew's tags are idleTags' and do not move", () => {
    expect(IT.IDLE_TAGS_MAX).toBe(3);
    expect(IT.TAG_EXTRA).toBe(4);
  });
  it("the hired driver's 'bridge' reason (from the works' opening) is drawn, in the quiet ink, as 'nothing' is", () => {
    const m = { id: 'driver.0', role: 'driver', from: { x: 1, y: 1 }, to: { x: 1, y: 1 }, t0: 0, t1: 0, idleWhy: 'bridge', idleText: { key: 'tag.driver.bridge', args: { t: { secs: 30 } } } } as unknown as import('../../../engine/salvage').FrameCrew;
    const since = new Map<string, number>();
    IT.idleTags([m], 10, since, null);
    const tags = IT.idleTags([m], 10 + IT.IDLE_SHOW_S, since, null);
    expect(tags.map((t) => [t.why, t.quiet])).toEqual([['bridge', true]]);
    expect(IT.quietWhy('nothing')).toBe(true);
    for (const w of ['uncut', 'yours', 'tool'] as const) expect(IT.quietWhy(w)).toBe(false);
  });
});

describe("labels.ts appends worksLabels", () => {
  it('below the opening nothing is asked of it; from the opening its plates are in the list', () => {
    hooks.labels = (f) => (f.works ? [{ id: 'works.test', kind: 'sign', x: 0, y: 0, z: 1, lines: [{ text: 'Waiting', tone: 'ink', max: 30 }], padlock: false, near: false, place: null }] : []);
    const g = F.fixtureGame('m30', base);
    expect(LB.labelItems(gcfg, g, R.frame(gcfg, g), 0).some((l) => l.id === 'works.test')).toBe(false);
    const cfg = W2.worksCfg();
    const w = W2.r3Works();
    expect(LB.labelItems(cfg, w, R.frame(cfg, w), 0).some((l) => l.id === 'works.test')).toBe(true);
    hooks.labels = null;
  });
});

describe('the frame loop\'s source: every hook behind the switch', () => {
  const src = fs.readFileSync(path.join(__dirname, 'frameLoop.ts'), 'utf8');
  it('the works are read once per mount from stageOn(); every works call and the cost counters sit behind it', () => {
    expect(src).toMatch(/const works = useMemo\(\(\) => stageOn\(\), \[\]\);/);
    expect(src).toMatch(/if \(works && handedOn\(kind\)\)/);
    expect(src).toMatch(/const WK = works \? rulesWorks\.value : NO_WORKS;/);
    expect(src).toMatch(/const TM = works \? truckModelRow\(T\.models, Rv\.truckModel\) : T\.models\[0\];/);
    expect(src).toMatch(/if \(works\) \{\s*S\.cc\[CC_ON\] = 1;/);
    // The first yard's slot count is motion.ts VB_SLOTS' and nothing iterates the old constant.
    expect(src).not.toMatch(/(< |\(|\* ?)VB_SLOTS/);
    expect(src).toMatch(/const arrN = works \? ARRIVAL_SLOTS : ARRIVAL_SLOTS_FIRST_YARD;/);
  });
});
