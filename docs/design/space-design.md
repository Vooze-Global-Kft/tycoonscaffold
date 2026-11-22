# Orbit Haulers: final design of the space game

Status: final, revision 2, the version the team builds. Date: 22 November 2026.
Revision 2 applies the builder review and the store-reviewer review: drag and routing stay the core verbs for the whole run, the reset is spent mostly on rule-changing nodes, the money readout lives in the freighter bay, the restaurant hand pointer and both engines stay out of each other's binaries, and the first version is cut to what eight engineers can build in about three hours plus a review round.
Game folder: `games/space-miner` (the id stays; the app name, store title and everything the player sees change).
Archetype (new engine mode): `haul`.
Base proposal: "logistics" (Haul Lines). Grafts come from "stages" (Star Map reset, an early pod) and from "wildcard" (pick 1 of 3 galaxy conditions, the "while you were away" report, data-driven names).

Sources: research `docs/design/research/spam.md` (its 19 dimensions and the requirements R1 to R8), the three proposals, the three judges' verdicts, and the two reviews of revision 1.

Conventions in this document:
- "pt" is a layout point. "s" is seconds of game clock. "₵" is Credits.
- Every number marked (tune) is a starting value. `scripts/content/build-space.py` (Decision 12) may move it, inside the stated range, to hit the bot targets in section 8. Numbers without (tune) are rules.
- Galaxy indexes are 0-based in rules and state (`galaxy = 0` is the first galaxy); text shows "Galaxy N" with N = index + 1.
- "Pizza" means Pizza Empire.
- Anything marked "later" is not in the first version (section 9 lists it).

---

## 1. The game, its fingerprint, and how it meets R1 to R8

### 1.1 The game in five sentences

1. You run Tamsin Station, a mining outpost in an asteroid field drawn top-down. Its rocks sit on rings that fan out from the station, and the far rings hold rarer ore.
2. You drag hauler drones onto rocks to set their routes. Each rock's rig drills ore onto a pile, the drones ferry it home into the hold, and rocks run dry and get replaced by new ones, sometimes with a different ore, sometimes as a rich bonanza rock.
3. Money only arrives when the freighter leaves the pad and warps out. It pays for the whole manifest at once, and pays more for the units that fill the buyer contract you picked, so you route drones toward the ore that contract wants before it lapses.
4. Over hours the field grows outward ring by ring, a dock autopilot takes over the launches (never the routing), and modules fitted into three typed sockets in the Fitting Bay change the station's rules.
5. When a run has paid off, you Jump to a new galaxy. You spend the Warp Cores you earned on Star Map nodes that change how runs start and what the rock stream brings, the station visibly gains a part for each, and you pick one of three galaxy conditions that change which routes pay best.

### 1.2 Fingerprints along the 19 dimensions

Both games store their fingerprint as data: a `fingerprint` block in `game.json` for the declared values, plus values that tooling measures (section 10.3). The values below use the vocabulary of `spam.md` section 4. Where a dimension is a set, the set is listed with canonical ids, so a script can compute a Jaccard index.

The "Status" column says how the dimension is known: **declared** (a value in `game.json`, compared by validate today), **measured** (computed from the repository by validate once the content files exist), **pending** (a person, the bundle report or the release log fills it; validate prints PENDING until then).

