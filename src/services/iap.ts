/**
 * In-app purchases through RevenueCat. One RevenueCat project can hold every
 * game as a separate app, with one dashboard for revenue per game.
 *
 * Product ids come from game.json. Create the same ids in App Store Connect,
 * Play Console and RevenueCat. Non-consumables (noAds, skipAds, multiplier,
 * starterPack, clearance, unlock: engine/meta isNonConsumable) are restored from
 * the store and re-granted at boot, and a mode with its own engine applies them to
 * the run in progress (store.ts applyProductNow: Hangar Expansion's drones);
 * consumables (gems, timeWarp) are granted once per purchase. A `hoursOfIncome` consumable is granted
 * by the mode (src/engine/mode.ts grantProduct; RULING2 section 15): a transaction is known by the id
 * the store's LISTING (customer info's non-subscription transactions) gives it, and the result of a
 * purchase is read through that same listing (`listed`), never through a second id. `listing` reads
 * the account's transactions afresh (for the check at start and for a quote's `known` at Buy),
 * `onTransactions` delivers purchases approved later (Ask to Buy, a slow card).
 */
import { Platform } from 'react-native';
import { baseGame } from '../config/game';
import type { IapProduct } from '../config/schema';
import { analytics, crash } from './firebase';
import { isExpoGo } from './native';
import { loadPurchases } from './sdks';

type RC = typeof import('react-native-purchases').default;
type StoreProduct = import('react-native-purchases').PurchasesStoreProduct;

export { isNonConsumable } from '../engine/meta';

const apiKey = Platform.OS === 'ios' ? baseGame.monetization.iap.revenueCatIosKey : baseGame.monetization.iap.revenueCatAndroidKey;
const Purchases: RC | null = apiKey && !isExpoGo && Platform.OS !== 'web' ? loadPurchases() : null;

/** The button label while the store has not returned a product: never a typed price (policy P7). */
export const PRICE_UNAVAILABLE = 'Unavailable';

/** Background retries of the product fetch while some products are missing: 30 s, doubling, at most 5 min. */
const RETRY_FIRST_MS = 30_000;
const RETRY_MAX_MS = 5 * 60_000;

/** Why the last purchase failed, so the store can say so (null: it worked, or the player cancelled). */
export type PurchaseFailure = 'unavailable' | 'failed' | null;

/**
 * What a purchase came to. ok: paid. `listed` is the store account's listing returned with the
 * purchase (customer info's non-subscription transactions, in the ids every later listing uses; null
 * when the store returned none); a grant by id reads the purchase from it (RULING2 15.2). `txId` and
 * `purchasedMs` are the purchase result's own transaction, for analytics only (on a store they may be
 * the store's id, not the listing's; '' and null when absent; no device time stands in for a store date).
 * `requestMs` is the store's own time of the answer that carried `listed` (customer info's
 * `requestDate`; null when it cannot be read; RULING2 15.12 a). A simulated purchase (Expo Go,
 * development builds) lists only itself, with its made-up id, and its requestMs is the simulation's
 * own clock (the device's: no money is involved there).
 * Not ok: cancelled (lastFailure null), refused or unavailable (lastFailure 'failed' / 'unavailable':
 * nothing was charged), `pending` (the store waits for an approval: a parent's Ask to Buy, a slow
 * payment method) or `unconfirmed` (any other store error: it does not prove that nothing was
 * charged, so a transaction may still arrive through `onTransactions` or `listing`). lastFailure is
 * 'failed' for pending and unconfirmed too, as before, so the games without a grant route say what
 * they said before.
 */
export type PurchaseResult =
  | { ok: true; txId: string; purchasedMs: number | null; listed: StoreTransaction[] | null; requestMs: number | null }
  | { ok: false; pending?: true; unconfirmed?: true };

/** One completed non-subscription transaction the store reports. */
export interface StoreTransaction {
  productId: string;
  /** The id the store's listing gives it. */
  txId: string;
  /** The store's purchase date, ms since the epoch; null when it could not be read (information only). */
  purchasedMs: number | null;
}

/**
 * The store account's transactions as one listing. `fresh`: read from the network just now (the cache
 * invalidated first). `requestMs`: the store's own time of this answer (RevenueCat: customer info's
 * `requestDate`), null when it cannot be read; never the device's clock (RULING2 15.12 a: the 72 hours
 * of a standing quote are measured on it, by the mode; the shared layer decides nothing with it).
 */
