/**
 * Web preview twin of ./buttonsPref.ts: the same stand-in store, switched on by `?buttons=1` in the
 * page address (to look at the buttons in the preview). Web only.
 */
import { create } from 'zustand';

interface ButtonsPref {
  buttons: boolean;
  setButtons(on: boolean): void;
}

function fromAddress(): boolean {
  try {
    if (typeof window === 'undefined' || !window.location) return false;
    return new URLSearchParams(window.location.search).get('buttons') === '1';
  } catch {
    return false;
  }
}

export const useButtonsPrefStore = create<ButtonsPref>((set) => ({
  buttons: fromAddress(),
  setButtons: (buttons) => set({ buttons }),
}));

export function useButtonsPref(): boolean {
  return useButtonsPrefStore((s) => s.buttons);
}
