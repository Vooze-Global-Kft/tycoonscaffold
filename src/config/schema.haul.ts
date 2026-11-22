/**
 * Config for haul mode (Orbit Haulers, docs/design/space-design.md section 2): the game data's
 * `haul` block. Terms are generic so a later game on this archetype can rename everything in data
 * (`names`): RINGS of SLOTS around a station, ROCKS that a RIG drills onto a PILE, DRONES that carry
 * the pile home to the HOLD, a FREIGHTER that ships the hold and is paid at the warp-out.
 *
 * Every number marked (tune) in the specification is a field here; rules are code in
 * src/engine/haul. `HAUL_STARTING_CONTENT` holds the specification's starting values (2.1, 2.3,
 * 2.5, 2.6, 2.10, 5.1); scripts/content/build-haul.py writes the shipped block.
 */
import { z } from 'zod';

const hex = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'hex colour like #FFAA00');
const id = z.string().regex(/^[a-z0-9_]+$/);
const cost = z.object({ base: z.number().positive(), growth: z.number().gte(1) });
const range = z
  .tuple([z.number().nonnegative(), z.number().nonnegative()])
  .refine(([a, b]) => b >= a, 'range must be [min, max] with max >= min');

export const HaulOreSchema = z.object({
  id,
  name: z.string(),
  color: hex,
  /** Credits per unit before conditions, modules and the Star Map. */
  value: z.number().positive(),
});

export const HaulRingSchema = z.object({
  name: z.string(),
  /** Distance from the station in distance units (DU). */
  distance: z.number().positive(),
  /** Slot angles in degrees from straight up; one slot per entry, numbered ring by ring. */
  slots: z.array(z.number()).min(1),
  /** Drill rate of a level-1 rig in units per second. */
  drill: z.number().positive(),
  /** Rock life in seconds of drilling, drawn uniformly from [min, max]. */
  life: range,
  /** Ore weights of the ring's rock stream (ore id -> weight). */
  weights: z.record(z.string(), z.number().nonnegative()),
});

/** A rig tier: reached at `level`, multiplies the drill and may change a rule. */
export const RigTierSchema = z.object({
  level: z.number().int().positive(),
  name: z.string(),
  drill: z.number().positive().default(2),
  /** Rock life multiplier, applied when a rock arrives (Deep Bore). */
  life: z.number().positive().default(1),
  /** Weight multiplier when a rich seam picks a slot (Seam Detector). */
  seamWeight: z.number().positive().default(1),
  /** Pile cap multiplier (Twin Rig). */
  pileCap: z.number().positive().default(1),
});

/**
 * A galaxy condition: multipliers on the T(x) hooks of section 2.3 (1 = untouched), one additive
 * contract bonus, per-ore value multipliers and per-ore weight multipliers on chosen rings.
 */
export const HaulConditionSchema = z.object({
  id,
  name: z.string(),
  /** Effect lines shown on the condition card. */
  lines: z.array(z.string()).default([]),
  drill: z.number().positive().default(1),
  life: z.number().positive().default(1),
  speed: z.number().positive().default(1),
  capacity: z.number().positive().default(1),
  distance: z.number().positive().default(1),
  pileCap: z.number().positive().default(1),
  /** Rich seam interval (the first seam included). */
  interval: z.number().positive().default(1),
  freighterCap: z.number().positive().default(1),
  away: z.number().positive().default(1),
  /** Added to every met contract multiplier. */
  contractAdd: z.number().default(0),
  /** Ore value multipliers by ore id; "*" applies to every ore. */
  oreValue: z.record(z.string(), z.number().positive()).default({}),
  /** Ore weight multipliers: ore id, the rings (1-based) it applies on, the factor. */
  oreWeight: z.array(z.object({ ore: z.string(), rings: z.array(z.number().int().positive()), mult: z.number().nonnegative() })).default([]),
});

