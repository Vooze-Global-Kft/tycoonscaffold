# Night Market: build plan (work packages)

Status: written by the skeleton step (spec 9.2 "hour 0", Decision M1), 23 November 2026. The
specification is `docs/design/market-design.md` (its section 11, the lead's decisions, overrides the
text above it). How a game's bundle is decided and how a mode is added: `docs/design/space-bundle.md`.
Project rules: `AGENTS.md`. Briefing for every engineer: the lead's `BRIEF.md` in the shared notes.

The skeleton leaves the app running in the merge mode: `GAME=night-market` starts in the web
preview on a placeholder screen (labelled boxes at the final zones of 4.1, the board's goods as
"chain·tier" text, the counters' tickets as text). Every file named below exists at its final path
with its final exported names and props. Replace a body or a box; keep the path, the names and the
signatures. A signature of `src/engine/merge.ts` or a seam type changes only after the lead agrees.

## How to work

- One package per engineer. **Edit only the files your package owns** (the table below names every
  file under `src/engine/merge*`, `src/ui/merge`, `src/modes/merge`, `scripts/` and
  `games/night-market` once). A file you need changed: one line in the shared `requests.md`
  (`[label] file: what and why`) and carry on with a local stand-in in your own files.
- Never branch on a game id; the engine stays pure (`src/engine/`: no React, no `Math.random`, no
  `Date.now`); state changes only through `mergeActions` (`src/modes/merge/actions.ts`); sound and
  haptics only through `fx.play` with keys of `src/services/fx/catalog.merge.ts`; every dialog is the
  kit `Sheet` or registers with `useOverlay`; worklets call only worklets.
- The merge mode never imports the `tabs` family (`src/ui/shell`, `src/ui/home`, `src/ui/meta`,
  `src/ui/play`, the header group, `src/ui/art/{draw,kit,raster,clock,types,props}`) or another
  mode's folders. A new file under `src/` outside the merge folders must be listed in
  `scripts/lib/modes.js` (ask the wiring package).
- The first two games do not change: no file of `games/pizza-empire`, `games/space-miner`,
  `src/modes/{sim,haul,classic}`, `src/ui/{sim,haul,scene}`, `src/engine/haul*` is edited, and
  `src/engine/modeRegression.test.ts` stays green with its recordings untouched.
- Selecting a game rewrites `src/generated/*` for everyone: wrap it in
  `flock /tmp/itf-select.lock ...` and select only `night-market`.
- Before you hand in: `npm run typecheck`, the test files you touched
  (`NODE_OPTIONS=--max-old-space-size=3000 npx vitest run <files>`), `npm test` once,
  `npm run lint:worklets`, `npm run check:bundle`, `npx tsx scripts/validate.ts night-market`, and
  look at your screens in the web preview: `GAME=night-market EXPO_NO_TELEMETRY=1 npx expo start --web --port <yours>`
  (under the lock while it starts), then
  `node <scratchpad>/ui/shot.js "preset=mid" out.png --port <yours> --w 375 --h 667 --dsf 1`.
  Switches: `preset=fresh|early|mid|late` (the fixtures until the bot exists), `view=loading`.

## Packages and the files they own

| Package | Owns (after the skeleton) | Shows it works |
|---|---|---|
| **1. Rules MECHANICS** (1 engineer) | `src/engine/merge/types.ts`, `params.ts`, `create.ts`, `board.ts`, `events.ts`, `drop.ts`, `tick.ts`, `actions.ts`, `offline.ts`, `notBuilt.ts` (delete when unused), `src/engine/merge.ts` (the index, above its ORDERS mark), `src/engine/mergeMode.ts`, `src/engine/mergeMode.test.ts`, `src/engine/fixtures/merge.ts`, `src/config/schema.merge.ts` (the fields, the defaults that are rules, `RANGES`, `lintMerge`), `src/modes/merge/actions.ts`, `src/modes/merge/wiring.test.ts`, the engine tests of 10.2 on its files (`drop.test.ts`, `tick.split.test.ts`, `offline.test.ts`, `ticket.test.ts`, `coins.test.ts`, `determinism.test.ts`, under `src/engine/merge*.test.ts` or `src/engine/merge/*.test.ts`) | `npx vitest run src/engine/merge src/engine/mergeMode.test.ts src/modes/merge/wiring.test.ts` |
| **2. Rules ORDERS** (1 engineer) | `src/engine/merge/missing.ts`, `draw.ts`, `festival.ts`, `season.ts`, `lanterns.ts`, `gift.ts`, `advice.ts`, `hints.ts`, the export lines of `src/engine/merge.ts` below its ORDERS mark (it adds its own exports there, without MECHANICS), their tests (`missing.test.ts` with the exact solver `solver.test.ts`, `draw.property.test.ts`, `festival.test.ts`, `season.test.ts`, `lanterns.test.ts`, `gift.test.ts`, `advice.test.ts`) | `npx vitest run src/engine/merge` (its files) |
| **3. Numbers and bot** (1) | `src/engine/merge/bot.ts`, `scripts/content/merge-bot.ts`, `scripts/content/build-night.py`, `games/night-market/game.json` (generated only, replaced whole after the gate), `src/config/merge.content.ts` (`MERGE_STARTING_CONTENT`: every name and starting value; the schema and `RANGES` are MECHANICS's), the merge hook of `scripts/validate.ts` (the branch `g.mode === 'merge'`), `src/modes/merge/presets.web.ts`, section 8.5 of the specification | `npx tsx scripts/content/merge-bot.ts --seed 12345`, `python3 scripts/content/build-night.py`, `npx tsx scripts/validate.ts night-market` |
| **4. Art kit** (1) | `src/ui/merge/art/**` (palette, goods, gear and rail, stall fronts, animals, minders, the dragon, the firefly, shutters, blocks, season particles, Basket, gift bag, `bakeAtlas`, `MergeIcon.tsx`, its README), its review screens in `src/ui/merge/art/devViews.ts` (`merge-art`; already wired into `src/modes/merge/devViews.web.ts`) | `?view=merge-art` in the preview; `npx vitest run src/ui/merge/art` |
| **5. Sound** (1) | `scripts/audio/recipes_night.py`, `render_night.py`, `night_music.py`, the cross-key mode of `scripts/audio/compare.py`, `games/night-market/assets/sfx/**`, `src/services/fx/catalog.merge.ts` (from the skeleton's first version on), `src/modes/merge/fx.ts`, `src/modes/merge/soundKeys.ts` (`MERGE_SHARED_SOUNDS`, moved out of the rules' `mergeMode.ts`) | `python3 scripts/audio/compare.py night-market pizza-empire --cross`; `npx tsx scripts/validate.ts night-market` (a missing key is an error now that sound files exist) |
| **6. Play canvas** (1, from hour 2) | `src/ui/merge/layout.ts`, `layout.test.ts`, `src/ui/merge/play/**` (the canvas, board and street, the drag layer, `hitTest`, the pans, tap-tap; `PlayCanvas.tsx` keeps its name and props; its review screens in `play/devViews.ts`, `merge-layout`, already wired) | `npx vitest run src/ui/merge/layout.test.ts src/ui/merge/play`; `npm run lint:worklets`; the preview |
| **7. Bars, sheets, spokes** (1, from hour 2) | `src/ui/merge/hud/**` (`TopBar.tsx`, `GoalLine.tsx`, `BottomRow.tsx`, `barMetrics.ts`, the undo chip), `src/ui/merge/sheets/**` except `sheets/AwaySheet.tsx`, `src/ui/merge/spokes/**`, `src/ui/merge/overlays/Overlays.tsx` (it mounts every sheet and spoke, the away sheet included, by one import line each), `src/ui/merge/useMerge.ts`, `src/ui/merge/Placeholder.tsx` (delete when unused); steward of `src/ui/merge/strings.ts` (its structure; each package writes only its section) | the preview at 375 × 667 and 390 × 844, fontScale 1.3 |
| **8. Hints and platform** (1, from hour 2) | `src/ui/merge/hints.ts`, `src/ui/merge/FireflyPointer.tsx`, `src/ui/merge/uiState.ts` (Android back over it; the play canvas calls its armed and chip actions, the bars package its sheet and spoke actions), `src/ui/merge/overlays/Loading.tsx`, the overlay registration, the away report sheet `src/ui/merge/sheets/AwaySheet.tsx` (Decision M8; package 7 adds its one mount line in `Overlays.tsx`), the device checks of 10.1 | the preview; `?view=loading`; a phone |
| **9. Store, wiring and tooling** (the skeleton's successor) | `src/ui/merge/MergeShell.tsx` (its named slots), `src/modes/merge/index.tsx`, `presets.ts`, `devViews.ts`, `devViews.web.ts`, `src/modes/entries.test.ts`, `scripts/lib/{games.js,fxCatalog.js,modes.js,fingerprint.ts,fingerprint.test.ts,bundleRules.test.ts,fingerprint.pizzaOrbit.fixture.json}`, `src/ui/hints/targets.ts`, `games/night-market/store/**` (`fingerprint.json`, `releases.json`, `REVIEW-NOTES.md`, `RATING-NOTES.md` and the `play/` texts by `npm run sync`, `NAME-SEARCH.md`, `store.config.json`), the placeholder images `games/night-market/{icon,adaptive-icon,splash}.png` until the art kit's own, `npm run check:bundle` for all three games, and every SHARED file the skeleton changed (the list under "Shared files" below: `src/config/lint.ts` and its merge branch, `src/config/schema.ts`, `src/engine/mode.ts`, `src/state/store.ts`, `src/services/fx/index.ts`, `src/services/fx/catalog.ts`, ...): a package that needs one of them changed asks this package | `npm run check:bundle`; `npx vitest run scripts/lib src/modes/entries.test.ts`; `npm run sync` |
| **Store writer** (label `listing`) | `scripts/content/night-store.json` (the listing; `build-night.py` of package 3 copies it into game.json) | `npx tsx scripts/validate.ts night-market` after `build-night.py` |

`src/ui/merge/strings.ts` sections: `shell` (9), `play` (6), `hud`, `sheets`, `spokes` (7), `hints` (8).

## The seam between the rule files (in step with the code after the integration)

Since the integration (label `rules-lead`) one engineer owns every rules file: `src/engine/merge/**`
(except the bot's `bot.ts` and `bot.test.ts`, the numbers package's), `src/engine/merge.ts`,
`src/engine/mergeMode.ts`, `src/engine/fixtures/merge.ts`, `src/config/schema.merge.ts`,
`src/modes/merge/actions.ts` and their tests. Every body is **built**; no rule throws
`NotBuiltError` (the class stays only because the bot's guard names it), no test replaces a rules
file by a stand-in, and `src/engine/merge/play.test.ts` plays the whole engine through the public
index. The tables below say who calls what, so a change on one side is made with its callers.

Ticket and season functions the board side calls:

| Function (file) | Called when |
|---|---|
| `drawTicket(cfg, g, counter): DrawOutcome` (draw.ts) | a counter's refill is due (2.4 event 6, events.ts `seatTicket`): `draws.ticket` += `used`; the id is set from `nextTicketId` there; a null ticket is "Setting up…" (redrawn at the next `changedAt`); `mstats.ticketsDrawn` and `setups` are counted there |
| `drawParade(cfg, g, counter): DrawOutcome` (draw.ts) | a refill while the Parade is due and none is out, and "Call the dragon" (M14, `grantAd`): `draws.parade` += `used`; a null Parade keeps it due and the counter draws an ordinary ticket |
| `scriptedTicket(cfg, 'fox' \| 'hedgehog', id)` (draw.ts) | `createMerge` (the fox); `onMerged` (the hedgehog, at the first merge) |
| `checkBounds(cfg, g, counter, lines, {parade, scripted})` (draw.ts) | the draw itself (same check), the tests, the bot (gate 4) |
| `onMerged`, `onTierMade(cfg, g, good, firstEver, events)` (lanterns.ts) | drop.ts after every merge (after `feats.merges` and `tier8sThisSeason`); `noteMade` for every tier first made this season or ever (drops, releases, gift goods, shutter goods, gear rush, "Not tonight"'s returned goods), Lucky-skipped tiers included, ascending |
| `countGiftTicket`, `onTicketPaid(cfg, g, counter, ticket, coins, events)` (gift.ts, lanterns.ts) | a ticket paid, in this order: `commitCash('ticket')`, till roll (`'till'`), `recent` booked, counter emptied, `mstats.ticketsThisSeason`, `countGiftTicket`, `onTicketPaid` (feats; `restartParade` after a gold ticket; `settleScript`) |
| `settleScript(cfg, m, clock)` (lanterns.ts) | M42, after a ticket leaves a counter (`onTicketPaid`, `notTonight`): while the opening script waits every empty counter is held (no ordinary draw; `applyLantern` adds held counters too); once no scripted ticket is left after the hedgehog stepped up, `script` = 'done' and every held counter draws `refillDelay` later. drop.ts rolls no Lucky merge while `script` is not 'done' |
| `checkLanterns(cfg, g, clock, events)` (lanterns.ts) | after every purchase, every merge and tier made, every paid ticket, and twice in the close |
| `festivalLineFilled(cfg, g, line, events)` (festival.ts) | drop.ts filled a Festival line (it appends `festivalLine`); the last line gives `festivalGift` = 3 Lucky Sparks (5 with lantern 18) and NO coins (M37), sets `filledAt`, appends `festivalDone {sparks}` |
| `canCloseSeason`, `closeSeason(cfg, g, now, events)` (festival.ts, season.ts) | `EngineMode.canPrestige` and `prestige` (M21). `now` is wall ms (only `lastSavedAt` takes it). The close opens every waiting gift box first (M36), counts the seasoned steps and `seasonsClosed`, resets cash, `runEarnings`, `prestigeCount` + 1 directly (a reset is no coin source), lights the close's lanterns, then `startSeason(cfg, m, season + 1, stats.playSeconds)`, then `checkLanterns` |
| `openingBoard`, `festivalFor`, `seasonedStartLevel`, `familiarFactor`, `seasonRow`, `seasonMods` (season.ts, festival.ts) | `startSeason` (create.ts), `mergeParams` (F_s), `currentMods` |
| `neutralMods`, `lanternMods`, `currentMods(cfg, m): Mods` (lanterns.ts) | params.ts and every rule read every modifier through ONE `Mods` object (precedence of 2.3: the better one, never both) |
| `openGiftBox(cfg, g, events)` (gift.ts) | `mergeActions.openGiftBox` and the close (M36): coins through `commitCash('gift')`, goods to `pendingGoods` (`gift.nextAt` = clock + release when none waits), Sparks kept, `mstats.giftBoxesOpened` |

Board and number functions the ticket and season side calls:

| Function (file) | Used for |
|---|---|
| `mergeParams(cfg, g): MergeParams` (params.ts) | b_c, p_c, values, S_c, h_c, Loose_c, O, F, U, β, costs, the next shutters, F_s, the away cap |
| `roundCoins(cfg, x)` (params.ts; `roundCost` is the same function) | M19: the ONE rounding of every amount shown or paid: costs, `ticketPrice`, `basketPrice`, `saleAmount` (the till and the away form), `giftCoinAmount`, the away earnings |
| `value`, `ticketPrice`, `paceUnit`, `baseTier`, `ripeChance`, `maxPopAt`, `saleAmount`, `houseTierOf`, `saleInterval`, `basketPrice` (params.ts) | prices, coin slots, the advice's gains, best_c at an opening |
| `lineUnmakeable(cfg, g, line)` (params.ts) | M34: a waiting line below its gear's base tier (two base steps after its draw): `nearestTicket` skips its ticket, `hintsFor` points at it (`notTonight:<j>`), the ticket detail says "No longer made at this stall"; bound (b) adds no pops for it |
| `awningLook(cfg, stallLevel)` (params.ts) | M29: the stall front's look, 0 plain (1 to 4), 1 scalloped (5 to 9), 2 double (10 and up) |
| `restartParade(cfg, m, clock)` (params.ts) | the one Parade-clock restart: `onTicketPaid` after a gold ticket, `notTonight` when the gold ticket is sent off |
| `recentCoins`, `recentRate`, `streamValue` (params.ts) | R_t of 2.10 (`incomeRate`, which `EngineMode.activeIncome` returns too), the ticket, gift and Parade streams |
| `startSeason(cfg, m, season, clock)` (create.ts) | `closeSeason` and `createMerge` |
| `applyLantern(cfg, g, n, clock, events)` (actions.ts) | `checkLanterns`, after it recorded a lantern: a `counters` effect appends counters, a `shelfCap` effect restarts waiting gears |
| `placeGood`, `dropCell`, `roomFor`, `freeCells`, `looseCount` (board.ts) | gift goods, the opening board, "Not tonight" (`roomFor` is the one room check), the drop's loose cap λ (M43: 8) |
| `compressedCells(cfg, m)` (board.ts) | M43: K of bound (c), the board's goods after every possible merge (pairs carried from tier 1 to 7, tier 8s kept; shelves and pending gift goods not counted); `checkBounds` and the draw read it, the property test checks it against random-order merges |
| `minderLevelBlock(cfg, g, c)` (params.ts) | M45: why a minder level is refused ('gear': the gear holds the house tier back, "Raise the gear first"; 'top'; 'none'), or null; `levelMinder` refuses unless null, the stall sheet prints the reason |
| `commitCash(g, delta, source)` (actions.ts) | the one way cash changes, booked in `mstats.coins` under five sources (`ticket`, `gift`, `till`, `basket`, `away`, M37) and two ways out (`spend`, `undo`). The shared store grants the away earnings with `E.grantCash`, so `mstats.coins.away` stays 0 in the app; traces book them with `bookAway` |

Who counts what (types.ts `Feats`, `MergeStats`): drop.ts counts `merges`, `tier8sThisSeason`,
`luckies`, `basketSales`, `ticketsThisSeason`; events.ts `drops`, `ticketsDrawn`, `setups`;
actions.ts `notTonights` and the gear rush's drops; lanterns.ts `onTicketPaid` `tickets`,
`threeLineTickets`, `parades`; season.ts `seasonsClosed`; gift.ts `giftBoxesOpened`.

Shared types of the seam (types.ts): `Good`, `Cell`, `Ticket`, `TicketLine`, `Counter`,
`FestivalState`, `GiftBox`, `GiftSlot`, `Feats`, `Mods` (with `festivalSparks`, M37),
`MergeParams`, `ChainParams`, `DrawOutcome`, `MissingResult`, `MergeEvent`, `CoinSource`,
`RecentCoins`, `SITE`.

What the screens and the bot call (all through `src/engine/merge.ts`): `dropAt`, `decodeTarget`,
`targetsFor`, the purchases and buttons of 2.5 (`openStall`, `levelGear`, `levelStall`,
`hireMinder`, `levelMinder`, `openShutter`, `notTonight`, `notTonightRoom`, `undoBasket`,
`openGiftBox`, `closeSeason`, `canWatchAd`, `grantAd`), `mergeParams`, `ticketPrice`,
`roundCoins`, `advice`, `purchaseAdvice`, `festivalAdvice`, `waitEstimate`, `incomeRate`,
`hintsFor`, `featProgress`, `featState`, `giftOdds`, `giftBoxAt`, `festivalGift`, `canCloseSeason`,
`seasonRow`, `SEASON_RESETS`, `SEASON_STAYS` (ids; M36: `giftGoods`, no `giftBoxes`),
`lineUnmakeable`, `awningLook`, `minderLevelBlock`, `missing`, `checkBounds`, `mergeOffline`, `advanceMerge`,
`nextMergeStop`, `nextEvent`, `runEvent`. Target codes for the hit test: `TARGET_COUNTER + j`,
`TARGET_FESTIVAL`, `TARGET_BASKET`, `TARGET_NONE`, a cell's index (types.ts).

Products and ads (Decisions M13, M14): `merge.products` names `night_awnings` (cosmetic, looks
only), `night_late_hours` (unlock: +4 h away, read by `mergeParams().awayCap`) and
`night_quiet_evening` (the shared kind skipAds: the shared ads service grants every "Watch ad" with
no video; nothing in the merge code checks it). `MergeAdKind` is `fillLine`, `gearRush` and
`callDragon` (20 min cooldown, `ads.callDragonCooldown`).

## Order of work

1. Now: MECHANICS and ORDERS against each other's stubs and the fixtures (`mergeFixtures`,
   `fixtureProblems`); the numbers package's prototype answers M3 and M4 to the lead before the
   rules that depend on them are written. Art kit and sound start now (no number needed).
2. From hour 2: the play canvas, the bars/sheets/spokes and hints packages build against
   `mergeLayout`, the types and the fixtures (`?preset=early|mid|late`), with **no number of their
   own**: every price, rate and time a screen shows comes from the rules (`mergeParams`,
   `ticketPrice`, `advice`), never from a constant in a screen.
3. From hour 3: the real bot (`src/engine/merge/bot.ts`) on the real engine; `build-night.py` writes
   game.json only after every hard target of 8.3 (with M2) passes on the five seeds; 8.5 is filled.
4. **Rules and numbers before any screen reads a number**: no screen shows a price, an estimate or a
   season time until step 3's gate passed; until then a screen shows what the fixtures hold.
5. Then numbers into screens, the reviews (M12: one each), fixes.

## Shared files the skeleton changed (all additive)

`src/modes/contract.ts` (`ModeId` + `'merge'`), `src/engine/mode.ts` (the optional
`EngineMode.canPrestige` gate) and `src/state/store.ts` (`prestige()` asks it in place of the points
gate when a mode has it; sim, classic and haul have none, so their path is unchanged), `scripts/lib/games.js` (`MODES`),
`src/config/schema.ts` (mode enum + `'merge'`, the opaque `merge` block, the `cosmetic` product kind,
M7), `src/engine/meta.ts` (`cosmetic` is a non-consumable recorded like `unlock`),
`src/ui/meta/shop/Store.tsx` (`cosmetic: null` in its exhaustive kind table: never in a tab-shell
shop), `src/services/fx/catalog.ts` (`FxMode`), `src/services/fx/index.ts` (`FxName` includes the
merge keys), `scripts/lib/fxCatalog.js` (the merge catalogue), `scripts/lib/modes.js`
(`MODE_FOLDERS.merge`, `NODE_ONLY`, `WEB_ONLY`, `WEB_ONLY_STRINGS`, `THEME_WORDS.merge` without
"merge", which shared literals use), `scripts/lib/fingerprint.ts` (`grid-board`, the kind multiset
check), `docs/design/research/spam.md` (the vocabulary row), `src/config/lint.ts` (the merge
branch), `scripts/validate.ts` (the merge hook: warnings while there is no sound and no bot),
`src/ui/hints/targets.ts` (the merge target keys, in its comment).

Known consequence: every shared edit makes Pizza Empire's and Orbit Haulers'
`store/bundle-report.json` stale (dimension 8 reads "pending" until `npm run check:bundle -- --export`
runs again before a release). The Pizza-to-Orbit comparison itself is unchanged: its recorded
fixture (`scripts/lib/fingerprint.pizzaOrbit.fixture.json`) is replayed in `fingerprint.test.ts`. Spec 9.2
asks the live Pizza-to-Orbit report to stay byte-identical; it reads verified 14, pending 4 (was 15
and 3) until that export, which writes a file of each of the first two games. The lead rules on it
(requests.md, [skeleton]): allow the export as a generated file, or reword 9.2.
