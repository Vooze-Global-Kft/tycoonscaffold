/**
 * The header over every tab: the cash counter (rolling towards the real value) with the income per
 * second under it, the ad-boost pill, the gem pill (opens the shop) and the settings gear.
 * Flying coins and gems land on the two counters, which register themselves as targets.
 */
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { displayFontMetrics } from '../../config/game';
import * as E from '../../engine/economy';
import { formatMoney, formatNumber, formatShort } from '../../engine/format';
import { ads } from '../../services/ads';
import { useGame } from '../../state/store';
import { useTarget } from '../hints/targets';
import { useHomeMetrics } from '../home/layout';
import { AD_NOT_READY, useRewardedReady } from '../kit/ads';
import { shopFocus } from '../meta/shop/focus';
import { formatCountdown, shortDuration } from '../kit/time';
import { alpha, useTheme } from '../theme';
import { counterPulse } from './counterPulse';
import { ROW_GAP, cashBlockMetrics, cashBoxHeight } from './headerMetrics';
import { fitFont, fitsAt, widestEm } from './moneyWidth';
import { GameIcon } from './GameIcon';
import { RollingNumber } from './RollingNumber';

/** A shared value that gives a quick squash-and-grow each time the fly layer lands on `target`. */
function usePulse(target: string) {
  const s = useSharedValue(1);
  useEffect(
    () =>
      counterPulse.subscribe((key) => {
        if (key !== target) return;
        s.value = withSequence(withTiming(1.14, { duration: 70 }), withSpring(1, { damping: 7, stiffness: 320 }));
      }),
    [target, s],
  );
  return useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
}

/** Feeds the cash counter every change of cash, outside React (no render per tick). */
function followCash(set: (v: number) => void): () => void {
  set(useGame.getState().game.cash);
  return useGame.subscribe((s, prev) => {
    if (s.game.cash !== prev.game.cash) set(s.game.cash);
  });
}

/** "1.50K" -> "1.5K", "2.00T" -> "2T": trailing zeros of the decimals say nothing on a short line. */
function trimZeros(text: string): string {
  return text.replace(/\.0+(?=\D*$)|(\.\d*?)0+(?=\D*$)/, '$1');
}

/** The amount never gets smaller than this; below it the phone is too narrow for the header anyway. */
const MIN_CASH_FONT = 11;
/** Gap between the coin and the amount (styles.cashRow). */
const CASH_GAP = 5;
/** The counter takes about a tick to roll down to a shorter amount; the larger font waits this long for it. */
const SHRINK_HOLD_MS = 350;

/**
 * Follows `value` at once when it grows and only after `holdMs` when it shrinks. The amount's width
 * goes through this: when money is spent the counter is still rolling down through the longer
 * amount for a moment, and the font may only grow once it has arrived.
 */
function useHeldMax(value: number, holdMs: number): number {
  const [held, setHeld] = useState(value);
  useEffect(() => {
    if (value === held) return;
    if (value > held) {
      setHeld(value);
      return;
    }
    const timer = setTimeout(() => setHeld(value), holdMs);
    return () => clearTimeout(timer);
  }, [value, held, holdMs]);
  return Math.max(held, value);
}

/**
 * The cash counter. It re-renders only when the shape of the amount changes (the font size) or the
 * income line's text changes; the digits themselves roll on the UI thread.
 */
