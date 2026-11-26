/**
 * The yard's frame loop: ONE frame callback on the UI thread (docs/design/research/yard-tech.md B2;
 * yard-stage1.md 2.1, 3, 6; notes/lead-world.md).
 *
 * Each frame it reads the stick (./stick.ts), moves the boss or the truck (collision against the map's
 * solids and the rules' whole things, sliding along them, the lane east of the gate: ./collide.ts), eases
 * the camera after the body with a lead in the walking direction, a wider view while driving and a nudge
 * to the crucible at the first pour (./camera.ts keeps it inside the yard's margins), and draws the yard as
 * ONE recorded picture:
 *   1. ground decals (sheet G: pads, corner marks, the lane's asphalt and verges, chalk circles), one
 *      atlas draw, in list order (nothing on them can be covered by them);
 *   2. the actors' shadows (the world's sheet S, ./useYard.ts), one atlas draw;
 *   3. everything that stands or walks (people, things, pieces, machines, stock, vehicles, buildings),
 *      depth-sorted by its footprint's south edge and drawn in RUNS of the same sheet (and the same
 *      mirroring): one atlas draw per run (the lead's ruling: at most twelve a frame; the development
 *      panel shows the count).
 * The ground tile itself is the canvas's textured rectangle under the picture (./YardView.tsx).
 *
 * THE WORLD AND THE SCREEN ARE KEPT APART: this loop owns smooth motion (the boss's and the driven truck's
 * places live here and are never saved) and only PICTURES the rest: crew members are drawn along the leg
 * the rules gave them (from, to, t0, t1: ./actors.ts rulesScene), the driver's trips, the merchant's
 * flatbed on its round and the public's car between the times the frame gives. Nothing here decides
 * anything: the rules get a presence sample ({x, y, driving, moving, standingFor}) at most ten times a
 * second and push back what they decided (./useRulesTable.ts).
 *
 * The loop runs while the window is landscape and the app is in the foreground; an overlay or a card over
 * the yard only stops the steering (the `active` option): the rules keep running beneath it and the boss
 * stands (yard-stage1.md 2.8). Code in here runs on the UI thread: it calls only worklets and Skia host
 * methods (npm run lint:worklets).
 */
import { BlendMode, FilterMode, MipmapMode, Skia, createPicture, type SkCanvas, type SkColor, type SkHostRect, type SkImage, type SkPicture, type SkRSXform } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { makeMutable, runOnJS, useFrameCallback, useSharedValue, type FrameInfo, type SharedValue } from 'react-native-reanimated';
import { salvageActions } from '../../../modes/salvage/actions';
import { YARD } from '../art/palette';
import { yardSound } from '../hud/pump';
import { useGame } from '../../../state/store';
import * as R from '../../../engine/salvage';
import { ARRIVAL, ITEM, PATH_MAX, L_DECAL, NO_SCENE, POSE_FRAMES, P_FEED, P_POUR, P_PUSH, P_STAND, P_WALK, ROOF, actorTable, addTo, along, entryOf, heading4, heading8, makeListW, makeResolver, pathLen, personBox, personInto, presortItems, roofInk, roofTable, sortRuns, staticItems, underRoof, type DrawList, type RulesScene } from './actors';
import { VB_SLOTS, VB_STRIDE, arrivalAt, bodyInto, bossDriveV, carAt, crewAt, facing8, flatbedAway, legStart, makeClock, pressGetIn, rulesClock, stepAside, truckAt, truckFrom, turnFacing } from './motion';
import { EDGE_ROOM_M, FOLLOW_Y, cameraBounds, followCam, zoomedBounds } from './camera';
import { heroCam } from './heroFrame';
import { blocked, moveBody, nearestAct } from './collide';
import { DEAD, STAND_MS, STICK_R, presenceStep, stick } from './stick';
import { useYardArt, type YardArt } from './useYard';
import { rulesItems } from './useRulesTable';
import type { SpriteSheet } from './atlas';
import type { YardLayout } from './yard';

/** The ground work's name for what the rules push (./actors.ts RulesScene). */
export type RulesTable = RulesScene;
export const NO_RULES: RulesTable = NO_SCENE;

/** The numbers of the body and the camera the loop needs (from the config; `feel.*` where content has them). */
export interface Motion {
  walk: number;
  workerR: number;
  reach: number;
  drive: number;
  truckR: number;
  enter: number;
  helperSpeed: number;
  /** Seconds of lead the camera looks ahead of the body. */
  lead: number;
  /** Seconds the camera takes to catch up (time constant). */
  ease: number;
}

/** Feel values the content does not carry yet (requests.md [world-a] content: feel.*); D12: measured. */
export const FEEL = {
  /** The view while driving: this zoom (a wider view: 30 points a metre against 40 on foot; L7). */
  driveZoom: 0.75,
  /** Seconds the camera eases its zoom. */
  zoomEase: 0.45,
  /** Seconds the camera looks at the crucible at the first pour. */
  pourNudge: 2.5,
  /** Metres between two foot contacts (the step sound). */
  stepM: 0.7,
  /** Metres a second of the pictured vehicles (the flatbed, the public's car, the driver's truck between legs). */
  vehicleV: 6,
  /** Metres of walk per walk-cycle frame. */
  strideM: 0.35,
  /** Seconds per frame of a work pose and of a working machine's alternation. */
  workFrameS: 0.28,
} as const;

export interface FrameStats {
  /** Frames a second over the last five seconds, the worst frame time (ms) in them, actors, sprites drawn, atlas draws. */
  fps: number;
  worstMs: number;
  actors: number;
  sprites: number;
  runs?: number;
}

export interface YardAnim {
  /** The recorded picture of the frame (./YardView.tsx draws it). */
  pic: SharedValue<SkPicture>;
  /** The ground's transform (the camera, with its zoom about the screen centre). */
  ground: SharedValue<any[]>;
  /**
   * camX, camY in points before the zoom and the zoom (1 on foot, FEEL.driveZoom driving, eased). A world
   * point (wx, wy) is on screen at ((wx*ppm - x - SW/2)*zoom + SW/2, (wy*ppm*tilt - y - SH/2)*zoom + SH/2):
   * the look's parallax derives from it.
   */
  camera: SharedValue<{ x: number; y: number; zoom: number }>;
  /** The screen y of the back wall's ground line (content map.north) this frame; NaN without one. */
  northSy: SharedValue<number>;
  /** The boss's place in metres each frame (driving: the truck's). */
  body: SharedValue<{ x: number; y: number; driving: number }>;
  /** The interactable the body stands next to (index into yard.acts), -1 none. */
  near: SharedValue<number>;
  stats: SharedValue<FrameStats>;
  /** Set to 1 by the "Step out" button; the loop clears it when the boss is out. */
  exit: SharedValue<number>;
  /**
   * owner2 item 1 (ruling 18.4): set to 1 by the one button in its "Get in" mode; the loop clears it on the next
   * frame and seats him when he is on foot within reach of the free truck (./motion.ts pressGetIn), else does nothing.
   */
  enter: SharedValue<number>;
  /** owner1 H6: where each crew member of the frame's list is drawn this frame (x, y metres per member, in the frame's order; NaN: not drawn). The idle tags follow it. */
  crew: SharedValue<number[]>;
  capacity: number;
}

/** What the loop tells the sound pump (src/ui/salvage/hud/pump.ts `yardSound`; requests.md). */
export interface YardSoundFacts {
  step: (ground: string) => void;
  truck: (share: number | null) => void;
}

