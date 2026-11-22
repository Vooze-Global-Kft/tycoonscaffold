/**
 * "Something flies from here to there": coins from a paying table to the cash counter, gems
 * from a claimed mission to the gem pill. Screens only announce the flight; one layer at the
 * top of the app (FlyLayer) draws them all, above every screen.
 *
 *   fly.emit({ kind: 'cash', from: { x, y }, to: 'header:cash', count: 5 });
 *
 * `from` is in window coordinates; `to` is a target key (see ../hints/targets.ts). A plain
 * emitter rather than store state on purpose: flights are frequent and must not re-render screens.
 */
export interface Flight {
  id: number;
  kind: 'cash' | 'gems';
  from: { x: number; y: number };
  /** Target key the pieces fly to, normally 'header:cash' or 'header:gems'. */
  to: string;
  /** How many pieces to draw (the layer caps it). */
  count: number;
}

type Listener = (flight: Flight) => void;

const listeners = new Set<Listener>();
let seq = 0;

export const fly = {
  emit(flight: Omit<Flight, 'id'>): void {
    if (listeners.size === 0) return;
    const f: Flight = { ...flight, id: ++seq };
    listeners.forEach((l) => l(f));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
