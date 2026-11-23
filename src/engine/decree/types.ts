/**
 * The decree rules' types (High Office, docs/design/office-design.md sections 2.2 to 2.17, with the
 * lead's decisions of section 11). Pure types and a few constants; the functions are in the files
 * beside this one and are reached only through the public index src/engine/decree.ts.
 *
 * `DecreeConfig` is the shared GameConfig plus the parsed `decree` block; `DecreeGame` is the shared
 * GameState plus `decree`. Dibs are the shared `cash`, changed only through the one `commitCash`
 * (src/engine/decree/params.ts); the play clock is the shared `stats.playSeconds`, which the tick
 * advances itself. Purchases are the shared `entitlements.products`.
 *
 * Indexing: offices 0 mayor, 1 governor, 2 president (`OfficeIx`); a club g indexes the CURRENT
 * office's `clubs` list (so moods[g], strikes[g] and a district's mix[g] line up); `clubIndex` maps a
 * club id to it. Ministry i of the current office; Grand Projects continue as i = 8 + j. Times are
 * play-clock seconds (`stats.playSeconds`) unless the comment says "decisions" (`stats.decisions`,
 * what follow-ups count) or "days" (decided day papers of this term).
 *
 * Written by the skeleton. Owned afterwards by P1a (the paper core) with P1b's agreement on every
 * seam type (the ones both sides read: Paper, Shown, Factors, DecreeParams, DeskItem, the events);
 * `types` freezes at hour 2 (9.2). docs/design/office-build-plan.md, "The seam".
 */
import type { GameConfig } from '../../config/schema';
import type { ArchetypeId, BaseEffect, ClubId, DecreeContent, FactorTarget, OfficeId, Visitor } from '../../config/schema.decree';
import type { GameState } from '../types';

export type * from '../../config/schema.decree';

/** The shared config with the parsed `decree` block (src/engine/decreeMode.ts `withDecreeContent`). */
export type DecreeConfig = GameConfig & { decree: DecreeContent };
/** The shared state with the decree fields. */
export type DecreeGame = GameState & { decree: DecreeState };

/** 0 mayor, 1 governor, 2 president. */
export type OfficeIx = 0 | 1 | 2;
/** A club's index into the current office's `clubs`. */
export type ClubIx = number;

/** One tick advances at most this many seconds (as merge's MAX_TICK). */
export const MAX_TICK = 3600;

/**
 * The random sites of section 2 (`rngMix4(seed, site, counter, x)`), each with one forward-only
 * counter in `draws` (2.3). Nothing else in the rules is random.
 * - pick: which text of the comic draw (draw.ts); petitioner: which club a template speaks for;
 *   jitter: a paper's money jitter j (draw.ts); template: the frame bag's shuffle and a phrase;
 *   followDelay: a follow-up's delay in its [low, high] (followup.ts); campaign: a campaign paper's
 *   district (term.ts via draw.ts); rival: tie-breaks of the rival list (term.ts); note: which Clerk's
 *   note a form carries (draw.ts).
 */
export const SITE = { pick: 1, petitioner: 2, jitter: 3, template: 4, followDelay: 5, campaign: 6, rival: 7, note: 8 } as const;
export type Site = keyof typeof SITE;

// ----------------------------------------------------------------------------- the paper (2.7)

/** The kinds of 2.7. `slip` is a budget slip (not a paper: never a day). */
export const PAPER_KINDS = ['comic', 'template', 'followup', 'requisition', 'ribbon', 'application', 'strike', 'scandal', 'campaign', 'rally', 'scripted'] as const;
export type PaperKind = (typeof PAPER_KINDS)[number];
/** Kinds that are days (2.17 step 2): every kind but campaign and rally (and slips, which are not papers). */
export const DAY_KINDS: readonly PaperKind[] = ['comic', 'template', 'followup', 'requisition', 'ribbon', 'application', 'strike', 'scandal', 'scripted'];

export type Choice = 'sign' | 'refuse';

/**
 * One effect of an outcome as fixed at the draw (2.7 "Fields": at most 4, from the closed set).
 * Money is already sized at the draw (`amount`, signed dibs: a cost is negative, never recomputed);
 * a mood is still the BASE Δ (`delta`): it is sized at landing into `Shown`.
 */
