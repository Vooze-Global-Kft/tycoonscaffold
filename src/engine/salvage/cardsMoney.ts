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
 * the letter, which offers but owes nothing.
 *
 * WAVE 2 (rules-money, 26 Nov): the shop (ShopCard: looks, earned looks, No ad videos, the packs under
 * 2.15.3's four conditions, Restore, the age question due, the expired line), the pack sheet, the age
 * question, the code pad, the away bonus; and THE MONEY'S PART OF THE FIRST YARD'S CARDS (moneyOver, called
 * by cards.ts cardOf on every card it makes): `showsDebt` set on every card (the away card from its bank line
 * and an open agreement), the Shop row on the Rota and in Settings (from the second session, never for
 * u13), the Settings switch of packs, Help's pages on packs and the code (where the country's switch is on),
 * the price board's spot buyer beside a held bay's Sell. No card but the shop and the pack sheet carries a
 * real-money button; no card that shows a debt carries a shop entry or an ad button (4.1).
 */
import { bankDef, financeCheck, financeTerms, shareWords, shownOf } from './bank';
import { awayShowsDebt, bonusCard, spotButton } from './ads';
import { refusalTxt, topRungOf } from './ladder';
import { headroomU, ratedI, ageDue, blockingWait, countryOn, iapDef, lookProducts, MIN_YEAR, noAdsProduct, packProducts, packS, packsHelpShown, packsShown, packsSwitchShown, quoteCheck, secondSession, shopReachable, standingOf, standingS, yearOf } from './shop';
import type { AgreementRow, AwayCard, CardButton, CardContext, CardData, CardRef, CardRow, EarnedLookRow, FinanceTerms, LookSlot, PackRow, PlateId, SalvageConfig, SalvageGame, ShopCard, ShopLookRow, TextKey, Txt } from './types';

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
    ...(() => {
      const w = shareWords(c);
      return 'text' in w ? { shareWords: { key: w.text } } : {};
    })(),
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

// ============================================================================ the shop (4.8)

/** The earned looks (2.15.1, never sold): the sign style of each of the stage's rungs (3 to the top) and {foundry}'s plate once the supply deal's series is done. */
export function earnedLooks(cfg: SalvageConfig, g: SalvageGame): { id: string; slot: LookSlot; earned: boolean; opensAtRung: number | null }[] {
  const s = g.salvage;
  const out: { id: string; slot: LookSlot; earned: boolean; opensAtRung: number | null }[] = [];
  for (let n = 3; n <= topRungOf(cfg.salvage); n++) out.push({ id: `rung${n}`, slot: 'sign', earned: s.ladder.rung >= n, opensAtRung: s.ladder.rung >= n ? null : n });
  out.push({ id: 'foundry', slot: 'plaque', earned: s.deal.phase === 'done', opensAtRung: null });
  return out;
}

/** Can look `id` be used in `slot` (chooseLook): an owned product of `iap.lookOf` for that slot, or an earned look of that slot. */
export function lookUsable(cfg: SalvageConfig, g: SalvageGame, slot: LookSlot, id: string): boolean {
  const lk = iapDef(cfg.salvage)?.lookOf[id];
  if (lk) return lk.slot === slot && (g.entitlements?.products ?? []).includes(id);
  return earnedLooks(cfg, g).some((e) => e.id === id && e.slot === slot && e.earned);
}

/**
 * A pack's row (4.8) from the state at each read (B11): offer (Buy at the S now) while a quote may be made;
 * waiting / unconfirmed while a WAITING quote of it refuses Buy (its `wait` gives the words), or waiting while
 * `iap.maxStanding` quotes stand; noRoom ("Nothing to spend it on yet") above headroom. `updated` is the
 * screen's to keep from a quoteUpdated refusal while the card is open (null here).
 */
