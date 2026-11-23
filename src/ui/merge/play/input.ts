/**
 * The play canvas's touch input (spec 4.3, 2.5): a drag, tap-tap and the long press, on one view
 * over the street and the board.
 *
 * The specification names react-native-gesture-handler's Pan and Gesture.Exclusive; that package
 * is not in this project and no native dependency may be added (BRIEF), so this follows the second
 * game's proven field input: React Native's responder on the JavaScript thread. What 4.3 asks of the
 * gesture is kept: one pointer, tracked by its id; a second finger cancels the drag and the good goes
 * home; a drag starts after 4 pt; the position is written to a shared value the UI thread draws
 * from (the JavaScript thread never reads it); the hit test is the one worklet of ./geometry.ts at
 * the finger point; on release exactly one call of the store's drop action with the source cell and
 * the target code. A tap and a long press (0.4 s still) exclude each other: once the chip shows,
 * the lift does nothing else.
 *
 * Tap-tap (2.5) goes through uiState: a tap on a good arms it; a tap on a target runs the same drop;
 * a tap on the armed good or on anything that is not a target disarms. With nothing armed a tap opens
 * what 4.2 lists (a stall front its sheet, a counter its ticket detail, the next shutter its confirm,
 * the banner the Season scroll).
 */
import { useEffect, useMemo, useRef } from 'react';
import type { GestureResponderEvent, ViewProps } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import * as R from '../../../engine/merge';
import { mergeActions, mergeNow } from '../../../modes/merge/actions';
import { fx } from '../../../services/fx';
import type { MergeLayout } from '../layout';
import { useMergeUi } from '../uiState';
import { FLOAT_LIFT, FRONT_BASE, cellCentre, hitTest, tapTest, targetRect, type HitGeo } from './geometry';
import { NO_DRAG, type DragState } from './usePlayAnim';

/** 4.3: a drag starts after this many points. */
export const DRAG_START = 4;
/** 4.2: a long press is this long and still. */
export const LONG_PRESS_MS = 400;
/** A release this close to where it started, this soon, on its own cell, is a tap (a finger is never perfectly still). */
const TAP_SLOP = 10;
const TAP_MS = 350;

type Pt = { x: number; y: number };

/** Where the drop that is running now came from: read by the canvas's event listener while the action emits. */
export interface DropContext {
  from: Pt | null;
  fromCell: number | null;
}
export const dropContext: DropContext = { from: null, fromCell: null };

let down = false;
/** A finger is on the play canvas (nothing may open by itself meanwhile, 3.1). uiState's `fingerDown` mirrors it for the firefly and the away report. */
export function fingerDown(): boolean {
  return down;
}
function setDown(v: boolean): void {
  down = v;
  useMergeUi.getState().setFingerDown(v);
}

/** Whether `code` is a target the good of `from` can be dropped on (an open cell, a counter with a ticket, the banner, the Basket). */
export function isTarget(m: R.MergeState, code: number, from: number): boolean {
  if (code >= 0 && code < R.BOARD_CELLS) {
    const cell = m.board[code];
    return code !== from && cell !== 'shutter' && cell !== 'block' && !(cell === null && m.basketUndo?.cell === code);
  }
  if (code >= R.TARGET_COUNTER && code < R.TARGET_COUNTER + 4) return !!m.counters[code - R.TARGET_COUNTER]?.ticket;
  return code === R.TARGET_FESTIVAL || code === R.TARGET_BASKET;
}

/** The outline kind of a target code: 1 cell, 2 counter, 3 banner, 4 Basket. */
export function outlineKind(code: number): number {
  if (code >= 0 && code < R.BOARD_CELLS) return 1;
  if (code >= R.TARGET_COUNTER && code < R.TARGET_COUNTER + 4) return 2;
  if (code === R.TARGET_FESTIVAL) return 3;
  if (code === R.TARGET_BASKET) return 4;
  return 0;
}

