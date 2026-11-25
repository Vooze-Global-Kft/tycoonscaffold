# Scrapyard: what the codebase and a server need (research-tech)

Written 25 November 2026 for the fifth game (`scrap-yard`, mode `salvage`). No `docs/design/yard-design.md`
existed when this was written, so nothing here assumes its decisions. Every claim about the code
names a file and line; every claim about a service names its page and the date it was read (all
25 November 2026). "Inference" marks my own reasoning; "From memory" marks what I could not read.

## A. Landscape

### What assumes portrait today

| # | Where | What | How to add a per-game orientation without changing the four games |
|---|---|---|---|
| A1 | `app.config.ts:84` | `orientation: 'portrait'` for every game | `orientation: game.app.orientation ?? 'portrait'`, with an optional `orientation: z.enum(['portrait','landscape'])` in the app block of `src/config/schema.ts:167`. The four game.json files do not set it, so `npx expo config --json` prints the same for them. Check that by diffing `GAME=<id> npx expo config --type public --json` for the four games before and after. |
| A2 | `app.config.ts:13-25` | `android:appCategory="game"` keeps the orientation lock on large Android screens | Already per app, and it works for landscape too. Nothing to change. |
| A3 | `app.config.ts:89` | `supportsTablet: false` | Leave it. Expo's app config reference (docs.expo.dev/versions/v58.0.0/config/app/): `orientation` "Locks your app to a specific orientation with portrait or landscape. Defaults to no lock." |
| A4 | `app.config.ts:57` | splash: `imageWidth: 200, resizeMode: 'contain'` on the game's background colour | Does not depend on orientation. The crane loading screen is the mode's own `ModeEntry.Loading` (`src/modes/contract.ts:34-40`, used at `src/ui/App.tsx:113`), so `App.tsx` does not change. |
| A5 | `src/ui/kit/Sheet.tsx:71` | Every kit dialog is a React Native `Modal` with no `supportedOrientations` | **The main trap.** React Native's Modal documentation (reactnative.dev/docs/modal): `supportedOrientations` "allows the modal to be rotated to any of the specified orientations. On iOS, the modal is still restricted by what's specified in your app's Info.plist's UISupportedInterfaceOrientations field." The default is `['portrait']` and it applies on iOS only. *Inference:* in a landscape-only app, a kit `Sheet` opened on an iPhone asks for portrait. The web preview cannot show this. Changing `Sheet.tsx` changes all four bundles (it is level (a), `scripts/lib/modes.js` SHARED_UI). Recommended: the salvage mode draws its dialogs as its own absolute-positioned overlays that register with `useOverlay` (AGENTS.md allows "the kit `Sheet` (or registers with `useOverlay`)"). This keeps the one-dialog rule and changes no shared file. |
| A6 | `src/ui/kit/Sheet.tsx:57,73` | Card `maxHeight` is 86 % of the window height, the card stretches to full width (`styles.card alignSelf: 'stretch'`, line 100+) | In landscape that is 335 pt high and 800 pt wide. The salvage overlays should be side panels or centred cards with a maximum width. This is solved by A5's own overlays. |
| A7 | `src/ui/hints/HintOverlay.tsx:190` | The hand turns for a control "in the top right corner" when `rect.y + rect.height < 170` | 170 pt is nearly half of a 390 pt landscape screen. The salvage hint source can avoid it with `sceneKeys`/`fromAboveKeys` (`src/ui/hints/source.ts:30,32`). Targets in a scrolling world move with the camera, and the overlay asks only once a second (`HintOverlay.tsx:70`). So the mode should draw its own pointer inside the world canvas for world things and use the shared hand for HUD buttons only. |
| A8 | Safe areas: `src/ui/decree/layout.ts:89-90`, `src/ui/merge/MergeShell.tsx:27`, `src/ui/decree/DecreeShell.tsx:30` | The newer modes already pass `insets.left/right` into their layout | Landscape needs left and right insets (the Dynamic Island side) and a bottom inset (the home indicator). The salvage layout function must take all four, as `deskLayout` does. *From memory:* on Dynamic Island iPhones in landscape the insets are about 59 pt left and right, 21 pt at the bottom and 0 at the top, and the island swaps sides when the phone is turned. Never put the stick or a button under the inset. The web preview has no insets: copy `src/ui/merge/devInsets.web.ts` (a `?insets=` switch) into the salvage mode and add a left/right form. |
| A9 | Fixed design sizes: 390 × 844 and 375 × 667 tables in `src/ui/sim/layout.ts:92`, `src/ui/decree/layout.ts:10`, `src/ui/haul/layout.ts:101`, `src/ui/merge/layout.ts:142`, the mock sheets `scripts/art/*-sheets.ts` | Each belongs to its own mode | Nothing shared. The salvage tables are 844 × 390 (or 852 × 393) and 667 × 375 (SE in landscape, no insets). The shot tool already accepts `--w 844 --h 390` (BRIEF). |
| A10 | `scripts/store/types.ts:61-68` (`SIZES`: 1320 × 2868, 1284 × 2778, 1080 × 1920, all portrait), `scripts/store/shots.ts:421-424` (the side-by-side sheet's thumbnail height comes from `size.h/size.w`), `scripts/store/templates/frame.ts:31-45` (a vertical band `y0..y1`), `scripts/store/README.md:308-325` | The store tool is portrait | Node only, so no bundle changes. Add sizes for the game only: `ios-6.9-land` 2868 × 1320 (vw 956, vh 440, @3), `ios-6.5-land` 2778 × 1284 (926 × 428), `play-land` 1920 × 1080 (640 × 360). Give `GameScenes` an `orientation` and let the sheet take a landscape row. The four portrait sets stay byte for byte. |
| A11 | `src/dev/devtools.web.ts` | Has no size switch: the preview is the browser's viewport | Nothing to change. Run shots at `--w 844 --h 390` and `--w 667 --h 375`. |

**Store rules for landscape screenshots (read 25 November 2026):**
- Apple, "Screenshot specifications" (developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications). For the 6.9" class it lists "2868 x 1320 pixels (landscape)" next to the portrait sizes, and "2796 x 1290" and "2736 x 1260 pixels (landscape)". For the 6.5" class it lists "2778 x 1284 pixels (landscape)" and "2688 x 1242 pixels (landscape)". The 6.5" class is "Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided". The page says nothing about mixing orientations.
- Google Play (support.google.com/googleplay/android-developer/answer/9866151): "Include 9:16 portrait screenshots, 16:9 landscape screenshots, or both", and "For games you must provide at least three 16:9 landscape screenshots (minimum 1920x1080px) or three 9:16 portrait screenshots (minimum 1080x1920px)" to be eligible for formats that use screenshots. Each side must be 320 to 3,840 px.
- *Inference:* landscape images also help dimension 7 (template) against the four portrait sets.

**Byte identity.** The bundle report's `sourceHash` covers `app.config.ts`, `package-lock.json` and every bundled file (`scripts/check-bundle.ts:505-522`). Any edit to `app.config.ts` or `schema.ts` therefore makes the four `bundle-report.json` files stale, and dimension 8 reads "pending" until `npm run check:bundle -- --export` runs again. That is the accepted consequence recorded in `docs/design/office-build-plan.md` (the "Known consequence" paragraph near its end) and in BRIEF. The checks that must stay identical are the expo config output (A1), the bundle contents (`check:bundle --export`: no salvage file in the four games' bundles), `src/engine/modeRegression.test.ts`, and the fingerprint fixtures `scripts/lib/fingerprint.pairs.fixture.json` and `fingerprint.pizzaOrbit.fixture.json`.

