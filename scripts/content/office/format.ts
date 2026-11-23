/**
 * The authoring format of High Office's written content (docs/design/office-design.md 7.7, 9.2 "W",
 * decisions D5, D7, D9): zod schemas and types of every authoring file under
 * scripts/content/office/ and of a writer's BATCH file (scripts/content/office/batches/<name>.json).
 *
 * What a writer types: words, the visitor, the archetype, the clubs, the subject, butt and joke-shape
 * tags, and links between records (a paper that sets up a chain). Never a number the archetype table
 * of 2.2 fixes: every record is strict, so a "cost", "sign", "refuse" or "effects" field is refused
 * with a sentence saying why. The one number a writer types is a follow-up's delay range (in papers),
 * which 7.6 gives to the writer.
 *
 * Owned by the content desk (D7). The RUNTIME deck (game.json `decree`, src/engine/decree/types.ts,
 * src/config/schema.decree.ts) is the skeleton's; scripts/content/build-office.py maps these records
 * onto it. Field names follow 2.7 where 2.7 names the thing: `id`, `kind`, `visitor`, `text`,
 * `archetype`, `subject`, `butt`, `shape` (the joke-shape tag), `followUp` → here `setsUp` (a writer
 * names the chain; the draw fills `{chainId, step, delay}`).
 *
 * Files (9.2 W): papers.mayor.json, papers.governor.json, papers.president.json, papers.any.json,
 * chains.json, forms.json, events.json, campaign.json, templates.json, phrases.json, lines.json,
 * names.json. A batch holds any of their sections with a header {batch, writer, office}.
 */
import { z } from 'zod';

// ------------------------------------------------------------------------------------------------
// Closed vocabularies
// ------------------------------------------------------------------------------------------------

export const OFFICES = ['mayor', 'governor', 'president'] as const;
export type Office = (typeof OFFICES)[number];
/** Where a record is drawn: one office's deck or the any-office deck. */
export const DECKS = ['mayor', 'governor', 'president', 'any'] as const;
export type Deck = (typeof DECKS)[number];

/** Club ids (2.2). Short names are what a paper prints. Never four clubs in an office. */
export const CLUBS = ['bus', 'shops', 'veg', 'brass', 'anglers', 'kites', 'hedges'] as const;
export type Club = (typeof CLUBS)[number];
export const CLUB_NAMES: Record<Club, { name: string; short: string }> = {
  bus: { name: "Bus Spotters' Society", short: 'Bus' },
  shops: { name: 'Shop Window Guild', short: 'Shops' },
  veg: { name: 'Giant Vegetable Society', short: 'Vegetables' },
  brass: { name: 'Brass Band Guild', short: 'Brass' },
  anglers: { name: "Anglers' Circle", short: 'Anglers' },
  kites: { name: "Kite Flyers' League", short: 'Kites' },
  hedges: { name: 'Tidy Hedge Committee', short: 'Hedges' },
};
/** The clubs present in each deck (2.2). The any-office deck uses the clubs every office has. */
export const DECK_CLUBS: Record<Deck, readonly Club[]> = {
  mayor: ['bus', 'shops', 'veg'],
  governor: ['bus', 'shops', 'veg', 'brass', 'anglers'],
  president: ['bus', 'shops', 'veg', 'brass', 'anglers', 'kites', 'hedges'],
  any: ['bus', 'shops', 'veg'],
};

/** The archetypes of 2.2 a comic paper or template picks. */
export const ARCHETYPES = ['project', 'swap', 'fee', 'treat', 'committee', 'vanity', 'basket'] as const;
export type Archetype = (typeof ARCHETYPES)[number];
/** A follow-up is an archetype from the table, or the basket's favour (2.2, 7.6). */
export const FOLLOW_ARCHETYPES = [...ARCHETYPES, 'favour'] as const;
export type FollowArchetype = (typeof FOLLOW_ARCHETYPES)[number];
export const TRAPS: readonly FollowArchetype[] = ['vanity', 'basket'];
/** Archetypes that name an "other" club (the side that loses when the petitioner wins). */
export const NEEDS_OTHER: readonly FollowArchetype[] = ['project', 'swap', 'fee', 'treat', 'committee'];

