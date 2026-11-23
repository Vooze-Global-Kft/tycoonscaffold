/**
 * The ticket detail (spec 4.4, 2.7, 5.7, M34), opened by a tap on a counter's ticket: who holds it,
 * each line's good, name and value (NEW on a stretch line, a tick when filled, "No longer made at
 * this stall" on a line a gear upgrade left behind, M34), the multi-line bonus, the price (the rules'
 * ticketPrice: the one the ticket pays), "Not tonight" (with the rules' own "no room" words when
 * disabled, and its cooldown), and "Watch ad: fill one line" on a ticket of two or more unfilled
 * lines. Owned by the bars package (BARS, 7a).
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { mergeActions } from '../../../modes/merge/actions';
import { useRewardedReady } from '../../kit';
import { MergeIcon } from '../art/MergeIcon';
import { CHAIN_IDS } from '../art/palette';
import { customerIcon } from '../art/icons';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { useMergeCfg, useTicketView } from '../useMerge';
import { Btn, Card, INK, MergeSheet, Pill, Txt, useLastParam, useType } from './parts';
import { cooldownParts, parseLines } from './views';

export function TicketSheet() {
  const counter = useMergeUi((s) => (s.sheet?.type === 'ticket' ? s.sheet.counter : null));
  const j = useLastParam(counter);
  const v = useTicketView(j ?? -1);
  const close = () => useMergeUi.getState().closeSheet();
  // The ticket it was opened on: once it is paid or sent off the sheet closes, so a new customer
  // never opens it by themselves.
  const openedId = useRef<number | null>(null);
  useEffect(() => {
    if (counter === null) {
      openedId.current = null;
      return;
    }
    if (openedId.current === null && v.exists) openedId.current = v.id;
    if (!v.exists || (openedId.current !== null && v.id !== openedId.current)) useMergeUi.getState().closeSheet();
  }, [counter, v.exists, v.id]);
  const title = v.gold ? S.sheets.dragonTitle : S.sheets.ticketTitle(v.species);
  const icon = v.exists ? (v.gold ? 'beast:dragon' : customerIcon(v.species, v.coat)) : undefined;
  return (
    <MergeSheet visible={counter !== null && v.exists} onClose={close} title={title} icon={icon}>
      {j !== null && v.exists ? <TicketBody counter={j} onDone={close} /> : null}
    </MergeSheet>
  );
}

function wait(seconds: number): string {
  const p = cooldownParts(seconds);
  return p.unit === 'min' ? S.sheets.minutes(p.n) : S.sheets.seconds(p.n);
}

function TicketBody({ counter, onDone }: { counter: number; onDone: () => void }) {
  const ty = useType();
  const cfg = useMergeCfg();
  const v = useTicketView(counter);
  const adReady = useRewardedReady();
  if (!cfg || !v.exists) return null;
  const lines = parseLines(v.lines);
  const ntOk = v.ntRoom && v.ntWait <= 0;
  const ntSub = !v.ntRoom ? S.sheets.noRoom(v.ntGoods) : v.ntWait > 0 ? S.sheets.readyIn(wait(v.ntWait)) : S.sheets.notTonightWhat;
  const showAd = v.unfilled >= 2;
  return (
    <>
      {lines.map((l, i) => {
        const name = cfg.merge.chains[l.c]?.tiers[l.k - 1] ?? '';
        return (
          <View key={i} style={[styles.line, l.filled ? styles.filled : null]}>
            <MergeIcon icon={`art:good-${CHAIN_IDS[l.c]}-${l.k}`} size={40} />
            <View style={styles.lineBody}>
              <Txt size={ty.body} bold lines={1}>
                {name}
              </Txt>
              {l.gone ? (
                <Txt size={ty.tiny} color={INK.warn}>
                  {S.sheets.lineGone}
                </Txt>
              ) : null}
            </View>
            {l.stretch && !l.filled ? <Pill label={S.sheets.lineNew} /> : null}
            {l.filled ? <Pill label={S.sheets.lineFilled} color={INK.good} text={INK.amberText} /> : null}
            <Txt size={ty.body} bold color={INK.amber}>
              {l.value}
            </Txt>
          </View>
        );
      })}
      <Card>
        {lines.length > 1 ? (
          <Txt size={ty.small} color={INK.soft}>
            {S.sheets.bonus(v.bonusPct, lines.length)}
          </Txt>
        ) : null}
        {v.gold ? (
          <Txt size={ty.small} color={INK.soft}>
            {S.sheets.paradePays(v.parade)}
          </Txt>
        ) : null}
        <View style={styles.price}>
          <Txt size={ty.body} color={INK.soft}>
            {S.sheets.price}
          </Txt>
          <View style={styles.priceRow}>
            <MergeIcon icon="art:coin" size={18} />
            <Txt size={ty.big} bold color={INK.amber}>
              {v.price}
            </Txt>
          </View>
        </View>
      </Card>
      {showAd ? (
        <Btn
          kind="ad"
          label={S.sheets.fillLine}
          sub={v.adWait > 0 ? S.sheets.adReadyAfter(wait(v.adWait)) : !adReady ? S.sheets.adNotLoaded : S.sheets.fillLineWhat}
          enabled={v.adOk && adReady}
          onPress={() => void mergeActions.watchAd('fillLine', counter)}
        />
      ) : null}
      <Btn
        kind="plain"
        label={S.sheets.notTonight}
        sub={ntSub}
        enabled={ntOk}
        target="ticket:notTonight"
        onPress={() => {
          if (mergeActions.notTonight(counter)) onDone();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: INK.card, borderWidth: 1, borderColor: INK.cardEdge },
  filled: { opacity: 0.6 },
  lineBody: { flex: 1, minWidth: 0 },
  price: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
