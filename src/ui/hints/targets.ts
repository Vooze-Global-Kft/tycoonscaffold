/**
 * Where things are on screen. Controls register their rectangle under a key; overlays that must
 * point at them or fly something to them (the tutorial hand, coins flying to the cash counter)
 * look the rectangle up. Rectangles are in window coordinates.
 *
 * Registering a React Native view:
 *
 *   const target = useTarget('buyBusiness:margherita');
 *   <View {...target}> ... </View>            // or <Pressable {...target}>, <Animated.View {...target}>
 *
 * Registering something drawn inside a Skia canvas (the scene knows its own geometry):
 *
 *   targets.set('bell', { x: canvasLeft + 282, y: canvasTop + 155, width: 40, height: 40 });
 *   targets.set('bell', null);                // when it goes away
 *
 * KEYS of the tab-shell modes (a contract between their screens; `hintKey()` in src/engine/view.ts
 * produces the hint ones, src/ui/home/hintRoute.ts routes them)
 *   tapStation:<businessId>   the station in the scene          bell             the service bell in the scene
 *   buyBusiness:<businessId>  the Buy button on a station row   buyTransport / buySales   the Buy button on that stage's row
 *   hireBusiness:<businessId> the Hire button on a station row  hireTransport    the Hire button on the transport manager card
 *   startRush                 the Rush button in the scene      openChest        the chest button in the scene
 *   claimMission:<index>      the Claim button in the missions dialog            missionsButton   the missions button in the scene
 *   buyUpgrade:<upgradeId>    the Buy button in the upgrades tab                 unlockVenue:<venueId>  the Unlock button in the empire tab
 *   levelUpCard:<cardId>      the Level up button in the card dialog             card:<cardId>    the card in the staff tab
 *   stage:production | stage:transport | stage:sales   the three chips of the stage strip
 *   tab:home | tab:staff | tab:upgrades | tab:empire | tab:shop   the tab bar buttons
 *   header:cash | header:gems the counters in the header (where coins and gems fly to)
 *   chestShelf                the Open button of the first chest on the Staff tab's chest shelf
 *   shell:content             the visible content area between the header and the banner / tab bar
 *
 * KEYS of the merge mode (Night Market, docs/design/market-design.md 3.1 and 4.2; a contract between
 * the rules' hintsFor, src/engine/merge/hints.ts, and the screens in src/ui/merge; drawn targets are
 * set with `targets.set` from mergeLayout's rectangles, controls use useTarget)
 *   cell:<i>                  board cell i (0 to 55) in the play canvas      counter:<j>      counter j's ticket column (0 to 3)
 *   banner                    the Festival banner on the street             basket           the Basket in the bottom row
 *   front:<c>                 chain c's stall front (opens its sheet)       shutter:<group>  the next shutter of a group (0 to 3)
 *   goal                      the goal line                                 purse            the purse in the top bar (coins fly here)
 *   button:book | button:lanterns | button:season | button:shop | button:menu   the bottom-row and top-bar buttons
 *   sheet:gear | sheet:stall | sheet:minder | sheet:open   the buy buttons of the stall sheet (gear, stall level, minder, open)
 *   confirm:shutter           the shutter confirm's buy button              ticket:notTonight  the ticket detail's "Not tonight"
 *   giftbox                   the gift box button (a paper bag on the street), when one waits
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { HostInstance } from 'react-native';

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Entry {
  rect: TargetRect | null;
  /** Asks the owner to measure again (views inside scroll lists move without a layout event). */
  remeasure?: () => void;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;

function notify() {
  version++;
  listeners.forEach((l) => l());
}