### Does Expo Go honour a landscape orientation on an iPhone?

Yes, going by its source. Expo Go's `apps/expo-go/ios/Exponent/Kernel/Views/EXAppViewController.mm` (main branch, read through raw.githubusercontent.com on 25 November 2026) reads `NSString *orientationConfig = _appRecord.appLoader.manifest.orientation;` and maps `"landscape"` to `UIInterfaceOrientationMaskLandscape` in `orientationMaskFromManifestOrDefault`. `supportedInterfaceOrientations` returns that mask unless `ScreenOrientationRegistry.shared requiredOrientationMask` (the expo-screen-orientation module) or react-native-screens asks otherwise. Forum posts from SDK 44 report iOS ignoring `orientation` (forums.expo.dev, "expo.orientation completed ignored on SDK 44 Managed ios only"; an individual report, years old).

Run-time lock. `expo-screen-orientation` is "Included in Expo Go" (docs.expo.dev/versions/v58.0.0/sdk/screen-orientation/), but it is **not** in `package.json`. It is a native module, so a standalone build would need it added (a new native dependency, against BRIEF), and that page warns: "On iOS 27 and later: `lockAsync` may have no effect. The system can refuse the request, and your app stays resizable." Recommended: no run-time lock module. Rely on the manifest (A1). If the window is still taller than it is wide (an old Expo Go, an iPad, a resizable window), the salvage shell draws a "turn your phone sideways" card from `useWindowDimensions()` and pauses input. That costs nothing and needs no module. Check it on the owner's phone in the first slice, the first time `GAME=scrap-yard npm run go` runs.

## B. A steered worker

### What the project already does

Each mode draws with one full-bleed Skia canvas, pictures and atlases:
- `src/ui/haul/scene/Field.tsx:1-14` and `:50-65` bake the atlas once per pixel density, queued off the call stack behind the loading screen (`queueAtlas`).
- `src/ui/haul/scene/frameLoop.ts:1-20` runs ONE `useFrameCallback`. It reads a frame table the JS thread pushes at each tick (`model.ts buildFrame`) and interpolates between ticks. It writes RSXform, rect and colour buffers made once and changed in place. It runs at vsync only while something moves fast, 30 a second otherwise (`SLOW_MS = 30`, line 36), and stops under a full-screen spoke.
- Input: the React Native responder (`src/ui/haul/gestures/useFieldGestures.ts`). The finger is written into a Reanimated value once per responder move from the JS thread (`src/ui/haul/gestures/fieldInput.ts:1-10`, `dragLine` at :56). The UI thread reads it.

AGENTS.md (the phone rules) adds: worklets call only worklets (`npm run lint:worklets`), nothing invisible animates, never free a picture a canvas may draw, and select few store values (the `game` object changes 10 times a second: `src/ui/App.tsx:19`).

### How to build it with what is installed

