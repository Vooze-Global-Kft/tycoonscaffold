/**
 * Config for merge mode (Night Market, store title "Lantern Row"; docs/design/market-design.md
 * section 2): the game data's `merge` block. The shared schema (./schema.ts) keeps the block
 * opaque; the merge engine mode parses it with this schema when the merge entry installs it
 * (src/engine/mergeMode.ts `config`), so no other game's bundle carries it (a merge-mode file:
 * scripts/lib/modes.js MODE_FOLDERS.merge).
 *
 * Every number the specification marks (tune) is a field here whose default is its starting value,
 * and its allowed range is in `RANGES` (plain JSON: the field path, low, high), which
 * scripts/content/build-night.py and the tests read: build-night.py moves a (tune) number only
 * inside its range (spec conventions). A number without (tune) is a rule: it is a field too, so the
 * rules read every number from one place, but it has no range and build-night.py never moves it.
 * Rules are code in src/engine/merge.
 *
 * Indexing (spec conventions): chains 0 to 5 in data (Grill 0 ... Puffs 5), tiers 1 to 8, seasons
 * 0-based in state and in this table (the Festival of season 1 on screen is `festival[0]`).
 * Decision M5: no Pocket anywhere (lantern 14 gives a fourth gift-box slot, lantern 16 Lucky 1 in 16).
 *
 * Written by the skeleton; owned afterwards by the rules package MECHANICS (fields, defaults that
 * are rules, RANGES, lintMerge). The starting content (`MERGE_STARTING_CONTENT`, names and
 * starting values) is in ./merge.content.ts, owned by the numbers package, so the two can be
 * edited at the same time. docs/design/market-build-plan.md.
 */
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9_]+$/);
const pos = z.number().positive();
const nonneg = z.number().nonnegative();
const prob = z.number().min(0).max(1);
const int = z.number().int();
/** A chain index 0 to 5. */
const chainIx = int.min(0).max(5);
/** A tier 1 to 8. */
const tier = int.min(1).max(8);
const good = z.object({ chain: chainIx, tier });

/** One chain of goods (spec 2.2): its gear, eight tier names and its minder (2.2, 7.2). */
export const MergeChainSchema = z.object({
  id,
  /** The chain's short name ("Grill"), shown in shutter conditions ("Grill 3") and sheets. */
  name: z.string(),
  /** The gear's name ("Ember Grill"). */
  gear: z.string(),
  /** Tier names, tier 1 first: exactly eight. */
  tiers: z.array(z.string()).length(8),
  /** The minder of this stall (2.2): a name and the animal drawn (`beast:` names of the art kit). */
  minder: z.object({ name: z.string(), beast: id }),
  /** The first season (0-based) the stall can be opened in: 0, except Puffs (season 2 on screen: 1). */
  fromSeason: int.min(0).default(0),
});

/** A shutter group (spec 2.2 table): its cells in opening order and the condition printed on it. */
export const ShutterGroupSchema = z.object({
  /** Board cells i = row * 7 + col, in the order they open (index order within the group). */
  cells: z.array(int.min(0).max(55)).min(1),
  /** "Grill 3" (a tier of a chain ever made) or "Steamer open" (a stall open). */
  condition: z.discriminatedUnion('type', [
    z.object({ type: z.literal('tierMade'), chain: chainIx, tier }),
    z.object({ type: z.literal('chainOpen'), chain: chainIx }),
  ]),
});

/** What a lantern's feat counts (spec 5.3). */
export const LanternFeatSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tickets'), count: int.positive() }),
  z.object({ type: z.literal('tierMade'), tier }),
  z.object({ type: z.literal('discover'), count: int.positive() }),
  z.object({ type: z.literal('merges'), count: int.positive() }),
  z.object({ type: z.literal('seasonsClosed'), count: int.positive() }),
  z.object({ type: z.literal('ladderComplete') }),
  z.object({ type: z.literal('parades'), count: int.positive() }),
  z.object({ type: z.literal('allMinders') }),
  z.object({ type: z.literal('threeLineTickets'), count: int.positive() }),
  z.object({ type: z.literal('allShutters') }),
  z.object({ type: z.literal('tier8sInSeason'), count: int.positive() }),
]);

