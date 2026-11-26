/**
 * The schema of the salvage mode's game data (the scrapyard, game "scrap-yard"): the `salvage` block of
 * games/scrap-yard/game.json, parsed by the salvage engine mode at install (src/engine/salvageMode.ts
 * `withSalvageContent`); the shared schema keeps the block opaque (./schema.ts), so no other game's
 * bundle carries this file (scripts/lib/modes.js MODE_FOLDERS.salvage).
 *
 * THE CONTRACT, VERSION 2 (fix pass, 25 November). The rules families take the KEYS AND UNITS of the
 * third numbers pass's content file (scratchpad yard/proto/content3.json, "proto3, 25 November")
 * exactly: grams for masses (`_g`), kilograms where the key says so (`_kg`, `load`, `inbuf`, `pot`,
 * `tray`, the carriers), seconds (`_s`), minutes (`_m`, `passMin`, `tauMin`), hours (`_h`), § a
 * kilogram for prices (`pbar`), metres on the ground plane for the map (x east, y south). content3.json
 * parses as it is except `grades.batt` (family `pb`: no batteries in stage 1, E16 and the lead; the build
 * drops it). Keys the BUILD SCRIPT adds to the file (scripts/content/build-yard.py; the art and words
 * tables are content, ONE table each): `sprite`, `load`, `bay`, `picto`, `name`, `short`, `long` on
 * grades; `name`, `sprite`, `size`, `source`, `certifiedEmpty`, `long` and a 4th element (the piece's
 * sprite) on object pieces; `map.places` (the world layer over `map.footprints`: sprite, h, solid,
 * card, label); `map.sites`; `partners.*.skipLook`; `shop[].deliver_s`/`arrive`; `worldSeed`, `names`,
 * `text`; and the part-one families the prototype does not write (`reach`, `feel`, `scale`, `bays`,
 * `cut`, `board`, `deal`, `foreman`, `away`, `goals`, `advice`, `lessons`). Lead's decisions: the price
 * families are ferrous `fe`, non-ferrous `nf` and `pm` (precious, the converter's daily step only).
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
/** An ENTRY id of the art manifest (src/ui/salvage/art/manifest `ManifestEntry.id`: lower-case dotted words, e.g. thing.washer, piece.drum). Frames are the art's, never part of the id. */
const spriteId = z.string().regex(/^[a-z0-9]+(\.[a-z0-9]+)+$/);

/**
 * The kinds of card (types.ts CardData.kind); a place's card in content (`map.places.<id>.card`) is one
 * of them or `false` (no "Open" there). rack: shop rows of the place's tools and carriers; rota and
 * partners: the office's tabs; machine: the machines on the pad (both strippers on the stripper pad);
 * board: the price board; park: the truck's row; dropoff: what waits at the drop-off; floor: the
 * tipping floor's things and its room in kg.
 */
export const CARD_KINDS = [
  'rack', 'rota', 'partners', 'processBoard', 'machine', 'board', 'skip', 'deal', 'table', 'away', 'rung', 'clipboard', 'settings', 'help', 'park', 'dropoff', 'floor',
  // STAGE 2 (yard-stage2.md 4.2; contract v3's CARD_KINDS_V3, content2): a place's card may name the first four.
  'works', 'finance', 'letter', 'yardSale', 'lot', 'crate', 'shop', 'packSheet', 'ageQuestion', 'packCode', 'awayBonus', 'agreements',
] as const;
export type CardKind = (typeof CARD_KINDS)[number];
/** The look family of a carried load (the art's people.draw.ts LoadFamily). */
export const LOAD_FAMILIES = ['fe', 'ci', 'cu', 'br', 'al', 'cab', 'mot', 'hms'] as const;
/**
 * A bay's look (grades.<id>.bay.kind). heap, stillage, cage: the first yard's. STAGE 2 (yard-stage2.md 2.5.1,
 * 3.3; content2): bunker (a lock-block bunker of the works bunkers, 3 m), box (the closed battery box, `pbb`;
 * never a heap, T1), bags (big bags on a pallet, the zinc filter dust, T3).
 */
export const BAY_KINDS = ['heap', 'stillage', 'cage', 'bunker', 'box', 'bags'] as const;
/** STAGE 2 (4.11): the price board's tabs by family. */
export const BOARD_TABS = ['ferrous', 'nonFerrous', 'works', 'intermediates'] as const;
/**
 * STAGE 2 (5.2 (2), (5); T23): what a thing is, for the content checks: a Yard sale kind may carry none of
 * `reuse.never`; a shear or shredder input with `vessel` must be `certifiedEmpty`.
 */
export const THING_TAGS = ['electrical', 'sealed', 'vessel', 'battery', 'carPart', 'fuel', 'childSafety'] as const;
/** A footprint on the ground, metres (content3 `map.footprints`, `zones.*.footprint`: centre x, y, width w along x, depth d along y; x0..y1 its edges, informative). */
export const FootprintSchema = z.object({ x: z.number(), y: z.number(), w: z.number().positive(), d: z.number().positive(), x0: z.number().optional(), y0: z.number().optional(), x1: z.number().optional(), y1: z.number().optional() });
export type Footprint = z.infer<typeof FootprintSchema>;

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
  /** BUILD: the manifest entry of a piece of this grade where its piece spec names none (e.g. piece.copper.bright). */
  sprite: spriteId.optional(),
  /** BUILD: the look family of a load of it (people.draw.ts LoadFamily); default by family in the frame. */
  load: z.enum(LOAD_FAMILIES).optional(),
  /** BUILD: its bay's look (a lock-block heap, a stillage, the converter cage), the manifest entry, and where it stands (a map point and the slot along it). */
  bay: z.object({ kind: z.enum(BAY_KINDS), sprite: spriteId, place: id.optional(), slot: z.number().int().nonnegative().optional() }).optional(),
  /** STAGE 2 (4.11; content2): the price board's tab (absent: by family; the board's own default). */
  boardTab: z.enum(BOARD_TABS).optional(),
  /** BUILD: its pictogram (ui.picto.<grade>). */
  picto: spriteId.optional(),
  /** BUILD (strings' text.json): the ticket row's short name (≤ 12) and Help's long line. */
  short: z.string().optional(),
  long: z.string().optional(),
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
  /** content3: one whole piece (always true in stage 1) and the prose rule (not shown). */
  whole: z.boolean().default(true),
  rule: z.string().optional(),
});
export type ConverterDef = z.infer<typeof ConverterSchema>;

/**
 * One kind of piece a thing comes apart into, in cut order: [grade, grams a piece, how many] and,
 * added by the build, the manifest entry of that piece kind ([.., 'piece.drum']): the washer's li
 * pieces are a panel, two sides and a drum, which one grade cannot tell apart. Its index in `pieces` is
 * `Piece.spec`.
 */
export const PieceSpecSchema = z.union([
  z.tuple([id, z.number().int().positive(), z.number().int().positive()]),
  z.tuple([id, z.number().int().positive(), z.number().int().positive(), spriteId]),
  /**
   * STAGE 2 (yard-stage2.md 2.5.2; content2): [grade, g, n, sprite | null, assay]: with the analyser owned and
   * commissioned the piece weighs in at `assay` (the washer's stainless drum li -> ss, a sink ssu -> ss, a
   * bronze valve brs -> bzs). The sprite may be null while the art has none (the frame falls back to the grade's).
   */
  z.tuple([id, z.number().int().positive(), z.number().int().positive(), spriteId.nullable(), id]),
]);
export type PieceSpec = z.infer<typeof PieceSpecSchema>;

/** A thing (yard-stage1.md 2.4; content2 `objects`). */
export const ObjectSchema = z.object({
  /** BUILD: the thing's name on cards and slips (text.json via the build script); Help's long line. */
  name: z.string().default(''),
  long: z.string().optional(),
  /** Tool tier it needs: 0 loose (picked up as it is), 1 spanners, 2 sledgehammer and grinder, 3 torch; STAGE 2: 4 the plasma cutter (stainless and non-ferrous oversize pieces, 2.9). */
  tier: z.number().int().min(0).max(4),
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
  /** BUILD: the manifest ENTRY of the whole thing (thing.washer); its frames are the art's (stageOf). Default `thing.<id>`. */
  sprite: spriteId.optional(),
  /** @deprecated the art's entry has the frames; ignored by the rules. */
  stages: z.number().int().min(1).default(1),
  /** ADDED (S7): where it came from; a thing with a converter must name its partner and record. */
  source: z.object({ type: z.literal('partner'), partner: id, ref: z.string() }).optional(),
  /** ADDED: a closed vessel, "certified empty" on the thing, its card and its ticket line. */
  certifiedEmpty: z.boolean().default(false),
  /** ADDED (finding W9): the tool tier each entry of `pieces` needs (the car's wheels and loom by hand, its converter with the torch); missing: the object's `tier`. */
  pieceTiers: z.array(z.number().int().min(0).max(4)).optional(),
  /** STAGE 2 (5.2 (2), (5); T23; content2): what it is (THING_TAGS), read by the content checks only. */
  tags: z.array(z.enum(THING_TAGS)).optional(),
  /**
   * STAGE 2 (2.9, T1; content2): how it reaches the yard when a partner's load brings it: tipped on the floor
   * (absent, 'tip'), set down on the car pad from the hook-lift's flatrack ('pad': the end-of-life car, never
   * tipped), or in the closed battery box ('batteryBox': a battery, weighed as one weigh-in, never on the floor).
   */
  arrives: z.enum(['tip', 'pad', 'batteryBox']).optional(),
  /**
   * STAGE 2 (content2): the share of its prepared value the WHOLE thing fetches as found, where its grades'
   * own `asFound` would overvalue it (the end-of-life car before depollution: nobody but a permitted bay takes
   * it). Absent: its grades' as-found shares (E3).
   */
  asFound: z.number().min(0).max(1).optional(),
  /**
   * ADDED (finding W9): what stays when the last piece is off (the car's stripped body): weighed in WHOLE
   * at once where it stands, one line of `grade`, into its bay; the thing stays on its spot as a shell
   * (nobody works or carries it) until the merchant's next collection of that grade.
   */
  shell: z.object({ grade: id, g: z.number().int().positive() }).optional(),
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
  /** content3: the heap's footprint (E23). */
  footprint: FootprintSchema.optional(),
  /** ADDED (MAP.md M3, finding L5): the zone's bed, a rectangle (x0, y0 its north-west corner, w east, d south, metres); its things lie inside it (positions.ts thingPos). Absent: the old circle (centre, r). */
  bed: z.object({ x0: z.number(), y0: z.number(), w: z.number().positive(), d: z.number().positive() }).optional(),
});
export type ZoneDef = z.infer<typeof ZoneSchema>;

/**
 * A PLACE: the world layer over a footprint (BUILD: content3 gives `map.footprints`; the build adds
 * sprite, height, solidity, card and label). `w` and `d` come from the footprint when not given here.
 */
export const PlaceSchema = z.object({
  w: z.number().positive().default(2),
  d: z.number().positive().default(2),
  h: z.number().positive().default(1.5),
  solid: z.boolean().default(false),
  /** The manifest entry of the place (plant.scale.platform, plant.portacabin, ...); default plant.block. */
  sprite: spriteId.default('plant.block'),
  /** What "Open" shows there: a card kind (CARD_KINDS), true (the default kind for this place id: see cards.ts), or false (no Open). */
  card: z.union([z.boolean(), z.enum(CARD_KINDS)]).default(true),
  /** Its world label's text key (place.*), shown on first sight (4.2); default `place.<id>` when that key exists. */
  label: z.string().optional(),
  /**
   * join2 (seam e): the side of the footprint the place is opened from ('s' the south face, where its door is
   * drawn and the boss is seen in front of it); absent: any side.
   */
  door: z.enum(['n', 's', 'e', 'w']).optional(),
});
export type PlaceDef = z.infer<typeof PlaceSchema>;

const mapRect = z.object({ x0: z.number(), y0: z.number(), w: z.number().positive(), d: z.number().positive() });
/**
 * STAGE 2: THE WORKS LAYER OF THE MAP (yard-stage2.md section 3; content2). `map` is the first yard's, and the
 * whole map below rung 3; `map.works` is merged over it from the tick of `backFieldOpen` (3.1; the rules'
 * `mapAt(rung)`, Phase B; the checker `scripts/content/yard_map.py` checks both). Merging: `points`,
 * `footprints` and `places` of the same id REPLACE the first layer's (the field gateway `backfield`), new ids
 * are added; `drop.props` (prop ids) and `drop.walls` (indices into `map.walls`) are lifted out (the wall
 * gate; rubble the works stand on); `driveLine.rects` are added and `driveLine.stops` merged; `routes` and
 * `lane` merged. The old west fence at `fence.x` stays with its `openings` (y ranges); the yard's west edge
 * becomes `x0`. Metres, x east, y south.
 */
