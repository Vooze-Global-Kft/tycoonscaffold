# Scrapyard: what the codebase and a server need (research-tech)

Written 25 November 2026 for the fifth game (`scrap-yard`, mode `salvage`); checked and corrected
the same day (research-check-tech: every web source below was re-opened on 25 November 2026, the
code claims were re-read in the files). No `docs/design/yard-design.md` existed, so nothing here
assumes its decisions. "Inference" marks reasoning; "From memory" marks what could not be read.

## A. Landscape

### What assumes portrait today

| # | Where | What | Per-game orientation without changing the four games |
|---|---|---|---|
| A1 | `app.config.ts:84` | `orientation: 'portrait'` for every game | `orientation: game.app.orientation ?? 'portrait'`, with an optional `z.enum(['portrait','landscape'])` in the app block of `src/config/schema.ts` (the `app` object, about line 167). The four game.json files do not set it, so diff `GAME=<id> npx expo config --type public --json` for the four games before and after. Expo's app config reference (docs.expo.dev/versions/v58.0.0/config/app/): `orientation` "Locks your app to a specific orientation with portrait or landscape. Defaults to no lock." (values `default`, `portrait`, `landscape`). |
| A2 | `app.config.ts:13-25` | `android:appCategory="game"` keeps the lock on large Android screens | Per app already; works for landscape. Nothing to change. |
| A3 | `app.config.ts:89` | `supportsTablet: false` | Leave it. |
| A4 | `app.config.ts:57` | splash `imageWidth: 200, resizeMode: 'contain'` | Orientation-free. The crane loading screen is the mode's own `ModeEntry.Loading` (`src/modes/contract.ts`, used in `src/ui/App.tsx`), so `App.tsx` does not change. |
| A5 | `src/ui/kit/Sheet.tsx:71` | Every kit dialog is a React Native `Modal` with no `supportedOrientations` | **The main trap.** reactnative.dev/docs/modal: `supportedOrientations` "allows the modal to be rotated to any of the specified orientations. On iOS, the modal is still restricted by what's specified in your app's Info.plist's UISupportedInterfaceOrientations field." Platform iOS, "Default: `['portrait']`". Expo Go's own Info.plist allows portrait, so there a Sheet may turn the screen to portrait (an Expo forum user reports exactly that: forums.expo.dev/t/screenorientation-lockasync-not-working-while-modal-open/47358, individual report). In a standalone landscape-only build the plist has no portrait; UIKit raises "Supported orientations has no common orientation with the application" when a presented controller asks for none of the app's orientations (individual reports for other SDKs; *Inference* that the RN Modal hits it). So the risk is a rotation in Expo Go and possibly a **crash** in the store build. Changing `Sheet.tsx` changes all four bundles (shared level (a), `scripts/lib/modes.js` SHARED_UI). Recommended: salvage dialogs are its own absolute-positioned overlays registered with `useOverlay` (AGENTS.md allows "the kit `Sheet` (or registers with `useOverlay`)"). Any other `Modal` the salvage mode reaches (shared popups) must be listed and checked on a standalone build before release. |
| A6 | `src/ui/kit/Sheet.tsx:73,100` | Card `maxHeight` 86 % of the window height, `alignSelf: 'stretch'` | In landscape about 335 pt high and full width. Solved by A5's own overlays (side panels or centred cards with a maximum width). |
| A7 | `src/ui/hints/HintOverlay.tsx:190` | The "top right corner" hand rule uses `rect.y + rect.height < 170` | 170 pt is nearly half a landscape screen. Avoid with `sceneKeys`/`fromAboveKeys` (`src/ui/hints/source.ts`). World things move with the camera and the overlay polls once a second, so the mode draws its own pointer for world things and uses the shared hand for HUD buttons only. |
| A8 | `src/ui/decree/layout.ts:89-90`, `src/ui/merge/MergeShell.tsx:27`, `src/ui/decree/DecreeShell.tsx:30` | The newer modes already pass `insets.left/right` | The salvage layout takes all four insets, as `deskLayout` does. *From memory:* Dynamic Island iPhones in landscape have about 59 pt left and right, 21 pt bottom, 0 top, and the island swaps sides when turned. Never put the stick or a button under an inset. Copy `src/ui/merge/devInsets.web.ts` (`?insets=`) into the mode with a left/right form. |
| A9 | 390 × 844 / 375 × 667 tables in `src/ui/{sim,decree,haul,merge}/layout.ts`, `scripts/art/*-sheets.ts` | Each belongs to its mode | Nothing shared. Salvage tables 844 × 390 (or 852 × 393) and 667 × 375. |
| A10 | `scripts/store/types.ts:62-68` (`SIZES`: 1320 × 2868, 1284 × 2778, 1080 × 1920, all portrait), `scripts/store/shots.ts:421-424`, `scripts/store/templates/frame.ts:31-45` | The store tool is portrait | Node only, no bundle change. Add sizes for this game only: `ios-6.9-land` 2868 × 1320 (956 × 440 pt @3), `ios-6.5-land` 2778 × 1284, `play-land` 1920 × 1080; give `GameScenes` an `orientation`. The four portrait sets stay byte for byte. See the Apple note below about the "medium display" class. |
| A11 | `src/dev/devtools.web.ts` | No size switch: the preview is the browser viewport | Run shots at `--w 844 --h 390` and `--w 667 --h 375`. |

