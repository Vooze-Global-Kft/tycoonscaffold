# One game per bundle

Both games ship from one developer account. Apple (4.3, 2.5.19) and Google (spam, repetitive
content) compare a developer's apps, binaries included, and forbid hidden or dormant features
(`docs/design/research/spam.md`). So a game's app holds its own mode's code, its own data and its
own sound pack, and nothing of the other game. This note says how that is arranged, how it is
checked, and how a mode is added.

## How a game's bundle is decided

1. `GAME=<id>` selects the game. `app.config.ts` (every start and build) and `npm run select` call
   `scripts/lib/games.js`, which writes two files (gitignored):
   - `src/generated/activeGame.ts`: the game's JSON, its images, the sounds of **its** pack
     (`shared/sfx/<soundPack>/`, overridden by name by `games/<id>/assets/sfx/`) and `fxTable`, the
     fx events of its mode read from `src/services/fx/catalog.ts` without the briefs.
   - `src/generated/mode.ts`: `import entry from '../modes/<mode>'`, the game's mode entry and
     nothing else.
2. `src/ui/App.tsx` imports `modeEntry` from `src/generated/mode.ts`, calls `installMode(entry)`
   before anything renders, and renders `entry.Shell` once the save and fonts are in. Metro
   bundles what is imported, so the other modes' entries, and everything only they import, are
   not in the bundle.
3. The mode comes from the bundled game data at build time. Nothing changes it at run time: the
   remote-config overrides (`REMOTE_KEYS` in `src/config/game.ts`) touch only numbers, never
   `mode` or `soundPack`. Code never branches on a game id.

## Three levels

"Shared" used to mean two things: code every game ships, and code the two tab-shell modes (sim
and classic) have in common. The research's MUST for two apps from one account (no shared art, no
shared screens, none of the other game's texts) allows only the first to reach every game. So
there are three levels:

| Level | What | Who ships it |
|---|---|---|
| (a) shared by every game | the folders and files in `SHARED_SRC` (engine rules, state, services, saving, config, dev switches, the generated files, `src/modes/contract.ts`, `src/boot*.ts`), and under `src/ui` only the files listed in `SHARED_UI`: mechanics and a neutral kit. No drawn art of any game, no screens of any game, no game words. | every game |
| (b) a family | `FAMILIES.tabs`: what sim and classic have in common (the tab shell, header, tab bar, banner, list homes, meta screens, their dialogs and celebrations, and the first game's drawn kit: pens, chest, cards, coin, gem, sparkle, tutorial glove and the six "art:" icons in that style) | the member modes (sim, classic); never haul |
| (c) a mode's own folders | `src/modes/<mode>/`, `src/ui/sim/` (sim), `src/ui/scene/` (classic), `src/ui/haul/` (haul) | that mode only |
| Node only | `NODE_ONLY`: the fx catalogue, the art icon lists, the game-data lint | no game |
| sound packs, game data | `shared/sfx/<pack>/` for the games that declare it (`warm`: Pizza Empire; `synth`: Space Miner); `games/<id>/` | that game |

The lists live in code in `scripts/lib/modes.js` (`MODE_FOLDERS`, `FAMILIES`, `SHARED_UI`,
`SHARED_SRC`, `NODE_ONLY`, `MODE_PACKAGES`: three and expo-gl are classic only; `RESTAURANT_RIG`).
A file anywhere in `src/` in none of them (a new folder such as `src/scene/` included) is
**unclassified** and fails the check (in a bundle, or imported by anyone) until it is listed: the
strict reading until someone decides.

**The rule** (`importViolations`, every import edge in `src/`):
- a mode's folders are imported only by that mode (and by the generated entry, the one exception);
- a family file is imported only by files of that family and by its member modes' folders;
- a shared file imports only shared files (no family, no mode, no unclassified file).

Shared code that needs something only a mode or a family has gets it from the entry at install
time instead (see the contract below). A family file that needs a mode's drawing does the same.

## The mode entry contract (`src/modes/contract.ts`)

```ts
interface ModeEntry {
  id: 'sim' | 'classic' | 'haul';
  Shell: ComponentType;                       // the whole game screen after loading
  parts?: { CharIcon?, CardBust?, HintPointer? };  // "char:" icons (GameIcon), the cast member in a big card, the tutorial pointer
  artIcons?: Record<string, ArtIconSource>;   // every "art:" icon the mode draws (src/ui/art/icons.ts)
  hints?: HintSource;                         // the tutorial hand's script (src/ui/hints/source.ts)
  devViews?: Record<string, ComponentType>;   // ?view=<name> review screens in the web preview
}
```

- **sim** (`src/modes/sim/index.tsx`): `Shell` is the family's tab shell (`src/ui/shell/TabShell.tsx`)
  with `HomeSim`; `parts` draw the cartoon people, and `HintPointer` is the glove (`HandPointer`,
  `src/ui/art/props.tsx`); `artIcons` are the family's six (`TABS_ART_ICONS`) plus the truffles and
  the shop front (`SIM_ART_ICONS`), turned into sources by `artIconSources`; `hints` is the list
  homes' script (`src/ui/home/hints.ts`, the engine's guideHint); `devViews` are `art` and `props`,
  in the web build only (`src/modes/sim/devViews.web.ts`; on iOS and Android Metro takes
  `devViews.ts`, which has none, so the galleries are not dormant code in the phone bundles).
  `src/modes/entries.test.ts` checks every piece the sim and classic entries hand over, and that
  `App.tsx` installs the entry at module level: every reader falls back quietly, so without the
  test a dropped key would cost Pizza Empire its glove or portraits with every other check green.
  Read `modeParts()` and `hintSource()` inside a render, never at module load (a development build
  warns when one is read before install, or when the hint source changes after it).
