/**
 * The decree rules' types (High Office, docs/design/office-design.md sections 2.2 to 2.17, with the
 * lead's decisions of section 11). Pure types and a few constants; the functions are in the files
 * beside this one and are reached only through the public index src/engine/decree.ts.
 *
 * `DecreeConfig` is the shared GameConfig plus the parsed `decree` block; `DecreeGame` is the shared
 * GameState plus `decree`. Dibs are the shared `cash`, changed by the rules only through the one
 * `commitCash` (src/engine/decree/params.ts; the store pays the away earnings and the away ad through
 * the shared economy's grantCash, 2.15); the play clock is the shared `stats.playSeconds`, which the
 * tick advances itself. Purchases are the shared `entitlements.products`.
 *
 * Indexing: offices 0 mayor, 1 governor, 2 president (`OfficeIx`); a club g indexes the CURRENT
 * office's `clubs` list (so moods[g], strikes[g] and a district's mix[g] line up); `clubIndex` maps a
 * club id to it. Ministry i of the current office; Grand Projects continue as i = 8 + j. Times are
 * play-clock seconds (`stats.playSeconds`) unless the comment says "decisions" (`stats.decisions`,
 * what follow-ups count) or "days" (decided day papers of this term).
 *
 * ONE MOMENT OF FREEZING (D23): a paper's identity, its effects as base values and its jitter are
 * fixed when it is DRAWN; every number it prints, money included, is fixed when it LANDS on the desk
 * (`Shown`, size.ts `freezeShown`). A form's level is the one thing that can go stale; commit checks it.
 *
 * THREE SECTIONS, each edited only by its owner (docs/design/office-build-plan.md "The seam"):
 * - SEAM: the types both rules packages read and write (Paper, Effect, Shown, DeskItem, the state,
 *   Factors, DecreeParams, CashSource, the event union). A change is agreed by P1a and P1b first;
 *   frozen at hour 2 (9.2). Edited by P1a once agreed.
 * - P1a: what the paper core returns to the screens (Chip, Strip, StripNote, Ledger, TopBar) and
 *   its events (`PaperEvent`).
 * - P1b: what the term, the count, advice, the away rules and the grants return (Poll, TermRibbon,
 *   About, Goal, AdviceResult, ResultSheet, MoveSheet, AwayReport, DecreeAdKind) and their events
 *   (`TermEvent`).
 */
import type { GameConfig } from '../../config/schema';
import type { ArchetypeId, BaseEffect, ClubId, DecreeContent, FactorTarget, OfficeId, Visitor } from '../../config/schema.decree';
import type { GameState } from '../types';

export type * from '../../config/schema.decree';

// ================================================================================================
// SEAM (P1a and P1b agree on every change; frozen at hour 2)
// ================================================================================================

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
 *   jitter: a paper's money jitter j, drawn at the draw and applied at landing (draw.ts, D23);
 *   template: the frame bag's shuffle and a phrase; followDelay: a follow-up's delay in its
 *   [low, high] (followup.ts); campaign: a campaign paper's district (draw.ts `drawCampaignPaper`);
 *   rival: tie-breaks of the rival list (term.ts); note: which Clerk's note a form carries (draw.ts).
 */
export const SITE = { pick: 1, petitioner: 2, jitter: 3, template: 4, followDelay: 5, campaign: 6, rival: 7, note: 8 } as const;
export type Site = keyof typeof SITE;

// ----------------------------------------------------------------------------- the paper (2.7)

/** The kinds of 2.7. A budget slip is not a paper (DeskItem `slip`: never a day). */
export const PAPER_KINDS = ['comic', 'template', 'followup', 'requisition', 'ribbon', 'application', 'strike', 'scandal', 'campaign', 'rally', 'scripted'] as const;
export type PaperKind = (typeof PAPER_KINDS)[number];
/** Kinds that are days (2.17 step 2): every kind but campaign and rally (and slips, which are not papers). */
export const DAY_KINDS: readonly PaperKind[] = ['comic', 'template', 'followup', 'requisition', 'ribbon', 'application', 'strike', 'scandal', 'scripted'];

