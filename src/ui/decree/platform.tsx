/**
 * What makes the desk behave as a phone app (spec 4.4, 2.7, 2.15, 3.1), mounted once by the overlays
 * (./overlays/Overlays.tsx, the PLATFORM block) as `<PlatformLayer layout={layout} />`:
 * - Android back (4.4, ./back.ts `onBack`): an armed strip, the in-tray peek, a sheet, a full-screen
 *   view (Election Night jumps to its result first), in that order; the away report first, collected
 *   without the ad; it leaves the app only from the bare desk, committing a pending take-back.
 * - The app's life (./back.ts `onAppState`): to the background, a pending take-back commits and the
 *   game is saved. Back in the foreground App.tsx's handler runs the shared offline path once
 *   (store.resume); nothing here listens for it.
 * - The pen (./PenPointer.tsx `PenLayer`, 3.1).
 * - The away report (./sheets/AwayReport.tsx, 2.15), driven by the shared store's `offline`.
 * - The music (spec 6): "The Middling March" (music_campaign) from the call to the end of election
 *   night, the desk loop otherwise (the shared player's additive `fx.music.choose`).
 * Owned by the hints and platform package (PLATFORM).
 */
import { useEffect } from 'react';
import { AppState, BackHandler } from 'react-native';
import { fx } from '../../services/fx';
import { onAppState, onBack } from './back';
import type { DeskLayout } from './layout';
import { PenLayer } from './PenPointer';
import { AwayReport } from './sheets/AwayReport';
import { useDecree } from './useDecree';

/** The loops of spec 6: the march from the call to the end of election night, the desk loop otherwise. */
const CAMPAIGN_LOOP = 'music_campaign';
const DESK_LOOP = 'music_main';

function useCampaignMusic(): void {
  const campaign = useDecree((_c, g) => g.decree.phase === 'campaign' || g.decree.phase === 'count', false);
  useEffect(() => {
    fx.music.choose?.(campaign ? CAMPAIGN_LOOP : DESK_LOOP);
  }, [campaign]);
}

function useAndroidBack(): void {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);
}

function useAppLife(): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, []);
}

/** The platform pieces of the desk screen: Android back, the app's life, the pen, the away report. */
export function PlatformLayer({ layout }: { layout: DeskLayout }) {
  useAndroidBack();
  useAppLife();
  useCampaignMusic();
  return (
    <>
      <PenLayer layout={layout} />
      <AwayReport />
    </>
  );
}
