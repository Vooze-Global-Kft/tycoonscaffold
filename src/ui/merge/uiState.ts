/**
 * The merge screens' own UI state (spec 4.3, 4.4, 4.5): not saved, not shared with other modes, and
 * changed only through its own actions below (screens never `setState` it directly).
 * - `armed`: the tap-tap armed cell (a ring; matches glow), or null;
 * - `chip`: the long-press chip's cell (a good's name and value), or null;
 * - `undoHidden`: the Basket undo chip that Android back put away (it does not undo, 4.5), by its
 *   `until` time, so a new sale shows a new chip;
 * - `sheet` / `spoke`: the one dialog open (4.4: one at a time; the kit Sheet also registers with
 *   src/state/overlays.ts);
 * - `fingerDown`: a finger is on the play canvas (a drag or a press): nothing opens by itself and no
 *   firefly shows meanwhile (3.1);
 * - `touchedAt`: when the player last touched anything (Date.now() ms; 0 = not yet), for the idle
 *   firefly's 20 s (3.1).
 * `closeTop()` closes the top layer in 4.5's order (armed, chip, undo chip, sheet, spoke) and says
 * whether it closed one (Android back leaves the app only when it returns false).
 *
 * Who calls what (docs/design/market-build-plan.md):
 * - the play canvas: `arm`, `disarm`, `showChip`, `hideChip`, `setFingerDown` (true when a pan or
 *   a press begins, false when it ends or is cancelled); `touched()` on every tap;
 * - the bars, sheets and spokes: `openSheet`, `closeSheet`, `openSpoke`, `closeSpoke`, `hideUndo`;
 *   `touched()` on every press (a Pressable's onPressIn);
 * - the platform package (./platform.tsx): Android back over `closeTop`; the away report.
 * Owned by the hints and platform package. Written first by the skeleton (spec 9.2 hour 0).
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

/** What Android back closed (closeTop), or null when the board was bare. */
export type ClosedLayer = 'armed' | 'chip' | 'undo' | 'sheet' | 'spoke';

interface MergeUi {
  armed: number | null;
  chip: number | null;
  undoHidden: number | null;
  sheet: MergeSheet | null;
  spoke: MergeSpoke | null;
  fingerDown: boolean;
  touchedAt: number;
  arm(cell: number): void;
  disarm(): void;
  showChip(cell: number): void;
  hideChip(): void;
  hideUndo(until: number): void;
  openSheet(sheet: MergeSheet): void;
  closeSheet(): void;
  openSpoke(spoke: MergeSpoke): void;
  closeSpoke(): void;
  setFingerDown(down: boolean): void;
  touched(): void;
  /** Closes the top layer (4.5); `undoUntil` is the Basket undo chip's `until` while one shows, else null. True when it closed one. */
  closeTop(undoUntil: number | null): boolean;
  /** What closeTop would close now, without closing it (tests, the back handler's sound). */
  topLayer(undoUntil: number | null): ClosedLayer | null;
}

/** The layer closeTop closes first (4.5's order), or null on the bare board. */
function top(s: Pick<MergeUi, 'armed' | 'chip' | 'undoHidden' | 'sheet' | 'spoke'>, undoUntil: number | null): ClosedLayer | null {
  if (s.armed !== null) return 'armed';
  if (s.chip !== null) return 'chip';
  if (undoUntil !== null && s.undoHidden !== undoUntil) return 'undo';
  if (s.sheet) return 'sheet';
  if (s.spoke) return 'spoke';
  return null;
}

/** Wall clock for `touchedAt` (UI only: never reaches the rules). */
const wall = () => Date.now();

export const useMergeUi = create<MergeUi>((set, get) => ({
  armed: null,
  chip: null,
  undoHidden: null,
  sheet: null,
  spoke: null,
  fingerDown: false,
  touchedAt: 0,
  arm: (cell) => set({ armed: cell, chip: null, touchedAt: wall() }),
  disarm: () => {
    if (get().armed !== null) set({ armed: null });
  },
  showChip: (cell) => set({ chip: cell, touchedAt: wall() }),
  hideChip: () => {
    if (get().chip !== null) set({ chip: null });
  },
  hideUndo: (until) => set({ undoHidden: until }),
  // One dialog at a time (4.4); opening one disarms the board (no sheet opens over an armed good, 3.1).
  openSheet: (sheet) => set({ sheet, armed: null, chip: null, touchedAt: wall() }),
  closeSheet: () => {
    if (get().sheet !== null) set({ sheet: null, touchedAt: wall() });
  },
  openSpoke: (spoke) => set({ spoke, sheet: null, armed: null, chip: null, touchedAt: wall() }),
  closeSpoke: () => {
    if (get().spoke !== null) set({ spoke: null, touchedAt: wall() });
  },
  setFingerDown: (down) => {
    if (get().fingerDown !== down) set({ fingerDown: down, touchedAt: wall() });
    else if (down) set({ touchedAt: wall() });
  },
  touched: () => set({ touchedAt: wall() }),
  topLayer: (undoUntil) => top(get(), undoUntil),
  closeTop: (undoUntil) => {
    const s = get();
    const layer = top(s, undoUntil);
    if (layer === null) return false;
    const now = wall();
    if (layer === 'armed') set({ armed: null, touchedAt: now });
    else if (layer === 'chip') set({ chip: null, touchedAt: now });
    else if (layer === 'undo') set({ undoHidden: undoUntil, touchedAt: now });
    else if (layer === 'sheet') set({ sheet: null, touchedAt: now });
    else set({ spoke: null, touchedAt: now });
    return true;
  },
}));

/** Nothing may open by itself now (3.1): a finger is down, a good is armed, or a chip shows. */
export function busyHand(s: Pick<MergeUi, 'fingerDown' | 'armed' | 'chip'>): boolean {
  return s.fingerDown || s.armed !== null || s.chip !== null;
}
