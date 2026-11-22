/**
 * Haul mode (Orbit Haulers): state, config and event types. Section 2.2 of
 * docs/design/space-design.md. Plain serialisable data only.
 *
 * The shared types do not know haul mode yet, so this file defines narrow types on top of them:
 * `HaulConfig` is the shared GameConfig plus the `haul` block, and `HaulGame` is the shared
 * GameState plus the top-level haul fields and the lifetime counters. Once the tech lead adds the
 * fields to src/engine/types.ts and src/config/schema.ts, both are plain aliases of the shared ones.
 */
import type { GameConfig } from '../../config/schema';
import type { HaulContent } from '../../config/schema.haul';
import type { GameState } from '../types';

/** The shared config with the haul block (section 2.1). */
export type HaulConfig = GameConfig & { haul: HaulContent };

export type FreighterPhase = 'docked' | 'climb' | 'away' | 'land';
export type AutopilotPolicy = 'full' | 'contract';

export interface Contract {
  /** Position in the run's contract stream (contract 0 is the fixed first one). */
  k: number;
  /** Buyer id from `haul.contracts.buyers`. */
  buyer: string;
  /** Wanted units per ore for the whole contract, and `got`: units delivered so far (Decision 40). */
  wants: { ore: string; units: number; got: number }[];
  /** Multiplier on the contract's own units when met (before Broker Seat and the condition). */
  mult: number;
  /** An offer: warp-outs left on the board. Taken: warp-outs left to deliver everything (Decision 40). */
  launchesLeft: number;
  /** Picked by the player (at most one contract of a run is taken; the taken one is the active one). */
  taken: boolean;
}

/** What the board, the strip and the hints read for one contract (Decision 40). */
export interface ContractView {
  index: number;
  contract: Contract;
  active: boolean;
  /** Paid at the warp-out that completes it. Fixed for the contract at current prices (before the day-shift double). */
  bonus: number;
  /** The day shift would pay this contract's bonus twice if it were met now (Decision 53, "x2 SHIFT"). */
  shift: boolean;
  /** Launches it has once taken (haul.contracts.launches), and how many are left now (an offer: the offer's life). */
  launches: number;
  launchesLeft: number;
  wants: {
    ore: string;
    units: number;
    got: number;
    /** Units of this ore the freighter in flight is carrying toward this contract (0 unless active and between launch and warp-out). */
    aboard: number;
    /** max(0, units − got − aboard), rounded up to whole units with a small epsilon (never a unit that cannot arrive). */
    left: number;
    /**
     * The steady figure (Decision 56): what one launch carries of this ore with the routes as they are
     * (`F × r_o / R`, each route `min(drill, drones × capacity / trip)`, no seam, no pile buffer).
     */
    perLaunch: number;
    /** What the next launch is expected to carry of it: for the taken contract from what is really in the hold; for an offer the steady figure. */
    nextLaunch: number;
    /** Units of it delivered by the contract's last launch at this pace: `nextLaunch + (launches after it − 1) × perLaunch` (an offer: `L × perLaunch`). */
    expected: number;
    /**
     * The fraction still to gain over that pace (Decision 56, "NEEDS +32 % COPPER"): `left / expected − 1`,
     * 0 when on pace, Infinity when nothing of it is expected (no route).
     */
    raise: number;
  }[];
  /** min over wants of expected / left (Infinity when nothing is left). For an offer: as if taken now. */
  paceRatio: number;
  /** paceRatio ≥ 1 (every want's expected covers what is left). */
  onPace: boolean;
  /** The largest raise of the wants (0 when on pace). */
  raise: number;
  /** The ore that is furthest behind when not on pace, else null. */
  shortOre: string | null;
}

/** What `routeGain` says about moving one drone (Decision 49). */
export interface RouteGain {
  /** Change of the income line (credits per second) if the drone is moved. */
  delta: number;
  /** Why the target cannot use another drone ('rig': the drill feeds no more; 'haul': the freighter is the limit), else null. */
  limit: 'rig' | 'haul' | null;
}

export interface SlotState {
  claimed: boolean;
  rigLevel: number;
  /** Drones on this slot's route. */
  haulers: number;
  /** Index of the current rock in this slot's stream (-1 while the first rock drifts in after a claim). */
  rockN: number;
  /** Ore of the current rock. */
  ore: string;
  /** The current rock is a bonanza rock. */
  bonanza: boolean;
  /** Seconds of full-rate drilling left on the current rock. */
  life: number;
  /** Units waiting at the rock. */
  pile: number;
  /** FULL flag (edge-triggered `pileFull` event). */
  full: boolean;
  /** Clock time the next rock arrives (null while a rock is present). */
  respawnAt: number | null;
  /** Clock time drones on this route first deliver (warm-up). */
  routeFrom: number;
  /** Units delivered on this route since the current rock arrived (drives `unload` events). */
  delivered: number;
}

