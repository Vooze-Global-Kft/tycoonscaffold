/**
 * The Contract Board sheet (spec 4.5, Decision 40): one row per buyer on the board, read like a
 * dispatch sheet. A contract is delivered over several launches: "Deliver 8.4K copper within 6
 * launches". Each row says, from the rules' `contractViews` (never computed here):
 *   emblem, buyer, the multiplier ("x1.8");
 *   each wanted ore: "8.4K COPPER" and what one launch carries of it now ("1.2K PER LAUNCH"), or
 *   for the taken one "3.7K / 8.4K COPPER" with a bar (delivered solid, aboard lighter);
 *   "IN 6 LAUNCHES" (an offer) or "4 LAUNCHES LEFT" ("LAST LAUNCH" in amber), the pace word
 *   ("ON PACE" / "NEEDS +32 % COPPER") and the fixed bonus "+₵19.4K WHEN MET", or "+₵19.4K X2 SHIFT"
 *   when the day shift would double it.
 * A tap takes an offer. Taking another while the taken one has progress asks once more ("Drops Kade
 * Refinery: 3.7K delivered. Tap again."); nothing else ever picks a contract for the player. The
 * figures use one short format (unitsShort, moneyShort) everywhere: the strip shows the same.
 * Footer: the Scrap Pod ladder as a stamp strip, "SCRAP POD · 6 MORE CONTRACTS" (Decision 60). A dropped
 * contract's place stays empty until the next warp-out: "NEW OFFER AFTER THE NEXT LAUNCH" (Decision 56). Row targets `contract:card<i>` (the second stage
 * of the board hint, errata 53).
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { alpha } from '../../theme';
import { HaulIcon } from '../art/HaulIcon';
import { runParams, useRunShallow } from '../useRun';
import { useBackLayer, useHaulUi } from '../uiState';
import { buyerName, moneyShort, oreColorOf, oreName, portraitOf, unitsShort } from './format';
import { HaulSheet, Line, MONO, useColors, useLast, useType } from './parts';
import { PodStamps } from './PodStamps';
import { say } from './shellText';

/** How long a "tap again to drop" question waits for the second tap. */
const CONFIRM_MS = 4000;

interface WantRow {
  ore: string;
  color: string;
  /** "8.4K COPPER" or, taken, "3.7K / 8.4K COPPER". */
  text: string;
  /** "1.2K PER LAUNCH" (what the routes carry now), or "NO COPPER ON A ROUTE". */
  pace: string;
  /** Delivered and aboard, as shares of the units (the taken one only). */
  got: number;
  aboard: number;
}
interface RowView {
  index: number;
  buyer: string;
  emblem: string;
  mult: string;
  wants: WantRow[];
  taken: boolean;
  /** "IN 6 LAUNCHES", "4 LAUNCHES LEFT", "LAST LAUNCH". */
  launches: string;
  last: boolean;
  onPace: boolean;
  paceWord: string;
  bonus: string;
  /** Units already delivered or aboard (a drop loses them), as text; '' when none. */
  progress: string;
  /** Some of it is aboard the freighter in flight (the question says so). */
  progressAboard: boolean;
}
interface BoardView {
  unlocked: boolean;
  unlockAt: number;
  rows: RowView[];
  /** Empty places on the board: a dropped contract's place stays empty until the next warp-out (Decision 56). */
  open: number;
  /** The Scrap Pod ladder, drawn as a stamp strip (Decision 60). */
  pods: { of: number; filled: number };
  footer: string;
}

function launchWord(n: number, taken: boolean): string {
  if (!taken) return n === 1 ? say('cardIn1') : say('cardIn', { n });
  return n <= 1 ? say('cardLast') : say('launchesLeft', { n });
}

