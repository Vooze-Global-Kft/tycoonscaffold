/**
 * Stand-ins for two pieces of UI state the bars need and src/ui/decree/uiState.ts (PLATFORM's) does
 * not hold yet; asked for in requests.md ("[screens-bars] uiState.ts"). Remove once uiState has them:
 * - `headline`: the gossip chip's last-headline bubble is open (4.1; Android back should close it);
 * - `preview`: the side a drag has armed past 40 pt (4.1: "while a drag is armed, rings and the
 *   approval chip preview its values"); the desk (DESK) sets it while the finger is down. Until then
 *   the bars preview the second path's `armed` only (uiState).
 * Owned by the bars package (BARS).
 */
import { create } from 'zustand';

interface LocalUi {
  headline: boolean;
  preview: 'sign' | 'refuse' | null;
  openHeadline(): void;
  closeHeadline(): void;
  setPreview(side: 'sign' | 'refuse' | null): void;
}

export const useBarsUi = create<LocalUi>((set) => ({
  headline: false,
  preview: null,
  openHeadline: () => set({ headline: true }),
  closeHeadline: () => set({ headline: false }),
  setPreview: (preview) => set({ preview }),
}));
