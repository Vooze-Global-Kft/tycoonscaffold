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
import { withAndroidManifest, type ConfigPlugin } from 'expo/config-plugins';

/**
 * Every app of the factory is a game: `android:appCategory="game"` on the manifest's <application>
 * (Decision 47). Besides the store's category, it is what keeps the portrait lock on large screens:
 * Android 16 and 17 ignore `screenOrientation` and resizability on displays of sw600dp and wider for
 * apps that target them, except for games "based on the android:appCategory flag"
 * (developer.android.com/about/versions/17/changes/ff-restrictions-ignored, Exceptions). Expo has no
 * app.json field for it, hence this inline plugin.
 */
const withGameCategory: ConfigPlugin = (cfg) =>
  withAndroidManifest(cfg, (c) => {
    const app = c.modResults.manifest.application?.[0];
    if (app) app.$ = { ...app.$, 'android:appCategory': 'game' } as typeof app.$;
    return c;
  });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const games = require('./scripts/lib/games.js');

export default ({ config }: ConfigContext): ExpoConfig => {
  const id: string = games.resolveGameId();
  const game = games.writeActiveGame(id);
  const rel = (p: string) => './' + require('path').relative(games.ROOT, p).split(require('path').sep).join('/');

  const icon = rel(games.gameFileOr(id, 'icon.png', 'assets/icon.png'));
  const splash = rel(games.gameFileOr(id, 'splash.png', 'assets/splash-icon.png'));
  const adaptiveFg = rel(games.gameFileOr(id, 'adaptive-icon.png', 'assets/android-icon-foreground.png'));

  // React Native Firebase's config plugin fails the build without these files,
  // so it is only enabled once both are present. Until then the app logs
  // analytics to the console and uses local remote-config defaults, and
  // react-native.config.js keeps Firebase's native code out of the build.
  const { ios: iosFirebase, android: androidFirebase, enabled: firebaseEnabled } = games.firebaseFiles(id, game);

  const ads = game.monetization?.ads ?? {};
  // The game's own sentence (game.json app.trackingText, Decision 55), else the shared one with its name.
  const trackingText: string =
    game.app.trackingText ?? 'This lets us show you ads that are more relevant to you, which keeps ' + game.app.displayName + ' free to play.';

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
        // React Native Firebase takes Firebase as Swift packages and refuses static linkage
        // ("SPM + static linkage is not supported", https://rnfirebase.io/ios-spm).
        ios: firebaseEnabled ? { useFrameworks: 'dynamic' } : {},
      },
    ],
  ];
  if (firebaseEnabled) {
    plugins.push('@react-native-firebase/app', '@react-native-firebase/analytics', '@react-native-firebase/crashlytics');
  }

  return withGameCategory({
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
  });
};
