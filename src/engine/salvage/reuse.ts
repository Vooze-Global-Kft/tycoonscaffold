/**
 * THE YARD SALE (stage 2, docs/design/yard-stage2.md 2.12; rulings 5, 13.1): tagged things fit for reuse,
 * who racks them (by sight, present and away alike), the public's visitors dated by value, the trade
 * corner's batches and the reclamation dealer's van. Owner: rules-works (wave 2 built the bodies, 26 Nov).
 *
 * THE RULE AS BUILT (notes/s2b-rules-works.md "Wave 2" lists where it differs from the text):
 * - TAGS (`tagged`): only once the works are open (`counts.bathSet`, the rung-3 opening), a whole uncut thing of
 *   `reuse.kinds` on the floor, at the drop-off or in a zone, none of whose content tags is in `reuse.never`, with
 *   hash01(worldSeed, 'reuse', uid) < `reuse.share`; a `fromPartnerOnly` kind only from a partner's load (uid f<n>).
 *   `reuse.firstThing` (uid `reuse.first`, beside the canopy) is tagged by content. A pure function of uid and state.
 * - PLACES: `reuse.slots` + `reuse.levelSlots` × min(level, `reuse.levels`). A place is TAKEN by a racked thing, by a
 *   tagged thing a yard hand is fetching or carrying to the rack, and by one in the boss's load: so every trip that
 *   sets off for the rack finds its place.
 * - WHO: a tagged thing is the boss's while a fresh boss is within reach.sight of it and a place is free: cutters and
 *   yard hands keep off it. He lifts it whole (act `rack`, pick_s, standing still within reach.work, his carrier holding
 *   it) and walking into the Yard sale's chalk zone (`reuseRack.zone`) sets it on the first free place (act `rack`,
 *   pick_s). Otherwise a yard hand racks it, FIRST in his order, from the drop-off then the floor (uid order), when it
 *   weighs at most crew.hand.load and a place is free; with no place free (or too heavy for a hand and out of the
 *   boss's sight) the crews cut it as any other. `reuse.first` is never cut and waits for the boss.
 * - THE SALE: `reuse.nextAt` is dated only by racking: the first thing ever racked at t + `reuse.firstVisitor_s`; a
 *   thing racked onto an EMPTY rack at max(nextAt, t + `reuse.period_s`). The queue reads it only while the rack holds
 *   a thing. At nextAt the oldest racked thing (smallest `since`, then uid) is sold for q = roundMoney(`reuse.factor`
 *   × v), v its prepared scrap value at the posted price of that day (its pieces' grades, lineAmount each); a lot
 *   payment (payLot, ticket `rackSale`, bankPart, earn); its mass is supplied at its prepared grades, once. The next
 *   visitor: nextAt + 3,600 × q ÷ (shareI_rung × max(I₀, `reuse.floorI`)), I₀ = rate.ts ratedIncome at that sale.
 * - THE VAN: a partner's `reuseBatch` rides its skips from the works' opening (partners.ts fillSkip adds it to the
 *   contents, so the label prints and prices it); at the tip those things go to the trade corner (crate.ts
 *   tipDivert -> `toCorner`); a batch reaching the corner with no van dated dates it at t + `reuse.vanPeriod_s`; the
 *   van takes every thing waiting and pays roundMoney(`reuse.batchFactor` × v) each (ticket `vanCollection`), each
 *   kilogram supplied once; then vanAt = null.
 *
 * PHASE A STUB (engine2-hooks, 26 November): every function does nothing and returns what "no Yard sale"
 * means (nothing is tagged, nobody comes), so the first yard advances exactly as before. Where the loop
 * calls them:
 * - `rackChoice(x, who, t, th)` where a yard hand or the boss meets a tagged thing (ruling 13.1):
 *     · a yard hand at his departure, FIRST in his order (crew.ts handDepart, `th` null): true when the
 *       feature has set him off with a tagged thing for the rack (his leg, claims and `dest` are the
 *       feature's to set, as handDepart sets them);
 *     · the boss in bossStep, before he picks up or works (hand.ts, `th` null): true when the feature has
 *       acted for him (he lifts a tagged thing whole, or sets one on the rack in the chalk zone: the act
 *       kind `rack`); the rest of that step is skipped;
 *     · a cutter choosing what to cut (crew.ts cutCands, each candidate `th`): true when he must keep off it
 *       (the boss or a yard hand racks it); false lets him cut it as any other (no slot free, too heavy).
 *   Below rung 3 nothing is tagged: return false.
 * - `reuseDated(x, add)` from the derived queue: the visitor's date (`reuse.nextAt`, only while the rack
 *   holds a thing) as kind `visitor`, the van's (`reuse.vanAt`) as kind `van` (ref ''). Pure in `x.c`, `x.s`.
 * - `reuseApply(x, kind, t)` at that instant: a sale at the gate or the van's collection, each a LOT PAYMENT
 *   (2.14.4): `bank.ts payLot(x, gross, t)` before its ticket prints, then `clock.ts earn(x, z, t)`.
 *
 * EVERY DATE a body writes for the queue is at least the yard second t it is written at (s2a-fix): the loop never
 * applies a date before s.t (tick.ts drops it), so a date in the past stops the feature for ever; a saved one is
 * clamped to the save's clock (state2.ts repairStage2).
 */
