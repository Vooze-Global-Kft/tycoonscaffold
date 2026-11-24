/**
 * The desk screens' own UI state (spec 4.3, 4.4): not saved, not shared with other modes, and changed
 * only through its own actions below (screens never `setState` it directly).
 * - `armed`: the strip armed by the second path's first tap ("Tap again to sign"), or null;
 * - `peek`: the in-tray peek is open (a tap shows the next 3 faces);
 * - `sheet` / `view`: the one dialog open (4.4: one at a time; the kit Sheet also registers with
 *   src/state/overlays.ts) or the one full-screen view (useOverlay, the desk's clocks stopped);
 * - `fingerDown`, `touchedAt`: a finger is on the desk (the desk's responder reports it with
 *   `setFinger`), and when the player last touched anything (every action here counts as a touch, and
 *   `touch()` for a tap that changes nothing here). The pen (./hints.ts) waits for a quiet hand, and
 *   nothing opens by itself while a finger is down or a strip is armed (`busyHand`).
 * - `viewBack`: a full-screen view may claim Android back before it closes (Election Night jumps to
 *   its result first, 4.4): it registers a handler with `setViewBack` while it is mounted.
 * `closeTop()` closes the top layer in 4.4's Android-back order (armed strip, in-tray peek, sheet,
 * full-screen view, the view's own handler first) and says whether it closed one (Android back
 * leaves the app only from the bare desk, after committing a pending take-back: ./back.ts).
 *
 * Written by the skeleton (spec 9.2 hour 0); owned by the hints and platform package (PLATFORM); the
 * desk package calls the armed, peek and finger actions, the bars and views packages the sheet and view
 * ones. A new action or field: a line in requests.md to PLATFORM.
 */
import { create } from 'zustand';

/** The sheets of 4.4. */
export type DecreeSheet =
  | { type: 'ledger' }
  | { type: 'cabinet' }
  | { type: 'poll' }
  | { type: 'away' }
  | { type: 'move' }
  | { type: 'result' }
  | { type: 'callConfirm' }
  | { type: 'shop' }
  | { type: 'settings' }
  | { type: 'monument' };
/** The full-screen views of 4.4 (useOverlay, the desk's clocks stopped). */
export type DecreeView = 'electionNight' | 'office' | 'facePicker';

/** A view's own Android-back step: true when it handled the press (and the view stays). */
export type ViewBack = () => boolean;

export interface DecreeUi {
  armed: 'sign' | 'refuse' | null;
  peek: boolean;
  sheet: DecreeSheet | null;
  view: DecreeView | null;
  fingerDown: boolean;
  /** Wall-clock ms of the last touch (0: none yet this session). */
  touchedAt: number;
  viewBack: ViewBack | null;
  arm(side: 'sign' | 'refuse'): void;
  disarm(): void;
  openPeek(): void;
  closePeek(): void;
  openSheet(sheet: DecreeSheet): void;
  closeSheet(): void;
  openView(view: DecreeView): void;
  closeView(): void;
  /** The desk's responder: a finger landed on (true) or left (false) the desk. */
  setFinger(down: boolean): void;
  /** Any other tap (a bar button that opens nothing, a tap on the paper that only commits a take-back). */
  touch(): void;
  /** A full-screen view claims Android back while mounted (null when it unmounts). */
  setViewBack(fn: ViewBack | null): void;
  closeTop(): boolean;
}

/** The wall clock in ms (UI only; the rules never see it). */
export const wall = () => Date.now();

export const useDecreeUi = create<DecreeUi>((set, get) => ({
  armed: null,
  peek: false,
  sheet: null,
  view: null,
  fingerDown: false,
  touchedAt: 0,
  viewBack: null,
  arm: (side) => set({ armed: side, peek: false, touchedAt: wall() }),
  disarm: () => set({ armed: null, touchedAt: wall() }),
  openPeek: () => set({ peek: true, armed: null, touchedAt: wall() }),
  closePeek: () => set({ peek: false, touchedAt: wall() }),
  // One dialog at a time (4.4); opening one disarms the desk.
  openSheet: (sheet) => set({ sheet, armed: null, peek: false, touchedAt: wall() }),
  closeSheet: () => set({ sheet: null, touchedAt: wall() }),
  openView: (view) => set({ view, sheet: null, armed: null, peek: false, touchedAt: wall() }),
  closeView: () => set({ view: null, viewBack: null, touchedAt: wall() }),
  setFinger: (down) => {
    if (get().fingerDown !== down) set({ fingerDown: down, touchedAt: wall() });
    else set({ touchedAt: wall() });
  },
  touch: () => set({ touchedAt: wall() }),
  setViewBack: (fn) => set({ viewBack: fn }),
  closeTop: () => {
    const s = get();
    let next: Partial<DecreeUi> | null = null;
    if (s.armed !== null) next = { armed: null };
    else if (s.peek) next = { peek: false };
    else if (s.sheet) next = { sheet: null };
    else if (s.view) {
      // The view's own step first (Election Night jumps to its result), then the view closes.
      let handled = false;
      try {
        handled = s.viewBack ? s.viewBack() === true : false;
      } catch {
        handled = false;
      }
      next = handled ? {} : { view: null, viewBack: null };
    }
    if (!next) return false;
    set({ ...next, touchedAt: wall() });
    return true;
  },
}));

/** Nothing opens by itself now (3.1, 4.4): a finger is on the desk or a strip is armed. */
export function busyHand(s: Pick<DecreeUi, 'fingerDown' | 'armed'>): boolean {
  return s.fingerDown || s.armed !== null;
}

/** Anything covers the desk: a sheet, a full-screen view or the in-tray peek. */
export function deskCovered(s: Pick<DecreeUi, 'sheet' | 'view' | 'peek'>): boolean {
  return s.sheet !== null || s.view !== null || s.peek;
}
