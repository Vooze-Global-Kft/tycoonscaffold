/**
 * THE RULE AS BUILT (wave 2; notes/s2b-rules-works.md):
 * - tipDivert, once the works are open: a thing of a battery or an undrained car (content `arrives` not 'tip') is
 *   never diverted (it never reaches a tip: 2.9); a partner's reusable batch (`reuseBatch`, the first n things of its
 *   object beyond the partner's own skip, on a skip that is not the trial) goes to the Yard sale's trade corner
 *   (reuse.ts toCorner); a thing the Yard sale tags stays for the floor (it is racked from there); else it goes to the
 *   picking table when hash01(worldSeed, 'crate', uid) < crate.share and the table holds fewer than crate.max.
 * - The boss sorts (act `crate`): standing still within reach.place of the table, the oldest thing (since, uid) every
 *   crate.sort_s. Each thing sorted is paid at once: per grade of its prepared pieces roundMoney(crate.u × lineAmount
 *   at that day's posted price), a LOT PAYMENT (payLot, the ticket's line, bankPart, earn), and its mass supplied at
 *   its prepared grades, once. One ticket `crateLot` gathers the things of one sitting at the table: it stays `open`
 *   while each sort follows the last at the same instant, and closes when he walks off or the table is empty.
 * - Nothing on it expires, nothing on it is anyone's but the boss's (crews never take from it).
 *
 * THE CRATE ("the picking table", stage 2, docs/design/yard-stage2.md 2.10.2): from rung 3 a share of a
 * tipped load's things goes to the crate at the oversize pad instead of the floor (by hash, while it holds
 * fewer than `crate.max`); the boss sorts it one thing every `crate.sort_s`, each a LOT PAYMENT (2.14.4,
 * `bank.ts payLot` before the ticket prints, then `earn`). Nothing in it expires. Owner: rules-works
 * (Phase B fills the bodies).
 *
 * PHASE A STUB (engine2-hooks, 26 November): nothing is diverted, so the first yard advances exactly as
 * before. Where the loop calls it:
 * - `tipDivert(x, thing, partner, t)` in truck.ts tipNow, once for each thing of a tipped load, in the
 *   load's order, after its uid (`f<n>`) is drawn and BEFORE it takes a floor slot: return where it stands
 *   instead (`{at: 'crate', k, since: t}`), or null for the floor (the first yard's slot, as before). A car
 *   and a battery never reach a tip (2.9): they arrive by their own bodies.
 * Sorting is the boss's act (`crate`, 2.18), not a dated event of the queue.
 *
 * EVERY DATE a body writes for the queue is at least the yard second t it is written at (s2a-fix): the loop never
 * applies a date before s.t (tick.ts drops it), so a date in the past stops the feature for ever; a saved one is
 * clamped to the save's clock (state2.ts repairStage2).
 */
import type { Ctx } from './clock';
import { bankPart, count, dayAt, earn, heard, printTicket, priceAt, ticketBase } from './clock';
import { payLot } from './bank';
import { hash01 } from './board';
import { specsOf } from './content';
import { lineAmount, roundMoney } from './money';
import { nearPlace } from './positions';
import { tagUid, toCorner } from './reuse';
import { supply } from './round';
import { hashString } from '../rng';
import type { ObjectId, PartnerId, ThingAt, ThingState, Ticket, TicketLine } from './types';
import { pushThing, spliceThing } from './lookup';

const H_CRATE = hashString('crate');

/** Things on the picking table. */
export function crateCount(x: Pick<Ctx, 's'>): number {
  let n = 0;
  for (const th of x.s.things) if (th.at.at === 'crate') n++;
  return n;
}

/** Where a tipped thing stands instead of the floor, or null (the floor). */
export function tipDivert(x: Ctx, thing: { uid: string; obj: ObjectId }, partner: PartnerId, t: number): ThingAt | null {
  if (x.s.counts?.bathSet === undefined) return null;
  const c = x.c;
  const o = c.objects[thing.obj];
  if (!o || (o.arrives ?? 'tip') !== 'tip') return null;
  // A partner's reusable batch (2.12): the first n things of its object beyond the partner's own skip go to the trade corner.
  const rb = c.partners[partner]?.reuseBatch;
  const sk = x.s.truck.skip;
  if (rb && rb.obj === thing.obj && c.reuse && sk && !sk.trial) {
    const extra = (sk.contents[rb.obj] ?? 0) - (c.partners[partner].skip[rb.obj] ?? 0);
    let done = 0;
    for (const th of x.s.things) if (th.at.at === 'corner' && th.at.since === t && th.obj === rb.obj) done++;
    if (done < Math.min(extra, rb.n)) return toCorner(x, t);
  }
  // A thing the Yard sale tags is racked from the floor; it does not go to the picking table.
  if (c.reuse && tagUid(c, thing.uid, thing.obj)) return null;
  const C = c.crate;
  if (!C || crateCount(x) >= C.max || hash01(c.worldSeed, H_CRATE, hashString(thing.uid)) >= C.share) return null;
  const used = new Set<number>();
  for (const th of x.s.things) if (th.at.at === 'crate') used.add(th.at.k);
  let k = 0;
  while (used.has(k)) k++;
  if (heard(x)) x.ev.push({ type: 'crateIn', thing: thing.uid });
  return { at: 'crate', k, since: t };
}

