/**
 * One upgrade in the list: what it is, what it does in plain words, its price and a Buy button.
 * While saving up for it, a thin bar and an honest estimate at the current income show how close it
 * is (only when it is at least half way, so the list does not fill with empty bars).
 */
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { GameConfig, Upgrade } from '../../../config/schema';
import * as E from '../../../engine/economy';
import { formatMoney, formatNumber } from '../../../engine/format';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { useTarget } from '../../hints/targets';
import { formatCountdown, shortDuration } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { closeEnough, usePaced } from '../empire/paced';
import { PriceButton } from './PriceButton';
import type { UpgradeStatus } from './UpgradesTab';

/** What an upgrade does, in words: the thing it boosts and by how much. */
export function upgradeEffect(cfg: GameConfig, u: Upgrade): { what: string; icon: string | null; mult: string; text: string } {
  const mult = `×${formatNumber(u.revenueMult)}`;
  if (u.target === 'all') return { what: 'All income', icon: null, mult, text: `Everything earns ${mult}` };
  const b = cfg.businesses.find((x) => x.id === u.target);
  const name = b?.name ?? u.target;
  return { what: name, icon: b?.icon ?? null, mult, text: `${name} earns ${mult}` };
}

export function UpgradeRow({ u, status }: { u: Upgrade; status: UpgradeStatus }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const affordable = useGame((s) => (u.premium ? s.game.gems >= u.cost : s.game.cash >= u.cost));
  const target = useTarget(`buyUpgrade:${u.id}`);
  const effect = upgradeEffect(cfg, u);
  const locked = status === 'locked';
  const premium = u.premium;
  const ready = status === 'ready' || status === 'premiumReady';

  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const onBuy = () => {
    if (affordable) pop.value = withSequence(withTiming(1.05, { duration: 90 }), withSpring(1, { damping: 10, stiffness: 300 }));
    buyUpgrade(u.id);
  };

  const accent = premium ? t.c.accent : locked ? t.c.textMuted : t.c.stages.production;
  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: locked ? alpha(t.c.surface, 0.6) : t.c.surface, borderRadius: t.radius },
        ready && { borderWidth: 2, borderColor: premium ? t.c.accent : t.c.success },
        popStyle,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: alpha(accent, 0.16), opacity: locked ? 0.6 : 1 }]}>
        <GameIcon icon={u.icon ?? t.icons.tabUpgrades} size={38} />
        {effect.icon ? (
          <View style={[styles.badge, { backgroundColor: t.c.surface, borderColor: alpha(accent, 0.5) }]}>
            <GameIcon icon={effect.icon} size={16} />
          </View>
        ) : null}
      </View>
      <View style={styles.text}>
        <Text style={[t.display, styles.name, { color: locked ? t.c.textMuted : t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {u.name}
        </Text>
        <Text style={[styles.effect, { color: t.c.textMuted }]} numberOfLines={1}>
          <Text style={[t.display, { color: locked ? t.c.textMuted : accent }]}>{effect.mult} </Text>
          {effect.what}
        </Text>
        {locked ? (
          <Text style={[styles.note, { color: t.c.textMuted }]} numberOfLines={1}>
            🔒 Needs {effect.what}
          </Text>
        ) : premium ? (
          <Text style={[styles.note, { color: t.c.textMuted }]} numberOfLines={1}>
            Kept after a {t.strings.prestigeVerb.toLowerCase()}
          </Text>
        ) : status === 'saving' ? (
          <SavingHint cost={u.cost} />
        ) : null}
      </View>
      <View {...target}>
        <PriceButton
          label="Buy"
          price={premium ? formatNumber(u.cost) : formatMoney(u.cost, t.strings.currencySymbol)}
          priceIcon={premium ? t.strings.gemIcon : undefined}
          // Not affordable yet: a quiet outlined price that stays readable (a tap plays the "not yet" sound).
          variant={affordable ? 'primary' : 'ghost'}
          onPress={onBuy}
        />
      </View>
    </Animated.View>
  );
}

/** How close the cash is to this price, sampled once a second. Hidden below half way. */
function SavingHint({ cost }: { cost: number }) {
  const t = useTheme();
  const cash = usePaced((s) => s.game.cash, 1000, closeEnough);
  const income = usePaced((s) => E.incomePerSecond(s.cfg, s.game, Date.now()), 1000, closeEnough);
  const frac = cost > 0 ? cash / cost : 0;
  if (frac < 0.5 || frac >= 1) return null;
  const eta = income > 0 ? (cost - cash) / income : Infinity;
  return (
    <View style={styles.hint}>
      <View style={[styles.hintTrack, { backgroundColor: alpha(t.c.text, 0.1) }]}>
        <View style={{ width: `${frac * 100}%`, height: '100%', borderRadius: 3, backgroundColor: t.c.progress }} />
      </View>
      <Text style={[styles.hintText, { color: t.c.textMuted }]} numberOfLines={1}>
        {Number.isFinite(eta) && eta < 86400 * 3 ? `~${eta < 60 ? formatCountdown(eta * 1000) : shortDuration(eta)} at current income` : `${Math.floor(frac * 100)}%`}
      </Text>
    </View>
  );
}

/** A bought upgrade in the folded list: small, done, still says what it does. */
export function BoughtRow({ u }: { u: Upgrade }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const effect = upgradeEffect(cfg, u);
  return (
    <View style={[styles.bought, { backgroundColor: alpha(t.c.surface, 0.7), borderRadius: t.radius * 0.7 }]}>
      <GameIcon icon={u.icon ?? t.icons.tabUpgrades} size={28} />
      <Text style={[t.display, { color: t.c.text, fontSize: 14, flex: 1, marginLeft: 10 }]} numberOfLines={1}>
        {u.name}
      </Text>
      <Text style={{ color: t.c.textMuted, fontSize: 12, fontWeight: '700', marginRight: 8, flexShrink: 1 }} numberOfLines={1}>
        {effect.text}
      </Text>
      <Text style={{ color: t.c.success, fontWeight: '900', fontSize: 16 }}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingLeft: 12, marginHorizontal: 12, marginBottom: 8, minHeight: 76 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, marginHorizontal: 10 },
  name: { fontSize: 16 },
  effect: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  note: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  hintTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  hintText: { fontSize: 11, fontWeight: '800' },
  bought: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12, minHeight: 44 },
});