**Store rules for landscape screenshots (read 25 November 2026):**
- Apple, "Screenshot specifications" (developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications). "iPhone with Dynamic Island (large display)": "2868 x 1320 pixels (landscape)", also 2796 × 1290 and 2736 × 1260 landscape. "iPhone with Face ID (large display)": "2778 x 1284 pixels (landscape)" and 2688 × 1242; "Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided". **Missed in the first draft:** the page's "Required device sizes" now reads: "iPhone: At least one screenshot for iPhone with Dynamic Island (medium display)", whose sizes are "2556 x 1179 pixels (landscape)" and "2622 x 1206 pixels (landscape)" (portrait 1179 × 2556, 1206 × 2622); its note says scaled Face ID (large display) shots are used if none are given. The page is not self-consistent on which set is the fallback; check in App Store Connect at the first upload. The store tool has no medium size (A10): this concerns all five games, not only this one (a lead question). Up to 10 per size, no alpha. Nothing about mixing orientations.
- Google Play (support.google.com/googleplay/android-developer/answer/9866151): phones "Include 9:16 portrait screenshots, 16:9 landscape screenshots, or both"; "For games you must provide at least three 16:9 landscape screenshots" (minimum "1920x1080px") or "three 9:16 portrait screenshots" (minimum "1080x1920px"); sides 320 to 3,840 px; the long side at most 2.3 times the short; at least two screenshots overall to publish.
- *Inference:* landscape sets also help dimension 7 (template) against the four portrait games.

**Byte identity.** The bundle report's `sourceHash` covers `package-lock.json`, `app.config.ts`, `scripts/lib/games.js`, the fx catalogues, the game.json and every bundled project module (`scripts/check-bundle.ts:505-511`, `reportSources`). Any edit to `app.config.ts`, or to a bundled shared file such as `schema.ts`, makes the four `bundle-report.json` files stale until `npm run check:bundle -- --export` runs again (accepted in `docs/design/office-build-plan.md`, "Known consequence", and BRIEF). What must stay identical: the expo config output (A1), the bundle contents (no salvage file in the four bundles), `src/engine/modeRegression.test.ts`, and the fingerprint fixtures `scripts/lib/fingerprint.pairs.fixture.json` and `fingerprint.pizzaOrbit.fixture.json`.

### Does Expo Go honour a landscape orientation on an iPhone?

Yes, by its source. `apps/expo-go/ios/Exponent/Kernel/Views/EXAppViewController.mm` (expo/expo main branch, read 25 November 2026) has `NSString *orientationConfig = _appRecord.appLoader.manifest.orientation;` and in `orientationMaskFromManifestOrDefault` returns `UIInterfaceOrientationMaskLandscape` for `"landscape"`. `supportedInterfaceOrientations` defers first to react-native-screens (`shouldUseRNScreenOrientation`; not installed here: absent from `package.json`) and to `ScreenOrientationRegistry.shared requiredOrientationMask` (expo-screen-orientation, not installed), else returns the manifest mask. Old forum posts (SDK 44) report iOS ignoring `orientation` (individual reports). Not yet seen on a device.

Run-time lock. docs.expo.dev/versions/v58.0.0/sdk/screen-orientation/ says the module is "Included in Expo Go", but it is **not** in `package.json`; a store build would need it added (a new native dependency, against BRIEF), and the page warns for iOS 27: "`lockAsync` may have no effect. The system can refuse the request, and your app stays resizable", and that `requireFullScreen` "no longer opts your app out of being resized". Recommended: no lock module; rely on the manifest (A1). If the window is taller than wide (old Expo Go, iPad, a resizable window), the salvage shell draws a "turn your phone sideways" card from `useWindowDimensions()` and pauses input. Check on the owner's phone the first time `GAME=scrap-yard npm run go` runs.

## B. A steered worker

### What the project already does

- `src/ui/haul/scene/Field.tsx` bakes the atlas once per pixel density, queued behind the loading screen (`queueAtlas`); `?fieldStress=1` draws the worst-case sprite budget (`Field.tsx:78-79`).
- `src/ui/haul/scene/frameLoop.ts` runs ONE `useFrameCallback`, reads a frame table the JS thread pushes each tick (`model.ts buildFrame`), interpolates between ticks, and writes RSXform, rect and colour buffers made once and changed in place. It draws at vsync only while something moves fast, otherwise every 30 ms (`SLOW_MS = 30`, line 36; used at line 249).
- Input: the React Native responder (`src/ui/haul/gestures/useFieldGestures.ts`); the finger is written into a Reanimated value once per responder move from the JS thread (`src/ui/haul/gestures/fieldInput.ts`, `dragLine`).