/** Runs the drop of the good of `from` on `code` (a drag's release or tap-tap) with its beat's context. One call of the store's action. */
export function runDrop(from: number, code: number, at: Pt | null): R.DropResult | null {
  dropContext.from = at;
  dropContext.fromCell = from;
  let res: R.DropResult | null = null;
  try {
    res = mergeActions.dropAt(from, code);
  } finally {
    dropContext.from = null;
    dropContext.fromCell = null;
  }
  // A refused drop changes nothing and reports no event: the held good still has to go home.
  if (at && (res === null || res.kind === 'return')) returned(from, at);
  return res;
}

let returned: (cell: number, at: Pt) => void = () => {};
/** The canvas's beat for a good that goes home (a refused drop, a cancelled drag). */
export function onReturned(fn: (cell: number, at: Pt) => void): void {
  returned = fn;
}

/**
 * Tap-tap's second tap on a target outside the play canvas (the bottom row's Basket, BARS): drops
 * the armed good there and disarms. Returns false when nothing is armed (the button then does its own thing).
 */
export function dropArmedOn(code: number): boolean {
  const ui = useMergeUi.getState();
  const a = ui.armed;
  if (a === null) return false;
  ui.disarm();
  runDrop(a, code, null);
  return true;
}

/** A tap at `p` (nothing dragged). */
export function tapAt(code: number): void {
  const now = mergeNow();
  if (!now) return;
  const ui = useMergeUi.getState();
  const m = now.g.merge;
  if (ui.armed !== null) {
    const a = ui.armed;
    ui.disarm();
    if (code !== a && isTarget(m, code, a)) runDrop(a, code, null);
    return;
  }
  if (code >= 0 && code < R.BOARD_CELLS) {
    const cell = m.board[code];
    if (R.isGood(cell)) {
      ui.arm(code);
      return;
    }
    if (cell === 'shutter') {
      const p = R.mergeParams(now.cfg, now.g);
      const group = p.shutters.findIndex((s) => s?.cell === code);
      if (group >= 0) ui.openSheet({ type: 'shutter', group });
    }
    return;
  }
  if (code >= R.TARGET_COUNTER && code < R.TARGET_COUNTER + 4) {
    const j = code - R.TARGET_COUNTER;
    if (m.counters[j]?.ticket) ui.openSheet({ type: 'ticket', counter: j });
    return;
  }
  if (code === R.TARGET_FESTIVAL) {
    ui.openSpoke('season');
    return;
  }
  if (code >= FRONT_BASE && code < FRONT_BASE + R.CHAINS) ui.openSheet({ type: 'stall', chain: code - FRONT_BASE });
}

interface Touch {
  id: string | number | undefined;
  start: Pt;
  t0: number;
  code: number;
  /** The good under the finger at the start (a drag can begin), or -1. */
  cell: number;
  moved: boolean;
  pressed: boolean;
  dragging: boolean;
  last: Pt;
}

function fingerOf(e: GestureResponderEvent, id: Touch['id']): Pt | null {
  const ne = e.nativeEvent;
  const all = [...(ne.changedTouches ?? []), ...(ne.touches ?? [])];
  const t = id === undefined ? null : all.find((x) => x.identifier === id);
  if (t) return { x: t.pageX, y: t.pageY };
  return id === undefined || !(ne.touches ?? []).length ? { x: ne.pageX, y: ne.pageY } : null;
}

export interface PlayInput {
  responder: Pick<ViewProps, 'onStartShouldSetResponder' | 'onMoveShouldSetResponder' | 'onResponderGrant' | 'onResponderMove' | 'onResponderStart' | 'onResponderRelease' | 'onResponderTerminate' | 'onResponderTerminationRequest'>;
}

/**
 * The input of the play canvas. `onHold` tells the canvas which good the finger lifted (it hides
 * it in its cell and draws it floating), or null when the drag ends.
 */
