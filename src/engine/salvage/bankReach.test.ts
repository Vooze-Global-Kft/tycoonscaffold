/**
 * THE BANK'S REACH (s2e-bank, 27 Nov; yard-stage2-economy.md package 8, 2.14.2, 2.14.3, 2.14.5 and 2.15's pack rule
 * while a loan is open; RULING2 27.3 D7). What may be financed (a machine or VEHICLE that earns, by the content's
 * mark; never a tool, crew, a level, a look or a pack), F_max = min(maxF_h, maxF_tau x tau_r) x I, the design's
 * worked example L1, the hook-lift signed as a plate is and never taken back, the finance row and the letter on the
 * truck park's card, "While it is repaid you keep about §y an hour", the predicate the advice line calls, and no pack
 * while an agreement is open (a reason and a line of its own; offered again once repaid; bought scrip never repays).
 * Frozen test content only (fixtures/salvage.ts r3's content, the works' shop content), with the new rule's numbers
 * written HERE where a test needs them (the vehicle's content below); no tuned number of game.json is read or pinned.
 */
import { describe, expect, it } from 'vitest';
import { moneyCfg, r3loan, r3open, shopCfg, shopGame, SHOP_NOW } from '../fixtures/salvage2money';
import { FIXTURE_NOW, fixtureGame, SALVAGE_TEST } from '../fixtures/salvage';
import { partnerLoads } from '../../config/schema.salvage';
import * as R from '../salvage';
import { salvageEngineMode } from '../salvageMode';
import { onSeen, quotePack, signFinance } from './actionsMoney';
import { reserve } from './advice';
import { bankRow, financeKind, financePrice, financeTerms, keepPerHour, loanFavoured, loanHintDue, loanOffered, payLot, ratedIG, saveUpSeconds, shownOf, termsAt } from './bank';
import { cardOf } from './cards';
import { cardOfMoney, packRows, parkFinanceRows } from './cardsMoney';
import { begin, finish } from './clock';
import { contentAt, mergedContent } from './layer';
import { roundMoney } from './money';
import { packHours, packS, packsShown, quoteCheck } from './shop';
import type { GameConfig } from '../../config/schema';
import type { SalvageContent } from '../../config/schema.salvage';
import type { GameState } from '../types';
import type { CardData, SalvageConfig, SalvageEvent, SalvageGame } from './types';

const rt = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const whole = (g: SalvageGame): unknown => {
  const s = rt(g.salvage) as unknown as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), s };
};
const withAgreement = (g: SalvageGame, T: number, plate = 'shear', taken = 0): SalvageGame => ({
  ...g,
  salvage: { ...g.salvage, bank: { ...g.salvage.bank, agreement: { kind: 'bank', plate, P: T, F: T, c: 0, T, taken, signedAt: g.salvage.t, I: 1 } } },
});
const unseen = (g: SalvageGame): SalvageGame => ({ ...g, salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: false } } });

// ============================================================================ the arithmetic (2.14.3 as amended; L1)

/** Only what the terms read, with the NEW rule's numbers (bank.maxF_h 6, maxF_tau 0.5; tau 12 / 36 / 48 h) and one financeable vehicle. */
const NEW = {
  bank: { share: 0.2, shareWords: 'A fifth', charge: 0.08, maxShare: 0.8, maxF_h: 6, maxF_tau: 0.5, minPrice_h: 0.5, maxAgreements: 1 },
  tau_h: [null, null, 12, 36, 48],
  works: { plates: { hall: { financeable: true }, bay: { financeable: false } } },
  shop: [
    { key: 'hook', kind: 'vehicle', place: 'park', price: 206000, gate: 'rung3', deliver_s: 30, financeable: true },
    { key: 'van2', kind: 'vehicle', place: 'park', price: 206000, gate: 'rung3', deliver_s: 30 },
    { key: 'plasma', kind: 'tool', place: 'rack', price: 206000, gate: 'rung3', deliver_s: 6, financeable: true },
    { key: 'cutter2', kind: 'crew', place: 'office', price: 206000, gate: null, deliver_s: 0, financeable: true },
    { key: 'sack', kind: 'carry', place: 'rack', price: 206000, gate: null, deliver_s: 0, financeable: true },
  ],
  dayOneList: [],
} as unknown as SalvageContent;

