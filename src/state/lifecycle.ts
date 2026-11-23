/**
 * The moments of a session other parts of the app act on without the store knowing them: the
 * reminders are planned when the player leaves and cleared when they are back, a leaderboard score
 * goes out, the rating prompt may be asked for (src/state/session.ts listens). A plain emitter,
 * like simEvents: the store only says what happened.
 *
 * A listener that throws is reported and skipped: it can never stop the store.
 */
export type LifecycleEvent =
  /** The save is loaded and the game is on screen. */
  | 'boot'
  /** The app went to the background (the game is saved). */
  | 'pause'
  /** The app is back in the foreground. */
  | 'resume'
  /** Away earnings were collected (the welcome-back popup, the Shift Log, the away report). */
  | 'offlineCollected'
  /** The run reset happened (franchise, Jump, season close). */
  | 'prestige';

type Listener = (event: LifecycleEvent) => void;

const listeners = new Set<Listener>();
let report: (error: unknown, where: string) => void = () => {};

export const lifecycle = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(event: LifecycleEvent): void {
    listeners.forEach((l) => {
      try {
        l(event);
      } catch (e) {
        report(e, `lifecycle.${event}`);
      }
    });
  },
  /** Where listener errors go (the store points this at crash reporting). */
  onError(fn: (error: unknown, where: string) => void): void {
    report = fn;
  },
};
