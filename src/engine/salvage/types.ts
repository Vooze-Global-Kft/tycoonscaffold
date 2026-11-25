/**
 * THE HOUR-0 CONTRACT of the salvage rules (the scrapyard's first yard, docs/design/yard-stage1.md
 * version 2, section 9 "Hour 0"; ECONOMY.md E1 to E10 and STAGE1-RULING.md S1 to S24 bind). Pure types
 * and a few constants. Every package that starts after hour 0 reads this file: the rules engineers
 * (package 1) fill the functions behind src/engine/salvage.ts; the screens (packages 3, 4, 8) read the
 * selectors' return types (FrameTable, CardData, Ticket, Goal, ...); the sound package reads
 * SalvageEvent; the strings package (9) owns the words of every TextKey below.
 *
 * Where each part lives:
 * - CONTENT types: src/config/schema.salvage.ts (zod, the prototype's keys and units; re-exported here).
 * - STATE (`SalvageState`, under the shared GameState as `salvage`), PRESENCE, EVENTS, ACTIONS'
 *   refusals, TICKETS, CARDS, the PROCESS BOARD, the INDUSTRY TABLE, the AWAY CARD, the GOAL and the
 *   ADVICE line, the FRAME TABLE: here.
 * - The facade (every public function with its final signature): src/engine/salvage.ts.
 * - Frozen test content and the four frozen states: src/engine/fixtures/salvage.ts.
 *
 * UNITS. Masses in the rules are integer GRAMS (`_g`); money is § with two decimals, rounded by the one
 * `roundMoney` (hundredths, half up); prices § a kilogram; times in the rules are PLAY SECONDS
 * (`stats.playSeconds`, which the tick advances) unless a name says `Ms` (epoch milliseconds, the
 * market clock) or `Day` (market day D = floor((t_m − board.epochMs) / 86,400,000)). Positions are
 * metres on the ground plane, x east, y south. Cash is the shared `GameState.cash` (changed by the
 * rules only, through the one commit function of the rules' money.ts).
 *
 * TEXT. The rules never hold a word a player reads: everything printed is a `Txt` (a TextKey of
 * src/ui/salvage/strings.ts plus typed arguments). The screen turns it into words with strings.ts
 * `say()`, which formats numbers ONLY through the formatters of src/engine/salvage.ts (`fmtMoney`,
 * `fmtMass`, `fmtPrice`, `fmtDuration`) and fills invented names from `content.names` by register id.
 *
 * CHANGING THIS FILE after hour 0: one line in the shared requests.md to the rules lead; every package
 * that reads the changed part is told (notes/contract.md).
 */
import type { GameConfig } from '../../config/schema';
import type { CrewRole, MachineId, SalvageContent } from '../../config/schema.salvage';
import type { GameState } from '../types';

export type * from '../../config/schema.salvage';

/** The shared config with the parsed `salvage` block (src/engine/salvageMode.ts `withSalvageContent`). */
export type SalvageConfig = GameConfig & { salvage: SalvageContent };
/** The shared state with the salvage fields. */
export type SalvageGame = GameState & { salvage: SalvageState };

/** Save tag of this state's layout (src/engine/salvageMode.ts `saveTag`). A new tag starts everyone afresh. */
export const SAVE_TAG = 'salvage1';
/** One tick advances at most this many seconds; a longer gap is the away pass (2.16). */
export const MAX_TICK = 2;

// ================================================================================================ ids

/** A grade id of `content.grades` (li, ci, bb, no2, brs, bri, conv, ...). */
export type GradeId = string;
/** An object id of `content.objects` (washer, cable, radiator, car, ...). */
export type ObjectId = string;
/** A zone id of `content.zones` (Z1, Z2, Z3, bundle1). */
export type ZoneId = string;
/** A point id of `content.map.points`; a place when it has `content.map.places[id]` (scale, rack, office, ...). */
export type PlaceId = string;
/** A key of `content.shop` (sack, hand1, sledge, truck, crucible, alu, night, ...). */
export type ShopKey = string;
/** A key of `content.partners` (partnerFarm, partnerDemolition): also their register name ids. */
export type PartnerId = string;
/** A recipe id of `content.machines.crucible.recipes` (brass, alu). */
export type RecipeId = string;
/** An id of `content.rivals` (rival01 ... rival25); its register id is `rival.<n>` (`rivalNameId`). */
export type RivalId = string;
/** A register id of the names desk (yard-stage1.md 5.1): homeYard, merchant, foundry, partnerFarm, rival.1, ... */
export type NameId = string;
/** A sprite id of the art manifest (src/ui/salvage/art/manifest, `ManifestEntry.id`). */
export type SpriteId = string;
/** Grams by grade at one place: a stock of the rate engine. */
export type Stock = Record<GradeId, number>;

export type { CrewRole, MachineId };

// ================================================================================================ presence

/**
 * The screen's sample of the boss, at most ten a second (yard-stage1.md 2.1): where he stands, whether
 * he drives, whether the stick is held past its dead zone, and for how long he has stood still, seconds
 * (0 while moving). The rules decide nearness themselves from content positions (`reach.*`).
 */
export interface Presence {
  x: number;
  y: number;
  driving: boolean;
  moving: boolean;
  standingFor: number;
}

// ================================================================================================ the state

/** Where a whole thing stands. `k` is its index at that place (thingPos is a pure function of it). */
export type ThingAt = { at: 'zone'; zone: ZoneId; k: number } | { at: 'dropoff'; slot: number } | { at: 'floor'; slot: number };

/** One whole thing in the yard (old stock, a drop-off arrival, a tipped skip's thing). */
export interface ThingState {
  /** Stable id: `${zone}.${obj}.${k}` for old stock, `d${n}` for the n-th drop-off arrival, `f${n}` for a tipped thing. */
  uid: string;
  obj: ObjectId;
  at: ThingAt;
  /** Pieces already cut off, in cut order (0 = whole). It is gone when every piece is off. */
  cut: number;
  /** Seconds of cutting spent on the current piece (kept when the boss moves away, 2.1). */
  progress: number;
  /** Who is cutting it now (the boss, a cutter's id), or null. */
  by: string | null;
}

