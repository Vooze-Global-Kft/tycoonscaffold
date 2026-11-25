/**
 * The salvage screen's own UI state (never saved, not the rules'): the stack of the mode's overlays
 * (a side panel, a centred card; the top one is what Android back closes) and whether the worker sits
 * in the truck (for the step-out button; set by the frame loop when it changes, never per frame).
 */
import { create } from 'zustand';

export type OverlayKind = 'panel' | 'card';

interface SalvageUi {
  stack: OverlayKind[];
  open(kind: OverlayKind): void;
  /** Closes the top overlay; false when none was open. */
  closeTop(): boolean;
  driving: boolean;
  setDriving(on: boolean): void;
}

export const useSalvageUi = create<SalvageUi>((set, get) => ({
  stack: [],
  open: (kind) => {
    const s = get().stack;
    if (s[s.length - 1] === kind) return;
    set({ stack: [...s.filter((k) => k !== kind), kind] });
  },
  closeTop: () => {
    const s = get().stack;
    if (!s.length) return false;
    set({ stack: s.slice(0, -1) });
    return true;
  },
  driving: false,
  setDriving: (driving) => {
    if (get().driving !== driving) set({ driving });
  },
}));
