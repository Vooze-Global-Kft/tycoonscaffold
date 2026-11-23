/**
 * The play canvas's one frame callback (spec 4.5): on the UI thread it advances every moving thing
 * from one clock and writes what the canvas reads:
 * - the sprite buffers of the two moment layers (items: goods in flight; fx: puffs, flashes, the
 *   ticket's fold, the lantern, coins), changed in place and announced with notifyChange;
 * - each counter's customer bob and step-up, its ticket's shake and lit rows;
 * - the paid tickets' FILLED stamp (two slots);
 * - the pulse of the match glow.
 * It draws every vsync only while a finger is down or a moment plays, else at most 30 frames a
 * second, and it stops while a full-screen spoke covers the canvas (nothing invisible animates).
 * The JavaScript thread never reads a value written here.
 * Code in here runs on the UI thread: it calls only worklets and Skia host methods.
 */
import { Skia, notifyChange, type SkColor, type SkHostRect, type SkRSXform } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo } from 'react';
import { makeMutable, useFrameCallback, useSharedValue, type FrameInfo, type SharedValue } from 'react-native-reanimated';
import { K_ARRIVE, K_PAID, K_SHAKE, K_SPRITE, ease, tweenAt, type Tween, E_OUT } from './effects';

/** Sprites drawn at once in each moment layer. */
export const ITEM_SLOTS = 24;
export const FX_SLOTS = 64;
export const COUNTERS = 4;
export const PAID_SLOTS = 2;
/** Least time between two drawn frames when nothing moves fast (30 a second). */
const SLOW_MS = 32;
/** The stamp falls in 0.22 s and rests on the ticket until the fold begins at 0.7 s. */
const STAMP_IN = 0.22;
/** The paid slot's life at normal speed (beats.ts: the fold begins then). */
const PAID_D = 0.9;
/** The stamp falls once the last good has landed on the ticket. */
const STAMP_AT = 0.18;
const OFF = [{ translateX: -9999 }, { translateY: -9999 }];

/** The live drag as the JavaScript thread writes it (screen points); `on` 0 when no finger drags a good. */
export interface DragState {
  on: number;
  x: number;
  y: number;
  /** The outlined target's centre and which outline (0 none, 1 cell, 2 counter, 3 banner, 4 Basket). */
  tx: number;
  ty: number;
  tk: number;
}
export const NO_DRAG: DragState = { on: 0, x: 0, y: 0, tx: 0, ty: 0, tk: 0 };

export interface PlayAnim {
  xfI: SharedValue<SkRSXform[]>;
  rcI: SharedValue<SkHostRect[]>;
  colI: SharedValue<SkColor[]>;
  xfF: SharedValue<SkRSXform[]>;
  rcF: SharedValue<SkHostRect[]>;
  colF: SharedValue<SkColor[]>;
  bust: SharedValue<{ translateY: number }[]>[];
  ticket: SharedValue<{ translateX: number }[] | { translateY: number }[] | any[]>[];
  lit: SharedValue<number>[];
  /** Off screen while there is nothing to show (a Group's opacity alone does not hide a Picture on the web). */
  litXf: SharedValue<any[]>[];
  paidXf: SharedValue<any[]>[];
  stamp: SharedValue<any[]>[];
  stampOp: SharedValue<number>[];
  glow: SharedValue<number>;
}

function hide(xf: SkRSXform) {
  'worklet';
  xf.set(0, 0, -9999, -9999);
}

/** Places sprite `s` ([x, y, w, h, ax, ay] in atlas pixels) with its anchor at (x, y). */
function put(xf: SkRSXform, rc: SkHostRect, col: SkColor, s: number[] | undefined, density: number, x: number, y: number, ang: number, size: number, alpha: number): boolean {
  'worklet';
  if (!s || alpha <= 0.003) return false;
  const k = size / density;
  const sc = k * Math.cos(ang);
  const ss = k * Math.sin(ang);
  xf.set(sc, ss, x - (sc * s[4] - ss * s[5]), y - (ss * s[4] + sc * s[5]));
  rc.setXYWH(s[0], s[1], s[2], s[3]);
  const a = Math.min(1, alpha);
  col[0] = a;
  col[1] = a;
  col[2] = a;
  col[3] = a;
  return true;
}

