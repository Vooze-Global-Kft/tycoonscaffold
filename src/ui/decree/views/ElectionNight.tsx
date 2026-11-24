/**
 * Election Night (spec 4.4, 2.10, H2): a full-screen view (useOverlay; the desk's clocks stop beneath
 * it). A chalk tally board with one row per district, written as each envelope is opened; the bar
 * with the majority line under it; the Counting Clerk's paper cut-out opening an envelope every
 * 2.5 s in the rules' announcement order (safest first, closest last); each row's chalk marks and a
 * rosette if held; at the majority the bunting and the band in silhouette, then the rival's line. A
 * tap speeds the rest by four; Android back (PLATFORM's back.ts closes the view) jumps to the result,
 * never out mid-count (ViewsHost ends the night when the view closes in phase count).
 *
 * The numbers are the poll's, number for number: every share, every held flag and the order are the
 * rules' count (views/model.ts `nightModel`); this file computes none. Played straight: the board
 * carries no joke; the lines around it are the writers' (deck.night).
 *
 * Phone rules: one Skia canvas for the whole view; the board, each row's marks and the cut-outs are
 * pictures recorded once per layout and never freed while mounted; ONE animated value (`reveal`, the
 * newest row being chalked in) drives the clip of that row; the JS thread never reads it.
 */
import { Canvas, Group, Picture, rect } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { decreeNow } from '../../../modes/decree/actions';
import { fx } from '../../../services/fx';
import { useOverlay } from '../../kit/overlay';
import { alpha, DESK } from '../art/palette';
import { fill, picture } from '../art/pen';
import { drawTallyBoard, drawChalkMarks, drawEnvelope, drawTallyResult, tallyRows } from '../art/meta.draw';
import { CUTOUT_IDS, drawBand, drawCutout } from '../art/faces';
import { useFontScale } from '../hud/fontScale';
import { S } from '../strings';
import { useDecree } from '../useDecree';
import { type } from './metrics';
import { ENVELOPE_MS, FAST_FACTOR, nightModel, type NightModel } from './model';
import { INK, ViewButton } from './parts';

/** What the night has reached: envelopes read, then the end line (a defeat's own), the rival's line, the way on. */
interface Progress {
  shown: number;
  fast: boolean;
  stage: 'count' | 'end' | 'rival' | 'done';
  /** The line under the cut-out: who says it and what. */
  speaker: 'clerk' | 'rival';
  line: string | null;
  /** The majority was reached (a win): the bunting and the band. */
  majority: boolean;
}

/** The chalk marks a row shows: one for every ten points of the rules' share (a drawing of the share, never a number of its own). */
function marksOf(share: number): number {
  return Math.max(0, Math.min(10, Math.round(share / 1000)));
}

export function ElectionNight({ visible, onEnd }: { visible: boolean; onEnd: () => void }) {
  useOverlay(visible);
  const count = useDecree((_c, g) => g.decree.count, null);
  // Frozen while the view is open: the count does not change on election night.
  const model = useMemo<NightModel | null>(() => {
    const now = decreeNow();
    return now && count ? nightModel(now.cfg, now.g) : null;
  }, [count]);
  if (!visible || !model) return null;
  return <Night model={model} onEnd={onEnd} />;
}

