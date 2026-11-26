/**
 * Which card is open (one at a time, yard-stage1.md 4.3), the office's open tab, and the last refusal a
 * card's button met. Screen state only: never saved, never the rules'. Opening a card also marks the
 * shell's overlay stack (uiState: the yard's stick and the Open button stop while a card shows), and
 * closing it pops that mark, so the shell, Android back and the scrim agree.
 */
import { create } from 'zustand';
import type { CardRef, Txt } from '../../../engine/salvage';
import { useSalvageUi } from '../uiState';

/** The office's tabs (4.3: Rota, Partners, the process board). */
export type OfficeTab = 'rota' | 'partners' | 'processBoard';

/** A refusal shown under the row whose button met it (by row id), or at the card's foot. */
export interface CardNote {
  row: string;
  txt: Txt;
  at: number;
}

interface CardStack {
  ref: CardRef | null;
  tab: OfficeTab;
  note: CardNote | null;
  /** Opens a card (replacing the open one: one at a time). */
  open(ref: CardRef, tab?: OfficeTab): void;
  /** Closes the open card; false when none was open. */
  close(): boolean;
  setTab(tab: OfficeTab): void;
  setNote(note: CardNote | null): void;
}

export const useCards = create<CardStack>((set, get) => ({
  ref: null,
  tab: 'rota',
  note: null,
  open: (ref, tab) => {
    const ui = useSalvageUi.getState();
    // A2 (owner2-fix-hud): nothing opens under the counting card; only the away card that takes its place.
    if (ui.counting && ref.kind !== 'away') return;
    if (!ui.stack.includes('panel')) ui.open('panel');
    set({ ref, tab: tab ?? (ref.kind === 'processBoard' ? 'processBoard' : 'rota'), note: null });
  },
  close: () => {
    if (!get().ref) return false;
    set({ ref: null, note: null });
    const ui = useSalvageUi.getState();
    while (ui.stack.length && useSalvageUi.getState().closeTop()) {
      /* pop the shell's marks too */
    }
    return true;
  },
  setTab: (tab) => set({ tab, note: null }),
  setNote: (note) => set({ note }),
}));

/** Opens a card from anywhere in the screens (the shell's Open button, a world label, a hint). */
export function openCard(ref: CardRef, tab?: OfficeTab): void {
  useCards.getState().open(ref, tab);
}

/** Closes the open card. */
export function closeCard(): boolean {
  return useCards.getState().close();
}
