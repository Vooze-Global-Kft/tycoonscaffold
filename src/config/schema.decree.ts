/**
 * Config for decree mode (High Office, store title proposed "Proudly Adequate";
 * docs/design/office-design.md section 2, with the lead's decisions of section 11): the game data's
 * `decree` block. The shared schema (./schema.ts) keeps the block opaque; the decree engine mode
 * parses it with this schema when the decree entry installs it (src/engine/decreeMode.ts `config`),
 * so no other game's bundle carries it (a decree-mode file: scripts/lib/modes.js MODE_FOLDERS.decree).
 *
 * Every number the specification marks (tune) is a field here whose default is its starting value,
 * and its allowed range is in `RANGES` (plain JSON: the field path, low, high, section), which
 * scripts/content/build-office.py and the tests read: build-office.py moves a (tune) number only
 * inside its range. A number without (tune) is a rule: a field too, so the rules read every number
 * from one place, but it has no range and nothing tunes it.
 *
 * THE RUNTIME DECK (Decision D7) is `deck`: every text the engine draws or a screen prints (comic
 * papers, chains with their follow-ups and clippings, the forms' notes, grievances and picket
 * slogans, front pages, applications, campaign papers, rallies, scripted papers, template frames and
 * phrase lists, the lines of 7.7), each record with the fields of 2.7 that the engine or a screen
 * reads. It defaults to empty: the game data brings it (build-office.py maps the writers' authoring
 * files, scripts/content/office/*.json in the format of scripts/content/office/format.ts, onto it).
 * Names the specification leaves to the writers or the numbers engineer are marked PLACEHOLDER.
 *
 * Indexing: offices 0 mayor, 1 governor, 2 president; a club is named by its id here and by its
 * index g into `clubs` in the rules (0 bus, 1 shops, 2 veg, 3 brass, 4 anglers, 5 kites, 6 hedges);
 * an office's districts, mixes and ministries are in the office's row, mixes over the office's own
 * clubs in the order of `offices[o].clubs`.
 *
 * Written by the skeleton (spec 9.2 hour 0). TWO SECTIONS, each edited only by its owner
 * (docs/design/office-build-plan.md "The seam"):
 * - "the runtime deck (D7)" (DeckSchema and its record schemas, the effects of 2.7, the archetype
 *   table): P1a, the paper core, with the content desk's agreement on every field name (D7);
 * - everything else (the offices, clubs, ministries, money, forms, ministers, twists, the other
 *   values, RANGES, lintDecree): P1b.
 * Numbers: the defaults are the specification's starting values (with section 11's decisions). The
 * shipped game.json carries the tuned numbers (build-office.py writes them); these defaults never
 * import src/config/decree.content.ts, and the rules tests run on the fixtures' own frozen numbers
 * (src/engine/fixtures/decree.numbers.json), never on these defaults (lesson 4).
 */
import { z } from 'zod';
// The cross-field checks recompute two rules from the numbers with the rules' own ONE functions (2.11, 2.14):
// pure TypeScript of the decree mode's own folders, which never import this file at run time.
import { callDayOf, certainWinBound } from '../engine/decree/count';
import { compositionProblems } from '../engine/decree/twists';
import type { DecreeConfig } from '../engine/decree/types';

const id = z.string().regex(/^[a-z0-9_]+$/);
const pos = z.number().positive();
const nonneg = z.number().nonnegative();
const prob = z.number().min(0).max(1);
const int = z.number().int();
const text = (max: number) => z.string().min(1).max(max);

/** The seven hobby clubs (2.2); never four in one office. */
export const CLUB_IDS = ['bus', 'shops', 'veg', 'brass', 'anglers', 'kites', 'hedges'] as const;
export const ClubIdSchema = z.enum(CLUB_IDS);
export const OFFICE_IDS = ['mayor', 'governor', 'president'] as const;
export const OfficeIdSchema = z.enum(OFFICE_IDS);
/**
 * The archetypes of 2.2 (the writer picks one of the first seven) and the two that only follow-ups
 * use: `favour` (a Basket's follow-up, 2.2, 7.6) and `biggerStudy` (a Committee's follow-up, D20: "a
 * Committee at the next money tier with nothing after it").
 */
export const ARCHETYPE_IDS = ['project', 'swap', 'fee', 'treat', 'committee', 'vanity', 'basket', 'favour', 'biggerStudy'] as const;
export const ArchetypeIdSchema = z.enum(ARCHETYPE_IDS);
/** Archetypes no comic paper is written as (share 0; only follow-ups use them). */
export const FOLLOW_ONLY_ARCHETYPES = ['favour', 'biggerStudy'] as const;
const WrittenArchetype = ArchetypeIdSchema.exclude(FOLLOW_ONLY_ARCHETYPES);
/** The eight joke shapes of 7.4 (tags; the lint keeps each under 20 % of a deck). */
export const SHAPE_IDS = ['undercut', 'escalation', 'literalism', 'form-misapplied', 'statistic', 'slogan', 'photo-op', 'callback'] as const;
/** Who the joke is on (the authoring format's butt tags; never a club, never a group of real people). */
export const BUTT_IDS = ['self', 'office', 'staff', 'lobbyist', 'committee', 'visitor', 'rival', 'thing'] as const;
/** The closed subject list of 7.8. */
export const SUBJECT_IDS = ['ribbons', 'signage', 'statues', 'ducks', 'geese', 'picnic-weather', 'committees', 'vegetable-shows', 'clocks', 'potholes', 'hats', 'fountains', 'bandstands', 'gardens', 'buses', 'kites', 'hedges', 'harbours', 'inventions', 'ceremonies', 'portraits', 'paperwork', 'vanity'] as const;
const OfficeOrAny = z.enum(['mayor', 'governor', 'president', 'any']);

// ----------------------------------------------------------------------------- the effects of 2.7

/**
 * One BASE effect of an outcome (2.7: at most 4, from the closed set). Base values only: money and
 * moods are sized when the paper lands (2.7 "Sizing", D23), never here.
 * - money: `seconds` of B or `tier` S / M / L of the money tiers, times `sign` (−1 a cost, +1 a gain),
 *   or a `fixed` signed amount of dibs that is never sized (scripted papers only: Till's Teas' +60);
 * - mood: one club's base Δ; `club` is a club id, or 'petitioner' (the visitor's club; for a favour
 *   the club that pays), 'other' (the side the writer names), 'served' (a form's ministry's club) or
 *   'lowest' (the rally); `fixed` copies Δ unsized (a boycott settlement's +10, 2.8);
 * - every: every club of the office, one chip; gossip: `delta`, or `set` (the apology's "to 0");
 * - level: the form's ministry +1 level; appoint: the application's minister; endBoycott,
 *   endScandal; district: campaign points for the paper's district.
 */
export const BaseEffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('money'), seconds: z.number().optional(), tier: z.enum(['S', 'M', 'L']).optional(), sign: z.union([z.literal(1), z.literal(-1)]).default(-1), fixed: z.number().optional() }),
  z.object({ type: z.literal('mood'), club: z.union([ClubIdSchema, z.enum(['petitioner', 'other', 'served', 'lowest'])]), delta: int.min(-10).max(10), fixed: z.boolean().optional() }),
  z.object({ type: z.literal('every'), delta: int.min(-10).max(10) }),
  z.object({ type: z.literal('gossip'), delta: int.min(-10).max(10).optional(), set: int.min(0).optional() }),
  z.object({ type: z.literal('level') }),
  z.object({ type: z.literal('appoint') }),
  z.object({ type: z.literal('endBoycott') }),
  z.object({ type: z.literal('endScandal') }),
  z.object({ type: z.literal('district'), points: int.min(0).max(20) }),
]);
const Effects = z.array(BaseEffectSchema).max(4);

// ----------------------------------------------------------------------------- the offices of 2.2

/** A hobby club (2.2): icon and the short name papers print. */
export const ClubSchema = z.object({
  id: ClubIdSchema,
  name: text(40),
  /** The short name on papers ("Bus", "Vegetables"). */
  short: text(14),
  /** The art kit's icon name ("art:club_bus"). */
  icon: z.string(),
  /** Two-tone pattern name (4.6; never colour alone). */
  pattern: z.string(),
});

/** A district of an office: its name, its short label on chips ("HT") and its mix w_{d,g} in hundredths over the office's clubs. */
export const DistrictSchema = z.object({ id, name: text(28), short: text(3), mix: z.array(int.min(0).max(100)) });

/** A ministry of an office (2.2): the club it serves (none for ministry 0). */
export const MinistrySchema = z.object({ id, name: text(28), club: ClubIdSchema.nullable() });

/** A rival (7.3): an individual with a hobby and a slogan, never a party or colour. */
export const RivalSchema = z.object({ id, name: text(40), slogan: text(32), hobby: text(40), backAgain: text(90), resignation: text(120) });

