export interface BusinessState {
  owned: number;
  /** 0..1 through the current cycle. */
  progress: number;
  /** An unmanaged business runs one cycle per tap. */
  running: boolean;
  managed: boolean;
}

export interface GameState {
  version: 1;
  cash: number;
  gems: number;
  /** Earned in this run (reset on prestige). */
  runEarnings: number;
  /** Earned across all runs; drives prestige. */
  lifetimeEarnings: number;
  prestigePoints: number;
  prestigeCount: number;
  businesses: Record<string, BusinessState>;
  upgrades: string[];
  /** Epoch ms when the ad boost expires. */
  boostUntil: number;
  storySeen: string[];
  /** Permanent entitlements from IAP. Survive prestige. */
  entitlements: {
    noAds: boolean;
    /** Ids of non-consumable products owned. */
    products: string[];
    /** Product multipliers multiply together. */
    multipliers: Record<string, number>;
  };
  daily: { lastClaimDay: string | null; streak: number };
  stats: { taps: number; adsWatched: number; playSeconds: number; firstOpenAt: number };
  lastSavedAt: number;
}

/** A fixed count, or as many as the player can afford. The UI offers 1, 10, 100 and max. */
export type BuyAmount = number | 'max';