function CashCounter({ compact, header }: { compact: boolean; header: number }) {
  const t = useTheme();
  const sym = t.strings.currencySymbol;
  // The display font's real widths and line height (from its file); null when the system font draws the text.
  const font = t.display.fontFamily ? displayFontMetrics : null;
  // Width of the widest amount shaped like the current one ("$00.00T"), in font sizes.
  const shapeEm = useHeldMax(
    useGame((s) => widestEm(formatMoney(s.game.cash, sym), font)),
    SHRINK_HOLD_MS,
  );
  const ipsText = useGame((s) => {
    const ips = E.incomePerSecond(s.cfg, s.game, Date.now());
    // Three significant digits without trailing zeros ("+$2T/s", "+$153K/s", "+$8.51M/s"): the line
    // has to fit beside the prestige count under the amount.
    return ips > 0 ? `+${sym}${trimZeros(formatShort(ips))}/s` : null;
  });
  const points = useGame((s) => s.game.prestigePoints);
  const [startCash] = useState(() => useGame.getState().game.cash);
  const [width, setWidth] = useState(0);
  const target = useTarget('header:cash');
  const pulse = usePulse('header:cash');
  const { fontScale } = useWindowDimensions();
  const m = cashBlockMetrics(compact, header, fontScale, font?.line);
  const iconSize = Math.min(compact ? 22 : 26, m.cashRow - 4);
  // On a very narrow block (a tiny screen with a running boost and a long amount) the coin gives its
  // place to the amount rather than let the amount be cut off.
  const showIcon = width <= 0 || fitsAt(shapeEm, width - iconSize - CASH_GAP, MIN_CASH_FONT);
  // The largest font at which the widest amount of this shape fits beside the coin.
  const fontSize = fitFont(shapeEm, showIcon ? width - iconSize - CASH_GAP : width, MIN_CASH_FONT, m.cashMax);
  // The amount's box is only as tall as its own line and the row centres the box. A taller box with a
  // line height would leave it to the platform where the digits sit in it, and iPhones put them at
  // the bottom: a long amount (a small font in a tall box) then sat on top of the income line.
  const cashBox = cashBoxHeight(fontSize, m.cashRow, font?.line);
  const ipsStyle = { color: alpha(t.c.primaryText, 0.92), fontSize: m.ipsFont, lineHeight: m.ipsLine };
  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
    target.onLayout();
  };
  return (
    <View style={[styles.cashBlock, compact && { flex: 1.4 }]} ref={target.ref} collapsable={false} onLayout={onLayout}>
      <Animated.View style={[styles.cashRow, { height: m.cashRow }, pulse]}>
        {showIcon ? <GameIcon icon={t.strings.currencyIcon} size={iconSize} /> : null}
        <RollingNumber
          value={startCash}
          follow={followCash}
          symbol={sym}
          allowFontScaling={false}
          style={[t.display, styles.cash, { color: t.c.primaryText, fontSize, height: cashBox }]}
        />
      </Animated.View>
      <View style={[styles.ipsRow, { height: m.ipsLine }]}>
        <Text style={[styles.ips, ipsStyle, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} allowFontScaling={false}>
          {ipsText ?? t.strings.tapHint}
        </Text>
        {points > 0 ? (
          <Text style={[styles.ips, ipsStyle, { flexShrink: 0 }]} numberOfLines={1} allowFontScaling={false}>
            {t.strings.prestigeIcon}
            {trimZeros(formatShort(points))}
          </Text>
        ) : null}
      </View>
    </View>
  );
}


/**
 * The rewarded-ad boost. It always says, before the tap, that a tap plays an ad and what the ad
 * gives: idle "×2 · 30 min / ▶ Watch ad", running "×2 · 29m 54s / ▶ Ad: +30 min". Express Pass
 * owners see "Free" instead of the ad, and with no ad loaded it says so and does nothing.
 * Watching is always the player's choice: nothing here nags or vibrates.
 */
