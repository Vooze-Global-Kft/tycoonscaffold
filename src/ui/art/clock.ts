/**
 * A scene clock that can be paused.
 *
 * Skia's `useClock()` ticks for as long as the component is mounted. A scene
 * that is mounted but not on screen (another tab is open, the app is in the
 * background) should stop: every Character and prop runs its little worklet
 * on each tick of its clock. `useSceneClock(running)` is a drop-in
 * replacement that only advances while `running` is true, and resumes where
 * it stopped (no jump when it starts again).
 *
 *   const clock = useSceneClock(isFocused && appActive);
 *   <Character ... clock={clock} />
 */
import { useEffect } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

/** Milliseconds of scene time; advances only while `running`. `speed` 2 runs the scene twice as fast. */
export function useSceneClock(running = true, speed = 1): SharedValue<number> {
  const clock = useSharedValue(0);
  const cb = useFrameCallback((frame) => {
    'worklet';
    const dt = frame.timeSincePreviousFrame ?? 0;
    // A long gap (the app was suspended) counts as one ordinary frame.
    clock.value += (dt > 100 ? 16 : dt) * speed;
  }, running);
  useEffect(() => {
    cb.setActive(running);
  }, [cb, running]);
  return clock;
}