/** One row of the offices table of 2.2. */
export const OfficeSchema = z.object({
  id: OfficeIdSchema,
  /** "Mayor", "Governor", "President" (never "Mr President"). */
  title: text(12),
  place: text(40),
  newspaper: text(40),
  /** "ward", "county", "province" (the district word on the poll). */
  districtWord: text(12),
  /** The clubs present, in rules order (an office's g indexes this list; never 4). */
  clubs: z.array(ClubIdSchema).refine((c) => c.length !== 4, 'never 4 clubs'),
  districts: z.array(DistrictSchema).min(1),
  /** Districts needed to win (2.2). */
  majority: int.positive(),
  ministries: z.array(MinistrySchema).min(1),
  /** Arrival interval τ, s of play (tune 10 to 18). */
  tau: pos,
  /** Term D in days (tune ±20 %). */
  termDays: int.positive(),
  /** Call from C = callFraction × D (tune 0.5 to 0.7). */
  callFraction: prob,
  /** Campaign papers K before the rally (rule). */
  campaignPapers: int.positive(),
  /** Gossip limit G_max (rule). */
  gossipMax: int.positive(),
  /** Rival's pull R in share points (tune 3 to 12). */
  rivalPull: nonneg,
  /** Scale S of the office's ministries (tune ×0.3 to ×3). */
  scale: pos,
  /** What standing for this office needs (null for the first): Name Recognition and the record of the office below (tune ±30 % each). */
  stand: z.object({ nr: nonneg, record: int.positive() }).nullable(),
  /** The name of this office's record when it is what the next office needs ("Town Record"). */
  recordName: text(20).nullable(),
  /** Weight O of a win (rule). */
  winWeight: int.positive(),
  /** A requisition every n-th draw (tune ±2). */
  requisitionEvery: int.positive(),
  /** Template share q (tune 0 to 0.25). */
  templateShare: prob,
  /** The rivals in order (lists of 3, 3, 12; 2.10). */
  rivals: z.array(RivalSchema).min(1),
});

/** The ministries' numbers (2.2), one table for every office. */
const MinistryNumbers = z.object({
  /** v_i = S × valueStep^i (tune 6 to 10). */
  valueStep: pos.default(8),
  /** O_0 = 0, O_i = S × openBase × openRatio^(i−1) (openBase rule 150; openRatio tune 13 to 30). */
  openBase: pos.default(150),
  openRatio: pos.default(16),
  /** Level L → L+1 costs levelCostFactor × v_i × levelGrowth^(L−1) (factor rule 15; growth tune 1.15 to 1.30). */
  levelCostFactor: pos.default(15),
  levelGrowth: pos.default(1.25),
  /** A storey every n levels doubles the rate (rule 12); the level cap (rule 96 = 8 storeys). */
  storeyEvery: int.positive().default(12),
  levelCap: int.positive().default(96),
});

/** Grand Projects (2.2): project j continues the president's ladder as ministry 7 + j (no club). */
export const GrandProjectSchema = z.object({ id, name: text(32), atTerm: int.positive(), /** Its line (writer 5; empty until written). */ text: z.string().default('') });

/** One row of the archetype table of 2.2 (each base Δ tune ±1; shares tune). */
export const ArchetypeSchema = z.object({
  id: ArchetypeIdSchema,
  /** Share of the comic draw (2.7; tune ±0.05 each, summing to 1; 0 for favour and biggerStudy, which only follow-ups use). */
  share: prob,
  trap: z.boolean().default(false),
  sign: Effects,
  refuse: Effects,
});

const pe = (club: 'petitioner' | 'other', delta: number) => ({ type: 'mood' as const, club, delta });
const ARCHETYPES_DEFAULT: z.input<typeof ArchetypeSchema>[] = [
  { id: 'project', share: 0.24, sign: [{ type: 'money', tier: 'S', sign: -1 }, pe('petitioner', 4), pe('other', -3)], refuse: [pe('petitioner', -3), pe('other', 2)] },
  { id: 'swap', share: 0.2, sign: [pe('petitioner', 4), pe('other', -4)], refuse: [pe('petitioner', -4), pe('other', 4)] },
  { id: 'fee', share: 0.14, sign: [{ type: 'money', tier: 'M', sign: 1 }, pe('petitioner', 2), pe('other', -4)], refuse: [pe('petitioner', -1), pe('other', 1)] },
  { id: 'treat', share: 0.12, sign: [pe('petitioner', 3), pe('other', -1), { type: 'gossip', delta: 1 }], refuse: [pe('petitioner', -2)] },
  { id: 'committee', share: 0.15, sign: [{ type: 'money', tier: 'S', sign: -1 }, pe('petitioner', 1), pe('other', -2)], refuse: [pe('petitioner', -2), pe('other', 1)] },
  { id: 'vanity', share: 0.08, trap: true, sign: [{ type: 'money', tier: 'L', sign: -1 }, { type: 'every', delta: -1 }], refuse: [] },
  { id: 'basket', share: 0.07, trap: true, sign: [{ type: 'gossip', delta: 2 }], refuse: [] },
  // 2.2: the favour costs on the sign side "a club −3 · gossip +1": the club that pays is the follow-up's own `club` (its petitioner), as both formats say.
  { id: 'favour', share: 0, trap: false, sign: [pe('petitioner', -3), { type: 'gossip', delta: 1 }], refuse: [] },
  // D20: a Committee at the next money tier (S → M), with nothing after it.
  { id: 'biggerStudy', share: 0, trap: false, sign: [{ type: 'money', tier: 'M', sign: -1 }, pe('petitioner', 1), pe('other', -2)], refuse: [pe('petitioner', -2), pe('other', 1)] },
];

// ----------------------------------------------------------------------------- ministers and twists

/**
 * The parameter a minister's desk rule or a twist's factor acts on (2.9, 2.14, 7.3). `mix`: a
 * club's weight in every district (+add, the others scaled down); the rest multiply (`mul`) or add
 * (`add`). Read by twists.ts and ministers.ts, which produce the one Factors object size.ts consumes.
 * "Say nothing" has two targets: `sayNothing.cut` multiplies the CUT (1 − sayNothingFactor: ×0.6 turns
 * I × 0.8 into I × 0.88, milder) and `sayNothing.papers` the papers it runs (10; rounded, at least 1).
 * D37: A Gentle Week (×0.6) and Osric Tamp (×0.7) shorten its LENGTH (`sayNothing.papers`: 6, 7, 4 with both).
 */
export const FACTOR_TARGETS = ['mix', 'committee.share', 'gossipMax', 'ribbon.money', 'ribbon.mood', 'fee.money', 'tau', 'sayNothing.cut', 'sayNothing.papers', 'settlement.money', 'requisition.money', 'campaign.money', 'quietDecay'] as const;
export const FactorTargetSchema = z.enum(FACTOR_TARGETS);
/** One factor: on `target`, for one club's papers or ministry (null: all), × mul then + add. */
export const FactorSchema = z.object({ target: FactorTargetSchema, club: ClubIdSchema.nullable().default(null), mul: pos.default(1), add: z.number().default(0) });

/** A minister (2.9, 7.3): applies in a fixed order, runs their club's ministry in every office, brings one desk rule. */
export const MinisterSchema = z.object({
  id,
  name: text(24),
  /** Initials printed on every paper the rule touches ("DP ×0.9"). */
  initials: text(3),
  club: ClubIdSchema,
  /** The office whose applications bring this minister (three apply in each office). */
  office: OfficeIdSchema,
  rule: FactorSchema,
});

/**
 * A twist (2.14): one or two factors (Ribbon Shortage: "ribbons cost AND please ×2"), told on the
 * result sheet. The validator's composition check (twists.ts `compositionProblems`) reads every factor.
 */
export const TwistSchema = z.object({ id, name: text(28), factors: z.array(FactorSchema).min(1).max(2), /** Its result-sheet line (writer 5; empty until written). */ text: z.string().default('') });

/** Every k-combination of 0..n−1 in lexicographic order (the default fixed orders of pairs and triples). */
export function combinations(n: number, k: number): number[][] {
  const out: number[][] = [];
  const go = (start: number, acc: number[]) => {
    if (acc.length === k) return void out.push(acc.slice());
    for (let i = start; i < n; i++) go(i + 1, [...acc, i]);
  };
  go(0, []);
  return out;
}

