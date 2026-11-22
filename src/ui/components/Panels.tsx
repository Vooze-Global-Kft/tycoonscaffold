/** The tab contents: businesses, managers, upgrades, prestige and shop. */
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as E from '../../engine/economy';
import { formatDuration, formatMoney, formatNumber } from '../../engine/format';
import { ads } from '../../services/ads';
import { iap } from '../../services/iap';
import { productOwned, useGame } from '../../state/store';
import { useTheme } from '../theme';
import { BusinessRow } from './BusinessRow';
import { Button } from './Button';
import { GameIcon } from './GameIcon';

function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.c.surface, borderRadius: t.radius },
        highlight && { borderWidth: 2, borderColor: t.c.accent },
      ]}
    >
      {children}
    </View>
  );
}

function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, marginHorizontal: 10 }}>
      <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1}>{children}</Text>
      {sub ? <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={2}>{sub}</Text> : null}
    </View>
  );
}

export function BuyAmountToggle() {
  const t = useTheme();
  const amount = useGame((s) => s.buyAmount);
  const set = useGame((s) => s.setBuyAmount);
  return (
    <View style={styles.toggle}>
      {([1, 10, 100, 'max'] as const).map((a) => (
        <Button
          key={a}
          variant={a === amount ? 'primary' : 'ghost'}
          label={a === 'max' ? 'MAX' : `×${a}`}
          onPress={() => set(a)}
          style={{ flex: 1, minHeight: 34, paddingVertical: 4 }}
        />
      ))}
      <View style={{ width: 4 }} />
      <Text style={{ color: t.c.textMuted, fontSize: 10, alignSelf: 'center' }}>buy</Text>
    </View>
  );
}

export function BusinessesPanel() {
  const cfg = useGame((s) => s.cfg);
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <BuyAmountToggle />
      {cfg.businesses.map((b, i) => (
        <BusinessRow key={b.id} b={b} index={i} />
      ))}
    </ScrollView>
  );
}