export const MapWorksSchema = z.object({
  x0: z.number(),
  points: z.record(id, xy).default({}),
  footprints: z.record(id, FootprintSchema).default({}),
  places: z.record(id, PlaceSchema).default({}),
  drop: z.object({ props: z.array(z.string()).default([]), walls: z.array(z.number().int().nonnegative()).default([]) }).default({ props: [], walls: [] }),
  fence: z.object({ x: z.number(), openings: z.array(z.tuple([z.number(), z.number()])) }),
  driveLine: z.object({ rects: z.array(mapRect).default([]), stops: z.record(z.string(), xy).default({}) }).default({ rects: [], stops: {} }),
  /** Stops off the yard (the reclamation dealer's van on the lane's south kerb, 3.3.2). */
  laneStops: z.record(z.string(), xy).default({}),
  /** Roofs (not solid): the bays a hall is charged from stand under one (T5, 3.6 (8)). */
  roofs: z.record(id, mapRect).default({}),
  /** The railed public bay (T7): its ground, its rails (solid), its staff gap (x0, x1 in the north rail) and the wicket's opening in the east fence (y0, y1). */
  publicBay: z.object({ rect: mapRect, rail: z.array(mapRect), staff: z.tuple([z.number(), z.number()]), wicket: z.tuple([z.number(), z.number()]) }),
  visitorPath: z.array(xy).min(2),
  vanPath: z.array(xy).min(2),
  publicGap_m: z.number().nonnegative(),
  /** The ground the forklift drives (3.6 (6)): its bay and the south-yard rects between its pads. */
  forkliftZone: z.array(mapRect).default([]),
  lane: z.record(id, z.number().nonnegative()).default({}),
  routes: z.record(z.string(), z.number().nonnegative()).default({}),
  /** The second hero frame (3.5): the rotary hall, its filter and its apron whole. */
  heroWorks: z.object({ x0: z.number(), y0: z.number(), w: z.number().positive(), d: z.number().positive(), places: z.array(id) }).optional(),
});
export type MapWorksDef = z.infer<typeof MapWorksSchema>;

const MapObject = z
  .object({
    points: z.record(id, xy),
    /** content3 (E23): a footprint for every place of the map. */
    footprints: z.record(id, FootprintSchema).default({}),
    /** content3: THE container wall (boxes, metres) and its gaps (points); the world block's `props` walls must equal it (lint). */
    walls: z.array(z.object({ x: z.number(), y: z.number(), w: z.number().positive(), d: z.number().positive() })).default([]),
    gaps: z.array(xy).default([]),
    /** content3: the hero frame (S19): its box and the places it must hold. */
    hero: z.object({ x0: z.number(), y0: z.number(), w: z.number().positive(), d: z.number().positive(), places: z.array(id) }).optional(),
    /** Route length = detour × straight distance (the prototype's walk model). */
    detour: z.number().min(1),
    /**
     * Metres along the lane from the gate: farm_m, demolition_m, bridge_m. THE LANE IS DRAWN AT THESE
     * DISTANCES (the contract's decision): a partner's site and skip zone stand east of the gate at
     * gate.x + lane[partner.lane] (positions.ts skipZone), and the world draws the lane that far.
     */
    lane: z.record(id, z.number().nonnegative()),
    /** Metres between two points, "a-b" (either order). */
    routes: z.record(z.string(), z.number().nonnegative()),
    /** BUILD: the world layer of each place (keyed by point id; w, d default from `footprints`). */
    places: z.record(id, PlaceSchema).default({}),
    /** BUILD (optional): a partner's skip zone size, metres (default 6 × 4), by partner id. */
    sites: z.record(id, z.object({ w: z.number().positive(), d: z.number().positive() })).default({}),
    /** BUILD (optional): the chalk circles, [x, y, r] metres (default: two west of the scale). */
    circles: z.array(z.tuple([z.number(), z.number(), z.number().positive()])).default([]),
    /** The lane's asphalt width, metres (the world's). */
    laneWidth: z.number().positive().optional(),
    /** ADDED (MAP.md M1, fix pass): the back wall's line y, metres; nothing of the yard, no walker and no vehicle north of it (absent: no wall). */
    north: z.number().optional(),
    /**
     * ADDED (MAP.md M4, fix pass): THE drive line, a corridor along a polyline (`points`, metres) `w` metres
     * wide; the merchant's flatbed and the truck drive only on it, nothing stands in it.
     */
    driveLine: z
      .object({
        points: z.array(xy).min(2),
        w: z.number().positive(),
        /** ADDED (content, fix pass): the corridor as rectangles (x0, y0 north-west corner, w east, d south, metres): the line's band and the truck's park. */
        rects: z.array(z.object({ x0: z.number(), y0: z.number(), w: z.number().positive(), d: z.number().positive() })).optional(),
        /** ADDED (content, fix pass): the vehicles' way points on the line by name (gate, weighbridge, merchant, floor, turn, park), metres. */
        stops: z.record(z.string(), xy).optional(),
      })
      .optional(),
    /** STAGE 2: the works layer of the map (above). */
    works: MapWorksSchema.optional(),
  })
  .strict();

/** The map: named points, footprints, the wall, the hero frame, the detour factor, the lane's lengths, routes, the world layer. A renamed key fails (strict). */
export const MapSchema = z.preprocess((raw) => {
  // content3 writes footprints; the world reads places (the build's layer: which points are places is
  // the build's choice). A place's w, d default from its footprint.
  if (!raw || typeof raw !== 'object') return raw;
  const m = raw as { footprints?: Record<string, { w?: number; d?: number }>; places?: Record<string, Record<string, unknown>> };
  if (!m.footprints || !m.places) return raw;
  const places: Record<string, Record<string, unknown>> = {};
  for (const [pid, pl] of Object.entries(m.places)) {
    const f = m.footprints[pid];
    places[pid] = f ? { w: f.w, d: f.d, ...pl } : pl;
  }
  return { ...m, places };
}, MapObject);
export type MapDef = z.infer<typeof MapObject>;

/** A tool tier (content2 `tools`): tier and cutting power P, kg a second. */
export const ToolSchema = z.object({ tier: z.number().int().min(1).max(4), P: z.number().positive() });
export type ToolDef = z.infer<typeof ToolSchema>;

export const TruckSchema = z.object({
  /** Driving speed, metres a second (the boss; the driver at v × driverFactor). */
  v: z.number().positive().default(9),
  /** P10 (rules-sim-a, 19:50): the boss's own driving speed, metres a second (the world drives him at it; the presence clamp allows it). Absent: v. */
  bossV: z.number().positive().optional(),
  /** Seconds of hooking and tipping a trip. */
  handle_s: z.number().nonnegative().default(14),
  driverFactor: z.number().positive().max(1).default(0.8),
  /** The world's body: footprint radius, metres (cannot pass the narrow gap). */
  radius: z.number().positive().default(1.3),
  /** How close the worker comes to its centre to get in, metres. */
  enter: z.number().positive().default(2.0),
  /** After Step out, entering is armed again only once the worker is farther than enter + rearm from it, metres (the world's rule). */
  rearm: z.number().nonnegative().default(0.8),
  /** The truck's stored tare and the empty skip's, kg (the skip ticket's "Tare"; content may add them, 0 until then). */
  tare_kg: z.number().nonnegative().default(0),
  skipTare_kg: z.number().nonnegative().default(0),
  /**
   * RULING2.md 16.1 (engine2-dispatch): the first rung on which the hired driver ranks partners by their rated net a
   * load and keeps the floor's room for the best (src/engine/salvage/truck.ts bestLoad). Absent: never (the first
   * yard's rule, the skip full longest).
   */
  pickFromRung: z.number().int().optional(),
  /**
   * owner1 (RULING-owner1 V3): no vehicle moves faster than this inside the fence, metres a second (the hired driver's
   * truck, the arrivals, the merchant's flatbed); beyond the gate the lane's speed is raised so that a trip's total is
   * what it was (truck.ts tripSpeeds). Absent: no yard limit (the first yard's speeds).
   */
  yardV: z.number().positive().optional(),
  /** owner1 V3: the boss's own truck inside the fence, metres a second (bossV is his speed on the lane). Absent: bossV. */
  bossYardV: z.number().positive().optional(),
  /** owner1 T3: seconds the BOSS's hook takes (the hired driver's stays handle_s). Absent: handle_s. */
  bossHandle_s: z.number().nonnegative().optional(),
  /** owner1 V3: the lane's speed is at most laneMaxF times the driver's speed (a trip started far from the park may then last longer). */
  laneMaxF: z.number().min(1).optional(),
});
export type TruckDef = z.infer<typeof TruckSchema>;

/** Out-tray room, kilograms (content3 `tray`; a full tray stops its machine, nothing lost). */
const tray = z.number().positive().default(200);
/** The machines (content `machines`), each as the prototype writes it. */
export const MachinesSchema = z.object({
  /** The inherited hand stripper (S4): kg a second, works only while the boss stands at it, buffer kg, tray kg. */
  hand_stripper: z.object({ rate: z.number().positive(), needs_boss: z.boolean(), inbuf: z.number().positive(), tray }),
  /** The powered stripper: kg a second, buffer kg, +lev a level, tray kg. */
  stripper: z.object({ rate: z.number().positive(), inbuf: z.number().positive(), lev: z.number().nonnegative(), tray }),
  /** The motor bench: kg a second, buffer kg, +lev a level, output shares [grade, share], waste share, tray kg. */
  bench: z.object({ rate: z.number().positive(), inbuf: z.number().positive(), lev: z.number().nonnegative(), out: z.array(z.tuple([id, z.number().min(0).max(1)])), waste: z.number().min(0).max(1), tray }),
  /** The crucible (S11): pot kg, seconds of heat a kg of new metal, +lev a level (pot), start at start_share after start_idle s, recipes [in, out, yield, dross] (in: one grade or a list, E22: alloy wheels and cast aluminium), the first heat waits for the boss within first_wait_m metres. */
  crucible: z.object({
    pot: z.number().positive(),
    s_per_kg: z.number().positive(),
    lev: z.number().nonnegative(),
    start_share: z.number().min(0).max(1),
    start_idle: z.number().nonnegative(),
    recipes: z.record(id, z.tuple([z.union([id, z.array(id).min(1)]), id, z.number().min(0).max(1), id])),
    first_wait_m: z.number().positive(),
    /** content3: kilograms an ingot (n = floor(metal / ingot_kg), the heel keeps the rest) and the ingot tray's kg. */
    ingot_kg: z.number().positive().default(5),
    tray,
  }),
});
export type MachinesDef = z.infer<typeof MachinesSchema>;
export type MachineId = keyof MachinesDef;

/** Crew rates (content2 `crew`). */
export const CrewSchema = z.object({
  /** Yard hand: load kg, speed m/s, +lev a level, handling seconds a trip, top level. */
  hand: z.object({
    load: z.number().positive(),
    v: z.number().positive(),
    lev: z.number().nonnegative(),
    handle_s: z.number().nonnegative(),
    maxlev: z.number().int().positive(),
    /** owner1 H1: cut pieces in a heap's bed farther than this from the boss (metres) are the yard hands' to carry. Absent: never (2.6 "never from the heaps"). */
    leaveM: z.number().nonnegative().optional(),
  }),
  /** Cutter: share of the tool's power, +lev a level, cap of that share, top level. */
  cutter: z.object({ share: z.number().positive(), lev: z.number().nonnegative(), cap: z.number().positive(), maxlev: z.number().int().positive() }),
  /** Driver: +lev a level (speed), top level. */
  driver: z.object({ lev: z.number().nonnegative(), maxlev: z.number().int().positive() }),
  /**
   * RULING2.md 17.2 (engine2-dispatch): the first rung of the yard hands' order of work that keeps the yard from
   * getting poorer by a machine (src/engine/salvage/crew.ts orderPlan). Absent: never (the first yard's S12).
   */
  orderFromRung: z.number().int().optional(),
});
export type CrewDef = z.infer<typeof CrewSchema>;
/** The crew's roles (the keys of `crew` that are a role: not the order's keys of RULING2.md 17.2). */
export type CrewRole = Exclude<keyof CrewDef, 'orderFromRung'>;