export type Choice = 'sign' | 'refuse';

/**
 * One effect of an outcome as fixed at the draw (2.7 "Fields": at most 4, from the closed set), as a
 * BASE value: nothing here is sized yet. Sizing happens at landing (D23) into `Shown`, after the twist
 * and minister factors (2.17 "before sizing, never after").
 * - money: `seconds` of B, signed (negative a cost), sized at landing to
 *   roundDibs(|seconds| × factor × B_landing × paper.jitter), at least money.minimum (size.ts `sizeMoney`);
 * - moneyFixed: a fixed signed amount of dibs, never sized (scripted paper 3's +60);
 * - mood: one club's base Δ, sized by f± at landing; `fixed` (a boycott settlement's +10, 2.8) is
 *   copied unsized (the lemma of 2.7: a settlement's fixed +10 starts below 20);
 * - every: every club of the office, one chip; gossip / gossipSet (the apology's "to 0");
 * - level: the form's ministry +1 level (checked at commit against `Paper.drawnLevel`);
 * - appoint, endBoycott, endScandal; district: campaign points for the paper's district.
 */
export type Effect =
  | { type: 'money'; seconds: number }
  | { type: 'moneyFixed'; amount: number }
  | { type: 'mood'; club: ClubIx; delta: number; fixed?: true }
  | { type: 'every'; delta: number }
  | { type: 'gossip'; delta: number }
  | { type: 'gossipSet'; to: number }
  | { type: 'level'; ministry: number }
  | { type: 'appoint'; minister: string }
  | { type: 'endBoycott'; club: ClubIx }
  | { type: 'endScandal' }
  | { type: 'district'; district: number; points: number }
  /** A requisition's price: the next level of `ministry` at its live price when the paper lands (× the requisition factor), as a cost (D23). */
  | { type: 'levelCost'; ministry: number }
  /** A front page's refuse (2.8 "Say nothing"): I × the factor for the papers, both frozen at landing. */
  | { type: 'sayNothing' }
  /** A grievance's refuse (2.8 "Keep the scissors"): the boycott runs this many more decided papers (frozen at landing). */
  | { type: 'boycottRuns'; club: ClubIx }
  /** An application's refuse (2.9): the minister applies again returnAfter decisions later. */
  | { type: 'applyAgain'; minister: string };

/**
 * A follow-up an outcome schedules (2.7 "an optional follow-up {chainId, step, delay}").
 * - kind 'chain': a chain of the deck (7.6); `chainId` its id.
 * - kind 'study' / 'favour' (D20): a Committee's own bigger study or a Basket's own favour, written
 *   with the paper (deck `papers[].biggerStudy` / `.favour`); `chainId` is the set-up paper's deck id.
 */
export interface FollowUpRef {
  kind: 'chain' | 'study' | 'favour';
  chainId: string;
  /** 1: the follow-up of a set-up (chains of v1 have one step). */
  step: number;
  /** Decisions ever until it is due, drawn at the draw (site followDelay). */
  delay: number;
}

/** One side of a paper as fixed at the draw: its base effects and its follow-up. */
export interface Outcome {
  effects: Effect[];
  followUp: FollowUpRef | null;
  /** The side's own label where a form names it ("Return the scissors", "Apologise on the steps"), a deck text; else the strings' default. */
  label: string | null;
}

