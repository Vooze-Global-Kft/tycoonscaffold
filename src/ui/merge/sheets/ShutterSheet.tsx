/**
 * The shutter confirm (spec 4.4, 2.2): the group's condition, the next shutter's price, and "Holds a
 * good" when it does (every third shutter). Opened by a tap on the next shutter of a group (the play
 * canvas) or the goal line; the purchase is `mergeActions.openShutter(group)`, after which it closes.
 * Owned by the bars package (BARS, 7a).
 */
import { useEffect } from 'react';
import { mergeActions } from '../../../modes/merge/actions';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { useMergeCfg, useShutterView } from '../useMerge';
import { Btn, Card, INK, MergeSheet, Txt, useLastParam, useType } from './parts';
import { coins } from './views';

export function ShutterSheet() {
  const group = useMergeUi((s) => (s.sheet?.type === 'shutter' ? s.sheet.group : null));
  const g = useLastParam(group);
  const close = () => useMergeUi.getState().closeSheet();
  // A group whose shutters are all open has nothing to confirm: the sheet closes.
  const exists = useShutterView(g ?? 0).exists;
  useEffect(() => {
    if (group !== null && !exists) useMergeUi.getState().closeSheet();
  }, [group, exists]);
  return (
    <MergeSheet visible={group !== null && exists} onClose={close} title={S.sheets.shutterTitle} icon="art:shutter">
      {g !== null ? <ShutterBody group={g} onDone={close} /> : null}
    </MergeSheet>
  );
}

function ShutterBody({ group, onDone }: { group: number; onDone: () => void }) {
  const ty = useType();
  const cfg = useMergeCfg();
  const v = useShutterView(group);
  if (!cfg || !v.exists) return null;
  const cond = v.condKind === 'tier' ? S.sheets.shutterCondTier(v.condName) : S.sheets.shutterCondOpen(v.condName);
  return (
    <Card icon="art:shutter">
      <Txt size={ty.body} bold>
        {S.sheets.shutterReady}
      </Txt>
      <Txt size={ty.small}>{S.sheets.shutterNotStall}</Txt>
      <Txt size={ty.small} color={v.allowed ? undefined : INK.warn}>
        {v.allowed ? S.sheets.shutterCondDone(cond) : cond}
      </Txt>
      {v.holdsGood ? (
        <Txt size={ty.small} bold color={INK.warn}>
          {S.sheets.holdsGood}
        </Txt>
      ) : null}
      <Btn
        label={S.sheets.open}
        price={coins(cfg, v.cost)}
        enabled={v.allowed && v.cash >= v.cost}
        target="confirm:shutter"
        onPress={() => {
          if (mergeActions.openShutter(group)) onDone();
        }}
      />
    </Card>
  );
}
