/// <reference types="node" />
/**
 * The shared purchase service (yard-stage2.md 2.15.5, 9.1; RULING2 section 15), with a stand-in purchase
 * module: a paid purchase resolves the listing returned with it (the ids every later listing uses) and
 * keeps the result's own id for analytics; a purchase waiting for approval resolves pending, and every
 * error that does not prove nothing was charged resolves unconfirmed (both keep the old failure word for
 * the games that read it); cancel is not a failure; the account's listing is read afresh (cache
 * invalidated first) and delivered again by one native listener per JS context; restore is unchanged;
 * without the module (Expo Go) a purchase is simulated with a made-up id that lists only itself. Every
 * listing carries the store's own request time (customer info's requestDate; null when unreadable, never
 * the device's clock; the simulation's own clock in Expo Go), RULING2 15.12 a.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  module: true,
  purchase: null as null | (() => Promise<unknown>),
  info: { nonSubscriptionTransactions: [] as { transactionIdentifier: string; productIdentifier: string; purchaseDate: string }[] } as {
    nonSubscriptionTransactions: { transactionIdentifier: string; productIdentifier: string; purchaseDate: string }[];
    requestDate?: string;
  },
  listener: null as null | ((info: unknown) => void),
  listens: 0,
  removed: [] as unknown[],
  invalidations: 0,
  invalidateFails: false,
  infoFails: false,
}));

const PRODUCTS = [
  { id: 'test_pack2', title: 'Pack', kind: 'hoursOfIncome', value: 2, fallbackPrice: '$1.99', highlight: false },
  { id: 'test_look', title: 'Look', kind: 'cosmetic', value: 1, fallbackPrice: '$1.99', highlight: false },
];

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('../config/game', () => ({ baseGame: { monetization: { iap: { revenueCatIosKey: 'test-key', products: PRODUCTS } } } }));
vi.mock('./firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} } }));
vi.mock('./native', () => ({ isExpoGo: false }));
vi.mock('./sdks', () => ({
  loadPurchases: () =>
    h.module
      ? {
          configure: () => {},
          PRODUCT_CATEGORY: { NON_SUBSCRIPTION: 'NON_SUBSCRIPTION' },
          getProducts: async (ids: string[]) => ids.map((identifier) => ({ identifier, priceString: '$1.99', price: 1.99, currencyCode: 'USD' })),
          purchaseStoreProduct: async () => h.purchase!(),
          getCustomerInfo: async () => {
            if (h.infoFails) throw new Error('offline');
            return h.info;
          },
          invalidateCustomerInfoCache: async () => {
            h.invalidations++;
            if (h.invalidateFails) throw new Error('cannot invalidate');
          },
          restorePurchases: async () => h.info,
          addCustomerInfoUpdateListener: (fn: (info: unknown) => void) => {
            h.listens++;
            h.listener = fn;
          },
          removeCustomerInfoUpdateListener: (fn: unknown) => {
            h.removed.push(fn);
            return true;
          },
        }
      : null,
}));

async function service(module = true, dev = false) {
  vi.resetModules();
  h.module = module;
  h.listener = null;
  h.listens = 0;
  h.removed = [];
  h.invalidations = 0;
  h.invalidateFails = false;
  h.infoFails = false;
  (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  const { iap } = await import('./iap');
  await iap.init();
  return iap;
}
const pack = PRODUCTS[0] as never;

afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as { __DEV__?: boolean }).__DEV__;
  delete (globalThis as Record<string, unknown>).__itfIapNativeListener;
});
const tx = (id: string, product: string, date: string) => ({ transactionIdentifier: id, productIdentifier: product, purchaseDate: date });

describe('purchase', () => {
  it("resolves ok with the listing returned with the purchase (one namespace of ids); the result's own id is for analytics only", async () => {
    const iap = await service();
    h.purchase = async () => ({
      productIdentifier: 'test_pack2',
      transaction: { transactionIdentifier: 'GPA.1', productIdentifier: 'test_pack2', purchaseDate: '2026-11-26T05:00:00Z' },
      customerInfo: { requestDate: '2026-11-26T05:00:02Z', nonSubscriptionTransactions: [tx('o1_old', 'test_pack2', '2026-11-20T05:00:00Z'), tx('o1_new', 'test_pack2', '2026-11-26T05:00:00Z')] },
    });
    expect(await iap.purchase(pack)).toEqual({
      ok: true,
      txId: 'GPA.1',
      purchasedMs: Date.parse('2026-11-26T05:00:00Z'),
      listed: [
        { productId: 'test_pack2', txId: 'o1_old', purchasedMs: Date.parse('2026-11-20T05:00:00Z') },
        { productId: 'test_pack2', txId: 'o1_new', purchasedMs: Date.parse('2026-11-26T05:00:00Z') },
      ],
      requestMs: Date.parse('2026-11-26T05:00:02Z'),
    });
  });

  it("no device time stands in for a store date it cannot read (15.8); no customer info: no listing", async () => {
    const iap = await service();
    h.purchase = async () => ({ productIdentifier: 'test_pack2', transaction: { transactionIdentifier: 'GPA.2', productIdentifier: 'test_pack2', purchaseDate: 'garbled' } });
    expect(await iap.purchase(pack)).toEqual({ ok: true, txId: 'GPA.2', purchasedMs: null, listed: null, requestMs: null });
  });

  it('waiting for approval resolves pending; the failure word stays what the games without a grant route read before', async () => {
    const iap = await service();
    h.purchase = async () => {
      throw Object.assign(new Error('pending'), { code: '20', userCancelled: false });
    };
    expect(await iap.purchase(pack)).toEqual({ ok: false, pending: true });
    expect(iap.lastFailure).toBe('failed');
  });

  it('cancelled is not a failure; an error is', async () => {
    const iap = await service();
    h.purchase = async () => {
      throw Object.assign(new Error('cancel'), { userCancelled: true });
    };
    expect(await iap.purchase(pack)).toEqual({ ok: false });
    expect(iap.lastFailure).toBeNull();
    h.purchase = async () => {
      throw Object.assign(new Error('not allowed'), { code: '3' });
    };
    expect(await iap.purchase(pack)).toEqual({ ok: false });
    expect(iap.lastFailure).toBe('failed');
  });

  it('only "not allowed", "invalid" and "not for sale" prove nothing was charged; every other error is unconfirmed (failure word unchanged)', async () => {
    const iap = await service();
    for (const code of ['3', '4', '5', 3]) {
      h.purchase = async () => {
        throw Object.assign(new Error('refused'), { code });
      };
      expect(await iap.purchase(pack), String(code)).toEqual({ ok: false });
      expect(iap.lastFailure).toBe('failed');
    }
    for (const code of ['0', '2', '10', '12', '35', 10, undefined]) {
      h.purchase = async () => {
        throw Object.assign(new Error('after the charge?'), { code });
      };
      expect(await iap.purchase(pack), String(code)).toEqual({ ok: false, unconfirmed: true });
      expect(iap.lastFailure).toBe('failed');
    }
    h.purchase = async () => {
      throw 'a bare string';
    };
    expect(await iap.purchase(pack)).toEqual({ ok: false, unconfirmed: true });
  });

  it('without the purchase module (Expo Go), a development build simulates: a made-up id, dated when the sheet closes; a release refuses', async () => {
    const iap = await service(false, true);
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 26, 6), toFake: ['Date', 'setTimeout'] });
    const p = iap.purchase(pack);
    await vi.advanceTimersByTimeAsync(400);
    const r = await p;
    const sim = { productId: 'test_pack2', txId: expect.stringMatching(/^sim:test_pack2:\d+:\d+$/), purchasedMs: Date.UTC(2026, 10, 26, 6) + 400 };
    expect(r, "the simulation's own clock is its request time").toEqual({ ok: true, txId: sim.txId, purchasedMs: sim.purchasedMs, listed: [sim], requestMs: sim.purchasedMs });
    expect((r as { listed: { txId: string }[] }).listed[0].txId, 'the listing names the purchase by its own made-up id').toBe((r as { txId: string }).txId);
    const q = iap.purchase(pack);
    await vi.advanceTimersByTimeAsync(400);
    expect((await q as { txId: string }).txId, 'every simulated purchase has its own id').not.toBe((r as { txId: string }).txId);
    expect(await iap.listing(), 'the simulated store cannot be asked').toBeNull();
    expect(await iap.knownIds('test_pack2')).toBeNull();
    vi.useRealTimers();
    const release = await service(false, false);
    expect(await release.purchase(pack)).toEqual({ ok: false });
    expect(release.lastFailure).toBe('unavailable');
  });
});

describe('the listing, the listener and restore', () => {
  it('lists every completed non-subscription transaction (consumables included), read afresh; an unreadable date is null, a missing id left out', async () => {
    const iap = await service();
    h.info = { requestDate: '2026-11-26T01:00:05Z', nonSubscriptionTransactions: [tx('a', 'test_pack2', '2026-11-26T01:00:00Z'), tx('b', 'test_look', '2026-11-25T01:00:00Z'), tx('c', 'test_pack2', 'not a date'), tx('', 'test_pack2', '2026-11-26T01:00:00Z')] };
    expect(await iap.listing()).toEqual({
      txs: [
        { productId: 'test_pack2', txId: 'a', purchasedMs: Date.parse('2026-11-26T01:00:00Z') },
        { productId: 'test_look', txId: 'b', purchasedMs: Date.parse('2026-11-25T01:00:00Z') },
        { productId: 'test_pack2', txId: 'c', purchasedMs: null },
      ],
      fresh: true,
      requestMs: Date.parse('2026-11-26T01:00:05Z'),
    });
    expect(h.invalidations, 'the cache is invalidated before every read').toBe(1);
    expect(await iap.knownIds('test_pack2')).toEqual(['a', 'c']);
    expect(h.invalidations).toBe(2);
  });

  it("the store's request time is its own: an unreadable or missing requestDate is null, never the device's clock", async () => {
    const iap = await service();
    h.info = { requestDate: 'garbled', nonSubscriptionTransactions: [] };
    expect(await iap.listing()).toEqual({ txs: [], fresh: true, requestMs: null });
    h.info = { nonSubscriptionTransactions: [] };
    expect((await iap.listing())!.requestMs).toBeNull();
  });

  it('a cache that cannot be invalidated gives a listing that is not fresh; a store that cannot be asked gives null', async () => {
    const iap = await service();
    h.info = { nonSubscriptionTransactions: [tx('a', 'test_pack2', '2026-11-26T01:00:00Z')] };
    h.invalidateFails = true;
    expect((await iap.listing())!.fresh).toBe(false);
    h.infoFails = true;
    expect(await iap.listing()).toBeNull();
    expect(await iap.knownIds('test_pack2')).toBeNull();
  });

  it('the listener registers once with the store and delivers each update to every receiver, never as fresh', async () => {
    const iap = await service();
    const got: unknown[] = [];
    iap.onTransactions((t) => got.push(t));
    iap.onTransactions((t) => got.push(t));
    expect(h.listens).toBe(1);
    h.listener!({ requestDate: '2026-11-26T09:00:07Z', nonSubscriptionTransactions: [tx('late', 'test_pack2', '2026-11-26T09:00:00Z')] });
    const one = { txs: [{ productId: 'test_pack2', txId: 'late', purchasedMs: Date.parse('2026-11-26T09:00:00Z') }], fresh: false, requestMs: Date.parse('2026-11-26T09:00:07Z') };
    expect(got).toEqual([one, one]);
  });

  it('one native listener per JS context: a service made again (a development reload) removes the earlier one; the last unsubscribe removes it too', async () => {
    const first = await service();
    first.onTransactions(() => {});
    const firstNative = h.listener;
    // A reload: a new module instance, the same JS context.
    vi.resetModules();
    const { iap: second } = await import('./iap');
    await second.init();
    const off = second.onTransactions(() => {});
    expect(h.listens).toBe(2);
    expect(h.removed, "the earlier service's native listener is removed first").toEqual([firstNative]);
    const secondNative = h.listener;
    off();
    expect(h.removed).toEqual([firstNative, secondNative]);
  });

  it('without the module: no listener, nothing delivered', async () => {
    const iap = await service(false, true);
    iap.onTransactions(() => {
      throw new Error('never');
    });
    expect(h.listens).toBe(0);
  });

  it('restore returns the product ids as before (the store filters non-consumables)', async () => {
    const iap = await service();
    h.info = { nonSubscriptionTransactions: [tx('a', 'test_pack2', '2026-11-26T01:00:00Z'), tx('b', 'test_look', '2026-11-25T01:00:00Z')] };
    expect(await iap.restore()).toEqual(['test_pack2', 'test_look']);
  });
});