AGENTS.md adds: worklets call only worklets (`npm run lint:worklets`), nothing invisible animates, never free a picture a canvas may draw, select few store values (`game` changes ten times a second).

### How to build it with what is installed

1. **Virtual stick.** One full-screen responder view over the world canvas; a floating stick appears where the thumb lands; write `{dx, dy, held}` into a `makeMutable` value, as `dragLine` does. React Native's responder docs (reactnative.dev/docs/gesture-responder-system) imply one responder at a time ("Something else is the responder right now and will not release it") and say `nativeEvent.touches` is the "Array of all current touches on the screen". So while the stick holds the responder, a `Pressable` under the other thumb does not fire; a second simultaneous control means one view reading every touch by `identifier` and zone. *Recommendation (fits "one thumb"):* release the stick next to a wreck and a contextual action ring appears under the thumb; hold it to cut; moving again cancels.
2. **Movement and camera on the UI thread.** A frame callback integrates velocity, position, collision and a camera lerp from the stick value and writes `pos`/`cam` shared values the canvas reads (the haul pattern). The JS thread also runs the 10 Hz tick, zustand, saving and GC, so it would stutter; a React state update per frame is forbidden.
3. **The rules own the world, the UI thread owns the walk.** `src/engine/salvage/` (pure, 10 ticks a second) holds what earns: inventory, cut progress, loads, machines, queues, shipments, helpers' jobs. The player's position is an input: the JS side samples `pos.value` and passes it to actions (`startCut(wreckId, pos)`), and the rules check the distance. Helpers are rules state (path id and progress), interpolated on screen from the frame table. A bot can play the rules without a screen.
4. **Collision.** The yard's static layout as a tile grid (e.g. 0.5 m cells) in a `Uint8Array`, copied into a shared value once per layout; the worker is a circle tested one axis at a time (slides along walls); movable things (≤ about 100) as circles or boxes pushed only on change. "Near a thing": the UI thread finds the nearest interactable within *r* each frame for the highlight; the rules repeat the check. *Inference:* well under 0.2 ms a frame.
5. **The world.** A yard of about 3 × 2 screens as ground chunks baked to images (512 pt), only visible chunks drawn; static props one picture per chunk; moving things in at most three `Atlas` draws (under, actors, over), the haul split of `ATLAS_A`/`ATLAS_B` (`frameLoop.ts`).
6. **How many moving things at 60 fps.** Nothing in the repository measures device frame time (the haul plan asks only for "frame time in the preview with 36 drones", `docs/design/space-build-plan.md:129`). *Inference:* the cost is the worklet loop that fills the buffers, not the GPU; a safe budget is ≤ 40 actors and ≤ 300 atlas sprites a frame including particles, 60 fps while the stick or camera moves and 30 otherwise. Ship `?yardStress=1` in stage 1 and read the frame time on the owner's iPhone before the business layers are built.
7. **Bake into atlases** at the device density while the crane screen runs: worker walk and cut frames (4 directions with mirroring, about 6 frames), the truck loaded and empty in 8 or 16 headings (a 3/4 view cannot just rotate), wrecks in 3-4 cut stages, a pile per metal, helpers, forklift, crane hook, magnet, sparks, smoke, the highlight ring. *From memory:* keep a page ≤ 4096 px (≤ 1365 pt at @3x).
8. **Keep apart** the rules state (10 Hz, saved, offline-capable), the frame table (plain numbers per tick) and the presentation (shared values, never saved). The save holds only the worker's last tile.

### The three most likely ways this goes wrong on an iPhone

1. **A dialog turns the screen or crashes the store build** (A5). The web preview never shows it. Use the mode's own overlays and test every dialog on the phone in stage 1 and on a standalone build before release.
2. **A second finger or an edge swipe breaks steering.** One responder (B1); a thumb near the edges meets the home indicator and the island inset, and deferring iOS edge gestures needs native code (*from memory*). Keep the stick zone ≥ 24 pt inside the safe area.
3. **The frame callback crashes or stalls only on the phone.** A non-worklet called from the frame callback works in the preview and crashes on the phone (AGENTS.md); per-frame allocations or copying the whole collision grid per tick cause GC hitches. Mitigations: `npm run lint:worklets`, buffers made once, the grid pushed only on layout change.

## C. A new mode

### Checklist for mode `salvage` and game `scrap-yard`

From `docs/design/space-bundle.md` ("Adding a mode") and the shared files the fourth mode touched (`docs/design/office-build-plan.md`):

