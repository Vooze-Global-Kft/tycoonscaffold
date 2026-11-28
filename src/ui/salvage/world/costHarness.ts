/**
 * HARNESS (PLAN2 batch 0c; phasec/s2c-critic-build.md R3, R5 and "## 4."): THE FRAME'S DRAW LIST REBUILT UNDER NODE.
 *
 * The yard's frame is built inside the closure of `useYardLoop` (./frameLoop.ts, a Reanimated frame callback): no test
 * can call it. This file rebuilds the same three lists (ground decals, actor shadows, the depth-sorted list) from the
 * world's EXPORTED pieces (./actors.ts rulesScene, staticItems, presortItems, actorTable, addTo, personInto, sortRuns,
 * vehicleBoxes, roofTable; ./motion.ts truckAt, truckFrom, turnFacing, arrivalAt, carAt, flatbedAway, crewAt, legStart,
 * bodyInto, stepAside, behindStanding, vehicleCovers; ./camera.ts followCam, zoomedBounds; ./collide.ts moveBody), in
 * the loop's order and with its constants, for a camera that has settled on the followed body (no stick: the boss
 * stands; driving: the wider zoom). It counts what the development panel counts:
 *   draws    the frame's drawAtlas calls (the panel's "runs": decal runs + shadow runs + sorted runs),
 *   sprites  D.n + SHD.n + L.n (the panel's "sprites"),  actors  the panel's "actors",
 *   statics  map statics plus the rules' items TESTED this frame (every one is culled by addTo each frame),
 * and every requested sprite id that resolves to cell -1 (R5: `push` silently draws nothing).
 *
 * NOTHING HERE IMPORTS AT RUN TIME (types only): the world's modules are handed in (`HarnessMods`), so one harness
 * measures any tree (the record of ff064ce and today's: phasec/harness/scene.mts) and runs under vitest or tsx alike.
 *
 * WHAT IT DOES NOT SEE (said where it is used): the stick, the boss's own drive and walk, the presence samples, the
 * sound, the pour nudge of the camera and the camera's ease (the camera is the settled follow view), the stress
 * helpers' cycle runs on `clock`. A change to ./frameLoop.ts's own drawing code is NOT seen: this file is its copy (scene.mts
 * warns when frameLoop.ts differs from the record's tree). o4-world brought the copy up to frameLoop.ts as C-WORLD-2 left
 * it (the truck from the model table's row 0, the arrival slot formula at four slots; the works' hooks are off: the
 * harness draws with the switch off) and then mirrored its own changes: the truck's turn to the hook frames' heading
 * (F2) and the hop pass (F5). Both follow the TREE handed in: a tree whose actor table has no `models` (ff064ce) is
 * drawn with ff064ce's truck block, one whose actors.ts has no `hopRuns` without the hop pass, so the same harness still
 * draws the archive as the archive drew. Pure; deterministic.
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import type * as R from '../../../engine/salvage';
import type * as ActorsMod from './actors';
import type * as MotionMod from './motion';
import type * as CameraMod from './camera';
import type * as CollideMod from './collide';
import type * as YardMod from './yard';
import type { DrawList, Resolver, RulesScene, SheetLike } from './actors';
import type { YardLayout } from './yard';

/** The world's modules, handed in (a tree's own, so the harness measures that tree). */
export interface HarnessMods {
  A: typeof ActorsMod;
  M: typeof MotionMod;
  Cam: typeof CameraMod;
  Co: typeof CollideMod;
  Y: typeof YardMod;
  /** The rules' frame (src/engine/salvage.ts `frame`). */
  frame: (cfg: R.SalvageConfig, g: R.SalvageGame) => R.FrameTable;
  /** ./atlas.ts planSheet (its cells give the baked index and, o4-world, the cells' rectangles the hop pass reads; nothing is drawn). */
  planSheet: (sheet: 'A' | 'B' | 'G', want: number) => { density?: number; cells: readonly { id: string; frame: number; heading: number; x?: number; y?: number; w?: number; h?: number; ax?: number; ay?: number }[] };
  /** The vests of the roles (../art/palette.ts YARD.vestYardHand, vestCutter, vestDriver). */
  vests: { hand: string; cutter: string; driver: string };
  /** art/manifest/things OBJECT_SPRITE (a thing's entry by its object), for the unknown-id check; optional. */
  objectSprite?: Readonly<Record<string, string>>;
}

/**
 * ./frameLoop.ts's own constants at ff064ce (costHarness.test.ts reads frameLoop.ts's source and holds them equal):
 * the pools' capacities and FEEL's pictured speeds and frame times.
 */
export const LOOP = {
  CAP_DECAL: 420,
  CAP_SHADOW: 140,
  CAP_SORT: 1000,
  driveZoom: 0.75,
  vehicleV: 6,
  strideM: 0.35,
  workFrameS: 0.28,
} as const;
const CELL_BASE = 2_000_000;
const NO_ITEMS: number[] = [];

/** The screen the harness draws for (points), with the safe area's insets (the web preview: none). */
export interface HarnessView {
  SW: number;
  SH: number;
  insets?: { left: number; top: number; right: number; bottom: number };
}

/** One frame's counts (the development panel's, plus the culling and the misses). */
export interface FrameCost {
  /** drawAtlas calls this frame = the panel's "runs". */
  draws: number;
  runs: { decal: number; shadow: number; sorted: number };
  sprites: number;
  lists: { decal: number; shadow: number; sorted: number };
  actors: number;
  /** Map statics plus rules items tested (culled) this frame. */
  statics: number;
  /** The settled camera (points before the zoom) and its zoom; the followed body (metres) and whether he drives. */
  cam: [number, number, number];
  body: [number, number, number];
}