/** What a Star Map node does per level. The engine reads nodes by `effect`, never by id. */
export const STAR_EFFECTS = ['bonanza', 'seamSense', 'orePrice', 'contractMult', 'seedCredits', 'preload', 'spareDrones', 'headStart'] as const;
export const StarNodeSchema = z.object({
  id,
  name: z.string(),
  arm: z.string(),
  effect: z.enum(STAR_EFFECTS),
  /** Cost of the next level = ceil(base x growth^L) cores. */
  base: z.number().positive(),
  growth: z.number().gte(1),
  /** Highest level; null = no cap. */
  cap: z.number().int().positive().nullable(),
  /**
   * The per-level number of the effect: bonanza = factor on the non-bonanza chance (0.94);
   * orePrice = price fraction (0.1); contractMult = multiplier added (0.1); seedCredits = base b of
   * the run's starting credits b^(1+L) (10); spareDrones = drones (1). Unused by seamSense (see
   * `seam.sense*`), preload and headStart (see `starMap.headStart`).
   */
  per: z.number().nonnegative().default(0),
  /** Station part drawn once the node is at level 1 or more. */
  part: z.string().default(''),
  lines: z.array(z.string()).default([]),
});

export const HAUL_SOCKETS = ['rig', 'fleet', 'dock'] as const;
export const HaulSocketSchema = z.enum(HAUL_SOCKETS);
export type HaulSocket = z.output<typeof HaulSocketSchema>;

/** The stats a fitted module can carry (section 5.1). Rule stats are the parameter of their rule. */
export const HAUL_MODULE_STATS = [
  'drillRate',
  'haulerCapacity',
  'haulerSpeed',
  'freighterCapacity',
  'orePrice',
  'overflowSpill',
  'metCarryover',
  'metReturn',
  'contractOreCapacity',
] as const;
export const HaulModuleStatSchema = z.enum(HAUL_MODULE_STATS);
export type HaulModuleStat = z.output<typeof HaulModuleStatSchema>;

/** A module: a card of `meta.cards` (by id) that works only when fitted into a socket of its type. */
export const HaulModuleSchema = z.object({
  card: id,
  socket: HaulSocketSchema,
  stat: HaulModuleStatSchema,
  /** Highest value as a fraction (metReturn: 0.5). Null = no cap. */
  cap: z.number().positive().nullable().default(null),
});

/**
 * A buyer on the contract board. `calls` is the radio line when one of its contracts reaches the
 * board ({ore}, {units}, {mult} filled by the screen) and `closed` the line when one is met.
 */
export const HaulBuyerSchema = z.object({ id, name: z.string(), calls: z.string().optional(), closed: z.string().optional() });