1. Add `'salvage'` to `MODES` (`scripts/lib/games.js:22`), `ModeId` (`src/modes/contract.ts:25`), `FxMode` (`src/services/fx/catalog.ts:30`) and the mode enum (`src/config/schema.ts:157`); an opaque `salvage` block in the shared schema; `orientation` in the app block (A1).
2. `src/modes/salvage/index.tsx` (a default `ModeEntry`: `Shell`, `Loading`, `parts`, `hints`, `engine`, `presets`, `soundKeys`, `devViews`), `presets.web.ts`/`presets.ts`, `devViews.web.ts`/`devViews.ts`, `actions.ts`.
3. `scripts/lib/modes.js`: `MODE_FOLDERS.salvage` (line 16: `src/modes/salvage`, `src/ui/salvage`, `src/engine/salvage`, `src/engine/salvage.ts`, `src/engine/salvageMode.ts`, `src/engine/fixtures/salvage.ts`, `src/config/schema.salvage.ts`, `src/config/salvage.content.ts`), `NODE_ONLY` (`catalog.salvage.ts`), `WEB_ONLY` (bot, fixtures, `*.web.ts`), `WEB_ONLY_STRINGS`, `THEME_WORDS.salvage` (line 119; check with `--words` first), and `MODE_PACKAGES` (line 139) `{ firebase: ['salvage'] }` if D is adopted.
4. `src/services/fx/catalog.salvage.ts` and its branch in `scripts/lib/fxCatalog.js`; keys in `FxName`; `src/modes/salvage/soundKeys.ts`; `"soundPack": null` as Orbit Haulers.
5. Salvage branches in `src/config/lint.ts`, `scripts/validate.ts` (a `salvageChecks` hook like `decreeChecks`), `scripts/sync.ts`; the entry's pieces in `src/modes/entries.test.ts`; new vocabulary rows in `scripts/lib/fingerprint.ts` with `docs/design/research/spam.md`.
6. `games/scrap-yard/game.json`, `store/fingerprint.json`, `scripts/store/scenes/scrap-yard.ts` and a template of its own.
7. Gates: `npm run check:bundle -- --game scrap-yard --as-mode salvage`, then `npm run check:bundle` and `-- --export`; `modeRegression.test.ts` and `src/state/store.seams.test.ts` stay green.

**Name clashes.** Orbit Haulers has a "Salvage Bay" where "a laser traces the pod's seam" (`src/ui/haul/salvage/PodCutter.tsx:1-3`) and its game.json names "Halden Yards", "Brightwater Foundry. The furnace wants {ore}…" and "Scrap Pod" (`games/space-miner/game.json`), with iron, copper and platinum ores. The denylist ignores single lowercase words and words the new game's own data also uses (`space-bundle.md`, "String denylist"), but those proper names must never appear in the new game. *Inference:* "Salvage" in the store title or on a button raises dimensions 6 and 17 against Orbit Haulers; the mode id is invisible.

### Time away

`src/engine/mode.ts` (lines 112-123) has two seams:
- `paysOnCompute`: the store grants the absence's earnings in the update that computes them, at boot (`src/state/store.ts:431-435`) and on resume (`:492-494`).
- `catchUpSeconds`: the store's own catch-up limit, `MAX_CATCH_UP_SECONDS = 300` (`:191`); a short absence is ticked at full speed only when `!advanced` (`:504-507`), i.e. never when `offline()` returned a `game` (`:488-489`).

`clampClock` (`src/engine/economy.ts:375-388`) caps timers after a clock change and remembers the latest time seen in `stats.clockHigh`; absences are measured from `max(lastSavedAt, clockHigh)` (`economy.ts:1026`, `merge/offline.ts:28`, `decree/offline.ts:60`), so time already paid is not paid again. A single tick simulates at most 5 s (`MAX_TICK_SECONDS`, `store.ts:190`).

What a long-running business needs:
- **`paysOnCompute: true`** (BRIEF lesson 5).
- **`offline()` returns the advanced world** as a discrete-event pass, not hours of 10 Hz ticks: each batch and shipment carries an absolute `doneAt`/`arrivesAt`; take the next event in time order, apply, repeat up to `min(now, cap)`. O(events), the same code as the live tick; helpers' trips are events (an average trip time), not walked paths.
- **`catchUpSeconds: 0`**, so every absence goes through that pass, which also fills `report` (`mergedReport` joins two absences).
- **Cap the absence** in content (hours, extended by helpers or a product).
- **Exchange trades** only at the rules' "now"; standing orders fill during the pass at the path's price at the event's time (E).

### The fingerprint: where the game risks measuring too close

Each pair must differ on all 8 musts and on at least 15 of 19 (`scripts/lib/fingerprint.ts:1-4`). Musts 1 to 4 compare declared values (`:219-229`; two games of one mode are always "same") from closed vocabularies (`:66-76`). Declarations (`games/*/store/fingerprint.json`):