/**
 * The chips each outcome prints, by archetype (2.2's table read as chip slots, 4.2: a strip has 4
 * slots, a wide chip takes 2, a mayor strip holds at most 3 chips). Kinds only, no numbers: the
 * numbers are the engine's. `every` is the wide "every club" chip. The ↩ of committee, basket and a
 * set-up paper is drawn in the title row, not as a chip.
 */
export const ARCHETYPE_CHIPS: Record<FollowArchetype, { sign: readonly ChipKind[]; refuse: readonly ChipKind[] }> = {
  project: { sign: ['money', 'club', 'club'], refuse: ['club', 'club'] },
  swap: { sign: ['club', 'club'], refuse: ['club', 'club'] },
  fee: { sign: ['money', 'club', 'club'], refuse: ['club', 'club'] },
  treat: { sign: ['club', 'club', 'gossip'], refuse: ['club'] },
  committee: { sign: ['money', 'club', 'club'], refuse: ['club', 'club'] },
  vanity: { sign: ['money', 'every'], refuse: [] },
  basket: { sign: ['gossip'], refuse: [] },
  favour: { sign: ['club', 'gossip'], refuse: [] },
};
export type ChipKind = 'money' | 'club' | 'gossip' | 'every' | 'district' | 'level' | 'appoint' | 'end';
export const CHIP_SLOTS: Record<ChipKind, number> = {
  money: 1, club: 1, gossip: 1, every: 2, district: 2, level: 1, appoint: 1, end: 1,
};

/** The closed subject list of 7.8 rule 5. */
export const SUBJECTS = [
  'ribbons', 'signage', 'statues', 'ducks', 'geese', 'picnic-weather', 'committees', 'vegetable-shows',
  'clocks', 'potholes', 'hats', 'fountains', 'bandstands', 'gardens', 'buses', 'kites', 'hedges',
  'harbours', 'inventions', 'ceremonies', 'portraits', 'paperwork', 'vanity',
] as const;
export type Subject = (typeof SUBJECTS)[number];

/**
 * Butt tags: who the joke is on (BRIEF: the powerful, first of all the player's own character; never a
 * group of real people, never a club). `self` the player's character; `office` the institution and its
 * red tape; `staff` an advisor or clerk; `lobbyist`; `committee`; `visitor` the person on the paper as
 * an individual (their own vanity, never their club); `rival`; `thing` an object or animal (the
 * pumpkin, the goose).
 */
export const BUTTS = ['self', 'office', 'staff', 'lobbyist', 'committee', 'visitor', 'rival', 'thing'] as const;
export type Butt = (typeof BUTTS)[number];

/** The eight joke shapes of 7.4 (each at most 20 % of a deck, no two in a row where order is fixed). */
export const SHAPES = [
  'undercut', 'escalation', 'literalism', 'form-misapplied', 'statistic', 'slogan', 'photo-op', 'callback',
] as const;
export type Shape = (typeof SHAPES)[number];

// ------------------------------------------------------------------------------------------------
// Building blocks
// ------------------------------------------------------------------------------------------------

/** Ids are stable and readable: lower-case words joined by hyphens ("may-pumpkin-freedom"), ≤ 48. */
export const ID_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const id = z
  .string()
  .max(48, 'an id is at most 48 characters')
  .regex(ID_RE, 'an id is lower-case words joined by hyphens, like "may-pumpkin-freedom"');
/** A cast id from names.json (kind "cast"): the ids of docs/design/office-style.md section 2. */
export const castId = id;
/** An id that may also be a runtime id of src/config/schema.decree.ts (a ministry "town_clock"). */
export const refId = z
  .string()
  .max(48)
  .regex(/^[a-z][a-z0-9]*([_-][a-z0-9]+)*$/, 'an id is lower-case words joined by hyphens or underscores');
