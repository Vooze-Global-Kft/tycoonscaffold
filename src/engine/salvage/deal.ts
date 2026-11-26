/**
 * The supply deal (yard-stage1.md 2.9, S21): offered on the office's partner wall at `deal.gate`; "{q} kg
 * of cast iron a day for {d} days at §{p} a kilo, locked at signing", p = round(A_ci(D) × (1 + premium)),
 * A_ci the mean of the last seven days' prices. After signing, cast iron weighed in first fills a reserve
 * of q in its bay; at each 00:00 UTC, before anything else, delivered = min(q, reserve), paid and
 * supplied on a delivery ticket; trust rises for a full day and falls for a short one; nothing is ever
 * charged for a miss. After d deliveries the series offers the next deal. Owner: rules-sim.
 */
import { priceOf } from './board';
import { bayOf } from './bays';
import { payLot } from './bank';
import { bankPart, count, dayAt, earn, printTicket, ticketBase, type Ctx } from './clock';
import { roundMoney } from './money';
import { supply } from './round';
import type { DealTerms } from './types';

/** The terms of series step `step` on market day D (what the card shows and signDeal checks). */
export function dealTerms(x: Pick<Ctx, 'c'>, step: number, day: number): DealTerms | null {
  const d = x.c.deal;
  const st = d.series[step];
  if (!st) return null;
  let sum = 0;
  for (let k = 1; k <= 7; k++) sum += priceOf(x.c, d.grade, day - k);
  const A = sum / 7;
  return { step, q_g: st.q_kg * 1000, days: st.days, price: roundMoney(A * (1 + st.premium)) };
}

/** Is the deal's gate reached (a rung id `rungN`, or a shop key owned)? */
export function gateReached(x: Ctx, gate: string | null): boolean {
  if (!gate) return true;
  const m = /^rung(\d+)$/.exec(gate);
  if (m) return x.s.ladder.rung >= Number(m[1]);
  return x.s.owned.includes(gate);
}

/** Checks (2.14 step 6): offer the next step when the gate is reached and nothing runs. */
export function dealOffer(x: Ctx, t: number): void {
  const d = x.s.deal;
  if (d.step !== null || !gateReached(x, x.c.deal.gate) || !x.c.deal.series.length) return;
  const terms = dealTerms(x, 0, dayAt(x, t));
  if (!terms) return;
  d.step = 0;
  d.phase = 'offered';
  d.q_g = terms.q_g;
  d.days = terms.days;
  d.price = terms.price;
  d.delivered = 0;
  x.ev.push({ type: 'dealOffered', step: 0 });
}

/** Sign (the terms checked by the action): the reserve starts filling from the bay's free cast iron. */
export function dealSign(x: Ctx, terms: DealTerms): void {
  const d = x.s.deal;
  d.phase = 'running';
  d.q_g = terms.q_g;
  d.days = terms.days;
  d.price = terms.price;
  d.delivered = 0;
  const b = bayOf(x, x.c.deal.grade);
  const free = Math.max(0, b.g - b.aside.reduce((a, q) => a + q.g, 0) - b.forCrucible_g - b.forDeal_g);
  b.forDeal_g += Math.min(free, Math.max(0, d.q_g - b.forDeal_g));
  count(x, 'dealSigned');
  x.ev.push({ type: 'dealSigned', step: d.step ?? 0 });
}

/** The day boundary's delivery (before anything else at 00:00 UTC). */
export function dealDeliver(x: Ctx, t: number): void {
  const d = x.s.deal;
  if (d.phase !== 'running') return;
  const grade = x.c.deal.grade;
  const b = bayOf(x, grade);
  const g = Math.min(d.q_g, b.forDeal_g, b.g);
  const tr = x.c.deal.trust;
  d.trust = Math.max(0, Math.min(100, d.trust + (g >= d.q_g ? tr.up : -tr.down)));
  d.last = { day: dayAt(x, t), g };
  d.delivered += 1;
  if (g > 0) {
    b.g -= g;
    b.forDeal_g -= g;
    const paid = roundMoney((g / 1000) * d.price);
    supply(x, grade, g);
    // 2.14.4 (stage 2): a lot payment goes through bank.ts payLot BEFORE its ticket prints, then the player's part is earned.
    const { y, z } = payLot(x, paid, t);
    const ticket = printTicket(x, { ...ticketBase(x, t), kind: 'dealDelivery' as const, buyer: x.c.deal.partner, grade, g, paid, ...(y > 0 ? { bank: { y } } : {}) });
    bankPart(x, y);
    earn(x, z, t);
    x.ev.push({ type: 'dealDelivered', ticket });
    if (x.away) {
      x.away.deliveries += 1;
      x.away.deliveryList.push({ day: d.last.day, g, paid });
    }
  }
  // Refill the reserve from the bay's free grams for the next day.
  const free = Math.max(0, b.g - b.aside.reduce((a, q) => a + q.g, 0) - b.forCrucible_g - b.forDeal_g);
  b.forDeal_g += Math.min(free, Math.max(0, d.q_g - b.forDeal_g));
  if (d.delivered >= d.days) {
    b.forDeal_g = 0;
    count(x, 'dealDone');
    const next = (d.step ?? 0) + 1;
    const terms = dealTerms(x, next, dayAt(x, t));
    if (terms) {
      d.step = next;
      d.phase = 'offered';
      d.q_g = terms.q_g;
      d.days = terms.days;
      d.price = terms.price;
      d.delivered = 0;
      x.ev.push({ type: 'dealOffered', step: next });
    } else d.phase = 'done';
  }
}

/** On a new day an offered deal's price follows the board (shown equals applied: signDeal checks today's terms). */
export function dealReprice(x: Ctx, t: number): void {
  const d = x.s.deal;
  // A declined offer comes back the next market day (2.9, v3).
  if (d.phase === 'declined' && d.step !== null) {
    d.phase = 'offered';
    x.ev.push({ type: 'dealOffered', step: d.step });
  }
  if (d.phase !== 'offered' || d.step === null) return;
  const terms = dealTerms(x, d.step, dayAt(x, t));
  if (terms) d.price = terms.price;
}