import type { Ctx } from './clock';
import { bankPart, bossFresh, count, dayAt, earn, heard, printTicket, priceAt, ticketBase } from './clock';
import { payLot } from './bank';
import { hash01 } from './board';
import { carrierCap_g, specsOf } from './content';
import { lineAmount, roundMoney, sumAmounts } from './money';
import { nearPlace, spotPos, thingPos } from './positions';
import { ratedIncome } from './rate';
import { supply } from './round';
import { floorSlot, thingGone, thingOf } from './things';
import { hashString } from '../rng';
import type { CrewMember, ObjectId, Piece, ThingState, TicketLine } from './types';
import { handIdle, handLeg, type DatedAdd } from './works';

export type ReuseKind = 'visitor' | 'van';

/** The first thing's uid (`reuse.firstThing`, set beside the canopy at the works' opening). */
export const FIRST_UID = 'reuse.first';
const H_REUSE = hashString('reuse');

const opened = (x: Pick<Ctx, 's'>): boolean => x.s.counts?.bathSet !== undefined;

/** Is a whole thing of object `obj` with this uid tagged reusable (the content's part: kinds, never, share, partner-only)? */
export function tagUid(c: Ctx['c'], uid: string, obj: ObjectId): boolean {
  const R = c.reuse;
  if (!R) return false;
  if (uid === FIRST_UID) return obj === R.firstThing;
  const k = R.kinds[obj];
  if (!k) return false;
  if (k.fromPartnerOnly && !/^f\d+$/.test(uid)) return false;
  const tags = c.objects[obj]?.tags;
  if (tags && tags.some((tg) => R.never.includes(tg))) return false;
  return hash01(c.worldSeed, H_REUSE, hashString(uid)) < R.share;
}

/** Is this thing tagged for the Yard sale now (the works open; whole, uncut, not a lot, standing where things wait)? */
export function tagged(x: Pick<Ctx, 'c' | 's'>, th: ThingState): boolean {
  if (!x.c.reuse || !opened(x)) return false;
  if (th.cut !== 0 || th.shell || th.sender !== undefined) return false;
  const at = th.at.at;
  if (at !== 'floor' && at !== 'dropoff' && at !== 'zone' && at !== 'canopy') return false;
  return tagUid(x.c, th.uid, th.obj);
}

/** A carried whole piece that is a tagged thing on its way to the rack. */
function taggedPiece(x: Pick<Ctx, 'c' | 's'>, p: Piece): boolean {
  return !!p.whole && p.spec === -1 && opened(x) && tagUid(x.c, p.uid, p.whole);
}

/** The Yard sale's places (2.12): slots + levelSlots × min(level, levels). */
export function rackCap(x: Pick<Ctx, 'c' | 's'>): number {
  const R = x.c.reuse;
  if (!R) return 0;
  return R.slots + R.levelSlots * Math.min(x.s.reuse.level, R.levels);
}

/** Things on the rack. */
export function rackCount(x: Pick<Ctx, 's'>): number {
  let n = 0;
  for (const th of x.s.things) if (th.at.at === 'rack') n++;
  return n;
}

/** Places taken: racked things, tagged things a yard hand fetches or carries there, tagged things in the boss's load. */
function taken(x: Pick<Ctx, 'c' | 's'>): number {
  let n = rackCount(x);
  for (const m of x.s.crew) if (m.job === 'rack') n++;
  for (const p of x.s.load) if (taggedPiece(x, p)) n++;
  return n;
}

