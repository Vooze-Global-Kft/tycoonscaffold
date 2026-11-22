/**
 * The GameConfig schema is the whole contract between the shared engine and
 * one reskinned game. Everything a game is (its name, story, economy, art,
 * monetization and store listing) lives in games/<id>/game.json and is checked
 * against this schema. The code never branches on a game id.
 */
import { z } from 'zod';
import { MetaSchema, SimSchema } from './schema.sim';

export * from './schema.sim';

const hex = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'hex colour like #FFAA00');

/**
 * An icon is an emoji (zero-asset reskin), `asset:<key>` (an image from the game's assets map)
 * or `char:<castId>` (a code-drawn character from the game's cast).
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
   * starterPack: noAds plus `value` gems. deal: only a price; what it grants is set by the deal in `meta.deals`
   * that names this product.
   */
  kind: z.enum(['noAds', 'skipAds', 'multiplier', 'gems', 'starterPack', 'timeWarp', 'deal']),
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
   */
  mode: z.enum(['classic', 'sim']).default('classic'),

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

  businesses: z.array(BusinessSchema).min(1),
  /** Sim mode: transport, sales, venues and the rush skill. */
  sim: SimSchema.optional(),
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
      /** Use Google test ads even in release builds (turn off for production). */
      forceTestAds: z.boolean().default(false),
      /**
       * Highest ad content rating the ad network may serve (AdMob MaxAdContentRating). Must fit the
       * app's store age rating; set before the SDK initialises. See docs/design/research/policy.md item 9.
       */
      maxAdContentRating: z.enum(['G', 'PG', 'T', 'MA']).default('PG'),
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
    if ((s.trigger.type === 'owned' || s.trigger.type === 'hired') && !ids.has(s.trigger.businessId)) {
      problems.push(`story beat "${s.id}" triggers on unknown business "${s.trigger.businessId}"`);
    }
    if (s.trigger.type === 'venue') {
      const venueId = s.trigger.venueId;
      if (!cfg.sim?.venues.some((v) => v.id === venueId)) problems.push(`story beat "${s.id}" triggers on unknown venue "${venueId}"`);
    }
  }

  // --- sim mode ---
  if (cfg.mode === 'sim' && !cfg.sim) problems.push('mode is "sim" but there is no "sim" block');
  if (cfg.mode !== 'sim' && cfg.sim) problems.push('there is a "sim" block but mode is not "sim"');
  if (cfg.sim) {
    for (let i = 1; i < cfg.sim.venues.length; i++) {
      const [prev, v] = [cfg.sim.venues[i - 1], cfg.sim.venues[i]];
      if (v.scale <= prev.scale) problems.push(`venue "${v.id}" must have a larger scale than "${prev.id}"`);
      if (v.unlockCost <= prev.unlockCost) problems.push(`venue "${v.id}" must cost more to open than "${prev.id}"`);
    }
  }

  // --- meta: cards, chests, missions, deals ---
  const meta = cfg.meta;
  const unique = (what: string, list: { id: string }[]) => {
    const seen = new Set<string>();
    for (const x of list) {
      if (seen.has(x.id)) problems.push(`duplicate ${what} id "${x.id}"`);
      seen.add(x.id);
    }
    return seen;
  };
  const cardIds = unique('card', meta.cards);
  const chestIds = unique('chest', meta.chests);
  unique('mission', meta.missions.templates);
  unique('deal', meta.deals);
  unique('daily offer', meta.dailyShop.offers);
  const checkReward = (where: string, r: (typeof meta.deals)[number]['contents'][number]) => {
    if (r.type === 'chest' && !chestIds.has(r.chestId)) problems.push(`${where} grants unknown chest "${r.chestId}"`);
    if (r.type === 'card' && !cardIds.has(r.cardId)) problems.push(`${where} grants unknown card "${r.cardId}"`);
    if (r.type === 'randomCard' && !meta.cards.some((c) => c.rarity === r.rarity)) problems.push(`${where} grants a ${r.rarity} card but there are none`);
  };
  for (const c of meta.chests) {
    const { card, gems, cash } = c.slotWeights;
    if (card + gems + cash <= 0) problems.push(`chest "${c.id}" has no slot weights`);
    const w = c.rarityWeights;
    if (card > 0 && w.common + w.rare + w.epic + w.legendary <= 0) problems.push(`chest "${c.id}" has card slots but no rarity weights`);
    if (card > 0 && meta.cards.length === 0) problems.push(`chest "${c.id}" has card slots but the game has no cards`);
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      if (card > 0 && w[rarity] > 0 && !meta.cards.some((x) => x.rarity === rarity)) problems.push(`chest "${c.id}" can roll a ${rarity} card but there are none`);
      if (c.cardCopies[rarity][0] < 1) problems.push(`chest "${c.id}" cardCopies.${rarity} must be at least 1`);
    }
  }
  if (!meta.chestsForSale) {
    const sold = (where: string, rewards: { type: string }[]) => {
      if (rewards.some((r) => r.type === 'chest')) problems.push(`${where} contains a chest, but meta.chestsForSale is off (chests are earned, not sold)`);
    };
    for (const c of meta.chests) if (c.gemCost !== undefined) problems.push(`chest "${c.id}" has a gem price, but meta.chestsForSale is off`);
    for (const d of meta.deals) sold(`deal "${d.id}"`, d.contents);
    for (const o of meta.dailyShop.offers) if (o.gemCost > 0) sold(`daily offer "${o.id}"`, [o.reward]);
  }
  if (meta.freeChest && !chestIds.has(meta.freeChest.chestId)) problems.push(`freeChest uses unknown chest "${meta.freeChest.chestId}"`);
  if (meta.adChest && !chestIds.has(meta.adChest.chestId)) problems.push(`adChest uses unknown chest "${meta.adChest.chestId}"`);
  for (const m of meta.missions.templates) {
    if (!m.text.includes('{n}')) problems.push(`mission "${m.id}" text must contain {n}`);
    if (m.type === 'rush' && !cfg.sim) problems.push(`mission "${m.id}" counts rush skills, which only sim games have`);
    if (m.type === 'serve' && !cfg.sim) problems.push(`mission "${m.id}" counts guests served, which only sim games have`);
    if (m.type === 'chests' && meta.chests.length === 0) problems.push(`mission "${m.id}" counts chests but the game has none`);
    checkReward(`mission "${m.id}"`, m.reward);
  }
  meta.missions.milestones.forEach((m) => checkReward(`mission milestone every ${m.every}`, m.reward));
  for (const d of meta.deals) {
    if (d.trigger.type === 'venue') {
      const venueId = d.trigger.venueId;
      if (!cfg.sim?.venues.some((v) => v.id === venueId)) problems.push(`deal "${d.id}" triggers on unknown venue "${venueId}"`);
    }
  }
  if (meta.missions.templates.length > 0 && meta.missions.templates.length < meta.missions.slots) {
    problems.push(`missions: ${meta.missions.slots} slots but only ${meta.missions.templates.length} templates`);
  }
  for (const d of meta.deals) {
    if (Boolean(d.productId) === Boolean(d.gemCost)) problems.push(`deal "${d.id}" needs exactly one of productId or gemCost`);
    if (d.productId) {
      const product = cfg.monetization.iap.products.find((p) => p.id === d.productId);
      if (!product) problems.push(`deal "${d.id}" uses unknown IAP product "${d.productId}"`);
      else if (product.kind !== 'deal') problems.push(`deal "${d.id}" must use an IAP product of kind "deal", not "${product.kind}"`);
    }
    d.contents.forEach((r) => {
      checkReward(`deal "${d.id}"`, r);
      // Deals are consumable purchases; permanent items are sold as their own products so they can be restored.
      if (r.type === 'noAds' || r.type === 'multiplier') problems.push(`deal "${d.id}" may not contain "${r.type}"; sell it as its own product`);
    });
  }
  for (const p of cfg.monetization.iap.products) {
    if (p.kind === 'deal' && meta.deals.filter((d) => d.productId === p.id).length !== 1) {
      problems.push(`IAP product "${p.id}" has kind "deal" and must be used by exactly one deal`);
    }
  }
  for (const o of meta.dailyShop.offers) checkReward(`daily offer "${o.id}"`, o.reward);

  const kw = cfg.store.keywords.join(',');
  if (kw.length > 100) problems.push(`store.keywords is ${kw.length} chars; iOS allows 100`);
  const assetKeys = new Set(Object.keys(cfg.assets));
  const iconFields = [
    cfg.theme.heroIcon,
    cfg.theme.particleIcon,
    cfg.strings.currencyIcon,
    cfg.strings.gemIcon,
    cfg.strings.prestigeIcon,
    ...Object.values(cfg.theme.icons).map((i) => i ?? ''),
    ...cfg.businesses.flatMap((b) => [b.icon, b.managerIcon ?? '']),
    ...cfg.upgrades.map((u) => u.icon ?? ''),
    ...cfg.characters.map((c) => c.portrait),
    ...cfg.story.map((b) => b.portrait ?? ''),
    ...cfg.monetization.iap.products.map((p) => p.icon ?? ''),
    ...cfg.businesses.map((b) => b.productIcon ?? ''),
    ...(cfg.sim ? [cfg.sim.buffer.icon, cfg.sim.transport.icon, cfg.sim.transport.managerIcon ?? '', cfg.sim.sales.icon, cfg.sim.rush.icon] : []),
    ...(cfg.sim?.venues.map((v) => v.icon) ?? []),
    ...meta.cards.map((c) => c.icon),
    ...meta.chests.map((c) => c.icon),
    ...meta.deals.map((d) => d.icon ?? ''),
    ...meta.dailyShop.offers.map((o) => o.icon ?? ''),
  ].filter(Boolean);
  const castIds = new Set(Object.keys(cfg.cast));
  const lookRefs = [
    ...cfg.businesses.map((b) => b.workerLook ?? ''),
    ...(cfg.sim ? [...cfg.sim.transport.looks, ...cfg.sim.sales.looks] : []),
    ...iconFields.filter((i) => i.startsWith('char:')).map((i) => i.slice(5)),
  ].filter(Boolean);
  for (const id of lookRefs) {
    if (!castIds.has(id)) problems.push(`character "${id}" is used but missing from cast`);
  }
  for (const key of [cfg.theme.displayFont, cfg.theme.sceneBackground]) {
    if (key && !assetKeys.has(key)) problems.push(`theme asset "${key}" has no entry in assets`);
  }
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
