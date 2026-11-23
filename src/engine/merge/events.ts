/**
 * The tick's event queue (spec 2.4): the next due event over (clock, clock + dt] and what each one
 * does. Events run strictly in time order, ties broken by (time, kind, index) in the order of
 * `EVENT_KINDS`; each follow-up time is computed from the event's own time, never from the end of
 * the tick, so tick(a + b) equals tick(a) then tick(b) exactly.
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: a refill calls ORDERS's
 * `drawTicket` / `drawParade` (./draw.ts); a minder sale and the till roll book coins through
 * `commitCash` (./actions.ts).
 *
 * Skeleton bodies: every function throws notBuilt('<name>').
 */
import { notBuilt } from './notBuilt';
import type { MergeConfig, MergeEvent, MergeGame, QueuedEvent } from './types';

/** The earliest due event at or before `until` (game clock), or null. MECHANICS. Skeleton: throws notBuilt('nextEvent'). */
export function nextEvent(cfg: MergeConfig, g: MergeGame, until: number): QueuedEvent | null {
  void cfg;
  void g;
  void until;
  throw notBuilt('nextEvent');
}

/** Runs one event at its own time (the clock is moved to `e.at` by the caller first). MECHANICS. Skeleton: throws notBuilt('runEvent'). */
export function runEvent(cfg: MergeConfig, g: MergeGame, e: QueuedEvent, events?: MergeEvent[]): MergeGame {
  void cfg;
  void g;
  void e;
  void events;
  throw notBuilt('runEvent');
}
