import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import * as E from '../../engine/economy';
import { useGame, type Tab } from '../../state/store';
import { alpha, useTheme } from '../theme';
import { GameIcon } from './GameIcon';

function TabItem({ icon, label, active, badge, onPress }: { icon: string; label: string; active: boolean; badge?: boolean; onPress: () => void }) {
  const t = useTheme();
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);
  useEffect(() => {
    // The selected tab's icon hops up and stays slightly bigger.
    scale.value = active ? withSequence(withTiming(1.35, { duration: 90 }), withSpring(1.15, { damping: 6, stiffness: 260 })) : withTiming(1, { duration: 120 });
  }, [active, scale]);
  useEffect(() => {
    // Notification dots pulse to draw the eye.
    pulse.value = badge ? withRepeat(withSequence(withTiming(1.35, { duration: 450 }), withTiming(1, { duration: 450 })), -1) : 1;
  }, [badge, pulse]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateY: (1 - scale.value) * 14 }] }));
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <Animated.View style={[iconStyle, { opacity: active ? 1 : 0.6 }]}>
        <GameIcon icon={icon} size={30} />
      </Animated.View>
      <Text style={[styles.label, t.display, { color: active ? t.c.primary : t.c.textMuted }]} numberOfLines={1}>{label}</Text>
      {badge ? <Animated.View style={[styles.dot, { backgroundColor: t.c.danger, borderColor: t.c.surface }, dotStyle]} /> : null}
    </Pressable>
  );
}

export function TabBar() {
  const t = useTheme();
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  // Red dots pull players towards things they can act on.
  const badges = useGame(
    useShallow((s) => {
      const { cfg, game } = s;
      return {
        managers: cfg.businesses.some((b) => !game.businesses[b.id].managed && game.businesses[b.id].owned > 0 && game.cash >= b.managerCost),
        upgrades: cfg.upgrades.some((u) => !u.premium && !game.upgrades.includes(u.id) && game.cash >= u.cost),
        prestige: E.prestigePointsAvailable(cfg, game) >= Math.max(1, game.prestigePoints * 0.5),
        shop: E.canClaimDaily(game, Date.now()),
      };
    }),
  );
  const items: { key: Tab; icon: string; label: string; badge?: boolean }[] = [
    { key: 'businesses', icon: t.icons.tabBuild ?? t.heroIcon, label: 'Build' },
    { key: 'managers', icon: t.icons.tabManagers, label: t.strings.managerTab, badge: badges.managers },
    { key: 'upgrades', icon: t.icons.tabUpgrades, label: t.strings.upgradeTab, badge: badges.upgrades },
    { key: 'prestige', icon: t.strings.prestigeIcon, label: t.strings.prestigeVerb, badge: badges.prestige },
    { key: 'shop', icon: t.icons.tabShop, label: 'Shop', badge: badges.shop },
  ];
  return (
    <View style={[styles.bar, { backgroundColor: t.c.surface, borderTopColor: alpha(t.c.text, 0.08) }]}>
      {items.map((it) => (
        <TabItem key={it.key} icon={it.icon} label={it.label} active={it.key === tab} badge={it.badge} onPress={() => setTab(it.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingBottom: 4 },
  item: { flex: 1, alignItems: 'center' },
  label: { fontSize: 11, marginTop: 3 },
  dot: { position: 'absolute', top: -2, right: '26%', width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
