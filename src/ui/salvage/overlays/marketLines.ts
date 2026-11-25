/**
 * What the market's cards print, as lines (Txt) from the rules' data: pure, so the tests read exactly
 * what the views show (the views import these; no React here). Every line is a key of ../strings.ts with
 * typed arguments; numbers are formatted by `say` through the facade's formatters; nothing is computed
 * but which line to print.
 */
import type { AwayCard, BoardRow, IndustryTable, SkipLabel, TableRow, TextKey, Ticket, Txt } from '../../../engine/salvage';
import * as R from '../../../engine/salvage';
import { TEXT } from '../strings';

// ------------------------------------------------------------------------------- the price board

/**
 * A board row's fourth line, one at most: the deal's reservation, else a set-aside lot, else the held
 * row's "Held until a high day, two days at most" (E32, W13b: the rules' `heldLine`).
 */
export function rowExtraLine(r: BoardRow): Txt | null {
  if (r.reserved_g > 0) return { key: 'card.dealReserve', args: { a: { mass_g: r.reserved_g, step: 'lot' }, b: { mass_g: r.bay_g, step: 'lot' } } };
  if (r.aside_g > 0) return { key: 'chip.aside', args: { kg: { mass_g: r.aside_g, step: 'lot' }, x: { price: r.price } } };
  if (r.held && r.heldLine) return r.heldLine;
  return null;
}

/** True when a board row prints a fourth line. */
export const rowExtra = (r: BoardRow): boolean => rowExtraLine(r) !== null;

/** The board's words for a day word (null: a usual day prints nothing). */
export const DAY_WORD: Record<BoardRow['word'], Txt | null> = { low: { key: 'board.lowDay' }, usual: null, high: { key: 'board.highDay' } };

/**
 * The converter's payables line (W15: "Paid on assay: platinum 75 %, palladium 75 %, rhodium 65 %, less
 * fees"), printed under its board row and its ticket lines: rules-book's `converterLine(cfg)` once the
 * facade exports it, else the same line from the content's payables (shares of the content, not computed).
 */
export function converterNote(cfg: R.SalvageConfig): Txt | null {
  const sel = (R as unknown as { converterLine?: (cfg: R.SalvageConfig) => Txt }).converterLine;
  if (sel) return sel(cfg);
  const v = (cfg.salvage as { converter?: { pay_pt?: number; pay_pd?: number; pay_rh?: number } }).converter;
  if (!v || v.pay_pt == null || v.pay_pd == null || v.pay_rh == null) return null;
  return { key: 'card.converterPaid', args: { pt: { pct: v.pay_pt }, pd: { pct: v.pay_pd }, rh: { pct: v.pay_rh } } };
}

// ------------------------------------------------------------------------------- the industry table

/** The rival plate's seed: its register number less one (rival.1 → 0 .. rival.25 → 24), null for the player. */
export function plateSeed(row: Pick<TableRow, 'id'>): number | null {
  const m = /^rival\.(\d+)$/.exec(row.id);
  return m ? Number(m[1]) - 1 : null;
}

/** rules-book's rung selector (R.rungProgress, announced 19:55) as it may come. */
export interface RungProgressLike {
  supplied_g?: number;
  materials?: number;
  own?: Txt | null;
  next?: Txt | null;
}

/** A rung inside this stage: rules-book's `inStage`, else one that has an "opens" line (or the first). */
export const rungInStage = (r: IndustryTable['rungs'][number]): boolean => (r as { inStage?: boolean }).inStage ?? (r.n === 1 || `opens.rung${r.n}` in TEXT);

/**
 * The rung box's two lines (P17, W13a, S10; ONE source for the table and the rung sign): the player's
 * OWN tonnes and materials, then the next rung's condition after "Next:" (past this stage's last rung
 * only its tonnage, beside a bare padlock: it opens nothing yet). rules-book's selector when given,
 * else the table's own rows (the player's row and the counted range chips).
 */
export function rungBox(t: IndustryTable, you: Pick<TableRow, 'tonnes_g'> | null, rp?: RungProgressLike | null): { own: Txt | null; next: Txt | null } {
  const counted = t.range.filter((m) => m.counted).length;
  // The player's own figures, said as theirs ("You: ..."), whatever key the selector used.
  const own: Txt | null = rp?.own ? { key: 'table.mine', args: rp.own.args } : (you || rp ? { key: 'table.mine', args: { t: { tonnes_g: rp?.supplied_g ?? you?.tonnes_g ?? 0 }, r: { n: rp?.materials ?? counted } } } : null);
  const nr = t.rungs.find((r) => !r.open) ?? null;
  let next: Txt | null = null;
  if (rp && rp.next) next = rp.next.key === 'table.locked' ? { key: 'table.nextRung', args: rp.next.args } : rp.next;
  else if (nr) next = rungInStage(nr) && !(rp && rp.next === null) ? { key: 'table.nextRung', args: { t: { tonnes_g: nr.t * 1e6 }, r: { n: nr.range } } } : { key: 'table.lockedBare', args: { t: { tonnes_g: nr.t * 1e6 } } };
  return { own, next };
}

