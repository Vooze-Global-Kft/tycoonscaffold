import { ACTIVE_GAME_ID, gameAssets, rawGame } from '../generated/activeGame';
import { GameConfigSchema, type GameConfig } from './schema';

function parse(): GameConfig {
  const result = GameConfigSchema.safeParse(rawGame);
  if (!result.success) {
    // Fail loudly in development: a broken game.json should never reach a build.
    throw new Error(`games/${ACTIVE_GAME_ID}/game.json is invalid:\n${result.error.message}`);
  }
  return result.data;
}

/** The config the game was built with. */
export const baseGame: GameConfig = parse();
export { ACTIVE_GAME_ID, gameAssets };

/**
 * Keys that Firebase Remote Config may override at runtime, for A/B tests and
 * live tuning without a store release. Name a parameter in the Firebase
 * console exactly like a key here (e.g. `boost_minutes_per_ad`).
 */
export const REMOTE_KEYS = {
  boost_multiplier: (c: GameConfig, v: number) => (c.economy.boost.multiplier = v),
  boost_minutes_per_ad: (c: GameConfig, v: number) => (c.economy.boost.minutesPerAd = v),
  boost_max_minutes: (c: GameConfig, v: number) => (c.economy.boost.maxMinutes = v),
  offline_max_hours: (c: GameConfig, v: number) => (c.economy.offline.maxHours = v),
  offline_efficiency: (c: GameConfig, v: number) => (c.economy.offline.efficiency = v),
  interstitial_first_after_sec: (c: GameConfig, v: number) => (c.monetization.ads.firstInterstitialAfterSec = v),
  interstitial_cooldown_sec: (c: GameConfig, v: number) => (c.monetization.ads.interstitialCooldownSec = v),
  /** Scales every business's base cost. 0.8 makes the early game 20% cheaper. */
  cost_scale: (c: GameConfig, v: number) => c.businesses.forEach((b) => (b.baseCost *= v)),
  /** Scales every business's base revenue. */
  revenue_scale: (c: GameConfig, v: number) => c.businesses.forEach((b) => (b.baseRevenue *= v)),
  time_warp_gem_cost: (c: GameConfig, v: number) => (c.economy.timeWarp.gemCost = Math.round(v)),
} as const;

export type RemoteKey = keyof typeof REMOTE_KEYS;

export function applyRemoteOverrides(base: GameConfig, values: Partial<Record<RemoteKey, number>>): GameConfig {
  const next: GameConfig = structuredClone(base);
  for (const [key, value] of Object.entries(values)) {
    const apply = REMOTE_KEYS[key as RemoteKey];
    if (apply && typeof value === 'number' && Number.isFinite(value) && value > 0) apply(next, value);
  }
  return next;
}

/** Remote Config defaults, taken from the built-in config so behaviour matches before the first fetch. */
export function remoteDefaults(c: GameConfig): Record<RemoteKey, number> {
  return {
    boost_multiplier: c.economy.boost.multiplier,
    boost_minutes_per_ad: c.economy.boost.minutesPerAd,
    boost_max_minutes: c.economy.boost.maxMinutes,
    offline_max_hours: c.economy.offline.maxHours,
    offline_efficiency: c.economy.offline.efficiency,
    interstitial_first_after_sec: c.monetization.ads.firstInterstitialAfterSec,
    interstitial_cooldown_sec: c.monetization.ads.interstitialCooldownSec,
    cost_scale: 1,
    revenue_scale: 1,
    time_warp_gem_cost: c.economy.timeWarp.gemCost,
  };
}