/** A paper, fixed at its draw (2.7 "Fields"); nothing in it changes after the draw (its printed numbers are `Shown`, fixed at landing). */
export interface Paper {
  /** Unique within a save: `${kind}:${source}:${draw}`. */
  id: string;
  kind: PaperKind;
  /** The deck record it came from (a paper, chain branch `<chain>.sign`, own follow-up `<paper>.study` / `.favour`, grievance, ... id; or the form's own name). */
  source: string;
  /** The office it was drawn in. */
  office: OfficeIx;
  visitor: Visitor & { clubIx: ClubIx | null };
  /** A co-signer printed beside the visitor ("Pauline Till, with Ambrose Minute", 7.5 paper 5), or null. */
  cosigner: Visitor | null;
  /** The proposal (≤ 90 characters; a template's frame with its phrase filled in; a campaign paper with its district named). */
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
  /** A follow-up's two clippings (5.9, 7.6): the headline each choice ends its chain in; null for every other paper. */
  clipping: { sign: string; refuse: string } | null;
  /** Forms: the ministry and its level at the draw ("Potholes Office +1 level (now 7)"); checked at commit (2.7). */
  ministry: number | null;
  drawnLevel: number | null;
  /** A campaign paper's district. */
  district: number | null;
  /** A Clerk's note (on half the forms), a deck text. */
  note: string | null;
  /** The money jitter j (money.jitterLow to jitterHigh), drawn at the draw, applied at landing (D23); 1 for forms, events and the run-up. */
  jitter: number;
  /** A follow-up paper: the record it was drawn from (a move puts it back among the due follow-ups, 2.12). */
  followUpOf?: FollowUp;
}

/**
 * One effect as it lands (2.7 "Sizing", D23): money sized from B at landing and moods sized by f±
 * from the moods at landing, after the twist and minister factors, and frozen. What the strip prints
 * and what commit applies (H1).
 */
export type ShownEffect =
  | { type: 'money'; amount: number }
  /** `delta` per office club (0 where it does not touch); one entry for a club, every club for `every`. */
  | { type: 'moods'; every: boolean; deltas: number[] }
  | { type: 'gossip'; delta: number }
  /** `from`: the level at landing; commit applies it only while the ministry still stands at `from` (2.7 "Forms are checked at commit"). */
  | { type: 'level'; ministry: number; from: number }
  | { type: 'appoint'; minister: string }
  | { type: 'endBoycott'; club: ClubIx }
  | { type: 'endScandal' }
  | { type: 'district'; district: number; points: number }
  | { type: 'sayNothing'; papers: number; factor: number }
  | { type: 'boycottRuns'; club: ClubIx; papers: number }
  | { type: 'applyAgain'; minister: string; papers: number };

