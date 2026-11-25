/**
 * The away card (yard-stage1.md 4.4, 2.16; centred): "Away {h} h {m} m (cap {c} h)"; up to five grade
 * lines and "+ {n} more"; "{t} supplied · §{x} (already in your account)": the money was paid when the
 * away pass computed it (BRIEF lesson 5), OK only closes the card (`ackAway` pays nothing); loads
 * fetched, deal deliveries, "You passed {rival}."; with little to show, what would have earned more
 * ("A cutter keeps the yard working while you are away (Office)"). No ad button in stage 1.
 * Data: `CardData.away` (the state's waiting card); numbers through the facade's formatters.
 */
import { StyleSheet, View } from 'react-native';
import { CentredCard } from './CentredCard';
import { awayLines } from './marketLines';
import { useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { salvageActions } from '../../../modes/salvage/actions';
import { INK, Line, LocalButton } from './parts';

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
  const { head, lines, summary } = awayLines(a);
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