export function packRows(cfg: SalvageConfig, g: SalvageGame, now: number, ctx: CardContext): PackRow[] {
  const I = ratedI(cfg, g);
  const U = headroomU(cfg, g);
  return packProducts(cfg).map(({ product, H }) => {
    const S = packS(cfg, g, H, I);
    const ch = quoteCheck(cfg, g, product, null, now, ctx, I, U);
    if (ch.refusal?.key === 'packPending') {
      const w = blockingWait(g, product, now);
      return { product, H, S, state: w?.wait === 'unconfirmed' ? 'unconfirmed' : 'waiting', updated: null, button: null };
    }
    // join2b (the lead, 11:50): past its 24 hours a waiting quote no longer blocks Buy; while it stands the row says so.
    const also = standingOf(g, product).some((q) => q.state === 'waiting') ? { alsoWaiting: true as const } : {};
    if (ch.refusal) return { product, H, S, state: 'noRoom', ...also, updated: null, button: null };
    return { product, H, S, state: 'offer', ...also, updated: null, button: btn({ key: 'card.shop.buy' }, { act: 'buyPack', product, S }) };
  });
}

/** The shop's data (4.8), or null where the shop cannot be reached (before the second session; the band u13). */
export function shopOf(cfg: SalvageConfig, g: SalvageGame, now: number, ctx: CardContext): ShopCard | null {
  if (!shopReachable(g)) return null;
  const iap = g.salvage.iap;
  const owned = new Set(g.entitlements?.products ?? []);
  const looks: ShopLookRow[] = lookProducts(cfg).map(({ product, slot }) => {
    const has = owned.has(product);
    const inUse = iap.looks[slot] === product;
    return { product, slot, owned: has, inUse, button: inUse ? null : has ? btn({ key: 'card.shop.use' }, { act: 'chooseLook', slot, id: product }) : btn({ key: 'card.shop.buy' }, { act: 'buyProduct', product }) };
  });
  const earned: EarnedLookRow[] = earnedLooks(cfg, g).map((e) => {
    const inUse = iap.looks[e.slot] === e.id;
    return { id: e.id, slot: e.slot, earned: e.earned, inUse, opensAtRung: e.opensAtRung, button: e.earned && !inUse ? btn({ key: 'card.shop.use' }, { act: 'chooseLook', slot: e.slot, id: e.id }) : null };
  });
  const na = noAdsProduct(cfg);
  const noAdsOwned = !!g.entitlements?.skipRewarded || (na !== null && owned.has(na));
  return {
    looks,
    earned,
    noAds: na ? { product: na, owned: noAdsOwned, button: noAdsOwned ? null : btn({ key: 'card.shop.buy' }, { act: 'buyProduct', product: na }) } : null,
    packs: packsShown(cfg, g, ctx) ? packRows(cfg, g, now, ctx) : null,
    country: ctx.country,
    askAge: ageDue(cfg, g, ctx),
    expired: (iap.expired?.length ?? 0) > 0,
    restore: looks.length || na ? btn({ key: 'card.shop.restore' }, { act: 'restorePurchases' }) : null,
  };
}

/** The shop card (4.8): from the Rota's row and Settings only. Where it cannot be reached (u13, before the second session) it carries no shop data at all. */
export function shopCard(cfg: SalvageConfig, g: SalvageGame, now: number, ctx: CardContext): CardData {
  const shop = shopOf(cfg, g, now, ctx);
  return { kind: 'shop', shape: 'panel', title: { key: 'title.shop' }, lead: [], rows: [], foot: [], ...(shop ? { shop } : {}), showsDebt: false };
}

/** The pack sheet (4.8): "§{S} for this yard", the save's sentence, Buy at the S now (buyPack) and Not now; while the pack cannot be quoted, the refusal and no Buy. */
export function packSheetCard(cfg: SalvageConfig, g: SalvageGame, product: string, now: number, ctx: CardContext): CardData {
  const base: CardData = { kind: 'packSheet', shape: 'centred', title: { key: 'title.packSheet' }, lead: [], rows: [], foot: [], showsDebt: false };
  const row = packsShown(cfg, g, ctx) ? packRows(cfg, g, now, ctx).find((r) => r.product === product) : undefined;
  const notNow = btn({ key: 'card.notNow' }, { act: 'open', card: { kind: 'shop' } });
  if (!row || row.state !== 'offer' || !row.button) {
    const ch = quoteCheck(cfg, g, product, null, now, ctx);
    return { ...base, lead: ch.refusal ? [{ key: `refusal.${ch.refusal.key}` as TextKey, args: ch.refusal.args }] : [], foot: shopReachable(g) ? [notNow] : [] };
  }
  const buy = btn({ key: 'card.buy' }, { act: 'buyPack', product, S: row.S });
  return { ...base, lead: [{ key: 'card.packSheet.amount', args: { x: { money: row.S } } }, { key: 'card.packSheet.save' }], packSheet: { product, S: row.S, H: row.H, buy, notNow }, foot: [buy, notNow] };
}

