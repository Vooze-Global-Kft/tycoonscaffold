import { StyleSheet, Text, View } from 'react-native';
import type { GameConfig, Reward } from '../../config/schema';
import { formatDuration, formatMoney, formatNumber } from '../../engine/format';
import type { GrantedReward } from '../../engine/meta';
import { GameIcon } from '../components/GameIcon';
import { useGame } from '../../state/store';
import { useTheme } from '../theme';

/** Icon and one-line label for something the player can receive or has received. */
export interface RewardInfo {
  icon: string;
  label: string;
}

/**
 * Describes a reward before it is granted (what an offer or mission promises). Always concrete:
 * named cards and exact amounts, so the player knows what they get.
 */
export function describeReward(cfg: GameConfig, r: Reward): RewardInfo {
  switch (r.type) {
    case 'gems':
      return { icon: cfg.strings.gemIcon, label: `${formatNumber(r.amount)} ${cfg.strings.gemName}` };
    case 'cash':
      return { icon: cfg.strings.currencyIcon, label: `${formatDuration(r.seconds)} of income` };
    case 'chest': {
      const chest = cfg.meta.chests.find((c) => c.id === r.chestId);
      return { icon: chest?.icon ?? '🎁', label: `${chest?.name ?? 'Chest'}${r.count > 1 ? ` ×${r.count}` : ''}` };
    }
    case 'card': {
      const card = cfg.meta.cards.find((c) => c.id === r.cardId);
      return { icon: card?.icon ?? '🃏', label: `${card?.name ?? 'Card'} ×${r.copies}` };
    }
    case 'randomCard':
      return { icon: '🃏', label: `Random ${r.rarity} card ×${r.copies}` };
    case 'noAds':
      return { icon: '🚫', label: 'No ads' };
    case 'multiplier':
      return { icon: '🚀', label: `×${r.value} profits forever` };
  }
}

/** Describes a reward after it was granted (random cards are named, cash is an amount). */
export function describeGranted(cfg: GameConfig, g: GrantedReward): RewardInfo {
  switch (g.type) {
    case 'gems':
      return { icon: cfg.strings.gemIcon, label: `+${formatNumber(g.amount)} ${cfg.strings.gemName}` };
    case 'cash':
      return { icon: cfg.strings.currencyIcon, label: `+${formatMoney(g.amount, cfg.strings.currencySymbol)}` };
    case 'chest': {
      const chest = cfg.meta.chests.find((c) => c.id === g.chestId);
      return { icon: chest?.icon ?? '🎁', label: `${chest?.name ?? 'Chest'}${g.count > 1 ? ` ×${g.count}` : ''}` };
    }
    case 'card': {
      const card = cfg.meta.cards.find((c) => c.id === g.cardId);
      return { icon: card?.icon ?? '🃏', label: `${card?.name ?? 'Card'} ×${g.copies}` };
    }
    case 'noAds':
      return { icon: '🚫', label: 'No ads' };
    case 'multiplier':
      return { icon: '🚀', label: `×${g.value} profits forever` };
  }
}

/** A wrapped row of reward chips: what an offer contains or a mission pays. */
export function RewardList({ rewards, size = 22 }: { rewards: Reward[]; size?: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  return (
    <View style={styles.list}>
      {rewards.map((r, i) => {
        const info = describeReward(cfg, r);
        return (
          <View key={i} style={styles.chip}>
            <GameIcon icon={info.icon} size={size} />
            <Text style={[styles.label, { color: t.c.text, fontSize: Math.max(11, size * 0.55) }]} numberOfLines={1}>
              {info.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontWeight: '700' },
});
