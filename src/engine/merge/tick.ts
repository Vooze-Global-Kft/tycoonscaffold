/**
 * `advanceMerge` (spec 2.4): what one tick does. The store calls the engine mode's tick about ten
 * times a second; dt is cut to MAX_TICK (3,600 s, as haul); the tick runs the event queue
 * (./events.ts) over (clock, clock + dt], each event at its own time, and adds `stats.playSeconds`
 * itself. Because every follow-up time comes from the event's own time, tick(a + b) equals tick(a)
 * then tick(b) exactly (src/engine/merge/tick.split.test.ts), and the bot steps from event to
 * event with one call per event (`nextMergeEvent` gives the time to step to).
 *
 * Package MECHANICS (docs/design/market-build-plan.md). `now` (the wall clock) is not read: the
 * merge rules run on the game clock only (time away is offline.ts's closed form).
 */
import { nextEvent, runEvent } from './events';
import { MAX_TICK, type MergeConfig, type MergeEvent, type MergeGame, type QueuedEvent } from './types';

/** Events one tick may run before it stops (a guard against a rule that would re-arm itself at one time; never reached by the rules). */
export const MAX_EVENTS_PER_TICK = 200_000;

const atClock = (g: MergeGame, t: number): MergeGame => (g.stats.playSeconds === t ? g : { ...g, stats: { ...g.stats, playSeconds: t } });

/** Advances the game by `dt` seconds of play (cut to [0, MAX_TICK]). Pure. */
export function advanceMerge(cfg: MergeConfig, g: MergeGame, dt: number, now: number, events?: MergeEvent[]): MergeGame {
  void now;
  const step = Math.min(MAX_TICK, Math.max(0, Number.isFinite(dt) ? dt : 0));
  if (step <= 0) return g;
  const start = g.stats.playSeconds ?? 0;
  const end = start + step;
  let x = g;
  for (let n = 0; n < MAX_EVENTS_PER_TICK; n++) {
    const e = nextEvent(cfg, x, end);
    if (!e) break;
    x = runEvent(cfg, atClock(x, e.at), e, events);
  }
  return atClock(x, end);
}

/** The next event the queue holds (any time ahead), or null: the bot steps to `at` with one tick. */
export function nextMergeEvent(cfg: MergeConfig, g: MergeGame): QueuedEvent | null {
  return nextEvent(cfg, g, Infinity);
}