/** The age question (4.8): four digits, no default; OK only for a year in [1900, this year]. Its data only while it is due to be asked (no band kept, the shop reachable). */
export function ageQuestionCard(g: SalvageGame, now: number): CardData {
  const base: CardData = { kind: 'ageQuestion', shape: 'centred', title: { key: 'title.ageQuestion' }, lead: [], rows: [], foot: [], showsDebt: false };
  if (g.salvage.iap.ageBand !== null || !shopReachable(g)) return base;
  return { ...base, ageQuestion: { minYear: MIN_YEAR, maxYear: yearOf(now) } };
}

/** The code pad (4.8): "Choose a four-digit code" / "Enter it again" / "Enter the code"; `wrong` is the screen's after a packCode refusal. Its data only where the Settings switch stands. */
export function packCodeCard(cfg: SalvageConfig, g: SalvageGame, mode: 'set' | 'confirm' | 'enter', ctx: CardContext): CardData {
  const base: CardData = { kind: 'packCode', shape: 'centred', title: { key: 'title.packCode' }, lead: [{ key: mode === 'set' ? 'card.code.set' : mode === 'confirm' ? 'card.code.confirm' : 'card.code.enter' }], rows: [], foot: [], showsDebt: false };
  return packsSwitchShown(cfg, g, ctx) ? { ...base, packCode: { mode, wrong: false } } : { ...base, lead: [] };
}

/** The away bonus card (4.9): "For your time away" / "+§{x}" / Watch a video (or Take +§x); its data only while an offer stands that today's count allows. */
export function awayBonusCard(cfg: SalvageConfig, g: SalvageGame): CardData {
  const bonus = bonusCard(cfg, g);
  const base: CardData = { kind: 'awayBonus', shape: 'centred', title: { key: 'title.awayBonus' }, lead: [], rows: [], foot: [], showsDebt: false };
  if (!bonus) return base;
  return { ...base, lead: [{ key: 'card.ad.amount', args: { x: { money: bonus.amount } } }], bonus, foot: [bonus.take] };
}

// ============================================================================ the away card's new lines (2.17, 4.5)

/** The away card's money lines (2.14.4, 2.17) as the absence applied them, and whether it shows a debt. Null without an away card. */
export interface AwayMoneyView {
  /** "To [bank]: §y": the sum the bank took (null: none taken, no line). */
  bank: number | null;
  /** "Repaid in full: {plate}", one line each. */
  repaid: PlateId[];
  /** "Sold at the gate: {n} · §x" (null: none). */
  rack: { n: number; money: number } | null;
  /** "[reclamation dealer]: §x" (null: none). */
  van: { n: number; money: number } | null;
  /** "{n} oversize pieces wait for you" (null: none). */
  lotsWaiting: number | null;
  /** The card shows a debt (its bank line, or an agreement open): no ad and no shop on it; no centred bonus after it (P6). */
  showsDebt: boolean;
}

export function awayMoneyView(cfg: SalvageConfig, g: SalvageGame): AwayMoneyView | null {
  void cfg;
  const a = g.salvage.away;
  if (!a) return null;
  return {
    bank: (a.bank ?? 0) > 0 ? a.bank! : null,
    repaid: [...(a.repaid ?? [])],
    rack: a.rack && a.rack.n > 0 ? { ...a.rack } : null,
    van: a.van && a.van.n > 0 ? { ...a.van } : null,
    lotsWaiting: (a.lotsWaiting ?? 0) > 0 ? a.lotsWaiting! : null,
    showsDebt: awayShowsDebt(g, a),
  };
}

// ============================================================================ the money's part of every card

const MONEY_ROW = 'money.';
const navRow = (id: string, name: Txt, card: CardRef): CardRow => ({ id: MONEY_ROW + id, name, line: null, button: btn({ key: 'open' }, { act: 'open', card }), icon: null, state: 'info' });

