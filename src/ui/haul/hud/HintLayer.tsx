/**
 * The map's hint layer (spec section 3, errata 53 to 55): twice a second it takes the first hint
 * of `allHaulHints()` (the rules' hints in errata 55's order) that has something on screen to point
 * at, and draws the art kit's ReticleLayer over the whole screen (touches pass through):
 * - drag: from target A to target B along the dotted guide (1.2 s travel, 0.6 s pause);
 * - swipe: an upward stroke from the freighter pad that rises beside the dock counter, on its
 *   left frame edge, never across the credits (Decision 48, play-3);
 * - tap-tap: two points in a row, drawn as data: the drone first, the rock once a drone is selected;
 * - point: a pulse; a hint whose control is inside a sheet (station:buyDrone, station:autopilot)
 *   points at what opens it on the map (`route`, errata 53's first stage). The second stage, inside
 *   the open sheet, is the sheet's. A control that shows a number (the dock counter, the contract
 *   strip, the flare launcher, the hold) is ringed at its frame instead (Decision 48).
 * It waits while any sheet, spoke, overlay, the station menu or a dialog is open (Decision 48: a
 * hint never covers what the player is reading; their own hints are theirs), hides while a
 * finger drags, plays `hint` once per new hint, and marks a limited hint shown once per appearance.
 * Map targets come from src/ui/hints/targets.ts (the scene sets rock:, slot:, chip:, drone:rack and
 * station; the bay its own); until the scene has set one, the layout stands in for it.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { HaulHint } from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { fx } from '../../../services/fx';
import { useOverlaysOpen } from '../../kit';
import { targets, type TargetRect } from '../../hints/targets';
import { ReticleLayer, type Point, type ReticleHint } from '../art/Reticle';
import { GUIDE_COLOR } from '../art/reticle.draw';
import { DRAG_NONE, dragLine } from '../gestures/fieldInput';
import { allHaulHints } from '../hints';
import type { FieldLayout } from '../layout';
import { useHaulUi, type HaulSelection } from '../uiState';

const ASK_MS = 500;

/** A target's rectangle: registered, or for the map's drawn keys, from the layout. */
export function targetRect(key: string, layout: FieldLayout): TargetRect | null {
  const r = targets.get(key);
  // drone:rack means the drone that goes next; a rectangle round the whole rack would point at the station.
  if (r && !(key === 'drone:rack' && r.width > 48)) return r;
  const [kind, arg] = key.split(':');
  const n = arg === undefined ? NaN : Number(arg);
  if ((kind === 'rock' || kind === 'slot') && Number.isInteger(n)) {
    const q = layout.rocks[n];
    return q ? { x: q.x - q.r, y: q.y - q.r, width: 2 * q.r, height: 2 * q.r } : null;
  }
  if (kind === 'chip' && Number.isInteger(n)) {
    const c = layout.chips.find((x) => x.slot === n);
    return c ? { x: c.x - 12, y: c.y - 12, width: 24, height: 24 } : null;
  }
  if (key === 'drone:rack') {
    // The first idle drone stands on the left arm's cradle nearest the station, nose up above it.
    const a = layout.rack.left;
    const k = layout.station.r / 40;
    return { x: a.x + a.width * 0.78 - 10 * k, y: a.y + 2 * k, width: 20 * k, height: 20 * k };
  }
  // The bay's controls, until they have measured themselves.
  if (kind === 'bay') {
    const z = layout.zones;
    const zone = arg === 'counter' ? z.counter : arg === 'launch' ? z.launch : arg === 'flare' ? z.flare : arg === 'hold' ? z.hold : null;
    if (zone) return zone;
  }
  if (key === 'station')
    return {
      x: layout.station.x - layout.station.r,
      y: layout.station.y - layout.station.r,
      width: 2 * layout.station.r,
      height: 2 * layout.station.r,
    };
  return null;
}

/** Controls that show a number: a hint rings their frame, never sits on them (Decision 48). */
const FRAMED = ['bay:counter', 'bay:flare', 'bay:hold', 'contract:strip'];

const centre = (r: TargetRect): Point => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});