export type Effect =
  | { type: 'money'; amount: number }
  | { type: 'mood'; club: ClubIx; delta: number }
  | { type: 'every'; delta: number }
  | { type: 'gossip'; delta: number }
  | { type: 'gossipSet'; to: number }
  | { type: 'level'; ministry: number }
  | { type: 'appoint'; minister: string }
  | { type: 'endBoycott'; club: ClubIx }
  | { type: 'endScandal' }
  | { type: 'district'; district: number; points: number };

/** A follow-up an outcome schedules (2.7 "an optional follow-up {chainId, step, delay}"). */
export interface FollowUpRef {
  chainId: string;
  /** 1: the follow-up of a set-up (chains of v1 have one step). */
  step: number;
  /** Decisions ever until it is due, drawn at the draw (site followDelay). */
  delay: number;
}

/** One side of a paper as fixed at the draw: its effects and its follow-up. */
export interface Outcome {
  effects: Effect[];
  followUp: FollowUpRef | null;
  /** The side's own label where a form names it ("Return the scissors", "Apologise on the steps"), a deck text; else the strings' default. */
  label: string | null;
}

/** A paper, fixed at its draw (2.7 "Fields"); nothing in it changes after the draw (H1). */
export interface Paper {
  /** Unique within a save: `${kind}:${source}:${draw}`. */
  id: string;
  kind: PaperKind;
  /** The deck record it came from (a paper, chain, grievance, ... id; or the form's own name). */
  source: string;
  /** The office it was drawn in. */
  office: OfficeIx;
  visitor: Visitor & { clubIx: ClubIx | null };
  /** The proposal (≤ 90 characters; a template's frame with its phrase filled in). */
  text: string;
  /** The returning-visitor last line, when the text came back whole (2.7 "with no unseen text left"). */
  returning: string | null;
  archetype: ArchetypeId | null;
  /** The petitioner's club and the other side (7.2), as club indices of the drawing office. */
  petitioner: ClubIx | null;
  other: ClubIx | null;
  tags: { subject: string; butt: string; shape: string } | null;
  sign: Outcome;
  refuse: Outcome;
  /** Forms: the ministry and its level at the draw ("Potholes Office +1 level (now 7)"). */
  ministry: number | null;
  drawnLevel: number | null;
  /** A campaign paper's district. */
  district: number | null;
  /** A Clerk's note (on half the forms), a deck text. */
  note: string | null;
  /** The paper's money as drawn: B at the draw and j (the strip never recomputes them). */
  drawnB: number;
  jitter: number;
}

/**
 * One effect as it lands (2.7 "Sizing"): moods sized by f± from the moods at landing, after the
 * twist and minister factors, and frozen. What the strip prints and what commit applies (H1).
 */
export type ShownEffect =
  | { type: 'money'; amount: number }
  /** `delta` per office club (0 where it does not touch); one entry for a club, every club for `every`. */
  | { type: 'moods'; every: boolean; deltas: number[] }
  | { type: 'gossip'; delta: number }
  | { type: 'level'; ministry: number }
  | { type: 'appoint'; minister: string }
  | { type: 'endBoycott'; club: ClubIx }
  | { type: 'endScandal' }
  | { type: 'district'; district: number; points: number };

/** Both outcomes as frozen at landing (`shown`), and the initials of the factors that touched them ("DP ×0.9"). */
export interface Shown {
  sign: ShownEffect[];
  refuse: ShownEffect[];
  factors: { initials: string; text: string }[];
  /** The moods the sizing read (for take-back and the tests: the paper is re-landed byte for byte, H3). */
  moodsAt: number[];
}

/** A budget slip (2.7 "Budget slips"): advice()'s purchase at its printed price. */
export interface Slip {
  kind: 'slip';
  purchase: Purchase;
  /** The printed price, which always buys the printed level (2.7). */
  price: number;
  /** The level the purchase starts from (a level form; stale when it moved, 2.7 "Forms are checked at commit"). */
  drawnLevel: number;
  /** +n/s it adds to I at landing (printed "+8/s"). */
  rateGain: number;
}

/** What a slip, the Ledger or the Standing Order buys. */
export type Purchase = { type: 'level'; ministry: number } | { type: 'open'; ministry: number } | { type: 'monument'; monument: string };

