/**
 * Tickets (yard-stage1.md 2.2, D8, S1 to S3; 4.4; 5.5). READS state only (owner: rules-book).
 * - BUILDERS the rules-sim calls when a ticket prints (weighInTicket, collectionTicket, skipTicket,
 *   dealTicket, dropOffSlip): the lines with the ONE rounding rule (a weigh-in line rounded half up to
 *   the platform's 0.1 kg; a lot's line resolved down to 0.1 kg; the weighbridge's gross and tare each
 *   rounded to its step, net their difference), each line's amount = roundMoney(kg × price), a total
 *   the sum of its lines; the lesson a first grade carries, paced (4.4 item 5).
 * - The VIEW the screens print (`ticketView`): the head, at most three grade lines and "+ n more", the
 *   value or "Paid", the legal lines, the lesson: every number a typed argument.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { priceOf } from './board';
import { convPaid } from './content';
import { floorGrams, lineAmount, resolveGrams, roundMoney, sumAmounts } from './money';
import type { GradeId, ObjectId, Piece, SalvageConfig, SalvageGame, Ticket, TicketLine, Txt } from './types';

type WeighIn = Extract<Ticket, { kind: 'weighIn' }>;

/** The tickets of the history, newest last (at most 50). */
export function tickets(g: SalvageGame): readonly Ticket[] {
  return g.salvage.tickets;
}

/** The teaching numbers (content `teach`, the hints' goals.json): the quiet seconds and the value jump's ratio. */
function teach(c: SalvageContent): { lessonQuietS: number; jumpRatio: number } {
  const t = (c as unknown as { teach?: { lessonQuietS?: number; jumpRatio?: number } }).teach;
  return { lessonQuietS: t?.lessonQuietS ?? 300, jumpRatio: t?.jumpRatio ?? 5 };
}

const objOf = (c: SalvageContent, from: string | null, whole?: ObjectId): ObjectId | null => {
  if (whole) return whole;
  if (!from) return null;
  const m = /(?:^|\.)([a-z]+)\.\d+$/.exec(from);
  return m && c.objects[m[1]] ? m[1] : null;
};

/**
 * Weigh-in lines (2.2): pieces grouped by grade (a whole thing at its whole grade), each line's grams
 * rounded half up to the platform step, today's price, its amount; whole units counted for
 * `wholeUnits_kg` grades; a converter's line "from car ref.", a closed vessel's "certified empty".
 * `round_g` is the rounding kept (rounded − true grams), for `scaleRound_g`.
 */
export function weighInLines(c: SalvageContent, pieces: readonly Piece[], day: number): { lines: TicketLine[]; round_g: number } {
  const by = new Map<GradeId, { g: number; n: number; note?: TicketLine['note'] }>();
  for (const p of pieces) {
    const e = by.get(p.grade) ?? { g: 0, n: 0 };
    e.g += p.g;
    e.n += 1;
    const obj = objOf(c, p.from, p.whole);
    const o = obj ? c.objects[obj] : undefined;
    if (o?.source && c.grades[p.grade]?.family === 'pm') e.note = { kind: 'fromCar', ref: o.source.ref };
    else if (o?.certifiedEmpty && !e.note) e.note = { kind: 'certifiedEmpty' };
    by.set(p.grade, e);
  }
  let round_g = 0;
  const lines: TicketLine[] = [];
  for (const [grade, e] of by) {
    const g = resolveGrams(e.g, 'platform');
    round_g += g - e.g;
    const price = priceOf(c, grade, day);
    const line: TicketLine = { grade, g, price, amount: lineAmount(g, price) };
    if (c.wholeUnits_kg[grade] !== undefined) line.n = e.n;
    if (e.note) line.note = e.note;
    lines.push(line);
  }
  lines.sort((a, b) => b.amount - a.amount || a.grade.localeCompare(b.grade));
  return { lines, round_g };
}

/**
 * The lesson a weigh-in carries (4.4 item 5, 5.5; the same rule as src/ui/salvage/hints/lessons.ts
 * lessonPaced): the dearest grade on it with a lesson in content not yet shown (`lessonsSeen`); inside
 * the first teach.lessonQuietS yard seconds only when it is a value jump (its usual price at least
 * jumpRatio times every usual price weighed in before); later on its next weigh-in. Arguments filled:
 * lesson.bb's {n} = round(p_bb(D) / p_li(D)); lesson.conv's {ref}.
 */