/**
 * The money's part of a card cards.ts made (called by cardOf on every card; idempotent: the rows it adds are
 * replaced, never added twice). `showsDebt` is set on every card (4.1.3): the away card from its own bank
 * line and an open agreement, every other card as its maker set it, else false. The Rota and Settings gain
 * the Shop row from the second session, never for u13 (4.8); Settings the packs switch (2.15.3); Help the
 * pages on packs and the code where the country's switch is on (P13); the price board the spot buyer beside a
 * held bay's Sell (4.9, 4.11). Nothing of it on a card that shows a debt.
 */
export function moneyOver(cfg: SalvageConfig, g: SalvageGame, card: CardData, now: number, ctx: CardContext): CardData {
  void now;
  let showsDebt = card.showsDebt ?? false;
  if (card.kind === 'away' && card.away) showsDebt = awayShowsDebt(g, card.away as AwayCard);
  const out: CardData = { ...card, showsDebt };
  if (showsDebt) return out;
  const rows = card.rows.filter((r) => !r.id.startsWith(MONEY_ROW));
  // owner1 S1: a build of release.stage 1 has no shop (its content carries no `iap`): no Shop row anywhere.
  const shopRow = shopReachable(g) && !!iapDef(cfg.salvage);
  if (card.kind === 'rota') {
    out.rows = shopRow ? [...rows, navRow('shop', { key: 'card.shop.row' }, { kind: 'shop' })] : rows;
  } else if (card.kind === 'settings') {
    const add: CardRow[] = [];
    if (shopRow) add.push(navRow('shop', { key: 'card.shop.row' }, { kind: 'shop' }));
    if (packsSwitchShown(cfg, g, ctx)) {
      const hidden = !!g.salvage.iap.hidden;
      const name: Txt = { key: hidden ? 'clip.packsHidden' : 'clip.packsShown' };
      add.push({ id: MONEY_ROW + 'packs', name, line: null, button: btn(name, { act: 'setPacksHidden', on: !hidden }), icon: null, state: 'info' });
    }
    out.rows = [...rows, ...add];
  } else if (card.kind === 'help') {
    const add: CardRow[] = packsHelpShown(cfg, g, ctx)
      ? [
          { id: MONEY_ROW + 'packs', name: { key: 'help.packs' }, line: { key: 'help.packsBody' }, button: null, icon: null, state: 'info' },
          { id: MONEY_ROW + 'code', name: { key: 'help.code' }, line: { key: 'help.codeBody' }, button: null, icon: null, state: 'info' },
          { id: MONEY_ROW + 'packLost', name: { key: 'help.packLost' }, line: null, button: null, icon: null, state: 'info' },
        ]
      : [];
    out.rows = [...rows, ...add];
  } else if (card.kind === 'board' && card.board) {
    out.board = { ...card.board, rows: card.board.rows.map((r) => ({ ...r, spot: r.sell ? spotButton(cfg, g, r.grade) : null })) };
  }
  return out;
}

/** "Start the yard again"'s confirming card says that bought scrip and waiting purchases go with the yard (P16): from the second session (where anything could have been bought). */
export function restartPackLost(g: SalvageGame): boolean {
  return secondSession(g);
}

/** Whether packs could ever show for this store country (Help, Settings: the country's switch, 2.15.3). */
export { countryOn, standingOf, standingS };

/** A card of the money (cards.ts cardOf for MONEY_CARD_KINDS and {office, agreements}). */
export function cardOfMoney(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, ctx: CardContext): CardData {
  switch (ref.kind) {
    case 'office':
      return agreementsCard(cfg, g);
    case 'finance':
      return financeCard(cfg, g, ref.plate);
    case 'letter':
      return letterCard(cfg);
    case 'shop':
      return shopCard(cfg, g, now, ctx);
    case 'packSheet':
      return packSheetCard(cfg, g, ref.product, now, ctx);
    case 'ageQuestion':
      return ageQuestionCard(g, now);
    case 'packCode':
      return packCodeCard(cfg, g, ref.mode, ctx);
    case 'awayBonus':
      return awayBonusCard(cfg, g);
    default:
      return { kind: ref.kind as CardData['kind'], shape: 'panel', title: { key: `title.${ref.kind}` as TextKey }, lead: [], rows: [], foot: [], showsDebt: false };
  }
}
