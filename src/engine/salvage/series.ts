/**
 * The two ticket books (finding W16): weigh-ins and sales are numbered in two series, each from 1, as a
 * real yard numbers each book. Owner: rules-sim-b. `no` stays the history's unique order; `series` is
 * the number a ticket PRINTS.
 *
 * The counters live in the state's `counts` (persisted by save as every count): `ticket#weigh` and
 * `ticket#sale`, the LAST number printed. A fresh game sets both to 0 (create.ts). A save from before
 * the fix pass has neither: its books go on from its old shared counter (`ticketNo`), so no number it
 * already printed is printed again.
 */
import type { SalvageState, Ticket, TicketKind } from './types';

/** Which book a kind of ticket is numbered in (a drop-off slip in none). */
export function seriesOf(kind: TicketKind): 'weigh' | 'sale' | null {
  if (kind === 'weighIn' || kind === 'skipWeighIn') return 'weigh';
  if (kind === 'collection' || kind === 'dealDelivery') return 'sale';
  return null;
}

/** The counts key of a book. */
export const seriesKey = (book: 'weigh' | 'sale') => `ticket#${book}`;

/** Give a ticket its printed number from its book (mutates the ticket and the state's counter). Call once per printed ticket. */
export function stampSeries(s: SalvageState, t: Ticket): void {
  const book = seriesOf(t.kind);
  if (!book) return;
  if (!s.counts) s.counts = {};
  const key = seriesKey(book);
  const last = s.counts[key] ?? Math.max(0, s.ticketNo - 1);
  const n = last + 1;
  s.counts[key] = n;
  t.series = n;
}
