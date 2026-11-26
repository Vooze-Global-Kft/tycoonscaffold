/**
 * THE CONTRACT of the salvage rules (the scrapyard's first yard, docs/design/yard-stage1.md version 2;
 * ECONOMY.md E1 to E24 and STAGE1-RULING.md S1 to S24 bind). Pure types and a few constants. Every
 * package reads this file: the rules engineers (rules-sim, rules-book) fill the functions behind
 * src/engine/salvage.ts; the screens read the selectors' return types (FrameTable, CardData, Ticket,
 * Goal, ...); the sound package reads SalvageEvent; the strings package owns the words of every
 * TextKey (the key list is ./textKeys.ts, the strings package's).
 *
 * VERSION 2 (the fix pass of 25 November, after three engineers attacked hour 0's contract; every
 * change is listed in notes/contract.md). Fields marked `@deprecated` are kept ONE pass so that the
 * screens compile while they move to the new field named beside them; they go at the seam.
 *
 * Where each part lives:
 * - CONTENT types: src/config/schema.salvage.ts (zod; content3.json's keys and units; re-exported here).
 * - STATE (`SalvageState`, under the shared GameState as `salvage`), PRESENCE, EVENTS, ACTIONS'
 *   refusals, TICKETS, CARDS, the PROCESS BOARD, the INDUSTRY TABLE, the AWAY CARD, the GOAL and the
 *   ADVICE line, the FRAME TABLE: here. Text keys: ./textKeys.ts. Refusal keys: ./refusals.ts.
 * - The facade (every public function with its final signature): src/engine/salvage.ts.
 * - Frozen test content and the five frozen states: src/engine/fixtures/salvage.ts.
 *
 * WHOLE AND LOOSE (E17): THINGS AND PIECES ARE WHOLE (a thing in a heap, at the drop-off or on the
 * tipping floor, a piece on the ground, on a load or in a hopper is one item with its mass from
 * content; a piece exists once its cut is complete; the converter is one piece). LOOSE AND MOLTEN
 * MATERIAL IS MASS in grams (bays, trays, bins, the pot, what a machine makes). Crew, the driver and
 * the merchant are AGENTS ON LEGS: each holds at most ONE dated end, computed when its leg starts.
 * THE QUEUE IS DERIVED from the state (`nextEvent` in the facade: the minimum over its dated fields),
 * so saving the state saves the queue; nothing else is queued. The 0.1 s tick is the same `advance`
 * with a nearer horizon, time away the same with the boss absent (ticking equals jumping).
 *
 * TIME. Every dated field counts YARD SECONDS, `SalvageState.t`: live ticks plus away passes. The
 * shared `stats.playSeconds` is time PLAYED (the shared triggers read it): the tick adds dt to both,
 * the away pass only to `t`. Actions take `clock` = `g.salvage.t` (src/modes/salvage/actions.ts passes
 * it). `now` is device epoch ms (the market clock); `Ms` names epoch milliseconds; `day` a market day
 * D = floor((t_m − board.epochMs) / 86,400,000). Two times within 1e-6 s are one instant (R12).
 *
 * UNITS. Masses in the rules are integer GRAMS (`_g`); money is § with two decimals, rounded by the one
 * `roundMoney` (hundredths, half up); prices § a kilogram. Positions are metres on the ground plane, x
 * east, y south. Cash is the shared `GameState.cash`, changed by the rules only through the one commit
 * of money.ts; NOTHING IS BOUGHT ON ACCOUNT (E11): no field holds a debt.
 *
 * TEXT. The rules never hold a word a player reads: everything printed is a `Txt` (a TextKey plus typed
 * arguments). The screen turns it into words with strings.ts `say()`, which formats numbers ONLY
 * through the facade's formatters (one per `TxtArg` kind) and fills invented names from
 * `content.names` by register id.
 *
 * CHANGING THIS FILE: one line in the shared requests.md to `contract` (the rules lead); every package
 * that reads the changed part is told there.
 */
import type { GameConfig } from '../../config/schema';
import type { CardKind, CrewRole, MachineId, SalvageContent } from '../../config/schema.salvage';
import type { GameState } from '../types';
import type { RefusalKey } from './refusals';
import type { TextKey } from './textKeys';

export type * from '../../config/schema.salvage';
export { REFUSAL_KEYS } from './refusals';
export type { RefusalKey } from './refusals';
export { TEXT_KEYS } from './textKeys';
export type { TextKey } from './textKeys';

/** The shared config with the parsed `salvage` block (src/engine/salvageMode.ts `withSalvageContent`). */
export type SalvageConfig = GameConfig & { salvage: SalvageContent };
/** The shared state with the salvage fields. */
export type SalvageGame = GameState & { salvage: SalvageState };

/** Save tag of this state's family (src/engine/salvageMode.ts `saveTag`); `SalvageState.v` is the layout. */
export const SAVE_TAG = 'salvage1';
/**
 * The longest step a tick advances as live play, seconds (= the default `away.gapS`). The engine is
 * event driven, so any horizon is exact; a longer gap (backgrounded, a stalled thread) goes to the away
 * pass, which emits only `awayReport`, `passed` and `rung` (never item events: the pump would fire a
 * hundred arcs) and bumps `epoch`.
 */
export const MAX_TICK = 10;

// ================================================================================================ ids

/** A grade id of `content.grades` (li, ci, bb, no2, brs, bri, tcab, conv, ...). */
export type GradeId = string;
/** An object id of `content.objects` (washer, cable, radiator, car, ...). */
export type ObjectId = string;
/** A zone id of `content.zones` (Z1, Z2, Z3, bundle1). */
export type ZoneId = string;
/** A point id of `content.map.points`; a PLACE when `content.map.places[id]` exists (scale, rack, office, ...). */
export type PlaceId = string;
/** A key of `content.shop` or `content.dayOneList` (sack, hand1, sledge, truck, crucible, alu, night, ...). */
export type ShopKey = string;
/** A key of `content.partners` (partnerFarm, partnerDemolition): also their register name ids. */
export type PartnerId = string;
/** A recipe id of `content.machines.crucible.recipes` (brass, alu). */
export type RecipeId = string;
/** A rival's REGISTER id, which is also its content id (`content.rivals.list[].id`): rival.1 ... rival.25. Its chip name is `${id}.chip`. */
export type RivalId = string;
/** A register id of the names desk (yard-stage1.md 5.1): homeYard, merchant, foundry, partnerFarm, rival.1, crew.<n>, ... */
export type NameId = string;
/** An ENTRY id of the art manifest (src/ui/salvage/art/manifest `ManifestEntry.id`: thing.washer, piece.drum, plant.stripper.hand). Frames are the art's (named in the entry), never part of the id. */
export type SpriteId = string;
/** Grams by grade at one place (loose mass). */
export type Stock = Record<GradeId, number>;
/** The heading index of the art (on foot 0 s, 1 e, 2 n, 3 w; driving 0 s, 1 se, 2 e, 3 ne, 4 n, 5 nw, 6 w, 7 sw). */
export type Heading = number;

export type { CardKind, CrewRole, MachineId };

// ================================================================================================ presence

/**
 * The screen's sample of the boss (yard-stage1.md 2.1): where he stands, whether he drives, whether the
 * stick is held past its dead zone, how long he has stood still (seconds, 0 while moving), and his
 * heading. The rules decide nearness themselves (positions.ts `placeNear`, `thingNear`, `pileNear`).
 *
 * RULES OF THE CHANNEL. (1) The screen sends a sample at least every `feel.staleS / 2` whenever the app
 * is in the foreground, OVERLAYS OPEN INCLUDED (moving false, standingFor growing: "the worker stands"
 * under an open card, the lead's ruling); a sample older than `feel.staleS` means the app is
 * backgrounded and counts as no boss. (2) The world drives the truck only while `frame.truck.by ===
 * 'boss'` and sets `driving` from it; the RULES put the boss in the truck (a presence within
 * `truck.enter` of it, the truck owned, `by` null: `by = 'boss'`, event `enterTruck`). (3) Presence is
 * an action: it starts, continues and cancels the boss's act and reports workStart, workStop, pickup,
 * enterTruck, hookRing and refusals (tool2, tool3, tooHeavy) through its `events`.
 */
