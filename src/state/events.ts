import type { GameEvent } from '../engine/economy';

/**
 * What the simulation did during a tick, pushed to whoever draws or plays it
 * (the scene spawns effects, the feedback layer plays sounds). This is a plain
 * emitter rather than store state on purpose: events arrive many times a
 * second and must not cause React re-renders.
 *
 * The array passed to listeners is reused: read it during the call, never keep it.
 */
type Listener = (events: readonly GameEvent[]) => void;

const listeners = new Set<Listener>();

export const simEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(events: readonly GameEvent[]): void {
    if (events.length === 0) return;
    listeners.forEach((l) => l(events));
  },
};
