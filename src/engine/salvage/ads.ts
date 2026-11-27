/**
 * THE MODE'S AD RULES (stage 2, docs/design/yard-stage2.md 2.16, 4.9): the away bonus (at most
 * `ads.awayPerDay` a market day, after an absence of `ads.awayMinAbsence_min`, on its own card after the
 * away card is closed, never on it), the spot buyer on a held bay's Sell, the day's counts, nothing before
 * `iap.sessions2At`. Rewards go through `clock.ts credit(x, amount, t, 'ad')`, never a lot payment, so the
 * bank never shares in them and they never repay. The shared ad service (src/services/ads.ts) is
 * store-shared's; whether a video loaded is the screen's (it calls adPaid only for a video watched to its
 * end, or at once with No ad videos). Owner: rules-money (wave 2, 26 Nov).
 *
 * THE RULE AS BUILT (where 2.16 leaves a choice; notes/s2b-rules-money.md "Wave 2"):
 * - The market day of the counts is the state's market time (`clock.highMs`, board.ts marketDay): a day
 *   that changed resets both counts at the next offer or payment (nothing is dated, nothing expires).
 * - The away bonus is made when the away card is CLOSED (actionsMoney.ts onAwayClosed), the same closing that
 *   may begin the second session: amount = min(roundMoney(awayShare × max(0, money − bank)),
 *   roundMoney(awayCap_min ÷ 60 × I)), I read then; it replaces an older offer; `centred` false when the
 *   closed card showed a debt (P6). It is counted when PAID (awayUsed), and offered only while awayUsed <
 *   awayPerDay today.
 * - The spot buyer: on a held bay with free grams, amount = min(roundMoney(spotShare × the Sell's amount),
 *   roundMoney(spotCap_min ÷ 60 × I)); adPaid('spot') makes THAT Sell (actions.ts sell, as shown) and then
 *   credits the bonus apart: one action, so no bonus without its Sell.
 */
import { marketDay, priceOf, sellAmount } from './board';
import { freeOf } from './bays';
import { begin, credit, finish } from './clock';
import { roundMoney } from './money';
import { ratedI, secondSession } from './shop';
import type { SalvageContent } from '../../config/schema.salvage';
import type { AdKind, AdsState, AwayCard, BonusCard, CardButton, GradeId, SalvageConfig, SalvageEvent, SalvageGame, SellShown } from './types';

/** The content's `ads` block, or null (no ad of the mode's on a content without it). */
export function adsDef(c: SalvageContent): NonNullable<SalvageContent['ads']> | null {
  return c.ads ?? null;
}

/** The market day the counts belong to (the state's market time). */
export function adDay(c: SalvageContent, g: SalvageGame): number {
  return marketDay(c, g.salvage.clock.highMs);
}

/** The day's counts as they stand today (a counter of another day reads 0). */
export function adCounts(c: SalvageContent, g: SalvageGame): { awayUsed: number; spotUsed: number } {
  const a = g.salvage.ads;
  return a.day === adDay(c, g) ? { awayUsed: a.awayUsed, spotUsed: a.spotUsed } : { awayUsed: 0, spotUsed: 0 };
}

/**
 * THE DAY'S CEILING AT EVERY RUNG (s2c-fix-money M8, RULING2 22): another ad of this kind may be offered and paid today
 * only while the day's ads, each counted at its cap (awayCap_min, spotCap_min minutes of I), stay within maxDayShare of
 * a day's income at the yard's rung (adDayLimitMinutes: maxDayShare x dayHours_h x 60). Where the content's caps fit
 * the day (rungs 3 to 5 on the shipped content) this never binds; on the short days of rungs 1 and 2 it allows fewer
 * ads (rung 1: no away bonus, three spot buyers; rung 2: the away bonus and one spot buyer). A rung the content names
 * no day for: no ceiling here (the content's check (6) holds it).
 */
