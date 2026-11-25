/**
 * The yard's frame loop: ONE frame callback on the UI thread (docs/design/research/yard-tech.md B2).
 * Each frame it reads the stick (./stick.ts), moves the worker or the truck (speed from the config,
 * collision against the yard's bounds and solid props, sliding along them: ./collide.ts), advances the
 * walk cycle and the helpers, eases the camera after the body with a little lead (clamped to the yard
 * plus a margin past it, so a body at the yard's edge stays inside the safe area: ./camera.ts),
 * finds the thing the body stands next to, depth-sorts every sprite (lower on the screen in front) and
 * writes the RSXform, rectangle and colour buffers of the ONE atlas draw (./YardView.tsx), made once and
 * changed in place.
 *
 * THE WORLD AND THE SCREEN ARE KEPT APART (yard-tech.md B3, B8): this loop owns smooth motion (the
 * worker's and the truck's places live here, on the UI thread, and are never saved); the rules own the
 * world (cut progress, the carried stack, cash: src/engine/salvage.ts). The loop sends the rules a
 * presence sample (which thing it stands next to, where, on foot or driving, steered or still) at most ten times a second
 * (`onSample`, through runOnJS); the rules push back what they decided as `rules` (./useRulesTable.ts).
 *
 * Runs every vsync while mounted and `active` (helpers always walk); `active` false (an overlay over the
 * whole yard, the portrait card, the app in the background) stops it: nothing invisible animates.
 * Code in here runs on the UI thread: it calls only worklets and Skia host methods (npm run lint:worklets).
 */
import { Skia, notifyChange, type SkColor, type SkHostRect, type SkRSXform } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo } from 'react';
import { makeMutable, runOnJS, useFrameCallback, useSharedValue, type FrameInfo, type SharedValue } from 'react-native-reanimated';
import { RING_R, RING_STEPS, TRUCK_HEADINGS, type SpriteSheet } from './atlas';
import { EDGE_ROOM_M, cameraBounds } from './camera';
import { blocked, moveBody, nearestAct } from './collide';
import { DIRS, WALK_FRAMES } from './draw';
import { DEAD, STICK_R, stick } from './stick';
import { ACT_STRIDE, ACT_WRECK, type YardLayout } from './yard';

/** What the rules decided, pushed to the UI thread at each store change (./useRulesTable.ts). */
export interface RulesTable {
  /** Per interactable (yard.acts order): a wreck's cut progress 0 to 1, 2 when it lies in pieces; -1 for the machine. */
  cut: number[];
  carried: number;
}

export const NO_RULES: RulesTable = { cut: [], carried: 0 };

/** The numbers of the body and the camera the loop needs (from the config). */
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

export interface FrameStats {
  /** Frames a second over the last five seconds, the worst frame time (ms) in them, actors, sprites drawn. */
  fps: number;
  worstMs: number;
  actors: number;
  sprites: number;
}

export interface YardAnim {
  xf: SharedValue<SkRSXform[]>;
  rc: SharedValue<SkHostRect[]>;
  col: SharedValue<SkColor[]>;
  /** The ground's transform (the camera). */
  ground: SharedValue<{ translateX: number }[] | { translateX: number; translateY: number }[] | any[]>;
  /** The interactable the body stands next to (index into yard.acts), -1 none. */
  near: SharedValue<number>;
  stats: SharedValue<FrameStats>;
  /** Set to 1 by the "step out" button; the loop clears it when the worker is out. */
  exit: SharedValue<number>;
  capacity: number;
}

/** Scratch of the loop: made once on the UI thread, then changed in place. */
interface Scratch {
  /** 0 wx, 1 wy, 2 tx (truck), 3 ty, 4 heading, 5 mode (0 walk, 1 drive), 6 armed, 7 walked metres, 8 face, 9 camX, 10 camY, 11 last sample ts, 12 stats window start, 13 frames in window, 14 worst ms, 15 last stats ts, 16 vx, 17 vy, 18 clock s, 19 camera ready. */
  st: Float64Array;
  key: Float64Array;
  spr: Int32Array;
  sx: Float64Array;
  sy: Float64Array;
  sc: Float64Array;
  al: Float64Array;
  order: Int32Array;
  /** Five one-second buckets of [frames, worst ms, the second they count]. */
  buckets: Float64Array;
  /** The camera's limits (./camera.ts): minX, maxX, minY, maxY. */
  cam: number[];
  out: number[];
  /** The camera and the view for addItem: camX, camY, ppm, tilt, lift, screen width, height, buffer size. */
  view: Float64Array;
  count: number;
}

