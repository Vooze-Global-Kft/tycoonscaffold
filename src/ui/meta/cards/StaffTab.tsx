/**
 * The staff tab: the chest shelf, what the whole collection adds up to, and every staff card.
 * `top` is rendered first inside the same scroll view (classic games put their manager list there).
 * A game without cards and chests shows only `top`.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CARD_STATS, RARITIES, type GameConfig } from '../../../config/schema';
import { cardBonus } from '../../../engine/cards';
import type { GameState } from '../../../engine/types';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { SectionTitle } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { ChestShelf } from '../chest/ChestShelf';
import { formatPercent, levelReadyCount, statIcon, statLabel } from '../chest/shared';
import { CardTile } from './CardTile';

export function StaffTab({ top }: { top?: ReactNode }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const cards = useGame((s) => s.game.cards);
  const [width, setWidth] = useState(0);
  const hasCards = cfg.meta.cards.length > 0;
  const hasChests = cfg.meta.chests.length > 0;

  const ordered = useMemo(() => {
    const rank = (id: string) => RARITIES.indexOf(cfg.meta.cards.find((c) => c.id === id)!.rarity);
    const owned = cfg.meta.cards.filter((c) => (cards[c.id]?.level ?? 0) > 0);
    const missing = cfg.meta.cards.filter((c) => (cards[c.id]?.level ?? 0) === 0);
    owned.sort((a, b) => rank(b.id) - rank(a.id));
    missing.sort((a, b) => rank(a.id) - rank(b.id));
    return { owned, missing };
  }, [cfg, cards]);

  const cols = width >= 520 ? 4 : 3;
  const tileW = width > 0 ? Math.floor((width - 24 - 10 * (cols - 1)) / cols) : 0;
  const ready = useMemo(() => levelReadyCount(cfg, cards), [cfg, cards]);

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 10, paddingBottom: 28 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {top}
      {hasChests ? (
        <>
          <SectionTitle>CHESTS</SectionTitle>
          <ChestShelf />
        </>
      ) : null}
      {hasCards ? (
        <>
          <Totals cfg={cfg} cards={cards} />
          <SectionTitle
            right={
              <Text style={[styles.count, { color: t.c.textMuted }]}>
                {`${ordered.owned.length}/${cfg.meta.cards.length} found${ready > 0 ? ` · ${ready} can level up` : ''}`}
              </Text>
            }
          >
            COLLECTION
          </SectionTitle>
          {width > 0 ? (
            <View style={styles.grid}>
              {[...ordered.owned, ...ordered.missing].map((c) => (
                <CardTile key={c.id} card={c} width={tileW} />
              ))}
            </View>
          ) : null}
          <Text style={[styles.hint, { color: t.c.textMuted }]}>Tap a card to see what it does and to level it up.</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

/** One line per effect: what every card together adds, in the game's own words. */
function Totals({ cfg, cards }: { cfg: GameConfig; cards: GameState['cards'] }) {
  const t = useTheme();
  const lines = useMemo(() => {
    const state = { cards } as GameState;
    return CARD_STATS.map((stat) => ({ stat, pct: (cardBonus(cfg, state, stat) - 1) * 100 })).filter((l) => l.pct > 0.001);
  }, [cfg, cards]);
  return (
    <View style={[styles.totals, { backgroundColor: t.c.surface, borderRadius: t.radius }]}>
      <Text style={[styles.totalsTitle, t.display, { color: t.c.text }]}>Your staff give you</Text>
      {lines.length === 0 ? (
        <Text style={[styles.empty, { color: t.c.textMuted }]}>Nothing yet. Cards come from chests; each one adds a bonus as soon as you find it.</Text>
      ) : (
        <View style={styles.chips}>
          {lines.map((l) => (
            <View key={l.stat} style={[styles.chip, { backgroundColor: alpha(t.c.primary, 0.08), borderRadius: t.radius * 0.6 }]}>
              <GameIcon icon={statIcon(cfg, l.stat)} size={18} />
              <Text style={[styles.chipText, { color: t.c.text }]} numberOfLines={1}>
                <Text style={[t.display, { color: t.c.success }]}>{formatPercent(l.pct)}</Text>
                {` ${statLabel(cfg, l.stat)}`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  hint: { textAlign: 'center', fontSize: 12, fontWeight: '600', marginTop: 14, marginHorizontal: 24 },
  totals: { marginHorizontal: 12, marginTop: 14, padding: 12, gap: 8 },
  totalsTitle: { fontSize: 16 },
  empty: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, maxWidth: '100%' },
  chipText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
});
