/**
 * SAMPLE CARD DATA FOR STAGE 2'S CARDS (contract version 3; label contract2). HAND-WRITTEN SAMPLES, NOT
 * RULES: every number here is the specification's worked example (yard-stage2.md 2.14.6, 4.3, 4.5, 4.6,
 * 4.8, 4.9, at the ruling's I of §54,500 an hour), typed in by hand so that the screens (Phase C) can be
 * drawn before the rules exist (Phase B). Every card carries `sample: true`; `cardOf` never returns these.
 * Nothing in the app may import this file except a development view (the preview's card list).
 *
 * The text keys these samples name are the keys the specification's 5.3 asks of `strings2`
 * (SAMPLE_TEXT_KEYS lists them); until strings2 has added a key, `say()` cannot print it, so a screen
 * drawing a sample before then shows its title missing. Text keys are typed loosely here only (`k()`).
 */
import type {
  AgeQuestionCard,
  AgreementRow,
  BonusCard,
  CardButtonV3,
  CardData,
  CardRefAll,
  CrateCard,
  FinanceTerms,
  LotCard,
  PackCodeCard,
  PackSheetCard,
  ShopCard,
  TextKey,
  Txt,
  TxtArgs,
  AwayCard,
  WorksCard,
  YardSaleCard,
} from './types';
import { CARD_KINDS_V3 } from './types';

type SampleKind = (typeof CARD_KINDS_V3)[number];

/** The text keys the samples name (5.3's families): strings2 adds each one; contract.test.ts prints those still missing. */
export const SAMPLE_TEXT_KEYS = [
  'title.works.baler',
  'title.works.shear',
  'title.finance',
  'title.letter',
  'title.agreements',
  'title.yardSale',
  'title.lot',
  'title.crate',
  'title.shop',
  'title.packSheet',
  'title.ageQuestion',
  'title.packCode',
  'title.awayBonus',
  'card.works.loan',
  'card.works.saveUp',
  'card.works.loanShort',
  'card.finance.rule',
  'card.shop.use',
  'card.shop.inUse',
  'card.shop.buy',
  'card.shop.packLine',
  'card.ad.video',
  'card.ad.take',
  'card.buy',
  'card.level',
  'card.sign',
  'card.notNow',
  'refusal.cash',
  'share.fifth',
  'away.bank',
  'away.repaid',
] as const;

/** A line by key, typed loosely (samples only: the key may not exist yet, see the header). */
const k = (key: (typeof SAMPLE_TEXT_KEYS)[number], args?: TxtArgs): Txt => ({ key: key as TextKey, ...(args ? { args } : {}) });
const btn = (label: Txt, action: CardButtonV3['action'], refusal: Txt | null = null): CardButtonV3 => ({ label, action, refusal });

/** The baler at rung 3 (4.3's worked example), buyable with cash: no loan offered (it is under the finance floor). */
export function sampleWorksCard(): WorksCard {
  return {
    plate: 'baler',
    kind: 'rate',
    state: 'buyable',
    gate: null,
    in: ['li'],
    out: ['lib'],
    gain: { from: 'li', pct: 0.24 },
    chip: null,
    arrivesAt: null,
    commission_s: 5,
    selfStartAt: null,
    level: null,
    foot: { buy: btn(k('card.buy', { x: { money: 9000 } }), { act: 'buy', item: 'baler', price: 9000 }), loan: null, loanShort: null, saveUp_s: null },
    bank: null,
  };
}

/** A financeable plate at §80,000 with §18,000 in hand and a reserve of §958 (4.3): Buy greyed, Bank loan, Save up about 1 h 8 m. */
export function sampleWorksLoanCard(): WorksCard {
  return {
    ...sampleWorksCard(),
    plate: 'shear',
    in: ['hmsu'],
    out: ['hms'],
    gain: { from: 'hmsu', pct: 0.2 },
    foot: {
      buy: btn(k('card.buy', { x: { money: 80000 } }), { act: 'buy', item: 'shear', price: 80000 }, k('refusal.cash', { x: { money: 62000 } })),
      loan: btn(k('card.works.loan'), { act: 'open', card: { kind: 'finance', plate: 'shear' } }),
      loanShort: null,
      // (80,000 − 18,000) ÷ 54,500 an hour = 1.138 h: "about 1 h 8 m".
      saveUp_s: Math.round(((80000 - 18000) / 54500) * 3600),
    },
  };
}