describe('2.14.3 as amended: F_max = min(maxF_h, maxF_tau x tau_r) x I; the design\'s worked example L1', () => {
  it('L1, the hook-lift at rung 3 (P §206,000, I §30,000): F §164,800, deposit §41,200, charge §13,184, T §177,984', () => {
    expect(termsAt(NEW, 'hook', 206000, 30000, 3)).toMatchObject({ P: 206000, F: 164800, d: 41200, charge: 13184, T: 177984, I: 30000, share: 0.2 });
  });
  it('F_max binds a dear item: 6 h of I at rung 3 (0.5 x 12 = 6) and at rung 4 (min(6, 18)); four fifths below it', () => {
    // P §300,000 at I §30,000: 0.8 P = §240,000 > 6 h x I = §180,000.
    expect(termsAt(NEW, 'hook', 300000, 30000, 3)).toMatchObject({ F: 180000, d: 120000, charge: 14400, T: 194400 });
    expect(termsAt(NEW, 'hall', 1000000, 100000, 4)).toMatchObject({ F: 600000, d: 400000 });
    // At a rung whose tau is under 12 h the tau side binds: with tau 8 h, F_max = 4 h of I.
    const short = { ...NEW, tau_h: [null, null, 8, 36, 48] } as unknown as SalvageContent;
    expect(termsAt(short, 'hook', 206000, 30000, 3)).toMatchObject({ F: 120000, d: 86000 });
  });
  it('the deposit and the bank\'s part add up to the price, and T = F + charge, on a spread of prices and incomes', () => {
    for (const [P, I] of [[206000, 30000], [43800, 28000], [339000, 110000], [137000, 90000], [107000, 95000]] as const) {
      const tm = termsAt(NEW, 'hall', P, I, 4)!;
      expect(roundMoney(tm.d + tm.F)).toBe(P);
      expect(tm.T).toBe(roundMoney(tm.F + tm.charge));
      expect(tm.F).toBeLessThanOrEqual(0.8 * P + 1e-9);
      expect(tm.F).toBeLessThanOrEqual(6 * I + 1e-9);
    }
  });
});

describe('2.14.2 as amended: what may be financed', () => {
  it('a plate or a VEHICLE the content marks financeable; never a tool, crew or a carrier (whatever the mark), nor an unmarked one', () => {
    expect(financeKind(NEW, 'hall')).toBe('plate');
    expect(financeKind(NEW, 'hook')).toBe('vehicle');
    for (const k of ['bay', 'van2', 'plasma', 'cutter2', 'sack', 'nothing']) expect(financeKind(NEW, k), k).toBeNull();
    for (const k of ['plasma', 'cutter2', 'sack', 'van2', 'bay']) expect(termsAt(NEW, k, 206000, 30000, 3), k).toBeNull();
  });
  it('priced at least bank.minPrice_h hours of I; nothing below rung 3 (no tau); nothing without a bank block (release.stage 1 strips it)', () => {
    expect(termsAt(NEW, 'hook', 14999.99, 30000, 3)).toBeNull();
    expect(termsAt(NEW, 'hook', 15000, 30000, 3)).not.toBeNull();
    expect(termsAt(NEW, 'hook', 206000, 30000, 2)).toBeNull();
    expect(termsAt({ ...NEW, bank: undefined } as unknown as SalvageContent, 'hook', 206000, 30000, 3)).toBeNull();
  });
});

// ============================================================================ the hook-lift on the frozen r3 (2.14.2, 2.14.3, 2.14.5)

let VCFG: SalvageConfig | null = null;
/**
 * r3's frozen content with the new rule's bank and tau (6 h, 0.5; 12 / 36 / 48) and the works layer's three-axle truck
 * MARKED financeable at three hours of r3's I (the frozen content sells it at §12,000, under the half-hour floor). One
 * object, so the rules' caches hold.
 */
