/**
 * Tickets and their chips (yard-stage1.md 4.4, the eye path of a sale: scale display, bay chip, flatbed,
 * cash counter). From the event pump only (no polling):
 * - `weighIn` by the boss: the WEIGH-IN TICKET rises from the scale's display post (hi-vis header; up to
 *   three grade rows with "§{p}/kg today"; "+ n more"; the muted "today's value"; at most one lesson; the
 *   legal line), then folds away. By a crew member: the one-line chip "Yard hand · 58.2 kg in".
 * - `collected`: the COLLECTION TICKET at the flatbed's cab (amounts in ink, "Paid §{x}" bold, the buyer
 *   named in the stamp's blue) when a weigh-in of the boss's went into it, else the one-line chip
 *   "Lot sold · §29.00". While it shows, `collectionAnchor` (./anchors.ts) is the cab's screen point,
 *   where world-b's coin arc starts.
 * Both are anchored to their world point (metres, a height above the ground) through the camera, and
 * clamped inside the free world and the safe area, at most 150 pt tall at font scale 1.3; one of each
 * kind at a time (a new one replaces the old). A tap opens the ticket history (the clipboard).
 *
 * Above font scale 1.15 a ticket prints at most two grade rows and no lesson (the lead's ruling, 15:55):
 * the lesson then shows as the goal card's second line for six seconds (./lesson.ts).
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import * as R from '../../../engine/salvage';
import { PAL } from '../palette';
import { openCard } from '../overlays/cardStack';
import { say } from './words';
import { useSalvageUi } from '../uiState';
import type { YardLayout } from '../world/yard';
import { hudAnchors } from './anchors';
import { avoidRect, lessonOnTicket, lineH, placeTicket, textW, TICKET_PT, type HudLayout } from './metrics';
import { BarText } from './Paper';
import { yardEvents } from './pump';
import { crewWeighInChip, lotSoldChip, planTicket, ticketView, type TicketPlan, type TicketView } from './ticketView';

/** How long each shows (ms) before it folds. */
export const TICKET_MS = { weighIn: 4200, collection: 4200, chip: 2600 } as const;
/** Heights above the ground of the two anchors (metres): the display's printer slot, the flatbed's cab roof. */
const SLOT_Z = 2.2;
const CAB_Z = 2.6;

type Slot = { id: number; view: TicketView; chip: null } | { id: number; view: null; chip: string };

/** The yard's camera as the frame loop writes it (world-a: camX, camY in points before the zoom, the zoom about the screen centre). */
export type Camera = SharedValue<{ x: number; y: number; zoom: number }>;

/**
 * Screen point of a world point under the camera (a worklet: anchors follow the camera every frame):
 * (wx*ppm - camX - W/2) * zoom + W/2, and the same for y with wy*ppm*tilt - z*ppm*lift.
 */
export function project(x: number, y: number, z: number, cam: { x: number; y: number; zoom: number }, W: number, H: number, ppm: number, tilt: number, lift: number): { x: number; y: number } {
  'worklet';
  const k = cam.zoom > 0 ? cam.zoom : 1;
  return { x: (x * ppm - cam.x - W / 2) * k + W / 2, y: (y * ppm * tilt - z * ppm * lift - cam.y - H / 2) * k + H / 2 };
}