| Dim | Pizza Empire | Orbit Haulers | Lantern Row | Proudly Adequate | Scrapyard risk |
|---|---|---|---|---|---|
| 1 core_verb [M] | tap-target | drag/route | place/arrange | swipe/aim | A stick is a drag: `drag/route` equals Orbit. `hold` and `idle-only` are free. An honest new value (`steer`) can be added, as `office-ladder` was for 9. |
| 2 topology [M] | linear-chain-with-transport | network-routes | spatial-grid | parallel-generators | **Highest risk.** Gather-haul-process-sell is Pizza's chain; transport between territories is Orbit's network. Free: `vertical-shaft`, `single-node`. The walkable yard is the distinct part and needs a new value argued in the spec. |
| 3 money_moment [M] | customer-pays | sale-at-depot | contract-complete | auto-tick | The scale house equals `sale-at-depot`; partner contracts equal Lantern Row. Free: `tap-collect`. Selling into an exchange is honestly new (`exchange-sale`). |
| 4 layout [M] | side-cross-section | top-down-map | grid-board | single-object-focus | Free: `isometric-room`, `card-list`. A 3/4 scrolling landscape world needs its own value. |
| 9 progression | location-levels | sector-map | seasons | office-ladder | "Buy yards in territories" reads as `location-levels`. |
| 10 prestige | reset-for-currency | reset-for-currency | seasonal | new-location-carryover | `none` is free: the listing as the top of the ladder, not a reset. |
| 12 meta | … chests, missions, prestige | contracts, chests, prestige-tree … | contracts, chests … | prestige … | Avoid the ids `contracts` and `chests`. |
| 15 character | humans | robots | animals | humans | A human worker is the same as Pizza and Proudly Adequate. |
| 17, 6, 18 | | | | | Orbit's words (salvage, ore, copper, cargo, contracts) count. Measure `src/ui/salvage/strings.ts` and the listing early (`npx tsx scripts/validate.ts scrap-yard`). |

*Inference:* against Pizza Empire, if 2, 9, 10 and 15 are all "same" the pair fails (2 is a must); against Orbit Haulers musts 1 to 4 are all at risk. Dimension 7 is helped by landscape; dimension 19 needs ≥ 14 days after Proudly Adequate's submission.

## D. A server for three features

### Assumptions (Inference)

Per daily player and day: 3 sessions; 4 progress submissions; 2 leaderboard views; 3 visits (one summary each); 1 look at their own company (1 + up to 30 member summaries); about 0.05 company changes. MAU ≈ 3 × DAU. So about 36 reads and 8 writes per player per day; if each submission writes three documents (player, public summary, member row), writes are about 12, which moves the Firestore totals below by roughly half on the write line only.

### What is already installed

`node_modules/firebase` 13.1.0 (the JS SDK) is a dependency of `@react-native-firebase/app` (`package-lock.json:5872-5875`; `node_modules/@react-native-firebase/app/package.json:117`). `@firebase/auth` 1.13.8 has a `"react-native": "dist/rn/index.js"` entry, exports `getReactNativePersistence` there (checked in `dist/rn/index.js`), and has an optional peer `@react-native-async-storage/async-storage` "^2.2.0 || ^3.0.0" (installed 2.2.0, a direct dependency). `@firebase/firestore` 4.19.0 has `dist/index.rn.js` and a lite build. Not a direct dependency: using it means adding `"firebase": "13.1.0"` to `package.json` (a lead decision) and changes `package-lock.json` (stale reports, A).

The `@react-native-firebase/*` packages are native and loaded only through `src/services/sdks.ts:1-18` (null in Expo Go). Expo's guide (docs.expo.dev/guides/using-firebase/): React Native Firebase "requires custom native code and cannot be used with Expo Go"; with the JS SDK "You do not have to install other plugins or configurations"; and "Expo SDK only supports `firebase@12.0.0` and above" (13.1.0 qualifies). Whether Metro resolves the RN entries without config changes under SDK 58 was not tested.

### The three choices