export function dayRoom(c: SalvageContent, g: SalvageGame, kind: AdKind): boolean {
  const d = adsDef(c);
  if (!d) return false;
  const limit = adDayLimitMinutes(c, g.salvage.ladder.rung);
  if (limit === null) return true;
  const n = adCounts(c, g);
  const used = n.awayUsed * d.awayCap_min + n.spotUsed * d.spotCap_min;
  return used + (kind === 'away' ? d.awayCap_min : d.spotCap_min) <= limit + 1e-9;
}

/** The ads' state rolled to today (counts reset when the day changed). */
function rolled(c: SalvageContent, g: SalvageGame): AdsState {
  const a = g.salvage.ads;
  const d = adDay(c, g);
  return a.day === d ? a : { ...a, day: d, awayUsed: 0, spotUsed: 0 };
}

/**
 * Any ad button may exist (4.1.4): from the second session only; s2e-fix1 (RULING2 28.2 b) NEVER FOR THE AGE BAND 'u13' (no away
 * bonus video, no spot buyer, as there is no shop). With no band yet (the age question due) ads may stand, their requests
 * child-treated (shop.ts adAudience); the screen asks the question before the first ad button.
 */
export function adsAllowed(cfg: SalvageConfig, g: SalvageGame): boolean {
  return !!adsDef(cfg.salvage) && secondSession(g) && g.salvage.iap.ageBand !== 'u13';
}

/** No ad videos is owned (entitlements.skipRewarded): every reward at once, same limits. */
export function noVideo(g: SalvageGame): boolean {
  return !!g.entitlements?.skipRewarded;
}

/** Minutes of I as § (roundMoney). */
const minutesOfI = (min: number, I: number) => roundMoney((Math.max(0, min) / 60) * Math.max(0, I));

/** Did an away card show a debt (4.5): it printed the bank's take, or an agreement is open. */
export function awayShowsDebt(g: SalvageGame, card: Pick<AwayCard, 'bank'>): boolean {
  return (card.bank ?? 0) > 0 || !!g.salvage.bank.agreement;
}

/** The away bonus an away card would bring now (2.16): min(awayShare × (money − bank), awayCap_min of I), or 0. */
export function awayBonusOf(cfg: SalvageConfig, g: SalvageGame, card: Pick<AwayCard, 'money' | 'bank'>, I = ratedI(cfg, g)): number {
  const d = adsDef(cfg.salvage);
  if (!d) return 0;
  const reached = Math.max(0, roundMoney(card.money - (card.bank ?? 0)));
  return Math.max(0, Math.min(roundMoney(d.awayShare * reached), minutesOfI(d.awayCap_min, I)));
}

/**
 * The ads' part of closing an away card (after `iap.sessions2At` was decided): the offer of the away bonus,
 * or the same ads state. Offered only from the second session, after an absence of at least
 * `awayMinAbsence_min`, while today's awayUsed < awayPerDay, and for an amount above 0.
 */
export function awayOfferAfter(cfg: SalvageConfig, g: SalvageGame, card: AwayCard, absentS: number): AdsState {
  const d = adsDef(cfg.salvage);
  const a = g.salvage.ads;
  if (!d || !secondSession(g) || absentS < d.awayMinAbsence_min * 60) return a;
  if (adCounts(cfg.salvage, g).awayUsed >= d.awayPerDay || !dayRoom(cfg.salvage, g, 'away')) return a;
  const I = ratedI(cfg, g);
  const amount = awayBonusOf(cfg, g, card, I);
  if (amount <= 0) return a;
  return { ...rolled(cfg.salvage, g), awayOffer: { amount, I: roundMoney(I), centred: !awayShowsDebt(g, card) } };
}

/** The Sell a held bay would make now, as sell() checks it (the market time's day and price, the free grams in whole 0.1 kg), or null. */
export function sellNow(cfg: SalvageConfig, g: SalvageGame, grade: GradeId): SellShown | null {
  const b = g.salvage.bays[grade];
  if (!b || !b.held) return null;
  const grams = Math.floor(freeOf(b) / 100) * 100;
  if (grams <= 0) return null;
  const day = marketDay(cfg.salvage, g.salvage.clock.highMs);
  return { day, price: priceOf(cfg.salvage, grade, day), grams };
}

