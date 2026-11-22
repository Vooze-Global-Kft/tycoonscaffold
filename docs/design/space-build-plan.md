# Orbit Haulers: build plan (work packages)

Status: written by the tech lead with the skeleton, 22 November 2026. The specification is
`docs/design/space-design.md` (its section 11, Decisions, settles every open question and erratum).
How a game's bundle is decided: `docs/design/space-bundle.md`. Project rules: `AGENTS.md`.

The skeleton leaves the app running in the haul mode from the first minute: every screen and piece
named in the specification exists at its final path, with its final exported name and props, as a
labelled box (`src/ui/haul/Placeholder.tsx`) that shows one live value. Replace a box, keep the path,
the name and the props; if a contract below must change, say so to the lead first.

## How to work

- One package per engineer. **Edit only the files your package owns** (the lists below are
  disjoint). A shared file you need changed: ask its owner. Pizza Empire's files (everything sim,
  classic or `tabs` family) are owned by nobody here: do not edit them.
- Never branch on a game id; the engine stays pure (`src/engine/`); state changes only through
  actions (`haulActions`, `src/modes/haul/actions.ts`); sound and haptics only through `fx.play`
  with keys of `src/services/fx/catalog.haul.ts`; dialogs register with the overlay manager; worklets
  call only worklets (`npm run lint:worklets`); no new dependencies.
- The haul mode never imports the `tabs` family (`src/ui/shell`, `src/ui/home`, `src/ui/meta`,
  `src/ui/play`, the header group, `src/ui/art/{draw,kit,raster,clock,types,props}`) or another
  mode's folders. A new file under `src/ui` outside `src/ui/haul` must be listed in
  `scripts/lib/modes.js` (ask the tooling package).
- Keep this checkout on space-miner (`GAME=space-miner node scripts/select-game.js`; plain
  `node scripts/select-game.js` selects Pizza Empire!).
- Before you hand in: `npx tsc --noEmit`, `npx vitest run`, `npx tsx scripts/validate.ts --no-sim`,
  `npx tsx scripts/lint-worklets.ts`, `npm run check:bundle`, and look at your screens in the
  preview: `bash <scratchpad>/ui/serve-s2.sh` (port 8303), then
  `node <scratchpad>/ui/shot.js "preset=mid&spoke=fitting" out.png --port 8303` (the query has no
  leading "?"). Switches: `preset=fresh|early|mid|late` (src/dev/devtools.ts), `speed=10`,
  `sheet=rig|station|contracts` (`slot=<n>`), `spoke=fitting|starmap|salvage|comms|trade`,
  `overlay=jump` (src/ui/haul/dev.ts), `view=haul-art` (the art gallery).

## The contracts everyone builds against

| Contract | Where | What |
|---|---|---|
| Rules (frozen interface) | `src/engine/haul.ts` (import only from here), `src/engine/loadout.ts`; notes `docs/design/space-engine-notes.md` | state `HaulState`, `haulParams`, costs, actions, `hintsFor`, `slotReadout`, `routeTable`, `starMapView`, `jumpPreview`, `offersFor`, `contractGain`, `HaulEvent` |
| Engine mode | `src/engine/mode.ts`, `src/engine/haulMode.ts` | `EngineMode`; the shared `tick`, `computeOffline` (returns `game` and `report`), `prestige(cfg, state, now, {traitId, buys})`, `activeIncomePerSecond` |
| Store actions | `src/modes/haul/actions.ts` | `haulActions.{assignDrone, moveDrone, recallDrone, launch, upgradeRig, claimSlot, buyDrone, buyCapacity, buyEngine, buyFreighter, buyAutopilot, setPolicy, pickContract, useFlare, watchFlareAd, fitModule, refitModule, buyStarNode, jump, acknowledge, receiveAllotment, collectShiftLog, openPod, timeWarp, markHintShown}`, `haulNow()`; each returns false and plays `ui_denied` when refused |
| Shared store | `src/state/store.ts` | `game`, `cfg`, `offline {seconds, earnings, report}`, `chestOpening`, `openChest`, `closeChest`, `purchase`, `collectOffline`, `prestige(choice)`, `save` |
| Tick events | `src/state/modeEvents.ts` | `modeEvents.subscribe(events => ...)`: every `HaulEvent` of each tick and each action |
| Selecting | `src/ui/haul/useRun.ts` | `useRun(fn, fallback)` (primitives), `useRunShallow(fn, fallback)` (objects, compared by value) |
| UI state | `src/ui/haul/uiState.ts` | `useHaulUi`: `sheet`, `spoke`, `overlay`, `selection`, `menuOpen` and their setters |
| Layout | `src/ui/haul/layout.ts` | `FieldLayout`, `fieldLayout(screen, cfg, trait)`, `hitTest(p, layout, claimed, idle)`, `Hit` |
| Hints | `src/ui/haul/hints.ts`, `src/ui/hints/targets.ts` | `allHaulHints()`, `haulHints` (point hints for the shared overlay); target keys of spec 3; `targets.set(key, rect)` for drawn targets, `useTarget(key)` for views |
| Art kit | `src/ui/haul/art/` (README) | `bakeAtlas`, `spriteXform`, `pictures.*`, `*.draw.ts`, `Reticle`, `ReticleLayer`, `HaulIcon`, `HAUL_ICONS` |
| fx | `src/services/fx/catalog.haul.ts` | the 56 keys; `src/modes/haul/fx.ts` maps tick events to keys |
| Strings | `src/ui/haul/strings.ts`, game.json `haul.names`, `characters`, `story` | every text the screens show |
| Placeholders | `src/ui/haul/Placeholder.tsx` | delete once no screen imports it (shell package) |