/** The finance card of 2.14.6: Price §80,000 · You pay now §16,000 · The bank pays §64,000 · Charge §5,120 · You repay §69,120. */
export function sampleFinance(): FinanceTerms {
  const shown = { P: 80000, F: 64000, charge: 5120, T: 69120 };
  return {
    plate: 'shear',
    P: 80000,
    deposit: 16000,
    F: 64000,
    charge: 5120,
    T: 69120,
    share: 0.2,
    shareWords: k('share.fifth'),
    I: 54500,
    sign: btn(k('card.sign'), { act: 'signFinance', plate: 'shear', shown }),
    notNow: btn(k('card.notNow'), { act: 'open', card: { kind: 'works', plate: 'shear' } }),
    refusal: null,
  };
}

/** The Agreements page (4.5): one open row ("You repay §69,120 · repaid §12,400" / "§56,720 left") and one repaid. */
export function sampleAgreements(): AgreementRow[] {
  return [
    { kind: 'bank', lender: 'bank', plate: 'shear', T: 69120, taken: 12400, left: 56720, share: 0.2, signedAt: 7200, repaidAt: null, open: true },
    { kind: 'bank', lender: 'bank', plate: 'depollution', T: 41472, taken: 41472, left: 0, share: 0.2, signedAt: 1800, repaidAt: 5400, open: false },
  ];
}

/** The Yard sale (4.6, 2.12's worked example): the bath and a radiator racked, the next visitor in 690 s. */
export function sampleYardSale(): YardSaleCard {
  return {
    slots: 6,
    free: 4,
    things: [
      { uid: 'bath0', obj: 'bath', q: 261.25, v: 104.5 },
      { uid: 'f412', obj: 'radiator', q: 162.88, v: 65.15 },
    ],
    nextVisitorInS: 690,
    soldToday: { n: 1, money: 448 },
    level: { level: 0, max: 3, from: 6, to: 8, button: btn(k('card.level', { x: { money: 4000 } }), { act: 'levelV3', target: { kind: 'reuse' }, price: 4000 }), state: 'buy' },
    corner: { dealer: 'reclamationDealer', batches: 1, vanInS: 1200 },
  };
}

/** An oversize piece (4.7): a bronze propeller from the boatyard, about §13,625 once cut (15 minutes of I at rung 3). */
export function sampleLot(): LotCard {
  return { uid: 'lot1', obj: 'propeller', sender: 'partner.boatyard', g: 420000, valueOnceCut: 13625, cut_s: 8 };
}

/** The picking table (4.7): seven things waiting, three seconds a thing, nothing expires. */
export function sampleCrate(): CrateCard {
  return { n: 7, max: 12, sort_s: 3, things: ['f501', 'f502', 'f507', 'f511', 'f512', 'f520', 'f533'].map((uid, i) => ({ uid, obj: i % 2 ? 'fitting' : 'motor' })) };
}

/** The shop (4.8) at rung 4 with packs on (country US, age band a18): a pack offered, one over headroom, one waiting for approval. */
export function sampleShop(): ShopCard {
  const look = (product: string, slot: 'colour' | 'dressing' | 'plaque', owned: boolean, inUse: boolean) => ({
    product,
    slot,
    owned,
    inUse,
    button: inUse ? null : owned ? btn(k('card.shop.use'), { act: 'chooseLook', slot, id: product }) : btn(k('card.shop.buy'), { act: 'buyProduct', product }),
  });
  return {
    looks: [look('colour1', 'colour', true, true), look('colour2', 'colour', false, false), look('dressing1', 'dressing', false, false), look('plaque', 'plaque', false, false)],
    earned: [
      { id: 'rung3', slot: 'sign', earned: true, inUse: false, opensAtRung: null, button: btn(k('card.shop.use'), { act: 'chooseLook', slot: 'sign', id: 'rung3' }) },
      { id: 'rung4', slot: 'sign', earned: false, inUse: false, opensAtRung: 4, button: null },
    ],
    noAds: { product: 'noAds', owned: false, button: btn(k('card.shop.buy'), { act: 'buyProduct', product: 'noAds' }) },
    packs: [
      // "§109,000 · about 2 hours of your yard's earnings" (S = roundMoney(H × I) at I §54,500).
      { product: 'pack2', H: 2, S: 109000, state: 'offer', updated: null, button: btn(k('card.shop.packLine', { x: { money: 109000 }, n: { n: 2 } }), { act: 'buyPack', product: 'pack2', S: 109000 }) },
      { product: 'pack5', H: 5, S: 272500, state: 'waiting', updated: null, button: null },
      { product: 'pack10', H: 10, S: 545000, state: 'noRoom', updated: null, button: null },
      { product: 'pack20', H: 20, S: 1090000, state: 'noRoom', updated: null, button: null },
    ],
    country: 'US',
  };
}

export function samplePackSheet(): PackSheetCard {
  return { product: 'pack2', S: 109000, H: 2, buy: btn(k('card.buy'), { act: 'buyPack', product: 'pack2', S: 109000 }), notNow: btn(k('card.notNow'), { act: 'open', card: { kind: 'shop' } }) };
}

