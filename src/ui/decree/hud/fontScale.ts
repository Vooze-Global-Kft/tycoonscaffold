/**
 * The font scale the decree bars and sheets size their text by (spec 4.1: s = min(fontScale, 1.3),
 * text with allowFontScaling={false}). On phones it is the system's; the web preview's twin
 * (./fontScale.web.ts) also reads `?fs=1.3`, because a browser always reports 1 and the 1.3 check of
 * 10.1 must be looked at. Any decree package may use it. Owned by the bars package (BARS).
 */
import { useWindowDimensions } from 'react-native';

export function useFontScale(): number {
  return useWindowDimensions().fontScale;
}