export interface StoreListing {
  txs: StoreTransaction[];
  fresh: boolean;
  requestMs: number | null;
}

type RcTransaction = import('react-native-purchases').PurchasesStoreTransaction;

/** RevenueCat's error code for a purchase waiting for approval (PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR). */
const PAYMENT_PENDING = '20';
/**
 * RevenueCat's error codes that prove the store charged nothing (PURCHASES_ERROR_CODE): PURCHASE_NOT_ALLOWED
 * 3, PURCHASE_INVALID 4, PRODUCT_NOT_AVAILABLE_FOR_PURCHASE 5. Every other error (NETWORK_ERROR 10,
 * STORE_PROBLEM 2, UNKNOWN 0, UNEXPECTED_BACKEND_RESPONSE 12, ...) may come after a charge: unconfirmed.
 */
const NOTHING_CHARGED = new Set(['3', '4', '5']);

/** The store's transactions as StoreTransaction; one without an id is left out (it cannot be granted by id); an unreadable date is null. */
function toTransactions(list: readonly RcTransaction[] | undefined): StoreTransaction[] {
  const out: StoreTransaction[] = [];
  for (const t of list ?? []) {
    if (!t.transactionIdentifier) {
      crash.record(new Error(`store transaction without id: ${t.productIdentifier}`), 'iap.transactions');
      continue;
    }
    const dated = Date.parse(t.purchaseDate);
    out.push({ productId: t.productIdentifier, txId: t.transactionIdentifier, purchasedMs: Number.isFinite(dated) ? dated : null });
  }
  return out;
}

/** The store's own time of a customer-info answer (its `requestDate`), or null when it cannot be read. */
function requestTime(info: { requestDate?: string } | null | undefined): number | null {
  const at = info?.requestDate ? Date.parse(info.requestDate) : NaN;
  return Number.isFinite(at) ? at : null;
}

type CustomerInfoListener = Parameters<RC['addCustomerInfoUpdateListener']>[0];
/**
 * The one native customer-info listener of this JS context (RULING2 15.8). It lives outside any
 * IapService: a development reload makes a new service, which first removes the listener the
 * previous one added, so an old store never hears the store again.
 */
const NATIVE_SLOT = '__itfIapNativeListener';
type Slot = { [NATIVE_SLOT]?: CustomerInfoListener };

/** Counts simulated purchases, so two in one millisecond still get two ids. */
let simSeq = 0;

class IapService {
  private products = new Map<string, StoreProduct>();
  private configured = false;
  private listeners = new Set<() => void>();
  private retryMs = RETRY_FIRST_MS;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Set by purchase(): why it returned false. */
  lastFailure: PurchaseFailure = null;
  /** Products whose payment sheet is open: a second purchase of the same one waits for nothing and fails. */
  private buying = new Set<string>();
  private txListeners = new Set<(listing: StoreListing) => void>();
  private listening: CustomerInfoListener | null = null;

  /** True when real purchases are possible. Otherwise purchases are simulated in dev builds. */
  get live() {
    return Purchases !== null;
  }

  async init(): Promise<void> {
    if (!Purchases || this.configured) return;
    try {
      Purchases.configure({ apiKey: apiKey! });
      this.configured = true;
      await this.loadProducts();
    } catch (e) {
      crash.record(e, 'iap.init');
    }
  }