| | Firebase (JS SDK: anonymous Auth, Firestore, Cloud Functions) | Supabase (supabase-js: Postgres, RLS, Edge Functions) | PlayFab (HTTPS Client API) |
|---|---|---|---|
| Runs in Expo Go | Yes (guide above); already in `node_modules`. | Pure JS (from memory); **not installed**. | REST from `fetch` (from memory); no SDK. |
| Free allowance | Firestore (firebase.google.com/docs/firestore/pricing): "Document reads: 50,000 per day", writes and deletes 20,000 per day, 1 GiB stored, 10 GiB egress a month; "exactly one free database per project"; "a minimum charge of one document read for each query … even if the query returns no results". Functions are Blaze only (Spark: "Not applicable"): "No-cost up to 2M/month" invocations, 400K GB-s, 200K CPU-s (firebase.google.com/pricing). Auth: the "No-cost up to 50K MAUs" line sits under "With Identity Platform"; what plain anonymous sign-in costs without it is not stated there. | Free: "50,000 monthly active users", "500 MB database size", "5 GB egress", 500,000 function invocations, "Limit of 2 active projects", "Free projects are paused after 1 week of inactivity." (supabase.com/pricing) | Development mode: "A title in development mode can only have up to 1,000 lifetime player account creations." (developer.microsoft.com/en-us/games/products/playfab/pricing/) |
| Unit prices | us-central1: "$0.03 per 100k reads", "$0.09 per 100k writes", "$0.01 per 100k deletes" (firebase.google.com/docs/firestore/standard-edition); functions "$0.40/million". | Pro "from $25/month": 100,000 MAU then "$0.00325 per MAU"; 8 GB disk then $0.125/GB; 2M invocations then "$2 per 1 Million". | Pay-as-you-go: profile writes "$7.15 per million", reads "$0.33 per million"; leaderboard writes $0.5/M, reads $0.10/M; statistics writes $0.63/M; CloudScript "$0.22 per million executions". Standard "$99/mo". |
| 1,000 DAU | ≈ 36k reads, 8-12k writes a day (board as one document): **$0** on Blaze | Free (3k MAU): $0, but pausing; Pro $25 | Over the 1,000-account cap at once: ≈ **$1** |
| 10,000 DAU | ≈ 12M reads, 2.4-3.6M writes a month: ≈ $3.2 + $1.6-2.7, functions ≈ $0.2: **≈ $5-6/month** | 30k MAU: **$25** | ≈ **$15** |
| 100,000 DAU | ≈ $36 + $21-32, ≈ 12-24M invocations ≈ $4-9, compute ≈ $2: **≈ $65-80/month** | 300k MAU: $25 + 200k × $0.00325 = $650+, **if** anonymous users count as MAU (the anonymous sign-in guide does not say): **≈ $700/month** | ≈ 12M profile writes $86 + statistics and boards ≈ $20 + CloudScript ≈ $5: **≈ $110** |
| Cap of 30 members | A transaction in a callable function: `memberCount` + 1 ≤ 30, member doc created, player's `companyId` empty. Firestore transactions retry on contention, so two joiners cannot both take seat 30 (from memory of the transactions docs). | A `join_company()` Postgres function with `SELECT … FOR UPDATE`; RLS denies direct inserts. | Groups API with a CloudScript check; not atomic against a parallel join (*Inference*); needs a recheck. |
| Score checked on the server | Callable `submitProgress(snapshot)` runs the same pure rules (`src/engine/salvage/*` is plain TypeScript, importable in Node): claimed assets cost ≤ claimed lifetime earnings, and the ranked number grew no faster than the rules' maximum rate × server time since the last accepted snapshot. Only the function writes rank fields. | The same in an Edge Function (Deno) or SQL. | CloudScript; statistics server-write-only. |
| Reads of others limited | Rules on public docs for signed-in users; list queries capped. Verified (firebase.google.com/docs/firestore/security/rules-query): "The `request.query` variable contains the `limit`, `offset`, and `orderBy` properties", e.g. `allow list: if request.query.limit <= 10;`, and "security rules are not filters---queries are all or nothing". Private docs owner-only; the save is never uploaded. | RLS per table; a view of public columns | Player data permissions (from memory) |
| Account deletion | Callable `deleteMe`: leave the company (hand over or close), delete the docs, `admin.auth().deleteUser` (from memory). TTL clean-up of abandoned public docs is documented (firebase.google.com/docs/firestore/ttl): "typically deleted within 24 hours after its expiration date", "TTL delete operations count towards your document delete costs" (and have no free quota, pricing page), and TTL "does not delete subcollections", so `companies/{cid}/members` needs its own field or the function. | RPC plus the admin API from an Edge Function | `DeleteMasterPlayerAccount` (from memory) |
| Keys | "API keys for Firebase services are OK to include in code or checked-in config files" (firebase.google.com/docs/projects/api-keys, which also says to "review and apply appropriate restrictions and limits to them", to protect data with Security Rules, and that a Gemini Developer API key "should never be included in your code"). Never in the app or repository: a service-account JSON or admin credentials. | Publishable/anon key "Safe to expose online"; secret/service_role key: "Never put one in a browser, a shipped application, or source control." (supabase.com/docs/guides/api/api-keys; not re-opened in this check) | Title id public; the title secret key only in CloudScript or a server (from memory). |
| What the owner creates | A Firebase project per game (`src/services/firebase.ts` already assumes one per game); a Web app (config); Anonymous sign-in; Firestore; Blaze with a budget alert; restrict the API key; deploy rules and functions from a `server/` folder outside `src/`. Auth limits (firebase.google.com/docs/auth/limits): "New account creation: 100 accounts/hour for each IP address"; "Anonymous user accounts: 100 million". | Project, anonymous sign-ins, CAPTCHA ("strongly recommended to enable invisible CAPTCHA or Cloudflare Turnstile"; "An IP-based rate limit is enforced at 30 requests per hour", supabase.com/docs/guides/auth/auth-anonymous), migrations | A title, API policy, CloudScript, a paid plan past 1,000 accounts |

**Limit common to all three (Inference).** Expo Go has no device attestation from plain JS (the RN App Check is native), so anyone with the config can act as some anonymous player. Rules and functions assume a hostile client: rank only what the server checked, cap writes per uid, filter every name server-side (L5 d); reports go to `reports/{id}`, blocking is local.

### Recommendation: Firebase (JS SDK), Firestore and callable functions

