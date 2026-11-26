/**
 * THE MONEY'S CARDS (stage 2, yard-stage2.md 4.5, 4.8, 4.9): the finance card, the lender's letter, the
 * office's Agreements tab, the shop, the pack sheet, the age question, the code pad, the away bonus, and the
 * away card's new lines. Owner: rules-money (Phase B). cards.ts `cardOf` dispatches these card kinds here
 * (s2a-fix, the lead's ruling of 26 Nov 09:50).
 *
 * THE STORE COUNTRY is not in the state: the screen reads it at each opening (src/services/region.ts
 * `storefrontCountry()`) and hands it in `ctx` (types.ts CardContext); the rules decide from it and the state
 * whether packs show (2.15.3: rung, country, age band, hidden). Phase B pins it with a u13 test and an
 * unknown-country test.
 *
 * WAVE 1 (rules-money, 26 Nov): the bank's cards are built: the finance card (FinanceTerms, the terms now,
 * the sign button carrying them as shown, the first refusal that stands), the lender's letter, the
 * Agreements tab (open row first, then the history). Every card of the bank shows a debt (showsDebt) except
 * the letter, which offers but owes nothing. The shop, the pack sheet, the age question, the code pad and the
 * away bonus are wave 2's: they are still a card with its title and nothing else.
 */
import { bankDef, financeCheck, financeTerms, shareWords, shownOf } from './bank';
import { refusalTxt } from './ladder';
import type { AgreementRow, CardButton, CardContext, CardData, CardRef, FinanceTerms, SalvageConfig, SalvageGame, TextKey, Txt } from './types';

const btn = (label: Txt, action: CardButton['action'], refusal: Txt | null = null): CardButton => ({ label, action, refusal });
const plateName = (plate: string): Txt['args'] => ({ plate: { text: `title.works.${plate}` as TextKey } });

/** The finance card (4.5, 2.14.3, 2.14.5): the terms now, Sign carrying them as shown, Not now back to the works card. */
export function financeCard(cfg: SalvageConfig, g: SalvageGame, plate: string): CardData {
  const c = cfg.salvage;
  const tm = financeTerms(cfg, g, plate);
  const ch = financeCheck(cfg, g, plate, null);
  const refusal = refusalTxt(ch);
  const notNow = btn({ key: 'card.notNow' }, { act: 'open', card: { kind: 'works', plate } });
  const base: CardData = { kind: 'finance', shape: 'centred', title: { key: 'title.finance', args: plateName(plate) }, lead: [], rows: [], foot: [notNow], showsDebt: true };
  if (!tm) return { ...base, lead: refusal ? [refusal] : [] };
  const share = bankDef(c)?.share ?? 0;
  const finance: FinanceTerms = {
    plate,
    P: tm.P,
    deposit: tm.d,
    F: tm.F,
    charge: tm.charge,
    T: tm.T,
    share,
    shareWords: { key: 'card.letter.rule', args: { share: shareWords(c) } },
    I: tm.I,
    sign: btn({ key: 'card.sign' }, { act: 'signFinance', plate, shown: shownOf(tm) }, refusal),
    notNow,
    refusal,
  };
  const rule: Txt = { key: 'card.finance.rule', args: { share: shareWords(c), x: { money: tm.T } } };
  return { ...base, lead: [rule], finance, foot: [finance.sign, notNow] };
}

/** The lender's letter (4.5, 2.14.5): a centred card, once; it lends, it does not owe (no debt shown). */
export function letterCard(cfg: SalvageConfig): CardData {
  const c = cfg.salvage;
  return {
    kind: 'letter',
    shape: 'centred',
    title: { key: 'title.letter', args: { bank: { name: 'bank' } } },
    lead: [{ key: 'card.letter.lend' }, { key: 'card.letter.split' }, { key: 'card.letter.rule', args: { share: shareWords(c) } }],
    rows: [],
    foot: [btn({ key: 'ok' }, { act: 'open', card: { kind: 'office', tab: 'agreements' } })],
    showsDebt: false,
  };
}

/** The Agreements page's rows (4.5): the open agreement first, then the history, newest first. */
export function agreementRows(cfg: SalvageConfig, g: SalvageGame): AgreementRow[] {
  const share = bankDef(cfg.salvage)?.share ?? 0;
  const b = g.salvage.bank;
  const rows: AgreementRow[] = [];
  const a = b.agreement;
  if (a) rows.push({ kind: 'bank', lender: 'bank', plate: a.plate, T: a.T, taken: a.taken, left: Math.max(0, Math.round((a.T - a.taken) * 100) / 100), share, signedAt: a.signedAt, repaidAt: null, open: true });
  for (let i = b.done.length - 1; i >= 0; i--) {
    const d = b.done[i];
    rows.push({ kind: 'bank', lender: 'bank', plate: d.plate, T: d.T, taken: d.T, left: 0, share, signedAt: d.signedAt, repaidAt: d.repaidAt, open: false });
  }
  return rows;
}

const OFFICE_TABS4: CardData['tabs'] = (['rota', 'partners', 'processBoard', 'agreements'] as const).map((tab) => ({
  ref: { kind: 'office', tab },
  title: { key: (tab === 'rota' ? 'title.rota' : tab === 'partners' ? 'title.partners' : tab === 'processBoard' ? 'title.processBoard' : 'title.agreements') as TextKey },
  open: tab === 'agreements',
}));

/** The office's Agreements tab (4.5): it shows a debt (showsDebt) whether or not one is open. */
export function agreementsCard(cfg: SalvageConfig, g: SalvageGame): CardData {
  const agreements = agreementRows(cfg, g);
  return { kind: 'agreements', shape: 'panel', title: { key: 'title.agreements' }, lead: agreements.some((r) => r.open) ? [] : [{ key: 'card.agreements.none' }], rows: [], foot: [], tabs: OFFICE_TABS4, agreements, showsDebt: true };
}

/** The card kinds this file answers (cards.ts dispatches them, and the office's Agreements tab). */
export const MONEY_CARD_KINDS = ['finance', 'letter', 'shop', 'packSheet', 'ageQuestion', 'packCode', 'awayBonus'] as const;

/** A card of the money (cards.ts cardOf for MONEY_CARD_KINDS and {office, agreements}). Stub: the title only. */
export function cardOfMoney(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, ctx: CardContext): CardData {
  void now;
  void ctx;
  if (ref.kind === 'office') return agreementsCard(cfg, g);
  if (ref.kind === 'finance') return financeCard(cfg, g, ref.plate);
  if (ref.kind === 'letter') return letterCard(cfg);
  // Wave 2 (the shop, ads, the away bonus): the title only.
  return { kind: ref.kind as CardData['kind'], shape: ref.kind === 'shop' ? 'panel' : 'centred', title: { key: `title.${ref.kind}` as TextKey }, lead: [], rows: [], foot: [] };
}
