/**
 * The store rating prompt (expo-store-review: SKStoreReviewController on iOS, the Play In-App
 * Review flow on Android). Asked for by the store at a moment the player has just been given
 * something, never from a button (both stores forbid a button that claims to open the prompt, since
 * the system may show nothing). When it is asked for: src/services/reviewRule.ts.
 */
import { Platform } from 'react-native';
import { analytics, crash } from './firebase';
import { isExpoGo } from './native';
import { prefs } from './prefs';
import { shouldAskForReview } from './reviewRule';
import { loadStoreReview } from './sdks';

const StoreReview = !isExpoGo && Platform.OS !== 'web' ? loadStoreReview() : null;

export const review = {
  /** True when this build can show the prompt at all. */
  get available(): boolean {
    return StoreReview !== null;
  },

  /** Asks the system for the rating prompt when the rules allow it. Resolves true when it was asked for. Never throws. */
  async maybeAsk(stats: { sessions: number; playSeconds: number; firstOpenAt: number }, now: number): Promise<boolean> {
    if (!StoreReview) return false;
    try {
      await prefs.load();
      const asks = prefs.get().reviewAsks;
      if (!shouldAskForReview(stats, asks, now)) return false;
      if (!(await StoreReview.isAvailableAsync())) return false;
      // Recorded before the request: a prompt that fails is not asked for again at once.
      prefs.set({ reviewAsks: [...asks, now] });
      await StoreReview.requestReview();
      analytics.log('review_prompt', { ask: asks.length + 1 });
      return true;
    } catch (e) {
      crash.record(e, 'review');
      return false;
    }
  },
};
