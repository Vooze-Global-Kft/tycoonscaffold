/**
 * Moments in the scene that the player causes, passed between the two halves of the scene: the
 * play layer (taps, buttons) announces them, the world (the drawing) animates them. Things the
 * simulation does on its own arrive through `simEvents` (src/state/events.ts) instead.
 *
 * A plain emitter: these must not re-render React.
 */
export type SceneMoment =
  /** The service bell was rung (the store action has already run). */
  | { type: 'bell' }
  /** The player tapped a station to run it by hand. */
  | { type: 'tapStation'; businessId: string }
  /** The player tapped the floor at this point of the scene (scene coordinates). */
  | { type: 'tapFloor'; x: number; y: number }
  /** The rush skill was started. */
  | { type: 'rush' };

type Listener = (m: SceneMoment) => void;
const listeners = new Set<Listener>();

export const sceneBus = {
  emit(m: SceneMoment): void {
    listeners.forEach((l) => l(m));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
