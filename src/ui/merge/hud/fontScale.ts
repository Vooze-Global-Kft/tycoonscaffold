/**
 * The font scale the merge screens size their text by (spec 4.1: the bars and sheets are sized by
 * hand from `useWindowDimensions().fontScale`, with allowFontScaling={false}). On phones it is the
 * system's; the web preview's twin (./fontScale.web.ts) also reads `?fs=1.3` (the same switch as the spokes'), because a
 * browser always reports 1 and the 1.3 check of 10.1 must be looked at.
 * Owned by the bars package (BARS, 7a).
 */
import { useWindowDimensions } from 'react-native';

export function useFontScale(): number {
  return useWindowDimensions().fontScale;
}