/** Both outcomes as frozen at landing (`shown`), and the initials of the factors that touched them ("DP ×0.9"). */
export interface Shown {
  sign: ShownEffect[];
  refuse: ShownEffect[];
  factors: { initials: string; text: string; side?: Choice }[];
  /** The moods and B the sizing read (for take-back and the tests: the paper is re-landed byte for byte, H3). */
  moodsAt: number[];
  BAt: number;
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

/** A follow-up waiting (2.3 `followUps`): which set-up it answers, which branch, and when it is due. */
export interface FollowUp {
  kind: FollowUpRef['kind'];
  /** The chain id ('chain'), or the set-up paper's deck id ('study', 'favour'). */
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
  /** True from the start until the decided paper after the grievance's own commit: the count runs only on the decided papers that follow (2.8 "it runs 8 more decided papers"). */
  waiting?: boolean;
  /** The picket slogan on its Ledger row (none twice a term). */
  picket: string;
  /** The grievance's deck id. */
  grievance: string;
}

/** "Say nothing" running (2.8): I × the factor for papersLeft decided papers. */
export interface Scandal {
  papersLeft: number;
  /** I's factor as printed on the front page at landing (H1), e.g. 0.8. */
  factor?: number;
  /** True at the commit that starts it: the front page's own commit is not one of the 10 papers. */
  waiting?: boolean;
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
  /** Decisions ever: decided DAY papers of every office and term (2.17 step 2), what follow-ups and returns count. */
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
  /** Arrivals drawn by drawNext (a requisition every n-th, 2.7 step 4). */
  drawn: number;
  /** Papers made by any path (unique paper ids). */
  papers: number;
  /** H5: dibs by source as commitCash applied them (gains positive, spending negative). */
  book: Partial<Record<CashSource, number>>;
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
  /** Consecutive losses at this seat: disarray Y(n) = 2^(n+1) − 2 (D15; params.ts `disarray`). */
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
  /** The in-tray: papers as drawn (identity, base effects, jitter), sized only when each lands (D23). */
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
  /** D18: a slip was offered since the last paper was decided (at most one slip between two papers). */
  slipOffered: boolean;
  followUps: FollowUp[];
  /** Deck text id → decisions ever when last drawn (2.3 `seen`). */
  seen: Record<string, number>;
  /** The template frames left in this bag, in dealing order (2.7 step 5). */
  frameBag: string[];
  notesSeen: string[];
  /** Picket slogans used this term (none twice a term). */
  picketsThisTerm: string[];
  /** Ribbon forms due: a storey reached and its ribbon not drawn yet (2.7 step 4). */
  ribbonsDue: { ministry: number; storey: number }[];
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
  /** Scripted papers delivered, as `<office id>:<slot>` (the first four of a game, the first of each higher office). */
  scriptedDone: string[];
  stats: DecreeStats;
}

// ----------------------------------------------------------------------------- derived values (2.4)

/**
 * The factors twists and ministers put on BASE effects before sizing (2.14, 2.9, 2.17: "never
 * after"): ONE object, neutral by default (`neutralFactors()`), produced by twists.ts and
 * ministers.ts (`deskFactors`, P1b), consumed by size.ts (every base effect at landing), draw.ts
 * (shares of the draw, τ) and params.ts (mixes, G_max, the "Say nothing" cut).
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
  /** A (whole percent) and M(A) = 1 + slope × (A − 50)/100 (×1.0 at 50). */
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
  /** B (sizes papers at landing and the transition fund) and I (income per second, while played). */
  B: number;
  I: number;
  /** The "Say nothing" factor in force (1 when none runs). */
  sayNothing: number;
  tau: number;
  gossipMax: number;
  /** Y(losses) = 2^(n+1) − 2 share points (D15), and the rival's pull R. */
  disarray: number;
  rivalPull: number;
  record: number;
}

/** Where dibs come from and go (H5). The rules book every change through commitCash; the store pays `away` and `awayAd` through the shared grantCash (2.15), so a coins test books those two in its own harness. */
/** Where dibs come from or go (H5). `reset`: the old treasury set aside at a move (2.12), never a gain. */
export type CashSource = 'tick' | 'paper' | 'away' | 'awayAd' | 'checkSofa' | 'transition' | 'spend' | 'reset';

/** What the rules report to the screens and the sounds: the paper core's and the term's (src/modes/decree/fx.ts maps them to keys). */
export type DecreeEvent = PaperEvent | TermEvent;

// ================================================================================================
// P1a: what the paper core returns to the screens, and its events
// ================================================================================================

/**
 * One chip of a strip (2.7 "A strip prints"): an icon and a resulting value. A wide chip takes 2 of
 * the 4 slots. A district chip's from/to are the district's share in hundredths before and after
 * ("HT 48.6 → 52.6", count.ts `shares`).
 */
export type Chip =
  | { kind: 'club'; club: ClubIx; from: number; to: number; flag: boolean; wide: false; icon: string }
  | { kind: 'every'; deltas: number[]; approvalFrom: number; approvalTo: number; wide: true; icon: string }
  | { kind: 'money'; amount: number; wide: false; icon: string }
  | { kind: 'gossip'; from: number; to: number; max: number; wide: false; icon: string }
  | { kind: 'level'; ministry: number; from: number; to: number; wide: false; icon: string }
  | { kind: 'appoint'; minister: string; wide: false; icon: string }
  | { kind: 'endBoycott'; club: ClubIx; wide: false; icon: string }
  | { kind: 'endScandal'; wide: false; icon: string }
  | { kind: 'district'; district: number; from: number; to: number; wide: true; icon: string };