function boardView(cfg: H.HaulConfig, g: H.HaulGame & { haul: H.HaulState }): BoardView {
  const h = g.haul;
  const p = runParams(cfg, g);
  const C = cfg.haul.contracts;
  const every = cfg.haul.pods.contractsEvery;
  const podName = cfg.meta.chests.find((x) => x.id === cfg.haul.pods.scrap)?.name ?? cfg.haul.names.pod;
  const views = H.contractViews(cfg, p, h, g.haulStats);
  const rows = views.map((v): RowView => {
    const taken = v.contract.taken;
    const wants = v.wants.map((w): WantRow => {
      const ore = oreName(cfg, w.ore).toUpperCase();
      return {
        ore: w.ore,
        color: oreColorOf(cfg, w.ore),
        text: taken ? say('cardProgress', { got: unitsShort(w.got), n: unitsShort(w.units), ore }) : say('cardWant', { n: unitsShort(w.units), ore }),
        pace: (w.perLaunch >= 1 ? say('cardPerLaunch', { n: unitsShort(w.perLaunch) }) : say('cardNoRoute', { ore })).toUpperCase(),
        got: w.units > 0 ? Math.min(1, w.got / w.units) : 0,
        aboard: w.units > 0 ? Math.min(1, w.aboard / w.units) : 0,
      };
    });
    const got = v.wants.reduce((s, w) => s + w.got, 0);
    const aboard = v.wants.reduce((s, w) => s + w.aboard, 0);
    const short = v.shortOre ? oreName(cfg, v.shortOre).toUpperCase() : '';
    // Decision 56: the raise the short ore needs, as a figure ("NEEDS +32 % COPPER"), from the view's
    // `raise` (the fraction still to gain over the routes' steady figure). Read loosely so the sheet
    // also builds against a rules version without the field (then "NEEDS MORE COPPER").
    const raise = (v.wants.find((w) => w.ore === v.shortOre) as { raise?: number } | undefined)?.raise;
    const paceWord = v.onPace ? say('paceOn') : typeof raise === 'number' && raise > 0 && Number.isFinite(raise) ? say('paceRaise', { p: Math.max(1, Math.round(raise * 100)), ore: short }) : say('paceShort', { ore: short });
    return {
      index: v.index,
      buyer: buyerName(cfg, v.contract.buyer),
      emblem: portraitOf(cfg, v.contract.buyer),
      mult: say('mult', { m: (Math.round((v.contract.mult + p.contractAdd) * 10) / 10).toFixed(1) }),
      wants,
      taken,
      // An offer reads as the deal it would be once taken ("IN 6 LAUNCHES"), not as its time left on the board.
      launches: launchWord(taken ? v.launchesLeft : v.launches, taken).toUpperCase(),
      last: taken && v.launchesLeft <= 1,
      onPace: v.onPace,
      paceWord: paceWord.toUpperCase(),
      // The day shift's double is part of the bonus figure ("+₵35 X2 SHIFT", Decision 59, the receipt's
      // "+₵35 x2"), not a tag beside the buyer: a long buyer name keeps its row (the lead's note).
      bonus: (v.shift ? say('cardBonusShift', { v: moneyShort(cfg, v.bonus), m: cfg.haul.shift.mult }) : say('cardBonus', { v: moneyShort(cfg, v.bonus) })).toUpperCase(),
      progress: taken && got + aboard >= 1 ? unitsShort(got + aboard) : '',
      progressAboard: aboard >= 1,
    };
  });
  // The taken contract leads the sheet; the offers follow in board order.
  rows.sort((a, b) => Number(b.taken) - Number(a.taken) || a.index - b.index);
  return {
    unlocked: h.contracts.unlocked,
    unlockAt: C.unlockLaunches,
    rows,
    open: h.contracts.unlocked ? Math.max(0, C.board - views.length) : 0,
    pods: { of: every, filled: every > 0 ? (g.stats.contractsMet ?? 0) % every : 0 },
    footer: (() => {
      const left = every > 0 ? every - ((g.stats.contractsMet ?? 0) % every) : 1;
      return left === 1 ? say('boardPodMore1', { pod: podName }) : say('boardPodMore', { pod: podName, n: left });
    })(),
  };
}

