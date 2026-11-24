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
 * It is a pale paper card over the dimmed desk (not a native Modal: the kit Sheet's theme colours are
 * the shell's, not the desk's) and registers with the overlay manager (useOverlay).
 * Owned by the hints and platform package (PLATFORM); mounted by ../platform.tsx.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { engineFor } from '../../../engine/mode';
import * as R from '../../../engine/decree';
import { decreeActions } from '../../../modes/decree/actions';
import { useGame } from '../../../state/store';
import { useOverlay, useRewardedReady } from '../../kit';
import { DESK } from '../art/palette';
import { DecreeIcon } from '../art/DecreeIcon';
import { awayView, type AwayView, type OfflineRecord } from '../away';
import { useFontScale } from '../hud/fontScale';
import { FONT_SCALE_MAX } from '../layout';
import { S } from '../strings';
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

  const shown = useRef<AwayView | null>(null);
  if (view) shown.current = view;
  const visible = presented && !!view;
  useOverlay(visible);
  if (!visible || !shown.current) return null;
  return <AwayCard view={shown.current} />;
}

function AwayCard({ view }: { view: AwayView }) {
  const s = Math.min(useFontScale(), FONT_SCALE_MAX);
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
  const f = (n: number) => Math.round(n * s);
  const ad = view.ad;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={() => close(false)} accessibilityRole="button" accessibilityLabel={S.platform.away.back} />
      <View style={styles.centre} pointerEvents="box-none">
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.head}>
            <DecreeIcon icon="art:ad_away" size={f(30)} />
            <Text allowFontScaling={false} style={[styles.title, { fontSize: f(19), lineHeight: f(25) }]} numberOfLines={1}>
              {S.platform.away.title}
            </Text>
          </View>
          <View style={styles.rule} />
          {view.lines.map((line, i) => (
            <Text key={i} allowFontScaling={false} style={[styles.body, { fontSize: f(15), lineHeight: f(21) }]}>
              {line}
            </Text>
          ))}
          {view.amount ? (
            <View style={styles.amountRow}>
              <DecreeIcon icon="art:fx_coin" size={f(24)} />
              <Text allowFontScaling={false} style={[styles.amount, { fontSize: f(24), lineHeight: f(30) }]} numberOfLines={1}>
                {view.amount}
              </Text>
              <Text allowFontScaling={false} style={[styles.small, { fontSize: f(12), lineHeight: f(16) }]} numberOfLines={1}>
                {S.platform.away.inTreasury}
              </Text>
            </View>
          ) : null}
          {view.capped ? (
            <Text allowFontScaling={false} style={[styles.small, { fontSize: f(12), lineHeight: f(17) }]}>
              {view.capped}
            </Text>
          ) : null}
          {view.quip ? (
            <Text allowFontScaling={false} style={[styles.quip, { fontSize: f(13), lineHeight: f(18) }]}>
              {view.quip}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            {ad === 'closed' ? (
              <View style={[styles.button, styles.closedButton]}>
                <Text allowFontScaling={false} style={[styles.closedText, { fontSize: f(13) }]} numberOfLines={1}>
                  {S.platform.away.closedRunUp}
                </Text>
              </View>
            ) : ad ? (
              <Pressable
                onPress={() => close(true)}
                disabled={busy || !adReady}
                accessibilityRole="button"
                accessibilityLabel={adFree ? S.platform.away.adFree(ad.pct) : S.platform.away.ad(ad.pct)}
                style={({ pressed }) => [styles.button, styles.adButton, (!adReady || busy) && styles.dim, pressed && styles.pressed]}
              >
                <Text allowFontScaling={false} style={[styles.adText, { fontSize: f(15) }]} numberOfLines={1}>
                  {adFree ? S.platform.away.adFree(ad.pct) : S.platform.away.ad(ad.pct)}
                </Text>
                <Text allowFontScaling={false} style={[styles.adSub, { fontSize: f(12) }]} numberOfLines={1}>
                  {adReady ? S.platform.away.gain(ad.extra) : S.platform.away.adNotReady}
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => close(false)} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.button, styles.backButton, pressed && styles.pressed]}>
              <Text allowFontScaling={false} style={[styles.backText, { fontSize: f(15) }]} numberOfLines={1}>
                {S.platform.away.back}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 30, 26, 0.62)',
  },
  centre: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    alignSelf: 'stretch',
    maxWidth: 420,
    marginHorizontal: 'auto',
    backgroundColor: DESK.paperLight,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DESK.paperEdge,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: DESK.violet, fontWeight: '700' },
  rule: {
    height: 1,
    backgroundColor: DESK.violet,
    opacity: 0.45,
    marginBottom: 2,
  },
  body: { color: DESK.line },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  amount: {
    color: DESK.mustardDeep,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  small: { color: DESK.slateDeep, flexShrink: 1 },
  quip: { color: DESK.slateDeep, fontStyle: 'italic' },
  buttons: { gap: 8, marginTop: 6 },
  button: {
    minHeight: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adButton: { backgroundColor: DESK.violet },
  adText: { color: DESK.paperLight, fontWeight: '700' },
  adSub: { color: DESK.violetPale, fontVariant: ['tabular-nums'] },
  backButton: {
    borderWidth: 1.5,
    borderColor: DESK.slate,
    backgroundColor: 'transparent',
  },
  backText: { color: DESK.slateDeep, fontWeight: '700' },
  closedButton: { backgroundColor: DESK.slatePale },
  closedText: { color: DESK.slateDeep },
  dim: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
});