/** What lies on the desk: a paper with its frozen `shown`, or a slip. */
export type DeskItem = { type: 'paper'; paper: Paper; shown: Shown; landedAt: number } | { type: 'slip'; slip: Slip; landedAt: number };

/** A signed day paper in its take-back window (2.7 "Decide"): committed after `until`, at a tap elsewhere, or when the app goes to the background. */
export interface Pending {
  item: DeskItem & { type: 'paper' };
  until: number;
}

// ----------------------------------------------------------------------------- the state (2.3)

export type Phase = 'governing' | 'campaign' | 'count' | 'result';

/** A follow-up waiting (2.3 `followUps`). */
export interface FollowUp {
  chainId: string;
  step: number;
  /** How the set-up was decided (which branch comes back). */
  choice: Choice;
  /** Decisions ever at which it is due. */
  dueAt: number;
}

/** A boycott running (2.8), counted in decided papers. */
export interface Strike {
  papersLeft: number;
  /** The picket slogan on its Ledger row (none twice a term). */
  picket: string;
  grievance: string;
}

/** "Say nothing" running (2.8): I × factor for papersLeft decided papers. */
export interface Scandal {
  papersLeft: number;
}

/** A minister appointed (2.3 `cabinet[id]`). */
export interface CabinetSeat {
  club: ClubId;
  termsServed: number;
}

/** The run-up's campaign points per district (2.3 `campaign {C[d]}`) and how many campaign papers are left. */
export interface Campaign {
  C: number[];
  papersLeft: number;
  rallyDone: boolean;
}

/** The last count (2.10), kept for the result sheet and election night. */
export interface CountResult {
  /** Per district, in district order: share in hundredths (shown to one decimal), held at ≥ 5000. */
  districts: { district: number; share: number; held: boolean }[];
  /** Announcement order: by |share − 50| largest first (2.10). */
  order: number[];
  held: number;
  majority: number;
  won: boolean;
  sweep: boolean;
  /** The rival who stood (an id of the office's rivals). */
  rival: string;
}

/** A photograph on the Office wall (2.12 "Carries"): a town left, with its levels. */
export interface WallPhoto {
  office: OfficeIx;
  terms: number;
  levels: number[];
}

/** The game counters the rules and the bots read (2.3 `stats`; not the shared stats). */
export interface DecreeStats {
  /** Decisions ever (days and campaign papers and slips? no: decided papers of every kind but slips), what follow-ups count. */
  decisions: number;
  daysEver: number;
  signed: number;
  refused: number;
  slipsTaken: number;
  boycotts: number;
  scandals: number;
  elections: number;
  wins: number;
  /** Every mood clamp the commit had to apply: always 0 (the lemma of 2.7, H1). */
  clamps: number;
}

