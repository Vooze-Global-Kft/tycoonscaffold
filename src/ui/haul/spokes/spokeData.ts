/**
 * Selecting for the spokes. The spokes also work between galaxies (a confirmed Jump leaves no run:
 * `haul` is null while `haulStats.pendingJump` waits), so they cannot use `useRun`, which needs a
 * run. `useHaul(fn)` calls `fn` with the haul config and game whenever the game is a haul game, and
 * keeps the previous result while the new one is equal by value (AGENTS.md: the game changes ten
 * times a second; select only what is shown).
 */
import { useRef } from 'react';
import * as H from '../../../engine/haul';
import { useGame } from '../../../state/store';

export function useHaul<T>(fn: (cfg: H.HaulConfig, g: H.HaulGame) => T, fallback: T): T {
  const last = useRef<{ key: string; value: T } | null>(null);
  return useGame((s) => {
    const cfg = s.cfg as H.HaulConfig;
    const value = H.isHaul(cfg) ? fn(cfg, s.game as unknown as H.HaulGame) : fallback;
    const key = JSON.stringify(value);
    if (last.current && last.current.key === key) return last.current.value;
    last.current = { key, value };
    return value;
  });
}

/** The haul config (stable while the game runs). */
export function useHaulCfg(): H.HaulConfig {
  return useGame((s) => s.cfg) as H.HaulConfig;
}
