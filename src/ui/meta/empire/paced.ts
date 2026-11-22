/**
 * Slow reads of fast state. The store's `game` changes ten times a second; incomes, lifetime totals
 * and "how close am I" bars only need to move about once a second. `usePaced` samples the store on
 * an interval and re-renders only when the sampled value really changed, so lists and cards stay
 * still between samples. (Polling data, not animating: motion stays on the UI thread.)
 */
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../../state/store';

export type StoreState = ReturnType<typeof useGame.getState>;

export function usePaced<T>(read: (s: StoreState) => T, ms = 1000, equal: (a: T, b: T) => boolean = Object.is): T {
  const readRef = useRef(read);
  readRef.current = read;
  const equalRef = useRef(equal);
  equalRef.current = equal;
  const [value, setValue] = useState(() => read(useGame.getState()));
  useEffect(() => {
    const sample = () => {
      const next = readRef.current(useGame.getState());
      setValue((prev) => (equalRef.current(prev, next) ? prev : next));
    };
    sample();
    const timer = setInterval(sample, ms);
    return () => clearInterval(timer);
  }, [ms]);
  return value;
}

/** Numbers sampled for display: equal when they would print the same to about three digits. */
export function closeEnough(a: number, b: number): boolean {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= Math.abs(b) * 0.001;
}
