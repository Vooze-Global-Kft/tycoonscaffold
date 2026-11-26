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
 *
 * VERSION 3 (stage 2, docs/design/yard-stage2.md 2.18, 2.19, 4.2 to 4.11; RULING2.md sections 14 and 15;
 * label contract2, 26 November; FROZEN: changed only on a request in requests.md to `contract2`). ADDITIVE:
 * nothing of version 2 is removed or renamed; what Phase B removes is listed in notes/s2a-contract2.md and
 * marked "Phase B" here. The new parts are the section "STAGE 2" at the end of this file, plus additions
 * in place, each marked "v3". The empty stage-2 part of a state is ./state2.ts (`freshStage2`, used by
 * create and by the migration); hand-written sample cards for the screens are ./samples2.ts (SAMPLES).
 * E11 AS AMENDED BY E37 AND E41 (B17): the ONLY debt is `bank.agreement`, repaid out of lot payments
 * (`bank.ts payLot`), never out of cash; nothing else holds a debt and cash never goes below zero.
 */
import type { GameConfig } from '../../config/schema';
import type { BAY_KINDS, BOARD_TABS, CardKind as SchemaCardKind, CrewRole, LOOK_SLOTS, MachineId, SalvageContent } from '../../config/schema.salvage';
import type { ProductArrival as SharedProductArrival, ProductListing as SharedProductListing } from '../mode';
import type { GameState } from '../types';
import type { RefusalKey } from './refusals';
import type { TextKey } from './textKeys';

export type * from '../../config/schema.salvage';
export { REFUSAL_KEYS, REFUSAL_KEYS_V3 } from './refusals';
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

export type { CrewRole, MachineId };
/**
 * v3: the card kinds of stage 2 (yard-stage2.md 4.2). Content's `CARD_KINDS` (schema.salvage.ts, content2's)
 * takes them too (requests.md), so that `map.places.<id>.card` can name `works`, `yardSale`, `lot`, `crate`;
 * until then this union holds them. Phase B: once CARD_KINDS has them, `CardKind` is the schema's again.
 */
// `agreements` is the office's fourth tab (4.5), whose CardData needs a kind as rota, partners and processBoard have (4.2 forgot it).
export const CARD_KINDS_V3 = ['works', 'finance', 'letter', 'yardSale', 'lot', 'crate', 'shop', 'packSheet', 'ageQuestion', 'packCode', 'awayBonus', 'agreements'] as const;
export type CardKind = SchemaCardKind | (typeof CARD_KINDS_V3)[number];

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
  /**
   * v3 (2.18 `presence.vehicle`, 2.9): what the boss is in, as the world drives it: the truck, the
   * forklift, or neither. As with `driving`, the RULES decide who is in what (`truck.by`, `forklift.by`:
   * walking into the forklift enters it); the world sets this from the frame (`frame.forklift.by ===
   * 'boss'`). Absent = `driving ? 'truck' : null` (a stage-1 shell).
   */
  vehicle?: 'truck' | 'forklift' | null;
}

// ================================================================================================ the state

/** Where a whole thing stands. `k` is its index at that place (thingPos is a pure function of it). */
export type ThingAt =
  | { at: 'zone'; zone: ZoneId; k: number }
  | { at: 'dropoff'; slot: number }
  | { at: 'floor'; slot: number }
  // v3 (2.18; s2a-fix: one union, the parallel ThingAtV3 merged): where a stage-2 thing stands.
  // v3 (2.18): `since` (yard second it was set there) orders "the oldest thing" (a visitor takes, the boss sorts); ties by uid.
  /** On the Yard sale, at a place of the rack (`positions.ts rackSlot(slot)`), racked at `since`. */
  | { at: 'rack'; slot: number; since: number }
  /** A reusable batch on the Yard sale's trade corner (k its pallet), set down at `since`. */
  | { at: 'corner'; k: number; since: number }
  /** On the picking table (id `crate`) at its place k, tipped there at `since`. Nothing on it expires (P2). */
  | { at: 'crate'; k: number; since: number }
  /** A delivered lot ("oversize piece") on the oversize pad's square k (0 to 3). Never expires (ruling 13.3). */
  | { at: 'lot'; k: number }
  /** An end-of-life car on the car pad (k 0: one car at a time), set down from the hook-lift's flatrack. */
  | { at: 'elvPad'; k: number }
  /** An end-of-life car on a station's apron (the depollution bay's), set there by the forklift only. */
  | { at: 'apron'; plate: PlateId }
  /** rules-works wave 2 (ADD, requests.md): `reuse.firstThing` (the first bath) beside the Yard sale's canopy, not on the floor (2.12, 3.3); it waits for the boss. */
  | { at: 'canopy'; k: number };

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
  /** v3 (2.10.1, B10): a delivered lot's mass, grams, fixed on arrival (its value once cut is μ × I then). Absent: the object's content mass. */
  g?: number;
  /** v3 (2.10.1): the partner (a register id) whose lorry delivered this lot; printed on its plate. Absent: not a lot. */
  sender?: PartnerId;
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
  /**
   * v3 (2.8.1, B8): grams reserved for each station that draws from this bay (up to the station's
   * `inbuf`): the round collects only the stock above the reserves and Sell on them is refused (`routed`).
   * It REPLACES `forCrucible_g` in Phase B (the migration maps that to `reserved.crucible`); optional
   * until then, because bays are made in files Phase B owns. Absent = {}.
   */
  reserved?: Record<StationId, number>;
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

/** v3 'rack' (2.12): a yard hand racking a tagged thing on the Yard sale (within `crew.hand.load`, while a place is free). */
export type CrewJob = 'idle' | 'feed' | 'circle' | 'tray' | 'dropoff' | 'wholeThing' | 'floor' | 'cutDropoff' | 'cutFloor' | 'drive' | 'pour' | 'rack';
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
  /**
   * Stage 2, 2.1 (RULING2.md 14.1): the RUN he is on, from rung `group.fromRung`, whoever is looking: the
   * kind of trip (with its place and destination) and the run's start t0. At every later departure he takes
   * the next trip of this kind if it ends by t0 + the limit; else the first yard's order chooses again and
   * a new run starts. Kept through a planned run (`run`), its opening and a save; absent below fromRung and
   * in a stage-1 save (he chooses by the first yard's order).
   */
  course?: RunCourse;
}

/** The kind of a run's trips (2.1, 14.1): what is carried, from where, to where. */
export type RunKind =
  | { k: 'feed'; pile: string; dest: MachineId }
  | { k: 'pile'; pile: string }
  | { k: 'tray'; id: MachineId }
  | { k: 'loose'; where: 'dropoff' | 'floor' }
  | { k: 'floorWhole'; dest: MachineId | 'scale' }
  | { k: 'whole'; where: 'dropoff' | 'floor' }
  /** A cutter's run: things at one place, in his score order. */
  | { k: 'cut'; where: 'dropoff' | 'floor' };