1. **Virtual stick.** Use one full-screen responder view over the world canvas (`onStartShouldSetResponder`, `onResponderMove`, `onResponderRelease`). The stick is "floating": it appears where the thumb lands in the movement zone. Write `{dx, dy, held}` into a `makeMutable` value, as `dragLine` does. React Native has one responder at a time: while the stick view holds it, a second finger's touches go to the same view (`nativeEvent.touches`), not to a `Pressable`. So a stick plus a separate "hold to cut" button is not possible with Pressables. Either one view reads every touch by `identifier` and zone, or the scheme uses one thumb only. *Recommendation (fits "one thumb"):* release the stick next to a wreck and the contextual action ring appears under the thumb; hold it to cut. Moving the thumb again walks away and cancels.
2. **Movement and camera run on the UI thread.** A frame callback integrates the worker's (or truck's) position from the stick value: velocity, then position, then collision, then a camera lerp. It writes `pos` and `cam` shared values that the canvas transforms read. This is the haul pattern. The JS thread would stutter: it also runs the 10 Hz tick, zustand updates, saving and GC, and a React state update per frame is forbidden.
3. **The rules own the world. The UI thread owns the walk.** The rules (`src/engine/salvage/`, pure, 10 ticks a second like every mode) hold everything that earns: inventory, cut progress, loads, machines, queues, shipments, helpers' jobs. The player's position is an *input*, like a tap. Once per tick the JS side samples `pos.value` and passes it to actions (`startCut(wreckId, pos)`), and the rules check the distance themselves. Helpers are rules state: a path id plus progress along it, advanced in the tick. The UI interpolates them between ticks from the frame table, as `frameLoop.ts` does with the run clock. The rules stay deterministic and testable without a screen, and a bot can play them.
4. **Collision.** The yard's static layout becomes a tile grid (for example 0.5 m cells) in a `Uint8Array`, copied into a shared value once per yard layout. The worker is a circle tested against the grid one axis at a time, so it slides along walls. Movable things (wrecks, piles, machines, at most about 100) are circles or boxes in a small array, also pushed only when the layout changes. "Near a thing": each frame the UI thread finds the nearest interactable within radius *r* for the highlight (O(n), n ≤ 100). The rules repeat the check when the action arrives. *Inference:* well under 0.2 ms a frame.
5. **The world.** A yard several screens wide (say 3 × 2 screens) is drawn as ground tiles baked into images once per yard (Skia picture to image in 512 pt chunks, only the visible chunks drawn). Static props go in one picture per chunk. Moving and changing things go in at most three `Atlas` draws per frame (under props, actors, over: sparks, magnet, crane hook). This is the haul split of `ATLAS_A`/`ATLAS_B` (`frameLoop.ts:4-6`).
6. **How many moving things at 60 fps.** No device measurement exists in the repository (the haul plan only asks for "frame time in the preview with 36 drones", `docs/design/space-build-plan.md:129`). *Inference:* one `Atlas` call costs little on the GPU. The limit is the worklet loop that fills the buffers, a few microseconds per sprite. A safe budget is ≤ 40 actors (worker, truck, up to 12 helpers, forklifts, crane, magnet, partners' trucks) and ≤ 300 atlas sprites a frame including particles. Pace it like haul: 60 fps while the stick is held or the camera moves, 30 otherwise. Stage 1 should ship a `?yardStress=1` switch like `fieldStress` (`Field.tsx:79`), and the frame time should be read on the owner's iPhone before the business layers are built.
7. **What to bake into atlases.** The worker's walk and cut frames (4 directions with mirroring, about 6 frames each), the truck with and without a load in 8 or 16 headings (a 3/4 view cannot just rotate), wreck types in 3 or 4 cut stages, a pile sprite for each metal, helpers, forklift, crane hook and magnet, sparks and smoke puffs, and the highlight ring. Bake them at the device density while the crane loading screen runs (haul's `queueAtlas`). *From memory:* keep a page ≤ 4096 px, so ≤ 1365 pt at @3x; use two pages if needed.
8. **Keep apart:** the rules state (10 Hz, saved, offline-capable), the frame table (pushed per tick, plain numbers), and the presentation (shared values, interpolated, never saved). The camera and the walk are never saved. The save holds only the worker's last tile.

### The three most likely ways this goes wrong on an iPhone

1. **Dialogs turn the screen to portrait.** The kit `Sheet` is an RN `Modal` with default `supportedOrientations` `['portrait']` (A5). The web preview never shows it. Avoid it with the mode's own overlays, and test every dialog on the phone in stage 1.
2. **A second finger or an edge swipe breaks steering.** There is one responder (B1). A `Pressable` under the other thumb never fires while the stick is held. A thumb near the bottom or left edge in landscape meets the home indicator and the island inset, and Expo cannot defer iOS edge gestures without native code (*from memory*). Keep the stick zone ≥ 24 pt inside the safe area.
3. **The frame callback crashes or stalls only on the phone.** Calling a non-worklet (a helper imported from a rules file, a closure over a zustand selector) from the frame callback works in the web preview and crashes on the phone (AGENTS.md). Allocating arrays or objects per sprite per frame, or copying a large shared value every tick (the whole collision grid), causes GC hitches. Mitigations: `npm run lint:worklets`, buffers made once (`frameLoop.ts:2-6`), and the grid pushed only on layout change.

## C. A new mode