/** The public drop-off (content2 `dropoff`): seconds between arrivals, the first at `first` s, waiting places, the drawn mix [object, weight], the fixed first arrivals. */
export const DropoffSchema = z.object({
  period: z.number().positive(),
  first: z.number().nonnegative(),
  places: z.number().int().positive(),
  mix: z.array(z.tuple([id, z.number().positive()])).min(1),
  initial: z.array(id),
  /** ADDED (finding P1): after `initial`, arrivals take this fixed list in order (again from its start when it runs out) until `openingUntil_s` yard seconds; then the mix. */
  opening: z.array(id).default([]),
  openingUntil_s: z.number().nonnegative().default(0),
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
  /** BUILD: the sprite of its site sign (lane.shed.farm, ...). */
  sprite: spriteId.optional(),
  /** BUILD: the art's skip-load look (people.ts SKIP_LOADS: farm, demolition). */
  skipLook: z.enum(['farm', 'demolition']).optional(),
  /** content3 extras (checks, not rules). */
  trial_price: z.number().nonnegative().optional(),
  skipAsFound: z.number().nonnegative().optional(),
  /**
   * STAGE 2 (yard-stage2.md 2.12, 5.1; content2): a reusable batch on its skip from rung 3 ({obj} n of them,
   * printed on the label, set down whole at the Yard sale's trade corner at the tip). Not read below rung 3.
   */
  reuseBatch: z.object({ obj: id, n: z.number().int().positive() }).optional(),
  /**
   * STAGE 2 (2.9, decision 30; content2): what its loads gain once a plate is owned (`needs`, a works plate
   * id): `skip` adds `contents` to every skip filled after; `flatrack` (the end-of-life car, one a load, set
   * down on the car pad) and `batteryBox` (whole batteries, one weigh-in) are loads of their own in the
   * partner's rotation, each with its label fixed at fill (E3). The label price stays k x as found.
   */
  grows: z.array(z.object({ needs: id, body: z.enum(['skip', 'flatrack', 'batteryBox']), contents: z.record(id, z.number().int().positive()) })).optional(),
});
export type PartnerDef = z.infer<typeof PartnerSchema>;

/** The merchant's round (S1; content2 `merchant`): its register id, seconds loading, seconds away. */
export const MerchantSchema = z.object({ id: id, load_s: z.number().positive(), round_s: z.number().positive() });
export type MerchantDef = z.infer<typeof MerchantSchema>;

/** Kinds of purchase (content2 `shop[].kind`). */
export const SHOP_KINDS = ['carry', 'crew', 'tool', 'machine', 'vehicle', 'recipe', 'office', 'works'] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

/**
 * One purchase (E2, E18; content3 `shop` in goal order, and `dayOneList`): price §, gate (a rung, or
 * null), where its card sells it, how it arrives. The measured figures are the prototype's (checks).
 */
export const ShopItemSchema = z.object({
  key: id,
  kind: z.enum(SHOP_KINDS),
  /** The map point whose card sells it (and where it is set down). */
  place: id,
  price: z.number().nonnegative(),
  /** "rung2", "rung3" or null. */
  gate: z.string().nullable().default(null),
  /** BUILD: seconds from paying to its arrival (2.15; 0: at once), and what brings it (default by kind: tools and carriers the van, machines the machine flatbed, the truck itself, crew out of the office). */
  deliver_s: z.number().nonnegative().default(0),
  arrive: z.enum(['van', 'machineFlatbed', 'truck', 'crew']).optional(),
  /** STAGE 2 (2.6.2; content2): a shop key or works plate that must be owned first (the eddy current needs the shredder). */
  needsItem: id.optional(),
  /** The prototype's measures (checks, never rules). */
  addsPerMin: z.number().optional(),
  incomeNow: z.number().optional(),
  tauMin: z.number().nonnegative().optional(),
  worth25min_goal: z.number().optional(),
  worth25min_all: z.number().optional(),
  heldAtCard: z.string().optional(),
  wait: z.string().optional(),
  why: z.string().optional(),
});
export type ShopItem = z.infer<typeof ShopItemSchema>;

/**
 * Levels (content3 `levels`, E13a): price = tau(L) × the rated kg a minute the level adds at full feed ×
 * the margin a kg of its target (`margin_per_kg`: stripper, bench, crucible; `yard` for crew and
 * partners), tau(L) = min(cap, first × growth^(L−1)) minutes; at most `maxLevel`; sold from the
 * gate `opens`: a rung id (`rung2`, E25: levels open at rung 2) or a shop key owned. Machine levels are LINEAR in the level (the lead): rate × (1 + lev × (L − 1)).
 * Partner levels are "another skip in rotation" (E13b; the specification's model binds, so
 * `skipLevel` is a check of content3's, not a rule). `bases` is content2's (unused).
 */
export const LevelsSchema = z.object({
  tau: z.object({ first: z.number().positive(), growth: z.number().positive(), cap: z.number().positive() }),
  maxLevel: z.number().int().positive().default(20),
  opens: id.nullable().default(null),
  margin_per_kg: z.record(z.string(), z.number().nonnegative()).default({}),
  skipLevel: z.number().nonnegative().optional(),
  rule: z.string().default(''),
  advice: z.string().optional(),
  skipsInRotation: z.record(z.string(), z.string()).optional(),
  bases: z.record(z.string(), z.number().nonnegative()).default({}),
  /** REPORT4 R21: no level costs less than floor × floorGrowth^(L−1) (§). */
  floor: z.number().nonnegative().default(0),
  floorGrowth: z.number().positive().default(1),
});
export type LevelsDef = z.infer<typeof LevelsSchema>;

export const RungSchema = z.object({ t: z.number().nonnegative(), range: z.number().int().nonnegative() });
/**
 * The ladder: rungs 2 and 3 by tonnes supplied and range (the stage's gates); `rungs` all nine for the
 * table (rungs 4 to 9 show with their gates and a padlock, 2.11; default: 1 to 3 from rung2/rung3);
 * theta § at p̄ that makes a material count.
 */
export const LadderSchema = z.object({
  rung2: RungSchema,
  rung3: RungSchema,
  theta: z.number().positive(),
  rungs: z.array(z.object({ n: z.number().int().min(1).max(9), t: z.number().nonnegative(), range: z.number().int().nonnegative() })).default([]),
  /**
   * STAGE 2 (yard-stage2.md 2.11, B18; content2): the stage's top rung (the first yard's `STAGE_TOP_RUNG` 3
   * becomes content). Given, the per-rung lists (`ceilings_t_h`, `tau_h`, `lots.mu_min`,
   * `reuse.shareI`, `ads.dayHours_h`) have exactly this length. Absent (the frozen test content): 3, lists unchecked.
   */
  topRung: z.number().int().min(3).max(9).optional(),
  /** STAGE 2 (2.11): from rung 4, theta_r = max(theta, thetaShare x T_r x §1,200 a tonne); rungs 1 to 3 keep `theta`. */
  thetaShare: z.number().nonnegative().optional(),
  /** STAGE 2 (2.11; asked by rules-money, 26 Nov): the § a tonne in theta_r = max(theta, thetaShare x T_r x thetaPerT). */
  thetaPerT: z.number().positive().optional(),
});
export type LadderDef = z.infer<typeof LadderSchema>;

/**
 * A rival firm (content3 `rivals.list`): its REGISTER id (rival.1 ... rival.25: also its content id),
 * tonnes at the start, its growth a market day, the minute it is planned to be passed. THE RULE
 * (specification 2.11, which binds behaviour): T_i(d) = T0_t × (1 + g_day × min(d, 40)), d = D −
 * clock.startDay; content3's prose `rule` is a check, not the rule.
 */
export const RivalSchema = z.preprocess(
  (r) => (r && typeof r === 'object' && 'g' in r && !('g_day' in r) ? { ...(r as object), g_day: (r as { g: number }).g } : r),
  z.object({
    id: z.string().regex(/^rival\.\d+$/),
    T0_t: z.number().nonnegative(),
    g_day: z.number().nonnegative().default(0.005),
    passMin: z.number().nonnegative().optional(),
    /** BUILD: its plate logo's sprite (ui.rival.1, ...). */
    sprite: spriteId.optional(),
  }),
);
export type RivalDef = z.infer<typeof RivalSchema>;
/** content3 `rivals`: {rule, list}; a bare list is taken as the list. */
export const RivalsSchema = z.preprocess((r) => (Array.isArray(r) ? { list: r } : r), z.object({ rule: z.string().default(''), list: z.array(RivalSchema) }));

// --------------------------------------------------------------- part one's keys the prototype does not write

/** Feel values of the world engineer (D12), read by the rules and the screen alike. */
/** reach.sight (content3): within it of a cutter's thing the boss sees each piece come off; beyond it the whole thing is one event (E17). */
const ReachSchema = z.object({ work: z.number().positive().default(1.4), pickup: z.number().positive().default(1.0), place: z.number().positive().default(1.2), sight: z.number().positive().default(8) });
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
/** Time away (2.16): a gap over gapS seconds goes to the away pass (above the longest UI stall: 10 s; types.ts MAX_TICK); caps from `awayCapByRung_h` and `nightWatch_h` (E33). */
/**
 * `cardS`: the away CARD needs a real absence (join2, seam a): a gap of at most cardS seconds (a JS stall: the
 * yard bake under the loading curtain, a slow frame) still runs the pass silently, the yard simply ran on.
 */
const AwaySchema = z.object({ gapS: z.number().positive().default(10), cardS: z.number().nonnegative().default(60) });
/**
 * Runs (stage 2, 2.1; RULING2.md 14.1): from rung `fromRung` crew work in runs whoever is looking (a yard
 * hand's run ends by its start + `handRun_s`, a cutter's by its start + `cutRun_s`, seconds; the first trip
 * always goes); `ahead`: the rest of a run is planned at a departure out of the boss's sight (false: every
 * run trip by trip; tests and the bots' comparison). Read by src/engine/salvage/group.ts; no block: no runs.
 */
const GroupSchema = z.object({ fromRung: z.number().int(), handRun_s: z.number().nonnegative(), cutRun_s: z.number().nonnegative(), ahead: z.boolean() });
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
  /** Optional goals the card's Not now may skip (skipGoal). */
  optional: z.boolean().default(false),
  /** The repeating goal of the lead's ruling ("Widen the yard: {item}", text goal.widen with {item: {text}}): met each time the advice line's purchase is made; it stays the current goal. */
  repeat: z.boolean().default(false),
  /** goals.json (hints): a target the chevron points at FIRST while the condition is unmet (`truck`), the stall escalation the hints play, a dayOne entry's gate (`away:1`). Read by the screens. */
  via: z.string().nullable().default(null),
  stall: z.string().nullable().default(null),
  after: z.string().nullable().default(null),
});
export type GoalDef = z.infer<typeof GoalSchema>;
/** The advice line (2.10): priced within cash + minutes × incomeRate; never below E19's reserve, the price of a load full within reserveS. */
const AdviceSchema = z.object({
  minutes: z.number().positive().default(3),
  promptGapS: z.number().nonnegative().default(60),
  reserveS: z.number().nonnegative().default(120),
  /** STAGE 2 (2.13): uncut tier-3 steel on the floor over this many kg, with the shear owned, names a shear level. */
  shearKg: z.number().positive().optional(),
});

// ============================================================================================= STAGE 2
// yard-stage2.md 5.1 (the keys and first values), 2.5 to 2.16 (the rules that read them), owner content2.
// ADDITIVE: every block below is optional, so the frozen test content and every saved content parse as
// before, and nothing the first yard's rules read changes. THE WORKS LAYER (`worksLayer`): the entries
// stage 2 adds to the first yard's families (grades, objects, partners, shop, tools, carriers, bays) are
// held apart, as `map.works` is held apart from `map` (3.1): the first yard's readers iterate those
// families whole (the frame draws a heap for every non-stillage grade, create.ts gives every partner a
// state, a shop item gated at rung 3 would be on sale at minute 57), so the layer joins them only from the
// tick of `backFieldOpen`, through `withWorksLayer` below (the rules' merged view, Phase B).

/** A rectangle on the ground: x0, y0 its north-west corner, w east, d south (metres). */
export const RectSchema = z.object({ x0: z.number(), y0: z.number(), w: z.number().positive(), d: z.number().positive() });
/** A share list [to, share] (a grade, an object, `stream` (a line's conveyor, 2.8.1) or `carrier`: to a licensed waste carrier). */
const Shares = z.array(z.tuple([id, z.number().min(0).max(1)]));
/** What a plate's output may name that is not a grade: the conveyor stream to the next plate of its line. */
export const STREAM = 'stream';
/** Waste "to a licensed waste carrier" (T13, P18). */
export const CARRIER = 'carrier';

/** A batch plate's heat (2.8): charge kg, seconds a heat, start at start_share after start_idle s without feed (the crucible's). */
const BatchSchema = z.object({ kg: z.number().positive(), s: z.number().positive(), start_share: z.number().min(0).max(1), start_idle: z.number().nonnegative() });
/** A hall's recipe (2.8): its inputs (one heat takes any of them), out and waste per kilogram of input, reagents. */
const RecipeSchema = z.object({ in: z.array(id).min(1), out: Shares, waste: Shares.default([]), reagents: z.array(z.tuple([id, z.number().nonnegative(), z.number().nonnegative()])).default([]) });

