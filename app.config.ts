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
import { AndroidConfig, withAndroidManifest, withStringsXml, type ConfigPlugin } from 'expo/config-plugins';

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

/** What Play Games Services (v2) puts into every app that links it: its start-up provider and two screens. */
const PLAY_GAMES_PROVIDER = 'com.google.android.gms.games.provider.PlayGamesInitProvider';
const PLAY_GAMES_ACTIVITIES = [
  'com.google.android.gms.games.internal.v2.resolution.GamesResolutionActivity',
  'com.google.android.gms.games.internal.v2.appshortcuts.PlayGamesAppShortcutsActivity',
];

/**
 * Play Games Services for the leaderboards (modules/game-services, src/services/boards.ts).
 *
 * With a project id (game.json `leaderboards.playGamesProjectId`): the id goes into a string resource
 * and the manifest's APP_ID entry points at it (the SDK reads it as a string: a literal number in
 * the manifest is stored as an integer and read as nothing).
 *
 * Without one, the game has no leaderboard on Android, but the SDK is still linked into the app
 * (one codebase): its start-up provider and its two screens are removed from the manifest, so
 * nothing of it runs or is reachable, and the native module answers "not configured".
 */
const withPlayGames: ConfigPlugin<{ projectId?: string }> = (cfg, { projectId }) => {
  if (projectId) {
    cfg = withStringsXml(cfg, (c) => {
      c.modResults = AndroidConfig.Strings.setStringItem([{ $: { name: 'game_services_project_id', translatable: 'false' }, _: projectId }], c.modResults);
      return c;
    });
  }
  return withAndroidManifest(cfg, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    if (projectId) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, 'com.google.android.gms.games.APP_ID', '@string/game_services_project_id');
      return c;
    }
    c.modResults.manifest.$ = { ...c.modResults.manifest.$, 'xmlns:tools': 'http://schemas.android.com/tools' };
    type Node = { $: Record<string, string> };
    const nodes = app as unknown as { provider?: Node[]; activity?: Node[] };
    const removed = (name: string): Node => ({ $: { 'android:name': name, 'tools:node': 'remove' } });
    nodes.provider = [...(nodes.provider ?? []).filter((n) => n.$['android:name'] !== PLAY_GAMES_PROVIDER), removed(PLAY_GAMES_PROVIDER)];
    nodes.activity = [...(nodes.activity ?? []).filter((n) => !PLAY_GAMES_ACTIVITIES.includes(n.$['android:name'])), ...PLAY_GAMES_ACTIVITIES.map(removed)];
    return c;
  });
};

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
  // The game's own sentence (game.json app.trackingText, Decision 55), else the shared one with its name.
  const trackingText: string =
    game.app.trackingText ?? 'This lets us show you ads that are more relevant to you, which keeps ' + game.app.displayName + ' free to play.';

  // Leaderboards (game.json `leaderboards`): Game Center needs its entitlement in the iOS app of a game
  // with a board there; Play Games needs the project id (withPlayGames above).
  const boards: { iosId?: string; androidId?: string }[] = game.leaderboards?.boards ?? [];
  const gameCenter = boards.some((b) => b.iosId);
  const playGamesProjectId: string | undefined = boards.some((b) => b.androidId) ? game.leaderboards?.playGamesProjectId : undefined;

  // Android draws a notification's small icon in one colour from its alpha channel: the game's own
  // glyph (scripts/art/notification-icons.py) when it has one.
  const notificationIcon = games.gameFileOr(id, 'notification-icon.png');

  const plugins: ExpoConfig['plugins'] = [
    'expo-asset',
    // The game never records and never plays while it is in the background (src/services/fx/audio.ts:
    // `shouldPlayInBackground: false`). Left at its defaults this plugin declares a microphone
    // purpose string and the audio background mode on iOS, and RECORD_AUDIO plus a media-playback
    // foreground service on Android: App Review asks what an unused background mode is for
    // (guideline 2.5.4), and Play wants a declaration with a video for every foreground service type.
    ['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false }],
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
    // Reminders are local notifications only (src/services/reminders.ts): no push entitlement, no
    // token. Listed explicitly, because prebuild applies this plugin with remote notifications ON
    // for any project that has the package installed.
    [
      'expo-notifications',
      {
        enableRemoteNotifications: false,
        color: game.theme.colors.primary,
        ...(notificationIcon ? { icon: rel(notificationIcon) } : {}),
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

  const expo: ExpoConfig = {
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
      // EAS does not manage the Game Center capability: the entitlement here is the whole step.
      entitlements: gameCenter ? { 'com.apple.developer.game-center': true } : undefined,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // The save (AsyncStorage) goes into the phone's backup, so a new or restored iPhone has the
        // player's game: AsyncStorage keeps itself out of backups unless this is false. Android
        // backs the same data up by default (Auto Backup, android.allowBackup).
        RCTAsyncStorageExcludeFromBackup: false,
      },
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
  return withPlayGames(withGameCategory(expo), { projectId: playGamesProjectId });
};
