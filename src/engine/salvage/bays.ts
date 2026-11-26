/**
 * Bays, Hold, Sell's set-aside, reservations (yard-stage1.md 2.3). Owner: rules-sim.
 * A bay's `g` holds every gram in it: set-aside grams (`aside`) and reserved grams (`forCrucible_g`,
 * `forDeal_g`) are parts of `g`, never extra.
 */
import { dayWord } from './board';
import { dayAt, priceAt, type Ctx } from './clock';
import { fullestSkip } from './partners';
import { lineAmount, resolveGrams } from './money';
import type { BayState } from './types';

export function bayOf(x: Ctx, grade: string): BayState {
  let b = x.s.bays[grade];
  if (!b) {
    b = { g: 0, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 };
    x.s.bays[grade] = b;
  }
  return b;
}

export const asideOf = (b: BayState): number => b.aside.reduce((a, x) => a + x.g, 0);

/** Grams of a bay not reserved and not set aside (what Sell and the round may take). */
export function freeOf(b: BayState): number {
  return Math.max(0, b.g - asideOf(b) - b.forCrucible_g - b.forDeal_g);
}

/** A bay's capacity, grams (content `bays.<grade>` kg; none = unbounded). */
export function capOf(x: Ctx, grade: string): number {
  const kg = x.c.bays[grade];
  return kg === undefined ? Infinity : kg * 1000;
}

/**
 * What the merchant's round may take from a bay now (2.3), resolved down to 0.1 kg per part: an unheld
 * bay its free grams; a held bay its set-aside grams and the free grams above its capacity.
 */
export function collectable(x: Ctx, grade: string): { free: number; aside: number } {
  const b = x.s.bays[grade];
  if (!b) return { free: 0, aside: 0 };
  const aside = resolveDown(asideOf(b));
  const free = b.held ? resolveDown(Math.max(0, freeOf(b) - Math.max(0, capOf(x, grade) - asideOf(b) - b.forCrucible_g - b.forDeal_g))) : resolveDown(freeOf(b));
  return { free, aside };
}

/** Grams resolved DOWN to whole 0.1 kg steps (a lot takes whole steps, 2.2). */
export function resolveDown(g: number): number {
  return Math.floor(Math.max(0, g) / 100 + 1e-9) * 100;
}

/** The deal's reserve fills first from cast iron weighed in (2.9), then the crucible's (2.5). */
export function reserveOnWeighIn(x: Ctx, grade: string): void {
  const b = bayOf(x, grade);
  const d = x.s.deal;
  if (d.phase === 'running' && grade === x.c.deal.grade) {
    const want = Math.max(0, d.q_g - b.forDeal_g);
    b.forDeal_g += Math.min(want, Math.max(0, b.g - asideOf(b) - b.forCrucible_g - b.forDeal_g));
  }
}

/**
 * E32: Hold waits for a better day and then lets go. Whenever the market day moves on (the day event live
 * and away, and the days a capped absence or a jumped clock skips), a held bay rejoins the merchant's
 * round by itself when a HIGH day for its grade has begun since it was held, or two market days have
 * (counts['heldDay:<grade>'], set by setHold). Path-free: the days are looked at, not the events.
 */
export function releaseHolds(x: Ctx): void {
  const s = x.s;
  const day = s.clock.day;
  for (const [grade, b] of Object.entries(s.bays)) {
    if (!b.held) continue;
    const key = `heldDay:${grade}`;
    if (s.counts![key] === undefined) s.counts![key] = day;
    const since = s.counts![key];
    let go = day >= since + 2;
    for (let d = since + 1; !go && d <= day; d++) go = dayWord(x.c, grade, d) === 'high';
    if (!go) continue;
    b.held = false;
    delete s.counts![key];
    x.ev.push({ type: 'heldBay', grade, on: false });
    x.dirty = true;
  }
}

/** Grams resolved UP to whole 0.1 kg steps (a lot that must cover an amount, 2.2). */
export function resolveUp(g: number): number {
  return Math.ceil(Math.max(0, g) / 100 - 1e-9) * 100;
}

