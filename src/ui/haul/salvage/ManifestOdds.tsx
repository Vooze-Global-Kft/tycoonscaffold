/**
 * Manifest odds (spec 4.6, 5.2): the exact numbers of `chestOddsFacts` (unchanged), laid out as a
 * cargo manifest: one column per pod kind, rows for what a slot holds, the rarity of each part and
 * the chance of at least one of a rarity per pod, then the protection rule in words. Opens in place
 * under the counters (no dialog). Rarities the game has no module of are left out.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as M from '../../../engine/meta';
import type * as H from '../../../engine/haul';
import type { GameState } from '../../../engine/types';
import { RARITY_NAMES } from '../../theme';
import { HaulIcon } from '../art/HaulIcon';
import { RARITY } from '../art/palette';
import { useHaul } from '../spokes/spokeData';
import { Bracket, INK, Mono } from '../spokes/spokeKit';
import { SPOKE_STRINGS as S, words } from '../spokes/spokeStrings';

type Facts = NonNullable<ReturnType<typeof M.chestOddsFacts>>;

const LABEL_W = 116;

export function ManifestOdds({ cfg }: { cfg: H.HaulConfig }) {
  const pods = [cfg.haul.pods.scrap, cfg.haul.pods.derelict].filter((id, i, a) => a.indexOf(id) === i);
  const facts = useHaul(
    (c, g) => pods.map((id) => M.chestOddsFacts(c, id, g as unknown as GameState)).filter((f): f is Facts => !!f),
    [] as Facts[],
  );
  if (facts.length === 0) return null;
  const rarities = (['common', 'rare', 'epic', 'legendary'] as const).filter((r) => cfg.meta.cards.some((c) => c.rarity === r));
  const name = (id: string) => cfg.meta.chests.find((c) => c.id === id)?.name ?? id;
  const icon = (id: string) => cfg.meta.chests.find((c) => c.id === id)?.icon ?? '';
  const kinds = (['card', 'gems', 'cash'] as const).filter((k) => facts.some((f) => f.slotOdds[k] > 0));
  const color = (r: string) => (RARITY as Record<string, string>)[r] ?? INK.text;
  const row = (label: string, values: string[], tint?: string) => (
    <View style={styles.row} key={label}>
      <Mono size={10} color={tint ?? INK.dim} style={{ width: LABEL_W }} caps={false} lines={1}>
        {label}
      </Mono>
      {values.map((v, i) => (
        <Mono key={i} size={11} weight="700" color={INK.text} style={styles.cell}>
          {v}
        </Mono>
      ))}
    </View>
  );
  const pity = facts.find((f) => f.epicWithin !== null);
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <Bracket label={S.oddsTitle} color={INK.lineDim}>
        <View style={styles.row}>
          <View style={{ width: LABEL_W }} />
          {facts.map((f) => (
            <View key={f.chestId} style={[styles.cell, styles.head]}>
              <HaulIcon name={icon(f.chestId)} size={26} />
              <Mono size={9} weight="700" color={INK.text} center lines={2}>
                {name(f.chestId)}
              </Mono>
            </View>
          ))}
        </View>
        <View style={styles.sep} />
        {row(S.oddsSlotsLabel, facts.map((f) => String(f.slots)))}
        {kinds.map((k) => row(words(cfg, S.oddsKinds[k]), facts.map((f) => M.formatOddsPercent(f.slotOdds[k]))))}
        <View style={styles.sep} />
        <Mono size={9} color={INK.lineDim} weight="700" style={styles.sub}>
          {S.oddsPerPart}
        </Mono>
        {rarities.map((r) => row(RARITY_NAMES[r], facts.map((f) => M.formatOddsPercent(f.perCard.find((p) => p.rarity === r)?.percent ?? 0)), color(r)))}
        <View style={styles.sep} />
        <Mono size={9} color={INK.lineDim} weight="700" style={styles.sub}>
          {words(cfg, S.oddsPerPod)}
        </Mono>
        {rarities.slice(1).map((r, i, list) =>
          row(i === list.length - 1 ? RARITY_NAMES[r] : words(cfg, S.oddsRarePlus, { r: RARITY_NAMES[r] }), facts.map((f) => M.formatOddsPercent(f.perChest.find((p) => p.rarity === r)?.atLeastPercent ?? 0)), color(r)),
        )}
        {pity ? (
          <Mono size={10} color={INK.dim} caps={false} style={{ marginTop: 8 }}>
            {words(cfg, S.oddsPity, { r: RARITY_NAMES.epic, n: pity.epicWithin ?? 0 })}
          </Mono>
        ) : null}
        {facts.map((f) => {
          const lr = f.longRun?.find((x) => x.rarity === 'epic');
          const nx = f.nextChest?.find((x) => x.rarity === 'epic');
          const base = f.perChest.find((x) => x.rarity === 'epic');
          return lr ? (
            <Mono key={f.chestId} size={10} color={INK.dim} caps={false} style={{ marginTop: 4 }}>
              {`${name(f.chestId)}: ${words(cfg, S.oddsLongRun, { r: RARITY_NAMES.epic, v: M.formatOddsPercent(lr.atLeastPercent) })}${nx && base && Math.abs(nx.atLeastPercent - base.atLeastPercent) > 1e-9 ? ` · ${words(cfg, S.oddsNext, { r: RARITY_NAMES.epic, v: M.formatOddsPercent(nx.atLeastPercent) })}` : ''}`}
            </Mono>
          ) : null;
        })}
        <Mono size={10} color={INK.green} caps={false} style={{ marginTop: 8 }}>
          {S.oddsEarned}
        </Mono>
      </Bracket>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  cell: { flex: 1, textAlign: 'right' },
  head: { alignItems: 'flex-end', gap: 2 },
  sep: { height: 1, backgroundColor: INK.edge, marginVertical: 5 },
  sub: { letterSpacing: 1.4, marginBottom: 2 },
});