/**
 * A works plate (yard-stage2.md 2.5.3, validated here, checked by build-yard.py 5.2): `row` its process
 * board row, `slot` its order in that row (and S12's order after the bench), `plot` its place in
 * `map.works`, `gate` a rung id, `needs` the plate that must be owned first, `price` § (the payback rule's,
 * 2.6.4), `deliver_s` the machine flatbed's seconds. `in`: grades or objects; `out` and `waste` PER INPUT
 * (E7); `reagents` [id, kg a kg of input, § a kg] paid at a heat's start or a segment's (never by the clock);
 * `rate_kg_s` (rate plates; the shear's comes from `shear.P` / hardness) or `batch` (halls, with `recipes`);
 * `feeds` a stream's next plate (the line's conveyor); `lev` a level's step of the level-1 rate,
 * `maxLevel`; `inbuf` and `tray` kg (a bay-fed plate has no tray: 0); `financeable` is DERIVED by the build
 * (true when `out` holds a sellable grade), never written by hand; `permit` the rota's licence row's text
 * key, added when it is commissioned (T21).
 */
export const PlateSchema = z.object({
  row: z.enum(['yard', 'shredder', 'melt', 'lead']),
  slot: z.number().int().nonnegative(),
  plot: id,
  gate: z.string(),
  needs: id.nullable().default(null),
  price: z.number().positive(),
  deliver_s: z.number().nonnegative(),
  kind: z.enum(['rate', 'batch', 'station', 'assay', 'handling']),
  in: z.array(id),
  /** Who feeds it: yard hands, the bays (back field), the line's stream, or (s2a-fix) the forklift only (the depollution bay's car, set on its apron from the car pad; no yard hand is ever sent to it). */
  feedBy: z.enum(['hands', 'bays', 'stream', 'forklift']).nullable(),
  out: z.record(id, Shares).default({}),
  waste: z.record(id, Shares).default({}),
  reagents: z.array(z.tuple([id, z.number().nonnegative(), z.number().nonnegative()])).default([]),
  rate_kg_s: z.number().positive().optional(),
  batch: BatchSchema.optional(),
  recipes: z.record(id, RecipeSchema).optional(),
  feeds: z.record(id, id).optional(),
  lev: z.number().nonnegative(),
  maxLevel: z.number().int().positive(),
  inbuf: z.number().nonnegative(),
  tray: z.number().nonnegative(),
  financeable: z.boolean().optional(),
  permit: z.string().optional(),
});
export type PlateDef = z.infer<typeof PlateSchema>;

/** The works (2.6): commissioning, levels, the price floor, the plates. */
export const WorksSchema = z.object({
  commission_s: z.number().positive(),
  selfCommission_s: z.number().positive(),
  lev: z.number().nonnegative(),
  maxLevel: z.number().int().positive(),
  floor: z.number().nonnegative(),
  plates: z.record(id, PlateSchema),
});
export type WorksDef = z.infer<typeof WorksSchema>;

/** The magnet crane (2.7): kg a second, reach to the nearest edge (m), a move's kg, the materials it never lifts, and the things it never lifts. */
const CraneSchema = z.object({ rate: z.number().positive(), reach_m: z.number().positive(), load_kg: z.number().positive(), never: z.array(z.string()), neverObjects: z.array(id).default([]) });
/** The forklift (2.9): its load kg and speed m/s. */
const ForkliftSchema = z.object({ load: z.number().positive(), v: z.number().positive() });

/** Delivered lots, "oversize pieces" (2.10.1): yard seconds between arrivals, at most `max` waiting, μ minutes of I by rung, the boss's cut seconds [min, max], the kinds. */
const LotKindSchema = z.object({
  obj: id,
  /** The boss's seconds to cut this kind (the lead's ruling 6: per kind, within lots.cut_s; a content check asks it of every kind). Optional only so that a content frozen before it still parses. */
  cut_s: z.number().positive().optional(),
  /** The named partner whose lorry brings it (a register id: partner.boatyard, partner.garage, ...). */
  from: z.string(),
  /** A kind comes only while the player owns one of these (a machine of the first yard or a plate; the analyser counts as stainless's line, decision 9). Empty: always ("an intermediate sold whole"). */
  line: z.array(id).default([]),
});
const LotsSchema = z.object({
  period_s: z.number().positive(),
  max: z.number().int().positive(),
  mu_min: z.array(z.number().positive().nullable()),
  cut_s: z.tuple([z.number().positive(), z.number().positive()]),
  /** The lead's ruling 6 (26 Nov 09:50): no fallback thing; while no kind can be drawn (before the plasma cutter, or before a line) lots WAIT for one the yard can open. */
  kinds: z.array(LotKindSchema).min(1),
});
/** The crate, "the picking table" (2.10.2): share of a tip by hash, things it holds, seconds a thing, the factor on its prepared value. No hold time (P2). */
const CrateSchema = z.object({ share: z.number().min(0).max(1), max: z.number().int().positive(), sort_s: z.number().positive(), u: z.number().positive() });
/** The Yard sale (2.12). */
const ReuseSchema = z.object({
  slots: z.number().int().positive(),
  levelSlots: z.number().int().nonnegative(),
  levels: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
  /** The things that may be tagged reusable, by object id (`fromPartnerOnly`: only when it came in a named partner's load, and its tag adds "Checked", T15). */
  kinds: z.record(id, z.object({ fromPartnerOnly: z.boolean().default(false) })),
  /** The tags no reusable thing may carry (THING_TAGS; a content check, T23). */
  never: z.array(z.enum(THING_TAGS)),
  factor: z.number().positive(),
  /** By rung (length ladder.topRung; null below rung 3): the share of max(I0, floorI) an hour the public pays at most. */
  shareI: z.array(z.number().positive().nullable()),
  floorI: z.number().nonnegative(),
  period_s: z.number().nonnegative(),
  firstVisitor_s: z.number().nonnegative(),
  batchFactor: z.number().positive(),
  vanPeriod_s: z.number().positive(),
  firstThing: id,
});
/** Plant finance (2.14). `shareWords` the card's words for `share` ("A fifth" at 0.2, else its percentage). */
const BankSchema = z.object({
  share: z.number().min(0).max(1),
  shareWords: z.string().min(1),
  charge: z.number().nonnegative(),
  maxShare: z.number().min(0).max(1),
  maxF_h: z.number().nonnegative(),
  maxF_tau: z.number().nonnegative(),
  minPrice_h: z.number().nonnegative(),
  maxAgreements: z.literal(1),
});
/** The mode's part of real money (2.15; the sixteen products are the shared list's, B5). */
export const LOOK_SLOTS = ['colour', 'dressing', 'plaque', 'sign'] as const;
const IapSchema = z.object({
  packsFromRung: z.literal(4),
  /** RULING2.md 15.12 (b), 15.13 (c): how many quotes of one product may stand at once: fixed at 3. */
  maxStanding: z.literal(3),
  /** Store-account countries where packs are off at launch (ISO 3166-1 alpha-2: the EEA and Switzerland, fixed). */
  packsOff: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1),
  /** Product id -> the look slot it fills and the look's register id. */
  lookOf: z.record(id, z.object({ slot: z.enum(LOOK_SLOTS), value: z.string() })),
  looks: z.array(z.enum(LOOK_SLOTS)),
});
/** Rewarded ads (2.16). `dayHours_h`: "a day's income" in production hours of the twice-a-day habit, by rung (ruling 10.6; null below rung 3). */
const AdsSchema = z.object({
  awayPerDay: z.number().int().nonnegative(),
  awayMinAbsence_min: z.number().positive(),
  awayShare: z.number().min(0).max(1),
  awayCap_min: z.number().nonnegative(),
  spotShare: z.number().min(0).max(1),
  spotCap_min: z.number().nonnegative(),
  spotPerDay: z.number().int().nonnegative(),
  maxDayShare: z.number().min(0).max(1),
  dayHours_h: z.array(z.number().positive().nullable()),
});

/**
 * THE WORKS LAYER of the families (see the head of this section): entries that join `grades`, `objects`,
 * `partners`, `shop`, `tools`, `carriers` and `bays` from rung 3. An id may not repeat one of the first
 * layer (a content check): the layer adds, it never replaces.
 */
const LayerGradeSchema = GradeSchema.extend({
  bay: z.object({ kind: z.enum(BAY_KINDS), sprite: spriteId.optional(), place: id.optional(), slot: z.number().int().nonnegative().optional() }).optional(),
});
export const WorksLayerSchema = z.object({
  grades: z.record(id, LayerGradeSchema).default({}),
  objects: z.record(id, ObjectSchema).default({}),
  partners: z.record(id, PartnerSchema).default({}),
  shop: z.array(ShopItemSchema).default([]),
  tools: z.record(id, ToolSchema).default({}),
  carriers: z.record(id, z.number().positive()).default({}),
  bays: z.record(id, z.number().positive()).default({}),
});
export type WorksLayerDef = z.infer<typeof WorksLayerSchema>;
/** The content file's input types of the stage-2 blocks (SalvageSchema's own input is the preprocess's unknown). */
export type WorksInput = z.input<typeof WorksSchema>;
export type WorksLayerInput = z.input<typeof WorksLayerSchema>;
export type MapWorksInput = z.input<typeof MapWorksSchema>;

// ---------------------------------------------------------------------------------------- the block

const SalvageObject = z.object({
  /** True while the block is the frozen TEST content of hour 0 (validate says so as a warning). */
  skeletonPlaceholder: z.boolean().default(false),
  /** Free text: which content this is (content3 `version`), its units line, its changes and its key list (provenance, never read). */
  version: z.string().default(''),
  units: z.string().optional(),
  $changes: z.array(z.string()).optional(),
  $keys: z.array(z.string()).optional(),
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
  truck: TruckSchema.default({ v: 9, handle_s: 14, driverFactor: 0.8, radius: 1.3, enter: 2.0, rearm: 0.8, tare_kg: 0, skipTare_kg: 0 }),
  machines: MachinesSchema,
  crew: CrewSchema,
  dropoff: DropoffSchema,
  partners: z.record(id, PartnerSchema),
  /** Kilograms the tipping floor holds. */
  floorRoom_kg: z.number().positive(),
  merchant: MerchantSchema,
  /** Every purchase of the hour in goal order (E2, E18). */
  shop: z.array(ShopItemSchema),
  /** content3 (E22): purchases on sale from day 1, out of the hour's goal order (hand2, cutter2, alu, night). The shop is `shop` ∪ `dayOneList`. */
  dayOneList: z.array(ShopItemSchema).default([]),
  /** content3 (E22): the goal order of purchases (shop keys). */
  goalOrder: z.array(id).default([]),
  /** content3: display pacing the prototype measured under. NOT A RULE (E18: the shop is cash-gated without any waiting rule); never read by the rules. */
  shopRules: z.object({ onSale: z.number().optional(), cardDelay_s: z.number().optional(), reserve: z.string().optional() }).passthrough().optional(),
  /** content3: kilograms of one whole unit of the grades collected whole (conv, mot, cyl, alw): a lot never takes part of one. */
  wholeUnits_kg: z.record(id, z.number().positive()).default({}),
  levels: LevelsSchema,
  ladder: LadderSchema,
  /** Capacity guards by rung, t/h (rungs 1 to 3 in the first yard; STAGE 2: one a rung to `ladder.topRung`, B18). */
  ceilings_t_h: z.array(z.number().positive()).min(3),
  /** STAGE 2 (2.11, B18): tau_r, the payback hours of rung r for plate prices and level caps; null at rungs 1 and 2; length ladder.topRung. */
  tau_h: z.array(z.number().positive().nullable()).optional(),
  /** E33 (rules-sim-a, 19:50): the away cap by rung, hours ([rung 1, rung 2, rung 3, ...]; the last holds beyond). */
  awayCapByRung_h: z.array(z.number().positive()).min(1),
  /** E33: hours the Night watch adds to the away cap on any rung. */
  nightWatch_h: z.number().nonnegative(),
  rivals: RivalsSchema,

  // part one's keys (yard-stage1.md 2.1 to 2.11)
  reach: ReachSchema.default({ work: 1.4, pickup: 1.0, place: 1.2, sight: 8 }),
  feel: FeelSchema.default({ workDelay: 0.3, staleS: 0.6 }),
  scale: ScaleSchema.default({ platformMaxKg: 300, bridgeStepKg: 20, platformStepKg: 0.1 }),
  /** Bay capacity by grade, kilograms (the master's two hours of flow); a grade without an entry: 2000. */
  bays: z.record(id, z.number().positive()).default({}),
  cut: CutSchema.default({ minS: 0.6 }),
  board: BoardSchema.default({ a: 0.03, wordBand: 0.015, epochMs: Date.UTC(2026, 0, 5) }),
  deal: DealSchema.default({ partner: 'foundry', grade: 'ci', gate: 'rung2', series: [], trust: { up: 10, down: 15, start: 50 } }),
  foreman: ForemanSchema.default({ boost: 0.25, windowS: 60, minutesPerDay: 45 }),
  away: AwaySchema.default({ gapS: 10, cardS: 60 }),
  /**
   * owner1 S1 (RULING-owner1): which stage this build plays. 1: the first yard only (the works never open, the ladder's
   * top is rung 3, no shop, pack, ad, away bonus, letter, Agreements tab or bank); 2: everything. Absent: 2.
   */
  release: z.object({ stage: z.number().int().min(1).max(2) }).optional(),
  group: GroupSchema.optional(),
  // STAGE 2 (yard-stage2.md 5.1; content2): absent in the first yard's test content; nothing below rung 3 reads them.
  works: WorksSchema.optional(),
  crane: CraneSchema.optional(),
  shear: z.object({ P: z.number().positive() }).optional(),
  forklift: ForkliftSchema.optional(),
  depollution: z.object({ s: z.number().positive() }).optional(),
  lots: LotsSchema.optional(),
  crate: CrateSchema.optional(),
  reuse: ReuseSchema.optional(),
  bank: BankSchema.optional(),
  iap: IapSchema.optional(),
  ads: AdsSchema.optional(),
  worksLayer: WorksLayerSchema.optional(),
  goals: z.array(GoalSchema).default([]),
  /** goals.json's day-one goals (after `goals` are all done or skipped, in order). */
  dayOne: z.array(GoalSchema).default([]),
  /** STAGE 2 (1.3, 2.13; goals2 and rules-money, 26 Nov): goals.json's `stage2` list, offered from the works' rung. Absent in a first-yard content. */
  stage2: z.array(GoalSchema).optional(),
  /** The first minutes' teaching timings (goals.json `teach`, seconds and ratios: lessonQuietS, jumpRatio, ...). */
  teach: z.record(z.string(), z.number()).default({}),
  advice: AdviceSchema.default({ minutes: 3, promptGapS: 60, reserveS: 120 }),
  /** Grades whose first weigh-in prints a lesson (a lesson.* text key). */
  lessons: z.record(id, z.string()).default({}),
  /** ADDED (finding P2): the value grades (copper, brass, the converter): their lesson ALWAYS shows on the boss's first weigh-in of the grade, whatever was weighed before and however early. */
  valueLessons: z.array(id).default(['bb', 'brs', 'conv']),
  /** BUILD (strings' text.json): words that live in data (Help's lessons, partners' lines, the glossary). */
  text: z
    .object({
      lessons: z.record(z.string(), z.object({ ticket: z.string(), help: z.string() })).default({}),
      partners: z.record(z.string(), z.object({ card: z.string(), line: z.string() })).default({}),
      /** `fromRung` (s2a-fix, the lead's ruling 7 of 26 Nov 09:50): the rung from which Help lists the term (stage 2's terms from 3; absent: 1). */
      glossary: z.array(z.object({ term: z.string(), line: z.string(), fromRung: z.number().int().min(1).optional() })).default([]),
    })
    .optional(),
}).superRefine((s, ctx) => {
  // STAGE 2, 5.2 (14), B18: with `ladder.topRung` given, every per-rung list has its length, and tau is null at rungs 1 and 2.
  const top = s.ladder.topRung;
  if (top === undefined) return;
  const lists: [string, unknown[] | undefined][] = [
    ['ceilings_t_h', s.ceilings_t_h],
    ['tau_h', s.tau_h],
    // awayCapByRung_h's length is lintStage2More's (f) (s2a-fix): a content frozen before it (salvage-stage2.json) must still parse.
    ['lots.mu_min', s.lots?.mu_min],
    ['reuse.shareI', s.reuse?.shareI],
    ['ads.dayHours_h', s.ads?.dayHours_h],
  ];
  for (const [k, l] of lists) if (l && l.length !== top) ctx.addIssue({ code: 'custom', path: k.split('.'), message: `${k} has ${l.length} entries; ladder.topRung ${top} wants one a rung (B18; e.g. [${l.join(', ')}])` });
  if (s.tau_h) {
    s.tau_h.forEach((v, i) => {
      if (i < 2 && v !== null) ctx.addIssue({ code: 'custom', path: ['tau_h', i], message: `tau_h[${i}] (rung ${i + 1}) is ${v}: tau is null at rungs 1 and 2 (B18)` });
      if (i >= 2 && v === null) ctx.addIssue({ code: 'custom', path: ['tau_h', i], message: `tau_h[${i}] (rung ${i + 1}) is null: every rung from 3 has a payback time` });
    });
  }
});

