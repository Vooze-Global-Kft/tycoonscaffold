/**
 * What the market's cards print, as lines (Txt) from the rules' data: pure, so the tests read exactly
 * what the views show (the views import these; no React here). Every line is a key of ../strings.ts with
 * typed arguments; numbers are formatted by `say` through the facade's formatters; nothing is computed
 * but which line to print.
 */
import type { AwayCard, BoardRow, SkipLabel, TableRow, TextKey, Ticket, Txt } from '../../../engine/salvage';
import { TEXT } from '../strings';

// ------------------------------------------------------------------------------- the price board

/** True when a board row prints a fourth line (a reservation or a set-aside lot). */
export const rowExtra = (r: BoardRow): boolean => r.reserved_g > 0 || r.aside_g > 0;

/** The board's words for a day word (null: a usual day prints nothing). */
export const DAY_WORD: Record<BoardRow['word'], Txt | null> = { low: { key: 'board.lowDay' }, usual: null, high: { key: 'board.highDay' } };

// ------------------------------------------------------------------------------- the industry table

/** The rival plate's seed: its register number less one (rival.1 → 0 .. rival.25 → 24), null for the player. */
export function plateSeed(row: Pick<TableRow, 'id'>): number | null {
  const m = /^rival\.(\d+)$/.exec(row.id);
  return m ? Number(m[1]) - 1 : null;
}

// ------------------------------------------------------------------------------- the away card

/** At most this many grade lines; the rest is "+ n more" (4.4). */
export const AWAY_LINES = 5;

/** Every line the away card prints, in order. */
export function awayLines(a: AwayCard): { head: Txt; lines: Txt[]; summary: Txt[] } {
  const head: Txt = { key: 'away.head', args: { t: { secs: a.seconds }, c: { n: a.capS / 3600 } } };
  const lines = a.lines.slice(0, AWAY_LINES).map((l): Txt => ({ key: 'away.line', args: { grade: { grade: l.grade }, kg: { mass_g: l.g, step: 'lot' }, x: { money: l.money } } }));
  if (a.lines.length > AWAY_LINES) lines.push({ key: 'ticket.more', args: { n: { n: a.lines.length - AWAY_LINES } } });
  const summary: Txt[] = [];
  if (a.supplied_g > 0 || a.money > 0) summary.push({ key: 'away.supplied', args: { t: { tonnes_g: a.supplied_g }, x: { money: a.money } } });
  else summary.push({ key: 'away.nothing' });
  if (a.loads > 0) summary.push({ key: 'away.loads', args: { n: { n: a.loads } } });
  if (a.deliveries > 0) summary.push({ key: 'away.deliveries', args: { n: { n: a.deliveries } } });
  for (const r of a.passed) summary.push({ key: 'away.passed', args: { rival: { name: `${r}.chip` } } });
  // The rules' hint can be the very line already printed ("Nothing was weighed out." twice): print it once.
  if (a.hint && !summary.some((t) => t.key === a.hint!.key && JSON.stringify(t.args ?? {}) === JSON.stringify(a.hint!.args ?? {}))) summary.push(a.hint);
  return { head, lines, summary };
}

// ------------------------------------------------------------------------------- the clipboard's tickets

