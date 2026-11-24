/**
 * The desk (spec 4.1 to 4.3, 4.5, 2.7, 3.1): ONE Skia canvas behind the bars with the room, the desk
 * of the office (baize and rim), the door with its glass ("Next visitor 0:07"), the wire out-tray whose
 * stack grows with the term's signed papers, the drawer FOR FURTHER STUDY (growing with the refusals,
 * creaking open with the pull), the in-tray stack, the sticky note, and the paper or the budget slip on
 * the desk with the visitor's bust; the paper's words over it (./PaperWords.tsx), moved with it.
 *
 * The flick (./useFlick.ts, ./flick.ts): the responder covers exactly the paper; JavaScript writes ONE
 * shared value, `paperY`, which the canvas and the words read on the UI thread (transforms, the ink's
 * clip, the drawer's opening). After a commit the paper flies into the tray or the drawer and the next
 * slides in from the in-tray 300 ms later; a signed day paper rests 2 s on the out-tray, where a tap
 * takes it back; a tap elsewhere commits it. The second path (tap a strip to arm it, tap it again to
 * commit) is always there, never taught; "Buttons instead of flicks" adds two buttons under the paper;
 * screen readers get Sign and Refuse as actions.
 *
 * Every number shown comes from the rules (src/engine/decree.ts) through ./deskVm.ts; every word from
 * strings.ts. Keeps its name and props (`layout`). Owned by the desk package.
 */
import { Canvas, Group, Path, Picture } from '@shopify/react-native-skia';
import { arc, at, picture } from '../art/pen';
import { drawGiantScissors } from '../art/emblem.draw';
import { drawerStage } from '../art/desk.draw';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, withDelay, withSpring, withTiming, Easing, type SharedValue } from 'react-native-reanimated';
import type * as R from '../../../engine/decree';
import { decreeActions } from '../../../modes/decree/actions';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { targets } from '../../hints/targets';
import { DESK } from '../art/palette';
import { FONT_SCALE_MAX, deskParts, STICKY_LINE, type DeskLayout, type Rect } from '../layout';
import { paperFit, type PaperFit, type paperMetrics } from '../paperMetrics';
import { S } from '../strings';
import { useDecreeUi } from '../uiState';
import { useDecree } from '../useDecree';
import { usePrefs } from '../prefs';
import { devButtons } from './devButtons';
import { aroundSig, deskSig, doorText, type AroundVM, type DeskVM, type PaperVM } from './deskVm';
import { ARM_AT, ENTER_MS, LEAVE_MS, NEXT_AFTER_MS, SPRING, TAP_SLOP, drawerOf, drawerStep, followOf, inkOf, type Release } from './flick';
import { useDeskFontScale } from './fontScale';
import { PaperWords, SlipWords } from './PaperWords';
import { DRAWER_STEPS, armedStripPicture, backPicture, bakeFaces, drawerPictures, facesReady, paperPicture, restPicture, signaturePicture, slipPicture } from './pictures';
import { estimateWidth } from './stripView';
import { useFlick } from './useFlick';
import { applyDeskDevParams } from './dev';

const NONE: DeskVM = { kind: 'none' };
const NONE_SIG = JSON.stringify(NONE);
const OFF = [{ translateX: -9999 }, { translateY: -9999 }];
const ON = [{ translateX: 0 }];
/** The take-back ring redraws at most 30 times a second (4.5: 60 only while a finger is down or a paper moves). */
const RING_FRAME_MS = 32;
const keyOf = (v: DeskVM) => (v.kind === 'none' ? '' : v.key);
/** A one-line word's size factor so it fits `w` (1, or smaller for an unusually long name). */
const fitScale = (t: string, font: number, w: number) => Math.min(1, Math.max(0.7, w / Math.max(1, estimateWidth(t, font, true))));

