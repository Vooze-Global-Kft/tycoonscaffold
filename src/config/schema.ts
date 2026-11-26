/**
 * The GameConfig schema is the whole contract between the shared engine and
 * one reskinned game. Everything a game is (its name, story, economy, art,
 * monetization and store listing) lives in games/<id>/game.json and is checked
 * against this schema. The code never branches on a game id.
 */
import { z } from 'zod';
import { MetaSchema, RewardSchema, SimSchema } from './schema.sim';

export * from './schema.sim';

const hex = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'hex colour like #FFAA00');

/**
 * An icon is an emoji (zero-asset reskin), `asset:<key>` (an image from the game's assets map)
 * `char:<castId>` (a code-drawn character from the game's cast) or `art:<name>` (a code-drawn still
 * the active mode draws; the Node-side lint, ./lint.ts, checks the names).
 */
const icon = z.string().min(1);

export const BusinessSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  icon,
  /** Cost of the first unit. */
  baseCost: z.number().positive(),
  /** Each unit costs this much more than the previous one (1.07 to 1.15 is typical). */
  costGrowth: z.number().gt(1),
  /** Revenue per unit owned, per completed cycle. */
  baseRevenue: z.number().positive(),
  /** Seconds per production cycle before speed milestones. */
  cycleSeconds: z.number().positive(),
  /** Cost of the manager that automates this business. */
  managerCost: z.number().positive(),
  managerName: z.string().optional(),
  managerIcon: icon.optional(),
  /** Short line shown under the name, flavour text for the theme. */
  flavor: z.string().optional(),
  /** Sim mode: which code-drawn station to show (oven, stove, prep, fryer, dessert, espresso, generic). */
  stationKind: z.string().optional(),
  /** Sim mode: what this station makes, e.g. "Margherita", and the icon that flies to the buffer. */
  productName: z.string().optional(),
  productIcon: icon.optional(),
  /** Sim mode: cast id for the worker's look. Omit for a generated look that varies per venue. */
  workerLook: z.string().optional(),
});

export const MilestoneSchema = z.object({
  owned: z.number().int().positive(),
  /** Divides cycle time. 2 means twice as fast. */
  speedMult: z.number().positive().default(1),
  revenueMult: z.number().positive().default(1),
});

export const UpgradeSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: icon.optional(),
  cost: z.number().positive(),
  /** Business id, or "all". */
  target: z.string(),
  revenueMult: z.number().positive(),
  /** Paid in gems instead of cash. */
  premium: z.boolean().default(false),
});

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  portrait: icon,
  color: hex.optional(),
});

/** A story beat fires once, the first time its condition becomes true. */
export const StoryBeatSchema = z.object({
  id: z.string(),
  characterId: z.string(),
  title: z.string().optional(),
  lines: z.array(z.string()).min(1),
  trigger: z.discriminatedUnion('type', [
    z.object({ type: z.literal('start') }),
    z.object({ type: z.literal('lifetimeEarnings'), amount: z.number() }),
    z.object({ type: z.literal('owned'), businessId: z.string(), count: z.number().int() }),
    z.object({ type: z.literal('prestige'), count: z.number().int() }),
    /** Sim mode: a venue has been opened. */
    z.object({ type: z.literal('venue'), venueId: z.string() }),
    /** The automation hire for a business has been bought (in any venue). */
    z.object({ type: z.literal('hired'), businessId: z.string() }),
    /** Sim mode: the transport automation hire has been bought (in any venue). */
    z.object({ type: z.literal('transportHired') }),
    /** Haul mode (src/engine/mode.ts storyTrigger): lifetime warp-outs reached `count`. */
    z.object({ type: z.literal('launches'), count: z.number().int().positive() }),
    /** Haul mode: a slot on this ring (1-based) has ever been claimed. */
    z.object({ type: z.literal('ring'), ring: z.number().int().positive() }),
    /** Haul mode: contracts have unlocked (ever). */
    z.object({ type: z.literal('contracts') }),
    /** Haul mode: the dock autopilot has been online (ever). */
    z.object({ type: z.literal('system') }),
    /** Haul mode: the run is in this galaxy index (0-based) or later. */
    z.object({ type: z.literal('galaxy'), index: z.number().int().nonnegative() }),
    /** Haul mode: a Jump would gain at least `cores` cores ("Jump ready", spec section 8). */
    z.object({ type: z.literal('jumpReady'), cores: z.number().int().positive().default(20) }),
  ]),
  /** Portrait for this beat only (e.g. an angry or excited expression). Defaults to the character's portrait. */
  portrait: icon.optional(),
  /** Optional reward granted when the beat is dismissed. */
  rewardGems: z.number().int().nonnegative().default(0),
});