/** A crew member's run (14.1 d): its kind, the job his legs show, and its start. */
export interface RunCourse {
  t0: number;
  job: CrewJob;
  kind: RunKind;
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
  trip: {
    partner: PartnerId;
    slot: number;
    phase: TripPhase;
    t0: number;
    endsAt: number;
    plan?: TripPlan;
    /** owner1 V3: the trip's speeds fixed at its departure, m/s: `vy` inside the fence (at most truck.yardV), `vl` on the lane (raised so the trip's total is what it was). Absent: the first yard's one speed. */
    speeds?: { vy: number; vl: number };
  } | null;
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
  | 'day' // 00:00 UTC: the board's step, the deal's delivery, the rivals' day (ref: '')
  // v3 (2.18, B9; s2a-fix: one union): stage 2's kinds. Within ONE instant they come after 'machine' and before
  // 'round', in this order (STAGE2_QUEUE_ORDER, tick.ts QUEUE_ORDER): it decides tick = jump.
  | 'plate' // a works plate's piece, segment, car or tray event (ref: plate id)
  | 'hall' // a hall's heat, pour or cooling ends; its idle start; its self-pour (ref: plate id)
  | 'commission' // a plate arrives or commissions by itself (ref: plate id)
  | 'crane' // the magnet crane's move (or its planned run) ends (ref: plate id)
  | 'lot' // a delivered lot arrives (`lots.nextAt`; ref: '')
  | 'visitor' // a member of the public buys at the Yard sale (`reuse.nextAt`, only while the rack holds a thing; ref: '')
  | 'van'; // the reclamation dealer's van collects (`reuse.vanAt`; ref: '')

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
  /** Layout version 3 (stage 2, 2.20): save.ts loads layouts 2 and 3 (a layout-2 save gets the stage-2 fields fresh, ./state2.ts); any other layout starts afresh. */
  v: 3;
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
  act: { kind: ActKind; target: string | null; since: number; endsAt: number | null };
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
   * v3 keys (2.18; whole numbers, as every count, since save.ts floors them): `bathSet` (1 once the first
   * bath stands at rung 3, 2.20: the works layer and the bath are derived from rung ≥ 3 with it absent),
   * `goalsAt` (2.1.10), `holdSold:<grade>` (2.2), `racked`, `rackSold`, `lotOpened`, `crateSorted`,
   * `commissioned:<plate>`, `poured:<plate>` (the done grammar's `poured:rotary`), `analysed:<grade>`,
   * `quote#` (the last pending quote's number, ./state2.ts `quoteId`).
   */
  counts?: Record<string, number>;
  /**
   * s2a-fix (the lead's ruling 4 of 26 Nov 09:50): a save of a NEWER layout (an over-the-air rollback of the
   * app) is loaded as layout 3, and the raw save it came from is kept here untouched (one copy: a nested one
   * is not kept), so that the newer build can take it back. Absent on every other save; no rule reads it.
   */
  newerSave?: { v: number; raw: unknown };

  // ---------------------------------------------------------------- v3: stage 2 (2.18). Made fresh by ./state2.ts.
  /** Every works plate bought (absent until bought), by plate id. The first yard's `machines` stay as they are; both are read through `station(s, id)` (2.5.3). */
  works: Record<PlateId, WorksState>;
  /** Where a shared input goes (2.7.1): a station id or 'bay'. A grade absent here follows I's own allocation (the owned plate with the best margin a kilogram that has capacity, else 'bay'). */
  routes: Record<GradeId, StationId | 'bay'>;
  /** Delivered lots (2.10.1): the next arrival (null until `backFieldOpen`, and while four wait) and how many have come. */
  lots: LotsState;
  /** The Yard sale and the van (2.12). */
  reuse: ReuseState;
  /** Plant finance (2.14.1): the one agreement, the letter, the history. */
  bank: BankState;
  /** The mode's part of real money (2.15; RULING2 section 15): looks chosen, the ledger, the pending quotes, the code, the age band, the second session. Owned products are the SHARED entitlements, never here (B5). */
  iap: IapState;
  /** Rewarded ads (2.16): the day's counts and the deferred away bonus. */
  ads: AdsState;
  /** The forklift (2.9) once it is here: its parked place, heading, who is in it, its load. Null while not owned or on its way. */
  forklift: ForkliftState | null;
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
  // v3: `plate` names a hall's heat (2.19); absent = the first yard's crucible.
  | { type: 'heatStart'; recipe: RecipeId; g: number; plate?: PlateId }
  | { type: 'readyToPour'; plate?: PlateId }
  | { type: 'pour'; ingots: number; grade: GradeId; short_g: number; dross_g: number; first: boolean; by: 'boss' | string; plate?: PlateId }
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
  | { type: 'recipe'; recipe: RecipeId; heelPoured: boolean; plate?: PlateId }
  // ---- v3 (2.19; s2a-fix: one union, the parallel SalvageEventV3 merged). The away pass emits only awayReport,
  // passed, rung and repaid (and no item events).
  /** Rung 3's works layer opens (derived from rung ≥ 3 with `counts.bathSet` absent: also a migrated save's first tick, B14). */
  | { type: 'backFieldOpen' }
  | { type: 'plateArrived'; plate: PlateId }
  /** Started up ("Commissioned · {plate}" on the chip): by the boss standing at it, or by itself at its date. */
  | { type: 'commissioned'; plate: PlateId; by: 'boss' | 'self' }
  | { type: 'plateState'; plate: PlateId; status: MachineStatus }
  | { type: 'plateOut'; plate: PlateId; grade: GradeId; g: number }
  /** A weigh-in line graded by the analyser: `from` the piece's own grade, `grade` its assay grade. */
  | { type: 'analysed'; grade: GradeId; from: GradeId }
  /** A car drained at the depollution bay (the chip "Certificate of destruction issued"). */
  | { type: 'depolluted'; thing: string; plate: PlateId }
  | { type: 'routeSet'; grade: GradeId; to: StationId | 'bay' }
  | { type: 'lotArrived'; thing: string; k: number; sender: PartnerId | null }
  | { type: 'lotOpened'; thing: string }
  | { type: 'crateIn'; thing: string }
  /** One thing sorted at the picking table, paid as a lot payment (its ticket line). */
  | { type: 'crateSorted'; thing: string; paid: number }
  /** The picking table is empty (section 7 plays then). */
  | { type: 'crateCleared' }
  | { type: 'racked'; thing: string; slot: number; by: 'boss' | string }
  | { type: 'rackSold'; thing: string; q: number; ticket: Ticket }
  /** A member of the public's walk (wicket, card reader, wicket; the path is the frame's). */
  | { type: 'visitor'; t0: number; t1: number }
  | { type: 'vanDated'; at: number }
  | { type: 'vanCollected'; ticket: Ticket }
  /** The lender's letter is due (once): the screen opens the `letter` card. */
  | { type: 'letter' }
  | { type: 'financed'; plate: PlateId; F: number; T: number }
  | { type: 'bankTaken'; y: number; taken: number; T: number }
  | { type: 'repaid'; plate: PlateId }
  /** A pack granted (RULING2 15.5): S credited through `credit(…, 'grant')`. */
  | { type: 'granted'; product: string; S: number; txId: string }
  /** The pack's S moved between read and press (a purchase landed): the row says "Updated: §a → §b". */
  | { type: 'quoteUpdated'; product: string; a: number; b: number }
  /** A quote withdrawn by its own outcome or by the 72 h rule (RULING2 15.4, 15.11 f, 15.12): `why` 'expired' puts one line on the shop card until it is closed. */
  | { type: 'quoteWithdrawn'; product: string; atMs: number; why: 'cancelled' | 'refused' | 'expired' }
  /** The age question is due (the first time a pack row would show). */
  | { type: 'ageAsked' }
  | { type: 'adOffered'; kind: AdKind; amount: number }
  | { type: 'adPaid'; kind: AdKind; amount: number }
  /** The boss entered (on) or stepped out of (off) the forklift. */
  | { type: 'forklift'; on: boolean };

export type SalvageEventType = SalvageEvent['type'];

// ================================================================================================ actions

/** What a level is bought for: a crew member (by id), a machine, or a partner's supply (another skip in rotation, E13b). */
/** v3 (s2a-fix: one union): also a works plate (2.6.4) and the Yard sale's room (2.12). */
export type LevelTarget = { kind: 'crew'; id: string } | { kind: 'machine'; machine: MachineId } | { kind: 'partner'; partner: PartnerId } | { kind: 'plate'; plate: PlateId } | { kind: 'reuse' };

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
  /** v3: `plate` with card 'works' (2.14.5, B11): reading a financeable works card under the letter's condition sets `bank.letterSeen` and emits `letter`. */
  noteSeen(cfg: SalvageConfig, g: SalvageGame, seen: { place?: PlaceId; card?: CardKind; plate?: PlateId }, clock: number, events?: SalvageEvent[]): SalvageGame;
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
  | { text: TextKey }; // another line (a tool's name in a refusal, an item in a goal); v3: a plate's name is { text: 'title.works.<id>' }
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
  note?: { kind: 'fromCar'; ref: string } | { kind: 'certifiedEmpty' } | { kind: 'analysed' } | { kind: 'drained' };
}
// v3 notes (2.19): `analysed` "Analysed" (a grade from the analyser's assay, 2.5.2); `drained` "Depolluted" (a car's shell, T13).

/** v3 (2.14.4): the bank's line of a lot ticket, set by `bank.ts payLot` BEFORE it prints: y to the bank; to you = paid − y. */
export interface TicketBank {
  y: number;
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
  | (TicketBase & { kind: 'skipWeighIn'; partner: PartnerId; trial: boolean; /** owner1-fix (finding 10): a trial load that cost nothing; the ticket prints ticket.freeTrial instead of ticket.boughtFor. Absent = false. */ free?: boolean; gross_g: number; tare_g: number; net_g: number; paid: number; things: { obj: ObjectId; n: number }[] })
  /**
   * The merchant's collection: lines with amounts, "Paid §x", the buyer named. `withBoss` false: none of
   * the lot was weighed in by the boss, and the screen shows the one-line chip at the cab ("Lot sold ·
   * §x", 4.4 item 4) instead of the ticket. `firstGrades`: grades sold for the first time on it.
   */
  | (TicketBase & { kind: 'collection'; buyer: NameId; lines: TicketLine[]; paid: number; withBoss: boolean; firstGrades: GradeId[]; bank?: TicketBank })
  /** A supply-deal delivery: "{foundry} · {kg} cast iron · §{x}". */
  | (TicketBase & { kind: 'dealDelivery'; buyer: NameId; grade: GradeId; g: number; paid: number; bank?: TicketBank })
  // ---- v3 (2.19; s2a-fix: one union): the stage's new lot tickets. `paid` is GROSS; `bank` is present while an agreement took its share.
  /** A sale at the gate: "Sold at the gate · {thing} · §q" (q = roundMoney(reuse.factor × v), v its prepared scrap value at that step). */
  | (TicketBase & { kind: 'rackSale'; thing: ObjectId; uid: string; v: number; paid: number; lines: TicketLine[]; bank?: TicketBank })
  /** The reclamation dealer's collection: by thing and kilogram; paid = Σ batchFactor × each batch's prepared value. */
  | (TicketBase & { kind: 'vanCollection'; buyer: NameId; things: { obj: ObjectId; n: number; g: number }[]; lines: TicketLine[]; paid: number; bank?: TicketBank })
  /** One sorting at the picking table ("Sorted by hand · {n} things"): a line a thing; `open` while the boss still sorts (it closes when he walks off or the table is empty). */
  | (TicketBase & { kind: 'crateLot'; n: number; lines: TicketLine[]; paid: number; open: boolean; bank?: TicketBank });

export type TicketKind = Ticket['kind'];

// ================================================================================================ cards

/** A button on a card: what it does (the action and its arguments, prices as SHOWN), its label, and a refusal if it cannot. */
export type CardAction =
  | { act: 'buy'; item: ShopKey; price: number }
  | { act: 'hire'; role: CrewRole; price: number }
  | { act: 'level'; target: LevelTarget; price: number }
  | { act: 'setHold'; grade: GradeId; on: boolean }
  | { act: 'sell'; grade: GradeId; shown: SellShown }
  /** v3: `plate` names a hall (setPlateRecipe); absent = the first yard's crucible. */
  | { act: 'setRecipe'; recipe: RecipeId; confirmHeel: boolean; plate?: PlateId }
  /** v3: `plate` names a hall; absent = the crucible. */
  | { act: 'setFromBays'; on: boolean; plate?: PlateId }
  | { act: 'signDeal'; terms: DealTerms }
  | { act: 'declineDeal' }
  | { act: 'skipGoal'; id: string }
  | { act: 'ackAway' }
  | { act: 'open'; card: CardRef }
  // ---- v3 (2.19, 4.3 to 4.9; s2a-fix: one union, the parallel CardActionV3 merged; a plate's or the Yard sale's level is `level`)
  /** Sign the finance card: the terms AS SHOWN (refused with bankTerms when they differ now). */
  | { act: 'signFinance'; plate: PlateId; shown: FinanceShown }
  | { act: 'setRoute'; grade: GradeId; to: StationId | 'bay' }
  /** A scrip pack's Buy: the screen hands it to the shared store's `buyQuoted` with the mode's quotePack/settleQuote (RULING2 15). */
  | { act: 'buyPack'; product: string; S: number }
  /** A look or No ad videos: the shared store's plain `purchase(product)`. */
  | { act: 'buyProduct'; product: string }
  | { act: 'restorePurchases' }
  | { act: 'chooseLook'; slot: LookSlot; id: string | null }
  /** A rewarded ad's button (or, with No ad videos owned, "Take +§x"): `amount` as shown; `grade` the held bay of a spot buyer. */
  | { act: 'watchAd'; kind: AdKind; amount: number; grade?: GradeId; /** rules-money wave 2: the spot buyer's Sell as shown (adPaid makes that Sell and pays the bonus apart, one action). */ sell?: SellShown }
  /** The Settings switch "Scrip packs: shown / hidden": opens the code pad (`packCode`). */
  | { act: 'setPacksHidden'; on: boolean };

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
  /** owner1 H6: a crew member's row while he waits with nothing to do: why (card.crewWhy.*, the bubble's words). */
  why?: Txt;
}

/**
 * Which card to open. `place` routes through content (`map.places.<id>.card`: the place's card kind);
 * every other ref names its card directly. The stripper pad opens BOTH its machines' cards in one
 * (CardData.machines); `machine` opens one.
 */
export type CardRef =
  | { kind: 'place'; place: PlaceId }
  | { kind: 'machine'; machine: MachineId }
  /** v3: the Agreements tab; the process board's page (4.4: the page of the newest purchase when absent). */
  | { kind: 'office'; tab: 'rota' | 'partners' | 'processBoard' | 'agreements'; page?: ProcessPage }
  | { kind: 'bay'; grade: GradeId }
  /** v3: the price board's family tab (4.11; absent: the bay's tab, else the tab last used). */
  | { kind: 'board'; focus?: GradeId; tab?: BoardTab }
  | { kind: 'skip'; partner: PartnerId; slot?: number }
  | { kind: 'deal' }
  | { kind: 'table' }
  | { kind: 'processBoard' }
  | { kind: 'away' }
  | { kind: 'rung'; n: number }
  | { kind: 'clipboard' }
  | { kind: 'settings' }
  | { kind: 'help' }
  // ---- v3 (4.2; s2a-fix: one union, the parallel CardRefV3 merged)
  | { kind: 'works'; plate: PlateId }
  | { kind: 'finance'; plate: PlateId }
  | { kind: 'letter' }
  | { kind: 'yardSale' }
  /** An oversize piece on the pad's square k. */
  | { kind: 'lot'; k: number }
  | { kind: 'crate' }
  | { kind: 'shop' }
  | { kind: 'packSheet'; product: string }
  | { kind: 'ageQuestion' }
  | { kind: 'packCode'; mode: 'set' | 'confirm' | 'enter' }
  | { kind: 'awayBonus' };

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
  /** Help (kind 'help'; s2a-fix, the lead's ruling 7): the glossary's terms the yard's rung shows (content text.glossary, `fromRung` at most the rung), in order. */
  glossary?: { term: string; line: string }[];
  /** Tabs of the office panel (Rota, Partners, Process board, v3 Agreements), with the open one (refs are `{kind:'office', tab}`; v3 the process board's pages). */
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
  // ---- v3 (4.2 to 4.11). Each card kind's own data; the screen draws from it and formats numbers only.
  works?: WorksCard;
  finance?: FinanceTerms;
  /** The office's Agreements tab: open rows first, then the history. */
  agreements?: AgreementRow[];
  yardSale?: YardSaleCard;
  lot?: LotCard;
  crate?: CrateCard;
  shop?: ShopCard;
  packSheet?: PackSheetCard;
  ageQuestion?: AgeQuestionCard;
  packCode?: PackCodeCard;
  bonus?: BonusCard;
  /**
   * 4.1.3 (D77, L4): this card SHOWS A DEBT (the finance card, a works card's bankLeft row, the Agreements
   * page, an away card with a bank line): no shop entry and no ad button on it, and the bottom bar's ad
   * button hides while it is up. Absent = false; Phase B (cards.ts) sets it on every card and makes it required.
   */
  showsDebt?: boolean;
  /** Set ONLY by ./samples2.ts: hand-written sample data for drawing a screen before its rules exist. Never set by cardOf. */
  sample?: true;
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
  /** RULING2.md 16.6 (engine2-dispatch): the yard hands are clearing the tipping floor before this machine's feed and tray (crew.ts waitsForFloor). Absent = false. */
  floorFirst?: boolean;
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
  /** v3 (2.16, 4.9): the spot buyer beside Sell on a held bay ("Video · +§x", or "Bonus · +§x" with No ad videos); null when not offered (before the second session, the day's count used, a debt on screen). */
  spot?: CardButton | null;
  /** v3 (2.8.1): grams of this bay reserved for stations (Sell refuses them: `routed`). */
  reservedFor?: { station: StationId; g: number }[];
}

export interface PriceBoard {
  day: number;
  /** Seconds to the next step (the head's "next prices in {h} h {m} m"). */
  nextInS: number;
  rows: BoardRow[];
  /** The first opening's hint ("Cast iron: a low day. Holding is free."): set while `seen.cards` lacks 'board'. */
  hint: Txt | null;
  /** v3 (4.11): the open family tab and every tab (a tab with no stock still shows: "Nothing in stock"). `rows` are the open tab's. */
  tab?: BoardTab;
  tabs?: { tab: BoardTab; open: boolean; rows: number }[];
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
  /** owner1-fix (finding 10): a trial load that costs nothing; the label prints card.skipFree ("Free trial load") instead of its price. Absent = false. */
  free?: boolean;
  /** RULING2.md 16.6 (engine2-dispatch): the hired driver keeps the floor's room for a better load and leaves this ready skip standing (truck.ts keptForBetter). Absent = false. */
  kept?: boolean;
}

// ================================================================================================ process board

/** v3 (4.2, B19; s2a-fix: one union): `arriving` (on the machine flatbed) and `installed` (here, not yet started up) for works plates. */
export type PlateState = 'lit' | 'owned' | 'buyable' | 'locked' | 'greyed' | 'arriving' | 'installed';

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
  /** v3: a financed plate's ring, taken ÷ T (0 to 1); it prints no amount and is not a debt display (P7). */
  ring?: number;
  /** v3: the sub-plate riveted to a hall's plate (its filter: bought with the hall, never alone). */
  sub?: Txt | null;
}