const freePlaces = (x: Pick<Ctx, 'c' | 's'>): number => rackCap(x) - taken(x);

/** Is the thing the boss's (ruling 13.1): a fresh boss within reach.sight of its footprint whose carrier can hold it? */
function bossSeesThing(x: Ctx, th: ThingState, t: number): boolean {
  if (!bossFresh(x, t)) return false;
  if ((x.c.objects[th.obj]?.gross_g ?? Infinity) > carrierCap_g(x.c, x.s)) return false;
  const p = x.s.presence;
  const q = thingPos(x.c, th.at);
  const o = x.c.objects[th.obj];
  const d = Math.hypot(Math.max(0, Math.abs(p.x - q.x) - (o?.size.w ?? 1) / 2), Math.max(0, Math.abs(p.y - q.y) - (o?.size.d ?? 0.8) / 2));
  return d <= x.c.reach.sight;
}

/** The whole piece a tagged thing becomes when it is lifted whole (its uid; its whole grade, else its first piece's). */
function wholePiece(x: Ctx, th: ThingState): Piece {
  const o = x.c.objects[th.obj];
  const grade = o?.whole ?? (specsOf(x.c, th.obj)[0]?.[0] as string) ?? 'waste';
  return { uid: th.uid, grade, g: o?.gross_g ?? 0, from: null, spec: -1, whole: th.obj };
}

/** A yard hand may rack it: hired hands exist and it weighs at most crew.hand.load. */
const handLifts = (x: Ctx, th: ThingState): boolean => (x.c.objects[th.obj]?.gross_g ?? Infinity) <= x.c.crew.hand.load * 1000 && x.s.crew.some((m) => m.role === 'hand');

/** A yard hand (th null), the boss (th null) or a cutter (th a candidate) meets what may be a tagged thing. */
export function rackChoice(x: Ctx, who: 'boss' | CrewMember, t: number, th: ThingState | null): boolean {
  if (!x.c.reuse || !opened(x)) return false;
  if (th) {
    // Keep off (a cutter, a yard hand's other picks): the first thing always; else a tagged thing while a place is free
    // and the boss sees it or a yard hand can lift it. No place free, or too heavy and out of sight: cut as any other.
    if (!tagged(x, th)) return false;
    if (th.uid === FIRST_UID) return true;
    if (freePlaces(x) <= 0) return false;
    return bossSeesThing(x, th, t) || handLifts(x, th);
  }
  if (who === 'boss') return bossRack(x, t);
  if (who.role !== 'hand') return false;
  return handRack(x, who, t);
}

/** The boss's act at the Yard sale (bossStep, before pickup and work): set a carried tagged thing on the rack in its chalk zone, or lift one whole. */
function bossRack(x: Ctx, t: number): boolean {
  const s = x.s;
  const p = s.presence;
  const c = x.c;
  const carried = s.load.find((q) => taggedPiece(x, q));
  if (carried && nearPlace(c, 'reuseRack.zone', p.x, p.y, 0) && rackCount(x) < rackCap(x)) {
    s.act = { kind: 'rack', target: `set:${carried.uid}`, since: t, endsAt: t + c.pick_s };
    return true;
  }
  if (p.moving || freePlaces(x) <= 0) return false;
  const room = carrierCap_g(c, s) - s.load.reduce((a, q) => a + q.g, 0);
  const th = nearestTagged(x, p.x, p.y, room);
  if (!th) return false;
  s.act = { kind: 'rack', target: th.uid, since: t, endsAt: t + c.pick_s };
  return true;
}

/** The nearest tagged thing within reach.work of (px, py), free, that a carrier with `room` grams holds. */
function nearestTagged(x: Ctx, px: number, py: number, room: number): ThingState | null {
  let best: ThingState | null = null;
  let bestD = Infinity;
  for (const th of x.s.things) {
    if (th.by || !tagged(x, th)) continue;
    const o = x.c.objects[th.obj];
    if (!o || o.gross_g > room) continue;
    const q = thingPos(x.c, th.at);
    const d = Math.hypot(Math.max(0, Math.abs(px - q.x) - o.size.w / 2), Math.max(0, Math.abs(py - q.y) - o.size.d / 2));
    if (d <= x.c.reach.work && d < bestD) {
      best = th;
      bestD = d;
    }
  }
  return best;
}