/**
 * What a lit lantern changes (spec 5.3 with Decision M5). Each names one field of `Mods`
 * (src/engine/merge/types.ts) and its value with the lantern lit; `startOpen` names a chain.
 */
export const LanternEffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('counters'), value: int.min(2).max(4) }),
  z.object({ type: z.literal('basketShare'), value: prob }),
  z.object({ type: z.literal('shelfCap'), value: int.positive() }),
  z.object({ type: z.literal('paradeEvery'), value: pos }),
  z.object({ type: z.literal('awayHours'), value: pos }),
  z.object({ type: z.literal('luckyOdds'), value: pos }),
  z.object({ type: z.literal('startOpen'), chain: chainIx }),
  z.object({ type: z.literal('seasonedSteps'), value: int.positive() }),
  z.object({ type: z.literal('paradeMultiplier'), value: pos }),
  z.object({ type: z.literal('mindersStartHired') }),
  z.object({ type: z.literal('ripeAdd'), value: nonneg }),
  z.object({ type: z.literal('betaAdd'), value: nonneg }),
  z.object({ type: z.literal('giftSlots'), value: int.positive() }),
  z.object({ type: z.literal('minderIntervalMult'), value: pos }),
  z.object({ type: z.literal('sparkTiers'), value: int.positive() }),
  /** Lantern 18 before Decision M37 (a purse multiplier); accepted and read as `festivalSparks` FESTIVAL_SPARKS_LANTERN (the value is ignored). */
  z.object({ type: z.literal('festivalPurseMult'), value: pos.optional() }),
  /** Lantern 18 (Decision M37): filling the Festival gives this many Lucky Sparks (5) instead of `festivalSparks`. */
  z.object({ type: z.literal('festivalSparks'), value: int.positive() }),
  /** Lantern 19 before Decision M24 (an absolute N); accepted and read as `giftEveryMult` 0.8 (the value is ignored). */
  z.object({ type: z.literal('giftEvery'), value: int.positive().optional() }),
  /** Lantern 19 (Decision M24): gift boxes come a fifth sooner, N' = ceil(gift.every × value), value 0.8. */
  z.object({ type: z.literal('giftEveryMult'), value: z.number().gt(0).lt(1) }),
  z.object({ type: z.literal('ticketPay'), value: pos }),
]);

export const LanternSchema = z.object({
  /** 1 to 20, the hook on the Lantern Gate. */
  n: int.min(1).max(20),
  feat: LanternFeatSchema,
  effect: LanternEffectSchema,
  /** Counts as something new for gate 6 (spec 3.3, 5.3 "New"). */
  isNew: z.boolean().default(false),
});

export const SEASON_SHAPES = ['rectangle', 'moonGate', 'hearth'] as const;
export const SEASON_CHARACTERS = ['none', 'fireflies', 'harvest', 'warmGear', 'lateCrowd', 'marketDay'] as const;

/** One season of the table (spec 2.11). */
export const SeasonRowSchema = z.object({
  name: z.string(),
  shape: z.enum(SEASON_SHAPES),
  character: z.enum(SEASON_CHARACTERS),
  // The Season scroll's sentence about the place is interface text: src/ui/merge/strings.ts, by character (spec 7.3).
});

const lineOdds = z.tuple([prob, prob, prob]).refine(([a, b, c]) => Math.abs(a + b + c - 1) < 1e-9, 'line odds must add up to 1');