/**
 * desk2 (E33): content written before E33 (regression data: bots' saved states, the content3 prototype) names
 * the away cap as `awayCap_h: [without, with the Night watch]`; it reads as one rung at the first figure
 * and the Night watch adding the difference. The schema itself holds no away-cap number.
 */
function legacyAwayCap(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const o = raw as Record<string, unknown>;
  const old = o.awayCap_h;
  if (!Array.isArray(old) || old.length !== 2 || typeof old[0] !== 'number' || typeof old[1] !== 'number') return raw;
  const { awayCap_h: _drop, ...rest } = o;
  return { ...rest, awayCapByRung_h: rest.awayCapByRung_h ?? [old[0]], nightWatch_h: rest.nightWatch_h ?? Math.max(0, old[1] - old[0]) };
}

export const SalvageSchema = z.preprocess(legacyAwayCap, SalvageObject);

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
    const sum = o.pieces.reduce((a, [, g, n]) => a + g * n, 0) + o.waste_g + (o.shell?.g ?? 0);
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
  {
    const o = s.levels.opens;
    if (o && !/^rung\d+$/.test(o) && !s.shop.some((i) => i.key === o) && !s.dayOneList.some((i) => i.key === o)) out.push(`levels.opens "${o}" is neither a rung id (rung2) nor a shop key`);
  }
  for (const [o] of s.dropoff.mix) object(o, 'dropoff.mix');
  for (const o of s.dropoff.initial) object(o, 'dropoff.initial');
  for (const o of s.dropoff.opening) object(o, 'dropoff.opening');
  for (const [oid, o] of Object.entries(s.objects)) {
    if (o.pieceTiers && o.pieceTiers.length !== o.pieces.length) out.push(`objects.${oid}.pieceTiers: one tier for each entry of pieces (${o.pieces.length})`);
    if (o.shell) grade(o.shell.grade, `objects.${oid}.shell`);
  }
  for (const g of s.valueLessons) grade(g, 'valueLessons');
  for (const [g] of s.machines.bench.out) grade(g, 'machines.bench.out');
  for (const [rid, r] of Object.entries(s.machines.crucible.recipes)) for (const g of [...(Array.isArray(r[0]) ? r[0] : [r[0]]), r[1], r[3]]) grade(g, `machines.crucible.recipes.${rid}`);
  for (const i of [...s.shop, ...s.dayOneList]) point(i.place, `shop.${i.key}.place`);
  const keys = new Set<string>();
  for (const i of [...s.shop, ...s.dayOneList]) {
    if (keys.has(i.key)) out.push(`duplicate shop key "${i.key}"`);
    keys.add(i.key);
  }
  if ((s.carriers.frame ?? 0) > 30) out.push('carriers.frame: the hand load is at most 30 kg (S8)');
  for (const g of Object.keys(s.bays)) grade(g, 'bays');
  for (const g of Object.keys(s.lessons)) grade(g, 'lessons');
  for (const k of s.goalOrder) if (!keys.has(k)) out.push(`goalOrder names "${k}", which is not a shop key`);
  for (const [g, gr] of Object.entries(s.grades)) if (gr.bay?.place) point(gr.bay.place, `grades.${g}.bay.place`);
  const rivalIds = new Set<string>();
  for (const r of s.rivals.list) {
    if (rivalIds.has(r.id)) out.push(`duplicate rival id "${r.id}"`);
    rivalIds.add(r.id);
  }
  // The container wall has one source: map.walls (content3). The world block's wall props must match it.
  const wallProps = s.props.filter((p) => p.kind === 'wall');
  if (s.map.walls.length && wallProps.length && (wallProps.length !== s.map.walls.length || s.map.walls.some((w, i) => Math.abs(w.x - wallProps[i].x) > 1e-6 || Math.abs(w.y - wallProps[i].y) > 1e-6 || Math.abs(w.w - wallProps[i].w) > 1e-6 || Math.abs(w.d - wallProps[i].d) > 1e-6))) out.push('props: the wall props differ from map.walls (the one container wall)');
  const ids = new Set<string>();
  for (const p of s.props) {
    if (ids.has(p.id)) out.push(`duplicate prop id "${p.id}"`);
    ids.add(p.id);
    if (p.x < 0 || p.y < 0 || p.x > s.yard.width || p.y > s.yard.depth) out.push(`prop "${p.id}" stands outside the yard`);
  }
  for (const [pid, [x, y]] of Object.entries(s.map.points)) if (pid in s.map.places && (x < 0 || y < 0 || x > s.yard.width || y > s.yard.depth)) out.push(`map point "${pid}" lies outside the yard`);
  out.push(...lintStage2(s));
  return out;
}

// ============================================================================ STAGE 2: the merged view and the checks

/**
 * The content with the works layer joined to the families (grades, objects, partners, shop, tools,
 * carriers, bays): what the rules read from the tick of `backFieldOpen` (Phase B: content.ts and
 * positions.ts `mapAt` take it from here). Without a layer: the content itself.
 */
export function withWorksLayer(s: SalvageContent): SalvageContent {
  const L = s.worksLayer;
  if (!L) return s;
  return {
    ...s,
    grades: { ...s.grades, ...(L.grades as Record<string, GradeDef>) },
    objects: { ...s.objects, ...L.objects },
    partners: { ...s.partners, ...L.partners },
    shop: [...s.shop, ...L.shop],
    tools: { ...s.tools, ...L.tools },
    carriers: { ...s.carriers, ...L.carriers },
    bays: { ...s.bays, ...L.bays },
  };
}

/** RULING2 (fixed): the store-account countries where packs are off at launch: the EEA and Switzerland (iap.packsOff must be exactly these). */
export const PACKS_OFF_FIXED = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH'] as const;
/** T24 (fixed): the materials the magnet crane never lifts. */
export const CRANE_NEVER_FIXED = ['copper', 'brass', 'bronze', 'alu', 'lead', 'stainless'] as const;
/** Ruling 9.1 (fixed): the scrip packs' hours of I (pack2, pack5, pack10, pack20). */
export const PACK_HOURS = [2, 5, 10, 20] as const;
/** E5, 5.2 (8): the board moves a price by at most 5.7 % a day. */
export const ONE_DAY_FALL = 0.943;
/** Ruling 13.5, 5.2 (11): every plate and recipe nets at least this much more than its input at p̄. */
export const PLATE_GAIN = 1.05;
/** 5.2 (12): a sorter's sorted value is at most this many times its input's. */
export const SORT_CAP = 1.5;
/** Ruling 10.6: "a day's income" counts the twice-a-day habit's played hours beside its two capped absences. */
export const HABIT_PLAY_H = 0.3;

const rungOf = (gate: string | null | undefined): number => {
  const m = /^rung(\d+)$/.exec(gate ?? '');
  return m ? Number(m[1]) : 1;
};

/**
 * The stage-2 checks of yard-stage2.md 5.2 that read the content alone (the map's, 3.6, are
 * scripts/content/yard_map.py's; those that need the bots' table or the words are build-yard.py's
 * warnings). Each finding names the key and the smallest failing case. Silent on a content without
 * stage 2's blocks (the frozen test content).
 */
