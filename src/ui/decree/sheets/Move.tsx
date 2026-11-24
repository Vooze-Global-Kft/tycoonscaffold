/**
 * The move to the bigger office (spec 2.12): the rules' three lists, Resets, Stays and Next, the
 * transition fund, and when the new office's income passes the old (the rules' estimate, `about`).
 * "Become Governor" moves (the store's prestige through decreeActions.chooseAfterResult('moveUp'));
 * "Not yet" goes back to the result sheet. Every number is the rules' `moveSheet`; the items are the
 * rules' list ids, named in strings.ts. Owned by the views package (VIEWS).
 */
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { decreeNow } from '../../../modes/decree/actions';
import { S, aboutText, dibs } from '../strings';
import { useDecree } from '../useDecree';
import { moveModel, type MoveModel } from '../views/model';
import { Btn, Card, DecreeSheet, INK, Txt, useType } from './parts';

export function MoveSheet({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: () => void }) {
  const result = useDecree((_c, g) => g.decree.result ?? null, null);
  const m = useMemo<MoveModel | null>(() => {
    const now = decreeNow();
    return now && visible ? moveModel(now.cfg, now.g) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, visible]);
  return (
    <DecreeSheet
      visible={visible && !!m}
      onClose={onClose}
      title={S.views.moveTitle}
      icon="art:btn_office"
      footer={
        m ? (
          <View style={styles.footer}>
            <Btn label={S.views.become(m.toTitle)} onPress={onConfirm} />
            <Btn label={S.views.notYet} onPress={onClose} kind="plain" />
          </View>
        ) : null
      }
    >
      {m ? <Body m={m} /> : null}
    </DecreeSheet>
  );
}

function List({ title, items, words }: { title: string; items: string[]; words: Record<string, string> }) {
  const ty = useType();
  return (
    <Card>
      <Txt size={ty.body} bold color={INK.violetDeep}>
        {title}
      </Txt>
      {items.map((id) => (words[id] ? (
        <Txt key={id} size={ty.small}>
          {`·  ${words[id]}`}
        </Txt>
      ) : null))}
    </Card>
  );
}

function Body({ m }: { m: MoveModel }) {
  const ty = useType();
  return (
    <View style={styles.body}>
      <Txt size={ty.big} bold color={INK.violetDeep}>
        {S.views.moveHeadline(m.toTitle, m.toPlace)}
      </Txt>
      <Card>
        <Txt size={ty.body} bold color={INK.violetDeep}>
          {S.views.next}
        </Txt>
        <Txt size={ty.small}>{S.views.nextDistricts(m.next.districts, m.next.districtWords, m.next.majority)}</Txt>
        {m.next.newClubs.length ? <Txt size={ty.small}>{S.views.nextClubs(m.next.newClubs.join(', '))}</Txt> : null}
        {m.next.rival ? <Txt size={ty.small}>{S.views.nextRival(m.next.rival, m.next.slogan)}</Txt> : null}
        <Txt size={ty.small} color={INK.money} bold>
          {S.views.fund(dibs(m.fund))}
        </Txt>
        {m.passesIn ? <Txt size={ty.small}>{S.views.passesIn(aboutText(m.passesIn))}</Txt> : m.passesAtOnce ? <Txt size={ty.small}>{S.views.passesAtOnce}</Txt> : null}
      </Card>
      <List title={S.views.resets} items={m.resets} words={S.views.resetItem} />
      <List title={S.views.stays} items={m.stays} words={S.views.stayItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  footer: { gap: 8 },
});