const text = z.string().min(1, 'the text is empty');
/** Every paper-like text is at most 90 characters (2.7); its box decides the rest (fit.ts). */
export const PAPER_MAX = 90;
const paperText = text.max(PAPER_MAX, `a paper is at most ${PAPER_MAX} characters`);
const club = z.enum(CLUBS, { message: `a club is one of ${CLUBS.join(', ')}` });
const deck = z.enum(DECKS, { message: `an office is one of ${DECKS.join(', ')}` });
const office = z.enum(OFFICES, { message: `an office is one of ${OFFICES.join(', ')}` });
/**
 * Subject, butt and shape are checked by the lint (7.8 rule 5) rather than by an enum here, so that
 * a club named as the butt, or a subject off the list, gets the lint's plain sentence instead of a
 * schema error. They are still required.
 */
const tag = z.string({ message: 'missing' }).min(1, 'missing');

/** The tags every joke-carrying record has (7.4, 7.8 rule 5). */
const tags = {
  subject: tag,
  butt: tag,
  shape: tag,
};

/** Keys a writer must never type: they are the archetype table's numbers (2.2). */
export const NUMBER_KEYS = [
  'sign', 'refuse', 'study', 'cost', 'money', 'gain', 'price', 'effects', 'effect', 'delta', 'mood',
  'moods', 'gossip', 'approval', 'amount', 'dibs', 'outcomes', 'tier', 'weight', 'share',
];

// ------------------------------------------------------------------------------------------------
// Records
// ------------------------------------------------------------------------------------------------

/** A comic paper (2.7, 7.5). The office comes from the file or the batch header. */
export const ComicPaperSchema = z.strictObject({
  id,
  /** The visitor: a cast id (names.json). */
  visitor: castId,
  /** A co-signer shown beside the visitor ("with Ambrose Minute"): a cast id. */
  cosigner: castId.optional(),
  /** The petitioner club: the visitor's side. For a basket, the club whose draw cell it fills. */
  club,
  /** The other club (the side named in 7.2): required for project, swap, fee, treat, committee. */
  other: club.optional(),
  archetype: z.enum(ARCHETYPES, { message: `an archetype is one of ${ARCHETYPES.join(', ')}` }),
  text: paperText,
  ...tags,
  /** Drawn in higher offices too; then the text has no office word (7.7). */
  portable: z.boolean().optional(),
  /** The chain (chains.json id) this paper sets up: its sign and refuse each bring a follow-up. */
  setsUp: id.optional(),
  /**
   * A committee's "↩ bigger study" (2.2): the paper that comes back after a sign, asking for a study
   * of the study. Required on a committee that sets up no chain (plan.json, office-style.md 8).
   */
  biggerStudy: paperText.optional(),
  /**
   * A basket's "↩ favour" (2.2, 7.6 A): what the lobbyist asks after the basket was accepted, and
   * the two clippings that end it. Its club (the one that pays) is the basket's `club`, its visitor
   * the basket's. Required on a basket that sets up no chain.
   */
  favour: z
    .strictObject({
      text: paperText,
      clippings: z.strictObject({ sign: paperText, refuse: paperText }),
    })
    .optional(),
  /** Optional note for the editors; never shown. */
  note: z.string().optional(),
});
export type ComicPaper = z.infer<typeof ComicPaperSchema>;

/**
 * A scripted paper (2.7 draw step 2): the first four of a game (mayor slots 1 to 4) and the first of
 * the governor's and the president's office (slot 1). Its effects are the rules' (3.1, 7.5: paper 1
 * teaches refusal, paper 2 signing, paper 3 pays a fixed sum, paper 4 is the basket), never typed.
 */
export const ScriptedPaperSchema = z.strictObject({
  id,
  office: office.optional(),
  slot: z.number().int().min(1).max(4),
  visitor: castId,
  cosigner: castId.optional(),
  club: club.optional(),
  other: club.optional(),
  archetype: z.enum(ARCHETYPES).optional(),
  text: paperText,
  ...tags,
  setsUp: id.optional(),
  note: z.string().optional(),
});
export type ScriptedPaper = z.infer<typeof ScriptedPaperSchema>;

/** A delay in decided papers, as a range (7.6: "10 to 14 papers later"). */
export const DelaySchema = z
  .tuple([z.number().int().min(5), z.number().int().max(30)], {
    message: 'a delay is [from, to] in papers, like [10, 14]',
  })
  .refine(([a, b]) => a <= b && b - a <= 8, 'a delay is [from, to] with from ≤ to and at most 8 apart, inside 5 to 30');

