/**
 * Config for sim mode: the production chain with visible workers.
 *
 * Terms are generic so any theme fits: STATIONS make goods (they are the
 * game's `businesses`), TRANSPORT workers carry them from the buffer to the
 * sales area, and guests at SEATS consume them and pay. In a restaurant that
 * is kitchen stations, waiters and tables; in a space game it could be drills,
 * haulers and trading docks.
 */
import { z } from 'zod';

const hex = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'hex colour like #FFAA00');
const icon = z.string().min(1);
const levelList = z
  .array(z.number().int().positive())
  .min(1)
  .refine((a) => a[0] === 1, 'must start with 1 (the first one is there from level 1)')
  .refine((a) => a.every((v, i) => i === 0 || v >= a[i - 1]), 'must not decrease (repeat a level to add several at once)');

export const TransportSchema = z.object({
  /** Name of the stage, e.g. "Waiters". */
  name: z.string(),
  /** Singular worker name, e.g. "Waiter". */
  workerName: z.string(),
  icon,
  /** Cost of going from level 1 to level 2 in the first venue. */
  baseCost: z.number().positive(),
  costGrowth: z.number().gt(1),
  /** Value one worker carries per trip at level 1 in the first venue. */
  baseCapacity: z.number().positive(),
  /** Capacity multiplies by this every level. */
  capacityGrowth: z.number().gt(1),
  /** Seconds for a full round trip. Constant: growth comes from capacity and more workers. */
  tripSeconds: z.number().positive(),
  /** Levels at which a worker joins. The first entry must be 1. */
  workersAt: levelList,
  /** The automation hire: until bought, the player rings the bell to send idle workers. */
  managerCost: z.number().positive(),
  managerName: z.string(),
  managerIcon: icon.optional(),
  managerFlavor: z.string().optional(),
  /** What the player taps to send workers by hand, e.g. "Service bell". The default is deliberately theme-free (shared code ships in every game). */
  bellName: z.string().default('Send'),
  /** Cast ids for the workers' looks, used in order. Empty = generated looks. */
  looks: z.array(z.string()).default([]),
});

export const SalesSchema = z.object({
  /** Name of the stage, e.g. "Dining Room". */
  name: z.string(),
  /** Singular seat name, e.g. "Table". */
  seatName: z.string().default('Slot'),
  icon,
  baseCost: z.number().positive(),
  costGrowth: z.number().gt(1),
  /** Value one guest takes (and pays for) at level 1 in the first venue. */
  baseSpend: z.number().positive(),
  spendGrowth: z.number().gt(1),
  /** Seconds a guest takes to consume. */
  serveSeconds: z.number().positive(),
  /** Levels at which another seat opens. The first entry must be 1. */
  seatsAt: levelList,
  /** Cast ids for guests. Empty = generated looks. */
  looks: z.array(z.string()).default([]),
});

export const VenueSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  /** Where it is, e.g. a city. Shown under the name. */
  place: z.string().optional(),
  icon,
  blurb: z.string().optional(),
  /** Price to open this venue. Must be 0 for the first one. */
  unlockCost: z.number().nonnegative(),
  /** Every cost and base value in this venue is multiplied by this. */
  scale: z.number().positive(),
  /** Optional colours for the code-drawn room. */
  palette: z.object({ wall: hex, floorA: hex, floorB: hex, trim: hex }).partial().optional(),
});

export const RushSchema = z.object({
  name: z.string().default('Boost'),
  icon: icon.default('🔔'),
  /** The whole chain runs this many times faster while the skill is active. */
  multiplier: z.number().gt(1).default(3),
  seconds: z.number().positive().default(30),
  cooldownSeconds: z.number().positive().default(300),
});

export const SimSchema = z.object({
  /** How the first stage (the stations) is called on screen, e.g. "Kitchen". */
  production: z.object({ name: z.string().default('Production'), icon: icon.default('🏭') }).default({ name: 'Production', icon: '🏭' }),
  /** Where finished goods wait to be carried, e.g. "The Pass". */
  buffer: z.object({ name: z.string().default('Counter'), icon: icon.default('📦') }).default({ name: 'Counter', icon: '📦' }),
  transport: TransportSchema,
  sales: SalesSchema,
  /** The first must cost 0 to open and ids are unique (checked in ./lint.ts, so the messages ship in no bundle). */
  venues: z.array(VenueSchema).min(1),
  rush: RushSchema.default({ name: 'Boost', icon: '🔔', multiplier: 3, seconds: 30, cooldownSeconds: 300 }),
});

export type SimConfig = z.output<typeof SimSchema>;
export type Venue = z.output<typeof VenueSchema>;

// ---------------------------------------------------------------- meta: cards, chests, missions, deals

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export const RaritySchema = z.enum(RARITIES);
export type Rarity = z.output<typeof RaritySchema>;