export function sampleAgeQuestion(): AgeQuestionCard {
  return { minYear: 1900, maxYear: 2026 };
}

export function samplePackCode(): PackCodeCard {
  return { mode: 'set', wrong: false };
}

/** The away bonus (4.9): half of what reached the player after the bank's share, at most 15 minutes of I. */
export function sampleBonus(): BonusCard {
  return { kind: 'away', amount: 1250, video: true, take: btn(k('card.ad.video', { x: { money: 1250 } }), { act: 'watchAd', kind: 'away', amount: 1250 }), later: btn(k('card.notNow'), { act: 'open', card: { kind: 'away' } }) };
}

const base = (kind: SampleKind, title: Txt, shape: CardData['shape'], showsDebt: boolean): CardData => ({ kind, shape, title, lead: [], rows: [], foot: [], showsDebt, sample: true });

/** One sample CardData per stage-2 card kind (4.2). */
export const SAMPLES: Record<SampleKind, () => CardData> = {
  works: () => ({ ...base('works', k('title.works.baler'), 'panel', false), works: sampleWorksCard() }),
  finance: () => ({ ...base('finance', k('title.finance', { plate: { text: 'title.works.shear' as TextKey } }), 'centred', true), finance: sampleFinance() }),
  letter: () => base('letter', k('title.letter'), 'centred', false),
  yardSale: () => ({ ...base('yardSale', k('title.yardSale'), 'panel', false), yardSale: sampleYardSale() }),
  lot: () => ({ ...base('lot', k('title.lot'), 'panel', false), lot: sampleLot() }),
  crate: () => ({ ...base('crate', k('title.crate'), 'panel', false), crate: sampleCrate() }),
  shop: () => ({ ...base('shop', k('title.shop'), 'panel', false), shop: sampleShop() }),
  packSheet: () => ({ ...base('packSheet', k('title.packSheet'), 'centred', false), packSheet: samplePackSheet() }),
  ageQuestion: () => ({ ...base('ageQuestion', k('title.ageQuestion'), 'centred', false), ageQuestion: sampleAgeQuestion() }),
  packCode: () => ({ ...base('packCode', k('title.packCode'), 'centred', false), packCode: samplePackCode() }),
  awayBonus: () => ({ ...base('awayBonus', k('title.awayBonus'), 'centred', false), bonus: sampleBonus() }),
  agreements: () => ({ ...base('agreements', k('title.agreements'), 'panel', true), agreements: sampleAgreements() }),
};

/** Extra samples of states a screen must draw: a works card with the Bank loan, and financed. */
export const MORE_SAMPLES = {
  worksLoan: (): CardData => ({ ...base('works', k('title.works.shear'), 'panel', false), works: sampleWorksLoanCard() }),
  worksFinanced: (): CardData => ({ ...base('works', k('title.works.shear'), 'panel', true), works: { ...sampleWorksLoanCard(), state: 'running', foot: { buy: null, loan: null, loanShort: null, saveUp_s: null }, bank: { left: 56720, T: 69120, ring: 12400 / 69120 } } }),
  /** s2a-fix: the away card with the bank's line and a repayment (it shows a debt). */
  awayWithBank: (): CardData => ({ kind: 'away', shape: 'centred', title: { key: 'title.away' }, lead: [], rows: [], foot: [{ label: { key: 'ok' }, action: { act: 'ackAway' }, refusal: null }], showsDebt: true, sample: true, away: sampleAwayWithBank() }),
};

/**
 * s2a-fix: the first yard's away card with stage 2's bank line while an agreement is open (2.14.4, 2.17): the
 * card shows a debt (`showsDebt`, so the hud hides the ad button), its money GROSS of the bank's §y, and an
 * agreement repaid in full while away.
 */
export function sampleAwayWithBank(): AwayCard {
  return {
    seconds: 4 * 3600,
    capS: 4 * 3600,
    lines: [
      { grade: 'hms', g: 38_400_000, money: 9600 },
      { grade: 'li', g: 21_000_000, money: 4200 },
    ],
    supplied_g: 59_400_000,
    money: 13800,
    loads: 31,
    deliveries: 0,
    passed: [],
    hint: null,
    absentS: 5 * 3600,
    spent: 2100,
    bought: [],
    net: 11700,
    bank: 2760,
    repaid: ['depollution'],
  };
}

/** The sample for a stage-2 card ref; null for a ref the first yard's `cardOf` answers. */
export function sampleCard(ref: CardRefAll): CardData | null {
  if (ref.kind === 'office' && ref.tab === 'agreements') return SAMPLES.agreements();
  return (CARD_KINDS_V3 as readonly string[]).includes(ref.kind) ? SAMPLES[ref.kind as SampleKind]() : null;
}