## Packages already under way (not handed out again)

| Package | Owns | State |
|---|---|---|
| **Rules** (engine) | `src/engine/haul.ts`, `src/engine/haul/**`, `src/engine/loadout.ts`, `src/config/schema.haul.ts`, `src/engine/fixtures/haul.ts`, their tests (`src/engine/haul*.test.ts`, `loadout.test.ts`, `src/config/schema.haul.test.ts`), `docs/design/space-engine-notes.md` | First pass done (interface frozen); second pass implementing the errata's rules items (12 to 36) in the other working copy. Requests from the skeleton, below. |
| **Art kit** | `src/ui/haul/art/**`, `scripts/art/**`, `docs/design/space-art-notes.md` | First pass done (station, rigs, rocks, drones, freighter, reticle, portraits, icons, atlas, gallery at `?view=haul-art`); second pass running. Next: errata 38 drawings and errata 42 icons. |
| **Sound pack** | `scripts/audio/recipes_haul.py`, `render_haul.py`, `haul_music.py`, `compare.py`, `games/space-miner/assets/sfx/**`, `docs/design/space-audio-notes.md` | Done: 55 effects plus the music loop, QA and the similarity check pass. Its key list equals `catalog.haul.ts` (no key on one side only). The listening check (10.1 #10) is a person's. |

What the skeleton needs from them (their files; ask, do not edit):
- **Rules**: (1) move `HAUL_STARTING_CONTENT` out of `src/config/schema.haul.ts` into a haul-only file
  (e.g. `src/engine/haul/start.ts`) and give `names` neutral defaults, because the shared schema
  imports `schema.haul.ts` and Pizza Empire's bundle therefore carries the haul starting content and
  "Tamsin Station"; (2) `HaulGame` can now be an alias of `GameState` (the shared fields are there,
  optional); (3) the errata 19 `dry` event, the errata 21 `haulStats` fields and errata 22's
  `jumpReadyCores`: when they land, the integration package switches the interim readings
  (Decision 3); (4) `haulFixtures()` caches its first config for good, so a test or a preset with
  another config gets the first one's states; (5) `seam.minInterval` default 10 against the decided
  30 (game.json sets 30); (6) the fixture's module icons `art:mod_<id>` are not art kit names;
  (7) `HaulHint.kind` has `tapTap`, the reticle draws `point | drag | swipe` (the bay package draws
  tap-tap as two points).
- **Art**: errata 38 drawings (`StationSchematic`, `DishRelay`, `ConditionPreview`, `StarCore`,
  `NodeRing`, `ReceiptStamp`) and errata 42 icons (conditions, nodes, products), then add the new
  names to `src/config/artIcons.ts` through the tooling package.

## The remaining work: 7 packages, all can start now (in this order of dependence)

### 1. integration: the engine seam, the store, the mode entry

(a) **Owns**: `src/engine/mode.ts`, `src/engine/haulMode.ts`, `src/engine/haulMode.test.ts`,
`src/engine/modeRegression.test.ts` and `src/engine/fixtures/{recorded-modes.json,recorded-pizza-config.json,classic-space.json}`,
the haul-related parts of `src/engine/economy.ts`, `src/engine/meta.ts`, `src/engine/types.ts`,
`src/engine/rng.ts` (only this package edits those four files during the build), `src/config/schema.ts`,
`src/config/schema.sim.ts`, `src/config/lint.ts`, `src/config/artIcons.ts` (+ test), `src/modes/contract.ts`,
`src/modes/haul/index.tsx`, `src/modes/haul/actions.ts`, `src/modes/haul/presets.ts`,
`src/state/store.ts`, `src/state/modeEvents.ts`, `src/ui/modeParts.tsx`, `src/ui/components/GameIcon.tsx`,
`src/dev/devtools.ts`, `src/dev/presets.ts`, `src/services/fx/catalog.haul.ts`, `src/services/fx/index.ts`,
`src/services/fx/haulTable.test.ts`, `src/services/iap.ts`, `src/ui/haul/useRun.ts`.

(b) **Delivers**: the wiring of spec 1.3 R1 kept green while the rules' second pass lands (Decision 3):
switch the story triggers to the `haulStats` fields and `jumpReady` to `haul.jumpReadyCores` when
they exist; the errata 30 test (every `fx.play` literal reachable from the haul screens resolves in
the haul table); the Hangar Expansion entitlement end to end (5.4: `unlock` → `entitlements.products`
→ drone cap and start drones); Clearance in `src/services/ads.ts` behaviour (no banner, rewarded
without the ad: shared `noAds` and `skipRewarded`); rewarded flare and Shift Log double through
`ads.showRewarded`; the scene's route table push (4.3: the store pushes `routeTable` and the tick's
wall time into a shared value the world package reads; add it to `modeEvents` or a new
`src/state/haulFrame.ts`); presets from the balance bot's states once it exists; the mission
`levels` counting only rig levels (errata 74, a rules question: coordinate).

