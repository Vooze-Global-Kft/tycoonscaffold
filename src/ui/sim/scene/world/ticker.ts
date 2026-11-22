/**
 * How often the game state really changes, so actors glide from one engine tick to the next in
 * exactly the time between ticks. The store ticks about ten times a second, but the preview's
 * speed switch, a slow phone or a rush can change the rhythm: never assume 100 ms.
 */
import { Easing, withTiming, type SharedValue } from 'react-native-reanimated';
import { useGame } from '../../../../state/store';

let lastAt = 0;
let interval = 100;
let started = false;

function start() {
  if (started) return;
  started = true;
  useGame.subscribe((s, prev) => {
    if (s.game === prev.game) return;
    const now = Date.now();
    const d = now - lastAt;
    lastAt = now;
    // Ignore the first tick and long pauses (backgrounded app); smooth out jitter.
    if (d > 8 && d < 1000) interval = interval * 0.7 + d * 0.3;
  });
}

/** Milliseconds a glide between two ticks should take. Slightly longer than the gap, so a late tick never leaves an actor standing still. */
export function glideMs(): number {
  start();
  return Math.max(30, Math.min(450, interval * 1.12));
}

const LINEAR = { easing: Easing.linear };

/** Moves a shared value to `to` over the time between ticks, or jumps there. */
export function glide(sv: SharedValue<number>, to: number, jump = false): void {
  if (jump) {
    sv.value = to;
    return;
  }
  sv.value = withTiming(to, { duration: glideMs(), ...LINEAR });
}
