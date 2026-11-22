# Haul engine notes (Orbit Haulers rules package)

Owner: the haul engine package. Files: `src/engine/haul.ts` (the one public index) and
`src/engine/haul/{types,params,create,trade,tick,actions,rates,jump,hints}.ts`,
`src/engine/loadout.ts`, `src/config/schema.haul.ts`, `src/engine/fixtures/haul.ts`, tests
`src/engine/haul*.test.ts` (including `haul.audit.test.ts` and `haul.rulings.test.ts`), `src/engine/loadout.test.ts`, `src/config/schema.haul.test.ts`.

## Changed in the second pass (22 Nov 2026, after the audit)

Nothing was renamed. These existing exports changed shape or meaning:
- `reconcileHaul(cfg, base, raw)` now returns `HaulGame` (was `HaulGame & { haul: HaulState }`): the
  run is `null` while a confirmed Jump waits for its condition (`haulStats.pendingJump`, errata 17).
  Every other save still gets a run. Reason: a restart during the Jump's spend step must come back to
  it, not to a fresh galaxy-0 run.
- `HaulStats` gained `bestRing`, `contractsSeen`, `autopilotSeen` (story triggers, errata 21) and
  `pendingJump: PendingJump | null` (errata 17). `SeamState` gained optional `peak` (the seam-drag
  high-water mark). `JumpPreview` gained `ready` (errata 22). `OfflineReport` gained `shipped` and
  `launches`. `HaulEvent` gained `{ type: 'dry', slot }` (errata 19).
- `stats.launches` / `counters.launches` count at the warp-out, not at the swipe (errata 23), and
  fastForward adds `floor(shipped / F)` (errata 36).
- `haulOffline` returns its game stamped with `lastSavedAt = now` and `stats.clockHigh ≥ now`: calling
  it again on that game pays nothing (it used to pay the same hours twice).
- `fastForward` moves the freighter by the real seconds away (a 1 s trip to the background no longer
  docks an away freighter or pays a climbing one early), ships only what the freighter limit pays for
  (the rest stays in the hold instead of being deleted), and without the autopilot fills the hold only
  as fast as the drones could. `unitsByOre` is now what the offline freighter shipped.
