import type { GameEvent } from '../engine/economy';

/**
 * What the simulation did during a tick, pushed to whoever draws or plays it
 * (the scene spawns effects, the feedback layer plays sounds). This is a plain
 * emitter rather than store state on purpose: events arrive many times a
 * second and must not cause React re-renders.
 *
 * Listeners get a fresh array per tick that nobody writes to afterwards, so
 * keeping it (for example to spread effects over the next frames) is safe.
 * A listener that throws is reported and skipped: it can never stop the other
 * listeners or the game loop.
 */
type Listener = (events: readonly GameEvent[]) => void;

const listeners = new Set<Listener>();
let report: (error: unknown, where: string) => void = () => {};

export const simEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(events: readonly GameEvent[]): void {
    if (events.length === 0 || listeners.size === 0) return;
    listeners.forEach((l) => {
      try {
        l(events);
      } catch (e) {
        report(e, 'simEvents.listener');
      }
    });
  },
  /** Where listener errors go (the store points this at crash reporting). */
  onError(fn: (error: unknown, where: string) => void): void {
    report = fn;
  },
};