const ST = 40;
const CAP_DECAL = 420;
const CAP_SHADOW = 140;
const CAP_SORT = 1000;
const CAP = CAP_DECAL + CAP_SHADOW + CAP_SORT;
const CELL_BASE = 2_000_000;
/** owner1 phone 4: the smallest change of the camera (points) and of a position (metres) worth a shared-value write. */
const CAM_EPS_PX = 0.05;
const MOVE_EPS_M = 0.01;
const NO_ITEMS: number[] = [];
const NO_LANE: number[] = [];

/** What the frame draws with, set once per bake (H8): the host-object pools, the paint, the statics and the sheets. */
interface DrawKit {
  X: SkRSXform[];
  RC: SkHostRect[];
  C: SkColor[];
  paint: ReturnType<typeof Skia.Paint>;
  statics: number[];
  T: ReturnType<typeof actorTable>;
  images: (SkImage | null)[];
  rects: number[][];
  dens: number[];
  /** owner1 play 1: the roofs (actors.ts roofTable), each static item's roof (-1 none), a person's drawn box. */
  roofs: number[];
  roofOf: number[];
  PB: number[];
  /** owner1 play 2: half length and half width of the truck, the flatbed, the van, its trailer (metres, the manifest's footprints). */
  VD: number[];
}

/** A vehicle sprite and its shadow. */
function vehicleInto(L: DrawList, SH: DrawList, V: Float64Array, cell: number, shadow: number, scale: number, wx: number, wy: number, key: number): void {
  'worklet';
  addTo(SH, V, 0, shadow, wx, wy, 0, 0, 1, -1, 1);
  addTo(L, V, key, cell, wx, wy, 0, 0, scale, -1, 1);
}

/** The sampling of every atlas draw (one object for every run, not one a run). */
const SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.None };

/** The arrays an atlas run hands drawAtlas, kept from frame to frame (owner2 item 3: no three slices a run). */
interface RunPool {
  x: SkRSXform[][];
  r: SkHostRect[][];
  c: SkColor[][];
}

/**
 * The pool's array `i`, holding `n` entries of `src` from `from` (its length set, its entries replaced). Skia
 * copies what drawAtlas is given while it records (JsiSkCanvas, native and web), so the array is free again
 * once the call returns; the host objects in it are the kit's, never freed here.
 */
function runArray<T>(pool: T[][], i: number, src: T[], from: number, n: number): T[] {
  'worklet';
  let a = pool[i];
  if (a === undefined) {
    a = [];
    pool[i] = a;
  }
  a.length = n;
  for (let j = 0; j < n; j++) a[j] = src[from + j];
  return a;
}

/** One run [start, end) of a list: one drawAtlas (mirrored runs inside a canvas flipped about x = 0). Returns 1 when drawn. */
function flushRun(cv: SkCanvas, L: DrawList, start: number, end: number, runKey: number, X: SkRSXform[], RC: SkHostRect[], C: SkColor[], images: (SkImage | null)[], paint: ReturnType<typeof Skia.Paint>, PO: RunPool, pi: number): number {
  'worklet';
  if (end <= start || runKey < 0) return 0;
  const img = images[runKey >> 1];
  if (!img) return 0;
  const from = L.base + start;
  const n = end - start;
  const mirror = (runKey & 1) === 1;
  if (mirror) {
    cv.save();
    cv.scale(-1, 1);
  }
  cv.drawAtlas(img, runArray(PO.r, pi, RC, from, n), runArray(PO.x, pi, X, from, n), paint, BlendMode.Modulate, runArray(PO.c, pi, C, from, n), SAMPLING);
  if (mirror) cv.restore();
  return 1;
}

/**
 * Draws a list in runs of the same sheet and mirroring: fills the pools at the list's base and calls
 * drawAtlas once per run. `pi` is the first pool slot this list may use (the frame's runs so far). Returns
 * the number of draws.
 */
function drawRuns(cv: SkCanvas, L: DrawList, sorted: boolean, X: SkRSXform[], RC: SkHostRect[], C: SkColor[], images: (SkImage | null)[], rects: number[][], dens: number[], paint: ReturnType<typeof Skia.Paint>, PO: RunPool, pi: number): number {
  'worklet';
  let runs = 0;
  let start = 0;
  let runKey = -1;
  for (let i = 0; i < L.n; i++) {
    const it = sorted ? L.order[i] : i;
    const p = L.cell[it];
    const sheet = Math.floor(p / CELL_BASE);
    const rest = p - sheet * CELL_BASE;
    const cell = rest >> 1;
    const mirror = rest & 1;
    const rk = sheet * 2 + mirror;
    if (rk !== runKey) {
      runs += flushRun(cv, L, start, i, runKey, X, RC, C, images, paint, PO, pi + runs);
      start = i;
      runKey = rk;
    }
    const r = rects[sheet];
    const o = cell * 6;
    const kk = L.k[it] / dens[sheet];
    const x = mirror === 1 ? -L.sx[it] : L.sx[it];
    X[L.base + i].set(kk, 0, x - r[o + 4] * kk, L.sy[it] - r[o + 5] * kk);
    RC[L.base + i].setXYWH(r[o], r[o + 1], r[o + 2], r[o + 3]);
    const c = C[L.base + i];
    const a = L.al[it];
    const t = L.tint[it];
    // An atlas colour is UNPREMULTIPLIED (Skia premultiplies it): the alpha goes in c[3] only. (Before owner1
    // play 1 the rgb was scaled by it too: a sprite at a third of its ink came out dark, not see-through.)
    if (t < 0) {
      c[0] = 1;
      c[1] = 1;
      c[2] = 1;
    } else {
      c[0] = ((t >> 16) & 255) / 255;
      c[1] = ((t >> 8) & 255) / 255;
      c[2] = (t & 255) / 255;
    }
    c[3] = a;
  }
  runs += flushRun(cv, L, start, L.n, runKey, X, RC, C, images, paint, PO, pi + runs);
  return runs;
}

/** The ground work's sprite ids: gone (the yard draws the manifest by id). Kept so old callers compile. */
export type SpriteIds = Record<string, never>;
export function spriteIds(_y: YardLayout, _sheet: SpriteSheet | null, _sig: (i: number) => string): SpriteIds {
  return {};
}
/** The ground work's buffer size (kept for old callers): the pools' size now. */
export function bufferSize(_y?: YardLayout, _capacity?: number): number {
  return CAP;
}

function useAppActive(): boolean {
  const [on, setOn] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setOn(s !== 'background'));
    return () => sub.remove();
  }, []);
  return on;
}

const IS_WEB = Platform.OS === 'web';