export function usePlayAnim(tweens: SharedValue<Tween[]>, drag: SharedValue<DragState>, items: Record<string, number[]>, itemsDensity: number, fx: Record<string, number[]>, fxDensity: number, active: boolean): PlayAnim {
  const bufs = useMemo(
    () => ({
      xfI: makeMutable(Array.from({ length: ITEM_SLOTS }, () => Skia.RSXform(0, 0, -9999, -9999))),
      rcI: makeMutable(Array.from({ length: ITEM_SLOTS }, () => Skia.XYWHRect(0, 0, 1, 1))),
      colI: makeMutable(Array.from({ length: ITEM_SLOTS }, () => Skia.Color('white'))),
      xfF: makeMutable(Array.from({ length: FX_SLOTS }, () => Skia.RSXform(0, 0, -9999, -9999))),
      rcF: makeMutable(Array.from({ length: FX_SLOTS }, () => Skia.XYWHRect(0, 0, 1, 1))),
      colF: makeMutable(Array.from({ length: FX_SLOTS }, () => Skia.Color('white'))),
      bust: Array.from({ length: COUNTERS }, () => makeMutable<{ translateY: number }[]>([{ translateY: 0 }])),
      ticket: Array.from({ length: COUNTERS }, () => makeMutable<any[]>([{ translateX: 0 }, { translateY: 0 }])),
      lit: Array.from({ length: COUNTERS }, () => makeMutable(0)),
      litXf: Array.from({ length: COUNTERS }, () => makeMutable<any[]>(OFF)),
      paidXf: Array.from({ length: PAID_SLOTS }, () => makeMutable<any[]>(OFF)),
      stamp: Array.from({ length: PAID_SLOTS }, () => makeMutable<any[]>(OFF)),
      stampOp: Array.from({ length: PAID_SLOTS }, () => makeMutable(0)),
      glow: makeMutable(1),
    }),
    [],
  );
  // UI-only: when each tween was first seen (ms), the last drawn frame, whether the last frame drew a moment.
  const born = useSharedValue<Record<number, number>>({});
  const lastDraw = useSharedValue(-1e9);
  const wasBusy = useSharedValue(1);

  const { xfI, rcI, colI, xfF, rcF, colF, bust, ticket, lit, litXf, paidXf, stamp, stampOp, glow } = bufs;

  const onFrame = useCallback(
    (info: FrameInfo) => {
      'worklet';
      const ts = info.timestamp;
      const list = tweens.value;
      const b = born.value;
      // Stamp new tweens, and see whether any still runs.
      let busy = false;
      let maxId = 0;
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        if (t.id > maxId) maxId = t.id;
        let t0 = b[t.id];
        if (t0 === undefined) {
          t0 = ts;
          b[t.id] = ts;
        }
        if ((ts - t0) / 1000 <= t.delay + t.d + t.hold) busy = true;
      }
      const fast = busy || drag.value.on !== 0;
      if (!fast && !wasBusy.value && ts - lastDraw.value < SLOW_MS) return;
      lastDraw.value = ts;
      wasBusy.value = busy ? 1 : 0;
      const sec = ts / 1000;

      // Idle life: each customer's gentle bob (one clock, a phase each), the match glow's pulse.
      const bobs = [0, 0, 0, 0];
      const dx = [0, 0, 0, 0];
      const dy = [0, 0, 0, 0];
      const lt = [0, 0, 0, 0];
      for (let j = 0; j < COUNTERS; j++) bobs[j] = -1.4 * Math.abs(Math.sin(sec * 1.25 + j * 1.9));
      glow.value = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(sec * 4.2));
      const pOp = [0, 0];
      const sX = [0, 0];
      const sY = [0, 0];
      const sS = [1, 1];
      const sO = [0, 0];

      const I = xfI.value;
      const RI = rcI.value;
      const CI = colI.value;
      const F = xfF.value;
      const RF = rcF.value;
      const CF = colF.value;
      let ni = 0;
      let nf = 0;
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        const age = (ts - b[t.id]) / 1000;
        if (t.k === K_SPRITE) {
          const st = tweenAt(t, age);
          if (!st) continue;
          if (t.layer === 0) {
            if (ni < I.length && put(I[ni], RI[ni], CI[ni], items[t.s], itemsDensity, st.x, st.y, st.r, st.a, st.o)) ni++;
          } else if (nf < F.length && put(F[nf], RF[nf], CF[nf], fx[t.s], fxDensity, st.x, st.y, st.r, st.a, st.o)) nf++;
        } else if (t.k === K_ARRIVE || t.k === K_SHAKE) {
          const j = t.x0;
          if (j < 0 || j >= COUNTERS || age < t.delay || age > t.delay + t.d) continue;
          const u = Math.min(1, (age - t.delay) / t.d);
          if (t.k === K_ARRIVE) {
            const e = ease(E_OUT, u);
            dy[j] += 18 * (1 - e);
          } else {
            const fall = 1 - u;
            dx[j] += Math.sin(age * 46) * 5 * fall * (u < 0.65 ? 1 : 0);
            lt[j] = Math.max(lt[j], fall);
          }
        } else if (t.k === K_PAID) {
          const s = t.x0;
          if (s < 0 || s >= 2 || age < t.delay || age > t.delay + t.d) continue;
          const k = t.d / PAID_D;
          const u = Math.max(0, Math.min(1, (age - t.delay - STAMP_AT * k) / (STAMP_IN * k)));
          pOp[s] = 1;
          sX[s] = t.x1;
          sY[s] = t.y1;
          sS[s] = 1.6 - 0.6 * ease(E_OUT, u);
          sO[s] = Math.min(1, u * 1.6);
        }
      }
      for (let i = ni; i < I.length; i++) hide(I[i]);
      for (let i = nf; i < F.length; i++) hide(F[i]);
      notifyChange(xfI);
      notifyChange(rcI);
      notifyChange(colI);
      notifyChange(xfF);
      notifyChange(rcF);
      notifyChange(colF);
      for (let j = 0; j < COUNTERS; j++) {
        bust[j].value = [{ translateY: bobs[j] + dy[j] }];
        ticket[j].value = [{ translateX: dx[j] }, { translateY: dy[j] }];
        if (lit[j].value !== lt[j]) {
          if ((lit[j].value > 0) !== (lt[j] > 0)) litXf[j].value = lt[j] > 0 ? [{ translateX: 0 }] : OFF;
          lit[j].value = lt[j];
        }
      }
      for (let s = 0; s < 2; s++) {
        if (pOp[s] !== (paidXf[s].value.length === 1 ? 1 : 0)) paidXf[s].value = pOp[s] ? [{ translateX: 0 }] : OFF;
        if (stampOp[s].value !== sO[s]) stampOp[s].value = sO[s];
        if (sO[s] > 0) stamp[s].value = [{ translateX: sX[s] }, { translateY: sY[s] }, { scale: sS[s] }];
      }
      // Forget tweens no longer listed (the JavaScript side drops ended ones).
      let keys = 0;
      for (const k in b) {
        keys++;
        if (keys > 160) break;
      }
      if (keys > 160) {
        const keep: Record<number, number> = {};
        for (let i = 0; i < list.length; i++) keep[list[i].id] = b[list[i].id];
        born.value = keep;
      }
      void maxId;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tweens, drag, items, itemsDensity, fx, fxDensity],
  );
  const cb = useFrameCallback(onFrame, false);
  useEffect(() => {
    cb.setActive(active);
    return () => cb.setActive(false);
  }, [active, cb]);

  return bufs as PlayAnim;
}
