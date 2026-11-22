/**
 * Haptics on expo-haptics (SDK 58): plays the catalogue's patterns.
 *
 * - iOS: the Taptic Engine's own impact, selection and notification feedback.
 * - Android: the system haptic constants (`performAndroidHapticsAsync`),
 *   which are crisp, tuned by each phone maker and follow the user's "touch
 *   feedback" setting. expo-haptics' `impactAsync` and friends are raw
 *   `Vibrator` pulses of 40 to 60 ms on Android and feel like a buzz, so they
 *   are only the fallback where a constant needs a newer Android.
 * - Web: nothing. expo-haptics has a web shim (navigator.vibrate, and a hidden
 *   checkbox trick on iOS Safari); a browser preview must not use either, so
 *   the module is never even loaded there.
 *
 * This file imports nothing from React Native: the platform is passed in and
 * expo-haptics is loaded on first use, so the mapping is unit-tested in Node.
 */
import type { Clock } from './clock';
import type { HapticStep } from './catalog';
import { PatternPlayer, type HapticPulse } from './pattern';

type HapticsModule = typeof import('expo-haptics');

/** Never buzz more often than this, however fast events arrive (8 pulses a second, the ceiling Android's haptics guidance suggests). */
export const HAPTIC_MIN_GAP_MS = 120;

export interface HapticsEngine {
  /** Plays a catalogue pattern. A newer pattern cancels the rest of an older one. */
  play(pattern: readonly HapticStep[] | undefined): void;
  /** Drops the pulses that have not fired yet (app left the foreground, haptics switched off). */
  cancel(): void;
}

export interface HapticsOptions {
  /** `Platform.OS`. */
  os: string;
  /** `Platform.Version` on Android (the API level). */
  androidApi?: number;
  /** Loads expo-haptics; null when it is not in this binary. Tests pass a fake. */
  load?: () => HapticsModule | null;
  minGapMs?: number;
  clock?: Clock;
}

type AndroidType = keyof HapticsModule['AndroidHaptics'];

/**
 * Android: the system constant for each catalogue pulse, best first, with the
 * API level it needs. If none fits the phone, the Vibrator-based call is used.
 * On stock Android these resolve to: tick (Clock_Tick, Context_Click,
 * Segment_Tick), click (Virtual_Key, Keyboard_Tap, Confirm), heavy click
 * (Long_Press) and double click (Reject).
 */
const ANDROID: Record<HapticPulse, readonly (readonly [AndroidType, number])[]> = {
  select: [
    ['Segment_Tick', 34],
    ['Clock_Tick', 1],
  ],
  soft: [['Clock_Tick', 1]],
  light: [['Context_Click', 1]],
  medium: [['Virtual_Key', 1]],
  rigid: [['Keyboard_Tap', 1]],
  heavy: [['Long_Press', 1]],
  success: [['Confirm', 30]],
  warning: [['Reject', 30]],
  error: [['Reject', 30]],
};

const NOTIFICATION = { success: 'Success', warning: 'Warning', error: 'Error' } as const;
const IMPACT = { light: 'Light', medium: 'Medium', heavy: 'Heavy', soft: 'Soft', rigid: 'Rigid' } as const;

function loadExpoHaptics(): HapticsModule | null {
  try {
    return require('expo-haptics') as HapticsModule;
  } catch {
    return null;
  }
}

/** The cross-platform expo-haptics call for one pulse (the only path on iOS, the fallback on Android). */
function generic(H: HapticsModule, pulse: HapticPulse): Promise<void> {
  if (pulse === 'select') return H.selectionAsync();
  if (pulse === 'success' || pulse === 'warning' || pulse === 'error') {
    return H.notificationAsync(H.NotificationFeedbackType[NOTIFICATION[pulse]]);
  }
  return H.impactAsync(H.ImpactFeedbackStyle[IMPACT[pulse]]);
}

function android(H: HapticsModule, pulse: HapticPulse, api: number): Promise<void> {
  if (typeof H.performAndroidHapticsAsync === 'function' && H.AndroidHaptics) {
    for (const [type, minApi] of ANDROID[pulse]) {
      const constant = H.AndroidHaptics[type];
      if (api >= minApi && constant !== undefined) return H.performAndroidHapticsAsync(constant);
    }
  }
  return generic(H, pulse);
}

const NO_HAPTICS: HapticsEngine = { play() {}, cancel() {} };

export function createHaptics(options: HapticsOptions): HapticsEngine {
  const { os } = options;
  if (os !== 'ios' && os !== 'android') return NO_HAPTICS;

  const load = options.load ?? loadExpoHaptics;
  const api = options.androidApi ?? 0;
  let mod: HapticsModule | null | undefined;

  const fire = (pulse: HapticPulse) => {
    if (mod === undefined) mod = load();
    if (!mod) return;
    // Every call is async on the native side; a rejection (module missing, haptic unsupported) is not an error for the game.
    const done = os === 'android' ? android(mod, pulse, api) : generic(mod, pulse);
    Promise.resolve(done).catch(() => {});
  };

  const player = new PatternPlayer(fire, { minGapMs: options.minGapMs ?? HAPTIC_MIN_GAP_MS, clock: options.clock });

  return {
    play(pattern) {
      if (!pattern || pattern.length === 0) return;
      try {
        player.play(pattern);
      } catch {
        // Never throw into game code.
      }
    },
    cancel() {
      player.cancel();
    },
  };
}
