/**
 * Time, as the fx service sees it. Everything that waits or measures takes a
 * Clock, so the logic runs unchanged under fake timers in tests.
 */
export interface Clock {
  /** Milliseconds on a clock that only moves forward. */
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const perf = (globalThis as { performance?: { now?: () => number } }).performance;

export const systemClock: Clock = {
  // performance.now() does not jump when the phone's clock is corrected; Date.now() can.
  now: typeof perf?.now === 'function' ? () => perf.now!() : () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