/**
 * E40 (stage 2 2.2; RULING2.md 10.5 as amended by 14.6; H1): HOLD NEVER STOPS THE YARD, AND STAYS ON. While
 * the boss is away (the away pass: no boss acts), at an instant's checks (after the round and the driver's
 * departure, 2.12 steps 4 to 6) when
 *   - the merchant waits and nothing in any bay is collectable (no free stock unheld, nothing set aside),
 *   - the driver is idle at the truck with no trip and no skip on it, and
 *   - a partner's skip is full and the cash less the truck's earmark cannot pay the cheapest full skip,
 * the yard sets aside, from ONE held bay, just what TWO such skips need at today's price (HOLD_SKIPS), as the Sell
 * button sets a lot aside (`b.aside`: grams, today's price, today's day; the round takes it and the ticket
 * shows that price). The bay: first those whose word of the day is not low, then the one worth most at
 * today's price (its free grams), ties by grade id. The lot: the shortfall (HOLD_SKIPS × the skip's price less
 * the cash less the earmark) ÷ today's price, resolved UP to the scale's 0.1 kg step, at least one step, at most the
 * bay's free grams resolved down (and raised by a step while its amount would still fall short). The bay
 * stays held: no heldBay event. Returns the grade, or null.
 * Recorded for the away card: `counts['holdSold:<grade>']` (the yard second, whole, of the last lot) and the
 * pass's list `x.away.heldSold` (away.ts copies it onto the card).
 */
/** How many of the cheapest full skip one lot from hold pays for (RULING2.md 14.6: two, the ruling's fallback). */
export const HOLD_SKIPS = 2;

export function holdRelease(x: Ctx, t: number): string | null {
  const s = x.s;
  if (x.live) return null;
  if (s.merchant.phase !== 'waiting') return null;
  const tr = s.truck;
  const d = s.crew.find((m) => m.role === 'driver');
  if (!d || d.job !== 'idle' || !tr.owned || tr.trip || tr.by !== null || tr.skip) return null;
  let cheapest = Infinity;
  for (const id in s.partners) {
    if (!x.c.partners[id]) continue;
    const sk = fullestSkip(x, id);
    if (sk && sk.price < cheapest) cheapest = sk.price;
  }
  const have = x.cash - (tr.earmark?.money ?? 0);
  if (!(cheapest > have + 1e-9) || !Number.isFinite(cheapest)) return null;
  let best: { grade: string; v: number; low: boolean; free: number; price: number } | null = null;
  const day = dayAt(x, t);
  for (const grade of Object.keys(s.bays)) {
    const { free, aside } = collectable(x, grade);
    if (free > 0 || aside > 0) return null; // the round has something to take: Hold is not what stops it
    const b = s.bays[grade];
    if (!b.held) continue;
    const g = resolveDown(freeOf(b));
    if (g <= 0) continue;
    const price = priceAt(x, grade, day);
    if (!(price > 0)) continue;
    const v = (g / 1000) * price;
    const low = dayWord(x.c, grade, day) === 'low';
    const better = !best || (best.low && !low) || (best.low === low && (v > best.v + 1e-9 || (Math.abs(v - best.v) <= 1e-9 && grade < best.grade)));
    if (better) best = { grade, v, low, free: g, price };
  }
  if (!best) return null;
  // RULING2.md 14.6's fallback, taken: with one skip a lot the bots' day-word Hold lost 19 to 22 % over three
  // days against the same days without Hold (more than the tenth allowed), so a lot covers TWO skips.
  const need = HOLD_SKIPS * cheapest - Math.max(0, have);
  let g = Math.min(best.free, Math.max(100, resolveUp((need / best.price) * 1000)));
  while (g < best.free && lineAmount(g, best.price) < need - 1e-9) g += 100;
  bayOf(x, best.grade).aside.push({ g, price: best.price, day });
  s.counts![`holdSold:${best.grade}`] = Math.floor(t);
  const acc = x.away as (typeof x.away & { heldSold?: string[] }) | null;
  if (acc) {
    const list = (acc.heldSold ??= []);
    if (!list.includes(best.grade)) list.push(best.grade);
  }
  x.dirty = true;
  return best.grade;
}

void resolveGrams;
