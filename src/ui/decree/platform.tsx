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
 * Owned by the hints and platform package (PLATFORM).
 */
import { useEffect } from 'react';
import { AppState, BackHandler } from 'react-native';
import { onAppState, onBack } from './back';
import type { DeskLayout } from './layout';
import { PenLayer } from './PenPointer';
import { AwayReport } from './sheets/AwayReport';

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
  return (
    <>
      <PenLayer layout={layout} />
      <AwayReport />
    </>
  );
}