function sameRect(a: TargetRect | null, b: TargetRect | null) {
  if (a === null || b === null) return a === b;
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

export const targets = {
  /** Sets (or with null, removes) the rectangle for a key. */
  set(key: string, rect: TargetRect | null, remeasure?: () => void): void {
    const prev = entries.get(key);
    if (rect === null) {
      if (!prev) return;
      entries.delete(key);
      notify();
      return;
    }
    if (prev && sameRect(prev.rect, rect)) {
      if (remeasure) prev.remeasure = remeasure;
      return;
    }
    entries.set(key, { rect, remeasure: remeasure ?? prev?.remeasure });
    notify();
  },
  /**
   * Announces that a control for `key` exists before its rectangle is known (a button that pops in
   * from nothing measures as zero-sized at first). `refresh` and `first` can then ask it to measure.
   */
  register(key: string, remeasure: () => void): void {
    const prev = entries.get(key);
    if (prev) prev.remeasure = remeasure;
    else entries.set(key, { rect: null, remeasure });
  },
  /** The control's rectangle is not usable right now (zero-sized, mid-animation): keep the key, forget the rectangle. */
  unmeasured(key: string): void {
    const prev = entries.get(key);
    if (!prev || prev.rect === null) return;
    prev.rect = null;
    notify();
  },
  /** Every key on screen right now (for debugging tools). */
  keys(): string[] {
    return [...entries].filter(([, e]) => e.rect !== null).map(([k]) => k);
  },
  get(key: string): TargetRect | null {
    return entries.get(key)?.rect ?? null;
  },
  /** Asks the owner of a key to measure it again; the result arrives through `set`. */
  refresh(key: string): void {
    entries.get(key)?.remeasure?.();
  },
  /** The first of `keys` that is on screen right now. */
  first(keys: readonly string[]): { key: string; rect: TargetRect } | null {
    for (const key of keys) {
      const entry = entries.get(key);
      if (entry?.rect) return { key, rect: entry.rect };
      // Known but not measured yet: ask now, so the next look finds it.
      entry?.remeasure?.();
    }
    return null;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  version(): number {
    return version;
  },
};

/**
 * Registers a React Native view as the target for `key` (null = not a target right now).
 * Spread the result on the view. The view is measured on layout, on mount and whenever an
 * overlay asks for a refresh; it unregisters on unmount.
 */
export function useTarget(key: string | null | undefined) {
  const ref = useRef<HostInstance>(null);
  const alive = useRef(false);
  /** The last size seen, so the settling retries can tell when a pop-in animation has finished. */
  const lastSize = useRef<{ w: number; h: number } | null>(null);
  const settled = useRef(false);
  const measure = useCallback(() => {
    if (!key) return;
    ref.current?.measureInWindow((x, y, width, height) => {
      // A measurement that comes back after the control went away must not bring its key back.
      if (!alive.current) return;
      const prev = lastSize.current;
      settled.current = !!prev && width > 0 && Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5;
      lastSize.current = { w: width, h: height };
      if (width > 0 && height > 0 && Number.isFinite(x) && Number.isFinite(y)) targets.set(key, { x, y, width, height }, measure);
      // Zero-sized (scaled to nothing while it pops in, or not laid out yet): stay registered and try again later.
      else targets.unmeasured(key);
    });
  }, [key]);
  useEffect(() => {
    if (!key) return;
    alive.current = true;
    settled.current = false;
    lastSize.current = null;
    targets.register(key, measure);
    // Layout may not have happened yet on the first effect (onLayout covers that), and a control that
    // animates in (a pop from scale 0, maybe after a delay) is zero-sized or small for a while: keep
    // measuring until two looks in a row agree on its size, for at most about 3 s.
    measure();
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const again = () => {
      timer = setTimeout(() => {
        measure();
        if (!settled.current && ++tries < 12) again();
      }, 250);
    };
    again();
    return () => {
      alive.current = false;
      if (timer) clearTimeout(timer);
      targets.set(key, null);
    };
  }, [key, measure]);
  return { ref, onLayout: measure, collapsable: false } as const;
}

/** Re-renders when any target changes; returns the first of `keys` that is on screen. */
export function useFirstTarget(keys: readonly string[]): { key: string; rect: TargetRect } | null {
  useSyncExternalStore(targets.subscribe, targets.version, targets.version);
  return targets.first(keys);
}
