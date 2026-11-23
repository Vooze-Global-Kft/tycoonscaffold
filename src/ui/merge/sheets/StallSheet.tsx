/**
 * The stall sheet (spec 4.4, 2.2, 5.4), opened only from the stall's front or the goal line (no
 * arrows to other stalls):
 * - gear: "Drops a Pepper Skewer every 4 s · 1 in 20 is a Twin Skewer → 2 in 20", its cost, and what
 *   the next base step does to orders ("From level 11: drops Twin Skewers; orders ask for Glazed
 *   Skewers and up.");
 * - stall: "Pays ×1.1 → ×1.2";
 * - minder: hire or level; "Puts a Twin Skewer, 12, in the till every 15 s · held back by: gear
 *   level"; keeps selling while away, up to the away cap;
 * - "Gear waiting: the shelf is full" when it is, and the "Gear rush" ad;
 * - a closed stall: "Open the Tea stall" with its cost (or why it cannot open yet).
 * Every figure from the rules (./views.ts `stallView`); purchases through mergeActions (they play
 * their own sounds). Owned by the bars package (BARS, 7a).
 */
import { StyleSheet, View } from 'react-native';
import { mergeActions } from '../../../modes/merge/actions';
import { useRewardedReady } from '../../kit';
import { CHAIN_IDS } from '../art/palette';
import { minderIcon } from '../art/icons';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { useMergeCfg, useStallView } from '../useMerge';
import { Btn, Card, INK, MergeSheet, Txt, useLastParam, useType } from './parts';
import { coins, cooldownParts } from './views';

export function StallSheet() {
  const chain = useMergeUi((s) => (s.sheet?.type === 'stall' ? s.sheet.chain : null));
  const c = useLastParam(chain);
  const close = () => useMergeUi.getState().closeSheet();
  const cfg = useMergeCfg();
  const name = c !== null ? (cfg?.merge.chains[c]?.name ?? '') : '';
  return (
    <MergeSheet visible={chain !== null} onClose={close} title={S.sheets.stallTitle(name)} icon={c !== null ? `art:stall-${CHAIN_IDS[c]}` : undefined}>
      {c !== null ? <StallBody c={c} /> : null}
    </MergeSheet>
  );
}