- **classic** (`src/modes/classic/index.tsx`): the tab shell with `HomeClassic` and the managers
  panel over the staff tab (`StaffTop`), the same hint script and glove, the family's six icons. No
  portraits: a `char:` icon shows the unknown-icon fallback, a card window stays empty unless the
  icon is an `asset:` image. `validate` warns about every `char:` icon in a mode outside
  `PORTRAIT_MODES` (`src/config/artIcons.ts`): classic Space Miner has five until haul replaces it.
- **haul** (`src/modes/haul/index.tsx`): a placeholder `Shell` (a labelled screen), nothing else.
  The real mode brings its whole screen here, with no tab bar and its own overlays, its own
  `hints`, `parts` (its own pointer) and `artIcons`. It may not use the tabs family: not
  `MissionsSheet`, `ChestOverlay`, the header or any `src/ui/meta` screen; it builds its own from
  the level (a) kit (`src/ui/kit`: `Sheet`, `Panel`, rewards, time, overlays).

What the shared code asks of the entry, and where:

| Shared piece | Asks for | Without it |
|---|---|---|
| `GameIcon` (`src/ui/components`) | `parts.CharIcon` for `"char:<id>"` | the ❔ fallback |
| `CardPortrait` (`src/ui/meta/chest/Portrait.tsx`) | `parts.CardBust` | empty card window |
| `ArtIcon` (`src/ui/art`) | `artIcons` (no icon is drawn by level a) | the ❔ fallback |
| `HintOverlay` (`src/ui/hints`) | `hints` (with `sceneKeys`, `fromAboveKeys` for where the pointer stands) and `parts.HintPointer` (props `x`, `y`, `clock`, `scale`, `angle`, drawn in its Skia canvas) | no hint; with hints but no pointer, the rings only |
| `StationList` (`src/ui/home`) | a `StationPortraitContext` provider from the mode's home (sim: the scene's cook) | the manager icon |

## Sound packs and fx events

- game.json `soundPack` (required, no default: a game that forgets it does not silently get the
  restaurant's marimba and service bell): the folder in `shared/sfx/`. Only that pack's
  files are bundled; the game's own `assets/sfx/` still overrides by name (Pizza Empire's
  `music_main.m4a`). A pack that does not exist stops the build with a clear error; a missing sound
  is silent. `src/services/fx/discovery.test.ts` checks that Pizza Empire plays exactly the bytes
  it played before packs existed (`pizzaSounds.fixture.json`).
