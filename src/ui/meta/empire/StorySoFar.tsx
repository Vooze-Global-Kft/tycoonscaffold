/**
 * "Your story so far": a few lifetime numbers that only grow, so the long game has a visible past
 * as well as a road ahead. Sampled once a second; tiles that mean nothing in this game (guests in a
 * classic game, chests when there are none) are left out.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { formatMoney, formatNumber } from '../../../engine/format';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { SectionTitle } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { usePaced } from './paced';

interface Stats {
  lifetime: number;
  served: number;
  chests: number;
  resets: number;
  since: number;
}

function sameStats(a: Stats, b: Stats) {
  return formatNumber(a.lifetime) === formatNumber(b.lifetime) && Math.floor(a.served) === Math.floor(b.served) && a.chests === b.chests && a.resets === b.resets;
}

export function StorySoFar() {
  const t = useTheme();
  const cfg = useGame(useShallow((s) => ({ sim: s.cfg.sim ?? null, chestIcon: s.cfg.meta.chests[0]?.icon ?? null, currencyIcon: s.cfg.strings.currencyIcon })));
  const st = usePaced(
    (s): Stats => ({
      lifetime: s.game.lifetimeEarnings,
      served: s.game.stats.served,
      chests: s.game.stats.chestsOpened,
      resets: s.game.prestigeCount,
      since: s.game.stats.firstOpenAt,
    }),
    1000,
    sameStats,
  );
  const days = st.since > 0 ? Math.max(1, Math.ceil((Date.now() - st.since) / 86_400_000)) : 1;
  const tiles: { icon: string; value: string; label: string }[] = [
    { icon: cfg.currencyIcon, value: formatMoney(st.lifetime, t.strings.currencySymbol), label: 'earned in total' },
  ];
  if (cfg.sim) tiles.push({ icon: cfg.sim.sales.icon, value: formatNumber(Math.floor(st.served)), label: 'guests served' });
  if (cfg.chestIcon) tiles.push({ icon: cfg.chestIcon, value: formatNumber(st.chests), label: 'chests opened' });
  tiles.push({ icon: t.strings.prestigeIcon, value: formatNumber(st.resets), label: `${t.strings.prestigeVerb.toLowerCase()} done` });

  return (
    <View>
      <SectionTitle right={<Text style={{ color: t.c.textMuted, fontSize: 12, fontWeight: '700' }}>day {days}</Text>}>YOUR STORY SO FAR</SectionTitle>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.cell}>
          <View style={[styles.tile, { backgroundColor: t.c.surface, borderRadius: t.radius }]}>
            <View style={[styles.iconWrap, { backgroundColor: alpha(t.c.accent, 0.15) }]}>
              <GameIcon icon={tile.icon} size={24} />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[t.display, styles.value, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {tile.value}
              </Text>
              <Text style={[styles.label, { color: t.c.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {tile.label}
              </Text>
            </View>
          </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell: { width: '50%', padding: 4 },
  tile: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 17 },
  label: { fontSize: 11, fontWeight: '700' },
});