const T = (id: string, name: string, ...factors: z.input<typeof FactorSchema>[]) => ({ id, name, factors });
const TWISTS_DEFAULT = [
  T('bandstand_summer', 'Bandstand Summer', { target: 'mix', club: 'brass', add: 0.1 }),
  T('committee_week', 'Committee Week', { target: 'committee.share', mul: 2 }),
  T('quiet_press', 'Quiet Press', { target: 'gossipMax', add: 2 }),
  T('ribbon_shortage', 'Ribbon Shortage', { target: 'ribbon.money', mul: 2 }, { target: 'ribbon.mood', mul: 2 }),
  T('kite_weather', 'Kite Weather', { target: 'mix', club: 'kites', add: 0.1 }),
  T('market_fortnight', 'Market Fortnight', { target: 'fee.money', mul: 1.5 }),
  T('early_doors', 'Early Doors', { target: 'tau', mul: 0.8 }),
  T('hedge_inspection', 'Hedge Inspection', { target: 'mix', club: 'hedges', add: 0.1 }),
  // PLACEHOLDER (sent to the lead, requests.md): 2.14 "Say nothing ×0.6" read as the milder cut (I × 0.88), not I × 0.48.
  T('gentle_week', 'A Gentle Week', { target: 'sayNothing.papers', mul: 0.6 }),
  T('grievance_amnesty', 'Grievance Amnesty', { target: 'settlement.money', mul: 0.5 }),
];

// ----------------------------------------------------------------------------- the runtime deck (D7)
// SECTION P1a (the paper core), with the content desk's agreement on every field name.
//
// Names follow the content desk's authoring format (scripts/content/office/format.ts, D7: whoever
// finishes second keeps the other's names): the section names (papers, scripted, chains, notes,
// applications, grievances, frontPages, apologies, runUp, rallies, frames, lists, night, returning,
// away, monuments, captions), `club` for the petitioner (the cell a paper fills), `other`, `setsUp`,
// `afterSign` / `afterRefuse`, `frame`, `phrases`, the tag names and values. What differs is what the
// runtime needs resolved: a `visitor` here is the person as printed (face, name, role, club), where
// the authoring file holds a cast id of names.json; a scripted paper carries its effects (the rules'
// of 3.1 and 7.5, which build-office.py writes; a writer never types them). Rivals, places, Grand
// Project and twist lines go into the tables above (offices[o].rivals, districts, grandProjects, twists).

/** Deck ids: the authoring format's (lower-case words joined by hyphens; a follow-up is `<chain>.sign`). */
const deckId = z.string().regex(/^[a-z0-9]+([._-][a-z0-9]+)*$/);
/** Who lays the paper on the desk (2.7): a face of the art kit, a name ≤ 24, a role ≤ 28, a club or none. */
export const VisitorSchema = z.object({ face: z.string(), name: text(24), role: text(28), club: ClubIdSchema.nullable() });
/** Tags every hand-written paper carries (7.4, 7.8; the lint checks the values). */
const Tags = { subject: z.enum(SUBJECT_IDS), butt: z.enum(BUTT_IDS), shape: z.enum(SHAPE_IDS) };

/**
 * A Basket's own favour (2.2 "↩ favour", D20): what the lobbyist asks after the basket was accepted,
 * and the two clippings that end it. Everything else is the basket's: the visitor, the co-signer, the
 * club (the one that pays: the favour's petitioner), the tags; its archetype is `favour`; its delay
 * `followUps.favourDelay`.
 */
export const OwnFavourSchema = z.object({ text: text(90), clippings: z.object({ sign: text(90), refuse: text(90) }) });

/**
 * A comic paper (2.7, 7.7): the writer picks the visitor, the club, the archetype and the other side;
 * numbers come from the archetype. D20: every Committee carries its `biggerStudy` and every Basket its
 * `favour` (lintDecree), unless it sets up a chain of 7.6. The bigger study inherits the paper's
 * visitor, co-signer, club, other and tags; its archetype is `biggerStudy`, its delay
 * `followUps.biggerStudyDelay`, and nothing comes after it (no clipping).
 */
export const ComicPaperSchema = z.object({
  id: deckId,
  office: OfficeOrAny,
  /** No office word: lower offices' portable texts are drawn by higher offices too (2.7). */
  portable: z.boolean().default(false),
  visitor: VisitorSchema,
  /** A co-signer beside the visitor ("with Ambrose Minute"). */
  cosigner: VisitorSchema.optional(),
  /** The petitioner club: the visitor's side, and the (club, archetype) cell the paper fills (a basket's too). */
  club: ClubIdSchema,
  /** The other side's club (7.2): required for project, swap, fee, treat, committee. */
  other: ClubIdSchema.nullable().default(null),
  archetype: WrittenArchetype,
  text: text(90),
  ...Tags,
  /** The chain (`chains[].id`) this paper sets up (7.6). */
  setsUp: deckId.optional(),
  /** A Committee's own "↩ bigger study" (D20): its text. */
  biggerStudy: text(90).optional(),
  /** A Basket's own "↩ favour" (D20). */
  favour: OwnFavourSchema.optional(),
});

/** One branch of a chain (7.6): the follow-up paper and the two clippings that end it. */
export const FollowUpPaperSchema = z.object({
  visitor: VisitorSchema,
  cosigner: VisitorSchema.optional(),
  /** The petitioner club; for the favour, the club that pays (7.6: "a club −3"). */
  club: ClubIdSchema,
  other: ClubIdSchema.nullable().default(null),
  archetype: ArchetypeIdSchema,
  text: text(90),
  ...Tags,
  /** Delay in decided papers, drawn in [from, to] at the set-up's draw (site followDelay). */
  delay: z.tuple([int.positive(), int.positive()]),
  /** The clipping each choice ends the chain in (a headline, 5.9). */
  clippings: z.object({ sign: text(90), refuse: text(90) }),
});
/**
 * A chain (7.6): set up by the paper whose `setsUp` names it; one follow-up per branch. Comic chains
 * have both; a scripted paper's chain may have one (3.1: paper 1 comes back after a sign, paper 2's
 * "another copy" after a study), so the branches are optional here.
 */
export const ChainSchema = z
  .object({ id: deckId, office: OfficeOrAny.default('any'), title: z.string().default(''), afterSign: FollowUpPaperSchema.optional(), afterRefuse: FollowUpPaperSchema.optional() })
  .refine((c) => c.afterSign || c.afterRefuse, 'a chain needs at least one follow-up');

/** A Clerk's note on a form (7.5 paper 8; 7.7: on half the forms). */
export const FormNoteSchema = z.object({ id: deckId, form: z.enum(['requisition', 'ribbon', 'any']), ministry: z.string().optional(), office: OfficeOrAny.default('any'), text: text(90) });
/** A boycott's grievance and picket slogan (2.8: 14, 2 per club). */
export const GrievanceSchema = z.object({ id: deckId, club: ClubIdSchema, visitor: VisitorSchema, text: text(90), signLabel: text(28), refuseLabel: text(28), picket: text(24), ...Tags });
/** A scandal's front page (2.8; 20): headline and one dry line as one text; `paper` names the newspaper (default the office's). */
export const FrontPageSchema = z.object({ id: deckId, office: OfficeOrAny.default('any'), paper: z.string().optional(), text: text(90), ...Tags });
/** A sign label for a scandal ("Apologise on the steps"; 3); the refuse label is always "Say nothing". */
export const ApologySchema = z.object({ id: deckId, text: text(28) });
/** A minister's application and the line they return with after a refusal (2.9; 9 and 9). `minister` is an id of `ministers`. */
export const ApplicationSchema = z.object({ id: deckId, minister: id, visitor: VisitorSchema, text: text(90), returnText: text(90) });
/** A run-up paper (2.10; 10 / 16 / 24): a public appearance naming {district} exactly once, never a vote. */
export const RunUpSchema = z.object({ id: deckId, office: OfficeIdSchema, visitor: VisitorSchema, text: text(90), ...Tags });
/** A rally (2.10; 12): the last campaign paper. */
export const RallySchema = z.object({ id: deckId, office: OfficeIdSchema, visitor: VisitorSchema, text: text(90), ...Tags });
/**
 * A scripted paper (2.7 step 2; 6): the first four of a game (mayor, slots 1 to 4) and the first of
 * each higher office (slot 1), with their effects written out (3.1, 7.5).
 */
export const ScriptedPaperSchema = z.object({
  id: deckId,
  office: OfficeIdSchema.default('mayor'),
  slot: int.min(1).max(4),
  visitor: VisitorSchema,
  cosigner: VisitorSchema.optional(),
  club: ClubIdSchema.nullable().default(null),
  other: ClubIdSchema.nullable().default(null),
  archetype: ArchetypeIdSchema.nullable().default(null),
  text: text(90),
  sign: Effects,
  refuse: Effects,
  setsUp: deckId.optional(),
});
/** A template frame (2.7 step 5): a comic paper with ONE slot `{list-id}` filled from a phrase list. */
export const FrameSchema = z.object({ id: deckId, office: OfficeOrAny.default('any'), visitor: VisitorSchema.optional(), club: ClubIdSchema, other: ClubIdSchema.nullable().default(null), archetype: WrittenArchetype, frame: text(90), ...Tags, /** As a comic paper's (D20). */ biggerStudy: text(90).optional(), favour: OwnFavourSchema.optional() });
/** A phrase list (7.7: 10 lists of 24); phrase ids are `<list>.<index>`, 1-based. */
export const PhraseListSchema = z.object({ id: deckId, title: z.string().default(''), phrases: z.array(text(60)).min(1) });
/** A plain line with an id (returning-visitor, away, captions). */
export const LineSchema = z.object({ id: deckId, text: text(120) });
/** An election-night line (30): when it is said. */
/** An election-night line (4.4); `rival`: the rival id whose result line it is (writer 5's 18 rival lines), null for every rival. */
export const NightLineSchema = z.object({ id: deckId, moment: z.enum(['open', 'held', 'lost', 'majority', 'defeat', 'any']), text: text(90), rival: z.string().nullable().default(null) });
/** A monument of the vanity shelf (5.8; 24): its name and one line. */
export const MonumentSchema = z.object({ id: deckId, name: text(40), text: text(90) });

