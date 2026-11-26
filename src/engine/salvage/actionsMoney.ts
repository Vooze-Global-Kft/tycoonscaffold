/**
 * THE MONEY'S ACTIONS (stage 2, yard-stage2.md 2.13 to 2.16, 2.19; RULING2 15): signFinance, quotePack,
 * settleQuote, setPacksHidden, setAgeBand, adPaid, chooseLook, and the money's part of two first-yard
 * actions: what closing the away card starts (`iap.sessions2At`, the away bonus's offer) and what seeing a
 * card starts (the lender's letter, bank.ts). Owner: rules-money (Phase B). actions.ts is the closed
 * dispatcher (s2a-fix, the lead's ruling of 26 Nov 09:50): its ackAway calls `onAwayClosed` after the card
 * goes, its noteSeen calls `onSeen` after the note. Same shape as every action: pure, a refusal pushed to
 * `events` with the SAME state returned.
 *
 * WAVE 1 (rules-money, 26 Nov): signFinance and the letter (onSeen) are built (bank.ts holds the terms and
 * the checks). The shop's, the ads' and the looks' actions are wave 2's: they still refuse with `nothing`,
 * and onAwayClosed still returns the game it is given.
 */
import { financeCheck, letterDue, agreementOf, shownOf } from './bank';
import { begin, finish, spend } from './clock';
import { checks } from './rate';
import { orderPlate } from './works';
import type { AdKind, FinanceShown, GradeId, LookSlot, PlateId, QuoteOutcome, SalvageConfig, SalvageEvent, SalvageGame } from './types';

const nothing = (g: SalvageGame, events: SalvageEvent[] | undefined): SalvageGame => {
  events?.push({ type: 'refused', key: 'nothing', args: {}, retry: null });
  return g;
};

/** The away card was closed (actions.ts ackAway, after the card went): "the second session" (2.15.2) and the away bonus (2.16). Stub: the game itself. */
export function onAwayClosed(cfg: SalvageConfig, g: SalvageGame, closed: NonNullable<SalvageGame['salvage']['away']>): SalvageGame {
  void cfg;
  void closed;
  return g;
}

/**
 * The screen saw a place or a card (actions.ts noteSeen, after the note). THE LENDER'S LETTER (2.14.5, B11):
 * reading a works card `{card: 'works', plate}` the first time the plate is financeable with P > cash −
 * reserve and cash − reserve ≥ d sets `bank.letterSeen` and emits `letter` (the screen opens the letter
 * card). Same object otherwise. Nothing else of the bank happens at a sighting.
 */
export function onSeen(cfg: SalvageConfig, g: SalvageGame, seen: { place?: string; card?: string; plate?: string }, events?: SalvageEvent[]): SalvageGame {
  if (seen.card !== 'works' || !seen.plate || !letterDue(cfg, g, seen.plate)) return g;
  events?.push({ type: 'letter' });
  return { ...g, salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: true } } };
}

/**
 * Sign the finance card with the terms AS SHOWN (2.14.3; types.ts SalvageActions2). Refusals in order
 * (bank.ts financeCheck): bankOne, owned, the plate's gate (rung, needsItem), notFinanceable (not
 * financeable, the letter not seen, or a price cash − reserve pays outright), bankReserve, cash (or
 * earmark), ceiling, bankTerms (retry: sign the terms now). Then cash −= d, the plate is ordered (works.ts
 * orderPlate, its one path), the agreement is stored with the I read now, event `financed`.
 */
export function signFinance(cfg: SalvageConfig, g: SalvageGame, plate: PlateId, shown: FinanceShown, clock: number, events?: SalvageEvent[]): SalvageGame {
  const ch = financeCheck(cfg, g, plate, shown);
  if (ch.refusal) {
    const retry = ch.refusal.key === 'bankTerms' && ch.terms ? { act: 'signFinance' as const, plate, shown: shownOf(ch.terms) } : null;
    events?.push({ type: 'refused', key: ch.refusal.key, args: ch.refusal.args, retry });
    return g;
  }
  const tm = ch.terms!;
  const x = begin(cfg, g, events, true);
  const t = Math.max(clock, x.s.t);
  spend(x, tm.d);
  orderPlate(x, plate, t);
  x.s.bank.agreement = agreementOf(tm, t);
  x.ev.push({ type: 'financed', plate, F: tm.F, T: tm.T });
  checks(x, t);
  return finish(g, x);
}

/** The shared store's quote function (RULING2 15.3, 15.12, 15.13). Stub: refused. */
export function quotePack(cfg: SalvageConfig, g: SalvageGame, product: string, shownS: number, now: number, known: string[], askedMs: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void product;
  void shownS;
  void now;
  void known;
  void askedMs;
  void clock;
  return nothing(g, events);
}

/** The shared store's settle function (15.4): the named quote withdrawn or made waiting; the same object when it no longer stands. Stub: the game itself. */
export function settleQuote(cfg: SalvageConfig, g: SalvageGame, outcome: QuoteOutcome, quote: { product: string; atMs: number }): SalvageGame {
  void cfg;
  void outcome;
  void quote;
  return g;
}

/** Settings' "Scrip packs: shown / hidden" behind a four-digit code. Stub: refused. */
export function setPacksHidden(cfg: SalvageConfig, g: SalvageGame, on: boolean, code: string, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void on;
  void code;
  void clock;
  return nothing(g, events);
}

/** The age question's answer (kept as a band, never the year). Stub: refused. */
export function setAgeBand(cfg: SalvageConfig, g: SalvageGame, year: number, now: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void year;
  void now;
  void clock;
  return nothing(g, events);
}

/** A rewarded ad watched to its end (paid through clock.ts credit(…, 'ad')). Stub: refused. */
export function adPaid(cfg: SalvageConfig, g: SalvageGame, kind: AdKind, shownAmount: number, ref: { grade?: GradeId }, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void kind;
  void shownAmount;
  void ref;
  void clock;
  return nothing(g, events);
}

/** A look chosen for a slot (an owned product or an earned look; null the yard's own). Stub: refused. */
export function chooseLook(cfg: SalvageConfig, g: SalvageGame, slot: LookSlot, id: string | null, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void slot;
  void id;
  void clock;
  return nothing(g, events);
}
