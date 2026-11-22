/**
 * The drop-rate dialog (store modal { type: 'chestOdds', chestId }). Store rules require the odds of
 * every kind of item before a chest is earned by ad or bought, and players deserve them anyway, so
 * this is written to be read by a 13-year-old and checked by a regulator: every number comes from
 * the engine's exact facts (M.chestOddsFacts, tested against the roll itself), and the
 * rules that can raise a result (guarantee, bad-luck protection) are stated in plain sentences.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RARITIES, type Chest, type GameConfig, type Rarity } from '../../../config/schema';
import * as M from '../../../engine/meta';
import type { GameState } from '../../../engine/types';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { Sheet, shortDuration } from '../../kit';
import { RARITY_COLORS, RARITY_NAMES, alpha, inkOf, useTheme } from '../../theme';

/** Percentages as the engine words them: one decimal, never a real chance shown as 0. */
export function formatOdds(p: number): string {
  return M.formatOddsPercent(p);
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
  // The exact facts (guarantee and protection included) are the source of every number here.
  const facts = useMemo(() => M.chestOddsFacts(cfg, chest.id, useGame.getState().game), [cfg, chest.id, pityKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!facts) return null;
  const game = useGame.getState().game;
  const slot = facts.slotOdds;
  const cardsPossible = slot.card > 0;
  const mult = facts.copiesMultiplier;
  const muted = { color: t.c.textMuted };
  const text = { color: t.c.text };
  const rules: M.ChestRules = { guaranteed: facts.guaranteed, epicWithin: facts.epicWithin, legendaryWithin: facts.legendaryWithin, copiesMultiplier: mult };
  const has = (r: Rarity) => cfg.meta.cards.some((c) => c.rarity === r);

  const kinds: { icon: string; label: string; p: number; detail: string }[] = [];
  if (slot.card > 0) kinds.push({ icon: '🃏', label: 'Staff card', p: slot.card, detail: `About ${Number(facts.cardsPerChest.toFixed(1))} cards per chest` });
  if (slot.gems > 0) kinds.push({ icon: cfg.strings.gemIcon, label: cfg.strings.gemName, p: slot.gems, detail: `${range(chest.gems)} ${cfg.strings.gemName}` });
  if (slot.cash > 0)
    kinds.push({
      icon: cfg.strings.currencyIcon,
      label: cfg.strings.currencyName,
      p: slot.cash,
      detail: `${shortDuration(chest.cashSeconds[0])} to ${shortDuration(chest.cashSeconds[1])} of your income`,
    });

  const chestLine = (f: M.ChestRarityFact) =>
    f.rarity === 'common' ? 'Any card' : f.rarity === 'legendary' || !RARITIES.slice(RARITIES.indexOf(f.rarity) + 1).some(has) ? RARITY_NAMES[f.rarity] : `${RARITY_NAMES[f.rarity]} or better`;

  return (
    <View style={styles.body}>
      <View style={[styles.intro, { backgroundColor: alpha(t.c.primary, 0.08), borderRadius: t.radius * 0.7 }]}>
        <Text style={[styles.chestName, t.display, text]} numberOfLines={1} adjustsFontSizeToFit>
          {chest.name}
        </Text>
        <Text style={[styles.p, text]}>
          {`Holds ${facts.slots} ${facts.slots === 1 ? 'item' : 'items'}. Each item is picked on its own with these chances:`}
        </Text>
      </View>

      <Section title="EACH ITEM IS">
        {kinds.map((k) => (
          <Row key={k.label} icon={k.icon} label={k.label} sub={k.detail} value={formatOdds(k.p)} />
        ))}
      </Section>

      {cardsPossible ? (
        <Section title="EACH CARD IS">
          {facts.guaranteed ? <Text style={[styles.small, muted]}>These shares include the guaranteed card.</Text> : null}
          {RARITIES.map((r) => {
            const odds = facts.perCard.find((o) => o.rarity === r)?.percent ?? 0;
            const cards = cfg.meta.cards.filter((c) => c.rarity === r);
            if (cards.length === 0) return null;
            const copies = chest.cardCopies[r];
            const lo = Math.max(1, Math.round(copies[0] * mult));
            const hi = Math.max(1, Math.round(copies[1] * mult));
            return (
              <View key={r} style={[styles.rarity, { borderLeftColor: RARITY_COLORS[r] }]}>
                <View style={styles.rarityHead}>
                  <Text style={[styles.rarityName, t.display, { color: inkOf(RARITY_COLORS[r], t.c.surface) }]}>{RARITY_NAMES[r]}</Text>
                  <Text style={[styles.value, t.display, text]}>{formatOdds(odds)}</Text>
                </View>
                <Text style={[styles.small, muted]}>
                  {`${range([lo, hi])} ${hi === 1 ? 'copy' : 'copies'} of one of: ${cards.map((c) => c.name).join(', ')}`}
                </Text>
                {cards.length > 1 && odds > 0 ? (
                  <Text style={[styles.small, muted]}>{`Each of these ${cards.length} is equally likely: ${formatOdds(odds / cards.length)} of cards each.`}</Text>
                ) : null}
              </View>
            );
          })}
        </Section>
      ) : null}

      {cardsPossible ? (
        <Section title="IN ONE CHEST">
          {facts.perChest.filter((f) => has(f.rarity)).map((f) => (
            <Row key={f.rarity} icon="🎁" label={chestLine(f)} sub="chance a chest holds at least one" value={formatOdds(f.atLeastPercent)} />
          ))}
          {facts.longRun ? (
            <Text style={[styles.small, muted]}>
              {`With bad-luck protection, over many chests: ${facts.longRun
                .filter((f) => (f.rarity === 'epic' && facts.epicWithin !== null) || (f.rarity === 'legendary' && facts.legendaryWithin !== null))
                .map((f) => `${chestLine(f)} in ${formatOdds(f.atLeastPercent)} of chests`)
                .join(', ')}.`}
            </Text>
          ) : null}
          {facts.nextChest ? (
            <Text style={[styles.small, text]}>
              {`Your next ${chest.name}: ${facts.nextChest
                .filter((f) => (f.rarity === 'epic' && facts.epicWithin !== null) || (f.rarity === 'legendary' && facts.legendaryWithin !== null))
                .map((f) => `${chestLine(f)} ${formatOdds(f.atLeastPercent)}`)
                .join(', ')}.`}
            </Text>
          ) : null}
        </Section>
      ) : null}

      <Section title="RULES">
        <RuleLines cfg={cfg} chest={chest} rules={rules} game={game} />
        <Bullet>{fairnessLine(cfg, rules)}</Bullet>
        <Bullet>Percentages are rounded. The guarantee and the protection can only make a result better, never worse.</Bullet>
        {!cfg.meta.chestsForSale ? <Bullet strong>Chests in this game are earned by playing and cannot be bought.</Bullet> : null}
      </Section>
    </View>
  );
}

/** The fairness promise, true to the rules this chest really has (they are listed just above). */
function fairnessLine(cfg: GameConfig, rules: M.ChestRules): string {
  const personal: string[] = [];
  if (cfg.meta.chestGrowthPerVenue > 0) personal.push('copies grow as you open places');
  if (rules.epicWithin !== null || rules.legendaryWithin !== null) personal.push('bad-luck protection');
  const base = 'The drop rates are the same for everyone and never depend on spending.';
  if (personal.length === 0) return base;
  return `${base} Only the ${personal.length === 1 ? 'rule' : 'two rules'} above change your results: ${personal.join(', and ')}.`;
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