export const DeckSchema = z.object({
  papers: z.array(ComicPaperSchema).default([]),
  scripted: z.array(ScriptedPaperSchema).default([]),
  chains: z.array(ChainSchema).default([]),
  notes: z.array(FormNoteSchema).default([]),
  applications: z.array(ApplicationSchema).default([]),
  grievances: z.array(GrievanceSchema).default([]),
  frontPages: z.array(FrontPageSchema).default([]),
  apologies: z.array(ApologySchema).default([]),
  runUp: z.array(RunUpSchema).default([]),
  rallies: z.array(RallySchema).default([]),
  frames: z.array(FrameSchema).default([]),
  lists: z.array(PhraseListSchema).default([]),
  /** 30 election-night lines (Agatha Tallow). */
  night: z.array(NightLineSchema).default([]),
  /** 60 returning-visitor last lines (2.7 "with no unseen text left"). */
  returning: z.array(LineSchema).default([]),
  /** 10 away-report lines. */
  away: z.array(LineSchema).default([]),
  /** 6 loading-card captions (3.1). */
  captions: z.array(LineSchema).default([]),
  monuments: z.array(MonumentSchema).default([]),
});

// ----------------------------------------------------------------------------- the defaults of 2.2
// SECTION P1b from here to the end (the tables, the other values, RANGES, lintDecree).

const RIVAL_PLACEHOLDER = (office: string, n: number) => ({ id: `${office}_rival_${n}`, name: `Rival ${n} (PLACEHOLDER)`, slogan: 'PLACEHOLDER slogan', hobby: 'PLACEHOLDER hobby', backAgain: 'PLACEHOLDER: back for another go.', resignation: 'PLACEHOLDER: resigned to spend more time with a hobby.' });
const district = (idv: string, name: string, short: string, mix: number[]) => ({ id: idv, name, short, mix });

const OFFICES_DEFAULT: z.input<typeof OfficeSchema>[] = [
  {
    id: 'mayor',
    title: 'Mayor',
    place: 'Dithering-on-the-Dawdle',
    newspaper: 'the Dithering Daily Drizzle',
    districtWord: 'ward',
    clubs: ['bus', 'shops', 'veg'],
    // The mayor's wards as given (2.2): Bus / Shops / Vegetables.
    districts: [district('market', 'Market Ward', 'MW', [20, 60, 20]), district('mill', 'Mill Ward', 'ML', [55, 25, 20]), district('hilltop', 'Hilltop', 'HT', [20, 20, 60]), district('riverside', 'Riverside', 'RS', [45, 15, 40]), district('oldtown', 'Old Town', 'OT', [30, 40, 30])],
    majority: 3,
    ministries: [
      { id: 'town_clock', name: 'Town Clock Office', club: null },
      { id: 'potholes', name: 'Potholes Office', club: 'bus' },
      { id: 'benches', name: 'Benches & Bandstands', club: 'veg' },
      { id: 'signposts', name: 'Signposts & Lampposts', club: 'shops' },
    ],
    tau: 12,
    termDays: 80,
    callFraction: 0.6,
    campaignPapers: 3,
    gossipMax: 5,
    // D15: the rival's pull starts at 3 / 4 / 5 (range 3 to 12).
    rivalPull: 3,
    scale: 1,
    stand: null,
    recordName: 'Town Record',
    winWeight: 1,
    requisitionEvery: 10,
    // D19: the mayor's template share q is 0.25 (was 0).
    templateShare: 0.25,
    // D14 and the register (scripts/content/office/names.json): Prudence Plumb is Prudence Stitchley; her lines are writer 5's (these follow 2.10's examples).
    rivals: [{ id: 'stitchley', name: 'Councillor Prudence Stitchley', slogan: 'Stitchley: She Owns A Hat', hobby: 'her hat', backAgain: 'Councillor Stitchley is back for another go, in the same hat.', resignation: 'Councillor Stitchley won, then resigned to spend more time with her hat.' }, RIVAL_PLACEHOLDER('mayor', 2), RIVAL_PLACEHOLDER('mayor', 3)],
  },
  {
    id: 'governor',
    title: 'Governor',
    place: 'Province of Upper Wobbling',
    newspaper: 'the Upper Wobbling Evening Fuss',
    districtWord: 'county',
    clubs: ['bus', 'shops', 'veg', 'brass', 'anglers'],
    // The county names are writer 2's (7.1, registered in names.json); PLACEHOLDER: the mixes are the numbers engineer's; these follow
    // the rule of 2.2 (hundredths summing to 100, every club strongest in at least one county and in no more than half).
    districts: [
      district('county_a', 'Waitwell', 'WW', [40, 20, 15, 15, 10]),
      district('county_b', 'Gleamford', 'GF', [15, 40, 15, 10, 20]),
      district('county_c', 'Cloche End', 'CE', [15, 15, 40, 20, 10]),
      district('county_d', 'Bandwick', 'BW', [10, 15, 20, 40, 15]),
      district('county_e', 'Dawdlemouth', 'DM', [20, 10, 10, 15, 45]),
      district('county_f', 'Clatterby', 'CY', [35, 15, 10, 30, 10]),
      district('county_g', 'Hampering', 'HP', [10, 35, 30, 10, 15]),
    ],
    majority: 4,
    ministries: [
      { id: 'prov_clock', name: 'Provincial Clock Office', club: null },
      { id: 'bus_shelter', name: 'Bus Shelter Trust', club: 'bus' },
      { id: 'market_weights', name: 'Market Weights Board', club: 'shops' },
      { id: 'glasshouse', name: 'Glasshouse Office', club: 'veg' },
      { id: 'bandstand_board', name: 'Bandstand Board', club: 'brass' },
      { id: 'canals', name: 'Canals & Jetties', club: 'anglers' },
    ],
    tau: 12,
    termDays: 110,
    callFraction: 0.6,
    campaignPapers: 4,
    gossipMax: 6,
    rivalPull: 4,
    scale: 1000,
    stand: { nr: 10, record: 80 },
    recordName: 'Province Record',
    winWeight: 2,
    requisitionEvery: 8,
    templateShare: 0.15,
    // The register renamed Barnaby Waft to Leander Waft.
    rivals: [{ id: 'waft', name: 'Leander Waft', slogan: 'Waft: Gently Onwards', hobby: 'the Ceremonial Spoon', backAgain: 'Leander Waft is back for another go, spoon polished.', resignation: 'Leander Waft won, then resigned to spend more time with his spoon.' }, RIVAL_PLACEHOLDER('governor', 2), RIVAL_PLACEHOLDER('governor', 3)],
  },
  {
    id: 'president',
    title: 'President',
    place: 'the Republic',
    newspaper: 'the Middling Morning Murmur',
    districtWord: 'province',
    clubs: ['bus', 'shops', 'veg', 'brass', 'anglers', 'kites', 'hedges'],
    // The provinces as named in 7.1; PLACEHOLDER mixes (the numbers engineer's), by the rule of 2.2.
    districts: [
      district('middlingham', 'Middlingham', 'MI', [30, 10, 10, 10, 15, 15, 10]),
      district('fogmoor', 'Fogmoor', 'FO', [10, 30, 15, 10, 10, 10, 15]),
      district('brassby', 'Brassby', 'BR', [10, 10, 30, 15, 15, 10, 10]),
      district('teacup_downs', 'Teacup Downs', 'TD', [15, 10, 10, 30, 10, 15, 10]),
      district('gusting_heights', 'Gusting Heights', 'GH', [10, 15, 10, 10, 30, 10, 15]),
      district('muchpuddle', 'Muchpuddle', 'MP', [10, 10, 15, 10, 10, 30, 15]),
      district('saltpenny_bay', 'Saltpenny Bay', 'SB', [10, 15, 10, 15, 10, 10, 30]),
      // The register renamed Kitewell to Kitecombe (KC).
      district('kitecombe', 'Kitecombe', 'KC', [25, 10, 20, 10, 15, 10, 10]),
      district('upper_wobbling', 'Upper Wobbling', 'UW', [10, 20, 10, 25, 10, 15, 10]),
    ],
    majority: 5,
    ministries: [
      { id: 'nat_clock', name: 'National Clock Office', club: null },
      { id: 'motorway', name: 'Motorway Board', club: 'bus' },
      { id: 'lamplight', name: 'Lamplight Authority', club: 'shops' },
      { id: 'parks', name: 'Parks & Benches', club: 'veg' },
      { id: 'brass_bunting', name: 'Office of Brass & Bunting', club: 'brass' },
      { id: 'harbour', name: 'Harbour Board', club: 'anglers' },
      { id: 'kite_breeze', name: 'Kite & Breeze Office', club: 'kites' },
      { id: 'hedgerow', name: 'Hedgerow Bureau', club: 'hedges' },
    ],
    tau: 15,
    termDays: 120,
    callFraction: 0.6,
    campaignPapers: 5,
    gossipMax: 7,
    rivalPull: 5,
    scale: 1_000_000,
    stand: { nr: 50, record: 170 },
    recordName: null,
    winWeight: 3,
    requisitionEvery: 4,
    templateShare: 0.2,
    rivals: [
      // D14 and the register: Ignatius Crumb is Professor Ozias Kalends; his lines are writer 5's.
      { id: 'kalends', name: 'Professor Ozias Kalends', slogan: 'Kalends: Abolish Wednesdays', hobby: 'Wednesdays', backAgain: 'Professor Kalends is back for another go, still against Wednesdays.', resignation: 'Professor Kalends won, then resigned to spend more time with his Tuesdays.' },
      { id: 'strop', name: 'Ottoline Strop', slogan: 'Strop: Firmly Seated', hobby: 'her chair', backAgain: 'Ottoline Strop is back for another go, chair and all.', resignation: 'Ottoline Strop won, then resigned to spend more time with her chair.' },
      ...Array.from({ length: 10 }, (_, i) => RIVAL_PLACEHOLDER('president', i + 3)),
    ],
  },
];