/**
 * The spot buyer's bonus on a Sell as shown: min(spotShare × the Sell's amount, spotCap_min of I), or 0. AN OFFER
 * TOO SMALL TO MATTER IS NOT MADE (s2c-fix-money M8): a bonus under `ads.minOffer_min` minutes of I is 0 (no
 * button, and adPaid refuses it).
 */
export function spotBonusOf(cfg: SalvageConfig, g: SalvageGame, shown: SellShown, I = ratedI(cfg, g)): number {
  const d = adsDef(cfg.salvage);
  if (!d) return 0;
  const x = Math.max(0, Math.min(roundMoney(d.spotShare * sellAmount(shown)), minutesOfI(d.spotCap_min, I)));
  const min = d.minOffer_min ?? 0;
  return min > 0 && x < minutesOfI(min, I) - 1e-9 ? 0 : x;
}

/**
 * What an ad of this kind would pay now (the button's figure), or null when none is offered: the away bonus's
 * standing offer while today's count allows it; the spot buyer on `ref.grade`'s held bay while today's count
 * allows it. Nothing before the second session.
 */
export function adOffer(cfg: SalvageConfig, g: SalvageGame, kind: AdKind, ref: { grade?: string } = {}): number | null {
  const d = adsDef(cfg.salvage);
  if (!d || !adsAllowed(cfg, g)) return null;
  const n = adCounts(cfg.salvage, g);
  if (kind === 'away') {
    const o = g.salvage.ads.awayOffer;
    return o && n.awayUsed < d.awayPerDay && dayRoom(cfg.salvage, g, 'away') ? o.amount : null;
  }
  if (!ref.grade || n.spotUsed >= d.spotPerDay || !dayRoom(cfg.salvage, g, 'spot')) return null;
  const shown = sellNow(cfg, g, ref.grade);
  if (!shown) return null;
  const x = spotBonusOf(cfg, g, shown);
  return x > 0 ? x : null;
}

/** The spot buyer's button beside a held bay's Sell (4.9): "Video · +§x" (or "Bonus · +§x" with No ad videos), carrying the Sell as shown; null when not offered. */
export function spotButton(cfg: SalvageConfig, g: SalvageGame, grade: GradeId): CardButton | null {
  const amount = adOffer(cfg, g, 'spot', { grade });
  const sell = sellNow(cfg, g, grade);
  if (amount === null || !sell) return null;
  return { label: { key: noVideo(g) ? 'card.ad.bonus' : 'card.ad.spot', args: { x: { money: amount } } }, action: { act: 'watchAd', kind: 'spot', amount, grade, sell }, refusal: null };
}

/** The away bonus card's data (4.9), or null when no offer stands: "+§x", Watch a video (or Take +§x with No ad videos). "Not now" is the sheet's own close (the offer stays). */
export function bonusCard(cfg: SalvageConfig, g: SalvageGame): BonusCard | null {
  const amount = adOffer(cfg, g, 'away');
  if (amount === null) return null;
  const video = !noVideo(g);
  return { kind: 'away', amount, video, take: { label: video ? { key: 'card.ad.video' } : { key: 'card.ad.take', args: { x: { money: amount } } }, action: { act: 'watchAd', kind: 'away', amount }, refusal: null }, later: null };
}

/**
 * The bottom bar's deferred away bonus (4.9: "+§x" with a play mark, reopening the card; no time): the
 * amount, or null when none stands. `debtOnScreen` (frameMoney.ts) hides it while a card or ticket that
 * shows a debt is up (P6); a financed plate in view does not (P7).
 */
export function deferredBonus(cfg: SalvageConfig, g: SalvageGame, debtOnScreen: boolean): number | null {
  if (debtOnScreen) return null;
  return adOffer(cfg, g, 'away');
}