export function DeskCanvas({ layout }: { layout: DeskLayout }) {
  const L = layout;
  const fs = useDeskFontScale();
  const s = Math.min(fs > 0 ? fs : 1, FONT_SCALE_MAX);
  const P = useMemo(() => deskParts(L, s), [L, s]);

  // --- what the rules say (strings compare by value: a render only when the desk's words change)
  const sig = useDecree((cfg, g) => deskSig(cfg, g, s), NONE_SIG);
  const live = useMemo<DeskVM>(() => JSON.parse(sig) as DeskVM, [sig]);
  const aSig = useDecree(aroundSig, '');
  const around = useMemo<AroundVM | null>(() => (aSig ? (JSON.parse(aSig) as AroundVM) : null), [aSig]);
  const armed = useDecreeUi((u) => u.armed);
  const finger = useDecreeUi((u) => u.fingerDown);
  const buttons = usePrefs((p) => p.buttons) || devButtons();

  // --- the clocks (4.5: one per animated thing): the paper's offset and its spring, the entrance,
  // the shake, the leaving paper, the drawer held open after a refusal, the take-back ring.
  const paperY = useSharedValue(0);
  const enter = useSharedValue(1);
  const shake = useSharedValue(0);
  const leaveY = useSharedValue(0);
  const leaveK = useSharedValue(1);
  const hold = useSharedValue(0);
  const ring = useSharedValue(0);
  const back = useSharedValue(0);
  // The tap path's armed side as the UI thread sees it (1 sign, −1 study, 0): written from JS, never read back.
  const tapSide = useSharedValue(0);
  const zero = useSharedValue(0);

  // --- what the desk shows: it lags the rules for the 300 ms between a commit and the next paper
  const [shown, setShown] = useState<DeskVM>(live);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  // The paper's contents at the design width, the whole paper scaled to its zone (findings 1 and 2).
  const returning = shown.kind === 'paper' && !!shown.returning;
  const fit = useMemo(() => paperFit(L.paper, L.width, s, { returning }), [L.paper, L.width, s, returning]);
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const m = fit.m;
  const D = fit.design;
  const k = fit.k;
  const Pd = useMemo(() => deskParts({ ...L, paper: D }, s), [L, D, s]);
  const PdRef = useRef(Pd);
  PdRef.current = Pd;
  const [leaving, setLeaving] = useState<{ vm: DeskVM; side: R.Choice; n: number; fit: PaperFit; slip: Rect } | null>(null);
  const leaveAt = useRef(0);
  const takingBack = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [titleEnd, setTitleEnd] = useState(0);

  // The preview's desk switches (web only; nothing on phones).
  useEffect(() => applyDeskDevParams(), []);

  // The faces atlas is baked once, after the first frame (it costs a few hundred ms of the JS thread).
  const [faces, setFaces] = useState(facesReady());
  useEffect(() => {
    if (faces) return;
    const t = setTimeout(() => {
      bakeFaces();
      setFaces(true);
    }, 50);
    return () => clearTimeout(t);
  }, [faces]);

  // Entrance from the in-tray, in screen points from the paper's centre.
  const dxIn = P.inTray.x + P.inTray.w / 2 - (L.paper.x + L.paper.w / 2);
  const dyIn = P.inTray.y + P.inTray.h / 2 - (L.paper.y + L.paper.h / 2);
  const trayDy = P.outTray.y + P.outTray.h / 2 - (L.paper.y + L.paper.h / 2);
  // The paper gives no further than the bands beside it (the strips never slide under the bars).
  const upRoom = Math.max(8, L.outTray.h - 4);
  const downRoom = Math.max(8, L.drawer.h - 4);
  const drawerDy = P.drawer.y + P.drawer.h / 2 - (L.paper.y + L.paper.h / 2);

  useEffect(() => {
    if (keyOf(live) === keyOf(shownRef.current)) {
      if (live !== shownRef.current) setShown(live);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    const land = () => {
      timer.current = null;
      setShown(live);
      if (live.kind === 'none') return;
      if (takingBack.current) {
        // Taken back: the same paper comes down from the out-tray, exactly as it was (H3).
        takingBack.current = false;
        enter.value = 1;
        paperY.value = 0;
        back.value = 1;
        back.value = withTiming(0, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
        return;
      }
      paperY.value = 0;
      enter.value = 0;
      enter.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
    };
    const wait = Math.max(0, leaveAt.current + NEXT_AFTER_MS - Date.now());
    if (wait > 0) timer.current = setTimeout(land, wait);
    else land();
  }, [live, enter, paperY, back]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // The take-back ring: the window as the rules hold it (until − the play clock), drawn down to 0 by one
  // frame callback at 30 frames a second (nothing else moves then), stopped when the paper commits.
  const pendingKey = around?.pending ? `${around.pending.key}|${around.pending.until}` : '';
  const ringFrom = useSharedValue(0);
  const ringMs = useSharedValue(1);
  const ringLast = useSharedValue(-1e9);
  const ringT0 = useSharedValue(-1);
  const ringClock = useFrameCallback((f) => {
    'worklet';
    if (ringT0.value < 0) ringT0.value = f.timestamp;
    const t = f.timestamp - ringT0.value;
    if (t - ringLast.value < RING_FRAME_MS) return;
    ringLast.value = t;
    ring.value = ringFrom.value * Math.max(0, 1 - t / ringMs.value);
  }, false);
  // A full-screen view covers the desk (4.4: the desk's clocks stopped): the ring waits under it.
  const covered = useDecreeUi((s) => s.view !== null);
  useEffect(() => {
    const p = around?.pending;
    if (!p || covered) {
      ringClock.setActive(false);
      ring.value = 0;
      return;
    }
    const left = Math.max(0, p.until - (useGame.getState().game.stats.playSeconds ?? 0));
    // Written from a local value: the JS thread never reads a shared value back.
    const from = Math.min(1, left / Math.max(1e-9, p.window));
    ringFrom.value = from;
    ringMs.value = Math.max(1, left * 1000);
    ringLast.value = -1e9;
    ringT0.value = -1;
    ring.value = from;
    ringClock.setActive(false);
    ringClock.setActive(true);
    return () => ringClock.setActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey, covered]);

  // --- committing: the rules decide; the paper flies into the tray (up) or the drawer (down)
  const startLeave = useCallback(
    (side: R.Choice, y0: number) => {
      const vm = shownRef.current;
      leaveAt.current = Date.now();
      setLeaving({ vm, side, n: leaveAt.current, fit: fitRef.current, slip: PdRef.current.slip });
      setShown(NONE);
      leaveY.value = y0;
      leaveK.value = 1;
      leaveY.value = withTiming(side === 'sign' ? trayDy : drawerDy, { duration: LEAVE_MS, easing: Easing.in(Easing.quad) });
      leaveK.value = withTiming(0.22, { duration: LEAVE_MS, easing: Easing.in(Easing.quad) });
      if (side === 'refuse') {
        hold.value = 1;
        hold.value = withDelay(LEAVE_MS, withTiming(0, { duration: 320 }));
      }
      paperY.value = 0;
      setTimeout(() => setLeaving((l) => (l && l.n === leaveAt.current ? null : l)), LEAVE_MS + 30);
    },
    [trayDy, drawerDy, leaveY, leaveK, hold, paperY],
  );

  const shakeIt = useCallback(() => {
    shake.value = withTiming(7, { duration: 50 }, () => {
      shake.value = withSpring(0, { damping: 4, stiffness: 900, mass: 0.4 });
    });
  }, [shake]);

  const commit = useCallback(
    (side: R.Choice, y0: number) => {
      const vm = shownRef.current;
      const ui = useDecreeUi.getState();
      if (vm.kind === 'none') return;
      const ok = decreeActions.decide(side);
      ui.disarm();
      if (!ok) {
        // Signing while short (or a slip the treasury cannot pay now) springs back and shakes the strip.
        paperY.value = withSpring(0, SPRING);
        if (side === 'sign') shakeIt();
        return;
      }
      // A ribbon-cutting signed: the scissors' snip, heard now and drawn on the paper as it flies (finding 63).
      if (side === 'sign' && vm.kind === 'paper' && vm.ground === 'ribbon') fx.play('ribbon', { haptic: false });
      startLeave(side, y0);
    },
    [paperY, shakeIt, startLeave],
  );

  const sideAt = useCallback(
    (ys: number): R.Choice | null => {
      const vm = shownRef.current;
      if (vm.kind === 'slip') return ys < L.paper.h / 2 ? 'sign' : 'refuse';
      // the tap's distance from the paper's top, in the paper's own (unscaled) points
      const y = ys / k;
      if (y >= m.sign.y - 6 && y <= m.sign.y + m.sign.h) return 'sign';
      if (y >= m.refuse.y && y <= m.refuse.y + m.refuse.h + 6) return 'refuse';
      return null;
    },
    [L.paper.h, m, k],
  );

  const handlers = useFlick(paperY, L.paper.y, {
    enabled: () => shownRef.current.kind !== 'none',
    onTap: (y) => {
      const ui = useDecreeUi.getState();
      const side = sideAt(y);
      if (!side) {
        ui.disarm();
        ui.touch();
        return;
      }
      if (ui.armed === side) commit(side, 0);
      else ui.arm(side);
    },
    onRelease: (r: Release, dy: number) => {
      if (r === 'spring') {
        paperY.value = withSpring(0, SPRING);
        return;
      }
      commit(r, followOf(dy, upRoom, downRoom));
    },
  });

  // A tap on the desk around the paper: the out-tray takes a resting paper back; elsewhere it commits it, or disarms.
  const deskGrantY = useRef(0);
  const onDesk = useCallback(
    (pageY: number) => {
      const ui = useDecreeUi.getState();
      const a = around;
      if (a?.pending) {
        // Only a real tap in the tray band or on the pill takes the paper back; a habitual second flick
        // that ends in the band is a "tap elsewhere" and commits it (finding 6).
        const moved = Math.abs(pageY - deskGrantY.current) > TAP_SLOP;
        const inTray = !moved && (pageY < L.paper.y || (pageY >= P.pill.y && pageY <= P.pill.y + P.pill.h));
        if (inTray) {
          takingBack.current = true;
          if (!decreeActions.takeBack()) takingBack.current = false;
        } else decreeActions.commitPending();
        ui.touch();
        return;
      }
      if (ui.armed) ui.disarm();
      else ui.touch();
    },
    [around, L.paper.y, P.pill],
  );

  // --- the hint targets of the drawn parts (src/ui/hints/targets.ts)
  const slipOn = shown.kind === 'slip';
  useEffect(() => {
    const r = (q: Rect) => ({ x: q.x, y: q.y, width: q.w, height: q.h });
    const sc = fit.screen;
    targets.set('paper', r(sc));
    targets.set('strip:sign', r({ x: sc.x, y: sc.y + m.sign.y * k, w: sc.w, h: m.sign.h * k }));
    targets.set('strip:refuse', r({ x: sc.x, y: sc.y + m.refuse.y * k, w: sc.w, h: m.refuse.h * k }));
    targets.set('outTray', r(L.outTray));
    targets.set('drawer', r(L.drawer));
    targets.set('slip', slipOn ? r(scaled(Pd.slip, L.paper, k)) : null);
    return () => ['paper', 'strip:sign', 'strip:refuse', 'outTray', 'drawer', 'slip'].forEach((k) => targets.set(k, null));
  }, [L, m, k, fit, Pd, slipOn]);

  // --- the still layers
  // The room and the desk re-record only when what they draw changes (not each second of the door's clock).
  const backKey = around ? JSON.stringify({ ...around, door: '', pending: null, waiting: 0, trayFull: false }) : '';
  const aroundRef = useRef(around);
  aroundRef.current = around;
  const room = useMemo(() => (aroundRef.current ? backPicture(L, P, aroundRef.current) : null), [L, P, backKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const drawerKey = around ? `${around.office}|${drawerStage(around.drawer)}` : '';
  const drawers = useMemo(() => (around ? drawerPictures(P, around) : []), [P, drawerKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const rest = useMemo(() => restPicture(P), [P]);
  const pic = usePaperPicture(shown, D, Pd.slip, m, faces);
  const leavePic = usePaperPicture(leaving?.vm ?? NONE, leaving?.fit.design ?? D, leaving?.slip ?? Pd.slip, leaving?.fit.m ?? m, faces);
  // The armed strips (110 %), one small picture per side, recorded with the paper and shown on the UI
  // thread while that side is armed: by a drag past 40 pt (paperY) or by the tap path (tapSide).
  const armKey = shown.kind === 'paper' ? JSON.stringify([shown.key, shown.sign.rows.map((r) => r.map((c) => c.wide)), shown.refuse.rows.map((r) => r.map((c) => c.wide)), shown.sign.density, shown.refuse.density]) : '';
  const armPics = useMemo(() => {
    const v = shownRef.current;
    return v.kind === 'paper' ? { sign: armedStripPicture(v, D.w, m, 'sign'), refuse: armedStripPicture(v, D.w, m, 'refuse') } : null;
  }, [armKey, D.w, m]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    tapSide.value = armed === 'sign' ? 1 : armed === 'refuse' ? -1 : 0;
  }, [armed, tapSide]);
  const signOn = useDerivedValue<number>(() => (tapSide.value === 1 || paperY.value <= -ARM_AT ? 1 : 0));
  const refuseOn = useDerivedValue<number>(() => (tapSide.value === -1 || paperY.value >= ARM_AT ? 1 : 0));
  const signArmXf = useDerivedValue(() => (signOn.value ? ON : OFF));
  const refuseArmXf = useDerivedValue(() => (refuseOn.value ? ON : OFF));
  const player = around?.player || 'bramble';
  const signature = useMemo(() => signaturePicture(player, m, D.w, titleEnd), [player, m, D.w, titleEnd]);
  const leaveSignature = useMemo(() => (leaving && leaving.fit !== fit ? signaturePicture(player, leaving.fit.m, leaving.fit.design.w, titleEnd) : null), [leaving, fit, player, titleEnd]);
  // The snip over a signed ribbon-cutting: the giant scissors closing on the SIGN strip.
  const snipW = D.w;
  const snipY = m.sign.y + m.sign.h / 2;
  const snipPic = useMemo(() => picture({ x: 0, y: 0, w: snipW, h: snipY + 60 }, (c) => at(c, snipW * 0.78, snipY, 0.55, -24, (q) => drawGiantScissors(q, 40, { open: 6 }))), [snipW, snipY]);
  const ringPath = useMemo(() => arc(rest.ring.cx, rest.ring.cy, rest.ring.r, -90, 359.9), [rest]);

  // --- what the UI thread computes from paperY
  const cx = L.paper.x + L.paper.w / 2;
  const cy = L.paper.y + L.paper.h / 2;
  const paperXf = useDerivedValue(() => {
    const e = enter.value;
    const b = back.value;
    return [{ translateX: (1 - e) * dxIn + shake.value }, { translateY: followOf(paperY.value, upRoom, downRoom) + (1 - e) * dyIn + b * trayDy }, { scale: (0.3 + 0.7 * e) * (1 - 0.7 * b) * k }];
  }, [dxIn, dyIn, upRoom, downRoom, trayDy, k]);
  const kLeave = leaving?.fit.k ?? 1;
  const leaveXf = useDerivedValue(() => [{ translateY: leaveY.value }, { scale: leaveK.value * kLeave }], [kLeave]);
  const sb = signature.box;
  const inkClip = useDerivedValue(() => ({ x: sb.x - 4, y: sb.y - 8, width: (sb.w + 8) * inkOf(paperY.value), height: sb.h + 16 }), [sb]);
  const drawerOpen = useDerivedValue(() => Math.max(drawerOf(paperY.value), hold.value));
  const paperStyle = useAnimatedStyle(() => {
    const e = enter.value;
    const b = back.value;
    return { transform: [{ translateX: (1 - e) * dxIn + shake.value }, { translateY: followOf(paperY.value, upRoom, downRoom) + (1 - e) * dyIn + b * trayDy }, { scale: (0.3 + 0.7 * e) * (1 - 0.7 * b) * k }] };
  }, [dxIn, dyIn, upRoom, downRoom, trayDy, k]);
  // The desk's small words hide while the paper lies over them (the door and the sticky note above, the drawer's card below).
  const overTop = useAnimatedStyle(() => ({ opacity: paperY.value < -6 ? 0 : 1 }));
  const overDrawer = useAnimatedStyle(() => ({ transform: [{ translateY: drawerOpen.value * P.drawer.h * 0.42 }] }), [P.drawer.h]);
  const leaveStyle = useAnimatedStyle(() => ({ transform: [{ translateY: leaveY.value }, { scale: leaveK.value * kLeave }] }), [kLeave]);

  const onA11y = useCallback(
    (e: AccessibilityActionEvent) => {
      if (e.nativeEvent.actionName === 'sign') commit('sign', 0);
      else if (e.nativeEvent.actionName === 'refuse') commit('refuse', 0);
    },
    [commit],
  );

  const pending = !!around?.pending;
  const empty = shown.kind === 'none' && !leaving && !pending;
  const showPill = armed !== null && !finger && shown.kind !== 'none';
  const slipWords = shown.kind === 'slip';
  const a11yLabel = shown.kind === 'paper' ? S.desk.paperLabel(shown.name, shown.text) : shown.kind === 'slip' ? S.desk.slipLabel(shown.what, shown.price) : S.desk.emptyDesk;
  const signWord = slipWords ? S.desk.buy : S.desk.sign;
  const studyWord = slipWords ? S.desk.putBack : S.desk.study;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {room ? <Picture picture={room} /> : null}
        {pending ? (
          <Group>
            <Picture picture={rest.pic} />
            <Path path={ringPath} style="stroke" strokeWidth={2} color={DESK.slate} start={0} end={ring} />
          </Group>
        ) : null}
        {leaving && leavePic ? (
          <Group transform={leaveXf} origin={{ x: cx, y: cy }}>
            <Group transform={[{ translateX: leaving.vm.kind === 'slip' ? leaving.slip.x : leaving.fit.design.x }, { translateY: leaving.vm.kind === 'slip' ? leaving.slip.y : leaving.fit.design.y }]}>
              <Picture picture={leavePic} />
              {leaving.side === 'sign' && leaving.vm.kind === 'paper' ? <Picture picture={(leaveSignature ?? signature).pic} /> : null}
              {leaving.side === 'sign' && leaving.vm.kind === 'paper' && leaving.vm.ground === 'ribbon' ? <Picture picture={snipPic} /> : null}
            </Group>
          </Group>
        ) : null}
        {pic ? (
          <Group transform={paperXf} origin={{ x: cx, y: cy }}>
            <Group transform={[{ translateX: shown.kind === 'slip' ? Pd.slip.x : D.x }, { translateY: shown.kind === 'slip' ? Pd.slip.y : D.y }]}>
              <Picture picture={pic} />
              {armPics ? (
                <>
                  <Group transform={signArmXf}>
                    <Picture picture={armPics.sign} />
                  </Group>
                  <Group transform={refuseArmXf}>
                    <Picture picture={armPics.refuse} />
                  </Group>
                </>
              ) : null}
              {shown.kind === 'paper' ? (
                <Group clip={inkClip}>
                  <Picture picture={signature.pic} />
                </Group>
              ) : null}
            </Group>
          </Group>
        ) : null}
        {/* the drawer's front over the paper: a refused paper goes into it */}
        {drawers.map((d, k) => (
          <DrawerLayer key={k} k={k} pic={d} open={drawerOpen} />
        ))}
      </Canvas>

      {/* the desk's own small words: the door glass, the drawer's card, the sticky note */}
      <Animated.View style={[abs(P.glass), styles.center, overTop]} pointerEvents="none">
        <DoorGlass font={P.font.glass} />
      </Animated.View>
      <Animated.View style={[abs(P.drawerLabel), styles.center, overDrawer, buttons ? styles.hidden : null]} pointerEvents="none">
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.drawerLabel, { fontSize: P.font.drawerLabel }]}>
          {S.desk.drawerLabel(String(around?.drawer ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
        </Text>
      </Animated.View>
      {around?.sticky?.where === 'band' ? (
        <Animated.View style={[abs(P.stickyText), { transform: [{ rotate: '1.5deg' }] }, overTop]} pointerEvents="none">
          {around.sticky.lines.map((t, i) => (
            <Text key={i} allowFontScaling={false} numberOfLines={1} style={[styles.sticky, { fontSize: P.font.sticky * fitScale(t, P.font.sticky, P.stickyText.w), lineHeight: Math.round(P.font.sticky * STICKY_LINE) }]}>
              {t}
            </Text>
          ))}
        </Animated.View>
      ) : null}

      {/* the desk around the paper: takes a resting paper back, commits it, or disarms */}
      <View
        style={abs({ x: 0, y: L.outTray.y, w: L.width, h: L.drawer.y + L.drawer.h - L.outTray.y })}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          deskGrantY.current = e.nativeEvent.pageY;
        }}
        onResponderRelease={(e) => onDesk(e.nativeEvent.pageY)}
      />

      {empty ? (
        <View style={[abs({ x: L.paper.x, y: L.paper.y, w: L.paper.w, h: L.paper.h * 0.45 }), styles.center]} pointerEvents="none">
          <Text allowFontScaling={false} style={[styles.empty, { fontSize: P.font.emptyDesk }]}>
            {S.desk.emptyDesk}
          </Text>
        </View>
      ) : null}
      {empty && around?.sticky?.where === 'desk' ? (
        <View style={[abs(P.deskStickyText), { transform: [{ rotate: '-2deg' }] }]} pointerEvents="none">
          {around.sticky.lines.map((t, i) => (
            <Text key={i} allowFontScaling={false} numberOfLines={i === 0 ? 2 : 1} style={[styles.sticky, { fontSize: P.font.deskSticky, lineHeight: Math.round(P.font.deskSticky * STICKY_LINE) }]}>
              {t}
            </Text>
          ))}
        </View>
      ) : null}
      {pending ? (
        <View style={[abs(P.pill), styles.pill]} pointerEvents="none">
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.pillText, { fontSize: P.font.pill }]}>
            {S.desk.takeBack}
          </Text>
        </View>
      ) : null}

      {/* the paper's words, moved with it and cut at the drawer's front (a refused paper goes into the drawer) */}
      <View style={[abs({ x: 0, y: L.outTray.y, w: L.width, h: L.drawer.y - L.outTray.y }), styles.clip]} pointerEvents="none">
        {leaving && leaving.vm.kind !== 'none' ? (
          <Animated.View style={[abs(up(leaving.vm.kind === 'slip' ? leaving.slip : leaving.fit.design, L.outTray.y)), leaveStyle]}>
            <Words vm={leaving.vm} m={leaving.fit.m} w={leaving.fit.design.w} s={s} signOn={zero} refuseOn={zero} live={false} />
          </Animated.View>
        ) : null}
        {shown.kind !== 'none' ? (
          <Animated.View style={[abs(up(shown.kind === 'slip' ? Pd.slip : D, L.outTray.y)), paperStyle]}>
            <Words vm={shown} m={m} w={D.w} s={s} signOn={signOn} refuseOn={refuseOn} onTitleEnd={setTitleEnd} />
          </Animated.View>
        ) : null}
      </View>
      <View
        style={abs(shown.kind === 'slip' ? scaled(Pd.slip, L.paper, k) : fit.screen)}
        pointerEvents={shown.kind === 'none' ? 'none' : 'auto'}
        accessible={shown.kind !== 'none'}
        accessibilityLabel={a11yLabel}
        accessibilityActions={shown.kind !== 'none' ? [{ name: 'sign', label: signWord }, { name: 'refuse', label: studyWord }] : undefined}
        onAccessibilityAction={onA11y}
        {...handlers}
      />

      {showPill ? (
        <View style={[abs(armed === 'sign' ? L.outTray : L.drawer), styles.center]} pointerEvents="none">
          <View style={[styles.armPill, { borderColor: armed === 'sign' ? DESK.violet : DESK.slate }]}>
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.armText, { fontSize: 12 * s, color: armed === 'sign' ? DESK.violet : DESK.slateDeep }]}>
              {armed === 'sign' ? (slipWords ? S.desk.armBuy : S.desk.armSign) : slipWords ? S.desk.armBack : S.desk.armRefuse}
            </Text>
          </View>
        </View>
      ) : null}

      {buttons && shown.kind !== 'none' ? (
        <View style={[abs(L.drawer), styles.buttons]} pointerEvents="box-none">
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => commit('sign', 0)} style={[styles.button, { backgroundColor: DESK.violet }]}>
            <Text allowFontScaling={false} style={[styles.buttonText, { fontSize: 13 * s }]}>
              {`${S.desk.up} ${signWord}`}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => commit('refuse', 0)} style={[styles.button, { backgroundColor: DESK.slate }]}>
            <Text allowFontScaling={false} style={[styles.buttonText, { fontSize: 13 * s }]}>
              {`${S.desk.down} ${studyWord}`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const abs = (r: Rect) => ({ position: 'absolute' as const, left: r.x, top: r.y, width: r.w, height: r.h });
/** A rectangle inside the paper's design rectangle as the screen shows it (scaled by `k` about the paper's centre). */
const scaled = (r: Rect, paper: Rect, k: number): Rect => {
  const cx = paper.x + paper.w / 2;
  const cy = paper.y + paper.h / 2;
  return { x: cx + (r.x - cx) * k, y: cy + (r.y - cy) * k, w: r.w * k, h: r.h * k };
};
/** A rectangle moved up by `dy` (into a container that starts `dy` down the screen). */
const up = (r: Rect, dy: number): Rect => ({ ...r, y: r.y - dy });

/** The door glass's clock, selecting its own words once a second (finding 7: the desk does not re-render for it). */
const DoorGlass = memo(function DoorGlass({ font }: { font: number }) {
  const text = useDecree(doorText, '');
  return (
    <Text allowFontScaling={false} numberOfLines={1} style={[styles.glass, { fontSize: font }]}>
      {text}
    </Text>
  );
});

/** The words of a desk item (a paper or a slip). */
function Words({ vm, m, w, s, signOn, refuseOn, live = true, onTitleEnd }: { vm: DeskVM; m: ReturnType<typeof paperMetrics>; w: number; s: number; signOn: SharedValue<number>; refuseOn: SharedValue<number>; live?: boolean; onTitleEnd?: (x: number) => void }) {
  if (vm.kind === 'paper') return <PaperWords vm={vm} m={m} w={w} s={s} signOn={signOn} refuseOn={refuseOn} live={live} onTitleEnd={onTitleEnd} />;
  if (vm.kind === 'slip') return <SlipWords vm={vm} s={s} />;
  return null;
}

/** The paper's (or slip's) ground, re-recorded only when what it draws changes (not when a number ticks). */
function usePaperPicture(vm: DeskVM, D: Rect, slip: Rect, m: ReturnType<typeof paperMetrics>, faces: boolean) {
  const key =
    vm.kind === 'paper'
      ? JSON.stringify([vm.key, vm.ground, vm.face, vm.picket, faces, vm.sign.rows.map((r) => r.map((c) => c.wide)), vm.refuse.rows.map((r) => r.map((c) => c.wide)), vm.sign.density, vm.refuse.density])
      : vm.kind === 'slip'
        ? `slip:${vm.key}`
        : '';
  const vmRef = useRef(vm);
  vmRef.current = vm;
  return useMemo(() => {
    const v = vmRef.current;
    if (v.kind === 'paper') return paperPicture(v as PaperVM, D.w, D.h, m, null);
    if (v.kind === 'slip') return slipPicture(slip);
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, D.w, D.h, slip.w, slip.h, m]);
}

/** One of the drawer's openings, shown only while the pull (or a refusal) opens it that far. */
const DrawerLayer = memo(function DrawerLayer({ k, pic, open }: { k: number; pic: ReturnType<typeof drawerPictures>[number]; open: SharedValue<number> }) {
  const xf = useDerivedValue(() => (drawerStep(open.value, DRAWER_STEPS) === k ? ON : OFF), [k]);
  return (
    <Group transform={xf}>
      <Picture picture={pic} />
    </Group>
  );
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  clip: { overflow: 'hidden' },
  hidden: { opacity: 0 },
  glass: { color: DESK.slateDeep, fontWeight: '700', fontVariant: ['tabular-nums'] },
  drawerLabel: { color: DESK.line, fontWeight: '700', letterSpacing: 0.4 },
  sticky: { color: DESK.line, fontWeight: '600' },
  empty: { color: DESK.paperShade, fontStyle: 'italic' },
  pill: { alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: DESK.paperLight, borderWidth: 1.5, borderColor: DESK.slate },
  pillText: { color: DESK.slateDeep, fontWeight: '700' },
  armPill: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, borderWidth: 1.5, backgroundColor: DESK.paperLight },
  armText: { fontWeight: '700' },
  buttons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  button: { minWidth: 120, minHeight: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { color: DESK.white, fontWeight: '700' },
});
