# Haul engine notes (Orbit Haulers rules package)

Owner: the haul engine package. Files: `src/engine/haul.ts` (the one public index) and
`src/engine/haul/{types,params,create,trade,tick,actions,rates,jump,hints}.ts`,
`src/engine/loadout.ts`, `src/config/schema.haul.ts`, `src/engine/fixtures/haul.ts`, tests
`src/engine/haul*.test.ts`, `src/engine/loadout.test.ts`, `src/config/schema.haul.test.ts`.

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
- `HaulStats { bestClaimed, jumps, galaxiesVisited: number[], ring2Pod: boolean }`.
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
`contractMissing(h, index)`, `contractAt(cfg, seed, k, rings, F, trait)`, `claimedRings(cfg, h)`, `openBoard(cfg, h, F)`.

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

Additions after the freeze (no renames): `shareFreighter(rates, Q)` (rates.ts).

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
   `offline(cfg, g, now) = haulOffline(...)` → grant `earnings` (doubled with the ad), keep `game`;
   `prestige(cfg, g, now, traitId, buys) = prestigeHaul(...)`; `reconcile = reconcileHaul(cfg, base, raw)`.
7. Store actions: one per action in `haul.ts` (they return the same object when refused). The
   rewarded flare passes `day = economy.dayKey(now)` to `grantAdFlare`. Hints shown with a `limit`
   call `markHintShown(g, hint.key)` once when they first appear.
8. IAP `unlock` kind: owning `space_hangar` must put its product id into `entitlements.products`
   (the engine reads `cfg.haul.hangar.product` there for the drone cap and the start drones).
9. Story triggers `launches`, `ring`, `contracts`, `system`, `galaxy`: read `stats.launches`,
   the claimed slots' rings, `stats.contractsMet`, `haul.autopilot.online`, `haul.galaxy`.
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
- **Seam Sense**: "seams 10 s more often" read as 10 s off each interval per level, with a 10 s floor.
- **Free flare charge while stored**: the 30-min timer waits while the charge is stored, so the next
  free charge comes 30 min after the stored one is used.
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
- **Ring-2 contracts and "pick a claimed ring with a rock"**: rings with a claimed slot are used (a
  respawning slot gets a rock within 6 s).
- **Upgrades and rock life**: life counts seconds of drilling at the current rate (2.4), so an upgrade
  never changes a rock's remaining seconds; Deep Bore's x1.5 applies to rocks that arrive after it.
- Signatures differ slightly from the spec's sketches: `rockAt`, `contractAt`, `activeRate`,
  `steadyRate`, `createHaul` take `cfg` (and the trait) explicitly.

## Verified

`npx vitest run src/engine/haul src/engine/loadout src/config/schema.haul`: 6 files, 69 tests, all green
(about 30 s; test 7 runs 80 two-hour simulations). `npx tsc --noEmit` prints nothing for these files.