const CLUBS_DEFAULT: z.input<typeof ClubSchema>[] = [
  { id: 'bus', name: "Bus Spotters' Society", short: 'Bus', icon: 'art:club_bus', pattern: 'terracotta' },
  { id: 'shops', name: 'Shop Window Guild', short: 'Shops', icon: 'art:club_shops', pattern: 'sage' },
  { id: 'veg', name: 'Giant Vegetable Society', short: 'Vegetables', icon: 'art:club_veg', pattern: 'slate_blue' },
  { id: 'brass', name: 'Brass Band Guild', short: 'Brass', icon: 'art:club_brass', pattern: 'copper' },
  { id: 'anglers', name: "Anglers' Circle", short: 'Anglers', icon: 'art:club_anglers', pattern: 'plum' },
  { id: 'kites', name: "Kite Flyers' League", short: 'Kites', icon: 'art:club_kites', pattern: 'ochre' },
  { id: 'hedges', name: 'Tidy Hedge Committee', short: 'Hedges', icon: 'art:club_hedges', pattern: 'dove_grey' },
];

const M = (idv: string, name: string, initials: string, club: (typeof CLUB_IDS)[number], office: (typeof OFFICE_IDS)[number], rule: z.input<typeof FactorSchema>) => ({ id: idv, name, initials, club, office, rule });
/** 7.3, in the order they apply (three in each office); names as the register has them (ids kept, never shown). */
const MINISTERS_DEFAULT = [
  M('pockle', 'Dorothy Sett', 'DS', 'bus', 'mayor', { target: 'requisition.money', club: 'bus', mul: 0.9 }),
  M('pellow', 'Dorrit Pellow', 'DP', 'veg', 'mayor', { target: 'settlement.money', club: 'veg', mul: 0.5 }),
  M('ferrule', 'Basil Ferrule', 'BF', 'shops', 'mayor', { target: 'fee.money', club: 'shops', mul: 1.2 }),
  M('hush', 'Wendeline Hush', 'WH', 'shops', 'governor', { target: 'quietDecay', mul: 0.75 }),
  M('bole', 'Henrietta Bole', 'HB', 'brass', 'governor', { target: 'ribbon.mood', club: 'brass', add: 1 }),
  M('gusset', 'Percy Plummet', 'PP', 'anglers', 'governor', { target: 'campaign.money', mul: 0.67 }),
  M('wren', 'Marjorie Wren', 'MW', 'kites', 'president', { target: 'fee.money', club: 'kites', mul: 1.2 }),
  // PLACEHOLDER (sent to the lead, as A Gentle Week): ×0.7 on the cut of "Say nothing" (I × 0.86).
  M('tamp', 'Osric Tamp', 'OT', 'hedges', 'president', { target: 'sayNothing.papers', mul: 0.7 }),
  M('nibley', 'Florence Mayfly', 'FM', 'anglers', 'president', { target: 'requisition.money', club: 'anglers', mul: 0.9 }),
];

// ----------------------------------------------------------------------------- the block

