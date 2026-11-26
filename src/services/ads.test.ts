/// <reference types="node" />
/**
 * The shared ad service's start and request configuration (yard-stage2.md 2.15.7, 2.16, 4.9; P8, P9),
 * with a stand-in ad SDK that records every call: with `initOn` absent the start (consent, tracking,
 * configuration, SDK) is exactly today's; with 'firstOffer' nothing is asked or started until
 * firstOffer(), and then once; the age treatment reaches the configuration, the consent form, the
 * tracking question and every ad request (child, teen, none).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  ads: { maxAdContentRating: 'PG', interstitials: undefined as boolean | undefined, firstInterstitialAfterSec: 300, interstitialCooldownSec: 180 } as Record<string, unknown>,
  calls: [] as unknown[][],
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('../config/game', () => ({ baseGame: { monetization: { ads: h.ads } } }));
vi.mock('../state/overlays', () => ({ overlays: { msSinceClose: () => 10_000, anyOpen: () => false } }));
vi.mock('./firebase', () => ({ analytics: { log: () => {}, setConsent: () => {} }, crash: { record: () => {} } }));
vi.mock('./fx', () => ({ fx: { suspend: () => {}, resume: () => {} } }));
vi.mock('./native', () => ({ isExpoGo: false }));
vi.mock('./sdks', () => {
  const log = (...a: unknown[]) => void h.calls.push(a);
  const ad = (kind: string) => ({
    createForAdRequest: (_unit: string, options: unknown) => {
      log(`${kind}.request`, options);
      return { addAdEventListener: () => () => {}, load: () => {}, show: async () => {} };
    },
  });
  const gma = {
    default: () => ({
      setRequestConfiguration: async (c: unknown) => log('setRequestConfiguration', c),
      initialize: async () => log('initialize'),
    }),
    AdsConsent: {
      gatherConsent: async (...a: unknown[]) => (log('gatherConsent', ...a), { status: 'NOT_REQUIRED', canRequestAds: true }),
      getUserChoices: async () => ({ selectPersonalisedAds: true }),
    },
    AdsConsentStatus: { NOT_REQUIRED: 'NOT_REQUIRED' },
    MaxAdContentRating: { G: 'G', PG: 'PG', T: 'T', MA: 'MA' },
    TestIds: { ADAPTIVE_BANNER: 'b', INTERSTITIAL: 'i', REWARDED: 'r' },
    RewardedAd: ad('rewarded'),
    InterstitialAd: ad('interstitial'),
    RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'earned' },
    AdEventType: { ERROR: 'error', CLOSED: 'closed' },
  };
  return {
    loadAds: () => gma,
    loadTracking: () => ({ requestTrackingPermissionsAsync: async () => log('requestTracking') }),
  };
});

/** A fresh ad service on game data with `initOn` as given (absent: not set at all). */
async function fresh(initOn?: 'boot' | 'firstOffer') {
  vi.resetModules();
  h.calls = [];
  delete h.ads.initOn;
  if (initOn) h.ads.initOn = initOn;
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return (await import('./ads')).ads;
}
const names = () => h.calls.map((c) => c[0]);
const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  delete (globalThis as { __DEV__?: boolean }).__DEV__;
});