export function Tickets({ cfg, L, camera, yard }: { cfg: R.SalvageConfig; L: HudLayout; camera: Camera; yard: YardLayout }) {
  const c = cfg.salvage;
  const [scale, setScale] = useState<Slot | null>(null);
  const [cab, setCab] = useState<Slot | null>(null);
  const [bridge, setBridge] = useState<Slot | null>(null);
  const bossIn = useRef(false);
  const ids = useRef(0);
  const timers = useRef<{ scale?: ReturnType<typeof setTimeout>; cab?: ReturnType<typeof setTimeout>; bridge?: ReturnType<typeof setTimeout> }>({});
  const scalePt = R.point(cfg, 'scale');
  const cabPt = R.point(cfg, 'merchant');
  const bridgePt = R.point(cfg, 'weighbridge');

  useEffect(() => {
    const show = (which: 'scale' | 'cab' | 'bridge', slot: Slot, ms: number) => {
      const set = which === 'scale' ? setScale : which === 'cab' ? setCab : setBridge;
      clearTimeout(timers.current[which]);
      set(slot);
      timers.current[which] = setTimeout(() => {
        set(null);
        if (which === 'cab') hudAnchors.setCollection(null);
        else if (which === 'scale') hudAnchors.setWeighIn(null);
      }, ms);
    };
    const offIn = yardEvents.on('weighIn', (e) => {
      const t = e.ticket;
      if (e.by === 'boss') {
        bossIn.current = true;
        hudAnchors.setWeighIn(project(scalePt.x, scalePt.y, SLOT_Z, camera.value, L.width, L.height, yard.ppm, yard.tilt, yard.lift));
        const onTicket = lessonOnTicket(L.s);
        const view = ticketView(t, c, onTicket ? undefined : null);
        if (!onTicket && t.kind === 'weighIn' && t.lessonText) useSalvageUi.getState().showGoalLesson(say(t.lessonText, c));
        if (view) show('scale', { id: ++ids.current, view, chip: null }, TICKET_MS.weighIn);
      } else {
        const chip = crewWeighInChip(t, c);
        if (chip) show('scale', { id: ++ids.current, view: null, chip }, TICKET_MS.chip);
      }
    });
    const offOut = yardEvents.on('collected', (e) => {
      const t = e.ticket;
      // The rules say whether a weigh-in of the boss's went into the lot (types.ts withBoss).
      const boss = t.kind === 'collection' ? t.withBoss : bossIn.current;
      bossIn.current = false;
      const view = boss ? ticketView(t, c, null) : null;
      if (view) show('cab', { id: ++ids.current, view, chip: null }, TICKET_MS.collection);
      else {
        const chip = lotSoldChip(t, c);
        if (chip) show('cab', { id: ++ids.current, view: null, chip }, TICKET_MS.chip);
      }
      hudAnchors.setCollection(project(cabPt.x, cabPt.y, CAB_Z, camera.value, L.width, L.height, yard.ppm, yard.tilt, yard.lift));
    });
    // The skip's weigh-in ticket over the weighbridge (the truck stands on it).
    const offBridge = yardEvents.on('bridgeWeighIn', (e) => {
      const view = ticketView(e.ticket, c, null);
      if (view) show('bridge', { id: ++ids.current, view, chip: null }, TICKET_MS.collection);
    });
    const t = timers.current;
    return () => {
      offIn();
      offOut();
      offBridge();
      clearTimeout(t.scale);
      clearTimeout(t.cab);
      clearTimeout(t.bridge);
    };
  }, [c, cabPt.x, cabPt.y, scalePt.x, scalePt.y, camera, yard, L.width, L.height, L.s]);

  return (
    <>
      {scale ? <Anchored key={scale.id} slot={scale} at={scalePt} z={SLOT_Z} L={L} camera={camera} yard={yard} c={c} other={null} /> : null}
      {bridge ? <Anchored key={bridge.id} slot={bridge} at={bridgePt} z={CAB_Z} L={L} camera={camera} yard={yard} c={c} other={null} /> : null}
      {cab ? <Anchored key={cab.id} slot={cab} at={cabPt} z={CAB_Z} L={L} camera={camera} yard={yard} c={c} other={scale ? { at: scalePt, z: SLOT_Z, ...sizeOf(scale, L, c) } : null} /> : null}
    </>
  );
}

/** A slot's size on screen and its ticket plan. */
function sizeOf(slot: Slot, L: HudLayout, c: R.SalvageContent): { w: number; h: number; plan: TicketPlan | null } {
  const s = L.s;
  const w = slot.view ? L.ticketW : Math.ceil(textW(slot.chip ?? '', 11 * s) + 24);
  const plan = slot.view ? planTicket(slot.view, w, s, c, L.ticketMaxH) : null;
  return { w, h: plan ? plan.height : lineH(11 * s) + 10, plan };
}

type Other = { at: { x: number; y: number }; z: number; w: number; h: number } | null;