export function ContractBoardSheet() {
  const ty = useType();
  const c = useColors();
  const open = useHaulUi((s) => s.sheet?.type === 'contracts');
  const board = useRunShallow((cfg, g) => (open ? boardView(cfg, g) : null), null);
  const title = useRunShallow(
    (cfg) => ({
      t: say('boardTitle'),
      icon: portraitOf(cfg, cfg.haul.contracts.buyers[0]?.id ?? ''),
    }),
    { t: '', icon: '' },
  );
  const v = useLast(board);
  // The row waiting for its second tap (a drop that loses progress), and when it was asked.
  const [ask, setAsk] = useState<{ index: number; at: number } | null>(null);
  useEffect(() => {
    if (!ask) return;
    const t = setTimeout(() => setAsk(null), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [ask]);
  useEffect(() => {
    if (!open) setAsk(null);
  }, [open]);
  useBackLayer(open && ask !== null, () => setAsk(null));
  const close = () => useHaulUi.getState().closeSheet();
  const taken = v?.rows.find((r) => r.taken) ?? null;
  const pick = (row: RowView) => {
    if (row.taken) return;
    if (taken && taken.progress && ask?.index !== row.index) {
      fx.play('ui_denied');
      setAsk({ index: row.index, at: Date.now() });
      return;
    }
    setAsk(null);
    haulActions.pickContract(row.index);
  };
  return (
    <HaulSheet visible={open && board !== null} onClose={close} title={title.t} left={title.icon ? <HaulIcon name={title.icon} size={26} /> : null}>
      {v ? (
        !v.unlocked ? (
          <Line muted>{say('boardLocked', { n: v.unlockAt })}</Line>
        ) : v.rows.length === 0 && v.open === 0 ? (
          <Line muted>{say('boardEmpty')}</Line>
        ) : (
          <>
            {!taken ? (
              <Line size={ty.small} muted>
                {say('boardHint')}
              </Line>
            ) : null}
            {v.rows.map((row) => (
              <ContractRow key={row.index} row={row} onPress={() => pick(row)} ask={ask?.index === row.index && taken ? say(taken.progressAboard ? 'dropAskAboard' : 'dropAsk', { buyer: taken.buyer, n: taken.progress }) : null} />
            ))}
            {Array.from({ length: v.open }, (_, i) => (
              <OpenSlot key={`open${i}`} />
            ))}
            <View style={styles.footer}>
              <PodStamps filled={v.pods.filled} of={v.pods.of} label={v.footer} color={c.textMuted} dim={alpha(c.textMuted, 0.35)} size={ty.tiny} />
            </View>
          </>
        )
      ) : null}
    </HaulSheet>
  );
}

function ContractRow({ row, onPress, ask }: { row: RowView; onPress: () => void; ask: string | null }) {
  const c = useColors();
  const ty = useType();
  const target = useTarget(`contract:card${row.index}`);
  const amber = c.accent;
  const edge = row.taken ? c.success : ask ? amber : alpha(c.primary, 0.35);
  return (
    <Pressable
      {...target}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: row.taken }}
      accessibilityLabel={[row.buyer, row.mult, ...row.wants.map((w) => w.text), row.launches, row.paceWord, row.bonus, ask ?? ''].join('. ')}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: edge,
          backgroundColor: row.taken ? alpha(c.success, 0.08) : alpha(c.surface, 0.9),
          opacity: pressed && !row.taken ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.top}>
        {row.emblem ? <HaulIcon name={row.emblem} size={24} /> : null}
        <T size={ty.small} color={c.text} bold flex mono={false}>
          {row.buyer.toUpperCase()}
        </T>
        <T size={ty.big} color={c.text} bold>
          {row.mult}
        </T>
      </View>
      {row.wants.map((w) => (
        <View key={w.ore} style={styles.want}>
          <View style={styles.wantLine}>
            <HaulIcon name={`art:ore-${w.ore}`} size={12} />
            <T size={ty.small} color={c.text} bold flex>
              {w.text}
            </T>
            <T size={ty.tiny} color={c.textMuted}>
              {w.pace}
            </T>
          </View>
          {row.taken ? (
            <View style={[styles.bar, { backgroundColor: alpha(c.text, 0.1) }]}>
              <View style={{ width: `${w.got * 100}%`, backgroundColor: w.color }} />
              <View style={{ width: `${Math.min(w.aboard, 1 - w.got) * 100}%`, backgroundColor: alpha(w.color, 0.4) }} />
            </View>
          ) : null}
        </View>
      ))}
      <View style={styles.bottom}>
        {row.taken ? (
          <View style={[styles.tag, styles.takenTag, { backgroundColor: c.success, borderColor: c.success }]}>
            <T size={ty.tiny} color={c.background} bold>
              {say('taken')}
            </T>
          </View>
        ) : null}
        <T size={ty.tiny} color={row.last ? amber : c.textMuted} bold={row.last}>
          {row.launches}
        </T>
        <T size={ty.tiny} color={row.onPace ? c.success : amber} bold flex>
          {`\u00a0·\u00a0${row.paceWord}`}
        </T>
      </View>
      {/* The bonus has a line of its own: next to "NEEDS +27 % COPPER" and the TAKEN tag it cut the pace word at 390 wide. */}
      <View style={styles.bonus}>
        <T size={ty.body} color={c.success} bold>
          {row.bonus}
        </T>
      </View>
      {ask ? (
        <T size={ty.tiny} color={amber} bold mono={false}>
          {ask}
        </T>
      ) : null}
    </Pressable>
  );
}

/** The empty place a dropped contract leaves until the next warp-out (Decision 56): a dashed frame, no buyer. */
function OpenSlot() {
  const c = useColors();
  const ty = useType();
  return (
    <View style={[styles.card, styles.open, { borderColor: alpha(c.textMuted, 0.4) }]} accessible accessibilityLabel={say('boardOpenSlot')}>
      <T size={ty.tiny} color={c.textMuted} bold>
        {say('boardOpenSlot').toUpperCase()}
      </T>
    </View>
  );
}

/** One line of a row, sized by hand (allowFontScaling false, phone-4): every text of a row is single-line. */
function T(p: { children: string; size: number; color: string; bold?: boolean; mono?: boolean; flex?: boolean }) {
  return (
    <Text style={{ color: p.color, fontSize: p.size, fontFamily: p.mono === false ? undefined : MONO, fontWeight: p.bold ? '800' : '600', flex: p.flex ? 1 : undefined }} numberOfLines={1} allowFontScaling={false}>
      {p.children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  want: { gap: 3 },
  wantLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden', flexDirection: 'row' },
  bottom: { flexDirection: 'row', alignItems: 'center' },
  bonus: { flexDirection: 'row', justifyContent: 'flex-end' },
  takenTag: { marginRight: 6 },
  footer: { alignItems: 'center', marginTop: 2 },
  open: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});
