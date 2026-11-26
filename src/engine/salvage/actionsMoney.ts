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
 * the checks). WAVE 2 (26 Nov): the shop's (shop.ts), the ads' (ads.ts) and the looks' actions, and
 * onAwayClosed (the second session, the away bonus's offer).
 */
import { financeCheck, letterDue, agreementOf, shownOf } from './bank';
import { sell } from './actions';
import { awayOfferAfter, payAd } from './ads';
import { lookUsable } from './cardsMoney';
import { absenceOf, ageBandOf, codeHash, iapDef, quoteState, secondSession, sessions2After, settleState, validCode } from './shop';
import { begin, finish, spend } from './clock';
import { checks } from './rate';
import { orderPlate } from './works';
import type { AdKind, CardContext, FinanceShown, GradeId, LookSlot, PlateId, QuoteOutcome, SalvageConfig, SalvageEvent, SalvageGame, SellShown } from './types';

const nothing = (g: SalvageGame, events: SalvageEvent[] | undefined): SalvageGame => {
  events?.push({ type: 'refused', key: 'nothing', args: {}, retry: null });
  return g;
};

/**
 * The away card was closed (actions.ts ackAway, after the card went). "THE SECOND SESSION" (2.15.2, P1):
 * `iap.sessions2At` := the yard second now, once, when the closed card's absence was at least
 * `ads.awayMinAbsence_min`. THE AWAY BONUS (2.16): from the second session (this closing included), after such
 * an absence and while today's count allows, `ads.awayOffer` = {amount, I, centred} (ads.ts awayOfferAfter);
 * `centred` false when the closed card showed a debt (P6: no centred card, the deferred button only). The SAME
 * object when nothing changes.
 */
export function onAwayClosed(cfg: SalvageConfig, g: SalvageGame, closed: NonNullable<SalvageGame['salvage']['away']>): SalvageGame {
  const s = g.salvage;
  const absent = absenceOf(closed);
  const at = sessions2After(cfg.salvage, g, absent, Math.floor(s.t));
  const g1 = at === s.iap.sessions2At ? g : { ...g, salvage: { ...s, iap: { ...s.iap, sessions2At: at } } };
  const ads = awayOfferAfter(cfg, g1, closed, absent);
  return ads === g1.salvage.ads ? g1 : { ...g1, salvage: { ...g1.salvage, ads } };
}

/**
 * The screen saw a place or a card (actions.ts noteSeen, after the note). THE LENDER'S LETTER (2.14.5, B11):
 * reading a works card `{card: 'works', plate}` the first time the plate is financeable with P > cash −
 * reserve and cash − reserve ≥ d sets `bank.letterSeen` and emits `letter` (the screen opens the letter
 * card). Same object otherwise. Nothing else of the bank happens at a sighting.
 */
export function onSeen(cfg: SalvageConfig, g: SalvageGame, seen: { place?: string; card?: string; plate?: string }, events?: SalvageEvent[]): SalvageGame {
  // 15.11 f: the shop card's line on an expired quote stands until the card is closed: the screen reports the closing as noteSeen({card: 'shop'}).
  if (seen.card === 'shop' && g.salvage.iap.expired?.length) return { ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap, expired: [] } } };
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

/**
 * A scrip pack's quote at Buy (the shared store's QuoteFn with the product, the S on the row and the store
 * country the shop was opened with, `ctx`; shop.ts quoteState): refusals in order packOff, packPending,
 * packHeadroom, quoteUpdated (retry: buyPack at the S now), each with the SAME state; else the quote appended
 * to the end of `iap.pending`. `clock` is unused (a quote is dated on the device's clock `now`, which decides
 * no grant). Without `ctx` the country is unknown: packs are off (2.15.3).
 */
export function quotePack(cfg: SalvageConfig, g: SalvageGame, product: string, shownS: number, now: number, known: string[], askedMs: number, clock: number, events?: SalvageEvent[], ctx?: CardContext): SalvageGame {
  void clock;
  return quoteState(cfg, g, product, shownS, now, known, askedMs, events, ctx);
}

