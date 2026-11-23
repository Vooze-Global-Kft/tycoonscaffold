/**
 * The spokes' own screen state (not saved, not the game): the Ladder Book's chosen ladder and its
 * odds page, the season close's refusal line, and the change of season while it plays. The spoke
 * and the confirm themselves are uiState's (`spoke`, `sheet: {type: 'seasonClose'}`).
 * Package SPOKES (7b).
 */
import { create } from 'zustand';

export interface Ceremony {
  /** The 0-based season that closed and the one that begins. */
  from: number;
  to: number;
}

interface SpokeLocal {
  ladder: number;
  odds: boolean;
  refusal: string | null;
  ceremony: Ceremony | null;
  setLadder(c: number): void;
  setOdds(open: boolean): void;
  setRefusal(text: string | null): void;
  startCeremony(c: Ceremony): void;
  endCeremony(): void;
}

export const useSpokeLocal = create<SpokeLocal>((set) => ({
  ladder: 0,
  odds: false,
  refusal: null,
  ceremony: null,
  setLadder: (ladder) => set({ ladder }),
  setOdds: (odds) => set({ odds }),
  setRefusal: (refusal) => set({ refusal }),
  startCeremony: (ceremony) => set({ ceremony, refusal: null }),
  endCeremony: () => set({ ceremony: null }),
}));