export function lintStage2(s0: SalvageContent): string[] {
  const out: string[] = [];
  const L = s0.worksLayer;
  if (!L && !s0.works) return out;
  const s = withWorksLayer(s0);
  const G = s.grades;
  const O = s.objects;
  const plates = s.works?.plates ?? {};
  const isGrade = (g: string) => !!G[g];
  const pbar = (g: string) => (G[g] && G[g].family !== 'pm' ? G[g].pbar : 0);
  const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9;
  const mapPlaces = new Set([...Object.keys(s.map.points), ...Object.keys(s.map.works?.points ?? {})]);

  // ---- the layer adds, never replaces; what it names exists
  if (L) {
    for (const [fam, a, b] of [
      ['grades', s0.grades, L.grades],
      ['objects', s0.objects, L.objects],
      ['partners', s0.partners, L.partners],
      ['tools', s0.tools, L.tools],
      ['carriers', s0.carriers, L.carriers],
      ['bays', s0.bays, L.bays],
    ] as const)
      for (const k of Object.keys(b)) if (k in a) out.push(`worksLayer.${fam}.${k} repeats a first-layer ${fam} id (the layer adds, it never replaces)`);
    const keys = new Set([...s0.shop, ...s0.dayOneList].map((i) => i.key));
    for (const i of L.shop) {
      if (keys.has(i.key)) out.push(`worksLayer.shop "${i.key}" repeats a shop key`);
      keys.add(i.key);
      if (!mapPlaces.has(i.place)) out.push(`worksLayer.shop.${i.key}.place "${i.place}" is not a map point of either layer`);
      if (i.needsItem && !keys.has(i.needsItem) && !plates[i.needsItem]) out.push(`worksLayer.shop.${i.key}.needsItem "${i.needsItem}" is neither a shop key nor a plate`);
    }
    for (const [oid, o] of Object.entries(L.objects)) {
      o.pieces.forEach((p, i) => {
        if (!isGrade(p[0])) out.push(`worksLayer.objects.${oid}.pieces[${i}] names grade "${p[0]}", which is in neither layer`);
        if (p.length === 5 && !isGrade(p[4])) out.push(`worksLayer.objects.${oid}.pieces[${i}] assays to "${p[4]}", which is not a grade`);
      });
      if (o.whole && !isGrade(o.whole)) out.push(`worksLayer.objects.${oid}.whole "${o.whole}" is not a grade`);
      if (o.shell && !isGrade(o.shell.grade)) out.push(`worksLayer.objects.${oid}.shell "${o.shell.grade}" is not a grade`);
      const sum = o.pieces.reduce((a, p) => a + p[1] * p[2], 0) + o.waste_g + (o.shell?.g ?? 0);
      if (sum !== o.gross_g) out.push(`worksLayer.objects.${oid}: pieces, shell and waste weigh ${sum} g, gross_g says ${o.gross_g} g (mass is kept)`);
      if (o.pieces.some((p) => G[p[0]]?.family === 'pm') && !o.source) out.push(`worksLayer.objects.${oid} gives a converter but has no source (S7)`);
      if (o.pieceTiers && o.pieceTiers.length !== o.pieces.length) out.push(`worksLayer.objects.${oid}.pieceTiers: one tier for each entry of pieces`);
    }
    for (const [oid, o] of Object.entries(s0.objects)) o.pieces.forEach((p, i) => p.length === 5 && !isGrade(p[4]) && out.push(`objects.${oid}.pieces[${i}] assays to "${p[4]}", which is in neither layer`));
    const lanes = { ...s.map.lane, ...(s.map.works?.lane ?? {}) };
    for (const [pid, p] of Object.entries(L.partners)) {
      for (const o of [...Object.keys(p.trial), ...Object.keys(p.skip), ...(p.grows ?? []).flatMap((x) => Object.keys(x.contents))]) if (!O[o]) out.push(`worksLayer.partners.${pid} names object "${o}", which is in neither layer`);
      if (lanes[p.lane] === undefined) out.push(`worksLayer.partners.${pid}.lane "${p.lane}" is in neither map.lane nor map.works.lane`);
      if (!keys.has(p.opens)) out.push(`worksLayer.partners.${pid}.opens "${p.opens}" is not a shop key`);
      for (const x of p.grows ?? []) if (!plates[x.needs]) out.push(`worksLayer.partners.${pid}.grows needs "${x.needs}", which is not a works plate`);
    }
    for (const g of Object.keys(L.bays)) if (!isGrade(g)) out.push(`worksLayer.bays.${g} is not a grade`);
    for (const [g, gr] of Object.entries(L.grades)) if (gr.bay?.place && !mapPlaces.has(gr.bay.place)) out.push(`worksLayer.grades.${g}.bay.place "${gr.bay.place}" is not a map point of either layer`);
  }
  for (const [pid, p] of Object.entries(s0.partners)) if (p.reuseBatch && !O[p.reuseBatch.obj]) out.push(`partners.${pid}.reuseBatch names "${p.reuseBatch.obj}", which is not an object`);

  // ---- the plates: (1) mass, (2) inputs, outputs, chains, (11) every plate pays, (12) price order
  const valueIn = (x: string): number => {
    if (x === STREAM) return 0;
    if (isGrade(x)) return pbar(x);
    const o = O[x];
    if (!o) return 0;
    if (o.whole && isGrade(o.whole)) return pbar(o.whole);
    return objectAsFound(s, x) / (o.gross_g / 1000);
  };
  const valueOut = (sh: [string, number][]) => sh.reduce((a, [g, k]) => a + (isGrade(g) ? pbar(g) * k : 0), 0);
  const sellable = (sh: [string, number][]) => sh.filter(([g]) => isGrade(g)).reduce((a, [, k]) => a + k, 0);
  const known = (x: string) => isGrade(x) || !!O[x] || x === STREAM || x === CARRIER;
  type Step = { where: string; inputs: string[]; outOf: (i: string) => [string, number][]; wasteOf: (i: string) => [string, number][]; reagents: [string, number, number][] };
  const steps: Step[] = [];
  for (const [pid, p] of Object.entries(plates)) {
    if (s.works && p.financeable !== undefined) {
      const fin = Object.values(p.recipes ?? {}).some((r) => sellable(r.out) > 0) || Object.values(p.out).some((sh) => sellable(sh) > 0);
      if (fin !== p.financeable) out.push(`works.plates.${pid}.financeable is ${p.financeable}; it is derived: ${fin} (out holds a sellable grade)`);
    }
    if (p.kind === 'assay' || p.kind === 'handling') continue;
    if (p.kind === 'batch') {
      if (!p.batch) out.push(`works.plates.${pid}: a batch plate needs batch {kg, s, start_share, start_idle}`);
      if (!p.recipes || !Object.keys(p.recipes).length) out.push(`works.plates.${pid}: a batch plate needs at least one recipe`);
      for (const [rid, r] of Object.entries(p.recipes ?? {})) steps.push({ where: `works.plates.${pid}.recipes.${rid}`, inputs: r.in, outOf: () => r.out, wasteOf: () => r.waste, reagents: r.reagents });
    } else {
      if (p.kind === 'rate' && p.rate_kg_s === undefined && pid !== 'shear' && p.feedBy !== 'stream') out.push(`works.plates.${pid}: a rate plate needs rate_kg_s (the shear's comes from shear.P, a stream-fed plate runs at its stream)`);
      steps.push({ where: `works.plates.${pid}`, inputs: p.in, outOf: (i) => p.out[i] ?? [], wasteOf: (i) => p.waste[i] ?? [], reagents: p.reagents });
      for (const i of p.in) if (!p.out[i]) out.push(`works.plates.${pid}.out has no entry for its input "${i}" (out is given per input, E7)`);
      for (const k of Object.keys(p.out)) if (!p.in.includes(k)) out.push(`works.plates.${pid}.out names "${k}", which is not one of its inputs`);
    }
    if (!mapPlaces.has(p.plot)) out.push(`works.plates.${pid}.plot "${p.plot}" is not a map point of either layer`);
    if (p.needs && !plates[p.needs]) out.push(`works.plates.${pid}.needs "${p.needs}" is not a plate`);
    for (const [k, q] of Object.entries(p.feeds ?? {})) {
      if (!plates[q]) out.push(`works.plates.${pid}.feeds.${k} "${q}" is not a plate`);
      else {
        let n: string | null = plates[q].needs;
        let ok = false;
        for (let hop = 0; n && hop < 20; hop++, n = plates[n]?.needs ?? null) if (n === pid) ok = true;
        if (!ok || plates[q].row !== p.row || plates[q].slot <= p.slot) out.push(`works.plates.${pid}.feeds ${q}: a feeds chain out of order (${q} must need ${pid} and follow it in its row: slot ${plates[q].slot} after ${p.slot})`);
        if (plates[q].feedBy !== 'stream') out.push(`works.plates.${q} is fed by ${pid}'s stream: its feedBy is "stream"`);
      }
    }
  }
  // a needs cycle
  for (const pid of Object.keys(plates)) {
    const seen = new Set<string>();
    for (let n: string | null = pid; n; n = plates[n]?.needs ?? null) {
      if (seen.has(n)) {
        out.push(`works.plates: a needs cycle through ${[...seen].join(' -> ')}`);
        break;
      }
      seen.add(n);
    }
  }
  for (const st of steps) {
    for (const i of st.inputs) {
      if (!known(i)) out.push(`${st.where}: input "${i}" is not a grade, an object or the stream`);
      const o = st.outOf(i);
      const w = st.wasteOf(i);
      for (const [g] of [...o, ...w]) if (!known(g)) out.push(`${st.where}: "${g}" (out or waste of ${i}) is not a grade, an object, the stream or the carrier`);
      const r = st.reagents.reduce((a, [, k]) => a + k, 0);
      const sum = o.reduce((a, [, k]) => a + k, 0) + w.reduce((a, [, k]) => a + k, 0);
      // (1) mass is kept
      if (!near(sum, 1 + r)) out.push(`${st.where}: input ${i}: out + waste = ${+sum.toFixed(12)}, 1 + reagents = ${+(1 + r).toFixed(12)} (mass is kept, 5.2 (1))`);
      // (2) no plate mints tonnes
      if (sellable(o) > 1 + 1e-9) out.push(`${st.where}: input ${i} gives ${+sellable(o).toFixed(6)} kg of sellable grades a kilogram (at most 1, B16)`);
      // (11) every plate and every recipe pays
      const vin = valueIn(i);
      const vout = valueOut(o) - st.reagents.reduce((a, [, k, pr]) => a + k * pr, 0);
      if (vout <= 0 || (vin > 0 && vout < PLATE_GAIN * vin - 1e-9)) out.push(`${st.where}: input ${i} at p̄ is §${vin.toFixed(3)} a kg, its out after reagents §${vout.toFixed(3)} (+${vin > 0 ? (100 * (vout / vin - 1)).toFixed(1) : 'inf'} %; at least +5 %, ruling 13.5)`);
    }
  }
  // (2) a closed vessel into the shear or the shredder is certified empty; a hands-fed plate stands in the south yard
  for (const [pid, p] of Object.entries(plates)) {
    for (const i of p.in) if (O[i]?.tags?.includes('vessel') && !O[i].certifiedEmpty && (pid === 'shear' || pid === 'shredder')) out.push(`works.plates.${pid} takes ${i}, a closed vessel without certifiedEmpty (T23)`);
    const W = s.map.works;
    const at = W?.points[p.plot] ?? s.map.points[p.plot];
    if (p.feedBy === 'hands' && W && at && at[0] < W.fence.x) out.push(`works.plates.${pid} is fed by hands but its plot ${p.plot} (${at[0]}, ${at[1]}) is west of the field fence (x ${W.fence.x}): hands carry only in the south yard (2.8.1)`);
    if (p.feedBy === 'bays' && W && at && at[0] >= W.fence.x) out.push(`works.plates.${pid} draws from the bays but stands in the first yard (${at[0]}, ${at[1]}): only back-field plates are bay-fed`);
  }
  // (2) every plate input is brought by a source open at the plate's gate
  {
    const src = sourcesByRung(s);
    for (const [pid, p] of Object.entries(plates)) {
      const r = rungOf(p.gate);
      const ins = p.kind === 'batch' ? Object.values(p.recipes ?? {}).flatMap((x) => x.in) : p.in;
      for (const i of ins) if (i !== STREAM && (src.get(i) ?? 99) > r) out.push(`works.plates.${pid} (gate rung ${r}) takes "${i}", which no source open by rung ${r} brings (${src.has(i) ? `first at rung ${src.get(i)}` : 'none at all'})`);
    }
  }
  // (12) the trade's price order (T4)
  if (G.twitch && G.alw && !(G.twitch.pbar < G.alw.pbar)) out.push(`grades.twitch §${G.twitch.pbar} is not below alloy wheels §${G.alw.pbar} (T4: wheels > twitch > zorba)`);
  if (G.zorba && G.twitch && !(G.zorba.pbar < G.twitch.pbar)) out.push(`grades.zorba §${G.zorba.pbar} is not below twitch §${G.twitch.pbar} (T4)`);
  if (plates.sorter)
    for (const i of plates.sorter.in) {
      const v = valueOut(plates.sorter.out[i] ?? []);
      if (pbar(i) > 0 && v > SORT_CAP * pbar(i) + 1e-9) out.push(`works.plates.sorter: ${i} sorted is worth §${v.toFixed(3)} a kg, over ${SORT_CAP} x its §${pbar(i)} (T4)`);
    }

  // ---- (5) the Yard sale's kinds
  if (s.reuse) {
    for (const [k, def] of Object.entries(s.reuse.kinds)) {
      const o = O[k];
      if (!o) {
        out.push(`reuse.kinds.${k} is not an object`);
        continue;
      }
      const bad = (o.tags ?? []).filter((t) => s.reuse!.never.includes(t));
      if (bad.length) out.push(`reuse.kinds.${k} is tagged ${bad.join(', ')} (never reusable, T23)`);
      if (/bike|bicycle/i.test(k) && !def.fromPartnerOnly) out.push(`reuse.kinds.${k}: a bicycle is reusable only from a named partner's load (fromPartnerOnly, T15)`);
    }
    if (!O[s.reuse.firstThing]) out.push(`reuse.firstThing "${s.reuse.firstThing}" is not an object`);
    else if (!s.reuse.kinds[s.reuse.firstThing]) out.push(`reuse.firstThing "${s.reuse.firstThing}" is not one of reuse.kinds`);
    for (const t of ['electrical', 'sealed', 'vessel', 'battery', 'carPart', 'fuel', 'childSafety'] as const) if (!s.reuse.never.includes(t)) out.push(`reuse.never lacks "${t}" (T23)`);
  }

  // ---- (6) the ads fit the day; (7) the packs stay under tau_4
  const top = s.ladder.topRung ?? 3;
  if (s.ads) {
    const a = s.ads;
    for (let r = 3; r <= top; r++) {
      const h = a.dayHours_h[r - 1];
      if (h === null || h === undefined) {
        out.push(`ads.dayHours_h[${r - 1}] (rung ${r}) is missing`);
        continue;
      }
      const used = a.awayCap_min * a.awayPerDay + a.spotCap_min * a.spotPerDay;
      if (used > a.maxDayShare * 60 * h + 1e-9) out.push(`ads at rung ${r}: ${a.awayCap_min} x ${a.awayPerDay} + ${a.spotCap_min} x ${a.spotPerDay} = ${used} minutes of I a day, over ${a.maxDayShare} x 60 x ${h} h = ${(a.maxDayShare * 60 * h).toFixed(2)} (5.2 (6))`);
      if (r > s.awayCapByRung_h.length) continue; // a content without stage 2's length is refused by the superRefine (14)
      const cap = s.awayCapByRung_h[r - 1];
      const want = Math.round((2 * (cap + s.nightWatch_h) + HABIT_PLAY_H) * 100) / 100;
      if (!near(h, want)) out.push(`ads.dayHours_h[${r - 1}] (rung ${r}) is ${h} h; the habit gives 2 x (${cap} + ${s.nightWatch_h}) + ${HABIT_PLAY_H} = ${want} h (ruling 10.6)`);
    }
  }
  if (s.tau_h && s.tau_h.length >= 4) {
    const t4 = s.tau_h[3];
    if (t4 !== null && t4 <= 20) out.push(`tau_h[3] (rung 4) is ${t4} h: tau_4 > 20 h is fixed (E11), so that the 20 h pack stays under it`);
    for (const H of PACK_HOURS) if (t4 !== null && H >= t4) out.push(`a pack of ${H} hours of I is not under tau_4 ${t4} h (5.2 (7))`);
  }

  // ---- (8) no bought load nets a loss with an agreement open, after a one-day fall (E5)
  if (s.bank) {
    const keep = (1 - s.bank.share) * ONE_DAY_FALL;
    for (const [pid, ld] of partnerLoads(s)) if (ld.prepared * keep < ld.price - 1e-9) out.push(`partners.${pid} load "${ld.name}": prepared §${ld.prepared.toFixed(2)} x (1 - ${s.bank.share}) x ${ONE_DAY_FALL} = §${(ld.prepared * keep).toFixed(2)} is below its price §${ld.price.toFixed(2)} (E5, 5.2 (8))`);
    const words = near(s.bank.share, 0.2) ? 'A fifth' : `${Math.round(s.bank.share * 100)} %`;
    if (s.bank.shareWords !== words) out.push(`bank.shareWords "${s.bank.shareWords}" does not say bank.share ${s.bank.share} ("${words}")`);
  }
  // the layer partners' stored figures are their contents' (as the first yard's lint holds k x as found)
  for (const [pid, p] of Object.entries(L?.partners ?? {})) {
    const want = { trialMass_kg: massKg(s, p.trial), skipMass_kg: massKg(s, p.skip), trialPrepared: preparedValue(s, p.trial, []), skipPrepared: preparedValue(s, p.skip, []), skipPrice: Math.round(p.k * asFoundValue(s, p.skip)) };
    for (const [k, v] of Object.entries(want)) {
      const have = (p as unknown as Record<string, number>)[k];
      if (Math.abs(have - v) > Math.max(1, 0.01 * v)) out.push(`worksLayer.partners.${pid}.${k} is ${have}; its contents give ${Math.round(v * 100) / 100}`);
    }
  }

  // ---- (13) an oversize piece's kind needs a tool the yard can own by the first rung it can come
  if (s.lots) {
    const tierBy = toolTierByRung(s);
    for (const k of s.lots.kinds) {
      const o = O[k.obj];
      if (!o) {
        out.push(`lots.kinds: "${k.obj}" is not an object`);
        continue;
      }
      for (const l of k.line) if (!plates[l] && !(l in s.machines)) out.push(`lots.kinds.${k.obj}.line "${l}" is neither a plate nor a first-yard machine`);
      const first = Math.max(3, k.line.length ? Math.min(...k.line.map((l) => (plates[l] ? rungOf(plates[l].gate) : 1))) : 3);
      const need = Math.max(o.tier, ...(o.pieceTiers ?? []));
      if (need > tierBy(first)) out.push(`lots.kinds.${k.obj} needs tool tier ${need}; the yard can own at most tier ${tierBy(first)} by rung ${first}, the first at which it can come (decision 28)`);
    }
    if (s.lots.cut_s[0] > s.lots.cut_s[1]) out.push(`lots.cut_s [${s.lots.cut_s.join(', ')}]: the least seconds first`);
  }
  // ---- B4, 5.2 (4): what rung 4's range needs depends on no tool the player cannot own by then
  if (top >= 4) {
    const src = sourcesByRung(s);
    const mats = new Set(Object.values(G).map((g) => g.material).filter((m): m is string => !!m));
    const reach = [...mats].filter((m) => Object.entries(G).some(([g, d]) => d.material === m && (src.get(g) ?? 99) <= 4));
    const need = (rungsOf4(s) ?? 0);
    if (reach.length < need) out.push(`rung 4 asks a range of ${need}; by rung 4 the sources reach only ${reach.length} materials (${reach.join(', ')}) (B4, D14)`);
  }
  out.push(...lintStage2More(s0, s));
  return out;
}