- The fx catalogue (`src/services/fx/catalog.ts`) is documentation and types. The app imports only
  its types (`FxName` keeps `fx.play('<key>')` typed) and plays `fxTable` from the generated file.
  An entry with `modes: ['sim']` (the restaurant scene's events and the rush) is left out of other
  modes' tables; briefs are never shipped. The player preload order and the voice counts are
  catalogue fields too (`preload`, `voices`), so `src/services/fx/mix.ts` holds no event key and a
  game's bundle names only its own mode's events. `scripts/audio/make_sfx.py` reads the same file
  unchanged; `scripts/lib/fxCatalog.js` is the JS twin of its reader.

## The check: `npm run check:bundle`

`scripts/check-bundle.ts`, rules in `scripts/lib/bundleRules.ts` (tested in `bundleRules.test.ts`).
For each game it lists the source files, packages and assets of its app, counted in the three
groups (shared, family, mode), and fails on another mode's folders or packages, a family the mode
is not in, an unclassified `src/` file, a Node-only file, another game's data, a sound from an
undeclared pack, (for a mode other than sim) the restaurant rig, an import it cannot resolve, and a
string literal in a shared or family file that uses another mode's theme words (`THEME_WORDS`)
unless it is in the known remainder (`scripts/lib/themeWords.allowed.json`, file by file; shrink
it, never grow it for text a player reads). It also fails on any import edge that breaks the three
levels, and prints the largest modules. `--list` prints every project file of each bundle with its
level; `--words` lists every theme-word literal, allowed (blank) or new (✘).

- Fast (default, about 2 s): walks the TypeScript import graph from `index.ts` with the platform's
  extensions, type-only imports skipped, using the generated files as games.js would write them
  for each game (nothing is written, the selection does not change). Bare imports go through
  `tsconfig.json` `paths` and `baseUrl` first, as Metro's resolver does, so an alias such as
  `@/ui/sim/...` is walked like a relative import; an import that is neither a project file nor an
  installed package fails (`unresolved`), so the fast stage fails closed. `--game <id>`,
  `--as-mode <mode>` (a game's data as if its mode were another: checks a mode before a game uses it).
- Export (`-- --export`, about a minute per game; the release check): runs
  `npx expo export --platform ios --source-maps --dump-assetmap --no-bytecode` per game into a
  temporary folder, reads Metro's source map and asset map, and puts back the game that was
  selected. It judges each export by the mode that was bundled (`MODE` in `src/generated/mode.ts`
  inside the source map) and stops when that differs from the game's data (a stale export).
  `--from <dir>` reads exports made earlier (one folder per game id).

## Adding a mode

1. Add the id to `MODES` in `scripts/lib/games.js`, to `ModeId` in `src/modes/contract.ts`, to
   `FxMode` in `src/services/fx/catalog.ts`, and to the `mode` enum in `src/config/schema.ts`.
2. Create `src/modes/<mode>/index.tsx` exporting a default `ModeEntry`. Put everything only this
   mode uses under `src/modes/<mode>/` (or another folder you then list).
3. List its folders (and any npm package only it may use) in `scripts/lib/modes.js`. If it is to
   share a family's screens, add it to that family's `modes`; otherwise it uses level (a) only.
   A new file in `src/` outside a mode's folders goes into `SHARED_UI` / `SHARED_SRC` (only if it
   holds no drawing, no screen and no game word) or a family.
4. Never import another mode's folders. If a shared piece needs something from your mode, extend
   the contract (`src/modes/contract.ts`) and hand it over at install, as `parts`, `artIcons` and
   `hints` do. If a shared piece holds something only another mode uses, move that part into that
   mode and hand it back the same way.
5. Events only your mode fires: add them to the catalogue with `modes: ['<mode>']`. Sounds: a new
   pack folder in `shared/sfx/` and `"soundPack"` (required) in the game's data.
6. `npm run check:bundle -- --game <id> --as-mode <mode>` while no game uses the mode yet; then
   `npm run check:bundle` and `npm run check:bundle -- --export`.

## Known leftovers (next steps)

- The engine is still one shared engine: `src/engine/chain.ts` (the restaurant production chain,
  imported by `economy.ts`) and the store's chain events (`fx.play('cook_done')` and friends in
  `src/state/store.ts`, the preload and voice lists in `src/services/fx/mix.ts`) ship in every
  game, the haul placeholder included. `src/engine/view.ts` (the list homes' tutorial) ships with
  sim and classic only, through `src/ui/home/hints.ts`. Splitting the engine is the engine
  contract's job.
- Level (a) still names the restaurant in engine rule identifiers and in event keys the store
  plays (the words list below): moving those is the engine contract's job.

## File by file: everything under `src/ui` outside the mode folders

Tests (`*.test.ts`) are never bundled and are not listed.

| File | Level | Why |
|---|---|---|
| `src/ui/App.tsx` | a | root: loading screen (the game's own hero icon and name from its data), game loop, installs the mode, renders its `Shell` |
| `src/ui/theme.ts` | a | theme hook and colour helpers over the game's own data |
| `src/ui/colors.ts` | a | contrast maths (`textOn`, `inkOf`) |
| `src/ui/modeParts.tsx` | a | slots the entry fills (`CharIcon`, `CardBust`, `HintPointer`); no drawing |
| `src/ui/art/icons.ts` | a | NEW, split from `props.tsx`: the "art:" registry (types, register, look-up, names); no drawing |
| `src/ui/art/ArtIcon.tsx` | a | turns a registered recording into a cached PNG; draws nothing of its own |
| `src/ui/art/props.tsx` | b tabs | the first game's drawn kit: coin, gem, sparkle, glove, chest, cards, the six "art:" icons (`TABS_ART_ICONS`, `artIconSources`) |
| `src/ui/art/draw.ts` | b tabs | the cartoon pen (brown outline, shapes) the kit and the sim art draw with |
| `src/ui/art/kit.ts` | b tabs | palette, rig and recording helpers of that pen, small drawings (padlock, shadow, puff) |
| `src/ui/art/raster.ts` | b tabs | rasterising the kit's pictures |
| `src/ui/art/clock.ts` | b tabs | the scene clock of the kit's animations |
| `src/ui/art/types.ts` | b tabs | chest tiers, rarities, the kit's palette type |
| `src/ui/components/GameIcon.tsx` | a | icon dispatch: emoji, `asset:`, and the entry's `char:` / `art:` drawings |
| `src/ui/components/Button.tsx` | a | neutral themed button |
| `src/ui/components/counterPulse.ts` | a | a plain emitter ("something landed on this counter") the fly layer announces |
| `src/ui/components/Header.tsx` | b tabs | the tab shell's top bar |
| `src/ui/components/RollingNumber.tsx`, `headerMetrics.ts`, `moneyWidth.ts`, `rollFormat.ts` | b tabs | the header's counters and their sizing |
| `src/ui/components/TabBar.tsx` | b tabs | the tab bar |
| `src/ui/components/Banner.tsx` | b tabs | the banner-ad strip of the tab shell |
| `src/ui/components/Celebration.tsx` | b tabs | the tab shell's celebrations (reads the home layout) |
| `src/ui/components/Modals.tsx` | b tabs | the tab shell's story and offline dialogs |
| `src/ui/hints/HintOverlay.tsx` | a | the hint mechanism: asks the mode's source, finds the target, rings, and the mode's pointer |
| `src/ui/hints/source.ts` | a | the hint source contract |
| `src/ui/hints/targets.ts` | a | where controls are on screen (the route table moved out) |
| `src/ui/home/*` (`BuyAmountRow`, `BuyButton`, `StationList`, `hints`, `hintRoute`, `layout`, `rows`, `uiState`) | b tabs | the list homes and their tutorial script; `hintRoute.ts` is NEW, moved out of `targets.ts` |
| `src/ui/juice/FlyLayer.tsx`, `fly.ts` | a | flies `GameIcon`s to a target key; no drawing of its own |
| `src/ui/juice/ticker.ts` | a | a number that eases towards the store's value |
| `src/ui/kit/*` (`Panel`, `Sheet`, `ads`, `index`, `overlay`, `rewards`, `time`) | a | the neutral kit: dialog, cards and pills, reward lines from the game's data, timers, the one-dialog rule |
| `src/ui/meta/**` (cards, chest, deals, empire, missions, settings, shop, upgrades, `attention.ts`) | b tabs | the meta screens and their dialogs (chest opening, card dialog, shop, staff, empire) |
| `src/ui/play/gate.ts` | b tabs | when the tab-shell scenes may spawn bonuses and openings (used by sim and classic scenes only) |
| `src/ui/shell/TabShell.tsx` | b tabs | the tab shell |

Counts: level (a) 22 files, family tabs 63 files (of 85 bundled-kind files). Under `src/ui` nothing
is unclassified.

## The haul graph

`npm run check:bundle -- --game space-miner --as-mode haul --list`: 46 project files, 45 of level
(a) plus the haul entry; no family file, no other mode's file, no asset.

| File | Why it is art-free |
|---|---|
| `index.ts`, `src/boot.ts` | registers the root component |
| `games/space-miner/game.json`, `src/generated/activeGame.ts` | the game's own data, its pack's sounds (none yet) and its mode's fx table |
| `src/generated/mode.ts` | imports the one entry |
| `src/modes/contract.ts` | installs the entry's pieces; imports only the registry, hint source and slots |
| `src/modes/haul/index.tsx` | mode (c): the placeholder screen |
| `src/config/game.ts`, `src/config/schema.ts`, `src/config/schema.sim.ts` | parse the game data (no lint messages, no icon names: those are Node only) |
| `src/dev/devtools.ts`, `src/dev/presets.ts` | web-preview switches and bot-made states; no text, no drawing |
| `src/engine/cards.ts`, `chain.ts`, `economy.ts`, `format.ts`, `meta.ts`, `rng.ts`, `types.ts` | rules, numbers and formatting; no drawing (their identifiers are in the words list) |
| `src/services/ads.ts`, `firebase.ts`, `iap.ts`, `native.ts`, `region.ts`, `sdks.ts` | SDK wrappers |
| `src/services/fx/audio.ts`, `clock.ts`, `core.ts`, `haptics.ts`, `index.ts`, `limiter.ts`, `mix.ts`, `pattern.ts`, `settings.ts`, `variants.ts` | the sound and haptics player; plays the generated table, not the catalogue |
| `src/state/store.ts`, `events.ts`, `overlays.ts` | the store, the tick's event emitter, the one-dialog flags |
| `src/ui/App.tsx` | loading screen from the game's own data, game loop |
| `src/ui/art/icons.ts`, `src/ui/art/ArtIcon.tsx` | the registry (empty for haul) and the image cache |
| `src/ui/components/GameIcon.tsx` | icon dispatch; without the entry's parts it shows emoji and ❔ |
| `src/ui/hints/source.ts`, `src/ui/modeParts.tsx` | the slots the entry fills |
| `src/ui/theme.ts`, `src/ui/colors.ts` | colours from the game's data |

## Words

`npm run check:bundle -- --game space-miner --as-mode haul --words` lists every string literal in
the haul graph's level (a) and family files that names a thing of the restaurant (`THEME_WORDS.sim`:
kitchen, waiter, chef, guest, oven, pizza, restaurant, franchise, recipe, cook, table, dish, the
station names, and the rest of the list). Under `src/ui` there are none. What remains is the
known remainder for the engine contract, and the check fails on anything new
(`scripts/lib/themeWords.allowed.json` holds it, with the classic and sim bundles' remainder):

| Where | Literals | Why it stays for now |
|---|---|---|
| `src/state/store.ts` | fx keys `cook_done`, `serve`, `bell`, `rush_start`, `rush_end`, `unlock_venue`; `venue`, `sales_seat`, `rush_reset` | event keys the store plays and the chain's events; they go with the engine contract |
| `src/engine/meta.ts`, `economy.ts`, `chain.ts` | `serve`, `served`, `rush`, `rushes`, `rushDuration`, `venue(s)`, `activeVenue`, `bell` | engine rule identifiers (mission kinds, state fields); not refactored here |
| `src/config/schema.ts`, `schema.sim.ts` | `venue` trigger, field names (`stationValue`, `rushDuration`, mission kinds `serve`, `rush`) | the schema the shared engine parses; the sim block moves with the engine contract |

Moved out of every bundle in this step: the game-data lint's messages (`counts guests served`,
`triggers on unknown venue`, ...; `lintGameConfig` to `src/config/lint.ts`, Node only), every
"art:" name (`src/config/artIcons.ts`, Node only; the app's names are what the entry registers),
the hint route table (`hintRoute`, `src/ui/hints/targets.ts` to `src/ui/home/hintRoute.ts`, family),
and the scene target keys (`tapStation`, `bell`, `startRush`, ...; from `HintOverlay` into the list
homes' hint source). In the review fixes: the preload order and voices of `mix.ts` (now catalogue
fields), the sim block's display defaults (now theme-free `Send`, `Slot`, `Boost`; Pizza Empire
sets its own) and the two venue messages (to `src/config/lint.ts`).

The reverse direction (`--game pizza-empire --words`, `THEME_WORDS.haul`), allowed the same way: the
mode id `haul` in the schema's mode enum; `station` (Pizza's own kitchen stations: `tapStation`,
`stationValue`, "New station!", "A new station"); `warp` (the time-warp boost: `time_warp`,
`timeWarp`, "Time warp"); `space-between` (a flexbox value, not a word). None is a space or
mining thing of the new game except the enum value `haul`, which goes with the engine contract.