export function lessonFor(cfg: SalvageConfig, g: SalvageGame, lines: readonly TicketLine[], at: number, day: number): { grade: GradeId; text: Txt } | null {
  const c = cfg.salvage;
  const s = g.salvage;
  const t = teach(c);
  let top = 0;
  for (const tk of s.tickets) if (tk.kind === 'weighIn') for (const l of tk.lines) top = Math.max(top, c.grades[l.grade]?.pbar ?? 0);
  const grades = [...new Set(lines.map((l) => l.grade))].sort((a, b) => (c.grades[b]?.pbar ?? 0) - (c.grades[a]?.pbar ?? 0));
  for (const grade of grades) {
    const key = c.lessons[grade];
    if (!key || s.lessonsSeen.includes(grade)) continue;
    const jump = top > 0 && (c.grades[grade]?.pbar ?? 0) >= t.jumpRatio * top;
    if (at < t.lessonQuietS && !jump) continue;
    const args: Txt['args'] = {};
    if (grade === 'bb') {
      const li = priceOf(c, 'li', day);
      args.n = { n: li > 0 ? Math.round(priceOf(c, 'bb', day) / li) : 0 };
    }
    const ref = lines.find((l) => l.grade === grade && l.note?.kind === 'fromCar')?.note;
    if (ref && ref.kind === 'fromCar') args.ref = refArg(ref.ref);
    return { grade, text: { key: key as Txt['key'], args } };
  }
  return null;
}

/** A record reference ("0012") as an argument, printed exactly as written (W3, S7: it must match the car's record). */
export function refArg(ref: string): NonNullable<Txt['args']>[string] {
  return { ref };
}

const base = (no: number, at: number, day: number) => ({ no, at, day });

/** A weigh-in ticket (2.2): lines, the muted "today's value" (the sum of its lines), the paced lesson. */
export function weighInTicket(cfg: SalvageConfig, g: SalvageGame, by: string, pieces: readonly Piece[], at: number, day: number): { ticket: WeighIn; round_g: number; lessonGrade: GradeId | null } {
  const { lines, round_g } = weighInLines(cfg.salvage, pieces, day);
  const lesson = lessonFor(cfg, g, lines, at, day);
  const ticket: WeighIn = { ...base(g.salvage.ticketNo, at, day), kind: 'weighIn', by, lines, todaysValue: sumAmounts(lines), lessonText: lesson?.text ?? null, lesson: lesson?.text.key ?? null };
  return { ticket, round_g, lessonGrade: lesson?.grade ?? null };
}

/**
 * A lot's lines (2.12, the merchant's round): each grade's collectable grams resolved DOWN to 0.1 kg
 * (whole units only for wholeUnits_kg grades: `n` given by the caller), at the day's price, its
 * set-aside parts at their own prices, the converter at its assay.
 */
export function lotLine(c: SalvageContent, grade: GradeId, g: number, day: number, opts: { n?: number; price?: number } = {}): TicketLine {
  const grams = floorGrams(g);
  const price = opts.price ?? priceOf(c, grade, day);
  const line: TicketLine = { grade, g: grams, price, amount: lineAmount(grams, price) };
  if (opts.n !== undefined) line.n = opts.n;
  return line;
}

/**
 * The converter's assay (whole-game 4.3, 2.4): ONE source, content.ts convPaid (Σ metal grams × § a gram ×
 * payable, each metal stepping by the day's pm move, less the ceramic and assay fees). § for ONE converter.
 */
export function converterPaid(c: SalvageContent, day: number): number {
  return convPaid(c, day);
}

/** W15: the converter's payables line, "Paid on assay: platinum 75 %, palladium …, less fees" (its bay card and the history). */
export function converterLine(c: SalvageContent): Txt {
  const v = c.converter;
  return { key: 'card.converterPaid', args: { pt: { pct: v.pay_pt }, pd: { pct: v.pay_pd }, rh: { pct: v.pay_rh }, fee: { money: v.assay_fee }, ceramic: { money: roundMoney(v.ceramic_kg * v.ceramic_fee) } } };
}

/** Facade `converterLine(cfg)`. */
export function converterLineCfg(cfg: SalvageConfig): Txt {
  return converterLine(cfg.salvage);
}

/** The merchant's collection ticket (2.2): lines with amounts, "Paid §x" = their sum, the buyer named. */
export function collectionTicket(g: SalvageGame, lines: TicketLine[], at: number, day: number, withBoss: boolean, firstGrades: GradeId[], buyer = 'merchant'): Extract<Ticket, { kind: 'collection' }> {
  return { ...base(g.salvage.ticketNo, at, day), kind: 'collection', buyer, lines, paid: sumAmounts(lines), withBoss, firstGrades };
}

/** A partner's skip over the weighbridge (2.2, S2): gross and tare each rounded to the bridge step, net = gross − tare; the price paid. */
export function skipTicket(c: SalvageContent, g: SalvageGame, s: { partner: string; trial: boolean; load_g: number; tare_g: number; paid: number; contents: Record<ObjectId, number> }, at: number, day: number): Extract<Ticket, { kind: 'skipWeighIn' }> {
  const step = c.scale.bridgeStepKg * 1000;
  const round = (x: number) => Math.floor(Math.max(0, x) / step + 0.5 + 1e-9) * step;
  const gross_g = round(s.tare_g + s.load_g);
  const tare_g = round(s.tare_g);
  return { ...base(g.salvage.ticketNo, at, day), kind: 'skipWeighIn', partner: s.partner, trial: s.trial, gross_g, tare_g, net_g: gross_g - tare_g, paid: roundMoney(s.paid), things: Object.entries(s.contents).map(([obj, n]) => ({ obj, n })) };
}