/** The block as written in game.json (the input); `DecreeSchema` below derives the thresholds that hang on the boycott's (D38). */
export const DecreeObject = z.object({
  clubs: z.array(ClubSchema).length(7).prefault(CLUBS_DEFAULT as never),
  offices: z.array(OfficeSchema).length(3).prefault(OFFICES_DEFAULT as never),
  ministry: MinistryNumbers.prefault({}),
  grandProjects: z
    .array(GrandProjectSchema)
    .prefault([
      { id: 'long_bridge', name: 'The Very Long Bridge', atTerm: 2 },
      { id: 'ribbon_mill', name: 'The National Ribbon Mill', atTerm: 4 },
      { id: 'umbrella', name: 'The National Umbrella', atTerm: 6 },
      { id: 'tallest_bandstand', name: 'The Tallest Bandstand', atTerm: 8 },
      { id: 'ministry_of_ministries', name: 'The Ministry of Ministries', atTerm: 10 },
    ]),
  /** Money tiers in seconds of B, sized when the paper lands (D23; tune ×0.5 to ×2 each), × a jitter j drawn at the draw (rule 0.85 to 1.15); minimum 5 dibs. */
  money: z
    .object({
      S: pos.default(15),
      M: pos.default(30),
      L: pos.default(60),
      jitterLow: pos.default(0.85),
      jitterHigh: pos.default(1.15),
      minimum: nonneg.default(5),
      /** roundDibs (merge M19): below `roundBelow` half up to a whole dib, from it `sigDigits` significant figures. */
      roundBelow: pos.default(1000),
      sigDigits: int.positive().default(3),
    })
    .prefault({}),
  archetypes: z.array(ArchetypeSchema).length(ARCHETYPE_IDS.length).prefault(ARCHETYPES_DEFAULT as never),
  /** Routine papers (2.2, 2.8, 2.10): their numbers. Money in seconds of B unless noted. */
  forms: z
    .object({
      requisition: z.object({ clubGain: int.default(1), clubLoss: int.default(-1) }).prefault({}),
      // D21: at a ministry that serves no club (ministry 0, the Grand Projects) the sign pleases every club by `everyGain`, at the same price; its refuse is "No change".
      ribbon: z.object({ cost: z.enum(['S', 'M', 'L']).default('S'), clubGain: int.default(3), clubLoss: int.default(-1), everyGain: int.default(1) }).prefault({}),
      application: z.object({ clubGain: int.default(1), returnAfter: int.positive().default(30), days: z.array(int.positive()).default([9, 30, 60]) }).prefault({}),
      // The club's +10 is FIXED (an unsized mood effect, BaseEffect mood `fixed`, 2.8 and the lemma of 2.7).
      settlement: z.object({ seconds: pos.default(20), clubFixed: int.default(10) }).prefault({}),
      apology: z.object({ every: int.default(-3) }).prefault({}),
      campaign: z.object({ seconds: pos.default(45), points: int.positive().default(4), within: pos.default(6) }).prefault({}),
      rally: z.object({ seconds: pos.default(60), clubGain: int.default(4) }).prefault({}),
    })
    .prefault({}),
  ministers: z.array(MinisterSchema).length(9).prefault(MINISTERS_DEFAULT as never),
  twists: z
    .object({
      list: z.array(TwistSchema).length(10).prefault(TWISTS_DEFAULT as never),
      /** One new thing per term (2.14): the mayor's terms 2 to 4, the governor's 2 to 5 (then repeating). */
      mayor: z.array(id).default(['committee_week', 'market_fortnight', 'quiet_press']),
      governor: z.array(id).default(['bandstand_summer', 'ribbon_shortage', 'gentle_week', 'early_doors']),
      /** The president's singles at terms 3, 5, 7, 9, 11 to 16, then the pairs (terms 17 to 61) and triples (62 to 181), by index into `list`. */
      presidentSingles: z.array(id).default(TWISTS_DEFAULT.map((t) => t.id)),
      singleTerms: z.array(int.positive()).default([3, 5, 7, 9, 11, 12, 13, 14, 15, 16]),
      pairs: z.array(z.tuple([int.min(0), int.min(0)])).default(combinations(10, 2) as never),
      triples: z.array(z.tuple([int.min(0), int.min(0), int.min(0)])).default(combinations(10, 3) as never),
      pairsFrom: int.positive().default(17),
      triplesFrom: int.positive().default(62),
      /** The 45 pairs' names, by pair index (writer 5's `twistPairs`; empty until written). */
      pairNames: z.array(z.string()).default([]),
      /** From this term on, "A Quiet Term", honestly labelled. */
      quietFrom: int.positive().default(182),
    })
    .prefault({}),
  /** Approval and its multiplier (2.4): M(A) = 1 + slope × (A − 50)/100, so ×1.0 at 50 whatever the slope (slope tune 0.8 to 1.4; 1.2 gives 0.4 + 1.2 × A/100). */
  approval: z.object({ slope: pos.default(1.2) }).prefault({}),
  /** Moods (2.2, 2.7): bounds, the sizing cap f ≤ capF, the petitioner weight clamp, the validator's |Δ| bound. */
  mood: z
    .object({
      start: int.min(0).max(100).default(50),
      /** D38: how far a new term moves each mood back toward `start` (2.10: half, 0.5; tune 1/3 to 1/2; rounded toward start). */
      termReset: z.number().min(0).max(1).default(0.5),
      capF: pos.default(1.4),
      maxDelta: int.positive().default(10),
      petitionerLow: pos.default(0.5),
      petitionerHigh: pos.default(1.5),
    })
    .prefault({}),
  /**
   * Boycotts (2.8, rules; D38): a club below `below` (tune 20 to 30) boycotts; it ends at below +
   * endsAbove, re-arms at below + rearmAbove, and is "in a huff" up to below + huffAbove (the count's
   * bend, D25). `DecreeSchema` derives `endsAt`, `rearmAt` and `count.huffBelow` from these.
   */
  boycott: z
    .object({ below: int.min(0).max(100).default(20), endsAbove: int.positive().default(5), rearmAbove: int.positive().default(10), huffAbove: int.positive().default(10), papers: int.positive().default(8) })
    .prefault({}),
  /** Gossip and scandal (2.8, rules). */
  scandal: z.object({ quietDecay: int.positive().default(8), sayNothingFactor: prob.default(0.8), sayNothingPapers: int.positive().default(10) }).prefault({}),
  /** The desk (2.5, 2.7; rules unless noted). */
  desk: z
    .object({
      treasury: nonneg.default(30),
      trayCap: int.positive().default(10),
      slipDelay: nonneg.default(1),
      /** D16: a slip on an empty desk with an empty tray keeps back this many seconds of B (tune 10 to 30). */
      slipReserveSeconds: nonneg.default(15),
      takeBackSeconds: pos.default(2),
      /** At most this many papers past the cap for an event on top (2.7). */
      eventOverCap: int.min(0).default(1),
      /**
       * D32: a slip that has landed stays until it is flicked up or down; a visitor who arrives meanwhile
       * waits in the tray (true). false is 2.7 as first written (an arrival returns an undragged slip).
       * The ONE reader is slips.ts `slipYields`.
       */
      slipStays: z.boolean().default(true),
    })
    .prefault({}),
  /** Time away (2.15): arrival every n s (tune 240 to 600), rate a (tune 0.25 to 0.45), the cap (rule 4 h; +2 h with Long Lunch, D11). */
  away: z.object({ arrivalSeconds: pos.default(360), rate: prob.default(0.35), capHours: pos.default(4), longLunchHours: pos.default(2) }).prefault({}),
  /**
   * The ladder (2.10, 2.12): m_N = 1 + nrFactor × NR (tune 0.01 to 0.04); disarray after n consecutive
   * losses Y(n) = 2^(n+1) − 2 share points (D15, a rule: +2, +6, +14, +30, +62, +126); with D25's count
   * (a mood below 30 counts three times as far below, so the worst share is Y − R − 60) a count is a
   * certain win after at most `maxLossesBound` (6, D25) consecutive losses for any pull up to 12: the
   * validator recomputes the bound from the numbers (count.ts `certainWinBound`) and fails above it;
   * the transition fund (tune 15 to 90 s of the old B); the new office's moods
   * 50 + min(moveMoodCap, floor(NR / moveMoodPerNr)); NR += winWeight × (winBase + districts held on
   * merit) + sweepBonus × winWeight for a sweep on merit (2.10, D26), + winWeight after a loss.
   */
  ladder: z
    .object({
      nrFactor: pos.default(0.02),
      winBase: int.default(3),
      sweepBonus: int.default(2),
      transitionFund: pos.default(30),
      moveMoodCap: int.default(5),
      moveMoodPerNr: int.positive().default(20),
      announceSeconds: pos.default(2.5),
      maxLossesBound: int.positive().default(6),
    })
    .prefault({}),
  /**
   * The count's utility of a mood (D25, rules; the ONE function is count.ts `moodUtility`): a mood from
   * `huffBelow` (derived, D38: boycott.below + boycott.huffAbove, 30) up counts as it is, below it `huffSlope` times as far below (u(m) = m from 30 up,
   * 3m − 60 below: u(20) = 0, u(0) = −60). Only the count and the poll read it; approval and income use
   * the plain moods. A club from boycott.below to huffBelow − 1 is "in a huff" on screen.
   * D31: a mood above `topAbove` counts only `topSlope` per point above it (u(m) = topAbove + topSlope ×
   * (m − topAbove): 70 and 0.25, tune 60 to 80 and 0.1 to 0.5); a club above it is "won over" on screen.
   */
  count: z
    .object({
      huffSlope: z.number().min(1).default(3),
      topAbove: int.min(0).max(100).default(70),
      topSlope: z.number().min(0).max(1).default(0.25),
    })
    .prefault({}),
  /** The vanity shelf (5.8, D36): a monument a term from mayor term 2 for `price` s of B (starts at 300, tune 300 to 1,200), ×factor for good (tune 1.01 to 1.04). */
  vanity: z.object({ price: pos.default(300), factor: pos.default(1.02), fromMayorTerm: int.positive().default(2) }).prefault({}),
  /** The Standing Order (5.10): from governor term 2 (from the first day with the product "Junior Clerk on Duty", D11), buys the advised level when cash ≥ times × price + the reserve. */
  standingOrder: z.object({ fromGovernorTerm: int.positive().default(2), times: pos.default(3) }).prefault({}),
  /** Advice (2.16): the record's divisor (D36: advice never names a monument, so it has no Δincome share). */
  advice: z.object({ recordDivisor: pos.default(1.5) }).prefault({}),
  /** Rewarded ads (5.11; play-clock cooldowns, rules). */
  ads: z
    .object({
      /** The away report's ad adds this share (EngineMode.offlineAdMultiplier = 1 + awayBonus). */
      awayBonus: nonneg.default(0.5),
      checkSofaSeconds: pos.default(40),
      openDoorsCooldown: pos.default(900),
    })
    .prefault({}),
  /** The products this mode reads from `entitlements.products` (D11: five; {unlock, unlock, cosmetic, cosmetic, skipAds}). */
  products: z
    .object({
      standingOrder: z.string().default('office_standing_order'),
      longLunch: z.string().default('office_long_lunch'),
      walnutDesk: z.string().default('office_walnut_desk'),
      portraitFrames: z.string().default('office_portrait_frames'),
      privateSecretary: z.string().default('office_private_secretary'),
    })
    .prefault({}),
  /** The cast that is not a deck record (7.3): the six player faces, and who brings slips and counts. */
  cast: z
    .object({
      players: z.array(z.object({ id, name: text(24) })).default([
        { id: 'bramble', name: 'Hettie Bramble' },
        { id: 'fennel', name: 'Osgood Fennel' },
        { id: 'quill', name: 'Ada Quill' },
        { id: 'marchpane', name: 'Rupert Borage' },
        { id: 'tuttle', name: 'Winifred Chervil' },
        { id: 'larkspur', name: 'Cosmo Larkspur' },
      ]),
      clerk: VisitorSchema.default({ face: 'face:abacus', name: 'Gwendolyn Abacus', role: 'Treasury Clerk', club: null }),
      countingClerk: VisitorSchema.default({ face: 'face:tallow', name: 'Agatha Tallow', role: 'Counting Clerk', club: null }),
    })
    .prefault({}),
  /**
   * Follow-ups written with their paper (D20): the delay of a Committee's bigger study and of a
   * Basket's favour, in decided papers (tune; 7.6 gives the favour 10 to 14; the bigger study's is
   * PLACEHOLDER until the prototype or the lead sets it).
   */
  followUps: z
    .object({
      biggerStudyDelay: z.tuple([int.positive(), int.positive()]).default([8, 12]),
      favourDelay: z.tuple([int.positive(), int.positive()]).default([10, 14]),
    })
    .prefault({}),
  // ---------------------------------------------------------------- rules-paper (P1a): added block
  /**
   * rules-paper: the parameters of two formulas the numbers prototype's final report may still move
   * (D27), each read by ONE function of the paper core, so a change is one line here:
   * - `disarray` (params.ts `disarray`, D15): Y(n) = first × (ratio^n − 1)/(ratio − 1) share points after
   *   n consecutive losses (first 2, ratio 2: 2^(n+1) − 2 = +2, +6, +14, +30, +62, +126; ratio 1 is the
   *   old linear rule first × n).
   * - `sizing` (size.ts `sizeMood`, 2.7 f±): f = min(capF, 1 + pull × (headroom/scale − 1)); pull 1 and
   *   scale 50 are 2.7's f+ = min(1.4, (100 − m)/50), f− = min(1.4, m/50); a pull below 1 is D27's
   *   "gentler pull toward 50", with the no-clamp lemma kept (|shown| never exceeds the headroom).
   */
  paperRules: z
    .object({
      disarray: z.object({ first: pos.default(2), ratio: z.number().min(1).default(2) }).prefault({}),
      sizing: z.object({ scale: pos.default(50), pull: z.number().min(0).max(1).default(1) }).prefault({}),
    })
    .prefault({}),
  // ---------------------------------------------------------------- end of rules-paper block
  /**
   * True only in the skeleton's placeholder game.json (scripts/content/office-placeholder.ts writes it;
   * build-office.py never does): the satire lint's errors are then warnings. validate --release fails
   * on any decree game.json that still contains the word PLACEHOLDER.
   */
  skeletonPlaceholder: z.boolean().default(false),
  deck: DeckSchema.prefault({}),
});

