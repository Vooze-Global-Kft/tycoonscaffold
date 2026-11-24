/**
 * The result of an election (spec 2.10, D6, D15, D26), after election night (phase result).
 * After a win: Name Recognition gained, the districts carried by the opponents' disarray, the same
 * rival "back for another go", and either "Stand for Governor" (only when the rules' canPrestige
 * allows it: views/model.ts `resultModel` follows `resultSheet.canMoveUp`) and "Not yet" (D43),
 * else "Back to the desk", with what the next office needs and what is missing, in the rules' numbers. After a loss: the winner
 * resigning over their hobby, "You serve on as Acting Mayor", nothing lost, "Opponents in disarray
 * +6" on the next poll (the rules' disarray), and the next rival. The term's one new thing either
 * way. No text counts or celebrates terms held. Owned by the views package (VIEWS).
 */
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { decreeNow } from '../../../modes/decree/actions';
import { S } from '../strings';
import { useDecree } from '../useDecree';
import { resultModel, type ResultModel } from '../views/model';
import { Btn, Card, DecreeSheet, INK, Txt, useType } from './parts';

export function ResultSheet({ visible, onClose, onStand, onStay }: { visible: boolean; onClose: () => void; onStand: () => void; onStay: () => void }) {
  const result = useDecree((_c, g) => g.decree.result ?? null, null);
  const phase = useDecree((_c, g) => g.decree.phase, null);
  const m = useMemo<ResultModel | null>(() => {
    const now = decreeNow();
    return now && result ? resultModel(now.cfg, now.g, S.views.quietTerm) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, phase]);
  const open = visible && !!m;
  return (
    <DecreeSheet visible={open} onClose={onClose} pinned title={m?.won ? S.views.resultTitleWon : S.views.resultTitleLost} icon="art:btn_poll" footer={m ? <Footer m={m} onStand={onStand} onStay={onStay} /> : null}>
      {m ? <Body m={m} /> : null}
    </DecreeSheet>
  );
}

function Footer({ m, onStand, onStay }: { m: ResultModel; onStand: () => void; onStay: () => void }) {
  const canMove = m.options.includes('moveUp') && !!m.nextTitle;
  return (
    <View style={styles.footer}>
      {canMove ? <Btn label={S.views.standFor(m.nextTitle!)} onPress={onStand} /> : null}
      <Btn label={canMove ? S.views.notYetMove : S.views.backToDesk} onPress={onStay} kind={canMove ? 'plain' : 'act'} />
    </View>
  );
}

function Body({ m }: { m: ResultModel }) {
  const ty = useType();
  return (
    <View style={styles.body}>
      <Txt size={ty.big} bold color={m.won ? INK.violetDeep : INK.slate}>
        {S.views.resultCount(m.held, m.of, m.districtWords)}
      </Txt>
      {m.won ? (
        <Card icon="art:fx_nr" iconSize={30}>
          <Txt size={ty.body} bold>
            {S.views.nrGained(m.nrGained)}
          </Txt>
          {m.carried.length ? (
            <Txt size={ty.small} color={INK.soft}>
              {S.views.carried(m.carried.join(', '))}
            </Txt>
          ) : null}
        </Card>
      ) : (
        <Card icon="art:fx_nr" iconSize={30}>
          {m.resignation ? (
            <Txt size={ty.body} style={styles.quote}>
              {m.resignation}
            </Txt>
          ) : null}
          <Txt size={ty.body} bold>
            {S.views.acting(m.title)}
          </Txt>
          <Txt size={ty.small} color={INK.soft}>
            {S.views.nothingLost}
          </Txt>
          {m.nrGained ? (
            <Txt size={ty.small} color={INK.soft}>
              {S.views.nrGained(m.nrGained)}
            </Txt>
          ) : null}
          {m.disarray ? (
            <Txt size={ty.small} color={INK.soft}>
              {S.views.disarrayNext(m.disarray)}
            </Txt>
          ) : null}
        </Card>
      )}
      {m.missing ? (
        <Card icon="art:fx_record" iconSize={30}>
          <Txt size={ty.small}>{S.views.missing(m.missing.title, m.missing.nrNeeded, m.missing.recordName, m.missing.recordNeeded, m.missing.nr, m.missing.record)}</Txt>
        </Card>
      ) : null}
      {m.next ? (
        <Card icon="art:btn_office" iconSize={30}>
          <Txt size={ty.body} bold>
            {S.views.nextThing(m.next.name)}
          </Txt>
          {m.next.line ? (
            <Txt size={ty.small} color={INK.soft}>
              {m.next.line}
            </Txt>
          ) : null}
        </Card>
      ) : null}
      {m.rival.name ? (
        <Card>
          {m.rival.backAgain ? (
            <Txt size={ty.small} style={styles.quote}>
              {m.rival.backAgain}
            </Txt>
          ) : (
            <Txt size={ty.small}>{S.views.standingNext(m.rival.name, m.rival.slogan)}</Txt>
          )}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  footer: { gap: 8 },
  quote: { fontStyle: 'italic' },
});