/** The shared store's settle function (15.4): the named quote withdrawn or made waiting; the same object when it no longer stands (shop.ts settleState). */
export function settleQuote(cfg: SalvageConfig, g: SalvageGame, outcome: QuoteOutcome, quote: { product: string; atMs: number }): SalvageGame {
  return settleState(cfg, g, outcome, quote);
}

/**
 * Settings' "Scrip packs: shown / hidden" behind a four-digit code (2.15.3). Hiding (`on` true) keeps the
 * code's hash; showing again asks for the same code (a wrong one: `packCode`). Refused `nothing` before the
 * second session, for the bands 'u13' and 't13' (no switch there, P17), or when already so. A code that is
 * not four digits: `packCode`. The confirming second entry of a new code is the code pad's own ("Enter it
 * again"): the action takes the code once.
 */
export function setPacksHidden(cfg: SalvageConfig, g: SalvageGame, on: boolean, code: string, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  const iap = g.salvage.iap;
  if (!iapDef(cfg.salvage) || !secondSession(g) || iap.ageBand === 'u13' || iap.ageBand === 't13' || on === !!iap.hidden) return nothing(g, events);
  if (!validCode(code) || (!on && iap.hidden?.codeHash !== codeHash(code))) {
    events?.push({ type: 'refused', key: 'packCode', args: {}, retry: null });
    return g;
  }
  return { ...g, salvage: { ...g.salvage, iap: { ...iap, hidden: on ? { codeHash: codeHash(code) } : null } } };
}

/**
 * The age question's answer (2.15.3, 4.8), kept as a band only (shop.ts ageBandOf: the younger of the two
 * ages a year gives). `badYear` for a year outside [1900, this year]; `nothing` when a band is already kept
 * (the question is asked once a save). Event `ageAsked`.
 */
export function setAgeBand(cfg: SalvageConfig, g: SalvageGame, year: number, now: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void clock;
  if (g.salvage.iap.ageBand !== null) return nothing(g, events);
  const band = ageBandOf(year, now);
  if (!band) {
    events?.push({ type: 'refused', key: 'badYear', args: {}, retry: null });
    return g;
  }
  events?.push({ type: 'ageAsked' });
  return { ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap, ageBand: band } } };
}

/**
 * A rewarded ad watched to its end, or taken at once with No ad videos (ads.ts payAd): the amount SHOWN paid
 * through clock.ts credit(…, 'ad'). The spot buyer (`ref.grade`, `ref.sell`) makes that Sell first, as shown.
 */
export function adPaid(cfg: SalvageConfig, g: SalvageGame, kind: AdKind, shownAmount: number, ref: { grade?: GradeId; sell?: SellShown }, clock: number, events?: SalvageEvent[]): SalvageGame {
  return payAd(cfg, g, kind, shownAmount, ref, clock, events, (g0, grade, shown, ev) => sell(cfg, g0, grade, shown, g0.salvage.clock.highMs, clock, ev));
}

/**
 * A look chosen for a slot (2.15.1; only the frame reads it): null the yard's own; a product of `iap.lookOf`
 * for that slot that the shared entitlements own; an earned look (cardsMoney.ts lookUsable: a sign style
 * `rung<n>` of a rung reached, `foundry` once the supply deal's series is done). Else `notOwned`. The SAME
 * object when it is already in use.
 */
export function chooseLook(cfg: SalvageConfig, g: SalvageGame, slot: LookSlot, id: string | null, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  const iap = g.salvage.iap;
  if (!(slot in iap.looks)) return nothing(g, events);
  if (id !== null && !lookUsable(cfg, g, slot, id)) {
    events?.push({ type: 'refused', key: 'notOwned', args: {}, retry: null });
    return g;
  }
  if (iap.looks[slot] === id) return g;
  return { ...g, salvage: { ...g.salvage, iap: { ...iap, looks: { ...iap.looks, [slot]: id } } } };
}
