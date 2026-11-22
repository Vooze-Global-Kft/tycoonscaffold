/**
 * In-app purchases through RevenueCat. One RevenueCat project can hold every
 * game as a separate app, with one dashboard for revenue per game.
 *
 * Product ids come from game.json. Create the same ids in App Store Connect,
 * Play Console and RevenueCat. Non-consumables (noAds, skipAds, multiplier,
 * starterPack, clearance, unlock: engine/meta isNonConsumable) are restored from
 * the store and re-granted at boot, and a mode with its own engine applies them to
 * the run in progress (store.ts applyProductNow: Hangar Expansion's drones);
 * consumables (gems, timeWarp) are granted once per purchase.
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

  /** Resolves true when the purchase completed and the product should be granted. */
  async purchase(product: IapProduct): Promise<boolean> {
    // Double taps: the store would show a second sheet or fail with "operation in progress", and in
    // the simulated path both would succeed and grant twice.
    if (this.buying.has(product.id)) return false;
    this.buying.add(product.id);
    this.lastFailure = null;
    try {
      return await this.purchaseOnce(product);
    } finally {
      this.buying.delete(product.id);
    }
  }

  private async purchaseOnce(product: IapProduct): Promise<boolean> {
    analytics.log('iap_begin', { product_id: product.id });
    if (!Purchases) {
      if (!__DEV__) {
        this.lastFailure = 'unavailable';
        return false;
      }
      // Simulated so purchase flows can be tested in Expo Go and dev builds without store setup.
      await new Promise((r) => setTimeout(r, 400));
      analytics.log('iap_success_simulated', { product_id: product.id });
      return true;
    }
    if (!this.products.has(product.id)) await this.loadProducts().catch((e) => crash.record(e, 'iap.products'));
    const sp = this.products.get(product.id);
    if (!sp) {
      this.lastFailure = 'unavailable';
      return false;
    }
    try {
      await Purchases.purchaseStoreProduct(sp);
      // RevenueCat sends the real `purchase` event (with revenue) to Firebase via its integration.
      analytics.log('iap_success', { product_id: product.id, price: sp.price, currency: sp.currencyCode });
      return true;
    } catch (e: unknown) {
      const cancelled = typeof e === 'object' && e !== null && (e as { userCancelled?: boolean }).userCancelled;
      if (!cancelled) {
        crash.record(e, 'iap.purchase');
        this.lastFailure = 'failed';
      }
      analytics.log(cancelled ? 'iap_cancel' : 'iap_fail', { product_id: product.id });
      return false;
    }
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