- `contractGain` counts the contract's missing units (errata 26); `claimedRings` counts only rings with
  a rock present (errata 27); contract draws use the 'contract' stream and two-ore contracts keep two
  different ores (errata 27). The contract stream changed, so every seeded table that lists contracts
  (the bot's) must be regenerated.
- `claimCost` is Infinity beyond one ring past the highest claimed ring (errata 29).
- `bonanzaChance` is capped at `haul.bonanza.maxChance` (0.5, errata 71).
- `prestigeHaul(cfg, g, now, traitId, buys)` keeps its signature and result; it is now
  `confirmJump` + `buyStarNode` for each buy + `startGalaxy`.
- Content (`HaulSchema`, `HAUL_STARTING_CONTENT`): `seam.minInterval` 30 (was 10), new
  `seam.retrySeconds` 30, `flare.maxCharges` 4, `bonanza.maxChance` 0.5, `jumpReadyCores` 20, Prospect
  Survey cap 11 (was uncapped), Frost Surplus ice weight on rings 3 and 4 (was 2 to 4).

Added exports: `confirmJump`, `startGalaxy`, `ghostSlots`, `highestClaimedRing`, `emptyHaulStats`,
`claimedRingMax`, `fittedBonuses` (loadout), types `PendingJump`.

Import everything from `src/engine/haul` (and `src/engine/loadout`), never from `src/engine/haul/*`.
The engine never imports `economy.ts`, `meta.ts`, `chain.ts` or `view.ts` (they still pull the
restaurant chain); it imports only `rng.ts`, `cards.ts`, `types.ts` (types) and the config schema.

## Interface (frozen at 10:45 UTC, 22 Nov 2026)

After this moment exports may be added, never renamed or reshaped. All functions are pure and
return a new object; actions return the SAME object when refused (`next === state` means "not
allowed"). Every action and the tick take an optional `events?: HaulEvent[]` to collect events.

### Types (`src/engine/haul/types.ts`)
- `HaulConfig = GameConfig & { haul: HaulContent }` (2.1).
- `HaulGame = Omit<GameState,'stats'> & HaulTopLevel & { stats: GameState['stats'] & HaulLifetimeStats }`.
- `HaulTopLevel { haul: HaulState | null; metaSeed; loadout: { sockets: (string|null)[] }; starMap: StarMapState; haulStats: HaulStats }` (2.2).
- `HaulLifetimeStats { hauled, launches, contractsMet, depleted, claims, seamDrags, transmissionsAcked }` (2.2, 5.3).
- `HaulStats { bestClaimed, jumps, galaxiesVisited: number[], ring2Pod: boolean, bestRing, contractsSeen, autopilotSeen, pendingJump: PendingJump | null }` (last four: second pass).
- `StarMapState { levels: Record<string, number>; spent }`.
- `HaulState` (2.2) with: `clock, seed, galaxy, trait, slots: SlotState[], fleet {drones, capLevel, engineLevel}, idle, hold, freighter: FreighterState, autopilot {online, policy}, contracts {unlocked, board: Contract[], next, active}, vein: SeamState & {nextAt, count}, flare: SeamState & {charges, nextFreeAt, adsToday, adDay, adNextAt}, keeper, flags, hintsShown, marks {idleSince, holdFullSince, noContractSince, flareReadySince}, counters {launches, contractsMet, depleted, hauled, claims, drilled, shipped}`.
- `SlotState { claimed, rigLevel, haulers, rockN, ore, bonanza, life, pile, full, respawnAt, routeFrom, delivered }` (rockN −1 while a claimed slot's first rock drifts in).
- `FreighterState { level, phase: 'docked'|'climb'|'away'|'land', t (seconds left in phase), cargo, payout (priced at launch), met, away, contract (k or null) }`.
- `SeamState { slot: number|null; until; guests: number[] }` (guest origin −1 = rack).
- `Contract { k, buyer, wants: {ore, units}[], mult, launchesLeft }`.
- `HaulEvent` union: `arrive{slot, ore, bonanza, oreChanged}`, `unload{slot, units}`, `pileFull{slot}`, `depleted{slot}`, `holdFull`, `launch{cargo, auto}`, `warp{payout, met, cargo}`, `contractMet{contract}`, `contractLapsed{contract, wasActive}`, `contractNew{contract, index}`, `contractsUnlocked`, `land`, `docked`, `vein{slot, flare}`, `veinEnd{slot, flare}`, `flareCharge{charges}`, `claim{slot}`, `podEarned{pod, reason}`, `tutorialDone`.
- `HaulParams`, `SlotParams` (2.3; see the file for fields), `OfflineReport` (2.11, Shift Log), `HaulHint` (3), `StarNodeView`, `JumpPreview` (4.6), `SlotRate`, `SlotReadout`, `Rock`.

### Config (`src/config/schema.haul.ts`)
- `HaulSchema` (zod) and `HaulContent`/`HaulContentInput`; parts `HaulOreSchema`, `HaulRingSchema`, `RigTierSchema`, `HaulConditionSchema`, `StarNodeSchema`, `HaulModuleSchema`, `HaulBuyerSchema`.
- `HAUL_SOCKETS = ['rig','fleet','dock']`, `HAUL_MODULE_STATS`, `STAR_EFFECTS`.
- `lintHaul(haul, cardIds?, chestIds?) → string[]` cross-field checks.
- `HAUL_STARTING_CONTENT`: the specification's starting values (what build-haul.py starts from).

### Creation and saves (2.2, 2.10, 5.4)
- `isHaul(cfg): cfg is HaulConfig`.
- `withHaulFields(cfg, base: GameState) → HaulGame` adds every haul field to a fresh shared state (store's new game).
- `createHaul(cfg, seed, galaxy, trait, starMap, haulStats, entitlements) → HaulState`.
- `reconcileHaul(cfg, base: GameState, raw: unknown) → HaulGame` repairs a loaded save; never throws.
- `runStartCash(cfg, starMap)`, `headStartSlots(cfg, level, bestClaimed)`, `placeRock(...)`, `EMPTY_LIFETIME`.

### Derived values and prices (2.3, 2.5)
- `haulParams(cfg, g) → HaulParams` (everything of 2.3; recomputed per step).
- `rockAt(cfg, seed, slot, n, trait, starMap) → {ore, life, bonanza}`.
- `rigTier(cfg, level)`, `engineMult`, `freighterCapacity`, `awayBase`, `droneCapFor(cfg, galaxy, products)`, `orePrice`, `bonanzaChance`, `T`, `Tore`, `ringWeights`, `starLevel`, `condition`, `slotTable`, `slotCount`, `ringOf`, `holdTotal`, `sumUnits`, `wantedOres`, `seamOn`, `haulGlobalMultiplier`, `geometricCost`, `rngMix4`, `EPS`, `MAX_CASH`.
- Costs (Infinity when not buyable): `rigCost(cfg,g,slot)`, `claimCost(cfg,g,slot)`, `droneCost`, `capacityCost`, `engineCost`, `freighterCost`, `autopilotCost`; `affordable(cash, cost)`.

### The tick (2.4)
- `advanceHaul(cfg, g, dt, now, events?) → HaulGame`. Steps ≤ `STEP` (0.25 s), dt cut at `MAX_TICK` (3600 s). Adds `stats.playSeconds += dt` (the shared tick must not add it again). Cash from warp-outs goes through the earn clamp (cash, runEarnings, lifetimeEarnings).
- `autopilotWants(params, h)`.

### Player actions (2.5)
`assignDrone(cfg,g,slot)`, `moveDrone(cfg,g,from,to)`, `recallDrone(cfg,g,slot)`, `canLaunch(g)`, `launch(cfg,g)`,
`upgradeRig(cfg,g,slot)`, `claimSlot(cfg,g,slot)` (`CLAIM_DRIFT` 1.5 s), `buyDrone`, `buyCapacity`, `buyEngine`,
`buyFreighter`, `buyAutopilot`, `setPolicy(cfg,g,'full'|'contract')`, `pickContract(cfg,g,index|null)`,
`canFlare(g,slot)`, `useFlare(cfg,g,slot)`, `canAdFlare(cfg,g,day,now)`, `grantAdFlare(cfg,g,day,now)` (`day` = `economy.dayKey(now)`),
`fitModule(cfg,g,socket,cardId|null)`, `ackTransmission(cfg,g)` (Derelict Cache every 4th), `markHintShown(g,key)`.

### Loading, payout, contracts (2.6)
`loadCargo(cfg, params, hold, contract)`, `payoutFor(params, cargo, contract, keeper, forceMet?)`,
`contractMet(cargo, contract)`, `activeContract(h)`, `contractGain(cfg, params, h, index)`,
`contractMissing(h, index)`, `contractAt(cfg, seed, k, rings, F, trait, station?)`, `claimedRings(cfg, h)`, `openBoard(cfg, h, F, params?)`,
`contractStation(cfg, params, h)` → `{ present, reach(ores) → { now, routed } }` (Decision 32: units per launch of each ore with the
routes as they are and after `fleetShare` of the fleet is sent there; a contract's units are `now + λ (routed − now)`, λ = U(reach)).
`grantHangarDrones(cfg, g, productId)` (Decision 37). The pure balance bot: `src/engine/haul/bot.ts` (Decision 39).

### Rates and offline (2.11)
`slotRates(cfg, params, h) → SlotRate[]`, `freighterRate(params)`, `activeRate(cfg, params, h)`,
`steadyRate(cfg, params, h)`, `haulIncome(cfg, g)` (= activeRate of a game),
`fastForward(cfg, g, seconds, efficiency) → {game, report}`, `haulOffline(cfg, g, now) → {seconds, earnings, report, game}`.

### Jump and Star Map (2.10)
`totalCores(cfg, lifetime)`, `coresAvailable(cfg, g)`, `coresInHand(g)`, `coresAfterJump(cfg, g)`,
`starNodeLevel(g, id)`, `starNodeCost(cfg, id, level)`, `starMapView(cfg, g)`, `buyStarNode(cfg, g, id)`,
`offersFor(cfg, metaSeed, jumpIndex, currentTrait)`, `galaxyName(cfg, galaxy)`, `jumpPreview(cfg, g)`,
`prestigeHaul(cfg, g, now, traitId, buys?)`.

### Hints (3)
`hintsFor(cfg, g) → HaulHint[]` (the HintSource `ask`), `nextHint(cfg, g)`, `hintKey(h)`,
`bestSlotForDrone(cfg, g)`, `busiestRoute(h, except?)`, constants `IDLE_HINT_SECONDS`, `HOLD_HINT_SECONDS`,
`CONTRACT_HINT_SECONDS`, `FLARE_HINT_SECONDS`, `LIMITED_HINTS`.

### Screens and bot helpers
`slotReadout(cfg, g, slot) → SlotReadout` (Rig sheet), `routeLimits(cfg, g)` (bound-by-one-limit measure),
`routeTable(cfg, g)` (scene: angle, distance, trip, drones, warm-up per claimed slot).

### Loadout (`src/engine/loadout.ts`, 5.1)
`SOCKET_COUNT`, `socketType(i)`, `socketIndex(type)`, `moduleOf(cfg, cardId)`, `emptyLoadout()`,
`normaliseSockets(x)`, `canFit(cfg, state, i, cardId)`, `equip(cfg, state, i, cardId|null)`,
`moduleValue(cfg, state, cardId)`, `fittedModules(cfg, state)`, `fittedBonus(cfg, state, stat)`.

### Fixtures (`src/engine/fixtures/haul.ts`)
`haulTestConfig(overrides?)`, `haulFixtures` / named states `fresh`, `minute3`, `midGame`, `late`, `afterJump`.

Additions after the freeze (no renames): `shareFreighter(rates, Q)` (rates.ts); in the second pass
`confirmJump(cfg, g, now)`, `startGalaxy(cfg, g, now, traitId)`, `ghostSlots(cfg, g) → number[]`,
`highestClaimedRing(cfg, h)`, `emptyHaulStats()`, `claimedRingMax(cfg, h)` (1-based), `fittedBonuses(cfg, state)`.

### The Jump flow (errata 17)
1. `jumpPreview(cfg, g)`: `{gain, coresInHand, canJump (gain ≥ 1), ready (gain ≥ jumpReadyCores), offers, nextGalaxy, nextGalaxyName}`.
2. `confirmJump(cfg, g, now)`: cores credited, `haul = null`, cash 0, run earnings 0, cash upgrades dropped,
   `haulStats.pendingJump = {index, galaxy, seed, offers}`. Save it: a restart comes back to step 3.
3. `buyStarNode(cfg, g, id)` any number of times (`starMapView` with the new cores in hand).
4./5. `startGalaxy(cfg, g, now, traitId)` with one of `pendingJump.offers`: builds the run with every
   node bought so far, cash = run start cash, Derelict Cache on a first arrival.
Nodes bought mid-run: Prospect, Seam Sense, Assay Rights, Broker Seat act at once; Systems Preload,
Seed Credits, Spare Drones, Afterburner first act at the next run start. While `pendingJump` is set,
`advanceHaul` and every run action return the game unchanged, `hintsFor` is empty, `haulIncome` is 0.

### Events (`HaulEvent`): the sound and haptic table and the scene hook onto these

Collected by passing `events: HaulEvent[]` to `advanceHaul` or to an action that takes it
(`assignDrone`, `moveDrone`, `recallDrone`, `launch`, `upgradeRig`, `claimSlot`, `buyDrone`,
`buyCapacity`, `buyEngine`, `buyFreighter`, `buyAutopilot`, `useFlare`, `grantAdFlare`,
`ackTransmission`). `fastForward` and `haulOffline` emit none (the Shift Log is the report).

| Event | Payload | When | Suggested cue |
|---|---|---|---|
| `arrive` | `slot, ore, bonanza, oreChanged` | a rock drifts in (respawn, or rock 0 1.5 s after a claim; `oreChanged` false for the first) | rock_arrive; bonanza: bonanza sparkle |
| `unload` | `slot, units` (= c of that route) | each time a route's delivered units pass a multiple of c (at most 4 per slot per step) | hold band, soft tick |
| `pileFull` | `slot` | the pile reaches its cap while the drill outruns the drones (edge) | FULL lamp |
| `dry` | `slot` | the rock's life reaches 0 with ore still on its pile (errata 19) | rock_dry, Dry rock drawing |
| `depleted` | `slot` | the rock crumbles (life and pile both 0) | rock_crumble |
| `holdFull` | none | the hold reaches F without the autopilot (edge) | swipe prompt |
| `launch` | `cargo, auto` | a launch (swipe or autopilot); cargo by ore | freighter_launch |
| `warp` | `payout, met, cargo` | the warp-out: credits added now | warp_out, coin |
| `contractMet` | `contract` | at the warp-out, the loaded contract was met | contract_met |
| `contractLapsed` | `contract, wasActive` | a board contract ran out of launches | DISPATCH line |
| `contractNew` | `contract, index` | a board slot got a new contract (after met or lapsed) | card slide-in |
| `contractsUnlocked` | none | the board opens (4th warp-out after 90 s, galaxy 0) | system_online |
| `land` | none | the freighter starts landing | freighter_land |
| `docked` | none | the freighter is docked again | dock clamp |
| `vein` | `slot, flare` | a rich seam starts (natural, or a flare) | seam_start |
| `veinEnd` | `slot, flare` | a seam ends (time up, or its rock crumbled); guests have gone home | seam_end |
| `flareCharge` | `charges` | a flare charge is added (free timer or ad) | flare_ready |
| `claim` | `slot` | a slot is claimed | claim_slot |
| `podEarned` | `pod, reason` (`ring2`, `contracts`, `depleted`, `transmissions`, `galaxy`) | a pod went into the inventory | pod_earned |
| `tutorialDone` | none | once per run: autopilot online, galaxy > 0, or slot 1 claimed with a drone | none |

### Lifetime stats for the story triggers (errata 21)
`launches {count}`: `stats.launches` (warp-outs). `ring {ring}`: `haulStats.bestRing` (1-based).
`contracts`: `haulStats.contractsSeen`. `system`: `haulStats.autopilotSeen`. `galaxy {index}`:
`haul.galaxy ≥ index` (or `pendingJump.galaxy` between galaxies). `jumpReady`: `jumpPreview(cfg, g).ready`.

## Shared-file changes the tech lead must make

None of these are made by this package; everything compiles and passes without them.

1. `src/engine/types.ts` (`GameState`): add `haul: HaulState | null`, `metaSeed: number`,
   `loadout: { sockets: (string | null)[] }`, `starMap: StarMapState`, `haulStats: HaulStats`
   (types from `src/engine/haul/types.ts`; make them optional or null-valued for sim/classic), and in
   `stats`: `hauled, launches, contractsMet, depleted, claims, seamDrags, transmissionsAcked` (numbers,
   0 by default). Then `HaulGame` is simply `GameState` (replace its definition by an alias).
2. `src/config/schema.ts`: `GameConfigSchema` gains `haul: HaulSchema.optional()` (import from
   `./schema.haul`); `lintGameConfig` for `mode === 'haul'`: require `haul`, push
   `lintHaul(cfg.haul, cfg.meta.cards.map(c => c.id), cfg.meta.chests.map(c => c.id))`, require
   `economy.prestige.bonusPerPoint === 0`; `bonusPerPoint` becomes `z.number().min(0)`; `businesses`
   optional for haul (spec 2 header). Then `HaulConfig` is `GameConfig & { haul: HaulContent }` (keep).
3. `src/config/schema.sim.ts` `CARD_STATS`: append `HAUL_MODULE_STATS` (so module cards can declare
   their real stat; the engine reads the stat from `haul.modules`, not from the card, so this is
   cosmetic). **No change to `cards.ts`/`cardBonus` is needed**: haul code calls `fittedBonus`
   directly and never `cardBonus`, so Pizza's path is untouched by construction.
4. `src/engine/rng.ts`: add `rngMix4` (identical to `src/engine/haul/params.ts`'s; then make that one
   a re-export).
5. `MISSION_TYPES` (`schema.sim.ts`) and the mission counters in `meta.ts`: `hauled, launches,
   contracts (stats.contractsMet), depleted, claims, seamDrags`, all reading `GameState.stats`.
   Acknowledging a transmission in Comms must call `ackTransmission(cfg, g)` (counts it, Derelict
   Cache every 4th).
6. The haul engine mode (`src/engine/haulMode.ts` or the tech lead's equivalent):
   `create(cfg, now) = withHaulFields(cfg, createInitialState(cfg, now))`;
   `tick = advanceHaul` (it adds `stats.playSeconds` itself: the shared tick must not add it again;
   its events are `HaulEvent`, not `GameEvent`);
   `activeIncome = haulIncome` (missions' "seconds of income", pod credits, Time Warp, the readout);
   `income` (offline only) = `steadyRate(cfg, haulParams(cfg, g), g.haul)`;
   `offline(cfg, g, now) = haulOffline(...)` → grant `earnings` (doubled with the ad), keep `game`
   (it is already stamped with `lastSavedAt = now`; do not stamp an older time back onto it);
   `prestige(cfg, g, now, traitId, buys) = prestigeHaul(...)` for the one-call form, or the Jump flow
   screens call `confirmJump`, `buyStarNode`, `startGalaxy` (see "The Jump flow"); `reconcile =
   reconcileHaul(cfg, base, raw)`, whose `haul` may be null while `haulStats.pendingJump` is set:
   the shell then opens the Star Map in its spend step instead of the station.
7. Store actions: one per action in `haul.ts` (they return the same object when refused). The
   rewarded flare passes `day = economy.dayKey(now)` to `grantAdFlare`. Hints shown with a `limit`
   call `markHintShown(g, hint.key)` once when they first appear.
8. IAP `unlock` kind: owning `space_hangar` must put its product id into `entitlements.products`
   (the engine reads `cfg.haul.hangar.product` there for the drone cap and the start drones).
9. Story triggers (errata 21): `launches` reads `stats.launches`; `ring` reads `haulStats.bestRing`;
   `contracts` reads `haulStats.contractsSeen`; `system` reads `haulStats.autopilotSeen`; `galaxy`
   reads `haul.galaxy`; new `jumpReady` (beat 8) reads `jumpPreview(cfg, g).ready`. Add `jumpReady`
   to the story trigger kinds in `schema.sim.ts` (or wherever the trigger union lives).
11. Ghost slots and the claim sheet: draw ghosts for `ghostSlots(cfg, g)` only; `claimCost` is
   Infinity for every other unclaimed slot.
12. Rewarded flare: hide the ad button when `canAdFlare` is false (it now also covers the 4-charge cap).
13. The shared schema now requires `soundPack`. Another engineer has added `"soundPack": "synth"` to
   `src/engine/fixtures/base-game.json` (uncommitted, not this package's change); `haulTestConfig`
   also falls back to `'synth'` when it is missing, so the haul tests pass with or without it.
10. Hint source: `src/ui/hints/source.ts`'s `Hint` is `{key, route, row}`; `HaulHint` has those plus
   `kind, from, to, zone, step, limit`, so `ask: () => hintsFor(cfg, game)` fits as is.

## Where the specification was wrong, contradictory or missing, and the reading chosen

- **activeRate and the full bonus (2.11).** The formula leaves out the x1.1 full-launch bonus, but a
  steady station with the autopilot on `full` ships only full holds, so the simulation earns 10 %
  more and test 6 (5 %) cannot pass. `activeRate` includes `fullBonus`.
- **The freighter limit (2.11).** `scale = min(1, Q / Σ q)` scales every route alike. In play the hold
  refills in proportion to each route's haul rate and a route whose drones outrun its drill catches
  up from its pile while the freighter is away, so the freighter's share goes to the drill-bound
  (usually far, valuable) routes first. Against the simulation the uniform scale was 12.6 % low on a
  freighter-bound mixed station. Replaced by water-filling, `x_i = min(q_i, λ h_i)` with Σ x = Q
  (`shareFreighter`); over 4 station shapes x 20 seeds the error is now within 3.1 %.
- **fastForward's walk (2.11)** uses `min(rb, h_i)` with the real haul rate, which ignores the
  freighter limit and walks rocks faster than play on freighter-bound stations. The walk uses
  `λ h_i` for throttled routes. On one shape that sits exactly on the edge of the share (q/h within
  3 % of λ) the walk can end up to 2 rocks ahead of the simulation on a route; elsewhere within 1.
- **Test 7 wording**: "within 1 dried rock per slot" and "ends on the same rock index per slot" cannot
  both be meant strictly; the test checks the rock index within 1 (2 on the edge shape above).
- **Pile above cap after a seam in fastForward**: the rule "pile set to cap" would push drilled ore
  back into the rock; the pile now drains at most by what was moved (found by the property test).
- **The Jump flow (2.10)**: the example ("Run 2 starts with the autopilot online ... ₵1,000") needs
  the cores of this Jump to be spent before the new run is built, but the state model gains cores
  only at the Jump. `prestigeHaul(cfg, g, now, traitId, buys)` buys the listed nodes after adding the
  gain and before building the run; `coresAfterJump` gives the planning budget. Nodes can also be
  bought at any time with cores in hand.
- **Flare and natural seam at once (2.4/2.5)**: the state has one `vein`, but a flare may go on any rock
  "not on a rock that already has the seam" while a natural seam runs elsewhere. The flare has its own
  seam (`flare.slot/until/guests`); one flare seam at a time; the natural seam never picks the flare's slot.
- **Seam Sense**: "seams 10 s more often" read as 10 s off each interval per level, with a 30 s floor
  (errata 20; was 10 s in the first pass).
- **Free flare charge while stored** (errata 33): the free timer runs only while no charge is held
  (`charges < maxStored`, which is 1) and waits, with its time left, while any charge is held; ad
  charges are capped with everything else at `flare.maxCharges` (4).
- **Contracts unlock** reads lifetime `stats.launches` (only galaxy 0 waits). From galaxy 1 the board
  opens at run start with contract 0 (the fixed Halden contract) active again.
- **Once-per-game ring-2 pod**: needs state the spec did not list; `haulStats.ring2Pod`.
- **Afterburner**: "never more slots than bestClaimed" = the first `bestClaimed` slots of the level's list
  (slot 0 always included); head-start slots get rig level 4, slot 0 included (spec: "both ring-1 rigs").
- **Station sheet example "Drones 5/24 · Buy ₵47"**: the formula gives 10 x 1.45^4 = ₵44.2. Formula kept.
  The other sheet numbers follow ("Capacity L3 · 6.3 units · ₵72", "Engines L2 · ₵120",
  "Freighter L4 · holds 36 · ₵61", "Claim ₵260").
- **2.12 worked numbers** that follow from the formulas are tested (`haul.test.ts`, "2.12"): 0.6/s drill,
  pile 8/15, F = 12, trip 5.2 s, c = 4, h = 0.77/s, first delivery 0:06.6, hold full at about 0:22,
  ₵13.2 per full iron launch, claim ₵20.8 (shown ₵21), Halden met (10 x 1.5 + 2 x 1.1) x 1.1 = ₵18.92,
  freighter cycle 12.5 s, autopilot ₵90. The bot table (income at minutes 1 to 10, ring-2 at 5:33)
  depends on the balance bot and build-haul.py tuning, not on these formulas alone; not asserted here.
- **"A claimed ring with a rock"** (errata 27): only rings with a claimed slot whose rock is present
  (not respawning, not drifting in after a claim). With none (a moment where every rock is between
  rocks), ring 1 is used.
- **Upgrades and rock life**: life counts seconds of drilling at the current rate (2.4), so an upgrade
  never changes a rock's remaining seconds; Deep Bore's x1.5 applies to rocks that arrive after it.
- Signatures differ slightly from the spec's sketches: `rockAt`, `contractAt`, `activeRate`,
  `steadyRate`, `createHaul` take `cfg` (and the trait) explicitly.

### Second pass (after the audit and the errata)
- **Errata 36 and short gaps.** Read literally, "an away or landing one just docks" lets a one-second
  trip to the background skip the freighter's 8 s away and 2 s landing (5.4x play on a freighter-bound
  station, audit). Reading chosen: the freighter moves through its phases by the real seconds away; it
  docks (and a climbing one is paid) only when those phases end within the gap, and it ships offline
  only once docked, for the rest of the gap x efficiency. For gaps longer than one freighter cycle
  this is the ruling exactly.
- **Errata 36, "meets no contract".** The offline shipping meets none and counts none down. The
  in-flight warp-out is an ordinary warp-out: its stored payout was priced for its contract at launch
  (errata 13), so that contract is met and replaced; otherwise it could be paid twice.
- **Errata 16, the counter.** "Counts `stats.seamDrags += 1`" for every landing makes the mission free
  to farm by moving one drone off and back. A landing counts only when the guest stack grows past the
  largest size it reached during this seam (`SeamState.peak`).
- **Errata 16, the next roll after a crumble.** "Counted from that moment": the interval this seam drew
  (`nextAt − until`) runs from the crumble. The audit test that expected `nextAt < 40` for a stored
  interval of 160 s could not hold under any reading with a 30 s floor and draws of 90 to 150 s; it now
  checks the interval from the crumble.
- **Errata 34, the retry.** `vein.nextAt = clock + 30` is set at the moment of the roll (the step ends
  at `nextAt`), so the audit test now compares with that moment, not the end of the tick.
- **Errata 17, the spend step.** The ruling says the old run ends at the confirm, before the
  condition is picked; the state model had no "between galaxies" state. `haul = null` with
  `haulStats.pendingJump` is that state (saved, so a restart returns to it).
- **Errata 33 and ad charges at the cap.** With 4 charges no ad is offered, even on a new day (the
  first-pass test expected one).
- **Errata 23 and hints.** Tutorial step 3 ("one more drone") and the autopilot hint read
  `stats.launches`, so they now follow the first and fourth warp-out, when the credits exist.
- **Errata 26** gives a contract's gain even with an empty hold; the scripted fixture player picks by
  it, so the fixtures changed.
- **Slot 0's first rock.** Slot 0's starting rock is forced to non-bonanza by
  dropping the flag and the bonanza life factor of the same draw (errata 28); the ore is unchanged.
- **Mid-game fixture.** The scripted player reaches only ring 2 by 25 min with the new contract
  stream; the fixture claims the first ring-3 slot with added credits so that `midGame` matches its
  description (rings 1 to 3).

## Verified

Second pass: `npx vitest run src/engine/haul src/engine/loadout src/config/schema.haul`: 8 files
(the audit file and `haul.rulings.test.ts` included), all green; the audit's 30-seed property test
takes about 3 minutes. `advanceHaul(3600)` on the late fixture: about 55 ms in Node (was 360 to 860 ms;
params are rebuilt only when a time event changes them). `npx tsc --noEmit` prints nothing for these
files.

## Integration step (Decisions 32 to 39)

- **Contracts** (Decision 32): `drawContract` takes the run's params when it has them (every warp-out, the
  unlock, `startGalaxy`'s second `openBoard`) and builds `contractStation` from the routes at that moment.
  The model: route rate `min(rb, n × cBase / trip)` (current rock, bonanza included, no seam, no Ore
  Sorter), one launch carries `F × r_o / R`. The re-routing model takes idle drones first, then one drone
  at a time from the other route that loses least (never a route's last), and gives it to the route of
  the ore where it adds most (to a saturated one when none adds). `createHaul` still opens a later
  galaxy's board without params (F × λ); `startGalaxy` redraws it with the new run's station, so what a
  player sees is always the station rule. The contract stream's draws (n = 1 to 7) are unchanged; only the
  ore pool (present rocks) and the units differ.
- **Fixtures** are cached per config object (a WeakMap), not once for good.
- **Hangar** (Decision 37): `createHaul` sets `flags.hangarDrones` when the product is owned at run start.

## Fix round (Decisions 40 to 55, 22 November 2026)

- **Contracts as built** (Decision 40, rules engineer's note): a contract is an offer until picked; the pick
  takes it (`taken`, `launchesLeft = haul.contracts.launches`), picking another or none drops it (event
  `contractLapsed {dropped: true}`, then `contractNew`). Units: `units_o = round(L now + λ (L−1)(routed − now))`
  clamped to `[ceil(L now (1 + margin)), floor(now + (L−1) routed)]`; `reach()` stops routing into an ore
  whose every rock is drill-bound; widening order: a route's last drone movable, then the share +0.1 up to
  `maxShare` (0.8), then a two-ore pick falls back to either ore alone, then other present ores; a one-ore
  station gets a quota contract (`round(L × F × U(quota))`, multiplier − `quotaMultCut`, at least
  `quotaMinMult`); a multi-ore station where nothing can be routed for gets the one-ore contract nearest to
  reachable at the never-free bound (met by upgrading that rig). `minUnits` and `lifetime` are no longer
  read. Interface: `contractViews(cfg, params, h, haulStats?)`, `contractBonus`, `wantLeft`, `UNIT_TOL`
  (0.5), `routeGain(cfg, g, from, to)`; `contractGain` and `contractMissing` are gone.
- **Day shift** (Decision 53): `haulShift(cfg, g, now, day)`, `shiftView`, `shiftDoubles`; the count lives in
  `haulStats.shift {day, startedAt, met}`; `haul.shift {contracts 3, minHours 16, mult 2}`.
- **Offline** (Decision 42): `haul.offline.adBonus` (0.5) is what the Shift Log's ad adds; the bot measures
  `haulOffline × (1 + adBonus)` against an hour of play and an hour of watching.
- **Hints** (Decision 44, `src/engine/haul/hints.ts`): the six guided steps in the new order (1 drag the drone
  to `rock:0`; 2 swipe; 3 `point slot:1`; 4 `point station:buyDrone` via `station`; 5 `tapTap` from
  `drone:rack` to `rock:1`, or `drag chip:0 → rock:1` when no drone is free; 6 `point rig:upgrade` via
  `rock:0`). While a guided step applies and the hold has been full for less than
  `GUIDED_PRIORITY_SECONDS` (10), the guided steps come before the swipe hint; after that the swipe goes
  first. The rules end the steps when slot 1 is claimed and worked and a claimed rig is above level 1 (or
  the autopilot is online, or a later galaxy). Tests: `src/engine/haul/hints.test.ts`.
- **The bot** (`src/engine/haul/bot.ts`): takes the offer with the highest bonus it can deliver in
  `launches` launches once it routes for it, routes until every ore is on pace with 15 % to spare, never
  drops a taken contract; `passive` takes the best-paying offer and never routes; `watch` (Decision 42)
  only watches (autopilot on `full`, nothing bought, placed, routed or taken). It reports the taken
  contracts met and lapsed, the contract bonus paid, pods per hour by reason and every purchase time.

## Finishing round (Decisions 56 to 62, numbers engineer's part)

- **`src/engine/haul/advice.ts`** (new, pure): `bestSlotForDrone`, `cheapestSource`, `withDrones`,
  `purchaseOptions`, `rankPurchases` (every purchase priced by `1 / (wait + price / gain)`, alone and
  with one partner level), `bestPurchase` (the bot's pick) and `advisedPurchase` (Decision 57: the best
  affordable single that adds at least 15 % to the income line, never the purchase made last). The bot
  shops through it; `hints.ts` imports it, never `bot.ts`, so the bot stays out of phone bundles
  (`bestSlotForDrone` is re-exported from `hints.ts` for `haul.ts`).
- **`hints.ts`**: step 6 points at `longestLifeSlot` (Decision 58); `adviceHint` (Decision 57) reads
  `marks.boughtAt` and `marks.lastBuy` (the rules write them; without them no advice shows), counts its
  showings in `hintsShown` over its keys (at most `ADVICE_MAX` 6), stops at `ADVICE_UNTIL` 900 s of run
  clock and outside galaxy 1, and maps a purchase to its target with `adviceTarget`.
- **The bot** (`bot.ts`): contracts by the pace light (section 8, finishing round), `unpark` after a
  contract, the day shift once a minute (UTC day of its simulated wall time),
  `noContracts` for condition 6's comparison, `lifetime` per minute, `earnedBy`, the `JUMP_MARGIN` gate.
  `runTutorialHuman` follows the limit hints too (claims of any slot, station levels) and marks the rows
  they caused (`advice`).
- **validate**: five seeds, the cross-seed pods and Dark Matter rule, stale screenshots, a shared
  privacy policy address.
