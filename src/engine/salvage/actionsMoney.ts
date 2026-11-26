/**
 * THE MONEY'S ACTIONS (stage 2, yard-stage2.md 2.13 to 2.16, 2.19; RULING2 15): signFinance, quotePack,
 * settleQuote, setPacksHidden, setAgeBand, adPaid, chooseLook, and the money's part of two first-yard
 * actions: what closing the away card starts (`iap.sessions2At`, the away bonus's offer) and what seeing a
 * card starts (the lender's letter, bank.ts). Owner: rules-money (Phase B). actions.ts is the closed
 * dispatcher (s2a-fix, the lead's ruling of 26 Nov 09:50): its ackAway calls `onAwayClosed` after the card
 * goes, its noteSeen calls `onSeen` after the note. Same shape as every action: pure, a refusal pushed to
 * `events` with the SAME state returned.
 *
 * PHASE A STUB: the actions refuse with `nothing`; the two hooks return the game they are given.
 */
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

/** The screen saw a place or a card (actions.ts noteSeen, after the note): the lender's letter falls due here (2.14.5, bank.ts). Stub: the game itself. */
export function onSeen(cfg: SalvageConfig, g: SalvageGame, seen: { place?: string; card?: string }): SalvageGame {
  void cfg;
  void seen;
  return g;
}

/** Sign the finance card with the terms AS SHOWN (types.ts SalvageActions2). Stub: refused. */
export function signFinance(cfg: SalvageConfig, g: SalvageGame, plate: PlateId, shown: FinanceShown, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void plate;
  void shown;
  void clock;
  return nothing(g, events);
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
