/**
 * Building blocks shared by the shop, the deal popup, missions and settings: section headers,
 * the offer card, gem prices with their real-money hint, reward tiles, a calm countdown, the
 * shine on free things, and the helper that lets bought gems fly to the header.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import type { Reward } from '../../../config/schema';
import { formatNumber } from '../../../engine/format';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { fly } from '../../juice/fly';
import { describeReward, formatCountdown, useNow } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { gemsInMoney } from './money';

/** A shop section: a big friendly heading with an icon, an optional note on the right (a timer), then its content. */
export function ShopSection({ icon, title, note, children }: { icon?: string; title: string; note?: ReactNode; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        {icon ? <GameIcon icon={icon} size={24} /> : null}
        <Text style={[styles.sectionTitle, t.display, { color: t.c.text }]} numberOfLines={1}>
          {title}
        </Text>
        {note ? <View style={styles.sectionNote}>{note}</View> : null}
      </View>
      {children}
    </View>
  );
}

/**
 * The card every offer sits on: white, rounded, with a soft coloured top band and an optional
 * ribbon. `tint` colours the band and the border (the accent by default).
 */
export function OfferCard({
  children,
  tint,
  ribbon,
  dim,
  style,
  strong,
}: {
  children: ReactNode;
  tint?: string;
  ribbon?: string;
  dim?: boolean;
  style?: StyleProp<ViewStyle>;
  /** A stronger border, for the one thing on screen that wants attention (a free gift). */
  strong?: boolean;
}) {
  const t = useTheme();
  const color = tint ?? t.c.accent;
  return (
    <View
      style={[
        styles.offer,
        {
          backgroundColor: t.c.surface,
          borderRadius: t.radius,
          borderColor: strong ? color : alpha(color, 0.45),
          borderWidth: strong ? 2.5 : 1.5,
          opacity: dim ? 0.62 : 1,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.band, { backgroundColor: alpha(color, 0.13), borderTopLeftRadius: t.radius, borderTopRightRadius: t.radius }]} />
      {children}
      {ribbon ? <Ribbon text={ribbon} color={color} /> : null}
    </View>
  );
}

/** A small tag in the top-right corner of a card ("GOOD START", "ONE TIME"). Neutral words only. */
export function Ribbon({ text, color }: { text: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.ribbon, { backgroundColor: color ?? t.c.accent, borderTopRightRadius: t.radius - 2, borderBottomLeftRadius: 10 }]}>
      <Text style={[styles.ribbonText, t.display, { color: t.c.primaryText }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/**
 * A gem price as players must see it: the game's gem icon and amount, and under it what that
 * is in real money at the smallest pack's rate (policy.md §2). `light` is for coloured buttons.
 */
export function GemPrice({ cost, light, size = 15 }: { cost: number; light?: boolean; size?: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const money = gemsInMoney(cfg, cost);
  const fg = light ? t.c.primaryText : t.c.text;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.row}>
        <GameIcon icon={t.strings.gemIcon} size={size + 3} />
        <Text style={[t.display, { color: fg, fontSize: size }]} numberOfLines={1}>
          {formatNumber(cost)}
        </Text>
      </View>
      {money ? (
        <Text style={[styles.money, { color: light ? alpha(t.c.primaryText, 0.85) : t.c.textMuted }]} numberOfLines={1}>
          {money}
        </Text>
      ) : null}
    </View>
  );
}

/** What an offer contains, one tile per item, each named (never "mystery"). */
export function RewardTiles({ rewards, columns = 2 }: { rewards: Reward[]; columns?: 2 | 3 }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  return (
    <View style={styles.tiles}>
      {rewards.map((r, i) => {
        const info = describeReward(cfg, r);
        return (
          <View key={i} style={[styles.tile, { width: columns === 3 ? '31.5%' : '48.5%', backgroundColor: alpha(t.c.text, 0.05), borderRadius: t.radius * 0.6 }]}>
            <GameIcon icon={info.icon} size={30} />
            <Text style={[styles.tileText, { color: t.c.text }]} numberOfLines={2}>
              {info.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** A plain, calm countdown to a real moment. Re-renders only itself once a second. */
export function Countdown({ until, prefix = '', suffix = '', style }: { until: number; prefix?: string; suffix?: string; style?: StyleProp<TextStyle> }) {
  const now = useNow(1000);
  return (
    <Text style={style} numberOfLines={1}>
      {prefix}
      {formatCountdown(until - now)}
      {suffix}
    </Text>
  );
}

/**
 * A soft light that sweeps across its parent every few seconds: used only on things that are
 * free to take (the daily gift, a finished mission), never on paid offers.
 */
export function Shine({ radius = 0 }: { radius?: number }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = 0;
    x.value = withRepeat(withSequence(withDelay(1800, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })), withTiming(0, { duration: 0 })), -1);
  }, [x]);
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: -80 + x.value * (w + 160) }, { skewX: '-20deg' }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: radius }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.shine, band]} />
    </View>
  );
}

/**
 * Lets a reward fly from a control to the header counter. Spread `ref` on the control (any
 * View); call `emit` after the store action has really granted something.
 */
export function useFlyFrom() {
  const ref = useRef<View>(null);
  const emit = useCallback((kind: 'gems' | 'cash', count: number) => {
    if (count <= 0) return;
    ref.current?.measureInWindow((x, y, w, h) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      fly.emit({ kind, from: { x: x + w / 2, y: y + h / 2 }, to: kind === 'gems' ? 'header:gems' : 'header:cash', count: Math.min(10, Math.max(3, Math.round(count / 10))) });
    });
  }, []);
  return { ref, emit };
}

/** Runs a store action and lets gems fly to the header when the player's gems really went up. */
export async function withGemFlight(action: () => unknown, emit: (kind: 'gems', count: number) => void): Promise<void> {
  const before = useGame.getState().game.gems;
  await action();
  const gained = useGame.getState().game.gems - before;
  if (gained > 0) emit('gems', gained);
}

const styles = StyleSheet.create({
  section: { marginTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 21, flexShrink: 1 },
  sectionNote: { marginLeft: 'auto', flexShrink: 0 },
  offer: { marginHorizontal: 12, marginBottom: 10, padding: 12, overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, top: 0, height: 56 },
  ribbon: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 160 },
  ribbonText: { fontSize: 11, letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  money: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6, minHeight: 44 },
  tileText: { flex: 1, fontSize: 13, fontWeight: '800' },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 46, backgroundColor: 'rgba(255,255,255,0.45)' },
});
