/**
 * The supply deal (yard-stage1.md 2.9, 4.3; a centred card): offered, "{q} kg of cast iron a day for {d}
 * days at §{p} a kilo, locked at signing" with Sign and Not now; running, the days left, the reserve in
 * the bay ("Reserved {a} / {q}"), trust, the last delivery, and that a short day charges nothing; done,
 * "All deliveries made". Sign presses `signDeal(terms)` with the terms the card showed ("Price updated"
 * asks again with the rules' retry); "supply deal", never "contract" (S21).
 *
 * Data: the rules' card (cardOf: lead, info rows, the no-charge line, the foot's buttons) when it carries
 * lead lines or buttons; else the lines are read from the deal's state and the offered terms come from
 * ./marketSample.ts (a STAND-IN for an older cardOf).
 */
import { StyleSheet, View } from 'react-native';
import type { CardButton, Txt } from '../../../engine/salvage';
import { CentredCard } from './CentredCard';
import { DataLine, nameOf, useAsk, useContent, useSeenOnClose } from './marketParts';
import { offeredTerms } from './marketSample';
import type { CardViewProps } from './OverlayHost';
import { BuyButton, INK, Lead, Line, LocalButton, RefusalLine } from './parts';

export function SupplyDeal({ cfg, g, data, onClose }: CardViewProps) {
  const c = useContent();
  const ask = useAsk();
  useSeenOnClose('deal');
  const d = g.salvage.deal;
  const grade = cfg.salvage.deal.grade;
  const fromRules = data.lead.length > 0 || data.foot.length > 0;
  let lead: Txt[] = data.lead;
  let foot: CardButton[] = data.foot;
  if (!fromRules) {
    const terms = offeredTerms(cfg, g, Date.now());
    if (terms) {
      lead = [{ key: 'card.dealTerms', args: { kg: { mass_g: terms.q_g, step: 'lot' }, grade: { grade }, n: { n: terms.days }, p: { price: terms.price } } }, { key: 'card.dealNoCharge' }];
      foot = [
        { label: { key: 'card.notNow' }, action: { act: 'declineDeal' }, refusal: null },
        { label: { key: 'card.sign' }, action: { act: 'signDeal', terms }, refusal: null },
      ];
    } else if (d.phase === 'running') {
      const bay = g.salvage.bays[grade];
      lead = [
        { key: 'card.dealTerms', args: { kg: { mass_g: d.q_g, step: 'lot' }, grade: { grade }, n: { n: d.days }, p: { price: d.price } } },
        { key: 'card.dealDaysLeft', args: { n: { n: Math.max(0, d.days - d.delivered) } } },
        { key: 'card.dealReserve', args: { a: { mass_g: bay?.forDeal_g ?? 0, step: 'lot' }, b: { mass_g: d.q_g, step: 'lot' } } },
        { key: 'card.dealTrust', args: { n: { n: d.trust } } },
        ...(d.last ? [{ key: 'card.dealLast' as const, args: { kg: { mass_g: d.last.g, step: 'lot' as const } } }] : []),
        { key: 'card.dealNoCharge' },
      ];
    } else if (d.phase === 'done') lead = [{ key: 'card.dealDone' }, { key: 'card.dealTrust', args: { n: { n: d.trust } } }];
    else lead = [{ key: 'away.nothing' }];
  }
  return (
    <CentredCard title={data.title} onClose={onClose}>
      <View style={styles.firm}>
        <DataLine text={nameOf(c, cfg.salvage.deal.partner)} size="name" bold lines={1} />
      </View>
      {lead.map((t, i) => (
        <Lead key={i} t={t} bold={i === 0} />
      ))}
      {fromRules
        ? data.rows.map((r) => (
            <View key={r.id} style={styles.info}>
              <Line t={r.name} size="name" lines={2} />
              {r.line ? <Line t={r.line} size="line" colour={INK.soft} lines={2} /> : null}
            </View>
          ))
        : null}
      {fromRules && data.legal ? (
        <View style={styles.info}>
          <Line t={data.legal} size="line" colour={INK.soft} lines={3} />
        </View>
      ) : null}
      {ask.asked ? <RefusalLine t={ask.asked.txt} /> : null}
      {foot.length ? (
        <View style={styles.foot}>
          {ask.asked?.retry ? <LocalButton label={{ key: 'card.sign' }} onPress={() => ask.press(ask.asked!.retry!, 'foot')} /> : null}
          {foot.map((b, i) => (b.refusal ? <BuyButton key={i} button={b} row="foot" /> : <LocalButton key={i} label={b.label} onPress={() => ask.press(b.action, 'foot')} />))}
        </View>
      ) : (
        <View style={styles.foot}>
          <LocalButton label={{ key: 'ok' }} onPress={onClose} />
        </View>
      )}
    </CentredCard>
  );
}

const styles = StyleSheet.create({
  firm: { paddingTop: 6, paddingBottom: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  info: { paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 10 },
});
