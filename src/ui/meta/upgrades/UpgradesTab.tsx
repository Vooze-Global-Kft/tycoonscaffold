/**
 * The upgrades tab (named by `strings.upgradeTab`): every upgrade in the config as a collection the
 * player wants to complete. Order is "what can I do now" first: ready to buy, then saving up, then
 * the ones whose station is not open yet, the premium ones, and the bought ones folded into a count.
 *
 * The list is one flat array of headers and rows inside a single parent, so a row that changes group
 * (bought, became affordable, became too expensive after another purchase) slides to its new place
 * with a layout animation instead of popping.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import type { GameConfig, Upgrade } from '../../../config/schema';
import type { GameState } from '../../../engine/types';
import { useGame } from '../../../state/store';
import { SectionTitle } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { UpgradeHeader } from './UpgradeHeader';
import { BoughtRow, UpgradeRow } from './UpgradeRow';

/** Where an upgrade sits in the list. */
export type UpgradeStatus = 'ready' | 'saving' | 'locked' | 'premiumReady' | 'premium' | 'bought';

const GROUP_ORDER: UpgradeStatus[] = ['ready', 'saving', 'locked', 'premiumReady', 'premium', 'bought'];

/** True when the upgrade's station is open (level 1 or more) in any open venue; "all" always is. */
export function stationOwned(cfg: GameConfig, game: GameState, u: Upgrade): boolean {
  if (u.target === 'all') return true;
  for (const v of Object.values(game.venues)) {
    if (v.unlocked && (v.businesses[u.target]?.owned ?? 0) > 0) return true;
  }
  return false;
}

function statusOf(cfg: GameConfig, game: GameState, u: Upgrade): UpgradeStatus {
  if (game.upgrades.includes(u.id)) return 'bought';
  if (u.premium) return game.gems >= u.cost ? 'premiumReady' : 'premium';
  if (!stationOwned(cfg, game, u)) return 'locked';
  return game.cash >= u.cost ? 'ready' : 'saving';
}

type Item =
  | { kind: 'title'; key: string; text: string; count?: number }
  | { kind: 'row'; key: string; u: Upgrade; status: UpgradeStatus }
  | { kind: 'boughtToggle'; key: string; count: number }
  | { kind: 'bought'; key: string; u: Upgrade };

export function UpgradesTab() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  // One status string per upgrade: changes only when an upgrade crosses a threshold, not every tick.
  const statuses = useGame(useShallow((s) => s.cfg.upgrades.map((u) => statusOf(s.cfg, s.game, u))));
  const [showBought, setShowBought] = useState(false);

  const items = useMemo(() => {
    const byStatus = new Map<UpgradeStatus, Upgrade[]>();
    cfg.upgrades.forEach((u, i) => {
      const st = statuses[i];
      byStatus.set(st, [...(byStatus.get(st) ?? []), u]);
    });
    const out: Item[] = [];
    const titles: Record<UpgradeStatus, string> = {
      ready: 'READY TO BUY',
      saving: 'SAVING UP',
      locked: 'NOT OPEN YET',
      premiumReady: 'PREMIUM · KEPT AFTER A RESET',
      premium: '',
      bought: '',
    };
    for (const st of GROUP_ORDER) {
      const list = (byStatus.get(st) ?? []).slice().sort((a, b) => a.cost - b.cost);
      if (list.length === 0) continue;
      if (st === 'bought') {
        out.push({ kind: 'boughtToggle', key: 'bought-toggle', count: list.length });
        if (showBought) list.forEach((u) => out.push({ kind: 'bought', key: `b-${u.id}`, u }));
        continue;
      }
      // Both premium groups share one heading.
      if (st === 'premium' && (byStatus.get('premiumReady')?.length ?? 0) > 0) {
        list.forEach((u) => out.push({ kind: 'row', key: u.id, u, status: st }));
        continue;
      }
      out.push({ kind: 'title', key: `t-${st}`, text: titles[st] || titles.premiumReady });
      list.forEach((u) => out.push({ kind: 'row', key: u.id, u, status: st }));
    }
    return out;
  }, [cfg, statuses, showBought]);

  if (cfg.upgrades.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[t.display, { color: t.c.text, fontSize: 20 }]}>Nothing here yet</Text>
        <Text style={{ color: t.c.textMuted, marginTop: 6, textAlign: 'center' }}>This game has no {t.strings.upgradeTab.toLowerCase()}.</Text>
      </View>
    );
  }

  const bought = statuses.filter((s) => s === 'bought').length;

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <UpgradeHeader bought={bought} total={cfg.upgrades.length} />
      {bought === cfg.upgrades.length ? (
        <Text style={[styles.done, t.display, { color: t.c.success }]}>Every one collected. Well done!</Text>
      ) : null}
      {items.map((it) => {
        if (it.kind === 'title') {
          return (
            <Animated.View key={it.key} layout={LinearTransition.duration(220)} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
              <SectionTitle>{it.text}</SectionTitle>
            </Animated.View>
          );
        }
        if (it.kind === 'boughtToggle') {
          return (
            <Animated.View key={it.key} layout={LinearTransition.duration(220)}>
              <Pressable
                onPress={() => setShowBought((v) => !v)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.toggle, { backgroundColor: alpha(t.c.success, pressed ? 0.18 : 0.1), borderRadius: t.radius }]}
              >
                <Text style={[t.display, { color: t.c.success, fontSize: 15, flex: 1 }]} numberOfLines={1}>
                  ✓ {it.count} bought
                </Text>
                <Text style={{ color: t.c.textMuted, fontWeight: '800', fontSize: 13 }}>{showBought ? 'Hide ▴' : 'Show ▾'}</Text>
              </Pressable>
            </Animated.View>
          );
        }
        if (it.kind === 'bought') {
          return (
            <Animated.View key={it.key} layout={LinearTransition.duration(220)} entering={FadeIn.duration(160)} exiting={FadeOut.duration(100)}>
              <BoughtRow u={it.u} />
            </Animated.View>
          );
        }
        return (
          <Animated.View key={it.key} layout={LinearTransition.springify().damping(18).stiffness(180)} entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)}>
            <UpgradeRow u={it.u} status={it.status} />
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 10, paddingBottom: 28 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  done: { textAlign: 'center', fontSize: 16, marginVertical: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 12, marginBottom: 8, paddingHorizontal: 16, minHeight: 48 },
});