export function usePlayInput(L: MergeLayout, geo: HitGeo, drag: SharedValue<DragState>, onHold: (cell: number | null) => void): PlayInput {
  const touch = useRef<Touch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef({ L, geo, onHold });
  ref.current = { L, geo, onHold };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (down) setDown(false);
    },
    [],
  );

  const responder = useMemo<PlayInput['responder']>(() => {
    const clearTimer = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
    const stopDrag = () => {
      drag.value = NO_DRAG;
      ref.current.onHold(null);
    };
    const end = () => {
      clearTimer();
      touch.current = null;
      setDown(false);
    };
    /** A second finger, or the system took the touch: the good goes home, nothing else happens. */
    const cancel = () => {
      const t = touch.current;
      if (t?.dragging) {
        // Not a drop: no rules call; the good flies home with the sound of a return.
        returned(t.cell, { x: t.last.x, y: t.last.y - FLOAT_LIFT });
        fx.play('return');
        stopDrag();
      }
      end();
    };
    const write = (t: Touch, p: Pt) => {
      const { geo: g } = ref.current;
      const now = mergeNow();
      const code = hitTest(p.x, p.y, g);
      const ok = !!now && isTarget(now.g.merge, code, t.cell);
      const r = ok ? targetRect(code, g) : null;
      drag.value = { on: 1, x: p.x, y: p.y, tx: r ? r.x + r.w / 2 : 0, ty: r ? r.y + r.h / 2 : 0, tk: r ? outlineKind(code) : 0 };
    };
    return {
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderTerminationRequest: () => !touch.current?.dragging,
      onResponderGrant: (e: GestureResponderEvent) => {
        clearTimer();
        const ui = useMergeUi.getState();
        if (ui.chip !== null) ui.hideChip();
        const p = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        const { L: lay, geo: g } = ref.current;
        const code = tapTest(p.x, p.y, lay, g);
        const now = mergeNow();
        const cell = now && code >= 0 && code < R.BOARD_CELLS && R.isGood(now.g.merge.board[code]) ? code : -1;
        const t: Touch = { id: e.nativeEvent.identifier, start: p, t0: Date.now(), code, cell, moved: false, pressed: false, dragging: false, last: p };
        touch.current = t;
        setDown(true);
        if (cell >= 0) {
          timer.current = setTimeout(() => {
            const cur = touch.current;
            if (!cur || cur !== t || cur.moved) return;
            cur.pressed = true;
            useMergeUi.getState().showChip(cell);
            fx.play('ui_open');
          }, LONG_PRESS_MS);
        }
      },
      // Another finger touched the glass (4.3: a second pointer cancels the drag).
      onResponderStart: (e: GestureResponderEvent) => {
        if ((e.nativeEvent.touches ?? []).length > 1) cancel();
      },
      onResponderMove: (e: GestureResponderEvent) => {
        const t = touch.current;
        if (!t) return;
        if ((e.nativeEvent.touches ?? []).length > 1) {
          cancel();
          return;
        }
        const p = fingerOf(e, t.id);
        if (!p) return;
        t.last = p;
        if (!t.moved) {
          if (Math.hypot(p.x - t.start.x, p.y - t.start.y) < DRAG_START) return;
          // The pan and the long press are separate (4.3): a finger that moves after the chip showed
          // still drags (the chip goes), and a busy JavaScript thread that ran the press timer before
          // the first move event cannot turn a drag into a press.
          if (t.pressed && t.cell >= 0) {
            t.pressed = false;
            useMergeUi.getState().hideChip();
          }
          t.moved = true;
          clearTimer();
          if (t.pressed || t.cell < 0) return;
          t.dragging = true;
          const ui = useMergeUi.getState();
          if (ui.armed !== null) ui.disarm();
          ref.current.onHold(t.cell);
        }
        if (t.dragging) write(t, p);
      },
      onResponderRelease: (e: GestureResponderEvent) => {
        const t = touch.current;
        if (!t) return end();
        const p = fingerOf(e, t.id) ?? t.last;
        if (t.pressed) return end();
        if (t.dragging) {
          const code = hitTest(p.x, p.y, ref.current.geo);
          const still = Math.hypot(p.x - t.start.x, p.y - t.start.y) < TAP_SLOP && Date.now() - t0Of(t) < TAP_MS;
          if (code === t.cell && still) {
            stopDrag();
            end();
            tapAt(code);
            return;
          }
          runDrop(t.cell, code, { x: p.x, y: p.y - FLOAT_LIFT });
          stopDrag();
          return end();
        }
        end();
        tapAt(t.code);
      },
      onResponderTerminate: () => cancel(),
    };
  }, [drag]);
  return { responder };
}

const t0Of = (t: Touch) => t.t0;

/** The centre of a cell, for callers placing a chip. */
export const centreOfCell = cellCentre;
