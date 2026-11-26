/**
 * Every card of the money, and the money's part of every card (yard-stage2.md 4.1, 4.2, 4.5, 4.8, 4.9, 2.19;
 * 8.1 row 2.15's walk; owner rules-money). WALKS EVERY CardData of every frozen state (the first yard's five,
 * r3, r3plain, held14, r3fin, r4, the shop's yard, u13, firstHour2min) over every card ref the state can open:
 * no real-money button on a working card (only the shop and the pack sheet carry one); a shop entry only on the
 * Rota and in Settings (and the pack sheet's way back), never on a card that shows a debt, never for u13; an ad
 * button only on the away bonus card and beside a held bay's Sell, never on a card that shows a debt and never
 * before the second session; `showsDebt` set on every card. Each new card kind has its data (no screen computes
 * a rule).
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, SALVAGE_TEST, stage2Cfg, stage2Game, STAGE2_NAMES } from '../fixtures/salvage';
import { r4Game, worksCfg } from '../fixtures/salvage2works';
import { firstHour2min, moneyCfg, r3finGame, shopCfg, shopGame, SHOP_NOW, u13Game } from '../fixtures/salvage2money';
import { ackAway } from './actions';
import { cardOf } from './cards';
import { contentAt } from './layer';
import type { CardAction, CardData, CardRef, SalvageConfig, SalvageGame } from './types';

const REAL_MONEY = new Set<CardAction['act']>(['buyPack', 'buyProduct', 'restorePurchases']);

/** Every card ref the state can open on its content. */
function refsOf(cfg: SalvageConfig, g: SalvageGame): CardRef[] {
  const c = contentAt(cfg.salvage, g.salvage);
  const refs: CardRef[] = [];
  for (const place of Object.keys(c.map.places ?? {})) refs.push({ kind: 'place', place });
  for (const tab of ['rota', 'partners', 'processBoard', 'agreements'] as const) refs.push({ kind: 'office', tab });
  for (const machine of ['hand_stripper', 'stripper', 'bench', 'crucible'] as const) refs.push({ kind: 'machine', machine });
  for (const grade of Object.keys(g.salvage.bays)) refs.push({ kind: 'bay', grade });
  refs.push({ kind: 'board' }, { kind: 'deal' }, { kind: 'table' }, { kind: 'processBoard' }, { kind: 'clipboard' }, { kind: 'settings' }, { kind: 'help' });
  if (g.salvage.away) refs.push({ kind: 'away' });
  for (let n = 1; n <= 5; n++) refs.push({ kind: 'rung', n });
  for (const [partner, p] of Object.entries(g.salvage.partners)) for (const sk of p.skips) refs.push({ kind: 'skip', partner, slot: sk.slot });
  for (const plate of Object.keys((c as { works?: { plates?: Record<string, unknown> } }).works?.plates ?? {})) refs.push({ kind: 'works', plate }, { kind: 'finance', plate });
  refs.push({ kind: 'letter' }, { kind: 'yardSale' }, { kind: 'crate' }, { kind: 'shop' }, { kind: 'ageQuestion' }, { kind: 'awayBonus' });
  for (let k = 0; k < 4; k++) refs.push({ kind: 'lot', k });
  for (const product of ['pack2', 'pack5', 'pack10', 'pack20']) refs.push({ kind: 'packSheet', product });
  for (const mode of ['set', 'confirm', 'enter'] as const) refs.push({ kind: 'packCode', mode });
  return refs;
}

/** Every button of a card, at any depth (rows, foot, tabs, and the data of each card kind). */
function buttons(cd: CardData): { act: CardAction['act']; card?: string }[] {
  const out: { act: CardAction['act']; card?: string }[] = [];
  const seen = new Set<unknown>();
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    const o = v as { action?: CardAction; label?: unknown };
    if (o.action && typeof o.action === 'object' && 'act' in o.action && o.label !== undefined) out.push({ act: o.action.act, card: o.action.act === 'open' ? (o.action as { card: CardRef }).card.kind : undefined });
    for (const x of Array.isArray(v) ? v : Object.values(v)) visit(x);
  };
  visit(cd);
  return out;
}

interface Frozen {
  name: string;
  cfg: SalvageConfig;
  g: SalvageGame;
  now: number;
}