/** The oldest thing on the picking table (since, then uid), or null. */
function oldest(x: Ctx): ThingState | null {
  let best: ThingState | null = null;
  for (const th of x.s.things) {
    if (th.at.at !== 'crate' || th.by) continue;
    const b = best?.at as { since: number } | undefined;
    if (!best || th.at.since < b!.since || (th.at.since === b!.since && th.uid < best.uid)) best = th;
  }
  return best;
}

const atTable = (x: Ctx): boolean => {
  const p = x.s.presence;
  return !p.moving && nearPlace(x.c, 'crate', p.x, p.y, x.c.reach.place);
};

/** The open crateLot ticket of this sitting, or null. */
function openTicket(x: Ctx): Extract<Ticket, { kind: 'crateLot' }> | null {
  const no = x.s.counts!['crate:ticket'];
  if (no === undefined) return null;
  const tk = x.s.tickets.find((q) => q.no === no);
  return tk && tk.kind === 'crateLot' && tk.open ? tk : null;
}

/** Close the sitting's ticket (he walked off, or the table is empty). */
function closeTicket(x: Ctx): void {
  const tk = openTicket(x);
  if (tk) tk.open = false;
  delete x.s.counts!['crate:ticket'];
  delete x.s.counts!['crate:at'];
}

/** The boss's act at the picking table starts (works.ts worksAct): true when he began sorting its oldest thing. */
export function crateAct(x: Ctx, t: number): boolean {
  const C = x.c.crate;
  if (!C || !atTable(x)) return false;
  const th = oldest(x);
  if (!th) return false;
  // A sort that does not follow the last at the same instant starts a new ticket.
  if (x.s.counts!['crate:at'] !== t) closeTicket(x);
  x.s.act = { kind: 'crate', target: th.uid, since: t, endsAt: t + C.sort_s };
  return true;
}

/** The act `crate` holds while he stands still at the table and the thing is still on it; else the ticket closes. */
export function crateActHolds(x: Ctx, t: number): boolean {
  void t;
  const id = x.s.act.target;
  const th = id ? x.s.things.find((q) => q.uid === id) : undefined;
  const ok = atTable(x) && !!th && th.at.at === 'crate';
  if (!ok) closeTicket(x);
  return ok;
}

/** The act `crate` ends: the thing sorted and paid (a lot payment), its mass supplied; the ticket gains its lines. */
export function crateActEnd(x: Ctx, t: number): void {
  const C = x.c.crate;
  const id = x.s.act.target;
  const th = id ? x.s.things.find((q) => q.uid === id) : undefined;
  if (!C || !th || th.at.at !== 'crate') return;
  const day = dayAt(x, t);
  const byGrade: Record<string, number> = {};
  for (const sp of specsOf(x.c, th.obj)) byGrade[sp[0]] = (byGrade[sp[0]] ?? 0) + sp[1] * sp[2];
  const sh = x.c.objects[th.obj]?.shell;
  if (sh) byGrade[sh.grade] = (byGrade[sh.grade] ?? 0) + sh.g;
  const lines: TicketLine[] = [];
  let paid = 0;
  for (const [grade, g] of Object.entries(byGrade)) {
    const price = priceAt(x, grade, day);
    const amount = roundMoney(C.u * lineAmount(g, price));
    lines.push({ grade, g, price: roundMoney(C.u * price), amount });
    paid = roundMoney(paid + amount);
    supply(x, grade, g);
  }
  x.s.waste_g += x.c.objects[th.obj]?.waste_g ?? 0;
  spliceThing(x.s.things, x.s.things.indexOf(th));
  const { y, z } = payLot(x, paid, t);
  let tk = openTicket(x);
  if (!tk) {
    tk = printTicket(x, { ...ticketBase(x, t), kind: 'crateLot' as const, n: 0, lines: [], paid: 0, open: true });
    x.s.counts!['crate:ticket'] = tk.no;
  }
  tk.n += 1;
  tk.lines.push(...lines);
  tk.paid = roundMoney(tk.paid + paid);
  if (y > 0) tk.bank = { y: roundMoney((tk.bank?.y ?? 0) + y) };
  bankPart(x, y);
  earn(x, z, t);
  count(x, 'crateSorted');
  x.s.counts!['crate:at'] = t;
  x.ev.push({ type: 'crateSorted', thing: th.uid, paid });
  if (!crateCount(x)) {
    closeTicket(x);
    x.ev.push({ type: 'crateCleared' });
  }
}
