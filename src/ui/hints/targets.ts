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
 * KEYS (a contract between the screens; `hintKey()` in src/engine/view.ts produces the hint ones)
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
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { HostInstance } from 'react-native';
import type { GuideHint } from '../../engine/view';
import { hintKey } from '../../engine/view';

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
  /** Every key on screen right now (for debugging tools). */
  keys(): string[] {
    return [...entries.keys()];
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
      const rect = entries.get(key)?.rect;
      if (rect) return { key, rect };
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
  const measure = useCallback(() => {
    if (!key) return;
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0 && Number.isFinite(x) && Number.isFinite(y)) targets.set(key, { x, y, width, height }, measure);
    });
  }, [key]);
  useEffect(() => {
    if (!key) return;
    // Layout may not have happened yet on the first effect; onLayout covers that case.
    measure();
    return () => targets.set(key, null);
  }, [key, measure]);
  return { ref, onLayout: measure, collapsable: false } as const;
}

/** Re-renders when any target changes; returns the first of `keys` that is on screen. */
export function useFirstTarget(keys: readonly string[]): { key: string; rect: TargetRect } | null {
  useSyncExternalStore(targets.subscribe, targets.version, targets.version);
  return targets.first(keys);
}

/**
 * Where to point for a hint, most specific first: the control itself when it is on screen,
 * otherwise the control that leads to it (a stage chip, a button that opens a dialog, a tab).
 */
export function hintRoute(h: GuideHint): string[] {
  const key = hintKey(h);
  switch (h.kind) {
    case 'tapStation':
    case 'bell':
    case 'startRush':
      return [key, 'tab:home'];
    case 'buyBusiness':
    case 'hireBusiness':
      return [key, 'stage:production', 'tab:home'];
    case 'buyTransport':
    case 'hireTransport':
      return [key, 'stage:transport', 'tab:home'];
    case 'buySales':
      return [key, 'stage:sales', 'tab:home'];
    case 'openChest':
      return [key, 'tab:home'];
    case 'claimMission':
      return [key, 'missionsButton', 'tab:home'];
    case 'buyUpgrade':
      return [key, 'tab:upgrades'];
    case 'unlockVenue':
      return [key, 'tab:empire'];
    case 'levelUpCard':
      return [key, `card:${h.cardId}`, 'tab:staff'];
  }
}
