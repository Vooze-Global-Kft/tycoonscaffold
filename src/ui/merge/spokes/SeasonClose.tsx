/**
 * The season close (spec 2.11, 4.4, 5.6 with M21, M36, M37): the confirm (the kit Sheet, uiState's
 * sheet `seasonClose`) repeats what resets and what stays and how many waiting gift boxes open
 * first; "Close the season" calls the store's close action ONCE and shows the rules' refusal if
 * there is one. Then the change of season, a short ceremony over the Season scroll: the lanterns go
 * out one by one along the wire, the new street's board takes its shape with its decoration, the
 * piece the old season left and the new stall appear; a tap skips it, and it ends by itself after
 * about five seconds, on the fresh board (the spoke closes with it).
 *
 * The ceremony runs on ONE clock (a Reanimated shared value 0..1 on the UI thread); every opacity is
 * a worklet of it; the pictures are recorded once per size and kept. It registers with useOverlay,
 * and Android back skips it like a tap. Package SPOKES (7b).
 */
import { Canvas, Group, Picture, Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { BackHandler, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as R from '../../../engine/merge';
import { mergeActions, mergeNow } from '../../../modes/merge/actions';
import { fx } from '../../../services/fx';
import { Sheet, useOverlay } from '../../kit';
import { MergeIcon } from '../art/MergeIcon';
import { drawLantern } from '../art/lantern.draw';
import { NIGHT, alpha } from '../art/palette';
import { at, builder, stroke, INK } from '../art/pen';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { C, PaperButton, T } from './kit';
import { useSpokeLocal, type Ceremony as CeremonyState } from './local';
import { seasonBoardPicture } from './SeasonScroll';
import { decorationOf, gearIcon, scrollView, shapeId } from './views';

const W = S.spokes;

/**
 * Closes the season now: refused (with the rules' reason on the confirm) unless canCloseSeason
 * allows it; otherwise calls mergeActions.closeSeason once and starts the change of season.
 */
export function closeSeasonNow(): boolean {
  const local = useSpokeLocal.getState();
  const now = mergeNow();
  if (!now) return false;
  if (!R.canCloseSeason(now.cfg, now.g)) {
    fx.play('ui_denied');
    local.setRefusal(W.refused);
    return false;
  }
  const from = now.g.merge.season;
  if (!mergeActions.closeSeason()) {
    local.setRefusal(W.refusedOther);
    return false;
  }
  const after = mergeNow();
  const ui = useMergeUi.getState();
  ui.closeSheet();
  // The ceremony plays over the Season scroll, so the play canvas keeps its clocks stopped beneath.
  if (ui.spoke !== 'season') ui.openSpoke('season');
  local.startCeremony({ from, to: after?.g.merge.season ?? from + 1 });
  return true;
}

/** The confirm sheet (uiState sheet `seasonClose`). */
export function SeasonCloseConfirm() {
  const open = useMergeUi((s) => s.sheet?.type === 'seasonClose');
  const refusal = useSpokeLocal((s) => s.refusal);
  const view = useMemo(() => {
    if (!open) return null;
    const now = mergeNow();
    return now ? scrollView(now.cfg, now.g) : null;
  }, [open]);
  useEffect(() => {
    if (!open) useSpokeLocal.getState().setRefusal(null);
  }, [open]);
  const close = () => {
    fx.play('ui_close');
    useMergeUi.getState().closeSheet();
  };
  return (
    <Sheet
      visible={open && !!view}
      onClose={close}
      title={view ? W.confirmTitle(view.season) : ''}
      footer={
        <View style={styles.buttons}>
          <PaperButton label={W.confirmGo} onPress={() => void closeSeasonNow()} disabled={!view?.canClose} />
          <PaperButton tone="paper" label={W.confirmStay} onPress={close} />
        </View>
      }
    >
      {view ? (
        <>
          <T size={12} weight="700" color={C.brass} style={styles.head}>
            {W.resets}
          </T>
          <T size={14} color={C.text}>
            {view.resets.join(', ')}
          </T>
          <T size={12} weight="700" color={C.brass} style={styles.head}>
            {W.stays}
          </T>
          <T size={14} color={C.text}>
            {view.stays.join(', ')}
          </T>
          {view.boxes > 0 ? (
            <View style={styles.boxes}>
              <MergeIcon icon="art:giftbag-3" size={30} />
              <T size={13} color={C.dim} style={{ flex: 1 }}>
                {W.confirmBoxes(view.boxes)}
              </T>
            </View>
          ) : null}
          <T size={13} color={C.dim} style={{ marginTop: 12 }}>
            {`${W.nextHead(view.next.season)}. ${view.next.sentence}`}
          </T>
          {refusal || !view.canClose ? (
            <T size={14} weight="700" color={C.amberSoft} style={{ marginTop: 12 }}>
              {refusal ?? W.refused}
            </T>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

// ----------------------------------------------------------------------------- the change of season

const LANTERNS = 9;
const DURATION = 5200;

interface Spot {
  x: number;
  y: number;
}

function wireSpots(w: number, y: number): Spot[] {
  const x0 = w * 0.04;
  const x1 = w * 0.96;
  const sag = 7;
  return Array.from({ length: LANTERNS }, (_, i) => {
    const t = (i + 0.5) / LANTERNS;
    return { x: x0 + (x1 - x0) * t, y: y + 4 * sag * t * (1 - t) + 16 };
  });
}

const pictures = new Map<string, SkPicture>();
function keep(key: string, w: number, h: number, draw: (c: SkCanvas) => void): SkPicture {
  const hit = pictures.get(key);
  if (hit) return hit;
  const rec = Skia.PictureRecorder();
  draw(rec.beginRecording(Skia.XYWHRect(0, 0, w, h)));
  const p = rec.finishRecordingAsPicture();
  pictures.set(key, p);
  return p;
}

/** The night sky and the wire with its lanterns unlit (what stays when they have gone out). */
function skyPicture(w: number, h: number, wireY: number): SkPicture {
  return keep(`sky:${Math.round(w)}x${Math.round(h)}:${Math.round(wireY)}`, w, h, (c) => {
    const sky = Skia.Paint();
    sky.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: 0, y: h }, [Skia.Color(NIGHT.indigoDeep), Skia.Color(NIGHT.indigo), Skia.Color(NIGHT.tealDeep)], [0, 0.5, 1], 0));
    c.drawRect(Skia.XYWHRect(0, 0, w, h), sky);
    let s = 5;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const star = Skia.Paint();
    for (let i = 0; i < 40; i++) {
      star.setColor(Skia.Color(alpha(NIGHT.moon, 0.1 + rnd() * 0.35)));
      c.drawCircle(rnd() * w, rnd() * h * 0.5, 0.5 + rnd() * 0.9, star);
    }
    c.drawPath(builder().moveTo(w * 0.04 - 20, wireY).quadTo(w / 2, wireY + 14, w * 0.96 + 20, wireY).build(), stroke(alpha(INK, 0.95), 1.1));
    for (const p of wireSpots(w, wireY)) at(c, p.x, p.y, 1, 0, (q) => drawLantern(q, 9, { look: 'unlit', cord: 4 }));
  });
}

function litPicture(p: Spot, key: string): SkPicture {
  return keep(`lit:${key}`, p.x + 40, p.y + 40, (c) => at(c, p.x, p.y, 1, 0, (q) => drawLantern(q, 9, { look: 'lit', cord: 4 })));
}

/** 0..1 between a and b (a worklet: the ceremony's opacities run on the UI thread). */
function ramp(p: number, a: number, b: number): number {
  'worklet';
  return Math.max(0, Math.min(1, (p - a) / (b - a)));
}

function LitLantern({ pic, i, p }: { pic: SkPicture; i: number; p: SharedValue<number> }) {
  const opacity = useDerivedValue(() => 1 - ramp(p.value, 0.06 + i * 0.035, 0.12 + i * 0.035));
  return (
    <Group opacity={opacity} layer>
      <Picture picture={pic} />
    </Group>
  );
}

function Fade({ p, a, b, out, style, children }: { p: SharedValue<number>; a: number; b: number; out?: boolean; style?: object; children: React.ReactNode }) {
  const st = useAnimatedStyle(() => {
    const k = ramp(p.value, a, b);
    return { opacity: out ? 1 - k : k, transform: [{ translateY: (out ? -k : 1 - k) * 8 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[style, st]}>
      {children}
    </Animated.View>
  );
}

/** Mounted while a change of season plays (useSpokeLocal `ceremony`). */
export function SeasonCeremony() {
  const c = useSpokeLocal((s) => s.ceremony);
  return c ? <CeremonyView key={`${c.from}-${c.to}`} c={c} /> : null;
}

function finish(): void {
  useSpokeLocal.getState().endCeremony();
  useMergeUi.getState().closeSpoke();
}

function CeremonyView({ c }: { c: CeremonyState }) {
  useOverlay(true);
  const { width: w, height: h } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wireY = insets.top + 56;
  const p = useSharedValue(0);
  const info = useMemo(() => {
    const now = mergeNow();
    if (!now) return null;
    const row = R.seasonRow(now.cfg, c.to);
    const opening = now.cfg.merge.chains.findIndex((ch) => ch.fromSeason === c.to);
    return {
      from: R.seasonRow(now.cfg, c.from).name,
      to: row.name,
      sentence: W.place[row.character] ?? W.place.none,
      shape: shapeId(row.shape),
      decoration: decorationOf(c.to),
      opening: opening >= 0 ? opening : null,
      newStall: opening >= 0 ? W.newStall(now.cfg.merge.chains[opening].gear) : null,
    };
  }, [c]);
  const sky = useMemo(() => skyPicture(w, h, wireY), [w, h, wireY]);
  const lit = useMemo(() => wireSpots(w, wireY).map((s, i) => litPicture(s, `${Math.round(w)}:${Math.round(wireY)}:${i}`)), [w, wireY]);
  const cell = Math.min(26, Math.floor((w - 120) / 7));
  const board = useMemo(() => (info ? seasonBoardPicture(info.shape, info.decoration, cell) : null), [info, cell]);
  const bw = 7 * cell + 8;
  const bh = 8 * cell + 8;
  const boardY = Math.round(h * 0.42 - bh / 2 + 30);
  const boardOpacity = useDerivedValue(() => ramp(p.value, 0.42, 0.6));
  const boardMove = useDerivedValue(() => [{ translateY: (1 - ramp(p.value, 0.42, 0.62)) * 18 }]);
  useEffect(() => {
    p.value = withTiming(1, { duration: DURATION, easing: Easing.linear }, (done) => {
      if (done) runOnJS(finish)();
    });
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      skip();
      return true;
    });
    return () => {
      sub.remove();
      cancelAnimation(p);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skip = () => {
    cancelAnimation(p);
    finish();
  };
  if (!info || !board) return null;
  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityRole="button" accessibilityLabel={W.ceremonyTap}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Picture picture={sky} />
        {lit.map((pic, i) => (
          <LitLantern key={i} pic={pic} i={i} p={p} />
        ))}
        <Group opacity={boardOpacity} transform={boardMove} layer>
          <Group transform={[{ translateX: Math.round((w - bw) / 2) }, { translateY: boardY }]}>
            <Picture picture={board} />
          </Group>
        </Group>
      </Canvas>
      <Fade p={p} a={0.3} b={0.42} out style={[styles.title, { top: boardY - 70 }]}>
        <T size={22} weight="700" color={C.text} align="center" lines={1}>
          {W.ceremonyOut(info.from)}
        </T>
      </Fade>
      <Fade p={p} a={0.5} b={0.64} style={[styles.title, { top: boardY - 70 }]}>
        <T size={24} weight="700" color={C.amberSoft} align="center" lines={1}>
          {W.ceremonyIn(info.to)}
        </T>
      </Fade>
      <Fade p={p} a={0.62} b={0.74} style={[styles.below, { top: boardY + bh + 16 }]}>
        <T size={15} color={C.text} align="center">
          {info.sentence}
        </T>
      </Fade>
      <Fade p={p} a={0.7} b={0.8} style={[styles.pieces, { top: boardY + bh + 70 }]}>
        <View style={styles.piece}>
          <MergeIcon icon={`art:season-${c.from % 4}`} size={44} />
        </View>
        {info.opening !== null && info.newStall ? (
          <View style={styles.stall}>
            <MergeIcon icon={gearIcon(info.opening)} size={40} />
            <T size={13} color={C.dim} style={{ flexShrink: 1 }}>
              {info.newStall}
            </T>
          </View>
        ) : null}
      </Fade>
      <Fade p={p} a={0.86} b={0.94} style={[styles.tap, { bottom: insets.bottom + 28 }]}>
        <T size={13} color={C.faint} align="center" lines={1}>
          {W.ceremonyTap}
        </T>
      </Fade>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttons: { gap: 8 },
  head: { letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 10, marginBottom: 2 },
  boxes: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  title: { position: 'absolute', left: 16, right: 16 },
  below: { position: 'absolute', left: 32, right: 32 },
  pieces: { position: 'absolute', left: 24, right: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  piece: { alignItems: 'center' },
  stall: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  tap: { position: 'absolute', left: 16, right: 16 },
});