export const HaulSchema = z.object({
  /** Every noun the screens use, so a later game on this archetype renames everything in data. */
  names: z
    .object({
      station: z.string().default('Tamsin Station'),
      ai: z.string().default('TALLY'),
      drone: z.string().default('Drone'),
      freighter: z.string().default('Freighter'),
      rig: z.string().default('Rig'),
      pod: z.string().default('Pod'),
      hold: z.string().default('Hold'),
      flare: z.string().default('Survey Flare'),
      contract: z.string().default('Contract'),
      buyer: z.string().default('Buyer'),
      galaxy: z.string().default('Galaxy'),
      rockPrefix: z.string().default('T-'),
    })
    .default({ station: 'Tamsin Station', ai: 'TALLY', drone: 'Drone', freighter: 'Freighter', rig: 'Rig', pod: 'Pod', hold: 'Hold', flare: 'Survey Flare', contract: 'Contract', buyer: 'Buyer', galaxy: 'Galaxy', rockPrefix: 'T-' }),
  ores: z.array(HaulOreSchema).min(1),
  rings: z.array(HaulRingSchema).min(1),
  start: z
    .object({
      /** Units on slot 0's pile at the start of a run (tune 5 to 10). */
      pile: z.number().nonnegative().default(8),
      /** Drones owned (idle on the rack) at the start of a run. */
      drones: z.number().int().nonnegative().default(1),
    })
    .default({ pile: 8, drones: 1 }),
  rig: z.object({
    /** Drill multiplier per rig level (tune 1.25 to 1.45). */
    levelGrowth: z.number().gt(1).default(1.35),
    tiers: z.array(RigTierSchema).default([]),
    /** Past the last tier: x`stripeMult` drill every `stripeEvery` levels. */
    stripeEvery: z.number().int().positive().default(15),
    stripeMult: z.number().gte(1).default(1.5),
    /** Upgrade cost: base x ringFactor^(ring-1) x growth^(L-1). */
    cost: z.object({ base: z.number().positive(), ringFactor: z.number().gte(1), growth: z.number().gt(1) }),
  }),
  /** Claim cost: base x ringFactor^(ring-1) x jFactor^j (j = index within the ring). */
  claim: z.object({ base: z.number().positive(), ringFactor: z.number().gte(1), jFactor: z.number().gte(1) }),
  pile: z.object({ min: z.number().positive().default(10), seconds: z.number().positive().default(25) }).default({ min: 10, seconds: 25 }),
  drone: z.object({
    speed: z.number().positive().default(0.5),
    speedPerLevel: z.number().nonnegative().default(0.08),
    speedMax: z.number().gte(1).default(4),
    capacity: z.number().positive().default(4),
    capacityGrowth: z.number().gte(1).default(1.25),
    loadSeconds: z.number().nonnegative().default(0.6),
    unloadSeconds: z.number().nonnegative().default(0.6),
    cost: cost,
    capacityCost: cost,
    engineCost: cost,
    capBase: z.number().int().positive().default(24),
    capPerGalaxy: z.number().int().nonnegative().default(4),
  }),
  freighter: z.object({
    capacity: z.number().positive().default(12),
    growth: z.number().gte(1).default(1.45),
    cost: cost,
    /** Away time by level: the entry with the highest `from` not above the level. */
    away: z.array(z.object({ from: z.number().int().positive(), seconds: z.number().positive() })).min(1),
    climb: z.number().positive().default(2.5),
    land: z.number().positive().default(2),
    /** Payout multiplier for a full launch. */
    fullBonus: z.number().gte(1).default(1.1),
    /** Freighter levels that change the drawing (hulls), then a segment every `segmentEvery` levels. */
    hulls: z.array(z.number().int().positive()).default([1, 10, 25, 50]),
    segmentEvery: z.number().int().positive().default(25),
    segmentMax: z.number().int().nonnegative().default(8),
  }),
  autopilot: z.object({ cost: z.number().nonnegative().default(90) }).default({ cost: 90 }),
  /** Seconds between a rock crumbling and the next one arriving. */
  respawnSeconds: z.number().positive().default(6),
  bonanza: z
    .object({
      /** Base chance a new rock is a bonanza rock (tune 0.03 to 0.06). */
      chance: z.number().min(0).max(1).default(0.04),
      drill: z.number().positive().default(2),
      life: z.number().positive().default(1.5),
      /** The chance never passes this, whatever the Star Map (errata 71). */
      maxChance: z.number().min(0).max(1).default(0.5),
    })
    .default({ chance: 0.04, drill: 2, life: 1.5, maxChance: 0.5 }),
  seam: z
    .object({
      /** Clock seconds of the first natural rich seam of the first galaxy's run (Decision 44: 150). */
      first: z.number().nonnegative().default(360),
      /** The same in every later galaxy's run (Decision 44: "later ones as before"); defaults to `first`. */
      firstLater: z.number().nonnegative().optional(),
      interval: range.default([90, 150]),
      duration: z.number().positive().default(40),
      drill: z.number().gte(1).default(3),
      pileCap: z.number().gte(1).default(2),
      /** Per Seam Sense level: seconds off the interval and seconds added to the duration. */
      senseInterval: z.number().nonnegative().default(10),
      senseDuration: z.number().nonnegative().default(5),
      /** No interval is ever shorter than this (errata 20). */
      minInterval: z.number().positive().default(30),
      /** When the natural roll finds no rock with life left, it tries again this many seconds later (errata 34). */
      retrySeconds: z.number().positive().default(30),
    })
    .default({ first: 360, interval: [90, 150], duration: 40, drill: 3, pileCap: 2, senseInterval: 10, senseDuration: 5, minInterval: 30, retrySeconds: 30 }),
  flare: z
    .object({
      refillSeconds: z.number().positive().default(1800),
      firstAt: z.number().nonnegative().default(600),
      maxStored: z.number().int().positive().default(1),
      adsPerDay: z.number().int().nonnegative().default(3),
      adGapMinutes: z.number().nonnegative().default(20),
      /** Charges never exceed this, ads included (errata 33). */
      maxCharges: z.number().int().positive().default(4),
    })
    .default({ refillSeconds: 1800, firstAt: 600, maxStored: 1, adsPerDay: 3, adGapMinutes: 20, maxCharges: 4 }),
  contracts: z.object({
    unlockLaunches: z.number().int().nonnegative().default(4),
    unlockClock: z.number().nonnegative().default(90),
    board: z.number().int().positive().default(3),
    /** Unused since Decision 40 (an offer's life is `offerLaunches`, a taken contract's is `launches`); kept so older data parses. */
    lifetime: z.number().int().positive().default(6),
    /** Decision 40: warp-outs a taken contract has to deliver everything (tune 4 to 8). */
    launches: z.number().int().min(2).default(6),
    /** Decision 40: warp-outs an offer stays on the board before it is replaced (tune 8 to 16). */
    offerLaunches: z.number().int().positive().default(12),
    /**
     * Decision 40, "never free": every wanted ore asks at least `ceil(L × now × (1 + margin))`, i.e.
     * more than the routes as they are deliver in the contract's launches (tune 0.08 to 0.2).
     */
    margin: z.number().min(0).max(1).default(0.12),
    /** Decision 40, widening: the largest share of the fleet a contract's ores may be routed with. */
    maxShare: z.number().gt(0).max(1).default(0.8),
    /** Decision 40, a one-ore station's quota contract: a share of L × F drawn from this range. */
    quota: range.default([0.75, 0.9]),
    /** Decision 40: a quota contract's multiplier is lowered by this, never below `quotaMinMult`. */
    quotaMultCut: z.number().nonnegative().default(0.2),
    quotaMinMult: z.number().positive().default(1.3),
    /** Delivery fee on the rest of a met cargo (tune 0.05 to 0.15). */
    fee: z.number().nonnegative().default(0.1),
    /**
     * How far a contract's units sit between what the hold carries of its ores per launch with the
     * routes as they are (0) and what it carries when the player routes for it (1): uniformly from
     * this range (section 2.6). Below 0 would be met without doing anything; above 1 not at all.
     */
    reach: range.default([0.35, 0.75]),
    /** The share of the fleet a player sends to a contract's ores when routing for it (section 2.6). */
    fleetShare: z.number().gt(0).max(1).default(0.5),
    /** Fewest units a contract asks for in total (never more than F). */
    minUnits: z.number().int().positive().default(3),
    twoOreChance: z.number().min(0).max(1).default(0.4),
    /** Multiplier by the farthest ring among the contract's ores (index 0 = ring 1). */
    mult: z.array(z.number().positive()).min(1),
    jitter: z.number().nonnegative().default(0.1),
    /** Contract 0, fixed: buyer index, ore, at most `units` (and at most F), multiplier. */
    first: z.object({ buyer: z.number().int().nonnegative().default(0), ore: z.string(), units: z.number().int().positive(), mult: z.number().positive() }),
    buyers: z.array(HaulBuyerSchema).min(1),
  }),
  /**
   * Decision 53, the day shift: the first `contracts` contracts met in each shift pay their bonus
   * twice. A new shift starts when the calendar day changed and at least `minHours` passed since the
   * previous one started.
   */
  shift: z
    .object({ contracts: z.number().int().nonnegative().default(3), minHours: z.number().nonnegative().default(16), mult: z.number().gte(1).default(2) })
    .default({ contracts: 3, minHours: 16, mult: 2 }),
  pods: z
    .object({
      /** Chest ids of meta.chests. */
      scrap: z.string().default('scrap'),
      derelict: z.string().default('derelict'),
      depletedEvery: z.number().int().positive().default(6),
      contractsEvery: z.number().int().positive().default(4),
      transmissionsEvery: z.number().int().positive().default(4),
    })
    .default({ scrap: 'scrap', derelict: 'derelict', depletedEvery: 6, contractsEvery: 4, transmissionsEvery: 4 }),
  conditions: z.array(HaulConditionSchema).min(4),
  starMap: z.object({
    nodes: z.array(StarNodeSchema).min(1),
    /** Head start by Afterburner level: slot indexes claimed at that level (cumulative lists). */
    headStart: z.array(z.array(z.number().int().nonnegative())).default([]),
    /** Rig level of head-start slots. */
    headStartRig: z.number().int().positive().default(4),
  }),
  galaxies: z.object({ names: z.array(z.string()).min(1) }),
  /** "Jump ready" (beat 8, the Star Map rail button, section 8): the Jump would gain at least this many cores (errata 22). */
  jumpReadyCores: z.number().int().positive().default(20),
  modules: z.array(HaulModuleSchema).default([]),
  /** Drone cap and start drones from an `unlock` entitlement (Hangar Expansion); product id. */
  hangar: z.object({ product: z.string(), droneCap: z.number().int().nonnegative(), startDrones: z.number().int().nonnegative() }).optional(),
  offline: z
    .object({
      /** Offline efficiency never exceeds this in a haul game. */
      efficiencyCap: z.number().min(0).max(1).default(0.45),
      /** Bounded per-slot rock loop in fastForward. */
      rockLoopMax: z.number().int().positive().default(2000),
      /**
       * Decision 42: the Shift Log's ad (or Clearance) adds this share of the offline credits
       * ("BOOST +50 %"), not a double; the offline gate is measured with it.
       */
      adBonus: z.number().min(0).max(1).default(0.5),
    })
    .default({ efficiencyCap: 0.45, rockLoopMax: 2000, adBonus: 0.5 }),
});

