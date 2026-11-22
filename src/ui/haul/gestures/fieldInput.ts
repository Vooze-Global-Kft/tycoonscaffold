/**
 * What the field gesture layer (./useFieldGestures.ts) tells the layers drawn over the map, outside
 * React where it changes with the finger:
 * - `dragLine`: a Reanimated value the drag line reads on the UI thread (spec 4.2: the finger goes
 *   into a shared value so the line costs no React work per move). Written from the JavaScript
 *   thread once per responder move; read by ../hud/FloatingFeedback.tsx.
 * - `useFieldInput`: the few things that change on a tap, not per move (the ghost slot whose
 *   "Claim ₵21" confirm chip is up, the launch track's armed state), for React.
 * Not saved, not shared with other modes.
 */
import { makeMutable } from 'react-native-reanimated';
import { create } from 'zustand';

/** What the finger drags: nothing, a drone (from the rack or a chip), the flare, or the launch swipe. */
export const DRAG_NONE = 0;
export const DRAG_DRONE = 1;
export const DRAG_FLARE = 2;
export const DRAG_SWIPE = 3;

export interface DragLine {
  kind: number;
  /** Where the drag started (the rack cradle, the chip, the launcher). */
  x0: number;
  y0: number;
  /** The finger. */
  x: number;
  y: number;
  /** 1 when the line has locked onto a target (then `sx, sy` is its centre). */
  snap: number;
  sx: number;
  sy: number;
  /** The ore colour of the dragged drone's route ('' = the idle cyan). */
  color: string;
}

export const NO_DRAG: DragLine = {
  kind: DRAG_NONE,
  x0: 0,
  y0: 0,
  x: 0,
  y: 0,
  snap: 0,
  sx: 0,
  sy: 0,
  color: '',
};

/** The live drag, read on the UI thread. One per app (one finger drives the map). */
export const dragLine = makeMutable<DragLine>(NO_DRAG);

/**
 * What moving the held drone onto the rock under it would do to the income line (Decision 49), from
 * the rules' own estimate (`routeGain`): set when the drag's snap target changes, and once more for
 * a moment after the drop (`dropped`). Credits per second; `limit` says why a rock cannot use it.
 */
export interface RoutePreview {
  slot: number;
  delta: number;
  limit: 'rig' | 'haul' | null;
  /** The drop happened (shown as a short floater, then cleared). */
  dropped: boolean;
  at: number;
}

interface FieldInput {
  /** The ghost slot whose confirm chip is showing (first tap), and its price; null when none. */
  claimArmed: { slot: number; at: number } | null;
  /** The launch swipe has passed 30 pt (the chevrons light fully). */
  launchArmed: boolean;
  /** The held drone's gain over the rock it would drop on (Decision 49), or null. */
  preview: RoutePreview | null;
  arm(slot: number | null): void;
  setLaunchArmed(on: boolean): void;
  setPreview(p: RoutePreview | null): void;
}

export const useFieldInput = create<FieldInput>((set) => ({
  claimArmed: null,
  launchArmed: false,
  preview: null,
  arm: (slot) => set({ claimArmed: slot === null ? null : { slot, at: Date.now() } }),
  setLaunchArmed: (launchArmed) => set({ launchArmed }),
  setPreview: (preview) => set({ preview }),
}));

/** How long a confirm chip waits for its second tap. */
export const CLAIM_CONFIRM_MS = 4000;

export { CLAIM_CHIP_W, claimChipH, claimChipRect } from './gestureMath';
