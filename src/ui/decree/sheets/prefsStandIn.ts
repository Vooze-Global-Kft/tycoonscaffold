/**
 * STAND-IN for src/ui/decree/prefs.ts (the player's "Buttons instead of flicks" switch of 4.4
 * Settings; build plan: PLATFORM creates it, saved in AsyncStorage under `decree:prefs:v1`, observable,
 * read by the desk). Asked for in requests.md. Until it exists the Settings sheet keeps the switch
 * here, in memory only, and the desk does not see it. Delete this file and import prefs.ts once it
 * exists. Owned by the bars package (BARS).
 */
import { create } from 'zustand';

interface Prefs {
  buttons: boolean;
  set(p: Partial<Pick<Prefs, 'buttons'>>): void;
}

export const usePrefsStandIn = create<Prefs>((set) => ({
  buttons: false,
  set: (p) => set(p),
}));
