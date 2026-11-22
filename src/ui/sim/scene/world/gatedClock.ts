/**
 * A copy of the scene clock that stands still while `on` is 0. A hidden actor given this clock
 * costs one tiny comparison per frame instead of a full rig step: nothing it draws reads a value
 * that changes, so its mapper never runs and nothing of it is redrawn.
 */
import { useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';

export function useGatedClock(clock: SharedValue<number>, on: SharedValue<number>): SharedValue<number> {
  const out = useSharedValue(clock.value);
  useAnimatedReaction(
    () => (on.value > 0.5 ? clock.value : -1),
    (v) => {
      if (v >= 0 && v !== out.value) out.value = v;
    },
  );
  return out;
}
