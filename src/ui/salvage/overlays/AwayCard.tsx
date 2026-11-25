/**
 * The away card (yard-stage1.md 4.4, 2.16; centred): "Away {h} h {m} m (cap {c} h)"; up to five grade
 * lines and "+ {n} more"; "{t} supplied · §{x} (already in your account)": the money was paid when the
 * away pass computed it (BRIEF lesson 5), OK only closes the card (`ackAway` pays nothing); loads
 * fetched, deal deliveries, "You passed {rival}."; with little to show, what would have earned more
 * ("A cutter keeps the yard working while you are away (Office)"). No ad button in stage 1.
 * Data: `CardData.away` (the state's waiting card); numbers through the facade's formatters.
 */
import { StyleSheet, View } from 'react-native';
import type { AwayCard as Away, Txt } from '../../../engine/salvage';
import { CentredCard } from './CentredCard';
import { useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { salvageActions } from '../../../modes/salvage/actions';
import { INK, Line, LocalButton } from './parts';

/** At most this many grade lines; the rest is "+ n more" (4.4). */
export const AWAY_LINES = 5;

/** Every line the card prints, in order (pure: the tests read it). */
export function awayLines(a: Away): { lines: Txt[]; summary: Txt[] } {
  const shown = a.lines.slice(0, AWAY_LINES).map((l): Txt => ({ key: 'away.line', args: { grade: { grade: l.grade }, kg: { mass_g: l.g, step: 'lot' }, x: { money: l.money } } }));
  if (a.lines.length > AWAY_LINES) shown.push({ key: 'ticket.more', args: { n: { n: a.lines.length - AWAY_LINES } } });
  const summary: Txt[] = [];
  if (a.supplied_g > 0 || a.money > 0) summary.push({ key: 'away.supplied', args: { t: { tonnes_g: a.supplied_g }, x: { money: a.money } } });
  else summary.push({ key: 'away.nothing' });
  if (a.loads > 0) summary.push({ key: 'away.loads', args: { n: { n: a.loads } } });
  if (a.deliveries > 0) summary.push({ key: 'away.deliveries', args: { n: { n: a.deliveries } } });
  for (const r of a.passed) summary.push({ key: 'away.passed', args: { rival: { name: `${r}.chip` } } });
  if (a.hint) summary.push(a.hint);
  return { lines: shown, summary };
}

export function AwayCard({ data, onClose }: CardViewProps) {
  useSeenOnClose('away');
  const a = data.away;
  const ok = data.foot.length ? data.foot : [{ label: { key: 'ok' as const }, action: { act: 'ackAway' as const }, refusal: null }];
  if (!a) {
    return (
      <CentredCard title={data.title} onClose={onClose}>
        <Line t={{ key: 'away.nothing' }} size="name" />
      </CentredCard>
    );
  }
  const { lines, summary } = awayLines(a);
  const head: Txt = { key: 'away.head', args: { t: { secs: a.seconds }, c: { n: a.capS / 3600 } } };
  return (
    <CentredCard title={data.title} onClose={onClose}>
      <View style={styles.head}>
        <Line t={head} size="name" bold />
      </View>
      {lines.map((t, i) => (
        <Line key={i} t={t} size="name" />
      ))}
      <View style={styles.sum}>
        {summary.map((t, i) => (
          <Line key={i} t={t} size={i === 0 ? 'name' : 'line'} bold={i === 0} colour={t === a.hint ? INK.soft : INK.ink} lines={2} />
        ))}
      </View>
      <View style={styles.foot}>
        {ok.map((b, i) => (
          <LocalButton
            key={i}
            label={b.label}
            onPress={() => {
              // OK closes the card; ackAway pays nothing (the away pass paid when it computed).
              salvageActions.press(b.action);
              onClose();
            }}
          />
        ))}
      </View>
    </CentredCard>
  );
}

const styles = StyleSheet.create({
  head: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule, marginBottom: 4 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 10 },
  sum: { paddingTop: 6, marginTop: 4, gap: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: INK.rule },
});