/** A piece on a load (the boss's or a crew member's picture): its grade, grams, and the thing it came from. */
export interface CarriedPiece {
  grade: GradeId;
  g: number;
  /** The thing's uid, or null for a whole thing carried at its unprepared grade. */
  from: string | null;
  /** A whole uncut thing on wheels (S12, E4): its object id. */
  whole?: ObjectId;
}

/**
 * Loose material on the ground, by pile: grams by grade. Pile keys:
 * `beside.<thing uid>` (pieces that did not fit, next to their thing), `zone.<id>` (a zone's loose
 * pile), `dropoff` (the drop-off's front), `floor` (the tipping floor), `circle.<n>` (a chalk circle),
 * `tray.<machine>` (a machine's out tray, also in MachineState).
 */
export type PileKey = string;

export interface BayState {
  /** Grams in the bay (reserved and set-aside grams included). */
  g: number;
  /** Kept off the merchant's round (2.3). */
  held: boolean;
  /** Grams set aside by Sell at the shown price, for the next round. */
  aside_g: number;
  /** § a kilogram Sell showed for the set-aside grams. */
  asidePrice: number;
  /** Grams reserved for the crucible's next charge ("Take from bays") and for the supply deal. The round never takes them. */
  forCrucible_g: number;
  forDeal_g: number;
}

export type MachineStatus = 'notOwned' | 'idle' | 'working' | 'trayFull' | 'waiting';

export interface MachineState {
  owned: boolean;
  level: number;
  /** The input buffer (hopper), grams by grade. */
  in_g: Stock;
  /** The out tray, grams by grade. */
  tray_g: Stock;
  status: MachineStatus;
  /** Play second the machine was set down (it works from then: the flatbed's set-down, 3). */
  since: number;
}

export type HeatPhase = 'empty' | 'filling' | 'heating' | 'ready' | 'pouring' | 'cooling';

export interface CrucibleState extends MachineState {
  recipe: RecipeId;
  /** "Take from bays" (on by default, S11). */
  fromBays: boolean;
  /** New metal in the pot, grams (the heel apart). */
  charge_g: number;
  /** Metal kept from the last pour (less than one ingot), grams, of the recipe's out grade. */
  heel_g: number;
  phase: HeatPhase;
  /** Play second the phase ends (heating, pouring, cooling); null for open-ended phases. */
  endsAt: number | null;
  /** Play second the last feed arrived (a heat starts at start_share after start_idle without feed). */
  lastFeedAt: number;
  /** False until the first heat ever has poured (it waits for the boss within first_wait_m, S11). */
  firstPoured: boolean;
  /** Ingots of the last pour still cooling (the frame draws them). */
  cooling: { grade: GradeId; n: number; short_g: number } | null;
}

export type CrewJob = 'idle' | 'feed' | 'circle' | 'tray' | 'dropoff' | 'wholeThing' | 'floor' | 'cutDropoff' | 'cutFloor' | 'drive' | 'pour';
export type CrewPhase = 'wait' | 'walkTo' | 'work' | 'walkBack';

/** A crew member. Their work is a RATE of the rate engine (E5); job and phase are a picture of it. */
export interface CrewMember {
  /** `${role}.${slot}`, e.g. hand.0. */
  id: string;
  role: CrewRole;
  slot: number;
  /** Index into scripts/content/yard/crew-names.json's list (the build script copies names into content.names as `crew.<n>`). */
  name: number;
  level: number;
  job: CrewJob;
  phase: CrewPhase;
  /** The place the picture walks from and to, and the play seconds the phase runs (the frame interpolates). */
  from: PlaceId | null;
  to: PlaceId | null;
  t0: number;
  t1: number;
  /** The grade the picture carries (null: empty-handed). */
  carries: GradeId | null;
}

/** A partner's skip (2.7): contents are fixed when it fills, printed on its label, equal to the weigh-in. */
export interface SkipState {
  phase: 'filling' | 'full';
  /** Play second it is (or was) full. */
  fullAt: number;
  /** Whole things by object (fixed at fill by counter hash over the partner's mix). */
  contents: Record<ObjectId, number>;
  mass_g: number;
  /** § the label prints (k × as found at the day's prices, or the trial's fixed price). */
  price: number;
  /** The market day the price was set. */
  priceDay: number;
  trial: boolean;
  /** Skips this partner has filled (the counter of its hash). */
  n: number;
}

export interface PartnerState {
  open: boolean;
  trialUsed: boolean;
  /** Partner-supply level (REPORT2 R10: each level fills skips more often; content `levels.bases.<partner>`). 1 when open. */
  level: number;
  skip: SkipState;
}

/** The skip on the truck after a hook: paid, then weighed in over the weighbridge, then tipped. */
export interface CarriedSkip {
  partner: PartnerId;
  contents: Record<ObjectId, number>;
  mass_g: number;
  price: number;
  trial: boolean;
  /** True once weighed in over the weighbridge (its ticket printed). */
  weighed: boolean;
}

export interface TruckState {
  owned: boolean;
  /** Last stopped position, metres (rules state: the driver walks to it, 2.7). */
  x: number;
  y: number;
  /** Heading of the parked truck, 0 to 7 (0 south, clockwise as the art's 8 headings). */
  heading: number;
  skip: CarriedSkip | null;
  /** Who is in it. */
  by: 'boss' | 'driver' | null;
  /** The driver's trip (a rate-engine leg): its phase and the play seconds it ends. */
  trip: { partner: PartnerId; phase: 'out' | 'hook' | 'back' | 'weigh' | 'tip'; endsAt: number } | null;
  /** Seconds the boss has stood still in a skip zone with the truck (the hook ring, `truck.hookDwellS`). */
  hookRing: number;
}

