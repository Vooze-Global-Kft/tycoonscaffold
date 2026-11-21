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
import { isExpoGo } from './native';
import { loadAds, loadTracking } from './sdks';

type GMA = typeof import('react-native-google-mobile-ads');
type Interstitial = import('react-native-google-mobile-ads').InterstitialAd;
type Rewarded = import('react-native-google-mobile-ads').RewardedAd;

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
  /** Set by the store from IAP entitlements. */
  noAds = false;
  /** Live tuning values; replaced after Remote Config loads. */
  firstInterstitialAfterSec = baseGame.monetization.ads.firstInterstitialAfterSec;
  interstitialCooldownSec = baseGame.monetization.ads.interstitialCooldownSec;

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
   * Players with No Ads get rewards without watching (a strong IAP selling point).
   * Without the native SDK (Expo Go) it resolves true after a short fake delay.
   */
  async showRewarded(placement: string): Promise<boolean> {
    analytics.log('ad_reward_offer_accepted', { placement });
    if (this.noAds) return true;
    if (!gma) {
      await new Promise((r) => setTimeout(r, 600));
      return true;
    }
    const ad = this.rewarded;
    if (!ad || !this.rewardedLoaded) return false;
    return new Promise<boolean>((resolve) => {
      let earned = false;
      const offEarned = ad.addAdEventListener(gma.RewardedAdEventType.EARNED_REWARD, () => (earned = true));
      const offClosed = ad.addAdEventListener(gma.AdEventType.CLOSED, () => {
        offEarned();
        offClosed();
        if (earned) analytics.log('ad_reward_earned', { placement });
        this.loadRewarded();
        resolve(earned);
      });
      ad.show().catch((e) => {
        crash.record(e, 'ads.showRewarded');
        offEarned();
        offClosed();
        this.loadRewarded();
        resolve(false);
      });
    });
  }

  /** Call at natural breaks (after collecting offline earnings, after prestige, etc). */
  maybeShowInterstitial(placement: string) {
    if (this.noAds || !gma || !this.interstitial || !this.interstitialLoaded) return;
    const now = Date.now();
    if (now - this.sessionStart < this.firstInterstitialAfterSec * 1000) return;
    if (now - this.lastInterstitial < this.interstitialCooldownSec * 1000) return;
    this.lastInterstitial = now;
    analytics.log('ad_interstitial_show', { placement });
    this.interstitial.show().catch((e) => crash.record(e, 'ads.interstitial'));
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