Already in the tree, works in Expo Go, cheapest at every size above, atomic joins, rules enough for the read limits. The salvage mode holds both implementations of one interface (`OnlineService`: `board(season)`, `visit(id)`, `myCompany()`, `create(name, logo)`, `join(id)`, `leave()`, `submit(snapshot)`, `report(id)`, `deleteMe()`). The local one is the default; the real one is chosen only when `salvage.online.firebase` (the web config) is present in game.json.

**Data model (one page).**
- `players/{uid}` (owner read; rank fields written by functions only): `{companyId|null, joinedAt, lastSubmitAt, acceptedNetWorth, acceptedTonnes, season}`.
- `publicPlayers/{uid}` (functions only): `{name: generated "Yard 4821" (no free text for people), level, yards, tonnesSeason, netWorth, companyId, updatedAt, expiresAt}`. Readable by signed-in users, `limit <= 50`.
- `companies/{cid}` (functions only): `{name (filtered), logo: {shape, colours, glyph} (from parts, no upload), ownerUid, memberCount ≤ 30, open, tonnesSeason, createdAt}`.
- `companies/{cid}/members/{uid}` (functions only): `{role, joinedAt, tonnesSeason}`.
- `boards/{season}-{kind}`: one document per board (top 100 players, top 100 companies), rewritten by a scheduled function every 10 minutes, so a board view costs one read.
- `reports/{rid}`: create-only by signed-in users, unreadable in the app.
- Functions: `submitProgress`, `createCompany`, `joinCompany`, `leaveCompany` (transactions; the cap), `deleteMe`, `rebuildBoards`, `onReport` (a threshold hides a name until the owner looks).
- Rules: deny by default; `players/{uid}` the owner's own; everything ranked or public written by functions; list limits; `reports` create-only with size limits.

## E. One world without a server

**Prices from the calendar.** Each metal on each invented exchange gets a log-price that mean-reverts, with jumps: the one-factor model of Schwartz (1997), "The Stochastic Behavior of Commodity Prices: Implications for Valuation and Hedging", *Journal of Finance* 52(3), 923-973 (record: econpapers.repec.org/RePEc:bla:jfinan:v:52:y:1997:i:3:p:923-73; full text not read). Secondary source read for the form: S. Jaimungal, lecture notes "Spot models" (utstat.toronto.edu/sjaimung/courses/Commodities/SpotModels.pdf, via search 25 November 2026), and search summaries of papers stating that in this model ln S follows an Ornstein-Uhlenbeck process, dX = κ(α − X)dt + σdW. Jumps after Merton's jump diffusion (Merton 1976; from memory).

Exact discrete OU step on a grid aligned to the epoch (Δ = 5 min):

x(n+1) = μ + (x(n) − μ)·e^(−κΔ) + σ·√((1 − e^(−2κΔ))/(2κ))·ε(n) + J(n)

ε(n) and J(n) come from a counter-based hash of `(worldSeed, exchange, metal, n)` (never a sequential generator, so any step stands alone); J is non-zero with a small probability and decays through the reversion. The value at *t* is computed by iterating from the anchor `floor(t/W)·W − W` (W = 7 days) starting at μ; with a half-life of about a day, e^(−κW) < 1 %, so the start is forgotten, every phone agrees, and the only seam is a sub-1 % jump once a week. About 4,000 steps per metal per week (*Inference*: under 1 ms for 12 metals); cache and step forward.

Two exchanges as two markets: a common factor per metal plus an exchange factor; the spread reverts fast (arbitrage); each opens at its own invented hours; seasonal drift as a slow sine in μ.

**Seasons.** `floor((t − epoch)/7 days)`, the same on every phone.

