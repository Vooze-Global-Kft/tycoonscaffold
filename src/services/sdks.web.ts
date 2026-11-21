// Web build (for quick UI previews): no native SDKs, every service uses its mock.
type Loaders = typeof import('./sdks');
export const loadAds: Loaders['loadAds'] = () => null;
export const loadTracking: Loaders['loadTracking'] = () => null;
export const loadPurchases: Loaders['loadPurchases'] = () => null;
export const loadAnalytics: Loaders['loadAnalytics'] = () => null;
export const loadCrashlytics: Loaders['loadCrashlytics'] = () => null;
export const loadRemoteConfig: Loaders['loadRemoteConfig'] = () => null;