### Checklist for mode `salvage` and game `scrap-yard`

From `docs/design/space-bundle.md` ("Adding a mode", steps 1-6) and the shared files the fourth mode touched (`docs/design/office-build-plan.md`, "Shared files the skeleton changed"):

1. Add `'salvage'` to `MODES` (`scripts/lib/games.js:22`), `ModeId` (`src/modes/contract.ts:25`), `FxMode` (`src/services/fx/catalog.ts:30`), and the mode enum (`src/config/schema.ts:157`). Add an opaque `salvage` block to the shared schema, and `orientation` to the app block (A1).
2. Create `src/modes/salvage/index.tsx` (a default `ModeEntry`: `Shell`, `Loading` for the crane, `parts`, `hints`, `engine`, `presets`, `soundKeys`, `devViews`). Add `presets.web.ts`/`presets.ts` and `devViews.web.ts`/`devViews.ts`, and `actions.ts` (every state change).
3. In `scripts/lib/modes.js` add `MODE_FOLDERS.salvage` (`src/modes/salvage`, `src/ui/salvage`, `src/engine/salvage`, `src/engine/salvage.ts`, `src/engine/salvageMode.ts`, `src/engine/fixtures/salvage.ts`, `src/config/schema.salvage.ts`, `src/config/salvage.content.ts`). Add `NODE_ONLY` and `catalog.salvage.ts`. Add `WEB_ONLY`: bot, fixtures, `*.web.ts`. Add `WEB_ONLY_STRINGS` and `salvageFixtures`. Add `THEME_WORDS.salvage` (line 119; e.g. scrapyard, shredder, baler, smelter, ingot, forklift; checked with `--words` first). Add `MODE_PACKAGES: { firebase: ['salvage'] }` if D is adopted, so no other game can bundle the SDK.
4. Add `src/services/fx/catalog.salvage.ts` and its branch in `scripts/lib/fxCatalog.js`. Add the keys to `FxName` (`src/services/fx/index.ts`). Add `src/modes/salvage/soundKeys.ts`. Use the game's own sounds (`"soundPack": null`, as Orbit Haulers does).
5. Add a salvage branch to `src/config/lint.ts`, `scripts/validate.ts` (a `salvageChecks` hook, as `decreeChecks`) and `scripts/sync.ts` (rating notes). Add the salvage entry's pieces to `src/modes/entries.test.ts`. Add the dimension rows to `scripts/lib/fingerprint.ts` if a vocabulary value is added (below), with the row in `docs/design/research/spam.md`.
6. Add `games/scrap-yard/game.json`, `store/fingerprint.json`, a store scene file `scripts/store/scenes/scrap-yard.ts` and a template of its own.
7. Gates: `npm run check:bundle -- --game scrap-yard --as-mode salvage`, then `npm run check:bundle` and `-- --export`. `modeRegression.test.ts` stays green, and `src/state/store.seams.test.ts` too.

**Name clashes to know.** Orbit Haulers already has a "Salvage" bay that *cuts* pods with a laser (`src/ui/haul/salvage/PodCutter.tsx:1-10`, `SalvageBay.tsx`) and sells "iron", "copper", "platinum", "scrap" (`games/space-miner/game.json`). It also names "Halden Yards" and "Brightwater Foundry. The furnace wants {ore}". The bundle denylist ignores single lowercase words and anything the new game's own data also says (`docs/design/space-bundle.md`, "String denylist"). But "Scrap Pod", "Halden Yards", "Brightwater Foundry" must never appear in the new game. The mode id `salvage` is invisible to players. *Inference:* "Salvage" in the store title or as a button name raises dimensions 6 and 17 against Orbit Haulers.

### Time away

`src/engine/mode.ts:111-123` has two seams:
- `paysOnCompute`: earnings are granted in the same update that computes them, at boot (`src/state/store.ts:431-435`) and resume (`:492-494`).
- `catchUpSeconds`: the store's 300 s catch-up tick (`:192`, `:493`, `:504-507`) is skipped when `offline()` returns an advanced `game` (`advanced`, `:488-489`), as haul's does.

A clock moved back is remembered by `clampClock` (`src/engine/economy.ts:375`), and a single tick never simulates more than 5 s (`MAX_TICK_SECONDS`, `store.ts:190`).

What a long-running business needs from them:
- **`paysOnCompute: true`** (BRIEF lesson 5).
- **`offline()` returns the advanced world.** Do not tick 10 Hz over hours. Write machines, queues and shipments as *scheduled* state: each batch and each shipment carries an absolute `doneAt`/`arrivesAt` from the rules' `now`. Then time away is a discrete-event pass: take the next event in time order, apply it, repeat, up to `min(now, cap)`. This runs in O(events), the same code serves the live tick, and a shipment in transit simply arrives. Helpers' trips are events too (an average trip time per job), not walked paths.
- **`catchUpSeconds: 0`.** Every absence then goes through the same event pass. That pass also fills `report` for the away screen, and `mergeReport` joins two absences.
- **Cap the absence** in the content: a number of hours, extended by helpers or a product, as the other modes do.
- **Exchange trades** are made only at the "now" the rules are given. Nothing settles during the absence unless the player placed a standing order, which the event pass fills at the path's price at that event's time (E).

### The fingerprint: where the game risks measuring too close

