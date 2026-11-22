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
import type { FieldLayout, Rect } from '../layout';

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

/** The confirm chip's size: as wide as its longest price needs, one label row plus padding. */
export const CLAIM_CHIP_W = 128;
export const claimChipH = (row: number) => row + 14;

function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Where the "Claim ₵21" chip of ghost slot `slot` sits (play-0, play-21): on the slot itself when
 * that covers nothing else, else under or over it, whichever covers the least of the other rocks
 * and their labels (a rock's circle and the label row under it), the top bars and the bay. The
 * gesture layer hit-tests the same rectangle, so a tap on the chip claims whichever view takes it.
 */
export function claimChipRect(layout: FieldLayout, slot: number, row: number): Rect | null {
  const rock = layout.rocks[slot];
  if (!rock) return null;
  const w = CLAIM_CHIP_W;
  const h = claimChipH(row);
  const x = Math.max(12, Math.min(layout.width - w - 12, rock.x - w / 2));
  const z = layout.zones;
  const top = z.comms.y + z.comms.height + 4;
  const bottom = z.bay.y - 4;
  const others: Rect[] = layout.rocks
    .filter((r) => r.slot !== slot)
    .map((r) => ({ x: r.x - Math.max(r.r, 30), y: r.y - r.r, width: 2 * Math.max(r.r, 30), height: 2 * r.r + 18 }));
  const candidates = [rock.y - h / 2, rock.y + rock.r + 4, rock.y - rock.r - h - 8];
  let best: Rect | null = null;
  let bestScore = Infinity;
  candidates.forEach((y0, i) => {
    const y = Math.max(top, Math.min(bottom - h, y0));
    const r = { x, y, width: w, height: h };
    // Pushed off its place by a bar counts against it; the first place wins ties.
    const score = others.reduce((a, o) => a + overlap(r, o), 0) + Math.abs(y - y0) * w + i;
    if (score < bestScore) {
      bestScore = score;
      best = r;
    }
  });
  return best;
}