/**
 * A rewarded ad watched to its end (or taken at once with No ad videos): pays the amount SHOWN through
 * credit(…, 'ad'), its own line, never a lot payment. Refusals (the SAME state): `nothing` before the second
 * session, with no offer of that kind, or when the figure shown is not the figure now (retry: the figure now);
 * `adCap` when today's count is used. The spot buyer makes its Sell first (actions.ts sell, as shown): a
 * refused Sell pays no bonus.
 */
export function payAd(cfg: SalvageConfig, g: SalvageGame, kind: AdKind, shownAmount: number, ref: { grade?: GradeId; sell?: SellShown }, clock: number, events: SalvageEvent[] | undefined, sell: (g: SalvageGame, grade: GradeId, shown: SellShown, ev: SalvageEvent[]) => SalvageGame): SalvageGame {
  const d = adsDef(cfg.salvage);
  const refuse = (key: 'nothing' | 'adCap', retry: BonusCard['take']['action'] | null = null) => {
    events?.push({ type: 'refused', key, args: {}, retry });
    return g;
  };
  if (!d || !adsAllowed(cfg, g)) return refuse('nothing');
  const n = adCounts(cfg.salvage, g);
  if (kind === 'away') {
    const o = g.salvage.ads.awayOffer;
    if (!o) return refuse('nothing');
    if (n.awayUsed >= d.awayPerDay || !dayRoom(cfg.salvage, g, 'away')) return refuse('adCap');
    if (Math.abs(o.amount - shownAmount) >= 0.005) return refuse('nothing', { act: 'watchAd', kind: 'away', amount: o.amount });
    const x = begin(cfg, g, events, true);
    const t = Math.max(clock, x.s.t);
    credit(x, o.amount, t, 'ad');
    const a = rolled(cfg.salvage, g);
    x.s.ads = { ...a, awayUsed: a.awayUsed + 1, awayOffer: null };
    x.ev.push({ type: 'adPaid', kind: 'away', amount: o.amount });
    return finish(g, x);
  }
  if (n.spotUsed >= d.spotPerDay || !dayRoom(cfg.salvage, g, 'spot')) return refuse('adCap');
  const grade = ref.grade;
  const shown = ref.sell;
  if (!grade || !shown) return refuse('nothing');
  const amount = spotBonusOf(cfg, g, shown);
  if (amount <= 0) return refuse('nothing');
  if (Math.abs(amount - shownAmount) >= 0.005) return refuse('nothing', { act: 'watchAd', kind: 'spot', amount, grade, sell: shown });
  const ev: SalvageEvent[] = [];
  const sold = sell(g, grade, shown, ev);
  if (sold === g) {
    for (const e of ev) events?.push(e);
    return g;
  }
  const x = begin(cfg, sold, events, true);
  for (const e of ev) x.ev.push(e);
  const t = Math.max(clock, x.s.t);
  credit(x, amount, t, 'ad');
  const a = rolled(cfg.salvage, sold);
  x.s.ads = { ...a, spotUsed: a.spotUsed + 1 };
  x.ev.push({ type: 'adPaid', kind: 'spot', amount });
  return finish(sold, x);
}

/** Minutes of I the day's ads may pay at most on a content (2.16: awayPerDay × awayCap_min + spotPerDay × spotCap_min). */
export function adDayMinutes(c: SalvageContent): number {
  const d = adsDef(c);
  return d ? d.awayPerDay * d.awayCap_min + d.spotPerDay * d.spotCap_min : 0;
}

/** The day's bound at rung r (2.16, fixed): maxDayShare × a day's income, in minutes of I (null where the content names no day for the rung). */
export function adDayLimitMinutes(c: SalvageContent, rung: number): number | null {
  const d = adsDef(c);
  const h = d?.dayHours_h[Math.max(1, Math.floor(rung)) - 1];
  return d && typeof h === 'number' ? d.maxDayShare * h * 60 : null;
}