export interface Presence {
  x: number;
  y: number;
  driving: boolean;
  moving: boolean;
  standingFor: number;
  /** The art's heading index (see `Heading`); the truck's while driving. Optional only until the shell sends it. */
  heading?: Heading;
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
  /** Seconds of cutting already spent on the current piece (credited when an act or a leg is cancelled, 2.1). */
  progress: number;
  /** Who is cutting it or carrying it away (the boss, a crew id): also the CLAIM (nobody else takes it), or null. */
  by: string | null;
  /**
   * ADDED (finding W9): a stripped shell (content `objects.<obj>.shell`): every piece is off, the shell was
   * weighed in whole where it stands and waits for the merchant's next collection of its grade; nobody
   * works or carries it. Absent: an ordinary thing.
   */
  shell?: true;
}

/**
 * A WHOLE PIECE (E17), the same object for its whole life: on the ground, on a load, in a hopper. Its
 * uid never changes (`${thing uid}.p${n}`, the n-th piece cut off that thing); a whole thing carried
 * uncut keeps its thing's uid and names its object in `whole`.
 */
export interface Piece {
  uid: string;
  grade: GradeId;
  g: number;
  /** The thing's uid it came from (its provenance), or null for a whole thing carried at its unprepared grade. */
  from: string | null;
  /** Index into `objects[obj].pieces` of the spec it was cut as (its sprite and lesson); -1 for a whole thing. */
  spec: number;
  /** A whole uncut thing on wheels (S12, E4): its object id. */
  whole?: ObjectId;
}
/** A piece on a load, in a hopper or on a crew member's carrier (the same Piece). */
export type CarriedPiece = Piece;

/**
 * Where whole pieces lie on the ground (a pile). Keys: `beside.<thing uid>` (pieces that did not fit
 * the load, next to their thing), `zone.<id>` (a zone's loose pile), `dropoff` (the drop-off's front),
 * `floor` (the tipping floor), `circle.<n>` (a chalk circle). `tray.<machine>` is a pile key for
 * positions only: a tray holds mass (MachineState.tray_g).
 */
export type PileKey = string;

/** A whole piece on the ground: its pile, its index there (piecePos) and its claim. */
export interface GroundPiece extends Piece {
  pile: PileKey;
  /** Index in its pile (piecePos(pile, k)); a pile's pieces keep their k when others leave. */
  k: number;
  /** The crew id that claimed it at departure (2.12: nobody else takes a claimed item), or null. */
  claim: string | null;
}

/**
 * Where a crew leg starts or ends (resolved to metres by positions.ts `spotPos`; never saved metres
 * except the truck's last stop, which is rules state).
 */
export type Spot = { place: PlaceId } | { pile: PileKey; k?: number } | { thing: string } | { truck: true } | { xy: [number, number] };

export interface BayState {
  /** Grams in the bay (reserved and set-aside grams included). */
  g: number;
  /** Whole units in it, for the grades of `content.wholeUnits_kg` (conv, mot, cyl, alw): a lot never takes part of one. 0 otherwise. */
  n: number;
  /** Kept off the merchant's round (2.3). */
  held: boolean;
  /** Grams set aside by Sell, each lot at the price and on the day its card showed (shown equals applied); the round pays each at its own price. */
  aside: { g: number; price: number; day: number }[];
  /** Grams reserved for the crucible's next charge ("Take from bays") and for the supply deal. The round never takes them. */
  forCrucible_g: number;
  forDeal_g: number;
}

export type MachineStatus = 'notOwned' | 'arriving' | 'idle' | 'working' | 'trayFull' | 'waiting';

/**
 * The piece a machine works now (2.12's cumulative rule): its outputs are credited as
 * out_g(t) = floor(share × rate_kg_s × 1000 × (t − startAt)) per output grade, the piece's last credit
 * giving the exact remainder; `credited` is what is already in the tray. The rate is FIXED at
 * `startAt`: an event that changes it (a level, the foreman's boost, the boss leaving the hand
 * stripper) credits to that instant and restarts the record with the new rate from it.
 */
export interface MachineWork {
  piece: Piece;
  startAt: number;
  rate_kg_s: number;
  credited: Stock;
  /** Grams of the piece worked before `startAt` (a rate change credits to that instant and restarts the segment from it). Absent = 0. */
  base_g?: number;
  /**
   * 2.1 (engine2-group): a GROUPED segment, started with no boss within sight, took every hopper piece of
   * its grade with it: `piece` is their sum (the first one's uid) and `n` how many pieces it holds. Absent = 1.
   */
  n?: number;
}

export interface MachineState {
  owned: boolean;
  level: number;
  /** The hopper: WHOLE pieces waiting, in feed order (a piece enters only whole, up to `inbuf` kg). */
  hopper: Piece[];
  /** The piece in work, or null. */
  work: MachineWork | null;
  /** The out tray: loose mass, grams by grade (stops the machine at `tray` kg, nothing lost). */
  tray_g: Stock;
  /** Tray grams a yard hand has claimed at his departure (he picks them on arrival). */
  trayClaim_g: Stock;
  status: MachineStatus;
  /** Yard second it arrived on its pad and works from (the machine flatbed's set-down, 3). */
  since: number;
}

export type HeatPhase = 'empty' | 'filling' | 'heating' | 'ready' | 'pouring' | 'cooling';

/** The crucible (mass only; a heat credits its metal at its END, so it needs no work record). */
export interface CrucibleState extends MachineState {
  recipe: RecipeId;
  /** "Take from bays" (on by default, S11). */
  fromBays: boolean;
  /** New metal in the pot, grams (the heel apart). */
  charge_g: number;
  /** R1 (rules-sim-a): the charge by input grade (what a recipe change returns to each bay); absent on older saves (all to the first input). */
  chargeBy?: Record<GradeId, number>;
  /** Metal kept from the last pour (less than one ingot), grams, of the recipe's out grade. */
  heel_g: number;
  phase: HeatPhase;
  /** Yard second the phase began. */
  phaseSince: number;
  /** Yard second the phase ends (heating, pouring, cooling); null for open-ended phases (empty, filling, ready). */
  endsAt: number | null;
  /** Yard second the last feed arrived (a heat starts at start_share after start_idle without feed). */
  lastFeedAt: number;
  /** False until the first heat ever has poured (it waits at ready for the boss within first_wait_m, S11). */
  firstPoured: boolean;
  /** Ingots of the last pour while they cool (the frame draws them), with the span of their cooling. */
  /** `by`: who poured it ('boss', a crew id, or 'crucible'); absent on older saves (desk1: the pour's look). */
  cooling: { grade: GradeId; n: number; short_g: number; since?: number; until?: number; by?: string } | null;
}

export type CrewJob = 'idle' | 'feed' | 'circle' | 'tray' | 'dropoff' | 'wholeThing' | 'floor' | 'cutDropoff' | 'cutFloor' | 'drive' | 'pour';
export type CrewPhase = 'wait' | 'walkTo' | 'pick' | 'work' | 'walkBack' | 'drop';

/**
 * A crew member: an AGENT ON LEGS (E17). One leg at a time, from `from` to `to` between `t0` and `t1`
 * (t1 IS his one dated end); the picture the player sees walking IS that leg. While the truck's `trip`
 * runs, the DRIVER holds no leg of his own (phase 'wait', t1 = t0): `truck.trip.endsAt` is his end.
 */
