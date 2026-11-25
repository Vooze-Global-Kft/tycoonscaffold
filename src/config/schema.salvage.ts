/**
 * The schema of the salvage mode's game data (the scrapyard, game "scrap-yard"): the `salvage` block of
 * games/scrap-yard/game.json, parsed by the salvage engine mode at install (src/engine/salvageMode.ts
 * `withSalvageContent`); the shared schema keeps the block opaque (./schema.ts), so no other game's
 * bundle carries this file (scripts/lib/modes.js MODE_FOLDERS.salvage).
 *
 * HOUR 0 CONTRACT (docs/design/yard-stage1.md section 9, step "contract"). The rules families take the
 * KEYS AND UNITS of the second numbers prototype's content file exactly (scratchpad yard/proto/
 * content2.json, "proto2, 25 November"): grams for masses (`_g`), kilograms where the key says so
 * (`_kg`, `load`, `inbuf`, `pot`, the carriers), seconds (`_s`), minutes (`_m`, `passMin`, `tauMin`),
 * hours (`_h`), § a kilogram for prices (`pbar`), metres on the ground plane for the map (x east, y
 * south). Keys this contract ADDS to the file (the content package fills them; listed in
 * notes/contract.md): `sprite` and `name` on grades and objects, `stages`, `size`, `source` and
 * `certifiedEmpty` on objects, `sprite` and `g` on rivals, `map.places` (footprints), `worldSeed`, `names`, and the part-one families the prototype does
 * not write (`reach`, `feel`, `scale`, `bays`, `cut`, `board`, `deal`, `foreman`, `away`, `goals`,
 * `advice`, `lessons`). Lead's decisions: the price families are ferrous `fe`, non-ferrous `nf` and
 * `pm` (precious, the converter's daily step only); batteries are no grade in stage 1 (no `pb`).
 *
 * The ground work's world block stays for the yard view (src/ui/salvage/world): `yard` (size, view),
 * `worker` (body), `helpers` (the placeholder walkers) and `props` (the static solids: fences, the
 * container wall, piles of rubble). The truck block joins the prototype's (`v`, `handle_s`,
 * `driverFactor`) with the world's body (`radius`, `enter`).
 *
 * The SAME numbers feed the rules, the screen and the bots (positions flow one way: content → game.json
 * → the rules and the screen, S23). The types are inferred here and re-exported by
 * src/engine/salvage/types.ts, where the rules read them.
 */
import { z } from 'zod';

const id = z.string().regex(/^[A-Za-z0-9_.-]+$/);
const xy = z.tuple([z.number(), z.number()]);
/** A sprite id of the art manifest (src/ui/salvage/art/manifest: lower-case dotted words, e.g. thing.washer.whole). */
const spriteId = z.string().regex(/^[a-z0-9]+(\.[a-z0-9]+)+$/);

// ------------------------------------------------------------------------------------- the world block

/** A static thing standing in the yard (a wall section, a rubble pile, a crate): its footprint, metres. */
export const PropSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** What it is. wreck: something to work; machine: a place with a card; truck: drive it; wall, pile, crate: in the way. */
  kind: z.enum(['wreck', 'machine', 'truck', 'wall', 'pile', 'crate']),
  x: z.number(),
  y: z.number(),
  shape: z.enum(['circle', 'box']),
  /** Radius of a circle, metres. */
  r: z.number().positive().default(1),
  /** Width (along x) and depth (along y) of a box, metres. */
  w: z.number().positive().default(2),
  d: z.number().positive().default(2),
  /** Height drawn above the ground, metres (the sprite only; collision is on the ground plane). */
  h: z.number().positive().default(1.5),
  /** The worker and the truck cannot enter it. */
  solid: z.boolean().default(true),
});
export type SalvageProp = z.infer<typeof PropSchema>;

const YardSchema = z.object({
  /** Ground size in metres (64 x 40 m is 3.0 screens wide at 844 x 390, yard-ground.md). */
  width: z.number().min(10).default(64),
  depth: z.number().min(10).default(40),
  /** Points per metre across the screen. */
  ppm: z.number().min(8).max(120).default(40),
  /** Foreshortening of the ground's depth in the three-quarter view (1 = top-down). */
  tilt: z.number().min(0.4).max(1).default(0.7),
  /** Ground tile size, metres. */
  tile: z.number().positive().default(2),
});