(c) **Builds against** the rules interface; **provides** every contract in the table above except
layout, hints, art and strings.

(d) **Check**: `npx vitest run src/engine src/services/fx src/config`; `modeRegression.test.ts`
must stay green with its recorded outputs never re-recorded; `npm run check:bundle` (Pizza's bundle
holds no file of `src/engine/haul*`, `haulMode.ts`, `loadout.ts`); a fresh game in the preview plays
the tutorial's first two steps with the placeholders.

### 2. world: the main scene

(a) **Owns**: `src/ui/haul/scene/**` (`Field.tsx` and new files), `src/ui/haul/layout.ts`,
`src/ui/haul/layout.test.ts` (new).

(b) **Delivers**: spec 4.1 field geometry (`fieldLayout` with the k loop, rock radius
`clamp(22, 26, 26 × k × T / 110)`, Long Haul drawn as the base layout, errata 43, 49 to 51; chips by
backtracking from the centre, errata 44; `hitTest` priority, errata 45) with the 10.2 layout tests at
390 x 844 and 375 x 667; spec 4.3 drawing: one Skia canvas, one frame worklet building `RSXform`s for
the art kit's atlas (`bakeAtlas`, `spriteXform`) from the route table, pictures for station, parts,
rigs, piles, ghost slots, seams, freighter climb and warp flash; at most 4 drones per route and 6 on
the rack (errata 41); nothing animates under a spoke; the map hint targets set with `targets.set`
(errata 47). `Field({layout})` keeps its props.

(c) **Builds against**: the art kit, `routeTable`/`haulParams`, `useRunShallow`, the frame push from
integration. **Provides**: `FieldLayout`, `hitTest`, the drawn targets.

(d) **Check**: `layout.test.ts`; `npx tsx scripts/lint-worklets.ts`; screenshots at both sizes in
`preset=fresh|mid|late`; frame time in the preview with 36 drones.

### 3. bay: gestures, the freighter bay, feedback and hints

(a) **Owns**: `src/ui/haul/gestures/**`, `src/ui/haul/hud/**` except `CommsSlot.tsx`
(`FreighterBay`, `DockCounter`, `HoldTank`, `LaunchTrack`, `FlareLauncher`, `StationRail`,
`ContractStrip`, `FloatingFeedback`, `HintLayer`, `ReticlePointer`, `bayMetrics.ts` and
`bayMetrics.test.ts` new), `src/ui/haul/hints.ts`, `src/modes/haul/fx.ts`.

