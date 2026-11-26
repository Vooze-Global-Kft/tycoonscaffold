/**
 * PLANT FINANCE (stage 2, docs/design/yard-stage2.md 2.14; rulings 3 as corrected by 11; E37, E41). Owner:
 * rules-money. One agreement at a time, repaid ONLY as a share of EVERY lot payment, no date, nothing that
 * grows, no button to repay, cash never below zero.
 *
 * THE CALL SITES (the closed list of 2.14.4; every lot payment, nothing else): the loop calls
 * `payLot(x, gross, t)` at the payment's site BEFORE its ticket prints, puts `bank: {y}` on the ticket when
 * y > 0, then `clock.ts bankPart(x, y)` (the away card's gross money and bank line), then `clock.ts
 * earn(x, z, t)` with the player's part z (the call site earns, not payLot). Sites: round.ts roundEvent
 * (the merchant's collection, Sell's set-aside lots included), deal.ts dealDeliver (a supply deal's
 * delivery); rules-works' crate.ts (a thing sorted at the picking table) and reuse.ts (a sale at the gate,
 * the van's collection) follow the same four lines. Ad rewards and granted scrip never come here:
 * `clock.ts credit(x, amount, t, kind)`. payLot never touches `x.away.money` (bankPart does).
 *
 * THE RULE AS BUILT (rules-money, 26 Nov):
 * 1. The terms are read from the state at each read (B11): I = rated income of the state's content
 *    (layer.ts contentAt), tau_r = content `tau_h[rung - 1]`; F_max = min(bank.maxF_h, bank.maxF_tau x tau_r) x I;
 *    F = roundMoney(min(bank.maxShare x P, F_max)); d = P - F; charge = roundMoney(bank.charge x F); T = F + charge.
 * 2. A plate is financeable when its content flag `financeable` is true, its rung has a tau (rungs 1 and 2
 *    have none: so "from rung 3" is the content's, not a number here), P >= bank.minPrice_h x I and F > 0.
 * 3. payLot: y = the agreements' split of roundMoney(bank.share x gross), oldest first, each at most what it
 *    has left (`bankSplit`); taken += y; event `bankTaken`; at taken = T the agreement closes into `done`
 *    (event `repaid`, and the plate on the away card's `repaid` list while away).
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { reserve } from './advice';
import { heard, type Ctx } from './clock';
import { cashRefusal, ceilingRefusal, gateRefusal, shopItem } from './ladder';
import { contentAt } from './layer';
import { roundMoney } from './money';
import { ratedTerms } from './rate';
import type { Agreement, CardButton, FinanceShown, PayLotResult, PlateId, RefusalKey, SalvageConfig, SalvageGame, TextKey, Txt, TxtArgs } from './types';

/** At most this many repaid agreements are kept for the Agreements page's history (bounded state; state2Money.ts repairs to the same). */
export const MAX_DONE = 64;

/** The content's bank block, or null (the first yard's test content has none: nothing is financed). */
export function bankDef(c: SalvageContent): NonNullable<SalvageContent['bank']> | null {
  return c.bank ?? null;
}

/** tau_r, the payback hours of rung r (content `tau_h`), or null (rungs 1 and 2, or a content without it). */
export function tauOf(c: SalvageContent, rung: number): number | null {
  const v = c.tau_h?.[Math.max(1, Math.floor(rung)) - 1];
  return typeof v === 'number' && v > 0 ? v : null;
}

/** I and G_r of a state, § an hour: rated income (net) and rated gross sales (2.3.1; E9), on the state's content. */
export function ratedIG(cfg: SalvageConfig, g: SalvageGame): { I: number; G: number } {
  const t = ratedTerms(contentAt(cfg.salvage, g.salvage), g.salvage);
  return { I: Math.max(0, t.I), G: Math.max(0, t.sales) };
}