/** A ticket or chip pinned over its world point, rising in, clamped inside the free world (and off the other ticket). */
function Anchored({ slot, at, z, L, camera, yard, c, other }: { slot: Slot; at: { x: number; y: number }; z: number; L: HudLayout; camera: Camera; yard: YardLayout; c: R.SalvageContent; other: Other }) {
  const s = L.s;
  const { w, h, plan } = sizeOf(slot, L, c);
  const o = other ? { x: other.at.x, y: other.at.y, z: other.z, w: other.w, h: other.h } : null;
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = withTiming(1, { duration: 260 });
  }, [rise]);
  const box = { left: L.left, right: L.right, freeY: L.freeY, bottomY: L.bottomY };
  const { ppm, tilt, lift } = yard;
  const W = L.width;
  const H = L.height;
  const style = useAnimatedStyle(() => {
    const cam = camera.value;
    const p = project(at.x, at.y, z, cam, W, H, ppm, tilt, lift);
    let q = placeTicket(p.x, p.y, w, h, box);
    if (o) {
      const op = project(o.x, o.y, o.z, cam, W, H, ppm, tilt, lift);
      const oq = placeTicket(op.x, op.y, o.w, o.h, box);
      q = avoidRect(q.x, q.y, w, h, { x: oq.x, y: oq.y, w: o.w, h: o.h }, box);
    }
    return { opacity: rise.value, transform: [{ translateX: q.x }, { translateY: q.y + (1 - rise.value) * 14 }] };
  });
  return (
    <Animated.View style={[styles.abs, { width: w }, style]}>
      <Pressable accessibilityRole="button" onPress={() => openCard({ kind: 'clipboard' })}>
        {slot.view && plan ? <TicketPaper v={slot.view} plan={plan} s={s} /> : <ChipPaper text={slot.chip ?? ''} s={s} />}
      </Pressable>
    </Animated.View>
  );
}

function ChipPaper({ text, s }: { text: string; s: number }) {
  return (
    <View style={styles.chip}>
      <BarText pt={11 * s} weight="700">
        {text}
      </BarText>
    </View>
  );
}

/** The ticket paper (yard-style.md 8): hi-vis header, grade rows, the foot, the lesson, the legal line(s). */
export function TicketPaper({ v, plan, s }: { v: TicketView; plan: TicketPlan; s: number }) {
  const pt = TICKET_PT.row * s;
  const small = TICKET_PT.small * s;
  const paid = v.kind === 'collection';
  return (
    <View style={styles.paper}>
      <View style={styles.sprocket} />
      <View style={styles.head}>
        <BarText pt={TICKET_PT.head * s} weight="800">
          {v.head}
        </BarText>
      </View>
      <View style={styles.body}>
        {plan.rows.map((r) => (
          <View key={r.grade} style={plan.twoLine ? null : styles.row}>
            <BarText pt={pt} weight="700" style={plan.twoLine ? null : styles.name}>
              {r.note ? `${r.name} · ${r.note}` : r.name}
            </BarText>
            <View style={[styles.row, plan.twoLine && styles.under]}>
              <BarText pt={pt} weight="600" style={plan.twoLine ? styles.name : styles.kg}>
                {r.kg}
              </BarText>
              <BarText pt={pt} weight={paid ? '700' : '500'} color={paid ? PAL.ink : PAL.muted} style={styles.right}>
                {r.right}
              </BarText>
            </View>
          </View>
        ))}
        <View style={styles.row}>
          <BarText pt={small} weight="600" color={PAL.inkSoft} style={styles.name}>
            {plan.more ?? ''}
          </BarText>
          <BarText pt={paid ? TICKET_PT.paid * s : small} weight={paid ? '900' : '600'} color={paid ? PAL.ink : PAL.muted}>
            {v.total}
          </BarText>
        </View>
        {v.lesson ? (
          <BarText pt={small} weight="600" color={PAL.stamp}>
            {v.lesson}
          </BarText>
        ) : null}
        <View style={paid ? styles.stamp : null}>
          {v.legal.map((l, i) => (
            <BarText key={i} pt={small} weight={paid ? '800' : '500'} color={paid ? PAL.stamp : PAL.inkSoft}>
              {l}
            </BarText>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  paper: { backgroundColor: PAL.paper, borderWidth: 1.3, borderColor: PAL.ink, borderRadius: 3, overflow: 'hidden', paddingLeft: 10 },
  sprocket: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: PAL.paperShade, borderRightWidth: 1, borderRightColor: PAL.paperLine, borderStyle: 'dashed' },
  head: { backgroundColor: PAL.hivis, marginLeft: -4, paddingHorizontal: 6, paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: PAL.ink },
  body: { paddingHorizontal: 6, paddingTop: 2, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1 },
  kg: { marginLeft: 6, textAlign: 'right' },
  right: { marginLeft: 8, textAlign: 'right' },
  under: { paddingLeft: 10 },
  stamp: { alignSelf: 'flex-start', borderWidth: 1.3, borderColor: PAL.stamp, borderRadius: 3, paddingHorizontal: 4, marginTop: 1, transform: [{ rotate: '-1.5deg' }] },
  chip: { backgroundColor: PAL.paper, borderWidth: 1.3, borderColor: PAL.ink, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
});
