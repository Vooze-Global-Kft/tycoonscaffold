/**
 * The field's frame loop (spec 4.3 "Frame loop"): ONE frame callback on the UI thread. It reads
 * the frame table the JavaScript thread pushes at each tick (model.ts `buildFrame`), interpolates
 * the run clock between ticks, and writes:
 * - the RSXforms, sprite rectangles and colours of the two atlas draws (A: rocks and overlays,
 *   under the rigs; B: drill heads, chunks, debris and drones, over them), into buffers made once
 *   and changed in place (no allocation per sprite per frame);
 * - a few shared numbers and transforms the declarative layers read: the starfield drift, the
 *   station ring's turn, the route dash phases, blinks and pulses, the freighter's flight, the warp
 *   flash and the flare's trail.
 * The callback stops while a full-screen spoke covers the field (`active`), so nothing invisible
 * animates. Code in here runs on the UI thread: it calls only worklets and Skia host methods.
 */
import { Skia, notifyChange, type SkColor, type SkHostRect, type SkRSXform } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo } from 'react';
import { makeMutable, useFrameCallback, useSharedValue, type FrameInfo, type SharedValue } from 'react-native-reanimated';
import { ATLAS_A, ATLAS_B, MAX_DRAWN_PER_ROUTE, type FrameTable } from './model';

const TAU = Math.PI * 2;
/** Climb and land times of the freighter (spec 2.3); the warp flash lasts 0.5 s. */
const CLIMB = 2.5;
const LAND = 2;
const FLASH = 0.5;

export interface FieldGeometry {
  /** Freighter pad centre (in the bay) and the height it climbs to (off the top of the field). */
  padX: number;
  padY: number;
  topY: number;
  /** The station centre and radius (the hold queue orbits it). */
  sx: number;
  sy: number;
  sr: number;
  /** Screen height (the starfield tiles vertically). */
  height: number;
  /** Dash periods of the route ores, in ORE_IDS order. */
  periods: number[];
}

export interface FieldAnim {
  xfA: SharedValue<SkRSXform[]>;
  rcA: SharedValue<SkHostRect[]>;
  colA: SharedValue<SkColor[]>;
  xfB: SharedValue<SkRSXform[]>;
  rcB: SharedValue<SkHostRect[]>;
  colB: SharedValue<SkColor[]>;
  starY: SharedValue<{ translateY: number }[]>;
  starY2: SharedValue<{ translateY: number }[]>;
  ringTurn: SharedValue<{ rotate: number }[]>;
  phases: SharedValue<number>[];
  blink: SharedValue<number>;
  breathe: SharedValue<number>;
  pulse: SharedValue<number>;
  bob: SharedValue<{ translateY: number }[]>;
  ship: SharedValue<{ translateX: number }[] | { translateY: number }[] | { translateX: number; translateY: number }[] | any[]>;
  shipOn: SharedValue<number>;
  flame: SharedValue<number>[];
  flash: SharedValue<any[]>;
  flashOn: SharedValue<number>;
  flare: SharedValue<any[]>;
  flareOn: SharedValue<number>;
  /** Mean frame interval and sprite count, for the frame-time check. */
  stats: SharedValue<{ ms: number; sprites: number }>;
}

function hide(xf: SkRSXform) {
  'worklet';
  xf.set(0, 0, -9999, -9999);
}

/** Places sprite `s` ([x, y, w, h, ax, ay] in atlas pixels) with its anchor at (x, y). */
function put(xf: SkRSXform, rc: SkHostRect, col: SkColor, s: number[] | undefined, density: number, x: number, y: number, ang: number, size: number, alpha: number): boolean {
  'worklet';
  if (!s) {
    xf.set(0, 0, -9999, -9999);
    return false;
  }
  const k = size / density;
  const sc = k * Math.cos(ang);
  const ss = k * Math.sin(ang);
  xf.set(sc, ss, x - (sc * s[4] - ss * s[5]), y - (ss * s[4] + sc * s[5]));
  rc.setXYWH(s[0], s[1], s[2], s[3]);
  col[0] = alpha;
  col[1] = alpha;
  col[2] = alpha;
  col[3] = alpha;
  return true;
}

const easeOut = (t: number) => {
  'worklet';
  const u = Math.min(1, Math.max(0, t));
  return 1 - (1 - u) * (1 - u) * (1 - u);
};
const smooth = (t: number) => {
  'worklet';
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};