export const MergeSchema = z.object({
  /** The six chains, Grill first (spec 2.2). */
  chains: z.array(MergeChainSchema).length(6),
  /** value(c, k) = base × chainStep^c × tierGrowth^(k−1) × stall bonus (spec 2.2, 2.3). */
  values: z.object({
    /** v_0, the Grill's tier-1 value (rule; the chain step derives the others). */
    base: pos.default(5),
    /** (tune 3 to 5) */
    chainStep: pos.default(4),
    /** g (tune 2.2 to 2.6, above 2) */
    tierGrowth: pos.default(2.4),
  }).prefault({}),
  board: z.object({
    cols: z.literal(7).default(7),
    rows: z.literal(8).default(8),
    /** The cells open at the first start (columns 0 to 5, rows 2 to 6: 30 cells). */
    open: z.array(int.min(0).max(55)).min(1),
    /** The four shutter groups of 2.2, in order (shutter n counts across groups). */
    shutterGroups: z.array(ShutterGroupSchema).length(4),
    /** Shutter n costs shutterBase × shutterGrowth^n (shutterGrowth: tune 1.40 to 1.50). */
    shutterBase: pos.default(30),
    shutterGrowth: pos.default(1.45),
    /** Every third shutter (n = 2, 5, 8, ...) holds a good of tier b + 1 or b + 2 (60/40). */
    goodEvery: int.positive().default(3),
    goodFirst: int.min(0).default(2),
    goodNearShare: prob.default(0.6),
  }),
  costs: z.object({
    /**
     * Open stall i (i = 1 to 5, Tea to Puffs): stallOpen[i − 1] × F_s (Decision M23: a table of five
     * tuned costs, not a ratio). Rounded once by roundCoins (M19).
     */
    stallOpen: z.array(pos).length(5).default([120, 3200, 51_200, 819_000, 13_100_000]),
    /** Removed by Decision M23 (the stall table replaces the ratio); accepted and ignored until the content drops them. */
    stallBase: pos.optional(),
    stallRatio: pos.optional(),
    /** Gear level L → L+1: gearBase × r_c × gearGrowth^(L−1), L 1 to 39 (M27: gearBase and gearGrowth 1.40 to 1.70 are tunable). r_c = v_c / 5. */
    gearBase: pos.default(20),
    gearGrowth: pos.default(1.45),
    /** The top gear level (rule, Decision M28: 40; the last purchase is 39 → 40). */
    gearMaxLevel: int.positive().default(40),
    /** Stall level M → M+1: stallLevelBase × r_c × stallLevelGrowth^(M−1), M 1 to 30 (M27: tunable, growth 1.30 to 1.50). */
    stallLevelBase: pos.default(50),
    stallLevelGrowth: pos.default(1.35),
    stallMaxLevel: int.positive().default(31),
    /** Minder hire: minderBase × r_c; level K → K+1: minderBase × r_c × minderGrowth^K, K 1 to 3 (tune 2.5 to 3.5). */
    minderBase: pos.default(150),
    minderGrowth: pos.default(3),
    minderMaxLevel: int.positive().default(4),
    /** Round below this to a whole coin (half up), above to `sigDigits` significant digits (2.2). */
    roundBelow: pos.default(1000),
    sigDigits: int.positive().default(3),
  }).prefault({}),
  gear: z.object({
    /** T = 4 s for every gear, a rule (Decision M3: not a knob), never changed by level. */
    interval: pos.default(4),
    /** s, levels per base step (tune 8 to 12). */
    step: int.positive().default(10),
    /** p per level within a step (tune 0.04 to 0.06). */
    ripePerLevel: prob.default(0.05),
    /** p is at most this with all bonuses (rule). */
    ripeMax: prob.default(0.6),
    /** The highest base tier (rule). */
    maxBase: tier.default(4),
    /** The shelf (rule: 6, 8 with lantern 3). */
    shelf: int.positive().default(6),
    /** λ, loose goods per chain before drops go to the shelf (tune 3 to 6). */
    looseCap: int.positive().default(4),
    /** Shelf release and gift-good cadence, s (rule). */
    release: pos.default(0.5),
  }).prefault({}),
  stalls: z.object({
    /** S_c = 1 + bonusPerLevel × (M − 1), at most bonusMax (rule). */
    bonusPerLevel: nonneg.default(0.1),
    bonusMax: pos.default(3.9),
    /**
     * The stall levels from which the awning has its second and third look (looks only, Decision
     * M29: three looks, levels 1 to 4 plain, 5 to 9 scalloped, 10 and up double). Only the first two
     * entries are read (`awningLook`).
     */
    awningLevels: z.array(int.positive()).min(2).default([5, 10]),
  }).prefault({}),
  minders: z.object({
    /** Q, s between sales (tune 10 to 25). */
    interval: pos.default(15),
    /** The till joins the purse at each whole minute of the season clock (rule). */
    tillRoll: pos.default(60),
  }).prefault({}),
  merges: z.object({
    /** Lucky: 1 in luckyOdds merges goes two tiers up (rule; 20 with lantern 7, 16 with lantern 16, 12 in a Fireflies season). */
    luckyOdds: pos.default(25),
  }).prefault({}),
  basket: z.object({
    /** A Basket sale pays this share of value (rule; 0.4 with lantern 2). */
    share: prob.default(0.25),
    /** The undo chip's life, s (rule). */
    undoSeconds: pos.default(4),
  }).prefault({}),
  tickets: z.object({
    /** Counters at the first start (lanterns 1 and 4 add the third and fourth). */
    counters: int.min(1).max(4).default(2),
    /** A ticket is drawn when a counter has been empty this long, s (tune 2 to 8). */
    refillDelay: pos.default(4),
    /** Lines 1, 2, 3: odds while the season clock < lateFrom, then late (tune ±10 points each). */
    lineOddsEarly: lineOdds.default([0.6, 0.35, 0.05]),
    lineOddsLate: lineOdds.default([0.45, 0.4, 0.15]),
    lateFrom: pos.default(1800),
    /** Chain weight of the two highest open chains, the others 1 (tune 2 to 4). */
    topChainWeight: pos.default(3),
    /** γ, P(k) ∝ γ^(k − kmin) (tune 0.7 to 1.4). */
    gamma: pos.default(1),
    /** The stretch line's chance (tune 0.10 to 0.25). */
    stretch: prob.default(0.15),
    /** β, the multi-line bonus (tune 0.10 to 0.25). */
    beta: nonneg.default(0.15),
    /** W, s of gear output a chain may owe (tune 120 to 300). */
    outputWindow: pos.default(180),
    /** H, hand actions a ticket may need (tune 40 to 90). */
    handActions: pos.default(60),
    /** R, cells kept free (tune 4 to 8). */
    spareCells: int.min(0).default(6),
    /** "Not tonight" cooldown per counter, s (tune 15 to 120). */
    notTonightCooldown: pos.default(30),
    /**
     * The customers drawn on tickets, as species names, and their coat colours each. A ticket's
     * customer icon is `customerIcon(species, coat)` → "beast:<species>-<coat>" (src/ui/merge/art/icons.ts);
     * a bare "beast:<species>" is that species' MINDER portrait, never a customer.
     */
    customers: z.array(id).min(1).default(['fox', 'hedgehog', 'badger', 'otter', 'bat', 'owl']),
    coats: int.positive().default(3),
  }).prefault({}),
  parade: z.object({
    /** Due every this many s of season clock (tune 480 to 840); the first at `first`. */
    every: pos.default(600),
    first: pos.default(360),
    /** Pays this many times its price (rule; 2.5 with lantern 10). */
    multiplier: pos.default(2),
    /** Lines (rule; 2 when only 2 chains are open). */
    lines: int.positive().default(3),
    /** Its own bounds (b): W and H (rule). */
    outputWindow: pos.default(360),
    handActions: pos.default(100),
  }).prefault({}),
  /**
   * The Festival of each season, season 1 first (spec 2.8): build-night.py writes the rows after
   * season 2 inside 2.8's ranges. A season past the last row uses the last row (decision of the
   * skeleton, for the ORDERS package to confirm: section 2.8 leaves it to the table).
   */
  festival: z.array(z.array(good).min(1).max(6)).min(1),
  /**
   * Filling the Festival gives this many Lucky Sparks (rule, Decision M37: 3; 5 with lantern 18)
   * and no coins: the Festival purse is gone and `festivalPace` is no longer a knob.
   */
  festivalSparks: int.min(0).default(3),
  /** Removed by Decision M37 (the Festival pays no coins); accepted and ignored until the content drops it. */
  festivalPace: nonneg.optional(),
  gift: z.object({
    /** One box per this many paid tickets (Decision M24: N, tune 15 to 40, start 25; a fifth sooner with lantern 19). */
    every: int.positive().default(25),
    /** Slots per box (rule; 4 with lantern 14, Decision M5). */
    slots: int.positive().default(3),
    /** Slot odds: coins, a good, a Lucky Spark (rule). */
    odds: z.object({ coins: prob.default(0.5), good: prob.default(0.35), spark: prob.default(0.15) }).prefault({}),
    /** A good slot's tier above the chain's base: +2, +3, +4 at these odds (rule), capped at the chain's best. */
    goodSteps: z.array(int.positive()).default([2, 3, 4]),
    goodOdds: z.array(prob).default([0.6, 0.3, 0.1]),
    /** A coin slot = coinPace × U when the box is earned (Decision M24: m, tune 0.25 to 1.5, start 0.5). */
    coinPace: pos.default(0.5),
  }).prefault({}),
  /** The 20 lanterns of spec 5.3 with Decision M5. */
  lanterns: z.array(LanternSchema).length(20),
  seasons: z.object({
    /** Seasons 1 to 16; from `repeatFrom` (0-based) on, the table repeats (season 17 = season 2). */
    table: z.array(SeasonRowSchema).min(1),
    repeatFrom: int.min(0).default(1),
    /** The moon gate's stone cells (always open cells; spec 2.11). */
    moonGateCells: z.array(int.min(0).max(55)).default([23, 24]),
    /** A season character's numbers (spec 2.11; rules). */
    fireflies: z.object({ luckyOdds: pos.default(12) }).prefault({}),
    harvest: z.object({ threeLineShare: prob.default(0.25), betaAdd: nonneg.default(0.1) }).prefault({}),
    warmGear: z.object({ ripeAdd: nonneg.default(0.15) }).prefault({}),
    lateCrowd: z.object({ minderIntervalMult: pos.default(0.67) }).prefault({}),
    marketDay: z.object({ paradeEvery: pos.default(300) }).prefault({}),
    /** Seasoned gear: a step per closed season that reached `stepTier`, up to maxSteps (tune 2 to 4), each worth N = gear.step levels (Decision M25). */
    stepTier: tier.default(6),
    maxSteps: int.positive().default(3),
    /** N before Decision M25 (N = s): unread, and when given it must equal `gear.step` (lintMerge). */
    levelsPerStep: int.positive().optional(),
    /** Familiar faces: stall-opening costs × familiarBase^min(seasons closed, familiarMax) (base: tune 0.75 to 0.90). */
    familiarBase: pos.default(0.85),
    familiarMax: int.positive().default(4),
    /** The opening board of a season: this many goods of the grill's starting base tier (rule). */
    openingGoods: int.min(0).default(6),
  }),
  ads: z.object({
    /** "Fill one line": cooldown in s of play (rule). */
    fillLineCooldown: pos.default(300),
    /** "Gear rush": each open gear drops up to this many base-tier goods now; cooldown in s of play (rule). */
    gearRushGoods: int.positive().default(6),
    gearRushCooldown: pos.default(900),
    /** "Call the dragon" (Decision M14): brings the Parade now when none is out; cooldown in s of play (rule). */
    callDragonCooldown: pos.default(1200),
    /** The away report's ad adds this share (EngineMode.offlineAdMultiplier = 1 + awayBonus; Decision M8). */
    awayBonus: nonneg.default(0.5),
  }).prefault({}),
  away: z.object({
    /** The away cap, h (rule; +2 h with lantern 6, +4 h with Late Hours). */
    capHours: pos.default(4),
    lateHoursHours: pos.default(4),
  }).prefault({}),
  advice: z.object({
    /** Φ, s, the new-stall gain divisor (tune 20 to 60). */
    newStallPhi: pos.default(40),
    /** κ, the shutter gain constant (build-night.py iterates it and prints it). */
    shutterKappa: pos.default(1),
  }).prefault({}),
  /** The products this mode reads from `entitlements.products` (spec 5.7). */
  /**
   * The products this mode reads from `entitlements.products` (spec 5.7, Decision M13). Awnings is
   * looks only (kind cosmetic); Late Hours adds away hours (kind unlock, `entitle` applies it now);
   * Quiet Evening is the shared kind skipAds, honoured by the shared ads service (the rules never
   * read it; it is named here so the shop and the tests find it).
   */
  products: z.object({
    awnings: z.string().default('night_awnings'),
    lateHours: z.string().default('night_late_hours'),
    quietEvening: z.string().default('night_quiet_evening'),
  }).prefault({}),
  // --- META (rules package META: lanterns, seasons, gift boxes, advice; added, nothing above changed) ---
  /** Rules numbers only the META files read (src/engine/merge/{lanterns,season,gift,advice,hints}.ts). */
  meta: z.object({
    /** Lantern 19 (Decision M24): gift boxes come this share sooner, N' = ceil(N × (1 − giftSooner)) (rule: "a fifth"). */
    giftSooner: prob.default(0.2),
    /** advice: a lantern feat is "within reach" (offered as an extra goal) from this share of its progress (rule of the META package; 2.10 leaves it open). */
    lanternReach: prob.default(0.5),
  }).prefault({}),
  // --- end META ---
});

