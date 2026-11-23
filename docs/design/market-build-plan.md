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
| **1. Rules MECHANICS** (1 engineer) | `src/engine/merge/types.ts`, `params.ts`, `create.ts`, `board.ts`, `events.ts`, `drop.ts`, `tick.ts`, `actions.ts`, `offline.ts`, `notBuilt.ts` (delete when unused), `src/engine/merge.ts` (the index), `src/engine/mergeMode.ts`, `src/engine/mergeMode.test.ts`, `src/engine/fixtures/merge.ts`, `src/config/schema.merge.ts` (fields; the numbers package owns the starting values), `src/modes/merge/actions.ts`, the engine tests of 10.2 on its files (`drop.test.ts`, `tick.split.test.ts`, `offline.test.ts`, `ticket.test.ts`, `coins.test.ts`, `determinism.test.ts`, under `src/engine/merge*.test.ts` or `src/engine/merge/*.test.ts`) | `npx vitest run src/engine/merge src/engine/mergeMode.test.ts` |
| **2. Rules ORDERS** (1 engineer) | `src/engine/merge/missing.ts`, `draw.ts`, `festival.ts`, `season.ts`, `lanterns.ts`, `gift.ts`, `advice.ts`, `hints.ts`, their tests (`missing.test.ts` with the exact solver `solver.test.ts`, `draw.property.test.ts`, `festival.test.ts`, `season.test.ts`, `lanterns.test.ts`, `gift.test.ts`, `advice.test.ts`) | `npx vitest run src/engine/merge` (its files) |
| **3. Numbers and bot** (1) | `src/engine/merge/bot.ts`, `scripts/content/merge-bot.ts`, `scripts/content/build-night.py`, `games/night-market/game.json` (generated only, replaced whole after the gate), the starting values in `MERGE_STARTING_CONTENT` and `RANGES` of `src/config/schema.merge.ts`, the merge hook of `scripts/validate.ts` (the branch `g.mode === 'merge'`), `src/modes/merge/presets.web.ts`, section 8.5 of the specification | `npx tsx scripts/content/merge-bot.ts --seed 12345`, `python3 scripts/content/build-night.py`, `npx tsx scripts/validate.ts night-market` |
| **4. Art kit** (1) | `src/ui/merge/art/**` (palette, goods, gear and rail, stall fronts, animals, minders, the dragon, the firefly, shutters, blocks, season particles, Basket, gift bag, `bakeAtlas`, `MergeIcon.tsx`, its README), the `merge-art` dev view it adds to `src/modes/merge/devViews.web.ts` (one line, agreed with the wiring package) | `?view=merge-art` in the preview; `npx vitest run src/ui/merge/art` |
| **5. Sound** (1) | `scripts/audio/recipes_night.py`, `render_night.py`, `night_music.py`, the cross-key mode of `scripts/audio/compare.py`, `games/night-market/assets/sfx/**`, `src/services/fx/catalog.merge.ts` (from the skeleton's first version on), `src/modes/merge/fx.ts`, `MERGE_SHARED_SOUNDS` in `src/engine/mergeMode.ts` (agreed with MECHANICS) | `python3 scripts/audio/compare.py night-market pizza-empire --cross`; `npx tsx scripts/validate.ts night-market` (the "no sounds yet" warning becomes an error per missing key once the first file exists) |
| **6. Play canvas** (1, from hour 2) | `src/ui/merge/layout.ts`, `layout.test.ts`, `src/ui/merge/play/**` (the canvas, board and street, the drag layer, `hitTest`, the pans, tap-tap; `PlayCanvas.tsx` keeps its name and props), the `merge-layout` dev view | `npx vitest run src/ui/merge/layout.test.ts src/ui/merge/play`; `npm run lint:worklets`; the preview |
| **7. Bars, sheets, spokes** (1, from hour 2) | `src/ui/merge/hud/**` (`TopBar.tsx`, `GoalLine.tsx`, `BottomRow.tsx`, `barMetrics.ts`, the undo chip), `src/ui/merge/sheets/**`, `src/ui/merge/spokes/**`, `src/ui/merge/overlays/Overlays.tsx`, `src/ui/merge/useMerge.ts`, `src/ui/merge/Placeholder.tsx` (delete when unused); steward of `src/ui/merge/strings.ts` (its structure; each package writes only its section) | the preview at 375 × 667 and 390 × 844, fontScale 1.3 |
| **8. Hints and platform** (1, from hour 2) | `src/ui/merge/hints.ts`, `src/ui/merge/FireflyPointer.tsx`, `src/ui/merge/uiState.ts` (Android back over it; the play canvas calls its armed and chip actions, the bars package its sheet and spoke actions), `src/ui/merge/overlays/Loading.tsx`, the overlay registration and the away report sheet (mounted in `Overlays.tsx`, agreed with package 7), the device checks of 10.1 | the preview; `?view=loading`; a phone |
| **9. Store, wiring and tooling** (the skeleton's successor) | `src/ui/merge/MergeShell.tsx` (its named slots), `src/modes/merge/index.tsx`, `presets.ts`, `devViews.ts`, `devViews.web.ts`, `src/modes/entries.test.ts`, `scripts/lib/{games.js,fxCatalog.js,modes.js,fingerprint.ts,fingerprint.test.ts,bundleRules.test.ts,fingerprint.pizzaOrbit.fixture.json}`, `src/ui/hints/targets.ts`, `games/night-market/store/**` (`fingerprint.json`, `releases.json`, `REVIEW-NOTES.md`, `RATING-NOTES.md` and the `play/` texts by `npm run sync`, `NAME-SEARCH.md`, `store.config.json`), `scripts/content/night-store.json` (the store writer drafts it), the placeholder images `games/night-market/{icon,adaptive-icon,splash}.png` until the art kit's own, `npm run check:bundle` for all three games | `npm run check:bundle`; `npx vitest run scripts/lib src/modes/entries.test.ts`; `npm run sync` |

`src/ui/merge/strings.ts` sections: `shell` (9), `play` (6), `hud`, `sheets`, `spokes` (7), `hints` (8).

## The seam between MECHANICS and ORDERS

The most important contract of the build. Every function below exists with its final signature
(doc comments in its file cite the section). "Skeleton" says what the body does today: **built**
(works, small), **stub** (a fixed or neutral answer so the other side can run), **unchanged**
(returns the same state, i.e. refused), **throws** (`NotBuiltError`; mock it with `vi.mock` until
it lands).

ORDERS functions that MECHANICS calls:

| Function (file) | Called by MECHANICS when | Skeleton |
|---|---|---|
| `drawTicket(cfg, g, counter): DrawOutcome` (draw.ts) | a counter's refill is due (2.4 event 6); advance `draws.ticket` by `used`, take the id from `nextTicketId` | stub: one Grill line at min(8, best + 1), `used` 0 |
| `drawParade(cfg, g, counter): DrawOutcome` (draw.ts) | a refill while a Parade is due and none is out (2.7) | throws |
| `scriptedTicket(cfg, 'fox' \| 'hedgehog', id): Ticket` (draw.ts) | create() (the fox) and the first merge (the hedgehog, via `onMerged`) | built |
| `onMerged(cfg, g, made, cell, events)` (lanterns.ts) | after every merge (`feats.merges` already counted); the scripted hedgehog steps up here | unchanged |
| `onTierMade(cfg, g, good, firstEver, events)` (lanterns.ts) | a merge, drop or gift good makes a (c, k) first this season (best rose) or ever (book stamped by MECHANICS) | unchanged |
| `countGiftTicket(cfg, g, events)` (gift.ts) | a ticket paid (after `commitCash`), first | unchanged |
| `onTicketPaid(cfg, g, counter, ticket, coins, events)` (lanterns.ts) | a ticket paid, after `countGiftTicket` | unchanged |
| `festivalLineFilled(cfg, g, line, events)` (festival.ts) | drop.ts set a Festival line `filled` and consumed the good; the last line pays the purse | unchanged |
| `neutralMods(cfg): Mods`, `currentMods(cfg, m): Mods` (lanterns.ts) | params.ts reads every modifier through `currentMods` (ONE object, `Mods` in types.ts) | built (neutral); `currentMods` returns neutral |
| `lanternMods(cfg, lit)`, `seasonMods(cfg, season): Partial<Mods>` (lanterns.ts, season.ts) | read only by `currentMods` (precedence 2.3: the better one, never both) | `{}` |
| `openingBoard(cfg, m, season): { goods, blocks }` (season.ts) | create() and a season's start: place `goods` by the drop-cell rule, turn `blocks` into blocks | stub: season 1's board for every season |
| `festivalFor(cfg, season): Good[]` (festival.ts) | create() and a season's start | built (table; past the last row: the last row) |
| `seasonedStartLevel(cfg, steps)`, `familiarFactor(cfg, seasonsClosed)` (season.ts) | params.ts (gear level at a season's start, stall-opening costs) | throws |
| `seasonRow(cfg, season)` (season.ts) | anyone (names, shapes, characters) | built |
| `closeSeason(cfg, g, now, events)` (season.ts) | `EngineMode.prestige` (the season close of 2.11) | unchanged (refused) |
| `openGiftBox(cfg, g, events)` (gift.ts) | the store action `mergeActions.openGiftBox` | unchanged |

MECHANICS functions that ORDERS calls:

| Function (file) | Used by ORDERS for | Skeleton |
|---|---|---|
| `mergeParams(cfg, g): MergeParams` (params.ts) | b_c, p_c, values, S_c, h_c, Loose_c, O, F, U, β, costs (draw bounds, advice, purse, gift coins) | throws |
| `value(cfg, g, c, k)`, `ticketPrice(cfg, g, ticket)`, `paceUnit(cfg, g)`, `baseTier(cfg, L)`, `roundCost(cfg, x)` (params.ts) | prices, the purse (festivalPace × U), coin slots (coinPace × U), advice | throw |
| `streamValue(m, site, n, x)` (params.ts) | the ticket, gift and Parade streams of 2.3 (`SITE`, `draws`) | built |
| `placeGood(m, good, at, cell?)`, `dropCell(m, c)` (board.ts) | the opening board (via create), "Not tonight" returns, gift goods | built |
| `roomFor(m, n)`, `freeCells(m)` (board.ts) | the one room check of the draw, the swap and gift goods (2.7) | built |
| `looseCount(cfg, m, c)` (board.ts) | bound (c) | throws |
| `commitCash(g, delta, source)` (actions.ts) | the one way cash changes: the Festival purse ('festival'), gift coins ('gift'); booked in `mstats.coins` (gate 8) | built |

Shared types of the seam (types.ts): `Good`, `Cell`, `Ticket`, `TicketLine`, `Counter`,
`FestivalState`, `GiftBox`, `GiftSlot`, `Feats`, `Mods`, `MergeParams`, `ChainParams`,
`DrawOutcome`, `MissingResult`, `MergeEvent`, `CoinSource`, `SITE`. A change to one of these is
agreed between the two rules engineers (a line in `requests.md`), then made by MECHANICS.

What the screens and the bot call (all through `src/engine/merge.ts`): `dropAt`, `decodeTarget`,
`targetsFor`, the purchases and buttons of 2.5 (`openStall`, `levelGear`, `levelStall`,
`hireMinder`, `levelMinder`, `openShutter`, `notTonight`, `undoBasket`, `openGiftBox`,
`closeSeason`, `canWatchAd`, `grantAd`), `mergeParams`, `ticketPrice`, `advice`, `incomeRate`,
`hintsFor`, `featProgress`, `giftOdds`, `festivalPurse`, `canCloseSeason`, `seasonRow`, `missing`,
`mergeOffline`, `advanceMerge`. Target codes for the hit test: `TARGET_COUNTER + j`,
`TARGET_FESTIVAL`, `TARGET_BASKET`, `TARGET_NONE`, a cell's index (types.ts).

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

`src/modes/contract.ts` (`ModeId` + `'merge'`), `scripts/lib/games.js` (`MODES`),
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
fixture (`scripts/lib/fingerprint.pizzaOrbit.fixture.json`) is replayed in `fingerprint.test.ts`.