export interface MerchantState {
  phase: 'waiting' | 'loading' | 'away';
  /** Play second the phase ends (loading, away); null while waiting. */
  endsAt: number | null;
  /** Grams being loaded (taken when loading began), by grade, with the price per kg each pays. */
  lot: { grade: GradeId; g: number; price: number }[];
}

export interface DropoffState {
  /** Play second of the next arrival (it waits while every place is taken). */
  nextAt: number;
  /** Arrivals so far (the counter of the drawn mix; the first come from `dropoff.initial`). */
  n: number;
}

export interface DealState {
  /** Index into `content.deal.series` of the deal on offer or running; null before rung 2. */
  step: number | null;
  /** 'offered' (the partner wall shows it), 'running', 'declined' (Not now: offered again at the next rung or day), 'done' (the series is finished). */
  phase: 'offered' | 'running' | 'declined' | 'done';
  /** Terms locked at signing. */
  q_g: number;
  days: number;
  /** § a kilogram. */
  price: number;
  /** Deliveries made of this deal. */
  delivered: number;
  /** 0 to 100 (2.9; gates nothing in stage 1). */
  trust: number;
  /** The last delivery: market day and grams delivered. */
  last: { day: number; g: number } | null;
}

/** Played seconds of the foreman's boost (master 3.4) on the current market day. */
export interface ForemanState {
  day: number;
  used_s: number;
  /** Play second the boss last worked (cut, fed, weighed). */
  lastWorkAt: number;
}

/** The market clock (2.8, S14): t_m = max(device now, highMs + live time since the last resume). */
export interface ClockState {
  /** Highest market time seen, epoch ms (saved, never backwards). */
  highMs: number;
  /** The market day of the last tick (the day boundary is an event: deal delivery, board step). */
  day: number;
  /** The market day the player started (rivals' d counts from it). */
  startDay: number;
}

export interface LadderState {
  /** Lifetime supplied grams (collected lots and deal deliveries only; never falls). */
  supplied_g: number;
  /** Lifetime supplied products by material, § at p̄ (range: a material counts at `ladder.theta`). */
  worth: Record<string, number>;
  /** Current rung, 1 to 3 in stage 1. */
  rung: number;
  /** Rivals passed (count from the bottom of the table; a passed rival never passes back). */
  passed: number;
}

export interface GoalState {
  /** Index into `content.goals` of the first unfinished goal (goals before it are done or skipped). */
  at: number;
  /** Ids of optional goals the player skipped (Not now). */
  skipped: string[];
  /** Play second the last purchase prompt showed (at most one a minute, 2.10). */
  lastPromptAt: number;
}

export interface SalvageState {
  /** Layout version; a save of another version starts afresh (SAVE_TAG). */
  v: 1;
  clock: ClockState;
  /** Shop keys bought (tools, carriers, machines, the truck, recipes, the Night watch; crew are in `crew`). */
  owned: ShopKey[];
  /** The best tool tier owned (1 spanners at the start). */
  tier: number;
  /** The carrier in use (a key of content.carriers). */
  carrier: string;
  /** What the boss carries (pieces in pickup order). */
  load: CarriedPiece[];
  /** The last presence sample and the play second it arrived (a stale one counts as standing nowhere). */
  presence: Presence;
  presenceAt: number;
  /** The boss's current act (the frame's pose; the sound's loops). */
  act: { kind: 'none' | 'work' | 'pickup' | 'weigh' | 'feed' | 'strip' | 'circle' | 'hook' | 'drive'; target: string | null; since: number };
  /** Every whole thing in the yard. */
  things: ThingState[];
  /** Loose material by pile. */
  piles: Record<PileKey, Stock>;
  /** One bay per grade seen. */
  bays: Record<GradeId, BayState>;
  machines: { hand_stripper: MachineState; stripper: MachineState; bench: MachineState; crucible: CrucibleState };
  crew: CrewMember[];
  partners: Record<PartnerId, PartnerState>;
  truck: TruckState;
  merchant: MerchantState;
  dropoff: DropoffState;
  deal: DealState;
  foreman: ForemanState;
  ladder: LadderState;
  goals: GoalState;
  /** Grades whose lesson has shown (a lesson prints on a grade's first weigh-in). */
  lessonsSeen: GradeId[];
  /** The last 50 tickets, newest last, and the next ticket number. */
  tickets: Ticket[];
  ticketNo: number;
  /** A waiting away card (shown until ackAway). */
  away: AwayCard | null;
  /** Counter of the drop-off's and the skips' hashes beyond their own counters (2: no Math.random). */
  draws: number;
  /** § owed for the first yard hand hired on account, repaid from collections (REPORT2 R3). */
  debt: number;
  /**
   * The rate engine's bookkeeping (E5, REPORT2 "One engine"): the play second the current segment began
   * (flows are constant between events) and the next event's play second, or null. Flows themselves are
   * derived from the stocks above (rate.ts), never saved.
   */
  engine: { segmentAt: number; nextEventAt: number | null };
}

// ================================================================================================ events

/** What the drop-off, the round, the van, the truck or a crew member just did (sound `arrival` by kind). */
export type ArrivalKind = 'dropoff' | 'flatbed' | 'van' | 'truck' | 'crew' | 'machine';

/**
 * Everything a tick or an action reports (yard-stage1.md 2.14's list, and what section 7's sound table
 * and section 4's screens rely on). Each carries what its consumer needs; nothing is a word.
 */