**A changed clock (corrected).**
- *Cannot be prevented without a server:* reading ahead. The formula is in the app; a player who moves the clock forward sees future prices.
- *What the existing code does:* `clampClock` (`src/engine/economy.ts:375-388`) only caps timers and records `stats.clockHigh`, and the shared offline guard pays absences from `max(lastSavedAt, clockHigh)`. It does **not** hold the game's "now" at the peeked time: actions still receive the device's `now` (the first draft said otherwise). So a player could peek forward, set the clock back and trade at a past price they now know.
- *What the salvage rules must add (Inference):* price every trade, order and event at `max(now, clockHigh)` (a monotonic market clock in the mode's own rules), so after a peek the market stays at the peeked time until the real clock passes it, and trades never happen at a time already seen. No future chart in the interface. A reinstall loses `clockHigh` but also the save.

Keep the stake small: swings of ±20-30 % around μ, a buy-sell spread, daily volume limits per partner. With the server, `submitProgress` compares against server time and boards rank only what passed.

**Local stand-in for other players.** About 200 invented companies (names and logos from generated parts, L2), each a seed and a temperament; each season score a pure function of `(seed, season, t)` (logistic growth plus hashed noise), so every phone shows the same rival board. "Visit" opens a read-only card generated from the seed; "Companies" lists invented open companies with simulated members, and the player can create or join one (≤ 30, the same rule code as the server). *Inference (lesson 6):* labelled as simulated ("Rival yards (simulated)"), never presented as real people; the real service replaces them by switching the `OnlineService` implementation.

## F. The size of the thing

### Fourth game, counted on 25 November 2026 (lines; tests separate)

| Part | Code | Tests |
|---|---|---|
| Rules: `src/engine/decree`, `decree.ts`, `decreeMode.ts`, `schema.decree.ts` | 9,197 | 4,474 |
| Screens and art: `src/ui/decree` (8,217 under `art/`) | 17,315 | 1,890 |
| Mode entry `src/modes/decree` | 415 | 41 |
| Content tooling `scripts/content/office/*.ts`, `build-office.py`, `decree-bot.ts` | 4,212 | |
| **Total** | **≈ 37,500 with tests** | |

`games/high-office/game.json` is 513 KB; built over 23 and 24 November (`git log`). Haul UI is 17,068 lines, merge rules 6,884.

### Estimate for the scrapyard (Inference)

| Part | Lines |
|---|---|
| The hand (stick, walk, truck, camera, collision, cut, carry, helpers on screen) | 8-10k UI + 2k rules |
| Business rules (≈ 12 metals and alloys, sorting, shredder and baler, pyro and hydro lines, partners, 4 transport means, territories, two exchanges, the listing, event-driven time away) | 10-14k + 6k tests |
| Screens (HUD, shop, plant builder, exchange charts, partners, logistics map, territories, listing, board, visit, companies) | 12-15k |
| Art kit (world, vehicles, machines, metals, logos) | 10-12k |
| Online (interface, local simulation, Firebase implementation, server rules and functions) | ≈ 5k with tests |
| Bot and build script | ≈ 4k |
| **Total** | **55-70k, about 1.5-2× the fourth game** |

### Order in which each stage leaves a playable game

1. **First yard:** landscape shell, crane loading screen, one yard, stick, worker, cut, carry, truck to the scale, 4 metals (steel, cast iron, copper, aluminium), a better cutter and truck, the first helper with earnings while away; fixed prices; local save. To the owner's phone, with the frame-time check and a dialog check.
2. Sorting, shredder and baler, the first furnace (pyro), ingots, brass and bronze; more helpers; event-driven time away.
3. The two exchanges (E) with selling and standing orders; local independent partners; the local leaderboard and rival companies.
4. Territories and new yards; road and rail, then vessel and plane; hydro lines (leaching, solvent extraction, electrowinning); lithium-ion batteries handled safely; precious metals; tungsten and iridium.
5. Big partners with logos; the listing as the top of the ladder; joinable companies (local).
6. The real online service, switched on by the owner's keys.

### What can wait without breaking the owner's list

Visiting another company as a walkable yard (a read-only card meets "check out other people's progress"); company chat (not designed in, L5 d); transport detail beyond time, cost and capacity; more than 4 territories; season rewards beyond a badge; trading shares in other players' companies (also L4).

## Ten decisions for the lead

1. **Orientation:** optional `app.orientation` (default portrait), no run-time lock module, a "turn sideways" card. *Cost:* one shared edit; four reports go stale (accepted).
2. **Dialogs:** salvage overlays registered with `useOverlay`, never the kit `Sheet` (`Modal` default `['portrait']`: a rotation in Expo Go, a possible crash in the store build). *Cost:* about 300 lines in the mode; also check any shared `Modal` the mode can reach on a standalone build.
3. **Camera view:** a 3/4 scrolling landscape world, neither top-down (Orbit) nor cross-section (Pizza).
4. **Fingerprint vocabulary:** honest new values for dimensions 1 to 4, argued in the spec and `spam.md`, plus `prestige: none`. Without them the Pizza and Orbit pairs fail.
5. **Threads:** the UI thread owns walking and the camera; the 10 Hz rules own the world and take the sampled position as an action input.
6. **Input:** one thumb, one responder; the contextual ring after releasing the stick next to a thing.
7. **Time away and clock:** `paysOnCompute: true`, `catchUpSeconds: 0`, an event-driven `offline()`; and a monotonic market clock `max(now, clockHigh)` in the salvage rules (the shared `clampClock` does not provide one).
8. **Server:** Firebase JS SDK 13.1.0 as a direct dependency limited by `MODE_PACKAGES`, Firestore, callable functions, Blaze with a budget alert, the data model in D. *Cost:* package-lock changes; about $5-6 a month at 10k DAU (estimate).
9. **What is ranked:** a weekly calendar season of tonnes recovered, bounded by server time × the rules' maximum rate, beside a net-worth board; generated player names; company names filtered server-side; reports and blocking from the start.
10. **Store screenshots:** Apple's page now names "iPhone with Dynamic Island (medium display)" as the required iPhone size (2556 × 1179 or 2622 × 1206 in landscape), which the store tool does not produce for any game; decide whether to add it (for this game in landscape, and check the four portrait games) before the first upload. Recommended: add it, and confirm in App Store Connect.
