/**
 * The field gesture layer (spec 4.2, errata 45, 46, 48): React Native's responder system on one
 * full-screen View (no new native dependency), all on the JavaScript thread. The views on top
 * (contract strip, comms slot, dock counter, rail buttons, the policy chip) take their own touches
 * first; the hold tank, the flare launcher and the launch track are drawn and hit-tested here.
 *
 * Modes: idle, droneSelected / flareSelected (the selection lives in useHaulUi), draggingDrone,
 * draggingFlare, swipingLaunch. 10 pt of slop starts a drag; a release inside the slop within
 * 350 ms is a tap; 350 ms still is a press; a launch is a stroke that starts in the track and rises
 * 60 pt (the latch clicks at 30). Drop: the nearest claimed rock within 40 pt; else a flick (0.5
 * pt/ms over the last 80 ms, within 15°); else cancel. Per move the work is a few subtractions and
 * one shared-value write: the drag line is drawn on the UI thread (../hud/FloatingFeedback.tsx).
 * State changes only through haulActions; sounds through fx (keys of the haul table).
 */
import { useEffect, useMemo, useRef } from 'react';
import type { GestureResponderEvent, ViewProps } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import * as H from '../../../engine/haul';
import { haulActions, haulNow } from '../../../modes/haul/actions';
import { fx } from '../../../services/fx';
import { oreColor } from '../art/palette';
import { hitTest, type FieldLayout, type Hit, type Pt } from '../layout';
import { useHaulUi } from '../uiState';
import { CLAIM_CONFIRM_MS, DRAG_DRONE, DRAG_FLARE, DRAG_NONE, DRAG_SWIPE, NO_DRAG, dragLine, useFieldInput, type DragLine } from './fieldInput';
import { LAUNCH_ARM, LAUNCH_RISE, PRESS_MS, SLOP, TAP_MS, dropTarget, flickTarget, onRack, rackGrabPoint, type Sample } from './gestureMath';

export interface FieldGestures {
  /** Spread on the full-screen gesture View. */
  responder: Pick<ViewProps, 'onStartShouldSetResponder' | 'onResponderGrant' | 'onResponderMove' | 'onResponderRelease' | 'onResponderTerminate'>;
  /** The live drag (the finger, its start and its snap target) for the drag line on the UI thread. */
  finger: SharedValue<DragLine>;
}

type Run = NonNullable<ReturnType<typeof haulNow>>;
type Drag = { kind: 'none' } | { kind: 'drone'; from: 'rack' | number } | { kind: 'flare' } | { kind: 'swipe' };

interface Touch {
  start: Pt;
  t0: number;
  hit: Hit;
  drag: Drag;
  moved: boolean;
  pressed: boolean;
  /** The current snap target: a slot, 'rack' (a recall), or null. */
  snap: number | 'rack' | null;
  armed: boolean;
  samples: Sample[];
  origin: Pt;
  color: string;
}

const MAX_SAMPLES = 8;

/** The touch's hit, corrected for what the screen really shows (errata 45, 48). */
function hitAt(p: Pt, layout: FieldLayout, now: Run): Hit {
  const h = now.g.haul;
  const hit = hitTest(
    p,
    layout,
    h.slots.map((s) => s.claimed),
    h.idle,
  );
  // The launcher is hidden until the first charge: a touch there is the bay behind it.
  if (hit.kind === 'flare' && h.flare.charges <= 0) return { kind: 'background' };
  return hit;
}

const claimed = (now: Run) => (slot: number) => !!now.g.haul.slots[slot]?.claimed;
const flareOk = (now: Run) => (slot: number) => H.canFlare(now.g, slot);

function centreOf(layout: FieldLayout, slot: number): Pt {
  const r = layout.rocks[slot];
  return r ? { x: r.x, y: r.y } : { x: 0, y: 0 };
}

function cancelSound() {
  fx.play('route_cancel');
}