/**
 * s2a-fix (26 November, the critic's finding 8 and 9): checks a person would make and lintStage2 did not.
 * (a) A plate's shop item and the plate agree (price, gate, needs, deliver_s; one each way): the content file
 *     derives the items from works.plates, so two sources can only disagree in a hand-edited game.json.
 * (b) The trade's safety (T1, T24): a battery or an undrained car never arrives by a skip's tip; the magnet
 *     never lifts the six materials nor any battery or undrained car; a partner's tipped load holds no such
 *     thing and a grown load's body matches what it carries.
 * (c) Every grade a plate or recipe makes has a bay of its own (a layer grade its entry in worksLayer.bays).
 * (d) A hall is charged only from covered bays (T5): every recipe input's bay is a stillage, a box or bags, or
 *     a bunker under one of map.works.roofs.
 * (e) A station plate's (the depollution bay's) out and waste are its object's pieces, shell and waste by
 *     mass, and it is fed by the forklift (feedBy 'forklift'): one definition of a car's yield.
 * (f) The ladder's tonnes and the ceilings rise rung by rung; iap.packsOff is the fixed list.
 * (g) Lots: every kind has its own cut_s within lots.cut_s (no fallback thing: lots wait, the lead's ruling 6).
 */
export function lintStage2More(s0: SalvageContent, s: SalvageContent): string[] {
  const out: string[] = [];
  const L = s0.worksLayer;
  const plates = s.works?.plates ?? {};
  const G = s.grades;
  const O = s.objects;
  // (a)
  if (s.works) {
    const items = [...s.shop, ...s.dayOneList];
    for (const [pid, p] of Object.entries(plates)) {
      const it = items.filter((i) => i.key === pid);
      if (it.length !== 1) {
        out.push(`works.plates.${pid} has ${it.length} shop items (a plate is bought as exactly one shop item of kind 'works', 2.6.2)`);
        continue;
      }
      const i = it[0];
      if (i.kind !== 'works') out.push(`shop item "${pid}" is of kind ${i.kind}; a plate's item is of kind 'works'`);
      if (i.price !== p.price) out.push(`works.plates.${pid}.price §${p.price} differs from its shop item's §${i.price} (one source: the plate)`);
      if (i.gate !== p.gate) out.push(`works.plates.${pid}.gate ${p.gate} differs from its shop item's ${i.gate}`);
      if ((i.needsItem ?? null) !== (p.needs ?? null)) out.push(`works.plates.${pid}.needs ${p.needs} differs from its shop item's needsItem ${i.needsItem ?? null}`);
      if ((i.deliver_s ?? null) !== p.deliver_s) out.push(`works.plates.${pid}.deliver_s ${p.deliver_s} differs from its shop item's ${i.deliver_s}`);
    }
    for (const i of items) if (i.kind === 'works' && !plates[i.key]) out.push(`shop item "${i.key}" is of kind 'works' but names no plate`);
  }
  // (b)
  const unsafe = (oid: string) => {
    const tags = O[oid]?.tags ?? [];
    return tags.includes('battery') || tags.includes('fuel');
  };
  for (const [oid, o] of Object.entries(L?.objects ?? {})) {
    const arr = o.arrives ?? 'tip';
    if (o.tags?.includes('fuel') && arr !== 'pad') out.push(`worksLayer.objects.${oid} holds fuel (an undrained car) and arrives by "${arr}": it comes on the flatrack to the car pad only ('pad', T1)`);
    else if (o.tags?.includes('battery') && arr === 'tip') out.push(`worksLayer.objects.${oid} is a battery and arrives by "tip": batteries come only in the closed battery box ('batteryBox', T1)`);
  }
  for (const [pid, p] of Object.entries(s.partners)) {
    for (const oid of [...Object.keys(p.trial), ...Object.keys(p.skip)]) if (unsafe(oid)) out.push(`partners.${pid}'s trial or skip holds "${oid}", which is never tipped (T1)`);
    for (const gr of p.grows ?? []) {
      const want = gr.body === 'flatrack' ? 'pad' : gr.body === 'batteryBox' ? 'batteryBox' : 'tip';
      for (const oid of Object.keys(gr.contents)) {
        const arr = O[oid]?.arrives ?? 'tip';
        if (arr !== want) out.push(`partners.${pid}.grows (${gr.body}) holds "${oid}", which arrives by "${arr}" (the ${gr.body} carries only things that arrive by "${want}", T1)`);
      }
    }
  }
  if (s.crane) {
    for (const m of CRANE_NEVER_FIXED) if (!s.crane.never.includes(m)) out.push(`crane.never lacks "${m}" (the magnet never lifts copper, brass, bronze, aluminium, lead or stainless, T24)`);
    for (const oid of Object.keys(O)) if (unsafe(oid) && !s.crane.neverObjects.includes(oid)) out.push(`crane.neverObjects lacks "${oid}" (a battery or an undrained car is never lifted by the magnet, T1)`);
  }
  // (c)
  const bayOf = (g: string): boolean => g in s.bays || (!!s0.grades[g] && !L?.grades?.[g]);
  const makes: [string, string][] = [];
  for (const [pid, p] of Object.entries(plates)) {
    for (const sh of Object.values(p.out)) for (const [g] of sh) if (G[g]) makes.push([pid, g]);
    for (const r of Object.values(p.recipes ?? {})) for (const [g] of r.out) if (G[g]) makes.push([pid, g]);
  }
  for (const [pid, g] of makes) if (!bayOf(g)) out.push(`works.plates.${pid} makes "${g}", which has no bay (worksLayer.bays.${g}: every new grade has a bay, 2.5.1)`);
  for (const g of Object.keys(L?.grades ?? {})) if (!(g in (L?.bays ?? {}))) out.push(`worksLayer.grades.${g} has no bay capacity in worksLayer.bays (2.5.1)`);
  // (d)
  const W = s.map.works;
  const covered = (g: string): boolean => {
    const b = G[g]?.bay as { kind?: string; place?: string; slot?: number } | undefined;
    if (!b?.kind) return false;
    if (b.kind === 'stillage' || b.kind === 'box' || b.kind === 'bags') return true;
    if (b.kind !== 'bunker' || !W || !b.place) return false;
    const fp = W.footprints?.[b.place];
    if (!fp) return false;
    const n = Object.values(G).filter((q) => (q.bay as { kind?: string; place?: string } | undefined)?.kind === 'bunker' && (q.bay as { place?: string }).place === b.place).length;
    const pitch = fp.w / Math.max(1, n);
    const cx = fp.x - fp.w / 2 + pitch * ((b.slot ?? 0) + 0.5);
    return Object.values(W.roofs ?? {}).some((r) => cx >= r.x0 && cx <= r.x0 + r.w && fp.y >= r.y0 && fp.y <= r.y0 + r.d);
  };
  for (const [pid, p] of Object.entries(plates)) for (const [rid, r] of Object.entries(p.recipes ?? {})) for (const g of r.in) if (G[g] && !covered(g)) out.push(`works.plates.${pid}.recipes.${rid} takes "${g}", whose bay is not covered (a hall is charged only from covered bays, T5)`);
  // (e)
  for (const [pid, p] of Object.entries(plates)) {
    if (p.kind !== 'station') continue;
    if (p.feedBy !== 'forklift') out.push(`works.plates.${pid} is a station: it is fed by the forklift only (feedBy "forklift", 2.7), not "${p.feedBy}"`);
    for (const i of p.in) {
      const o = O[i];
      if (!o) continue;
      const want = new Map<string, number>();
      for (const pc of o.pieces) want.set(pc[0], (want.get(pc[0]) ?? 0) + (pc[1] * pc[2]) / o.gross_g);
      if (o.shell) want.set(o.shell.grade, (want.get(o.shell.grade) ?? 0) + o.shell.g / o.gross_g);
      const have = new Map<string, number>();
      for (const [g, k] of p.out[i] ?? []) have.set(g, (have.get(g) ?? 0) + k);
      for (const g of new Set([...want.keys(), ...have.keys()])) if (Math.abs((want.get(g) ?? 0) - (have.get(g) ?? 0)) > 1e-9) out.push(`works.plates.${pid}.out.${i}: "${g}" is ${+(have.get(g) ?? 0).toFixed(6)} of the input; the object ${i} gives ${+(want.get(g) ?? 0).toFixed(6)} (a station's yield is its object's: one definition)`);
      const w = (p.waste[i] ?? []).reduce((a, [, k]) => a + k, 0);
      if (Math.abs(w - o.waste_g / o.gross_g) > 1e-9) out.push(`works.plates.${pid}.waste.${i} is ${+w.toFixed(6)}; the object ${i}'s waste is ${+(o.waste_g / o.gross_g).toFixed(6)}`);
      for (const pc of o.pieces) if (G[pc[0]]?.family === 'pm' && o.source?.type !== 'partner') out.push(`objects.${i} gives a converter whose source is not a partner's (2.7: a test refuses any other)`);
    }
  }
  // (f)
  const rungs = [...s.ladder.rungs].sort((a, b) => a.n - b.n);
  for (let k = 1; k < rungs.length; k++) if (!(rungs[k].t > rungs[k - 1].t)) out.push(`ladder.rungs: rung ${rungs[k].n}'s ${rungs[k].t} t is not above rung ${rungs[k - 1].n}'s ${rungs[k - 1].t} t`);
  for (let k = 1; k < s.ceilings_t_h.length; k++) if (!(s.ceilings_t_h[k] >= s.ceilings_t_h[k - 1])) out.push(`ceilings_t_h[${k}] (rung ${k + 1}) ${s.ceilings_t_h[k]} t/h falls below rung ${k}'s ${s.ceilings_t_h[k - 1]}`);
  // 5.2 (14) for the away caps (s2a-fix): away.ts runLongerOf stops at the stage's top rung, so the list has one a rung.
  if (s.ladder.topRung !== undefined && s.awayCapByRung_h.length !== s.ladder.topRung) out.push(`awayCapByRung_h has ${s.awayCapByRung_h.length} entries; ladder.topRung ${s.ladder.topRung} wants one a rung (5.2 (14), B18)`);
  for (let k = 1; k < s.awayCapByRung_h.length; k++) if (!(s.awayCapByRung_h[k] >= s.awayCapByRung_h[k - 1])) out.push(`awayCapByRung_h[${k}] (rung ${k + 1}) ${s.awayCapByRung_h[k]} h falls below rung ${k}'s`);
  if (s.iap) {
    const a = [...s.iap.packsOff].sort().join(',');
    const b = [...PACKS_OFF_FIXED].sort().join(',');
    if (a !== b) out.push(`iap.packsOff is not the fixed list (the EEA and Switzerland): ${a} against ${b}`);
  }
  // (g)
  for (const [pid, p] of Object.entries(L?.partners ?? {})) if (plates[p.opens]) out.push(`worksLayer.partners.${pid}.opens "${p.opens}" is a plate: the bridge partners open with a vehicle (2.9: the three-axle hook-lift)`);
  if (s.lots) {
    for (const k of s.lots.kinds) if (!(k.from in s.partners) && s.names[k.from] === undefined) out.push(`lots.kinds.${k.obj}.from "${k.from}" is neither a partner nor a register id (scripts/content/yard/names.json)`);
    const [lo, hi] = s.lots.cut_s;
    for (const k of s.lots.kinds) {
      if (k.cut_s === undefined) out.push(`lots.kinds.${k.obj} has no cut_s (the boss's seconds are per kind, within lots.cut_s: the lead's ruling 6)`);
      else if (k.cut_s < lo || k.cut_s > hi) out.push(`lots.kinds.${k.obj}.cut_s ${k.cut_s} is outside lots.cut_s [${lo}, ${hi}]`);
      if (unsafe(k.obj)) out.push(`lots.kinds.${k.obj} is a battery or an undrained car (T1)`);
    }
  }
  return out;
}