/** Adds one sprite to the frame's list (culled when off screen); returns the new count. */
function addItem(S: Scratch, n: number, key: number, spr: number, wx: number, wy: number, z: number, scale: number, alpha: number): number {
  'worklet';
  const V = S.view;
  if (spr < 0 || n >= V[7]) return n;
  const sx = wx * V[2] - V[0];
  const sy = wy * V[2] * V[3] - V[1] - z * V[2] * V[4];
  if (sx < -260 || sx > V[5] + 260 || sy < -260 || sy > V[6] + 320) return n;
  S.key[n] = key;
  S.spr[n] = spr;
  S.sx[n] = sx;
  S.sy[n] = sy;
  S.sc[n] = scale;
  S.al[n] = alpha;
  return n + 1;
}

const TAU = Math.PI * 2;
const DECAL = -1e9;

/** The sprite indices the loop needs, resolved on the JavaScript thread once per sheet. */
export interface SpriteIds {
  worker: number[];
  helper: number[];
  truck: number[];
  ring: number[];
  mark: number;
  piece: number;
  /** Per prop: its sprite (-1: none), and for a wreck its pieces sprite. */
  prop: number[];
  pieces: number[];
  /** Per prop: its interactable index (-1: none). */
  act: number[];
  /** Per prop: the ring's scale (wrecks), the mark's scale (interactables). */
  ringScale: number[];
}

export function spriteIds(y: YardLayout, sheet: SpriteSheet | null, sig: (i: number) => string): SpriteIds {
  const at = (n: string) => (sheet ? (sheet.index[n] ?? -1) : -1);
  const worker: number[] = [];
  const helper: number[] = [];
  for (let d = 0; d < DIRS.length; d++)
    for (let f = 0; f < WALK_FRAMES; f++) {
      worker.push(at(`worker-${d}-${f}`));
      helper.push(at(`helper-${d}-${f}`));
    }
  const act = y.props.map(() => -1);
  y.actList.forEach((a, i) => (act[a.prop] = i));
  return {
    worker,
    helper,
    truck: Array.from({ length: TRUCK_HEADINGS }, (_, k) => at(`truck-${k}`)),
    ring: Array.from({ length: RING_STEPS + 1 }, (_, k) => at(`ring-${k}`)),
    mark: at('mark'),
    piece: at('piece'),
    prop: y.props.map((p, i) => (p.kind === 'truck' ? -1 : at(`prop-${sig(i)}`))),
    pieces: y.props.map((p, i) => (p.kind === 'wreck' ? at(`pieces-${sig(i)}`) : -1)),
    act,
    ringScale: y.props.map((p) => ((p.shape === 'box' ? Math.max(p.w, p.d) / 2 : p.r) + 0.35) / RING_R),
  };
}

/** The buffer size for a yard: every prop, every helper with two carried pieces, the worker's stack, rings. */
export function bufferSize(y: YardLayout, capacity: number): number {
  return y.props.length + y.helpers.length * 3 + capacity + 12;
}