export function ManagersPanel() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const game = useGame((s) => s.game);
  const hire = useGame((s) => s.hire);
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {cfg.businesses.map((b) => {
        const s = game.venues[game.activeVenue].businesses[b.id];
        if (s.owned === 0 && !s.managed) return null;
        return (
          <Card key={b.id}>
            <GameIcon icon={b.managerIcon ?? t.icons.manager} size={52} />
            <Title sub={`Runs ${b.name} automatically, even while you're away.`}>{b.managerName ?? `${b.name} Manager`}</Title>
            {s.managed ? (
              <Text style={{ color: t.c.success, fontWeight: '800' }}>Hired ✓</Text>
            ) : (
              <Button
                label="Hire"
                sublabel={formatMoney(E.managerCost(cfg, game.activeVenue, b.id), t.strings.currencySymbol)}
                disabled={game.cash < E.managerCost(cfg, game.activeVenue, b.id)}
                onPress={() => hire(b.id)}
              />
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

export function UpgradesPanel() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const game = useGame((s) => s.game);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const pending = cfg.upgrades.filter((u) => !game.upgrades.includes(u.id)).sort((a, b) => Number(a.premium) - Number(b.premium) || a.cost - b.cost);
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {pending.length === 0 ? <Text style={[styles.empty, { color: t.c.textMuted }]}>All {t.strings.upgradeTab.toLowerCase()} unlocked!</Text> : null}
      {pending.map((u) => {
        const target = u.target === 'all' ? 'everything' : cfg.businesses.find((b) => b.id === u.target)?.name;
        const affordable = u.premium ? game.gems >= u.cost : game.cash >= u.cost;
        return (
          <Card key={u.id} highlight={u.premium}>
            <GameIcon icon={u.icon ?? '⬆️'} size={46} />
            <Title sub={`${target} profits ×${u.revenueMult}${u.premium ? ' · kept forever' : ''}`}>{u.name}</Title>
            <Button
              variant={u.premium ? 'accent' : 'primary'}
              label="Buy"
              sublabel={u.premium ? `${t.strings.gemIcon} ${formatNumber(u.cost)}` : formatMoney(u.cost, t.strings.currencySymbol)}
              disabled={!affordable}
              onPress={() => buyUpgrade(u.id)}
            />
          </Card>
        );
      })}
    </ScrollView>
  );
}

export function PrestigePanel() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const game = useGame((s) => s.game);
  const prestige = useGame((s) => s.prestige);
  const gain = E.prestigePointsAvailable(cfg, game);
  const bonusNow = game.prestigePoints * cfg.economy.prestige.bonusPerPoint * 100;
  const bonusAfter = (game.prestigePoints + gain) * cfg.economy.prestige.bonusPerPoint * 100;
  const confirm = () =>
    Alert.alert(`${t.strings.prestigeVerb}?`, `You'll restart with ${gain} ${t.strings.prestigeName} (+${bonusAfter.toFixed(0)}% profits).`, [
      { text: 'Not yet', style: 'cancel' },
      { text: t.strings.prestigeVerb, style: 'destructive', onPress: prestige },
    ]);
  return (
    <ScrollView contentContainerStyle={[styles.list, { alignItems: 'center', paddingHorizontal: 24 }]}>
      <GameIcon icon={t.strings.prestigeIcon} size={72} />
      <Text style={[styles.big, t.display, { color: t.c.text }]}>{formatNumber(game.prestigePoints)} {t.strings.prestigeName}</Text>
      <Text style={[styles.sub, { color: t.c.textMuted, textAlign: 'center' }]}>Currently +{bonusNow.toFixed(0)}% to all profits</Text>
      <Text style={[styles.body, { color: t.c.text }]}>{t.strings.prestigeDescription}</Text>
      <Button
        variant="accent"
        disabled={gain <= 0}
        onPress={confirm}
        label={gain > 0 ? `${t.strings.prestigeVerb} for +${formatNumber(gain)} ${t.strings.prestigeIcon}` : `Earn more to ${t.strings.prestigeVerb.toLowerCase()}`}
        style={{ alignSelf: 'stretch', marginTop: 16 }}
      />
      <Text style={[styles.sub, { color: t.c.textMuted, marginTop: 8 }]}>
        Lifetime earnings: {formatMoney(game.lifetimeEarnings, t.strings.currencySymbol)}
      </Text>
    </ScrollView>
  );
}

export function ShopPanel() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const game = useGame((s) => s.game);
  const purchase = useGame((s) => s.purchase);
  const restore = useGame((s) => s.restorePurchases);
  const claimDaily = useGame((s) => s.claimDaily);
  const gemTimeWarp = useGame((s) => s.gemTimeWarp);
  const reset = useGame((s) => s.reset);
  const now = Date.now();
  const daily = E.dailyReward(cfg, game, now);
  const canDaily = E.canClaimDaily(game, now);
  const warpValue = E.incomePerSecond(cfg, game, now) * cfg.economy.timeWarp.hours * 3600;

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Card highlight={canDaily}>
        <GameIcon icon={t.icons.gift} size={46} />
        <Title sub={canDaily ? `Day ${daily.streak} streak: ${daily.gems} ${t.strings.gemName}` : `Come back tomorrow · ${game.daily.streak}-day streak`}>Daily Gift</Title>
        <Button variant="success" label={canDaily ? 'Claim' : 'Claimed'} disabled={!canDaily} onPress={claimDaily} />
      </Card>
      <Card>
        <GameIcon icon={t.icons.timeWarp} size={46} />
        <Title sub={`Instantly earn ${formatMoney(warpValue, t.strings.currencySymbol)} (${formatDuration(cfg.economy.timeWarp.hours * 3600)} of income)`}>Time Warp</Title>
        <Button
          variant="accent"
          label="Warp"
          sublabel={`${t.strings.gemIcon} ${cfg.economy.timeWarp.gemCost}`}
          disabled={game.gems < cfg.economy.timeWarp.gemCost || warpValue <= 0}
          onPress={gemTimeWarp}
        />
      </Card>

      <Text style={[styles.section, { color: t.c.textMuted }]}>SHOP</Text>
      {cfg.monetization.iap.products.map((p) => {
        const owned = productOwned(game, p);
        return (
          <Card key={p.id} highlight={p.highlight}>
            <GameIcon icon={p.icon ?? (p.kind === 'noAds' ? '🚫' : p.kind === 'multiplier' ? '🚀' : p.kind === 'timeWarp' ? t.icons.timeWarp : p.kind === 'starterPack' ? '🎉' : t.strings.gemIcon)} size={46} />
            <Title sub={p.description ?? (p.kind === 'gems' ? `${p.value} ${t.strings.gemName}` : undefined)}>{p.title}</Title>
            <Button variant={p.highlight ? 'accent' : 'primary'} label={owned ? 'Owned' : iap.price(p)} disabled={owned} onPress={() => purchase(p)} />
          </Card>
        );
      })}

      <View style={styles.footer}>
        <Button
          variant="ghost"
          label="Restore purchases"
          onPress={async () => {
            const n = await restore();
            Alert.alert('Restore purchases', n > 0 ? `Restored ${n} item(s).` : 'Nothing to restore.');
          }}
        />
        {ads.available ? <Button variant="ghost" label="Privacy settings" onPress={() => ads.showPrivacyOptions()} /> : null}
        {__DEV__ ? <Button variant="ghost" label="DEV: reset save" onPress={reset} /> : null}
        {!iap.live ? (
          <Text style={[styles.sub, { color: t.c.textMuted, textAlign: 'center', marginTop: 8 }]}>
            Purchases are simulated (no RevenueCat key or native module).
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 10, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 12, marginBottom: 8 },
  title: { fontSize: 17 },
  sub: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  big: { fontSize: 28, marginTop: 8 },
  body: { fontSize: 14, textAlign: 'center', marginTop: 14, lineHeight: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontWeight: '700' },
  section: { fontWeight: '900', fontSize: 12, letterSpacing: 1.5, marginHorizontal: 16, marginTop: 12, marginBottom: 6 },
  toggle: { flexDirection: 'row', gap: 6, marginHorizontal: 12, marginBottom: 8 },
  footer: { marginHorizontal: 12, marginTop: 12, gap: 8 },
});

