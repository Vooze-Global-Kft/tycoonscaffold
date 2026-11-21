import { View } from 'react-native';
import { ads } from '../../services/ads';
import { useGame } from '../../state/store';

/** Anchored adaptive banner. Hidden for No Ads owners and when the SDK is unavailable. */
export function Banner() {
  const noAds = useGame((s) => s.game.entitlements.noAds);
  const show = useGame((s) => s.cfg.monetization.ads.showBanner);
  const gma = ads.bannerModule();
  if (noAds || !show || !gma) return null;
  const { BannerAd, BannerAdSize } = gma;
  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd unitId={ads.bannerUnitId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
