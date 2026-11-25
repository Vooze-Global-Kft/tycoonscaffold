/**
 * What a ticket prints (yard-stage1.md 2.2 and 4.4), as words, from the rules' `Ticket`: pure, so the
 * limits (three grade rows and "+ n more", one lesson, the legal lines) are tested. Every word is a key
 * of ../strings.ts through `say`; every number goes through the facade's formatters; grade names come
 * from the game's content.
 */
import * as R from '../../../engine/salvage';
import type { SalvageContent, Ticket, TicketLine } from '../../../engine/salvage';
import { say } from '../strings';

type Content = Pick<SalvageContent, 'names' | 'grades' | 'objects'>;

/** One grade row: the grade's name, its mass, and the right cell ("§0.95/kg today" or the amount). */
export interface TicketRow {
  grade: string;
  name: string;
  kg: string;
  right: string;
  note: string | null;
}

export interface TicketView {
  kind: 'weighIn' | 'collection';
  no: number;
  head: string;
  rows: TicketRow[];
  /** "+ n more", or null. */
  more: string | null;
  /** Weigh-in: the muted "today's value §x"; collection: the bold "Paid §x". */
  total: string;
  lesson: string | null;
  legal: string[];
}

/** At most this many grade rows (4.4, S20). */
export const MAX_ROWS = 3;

function note(l: TicketLine, c: Content): string | null {
  if (l.note === 'fromCar') return say({ key: 'ticket.fromCar', args: {} }, c);
  if (l.note === 'certifiedEmpty') return say({ key: 'ticket.certifiedEmpty' }, c);
  return null;
}

function rows(lines: TicketLine[], c: Content, right: (l: TicketLine) => string): { rows: TicketRow[]; more: string | null } {
  const shown = lines.slice(0, MAX_ROWS).map((l) => ({
    grade: l.grade,
    name: c.grades[l.grade]?.name ?? l.grade,
    kg: R.fmtMass(l.g, 'lot'),
    right: right(l),
    note: note(l, c),
  }));
  const extra = lines.length - shown.length;
  return { rows: shown, more: extra > 0 ? say({ key: 'ticket.more', args: { n: { n: extra } } }, c) : null };
}

/** The weigh-in ticket or the collection ticket in words; null for the other kinds (their chips or the world show them). */
export function ticketView(t: Ticket, c: Content, lesson: R.TextKey | null = t.kind === 'weighIn' ? t.lesson : null): TicketView | null {
  if (t.kind === 'weighIn') {
    const r = rows(t.lines, c, (l) => say({ key: 'ticket.gradeToday', args: { p: { price: l.price } } }, c));
    return {
      kind: 'weighIn',
      no: t.no,
      head: say({ key: 'ticket.weighInHead', args: { n: { n: t.no } } }, c),
      rows: r.rows,
      more: r.more,
      total: say({ key: 'ticket.todaysValue', args: { x: { money: t.todaysValue } } }, c),
      lesson: lesson ? say({ key: lesson }, c) : null,
      legal: [say({ key: 'ticket.weighInLegal' }, c)],
    };
  }
  if (t.kind === 'collection') {
    const r = rows(t.lines, c, (l) => R.fmtMoney(l.amount));
    return {
      kind: 'collection',
      no: t.no,
      head: say({ key: 'ticket.collectionHead', args: { n: { n: t.no } } }, c),
      rows: r.rows,
      more: r.more,
      total: say({ key: 'ticket.paid', args: { x: { money: t.paid } } }, c),
      lesson: null,
      legal: [say({ key: 'ticket.lotSoldTo', args: { merchant: { name: t.buyer } } }, c), say({ key: 'ticket.weighedOut' }, c)],
    };
  }
  return null;
}

/** The crew's weigh-in chip ("Yard hand · 58.2 kg in", 4.4 item 4). */
export function crewWeighInChip(t: Ticket, c: Content): string | null {
  if (t.kind !== 'weighIn') return null;
  const role = typeof t.by === 'string' ? t.by.split('.')[0] : '';
  const key = (`role.${role}` in ROLE_KEYS ? `role.${role}` : 'role.hand') as R.TextKey;
  const g = t.lines.reduce((a, l) => a + l.g, 0);
  return say({ key: 'chip.crewWeighIn', args: { role: { text: key }, kg: { mass_g: g, step: 'platform' } } }, c);
}

const ROLE_KEYS = { 'role.hand': 1, 'role.cutter': 1, 'role.driver': 1 } as const;

/** The one-line chip of a collection with no weigh-in of the boss's in it ("Lot sold · §29.00"). */
export function lotSoldChip(t: Ticket, c: Content): string | null {
  if (t.kind !== 'collection') return null;
  return say({ key: 'chip.lotSold', args: { x: { money: t.paid } } }, c);
}

/** A ticket's lesson line is at most this long (S20). */
export const LESSON_MAX = 48;
