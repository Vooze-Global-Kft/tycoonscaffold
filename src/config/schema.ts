/**
 * The GameConfig schema is the whole contract between the shared engine and
 * one reskinned game. Everything a game is (its name, story, economy, art,
 * monetization and store listing) lives in games/<id>/game.json and is checked
 * against this schema. The code never branches on a game id.
 */
import { z } from 'zod';

const hex = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'hex colour like #FFAA00');

/** An icon is an emoji (zero-asset reskin) or a key into the game's assets map. */
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
  ]),
  /** Optional reward granted when the beat is dismissed. */
  rewardGems: z.number().int().nonnegative().default(0),
});

export const IapProductSchema = z.object({
  /** The store product id. Must match App Store Connect / Play Console / RevenueCat. */
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  kind: z.enum(['noAds', 'multiplier', 'gems', 'starterPack', 'timeWarp']),
  /** Multiplier value, gem amount or warp hours, depending on kind. */
  value: z.number().positive().default(1),
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
    }),
    radius: z.number().default(16),
    /** "skia" (2D, default) or "three" (3D diorama via expo-gl). */
    scene: z.enum(['skia', 'three']).default('skia'),
    /** Emoji or asset key tapped to earn cash in the hero scene. */
    heroIcon: icon,
    particleIcon: icon.default('🪙'),
    darkStatusBar: z.boolean().default(false),
  }),

  /** Optional images. Keys are referenced from any `icon` field. Paths are relative to the game folder. */
  assets: z.record(z.string(), z.string()).default({}),

  strings: z.object({
    currencyName: z.string(),
    currencySymbol: z.string().default('$'),
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
    prestige: z.object({
      /** Lifetime earnings needed for the first prestige point. */
      threshold: z.number().positive(),
      /** points = floor(scale * sqrt(lifetime / threshold)) */
      scale: z.number().positive().default(1),
      /** Revenue bonus per point (0.02 = +2%). */
      bonusPerPoint: z.number().positive().default(0.02),
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
      gems: z.array(z.number().int().nonnegative()).min(1).default([5, 5, 10, 10, 15, 20, 50]),
    }),
    timeWarp: z.object({
      hours: z.number().positive().default(1),
      gemCost: z.number().int().positive().default(25),
    }),
  }),

  businesses: z.array(BusinessSchema).min(1),
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
      /** Use Google test ads even in release builds (turn off for production). */
      forceTestAds: z.boolean().default(false),
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

/** Cross-field checks zod can't express per field. Returns a list of problems. */
export function lintGameConfig(cfg: GameConfig): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const b of cfg.businesses) {
    if (ids.has(b.id)) problems.push(`duplicate business id "${b.id}"`);
    ids.add(b.id);
  }
  for (const u of cfg.upgrades) {
    if (u.target !== 'all' && !ids.has(u.target)) problems.push(`upgrade "${u.id}" targets unknown business "${u.target}"`);
  }
  const chars = new Set(cfg.characters.map((c) => c.id));
  for (const s of cfg.story) {
    if (!chars.has(s.characterId)) problems.push(`story beat "${s.id}" uses unknown character "${s.characterId}"`);
    if (s.trigger.type === 'owned' && !ids.has(s.trigger.businessId)) {
      problems.push(`story beat "${s.id}" triggers on unknown business "${s.trigger.businessId}"`);
    }
  }
  const kw = cfg.store.keywords.join(',');
  if (kw.length > 100) problems.push(`store.keywords is ${kw.length} chars; iOS allows 100`);
  const assetKeys = new Set(Object.keys(cfg.assets));
  const iconFields = [
    cfg.theme.heroIcon,
    ...cfg.businesses.flatMap((b) => [b.icon, b.managerIcon ?? '']),
    ...cfg.characters.map((c) => c.portrait),
  ].filter(Boolean);
  for (const i of iconFields) {
    if (i.startsWith('asset:') && !assetKeys.has(i.slice(6))) problems.push(`icon "${i}" has no entry in assets`);
  }
  // Each business should be meaningfully more expensive than the last, or the curve feels flat.
  for (let i = 1; i < cfg.businesses.length; i++) {
    if (cfg.businesses[i].baseCost <= cfg.businesses[i - 1].baseCost) {
      problems.push(`business "${cfg.businesses[i].id}" is not more expensive than the one before it`);
    }
  }
  return problems;
}
