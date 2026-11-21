/**
 * One codebase, many apps. Pick the game with the GAME env var:
 *
 *   GAME=space-miner npx expo start
 *   GAME=pizza-empire eas build --profile pizza-empire-production
 *
 * Everything store-facing (name, bundle id, icon, ad app ids, Firebase files)
 * comes from games/<id>/game.json, so each game is its own store listing.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const games = require('./scripts/lib/games.js');

export default ({ config }: ConfigContext): ExpoConfig => {
  const id: string = games.resolveGameId();
  const game = games.writeActiveGame(id);
  const rel = (p: string) => './' + require('path').relative(games.ROOT, p).split(require('path').sep).join('/');

  const icon = rel(games.gameFileOr(id, 'icon.png', 'assets/icon.png'));
  const splash = rel(games.gameFileOr(id, 'splash.png', 'assets/splash-icon.png'));
  const adaptiveFg = rel(games.gameFileOr(id, 'adaptive-icon.png', 'assets/android-icon-foreground.png'));

  const iosFirebase = games.gameFileOr(id, game.firebase?.iosGoogleServicesFile);
  const androidFirebase = games.gameFileOr(id, game.firebase?.androidGoogleServicesFile);
  // React Native Firebase's config plugin fails the build without these files,
  // so it is only enabled once both are present. Until then the app logs
  // analytics to the console and uses local remote-config defaults.
  const firebaseEnabled = Boolean(iosFirebase && androidFirebase);

  const ads = game.monetization?.ads ?? {};
  const trackingText =
    'This lets us show you ads that are more relevant to you, which keeps ' + game.app.displayName + ' free to play.';

  const plugins: ExpoConfig['plugins'] = [
    'expo-asset',
    'expo-audio',
    ['expo-splash-screen', { image: splash, imageWidth: 200, resizeMode: 'contain', backgroundColor: game.theme.colors.background }],
    ['expo-tracking-transparency', { userTrackingPermission: trackingText }],
    [
      'react-native-google-mobile-ads',
      {
        iosAppId: ads.ios?.appId,
        androidAppId: ads.android?.appId,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription: trackingText,
      },
    ],
    [
      'expo-build-properties',
      {
        // React Native Firebase needs static frameworks on iOS.
        ios: firebaseEnabled ? { useFrameworks: 'static' } : {},
      },
    ],
  ];
  if (firebaseEnabled) {
    plugins.push('@react-native-firebase/app', '@react-native-firebase/analytics', '@react-native-firebase/crashlytics');
  }

  return {
    ...config,
    name: game.app.displayName,
    slug: game.app.slug,
    owner: game.app.owner,
    version: game.app.version ?? '1.0.0',
    orientation: 'portrait',
    icon,
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: game.app.iosBundleId,
      buildNumber: String(game.app.buildNumber ?? 1),
      supportsTablet: false,
      googleServicesFile: iosFirebase ? rel(iosFirebase) : undefined,
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      package: game.app.androidPackage,
      versionCode: game.app.buildNumber ?? 1,
      googleServicesFile: androidFirebase ? rel(androidFirebase) : undefined,
      adaptiveIcon: {
        foregroundImage: adaptiveFg,
        backgroundColor: game.theme.colors.background,
      },
      predictiveBackGestureEnabled: false,
    },
    web: { favicon: './assets/favicon.png' },
    plugins,
    extra: {
      gameId: id,
      firebaseEnabled,
      eas: game.app.easProjectId ? { projectId: game.app.easProjectId } : undefined,
    },
    updates: game.app.easProjectId ? { url: `https://u.expo.dev/${game.app.easProjectId}` } : undefined,
    runtimeVersion: { policy: 'appVersion' },
  };
};
