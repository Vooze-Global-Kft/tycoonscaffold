/**
 * owner1 phone 3: how late JavaScript is, for the development panel (./DevPanel.tsx; on a phone only with the
 * panel's own switch, ./switches.ts, and __DEV__). "Laggy" with a steady frame rate is JavaScript running late:
 * the rules' tick is due every 100 ms (src/ui/App.tsx's loop); each tick shows here as a store change whose
 * yard second moved, and its lateness is the gap since the previous one less 100 ms. Over the last five seconds:
 * the mean and the worst lateness, and the scene and item pushes a second (../world/useRulesTable.ts
 * `pushCounts`). Nothing runs until the panel starts it; it stops when the panel unmounts.
 */
import { useGame } from '../../../state/store';
import { pushCounts } from '../world/useRulesTable';

export const TICK_DUE_MS = 100;
const WINDOW_MS = 5000;

export interface JsLate {
  meanMs: number;
  worstMs: number;
  scenesPerS: number;
  itemsPerS: number;
}

/** Pure: lateness of each gap between tick instants (ms), the mean and the worst over the gaps. */
export function lateOf(at: readonly number[], due = TICK_DUE_MS): { meanMs: number; worstMs: number } {
  if (at.length < 2) return { meanMs: 0, worstMs: 0 };
  let sum = 0;
  let worst = 0;
  for (let i = 1; i < at.length; i++) {
    const late = Math.max(0, at[i] - at[i - 1] - due);
    sum += late;
    if (late > worst) worst = late;
  }
  return { meanMs: sum / (at.length - 1), worstMs: worst };
}

/** Starts the meter; `read()` gives the last five seconds; `stop()` unsubscribes. */
export function startJsLate(clock: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())): { read: () => JsLate; stop: () => void } {
  const ticks: number[] = [];
  const pushes: { at: number; scenes: number; items: number }[] = [];
  let lastT: number | undefined;
  const stop = useGame.subscribe((s) => {
    const t = (s.game as { salvage?: { t?: number } })?.salvage?.t;
    if (t === undefined || t === lastT) return;
    lastT = t;
    ticks.push(clock());
  });
  const read = (): JsLate => {
    const now = clock();
    while (ticks.length && ticks[0] < now - WINDOW_MS) ticks.shift();
    pushes.push({ at: now, scenes: pushCounts.scenes, items: pushCounts.items });
    while (pushes.length > 1 && pushes[0].at < now - WINDOW_MS) pushes.shift();
    const first = pushes[0];
    const span = (now - first.at) / 1000;
    return {
      ...lateOf(ticks),
      scenesPerS: span > 0 ? (pushCounts.scenes - first.scenes) / span : 0,
      itemsPerS: span > 0 ? (pushCounts.items - first.items) / span : 0,
    };
  };
  return { read, stop };
}

/** The panel's words: 'js +12/+180 ms  push 10.0/0.4 /s' (scenes / item lists a second). */
export function jsLateLine(j: JsLate): string {
  return `js +${Math.round(j.meanMs)}/+${Math.round(j.worstMs)} ms  push ${j.scenesPerS.toFixed(1)}/${j.itemsPerS.toFixed(1)} /s`;
}
