/**
 * The collection header of the upgrades tab: "7 of 11" with a bar that fills when one is bought,
 * and what the bought ones add up to for all income. The count pops on change so a purchase reads
 * as progress in the collection, not just cash leaving.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as E from '../../../engine/economy';
import { formatNumber } from '../../../engine/format';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { alpha, useTheme } from '../../theme';

export function UpgradeHeader({ bought, total }: { bought: number; total: number }) {
  const t = useTheme();
  const shared = useGame((s) => E.sharedUpgradeMultiplier(s.cfg, s.game));
  const fill = useSharedValue(total > 0 ? bought / total : 0);
  const pop = useSharedValue(1);
  useEffect(() => {
    fill.value = withTiming(total > 0 ? bought / total : 0, { duration: 500 });
    pop.value = withSequence(withTiming(1.25, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 260 }));
  }, [bought, total, fill, pop]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, fill.value)) * 100}%` }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <View style={[styles.card, { backgroundColor: t.c.surface, borderRadius: t.radius }]}>
      <View style={[styles.iconWrap, { backgroundColor: alpha(t.c.accent, 0.18) }]}>
        <GameIcon icon={t.icons.tabUpgrades} size={40} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.titleRow}>
          <Text style={[t.display, styles.title, { color: t.c.text }]} numberOfLines={1}>
            {t.strings.upgradeTab}
          </Text>
          <Animated.Text style={[t.display, styles.count, { color: t.c.text }, popStyle]} numberOfLines={1}>
            {bought}
            <Text style={{ color: t.c.textMuted, fontSize: 15 }}> of {total}</Text>
          </Animated.Text>
        </View>
        <View style={[styles.track, { backgroundColor: alpha(t.c.text, 0.1) }]}>
          <Animated.View style={[styles.fill, { backgroundColor: t.c.success }, fillStyle]} />
        </View>
        <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={1}>
          {shared > 1 ? `All income ×${formatNumber(shared)} from these so far` : 'Each one multiplies what you earn'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 4, padding: 14 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 20, flexShrink: 1 },
  count: { fontSize: 22 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%', borderRadius: 5 },
  sub: { fontSize: 12, fontWeight: '700', marginTop: 5 },
});
