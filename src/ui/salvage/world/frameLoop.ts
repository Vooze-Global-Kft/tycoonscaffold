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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { runOnJS, useFrameCallback, useSharedValue, type FrameInfo, type SharedValue } from 'react-native-reanimated';
import { salvageActions } from '../../../modes/salvage/actions';
import { YARD } from '../art/palette';
import { yardSound } from '../hud/pump';
import { useGame } from '../../../state/store';
import * as R from '../../../engine/salvage';
import { ARRIVAL, ITEM, L_DECAL, NO_SCENE, POSE_FRAMES, P_FEED, P_POUR, P_PUSH, P_STAND, P_WALK, actorTable, addTo, along, heading4, heading8, makeListW, makeResolver, pathLen, personInto, sortList, staticItems, type DrawList, type RulesScene } from './actors';
import { EDGE_ROOM_M, cameraBounds } from './camera';
import { heroCam } from './heroFrame';
import { blocked, moveBody, nearestAct } from './collide';
import { DEAD, STICK_R, presenceStep, stick } from './stick';
import { useYardArt, type YardArt } from './useYard';
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
  /** The view while driving: this zoom (a wider view). */
  driveZoom: 0.78,
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
  /** camX, camY in points before the zoom, and the zoom (1 on foot). */
  camera: SharedValue<{ x: number; y: number; zoom: number }>;
  /** The boss's place in metres each frame (driving: the truck's). */
  body: SharedValue<{ x: number; y: number; driving: number }>;
  /** The interactable the body stands next to (index into yard.acts), -1 none. */
  near: SharedValue<number>;
  stats: SharedValue<FrameStats>;
  /** Set to 1 by the "Step out" button; the loop clears it when the boss is out. */
  exit: SharedValue<number>;
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

/** A vehicle sprite and its shadow. */
function vehicleInto(L: DrawList, SH: DrawList, V: Float64Array, cell: number, shadow: number, scale: number, wx: number, wy: number, key: number): void {
  'worklet';
  addTo(SH, V, 0, shadow, wx, wy, 0, 0, 1, -1, 1);
  addTo(L, V, key, cell, wx, wy, 0, 0, scale, -1, 1);
}

/**
 * Draws a list in runs of the same sheet and mirroring: fills the pools at the list's base and calls
 * drawAtlas once per run (mirrored runs inside a canvas flipped about x = 0). Returns the number of draws.
 */
