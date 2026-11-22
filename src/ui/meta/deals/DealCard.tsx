/**
 * One limited offer, shown the same way in the shop and in the popup: what it is, every item
 * by name, its real end ("Ends Tue 14:30 · 2d 5h left"), how often it can be bought, and the
 * price (the store's own price string, or gems with their real-money equivalent).
 * Deliberately calm: no flashing, no red, no countdown drama, no "Buy now!".
 */
import { StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as M from '../../../engine/meta';
import { iap } from '../../../services/iap';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { formatEnd, Pill } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { Countdown, GemPrice, OfferCard, RewardTiles, useFlyFrom, withGemFlight } from '../shop/parts';

/** Ids of the offers this player may see right now (soonest-ending first), with the chest-sales rule applied. */
export function useVisibleDealIds(): string[] {
  return useGame(
    useShallow((s) => {
      const allowChests = M.chestSalesAllowed(s.cfg, s.region);
      return M.activeDeals(s.cfg, s.game, Date.now())
        .filter((v) => allowChests || !M.containsChest(v.deal.contents))
        .map((v) => v.deal.id);
    }),
  );
}

/** The live facts of one active offer, or null when it is not on sale (ended, sold out, never started). */
export function useDealView(dealId: string | null): { endsAt: number | null; purchasesLeft: number } | null {
  return useGame(
    useShallow((s) => {
      if (!dealId) return null;
      const v = M.activeDeals(s.cfg, s.game, Date.now()).find((d) => d.deal.id === dealId);
      return v ? { endsAt: v.endsAt, purchasesLeft: v.purchasesLeft } : null;
    }),
  );
}

/** "Can be bought once." and friends: plain facts about the purchase limit. */
export function purchaseLimitText(maxPurchases: number, left: number): string {
  if (maxPurchases === 1) return 'Can be bought once.';
  return left === 1 ? 'Can be bought 1 more time.' : `Can be bought ${left} more times.`;
}

export function DealCard({ dealId, inPopup = false }: { dealId: string; inPopup?: boolean }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const deal = cfg.meta.deals.find((d) => d.id === dealId);
  const view = useDealView(dealId);
  const gems = useGame((s) => s.game.gems);
  const buy = useGame((s) => s.buyDeal);
  const { ref, emit } = useFlyFrom();
  if (!deal || !view) return null;

  const product = deal.productId ? cfg.monetization.iap.products.find((p) => p.id === deal.productId) : undefined;
  const short = deal.gemCost !== undefined && gems < deal.gemCost;
  const limitText = purchaseLimitText(deal.maxPurchases, view.purchasesLeft);
  // A badge that only repeats the purchase limit line below would say the same thing twice.
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
  const badge = deal.badge && norm(deal.badge) !== norm(limitText) ? deal.badge : null;
  const onBuy = () => withGemFlight(() => buy(deal.id), emit);

  const body = (
    <>
      <View style={styles.head}>
        <View style={[styles.iconWrap, { backgroundColor: alpha(t.c.accent, 0.18) }]}>
          <GameIcon icon={deal.icon ?? t.icons.gift} size={inPopup ? 56 : 46} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          {badge ? <Pill>{badge}</Pill> : null}
          {!inPopup ? (
            <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {deal.title}
            </Text>
          ) : null}
          {deal.blurb ? (
            <Text style={[styles.blurb, { color: t.c.textMuted }]} numberOfLines={inPopup ? 4 : 3}>
              {deal.blurb}
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={[styles.label, { color: t.c.textMuted }]}>{"WHAT'S INSIDE"}</Text>
      <RewardTiles rewards={deal.contents} />

      <View style={[styles.facts, { backgroundColor: alpha(t.c.text, 0.04), borderRadius: t.radius * 0.5 }]}>
        {view.endsAt !== null ? (
          <View style={styles.factRow}>
            <Text style={[styles.fact, { color: t.c.text }]} numberOfLines={1}>
              Ends {formatEnd(view.endsAt)}
            </Text>
            <Countdown until={view.endsAt} suffix=" left" style={[styles.fact, { color: t.c.textMuted }]} />
          </View>
        ) : (
          <Text style={[styles.fact, { color: t.c.text }]}>Always available in the shop.</Text>
        )}
        <Text style={[styles.fact, { color: t.c.text }]}>{limitText}</Text>
      </View>

      <View ref={ref} collapsable={false} style={{ marginTop: 10 }}>
        {product ? (
          <Button variant="primary" label={iap.price(product)} sublabel={deal.contents.length > 1 ? `All ${deal.contents.length} items` : undefined} onPress={onBuy} />
        ) : deal.gemCost !== undefined ? (
          <Button variant="primary" onPress={onBuy} disabled={short}>
            <GemPrice cost={deal.gemCost} light />
          </Button>
        ) : null}
        {short ? (
          <Text style={[styles.short, { color: t.c.textMuted }]}>
            You need {deal.gemCost! - gems} more {t.strings.gemName}.
          </Text>
        ) : null}
      </View>
    </>
  );

  if (inPopup) return <View>{body}</View>;
  return <OfferCard>{body}</OfferCard>;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconWrap: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21 },
  blurb: { fontSize: 13, fontWeight: '600', lineHeight: 17 },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  facts: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 3 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  fact: { fontSize: 13, fontWeight: '700' },
  short: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 },
});
