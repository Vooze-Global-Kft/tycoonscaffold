/**
 * Tickets' lines (yard-stage1.md 2.2, D8). READS state only (owner: rules-book). The rules-sim writes
 * each ticket into `salvage.tickets` when it prints; this module is what the screens read. Moved from
 * the facade at the seam (16:20).
 */
import type { SalvageGame, Ticket } from './types';

/** The tickets of the history, newest last (at most 50). */
export function tickets(g: SalvageGame): readonly Ticket[] {
  return g.salvage.tickets;
}