function BoostPill({ compact }: { compact: boolean }) {
  const t = useTheme();
  const boost = useGame((s) => s.cfg.economy.boost);
  const boostUntil = useGame((s) => s.game.boostUntil);
  const watch = useGame((s) => s.watchBoostAd);
  const adReady = useRewardedReady();
  const free = ads.skipRewarded;
  const [now, setNow] = useState(() => Date.now());
  const active = boostUntil > now;
  useEffect(() => {
    // A once-a-second clock only while a boost runs (the countdown); idle otherwise.
    if (boostUntil <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [boostUntil]);
  const canBoost = useGame((s) => E.canBoost(s.cfg, s.game, now));
  const can = canBoost && adReady;
  const mult = `×${boost.multiplier}`;
  const length = shortDuration(boost.minutesPerAd * 60);
  const how = free ? 'Free' : '▶ Ad';
  const sub = !canBoost ? (active ? 'income' : '') : !adReady ? AD_NOT_READY : active ? `${how}: +${length}` : free ? 'Claim free' : '▶ Watch ad';
  const label = active
    ? `${mult} income, ${formatCountdown(boostUntil - now)} left.${can ? (free ? ` Tap for ${length} more, free.` : ` Watch an ad for ${length} more.`) : ''}`
    : free
      ? `Claim ${mult} income for ${length}, free`
      : `Watch an ad: ${mult} income for ${length}${adReady ? '' : '. No ad is ready yet'}`;
  return (
    <Pressable
      onPress={watch}
      disabled={!can}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !can }}
      style={({ pressed }) => [
        styles.pill,
        compact && styles.pillCompact,
        { height: compact ? 38 : 42, backgroundColor: active ? t.c.surface : alpha('#000000', 0.18), borderColor: active ? t.c.accent : alpha('#FFFFFF', 0.35) },
        pressed && { transform: [{ scale: 0.95 }] },
        !can && !active && { opacity: 0.55 },
      ]}
    >
      <GameIcon icon={t.icons.boost} size={compact ? 18 : 20} />
      <View style={{ marginLeft: 4, flexShrink: 1 }}>
        <Text style={[t.display, styles.pillMain, { color: active ? t.c.text : t.c.primaryText }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          {mult} · {active ? formatCountdown(boostUntil - now) : length}
        </Text>
        {sub ? (
          <Text style={[styles.pillSub, { color: active ? t.c.textMuted : alpha(t.c.primaryText, 0.95) }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function GemPill({ compact, plus }: { compact: boolean; plus: boolean }) {
  const t = useTheme();
  const gems = useGame((s) => s.game.gems);
  const setTab = useGame((s) => s.setTab);
  const target = useTarget('header:gems');
  const pulse = usePulse('header:gems');
  return (
    <Pressable
      {...target}
      onPress={() => {
        shopFocus.request('packs');
        setTab('shop');
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${formatNumber(gems)} ${t.strings.gemName}. Open the shop`}
      style={({ pressed }) => [styles.pill, compact && styles.pillCompact, { height: compact ? 38 : 42, backgroundColor: alpha('#000000', 0.18), borderColor: alpha('#FFFFFF', 0.35) }, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <Animated.View style={[styles.gemRow, pulse]}>
        <GameIcon icon={t.strings.gemIcon} size={compact ? 18 : 20} />
        <Text style={[t.display, styles.gemText, { color: t.c.primaryText }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatNumber(gems)}
        </Text>
      </Animated.View>
      {plus ? (
        <View style={[styles.plus, { backgroundColor: t.c.surface }]}>
          <Text style={[styles.plusText, { color: t.c.primary }]} allowFontScaling={false}>
            +
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Gear({ compact }: { compact: boolean }) {
  const openModal = useGame((s) => s.openModal);
  const size = compact ? 36 : 40;
  return (
    <Pressable
      onPress={() => openModal({ type: 'settings' })}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      style={({ pressed }) => [styles.gear, { width: size, height: size, borderRadius: size / 2, backgroundColor: alpha('#000000', 0.18) }, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <Text style={{ fontSize: compact ? 18 : 20 }} allowFontScaling={false}>
        ⚙️
      </Text>
    </Pressable>
  );
}

/** Phones narrower than this get the small pills and paddings whatever their height (most Android phones are 360 wide). */
const NARROW_BELOW = 380;
/** Below this the gem pill also drops its "+" badge, so the amount keeps its room (the whole pill opens the shop anyway). */
const TINY_BELOW = 340;

export function Header() {
  const t = useTheme();
  const m = useHomeMetrics();
  const { width: screen } = useWindowDimensions();
  const [w, setW] = useState(0);
  // The cash block gets whatever the pills leave: on a narrow screen they must be the small ones.
  const compact = m.compact || screen < NARROW_BELOW;
  return (
    <View style={[styles.wrap, { height: m.header }, compact && styles.wrapCompact]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={w} height={m.header}>
          <LinearGradient start={vec(0, 0)} end={vec(w, m.header)} colors={t.c.gradient} />
        </Rect>
      </Canvas>
      <CashCounter compact={compact} header={m.header} />
      <BoostPill compact={compact} />
      <GemPill compact={compact} plus={screen >= TINY_BELOW} />
      <Gear compact={compact} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6, overflow: 'hidden' },
  wrapCompact: { paddingHorizontal: 9, gap: 4 },
  cashBlock: { flex: 1, minWidth: 0, justifyContent: 'center', gap: ROW_GAP },
  // The row pops about its centre when a coin lands, so the growth is shared between both ends.
  cashRow: { flexDirection: 'row', alignItems: 'center', gap: CASH_GAP },
  cash: { flex: 1, minWidth: 0 },
  ipsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, overflow: 'hidden' },
  ips: { fontWeight: '800' },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 8 },
  pillCompact: { paddingHorizontal: 6 },
  pillMain: { fontSize: 13 },
  pillSub: { fontSize: 11, fontWeight: '800', marginTop: -1 },
  gemRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gemText: { fontSize: 15, maxWidth: 64 },
  plus: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  plusText: { fontSize: 13, fontWeight: '900', lineHeight: 15 },
  gear: { alignItems: 'center', justifyContent: 'center' },
});