Each pair must differ on all 8 musts and on ≥ 15 of 19 (`scripts/lib/fingerprint.ts:1-4`). Musts 1 to 4 compare declared values (`:219-229`) from closed vocabularies (`:61-76`). The four games' declarations (`games/*/store/fingerprint.json`):

| Dim | Pizza Empire | Orbit Haulers | Lantern Row | Proudly Adequate | Scrapyard risk |
|---|---|---|---|---|---|
| 1 core_verb [M] | tap-target | drag/route | place/arrange | swipe/aim | A stick is a drag: declaring it `drag/route` equals Orbit. `hold` is free (hold to cut). An honest new value `steer` can be added, as `office-ladder` was. |
| 2 topology [M] | linear-chain-with-transport | network-routes | spatial-grid | parallel-generators | **Highest risk.** Gather, haul, process, sell is Pizza's chain. Plane, vessel, road and rail between territories is Orbit's network. Free values: `vertical-shaft`, `single-node`. The yard where the player walks to things is the distinct part, and it needs a new value (e.g. `free-roam-yard`) argued in the spec. |
| 3 money_moment [M] | customer-pays | sale-at-depot | contract-complete | auto-tick | Selling at the scale house equals Orbit's `sale-at-depot`, and partner contracts equal Lantern Row's. Free: `tap-collect`. Selling into a simulated exchange is honestly new (`exchange-sale`). |
| 4 layout [M] | side-cross-section | top-down-map | grid-board | single-object-focus | A top-down yard equals Orbit, a side view equals Pizza. Free: `isometric-room`, `card-list`. A 3/4 (oblique or isometric) scrolling landscape world is distinct and needs its own value. |
| 9 progression | location-levels | sector-map | seasons | office-ladder | "Buy yards in territories" reads as Pizza's `location-levels`. |
| 10 prestige | reset-for-currency | reset-for-currency | seasonal | new-location-carryover | A reset equals Pizza and Orbit. `none` is free: the listing can be the top of the ladder, not a reset. |
| 12 meta | … chests, missions, prestige | contracts, chests, prestige-tree … | contracts, chests … | prestige … | Avoid the ids `contracts` and `chests`. Partners, exchanges, territories, listing and companies are unique, so the dimension differs. |
| 15 character | humans | robots | animals | humans | A human worker is the **same** as Pizza and Proudly Adequate. |
| 17 strings | | | | | Orbit's interface words (Salvage, ore, sell, copper, contracts) count in the shared share. Measure `src/ui/salvage/strings.ts` early with `npx tsx scripts/validate.ts scrap-yard`. |
| 6, 18 | | | | | Orbit's store description already says "copper, ice, titanium and platinum", "cargo", "contracts", "salvage pods". Write the scrapyard listing fresh and measure it. |

*Inference:* against **Pizza Empire**, if 2, 9, 10 and 15 are all "same", the pair fails (2 is a must). Against **Orbit Haulers**, musts 1 to 4 are all at risk. The spec has to choose 1 to 4 deliberately and argue the new vocabulary values honestly. Dimension 7 is helped by landscape. Dimension 19 needs ≥ 14 days after Proudly Adequate's submission.

## D. A server for three features

### Assumptions (Inference)

A daily player opens the game 3 times a day. Per day that means:
- 4 writes of their public summary (on leaving, on a milestone)
- 2 views of the leaderboard
- 3 visits to another company (summary only)
- 1 look at their own company (its document and up to 30 member summaries)
- company changes (create, join, leave) about 0.05 a day

MAU ≈ 3 × DAU.

### What is already installed

`node_modules/firebase` 13.1.0 (the Firebase **JS** SDK) is in the tree as a dependency of `@react-native-firebase/app` (`package-lock.json:5872-5875`). It ships React Native builds: `@firebase/auth` 1.13.8 has a `"react-native": "dist/rn/index.js"` entry and an optional peer dependency `@react-native-async-storage/async-storage` "^2.2.0 || ^3.0.0" (installed: 2.2.0). `@firebase/firestore` 4.19.0 has `dist/index.rn.js` and a lite build.

It is not a direct dependency. Using it means adding `"firebase": "13.1.0"` to `package.json`, which asks the lead (BRIEF) and changes `package-lock.json` (stale reports, A).

The installed `@react-native-firebase/*` packages are native and are loaded only through `src/services/sdks.ts:1-18`, returning null in Expo Go. Expo's guide (docs.expo.dev/guides/using-firebase/): React Native Firebase "requires custom native code and cannot be used with Expo Go". The JS SDK "supports services such as Authentication, Firestore, Realtime Database, and Storage in a React Native app".

### The three choices

