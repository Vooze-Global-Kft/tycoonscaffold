/**
 * "Something just landed on this header counter": the fly layer announces it when its first coin
 * or gem arrives, and the counter gives a small pulse. A plain emitter so nothing re-renders.
 */
type Listener = (target: string) => void;
const listeners = new Set<Listener>();

export const counterPulse = {
  emit(target: string): void {
    listeners.forEach((l) => l(target));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