/** A yard hand at his departure, first in his order: a tagged thing for the rack (drop-off first, then the floor; uid order). */
function handRack(x: Ctx, m: CrewMember, t: number): boolean {
  if (freePlaces(x) <= 0) return false;
  let best: ThingState | null = null;
  for (const th of x.s.things) {
    if (th.by || (th.at.at !== 'dropoff' && th.at.at !== 'floor') || !tagged(x, th) || th.uid === FIRST_UID) continue;
    if (!handLifts(x, th) || bossSeesThing(x, th, t)) continue;
    if (!best || (th.at.at === 'dropoff' && best.at.at !== 'dropoff') || (th.at.at === best.at.at && th.uid < best.uid)) best = th;
  }
  if (!best) return false;
  best.by = m.id;
  m.claims = [best.uid];
  m.dest = 'rack';
  handLeg(x, m, 'rack', 'walkTo', { thing: best.uid }, t);
  return true;
}

/** The act `rack` still holds: lifting while he stands still within reach of the free thing; setting while he is in the chalk zone. */
export function rackActHolds(x: Ctx, t: number): boolean {
  void t;
  const a = x.s.act;
  const p = x.s.presence;
  if (!a.target) return false;
  if (a.target.startsWith('set:')) return nearPlace(x.c, 'reuseRack.zone', p.x, p.y, 0) && x.s.load.some((q) => q.uid === a.target!.slice(4));
  const th = thingOf(x, a.target);
  if (!th || th.by || p.moving) return false;
  const o = x.c.objects[th.obj];
  const q = thingPos(x.c, th.at);
  return !!o && Math.hypot(Math.max(0, Math.abs(p.x - q.x) - o.size.w / 2), Math.max(0, Math.abs(p.y - q.y) - o.size.d / 2)) <= x.c.reach.work;
}

/** The act `rack` ends: the thing lifted whole into his load, or set on the rack. */
export function rackActEnd(x: Ctx, t: number): void {
  const a = x.s.act;
  if (!a.target) return;
  if (a.target.startsWith('set:')) {
    const uid = a.target.slice(4);
    const i = x.s.load.findIndex((q) => q.uid === uid);
    if (i < 0 || rackCount(x) >= rackCap(x)) return;
    const [p] = x.s.load.splice(i, 1);
    rackThing(x, p, 'boss', t);
    return;
  }
  const th = thingOf(x, a.target);
  if (!th || th.by || !tagged(x, th)) return;
  const p = wholePiece(x, th);
  if (p.g > carrierCap_g(x.c, x.s) - x.s.load.reduce((s, q) => s + q.g, 0)) return;
  thingGone(x, th, 'boss', t, true);
  x.s.load.push(p);
  x.ev.push({ type: 'pickup', piece: p.uid, grade: p.grade, g: p.g, by: 'boss' });
}

/** A carried tagged thing is set on the first free place of the rack at t (`racked`); the visitor dated (first ever, or onto an empty rack). */
function rackThing(x: Ctx, p: Piece, by: string, t: number): void {
  const R = x.c.reuse!;
  const used = new Set<number>();
  for (const th of x.s.things) if (th.at.at === 'rack') used.add(th.at.slot);
  const empty = used.size === 0;
  let slot = 0;
  while (used.has(slot)) slot++;
  x.s.things.push({ uid: p.uid, obj: p.whole!, at: { at: 'rack', slot, since: t }, cut: 0, progress: 0, by: null });
  const r = x.s.reuse;
  if (r.nextAt === null) r.nextAt = t + R.firstVisitor_s;
  else if (empty) r.nextAt = Math.max(r.nextAt, t + R.period_s);
  count(x, 'racked');
  x.ev.push({ type: 'racked', thing: p.uid, slot, by });
}