/** The finance terms of one plate (2.14.3), all in §: what the finance card prints and signFinance applies. */
export interface Terms {
  plate: PlateId;
  P: number;
  F: number;
  /** The deposit, d = P - F. */
  d: number;
  charge: number;
  T: number;
  /** I read now. */
  I: number;
  share: number;
}

/**
 * The terms of a plate at price P with rated income I on rung `rung` (pure arithmetic of 2.14.3), or null
 * when the plate is not financeable (2.14.2: its flag, a tau for the rung, P >= minPrice_h x I, F > 0).
 */
export function termsAt(c: SalvageContent, plate: PlateId, P: number, I: number, rung: number): Terms | null {
  const b = bankDef(c);
  const def = c.works?.plates[plate];
  const tau = tauOf(c, rung);
  if (!b || !def || def.financeable !== true || tau === null || !(I > 0)) return null;
  if (P < b.minPrice_h * I - 1e-9) return null;
  const Fmax = Math.min(b.maxF_h, b.maxF_tau * tau) * I;
  const F = roundMoney(Math.min(b.maxShare * P, Fmax));
  if (!(F > 0)) return null;
  const charge = roundMoney(b.charge * F);
  return { plate, P: roundMoney(P), F, d: roundMoney(P - F), charge, T: roundMoney(F + charge), I: roundMoney(I), share: b.share };
}

/** A plate's price while it is FOR SALE (not bought, its gate met), or null. Plates live in `works`, never in `owned` (2.18). */
export function platePrice(cfg: SalvageConfig, g: SalvageGame, plate: PlateId): number | null {
  const c = contentAt(cfg.salvage, g.salvage);
  const it = shopItem(c, plate);
  if (!it || it.kind !== 'works' || g.salvage.works[plate] || !c.works?.plates[plate]) return null;
  if (gateRefusal(c, g, it.gate)) return null;
  const needs = c.works.plates[plate].needs;
  if (needs && !g.salvage.works[needs]) return null;
  return roundMoney(it.price);
}

/** The terms of a plate now (2.14.3), or null when it is not for sale or not financeable. */
export function financeTerms(cfg: SalvageConfig, g: SalvageGame, plate: PlateId): Terms | null {
  const P = platePrice(cfg, g, plate);
  if (P === null) return null;
  return termsAt(contentAt(cfg.salvage, g.salvage), plate, P, ratedIG(cfg, g).I, g.salvage.ladder.rung);
}

/** What the player may spend before the driver's next load (E19, E29): cash less the reserve. */
export function spendable(cfg: SalvageConfig, g: SalvageGame): number {
  return roundMoney(g.cash - reserve(cfg, g));
}

/** Is the lender's letter due on reading this plate's works card (2.14.5): not yet seen, a financeable plate, P > cash - reserve and cash - reserve >= d. */
export function letterDue(cfg: SalvageConfig, g: SalvageGame, plate: PlateId): boolean {
  if (g.salvage.bank.letterSeen) return false;
  const tm = financeTerms(cfg, g, plate);
  if (!tm) return false;
  const room = spendable(cfg, g);
  return tm.P > room + 1e-9 && room >= tm.d - 1e-9;
}

/**
 * Is the Bank loan OFFERED on this plate's works card (2.14.5, P12; the bots' "offer", E8): the letter seen,
 * the plate financeable and P > cash - reserve. (Whether it is pressable is `loanFoot`'s.)
 */
export function loanOffered(cfg: SalvageConfig, g: SalvageGame, plate: PlateId): boolean {
  if (!g.salvage.bank.letterSeen) return false;
  const tm = financeTerms(cfg, g, plate);
  return !!tm && tm.P > spendable(cfg, g) + 1e-9;
}

/**
 * "Save up (about x)" in seconds (2.14.5, E9): (P - cash) / I hours, and while an agreement is open
 * (P - cash) / (I - bank.share x G_r), G_r the rated gross an hour. Null when P <= cash or the rate is not positive.
 */