// ------------------------------------------------------------------------------- the prototype's keys

/** A grade (yard-stage1.md 2.4; content2 `grades`). */
export const GradeSchema = z.object({
  /** Short name (≤ 18 characters on tickets and chips; the strings package checks it). */
  name: z.string().min(1),
  /** The usual price p̄, § a kilogram (whole-game 4.2). The converter: 0 (paid on assay, `converter`). */
  pbar: z.number().nonnegative(),
  /** The board's price family: fe ferrous, nf non-ferrous, pm precious (the converter only). */
  family: z.enum(['fe', 'nf', 'pm']),
  /** The material it counts towards for range (null: an intermediate, tonnes only). */
  material: z.string().nullable(),
  /** grade: prepared scrap; product: an ingot; intermediate: counts tonnes, no range (cable, motors, the converter). */
  kind: z.enum(['grade', 'product', 'intermediate']),
  /** Share of p̄ the grade fetches in an unprepared mixed load (values a skip as found, E3). 1: priced as it is. */
  asFound: z.number().min(0).max(1),
  /** ADDED: the sprite of one piece of this grade on the ground and on a load (e.g. piece.copper.bright). */
  sprite: spriteId,
});
export type GradeDef = z.infer<typeof GradeSchema>;

/** Heavy cable as found (S4): copper yield, its tinned share (to No.2), and the share of the contained copper's value it is priced at. */
export const CableSchema = z.object({ yield_: z.number().min(0).max(1), tinned: z.number().min(0).max(1), k: z.number().min(0).max(1) });
export type CableDef = z.infer<typeof CableSchema>;

/** The converter sold whole on assay (whole-game 4.3): contained grams, metal prices § a gram, payables, fees. */
export const ConverterSchema = z.object({
  pt_g: z.number().nonnegative(),
  pd_g: z.number().nonnegative(),
  rh_g: z.number().nonnegative(),
  pt: z.number().nonnegative(),
  pd: z.number().nonnegative(),
  rh: z.number().nonnegative(),
  pay_pt: z.number().min(0).max(1),
  pay_pd: z.number().min(0).max(1),
  pay_rh: z.number().min(0).max(1),
  ceramic_kg: z.number().nonnegative(),
  /** § a kilogram of ceramic. */
  ceramic_fee: z.number().nonnegative(),
  /** § a converter. */
  assay_fee: z.number().nonnegative(),
  /** The object id a converter must come from (S7: a converter without a source is refused). */
  source: z.string(),
  /** § paid for one converter at the usual prices (the prototype's figure; the rules compute it). */
  paid: z.number().nonnegative(),
});
export type ConverterDef = z.infer<typeof ConverterSchema>;

/** One kind of piece a thing comes apart into, in cut order: [grade, grams a piece, how many]. */
export const PieceSpecSchema = z.tuple([id, z.number().int().positive(), z.number().int().positive()]);
export type PieceSpec = z.infer<typeof PieceSpecSchema>;

/** A thing (yard-stage1.md 2.4; content2 `objects`). */
export const ObjectSchema = z.object({
  /** ADDED: the thing's name on cards and slips (text.json via the build script). */
  name: z.string().min(1),
  /** Tool tier it needs: 0 loose (picked up as it is), 1 spanners, 2 sledgehammer and grinder, 3 torch. */
  tier: z.number().int().min(0).max(3),
  /** Hardness h in the cut time max(cut.minS, m h / P). */
  h: z.number().nonnegative(),
  pieces: z.array(PieceSpecSchema).min(1),
  /** Grams to the rubble skip or the stripper's bin (to a licensed waste carrier). */
  waste_g: z.number().int().nonnegative(),
  /** The grade it is weighed in at when carried whole (S12, E4); null: never carried whole. */
  whole: id.nullable(),
  /** The prototype's description of how it comes apart (not shown). */
  text: z.string().default(''),
  gross_g: z.number().int().positive(),
  /** § at the usual prices, prepared and as found (the prototype's figures; the rules compute their own). */
  preparedValue: z.number().nonnegative(),
  asFoundValue: z.number().nonnegative(),
  /** ADDED: the sprite base of the whole thing; its stages are `${sprite}.${stage}` (thing.washer.whole, thing.washer.cut1, ...). */
  sprite: spriteId,
  /** ADDED: how many drawn stages it has between whole and gone (yard-stage1.md 6.1; at least 1). */
  stages: z.number().int().min(1).default(1),
  /** ADDED (S7): where it came from; a thing with a converter must name its partner and record. */
  source: z.object({ type: z.literal('partner'), partner: id, ref: z.string() }).optional(),
  /** ADDED: a closed vessel, "certified empty" on the thing, its card and its ticket line. */
  certifiedEmpty: z.boolean().default(false),
  /** ADDED: the whole thing's footprint and height, metres (the world's collision and the sprite's box). */
  size: z.object({ w: z.number().positive(), d: z.number().positive(), h: z.number().positive() }).default({ w: 1, d: 0.8, h: 1 }),
});
export type ObjectDef = z.infer<typeof ObjectSchema>;

