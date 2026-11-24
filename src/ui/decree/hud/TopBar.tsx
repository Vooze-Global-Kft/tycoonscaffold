/**
 * The top bar (spec 4.1): the treasury as a rolling number (a text field with a box height and no
 * lineHeight) and its rate on one baseline, the approval chip ("62 % ×1.14"), the gossip chip (the
 * folded newspaper and "2/5"; a tap shows the last headline, 5.5) and the menu (Settings, with the
 * Shop). While a strip is armed the approval chip previews that outcome's approval from the rules'
 * strip ("62 → 63 %"). Every font comes from metrics.ts (sized by hand from s, allowFontScaling false).
 * The bar has no background of its own: the desk canvas paints the desk's top band behind it.
 * Keeps its name and props (DecreeShell's slot). Owned by the bars package (BARS).
 */
import { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import * as R from '../../../engine/decree';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { useTarget } from '../../hints/targets';
import { glideMs } from '../../juice/ticker';
import { DecreeIcon } from '../art/DecreeIcon';
import { DESK, alpha } from '../art/palette';
import type { DeskLayout } from '../layout';
import { S, dibs } from '../strings';
import { useDecreeUi } from '../uiState';
import { useDecree, useStrip, useTopBarView } from '../useDecree';
import { useFontScale } from './fontScale';
import { CHIP_PAD, GOSSIP_PAD, slopTo44, topBarMetrics } from './metrics';
import { usePreviewSide } from './preview';
import { rollDibs } from './rollDibs';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);
/** The approval chip's widest texts, for measuring only (never shown). */
const CHIP_SAMPLES = [S.hud.approvalChip(100, '1.60'), S.hud.approvalPreview(100, 100)];

/** The treasury, rounded by the rules, followed outside React: it glides on the UI thread between ticks. */
function Treasury({ font, box, width }: { font: number; box: number; width: number }) {
  const start = useMemo(() => cashNow(), []);
  const shown = useSharedValue(start);
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (s.game.cash === prev.game.cash) return;
        const v = cashNow();
        // Finding 9: under a full-screen view nothing invisible animates: the number is set, not glided.
        if (useDecreeUi.getState().view !== null) {
          shown.value = v;
          return;
        }
        shown.value = withTiming(v, { duration: glideMs(), easing: Easing.linear });
      }),
    [shown],
  );
  const animatedProps = useAnimatedProps(() => {
    const text = rollDibs(shown.value);
    return { text, defaultValue: text } as object;
  });
  return (
    <AnimatedInput
      editable={false}
      pointerEvents="none"
      caretHidden
      contextMenuHidden
      focusable={false}
      underlineColorAndroid="transparent"
      defaultValue={rollDibs(start)}
      animatedProps={animatedProps}
      allowFontScaling={false}
      style={[styles.input, styles.cash, { fontSize: font, height: box, width }]}
    />
  );
}

/** The treasury as the rules round it (roundDibs), read from the store (not a render). */
function cashNow(): number {
  const { cfg, game } = useGame.getState();
  return R.isDecree(cfg) ? R.roundDibs(cfg, game.cash) : 0;
}

/** Whether the gossip chip has appeared (3.1: with the first paper that prints gossip). A session latch until the rules keep a flag (requests.md). */
let gossipSeen = false;