| | Firebase (JS SDK: anonymous Auth, Firestore, Cloud Functions) | Supabase (supabase-js: Postgres, RLS, Edge Functions) | PlayFab (Microsoft; HTTPS Client API) |
|---|---|---|---|
| Runs in Expo Go | Yes (guide above). Already in `node_modules`. | Yes, pure JS (from memory). **Not installed**: a new package. | REST over HTTPS works from `fetch` (from memory). No SDK installed. |
| Free allowance | Firestore: "Document reads: 50,000 per day", "writes: 20,000 per day", "deletes: 20,000 per day", "Stored data: 1 GiB" (firebase.google.com/docs/firestore/pricing). Functions on Blaze only: "No-cost up to 2M/month" invocations, then "$0.40/million"; 400K GB-s and 200K CPU-s a month (firebase.google.com/pricing). Auth: "50K MAUs" on the Identity Platform tier (same page). | Free: 50,000 MAU, 500 MB database, 5 GB egress, 500,000 Edge Function invocations; "Free projects are paused after 1 week of inactivity." (supabase.com/pricing) | Development mode: "A title in development mode can only have up to 1,000 lifetime player account creations." (developer.microsoft.com/en-us/games/products/playfab/pricing/) |
| Unit prices | us-central1: "$0.03 per 100k reads", "$0.09 per 100k writes", "$0.01 per 100k deletes" (firebase.google.com/docs/firestore/standard-edition) | Pro "From $25" a month: 100,000 MAU then "$0.00325 per MAU", 8 GB then $0.125/GB, 2M invocations then $2/million | Pay-as-you-go: profile writes $7.15/M, reads $0.33/M; leaderboard writes $0.5/M, reads $0.10/M; CloudScript $0.22/M executions (same page). Standard plan $99/month. |
| 1,000 DAU | ≈ 40k reads and 8k writes a day with the board as one document (below): **$0** on Blaze | Free plan (3k MAU): $0, with the risk of pausing and no support. Pro: $25. | Over the 1,000-account cap: pay-as-you-go ≈ 120k profile writes a month, about **$1** |
| 10,000 DAU | ≈ 400k reads and 80k writes a day, so about $3.2 + $1.6 a month, functions about $0.2: **≈ $5/month** | 30k MAU: Pro **$25** | ≈ 1.2M writes a month ($9) + reads + statistics: **≈ $15** |
| 100,000 DAU | ≈ 4M reads and 0.8M writes a day: about $36 + $21; about 24M invocations: $9 + compute about $2: **≈ $70/month** | 300k MAU: $25 + 200k × $0.00325 = $650, plus more compute: **≈ $700/month** | ≈ 12M profile writes $86 + statistics and leaderboards $20 + CloudScript $5: **≈ $110** |
| Cap of 30 members | A transaction (in a callable function, or a client batch checked by rules with `getAfter`): the company's `memberCount` goes up by exactly 1 and stays ≤ 30, the member doc is created, and the player's `companyId` was empty. Firestore serialises writes to one document, so two joiners cannot both take seat 30. | A `join_company()` Postgres function: `SELECT … FOR UPDATE` on the company row, count members, insert. Or a trigger. RLS denies direct inserts. | Groups API. The limit check is in CloudScript: read, check, add. Not atomic against a parallel join (Inference); needs a retry check after. |
| Score checked on the server | A callable `submitProgress(snapshot)` runs the **same pure rules** (`src/engine/salvage/*` is plain TypeScript and can be imported in Node). It checks that the claimed assets cost ≤ claimed lifetime earnings, and that the ranked number grew no faster than the rules' maximum rate × the server time since the last accepted snapshot (`request.time`, the server clock). Then the function writes the rank fields. Clients can never write them (rules). | The same check in an Edge Function (TypeScript, Deno), or as SQL in the RPC | CloudScript (Azure Functions) does the same. Statistics can be server-write-only. |
| Reads of others limited | Rules: `publicCompanies/{id}` and `players/{uid}/public` are readable by any signed-in user, with list queries capped (`request.query.limit <= 50`). `players/{uid}/private` is readable by the owner only. The save is never uploaded. | RLS policies per table; a view with only public columns | Title data, player data permissions (public or private) |
| Account deletion | Callable `deleteMe`: leave the company (hand over or close it), delete the docs, `admin.auth().deleteUser`. A TTL policy removes public docs of anonymous players gone for 90+ days (from memory). | RPC plus the admin API from an Edge Function | `DeleteMasterPlayerAccount` server API (from memory) |
| Keys | "API keys for Firebase services are OK to include in code or checked-in config files" (firebase.google.com/docs/projects/api-keys), so the web config goes in game.json. **Never** in the app or the repository: a service-account JSON or the admin SDK credentials. Functions use their own runtime identity. | The publishable/anon key is "Safe to expose online: web page, mobile or desktop app…". The secret/service_role key: "Never put one in a browser, a shipped application, or source control." (supabase.com/docs/guides/api/api-keys) | The title id is public. The title secret key goes only in CloudScript or a server, never in the app (from memory). |
| What the owner creates | A Firebase project for the game (`src/services/firebase.ts:4-5` already assumes one project per game); a Web app (to get the config); Anonymous sign-in on; Firestore; the Blaze plan with a budget alert; deploy rules and functions with `firebase deploy` from a `server/` folder outside `src/` | A project, anonymous sign-ins on, CAPTCHA (the docs: "strongly recommended to enable invisible CAPTCHA or Cloudflare Turnstile"; the rate limit is "30 requests per hour" per IP; supabase.com/docs/guides/auth/auth-anonymous), migrations | A title, the API policy, CloudScript, a paid plan as soon as testing passes 1,000 accounts |

**Limit common to all three (Inference).** Expo Go has no device attestation from plain JS: App Check for the JS SDK uses web providers, and the React Native App Check is native. Anyone who copies the config can therefore act as *some* anonymous player. The rules and the functions must assume a hostile client: they rank only what the server checked, cap the rate of writes per uid, and keep every name text filtered server-side (L5 d). The deny-list check runs in the function, reports go to `reports/{id}`, and blocking is local.

