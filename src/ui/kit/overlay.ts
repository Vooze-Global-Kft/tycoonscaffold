import { useEffect, useSyncExternalStore } from 'react';
import { overlays } from '../../state/overlays';

/**
 * Tells the app that a full-screen overlay which is NOT built on Sheet is showing (the chest
 * opening, a custom dialog), so offers, story dialogs, the tutorial hand and the flying bonus wait.
 */
export function useOverlay(visible: boolean): void {
  useEffect(() => (visible ? overlays.enter() : undefined), [visible]);
}

/** How many dialogs and overlays are showing; re-renders when that changes. */
export function useOverlaysOpen(): number {
  return useSyncExternalStore(overlays.subscribe, overlays.count, overlays.count);
}