export type SalvageEvent =
  // the hand (2.1)
  | { type: 'workStart'; thing: string; obj: ObjectId; tool: string; by: string }
  | { type: 'workStop'; thing: string; by: string }
  | { type: 'pieceOff'; thing: string; grade: GradeId; g: number; to: 'load' | 'ground' | 'waste'; by: string }
  | { type: 'thingGone'; thing: string }
  | { type: 'pickup'; grade: GradeId; g: number }
  | { type: 'swap'; down: GradeId; up: GradeId }
  | { type: 'loadFull' }
  | { type: 'feed'; machine: MachineId; grade: GradeId; g: number }
  | { type: 'circleDrop'; circle: number; g: number }
  // weighing and selling (2.2, 2.3)
  | { type: 'weighIn'; ticket: Ticket; by: 'boss' | string }
  | { type: 'dropOffSlip'; thing: ObjectId; ticket: Ticket }
  | { type: 'roundLoad'; grams: number }
  | { type: 'roundAway' }
  | { type: 'roundBack' }
  | { type: 'collected'; ticket: Ticket; big: boolean }
  | { type: 'lesson'; grade: GradeId; key: TextKey }
  // machines (2.5)
  | { type: 'machineState'; machine: MachineId; status: MachineStatus }
  | { type: 'machineOut'; machine: MachineId; grade: GradeId; g: number }
  | { type: 'heatStart'; recipe: RecipeId; g: number }
  | { type: 'readyToPour' }
  | { type: 'pour'; ingots: number; grade: GradeId; short_g: number; dross_g: number; first: boolean }
  | { type: 'cooled' }
  // partners, skips, the truck (2.7)
  | { type: 'skipFull'; partner: PartnerId }
  | { type: 'hookRing'; partner: PartnerId; share: number }
  | { type: 'hook'; partner: PartnerId; price: number; by: 'boss' | 'driver' }
  | { type: 'bridgeWeighIn'; ticket: Ticket }
  | { type: 'tip'; partner: PartnerId; things: number }
  | { type: 'enterTruck' }
  | { type: 'leaveTruck' }
  // arrivals, purchases, crew
  | { type: 'arrival'; kind: ArrivalKind; what: string | null }
  | { type: 'owned'; item: ShopKey }
  | { type: 'hired'; role: CrewRole; id: string }
  | { type: 'levelled'; target: LevelTarget; level: number }
  | { type: 'refused'; key: RefusalKey; args: TxtArgs }
  // the business (2.8 to 2.11)
  | { type: 'day'; day: number }
  | { type: 'rung'; n: number }
  | { type: 'passed'; rival: RivalId; rank: number }
  | { type: 'dealOffered'; step: number }
  | { type: 'dealSigned'; step: number }
  | { type: 'dealDelivered'; ticket: Ticket }
  | { type: 'goal'; n: number; id: string }
  | { type: 'awayReport'; card: AwayCard }
  | { type: 'heldBay'; grade: GradeId; on: boolean }
  | { type: 'recipe'; recipe: RecipeId; heelPoured: boolean };

export type SalvageEventType = SalvageEvent['type'];

// ================================================================================================ actions

/**
 * The refusal keys (yard-stage1.md 5.4, plus `notBuilt` for hour 0's stub and `confirmHeel` for the
 * crucible's recipe change). A refused action returns the same state object and reports
 * `{type: 'refused', key, args}`; the card prints `REFUSALS[key]` with the args.
 */
export const REFUSAL_KEYS = ['cash', 'owned', 'rung', 'ceiling', 'tool2', 'tool3', 'tooHeavy', 'topLevel', 'noPlace', 'filling', 'loadCash', 'floor', 'weighFirst', 'heatRunning', 'noTruck', 'noTorch', 'nothing', 'priceUpdated', 'confirmHeel', 'notBuilt'] as const;
export type RefusalKey = (typeof REFUSAL_KEYS)[number];

/** What a level is bought for: a crew member (by id), a machine, or a partner's supply (REPORT2 R10). */
export type LevelTarget = { kind: 'crew'; id: string } | { kind: 'machine'; machine: MachineId } | { kind: 'partner'; partner: PartnerId };

/** What Sell showed (2.8 "shown equals applied"): the market day, the price per kg, the grams. */
export interface SellShown {
  day: number;
  price: number;
  grams: number;
}

/** The deal's terms as the card showed them (signDeal checks them). */
export interface DealTerms {
  step: number;
  q_g: number;
  days: number;
  price: number;
}

/**
 * Every player action (2.15) with its final signature, as src/engine/salvage.ts exports it. Each is
 * pure: `(cfg, g, ...args, clock, events) => SalvageGame`, `clock` the play seconds, refusals pushed to
 * `events` with the same state returned. `now` (epoch ms) only where the market day matters.
 */