/** A tap (errata 46): what it does depends on the selection. */
function tap(hit: Hit, now: Run): void {
  const ui = useHaulUi.getState();
  const sel = ui.selection;
  const h = now.g.haul;
  const input = useFieldInput.getState();
  if (hit.kind !== 'ghost' && input.claimArmed) input.arm(null);
  if (sel?.kind === 'flare') {
    ui.select(null);
    if (hit.kind === 'rock') haulActions.useFlare(hit.slot);
    else if (hit.kind !== 'flare') cancelSound();
    return;
  }
  if (sel?.kind === 'drone') {
    ui.select(null);
    if (hit.kind === 'rock') {
      if (sel.from === 'rack') haulActions.assignDrone(hit.slot);
      else if (sel.from !== hit.slot) haulActions.moveDrone(sel.from, hit.slot);
      else cancelSound();
    } else if (hit.kind === 'rack' && sel.from !== 'rack') haulActions.recallDrone(sel.from);
    else if (hit.kind === 'station' && sel.from !== 'rack' && h.idle === 0) haulActions.recallDrone(sel.from);
    else cancelSound();
    return;
  }
  switch (hit.kind) {
    case 'rack':
      ui.select({ kind: 'drone', from: 'rack' });
      fx.play('route_grab');
      return;
    case 'chip':
      if (h.slots[hit.slot]?.haulers > 0) {
        ui.select({ kind: 'drone', from: hit.slot });
        fx.play('route_grab');
      } else ui.openSheet({ type: 'rig', slot: hit.slot });
      return;
    case 'flare':
      ui.select({ kind: 'flare' });
      fx.play('route_grab');
      return;
    case 'rock':
      ui.openSheet({ type: 'rig', slot: hit.slot });
      return;
    case 'ghost': {
      // First tap shows the confirm chip ("Claim ₵260"); a second tap on the same slot buys.
      const cost = H.claimCost(now.cfg, now.g, hit.slot);
      if (!Number.isFinite(cost)) return;
      const armed = input.claimArmed;
      if (armed && armed.slot === hit.slot && Date.now() - armed.at < CLAIM_CONFIRM_MS) {
        input.arm(null);
        haulActions.claimSlot(hit.slot);
      } else {
        input.arm(hit.slot);
        fx.play('ui_tap');
      }
      return;
    }
    case 'station':
      ui.openSheet({ type: 'station' });
      return;
    default:
      return;
  }
}

/** A press (350 ms without moving): the Rig sheet of a rock or a route; the policy on the track. */
function press(hit: Hit, now: Run): boolean {
  const ui = useHaulUi.getState();
  if (hit.kind === 'rock' || hit.kind === 'chip') {
    ui.select(null);
    ui.openSheet({ type: 'rig', slot: hit.slot });
    return true;
  }
  if (hit.kind === 'launch' && now.g.haul.autopilot.online) {
    haulActions.setPolicy(now.g.haul.autopilot.policy === 'full' ? 'contract' : 'full');
    return true;
  }
  return false;
}