// ------------------------------------------------------------------------------- the away card

/** At most this many grade lines; the rest is "+ n more" (4.4). At large type (P19) three. */
export const AWAY_LINES = 5;
export const AWAY_LINES_LARGE = 3;

/**
 * The away card's data with the fix pass's fields (rules-sim-a 19:46, all optional on types.ts's
 * AwayCard; read through this so the card builds while they land): `absentS` the whole absence,
 * `seconds` what the yard RAN, `spent` / `bought` what was paid while away, `net` what cash moved by,
 * `deliveryList` the deal's deliveries (E34), `runLonger` what makes the yard run longer (E33), and
 * rules-book's `next` (the next step).
 */
export type AwayData = AwayCard & {
  absentS?: number;
  spent?: number;
  bought?: { partner: string; n: number; spent: number }[];
  net?: number;
  deliveryList?: { day: number; g: number; paid: number }[];
  runLonger?: { rung: number; capS: number } | { item: 'night'; capS: number } | null;
  next?: Txt | null;
  /** Grade lines the selector left out (its own cut), counted into "+ n more". */
  moreLines?: number;
};

/** rules-book's away selector (R.awayView, announced 19:55) as it may come: every field optional here. */
export interface AwayViewLike {
  absentS?: number;
  seconds?: number;
  ran_s?: number;
  sales?: number;
  bought?: { partner?: string; n: number; money: number }[] | { partner?: string; n: number; money: number } | null;
  net?: number;
  spent?: number;
  lines?: { grade: string; g: number; money: number }[];
  more?: number;
  deliveries?: number | { day: number; g: number; paid: number }[];
  passed?: string[];
  next?: Txt | null;
  runLonger?: AwayData['runLonger'];
}

/** The state's away card with rules-book's selector laid over it where it gives a field (its numbers win). */
export function withAwayView(a: AwayData, v: AwayViewLike | null | undefined): AwayData {
  if (!v) return a;
  const bought = v.bought == null ? undefined : (Array.isArray(v.bought) ? v.bought : [v.bought]).map((b) => ({ partner: b.partner ?? '', n: b.n, spent: b.money }));
  const spent = v.spent ?? (bought ? bought.reduce((x, b) => x + b.spent, 0) : a.spent);
  return {
    ...a,
    absentS: v.absentS ?? a.absentS ?? v.seconds,
    seconds: v.ran_s ?? a.seconds,
    money: v.sales ?? a.money,
    spent,
    bought: bought ?? a.bought,
    net: v.net ?? a.net,
    lines: (v.lines ?? a.lines) as AwayCard['lines'],
    moreLines: v.lines ? v.more ?? 0 : a.moreLines,
    deliveryList: Array.isArray(v.deliveries) ? v.deliveries : a.deliveryList,
    deliveries: typeof v.deliveries === 'number' ? v.deliveries : Array.isArray(v.deliveries) ? v.deliveries.length : a.deliveries,
    passed: (v.passed ?? a.passed) as AwayCard['passed'],
    next: v.next !== undefined ? v.next : a.next,
    runLonger: v.runLonger !== undefined ? v.runLonger : a.runLonger,
  };
}

/**
 * Every line the away card prints, in the ruled order (P3, P19, R6, R10): the head ("Away {t} · the
 * yard ran {c}") and what makes it run longer; the money (Sales, loads bought per partner, then Net,
 * which is what the cash moved by); each deal delivery; the rivals passed; the next step; then the
 * grade lines (five at most, three at large type) and "+ n more". At large type the loads bought are
 * one line (their total), so the rivals passed stay above the fold at 667 x 375 (P19).
 */
