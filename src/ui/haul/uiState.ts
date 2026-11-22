/**
 * The haul screens' own UI state (not saved, not shared with other modes): which sheet, spoke or
 * overlay is open (one at a time; the kit Sheet also registers with src/state/overlays.ts) and
 * what the finger has selected on the map (tap-tap: a drone, then a rock; spec 4.2).
 * Owned by the "shell" package after the skeleton (docs/design/space-build-plan.md).
 */
import { create } from 'zustand';

export type HaulSheet = { type: 'rig'; slot: number } | { type: 'station' } | { type: 'contracts' };
export type HaulSpoke = 'fitting' | 'starmap' | 'salvage' | 'comms' | 'trade';
export type HaulOverlay = 'jump';
/** What the finger selected: a drone from the rack or from a route chip, or the flare (4.2 modes droneSelected / flareSelected). */
export type HaulSelection = { kind: 'drone'; from: 'rack' | number } | { kind: 'flare' } | null;

interface HaulUi {
  sheet: HaulSheet | null;
  spoke: HaulSpoke | null;
  overlay: HaulOverlay | null;
  selection: HaulSelection;
  /** The settings sheet from the rail's Menu button. */
  menuOpen: boolean;
  openSheet(sheet: HaulSheet): void;
  closeSheet(): void;
  openSpoke(spoke: HaulSpoke): void;
  closeSpoke(): void;
  openOverlay(o: HaulOverlay): void;
  closeOverlay(): void;
  select(s: HaulSelection): void;
  setMenu(open: boolean): void;
}

export const useHaulUi = create<HaulUi>((set) => ({
  sheet: null,
  spoke: null,
  overlay: null,
  selection: null,
  menuOpen: false,
  openSheet: (sheet) => set({ sheet, selection: null }),
  closeSheet: () => set({ sheet: null }),
  openSpoke: (spoke) => set({ spoke, sheet: null, selection: null }),
  closeSpoke: () => set({ spoke: null }),
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null }),
  select: (selection) => set({ selection }),
  setMenu: (menuOpen) => set({ menuOpen }),
}));