export type HaulContent = z.output<typeof HaulSchema>;
export type HaulContentInput = z.input<typeof HaulSchema>;
export type HaulOre = z.output<typeof HaulOreSchema>;
export type HaulRing = z.output<typeof HaulRingSchema>;
export type HaulCondition = z.output<typeof HaulConditionSchema>;
export type StarNode = z.output<typeof StarNodeSchema>;
export type StarEffect = (typeof STAR_EFFECTS)[number];
export type HaulModule = z.output<typeof HaulModuleSchema>;

/** Cross-field checks of a haul block. `cardIds` and `chestIds` are the ids in `meta`. Returns problems. */
export function lintHaul(h: HaulContent, cardIds: string[] = [], chestIds: string[] = []): string[] {
  const out: string[] = [];
  const ores = new Set(h.ores.map((o) => o.id));
  if (ores.size !== h.ores.length) out.push('haul.ores: ids must be unique');
  h.rings.forEach((r, i) => {
    for (const o of Object.keys(r.weights)) if (!ores.has(o)) out.push(`haul.rings[${i}].weights: unknown ore "${o}"`);
    if (!Object.values(r.weights).some((w) => w > 0)) out.push(`haul.rings[${i}].weights: needs at least one positive weight`);
    if (i > 0 && r.distance <= h.rings[i - 1].distance) out.push(`haul.rings[${i}].distance: rings must move outward`);
    if (r.life[0] <= 0) out.push(`haul.rings[${i}].life: rocks must live more than 0 s`);
  });
  if (!ores.has(h.contracts.first.ore)) out.push(`haul.contracts.first.ore: unknown ore "${h.contracts.first.ore}"`);
  if (h.contracts.first.buyer >= h.contracts.buyers.length) out.push('haul.contracts.first.buyer: no such buyer');
  if (h.contracts.mult.length < h.rings.length) out.push('haul.contracts.mult: needs one multiplier per ring');
  const tiers = h.rig.tiers.map((t) => t.level);
  if (tiers.some((l, i) => i > 0 && l <= tiers[i - 1])) out.push('haul.rig.tiers: levels must increase');
  const away = h.freighter.away;
  if (away[0].from !== 1) out.push('haul.freighter.away: the first entry must start at level 1');
  if (away.some((a, i) => i > 0 && a.from <= away[i - 1].from)) out.push('haul.freighter.away: levels must increase');
  const cond = new Set(h.conditions.map((c) => c.id));
  if (cond.size !== h.conditions.length) out.push('haul.conditions: ids must be unique');
  for (const c of h.conditions) {
    for (const o of Object.keys(c.oreValue)) if (o !== '*' && !ores.has(o)) out.push(`haul.conditions.${c.id}.oreValue: unknown ore "${o}"`);
    for (const w of c.oreWeight) if (!ores.has(w.ore)) out.push(`haul.conditions.${c.id}.oreWeight: unknown ore "${w.ore}"`);
  }
  const nodes = new Set(h.starMap.nodes.map((n) => n.id));
  if (nodes.size !== h.starMap.nodes.length) out.push('haul.starMap.nodes: ids must be unique');
  const slotCount = h.rings.reduce((a, r) => a + r.slots.length, 0);
  h.starMap.headStart.forEach((list, i) => {
    for (const s of list) if (s >= slotCount) out.push(`haul.starMap.headStart[${i}]: slot ${s} does not exist`);
  });
  const modCards = new Set<string>();
  for (const m of h.modules) {
    if (modCards.has(m.card)) out.push(`haul.modules: card "${m.card}" listed twice`);
    modCards.add(m.card);
    if (cardIds.length && !cardIds.includes(m.card)) out.push(`haul.modules: "${m.card}" is not a card in meta.cards`);
  }
  for (const s of HAUL_SOCKETS) if (h.modules.length && !h.modules.some((m) => m.socket === s)) out.push(`haul.modules: no module fits the ${s} socket`);
  if (chestIds.length) {
    if (!chestIds.includes(h.pods.scrap)) out.push(`haul.pods.scrap: "${h.pods.scrap}" is not a chest in meta.chests`);
    if (!chestIds.includes(h.pods.derelict)) out.push(`haul.pods.derelict: "${h.pods.derelict}" is not a chest in meta.chests`);
  }
  return out;
}