/** Old stock in heaps by zone (E1; content2 `zones`): the tool tier asked, counts of whole things, the heap's circle. */
export const ZoneSchema = z.object({
  tier: z.number().int().min(0).max(3),
  things: z.record(id, z.number().int().nonnegative()),
  centre: xy,
  /** Radius of the heap, metres (things stand on a ring pattern inside it: positions.ts `thingPos`). */
  r: z.number().positive(),
});
export type ZoneDef = z.infer<typeof ZoneSchema>;

/** A place's footprint on the ground (ADDED: the prototype gives points only). */
export const PlaceSchema = z.object({
  w: z.number().positive().default(2),
  d: z.number().positive().default(2),
  h: z.number().positive().default(1.5),
  solid: z.boolean().default(false),
  /** The sprite of the place (plant.scale.platform, prop.office, ...). */
  sprite: spriteId,
  /** True: "Open" opens its card (yard-stage1.md 2.1 "the one button"). */
  card: z.boolean().default(true),
});
export type PlaceDef = z.infer<typeof PlaceSchema>;

/** The map (content2 `map`): named points, the routes' detour factor, the lane's lengths, the routes' distances. */
export const MapSchema = z.object({
  points: z.record(id, xy),
  /** Route length = detour × straight distance (the prototype's walk model). */
  detour: z.number().min(1),
  /** Metres along the lane from the gate: farm_m, demolition_m, bridge_m. */
  lane: z.record(id, z.number().nonnegative()),
  /** Metres between two points, "a-b". */
  routes: z.record(z.string(), z.number().nonnegative()),
  /** ADDED: footprints of the points that are places (the rest are only points: start, gate, zone centres). */
  places: z.record(id, PlaceSchema).default({}),
});
export type MapDef = z.infer<typeof MapSchema>;

/** A tool tier (content2 `tools`): tier and cutting power P, kg a second. */
export const ToolSchema = z.object({ tier: z.number().int().min(1).max(3), P: z.number().positive() });
export type ToolDef = z.infer<typeof ToolSchema>;

export const TruckSchema = z.object({
  /** Driving speed, metres a second (the boss; the driver at v × driverFactor). */
  v: z.number().positive().default(9),
  /** Seconds of hooking and tipping a trip. */
  handle_s: z.number().nonnegative().default(14),
  driverFactor: z.number().positive().max(1).default(0.8),
  /** The world's body: footprint radius, metres (cannot pass the narrow gap). */
  radius: z.number().positive().default(1.3),
  /** How close the worker comes to its centre to get in, metres. */
  enter: z.number().positive().default(2.0),
});
export type TruckDef = z.infer<typeof TruckSchema>;

