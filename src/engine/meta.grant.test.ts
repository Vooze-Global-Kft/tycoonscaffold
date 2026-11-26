/**
 * The one case src/engine/meta.ts hands to a mode (yard-stage2.md 2.15.5, B5): a `hoursOfIncome`
 * product goes to the installed mode's grantProduct with its arrival (id, store date, own quote or none); without such a
 * mode it grants nothing; afterListing reaches the mode only with the grant route; applyProduct never grants it (never the shared time warp); every other kind
 * through grantPurchase is exactly applyProduct.
 */
import { afterEach, describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema, type IapProduct } from '../config/schema';
import { createInitialState } from './economy';
import { afterListing, applyProduct, grantPurchase, grantsHoursOfIncome, isNonConsumable } from './meta';
import { installEngineMode, type EngineMode, type ProductArrival, type ProductListing } from './mode';
import type { GameState } from './types';

const raw = JSON.parse(JSON.stringify(pizza));
raw.monetization.iap.products.push({ id: 'test_pack2', title: 'Pack', kind: 'hoursOfIncome', value: 2 });
const cfg = GameConfigSchema.parse(raw);
const pack = cfg.monetization.iap.products.find((p) => p.id === 'test_pack2') as IapProduct;
const NOW = Date.UTC(2026, 10, 26, 12);

const calls: unknown[][] = [];
const double = (withGrant: boolean): EngineMode => ({
  id: 'sim',
  saveTag: 't',
  create: (_c, b) => b,
  reconcile: (_c, b) => b,
  tick: (_c, s) => s,
  income: () => 0,
  activeIncome: () => 0,
  offline: (_c, s) => ({ seconds: 0, earnings: 0, game: s }),
  prestige: (_c, s) => s,
  ...(withGrant
    ? {
        grantProduct: (_c: unknown, s: GameState, a: ProductArrival) => {
          calls.push([a.productId, a.txId, a.purchasedMs, a.own]);
          return { ...s, cash: s.cash + 5 };
        },
        afterListing: (_c: unknown, s: GameState, l: ProductListing, now: number) => {
          calls.push(['listing', l.txs.length, l.fresh, now]);
          return { ...s, cash: s.cash + 1 };
        },
      }
    : {}),
});

afterEach(() => {
  installEngineMode(null);
  calls.length = 0;
});

describe('hoursOfIncome in the shared purchase code', () => {
  it('is a consumable, and applyProduct grants nothing for it (no time warp, no cash)', () => {
    const s = createInitialState(cfg, NOW);
    expect(isNonConsumable(pack)).toBe(false);
    const r = applyProduct(cfg, s, pack, NOW);
    expect(r.state.cash).toBe(s.cash);
    expect(r.state.entitlements).toEqual(s.entitlements);
    expect(r.granted).toEqual([]);
  });

  it('grantPurchase hands it to the mode with its txId, store date and own quote (or none)', () => {
    installEngineMode(double(true));
    const s = createInitialState(cfg, NOW);
    expect(grantsHoursOfIncome(cfg)).toBe(true);
    const r = grantPurchase(cfg, s, pack, { txId: 'tx-9', purchasedMs: NOW - 7, own: { atMs: NOW - 9 } }, NOW);
    grantPurchase(cfg, s, pack, { txId: 'tx-10', purchasedMs: null, own: null }, NOW);
    expect(calls).toEqual([
      ['test_pack2', 'tx-9', NOW - 7, { atMs: NOW - 9 }],
      ['test_pack2', 'tx-10', null, null],
    ]);
    expect(r.state.cash).toBe(s.cash + 5);
  });

  it('afterListing reaches the mode only with the grant route; otherwise the same object', () => {
    const s = createInitialState(cfg, NOW);
    const l: ProductListing = { txs: [{ productId: 'test_pack2', txId: 'a', purchasedMs: NOW }], fresh: true };
    expect(afterListing(cfg, s, l, NOW), 'no mode').toBe(s);
    installEngineMode(double(false));
    expect(afterListing(cfg, s, l, NOW), 'a mode without grantProduct').toBe(s);
    installEngineMode(double(true));
    expect(afterListing(GameConfigSchema.parse(pizza), s, l, NOW), 'a game without the kind').toBe(s);
    expect(afterListing(cfg, s, l, NOW).cash).toBe(s.cash + 1);
    expect(calls).toEqual([['listing', 1, true, NOW]]);
  });

  it('without a mode that grants (none installed, or one without grantProduct): the same object', () => {
    const s = createInitialState(cfg, NOW);
    expect(grantsHoursOfIncome(cfg)).toBe(false);
    expect(grantPurchase(cfg, s, pack, { txId: 'tx', purchasedMs: NOW, own: null }, NOW).state).toBe(s);
    installEngineMode(double(false));
    expect(grantsHoursOfIncome(cfg)).toBe(false);
    expect(grantPurchase(cfg, s, pack, { txId: 'tx', purchasedMs: NOW, own: null }, NOW).state).toBe(s);
  });

  it('every other kind through grantPurchase is exactly applyProduct, and never reaches the mode', () => {
    installEngineMode(double(true));
    const s = createInitialState(cfg, NOW);
    for (const p of cfg.monetization.iap.products.filter((x) => x.kind !== 'hoursOfIncome')) {
      expect(grantPurchase(cfg, s, p, { txId: 'tx', purchasedMs: NOW, own: null }, NOW)).toEqual(applyProduct(cfg, s, p, NOW));
    }
    expect(calls).toEqual([]);
  });

  it('a game without the kind never grants through a mode, even one with grantProduct', () => {
    installEngineMode(double(true));
    expect(grantsHoursOfIncome(GameConfigSchema.parse(pizza))).toBe(false);
  });
});
