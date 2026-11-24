/**
 * Web preview twin of ./fontScale.ts: the system's font scale, or `?fs=<n>` (also `?fontScale=`) from
 * the page address (a browser reports 1, so the 1.3 check of spec 10.1 needs the switch). Web only:
 * Metro takes ./fontScale.ts for iOS and Android. Owned by the desk package.
 */
import { useWindowDimensions } from 'react-native';

function fromAddress(): number | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const q = new URLSearchParams(window.location.search);
    const v = Number(q.get('fs') ?? q.get('fontScale'));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

const override = fromAddress();

export function useDeskFontScale(): number {
  const { fontScale } = useWindowDimensions();
  return override ?? fontScale;
}
