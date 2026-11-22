import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { ads } from '../../services/ads';
import { useGame } from '../../state/store';
import { alpha, useTheme } from '../theme';

/**
 * What the banner needs from the ads service: whether a banner may be requested at all (the SDK
 * finished starting and the consent form allows ads) and whether the request must be
 * non-personalised. Read defensively: until the service says yes, no banner is requested.
 */
interface BannerGate {
  canShowBanner?: boolean;
  bannerRequestOptions?: () => { requestNonPersonalizedAdsOnly: boolean };
}
const gate = ads as unknown as BannerGate;
const subscribe = (fn: () => void) => {
  const off = ads.onChange(fn);
  return () => {
    off();
  };
};
const allowed = () => gate.canShowBanner === true;

/**
 * Anchored adaptive banner. Shown only when consent allows ads and the SDK is ready, never for No
 * Ads owners, and always with non-personalised requests when the player declined personalised ads.
 * It sits with a clear gap and a divider above the tab bar, so it never reads as part of the menu.
 */
export function Banner() {
  const t = useTheme();
  const noAds = useGame((s) => s.game.entitlements.noAds);
  const show = useGame((s) => s.cfg.monetization.ads.showBanner);
  const ok = useSyncExternalStore(subscribe, allowed, allowed);
  const gma = ads.bannerModule();
  if (noAds || !show || !gma || !ok) return null;
  const { BannerAd, BannerAdSize } = gma;
  const requestOptions = gate.bannerRequestOptions?.() ?? { requestNonPersonalizedAdsOnly: true };
  return (
    <View style={[styles.wrap, { borderBottomColor: alpha(t.c.text, 0.15) }]}>
      <BannerAd unitId={ads.bannerUnitId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={requestOptions} />
    </View>
  );
}

const styles = StyleSheet.create({
  // 12 pt of space and a hairline between the ad and the tab bar (AdMob: no banner against an app menu).
  wrap: { alignItems: 'center', paddingBottom: 12, marginBottom: 2, borderBottomWidth: StyleSheet.hairlineWidth },
});