export const CARD_STATS = [
  'stationValue',
  'transportCapacity',
  'salesSpend',
  'globalIncome',
  'tapValue',
  'offlineEarnings',
  'bonusValue',
  'rushDuration',
] as const;
export const CardStatSchema = z.enum(CARD_STATS);
export type CardStat = z.output<typeof CardStatSchema>;

export const CardSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  /** Job title shown on the card, e.g. "Head Chef". */
  title: z.string().optional(),
  icon,
  rarity: RaritySchema,
  /** The one number this card improves. */
  stat: CardStatSchema,
  flavor: z.string().optional(),
});
export type Card = z.output<typeof CardSchema>;

/** Something the player receives: from a chest slot, a mission, a deal or a purchase. */
export const RewardSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('gems'), amount: z.number().int().positive() }),
  /** Cash worth this many seconds of current income (never less than a floor of taps). */
  z.object({ type: z.literal('cash'), seconds: z.number().positive() }),
  z.object({ type: z.literal('chest'), chestId: z.string(), count: z.number().int().positive().default(1) }),
  /** Copies of one named card. */
  z.object({ type: z.literal('card'), cardId: z.string(), copies: z.number().int().positive().default(1) }),
  /** Copies of a random card of a rarity. */
  z.object({ type: z.literal('randomCard'), rarity: RaritySchema, copies: z.number().int().positive().default(1) }),
  z.object({ type: z.literal('noAds') }),
  /** A permanent income multiplier (entitlement). */
  z.object({ type: z.literal('multiplier'), value: z.number().gt(1) }),
]);
export type Reward = z.output<typeof RewardSchema>;

const range = z.tuple([z.number().nonnegative(), z.number().nonnegative()]).refine(([a, b]) => b >= a, 'range must be [min, max]');
const rarityWeights = z.object({ common: z.number().nonnegative(), rare: z.number().nonnegative(), epic: z.number().nonnegative(), legendary: z.number().nonnegative() });

export const ChestSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  icon,
  blurb: z.string().optional(),
  /** Look of the code-drawn chest. */
  tier: z.enum(['wood', 'silver', 'gold']).default('wood'),
  /** Number of reward slots revealed one by one. */
  slots: z.number().int().positive(),
  /** Relative chance of each kind of slot. */
  slotWeights: z.object({ card: z.number().nonnegative(), gems: z.number().nonnegative(), cash: z.number().nonnegative() }),
  /** Relative chance of each rarity for a card slot. These odds are shown to the player. */
  rarityWeights,
  /** Copies granted by a card slot, per rarity, as [min, max]. */
  cardCopies: z.object({ common: range, rare: range, epic: range, legendary: range }),
  gems: range,
  /** Cash slots pay this many seconds of income, as [min, max]. */
  cashSeconds: range,
  /** At least one card slot of this rarity or better is guaranteed. */
  guaranteed: RaritySchema.optional(),
  /** Price in gems in the shop. Omit for chests that can't be bought. */
  gemCost: z.number().int().positive().optional(),
});
export type Chest = z.output<typeof ChestSchema>;

export const MISSION_TYPES = ['serve', 'earn', 'levels', 'taps', 'bonus', 'chests', 'rush', 'hires', 'hauled', 'launches', 'contracts', 'depleted', 'claims', 'seamDrags'] as const;
export const MissionTemplateSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  /**
   * What is counted: serve = guests served, earn = cash earned, levels = levels bought,
   * taps = taps, bonus = flying bonuses caught, chests = chests opened, rush = rush skills started,
   * hires = automation hires. Haul mode (lifetime GameState.stats): hauled = units delivered, launches =
   * warp-outs, contracts = contracts met, depleted = rocks worked dry, claims = slots claimed,
   * seamDrags = drones put on rich seams.
   */
  type: z.enum(MISSION_TYPES),
  /** Text with {n} for the target, e.g. "Serve {n} customers". */
  text: z.string(),
  /**
   * Targets, one per time the mission has been completed; the last one repeats. For "earn" the
   * numbers are SECONDS of the player's income when the mission is handed out (absolute cash
   * targets would be instant or impossible as the numbers inflate); for every other type they
   * are plain counts.
   */
  targets: z.array(z.number().positive()).min(1),
  reward: RewardSchema,
});
export type MissionTemplate = z.output<typeof MissionTemplateSchema>;

export const DealSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  title: z.string(),
  blurb: z.string().optional(),
  /** Short neutral label such as "ONE TIME". Never a made-up discount. */
  badge: z.string().optional(),
  icon: icon.optional(),
  contents: z.array(RewardSchema).min(1),
  /** Bought with real money (an IAP product id from monetization.iap.products) or with gems. Exactly one. */
  productId: z.string().optional(),
  gemCost: z.number().int().positive().optional(),
  /** What makes the offer appear. */
  trigger: z.discriminatedUnion('type', [
    z.object({ type: z.literal('always') }),
    z.object({ type: z.literal('playSeconds'), seconds: z.number().nonnegative() }),
    /** From the Nth play session (a session starts after 30 minutes away). */
    z.object({ type: z.literal('sessions'), count: z.number().int().positive() }),
    /** A venue has been opened (sim mode). */
    z.object({ type: z.literal('venue'), venueId: z.string() }),
    z.object({ type: z.literal('prestige'), count: z.number().int().positive() }),
    z.object({ type: z.literal('lifetimeEarnings'), amount: z.number().positive() }),
  ]),
  /**
   * The offer really ends this many hours after it appears, and never comes back. Omit for a
   * permanent shop item. At least 48: shorter windows are treated as pressure selling by regulators.
   */
  durationHours: z.number().min(48).optional(),
  maxPurchases: z.number().int().positive().default(1),
});
export type Deal = z.output<typeof DealSchema>;