const rungsOf4 = (s: SalvageContent) => s.ladder.rungs.find((r) => r.n === 4)?.range;

/** The value at p̄ a thing fetches as found (E3): its override share x prepared, else its pieces at their grades' as-found shares; a converter (pm) counts nothing. */
export function objectAsFound(s: SalvageContent, oid: string): number {
  const o = s.objects[oid];
  if (!o) return 0;
  const g = (id0: string) => s.grades[id0];
  if (o.asFound !== undefined) return o.asFound * objectPrepared(s, oid, false);
  let v = 0;
  for (const p of o.pieces) if (g(p[0]) && g(p[0]).family !== 'pm') v += ((p[1] * p[2]) / 1000) * g(p[0]).pbar * g(p[0]).asFound;
  if (o.shell && g(o.shell.grade)) v += (o.shell.g / 1000) * g(o.shell.grade).pbar * g(o.shell.grade).asFound;
  return v;
}
/** The value at p̄ a thing's pieces and shell fetch prepared (assayed where `assayed`). */
export function objectPrepared(s: SalvageContent, oid: string, assayed: boolean): number {
  const o = s.objects[oid];
  if (!o) return 0;
  let v = 0;
  for (const p of o.pieces) {
    const gid = assayed && p.length === 5 ? p[4] : p[0];
    const gr = s.grades[gid];
    if (gr && gr.family !== 'pm') v += ((p[1] * p[2]) / 1000) * gr.pbar;
  }
  if (o.shell && s.grades[o.shell.grade]) v += (o.shell.g / 1000) * s.grades[o.shell.grade].pbar;
  return v;
}
const massKg = (s: SalvageContent, c: Record<string, number>) => Object.entries(c).reduce((a, [o, n]) => a + (n * (s.objects[o]?.gross_g ?? 0)) / 1000, 0);
const asFoundValue = (s: SalvageContent, c: Record<string, number>) => Object.entries(c).reduce((a, [o, n]) => a + n * objectAsFound(s, o), 0);
/** A load's prepared value at the plates it is valued at (`owned`: with the analyser among them its assay grades count). */
function preparedValue(s: SalvageContent, c: Record<string, number>, owned: string[]): number {
  const assayed = owned.includes('analyser');
  return Object.entries(c).reduce((a, [o, n]) => a + n * objectPrepared(s, o, assayed), 0);
}

/**
 * Every load a partner sells (5.2 (8)): the first yard's trial and skip at their stored figures (the
 * measured ones the first yard's lint holds), and from the works layer's `grows` the grown skip and each
 * load of its own, valued at the plates its gate guarantees (`needs` and those of the loads before it).
 */
export function partnerLoads(s: SalvageContent): [string, { name: string; prepared: number; price: number }][] {
  const rows: [string, { name: string; prepared: number; price: number }][] = [];
  for (const [pid, p] of Object.entries(s.partners)) {
    rows.push([pid, { name: 'trial', prepared: p.trialPrepared, price: p.trialPrice }]);
    rows.push([pid, { name: 'skip', prepared: p.skipPrepared, price: p.skipPrice }]);
    let skip = { ...p.skip };
    const owned: string[] = [];
    for (const gr of p.grows ?? []) {
      owned.push(gr.needs);
      if (gr.body === 'skip') {
        for (const [o, n] of Object.entries(gr.contents)) skip[o] = (skip[o] ?? 0) + n;
        rows.push([pid, { name: `skip with ${gr.needs}`, prepared: preparedValue(s, skip, owned), price: Math.round(p.k * asFoundValue(s, skip)) }]);
      } else rows.push([pid, { name: `${gr.body} (${gr.needs})`, prepared: preparedValue(s, gr.contents, owned), price: Math.round(p.k * asFoundValue(s, gr.contents)) }]);
    }
  }
  return rows;
}

/** The highest tool tier the yard can own by rung r (tools bought from the shop of either layer whose gate is met; tier 1 is the start's spanners). */
function toolTierByRung(s: SalvageContent): (r: number) => number {
  return (r: number) => {
    let t = 1;
    for (const i of [...s.shop, ...s.dayOneList]) if (i.kind === 'tool' && s.tools[i.key] && rungOf(i.gate) <= r) t = Math.max(t, s.tools[i.key].tier);
    return t;
  };
}

/**
 * The first rung at which each grade and object reaches the yard (5.2 (2), (4)): the first yard's sources
 * (zones, the drop-off, its partners, their pieces, shells and whole grades, the machines' outputs) at
 * rung 1; a works-layer partner at its opener's gate and its `grows` at the needed plate's gate; oversize
 * pieces at rung 3 (or their line's gate); a plate's outputs at its gate once its inputs have come;
 * assay grades with the analyser. Pieces cut with a tool count at the rung that tool can be owned.
 */
export function sourcesByRung(s: SalvageContent): Map<string, number> {
  const at = new Map<string, number>();
  const plates = s.works?.plates ?? {};
  const tierBy = toolTierByRung(s);
  const put = (x: string, r: number) => {
    if ((at.get(x) ?? 99) > r) {
      at.set(x, r);
      return true;
    }
    return false;
  };
  const shopGate = (key: string) => {
    const i = [...s.shop, ...s.dayOneList].find((x) => x.key === key);
    return i ? rungOf(i.gate) : plates[key] ? rungOf(plates[key].gate) : 99;
  };
  const objAt = (oid: string, r: number) => put(oid, r);
  for (const z of Object.values(s.zones)) for (const o of Object.keys(z.things)) objAt(o, 1);
  for (const [o] of s.dropoff.mix) objAt(o, 1);
  for (const o of [...s.dropoff.initial, ...s.dropoff.opening]) objAt(o, 1);
  for (const p of Object.values(s.partners)) {
    const r = Math.max(1, shopGate(p.opens));
    for (const o of [...Object.keys(p.trial), ...Object.keys(p.skip)]) objAt(o, r);
    for (const gr of p.grows ?? []) for (const o of Object.keys(gr.contents)) objAt(o, Math.max(r, shopGate(gr.needs)));
  }
  for (const k of s.lots?.kinds ?? []) objAt(k.obj, Math.max(3, k.line.length ? Math.min(...k.line.map((l) => (plates[l] ? rungOf(plates[l].gate) : 1))) : 3));
  const analyser = plates.analyser ? rungOf(plates.analyser.gate) : 99;
  // grades from things; machine and plate outputs; to a fixpoint
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (const [oid, o] of Object.entries(s.objects)) {
      const r0 = at.get(oid);
      if (r0 === undefined) continue;
      o.pieces.forEach((p, i) => {
        const tier = o.pieceTiers?.[i] ?? o.tier;
        let tr = 1;
        while (tr < 9 && tierBy(tr) < tier) tr++;
        const r = Math.max(r0, tier <= 1 ? r0 : tr);
        moved = put(p[0], r) || moved;
        if (p.length === 5) moved = put(p[4], Math.max(r, analyser)) || moved;
      });
      if (o.whole) moved = put(o.whole, r0) || moved;
      if (o.shell) moved = put(o.shell.grade, r0) || moved;
    }
    // the first yard's machines
    const m = s.machines;
    const cab = at.get('cab');
    if (cab !== undefined) for (const g of ['no2', 'bb']) moved = put(g, cab) || moved;
    const mot = at.get('mot');
    if (mot !== undefined) for (const [g] of m.bench.out) moved = put(g, mot) || moved;
    for (const r of Object.values(m.crucible.recipes)) {
      const ins = Array.isArray(r[0]) ? r[0] : [r[0]];
      const ri = Math.min(...ins.map((g) => at.get(g) ?? 99));
      if (ri < 99) for (const g of [r[1], r[3]]) moved = put(g, ri) || moved;
    }
    for (const p of Object.values(plates)) {
      const gate = rungOf(p.gate);
      const lists: [string[], (i: string) => [string, number][]][] =
        p.kind === 'batch' ? Object.values(p.recipes ?? {}).map((r) => [r.in, () => r.out] as [string[], (i: string) => [string, number][]]) : [[p.in, (i: string) => p.out[i] ?? []]];
      for (const [ins, outOf] of lists)
        for (const i of ins) {
          const ri = i === STREAM ? (p.needs ? at.get(`plate:${p.needs}`) : undefined) : at.get(i);
          if (ri === undefined) continue;
          const r = Math.max(ri, gate);
          moved = put(`plate:${Object.keys(plates).find((k) => plates[k] === p)}`, r) || moved;
          for (const [g] of outOf(i)) if (g !== CARRIER) moved = put(g, r) || moved;
        }
    }
    if (!moved) break;
  }
  return at;
}
