/**
 * The platform scale's weigh-in (yard-stage1.md 2.2, E17's one rounding rule; 4.4 item 5's lesson
 * pacing). Owner: rules-sim. The weighbridge's skip weigh-in is truck.ts's.
 */
import { priceOf } from './board';
import { bayOf, reserveOnWeighIn } from './bays';
import { count, printTicket, ticketBase, dayAt, priceAt, type Ctx, numberBays } from './clock';
import { crucibleFromBays } from './crucible';
import { resolveGrams, roundMoney } from './money';
import type { Piece, TicketLine, Txt, TxtArgs } from './types';

/** The converter's treatment record ref (S7): its source object's `source.ref`. */
export function convRef(x: Ctx): string | null {
  const o = x.c.objects[x.c.converter.source];
  return o?.source?.ref ?? null;
}

/** Ticket lines of a set of pieces at day D: grouped by grade in first-seen order, each rounded half up to the platform step. */
export function linesOf(x: Ctx, pieces: readonly Piece[], day: number): { lines: TicketLine[]; trueByGrade: Record<string, number> } {
  const order: string[] = [];
  const g: Record<string, number> = {};
  const n: Record<string, number> = {};
  const empty: Record<string, boolean> = {};
  for (const p of pieces) {
    if (!(p.grade in g)) {
      order.push(p.grade);
      g[p.grade] = 0;
      n[p.grade] = 0;
    }
    g[p.grade] += p.g;
    n[p.grade] += 1;
    if (p.whole && x.c.objects[p.whole]?.certifiedEmpty) empty[p.grade] = true;
  }
  const lines: TicketLine[] = order.map((grade) => {
    const r = resolveGrams(g[grade], 'platform');
    const price = priceAt(x, grade, day);
    const line: TicketLine = { grade, g: r, price, amount: roundMoney((r / 1000) * price) };
    if (x.c.wholeUnits_kg[grade] !== undefined) line.n = n[grade];
    if (x.c.grades[grade]?.family === 'pm') {
      const ref = convRef(x);
      if (ref) line.note = { kind: 'fromCar', ref };
    } else if (empty[grade]) line.note = { kind: 'certifiedEmpty' };
    return line;
  });
  return { lines, trueByGrade: g };
}

/**
 * The lesson on a weigh-in (4.4 item 5; src/ui/salvage/hints/lessons.ts `lessonPaced` is the same rule):
 * a VALUE grade's lesson (content `valueLessons`: copper, brass, the converter) always shows on the
 * boss's first weigh-in of it, whatever was weighed before and however early (finding P2: one early
 * brass line silenced the copper lesson); the others in the quiet minutes only on a value jump.
 */
function lessonFor(x: Ctx, lines: readonly TicketLine[], t: number): { grade: string; text: Txt } | null {
  const teach = x.c.teach ?? {};
  const quiet = teach.lessonQuietS ?? 300;
  const jump = teach.jumpRatio ?? 5;
  let top = 0;
  for (const tk of x.s.tickets) if (tk.kind === 'weighIn') for (const l of tk.lines) top = Math.max(top, x.c.grades[l.grade]?.pbar ?? 0);
  const grades = [...new Set(lines.map((l) => l.grade))].sort((a, b) => (x.c.grades[b]?.pbar ?? 0) - (x.c.grades[a]?.pbar ?? 0));
  for (const grade of grades) {
    const key = x.c.lessons[grade];
    if (!key || x.s.lessonsSeen.includes(grade)) continue;
    const isValue = (x.c.valueLessons ?? []).includes(grade);
    const isJump = isValue || (top > 0 && (x.c.grades[grade]?.pbar ?? 0) >= jump * top);
    if (t < quiet && !isJump) continue;
    const args: TxtArgs = {};
    if (grade === 'bb') {
      const day = dayAt(x, t);
      const li = priceOf(x.c, 'li', day);
      if (li > 0) args.n = { n: Math.round(priceOf(x.c, 'bb', day) / li) };
    }
    if (x.c.grades[grade]?.family === 'pm') {
      const ref = convRef(x);
      if (ref) args.ref = { ref };
    }
    return { grade, text: { key: key as Txt['key'], args } };
  }
  return null;
}

/**
 * Weigh pieces in on the platform (2.2): every piece into its grade's bay, each grade line rounded half
 * up to the platform step (the bay gets exactly the rounded grams; the difference kept in scaleRound_g),
 * a weigh-in ticket with no payment, at most one paced lesson. `by` 'boss' or a crew id.
 */
export function weighIn(x: Ctx, pieces: readonly Piece[], by: string, t: number): void {
  if (!pieces.length) return;
  const day = dayAt(x, t);
  const { lines, trueByGrade } = linesOf(x, pieces, day);
  for (const l of lines) {
    const b = bayOf(x, l.grade);
    b.g += l.g;
    if (l.n !== undefined) b.n += l.n;
    x.s.scaleRound_g += l.g - trueByGrade[l.grade];
    count(x, `weighed:${l.grade}`);
    reserveOnWeighIn(x, l.grade);
  }
  numberBays(x);
  const lesson = by === 'boss' ? lessonFor(x, lines, t) : null;
  if (lesson) x.s.lessonsSeen.push(lesson.grade);
  const ticket = printTicket(x, { ...ticketBase(x, t), kind: 'weighIn' as const, by, lines, todaysValue: roundMoney(lines.reduce((a, l) => a + l.amount, 0)), lessonText: lesson?.text ?? null, lesson: lesson?.text.key ?? null });
  x.ev.push({ type: 'weighIn', ticket, pieces: pieces.map((p) => p.uid), by });
  if (lesson) x.ev.push({ type: 'lesson', grade: lesson.grade, text: lesson.text });
  if (by === 'boss') {
    count(x, 'weighIns');
    x.s.counts!.bossWeighedSinceCollect = 1;
  }
  else {
    const m = x.s.crew.find((c) => c.id === by);
    if (m) count(x, `crewWeighIns:${m.role}`);
  }
  crucibleFromBays(x, t);
}