export interface FreighterState {
  level: number;
  phase: FreighterPhase;
  /** Seconds left in the current phase (0 while docked). */
  t: number;
  /** Units on board by ore (loaded at launch, sold at the warp-out). */
  cargo: Record<string, number>;
  /** Credits the warp-out will pay (computed at launch, section 2.6). */
  payout: number;
  /** The cargo meets the contract it was loaded for. */
  met: boolean;
  /** Away time of this flight in seconds. */
  away: number;
  /** `k` of the contract the cargo was loaded for (null: none active at launch). */
  contract: number | null;
  /**
   * Units of each ore of the cargo that count toward that contract (Decision 40; empty when none).
   * Optional in old saves.
   */
  toward?: Record<string, number>;
  /** Contract bonus the warp-out adds when `met` and the contract is still taken (Decision 40; optional in old saves). */
  bonus?: number;
  /** Payout of the cargo without the contract's delivery fee (paid instead when the contract was dropped in flight). */
  plain?: number;
}

/** A rich seam in progress (natural or from a flare). */
export interface SeamState {
  /** Slot with the seam, or null when none. */
  slot: number | null;
  /** Clock time the seam ends. */
  until: number;
  /**
   * Stack of origin slots of the drones that landed on the seam (-1 = the rack), newest last. A
   * drone leaving the seam slot pops the last entry; at the end they go back newest first (errata 16).
   */
  guests: number[];
  /**
   * Largest size `guests` reached during this seam (second pass). A landing counts toward
   * `stats.seamDrags` only when it pushes the stack past this, so moving one drone off and back
   * cannot farm the mission counter. Optional in old saves (reconcile fills it).
   */
  peak?: number;
}

export interface HaulState {
  /** Seconds of play in this run (advances only while the game runs, never offline). */
  clock: number;
  /** Run seed (rock stream, contracts, seams). */
  seed: number;
  /** 0-based galaxy index. */
  galaxy: number;
  /** Chosen galaxy condition id (null in galaxy 0). */
  trait: string | null;
  slots: SlotState[];
  fleet: { drones: number; capLevel: number; engineLevel: number };
  /** Drones on the station rack (not on a route). */
  idle: number;
  /** Units waiting in the hold, by ore. */
  hold: Record<string, number>;
  freighter: FreighterState;
  autopilot: { online: boolean; policy: AutopilotPolicy };
  /**
   * The board may hold fewer than `haul.contracts.board` contracts between a drop and the next
   * warp-out (Decision 56: a dropped place stays empty until then). `recent`: average units of each
   * ore per launch over about the last `recentLaunches` warp-outs of this run, `measured` the
   * warp-outs counted into it, `sizedF` the freighter capacity the board's units are sized for
   * (Decision 56; optional in old saves and in hand-built test states, reconcile fills them).
   */
  contracts: { unlocked: boolean; board: Contract[]; next: number; active: number | null; recent?: Record<string, number>; measured?: number; sizedF?: number };
  /** The natural rich seam and its schedule. `count` = seams started so far (drives the rolls). */
  vein: SeamState & { nextAt: number; count: number };
  /** Survey Flare charges, their refill and ad limits, and the flare's own seam. */
  flare: SeamState & { charges: number; nextFreeAt: number; adsToday: number; adDay: string; adNextAt: number };
  /** Contract Keeper bonus waiting for the next launch (0 when none). */
  keeper: number;
  /** Once-per-run flags (tutorialDone, holdFullLine, offlineNoAutopilot, ...). */
  flags: Record<string, boolean>;
  /** Times each limited hint has been shown this run (markHintShown). */
  hintsShown: Record<string, number>;
  /** Clock times for the hint rules (null = condition not true now). */
  marks: { idleSince: number | null; holdFullSince: number | null; noContractSince: number | null; flareReadySince: number | null };
  /** This run, for display and the conservation check. Lifetime counters live in GameState.stats. */
  counters: { launches: number; contractsMet: number; depleted: number; hauled: number; claims: number; drilled: number; shipped: number };
}

