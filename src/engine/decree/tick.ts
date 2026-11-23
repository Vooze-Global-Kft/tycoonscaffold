/**
 * What a tick does (2.5, `EngineMode.tick`). Package P1b (docs/design/office-build-plan.md).
 *
 * cash += I × dt exactly. Arrivals due in (clock, clock + dt] are drawn at their exact times while
 * the tray has room (draw.ts `drawNext`, P1a); with a full tray the arrival clock stops and the next
 * paper comes τ after a place frees; no arrivals during campaign, count, result. A slip lands 1.0 s
 * after desk and tray become empty, if advice() names an affordable purchase (slips.ts `slipFor`).
 * A pending take-back commits when its 2 s pass (decide.ts `commitPending`). The Standing Order buys
 * while you play (grants.ts). Nothing else moves with time. tick(a + b) = tick(a) then tick(b)
 * exactly (tested); the bot steps from event to event (`nextStop`).
 *
 * SEAM, what it calls of P1a: draw.ts `drawNext` and `landNext` (arrivals), slips.ts `slipFor` (the
 * slip), decide.ts `commitPending` (the take-back window), params.ts `decreeParams` / `commitCash`.
 */
import { notBuilt } from './notBuilt';
import { commitCash, decreeParams } from './params';
import { MAX_TICK, type DecreeConfig, type DecreeEvent, type DecreeGame } from './types';

/**
 * Advances the game by `dt` seconds of play (EngineMode.tick), adding `stats.playSeconds` itself.
 * Built for the skeleton: dibs at I (the open ministries' rate, 2.4) and the clock. Not yet:
 * arrivals, slips, the pending commit, the Standing Order, event-exact stepping (P1b).
 */
export function advanceDecree(cfg: DecreeConfig, g: DecreeGame, dt: number, now: number, events?: DecreeEvent[]): DecreeGame {
  if (!(dt > 0)) return g;
  const step = Math.min(dt, MAX_TICK);
  const I = decreeParams(cfg, g).I;
  const paid = commitCash(g, I * step, 'tick');
  return { ...paid, stats: { ...paid.stats, playSeconds: paid.stats.playSeconds + step } };
}

/** "Next visitor 0:07" on the door glass (3.1, 5.1): seconds of play until the next arrival, or null while the arrival clock is stopped. Built. */
export function nextVisitorIn(cfg: DecreeConfig, g: DecreeGame): number | null {
  const at = g.decree.nextArrivalAt;
  return at === null ? null : Math.max(0, at - g.stats.playSeconds);
}

/** The play-clock time of the next thing that happens by itself (an arrival, a slip, a pending commit), or null; the bot steps to it. Skeleton: throws notBuilt. */
export function nextStop(cfg: DecreeConfig, g: DecreeGame): number | null {
  return notBuilt('nextStop');
}
