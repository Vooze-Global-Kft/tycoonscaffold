import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Business } from '../../config/schema';
import * as E from '../../engine/economy';
import { formatDuration, formatMoney } from '../../engine/format';
import { useGame } from '../../state/store';
import { alpha, useTheme } from '../theme';
import { Button } from './Button';
import { GameIcon } from './GameIcon';

export const BusinessRow = memo(function BusinessRow({ b, index }: { b: Business; index: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const game = useGame((s) => s.game);
  const buyAmount = useGame((s) => s.buyAmount);
  const buy = useGame((s) => s.buy);
  const start = useGame((s) => s.startBusiness);
  const s = game.businesses[b.id];
  const now = Date.now();
  const sym = t.strings.currencySymbol;

  const cycle = E.cycleSeconds(cfg, game, b.id);
  // Very fast cycles look like a solid bar, which reads better than flicker.
  const solid = s.managed && cycle < 0.3;
  const progress = solid ? 1 : s.progress;

  // --- animation state -------------------------------------------------
  const cardPop = useSharedValue(1);
  const iconBounce = useSharedValue(1);
  const fill = useSharedValue(progress);
  const flash = useSharedValue(0);
  const prev = useRef({ owned: s.owned, progress: s.progress, running: s.running });

  useEffect(() => {
    const p = prev.current;
    // Bought more: the whole card pops.
    if (s.owned > p.owned) {
      cardPop.value = withSequence(withTiming(1.04, { duration: 70 }), withSpring(1, { damping: 7, stiffness: 300 }));
    }
    // A cycle finished (progress wrapped, or an unmanaged run ended): the icon hops and the bar flashes.
    const paid = s.owned > 0 && !solid && (s.progress < p.progress - 0.2 || (p.running && !s.running && !s.managed));
    if (paid) {
      iconBounce.value = withSequence(withTiming(1.22, { duration: 80 }), withSpring(1, { damping: 5, stiffness: 320 }));
      flash.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 350 }));
      fill.value = progress; // snap back to the start instead of sliding backwards
    } else {
      // Glide between simulation ticks so the bar moves smoothly instead of in 10 Hz steps.
      fill.value = withTiming(progress, { duration: 110, easing: Easing.linear });
    }
    prev.current = { owned: s.owned, progress: s.progress, running: s.running };
  }, [s.owned, s.progress, s.running, s.managed, solid, progress, cardPop, iconBounce, fill, flash]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardPop.value }] }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconBounce.value }, { translateY: (1 - iconBounce.value) * 30 }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.min(1, fill.value) * 100}%` }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.7 }));

  // Hide businesses two or more steps ahead of what the player owns, to keep a sense of discovery.
  const prevOwned = index === 0 || game.businesses[cfg.businesses[index - 1].id].owned > 0;
  if (!prevOwned && s.owned === 0) {
    const prev2 = index >= 2 && game.businesses[cfg.businesses[index - 2].id].owned > 0;
    if (!prev2) return null;
  }

  const n = E.resolveBuyAmount(cfg, game, b.id, buyAmount);
  const cost = E.costFor(b, s.owned, n);
  const affordable = game.cash >= cost;
  const revenue = E.revenuePerCycle(cfg, game, b.id, now);
  const next = E.nextMilestone(cfg, s.owned);
  const prevMilestone = [0, ...cfg.economy.milestones.map((m) => m.owned)].filter((o) => o <= s.owned).pop() ?? 0;
  const milestonePct = next ? (s.owned - prevMilestone) / (next - prevMilestone) : 1;

  if (s.owned === 0) {
    // The next business is a mystery until the one before it is owned.
    const mystery = !prevOwned;
    return (
      <Animated.View style={[styles.card, { backgroundColor: alpha(t.c.surface, 0.6), borderRadius: t.radius }, cardStyle]}>
        <View style={styles.iconWrap}>
          <GameIcon icon={b.icon} size={52} locked={mystery} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={[styles.name, t.display, { color: t.c.text }]}>{mystery ? '???' : b.name}</Text>
          {b.flavor && !mystery ? <Text style={[styles.meta, { color: t.c.textMuted }]}>{b.flavor}</Text> : null}
        </View>
        <Button onPress={() => buy(b.id)} disabled={!affordable || mystery} label="Unlock" sublabel={formatMoney(cost, sym)} style={{ minWidth: 96 }} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, { backgroundColor: t.c.surface, borderRadius: t.radius }, cardStyle]}>
      <Pressable onPress={() => start(b.id)} style={styles.iconWrap}>
        <Animated.View style={iconStyle}>
          <GameIcon icon={b.icon} size={54} />
        </Animated.View>
        <View style={[styles.badge, { backgroundColor: t.c.primary }]}>
          <Text style={[styles.badgeText, t.display, { color: t.c.primaryText }]}>{s.owned}</Text>
        </View>
        {s.managed ? (
          <View style={[styles.manager, { backgroundColor: t.c.surface, borderColor: t.c.success }]}>
            <GameIcon icon={b.managerIcon ?? t.icons.manager} size={20} />
          </View>
        ) : null}
        {/* Progress towards the next ownership milestone */}
        <View style={[styles.milestoneTrack, { backgroundColor: alpha(t.c.text, 0.1) }]}>
          <View style={{ width: `${milestonePct * 100}%`, height: '100%', backgroundColor: t.c.accent, borderRadius: 3 }} />
        </View>
      </Pressable>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={[styles.name, t.display, { color: t.c.text }]} numberOfLines={1}>{b.name}</Text>
        <Pressable onPress={() => start(b.id)} style={[styles.bar, { backgroundColor: alpha(t.c.text, 0.08), borderRadius: t.radius }]}>
          <Animated.View style={[styles.fill, { backgroundColor: t.c.progress, borderRadius: t.radius }, fillStyle]} />
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', borderRadius: t.radius }, flashStyle]} />
          <Text style={[styles.barText, t.display, { color: t.c.text }]} numberOfLines={1}>
            {formatMoney(revenue, sym)}
            {cycle < 1 && s.managed ? ` ×${(1 / cycle).toFixed(1)}/s` : ''}
          </Text>
        </Pressable>
        <Text style={[styles.meta, { color: t.c.textMuted }]} numberOfLines={1}>
          {s.managed ? 'Automated' : s.running ? 'Working…' : '👆 Tap to run'} · {formatDuration(cycle * (1 - s.progress))}
          {next ? ` · next boost at ${next}` : ''}
        </Text>
      </View>
      <Button onPress={() => buy(b.id)} disabled={!affordable} label={`Buy ×${n}`} sublabel={formatMoney(cost, sym)} style={{ minWidth: 96 }} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 10, marginHorizontal: 12, marginBottom: 8 },
  iconWrap: { width: 60, alignItems: 'center' },
  badge: { position: 'absolute', top: -5, right: -3, borderRadius: 10, paddingHorizontal: 6, minWidth: 22, alignItems: 'center' },
  badgeText: { fontSize: 12 },
  manager: { position: 'absolute', left: -5, bottom: 4, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  milestoneTrack: { width: 48, height: 5, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  name: { fontSize: 16 },
  bar: { height: 26, marginTop: 4, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  barText: { fontSize: 14, textAlign: 'center' },
  meta: { fontSize: 11, marginTop: 3, fontWeight: '600' },
});