/** Lifetime counters added to GameState.stats (survive a Jump; missions and pods read them). */
export interface HaulLifetimeStats {
  hauled: number;
  launches: number;
  contractsMet: number;
  depleted: number;
  claims: number;
  seamDrags: number;
  transmissionsAcked: number;
}

export interface StarMapState {
  levels: Record<string, number>;
  /** Cores spent so far (cores in hand = prestigePoints - spent). */
  spent: number;
}

export interface HaulStats {
  /** Most slots ever claimed at once (caps the Afterburner head start). */
  bestClaimed: number;
  /** Jumps made (also the index of the next Jump's offer). */
  jumps: number;
  /** Galaxy indexes arrived at (a Derelict Cache on each first arrival). */
  galaxiesVisited: number[];
  /** The once-per-game Scrap Pod of the first ring-2 claim has been given. */
  ring2Pod: boolean;
  /**
   * The day shift (Decision 53): when the current shift started (wall ms), its calendar day, and the
   * contracts met in it. Optional in old saves (reconcile fills it).
   */
  shift?: { day: string; startedAt: number; met: number };
  /** Highest ring ever claimed, 1-based (story trigger `ring`, errata 21). */
  bestRing: number;
  /** Contracts have unlocked at least once (story trigger `contracts`, errata 21). */
  contractsSeen: boolean;
  /** The Dock Autopilot has been online at least once (story trigger `system`, errata 21). */
  autopilotSeen: boolean;
  /**
   * A confirmed Jump whose condition is not picked yet (errata 17, steps 3 and 4): the old run has
   * ended (`haul` is null), the cores are credited, and the Star Map is open for spending. Null at
   * every other time. Kept in the save so a restart returns to the condition picker.
   */
  pendingJump: PendingJump | null;
}

/** What `startGalaxy` needs to build the run after a confirmed Jump. */
export interface PendingJump {
  /** The Jump's index (= haulStats.jumps before it); fixes the offers. */
  index: number;
  /** Galaxy the new run is in. */
  galaxy: number;
  /** Seed of the new run. */
  seed: number;
  /** The three condition ids offered (fixed at the confirm). */
  offers: string[];
}

/** Top-level fields of a haul game (survive a Jump). */
export interface HaulTopLevel {
  haul: HaulState | null;
  /** Fixed at game creation; seeds the galaxy offers. */
  metaSeed: number;
  /** Three sockets in order Rig, Fleet, Dock: card id or null. */
  loadout: { sockets: (string | null)[] };
  starMap: StarMapState;
  haulStats: HaulStats;
}

/** The shared game state as a haul game sees it. */
export type HaulGame = Omit<GameState, 'stats'> & HaulTopLevel & { stats: GameState['stats'] & HaulLifetimeStats };

/** A haul game whose run exists (every haul function needs one). */
export type HaulGameWithRun = HaulGame & { haul: HaulState };

/** What happened during a tick or an action, for sounds, effects, voice lines and the bot. */
export type HaulEvent =
  | { type: 'arrive'; slot: number; ore: string; bonanza: boolean; oreChanged: boolean }
  | { type: 'unload'; slot: number; units: number }
  | { type: 'pileFull'; slot: number }
  | { type: 'dry'; slot: number }
  | { type: 'depleted'; slot: number }
  | { type: 'holdFull' }
  | { type: 'launch'; cargo: Record<string, number>; auto: boolean }
  | { type: 'warp'; payout: number; met: boolean; cargo: Record<string, number>; bonus: number }
  | { type: 'contractProgress'; contract: Contract; added: { ore: string; units: number }[] }
  | { type: 'contractMet'; contract: Contract; bonus: number; shift: boolean }
  | { type: 'contractLapsed'; contract: Contract; wasActive: boolean; dropped?: boolean }
  | { type: 'contractNew'; contract: Contract; index: number }
  /**
   * The freighter's capacity changed (Decision 56): what this contract still needs was resized by
   * `factor` = F new / F old. `before` and `left` are the units still needed (all ores) before and after.
   */
  | { type: 'contractResized'; contract: Contract; index: number; factor: number; before: number; left: number }
  | { type: 'contractsUnlocked' }
  | { type: 'land' }
  | { type: 'docked' }
  | { type: 'vein'; slot: number; flare: boolean }
  | { type: 'veinEnd'; slot: number; flare: boolean }
  | { type: 'flareCharge'; charges: number }
  | { type: 'claim'; slot: number }
  | { type: 'podEarned'; pod: string; reason: 'ring2' | 'contracts' | 'depleted' | 'transmissions' | 'galaxy' }
  | { type: 'tutorialDone' };

