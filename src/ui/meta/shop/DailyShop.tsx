/**
 * Today's shop: the free item first, then a few gem-priced items with fixed, named contents.
 * The real time until it changes sits in the heading; a bought item stays visible as "Sold" so
 * the row does not jump around.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as M from '../../../engine/meta';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { describeReward } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { Countdown, GemPrice, Shine, ShopSection, useFlyFrom, withGemFlight } from './parts';

export function DailyShop() {
  const t = useTheme();
  // "id:bought" strings: a cheap, shallow-comparable picture of today's row.
  const rows = useGame(
    useShallow((s) => {
      const allowChests = M.chestSalesAllowed(s.cfg, s.region);
      return M.dailyOffers(s.cfg, s.game)
        .filter((v) => v.offer.gemCost === 0 || allowChests || v.offer.reward.type !== 'chest')
        .map((v) => `${v.offer.id}:${v.bought ? 1 : 0}`);
    }),
  );
  if (rows.length === 0) return null;
  const now = Date.now();
  return (
    <ShopSection icon="🛒" title="Today's shop" note={<Countdown until={now + M.msUntilNextDay(now)} prefix="New items in " style={[styles.note, { color: t.c.textMuted }]} />}>
      <View style={styles.grid}>
        {rows.map((r) => {
          const [id, bought] = r.split(':');
          return <DailyItem key={id} offerId={id} bought={bought === '1'} />;
        })}
      </View>
    </ShopSection>
  );
}

function DailyItem({ offerId, bought }: { offerId: string; bought: boolean }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const offer = cfg.meta.dailyShop.offers.find((o) => o.id === offerId);
  const affordable = useGame((s) => (offer ? s.game.gems >= offer.gemCost : false));
  const buy = useGame((s) => s.buyDailyOffer);
  const { ref, emit } = useFlyFrom();
  if (!offer) return null;
  const free = offer.gemCost === 0;
  const info = describeReward(cfg, offer.reward);
  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: t.c.surface,
          borderRadius: t.radius,
          borderColor: free && !bought ? t.c.success : alpha(t.c.accent, 0.4),
          borderWidth: free && !bought ? 2.5 : 1.5,
          opacity: bought ? 0.6 : 1,
        },
      ]}
    >
      <View style={[styles.itemBand, { backgroundColor: alpha(free ? t.c.success : t.c.accent, 0.12), borderTopLeftRadius: t.radius, borderTopRightRadius: t.radius }]} />
      {free ? (
        <View style={[styles.freeTag, { backgroundColor: t.c.success, borderBottomRightRadius: 10, borderTopLeftRadius: t.radius - 2 }]}>
          <Text style={[styles.freeText, t.display, { color: t.c.primaryText }]}>FREE</Text>
        </View>
      ) : null}
      <View style={styles.itemIcon}>
        <GameIcon icon={offer.icon ?? info.icon} size={48} />
      </View>
      <Text style={[styles.itemTitle, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {offer.title}
      </Text>
      <Text style={[styles.itemSub, { color: t.c.textMuted }]} numberOfLines={2}>
        {info.label}
      </Text>
      <View ref={ref} collapsable={false} style={{ alignSelf: 'stretch' }}>
        {bought ? (
          <View style={[styles.sold, { borderRadius: t.radius * 0.75, backgroundColor: alpha(t.c.text, 0.07) }]}>
            <Text style={[t.display, { color: t.c.textMuted, fontSize: 15 }]}>{free ? '✓ Claimed' : '✓ Sold'}</Text>
          </View>
        ) : free ? (
          <View>
            <Button variant="success" label="Claim" onPress={() => withGemFlight(() => buy(offer.id), emit)} />
            <Shine radius={t.radius * 0.75} />
          </View>
        ) : (
          <Button variant="primary" disabled={!affordable} onPress={() => withGemFlight(() => buy(offer.id), emit)}>
            <GemPrice cost={offer.gemCost} light size={14} />
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 12, rowGap: 10 },
  item: { width: '48.5%', padding: 10, alignItems: 'center', overflow: 'hidden' },
  itemBand: { position: 'absolute', left: 0, right: 0, top: 0, height: 64 },
  freeTag: { position: 'absolute', left: 0, top: 0, paddingHorizontal: 9, paddingVertical: 3 },
  freeText: { fontSize: 11, letterSpacing: 0.8 },
  itemIcon: { height: 58, justifyContent: 'center', marginTop: 4 },
  itemTitle: { fontSize: 15, marginTop: 4, textAlign: 'center' },
  itemSub: { fontSize: 11, fontWeight: '700', textAlign: 'center', minHeight: 28, marginTop: 1, marginBottom: 6 },
  sold: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
