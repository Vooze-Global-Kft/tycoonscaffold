/**
 * The salvage screen's own UI state (never saved, not the rules'). Owner: package 4 (`hud`).
 *
 * - `stack` / `open(kind)`: the marks of open overlays ('panel', 'card'). WHICH card is open is the overlay
 *   engineers' (../overlays/cardStack.ts `openCard(ref)`, one card at a time), which marks this stack when a
 *   card opens and pops it when it closes; the yard's stick and the one button stop while any mark is set;
 *   Android back and the scrim call `closeTop`.
 * - `driving`: whether the boss sits in the truck (set by the frame loop when it changes, never per frame).
 * - `place`: the place the boss stands at (the one button's "Open"), set by the presence sampler only
 *   when it changes.
 * - `goalOpen`: the goal card shows its three lines.
 */
import { create } from 'zustand';

export type OverlayKind = 'panel' | 'card';

interface SalvageUi {
  /** Closes the top overlay mark; false when none was open (Android back then leaves the app). */
  closeTop(): boolean;
  /** The open overlays' marks (see above). */
  stack: OverlayKind[];
  open(kind: OverlayKind): void;
  driving: boolean;
  setDriving(on: boolean): void;
  place: string | null;
  setPlace(place: string | null): void;
  goalOpen: boolean;
  setGoalOpen(on: boolean): void;
}

export const useSalvageUi = create<SalvageUi>((set, get) => ({
  closeTop: () => {
    const s = get().stack;
    if (!s.length) return false;
    set({ stack: s.slice(0, -1) });
    return true;
  },
  stack: [],
  open: (kind) => {
    const s = get().stack;
    if (s[s.length - 1] === kind) return;
    set({ stack: [...s.filter((k) => k !== kind), kind] });
  },
  driving: false,
  setDriving: (driving) => {
    if (get().driving !== driving) set({ driving });
  },
  place: null,
  setPlace: (place) => {
    if (get().place !== place) set({ place });
  },
  goalOpen: false,
  setGoalOpen: (goalOpen) => {
    if (get().goalOpen !== goalOpen) set({ goalOpen });
  },
}));

/** How many overlays are open: the yard's stick and the one button stop under any. */
export function overlaysOpen(s: Pick<SalvageUi, 'stack'>): number {
  return s.stack.length;
}