/** A yard hand's rack trip (works.ts worksLegEnd, job 'rack'): at the thing he lifts it whole; at the rack he sets it on its place. */
export function rackLegEnd(x: Ctx, m: CrewMember, t: number): void {
  const at = spotPos(x.c, m.to, x.s.things, x.s.truck);
  if (m.phase === 'walkTo') {
    const th = thingOf(x, m.claims[0] ?? null);
    m.claims = [];
    if (!th || th.by !== m.id) {
      handIdle(m, t, at);
      return;
    }
    th.by = null;
    const p = wholePiece(x, th);
    thingGone(x, th, m.id, t, true);
    m.load = [p];
    m.carries = p.grade;
    handLeg(x, m, 'rack', 'walkBack', { place: 'reuseRack.zone' }, t, at);
    return;
  }
  const p = m.load[0];
  m.load = [];
  if (p) {
    if (rackCount(x) < rackCap(x)) rackThing(x, p, m.id, t);
    // Defensive (a place is kept for every trip): with none free it stands on the floor again, whole.
    else x.s.things.push({ uid: p.uid, obj: p.whole!, at: { at: 'floor', slot: floorSlot(x) }, cut: 0, progress: 0, by: null });
  }
  handIdle(m, t, at);
}

/** The visitor's and the van's dated ends (the visitor's only while the rack holds a thing). No allocation. */
export function reuseDated(x: Ctx, add: DatedAdd<ReuseKind>): void {
  const r = x.s.reuse;
  if (r.nextAt !== null) {
    for (const th of x.s.things)
      if (th.at.at === 'rack') {
        add(r.nextAt, 'visitor', '');
        break;
      }
  }
  if (r.vanAt !== null) add(r.vanAt, 'van', '');
}

/** A thing's prepared lines at day D's posted prices (its pieces' grades; `scale` for a lot's mass), and their value v. */
export function preparedLines(x: Ctx, obj: ObjectId, day: number, g?: number): { lines: TicketLine[]; v: number; byGrade: Record<string, number> } {
  const o = x.c.objects[obj];
  const byGrade: Record<string, number> = {};
  if (!o) return { lines: [], v: 0, byGrade };
  const f = g !== undefined && o.gross_g > 0 ? g / o.gross_g : 1;
  for (const sp of specsOf(x.c, obj)) byGrade[sp[0]] = (byGrade[sp[0]] ?? 0) + Math.round(sp[1] * sp[2] * f);
  if (o.shell) byGrade[o.shell.grade] = (byGrade[o.shell.grade] ?? 0) + Math.round(o.shell.g * f);
  const lines: TicketLine[] = [];
  for (const [grade, gg] of Object.entries(byGrade)) {
    const price = priceAt(x, grade, day);
    lines.push({ grade, g: gg, price, amount: lineAmount(gg, price) });
  }
  return { lines, v: sumAmounts(lines), byGrade };
}

/** The tag's two figures at the present step (2.12, its plate before any choice): § at the gate and § as scrap; null when not tagged. */
export function tagFigures(x: Ctx, th: ThingState, t: number): { gate: number; scrap: number } | null {
  if (!tagged(x, th) || !x.c.reuse) return null;
  const { v } = preparedLines(x, th.obj, dayAt(x, t));
  return { gate: roundMoney(x.c.reuse.factor * v), scrap: v };
}

/** The share of max(I₀, floorI) an hour the public pays at most, at the yard's rung (`reuse.shareI`; the last given at a rung past its end). */
function shareIAt(x: Ctx): number | null {
  const sh = x.c.reuse!.shareI;
  const r = Math.max(1, Math.min(x.s.ladder.rung, sh.length));
  for (let k = r - 1; k >= 0; k--) if (sh[k] !== null && sh[k] !== undefined) return sh[k] as number;
  return null;
}

/** A visitor buys, or the van collects, at its instant t. */
export function reuseApply(x: Ctx, kind: ReuseKind, t: number): void {
  if (!x.c.reuse) return;
  if (kind === 'visitor') visitorBuys(x, t);
  else vanCollects(x, t);
}