/** The decree fields on the shared state (2.3). */
export interface DecreeState {
  seed: number;
  /** One forward-only counter per random site. */
  draws: Record<Site, number>;
  office: OfficeIx;
  /** Terms in this seat (1-based). */
  term: number;
  /** Presidential terms (the twist ladder of 2.14). */
  presTerms: number;
  /** Decided day papers this term. */
  day: number;
  phase: Phase;
  /** Consecutive losses at this seat (disarray Y = disarray × losses). */
  losses: number;
  /** Ministries of the current office (Grand Projects after them). */
  ministries: { open: boolean; level: number }[];
  /** Moods 0 to 100 per club of the office. */
  moods: number[];
  gossip: number;
  /** Decisions without a gossip gain (decay after quietDecay). */
  quiet: number;
  strikes: (Strike | null)[];
  /** A club below the threshold boycotts only while armed (re-arms at rearmAt). */
  armed: boolean[];
  scandal: Scandal | null;
  /** The in-tray, each paper fixed at its draw. */
  tray: Paper[];
  desk: DeskItem | null;
  pending: Pending | null;
  /** Ordinary papers set aside at a call (2.17), back to the tray at a new term. */
  asideTray: Paper[];
  /** Play-clock time of the next arrival, or null while the arrival clock is stopped (full tray, run-up, count, result). */
  nextArrivalAt: number | null;
  /** Remainder of away time toward the next away arrival (2.15). */
  awayCarry: number;
  /** When the desk and tray became empty (the slip lands slipDelay after it), or null. */
  emptySince: number | null;
  followUps: FollowUp[];
  /** Deck text id → decisions ever when last drawn (2.3 `seen`). */
  seen: Record<string, number>;
  /** The template frames left in this bag, in dealing order (2.7 step 5). */
  frameBag: string[];
  notesSeen: string[];
  /** Picket slogans used this term (none twice a term). */
  picketsThisTerm: string[];
  campaign: Campaign | null;
  /** The last count, on the result sheet and election night until the choice after it. */
  count: CountResult | null;
  /** Name Recognition (never falls). */
  nr: number;
  cabinet: Record<string, CabinetSeat>;
  /** Applications delivered (minister ids) and the ones sent away with their return time (decisions ever). */
  applicationsDelivered: string[];
  applicationReturns: { minister: string; dueAt: number }[];
  /** Monuments bought (ids), each ×vanity.factor. */
  vanity: string[];
  /** The offer of this term's monument (5.8), or null. */
  monumentOffer: string | null;
  /** Index into the office's twist order of the next new thing (2.14). */
  twistIndex: number;
  /** Twists running this term (ids). */
  twists: string[];
  /** Per office, the index of the current rival in its list. */
  rivalIndex: number[];
  formerOpponents: string[];
  /** Clippings collected (chain endings, election headlines). */
  clippings: string[];
  wall: WallPhoto[];
  drawerCount: number;
  /** Ads used this term (Check the Sofa once a term) and cooldowns (play-clock time it is next allowed). */
  adsUsed: Record<string, number>;
  cooldowns: Record<string, number>;
  /** The Standing Order switch (5.10). */
  standingOrder: boolean;
  /** The face picked on the loading card (3.1), or null until picked. */
  face: string | null;
  /** The four scripted papers of a game delivered so far; the offices whose first paper came. */
  scriptedDone: string[];
  stats: DecreeStats;
}

// ----------------------------------------------------------------------------- derived values (2.4)

/**
 * The factors twists and ministers put on BASE effects before sizing (2.14, 2.9, 2.17: "never
 * after"): ONE object, neutral by default (`neutralFactors()`), produced by twists.ts and
 * ministers.ts (`deskFactors`), consumed by size.ts, draw.ts (prices, shares, τ) and params.ts (G_max).
 * Composition (2.14): mix twists add, every other factor multiplies (`mul`) and adds (`add`).
 */
export interface Factors {
  /** Added to a club's weight in every district (the others scaled down to keep 1.00), per office club. */
  mixAdd: number[];
  /** Every non-mix factor, each with where it came from (a twist id or a minister's initials). */
  list: { target: FactorTarget; club: ClubIx | null; mul: number; add: number; source: string; initials: string | null }[];
}

/** A factor's combined effect on one target for one club's paper (or for every club): mul and add, and who put it there. */
export interface FactorValue {
  mul: number;
  add: number;
  sources: { initials: string | null; source: string }[];
}

/** Every derived value of 2.4 (params.ts `decreeParams`): what tick, size, draw, advice and the screens read. */
export interface DecreeParams {
  office: OfficeIx;
  /** Club ids of the office, in club-index order. */
  clubs: ClubId[];
  /** w_{d,g} as fractions, after mix twists; W_g, the mean over districts. */
  mix: number[][];
  W: number[];
  /** A (whole percent) and M(A). */
  approval: number;
  multiplier: number;
  /** m_N, V. */
  mN: number;
  V: number;
  /** rate_i = v_i × L_i × 2^st(L_i) for each ministry (0 when closed); v_i. */
  rates: number[];
  values: number[];
  /** s_i: 0 while ministry i's club boycotts. */
  served: number[];
  /** B (sizes papers and the transition fund) and I (income per second, while played). */
  B: number;
  I: number;
  /** The "Say nothing" factor in force (1 when none runs). */
  sayNothing: number;
  tau: number;
  gossipMax: number;
  record: number;
}

// ----------------------------------------------------------------------------- what screens print