export interface CrewMember {
  /** `${role}.${slot}`, e.g. hand.0. */
  id: string;
  role: CrewRole;
  slot: number;
  /** Index into the crew names (content.names `crew.<n>`). */
  name: number;
  level: number;
  job: CrewJob;
  phase: CrewPhase;
  from: Spot;
  to: Spot;
  t0: number;
  t1: number;
  /** The grade shown on the carrier (the first of `load`), null when empty-handed. */
  carries: GradeId | null;
  /** The whole pieces (or one whole thing) this leg moves (a yard hand), empty otherwise. */
  load: Piece[];
  /** Piece and thing uids claimed at departure (picked on arrival). */
  claims: string[];
  /**
   * A cutter's thing, with the decision made WHEN HE STARTED IT: `whole` true when the boss was not
   * within `reach.sight` (the whole thing is one event at t1, its pieces appear together), false when
   * each piece is its own event (E17, the lead's ruling).
   */
  cut: { thing: string; whole: boolean } | null;
  /** A yard hand's destination for this trip's load: 'scale' or a machine id (feed); absent when idle. */
  dest?: string;
  /**
   * Stage 2, 2.1 (engine2-group): a GROUPED RUN, planned at a departure with no boss within sight, with
   * one dated end (`end`, the queue's date for this member). While it runs, `from`/`to`/`t0`/`t1`/`phase`
   * show the planned leg under way (set at the end of every advance; nothing decides from them) and
   * `claims` is empty (each load holds its own). Absent on a leg-by-leg member and in a stage-1 save.
   */
  run?: CrewRun;
}

/** One trip of a yard hand's run: what it claimed at departure, where it picks, and its own two leg ends. */
export interface RunLoad {
  claims: string[];
  spot: Spot;
  /** The grade shown on the carrier while it walks back (display only). */
  grade: GradeId | null;
  pickAt: number;
  dropAt: number;
}

/** One thing of a cutter's run: its walk's end and its whole cut's end. */
export interface RunCut {
  thing: string;
  walkEnd: number;
  cutEnd: number;
}

/** A grouped run (2.1): planned at `t0` from `start`; lands at `end`; `k` trips of about `legS` seconds (the frame's loops). */
export interface CrewRun {
  t0: number;
  end: number;
  start: [number, number];
  k: number;
  legS: number;
  /** A yard hand's destination ('scale' or a machine id) and his loads, in order. */
  dest?: string;
  loads?: RunLoad[];
  /** A cutter's things, in order. */
  cuts?: RunCut[];
}

/** 2.1: a driver's trip planned at departure: each phase's end (walk .. park) and the truck's place then. */
export interface TripPlan {
  /** Yard second the trip left (its walk began). */
  t0: number;
  ends: number[];
  x: number;
  y: number;
}

/** A partner's skip (2.7, E13b): contents fixed when it fills, printed on its label, equal to the weigh-in. */
export interface SkipState {
  /** Its place in the rotation (0 .. level − 1; the trial skip is slot 0). */
  slot: number;
  phase: 'filling' | 'full';
  /** Yard second it was set down empty (it is full at setAt + fill_s). */
  setAt: number;
  /** Yard second it is (or was) full. The driver takes the skip full LONGEST (smallest fullAt). */
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
  /** Supply level: the number of skips in rotation (E13b; "Another skip" buys one). 0 until open, 1 when open. */
  level: number;
  /** The skips in rotation, one per level (the trial first). */
  skips: SkipState[];
}

/** The skip on the truck after a hook: paid, then weighed in over the weighbridge, then tipped. */
export interface CarriedSkip {
  partner: PartnerId;
  slot: number;
  contents: Record<ObjectId, number>;
  mass_g: number;
  price: number;
  trial: boolean;
  /** True once weighed in over the weighbridge (its ticket printed). */
  weighed: boolean;
}

export type TripPhase = 'walk' | 'out' | 'hook' | 'back' | 'weigh' | 'tip' | 'park';

export interface TruckState {
  owned: boolean;
  /** Last stopped position, metres, and heading (rules state: stepOut stores them; the driver walks to it, 2.7). */
  x: number;
  y: number;
  /** The art's 8-heading index: 0 s, 1 se, 2 e, 3 ne, 4 n, 5 nw, 6 w, 7 sw (counter-clockwise on screen). */
  heading: Heading;
  skip: CarriedSkip | null;
  /** Who is in it. */
  by: 'boss' | 'driver' | null;
  /** The driver's run: its partner, phase, the yard second the phase began and the one it ends. */
  trip: { partner: PartnerId; slot: number; phase: TripPhase; t0: number; endsAt: number; plan?: TripPlan } | null;
  /** Yard second the boss began standing still in a skip zone (the hook ring; moving clears it), or null. */
  hookSince: number | null;
  /** § and tipping-floor grams held at the driver's departure (no purchase takes cash below it; the hook always pays), or null. */
  earmark: { money: number; floor_g: number } | null;
}

export interface MerchantState {
  phase: 'waiting' | 'loading' | 'away';
  /** Yard second the phase began. */
  since: number;
  /** Yard second the phase ends (loading, away); null while waiting. */
  endsAt: number | null;
  /** The lot fixed when loading began: each line resolved down to 0.1 kg (whole units for wholeUnits_kg grades), its price and amount. */
  lot: { grade: GradeId; g: number; n?: number; price: number; amount: number }[];
}

export interface DropoffState {
  /** Yard second of the next arrival (it waits while every place is taken). */
  nextAt: number;
  /** Arrivals so far (the counter of the drawn mix; the first come from `dropoff.initial`). */
  n: number;
}

