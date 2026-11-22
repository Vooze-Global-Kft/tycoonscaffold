/**
 * Whether a rewarded ad can play right now (or the player owns the skip-ads entitlement, so no ad
 * is needed). Re-renders when the ads service says something changed. Every ad button uses it: while
 * it is false the button is dimmed and says the ad is not ready.
 */
import { useSyncExternalStore } from 'react';
import { ads } from '../../services/ads';

const subscribe = (fn: () => void) => {
  const off = ads.onChange(fn);
  return () => {
    off();
  };
};
const readyNow = () => ads.skipRewarded || ads.rewardedReady;

export function useRewardedReady(): boolean {
  return useSyncExternalStore(subscribe, readyNow, readyNow);
}

/** What an ad button says under its label while no ad is loaded. */
export const AD_NOT_READY = 'Ad not ready';
