/**
 * Rewarded ads and the away card's new lines (yard-stage2.md 2.16, 2.17, 4.9, 8.1 rows 2.16 and 2.17; owner
 * rules-money): nothing before the second session; the away bonus is half of what reached the player after the
 * bank's share, at most awayCap_min of I, on its own card after the away card closed, never centred after a card
 * that showed a debt, kept until taken or replaced, once a market day; the spot buyer on a held bay's Sell, its
 * own line apart from the Sell's payment, three a market day; rewards through credit, never repaying; the day's
 * cap by rung; the away card's lines equal what the absence applied. Frozen test content.
 */
import { describe, expect, it } from 'vitest';
import { firstHour2min, r3finGame, moneyCfg, shopCfg, shopGame, SHOP_NOW } from '../fixtures/salvage2money';
import { stage2Content } from '../fixtures/salvage';
import { ackAway } from './actions';
import { adPaid } from './actionsMoney';
import { adDayLimitMinutes, adDayMinutes, adOffer, awayBonusOf, bonusCard, deferredBonus, sellNow, spotBonusOf, spotButton } from './ads';
import { salvageOffline } from './away';
import { ratedIG } from './bank';
import { sellAmount } from './board';
import { awayMoneyView, moneyOver } from './cardsMoney';
import { cardOf } from './cards';
import { debtOnScreen } from './frameMoney';
import { jump, advanceSalvage } from './tick';
import { roundMoney } from './money';
import type { AwayCard, SalvageEvent, SalvageGame } from './types';

const cfg = shopCfg();
const DAY_MS = 86_400_000;
const away = (money: number, absentS: number, bank = 0): AwayCard => ({ seconds: Math.min(absentS, 7200), capS: 7200, lines: [], supplied_g: 0, money, loads: 0, deliveries: 0, passed: [], hint: null, absentS, ...(bank ? { bank } : {}) });
/** A yard whose away card (money, absence) is up, and the game after its OK. */
const closeCard = (g: SalvageGame, card: AwayCard) => ackAway(cfg, { ...g, salvage: { ...g.salvage, away: card } });
const before2 = (g: SalvageGame): SalvageGame => ({ ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap, sessions2At: null } } });
const I0 = ratedIG(cfg, shopGame()).I;