export const IapProductSchema = z.object({
  /** The store product id. Must match App Store Connect / Play Console / RevenueCat. */
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  /**
   * noAds: removes banners and pop-up ads. skipAds: rewarded boosts are granted without watching.
   * multiplier: permanent income multiplier (`value`). gems: `value` gems. timeWarp: `value` hours of income.
   * starterPack: noAds plus `value` gems (or `contents` when set). deal: only a price; what it grants is set by
   * the deal in `meta.deals` that names this product. clearance: no banners or pop-up ads, and every rewarded
   * boost without the ad (one product). unlock: a permanent rule the mode reads from `entitlements.products`
   * (haul: `haul.hangar.product`). cosmetic: looks only, nothing in the rules changes (merge: Blue Silk
   * Awnings, `merge.products.awnings`; Decisions M7 and M13 of docs/design/market-design.md). hoursOfIncome: a
   * consumable worth `value` hours of the mode's own rated income, granted only by the mode
   * (src/engine/mode.ts `grantProduct`) with the store's transaction id, at the amount the mode quoted
   * before the store's sheet opened (src/state/store.ts `buyQuoted`); never the shared time warp.
   */
  kind: z.enum(['noAds', 'skipAds', 'multiplier', 'gems', 'starterPack', 'timeWarp', 'deal', 'clearance', 'unlock', 'cosmetic', 'hoursOfIncome']),
  /** starterPack only: what it grants instead of "no ads plus `value` gems" (a pack without no-ads). */
  contents: z.array(RewardSchema).optional(),
  /** Multiplier value, gem amount or warp hours, depending on kind. */
  value: z.number().positive().default(1),
  icon: icon.optional(),
  /** Shown before store prices load (and in mock mode). */
  fallbackPrice: z.string().default('$0.99'),
  highlight: z.boolean().default(false),
});

const PlatformAdUnits = z.object({
  appId: z.string(),
  banner: z.string().optional(),
  interstitial: z.string().optional(),
  rewarded: z.string().optional(),
  appOpen: z.string().optional(),
});

