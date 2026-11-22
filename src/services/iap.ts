/**
 * In-app purchases through RevenueCat. One RevenueCat project can hold every
 * game as a separate app, with one dashboard for revenue per game.
 *
 * Product ids come from game.json. Create the same ids in App Store Connect,
 * Play Console and RevenueCat. Non-consumables (noAds, multiplier,
 * starterPack) are restored from the store; consumables (gems, timeWarp) are
 * granted once per purchase.
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

class IapService {
  private products = new Map<string, StoreProduct>();
  private configured = false;
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

  /** Fetches store products. Also retried at purchase time: a failed fetch at startup (offline) used to disable every purchase until a restart. */
  private async loadProducts(): Promise<void> {
    if (!Purchases || !this.configured) return;
    const ids = baseGame.monetization.iap.products.map((p) => p.id);
    const found = await Purchases.getProducts(ids, Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    found.forEach((p) => this.products.set(p.identifier, p));
  }

  price(product: IapProduct): string {
    return this.products.get(product.id)?.priceString ?? product.fallbackPrice;
  }

  /** Resolves true when the purchase completed and the product should be granted. */
  async purchase(product: IapProduct): Promise<boolean> {
    // Double taps: the store would show a second sheet or fail with "operation in progress", and in
    // the simulated path both would succeed and grant twice.
    if (this.buying.has(product.id)) return false;
    this.buying.add(product.id);
    try {
      return await this.purchaseOnce(product);
    } finally {
      this.buying.delete(product.id);
    }
  }

  private async purchaseOnce(product: IapProduct): Promise<boolean> {
    analytics.log('iap_begin', { product_id: product.id });
    if (!Purchases) {
      if (!__DEV__) return false;
      // Simulated so purchase flows can be tested in Expo Go and dev builds without store setup.
      await new Promise((r) => setTimeout(r, 400));
      analytics.log('iap_success_simulated', { product_id: product.id });
      return true;
    }
    if (!this.products.has(product.id)) await this.loadProducts().catch((e) => crash.record(e, 'iap.products'));
    const sp = this.products.get(product.id);
    if (!sp) return false;
    try {
      await Purchases.purchaseStoreProduct(sp);
      // RevenueCat sends the real `purchase` event (with revenue) to Firebase via its integration.
      analytics.log('iap_success', { product_id: product.id, price: sp.price, currency: sp.currencyCode });
      return true;
    } catch (e: unknown) {
      const cancelled = typeof e === 'object' && e !== null && (e as { userCancelled?: boolean }).userCancelled;
      if (!cancelled) crash.record(e, 'iap.purchase');
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