| # | Dimension | Weight | Pizza Empire | Orbit Haulers | Differs | Status |
|---|---|---|---|---|---|---|
| 1 | core_verb | must | `tap-target` (tap the oven, the bell, buy rows) | `drag/route` (drag drones onto rocks all run long; section 8 gates drags per 10 minutes at minutes 30, 60 and 120) | yes | declared |
| 2 | production_topology | must | `linear-chain-with-transport` | `network-routes` (up to 12 parallel routes of different length to rocks that run dry and get replaced, batched at a dock) | yes | declared |
| 3 | money_moment | must | `customer-pays` (a guest pays at a table, all the time) | `sale-at-depot` (one payout per freighter warp-out, the contract's units paid at the contract multiplier) | yes | declared |
| 4 | main_screen_layout | must | `side-cross-section` (side view of the room over rows, a header bar, five tabs) | `top-down-map` (full-bleed orbital map; no header bar, no list, no tab bar; money and buttons live in the freighter bay at the bottom) | yes | declared |
| 5 | art_asset_overlap | must | measured | 0 % of image files shared by hash (no image files; art drawn in code in `src/ui/haul/art`; the icon and screenshots are new) | yes | measured |
| 6 | store_text_overlap | must | measured | under 10 % trigram overlap (all store text in section 7.6 is new) | yes | measured |
| 7 | icon_and_screenshot_template | must | own template (restaurant scenes) | `own` (section 7.6) | yes | pending (human) |
| 8 | bundle_foreign_content | must | must be `none` of Orbit Haulers' content | `none` (generated mode entry and engine install, section 1.3 R1, checked both ways in section 10.4) | yes | pending (bundle report) |
| 9 | progression_structure | should | `location-levels` (8 restaurants) | `sector-map` (one field growing outward over rings, then galaxies) | yes | declared |
| 10 | prestige_model | should | `reset-for-currency` | `reset-for-currency` (the vocabulary has one label for every reset that pays a currency; the mechanism differs, see R7) | no | declared |
| 11 | active_skills_events | should | `{timed-global-speed, flying-bonus-tap, tap-combo, hotspot-tap, venue-opening, free-timer-chest}` | `{rich-seam, seam-flare, bonanza-rock, free-timer-chest}`; Jaccard 1/9 = 0.11 | yes | declared |
| 12 | meta_systems | should | `{cards, chests, missions, offers, daily-shop, daily-gift, locations, prestige}` | `{cards, chests, missions, daily-gift, prestige, contracts, loadout, prestige-tree}`; Jaccard 5/11 = 0.45, and three unique systems | yes | declared |
| 13 | meta_screen_layouts | should | its own screens | `different` (section 4.6; side-by-side check of the Fitting Bay against Pizza's card screen and the Salvage Bay against Pizza's chest opening, section 10.1 #9) | yes | pending (human) |
| 14 | art_style | should | `flat-vector`, palette `warm-cream` | `flat-vector`, palette `deep-space-cold` (near-black navy, cyan, ore accents), line-lit machines | yes (palette family) | declared |
| 15 | character_kind | should | `humans` | `robots` (drones, rigs, freighter, station AI; people are only call signs on the radio, never drawn) | yes | declared |
| 16 | audio_overlap | should | measured | 0 % of sound files shared by hash, music 0 %, and no core key built from a Pizza recipe (section 6) | yes | measured |
| 17 | tone_and_string_overlap | should | voice `warm-playful` | voice `dry-radio-chatter`, under 5 % of in-game strings shared (allow-list only) | yes | declared voice, measured share |
| 18 | keyword_overlap | should | 10 keywords | 12 keywords in the Apple field, none shared with Pizza's (`idle` and `tycoon` are in the subtitle, not the field); Jaccard 0/22 = 0.0 | yes | measured |
| 19 | release_gap | should | log | first submission at least 14 days after Pizza's latest submission | yes (planned) | pending (log) |

**Count, reported the way validate reports it: verified 14 (6 of 8 must), pending 4 (2 of them must), not differing 1.** The verified 14 are 1 to 6, 9, 11, 12, 14 to 18 (5, 6, 16, 17 and 18 become verified as soon as the content files exist). Pending are 7, 8, 13 and 19. Release needs all 8 must, so 7 and 8 must clear; that gives at least 16 of 19 at release even if the side-by-side check rules a meta screen "restyled" (13) and before the release gap is logged (19). Expected at release: 18 of 19.

The fingerprint block in `games/space-miner/store/fingerprint.json`, next to game.json and never bundled (Decision 26; declared values only):

```json
"fingerprint": {
  "core_verb": "drag/route",
  "production_topology": "network-routes",
  "money_moment": "sale-at-depot",
  "main_screen_layout": "top-down-map",
  "progression_structure": "sector-map",
  "prestige_model": "reset-for-currency",
  "active_skills_events": ["rich-seam", "seam-flare", "bonanza-rock", "free-timer-chest"],
  "meta_systems": ["cards", "chests", "missions", "daily-gift", "prestige", "contracts", "loadout", "prestige-tree"],
  "art_style": { "style": "flat-vector", "palette": "deep-space-cold" },
  "character_kind": "robots",
  "voice": "dry-radio-chatter",
  "human": {
    "icon_and_screenshot_template": { "value": "own", "checkedAgainst": "pizza-empire", "by": "", "date": "" },
    "meta_screen_layouts": { "value": "different", "checkedAgainst": "pizza-empire", "by": "", "date": "" }
  }
}
```

And in `games/pizza-empire/store/fingerprint.json` (Pizza's game.json is unchanged):

```json
"fingerprint": {
  "core_verb": "tap-target",
  "production_topology": "linear-chain-with-transport",
  "money_moment": "customer-pays",
  "main_screen_layout": "side-cross-section",
  "progression_structure": "location-levels",
  "prestige_model": "reset-for-currency",
  "active_skills_events": ["timed-global-speed", "flying-bonus-tap", "tap-combo", "hotspot-tap", "venue-opening", "free-timer-chest"],
  "meta_systems": ["cards", "chests", "missions", "offers", "daily-shop", "daily-gift", "locations", "prestige"],
  "art_style": { "style": "flat-vector", "palette": "warm-cream" },
  "character_kind": "humans",
  "voice": "warm-playful",
  "human": {}
}
```

The `human` entries are filled by the person who does the side-by-side check (section 10.1 #9) with their name and date. An empty `by` prints PENDING in normal mode and fails in release mode (section 10.3).

Why `network-routes` is honest: there is no fixed chain of stages to balance. Each route has its own drill, distance and number of drones; the rock at the end of it runs dry and comes back with a different ore; rich seams and bonanza rocks move the best target around; contracts ask for an ore that the current routes may not bring; and every unit waits in one shared hold for a batch decision. The bot measures this (section 8): no single limit (drill, haul or freighter) may bind more than 60 % of route-minutes.

### 1.3 How each requirement is met

**R1 Bundle.** One generated file decides what a build contains, for the screens and for the rules. This describes what was built (docs/design/space-bundle.md, the skeleton step); the plan this paragraph held before differed in names and details (Decision 1 lists the differences).
- **The generated mode entry.** `scripts/lib/games.js` (`writeActiveGame`, run by `app.config.ts` and `npm run select`) writes `src/generated/mode.ts`, one import for the selected game: `import entry from '../modes/haul';`, and `src/generated/activeGame.ts` with the game's data, its own sounds and its mode's fx table. There is no runtime switch and no remote-config path to `mode` or `soundPack`.
- **The mode entry** `src/modes/<mode>/index.tsx` exports a default `ModeEntry` (`src/modes/contract.ts`): `id`, `Shell` (the whole game screen), `parts` (`CharIcon`, `CardBust`, `HintPointer`, and `Icon` with `iconPrefixes` for a mode's own "art:"/"mach:" drawings), `artIcons` (the shared "art:" registry; haul does not use it), `hints` (a `HintSource`, `src/ui/hints/source.ts`), `devViews` (`?view=` screens), `engine` (the mode's own rules) and `presets` (the web preview's `?preset=` states). `src/ui/App.tsx` calls `installMode(modeEntry)` at load, before anything renders, and renders `entry.Shell` once the save and fonts are in.
- **Rules per mode, not a runtime table.** The shared engine (`src/engine/economy.ts`, `meta.ts`) keeps the sim and classic rules built in and asks `engineFor(cfg)` (`src/engine/mode.ts`) for a mode with its own: `EngineMode {id, saveTag, create, reconcile, tick, income, activeIncome, offline, prestige, storyTrigger?, missionUsable?}`. `createInitialState`, `reconcileState`, `tick`, `incomePerSecond`, `activeIncomePerSecond` (new: the income rewards, mission targets and the Time Warp are priced in), `computeOffline` (returns the advanced `game` and the mode's `report` too), `prestige(cfg, state, now, choice?)` and the story and mission checks delegate to it; with nothing installed they run the code they ran before (`src/engine/modeRegression.test.ts` replays outputs recorded before the seam existed). The haul entry installs `haulEngineMode` (`src/engine/haulMode.ts`, wrapping the rules package's `src/engine/haul.ts`). The rule files (`src/engine/haul.ts`, `src/engine/haul/`, `haulMode.ts`, `loadout.ts`, `fixtures/haul.ts`) are haul mode folders in `scripts/lib/modes.js`, so no other game's bundle may hold them and no shared file may import them. Tests install the engine where they need it (`src/engine/haulMode.test.ts`); no test-only dispatcher is needed, because sim and classic install nothing.
- **Three levels of code** (`scripts/lib/modes.js`): (a) shared by every game (`SHARED_UI` under `src/ui`, and everything else in `src/` outside the mode folders), (b) the `tabs` family (the tab shell, header, list homes, meta screens and the first game's drawn kit, glove included; sim and classic only), (c) a mode's folders (`src/modes/haul`, `src/ui/haul` and the haul rule files). A shared file imports only shared files; the haul mode never imports the family. The glove `HandPointer` lives in the family (`src/ui/art/props.tsx`), which the haul bundle never contains; `HintOverlay` draws whatever `parts.HintPointer` the entry hands over (sim and classic: the glove; haul: the art kit's reticle).
- **The haul screens** are `src/ui/haul/HaulShell.tsx` and the pieces under `src/ui/haul/` (docs/design/space-build-plan.md lists every file); the hint layer for drag and swipe hints is the haul mode's own (`src/ui/haul/hud/HintLayer.tsx`, the art kit's `ReticleLayer`), and map targets register with `targets.set(key, rect)`.
- **Sounds.** A game names a shared pack (`soundPack`, `shared/sfx/<pack>/`) or none: Orbit Haulers sets `"soundPack": null` and plays only `games/space-miner/assets/sfx`, so no other game's recipe can ever fill a missing key (Decision 2). Pizza Empire keeps the `warm` pack, byte for byte (`src/services/fx/discovery.test.ts` with `pizzaSounds.fixture.json`). The fx events: `src/services/fx/catalog.ts` (sim and classic, entries tagged `modes`) and `src/services/fx/catalog.haul.ts` (the haul table, read instead of catalog.ts for a haul game), both Node only; `scripts/lib/fxCatalog.js` writes the game's runtime table without the briefs.
- **Art.** Orbit Haulers ships no image files: `games/space-miner/game.json` has no `assets`, no `cast` and no `char:` icons; its "art:" and "mach:" icons are drawn by `src/ui/haul/art` through `parts.Icon` (`HaulIcon`).
- **Shared, as R1 allows:** the generic engine (cash, costs, cards, chests, missions, daily, offline frame), libraries, ads, analytics, purchases, saving, the neutral kit (`Sheet`, `useOverlay`, `Panel`, `Button`), `HintOverlay`, `GameIcon`, `FlyLayer`, `RollingNumber` (reclassed as shared, Decision 7). Known remainders (each game's bundle still carries them; docs/design/space-build-plan.md): the restaurant chain rules `src/engine/chain.ts` (imported by `economy.ts`) and the restaurant event keys in `store.ts` and `fx/mix.ts` ride in the haul bundle; the haul config schema `src/config/schema.haul.ts` (with its starting content) rides in Pizza's.

**R2 Actors.** Everything that moves on the main screen is a machine or a space object drawn for this game in `src/ui/haul/art` (section 4.3). People exist only as voices on the radio; their portraits are call-sign plates with an animated waveform (`mach:` icons), and the station AI is a geometric glyph. The hint pointer is a cyan targeting reticle drawn in `src/ui/haul/art/Reticle.tsx` and animated with plain Reanimated values. No file under `src/ui/sim/**` is in the haul import graph; `src/ui/sim/art/props.tsx`, `items.ts` and `rig.ts` are named in the deny list explicitly (section 10.4).

**R3 Sound.** A complete pack from new recipes in `scripts/audio/recipes_haul.py`, written for all keys, the 10 core keys included: no recipe from the warm pack is rendered for this game, so purchases, Dark Matter and boost sounds share no melody, rhythm or contour with Pizza's, not only no file hash. The recipes run on the existing synth instruments (`SynthPack`), which is fine because the instruments are timbres, not tunes. New music. An automatic similarity check and a listening check back this up (section 6.1). The warm pack is not in the space build.

**R4 Words.** Voice `dry-radio-chatter`: short clauses, call signs, numerals, no exclamation marks, no puns. Store title "Orbit Haulers" (no "Empire", no "X: Y"). All store fields are new (section 7.6). Strings shared with Pizza are limited to an allow-list of plain interface labels (section 10.3). The station and its AI have names that no famous space game uses (section 7.1).

**R5 Fingerprint.** Section 1.2 gives 8 of 8 must and 18 of 19 at release, reported as verified/pending. `scripts/validate.ts` computes the comparison for every pair of games (section 10.3).

**R6 Meta.** Three systems Pizza does not have, each with its own screen: the Fitting Bay (three typed sockets; half the modules change rules rather than stats), the Contract Board (buyers whose contracts lapse, a multiplier on the contract's own units) and the Star Map (cores spent on nodes that mostly change rules). The shared systems (cards, reward boxes, missions, daily gift, offline report) run on the shared engine but use their own cadences (section 5) and new containers (section 4.6): module cartridges in a station schematic, salvage pods cut open in a bay, a radio log with two channels, a 5-dish relay, a printed shift log.

**R7 Reset.** Jump pays Warp Cores, which give nothing on their own: `economy.prestige.bonusPerPoint` is 0. Cores are spent on 8 Star Map nodes (section 2.10). Only two of them are flat multipliers, and both are capped at 5 levels (at most +50 % ore price and +0.5 contract multiplier). The uncapped sink, Prospect Survey, changes the rock stream (more bonanza rocks, which the player has to route to). The others change how a run starts (autopilot online, spare drones to place, a head start of claimed slots, seed credits) and how often seams come. At each Jump the player also picks one of three galaxy conditions from six, and two Jumps in a row offer different triples. Pizza's Chef Stars are a passive +2 % each.

**R8 Idle tycoon.** Once the Dock Autopilot is online (about 2:30 to 3:30), the station earns while the player is away (section 2.11). The player builds one station and fleet that grows for weeks: 12 slots on 5 rings, rig tiers that change the drawing, a freighter that gains a hull or a cargo segment every 25 levels, a drone cap that rises with each galaxy, a station that gains a drawn part for each Star Map node, modules, and an endless chain of galaxies. Section 8 gates "something new on the map" at least once per 30 minutes through galaxy 3. The store page can honestly say idle, tycoon, mining and space.

---

## 2. Rules

All rules live in `src/engine/haul.ts` and `src/engine/haul/` (no React, no `Date.now`, no `Math.random`; randomness from `rng.ts` with the seed in state), reached through the engine mode `src/engine/haulMode.ts` (section 1.3 R1). Game-specific numbers live in `games/space-miner/game.json` under `haul`, schema in `src/config/schema.haul.ts`.

**Tech lead's model rule:** the engine does not simulate individual drones. Each route is a rate. Drone positions on screen are derived from the route's trip time and the clock, for display only. This keeps ticks, the bot and offline exact and cheap.

**Shared schema changes** (P0/P2): `economy.prestige.bonusPerPoint` becomes `z.number().min(0)` (Pizza keeps 0.02); `lintGameConfig` requires 0 for a haul game (with a test). `businesses` becomes optional when `mode` is `haul` (a lint rule requires it for the other modes). The IAP `kind` enum gains `clearance` and `unlock` (section 5.4). `CARD_STATS` gains the haul stats of section 5.1; `cardBonus` calls `fittedBonus` only when `cfg.meta.loadout` is set, so Pizza's path is untouched. `rng.ts` gains `rngMix4(a, b, c, d) = rngMix(rngMix(rngMix(a, b), c), d)`; every multi-argument roll below uses it.

### 2.1 Content data (starting values)

Ores (value in ₵ per unit):

| id | Name | Colour | Value | First ring |
|---|---|---|---|---|
| iron | Iron | #E07A3F | 1 | 1 |
| copper | Copper | #3FC7A0 | 5 | 2 |
| ice | Ice | #7FD4FF | 25 | 3 |
| titanium | Titanium | #C7A6FF | 120 | 4 |
| platinum | Platinum | #F2E6B8 | 600 | 5 |

Ore values are (tune), ratio per ring 4 to 6.

Rings (`distance` in distance units, DU; slot angles in degrees from straight up, chosen so that every route chip stays at least 20 pt clear of every rock at 390 x 844, section 4.1):

| Ring | Name | Distance | Slot angles | Drill rate at rig level 1 (units/s) | Rock life (s of drilling) | Ore weights |
|---|---|---|---|---|---|---|
| 1 | Near Belt | 1.00 | -53, +53 | 0.60 | 150 to 240 | iron 100 |
| 2 | Verdigris Reach | 1.73 | -36, 0, +36 | 0.50 | 240 to 400 | copper 70, iron 30 |
| 3 | Frost Line | 2.45 | -26, -10, +26 | 0.45 | 360 to 600 | ice 70, copper 30 |
| 4 | Lilac Drift | 3.18 | -18, +18 | 0.40 | 480 to 800 | titanium 70, ice 30 |
| 5 | Pale Edge | 3.91 | -14, +14 | 0.35 | 600 to 1,100 | platinum 70, titanium 30 |

Slots are numbered in this order (ring 1 left, ring 1 right, ring 2 left, ...), 0 to 11. Any slot added later (by a condition or content) is appended at index 12 and up, so rock streams, hint keys and saves never renumber. Slot 0 starts claimed with an iron rock, a level-1 rig and a pile of 8 units (tune 5 to 10).

### 2.2 State

```ts
// src/engine/types.ts: new optional field on GameState (null in other modes)
haul: HaulState | null;
// top level, survives Jump:
metaSeed: number;                                // fixed at game creation; used for galaxy offers
loadout: { sockets: (string | null)[] };         // 3 entries: Rig, Fleet, Dock; card id or null
starMap: { levels: Record<string, number>; spent: number };
haulStats: { bestClaimed: number; jumps: number; galaxiesVisited: number[] };
// GameState.stats (lifetime, survives Jump) gains:
//   hauled, launches, contractsMet, depleted, claims, seamDrags, transmissionsAcked

interface HaulState {
  clock: number;            // seconds of play in this run (advances only while the game runs)
  seed: number;             // run seed
  galaxy: number;           // 0-based
  trait: string | null;     // chosen galaxy condition (null in galaxy 0)
  slots: SlotState[];       // one per slot in config order
  fleet: { drones: number; capLevel: number; engineLevel: number };
  idle: number;             // drones not on a route (parked on the station rack with "!")
  hold: Record<string, number>;    // units per ore
  freighter: { level: number; phase: 'docked' | 'climb' | 'away' | 'land'; t: number; cargo: Record<string, number>; payout: number; met: boolean; away: number };
  autopilot: { online: boolean; policy: 'full' | 'contract' };
  contracts: { unlocked: boolean; board: Contract[]; next: number; active: number | null };
  vein: { slot: number | null; until: number; nextAt: number; count: number; guests: number[] };  // guests: origin slot of each drone dragged onto the seam
  flare: { charges: number; nextFreeAt: number; adsToday: number; adDay: string };
  keeper: number;           // Contract Keeper bonus waiting for the next warp-out (0 when none)
  flags: Record<string, boolean>;  // once-per-run lines and messages
  hintsShown: Record<string, number>;
  counters: { launches: number; contractsMet: number; depleted: number; hauled: number; claims: number };  // this run, for display only
}
interface SlotState {
  claimed: boolean; rigLevel: number; haulers: number;
  rockN: number;            // index of the current rock in this slot's stream
  ore: string;              // ore of the current rock
  bonanza: boolean;         // current rock is a bonanza rock
  life: number;             // seconds of full-rate drilling left on the current rock
  pile: number;             // units waiting at the rock
  full: boolean;            // FULL flag (edge-triggered events)
  respawnAt: number | null; // clock time the next rock arrives (null while a rock is present)
  routeFrom: number;        // clock time drones on this route first deliver (warm-up)
  delivered: number;        // units delivered on this route since it was set (for unload events)
}
interface Contract { k: number; buyer: string; wants: { ore: string; units: number }[]; mult: number; launchesLeft: number }
```

Missions, story triggers and pod cadences read the lifetime counters in `GameState.stats`; `haul.counters` are for the run's display only. A Jump therefore never resets progress toward a mission or a pod.

`createHaul(cfg, seed, galaxy, trait, starMap, haulStats, entitlements)` builds a fresh run, applying Star Map head starts (section 2.10) and the Hangar Expansion entitlement (section 5.4).

### 2.3 Derived values (recomputed once per tick by `haulParams(cfg, state)`)

Write `B(stat)` for the fitted-module value of a stat (section 5.1, `loadout.fittedBonus`, 0 when not fitted), `S(node)` for a Star Map node's level, `T(x)` for a galaxy-condition multiplier (1 when the condition does not touch x).

- Rig tiers (haul's own table, `haul.rigTiers`): L4 **Dual Bit** (drill x2, a second drill head drawn), L10 **Deep Bore** (drill x2, rock life x1.5, a taller drill tower), L20 **Seam Detector** (drill x2, rich seams pick this slot with weight x3, a dish on the rig), L35 **Twin Rig** (drill x2, pile cap x2, a second tripod). Past L35, x1.5 drill every 15 levels, shown as stripes on the rig. `tier(L) = 2^(count of 4, 10, 20, 35 reached) × 1.5^floor(max(0, L − 35) / 15)`. Rig level steps are coarse on purpose: fewer, bigger purchases (section 8 caps Upgrade taps at 60 % of gestures).
- Base drill rate of slot i: `rb_i = ring.drill × 1.4^(L−1) × tier(L) × (1 + B(drillRate)) × T(drill) × (bonanza_i ? 3 : 1)` (shipped values; starting values 1.35 and x2; tune: per-level factor 1.25 to 1.45, bonanza drill 2 to 3). Assay Rights acts on the ore price, not here.
- Drill rate: `r_i = rb_i × vein_i`, where `vein_i` is 3 while slot i has the rich seam, otherwise 1.
- Pile cap: `cap_i = max(10, 25 × rb_i) × T(pileCap) × (Twin Rig ? 2 : 1) × (vein_i > 1 ? 2 : 1)`. When a seam ends and the pile is above the normal cap, the pile keeps its units and the rig stalls until the pile drains below cap.
- Drone speed: `v = 0.5 × min(4, 1 + 0.08 × (engineLevel − 1)) × (1 + B(haulerSpeed)) × T(speed)` DU/s.
- Drone capacity on route i: `c_i = 4 × 1.25^(capLevel − 1) × (1 + B(haulerCapacity)) × T(capacity) × (ore_i wanted by the active contract ? 1 + B(contractOreCapacity) : 1)` units.
- Trip time of slot i: `trip_i = 2 × d_i × T(distance) / v + 1.2` s (0.6 s to load, 0.6 s to unload).
- Haul rate of slot i: `h_i = n_i × c_i / trip_i` units/s.
- Freighter capacity (also the hold size): `F = floor(12 × 1.45^(level − 1) × (1 + B(freighterCapacity)) × T(freighterCap))`, at least 1.
- Freighter away time: 8 s at levels 1 to 9, 12 s at 10 to 24, 16 s from 25, times `T(away)`, times `(1 − B(metReturn))` for a launch that meets its contract (`B(metReturn)` at most 0.5). Climb 2.5 s, land 2 s.
- Drone cap: `24 + 4 × galaxy + 6 × (Hangar Expansion owned)`.
- Ore price: `p_o = ore.value × T(oreValue_o) × (1 + B(orePrice)) × (1 + 0.10 S(assay))`.
- Contract multiplier when met: `M' = M + 0.1 S(brokerseat) + A(contractAdd)`, where `A(x)` is an additive condition term, 0 when the condition does not touch x (Decision 3, errata 12).
- Global multiplier: the existing `globalMultiplier` (shared upgrades; Orbit Haulers sells no income multiplier and runs no timed ad boost). `prestigeMultiplier` is 1 because `bonusPerPoint` is 0.

### 2.4 What one tick does

`tick(cfg, state, dt, now, events)` in `economy.ts` delegates to the installed engine; for haul that is `advanceHaul`. The app ticks at 10 Hz; the bot at 1 s. `advanceHaul` cuts `dt` into steps of at most 0.25 s and ends a step early at any freighter phase change, rock depletion, respawn, or seam start or end, so 10 Hz and 1 s ticks agree within 0.5 %. Per step of length `s`:

1. Clock: `clock += s`.
2. Respawns: a slot with `respawnAt ≤ clock` gets rock `rockN + 1` from `rockAt(seed, slot, n, ring, trait, starMap)`, which returns `{ore, life, bonanza}` from `rngMix4(seed, hashString('rock'), slot, n)`. Ore from the ring's weights (after the condition), life uniformly from the ring's range (x1.5 for a Deep Bore rig is applied to `life` when the rock arrives, and x1.5 again for a bonanza rock), bonanza with chance `1 − (1 − 0.06) × 0.94^S(prospect)`, at most 0.5 (shipped; starting value 0.04; tune: base 0.03 to 0.06). Pile 0, `delivered = 0`. Event `arrive {slot, ore, bonanza, oreChanged}`; when the ore differs from the previous rock's, TALLY calls it ("T-4 is copper now.", at most one call every 45 s).
3. Hold sharing: each claimed slot with a rock has `avail_i = pile_i + (life > 0 ? r_i × s : 0)` and asks for `want_i = (clock ≥ routeFrom_i) ? min(h_i × s, avail_i) : 0`. The free hold space `free = F − Σ hold` is shared in proportion to `want_i` (`out_i = want_i × min(1, free / Σ want)`), the same rule `steadyRate` uses, so play and offline agree. If the hold is full, drones visibly circle the station (display only).
4. Per claimed slot with a rock:
   - `drilledNow_i = life > 0 ? min(r_i × s, cap_i − pile_i + out_i) : 0` (the rig stalls when its pile is full; nothing is discarded).
   - With **Overflow Chute** fitted: while the pile is at cap, an extra `B(overflowSpill) × r_i × s` units go straight into the hold if it has space after step 3 (drilled and counted as delivered).
   - `pile' = pile + drilledNow − out`; `life −= drilledNow / r_i` (with `r_i = rb_i × vein_i`): life counts seconds of drilling at the rig's current rate, so a rock drilled at full rate loses one second of life per second, a rich seam gives three times the ore over the same seconds of life, upgrades do not shorten a rock's wall-clock life, and a stalled rig does not use up its rock. Without seams a rock yields `life × rb_i` units.
   - `hold[ore] += out`; `delivered_i += out`; `counters.hauled`, `stats.hauled += out`. When `floor(delivered_i / c_i)` goes up, event `unload {slot, units: c_i}` (the hold tank and its sound follow these events; the engine stays rate-based).
   - FULL flag: `full` becomes true when `pile' ≥ cap_i − 1e-9` and `want_i < r_i × s`; event `pileFull` only on the change from false to true.
   - `life ≤ 0` and `pile = 0`: the rock crumbles. `respawnAt = clock + 6`; `counters.depleted`, `stats.depleted += 1`; at every multiple of 6 of `stats.depleted` a Scrap Pod (event `podEarned`). Drones stay on the slot and resume on the next rock.
5. Freighter:
   - `docked`: launches when the player swiped (action `launch`) or, with the autopilot online, when the policy is met: `full` = `Σ hold ≥ F − 1e-9`; `contract` = the active contract is met by the hold, or the hold is full. With no active contract, `contract` acts like `full`. On launch the cargo loads (section 2.6), phase `climb`, t = 2.5.
   - `climb` ends: the warp-out. Payout (section 2.6) is added through `earn()`. Every contract on the board loses one launch (`launchesLeft −= 1`); lapsed ones are replaced (section 2.6). Events `warp {payout, met, cargo}` and, if met, `contractMet`. Phase `away` with the away time of section 2.3.
   - `away` ends: phase `land` (2 s). `land` ends: phase `docked`.
   - The hold keeps filling in every phase.
6. Rich seam: when `clock ≥ vein.nextAt` and no seam is active, pick a claimed slot with a rock, weighted by ring number (ring 5 weighs 5) and x3 for a Seam Detector rig, from `rngMix4(seed, hashString('vein'), vein.count, 0)`. It lasts 40 s (+5 s per Seam Sense level). The next one comes `U(90, 150) × T(interval) − 10 × S(veinsense)` s after this one ends, the draw from `rngMix4(seed, hashString('vein'), vein.count, 1)`; `vein.count += 1`. The first seam of a run comes at `clock = 360 × T(interval)`. Events `vein {slot}`, `veinEnd {slot}`. When the seam ends, each drone listed in `vein.guests` returns to its origin route (warm-up if the origin had no drones left), and `guests` empties.
7. Unlocks: contracts at the first warp-out with `stats.launches ≥ 4` and `clock ≥ 90` (in galaxy 0; from galaxy 1 they are unlocked at the start). The free flare charge: 1 charge every 30 min of play (`flare.nextFreeAt` on clock), stored 1, first at `clock = 600`.

### 2.5 Player actions, costs and effects

All costs use `economy.geometricCost(base, growth, owned, n)`. `L` is the current level; the cost shown is for the next level. Every purchase buys one level per tap; there is no hold-to-repeat and no "to next tier" button.

| Action | Gesture | Cost | Effect |
|---|---|---|---|
| Assign a drone | drag an idle drone from the station rack onto a rock (or flick it toward the rock), or tap the drone, then tap the rock | free | `idle −= 1`, slot `haulers += 1`. If the slot had no drones, `routeFrom = clock + d_i / v + 0.6`. If the slot has the rich seam, the drone's origin is the rack (it parks there again when the seam ends) |
| Move a drone | drag from a route's "x3" chip to another rock (or flick), or tap the chip, then tap the rock | free | source `haulers −= 1`, target `+= 1`; target warm-up as above. Onto the seam slot: the source slot is pushed to `vein.guests` and `stats.seamDrags += 1` |
| Recall a drone | drag from a route chip back onto the rack | free | `haulers −= 1`, `idle += 1` |
| Launch | swipe up 60 pt or more starting in the launch track | free | Freighter loads and leaves. Allowed when docked and the hold has at least 1 unit |
| Upgrade rig | tap a rock, Rig sheet, "Upgrade" | `3 × 40^(ring−1) × 1.7^(L−1)` (shipped; starting growth 1.6; tune 1.45 to 1.8) | rig level +1 |
| Claim a slot | tap a ghost slot on the map, then the confirm chip | `16 × 15^(ring−1) × 1.4^j` (j = index within the ring) (shipped; starting values 13, 20, 1.6; tune: base 10 to 40, ring factor 15 to 30, j factor 1.4 to 2.5) | slot claimed, rock 0 drifts in (1.5 s), rig level 1 |
| Buy a drone | Station sheet | `10 × 1.45^(n−1)`, n = drones owned, up to the drone cap | `drones += 1`, `idle += 1` (parks on the rack; the player places it) |
| Drone capacity | Station sheet | `30 × 1.55^(L−1)` | capLevel +1 |
| Drone engines | Station sheet | `60 × 2.0^(L−1)`, until the speed multiplier reaches 4 (level 39) | engineLevel +1 |
| Freighter | Station sheet | `15 × 1.5^(L−1)` (shipped; starting growth 1.6) | level +1 (F, away time, art) |
| Dock Autopilot | Station sheet, Systems | ₵90 (tune 80 to 110; free with Systems Preload) | autopilot online; policy chips appear (default `full`) |
| Autopilot policy | Station sheet, or press the launch track 350 ms | free | `full` or `contract` |
| Pick active contract | Contract Board sheet, tap a card | free | `active = index`. Nothing picks a contract for the player except contract 0 in the tutorial |
| Survey Flare | drag the flare from the bay launcher onto a claimed rock | 1 charge (free charge, or a rewarded ad: 3 a day, 20 min apart) | starts a rich seam on that rock now (40 s, same rules as step 6); not on a rock that already has the seam; does not move the natural seam schedule. Event `flare` |
| Fit a module | Fitting Bay, tap a module, then a socket | free, instant | section 5.1 |
| Jump | Star Map spoke | needs ≥ 1 new core | section 2.10 |

At the drone cap the "Buy drone" button shows "Fleet at cap (24). Next galaxy: 28." and is disabled.

### 2.6 Loading, payout and contracts

**Loading on launch.** The freighter takes at most F units from the hold: first each wanted ore of the active contract up to its wanted units, then the rest of the hold by ore value, highest first. Whatever does not fit stays in the hold.

**Payout at the warp-out.** Write `w_o` for the units of ore o that count toward the active contract (`min(cargo_o, wanted_o)`), `x_o = cargo_o − w_o` for the rest, and `met` for "the cargo holds at least the wanted units of every ore on the active contract".

`payout = [ Σ_o w_o × p_o × (met ? M' : 1) + Σ_o x_o × p_o × (met ? 1 + fee : 1) ] × (Σ cargo ≥ F − 1e-9 ? 1.1 : 1) × (1 + keeper) × globalMultiplier`

with `fee = 0.10` (tune 0.05 to 0.15, the delivery fee). The multiplier applies only to the contract's own units, so the best contract is not simply the cheapest one: a far-ring contract with a big multiplier is worth re-routing drones for. `keeper` is the Contract Keeper bonus of the previous met launch (section 5.1), then reset to 0; a met launch with Contract Keeper fitted sets `keeper = B(metCarryover)`.

**What the board shows.** Each contract card shows what it adds to the next launch if met, `contractGain(cfg, state, index)`: the payout of the cargo the loading rule would load from the current hold with this contract active and met, minus the same cargo unmet (written "+₵420 if met"), and how many units are still missing ("12 Ice to go").

**Contract stream.** `contractAt(seed, k, claimedRings, F)` returns contract k:
- Buyer: from `haul.contracts.buyers` by `rngMix4(seed, hashString('buyer'), k, 0)`.
- Ores: pick a claimed ring with a rock, weighted by ring number (far rings more likely), then an ore among the ores of that ring's present rocks, by the ring's weights (Decision 32); one ore (60 %) or two (40 %, the second from another claimed ring when there is one). Every contract can therefore be met by routing, but usually not by the routes as they are.
- Units (Decision 32, replaces "`round(F × U(0.4, 0.7))`"): the hold fills in proportion to what the routes bring, so one launch carries about `F × r_o / R` of ore o, with `r_o` the rate of the routes on rocks of that ore and `R` that of all routes (each route `min(rb_i, n_i × c_i / trip_i)`: current rock, no seam, no module). `now_o` is that with the routes as they are when the contract is drawn; `routed_o` after a player sends `fleetShare` = 0.5 (tune 0.3 to 0.7) of the fleet to rocks of the contract's ores (split evenly for two ores): idle drones first, then the drone that loses least from another route (never a route's last drone), each to the rock of its ore where it adds most. Then `units_o = round(now_o + λ × (routed_o − now_o))`, λ = `U(0.35, 0.75)` (tune: low end 0.2 to 0.5, high end 0.6 to 0.9; one draw for both ores), at least `minUnits` = 3 in total and at most F (`contractStation`, `contractAt`). A contract above the current share is not met by doing nothing; one below the routed share is met by routing for it. A run being built (no params yet) uses `F × λ / ores`; a later galaxy's opening board is drawn again from the new run's station (`startGalaxy`).
- Multiplier by the farthest ring among its ores: 1.6 / 1.9 / 2.2 / 2.6 / 3.0 for rings 1 to 5 (tune), plus `U(−0.1, +0.1)`, rounded to 0.1.
- **Superseded by Decision 40** (a contract is taken, then delivered over `haul.contracts.launches` = 6 warp-outs; offers age over `offerLaunches` = 12; units per the "never free, always reachable" bounds; the bullets below on lifetime, contract 0 and the board are kept for the record and read with it).
- Lifetime: `launchesLeft = 6` (tune 4 to 8) launches, counted at every warp-out whether met or not. A lapsed contract is replaced by the next from the stream (`next += 1`) in the same board position. If the active one lapses, `active = null` and TALLY says "Halden contract lapsed. Pick another." The autopilot's `contract` policy then ships at full.
- Contract 0 is fixed: "Halden Yards, min(10, F) Iron, x1.5", fixed when created, 6 launches, and it is made active automatically (the only automatic pick).
- Board of 3. When the active contract is met it is replaced by the next from the stream and `active` becomes null: the player picks the next one.
- Pods: every `pods.contractsEvery`-th contract met (lifetime, `stats.contractsMet`) gives a Scrap Pod (4 before Decision 40; re-tuned with it, section 8).
- Contracts cannot be scrapped (later).

### 2.7 Automation (a station system, not a hire)

- **Dock Autopilot.** Launches by the chosen policy (section 2.4). It never picks a contract, never routes a drone, and never places a new drone. Before it is online, a full hold stops delivery: drones circle the station, the chevrons pulse, the hint system shows the swipe (section 3), and OPS-2 says "Hold at capacity." once per run.
- There is no fleet router. New drones and Spare Drones park idle on the station rack with a "!" badge, and an idle drone for 10 s gets the drag hint (section 3).

### 2.8 Bonanza rocks and the Survey Flare (the player's own moves beyond routing)

- **Bonanza rock.** A rock from the stream can arrive as a bonanza rock (chance in section 2.4 step 2): gold flecks in the rock drawing, drill x3 (shipped; starting value x2), life x1.5. It shows a gold tag "BONANZA" for its whole life. Drones do not go there on their own.
- **Survey Flare.** A launcher in the bay (right of the launch track) holds the flare charges. Drag the flare onto a claimed rock: a rich seam starts there. The free charge refills every 30 min of play; more charges come from a rewarded ad (3 a day). It never fills offline. This is the one button the player chooses when to use, and it is used with the game's own verb.

### 2.9 Events summary

| Event | Trigger | What happens |
|---|---|---|
| Rich seam | first at 6:00 of a run, then every U(90, 150) s; or a flare | a rock glows gold for 40 s, drills x3, pile cap x2; a dashed gold guide from the busiest route to it; the drag hint shows every time (section 3) |
| Bonanza rock | a new rock arrives as bonanza | gold flecks and a "BONANZA" tag; TALLY: "T-6 is a bonanza rock." |
| Ore change | a new rock's ore differs | TALLY: "T-4 is copper now." |
| Rock dry and crumble | rock life and pile at 0 | debris burst, a 6 s gap, a new rock drifts in; salvage counter "4/6" |
| Contract met | warp-out with a met cargo | stamp on the receipt, the contract's units paid at M', the board asks for a new pick |
| Contract lapsed | `launchesLeft` reaches 0 | the card burns out and a new one slides in |
| Supply drop | the shared free-chest timer (every 3 h, stored 3, first after 15 to 45 min) | a beacon blip in the comms slot and a badge on the Salvage button; the pod waits in the Salvage Bay |
| Pod earned | first ring-2 claim (once per game), every 4th contract met, every 6th dry rock, every 4th acknowledged transmission, first arrival in each new galaxy | pod joins the Salvage Bay rack; the Salvage button shows a count |

No comet bonus and no tap combo: they matched Pizza's Golden Slice and tip combo. No rock tapping: tapping was Pizza's verb.

### 2.10 The reset: Jump, Warp Cores and the Star Map

**Cores.** The existing formula: `cores total = floor(scale × (lifetimeEarnings / threshold)^0.5)`, cores available to gain = total − already gained. `threshold` (shipped 1.6e7) and `scale` (5) are set so the first Jump is available at about 2 h 15 to 2 h 45 of bot play with 20 to 30 cores. `bonusPerPoint = 0`. Cores in hand = `prestigePoints − starMap.spent`.

**What a Jump resets:** cash, the whole `haul` state (slots, rigs, drones, levels, hold, freighter, autopilot, contracts, flare charges), cash upgrades. **Kept:** Warp Cores and Star Map levels, Dark Matter, modules and their levels, the loadout, unopened pods, missions, story, lifetime stats, `haulStats`, entitlements.

**Jump flow (Star Map spoke, section 4.6).**
1. The bottom panel shows cores you would gain now, and what is kept and reset.
2. "Choose next galaxy" opens three condition cards: `offersFor(metaSeed, jumpIndex, currentTrait)`, a seeded shuffle (`rngMix4(metaSeed, hashString('traits'), jumpIndex, 0)`) of the six conditions minus the current one, first three. The same three show in the preview before you Jump, survive a reload, and cannot be re-rolled.
3. The player picks one and confirms. The run seed becomes `rngMix4(seed, hashString('jump'), jumpIndex + 1, 0)`, `galaxy += 1`, the name comes from `haul.galaxies.names[galaxy mod 12]` with " II", " III" after the list runs out. A Derelict Cache is granted on the first arrival at each galaxy index (`haulStats.galaxiesVisited`).

**Galaxy conditions (6).** Data on the existing `T(x)` multipliers.

| id | Name | Effects |
|---|---|---|
| frost | Frost Surplus | ice weight x3 on rings 3 and 4; ice value x2 (Decision 3, errata 72) |
| solar | Solar Wind | drone speed x1.4; rock life x0.5 |
| storms | Seam Storms | seam interval x0.5 (first seam included) |
| longhaul | Long Haul | distances x1.3; contract multipliers +0.3 |
| heavy | Heavy Ore | drone capacity x0.75; all ore values x2 |
| hotcore | Hot Cores | drill x1.5; pile cap x0.6 |

**Star Map: 8 nodes on 3 arms.** Cost of the next level = `ceil(base × growth^L)` cores, L = current level. Each node, once at level 1, adds a drawn part to the station (section 4.3).

| Arm | id | Name | Effect per level | Base | Growth | Cap | Station part |
|---|---|---|---|---|---|---|---|
| Survey | prospect | Prospect Survey | more bonanza rocks: chance `min(0.5, 1 − 0.96 × 0.94^L)` | 2 | 1.25 | 11 (errata 71) | survey array, one petal per 5 levels (up to 8) |
| Survey | veinsense | Seam Sense | seams 10 s more often and 5 s longer | 2 | 1.4 | 5 | scanner dish |
| Survey | assay | Assay Rights | +10 % ore price | 1 | 1.3 | 5 | assay lab pod |
| Trade | brokerseat | Broker Seat | +0.1 to met contract multipliers | 2 | 1.35 | 5 | antenna mast |
| Trade | seedcredits | Seed Credits | start each run with ₵10^(1+L) | 1 | 1.4 | 6 | vault block |
| Fleet | preload | Systems Preload | start each run with the Dock Autopilot online | 5 | 1 | 1 | lit beacon from the start |
| Fleet | sparedrones | Spare Drones | start each run with +1 idle drone per level, placed by the player | 2 | 1.4 | 6 | hangar, one door per level |
| Fleet | afterburner | Afterburner | head start (below) | 2 | 1.5 | 6 | booster ring |

Afterburner head start: level 1 = slot 1 claimed and both ring-1 rigs at the head-start level; 2 = also ring 2 slot 0 claimed; 3 = all of ring 2; 4 = ring 3 slot 0; 5 = all of ring 3; 6 = ring 4 slot 0. Never more slots than `haulStats.bestClaimed`. Head-start slots get rig level 6 (shipped `headStartRig`; starting value 4, so Dual Bit either way). Head-start slots have no drones: the Spare Drones and the starting drone are placed by the player.

Example, first Jump with 25 cores: Systems Preload (5), Assay Rights to 5 (1 + 2 + 2 + 3 + 3 = 11), Afterburner to 2 (2 + 3 = 5) and Seed Credits to 2 (1 + 2 = 3) cost 24 cores and keep 1. Run 2 starts with the autopilot online, both ring-1 slots and ring 2 slot 0 claimed with Dual Bit rigs, ₵1,000 and ore at x1.5 price, so it skips about the first 6 minutes of run 1 and earns 1.5 times as much per unit. From the second or third Jump on, most cores go into Prospect Survey and the capped nodes' last levels.

**Why it stays almost infinite.** Rig, capacity and freighter levels have no cap. Galaxies never end, and each raises the drone cap by 4. Prospect Survey is uncapped and each core costs more lifetime earnings (square root). The schema supports more rings with `galaxyMin` (later). Numbers run to `Number.MAX_VALUE` (format.ts already handles it); the engine clamps at `MAX_CASH`.

### 2.11 Income rates and offline progress (closed forms, no per-second simulation)

Two rates in `haul.ts`, both closed forms:
- `activeRate(params, haul)`: `Σ_i q_i × p̄_i × scale × globalMultiplier`, ignoring the autopilot flag. Used for every income-denominated reward and target: mission "Bank {n} seconds of income", pod "credits" slots, the Time Warp, the income readout.
- `steadyRate(params, haul) = autopilot.online ? activeRate : 0`. Used by `incomePerSecond` for offline only.

Where, per claimed slot: `d_i = min(r̄_i, h_i)` with `r̄_i` the expected base rate of the ring's stream (no seam, no flare; bonanza share included: a fraction `b = c × 1.5 / (c × 1.5 + 1 − c)` of rock-time at x2, with c the bonanza chance), `W_i = meanLife_i × r̄_i / d_i` (the ring's mean life after the condition, x1.5 from Deep Bore, and the bonanza rocks' x1.5 weighted by their chance), uptime `u_i = W_i / (W_i + 6)`, `q_i = d_i × u_i`, and `p̄_i` the ring's weight-averaged ore price after the condition. Freighter limit `Q = F / (2.5 + away + 2)`, `scale = min(1, Q / Σ q_i)`. Contracts, seams, flares and modules that only act on met contracts do not count, so offline never beats play.

**`computeOffline` for haul** (through `engineMode.offline`): `maxHours = cfg.economy.offline.maxHours` (base, tune 6) and `efficiency = min(0.45, cfg.economy.offline.efficiency)`, where the base efficiency keeps its existing remote-config override. Nothing in this game raises offline efficiency above 0.45.

**`fastForward(haul, params, seconds)`** walks each slot's real rock stream, so the ore and the dried-rock count match play:
- `T = min(seconds, maxHours × 3600) × efficiency` effective seconds.
- Without the autopilot: the hold fills to F, piles fill to cap, nothing else moves, credits 0. The Shift Log says "Hold full. Nothing shipped. Bring the Dock Autopilot online." (once per run).
- With it, per slot, a bounded loop over rocks: the current rock's remaining units are `life × rb_i`; each later rock n has `rockAt(...)`'s ore, life and bonanza flag; a rock's wall time is `units / min(rb of that rock, h_i)` and each gap is 6 s (a slot that is respawning starts with the rest of its gap). The loop stops when `T` is used up or after 2,000 rocks for that slot (then the rest of `T` is valued with the closed form above). With rock lives of at least 75 s (Solar Wind) and 6 h at 0.45, the loop runs at most about 120 rocks per slot.
- Units per slot are summed per ore; credits `= Σ units × p_o`, then scaled by the freighter limit `min(1, Q × T / Σ units)` and the global multiplier.
- End state: each slot gets the rock it reached, with its remaining life; its pile is set to `cap` if `rb_i > h_i`, otherwise 0. Hold empty (shipped), freighter docked. A freighter that was climbing or away when the app closed completes its warp-out first; its payout is listed as "IN FLIGHT". `clock` does not advance (seams, flare refills, `respawnAt` and `routeFrom` run on play time); `respawnAt` and `routeFrom` are rebased to the current clock. `stats.depleted` and pods earned at multiples of 6 are updated.

The return screen (Shift Log, section 4.6) lists: time away (capped), units moved per ore, rocks dried, pods recovered, in flight, credits.

### 2.12 Worked numbers, first 10 minutes

Pasted from `python3 scripts/content/build-space.py --table` with the shipped game.json (Decision 16; last balance round, Decision 63, and section 11, "Numbers of the last balance round"). The knob table that command also prints is in that section. The tutorial path now runs seven minutes: after the six guided steps it follows the limit hints of Decision 57 (marked).

**The tutorial path (a person who does only what the hints ask, reacting in 2.5 s; 0.05 s ticks; after the guided steps the limit hints of Decision 57):**

| Time | What happens | Numbers |
|---|---|---|
| 0:00 | Cash ₵0. Slot 0 (ring 1, iron): rig L1, r = 0.60/s, pile 8.00/15.0. One drone idle on the rack. F = 20.0 |  |
| 0:03 | Drag the drone onto rock T-1 | trip = 5.20 s; c = 5.00; h = 0.96/s; first delivery at 0:05 |
| 0:10 | First unload into the hold | 5.00 units |
| 0:26 | Hold 20.0/20.0, chevrons pulse |  |
| 0:28 | Swipe up: launch 1 | cargo 20.0, paid at the warp-out 22.0 |
| 0:31 | Warp-out | ₵22.0 |
| 0:33 | Claim slot 1 (₵21.0) |  |
| 0:56 | Swipe up: launch 2 | cargo 20.0, paid at the warp-out 22.0 |
| 0:58 | Warp-out | ₵22.0 |
| 1:01 | Buy drone 2 (₵10.0) | cash left 13.0 |
| 1:03 | Tap the drone, then rock T-2 | trip = 5.20 s; c = 5.00; h = 0.96/s; first delivery at 1:06 |
| 1:06 | Upgrade rig T-2 to L2 (₵3.00) | r = 0.84/s |
| 1:21 | Swipe up: launch 3 | cargo 20.0, paid at the warp-out 22.0 |
| 1:23 | Warp-out | ₵22.0 |
| 1:38 | Swipe up: launch 4 | cargo 20.0, paid at the warp-out 22.0 |
| 1:40 | Warp-out | ₵22.0 |
| 1:40 | The contract strip slides in | Halden Yards · 10 iron · x1.5 |
| 1:54 | Swipe up: launch 5 | cargo 20.0, paid at the warp-out 23.1 |
| 1:57 | Warp-out, contract met | ₵28.1 |
| 2:11 | Swipe up: launch 6 | cargo 20.0, paid at the warp-out 22.0 |
| 2:14 | Warp-out | ₵22.0 |
| 2:16 | Dock Autopilot online (₵90.0) | cash 104 before |
| 2:26 | Warp-out | ₵22.0 |
| 2:29 | Pick contract 0 from the board |  |
| 2:33 | Move one drone from T-1's chip to T-2 |  |
| 2:39 | Warp-out | ₵22.0 |
| 2:51 | Warp-out | ₵22.0 |
| 2:59 | Upgrade rig T-2 to L3 (₵4.80) (limit hint, Decision 57) | r = 3.53/s |
| 3:04 | Warp-out | ₵22.0 |
| 3:16 | Warp-out | ₵22.0 |
| 3:29 | Warp-out, contract met | ₵51.1 |
| 3:41 | Warp-out | ₵22.0 |
| 3:54 | Warp-out | ₵22.0 |
| 4:01 | Pick contract 0 from the board |  |
| 4:06 | Warp-out | ₵22.0 |
| 4:09 | Claim slot 2 (ring 2) (₵210) (limit hint, Decision 57) |  |
| 4:19 | Warp-out | ₵22.0 |
| 4:31 | Warp-out | ₵22.0 |
| 4:44 | Warp-out | ₵22.0 |
| 4:51 | Buy drone 3 (₵14.5) (limit hint, Decision 57) | cash left 77.8 |
| 4:57 | Warp-out, contract met | ₵50.7 |
| 5:04 | Drag the drone onto rock T-3 | trip = 8.12 s; c = 5.00; h = 0.62/s; first delivery at 5:08 |
| 5:09 | Warp-out | ₵22.0 |
| 5:22 | Warp-out | ₵44.9 |
| 5:29 | Pick contract 0 from the board |  |
| 5:34 | Upgrade the freighter (₵15.0) (limit hint, Decision 57) |  |
| 5:34 | Warp-out | ₵44.6 |
| 5:38 | Move one drone from T-2's chip to T-1 |  |
| 5:47 | Warp-out | ₵62.8 |
| 5:59 | Warp-out | ₵62.8 |
| 6:12 | Warp-out | ₵62.8 |
| 6:18 | Claim slot 3 (ring 2) (₵315) (limit hint, Decision 57) |  |
| 6:24 | Warp-out | ₵65.5 |
| 6:37 | Warp-out | ₵64.6 |
| 6:50 | Warp-out | ₵67.7 |

**The bot (section 8's bot, seed 12345, 1 s ticks; income is activeRate):**

| Time | Event | Income |
|---|---|---|
| 0:26 | first payout |  |
| 1:00 |  | about ₵2.6/s |
| 1:35 | contracts unlock |  |
| 1:36 | slot 1 claimed |  |
| 2:00 |  | about ₵5.1/s |
| 2:03 | Dock Autopilot online |  |
| 2:29 | first rich seam |  |
| 2:40 | first ring-2 slot (copper) |  |
| 2:40 | the guaranteed Scrap Pod (first ring-2 claim) |  |
| 4:00 |  | about ₵18.9/s |
| 6:00 |  | about ₵57.5/s |
| 8:00 |  | about ₵80.9/s |
| 10:00 | first Survey Flare |  |
| 10:00 |  | about ₵415/s |
| 13:17 | first bonanza rock |  |
| 15:00 |  | about ₵1.91e+3/s |
| 20:00 |  | about ₵5.48e+3/s |
| 20:38 | first ring-3 slot (ice) |  |
| 21:44 | first ring-4 slot (titanium) |  |
| 30:00 |  | about ₵4.09e+4/s |
| 45:00 |  | about ₵1.26e+5/s |
| 1 h 00 |  | about ₵2.81e+5/s |
| 1 h 02 | first ring-5 slot (platinum) |  |
| 1 h 30 |  | about ₵4.33e+5/s |
| 2 h 00 |  | about ₵3.53e+5/s |
| 2 h 47 | first Jump available (20 cores) |  |
| 2 h 47 | Jump 1: +20 cores; run 1 earned ₵3.56e+9 | |
| 3 h 43 | run 2 (heavy) passes run 1's earnings, 55:29 into the run (33 % of run 1) | |

---

## 3. The first three minutes (timed script)

**Steps 3 to 6 are replaced by Decision 44** (claim the second rock, buy a drone, tap the drone then the new rock, upgrade a rig; a guided step keeps the pointer 10 s after the hold fills; the first rich seam at 2:30). The table below is the old order, kept for the record; the tutorial path of 2.12 is the current one.

Human time, from the tutorial path in section 2.12. The hint engine (`haul.nextHint`, registered as the haul `hintSource`) decides the next hint from state, so a faster or slower player still gets the right one. Hints wait for any open sheet (`overlays.ts`). **Six guided steps**; everything else in the first three minutes is a voice line without a pointer.

| Time | Screen and voice | Guided step (hint kind, target) | fx and haptic |
|---|---|---|---|
| 0:00 | Map. Station at the bottom of the field, one iron rock with a rig on ring 1, one drone on the rack, the freighter on its pad in the bay, the empty hold tank, the dock counter "₵0". TALLY (comms slot): "Drone T-1 idle. Send it to the rock." | **1** `drag` from `drone:rack` to `rock:0` (the reticle travels a dashed guide in 1.2 s, pauses 0.6 s, repeats) | `comms_in`; grab: `route_grab`, select; snap: `route_snap`, light; release: `route_set`, rigid |
| 0:12 | First unload (4 units); the hold tank shows its first orange band (errata 24) | none | `hold_tick` |
| 0:22 | Hold 12/12. Chevrons pulse. OPS-2: "Hold full. Clear the pad." | **2** `swipe` in `bay:launch` (the reticle moves up 80 pt, repeats) | pass 30 pt: `launch_arm`, select; release: `launch_charge`, ramp |
| 0:27 | Freighter climbs through the field, warp flash at the top, receipt "WARPED · MANIFEST 12 IRON · ₵13" on the bay ticker, credit glyphs fall into the dock counter | none | `warp_out`, `payout`, `credit_tick` stream; heavy at the warp |
| 0:30 | OPS-2: "One more drone would help." | **3** `point` at `station`, then `point` at `station:buyDrone` | `drone_buy`, medium |
| 0:33 | The new drone waits on the rack with "!". TALLY: "Tap the drone, then the rock. Or drag." | **4** `tap-tap`: `point` at `drone:rack`, then at `rock:0` (teaches the second path) | `route_set` |
| 0:59 | A dashed ghost circle with "₵21" on ring 1. TALLY: "Second rock in range. Claim it." | **5** `point` at `slot:1` (then the confirm chip) | `claim_slot`, then `rock_arrive` |
| 1:02 | TALLY: "Split the fleet. Move one drone." | **6** `drag` from `chip:0` to `rock:1` | `route_set` |
| 1:40 | Contract strip slides in: "HALDEN YARDS · 10 IRON · x1.5 · 6 LAUNCHES". Halden Yards: "Halden Yards, buying iron. Ten units." | none (voice only) | `contract_new` |
| 1:55 | Next warp-out: stamp "CONTRACT MET" on the receipt. DISPATCH: "Contract closed. Pick the next one from the board." | none | `contract_met`, success |
| about 2:25 | Station button glows. OPS-2: "Autopilot can take the pad." | conditional `point` at `station:autopilot` when affordable (after the six steps) | `system_online`, success |

After the tutorial the player meets, in this order and without a guided step: the contract board pick (the counter and strip glow once when `active` is null), the first ring-2 claim with its Scrap Pod (5 to 8 min; DISPATCH: "Copper buyers on the board. Ring 2 is in range."), the Salvage Bay (`point` at `button:salvage` once), then the Fitting Bay (`point` at `button:fitting` once, after the pod is opened). The Comms badge appears when the first transmission is done.

**Hint kinds needed.** `point` (exists), `drag` (new: from target A to target B along a dashed guide), `swipe` (new: upward stroke inside a zone). `tap-tap` is two `point`s in a row. `HintOverlay` draws them as data (`{kind, from, to, zone}`) with the registered `HintPointer`: for haul, the reticle in `src/ui/haul/art/Reticle.tsx` (a cyan ring with four ticks and a centre dot, a dashed guide line for drag and swipe, a pulsing ring for point; plain Reanimated `withRepeat`/`withTiming` values, no `useRig`).

**Hint target keys** (in `src/ui/haul/hints.ts`, registered with `useTarget`): `rock:<slot>`, `slot:<slot>` (ghost), `chip:<slot>`, `drone:rack`, `station`, `station:buyDrone`, `station:autopilot`, `rig:upgrade`, `bay:launch`, `bay:counter`, `bay:flare`, `contract:strip`, `button:comms`, `button:salvage`, `button:fitting`, `button:starmap`, `button:trade`, `button:menu`, `salvage:pod0`, `fitting:socket0`, `fitting:module0`.

**Hint rules after the tutorial** (haul `nextHint`): an idle drone on the rack for 10 s → `drag` from `drone:rack` to the rock with the highest marginal value; every rich seam → `drag` from the busiest route's chip to the seam rock (every seam, not limited per run; the reticle guide fades after the first drag onto it); hold full for 4 s without the autopilot → `swipe`; no active contract for 30 s with contracts unlocked → `point` at `bay:counter` (opens the board); a free flare charge unused for 10 min → `point` at `bay:flare`. The last two show at most 3 times per run (`hintsShown`).

---

## 4. Screens

### 4.1 Main screen composition (both sizes)

One full-bleed Skia canvas (the field) under one gesture view, with a few React Native views on top. No header bar, no tab bar, no list, no side view. The camera looks straight down; the station sits at the bottom of the field and the rings fan upward. Money, the hold and every button live in the freighter bay at the bottom, under the thumb. The top of the screen holds only the contract strip and the comms slot.

**390 x 844 (safe area: 47 pt top, 34 pt bottom).**

| Zone | y (pt) | Content |
|---|---|---|
| Status bar | 0 to 47 | starfield continues underneath |
| Contract strip | 55 to 107 | floating card x 16 to 374, h 52: buyer emblem, 1 or 2 ore chips each with a fill bar (hold units / wanted), "x2.2", launches left as pips, "+₵420". Green rim when the hold meets it. "PICK A CONTRACT" when none is active. Hidden until contracts unlock |
| Comms slot | 111 to 135 | x 16 to 374, one line at a time, queued: TALLY and crew lines (portrait 20 pt plus one line), supply-drop blips. Closes after 5 s or on tap, at least 45 s between story lines |
| Field | 55 to 636 | the map (under the strip and the comms slot) |
| Station | centre (195, 590), radius 40 | the hub; the drone rack is two short arms either side of it (x 90 to 160 and 230 to 300, y 584 to 628), 3 cradles each, "+n" beyond 6 |
| Freighter bay | 636 to 844 | dark panel with a curved top edge; content to 810, then the home-indicator area in the panel colour |

Freighter bay at 390:
- Dock counter, x 104 to 286, y 644 to 700 (block 56): the Credits readout as a digital counter (row 36), then 2 pt, then the receipt ticker (row 18): "WARPED · MANIFEST 48 COPPER · 12 IRON · ₵612" for 4 s after each warp-out, otherwise the income "₵36/s". Tap: Contract Board.
- Hold tank, x 16 to 92, y 644 to 752: vertical capsule 56 x 88 with stacked ore-colour bands, "34/50" under it.
- Flare launcher, x 298 to 374, y 644 to 716: 72 pt, the flare with its charge count; hidden until the first charge.
- Launch track, x 104 to 286, y 704 to 762: the freighter pad at its centre with triple chevrons over it. A swipe up of 60 pt that starts in this zone launches. While away: a progress arc and "Back in 9 s". With the autopilot: a policy chip "AUTO · FULL" at the right end (press 350 ms to change).
- Station rail, y 766 to 810: six 44 pt round buttons at x 16, 78.8, 141.6, 204.4, 267.2, 330: Comms, Salvage, Fitting Bay, Star Map (shown from the first ring-3 claim or once a Jump is possible), Trade Post (with the Dark Matter balance as a small badge on its glyph), Menu (station menu: settings, sound, music, haptics, restore purchases, privacy).

**Bay text rule (the fixed-height rule of AGENTS.md).** `src/ui/haul/hud/bayMetrics.ts` exports a pure `bayCounterMetrics(compact, block, fontScale, lineEm)`, written for haul and following the same rule as `cashBlockMetrics` in `src/ui/components/headerMetrics.ts` (it does not import Header code): `scale = clamp(0.85, 1.2, fontScale)`; ticker font `round((compact ? 11 : 12) × scale, 0.1)`, ticker row `ceil(tickerFont × 1.25)`; counter row `= block − 2 − tickerRow`; counter maximum font `floor(min((compact ? 24 : 28) × scale, counterRow / lineEm))`; the shown counter font is `max(16, min(counterMax, innerWidth / (glyphCount × 0.62)))`, and below 16 the number switches to the short format of `format.ts`. All text in the bay uses `allowFontScaling={false}`; `RollingNumber` gets no `lineHeight`; the two rows are absolutely positioned at tops that add up, no negative margins. A test checks "₵999.99Qd" at fontScale 0.85, 1, 1.2 and 2 at both sizes: rows add up to the block and the counter never overlaps the ticker.

Field geometry (all from data, in `src/ui/haul/layout.ts`, pure):
- Ring radius `R = k × distance × T(distance)`. Start with `k = min(110, (stationY − commsBottom − 26) / maxDistance)`. Then, while any rock's drawn circle meets the strip, the comms slot, the rack or the bay, multiply k by 0.96. This rule is `fieldLayout(screen, cfg, trait)`.
- Rock drawn radius `clamp(22, 26, 26 × k / 110)`, tap area 2.4 times that.
- Result at 390 x 844: k = 109.7, radii 110 / 190 / 269 / 349 / 429. Rocks: ring 1 (107, 524), (283, 524); ring 2 (83, 436), (195, 400), (307, 436); ring 3 (77, 348), (148, 325), (313, 348); ring 4 (87, 258), (303, 258); ring 5 (91, 174), (299, 174). Rocks are at least 75 pt apart (centre to centre), at least 34 pt from the rack, inside the 16 pt gutter.
- Routes are straight lines drawn under the rocks (drones fly over). Each route's chip sits at the point along its route, between 25 % and 85 % of its length, that is farthest from every rock and every other chip (`chipPositions(layout)`); at 390 x 844 every chip is at least 20 pt clear of every rock's edge and 40 pt from every other chip.

**375 x 667 (safe area: 20 pt top, 0 bottom).**

| Zone | y (pt) | Content |
|---|---|---|
| Contract strip | 24 to 70 | h 46 |
| Comms slot | 73 to 95 | |
| Field | 24 to 507 | station centre (187.5, 465), radius 36; rack x 92 to 155 and 220 to 283, y 461 to 497; k = (465 − 95 − 26) / 3.91 = 88.0; radii 88 / 152 / 216 / 280 / 344; rock drawn radius 22 |
| Freighter bay | 507 to 667 | dock counter x 92 to 283, y 515 to 565 (block 50); hold tank 48 x 69 at x 16, y 515; flare 64 pt at x 295, y 515; launch track x 92 to 283, y 569 to 619; rail of six 40 pt buttons at y 623 (x 16, 76.6, 137.2, 197.8, 258.4, 319) |

Rocks at 375 x 667: ring 1 (117, 412), (258, 412); ring 2 (98, 342), (188, 313), (277, 342); ring 3 (93, 271), (150, 253), (282, 271); ring 4 (101, 199), (274, 199); ring 5 (104, 131), (271, 131). With the 22 pt radius, rocks stay at least 16 pt apart edge to edge, chips at least 8 pt clear of rocks, and the rack at least 22 pt clear.

**Reach rule.** Every frequent target (rack, ring-1 route chips, launch track, dock counter, flare, rail, every sheet button) lies below y 520 at 390 x 844. Rocks above that line are reached by a drag or flick that starts on the rack or a chip, or by tap-tap. Only the contract strip sits at the top, and the dock counter opens the same board from the bottom.

Layout tests (section 10.2) check all of this at both sizes and for every condition that changes distances (Long Haul).

### 4.2 What can be tapped or dragged on the main screen

| Element | Tap | Press 350 ms | Drag |
|---|---|---|---|
| Rock (tap circle) | with a drone selected: assign it here; otherwise: Rig sheet | Rig sheet | drop target for drones and the flare |
| Ghost slot (64 pt) | claim (confirm chip "Claim ₵260" appears; second tap buys) | | |
| Station (80 pt) | Station sheet | | |
| Rack (idle drones) | select one idle drone (`droneSelected`) | | drag a drone onto a rock (or flick) |
| Route "x3" chip (40 pt) | select one drone of that route | Rig sheet of that route | drag onto another rock (moves one drone), or onto the rack (recalls it) |
| Dock counter | Contract Board | | |
| Launch track | | policy chooser (with the autopilot) | swipe up to launch; a touch that starts on a drone or the flare always drags that instead |
| Flare launcher | select the flare | | drag onto a rock |
| Contract strip | Contract Board | | |
| Rail buttons | open their spoke | | |
| Background | cancel a selection | | |

**Gesture layer (no new native dependency).** `src/ui/haul/gestures/useFieldGestures.ts` puts React Native's responder system on one full-screen `View` in `HomeHaul` (`onStartShouldSetResponder`, `onResponderMove`, `onResponderRelease`, `onResponderTerminate`), all on the JavaScript thread. React Native views on top (strip, comms slot, rail, counter) take their own touches first. Modes: `idle`, `droneSelected`, `flareSelected`, `draggingDrone`, `draggingFlare`, `swipingLaunch`. Thresholds: 10 pt of slop starts a drag; a release inside the slop within 350 ms is a tap; 350 ms without moving is a press; a launch is a stroke that starts in the track and rises 60 pt. Drop: the nearest claimed rock within 40 pt of the finger; else a **flick**: if the release speed over the last 80 ms is at least 0.5 pt/ms, the nearest rock whose bearing from the release point is within 15° of the motion; else cancel (`route_cancel`). The finger position goes into a Reanimated shared value so the drag line draws on the UI thread. Hit tests are a pure `hitTest(point, layout, mode)` in `layout.ts`, priority drone > flare > route chip > rock > ring > background. No pinch, no pan, no zoom.

### 4.3 What is drawn (all machines and space objects, made for this game)

All in `src/ui/haul/art/*.tsx`, drawn with the shared `Pen`/`rec()` helpers (moved to `src/ui/kit/art/draw.ts` if they live under `src/ui/sim` today) and baked to pictures. Line-lit flat vector: dark fills, 1.5 pt bright outlines, glows baked into the sprites (never a live mask filter).

| Piece | Variants | Animation |
|---|---|---|
| Starfield | 1 baked layer plus a faint nebula band in the galaxy hue (hue shifts +47° per galaxy) | drifts 3 pt/s |
| Ring guides | dashed arcs, 1 pt, 18 % white, ring label "R2" at the left end | static |
| Station "Tamsin" | hub disc, outer ring with 6 lit windows, two rack arms with 3 cradles each, the dock arm down to the bay pad | ring rotates once per 40 s |
| Station parts | one per Star Map node at level ≥ 1 (survey array with petals, scanner dish, assay lab pod, antenna mast, vault block, beacon, hangar doors, booster ring), and the autopilot beacon once online | dish sweeps ±30° over 6 s; beacon blinks 1 Hz; others static |
| Asteroid | one shape per rock (seeded), tinted per ore; crack overlays at 50 % and 15 % life; bonanza: gold flecks | slow spin, one turn per 60 to 90 s (seeded) |
| Dry rock | cracked look with a dim red inner glow | glow pulses 0.5 Hz until it crumbles |
| Crumble debris | 8 shards per rock, pooled (16 at most) | burst outward, fade over 0.9 s |
| Rock arrival | the new rock | drifts in from the field edge along its slot's bearing, 1.5 s ease-out |
| Rig | 5 looks: L1 tripod, Dual Bit, Deep Bore, Seam Detector, Twin Rig; stripes past L35 | drill head spins 4 turns/s while drilling, stops when stalled; lamp green / amber (FULL) / red (DRY) |
| Pile | chunk cluster in 4 sizes plus a label "62/80" | grows by steps |
| Drone | hex body with two thruster pods, one look, tinted per route ore | position from the route table (below); thruster flicker; idle drones sit on rack cradles with a "!" badge that bobs |
| Route line | dashed line in the ore colour, under the rocks, "x3" chip at its clearest point | one shared dash phase flows toward the station while delivering |
| Hold queue | drones circling the station when the hold is full | 6 s orbit |
| Hold tank | capsule with ore bands | band heights ease over 0.3 s on `unload` events |
| Freighter | 4 hulls (levels 1, 10, 25, 50), then one cargo segment more every 25 levels (up to 8) | engine flame flicker; climbs from the bay pad off the top of the field in 2.5 s; warp flash (radial burst plus 12 star streaks, 0.5 s); lands from the top in 2 s |
| Credit glyphs | small ₵ glyphs (vector, not a coin) | fall from the warp flash into the dock counter, 0.6 s, at most 12 |
| Rich seam | gold rim and sparkle on the rock, dashed gold guide from the busiest route's chip | rim pulses 1 Hz for 40 s |
| Flare | small canister with a beacon; flare trail on use | trail 0.6 s, then the seam starts |
| Ghost slot | dashed circle with a price tag | slow 2 s breathing |
| Reticle (hint pointer) | ring with ticks, dashed guide, pulse ring | section 3 |
| Salvage pods | Scrap Pod, Derelict Cache | used in the Salvage Bay |
| Module cartridges | 8 module faces on 3 rarity frames | used in the Fitting Bay |
| Portraits (`mach:`) | TALLY glyph (hex aperture, 3 segments); call-sign plates for OPS-2 and DISPATCH (rounded rectangle, call sign, 5-bar waveform); 6 buyer emblems | segments turn while it speaks; waveform bars move while a line shows |
| Icons (`art:`) | ores (5), pods (2), Dark Matter, Warp Core, credits, drone, freighter, rig, flare, the 6 rail glyphs | static |

**Frame loop.** One frame worklet per canvas: `useClock`, then a `useDerivedValue` that builds an `RSXform` array for a Skia `Atlas` of the baked sprites (drones, rocks, drill heads, debris, glyphs). It reads a route table (angle, R, trip, n, routeFrom, the clock at the last tick, the tick's wall time) that the store pushes into a shared value at each 10 Hz tick, and interpolates `clock = base + (now − tickTime)`. Plain `sin`/`cos` in the worklet are allowed; hit tests stay on the JavaScript thread. Pile labels are Skia text redrawn only when the integer changes.

Budget at worst: 36 drones (galaxy 3), 12 rocks, 30 chunks, 16 debris, 12 glyphs, one freighter: about 110 sprites in one atlas draw. Nothing invisible animates; all loops stop while a full-screen spoke covers the map.

### 4.4 Navigation

Hub and spoke. The map is the only home.
- **Sheets** (kit `Sheet`, 46 % of the screen height, slide over the bay; the map stays live above): Rig, Station, Contract Board.
- **Spokes** (full screen with a back chevron at top left, same 16 pt gutter): Fitting Bay, Star Map, Trade Post, Comms, Salvage Bay.
- **Overlays** (one at a time through `useOverlay`): Shift Log (return report), Jump sequence, purchase dialogs (system). The comms slot is not an overlay.
- Settings: the shared `SettingsSheet`, opened from the Menu button on the rail.

### 4.5 Sheets

**Rig sheet** (`src/ui/haul/sheets/RigSheet.tsx`). Header: rock thumbnail, ore chip, "Rock T-3 · R2 · Copper", life bar ("dry in about 2:40 at this rate"), "‹ ›" arrows to step to the previous or next claimed rig without closing the sheet. Body:
- Rig level and drill rate, "Next bit: Deep Bore at L10" with a small drawing of that rig look, one "Upgrade ₵120" button.
- Drones on this route: "3 drones · carries 1.4/s · drill 1.1/s" and a one-line verdict: "Drones are waiting on the drill." / "Ore is piling up." / "Balanced." Drones are moved on the map, not here.
- Reused underneath: kit `Sheet`, `geometricCost`, store actions. No `BuyAmountRow`, no `UpgradeRow`.

**Station sheet**. Three blocks drawn as a station schematic strip, not rows:
- Fleet: "Drones 5/24 · Buy ₵44", "Capacity L3 · 6.3 units · ₵72", "Engines L2 · x1.08 speed · ₵120".
- Freighter: hull art, "L4 · holds 36 · away 8 s · ₵61".
- Systems: the autopilot beacon (dark until bought), policy chips `FULL` / `CONTRACT` under it.

**Contract Board sheet**. Three contract cards side by side (each 110 x 156 at 390 width), drawn as buyer manifests: emblem, buyer name, wanted ores with fill bars and "12 Ice to go", multiplier, launch pips, "+₵420 if met", "ACTIVE" on the selected one. Tap selects. Footer: "Every 4th contract met: Scrap Pod (2/4)".

### 4.6 Spokes and overlays

Each is new; the shared code underneath is named.

**Fitting Bay** (unique system; `src/ui/haul/spokes/FittingBay.tsx`).
- Top 60 %: a top-down schematic of the station (340 x 340 at 390 width, 320 x 320 at 375) with three hexagonal sockets: Rig (upper left), Fleet (upper right), Dock (bottom).
- Bottom 40 %: a horizontal tray of module cartridges (96 x 120), fitted first, then by socket type and rarity.
- Fit: tap a cartridge, its socket glows, tap it (only a module of the socket's type fits). Or tap a socket and the tray filters to its type. Swap and remove are free and instant. Tap a fitted cartridge for its detail: effect line with its current number, "Mk II · UPGRADE · PARTS 3/5" (Decision 43: upgrades cost parts only, no Dark Matter price).
- Opens when the first pod is opened; all three sockets are open from then on.
- Reused underneath: the card engine (`cards.ts`: rarity, copies, levels, `cardEffect`) and store actions; new `src/engine/loadout.ts`. Not reused: `StaffTab`, `CardTile`, `CardSheet`.

**Salvage Bay** (`src/ui/haul/salvage/*`).
- A rack of waiting pods across the top (up to 8 visible, count beyond), counters under it: "Next Scrap Pod: 4/6 rocks · 2/4 contracts · Next Derelict Cache: 1/4 transmissions · Supply drop in 1:12 (2 stored)".
- Opening, one step: tap a pod; laser lines trace its seams and the shell splits (1.2 s); the contents rise with their rarity light: module copies as cartridges sliding into a "To tray" stack, Dark Matter and credits as readouts. "Next" opens the next pod.
- "Manifest odds" opens the odds sheet: a table with the exact numbers from `chestOddsFacts` (unchanged), in this game's layout.
- Reused underneath: `openChest`, `closeChest`, pity, `chestOddsFacts`, the free-chest timer, the overlay manager. Not reused: `ChestOverlay`, `OpeningSlot`, `ChestShelf`, `Portrait`, `ChestOddsSheet`.

**Comms** (missions and daily gift; `src/ui/haul/spokes/Comms.tsx`).
- Pinned at the top: the day shift (Decision 53), "DAY SHIFT · 2 OF 3 LEFT": the first 3 contracts met in a shift pay their bonus twice. There is no daily ladder.
- Below: a radio log with two open channels. Each mission is a transmission: call-sign plate, time stamp ("T+02:14"), the line in a monospaced face, a thin progress bar, reward "3 DM". Done ones show "Acknowledge" (claims; every 4th acknowledgement adds a Derelict Cache). Acknowledged lines fold into the archive below with the story lines.
- Reused underneath: the mission engine in `meta.ts` (new types), `dailyReward`, `claimDaily`. Not reused: `MissionsSheet`, `MissionsButton`, `DailyGift`.

**Trade Post** (store; `src/ui/haul/trade/*`). A docking-terminal screen, one vertical scroll of horizontal bays:
- Readout bar: Dark Matter balance.
- Supplies: Time Warp 2 h (40 DM; `activeRate × 7200`), flare charge (rewarded ad, 3 a day).
- Fuel: Dark Matter in two cell sizes.
- Licences: Clearance, Hangar Expansion, Prospector Charter (once).
- Reused underneath: `src/services/iap.ts`, `ads.ts`, `src/ui/meta/shop/money.ts` (price helpers only, if it has no restaurant text). Not reused: `ShopTab`, `Store`, `Offers`, `DailyShop`, `Boosts`, `ChestShop`, `parts.tsx`.

**Shift Log** (offline report). A strip from the top of the screen, printed at once in the monospaced face:

```
SHIFT LOG · TAMSIN STATION
AWAY        5 h 12 m
IRON        3,420 u
COPPER        610 u
ROCKS DRY        4
PODS             1
IN FLIGHT    ₵220
CREDITS    ₵18.4K
```

Buttons "Collect" and "BOOST +50 % · ad" (Decision 42: the ad adds half, not a double). Reused: `computeOffline`, `fastForward`, the rewarded-ad flow. Not reused: `OfflineModal`.

**Star Map** (`src/ui/haul/spokes/StarMap.tsx`; one name for the spoke and the node map inside it).
- Top: the current galaxy's name and condition, "Galaxy 3 · Seam Storms".
- Middle: the node map, three arms radiating from a central core glyph (Survey 3 nodes, Trade 2, Fleet 3), node rings filled by level, each node with the small station part it adds. Tap a node: a sheet with effect, level, next cost, "Buy · 3 cores". "Cores in hand: 7".
- Bottom panel: "Jump now: +24 cores", kept and reset lists, "Choose next galaxy" (the condition pick: three cards with name, effect lines and a small map preview of which rings it favours). Confirm plays the Jump sequence: stars streak into lines (1.5 s), the station shudders, the new galaxy name types out (1 s).
- Reused: `prestigePointsAvailable`, `engineMode.prestige` (`prestigeHaul(cfg, state, now, traitId)`), story. Not reused: `EmpireTab`, `PrestigeCard`, `VenueJourney`, `VenueChip`, `StorySoFar`.

---

## 5. Meta systems

| Shared system | Used | Content here | Presentation |
|---|---|---|---|
| Collectable cards | yes, as modules | 8 modules, 4 of them rule-changing (5.1) | cartridges fitted into three typed sockets; only fitted ones work |
| Earned reward boxes | yes, as salvage pods | 2 pod tiers (5.2) | Salvage Bay rack and laser-cut opening |
| Missions | yes | radio-log tasks, 2 channels (5.3) | Comms |
| Daily gift | no (Decision 53) | a day-shift bonus on contracts instead: the first 3 contracts met in a shift pay their bonus twice | "DAY SHIFT" line pinned in Comms, "x2 SHIFT" on the strip |
| Offline report | yes | per-ore units, rocks, pods | printed Shift Log |
| Offers and daily shop | no (later) | | |
| Contracts | new | buyer stream with lapsing contracts | strip on the map and Contract Board sheet |
| Fitting Bay (loadout) | new, unique | 3 typed sockets and modules | its own spoke |
| Star Map | new, unique | 8 nodes | its own spoke |

### 5.1 Modules (cards)

`CardSchema` is reused (rarity, level from copies, `cardEffect` table). New `CARD_STATS` keys: `drillRate`, `haulerCapacity`, `haulerSpeed`, `freighterCapacity`, `orePrice`, and the rule stats `overflowSpill`, `metCarryover`, `metReturn`, `contractOreCapacity`. A rule module's value is the parameter of its rule. Values from this game's own `meta.cardEffect` (common 5 + 3 per level %, rare 10 + 5, epic 15 + 6 (tune)); `metReturn` is capped at 50 %. This game uses three rarities (no legendary). `CardSchema.title` holds the module class ("Drill head", "Dock clamp").

| id | Name | Rarity | Socket | Effect | Line |
|---|---|---|---|---|---|
| diamondbit | Diamond Bit | common | Rig | +X % drill rate | "Cuts faster. Wears out never." |
| bayracks | Bay Racks | common | Fleet | +X % drone capacity | "Two more bins per drone." |
| thrusters | Tuned Thrusters | common | Fleet | +X % drone speed | "Same fuel, shorter trips." |
| clamps | Cargo Clamps | common | Dock | +X % freighter capacity | "Holds the manifest steady." |
| chute | Overflow Chute | rare | Rig | **rule:** a full pile spills X % of its rig's drill straight into the hold | "Nothing waits at a full pile." |
| keeper | Contract Keeper | rare | Dock | **rule:** after a met contract, the next warp-out pays +X % on its whole cargo | "Good buyers talk to each other." |
| sorter | Ore Sorter | epic | Fleet | **rule:** drones on routes whose ore the active contract wants carry +X % | "Packs the ore the buyer asked for." |
| quickclamp | Quick Clamp | epic | Dock | **rule:** a launch that meets its contract comes back X % sooner | "Paid in full, cleared at once." |

Each socket type has a stat module and at least one rule module, so the loadout is a choice in every socket, and the right choice changes with the galaxy condition (Long Haul wants speed or the Sorter; Hot Cores wants the Chute).

`src/engine/loadout.ts`: `socketType(i)`, `canFit(cfg, state, i, cardId)`, `equip(cfg, state, i, cardId | null)`, `fittedBonus(cfg, state, stat)`. `economy.cardBonus` calls `fittedBonus` when `cfg.meta.loadout` is set; otherwise it keeps today's behaviour (Pizza unchanged; its card tests are the regression gate).

### 5.2 Salvage pods (reward boxes)

Reuses `meta.chests`, `openChest`, exact odds, pity and `chestOddsFacts`. `chestsForSale` stays false: pods are earned, never sold.

| id | Name | Engine tier | Slots | Contents (weights) |
|---|---|---|---|---|
| scrap | Scrap Pod | wood | 2 | module copies 80, DM 10, credits 10 (`activeRate × 120`); rarity 80/18/2 |
| derelict | Derelict Cache | silver | 3 | module copies 85, DM 15; rarity 62/30/8; pity: epic within 8 caches |

Sources: first ring-2 claim (Scrap, once per game), every 4th contract met (Scrap), every 6th dry rock (Scrap), supply drop every 3 h, stored 3, first after 15 to 45 min (Scrap; the shared `freeChest` timer with this game's numbers), every 4th acknowledged transmission (Derelict), first arrival in each new galaxy (Derelict). No pod from rewarded ads.

### 5.3 Missions (Comms)

New `MISSION_TYPES`: `hauled`, `launches`, `contracts`, `depleted`, `claims`, `seamDrags`; existing `earn`, `levels`, `chests`. All read `GameState.stats` (lifetime). Two channels open at a time, 6 transmissions a day, rewards in Dark Matter (2 to 4).

| id | Type | Text (call sign: line) | Targets |
|---|---|---|---|
| move | hauled | DISPATCH: Move {n} units. Any ore. | 40, 150, 400, 1,000, 2,500, 6,000 |
| ship | launches | OPS-2: Clear the pad {n} times. | 3, 8, 15, 25, 40 |
| close | contracts | DISPATCH: Close {n} contracts. | 1, 3, 6, 10, 16 |
| dry | depleted | TALLY: Work {n} rocks dry. | 2, 5, 10, 18, 30 |
| seam | seamDrags | TALLY: Put {n} drones on rich seams. | 2, 4, 8, 12 |
| claim | claims | DISPATCH: Claim {n} new slots. | 1, 2, 3, 5 |
| earn | earn | OPS-2: Bank {n} seconds of income. | 30, 120, 300, 600, 1,200 (priced with `activeRate`) |
| rigs | levels | TALLY: Add {n} rig levels. | 2, 5, 10, 20, 35 |
| salvage | chests | OPS-2: Open {n} pods. | 1, 2, 4, 6 |

### 5.4 Daily gift, purchases and ads

- Daily gift: none (Decision 53; `economy.daily.gems` is empty, so the shared daily claim is not offered). The day shift takes its place: the first `haul.shift.contracts` = 3 contracts met in each shift pay their bonus x2; a new shift starts when the calendar day has changed and at least 16 hours have passed since the last one started.
- Offers (deals) and the daily shop: not in the first version (later).
- Purchases (`space_` product ids; the kind sequence differs from Pizza's, and validate checks it, section 10.3):

| id | Name | Kind | Price | What it is |
|---|---|---|---|---|
| `space_clearance` | Clearance | `clearance` (new kind: no banners or interstitials, and every ad reward without the ad) | $7.99 | one product instead of a No Ads plus a pass |
| `space_hangar` | Hangar Expansion | `unlock` (new kind; `grants: {droneCap: 6, startDrones: 2}`) | $5.99 | +6 drone cap and 2 idle drones at every run start, for good; a rule, not an income multiplier |
| `space_charter` | Prospector Charter | `starterPack`, once | $2.99 | 150 DM and 5 copies of Ore Sorter |
| `space_dm_150` | Fuel Cell | `gems` | $2.99 | 150 DM |
| `space_dm_700` | Fuel Tank | `gems` | $9.99 | 700 DM |

No permanent income multiplier is sold.
- Rewarded ads, all optional: a flare charge (3 a day, 20 min apart), the Shift Log boost (+50 %, `haul.offline.adBonus`; Decision 42). No banner on the map (banners only at the bottom edge of spokes, above their last row, removed by Clearance). No interstitials in the first version.

### 5.5 The systems only this game has

1. **Fitting Bay**: modules only work when fitted, there are three typed sockets, and half the modules change rules.
2. **Contract Board**: buyers whose contracts lapse after a few launches and pay their multiplier on their own units, so the player re-routes drones toward the ore they want.
3. **Star Map**: the reset currency is spent on nodes that mostly change how runs start and what the rock stream brings, and each one adds a part to the station.

---

## 6. Sound and haptics

### 6.1 Character

- Pack: haul recipes rendered on the existing `SynthPack` instruments (FM glass plucks, sine pings, pulse blips, resonant filter sweeps, a short "station" echo at 110 ms). Key A major / F# minor pentatonic. Radio texture: band-passed noise squelches (300 to 3,000 Hz) on comms events. Mechanical texture: filtered noise for drills and thrusters, low sine thumps for docking.
- **Every key has a haul recipe** in `scripts/audio/recipes_haul.py`, the 10 core keys included, written from the briefs in 6.2. `SynthPack` inherits instruments from `WarmPack` today and its docstring says "Same recipes, different instruments"; for this game no warm recipe is called: `make_sfx.py --recipes haul` fails if a key would fall back to a warm recipe.
- One file per key in the first version (no random sets or ladders).
- Rendering: `python3 scripts/audio/make_sfx.py --pack synth --recipes haul --out games/space-miner/assets/sfx` (the script gains a `--recipes` switch). QA with `scripts/audio/qa.py` (loudness, clipping, length).
- Similarity check: `scripts/audio/compare.py space-miner pizza-empire` computes, for every key both games have, the peak normalised cross-correlation of the onset envelopes (spectral flux, 10 ms hops) and of the 12-bin chroma sequences (numpy FFT folded to pitch classes). It fails when either is above 0.6 (tune after the first render; the threshold and the scores are printed). validate runs it when both packs exist.
- Listening check (10.1 #10): play the purchase, Dark Matter and boost sounds and the music of both games back to back.
- Music `music_main.m4a`: "Slow Orbit", one 60 s loop at 80 BPM (20 bars), F# minor. A wide detuned pad, a sub-bass on roots, a sparse 16th pulse arpeggio from bar 9, a soft noise "radio wash" every 8 bars, no lead melody, no percussion beyond a muted kick on 1. Loudness −20 LUFS integrated. It shares no melody, chord loop or instrument with Pizza's music.

### 6.2 Sound events (catalogue `catalog.haul.ts` plus the core keys)

| Key | Brief | Vol | Min ms | Haptic |
|---|---|---|---|---|
| ui_tap | dry 30 ms pulse blip | 0.45 | 40 | select |
| ui_tab | two-tone sine tick | 0.4 | 60 | select |
| ui_open | short upward filter sweep, 120 ms | 0.45 | | soft |
| ui_close | downward twin of ui_open | 0.35 | | |
| ui_denied | low square double blip, muted | 0.5 | 300 | warning |
| hint | one soft sine ping with echo | 0.35 | 800 | |
| purchase_success | rising FM fifth with a filtered noise latch, 0.8 s | 0.7 | | success |
| gems | Dark Matter: glassy shimmer over a low hum | 0.55 | 150 | |
| boost_start | flare ignition: hiss rising into a bright pop, 0.9 s | 0.65 | | medium |
| music_main | see 6.1 | 0.35 | | |
| route_grab | small magnetic click and hum start | 0.45 | | select |
| route_snap | quick rising blip when the line locks onto a rock | 0.5 | 80 | light |
| route_set | two-note confirm, pulse wave | 0.55 | | rigid |
| route_cancel | falling blip | 0.4 | | |
| hold_tick | soft metallic thunk of ore into the tank | 0.25 | 120 | |
| hold_full | two low sine tones, polite | 0.5 | 4000 | warning |
| launch_arm | latch click when the swipe passes 30 pt | 0.5 | | select |
| launch_charge | rising engine whine, 2.5 s, matched to the climb | 0.65 | | ramp: light, 300, medium, 300, heavy |
| launch_abort | spool-down when the swipe is released short | 0.4 | | |
| warp_out | compressed whoomp plus a bright tail, 0.7 s | 0.8 | | heavy |
| payout | credit chime | 0.7 | | |
| credit_tick | tiny sine tick per falling ₵ glyph | 0.25 | 45 | |
| freighter_land | low thump and hiss | 0.45 | | soft |
| contract_new | radio squelch plus a three-note teletype | 0.5 | | |
| contract_select | a pulse double tick | 0.45 | | select |
| contract_met | stamp: noise burst plus a major-sixth FM stab | 0.75 | | success |
| contract_lapse | short burn-out crackle | 0.35 | 500 | |
| rock_dry | descending creak, filtered noise | 0.4 | 500 | |
| rock_crumble | granular break, 0.6 s | 0.55 | 200 | medium |
| rock_arrive | doppler swoosh ending in a soft bump | 0.4 | 300 | |
| bonanza | bright double ping over the arrival | 0.55 | | light |
| vein_start | gold shimmer rising, 1 s | 0.6 | | light |
| vein_end | shimmer fading down | 0.35 | | |
| flare_launch | canister thump and a trail hiss | 0.6 | | medium |
| rig_upgrade | ratchet click plus a rising blip; pleasant on repeat | 0.55 | 50 | medium |
| rig_tier | drill rev-up plus a chord (new bit) | 0.7 | | success |
| claim_slot | beacon ping, twice | 0.6 | | medium |
| drone_buy | bay door, servo, puff | 0.55 | | medium |
| fleet_upgrade | servo sweep for capacity, engines and freighter | 0.55 | 50 | medium |
| freighter_tier | bigger servo plus a low horn | 0.7 | | success |
| system_online | power-up: three ascending hums and a click | 0.7 | | success |
| module_fit | cartridge seat: slide and latch | 0.55 | | rigid |
| module_remove | latch release | 0.4 | | light |
| module_levelup | rising FM arpeggio | 0.65 | | success |
| pod_arrive | short retro-burn | 0.55 | | medium |
| salvage_cut | laser hiss and a split, 1.2 s | 0.55 | | light, 200, light |
| salvage_common / salvage_rare / salvage_epic | reveal tones, longer and brighter per rarity (0.3 to 1.2 s) | 0.6 to 0.8 | | light / medium / success |
| comms_in | radio squelch open plus a short carrier tone | 0.45 | 1500 | |
| comms_ack | squelch close | 0.4 | | select |
| shift_log | one teleprinter burst when the log prints | 0.35 | | |
| daily_relay | allotment received: carrier chord | 0.6 | | success |
| starmap_node | node lights: crystalline ping and hum | 0.6 | | medium |
| trait_pick | selection chord | 0.55 | | select |
| jump_warp | the long jump: 2.5 s rising, cut, tail | 0.85 | | heavy, 400, heavy |

Total: 56 keys (10 core, 46 haul), 56 files, all in `src/services/fx/catalog.haul.ts` (Decision 6). `src/services/fx/haulTable.test.ts` fails if a key has no file in `games/space-miner/assets/sfx` or differs from `scripts/audio/recipes_haul.py`, or if any file of this game hashes equal to a Pizza file. The haptic column above is superseded where Decision 6 says so.

### 6.3 Haptics rule

The phone vibrates for what the finger just did and for big moments only: route snaps and sets, the launch ramp, the warp-out, contract met, flares, purchases, fits. Never for passive events (hold ticks, drone movements, credit ticks, rock arrivals). The existing limiter and the haptics setting apply.

---

## 7. Content plan

### 7.1 Names

- App and store title: **Orbit Haulers**. Home-screen name: "Orbit Haulers" (13 characters).
- Station: Tamsin Station. Player's outfit: Tamsin Haulage. Station AI: TALLY. Rocks are named by slot: T-1 to T-12.
- Currencies: Credits (₵, `currencyName` "Credits"), Dark Matter (DM, premium), Warp Cores (reset).
- Words: the freighter **warps out** with every payout (event `warp`, receipt "WARPED · MANIFEST ..."); **Jump** is only the galaxy reset; **Star Map** is the spoke and its node map.
- Strings in `game.json`: `prestigeName` "Warp Cores", `prestigeVerb` "Jump", `prestigeDescription` "Jump to a new galaxy. Spend Warp Cores on the Star Map. Pick the galaxy's conditions." No `managerTab`, `upgradeTab` or `tapHint`.
- Galaxy names: Cygnus Drift, Halden Reach, Morrow Belt, Tessaly Gap, Corvo Expanse, Brightwater Ring, Kade's Shelf, Oriel Spur, Vantor Deep, Selk Cluster, Ambry Field, Nolan Verge (then "II", "III").
- Buyers: Halden Yards, Corvo Metals, Tessaly Ice Co., Brightwater Foundry, Kade Refinery, Oriel Labs.
- Every noun the screens use comes from a `haul.names` block (station, AI, drone, freighter, rig, pod, hold, flare, contract, buyer, galaxy), so a later game on this archetype can rename everything in data.

### 7.2 Things to buy and their roles

| Thing | Role | Limit |
|---|---|---|
| Rig level (per slot) | raises the drill of one route; tiers change the rig's rule and look | none |
| Claim slot | a new route, new ore, longer distance | 12 |
| Drone | more haul on a route of your choice (placed by hand) | 24 + 4 per galaxy (+6 with Hangar Expansion) |
| Drone capacity | more haul on every route | none |
| Drone engines | shorter trips, most value on far rings | speed x4 |
| Freighter | bigger batches, away time, a hull or segment every 25 levels | none |
| Dock Autopilot | earns offline, launches by policy | 1 |
| Module fit | loadout | 3 sockets |
| Star Map node | permanent choice across runs, a station part | per node |

### 7.3 The cast (no cartoon-people rig)

| Call sign | Who | Portrait (`mach:`) | Voice |
|---|---|---|---|
| TALLY | the station AI | hex aperture glyph, cyan, 3 segments turn while it speaks | precise, flat, a little wry |
| OPS-2 | Teller, the dock controller (human) | call-sign plate "OPS-2" with a waveform, amber | clipped, procedural |
| DISPATCH | Ines Aro, contracts and tasks (human) | call-sign plate "DISPATCH", green | businesslike |
| Buyers | six companies | geometric emblems | one line each when a contract arrives or closes |

The portraits are drawn in `src/ui/haul/art/portraits.tsx`, cached through the `GameIcon` registry. No faces, no bodies.

### 7.4 Story beats (comms slot; new triggers `launches`, `ring`, `contracts`, `system`, `galaxy` added to the story trigger schema; all read lifetime stats)

| # | Trigger | Who | Line |
|---|---|---|---|
| 1 | start | TALLY | "Drone T-1 idle. Send it to the rock." |
| 2 | 1st launch | OPS-2 | "Freighter away. Credits in. That is the job." |
| 3 | contracts unlocked | DISPATCH | "Buyers are calling. Their contracts go on the strip." |
| 4 | Dock Autopilot online | OPS-2 | "Autopilot has the pad. It ships the way you set it." |
| 5 | ring 2 claimed | DISPATCH | "Copper buyers on the board. Ring 2 is in range." |
| 6 | ring 3 claimed | TALLY | "Frost Line. Ice sells. Bring capacity." |
| 7 | ring 5 claimed | DISPATCH | "Pale Edge. Platinum. Halden says they will take all of it." |
| 8 | first Jump available | TALLY | "Long-range scan done. Three galaxies in reach. Your call." |
| 9 | arrival in galaxy index 1 | OPS-2 | "New sky, same pad. Station is yours." |

### 7.5 Voice

Label `dry-radio-chatter`. Rules: present tense, short clauses, call signs, numbers as numerals in the UI and spelled out in spoken lines, no exclamation marks, no puns or food words, no "you're amazing", never more than 2 lines on screen at once. Interface labels are plain ("Upgrade", "Back", "Settings").

Ten example lines:
1. TALLY: "T-1 is dry. Next rock in six seconds. Your drones will wait."
2. OPS-2: "Hold at capacity. Drones are stacking in a holding pattern."
3. Receipt: "WARPED · MANIFEST 48 COPPER · 12 IRON · CONTRACT MET · ₵612"
4. Halden Yards: "Halden Yards, buying iron. Forty units. We pay one-point-four."
5. TALLY: "Gold on T-3. Rich seam, forty seconds. Worth pulling a few drones."
6. OPS-2: "Autopilot policy: ship when the contract is met. Copy."
7. Corvo Metals: "Corvo Metals. Contract closed. Pleasure."
8. TALLY: "T-4 is copper now."
9. Shift Log: "AWAY 6 h 00 m · 3,420 IRON · 4 ROCKS DRY · 1 POD"
10. DISPATCH: "Tessaly contract lapsed. Two left on the board."

### 7.6 Store page (written from scratch)

- Title (both stores): **Orbit Haulers**
- Apple subtitle (30 max): **Space mining by drone routes** (28; Decision 54: the genre words without the order of another developer's "Idle Miner" title).
- Google short description (80 max): "An asteroid field, a hold of ore, and a freighter waiting for your swipe." (73; Decision 54: not the first game's "verb, verb and grow X").
- Keywords (Apple field, 100 max, comma-separated, no words that are already in the title or subtitle, no "miner"; also `store.keywords`): idle, tycoon, asteroid, freighter, cargo, logistics, station, galaxy, rocket, sci-fi, fleet, manager (89 characters). Shared with Pizza's keywords: idle, tycoon. Jaccard 0.10 (target < 0.3).
- Categories: Apple Games > Strategy (primary), Simulation (secondary). Google: Strategy.
- Promotional text (170 max): "Drag drones onto asteroids, pick which buyer contracts to fill, and grow one mining station into a fleet that keeps shipping while you are away." (144)
- Description:

  > Orbit Haulers is an idle mining game about routes and cargo.
  >
  > Your station sits in an asteroid field. Drag hauler drones onto rocks to set their routes, and watch them carry ore home to the hold. When the hold is full, swipe the freighter off the pad: it warps out and the whole manifest sells at once.
  >
  > Buyers post contracts for the ores they want: so many units within a few launches. Take one, send drones to the rocks that carry its ore, and when the last units arrive the buyer pays its rate on all of them.
  >
  > Rocks run dry and new ones drift in, sometimes with a different ore, sometimes as a rich bonanza rock. The far rings hold copper, ice, titanium and platinum, but the trips are longer, so where you send each drone matters.
  >
  > Bring the dock autopilot online and the station ships on its own while you are away. Fit modules into three sockets in the Fitting Bay; some of them change the rules. When a run has paid off, jump to a new galaxy, spend Warp Cores on the Star Map, and choose the conditions you will mine under next.
  >
  > Features
  > - Drag-to-route drones on a top-down map of the asteroid field
  > - One-swipe freighter launches and buyer contracts delivered over several launches
  > - Rocks that run dry and come back as new ore
  > - A dock autopilot that keeps shipping offline
  > - Fitting Bay modules and a Star Map that changes how each run starts
  > - Optional rewarded ads; salvage pods are earned in play, never sold
- Release notes (first version): "First release. Tamsin Station is open."
- Icon (1024 x 1024, no text): a freighter in three-quarter top view climbing out of a curved route arc in iron orange toward a cyan warp flash, on near-black navy with two small asteroids at lower left. Pizza's icon template is not reused.
- Screenshots (6, 1290 x 2796 and 1242 x 2208, plus Google 1080 x 1920): own template: the game frame full-bleed, a caption at the top left in the game's monospaced radio face, ore-orange underline, no device frame, no character.
  1. The full map mid-game: "Route drones to the rocks that pay."
  2. A drag in progress with the snap line: "Drag to set a route."
  3. The freighter warp flash and manifest receipt: "One swipe ships the whole hold."
  4. Contract Board: "Pick a contract. Route for its ore."
  5. Fitting Bay: "Fit modules. Some change the rules."
  6. Star Map with the condition pick: "Jump galaxies. Choose the conditions."
- Preview video: optional, 20 s, recorded from the game (map, drag, launch, contract, Fitting Bay).
- App Review notes (`games/space-miner/store/REVIEW-NOTES.md`): "Built by our studio on our own engine. Our other game, Pizza Empire, is a restaurant sim where you tap stations and guests pay. Orbit Haulers is a different game: 1. You drag drones onto asteroids to set routes; rocks run dry and are replaced, and you re-route for contracts, rich seams and bonanza rocks all game. 2. Money arrives only when the freighter launches, and the buyer contract you picked multiplies the units it asked for. 3. Modules work only when fitted into three typed sockets in the Fitting Bay, and the reset is spent on a Star Map of rule-changing nodes. Tap path: open the app, follow the reticle: drag the drone onto the rock, then swipe up in the bay (about 30 s). Fitting Bay: the third button on the bottom rail (three hexagons), open once the pod from the first ring-2 claim is opened (about 3 to 5 min)."
- Bundle ids: `com.example.orbithaulers` until the owner gives the studio's domain (store-1); only the prefix changes then, and `validate --release` refuses `example`. `app.slug` is `orbit-haulers`.
- Privacy policy: `store.privacyPolicyUrl` holds the placeholder `https://example.com/privacy` until the owner gives the real page; `validate` warns, `validate --release` fails (play-13, store-0).
- Tracking permission (iOS): `app.trackingText`, this game's own sentence (Decision 55).

---

## 8. Balance targets for the bot

`scripts/content/build-space.py` writes the whole of `games/space-miner/game.json`, the `haul` block included (Decision 12; `npm run content:space`) and, with `--table`, prints the worked tables of section 2.12. `scripts/content/haul-bot.ts` plus a haul branch in `scripts/simulate.ts` run the game through the pure engine and count gestures.

Bot behaviour: places every idle drone at once on the slot with the highest marginal value `[min(r_i, (n_i + 1) c_i / trip_i) − min(r_i, n_i c_i / trip_i)] × p_ore` (a good player); drags 2 drones onto each rich seam and 1 onto each bonanza rock; picks the contract with the highest `contractGain` whose units the hold carries once it routes for it (the routed share of section 2.6), then, while it is active, drags drones from the routes that lose least onto rocks of its ores until the share as routed covers the units with 5 % to spare, at most `fleetShare` of the fleet per contract (Decision 32; the old "up to 2 drones" could not move a 40-drone station's share); launches by hand when the hold is full or the contract is met until the autopilot is online, then uses `contract`; uses the free flare charge on the best rock; buys the option with the best payback (Δ `activeRate` / cost), and from 2:00 saves for the autopilot; at a Jump spends cores by a fixed priority (Preload, Assay to 5, Afterburner, Seed Credits, then Prospect Survey and the cheapest capped node) and picks the condition with the highest `activeRate` at the new run's start. It counts every gesture: drags and flicks, tap-taps, swipes, Upgrade taps (rig, fleet, freighter, claims), contract picks, sheet opens.

Bot behaviour with Decision 40 (overrides the contract part above): with none taken, it takes the offer with the highest bonus that it can deliver in `haul.contracts.launches` launches once it routes for it (routed share per launch × launches ≥ units, 5 % to spare), then routes until every wanted ore is on pace with 15 % to spare (one launch's share as routed × launches left ≥ units left), at most `fleetShare` of the fleet per contract, and never drops a taken contract; it swipes by hand when the hold is full or holds everything the contract still needs. The passive player takes the best-paying offer and never routes for it. The watching player (Decision 42) only watches: autopilot on `full`, nothing bought, placed or routed, no contract taken.

Bot behaviour in the finishing round (Decisions 56, 57, 62; overrides the two paragraphs above where they differ): the shop is `src/engine/haul/advice.ts` (the same estimate the limit hints use). With no contract taken it takes the offer with the highest bonus whose wanted ores all have a route; at the take and after every warp-out, while the contract's light is not green, it makes the move that raises the contract's pace most (an idle drone onto a rock of the short ore, a drone from another ore's route onto it, or a rig level on it when affordable; between moves that reach the pace, the one that keeps the most income), with no fleet budget (Decision 63: this is the rules engineer's router; it also routes every 20 s between warp-outs while the light is not green, and seams and claims never take drones from the routes of an ore the contract still wants); new drones go to the short ore; when the contract ends it moves the drones back where they were at the take. It runs the day shift once a minute. The player who never takes a contract (`noContracts`) is the same bot with the autopilot on `full`.

Targets (bot time; humans are about 25 % slower). `npm run simulate -- space-miner --hours 12 --prestige [--seed n] [--compare true]` reports them; validate runs seeds 12345, 4, 99, 7 and 2026 in parallel and fails on a hard target missed on any of them, and when pods or Dark Matter per hour miss their window on more than one seed (Decisions 45 and 62). The first Jump's hard window is 1 h 55 to 3 h 05 on every seed; 2 h 15 to 2 h 45 is the target for the median seed, and validate warns when the median seed misses it or when the router's earnings against the never-taker's miss 1.25 to 1.6 at the median seed or reach 1.9 on any seed (Decision 63, overriding Decision 62's window). Decision 64 sets the nothing-new gate to what this version is (hard: 26 minutes before the first Jump, 10 in the first 30, 50 after it, 60 between two things drawn new); the old figures stay as soft rows and validate lists each seed that misses them.

| Measure | Target | Hard? |
|---|---|---|
| First payout | ≤ 0:35 | yes |
| Dock Autopilot | ≤ 3:30 | yes |
| Contracts unlock | 1:30 to 2:00 | no |
| First ring-2 slot | 5:00 to 8:00 | no |
| First ring-3 slot | 15:00 to 22:00 | no |
| First ring-4 slot | 40 to 55 min | no |
| First ring-5 slot | 1 h 30 to 1 h 55 | no |
| All 12 slots claimed | 1 h 50 to 2 h 20 | no |
| First Jump available (cores ≥ 20), every gate seed | 1 h 55 to 3 h 05 (Decision 63) | yes |
| First Jump available, the median of the five gate seeds | 2 h 15 to 2 h 45 (Decision 63) | no |
| Run 2 reaches run 1's Jump earnings | ≤ 70 % of run 1's time (Decision 63) | yes |
| Run 2 reaches run 1's Jump earnings (aim) | ≤ 60 % of run 1's time | no |
| Run 3 reaches run 2's Jump earnings | ≤ 70 % of run 2's time | no |
| Drags (drag, flick or tap-tap that assigns or moves a drone) per 10 min of active play, measured at minutes 30, 60 and 120 | ≥ 4 at each | yes |
| Upgrade taps as a share of all gestures, every 10 min window after minute 10 | ≤ 60 % | yes |
| Longest stretch with nothing new (an unlock, claim, new ore, system, socket, pod, rig tier, freighter hull or segment), up to the first Jump | ≤ 26 min, and ≤ 10 min in the first 30 min (Decision 64) | yes |
| The same, the old figures (listed as missed: the thin second hour, section 9.3) | ≤ 12 min, and ≤ 6 min in the first 30 min | no |
| Something new drawn on the map (a new ore on a rock, a bonanza rock, a claimed slot, a rig look, a freighter hull or segment, a station part, a drone-cap rise) | at least once per 60 min of play, through galaxy index 2 (Decision 64) | yes |
| The same, the old figure | at least once per 30 min | no |
| Longest stretch with nothing new after the first Jump (12 h run) | ≤ 50 min (Decision 64) | yes |
| The same, the old figure | ≤ 25 min | no |
| Share of route-minutes bound by one limit (drill, haul or freighter) | no kind above 60 % | yes |
| Share of taken contracts that are met, for the bot that routes for them (Decision 40; replaces "payouts with a met contract") | 60 to 85 % | no |
| Share of taken contracts that are met for a player who takes contracts but never moves a drone for one (`passive`, first 2.5 h) | ≤ 25 % | no |
| Contract bonus as a share of run income | report; aim 10 to 25 % | no |
| Run earnings over the first 2.5 h of the bot that routes for contracts, against the same bot that never takes one (Decisions 56 and 63: the outcome, not the bonus share) | 1.25 to 1.6 times at the median seed, under 1.9 on every seed | no |
| The hint path's first ring-2 claim (`runTutorialHuman`, Decision 57) | 3:45 to 6:00 | no |
| Average launch fill | 70 to 95 % | no |
| An hour away WITH the Shift Log ad bonus (`haul.offline.adBonus`) vs an hour of active play (the bot that buys and routes) from the same state, at every measurement (minutes 30, 60, 120, then every 2 h) | ≤ 0.60 (Decision 42) | yes |
| The same vs an hour of only watching (autopilot on `full`, nothing bought, routed or taken) | ≤ 0.90 on every seed at every sample (Decisions 42 and 64; `efficiencyCap` lowered to hold it) | yes |
| Pods per hour in hours 1 to 3 (each hour) | 3 to 10 (rules-3, Decision 45; the pod economy of 5.2 was set for about 4 to 6 an hour) | no |
| Dark Matter per hour from those pods (expected value of their gem slots) | 2 to 8 | no |
| Longest wait between two purchases in the first 5 minutes (from the first payout) | about 30 s (play-18) | no |
| Rocks dried per hour of play at minute 30 | 8 to 20 | no |

Knobs, in order: if the drill binds more than 60 %, build-haul.py lowers rig cost growth; if haul binds, it raises capacity growth; if the freighter binds, it lowers freighter cost growth. The claim-cost ring factor is the first knob for dead stretches. If drags fall below 4 per 10 min, it shortens contract lifetimes (to 4) and seam intervals before anything else. If Upgrade taps pass 60 %, it raises rig and fleet cost growth together with their per-level effect (fewer, bigger levels). If run 2 misses 60 %, it raises the Afterburner head start and the bonanza effect, never a flat node's cap.

**Measured at integration (shipped game.json, Decision 32's contracts, 12 h with Jumps).** Seed 12345: every hard target met: first payout 0:21, autopilot 2:11, first Jump 2 h 27, run 2 at 43 % of run 1, drags 51 / 101 / 26, Upgrade share at most 41 %, longest dead stretch 10:16 (2:40 in the first 30 min), 8:59 after the Jump, drawn-new gap 9:10, limits drill 51 % / haul 48 % / freighter 1 %, offline at most 0.41 of an hour of play. Contracts met on 55 % of payouts; the passive player meets 12 %. Seeds 1 to 7 (same knobs): every hard target met on 6 of 7; seed 4 misses only the offline gate, at 0.45 (rounded; just over) at hour 10. Over the 8 seeds: Jump 2 h 18 to 2 h 38, run 2 at 23 to 63 % (the heaviest seeds 61 and 63 %, so the 60 % target is missed on two seeds and the 65 % gate holds), met contracts 55 to 62 % (passive player 10 to 14 % on the 8 seeds of the first knob set; 12 % with the shipped one on seed 12345). Soft targets missed: first ring-2 slot 3:39 to 3:58 (target 5:00 to 8:00), first ring-3 slot 13 to 30 min (15 to 22; met on 2 seeds), first ring-4 slot 27 to 48 min (40 to 55; met on 2 seeds), run 3 at 32 to 131 % of run 2 (70 %; met on 3 seeds), rocks dried 18 to 42 per hour at minute 30 (8 to 20; met on 1 seed). Offline against an hour of play without buying (not a gate, printed by the bot) reaches 0.92 on seed 12345: the bot that does not buy still routes for contracts and launches part-filled holds under the `contract` policy, so that hour is a poor player's hour; fastForward itself matches an untouched hour of play within 10 % (haul.offline.test.ts). With the claim ring factor at its floor (15) the ring-2 and ring-3 timings pull against each other: a higher claim base moves ring 2 later and ring 3 further out of its window. Knob table: `python3 scripts/content/build-space.py --table`.

**Measured in the fix round (shipped game.json, Decisions 40 to 45, 12 h with Jumps, seeds 12345 / 4 / 99, the seeds validate gates on).** Every hard target is met on all three seeds: first payout 0:26, autopilot 2:03, first Jump 2 h 31 / 2 h 18 / 2 h 39, run 2 at 39 / 42 / 42 % of run 1, drags at minutes 30, 60, 120 at least 9, Upgrade share at most 52 %, longest dead stretch to the Jump 9:37 / 9:16 / 9:34 (4:51 / 5:41 / 4:58 in the first 30 min), after the Jump at most 15:26, drawn-new gap at most 12:49, limits drill 52 to 55 % / haul 43 to 47 % / freighter 1 to 2 %, offline with the +50 % bonus at most 0.40 of an hour of play and at most 0.83 of an hour of watching (0.6 and 0.9 are the gates; without the bonus at most 0.27). The bot now counts the supply drop (5.2's free timer: 15 min, then 45 min later, then every 3 h) as the pod it is. Soft results: taken contracts met 99 / 98 / 96 % by the bot that routes (target 60 to 85 %: missed, because Decision 40 makes every contract reachable and the bot routes perfectly; a person routes less well), 29 / 19 / 24 % by the passive player (≤ 25 %: met on two seeds), contract bonus 22 / 22 / 19 % of income (aim 10 to 25 %), pods in hours 1 to 3: 9 to 11 an hour (3 to 10: just over on two hours), Dark Matter from them 6.3 to 7.7 an hour, longest wait between purchases in the first 5 minutes 0:26 / 0:27 / 0:38, rocks dried at minute 30: 18 / 36 / 54 an hour (8 to 20), first ring-2 slot 2:28 to 3:39 (5:00 to 8:00: early on purpose, play-18 asked for a cheaper first ring-2 claim), ring 3 at 10:00 to 21:03, ring 4 at 33 to 36 min, ring 5 at 1 h 09 to 1 h 13 (all early), run 3 at 96 to 125 % of run 2 (70 %). Why the ore share moved: at the threshold before the last (5.5e7), nine seeds (12345, 4, 99, 1, 2, 3, 5, 6, 7) with a ring's own ore at 70 % of its stream put the first Jump between 1 h 47 and 2 h 36 (49 minutes; the ore lottery on rings 4 and 5 decided it), and five seeds (4, 99, 12345, 5, 3) at 85 % between 1 h 45 and 2 h 10 (25 minutes), which is what lets one threshold put the three gated seeds in the 30-minute window. Seeds other than 12345, 4 and 99 are not checked at the shipped threshold.

**Measured in the last balance round (Decision 63, the shipped numbers):** section 11, "Numbers of the last balance round": first Jump 2 h 22 to 2 h 47 on the five gate seeds (median 2 h 33), the router meeting 66 to 78 % of its contracts and earning 1.57 times the never-taker at the median seed; the gate still fails on the nothing-new stretches, the drawn-new gap and one offline measurement.

---

## 9. First version and later

### 9.1 In the first version

- P0: generated mode entry and engine install, both bundle checks, shell decoupling (HintOverlay registration, overlays state, Celebration, GameIcon registry, catalog and artIcons split, motion and bonusGate moves), the sfx move with its hash fixture, schema changes (`bonusPerPoint ≥ 0`, optional businesses for haul, IAP kinds).
- The haul engine (`haul.ts`, `haulMode.ts`, `loadout.ts`) with tests: 5 rings, 12 slots, 5 ores, rock stream with bonanza rocks, rig tiers, hold sharing, freighter with policies `full` and `contract`, contracts with lifetimes and the units-only multiplier, rich seams with returning guests, the Survey Flare, offline with the per-rock fastForward.
- Lifetime stats, missions (Comms with 2 channels), daily relay, 2 pod tiers with the new cadences, Fitting Bay with 3 typed sockets and 8 modules (4 rule-changing), Star Map with 8 nodes and 6 conditions, Jump.
- Scene: one atlas frame loop, gestures on the responder system, drag, flick and tap-tap, the rack, the bay with the dock counter, the rail.
- Art: station with its 8 parts, rigs (5 looks), one rock shape set tinted per ore, one drone look, freighter (4 hulls plus segments), the reticle pointer, portraits, icons.
- Sheets (Rig, Station, Contract Board), spokes (Fitting Bay, Salvage Bay, Comms, Trade Post, Star Map), Shift Log, the 6-step hint script and the post-tutorial hint rules.
- Sound: 56 keys from haul recipes, one 60 s music loop, the similarity check.
- New store page, icon brief, screenshot captions, review notes, `space_` products, fingerprint tooling with PENDING handling.

Staffing (8 engineers, about 3 h each, then a review round):

| Engineer | Package | Files |
|---|---|---|
| 1 | P0 bundle and engine install (the first 90 min; the gate), then fingerprint and bundle-check tooling | `scripts/lib/games.js`, `src/modes/*`, `src/engine/modes.ts`, `simMode.ts`, `simMeta.ts`, `classicMode.ts`, `testing/dispatch.ts`, `vitest.setup.ts`, `src/ui/App.tsx`, `HintOverlay`, `targets.ts`, `overlays.ts`, `GameIcon`, catalog and artIcons splits, `motion.ts`, `bonusGate.ts`, `move-shared.js` with its fixture; then `scripts/lib/fingerprint.ts`, `scripts/bundle-check.ts` |
| 2 | Engine kernel | `src/config/schema.haul.ts` (frozen at minute 30), `src/engine/types.ts`, `haul.ts` (tick, rock stream, seams, flare, payout), `haul.test.ts`, fixture `src/engine/fixtures/haul.json` |
| 3 | Offline, contracts, bot and numbers | `haul.ts` (`contractAt`, `contractGain`, `activeRate`, `steadyRate`, `fastForward`), `haulMode.ts` offline and prestige, `build-haul.py`, `haul-bot.ts`, `simulate.ts` branch |
| 4 | Integration and meta engine | `economy.ts` delegation, `meta.ts` mission types and stats, `loadout.ts` (+ test), Star Map and Jump, `src/state/store.ts` actions, story triggers, IAP kinds in `iap.ts` |
| 5 | Scene and touch | `src/ui/haul/layout.ts` (+ test), `src/ui/haul/scene/*` (atlas frame loop), `src/ui/haul/gestures/*` |
| 6 | Machine art | `src/ui/haul/art/*` (station and parts, rigs, rocks, drone, freighter, reticle, portraits, icons), `HaulGallery.tsx` |
| 7 | Home shell, bay and sheets | `HomeHaul.tsx`, `hud/*` with `bayMetrics.ts` (+ test), Rig, Station and Contract Board sheets, comms slot, `hints.ts` |
| 8 | Spokes, sound and words | Fitting Bay, Salvage Bay, Comms, Trade Post, Star Map, Shift Log; `recipes_haul.py`, `make_sfx.py --recipes`, `compare.py`, music; `game.json` strings and store files |

The schema and the fixture are frozen at minute 30, and the UI packages code against the fixture. Engineer 8 carries the most; if the review round runs short, the first items to slip are listed at the top of 9.3.

### 9.2 Cut from the game for good (they matched Pizza or worked against the verb)

Rock tapping and its limiter, the comet bonus, the tap combo, hold-to-repeat and "to next milestone" buy buttons, a fleet router that places drones, an income multiplier for sale, a rewarded-ad pod, the 7-day gift ladder, x2 milestones at 10/25/50/100, the restaurant glove pointer, the Character-rig cast.

### 9.3 Later

First to slip if time runs out: the flare's ad charges (keep the free charge), the station parts beyond the first four, the freighter segments past the 4 hulls.

First, before anything else below (Decision 64): **the thin second hour.** In this version every slot is claimed by about 1 h to 2 h of a run and nothing new is drawn between rig tier 20 and tier 35, so the last hour before the first Jump (and the hours after it) offers only rig and freighter levels: the gate allows 26 minutes with nothing new before the first Jump, 50 after it and 60 between two new things on the map, where the design asked for 12, 25 and 30. More late milestones close it: a rig tier or a freighter hull between levels 20 and 35, station parts that arrive with the late rings, later and dearer claims (far slots that open with ring 5's ore), so that something new comes at least every 12 minutes again.

Then: the Tractor Sweep (a one-tap sweep of the fullest ring) and its Charge Coils node; ring 6 (crystal) and more rings with `galaxyMin`; conditions that change the map's shape (a denser near belt, a far ring with 3 slots, a drifting comet slot), appended as slots 12 and up; offers with real timers, the incoming-transmission banner and the daily shop; a published Field Odds sheet for rocks, seams and contracts; sockets 4 to 6, a legendary module and 4 more modules; a third pod tier (Ancient Vault); a galaxy log band in the Star Map; a rival combine on the radio; drone looks by capacity tier; a second freighter pad (Extra Pad) and +1 slot nodes (Deep Survey) for the Star Map; scrapping a contract; moving ore prices; route curves; random sound sets and a longer music track; scan-binary for release builds (required before the first store submission, not for the first playable build); pinch zoom; leaderboards.

---

## 10. Acceptance checks

### 10.1 What anyone can see in the preview (web, `GAME=space-miner`)

1. On launch: a top-down field with the station at the bottom of the field, rings fanning upward, one iron rock with a rig, a drone on the rack, the freighter on its pad in the bay, the hold tank, the dock counter and the launch chevrons. No header bar, no tab bar, no list of rows, no room in side view, no people, no glove.
2. The reticle shows the drag; dragging the drone onto the rock draws a snap line, the drone flies the route and the hold fills. A flick toward a rock and a tap on the drone then the rock do the same.
3. Swiping up in the bay launches the freighter; money appears only at the warp-out, with a "WARPED" receipt on the bay ticker. The counter and the ticker never overlap at 390 and 375 widths and at the largest text size.
4. Contracts appear after the 4th launch and 1:30; a met contract stamps the receipt and asks for a new pick; a contract lapses after 6 launches.
5. A rock runs dry, crumbles and is replaced; its drones resume on the new rock. A rich seam shows its guide; drones dragged onto it return when it ends.
6. The Salvage Bay cuts a pod open; the Fitting Bay shows a station schematic with three typed sockets; Comms shows a radio log and the dish relay; the Trade Post is a docking terminal; the Star Map shows the nodes and three condition cards.
7. Closing the app for 10 minutes after the autopilot is online and reopening shows the Shift Log.
8. Buying a Star Map node adds its part to the station drawing after the next Jump.
9. The person checking plays both apps side by side for 10 minutes each, then compares in particular the Fitting Bay with Pizza's card screen and the Salvage Bay with Pizza's chest opening, and only then fills in `fingerprint.human` with their name and date.
10. Listening check: the purchase, Dark Matter and boost sounds and the music of both games, played back to back, are not heard as the same tunes.

### 10.2 Tests that must exist (vitest)

`src/engine/haul.test.ts`:
1. Determinism: the same config, state and dt sequence give a bit-identical state; 600 s in 0.1 s steps and in 1 s steps differ by under 0.5 % in cash and units hauled.
2. Conservation: drilled (including the Overflow Chute's spill) = piles + hold + shipped, within 1e-9 relative, at every step.
3. Caps and robustness: piles ≤ cap (except the post-seam drain), hold ≤ F, no negatives; no NaN with values near 1e300 or with dt of 0, negative, NaN or Infinity. "Full" uses `≥ F − 1e-9`.
4. Rock stream: `rockAt(seed, slot, n)` does not depend on player actions; a rock crumbles exactly when life and pile are 0; respawn takes 6 s; drones stay on the slot; the bonanza share over 100,000 rocks matches its formula within 0.5 points.
5. Contracts: always meetable from claimed rings; contract 0 is fixed at `min(10, F)`; the met rule; M' applies only to the contract's units and the fee only to the rest when met; the full bonus only when cargo ≥ F − 1e-9; lifetimes count every warp-out; a lapsed active contract leaves `active = null`; a pod at every 4th lifetime contract met; `contractGain` equals the difference of two payouts.
6. Rates vs simulation: with the autopilot `full`, contracts off, no seams, the mean over 20 seeds of 30 min of ticks is within 5 % of `activeRate × 1800`; `steadyRate` is 0 without the autopilot and `activeRate` is not.
7. fastForward: for 20 seeds, matches a 2 h simulation (efficiency 1, contracts and seams off) within 1 dried rock per slot and 5 % in credits; ends on the same rock index per slot; a climbing freighter's payout is added once; `clock` is unchanged.
8. Hold sharing: with the hold nearly full, the free space splits in proportion to the routes' demand.
9. Rich seam and flare: first at `360 × T(interval)`, intervals within the stated range, only on claimed slots with a rock, guests return when it ends, a flare does not move the natural schedule.
10. Jump: haul state resets, Star Map, loadout and lifetime stats kept, `bonusPerPoint` 0 means cores add no income, offers are the same before and after a reload and match the preview, two consecutive Jumps offer different triples for at least 80 % of 1,000 seeds, a Derelict Cache once per galaxy index.
11. Star Map: costs per formula, caps respected (assay and brokerseat stop at 5), cannot overspend, Afterburner never exceeds `bestClaimed`.
12. Missions after a Jump: an open mission's progress never drops (lifetime stats).
13. First session: the bot reaches its first payout by 35 s and the autopilot by 3:30.

`src/engine/loadout.test.ts`: only fitted modules apply; a module fits only its socket type; each rule module changes its rule by its value; Pizza's `cardBonus` results are unchanged (existing tests pass).

`src/config/schema.test.ts` (added cases): `bonusPerPoint` 0 is accepted; a haul game with a non-zero value fails lint; a haul game without businesses passes; a sim game without businesses fails.

`src/ui/haul/layout.test.ts`: ring radii and slot positions at 390 x 844 and 375 x 667, with and without Long Haul; no rock's drawn circle overlaps the strip, the comms slot, the rack or the bay; chips at least 20 pt (390) and 8 pt (375) clear of rocks and 40 pt apart; hit priority; flick target selection; the reach rule (every frequent target below y 520 at 390 x 844).

`src/ui/haul/hud/bayMetrics.test.ts`: for "₵999.99Qd" at fontScale 0.85, 1, 1.2 and 2 at both sizes, rows add up to the block and the counter's line fits its row.

`scripts/audio/pizza-sounds.test.ts`: Pizza's sound keys and hashes are unchanged by the move.

`scripts/lib/fingerprint.test.ts`: on the two declared fingerprints of section 1.2, the declared dimensions give 10 differing and 1 the same; with pending dimensions unset, normal mode reports PENDING and passes, and release mode fails; with the human, build and log entries filled as differing, release mode gives 8 must and 18 total; changing one must value makes validate fail; identical product kind sequences make validate fail.

### 10.3 Fingerprint check (R5) in `scripts/validate.ts`

New `scripts/lib/fingerprint.ts`, run by `npm run validate` for every pair of games under `games/`:
- Declared dimensions (1, 2, 3, 4, 9, 10, 11, 12, 14, 15, 17's voice) from `fingerprint`. Values must come from the research vocabulary; sets compare by Jaccard (11 differs below 0.5; 12 below 0.7 or with a unique system).
- Measured from the repository: 5 (hash every image a game's build would include: `game.assets`, `icon.png`, store screenshots), 16 (hash every sound `listSounds(id)` returns; music separately; plus `compare.py`'s scores when both packs exist), 6 (word trigrams over title, subtitle, short and long description, promo text and release notes), 17's string share (all strings in `game.json` plus the mode's UI string table `src/ui/<mode>/strings.ts`, minus the allow-list `INTERFACE_LABELS`: OK, Back, Close, Cancel, Settings, Sound, Music, Haptics, Restore purchases, Privacy policy, Terms, Watch ad, Free, Claim, Upgrade, Buy), 18 (store keywords Jaccard).
- Pending dimensions: 7 and 13 from `fingerprint.human` (empty `by` = pending), 8 from `games/<id>/store/bundle-report.json` (missing or older than the source hash = pending), 19 from `games/<id>/store/releases.json` (no submission yet = pending).
- **Normal mode:** prints the full table and the line "verified N, pending M, not differing K". Pending dimensions count neither way. It fails only when the known values already make the result impossible: a known must dimension that does not differ, or (verified + pending) below 15.
- **`--release` mode:** every dimension must be known; fails below 8 of 8 must or 15 of 19.
- Also fails in both modes: a haul game with a `cast`, a `char:` icon, a sound key missing for its catalogue, a product id without the game's prefix, two games whose sequences of IAP product kinds are identical, a title containing "Empire" when another game's title does, or a title with the same "X: Y" shape as another game's.

### 10.4 Bundle check (R1, R2) `npm run check:bundle`

`scripts/check-bundle.ts`, rules in `scripts/lib/bundleRules.ts` (tested in `bundleRules.test.ts`), lists in `scripts/lib/modes.js`. This describes what was built; the esbuild plan this section held before was replaced (Decision 1).
1. **Fast stage** (default, about 2 s, every game; `--game <id>`, `--as-mode <mode>`): walks the TypeScript import graph from `index.ts` with the platform's extensions, type-only imports skipped, using the generated files as `games.js` would write them for each game (nothing is written, the selection does not change). For each game it counts the project files as shared, family and mode, and fails on: a file of another mode's folders (for Pizza Empire: `src/modes/haul`, `src/ui/haul` and the haul rules `src/engine/haul.ts`, `src/engine/haul/**`, `haulMode.ts`, `loadout.ts`, `fixtures/haul.ts`; for Orbit Haulers: `src/modes/sim`, `src/ui/sim`, and also `src/modes/classic`, `src/ui/scene`), a file of a family the mode is not in (Orbit Haulers never bundles the `tabs` family, so neither the glove nor the header, the tab bar, the list homes or the meta screens), an unclassified `src/ui` file, a Node-only file (the fx catalogues, the art icon lists, the game-data lint), another game's data, a sound from a pack the game does not declare, a package only another mode may use (three, expo-gl), and for any mode but sim the restaurant's people rig. It also fails on any import edge that breaks the three levels.
2. **Export stage** (`-- --export`, about a minute per game; before a release): runs `npx expo export --platform ios --source-maps --dump-assetmap --no-bytecode` per game, reads Metro's source map and asset map, applies the same rules to what really shipped, and puts back the game that was selected.
3. **Words** (`-- --words`, a list, never a failure): string literals in each bundle's shared and family files that use another mode's theme words (`THEME_WORDS`). The string denylist of the research (whole words from the other game's game.json, errata 6) is not built yet: the tooling package adds it as a failing stage, with `scripts/bundle-allow.json` for engine identifiers left in shared code.
4. **Report for dimension 8** (not built yet; tooling package): the export stage writes `games/<id>/store/bundle-report.json` (date, source hash, `result: "pass" | "fail"`), which `scripts/lib/fingerprint.ts` reads.
5. **Release binaries** (later, required before the first submission): `scripts/scan-binary.ts <file.aab|file.ipa>` extracts the Hermes string table and the assets and runs the word and asset checks on them; its output is attached to the release log.

In this checkout only `GAME=space-miner` stays selected while a dev server runs from it; the fast stage never changes the selection, and the export stage puts it back itself.

### 10.5 Before declaring done

`npm run typecheck`, `npm test` (Pizza's existing tests unchanged and passing), `npm run validate` (normal mode passes with pending dimensions), `npm run check:bundle` (and `-- --export` before a release), `npm run lint:worklets`, `npm run simulate -- space-miner --hours 12 --prestige` within the hard targets of section 8, `python3 scripts/audio/compare.py space-miner pizza-empire`, and the web preview checks of 10.1.

---

## 11. Decisions (tech lead, skeleton step, 22 November 2026)

These settle the open questions of revision 2, the choices the two reviews and the designer's answers left, and every item of the errata list (`spec-errata.md`, 77 items). Each names what it overrides; where the fix was one line it is also made in place. Two decisions are the lead's: **(a)** the game's sounds live in its own folder and it declares no fallback pack (Decision 2); **(b)** where the errata list and the built bundle mechanism disagree on a name, the built name wins (Decision 1). Work packages, files and contracts: `docs/design/space-build-plan.md`.

### Bundle, wiring and tooling

1. **The built mechanism is the truth** (overrides 1.3 R1, 9.1 staffing files, 10.2 file names, 10.4; errata 1, 10, 11 accepted with the built names). Section 1.3 R1 and 10.4 are rewritten to describe it. Differences from the old plan: `src/generated/mode.ts` (not `modeEntry.ts`) imports `src/modes/<mode>/index.tsx` (not `src/modes/<mode>.ts`); `ModeEntry {id, Shell, parts, artIcons, hints, devViews, engine, presets}` replaces `MODE/Home/Overlays/modeFx/modeIcons/HintPointer/hintSource/Galleries/hintTargets`; the hint source is `setHintSource` with `Hint {key, route, row}` (not `registerHintMode`); the pointer is `parts.HintPointer`; the engine install is `ModeEntry.engine` → `installEngineMode` (`src/engine/mode.ts`, not `src/engine/modes.ts`), and the rules are `src/engine/haul.ts` plus `src/engine/haul/` (not one file); the engine wrapper is `src/engine/haulMode.ts`; there is no `simMode.ts`, `simMeta.ts`, `classicMode.ts` or test-only dispatcher: sim and classic keep their built-in rules and install nothing; the bundle check is `scripts/check-bundle.ts` / `npm run check:bundle` (TypeScript import walk plus a Metro export), not esbuild; the Pizza sound fixture is `src/services/fx/discovery.test.ts`; the moved helpers are `src/ui/juice/ticker.ts`, `src/ui/play/gate.ts`, `src/ui/art/draw.ts`.
2. **Sounds: the game's own folder, no fallback pack** (lead decision a; overrides 1.3 sounds, 6.1 render command, errata 1's and 67's `synth` pack). `games/space-miner/game.json` sets `"soundPack": null` (the schema accepts null: no shared pack at all); `shared/sfx/synth/` is removed; `scripts/lib/games.js` bundles only the game's `assets/sfx/` then. The sound package renders there with `scripts/audio/render_haul.py` (music by `haul_music.py`). `make_sfx.py --recipes haul` is not needed.
3. **The two rules sections of the errata (items 12 to 36) are decided by the lead and implemented by the rules package as written**: 12 (additive `A(contractAdd)`), 13 (freighter snapshot at launch), 14 (warp-out order), 15 (two seam records), 16 (guest stack, −1 = rack), 17 (Jump flow: preview, confirm, spend, condition, create; nodes also mid-run), 18 (`activeRate` × full bonus), 19 (`drillable`, `dry` event), 20 (interval floor 30 s), 21 (story trigger sources), 22 ("Jump ready" at 20 cores), 23 (launches count at the warp-out), 24 (first unload 0:12), 25 (every run opens with contract 0), 26 (`contractGain` with the missing units), 27 (contract draws), 28 (claim drift through the respawn step), 29 (ghost slots up to the next ring), 30 (shared action keys never reach a missing haul sound), 31 to 36. Recorded, not overruled. Where the skeleton had to choose before the rules' second pass lands: story triggers 21 read the current run (each beat fires once ever, so it is equivalent) until `haulStats` carries `bestRing`, `contractsSeen`, `autopilotSeen`; "Jump ready" is a field of the trigger (`{type: 'jumpReady', cores: 20}`) until the haul block has `jumpReadyCores`; item 30 is met by the haul actions playing haul keys (`src/modes/haul/actions.ts`), and the integration package adds the test that lists every `fx.play` literal reachable from the haul screens.
4. **Engine seam** (overrides 1.3's `installEngineMode`/`EngineMode` sketch; errata 3 accepted in effect). `src/engine/mode.ts` defines `EngineMode {id, saveTag, create, reconcile, tick, income, activeIncome, offline, prestige, storyTrigger?, missionUsable?}`; `engineFor(cfg)` returns the installed engine only for a config of its mode. `economy.cardBonus` is not touched: haul code calls `fittedBonus` itself and never `cardBonus`, so Pizza's path is unchanged by construction and `economy.ts` never imports `loadout.ts` or the haul rules.
5. **Saves of the old classic Space Miner are not read** (the specification was silent; the game is unpublished). The haul engine stores its save under `save:space-miner:haul1` (`EngineMode.saveTag`); an old `…:v1` save stays in storage untouched and unread. Pizza Empire keeps `…:v1`.
6. **The haul fx table is its own catalogue** (overrides 1.3's `catalog.core/sim/haul.ts` split and errata 1's "entries tagged `modes`" for haul; errata 64, 65, 66, 68 accepted). `src/services/fx/catalog.haul.ts` (Node only) holds the 56 keys of 6.2, read by `scripts/lib/fxCatalog.js` instead of `catalog.ts` for a haul game, so a haul game's table has no other key. Volumes and intervals are 6.2's; `credit_tick` 45 ms; haptics are the sound package's accent-aligned patterns (`recipes_haul.py PROPOSED_HAPTICS`: `purchase_success`, `boost_start`, `rig_tier`, `freighter_tier`, `system_online`, `module_fit`, `module_levelup`, `salvage_cut`, `salvage_epic`, `daily_relay`, `jump_warp`), and no haptic on `rock_crumble`, `bonanza`, `vein_start`, `vein_end`, `hold_full`, `pod_arrive`, `freighter_land`; `launch_charge`, `warp_out` and `contract_met` vibrate only after the player's own swipe. Event → key mapping: `src/modes/haul/fx.ts` (errata 64). The table matches `recipes_haul.py` key for key (no key on one side only; `haulTable.test.ts`).
7. **RollingNumber is shared mechanics** (overrides the bundle step's classification of `RollingNumber.tsx` and `rollFormat.ts` in the `tabs` family). Both hold no art and import only `engine/format`, `juice/ticker` and each other, so they are moved to `SHARED_UI`; the dock counter uses `RollingNumber`, sized by the haul mode's own `bayMetrics.ts` (no lineHeight).
8. **Icons through the mode, not the shared registry** (overrides 1.3's `registerIcons(modeIcons)`; follows the art notes). `ModeParts` gains `Icon` and `iconPrefixes`; `GameIcon` hands "art:" and "mach:" names to the haul entry's `Icon` (the art kit's `HaulIcon` cache). `src/config/artIcons.ts` lists the haul names (`HAUL_ART_ICON_NAMES`, `HAUL_MACH_ICON_NAMES`) for the lint, and `artIcons.test.ts` checks them against the kit. The icons errata 42 adds (conditions, nodes, products) are the art package's next additions; game.json uses only existing names until then.
9. **Hints** (errata 47, 53, 55 accepted; errata 54 replaced). The shared `Hint` stays `{key, route, row}`; the rules' `HaulHint` already carries `kind, from, to, zone, step, limit`. The shared `HintOverlay` (inside every kit `Sheet`) draws only `point` hints, with the reticle as `parts.HintPointer`; drag and swipe hints on the map are drawn by the haul mode's own `src/ui/haul/hud/HintLayer.tsx` with the art kit's `ReticleLayer`. Map targets use the existing `targets.set(key, rect)` (errata 47's `setTargetRect`).
10. **The glove** (errata 2, own ruling): it stays in the `tabs` family file `src/ui/art/props.tsx`; the haul bundle can never contain a family it is not in, and `check:bundle` proves it. `HintOverlay` imports no pointer.
11. **Denylist and words** (errata 6 accepted for the later failing stage; overrides 10.4 step 2 as built): today `check:bundle -- --words` lists theme words; the failing string stage, `bundle-report.json` and `scan-binary.ts` are the tooling package's.
12. **One content script** (overrides 8's `build-haul.py` and 2.12's `--table` owner). `scripts/content/build-space.py` is the only source of `games/space-miner/game.json`; it now emits the haul game with the specification's starting values (provisional) and Decisions 3 and 18 applied. The balance package adds `--table` and the calibration to it.
13. **Schema** (section 2 header confirmed): `mode` `haul`, `haul: HaulSchema.optional()` (imported from the rules package's `src/config/schema.haul.ts`), `businesses` defaults to `[]` and the lint requires at least one for sim and classic, `bonusPerPoint` ≥ 0 with the lint requiring 0 for haul and > 0 otherwise, IAP kinds `clearance` and `unlock`, an optional `contents` on a `starterPack` (Prospector Charter grants 150 DM and 5 Ore Sorter copies without removing ads), the story triggers `launches`, `ring`, `contracts`, `system`, `galaxy`, `jumpReady`, and the mission types `hauled`, `launches`, `contracts`, `depleted`, `claims`, `seamDrags`. Pizza Empire's parsed config is identical (a test compares it with a recorded copy). `CARD_STATS` is not extended (overrides the section 2 header): a module's real stat is `haul.modules[].stat`, and Pizza's card screens loop over `CARD_STATS`.
14. **Characters** (errata 8 accepted): TALLY, OPS-2, DISPATCH and the six buyers are `characters` with `mach:` portraits; no `cast`; the lint fails a haul game with `cast` or a `char:` icon.

### Rules data and numbers

15. **Open question 2 (run-2 target)**: the 60 % gate stays hard. If the balance package cannot reach it with the named knobs (Afterburner head start, bonanza effect), it reports the best result and the lead decides; no flat node's cap is raised.
16. **Worked numbers** (open question 9, errata 70, 77): both tables of 2.12 are placeholders; no test reads them; the balance package replaces them from `build-space.py --table`. Section 8 is the only gate.
17. **Prospect Survey** (errata 71 accepted): chance capped at 0.5, node cap 11 (in game.json).
18. **Data fixes applied in game.json**: Frost Surplus on rings 3 and 4 (errata 72), seam interval floor 30 s (errata 20), Seed Credits ₵0 at level 0 (errata 32, rules), Derelict pity epic 8, the supply pod every 3 h stored 3 (5.2), contract 0 `min(10, F)` Iron x1.5.
19. **Small screen** (open question 6): accepted as specified (chips 8 pt clear at 375 x 667); no slots are hidden.

### Screens, art and sound

20. **Sheets** (4.4): until the sheets package builds the haul bottom sheet (46 % height over the bay, registered with `useOverlay`), the placeholders use the kit `Sheet`. Spokes are full-screen views registered with `useOverlay`.
21. **Errata 37 (atlas interface)**: the built atlas wins (lead decision b): `bakeAtlas({density, freighter})` with sprite names `drone-<ore>`, `rock-<shape>-<ore>`, `bonanza-<shape>`, `crack1-`, `crack2-`, `dry-`, `dryglow-`, `drill`, `chunk-<ore>`, `shard-<ore>-<i>`, `credit`, `freighter`, `flame-<i>` and `spriteXform` (src/ui/haul/art/README.md).
22. **Errata 38 to 43** accepted: the art package also draws `StationSchematic`, `DishRelay`, `ConditionPreview`, `StarCore`, `NodeRing`, `ReceiptStamp`; one beacon drawing (Systems Preload = the autopilot beacon), 7 node parts plus the beacon; hulls at 1, 10, 25, 50 and segments at 75 to 250; at most 4 drones drawn per route and 6 on the rack; rock radius uses `k × T(distance)`.
23. **Errata 44 to 63** accepted as written (chips by backtracking from the centre, hit priority, flare and selection taps, views with own touch, Long Haul layout, bay metrics signature `bayCounterMetrics(compact, block, fontScale, innerWidth, glyphCount, lineEm?)`, hints inside sheets in two stages, comms timing, voice lines, ₵44, "Bring online · ₵90", counter tap before contracts, Rig sheet verdicts, board size at 375, T-n is slot n − 1).
24. **Audio threshold** (open question 7): `compare.py`'s joint score at 0.6 (the sound package's calibration: the p95 of unrelated pairs) is the rule; the spec's either-over-0.6 rule is printed only. The listening check (10.1 #10) stays a person's.

### Store and fingerprint

25. **Subtitle** (overrides 7.6): "Route ore drones, idle mining" (29). "Idle tycoon: route ore drones" matches validate's "Idle … Tycoon" title rule (`scripts/lib/checks.ts`), which exists for a trademark reason.
26. **The fingerprint block lives next to game.json** (overrides 1.2's "in game.json"): `games/<id>/store/fingerprint.json`, so no app bundles the other game's id. `scripts/lib/fingerprint.ts` (test `fingerprint.test.ts`) compares every pair from `scripts/validate.ts`: closed vocabularies for 1 to 4, 9, 10, 15 and the art style (errata 7); measured, never declared: 5 (image hashes, and a shared drawn kit or family counts as overlap), 6 (store text trigrams), 16 (sound and music hashes, and a shared sound pack), 17 (string share from game.json and `src/ui/<mode>/strings.ts`, minus `INTERFACE_LABELS`), 18 (keyword Jaccard < 0.3), and the mode (two games of one mode cannot differ on 1 to 4). Pending until filled: 7 and 13 (`human.*.by`), 8 (`store/bundle-report.json`), 19 (`store/releases.json`). Everyday mode prints the table and fails only when the known values already lose; `validate --release` needs every dimension known, 8 of 8 must and 15 of 19. Both modes fail on identical product kind sequences, a product id outside the game's prefix, two "Empire" titles or two "X: Y" titles. Today: verified 14 (6 of 8 must), pending 4 (2 must), not differing 1 (errata 9's "today" count is superseded because the measured dimensions are built).
27. **Open question 1 (bundle ids)**: `com.example.spaceminer` stays until the studio's domain is known; a release blocker owned by the tooling package. `app.slug` is `orbit-haulers`.
28. **Open question 4 (names)**: Tamsin Station and TALLY stay provisional until the tooling package's store search.
29. **Open question 8 (shared purchase code)**: covered here by `src/engine/modeRegression.test.ts` (sim and classic outputs recorded before the seam) and the recorded parsed Pizza config; the new kinds are additive cases.
30. **Open question 5 (classic engine)**: classic stays on the built-in shared rules. Moving the restaurant chain (`chain.ts`) out of the haul bundle is not a pure move of import edges (economy.ts calls it in creation, the tick, rates and prestige), so it is left as a known remainder (build plan).
31. **Open question 3 (staffing)**: replaced by the build plan's packages.

### Integration step (rules and numbers, 22 November 2026)

32. **Contracts follow what the station can deliver** (overrides 2.6 "Total units: `round(F × U(0.4, 0.7))`" and the ore draw from the ring's weights alone; section 8's bot behaviour for contracts). The balance bot measured 8 to 13 % of payouts with a met contract against 40 to 70 %: a share of F in a far-ring ore that is a small part of what reaches the hold (17,297 ice wanted while ice drilled at 36 units/s) can never fill one launch. Now a contract's ore is one on a present rock of the drawn ring, and its units sit between what one launch carries of that ore with the routes as they are and what it carries once a player sends half the fleet there (section 2.6, `contractStation`, `contractAt`; game.json `contracts.reach`, `fleetShare`, `minUnits` replace `contracts.units`). Deterministic (seed and state at the draw only), offline-safe (contracts are only drawn at a warp-out in play or when a board opens). Section 8 gains a soft target for a player who never moves a drone for a contract (≤ 20 %).
33. **Run-2 gate** (lead's integration decision 1; amends Decision 15): the hard gate is 65 % of run 1's time; 60 % stays the target.
34. **Sounds** (lead's integration decision 2): collecting the Shift Log plays `payout` (the log plays `shift_log` when it prints); "Jump now" plays `ui_open` and `jump_warp` plays once with the Jump sequence.
35. **Galaxies on screen are counted from 1** (lead's integration decision 3): "Galaxy 2" is the first after a Jump; data and code stay 0-based.
36. **No interstitials in the first version** (lead's integration decision 4; 5.4): game.json `monetization.ads.interstitials: false`. Clearance's description says what it does in this version: "Every ad reward without watching the ad." (it removes banners and interstitials only if a later version shows any).
37. **Hangar Expansion bought mid-run** is a rule: `grantHangarDrones` (src/engine/haul/actions.ts) gives its start drones at once, idle, never above the cap, once per run; a run that starts with the product owned is marked as having had them (`flags.hangarDrones`), so a boot re-grant never adds them twice.
38. **Buyer lines**: `haul.contracts.buyers[].calls` and `closed` are part of the schema (optional; the comms slot reads them).
39. **The bot is part of the rules**: its pure part is `src/engine/haul/bot.ts` (no Node import), so the app's presets can be built from its states; `scripts/content/haul-bot.ts` is only the command line. `scripts/validate.ts` runs it for a haul game (12 h with Jumps) and fails on every hard section 8 target it misses.

### Fix round (lead, 22 November 2026, after the six reviews)

Decisions 40 to 55 settle the findings of the play-tester, the economy auditor, the phone, performance and store reviewers and the regression hunter. They override the sections they name (those sections carry a pointer here). The numbers each one moved are stated in "Numbers of the fix round" at the end of this section.

#### 40. A contract is delivered over several launches (overrides 2.4 step 5, 2.6, Decision 32's unit rule)

Why: the play-tester called the contract loop "a chore that punishes, not a decision" (a contract lapsed 49 s after it was picked; the strip counts down, then resets at every launch; the autopilot burns the tries), and the auditor showed the unit rule is broken both ways (met by doing nothing on a station whose ore already has half the fleet, never met on a two-ore station where both ores are wanted).

The rule, as the player would say it: "Deliver 8,400 copper within 6 launches."
- Taking a contract. A contract on the board is an offer until the player picks it. The pick takes it: `taken = true`, `launchesLeft = haul.contracts.launches` (6, tune 4 to 8). At most one contract of a run is taken, and the taken one is the active one. Picking another offer, or picking none, while one is taken DROPS the taken one: it leaves the board and the next from the stream takes its place (event `contractLapsed {wasActive: true, dropped: true}`). The screens ask for a second tap before a drop that loses progress.
- Offers age slowly: an offer loses one launch of `haul.contracts.offerLaunches` (12, tune 8 to 16) at each warp-out and is replaced silently when it reaches 0 (event `contractNew`). The board therefore keeps changing for a player who never picks.
- Progress. Each want carries `got` (units delivered so far). At a warp-out with a taken contract, each wanted ore adds `min(cargo_o, units_o − got_o)`. When every want is complete the contract is MET at that warp-out: the bonus is paid, event `contractMet`, the next from the stream takes its place, `active = null`. Otherwise `launchesLeft −= 1`, and at 0 it lapses (event `contractLapsed {wasActive: true}`), nothing is taken back.
- Loading is unchanged in spirit: wanted ores first, up to what the contract still needs, then by value.
- Money. Every launch pays its cargo at the normal price (with the full-hold bonus, `keeper` and G as before). The warp-out that completes the contract also pays the contract bonus `Σ_o units_o × p_o × (M' − 1) × G`, and that launch's other cargo keeps the delivery fee. Over its life the contract's own units are therefore paid at `M'`, exactly what "x1.8" promises. `contractBonus` is a fixed number for a contract (at current prices): the board, the strip and the receipt show the same figure, and it does not move with the hold.
- Units at the draw. With `L = haul.contracts.launches`, `now_o` and `routed_o` per launch as in Decision 32 (`contractStation`): `units_o = round(L × now_o + λ × (L − 1) × (routed_o − now_o))`, λ = U(reach.lo, reach.hi). Never free: `units_o ≥ ceil(L × now_o × (1 + margin))`, margin 0.12 (tune 0.08 to 0.2). Always reachable: `units_o ≤ floor(now_o + (L − 1) × routed_o)`. When the two cannot both hold (the ore has no room to route for: its routes already hold the fleet share, or its only routes are single drones), widen `routed` first (count a route's last drone as movable, raise the share for this ore up to 0.8), then draw another present ore; only a station with a single ore gets a quota contract (`units = round(L × F × U(0.75, 0.9))`, multiplier lowered by 0.2, at least 1.3): it needs full holds and nothing else, which is right for the first minutes. A two-ore contract routes for both ores at once (the fleet share split between them, drones taken from the unwanted ores first); each ore obeys the same two bounds.
- Contract 0 stays "Halden Yards, min(10, F) Iron, x1.5", taken automatically, so the first contract is met by the first launch after the strip appears, as in section 3.
- The autopilot's `contract` policy: launch when the hold already holds everything the taken contract still needs, or when the hold is full. `full` is unchanged.
- Offline progress does not touch contracts: no progress, no launches counted, no offers aged.
- Pods: still one Scrap Pod every `contractsEvery` contracts met; a contract now takes several launches, so the numbers engineer re-tunes `contractsEvery` and the dried-rock pods against a new section 8 target for pods per hour.
- Section 8 measures: share of TAKEN contracts that are met, for the bot that routes for them (target 60 to 85 %) and for the passive bot that never moves a drone for one (at most 25 %); the contract bonus as a share of run income (report it; aim 10 to 25 %).

The interface the screens build against (src/engine/haul/trade.ts, exported through src/engine/haul.ts; the rules engineer adds these FIRST, before finishing the rule, and says so in the shared requests file):

```ts
export interface Contract {
  k: number; buyer: string; mult: number;
  wants: { ore: string; units: number; got: number }[];
  /** An offer: warp-outs left on the board. Taken: warp-outs left to deliver everything. */
  launchesLeft: number;
  taken: boolean;
}
export interface ContractView {
  index: number; contract: Contract; active: boolean;
  /** Paid at the warp-out that completes it. Fixed for the contract at current prices. */
  bonus: number;
  /** Launches it has once taken (haul.contracts.launches), and how many are left now (an offer: the offer's life). */
  launches: number; launchesLeft: number;
  wants: {
    ore: string; units: number; got: number;
    /** Units of this ore the freighter in flight is carrying toward this contract (0 unless active and between launch and warp-out). */
    aboard: number;
    /** max(0, units − got − aboard). */
    left: number;
    /** What one launch carries of this ore with the routes as they are (contractStation.reach().now). */
    perLaunch: number;
  }[];
  /** min over wants of perLaunch × launchesLeft / left (Infinity when nothing is left). For an offer: as if taken now. */
  paceRatio: number;
  /** paceRatio ≥ 1. */
  onPace: boolean;
  /** The ore that is furthest behind when not on pace, else null. */
  shortOre: string | null;
}
export function contractViews(cfg: HaulConfig, params: HaulParams, h: HaulState): ContractView[];
export function contractBonus(cfg: HaulConfig, params: HaulParams, c: Contract): number;
```
Events: `warp {payout, met, cargo, bonus}` (bonus 0 unless this warp-out met the contract), `contractProgress {contract, added: {ore, units}[]}`, `contractMet {contract, bonus}`, `contractLapsed {contract, wasActive, dropped?}`, `contractNew {contract, index}`. `pickContract(cfg, g, index | null)` keeps its signature. `contractGain` and `contractMissing` go away once nothing calls them.

What the screens show:
- Strip (bay engineer): buyer, each ore as "COPPER 3.7K / 8.4K" with a bar (delivered solid, aboard as a lighter segment while the freighter is in flight), "4 LAUNCHES LEFT" in words (the last one pulses), the bonus "+₵19.4K", and a pace light: "ON PACE" or "SHORT ON COPPER" (amber; tapping the strip opens the board as now). Never a figure that falls back after a launch.
- Board cards (panels engineer): buyer, multiplier, each ore "8.4K COPPER", "IN 6 LAUNCHES", "YOU SHIP 1.2K PER LAUNCH" with the pace as a bar or a word (ON PACE / NEEDS MORE COPPER), "+₵19.4K WHEN MET". The taken one shows its progress and launches left. Picking another while one has progress asks once more ("Drops Kade Refinery: 3.7K delivered"). Units are formatted with the short format everywhere (8.4K, never 8372).
- Receipt and stamp: "CONTRACT MET +₵19.4K" on the receipt row, never over the credits number.

#### 41. A Jump that is not ready says so
The rule stays (a Jump is possible from 1 core; "ready" is 20). Below ready, the Star Map shows "NOT READY · 7 OF 20 WARP CORES" where READY stands, the Jump key is drawn as a secondary key (no bright fill) reading "JUMP ANYWAY: +7 WARP CORES", and its confirm names the loss ("You leave with 7 cores. 20 is a full run."). Singular for 1 ("+1 WARP CORE"). The Jump key stays in view without scrolling at both sizes. The streak-and-shudder sequence plays at the confirm; the arrival plays after the condition is picked.

#### 42. The Shift Log's ad adds half, and the offline gate counts it (overrides 5.4 where it says "double")
With Clearance the ad reward is free and unlimited, so a doubled Shift Log made an hour away worth up to 1.84 hours of play without buying. For this game the reward is +50 % (`haul.offline.adBonus = 0.5`, a new config field; the first game keeps its own x2 untouched). Section 8's hard offline gate is measured on the credits WITH the bonus, two ways, on every seed and with a margin so it is not met by rounding: an hour away with the bonus pays at most 0.6 of an hour of active play (the bot that buys and routes), and at most 0.9 of an hour of only watching (the app open, autopilot on `full`, nothing bought, nothing routed, no contract taken). The second is what makes "an hour away never beats an hour in the game" true for every player; the numbers engineer adds a watching mode to the bot for it and lowers the efficiency cap as needed. Label: "BOOST +50 %" (and its ad label says what it gives).

#### 43. Module upgrades cost parts only
The shared card rule charges copies ("parts"), not Dark Matter, and the first game's rules are pinned. The Fitting Bay says "UPGRADE · PARTS 3/5" (not "Refit", which read as "fit again"), and shows no Dark Matter price. The specification's "Refit 40 DM" example goes.

#### 44. The tutorial's purchases each raise income, in this order (overrides section 3 steps 3 to 6 and the tutorial path of 2.12)
The second drone was advised while the first rock's rig was the limit: the income line did not move, so the first purchase the game recommends looked useless. New order of the six guided steps: 1 drag the drone to the rock; 2 swipe the freighter off; 3 claim the second rock (point at `slot:1`, then the confirm chip); 4 buy a drone (point at `station`, then `station:buyDrone`); 5 tap the drone, then the NEW rock (tap-tap onto `rock:1`); 6 upgrade a rig (point at `rock:0`, then `rig:upgrade`). Moving a drone between routes is taught by the first rich seam, as before. Prices are set so that each step is affordable within 5 s of a warp-out on the tutorial path and each guided purchase raises the income line by at least 15 % once it is done (a test on the tutorial path). A guided step keeps the pointer for its first 10 s even if the hold fills (the swipe hint waits). The first rich seam of galaxy 1 comes at 150 s, not 360 (later ones as before).

#### 45. The pacing gate runs on several seeds
`scripts/validate.ts` runs the 12 hour simulation for seeds 12345, 4 and 99 (in parallel processes) and every hard section 8 target must hold on each. The slowest seed's first Jump must be inside the window, with the numbers re-tuned for that, and the offline gate holds with margin. New section 8 targets: pods per hour and Dark Matter per hour in hours 1 to 3 (the numbers engineer proposes the windows from the module economy of 5.1 and 5.2 and states them).

#### 46. Figures are written as figures
Comms lines, buyer calls and mission texts write quantities and multipliers as digits with the short format ("12 IRON AT x1.7", "ABOUT 13K ICE, PAYING x2.3"), not as spoken words. Plurals are right for 1 ("Close 1 contract"). A rich seam is called a rich seam, never "gold" (there is no gold ore).

#### 47. Android
The back button or gesture closes the top layer (sheet, station menu, spoke, armed chip) and only leaves the app from the bare map. Both apps declare themselves games in the Android manifest (`android:appCategory="game"`), which is also what keeps the portrait lock on large screens under Android 16 (the wiring engineer verifies this against the platform's public documentation before relying on it; if it does not hold, the field lays out in a centred column of at most 430 pt instead).

#### 48. Hints never cover what the player is reading
No hint is drawn while a sheet, spoke, overlay or the station menu is open. No reticle sits on a number: the swipe hint runs beside the dock counter, and "open the board" rings the counter's frame.

#### 49. Dragging a drone shows what it is worth
While a drone is held over a rock (and for a moment after the drop) the field shows the change in income of putting it there, from the rules' own estimate: "+₵12/s", or "+₵0/s · RIG LIMIT" when the rig cannot feed another drone (which tells the player to upgrade the rig instead). `routeGain(cfg, g, from, to)` in the rules returns `{ delta: number; limit: 'rig' | 'haul' | null }` for moving one drone from slot `from` (null: the rack) to slot `to` (null: the rack).

#### 50. The field redraws only as fast as it must
60 frames a second while a finger is down or the freighter is climbing or landing; 30 otherwise. The starfield is one textured draw, not three replays of a thousand circles. Nothing animates under a full-screen spoke. Bay canvases animate on events, not continuously.

#### 51. One clock for the freighter
The freighter crossing from the bay into the field is drawn from one source of time by both canvases.

#### 52. A new galaxy looks like one
Each galaxy has its own backdrop tint (a small set of palettes that cycle), its name is shown on arrival, and the galaxy's condition stays visible on the main screen for the whole run.

#### 53. No daily ladder; a day-shift bonus on contracts instead (overrides 5.4 "daily relay")
The store reviewer: after ten minutes the two games show the same free-to-play skeleton under other names, and at least one of the copied systems should become different in kind. The first game has a five-step daily gift ladder; so did this one. Orbit Haulers drops the ladder. In its place, tied to this game's own loop: the first `haul.shift.contracts` (3) contracts MET in each shift pay their bonus twice ("DAY SHIFT x2"). A new shift starts when the calendar day has changed and at least 16 hours have passed since the previous shift started (the same guard against a moved clock that the flare ads use; the gain from cheating it is three contract bonuses). The count lives in the lifetime stats, so a Jump does not reset it. The strip tags a contract that would get it ("x2 SHIFT"); Comms shows "DAY SHIFT · 2 OF 3 LEFT" where the relay was; the receipt says "DAY SHIFT x2" when it pays. Priority: after every major finding. Owners: the rule (rules engineer), the data, the specification and the fingerprint's list of meta systems (numbers engineer), the strip tag (bay engineer), Comms (panels engineer), the store no longer offering the daily claim for this game (wiring engineer).

#### 54. The shared skeleton carries this game's own numbers and names
Module part costs do not follow the first game's 2 × 1.5^n (the numbers engineer picks another curve and re-checks the module economy against 5.1). The five products' prices are not the first game's set of price points. Identifiers in this game's data that are free strings do not carry the first game's words. The subtitle keeps the genre words the owner wants to be found by (idle, mining, space, tycoon, across subtitle and keywords) but never in the order of another developer's well-known title; the short description does not follow the first game's sentence pattern (no "verb, verb and grow X").

#### 55. Nothing a player sees before the game is the same in both apps
The loading screen is a part of the mode entry: this game draws its own with its own art and type (the first game's stays pixel for pixel what it is). The tracking-permission sentence comes from each game's data, in its own voice (the first game keeps the sentence it has). The "development build" note in a menu shows only in a development build.

#### Numbers of the fix round

Every shipped number that changed in this round (scripts/content/build-space.py; game.json regenerated, store files synced):

- **Contracts** (Decision 40): `haul.contracts.launches` 4 (a taken contract is delivered over 4 warp-outs; tune 4 to 8, 6 at first: the passive player met 35 % at 6), `offerLaunches` 12, `margin` 0.2 (was the new rule's 0.12), `reach` 0.5 to 0.9 (was 0.35 to 0.75); `lifetime` and `minUnits` are no longer read.
- **Pods** (rules-3): a Scrap Pod every 12th contract met (was 4) and every 8th dry rock (was 6).
- **The first Jump on every seed** (Decision 45, rules-2): prestige threshold 1.2e8 (was 1.6e7; the freighter and the contracts below raised income); a ring's own ore is 85 % of its rock stream on rings 2 to 5 (was 70 %).
- **The tutorial** (Decision 44, play-17, play-18): freighter capacity at level 1 is 20 (was 12: two worked ring-1 rocks filled a 12-unit freighter, so the rig step paid nothing), drone capacity at level 1 is 5 (was 4: a drone must carry more than a level-2 ring-1 rig drills), claim base ₵14 (was ₵16) and claim factor per slot 1.5 (was 1.4): slot 1 costs ₵21 and comes at the first warp-out (₵22), the drone (₵10) at the next, the rig level (₵3) at once. Income: ₵0.75/s with one rock, ₵1.51/s after the second rock and its drone (+100 %), ₵1.76/s after the rig level (+17 %). The first rich seam of the first galaxy at 150 s (`haul.seam.first`; later galaxies `firstLater` 360).
- **Offline** (Decision 42): `haul.offline.adBonus` 0.5; the efficiency cap stays 0.45 (measured margin: 0.40 of play and 0.83 of watching with the bonus).
- **Day shift** (Decision 53): `economy.daily.gems` is empty (no daily ladder); `haul.shift` {contracts 3, minHours 16, mult 2}; the fingerprint's meta systems list "shift-bonus" instead of "daily-gift", and validate fails when the list and the data disagree.
- **Modules and products** (Decision 54): module parts per level `3 × 1.35^(level − 1)` (3, 4, 5, 7, 10, 13, 18, 24; the first game uses 2 × 1.5^n); fallback prices Clearance $6.49, Hangar Expansion $4.49, Prospector Charter $3.49, Fuel Cell $2.49, Fuel Tank $8.49 (none of the first game's price points; the real prices are set in the consoles). At about 7 to 10 pods an hour a common module gets about 4 parts an hour (level 5 after about 5 hours of play), and the 5 Ore Sorter parts of the Prospector Charter are about 20 hours of an epic's drops.
- **Texts** (Decisions 46, 54, 55; play-1, play-16, store-1, store-5, store-7, store-12, play-13): the story beat `start` is gone (guided step 1 voices the line); mission texts without a wrong plural ("Contracts to close: {n}.", "New slots to claim: {n}.", "Pods to open: {n}."); buyer calls are filled with figures ({units} short format, {mult} "x1.8"), Halden's closing line "Received in full. Call us again."; app ids `com.example.orbithaulers`; `app.trackingText` in this game's words; `store.privacyPolicyUrl` placeholder; subtitle "Space mining by drone routes"; short description "An asteroid field, a hold of ore, and a freighter waiting for your swipe."; keywords idle, tycoon, asteroid, freighter, cargo, logistics, station, galaxy, rocket, sci-fi, fleet, manager.
- **New section 8 targets** (Decisions 40, 42, 45, play-18): taken contracts met (60 to 85 %, passive ≤ 25 %), contract bonus share (aim 10 to 25 %), the two offline gates with the bonus (≤ 0.6 of play, ≤ 0.9 of watching), pods per hour in hours 1 to 3 (3 to 10) and their Dark Matter (2 to 8), the longest wait between purchases in the first 5 minutes (about 30 s). Validate runs seeds 12345, 4 and 99 in parallel.

Knob table (`python3 scripts/content/build-space.py --table`; * = shipped value differs from the specification's starting value):

| Knob | What | Range | Spec | Shipped |
|---|---|---|---|---|
| prestigeThreshold | lifetime credits per core squared (first Jump 2 h 15 to 2 h 45) | 100000.0 to 10000000000.0 | 2000000.0 | 120000000 * |
| coreScale | cores scale | 1 to 20 | 5 | 5 |
| offlineHours | offline cap, hours | 4 to 8 | 6 | 6 |
| offlineEfficiency | offline efficiency (at most 0.45) | 0.3 to 0.45 | 0.45 | 0.45 |
| oreRatio2 | copper / iron | 4 to 6 | 5 | 5 |
| oreRatio3 | ice / copper | 4 to 6 | 5 | 5 |
| oreRatio4 | titanium / ice | 4 to 6 | 4.8 | 4.8 |
| oreRatio5 | platinum / titanium | 4 to 6 | 5 | 5 |
| ringOreShare | share of a ring's own ore in its rock stream (rings 2 to 5) | 60 to 90 | 70 | 85 * |
| startPile | units on slot 0 at the start | 5 to 10 | 8 | 8 |
| rigLevel | drill per rig level | 1.25 to 1.45 | 1.35 | 1.4 * |
| rigGrowth | rig cost growth | 1.45 to 1.8 | 1.6 | 1.7 * |
| claimBase | claim cost of ring 1 slot 0 (tune, no range stated: 10 to 40 assumed) | 10 to 40 | 13 | 14 * |
| claimRing | claim cost per ring | 15 to 30 | 20 | 15 * |
| claimJ | claim cost per slot within a ring | 1.4 to 2.5 | 1.6 | 1.5 * |
| droneCapacity | units a drone carries at capacity level 1 (Decision 44) | 4 to 6 | 4 | 5 * |
| capacityGrowth | drone capacity per level (knob: haul binds) | 1.2 to 1.35 | 1.25 | 1.25 |
| droneGrowth | drone cost growth (knob: fleet taps) | 1.35 to 1.6 | 1.45 | 1.45 |
| capacityCostGrowth | capacity cost growth (knob: fleet taps) | 1.45 to 1.8 | 1.55 | 1.55 |
| freighterCap | freighter capacity at level 1 (Decision 44: the tutorial rig step must pay) | 12 to 24 | 12 | 20 * |
| freighterGrowth | freighter cost growth (knob: freighter binds) | 1.45 to 1.8 | 1.6 | 1.5 * |
| autopilot | Dock Autopilot price | 80 to 110 | 90 | 90 |
| bonanza | bonanza chance of a new rock | 0.03 to 0.06 | 0.04 | 0.06 * |
| bonanzaDrill | bonanza drill (knob: run 2) | 2 to 3 | 2 | 3 * |
| seamMin | seam interval, low end (knob: drags) | 60 to 90 | 90 | 90 |
| seamMax | seam interval, high end (knob: drags) | 100 to 150 | 150 | 150 |
| contractLaunches | warp-outs a taken contract has to deliver everything | 4 to 8 | 6 | 4 * |
| offerLaunches | warp-outs an offer stays on the board | 8 to 16 | 12 | 12 |
| contractMargin | never free: units at least L x now x (1 + margin) | 0.08 to 0.2 | 0.12 | 0.2 * |
| fee | delivery fee on the rest of a met cargo | 0.05 to 0.15 | 0.1 | 0.1 |
| reachLo | contract units: low end, from the hold share as routed (0) to the share routed for it (1) | 0.2 to 0.5 | 0.35 | 0.5 * |
| reachHi | contract units: high end of the same range | 0.6 to 0.9 | 0.75 | 0.9 * |
| fleetShare | share of the fleet a player sends to a contract when routing for it | 0.3 to 0.7 | 0.5 | 0.5 |
| contractMultScale | contract multipliers: share of the specification's mark-up over x1 | 0.6 to 1 | 1 | 1 |
| podsDepleted | a Scrap Pod every n-th dry rock (pods per hour) | 4 to 16 | 6 | 8 * |
| podsContracts | a Scrap Pod every n-th contract met (pods per hour) | 4 to 16 | 4 | 12 * |
| headStartRig | rig level of head-start slots (knob: run 2) | 4 to 10 | 4 | 6 * |
| efficiencyCap | offline efficiency cap of the haul rules (gate measured with the ad bonus) | 0.25 to 0.45 | 0.45 | 0.45 |
| partsBase | module parts for level 2 | 2 to 4 | 3 | 3 |
| partsGrowth | module parts growth per level | 1.25 to 1.45 | 1.35 | 1.35 |


### Finishing round (lead, 22 November 2026, after the four verifiers)

These override the fix round's decisions where they differ (`scratchpad/space/finish-decisions.md` is the lead's text; this is the specification's record of it).

#### 56. Contracts are drawn from what the station has really shipped (replaces the unit rule of Decisions 32 and 40; the rest of Decision 40 stands; overrides 2.6's draw)
The station remembers what it ships: `recent[ore]`, an exponential average of each ore's units per launch over about the last `recentLaunches` (6) warp-outs in play, saved with the run, not used before three launches. An ore can be asked for when it is at least `minValueShare` (0.10) of a launch's value, its share raised by the smallest raise stays under `maxShare` (0.90), and one of its present rocks outlives the contract. The three offers want different ores where enough are eligible; a buyer appears once. A one-ore contract "raises it": `units = round(L × recent × (1 + g))`, `g` drawn in `raise`, never below `L × steady × (1 + raise.lo / 2)` (so a fresh offer's light is never green); its multiplier is the ring's, plus `raiseMult × g`. A two-ore contract (`twoOreChance`, with three ores eligible or shipped) "holds" its second ore at `L × recent × U(holdShare)`. A station that ships one ore gets Decision 40's quota contract (the first minutes only). A freighter level resizes every contract on the board and the `recent` figures by `F_new / F_old` (event `contractResized`, "ORDER RESIZED"), so buying a level never meets a contract. A dropped contract's place stays empty until the next warp-out. `haul.contracts.launches` is 6. From galaxy 2 on there is no fixed first contract. The pace figures of offers and of the taken contract come from one function: the steady per-launch figure of each wanted ore from the routes as they are (`F × r_o / R`, no seam, no pile buffer), the taken contract's next launch counted from the hold; `expected = nextLaunch + (launchesLeft − 1) × perLaunch`; each want carries `raise` (still to gain, 0 on pace; "NEEDS +32 % COPPER"). `contractStation`, `reach`, `now`, `routed` and `margin` are gone. Conditions 1 to 6 of the lead's text are the rules engineer's tests (`haul.audit3.test.ts`); condition 6 is section 8's.

#### 57. The game says what the limit is (overrides section 3's six-step limit after the tutorial)
After the guided steps, in the first 15 minutes of galaxy 1 (`ADVICE_UNTIL` 900 s of run clock), when nothing has been bought for 40 s (`marks.boughtAt`) and an affordable purchase raises the income line by at least 15 %, the hint engine names it once on the radio and points at it: a step-0 `point` hint on `station:buyDrone`, `station:capacity`, `station:engine`, `station:freighter`, `rig:upgrade` (route `rock:<slot>`) or `slot:<slot>`, at most six showings a run (`hintsShown` of those keys) and never the purchase made last (`marks.lastBuy`). The purchase is chosen by `src/engine/haul/advice.ts`, the same estimate the balance bot buys by (best payback counted from now: `1 / (wait + price / gain)`, singles only). The lines are the `hintLimit*` strings. On the hint path (a person who does only what the hints ask, 2.5 s reactions) the first ring-2 claim comes at the minute given in "Numbers of the finishing round" below.

#### 58. The tutorial's rig upgrade is not wasted on a dying rock (overrides section 3 step 6)
Step 6 points at the claimed rig whose rock has the most life left (`longestLifeSlot`). The first rock of each ring-1 slot in galaxy 1 lasts at least `haul.start.firstLife` = 600 s of drilling. The Rig sheet says, where it shows "Dry in", that the rig stays for the next rock.

#### 59. Nothing is asked of the player that the screen then contradicts
The Rig sheet's verdict comes from the actual limit ("Pile full: drones are waiting on the freighter"); the receipt names every ore it shipped, the contract's first, in short figures, and a doubled bonus as "+₵35 x2"; a pile label never shows more than its capacity; condition cards show both lines, the upside first (`haul.conditions[].lines`: Frost Surplus "Ice value x2" first, Long Haul "Contract multipliers +0.3" first, Heavy Ore "All ore values x2" first).

#### 60. The pod counters are drawn, not written as "every Nth"
A row of manifest stamps or cache slots that fill, with words such as "DERELICT CACHE · 3 MORE ACKS".

#### 61. The loading screen has an arrangement of its own
A boot log, left-aligned in the lower third, lines arriving one by one, the station ring small in a corner; `?view=boot` shows it in the web preview.

#### 62. The gate has margin
Validate runs the pacing bot on five seeds (12345, 4, 99, 7, 2026) in parallel; every hard target must hold on each. The first Jump's hard window in the gate is 2 h 18 to 2 h 42 (three minutes inside each edge of 2 h 15 to 2 h 45; `JUMP_MARGIN` 180 s). Pods per hour and Dark Matter per hour in hours 1 to 3 must be inside their windows on at least four of the five seeds (validate fails otherwise). The balance bot runs the day shift (`haulShift` once a minute with its simulated wall time and the UTC day), and the property test has it among its actions (rules engineer).

Also in this round (store and checks): the App Store promotional text no longer uses the first game's "verb, verb, and grow X into Y" frame or its idle promise ("Every rock runs dry. Every buyer wants a different ore. Which drone goes where, and when the freighter leaves the pad, is your call."); Tessaly's call no longer leads with its trade ("Tessaly. {units} {ore} wanted. Paying {mult}. Keep the hold sealed."); NAME-SEARCH.md lists "Drone Orbit: An Incremental Space Mining Drift" (keep the title and the subtitle); validate warns, and fails with `--release`, when a game's store screenshots are older than the last change to its game.json or its mode's strings file (git commit time, or the file's time while it has uncommitted changes), and when two games share one privacy policy address.


#### Numbers of the finishing round

Every shipped number that changed in this round (scripts/content/build-space.py; game.json regenerated, store files synced):

- **Contracts** (Decision 56): `haul.contracts.launches` 6 (was 4); `raise` 0.25 to 0.6, `holdShare` 0.85 to 0.95, `raiseMult` 1, `maxShare` 0.9 (its new meaning), `minValueShare` 0.1, `minBonusSeconds` 10, `recentLaunches` 6; `reach` and `margin` are gone; `fleetShare` 0.5 is now only the bot's routing budget; multipliers as the specification (contractMultScale 1). Changed again by Decision 63 (below).
- **Rocks** (Decision 58): `haul.start.firstLife` 600 s of drilling for the first rock of each ring-1 slot in galaxy 1.
- **Rig cost growth** 1.6 (was 1.7): with the contract rule of Decision 56 the routes were drill-bound 60 to 72 % of the time on all five seeds (target: no kind above 60 %); at 1.6 that measure passed on four of five seeds in the run before the last threshold change.
- **Prestige threshold** 3e8 (was 1.2e8): contracts drawn from what the station ships pay more for a router, so income is higher. Back to 2.2e8 with Decision 63 (below).
- **Pods**: a Scrap Pod every 8th contract met (was 12): fewer contracts are met under Decision 56.
- **Claims**: unchanged (claim ring factor 15). With 17 the hint path's first ring-2 claim moved from 3:56 to about 4:30, but the dead stretches of section 8 grew on every seed, so it was put back.
- **Texts**: promotional text, Tessaly's call, condition lines upside first (Decisions 56 to 62 above).
- **New section 8 targets**: earnings with contracts against never taking one at 2.5 h (1.3 to 1.7 times, soft); the first Jump's gate window 2 h 18 to 2 h 42 (hard); pods and Dark Matter per hour on at least four of five seeds (validate). The windows were changed by Decision 63 (below).

**Measured at the end of the finishing round:** replaced by the measurement of the last balance round below (Decision 63); the gate did not pass then (first Jump 2 h 00 to 2 h 55, the router meeting 33 to 49 % of its contracts and earning 1.7 to 3.5 times a player who never takes one).

### Last balance round (lead, 22 November 2026)

#### 63. Contracts pay less, and the gate asks for what matters (the last balance round; overrides Decision 62's Jump window and condition 6 of Decision 56)
After Decision 56 a router earned 1.7 to 3.5 times a player who never takes a contract, the first Jump moved between 2 h 00 and 2 h 55 with the seed, the threshold had to rise to 3e8 to hold it near 2 h 30, and the run then had 16 to 26 minutes with nothing new before the Jump.
- Pay. The buyers' mark-ups come down until, on the five gate seeds, the routing bot's earnings at 2.5 hours are 1.25 to 1.6 times the never-taking bot's at the median seed and under 1.9 on every seed; the contract bonus is then about 10 to 25 % of income.
- The bot routes well: it adopts the rules engineer's scripted router (at the take, after every warp-out and every 20 s while the light is not green, the move that raises the pace most, with no fleet budget; seams and claims never take drones from the routes of an ore the contract still wants), so it meets 60 to 85 % of what it takes and the spread between seeds narrows.
- The threshold comes back down to where the median seed's first Jump is about 2 h 30.
- The gate, hard, on each of the five seeds: the first Jump between 1 h 55 and 3 h 05 (`JUMP_GATE`; no extra margin); the nothing-new stretches as before (12 minutes before the first Jump, 6 in the first 30, 25 after it); run 2 reaches run 1's earnings within 70 % of run 1's time; both offline gates; the drill-bound share as before. Soft: the median seed's first Jump inside 2 h 15 to 2 h 45 (`JUMP_TARGET`, validate warns); run 2 within 60 %; router against never-taker 1.25 to 1.6 at the median seed and under 1.9 on every seed (validate warns, from `--compare true`); pods and Dark Matter per hour; the hint path's first ring-2 claim between 3:45 and 6:00.
- Two sweeps. If a hard target still misses after them, the best set ships, with which seed misses what and by how much, and the gate stays as written: the lead decides then.

#### Numbers of the last balance round

What changed (scripts/content/build-space.py; game.json regenerated, `npm run sync` run, store files unchanged):

- **Contract pay**: `contractMultScale` 0.2 (was 1): multipliers 1.12 / 1.18 / 1.24 / 1.32 / 1.4 for rings 1 to 5 (were 1.6 / 1.9 / 2.2 / 2.6 / 3.0); `raiseMult` 0.1 (was 1); `jitter` 0.05 (was 0.1, the new knob `contractJitter`: at these mark-ups a jitter of 0.1 would draw "x1.0" in ring 1). The lead's starting point (about 0.6 of the mark-ups, the raise bonus halved) was far too rich once the bot routes well; see the sweeps below.
- **Prestige threshold** 2.2e8 (was 3e8), read off the five seeds' lifetime curves (cores ≥ 20 at lifetime ≥ 16 × threshold) so the median seed crosses near 2 h 30.
- **Bot** (src/engine/haul/bot.ts): the router of Decision 63; the evaluate rows of Decision 63 (`JUMP_GATE`, `JUMP_TARGET`, run 2 at 70 % hard and 60 % soft, the router ratio 1.25 to 1.6); `fleetShare` is no longer read by the bot (only the legacy `contractStation` helper reads it). Validate passes `--compare true` and warns on the two cross-seed soft targets.
- **Found on the way** (rules, fixed by the lead as `fillsFreighter`): the autopilot stopped launching for good once a full hold's float sum missed F by more than 1e-9 (seen at F = 18,691,582 on seed 2026 at 10 h: the station then earned 12 % of its income in the hour). The bot's manual launch and the hint engine's "hold full" use the same helper now.

Sweeps (2.5 h, earnings of the routing bot against the never-taker on the same seed; seeds 12345 / 4 / 99 / 7 / 2026). Sweep 1: mark-up scale 0.6 with raiseMult 0.5: 2.44 on seed 12345 (contract bonus 37 % of income); 0.5 / 0.25: 1.25 / 2.70 / 2.27 / 3.27 / 2.70; 0.4 / 0.3: 1.46 / 1.40 / 2.58 / 1.05 / 2.38. Sweep 2: 0.3 / 0.15: 1.67 / 3.01 / 1.60 / 1.61 / 1.35; 0.2 / 0.1: 1.58 / 1.32 / 1.80 / 1.60 / 2.11 (shipped, with the jitter at 0.05). With no mark-up at all (scale 0, raiseMult 0) the router earns 0.64 to 0.96 times the never-taker: routing for a contract costs income, so the bonus has to pay for that before it adds. The never-taker's own earnings at 2.5 h range from 1.47e9 (seed 2026) to 2.87e9 (seed 12345) while the router's range from 2.9e9 to 3.8e9: the per-seed ratio is mostly the never-taker's luck, and no single pay puts every seed under 1.9.

**Measured at the end of the last balance round (shipped game.json, 12 h with Jumps, seeds 12345 / 4 / 99 / 7 / 2026; `npm run simulate -- space-miner --hours 12 --prestige --seed n --passive false --compare true`).** First Jump 2 h 47 / 2 h 42 / 2 h 33 / 2 h 22 / 2 h 29 (all inside the hard 1 h 55 to 3 h 05; median 2 h 33, inside 2 h 15 to 2 h 45). Run 2 reaches run 1's Jump earnings at 33 / 66 / 44 / 61 / 34 % of run 1's time (hard 70 %: met; aim 60 %: missed on seeds 4 and 7). Taken contracts met by the router 71 / 78 / 68 / 66 / 73 % (60 to 85 %: met on all five; it was 33 to 49 %). Earnings with contracts against never taking one at 2.5 h: 0.88 / 1.57 / 1.74 / 1.43 / 2.40 (median 1.57, inside 1.25 to 1.6; seed 2026 over 1.9). Contract bonus 15.6 / 14.2 / 22.3 / 15.3 / 21.9 % of income (aim 10 to 25 %: met). Pods per hour in hours 1 and 2 of the run: 6 and 4 / 5 and 4 / 6 and 4 / 6 and 6 / 5 and 4; Dark Matter from them 4.2 and 2.8 / 3.5 and 2.8 / 4.2 and 2.8 / 4.2 and 4.2 / 3.5 and 2.8 (inside on all five). Offline with the ad bonus against an hour of play at most 0.35 / 0.39 / 0.38 / 0.43 / 0.52 (≤ 0.60: met); against an hour of watching at most 0.84 / 1.01 / 0.68 / 0.76 / 0.77 (≤ 0.90: missed on seed 4 at minute 30 only, where the router had 13 of 24 drones on a copper rock with 72 s of drilling left; that hour of watching earns half the income line once it dries). The hint path's first ring-2 claim at 4:09 / 4:09 / 4:24 / 4:09 / 4:24 (3:45 to 6:00: met).

Hard targets the gate still misses (validate fails): the longest stretch with nothing new before the first Jump, 18:19 / 24:26 / 22:18 / 25:14 / 24:18 (target 12 min; it ends 2 to 44 minutes before the Jump), and 6:13 / 7:04 / 5:59 / 8:40 / 9:45 in the first 30 minutes (target 6, met only on seed 99); after the first Jump 31:24 / 33:06 / 37:40 / 47:05 / 27:05 (target 25); something new drawn on the map 39:29 / 59:15 / 32:05 / 26:07 (met) / 46:35 (target 30 min); offline against watching on seed 4 (1.01 at minute 30). The dead stretches were missed before this round too (16 to 26 minutes on every seed): every slot is claimed by 1 h 02 to 1 h 57 (1 h 50 to 2 h 20 is the soft target) and between rig tier 20 and tier 35 nothing new is drawn, so the last hour of a run has only rig levels and freighter levels to buy. The knob the specification names first (the claim ring factor) is at its floor, and 17 made the stretches longer (finishing round); closing them needs content (a rig tier or hull between levels 20 and 35, or later claims), which is the lead's call.

Knob table (`python3 scripts/content/build-space.py --table`; * = shipped value differs from the specification's starting value):

| Knob | What | Range | Spec | Shipped |
|---|---|---|---|---|
| prestigeThreshold | lifetime credits per core squared (Decision 63: median seed's first Jump about 2 h 30) | 100000.0 to 10000000000.0 | 2000000.0 | 220000000 * |
| coreScale | cores scale | 1 to 20 | 5 | 5 |
| offlineHours | offline cap, hours | 4 to 8 | 6 | 6 |
| offlineEfficiency | offline efficiency (at most 0.45) | 0.3 to 0.45 | 0.45 | 0.45 |
| oreRatio2 | copper / iron | 4 to 6 | 5 | 5 |
| oreRatio3 | ice / copper | 4 to 6 | 5 | 5 |
| oreRatio4 | titanium / ice | 4 to 6 | 4.8 | 4.8 |
| oreRatio5 | platinum / titanium | 4 to 6 | 5 | 5 |
| ringOreShare | share of a ring's own ore in its rock stream (rings 2 to 5) | 60 to 90 | 70 | 85 * |
| startPile | units on slot 0 at the start | 5 to 10 | 8 | 8 |
| rigLevel | drill per rig level | 1.25 to 1.45 | 1.35 | 1.4 * |
| rigGrowth | rig cost growth | 1.45 to 1.8 | 1.6 | 1.6 |
| claimBase | claim cost of ring 1 slot 0 (tune, no range stated: 10 to 40 assumed) | 10 to 40 | 13 | 14 * |
| claimRing | claim cost per ring | 15 to 30 | 20 | 15 * |
| claimJ | claim cost per slot within a ring | 1.4 to 2.5 | 1.6 | 1.5 * |
| droneCapacity | units a drone carries at capacity level 1 (Decision 44) | 4 to 6 | 4 | 5 * |
| capacityGrowth | drone capacity per level (knob: haul binds) | 1.2 to 1.35 | 1.25 | 1.25 |
| droneGrowth | drone cost growth (knob: fleet taps) | 1.35 to 1.6 | 1.45 | 1.45 |
| capacityCostGrowth | capacity cost growth (knob: fleet taps) | 1.45 to 1.8 | 1.55 | 1.55 |
| freighterCap | freighter capacity at level 1 (Decision 44: the tutorial rig step must pay) | 12 to 24 | 12 | 20 * |
| freighterGrowth | freighter cost growth (knob: freighter binds) | 1.45 to 1.8 | 1.6 | 1.5 * |
| autopilot | Dock Autopilot price | 80 to 110 | 90 | 90 |
| bonanza | bonanza chance of a new rock | 0.03 to 0.06 | 0.04 | 0.06 * |
| bonanzaDrill | bonanza drill (knob: run 2) | 2 to 3 | 2 | 3 * |
| seamMin | seam interval, low end (knob: drags) | 60 to 90 | 90 | 90 |
| seamMax | seam interval, high end (knob: drags) | 100 to 150 | 150 | 150 |
| contractLaunches | warp-outs a taken contract has to deliver everything (Decision 56: 6) | 4 to 8 | 6 | 6 |
| offerLaunches | warp-outs an offer stays on the board | 8 to 16 | 12 | 12 |
| raiseLo | contract raise over what the station ships, low end (Decision 56) | 0.1 to 0.5 | 0.25 | 0.25 |
| raiseHi | contract raise, high end (Decision 56) | 0.3 to 1.0 | 0.6 | 0.6 |
| raiseMult | contract multiplier added per unit of raise (a harder contract pays more) | 0 to 2 | 1 | 0.1 * |
| fee | delivery fee on the rest of a met cargo | 0.05 to 0.15 | 0.1 | 0.1 |
| fleetShare | legacy: share of the fleet contractStation sends (the bot no longer reads it) | 0.3 to 0.7 | 0.5 | 0.5 |
| contractMultScale | contract multipliers: share of the specification's mark-up over x1 (Decision 63) | 0.1 to 1 | 1 | 0.2 * |
| contractJitter | contract multiplier jitter (each side) | 0 to 0.2 | 0.1 | 0.05 * |
| podsDepleted | a Scrap Pod every n-th dry rock (pods per hour) | 4 to 16 | 6 | 8 * |
| podsContracts | a Scrap Pod every n-th contract met (pods per hour) | 4 to 16 | 4 | 8 * |
| headStartRig | rig level of head-start slots (knob: run 2) | 4 to 10 | 4 | 6 * |
| efficiencyCap | offline efficiency cap of the haul rules (gate measured with the ad bonus) | 0.25 to 0.45 | 0.45 | 0.45 |
| partsBase | module parts for level 2 | 2 to 4 | 3 | 3 |
| partsGrowth | module parts growth per level | 1.25 to 1.45 | 1.35 | 1.35 |