### Recommendation: Firebase (JS SDK), Firestore and callable functions

It is already in the tree, works in Expo Go, has the lowest cost at every size above, and gives atomic joins. Its rules are enough for the read limits. The salvage mode holds both implementations of one interface (`OnlineService`: `board(season)`, `visit(id)`, `myCompany()`, `create(name, logo)`, `join(id)`, `leave()`, `submit(snapshot)`, `report(id)`, `deleteMe()`). The local one is the default. The real one is chosen only when `salvage.online.firebase` (the web config) is present in game.json.

**Data model (one page).**
- `players/{uid}` (owner-only read and write, except the rank fields): `{companyId|null, joinedAt, lastSubmitAt, acceptedNetWorth, acceptedTonnes, season}`.
- `publicPlayers/{uid}`: written by the function only. `{name: generated "Yard 4821" (no free text for people), level, yards, tonnesSeason, netWorth, companyId, updatedAt}`. Readable by signed-in users, `limit <= 50`.
- `companies/{cid}`: function only. `{name (filtered), logo: {shape, colours, glyph} (picked from parts, no upload), ownerUid, memberCount ≤ 30, open: bool, tonnesSeason, createdAt}`.
- `companies/{cid}/members/{uid}`: function only. `{role: owner|member, joinedAt, tonnesSeason}`.
- `boards/{season}-{kind}`: one document per board (top 100 players and top 100 companies). A scheduled function rewrites it every 10 minutes, so a board view costs **one read**.
- `reports/{rid}`: create-only by signed-in users, read by nobody in the app.
- Functions: `submitProgress` (the rate-bounded check of the rules, with server time), `createCompany`, `joinCompany`, `leaveCompany` (transactions; the 30 cap), `deleteMe`, `rebuildBoards` (every 10 min), `onReport` (a threshold hides a name until the owner looks).
- Rules: deny all by default; `players/{uid}` is the owner's own; everything ranked or public is written by functions; list limits; `reports` create-only with size limits.

## E. One world without a server

**Prices from the calendar.** Every metal on each of the two invented exchanges gets a log-price that mean-reverts with jumps. This is the one-factor mean-reverting model of Schwartz (1997), "The Stochastic Behavior of Commodity Prices: Implications for Valuation and Hedging", *Journal of Finance* 52(3), 923-973 (econpapers.repec.org/RePEc:bla:jfinan:v:52:y:1997:i:3:p:923-73; I read the record only, the full text was not available; my reading of Model 1 as mean reversion in log spot is from memory, and secondary sources say the later models revert in the convenience yield). Jumps follow Merton's jump diffusion (Merton 1976; from memory).

The exact discrete step of an Ornstein-Uhlenbeck process, on a grid aligned to the epoch (Δ = 5 min):

x(n+1) = μ + (x(n) − μ)·e^(−κΔ) + σ·√((1 − e^(−2κΔ))/(2κ))·ε(n) + J(n)

where:
- ε(n) and J(n) come from a counter-based hash of `(worldSeed, exchange, metal, n)`, never a sequential generator, so any step can be computed on its own;
- J is non-zero with a small probability per step and then decays through the reversion itself.

The value at time *t* is computed by iterating from the anchor `floor(t/W)·W − W` (W = 7 days), starting at μ. With a half-life of about 1 day, e^(−κW) is below 1 %. So the start is forgotten, every phone agrees, and the only seam is a jump of under 1 % of the deviation once a week. The cost is about 4,000 steps per metal per week (*Inference*: under 1 ms for 12 metals). Cache the last value and step forward.

To make two exchanges look like two markets: a common factor per metal shared by both, plus an exchange factor of its own. The spread between them mean-reverts fast (arbitrage). Each exchange opens at its own invented hours (UTC hours, shown with an invented city). Seasonal drift for some metals is a slow sine term in μ.

**Seasons.** The same idea gives seasons: season number = `floor((t − epoch)/7 days)`, the same on every phone.

**A changed clock.**
- *Cannot be prevented without a server:* reading ahead. The algorithm is in the app, so a player who moves the clock forward sees future prices, and a decompiled bundle shows the formula.
- *Can be prevented:* profiting from it inside one install. `clampClock` (`src/engine/economy.ts:375`) remembers the latest time seen. After a peek forward, the game's "now" stays at the peeked time until the real clock passes it, so the player cannot trade back in the past. Trades happen only at the rules' "now". The interface shows no future chart. A reinstall loses the max-time memory (AsyncStorage) but also the save.

To keep the stake small: price swings of ±20-30 % around μ, a spread between buy and sell, and daily volume limits per partner.

With the server, `submitProgress` compares against server time, and the boards rank only what passed.

**Local stand-in for other players.** Invented companies (about 200 names and logos from generated parts, all clearly invented, L2), each with a seed and a temperament. Each one's season score is a pure function of `(seed, season, t)`: logistic growth with a noise term from the same hash. Every phone shows the same rival board at the same moment, and the player is ranked among them.
- "Visit" opens a read-only summary card generated from the seed (yards, plants, metals, logo).
- "Companies" lists invented open companies with simulated members. The player can create one, or join one (≤ 30, the same rule code as the server).
- *Inference, and a store-honesty point (lesson 6):* in local mode these are labelled as simulated ("Rival yards (simulated)") and never presented as real people. The real service replaces them by switching the `OnlineService` implementation.

