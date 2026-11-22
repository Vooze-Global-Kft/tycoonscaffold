/**
 * Selecting from the haul run in the shared store (AGENTS.md: select the few values a component
 * shows; the game changes ten times a second). `useRun(fn)` calls `fn` with the haul config and
 * run, or returns `fallback` outside a haul run; it must return a primitive. `useRunShallow(fn)` may
 * return a small object or array (nested too): it keeps the previous result while the new one is
 * equal by value (a structural compare, no string building), so the component re-renders only
 * when what it shows changed. With `paused` true (a full-screen spoke covers the layer) it does not
 * even call `fn` and keeps what it last returned, so nothing hidden re-renders.
 *
 * `runParams(cfg, g)`: the rules' derived numbers (H.haulParams) computed once per state object.
 * The store replaces the game object at every change, so a WeakMap keyed by it is exact: every
 * selector of one store change shares one computation, and old states are collected.
 */
import { useRef } from 'react';
import * as H from '../../engine/haul';
import { useGame } from '../../state/store';
import { sameValue } from './scene/sameValue';

export { sameValue };

type Run = H.HaulGame & { haul: H.HaulState };

const paramsOf = new WeakMap<object, { cfg: H.HaulConfig; p: H.HaulParams }>();

/** H.haulParams for this exact state object, computed once (see above). */
export function runParams(cfg: H.HaulConfig, g: Run): H.HaulParams {
  const hit = paramsOf.get(g);
  if (hit && hit.cfg === cfg) return hit.p;
  const p = H.haulParams(cfg, g);
  paramsOf.set(g, { cfg, p });
  return p;
}

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

export function useRunShallow<T extends object | null>(fn: (cfg: H.HaulConfig, g: Run) => T, fallback: T, paused = false): T {
  const last = useRef<{ value: T } | null>(null);
  const select = pick(fn, fallback);
  return useGame((s) => {
    if (paused && last.current) return last.current.value;
    const value = select(s);
    if (last.current && sameValue(last.current.value, value)) return last.current.value;
    last.current = { value };
    return value;
  });
}
