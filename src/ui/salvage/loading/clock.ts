/**
 * The loading animation's one clock, kept for the whole launch: the app shell's loading screen
 * (../Loading.tsx, while the save and the fonts load) and the curtain over the yard (./LoadingCurtain.tsx,
 * while the atlases bake) both run it, so the second picks up the very frame the first left: no jump.
 * Also whether this is the first launch (a tap skips the animation only from the second, S22), kept in
 * AsyncStorage like the other device settings.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeMutable } from 'react-native-reanimated';
import { loadingDev } from './dev';

/** Never set: the gate has not begun. */
export const NOT_YET = 1e9;

export const loadingClock = {
  /** Seconds since the animation began. */
  t: makeMutable(0),
  /** The last frame's timestamp (two stages mounted for one frame advance the clock once). */
  last: makeMutable(-1),
  /** When the gate began to part (NOT_YET until the bakes are done and the timeline allows). */
  gateAt: makeMutable(NOT_YET),
  /** The gate's progress 0..1 (set only while it moves, so the still background redraws only then). */
  gateP: makeMutable(0),
  /** The next sound cue to play. */
  cue: makeMutable(0),
  /** The end of the timeline has been seen (once). */
  ended: makeMutable(false),
  /** The gate has finished (once). */
  done: makeMutable(false),
};

const KEY = 'salvage:loading:v1';
let seenBefore = loadingDev.seen;

void (async () => {
  try {
    if ((await AsyncStorage.getItem(KEY)) === '1') seenBefore = true;
  } catch {
    // a read that fails counts as a first launch: the animation plays, which is harmless
  }
})();

/** True from the second launch on: a tap skips. */
export function canSkip(): boolean {
  return seenBefore;
}

/** The whole animation has been seen once: from the next launch a tap skips it. */
export function markSeen(): void {
  void AsyncStorage.setItem(KEY, '1').catch(() => {});
}