/** A drawn person this frame (crew by the frame's order, then the boss on foot). */
export interface DrawnPerson {
  who: 'crew' | 'boss';
  /** The frame's crew id ('boss' for him). */
  id: string;
  role: string;
  x: number;
  y: number;
  /** Rules place (before the step aside). */
  rx: number;
  ry: number;
  hidden: boolean;
}

/** A drawn vehicle this frame. */
export interface DrawnVehicle {
  /** 'truck' | 'flatbed' | 'van' | 'trailer' | 'arrival:<kind code>' */
  kind: string;
  slot: number;
  x: number;
  y: number;
  /** Offset of its body in `vb`. */
  o: number;
}

export interface FrameDraw {
  cost: FrameCost;
  /** The three lists as drawn: per sprite [packed cell, screen x, y, scale, tint, alpha, key], the sorted list in draw order. */
  decal: number[][];
  shadow: number[][];
  sorted: number[][];
  people: DrawnPerson[];
  vehicles: DrawnVehicle[];
  /** The vehicles' drawn bodies this frame (./motion.ts VB_STRIDE numbers each) and their count. */
  vb: Float64Array;
  nvb: number;
  scene: RulesScene;
  /** o4-world: the hop pass's rectangle tests this frame (0 without it). */
  hopTests: number;
  /** o4-world: the driver's or parked truck as drawn: its facing memory's heading8, the heading its picture faces, the hook frame (-1: none); null when not drawn. */
  truck: { h8: number; art: number; hook: number } | null;
}

/**
 * The sheets as the world reads them, built in node: A, B and G from ./atlas.ts planSheet at density 2 (the phone's
 * SHEET_DENSITY at 2x and 3x; the index is the plan's cell order, as atlas.ts finish() makes it), S (the actor shadows)
 * one cell per actors.ts SHADOW_CELLS kind and heading. Nothing is drawn, only resolved; o4-world: `rects` are the plan's
 * cells (x, y, w, h, ax, ay as atlas.ts finish() writes them) and `density` the plan's, as drawRuns and the hop pass read
 * them (S's rects stay empty: shadows are never in the sorted list).
 */
export function nodeSheets(mods: HarnessMods, density = 2): SheetLike[] {
  const out: SheetLike[] = [];
  for (const s of ['A', 'B', 'G'] as const) {
    const index: Record<string, number> = {};
    const rects: number[] = [];
    const plan = mods.planSheet(s, density);
    plan.cells.forEach((c, i) => {
      index[`${c.id}#${c.frame}#${c.heading}`] = i;
      rects.push(c.x ?? 0, c.y ?? 0, c.w ?? 0, c.h ?? 0, c.ax ?? 0, c.ay ?? 0);
    });
    out.push({ density: plan.density ?? density, rects, index });
  }
  const index: Record<string, number> = {};
  let i = 0;
  for (const s of mods.A.SHADOW_CELLS) for (const h of s.headings) index[`shadow.${s.kind}#0#${h}`] = i++;
  out.push({ density: 1, rects: [], index });
  return out;
}

/** Ids a resolver was asked for that resolved to -1, by where they were asked (`table`, `statics`, `scene`). */
export type Misses = Record<'table' | 'statics' | 'scene', Map<string, number>>;

export interface Harness {
  yard: YardLayout;
  res: Resolver;
  misses: Misses;
  /** Ids the frame names (things, fixtures, bay looks) that the manifest does not know (drawn as nothing). */
  unknown: Map<string, number>;
  statics: number[];
  /**
   * Draws one frame of `f`. `clock` the UI clock (seconds since the yard began drawing: alternations, pose frames),
   * `dt` the seconds since the previous call (the eases), `tNow` the rules' time drawn at (default f.t), `n` the scene
   * counter. The harness keeps the loop's memory (facings, step asides, previous places, the clock's epoch) between calls.
   */
  draw: (f: R.FrameTable, o?: { clock?: number; dt?: number; tNow?: number; n?: number }) => FrameDraw;
}

const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