function Night({ model, onEnd }: { model: NightModel; onEnd: () => void }) {
  const { width, height } = useWindowDimensions();
  const fontScale = useFontScale();
  const insets = useSafeAreaInsets();
  const s = Math.max(1, Math.min(fontScale || 1, 1.3));
  const n = model.rows.length;

  // ---- layout (pt), rows that add up: header, clerk band, board, bar, footer ----
  const pad = 16;
  const W = Math.min(width, 520);
  const x0 = (width - W) / 2 + pad;
  const w = W - pad * 2;
  const tTitle = type(18, s);
  const tSub = type(12, s);
  const tLine = type(13, s);
  const tWho = type(11, s);
  const tRow = type(13, s);
  const tBar = type(12, s);
  const headerH = tTitle.lineHeight + tSub.lineHeight + 8;
  const clerkH = Math.max(96, tWho.lineHeight + tLine.lineHeight * 3 + 18);
  const barH = tBar.lineHeight + 18;
  const footerH = 84;
  const gap = 8;
  const top = insets.top + 8;
  const boardH = Math.max(120, height - top - insets.bottom - headerH - clerkH - barH - footerH - gap * 4);
  const headerY = top;
  const clerkY = headerY + headerH + gap;
  const boardY = clerkY + clerkH + gap;
  const barY = boardY + boardH + gap;
  const footerY = barY + barH + gap;
  const rows = useMemo(() => tallyRows(w, boardH, n), [w, boardH, n]);
  const rowH = rows[0]?.name.h ?? 24;
  const markH = Math.min(16, Math.max(8, rowH - 10));
  const resultR = Math.min(11, rowH * 0.38);
  const shareW = Math.ceil(42 * s);
  const marksW = 50;
  /** Where a row's marks start: just left of its share (the name gets the rest of the row). */
  const marksX = (r: { result: { x: number } }) => r.result.x - shareW - 6 - marksW - 6;
  const cutW = Math.round((clerkH - 4) * (120 / 340));

  const [p, setP] = useState<Progress>({ shown: 0, fast: false, stage: 'count', speaker: 'clerk', line: model.openLine, majority: false });
  const reveal = useSharedValue(1);
  const fastRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // ---- the clock of the count: one envelope per interval, in the rules' order; then the end ----
  useEffect(() => {
    if (p.stage === 'done') return;
    const step = fastRef.current ? ENVELOPE_MS / FAST_FACTOR : ENVELOPE_MS;
    const wait = p.shown === 0 ? Math.min(step, 1500) : step;
    const t = setTimeout(() => {
      if (p.stage === 'count' && p.shown < n) {
        const k = p.shown;
        const row = model.rows[k];
        fx.play('env_open');
        reveal.value = 0;
        reveal.value = withTiming(1, { duration: Math.max(200, step * 0.45), easing: Easing.out(Easing.quad) });
        later(Math.max(120, step * 0.3), () => {
          fx.play('tally');
          fx.play(row.held ? 'district_held' : 'district_lost');
        });
        const atMajority = model.majorityAt === k;
        if (atMajority) later(Math.max(200, step * 0.5), () => fx.play('majority'));
        setP((q) => ({ ...q, shown: k + 1, majority: q.majority || atMajority, line: atMajority ? (model.endLine ?? q.line) : (model.lines[k] ?? q.line) }));
        return;
      }
      if (p.stage === 'count') {
        // After the last envelope: a defeat is told now (a win was told at its majority).
        if (!model.won) fx.play('defeat');
        setP((q) => ({ ...q, stage: 'end', line: model.won ? q.line : (model.endLine ?? q.line) }));
        return;
      }
      if (p.stage === 'end' && model.rivalLine) {
        setP((q) => ({ ...q, stage: 'rival', speaker: 'rival', line: model.rivalLine }));
        return;
      }
      setP((q) => ({ ...q, stage: 'done' }));
    }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.shown, p.stage]);

  const speedUp = () => {
    if (p.stage === 'done' || fastRef.current) return;
    fastRef.current = true;
    setP((q) => ({ ...q, fast: true }));
  };

  // ---- pictures, recorded once per layout (never freed while mounted) ----
  const bunting = model.won && p.majority;
  const board = useMemo(() => picture({ x: 0, y: 0, w, h: boardH }, (c) => drawTallyBoard(c, w, boardH, n, { bunting })), [w, boardH, n, bunting]);
  const marks = useMemo(
    () =>
      model.rows.map((r, i) =>
        picture({ x: 0, y: 0, w, h: boardH }, (c) => {
          const row = rows[i];
          c.save();
          c.translate(marksX(row), row.marks.y + (row.marks.h - markH) / 2);
          drawChalkMarks(c, marksOf(r.share), markH, 11 + i * 7);
          c.restore();
          c.save();
          c.translate(row.result.x + row.result.w / 2, row.result.y + row.result.h / 2);
          drawTallyResult(c, r.held, resultR);
          c.restore();
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model.rows, rows, w, boardH, markH, resultR, shareW],
  );
  const rivalCut = CUTOUT_IDS.includes(model.rival.id as never);
  const clerkId = model.clerk.face.replace(/^face:/, '');
  const speakerPic = useMemo(
    () =>
      picture({ x: 0, y: 0, w: cutW + 40, h: clerkH }, (c) => {
        const who = p.speaker === 'rival' && rivalCut ? model.rival.id : clerkId;
        drawCutout(c, who, { x: 0, y: 2, width: cutW, height: clerkH - 4 });
      }),
    [p.speaker, rivalCut, model.rival.id, clerkId, cutW, clerkH],
  );
  const envelopeOpen = useMemo(() => picture({ x: -24, y: -24, w: 48, h: 48 }, (c) => drawEnvelope(c, 1, 0.8)), []);
  const envelopeShut = useMemo(() => picture({ x: -24, y: -24, w: 48, h: 48 }, (c) => drawEnvelope(c, 0, 0.8)), []);
  const bandW = Math.round((footerH - 8) * (240 / 180));
  const band = useMemo(() => picture({ x: 0, y: 0, w: bandW, h: footerH }, (c) => drawBand(c, { x: 0, y: 4, width: bandW, height: footerH - 8 }, { color: alpha(DESK.chalkLine, 0.22) })), [footerH, bandW]);
  const heldNow = p.shown > 0 ? model.heldAfter[p.shown - 1] : 0;
  const bar = useMemo(
    () =>
      picture({ x: 0, y: 0, w, h: 10 }, (c) => {
        const cw = w / model.of;
        for (let i = 0; i < model.of; i++) {
          const r = { x: i * cw + 1, y: 0, width: cw - 2, height: 10 };
          const paint = fill(i < heldNow ? DESK.violetLight : alpha(DESK.chalkLine, 0.12));
          c.drawRect(r, paint);
        }
        const mx = model.majority * cw;
        for (let y = -4; y < 14; y += 4) c.drawRect({ x: mx - 1, y, width: 2, height: 2.4 }, fill(DESK.chalkLine));
      }),
    [w, model.of, model.majority, heldNow],
  );

  // The newest row is chalked in under one clip that grows with `reveal` (UI thread).
  const newest = p.shown - 1;
  const clip = useDerivedValue(() => rect(0, 0, w * reveal.value, boardH), [w, boardH]);
  const newestStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));

  const speakerName = p.speaker === 'rival' ? model.rival.name : S.views.nightSpeaker(model.clerk.name, model.clerk.role);
  const line = p.shown === 0 && !model.openLine ? S.views.nightWaiting : p.line;
  return (
    <Pressable style={[StyleSheet.absoluteFill, styles.root]} onPress={speedUp} accessibilityHint={p.stage === 'done' ? undefined : S.views.nightFaster}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group transform={[{ translateX: x0 }, { translateY: clerkY }]}>
          <Picture picture={speakerPic} />
          <Group transform={[{ translateX: cutW * 0.78 }, { translateY: clerkH * 0.42 }]}>{p.stage === 'count' && p.shown > 0 ? <Picture picture={envelopeOpen} /> : <Picture picture={envelopeShut} />}</Group>
        </Group>
        <Group transform={[{ translateX: x0 }, { translateY: boardY }]}>
          <Picture picture={board} />
          {marks.slice(0, Math.max(0, newest)).map((m, i) => (
            <Picture key={i} picture={m} />
          ))}
          {newest >= 0 ? (
            <Group clip={clip}>
              <Picture picture={marks[newest]} />
            </Group>
          ) : null}
        </Group>
        <Group transform={[{ translateX: x0 }, { translateY: barY + tBar.lineHeight + 4 }]}>
          <Picture picture={bar} />
        </Group>
        {p.majority && model.won ? (
          <Group transform={[{ translateX: x0 - 14 }, { translateY: footerY }]}>
            <Picture picture={band} />
          </Group>
        ) : null}
      </Canvas>

      {/* header */}
      <View style={[styles.abs, { left: x0, top: headerY, width: w }]} pointerEvents="none">
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.title, tTitle]}>
          {S.views.nightTitle}
        </Text>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.sub, tSub]}>
          {S.views.nightCounting(model.place)}
        </Text>
      </View>

      {/* the speaker's line */}
      <View style={[styles.abs, styles.bubble, { left: x0 + cutW + 34, top: clerkY + 4, width: w - cutW - 34, height: clerkH - 8 }]} pointerEvents="none">
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.who, tWho]}>
          {speakerName}
        </Text>
        <Text allowFontScaling={false} numberOfLines={3} style={[styles.line, tLine]}>
          {line ?? ''}
        </Text>
      </View>

      {/* the board's words: name and share per announced row */}
      <View style={[styles.abs, { left: x0, top: boardY, width: w, height: boardH }]} pointerEvents="none">
        {model.rows.slice(0, p.shown).map((r, i) => {
          const row = rows[i];
          const nameW = marksX(row) - row.name.x - 6;
          const shareX = row.result.x - shareW - 6;
          return (
            <Animated.View key={r.district} style={[styles.abs, { left: 0, top: row.name.y, width: w, height: row.name.h }, i === newest ? newestStyle : styles.still]} accessible accessibilityLabel={S.views.nightRowLabel(r.name, S.views.share(r.share), r.held)}>
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.abs, styles.rowName, tRow, { left: row.name.x, width: nameW, top: (row.name.h - tRow.lineHeight) / 2 }]}>
                {r.name}
              </Text>
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.abs, styles.rowShare, tRow, { left: shareX, width: shareW, top: (row.name.h - tRow.lineHeight) / 2 }]}>
                {S.views.share(r.share)}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      {/* the bar */}
      <View style={[styles.abs, { left: x0, top: barY, width: w }]} pointerEvents="none">
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.bar, tBar]}>
          {S.views.nightBar(heldNow, model.of, model.majority)}
        </Text>
      </View>

      {/* the footer: the hint while counting, the way on at the end */}
      <View style={[styles.abs, styles.footer, { left: x0, top: footerY, width: w, height: footerH }]} pointerEvents="box-none">
        {p.stage === 'done' ? (
          <ViewButton label={S.views.nightToResult} onPress={onEnd} s={s} kind="chalk" style={styles.toResult} />
        ) : p.fast ? null : (
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.hint, tSub]}>
            {S.views.nightFaster}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: INK.chalk, zIndex: 50 },
  abs: { position: 'absolute' },
  still: { opacity: 1 },
  title: { color: INK.chalkLine, fontWeight: '700' },
  sub: { color: INK.chalkDust },
  bubble: { justifyContent: 'center' },
  who: { color: INK.chalkDust, fontWeight: '700' },
  line: { color: INK.chalkLine, fontStyle: 'italic' },
  rowName: { color: INK.chalkLine, fontWeight: '600' },
  rowShare: { color: INK.chalkLine, textAlign: 'right', fontVariant: ['tabular-nums'] },
  bar: { color: INK.chalkDust },
  footer: { alignItems: 'flex-end', justifyContent: 'center' },
  toResult: { minWidth: 180 },
  hint: { color: INK.chalkDust },
});
