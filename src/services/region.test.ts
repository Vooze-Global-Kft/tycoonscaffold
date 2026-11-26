/// <reference types="node" />
/**
 * storefrontCountry (yard-stage2.md 2.15.3, ruling 9.5): the store account's country as the purchase
 * module reports it, never the device's region; unknown (null) when the module is missing (Expo Go),
 * fails, or answers a code that cannot be read. detectRegion keeps its device fallback (the other
 * games' chest rule). The development override works only in a development build.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ module: 'ok' as 'ok' | 'throws' | 'missing', code: 'DEU' as string | undefined, os: 'ios' }));

vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return h.os;
    },
  },
}));
vi.mock('./sdks', () => ({
  loadPurchases: () =>
    h.module === 'missing'
      ? null
      : {
          getStorefront: async () => {
            if (h.module === 'throws') throw new Error('not configured');
            return h.code === undefined ? null : { countryCode: h.code };
          },
        },
}));

async function region(dev = false) {
  vi.resetModules();
  (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  return import('./region');
}
/** The device says Belgium; nothing the store-only function answers may come from it. */
const deviceLocale = () => vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ locale: 'nl-BE' } as Intl.ResolvedDateTimeFormatOptions);

afterEach(() => {
  vi.restoreAllMocks();
  h.module = 'ok';
  h.code = 'DEU';
  h.os = 'ios';
  delete (globalThis as { __DEV__?: boolean }).__DEV__;
});

describe('storefrontCountry', () => {
  it("is the store account's country, normalised (alpha-3 to alpha-2)", async () => {
    deviceLocale();
    const r = await region();
    expect(await r.storefrontCountry()).toBe('DE');
    h.code = 'us';
    expect(await r.storefrontCountry()).toBe('US');
  });

  it('is unknown when the module fails, is missing (Expo Go), answers nothing or an unreadable code, or on the web; never the device region', async () => {
    deviceLocale();
    const r = await region();
    h.module = 'throws';
    expect(await r.storefrontCountry()).toBeNull();
    expect(await r.detectRegion(), 'detectRegion still falls back to the device').toBe('BE');
    h.module = 'missing';
    expect(await r.storefrontCountry()).toBeNull();
    h.module = 'ok';
    h.code = undefined;
    expect(await r.storefrontCountry()).toBeNull();
    h.code = 'XYZ';
    expect(await r.storefrontCountry()).toBeNull();
    h.code = 'DEU';
    h.os = 'web';
    expect(await r.storefrontCountry()).toBeNull();
  });

  it('the development override answers its value in a development build and does nothing in a release', async () => {
    const dev = await region(true);
    dev.setStorefrontForDev('US');
    expect(await dev.storefrontCountry()).toBe('US');
    dev.setStorefrontForDev(null);
    expect(await dev.storefrontCountry()).toBeNull();
    dev.setStorefrontForDev('auto');
    expect(await dev.storefrontCountry()).toBe('DE');
    const release = await region(false);
    release.setStorefrontForDev('US');
    expect(await release.storefrontCountry()).toBe('DE');
  });
});
