import { useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { gameAssets } from '../config/game';
import type { GameConfig } from '../config/schema';
import type { Stage } from '../engine/chain';
import { useGame } from '../state/store';

export { contrast, inkOf, textOn } from './colors';

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

/** Colour and label of a card rarity. The same four colours everywhere a rarity shows. */
export const RARITY_COLORS = { common: '#B7AC9C', rare: '#3C8AE0', epic: '#9A4BDD', legendary: '#FFAE22' } as const;
export const RARITY_NAMES = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Adds alpha to a #RRGGBB colour. */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.slice(0, 7) + v;
}