export function useFieldGestures(layout: FieldLayout): FieldGestures {
  const touch = useRef<Touch | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const clearPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  // A selection or confirm chip never outlives the map: a sheet or spoke opening clears them.
  useEffect(
    () =>
      useHaulUi.subscribe((s, prev) => {
        if ((s.sheet && !prev.sheet) || (s.spoke && !prev.spoke)) {
          if (s.selection) useHaulUi.getState().select(null);
          useFieldInput.getState().arm(null);
        }
      }),
    [],
  );
  useEffect(() => () => clearPress(), []);

  const responder = useMemo<FieldGestures['responder']>(() => {
    const end = () => {
      clearPress();
      touch.current = null;
      if (dragLine.value.kind !== DRAG_NONE) dragLine.value = NO_DRAG;
      if (useFieldInput.getState().launchArmed) useFieldInput.getState().setLaunchArmed(false);
    };
    const write = (t: Touch, p: Pt, kind: number) => {
      const snap = typeof t.snap === 'number' ? centreOf(layoutRef.current, t.snap) : t.snap === 'rack' ? rackGrabPoint(p, layoutRef.current) : null;
      dragLine.value = {
        kind,
        x0: t.origin.x,
        y0: t.origin.y,
        x: p.x,
        y: p.y,
        snap: snap ? 1 : 0,
        sx: snap?.x ?? 0,
        sy: snap?.y ?? 0,
        color: t.color,
      };
    };
    return {
      onStartShouldSetResponder: () => true,
      onResponderGrant: (e: GestureResponderEvent) => {
        const now = haulNow();
        clearPress();
        if (!now) return;
        const p = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        const L = layoutRef.current;
        const hit = hitAt(p, L, now);
        console.warn('BAYDBG grant', JSON.stringify(p), JSON.stringify(hit), now.g.haul.idle);
        const t: Touch = {
          start: p,
          t0: Date.now(),
          hit,
          drag: { kind: 'none' },
          moved: false,
          pressed: false,
          snap: null,
          armed: false,
          samples: [{ ...p, t: e.nativeEvent.timestamp || Date.now() }],
          origin: p,
          color: '',
        };
        touch.current = t;
        pressTimer.current = setTimeout(() => {
          const cur = touch.current;
          const n = haulNow();
          if (!cur || cur !== t || cur.moved || !n) return;
          cur.pressed = press(cur.hit, n);
        }, PRESS_MS);
      },
      onResponderMove: (e: GestureResponderEvent) => {
        const t = touch.current;
        if (!t || t.pressed) return;
        const p = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        t.samples.push({ ...p, t: e.nativeEvent.timestamp || Date.now() });
        if (t.samples.length > MAX_SAMPLES) t.samples.shift();
        const L = layoutRef.current;
        if (!t.moved) {
          if (Math.hypot(p.x - t.start.x, p.y - t.start.y) < SLOP) return;
          t.moved = true;
          clearPress();
          const now = haulNow();
          if (!now) return;
          const h = now.g.haul;
          // What the drag carries is decided by where it started (a drone or the flare beats the track).
          if (t.hit.kind === 'rack') {
            t.drag = { kind: 'drone', from: 'rack' };
            t.origin = rackGrabPoint(t.start, L);
          } else if (t.hit.kind === 'chip' && h.slots[t.hit.slot]?.haulers > 0) {
            t.drag = { kind: 'drone', from: t.hit.slot };
            const c = L.chips.find((x) => x.slot === (t.hit as { slot: number }).slot);
            t.origin = c ? { x: c.x, y: c.y } : t.start;
            t.color = oreColor(h.slots[t.hit.slot].ore);
          } else if (t.hit.kind === 'flare') {
            t.drag = { kind: 'flare' };
            const f = L.zones.flare;
            t.origin = { x: f.x + f.width / 2, y: f.y + f.height / 2 };
          } else if (t.hit.kind === 'launch' && H.canLaunch(now.g)) t.drag = { kind: 'swipe' };
          else return;
          if (t.drag.kind !== 'swipe') {
            useHaulUi.getState().select(null);
            useFieldInput.getState().arm(null);
            fx.play('route_grab');
          }
        }
        if (t.drag.kind === 'none') return;
        if (t.drag.kind === 'swipe') {
          const rise = t.start.y - p.y;
          if (rise >= LAUNCH_ARM && !t.armed) {
            t.armed = true;
            useFieldInput.getState().setLaunchArmed(true);
            fx.play('launch_arm');
          }
          write(t, p, DRAG_SWIPE);
          return;
        }
        const now = haulNow();
        if (!now) return;
        let snap: number | 'rack' | null = dropTarget(p, L, t.drag.kind === 'flare' ? flareOk(now) : claimed(now));
        if (t.drag.kind === 'drone' && t.drag.from !== 'rack') {
          if (snap === t.drag.from) snap = null;
          if (snap === null && onRack(p, L)) snap = 'rack';
        }
        if (snap !== t.snap) {
          t.snap = snap;
          if (snap !== null) fx.play('route_snap');
        }
        write(t, p, t.drag.kind === 'flare' ? DRAG_FLARE : DRAG_DRONE);
      },
      onResponderRelease: (e: GestureResponderEvent) => {
        console.warn('BAYDBG release', JSON.stringify(touch.current?.drag), touch.current?.moved, JSON.stringify(touch.current?.snap));
        const t = touch.current;
        const now = haulNow();
        if (!t || !now) return end();
        const p = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        const L = layoutRef.current;
        if (t.pressed) return end();
        if (!t.moved) {
          if (Date.now() - t.t0 <= TAP_MS + 150) tap(t.hit, now);
          return end();
        }
        const d = t.drag;
        if (d.kind === 'swipe') {
          if (t.start.y - p.y >= LAUNCH_RISE) haulActions.launch();
          else if (t.armed) fx.play('launch_abort');
          return end();
        }
        if (d.kind === 'none') return end();
        t.samples.push({ ...p, t: e.nativeEvent.timestamp || Date.now() });
        const ok = d.kind === 'flare' ? flareOk(now) : claimed(now);
        let target: number | 'rack' | null = t.snap;
        if (target === null) {
          const f = flickTarget(t.samples, L, ok);
          target = f !== null && !(d.kind === 'drone' && d.from === f) ? f : null;
        }
        if (target === null) cancelSound();
        else if (d.kind === 'flare') {
          if (typeof target === 'number') haulActions.useFlare(target);
        } else if (d.from === 'rack') {
          if (typeof target === 'number') haulActions.assignDrone(target);
        } else if (target === 'rack') haulActions.recallDrone(d.from);
        else haulActions.moveDrone(d.from, target);
        end();
      },
      onResponderTerminate: () => end(),
    };
  }, []);
  return { responder, finger: dragLine };
}