describe('when the ad service starts', () => {
  it('initOn absent: boot reads "boot"; init asks consent, then tracking, then configures and starts, exactly as before', async () => {
    const ads = await fresh();
    expect(ads.initOn).toBe('boot');
    await ads.init();
    expect(h.calls).toEqual([
      ['gatherConsent'],
      ['requestTracking'],
      ['setRequestConfiguration', { maxAdContentRating: 'PG' }],
      ['initialize'],
      ['rewarded.request', { requestNonPersonalizedAdsOnly: false }],
      ['interstitial.request', { requestNonPersonalizedAdsOnly: false }],
    ]);
    // A later first offer (or a second init) asks nothing again.
    await ads.firstOffer();
    await ads.init();
    expect(names().filter((n) => n === 'gatherConsent')).toHaveLength(1);
  });

  it("initOn 'firstOffer': nothing is asked or started until the first offer, then once", async () => {
    const ads = await fresh('firstOffer');
    expect(ads.initOn).toBe('firstOffer');
    await flush();
    expect(h.calls, 'nothing at creation').toEqual([]);
    expect(ads.canShowBanner).toBe(false);
    // Two ad buttons showing in the same moment: one start.
    await Promise.all([ads.firstOffer(), ads.firstOffer()]);
    expect(names().filter((n) => n === 'gatherConsent')).toHaveLength(1);
    expect(names().filter((n) => n === 'requestTracking')).toHaveLength(1);
    expect(names().filter((n) => n === 'initialize')).toHaveLength(1);
    await ads.firstOffer();
    expect(names().filter((n) => n === 'gatherConsent')).toHaveLength(1);
    expect(ads.canShowBanner).toBe(true);
  });

  it('a start that ended with "ads may not be requested" is asked again by a later call, as before the start was shared (store-fix)', async () => {
    const ads = await fresh('firstOffer');
    const sdks = (await import('./sdks')) as unknown as { loadAds: () => { AdsConsent: { gatherConsent: (...a: unknown[]) => Promise<unknown> } } };
    const consent = sdks.loadAds().AdsConsent;
    const real = consent.gatherConsent;
    consent.gatherConsent = async (...a: unknown[]) => (h.calls.push(['gatherConsent', ...a]), { status: 'REQUIRED', canRequestAds: false });
    try {
      await ads.firstOffer();
      expect(names()).not.toContain('initialize');
      consent.gatherConsent = real;
      await ads.firstOffer();
      expect(names().filter((n) => n === 'gatherConsent'), 'asked again').toHaveLength(2);
      expect(names()).toContain('initialize');
      await ads.firstOffer();
      expect(names().filter((n) => n === 'gatherConsent'), 'once running, never again').toHaveLength(2);
    } finally {
      consent.gatherConsent = real;
    }
  });
});

describe("the age band reaches every request (P8)", () => {
  it("'child': child-directed configuration, consent form told, no tracking question, non-personalised requests", async () => {
    const ads = await fresh('firstOffer');
    ads.setAudience('child');
    await ads.firstOffer();
    expect(h.calls).toEqual([
      ['gatherConsent', { tagForUnderAgeOfConsent: true }],
      ['setRequestConfiguration', { maxAdContentRating: 'G', tagForChildDirectedTreatment: true, tagForUnderAgeOfConsent: true, ageRestrictedTreatment: 'child' }],
      ['initialize'],
      ['rewarded.request', { requestNonPersonalizedAdsOnly: true }],
      ['interstitial.request', { requestNonPersonalizedAdsOnly: true }],
    ]);
    expect(ads.bannerRequestOptions()).toEqual({ requestNonPersonalizedAdsOnly: true });
  });

  it("'teen': teen treatment, rated T at most, non-personalised; the tracking question is still the platform's", async () => {
    h.ads.maxAdContentRating = 'MA';
    const ads = await fresh();
    ads.setAudience('teen');
    await ads.init();
    h.ads.maxAdContentRating = 'PG';
    expect(h.calls.slice(0, 3)).toEqual([
      ['gatherConsent', { tagForUnderAgeOfConsent: true }],
      ['requestTracking'],
      ['setRequestConfiguration', { maxAdContentRating: 'T', tagForUnderAgeOfConsent: true, ageRestrictedTreatment: 'teen' }],
    ]);
    expect(h.calls).toContainEqual(['rewarded.request', { requestNonPersonalizedAdsOnly: true }]);
  });

  it('no band (null): requests as before; a band set after the start configures again and reloads the ads', async () => {
    const ads = await fresh();
    ads.setAudience(null);
    await ads.init();
    expect(h.calls).toContainEqual(['setRequestConfiguration', { maxAdContentRating: 'PG' }]);
    h.calls = [];
    ads.setAudience('child');
    await flush();
    expect(h.calls).toEqual([
      ['setRequestConfiguration', { maxAdContentRating: 'G', tagForChildDirectedTreatment: true, tagForUnderAgeOfConsent: true, ageRestrictedTreatment: 'child' }],
      ['rewarded.request', { requestNonPersonalizedAdsOnly: true }],
      ['interstitial.request', { requestNonPersonalizedAdsOnly: true }],
    ]);
    h.calls = [];
    ads.setAudience('child');
    await flush();
    expect(h.calls, 'the same band again changes nothing').toEqual([]);
  });
});
