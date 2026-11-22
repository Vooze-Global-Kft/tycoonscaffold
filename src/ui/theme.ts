import type { TextStyle } from 'react-native';
import { gameAssets } from '../config/game';
import { useGame } from '../state/store';

/** Name the game's display font is registered under (see App.tsx). */
export const DISPLAY_FONT = 'GameDisplay';

/** Colours, radius, strings and fonts for the active game. */
export function useTheme() {
  const cfg = useGame((s) => s.cfg);
  const hasFont = Boolean(cfg.theme.displayFont && gameAssets[cfg.theme.displayFont]);
  // Custom fonts carry their own weight; asking for bold on top makes Android fall back to the system font.
  const display: TextStyle = hasFont ? { fontFamily: DISPLAY_FONT, fontWeight: 'normal' } : { fontWeight: '900' };
  return { ...cfg.theme, strings: cfg.strings, c: cfg.theme.colors, display };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Adds alpha to a #RRGGBB colour. */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.slice(0, 7) + v;
}