  /**
   * Fetches store products. Retried in the background while any is missing (offline at launch, a
   * product not approved yet) and at purchase time, so prices appear without a restart.
   */
  private async loadProducts(): Promise<void> {
    if (!Purchases || !this.configured) return;
    const ids = baseGame.monetization.iap.products.map((p) => p.id);
    try {
      const found = await Purchases.getProducts(ids, Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
      const before = this.products.size;
      found.forEach((p) => this.products.set(p.identifier, p));
      if (this.products.size !== before) this.emit();
    } finally {
      this.scheduleRetry(ids);
    }
  }

  private scheduleRetry(ids: string[]) {
    if (this.retryTimer || ids.every((id) => this.products.has(id))) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.loadProducts().catch((e) => crash.record(e, 'iap.products.retry'));
    }, this.retryMs);
    this.retryMs = Math.min(RETRY_MAX_MS, this.retryMs * 2);
  }

  /** Called when prices arrive from the store. Returns an unsubscribe function. */
  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  /**
   * True when this product can be bought now: the store returned it, or (development only) the
   * purchase is simulated. A buy button is disabled while this is false.
   */
  available(product: IapProduct): boolean {
    if (!Purchases) return __DEV__;
    return this.products.has(product.id);
  }

  /**
   * The store's own localised price, or null when the store has not returned the product. The typed
   * `fallbackPrice` is used only for the simulated store in development builds: a release build never
   * shows a price the store did not give (policy.md item 4, review P7).
   */
  priceOrNull(product: IapProduct): string | null {
    const sp = this.products.get(product.id);
    if (sp) return sp.priceString;
    if (!Purchases && __DEV__) return product.fallbackPrice;
    return null;
  }

  /** The label for a buy button: the store's price, or PRICE_UNAVAILABLE (never a typed price in a release build). */
  price(product: IapProduct): string {
    return this.priceOrNull(product) ?? PRICE_UNAVAILABLE;
  }

  /** Resolves ok, with the transaction, when the purchase completed and the product should be granted. */
  async purchase(product: IapProduct): Promise<PurchaseResult> {
    // Double taps: the store would show a second sheet or fail with "operation in progress", and in
    // the simulated path both would succeed and grant twice.
    if (this.buying.has(product.id)) return { ok: false };
    this.buying.add(product.id);
    this.lastFailure = null;
    try {
      return await this.purchaseOnce(product);
    } finally {
      this.buying.delete(product.id);
    }
  }

  private async purchaseOnce(product: IapProduct): Promise<PurchaseResult> {
    analytics.log('iap_begin', { product_id: product.id });
    if (!Purchases) {
      if (!__DEV__) {
        this.lastFailure = 'unavailable';
        return { ok: false };
      }
      // Simulated so purchase flows can be tested in Expo Go and dev builds without store setup: no
      // money is taken; the transaction id is made up and dated when the simulated sheet closes.
      await new Promise((r) => setTimeout(r, 400));
      analytics.log('iap_success_simulated', { product_id: product.id });
      const purchasedMs = Date.now();
      const txId = `sim:${product.id}:${purchasedMs}:${++simSeq}`;
      // The simulated store lists nothing else and never delivers anything later. Its request time is the
      // simulation's own clock (the device's): no money is involved there.
      return { ok: true, txId, purchasedMs, listed: [{ productId: product.id, txId, purchasedMs }], requestMs: purchasedMs };
    }
    if (!this.products.has(product.id)) await this.loadProducts().catch((e) => crash.record(e, 'iap.products'));
    const sp = this.products.get(product.id);
    if (!sp) {
      this.lastFailure = 'unavailable';
      return { ok: false };
    }
    try {
      const made = await Purchases.purchaseStoreProduct(sp);
      // RevenueCat sends the real `purchase` event (with revenue) to Firebase via its integration.
      analytics.log('iap_success', { product_id: product.id, price: sp.price, currency: sp.currencyCode });
      const t = made?.transaction;
      const dated = t ? Date.parse(t.purchaseDate) : NaN;
      // The listing returned with the purchase carries the ids every later listing uses (15.2); the
      // result's own transaction is kept for analytics only. No device time stands in for a store date.
      const listed = made?.customerInfo ? toTransactions(made.customerInfo.nonSubscriptionTransactions) : null;
      return { ok: true, txId: t?.transactionIdentifier ?? '', purchasedMs: Number.isFinite(dated) ? dated : null, listed, requestMs: requestTime(made?.customerInfo) };
    } catch (e: unknown) {
      const err = typeof e === 'object' && e !== null ? (e as { userCancelled?: boolean; code?: unknown }) : {};
      const cancelled = !!err.userCancelled;
      if (!cancelled) {
        crash.record(e, 'iap.purchase');
        this.lastFailure = 'failed';
      }
      analytics.log(cancelled ? 'iap_cancel' : 'iap_fail', { product_id: product.id });
      if (cancelled) return { ok: false };
      // Waiting for approval, and every error that does not prove nothing was charged: lastFailure stays
      // 'failed' as before (the games without a grant route say what they said before); a caller that
      // grants later reads `pending` / `unconfirmed` and keeps its quote.
      const code = String(err.code);
      if (code === PAYMENT_PENDING) return { ok: false, pending: true };
      if (NOTHING_CHARGED.has(code)) return { ok: false };
      return { ok: false, unconfirmed: true };
    }
  }

  /**
   * The completed non-subscription transactions of this store account (consumables included), read
   * afresh: the store's cached customer info is invalidated first, so the answer comes from the
   * network (`fresh`; false when the invalidation failed and the answer may be the cache). null when
   * the store cannot be asked (no purchase module: Expo Go, web; not configured; an error). `requestMs`:
   * the store's own time of the answer (customer info's requestDate), null when it cannot be read.
   */
  async listing(): Promise<StoreListing | null> {
    if (!Purchases || !this.configured) return null;
    let fresh = true;
    try {
      await Purchases.invalidateCustomerInfoCache();
    } catch (e) {
      fresh = false;
      crash.record(e, 'iap.invalidate');
    }
    try {
      const info = await Purchases.getCustomerInfo();
      return { txs: toTransactions(info.nonSubscriptionTransactions), fresh, requestMs: requestTime(info) };
    } catch (e) {
      crash.record(e, 'iap.listing');
      return null;
    }
  }

  /**
   * The ids the store lists afresh for one product (a quote's `known`, RULING2 15.3); null when the
   * store cannot be asked (then a live store opens no sheet). Without the module: null too.
   */
  async knownIds(productId: string): Promise<string[] | null> {
    const l = await this.listing();
    return l ? l.txs.filter((t) => t.productId === productId).map((t) => t.txId) : null;
  }

  /**
   * Calls `fn` with the account's listing every time the store reports a change (a purchase approved
   * hours later, one completed after the app was killed); `fresh` is false (the report may come from
   * the store's cache); `requestMs` is that report's own requestDate. The same transaction comes again and again: the receiver grants by id once.
   * Without the purchase module nothing is ever delivered. One native listener per JS context: a new
   * service (a development reload) removes the one an earlier service added. Returns an unsubscribe.
   */
  onTransactions(fn: (listing: StoreListing) => void): () => void {
    this.txListeners.add(fn);
    if (Purchases && this.configured && !this.listening) {
      const native: CustomerInfoListener = (info) => {
        const listing: StoreListing = { txs: toTransactions(info.nonSubscriptionTransactions), fresh: false, requestMs: requestTime(info) };
        this.txListeners.forEach((l) => {
          try {
            l(listing);
          } catch (e) {
            crash.record(e, 'iap.onTransactions');
          }
        });
      };
      const slot = globalThis as Slot;
      try {
        const previous = slot[NATIVE_SLOT];
        if (previous) Purchases.removeCustomerInfoUpdateListener(previous);
        Purchases.addCustomerInfoUpdateListener(native);
        slot[NATIVE_SLOT] = native;
        this.listening = native;
      } catch (e) {
        crash.record(e, 'iap.listen');
      }
    }
    return () => {
      this.txListeners.delete(fn);
      // The last receiver gone: the native listener goes with it.
      if (this.txListeners.size === 0 && this.listening && Purchases) {
        const slot = globalThis as Slot;
        try {
          Purchases.removeCustomerInfoUpdateListener(this.listening);
        } catch (e) {
          crash.record(e, 'iap.unlisten');
        }
        if (slot[NATIVE_SLOT] === this.listening) delete slot[NATIVE_SLOT];
        this.listening = null;
      }
    };
  }

  /** Returns the non-consumable product ids this account owns. */
  async restore(): Promise<string[]> {
    if (!Purchases) return [];
    try {
      const info = await Purchases.restorePurchases();
      return info.nonSubscriptionTransactions.map((t) => t.productIdentifier);
    } catch (e) {
      crash.record(e, 'iap.restore');
      return [];
    }
  }

  /** Same as restore but silent, for startup (no store sign-in prompt). */
  async owned(): Promise<string[]> {
    if (!Purchases || !this.configured) return [];
    try {
      const info = await Purchases.getCustomerInfo();
      return info.nonSubscriptionTransactions.map((t) => t.productIdentifier);
    } catch {
      return [];
    }
  }
}

export const iap = new IapService();
