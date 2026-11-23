/**
 * Web preview twin of ./fontScale.ts: the system's font scale, or `?fontScale=<n>` from the page
 * address (a browser reports 1, so the 1.3 check of spec 10.1 needs the switch). Web only: Metro
 * takes ./fontScale.ts for iOS and Android. Owned by the bars package (BARS, 7a).
 */
import { useWindowDimensions } from 'react-native';

function fromAddress(): number | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const v = Number(new URLSearchParams(window.location.search).get('fontScale'));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

const override = fromAddress();

export function useFontScale(): number {
  const { fontScale } = useWindowDimensions();
  return override ?? fontScale;
}