export function saveUpSeconds(cfg: SalvageConfig, g: SalvageGame, P: number): number | null {
  const need = P - g.cash;
  if (!(need > 0)) return null;
  const { I, G } = ratedIG(cfg, g);
  const b = bankDef(contentAt(cfg.salvage, g.salvage));
  const rate = g.salvage.bank.agreement && b ? I - b.share * G : I;
  if (!(rate > 0)) return null;
  return (3600 * need) / rate;
}

/**
 * THE WORKS CARD'S FOOT for the bank (2.14.5; WorksCard.foot's loan, loanShort, saveUp_s): rules-works'
 * cardsWorks.ts copies these three fields. `loan` only while offered (loanOffered); greyed with bankOne's
 * words while an agreement is open, else with "You pay now §d · §x more" while cash - reserve < d; the
 * button opens the finance card. `saveUp_s` beside it while the plate costs more than the cash in hand.
 */
export function loanFoot(cfg: SalvageConfig, g: SalvageGame, plate: PlateId): { loan: CardButton | null; loanShort: { d: number; more: number } | null; saveUp_s: number | null } {
  const P = platePrice(cfg, g, plate);
  const saveUp_s = P === null ? null : saveUpSeconds(cfg, g, P);
  if (!loanOffered(cfg, g, plate)) return { loan: null, loanShort: null, saveUp_s };
  const tm = financeTerms(cfg, g, plate)!;
  const room = spendable(cfg, g);
  let refusal: Txt | null = null;
  let loanShort: { d: number; more: number } | null = null;
  if (g.salvage.bank.agreement) refusal = { key: 'refusal.bankOne' };
  else if (room < tm.d - 1e-9) {
    loanShort = { d: tm.d, more: roundMoney(tm.d - room) };
    refusal = { key: 'card.works.loanShort', args: { d: { money: tm.d }, x: { money: loanShort.more } } };
  }
  return { loan: { label: { key: 'card.works.loan' }, action: { act: 'open', card: { kind: 'finance', plate } }, refusal }, loanShort, saveUp_s };
}

/** The works card's "Bank loan · §left left of §T" row and the ring's share (taken / T), for the financed plate; else null. */
export function bankRow(g: SalvageGame, plate: PlateId): { left: number; T: number; ring: number } | null {
  const a = g.salvage.bank.agreement;
  if (!a || a.plate !== plate) return null;
  return { left: roundMoney(a.T - a.taken), T: a.T, ring: a.T > 0 ? Math.min(1, a.taken / a.T) : 1 };
}

/** The share in the card's words (content `bank.shareWords`: "A fifth" at 0.2 is the text key share.fifth; else a percentage). */
export function shareWords(c: SalvageContent, mid = false): { text: TextKey } | { pct: number } {
  const b = bankDef(c);
  if (b && Math.abs(b.share - 0.2) < 1e-9) return { text: (mid ? 'share.fifthIn' : 'share.fifth') as TextKey };
  return { pct: b?.share ?? 0 };
}

// ============================================================================ signing (2.14.3's checks)

/** The first refusal signFinance would give now for terms `shown` (2.14.3's order), or null. `terms` the terms now. */
export function financeCheck(cfg: SalvageConfig, g: SalvageGame, plate: PlateId, shown: FinanceShown | null): { refusal: { key: RefusalKey; args: TxtArgs } | null; terms: Terms | null } {
  const c = contentAt(cfg.salvage, g.salvage);
  const s = g.salvage;
  const it = shopItem(c, plate);
  const def = c.works?.plates[plate];
  if (s.bank.agreement) return { refusal: { key: 'bankOne', args: {} }, terms: null };
  if (!it || it.kind !== 'works' || !def) return { refusal: { key: 'notFinanceable', args: {} }, terms: null };
  if (s.works[plate]) return { refusal: { key: 'owned', args: {} }, terms: null };
  const gate = gateRefusal(c, g, it.gate);
  if (gate) return { refusal: gate, terms: null };
  if (def.needs && !s.works[def.needs]) return { refusal: { key: 'needsItem', args: { item: { text: `title.works.${def.needs}` as TextKey } } }, terms: null };
  const terms = financeTerms(cfg, g, plate);
  // Not financeable, the letter not yet seen, or a price the player can pay outright (P12: no loan is offered then).
  if (!terms || !s.bank.letterSeen || terms.P <= spendable(cfg, g) + 1e-9) return { refusal: { key: 'notFinanceable', args: {} }, terms };
  const res = reserve(cfg, g);
  if (terms.d <= g.cash + 1e-9 && g.cash - terms.d < res - 1e-9) return { refusal: { key: 'bankReserve', args: { x: { money: res } } }, terms };
  const money = cashRefusal(g, terms.d);
  if (money) return { refusal: money, terms };
  const after = { ...g, salvage: { ...s, works: { ...s.works, [plate]: { plate } as unknown as SalvageGame['salvage']['works'][string] } } };
  const ceil = ceilingRefusal(cfg, g, after);
  if (ceil) return { refusal: ceil, terms };
  if (shown && !sameTerms(shown, terms)) return { refusal: { key: 'bankTerms', args: {} }, terms };
  return { refusal: null, terms };
}