/** v3 (4.4): the process board's pages. */
export type ProcessPage = 'first' | 'yard' | 'melt';

/** The process board (4.5): rows of enamel plates joined by bars. */
export interface ProcessBoardRows {
  /** v3: the row ids `yard`, `shredder`, `lead` (the first yard's `melt` gains the halls). */
  rows: { id: 'cable' | 'motors' | 'melt' | 'greyed' | 'yard' | 'shredder' | 'lead'; plates: Plate[] }[];
  /** Riveted bars between plates, by plate id. */
  bars: [string, string][];
  /** v3 (4.4): the page shown (`rows` are its rows) and the pages in tab order. Absent: the first yard's one page. */
  page?: ProcessPage;
  pages?: ProcessPage[];
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
  // ---- v3 (2.2, 2.14.4, 2.17). Optional: away.ts (engine2's) writes them.
  /** The held bays a lot was set aside from to keep the yard going, in order, one line each ("Sold from hold to keep the yard going: {grade|short}"; key `away.heldSold`). It replaces away.ts's local `HeldCard`. */
  heldSold?: GradeId[];
  /** § the bank took while away ("To [bank]: §y"). `money` stays GROSS of it; the away bonus's base is money − bank. */
  bank?: number;
  /** Agreements repaid in full while away ("Repaid in full: {plate}"). */
  repaid?: PlateId[];
  /** Sales at the gate and by the van while away. */
  rack?: { n: number; money: number };
  van?: { n: number; money: number };
  /** Oversize pieces waiting at the card's end ("{n} oversize pieces wait for you"). */
  lotsWaiting?: number;
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
  /**
   * owner1 T2: the step of a load the boss fetches himself (goals.ts loadStep): "Get in the truck", "Drive out to the load",
   * "Keep still: hooking", "Drive onto the weighbridge", "Tip it on the floor"; the chevron (frame.chevron) points at
   * the same step. Absent: no load step (the goal's own line).
   */
  step?: Txt;
}

