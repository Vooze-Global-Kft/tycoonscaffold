/**
 * What a mode with its own engine (src/engine/mode.ts) reported during a tick: its own event
 * objects (haul: HaulEvent), pushed to its listeners (the mode's sounds, the scene's effects).
 * The sim and classic engines report through ./events.ts (simEvents) instead. A plain emitter,
 * like simEvents: events arrive ten times a second and must not cause React re-renders. Each
 * listener gets a fresh array nobody writes to afterwards; a listener that throws is reported and
 * skipped.
 */
type Listener = (events: readonly unknown[]) => void;

const listeners = new Set<Listener>();
let report: (error: unknown, where: string) => void = () => {};

export const modeEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(events: readonly unknown[]): void {
    if (events.length === 0 || listeners.size === 0) return;
    listeners.forEach((l) => {
      try {
        l(events);
      } catch (e) {
        report(e, 'modeEvents.listener');
      }
    });
  },
  onError(fn: (error: unknown, where: string) => void): void {
    report = fn;
  },
};