export interface DealState {
  /** Index into `content.deal.series` of the deal on offer or running (the series only grows); null before rung 2. */
  step: number | null;
  /** 'offered' (the partner wall shows it), 'running', 'declined' (Not now: offered again at the next day), 'done' (the series is finished). */
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

/**
 * The kinds of dated event (E17). NOT SAVED: the facade's `nextEvent(cfg, g)` derives the next one as
 * the minimum over the state's dated fields; this union is its `kind`.
 */
export type QueuedKind =
  | 'act' // the boss's act ends (act.endsAt)
  | 'crewLeg' // a crew member's leg ends (ref: crew id)
  | 'driverLeg' // the driver's run changes phase (truck.trip.endsAt; ref: partner)
  | 'machine' // a machine's piece ends or its tray fills (ref: machine)
  | 'crucible' // a heat, a pour or a cooling ends; the idle start (ref: '')
  | 'round' // the merchant's loading or its round ends (ref: '')
  | 'dropoffArrival' // the next household thing arrives (ref: '')
  | 'skipFull' // a partner's skip is full (ref: `${partner}.${slot}`)
  | 'arrival' // a purchase arrives (ref: shop key)
  | 'boostEnd' // the foreman's boost ends (ref: '')
  | 'day'; // 00:00 UTC: the board's step, the deal's delivery, the rivals' day (ref: '')

export interface QueuedEvent {
  /** Yard second it happens. */
  at: number;
  kind: QueuedKind;
  ref: string;
}

/** Played seconds of the foreman's boost (master 3.4) on the current market day. */
export interface ForemanState {
  day: number;
  used_s: number;
  /** Yard second the boss last worked (cut, fed, weighed). The boost ends at min(lastWorkAt + windowS, the day's minutes used up): derived. */
  lastWorkAt: number;
}

/** The market clock (2.8, S14): t_m = max(device now, highMs + live time since the last resume). */
export interface ClockState {
  /** Highest market time seen, epoch ms (saved, never backwards). */
  highMs: number;
  /** The market day of the last tick (the day boundary is an event: deal delivery, board step). */
  day: number;
  /** The market day the player started (the rivals' d = D − startDay, 2.11). */
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
  /** Ids of the goals done, in the order they were done (the first goal of content not done or skipped is the current one: derived). */
  done: string[];
  /** Ids of optional goals the player skipped (Not now: `skipGoal`). */
  skipped: string[];
  /** Yard second the last purchase prompt showed (at most one each `advice.promptGapS`, 2.10). */
  lastPromptAt: number;
  /** Times the repeating goal ("Widen the yard: {item}") has been met. */
  repeats: number;
}

/** What the player has seen or opened (every "first time" the screens print reads it). */
export interface SeenState {
  /** Places whose label has shown on first sight, or whose card was opened. */
  places: PlaceId[];
  /** Card kinds opened at least once (the board's first-opening hint, the fictional line). */
  cards: CardKind[];
}

/** What kind of vehicle or walker a purchase or an arrival comes by (sound `arrival`, the frame's `arrivals`). */
export type ArrivalKind = 'dropoff' | 'van' | 'machineFlatbed' | 'truck' | 'crew';

/** A purchase bought and paid, not yet here (2.15): it is owned, and works, from `at`. */
export interface Arriving {
  item: ShopKey;
  by: ArrivalKind;
  /** Where it is set down (its shop place: the rack, a pad, the park, the office). */
  place: PlaceId;
  since: number;
  at: number;
}

export interface SalvageState {
  /** Layout version 2 (the fix pass); a save of another layout starts afresh. */
  v: 2;
  /** YARD SECONDS: live ticks plus away passes. Every dated field below counts it. */
  t: number;
  /** Bumped by every away pass, reconcile and preset: the world snaps (never tweens or arcs) across a change of epoch. */
  epoch: number;
  clock: ClockState;
  /** Shop keys owned (tools, carriers, machines, the truck, recipes, the Night watch, "Another skip"s are levels; crew are in `crew`). An item on its way is in `arriving`, not here. */
  owned: ShopKey[];
  /** Purchases on their way (van, machine flatbed, truck): owned from their `at`. */
  arriving: Arriving[];
  /** The best tool tier owned (1 spanners at the start). */
  tier: number;
  /** The carrier in use (a key of content.carriers). */
  carrier: string;
  /** What the boss carries (whole pieces in pickup order). */
  load: Piece[];
  /** The last presence sample and the yard second it arrived (one older than `feel.staleS` counts as no boss). */
  presence: Presence;
  presenceAt: number;
  /** The boss's current act: what, on what (thing uid, place id or pile key), since when, and its one dated end (null for acts without one: drive, strip, circle). */
  act: { kind: 'none' | 'work' | 'pickup' | 'weigh' | 'feed' | 'strip' | 'circle' | 'hook' | 'tip' | 'drive'; target: string | null; since: number; endsAt: number | null };
  /** Every whole thing in the yard. */
  things: ThingState[];
  /** Every whole piece on the ground. */
  pieces: GroundPiece[];
  /** Grams in the rubble skip and the PVC bin since the start (waste to a licensed waste carrier; mass kept). */
  waste_g: number;
  /** The scale's rounding kept (signed grams: rounded minus true), so the mass test balances (2.2). */
  scaleRound_g: number;
  /** One bay per grade weighed in so far (the frame draws every bay of content, empty or not). */
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
  /** Grades whose lesson has SHOWN on a ticket: the rules pace lessons (4.4 item 5) inside the weigh-in, so a ticket's lesson is already paced. */
  lessonsSeen: GradeId[];
  seen: SeenState;
  /** The last 50 tickets, newest last, and the next ticket number. */
  tickets: Ticket[];
  ticketNo: number;
  /** A waiting away card (shown until ackAway). */
  away: AwayCard | null;
  /** Counter of the drop-off's and the skips' hashes beyond their own counters (no Math.random). */
  draws: number;
  /** True once the player has been away once (the Night watch is offered after it, E22). */
  beenAway: boolean;
  /** § collected (collections and deliveries) in five one-minute buckets of yard time, newest last; `minute` = floor(t / 60) of the newest. incomeRate = sum / 5 (2.13). */
  income: { minute: number; buckets: number[] };
  /**
   * Lifetime counters the goals' done grammar reads (notes/hints.md; never met by doing nothing): keys
   * `cut:<obj>`, `weighIns` (the boss's platform weigh-ins), `weighed:<grade>`, `made:<grade>`,
   * `worked:<machine>`, `hired:<role>`, `crewWeighIns:<role>`, `fetched:<partner>` (skips tipped),
   * `poured`, `visited:<point>`, `away` (away cards acked), `collected` (collection tickets),
   * `dealDone` (series steps finished). Optional only for states written before it (read as {}).
   */
  counts?: Record<string, number>;
}

// ================================================================================================ events

/**
 * Everything a tick or an action reports (yard-stage1.md 2.14's list, and what section 7's sound table
 * and section 4's screens rely on). Each carries what its consumer needs; nothing is a word. A piece's
 * `uid` is the same from the ground to the load to the scale or the hopper (the arcs follow it).
 */
export type SalvageEvent =
  // the hand (2.1)
  | { type: 'workStart'; thing: string; obj: ObjectId; grade: GradeId; tool: string; by: string; ring: { t0: number; t1: number; p0: number } | null }
  | { type: 'workStop'; thing: string; by: string }
  | { type: 'pieceOff'; thing: string; piece: string; grade: GradeId; g: number; to: 'load' | 'ground' | 'waste'; by: string }
  | { type: 'thingGone'; thing: string }
  | { type: 'pickup'; piece: string; grade: GradeId; g: number; by: 'boss' | string }
  | { type: 'swap'; down: string; up: string }
  | { type: 'loadFull' }
  | { type: 'feed'; machine: MachineId; piece: string; grade: GradeId; g: number; by: 'boss' | string }
  | { type: 'circleDrop'; circle: number; pieces: string[]; g: number }
  // weighing and selling (2.2, 2.3)
  | { type: 'weighIn'; ticket: Ticket; pieces: string[]; by: 'boss' | string }
  | { type: 'dropOffSlip'; thing: ObjectId; ticket: Ticket }
  | { type: 'roundLoad'; grams: number }
  | { type: 'roundAway' }
  | { type: 'roundBack' }
  /** `first`: a grade's first lot or copper on it (the sound's coin_big, the camera). */
  | { type: 'collected'; ticket: Ticket; first: boolean }
  /** The lesson printed on a weigh-in ticket (already paced, 4.4 item 5), with its arguments filled. */
  | { type: 'lesson'; grade: GradeId; text: Txt }
  // machines (2.5)
  | { type: 'machineState'; machine: MachineId; status: MachineStatus }
  | { type: 'machineOut'; machine: MachineId; grade: GradeId; g: number }
  | { type: 'heatStart'; recipe: RecipeId; g: number }
  | { type: 'readyToPour' }
  | { type: 'pour'; ingots: number; grade: GradeId; short_g: number; dross_g: number; first: boolean; by: 'boss' | string }
  | { type: 'cooled' }
  // partners, skips, the truck (2.7)
  | { type: 'skipFull'; partner: PartnerId; slot: number }
  | { type: 'hookRing'; partner: PartnerId; slot: number; t0: number; t1: number }
  | { type: 'hook'; partner: PartnerId; slot: number; price: number; by: 'boss' | 'driver' }
  | { type: 'bridgeWeighIn'; ticket: Ticket }
  | { type: 'tip'; partner: PartnerId; things: number }
  | { type: 'enterTruck' }
  | { type: 'leaveTruck' }
  // arrivals, purchases, crew
  | { type: 'arrival'; kind: ArrivalKind; what: string | null }
  | { type: 'crewLeg'; id: string; job: CrewJob; from: Spot; to: Spot; t0: number; t1: number }
  | { type: 'owned'; item: ShopKey }
  | { type: 'hired'; role: CrewRole; id: string }
  | { type: 'levelled'; target: LevelTarget; level: number }
  /** A refusal; `retry` is the action a confirming card presses on "Yes" (confirmHeel, priceUpdated with the price now in force), else null. */
  | { type: 'refused'; key: RefusalKey; args: TxtArgs; retry: CardAction | null }
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

/** What a level is bought for: a crew member (by id), a machine, or a partner's supply (another skip in rotation, E13b). */
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
 * pure: `(cfg, g, ...args, clock, events) => SalvageGame`, `clock` the YARD second (`g.salvage.t`),
 * refusals pushed to `events` with the SAME state object returned. `now` (epoch ms) where the market
 * day matters. Which check returns which refusal key:
 * - buy: `owned` (owned or arriving), `rung` (gate not reached), `earmark` (price ≤ cash but > cash −
 *   the driver's earmark), `cash` (price > cash), `ceiling`, `priceUpdated` (shown ≠ now; retry carries
 *   the price now).
 * - hire: `noPlace` (no unbought crew key of that role), then as buy.
 * - level: `notOwned` (a machine not owned, a partner not open, a crew id unknown), `topLevel`, `earmark`, `cash`, `ceiling`, `priceUpdated`.
 * - setHold: none (same state when nothing changes). sell: `nothing` (no unreserved grams), `priceUpdated`.
 * - setRecipe: `notOwned` (recipe not owned), `heatRunning`, `confirmHeel` (retry: the same act with confirmHeel true).
 * - setFromBays: `notOwned` (no crucible). signDeal: `nothing` (no deal offered), `priceUpdated`. declineDeal: `nothing`.
 * - stepOut: `stopFirst` (the truck still moving), `nothing` (not driving).
 * - presence: tool2, tool3 (a thing above the best tool), tooHeavy (a whole thing over the carrier), weighFirst, filling, loadCash, floor, noTruck at the skip.
 * - skipGoal: `nothing` (not the current goal or not optional). noteSeen, ackAway: never refused.
 */
export interface SalvageActions {
  presence(cfg: SalvageConfig, g: SalvageGame, p: Presence, clock: number, events?: SalvageEvent[]): SalvageGame;
  buy(cfg: SalvageConfig, g: SalvageGame, item: ShopKey, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame;
  hire(cfg: SalvageConfig, g: SalvageGame, role: CrewRole, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame;
  level(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame;
  setHold(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, on: boolean, clock: number, events?: SalvageEvent[]): SalvageGame;
  sell(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, shown: SellShown, now: number, clock: number, events?: SalvageEvent[]): SalvageGame;
  setRecipe(cfg: SalvageConfig, g: SalvageGame, recipe: RecipeId, confirmHeel: boolean, clock: number, events?: SalvageEvent[]): SalvageGame;
  setFromBays(cfg: SalvageConfig, g: SalvageGame, on: boolean, clock: number, events?: SalvageEvent[]): SalvageGame;
  signDeal(cfg: SalvageConfig, g: SalvageGame, shownTerms: DealTerms, now: number, clock: number, events?: SalvageEvent[]): SalvageGame;
  declineDeal(cfg: SalvageConfig, g: SalvageGame, clock: number, events?: SalvageEvent[]): SalvageGame;
  stepOut(cfg: SalvageConfig, g: SalvageGame, at: { x: number; y: number; heading: Heading } | null, clock: number, events?: SalvageEvent[]): SalvageGame;
  skipGoal(cfg: SalvageConfig, g: SalvageGame, id: string, clock: number, events?: SalvageEvent[]): SalvageGame;
  noteSeen(cfg: SalvageConfig, g: SalvageGame, seen: { place?: PlaceId; card?: CardKind }, clock: number): SalvageGame;
  ackAway(cfg: SalvageConfig, g: SalvageGame): SalvageGame;
}

// ================================================================================================ text

/** One typed argument of a printed line. The screen formats each kind with its ONE formatter (facade). */
export type TxtArg =
  | { money: number } // fmtMoney: "§12.30", "§3,148", "§412k"
  | { exact: number } // ADDED (W11, rules-book): fmtMoneyExact, a ticket keeps its hundredths
  | { price: number } // fmtPrice: § a kilogram, "§0.95"
  | { mass_g: number; step?: MassStep; ferrous?: boolean } // fmtMass: "28.6 kg", "1,020 kg", "12.34 t"
  | { tonnes_g: number } // fmtTonnes: always tonnes, two decimals: "0.15 t", "24.50 t"
  | { kg_g: number } // fmtKg: kilograms, one decimal, no unit: "28.6" (the carry chip's "28.6 / 30 kg")
  | { rate_g_h: number } // fmtRate: grams an hour, "1.2 t an hour" from 1 t, "640 kg an hour" below
  | { day: number } // fmtDay: the market day's UTC date, "25 Nov"
  | { hours: number } // fmtHours: "4 h", "6 h", "1.5 h"
  | { n: number } // a plain count, "12"
  | { rank: number } // fmtRank: an ordinal, "25th"
  | { secs: number } // fmtDuration: "4 m 10 s", "3 h 12 m"
  | { pct: number } // fmtPct: a share 0 to 1, "75 %"
  | { name: NameId } // an invented name from content.names
  | { grade: GradeId } // a grade's name from content.grades
  | { thing: ObjectId } // a thing's name from content.objects
  | { ref: string } // a record reference printed as it is: the car's treatment record "0012"
  | { text: TextKey }; // another line (a tool's name in a refusal, an item in a goal)
export type TxtArgs = Record<string, TxtArg>;
/** A line as data: a key of strings.ts and its arguments (holes `{arg}` in the text). */
export interface Txt {
  key: TextKey;
  args?: TxtArgs;
}

/** Mass steps (2.2's one rounding rule): the platform and lots 0.1 kg, the weighbridge `scale.bridgeStepKg`. */
export type MassStep = 'platform' | 'bridge' | 'lot';

// ================================================================================================ tickets

/** One grade line of a ticket: the grade, grams resolved to the ticket's step, whole units, § a kg, the amount (2.2). */
export interface TicketLine {
  grade: GradeId;
  g: number;
  /** Whole units for wholeUnits_kg grades (a converter, motors), else absent. */
  n?: number;
  price: number;
  /** roundMoney(resolved kg × price); a total is the sum of its lines. */
  amount: number;
  /** "from car ref. {ref}" on a converter's line; "certified empty" on a closed vessel's. */
  note?: { kind: 'fromCar'; ref: string } | { kind: 'certifiedEmpty' };
}

interface TicketBase {
  /** Ticket number (the history's order; unique, never printed since the fix pass: print `series`). */
  no: number;
  /**
   * ADDED (finding W16): the number PRINTED on the ticket, from its own book: weigh-ins (platform and
   * skip) No. 1, 2, ...; sales (collections and deal deliveries) ticket 1, 2, ...; a drop-off slip has
   * none. Absent on tickets printed before the fix pass (print `no` then). series.ts `stampSeries`.
   */
  series?: number;
  /** Yard second and market day it printed (the date: fmtDay(day)). */
  at: number;
  day: number;
}

/** The five kinds of 2.2. Every line typed; the screen prints at most three lines and "+ n more". */
export type Ticket =
  /** Weighed in on the platform: no payment; the muted "today's value". At most one lesson, already paced by the rules. */
  | (TicketBase & {
      kind: 'weighIn';
      by: 'boss' | string;
      lines: TicketLine[];
      todaysValue: number;
      /** The lesson with its arguments filled (lesson.bb's {n}, lesson.conv's {ref}), or null. */
      lessonText: Txt | null;
      /** @deprecated the bare key; read `lessonText` (goes at the seam). */
      lesson: TextKey | null;
    })
  /** A household drop-off signed in at the gate: "{thing} · signed in · gate drop-off". */
  | (TicketBase & { kind: 'dropOffSlip'; thing: ObjectId })
  /** A partner's skip over the weighbridge: gross, tare (the truck's stored tare plus the empty skip), net, the price paid. */
  | (TicketBase & { kind: 'skipWeighIn'; partner: PartnerId; trial: boolean; gross_g: number; tare_g: number; net_g: number; paid: number; things: { obj: ObjectId; n: number }[] })
  /**
   * The merchant's collection: lines with amounts, "Paid §x", the buyer named. `withBoss` false: none of
   * the lot was weighed in by the boss, and the screen shows the one-line chip at the cab ("Lot sold ·
   * §x", 4.4 item 4) instead of the ticket. `firstGrades`: grades sold for the first time on it.
   */
  | (TicketBase & { kind: 'collection'; buyer: NameId; lines: TicketLine[]; paid: number; withBoss: boolean; firstGrades: GradeId[] })
  /** A supply-deal delivery: "{foundry} · {kg} cast iron · §{x}". */
  | (TicketBase & { kind: 'dealDelivery'; buyer: NameId; grade: GradeId; g: number; paid: number });

export type TicketKind = Ticket['kind'];

// ================================================================================================ cards

/** A button on a card: what it does (the action and its arguments, prices as SHOWN), its label, and a refusal if it cannot. */
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
  | { act: 'skipGoal'; id: string }
  | { act: 'ackAway' }
  | { act: 'open'; card: CardRef };

export interface CardButton {
  label: Txt;
  action: CardAction;
  /** Null: pressable. Else why not (the button greys and shows it on press). Set only for row state 'cantAfford'. */
  refusal: Txt | null;
}

/**
 * How a row is drawn (cardOf sets it; the screen never classifies a row by its refusal):
 * owned (a tag, no button), buy (Buy with price), cantAfford (Buy greyed, refusal "Not enough cash: §x
 * more"), locked (padlock and condition, no price, no button), notBottleneck (Level with "not the
 * bottleneck now · +x"), arriving ("on its way", no button), top (top level, no button).
 */
export type RowState = 'owned' | 'buy' | 'cantAfford' | 'locked' | 'notBottleneck' | 'arriving' | 'top' | 'info';

/** One row of a panel (44 pt: a name line, an effect line ≤ 38, an optional button, an optional pictogram). */
export interface CardRow {
  id: string;
  name: Txt;
  line: Txt | null;
  /** Null for owned, locked, arriving, top and info rows. */
  button: CardButton | null;
  /** A pictogram sprite (ui.picto.bb, ...). */
  icon: SpriteId | null;
  /** A second line of numbers (the board's five bars, a bay's stock) where the card has one. */
  extra?: Txt | null;
  /** How the row is drawn (always set by cardOf; optional only for the screens' own stand-in rows). */
  state?: RowState;
}

/**
 * Which card to open. `place` routes through content (`map.places.<id>.card`: the place's card kind);
 * every other ref names its card directly. The stripper pad opens BOTH its machines' cards in one
 * (CardData.machines); `machine` opens one.
 */
export type CardRef =
  | { kind: 'place'; place: PlaceId }
  | { kind: 'machine'; machine: MachineId }
  | { kind: 'office'; tab: 'rota' | 'partners' | 'processBoard' }
  | { kind: 'bay'; grade: GradeId }
  | { kind: 'board'; focus?: GradeId }
  | { kind: 'skip'; partner: PartnerId; slot?: number }
  | { kind: 'deal' }
  | { kind: 'table' }
  | { kind: 'processBoard' }
  | { kind: 'away' }
  | { kind: 'rung'; n: number }
  | { kind: 'clipboard' }
  | { kind: 'settings' }
  | { kind: 'help' };

export type CardShape = 'panel' | 'wide' | 'centred';

/** One line of the clipboard's goal list (goalList). */
export interface GoalLine {
  id: string;
  text: Txt;
  state: 'done' | 'current' | 'skipped' | 'later';
  optional: boolean;
}

/**
 * Every card and overlay of section 4 as DATA (cardOf): what it prints, row by row, with each button's
 * exact price and refusal. The screen formats nothing but numbers (through the formatters).
 */
export interface CardData {
  kind: CardKind;
  shape: CardShape;
  title: Txt;
  /** Lines under the title (the rota's "Site licence · metal dealer", a machine's status, the deal's terms). */
  lead: Txt[];
  /** Tabs of the office panel (Rota, Partners, Process board), with the open one (refs are `{kind:'office', tab}`). */
  tabs?: { ref: CardRef; title: Txt; open: boolean }[];
  rows: CardRow[];
  /** Buttons at the foot (Sign / Not now, OK). */
  foot: CardButton[];
  /** The machines of the card: one, or both strippers on the stripper pad (hand stripper first). */
  machines?: MachineCard[];
  /** @deprecated the first of `machines` (goes at the seam). */
  machine?: MachineCard;
  board?: PriceBoard;
  /** The board's row to scroll to (a bay opens the board at its row). */
  focus?: GradeId;
  table?: IndustryTable;
  away?: AwayCard;
  processBoard?: ProcessBoardRows;
  skip?: SkipLabel;
  /** The partners tab: every skip in rotation of each partner. */
  skips?: SkipLabel[];
  /** The clipboard: the goal list and the places visited. */
  goals?: GoalLine[];
  places?: PlaceId[];
  /** The legal line where the card has one (the board's and the table's fictional line). */
  legal?: Txt | null;
}

export interface MachineCard {
  machine: MachineId;
  owned: boolean;
  level: number;
  status: Txt;
  /** In → out grades (the stripper cab → bb, no2; the bench mot → no2, li, alcast). */
  in: GradeId[];
  out: GradeId[];
  /** Rate in the yard's units, grams an hour at the current level (fmtRate). */
  rate_g_h: number;
  /** @deprecated kg a second; read `rate_g_h` (goes at the seam). */
  rate: number;
  /** The hopper's whole pieces by grade (count and grams), and its room. */
  hopper: { grade: GradeId; n: number; g: number }[];
  hopperCap_g: number;
  tray_g: Stock;
  trayCap_g: number;
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
  /** The bay: grams, held, reserved, set aside. */
  bay_g: number;
  held: boolean;
  reserved_g: number;
  aside_g: number;
  hold: CardButton;
  sell: CardButton | null;
  /** On a held bay, how long Hold lasts (E32): "Held until a high day, two days at most"; null when not held. */
  heldLine?: Txt | null;
}

export interface PriceBoard {
  day: number;
  /** Seconds to the next step (the head's "next prices in {h} h {m} m"). */
  nextInS: number;
  rows: BoardRow[];
  /** The first opening's hint ("Cast iron: a low day. Holding is free."): set while `seen.cards` lacks 'board'. */
  hint: Txt | null;
}

/** A skip's label (2.7): a world plate and the skip card. */
export interface SkipLabel {
  partner: PartnerId;
  slot: number;
  state: 'filling' | 'full' | 'trial' | 'onTruck';
  net_g: number;
  /** All things (the plate prints three and "+ n more"). */
  things: { obj: ObjectId; n: number; grade: GradeId; g: number }[];
  price: number;
  /** Why it cannot be hooked now (refusal.filling {t: secs}, loadCash {x}, floor {kg}, noTruck), else null. */
  refusal: Txt | null;
  fullInS: number | null;
  fullAt: number;
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
  /** The machine card it opens (null: greyed). */
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
  /** A rival's register id, or 'you'. */
  id: RivalId | 'you';
  name: NameId;
  /** The chip name's register id (`${id}.chip`, ≤ 14 characters; the player's row: homeYard). */
  chip: NameId;
  tonnes_g: number;
  simulated: boolean;
  logo: SpriteId | null;
}

export interface IndustryTable {
  rows: TableRow[];
  /** The player's rank (1 to 26) and the next rival up with the grams still needed. */
  rank: number;
  next: { rival: RivalId; name: NameId; chip: NameId; need_g: number } | null;
  /** The nine rungs (content `ladder.rungs`): tonnes and range gates, the current one lit. */
  rungs: { n: number; t: number; range: number; current: boolean; open: boolean }[];
  /** Range chips: each material of the stage, counted or not. */
  range: { material: string; counted: boolean; worth: number }[];
}

// ================================================================================================ away, goal, advice, top bar

/** The away card (4.4; 2.16). Its money is already in cash (the away pass pays through money.ts). */
export interface AwayCard {
  seconds: number;
  capS: number;
  /** Supplied grams by grade with the money each brought. */
  lines: { grade: GradeId; g: number; money: number }[];
  supplied_g: number;
  money: number;
  loads: number;
  deliveries: number;
  /** Register ids of the rivals passed. */
  passed: RivalId[];
  /** With little to show: what would have earned more (away.hintCutter, ...). */
  hint: Txt | null;
  /** P3/E33 (rules-sim-a): the whole absence, seconds, before the cap (`seconds` is what the yard RAN). */
  absentS?: number;
  /** P3: § spent while away (loads bought and anything else); `money` is the sales (collections and deliveries). */
  spent?: number;
  /** P3: loads bought while away, by partner. */
  bought?: { partner: PartnerId; n: number; spent: number }[];
  /** P3: money − spent (what the cash moved by). */
  net?: number;
  /** E34: the supply deal's deliveries while away (market day, grams, §). */
  deliveryList?: { day: number; g: number; paid: number }[];
  /** E33: what makes the yard run longer next time: the next rung's cap, else the Night watch (not owned), else null. */
  runLonger?: { rung: number; capS: number } | { item: 'night'; capS: number } | null;
  /**
   * ADDED (join3): what stands in the bays, not yet sold, because of the time away: the stock the pass
   * weighed in that the merchant has not collected (held bays included), at the day's lot price, §.
   * Cash can fall while the yard holds the value (loads bought while a bay is held): this line says so.
   */
  unsold?: number;
  /** ADDED (join3): the signed change of the bays' value over the passes on this card (unsold = max(0, it)). */
  bayDelta?: number;
}

/** The goal card (2.10): its first line, what follows, and a meter where the goal counts something. */
export interface Goal {
  n: number;
  id: string;
  text: Txt;
  /** The chevron's target as the rules resolved it (a point id, or a thing's uid for an object goal). */
  target: string | null;
  /** "1.20 / 2.50 t" as a line, and the share 0 to 1 (null when the goal counts nothing). */
  meter: { text: Txt; share: number } | null;
  /** @deprecated unitless; read `meter` (goes at the seam). */
  progress: { a: number; b: number } | null;
  /** The shop key the goal asks to buy (a purchase prompt). */
  buy: ShopKey | null;
  /** The next goal's line (the tapped card's second line), or null. */
  next: Txt | null;
  /** True for a goal with a Not now (skipGoal). */
  optional: boolean;
}

/** The advice line (2.10): the cheapest purchase that widens the bottleneck now (a buy, a hire or a level). */
export interface Advice {
  /** The action, with the price as the card would show it. */
  action: Extract<CardAction, { act: 'buy' | 'hire' | 'level' }>;
  /** The card that sells it. */
  open: CardRef;
  price: number;
  line: Txt;
}

/** The top bar (4.1): cash, the ladder chip, carry. */
export interface TopBar {
  cash: number;
  rank: number;
  of: number;
  next: { name: NameId; chip: NameId; need_g: number } | null;
  /** The rival just passed (for "25th of 26 · passed {rival}"), else null. */
  passed: { name: NameId; chip: NameId } | null;
  /** On foot: carried grams and the carrier's grams (print with kg_g). `kg`, `cap`: @deprecated kilograms. */
  carry: { load_g: number; cap_g: number; kg: number; cap: number } | null;
  /** Driving: the skip's net grams (print with mass_g step bridge) and whether it is a trial load. `kg`: @deprecated. */
  driving: { net_g: number; trial: boolean; kg: number } | null;
}

// ================================================================================================ the frame table

/** A span of yard seconds: something runs from t0 to t1 (the world interpolates on the UI thread). */
export interface Span {
  t0: number;
  t1: number;
}

/** A pose of a person (the art's poses; the work poses by tool). */
export type Pose = 'stand' | 'walk' | 'push' | 'carry' | 'feed' | 'pour' | 'weigh' | 'spanner' | 'sledge' | 'grinder' | 'torch' | 'drive';
/** A tool a person works with (by the piece's family, 2.4). */
export type ToolKind = 'spanner' | 'sledge' | 'grinder' | 'torch';
/** The look family of a carried load (the art's LoadFamily; content `grades.<id>.load`). */
export type LoadFamily = 'fe' | 'ci' | 'cu' | 'br' | 'al' | 'cab' | 'mot' | 'hms';

/**
 * EVERYTHING THE WORLD DRAWS FROM THE RULES (frame(cfg, g)), pushed to the UI thread at each store change
 * (src/ui/salvage/world/useRulesTable.ts). Positions in metres; sprites by art-manifest ENTRY id (frames
 * and levels are the art's: thing stages by stageOf(frames, off, total), bay levels from `share`).
 * Everything that runs carries its span; the world interpolates it and never decides a rule.
 */
export interface FrameTable {
  /** Yard second of the state (SalvageState.t). */
  t: number;
  /** Changes on every away pass, reconcile and preset: the world SNAPS across it (no tweens, no arcs) and re-anchors its clock. */
  epoch: number;
  boss: FrameBoss;
  things: FrameThing[];
  pieces: FramePiece[];
  load: FrameLoad;
  machines: FrameMachine[];
  bays: FrameBay[];
  crew: FrameCrew[];
  truck: FrameTruck;
  flatbed: FrameFlatbed;
  /** The drop-off's car and trailer while it comes, unloads and goes, else null. */
  dropoffCar: { x: number; y: number; t0: number; t1: number; from: { x: number; y: number }; to: { x: number; y: number } } | null;
  /** Purchases on their way: the van to the rack, the machine flatbed's crane on a pad, the truck to its park. */
  arrivals: FrameArrival[];
  /** Equipment that rungs or purchases add (the radiation portal, the ID desk window, the crane's sign, the tool rack's tiers). */
  fixtures: { id: string; sprite: SpriteId; x: number; y: number }[];
  /** One per skip in rotation of each open partner (and the trial skips standing at their sites). */
  skips: FrameSkip[];
  labels: FrameLabel[];
  /** The chevron's target (the goal's, resolved by the rules), metres, or null. */
  chevron: { x: number; y: number; id: string } | null;
  /** Chalk circles (visible once a yard hand is hired). */
  circles: { x: number; y: number; r: number }[];
  /** The foreman's meter on his vest: on while the boost runs, its seconds left today. */
  foreman: { active: boolean; left_s: number };
}

/** The boss as the rules see him: where to place him on mount and on an epoch change, his act, pose and ring. */
export interface FrameBoss {
  x: number;
  y: number;
  heading: Heading;
  act: SalvageState['act']['kind'];
  /** Thing uid, place id or pile key of the act. */
  target: string | null;
  tool: ToolKind | null;
  pose: Pose;
  /** The grade of the piece he cuts now (the work animation and the sledge-or-grinder sound follow it). */
  grade: GradeId | null;
  /** The work, weigh or hook ring: from p0 at t0 to full at t1. */
  ring: { t0: number; t1: number; p0: number } | null;
  /** What he is next to (the mark round it), from the rules' nearness. */
  near: { kind: 'thing' | 'place' | 'pile'; id: string } | null;
  /** The one button's face: Open (at a place with a card), Step out (driving), or blank. */
  button: 'open' | 'stepOut' | null;
  place: PlaceId | null;
}

export interface FrameThing {
  uid: string;
  obj: ObjectId;
  /** The manifest ENTRY id (content `objects.<id>.sprite`, e.g. thing.washer); the frame is stageOf(entry.frames.length, off, total). */
  sprite: SpriteId;
  /** Pieces off and pieces in all. */
  off: number;
  total: number;
  /** @deprecated a stage index computed with the art's stageOf over content `stages`; call stageOf (goes at the seam). */
  stage: number;
  x: number;
  y: number;
  /** The tier lock it shows (tool2, tool3), or null. */
  locked: 'tool2' | 'tool3' | null;
  /** The ring of the piece being cut: from p0 (0..1) at t0 to full at t1, or null when nobody works it. */
  ring: { t0: number; t1: number; p0: number } | null;
  /** @deprecated the ring sampled at `t`; read `ring` (goes at the seam). */
  work: number | null;
  /** The grade of the piece being cut now (its family picks the tool), or null. */
  grade: GradeId | null;
  /** Who works it (the boss, a cutter's id), or null. */
  by: string | null;
}

export interface FramePiece {
  /** The piece's uid: the same piece from the ground to a load to the scale. */
  uid: string;
  /** The manifest entry of the piece's kind (content `objects.<obj>.pieces[spec][3]`, else `grades.<id>.sprite`). */
  sprite: SpriteId;
  grade: GradeId;
  load: LoadFamily;
  pile: PileKey;
  /** Its index in its pile (piecePos). */
  k: number;
  x: number;
  y: number;
}

export interface FrameLoad {
  /** Pieces on the boss's carrier, bottom first (at most what the carrier holds). */
  pieces: { uid: string; sprite: SpriteId; grade: GradeId; g: number; load: LoadFamily }[];
  kg: number;
  cap: number;
  /** content.carriers key; its sprite is `carrier.<id>`. */
  carrier: string;
  sprite: SpriteId;
}

export type MachineLook = 'padlock' | 'arriving' | 'idle' | 'working' | 'trayFull' | 'heating' | 'ready' | 'pour' | 'cooling';

export interface FrameMachine {
  machine: MachineId;
  place: PlaceId;
  /** The look (the world maps MachineId × MachineLook to manifest entries in ONE table it owns). */
  look: MachineLook;
  /** @deprecated `plant.<machine>.<look>`, matches no manifest entry; map `look` (goes at the seam). */
  sprite: SpriteId;
  x: number;
  y: number;
  /** Tray fill 0 to 3 (the tray's drawn levels), and the share of its capacity 0 to 1. */
  tray: number;
  trayShare: number;
  /** Ingots cooling (crucible only): grade, count, and the span of their cooling. `cool` @deprecated (0 hot to 1 cold at t). */
  ingots: { grade: GradeId; n: number; cool: number; span: Span | null } | null;
  /** Who pours (crucible only, while ready or pouring): the boss, else the nearest crew member. */
  pourer: 'boss' | string | null;
  /** A heat's span (heating) or the pour's (crucible only). */
  span: Span | null;
}

export interface FrameBay {
  grade: GradeId;
  /** The bay's look from content `grades.<id>.bay`: a lock-block heap, a stillage, the converter cage. */
  kind: 'heap' | 'stillage' | 'cage';
  /** The manifest entry of its look (content `grades.<id>.bay.sprite`). */
  look: SpriteId;
  x: number;
  y: number;
  /** Fill share 0 to 1 of the bay's capacity (the art owns its level count). */
  share: number;
  /** @deprecated `bay.ferrous.<0-4>` / `stillage.<0-3>`; read `look` and `share` (goes at the seam). */
  sprite: SpriteId;
  /** @deprecated 0 to 4; read `share`. */
  fill: number;
  held: boolean;
  g: number;
  /** § of its collectable grams at today's price, today's price, and the day word: the chip prints them. */
  value: number;
  price: number;
  word: 'low' | 'usual' | 'high';
  /** "Reserved for {foundry} a / q kg" and "For the crucible a / b kg", or null. */
  forDeal: { a_g: number; q_g: number } | null;
  forCrucible: { a_g: number; b_g: number } | null;
  aside_g: number;
}

export interface FrameCrew {
  id: string;
  role: CrewRole;
  pose: Pose;
  tool: ToolKind | null;
  /** @deprecated `person.<role>`; draw by role and pose (goes at the seam). */
  sprite: SpriteId;
  job: CrewJob;
  phase: CrewPhase;
  /** From and to, metres, and the yard seconds between (the world walks the picture), through `via` if given. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  via?: { x: number; y: number }[];
  t0: number;
  t1: number;
  /** @deprecated a sprite; read `load`. */
  carries: SpriteId | null;
  /** The whole pieces on the leg's carrier (drawn strapped on, never a tower); a whole thing names its entry in `thing`. */
  load: { uid: string; sprite: SpriteId; grade: GradeId; g: number; load: LoadFamily; thing?: SpriteId }[];
}

export interface FrameTruck {
  owned: boolean;
  /** Where it stands (or last stopped) and its heading: the world places it here on mount and on an epoch change. */
  x: number;
  y: number;
  heading: Heading;
  /** The skip on the hook: its state and whose load (the art's skip load frames: farm-trial, farm-full, ...). */
  load: { state: 'empty' | 'trial' | 'full'; partner: PartnerId } | null;
  /** @deprecated none, empty, trial, full; read `load` (goes at the seam). */
  skip: 'none' | 'empty' | 'trial' | 'full';
  by: 'boss' | 'driver' | null;
  /** The driver's trip as a leg: phase, partner, span, ends and the path (park → gate → lane site and back) from positions.ts. */
  leg: { phase: TripPhase; partner: PartnerId; t0: number; t1: number; from: { x: number; y: number }; to: { x: number; y: number }; path: { x: number; y: number }[] } | null;
  /** The hook ring's span while the boss swaps a skip. `hook` @deprecated: 0 to 1 sampled at t. */
  hookSpan: Span | null;
  hook: number | null;
}

export interface FrameFlatbed {
  /** waiting at its stand, loading (crane), away on its round. */
  phase: 'waiting' | 'loading' | 'away';
  /** The phase's span (t0 its real start). */
  t0: number;
  t1: number;
  x: number;
  y: number;
  /** Where it drives from and to in this phase (stand ↔ gate ↔ off the lane), and the path. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  path: { x: number; y: number }[];
  /** 0 to 3: the load drawn on its bed. */
  load: number;
}

export interface FrameArrival {
  item: ShopKey;
  kind: ArrivalKind;
  place: PlaceId;
  from: { x: number; y: number };
  to: { x: number; y: number };
  span: Span;
  /** in: driving in; setDown: the crane or the van's tail lift; out: driving away. */
  phase: 'in' | 'setDown' | 'out';
}

export interface FrameSkip {
  partner: PartnerId;
  slot: number;
  /** The skip zone's centre (positions.ts skipZone). */
  x: number;
  y: number;
  state: 'filling' | 'full' | 'trial';
  fullAt: number;
  /** The whole plate as data (name, net, things, price, why it cannot be hooked). */
  plate: SkipLabel;
  /** @deprecated one line; read `plate` (goes at the seam). */
  label: Txt;
}

export interface FrameLabel {
  id: string;
  x: number;
  y: number;
  /** place: a place name (shown while `first` is true: never seen); padlock: over a locked thing or pad; bay: a bay chip and its extra chips; sign: a sign's words. */
  kind: 'place' | 'padlock' | 'bay' | 'sign';
  text: Txt;
  /** A place label not yet seen (shows on first sight, 4.2). */
  first?: boolean;
}
