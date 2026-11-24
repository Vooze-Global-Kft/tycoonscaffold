/**
 * "Buttons instead of flicks" (spec 4.4 Settings), as the desk reads it. STAND-IN: the player's
 * switch lives in the platform package's src/ui/decree/prefs.ts (saved in AsyncStorage, shown by the
 * Settings sheet), which does not exist yet (requested in requests.md); until it does, the desk reads
 * this store, off by default. Replace `useButtonsPref` with the prefs selector when it lands.
 */
import { create } from 'zustand';

interface ButtonsPref {
  buttons: boolean;
  setButtons(on: boolean): void;
}

export const useButtonsPrefStore = create<ButtonsPref>((set) => ({
  buttons: false,
  setButtons: (buttons) => set({ buttons }),
}));

export function useButtonsPref(): boolean {
  return useButtonsPrefStore((s) => s.buttons);
}
