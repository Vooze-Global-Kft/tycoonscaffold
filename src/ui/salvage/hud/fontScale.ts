/**
 * The font scale the salvage bars and cards size their text by (yard-stage1.md 4.1: min(fontScale, 1.3)
 * applied by hand, text with allowFontScaling={false}). On phones it is the system's; the web preview's twin
 * (./fontScale.web.ts) also reads `?fontScale=1.3` (or `?fs=`), because a browser always reports 1.
 * Owned by the hud; any salvage screen may use it.
 */
import { useWindowDimensions } from 'react-native';

export function useFontScale(): number {
  return useWindowDimensions().fontScale;
}