export type MergeContent = z.output<typeof MergeSchema>;
export type MergeContentInput = z.input<typeof MergeSchema>;
export type MergeChain = z.output<typeof MergeChainSchema>;
export type ShutterGroup = z.output<typeof ShutterGroupSchema>;
export type Lantern = z.output<typeof LanternSchema>;
export type LanternFeat = z.output<typeof LanternFeatSchema>;
export type LanternEffect = z.output<typeof LanternEffectSchema>;
export type SeasonRow = z.output<typeof SeasonRowSchema>;
export type SeasonShape = (typeof SEASON_SHAPES)[number];
export type SeasonCharacter = (typeof SEASON_CHARACTERS)[number];

/** Lantern 18's Lucky Sparks when the content still names its effect by the old purse multiplier (Decision M37: "5 with lantern 18"). */
export const FESTIVAL_SPARKS_LANTERN = 5;

/**
 * The allowed range of every (tune) number of the specification: a field path of the `merge`
 * block (dots; `[i]` for a list element), its low and high bound and the section that sets it.
 * Plain JSON, so build-night.py can read it (`npx tsx -e` prints it) and tests check the defaults
 * sit inside. A range is never widened silently (spec conventions).
 */
export const RANGES: readonly { path: string; low: number; high: number; spec: string }[] = [
  { path: 'values.chainStep', low: 3, high: 5, spec: '2.2' },
  { path: 'values.tierGrowth', low: 2.2, high: 2.6, spec: '2.2' },
  { path: 'board.shutterGrowth', low: 1.4, high: 1.5, spec: '2.2' },
  // Decision M23: the stall-opening table. The lead has set no range yet: x0.5 to x2 around the starting table (the numbers package's proposal) until the lead does.
  { path: 'costs.stallOpen[0]', low: 60, high: 240, spec: 'M23' },
  { path: 'costs.stallOpen[1]', low: 1600, high: 6400, spec: 'M23' },
  { path: 'costs.stallOpen[2]', low: 25_600, high: 102_400, spec: 'M23' },
  { path: 'costs.stallOpen[3]', low: 409_500, high: 1_638_000, spec: 'M23' },
  { path: 'costs.stallOpen[4]', low: 6_550_000, high: 26_200_000, spec: 'M23' },
  // Decision M27: the four base costs (x0.5 to x4) and the two growths are tunable.
  { path: 'costs.gearBase', low: 10, high: 80, spec: 'M27' },
  { path: 'costs.stallLevelBase', low: 25, high: 200, spec: 'M27' },
  { path: 'costs.minderBase', low: 75, high: 600, spec: 'M27' },
  { path: 'board.shutterBase', low: 15, high: 120, spec: 'M27' },
  { path: 'costs.gearGrowth', low: 1.4, high: 1.7, spec: 'M27' },
  { path: 'costs.stallLevelGrowth', low: 1.3, high: 1.5, spec: 'M27' },
  { path: 'costs.minderGrowth', low: 2.5, high: 3.5, spec: '2.2' },
  // gear.interval is not here: T = 4 s is a rule (Decision M3; lintMerge checks it).
  { path: 'gear.step', low: 8, high: 12, spec: '2.2' },
  { path: 'gear.ripePerLevel', low: 0.04, high: 0.06, spec: '2.2' },
  { path: 'gear.looseCap', low: 3, high: 6, spec: '2.3' },
  { path: 'minders.interval', low: 10, high: 25, spec: '2.2' },
  { path: 'tickets.refillDelay', low: 2, high: 8, spec: '2.7' },
  { path: 'tickets.lineOddsEarly[0]', low: 0.5, high: 0.7, spec: '2.7' },
  { path: 'tickets.lineOddsEarly[1]', low: 0.25, high: 0.45, spec: '2.7' },
  { path: 'tickets.lineOddsEarly[2]', low: 0, high: 0.15, spec: '2.7' },
  { path: 'tickets.lineOddsLate[0]', low: 0.35, high: 0.55, spec: '2.7' },
  { path: 'tickets.lineOddsLate[1]', low: 0.3, high: 0.5, spec: '2.7' },
  { path: 'tickets.lineOddsLate[2]', low: 0.05, high: 0.25, spec: '2.7' },
  { path: 'tickets.topChainWeight', low: 2, high: 4, spec: '2.7' },
  { path: 'tickets.gamma', low: 0.7, high: 1.4, spec: '2.7' },
  { path: 'tickets.stretch', low: 0.1, high: 0.25, spec: '2.7' },
  { path: 'tickets.beta', low: 0.1, high: 0.25, spec: '2.3' },
  { path: 'tickets.outputWindow', low: 120, high: 300, spec: '2.7 (b)' },
  { path: 'tickets.handActions', low: 40, high: 90, spec: '2.7 (b)' },
  { path: 'tickets.spareCells', low: 4, high: 8, spec: '2.7 (c)' },
  { path: 'tickets.notTonightCooldown', low: 15, high: 120, spec: '2.7' },
  { path: 'parade.every', low: 480, high: 840, spec: '2.7' },
  // festivalPace is not here: the Festival pays no coins (Decision M37).
  { path: 'festival[1][4].tier', low: 3, high: 5, spec: '2.8 (season 2: the Puffs line)' },
  { path: 'gift.coinPace', low: 0.25, high: 1.5, spec: 'M24' },
  { path: 'gift.every', low: 15, high: 40, spec: 'M24' },
  { path: 'seasons.maxSteps', low: 2, high: 4, spec: '2.11' },
  // seasons.levelsPerStep is not here: N equals the gear step s (Decision M25; lintMerge checks it).
  { path: 'seasons.familiarBase', low: 0.75, high: 0.9, spec: '2.11' },
  { path: 'advice.newStallPhi', low: 20, high: 60, spec: '2.10' },
];

