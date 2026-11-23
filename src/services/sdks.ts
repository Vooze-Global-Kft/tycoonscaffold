/**
 * The one place native SDKs are required. Metro resolves require() calls
 * statically, so web builds use sdks.web.ts instead (all null). Each loader
 * returns null when the native module isn't in the binary (e.g. Expo Go).
 */
import { requireOptionalNativeModule } from 'expo';
import { tryRequire } from './native';

/** The repository's own native module (modules/game-services): Game Center on iOS, Play Games Services on Android. */
export interface GameServicesNative {
  /** Android: the build has a Play Games project id. iOS: always true (the entitlement decides, in app.config.ts). */
  isConfigured(): boolean;
  /** A player is signed in, or was signed in without showing anything. */
  authenticate(): Promise<boolean>;
  /** The same, showing the platform's own sign-in screen when needed. */
  signIn(): Promise<boolean>;
  submitScore(leaderboardId: string, score: number): Promise<boolean>;
  showLeaderboard(leaderboardId: string): Promise<boolean>;
}

export const loadAds = () => tryRequire(() => require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads'));
export const loadTracking = () => tryRequire(() => require('expo-tracking-transparency') as typeof import('expo-tracking-transparency'));
export const loadPurchases = () =>
  tryRequire(() => (require('react-native-purchases') as typeof import('react-native-purchases')).default);
export const loadAnalytics = () =>
  tryRequire(() => require('@react-native-firebase/analytics') as typeof import('@react-native-firebase/analytics'));
export const loadCrashlytics = () =>
  tryRequire(() => require('@react-native-firebase/crashlytics') as typeof import('@react-native-firebase/crashlytics'));
export const loadRemoteConfig = () =>
  tryRequire(() => require('@react-native-firebase/remote-config') as typeof import('@react-native-firebase/remote-config'));
export const loadNotifications = () => tryRequire(() => require('expo-notifications') as typeof import('expo-notifications'));
export const loadStoreReview = () => tryRequire(() => require('expo-store-review') as typeof import('expo-store-review'));
export const loadGameServices = () => tryRequire(() => requireOptionalNativeModule<GameServicesNative>('GameServices'));
