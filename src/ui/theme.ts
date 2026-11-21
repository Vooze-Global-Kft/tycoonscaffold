import { useGame } from '../state/store';

/** Colours, radius and strings for the active game. */
export function useTheme() {
  const cfg = useGame((s) => s.cfg);
  return { ...cfg.theme, strings: cfg.strings, c: cfg.theme.colors };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Adds alpha to a #RRGGBB colour. */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.slice(0, 7) + v;
}