/** A harness over one config and screen (see the header). */
export function makeHarness(mods: HarnessMods, c: SalvageContent, view: HarnessView): Harness {
  const { A, M, Cam, Co, Y } = mods;
  const yard = Y.yardLayout(c);
  const sheets = nodeSheets(mods);
  const base = A.makeResolver(sheets);
  // drawRuns' and the hop pass's view of the sheets (frameLoop.ts `baked`: rects, dens).
  const rects = sheets.map((s) => s.rects);
  const dens = sheets.map((s) => s.density);
  const hopRuns = typeof A.hopRuns === 'function' ? A.hopRuns : null;
  const misses: Misses = { table: new Map(), statics: new Map(), scene: new Map() };
  let phase: keyof Misses = 'table';
  const seen = new Set<string>();
  const res: Resolver = (id, frame = 0, heading = 0) => {
    const cell = base(id, frame, heading);
    if (cell < 0) {
      const k = `${phase}|${id}#${frame}#${heading}`;
      if (!seen.has(k)) {
        seen.add(k);
        bump(misses[phase], `${id}#${frame}#${heading}`);
      }
    }
    return cell;
  };
  const unknown = new Map<string, number>();
  const SW = view.SW;
  const SH = view.SH;
  const ins = view.insets ?? { left: 0, top: 0, right: 0, bottom: 0 };

  // --- what ./frameLoop.ts `baked` holds ------------------------------------------------------------------
  const T = A.actorTable(res, mods.vests);
  phase = 'statics';
  const statics = A.presortItems(A.staticItems(c, res, yard.props.filter((p) => p.id.startsWith('stress-')), yard.dressing));
  phase = 'scene';
  const ITEM = A.ITEM;
  const roofs = A.roofTable(c, statics, res, yard.tilt);
  const roofOf: number[] = new Array(Math.floor(statics.length / ITEM)).fill(-1);
  for (let r = 0; r * A.ROOF < roofs.length; r++) roofOf[roofs[r * A.ROOF + 5]] = r;
  const half = (id: string, w: number, d: number) => {
    const fp = A.entryOf(id)?.footprint;
    return [(fp?.w ?? w) / 2, (fp?.d ?? d) / 2];
  };
  const VD = [...half('vehicle.truck', 4.6, 2), ...half('vehicle.flatbed', 4.6, 2), ...half('vehicle.van', 3.4, 1.8), ...half('vehicle.trailer', 1.6, 1.3)];
  const hedgeD = A.entryOf('lane.hedge')?.footprint.d ?? 0;
  const HS = yard.lane.length === 4 ? yard.lane[2] - 0.6 + hedgeD / 2 : NaN;
  const PB = A.personBox();
  const VX = A.vehicleBoxes(yard.tilt);

  const { solids, ppm, tilt, lift, width: YW, depth: YD, pxH, lane, drawW, pts } = yard;
  const hPts = yard.helpers.map((h) => h.pts);
  const hLen = yard.helpers.map((h) => h.length);
  const hPhase = yard.helpers.map((h) => h.phase);
  const workerR = c.worker.radius;
  const truckR = c.truck.radius;
  const enterR = c.truck.enter;
  const helperSpeed = c.helpers.speed;
  const topPx = (1.95 * lift + 0.4 * tilt + 0.1) * ppm + 8;
  const room = Cam.EDGE_ROOM_M * ppm;
  const north = yard.northFace;
  const NO_LANE: number[] = [];

  // --- the loop's memory (S of ./frameLoop.ts) ---------------------------------------------------------------
  const PATH_MAX = A.PATH_MAX;
  const VB_STRIDE = M.VB_STRIDE;
  const VB_SLOTS = M.VB_SLOTS;
  const ROOF_MAX = A.ROOF_MAX;
  const mk = (cap: number, b: number): DrawList => A.makeListW(cap, b);
  const S = {
    D: mk(LOOP.CAP_DECAL, 0),
    SHD: mk(LOOP.CAP_SHADOW, LOOP.CAP_DECAL),
    L: mk(LOOP.CAP_SORT, LOOP.CAP_DECAL + LOOP.CAP_SHADOW),
    cam: [0, 0, 0, 0],
    out: [0, 0],
    o4: [0, 0, 0, 0],
    path: new Array(PATH_MAX * 2).fill(0) as number[],
    view: new Float64Array(8),
    face: [NaN, 0],
    t4: [0, 0, 0, 0],
    tmp2: [0, 0, 0, 0],
    legK: new Float64Array(2 * 64),
    tA: new Array(PATH_MAX).fill(0) as number[],
    truckK: [NaN, NaN, NaN],
    // 12 bodies as ./frameLoop.ts holds them (S.vb)
    vb: new Float64Array(12 * VB_STRIDE),
    pv: new Float64Array(VB_SLOTS * 2).fill(NaN),
    aside: new Float64Array(128),
    f2: [0, 0, 0, 0],
    roofL: new Int32Array(ROOF_MAX).fill(-1),
    roofA: new Float64Array(ROOF_MAX).fill(1),
    nvb: 0,
    vr: new Int32Array(VB_SLOTS * 3).fill(-1),
    vehA: new Float64Array(VB_SLOTS).fill(1),
    epoch: NaN,
    // st[0..8]: boss x, y; truck x, y, angle; driving; (unused); (unused); boss heading4
    bx: yard.workerStart.x,
    by: yard.workerStart.y,
    tx: yard.truckStart.x,
    ty: yard.truckStart.y,
    ta: 0,
    driving: 0,
    bh: 0,
    tr31: NaN,
    tr32: NaN,
    n: 0,
  };

  const draw = (f: R.FrameTable, o: { clock?: number; dt?: number; tNow?: number; n?: number } = {}): FrameDraw => {
    const clock = o.clock ?? 0;
    const dt = o.dt ?? 1 / 60;
    const tNow = o.tNow ?? f.t;
    phase = 'scene';
    // The frame's named ids the manifest does not know (rulesScene draws nothing for them, silently).
    for (const th of f.things) {
      const stripped = th.sprite.replace(/\.(whole|cut\d+)$/, '');
      if (!A.entryOf(th.sprite) && !A.entryOf(mods.objectSprite?.[th.obj] ?? stripped)) bump(unknown, `thing ${th.sprite}`);
    }
    for (const fx of f.fixtures ?? []) if (!A.entryOf(fx.sprite)) bump(unknown, `fixture ${fx.sprite}`);
    for (const b of f.bays) if (b.look && !A.entryOf(`${b.look}.1`) && !A.entryOf(b.look) && (b.kind ?? 'heap') === 'heap' && !A.entryOf(`heap.${b.grade}.1`)) bump(unknown, `bay ${b.look}`);
    S.n += 1;
    const Rv = A.rulesScene(c, f, res, o.n ?? S.n);
    const st = S;
    const B = Rv.boss;
    const truckOwned = Rv.truck[0] === 1;
    const truckBusy = Rv.truck[5] === 2 || Rv.truck[6] >= 0;
    const byBoss = truckOwned && Rv.truck[5] === 1;
    let snap = false;
    // An epoch change (and the first frame) snaps the boss to where the rules have him.
    if (Rv.epoch !== st.epoch) {
      st.epoch = Rv.epoch;
      snap = true;
      if (byBoss) {
        st.driving = 1;
        st.tx = Rv.truck[1];
        st.ty = Rv.truck[2];
        st.ta = Math.PI / 2 - (Rv.truck[3] * Math.PI) / 4;
      } else {
        st.driving = 0;
        if (B[9] === B[9] && B[10] === B[10]) {
          Co.moveBody(st.out, B[9], B[10], 0, 0, workerR, solids, YW, YD, 0, 0, 0, Rv.solids, lane);
          st.bx = st.out[0];
          st.by = st.out[1];
          st.bh = B[11] >= 0 && B[11] < 4 ? B[11] : 0;
        }
      }
    }
    // The truck stands where the rules last put it unless the boss holds it.
    if (st.driving !== 1 && !truckBusy && !byBoss && (snap || Rv.truck[1] !== st.tr31 || Rv.truck[2] !== st.tr32)) {
      st.tr31 = Rv.truck[1];
      st.tr32 = Rv.truck[2];
      if (truckOwned) {
        st.tx = Rv.truck[1];
        st.ty = Rv.truck[2];
        const h8w = ((Math.round((Math.PI / 2 - st.ta) / (Math.PI / 4)) % 8) + 8) % 8;
        if (snap || h8w !== Rv.truck[3]) st.ta = Math.PI / 2 - (Rv.truck[3] * Math.PI) / 4;
      }
    }
    // Who sits in the cab: the rules' answer (no stick here: the world's own Step out never happens).
    if (!snap) {
      if (st.driving === 0 && byBoss) {
        const ex = Rv.truck[1] - st.tx;
        const ey = Rv.truck[2] - st.ty;
        if (!(ex * ex + ey * ey <= 16)) {
          st.tx = Rv.truck[1];
          st.ty = Rv.truck[2];
          st.ta = Math.PI / 2 - (Rv.truck[3] * Math.PI) / 4;
        }
        st.driving = 1;
      } else if (st.driving === 1 && truckOwned && truckBusy) {
        // The forced step down: beside the truck on the first free side.
        const r = truckR + workerR + 0.25;
        let placed = false;
        for (let k = 0; k < 4 && !placed; k++) {
          const a = st.ta + Math.PI / 2 + k * (Math.PI / 2);
          const cx = st.tx + Math.cos(a) * r;
          const cy = st.ty + Math.sin(a) * r;
          if (!Co.blocked(cx, cy, workerR, solids, YW, YD, Rv.solids, lane)) {
            st.bx = cx;
            st.by = cy;
            placed = true;
          }
        }
        if (!placed) {
          st.bx = st.tx;
          st.by = st.ty;
        }
        st.driving = 0;
        st.bh = 0;
      }
    }
    void enterR;
    const driving = st.driving === 1;
    if (!driving) {
      // Standing (no stick): pushed out of what he stands in (the vehicles drawn last frame included).
      const truckSolid = truckOwned && !truckBusy && st.nvb === 0;
      Co.moveBody(st.out, st.bx, st.by, 0, 0, workerR, solids, YW, YD, st.tx, st.ty, truckSolid ? truckR * 0.85 : 0, Rv.solids, st.bx > YW - workerR ? lane : NO_LANE, st.vb, st.nvb);
      st.bx = st.out[0];
      st.by = st.out[1];
    }
    const bx = driving ? st.tx : st.bx;
    const by = driving ? st.ty : st.by;

    // --- the camera: the settled follow view, clamped as the loop clamps it -------------------------------------
    const zoom = driving ? LOOP.driveZoom : 1;
    const cam = S.cam;
    Cam.followCam(cam, bx * ppm, by * ppm * tilt, SW, SH, zoom, Cam.FOLLOW_Y);
    let camX = cam[0];
    let camY = cam[1];
    const eastM = driving || bx > YW ? drawW : YW;
    Cam.zoomedBounds(cam, eastM * ppm, pxH, SW, SH, ins.left, ins.top, ins.right, ins.bottom, room, topPx, zoom, north !== null ? north * ppm * tilt : NaN, Cam.FOLLOW_Y);
    camX = Math.max(cam[0], Math.min(cam[1], camX));
    camY = Math.max(cam[2], Math.min(cam[3], camY));

    // --- the sprites of this frame (./frameLoop.ts, "the sprites of this frame") ------------------------------
    const V = S.view;
    V[0] = camX;
    V[1] = camY;
    V[2] = ppm;
    V[3] = tilt;
    V[4] = lift;
    V[5] = SW;
    V[6] = SH;
    V[7] = zoom;
    const D = S.D;
    const SHD = S.SHD;
    const L = S.L;
    D.n = 0;
    SHD.n = 0;
    L.n = 0;
    let actors = 0;
    let tested = 0;
    let runA = 0;
    for (let src = 0; src < 2; src++) {
      if (src === 1) runA = L.n;
      const Arr = src === 0 ? statics : Rv.items;
      for (let q = 0; q + ITEM - 1 < Arr.length; q += ITEM) {
        tested++;
        const alt = Arr[q + 10];
        const cell = alt >= 0 && Math.floor(clock / Arr[q + 11]) % 2 === 1 ? alt : Arr[q + 2];
        const n0 = L.n;
        A.addTo(Arr[q] === A.L_DECAL ? D : L, V, Arr[q + 1], cell, Arr[q + 3], Arr[q + 4], Arr[q + 5], Arr[q + 6], Arr[q + 7], Arr[q + 8], Arr[q + 9]);
        if (src === 0) {
          const r = roofOf[q / ITEM];
          if (r >= 0 && r < ROOF_MAX) S.roofL[r] = L.n > n0 ? n0 : -1;
        }
      }
    }
    const runB = L.n;
    const people: DrawnPerson[] = [];
    const vehicles: DrawnVehicle[] = [];
    const P = S.path;
    const o4 = S.o4;
    for (let hi = 0; hi < hPts.length; hi++) {
      const hp = hPts[hi];
      const len = hLen[hi];
      if (len <= 0) continue;
      const go = len / helperSpeed;
      const cyc = 2 * go + 3.2;
      const uu = (clock + hPhase[hi]) % cyc;
      const back = uu >= go + 1.6;
      const moving = (uu >= 1.6 && uu < go + 1.6) || uu >= go + 3.2;
      const dist = uu < 1.6 ? 0 : uu < go + 1.6 ? (uu - 1.6) * helperSpeed : uu < go + 3.2 ? len : Math.max(0, len - (uu - go - 3.2) * helperSpeed);
      A.along(o4, hp, hp.length / 2, len > 0 ? dist / len : 0);
      const h = moving ? A.heading4(back ? -o4[2] : o4[2], back ? -o4[3] : o4[3]) : 0;
      A.addTo(SHD, V, 0, T.shPerson, o4[0], o4[1], 0, 0, 1, -1, 1);
      A.personInto(L, V, T, 1, moving ? A.P_WALK : A.P_STAND, moving ? Math.floor(dist / LOOP.strideM) % 4 : 0, h, -1, -1, 0, T.vests[hi % 3], o4[0], o4[1], o4[1] + 0.25);
      actors++;
    }
    const VB = S.vb;
    const PV = S.pv;
    const VR = S.vr;
    VR.fill(-1);
    const f2 = S.f2;
    let nvb = 0;
    let seenV = 0;
    // The merchant's flatbed.
    const FB = Rv.flatbed;
    if (FB[3] !== 0 || FB[4] !== 0) {
      const ph = FB[0];
      let fx2 = FB[3];
      let fy2 = FB[4];
      let h4 = 1;
      let show = true;
      if (ph === 2) {
        show = M.flatbedAway(o4, S.tmp2, P, FB, Rv.flatbedPath, Rv.flatbedAt, tNow, LOOP.vehicleV);
        fx2 = o4[0];
        fy2 = o4[1];
        h4 = A.heading4(o4[2], o4[3]);
      }
      if (show) {
        A.addTo(SHD, V, 0, T.shFlatbed[h4], fx2, fy2, 0, 0, 1, -1, 1);
        const key = fy2 + 1;
        const i0 = L.n;
        if (ph === 1) {
          const span = FB[2] - FB[1];
          const u = span > 0 ? Math.max(0, Math.min(0.999, (tNow - FB[1]) / span)) : 0;
          A.addTo(L, V, key, T.flatbedWorking, fx2, fy2, 0, 0, T.flatbedWorkScale, -1, 1);
          if (FB[5] > 0) A.addTo(L, V, key + 1e-4, T.cargo[FB[5] - 1], fx2, fy2, T.cargoOff[8], T.cargoOff[9], T.flatbedWorkScale, -1, 1);
          A.addTo(L, V, key + 2e-4, T.crane[Math.floor(u * 3)], fx2, fy2, 0, 0, T.flatbedWorkScale, -1, 1);
        } else {
          A.addTo(L, V, key, T.flatbed[h4], fx2, fy2, 0, 0, T.vehicleScale, -1, 1);
          if (FB[5] > 0 && ph === 2) A.addTo(L, V, key + 1e-4, T.cargo[FB[5] - 1], fx2, fy2, T.cargoOff[h4 * 2], T.cargoOff[h4 * 2 + 1], T.flatbedWorkScale, -1, 1);
        }
        M.facing8(f2, h4 * 2);
        VR[3] = i0;
        VR[4] = L.n;
        VR[5] = nvb;
        vehicles.push({ kind: 'flatbed', slot: 1, x: fx2, y: fy2, o: nvb * VB_STRIDE });
        nvb = M.bodyInto(VB, nvb, PV, 1, fx2, fy2, f2[0], f2[1], VD[2], VD[3], dt, 0, VX, ph === 1 ? A.VBOX_FLATBED_WORKING * 32 : (A.VBOX_FLATBED * 8 + h4) * 4, key);
        seenV |= 2;
        actors++;
      }
    }
    // The public's car and trailer.
    const CA = Rv.car;
    if (M.carAt(o4, P, CA, pts.gate[0], pts.gate[1], tNow, LOOP.vehicleV)) {
      const h4 = A.heading4(o4[2], o4[3]);
      const tdx = h4 === 1 ? -2.75 * 40 : h4 === 3 ? 2.75 * 40 : 0;
      const tdy = h4 === 0 ? -2.75 * 28 : h4 === 2 ? 2.75 * 28 : 0;
      A.addTo(SHD, V, 0, T.shVan[h4], o4[0], o4[1], 0, 0, 1, -1, 1);
      A.addTo(SHD, V, 0, T.shTrailer[h4], o4[0], o4[1], 0, 0, 1, -1, 1);
      const nth = h4 === 2;
      const i0 = L.n;
      A.addTo(L, V, o4[1] + (nth ? 0.9 : 0.89), T.trailer[h4], o4[0], o4[1], tdx, tdy, T.vehicleScale, -1, 1);
      A.addTo(L, V, o4[1] + (nth ? 0.89 : 0.9), T.van[h4], o4[0], o4[1], 0, 0, T.vehicleScale, -1, 1);
      M.facing8(f2, h4 * 2);
      VR[6] = i0;
      VR[7] = L.n;
      VR[8] = nvb;
      vehicles.push({ kind: 'van', slot: 2, x: o4[0], y: o4[1], o: nvb * VB_STRIDE });
      nvb = M.bodyInto(VB, nvb, PV, 2, o4[0], o4[1], f2[0], f2[1], VD[4], VD[5], dt, 0, VX, (A.VBOX_VAN * 8 + h4) * 4, o4[1] + (nth ? 0.89 : 0.9));
      VR[9] = i0;
      VR[10] = L.n;
      VR[11] = nvb;
      vehicles.push({ kind: 'trailer', slot: 3, x: o4[0], y: o4[1], o: nvb * VB_STRIDE });
      nvb = M.bodyInto(VB, nvb, PV, 3, o4[0], o4[1], f2[0], f2[1], VD[6], VD[7], dt, 2.75, VX, (A.VBOX_TRAILER * 8 + h4) * 4, o4[1] + (nth ? 0.9 : 0.89));
      seenV |= 12;
      actors++;
    }
    // Purchases on their way.
    const AR = Rv.arrivals;
    const AN = A.ARRIVAL;
    for (let q = 0; q + AN - 1 < AR.length; q += AN) {
      const kind = AR[q];
      if (kind !== 0 && kind !== 1) continue;
      const ph = AR[q + 1];
      const span = AR[q + 7] - AR[q + 6];
      const u = span > 0 ? Math.max(0, Math.min(1, (tNow - AR[q + 6]) / span)) : 1;
      const h4 = M.arrivalAt(o4, S.tmp2, P, S.tA, AR, q, Rv.arrivalPath, Rv.arrivalAt, tNow);
      const ax = o4[0];
      const ay = o4[1];
      const i0 = L.n;
      if (kind === 0) {
        A.addTo(SHD, V, 0, T.shVan[h4], ax, ay, 0, 0, 1, -1, 1);
        A.addTo(L, V, ay + 0.9, T.van[h4], ax, ay, 0, 0, T.vehicleScale, -1, 1);
      } else {
        A.addTo(SHD, V, 0, T.shFlatbed[ph === 1 ? 1 : h4], ax, ay, 0, 0, 1, -1, 1);
        if (ph === 1) {
          A.addTo(L, V, ay + 1, T.flatbedWorking, ax, ay, 0, 0, T.flatbedWorkScale, -1, 1);
          A.addTo(L, V, ay + 1 + 2e-4, T.crane[Math.min(2, Math.floor(u * 3))], ax, ay, 0, 0, T.flatbedWorkScale, -1, 1);
        } else A.addTo(L, V, ay + 1, T.flatbed[h4], ax, ay, 0, 0, T.vehicleScale, -1, 1);
      }
      const slot = 4 + Math.min(3, q / AN);
      M.facing8(f2, (ph === 1 ? 1 : h4) * 2);
      VR[slot * 3] = i0;
      VR[slot * 3 + 1] = L.n;
      VR[slot * 3 + 2] = nvb;
      const abox = kind === 0 ? (A.VBOX_VAN * 8 + h4) * 4 : ph === 1 ? A.VBOX_FLATBED_WORKING * 32 : (A.VBOX_FLATBED * 8 + h4) * 4;
      vehicles.push({ kind: `arrival:${kind}`, slot, x: ax, y: ay, o: nvb * VB_STRIDE });
      nvb = M.bodyInto(VB, nvb, PV, slot, ax, ay, f2[0], f2[1], kind === 0 ? VD[4] : VD[2], kind === 0 ? VD[5] : VD[3], dt, 0, VX, abox, kind === 0 ? ay + 0.9 : ay + 1);
      seenV |= 1 << slot;
      actors++;
    }
    let truckDrawn: FrameDraw['truck'] = null;
    // The truck (frameLoop.ts: `const TM = works ? truckModelRow(T.models, Rv.truckModel) : T.models[0]`; the harness draws
    // with the switch off: row 0, today's arrays. A tree without the model table (ff064ce): its own arrays and truck block).
    if (truckOwned) {
      const TR = Rv.truck;
      const TM = T.models !== undefined ? T.models[0] : { body: T.truck, bare: T.truckBare, hook: T.truckHook, shadow: T.shTruck, skipLoad: T.skipLoad, scale: T.truckScale, vbox: A.VBOX_TRUCK, vboxBare: A.VBOX_TRUCK_BARE, vboxHook: A.VBOX_TRUCK_HOOK, half: [VD[0], VD[1]], hookFace: undefined as number | undefined };
      const hookFace = TM.hookFace;
      let tx = st.tx;
      let ty = st.ty;
      let h8 = A.heading8(st.ta);
      let hook = -1;
      const t4 = S.t4;
      if (!driving && M.truckAt(t4, S.tmp2, TR, Rv.truckPath, tNow, M.truckFrom(S.truckK, TR, Rv.truckAt, tNow, snap), Rv.truckAt)) {
        tx = t4[0];
        ty = t4[1];
        h8 = t4[2] === t4[2] ? t4[2] : S.face[0] === S.face[0] ? S.face[0] : TR[3];
        hook = t4[3];
      }
      // o4-world F2 (frameLoop.ts): the hook and tip frames' heading is wanted while they are; the turn is drawn first.
      if (hookFace !== undefined) {
        if (hook >= 0) h8 = hookFace;
        h8 = M.turnFacing(S.face, h8, clock, driving || snap);
        if (hook >= 0 && h8 !== hookFace) hook = -1;
      } else h8 = M.turnFacing(S.face, h8, clock, driving || snap || hook >= 0);
      let key = ty + 1;
      if (HS === HS && tx > YW - 3) {
        const ca = Math.abs(Math.sin((h8 * Math.PI) / 4));
        const sa = Math.abs(Math.cos((h8 * Math.PI) / 4));
        const northY = ty - (TM.half[0] * sa + TM.half[1] * ca);
        if (northY < HS) key = Math.min(key, northY);
      }
      const i0 = L.n;
      let tbox = (TM.vbox * 8 + h8) * 4;
      let pic = h8;
      const vehicleInto = (cell: number, shadow: number) => {
        A.addTo(SHD, V, 0, shadow, tx, ty, 0, 0, 1, -1, 1);
        A.addTo(L, V, key, cell, tx, ty, 0, 0, TM.scale, -1, 1);
      };
      if (hook >= 0) {
        vehicleInto(TM.hook[hook], TM.shadow[2]);
        tbox = TM.vboxHook * 32;
        pic = hookFace ?? h8;
      } else if (TR[4] === 0 && TM.bare[h8] >= 0) {
        vehicleInto(TM.bare[h8], TM.shadow[h8]);
        tbox = (TM.vboxBare * 8 + h8) * 4;
      } else if (TR[4] === 0 && (h8 === 2 || h8 === 1 || h8 === 3)) {
        vehicleInto(TM.hook[0], TM.shadow[2]);
        tbox = TM.vboxHook * 32;
        pic = hookFace ?? h8;
      } else {
        vehicleInto(TM.body[h8], TM.shadow[h8]);
        if (TR[10] >= 0) A.addTo(L, V, key + 1e-4, TM.skipLoad[TR[10]], tx, ty, T.skipTop[h8 * 2], T.skipTop[h8 * 2 + 1], T.vehicleScale, -1, 1);
      }
      if (driving) {
        f2[0] = Math.cos(st.ta);
        f2[1] = Math.sin(st.ta);
      } else M.facing8(f2, pic);
      VR[0] = i0;
      VR[1] = L.n;
      VR[2] = nvb;
      // `art`: the heading the drawn picture faces (the hook and tip frames' own: east); `h8`: the facing memory's.
      vehicles.push({ kind: 'truck', slot: 0, x: tx, y: ty, o: nvb * VB_STRIDE });
      truckDrawn = { h8, art: pic === h8 && (hook >= 0 || tbox === TM.vboxHook * 32) ? 2 : pic, hook };
      nvb = M.bodyInto(VB, nvb, PV, 0, tx, ty, f2[0], f2[1], TM.half[0], TM.half[1], dt, 0, VX, tbox, key);
      seenV |= 1;
      actors++;
    }
    S.nvb = nvb;
    for (let q = 0; q < VB_SLOTS; q++) {
      if ((seenV & (1 << q)) === 0) {
        PV[q * 2] = NaN;
        PV[q * 2 + 1] = NaN;
      }
    }
    // The crew.
    const CR = Rv.crew;
    const CN = A.CREW;
    const XY: number[] = [];
    for (let q = 0; q + CN - 1 < CR.length; q += CN) {
      const m = f.crew[q / CN];
      if (CR[q + 11] === 1) {
        people.push({ who: 'crew', id: m?.id ?? String(q / CN), role: m?.role ?? '', x: NaN, y: NaN, rx: NaN, ry: NaN, hidden: true });
        XY.push(NaN, NaN);
        continue;
      }
      const ph = CR[q + 10];
      const walking = ph === 1 || ph === 3;
      const ci = Math.min(63, q / CN);
      const u = M.crewAt(o4, P, CR, q, tNow, walking ? M.legStart(S.legK, ci, CR[q + 6], CR[q + 7], tNow, snap) : NaN);
      const rx = o4[0];
      const ry = o4[1];
      M.stepAside(f2, S.aside, ci, o4[0], o4[1], VB, nvb, dt, snap);
      o4[0] = f2[0];
      o4[1] = f2[1];
      const np = CR[q + 12] === CR[q + 12] ? 3 : 2;
      const carrier = CR[q + 8] > 0 ? CR[q + 8] - 1 : -1;
      let pose = CR[q + 1];
      const h = walking ? A.heading4(o4[2], o4[3]) : pose === A.P_POUR && B[6] === B[6] ? (B[6] >= o4[0] ? 1 : 3) : 0;
      let frame = Math.floor(clock / LOOP.workFrameS) % A.POSE_FRAMES[pose];
      if (walking) {
        pose = carrier >= 0 ? A.P_PUSH : A.P_WALK;
        frame = Math.floor((Math.max(0, Math.min(1, u)) * A.pathLen(P, np)) / LOOP.strideM) % 4;
      } else if (carrier >= 0 && pose === A.P_STAND) pose = A.P_PUSH;
      if (pose === A.P_PUSH && !walking) frame = 0;
      A.addTo(SHD, V, 0, T.shPerson, o4[0], o4[1], 0, 0, 1, -1, 1);
      if (carrier >= 0) A.addTo(SHD, V, 0, carrier === 0 ? T.shSack[h] : T.shTrolley[h], o4[0], o4[1], 0, 0, 1, -1, 1);
      A.personInto(L, V, T, 1, pose, frame, h, -1, carrier, CR[q + 9], T.vests[CR[q]] ?? -1, o4[0], o4[1], M.behindStanding(VB, nvb, o4[0], o4[1], o4[1] + 0.25));
      people.push({ who: 'crew', id: m?.id ?? String(q / CN), role: m?.role ?? '', x: o4[0], y: o4[1], rx, ry, hidden: false });
      XY.push(o4[0], o4[1]);
      actors++;
    }
    // The boss, on foot (standing: no stick).
    if (!driving) {
      const carrier = B[0] > 0 ? B[0] - 1 : -1;
      let pose = A.P_STAND;
      let frame = 0;
      let h = st.bh;
      if (B[3] >= A.P_FEED && B[3] !== A.P_PUSH) {
        pose = B[3];
        frame = Math.floor(clock / LOOP.workFrameS) % A.POSE_FRAMES[pose];
        if (B[4] === B[4]) h = A.heading4(B[4] - st.bx, B[5] - st.by);
        else if (pose === A.P_POUR && B[6] === B[6]) h = B[6] >= st.bx ? 1 : 3;
      } else if (B[6] === B[6] && Math.hypot(B[6] - st.bx, B[7] - st.by) < 3.5) {
        pose = A.P_POUR;
        h = B[6] >= st.bx ? 1 : 3;
      } else if (carrier >= 0) pose = A.P_PUSH;
      st.bh = h;
      A.addTo(SHD, V, 0, T.shPerson, st.bx, st.by, 0, 0, 1, -1, 1);
      if (carrier >= 0) A.addTo(SHD, V, 0, carrier === 0 ? T.shSack[h] : T.shTrolley[h], st.bx, st.by, 0, 0, 1, -1, 1);
      A.personInto(L, V, T, 0, pose, frame, h, carrier < 0 ? B[1] : -1, carrier, B[2], -1, st.bx, st.by, st.by + 0.25);
      people.push({ who: 'boss', id: 'boss', role: 'boss', x: st.bx, y: st.by, rx: st.bx, ry: st.by, hidden: false });
      actors++;
    }
    // A vehicle drawn after the boss and covering him is drawn see-through, eased.
    for (let q = 0; q < VB_SLOTS; q++) {
      const i0 = VR[q * 3];
      const covered = !driving && i0 >= 0 && M.vehicleCovers(VB, VR[q * 3 + 2] * VB_STRIDE, st.bx, st.by, st.by + 0.25, tilt, PB);
      const a = A.roofInk(S.vehA[q], covered, dt);
      S.vehA[q] = a;
      if (i0 >= 0 && a < 1) for (let i = i0; i < VR[q * 3 + 1] && i < L.n; i++) L.al[i] = L.al[i] * a;
    }
    // A roof over the boss or a crew member is drawn see-through, eased.
    for (let r = 0; r * A.ROOF < roofs.length && r < ROOF_MAX; r++) {
      let covered = !driving && A.underRoof(roofs, r, st.bx, st.by, st.by + 0.25, tilt, PB);
      for (let i = 0; !covered && i + 1 < XY.length; i += 2) {
        if (XY[i] === XY[i]) covered = A.underRoof(roofs, r, XY[i], XY[i + 1], XY[i + 1] + 0.25, tilt, PB);
      }
      const a = A.roofInk(S.roofA[r], covered, dt);
      S.roofA[r] = a;
      const li = S.roofL[r];
      if (li >= 0 && li < L.n) L.al[li] = L.al[li] * a;
    }

    // --- one picture: decals, shadows, then the sorted list in runs ------------------------------------------
    A.sortRuns(L, runA, runB);
    // o4-world F5 (frameLoop.ts): the hop pass, when the tree has it.
    const hopTests = hopRuns !== null ? hopRuns(L, rects, dens) : 0;
    const runD = countRuns(D, false);
    const runS = countRuns(SHD, false);
    const runL = countRuns(L, true);
    const rows = (Ls: DrawList, sorted: boolean) => {
      const out: number[][] = [];
      for (let i = 0; i < Ls.n; i++) {
        const it = sorted ? Ls.order[i] : i;
        out.push([Ls.cell[it], Ls.sx[it], Ls.sy[it], Ls.k[it], Ls.tint[it], Ls.al[it], Ls.key[it]]);
      }
      return out;
    };
    return {
      cost: {
        draws: runD + runS + runL,
        runs: { decal: runD, shadow: runS, sorted: runL },
        sprites: D.n + SHD.n + L.n,
        lists: { decal: D.n, shadow: SHD.n, sorted: L.n },
        actors,
        statics: tested,
        cam: [camX, camY, zoom],
        body: [bx, by, st.driving],
      },
      hopTests,
      truck: truckDrawn,
      decal: rows(D, false),
      shadow: rows(SHD, false),
      sorted: rows(L, true),
      people,
      vehicles,
      vb: VB,
      nvb,
      scene: Rv,
    };
  };
  void NO_ITEMS;
  return { yard, res, misses, unknown, statics, draw };
}

