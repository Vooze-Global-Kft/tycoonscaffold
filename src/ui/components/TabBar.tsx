import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as E from '../../engine/economy';
import { useShallow } from 'zustand/react/shallow';
import { useGame, type Tab } from '../../state/store';
import { alpha, useTheme } from '../theme';

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
    { key: 'businesses', icon: t.heroIcon.startsWith('asset:') ? '🏢' : t.heroIcon, label: 'Build' },
    { key: 'managers', icon: '🧑‍💼', label: t.strings.managerTab, badge: badges.managers },
    { key: 'upgrades', icon: '⬆️', label: t.strings.upgradeTab, badge: badges.upgrades },
    { key: 'prestige', icon: t.strings.prestigeIcon.startsWith('asset:') ? '⭐' : t.strings.prestigeIcon, label: t.strings.prestigeVerb, badge: badges.prestige },
    { key: 'shop', icon: '🛒', label: 'Shop', badge: badges.shop },
  ];
  return (
    <View style={[styles.bar, { backgroundColor: t.c.surface, borderTopColor: alpha(t.c.text, 0.08) }]}>
      {items.map((it) => {
        const active = it.key === tab;
        return (
          <Pressable key={it.key} style={styles.item} onPress={() => setTab(it.key)}>
            <Text style={[styles.icon, { opacity: active ? 1 : 0.55 }]}>{it.icon}</Text>
            <Text style={[styles.label, { color: active ? t.c.primary : t.c.textMuted }]} numberOfLines={1}>{it.label}</Text>
            {it.badge ? <View style={[styles.dot, { backgroundColor: t.c.danger }]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6, paddingBottom: 4 },
  item: { flex: 1, alignItems: 'center' },
  icon: { fontSize: 22 },
  label: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  dot: { position: 'absolute', top: 0, right: '28%', width: 9, height: 9, borderRadius: 5 },
});