/** The machines (content2 `machines`), each as the prototype writes it. */
export const MachinesSchema = z.object({
  /** The inherited hand stripper (S4): kg a second, works only while the boss stands at it, buffer kg. */
  hand_stripper: z.object({ rate: z.number().positive(), needs_boss: z.boolean(), inbuf: z.number().positive() }),
  /** The powered stripper: kg a second, buffer kg, +lev a level. */
  stripper: z.object({ rate: z.number().positive(), inbuf: z.number().positive(), lev: z.number().nonnegative() }),
  /** The motor bench: kg a second, buffer kg, +lev a level, output shares [grade, share], waste share. */
  bench: z.object({ rate: z.number().positive(), inbuf: z.number().positive(), lev: z.number().nonnegative(), out: z.array(z.tuple([id, z.number().min(0).max(1)])), waste: z.number().min(0).max(1) }),
  /** The crucible (S11): pot kg, seconds of heat a kg of new metal, +lev a level (pot), start at start_share after start_idle s, recipes [in, out, yield, dross] (in: one grade or a list, E22: alloy wheels and cast aluminium), the first heat waits for the boss within first_wait_m metres. */
  crucible: z.object({
    pot: z.number().positive(),
    s_per_kg: z.number().positive(),
    lev: z.number().nonnegative(),
    start_share: z.number().min(0).max(1),
    start_idle: z.number().nonnegative(),
    recipes: z.record(id, z.tuple([z.union([id, z.array(id).min(1)]), id, z.number().min(0).max(1), id])),
    first_wait_m: z.number().positive(),
  }),
});
export type MachinesDef = z.infer<typeof MachinesSchema>;
export type MachineId = keyof MachinesDef;

/** Crew rates (content2 `crew`). */
export const CrewSchema = z.object({
  /** Yard hand: load kg, speed m/s, +lev a level, handling seconds a trip, top level. */
  hand: z.object({ load: z.number().positive(), v: z.number().positive(), lev: z.number().nonnegative(), handle_s: z.number().nonnegative(), maxlev: z.number().int().positive() }),
  /** Cutter: share of the tool's power, +lev a level, cap of that share, top level. */
  cutter: z.object({ share: z.number().positive(), lev: z.number().nonnegative(), cap: z.number().positive(), maxlev: z.number().int().positive() }),
  /** Driver: +lev a level (speed), top level. */
  driver: z.object({ lev: z.number().nonnegative(), maxlev: z.number().int().positive() }),
});
export type CrewDef = z.infer<typeof CrewSchema>;
export type CrewRole = keyof CrewDef;

/** The public drop-off (content2 `dropoff`): seconds between arrivals, the first at `first` s, waiting places, the drawn mix [object, weight], the fixed first arrivals. */
export const DropoffSchema = z.object({
  period: z.number().positive(),
  first: z.number().nonnegative(),
  places: z.number().int().positive(),
  mix: z.array(z.tuple([id, z.number().positive()])).min(1),
  initial: z.array(id),
});
export type DropoffDef = z.infer<typeof DropoffSchema>;

/** A partner (content2 `partners`): what opens it, its lane key, trial and regular skips (object counts), fill seconds, k, and the prototype's masses and prices. */
export const PartnerSchema = z.object({
  comment: z.string().optional(),
  /** The shop key whose purchase opens it (truck, torch). */
  opens: id,
  /** The key of `map.lane` that gives its distance. */
  lane: id,
  trial: z.record(id, z.number().int().nonnegative()),
  skip: z.record(id, z.number().int().nonnegative()),
  fill_s: z.number().positive(),
  /** Price = k × the load's value as found at the day's prices (E3). */
  k: z.number().min(0).max(1),
  trialMass_kg: z.number().nonnegative(),
  /** The trial load's FIXED price, § (E3). */
  trialPrice: z.number().nonnegative(),
  trialPrepared: z.number().nonnegative(),
  skipMass_kg: z.number().nonnegative(),
  skipPrice: z.number().nonnegative(),
  skipPrepared: z.number().nonnegative(),
  /** ADDED: the sprite of its site sign (prop.sign.farm, ...). */
  sprite: spriteId.optional(),
});
export type PartnerDef = z.infer<typeof PartnerSchema>;

/** The merchant's round (S1; content2 `merchant`): its register id, seconds loading, seconds away. */
export const MerchantSchema = z.object({ id: id, load_s: z.number().positive(), round_s: z.number().positive() });
export type MerchantDef = z.infer<typeof MerchantSchema>;

/** Kinds of purchase (content2 `shop[].kind`). */
export const SHOP_KINDS = ['carry', 'crew', 'tool', 'machine', 'vehicle', 'recipe', 'office'] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

/** One purchase in goal order (E2; content2 `shop`): price §, gate (a rung, or null), the income it adds § a minute, the income then, its payback minutes. */
export const ShopItemSchema = z.object({
  key: id,
  kind: z.enum(SHOP_KINDS),
  /** The map point whose card sells it. */
  place: id,
  price: z.number().nonnegative(),
  /** "rung2", "rung3" or null. */
  gate: z.string().nullable(),
  addsPerMin: z.number(),
  incomeNow: z.number(),
  tauMin: z.number().nonnegative(),
});
export type ShopItem = z.infer<typeof ShopItemSchema>;

