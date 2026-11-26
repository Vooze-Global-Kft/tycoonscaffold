/**
 * The away card (yard-stage1.md 4.4, 2.16; centred), in the fix pass's ruled order (P3, P19, R6, R10,
 * E33, E34): "Away {t} · the yard ran {c}" and what makes it run longer; the money as it was applied
 * ("Sales §x", "{n} loads bought · −§y", "Net +§z (already in your account)": paid when the away pass
 * computed it, BRIEF lesson 5; OK only closes the card, `ackAway` pays nothing); each deal delivery;
 * "In the bays, not yet sold: §u" right under Net (join3); "You passed {rival}."; the next step; then the grade lines the merchant collected (never held stock;
 * five at most, three at large type) and "+ n more". No ad button in stage 1.
 * Data: `CardData.away` (the state's waiting card); numbers through the facade's formatters.
 */
import { StyleSheet, View } from 'react-native';
import { CentredCard } from './CentredCard';
import * as R from '../../../engine/salvage';
import { awayLines, withAwayView, type AwayData } from './marketLines';
import { useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { salvageActions } from '../../../modes/salvage/actions';
import { INK, Line, LocalButton, useFrame } from './parts';

export function AwayCard({ cfg, g, data, onClose }: CardViewProps) {
  useSeenOnClose('away');
  const { layout } = useFrame();
  const a0 = data.away as AwayData | undefined;
  const a = a0 ? withAwayView(a0, R.awayView(cfg, g)) : undefined;
  const ok = data.foot.length ? data.foot : [{ label: { key: 'ok' as const }, action: { act: 'ackAway' as const }, refusal: null }];
  if (!a) {
    return (
      <CentredCard title={data.title} onClose={onClose}>
        <Line t={{ key: 'away.nothing' }} size="name" />
      </CentredCard>
    );
  }
  const { head, longer, money, net, unsold, news, next, lines } = awayLines(a, layout.fs >= 1.2);
  const footNode = (
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
  );
  return (
    <CentredCard title={data.title} onClose={onClose} footNode={footNode}>
      <View style={styles.head}>
        <Line t={head} size="name" bold lines={2} />
        {longer ? <Line t={longer} size="line" colour={INK.soft} lines={2} /> : null}
      </View>
      {net ? (
        <View style={styles.money}>
          {money.map((t, i) => (
            <Line key={i} t={t} size="line" lines={2} />
          ))}
          <Line t={net} size="name" bold lines={2} />
          {unsold ? <Line t={unsold} size="line" lines={2} /> : null}
        </View>
      ) : null}
      {news.map((t, i) => (
        <Line key={i} t={t} size="name" bold={t.key === 'away.passed' || t.key === 'away.passedN'} lines={2} />
      ))}
      {next ? (
        <View style={styles.next}>
          <Line t={next} size="line" bold lines={2} />
        </View>
      ) : null}
      {lines.length ? (
        <View style={styles.lines}>
          {lines.map((t, i) => (
            <Line key={i} t={t} size="line" colour={INK.soft} />
          ))}
        </View>
      ) : null}
    </CentredCard>
  );
}

const styles = StyleSheet.create({
  head: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule, marginBottom: 4 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 },
  money: { gap: 2, paddingBottom: 6, marginBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  next: { paddingTop: 6 },
  lines: { paddingTop: 6, marginTop: 6, gap: 1, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: INK.rule },
});