/** The advice line (2.10): the cheapest purchase that widens the bottleneck now (a buy, a hire or a level). */
export interface Advice {
  /** The action, with the price as the card would show it. */
  action: Extract<CardAction, { act: 'buy' | 'hire' | 'level' }>;
  /** The card that sells it. */
  open: CardRef;
  price: number;
  line: Txt;
  /** v3 (2.13): the bank's one sentence "A loan suits a machine that earns." follows the line (the purchase is a financeable plate the finance card would offer, the letter seen, no agreement open). */
  loanHint?: boolean;
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
  // ---- v3 (stage 2; frame.ts writes them in Phase B, the world draws them in Phase C). Absent below rung 3.
  /** The works plates on their plots (one per plot of `map.works`, bought or not, from rung 3). */
  works?: FrameWorks[];
  /** The forklift when owned and here. */
  forklift?: FrameForklift | null;
  /** Members of the public on their dated walk (wicket, card reader, wicket; the path is the frame's, inside the public bay). */
  visitors?: Span[];
  /** The reclamation dealer's van while it comes, loads and goes, else null. */
  van?: { phase: 'in' | 'load' | 'out'; span: Span } | null;
  /** The picking table's plate ("Picking table · {n} things"), from rung 3. */
  crate?: { x: number; y: number; n: number } | null;
  /** The magnet crane's move under way: from, to, its span (a planned run shows the move under way, as crew legs do). */
  crane?: { from: { x: number; y: number }; to: { x: number; y: number }; span: Span; g: number } | null;
  /**
   * owner1 L2: a stamp of everything but the boss's own position: it stays the same from a state to the next when a
   * presence sample changed nothing else (the boss is the screen's own), so the world need not push a new scene.
   */
  scene?: number;
  /** rules-money wave 2 (2.15.1): the look chosen per slot (`iap.looks`: a product id, `rung<n>`, `foundry`, or null for the yard's own); only the frame reads it. */
  looks?: Record<LookSlot, string | null>;
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
  /**
   * owner1 T4: a refusal that holds while he stands (the act `refused.<why>`: a skip he cannot hook, a load not weighed
   * at the floor): its line with its figure ("Needs §x more for this load", "Tipping floor needs {kg} free"), shown on
   * the skip's plate and by the one button for as long as it holds. Null: none.
   */
  refusal?: Txt | null;
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
  /**
   * v3 (4.6): a tagged thing's plate, at the present step: "Reusable" (· "Checked" for a bicycle) / "§{q} at the
   * gate · §{v} as scrap" / a third line by `who`: boss (none), hands ("Yard hands will set it out"), full
   * ("Yard sale full · cut as scrap"), heavy ("Too heavy to lift: {kg}"). Absent: not tagged (or below rung 3).
   */
  tag?: { q: number; v: number; who: 'boss' | 'hands' | 'full' | 'heavy'; checked: boolean; g: number };
  /** v3 (4.7): an oversize piece's plate: "{partner|short} · {thing}" / "{kg} kg · about §{x} once cut". */
  lot?: { sender: PartnerId | null; g: number; value: number };
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
  /** The bay's look from content `grades.<id>.bay`: a lock-block heap, a stillage, the converter cage; v3: a works bunker, the closed battery box, big bags (content BAY_KINDS). */
  kind: (typeof BAY_KINDS)[number];
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
  /**
   * owner1 H6: why a yard hand or cutter with nothing to do waits (crew.ts idleWhyOf), while he waits or walks to his
   * waiting place (job 'idle'): 'nothing', 'uncut' (only things that need cutting), 'yours' (only what lies at the
   * boss's feet or is left for him), 'tool' (a cutter: the next thing needs a tool the yard has not). `idleText` is
   * its line (card.crewWhy.*), drawn as a small bubble over him. Absent: not idle (or a content without the review's rules).
   */
  idleWhy?: 'nothing' | 'uncut' | 'yours' | 'tool';
  idleText?: Txt;
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
  /**
   * The driver's trip as a leg: phase, partner, span, ends and the path from positions.ts. owner1 V1: `path` is THIS
   * PHASE'S OWN path (positions.ts tripPhasePath: out park → line → gate → lane → skip; hook standing at the skip; back
   * skip → lane → gate → line → weighbridge; weigh standing on it; tip weighbridge → the floor's stop; park the floor's
   * stop → park), and `at` the yard second the truck passes each of its points (inside the fence at most truck.yardV,
   * the lane faster): the world moves the truck piecewise along it between at[i] and at[i+1] and stands it at the last
   * point until t1 (a phase that starts with a standing part, the driver's walk to a parked truck, has at[0] > t0).
   */
  leg: { phase: TripPhase; partner: PartnerId; t0: number; t1: number; from: { x: number; y: number }; to: { x: number; y: number }; path: { x: number; y: number }[]; at?: number[] } | null;
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
  /** owner1 V3, V4: the yard second it passes each point of `path` (along the drive line at most truck.yardV inside the fence). */
  at?: number[];
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
  /**
   * owner1 V4: the arrival's road: from beyond the gate along the drive line to the line's stop nearest its place
   * (`stop`), where it sets down (the thing is at its place at span.t1, as the rules date it); `at` the yard second it
   * passes each point (inside the fence at most truck.yardV). No path crosses a solid; no jump at set-down.
   */
  path?: { x: number; y: number }[];
  at?: number[];
  stop?: { x: number; y: number };
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

// ================================================================================================ STAGE 2 (contract version 3)
//
// docs/design/yard-stage2.md 2.18 (the state), 2.19 (events, tickets, refusals, actions), 4.2 to 4.11 (card
// data); RULING2.md section 14 (the engine step as built: the run kept on a crew member as `course`, the
// planned run `run`, `counts.goalsAt`) and section 15 (paid packs: the pending quote's shape). Every number a
// card shows is computed from the state at each read (B11); frozen are only the stored values: a pending
// quote's S and I, a lot's mass, an agreement's terms and I, the away bonus's offer.

/** A works plate's id: a key of content `works.plates` (baler, shear, analyser, granulator, depollution, crane, shredder, eddy, sorter, rotary, induction, breaker, smelter). */
export type PlateId = string;
/**
 * B7: crew and machine code address the first yard's machines and the plates through ONE id and ONE
 * accessor, `station(s, id): MachineState` (machines.ts, rules-works) over `machines` and `works`.
 */
export type StationId = MachineId | PlateId;

/** The boss's act kinds. v3 (2.18): commission (standing 5 s at a plate), rack (setting a tagged thing on the Yard sale), lot (cutting an oversize piece), crate (sorting the picking table one thing every `crate.sort_s`). */
export type ActKind = 'none' | 'work' | 'pickup' | 'weigh' | 'feed' | 'strip' | 'circle' | 'hook' | 'tip' | 'drive' | 'commission' | 'rack' | 'lot' | 'crate';

/**
 * B9: the queue's stage-2 kinds in their order within one instant: after 'machine', before 'round'
 * (the first yard's order of the other kinds is tick.ts's and does not change).
 */
export const STAGE2_QUEUE_ORDER = ['plate', 'hall', 'commission', 'crane', 'lot', 'visitor', 'van'] as const satisfies readonly QueuedKind[];

// ------------------------------------------------------------------------------------------------ works

/** 2.6.3: on the machine flatbed (purchase + deliver_s), here and doing nothing (`installed`), started up (`running`). */
export type PlatePhase = 'arriving' | 'installed' | 'running';

/**
 * A hall's heat (2.8): the crucible's heat fields (CrucibleState), kept in a sub-object because a plate's
 * own `phase` is its life (arriving, installed, running) while a heat has its own phase (empty .. cooling).
 * A hall's first heat waits at `ready` for the boss and pours by itself `works.selfCommission_s` after
 * `phaseSince` (S11, decision 22). Reagents are paid at a heat's start, never by the clock.
 */
export interface HeatState {
  recipe: RecipeId;
  fromBays: boolean;
  charge_g: number;
  chargeBy?: Record<GradeId, number>;
  heel_g: number;
  phase: HeatPhase;
  phaseSince: number;
  endsAt: number | null;
  lastFeedAt: number;
  firstPoured: boolean;
  cooling: CrucibleState['cooling'];
}

/**
 * The magnet crane's move (2.7): one dated move of at most `crane.load_kg` from a pile (or the apron) to
 * a station's hopper; its moves are a RUN whoever looks (2.1.4): `course` keeps its kind and t0; out of
 * sight with `group.ahead` the rest is `planned` with one dated end (`end` is then the run's).
 */
export interface CraneMove {
  /** Piece and thing uids moved (claimed: nobody else takes them). */
  items: string[];
  g: number;
  /** A pile key (`floor`), or 'apron' (a drained shell). */
  from: PileKey | 'apron';
  /** A station id, or 'bay' (a drained shell to its bay). */
  to: StationId | 'bay';
  t0: number;
  end: number;
  /** Out of sight: the run's later moves, in order, each with its own end (as a yard hand's RunLoad). */
  planned?: { items: string[]; g: number; end: number }[];
}

/**
 * A works plate (2.18): MachineState (hopper, work, tray, status; `since` = the yard second it was set
 * down) plus its life and the parts of its kind. Kept in `SalvageState.works` by plate id from its purchase.
 */
export interface WorksState extends MachineState {
  plate: PlateId;
  phase: PlatePhase;
  /** Installed: the yard second it starts up by itself (arrival + `works.selfCommission_s`); null otherwise. */
  commissionAt: number | null;
  /** Who started it up, once running. */
  commissionedBy?: 'boss' | 'self';
  /** Batch plates (halls): the heat. */
  heat?: HeatState;
  /** Bay-fed plates (feedBy 'bays', 2.8.1): the current segment's start and the grams drawn in it by input grade (the cumulative rule's base). */
  segStart?: number;
  drawn_g?: Stock;
  /** Station plates (the depollution bay): the car on its apron and its drain's span, or null. */
  car?: { thing: string; t0: number; end: number } | null;
  /** The magnet crane: the move under way, or null; its run (kind, place, destination, start). */
  move?: CraneMove | null;
  course?: { t0: number; from: PileKey | 'apron'; to: StationId | 'bay' };
}

// ------------------------------------------------------------------------------------------------ lots, reuse, bank

/** 2.10.1: the next lot's date in yard seconds (first set at `backFieldOpen`, never at creation or migration; null while four wait) and the lots so far (the hash counter). */
export interface LotsState {
  nextAt: number | null;
  n: number;
}

/** 2.12: the Yard sale's next visitor (null until the first thing is ever racked; the queue reads it only while the rack holds a thing), the van's date (null while none is dated), the rack's level, and today's sales. */
export interface ReuseState {
  nextAt: number | null;
  vanAt: number | null;
  level: number;
  /** Sales at the gate on market day `day` ("Sold today: {n} · §{x}"). */
  sold: { day: number; n: number; money: number };
}

/** 2.14.1: one agreement (§ in hundredths; `taken` rises from 0 to T). `kind` is stage 3's hook 2 (Agreements is a page of kinds). */
export interface Agreement {
  kind: 'bank';
  plate: PlateId;
  /** Price, financed part, charge, total to repay. Deposit = P − F. */
  P: number;
  F: number;
  c: number;
  T: number;
  taken: number;
  signedAt: number;
  /** I read at signing (frozen; B11). */
  I: number;
}

export interface BankState {
  /** The one open agreement (`bank.maxAgreements` 1 in stage 2), or null. `bank.ts payLot` splits over a LIST oldest first; stage 2 passes this one. */
  agreement: Agreement | null;
  /** Set once the lender's letter is due (2.14.5): from then on a financeable works card may carry "Bank loan". */
  letterSeen: boolean;
  /** Repaid agreements, oldest first (the Agreements page's history). */
  done: { plate: PlateId; T: number; signedAt: number; repaidAt: number }[];
}

// ------------------------------------------------------------------------------------------------ iap, ads, forklift

/** 2.15.1: the look slots the frame draws (no rule reads them). */
export type LookSlot = (typeof LOOK_SLOTS)[number];
/** 2.15.3: the age band the age question keeps (never the year). */
export type AgeBand = 'u13' | 't13' | 'a18';

/**
 * A pending scrip-pack quote (RULING2 15.3 to 15.6; it replaces 2.15.4's `{product, S, I, atMs}`): made
 * at Buy, BEFORE the store's sheet opens and the save is flushed. `id` is unique in the save
 * (`q<n>`, ./state2.ts `quoteId`); `known` the product's transaction ids the store listed just before the
 * quote (a quote is never granted with an id in `known` or in the ledger); `state` open from Buy until the
 * sheet's outcome, waiting when the store answered pending or with an error that does not prove nothing
 * was charged. As ruled in 15.12 (the lead, 26 Nov 08:05; it replaces 15.6 where they differ): a new Buy
 * does NOT withdraw an older open quote (it stands, does not block Buy, counts in headroom); at most
 * `iap.maxStanding` quotes of one product stand at once (a further Buy: `packPending`); a WAITING one
 * refuses a new Buy for 24 h of the DEVICE's clock from `atMs`, a clock earlier than `atMs` counting as
 * elapsed; any standing quote is withdrawn when a FRESH listing whose request time (the STORE's clock) is
 * at least 72 h after the quote's `askedMs` has been routed and the quote still stands. "Oldest" is the
 * list's order (the order quotes were made in), never `atMs`. No clock decides a grant (15.1).
 */
export interface PendingQuote {
  id: string;
  product: string;
  /** § granted on approval, exactly (frozen at Buy). */
  S: number;
  /** I read at Buy (frozen). */
  I: number;
  /** Device epoch ms of Buy (the shared store names a quote by product and atMs; the 24 h courtesy rule; never compared with a store date). */
  atMs: number;
  /**
   * The STORE's request time (epoch ms) of the listing read at this Buy (the shared store passes it to the quote
   * function): the 72 h rule is measured between it and a later fresh listing's request time, never on the
   * device's clock (15.12 a). null only on a quote saved without one: such a quote is never withdrawn by time.
   */
  askedMs: number | null;
  known: string[];
  state: 'open' | 'waiting';
  /**
   * s2a-fix (RULING2 15.4, 15.11 c): WHY a waiting quote waits, for its row's words: 'pending' (the store
   * answered pending: "Waiting for approval") or 'unconfirmed' (an error that does not prove nothing was
   * charged: "The store has not confirmed this purchase yet. If you were charged, your scrip arrives when it
   * does."). null (or absent, a save made before it) while open; a waiting quote without it reads as pending.
   */
  wait?: 'pending' | 'unconfirmed' | null;
}

/** One granted transaction (never granted twice). `quote` names the pending quote it took. */
export interface LedgerEntry {
  txId: string;
  product: string;
  S: number;
  atMs: number;
  quote?: string;
}

export interface IapState {
  /** The chosen look per slot (a product id, an earned sign style `rung<n>` or `foundry`), null = the yard's own. */
  looks: Record<LookSlot, string | null>;
  ledger: LedgerEntry[];
  pending: PendingQuote[];
  /** Packs hidden in Settings behind a four-digit code (kept hashed), or null. */
  hidden: { codeHash: string } | null;
  ageBand: AgeBand | null;
  /** Device epoch ms the save (or its migration) was made: information only (RULING2 15.1). */
  createdMs: number;
  /** "The second session" (2.15.2, P1): the YARD second the first away card from an absence of at least `ads.awayMinAbsence_min` was closed; null before. Nothing of money or ads exists before it. */
  sessions2At: number | null;
  /** rules-money wave 2 (15.11 f): quotes withdrawn by the 72 hours, for the shop card's one line "A purchase that was waiting never arrived. Nothing was added." until the shop card is closed (noteSeen {card: 'shop'}). Absent = none. */
  expired?: { product: string; atMs: number }[];
}

export type AdKind = 'away' | 'spot';

/** 2.16: counts on market day `day`, and the away bonus deferred to the bottom bar (kept until taken or replaced; it shows no time). */
export interface AdsState {
  day: number;
  awayUsed: number;
  spotUsed: number;
  awayOffer: { amount: number; I: number; /** rules-money wave 2 (P6): true when the away card that made it showed no debt: the centred card opens once after that card; false: straight to the bottom bar's deferred button. Absent = true. */ centred?: boolean } | null;
}

/** 2.9: the forklift (the boss's only): where it stands, its heading, who is in it, its load (whole pieces and whole things as `Piece` with `whole`, as the boss's load). */
export interface ForkliftState {
  x: number;
  y: number;
  heading: Heading;
  by: 'boss' | null;
  load: Piece[];
}

// ------------------------------------------------------------------------------------------------ actions and hooks

/** The finance card's terms as SHOWN (signFinance refuses with `bankTerms` when they differ now). */
export interface FinanceShown {
  P: number;
  F: number;
  charge: number;
  T: number;
}

/** 2.14.4: what `bank.ts payLot(x, gross, t)` returns: y to the bank, z to the player (then `earn(x, z, t)`). */
export interface PayLotResult {
  y: number;
  z: number;
}
/** The closed list of lot payments (2.14.4): each goes through payLot before its ticket prints. */
export type LotPaymentKind = 'collection' | 'deal' | 'crate' | 'rack' | 'van';
/** 2.14.4: ad rewards and granted scrip go through `clock.ts credit(x, amount, t, kind)`: cash and `earned` only, never the income buckets, the away card's money or payLot. */
export type CreditKind = 'ad' | 'grant';

/**
 * The outcome of a pack's sheet as the shared store reports it (src/state/store.ts `QuoteOutcome`, merged in
 * 17a2566): the first four withdraw the quote, 'pending' and 'unconfirmed' make it WAITING (PendingQuote.wait
 * keeps which). Spelled here because the rules never import src/state (a React module); contract.test.ts
 * holds it EQUAL to the shared type at compile time (s2a-fix).
 */
export type QuoteOutcome = 'cancelled' | 'declined' | 'unavailable' | 'unsaved' | 'pending' | 'unconfirmed';
/** A purchase arriving at the mode: THE SHARED TYPE (src/engine/mode.ts, merged in 17a2566; s2a-fix: no mirror). `own` names the quote whose own sheet returned it; null for a later arrival. */
export type ProductArrival = SharedProductArrival;
/** A listing of the store account's transactions handed to `afterListing`: THE SHARED TYPE (src/engine/mode.ts), with the store's own `requestMs` (15.12 a). */
export type ProductListing = SharedProductListing;

/**
 * v3 (2.19; RULING2 15): the new player actions, with the same shape as SalvageActions (pure; refusals
 * pushed to `events` with the SAME state returned). Which check returns which key:
 * - signFinance: `bankOne`, the plate's gate (`rung`, `needsItem`), `notFinanceable`, `bankReserve`, `cash`, `ceiling`, `bankTerms` (retry: the terms now). Then cash −= d, the plate `arriving`, the agreement stored, event `financed`.
 * - setRoute: `notOwned` (station not owned), `noRoute` (it does not take the grade). Event `routeSet`.
 * - setPlateRecipe: as setRecipe (`notOwned`, `heatRunning`, `confirmHeel`); `routed` when the recipe's grade is reserved by another station.
 * - quotePack (the shared store's `quote` function): `packOff`, `packPending` (a WAITING quote of the product younger than 24 h of the device's clock, a clock earlier than its atMs counting as elapsed; or `iap.maxStanding` quotes of the product standing), `packHeadroom`, `quoteUpdated` (shown ≠ now); else appends a PendingQuote {state 'open', wait null, askedMs}. An older quote of the product is NEVER withdrawn by a new Buy: it keeps standing and counts in headroom (RULING2 15.12 b).
 * - settleQuote (the store's `settle`): the named quote ({product, atMs}) withdrawn (cancelled, declined, unavailable, unsaved: event quoteWithdrawn) or made WAITING with `wait` 'pending' or 'unconfirmed'; same object if it no longer stands. Never refused.
 * THE REFUSAL'S REASON (15.12 f) is not kept in the state: the shared store only says refused, and cardOf derives the row's words from the state at each read (packPending and packHeadroom follow from `iap.pending` and the headroom; a `quoteUpdated` refusal's a → b is the event's, which the screen keeps for the row while the card is open).
 * - setPacksHidden: `packCode` (wrong code when showing again). setAgeBand: `badYear`. chooseLook: `notOwned`.
 * - adPaid: `nothing` (no offer of that kind), `adCap`. Paid through `credit(…, 'ad')`.
 * Racking, cutting an oversize piece, sorting the picking table, commissioning and entering the forklift go
 * through `presence` (act kinds); refusals there: `rackFull`, `notReusable`, `forkliftLoad`, `tooHeavy`.
 * Plates, the forklift, the pallet truck, the plasma cutter and the three-axle truck are bought with `buy`.
 */
export interface SalvageActions2 {
  signFinance(cfg: SalvageConfig, g: SalvageGame, plate: PlateId, shown: FinanceShown, clock: number, events?: SalvageEvent[]): SalvageGame;
  setRoute(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, to: StationId | 'bay', clock: number, events?: SalvageEvent[]): SalvageGame;
  setPlateRecipe(cfg: SalvageConfig, g: SalvageGame, plate: PlateId, recipe: RecipeId, confirmHeel: boolean, clock: number, events?: SalvageEvent[]): SalvageGame;
  quotePack(cfg: SalvageConfig, g: SalvageGame, product: string, shownS: number, now: number, known: string[], askedMs: number, clock: number, events?: SalvageEvent[], ctx?: CardContext): SalvageGame;
  settleQuote(cfg: SalvageConfig, g: SalvageGame, outcome: QuoteOutcome, quote: { product: string; atMs: number }): SalvageGame;
  setPacksHidden(cfg: SalvageConfig, g: SalvageGame, on: boolean, code: string, clock: number, events?: SalvageEvent[]): SalvageGame;
  setAgeBand(cfg: SalvageConfig, g: SalvageGame, year: number, now: number, clock: number, events?: SalvageEvent[]): SalvageGame;
  adPaid(cfg: SalvageConfig, g: SalvageGame, kind: AdKind, shownAmount: number, ref: { grade?: GradeId; sell?: SellShown }, clock: number, events?: SalvageEvent[]): SalvageGame;
  chooseLook(cfg: SalvageConfig, g: SalvageGame, slot: LookSlot, id: string | null, clock: number, events?: SalvageEvent[]): SalvageGame;
}

/**
 * The mode's hooks the shared store calls (salvageMode.ts, rules-money; shapes as `store-shared` built them,
 * notes/store-shared.md "After the attack"): pure and idempotent.
 * - grantProduct: ledger has txId → same; `own` → THAT quote unless its `known` has the id; else the OLDEST standing quote of the product whose `known` lacks it; none → same (another save). cash += S through credit(…, 'grant'); ledger += entry; event `granted`.
 * - afterListing: after every listing, once its arrivals have been routed (grantProduct): only for a FRESH listing with a store request time, every quote still standing whose `askedMs` is at least 72 h before the listing's `requestMs` is withdrawn (event quoteWithdrawn, why 'expired'). The STORE's clock, never the device's (RULING2 15.11 b, 15.12 a); a quote with askedMs null is never withdrawn by time.
 * - adAudience: 'child' for u13, 'teen' for t13, else null.
 */
export interface SalvageShopHooks {
  grantProduct(cfg: SalvageConfig, g: SalvageGame, arrival: ProductArrival): SalvageGame;
  afterListing(cfg: SalvageConfig, g: SalvageGame, listing: ProductListing, now: number): SalvageGame;
  adAudience(cfg: SalvageConfig, g: SalvageGame): 'child' | 'teen' | null;
}

// ------------------------------------------------------------------------------------------------ card data (4.3 to 4.11), as DATA

/** 4.11: the price board's family tabs (content `grades.<id>.boardTab`, content BOARD_TABS: one spelling, the content's). */
export type BoardTab = (typeof BOARD_TABS)[number];

/** 4.3: why a running plate's world chip shows (only when not working). */
export type WorksChip = 'hopperFull' | 'trayFull' | 'waiting' | 'readyToPour';

/**
 * 4.3: the works card (one per plate; a hall's filter in its hall's card). Every number is applied as
 * shown; only `saveUp_s` is "about". `foot` follows 2.14.5: `buy` always (greyed with its refusal when
 * short); `loan` only after the letter and while P > cash − reserve (P12), greyed with `loanShort` while
 * cash − reserve < d, greyed with bankOne's words while an agreement is open; `saveUp_s` beside it.
 */
export interface WorksCard {
  plate: PlateId;
  kind: 'rate' | 'batch' | 'station' | 'assay' | 'handling';
  /** locked: gate not met (padlock and the gate, nothing else); buyable; arriving; installed; running. */
  state: 'locked' | 'buyable' | 'arriving' | 'installed' | 'running';
  gate: { rung: number | null; tonnes_g: number | null; needsItem: ShopKey | null } | null;
  /** In → out (grades, or object ids for whole things such as `elv`, `cbody`), and what a kilogram of input gains at p̄ (0.24 = "+24 % on light iron"); never tonnes an hour. */
  in: (GradeId | ObjectId)[];
  out: GradeId[];
  gain: { from: GradeId | ObjectId; pct: number } | null;
  /** Running and not working: why (with the grade it waits for); null when working or not running. */
  chip: { kind: WorksChip; grade?: GradeId } | null;
  arrivesAt: number | null;
  /** Installed: "Stand here to start · {s} s" and "Starts by itself in {t}". */
  commission_s: number;
  selfStartAt: number | null;
  level: { level: number; max: number; pct: number; button: CardButton | null; state: RowState } | null;
  /** Halls: their recipes ("Brass", "Bronze"), the one in use, and a button each. */
  recipes?: { recipe: RecipeId; in: GradeId[]; out: GradeId[]; selected: boolean; button: CardButton | null }[];
  /** Bay-fed plates: "Takes from: Light iron · Car body", each with its route now. */
  takesFrom?: { grade: GradeId; route: StationId | 'bay' }[];
  /** The depollution bay: its car on the apron ("End-of-life car · ref. {ref}") and the drain's end. */
  car?: { thing: string; ref: string; endsAt: number } | null;
  /** The rota's licence row this plate brings when started up (T21). */
  permit?: 'elv' | 'lead' | null;
  foot: {
    buy: CardButton | null;
    loan: CardButton | null;
    /** "You pay now §{d} · §{x} more" while cash − reserve < d. */
    loanShort: { d: number; more: number } | null;
    /** "Save up (about {h} h {m} m)": (P − cash) ÷ I, or ÷ (I − bank.share × G) while an agreement is open; null when Buy is pressable or no loan is offered. */
    saveUp_s: number | null;
  };
  /** Financed and open: "Bank loan · §{left} left of §{T}" (opens Agreements; the card showsDebt) and the ring's share. */
  bank: { left: number; T: number; ring: number } | null;
}

/** 4.5: the finance card's five lines and the rule line; `sign` carries the terms as shown. */
export interface FinanceTerms {
  plate: PlateId;
  P: number;
  /** You pay now (d = P − F). */
  deposit: number;
  /** The bank pays (F). */
  F: number;
  charge: number;
  /** You repay (T = F + charge). */
  T: number;
  /** `bank.share` (0.2: content `bank.shareWords` "A fifth"). */
  share: number;
  /** s2a-fix: the share in words as the card prints it ({ key: 'share.fifth' } "A fifth" while bank.share is 0.2, strings2's rule; else a percentage line). Optional until cards.ts fills it. */
  shareWords?: Txt;
  /** I read now (the terms move only when assets do). */
  I: number;
  sign: CardButton;
  notNow: CardButton;
  /** The first refusal that stands now (bankOne, bankReserve, cash, ceiling, bankTerms, a gate), or null. */
  refusal: Txt | null;
}

/** 4.5: a row of the Agreements page (hook 2: rows carry their kind). */
export interface AgreementRow {
  kind: 'bank';
  lender: NameId;
  plate: PlateId;
  T: number;
  taken: number;
  left: number;
  share: number;
  signedAt: number;
  repaidAt: number | null;
  open: boolean;
}

/** 4.6: the Yard sale's card. */
export interface YardSaleCard {
  slots: number;
  free: number;
  /** Oldest first: "§{q} at the gate". */
  things: { uid: string; obj: ObjectId; q: number; v: number }[];
  /** "Next visitor in {t}" (null: the rack is empty, nobody comes). */
  nextVisitorInS: number | null;
  soldToday: { n: number; money: number };
  /** "More room · {a} → {b} places" with its Level button; null at the top. */
  level: { level: number; max: number; from: number; to: number; button: CardButton | null; state: RowState } | null;
  /** The trade corner: "[reclamation dealer] · {n} batches · van in {t}". */
  corner: { dealer: NameId; batches: number; vanInS: number | null };
}

/** 4.7: an oversize piece ("{partner|short} · {thing}" / "{kg} kg · about §{x} once cut" / "Only you can cut this · {s} s"). */
export interface LotCard {
  uid: string;
  obj: ObjectId;
  sender: PartnerId | null;
  g: number;
  /** About § once cut, at p̄ (the only "about"). */
  valueOnceCut: number;
  cut_s: number;
}

/** 4.7: the picking table ("Picking table · {n} things" / "Stand here · {s} s a thing"). No time, nothing expires. */
export interface CrateCard {
  n: number;
  max: number;
  sort_s: number;
  /** Oldest first. */
  things: { uid: string; obj: ObjectId }[];
}

/** 4.8: a look's row: the store's own price string is the screen's (`iap.priceOrNull`), never the rules'. */
export interface ShopLookRow {
  product: string;
  slot: LookSlot;
  owned: boolean;
  inUse: boolean;
  /** Buy (buyProduct) when not owned; Use (chooseLook) when owned and not in use; null in use. */
  button: CardButton | null;
}

/** 4.8: an earned look (sign styles of rungs reached, the foundry's plate): no price. */
export interface EarnedLookRow {
  id: string;
  slot: LookSlot;
  earned: boolean;
  inUse: boolean;
  /** Not yet earned: "Reach rung {n}". */
  opensAtRung: number | null;
  button: CardButton | null;
}

/**
 * 4.8: a pack's row. offer: "§{S} · about {H} hours of your yard's earnings" with Buy (buyPack); noRoom:
 * "Nothing to spend it on yet", no button; waiting: "Waiting for approval", no button (a quote waiting with
 * `wait` 'pending', or a further Buy refused while `iap.maxStanding` stand); unconfirmed (s2a-fix, 15.11 c):
 * "The store has not confirmed this purchase yet. If you were charged, your scrip arrives when it does.", no
 * button (a quote waiting with `wait` 'unconfirmed'). `updated` when the S shown before moved ("Updated: §a →
 * §b"). The state is derived from `iap.pending` at each read (cardOf), never stored.
 */
export interface PackRow {
  product: string;
  H: number;
  S: number;
  state: 'offer' | 'noRoom' | 'waiting' | 'unconfirmed';
  updated: { a: number; b: number } | null;
  button: CardButton | null;
}

/**
 * 4.8: the shop (from the Rota's row and Settings only; never before `iap.sessions2At`, never for u13, never on
 * a card that shows a debt). `packs` is null unless 2.15.3's four conditions hold: then no header and no word of packs.
 */
export interface ShopCard {
  looks: ShopLookRow[];
  earned: EarnedLookRow[];
  noAds: { product: string; owned: boolean; button: CardButton | null } | null;
  packs: PackRow[] | null;
  /** The store country read at this opening (`storefrontCountry()`, unknown = null = packs off). */
  country: string | null;
  /** rules-money wave 2 (2.15.3, 4.8): the age question is due (the first time a pack row would show and no band is kept): the screen opens `{kind: 'ageQuestion'}` before the shop. */
  askAge?: boolean;
  /** rules-money wave 2 (15.11 f): "A purchase that was waiting never arrived. Nothing was added." until the card is closed. */
  expired?: boolean;
  /** rules-money wave 2 (4.8 section 5): Restore (looks and No ad videos) over "Scrip bought here lives in this device's save." */
  restore?: CardButton | null;
}

/**
 * s2a-fix (the critic's finding 7; for rules-money, cards.ts and the facade): what a card needs that is not in
 * the state. The store country is read by the screen at each opening (src/services/region.ts
 * `storefrontCountry()`, store only; unknown = null = packs off) and handed to `cardOf` (and the Settings and
 * Help cards) as this argument; the rules decide packsOff, the rung, the age band and the hidden code from it
 * and the state (2.15.3), so no screen computes it. Pinned by a u13 test and an unknown-country test (Phase B).
 */
export interface CardContext {
  country: string | null;
}

/** 4.8: the pack sheet before the store's own ("§{S} for this yard" / "Bought scrip lives in this device's save. ..."). */
export interface PackSheetCard {
  product: string;
  S: number;
  H: number;
  buy: CardButton;
  notNow: CardButton;
}

/** 4.8: the age question (four digits, no default): OK only for a year in [minYear, maxYear]. */
export interface AgeQuestionCard {
  minYear: number;
  maxYear: number;
}

/** 4.8: the code pad ("Choose a four-digit code" / "Enter it again" / "Enter the code"); `wrong` after a mismatch. */
export interface PackCodeCard {
  mode: 'set' | 'confirm' | 'enter';
  wrong: boolean;
}

/** 4.9: the away bonus card ("For your time away" / "+§{x}") or a spot buyer's offer; `video` false with No ad videos ("Take +§{x}"). */
export interface BonusCard {
  kind: AdKind;
  amount: number;
  video: boolean;
  take: CardButton;
  later: CardButton | null;
}

// ------------------------------------------------------------------------------------------------ the frame (stage 2)

/** A works plot as the world draws it (the world maps PlateId × look to manifest entries in ONE table it owns). */
export type WorksLook = 'padlock' | 'buyable' | 'arriving' | 'installed' | 'idle' | 'working' | 'trayFull' | 'heating' | 'ready' | 'pour' | 'cooling';

export interface FrameWorks {
  plate: PlateId;
  place: PlaceId;
  look: WorksLook;
  x: number;
  y: number;
  /** The commissioning ring while the boss stands at it (5 s), as the work ring. */
  ring: { t0: number; t1: number; p0: number } | null;
  /** A financed plate's ring, taken ÷ T (prints no amount; not a debt display, P7), else null. */
  bankRing: number | null;
  /** A heat's, a pour's or a car's span. */
  span: Span | null;
  trayShare: number;
}

export interface FrameForklift {
  x: number;
  y: number;
  heading: Heading;
  by: 'boss' | null;
  /** The carry chip "{kg} / 1,500 kg" (print with kg_g), and the car on its forks if any. */
  load_g: number;
  cap_g: number;
  car: boolean;
}


