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
 * The fix pass (L4, P8, W17, W14, S3): the weigh-in ticket FEEDS OUT of the platform scale's printer slot
 * (the art's manifest slot, ./slots.ts) on the side away from the boss and never covers his sprite box or
 * the goal card at its real height; the skip's ticket ("Bought for §x" in the cost colour) beside the
 * weighbridge's display clear of the truck; the collection ticket at the flatbed's cab; the drop-off slip
 * over the drop-off; a deal delivery under the cash counter. A ticket whose anchor is off screen stands
 * under the cash counter, never at the far edge. ONE at a time: the next waits. Every world ticket folds
 * away while a card is open. At most 150 pt tall at font scale 1.3. A tap opens the clipboard.
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
import { useGame } from '../../../state/store';
import { loadingClock } from '../loading/clock';
import { goalRect, hudAnchors } from './anchors';
import { lessonOnTicket, lineH, onScreen, overlaps, placeFromSlot, placeTicket, textW, TICKET_PT, underCash, type HudLayout } from './metrics';
import { BarText } from './Paper';
import { yardEvents } from './pump';
import { printerSlot, type WorldPoint } from './slots';
import { crewWeighInChip, dealChip, lotSoldChip, planTicket, slipChip, slipText, ticketView, type TicketPlan, type TicketView } from './ticketView';

/** How long each shows (ms) before it folds. */
export const TICKET_MS = { weighIn: 4200, collection: 4200, chip: 2600, slip: 3000 } as const;
/** Heights above the ground (metres) where an anchor without a printer slot sits: a cab roof, a chip over a place. */
const CAB_Z = 2.6;
const CHIP_Z = 1.6;
/** The boss's sprite box round his feet (metres): half its width, its height. */
const BOSS_HALF_W = 0.5;
const BOSS_H = 1.9;
/** A queued ticket older than this when its turn comes is dropped (it is in the clipboard's history). */
const STALE_MS = 9000;

type Content = { view: TicketView; chip: null } | { view: null; chip: string };

/** Where a ticket stands: out of a printer slot clear of a box (`keep`), or pinned over a world point; `cash` under the cash counter. */
type Anchor =
  | { kind: 'slot'; slot: WorldPoint; keep: { x: number; y: number; halfW: number; z: number } | null }
  | { kind: 'point'; at: WorldPoint }
  | { kind: 'cash' };

type Slot = Content & { id: number; anchor: Anchor; ms: number; at: number; coin: WorldPoint | null; weighIn: WorldPoint | null };

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

/**
 * ONE ticket or chip at a time (P8, L4): the next waits in a queue and shows when the one before folds.
 * Every world ticket folds away while a card is open (L4); what was waiting then is dropped (the
 * clipboard keeps the history).
 */
export function Tickets({ cfg, L, camera, yard }: { cfg: R.SalvageConfig; L: HudLayout; camera: Camera; yard: YardLayout }) {
  const c = cfg.salvage;
  const [cur, setCur] = useState<Slot | null>(null);
  const queue = useRef<Slot[]>([]);
  const bossIn = useRef(false);
  const ids = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const curRef = useRef<Slot | null>(null);

  useEffect(() => {
    const scalePt = R.point(cfg, 'scale');
    const scaleSlot: WorldPoint = printerSlot(cfg, 'scale') ?? { x: scalePt.x, y: scalePt.y, z: 2.2 };
    const bridgePt = R.point(cfg, 'weighbridge');
    const bridgeSlot: WorldPoint = printerSlot(cfg, 'weighbridge') ?? { x: bridgePt.x, y: bridgePt.y, z: CAB_Z };
    const dropPt = R.point(cfg, 'dropoff');
    const deck = (c.map.places as Record<string, { w?: number } | undefined>).weighbridge;
    const proj = (p: WorldPoint) => project(p.x, p.y, p.z, camera.value, L.width, L.height, yard.ppm, yard.tilt, yard.lift);
    const cardOpen = () => useSalvageUi.getState().stack.length > 0;

    const fold = () => {
      clearTimeout(timer.current);
      curRef.current = null;
      setCur(null);
      hudAnchors.setCollection(null);
      hudAnchors.setWeighIn(null);
    };
    const next = () => {
      fold();
      if (cardOpen()) {
        queue.current = [];
        return;
      }
      const now = Date.now();
      let n = queue.current.shift();
      while (n && now - n.at > STALE_MS) n = queue.current.shift();
      if (!n) return;
      curRef.current = n;
      setCur(n);
      if (n.coin) hudAnchors.setCollection(proj(n.coin));
      if (n.weighIn) hudAnchors.setWeighIn(proj(n.weighIn));
      timer.current = setTimeout(next, n.ms);
    };
    const push = (content: Content, anchor: Anchor, ms: number, extra: { coin?: WorldPoint; weighIn?: WorldPoint } = {}) => {
      if (cardOpen()) return;
      queue.current.push({ ...content, id: ++ids.current, anchor, ms, at: Date.now(), coin: extra.coin ?? null, weighIn: extra.weighIn ?? null });
      // A collection's coin arc starts at the cab NOW (world-b reads the anchor at the event), even while it waits.
      if (extra.coin && curRef.current) hudAnchors.setCollection(proj(extra.coin));
      if (!curRef.current) next();
    };
    const bossBox = () => {
      const g = useGame.getState().game as R.SalvageGame;
      const p = g?.salvage?.presence;
      return p ? { x: p.x, y: p.y, halfW: BOSS_HALF_W, z: BOSS_H } : { x: scalePt.x, y: scalePt.y, halfW: BOSS_HALF_W, z: BOSS_H };
    };

    const offIn = yardEvents.on('weighIn', (e) => {
      const t = e.ticket;
      if (e.by === 'boss') {
        bossIn.current = true;
        const onTicket = lessonOnTicket(L.s);
        const view = ticketView(t, c, onTicket ? undefined : null);
        if (!onTicket && t.kind === 'weighIn' && t.lessonText) useSalvageUi.getState().showGoalLesson(say(t.lessonText, c));
        if (view) push({ view, chip: null }, { kind: 'slot', slot: scaleSlot, keep: bossBox() }, TICKET_MS.weighIn, { weighIn: scaleSlot });
      } else {
        const chip = crewWeighInChip(t, c);
        if (chip) push({ view: null, chip }, { kind: 'slot', slot: scaleSlot, keep: null }, TICKET_MS.chip);
      }
    });
    const offOut = yardEvents.on('collected', (e) => {
      const t = e.ticket;
      // The rules say whether a weigh-in of the boss's went into the lot (types.ts withBoss).
      const boss = t.kind === 'collection' ? t.withBoss : bossIn.current;
      bossIn.current = false;
      // The cab: the flatbed where the frame has it (as world-b's coin), else the merchant's stand.
      const g = useGame.getState().game as R.SalvageGame;
      const fb = g?.salvage ? R.frame(cfg, g).flatbed : null;
      const base = fb ?? R.point(cfg, 'merchant');
      const cab: WorldPoint = { x: base.x + 1.2, y: base.y, z: CAB_Z };
      const view = boss ? ticketView(t, c, null) : null;
      if (view) push({ view, chip: null }, { kind: 'point', at: cab }, TICKET_MS.collection, { coin: cab });
      else {
        const chip = lotSoldChip(t, c);
        if (chip) push({ view: null, chip }, { kind: 'point', at: cab }, TICKET_MS.chip, { coin: cab });
      }
    });
    // The skip's weigh-in ticket beside the weighbridge's display, clear of the truck's cab (money OUT: no coin).
    const offBridge = yardEvents.on('bridgeWeighIn', (e) => {
      const view = ticketView(e.ticket, c, null);
      const keep = { x: bridgePt.x, y: bridgePt.y, halfW: (deck?.w ?? 6) / 2, z: CAB_Z };
      if (view) push({ view, chip: null }, { kind: 'slot', slot: bridgeSlot, keep }, TICKET_MS.collection);
    });
    // The drop-off slip (W14): "Washing machine · signed in · gate drop-off" over the drop-off.
    const offSlip = yardEvents.on('dropOffSlip', (e) => {
      const chip = slipChip(e.ticket, c);
      if (chip) push({ view: null, chip }, { kind: 'point', at: { x: dropPt.x, y: dropPt.y, z: CHIP_Z } }, TICKET_MS.slip);
    });
    // A supply deal's delivery (W14): the foundry is away from the yard, so the chip stands under the cash counter.
    const offDeal = yardEvents.on('dealDelivered', (e) => {
      const chip = dealChip(e.ticket, c);
      if (chip) push({ view: null, chip }, { kind: 'cash' }, TICKET_MS.slip);
    });
    // The first washer's slip at second 0 (W14): the starting thing was signed in before the player came.
    let firstSlip: ReturnType<typeof setTimeout> | undefined;
    const waitFirst = () => {
      if (!loadingClock.done.value) {
        firstSlip = setTimeout(waitFirst, 300);
        return;
      }
      const g = useGame.getState().game as R.SalvageGame;
      const obj = g?.salvage ? firstDropOff(cfg, g) : null;
      if (obj) push({ view: null, chip: slipText(obj, c) }, { kind: 'point', at: { x: dropPt.x, y: dropPt.y, z: CHIP_Z } }, TICKET_MS.slip);
    };
    firstSlip = setTimeout(waitFirst, 600);
    // A card opening folds every world ticket away (L4).
    const offUi = useSalvageUi.subscribe((s) => {
      if (s.stack.length > 0 && (curRef.current || queue.current.length)) {
        queue.current = [];
        fold();
      }
    });
    return () => {
      offIn();
      offOut();
      offBridge();
      offSlip();
      offDeal();
      offUi();
      clearTimeout(firstSlip);
      clearTimeout(timer.current);
      queue.current = [];
      curRef.current = null;
    };
  }, [c, cfg, camera, yard, L.width, L.height, L.s]);

  return cur ? <Anchored key={cur.id} slot={cur} L={L} camera={camera} yard={yard} c={c} /> : null;
}

/**
 * The starting thing at the drop-off on a fresh yard (nothing weighed yet), for its slip at second 0; else null.
 * Reads the rules' frame (things at the drop-off) and the ticket counter.
 */
function firstDropOff(cfg: R.SalvageConfig, g: R.SalvageGame): string | null {
  const s = g.salvage as unknown as { ticketNo?: number };
  if ((s.ticketNo ?? 0) > 0) return null;
  const f = R.frame(cfg, g) as unknown as { things?: { obj?: string; at?: unknown; sprite?: string; x: number; y: number }[] };
  const drop = R.point(cfg, 'dropoff');
  const t = (f.things ?? []).find((x) => Math.abs(x.x - drop.x) < 6 && Math.abs(x.y - drop.y) < 3);
  return t?.obj ?? null;
}

/** A slot's size on screen and its ticket plan. */
function sizeOf(slot: Content, L: HudLayout, c: R.SalvageContent): { w: number; h: number; plan: TicketPlan | null } {
  const s = L.s;
  const w = slot.view ? L.ticketW : Math.min(L.right - L.left, Math.ceil(textW(slot.chip ?? '', 11 * s) + 24));
  const plan = slot.view ? planTicket(slot.view, w, s, c, L.ticketMaxH) : null;
  return { w, h: plan ? plan.height : lineH(11 * s) + 10, plan };
}

/** A ticket or chip at its anchor, following the camera each frame, feeding out of its slot (or rising in). */
function Anchored({ slot, L, camera, yard, c }: { slot: Slot; L: HudLayout; camera: Camera; yard: YardLayout; c: R.SalvageContent }) {
  const s = L.s;
  const { w, h, plan } = sizeOf(slot, L, c);
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = withTiming(1, { duration: 300 });
  }, [rise]);
  const box = { left: L.left, right: L.right, freeY: L.freeY, bottomY: L.bottomY };
  const { ppm, tilt, lift } = yard;
  const W = L.width;
  const H = L.height;
  const a = slot.anchor;
  const style = useAnimatedStyle(() => {
    const cam = camera.value;
    const gr = goalRect.value;
    const goal = gr.w > 0 ? gr : null;
    let q: { x: number; y: number };
    let from = { x: 0, y: 0 };
    if (a.kind === 'cash') q = underCash(w, h, goal, box);
    else if (a.kind === 'point') {
      const p = project(a.at.x, a.at.y, a.at.z, cam, W, H, ppm, tilt, lift);
      q = onScreen(p.x, p.y, box) ? placeTicket(p.x, p.y, w, h, box) : underCash(w, h, goal, box);
      if (goal && overlaps({ x: q.x, y: q.y, w, h }, goal, 2)) q = { x: q.x, y: Math.min(box.bottomY - h - 4, goal.y + goal.h + 4) };
    } else {
      const p = project(a.slot.x, a.slot.y, a.slot.z, cam, W, H, ppm, tilt, lift);
      if (!onScreen(p.x, p.y, box)) q = underCash(w, h, goal, box);
      else {
        let keep: { x: number; y: number; w: number; h: number } | null = null;
        if (a.keep) {
          const k = a.keep;
          const p0 = project(k.x - k.halfW, k.y, 0, cam, W, H, ppm, tilt, lift);
          const p1 = project(k.x + k.halfW, k.y, k.z, cam, W, H, ppm, tilt, lift);
          keep = { x: p0.x, y: p1.y, w: p1.x - p0.x, h: p0.y - p1.y };
        }
        q = placeFromSlot(p.x, p.y, w, h, keep, goal, box);
        // It feeds out of the slot: from the slot's edge towards its place.
        from = { x: (q.x > p.x ? p.x - q.x : p.x - (q.x + w)) * 0.5, y: (p.y - q.y) * 0.3 };
      }
    }
    const k = 1 - rise.value;
    return { opacity: Math.min(1, rise.value * 1.6), transform: [{ translateX: q.x + from.x * k }, { translateY: q.y + from.y * k + (a.kind === 'slot' ? 0 : k * 14) }] };
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
  const paid = v.kind === 'collection' && !v.cost;
  const cost = !!v.cost;
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
          <BarText pt={paid || cost ? TICKET_PT.paid * s : small} weight={paid || cost ? '900' : '600'} color={cost ? PAL.cost : paid ? PAL.ink : PAL.muted}>
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