/** A ticket's head and total and its lines, as the history prints them. */
export function ticketSummary(t: Ticket): { head: Txt; total: Txt | null; lines: Txt[] } {
  const date: Txt = { key: 'ticket.date', args: { date: { day: t.day } } };
  switch (t.kind) {
    case 'weighIn':
      return {
        head: { key: 'ticket.weighInHead', args: { n: { n: t.no } } },
        total: { key: 'ticket.todaysValue', args: { x: { money: t.todaysValue } } },
        lines: [...t.lines.map((l): Txt => ({ key: 'ticket.gradeAmount', args: { grade: { grade: l.grade }, kg: { mass_g: l.g, step: 'platform' }, x: { price: l.price } } })), { key: 'ticket.weighInLegal' }, date],
      };
    case 'collection':
      return {
        head: { key: 'ticket.collectionHead', args: { n: { n: t.no } } },
        total: { key: 'ticket.paid', args: { x: { money: t.paid } } },
        lines: [...t.lines.map((l): Txt => ({ key: 'ticket.gradeAmount', args: { grade: { grade: l.grade }, kg: { mass_g: l.g, step: 'lot' }, x: { money: l.amount } } })), { key: 'ticket.lotSoldTo' }, { key: 'ticket.weighedOut' }, date],
      };
    case 'skipWeighIn':
      return {
        head: t.trial ? { key: 'ticket.skipHead', args: { partner: { name: t.partner }, load: { text: 'ticket.trial' } } } : { key: 'card.skipState', args: { partner: { name: t.partner } } },
        total: { key: 'ticket.paid', args: { x: { money: t.paid } } },
        lines: [{ key: 'ticket.grossTareNet', args: { a: { mass_g: t.gross_g, step: 'bridge' }, b: { mass_g: t.tare_g, step: 'bridge' }, c: { mass_g: t.net_g, step: 'bridge' } } }, { key: 'ticket.partnerLegal' }, date],
      };
    case 'dropOffSlip':
      return { head: { key: 'ticket.dropOffSlip', args: { thing: { thing: t.thing } } }, total: null, lines: [date] };
    case 'dealDelivery':
      return { head: { key: 'ticket.dealDelivery', args: { kg: { mass_g: t.g, step: 'lot' }, x: { money: t.paid } } }, total: null, lines: [{ key: 'ticket.weighedOut' }, date] };
  }
}

// ------------------------------------------------------------------------------- the skip

/** The skip label's head line for its state (2.7). */
export function skipHead(s: SkipLabel): Txt {
  const partner = { name: s.partner };
  if (s.state === 'trial') return { key: 'card.skipTrial', args: { partner } };
  if (s.state === 'onTruck') return { key: 'card.skipOnTruck' };
  if (s.state === 'filling') return { key: 'refusal.filling', args: { t: { secs: Math.max(0, s.fullInS ?? 0) } } };
  return { key: 'card.skipState', args: { partner } };
}

/** The skip plan's load for the state (empty while it fills: its contents are not fixed yet). */
export const planLoad = (s: SkipLabel): 'empty' | 'trial' | 'full' => (s.state === 'trial' ? 'trial' : s.state === 'filling' ? 'empty' : 'full');

// ------------------------------------------------------------------------------- the rung sign

/** What the rung sign says and what the rung opens (rung 2: torch, portal, deal; rung 3: the capacity). */
export function rungLines(n: number, tonnes: number, capacity: number | null): { sign: Txt; opens: Txt | null } {
  const sign: Txt = { key: 'table.rungSign', args: { t: { tonnes_g: tonnes * 1e6 } } };
  const key = `opens.rung${n}` as TextKey;
  if (n === 2) return { sign, opens: { key } };
  if (n === 3) return { sign, opens: { key, args: { c: { n: capacity ?? 0 } } } };
  return { sign, opens: null };
}

// ------------------------------------------------------------------------------- Help

/** The lessons Help prints, in the content's order: the ticket line's key (when it has no hole to fill), the grade's name, the sentence. */
export function helpLessons(c: { text?: { lessons?: Record<string, { ticket: string; help: string }> }; grades: Record<string, { name?: string }> }): { id: string; key: TextKey | null; title: string; help: string }[] {
  const lessons = c.text?.lessons ?? {};
  return Object.entries(lessons).map(([id, l]) => {
    const key = (l.ticket in TEXT ? l.ticket : null) as TextKey | null;
    const plain = key !== null && !/\{/.test(TEXT[key]);
    return { id, key: plain ? key : null, title: c.grades[id]?.name ?? id, help: l.help };
  });
}