/**
 * D38: the boycott threshold `boycott.below` is ONE lever (tune 20 to 30) and the thresholds that hang
 * on it move with it, derived here and nowhere else: a boycott ends at below + endsAbove (25) and re-arms
 * at below + rearmAbove (30); "in a huff" is the huffAbove (10) points above the threshold, so D25's
 * utility bends at count.huffBelow = below + huffAbove (30). The parsed block carries the derived
 * `boycott.endsAt`, `boycott.rearmAt` and `count.huffBelow` for every reader; they are never written in
 * game.json (a value there is ignored).
 */
export const DecreeSchema = DecreeObject.transform((d) => ({
  ...d,
  boycott: { ...d.boycott, endsAt: d.boycott.below + d.boycott.endsAbove, rearmAt: d.boycott.below + d.boycott.rearmAbove },
  count: { ...d.count, huffBelow: d.boycott.below + d.boycott.huffAbove },
}));

export type DecreeContent = z.output<typeof DecreeSchema>;
export type DecreeContentInput = z.input<typeof DecreeSchema>;
export type ClubId = (typeof CLUB_IDS)[number];
export type OfficeId = (typeof OFFICE_IDS)[number];
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];
export type FactorTarget = (typeof FACTOR_TARGETS)[number];
export type BaseEffect = z.output<typeof BaseEffectSchema>;
export type Club = z.output<typeof ClubSchema>;
export type Office = z.output<typeof OfficeSchema>;
export type District = z.output<typeof DistrictSchema>;
export type Ministry = z.output<typeof MinistrySchema>;
export type Rival = z.output<typeof RivalSchema>;
export type GrandProject = z.output<typeof GrandProjectSchema>;
export type Archetype = z.output<typeof ArchetypeSchema>;
export type FactorDef = z.output<typeof FactorSchema>;
export type MinisterDef = z.output<typeof MinisterSchema>;
export type TwistDef = z.output<typeof TwistSchema>;
export type Visitor = z.output<typeof VisitorSchema>;
export type ComicPaperDef = z.output<typeof ComicPaperSchema>;
export type ChainDef = z.output<typeof ChainSchema>;
export type FollowUpPaperDef = z.output<typeof FollowUpPaperSchema>;
export type FormNoteDef = z.output<typeof FormNoteSchema>;
export type GrievanceDef = z.output<typeof GrievanceSchema>;
export type FrontPageDef = z.output<typeof FrontPageSchema>;
export type ApologyDef = z.output<typeof ApologySchema>;
export type ApplicationDef = z.output<typeof ApplicationSchema>;
export type RunUpDef = z.output<typeof RunUpSchema>;
export type RallyDef = z.output<typeof RallySchema>;
export type ScriptedPaperDef = z.output<typeof ScriptedPaperSchema>;
export type FrameDef = z.output<typeof FrameSchema>;
export type PhraseListDef = z.output<typeof PhraseListSchema>;
export type LineDef = z.output<typeof LineSchema>;
export type NightLineDef = z.output<typeof NightLineSchema>;
export type MonumentDef = z.output<typeof MonumentSchema>;
export type Deck = z.output<typeof DeckSchema>;

/**
 * The allowed range of every (tune) number of the specification: a field path of the `decree`
 * block (dots; `[i]` for a list element), its low and high bound and the section that sets it.
 * Plain JSON, so build-office.py can read it (`npx tsx -e` prints it) and tests check the defaults
 * sit inside. A range is never widened silently. "±20 %", "×0.3 to ×3" are written out around the
 * starting value. Archetype base effects (each ±1) are listed per effect by `archetypeRanges()`.
 */
export const RANGES: readonly { path: string; low: number; high: number; spec: string }[] = [
  ...[0, 1, 2].flatMap((o) => {
    const row = OFFICES_DEFAULT[o];
    const r = (path: string, low: number, high: number, spec = '2.2') => ({ path: `offices[${o}].${path}`, low, high, spec });
    return [
      r('tau', 10, 18),
      r('termDays', Math.round(row.termDays * 0.8), Math.round(row.termDays * 1.2)),
      r('callFraction', 0.5, 0.7),
      r('rivalPull', 3, 12),
      r('scale', row.scale * 0.3, row.scale * 3),
      ...(row.stand ? [r('stand.nr', row.stand.nr * 0.7, row.stand.nr * 1.3), r('stand.record', Math.round(row.stand.record * 0.7), Math.round(row.stand.record * 1.3))] : []),
      r('requisitionEvery', row.requisitionEvery - 2 < 1 ? 1 : row.requisitionEvery - 2, row.requisitionEvery + 2),
      r('templateShare', 0, 0.25),
    ];
  }),
  { path: 'ministry.valueStep', low: 6, high: 10, spec: '2.2' },
  { path: 'ministry.openRatio', low: 13, high: 30, spec: '2.2' },
  { path: 'ministry.levelGrowth', low: 1.15, high: 1.3, spec: '2.2' },
  { path: 'money.S', low: 7.5, high: 30, spec: '2.2' },
  { path: 'money.M', low: 15, high: 60, spec: '2.2' },
  { path: 'money.L', low: 30, high: 120, spec: '2.2' },
  { path: 'away.arrivalSeconds', low: 240, high: 600, spec: '2.2' },
  { path: 'away.rate', low: 0.25, high: 0.45, spec: '2.2' },
  { path: 'ladder.nrFactor', low: 0.01, high: 0.04, spec: '2.2' },
  { path: 'ladder.transitionFund', low: 15, high: 90, spec: '2.2' },
  { path: 'desk.slipReserveSeconds', low: 10, high: 30, spec: 'D16' },
  { path: 'count.topAbove', low: 60, high: 80, spec: 'D31' },
  { path: 'boycott.below', low: 20, high: 30, spec: 'D38' },
  { path: 'paperRules.sizing.pull', low: 0.5, high: 1, spec: 'D27, D38' },
  { path: 'mood.termReset', low: 1 / 3, high: 0.5, spec: 'D38' },
  { path: 'count.topSlope', low: 0.1, high: 0.5, spec: 'D31' },
  { path: 'followUps.favourDelay[0]', low: 5, high: 30, spec: '7.6, D20' },
  { path: 'followUps.favourDelay[1]', low: 5, high: 30, spec: '7.6, D20' },
  { path: 'followUps.biggerStudyDelay[0]', low: 5, high: 30, spec: 'D20 (PLACEHOLDER)' },
  { path: 'followUps.biggerStudyDelay[1]', low: 5, high: 30, spec: 'D20 (PLACEHOLDER)' },
  // 8.4 "archetype shares": each ±0.05 around 2.2's share (lintDecree keeps the sum at 1 and traps ≤ 0.15).
  ...ARCHETYPES_DEFAULT.flatMap((a, i) => (a.share ? [{ path: `archetypes[${i}].share`, low: Math.round((a.share - 0.05) * 100) / 100, high: Math.round((a.share + 0.05) * 100) / 100, spec: '2.2, 8.4' }] : [])),
  { path: 'vanity.price', low: 300, high: 1200, spec: '5.8' },
  { path: 'vanity.factor', low: 1.01, high: 1.04, spec: '2.2' },
  { path: 'approval.slope', low: 0.8, high: 1.4, spec: '2.4' },
];

