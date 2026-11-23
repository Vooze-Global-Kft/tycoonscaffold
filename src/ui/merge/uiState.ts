/**
 * The merge screens' own UI state (spec 4.3, 4.4, 4.5): not saved, not shared with other modes, and
 * changed only through its own actions below (screens never `setState` it directly).
 * - `armed`: the tap-tap armed cell (a ring; matches glow), or null;
 * - `chip`: the long-press chip's cell (a good's name and value), or null;
 * - `undoHidden`: the Basket undo chip that Android back put away (it does not undo, 4.5), by its
 *   `until` time, so a new sale shows a new chip;
 * - `sheet` / `spoke`: the one dialog open (4.4: one at a time; the kit Sheet also registers with
 *   src/state/overlays.ts).
 * `closeTop()` closes the top layer in 4.5's order (armed, chip, undo chip, sheet, spoke) and says
 * whether it closed one (Android back leaves the app only when it returns false).
 *
 * Written by the skeleton (spec 9.2 hour 0); owned afterwards by the hints and platform package
 * (Android back); the play canvas package calls the armed and chip actions, the bars and sheets
 * package the sheet and spoke ones (docs/design/market-build-plan.md).
 */
import { create } from 'zustand';

/** The sheets of 4.4. */
export type MergeSheet =
  | { type: 'stall'; chain: number }
  | { type: 'shutter'; group: number }
  | { type: 'ticket'; counter: number }
  | { type: 'gift' }
  | { type: 'away' }
  | { type: 'seasonClose' }
  | { type: 'shop' }
  | { type: 'settings' };
/** The spokes of 4.4 (full screen, opened only by a tap). */
export type MergeSpoke = 'book' | 'lanterns' | 'season';

interface MergeUi {
  armed: number | null;
  chip: number | null;
  undoHidden: number | null;
  sheet: MergeSheet | null;
  spoke: MergeSpoke | null;
  arm(cell: number): void;
  disarm(): void;
  showChip(cell: number): void;
  hideChip(): void;
  hideUndo(until: number): void;
  openSheet(sheet: MergeSheet): void;
  closeSheet(): void;
  openSpoke(spoke: MergeSpoke): void;
  closeSpoke(): void;
  closeTop(undoUntil: number | null): boolean;
}

export const useMergeUi = create<MergeUi>((set, get) => ({
  armed: null,
  chip: null,
  undoHidden: null,
  sheet: null,
  spoke: null,
  arm: (cell) => set({ armed: cell, chip: null }),
  disarm: () => set({ armed: null }),
  showChip: (cell) => set({ chip: cell }),
  hideChip: () => set({ chip: null }),
  hideUndo: (until) => set({ undoHidden: until }),
  // One dialog at a time (4.4); opening one disarms the board (no sheet opens over an armed good, 3.1).
  openSheet: (sheet) => set({ sheet, armed: null, chip: null }),
  closeSheet: () => set({ sheet: null }),
  openSpoke: (spoke) => set({ spoke, sheet: null, armed: null, chip: null }),
  closeSpoke: () => set({ spoke: null }),
  closeTop: (undoUntil) => {
    const s = get();
    let next: Partial<MergeUi> | null = null;
    if (s.armed !== null) next = { armed: null };
    else if (s.chip !== null) next = { chip: null };
    else if (undoUntil !== null && s.undoHidden !== undoUntil) next = { undoHidden: undoUntil };
    else if (s.sheet) next = { sheet: null };
    else if (s.spoke) next = { spoke: null };
    if (!next) return false;
    set(next);
    return true;
  },
}));