function visitorBuys(x: Ctx, t: number): void {
  const R = x.c.reuse!;
  const r = x.s.reuse;
  let th: ThingState | null = null;
  for (const q of x.s.things) {
    if (q.at.at !== 'rack') continue;
    if (!th || q.at.since < (th.at as { since: number }).since || (q.at.since === (th.at as { since: number }).since && q.uid < th.uid)) th = q;
  }
  if (!th || r.nextAt === null) return;
  const day = dayAt(x, t);
  const { lines, v, byGrade } = preparedLines(x, th.obj, day);
  const q = roundMoney(R.factor * v);
  x.s.things.splice(x.s.things.indexOf(th), 1);
  for (const [grade, g] of Object.entries(byGrade)) supply(x, grade, g);
  const { y, z } = payLot(x, q, t);
  const ticket = printTicket(x, { ...ticketBase(x, t), kind: 'rackSale' as const, thing: th.obj, uid: th.uid, v, paid: q, lines, ...(y > 0 ? { bank: { y } } : {}) });
  bankPart(x, y);
  earn(x, z, t);
  count(x, 'rackSold');
  if (r.sold.day !== day) r.sold = { day, n: 0, money: 0 };
  r.sold = { day, n: r.sold.n + 1, money: roundMoney(r.sold.money + q) };
  if (x.away) x.away.rack = { n: x.away.rack.n + 1, money: roundMoney(x.away.rack.money + q) };
  if (heard(x)) x.ev.push({ type: 'visitor', t0: t, t1: t });
  x.ev.push({ type: 'rackSold', thing: th.uid, q, ticket });
  // The ceiling follows I (L2, E4): the next visitor by value, never sooner than q at shareI x max(I0, floorI) an hour.
  const sh = shareIAt(x);
  const I0 = ratedIncome(x.c, x.s);
  const per = sh !== null ? sh * Math.max(I0, R.floorI) : 0;
  r.nextAt = per > 0 ? r.nextAt + (3600 * q) / per : Math.max(t, r.nextAt) + R.period_s;
  if (r.nextAt < t) r.nextAt = t;
  x.dirty = true;
}

/** A batch thing set down at the trade corner at t (crate.ts tipDivert): its place; the van dated when none is. */
export function toCorner(x: Ctx, t: number): { at: 'corner'; k: number; since: number } {
  const used = new Set<number>();
  for (const th of x.s.things) if (th.at.at === 'corner') used.add(th.at.k);
  let k = 0;
  while (used.has(k)) k++;
  const r = x.s.reuse;
  if (r.vanAt === null && x.c.reuse) {
    r.vanAt = t + x.c.reuse.vanPeriod_s;
    if (heard(x)) x.ev.push({ type: 'vanDated', at: r.vanAt });
  }
  return { at: 'corner', k, since: t };
}

function vanCollects(x: Ctx, t: number): void {
  const R = x.c.reuse!;
  const r = x.s.reuse;
  r.vanAt = null;
  const batch = x.s.things.filter((q) => q.at.at === 'corner');
  if (!batch.length) return;
  const day = dayAt(x, t);
  const lines: TicketLine[] = [];
  const things: { obj: ObjectId; n: number; g: number }[] = [];
  let paid = 0;
  for (const th of batch) {
    const { v, byGrade } = preparedLines(x, th.obj, day);
    const amount = roundMoney(R.batchFactor * v);
    paid = roundMoney(paid + amount);
    let g = 0;
    for (const [grade, gg] of Object.entries(byGrade)) {
      supply(x, grade, gg);
      g += gg;
      const price = priceAt(x, grade, day);
      lines.push({ grade, g: gg, price, amount: roundMoney(R.batchFactor * lineAmount(gg, price)) });
    }
    const row = things.find((q) => q.obj === th.obj);
    if (row) {
      row.n++;
      row.g += g;
    } else things.push({ obj: th.obj, n: 1, g });
    x.s.things.splice(x.s.things.indexOf(th), 1);
  }
  const { y, z } = payLot(x, paid, t);
  const ticket = printTicket(x, { ...ticketBase(x, t), kind: 'vanCollection' as const, buyer: 'reclaimer', things, lines, paid, ...(y > 0 ? { bank: { y } } : {}) });
  bankPart(x, y);
  earn(x, z, t);
  count(x, 'vanCollected');
  if (x.away) x.away.van = { n: x.away.van.n + batch.length, money: roundMoney(x.away.van.money + paid) };
  x.ev.push({ type: 'vanCollected', ticket });
  x.dirty = true;
}

/**
 * The works open (works.ts worksOpen, `backFieldOpen`): the Yard sale's first moment (2.12: `reuse.firstThing`,
 * the bath, set beside the canopy). Called once, at the one instant the works open (live only).
 */
export function reuseOpen(x: Ctx, t: number): void {
  void t;
  const R = x.c.reuse;
  if (!R || !x.c.objects[R.firstThing] || thingOf(x, FIRST_UID)) return;
  x.s.things.push({ uid: FIRST_UID, obj: R.firstThing, at: { at: 'canopy', k: 0 }, cut: 0, progress: 0, by: null });
}