export interface SalvageActions {
  presence(cfg: SalvageConfig, g: SalvageGame, p: Presence, clock: number): SalvageGame;
  buy(cfg: SalvageConfig, g: SalvageGame, item: ShopKey, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame;
  hire(cfg: SalvageConfig, g: SalvageGame, role: CrewRole, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame;
  level(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame;
  setHold(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, on: boolean, events?: SalvageEvent[]): SalvageGame;
  sell(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, shown: SellShown, now: number, events?: SalvageEvent[]): SalvageGame;
  setRecipe(cfg: SalvageConfig, g: SalvageGame, recipe: RecipeId, confirmHeel: boolean, clock: number, events?: SalvageEvent[]): SalvageGame;
  setFromBays(cfg: SalvageConfig, g: SalvageGame, on: boolean, events?: SalvageEvent[]): SalvageGame;
  signDeal(cfg: SalvageConfig, g: SalvageGame, shownTerms: DealTerms, now: number, events?: SalvageEvent[]): SalvageGame;
  declineDeal(cfg: SalvageConfig, g: SalvageGame, events?: SalvageEvent[]): SalvageGame;
  stepOut(cfg: SalvageConfig, g: SalvageGame, clock: number, events?: SalvageEvent[]): SalvageGame;
  ackAway(cfg: SalvageConfig, g: SalvageGame): SalvageGame;
}

// ================================================================================================ text

/** One typed argument of a printed line. The screen formats each kind with its one formatter. */
export type TxtArg =
  | { money: number } // fmtMoney: "§12.30", "§3,148", "§412k"
  | { price: number } // fmtPrice: § a kilogram, "§0.95"
  | { mass_g: number; step?: MassStep; ferrous?: boolean } // fmtMass
  | { n: number } // a plain count, "12"
  | { rank: number } // an ordinal, "25th"
  | { secs: number } // fmtDuration: "4 m 10 s", "3 h 12 m"
  | { pct: number } // a share 0 to 1, "75 %"
  | { name: NameId } // an invented name from content.names
  | { grade: GradeId } // a grade's short name from content.grades
  | { thing: ObjectId } // a thing's name from content.objects
  | { text: TextKey }; // another line (a tool's name in a refusal)
export type TxtArgs = Record<string, TxtArg>;
/** A line as data: a key of src/ui/salvage/strings.ts and its arguments (holes `{arg}` in the text). */
export interface Txt {
  key: TextKey;
  args?: TxtArgs;
}

/** Mass steps (2.2's one rounding rule): the platform and lots 0.1 kg, the weighbridge 20 kg. */
export type MassStep = 'platform' | 'bridge' | 'lot';

/**
 * EVERY TextKey the rules and the screens print, grouped by the package that shows it. The words are
 * src/ui/salvage/strings.ts's (package 9), which must define exactly these keys (the typecheck holds
 * both sides to it). A new key is a request to the rules lead (this list) and to package 9 (its words).
 */
export const TEXT_KEYS = {
  /** Package 4: the top bar, the goal card, the one button (4.1). */
  hud: ['cash', 'rankChip', 'rankChipShort', 'rankChipToNext', 'rankChipTop', 'carry', 'loadFull', 'open', 'stepOut', 'trialLoad', 'skipLoad', 'goalProgress', 'turnSideways', 'turnSidewaysBody', 'menu', 'close', 'ok'],
  /** Package 3: world labels (4.2), place names (5.2, ≤ 18). */
  place: ['place.rack', 'place.office', 'place.scalehouse', 'place.scale', 'place.weighbridge', 'place.noticeboard', 'place.dropoff', 'place.rubble', 'place.floor', 'place.park', 'place.stripper', 'place.bench', 'place.crucible', 'place.stock', 'place.backfield', 'place.bays', 'place.merchant', 'place.lane', 'place.bridge'],
  /** Package 3 and 4: chips over bays, things and pads (4.2, 4.4). */
  chip: ['chip.bay', 'chip.held', 'chip.lowDay', 'chip.highDay', 'chip.reservedDeal', 'chip.forCrucible', 'chip.padlock', 'chip.padlockPrice', 'chip.crewWeighIn', 'chip.lotSold', 'chip.certifiedEmpty', 'chip.bridgeLimit', 'chip.needsTorchGate'],
  /** Package 4: card titles (4.3). */
  title: ['title.rack', 'title.rota', 'title.partners', 'title.processBoard', 'title.machine', 'title.board', 'title.skip', 'title.deal', 'title.table', 'title.away', 'title.rung', 'title.clipboard', 'title.settings', 'title.help', 'title.place'],
  /** Package 4: card rows and buttons (4.3, 5.2). */
  card: [
    'card.buy',
    'card.hire',
    'card.level',
    'card.owned',
    'card.cameWithYard',
    'card.sell',
    'card.hold',
    'card.sign',
    'card.notNow',
    'card.fromBays',
    'card.poursIn',
    'card.readyToPour',
    'card.heelAsk',
    'card.working',
    'card.trayFull',
    'card.waitingFor',
    'card.idle',
    'card.levelOnBoard',
    'card.inOut',
    'card.rateKgS',
    'card.charge',
    'card.heel',
    'card.recipe',
    'card.siteLicence',
    'card.carriesRate',
    'card.cutsRate',
    'card.drivesRate',
    'card.opensAt',
    'card.nightWatch',
    'card.dealTerms',
    'card.dealDaysLeft',
    'card.dealReserve',
    'card.dealTrust',
    'card.dealLast',
    'card.skipState',
    'card.skipLine',
    'card.skipNet',
    'card.skipPrice',
    'card.businessCard',
    'card.converterPaid',
    'card.empty',
  ],
  /** Package 4: what each machine, tool, carrier, role and item is, and its effect line (≤ 38). */
  item: [
    'item.sack',
    'item.trolley',
    'item.frame',
    'item.spanners',
    'item.sledge',
    'item.torch',
    'item.truck',
    'item.handStripper',
    'item.stripper',
    'item.bench',
    'item.crucible',
    'item.brass',
    'item.alu',
    'item.night',
    'role.hand',
    'role.cutter',
    'role.driver',
    'effect.sack',
    'effect.trolley',
    'effect.sledge',
    'effect.torch',
    'effect.truck',
    'effect.stripper',
    'effect.bench',
    'effect.crucible',
    'effect.alu',
    'effect.night',
    'effect.hand',
    'effect.cutter',
    'effect.driver',
  ],
  /** Package 4: the price board and bays (4.4). */
  board: ['board.head', 'board.usual', 'board.lowDay', 'board.highDay', 'board.firstHint', 'board.sellTotal'],
  /** Package 4: the process board's plates (4.5). */
  plate: ['plate.handStripper', 'plate.stripper', 'plate.bench', 'plate.crucible', 'plate.brass', 'plate.alu', 'plate.bronze', 'plate.lead', 'plate.lithium', 'plate.pgm', 'plate.tungsten', 'plate.owned', 'plate.price', 'plate.levelPrice', 'plate.locked'],
  /** Package 4: the industry table and the rung sign (2.11). */
  table: ['table.headline', 'table.simulated', 'table.rivalsSimulated', 'table.rung', 'table.rungGate', 'table.range', 'table.you', 'table.rungSign', 'table.rungOpens'],
  /** Package 4: the away card (4.4). */
  away: ['away.head', 'away.line', 'away.supplied', 'away.loads', 'away.deliveries', 'away.passed', 'away.hintCutter', 'away.hintHand', 'away.nothing'],
  /** Packages 3 and 4: tickets and slips (2.2). */
  ticket: ['ticket.weighInHead', 'ticket.gradeToday', 'ticket.todaysValue', 'ticket.weighInLegal', 'ticket.dropOffSlip', 'ticket.skipHead', 'ticket.trial', 'ticket.grossTareNet', 'ticket.partnerLegal', 'ticket.collectionHead', 'ticket.gradeAmount', 'ticket.paid', 'ticket.lotSoldTo', 'ticket.weighedOut', 'ticket.dealDelivery', 'ticket.more', 'ticket.fromCar', 'ticket.certifiedEmpty', 'ticket.date'],
  /** Package 4: lines of 5.2. */
  line: ['line.portal', 'line.crewAway', 'line.backfield', 'line.fictional', 'line.shortened', 'line.carName'],
  /** Package 4: the clipboard and Settings (4.3). */
  clip: ['clip.goals', 'clip.places', 'clip.tickets', 'clip.settings', 'clip.sound', 'clip.music', 'clip.haptics', 'clip.help', 'clip.privacy', 'clip.version', 'clip.restart', 'clip.restartConfirm', 'clip.glossary'],
  /** Package 8: the goals (5.3, ≤ 30), in 1.3's order. */
  goal: [
    'goal.takeWasher',
    'goal.weighIt',
    'goal.stripCable',
    'goal.weighCopper',
    'goal.buySack',
    'goal.takeAWasher',
    'goal.hireHand',
    'goal.workDropoff',
    'goal.buySledge',
    'goal.breakRadiators',
    'goal.buyTruck',
    'goal.fetchTrial',
    'goal.buyBench',
    'goal.breakMotor',
    'goal.supplyRung2',
    'goal.hireCutter',
    'goal.signDeal',
    'goal.buyTrolley',
    'goal.buyStripper',
    'goal.buyCrucible',
    'goal.chargeCrucible',
    'goal.pourFirst',
    'goal.hireDriver',
    'goal.buyTorch',
    'goal.cutCar',
    'goal.fetchDemolition',
    'goal.buyNight',
    'goal.levelHand',
    'goal.levelStripper',
    'goal.levelCutter',
    'goal.supplyRung3',
    'goal.hireHand2',
    'goal.hireCutter2',
    'goal.finishDeal',
    'goal.passRival',
    'goal.visitBackfield',
  ],
  /** Package 8 and the tickets: lessons (5.5, ≤ 48 on the ticket). */
  lesson: ['lesson.li', 'lesson.drum', 'lesson.mot', 'lesson.cab', 'lesson.bb', 'lesson.no2', 'lesson.brs', 'lesson.alw', 'lesson.alcast', 'lesson.ci', 'lesson.hms', 'lesson.hmsu', 'lesson.cbody', 'lesson.bri', 'lesson.dross', 'lesson.ali', 'lesson.conv'],
  /** Every package: refusals (5.4). */
  refusal: REFUSAL_KEYS.map((k) => `refusal.${k}` as const),
} as const;

type Values<T> = T extends readonly (infer U)[] ? U : never;
export type TextKey = { [G in keyof typeof TEXT_KEYS]: Values<(typeof TEXT_KEYS)[G]> }[keyof typeof TEXT_KEYS];

// ================================================================================================ tickets

/** One grade line of a ticket: the grade, grams resolved to the ticket's step, § a kg, the amount (2.2). */
export interface TicketLine {
  grade: GradeId;
  g: number;
  price: number;
  /** roundMoney(resolved kg × price); a total is the sum of its lines. */
  amount: number;
  /** "from car ref. 0012" on a converter's line; "certified empty" on a closed vessel's. */
  note?: 'fromCar' | 'certifiedEmpty';
}

interface TicketBase {
  /** Ticket number (the history's order). */
  no: number;
  /** Play second and market day it printed. */
  at: number;
  day: number;
}

/** The five kinds of 2.2. Every line typed; the screen prints at most three lines and "+ n more". */
export type Ticket =
  /** Weighed in on the platform: no payment; the muted "today's value". At most one lesson. */
  | (TicketBase & { kind: 'weighIn'; by: 'boss' | string; lines: TicketLine[]; todaysValue: number; lesson: TextKey | null })
  /** A household drop-off signed in at the gate: "{thing} · signed in · gate drop-off". */
  | (TicketBase & { kind: 'dropOffSlip'; thing: ObjectId })
  /** A partner's skip over the weighbridge: gross, tare (the truck's stored tare plus the empty skip), net, the price paid. */
  | (TicketBase & { kind: 'skipWeighIn'; partner: PartnerId; trial: boolean; gross_g: number; tare_g: number; net_g: number; paid: number; things: { obj: ObjectId; n: number }[] })
  /** The merchant's collection: lines with amounts, "Paid §x", the buyer named. */
  | (TicketBase & { kind: 'collection'; buyer: NameId; lines: TicketLine[]; paid: number })
  /** A supply-deal delivery: "{foundry} · {kg} cast iron · §{x}". */
  | (TicketBase & { kind: 'dealDelivery'; buyer: NameId; grade: GradeId; g: number; paid: number });

export type TicketKind = Ticket['kind'];

// ================================================================================================ cards

/** A button on a card: what it does (the action and its arguments), its label, and a refusal if it cannot. */
export type CardAction =
  | { act: 'buy'; item: ShopKey; price: number }
  | { act: 'hire'; role: CrewRole; price: number }
  | { act: 'level'; target: LevelTarget; price: number }
  | { act: 'setHold'; grade: GradeId; on: boolean }
  | { act: 'sell'; grade: GradeId; shown: SellShown }
  | { act: 'setRecipe'; recipe: RecipeId; confirmHeel: boolean }
  | { act: 'setFromBays'; on: boolean }
  | { act: 'signDeal'; terms: DealTerms }
  | { act: 'declineDeal' }
  | { act: 'ackAway' }
  | { act: 'open'; card: CardRef };

export interface CardButton {
  label: Txt;
  action: CardAction;
  /** Null: pressable. Else why not (the button greys and shows it). */
  refusal: Txt | null;
}

/** One row of a panel (44 pt: a name line, an effect line ≤ 38, an optional button, an optional pictogram). */
export interface CardRow {
  id: string;
  name: Txt;
  line: Txt | null;
  button: CardButton | null;
  /** A pictogram sprite (ui.picto.copper, ui.picto.sack, ...). */
  icon: SpriteId | null;
  /** A second line of numbers (the board's five bars, a bay's stock) where the card has one. */
  extra?: Txt | null;
}

/** Which card to open: a place's card, or one of the cards that belong to no single place. */
export type CardRef = { kind: 'place'; place: PlaceId } | { kind: 'bay'; grade: GradeId } | { kind: 'skip'; partner: PartnerId } | { kind: 'deal' } | { kind: 'table' } | { kind: 'processBoard' } | { kind: 'away' } | { kind: 'rung'; n: number } | { kind: 'clipboard' };

/** The kinds of overlay of 4.3 (the screen picks the shape: panel, wide card or centred card). */
export type CardKind = 'rack' | 'rota' | 'partners' | 'processBoard' | 'machine' | 'board' | 'skip' | 'deal' | 'table' | 'away' | 'rung' | 'clipboard' | 'place';
export type CardShape = 'panel' | 'wide' | 'centred';

/**
 * Every card and overlay of section 4 as DATA (cardOf): what it prints, row by row, with each button's
 * exact price and refusal key. The screen formats nothing but numbers (through the formatters).
 */
export interface CardData {
  kind: CardKind;
  shape: CardShape;
  title: Txt;
  /** Lines under the title (the rota's "Site licence · metal dealer", a machine's status, the deal's terms). */
  lead: Txt[];
  /** Tabs of the office panel (Rota, Partners, Process board), with the open one. */
  tabs?: { ref: CardRef; title: Txt; open: boolean }[];
  rows: CardRow[];
  /** Buttons at the foot (Sign / Not now, OK). */
  foot: CardButton[];
  /** The machine card's numbers (crucible: charge a/b, pours in, heel); the price board's day; the table's rows. */
  machine?: MachineCard;
  board?: PriceBoard;
  table?: IndustryTable;
  away?: AwayCard;
  processBoard?: ProcessBoardRows;
  skip?: SkipLabel;
  /** The legal line where the card has one (the board's and the table's fictional line). */
  legal?: Txt | null;
}

export interface MachineCard {
  machine: MachineId;
  owned: boolean;
  status: Txt;
  /** kg a second. */
  rate: number;
  in_g: Stock;
  tray_g: Stock;
  /** Crucible only. */
  crucible?: { recipe: RecipeId; fromBays: boolean; charge_g: number; pot_g: number; poursInS: number | null; ready: boolean; heel_g: number };
}

/** One two-line row of the price board (4.4). */
export interface BoardRow {
  grade: GradeId;
  icon: SpriteId;
  /** § a kg today, and its five days (oldest first) with the usual price for the tick. */
  price: number;
  days: number[];
  pbar: number;
  word: 'low' | 'usual' | 'high';
  /** The bay: grams, held, reserved. */
  bay_g: number;
  held: boolean;
  reserved_g: number;
  hold: CardButton;
  sell: CardButton | null;
}

export interface PriceBoard {
  day: number;
  /** Seconds to the next step (the head's "next prices in {h} h {m} m"). */
  nextInS: number;
  rows: BoardRow[];
  /** The first opening's hint ("Cast iron: a low day. Holding is free."), else null. */
  hint: Txt | null;
}

/** The skip's label (2.7): a world plate and the skip card. */
export interface SkipLabel {
  partner: PartnerId;
  state: 'filling' | 'full' | 'trial';
  net_g: number;
  /** All things (the plate prints three and "+ n more"). */
  things: { obj: ObjectId; n: number; grade: GradeId; g: number }[];
  price: number;
  /** Why it cannot be hooked now (filling, loadCash, floor, noTruck), else null. */
  refusal: Txt | null;
  fullInS: number | null;
}

// ================================================================================================ process board

export type PlateState = 'lit' | 'owned' | 'buyable' | 'locked' | 'greyed';

export interface Plate {
  id: string;
  /** Up to two lines of 12 characters (greyed: three of 11). */
  name: Txt;
  state: PlateState;
  /** "Owned · level 2", "§210", "Level 3 · §640", a padlock; null on a greyed plate. */
  line: Txt | null;
  /** The machine card it opens (null: greyed, or a recipe that opens the crucible). */
  opens: CardRef | null;
  button: CardButton | null;
}

/** The process board (4.5): rows of enamel plates joined by bars. */
export interface ProcessBoardRows {
  rows: { id: 'cable' | 'motors' | 'melt' | 'greyed'; plates: Plate[] }[];
  /** Riveted bars between plates, by plate id. */
  bars: [string, string][];
}

// ================================================================================================ industry table

export interface TableRow {
  rank: number;
  /** A rival's id, or 'you'. */
  id: RivalId | 'you';
  name: NameId;
  tonnes_g: number;
  simulated: boolean;
  logo: SpriteId | null;
}

export interface IndustryTable {
  rows: TableRow[];
  /** The player's rank (1 to 26) and the next rival up with the grams still needed. */
  rank: number;
  next: { rival: RivalId; name: NameId; need_g: number } | null;
  /** The nine rungs: tonnes and range gates, the current one lit. */
  rungs: { n: number; t: number; range: number; current: boolean; open: boolean }[];
  /** Range chips: each material of the stage, counted or not. */
  range: { material: string; counted: boolean; worth: number }[];
}

// ================================================================================================ away, goal, advice, top bar

/** The away card (4.4; 2.16). */
export interface AwayCard {
  seconds: number;
  capS: number;
  /** Supplied grams by grade with the money each brought. */
  lines: { grade: GradeId; g: number; money: number }[];
  supplied_g: number;
  money: number;
  loads: number;
  deliveries: number;
  passed: RivalId[];
  /** With little to show: what would have earned more (away.hintCutter, ...). */
  hint: Txt | null;
}

/** The goal card's first line (2.10). */
export interface Goal {
  n: number;
  id: string;
  text: Txt;
  /** The chevron's target: a map point or a thing's uid. */
  target: string | null;
  /** Progress shown at the right of the line, when the goal counts something. */
  progress: { a: number; b: number } | null;
  /** The shop key the goal asks to buy (a purchase prompt). */
  buy: ShopKey | null;
}

/** The advice line (2.10): the cheapest useful purchase within cash + advice.minutes of income. */
export interface Advice {
  item: ShopKey;
  price: number;
  line: Txt;
  place: PlaceId;
}

/** The top bar (4.1): cash, the ladder chip, carry. */
export interface TopBar {
  cash: number;
  rank: number;
  of: number;
  next: { name: NameId; need_g: number } | null;
  /** On foot: carried kg and the carrier's kg; driving: the skip's net kg and whether it is a trial load. */
  carry: { kg: number; cap: number } | null;
  driving: { kg: number; trial: boolean } | null;
}

// ================================================================================================ the frame table

/**
 * EVERYTHING THE WORLD DRAWS FROM THE RULES (frame(cfg, g)), pushed to the UI thread at each store change
 * (src/ui/salvage/world/useRulesTable.ts). Positions in metres; sprites by art-manifest id; nothing here
 * moves smoothly by itself (the world interpolates crew and vehicles between `t0` and `t1`).
 */
export interface FrameTable {
  /** Play second of the state. */
  t: number;
  things: FrameThing[];
  pieces: FramePiece[];
  load: FrameLoad;
  machines: FrameMachine[];
  bays: FrameBay[];
  crew: FrameCrew[];
  truck: FrameTruck;
  flatbed: FrameFlatbed;
  /** The drop-off's car and trailer while it unloads, else null. */
  dropoffCar: { x: number; y: number; t0: number; t1: number } | null;
  skips: FrameSkip[];
  labels: FrameLabel[];
  /** The chevron's target (the goal's), metres, or null. */
  chevron: { x: number; y: number; id: string } | null;
  /** Chalk circles (visible once a yard hand is hired). */
  circles: { x: number; y: number; r: number }[];
}

export interface FrameThing {
  uid: string;
  obj: ObjectId;
  /** `${content.objects[obj].sprite}.${stage}` with stage 'whole' or 'cut1'..'cutN' (the art names them). */
  sprite: SpriteId;
  /** 0 whole, 1 to stages−1 coming apart. */
  stage: number;
  x: number;
  y: number;
  /** The tier lock it shows (tool2, tool3), or null. */
  locked: 'tool2' | 'tool3' | null;
  /** The ring: the current piece's progress 0 to 1, or null when nobody works it. */
  work: number | null;
}

export interface FramePiece {
  /** content.grades[grade].sprite. */
  sprite: SpriteId;
  grade: GradeId;
  pile: PileKey;
  /** Its index in its pile (piecePos). */
  k: number;
  x: number;
  y: number;
}

export interface FrameLoad {
  /** Pieces on the boss's carrier, bottom first (at most what the carrier holds). */
  pieces: { sprite: SpriteId; grade: GradeId; g: number }[];
  kg: number;
  cap: number;
  /** content.carriers key; its sprite is `carrier.<id>`. */
  carrier: string;
  sprite: SpriteId;
}

export type MachineLook = 'padlock' | 'idle' | 'working' | 'trayFull' | 'heating' | 'ready' | 'pour' | 'cooling';

export interface FrameMachine {
  machine: MachineId;
  place: PlaceId;
  /** `plant.<machine>.<look>` (plant.crucible.ready, plant.stripper.working). */
  sprite: SpriteId;
  look: MachineLook;
  x: number;
  y: number;
  /** Tray fill 0 to 3 (the tray's drawn levels). */
  tray: number;
  /** Ingots cooling (crucible only): their grade and count, and the cooling share 0 (hot) to 1. */
  ingots: { grade: GradeId; n: number; cool: number } | null;
}

export interface FrameBay {
  grade: GradeId;
  x: number;
  y: number;
  /** `bay.<family>.<fill>` or `stillage.<fill>` (ferrous piles 5 sizes, stillages 4 fill levels). */
  sprite: SpriteId;
  /** 0 empty to 4 full. */
  fill: number;
  held: boolean;
  g: number;
}

export interface FrameCrew {
  id: string;
  role: CrewRole;
  /** `person.<role>` (the art tints the vest). */
  sprite: SpriteId;
  job: CrewJob;
  phase: CrewPhase;
  /** From and to, metres, and the play seconds between (the world walks the picture). */
  from: { x: number; y: number };
  to: { x: number; y: number };
  t0: number;
  t1: number;
  carries: SpriteId | null;
}

export interface FrameTruck {
  owned: boolean;
  x: number;
  y: number;
  heading: number;
  /** none (no skip on the hook), empty, trial, full. */
  skip: 'none' | 'empty' | 'trial' | 'full';
  by: 'boss' | 'driver' | null;
  /** The driver's trip shown as a leg (the world drives it off down the lane and back). */
  leg: { phase: 'out' | 'hook' | 'back' | 'weigh' | 'tip'; t0: number; t1: number } | null;
  /** The hook ring 0 to 1 while the boss swaps a skip. */
  hook: number | null;
}

export interface FrameFlatbed {
  /** waiting at its stand, loading (crane), away on its round. */
  phase: 'waiting' | 'loading' | 'away';
  t0: number;
  t1: number;
  x: number;
  y: number;
  /** 0 to 3: the load drawn on its bed. */
  load: number;
}

export interface FrameSkip {
  partner: PartnerId;
  x: number;
  y: number;
  state: 'filling' | 'full' | 'trial';
  label: Txt;
}

export interface FrameLabel {
  id: string;
  x: number;
  y: number;
  /** place: a place name on first sight; padlock: over a locked thing or pad; bay: a bay chip; sign: a sign's words. */
  kind: 'place' | 'padlock' | 'bay' | 'sign';
  text: Txt;
}