function vehicleCfg(): SalvageConfig {
  if (VCFG) return VCFG;
  const base = moneyCfg();
  const c = structuredClone(base.salvage) as unknown as Record<string, unknown> & SalvageContent;
  c.bank = { ...c.bank!, maxF_h: 6, maxF_tau: 0.5 };
  (c as { tau_h: (number | null)[] }).tau_h = [null, null, 12, 36, 48];
  const tb = c.worksLayer!.shop.find((i) => i.key === 'truckBridge')!;
  const I = ratedIG(base, r3open()).I;
  tb.price = roundMoney(3 * I);
  (tb as { financeable?: boolean }).financeable = true;
  return (VCFG = { ...base, salvage: c } as SalvageConfig);
}
const V = 'truckBridge';
/** r3 with the works open, the letter seen and the cash a loan on the hook-lift needs (cash − reserve ≥ d, P above it). */
function vLoan(margin = 500): SalvageGame {
  const cfg = vehicleCfg();
  const g = r3open();
  const tm = financeTerms(cfg, { ...g, cash: 0 }, V)!;
  return { ...g, cash: roundMoney(reserve(cfg, g) + tm.d + margin), salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: true } } };
}

describe('the three-axle hook-lift financed (a vehicle that earns)', () => {
  const cfg = vehicleCfg();
  const g = vLoan();
  const tm = financeTerms(cfg, g, V)!;

  it('its terms on r3 (the test\'s premise): for sale once the works opened, financeable, P above cash − reserve', () => {
    expect(tm).not.toBeNull();
    expect(tm.P).toBe(financePrice(cfg, g, V));
    expect(financeTerms(cfg, { ...g, salvage: { ...g.salvage, counts: {} } }, V)).toBeNull();
    expect(loanOffered(cfg, g, V)).toBe(true);
    // F = min(0.8 P, 6 h x I) on this state's I.
    expect(tm.F).toBe(roundMoney(Math.min(0.8 * tm.P, 6 * ratedIG(cfg, g).I)));
  });

  it('the letter falls due at the truck park\'s card (as at a plot\'s card), once; not at another card', () => {
    const u = unseen(g);
    const ev: SalvageEvent[] = [];
    expect(onSeen(cfg, u, { card: 'board' }, ev)).toBe(u);
    const seen = R.noteSeen(cfg, u, { card: 'park', place: 'park' }, u.salvage.t, ev);
    expect(seen.salvage.bank.letterSeen).toBe(true);
    expect(ev.filter((e) => e.type === 'letter')).toHaveLength(1);
    expect(onSeen(cfg, seen, { card: 'park', place: 'park' }, ev)).toBe(seen);
    // Not while the cash pays it outright.
    const rich = unseen({ ...g, cash: roundMoney(tm.P + reserve(cfg, g) + 1) });
    expect(onSeen(cfg, rich, { card: 'park', place: 'park' }, []).salvage.bank.letterSeen).toBe(false);
  });

  it('the truck park\'s card carries "Bank loan" with "Save up (about x)", greyed as a plot\'s is; nothing before the letter', () => {
    const d = cardOf(cfg, g, { kind: 'place', place: 'park' }, 0);
    const row = d.rows.find((r) => r.id === 'money.loan.truckBridge')!;
    expect(row).toBeDefined();
    expect(row.name).toEqual({ key: 'item.truckBridge' });
    expect(row.button).toEqual({ label: { key: 'card.works.loan' }, action: { act: 'open', card: { kind: 'finance', plate: V } }, refusal: null });
    expect(row.line).toEqual({ key: 'card.works.saveUp', args: { t: { secs: saveUpSeconds(cfg, g, tm.P) } } });
    expect(d.showsDebt).toBe(false);
    const short = { ...g, cash: roundMoney(reserve(cfg, g) + tm.d - 250) };
    expect(parkFinanceRows(cfg, short).rows[0].button?.refusal).toEqual({ key: 'card.works.loanShort', args: { d: { money: tm.d }, x: { money: 250 } } });
    expect(parkFinanceRows(cfg, unseen(g)).rows).toEqual([]);
    // Before the works open (no works layer read): no money row at all.
    expect(parkFinanceRows(cfg, { ...g, salvage: { ...g.salvage, counts: {} } }).rows).toEqual([]);
  });

  it('the finance card: the vehicle\'s name, the terms now, the keep line as computed; Not now back to the truck park', () => {
    const d = cardOfMoney(cfg, g, { kind: 'finance', plate: V }, 0, { country: null });
    expect(d.title).toEqual({ key: 'title.finance', args: { plate: { text: 'item.truckBridge' } } });
    expect(d.finance).toMatchObject({ plate: V, P: tm.P, deposit: tm.d, F: tm.F, charge: tm.charge, T: tm.T, refusal: null });
    const { I, G } = ratedIG(cfg, g);
    const y = roundMoney(I - 0.2 * G);
    expect(y).toBeGreaterThan(0);
    expect(keepPerHour(cfg, g)).toBe(y);
    expect(d.lead).toContainEqual({ key: 'card.letter.keep', args: { x: { money: y } } });
    expect(d.finance!.notNow.action).toEqual({ act: 'open', card: { kind: 'place', place: 'park' } });
  });

  it('signed through signFinance as a plate is: cash − d (never the reserve), on its way by its carrier, then owned; never taken back', () => {
    const ev: SalvageEvent[] = [];
    const out = signFinance(cfg, g, V, shownOf(tm), g.salvage.t, ev);
    expect(out.cash).toBe(roundMoney(g.cash - tm.d));
    expect(out.cash).toBeGreaterThanOrEqual(reserve(cfg, g) - 1e-9);
    expect(out.salvage.bank.agreement).toMatchObject({ kind: 'bank', plate: V, P: tm.P, F: tm.F, c: tm.charge, T: tm.T, taken: 0 });
    expect(ev).toContainEqual({ type: 'financed', plate: V, F: tm.F, T: tm.T });
    const it = contentAt(cfg.salvage, out.salvage).shop.find((i) => i.key === V)!;
    expect(out.salvage.arriving).toContainEqual({ item: V, by: it.arrive ?? 'truck', place: it.place, since: g.salvage.t, at: g.salvage.t + it.deliver_s });
    // The card: its finance row is now "Bank loan · §left left of §T"; the park card shows a debt (no shop entry beside it).
    const park = cardOf(cfg, out, { kind: 'place', place: 'park' }, 0, { country: 'US' });
    expect(park.showsDebt).toBe(true);
    expect(park.rows.find((r) => r.id === 'money.bank.truckBridge')?.name).toEqual({ key: 'card.works.bankLeft', args: { left: { money: tm.T }, total: { money: tm.T } } });
    // Arrived and owned; repaid in full by lot payments; still owned; a second signing refused (owned).
    const later = R.jump(cfg, out, out.salvage.t + it.deliver_s + 5);
    expect(later.salvage.owned).toContain(V);
    const x = begin(cfg, later, []);
    let n = 0;
    while (x.s.bank.agreement && n++ < 100000) payLot(x, 997.31, x.s.t);
    const repaid = finish(later, x);
    expect(repaid.salvage.bank.agreement).toBeNull();
    expect(repaid.salvage.owned).toContain(V);
    expect(bankRow(repaid, V)).toBeNull();
    const again: SalvageEvent[] = [];
    signFinance(cfg, { ...repaid, cash: 1e9 }, V, shownOf(tm), repaid.salvage.t, again);
    expect(again.find((e) => e.type === 'refused')).toMatchObject({ key: 'owned' });
  }, 120_000);

  it('the total taken equals T exactly, to the cent, on the vehicle\'s agreement', () => {
    const out = signFinance(cfg, g, V, shownOf(tm), g.salvage.t);
    const x = begin(cfg, out, []);
    let seed = 777;
    let sum = 0;
    let n = 0;
    while (x.s.bank.agreement && n < 200000) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const gross = roundMoney(0.01 + (seed / 2147483648) * (n % 5 === 0 ? 9000 : 60));
      const { y, z } = payLot(x, gross, x.s.t + n);
      expect(roundMoney(y + z)).toBe(gross);
      sum = roundMoney(sum + y);
      n++;
    }
    expect(sum).toBe(tm.T);
    expect(x.s.bank.done.at(-1)).toMatchObject({ plate: V, T: tm.T });
  });

  it('refusals in order on the vehicle: bankOne, then owned / on its way, then the reserve', () => {
    const sign = (h: SalvageGame) => {
      const ev: SalvageEvent[] = [];
      signFinance(cfg, h, V, shownOf(tm), h.salvage.t, ev);
      return (ev.find((e) => e.type === 'refused') as { key?: string } | undefined)?.key;
    };
    expect(sign(withAgreement(g, 1000))).toBe('bankOne');
    expect(sign({ ...g, salvage: { ...g.salvage, arriving: [{ item: V, by: 'truck', place: 'park', since: 0, at: 1e9 }] } })).toBe('owned');
    const res = reserve(cfg, g);
    const h = { ...g, cash: roundMoney(Math.max(0, res + tm.d - 1)) };
    expect(['bankReserve', 'cash', 'earmark']).toContain(sign(h));
  });

  it('a tick equals a jump with the vehicle\'s agreement open (the hook-lift on its way and arriving inside the minute)', () => {
    const out = signFinance(cfg, g, V, shownOf(tm), g.salvage.t);
    let a = out;
    let ms = a.salvage.clock.highMs;
    for (let i = 0; i < 900; i++) {
      ms += 100;
      a = R.advanceSalvage(cfg, a, 0.1, ms);
    }
    const b = R.jump(cfg, out, a.salvage.t);
    expect(whole(b)).toEqual(whole(a));
    expect(a.salvage.owned).toContain(V);
  }, 300_000);
});