function StallBody({ c }: { c: number }) {
  const ty = useType();
  const cfg = useMergeCfg();
  const v = useStallView(c);
  const adReady = useRewardedReady();
  if (!cfg || !v.exists) return null;
  const ch = cfg.merge.chains[c];
  const icon = `art:gear-${CHAIN_IDS[c]}`;
  const cost = (x: number) => coins(cfg, x);
  if (!v.open) {
    return (
      <Card icon={icon}>
        <Txt size={ty.big} bold>
          {S.sheets.openStall(ch.name)}
        </Txt>
        <Txt size={ty.small} color={INK.soft}>
          {S.sheets.openStallWhat(ch.gear)}
        </Txt>
        {v.openNote === '' ? (
          <Btn label={S.sheets.open} price={cost(v.openCost)} enabled={v.cash >= v.openCost} target="sheet:open" onPress={() => {
              // The opening is the moment to see (the awning, the first drop, the new customers): the sheet steps aside.
              if (mergeActions.openStall(c)) useMergeUi.getState().closeSheet();
            }}
          />
        ) : (
          <Txt size={ty.small} color={INK.warn}>
            {v.openNote === 'season' ? S.sheets.opensIn(v.fromSeason) : S.sheets.opensAfter(v.prevChain)}
          </Txt>
        )}
      </Card>
    );
  }
  const ripe = v.ripeN > 0 ? ` · ${S.sheets.gearRipe(v.ripeN, v.ripeOf, v.ripeTier)}${v.nextRipeN > 0 ? ` ${S.sheets.gearRipeNext(v.nextRipeN, v.ripeOf)}` : ''}` : '';
  const nextNone = v.ripeN === 0 && v.nextRipeN > 0 ? S.sheets.gearNextNone(v.nextRipeN, v.ripeOf, v.ripeTier) : '';
  const step = v.stepLevel === 0 ? '' : v.stepLevel === v.gearLevel + 1 ? S.sheets.gearBaseNext(v.stepDrops, v.stepAsks) : S.sheets.gearBaseStep(v.stepLevel, v.stepDrops, v.stepAsks);
  const rush = cooldownParts(v.rushAfter);
  const hired = v.minderLevel > 0;
  return (
    <>
      <Card icon={icon}>
        <Txt size={ty.body} bold>
          {v.gearTop ? S.sheets.gearTop(ch.gear, v.gearLevel) : S.sheets.gearHead(ch.gear, v.gearLevel)}
        </Txt>
        <Txt size={ty.small} color={INK.soft}>
          {S.sheets.gearDrops(v.dropTier, v.interval)}
          {ripe}
        </Txt>
        {nextNone ? (
          <Txt size={ty.small} color={INK.soft}>
            {nextNone}
          </Txt>
        ) : null}
        {step ? (
          <Txt size={ty.small} color={INK.warn}>
            {step}
          </Txt>
        ) : null}
        {v.waiting ? (
          <Txt size={ty.small} bold color={INK.warn}>
            {S.sheets.gearWaiting}
          </Txt>
        ) : v.shelf > 0 ? (
          <Txt size={ty.small} color={INK.soft}>
            {S.sheets.shelf(v.shelf)}
          </Txt>
        ) : null}
        {!v.gearTop ? <Btn label={S.sheets.levelUp} price={cost(v.gearCost)} enabled={v.cash >= v.gearCost} target="sheet:gear" onPress={() => mergeActions.levelGear(c)} /> : null}
        <Btn
          kind="ad"
          label={S.sheets.gearRush}
          sub={v.rushAfter > 0 ? S.sheets.adReadyAfter(rush.unit === 'min' ? S.sheets.minutes(rush.n) : S.sheets.seconds(rush.n)) : !adReady ? S.sheets.adNotLoaded : S.sheets.gearRushWhat(v.rushGoods)}
          enabled={v.rushReady && adReady}
          onPress={() => void mergeActions.watchAd('gearRush')}
        />
      </Card>
      <Card icon={`art:stall-${CHAIN_IDS[c]}`}>
        <Txt size={ty.body} bold>
          {S.sheets.stallHead(v.stallLevel)}
        </Txt>
        <Txt size={ty.small} color={INK.soft}>
          {v.stallNext ? S.sheets.stallPays(v.stallNow, v.stallNext) : S.sheets.stallPaysTop(v.stallNow)}
        </Txt>
        {v.stallNext ? <Btn label={S.sheets.levelUp} price={cost(v.stallCost)} enabled={v.cash >= v.stallCost} target="sheet:stall" onPress={() => mergeActions.levelStall(c)} /> : null}
      </Card>
      <Card icon={minderIcon(c)} iconSize={40}>
        <Txt size={ty.body} bold>
          {hired ? S.sheets.minderHead(ch.minder.name, v.minderLevel) : S.sheets.minderNone(ch.minder.name)}
        </Txt>
        {hired ? (
          <Txt size={ty.small} color={INK.soft}>
            {S.sheets.minderSells(v.houseTier, v.sale, v.saleSecs)}
            {v.heldBy ? ` · ${v.heldBy === 'gear' ? S.sheets.heldByGear : S.sheets.heldByMinder}` : ''}
          </Txt>
        ) : v.nextHouse ? (
          <Txt size={ty.small} color={INK.soft}>
            {S.sheets.minderWould(v.nextHouse, v.nextSale, v.saleSecs)}
          </Txt>
        ) : null}
        <Txt size={ty.small} color={INK.soft}>
          {S.sheets.minderAway(v.awayHours)}
        </Txt>
        {hired && v.nextHouse ? (
          <Txt size={ty.small} color={INK.warn}>
            {S.sheets.minderNext(v.nextHouse, v.nextSale)}
          </Txt>
        ) : null}
        {hired && v.minderBlock === 'gear' ? (
          <Btn label={S.sheets.raiseGearFirst} kind="plain" enabled={false} onPress={() => undefined} />
        ) : v.minderCost > 0 && v.minderBlock !== 'top' ? (
          <Btn label={hired ? S.sheets.levelUp : S.sheets.hire} price={cost(v.minderCost)} enabled={v.cash >= v.minderCost} target="sheet:minder" onPress={() => (hired ? mergeActions.levelMinder(c) : mergeActions.hireMinder(c))} />
        ) : hired ? (
          <Txt size={ty.tiny} color={INK.faint}>
            {S.sheets.minderTop}
          </Txt>
        ) : null}
      </Card>
      <View style={styles.pad} />
    </>
  );
}

const styles = StyleSheet.create({
  pad: { height: 2 },
});
