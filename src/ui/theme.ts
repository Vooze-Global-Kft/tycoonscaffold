import { useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { gameAssets } from '../config/game';
import type { GameConfig } from '../config/schema';
import type { Stage } from '../engine/chain';
import { useGame } from '../state/store';

import { inkOf } from './colors';

export { contrast, inkOf, textOn } from './colors';

/** Name the game's display font is registered under (see App.tsx). */
export const DISPLAY_FONT = 'GameDisplay';

type ThemeColors = GameConfig['theme']['colors'];
const readable = new WeakMap<ThemeColors, ThemeColors>();

/**
 * The game's colours with `textMuted` made readable (4.5:1) on the cream or dark background and on
 * cards: muted text is small text, and a palette's soft grey often misses that by a little.
 */
function readableColors(colors: ThemeColors): ThemeColors {
  let out = readable.get(colors);
  if (!out) {
    out = { ...colors, textMuted: inkOf(inkOf(colors.textMuted, colors.background), colors.backgroundAlt, 4.0) };
    readable.set(colors, out);
  }
  return out;
}

/** Colours, radius, strings and fonts for the active game. */
export function useTheme() {
  const cfg = useGame((s) => s.cfg);
  const hasFont = Boolean(cfg.theme.displayFont && gameAssets[cfg.theme.displayFont]);
  // Custom fonts carry their own weight; asking for bold on top makes Android fall back to the system font.
  const display: TextStyle = hasFont ? { fontFamily: DISPLAY_FONT, fontWeight: 'normal' } : { fontWeight: '900' };
  return { ...cfg.theme, strings: cfg.strings, c: readableColors(cfg.theme.colors), display };
}

/** How one stage of the chain shows on screen: always its icon AND its colour, never colour alone. */
export interface StageInfo {
  stage: Stage;
  name: string;
  icon: string;
  color: string;
}

export const STAGES: readonly Stage[] = ['production', 'transport', 'sales'];

/** Name, icon and colour of the three stages. In a classic game only `production` means anything. */
export function stageInfo(cfg: GameConfig): Record<Stage, StageInfo> {
  const colors = cfg.theme.colors.stages;
  const sim = cfg.sim;
  return {
    production: { stage: 'production', name: sim?.production.name ?? 'Production', icon: sim?.production.icon ?? cfg.theme.heroIcon, color: colors.production },
    transport: { stage: 'transport', name: sim?.transport.name ?? 'Transport', icon: sim?.transport.icon ?? '🚚', color: colors.transport },
    sales: { stage: 'sales', name: sim?.sales.name ?? 'Sales', icon: sim?.sales.icon ?? '🛒', color: colors.sales },
  };
}

export function useStages(): Record<Stage, StageInfo> {
  const cfg = useGame((s) => s.cfg);
  return useMemo(() => stageInfo(cfg), [cfg]);
}

/**
 * Colour and label of a card rarity. The same four colours everywhere a rarity shows. These are
 * fills (frames, pills, glows): a rarity name or number set in its colour goes through
 * rarityInk(rarity, background), and a label on a filled pill uses textOn(fill).
 */
export const RARITY_COLORS = { common: '#B7AC9C', rare: '#3C8AE0', epic: '#9A4BDD', legendary: '#FFAE22' } as const;

/** A rarity's colour as readable text (4.5:1) on `background`. */
export function rarityInk(rarity: keyof typeof RARITY_COLORS, background: string): string {
  return inkOf(RARITY_COLORS[rarity], background);
}
export const RARITY_NAMES = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Adds alpha to a #RRGGBB colour. */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.slice(0, 7) + v;
}