describe('nothing of money or ads before the second session (2.15.2, 4.1.4; P1)', () => {
  it('firstHour2min: after a 2-minute absence no second session, no shop row, no packs row, no ad button, no offer anywhere', () => {
    const fh = firstHour2min();
    expect(fh.card.salvage.away?.absentS ?? fh.card.salvage.away?.seconds).toBe(120);
    const g = fh.closed;
    expect(g.salvage.iap.sessions2At).toBeNull();
    expect(g.salvage.ads.awayOffer).toBeNull();
    for (const k of ['away', 'spot'] as const) expect(adOffer(fh.cfg, g, k, { grade: Object.keys(g.salvage.bays)[0] })).toBeNull();
    for (const ref of [{ kind: 'office', tab: 'rota' }, { kind: 'settings' }, { kind: 'help' }, { kind: 'board' }, { kind: 'shop' }, { kind: 'awayBonus' }] as const) {
      const cd = cardOf(fh.cfg, g, ref, SHOP_NOW, { country: 'US' });
      const j = JSON.stringify(cd);
      expect(j, ref.kind).not.toMatch(/watchAd|buyPack|buyProduct|setPacksHidden|"card":\{"kind":"shop"/);
      expect(cd.shop, ref.kind).toBeUndefined();
      expect(cd.bonus, ref.kind).toBeUndefined();
    }
    expect(deferredBonus(fh.cfg, g, false)).toBeNull();
  });

  it('the first away card from an absence of at least 30 minutes, closed, sets iap.sessions2At (the yard second), once; the same closing offers the away bonus', () => {
    const g = before2(shopGame());
    const short = closeCard(g, away(1000, 29 * 60));
    expect(short.salvage.iap.sessions2At).toBeNull();
    expect(short.salvage.ads.awayOffer).toBeNull();
    const long = closeCard(g, away(1000, 30 * 60));
    expect(long.salvage.iap.sessions2At).toBe(Math.floor(g.salvage.t));
    expect(long.salvage.ads.awayOffer?.amount).toBe(awayBonusOf(cfg, g, away(1000, 1800)));
    const later = closeCard({ ...long, salvage: { ...long.salvage, t: long.salvage.t + 999 } }, away(10, 3600));
    expect(later.salvage.iap.sessions2At).toBe(long.salvage.iap.sessions2At);
  });
});

describe('the away bonus (2.16, 4.9)', () => {
  it('half of what reached the player after the bank\'s share, at most awayCap_min of I; its own card; paid through credit as its own line, never repaying', () => {
    const g = shopGame();
    const cap = roundMoney((15 / 60) * I0);
    expect(awayBonusOf(cfg, g, away(1000, 3600, 200))).toBe(400);
    expect(awayBonusOf(cfg, g, away(1e7, 3600))).toBe(cap);
    const closed = closeCard(g, away(1000, 3600));
    expect(closed.salvage.ads.awayOffer).toEqual({ amount: 500, I: roundMoney(I0), centred: true });
    const card = cardOf(cfg, closed, { kind: 'awayBonus' }, SHOP_NOW, { country: 'US' });
    expect(card.bonus).toMatchObject({ kind: 'away', amount: 500, video: true, take: { action: { act: 'watchAd', kind: 'away', amount: 500 } } });
    expect(card.showsDebt).toBe(false);
    const withLoan = { ...closed, salvage: { ...closed.salvage, bank: { ...closed.salvage.bank, agreement: { kind: 'bank' as const, plate: 'shear', P: 1, F: 1, c: 0, T: 100, taken: 3, signedAt: 0, I: 1 } } } };
    const ev: SalvageEvent[] = [];
    const paid = adPaid(cfg, withLoan, 'away', 500, {}, withLoan.salvage.t, ev);
    expect(paid.cash).toBe(roundMoney(withLoan.cash + 500));
    expect(paid.salvage.bank.agreement!.taken).toBe(3);
    expect(paid.salvage.counts!['granted:c'] ?? 0).toBe(withLoan.salvage.counts!['granted:c'] ?? 0);
    expect(paid.salvage.ads).toMatchObject({ awayUsed: 1, awayOffer: null });
    expect(ev).toEqual([{ type: 'adPaid', kind: 'away', amount: 500 }]);
  });

  it('never centred after an away card that showed a debt (a bank line, or an agreement open): straight to the deferred button, which hides while a debt is on screen (P6); a changed figure re-asks', () => {
    const g = shopGame();
    expect(closeCard(g, away(1000, 3600, 100)).salvage.ads.awayOffer?.centred).toBe(false);
    const fin = { ...g, salvage: { ...g.salvage, bank: { ...g.salvage.bank, agreement: { kind: 'bank' as const, plate: 'shear', P: 1, F: 1, c: 0, T: 100, taken: 3, signedAt: 0, I: 1 } } } };
    const c2 = closeCard(fin, away(1000, 3600));
    expect(c2.salvage.ads.awayOffer?.centred).toBe(false);
    expect(deferredBonus(cfg, c2, false)).toBe(500);
    expect(deferredBonus(cfg, c2, true)).toBeNull();
    const ev: SalvageEvent[] = [];
    expect(adPaid(cfg, c2, 'away', 499, {}, 0, ev)).toBe(c2);
    expect(ev[0]).toMatchObject({ key: 'nothing', retry: { act: 'watchAd', kind: 'away', amount: 500 } });
  });

  it('"Not now" keeps the offer until taken or the next away bonus replaces it; one a market day; the next market day offers again', () => {
    const g = shopGame();
    const a = closeCard(g, away(1000, 3600));
    const b = closeCard(a, away(3000, 3600));
    expect(b.salvage.ads.awayOffer?.amount).toBe(1500);
    const paid = adPaid(cfg, b, 'away', 1500, {}, 0);
    const again = closeCard(paid, away(1000, 3600));
    expect(again.salvage.ads.awayOffer).toBeNull();
    expect(adPaid(cfg, b, 'away', 1500, {}, 0)).not.toBe(b);
    const tomorrow = { ...paid, salvage: { ...paid.salvage, clock: { ...paid.salvage.clock, highMs: paid.salvage.clock.highMs + DAY_MS } } };
    expect(closeCard(tomorrow, away(1000, 3600)).salvage.ads.awayOffer?.amount).toBe(500);
  });

  it('with No ad videos owned: "Take +§x" at once, the same limits', () => {
    const g = closeCard(shopGame(), away(1000, 3600));
    const owned = { ...g, entitlements: { noAds: false, skipRewarded: true, products: ['noAds'], multipliers: {} } } as SalvageGame;
    expect(bonusCard(cfg, owned)).toMatchObject({ video: false, take: { label: { key: 'card.ad.take', args: { x: { money: 500 } } } } });
  });
});

describe('the spot buyer (2.16, 4.9)', () => {
  /** shopGame with one bay held and stocked. */
  function held(): { g: SalvageGame; grade: string } {
    const g = shopGame();
    const s = structuredClone(g.salvage);
    const grade = Object.keys(s.bays).find((k) => k === 'li') ?? Object.keys(s.bays)[0];
    s.bays[grade] = { ...s.bays[grade], held: true, g: 200_000, aside: [] };
    return { g: { ...g, salvage: s }, grade };
  }

  it('on a held bay\'s Sell: min(spotShare × the Sell\'s amount, spotCap_min of I); adPaid makes that Sell as shown and credits the bonus apart; three a market day, then adCap', () => {
    const { g, grade } = held();
    const shown = sellNow(cfg, g, grade)!;
    const want = Math.min(roundMoney(0.1 * sellAmount(shown)), roundMoney((4 / 60) * I0));
    expect(spotBonusOf(cfg, g, shown)).toBe(want);
    const b = spotButton(cfg, g, grade)!;
    expect(b.action).toEqual({ act: 'watchAd', kind: 'spot', amount: want, grade, sell: shown });
    expect(cardOf(cfg, g, { kind: 'board' }, g.salvage.clock.highMs).board!.rows.find((r) => r.grade === grade)!.spot).toEqual(b);
    let x = g;
    for (let i = 0; i < 3; i++) {
      const sh = sellNow(cfg, x, grade);
      if (!sh) break;
      const ev: SalvageEvent[] = [];
      const y = adPaid(cfg, x, 'spot', spotBonusOf(cfg, x, sh), { grade, sell: sh }, x.salvage.t, ev);
      expect(y.salvage.bays[grade].aside.at(-1)).toMatchObject({ g: sh.grams, price: sh.price });
      expect(y.cash).toBe(roundMoney(x.cash + spotBonusOf(cfg, x, sh)));
      expect(ev.at(-1)).toMatchObject({ type: 'adPaid', kind: 'spot' });
      // refill the bay for the next one
      const s = structuredClone(y.salvage);
      s.bays[grade].g += 200_000;
      x = { ...y, salvage: s };
    }
    expect(x.salvage.ads.spotUsed).toBe(3);
    expect(spotButton(cfg, x, grade)).toBeNull();
    const ev: SalvageEvent[] = [];
    const sh = sellNow(cfg, x, grade)!;
    expect(adPaid(cfg, x, 'spot', spotBonusOf(cfg, x, sh), { grade, sell: sh }, 0, ev)).toBe(x);
    expect(ev).toMatchObject([{ key: 'adCap' }]);
  });

  it('a refused Sell pays no bonus; no spot buyer on a bay not held, before the second session; "Bonus · +§x" with No ad videos', () => {
    const { g, grade } = held();
    const sh = sellNow(cfg, g, grade)!;
    const ev: SalvageEvent[] = [];
    const wrong = { ...sh, price: sh.price + 1 };
    expect(adPaid(cfg, g, 'spot', spotBonusOf(cfg, g, wrong), { grade, sell: wrong }, 0, ev)).toBe(g);
    expect(ev.some((e) => e.type === 'refused' && e.key === 'priceUpdated')).toBe(true);
    const notHeld = { ...g, salvage: { ...g.salvage, bays: { ...g.salvage.bays, [grade]: { ...g.salvage.bays[grade], held: false } } } };
    expect(spotButton(cfg, notHeld, grade)).toBeNull();
    expect(spotButton(cfg, before2(g), grade)).toBeNull();
    const noAds = { ...g, entitlements: { noAds: false, skipRewarded: true, products: [], multipliers: {} } } as SalvageGame;
    expect(spotButton(cfg, noAds, grade)!.label.key).toBe('card.ad.bonus');
  });
});

describe('the day\'s cap and the debt on screen', () => {
  it('caps and counts by rung: awayPerDay × awayCap_min + spotPerDay × spotCap_min ≤ maxDayShare × a day\'s income at rungs 3, 4, 5 (15 + 3 × 4 = 27 minutes of I)', () => {
    const c = stage2Content();
    expect(adDayMinutes(c)).toBe(27);
    for (const r of [3, 4, 5]) expect(adDayMinutes(c)).toBeLessThanOrEqual(adDayLimitMinutes(c, r)!);
  });

  it('a debt on screen: any card or ticket up that shows one; the world\'s ring (a financed plate in view) never (P7)', () => {
    expect(debtOnScreen([{ showsDebt: false }, {}])).toBe(false);
    expect(debtOnScreen([{ showsDebt: false }, { showsDebt: true }])).toBe(true);
    const fin = r3finGame();
    const fcfg = moneyCfg();
    expect(cardOf(fcfg, fin, { kind: 'office', tab: 'agreements' }, 0).showsDebt).toBe(true);
    expect(cardOf(fcfg, fin, { kind: 'office', tab: 'rota' }, 0).showsDebt).toBe(false);
    expect(debtOnScreen([cardOf(fcfg, fin, { kind: 'office', tab: 'rota' }, 0)])).toBe(false);
  });
});

describe('the away card\'s new lines equal what the absence applied (2.17)', () => {
  it('r3fin two hours away: "To [bank]: §y" is the sum the agreement took, the card shows a debt, the bonus base is money − bank', () => {
    const fcfg = moneyCfg();
    const g = r3finGame();
    const at = Math.max(g.lastSavedAt || 0, g.salvage.clock.highMs);
    const r = salvageOffline(fcfg, { ...g, lastSavedAt: at }, at + 2 * 3600_000).game as SalvageGame;
    const a = r.salvage.away!;
    const taken = roundMoney((r.salvage.bank.agreement?.taken ?? r.salvage.bank.done.at(-1)?.T ?? 0) - g.salvage.bank.agreement!.taken);
    expect(roundMoney(a.bank ?? 0)).toBe(taken);
    const view = awayMoneyView(fcfg, r)!;
    expect(view.bank ?? 0).toBe(a.bank ?? 0);
    expect(view.showsDebt).toBe(true);
    expect(cardOf(fcfg, r, { kind: 'away' }, 0).showsDebt).toBe(true);
    expect(view.repaid).toEqual(a.repaid ?? []);
    if ((a.bank ?? 0) > 0) expect(awayBonusOf(fcfg, r, a)).toBeLessThanOrEqual(roundMoney(0.5 * (a.money - (a.bank ?? 0))) + 0.001);
    // moneyOver is idempotent: decorating the decorated card changes nothing
    const cd = cardOf(fcfg, r, { kind: 'away' }, 0);
    expect(moneyOver(fcfg, r, cd, 0, { country: null })).toEqual(cd);
  });
});

describe('the engine\'s promises with the money\'s state', () => {
  it('a tick equals a jump on a yard with standing quotes, a deferred away bonus and the second session (60 s); nothing of them moves with time', () => {
    const base = closeCard(shopGame({ cash: 0 }), away(1000, 3600));
    const g: SalvageGame = { ...base, salvage: { ...base.salvage, iap: { ...base.salvage.iap, pending: [{ id: 'q1', product: 'pack2', S: 10, I: 1, atMs: 1, askedMs: 1, known: [], state: 'waiting', wait: 'pending' }] } } };
    let a = g;
    let ms = g.salvage.clock.highMs;
    for (let i = 0; i < 600; i++) {
      ms += 100;
      a = advanceSalvage(cfg, a, 0.1, ms);
    }
    const j = jump(cfg, g, g.salvage.t + 60);
    expect(Math.abs(a.cash - j.cash)).toBeLessThan(0.011);
    expect(a.salvage.iap).toEqual(g.salvage.iap);
    expect(j.salvage.iap).toEqual(g.salvage.iap);
    expect(a.salvage.ads).toEqual(j.salvage.ads);
    expect(a.salvage.ads.awayOffer).toEqual(g.salvage.ads.awayOffer);
  });
});
