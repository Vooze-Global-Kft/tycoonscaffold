/**
 * Chests for gems. Shown only when the game sells chests at all (meta.chestsForSale), the
 * player's country allows it (M.chestSalesAllowed) and the chest has a gem price. Every chest
 * says plainly that its contents are random, links to its drop rates before any purchase, and
 * shows the real-money equivalent of its gem price (policy.md §1, §2).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as M from '../../../engine/meta';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { alpha, useTheme } from '../../theme';
import { GemPrice, OfferCard, ShopSection } from './parts';

export function ChestShop() {
  const ids = useGame(
    useShallow((s) => (M.chestSalesAllowed(s.cfg, s.region) ? s.cfg.meta.chests.filter((c) => c.gemCost !== undefined).map((c) => c.id) : [])),
  );
  if (ids.length === 0) return null;
  return (
    <ShopSection title="Chests">
      {ids.map((id) => (
        <ChestRow key={id} chestId={id} />
      ))}
    </ShopSection>
  );
}

function ChestRow({ chestId }: { chestId: string }) {
  const t = useTheme();
  const chest = useGame((s) => s.cfg.meta.chests.find((c) => c.id === chestId));
  const gems = useGame((s) => s.game.gems);
  const buy = useGame((s) => s.buyChest);
  const openModal = useGame((s) => s.openModal);
  if (!chest || chest.gemCost === undefined) return null;
  return (
    <OfferCard>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: alpha(t.c.accent, 0.18) }]}>
          <GameIcon icon={chest.icon} size={44} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1}>
            {chest.name}
          </Text>
          <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={2}>
            {chest.slots} random rewards. Contents are random: check the drop rates first.
          </Text>
          <Pressable onPress={() => openModal({ type: 'chestOdds', chestId })} hitSlop={10} accessibilityRole="link" style={styles.link}>
            <Text style={[styles.linkText, { color: t.c.primary }]}>See drop rates ›</Text>
          </Pressable>
        </View>
        <Button variant="primary" disabled={gems < chest.gemCost} onPress={() => buy(chestId)} style={{ minWidth: 92 }}>
          <GemPrice cost={chest.gemCost} light size={14} />
        </Button>
      </View>
    </OfferCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18 },
  sub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  link: { minHeight: 32, justifyContent: 'center' },
  linkText: { fontSize: 13, fontWeight: '900' },
});