/** The four numbers a finance card shows, equal to the cent. */
export function sameTerms(a: FinanceShown, b: Pick<Terms, 'P' | 'F' | 'charge' | 'T'>): boolean {
  const eq = (u: number, v: number) => Math.abs(u - v) < 0.005;
  return eq(a.P, b.P) && eq(a.F, b.F) && eq(a.charge, b.charge) && eq(a.T, b.T);
}

/** The terms as a finance card shows them (what signFinance carries). */
export function shownOf(t: Terms): FinanceShown {
  return { P: t.P, F: t.F, charge: t.charge, T: t.T };
}

/** The agreement signed at yard second t on terms `tm` (2.14.1; the I read at signing frozen in it). */
export function agreementOf(tm: Terms, t: number): Agreement {
  return { kind: 'bank', plate: tm.plate, P: tm.P, F: tm.F, c: tm.charge, T: tm.T, taken: 0, signedAt: t, I: tm.I };
}

// ============================================================================ repayment (2.14.4)

/**
 * THE SPLIT (2.14.4, ruling 11.2): the bank's parts of one payment of `gross` over agreements oldest first.
 * All together never take more than roundMoney(share x gross); each takes at most what it has left (T - taken).
 * Stage 2 passes at most one agreement (bank.maxAgreements 1); stage 3 adds kinds, not a path.
 */
export function bankSplit(gross: number, agreements: readonly Pick<Agreement, 'T' | 'taken'>[], share: number): number[] {
  let cap = Math.max(0, roundMoney(share * gross));
  return agreements.map((a) => {
    const y = Math.max(0, Math.min(cap, roundMoney(a.T - a.taken)));
    cap = roundMoney(cap - y);
    return y;
  });
}

/** Split one lot payment of `gross` § at yard second t: y to the bank (taken now, the agreement closed at T), z = gross - y to the player. */
export function payLot(x: Ctx, gross: number, t: number): PayLotResult {
  const bank = x.s.bank;
  const a = bank?.agreement;
  const b = bankDef(x.c);
  if (!a || !b || !(gross > 0)) return { y: 0, z: gross };
  const [y] = bankSplit(gross, [a], b.share);
  if (!(y > 0)) return { y: 0, z: gross };
  a.taken = roundMoney(a.taken + y);
  if (heard(x)) x.ev.push({ type: 'bankTaken', y, taken: a.taken, T: a.T });
  if (a.taken >= a.T - 1e-9) {
    a.taken = a.T;
    bank.done.push({ plate: a.plate, T: a.T, signedAt: a.signedAt, repaidAt: t });
    if (bank.done.length > MAX_DONE) bank.done.splice(0, bank.done.length - MAX_DONE);
    bank.agreement = null;
    if (x.away) x.away.repaid.push(a.plate);
    x.ev.push({ type: 'repaid', plate: a.plate });
  }
  return { y, z: roundMoney(gross - y) };
}