/** One chip of a strip (2.7 "A strip prints"): an icon and a resulting value. A wide chip takes 2 of the 4 slots. */
export type Chip =
  | { kind: 'club'; club: ClubIx; from: number; to: number; flag: boolean; wide: false }
  | { kind: 'every'; deltas: number[]; approvalFrom: number; approvalTo: number; wide: true }
  | { kind: 'money'; amount: number; wide: false }
  | { kind: 'gossip'; from: number; to: number; max: number; wide: false }
  | { kind: 'level'; ministry: number; from: number; to: number; wide: false }
  | { kind: 'appoint'; minister: string; wide: false }
  | { kind: 'endBoycott'; club: ClubIx; wide: false }
  | { kind: 'endScandal'; wide: false }
  | { kind: 'district'; district: number; from: number; to: number; wide: true };

/** A strip's note row, warnings first (2.7). */
export type StripNote = { kind: 'boycott'; club: ClubIx } | { kind: 'scandal'; gossip: number; max: number } | { kind: 'short'; by: number; seconds: number };

/** What a strip prints, as data (2.7): the screen only lays it out and finds the words in strings.ts. */
export interface Strip {
  side: Choice;
  /** "Poll 3 → 4 of 5" when the districts held change, else null and the approval row prints. */
  poll: { from: number; to: number; of: number } | null;
  approval: { from: number; to: number };
  /** ↩ when this outcome schedules a follow-up. */
  followUp: boolean;
  /** "No change" when empty. */
  chips: Chip[];
  notes: StripNote[];
  /** Initials of the factors on this side ("DP ×0.9"). */
  factors: string[];
  /** Sign only: whether the treasury pays it now. Refuse is always possible. */
  affordable: boolean;
  label: string | null;
}

/** One row of the poll (4.4), the number held exactly as the count would hold it today. */
export interface PollRow {
  district: number;
  name: string;
  short: string;
  /** Hundredths (shown to one decimal). */
  share: number;
  held: boolean;
  /** Clubs strong here (w ≥ 0.4) and the campaign points. */
  strong: ClubIx[];
  campaign: number;
}
export interface Poll {
  rows: PollRow[];
  held: number;
  majority: number;
  of: number;
  rivalPull: number;
  /** Y, labelled "Opponents in disarray +8". */
  disarray: number;
  rival: string;
  canCall: boolean;
  callFrom: number;
}

/** One Ledger row (4.4), read-only but for one untaught "Raise". */
export interface LedgerRow {
  ministry: number;
  open: boolean;
  level: number;
  storeys: number;
  rate: number;
  club: ClubIx | null;
  minister: string | null;
  /** "Boycott: Vegetables 18, ends at 25 or in 5 papers". */
  boycott: { club: ClubIx; mood: number; endsAt: number; papersLeft: number } | null;
  /** The price of the next level, or of opening. */
  price: number;
  /** Why "Raise" is refused now, or null. */
  refusal: 'cap' | 'cash' | 'reserve' | 'closed' | null;
}
export interface Ledger {
  rows: LedgerRow[];
  record: number;
  recordTarget: number | null;
  recordName: string | null;
  /** "Kept for the desk: 540". */
  reserve: number;
}

/** The term ribbon (4.1): both fixed forms' values. */
export interface TermRibbon {
  acting: boolean;
  office: OfficeIx;
  day: number;
  termDays: number;
  nr: number;
  nrTarget: number | null;
  record: number;
  recordTarget: number | null;
  callFrom: number;
  canCall: boolean;
  poll: { held: number; of: number };
}

/** The top bar (4.1): "999.9M · +999.9K/s", "62 % ×1.14", gossip. */
export interface TopBar {
  cash: number;
  income: number;
  approval: number;
  multiplier: number;
  gossip: number;
  gossipMax: number;
}

/** "about 20 s / 2 min / 1 h" (2.16): a time the screen prints, already rounded by the rules. */
export interface About {
  value: number;
  unit: 's' | 'min' | 'h';
}

// ----------------------------------------------------------------------------- advice (2.16)

export type Goal =
  | { kind: 'purchase'; purchase: Purchase; price: number; about: About | null }
  | { kind: 'call'; held: number; of: number }
  | { kind: 'settle'; club: ClubIx }
  | { kind: 'apologise' }
  | { kind: 'ad'; ad: DecreeAdKind }
  | { kind: 'none' };

