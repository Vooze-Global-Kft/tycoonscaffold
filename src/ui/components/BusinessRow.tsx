import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Business } from '../../config/schema';
import * as E from '../../engine/economy';
import { formatDuration, formatMoney } from '../../engine/format';
import { useGame } from '../../state/store';
import { alpha, useTheme } from '../theme';
import { Button } from './Button';
import { GameIcon } from './GameIcon';

export const BusinessRow = memo(function BusinessRow({ b, index }: { b: Business; index: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const game = useGame((s) => s.game);
  const buyAmount = useGame((s) => s.buyAmount);
  const buy = useGame((s) => s.buy);
  const start = useGame((s) => s.startBusiness);
  const s = game.businesses[b.id];
  const now = Date.now();
  const sym = t.strings.currencySymbol;

  // Hide businesses two or more steps ahead of what the player owns, to keep a sense of discovery.
  const prevOwned = index === 0 || game.businesses[cfg.businesses[index - 1].id].owned > 0;
  if (!prevOwned && s.owned === 0) {
    const prev2 = index >= 2 && game.businesses[cfg.businesses[index - 2].id].owned > 0;
    if (!prev2) return null;
  }

  const n = E.resolveBuyAmount(cfg, game, b.id, buyAmount);
  const cost = E.costFor(b, s.owned, n);
  const affordable = game.cash >= cost;
  const cycle = E.cycleSeconds(cfg, game, b.id);
  const revenue = E.revenuePerCycle(cfg, game, b.id, now);
  const next = E.nextMilestone(cfg, s.owned);
  const prevMilestone = [0, ...cfg.economy.milestones.map((m) => m.owned)].filter((o) => o <= s.owned).pop() ?? 0;
  const milestonePct = next ? (s.owned - prevMilestone) / (next - prevMilestone) : 1;
  // Very fast cycles look like a solid bar, which reads better than flicker.
  const progress = s.managed && cycle < 0.3 ? 1 : s.progress;

  if (s.owned === 0) {
    return (
      <View style={[styles.card, { backgroundColor: alpha(t.c.surface, 0.6), borderRadius: t.radius }]}>
        <GameIcon icon={b.icon} size={44} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.name, { color: t.c.text }]}>{b.name}</Text>
          {b.flavor ? <Text style={[styles.meta, { color: t.c.textMuted }]}>{b.flavor}</Text> : null}
        </View>
        <Button onPress={() => buy(b.id)} disabled={!affordable} label="Unlock" sublabel={formatMoney(cost, sym)} style={{ minWidth: 96 }} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: t.c.surface, borderRadius: t.radius }]}>
      <Pressable onPress={() => start(b.id)} style={styles.iconWrap}>
        <GameIcon icon={b.icon} size={48} />
        <View style={[styles.badge, { backgroundColor: t.c.primary }]}>
          <Text style={[styles.badgeText, { color: t.c.primaryText }]}>{s.owned}</Text>
        </View>
        {/* Milestone ring under the icon */}
        <View style={[styles.milestoneTrack, { backgroundColor: alpha(t.c.text, 0.1) }]}>
          <View style={{ width: `${milestonePct * 100}%`, height: '100%', backgroundColor: t.c.accent, borderRadius: 3 }} />
        </View>
      </Pressable>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={[styles.name, { color: t.c.text }]} numberOfLines={1}>{b.name}</Text>
        <Pressable onPress={() => start(b.id)} style={[styles.bar, { backgroundColor: alpha(t.c.text, 0.08), borderRadius: t.radius }]}>
          <View style={[styles.fill, { width: `${Math.min(1, progress) * 100}%`, backgroundColor: t.c.progress, borderRadius: t.radius }]} />
          <Text style={[styles.barText, { color: t.c.text }]} numberOfLines={1}>
            {formatMoney(revenue, sym)}
            {cycle < 1 && s.managed ? ` ×${(1 / cycle).toFixed(1)}/s` : ''}
          </Text>
        </Pressable>
        <Text style={[styles.meta, { color: t.c.textMuted }]} numberOfLines={1}>
          {s.managed ? '⚙️ Automated' : s.running ? 'Working…' : '👆 Tap to run'} · {formatDuration(cycle * (1 - s.progress))}
          {next ? ` · next boost at ${next}` : ''}
        </Text>
      </View>
      <Button onPress={() => buy(b.id)} disabled={!affordable} label={`Buy ×${n}`} sublabel={formatMoney(cost, sym)} style={{ minWidth: 96 }} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 10, marginHorizontal: 12, marginBottom: 8 },
  iconWrap: { width: 56, alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -2, borderRadius: 10, paddingHorizontal: 6, minWidth: 22, alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '900' },
  milestoneTrack: { width: 48, height: 5, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  name: { fontWeight: '800', fontSize: 15 },
  bar: { height: 26, marginTop: 4, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  barText: { fontWeight: '800', fontSize: 13, textAlign: 'center' },
  meta: { fontSize: 11, marginTop: 3, fontWeight: '600' },
});
