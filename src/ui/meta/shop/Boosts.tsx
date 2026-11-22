/**
 * Boosts: the rewarded-ad income boost (the button states the action and the exact reward, as
 * ad policy requires, and shows the real time left while it runs) and the time warp for gems
 * (it shows the cash it would pay right now, from the engine).
 */
import { StyleSheet, Text, View } from 'react-native';
import * as E from '../../../engine/economy';
import { formatMoney } from '../../../engine/format';
import { ads } from '../../../services/ads';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { formatCountdown, shortDuration, useNow } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { GemPrice, OfferCard, ShopSection } from './parts';

export function Boosts() {
  const t = useTheme();
  return (
    <ShopSection icon={t.icons.boost} title="Boosts">
      <AdBoost />
      <TimeWarp />
    </ShopSection>
  );
}

function AdBoost() {
  const t = useTheme();
  const boost = useGame((s) => s.cfg.economy.boost);
  const boostUntil = useGame((s) => s.game.boostUntil);
  const skip = useGame((s) => s.game.entitlements.skipRewarded);
  const watch = useGame((s) => s.watchBoostAd);
  const now = useNow(1000);
  const left = Math.max(0, boostUntil - now);
  // Same rule as E.canBoost, from the two numbers this card already has.
  const canAdd = boostUntil < now + (boost.maxMinutes - boost.minutesPerAd) * 60_000;
  const reward = `×${boost.multiplier} income for ${shortDuration(boost.minutesPerAd * 60)}`;
  const action = skip || ads.skipRewarded ? 'Claim' : 'Watch ad';
  return (
    <OfferCard tint={t.c.stages?.transport ?? t.c.success}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: alpha(t.c.accent, 0.18) }]}>
          <GameIcon icon={t.icons.boost} size={40} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {reward}
          </Text>
          <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={2}>
            {left > 0
              ? `Active: ${formatCountdown(left)} left. Adds up to ${shortDuration(boost.maxMinutes * 60)}.`
              : `Optional. Each ad adds ${shortDuration(boost.minutesPerAd * 60)}, up to ${shortDuration(boost.maxMinutes * 60)}.`}
          </Text>
        </View>
      </View>
      <Button
        variant="accent"
        label={canAdd ? `${action}: +${shortDuration(boost.minutesPerAd * 60)}` : 'Boost is full'}
        disabled={!canAdd}
        onPress={watch}
        style={{ marginTop: 10 }}
      />
    </OfferCard>
  );
}

function TimeWarp() {
  const t = useTheme();
  const warp = useGame((s) => s.cfg.economy.timeWarp);
  const gems = useGame((s) => s.game.gems);
  // Income moves every tick; round to 3 significant digits so this card re-renders rarely.
  const value = useGame((s) => {
    const v = E.incomePerSecond(s.cfg, s.game, Date.now()) * s.cfg.economy.timeWarp.hours * 3600;
    if (v <= 0) return 0;
    const p = Math.pow(10, Math.floor(Math.log10(v)) - 2);
    return Math.round(v / p) * p;
  });
  const symbol = useGame((s) => s.cfg.strings.currencySymbol);
  const buy = useGame((s) => s.gemTimeWarp);
  const short = gems < warp.gemCost;
  return (
    <OfferCard>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: alpha(t.c.accent, 0.18) }]}>
          <GameIcon icon={t.icons.timeWarp} size={40} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1}>
            Time warp
          </Text>
          <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={2}>
            {value > 0 ? `Get ${formatMoney(value, symbol)} now: ${shortDuration(warp.hours * 3600)} of your current income.` : `Get ${shortDuration(warp.hours * 3600)} of income at once. Start earning first.`}
          </Text>
        </View>
        <Button variant="primary" disabled={short || value <= 0} onPress={buy} style={{ minWidth: 92 }}>
          <GemPrice cost={warp.gemCost} light size={14} />
        </Button>
      </View>
    </OfferCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18 },
  sub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
