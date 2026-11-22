/**
 * Small pieces of home-screen state that the scene and the lists under it share: which of the
 * three stages the list shows, and which row should flash because the player tapped its
 * counterpart in the scene. Also two flags the home shell's overlays use to keep out of each
 * other's way (a story dialog or a celebration banner on screen). UI only; nothing here is saved.
 */
import { create } from 'zustand';
import type { Stage } from '../../engine/chain';

interface HomeUi {
  /** The stage whose rows the list under the scene shows. */
  stage: Stage;
  /** A row to scroll to and flash once (a business id, or 'transport' / 'sales' / 'transportManager'), with a counter so repeats re-trigger. */
  focus: { key: string; seq: number } | null;
  setStage(stage: Stage): void;
  /** Select a stage and flash one of its rows. */
  showRow(stage: Stage, key: string): void;
  /** A story dialog is on screen (the tutorial hand hides; banners wait). */
  storyOpen: boolean;
  setStoryOpen(open: boolean): void;
  /** A celebration banner is on screen (story dialogs wait). */
  bannerOpen: boolean;
  setBannerOpen(open: boolean): void;
}

export const useHomeUi = create<HomeUi>((set, get) => ({
  stage: 'production',
  focus: null,
  setStage: (stage) => {
    if (get().stage !== stage) set({ stage });
  },
  showRow: (stage, key) => set({ stage, focus: { key, seq: (get().focus?.seq ?? 0) + 1 } }),
  storyOpen: false,
  setStoryOpen: (storyOpen) => {
    if (get().storyOpen !== storyOpen) set({ storyOpen });
  },
  bannerOpen: false,
  setBannerOpen: (bannerOpen) => {
    if (get().bannerOpen !== bannerOpen) set({ bannerOpen });
  },
}));
