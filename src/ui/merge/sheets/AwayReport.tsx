/**
 * The away report (spec 2.9, 4.4, decision M8: the mode's own sheet, as the second game's Shift Log
 * is its own): on return, the rules' report in words (./awayLines.ts), the coins to collect, and
 * "Watch ad: +50 %" (the share from the rules' offlineAdMultiplier, never typed). Built on the bars
 * package's MergeSheet (./parts.tsx: lantern-night, registers with the overlay manager).
 *
 * Data: the shared store's `offline` (App.tsx's foreground handler runs the shared offline path
 * once per return: store.resume → EngineMode.offline → mergeOffline; two reports of one absence are
 * merged there by the rules' mergeAwayReports, so they show as one). Collecting goes through
 * `mergeActions.collectAway` (the shared collectOffline, which plays `offline_collect` → coins).
 * - It opens by itself, so it waits while a finger is down, a good is armed or a chip shows (3.1),
 *   and while another sheet is open (one at a time, 4.4); then it holds uiState's sheet `away`.
 * - Nothing at all for an absence the rules call empty; the report alone when only shelves filled.
 * - The close button, a tap on the dim street and Android back collect without the ad.
 * Owned by the hints and platform package (docs/design/market-build-plan.md); mounted by
 * ../platform.tsx in the overlays' PLATFORM block.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { engineFor } from '../../../engine/mode';
import * as R from '../../../engine/merge';
import { mergeActions } from '../../../modes/merge/actions';
import { useGame } from '../../../state/store';
import { useRewardedReady } from '../../kit';
import { minderIcon } from '../art/icons';
import { MergeIcon } from '../art/MergeIcon';
import { CHAIN_IDS } from '../art/palette';
import { S } from '../strings';
import { busyHand, useMergeUi } from '../uiState';
import { useAdFree, useMerge } from '../useMerge';
import { awayView, type OfflineRecord } from './awayLines';
import { Btn, Card, INK, MergeSheet, Txt, useType } from './parts';

/** The rules' multiplier of the away ad (EngineMode.offlineAdMultiplier: 1 + merge.ads.awayBonus). */
function adMultiplier(cfg: R.MergeConfig): number {
  try {
    const m = engineFor(cfg)?.offlineAdMultiplier?.(cfg);
    return typeof m === 'number' && Number.isFinite(m) ? m : 1;
  } catch {
    return 1;
  }
}

export function AwayReport() {
  const offline = useGame((s) => s.offline) as OfflineRecord | null;
  const cfg = useGame((s) => s.cfg) as R.MergeConfig;
  const awayCap = useMerge((c, g) => {
    try {
      return R.mergeParams(c, g).awayCap;
    } catch {
      return null;
    }
  }, null);
  const busy = useMergeUi((s) => busyHand(s));
  const otherSheet = useMergeUi((s) => s.sheet !== null && s.sheet.type !== 'away');
  const view = useMemo(() => (offline && R.isMerge(cfg) ? awayView(cfg, offline, adMultiplier(cfg), awayCap) : null), [offline, cfg, awayCap]);
  const [presented, setPresented] = useState(false);

  // An absence the rules call empty: nothing to show; the record is cleared through the shared collect (it pays 0).
  useEffect(() => {
    if (offline && R.isMerge(cfg) && !view) void mergeActions.collectAway(false);
  }, [offline, cfg, view]);

  // It opens by itself: never under a finger or an armed good, never over another sheet (3.1, 4.4).
  useEffect(() => {
    if (!view) {
      if (presented) {
        setPresented(false);
        if (useMergeUi.getState().sheet?.type === 'away') useMergeUi.getState().closeSheet();
      }
      return;
    }
    if (!presented && !busy && !otherSheet) {
      setPresented(true);
      useMergeUi.getState().openSheet({ type: 'away' });
    }
  }, [view, presented, busy, otherSheet]);

  const shown = useRef<typeof view>(null);
  if (view) shown.current = view;
  const v = view ?? shown.current;
  return <AwaySheet visible={presented && !!view} view={v} />;
}

function AwaySheet({ visible, view }: { visible: boolean; view: ReturnType<typeof awayView> }) {
  const ty = useType();
  const adReady = useRewardedReady();
  const free = useAdFree();
  const [busy, setBusy] = useState(false);
  const collect = (withAd: boolean) => {
    if (busy) return;
    setBusy(true);
    void mergeActions.collectAway(withAd).finally(() => setBusy(false));
  };
  if (!view) return null;
  return (
    <MergeSheet
      visible={visible}
      onClose={() => collect(false)}
      title={S.hints.away.title}
      icon="art:purse"
      footer={
        <>
          <Btn label={S.hints.away.collect} price={view.amount ?? undefined} onPress={() => collect(false)} enabled={!busy} />
          {view.withAd ? (
            <Btn kind="ad" label={free ? S.hints.away.adFree(view.adPercent) : S.hints.away.ad(view.adPercent)} price={view.withAd} onPress={() => collect(true)} enabled={adReady && !busy} sub={adReady ? undefined : S.hints.away.adNotReady} />
          ) : null}
        </>
      }
    >
      <Card icon={view.lead !== null ? minderIcon(view.lead) : `art:gear-${CHAIN_IDS[0]}`} iconSize={36}>
        {view.lines.map((line, i) => (
          <Txt key={i} size={i === 0 ? ty.body : ty.small} color={i === 0 ? INK.text : INK.soft}>
            {line}
          </Txt>
        ))}
      </Card>
      {view.amount ? (
        <View style={styles.amount}>
          <MergeIcon icon="art:coin" size={Math.round(ty.big * 1.4)} />
          <Txt size={Math.round(ty.big * 1.5)} bold color={INK.amber}>
            {S.hints.away.gain(view.amount)}
          </Txt>
        </View>
      ) : null}
    </MergeSheet>
  );
}

const styles = StyleSheet.create({
  amount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 },
});
