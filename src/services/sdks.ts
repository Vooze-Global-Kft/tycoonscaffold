/**
 * The one place native SDKs are required. Metro resolves require() calls
 * statically, so web builds use sdks.web.ts instead (all null). Each loader
 * returns null when the native module isn't in the binary (e.g. Expo Go).
 */
import { tryRequire } from './native';

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