/**
 * The atlas draws of a list as ./frameLoop.ts drawRuns makes them: one per run of the same sheet and mirroring
 * (a sheet whose image exists: every sheet does here). Pure.
 */
export function countRuns(L: DrawList, sorted: boolean): number {
  let runs = 0;
  let runKey = -1;
  let start = 0;
  for (let i = 0; i < L.n; i++) {
    const it = sorted ? L.order[i] : i;
    const p = L.cell[it];
    const sheet = Math.floor(p / CELL_BASE);
    const rest = p - sheet * CELL_BASE;
    const rk = sheet * 2 + (rest & 1);
    if (rk !== runKey) {
      if (i > start && runKey >= 0) runs++;
      start = i;
      runKey = rk;
    }
  }
  if (L.n > start && runKey >= 0) runs++;
  return runs;
}

/** A packed cell back to its sprite id (`id#frame#heading`, with `~m` when mirrored), through the sheets' indices. */
export function cellNames(sheets: readonly SheetLike[]): (p: number) => string {
  const rev = sheets.map((s) => {
    const r: string[] = [];
    for (const [k, i] of Object.entries(s.index)) r[i] = k;
    return r;
  });
  return (p) => {
    const sheet = Math.floor(p / CELL_BASE);
    const rest = p - sheet * CELL_BASE;
    return `${rev[sheet]?.[rest >> 1] ?? `?${sheet}:${rest >> 1}`}${rest & 1 ? '~m' : ''}`;
  };
}