/** One follow-up of a chain (7.6): its id is derived, `<chain>.sign` or `<chain>.refuse`. */
export const FollowUpSchema = z.strictObject({
  visitor: castId,
  cosigner: castId.optional(),
  /** The petitioner club; for the favour, the club that pays (7.6: "a club −3"). */
  club,
  other: club.optional(),
  archetype: z.enum(FOLLOW_ARCHETYPES, { message: `a follow-up archetype is one of ${FOLLOW_ARCHETYPES.join(', ')}` }),
  text: paperText,
  ...tags,
  delay: DelaySchema,
  /** The two clippings that end the chain: after this follow-up is signed, and after it is studied. */
  clippings: z.strictObject({ sign: paperText, refuse: paperText }),
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

/** A chain (7.6): set up by the comic paper whose `setsUp` names it; one follow-up per branch. */
export const ChainSchema = z.strictObject({
  id,
  office: deck.optional(),
  /** A readable name for the editors ("The Basket"). */
  title: z.string().min(1),
  /** Comes back after the set-up was signed. */
  afterSign: FollowUpSchema,
  /** Comes back after the set-up was refused (studied). */
  afterRefuse: FollowUpSchema,
  note: z.string().optional(),
});
export type Chain = z.infer<typeof ChainSchema>;

/** A Clerk's note on a form (7.5 paper 8: "The first shovel is tired."). */
export const FormNoteSchema = z.strictObject({
  id,
  form: z.enum(['requisition', 'ribbon', 'any']),
  /** A ministry or Grand Project id from names.json ("potholes-office") when the note only makes sense for one. */
  ministry: refId.optional(),
  office: deck.optional(),
  text: text.max(PAPER_MAX),
  note: z.string().optional(),
});
export type FormNote = z.infer<typeof FormNoteSchema>;

/** A minister's application and the line they return with after a refusal (2.9, 7.5 paper 9). */
export const ApplicationSchema = z.strictObject({
  id,
  /** The minister's cast id; their club and desk rule are the specification's (7.3), never typed. */
  minister: castId,
  text: paperText,
  returnText: paperText,
  note: z.string().optional(),
});
export type Application = z.infer<typeof ApplicationSchema>;

/** A boycott grievance (2.8, 7.5 paper 10): both button labels and the picket slogan. */
export const GrievanceSchema = z.strictObject({
  id,
  club,
  /** The club's spokesperson (7.3). */
  visitor: castId,
  text: paperText,
  /** The sign label ("Return the scissors"); at most 28 characters (the runtime deck's cap). */
  signLabel: text.max(28, 'a button label is at most 28 characters'),
  /** The refuse label ("Keep the scissors"; never "Let them…"). */
  refuseLabel: text.max(28, 'a button label is at most 28 characters'),
  /** Hangs on the Ledger row ("GIVE THEM BACK"); at most 24 characters. */
  picket: text.max(24, 'a picket slogan is at most 24 characters'),
  ...tags,
  note: z.string().optional(),
});
export type Grievance = z.infer<typeof GrievanceSchema>;

/** A scandal front page (2.8, 7.5 paper 11): headline and one dry line, as one text. */
export const FrontPageSchema = z.strictObject({
  id,
  office: deck.optional(),
  /** The newspaper's id in names.json (kind "newspaper"); omit to use the office's paper. */
  paper: id.optional(),
  text: paperText,
  ...tags,
  note: z.string().optional(),
});
export type FrontPage = z.infer<typeof FrontPageSchema>;

/** A sign label for a scandal ("Apologise on the steps"); the refuse label is always "Say nothing". */
export const ApologySchema = z.strictObject({ id, text: text.max(28, 'a button label is at most 28 characters'), note: z.string().optional() });
export type Apology = z.infer<typeof ApologySchema>;

/** A run-up (campaign) paper (2.10, 7.5 paper 12): a public appearance with exactly one {district}. */
export const RunUpSchema = z.strictObject({
  id,
  office: office.optional(),
  visitor: castId,
  text: paperText.refine((t) => (t.match(/\{district\}/g) ?? []).length === 1, 'a run-up paper names {district} exactly once'),
  ...tags,
  note: z.string().optional(),
});
export type RunUp = z.infer<typeof RunUpSchema>;

/** A rally (2.10): the last campaign paper. */
export const RallySchema = z.strictObject({
  id,
  office: office.optional(),
  visitor: castId,
  text: paperText,
  ...tags,
  note: z.string().optional(),
});
export type Rally = z.infer<typeof RallySchema>;

/** The slot syntax of a template frame: exactly one {list-id}. */
export const SLOT_RE = /\{([a-z][a-z0-9-]*)\}/g;
/** A template frame (2.7 draw step 5): a comic paper with ONE slot naming a phrase list. */
export const FrameSchema = z.strictObject({
  id,
  office: deck.optional(),
  /** Optional: the rules give the paper the club's spokesperson when omitted. */
  visitor: castId.optional(),
  club,
  other: club.optional(),
  archetype: z.enum(ARCHETYPES),
  frame: text.refine((t) => (t.match(SLOT_RE) ?? []).length === 1, 'a frame has exactly one slot, like {weekday}'),
  ...tags,
  note: z.string().optional(),
});
export type Frame = z.infer<typeof FrameSchema>;

/** A phrase list (7.7: 10 lists of 24). Phrase ids are `<list>.<index>`, 1-based. */
export const PhraseListSchema = z.strictObject({
  id,
  title: z.string().min(1),
  phrases: z.array(text.max(60, 'a phrase is at most 60 characters')).min(1),
  note: z.string().optional(),
});
export type PhraseList = z.infer<typeof PhraseListSchema>;

/** A rival (7.3): an individual with a hobby and a slogan, never a party or colour. */
export const RivalSchema = z.strictObject({
  id,
  office: office.optional(),
  /** The rival's name as printed ("Councillor Prudence Plumb"); every token is in names.json. */
  name: text,
  /** The role line ("Keeper of the Ceremonial Spoon") or the hobby. */
  hobby: text,
  /** "Plumb: She Owns A Hat". */
  slogan: text,
  /** "back for another go" line. */
  backAgain: text,
  /** The winner resigns over a hobby (2.10), never pressure, health or scandal. */
  resignation: text,
  note: z.string().optional(),
});
export type Rival = z.infer<typeof RivalSchema>;

/** A plain line with an id (returning-visitor, away, captions). */
export const LineSchema = z.strictObject({ id, text: text.max(120, 'a line is at most 120 characters'), note: z.string().optional() });
export type Line = z.infer<typeof LineSchema>;

/** An election-night line (30): who says it and when. */
export const NightLineSchema = z.strictObject({
  id,
  moment: z.enum(['open', 'held', 'lost', 'majority', 'defeat', 'any']),
  text: paperText,
  note: z.string().optional(),
});
export type NightLine = z.infer<typeof NightLineSchema>;

/** A monument of the vanity shelf (5.8, 24): its name and one line. */
export const MonumentSchema = z.strictObject({ id, name: text.max(40, 'a monument name is at most 40 characters'), text: paperText, note: z.string().optional() });
export type Monument = z.infer<typeof MonumentSchema>;

/** A Grand Project's line (2.2: the five names are fixed; the writer writes the line). */
export const GrandProjectLineSchema = z.strictObject({ id, name: text, text, note: z.string().optional() });

/** A twist (2.14; names fixed): its result-sheet line. */
export const TwistSchema = z.strictObject({ id, name: text, text, note: z.string().optional() });
export type Twist = z.infer<typeof TwistSchema>;

/** A pair of twists (2.14: 45) and the name the pair is announced with. */
export const TwistPairSchema = z.strictObject({ id, a: id, b: id, name: text, note: z.string().optional() });
export type TwistPair = z.infer<typeof TwistPairSchema>;

/** A place name writer 2 adds (7.1: the 7 counties, and others): also goes into names.json. */
export const PlaceSchema = z.strictObject({
  id,
  office: office.optional(),
  kind: z.enum(['county', 'province', 'ward', 'town', 'landmark']),
  name: text,
  /** The two-letter badge on a district chip ("HT"). */
  short: z.string().regex(/^[A-Z]{2}$/, 'a badge is two capital letters, like "HT"').optional(),
  note: z.string().optional(),
});
export type Place = z.infer<typeof PlaceSchema>;

// ------------------------------------------------------------------------------------------------
// Sections, files, batches
// ------------------------------------------------------------------------------------------------

/** Every section a file or a batch can hold, with its record schema. */
export const SECTION_SCHEMAS = {
  papers: ComicPaperSchema,
  scripted: ScriptedPaperSchema,
  chains: ChainSchema,
  notes: FormNoteSchema,
  applications: ApplicationSchema,
  grievances: GrievanceSchema,
  frontPages: FrontPageSchema,
  apologies: ApologySchema,
  runUp: RunUpSchema,
  rallies: RallySchema,
  frames: FrameSchema,
  lists: PhraseListSchema,
  rivals: RivalSchema,
  night: NightLineSchema,
  returning: LineSchema,
  away: LineSchema,
  monuments: MonumentSchema,
  grandProjects: GrandProjectLineSchema,
  twists: TwistSchema,
  twistPairs: TwistPairSchema,
  captions: LineSchema,
  places: PlaceSchema,
} as const;
export type SectionName = keyof typeof SECTION_SCHEMAS;
export const SECTION_NAMES = Object.keys(SECTION_SCHEMAS) as SectionName[];
export type Sections = { [K in SectionName]?: z.infer<(typeof SECTION_SCHEMAS)[K]>[] };

/** Sections each assembled file of 9.2 W holds. */
export const FILE_SECTIONS: Record<string, readonly SectionName[]> = {
  'papers.mayor': ['papers', 'scripted'],
  'papers.governor': ['papers', 'scripted'],
  'papers.president': ['papers', 'scripted'],
  'papers.any': ['papers'],
  chains: ['chains'],
  forms: ['notes', 'applications'],
  events: ['grievances', 'frontPages', 'apologies'],
  campaign: ['runUp', 'rallies'],
  templates: ['frames'],
  phrases: ['lists'],
  lines: ['rivals', 'night', 'returning', 'away', 'monuments', 'grandProjects', 'twists', 'twistPairs', 'captions', 'places'],
};
export const AUTHORING_FILES = Object.keys(FILE_SECTIONS);

/** The office a papers.<deck>.json file is for. */
export function fileDeck(fileKey: string): Deck | undefined {
  const m = /^papers\.(mayor|governor|president|any)$/.exec(fileKey);
  return m ? (m[1] as Deck) : undefined;
}

/** A batch header (one writer per batch file). */
export const BatchHeaderSchema = z.strictObject({
  batch: id,
  writer: z.string().min(1),
  /** The deck the batch's records belong to by default; omit for office-free lines. */
  office: deck.optional(),
  note: z.string().optional(),
});
export type BatchHeader = z.infer<typeof BatchHeaderSchema>;

/** A whole batch file, for reference and for tests; check.ts validates record by record. */
export const BatchSchema = BatchHeaderSchema.extend(
  Object.fromEntries(SECTION_NAMES.map((s) => [s, z.array(SECTION_SCHEMAS[s]).optional()])) as {
    [K in SectionName]: z.ZodOptional<z.ZodArray<(typeof SECTION_SCHEMAS)[K]>>;
  },
);
export type Batch = z.infer<typeof BatchSchema>;

/** The header of an assembled file: papers.<deck>.json carries its office; others none. */
export const FileHeaderSchema = z.strictObject({
  $comment: z.string().optional(),
  office: deck.optional(),
});

// ------------------------------------------------------------------------------------------------
// names.json
// ------------------------------------------------------------------------------------------------

export const NAME_KINDS = [
  'country', 'motto', 'currency', 'emblem', 'tune', 'town', 'ward', 'province', 'county', 'capital', 'place',
  'newspaper', 'honour', 'club', 'ministry', 'grand-project', 'company', 'committee', 'cast', 'record',
  'twist', 'title', 'other',
] as const;
export type NameKind = (typeof NAME_KINDS)[number];

/**
 * The check record of a name (7.1): one entry per list it was checked against (politicians of any
 * rank; notorious public figures; famous fictional politicians and civil servants; places and
 * characters of children's fiction), the date and the checker. `cleared` lists near-matches the lint
 * found (edit distance 1, sound-alike) that the checker read and accepted, with the reason.
 * Empty until the sensitivity editor fills it; nothing here may claim a person checked what no
 * person checked (D9).
 */
export const NameCheckSchema = z.strictObject({
  politicians: z.string().nullable(),
  notorious: z.string().nullable(),
  fiction: z.string().nullable(),
  children: z.string().nullable(),
  date: z.string().nullable(),
  checker: z.string().nullable(),
  cleared: z.array(z.strictObject({ similar: z.string(), reason: z.string() })),
});
export type NameCheck = z.infer<typeof NameCheckSchema>;
export const EMPTY_CHECK: NameCheck = {
  politicians: null, notorious: null, fiction: null, children: null, date: null, checker: null, cleared: [],
};

export const NameEntrySchema = z.strictObject({
  name: z.string().min(1),
  kind: z.enum(NAME_KINDS),
  /** Cast members: the id papers use as `visitor`; ministries, Grand Projects, twists: the id notes and plan.json use. */
  id: refId.optional(),
  /** The runtime id of src/config/schema.decree.ts where it differs (a ministry "town_clock"), for build-office.py. */
  ref: refId.optional(),
  /** Cast: the role line under the name on a paper (≤ 28 characters, 2.7). */
  role: z.string().optional(),
  /** Cast: player | advisor | spokesperson | lobbyist | minister | rival | other. */
  group: z.enum(['player', 'advisor', 'spokesperson', 'lobbyist', 'minister', 'rival', 'other']).optional(),
  club: club.optional(),
  office: deck.optional(),
  /** Two-letter district badge. */
  short: z.string().optional(),
  check: NameCheckSchema,
  note: z.string().optional(),
});
export type NameEntry = z.infer<typeof NameEntrySchema>;
export const NamesFileSchema = z.strictObject({
  $comment: z.string().optional(),
  names: z.array(NameEntrySchema),
});
export type NamesFile = z.infer<typeof NamesFileSchema>;

// ------------------------------------------------------------------------------------------------
// Normalised content: what the lint and the checks read
// ------------------------------------------------------------------------------------------------

/** Records of one file or batch after validation, with the deck each belongs to. */
export interface ContentUnit {
  /** File path or label, for findings. */
  source: string;
  /** Default deck (batch header office, or the papers file's office). */
  office?: Deck;
  sections: Sections;
  /** Extra strings to lint (UI strings, store text), each with an id. */
  strings?: ExtraString[];
  /** Records that failed the schema: linted on their text only, best effort. */
  loose?: LooseRecord[];
}
export interface ExtraString {
  id: string;
  text: string;
  /** `store` adds the store-text list (audit, office empire, processing, document). */
  field: 'ui' | 'store' | 'name' | 'text';
}
export interface LooseRecord {
  id: string;
  section: SectionName;
  texts: { field: string; text: string }[];
}

/** A plain sentence for a zod issue, with the field path. */
export function describeIssue(issue: z.core.$ZodIssue): string {
  const where = issue.path.length ? issue.path.join('.') : 'record';
  if (issue.code === 'unrecognized_keys') {
    const keys = (issue as { keys: string[] }).keys;
    const numeric = keys.filter((k) => NUMBER_KEYS.includes(k));
    if (numeric.length) {
      return `${where}: remove ${numeric.map((k) => `"${k}"`).join(', ')}: numbers and effects come from the archetype table (2.2), never from the writer; pick the archetype instead (a refusal never costs money)`;
    }
    return `${where}: unknown field ${keys.map((k) => `"${k}"`).join(', ')} (see format.ts for the fields of this record)`;
  }
  if (issue.code === 'invalid_type' && /received undefined/.test(issue.message)) return `${where}: missing`;
  return `${where}: ${issue.message}`;
}

/** Every text field of a record, for the loose lint of an invalid record. */
export function textsOf(rec: unknown): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string') {
      if (!/^(id|visitor|cosigner|club|other|archetype|subject|butt|shape|office|setsUp|form|ministry|minister|paper|moment|kind|short|a|b|note)$/.test(path.split('.').pop() ?? '')) out.push({ field: path, text: v });
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}.${i}`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(rec, '');
  return out;
}
