/**
 * The monument offered each term (spec 5.8): its silly bronze (the art kit's, by the written id or
 * name), its line, the rules' price and the factor it adds for good; "Commission it" buys it through
 * decreeActions.buyVanity (the rules keep back the reserve: "Kept for the desk" and, from the call
 * day, "Kept for the run-up", D16); declining costs nothing and the offer stands for the term.
 * Owned by the views package (VIEWS).
 */
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { decreeActions, decreeNow } from '../../../modes/decree/actions';
import { DecreeIcon } from '../art/DecreeIcon';
import { S, dibs } from '../strings';
import { useDecree } from '../useDecree';
import { monumentModel, type MonumentModel } from '../views/model';
import { Btn, Card, DecreeSheet, INK, Txt, useType } from './parts';

/** A factor as the rules hold it, without trailing zeros ("1.02"). */
const factorText = (f: number) => String(Number(f.toFixed(4)));

export function MonumentSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  // Re-read when the offer, what was bought or the rules' refusal change (a primitive each; the treasury moves the refusal).
  const offer = useDecree((_c, g) => g.decree.monumentOffer, null);
  const bought = useDecree((_c, g) => g.decree.vanity.length, 0);
  const refusal = useDecree((c, g) => (visible ? (monumentModel(c, g)?.refusal ?? null) : null), null);
  const m = useMemo<MonumentModel | null>(() => {
    const now = decreeNow();
    return now && visible ? monumentModel(now.cfg, now.g) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer, bought, refusal, visible]);
  const buy = () => {
    if (decreeActions.buyVanity()) onClose();
  };
  return (
    <DecreeSheet
      visible={visible && !!m}
      onClose={onClose}
      title={S.views.monumentTitle}
      icon="art:btn_shelf"
      footer={
        m ? (
          <View style={styles.footer}>
            <Btn label={S.views.commission} price={dibs(m.price)} onPress={buy} enabled={m.refusal === null} />
            <Btn label={S.views.notThisTerm} onPress={onClose} kind="plain" />
          </View>
        ) : null
      }
    >
      {m ? <Body m={m} /> : null}
    </DecreeSheet>
  );
}

function Body({ m }: { m: MonumentModel }) {
  const ty = useType();
  const why = m.refusal === 'cash' ? S.views.monumentCash : m.refusal === 'reserve' ? S.views.keptDesk(dibs(m.reserve.desk)) : m.refusal === 'runUp' ? S.views.keptRunUp(dibs(m.reserve.runUp)) : null;
  return (
    <View style={styles.body}>
      <Txt size={ty.small} color={INK.soft} center>
        {S.views.monumentWhat}
      </Txt>
      <View style={styles.hero}>
        <DecreeIcon icon={`art:monument_${m.id}`} size={96} />
      </View>
      <Txt size={ty.big} bold center color={INK.violetDeep}>
        {m.name}
      </Txt>
      {m.line ? (
        <Txt size={ty.body} center style={styles.quote}>
          {m.line}
        </Txt>
      ) : null}
      <Card icon="art:fx_coin" iconSize={28}>
        <Txt size={ty.body} bold color={INK.money}>
          {S.views.monumentPrice(dibs(m.price))}
        </Txt>
        <Txt size={ty.small}>{S.views.monumentFactor(factorText(m.factor))}</Txt>
        {why ? (
          <Txt size={ty.small} color={INK.slate}>
            {why}
          </Txt>
        ) : null}
      </Card>
      <Txt size={ty.small} color={INK.soft} center>
        {S.views.declineFree}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  hero: { alignItems: 'center', paddingTop: 4 },
  footer: { gap: 8 },
  quote: { fontStyle: 'italic' },
});
