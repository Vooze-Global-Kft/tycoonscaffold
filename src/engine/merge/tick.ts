/**
 * `advanceMerge` (spec 2.4): what one tick does. The store calls the engine mode's tick about ten
 * times a second; dt is cut to MAX_TICK (3,600 s, as haul); the tick runs the event queue
 * (./events.ts) over (clock, clock + dt], each event at its own time, and adds `stats.playSeconds`
 * itself. Because every follow-up time comes from the event's own time, tick(a + b) equals tick(a)
 * then tick(b) exactly (src/engine/merge/tick.split.test.ts), and the bot steps from event to
 * event with one call per event (`nextMergeStop` gives the time to step to).
 *
 * Package MECHANICS (docs/design/market-build-plan.md). `now` (the wall clock) is not read: the
 * merge rules run on the game clock only (time away is offline.ts's closed form).
 */
import { dueEvents, nextEvent, runEvent } from './events';
import { MAX_TICK, type MergeConfig, type MergeEvent, type MergeGame } from './types';

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

/**
 * The time the bot steps to when it goes from event to event: the earliest event strictly after
 * the clock (events due at the clock itself run first in that same tick), or null when nothing is
 * queued. `advanceMerge(cfg, g, stop − clock, …)` then runs exactly what a 10 Hz run would run up
 * to `stop` (src/engine/merge/determinism.test.ts).
 */
export function nextMergeStop(cfg: MergeConfig, g: MergeGame): number | null {
  const clock = g.stats.playSeconds ?? 0;
  let best: number | null = null;
  for (const e of dueEvents(cfg, g)) if (e.at > clock && (best === null || e.at < best)) best = e.at;
  return best;
}
