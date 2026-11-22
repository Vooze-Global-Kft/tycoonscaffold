/**
 * The drop-rate dialog (store modal { type: 'chestOdds', chestId }). Store rules require the odds of
 * every kind of item before a chest is earned by ad or bought, and players deserve them anyway, so
 * this is written to be read by a 13-year-old and checked by a regulator: every number comes from
 * the engine functions the roll itself uses (chestSlotOdds, chestCardOdds, chestRules), and the
 * rules that can raise a result (guarantee, bad-luck protection) are stated in plain sentences.
 */
import { StyleSheet, Text, View } from 'react-native';
import { RARITIES, type Chest, type GameConfig, type Rarity } from '../../../config/schema';
import { formatDuration } from '../../../engine/format';
import * as M from '../../../engine/meta';
import type { GameState } from '../../../engine/types';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { Sheet } from '../../kit';
import { RARITY_COLORS, RARITY_NAMES, alpha, useTheme } from '../../theme';

/** A percentage people can read: one decimal from 10 %, two below, and never a bare 0 for a real chance. */
export function formatOdds(p: number): string {
  if (!(p > 0)) return '0 %';
  if (p < 0.01) return '< 0.01 %';
  const d = p >= 10 ? 1 : 2;
  return `${Number(p.toFixed(d))} %`;
}

function range([a, b]: [number, number] | readonly number[], unit = ''): string {
  return a === b ? `${a}${unit}` : `${a} to ${b}${unit}`;
}

export function ChestOddsSheet() {
  const modal = useGame((s) => s.modal);
  const close = useGame((s) => s.closeModal);
  const cfg = useGame((s) => s.cfg);
  if (modal?.type !== 'chestOdds') return null;
  const chest = cfg.meta.chests.find((c) => c.id === modal.chestId);
  return (
    <Sheet visible onClose={close} title="Drop rates" icon={chest?.icon} footer={<Button label="Got it" onPress={close} />}>
      {chest ? <OddsBody cfg={cfg} chest={chest} /> : <Text>This chest is not in the game any more.</Text>}
    </Sheet>
  );
}

/** Rarity rules counters change when chests open; this small selector keeps the dialog live without re-rendering 10 times a second. */
function usePity() {
  return useGame((s) => `${s.game.chests.sinceEpic ?? 0}|${s.game.chests.sinceLegendary ?? 0}|${s.game.stats.venuesEver ?? 1}`);
}

function OddsBody({ cfg, chest }: { cfg: GameConfig; chest: Chest }) {
  const t = useTheme();
  const pityKey = usePity();
  const game = useGame.getState().game;
  void pityKey;
  const slot = M.chestSlotOdds(cfg, chest.id);
  const cardOdds = M.chestCardOdds(cfg, chest.id);
  const rules = M.chestRules(cfg, game, chest.id);
  const cardsPossible = slot.card > 0;
  const mult = rules?.copiesMultiplier ?? 1;
  const muted = { color: t.c.textMuted };
  const text = { color: t.c.text };

  const kinds: { icon: string; label: string; p: number; detail: string }[] = [];
  if (slot.card > 0) kinds.push({ icon: '🃏', label: 'Staff card', p: slot.card, detail: 'Rarity chances below' });
  if (slot.gems > 0) kinds.push({ icon: cfg.strings.gemIcon, label: cfg.strings.gemName, p: slot.gems, detail: `${range(chest.gems)} ${cfg.strings.gemName}` });
  if (slot.cash > 0)
    kinds.push({
      icon: cfg.strings.currencyIcon,
      label: cfg.strings.currencyName,
      p: slot.cash,
      detail: `${formatDuration(chest.cashSeconds[0])} to ${formatDuration(chest.cashSeconds[1])} of your income`,
    });

  return (
    <View style={styles.body}>
      <View style={[styles.intro, { backgroundColor: alpha(t.c.primary, 0.08), borderRadius: t.radius * 0.7 }]}>
        <Text style={[styles.chestName, t.display, text]} numberOfLines={1} adjustsFontSizeToFit>
          {chest.name}
        </Text>
        <Text style={[styles.p, text]}>
          {`Holds ${chest.slots} ${chest.slots === 1 ? 'item' : 'items'}. Each item is picked on its own with these chances:`}
        </Text>
      </View>

      <Section title="EACH ITEM IS">
        {kinds.map((k) => (
          <Row key={k.label} icon={k.icon} label={k.label} sub={k.detail} value={formatOdds(k.p)} />
        ))}
      </Section>

      {cardsPossible ? (
        <Section title="IF THE ITEM IS A CARD">
          {RARITIES.map((r) => {
            const odds = cardOdds.find((o) => o.rarity === r)?.percent ?? 0;
            const cards = cfg.meta.cards.filter((c) => c.rarity === r);
            if (cards.length === 0) return null;
            const copies = chest.cardCopies[r];
            const lo = Math.max(1, Math.round(copies[0] * mult));
            const hi = Math.max(1, Math.round(copies[1] * mult));
            return (
              <View key={r} style={[styles.rarity, { borderLeftColor: RARITY_COLORS[r] }]}>
                <View style={styles.rarityHead}>
                  <Text style={[styles.rarityName, t.display, { color: RARITY_COLORS[r] }]}>{RARITY_NAMES[r]}</Text>
                  <Text style={[styles.value, t.display, text]}>{formatOdds(odds)}</Text>
                </View>
                <Text style={[styles.small, muted]}>
                  {`${range([lo, hi])} ${hi === 1 ? 'copy' : 'copies'} of one of: ${cards.map((c) => c.name).join(', ')}`}
                </Text>
                {cards.length > 1 && odds > 0 ? (
                  <Text style={[styles.small, muted]}>{`Each of these ${cards.length} is equally likely: ${formatOdds(odds / cards.length)} each.`}</Text>
                ) : null}
              </View>
            );
          })}
        </Section>
      ) : null}

      <Section title="RULES">
        {rules ? <RuleLines cfg={cfg} chest={chest} rules={rules} game={game} /> : null}
        <Bullet>Everyone gets the same chances. They never change based on how much you play or pay.</Bullet>
        <Bullet>Percentages are rounded. The guarantee and the protection can only make a result better, never worse.</Bullet>
        {!cfg.meta.chestsForSale ? <Bullet strong>Chests in this game are earned by playing and cannot be bought.</Bullet> : null}
      </Section>
    </View>
  );
}

