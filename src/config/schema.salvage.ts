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
export const CARD_KINDS = ['rack', 'rota', 'partners', 'processBoard', 'machine', 'board', 'skip', 'deal', 'table', 'away', 'rung', 'clipboard', 'settings', 'help', 'park', 'dropoff', 'floor'] as const;
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
export const LadderSchema = z.object({ rung2: RungSchema, rung3: RungSchema, theta: z.number().positive(), rungs: z.array(z.object({ n: z.number().int().min(1).max(9), t: z.number().nonnegative(), range: z.number().int().nonnegative() })).default([]) });
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
const AdviceSchema = z.object({ minutes: z.number().positive().default(3), promptGapS: z.number().nonnegative().default(60), reserveS: z.number().nonnegative().default(120) });

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
  /** Capacity guards at rungs 1 to 3, t/h. */
  ceilings_t_h: z.array(z.number().positive()).length(3),
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
  group: GroupSchema.optional(),
  goals: z.array(GoalSchema).default([]),
  /** goals.json's day-one goals (after `goals` are all done or skipped, in order). */
  dayOne: z.array(GoalSchema).default([]),
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
      glossary: z.array(z.object({ term: z.string(), line: z.string() })).default([]),
    })
    .optional(),
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
  return out;
}
