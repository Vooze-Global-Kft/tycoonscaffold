/**
 * "Is a dialog or full-screen overlay showing right now?" Dialogs register themselves here (the
 * kit's Sheet does it for every dialog built on it), so anything that must wait its turn can ask:
 * an offer popup, a story dialog, the tutorial hand, the flying bonus.
 *
 * A plain counter outside React and outside the saved game: it is about the screen, not the game.
 */
type Listener = () => void;

let open = 0;
const listeners = new Set<Listener>();

export const overlays = {
  /** Call when an overlay appears; call the returned function when it goes away. */
  enter(): () => void {
    open++;
    listeners.forEach((l) => l());
    let left = false;
    return () => {
      if (left) return;
      left = true;
      open = Math.max(0, open - 1);
      listeners.forEach((l) => l());
    };
  },
  /** How many overlays are showing. */
  count(): number {
    return open;
  },
  anyOpen(): boolean {
    return open > 0;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
