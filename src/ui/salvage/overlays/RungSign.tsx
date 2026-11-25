/**
 * The rung sign (yard-stage1.md 2.11, 4.3; centred, opened by the rung event): the sign crane (the art
 * kit's site.draw `drawSignCrane`) lowers the yard's sign (`drawHungSign`) onto its chains; the sign
 * reads "{homeYard} · {t} supplied" (a position, never a title, S15), and under it what the rung opens
 * ("The cutting torch, a radiation portal and a supply deal"; rung 3: "Yard capacity {c} t/h"). OK closes.
 * The sign drops on the UI thread (one shared value; nothing animates once it has landed).
 * Data: the ladder's current rung (state) and the rung's tonnes (content `ladder.rungs`); names by id.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { proj, viewOf } from '../art/pen';
import { CRANE_HOOK, drawHungSign, drawSignCrane } from '../art/site.draw';
import { CentredCard } from './CentredCard';
import { rungLines } from './marketLines';
import { Drawing, useAsk, useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { INK, Line, LocalButton, PadlockLine, useFrame } from './parts';
import { TYPE, pt } from './layout';

/** The crane's view (points a metre) and the sign's (larger, so its words fit at font scale 1.3). */
const CRANE = viewOf(32, 0.7);
const W = 210;
const H = 150;
/** The crane's anchor in the canvas. */
const AX = 46;
const AY = 142;

export function RungSign({ cfg, g, data, onClose }: CardViewProps) {
  const { layout } = useFrame();
  useSeenOnClose('rung');
  const n = Math.max(1, g.salvage.ladder.rung);
  const rung = cfg.salvage.ladder.rungs.find((r) => r.n === n);
  const tonnes = rung?.t ?? (n === 2 ? cfg.salvage.ladder.rung2.t : n === 3 ? cfg.salvage.ladder.rung3.t : 0);
  const cap = (cfg.salvage.ceilings_t_h as number[] | undefined)?.[n - 1] ?? null;
  const mine = rungLines(n, tonnes, cap);
  // The rules' card: lead [sign, ...opens], a locked row for the next rung, OK opening the table.
  const sign = data.lead[0] ?? mine.sign;
  const opens = data.lead.length ? data.lead.slice(1) : mine.opens ? [mine.opens] : [];
  const ask = useAsk();
  const reduce = useReducedMotion();
  const drop = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) drop.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [drop, reduce]);
  // The sign grows with the font scale so its two lines fit (84 points a metre at 1.0).
  const SIGN = viewOf(Math.round(84 * layout.fs), 0.7);
  const [hx, hy] = proj(CRANE, CRANE_HOOK[0], CRANE_HOOK[1], CRANE_HOOK[2]);
  const signW = 2.4 * SIGN.ppm * 0.62;
  const signH = 0.8 * SIGN.ppm * SIGN.lift * 0.9;
  const fall = useAnimatedStyle(() => ({ transform: [{ translateY: (drop.value - 1) * 46 }], opacity: 0.4 + 0.6 * drop.value }));
  const fs = pt(TYPE.line, layout.fs);
  return (
    <CentredCard title={data.title} onClose={onClose}>
      <View style={styles.stage}>
        <View style={{ width: W, height: H }}>
          <Drawing w={W} h={H} deps={[]} draw={(c) => (c.save(), c.translate(AX, AY), drawSignCrane(c, CRANE), c.restore())} />
          <Animated.View style={[styles.sign, { left: AX + hx - signW / 2, top: AY + hy, width: signW, height: signH + 4 }, fall]}>
            <Drawing w={signW + 6} h={signH + 6} deps={[SIGN.ppm]} draw={(c) => (c.save(), c.translate((signW + 6) / 2, 3), drawHungSign(c, SIGN), c.restore())} />
            <View style={[styles.words, { width: signW - 10, height: signH - 12 }]}>
              <Line t={sign} size="line" bold lines={2} center style={{ fontSize: fs, lineHeight: Math.ceil(fs * 1.1) }} />
            </View>
          </Animated.View>
        </View>
      </View>
      {opens.map((t, i) => (
        <Line key={i} t={t} size="name" bold lines={2} center />
      ))}
      {data.rows.map((r) => (
        <View key={r.id} style={styles.next}>
          {r.state === 'locked' ? <PadlockLine t={r.name} /> : <Line t={r.name} size="line" colour={INK.soft} lines={2} center />}
        </View>
      ))}
      <View style={styles.foot}>
        {data.foot.length ? data.foot.map((b, i) => <LocalButton key={i} label={b.label} onPress={() => ask.press(b.action, 'foot')} />) : <LocalButton label={{ key: 'ok' }} onPress={onClose} />}
      </View>
    </CentredCard>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', paddingTop: 4 },
  sign: { position: 'absolute' },
  words: { position: 'absolute', left: 5, top: 5, alignItems: 'center', justifyContent: 'center' },
  next: { alignItems: 'center', paddingTop: 4 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: INK.rule, marginTop: 6 },
});
