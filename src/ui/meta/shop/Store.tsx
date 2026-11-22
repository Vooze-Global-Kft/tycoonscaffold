/**
 * The real-money store, as separate sections the shop orders: gem packs, permanent boosts and ads
 * (time warps sit with the gem time warp in Boosts; deal products belong to the offers above).
 * Each product says what it does in one plain line, its price is the store's own string, permanent
 * ones show "Owned", and the bonus on bigger gem packs is computed from the real prices.
 */
import { StyleSheet, Text, View } from 'react-native';
import type { IapProduct } from '../../../config/schema';
import * as E from '../../../engine/economy';
import { formatMoney, formatNumber } from '../../../engine/format';
import { iap } from '../../../services/iap';
import { productOwned, useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { alpha, textOn, useTheme } from '../../theme';
import { gemPackBonus } from './money';
import { OfferCard, ShopSection, useFlyFrom, withGemFlight } from './parts';

type Group = 'ads' | 'boosts' | 'gems' | 'warp';
const GROUP_OF: Record<IapProduct['kind'], Group | null> = {
  noAds: 'ads',
  skipAds: 'ads',
  starterPack: 'ads',
  // Kinds of other modes (haul), never in a tab-shell game's shop.
  clearance: null,
  unlock: null,
  multiplier: 'boosts',
  gems: 'gems',
  timeWarp: 'warp',
  deal: null,
};

function useGroup(g: Group): IapProduct[] {
  const products = useGame((s) => s.cfg.monetization.iap.products);
  return products.filter((p) => GROUP_OF[p.kind] === g);
}

/** The real-money time warps, shown inside the Boosts time-warp card. */
export function useWarpProducts(): IapProduct[] {
  return useGroup('warp');
}

/** Gem packs, smallest first; the pack with the most gems per unit of money is marked "BEST VALUE". */
export function GemPacks() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const gems = [...useGroup('gems')].sort((a, b) => a.value - b.value);
  if (gems.length === 0) return null;
  let best = -1;
  let bestBonus = 0;
  gems.forEach((p, i) => {
    const b = gemPackBonus(cfg, p);
    if (b > bestBonus) {
      bestBonus = b;
      best = i;
    }
  });
  return (
    <ShopSection title={t.strings.gemName}>
      <View style={styles.grid}>
        {gems.map((p, i) => (
          <GemPack key={p.id} product={p} rank={i} best={i === best} />
        ))}
      </View>
      <Text style={[styles.fine, { color: t.c.textMuted }]}>
        {t.strings.gemName} never expire and are kept when you start over.
      </Text>
    </ShopSection>
  );
}

export function PermanentBoosts() {
  const boosts = useGroup('boosts');
  if (boosts.length === 0) return null;
  return (
    <ShopSection title="Permanent boosts">
      {boosts.map((p) => (
        <ProductRow key={p.id} product={p} />
      ))}
    </ShopSection>
  );
}

/** No Ads and the skip-ads pass. Called "Ads", not "Ad-free": the pass alone leaves banners on. */
export function AdProducts() {
  const ads = useGroup('ads');
  if (ads.length === 0) return null;
  return (
    <ShopSection title="Ads">
      {ads.map((p) => (
        <ProductRow key={p.id} product={p} />
      ))}
    </ShopSection>
  );
}

function defaultIcon(p: IapProduct, icons: { timeWarp: string; gift: string }, gemIcon: string): string {
  switch (p.kind) {
    case 'noAds':
      return '🚫';
    case 'skipAds':
      return '⏩';
    case 'multiplier':
      return 'art:coin';
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
      return 'Get every ad reward without watching a video.';
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
  // A skip-ads pass leaves banners and pop-ups on: say so, and name what removes them.
  const noAdsTitle = useGame((s) => s.cfg.monetization.iap.products.find((p) => p.kind === 'noAds')?.title);
  // The highlight is for a new player only: after the first reset a "start" ribbon would not be true.
  const fresh = useGame((s) => s.game.prestigeCount === 0);
  const { ref, emit } = useFlyFrom();
  const line =
    (product.description ?? defaultLine(product, t.strings.gemName)) +
    (product.kind === 'skipAds' ? ` Banners and pop-up ads still show${noAdsTitle ? `: ${noAdsTitle} removes those` : ''}.` : '');
  const featured = !!product.highlight && !owned && fresh;
  return (
    <OfferCard ribbon={featured ? 'GOOD START' : undefined} strong={featured} dim={owned}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: alpha(t.c.accent, 0.18) }]}>
          <GameIcon icon={product.icon ?? defaultIcon(product, t.icons, t.strings.gemIcon)} size={40} />
          {product.kind === 'multiplier' ? (
            <View style={[styles.multBadge, { backgroundColor: t.c.primary }]}>
              <Text style={[styles.multText, t.display, { color: textOn(t.c.primary) }]}>{`×${product.value}`}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {product.title}
          </Text>
          <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={product.kind === 'skipAds' ? 5 : 3}>
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
            <Button variant="primary" label={iap.price(product)} onPress={() => withGemFlight(() => purchase(product), emit)} style={{ minWidth: 88 }} />
          )}
        </View>
      </View>
    </OfferCard>
  );
}

/** A gem pack tile; bigger packs show a bigger pile and their real extra value over the smallest pack. */
function GemPack({ product, rank, best }: { product: IapProduct; rank: number; best: boolean }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const purchase = useGame((s) => s.purchase);
  const { ref, emit } = useFlyFrom();
  const bonus = gemPackBonus(cfg, product);
  const pile = Math.min(4, rank + 1);
  return (
    <View style={[styles.pack, { backgroundColor: t.c.surface, borderRadius: t.radius, borderColor: alpha(t.c.accent, 0.45) }]}>
      <View style={[styles.packBand, { backgroundColor: alpha(t.c.accent, 0.13) }]} />
      {best ? (
        <View style={[styles.best, { backgroundColor: t.c.primary, borderBottomRightRadius: 10, borderTopLeftRadius: t.radius - 2 }]}>
          <Text style={[styles.bonusText, t.display, { color: textOn(t.c.primary) }]} numberOfLines={1}>
            BEST VALUE
          </Text>
        </View>
      ) : null}
      {bonus > 0 ? (
        <View style={[styles.bonus, { backgroundColor: t.c.success, borderBottomLeftRadius: 10, borderTopRightRadius: t.radius - 2 }]}>
          <Text style={[styles.bonusText, t.display, { color: textOn(t.c.success) }]} numberOfLines={1}>
            +{bonus}% extra
          </Text>
        </View>
      ) : null}
      <View style={styles.pile}>
        {product.icon ? (
          <GameIcon icon={product.icon} size={44 + pile * 4} />
        ) : (
          Array.from({ length: pile }, (_, i) => (
            <View key={i} style={{ marginLeft: i === 0 ? 0 : -18, marginTop: i % 2 === 1 ? -10 : 0, zIndex: i % 2 }}>
              <GameIcon icon={t.strings.gemIcon} size={34 + (i % 2) * 6} />
            </View>
          ))
        )}
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
  best: { position: 'absolute', left: 0, top: 0, paddingHorizontal: 8, paddingVertical: 3 },
  multBadge: { position: 'absolute', right: -4, bottom: -2, minWidth: 26, paddingHorizontal: 4, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  multText: { fontSize: 12 },
  bonusText: { fontSize: 11 },
  pile: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: 62, marginTop: 6 },
  packAmount: { fontSize: 24, marginTop: 2 },
  packTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8 },
});