// ============================================================================ the card's numbers and the advice's predicate (2.13 b, 2.14.5)

describe('2.14.5 "While it is repaid you keep about §y an hour"; 2.13 (b) the loan sentence only where the card\'s numbers favour it', () => {
  const cfg = moneyCfg();
  const g = r3loan();
  const tm = financeTerms(cfg, g, 'shear')!;
  it('y = I − share × G_r on the state now, to the cent; the plate\'s finance card prints it', () => {
    const { I, G } = ratedIG(cfg, g);
    expect(keepPerHour(cfg, g)).toBe(roundMoney(I - 0.2 * G));
    const d = cardOfMoney(cfg, g, { kind: 'finance', plate: 'shear' }, 0, { country: null });
    expect(d.lead[1]).toEqual({ key: 'card.letter.keep', args: { x: { money: keepPerHour(cfg, g)! } } });
  });
  it('favoured exactly when gain x save-up hours > charge; the sentence also needs the offer and no agreement open', () => {
    const hours = saveUpSeconds(cfg, g, tm.P)! / 3600;
    const edge = tm.charge / hours;
    expect(loanFavoured(cfg, g, 'shear', edge * 1.01)).toBe(true);
    expect(loanFavoured(cfg, g, 'shear', edge * 0.99)).toBe(false);
    expect(loanFavoured(cfg, g, 'shear', 0)).toBe(false);
    expect(loanHintDue(cfg, g, 'shear', edge * 2)).toBe(true);
    expect(loanHintDue(cfg, withAgreement(g, 1000), 'shear', edge * 2)).toBe(false);
    expect(loanHintDue(cfg, unseen(g), 'shear', edge * 2)).toBe(false);
    // The cash pays it outright: nothing to save for, no sentence.
    expect(loanHintDue(cfg, { ...g, cash: roundMoney(tm.P + reserve(cfg, g) + 1) }, 'shear', edge * 2)).toBe(false);
    // Not a financeable item (a tool): never.
    expect(loanFavoured(cfg, g, 'plasma', 1e9)).toBe(false);
  });
});

