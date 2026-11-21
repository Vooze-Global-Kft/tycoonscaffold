# Idle Tycoon Factory

One React Native codebase, many idle tycoon games. A game is a single
`games/<id>/game.json` (plus optional art and sounds). The engine, UI, ads,
purchases and analytics are shared, so a new game is a new folder and a new
store listing.

Stack: Expo SDK 58 / React Native 0.88 · Skia (2D scene, effects) · three.js on
expo-gl (optional 3D scene) · Reanimated · zustand · AdMob
(`react-native-google-mobile-ads`) · RevenueCat · Firebase Analytics,
Crashlytics and Remote Config · zod-validated config · vitest.

## Quick start

```bash
npm install
GAME=pizza-empire npx expo start     # or GAME=space-miner
```

To try a game on your phone right away, install **Expo Go** from the App Store
or Play Store, put the phone on the same Wi-Fi as your computer, and run:

```bash
GAME=pizza-empire npm run go       # then scan the QR code (iPhone: Camera app)
```

Stop it with Ctrl+C and run `GAME=space-miner npm run go` for the other game.
In Expo Go and on web, ads, purchases and Firebase are mocked (purchases
succeed instantly so you can test the flows). For real ads, IAP and analytics, make a development build:

```bash
npx eas-cli@latest build --profile pizza-empire-dev --platform ios
```

## Making a game

| Way | Command |
|---|---|
| AI: Claude writes the theme, story, palette and store listing; the economy is copied from a balanced base game | `npm run generate -- "haunted hotel" --org com.yourstudio` |
| Clone and edit by hand | `npm run new-game -- candy-factory --name "Candy Factory"` |

Then:

```bash
npm run validate                 # schema + cross checks for every game
npm run simulate -- candy-factory  # bot playthrough: unlock timeline, first prestige
npm run sync                     # regenerate eas.json profiles + store listings
```

Add `icon.png` (1024×1024), `adaptive-icon.png` and `splash.png` to the game
folder; without them the shared placeholders are used.

### What's in game.json

- **app**: display name, bundle id / package, version, EAS project id
- **theme**: colours, corner radius, `scene: "skia" | "three"`, hero icon
- **strings**: currency, gem, prestige and tab names
- **economy**: milestones, prestige curve, offline cap, ad boost, daily gifts, time warp
- **businesses / upgrades / characters / story**: the content
- **monetization**: AdMob app and unit ids per platform, interstitial pacing, RevenueCat keys, IAP products
- **firebase**: paths to `GoogleService-Info.plist` / `google-services.json`
- **store**: title, subtitle, keywords, descriptions (written to `games/<id>/store/` by `npm run sync`)

Every `icon` field takes an emoji (`"🍕"`, zero art needed) or `"asset:<key>"`
pointing at an image in `assets`. Sounds: add `sfx_tap`, `sfx_buy`, `sfx_cash`
or `music` to `assets`.

## Layout

```
games/<id>/game.json     one folder per game (folders starting with _ are ignored)
src/engine/              pure TS economy + tests; no React, no native code
src/config/schema.ts     the GameConfig contract (zod)
src/config/game.ts       loads the active game; Remote Config override keys
src/services/            ads, iap, firebase, feedback; sdks.ts is the only place native SDKs load
src/state/store.ts       zustand store: engine actions + side effects (analytics, ads, saves)
src/ui/                  screens, Skia and three.js scenes
scripts/                 generate, new-game, validate, simulate, sync
app.config.ts            builds the Expo config from GAME=<id>
```

`app.config.ts` writes `src/generated/activeGame.ts` so the bundle only
contains the selected game. On EAS, the `eas-build-post-install` hook does the
same from the `GAME` env set in each profile.

## Per-game setup before release

1. **AdMob**: create an app per platform plus banner, interstitial and rewarded units; put the ids in `monetization.ads` and set `forceTestAds: false`. Debug builds always use Google's test ads.
2. **RevenueCat**: create the app and add the product ids from `monetization.iap.products` in App Store Connect, Play Console and RevenueCat; paste the public SDK keys. Turn on the RevenueCat → Firebase integration so revenue lands in analytics.
3. **Firebase**: add iOS and Android apps, then drop the two config files in the game folder and point `firebase` at them. Link AdMob to Firebase for ad revenue per user.
4. **EAS**: `npx eas-cli@latest init` with `GAME=<id>`, copy the project id into `app.easProjectId`, then `npm run sync`.
5. Build and submit with `npx eas-cli@latest build --profile <id>-production` and `submit --profile <id>-production`; push the iOS listing with `eas metadata:push`. The Play listing in `store/play/` uses the fastlane `supply` layout.

## Live tuning and A/B tests

Remote Config parameters named after the keys in `REMOTE_KEYS`
(`src/config/game.ts`) override the built-in values without a store release:
boost length and multiplier, offline cap, interstitial pacing, and global
cost/revenue scaling. Use Firebase A/B Testing on these per game.

Every analytics event carries `game_id`, and event names are the same in every
game, so games compare like-for-like (D1/D7 retention, ARPDAU, rewarded views
per DAU, IAP conversion).

## Monetization design

- **Rewarded ads earn most of the money** in idle games, so they're offered often: ×N profit boost (stacks up to a cap) and doubled offline earnings.
- **Interstitials are rare**: never in the first `firstInterstitialAfterSec` seconds, at least `interstitialCooldownSec` apart, and only at natural breaks (tab change, collecting offline earnings, prestige).
- **No Ads** also grants rewarded boosts without watching, which makes it a better buy.
- Consent: Google UMP form (GDPR / US states), then ATT on iOS, then the SDK init. Players can reopen it from Privacy settings in the Shop.

## Commands

| | |
|---|---|
| `npm test` | engine unit tests (also validates every game.json) |
| `npm run typecheck` | TypeScript |
| `npm run validate` | config errors and release warnings |
| `npm run simulate -- <id>` | pacing report |
| `npm run sync` | eas.json + store listings |
| `npm run generate -- "<theme>"` | AI-generated game (needs `ANTHROPIC_API_KEY` or `ant auth login`) |
