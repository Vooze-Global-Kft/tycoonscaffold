/**
 * Selecting from the merge game in the shared store (AGENTS.md: select the few values a component
 * shows; the game changes ten times a second). `useMerge(fn, fallback)` calls `fn` with the merge
 * config and game, or returns `fallback` outside a merge game; it must return a primitive or a
 * reference the rules keep stable (the board array, a counter: the tick returns the same objects
 * while they do not change). `useMergeShallow` compares a small object or array by its entries.
 *
 * Written by the skeleton; owned afterwards by the bars, sheets and spokes package.
 */
import { useShallow } from 'zustand/react/shallow';
import * as R from '../../engine/merge';
import { useGame } from '../../state/store';

function pick<T>(fn: (cfg: R.MergeConfig, g: R.MergeGame) => T, fallback: T) {
  return (s: { cfg: unknown; game: unknown }): T => {
    const cfg = s.cfg as R.MergeConfig;
    const g = s.game as R.MergeGame;
    return R.isMerge(cfg) && g.merge ? fn(cfg, g) : fallback;
  };
}

export function useMerge<T>(fn: (cfg: R.MergeConfig, g: R.MergeGame) => T, fallback: T): T {
  return useGame(pick(fn, fallback));
}

export function useMergeShallow<T extends object>(fn: (cfg: R.MergeConfig, g: R.MergeGame) => T, fallback: T): T {
  return useGame(useShallow(pick(fn, fallback)));
}