/** Levels (content2 `levels`): price = base × tau(L) × 1.12^(L−1), tau(L) = min(cap, first × growth^(L−1)) minutes; `bases` § a minute a level adds, by target. */
export const LevelsSchema = z.object({
  tau: z.object({ first: z.number().positive(), growth: z.number().positive(), cap: z.number().positive() }),
  rule: z.string().default(''),
  bases: z.record(z.string(), z.number().nonnegative()),
});
export type LevelsDef = z.infer<typeof LevelsSchema>;

export const RungSchema = z.object({ t: z.number().nonnegative(), range: z.number().int().nonnegative() });
/** The ladder (content2 `ladder`): rungs by tonnes supplied and range; theta § at p̄ that makes a material count. */
export const LadderSchema = z.object({ rung2: RungSchema, rung3: RungSchema, theta: z.number().positive() });
export type LadderDef = z.infer<typeof LadderSchema>;

/** A rival firm (content2 `rivals`): its id (rival01 = register id rival.1), tonnes at the start, the minute it is planned to be passed. */
export const RivalSchema = z.object({
  id: id,
  T0_t: z.number().nonnegative(),
  passMin: z.number().nonnegative(),
  /** ADDED: growth a market day, share (whole-game 6.2: 0.005 below 1 kt). */
  g: z.number().nonnegative().default(0.005),
  /** ADDED: its plate logo's sprite (ui.rival.1, ...). */
  sprite: spriteId.optional(),
});
export type RivalDef = z.infer<typeof RivalSchema>;

// --------------------------------------------------------------- part one's keys the prototype does not write

/** Feel values of the world engineer (D12), read by the rules and the screen alike. */
const ReachSchema = z.object({ work: z.number().positive().default(1.4), pickup: z.number().positive().default(1.0), place: z.number().positive().default(1.2) });
const FeelSchema = z.object({ workDelay: z.number().nonnegative().default(0.3), staleS: z.number().positive().default(0.6) });
const ScaleSchema = z.object({ platformMaxKg: z.number().positive().default(300), bridgeStepKg: z.number().positive().default(20), platformStepKg: z.number().positive().default(0.1) });
const CutSchema = z.object({ minS: z.number().nonnegative().default(0.6) });
/** The posted board (2.8): x_f(D) = Σ 0.5^k a w_f(D−1−k); the day word beyond ±wordBand; the epoch a Monday 00:00 UTC (ms). */
const BoardSchema = z.object({ a: z.number().nonnegative().default(0.03), wordBand: z.number().nonnegative().default(0.015), epochMs: z.number().default(Date.UTC(2026, 0, 5)) });
/** The supply deal series (2.9). */
const DealSchema = z.object({
  partner: id.default('foundry'),
  grade: id.default('ci'),
  gate: z.string().default('rung2'),
  series: z.array(z.object({ q_kg: z.number().positive(), days: z.number().int().positive(), premium: z.number() })).default([]),
  trust: z.object({ up: z.number().default(10), down: z.number().default(15), start: z.number().default(50) }).default({ up: 10, down: 15, start: 50 }),
});
const ForemanSchema = z.object({ boost: z.number().nonnegative().default(0.25), windowS: z.number().positive().default(60), minutesPerDay: z.number().nonnegative().default(45) });
/** Time away (2.16): a gap over gapS seconds goes to the away pass; caps from content2 `awayCap_h`. */
const AwaySchema = z.object({ gapS: z.number().positive().default(2) });
/** A goal (2.10; goals.json by the goals package): id, text key, the chevron's target, a done condition, an optional purchase. */
export const GoalSchema = z.object({
  id: id,
  /** A key of src/ui/salvage/strings.ts `GOALS`. */
  text: z.string(),
  /** A map point or an object id the chevron points at; null none. */
  target: z.string().nullable(),
  /** The condition read from the state (goals.ts in the rules interprets it): e.g. "owned:sack", "supplied_t:2". */
  done: z.string(),
  /** The shop key the goal asks to buy, if any (the one-prompt-a-minute rule). */
  buy: id.nullable().default(null),
  /** Optional goals the card's Not now may skip. */
  optional: z.boolean().default(false),
});
export type GoalDef = z.infer<typeof GoalSchema>;
const AdviceSchema = z.object({ minutes: z.number().positive().default(3), promptGapS: z.number().nonnegative().default(60) });

