/**
 * The salvage screen's own UI state (never saved, not the rules'). Owner: package 4 (`hud`).
 *
 * - `cards`: the open cards as `CardRef`s (types.ts), top last. AGENTS.md: one overlay at a time; a
 *   centred confirmation may sit on a panel, so this is a short stack and only its top is live. The
 *   overlay host (overlays-a) draws the top one; Android back and the scrim close it (`closeTop`).
 *   `openCard` from anywhere: the one button ("Open" at a place), the ladder chip (the industry table),
 *   the clipboard, the hud's triggers (the rung sign, the away card), a ticket tap (the history).
 * - `stack` / `open(kind)`: the ground work's placeholder overlays ('panel', 'card'), kept so the
 *   ground-work OverlayHost compiles until overlays-a replaces it; closeTop closes cards first.
 * - `driving`: whether the boss sits in the truck (set by the frame loop when it changes, never per frame).
 * - `place`: the place the boss stands at (the one button's "Open"), set by the presence sampler only
 *   when it changes.
 * - `goalOpen`: the goal card shows its three lines.
 */
import { create } from 'zustand';
import type { CardRef } from '../../engine/salvage';

export type OverlayKind = 'panel' | 'card';

interface SalvageUi {
  cards: CardRef[];
  /** Opens a card on top (the same card already on top is not opened twice; a centred card may sit on a panel). */
  openCard(ref: CardRef): void;
  /** Replaces the whole stack with one card (a tab of the office, a plate opening its machine). */
  showCard(ref: CardRef): void;
  /** Closes the top card or overlay; false when none was open (Android back then leaves the app). */
  closeTop(): boolean;
  closeAll(): void;
  /** The ground work's placeholder overlays (see above). */
  stack: OverlayKind[];
  open(kind: OverlayKind): void;
  driving: boolean;
  setDriving(on: boolean): void;
  place: string | null;
  setPlace(place: string | null): void;
  goalOpen: boolean;
  setGoalOpen(on: boolean): void;
}

/** Two card refs name the same card. */
export function sameCard(a: CardRef, b: CardRef): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const useSalvageUi = create<SalvageUi>((set, get) => ({
  cards: [],
  openCard: (ref) => {
    const c = get().cards;
    const top = c[c.length - 1];
    if (top && sameCard(top, ref)) return;
    set({ cards: [...c.filter((x) => !sameCard(x, ref)), ref].slice(-3) });
  },
  showCard: (ref) => set({ cards: [ref] }),
  closeTop: () => {
    const c = get().cards;
    if (c.length) {
      set({ cards: c.slice(0, -1) });
      return true;
    }
    const s = get().stack;
    if (!s.length) return false;
    set({ stack: s.slice(0, -1) });
    return true;
  },
  closeAll: () => set({ cards: [], stack: [] }),
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

/** How many overlays are open (cards and the ground work's placeholders): the yard's stick stops under any. */
export function overlaysOpen(s: Pick<SalvageUi, 'cards' | 'stack'>): number {
  return s.cards.length + s.stack.length;
}
