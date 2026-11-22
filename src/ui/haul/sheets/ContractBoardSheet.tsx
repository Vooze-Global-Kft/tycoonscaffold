/**
 * The Contract Board sheet (spec 4.5, Decision 40): one row per buyer on the board, read like a
 * dispatch sheet. A contract is delivered over several launches: "Deliver 8.4K copper within 6
 * launches". Each row says, from the rules' `contractViews` (never computed here):
 *   emblem, buyer, the multiplier ("x1.8"), "x2 SHIFT" when the day shift would double it;
 *   each wanted ore: "8.4K COPPER" and what one launch carries of it now ("1.2K PER LAUNCH"), or
 *   for the taken one "3.7K / 8.4K COPPER" with a bar (delivered solid, aboard lighter);
 *   "IN 6 LAUNCHES" (an offer) or "4 LAUNCHES LEFT" ("LAST LAUNCH" in amber), the pace word
 *   ("ON PACE" / "NEEDS MORE COPPER") and the fixed bonus "+₵19.4K WHEN MET".
 * A tap takes an offer. Taking another while the taken one has progress asks once more ("Drops Kade
 * Refinery: 3.7K delivered. Tap again."); nothing else ever picks a contract for the player. The
 * figures use one short format (unitsShort, moneyShort) everywhere: the strip shows the same.
 * Footer: "Scrap Pod every 4 contracts met (2/4)". Row targets `contract:card<i>` (the second stage
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
  shift: string | null;
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
    return {
      index: v.index,
      buyer: buyerName(cfg, v.contract.buyer),
      emblem: portraitOf(cfg, v.contract.buyer),
      mult: say('mult', { m: (Math.round((v.contract.mult + p.contractAdd) * 10) / 10).toFixed(1) }),
      shift: v.shift ? say('shiftTag', { m: cfg.haul.shift.mult }).toUpperCase() : null,
      wants,
      taken,
      // An offer reads as the deal it would be once taken ("IN 6 LAUNCHES"), not as its time left on the board.
      launches: launchWord(taken ? v.launchesLeft : v.launches, taken).toUpperCase(),
      last: taken && v.launchesLeft <= 1,
      onPace: v.onPace,
      paceWord: (v.onPace ? say('paceOn') : say('paceShort', { ore: short })).toUpperCase(),
      bonus: say('cardBonus', { v: moneyShort(cfg, v.bonus) }).toUpperCase(),
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
    footer: say(every === 1 ? 'boardFooter1' : 'boardFooter', {
      pod: podName,
      n: every,
      k: every > 0 ? (g.stats.contractsMet ?? 0) % every : 0,
    }),
  };
}

export function ContractBoardSheet() {
  const ty = useType();
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
        ) : v.rows.length === 0 ? (
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
            <Line mono muted size={ty.small} style={styles.footer}>
              {v.footer}
            </Line>
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
        {row.shift ? (
          <View style={[styles.tag, { borderColor: c.success }]}>
            <T size={ty.tiny} color={c.success} bold>
              {row.shift}
            </T>
          </View>
        ) : null}
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
  takenTag: { marginRight: 6 },
  footer: { textAlign: 'center', marginTop: 2 },
});