// ---------------------------------------------------------------------------------------- the block

export const SalvageSchema = z.object({
  /** True while the block is the frozen TEST content of hour 0 (validate says so as a warning). */
  skeletonPlaceholder: z.boolean().default(false),
  /** Free text: which content this is (content2 `version`). */
  version: z.string().default(''),
  /** Counter-hash seed of the whole game (2: every phone the same board, drop-off, skips). */
  worldSeed: z.number().int().default(1),
  /** Invented names by register id (yard-stage1.md 5.1: homeYard, merchant, partnerFarm, rival.1, ...), filled by the build script from the names register. */
  names: z.record(z.string(), z.string()).default({}),

  // the world (the ground work's, kept for src/ui/salvage/world)
  yard: YardSchema.default({ width: 64, depth: 40, ppm: 40, tilt: 0.7, tile: 2 }),
  worker: z.object({ radius: z.number().positive().default(0.35), reach: z.number().positive().default(0.8) }).default({ radius: 0.35, reach: 0.8 }),
  helpers: z
    .object({ count: z.number().int().min(0).max(200).default(0), speed: z.number().positive().default(2.4), via: xy.optional() })
    .default({ count: 0, speed: 2.4 }),
  props: z.array(PropSchema).default([]),

  // the prototype's families (content2.json keys)
  grades: z.record(id, GradeSchema),
  cable: CableSchema,
  converter: ConverterSchema,
  objects: z.record(id, ObjectSchema),
  zones: z.record(id, ZoneSchema),
  map: MapSchema,
  tools: z.record(id, ToolSchema),
  /** Carriers by id, kilograms (frame: the hand load, at most 30; sack and trolley have wheels, S8). */
  carriers: z.record(id, z.number().positive()),
  /** The boss's walking speed, m/s. */
  walk: z.number().positive(),
  /** Seconds a piece takes to pick up. */
  pick_s: z.number().nonnegative(),
  /** Seconds standing on the platform scale to weigh a load in. */
  weigh_s: z.number().nonnegative(),
  truck: TruckSchema.default({ v: 9, handle_s: 14, driverFactor: 0.8, radius: 1.3, enter: 2.0 }),
  machines: MachinesSchema,
  crew: CrewSchema,
  dropoff: DropoffSchema,
  partners: z.record(id, PartnerSchema),
  /** Kilograms the tipping floor holds. */
  floorRoom_kg: z.number().positive(),
  merchant: MerchantSchema,
  shop: z.array(ShopItemSchema),
  levels: LevelsSchema,
  ladder: LadderSchema,
  /** Capacity guards at rungs 1 to 3, t/h. */
  ceilings_t_h: z.array(z.number().positive()).length(3),
  /** Away cap, hours: [without, with the Night watch]. */
  awayCap_h: z.tuple([z.number().positive(), z.number().positive()]),
  rivals: z.array(RivalSchema),

  // part one's keys (yard-stage1.md 2.1 to 2.11)
  reach: ReachSchema.default({ work: 1.4, pickup: 1.0, place: 1.2 }),
  feel: FeelSchema.default({ workDelay: 0.3, staleS: 0.6 }),
  scale: ScaleSchema.default({ platformMaxKg: 300, bridgeStepKg: 20, platformStepKg: 0.1 }),
  /** Bay capacity by grade, kilograms (the master's two hours of flow); a grade without an entry: 2000. */
  bays: z.record(id, z.number().positive()).default({}),
  cut: CutSchema.default({ minS: 0.6 }),
  board: BoardSchema.default({ a: 0.03, wordBand: 0.015, epochMs: Date.UTC(2026, 0, 5) }),
  deal: DealSchema.default({ partner: 'foundry', grade: 'ci', gate: 'rung2', series: [], trust: { up: 10, down: 15, start: 50 } }),
  foreman: ForemanSchema.default({ boost: 0.25, windowS: 60, minutesPerDay: 45 }),
  away: AwaySchema.default({ gapS: 2 }),
  goals: z.array(GoalSchema).default([]),
  advice: AdviceSchema.default({ minutes: 3, promptGapS: 60 }),
  /** Grades whose first weigh-in prints a lesson (a key of strings.ts `LESSONS`). */
  lessons: z.record(id, z.string()).default({}),
});

