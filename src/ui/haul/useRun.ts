/**
 * Selecting from the haul run in the shared store (AGENTS.md: select the few values a component
 * shows; the game changes ten times a second). `useRun(fn)` calls `fn` with the haul config and
 * run, or returns `fallback` outside a haul run; it must return a primitive. `useRunShallow(fn)` may
 * return a small object or array (nested too): it keeps the previous result while the new one is
 * equal by value, so the component re-renders only when what it shows changed.
 */
import { useRef } from 'react';
import * as H from '../../engine/haul';
import { useGame } from '../../state/store';

type Run = H.HaulGame & { haul: H.HaulState };

function pick<T>(fn: (cfg: H.HaulConfig, g: Run) => T, fallback: T) {
  return (s: { cfg: unknown; game: unknown }): T => {
    const cfg = s.cfg as H.HaulConfig;
    const g = s.game as Run;
    return H.isHaul(cfg) && g.haul ? fn(cfg, g) : fallback;
  };
}

export function useRun<T extends string | number | boolean | null>(fn: (cfg: H.HaulConfig, g: Run) => T, fallback: T): T {
  return useGame(pick(fn, fallback));
}

export function useRunShallow<T extends object>(fn: (cfg: H.HaulConfig, g: Run) => T, fallback: T): T {
  const last = useRef<{ key: string; value: T } | null>(null);
  const select = pick(fn, fallback);
  return useGame((s) => {
    const value = select(s);
    const key = JSON.stringify(value);
    if (last.current && last.current.key === key) return last.current.value;
    last.current = { key, value };
    return value;
  });
}
