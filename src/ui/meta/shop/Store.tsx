/**
 * The real-money store, grouped by what the player gets: ad-free, permanent boosts, gem packs,
 * time warps (deal products are not listed: they belong to the offers above). Each product says
 * what it does in one plain line, its price is the store's own string, permanent ones show
 * "Owned", and the bonus on bigger gem packs is computed from the real prices.
 */
import { StyleSheet, Text, View } from 'react-native';
import type { IapProduct } from '../../../config/schema';
import * as E from '../../../engine/economy';
import { formatMoney, formatNumber } from '../../../engine/format';
import { iap } from '../../../services/iap';
import { productOwned, useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { alpha, useTheme } from '../../theme';
import { gemPackBonus } from './money';
import { OfferCard, ShopSection, useFlyFrom, withGemFlight } from './parts';

type Group = 'ads' | 'boosts' | 'gems' | 'warp';
const GROUP_OF: Record<IapProduct['kind'], Group | null> = {
  noAds: 'ads',
  skipAds: 'ads',
  starterPack: 'ads',
  multiplier: 'boosts',
  gems: 'gems',
  timeWarp: 'warp',
  deal: null,
};

export function Store() {
  const t = useTheme();
  const products = useGame((s) => s.cfg.monetization.iap.products);
  const by = (g: Group) => products.filter((p) => GROUP_OF[p.kind] === g);
  const ads = by('ads');
  const boosts = by('boosts');
  const gems = [...by('gems')].sort((a, b) => a.value - b.value);
  const warps = by('warp');
  return (
    <>
      {gems.length > 0 ? (
        <ShopSection icon={t.strings.gemIcon} title={t.strings.gemName}>
          <View style={styles.grid}>
            {gems.map((p, i) => (
              <GemPack key={p.id} product={p} rank={i} />
            ))}
          </View>
          <Text style={[styles.fine, { color: t.c.textMuted }]}>
            {t.strings.gemName} never expire and are kept when you start over.
          </Text>
        </ShopSection>
      ) : null}
      {boosts.length > 0 ? (
        <ShopSection icon="🚀" title="Permanent boosts">
          {boosts.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </ShopSection>
      ) : null}
      {ads.length > 0 ? (
        <ShopSection icon="🚫" title="Ad-free">
          {ads.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </ShopSection>
      ) : null}
      {warps.length > 0 ? (
        <ShopSection icon={t.icons.timeWarp} title="Time warps">
          {warps.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </ShopSection>
      ) : null}
    </>
  );
}

function defaultIcon(p: IapProduct, icons: { timeWarp: string; gift: string }, gemIcon: string): string {
  switch (p.kind) {
    case 'noAds':
      return '🚫';
    case 'skipAds':
      return '⏩';
    case 'multiplier':
      return '🚀';
    case 'timeWarp':
      return icons.timeWarp;
    case 'starterPack':
      return icons.gift;
    default:
      return gemIcon;
  }
}

/** One plain line about what a product does, when the config gives none. */
function defaultLine(p: IapProduct, gemName: string): string {
  switch (p.kind) {
    case 'noAds':
      return 'Removes banner and pop-up ads for good.';
    case 'skipAds':
      return 'Get ad rewards without watching the ad.';
    case 'multiplier':
      return `×${p.value} on all income, forever.`;
    case 'timeWarp':
      return `Earn ${p.value} hours of income at once.`;
    case 'starterPack':
      return `No ads, plus ${formatNumber(p.value)} ${gemName}.`;
    default:
      return `${formatNumber(p.value)} ${gemName}.`;
  }
}

function ProductRow({ product }: { product: IapProduct }) {
  const t = useTheme();
  const owned = useGame((s) => productOwned(s.game, product));
  const purchase = useGame((s) => s.purchase);
  // A time warp says what it would pay right now (rounded so the row re-renders rarely).
  const warpCash = useGame((s) => {
    if (product.kind !== 'timeWarp') return 0;
    const v = E.incomePerSecond(s.cfg, s.game, Date.now()) * product.value * 3600;
    if (v <= 0) return 0;
    const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
    return Math.round(v / p) * p;
  });
  const { ref, emit } = useFlyFrom();
  const line = product.description ?? defaultLine(product, t.strings.gemName);
  return (
    <OfferCard ribbon={product.highlight && !owned ? 'GOOD START' : undefined} strong={product.highlight && !owned} dim={owned}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: alpha(t.c.accent, 0.18) }]}>
          <GameIcon icon={product.icon ?? defaultIcon(product, t.icons, t.strings.gemIcon)} size={40} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {product.title}
          </Text>
          <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={3}>
            {line}
            {warpCash > 0 ? ` Right now: ${formatMoney(warpCash, t.strings.currencySymbol)}.` : ''}
          </Text>
        </View>
        <View ref={ref} collapsable={false}>
          {owned ? (
            <View style={[styles.owned, { borderColor: alpha(t.c.success, 0.5), borderRadius: t.radius * 0.75 }]}>
              <Text style={[t.display, { color: t.c.success, fontSize: 15 }]}>Owned ✓</Text>
            </View>
          ) : (
            <Button variant={product.highlight ? 'accent' : 'primary'} label={iap.price(product)} onPress={() => withGemFlight(() => purchase(product), emit)} style={{ minWidth: 88 }} />
          )}
        </View>
      </View>
    </OfferCard>
  );
}

/** A gem pack tile; bigger packs show a bigger pile and their real extra value over the smallest pack. */
function GemPack({ product, rank }: { product: IapProduct; rank: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const purchase = useGame((s) => s.purchase);
  const { ref, emit } = useFlyFrom();
  const bonus = gemPackBonus(cfg, product);
  const pile = Math.min(4, rank + 1);
  return (
    <View style={[styles.pack, { backgroundColor: t.c.surface, borderRadius: t.radius, borderColor: alpha(t.c.accent, 0.45) }]}>
      <View style={[styles.packBand, { backgroundColor: alpha(t.c.accent, 0.13) }]} />
      {bonus > 0 ? (
        <View style={[styles.bonus, { backgroundColor: t.c.success, borderBottomLeftRadius: 10, borderTopRightRadius: t.radius - 2 }]}>
          <Text style={[styles.bonusText, t.display, { color: t.c.primaryText }]} numberOfLines={1}>
            +{bonus}% extra
          </Text>
        </View>
      ) : null}
      <View style={styles.pile}>
        {Array.from({ length: pile }, (_, i) => (
          <View key={i} style={{ marginLeft: i === 0 ? 0 : -18, marginTop: i % 2 === 1 ? -10 : 0, zIndex: i % 2 }}>
            <GameIcon icon={t.strings.gemIcon} size={34 + (i % 2) * 6} />
          </View>
        ))}
      </View>
      <Text style={[styles.packAmount, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatNumber(product.value)}
      </Text>
      <Text style={[styles.packTitle, { color: t.c.textMuted }]} numberOfLines={1}>
        {product.title}
      </Text>
      <View ref={ref} collapsable={false} style={{ alignSelf: 'stretch' }}>
        <Button variant="primary" label={iap.price(product)} onPress={() => withGemFlight(() => purchase(product), emit)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 12, rowGap: 10 },
  fine: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 8, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18 },
  sub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  owned: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pack: { width: '48.5%', padding: 10, alignItems: 'center', borderWidth: 1.5, overflow: 'hidden' },
  packBand: { position: 'absolute', left: 0, right: 0, top: 0, height: 70 },
  bonus: { position: 'absolute', right: 0, top: 0, paddingHorizontal: 8, paddingVertical: 3 },
  bonusText: { fontSize: 11 },
  pile: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: 62, marginTop: 6 },
  packAmount: { fontSize: 24, marginTop: 2 },
  packTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8 },
});
