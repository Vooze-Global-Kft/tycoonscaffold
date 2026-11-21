/**
 * Analytics, Crashlytics and Remote Config.
 *
 * Analytics events are the same in every game, so one BigQuery export (or the
 * Firebase console with one project per game) compares games like-for-like.
 * Event names follow Google's recommended games events where one exists.
 */
import { ACTIVE_GAME_ID, type RemoteKey } from '../config/game';
import { firebaseEnabled } from './native';
import { loadAnalytics, loadCrashlytics, loadRemoteConfig } from './sdks';

type Params = Record<string, string | number | boolean | undefined>;

const analyticsMod = firebaseEnabled ? loadAnalytics() : null;
const crashMod = firebaseEnabled ? loadCrashlytics() : null;
const rcMod = firebaseEnabled ? loadRemoteConfig() : null;

export const analytics = {
  log(name: string, params: Params = {}) {
    const p = { game_id: ACTIVE_GAME_ID, ...params };
    if (!analyticsMod) {
      if (__DEV__) console.log('[analytics]', name, p);
      return;
    }
    // logEvent is overloaded per recommended event; custom names go through the generic overload.
    try {
      (analyticsMod.logEvent as unknown as (a: unknown, n: string, p?: Params) => unknown)(analyticsMod.getAnalytics(), name, p);
    } catch {
      // Analytics must never break gameplay.
    }
  },
  setUserProperty(name: string, value: string) {
    if (!analyticsMod) return;
    analyticsMod.setUserProperty(analyticsMod.getAnalytics(), name, value).catch(() => {});
  },
  setConsent(granted: boolean) {
    if (!analyticsMod) return;
    const v = granted;
    analyticsMod
      .setConsent(analyticsMod.getAnalytics(), {
        analytics_storage: true,
        ad_storage: v,
        ad_user_data: v,
        ad_personalization: v,
      })
      .catch(() => {});
  },
};

export const crash = {
  record(error: unknown, context?: string) {
    if (__DEV__) console.warn('[crash]', context, error);
    if (!crashMod) return;
    const c = crashMod.getCrashlytics();
    if (context) crashMod.log(c, context);
    crashMod.recordError(c, error instanceof Error ? error : new Error(String(error)));
  },
};

/** Fetches Remote Config. Resolves to overrides (or {} offline / without Firebase). Never throws. */
export async function fetchRemoteOverrides(defaults: Record<RemoteKey, number>): Promise<Partial<Record<RemoteKey, number>>> {
  if (!rcMod) return {};
  try {
    const rc = rcMod.getRemoteConfig();
    rc.defaultConfig = defaults;
    await rcMod.fetchAndActivate(rc);
    const out: Partial<Record<RemoteKey, number>> = {};
    for (const key of Object.keys(defaults) as RemoteKey[]) out[key] = rcMod.getNumber(rc, key);
    return out;
  } catch (e) {
    crash.record(e, 'remote-config');
    return {};
  }
}
