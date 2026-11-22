/**
 * The five tabs. A red dot means "there is something you can do here right now" and nothing else:
 * no dot for things that only become possible later. Each dot is one cheap boolean selector, so
 * the bar re-renders only when a dot actually appears or goes away.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { GameConfig } from '../../config/schema';
import * as E from '../../engine/economy';
import * as M from '../../engine/meta';
import type { GameState } from '../../engine/types';
import { useGame, type Tab } from '../../state/store';
import { useTarget } from '../hints/targets';
import { useHomeMetrics } from '../home/layout';
import { alpha, useTheme } from '../theme';
import { GameIcon } from './GameIcon';

/** The meta systems are young; a bug in one must never take the tab bar down with it. */
function safe(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return false;
  }
}

function staffDot(cfg: GameConfig, game: GameState): boolean {
  return safe(() => {
    if (M.chestCount(game) > 0) return true;
    if ((M.freeChestStatus(cfg, game, Date.now())?.ready ?? 0) > 0) return true;
    if (cfg.meta.cards.some((c) => M.canLevelUpCard(cfg, game, c.id))) return true;
    // Classic games hire their managers in this tab.
    if (!E.isSim(cfg)) {
      const v = game.venues[game.activeVenue];
      return cfg.businesses.some((b) => {
        const s = v?.businesses[b.id];
        return !!s && s.owned > 0 && !s.managed && E.canAfford(game.cash, E.managerCost(cfg, game.activeVenue, b.id));
      });
    }
    return false;
  });
}

function upgradesDot(cfg: GameConfig, game: GameState): boolean {
  return safe(() => cfg.upgrades.some((u) => !u.premium && !game.upgrades.includes(u.id) && E.canAfford(game.cash, u.cost)));
}

function empireDot(cfg: GameConfig, game: GameState): boolean {
  return safe(() => {
    const next = E.nextVenueToUnlock(cfg, game);
    if (next && E.canAfford(game.cash, E.venueUnlockCost(cfg, next))) return true;
    const gain = E.prestigePointsAvailable(cfg, game);
    // Only when a reset would at least double what the player holds.
    return gain > 0 && gain >= Math.max(1, game.prestigePoints);
  });
}

function shopDot(cfg: GameConfig, game: GameState): boolean {
  return safe(() => E.canClaimDaily(game, Date.now()) || M.dailyOffers(cfg, game).some((o) => !o.bought && o.offer.gemCost === 0));
}

function TabItem({ tab, icon, label, active, badge, onPress }: { tab: Tab; icon: string; label: string; active: boolean; badge: boolean; onPress: () => void }) {
  const t = useTheme();
  const target = useTarget(`tab:${tab}`);
  const scale = useSharedValue(active ? 1.12 : 1);
  const dot = useSharedValue(badge ? 1 : 0);
  useEffect(() => {
    // The selected tab's icon hops up and stays a little bigger.
    scale.value = active ? withSequence(withTiming(1.3, { duration: 90 }), withSpring(1.12, { damping: 7, stiffness: 260 })) : withTiming(1, { duration: 120 });
  }, [active, scale]);
  useEffect(() => {
    // A dot pops in once; it does not keep pulsing (a steady dot is enough to be seen).
    dot.value = badge ? withSequence(withTiming(1.4, { duration: 120 }), withSpring(1, { damping: 6, stiffness: 300 })) : withTiming(0, { duration: 120 });
  }, [badge, dot]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - scale.value) * 10 }, { scale: scale.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dot.value }], opacity: dot.value > 0.01 ? 1 : 0 }));
  return (
    <Pressable {...target} style={styles.item} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={badge ? `${label}, something to do` : label}>
      {active ? <View style={[styles.activeBg, { backgroundColor: alpha(t.c.primary, 0.1) }]} /> : null}
      <Animated.View style={[iconStyle, { opacity: active ? 1 : 0.7 }]}>
        <GameIcon icon={icon} size={26} />
        <Animated.View style={[styles.dot, { backgroundColor: t.c.danger, borderColor: t.c.surface }, dotStyle]} />
      </Animated.View>
      <Text style={[styles.label, t.display, { color: active ? t.c.primary : t.c.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </Pressable>
  );
}

export function TabBar() {
  const t = useTheme();
  const m = useHomeMetrics();
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  const staff = useGame((s) => staffDot(s.cfg, s.game));
  const upgrades = useGame((s) => upgradesDot(s.cfg, s.game));
  const empire = useGame((s) => empireDot(s.cfg, s.game));
  const shop = useGame((s) => shopDot(s.cfg, s.game));
  const items: { key: Tab; icon: string; label: string; badge: boolean }[] = [
    { key: 'home', icon: t.icons.tabBuild ?? t.heroIcon, label: 'Home', badge: false },
    { key: 'staff', icon: t.icons.tabManagers, label: t.strings.managerTab, badge: staff },
    { key: 'upgrades', icon: t.icons.tabUpgrades, label: t.strings.upgradeTab, badge: upgrades },
    { key: 'empire', icon: t.strings.prestigeIcon, label: t.strings.prestigeVerb, badge: empire },
    { key: 'shop', icon: t.icons.tabShop, label: 'Shop', badge: shop },
  ];
  return (
    <View style={[styles.bar, { height: m.tabBar, backgroundColor: t.c.surface, borderTopColor: alpha(t.c.text, 0.08) }]} accessibilityRole="tablist">
      {items.map((it) => (
        <TabItem key={it.key} tab={it.key} icon={it.icon} label={it.label} active={it.key === tab} badge={it.badge} onPress={() => setTab(it.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 2 },
  activeBg: { position: 'absolute', top: 4, bottom: 4, left: 4, right: 4, borderRadius: 14 },
  label: { fontSize: 11, marginTop: 1, maxWidth: '96%' },
  dot: { position: 'absolute', top: -3, right: -7, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