(b) **Delivers**: spec 4.2's responder gesture layer (drag, flick, tap-tap, the launch swipe, the
policy press, errata 46 and 48), the drag line on the UI thread; the bay of 4.1 with the dock counter
(`RollingNumber`, `bayCounterMetrics`, the receipt ticker), hold tank bands on `unload`, flare
launcher, launch track, rail with its show rules and the Dark Matter badge, the contract strip;
floating feedback and credit glyphs (one `credit_tick` each); the reticle script of section 3 with
the hint rules after it (errata 53, 55), drawing tap-tap as two points; the event → sound mapping
(Decision 6) and the haptics rule (6.3).

(c) **Builds against**: `FieldLayout`/`hitTest` (world), `haulActions`, `modeEvents`, the art kit
(`Reticle`, `ReticleLayer`, `drawHoldTank`, `drawFlare`, `drawRailButton`), `hintsFor`.
**Provides**: the target keys of the bay and rail, the selection state's use.

(d) **Check**: `bayMetrics.test.ts` ("₵999.99Qd" at fontScale 0.85, 1, 1.2, 2, both sizes); the
10.1 #2 and #3 checks by hand in the preview (drag, flick, tap-tap, swipe); `lint:worklets`.

### 4. shell: navigation, sheets, comms slot, Shift Log, Jump sequence

(a) **Owns**: `src/ui/haul/HaulShell.tsx`, `src/ui/haul/uiState.ts`, `src/ui/haul/dev.ts`,
`src/ui/haul/Placeholder.tsx`, `src/ui/haul/sheets/**`, `src/ui/haul/overlays/**`,
`src/ui/haul/hud/CommsSlot.tsx`.

(b) **Delivers**: spec 4.4 hub and spoke (one sheet or spoke at a time, the settings sheet from the
Menu button); the haul bottom sheet (46 % height over the bay, registered with `useOverlay`) and the
Rig, Station and Contract Board sheets of 4.5 (errata 58, 59, 61, 62); the comms slot (4.1, 7.4 story
lines with the 45 s gap, hint lines without, errata 56, 57); the Shift Log (4.6, from
`offline.report`) and the Jump sequence (4.6); the station and contract hints in two stages (errata
53). Deletes `Placeholder.tsx` at the end of the build.

(c) **Builds against**: `useHaulUi`, `haulActions`, `slotReadout`, `contractGain`, `contractMissing`,
the store's `offline`, the kit `useOverlay`. **Provides**: the screen frame every package mounts into.