export function useYardLoop(opts: {
  yard: YardLayout;
  /** Ignored (the ground work's single sheet); the loop reads the baked manifest itself. */
  sheet?: SpriteSheet | null;
  ids?: SpriteIds;
  motion: Motion;
  rules: SharedValue<RulesTable>;
  capacity?: number;
  width: number;
  height: number;
  /** May the stick steer (no overlay, no card over the yard). The loop itself runs while landscape and in the foreground. */
  active: boolean;
  measure: boolean;
  /** The safe area's insets, points: the camera keeps a body at the yard's edge inside them. */
  insets: { left: number; top: number; right: number; bottom: number };
  /** The presence sample: `moving` is 1 while the stick is held past its dead zone; standingFor seconds still. */
  /** `heading`: the truck's heading, one of eight, while he drives; -1 on foot (the rules keep theirs). */
  onSample: (act: number, x: number, y: number, driving: number, moving: number, standingFor?: number, heading?: number) => void;
  onDriving: (driving: boolean) => void;
  /** The sound pump's facts; absent: the hud's pump (src/ui/salvage/hud/pump.ts yardSound). */
  sound?: YardSoundFacts;
}): YardAnim {
  const { yard, motion, rules, width: SW, height: SH, active: steer, measure, onSample, onDriving } = opts;
  const { left: inL, top: inT, right: inR, bottom: inB } = opts.insets;
  const appActive = useAppActive();
  const run = SW > SH && appActive;
  const art: YardArt | null = useYardArt(yard);
  const cfg = useGame((s) => s.cfg);
  const content = R.isSalvage(cfg) ? cfg.salvage : null;

  // What the art and the map give, resolved once per bake.
  const baked = useMemo(() => {
    if (!art || !content) return null;
    const res = makeResolver(art.sheets);
    // Presorted once (./actors.ts presortItems): the frame merges them instead of sorting them (sortRuns).
    const statics = presortItems(staticItems(content, res, yard.props.filter((p) => p.id.startsWith('stress-')), yard.dressing));
    const T = actorTable(res, { hand: YARD.vestYardHand, cutter: YARD.vestCutter, driver: YARD.vestDriver });
    const images = art.sheets.map((s) => (s ? s.image : null));
    const rects = art.sheets.map((s) => (s ? s.rects : []));
    const dens = art.sheets.map((s) => (s ? s.density : 1));
    const roofs = roofTable(content, statics, res, yard.tilt);
    const roofOf = new Array(Math.floor(statics.length / ITEM)).fill(-1);
    for (let r = 0; r * ROOF < roofs.length; r++) roofOf[roofs[r * ROOF + 5]] = r;
    const half = (id: string, w: number, d: number) => {
      const f = entryOf(id)?.footprint;
      return [(f?.w ?? w) / 2, (f?.d ?? d) / 2];
    };
    const VD = [...half('vehicle.truck', 4.6, 2), ...half('vehicle.flatbed', 4.6, 2), ...half('vehicle.van', 3.4, 1.8), ...half('vehicle.trailer', 1.6, 1.3)];
    return { statics, T, images, rects, dens, roofs, roofOf, PB: personBox(), VD };
  }, [art, content, yard]);

  // H8: the pools, the statics and the sheets live in ONE shared value, set once per bake, so the frame
  // worklet's closure never carries (and re-serialises) thousands of host objects; the steering switch and
  // the insets are shared values too. The worklet is built once per bake and screen size.
  const empty = useMemo(() => createPicture(() => {}), []);
  const draw = useMemo(() => makeMutable<DrawKit | null>(null), []);
  useEffect(() => {
    if (!baked) {
      draw.value = null;
      return;
    }
    draw.value = {
      X: Array.from({ length: CAP }, () => Skia.RSXform(0, 0, 0, 0)),
      RC: Array.from({ length: CAP }, () => Skia.XYWHRect(0, 0, 1, 1)),
      C: Array.from({ length: CAP }, () => Skia.Color('white')),
      paint: Skia.Paint(),
      ...baked,
    };
  }, [baked, draw]);
  const ctl = useSharedValue({ steer: steer ? 1 : 0, inL, inT, inR, inB });
  useEffect(() => {
    ctl.value = { steer: steer ? 1 : 0, inL, inT, inR, inB };
  }, [ctl, steer, inL, inT, inR, inB]);
  // H16: the presence sample goes through a ref; after a stall only the newest one is applied.
  const sampleTo = useRef(onSample);
  sampleTo.current = onSample;
  const drivingTo = useRef(onDriving);
  drivingTo.current = onDriving;
  const pending = useRef<{ s: number[] | null; due: boolean }>({ s: null, due: false });
  const sampleJS = useCallback((act: number, x: number, y: number, driving: number, moving: number, standingFor: number, heading: number) => {
    const p = pending.current;
    p.s = [act, x, y, driving, moving, standingFor, heading];
    if (p.due) return;
    p.due = true;
    setTimeout(() => {
      p.due = false;
      const q = p.s;
      p.s = null;
      if (q) sampleTo.current(q[0], q[1], q[2], q[3], q[4], q[5], q[6]);
    }, 0);
  }, []);
  // Getting in is never dropped: the rules hear one exact sample AT THE TRUCK'S PLACE with the cab flag (they seat
  // by the flag only at the door: engine actions.ts setPresence). An older sample still waiting goes FIRST, now
  // (owner2: after Step out it is the on-foot sample that tells the rules he left the wheel; dropped, the entering
  // sample could equal the presence Step out left and be taken for the same sample), never after it.
  const enterRules = useCallback((x: number, y: number, moving: number, heading: number) => {
    const q = pending.current.s;
    pending.current.s = null;
    if (q) sampleTo.current(q[0], q[1], q[2], q[3], q[4], q[5], q[6]);
    sampleTo.current(0, x, y, 1, moving, 0, heading);
  }, []);
  const drivingJS = useCallback((on: boolean) => drivingTo.current(on), []);
  const pic = useSharedValue<SkPicture>(empty);
  const ground = useSharedValue<any[]>([{ translateX: 0 }, { translateY: 0 }]);
  // zoom -1 until the first frame writes it (writes happen only on a change: owner1 phone 4; readers take zoom <= 0 as 1).
  const camera = useSharedValue({ x: 0, y: 0, zoom: -1 });
  const northSy = useSharedValue(NaN);
  const body = useSharedValue({ x: 0, y: 0, driving: 0 });
  const near = useSharedValue(-1);
  const stats = useSharedValue<FrameStats>({ fps: 0, worstMs: 0, actors: 0, sprites: 0, runs: 0 });
  const exit = useSharedValue(0);
  const enter = useSharedValue(0);
  const crewXY = useSharedValue<number[]>([]);
  const scratch = useSharedValue<any>(null);

  const sound = opts.sound ?? yardSound;
  const soundStep = useCallback((g: string) => sound.step(g), [sound]);
  const soundTruck = useCallback((s: number) => sound.truck(s < 0 ? null : s), [sound]);
  // The rules' answer to the world's Step out: its number twice, plus one when the rules have him on foot.
  const seatAck = useSharedValue(0);
  const stepOutRules = useCallback(
    (seq: number, x: number, y: number, heading: number) => {
      // The rules hear exactly what the world did: at the wheel and standing still here (no older sample may
      // follow and seat him again), then out; whether they agree goes back to the frame loop.
      let ok = 0;
      try {
        pending.current.s = null;
        sampleTo.current(0, x, y, 1, 0, 0, heading);
        salvageActions.stepOut({ x, y, heading });
        const g = useGame.getState().game as R.SalvageGame | undefined;
        ok = g?.salvage?.truck.by === 'boss' ? 0 : 1;
      } finally {
        seatAck.value = seq * 2 + ok;
      }
    },
    [seatAck],
  );
  useEffect(() => {
    if (!run) sound.truck(null);
  }, [run, sound]);

  const { solids, acts, helpers, ppm, tilt, lift, width: YW, depth: YD, pxH, workerStart, truckStart, lane, drawW, pts } = yard;
  const pxW = drawW * ppm;
  const hPts = useMemo(() => helpers.map((h) => h.pts), [helpers]);
  const hLen = useMemo(() => helpers.map((h) => h.length), [helpers]);
  const hPhase = useMemo(() => helpers.map((h) => h.phase), [helpers]);
  const topPx = (1.95 * lift + 0.4 * tilt + 0.1) * ppm + 8;
  const room = EDGE_ROOM_M * ppm;
  const north = yard.northFace;
  const wallY = yard.north ?? NaN;
  const bossV = content && typeof (content.truck as { bossV?: unknown }).bossV === 'number' ? (content.truck as unknown as { bossV: number }).bossV : motion.drive;
  // owner1 V3: the boss's truck inside the fence at most truck.bossYardV (absent: bossV everywhere).
  const bossYardV = content && typeof (content.truck as { bossYardV?: unknown }).bossYardV === 'number' ? Math.min(bossV, (content.truck as unknown as { bossYardV: number }).bossYardV) : bossV;
  // owner2 item 2: while he stands still a sample every standMs (never slower than the rules' staleS / 2), and one
  // on the frame his standing reaches feel.workDelay (an act that waits for it can start then).
  const staleS = content ? content.feel.staleS : NaN;
  const standMs = staleS > 0 ? Math.min(STAND_MS, (staleS * 1000) / 2) : 100;
  const workDelay = content ? content.feel.workDelay : NaN;

  const onFrame = useCallback(
    (info: FrameInfo) => {
      'worklet';
      let S = scratch.value;
      if (S === null) {
        const st = new Float64Array(ST);
        st[0] = workerStart.x;
        st[1] = workerStart.y;
        st[2] = truckStart.x;
        st[3] = truckStart.y;
        st[6] = 1;
        st[12] = info.timestamp;
        st[24] = 1;
        st[31] = NaN;
        st[32] = NaN;
        st[33] = NaN;
        S = { st, D: makeListW(CAP_DECAL, 0), SHD: makeListW(CAP_SHADOW, CAP_DECAL), L: makeListW(CAP_SORT, CAP_DECAL + CAP_SHADOW), buckets: new Float64Array(15), cam: [0, 0, 0, 0], out: [0, 0], o4: [0, 0, 0, 0], path: new Array(PATH_MAX * 2).fill(0), view: new Float64Array(8), lastR: null, pics: [], pres: new Float64Array([0, 0, 0, 0, NaN, NaN, NaN]), xy: [] as number[], runPool: { x: [], r: [], c: [] }, clk: makeClock(), face: [NaN, 0], t4: [0, 0, 0, 0], tmp2: [0, 0, 0, 0], legK: new Float64Array(2 * 64), tA: new Array(PATH_MAX).fill(0), truckK: [NaN, NaN, NaN], vb: new Float64Array(12 * VB_STRIDE), pv: new Float64Array(VB_SLOTS * 2).fill(NaN), aside: new Float64Array(128), f2: [0, 0, 0, 0], roofL: new Int32Array(16).fill(-1), roofA: new Float64Array(16).fill(1) };
        scratch.value = S;
      }
      const st = S.st;
      const K = draw.value;
      const statics = K !== null ? K.statics : NO_ITEMS;
      const roofOf = K !== null ? K.roofOf : NO_ITEMS;
      const T = K !== null ? K.T : null;
      const ctv = ctl.value;
      const steer = ctv.steer === 1;
      const ms = info.timeSincePreviousFrame ?? 16.7;
      const dt = Math.min(0.05, Math.max(0, ms / 1000));
      st[18] += dt;
      const clock = st[18];
      const Rv = rules.value;
      const out = S.out;
      const fresh = Rv !== S.lastR;
      if (fresh) S.lastR = Rv;
      // The rules' play time to draw at: a clock that runs at the display's rate, steered towards the tables
      // as they come, never re-anchored by an ordinary tick and never frozen by a late one (./motion.ts).
      const tNow = rulesClock(S.clk, fresh, Rv.t, Rv.epoch, info.timestamp, dt);

      // --- the stick: a direction and a share of full speed (none while an overlay is open) ---------------
      const s = stick.value;
      let ux = 0;
      let uy = 0;
      if (steer && s.on === 1) {
        const m = Math.sqrt(s.kx * s.kx + s.ky * s.ky) / STICK_R;
        if (m > DEAD) {
          const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / (m * STICK_R);
          ux = s.kx * k;
          uy = s.ky * k;
        }
      }
      const steering = ux !== 0 || uy !== 0;
      // An epoch change (a preset, the away pass, a reload) snaps the boss to where the rules have him.
      const B = Rv.boss;
      const truckOwned = Rv.truck[0] === 1;
      const truckBusy = Rv.truck[5] === 2 || Rv.truck[6] >= 0;
      let snap = false;
      const byBoss = truckOwned && Rv.truck[5] === 1;
      if (Rv.n > 0 && Rv.epoch !== st[33]) {
        st[33] = Rv.epoch;
        snap = true;
        st[35] = 0;
        st[37] = 0;
        if (byBoss) {
          // The rules have the boss in the truck (a preset, a reload): in the cab, where the truck stands.
          st[5] = 1;
          st[6] = 0;
          st[2] = Rv.truck[1];
          st[3] = Rv.truck[2];
          st[4] = Math.PI / 2 - (Rv.truck[3] * Math.PI) / 4;
          runOnJS(drivingJS)(true);
        } else {
          if (st[5] === 1) {
            // The rules have him on foot (time away gave the truck to the driver): out of the cab.
            st[5] = 0;
            st[6] = 0;
            runOnJS(soundTruck)(-1);
          }
          // Said on every snap: the screens' flag may be a mount old (the shell no longer resets it itself).
          runOnJS(drivingJS)(false);
          if (B[9] === B[9] && B[10] === B[10]) {
            // Where the rules have him, pushed out of anything solid he would stand inside (a body never does).
            moveBody(out, B[9], B[10], 0, 0, motion.workerR, solids, YW, YD, 0, 0, 0, Rv.solids, lane);
            st[0] = out[0];
            st[1] = out[1];
            st[8] = B[11] >= 0 && B[11] < 4 ? B[11] : 0;
          }
          // Beside the truck at a snap (a remount just after Step out): the door is armed only once he has walked away.
          if (truckOwned) {
            const ddx = st[0] - Rv.truck[1];
            const ddy = st[1] - Rv.truck[2];
            if (ddx * ddx + ddy * ddy < (motion.enter + 0.8) * (motion.enter + 0.8)) st[6] = 0;
          }
        }
      }
      // The truck stands where the rules last put it (synced when the rules move it), unless the boss holds it:
      // in the world's cab, or in the rules' (then the place the world shows is the one the rules are told).
      if (st[5] !== 1 && !truckBusy && !byBoss && (snap || Rv.truck[1] !== st[31] || Rv.truck[2] !== st[32])) {
        st[31] = Rv.truck[1];
        st[32] = Rv.truck[2];
        if (Rv.n > 0 && truckOwned) {
          st[2] = Rv.truck[1];
          st[3] = Rv.truck[2];
          // The angle he drove at stays when it rounds to the rules' heading (one of eight): no turn at Step out.
          const h8w = ((Math.round((Math.PI / 2 - st[4]) / (Math.PI / 4)) % 8) + 8) % 8;
          if (snap || h8w !== Rv.truck[3]) st[4] = Math.PI / 2 - (Rv.truck[3] * Math.PI) / 4;
        }
      }
      // --- who sits in the cab: the world and the rules agree (the owner's review, point 5) -----------------
      // The world flips at once (the stick answers within a frame) and the rules hear it in the next sample
      // (its cab flag seats him: engine hand.ts seatByFlag). What the rules decide comes back here: st[35] is
      // the world's own Step out waiting for the rules (1: for their answer, seatAck; 2: for a table that
      // says so), st[37] a forced step down this frame.
      let entered = false;
      if (st[35] === 1) {
        const ack = seatAck.value;
        if (Math.floor(ack / 2) === st[36]) {
          if (ack % 2 === 1) st[35] = 2;
          else {
            // The rules kept him at the wheel: back in the cab (the truck has not moved).
            st[35] = 0;
            st[5] = 1;
            st[6] = 0;
            runOnJS(drivingJS)(true);
          }
        }
      }
      if (st[35] === 2 && !byBoss) st[35] = 0;
      if (!snap && st[35] === 0) {
        if (st[5] === 0 && byBoss) {
          // The rules seated him (the truck pulled up beside him; he stopped within its reach): into the cab.
          // The truck stays where the world shows it unless that is nowhere near the rules' place.
          const ex = Rv.truck[1] - st[2];
          const ey = Rv.truck[2] - st[3];
          if (!(ex * ex + ey * ey <= 16)) {
            st[2] = Rv.truck[1];
            st[3] = Rv.truck[2];
            st[4] = Math.PI / 2 - (Rv.truck[3] * Math.PI) / 4;
          }
          st[5] = 1;
          st[6] = 0;
          entered = true;
          runOnJS(drivingJS)(true);
        } else if (st[5] === 1 && truckOwned && truckBusy) {
          // The truck left with the driver before the rules heard the boss was in it: he steps down.
          st[37] = 1;
        }
      }
      // owner2 item 1 (ruling 18.4): the one button GETS IN. A press ("Get in") is cleared on the next frame; it
      // seats him exactly as walking in does when he is on foot within reach of the free truck, no Step out waits
      // for the rules and the stick may steer (no overlay); the rules hear the entering sample at the door below.
      if (enter.value !== 0) {
        enter.value = 0;
        if (pressGetIn(st, Rv.truck, steer, motion.enter)) {
          entered = true;
          runOnJS(drivingJS)(true);
        }
      }
      const driving = st[5] === 1;
      const speed = driving ? bossDriveV(st[2], YW, bossYardV, bossV) : motion.walk;
      const vx = ux * speed;
      const vy = uy * speed;
      st[16] = vx;
      st[17] = vy;
      if (!driving) {
        const truckSolid = truckOwned && !truckBusy;
        // On foot the boss stays inside the fence (L12): the lane takes him only when he is already out on it (stepped out of the truck there).
        moveBody(out, st[0], st[1], vx * dt, vy * dt, motion.workerR, solids, YW, YD, st[2], st[3], truckSolid ? motion.truckR * 0.85 : 0, Rv.solids, st[0] > YW - motion.workerR ? lane : NO_LANE);
        const moved = Math.sqrt((out[0] - st[0]) * (out[0] - st[0]) + (out[1] - st[1]) * (out[1] - st[1]));
        st[0] = out[0];
        st[1] = out[1];
        if (steering) {
          st[8] = heading4(vx, vy);
          st[7] += Math.max(moved, speed * dt * 0.35);
          st[22] += moved;
          if (st[22] >= FEEL.stepM) {
            st[22] -= FEEL.stepM;
            runOnJS(soundStep)(st[0] > YW ? 'asphalt' : 'concrete');
          }
        } else st[7] = 0;
        // Into the truck by walking up to it (armed again once the boss has walked away from it).
        if (truckOwned && !truckBusy) {
          const dx = st[0] - st[2];
          const dy = st[1] - st[3];
          const d = Math.sqrt(dx * dx + dy * dy);
          if (st[6] === 1 && d < motion.enter && steering && st[35] === 0) {
            st[5] = 1;
            entered = true;
            runOnJS(drivingJS)(true);
          } else if (st[6] === 0 && d > motion.enter + 0.8) st[6] = 1;
        }
      } else {
        moveBody(out, st[2], st[3], vx * dt, vy * dt, motion.truckR, solids, YW, YD, 0, 0, 0, Rv.solids, lane);
        const moved = Math.hypot(out[0] - st[2], out[1] - st[3]);
        st[2] = out[0];
        st[3] = out[1];
        st[25] = clock;
        if (steering) {
          const want = Math.atan2(vy, vx);
          let dh = want - st[4];
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          const turn = 7 * dt;
          st[4] += Math.max(-turn, Math.min(turn, dh));
        }
        if (info.timestamp - st[23] >= 250) {
          st[23] = info.timestamp;
          runOnJS(soundTruck)(dt > 0 ? Math.min(1, moved / dt / bossV) : 0);
        }
        // Step out (the button; or the truck left with the driver, st[37]): beside the truck, on the first free side.
        if (exit.value === 1 || st[37] === 1) {
          const forced = st[37] === 1;
          st[37] = 0;
          exit.value = 0;
          const r = motion.truckR + motion.workerR + 0.25;
          const h = st[4];
          let placed = false;
          for (let k = 0; k < 4 && !placed; k++) {
            const a = h + Math.PI / 2 + k * (Math.PI / 2);
            const cx = st[2] + Math.cos(a) * r;
            const cy = st[3] + Math.sin(a) * r;
            if (!blocked(cx, cy, motion.workerR, solids, YW, YD, Rv.solids, lane)) {
              st[0] = cx;
              st[1] = cy;
              placed = true;
            }
          }
          if (forced && !placed) {
            st[0] = st[2];
            st[1] = st[3];
            placed = true;
          }
          if (placed) {
            st[5] = 0;
            st[6] = 0;
            st[8] = 0;
            if (!forced) {
              // The rules hear where the truck stands and which way it faces (one of eight), and answer (seatAck):
              // before the screens' flag falls, so that a second tap on the disc finds the two sides agreed.
              st[36] += 1;
              st[35] = 1;
              const h8 = ((Math.round((Math.PI / 2 - st[4]) / (Math.PI / 4)) % 8) + 8) % 8;
              runOnJS(stepOutRules)(st[36], st[2], st[3], h8);
            }
            runOnJS(drivingJS)(false);
            runOnJS(soundTruck)(-1);
          }
        }
      }
      if (st[5] === 0 && exit.value === 1) exit.value = 0;
      const bx = st[5] === 1 ? st[2] : st[0];
      const by = st[5] === 1 ? st[3] : st[1];
      // Standing still (the rules decide what that does; walking past a thing never works it). owner2 item 2: a
      // sample at once when he got in or out or was moved while still (a snap), else as presenceStep paces them.
      const PR = S.pres;
      const mdx = bx - PR[5];
      const mdy = by - PR[6];
      const force = st[5] !== PR[4] || (!steering && mdx * mdx + mdy * mdy > MOVE_EPS_M * MOVE_EPS_M);
      const sampleDue = presenceStep(PR, dt, steering, info.timestamp, standMs, workDelay, force);
      if (sampleDue || entered) {
        PR[4] = st[5];
        PR[5] = bx;
        PR[6] = by;
      }

      // --- the camera: after the body with a lead, eased; wider while driving; a nudge at the first pour ----
      if (st[27] === 0 && B[6] === B[6]) {
        st[27] = 1;
        st[26] = clock + FEEL.pourNudge;
        st[29] = B[6];
        st[30] = B[7];
      }
      const nudging = clock < st[26];
      const fx = nudging ? (bx + st[29]) / 2 : bx + vx * motion.lead;
      const fy = nudging ? (by + st[30]) / 2 : by + vy * motion.lead;
      const wantZoom = st[5] === 1 ? FEEL.driveZoom : 1;
      st[24] += (wantZoom - st[24]) * (1 - Math.exp(-dt / FEEL.zoomEase));
      const zoom = st[24];
      // The follow view: the body at the screen's middle across and at FOLLOW_Y of its height (the free
      // world's middle under the bars, L6), whatever the zoom.
      const cam = S.cam;
      followCam(cam, fx * ppm, fy * ppm * tilt, SW, SH, zoom, FOLLOW_Y);
      const tcx = cam[0];
      const tcy = cam[1];
      const e = st[19] === 1 ? 1 - Math.exp(-dt / motion.ease) : 1;
      st[19] = 1;
      st[9] += (tcx - st[9]) * e;
      st[10] += (tcy - st[10]) * e;
      // The limits (L6): on foot inside the fence about a metre of verge past the east and south fences at
      // most; driving or out on the lane, the lane's drawn length. Never further north than the follow view
      // with the boss at the back wall. The east limit eases, so stepping out on the lane never jumps.
      const outside = bx > YW;
      const eastM = st[5] === 1 || outside ? drawW : YW;
      st[34] = st[34] > 0 ? st[34] + (eastM - st[34]) * e : eastM;
      zoomedBounds(cam, st[34] * ppm, pxH, SW, SH, ctv.inL, ctv.inT, ctv.inR, ctv.inB, room, topPx, zoom, north !== null ? north * ppm * tilt : NaN, FOLLOW_Y);
      st[9] = Math.max(cam[0], Math.min(cam[1], st[9]));
      st[10] = Math.max(cam[2], Math.min(cam[3], st[10]));
      // The hero frame's camera (world-b's ?view=hero): held there, unclamped, while on.
      const hc = heroCam.value;
      if (hc.on === 1) {
        st[9] = hc.x;
        st[10] = hc.y;
      }
      const camX = st[9];
      const camY = st[10];
      // owner1 phone 4: a shared value is written only when it changed (the camera by more than a twentieth of a
      // point, the body by more than a centimetre): a still yard re-runs none of the derived values and styles
      // that read them (the waiting tags, the hook words, the tickets).
      const pc = camera.value;
      if (Math.abs(pc.x - camX) > CAM_EPS_PX || Math.abs(pc.y - camY) > CAM_EPS_PX || pc.zoom !== zoom) {
        ground.value = [{ translateX: SW / 2 }, { translateY: SH / 2 }, { scale: zoom }, { translateX: -camX - SW / 2 }, { translateY: -camY - SH / 2 }];
        camera.value = { x: camX, y: camY, zoom };
        northSy.value = wallY === wallY ? (wallY * ppm * tilt - camY - SH / 2) * zoom + SH / 2 : NaN;
      }
      const pb = body.value;
      if (Math.abs(pb.x - bx) > MOVE_EPS_M || Math.abs(pb.y - by) > MOVE_EPS_M || pb.driving !== st[5]) body.value = { x: bx, y: by, driving: st[5] };

      // --- the presence sample: ten times a second while steering, about three while still (owner2 item 2) ------
      const bodyR = st[5] === 1 ? motion.truckR : motion.workerR;
      const ni = nearestAct(acts, bx, by, bodyR + motion.reach);
      if (near.value !== ni) near.value = ni;
      const h8now = st[5] === 1 ? ((Math.round((Math.PI / 2 - st[4]) / (Math.PI / 4)) % 8) + 8) % 8 : -1;
      if (entered) runOnJS(enterRules)(st[2], st[3], steering ? 1 : 0, h8now);
      else if (sampleDue) runOnJS(sampleJS)(ni, bx, by, st[5], steering ? 1 : 0, S.pres[0], h8now);

      // --- the sprites of this frame ----------------------------------------------------------------------
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
      // The map, then the rules' things, pieces, machines, bays, skips and circles.
      let runA = 0;
      for (let src = 0; src < 2; src++) {
        if (src === 1) runA = L.n;
        const A = src === 0 ? statics : rulesItems.value;
        for (let o = 0; o + ITEM - 1 < A.length; o += ITEM) {
          const alt = A[o + 10];
          const cell = alt >= 0 && Math.floor(clock / A[o + 11]) % 2 === 1 ? alt : A[o + 2];
          const n0 = L.n;
          addTo(A[o] === L_DECAL ? D : L, V, A[o + 1], cell, A[o + 3], A[o + 4], A[o + 5], A[o + 6], A[o + 7], A[o + 8], A[o + 9]);
          // owner1 play 1: where each roof landed in the list this frame (-1: off screen), for its ink below.
          if (src === 0) {
            const r = roofOf[o / ITEM];
            if (r >= 0 && r < 16) S.roofL[r] = L.n > n0 ? n0 : -1;
          }
        }
      }
      const runB = L.n;
      if (T !== null) {
        const P = S.path;
        const o4 = S.o4;
        // Stress actors (`actors=N`): pictures only, between places.
        for (let hi = 0; hi < hPts.length; hi++) {
          const pts = hPts[hi];
          const len = hLen[hi];
          if (len <= 0) continue;
          const go = len / motion.helperSpeed;
          const cyc = 2 * go + 3.2;
          const uu = (clock + hPhase[hi]) % cyc;
          const back = uu >= go + 1.6;
          const moving = (uu >= 1.6 && uu < go + 1.6) || uu >= go + 3.2;
          const dist = uu < 1.6 ? 0 : uu < go + 1.6 ? (uu - 1.6) * motion.helperSpeed : uu < go + 3.2 ? len : Math.max(0, len - (uu - go - 3.2) * motion.helperSpeed);
          along(o4, pts, pts.length / 2, len > 0 ? dist / len : 0);
          const h = moving ? heading4(back ? -o4[2] : o4[2], back ? -o4[3] : o4[3]) : 0;
          addTo(SHD, V, 0, T.shPerson, o4[0], o4[1], 0, 0, 1, -1, 1);
          personInto(L, V, T, 1, moving ? P_WALK : P_STAND, moving ? Math.floor(dist / FEEL.strideM) % 4 : 0, h, -1, -1, 0, T.vests[hi % 3], o4[0], o4[1], o4[1] + 0.25);
          actors++;
        }
        // owner1 play 2: every vehicle drawn this frame leaves its drawn body (with its speed) in VB; the crew
        // below step aside from the moving ones (on the screen only).
        const VB = S.vb;
        const PV = S.pv;
        const VD = K !== null ? K.VD : NO_ITEMS;
        const f2 = S.f2;
        let nvb = 0;
        let seen = 0;
        // The merchant's flatbed: at its stand (facing east), loading with its crane, away on its round.
        const FB = Rv.flatbed;
        if (FB[3] !== 0 || FB[4] !== 0) {
          const ph = FB[0];
          let fx2 = FB[3];
          let fy2 = FB[4];
          let h4 = 1;
          let show = true;
          if (ph === 2) {
            // owner1 V3: out along the drive line at the dates the rules give, back the same way at the round's end (./motion.ts flatbedAway).
            show = flatbedAway(o4, S.tmp2, P, FB, Rv.flatbedPath, Rv.flatbedAt, tNow, FEEL.vehicleV);
            fx2 = o4[0];
            fy2 = o4[1];
            h4 = heading4(o4[2], o4[3]);
          }
          if (show) {
            addTo(SHD, V, 0, T.shFlatbed[h4], fx2, fy2, 0, 0, 1, -1, 1);
            const key = fy2 + 1;
            if (ph === 1) {
              const span = FB[2] - FB[1];
              const u = span > 0 ? Math.max(0, Math.min(0.999, (tNow - FB[1]) / span)) : 0;
              addTo(L, V, key, T.flatbedWorking, fx2, fy2, 0, 0, T.flatbedWorkScale, -1, 1);
              if (FB[5] > 0) addTo(L, V, key + 1e-4, T.cargo[FB[5] - 1], fx2, fy2, T.cargoOff[8], T.cargoOff[9], T.flatbedWorkScale, -1, 1);
              addTo(L, V, key + 2e-4, T.crane[Math.floor(u * 3)], fx2, fy2, 0, 0, T.flatbedWorkScale, -1, 1);
            } else {
              addTo(L, V, key, T.flatbed[h4], fx2, fy2, 0, 0, T.vehicleScale, -1, 1);
              if (FB[5] > 0 && ph === 2) addTo(L, V, key + 1e-4, T.cargo[FB[5] - 1], fx2, fy2, T.cargoOff[h4 * 2], T.cargoOff[h4 * 2 + 1], T.flatbedWorkScale, -1, 1);
            }
            facing8(f2, h4 * 2);
            nvb = bodyInto(VB, nvb, PV, 1, fx2, fy2, f2[0], f2[1], VD[2], VD[3], dt, 0);
            seen |= 2;
            actors++;
          }
        }
        // The public's car and trailer: in through the gate, standing at the drop-off, out again (./motion.ts carAt).
        const CA = Rv.car;
        if (carAt(o4, P, CA, pts.gate[0], pts.gate[1], tNow, FEEL.vehicleV)) {
          const h4 = heading4(o4[2], o4[3]);
          const tdx = h4 === 1 ? -2.75 * 40 : h4 === 3 ? 2.75 * 40 : 0;
          const tdy = h4 === 0 ? -2.75 * 28 : h4 === 2 ? 2.75 * 28 : 0;
          addTo(SHD, V, 0, T.shVan[h4], o4[0], o4[1], 0, 0, 1, -1, 1);
          addTo(SHD, V, 0, T.shTrailer[h4], o4[0], o4[1], 0, 0, 1, -1, 1);
          const north = h4 === 2;
          addTo(L, V, o4[1] + (north ? 0.9 : 0.89), T.trailer[h4], o4[0], o4[1], tdx, tdy, T.vehicleScale, -1, 1);
          addTo(L, V, o4[1] + (north ? 0.89 : 0.9), T.van[h4], o4[0], o4[1], 0, 0, T.vehicleScale, -1, 1);
          facing8(f2, h4 * 2);
          nvb = bodyInto(VB, nvb, PV, 2, o4[0], o4[1], f2[0], f2[1], VD[4], VD[5], dt, 0);
          nvb = bodyInto(VB, nvb, PV, 3, o4[0], o4[1], f2[0], f2[1], VD[6], VD[7], dt, 2.75);
          seen |= 12;
          actors++;
        }
        // Purchases on their way: the van to the rack, the machine flatbed's crane over a pad (./motion.ts arrivalAt).
        const AR = Rv.arrivals;
        for (let o = 0; o + ARRIVAL - 1 < AR.length; o += ARRIVAL) {
          const kind = AR[o];
          if (kind !== 0 && kind !== 1) continue;
          const ph = AR[o + 1];
          const span = AR[o + 7] - AR[o + 6];
          const u = span > 0 ? Math.max(0, Math.min(1, (tNow - AR[o + 6]) / span)) : 1;
          const h4 = arrivalAt(o4, S.tmp2, P, S.tA, AR, o, Rv.arrivalPath, Rv.arrivalAt, tNow);
          const ax = o4[0];
          const ay = o4[1];
          if (kind === 0) {
            addTo(SHD, V, 0, T.shVan[h4], ax, ay, 0, 0, 1, -1, 1);
            addTo(L, V, ay + 0.9, T.van[h4], ax, ay, 0, 0, T.vehicleScale, -1, 1);
          } else {
            addTo(SHD, V, 0, T.shFlatbed[ph === 1 ? 1 : h4], ax, ay, 0, 0, 1, -1, 1);
            if (ph === 1) {
              addTo(L, V, ay + 1, T.flatbedWorking, ax, ay, 0, 0, T.flatbedWorkScale, -1, 1);
              addTo(L, V, ay + 1 + 2e-4, T.crane[Math.min(2, Math.floor(u * 3))], ax, ay, 0, 0, T.flatbedWorkScale, -1, 1);
            } else addTo(L, V, ay + 1, T.flatbed[h4], ax, ay, 0, 0, T.vehicleScale, -1, 1);
          }
          const slot = 4 + Math.min(3, o / ARRIVAL);
          facing8(f2, (ph === 1 ? 1 : h4) * 2);
          nvb = bodyInto(VB, nvb, PV, slot, ax, ay, f2[0], f2[1], kind === 0 ? VD[4] : VD[2], kind === 0 ? VD[5] : VD[3], dt, 0);
          seen |= 1 << slot;
          actors++;
        }
        // The truck: driven by the boss (here), on the driver's trip (pictured from its leg), or parked.
        if (truckOwned) {
          const TR = Rv.truck;
          let tx = st[2];
          let ty = st[3];
          let h8 = heading8(st[4]);
          let hook = -1;
          // The driver's trip: along this phase's path at the leg's dates (./motion.ts truckAt).
          const t4 = S.t4;
          if (!driving && truckAt(t4, S.tmp2, TR, Rv.truckPath, tNow, truckFrom(S.truckK, TR, Rv.truckAt, tNow, snap), Rv.truckAt)) {
            tx = t4[0];
            ty = t4[1];
            // A one-point phase (weigh) keeps the facing it arrived with.
            h8 = t4[2] === t4[2] ? t4[2] : S.face[0] === S.face[0] ? S.face[0] : TR[3];
            hook = t4[3];
          }
          // The facing turns through the eight headings, never flips (the boss's wheel turns it itself).
          h8 = turnFacing(S.face, h8, clock, driving || snap || hook >= 0);
          const key = ty + 1;
          if (hook >= 0) {
            vehicleInto(L, SHD, V, T.truckHook[hook], T.shTruck[2], T.truckScale, tx, ty, key);
          } else if (TR[4] === 0 && T.truckBare[h8] >= 0) {
            // No skip on the hook (L16): the bare frame of this heading.
            vehicleInto(L, SHD, V, T.truckBare[h8], T.shTruck[h8], T.truckScale, tx, ty, key);
          } else if (TR[4] === 0 && (h8 === 2 || h8 === 1 || h8 === 3)) {
            vehicleInto(L, SHD, V, T.truckHook[0], T.shTruck[2], T.truckScale, tx, ty, key);
          } else {
            vehicleInto(L, SHD, V, T.truck[h8], T.shTruck[h8], T.truckScale, tx, ty, key);
            if (TR[10] >= 0) addTo(L, V, key + 1e-4, T.skipLoad[TR[10]], tx, ty, T.skipTop[h8 * 2], T.skipTop[h8 * 2 + 1], T.vehicleScale, -1, 1);
          }
          // The boss's own truck faces where he steers it (st[4]); the driver's as drawn.
          if (driving) {
            f2[0] = Math.cos(st[4]);
            f2[1] = Math.sin(st[4]);
          } else facing8(f2, h8);
          nvb = bodyInto(VB, nvb, PV, 0, tx, ty, f2[0], f2[1], VD[0], VD[1], dt, 0);
          seen |= 1;
          actors++;
        }
        // A vehicle not drawn this frame has no previous place for the next one.
        for (let q = 0; q < VB_SLOTS; q++) {
          if ((seen & (1 << q)) === 0) {
            PV[q * 2] = NaN;
            PV[q * 2 + 1] = NaN;
          }
        }
        // The crew: each member walked along the leg the rules gave (from, to, t0, t1), never anywhere else
        // (drawn after the vehicles: they step aside from the moving ones).
        const CR = Rv.crew;
        // owner2 item 3: the frame's places in a scratch array; a new array only when someone moved (below).
        const XY: number[] = S.xy;
        const nXY = Math.floor(CR.length / 14) * 2;
        XY.length = nXY;
        for (let i = 0; i < nXY; i++) XY[i] = NaN;
        for (let o = 0; o + 13 < CR.length; o += 14) {
          if (CR[o + 11] === 1) continue;
          const phase = CR[o + 10];
          const walking = phase === 1 || phase === 3;
          const ci = Math.min(63, o / 14);
          const u = crewAt(o4, P, CR, o, tNow, walking ? legStart(S.legK, ci, CR[o + 6], CR[o + 7], tNow, snap) : NaN);
          // owner1 play 2: drawn stepped aside from a moving vehicle's path (the rules' place is untouched).
          stepAside(f2, S.aside, ci, o4[0], o4[1], VB, nvb, dt, snap);
          o4[0] = f2[0];
          o4[1] = f2[1];
          const np = CR[o + 12] === CR[o + 12] ? 3 : 2;
          const carrier = CR[o + 8] > 0 ? CR[o + 8] - 1 : -1;
          let pose = CR[o + 1];
          // The pour side-on (as the boss's, above); else standing faces the camera.
          const h = walking ? heading4(o4[2], o4[3]) : pose === P_POUR && B[6] === B[6] ? (B[6] >= o4[0] ? 1 : 3) : 0;
          let frame = Math.floor(clock / FEEL.workFrameS) % POSE_FRAMES[pose];
          if (walking) {
            pose = carrier >= 0 ? P_PUSH : P_WALK;
            frame = Math.floor((Math.max(0, Math.min(1, u)) * pathLen(P, np)) / FEEL.strideM) % 4;
          } else if (carrier >= 0 && pose === P_STAND) pose = P_PUSH;
          if (pose === P_PUSH && !walking) frame = 0;
          addTo(SHD, V, 0, T.shPerson, o4[0], o4[1], 0, 0, 1, -1, 1);
          // The carrier stays in every pose (owner's review point 3: it vanished while working, flashing).
          if (carrier >= 0) addTo(SHD, V, 0, carrier === 0 ? T.shSack[h] : T.shTrolley[h], o4[0], o4[1], 0, 0, 1, -1, 1);
          personInto(L, V, T, 1, pose, frame, h, -1, carrier, CR[o + 9], T.vests[CR[o]] ?? -1, o4[0], o4[1], o4[1] + 0.25);
          XY[(o / 14) * 2] = o4[0];
          XY[(o / 14) * 2 + 1] = o4[1];
          actors++;
        }
        // owner1 phone 4: only when someone moved by more than a centimetre (or the crew changed).
        const pXY = crewXY.value;
        let moved = pXY.length !== XY.length;
        for (let i = 0; !moved && i < XY.length; i++) {
          const a = XY[i];
          const p = pXY[i];
          moved = a === a ? !(p === p) || Math.abs(a - p) > MOVE_EPS_M : p === p;
        }
        if (moved) crewXY.value = XY.slice(0, nXY);
        // The boss, on foot: walking or pushing, working by tool, pouring, standing; his hand load on his back.
        if (st[5] === 0) {
          const carrier = B[0] > 0 ? B[0] - 1 : -1;
          let pose = P_STAND;
          let frame = 0;
          let h = st[8];
          if (steering) {
            pose = carrier >= 0 ? P_PUSH : P_WALK;
            frame = Math.floor(st[7] / FEEL.strideM) % 4;
          } else if (B[3] >= P_FEED && B[3] !== P_PUSH) {
            pose = B[3];
            frame = Math.floor(clock / FEEL.workFrameS) % POSE_FRAMES[pose];
            if (B[4] === B[4]) h = heading4(B[4] - st[0], B[5] - st[1]);
            // At the pot side-on, as the art director's pour (proof.draw.ts): the shield and the apron face the camera.
            else if (pose === P_POUR && B[6] === B[6]) h = B[6] >= st[0] ? 1 : 3;
          } else if (B[6] === B[6] && Math.hypot(B[6] - st[0], B[7] - st[1]) < 3.5) {
            pose = P_POUR;
            h = B[6] >= st[0] ? 1 : 3;
          } else if (carrier >= 0) pose = P_PUSH;
          if (h !== st[8] && !steering) st[8] = h;
          addTo(SHD, V, 0, T.shPerson, st[0], st[1], 0, 0, 1, -1, 1);
          if (carrier >= 0) addTo(SHD, V, 0, carrier === 0 ? T.shSack[h] : T.shTrolley[h], st[0], st[1], 0, 0, 1, -1, 1);
          personInto(L, V, T, 0, pose, frame, h, carrier < 0 ? B[1] : -1, carrier, B[2], -1, st[0], st[1], st[1] + 0.25);
          actors++;
        }
        // owner1 play 1: A PLAYER ALWAYS SEES HIMSELF. A roof under which the boss on foot (or a crew member)
        // stands as drawn is drawn see-through (about a third of its ink), eased over a fifth of a second.
        if (K !== null) {
          const RF = K.roofs;
          for (let r = 0; r * ROOF < RF.length && r < 16; r++) {
            let covered = st[5] === 0 && underRoof(RF, r, st[0], st[1], st[1] + 0.25, tilt, K.PB);
            for (let i = 0; !covered && i + 1 < XY.length; i += 2) {
              if (XY[i] === XY[i]) covered = underRoof(RF, r, XY[i], XY[i + 1], XY[i + 1] + 0.25, tilt, K.PB);
            }
            const a = roofInk(S.roofA[r], covered, dt);
            S.roofA[r] = a;
            const li = S.roofL[r];
            if (li >= 0 && li < L.n) L.al[li] = L.al[li] * a;
          }
        }
      }

      // --- one picture: decals, shadows, then the sorted list in runs ---------------------------------------
      sortRuns(L, runA, runB);
      let runs = 0;
      const PO = S.runPool;
      const picture = createPicture((cv) => {
        if (K === null) return;
        runs += drawRuns(cv, D, false, K.X, K.RC, K.C, K.images, K.rects, K.dens, K.paint, PO, runs);
        runs += drawRuns(cv, SHD, false, K.X, K.RC, K.C, K.images, K.rects, K.dens, K.paint, PO, runs);
        runs += drawRuns(cv, L, true, K.X, K.RC, K.C, K.images, K.rects, K.dens, K.paint, PO, runs);
      });
      pic.value = picture;
      if (IS_WEB) {
        // CanvasKit frees nothing by itself: the picture of three frames ago is no longer drawn.
        S.pics.push(picture);
        if (S.pics.length > 3) S.pics.shift().dispose();
      }

      // --- the development panel's numbers: five one-second buckets -----------------------------------------
      if (measure) {
        const b = S.buckets;
        const sec = Math.floor(info.timestamp / 1000);
        const slot = (sec % 5) * 3;
        if (st[13] !== sec) {
          st[13] = sec;
          b[slot] = 0;
          b[slot + 1] = 0;
          b[slot + 2] = sec;
        }
        b[slot] += 1;
        if (ms > b[slot + 1] && info.timeSincePreviousFrame !== null) b[slot + 1] = ms;
        if (info.timestamp - st[15] >= 500) {
          st[15] = info.timestamp;
          const first = Math.floor(st[12] / 1000);
          let frames = 0;
          let whole = 0;
          let worst = 0;
          for (let q = 0; q < 5; q++) {
            const bs = b[q * 3 + 2];
            if (bs <= sec - 5 || b[q * 3] === 0) continue;
            worst = Math.max(worst, b[q * 3 + 1]);
            if (bs === sec || bs <= first) continue;
            frames += b[q * 3];
            whole++;
          }
          stats.value = { fps: whole > 0 ? frames / whole : 0, worstMs: worst, actors, sprites: D.n + SHD.n + L.n, runs };
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draw, ctl, motion, bossV, bossYardV, crewXY, body, camera, northSy, wallY, solids, acts, hPts, hLen, hPhase, ppm, tilt, lift, YW, YD, pxH, SW, SH, measure, sampleJS, drivingJS, topPx, room, lane, drawW, north, pts, soundStep, soundTruck, stepOutRules, seatAck, enterRules, enter, standMs, workDelay],
  );
  const cb = useFrameCallback(onFrame, false);
  useEffect(() => {
    cb.setActive(run);
    return () => cb.setActive(false);
  }, [run, cb]);
  return useMemo(() => ({ pic, ground, camera, northSy, body, near, stats, exit, enter, crew: crewXY, capacity: opts.capacity ?? 0 }), [pic, ground, camera, northSy, body, near, stats, exit, enter, crewXY, opts.capacity]);
}

