/**
 * The away report (spec 2.15, 4.4, 5.11): on return, the rules' report in the specification's words
 * ("While you were out (2 h 10 m): the ministries collected 14.2K dibs. 10 visitors are waiting.").
 * The earnings are ALREADY in the treasury when it opens (`paysOnCompute`, lesson 5), so it says
 * "collected" and "Already in the treasury", never "collect". "Watch ad: +50 %" grants the extra
 * (earnings × (offlineAdMultiplier − 1), the rules' multiplier, never typed) when the ad completes;
 * from the call to the end of election night it shows "Closed during the run-up" in its place.
 * The words and figures: ../away.ts `awayView` (pure, tested).
 *
 * Data: the shared store's `offline` (App.tsx's foreground handler runs the shared offline path once
 * per return: store.resume → EngineMode.offline → decreeOffline; two reports of one absence are merged
 * there by the rules' mergeAwayReports, so they show as one). Closing goes through
 * `decreeActions.collectAway` (the shared collectOffline: with the ad it adds the extra; without, nothing).
 * - It opens by itself, so it waits while a finger is down or a strip is armed (3.1), and while
 *   another sheet or a view is open (one at a time, 4.4); then it holds uiState's sheet `away`.
 * - Nothing at all for an absence the rules call empty; the report alone when papers arrived and
 *   nothing was earned.
 * - "Back to the desk", a tap on the dimmed desk and Android back (../back.ts) close it without the ad.
 * - Killing the app with it open loses nothing: the earnings were saved in the treasury already.
 * Built on the bars package's DecreeSheet (./parts.tsx: pale paper, slides up, registers with the
 * overlay manager, plays ui_open / ui_close), not the kit Sheet (its theme colours are the shell's).
 * Owned by the hints and platform package (PLATFORM); mounted by ../platform.tsx.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { engineFor } from '../../../engine/mode';
import * as R from '../../../engine/decree';
import { decreeActions } from '../../../modes/decree/actions';
import { useGame } from '../../../state/store';
import { useRewardedReady } from '../../kit';
import { DecreeIcon } from '../art/DecreeIcon';
import { awayView, type AwayView, type OfflineRecord } from '../away';
import { S } from '../strings';
import { Btn, Card, DecreeSheet, INK, Txt, useType } from './parts';
import { busyHand, useDecreeUi } from '../uiState';

/** The engine's multiplier of the away ad (EngineMode.offlineAdMultiplier), 1 when there is none. */
function adMultiplier(cfg: R.DecreeConfig): number {
  try {
    const m = engineFor(cfg)?.offlineAdMultiplier?.(cfg);
    return typeof m === 'number' && Number.isFinite(m) ? m : 1;
  } catch {
    return 1;
  }
}

/** The rules' answer to "may the away ad be offered now" (nothing from the call to the end of election night). */
function adAllowedNow(cfg: R.DecreeConfig, g: R.DecreeGame): boolean {
  try {
    return R.canWatchAd(cfg, g, 'awayBonus');
  } catch {
    return false;
  }
}

export function AwayReport() {
  const offline = useGame((s) => s.offline) as OfflineRecord | null;
  const cfg = useGame((s) => s.cfg) as R.DecreeConfig;
  // The phase decides "Closed during the run-up"; read it alone (the game changes ten times a second).
  const phase = useGame((s) => (s.game as R.DecreeGame).decree?.phase ?? null);
  const busy = useDecreeUi((s) => busyHand(s));
  const otherOpen = useDecreeUi((s) => (s.sheet !== null && s.sheet.type !== 'away') || s.view !== null);
  const view = useMemo(() => {
    if (!offline || !R.isDecree(cfg)) return null;
    const g = useGame.getState().game as R.DecreeGame;
    if (!g.decree) return null;
    return awayView(cfg, g, offline, adMultiplier(cfg), adAllowedNow(cfg, g));
    // phase: the ad's offer changes with it.
  }, [offline, cfg, phase]);
  const [presented, setPresented] = useState(false);

  // An absence the rules call empty: nothing to show; the record is cleared through the shared collect (it adds nothing).
  useEffect(() => {
    if (offline && R.isDecree(cfg) && !view) void decreeActions.collectAway(false);
  }, [offline, cfg, view]);

  // It opens by itself: never under a finger or an armed strip, never over another sheet or view (3.1, 4.4).
  useEffect(() => {
    if (!view) {
      if (presented) {
        setPresented(false);
        if (useDecreeUi.getState().sheet?.type === 'away') useDecreeUi.getState().closeSheet();
      }
      return;
    }
    if (!presented && !busy && !otherOpen) {
      setPresented(true);
      useDecreeUi.getState().openSheet({ type: 'away' });
    }
  }, [view, presented, busy, otherOpen]);

  // The last view stays while the sheet slides out.
  const shown = useRef<AwayView | null>(null);
  if (view) shown.current = view;
  if (!shown.current) return null;
  return <AwayCard visible={presented && !!view} view={shown.current} />;
}

function AwayCard({ visible, view }: { visible: boolean; view: AwayView }) {
  const ty = useType();
  const adReady = useRewardedReady();
  const adFree = useGame((st) => !!st.game.entitlements?.skipRewarded);
  const [busy, setBusy] = useState(false);
  const close = (withAd: boolean) => {
    if (busy) return;
    setBusy(true);
    void decreeActions.collectAway(withAd).finally(() => {
      setBusy(false);
      if (useDecreeUi.getState().sheet?.type === 'away') useDecreeUi.getState().closeSheet();
    });
  };
  const ad = view.ad;
  return (
    <DecreeSheet
      visible={visible}
      onClose={() => close(false)}
      title={S.platform.away.title}
      icon="art:ad_away"
      footer={
        <>
          {ad === 'closed' ? (
            <Btn label={S.platform.away.closedRunUp} onPress={() => {}} enabled={false} />
          ) : ad ? (
            <Btn
              kind="ad"
              label={adFree ? S.platform.away.adFree(ad.pct) : S.platform.away.ad(ad.pct)}
              price={S.platform.away.gain(ad.extra)}
              onPress={() => close(true)}
              enabled={adReady && !busy}
              sub={adReady ? undefined : S.platform.away.adNotReady}
            />
          ) : null}
          <Btn kind="plain" label={S.platform.away.back} onPress={() => close(false)} enabled={!busy} />
        </>
      }
    >
      <Card icon="art:intray" iconSize={36}>
        {view.lines.map((line, i) => (
          <Txt key={i} size={ty.body} color={i === 0 ? INK.text : INK.soft}>
            {line}
          </Txt>
        ))}
      </Card>
      {view.amount ? (
        <View style={styles.amountRow}>
          <DecreeIcon icon="art:fx_coin" size={Math.round(ty.big * 1.3)} />
          <Txt size={Math.round(ty.big * 1.3)} bold color={INK.money} style={styles.tabular}>
            {view.amount}
          </Txt>
          <Txt size={ty.small} color={INK.soft} style={styles.shrink} lines={1}>
            {S.platform.away.inTreasury}
          </Txt>
        </View>
      ) : null}
      {view.capped ? (
        <Txt size={ty.small} color={INK.soft}>
          {view.capped}
        </Txt>
      ) : null}
      {view.quip ? (
        <Txt size={ty.small} color={INK.soft} style={styles.quip}>
          {view.quip}
        </Txt>
      ) : null}
    </DecreeSheet>
  );
}

const styles = StyleSheet.create({
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4 },
  tabular: { fontVariant: ['tabular-nums'] },
  shrink: { flexShrink: 1 },
  quip: { fontStyle: 'italic', paddingHorizontal: 4, marginTop: 4 },
});
