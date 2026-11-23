/**
 * Selecting from the decree game in the shared store (AGENTS.md: select the few values a component
 * shows; the game changes ten times a second). `useDecree(fn, fallback)` calls `fn` with the decree
 * config and game, or returns `fallback` outside a decree game; it must return a primitive or a
 * reference the rules keep stable (the desk item: the tick returns the same object while it does not
 * change). `useDecreeShallow` compares a small object or array by its entries. A selector whose rule
 * is not built yet (NotBuiltError) or throws gives `fallback`, so a placeholder never shows a red screen.
 *
 * Written by the skeleton; owned afterwards by the bars, sheets and views package (P7).
 */
import { useShallow } from 'zustand/react/shallow';
import * as R from '../../engine/decree';
import { useGame } from '../../state/store';

function pick<T>(fn: (cfg: R.DecreeConfig, g: R.DecreeGame) => T, fallback: T) {
  return (s: { cfg: unknown; game: unknown }): T => {
    const cfg = s.cfg as R.DecreeConfig;
    const g = s.game as R.DecreeGame;
    if (!R.isDecree(cfg) || !g.decree) return fallback;
    try {
      return fn(cfg, g);
    } catch {
      return fallback;
    }
  };
}

export function useDecree<T>(fn: (cfg: R.DecreeConfig, g: R.DecreeGame) => T, fallback: T): T {
  return useGame(pick(fn, fallback));
}

export function useDecreeShallow<T extends object>(fn: (cfg: R.DecreeConfig, g: R.DecreeGame) => T, fallback: T): T {
  return useGame(useShallow(pick(fn, fallback)));
}

/** The decree config, or null outside a decree game (it does not change while the game runs). */
export function useDecreeCfg(): R.DecreeConfig | null {
  return useGame((s) => (R.isDecree(s.cfg) ? s.cfg : null));
}
