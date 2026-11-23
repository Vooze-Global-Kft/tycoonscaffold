/**
 * The gift box (spec 4.4, 5.5, M24, M35), opened by the paper bag in the top bar: the bag with its 3
 * or 4 slots, and BEFORE the tap the odds of each slot (the rules' `giftOdds`) and the coins a coin
 * slot holds (the box's own amount, fixed when it was earned). "Open the bag" opens the oldest box
 * (`mergeActions.openGiftBox`, which plays `giftbox_open` and saves at once); then the slots are
 * revealed one by one, at least 120 ms apart, each with `slot_reveal` (6.2: a crinkle per slot, a
 * light haptic). Goods go to the board as room allows (they wait otherwise). Earned only, never
 * sold. Owned by the bars package (BARS, 7a).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import * as R from '../../../engine/merge';
import { mergeActions } from '../../../modes/merge/actions';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { MergeIcon } from '../art/MergeIcon';
import { CHAIN_IDS } from '../art/palette';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { useMerge, useMergeCfg, useMergeShallow } from '../useMerge';
import { Btn, Card, INK, MergeSheet, Txt, useType } from './parts';
import { coins } from './views';

/** Between two slots' reveals (slot_reveal's own floor is 120 ms). */
const REVEAL_MS = 420;

export function GiftSheet() {
  const open = useMergeUi((s) => s.sheet?.type === 'gift');
  const close = () => useMergeUi.getState().closeSheet();
  const waiting = useMerge((_c, g) => g.merge.gift.boxes.length, 0);
  // The box being revealed (taken before it was opened) and how many of its slots are shown.
  const [shown, setShown] = useState<{ box: R.GiftBox; n: number } | null>(null);
  useEffect(() => {
    if (!open) setShown(null);
  }, [open]);
  useEffect(() => {
    if (!shown || shown.n >= shown.box.slots.length) return;
    const t = setTimeout(() => {
      fx.play('slot_reveal');
      setShown((s) => (s ? { ...s, n: s.n + 1 } : s));
    }, shown.n === 0 ? REVEAL_MS / 2 : REVEAL_MS);
    return () => clearTimeout(t);
  }, [shown]);
  const openBox = () => {
    const { game } = useGame.getState();
    const box = (game as R.MergeGame).merge?.gift.boxes[0];
    if (!box) return;
    if (mergeActions.openGiftBox()) setShown({ box, n: 0 });
  };
  const slots = shown ? shown.box.slots.length : 0;
  const revealing = !!shown && shown.n < slots;
  return (
    <MergeSheet
      visible={open}
      onClose={close}
      title={S.sheets.giftTitle}
      icon={`art:giftbag-${shown ? (shown.box.slots.length >= 4 ? 4 : 3) : 3}`}
      footer={
        shown ? (
          revealing ? null : waiting > 0 ? (
            <Btn label={S.sheets.giftNext} onPress={openBox} />
          ) : (
            <Btn kind="plain" label={S.sheets.giftDone} onPress={close} />
          )
        ) : waiting > 0 ? (
          <Btn label={S.sheets.giftOpen} onPress={openBox} />
        ) : null
      }
    >
      {shown ? <Reveal box={shown.box} n={shown.n} /> : <Before />}
    </MergeSheet>
  );
}

/** Before the tap (5.5): the bag, its slots, the odds and the coin amount. */
function Before() {
  const ty = useType();
  const cfg = useMergeCfg();
  const box = useMerge((_c, g) => g.merge.gift.boxes[0] ?? null, null);
  const waiting = useMerge((_c, g) => g.merge.gift.boxes.length, 0);
  const odds = useMergeShallow(
    (c, g) => {
      try {
        const o = R.giftOdds(c, g);
        return { coins: o.coins, good: o.good, spark: o.spark };
      } catch {
        return { coins: 0, good: 0, spark: 0 };
      }
    },
    { coins: 0, good: 0, spark: 0 },
  );
  if (!cfg) return null;
  if (!box) {
    return (
      <Txt size={ty.body} color={INK.soft}>
        {S.sheets.giftNone}
      </Txt>
    );
  }
  const n = box.slots.length;
  const pct = (x: number) => Math.round(x * 100);
  return (
    <>
      <View style={styles.bag}>
        <MergeIcon icon={`art:giftbag-${n >= 4 ? 4 : 3}`} size={88} />
        <Txt size={ty.small} color={INK.soft}>
          {S.sheets.giftWaiting(waiting)}
        </Txt>
      </View>
      <Card>
        <Txt size={ty.body} bold>
          {S.sheets.giftSlots(n)}
        </Txt>
        <OddsRow icon="art:coin" text={S.sheets.giftCoins(coins(cfg, box.coins))} odds={S.sheets.giftOdds(pct(odds.coins))} />
        <OddsRow icon={`art:good-${CHAIN_IDS[0]}-3`} text={S.sheets.giftGood} odds={S.sheets.giftOdds(pct(odds.good))} />
        <OddsRow icon="art:spark" text={S.sheets.giftSpark} odds={S.sheets.giftOdds(pct(odds.spark))} />
        <Txt size={ty.tiny} color={INK.faint}>
          {S.sheets.giftFixed}
        </Txt>
      </Card>
    </>
  );
}

function OddsRow({ icon, text, odds }: { icon: string; text: string; odds: string }) {
  const ty = useType();
  return (
    <View style={styles.oddsRow}>
      <MergeIcon icon={icon} size={24} />
      <Txt size={ty.small} style={styles.flex}>
        {text}
      </Txt>
      <Txt size={ty.small} bold color={INK.amber}>
        {odds}
      </Txt>
    </View>
  );
}

/** The reveal: the box's slots, `n` of them shown. */
function Reveal({ box, n }: { box: R.GiftBox; n: number }) {
  const ty = useType();
  const cfg = useMergeCfg();
  if (!cfg) return null;
  return (
    <View style={styles.slots}>
      {box.slots.map((s, i) => {
        if (i >= n)
          return (
            <View key={i} style={[styles.slot, box.slots.length >= 4 ? styles.slotNarrow : null, styles.slotHidden]}>
              <MergeIcon icon="art:giftbag-3" size={34} />
            </View>
          );
        const icon = s.kind === 'coins' ? 'art:coin' : s.kind === 'spark' ? 'art:spark' : `art:good-${CHAIN_IDS[s.good.c]}-${s.good.k}`;
        const label = s.kind === 'coins' ? coins(cfg, box.coins) : s.kind === 'spark' ? S.sheets.giftSparkGot : (cfg.merge.chains[s.good.c]?.tiers[s.good.k - 1] ?? '');
        return (
          <Animated.View key={i} entering={ZoomIn.duration(220)} style={[styles.slot, box.slots.length >= 4 ? styles.slotNarrow : null]}>
            <MergeIcon icon={icon} size={s.kind === 'coins' ? 30 : 42} />
            <Txt size={ty.small} bold center color={s.kind === 'coins' ? INK.amber : INK.text} lines={2}>
              {label}
            </Txt>
            {s.kind === 'good' ? (
              <Txt size={ty.tiny} center color={INK.faint} lines={2}>
                {S.sheets.giftGoodWaits}
              </Txt>
            ) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bag: { alignItems: 'center', gap: 2 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  flex: { flex: 1 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 6 },
  slot: { width: 92, minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6, borderRadius: 12, backgroundColor: INK.card, borderWidth: 1, borderColor: INK.cardEdge },
  slotNarrow: { width: 76 },
  slotHidden: { opacity: 0.5 },
});