// ============================================================================ no bought load nets a loss with an agreement open (ruling 11.5)

describe('ruling 11.5: with an agreement open no bought load nets a loss (the bank\'s split of its prepared worth)', () => {
  for (const [name, cfg] of [['r3\'s frozen content', moneyCfg()], ['the vehicle\'s content', vehicleCfg()]] as const) {
    it(name, () => {
      const c = mergedContent(cfg.salvage);
      const loads = partnerLoads(c).filter(([, ld]) => ld.price > 0);
      expect(loads.length).toBeGreaterThan(0);
      const x = begin(cfg, withAgreement(r3open(), 1e9), []);
      for (const [pid, ld] of loads) {
        const { z } = payLot(x, roundMoney(ld.prepared), x.s.t);
        expect(z, `${pid} ${ld.name}`).toBeGreaterThan(ld.price);
      }
    });
  }
});

// ============================================================================ no pack while a loan is open (D7)

describe('RULING2 27.3 D7: no pack is offered while a Bank loan is open; offered again once it is repaid', () => {
  const cfg = shopCfg();
  const US = { country: 'US' };
  const g0 = shopGame({ cash: 0 });
  const S2 = packS(cfg, g0, packHours(cfg, 'pack2')!);
  const open = withAgreement(g0, 50000, 'shredder');
  const rowOf = (g: SalvageGame) => packRows(cfg, g, SHOP_NOW, US).find((r) => r.product === 'pack2')!;

  it('the premise: pack2 is offered on the yard with no agreement', () => {
    expect(quoteCheck(cfg, g0, 'pack2', null, SHOP_NOW, US).refusal).toBeNull();
    expect(rowOf(g0).state).toBe('offer');
  });
  it('while open (RULING2 28.2 c, amending D7): the pack SECTION is absent, as where the country is off; a Buy pressed all the same is refused packOff', () => {
    expect(packsShown(cfg, open, US)).toBe(false);
    expect(quoteCheck(cfg, open, 'pack2', null, SHOP_NOW, US).refusal).toEqual({ key: 'packOff', args: {} });
    const shop: CardData = cardOf(cfg, open, { kind: 'shop' }, SHOP_NOW, US);
    expect(shop.shop?.packs).toBeNull();
    // The pack sheet names nothing of the loan: the words of a pack not offered here.
    const sheet = cardOfMoney(cfg, open, { kind: 'packSheet', product: 'pack2' }, SHOP_NOW, US);
    expect(JSON.stringify(sheet)).not.toMatch(/loan|bank/i);
    expect(sheet.packSheet).toBeUndefined();
    // Buy pressed all the same: the SAME state, the refusal heard.
    const ev: SalvageEvent[] = [];
    expect(quotePack(cfg, open, 'pack2', S2, SHOP_NOW, [], SHOP_NOW, open.salvage.t, ev, US)).toBe(open);
    expect(ev).toContainEqual({ type: 'refused', key: 'packOff', args: {}, retry: null });
  });
  it('no shop button stands beside a debt: no shop card row offers a Buy for a pack while the agreement is open', () => {
    const d: CardData = cardOf(cfg, open, { kind: 'shop' }, SHOP_NOW, US);
    const acts = (d.shop?.packs ?? []).map((r) => r.button?.action.act).filter(Boolean);
    expect(acts).toEqual([]);
  });
  it('offered again once it is repaid (the agreement into `done`, by lot payments only)', () => {
    const x = begin(cfg, withAgreement(g0, 100, 'shredder'), []);
    payLot(x, 1000, x.s.t);
    const repaid = finish(g0, x);
    expect(repaid.salvage.bank.agreement).toBeNull();
    expect(quoteCheck(cfg, repaid, 'pack2', null, SHOP_NOW, US).refusal).toBeNull();
    expect(rowOf(repaid).state).toBe('offer');
  });
  it('bought scrip never repays a loan: a quote made before the loan and granted while it is open adds S to the cash, nothing to `taken`', () => {
    const q = quotePack(cfg, g0, 'pack2', S2, SHOP_NOW, [], SHOP_NOW, g0.salvage.t, [], US);
    expect(q.salvage.iap.pending).toHaveLength(1);
    const owing = withAgreement(q, 50000, 'shredder', 123);
    const got = salvageEngineMode.grantProduct!(cfg as unknown as GameConfig, owing as GameState, { productId: 'pack2', txId: 'tx-1', purchasedMs: null, own: { atMs: SHOP_NOW } }) as SalvageGame;
    expect(got.cash).toBe(roundMoney(owing.cash + S2));
    expect(got.salvage.bank.agreement!.taken).toBe(123);
  });
});

// ============================================================================ the first yard (release.stage 1) finances nothing

describe('the first yard: nothing of the bank\'s reach is read', () => {
  it('the first yard\'s test content (no bank, no works layer): the park card has no money row, the letter never falls due', () => {
    const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
    const base = { cash: 0, lifetimeEarnings: 0, runEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW }, entitlements: { noAds: false, skipRewarded: false, products: [], multipliers: {} } } as unknown as GameState;
    for (const n of ['m30', 'm15'] as const) {
      const g = fixtureGame(n, base, FIXTURE_NOW);
      expect(parkFinanceRows(cfg, g).rows).toEqual([]);
      const lit = { ...g, cash: 1e7, salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: false } } };
      expect(onSeen(cfg, lit, { card: 'park', place: 'park' }, [])).toBe(lit);
      expect(financeTerms(cfg, lit, 'truckBridge')).toBeNull();
      expect(keepPerHour(cfg, g)).toBeNull();
    }
  });
});