/** A strip's note row, warnings first (2.7): "Vegetables below 20: BOYCOTT", "Gossip 5/5: SCANDAL", "Short by 240 · about 9 s" (`about` from advice.ts). */
export type StripNote =
  | { kind: 'boycott'; club: ClubIx }
  | { kind: 'scandal'; gossip: number; max: number }
  | { kind: 'short'; by: number; about: About | null }
  /** "Taxes ×0.8 for 10 papers, then Gossip 0" (a front page's refuse, as frozen). */
  | { kind: 'sayNothing'; papers: number; factor: number }
  /** "It runs 8 more papers" (a grievance's refuse, as frozen). */
  | { kind: 'boycottRuns'; club: ClubIx; papers: number }
  /** "Applies again in 30 papers" (an application's refuse). */
  | { kind: 'applyAgain'; papers: number }
  /** A form that would leave with no effect now: "Already done: the Clerk takes it back" or "No longer needed" (2.7). */
  | { kind: 'void'; reason: 'done' | 'cap' };

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
  /** A stale form (its level moved) or a capped one: it leaves with no effect, whichever side (2.7). */
  void: 'done' | 'cap' | null;
}

/** One Ledger row (4.4), read-only but for one untaught "Raise". */
export interface LedgerRow {
  ministry: number;
  open: boolean;
  level: number;
  storeys: number;
  rate: number;
  club: ClubIx | null;
  /** The minister who runs it (ministers.ts `cabinet`, P1b), or null. */
  minister: string | null;
  /** "Boycott: Vegetables 18, ends at 25 or in 5 papers", with its picket slogan. */
  boycott: { club: ClubIx; mood: number; endsAt: number; papersLeft: number; picket: string } | null;
  /** The price of the next level, or of opening. */
  price: number;
  /** Why "Raise" is refused now, or null. */
  refusal: 'cap' | 'cash' | 'reserve' | 'closed' | 'runUp' | null;
}
export interface Ledger {
  rows: LedgerRow[];
  record: number;
  recordTarget: number | null;
  recordName: string | null;
  /** "Kept for the desk: 540" (2.6). */
  reserve: number;
  /** "Kept for the run-up" (D16: from day C until the count, the K campaign papers and the rally at their prices), 0 otherwise. */
  reserveRunUp: number;
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

/** The paper core's events (draw, land, decide, commit, slips, purchases, boycotts, the scandal, follow-ups). */
export type PaperEvent =
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
  | { type: 'ribbon'; ministry: number }
  | { type: 'boycottStart'; club: ClubIx }
  | { type: 'boycottEnd'; club: ClubIx; how: 'settled' | 'count' | 'mood' | 'ad' | 'term' }
  | { type: 'gossip'; from: number; to: number }
  | { type: 'scandalStart' }
  | { type: 'scandalEnd'; how: 'apology' | 'count' | 'ad' | 'term' }
  | { type: 'followUpScheduled'; chainId: string; dueAt: number }
  | { type: 'clipping'; headline: string }
  | { type: 'monument'; monument: string };

// ================================================================================================
// P1b: what the term, the count, advice, the away rules and the grants return, and their events
// ================================================================================================

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
  /** Y(losses) (D15), labelled "Opponents in disarray +6". */
  disarray: number;
  rival: string;
  canCall: boolean;
  callFrom: number;
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

/** "about 20 s / 2 min / 1 h" (2.16): a time the screen prints, already rounded by the rules. */
export interface About {
  value: number;
  unit: 's' | 'min' | 'h';
}

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
  /** The reader would call now (8.2, D17). */
  call: boolean;
}

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
  /** When the new office's income passes the old (from advice), or null. */
  passesIn: About | null;
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

/**
 * The rewarded ads of 5.11: Check the Sofa, Call the Spin Doctor, Send a Courier, Open the Doors, and
 * the away report's +50 % (`awayBonus`, paid by the store: EngineMode.offlineAdMultiplier). None is
 * offered from the call to the end of election night (2.10): grants.ts `canWatchAd`.
 */
