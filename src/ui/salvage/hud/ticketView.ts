/**
 * What a ticket prints (yard-stage1.md 2.2 and 4.4), as words, from the rules' `Ticket`: pure, so the
 * limits (three grade rows and "+ n more", one lesson, the legal lines) are tested. Every word is a key
 * of ../strings.ts through `say`; every number goes through the facade's formatters; grade names come
 * from the game's content.
 */
import * as R from '../../../engine/salvage';
import type { SalvageContent, Ticket, TicketLine } from '../../../engine/salvage';
import { say } from './words';
import { textW, ticketHeight, TICKET_PT } from './metrics';

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
  /** Every grade row (the plan shows at most three, ./ticketView.ts planTicket). */
  rows: TicketRow[];
  /** Weigh-in: the muted "today's value §x"; collection: the bold "Paid §x". */
  total: string;
  lesson: string | null;
  legal: string[];
}

/** At most this many grade rows (4.4, S20). */
export const MAX_ROWS = 3;

function note(l: TicketLine, c: Content): string | null {
  // The car's treatment-record ref comes on the line; a `name` argument not in the register prints as itself.
  if (l.note?.kind === 'fromCar') return say({ key: 'ticket.fromCar', args: { ref: { name: l.note.ref } } }, c);
  if (l.note?.kind === 'certifiedEmpty') return say({ key: 'ticket.certifiedEmpty' }, c);
  return null;
}

/** A grade's name on a ticket or chip: the short one (the lead's ruling 5, 15:55), else its name. */
export function gradeShort(grade: string, c: Content): string {
  const g = c.grades[grade] as { name?: string; short?: string } | undefined;
  return g?.short ?? g?.name ?? grade;
}

function rows(lines: TicketLine[], c: Content, right: (l: TicketLine) => string): TicketRow[] {
  return lines.map((l) => ({
    grade: l.grade,
    name: gradeShort(l.grade, c),
    kg: R.fmtMass(l.g, 'lot'),
    right: right(l),
    note: note(l, c),
  }));
}

/**
 * The weigh-in ticket or the collection ticket in words; null for the other kinds (their chips or the world
 * show them). `lesson`: the weigh-in's lesson line (default: the rules' `lessonText`, already paced; null
 * prints none, as above font scale 1.15).
 */
export function ticketView(t: Ticket, c: Content, lesson?: R.Txt | null): TicketView | null {
  if (t.kind === 'weighIn') {
    const r = rows(t.lines, c, (l) => say({ key: 'ticket.gradeToday', args: { p: { price: l.price } } }, c));
    return {
      kind: 'weighIn',
      no: t.no,
      head: say({ key: 'ticket.weighInHead', args: { n: { n: t.no } } }, c),
      rows: r,
      total: say({ key: 'ticket.todaysValue', args: { x: { money: t.todaysValue } } }, c),
      lesson: (() => {
        const l = lesson === undefined ? t.lessonText : lesson;
        return l ? say(l, c) : null;
      })(),
      legal: [say({ key: 'ticket.weighInLegal' }, c)],
    };
  }
  if (t.kind === 'collection') {
    const r = rows(t.lines, c, (l) => R.fmtMoney(l.amount));
    return {
      kind: 'collection',
      no: t.no,
      head: say({ key: 'ticket.collectionHead', args: { n: { n: t.no } } }, c),
      rows: r,
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

/** What a ticket of this width shows at bar scale s: its rows (at most three), "+ n more", one or two lines a row, its height. */
export interface TicketPlan {
  rows: TicketRow[];
  more: string | null;
  /** A row too wide for one line prints the name on one line and the mass and price under it. */
  twoLine: boolean;
  height: number;
}

/** Inner width of a ticket row: the ticket less its sprocket strip, paddings and edges. */
export function rowWidth(w: number): number {
  return w - 10 - 12 - 3;
}

/**
 * The plan (4.4, S20): up to three rows on one line each when they fit; else two lines a row, and as many
 * rows as keep the ticket at most `maxH` (150 pt) tall, the rest counted in "+ n more".
 */
export function planTicket(v: TicketView, w: number, s: number, c: Content, maxH = 150): TicketPlan {
  const most = s > 1.15 ? 2 : MAX_ROWS;
  const pt = TICKET_PT.row * s;
  const inner = rowWidth(w);
  const twoLine = v.rows.some((r) => textW(r.note ? `${r.name} · ${r.note}` : r.name, pt) + textW(r.kg, pt) + textW(r.right, pt) + 16 > inner);
  let n = Math.min(most, v.rows.length);
  const hOf = (k: number) => ticketHeight(v.kind, k * (twoLine ? 2 : 1), !!v.lesson, s);
  while (n > 1 && hOf(n) > maxH) n--;
  const extra = v.rows.length - n;
  return {
    rows: v.rows.slice(0, n),
    more: extra > 0 ? say({ key: 'ticket.more', args: { n: { n: extra } } }, c) : null,
    twoLine,
    height: hOf(n),
  };
}