/** The ±1 range of every archetype base mood effect (2.2: "each tune ±1"), by path. */
export function archetypeRanges(): { path: string; low: number; high: number; spec: string }[] {
  const out: { path: string; low: number; high: number; spec: string }[] = [];
  ARCHETYPES_DEFAULT.forEach((a, i) =>
    (['sign', 'refuse'] as const).forEach((side) =>
      (a[side] ?? []).forEach((e, j) => {
        if ('delta' in e && typeof e.delta === 'number') out.push({ path: `archetypes[${i}].${side}[${j}].delta`, low: e.delta - 1, high: e.delta + 1, spec: '2.2' });
      }),
    ),
  );
  return out;
}

/**
 * Cross-field checks zod cannot express (the game-data lint, src/config/lint.ts, prints them).
 * Skeleton: the structural ones; the rules package adds the rest of the validator of 2.7, 2.11 and
 * 2.14 (every effective |Δ| ≤ 10 with factors, composition to term 181, ceil((50 + R)/Y) ≤ 8 is here).
 */
export function lintDecree(d: DecreeContent): string[] {
  const out: string[] = [];
  d.offices.forEach((o, oi) => {
    if (o.id !== OFFICE_IDS[oi]) out.push(`offices[${oi}] must be "${OFFICE_IDS[oi]}"`);
    o.districts.forEach((dist) => {
      if (dist.mix.length !== o.clubs.length) out.push(`${o.id} district ${dist.id}: mix has ${dist.mix.length} weights for ${o.clubs.length} clubs`);
      const sum = dist.mix.reduce((a, b) => a + b, 0);
      if (sum !== 100) out.push(`${o.id} district ${dist.id}: mix sums to ${sum}, not 100`);
    });
    if (o.majority > o.districts.length) out.push(`${o.id}: majority ${o.majority} of ${o.districts.length} districts`);
    if (o.ministries[0]?.club !== null) out.push(`${o.id}: ministry 0 serves no club (so income is never zero)`);
    for (const m of o.ministries) if (m.club && !o.clubs.includes(m.club)) out.push(`${o.id}: ministry ${m.id} serves ${m.club}, not a club of this office`);
    // 2.11 with D15 and D25: the bound recomputed from the numbers (count.ts, the ONE function of the count's rules).
    const bound = certainWinBound(d, oi);
    if (!(bound <= d.ladder.maxLossesBound)) out.push(`${o.id}: a count is a certain win only after ${bound} consecutive losses, more than ${d.ladder.maxLossesBound} (2.11 with D15 and D25: Y(n) − R + u(0) ≥ 50)`);
    // The ladder of 2.2: only the mayor stands for nothing.
    if ((oi === 0) !== (o.stand === null)) out.push(`${o.id}: ${oi === 0 ? 'the first office has no requirement to stand' : 'needs its requirements to stand (Name Recognition and the record below)'}`);
    if (oi < 2 && !o.recordName) out.push(`${o.id}: the record the next office needs has no name`);
    if (o.callFraction <= 0 || callDayOf(o) < 1 || callDayOf(o) > o.termDays) out.push(`${o.id}: the call day C = ${o.callFraction} × ${o.termDays} is not a day of the term`);
    const mins = d.ministers.filter((m) => m.office === o.id);
    if (mins.length !== 3) out.push(`${o.id}: ${mins.length} ministers apply here, not 3 (2.9)`);
    for (const m of d.ministers) if (OFFICE_IDS.indexOf(m.office) <= oi && m.office === o.id && !o.clubs.includes(m.club)) out.push(`minister ${m.id}: club ${m.club} is not a club of ${o.id} (D21: the application would never come)`);
  });
  // 2.9: ministers' ids and initials are distinct (the initials are printed on the papers they touch).
  if (new Set(d.ministers.map((m) => m.id)).size !== d.ministers.length) out.push('ministers: duplicate id');
  if (new Set(d.ministers.map((m) => m.initials)).size !== d.ministers.length) out.push('ministers: duplicate initials (each prints its own on the papers it touches)');
  const days = d.forms.application.days;
  if (days.some((x, i) => i > 0 && x <= days[i - 1])) out.push(`forms.application.days ${JSON.stringify(days)} must rise`);
  if (!(d.count.topAbove > d.count.huffBelow)) out.push(`count.topAbove ${d.count.topAbove} must be above count.huffBelow ${d.count.huffBelow}`);
  if (!(d.boycott.endsAbove <= d.boycott.rearmAbove)) out.push(`boycott: endsAbove ${d.boycott.endsAbove} must be at most rearmAbove ${d.boycott.rearmAbove} (2.8: ends at 25, re-arms at 30)`);
  // 2.14: the ladder of new things to term 181, and every factor composed with every minister.
  for (const p of compositionProblems({ decree: d } as unknown as DecreeConfig)) out.push(p);
  const followOnly = new Set<string>(FOLLOW_ONLY_ARCHETYPES);
  for (const a of d.archetypes) if (followOnly.has(a.id) && a.share !== 0) out.push(`archetype ${a.id} is drawn only as a follow-up: its share must be 0`);
  const shares = d.archetypes.filter((a) => !followOnly.has(a.id)).reduce((s, a) => s + a.share, 0);
  if (Math.abs(shares - 1) > 1e-9) out.push(`archetype shares sum to ${shares}, not 1`);
  const traps = d.archetypes.filter((a) => a.trap).reduce((s, a) => s + a.share, 0);
  if (traps > 0.15 + 1e-9) out.push(`traps are ${Math.round(traps * 100)} % of the draw (at most 15 %, 2.2)`);
  const twistIds = new Set(d.twists.list.map((t) => t.id));
  for (const t of [...d.twists.mayor, ...d.twists.governor, ...d.twists.presidentSingles]) if (!twistIds.has(t)) out.push(`twist order names unknown twist "${t}"`);
  for (const combo of [...d.twists.pairs, ...d.twists.triples]) if (new Set(combo).size !== combo.length || combo.some((i) => i >= d.twists.list.length)) out.push(`twist combination ${JSON.stringify(combo)} is not distinct twists of the list`);
  const ids = new Set<string>();
  for (const p of [...d.deck.papers, ...d.deck.scripted]) {
    if (ids.has(p.id)) out.push(`deck: duplicate paper id "${p.id}"`);
    ids.add(p.id);
  }
  const setsUp = new Set([...d.deck.papers, ...d.deck.scripted].map((p) => p.setsUp).filter(Boolean));
  for (const c of d.deck.chains) if (!setsUp.has(c.id)) out.push(`deck: no paper sets up chain ${c.id} (an orphan follow-up)`);
  for (const p of [...d.deck.papers, ...d.deck.scripted]) if (p.setsUp && !d.deck.chains.some((c) => c.id === p.setsUp)) out.push(`deck: paper ${p.id} sets up unknown chain "${p.setsUp}"`);
  // An archetype whose effects name 'other' needs `other` on every record that uses it (else the effect has no club).
  const usesOther = new Set(d.archetypes.filter((a) => [...a.sign, ...a.refuse].some((e) => e.type === 'mood' && e.club === 'other')).map((a) => a.id as string));
  const needOther = (where: string, archetype: string | null, other: string | null) => {
    if (archetype && usesOther.has(archetype) && !other) out.push(`deck: ${where} is a ${archetype}, whose effects name the other club, but it has no \`other\``);
  };
  for (const p of d.deck.papers) needOther(`paper ${p.id}`, p.archetype, p.other);
  for (const f of d.deck.frames) needOther(`frame ${f.id}`, f.archetype, f.other);
  for (const c of d.deck.chains) for (const [b, f] of [['afterSign', c.afterSign], ['afterRefuse', c.afterRefuse]] as const) if (f) needOther(`chain ${c.id}.${b}`, f.archetype, f.other);
  // D20: every Committee carries its bigger study and every Basket its favour, unless it sets up a chain of 7.6.
  for (const p of [...d.deck.papers, ...d.deck.frames]) {
    if (p.archetype === 'committee' && !p.biggerStudy && !('setsUp' in p && p.setsUp)) out.push(`deck: committee ${p.id} has no biggerStudy (D20: ↩ is printed on every Committee sign)`);
    if (p.archetype === 'basket' && !p.favour && !('setsUp' in p && p.setsUp)) out.push(`deck: basket ${p.id} has no favour (D20: ↩ is printed on every Basket sign)`);
    if (p.biggerStudy && p.archetype !== 'committee') out.push(`deck: ${p.id} has a biggerStudy but is a ${p.archetype}, not a committee`);
    if (p.favour && p.archetype !== 'basket') out.push(`deck: ${p.id} has a favour but is a ${p.archetype}, not a basket`);
  }
  for (const [k, [lo, hi]] of Object.entries(d.followUps)) if (lo > hi) out.push(`followUps.${k}: [${lo}, ${hi}] is not low ≤ high`);
  return out;
}
