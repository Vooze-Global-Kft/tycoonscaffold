/**
 * What makes the merge screen behave as a phone app (spec 4.5, 3.1, 2.9), mounted once by the
 * overlays (./overlays/Overlays.tsx, the PLATFORM block) as `<PlatformLayer layout={layout} />`:
 * - Android back (4.5): closes the top layer in the order armed tap-tap, long-press chip, undo chip
 *   (put away, not undone), sheet, spoke (uiState `closeTop`); the away report first, collected
 *   without the ad (as the second game's Shift Log). It leaves the app only from the bare board.
 *   A kit or merge sheet that is a native Modal gets the key itself (its onRequestClose).
 * - The firefly's layer (./FireflyPointer.tsx `FireflyLayer`, 3.1).
 * - The away report (./sheets/AwayReport.tsx, M8), driven by the shared store's `offline`: the
 *   app's foreground handler (src/ui/App.tsx → store.resume) runs the shared offline path once per
 *   return, so nothing here listens to AppState itself.
 * Owned by the hints and platform package (docs/design/market-build-plan.md).
 */
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { FireflyLayer } from './FireflyPointer';
import type { MergeLayout } from './layout';
import { AwayReport } from './sheets/AwayReport';
import { onBack } from './back';

function useAndroidBack(): void {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);
}

/** The platform pieces of the main screen: Android back, the firefly, the away report. */
export function PlatformLayer({ layout }: { layout: MergeLayout }) {
  useAndroidBack();
  return (
    <>
      <FireflyLayer layout={layout} />
      <AwayReport />
    </>
  );
}