/** What the reticle shows for `h` now, or null when its targets are not on screen. */
export function reticleFor(h: HaulHint, layout: FieldLayout, selection: HaulSelection): ReticleHint | null {
  const at = (key: string | undefined) => {
    const r = key ? targetRect(key, layout) : null;
    return r ? centre(r) : null;
  };
  if (h.kind === 'tapTap') {
    const first = at(h.from);
    const second = at(h.to ?? h.key);
    if (selection?.kind === 'drone') return second ? { kind: 'point', from: second } : null;
    return first ? { kind: 'point', from: first } : null;
  }
  if (h.kind === 'drag') {
    const from = at(h.from);
    const to = at(h.to ?? h.key);
    return from && to ? { kind: 'drag', from, to } : null;
  }
  if (h.kind === 'swipe') {
    const z = targetRect(h.zone ?? h.key, layout);
    if (!z) return null;
    // From the pad, up beside the dock counter on its left frame edge (Decision 48: never over the credits).
    const counter = targetRect('bay:counter', layout) ?? layout.zones.counter;
    const from = { x: z.x + 12, y: z.y + z.height - 10 };
    const to = { x: counter.x - 2, y: Math.min(from.y - 60, counter.y + 8) };
    return { kind: 'swipe', from, to };
  }
  // A point hint at a control on the map, or at what opens its sheet.
  const pointAt = (key: string): ReticleHint | null => {
    const r = targetRect(key, layout);
    if (!r) return null;
    // The station is as large as the reticle and drawn in its colour: a reticle on its hub could not
    // be seen (play:new:4, step 4). It is framed round its ring instead, in the guide's white.
    if (key === 'station') return { kind: 'frame', rect: r };
    return FRAMED.includes(key) ? { kind: 'frame', rect: r } : { kind: 'point', from: centre(r) };
  };
  const own = pointAt(h.key);
  if (own && !h.route.length) return own;
  for (const k of h.route) {
    const p = pointAt(k);
    if (p) return p;
  }
  return own;
}

/** True for the frame round the station (drawn white: the station itself is the reticle's cyan). */
function onStation(h: ReticleHint, layout: FieldLayout): boolean {
  if (h.kind !== 'frame') return false;
  const st = layout.station;
  return Math.abs(h.rect.x + h.rect.width / 2 - st.x) < 2 && Math.abs(h.rect.y + h.rect.height / 2 - st.y) < 2 && h.rect.width > 40;
}

const same = (a: ReticleHint | null, b: ReticleHint | null) => JSON.stringify(a) === JSON.stringify(b);

export function HintLayer({ layout }: { layout: FieldLayout }) {
  const open = useOverlaysOpen();
  const spoke = useHaulUi((s) => s.spoke !== null || s.sheet !== null || s.overlay !== null || s.menuOpen);
  const [shown, setShown] = useState<ReticleHint | null>(null);
  const [dragging, setDragging] = useState(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const lastKey = useRef<string | null>(null);
  const blocked = open > 0 || spoke;

  // Hide while a finger drags (the reaction runs only when the drag starts or ends).
  useAnimatedReaction(
    () => dragLine.value.kind !== DRAG_NONE,
    (now, prev) => {
      if (now !== prev) runOnJS(setDragging)(now);
    },
  );

  useEffect(() => {
    if (blocked) {
      setShown(null);
      return;
    }
    const ask = () => {
      const sel = useHaulUi.getState().selection;
      let pick: { h: HaulHint; r: ReticleHint } | null = null;
      for (const h of allHaulHints()) {
        const r = reticleFor(h, layoutRef.current, sel);
        if (r) {
          pick = { h, r };
          break;
        }
      }
      const key = pick ? `${pick.h.kind}:${pick.h.from ?? ''}>${pick.h.key}` : null;
      if (key !== lastKey.current) {
        lastKey.current = key;
        if (pick) {
          fx.play('hint');
          if (pick.h.limit) haulActions.markHintShown(pick.h.key);
        }
      }
      setShown((prev) => (same(prev, pick?.r ?? null) ? prev : (pick?.r ?? null)));
    };
    ask();
    const id = setInterval(ask, ASK_MS);
    const offSel = useHaulUi.subscribe((s, p) => {
      if (s.selection !== p.selection) ask();
    });
    const offTargets = targets.subscribe(ask);
    return () => {
      clearInterval(id);
      offSel();
      offTargets();
    };
  }, [blocked]);

  if (!shown || blocked || dragging) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ReticleLayer hint={shown} width={layout.width} height={layout.height} color={onStation(shown, layout) ? GUIDE_COLOR : undefined} />
    </View>
  );
}
