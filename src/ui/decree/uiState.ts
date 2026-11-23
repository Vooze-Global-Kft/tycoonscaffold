/**
 * The desk screens' own UI state (spec 4.3, 4.4): not saved, not shared with other modes, and changed
 * only through its own actions below (screens never `setState` it directly).
 * - `armed`: the strip armed by the second path's first tap ("Tap again to sign"), or null;
 * - `peek`: the in-tray peek is open (a tap shows the next 3 faces);
 * - `sheet` / `view`: the one dialog open (4.4: one at a time; the kit Sheet also registers with
 *   src/state/overlays.ts) or the one full-screen view (useOverlay, the desk's clocks stopped).
 * `closeTop()` closes the top layer in 4.4's Android-back order (armed strip, in-tray peek, sheet,
 * full-screen view) and says whether it closed one (Android back leaves the app only from the bare
 * desk, after committing a pending take-back).
 *
 * Written by the skeleton (spec 9.2 hour 0); owned afterwards by the hints and platform package P8
 * (Android back); the desk package calls the armed and peek actions, the bars and sheets package the
 * sheet and view ones (docs/design/office-build-plan.md).
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
  | { type: 'settings' };
/** The full-screen views of 4.4 (useOverlay, the desk's clocks stopped). */
export type DecreeView = 'electionNight' | 'office' | 'facePicker';

interface DecreeUi {
  armed: 'sign' | 'refuse' | null;
  peek: boolean;
  sheet: DecreeSheet | null;
  view: DecreeView | null;
  arm(side: 'sign' | 'refuse'): void;
  disarm(): void;
  openPeek(): void;
  closePeek(): void;
  openSheet(sheet: DecreeSheet): void;
  closeSheet(): void;
  openView(view: DecreeView): void;
  closeView(): void;
  closeTop(): boolean;
}

export const useDecreeUi = create<DecreeUi>((set, get) => ({
  armed: null,
  peek: false,
  sheet: null,
  view: null,
  arm: (side) => set({ armed: side, peek: false }),
  disarm: () => set({ armed: null }),
  openPeek: () => set({ peek: true, armed: null }),
  closePeek: () => set({ peek: false }),
  // One dialog at a time (4.4); opening one disarms the desk.
  openSheet: (sheet) => set({ sheet, armed: null, peek: false }),
  closeSheet: () => set({ sheet: null }),
  openView: (view) => set({ view, sheet: null, armed: null, peek: false }),
  closeView: () => set({ view: null }),
  closeTop: () => {
    const s = get();
    let next: Partial<DecreeUi> | null = null;
    if (s.armed !== null) next = { armed: null };
    else if (s.peek) next = { peek: false };
    else if (s.sheet) next = { sheet: null };
    else if (s.view) next = { view: null };
    if (!next) return false;
    set(next);
    return true;
  },
}));
