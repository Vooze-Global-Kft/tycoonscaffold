/**
 * Selecting from the haul run in the shared store (AGENTS.md: select the few values a component
 * shows; the game changes ten times a second). `useRun(fn)` calls `fn` with the haul config and
 * run, or returns `fallback` outside a haul run; it must return a primitive. `useRunShallow(fn)` may
 * return a small object or array (nested too): it keeps the previous result while the new one is
 * equal by value, so the component re-renders only when what it shows changed.
 * `useHaulFrame()` is the scene's per-tick input (spec 4.3): a shared value the frame worklet reads.
 */
import { useEffect, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import * as H from '../../engine/haul';
import type { HaulFrame } from '../../engine/haulMode';
import { modeFrame } from '../../state/modeEvents';
import { publishModeFrame, useGame } from '../../state/store';

export type { HaulFrame };

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

export function useRunShallow<T extends object | null>(fn: (cfg: H.HaulConfig, g: Run) => T, fallback: T): T {
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

/**
 * The scene's frame (spec 4.3) as a Reanimated shared value: the route table (slot, ring, angle,
 * distance, trip, drones n, routeFrom), the run clock `clock` at wall time `at` (ms), the rack, the
 * freighter phase and the seams. The store publishes one after every tick and every action
 * (src/state/store.ts, src/engine/haulMode.ts `haulFrame`); this hook copies it into the shared
 * value in the listener, so the component never re-renders for it. Null while no run exists.
 *
 * In the frame worklet: `const f = frame.value; const clock = f.clock + (now - f.at) / 1000`, with
 * `now` the frame clock's wall time (Date.now() is a plain JS call: read it on the JS side and pass
 * it in, or use the frame callback's timestamp against `f.at` captured on the same clock).
 */
export function useHaulFrame(): SharedValue<HaulFrame | null> {
  const frame = useSharedValue<HaulFrame | null>((modeFrame.latest() as HaulFrame | null) ?? null);
  useEffect(() => {
    const off = modeFrame.subscribe((f) => {
      frame.value = (f as HaulFrame | null) ?? null;
    });
    // A scene that mounts between two changes gets the current state at once.
    publishModeFrame();
    return off;
  }, [frame]);
  return frame;
}
