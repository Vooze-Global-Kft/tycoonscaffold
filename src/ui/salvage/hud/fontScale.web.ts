/**
 * Web preview twin of ./fontScale.ts: the system's font scale, or `?fontScale=<n>` (also `?fs=`) from the
 * page address, so the 1.3 check of yard-stage1.md 4.1 and 4.6 can be looked at. Web only (WEB_ONLY).
 */
import { useWindowDimensions } from 'react-native';

function fromAddress(): number | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const q = new URLSearchParams(window.location.search);
    const v = Number(q.get('fontScale') ?? q.get('fs'));
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
