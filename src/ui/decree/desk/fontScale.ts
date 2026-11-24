/**
 * The system's font scale for the desk's words (spec 4.1: text at s = min(fontScale, 1.3), sized by hand
 * with allowFontScaling={false}). The web twin (./fontScale.web.ts) also reads `?fs=1.3` from the page
 * address, since a browser always reports 1. Owned by the desk package.
 */
import { useWindowDimensions } from 'react-native';

export function useDeskFontScale(): number {
  return useWindowDimensions().fontScale;
}