/** A supply-deal delivery (2.9): grams resolved down to 0.1 kg at the locked price. */
export function dealTicket(c: SalvageContent, g: SalvageGame, grams: number, price: number, at: number, day: number): Extract<Ticket, { kind: 'dealDelivery' }> {
  const gr = floorGrams(grams);
  return { ...base(g.salvage.ticketNo, at, day), kind: 'dealDelivery', buyer: c.deal.partner, grade: c.deal.grade, g: gr, paid: lineAmount(gr, price) };
}

/** A household drop-off's slip: "{thing} · signed in · gate drop-off". */
export function dropOffSlip(g: SalvageGame, thing: ObjectId, at: number, day: number): Extract<Ticket, { kind: 'dropOffSlip' }> {
  return { ...base(g.salvage.ticketNo, at, day), kind: 'dropOffSlip', thing };
}

// ============================================================================ the view

/** What a ticket prints, as typed lines (4.4): the screen formats the numbers and nothing else. */
export interface TicketView {
  head: Txt;
  date: Txt;
  /** At most three grade lines (or the skip's things). */
  lines: Txt[];
  /** "+ n more", or null. */
  more: Txt | null;
  /** The muted "today's value §x", "Paid §x", gross/tare/net, or null. */
  value: Txt | null;
  /** One or two legal lines (11 pt). */
  legal: Txt[];
  lesson: Txt | null;
}

const MAX_LINES = 3;

function noteTxt(l: TicketLine): Txt | null {
  if (l.note?.kind === 'fromCar') return { key: 'ticket.fromCar', args: { ref: refArg(l.note.ref) } };
  if (l.note?.kind === 'certifiedEmpty') return { key: 'ticket.certifiedEmpty' };
  return null;
}

/** The view of a ticket (2.2's table). */
export function ticketView(t: Ticket): TicketView {
  const date: Txt = { key: 'ticket.date', args: { date: { day: t.day } } };
  const cut = <T>(xs: T[]) => ({ shown: xs.slice(0, MAX_LINES), more: xs.length > MAX_LINES ? ({ key: 'ticket.more', args: { n: { n: xs.length - MAX_LINES } } } as Txt) : null });
  switch (t.kind) {
    case 'weighIn': {
      const { shown, more } = cut(t.lines);
      return {
        head: { key: 'ticket.weighInHead', args: { homeYard: { name: 'homeYard' }, n: { n: t.no } } },
        date,
        lines: shown.map((l) => ({ key: 'ticket.gradeAmount', args: { grade: { grade: l.grade }, kg: { mass_g: l.g, step: 'platform' }, x: { price: l.price } } })),
        more,
        value: { key: 'ticket.todaysValue', args: { x: { money: t.todaysValue } } },
        legal: [{ key: 'ticket.weighInLegal' }],
        lesson: t.lessonText,
      };
    }
    case 'collection': {
      const { shown, more } = cut(t.lines);
      return {
        head: { key: 'ticket.collectionHead', args: { homeYard: { name: 'homeYard' }, n: { n: t.no } } },
        date,
        lines: shown.map((l) => ({ key: 'ticket.gradeAmount', args: { grade: { grade: l.grade }, kg: { mass_g: l.g, step: 'lot' }, x: { money: l.amount } } })),
        more,
        value: { key: 'ticket.paid', args: { x: { money: t.paid } } },
        legal: [{ key: 'ticket.lotSoldTo', args: { merchant: { name: t.buyer } } }, { key: 'ticket.weighedOut' }],
        lesson: null,
      };
    }
    case 'skipWeighIn': {
      const { shown, more } = cut(t.things);
      return {
        head: { key: 'ticket.skipHead', args: { partner: { name: t.partner }, load: { text: t.trial ? 'ticket.trial' : 'card.empty' } } },
        date,
        lines: shown.map((th) => ({ key: 'card.skipLine', args: { thing: { thing: th.obj }, n: { n: th.n }, kg: { mass_g: 0, step: 'lot' } } })),
        more,
        value: { key: 'ticket.grossTareNet', args: { a: { mass_g: t.gross_g, step: 'bridge' }, b: { mass_g: t.tare_g, step: 'bridge' }, c: { mass_g: t.net_g, step: 'bridge' } } },
        legal: [{ key: 'ticket.partnerLegal' }],
        lesson: null,
      };
    }
    case 'dealDelivery':
      return {
        head: { key: 'ticket.dealDelivery', args: { foundry: { name: t.buyer }, kg: { mass_g: t.g, step: 'lot' }, x: { money: t.paid } } },
        date,
        lines: [],
        more: null,
        value: { key: 'ticket.paid', args: { x: { money: t.paid } } },
        legal: [{ key: 'ticket.weighedOut' }],
        lesson: null,
      };
    case 'dropOffSlip':
      return { head: { key: 'ticket.dropOffSlip', args: { thing: { thing: t.thing } } }, date, lines: [], more: null, value: null, legal: [], lesson: null };
  }
}

/** A line's note as text (from car ref., certified empty), for the history's full view. */
export { noteTxt };
