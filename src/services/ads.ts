/**
 * AdMob: consent (UMP for GDPR/US states, ATT on iOS), rewarded ads for
 * boosts, interstitials on a cooldown, and a banner.
 *
 * Revenue for idle games comes mostly from opt-in rewarded ads, so they are
 * offered generously (boosts, double offline earnings). Interstitials are
 * kept rare and only shown at natural breaks, because they cut retention.
 */
import { Platform } from 'react-native';
import { baseGame } from '../config/game';
import { analytics, crash } from './firebase';
import { fx } from './fx';
import { isExpoGo } from './native';
import { loadAds, loadTracking } from './sdks';

type GMA = typeof import('react-native-google-mobile-ads');
type Interstitial = import('react-native-google-mobile-ads').InterstitialAd;
type Rewarded = import('react-native-google-mobile-ads').RewardedAd;
type Rating = 'G' | 'PG' | 'T' | 'MA';

/** No interstitial this soon after any full-screen ad closed (a rewarded ad chest, then the chest closes...). */
const QUIET_AFTER_FULLSCREEN_MS = 30_000;

const gma: GMA | null = isExpoGo ? null : loadAds();

function unitIds() {
  const units = Platform.OS === 'ios' ? baseGame.monetization.ads.ios : baseGame.monetization.ads.android;
  const test = __DEV__ || baseGame.monetization.ads.forceTestAds || !units;
  if (!gma) return { banner: '', interstitial: '', rewarded: '' };
  return {
    banner: test || !units?.banner ? gma.TestIds.ADAPTIVE_BANNER : units.banner,
    interstitial: test || !units?.interstitial ? gma.TestIds.INTERSTITIAL : units.interstitial,
    rewarded: test || !units?.rewarded ? gma.TestIds.REWARDED : units.rewarded,
  };
}

class AdsService {
  private ready = false;
  private personalized = false;
  private rewarded: Rewarded | null = null;
  private rewardedLoaded = false;
  private interstitial: Interstitial | null = null;
  private interstitialLoaded = false;
  private sessionStart = Date.now();
  private lastInterstitial = 0;
  private listeners = new Set<() => void>();
  /** Set by the store from IAP entitlements: no banners or pop-up ads. */
  noAds = false;
  /** Set by the store from IAP entitlements: rewarded boosts are granted without watching. */
  skipRewarded = false;
  /** Live tuning values; replaced after Remote Config loads. */
  firstInterstitialAfterSec = baseGame.monetization.ads.firstInterstitialAfterSec;
  interstitialCooldownSec = baseGame.monetization.ads.interstitialCooldownSec;
  /** Highest ad content rating to request (policy.md item 9); must be set before init(). */
  maxAdContentRating: Rating = baseGame.monetization.ads.maxAdContentRating;
  /** A full-screen ad is on screen (or opening): never start a second one. */
  private fullScreen = false;
  private lastFullScreenClosed = 0;

  get available() {
    return gma !== null;
  }