export const GameConfigSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  /**
   * "classic": a list of businesses that pay straight into cash.
   * "sim": businesses are stations in a production chain with visible workers (needs the `sim` block).
   * "haul": the orbital hauling game (needs the `haul` block; `businesses` stays empty). Its rules
   *   are src/engine/haul, installed by its mode entry (src/engine/mode.ts).
   * "merge": the street-market merge game (needs the `merge` block; `businesses` stays empty). Its rules
   *   are src/engine/merge, installed by its mode entry (src/engine/mode.ts).
   * "decree": the desk game of offices and papers (needs the `decree` block; `businesses` stays empty).
   *   Its rules are src/engine/decree, installed by its mode entry (src/engine/mode.ts).
   * "salvage": the walkable scrapyard (needs the `salvage` block; `businesses` stays empty). Its rules
   *   are src/engine/salvage, installed by its mode entry (src/engine/mode.ts). Landscape (`app.orientation`).
   * The mode picks the code bundled with the game (src/generated/mode.ts) and is never changed at run time.
   */
  mode: z.enum(['classic', 'sim', 'haul', 'merge', 'decree', 'salvage']).default('classic'),
  /**
   * The sound pack: a folder in shared/sfx/ ("warm": marimba, plate clinks, the service bell;
   * "synth"). Only this pack is bundled with the game; files in the game's own assets/sfx/
   * override it by name. null: no pack at all, the game plays only its own assets/sfx/ (so no
   * other game's sound can ever fill a key it lacks). A missing sound is silent. Required (a
   * string or null): no game gets another game's sounds by forgetting the field.
   */
  soundPack: z.string().regex(/^[a-z0-9-]+$/).nullable(),

  app: z.object({
    /** Name under the icon on the home screen (keep it short, about 12 chars). */
    displayName: z.string().max(30),
    slug: z.string(),
    iosBundleId: z.string(),
    androidPackage: z.string(),
    version: z.string().default('1.0.0'),
    buildNumber: z.number().int().positive().default(1),
    easProjectId: z.string().optional(),
    owner: z.string().optional(),
    /**
     * The tracking-permission sentence (iOS NSUserTrackingUsageDescription, the first system prompt),
     * in the game's own voice (Decision 55). Optional: without it app.config.ts uses the shared
     * sentence with the game's name (the first game's text stays what it is).
     */
    trackingText: z.string().min(20).max(200).optional(),
    /**
     * The orientation the app is locked to (app.config.ts `orientation`; Expo's manifest field, honoured by
     * Expo Go and the store builds). Optional: a game without it is portrait, exactly as before. No
     * run-time lock: a landscape game draws its own "turn your phone sideways" card when the window is
     * taller than wide (docs/design/research/yard-tech.md A1, A5; the salvage mode).
     */
    orientation: z.enum(['portrait', 'landscape']).optional(),
  }),

  theme: z.object({
    colors: z.object({
      background: hex,
      backgroundAlt: hex,
      surface: hex,
      primary: hex,
      primaryText: hex,
      accent: hex,
      text: hex,
      textMuted: hex,
      success: hex,
      danger: hex,
      progress: hex,
      gradient: z.array(hex).min(2),
      /**
       * Sim mode: one colour per stage of the chain. A stage always shows in its colour (scene
       * accents, the stage strip, list rows), together with its icon, never by colour alone.
       */
      stages: z
        .object({ production: hex, transport: hex, sales: hex })
        .default({ production: '#EF7D22', transport: '#2A9D8F', sales: '#7B5EA7' }),
    }),
    radius: z.number().default(16),
    /** "skia" (2D, default) or "three" (3D diorama via expo-gl). */
    scene: z.enum(['skia', 'three']).default('skia'),
    /** Emoji or asset key tapped to earn cash in the hero scene. */
    heroIcon: icon,
    particleIcon: icon.default('🪙'),
    /** Asset key of a .ttf used for headings, numbers and buttons. Omit for the system font. */
    displayFont: z.string().optional(),
    /** Asset key of a wide image drawn behind the hero. Omit for the generated backdrop. */
    sceneBackground: z.string().optional(),
    /** UI icons. Each is an emoji or "asset:<key>". */
    icons: z
      .object({
        boost: icon.default('🚀'),
        gift: icon.default('🎁'),
        timeWarp: icon.default('⏩'),
        offline: icon.default('🌙'),
        bonus: icon.default('✨'),
        manager: icon.default('🧑‍💼'),
        tabBuild: icon.optional(),
        tabManagers: icon.default('🧑‍💼'),
        tabUpgrades: icon.default('⬆️'),
        tabShop: icon.default('🛒'),
      })
      .default({ boost: '🚀', gift: '🎁', timeWarp: '⏩', offline: '🌙', bonus: '✨', manager: '🧑‍💼', tabManagers: '🧑‍💼', tabUpgrades: '⬆️', tabShop: '🛒' }),
    darkStatusBar: z.boolean().default(false),
  }),

  /** Optional images. Keys are referenced from any `icon` field. Paths are relative to the game folder. */
  assets: z.record(z.string(), z.string()).default({}),

  strings: z.object({
    currencyName: z.string(),
    currencySymbol: z.string().default('$'),
    currencyIcon: icon.default('🪙'),
    gemName: z.string().default('Gems'),
    gemIcon: icon.default('💎'),
    prestigeName: z.string(),
    prestigeIcon: icon.default('⭐'),
    prestigeVerb: z.string().default('Prestige'),
    prestigeDescription: z.string(),
    managerTab: z.string().default('Managers'),
    upgradeTab: z.string().default('Upgrades'),
    tapHint: z.string().default('Tap to earn!'),
  }),

  economy: z.object({
    startingCash: z.number().nonnegative().default(5),
    /** Cash earned per tap on the hero = tapBase + tapPercentOfIncome * income/sec. */
    tapBase: z.number().nonnegative().default(1),
    tapPercentOfIncome: z.number().nonnegative().default(0.05),
    /** Milestones apply to every business. */
    milestones: z.array(MilestoneSchema).default([
      { owned: 10, speedMult: 2, revenueMult: 1 },
      { owned: 25, speedMult: 2, revenueMult: 1 },
      { owned: 50, speedMult: 2, revenueMult: 1 },
      { owned: 100, speedMult: 2, revenueMult: 1 },
      { owned: 200, speedMult: 1, revenueMult: 3 },
      { owned: 300, speedMult: 1, revenueMult: 3 },
      { owned: 400, speedMult: 1, revenueMult: 5 },
    ]),
    /**
     * Past the last listed milestone, a milestone repeats every `every` levels, so levels never
     * stop mattering. Omit to stop at the list.
     */
    milestoneRepeat: z
      .object({ every: z.number().int().positive(), speedMult: z.number().positive().default(1), revenueMult: z.number().positive().default(2) })
      .optional(),
    prestige: z.object({
      /** Lifetime earnings needed for the first prestige point. */
      threshold: z.number().positive(),
      /** points = floor(scale * (lifetime / threshold) ^ exponent) */
      scale: z.number().positive().default(1),
      /**
       * How fast points grow with lifetime earnings (0.5 = square root). Lower values damp the reset
       * loop: each extra point needs relatively more lifetime earnings.
       */
      exponent: z.number().positive().max(1).default(0.5),
      /** Revenue bonus per point (0.02 = +2%). 0 in a haul game (cores are spent, not passive; lint). */
      bonusPerPoint: z.number().min(0).default(0.02),
    }),
    offline: z.object({
      maxHours: z.number().positive().default(4),
      /** Fraction of online income earned while away. */
      efficiency: z.number().min(0).max(1).default(0.5),
      minSecondsToShow: z.number().default(60),
    }),
    boost: z.object({
      /** Revenue multiplier while an ad boost is active. */
      multiplier: z.number().positive().default(2),
      minutesPerAd: z.number().positive().default(30),
      maxMinutes: z.number().positive().default(240),
    }),
    daily: z.object({
      /** The gift ladder, one entry per claim, cycling. Empty: the game has no daily gift (Decision 53, economy.dailyOffered). */
      gems: z.array(z.number().int().nonnegative()).default([5, 5, 10, 10, 15, 20, 50]),
    }),
    timeWarp: z.object({
      hours: z.number().positive().default(1),
      gemCost: z.number().int().positive().default(25),
    }),
    /** A bonus item flies across the hero scene now and then; tapping it pays out. */
    bonus: z
      .object({
        name: z.string().default('Lucky Bonus'),
        minSec: z.number().positive().default(45),
        maxSec: z.number().positive().default(110),
        /** Pays this many seconds of income... */
        incomeSeconds: z.number().positive().default(120),
        /** ...but never less than this many taps' worth, so it matters before managers. */
        minTaps: z.number().positive().default(40),
      })
      .default({ name: 'Lucky Bonus', minSec: 45, maxSec: 110, incomeSeconds: 120, minTaps: 40 }),
    /** Tapping quickly builds a combo that multiplies tap earnings. */
    combo: z
      .object({
        tapsPerLevel: z.number().int().positive().default(12),
        maxMultiplier: z.number().int().min(1).default(5),
        /** The combo resets after this long without a tap. */
        decayMs: z.number().positive().default(1400),
        name: z.string().default('COMBO'),
      })
      .default({ tapsPerLevel: 12, maxMultiplier: 5, decayMs: 1400, name: 'COMBO' }),
  }),

  /** At least one in sim and classic games (lint); a haul game has none. */
  businesses: z.array(BusinessSchema).default([]),
  /** Sim mode: transport, sales, venues and the rush skill. */
  sim: SimSchema.optional(),
  /**
   * Haul mode: the orbital map's content and numbers. Opaque here: its schema
   * (src/config/schema.haul.ts) belongs to the haul mode, so no other game's bundle carries it; the
   * haul engine mode parses this block with its defaults when the haul entry installs it
   * (src/engine/haulMode.ts `config`), and the game-data lint checks it (src/config/lint.ts).
   */
  haul: z.record(z.string(), z.unknown()).optional(),
  /**
   * Merge mode: the board, chains, tickets, seasons and lanterns. Opaque here, like `haul`: its schema
   * (src/config/schema.merge.ts) belongs to the merge mode; the merge engine mode parses this block
   * with its defaults when the merge entry installs it (src/engine/mergeMode.ts `config`), and the
   * game-data lint checks it (src/config/lint.ts).
   */
  merge: z.record(z.string(), z.unknown()).optional(),
  /**
   * Decree mode: the offices, clubs, ministries, papers and their deck. Opaque here, like `haul` and
   * `merge`: its schema (src/config/schema.decree.ts) belongs to the decree mode; the decree engine mode
   * parses this block with its defaults when the decree entry installs it (src/engine/decreeMode.ts
   * `config`), and the game-data lint checks it (src/config/lint.ts).
   */
  decree: z.record(z.string(), z.unknown()).optional(),
  /**
   * Salvage mode: the yard, the worker and what the rules need. Opaque here, like `haul`, `merge` and
   * `decree`: its schema (src/config/schema.salvage.ts) belongs to the salvage mode; the salvage engine
   * mode parses this block with its defaults when the salvage entry installs it (src/engine/salvageMode.ts
   * `config`), and the game-data lint checks it (src/config/lint.ts).
   */
  salvage: z.record(z.string(), z.unknown()).optional(),
  /** Cards, chests, missions and deals. Works in both modes; everything is optional. */
  meta: MetaSchema.default({
    cards: [],
    cardEffect: {
      common: { base: 10, perLevel: 5 },
      rare: { base: 20, perLevel: 10 },
      epic: { base: 40, perLevel: 20 },
      legendary: { base: 100, perLevel: 50 },
    },
    cardCopies: { base: 2, growth: 1.5 },
    chests: [],
    missions: { slots: 3, perDay: 10, templates: [], milestones: [] },
    pity: {},
    chestGrowthPerVenue: 0.2,
    chestsForSale: false,
    chestSalesBlockedIn: ['BE', 'BR', 'NL'],
    deals: [],
    dailyShop: { slots: 3, offers: [] },
  }),
  /**
   * Looks for code-drawn characters, by id. Referenced by `char:<id>` icons and by sim workers.
   * Fields are those of CharacterLook in src/ui/sim/art/types.ts (skin, hair, hat, outfit, ...).
   */
  cast: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  upgrades: z.array(UpgradeSchema).default([]),
  characters: z.array(CharacterSchema).default([]),
  story: z.array(StoryBeatSchema).default([]),

  monetization: z.object({
    ads: z.object({
      ios: PlatformAdUnits.optional(),
      android: PlatformAdUnits.optional(),
      /** Seconds of play before the first interstitial. */
      firstInterstitialAfterSec: z.number().default(300),
      /** Minimum gap between interstitials. */
      interstitialCooldownSec: z.number().default(180),
      showBanner: z.boolean().default(true),
      /**
       * false: the game shows no interstitial at all (Orbit Haulers' first version, spec 5.4). Absent:
       * interstitials at the natural breaks, as before (no default, so existing games parse unchanged).
       */
      interstitials: z.boolean().optional(),
      /** Use Google test ads even in release builds (turn off for production). */
      forceTestAds: z.boolean().default(false),
      /**
       * Highest ad content rating the ad network may serve (AdMob MaxAdContentRating). Must fit the
       * app's store age rating; set before the SDK initialises. See docs/design/research/policy.md item 9.
       */
      maxAdContentRating: z.enum(['G', 'PG', 'T', 'MA']).default('PG'),
      /**
       * When consent, tracking and the ad SDK are asked for and started (src/services/ads.ts). 'boot': at
       * the game's start, as every game did before this existed. 'firstOffer': nothing of them until the
       * first time an ad button would show (the mode's screen calls `ads.firstOffer()`), then once.
       */
      initOn: z.enum(['boot', 'firstOffer']).default('boot'),
    }),
    iap: z.object({
      revenueCatIosKey: z.string().optional(),
      revenueCatAndroidKey: z.string().optional(),
      products: z.array(IapProductSchema).default([]),
    }),
  }),

  firebase: z
    .object({
      /** Relative to the game folder. Download from the Firebase console per app. */
      iosGoogleServicesFile: z.string().optional(),
      androidGoogleServicesFile: z.string().optional(),
    })
    .default({}),

  /** App Store / Play listing. Written to store.config.json for `eas metadata`. */
  store: z.object({
    title: z.string().max(30),
    subtitle: z.string().max(30),
    /** iOS keyword field, comma separated, at most 100 chars. */
    keywords: z.array(z.string()).min(1),
    shortDescription: z.string().max(80),
    description: z.string().max(4000),
    /** Apple's promotional text (170 characters, changeable without a review); written by sync. Optional, no default. */
    promotionalText: z.string().max(170).optional(),
    primaryCategory: z.string().default('GAMES'),
    subcategories: z.array(z.string()).default(['GAMES_SIMULATION', 'GAMES_CASUAL']),
    privacyPolicyUrl: z.string().url().optional(),
    supportUrl: z.string().url().optional(),
    marketingUrl: z.string().url().optional(),
    locale: z.string().default('en-US'),
  }),
});

export type GameConfig = z.output<typeof GameConfigSchema>;
export type GameConfigInput = z.input<typeof GameConfigSchema>;
export type Business = z.output<typeof BusinessSchema>;
export type Upgrade = z.output<typeof UpgradeSchema>;
export type StoryBeat = z.output<typeof StoryBeatSchema>;
export type IapProduct = z.output<typeof IapProductSchema>;
export type Character = z.output<typeof CharacterSchema>;

// The cross-field checks (lintGameConfig) live in ./lint.ts: Node tools only, so their messages ship in no game.