export type DecreeAdKind = 'checkSofa' | 'spinDoctor' | 'courier' | 'openDoors' | 'awayBonus';

/** The term's events (the call, the run-up, the count, the result, a new term, the move, ministers, ads). */
export type TermEvent =
  | { type: 'appointed'; minister: string }
  | { type: 'callElection' }
  | { type: 'runUpStarted'; byItself: boolean }
  | { type: 'countStarted' }
  | { type: 'envelope'; district: number; held: boolean }
  | { type: 'majority' }
  | { type: 'defeat' }
  | { type: 'termStarted'; term: number; office: OfficeIx; next: string | null }
  | { type: 'moved'; from: OfficeIx; to: OfficeIx }
  | { type: 'ad'; ad: DecreeAdKind };

/** The base effect a deck record carries (re-exported for the rules' signatures). */
export type { BaseEffect };
/** The office id of an index. */
export type { OfficeId };

// ================================================================================================
// rules-term (P1b): what only the time, term and wiring package needs, ADDED here (TypeScript
// declaration merging; nothing above is changed). Optional on the state, so freshDecree (P1a) needs
// no change: a state without them behaves as a fresh one.
// ================================================================================================

/**
 * The tick's cash anchor (2.5 "cash += I × dt exactly"): between two events cash is
 * `cash + I × (t − at)` from the last event, never a sum of frames, so tick(a + b) = tick(a) then
 * tick(b) bit for bit. `run`, `life` and `book` anchor the shared runEarnings and lifetimeEarnings and
 * the rules' book of the tick likewise.
 * Re-anchored at every event of the tick and whenever an action changed cash or I (tick.ts).
 */
export interface CashAnchor {
  at: number;
  cash: number;
  run: number;
  life: number;
  /** The rules' book of the tick's dibs (DecreeStats.book.tick). */
  book: number;
  I: number;
}

/** What the last count decided (2.10, D26), kept for the result sheet until the choice after it. */
export interface TermResult {
  won: boolean;
  /** Name Recognition this count added. */
  nrGained: number;
  /** D26: districts held without the disarray bonus, and whether that alone was a sweep. */
  meritHeld: number;
  meritSweep: boolean;
  /** D26: districts carried only by the opponents' disarray ("carried by your opponents' disarray"). */
  carried: number[];
  /** After a loss: the rival who won and resigned over a hobby (2.10), else null. */
  resigned: string | null;
}

export interface DecreeState {
  /** rules-term: the tick's cash anchor (null or missing: anchored at the next tick). */
  cashAnchor?: CashAnchor | null;
  /** rules-term: the last count's outcome (phase count and result), else null. */
  result?: TermResult | null;
  /** rules-term: application slots of this term already used (2.9: days 9, 30, 60), reset each term. */
  appSlotsUsed?: number;
  /** The day papers signed this term (the wire out-tray's stack, 4.3 and 5.1): 0 at a new term and a move. */
  signedThisTerm: number;
}

export interface ResultSheet {
  /** rules-term (D26): won or lost, the districts held on merit, those carried by disarray. */
  won: boolean;
  meritHeld: number;
  carried: number[];
}

export interface PollRow {
  /** rules-term (D25): clubs "in a huff" (moods 20 to 29) and what each costs this district, in hundredths of a share point (negative). */
  huffs: { club: ClubIx; cost: number }[];
  /** rules-lead (D31): clubs "won over" (moods above count.topAbove) and what of their mood this district does not count, in hundredths (negative). */
  wonOver: { club: ClubIx; cost: number }[];
}

export interface Poll {
  /** rules-term (D25): the clubs in a huff (moods from boycott.below to count.huffBelow − 1). */
  huffing: ClubIx[];
  /** rules-lead (D31): the clubs "won over" (moods above count.topAbove): "counts little more". */
  wonOver: ClubIx[];
}