/** The specification's starting values (section 2.1 and onward). build-haul.py tunes them; tests and fixtures use them. */
export const HAUL_STARTING_CONTENT: HaulContentInput = {
  ores: [
    { id: 'iron', name: 'Iron', color: '#E07A3F', value: 1 },
    { id: 'copper', name: 'Copper', color: '#3FC7A0', value: 5 },
    { id: 'ice', name: 'Ice', color: '#7FD4FF', value: 25 },
    { id: 'titanium', name: 'Titanium', color: '#C7A6FF', value: 120 },
    { id: 'platinum', name: 'Platinum', color: '#F2E6B8', value: 600 },
  ],
  rings: [
    { name: 'Near Belt', distance: 1.0, slots: [-53, 53], drill: 0.6, life: [150, 240], weights: { iron: 100 } },
    { name: 'Verdigris Reach', distance: 1.73, slots: [-36, 0, 36], drill: 0.5, life: [240, 400], weights: { copper: 70, iron: 30 } },
    { name: 'Frost Line', distance: 2.45, slots: [-26, -10, 26], drill: 0.45, life: [360, 600], weights: { ice: 70, copper: 30 } },
    { name: 'Lilac Drift', distance: 3.18, slots: [-18, 18], drill: 0.4, life: [480, 800], weights: { titanium: 70, ice: 30 } },
    { name: 'Pale Edge', distance: 3.91, slots: [-14, 14], drill: 0.35, life: [600, 1100], weights: { platinum: 70, titanium: 30 } },
  ],
  start: { pile: 8, drones: 1 },
  rig: {
    levelGrowth: 1.35,
    tiers: [
      { level: 4, name: 'Dual Bit', drill: 2 },
      { level: 10, name: 'Deep Bore', drill: 2, life: 1.5 },
      { level: 20, name: 'Seam Detector', drill: 2, seamWeight: 3 },
      { level: 35, name: 'Twin Rig', drill: 2, pileCap: 2 },
    ],
    stripeEvery: 15,
    stripeMult: 1.5,
    cost: { base: 3, ringFactor: 40, growth: 1.6 },
  },
  claim: { base: 13, ringFactor: 20, jFactor: 1.6 },
  pile: { min: 10, seconds: 25 },
  drone: {
    speed: 0.5,
    speedPerLevel: 0.08,
    speedMax: 4,
    capacity: 4,
    capacityGrowth: 1.25,
    loadSeconds: 0.6,
    unloadSeconds: 0.6,
    cost: { base: 10, growth: 1.45 },
    capacityCost: { base: 30, growth: 1.55 },
    engineCost: { base: 60, growth: 2.0 },
    capBase: 24,
    capPerGalaxy: 4,
  },
  freighter: {
    capacity: 12,
    growth: 1.45,
    cost: { base: 15, growth: 1.6 },
    away: [
      { from: 1, seconds: 8 },
      { from: 10, seconds: 12 },
      { from: 25, seconds: 16 },
    ],
    climb: 2.5,
    land: 2,
    fullBonus: 1.1,
  },
  autopilot: { cost: 90 },
  respawnSeconds: 6,
  bonanza: { chance: 0.04, drill: 2, life: 1.5, maxChance: 0.5 },
  seam: { first: 360, interval: [90, 150], duration: 40, drill: 3, pileCap: 2, senseInterval: 10, senseDuration: 5, minInterval: 30, retrySeconds: 30 },
  flare: { refillSeconds: 1800, firstAt: 600, maxStored: 1, adsPerDay: 3, adGapMinutes: 20, maxCharges: 4 },
  contracts: {
    unlockLaunches: 4,
    unlockClock: 90,
    board: 3,
    lifetime: 6,
    fee: 0.1,
    reach: [0.35, 0.75],
    fleetShare: 0.5,
    minUnits: 3,
    twoOreChance: 0.4,
    mult: [1.6, 1.9, 2.2, 2.6, 3.0],
    jitter: 0.1,
    first: { buyer: 0, ore: 'iron', units: 10, mult: 1.5 },
    buyers: [
      { id: 'halden', name: 'Halden Yards' },
      { id: 'corvo', name: 'Corvo Metals' },
      { id: 'tessaly', name: 'Tessaly Ice Co.' },
      { id: 'brightwater', name: 'Brightwater Foundry' },
      { id: 'kade', name: 'Kade Refinery' },
      { id: 'oriel', name: 'Oriel Labs' },
    ],
  },
  pods: { scrap: 'scrap', derelict: 'derelict', depletedEvery: 6, contractsEvery: 4, transmissionsEvery: 4 },
  conditions: [
    { id: 'frost', name: 'Frost Surplus', lines: ['Ice weight x3 on rings 3 and 4', 'Ice value x2'], oreValue: { ice: 2 }, oreWeight: [{ ore: 'ice', rings: [3, 4], mult: 3 }] },
    { id: 'solar', name: 'Solar Wind', lines: ['Drone speed x1.4', 'Rock life x0.5'], speed: 1.4, life: 0.5 },
    { id: 'storms', name: 'Seam Storms', lines: ['Rich seams twice as often'], interval: 0.5 },
    { id: 'longhaul', name: 'Long Haul', lines: ['Distances x1.3', 'Contract multipliers +0.3'], distance: 1.3, contractAdd: 0.3 },
    { id: 'heavy', name: 'Heavy Ore', lines: ['Drone capacity x0.75', 'All ore values x2'], capacity: 0.75, oreValue: { '*': 2 } },
    { id: 'hotcore', name: 'Hot Cores', lines: ['Drill x1.5', 'Pile cap x0.6'], drill: 1.5, pileCap: 0.6 },
  ],
  starMap: {
    nodes: [
      { id: 'prospect', name: 'Prospect Survey', arm: 'survey', effect: 'bonanza', per: 0.94, base: 2, growth: 1.25, cap: 11, part: 'surveyArray' },
      { id: 'veinsense', name: 'Seam Sense', arm: 'survey', effect: 'seamSense', base: 2, growth: 1.4, cap: 5, part: 'scannerDish' },
      { id: 'assay', name: 'Assay Rights', arm: 'survey', effect: 'orePrice', per: 0.1, base: 1, growth: 1.3, cap: 5, part: 'assayLab' },
      { id: 'brokerseat', name: 'Broker Seat', arm: 'trade', effect: 'contractMult', per: 0.1, base: 2, growth: 1.35, cap: 5, part: 'antennaMast' },
      { id: 'seedcredits', name: 'Seed Credits', arm: 'trade', effect: 'seedCredits', per: 10, base: 1, growth: 1.4, cap: 6, part: 'vaultBlock' },
      { id: 'preload', name: 'Systems Preload', arm: 'fleet', effect: 'preload', base: 5, growth: 1, cap: 1, part: 'beacon' },
      { id: 'sparedrones', name: 'Spare Drones', arm: 'fleet', effect: 'spareDrones', per: 1, base: 2, growth: 1.4, cap: 6, part: 'hangar' },
      { id: 'afterburner', name: 'Afterburner', arm: 'fleet', effect: 'headStart', base: 2, growth: 1.5, cap: 6, part: 'boosterRing' },
    ],
    // Level 1: both ring-1 slots; 2: + ring 2 slot 0; 3: all of ring 2; 4: + ring 3 slot 0; 5: all of ring 3; 6: + ring 4 slot 0.
    headStart: [
      [0, 1],
      [0, 1, 2],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 5],
      [0, 1, 2, 3, 4, 5, 6, 7],
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
    ],
    headStartRig: 4,
  },
  galaxies: {
    names: ['Cygnus Drift', 'Halden Reach', 'Morrow Belt', 'Tessaly Gap', 'Corvo Expanse', 'Brightwater Ring', "Kade's Shelf", 'Oriel Spur', 'Vantor Deep', 'Selk Cluster', 'Ambry Field', 'Nolan Verge'],
  },
  modules: [
    { card: 'diamondbit', socket: 'rig', stat: 'drillRate' },
    { card: 'bayracks', socket: 'fleet', stat: 'haulerCapacity' },
    { card: 'thrusters', socket: 'fleet', stat: 'haulerSpeed' },
    { card: 'clamps', socket: 'dock', stat: 'freighterCapacity' },
    { card: 'chute', socket: 'rig', stat: 'overflowSpill' },
    { card: 'keeper', socket: 'dock', stat: 'metCarryover' },
    { card: 'sorter', socket: 'fleet', stat: 'contractOreCapacity' },
    { card: 'quickclamp', socket: 'dock', stat: 'metReturn', cap: 0.5 },
  ],
  hangar: { product: 'space_hangar', droneCap: 6, startDrones: 2 },
  jumpReadyCores: 20,
  offline: { efficiencyCap: 0.45, rockLoopMax: 2000 },
};
