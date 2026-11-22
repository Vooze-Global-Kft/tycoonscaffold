/**
 * Which country the player is in, as an ISO 3166-1 alpha-2 code ("BE", "US").
 * Used for rules that differ by country, such as where randomised chests may
 * be sold. The store account's country is what counts legally; the device's
 * region setting is the fallback, used only when there is no store account at
 * all. Null when the country is not known. What null means is decided by the
 * caller: for chest sales the engine treats an unknown country as restricted
 * (meta.ts chestSalesAllowed), the safe side for a legal rule.
 */
import { Platform } from 'react-native';
import { loadPurchases } from './sdks';

/** Storefront codes may be alpha-3 (Apple) or alpha-2 (Google). Only the countries we restrict need mapping. */
const ALPHA3: Record<string, string> = { BEL: 'BE', NLD: 'NL', BRA: 'BR', GBR: 'GB', USA: 'US', DEU: 'DE', FRA: 'FR' };

function normalise(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (c.length === 2) return c;
  if (c.length === 3) return ALPHA3[c] ?? null;
  return null;
}

export async function detectRegion(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      const purchases = loadPurchases();
      const storefront = await purchases?.getStorefront();
      if (storefront?.countryCode) {
        // The store account's country is the one that counts. If its code cannot be read, say "unknown"
        // rather than fall back to the device language (a Belgian account on an en-US phone is still Belgian).
        return normalise(storefront.countryCode);
      }
    } catch {
      // Not configured (no key, Expo Go): fall through to the device setting.
    }
  }
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const match = /[-_]([A-Za-z]{2})(?:[-_]|$)/.exec(locale);
    return match ? match[1].toUpperCase() : null;
  } catch {
    return null;
  }
}