function RuleLines({ cfg, chest, rules, game }: { cfg: GameConfig; chest: Chest; rules: M.ChestRules; game: GameState }) {
  const lines: { text: string; strong?: boolean }[] = [];
  if (rules.guaranteed) lines.push({ text: `Every ${chest.name} has at least one ${RARITY_NAMES[rules.guaranteed]} card or better.`, strong: true });
  const protect = (name: Rarity, within: number | null, since: number) => {
    if (within === null) return;
    lines.push({
      text: `Bad-luck protection: if ${within - 1} chests with cards in a row bring no ${RARITY_NAMES[name]} card (or better), the next one always has one. Your count right now: ${Math.min(since, within - 1)} of ${within - 1}.`,
    });
  };
  protect('epic', rules.epicWithin, game.chests.sinceEpic ?? 0);
  protect('legendary', rules.legendaryWithin, game.chests.sinceLegendary ?? 0);
  const growth = cfg.meta.chestGrowthPerVenue;
  if (growth > 0) {
    const pct = Math.round(growth * 100);
    lines.push({
      text:
        rules.copiesMultiplier > 1
          ? `Card copies are ×${Number(rules.copiesMultiplier.toFixed(2))} for you (the amounts above include it): +${pct} % for each place you have ever opened after the first.`
          : `Card copies grow by +${pct} % for each new place you open (now ×1).`,
    });
  }
  return (
    <>
      {lines.map((l, i) => (
        <Bullet key={i} strong={l.strong}>
          {l.text}
        </Bullet>
      ))}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: t.c.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ icon, label, sub, value }: { icon: string; label: string; sub?: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <GameIcon icon={icon} size={26} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, t.display, { color: t.c.text }]} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.small, { color: t.c.textMuted }]} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.value, t.display, { color: t.c.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Bullet({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  const t = useTheme();
  return (
    <View style={styles.bullet}>
      <Text style={[styles.p, { color: t.c.textMuted }]}>•</Text>
      <Text style={[styles.p, { color: t.c.text, flex: 1 }, strong && { fontWeight: '800' }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  intro: { padding: 10, gap: 4 },
  chestName: { fontSize: 18 },
  p: { fontSize: 14, lineHeight: 19 },
  small: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  section: { gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  rowLabel: { fontSize: 15 },
  value: { fontSize: 16, minWidth: 64, textAlign: 'right' },
  rarity: { borderLeftWidth: 4, paddingLeft: 10, paddingVertical: 4, gap: 2 },
  rarityHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rarityName: { fontSize: 15 },
  bullet: { flexDirection: 'row', gap: 6 },
});
