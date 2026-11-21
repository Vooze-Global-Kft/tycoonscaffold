import Constants from 'expo-constants';

/**
 * Native SDKs (AdMob, RevenueCat, Firebase) are missing in Expo Go and on
 * web. Every service loads its SDK through here and falls back to a console
 * mock, so UI work can happen in Expo Go and the real SDKs light up in a
 * development or store build.
 */
export function tryRequire<T>(load: () => T): T | null {
  try {
    return load();
  } catch (e) {
    if (__DEV__) console.log('[services] native module unavailable, using mock:', String(e).slice(0, 120));
    return null;
  }
}

export const isExpoGo = Constants.executionEnvironment === 'storeClient';
export const firebaseEnabled = Boolean(Constants.expoConfig?.extra?.firebaseEnabled) && !isExpoGo;