export type SalvageContent = z.infer<typeof SalvageSchema>;

/** Cross-field checks of the block (src/config/lint.ts). Every id a family names must exist. */
export function lintSalvage(s: SalvageContent): string[] {
  const out: string[] = [];
  const grade = (g: string, where: string) => {
    if (!s.grades[g]) out.push(`${where} names grade "${g}", which is not in grades`);
  };
  const object = (o: string, where: string) => {
    if (!s.objects[o]) out.push(`${where} names object "${o}", which is not in objects`);
  };
  const point = (p: string, where: string) => {
    if (!s.map.points[p]) out.push(`${where} names map point "${p}", which is not in map.points`);
  };
  for (const [oid, o] of Object.entries(s.objects)) {
    o.pieces.forEach(([g], i) => grade(g, `objects.${oid}.pieces[${i}]`));
    if (o.whole) grade(o.whole, `objects.${oid}.whole`);
    const sum = o.pieces.reduce((a, [, g, n]) => a + g * n, 0) + o.waste_g;
    if (sum !== o.gross_g) out.push(`objects.${oid}: pieces and waste weigh ${sum} g, gross_g says ${o.gross_g} g (mass is kept)`);
    if (o.pieces.some(([g]) => s.grades[g]?.family === 'pm') && !o.source) out.push(`objects.${oid} gives a converter but has no source (S7)`);
  }
  if (!s.objects[s.converter.source]) out.push(`converter.source "${s.converter.source}" is not an object`);
  for (const [zid, z] of Object.entries(s.zones)) for (const o of Object.keys(z.things)) object(o, `zones.${zid}.things`);
  for (const pid of Object.keys(s.map.places)) point(pid, `map.places.${pid}`);
  for (const p of ['start', 'scale', 'weighbridge', 'bays', 'merchant']) point(p, 'the rules');
  for (const [pid, p] of Object.entries(s.partners)) {
    for (const o of [...Object.keys(p.trial), ...Object.keys(p.skip)]) object(o, `partners.${pid}`);
    if (s.map.lane[p.lane] === undefined) out.push(`partners.${pid}.lane "${p.lane}" is not in map.lane`);
    if (!s.shop.some((i) => i.key === p.opens)) out.push(`partners.${pid}.opens "${p.opens}" is not a shop key`);
  }
  for (const [o] of s.dropoff.mix) object(o, 'dropoff.mix');
  for (const o of s.dropoff.initial) object(o, 'dropoff.initial');
  for (const [g] of s.machines.bench.out) grade(g, 'machines.bench.out');
  for (const [rid, r] of Object.entries(s.machines.crucible.recipes)) for (const g of [...(Array.isArray(r[0]) ? r[0] : [r[0]]), r[1], r[3]]) grade(g, `machines.crucible.recipes.${rid}`);
  for (const i of s.shop) point(i.place, `shop.${i.key}.place`);
  const keys = new Set<string>();
  for (const i of s.shop) {
    if (keys.has(i.key)) out.push(`duplicate shop key "${i.key}"`);
    keys.add(i.key);
  }
  if ((s.carriers.frame ?? 0) > 30) out.push('carriers.frame: the hand load is at most 30 kg (S8)');
  for (const g of Object.keys(s.bays)) grade(g, 'bays');
  for (const g of Object.keys(s.lessons)) grade(g, 'lessons');
  const ids = new Set<string>();
  for (const p of s.props) {
    if (ids.has(p.id)) out.push(`duplicate prop id "${p.id}"`);
    ids.add(p.id);
    if (p.x < 0 || p.y < 0 || p.x > s.yard.width || p.y > s.yard.depth) out.push(`prop "${p.id}" stands outside the yard`);
  }
  for (const [pid, [x, y]] of Object.entries(s.map.points)) if (pid in s.map.places && (x < 0 || y < 0 || x > s.yard.width || y > s.yard.depth)) out.push(`map point "${pid}" lies outside the yard`);
  return out;
}
