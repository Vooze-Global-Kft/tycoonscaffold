/**
 * The empire tab: the long game. A summary on top (what the whole empire earns, how far along the
 * road of venues the player is, the stars held), then the road of venues itself (sim games only),
 * the reset, and the player's story so far. When a reset is available, the summary says so and a
 * tap scrolls to it; it never opens anything by itself.
 */
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as E from '../../../engine/economy';
import { formatMoney, formatNumber } from '../../../engine/format';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { alpha, useTheme } from '../../theme';
import { closeEnough, usePaced } from './paced';
import { PrestigeCard } from './PrestigeCard';
import { StorySoFar } from './StorySoFar';
import { VenueJourney } from './VenueJourney';

export function EmpireTab() {
  const sim = useGame((s) => Boolean(s.cfg.sim));
  const scroll = useRef<ScrollViewInstance>(null);
  const prestigeY = useRef(0);
  return (
    <ScrollView ref={scroll} contentContainerStyle={styles.list}>
      <Summary onReset={() => scroll.current?.scrollTo({ y: Math.max(0, prestigeY.current - 8), animated: true })} />
      {sim ? <VenueJourney /> : null}
      <View
        onLayout={(e) => {
          prestigeY.current = e.nativeEvent.layout.y;
        }}
      >
        <SectionHeading />
        <PrestigeCard />
      </View>
      <StorySoFar />
    </ScrollView>
  );
}

function SectionHeading() {
  const t = useTheme();
  return <Text style={[styles.heading, { color: t.c.textMuted }]}>{t.strings.prestigeName.toUpperCase()}</Text>;
}

function Summary({ onReset }: { onReset: () => void }) {
  const t = useTheme();
  const v = useGame(
    useShallow((s) => {
      const list = s.cfg.sim?.venues ?? [];
      return {
        open: list.filter((x) => s.game.venues[x.id]?.unlocked).length,
        total: list.length,
        held: s.game.prestigePoints,
        gain: E.prestigePointsAvailable(s.cfg, s.game),
        mult: E.prestigeMultiplier(s.cfg, s.game),
      };
    }),
  );
  const income = usePaced((s) => E.incomePerSecond(s.cfg, s.game, Date.now()), 1000, closeEnough);
  return (
    <View style={[styles.summary, { backgroundColor: t.c.surface, borderRadius: t.radius }]}>
      <View style={styles.summaryRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: t.c.textMuted }]}>THE WHOLE EMPIRE EARNS</Text>
          <Text style={[t.display, styles.income, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {formatMoney(income, t.strings.currencySymbol)}/s
          </Text>
        </View>
        <View style={[styles.stars, { backgroundColor: alpha(t.c.accent, 0.16), borderRadius: t.radius * 0.7 }]}>
          <GameIcon icon={t.strings.prestigeIcon} size={26} />
          <View style={{ marginLeft: 6 }}>
            <Text style={[t.display, { color: t.c.text, fontSize: 18 }]} numberOfLines={1}>
              {formatNumber(v.held, 0)}
            </Text>
            <Text style={{ color: t.c.textMuted, fontSize: 10, fontWeight: '800' }} numberOfLines={1}>
              +{formatNumber((v.mult - 1) * 100, 0)}%
            </Text>
          </View>
        </View>
      </View>
      {v.total > 1 ? (
        <View style={styles.road}>
          {Array.from({ length: v.total }, (_, i) => (
            <View key={i} style={[styles.roadDot, { backgroundColor: i < v.open ? t.c.success : i === v.open ? t.c.accent : alpha(t.c.text, 0.12) }]} />
          ))}
        </View>
      ) : null}
      {v.gain > 0 ? (
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          style={({ pressed }) => [styles.ready, { backgroundColor: alpha(t.c.accent, pressed ? 0.3 : 0.18), borderRadius: t.radius * 0.7 }]}
        >
          <GameIcon icon={t.strings.prestigeIcon} size={20} />
          <Text style={[t.display, { color: t.c.text, fontSize: 14, flex: 1, marginLeft: 6 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {t.strings.prestigeVerb} available: +{formatNumber(v.gain, 0)} {t.strings.prestigeName}
          </Text>
          <Text style={{ color: t.c.textMuted, fontWeight: '900' }}>▾</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 10, paddingBottom: 32 },
  summary: { marginHorizontal: 12, padding: 14, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  income: { fontSize: 26, marginTop: 2 },
  stars: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, marginLeft: 10 },
  road: { flexDirection: 'row', gap: 4, marginTop: 12 },
  roadDot: { flex: 1, height: 6, borderRadius: 3 },
  ready: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 12, minHeight: 44 },
  heading: { fontWeight: '900', fontSize: 12, letterSpacing: 1.5, marginHorizontal: 16, marginTop: 12, marginBottom: 6 },
});