export const DailyOfferSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  title: z.string(),
  icon: icon.optional(),
  reward: RewardSchema,
  /** 0 = today's free item. */
  gemCost: z.number().int().nonnegative(),
  /** Relative chance of being picked for a day. */
  weight: z.number().positive().default(1),
});

export type DailyOffer = z.output<typeof DailyOfferSchema>;

export const MetaSchema = z.object({
  cards: z.array(CardSchema).default([]),
  /** Bonus in percent: base at level 1 plus perLevel for each further level. */
  cardEffect: z
    .object({
      common: z.object({ base: z.number().positive(), perLevel: z.number().positive() }),
      rare: z.object({ base: z.number().positive(), perLevel: z.number().positive() }),
      epic: z.object({ base: z.number().positive(), perLevel: z.number().positive() }),
      legendary: z.object({ base: z.number().positive(), perLevel: z.number().positive() }),
    })
    .default({
      common: { base: 10, perLevel: 5 },
      rare: { base: 20, perLevel: 10 },
      epic: { base: 40, perLevel: 20 },
      legendary: { base: 100, perLevel: 50 },
    }),
  /** Copies needed to go from level L to L+1: round(base * growth^(L-1)). Level 1 needs one copy. */
  cardCopies: z.object({ base: z.number().positive().default(2), growth: z.number().min(1).default(1.5) }).default({ base: 2, growth: 1.5 }),
  chests: z.array(ChestSchema).default([]),
  /**
   * A free chest that recharges on a timer. Up to `stored` can wait for the player, so skipping a
   * session loses nothing. `firstMinutes` are shorter waits for the first few (e.g. [15, 60]) so a
   * new player gets one in their second session.
   */
  freeChest: z
    .object({
      chestId: z.string(),
      everyHours: z.number().positive(),
      stored: z.number().int().positive().default(2),
      firstMinutes: z.array(z.number().nonnegative()).default([]),
    })
    .optional(),
  /** A chest for watching a rewarded ad, limited per day, with a cooldown between two. */
  adChest: z.object({ chestId: z.string(), perDay: z.number().int().positive(), cooldownMinutes: z.number().nonnegative().default(0) }).optional(),
  /**
   * Bad-luck protection: after this many chests in a row without a card of that rarity (or
   * better), the next chest with card slots is guaranteed one. Shown with the drop rates.
   */
  pity: z.object({ epic: z.number().int().positive().optional(), legendary: z.number().int().positive().optional() }).default({}),
  /** Card copies from chests grow by this fraction for each venue beyond the first the player has ever opened. */
  chestGrowthPerVenue: z.number().nonnegative().default(0.2),
  /**
   * Whether randomised chests may be BOUGHT (with gems or money). Off by default, on purpose:
   * selling random items raises a game's age rating in several regions (PEGI 16 on Google Play in
   * Europe, 16+ in Australia, 18+ in Brazil) and is illegal in some. When off, chests are only
   * earned (timer, missions, rewarded ads): no chest may have a gem price or sit in a deal or a
   * daily offer, and gems buy named cards and bundles with listed contents instead.
   */
  chestsForSale: z.boolean().default(false),
  /**
   * With chestsForSale on: countries (ISO 3166-1 alpha-2) where they still may not be sold. There,
   * gem prices on chests and every offer containing a chest are hidden; chests can still be earned.
   */
  chestSalesBlockedIn: z.array(z.string().length(2)).default(['BE', 'BR', 'NL']),
  missions: z
    .object({
      slots: z.number().int().positive().default(3),
      /** At most this many missions can be completed per day; then the list rests until tomorrow. */
      perDay: z.number().int().positive().default(10),
      templates: z.array(MissionTemplateSchema).default([]),
      /** Extra rewards for every Nth mission completed (counted over the whole game), e.g. a chest every 5th. */
      milestones: z.array(z.object({ every: z.number().int().positive(), reward: RewardSchema })).default([]),
    })
    .default({ slots: 3, perDay: 10, templates: [], milestones: [] }),
  deals: z.array(DealSchema).default([]),
  dailyShop: z
    .object({ slots: z.number().int().positive().default(3), offers: z.array(DailyOfferSchema).default([]) })
    .default({ slots: 3, offers: [] }),
});
export type MetaConfig = z.output<typeof MetaSchema>;