function frozen(): Frozen[] {
  const out: Frozen[] = [];
  const fcfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
  const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
  for (const n of FIXTURE_NAMES) out.push({ name: n, cfg: fcfg, g: fixtureGame(n, base, FIXTURE_NOW), now: FIXTURE_NOW });
  for (const n of STAGE2_NAMES) out.push({ name: n, cfg: stage2Cfg(n), g: stage2Game(n), now: SHOP_NOW });
  out.push({ name: 'r3fin', cfg: moneyCfg(), g: r3finGame(), now: SHOP_NOW });
  out.push({ name: 'r4', cfg: worksCfg(), g: r4Game(), now: SHOP_NOW });
  out.push({ name: 'shop', cfg: shopCfg(), g: shopGame({ cash: 0 }), now: SHOP_NOW });
  out.push({ name: 'shop+away', cfg: shopCfg(), g: ackAway(shopCfg(), { ...shopGame({ cash: 0 }), salvage: { ...shopGame({ cash: 0 }).salvage, away: { seconds: 3600, capS: 7200, lines: [], supplied_g: 0, money: 2000, loads: 0, deliveries: 0, passed: [], hint: null, absentS: 3600 } } }), now: SHOP_NOW });
  out.push({ name: 'u13', cfg: shopCfg(), g: u13Game(), now: SHOP_NOW });
  const fh = firstHour2min();
  out.push({ name: 'firstHour2min', cfg: fh.cfg, g: fh.closed, now: SHOP_NOW });
  out.push({ name: 'firstHour2min (card up)', cfg: fh.cfg, g: fh.card, now: SHOP_NOW });
  return out;
}

const STATES = frozen();

describe.each(STATES.map((f) => [f.name, f] as const))('every CardData of %s', (_n, f) => {
  const cards: CardData[] = [];
  for (const country of ['US', 'DE', null]) {
    for (const ref of refsOf(f.cfg, f.g)) {
      let cd: CardData | null = null;
      try {
        cd = cardOf(f.cfg, f.g, ref, f.now, { country });
      } catch {
        cd = null; // a ref this content cannot open (another owner's card): not the money's walk
      }
      if (cd) cards.push(cd);
    }
  }

  it('was walked (every card ref of the state, three store countries)', () => {
    expect(cards.length).toBeGreaterThan(60);
  });

  it('showsDebt is set on every card', () => {
    for (const cd of cards) expect(typeof cd.showsDebt, cd.kind).toBe('boolean');
  });

  it('no real-money button on a working card: only the shop and the pack sheet carry one', () => {
    for (const cd of cards) for (const b of buttons(cd)) if (REAL_MONEY.has(b.act)) expect(['shop', 'packSheet'], `${cd.kind} ${b.act}`).toContain(cd.kind);
  });

  it('a shop entry only on the Rota and in Settings (and the pack sheet\'s way back), never on a card that shows a debt', () => {
    for (const cd of cards)
      for (const b of buttons(cd))
        if (b.act === 'open' && b.card === 'shop') {
          expect(['rota', 'settings', 'packSheet'], cd.kind).toContain(cd.kind);
          expect(cd.showsDebt, cd.kind).toBe(false);
        }
  });

  it('an ad button only on the away bonus card and beside a held bay\'s Sell; never on a card that shows a debt', () => {
    for (const cd of cards)
      for (const b of buttons(cd))
        if (b.act === 'watchAd') {
          expect(['awayBonus', 'board'], cd.kind).toContain(cd.kind);
          expect(cd.showsDebt, cd.kind).toBe(false);
        }
  });

  if (f.g.salvage.iap?.ageBand === 'u13')
    it('u13: no CardData has a shop entry (no shop data, no row, no real money, no packs switch)', () => {
      for (const cd of cards) {
        expect(cd.shop, cd.kind).toBeUndefined();
        for (const b of buttons(cd)) {
          expect(REAL_MONEY.has(b.act), `${cd.kind} ${b.act}`).toBe(false);
          expect(b.act === 'open' && b.card === 'shop', cd.kind).toBe(false);
          expect(b.act, cd.kind).not.toBe('setPacksHidden');
        }
      }
    });

  if (!f.g.salvage.iap || f.g.salvage.iap.sessions2At === null)
    it('before the second session: no shop row, no packs row, no ad button, no shop or bonus data', () => {
      for (const cd of cards) {
        expect(cd.shop, cd.kind).toBeUndefined();
        expect(cd.bonus, cd.kind).toBeUndefined();
        for (const b of buttons(cd)) expect(['watchAd', 'setPacksHidden', 'buyPack', 'buyProduct', 'restorePurchases'], `${cd.kind}`).not.toContain(b.act);
        for (const b of buttons(cd)) expect(b.act === 'open' && b.card === 'shop', cd.kind).toBe(false);
      }
    });
});