export function useYardLoop(opts: {
  yard: YardLayout;
  sheet: SpriteSheet | null;
  ids: SpriteIds;
  motion: Motion;
  rules: SharedValue<RulesTable>;
  capacity: number;
  width: number;
  height: number;
  active: boolean;
  measure: boolean;
  /** The safe area's insets, points: the camera keeps a body at the yard's edge inside them. */
  insets: { left: number; top: number; right: number; bottom: number };
  /** `moving` is 1 while the stick is held past its dead zone. */
  onSample: (act: number, x: number, y: number, driving: number, moving: number) => void;
  onDriving: (driving: boolean) => void;
}): YardAnim {
  const { yard, sheet, ids, motion, rules, capacity, width: SW, height: SH, active, measure, onSample, onDriving } = opts;
  const { left: inL, top: inT, right: inR, bottom: inB } = opts.insets;
  const N = bufferSize(yard, capacity);
  const bufs = useMemo(
    () => ({
      xf: makeMutable(Array.from({ length: N }, () => Skia.RSXform(0, 0, -9999, -9999))),
      rc: makeMutable(Array.from({ length: N }, () => Skia.XYWHRect(0, 0, 1, 1))),
      col: makeMutable(Array.from({ length: N }, () => Skia.Color('white'))),
    }),
    [N],
  );
  const ground = useSharedValue<any[]>([{ translateX: 0 }, { translateY: 0 }]);
  const near = useSharedValue(-1);
  const stats = useSharedValue<FrameStats>({ fps: 0, worstMs: 0, actors: 0, sprites: 0 });
  const exit = useSharedValue(0);
  const scratch = useSharedValue<Scratch | null>(null);

  const rects = sheet ? sheet.rects : [];
  const density = sheet ? sheet.density : 1;
  const { xf, rc, col } = bufs;
  const { props, solids, acts, helpers, ppm, tilt, lift, width: YW, depth: YD, pxW, pxH, workerStart, truckStart } = yard;
  const px = useMemo(() => props.map((p) => p.x), [props]);
  const py = useMemo(() => props.map((p) => p.y), [props]);
  const hasTruck = yard.truck >= 0;
  const hPts = useMemo(() => helpers.map((h) => h.pts), [helpers]);
  const hLen = useMemo(() => helpers.map((h) => h.length), [helpers]);
  const hPhase = useMemo(() => helpers.map((h) => h.phase), [helpers]);
  // How far the worker's sprite rises above its feet (./atlas.ts: a pawn 1.95 m tall), and the room kept round it.
  const topPx = (1.95 * lift + 0.4 * tilt + 0.1) * ppm + 8;
  const room = EDGE_ROOM_M * ppm;

  const onFrame = useCallback(
    (info: FrameInfo) => {
      'worklet';
      let S = scratch.value;
      if (S === null || S.key.length !== N || !S.view) {
        const st = new Float64Array(20);
        st[0] = workerStart.x;
        st[1] = workerStart.y;
        st[2] = truckStart.x;
        st[3] = truckStart.y;
        st[6] = 1;
        st[12] = info.timestamp;
        if (S !== null) for (let i = 0; i < 20; i++) st[i] = S.st[i];
        S = { st, key: new Float64Array(N), spr: new Int32Array(N), sx: new Float64Array(N), sy: new Float64Array(N), sc: new Float64Array(N), al: new Float64Array(N), order: new Int32Array(N), buckets: new Float64Array(15), cam: [0, 0, 0, 0], out: [0, 0], view: new Float64Array(8), count: -1 };
        scratch.value = S;
      }
      const st = S.st;
      const ms = info.timeSincePreviousFrame ?? 16.7;
      const dt = Math.min(0.05, Math.max(0, ms / 1000));
      st[18] += dt;
      const clock = st[18];

      // --- the stick: a direction and a share of full speed ---------------------------------------------
      const s = stick.value;
      let ux = 0;
      let uy = 0;
      if (s.on === 1) {
        const m = Math.sqrt(s.kx * s.kx + s.ky * s.ky) / STICK_R;
        if (m > DEAD) {
          const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / (m * STICK_R);
          ux = s.kx * k;
          uy = s.ky * k;
        }
      }
      const driving = st[5] === 1;
      const speed = driving ? motion.drive : motion.walk;
      const vx = ux * speed;
      const vy = uy * speed;
      st[16] = vx;
      st[17] = vy;
      const out = S.out;
      if (!driving) {
        moveBody(out, st[0], st[1], vx * dt, vy * dt, motion.workerR, solids, YW, YD, st[2], st[3], hasTruck ? motion.truckR * 0.85 : 0);
        const moved = Math.sqrt((out[0] - st[0]) * (out[0] - st[0]) + (out[1] - st[1]) * (out[1] - st[1]));
        st[0] = out[0];
        st[1] = out[1];
        if (ux !== 0 || uy !== 0) {
          st[8] = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 1 : 3) : vy > 0 ? 0 : 2;
          st[7] += Math.max(moved, speed * dt * 0.35);
        } else st[7] = 0;
        // Into the truck by walking up to it (armed again once the worker has walked away from it).
        if (hasTruck) {
          const dx = st[0] - st[2];
          const dy = st[1] - st[3];
          const d = Math.sqrt(dx * dx + dy * dy);
          if (st[6] === 1 && d < motion.enter && (ux !== 0 || uy !== 0)) {
            st[5] = 1;
            runOnJS(onDriving)(true);
          } else if (st[6] === 0 && d > motion.enter + 0.8) st[6] = 1;
        }
      } else {
        moveBody(out, st[2], st[3], vx * dt, vy * dt, motion.truckR, solids, YW, YD, 0, 0, 0);
        st[2] = out[0];
        st[3] = out[1];
        if (ux !== 0 || uy !== 0) {
          const want = Math.atan2(vy, vx);
          let dh = want - st[4];
          while (dh > Math.PI) dh -= TAU;
          while (dh < -Math.PI) dh += TAU;
          const turn = 7 * dt;
          st[4] += Math.max(-turn, Math.min(turn, dh));
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
            if (!blocked(cx, cy, motion.workerR, solids, YW, YD)) {
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
          }
        }
      }
      if (st[5] === 0 && exit.value === 1) exit.value = 0;
      const bx = st[5] === 1 ? st[2] : st[0];
      const by = st[5] === 1 ? st[3] : st[1];

      // --- the camera: after the body with a little lead, eased, clamped to the yard and its margins -------
      const tcx = (bx + vx * motion.lead) * ppm - SW / 2;
      const tcy = (by + vy * motion.lead) * ppm * tilt - SH / 2;
      const e = st[19] === 1 ? 1 - Math.exp(-dt / motion.ease) : 1;
      st[19] = 1;
      st[9] += (tcx - st[9]) * e;
      st[10] += (tcy - st[10]) * e;
      const cam = S.cam;
      cameraBounds(cam, pxW, pxH, SW, SH, inL, inT, inR, inB, room, topPx);
      st[9] = Math.max(cam[0], Math.min(cam[1], st[9]));
      st[10] = Math.max(cam[2], Math.min(cam[3], st[10]));
      const camX = st[9];
      const camY = st[10];
      ground.value = [{ translateX: -camX }, { translateY: -camY }];

      // --- next to a thing: computed here, sent to the rules at most ten times a second -------------------
      const body = st[5] === 1 ? motion.truckR : motion.workerR;
      const ni = nearestAct(acts, bx, by, body + motion.reach);
      if (near.value !== ni) near.value = ni;
      if (info.timestamp - st[11] >= 100) {
        st[11] = info.timestamp;
        runOnJS(onSample)(ni, bx, by, st[5], ux !== 0 || uy !== 0 ? 1 : 0);
      }

      // --- the sprites of this frame ---------------------------------------------------------------------
      const R = rules.value;
      let n = 0;
      // One view of the camera for every sprite of this frame (worklets copy what they close over: `addItem`
      // gets everything as arguments and returns the new count, never a closure that changes `n`).
      const V = S.view;
      V[0] = camX;
      V[1] = camY;
      V[2] = ppm;
      V[3] = tilt;
      V[4] = lift;
      V[5] = SW;
      V[6] = SH;
      V[7] = N;
      // Decals on the ground first: the mark round the thing next to the body, the cut ring.
      if (ni >= 0) {
        const pi = acts[ni * ACT_STRIDE];
        n = addItem(S, n, DECAL + py[pi], ids.mark, px[pi], py[pi], 0, ids.ringScale[pi], 0.55 + 0.25 * Math.sin(clock * 6));
      }
      let actors = 0;
      for (let i = 0; i < props.length; i++) {
        const ai = ids.act[i];
        if (ai >= 0 && acts[ai * ACT_STRIDE + 1] === ACT_WRECK) {
          const c = ai < R.cut.length ? R.cut[ai] : 0;
          if (c >= 2) n = addItem(S, n, py[i], ids.pieces[i], px[i], py[i], 0, 1, 1);
          else {
            const shake = c > 0 ? Math.sin(clock * 60) * 0.04 : 0;
            n = addItem(S, n, py[i], ids.prop[i], px[i] + shake, py[i], 0, 1 - 0.14 * c, 1);
            if (c > 0) n = addItem(S, n, DECAL + py[i] + 0.01, ids.ring[Math.min(RING_STEPS, Math.max(1, Math.round(c * RING_STEPS)))], px[i], py[i], 0, ids.ringScale[i], 1);
          }
        } else if (ids.prop[i] >= 0) n = addItem(S, n, py[i], ids.prop[i], px[i], py[i], 0, 1, 1);
      }
      // Helpers: to the wreck, a pause, back to the machine with two pieces, a pause; on their own paths.
      for (let h = 0; h < hPts.length; h++) {
        const pts = hPts[h];
        const L = hLen[h];
        if (L <= 0) continue;
        const go = L / motion.helperSpeed;
        const wait = 1.6;
        const cycle = 2 * go + 2 * wait;
        let u = (clock + hPhase[h]) % cycle;
        let dist = 0;
        let back = false;
        let moving = false;
        if (u < wait) dist = 0;
        else if (u < wait + go) {
          dist = (u - wait) * motion.helperSpeed;
          moving = true;
        } else if (u < 2 * wait + go) {
          dist = L;
          back = true;
        } else {
          u -= 2 * wait + go;
          dist = L - u * motion.helperSpeed;
          back = true;
          moving = true;
        }
        // The point at `dist` along the polyline, and the segment's direction.
        let rem = dist;
        let hx = pts[0];
        let hy = pts[1];
        let dx = 0;
        let dy = 1;
        for (let j = 2; j < pts.length; j += 2) {
          const sx = pts[j] - pts[j - 2];
          const sy = pts[j + 1] - pts[j - 1];
          const sl = Math.sqrt(sx * sx + sy * sy);
          dx = sx;
          dy = sy;
          if (rem <= sl || j + 2 >= pts.length) {
            const f = sl > 0 ? Math.min(1, rem / sl) : 0;
            hx = pts[j - 2] + sx * f;
            hy = pts[j - 1] + sy * f;
            break;
          }
          rem -= sl;
        }
        if (back && moving) {
          dx = -dx;
          dy = -dy;
        }
        const face = !moving ? 0 : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 0 : 2;
        const frame = moving ? Math.floor(dist / 0.35) % WALK_FRAMES : 0;
        n = addItem(S, n, hy, ids.helper[face * WALK_FRAMES + frame], hx, hy, 0, 1, 1);
        if (back) {
          n = addItem(S, n, hy + 0.001, ids.piece, hx, hy, 1.95, 1, 1);
          n = addItem(S, n, hy + 0.002, ids.piece, hx, hy, 2.25, 1, 1);
        }
        actors++;
      }
      // The truck, and the worker (on foot) with the carried stack over the head (on the bed when driving).
      const carried = Math.min(capacity, R.carried);
      if (hasTruck) {
        const k = ((Math.round(st[4] / (TAU / TRUCK_HEADINGS)) % TRUCK_HEADINGS) + TRUCK_HEADINGS) % TRUCK_HEADINGS;
        n = addItem(S, n, st[3], ids.truck[k], st[2], st[3], 0, 1, 1);
        if (st[5] === 1) for (let i = 0; i < carried; i++) n = addItem(S, n, st[3] + 0.001 * (i + 1), ids.piece, st[2] - Math.cos(st[4]) * 0.6, st[3] - Math.sin(st[4]) * 0.6, 0.95 + i * 0.3, 1, 1);
        actors++;
      }
      if (st[5] === 0) {
        const frame = st[7] > 0 ? Math.floor(st[7] / 0.35) % WALK_FRAMES : 0;
        n = addItem(S, n, st[1], ids.worker[st[8] * WALK_FRAMES + frame], st[0], st[1], 0, 1, 1);
        for (let i = 0; i < carried; i++) n = addItem(S, n, st[1] + 0.001 * (i + 1), ids.piece, st[0], st[1], 1.95 + i * 0.3, 1, 1);
        actors++;
      }

      // --- depth sort (lower on screen in front): insertion sort, nearly sorted from frame to frame ----------
      const order = S.order;
      if (S.count !== n) {
        for (let i = 0; i < n; i++) order[i] = i;
        S.count = n;
      }
      for (let i = 1; i < n; i++) {
        const v = order[i];
        const kv = S.key[v];
        let j = i - 1;
        while (j >= 0 && S.key[order[j]] > kv) {
          order[j + 1] = order[j];
          j--;
        }
        order[j + 1] = v;
      }
      const X = xf.value;
      const RC = rc.value;
      const C = col.value;
      for (let i = 0; i < n; i++) {
        const it = order[i];
        const o = S.spr[it] * 6;
        const k = S.sc[it] / density;
        X[i].set(k, 0, S.sx[it] - rects[o + 4] * k, S.sy[it] - rects[o + 5] * k);
        RC[i].setXYWH(rects[o], rects[o + 1], rects[o + 2], rects[o + 3]);
        const a = S.al[it];
        const c = C[i];
        c[0] = a;
        c[1] = a;
        c[2] = a;
        c[3] = a;
      }
      for (let i = n; i < N; i++) X[i].set(0, 0, -9999, -9999);
      notifyChange(xf);
      notifyChange(rc);
      notifyChange(col);

      // --- the development panel's numbers: five one-second buckets -----------------------------------------
      // Frames a second count only COMPLETE seconds (the current one is still filling); the worst frame
      // takes every bucket of the last five seconds, the current one too.
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
            // The first second of the loop began part-way: skipped like the current one.
            if (bs === sec || bs <= first) continue;
            frames += b[q * 3];
            whole++;
          }
          stats.value = { fps: whole > 0 ? frames / whole : 0, worstMs: worst, actors, sprites: n };
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [N, rects, density, ids, motion, solids, acts, props, px, py, hPts, hLen, hPhase, ppm, tilt, lift, YW, YD, pxW, pxH, SW, SH, capacity, measure, onSample, onDriving, hasTruck, inL, inT, inR, inB, topPx, room],
  );
  const cb = useFrameCallback(onFrame, false);
  useEffect(() => {
    cb.setActive(active);
    return () => cb.setActive(false);
  }, [active, cb]);
  return useMemo(() => ({ ...bufs, ground, near, stats, exit, capacity }), [bufs, ground, near, stats, exit, capacity]);
}
