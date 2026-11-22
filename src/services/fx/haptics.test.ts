import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FX, type HapticStep } from './catalog';
import { createHaptics } from './haptics';
import { testClock } from './testkit';

type HapticsModule = typeof import('expo-haptics');

/** expo-haptics with the same names and values as SDK 58 (build/Haptics.types.d.ts), recording calls. */
function fakeModule(options: { reject?: boolean; withoutAndroid?: boolean } = {}) {
  const calls: string[] = [];
  const call = (text: string) => {
    calls.push(text);
    return options.reject ? Promise.reject(new Error('unsupported')) : Promise.resolve();
  };
  const mod = {
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
    AndroidHaptics: {
      Confirm: 'confirm',
      Reject: 'reject',
      Clock_Tick: 'clock-tick',
      Context_Click: 'context-click',
      Keyboard_Tap: 'keyboard-tap',
      Long_Press: 'long-press',
      Virtual_Key: 'virtual-key',
      Segment_Tick: 'segment-tick',
    },
    impactAsync: (style: string) => call(`impact:${style}`),
    notificationAsync: (type: string) => call(`notification:${type}`),
    selectionAsync: () => call('selection'),
    performAndroidHapticsAsync: (type: string) => call(`android:${type}`),
  };
  if (options.withoutAndroid) {
    delete (mod as Partial<typeof mod>).performAndroidHapticsAsync;
  }
  return { calls, mod: mod as unknown as HapticsModule };
}

const ALL: HapticStep[] = ['select', 'soft', 'light', 'rigid', 'medium', 'heavy', 'success', 'warning', 'error'];

/** Plays each pulse on its own, far enough apart that none is dropped. */
function playEach(engine: ReturnType<typeof createHaptics>) {
  for (const pulse of ALL) {
    engine.play([pulse]);
    vi.advanceTimersByTime(1000);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_700_000_000_000);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('haptics', () => {
  it('iOS uses the Taptic Engine feedback types', () => {
    const { calls, mod } = fakeModule();
    playEach(createHaptics({ os: 'ios', load: () => mod, clock: testClock }));
    expect(calls).toEqual([
      'selection',
      'impact:soft',
      'impact:light',
      'impact:rigid',
      'impact:medium',
      'impact:heavy',
      'notification:success',
      'notification:warning',
      'notification:error',
    ]);
  });

  it('Android uses the system haptic constants', () => {
    const { calls, mod } = fakeModule();
    playEach(createHaptics({ os: 'android', androidApi: 35, load: () => mod, clock: testClock }));
    expect(calls).toEqual([
      'android:segment-tick',
      'android:clock-tick',
      'android:context-click',
      'android:keyboard-tap',
      'android:virtual-key',
      'android:long-press',
      'android:confirm',
      'android:reject',
      'android:reject',
    ]);
  });

  it('older Android falls back where a constant is too new', () => {
    const { calls, mod } = fakeModule();
    playEach(createHaptics({ os: 'android', androidApi: 29, load: () => mod, clock: testClock }));
    expect(calls).toEqual([
      'android:clock-tick', // Segment_Tick needs API 34
      'android:clock-tick',
      'android:context-click',
      'android:keyboard-tap',
      'android:virtual-key',
      'android:long-press',
      'notification:success', // Confirm and Reject need API 30
      'notification:warning',
      'notification:error',
    ]);
  });

  it('an expo-haptics without Android haptics still vibrates', () => {
    const { calls, mod } = fakeModule({ withoutAndroid: true });
    const engine = createHaptics({ os: 'android', androidApi: 35, load: () => mod, clock: testClock });
    engine.play(['medium', 100, 'success']);
    vi.advanceTimersByTime(200);
    expect(calls).toEqual(['impact:medium', 'notification:success']);
  });

  it('is a no-op on web and never loads the module there', () => {
    const load = vi.fn();
    const engine = createHaptics({ os: 'web', load, clock: testClock });
    engine.play(['heavy', 80, 'success']);
    engine.cancel();
    vi.advanceTimersByTime(1000);
    expect(load).not.toHaveBeenCalled();
  });

  it('loads expo-haptics once, on first use', () => {
    const { mod } = fakeModule();
    const load = vi.fn(() => mod);
    const engine = createHaptics({ os: 'ios', load, clock: testClock });
    expect(load).not.toHaveBeenCalled();
    engine.play(['light']);
    vi.advanceTimersByTime(500);
    engine.play(['light']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when the native module is missing or rejects', async () => {
    const missing = createHaptics({ os: 'ios', load: () => null, clock: testClock });
    expect(() => missing.play(['heavy', 50, 'success'])).not.toThrow();
    vi.advanceTimersByTime(100);

    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const { calls, mod } = fakeModule({ reject: true });
    const rejecting = createHaptics({ os: 'android', androidApi: 35, load: () => mod, clock: testClock });
    rejecting.play(['success']);
    await vi.advanceTimersByTimeAsync(10);
    process.off('unhandledRejection', unhandled);
    expect(calls).toEqual(['android:confirm']);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('plays patterns with their pauses and cancels on request', () => {
    const { calls, mod } = fakeModule();
    const engine = createHaptics({ os: 'ios', load: () => mod, clock: testClock });
    engine.play(['heavy', 80, 'success']);
    expect(calls).toEqual(['impact:heavy']);
    vi.advanceTimersByTime(80);
    expect(calls).toEqual(['impact:heavy', 'notification:success']);
    // The second pattern starts one gap after the last pulse, so cancelling right away drops all of it.
    engine.play(['heavy', 80, 'success']);
    engine.cancel();
    vi.advanceTimersByTime(500);
    expect(calls).toEqual(['impact:heavy', 'notification:success']);
  });

  it('ignores a missing or empty pattern', () => {
    const { calls, mod } = fakeModule();
    const engine = createHaptics({ os: 'ios', load: () => mod, clock: testClock });
    engine.play(undefined);
    engine.play([]);
    expect(calls).toEqual([]);
  });

  it('every pattern in the catalogue plays to the end', () => {
    for (const [name, def] of Object.entries(FX)) {
      if (!('haptic' in def)) continue;
      const { calls, mod } = fakeModule();
      const engine = createHaptics({ os: 'ios', load: () => mod, clock: testClock });
      engine.play(def.haptic);
      vi.advanceTimersByTime(5000);
      const pulses = def.haptic.filter((step) => typeof step !== 'number').length;
      expect(calls, name).toHaveLength(pulses);
    }
  });
});