describe('each new card kind of the money carries the data its screen draws (4.2, 4.8, 4.9)', () => {
  const cfg = shopCfg();
  const g = shopGame({ cash: 0 });
  const US = { country: 'US' };
  it('shop: looks with Buy or Use, earned looks with their padlock rung, No ad videos, packs, Restore, the country read at this opening', () => {
    const owned = { ...g, entitlements: { noAds: false, skipRewarded: false, products: ['colour1'], multipliers: {} }, salvage: { ...g.salvage, iap: { ...g.salvage.iap, looks: { ...g.salvage.iap.looks, colour: 'colour1' } } } } as SalvageGame;
    const shop = cardOf(cfg, owned, { kind: 'shop' }, SHOP_NOW, US).shop!;
    expect(shop.looks.map((l) => l.product)).toEqual(['colour1', 'colour2', 'colour3', 'colour4', 'colour5', 'colour6', 'dressing1', 'dressing2', 'dressing3', 'dressing4', 'plaque']);
    expect(shop.looks[0]).toEqual({ product: 'colour1', slot: 'colour', owned: true, inUse: true, button: null });
    expect(shop.looks[1].button?.action).toEqual({ act: 'buyProduct', product: 'colour2' });
    expect(shop.earned.map((e) => [e.id, e.earned, e.opensAtRung])).toEqual([['rung3', true, null], ['rung4', true, null], ['rung5', false, 5], ['foundry', g.salvage.deal.phase === 'done', null]]);
    expect(shop.noAds).toMatchObject({ product: 'noAds', owned: false, button: { action: { act: 'buyProduct', product: 'noAds' } } });
    expect(shop.packs!.map((p) => p.product)).toEqual(['pack2', 'pack5', 'pack10', 'pack20']);
    expect(shop.restore?.action).toEqual({ act: 'restorePurchases' });
    expect(shop.country).toBe('US');
  });
  it('the pack sheet: S for this yard, the save\'s sentence, Buy at the S now; while it cannot be quoted, the refusal and no Buy', () => {
    const cd = cardOf(cfg, g, { kind: 'packSheet', product: 'pack2' }, SHOP_NOW, US);
    expect(cd.packSheet).toMatchObject({ product: 'pack2', H: 0.5, buy: { action: { act: 'buyPack', product: 'pack2' } } });
    expect(cd.lead.map((t) => t.key)).toEqual(['card.packSheet.amount', 'card.packSheet.save']);
    const off = cardOf(cfg, g, { kind: 'packSheet', product: 'pack2' }, SHOP_NOW, { country: 'DE' });
    expect(off.packSheet).toBeUndefined();
    expect(off.lead[0].key).toBe('refusal.packOff');
  });
  it('the age question, the code pad, the away bonus: their data only while due', () => {
    expect(cardOf(cfg, shopGame({ ageBand: null }), { kind: 'ageQuestion' }, SHOP_NOW, US).ageQuestion).toEqual({ minYear: 1900, maxYear: 2026 });
    expect(cardOf(cfg, g, { kind: 'ageQuestion' }, SHOP_NOW, US).ageQuestion).toBeUndefined();
    expect(cardOf(cfg, g, { kind: 'packCode', mode: 'confirm' }, SHOP_NOW, US)).toMatchObject({ packCode: { mode: 'confirm', wrong: false }, lead: [{ key: 'card.code.confirm' }] });
    expect(cardOf(cfg, g, { kind: 'packCode', mode: 'set' }, SHOP_NOW, { country: null }).packCode).toBeUndefined();
    expect(cardOf(cfg, g, { kind: 'awayBonus' }, SHOP_NOW, US).bonus).toBeUndefined();
  });
});

describe('looks (2.15.1): chosen per slot, only the frame reads them', () => {
  const cfg = shopCfg();
  const g = shopGame({ cash: 0 });
  it('an owned look of its slot, an earned look, or the yard\'s own; anything else notOwned; the frame draws the choice; no rule reads it', async () => {
    const { chooseLook } = await import('./actionsMoney');
    const { frameCfg } = await import('./frame');
    const { jump } = await import('./tick');
    const owned = { ...g, entitlements: { noAds: false, skipRewarded: false, products: ['colour2'], multipliers: {} } } as SalvageGame;
    const ev: import('./types').SalvageEvent[] = [];
    expect(chooseLook(cfg, owned, 'colour', 'colour3', 0, ev)).toBe(owned);
    expect(chooseLook(cfg, owned, 'dressing', 'colour2', 0, ev)).toBe(owned);
    expect(chooseLook(cfg, owned, 'sign', 'rung5', 0, ev)).toBe(owned);
    expect(ev.map((e) => e.type === 'refused' && e.key)).toEqual(['notOwned', 'notOwned', 'notOwned']);
    let x = chooseLook(cfg, owned, 'colour', 'colour2', 0);
    x = chooseLook(cfg, x, 'sign', 'rung4', 0);
    expect(x.salvage.iap.looks).toMatchObject({ colour: 'colour2', sign: 'rung4' });
    expect(frameCfg(cfg, x).looks).toMatchObject({ colour: 'colour2', sign: 'rung4', dressing: null, plaque: null });
    expect(frameCfg(cfg, g).looks).toBeUndefined();
    expect(chooseLook(cfg, x, 'colour', null, 0).salvage.iap.looks.colour).toBeNull();
    // no rule reads a look: a minute of the yard is the same with and without it
    const a = jump(cfg, owned, owned.salvage.t + 60);
    const b = jump(cfg, x, x.salvage.t + 60);
    expect(b.cash).toBe(a.cash);
    expect(b.salvage.ladder).toEqual(a.salvage.ladder);
  });
});