export function awayLines(a: AwayData, large = false): { head: Txt; longer: Txt | null; money: Txt[]; net: Txt | null; unsold: Txt | null; news: Txt[]; next: Txt | null; lines: Txt[] } {
  const head: Txt = { key: 'away.head', args: { t: { secs: a.absentS ?? a.seconds }, c: { secs: a.seconds } } };
  const rl = a.runLonger ?? null;
  const longer: Txt | null = !rl ? null : 'item' in rl ? { key: 'away.longerNight', args: { c: { secs: rl.capS } } } : { key: 'away.longerRung', args: { c: { secs: rl.capS } } };
  const money: Txt[] = [];
  let net: Txt | null = null;
  const spent = a.spent ?? 0;
  if (a.money > 0 || spent > 0) {
    money.push({ key: 'away.sales', args: { x: { money: a.money } } });
    const bought = (a.bought ?? []).filter((b) => b.n > 0 || b.spent > 0);
    if (bought.length > 1 && bought.every((b) => b.partner) && !large) for (const b of bought) money.push({ key: 'away.boughtFrom', args: { partner: { name: b.partner }, n: { n: b.n }, x: { money: b.spent } } });
    else if (bought.length || spent > 0) money.push({ key: 'away.bought', args: { n: { n: bought.length ? bought.reduce((x, b) => x + b.n, 0) : a.loads }, x: { money: bought.length ? bought.reduce((x, b) => x + b.spent, 0) : spent } } });
    const v = a.net ?? a.money - spent;
    // The sign picks the line; the amount is the rules' own (printed positive, as the key asks).
    net = v >= 0 ? { key: 'away.net', args: { x: { money: v } } } : { key: 'away.netLoss', args: { x: { money: -v } } };
  }
  // join3: right under Net, what the time away left in the bays not yet sold (the rules' own figure).
  const unsold: Txt | null = net && (a.unsold ?? 0) > 0 ? { key: 'away.unsold', args: { x: { money: a.unsold! } } } : null;
  const news: Txt[] = [];
  if (a.deliveryList?.length) for (const d of a.deliveryList) news.push({ key: 'ticket.dealDelivery', args: { kg: { mass_g: d.g, step: 'lot' }, x: { money: d.paid } } });
  else if (a.deliveries > 0) news.push({ key: 'away.deliveries', args: { n: { n: a.deliveries } } });
  for (const r of a.passed) news.push({ key: 'away.passed', args: { rival: { name: `${r}.chip` } } });
  if (!net && !news.length) news.unshift({ key: 'away.nothing' });
  // The next step: rules-book's, else the rules' hint (printed once: it can be the "nothing" line itself).
  let next: Txt | null = a.next ?? a.hint ?? null;
  if (next && news.some((t) => t.key === next!.key && JSON.stringify(t.args ?? {}) === JSON.stringify(next!.args ?? {}))) next = null;
  // A goal's own line is said as the next step ("Next: Strip the car for the shredder").
  if (next && next.key.startsWith('goal.')) next = { key: 'away.next', args: { ...(next.args ?? {}), goal: { text: next.key } } };
  const max = large ? AWAY_LINES_LARGE : AWAY_LINES;
  const lines = a.lines.slice(0, max).map((l): Txt => ({ key: 'away.line', args: { grade: { grade: l.grade }, kg: { mass_g: l.g, step: 'lot' }, x: { money: l.money } } }));
  const rest = Math.max(0, a.lines.length - max) + (a.moreLines ?? 0);
  if (rest > 0) lines.push({ key: 'ticket.more', args: { n: { n: rest } } });
  return { head, longer, money, net, unsold, news, next, lines };
}

// ------------------------------------------------------------------------------- the clipboard's tickets

/** A ticket's head and total and its lines, as the history prints them. */
export function ticketSummary(t: Ticket, conv: Txt | null = null): { head: Txt; total: Txt | null; lines: Txt[] } {
  // W15: under a converter's line, how it was paid (on assay, the payables, less fees).
  const withConv = (grade: string, l: Txt): Txt[] => (grade === 'conv' && conv ? [l, conv] : [l]);
  const date: Txt = { key: 'ticket.date', args: { date: { day: t.day } } };
  switch (t.kind) {
    case 'weighIn':
      return {
        head: { key: 'ticket.weighInHead', args: { n: { n: t.no } } },
        total: { key: 'ticket.todaysValue', args: { x: { money: t.todaysValue } } },
        lines: [...t.lines.flatMap((l): Txt[] => withConv(l.grade, { key: 'ticket.gradeAmount', args: { grade: { grade: l.grade }, kg: { mass_g: l.g, step: 'platform' }, x: { price: l.price } } })), { key: 'ticket.weighInLegal' }, date],
      };
    case 'collection':
      return {
        head: { key: 'ticket.collectionHead', args: { n: { n: t.no } } },
        total: { key: 'ticket.paid', args: { x: { money: t.paid } } },
        lines: [...t.lines.flatMap((l): Txt[] => withConv(l.grade, { key: 'ticket.gradeAmount', args: { grade: { grade: l.grade }, kg: { mass_g: l.g, step: 'lot' }, x: { money: l.amount } } })), { key: 'ticket.lotSoldTo' }, { key: 'ticket.weighedOut' }, date],
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

// ------------------------------------------------------------------------------- Settings

/** The policy page when it is a real one: none, or the reserved example domains (validate's own test), give null. */
export function realPolicyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\/([^/]*\.)?example\.(com|org|net)(\/|$)/i.test(url) ? null : url;
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