(d) **Check**: `sheet=rig|station|contracts` and `overlay=jump` screenshots; a 10-minute absence
after the autopilot shows the Shift Log (10.1 #7).

### 5. spokes: Fitting Bay, Star Map, Salvage Bay, Comms, Trade Post

(a) **Owns**: `src/ui/haul/spokes/**` (`SpokeFrame`, `FittingBay`, `StarMap`, `Comms`),
`src/ui/haul/salvage/**`, `src/ui/haul/trade/**`.

(b) **Delivers**: spec 4.6 and 5: the Fitting Bay (schematic, typed sockets, cartridge tray, refit,
opens on the first module copy, errata 75), the Star Map (node map, node sheet, Jump panel, condition
cards, the Jump flow of errata 17), the Salvage Bay (pod rack, counters, laser-cut opening, manifest
odds from `chestOddsFacts`), Comms (5-dish relay, radio log with two channels, acknowledge), the
Trade Post (docking terminal, supplies, fuel, licences, purchases through the store). Meta screens
must look nothing like Pizza's card, chest, missions and shop screens (fingerprint 13).

(c) **Builds against**: `haulActions`, `starMapView`, `jumpPreview`, `offersFor`, `fittedModules`,
`canFit`, meta's `missionViews`, `dailyCalendar`, `chestOddsFacts`, the art kit's pods, cartridges and
errata 38 drawings. **Provides**: the spoke target keys (`salvage:pod0`, `fitting:socket0`,
`fitting:module0`).

(d) **Check**: `spoke=<each>` screenshots in `preset=early|mid|late`; a Jump from `preset=late`
lands in galaxy 1 with the chosen condition; the side-by-side comparison of 10.1 #9 is prepared for
the person who signs `fingerprint.human`.

### 6. balance and content: numbers, bot, words

(a) **Owns**: `scripts/content/build-space.py`, `scripts/content/haul-bot.ts` (new),
`scripts/simulate.ts` (the haul branch; it is otherwise unchanged), `games/space-miner/game.json`
(generated, never by hand), `src/ui/haul/strings.ts`, section 2.12 of the specification.

(b) **Delivers**: section 8: the bot (gestures counted), `npm run simulate -- space-miner --hours 12
--prestige` reporting every target, the calibration of the provisional numbers inside their (tune)
ranges with the knobs of section 8, `build-space.py --table` replacing both 2.12 tables (Decision
16); the run-2 gate reported to the lead (Decision 15); every text in this game's voice (7.5):
story, mission texts, buyer lines, interface strings in `strings.ts`; the validate pacing hook for a
haul game (today `validate` without `--no-sim` runs the classic bot).

(c) **Builds against**: the rules interface and the fixtures' player as a start; **provides** the
numbers and the bot states the presets use (hand them to integration).

(d) **Check**: `npx tsx scripts/validate.ts` (with the simulation) passes for both games; the hard
targets of section 8 met; `npm run validate` fingerprint dimension 17 stays under 5 %.

### 7. tooling and store

(a) **Owns**: `scripts/lib/fingerprint.ts` (+ test), `scripts/validate.ts`, `scripts/lib/checks.ts`,
`scripts/check-bundle.ts`, `scripts/lib/bundleRules.ts` (+ test), `scripts/lib/modes.js`,
`scripts/lib/games.js`, `scripts/lib/fxCatalog.js`, `scripts/sync.ts`, `scripts/scan-binary.ts` (new),
`scripts/bundle-allow.json` (new), `scripts/content/space-store.json`, `games/*/store/**`
(fingerprint.json, REVIEW-NOTES.md new, releases.json new; RATING-NOTES and the listing files via
sync), `app.config.ts`, `eas.json` (via sync), `README.md`, `AGENTS.md`, `docs/design/space-bundle.md`,
`package.json` scripts.

(b) **Delivers**: the store listing from scratch (7.6, in `space-store.json`; the subtitle of
Decision 25), the review notes and rating notes, the store-name search (Decision 28), the bundle ids
when the studio domain is known (Decision 27); `check:bundle -- --export` writing
`store/bundle-report.json` and a failing string-denylist stage (errata 6, Decision 11); validate
running `compare.py` when both packs exist; keeping the fingerprint and bundle checks green; the
docs (space-bundle.md: the engine seam, the haul rule files as mode folders, `soundPack: null`).

(c) **Builds against**: everything above; **provides** the gates.

(d) **Check**: `npx tsx scripts/validate.ts --no-sim` (and `--release` before a submission),
`npm run check:bundle` and `-- --export` for both games, `npx vitest run scripts`.

## Shared files that changed in the skeleton (for the merge)

`src/engine/{economy,meta,types,rng}.ts`, `src/config/{schema,schema.sim,lint,artIcons,artIcons.test}.ts`,
`src/modes/contract.ts`, `src/modes/haul/index.tsx`, `src/state/store.ts`, `src/ui/modeParts.tsx`,
`src/ui/components/GameIcon.tsx`, `src/dev/presets.ts`, `src/services/fx/{index,discovery.test,fxTable.test}.ts`,
`src/ui/meta/missions/MissionsSheet.tsx` and `src/ui/meta/shop/Store.tsx` (one `default`/two map entries
for the new enum values), `scripts/lib/{games,modes,fxCatalog,bundleRules}.(js|ts)`, `scripts/validate.ts`,
`scripts/content/build-space.py`, `package.json` (`art:haul`), `games/space-miner/**` (regenerated),
`shared/sfx/synth/` removed. Everything else the skeleton wrote is a new file.

## Known remainders

- **The restaurant chain in the haul bundle.** `src/engine/chain.ts` (18 KB) and the restaurant
  event keys of `store.ts` and `fx/mix.ts` still ride in Orbit Haulers' bundle. Moving `chain.ts` is
  not a pure move of import edges: `economy.ts` calls it in `createVenueState`, the tick, the rates and
  prestige, and `meta.ts` imports three of its functions. What it would take: split the sim parts of
  `economy.ts` and `meta.ts` into a sim engine mode installed by the sim entry (as `haulMode.ts` is),
  with `modeRegression.test.ts` as the gate. Not started: every existing test would have to stay
  unchanged, and the gain is 18 KB of rules no haul code calls.
- **The haul schema in Pizza Empire's bundle.** `src/config/schema.haul.ts` (23 KB, with the starting
  content and the default names) is imported by the shared schema; the rules package's move of the
  content (request 1 above) leaves only field shapes.
- **Fingerprint 7, 8, 13, 19** stay pending until a person, the export report and the release log
  fill them (the release mode of validate requires them).
- **Placeholders** everywhere under `src/ui/haul` except the art kit.