## F. The size of the thing

### Fourth game, counted on 25 November 2026 (lines; tests separate)

| Part | Code | Tests |
|---|---|---|
| Rules: `src/engine/decree`, `decree.ts`, `decreeMode.ts`, `schema.decree.ts` | 9,197 | 4,474 |
| Screens and art: `src/ui/decree` (8,217 of it under `art/`) | 17,315 | 1,890 |
| Mode entry: `src/modes/decree` | 415 | 41 |
| Content tooling: `scripts/content/office/*.ts` | 2,832 | |
| Build script: `build-office.py` | 1,012 | |
| Bot script: `decree-bot.ts` | 368 | |
| **Total** | **≈ 37,500** | |

The game's data `games/high-office/game.json` is 513 KB. It was built over 23 and 24 November (`git log`). For comparison: haul UI is 17,068 lines and merge rules are 6,884.

### Estimate for the scrapyard (Inference)

| Part | Lines |
|---|---|
| The hand (stick, walk, truck, camera, collision, cut, carry, helpers on screen) | 8-10k UI + 2k rules |
| Business rules (about 12 metals and alloys, sorting, shredder and baler, pyro and hydro lines and ingots, partners, transport by 4 means, territories, two exchanges, the listing, the event-driven time away) | 10-14k + 6k tests |
| Screens (HUD, yard shop, plant builder, exchange charts, partners, logistics map, territories, listing, board, visit, companies) | 12-15k |
| Art kit (world, vehicles, machines, metals, logos) | 10-12k |
| Online (interface, local simulation, Firebase implementation, server rules and functions) | about 5k with tests |
| Bot and build script | about 4k |
| **Total** | **55-70k, about 1.5-2× the fourth game** |

### Order in which each stage leaves a playable game

1. **Stage 1, first yard:** the landscape shell, the crane loading screen, one yard, stick, worker, cut, carry, truck to the scale, 4 metals (steel, cast iron, copper, aluminium), buying a better cutter and truck, and the first helper with earnings while away. Fixed price list. Local save. This goes to the owner's phone and gets its frame-time check.
2. **Stage 2:** sorting, shredder and baler, the first furnace (pyro), ingots, brass and bronze; more helpers; the event-driven time away.
3. **Stage 3:** the two exchanges (E) with selling into them and standing orders; local independent partners; the local leaderboard and rival companies (E).
4. **Stage 4:** territories and new yards; transport by road and rail, then vessel and plane; hydro lines (leaching, solvent extraction, electrowinning); lithium-ion batteries handled safely; precious metals; tungsten and iridium.
5. **Stage 5:** big partners with logos; the listing on the exchange as the top of the ladder; joinable companies (local).
6. **Stage 6:** the real online service, switched on by the owner's keys.

### What can wait for a later version without breaking the owner's list

- Visiting another company as a walkable yard (a read-only summary card meets "check out other people's progress")
- Company chat (not designed in; L5 d)
- Transport details per vehicle type beyond time, cost and capacity
- More than 4 territories
- Season rewards beyond a badge
- Trading shares in other players' listed companies (also L4)

## Ten decisions for the lead

1. **Orientation:** an optional `app.orientation` in the schema and app config (default portrait), no run-time lock module, and a "turn sideways" fallback card. *Cost:* one shared edit, so the four reports go stale (accepted).
2. **Dialogs:** salvage overlays of its own registered with `useOverlay`, not the kit `Sheet` (the `Modal` portrait default). *Cost:* about 300 lines in the mode. Avoids touching the four bundles.
3. **Camera view:** a 3/4 (oblique) scrolling landscape world, neither top-down (Orbit) nor a cross-section (Pizza).
4. **Fingerprint vocabulary:** honest new values for dimensions 1 to 4 (e.g. `steer`, a free-roam topology, `exchange-sale`, a scrolling-world layout), argued in the spec and in `spam.md`, plus `prestige: none` (the listing is not a reset). *Cost:* without them the Pizza and Orbit pairs fail.
5. **Threads:** the UI thread owns walking and the camera; the rules own the world at 10 Hz and take the sampled position as an action input.
6. **Input:** one thumb, one responder: the stick, then hold the contextual ring after releasing next to a thing. No second simultaneous button.
7. **Time away:** `paysOnCompute: true`, `catchUpSeconds: 0`, and an `offline()` that runs the scheduled events (absolute `doneAt`/`arrivesAt`).
8. **Server:** Firebase JS SDK 13.1.0 (add as a direct dependency; ask now), Firestore, callable functions, Blaze with a budget alert, and the data model in D. *Cost:* the owner creates the project; about $5/month at 10k DAU.
9. **What is ranked:** a season board (weekly, from the calendar) of tonnes recovered in the season, bounded by server time × the rules' maximum rate, beside a net-worth board. No free-text names for people; company names filtered server-side; reports and blocking from the start.
10. **One world:** a calendar-seeded price path (mean reversion and jumps, two exchanges sharing a factor), and simulated rival companies clearly labelled in local mode. Stage 1 is the first yard with fixed prices on the owner's phone before any business layer.