function drawRuns(cv: SkCanvas, L: DrawList, sorted: boolean, X: SkRSXform[], RC: SkHostRect[], C: SkColor[], images: (SkImage | null)[], rects: number[][], dens: number[], paint: ReturnType<typeof Skia.Paint>): number {
  'worklet';
  let runs = 0;
  let start = 0;
  let runKey = -1;
  const flush = (end: number) => {
    if (end <= start || runKey < 0) return;
    const sheet = runKey >> 1;
    const img = images[sheet];
    if (img) {
      const b = L.base;
      const mirror = (runKey & 1) === 1;
      if (mirror) {
        cv.save();
        cv.scale(-1, 1);
      }
      cv.drawAtlas(img, RC.slice(b + start, b + end), X.slice(b + start, b + end), paint, BlendMode.Modulate, C.slice(b + start, b + end), { filter: FilterMode.Linear, mipmap: MipmapMode.None });
      if (mirror) cv.restore();
      runs++;
    }
    start = end;
  };
  for (let i = 0; i < L.n; i++) {
    const it = sorted ? L.order[i] : i;
    const p = L.cell[it];
    const sheet = Math.floor(p / CELL_BASE);
    const rest = p - sheet * CELL_BASE;
    const cell = rest >> 1;
    const mirror = rest & 1;
    const rk = sheet * 2 + mirror;
    if (rk !== runKey) {
      flush(i);
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
    if (t < 0) {
      c[0] = a;
      c[1] = a;
      c[2] = a;
    } else {
      c[0] = (((t >> 16) & 255) / 255) * a;
      c[1] = (((t >> 8) & 255) / 255) * a;
      c[2] = ((t & 255) / 255) * a;
    }
    c[3] = a;
  }
  flush(L.n);
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
  onSample: (act: number, x: number, y: number, driving: number, moving: number, standingFor?: number) => void;
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
    const statics = staticItems(content, res);
    const T = actorTable(res, { hand: YARD.vestYardHand, cutter: YARD.vestCutter, driver: YARD.vestDriver });
    const images = art.sheets.map((s) => (s ? s.image : null));
    const rects = art.sheets.map((s) => (s ? s.rects : []));
    const dens = art.sheets.map((s) => (s ? s.density : 1));
    return { statics, T, images, rects, dens };
  }, [art, content]);

  const pools = useMemo(
    () => ({
      X: Array.from({ length: CAP }, () => Skia.RSXform(0, 0, 0, 0)),
      RC: Array.from({ length: CAP }, () => Skia.XYWHRect(0, 0, 1, 1)),
      C: Array.from({ length: CAP }, () => Skia.Color('white')),
      paint: Skia.Paint(),
      empty: createPicture(() => {}),
    }),
    [],
  );
  const pic = useSharedValue<SkPicture>(pools.empty);
  const ground = useSharedValue<any[]>([{ translateX: 0 }, { translateY: 0 }]);
  const camera = useSharedValue({ x: 0, y: 0, zoom: 1 });
  const body = useSharedValue({ x: 0, y: 0, driving: 0 });
  const near = useSharedValue(-1);
  const stats = useSharedValue<FrameStats>({ fps: 0, worstMs: 0, actors: 0, sprites: 0, runs: 0 });
  const exit = useSharedValue(0);
  const scratch = useSharedValue<any>(null);

  const sound = opts.sound ?? yardSound;
  const soundStep = useCallback((g: string) => sound.step(g), [sound]);
  const soundTruck = useCallback((s: number) => sound.truck(s < 0 ? null : s), [sound]);
  const stepOutRules = useCallback(() => {
    salvageActions.stepOut();
  }, []);
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
  const statics = baked?.statics ?? [];
  const T = baked?.T ?? null;
  const images = baked?.images ?? [null, null, null, null];
  const rects = baked?.rects ?? [[], [], [], []];
  const dens = baked?.dens ?? [1, 1, 1, 1];
  const { X, RC, C, paint } = pools;

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
        S = { st, D: makeListW(CAP_DECAL, 0), SHD: makeListW(CAP_SHADOW, CAP_DECAL), L: makeListW(CAP_SORT, CAP_DECAL + CAP_SHADOW), buckets: new Float64Array(15), cam: [0, 0, 0, 0], out: [0, 0], o4: [0, 0, 0, 0], path: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], view: new Float64Array(8), lastR: null, pics: [], pres: new Float64Array(2) };
        scratch.value = S;
      }
      const st = S.st;
      const ms = info.timeSincePreviousFrame ?? 16.7;
      const dt = Math.min(0.05, Math.max(0, ms / 1000));
      st[18] += dt;
      const clock = st[18];
      const Rv = rules.value;
      if (Rv !== S.lastR) {
        S.lastR = Rv;
        st[20] = info.timestamp;
      }
      // The rules' play time now: the frame's time plus what has passed since it came (at most a tick).
      const tNow = Rv.t + Math.min(0.25, (info.timestamp - st[20]) / 1000);
      const truckOwned = Rv.truck[0] === 1;
      const truckBusy = Rv.truck[5] === 2 || Rv.truck[6] >= 0;

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
      const driving = st[5] === 1;
      const speed = driving ? motion.drive : motion.walk;
      const vx = ux * speed;
      const vy = uy * speed;
      st[16] = vx;
      st[17] = vy;
      const out = S.out;
      // An epoch change (a preset, the away pass, a reload) snaps the boss to where the rules have him.
      const B = Rv.boss;
      let snap = false;
      if (Rv.n > 0 && Rv.epoch !== st[33]) {
        st[33] = Rv.epoch;
        snap = true;
        if (!driving && B[9] === B[9] && B[10] === B[10]) {
          st[0] = B[9];
          st[1] = B[10];
          st[8] = B[11] >= 0 && B[11] < 4 ? B[11] : 0;
        }
      }
      // The truck stands where the rules last put it, unless the boss drives it (synced when the rules move it).
      if (!driving && !truckBusy && (snap || Rv.truck[1] !== st[31] || Rv.truck[2] !== st[32])) {
        st[31] = Rv.truck[1];
        st[32] = Rv.truck[2];
        if (Rv.n > 0 && truckOwned) {
          st[2] = Rv.truck[1];
          st[3] = Rv.truck[2];
          st[4] = Math.PI / 2 - (Rv.truck[3] * Math.PI) / 4;
        }
      }
      if (!driving) {
        const truckSolid = truckOwned && !truckBusy;
        moveBody(out, st[0], st[1], vx * dt, vy * dt, motion.workerR, solids, YW, YD, st[2], st[3], truckSolid ? motion.truckR * 0.85 : 0, Rv.solids, lane);
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
          if (st[6] === 1 && d < motion.enter && steering) {
            st[5] = 1;
            runOnJS(onDriving)(true);
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
          runOnJS(soundTruck)(dt > 0 ? Math.min(1, moved / dt / motion.drive) : 0);
        }
        // Step out (the button): beside the truck, on the first free side.
        if (exit.value === 1) {
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
          if (placed) {
            st[5] = 0;
            st[6] = 0;
            st[8] = 0;
            runOnJS(onDriving)(false);
            runOnJS(soundTruck)(-1);
            runOnJS(stepOutRules)();
          }
        }
      }
      if (st[5] === 0 && exit.value === 1) exit.value = 0;
      const bx = st[5] === 1 ? st[2] : st[0];
      const by = st[5] === 1 ? st[3] : st[1];
      // Standing still (the rules decide what that does; walking past a thing never works it).
      const sampleDue = presenceStep(S.pres, dt, steering, info.timestamp);

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
      const tcx = fx * ppm - SW / 2;
      const tcy = fy * ppm * tilt - SH / 2;
      const e = st[19] === 1 ? 1 - Math.exp(-dt / motion.ease) : 1;
      st[19] = 1;
      st[9] += (tcx - st[9]) * e;
      st[10] += (tcy - st[10]) * e;
      const wantZoom = st[5] === 1 ? FEEL.driveZoom : 1;
      st[24] += (wantZoom - st[24]) * (1 - Math.exp(-dt / FEEL.zoomEase));
      const zoom = st[24];
      const cam = S.cam;
      cameraBounds(cam, pxW, pxH, SW, SH, inL, inT, inR, inB, room, topPx);
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
      ground.value = [{ translateX: SW / 2 }, { translateY: SH / 2 }, { scale: zoom }, { translateX: -camX - SW / 2 }, { translateY: -camY - SH / 2 }];
      camera.value = { x: camX, y: camY, zoom };
      body.value = { x: bx, y: by, driving: st[5] };

      // --- the presence sample: at most ten times a second --------------------------------------------------
      const bodyR = st[5] === 1 ? motion.truckR : motion.workerR;
      const ni = nearestAct(acts, bx, by, bodyR + motion.reach);
      if (near.value !== ni) near.value = ni;
      if (sampleDue) runOnJS(onSample)(ni, bx, by, st[5], steering ? 1 : 0, S.pres[0]);

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
      for (let src = 0; src < 2; src++) {
        const A = src === 0 ? statics : Rv.items;
        for (let o = 0; o + ITEM - 1 < A.length; o += ITEM) {
          const alt = A[o + 10];
          const cell = alt >= 0 && Math.floor(clock / A[o + 11]) % 2 === 1 ? alt : A[o + 2];
          addTo(A[o] === L_DECAL ? D : L, V, A[o + 1], cell, A[o + 3], A[o + 4], A[o + 5], A[o + 6], A[o + 7], A[o + 8], A[o + 9]);
        }
      }
      if (T !== null) {
        const P = S.path;
        const o4 = S.o4;
        // The crew: each member walked along the leg the rules gave (from, to, t0, t1), never anywhere else.
        const CR = Rv.crew;
        for (let o = 0; o + 13 < CR.length; o += 14) {
          if (CR[o + 11] === 1) continue;
          const phase = CR[o + 10];
          const walking = phase === 1 || phase === 3;
          let np = 2;
          P[0] = CR[o + 2];
          P[1] = CR[o + 3];
          if (CR[o + 12] === CR[o + 12]) {
            P[2] = CR[o + 12];
            P[3] = CR[o + 13];
            np = 3;
          }
          P[np * 2 - 2] = CR[o + 4];
          P[np * 2 - 1] = CR[o + 5];
          const span = CR[o + 7] - CR[o + 6];
          const u = walking ? (span > 0 ? (tNow - CR[o + 6]) / span : 1) : 1;
          along(o4, P, np, u);
          const h = walking ? heading4(o4[2], o4[3]) : 0;
          const carrier = CR[o + 8] > 0 ? CR[o + 8] - 1 : -1;
          let pose = CR[o + 1];
          let frame = Math.floor(clock / FEEL.workFrameS) % POSE_FRAMES[pose];
          if (walking) {
            pose = carrier >= 0 ? P_PUSH : P_WALK;
            frame = Math.floor((Math.max(0, Math.min(1, u)) * pathLen(P, np)) / FEEL.strideM) % 4;
          } else if (carrier >= 0 && pose === P_STAND) pose = P_PUSH;
          if (pose === P_PUSH && !walking) frame = 0;
          addTo(SHD, V, 0, T.shPerson, o4[0], o4[1], 0, 0, 1, -1, 1);
          if (carrier >= 0 && pose === P_PUSH) addTo(SHD, V, 0, carrier === 0 ? T.shSack[h] : T.shTrolley[h], o4[0], o4[1], 0, 0, 1, -1, 1);
          personInto(L, V, T, 1, pose, frame, h, -1, carrier, CR[o + 9], T.vests[CR[o]] ?? -1, o4[0], o4[1], o4[1] + 0.25);
          actors++;
        }
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
        // The merchant's flatbed: at its stand (facing east), loading with its crane, away on its round.
        const FB = Rv.flatbed;
        if (FB[3] !== 0 || FB[4] !== 0) {
          const ph = FB[0];
          let fx2 = FB[3];
          let fy2 = FB[4];
          let h4 = 1;
          let show = true;
          if (ph === 2) {
            const FP = Rv.flatbedPath;
            const np = Math.min(FB[6], 5);
            for (let q = 0; q < np * 2; q++) P[q] = FP[q];
            const len = pathLen(P, np);
            const drive = Math.min((FB[2] - FB[1]) / 2, len / FEEL.vehicleV);
            const since = tNow - FB[1];
            const left = FB[2] - tNow;
            if (np < 2) show = false;
            else if (since < drive) along(o4, P, np, since / drive);
            else if (left < drive) {
              along(o4, P, np, left / drive);
              o4[2] = -o4[2];
              o4[3] = -o4[3];
            } else show = false;
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
              addTo(L, V, key, T.flatbedWorking, fx2, fy2, 0, 0, T.vehicleScale, -1, 1);
              if (FB[5] > 0) addTo(L, V, key + 1e-4, T.cargo[FB[5] - 1], fx2, fy2, T.cargoOff[8], T.cargoOff[9], T.vehicleScale, -1, 1);
              addTo(L, V, key + 2e-4, T.crane[Math.floor(u * 3)], fx2, fy2, 0, 0, T.vehicleScale, -1, 1);
            } else {
              addTo(L, V, key, T.flatbed[h4], fx2, fy2, 0, 0, T.vehicleScale, -1, 1);
              if (FB[5] > 0 && ph === 2) addTo(L, V, key + 1e-4, T.cargo[FB[5] - 1], fx2, fy2, T.cargoOff[h4 * 2], T.cargoOff[h4 * 2 + 1], T.vehicleScale, -1, 1);
            }
            actors++;
          }
        }
        // The public's car and trailer: in through the gate, standing at the drop-off, out again.
        const CA = Rv.car;
        if (CA[0] === 1) {
          P[0] = CA[1];
          P[1] = CA[2];
          P[2] = pts.gate[0];
          P[3] = pts.gate[1];
          P[4] = CA[3];
          P[5] = CA[4];
          const len = pathLen(P, 3);
          const drive = Math.min((CA[6] - CA[5]) / 2, len / FEEL.vehicleV);
          const since = tNow - CA[5];
          const left = CA[6] - tNow;
          let show = true;
          if (since < drive) along(o4, P, 3, since / drive);
          else if (left < drive) {
            along(o4, P, 3, left / drive);
            o4[2] = -o4[2];
            o4[3] = -o4[3];
          } else {
            o4[0] = CA[3];
            o4[1] = CA[4];
            o4[2] = -1;
            o4[3] = 0;
          }
          if (since < 0 || left < 0) show = false;
          if (show) {
            const h4 = heading4(o4[2], o4[3]);
            const tdx = h4 === 1 ? -2.75 * 40 : h4 === 3 ? 2.75 * 40 : 0;
            const tdy = h4 === 0 ? -2.75 * 28 : h4 === 2 ? 2.75 * 28 : 0;
            addTo(SHD, V, 0, T.shVan[h4], o4[0], o4[1], 0, 0, 1, -1, 1);
            addTo(SHD, V, 0, T.shTrailer[h4], o4[0], o4[1], 0, 0, 1, -1, 1);
            const north = h4 === 2;
            addTo(L, V, o4[1] + (north ? 0.9 : 0.89), T.trailer[h4], o4[0], o4[1], tdx, tdy, T.vehicleScale, -1, 1);
            addTo(L, V, o4[1] + (north ? 0.89 : 0.9), T.van[h4], o4[0], o4[1], 0, 0, T.vehicleScale, -1, 1);
            actors++;
          }
        }
        // Purchases on their way: the van to the rack, the machine flatbed's crane over a pad.
        const AR = Rv.arrivals;
        for (let o = 0; o + ARRIVAL - 1 < AR.length; o += ARRIVAL) {
          const kind = AR[o];
          if (kind !== 0 && kind !== 1) continue;
          const ph = AR[o + 1];
          const span = AR[o + 7] - AR[o + 6];
          const u = span > 0 ? Math.max(0, Math.min(1, (tNow - AR[o + 6]) / span)) : 1;
          let ax = AR[o + 4];
          let ay = AR[o + 5];
          let h4 = 1;
          if (ph !== 1) {
            const k = ph === 0 ? u : 1 - u;
            ax = AR[o + 2] + (AR[o + 4] - AR[o + 2]) * k;
            ay = AR[o + 3] + (AR[o + 5] - AR[o + 3]) * k;
            const dx = (AR[o + 4] - AR[o + 2]) * (ph === 0 ? 1 : -1);
            const dy = (AR[o + 5] - AR[o + 3]) * (ph === 0 ? 1 : -1);
            h4 = heading4(dx, dy);
          }
          if (kind === 0) {
            addTo(SHD, V, 0, T.shVan[h4], ax, ay, 0, 0, 1, -1, 1);
            addTo(L, V, ay + 0.9, T.van[h4], ax, ay, 0, 0, T.vehicleScale, -1, 1);
          } else {
            addTo(SHD, V, 0, T.shFlatbed[ph === 1 ? 1 : h4], ax, ay, 0, 0, 1, -1, 1);
            if (ph === 1) {
              addTo(L, V, ay + 1, T.flatbedWorking, ax, ay, 0, 0, T.vehicleScale, -1, 1);
              addTo(L, V, ay + 1 + 2e-4, T.crane[Math.min(2, Math.floor(u * 3))], ax, ay, 0, 0, T.vehicleScale, -1, 1);
            } else addTo(L, V, ay + 1, T.flatbed[h4], ax, ay, 0, 0, T.vehicleScale, -1, 1);
          }
          actors++;
        }
        // The truck: driven by the boss (here), on the driver's trip (pictured from its leg), or parked.
        if (truckOwned) {
          const TR = Rv.truck;
          let tx = st[2];
          let ty = st[3];
          let h8 = heading8(st[4]);
          let hook = -1;
          if (!driving && TR[6] >= 0) {
            const leg = TR[6];
            const span = TR[8] - TR[7];
            const u = span > 0 ? Math.max(0, Math.min(1, (tNow - TR[7]) / span)) : 1;
            const TP = Rv.truckPath;
            const np = Math.min(TR[11], 5);
            for (let q = 0; q < np * 2; q++) P[q] = TP[q];
            if ((leg === 0 || leg === 2 || leg === 6) && np >= 2) {
              along(o4, P, np, u);
              tx = o4[0];
              ty = o4[1];
              h8 = heading8(Math.atan2(o4[3], o4[2]));
            } else if (leg === 1 || leg === 4) {
              tx = np >= 1 ? P[np * 2 - 2] : TR[1];
              ty = np >= 1 ? P[np * 2 - 1] : TR[2];
              hook = leg === 1 ? (u < 0.5 ? 1 : 0) : u < 0.35 ? 2 : 3;
            } else if (leg === 3) {
              tx = np >= 1 ? P[np * 2 - 2] : pts.weighbridge[0];
              ty = np >= 1 ? P[np * 2 - 1] : pts.weighbridge[1];
              h8 = 0;
            }
          }
          const key = ty + 1;
          if (hook >= 0) {
            vehicleInto(L, SHD, V, T.truckHook[hook], T.shTruck[2], T.vehicleScale, tx, ty, key);
          } else if (TR[4] === 0 && (h8 === 2 || h8 === 1 || h8 === 3)) {
            vehicleInto(L, SHD, V, T.truckHook[0], T.shTruck[2], T.vehicleScale, tx, ty, key);
          } else {
            vehicleInto(L, SHD, V, T.truck[h8], T.shTruck[h8], T.vehicleScale, tx, ty, key);
            if (TR[10] >= 0) addTo(L, V, key + 1e-4, T.skipLoad[TR[10]], tx, ty, T.skipTop[h8 * 2], T.skipTop[h8 * 2 + 1], T.vehicleScale, -1, 1);
          }
          actors++;
        }
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
            else if (pose === P_POUR && B[6] === B[6]) h = heading4(B[6] - st[0], B[7] - st[1]);
          } else if (B[6] === B[6] && Math.hypot(B[6] - st[0], B[7] - st[1]) < 3.5) {
            pose = P_POUR;
            h = heading4(B[6] - st[0], B[7] - st[1]);
          } else if (carrier >= 0) pose = P_PUSH;
          if (h !== st[8] && !steering) st[8] = h;
          addTo(SHD, V, 0, T.shPerson, st[0], st[1], 0, 0, 1, -1, 1);
          if (carrier >= 0 && pose === P_PUSH) addTo(SHD, V, 0, carrier === 0 ? T.shSack[h] : T.shTrolley[h], st[0], st[1], 0, 0, 1, -1, 1);
          personInto(L, V, T, 0, pose, frame, h, carrier < 0 ? B[1] : -1, carrier, B[2], -1, st[0], st[1], st[1] + 0.25);
          actors++;
        }
      }

      // --- one picture: decals, shadows, then the sorted list in runs ---------------------------------------
      sortList(L);
      let runs = 0;
      const picture = createPicture((cv) => {
        runs += drawRuns(cv, D, false, X, RC, C, images, rects, dens, paint);
        runs += drawRuns(cv, SHD, false, X, RC, C, images, rects, dens, paint);
        runs += drawRuns(cv, L, true, X, RC, C, images, rects, dens, paint);
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
    [statics, T, images, rects, dens, motion, body, camera, solids, acts, hPts, hLen, hPhase, ppm, tilt, lift, YW, YD, pxW, pxH, SW, SH, measure, onSample, onDriving, inL, inT, inR, inB, topPx, room, steer, lane, drawW, pts, soundStep, soundTruck, stepOutRules],
  );
  const cb = useFrameCallback(onFrame, false);
  useEffect(() => {
    cb.setActive(run);
    return () => cb.setActive(false);
  }, [run, cb]);
  return useMemo(() => ({ pic, ground, camera, body, near, stats, exit, capacity: opts.capacity ?? 0 }), [pic, ground, camera, body, near, stats, exit, opts.capacity]);
}

