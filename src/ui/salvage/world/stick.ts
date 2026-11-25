/**
 * The floating stick (docs/design/yard-ground.md "Input"): ONE full-screen responder view (React
 * Native's responder system, no gesture library); a touch that begins in the stick zone (the lower
 * left of the safe area) places the stick under the thumb, the knob follows the finger up to `STICK_R`
 * and drags the base along beyond it. Per move the only work is one shared-value write from the
 * responder handler: no React state changes while steering. Release stops the worker. A second finger
 * is ignored (the first finger's identifier is followed); nothing else on this screen needs two touches.
 * The frame loop (./frameLoop.ts) reads `stick` on the UI thread.
 */
import { useMemo, useRef } from 'react';
import type { GestureResponderEvent, ViewProps } from 'react-native';
import { makeMutable } from 'react-native-reanimated';

/** The knob's travel, points. */
export const STICK_R = 52;
/** Below this share of the travel the worker stands still. */
export const DEAD = 0.12;

export interface StickValue {
  /** 1 while a thumb holds the stick. */
  on: number;
  /** The base under the thumb, screen points. */
  bx: number;
  by: number;
  /** The knob's offset from the base, points (length at most STICK_R). */
  kx: number;
  ky: number;
}

export const STICK_OFF: StickValue = { on: 0, bx: 0, by: 0, kx: 0, ky: 0 };

/** The live stick, written on the JavaScript thread by the responder, read on the UI thread. One per app. */
export const stick = makeMutable<StickValue>(STICK_OFF);

/** Where a touch may begin a stick (screen points), and how far inside the safe area the base must stay. */
export interface StickZone {
  x: number;
  y: number;
  width: number;
  height: number;
  /** The base's centre is kept inside this rectangle (the safe area minus a margin). */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function inZone(z: StickZone, x: number, y: number): boolean {
  return x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height;
}

/** The stick for a finger at (x, y) when the base was at (bx, by): the knob clamped to STICK_R, the base dragged along. Pure. */
export function follow(z: StickZone, bx: number, by: number, x: number, y: number): StickValue {
  let dx = x - bx;
  let dy = y - by;
  const d = Math.hypot(dx, dy);
  let nbx = bx;
  let nby = by;
  if (d > STICK_R) {
    nbx = x - (dx / d) * STICK_R;
    nby = y - (dy / d) * STICK_R;
    nbx = Math.max(z.minX, Math.min(z.maxX, nbx));
    nby = Math.max(z.minY, Math.min(z.maxY, nby));
    dx = x - nbx;
    dy = y - nby;
    const e = Math.hypot(dx, dy);
    if (e > STICK_R) {
      dx = (dx / e) * STICK_R;
      dy = (dy / e) * STICK_R;
    }
  }
  return { on: 1, bx: nbx, by: nby, kx: dx, ky: dy };
}

type Pt = { x: number; y: number };
type TouchPoint = { identifier?: string | number; pageX: number; pageY: number };

/** The tracked finger in a responder event: its own entry of `touches`, or null when only another finger moved. */
function fingerOf(ne: TouchPoint & { touches?: readonly TouchPoint[]; changedTouches?: readonly TouchPoint[] }, id: string | number | undefined): Pt | null {
  if (id === undefined || id === null) return { x: ne.pageX, y: ne.pageY };
  const all = [...(ne.changedTouches ?? []), ...(ne.touches ?? [])];
  if (!all.length) return { x: ne.pageX, y: ne.pageY };
  const hit = all.find((t) => t.identifier === id);
  return hit ? { x: hit.pageX, y: hit.pageY } : null;
}

/**
 * The responder props of the full-screen input view. `zone()` is read at each touch (the layout may
 * change); `enabled()` false (an overlay, the portrait card) takes no touch at all.
 */
export function useStickResponder(zone: () => StickZone, enabled: () => boolean): Pick<ViewProps, 'onStartShouldSetResponder' | 'onResponderGrant' | 'onResponderMove' | 'onResponderEnd' | 'onResponderRelease' | 'onResponderTerminate' | 'onResponderTerminationRequest'> {
  const finger = useRef<string | number | undefined | null>(null);
  return useMemo(() => {
    const stop = () => {
      finger.current = null;
      stick.value = STICK_OFF;
    };
    return {
      onStartShouldSetResponder: (e: GestureResponderEvent) => {
        if (!enabled()) return false;
        // A second finger while the first steers: not a new stick.
        if (finger.current !== null) return false;
        return inZone(zone(), e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onResponderGrant: (e: GestureResponderEvent) => {
        const z = zone();
        finger.current = e.nativeEvent.identifier;
        const bx = Math.max(z.minX, Math.min(z.maxX, e.nativeEvent.pageX));
        const by = Math.max(z.minY, Math.min(z.maxY, e.nativeEvent.pageY));
        stick.value = follow(z, bx, by, e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onResponderMove: (e: GestureResponderEvent) => {
        if (finger.current === null) return;
        const p = fingerOf(e.nativeEvent, finger.current ?? undefined);
        if (!p) return;
        const s = stick.value;
        stick.value = follow(zone(), s.bx, s.by, p.x, p.y);
      },
      // A finger lifted: the steering one ends the stick, also while another rests on the glass (the
      // responder itself is released only when the last finger lifts).
      onResponderEnd: (e: GestureResponderEvent) => {
        const id = finger.current;
        if (id === null || id === undefined) return;
        if ((e.nativeEvent.changedTouches ?? []).some((t) => t.identifier === id)) stop();
      },
      onResponderRelease: stop,
      onResponderTerminate: stop,
      // Steering is never handed to another view mid-way.
      onResponderTerminationRequest: () => false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
