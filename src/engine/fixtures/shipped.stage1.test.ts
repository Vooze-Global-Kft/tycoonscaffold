/// <reference types="node" />
/**
 * M1 (blocking; rulings 19.9, 21.8 and 22 M1; s2-fix-content): STAGE 2'S PRODUCTS ARE NOT IN THE FIRST YARD'S BUILD.
 * On the REAL games/scrap-yard/game.json (release.stage 1, as on the owner's phone):
 *   - the shared product list (monetization.iap.products) is empty, so grantsHoursOfIncome is false for the config;
 *   - the mode's own block (salvage.iap.products) holds the sixteen products, dark at stage 1 (stageView);
 *   - the REAL shared store, booted with the REAL salvage mode, asks the store for no product, reads no listing and
 *     subscribes no purchase listener; the ad SDK is not started (ads.initOn 'firstOffer' and no offer at stage 1);
 *   - the one stage-2 helper (fixtures/shipped2.ts) gives the shared list mirrored from the mode's block, entry for
 *     entry, and the shop's functions read sixteen products from it.
 * The store harness is the money attacker's (attack/s2/s2-attack-money/store.test.ts, S0), moved here.
 */
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreListing } from '../../services/iap';

const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8'));

const h = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  raw: null as unknown,
  owned: [] as string[],
  listeners: [] as ((l: StoreListing) => void)[],
  calls: { listing: 0, onTransactions: 0, init: 0, iapInit: 0, firstOffer: 0, setAudience: [] as unknown[] },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => h.storage.get(k) ?? null,
    setItem: async (k: string, v: string) => void h.storage.set(k, v),
    removeItem: async (k: string) => void h.storage.delete(k),
  },
}));
vi.mock('../../generated/activeGame', () => ({
  ACTIVE_GAME_ID: 'scrap-yard',
  get rawGame() {
    return h.raw;
  },
  fxTable: {},
  gameAssets: {},
  gameSounds: {},
  displayFontMetrics: null,
}));
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../../services/ads', () => ({
  ads: {
    showRewarded: async () => true,
    maybeShowInterstitial: () => {},
    init: () => void h.calls.init++,
    firstOffer: async () => void h.calls.firstOffer++,
    setAudience: (a: unknown) => void h.calls.setAudience.push(a),
    interstitials: true,
  },
}));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({
  iap: {
    init: async () => void h.calls.iapInit++,
    owned: async () => h.owned,
    live: false,
    lastFailure: null,
    purchase: async () => ({ ok: false }),
    restore: async () => [],
    listing: async () => {
      h.calls.listing++;
      return { txs: [], fresh: true, requestMs: Date.now() };
    },
    onTransactions: (fn: (l: StoreListing) => void) => {
      h.calls.onTransactions++;
      h.listeners.push(fn);
      return () => {
        h.listeners = h.listeners.filter((l) => l !== fn);
      };
    },
  },
}));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

const flush = () => new Promise((r) => setTimeout(r, 0));

async function boot(raw: unknown) {
  vi.resetModules();
  h.raw = structuredClone(raw);
  const { installEngineMode } = await import('../mode');
  const { salvageEngineMode } = await import('../salvageMode');
  installEngineMode(salvageEngineMode);
  const { baseGame } = await import('../../config/game');
  Object.assign(baseGame, salvageEngineMode.config!(baseGame));
  const { useGame } = await import('../../state/store');
  const M = await import('../meta');
  useGame.setState({ hydrated: false, offline: null });
  await useGame.getState().boot();
  await flush();
  return { useGame, M, baseGame };
}

beforeEach(() => {
  h.storage.clear();
  h.owned = [];
  h.listeners = [];
  h.calls = { listing: 0, onTransactions: 0, init: 0, iapInit: 0, firstOffer: 0, setAudience: [] };
  delete (globalThis as Record<string, unknown>).__itfStoreTxUnsubscribe;
});
afterEach(async () => {
  (await import('../mode')).installEngineMode(null);
});

describe('M1: the real game.json at release.stage 1 sells nothing and asks the store for nothing', () => {
  it('the shipped content is at release.stage 1; the shared list is empty; the mode holds the sixteen; ads.initOn firstOffer', () => {
    expect(RAW.salvage.release.stage).toBe(1);
    expect(RAW.monetization.iap.products).toEqual([]);
    expect(RAW.monetization.ads.initOn).toBe('firstOffer');
    const prods = RAW.salvage.iap.products as { id: string; kind: string; value?: number }[];
    expect(prods).toHaveLength(16);
    expect(prods.filter((p) => p.kind === 'cosmetic')).toHaveLength(11);
    expect(prods.filter((p) => p.kind === 'skipAds').map((p) => p.id)).toEqual(['yard_skipAds']);
    expect(prods.filter((p) => p.kind === 'hoursOfIncome').map((p) => p.value)).toEqual([2, 5, 10, 20]);
    expect(prods.every((p) => p.id.startsWith('yard_'))).toBe(true);
  });

  it('the real store booted with the real mode at stage 1: grantsHoursOfIncome false, no listing read, no listener, no ad start', async () => {
    const b = await boot(RAW);
    const cfg = b.useGame.getState().cfg;
    expect(cfg.monetization.iap.products).toEqual([]);
    expect(b.baseGame.monetization.iap.products).toEqual([]);
    expect(b.M.grantsHoursOfIncome(cfg)).toBe(false);
    for (const p of RAW.salvage.iap.products) expect(cfg.monetization.iap.products.some((x: { id: string }) => x.id === p.id), p.id).toBe(false);
    expect({ listingReads: h.calls.listing, listeners: h.calls.onTransactions, adsInit: h.calls.init, firstOffer: h.calls.firstOffer }).toEqual({ listingReads: 0, listeners: 0, adsInit: 0, firstOffer: 0 });
    expect(h.calls.setAudience.every((a) => a === null)).toBe(true);
    // the mode's block stays dark at stage 1 (stageView): the rules read no shop
    expect((cfg as unknown as { salvage: { iap?: unknown } }).salvage.iap).toBeUndefined();
  });

  it('the same game through the one stage-2 helper: the shared list is the mode\'s block, and the store reads it (a listener for packs)', async () => {
    const { shipped2Raw, shipped2Config, modeProducts } = await import('./shipped2');
    const raw2 = shipped2Raw<typeof RAW>(RAW);
    expect(raw2.salvage.release.stage).toBe(2);
    expect(raw2.monetization.iap.products).toEqual(RAW.salvage.iap.products);
    expect(modeProducts(RAW)).toEqual(RAW.salvage.iap.products);
    // the helper leaves the real file's objects alone
    expect(RAW.monetization.iap.products).toEqual([]);
    const shop = await import('../salvage/shop');
    const c2 = shipped2Config(RAW);
    expect(shop.productsOf(c2)).toHaveLength(16);
    expect(shop.packHours(c2, 'yard_pack20')).toBe(20);
    expect(shop.noAdsProduct(c2)).toBe('yard_skipAds');
    const b = await boot(raw2);
    expect(b.M.grantsHoursOfIncome(b.useGame.getState().cfg)).toBe(true);
    expect(h.calls.onTransactions).toBe(1);
  });
});