export function useFieldAnim(frame: SharedValue<FrameTable>, sprites: Record<string, number[]>, density: number, geo: FieldGeometry, active: boolean): FieldAnim {
  const bufs = useMemo(
    () => ({
      xfA: makeMutable(Array.from({ length: ATLAS_A }, () => Skia.RSXform(0, 0, -9999, -9999))),
      rcA: makeMutable(Array.from({ length: ATLAS_A }, () => Skia.XYWHRect(0, 0, 1, 1))),
      colA: makeMutable(Array.from({ length: ATLAS_A }, () => Skia.Color('white'))),
      xfB: makeMutable(Array.from({ length: ATLAS_B }, () => Skia.RSXform(0, 0, -9999, -9999))),
      rcB: makeMutable(Array.from({ length: ATLAS_B }, () => Skia.XYWHRect(0, 0, 1, 1))),
      colB: makeMutable(Array.from({ length: ATLAS_B }, () => Skia.Color('white'))),
    }),
    [],
  );
  const starY = useSharedValue([{ translateY: 0 }]);
  const starY2 = useSharedValue([{ translateY: -geo.height }]);
  const ringTurn = useSharedValue([{ rotate: 0 }]);
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);
  const phases = useMemo(() => [p0, p1, p2, p3, p4], [p0, p1, p2, p3, p4]);
  const blink = useSharedValue(1);
  const breathe = useSharedValue(1);
  const pulse = useSharedValue(1);
  const bob = useSharedValue([{ translateY: 0 }]);
  const ship = useSharedValue<any[]>([{ translateX: geo.padX }, { translateY: geo.padY }]);
  const shipOn = useSharedValue(0);
  const f0 = useSharedValue(0);
  const f1 = useSharedValue(0);
  const f2 = useSharedValue(0);
  const flame = useMemo(() => [f0, f1, f2], [f0, f1, f2]);
  const flash = useSharedValue<any[]>([{ translateX: geo.padX }, { translateY: geo.topY }, { scale: 1 }]);
  const flashOn = useSharedValue(0);
  const flare = useSharedValue<any[]>([{ translateX: 0 }, { translateY: 0 }]);
  const flareOn = useSharedValue(0);
  const stats = useSharedValue({ ms: 16.7, sprites: 0 });
  // Clock interpolation state.
  const seen = useSharedValue(-1);
  const baseTs = useSharedValue(0);
  const rate = useSharedValue(1);
  const offset = useSharedValue(0);
  const lastClock = useSharedValue(0);
  const lastShown = useSharedValue(0);
  const meanMs = useSharedValue(16.7);

  const { xfA, rcA, colA, xfB, rcB, colB } = bufs;
  const { padX, padY, topY, sx, sy, sr, height, periods } = geo;

  // One stable worklet (useCallback): a new closure per render would re-register the frame callback.
  const onFrame = useCallback((info: FrameInfo) => {
    'worklet';
    const ts = info.timestamp;
    if (info.timeSincePreviousFrame !== null && info.timeSincePreviousFrame > 0) meanMs.value = meanMs.value * 0.95 + Math.min(250, info.timeSincePreviousFrame) * 0.05;
    const f = frame.value;
    // Run clock between ticks: base + elapsed x measured rate, any jump at a new tick eased out.
    if (f.version !== seen.value) {
      const dts = (ts - baseTs.value) / 1000;
      const dc = f.clock - lastClock.value;
      if (seen.value >= 0 && dts > 0.02 && dc >= 0 && dc < 120) rate.value = Math.min(64, Math.max(0, rate.value * 0.6 + (dc / dts) * 0.4));
      offset.value = seen.value >= 0 && Math.abs(lastShown.value - f.clock) < 2 ? lastShown.value - f.clock : 0;
      seen.value = f.version;
      baseTs.value = ts;
      lastClock.value = f.clock;
    }
    const el = Math.min(0.5, (ts - baseTs.value) / 1000);
    const clock = f.clock + el * rate.value + offset.value * Math.exp(-el / 0.12);
    lastShown.value = clock;
    const t = ts / 1000;

    // Starfield drift (3 pt/s), station ring (one turn per 40 s), route dashes (14 pt/s toward the station).
    const sy0 = (t * 3) % height;
    starY.value = [{ translateY: sy0 }];
    starY2.value = [{ translateY: sy0 - height }];
    ringTurn.value = [{ rotate: ((t % 40) / 40) * TAU }];
    for (let i = 0; i < phases.length; i++) {
      const per = periods[i] > 0 ? periods[i] : 14;
      phases[i].value = -((t * 14) % per);
    }
    blink.value = t % 1 < 0.5 ? 1 : 0.25;
    breathe.value = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((t * TAU) / 2));
    pulse.value = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * TAU));
    bob.value = [{ translateY: -2 * Math.abs(Math.sin(t * Math.PI * 1.4)) }];

    // Atlas A: rocks, overlays and the dry glow.
    const A = xfA.value;
    const RA = rcA.value;
    const CA = colA.value;
    const B = xfB.value;
    const RB = rcB.value;
    const CB = colB.value;
    let a = 0;
    let b = 0;
    const slots = f.slots;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.rock === '') continue;
      const drift = easeOut((clock - s.arrive) / 1.5);
      const x = s.ex + (s.x - s.ex) * drift;
      const y = s.ey + (s.y - s.ey) * drift;
      const ang = ((t % s.spin) / s.spin) * TAU + s.slot;
      if (a < A.length && put(A[a], RA[a], CA[a], sprites[s.rock], density, x, y, ang, s.size, 1)) a++;
      if (s.over !== '' && a < A.length && put(A[a], RA[a], CA[a], sprites[s.over], density, x, y, ang, s.size, 1)) a++;
      if (s.glow !== '' && a < A.length && put(A[a], RA[a], CA[a], sprites[s.glow], density, x, y, ang, s.size, 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * Math.PI)))) a++;
      // Drill heads (4 turns/s while drilling) and chunks hopping from the rig to the pile.
      if (drift >= 1) {
        for (let h = 0; h + 2 < s.heads.length; h += 3) {
          const spin = s.drilling ? (t * 4 * TAU) % TAU : 0;
          if (b < B.length && put(B[b], RB[b], CB[b], sprites.drill, density, s.heads[h], s.heads[h + 1], spin + h, s.heads[h + 2], 1)) b++;
        }
        if (s.drilling) {
          for (let j = 0; j < 2; j++) {
            const u = (t * 0.9 + j * 0.5 + s.slot * 0.17) % 1;
            const cx = s.x + (s.px - s.x) * u;
            const cy = s.y + (s.py - s.y) * u - Math.sin(u * Math.PI) * 9;
            const alpha = u < 0.85 ? 1 : (1 - u) / 0.15;
            if (b < B.length && put(B[b], RB[b], CB[b], sprites[s.chunk + ((j + s.slot) % 4)], density, cx, cy, u * 5, 0.9, alpha)) b++;
          }
        }
      }
    }
    // Crumble debris: 8 shards burst outward and fade over 0.9 s (pooled: two rocks at once).
    let bursts = 0;
    for (let i = 0; i < slots.length && bursts < 2; i++) {
      const s = slots[i];
      const k = (clock - s.crumble) / 0.9;
      if (k < 0 || k >= 1) continue;
      bursts++;
      const e = easeOut(k);
      for (let j = 0; j < 8; j++) {
        const an = (j / 8) * TAU + s.slot;
        const dist = 6 + e * (22 + (j % 3) * 7);
        if (b < B.length && put(B[b], RB[b], CB[b], sprites[s.shard + j], density, s.x + Math.cos(an) * dist, s.y + Math.sin(an) * dist, an + k * 4, s.size * 1.1, 1 - k)) b++;
      }
    }
    // Drones: at most 4 per route, spread evenly over the round trip.
    const flick = Math.floor(t * 18);
    let qi = 0;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const dn = Math.min(MAX_DRAWN_PER_ROUTE, s.n);
      if (dn <= 0) continue;
      const fly = Math.max(0.2, (s.trip - 1.2) / 2);
      for (let d = 0; d < dn; d++) {
        const tau = clock - s.routeFrom - (d * s.trip) / dn;
        let x = s.ax;
        let y = s.ay;
        let ang = s.out;
        let loaded = false;
        let moving = true;
        let visible = true;
        if (tau < 0) {
          const w = tau + fly + 0.6;
          if (w < 0) visible = false;
          else if (w < fly) {
            const u = smooth(w / fly);
            x = s.ax + (s.bx - s.ax) * u;
            y = s.ay + (s.by - s.ay) * u;
          } else {
            x = s.bx;
            y = s.by;
            moving = false;
          }
        } else {
          const u = tau % s.trip;
          if (u < 0.6) {
            moving = false;
            ang = s.out + Math.PI;
          } else if (u < 0.6 + fly) {
            const v = smooth((u - 0.6) / fly);
            x = s.ax + (s.bx - s.ax) * v;
            y = s.ay + (s.by - s.ay) * v;
          } else if (u < 1.2 + fly) {
            x = s.bx;
            y = s.by;
            moving = false;
            loaded = true;
          } else {
            const v = smooth((u - 1.2 - fly) / fly);
            loaded = true;
            ang = s.out + Math.PI;
            if (f.holdFull && v > 0.65) {
              // The hold is full: loaded drones circle the station (6 s orbit).
              const an = ((t / 6) % 1) * TAU + qi * 0.9;
              qi++;
              x = sx + Math.cos(an) * (sr + 16);
              y = sy + Math.sin(an) * (sr + 16) * 0.8;
              ang = an + Math.PI / 2;
            } else {
              x = s.bx + (s.ax - s.bx) * v;
              y = s.by + (s.ay - s.by) * v;
            }
          }
        }
        if (!visible) continue;
        if (moving && b < B.length && put(B[b], RB[b], CB[b], sprites['flame-' + ((flick + d + i) % 3)], density, x, y, ang, 1, 1)) b++;
        if (b < B.length && put(B[b], RB[b], CB[b], sprites[loaded && s.rock !== '' ? s.loaded : s.empty], density, x, y, ang, 1, 1)) b++;
      }
    }
    // Idle drones on the rack cradles, nose up.
    for (let i = 0; i + 1 < f.rack.length; i += 2) {
      if (b < B.length && put(B[b], RB[b], CB[b], sprites['drone-idle'], density, f.rack[i], f.rack[i + 1], -Math.PI / 2, 1, 1)) b++;
    }
    for (let i = a; i < A.length; i++) hide(A[i]);
    for (let i = b; i < B.length; i++) hide(B[i]);
    notifyChange(xfA);
    notifyChange(rcA);
    notifyChange(colA);
    notifyChange(xfB);
    notifyChange(rcB);
    notifyChange(colB);

    // Freighter: climbs from the pad off the top in 2.5 s, warp flash at the top, lands in 2 s.
    let fy = padY;
    let on = 0;
    if (f.phase === 1) {
      const k = 1 - Math.max(0, f.phaseT - el * rate.value) / CLIMB;
      fy = padY + (topY - padY) * k * k;
      on = 1;
    } else if (f.phase === 3) {
      const k = 1 - Math.max(0, f.phaseT - el * rate.value) / LAND;
      fy = topY + (padY - topY) * easeOut(k);
      on = 1;
    } else if (f.phase === 0) on = 2;
    ship.value = [{ translateX: padX }, { translateY: fy }];
    shipOn.value = on > 0 ? 1 : 0;
    const fl = flick % 3;
    flame[0].value = on === 1 && fl === 0 ? 1 : 0;
    flame[1].value = on === 1 && fl === 1 ? 1 : 0;
    flame[2].value = on === 1 && fl === 2 ? 1 : 0;
    // The warp flash (0.5 s, radial burst and streaks) at the top of the climb, at the warp-out.
    const wk = (clock - f.warpAt) / FLASH;
    if (wk >= 0 && wk < 1) {
      flash.value = [{ translateX: padX }, { translateY: topY + 40 }, { scale: 0.5 + wk * 1.4 }];
      flashOn.value = 1 - wk * wk;
    } else flashOn.value = 0;
    // Flare trail: 0.6 s from the launcher to the rock.
    const fk = (clock - f.flareAt) / 0.6;
    if (fk >= 0 && fk < 1) {
      const e = easeOut(fk);
      flare.value = [{ translateX: f.fx0 + (f.fx1 - f.fx0) * e }, { translateY: f.fy0 + (f.fy1 - f.fy0) * e - Math.sin(fk * Math.PI) * 40 }, { rotate: fk * 6 }];
      flareOn.value = 1 - fk * fk;
    } else flareOn.value = 0;
    stats.value = { ms: meanMs.value, sprites: a + b };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, sprites, density, padX, padY, topY, sx, sy, sr, height, periods]);
  const cb = useFrameCallback(onFrame, false);

  useEffect(() => {
    cb.setActive(active);
    return () => cb.setActive(false);
  }, [active, cb]);

  return useMemo(
    () => ({ ...bufs, starY, starY2, ringTurn, phases, blink, breathe, pulse, bob, ship, shipOn, flame, flash, flashOn, flare, flareOn, stats }),
    [bufs, starY, starY2, ringTurn, phases, blink, breathe, pulse, bob, ship, shipOn, flame, flash, flashOn, flare, flareOn, stats],
  );
}
