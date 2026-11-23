/**
 * Tickets: the draw, the bounds, the fallback, the Parade and the scripted start (spec 2.7).
 *
 * Package ORDERS (docs/design/market-build-plan.md). Seam: MECHANICS calls `drawTicket` (a counter's
 * refill, 2.4 event 6), `drawParade` (a refill while a Parade is due) and `scriptedTicket` (create()
 * and the first merge of a new game); it advances `draws.ticket` by `used` and gives the ticket
 * `nextTicketId`. This file reads `missing()` (./missing.ts), `mergeParams`/`value`/`streamValue`
 * (./params.ts) and `roomFor` (./board.ts).
 *
 * Skeleton bodies: `scriptedTicket` is built (data only); `drawTicket` returns a fixed one-line
 * ticket; `drawParade` throws notBuilt('drawParade').
 */
import { notBuilt } from './notBuilt';
import type { DrawOutcome, MergeConfig, MergeGame, Ticket } from './types';

/**
 * The scripted opening tickets of 2.7 (a new game's first season only): the fox at counter 1 asks
 * for a Twin Skewer (grill 2); the hedgehog at counter 2, who steps up at the first merge, for a
 * Glazed Skewer (grill 3). Exempt from bound (d) only. Built (create() needs the fox).
 */
export function scriptedTicket(cfg: MergeConfig, which: 'fox' | 'hedgehog', id: number): Ticket {
  const beast = cfg.merge.tickets.customers.indexOf(which);
  return { id, lines: [{ c: 0, k: which === 'fox' ? 2 : 3, filled: false }], gold: false, customer: Math.max(0, beast), coat: 0, scripted: true };
}

/**
 * Draws counter `counter`'s next ticket (spec 2.7): lines by the season clock's odds, chains by
 * weight, tiers from kmin_c = b_c + 1 to best_c with the stretch line, bounds (a) to (d) on every
 * draw and after every fallback step, the fallback (1) to (5); `ticket: null` is "Setting up…".
 * ORDERS. Skeleton: a fixed one-line ticket of the Grill at min(8, best + 1), customer by counter,
 * `used: 0`; legal by (a) and (d1) only (it checks none of (b), (c), (d2)).
 */
export function drawTicket(cfg: MergeConfig, g: MergeGame, counter: number): DrawOutcome {
  const grill = g.merge.chains[0];
  const k = Math.min(8, Math.max(2, grill.best + 1));
  const customers = cfg.merge.tickets.customers.length;
  return { ticket: { id: g.merge.nextTicketId, lines: [{ c: 0, k, filled: false }], gold: false, customer: counter % customers, coat: 0 }, used: 0 };
}

/**
 * The Paper Dragon Parade's gold ticket for `counter` (spec 2.7): 3 lines from 3 different open
 * chains (2 if only 2 are open), tiers best_c − 1 to best_c, bounds (a) to (d) with the Parade's
 * W and H. ORDERS. Skeleton: throws notBuilt('drawParade').
 */
export function drawParade(cfg: MergeConfig, g: MergeGame, counter: number): DrawOutcome {
  void cfg;
  void g;
  void counter;
  throw notBuilt('drawParade');
}
