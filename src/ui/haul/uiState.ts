/**
 * The haul screens' own UI state (not saved, not shared with other modes): which sheet, spoke or
 * overlay is open (one at a time; the kit Sheet also registers with src/state/overlays.ts) and
 * what the finger has selected on the map (tap-tap: a drone, then a rock; spec 4.2).
 * Owned by the "shell" package after the skeleton (docs/design/space-build-plan.md).
 */
import { useEffect, useRef } from 'react';
import { create } from 'zustand';

export type HaulSheet = { type: 'rig'; slot: number } | { type: 'station' } | { type: 'contracts' };
export type HaulSpoke = 'fitting' | 'starmap' | 'salvage' | 'comms' | 'trade';
/** 'leave': the Jump's streak at the confirm; 'jump': the arrival in the next galaxy (Decision 41). */
export type HaulOverlay = 'jump' | 'leave';
/** What the finger selected: a drone from the rack or from a route chip, or the flare (4.2 modes droneSelected / flareSelected). */
export type HaulSelection = { kind: 'drone'; from: 'rack' | number } | { kind: 'flare' } | null;

interface HaulUi {
  sheet: HaulSheet | null;
  spoke: HaulSpoke | null;
  overlay: HaulOverlay | null;
  selection: HaulSelection;
  /** The settings sheet from the rail's Menu button. */
  menuOpen: boolean;
  /** Web preview only (dev.web.ts `?view=boot`): the loading screen drawn on top, so it can be reviewed. Never set on a phone. */
  devView: 'boot' | null;
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
  devView: null,
  // One sheet, spoke or menu at a time (spec 4.4): opening one closes the others.
  openSheet: (sheet) => set({ sheet, menuOpen: false, selection: null }),
  closeSheet: () => set({ sheet: null }),
  openSpoke: (spoke) => set({ spoke, sheet: null, menuOpen: false, selection: null }),
  closeSpoke: () => set({ spoke: null }),
  openOverlay: (overlay) => set({ overlay, sheet: null, menuOpen: false, selection: null }),
  closeOverlay: () => set({ overlay: null }),
  select: (selection) => set({ selection }),
  setMenu: (menuOpen) => set(menuOpen ? { menuOpen, sheet: null, selection: null } : { menuOpen }),
}));

/**
 * Inner layers the Android back key closes before the spoke itself (Decision 47): a spoke's armed
 * confirm, a picked module, an odds panel. A component registers one while it is showing
 * (`useBackLayer(active, close)`); the shell's back handler closes the newest first.
 */
const backLayers: { close: () => void }[] = [];

export function useBackLayer(active: boolean, close: () => void): void {
  const ref = useRef(close);
  ref.current = close;
  useEffect(() => {
    if (!active) return;
    const layer = { close: () => ref.current() };
    backLayers.push(layer);
    return () => {
      const i = backLayers.indexOf(layer);
      if (i >= 0) backLayers.splice(i, 1);
    };
  }, [active]);
}

/** Closes the newest inner layer; false when there is none. */
export function closeBackLayer(): boolean {
  const top = backLayers[backLayers.length - 1];
  if (!top) return false;
  top.close();
  return true;
}