  get rewardedReady() {
    return gma === null || this.rewardedLoaded;
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  /** Call once at startup. Order matters: consent, then ATT, then SDK init. */
  async init() {
    if (!gma || this.ready) return;
    try {
      const consent = await gma.AdsConsent.gatherConsent().catch(() => null);
      if (Platform.OS === 'ios') {
        const att = loadTracking();
        await att?.requestTrackingPermissionsAsync().catch(() => null);
      }
      const choices = await gma.AdsConsent.getUserChoices().catch(() => null);
      this.personalized = Boolean(choices?.selectPersonalisedAds ?? true);
      analytics.setConsent(this.personalized);
      if (consent && !consent.canRequestAds) return;

      // The content rating must be in place before the SDK initialises and loads its first ads
      // (policy.md item 9: ads must fit the app's age rating).
      await gma.default().setRequestConfiguration({ maxAdContentRating: gma.MaxAdContentRating[this.maxAdContentRating] });
      await gma.default().initialize();
      this.ready = true;
      this.loadRewarded();
      this.loadInterstitial();
    } catch (e) {
      crash.record(e, 'ads.init');
    }
  }

  private request() {
    return { requestNonPersonalizedAdsOnly: !this.personalized };
  }

  private loadRewarded() {
    if (!gma || !this.ready) return;
    const ad = gma.RewardedAd.createForAdRequest(unitIds().rewarded, this.request());
    ad.addAdEventListener(gma.RewardedAdEventType.LOADED, () => {
      this.rewardedLoaded = true;
      this.emit();
    });
    ad.addAdEventListener(gma.AdEventType.ERROR, () => {
      this.rewardedLoaded = false;
      this.emit();
      setTimeout(() => this.loadRewarded(), 30_000);
    });
    this.rewarded = ad;
    this.rewardedLoaded = false;
    ad.load();
  }

  private loadInterstitial() {
    if (!gma || !this.ready) return;
    const ad = gma.InterstitialAd.createForAdRequest(unitIds().interstitial, this.request());
    ad.addAdEventListener(gma.AdEventType.LOADED, () => (this.interstitialLoaded = true));
    ad.addAdEventListener(gma.AdEventType.ERROR, () => {
      this.interstitialLoaded = false;
      setTimeout(() => this.loadInterstitial(), 60_000);
    });
    ad.addAdEventListener(gma.AdEventType.CLOSED, () => this.loadInterstitial());
    this.interstitial = ad;
    this.interstitialLoaded = false;
    ad.load();
  }

  /**
   * Shows a rewarded ad. Resolves true if the player earned the reward.
   * Players who bought the skip-ads product get rewards without watching.
   * Without the native SDK (Expo Go) it resolves true after a short fake delay.
   */
  async showRewarded(placement: string): Promise<boolean> {
    analytics.log('ad_reward_offer_accepted', { placement });
    if (this.skipRewarded) return true;
    if (!gma) {
      await new Promise((r) => setTimeout(r, 600));
      return true;
    }
    const ad = this.rewarded;
    if (!ad || !this.rewardedLoaded || this.fullScreen) return false;
    this.beginFullScreen();
    // The loaded ad is used up either way; nobody else may try to show it.
    this.rewardedLoaded = false;
    return new Promise<boolean>((resolve) => {
      let earned = false;
      const offEarned = ad.addAdEventListener(gma.RewardedAdEventType.EARNED_REWARD, () => (earned = true));
      const offClosed = ad.addAdEventListener(gma.AdEventType.CLOSED, () => {
        offEarned();
        offClosed();
        this.endFullScreen();
        if (earned) analytics.log('ad_reward_earned', { placement });
        this.loadRewarded();
        resolve(earned);
      });
      ad.show().catch((e) => {
        crash.record(e, 'ads.showRewarded');
        offEarned();
        offClosed();
        this.endFullScreen();
        this.loadRewarded();
        resolve(false);
      });
    });
  }

  /** A full-screen ad owns the screen and the speakers: the game's sound and music pause until it closes. */
  private beginFullScreen() {
    this.fullScreen = true;
    fx.suspend('ad');
  }

  private endFullScreen() {
    if (!this.fullScreen) return;
    this.fullScreen = false;
    this.lastFullScreenClosed = Date.now();
    fx.resume('ad');
  }

  /**
   * Call at natural breaks only (after a prestige, after closing a chest), never when the player
   * has just chosen to do something else (policy.md item 11). `delayMs` waits before deciding, so a
   * result can be seen first; every condition is checked again when the delay ends.
   */
  maybeShowInterstitial(placement: string, delayMs = 0) {
    if (delayMs > 0) {
      setTimeout(() => this.maybeShowInterstitial(placement), delayMs);
      return;
    }
    const gmaNow = gma;
    const ad = this.interstitial;
    if (this.noAds || !gmaNow || !ad || !this.interstitialLoaded || this.fullScreen) return;
    const now = Date.now();
    if (now - this.sessionStart < this.firstInterstitialAfterSec * 1000) return;
    if (now - this.lastInterstitial < this.interstitialCooldownSec * 1000) return;
    if (now - this.lastFullScreenClosed < QUIET_AFTER_FULLSCREEN_MS) return;
    this.lastInterstitial = now;
    this.interstitialLoaded = false;
    analytics.log('ad_interstitial_show', { placement });
    this.beginFullScreen();
    const offClosed = ad.addAdEventListener(gmaNow.AdEventType.CLOSED, () => {
      offClosed();
      this.endFullScreen();
    });
    ad.show().catch((e) => {
      offClosed();
      this.endFullScreen();
      crash.record(e, 'ads.interstitial');
      this.loadInterstitial();
    });
  }

  /** For a "Privacy settings" button (required by UMP when consent applies). */
  async showPrivacyOptions() {
    await gma?.AdsConsent.showPrivacyOptionsForm().catch(() => null);
  }

  bannerUnitId() {
    return unitIds().banner;
  }

  bannerModule() {
    return gma;
  }
}

export const ads = new AdsService();