export function TopBar({ layout }: { layout: DeskLayout }) {
  const fontScale = useFontScale();
  const t = useTopBarView();
  // Only the treasury text's shape (digits as 0) re-renders the bar: its width.
  const cashShape = useDecree((cfg, g) => dibs(R.roundDibs(cfg, g.cash)).replace(/[0-9]/g, '0'), '0');
  const gossipOnDesk = useDecree((_c, g) => {
    const d = g.decree;
    const desk = d.desk?.type === 'paper' ? d.desk.shown : null;
    return d.gossip > 0 || d.office > 0 || d.term > 1 || (!!desk && [...desk.sign, ...desk.refuse].some((e) => e.type === 'gossip'));
  }, false);
  if (gossipOnDesk) gossipSeen = true;
  const side = usePreviewSide();
  const strip = useStrip(side);
  const mult = t.multiplier.toFixed(2);
  const chipText = strip ? S.hud.approvalPreview(strip.approval.from, strip.approval.to) : S.hud.approvalChip(t.approval, mult);
  const rate = S.hud.rate(dibs(t.income));
  const gossip = S.hud.gossipChip(t.gossip, t.gossipMax);
  const r = layout.topBar;
  const bar = layout.bar;
  const m = useMemo(
    // The chip's font fits its widest form (a measuring sample, never shown), so it does not jump as the values change.
    () => topBarMetrics(r.h, bar, fontScale, cashShape, rate, CHIP_SAMPLES, gossip),
    [r.h, bar, fontScale, cashShape, rate, gossip],
  );
  const treasuryRef = useTarget('top:treasury');
  const approvalRef = useTarget('top:approval');
  const gossipRef = useTarget('top:gossip');
  const menuRef = useTarget('top:menu');
  const x = (part: { x: number }) => part.x - r.x;
  const armedTint = side === 'sign' ? DESK.violetPale : side === 'refuse' ? DESK.slatePale : DESK.paper;
  return (
    <View style={[styles.bar, { left: r.x, top: r.y, width: r.w, height: r.h }]} pointerEvents="box-none">
      <View {...treasuryRef} accessible accessibilityLabel={S.hud.treasuryLabel(dibs(cashNow()), rate)} style={[styles.abs, { left: x(bar.treasury), width: bar.treasury.w, height: r.h }]}>
        <View style={[styles.abs, { left: 0, top: m.cashTop, height: m.cashBox, width: m.cashW + 2 }]}>
          <Treasury font={m.cashFont} box={m.cashBox} width={m.cashW + 2} />
        </View>
        <View style={[styles.abs, styles.center, { left: m.cashW + 6, top: m.rateTop, height: m.rateBox }]}>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.rate, { fontSize: m.rateFont }]}>
            {rate}
          </Text>
        </View>
      </View>
      <View
        {...approvalRef}
        accessible
        accessibilityLabel={S.hud.approvalLabel(t.approval, mult)}
        style={[styles.abs, styles.chip, styles.center, { left: x(bar.approval), width: bar.approval.w, top: m.chipTop, height: m.chipBox, backgroundColor: strip ? armedTint : alpha(DESK.paper, 0.92), borderColor: strip ? (side === 'sign' ? DESK.violet : DESK.slate) : DESK.brassDeep }]}
      >
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.chipText, { fontSize: m.chipFont, color: strip ? (side === 'sign' ? DESK.violetDeep : DESK.slateDeep) : DESK.line }]}>
          {chipText}
        </Text>
      </View>
      {gossipSeen ? (
        <Pressable
          {...gossipRef}
          onPress={() => {
            fx.play('ui_tap');
            useDecreeUi.getState().openHeadline();
          }}
          accessibilityRole="button"
          accessibilityLabel={S.hud.gossipLabel(t.gossip, t.gossipMax)}
          hitSlop={slopTo44(bar.gossip.w, m.chipBox)}
          style={[styles.abs, styles.chip, styles.row, { paddingHorizontal: GOSSIP_PAD, left: x(bar.gossip), width: bar.gossip.w, top: m.chipTop, height: m.chipBox, backgroundColor: alpha(DESK.paper, 0.92), borderColor: t.gossip >= t.gossipMax - 1 && t.gossipMax > 0 ? DESK.violet : DESK.brassDeep }]}
        >
          <DecreeIcon icon="art:fx_gossip" size={m.gossipIcon} />
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.chipText, { fontSize: m.gossipFont, color: DESK.line, marginLeft: 2 }]}>
            {gossip}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        {...menuRef}
        onPress={() => {
          fx.play('ui_tap');
          useDecreeUi.getState().openSheet({ type: 'settings' });
        }}
        accessibilityRole="button"
        accessibilityLabel={S.hud.menuLabel}
        hitSlop={slopTo44(bar.menu.w, r.h)}
        style={[styles.abs, styles.center, { left: x(bar.menu), width: bar.menu.w, top: 0, height: r.h }]}
      >
        <View style={[styles.menuIcon, { width: m.menuIcon }]}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.menuLine} />
          ))}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute' },
  abs: { position: 'absolute' },
  center: { justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: CHIP_PAD },
  input: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' as const } : null),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', cursor: 'default' } as object) : null),
  },
  cash: { color: DESK.paperLight, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rate: { color: DESK.mustardLight, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chip: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  chipText: { fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
  menuIcon: { height: 15, justifyContent: 'space-between' },
  menuLine: { height: 2.5, borderRadius: 1.25, backgroundColor: DESK.paperLight },
});
