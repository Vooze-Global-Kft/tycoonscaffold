/**
 * "Is a dialog or full-screen overlay showing right now?" Dialogs register themselves here (the
 * kit's Sheet does it for every dialog built on it), so anything that must wait its turn can ask:
 * an offer popup, a story dialog, the tutorial hand, the flying bonus.
 *
 * A plain counter outside React and outside the saved game: it is about the screen, not the game.
 */
import { create } from 'zustand';

type Listener = () => void;

let open = 0;
/** Date.now() when the last overlay went away (0 = none yet). */
let lastClosedAt = 0;
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
      lastClosedAt = Date.now();
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
  /** Milliseconds since the last overlay went away (Infinity if none has yet). */
  msSinceClose(): number {
    return lastClosedAt === 0 ? Infinity : Date.now() - lastClosedAt;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

interface ShellFlags {
  /** A story dialog is on screen (the tutorial hand hides; banners wait). */
  storyOpen: boolean;
  setStoryOpen(open: boolean): void;
  /** A celebration banner is on screen (story dialogs wait). */
  bannerOpen: boolean;
  setBannerOpen(open: boolean): void;
}

/**
 * Two flags the shell's overlays use to keep out of each other's way: a story dialog or a
 * celebration banner on screen. UI only; nothing here is saved. (Moved from src/ui/home/uiState so
 * the shared dialogs do not reach into the home tab.)
 */
export const useShellFlags = create<ShellFlags>((set, get) => ({
  storyOpen: false,
  setStoryOpen: (storyOpen) => {
    if (get().storyOpen !== storyOpen) set({ storyOpen });
  },
  bannerOpen: false,
  setBannerOpen: (bannerOpen) => {
    if (get().bannerOpen !== bannerOpen) set({ bannerOpen });
  },
}));
