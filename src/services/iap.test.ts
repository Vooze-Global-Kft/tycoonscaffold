/// <reference types="node" />
/**
 * The shared purchase service (yard-stage2.md 2.15.5, 9.1), with a stand-in purchase module: a purchase
 * resolves { ok, txId, purchasedMs } from the store's transaction; a purchase waiting for approval
 * resolves pending (and keeps the old failure word for the games that read it); cancel is not a
 * failure; the account's transactions are listed for the reconcile and delivered again by the listener;
 * restore is unchanged; without the module (Expo Go) a purchase is simulated with a made-up id.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  module: true,
  purchase: null as null | (() => Promise<unknown>),
  info: { nonSubscriptionTransactions: [] as { transactionIdentifier: string; productIdentifier: string; purchaseDate: string }[] },
  listener: null as null | ((info: unknown) => void),
  listens: 0,
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
          getCustomerInfo: async () => h.info,
          restorePurchases: async () => h.info,
          addCustomerInfoUpdateListener: (fn: (info: unknown) => void) => {
            h.listens++;
            h.listener = fn;
          },
        }
      : null,
}));

async function service(module = true, dev = false) {
  vi.resetModules();
  h.module = module;
  h.listener = null;
  h.listens = 0;
  (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  const { iap } = await import('./iap');
  await iap.init();
  return iap;
}
const pack = PRODUCTS[0] as never;

afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as { __DEV__?: boolean }).__DEV__;
});

describe('purchase', () => {
  it("resolves ok with the store's transaction id and date", async () => {
    const iap = await service();
    h.purchase = async () => ({ productIdentifier: 'test_pack2', transaction: { transactionIdentifier: 'GPA.1', productIdentifier: 'test_pack2', purchaseDate: '2026-11-26T05:00:00Z' } });
    expect(await iap.purchase(pack)).toEqual({ ok: true, txId: 'GPA.1', purchasedMs: Date.parse('2026-11-26T05:00:00Z') });
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
      throw Object.assign(new Error('boom'), { code: '2' });
    };
    expect(await iap.purchase(pack)).toEqual({ ok: false });
    expect(iap.lastFailure).toBe('failed');
  });

  it('without the purchase module (Expo Go), a development build simulates: a made-up id, dated when the sheet closes; a release refuses', async () => {
    const iap = await service(false, true);
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 26, 6), toFake: ['Date', 'setTimeout'] });
    const p = iap.purchase(pack);
    await vi.advanceTimersByTimeAsync(400);
    const r = await p;
    expect(r).toEqual({ ok: true, txId: expect.stringMatching(/^sim:test_pack2:\d+:\d+$/), purchasedMs: Date.UTC(2026, 10, 26, 6) + 400 });
    const q = iap.purchase(pack);
    await vi.advanceTimersByTimeAsync(400);
    expect((await q as { txId: string }).txId, 'every simulated purchase has its own id').not.toBe((r as { txId: string }).txId);
    expect(await iap.transactions()).toEqual([]);
    vi.useRealTimers();
    const release = await service(false, false);
    expect(await release.purchase(pack)).toEqual({ ok: false });
    expect(release.lastFailure).toBe('unavailable');
  });
});

describe('transactions, the listener and restore', () => {
  const tx = (id: string, product: string, date: string) => ({ transactionIdentifier: id, productIdentifier: product, purchaseDate: date });

  it('lists every completed non-subscription transaction (consumables included); one without a date is left out', async () => {
    const iap = await service();
    h.info = { nonSubscriptionTransactions: [tx('a', 'test_pack2', '2026-11-26T01:00:00Z'), tx('b', 'test_look', '2026-11-25T01:00:00Z'), tx('c', 'test_pack2', 'not a date')] };
    expect(await iap.transactions()).toEqual([
      { productId: 'test_pack2', txId: 'a', purchasedMs: Date.parse('2026-11-26T01:00:00Z') },
      { productId: 'test_look', txId: 'b', purchasedMs: Date.parse('2026-11-25T01:00:00Z') },
    ]);
  });

  it('the listener registers once with the store and delivers each update to every receiver', async () => {
    const iap = await service();
    const got: unknown[] = [];
    iap.onTransactions((t) => got.push(t));
    iap.onTransactions((t) => got.push(t));
    expect(h.listens).toBe(1);
    h.listener!({ nonSubscriptionTransactions: [tx('late', 'test_pack2', '2026-11-26T09:00:00Z')] });
    expect(got).toEqual([
      [{ productId: 'test_pack2', txId: 'late', purchasedMs: Date.parse('2026-11-26T09:00:00Z') }],
      [{ productId: 'test_pack2', txId: 'late', purchasedMs: Date.parse('2026-11-26T09:00:00Z') }],
    ]);
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