/** advice() (pure): one goal for the bot, the slip and the goal line. */
export interface AdviceResult {
  goal: Goal;
  /** The purchase a slip would carry now (affordable above the reserve), or null. */
  slip: Slip | null;
  /** "Next: Benches opens · 2,400 · about 40 s" when nothing is affordable. */
  next: { purchase: Purchase; price: number; about: About | null } | null;
  /** The reader would call now (8.2). */
  call: boolean;
}

// ----------------------------------------------------------------------------- the term (2.10, 2.12, 2.15)

export type MoveChoice = 'moveUp' | 'stay';

/** The result sheet after a count (2.10). */
export interface ResultSheet {
  count: CountResult;
  nrGained: number;
  /** "Stand for Governor" possible; else what is missing. */
  canMoveUp: boolean;
  missing: { nr: number; nrNeeded: number; record: number; recordNeeded: number } | null;
  /** The new thing the next term opens (a twist id, a Grand Project id, or "A Quiet Term"). */
  next: string | null;
  resignation: string | null;
}

/** The move sheet (2.12): what resets, what stays, and when the new income passes the old. */
export interface MoveSheet {
  from: OfficeIx;
  to: OfficeIx;
  resets: string[];
  stays: string[];
  /** Seconds until the new office's income passes the old (from advice), or null. */
  passesIn: number | null;
  transitionFund: number;
}

/** The away report (2.15): "While you were out (2 h 10 m): the ministries collected 14.2K dibs. 10 visitors are waiting." */
export interface AwayReport {
  seconds: number;
  /** The absence was longer than the cap. */
  capped: boolean;
  earnings: number;
  /** Papers drawn for the absence, and how many wait in the tray now. */
  arrived: number;
  waiting: number;
  line: string | null;
}

export type DecreeAdKind = 'checkSofa' | 'spinDoctor' | 'courier' | 'openDoors';

// ----------------------------------------------------------------------------- events

/**
 * What the rules report to the screens and the sounds (src/modes/decree/fx.ts maps them to keys of
 * src/services/fx/catalog.decree.ts). The player's own actions play in src/modes/decree/actions.ts.
 */
export type DecreeEvent =
  | { type: 'paperArrived'; paper: string; toDesk: boolean }
  | { type: 'slipArrived' }
  | { type: 'slipReturned' }
  | { type: 'signed'; paper: string }
  | { type: 'studied'; paper: string }
  | { type: 'committed'; paper: string; choice: Choice }
  | { type: 'takenBack'; paper: string }
  | { type: 'formVoid'; paper: string; reason: 'done' | 'cap' }
  | { type: 'levelBought'; ministry: number; level: number }
  | { type: 'storey'; ministry: number; storey: number }
  | { type: 'ministryOpened'; ministry: number }
  | { type: 'appointed'; minister: string }
  | { type: 'ribbon'; ministry: number }
  | { type: 'boycottStart'; club: ClubIx }
  | { type: 'boycottEnd'; club: ClubIx; how: 'settled' | 'count' | 'mood' | 'ad' | 'term' }
  | { type: 'gossip'; from: number; to: number }
  | { type: 'scandalStart' }
  | { type: 'scandalEnd'; how: 'apology' | 'count' | 'ad' | 'term' }
  | { type: 'followUpScheduled'; chainId: string; dueAt: number }
  | { type: 'clipping'; headline: string }
  | { type: 'monument'; monument: string }
  | { type: 'callElection' }
  | { type: 'runUpStarted'; byItself: boolean }
  | { type: 'countStarted' }
  | { type: 'envelope'; district: number; held: boolean }
  | { type: 'majority' }
  | { type: 'defeat' }
  | { type: 'termStarted'; term: number; office: OfficeIx; next: string | null }
  | { type: 'moved'; from: OfficeIx; to: OfficeIx }
  | { type: 'ad'; ad: DecreeAdKind };

/** Where dibs come from and go (H5: dibs enter only through these). */
export type CashSource = 'tick' | 'paper' | 'away' | 'awayAd' | 'checkSofa' | 'transition' | 'spend';

/** The base effect a deck record carries (re-exported for the rules' signatures). */
export type { BaseEffect };
/** The office id of an index. */
export type { OfficeId };