/** The value at a RANGES path (`a.b[1].c`), or undefined. For tests and build-night.py. */
export function valueAt(block: unknown, p: string): unknown {
  let v: unknown = block;
  for (const part of p.replace(/\[(\d+)\]/g, '.$1').split('.')) {
    if (v === null || typeof v !== 'object') return undefined;
    v = (v as Record<string, unknown>)[part];
  }
  return v;
}

/** Cross-field checks of a parsed block (the game-data lint, src/config/lint.ts, prints them). */
export function lintMerge(m: MergeContent): string[] {
  const out: string[] = [];
  for (const r of RANGES) {
    const v = valueAt(m, r.path);
    if (typeof v !== 'number') out.push(`${r.path}: missing (a tune number of spec ${r.spec})`);
    else if (v < r.low - 1e-9 || v > r.high + 1e-9) out.push(`${r.path} = ${v} is outside its range ${r.low} to ${r.high} (spec ${r.spec}); ranges are never widened silently`);
  }
  if (!(m.values.tierGrowth > 2)) out.push('values.tierGrowth must be above 2 (each tier up must pay more per basic good)');
  const cells = new Set<number>();
  for (const i of [...m.board.open, ...m.board.shutterGroups.flatMap((g) => g.cells)]) {
    if (cells.has(i)) out.push(`board cell ${i} is listed twice (open cells and shutters are disjoint)`);
    cells.add(i);
  }
  if (cells.size !== m.board.cols * m.board.rows) out.push(`the open cells and the shutters cover ${cells.size} of ${m.board.cols * m.board.rows} cells`);
  const ns = m.lanterns.map((l) => l.n);
  if (new Set(ns).size !== 20) out.push('lanterns must be numbered 1 to 20, once each');
  const lineSum = (o: readonly number[]) => o.reduce((a, b) => a + b, 0);
  if (Math.abs(lineSum(m.gift.goodOdds) - 1) > 1e-9 || m.gift.goodOdds.length !== m.gift.goodSteps.length) out.push('gift.goodOdds must add up to 1, one per gift.goodSteps');
  if (Math.abs(m.gift.odds.coins + m.gift.odds.good + m.gift.odds.spark - 1) > 1e-9) out.push('gift.odds must add up to 1');
  const sums = m.festival.map((lines) => lines.reduce((a, l) => a + l.tier, 0));
  for (let s = 1; s < sums.length; s++) if (sums[s] < sums[s - 1]) out.push(`festival[${s}]: the sum of tiers falls from the season before (spec 2.8)`);
  // Rules the lead fixed in section 11 (MECHANICS): numbers that are fields but not knobs.
  if (m.gear.interval !== 4) out.push(`gear.interval = ${m.gear.interval}: T is 4 s for every gear, a rule (Decision M3)`);
  if (m.costs.gearMaxLevel !== 40) out.push(`costs.gearMaxLevel = ${m.costs.gearMaxLevel}: gear level 40 is the top (Decision M28)`);
  if (m.seasons.levelsPerStep !== undefined && m.seasons.levelsPerStep !== m.gear.step) out.push(`seasons.levelsPerStep = ${m.seasons.levelsPerStep} must equal gear.step = ${m.gear.step} (Decision M25: N = s)`);
  if (m.costs.stallBase !== undefined || m.costs.stallRatio !== undefined) out.push('costs.stallBase / costs.stallRatio are ignored: stall-opening costs are the table costs.stallOpen (Decision M23)');
  if (m.festival[0] && (m.festival[0].length < 4 || m.festival[0].length > 6)) out.push(`festival[0] has ${m.festival[0].length} lines: season 1's Festival is a row of 4 to 6 lines (Decision M25)`);
  if (m.seasons.openingGoods !== 6) out.push(`seasons.openingGoods = ${m.seasons.openingGoods}: the opening board holds 6 Pepper Skewers (Decision M18)`);
  const l19 = m.lanterns.find((l) => l.effect.type === 'giftEvery');
  if (l19) out.push(`lantern ${l19.n}: the effect giftEvery (an absolute N) is replaced by giftEveryMult 0.8 (Decision M24: a fifth sooner)`);
  return out;
}