/** Per-slot derived values (section 2.3). Unclaimed slots have zero rates. */
export interface SlotParams {
  /** 0-based ring index. */
  ring: number;
  /** Index of the slot within its ring. */
  j: number;
  /** Distance after the condition, in DU. */
  distance: number;
  /** Base drill rate (no seam), units/s; 0 without a rock. */
  rb: number;
  /** Base drill rate of a non-bonanza rock on this rig (also without a rock; for the steady rate). */
  rb0: number;
  /** Drill rate (rb x seam), units/s. */
  r: number;
  /** Pile cap in units. */
  cap: number;
  /** Drone capacity on this route (with the Ore Sorter when the active contract wants this ore). */
  c: number;
  /** Drone capacity without contract effects (for the steady rate). */
  cBase: number;
  /** Round trip in seconds. */
  trip: number;
  /** Haul rate n x c / trip, units/s. */
  h: number;
  /** Haul rate without contract effects. */
  hBase: number;
  /** The rock has a rich seam now. */
  seam: boolean;
  /** Rig tier multipliers reached: life on arrival, seam pick weight, pile cap. */
  tierLife: number;
  tierSeamWeight: number;
  /** Price of the current rock's ore. */
  price: number;
}

/** Everything derived from config and state once per step (section 2.3), so ticks and rates agree. */
export interface HaulParams {
  slots: SlotParams[];
  /** Drone speed, DU/s. */
  v: number;
  /** Freighter capacity = hold size. */
  F: number;
  /** Away time of a launch that does not meet its contract / that meets it. */
  away: number;
  awayMet: number;
  climb: number;
  land: number;
  droneCap: number;
  /** Ore price by id (condition, modules, Assay Rights). */
  prices: Record<string, number>;
  /** Added to a met contract's multiplier: Broker Seat and the condition. */
  contractAdd: number;
  fee: number;
  fullBonus: number;
  /** Global multiplier (shared upgrades, purchases; prestige is 1 with bonusPerPoint 0). */
  G: number;
  /** Module values (fractions). */
  spill: number;
  keeperValue: number;
  /** Bonanza chance of a new rock. */
  bonanzaChance: number;
}

/** What `fastForward` reports for the Shift Log (section 4.6). */
export interface OfflineReport {
  /** Real seconds away, after the cap. */
  seconds: number;
  /** Effective seconds simulated (seconds x efficiency). */
  effective: number;
  unitsByOre: Record<string, number>;
  rocksDry: number;
  pods: number;
  /** Payout of a freighter that was climbing or away when the app closed (already added to cash). */
  inFlight: number;
  /** Credits earned offline (NOT yet added to cash: the store grants them, doubled with an ad). */
  credits: number;
  /** The autopilot was off: nothing shipped. */
  noAutopilot: boolean;
  /** Units shipped by the offline freighter (`credits` pays for these; the in-flight cargo is not included). */
  shipped: number;
  /** Freighter loads counted for the missions: floor(shipped / F) (errata 36). */
  launches: number;
}

/** One hint for the haul hint source (section 3). Shaped like the shared Hint (key, route, row). */
export interface HaulHint {
  kind: 'drag' | 'swipe' | 'point' | 'tapTap';
  /** Stable id; also the target key the hint is about (the `to` target for a drag). */
  key: string;
  /** Opener targets for a control inside a sheet (e.g. ['station'] for 'station:buyDrone'). */
  route: string[];
  row: null;
  /** Drag and tap-tap: start target; swipe: the zone. */
  from?: string;
  to?: string;
  zone?: string;
  /** Tutorial step 1 to 6, or 0 for the rules after the tutorial. */
  step: number;
  /** Limited hints count against `hintsShown` with this key. */
  limit?: number;
}

/** A Star Map node as the spoke shows it. */
export interface StarNodeView {
  id: string;
  level: number;
  cap: number | null;
  /** Cost of the next level, null at the cap. */
  cost: number | null;
  canBuy: boolean;
}

/** What the Star Map's bottom panel shows (section 4.6). */
export interface JumpPreview {
  /** Cores gained by jumping now. */
  gain: number;
  coresInHand: number;
  canJump: boolean;
  /** The three condition ids offered for the next galaxy (fixed for this jump index). */
  offers: string[];
  nextGalaxy: number;
  nextGalaxyName: string;
  /** "Jump ready": the gain is at least `haul.jumpReadyCores` (errata 22). */
  ready: boolean;
}
