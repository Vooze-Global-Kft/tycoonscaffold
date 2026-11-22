import type { ChainState } from './chain';

export interface BusinessState {
  /** Classic mode: units owned. Sim mode: the station's level. */
  owned: number;
  /** 0..1 through the current cycle. */
  progress: number;
  /** An unmanaged business runs one cycle per tap. */
  running: boolean;
  /** The automation hire for this business has been bought. */
  managed: boolean;
}

/** Sim mode: a venue's transport and sales stages. Workers and seats live in the ChainState part. */
export interface VenueChain extends ChainState {
  transportLevel: number;
  /** The transport automation hire has been bought; workers no longer wait for the bell. */
  transportManaged: boolean;
  salesLevel: number;
}

/** One location. Classic games have exactly one, with id MAIN_VENUE. */
export interface VenueState {
  unlocked: boolean;
  businesses: Record<string, BusinessState>;
  /** Null in classic mode. */
  chain: VenueChain | null;
}

/** Classic games keep everything in this single venue. */
export const MAIN_VENUE = 'main';

export interface CardState {
  /** 0 = not owned yet. */
  level: number;
  /** Spare copies towards the next level. */
  copies: number;
}

export interface MissionSlot {
  templateId: string;
  target: number;
  /** Value of the mission's counter when it was handed out; progress = counter - start. */
  start: number;
}

export interface DealState {
  /** Epoch ms when the offer appeared. */
  startedAt: number;
  purchases: number;
  /** The player has been shown the offer once (so it is not pushed again). */
  seen: boolean;
}

export interface GameState {
  version: 2;
  cash: number;
  gems: number;
  /** Earned in this run (reset on prestige). */
  runEarnings: number;
  /** Earned across all runs; drives prestige. */
  lifetimeEarnings: number;
  prestigePoints: number;
  prestigeCount: number;
  venues: Record<string, VenueState>;
  /** The venue on screen. Only this one is simulated actor by actor; the others earn at their steady rate. */
  activeVenue: string;
  /** Upgrades bought. They apply in every venue. */
  upgrades: string[];
  /** Epoch ms when the ad boost expires. */
  boostUntil: number;
  /** Sim mode skill: active until `until`, usable again at `readyAt` (epoch ms). */
  rush: { until: number; readyAt: number };
  storySeen: string[];
  /** Permanent entitlements from IAP. Survive prestige. */
  entitlements: {
    /** No banners or pop-up ads. */
    noAds: boolean;
    /** Rewarded boosts are granted without watching an ad. */
    skipRewarded: boolean;
    /** Ids of non-consumable products owned. */
    products: string[];
    /** Product multipliers multiply together. */
    multipliers: Record<string, number>;
  };
  daily: { lastClaimDay: string | null; streak: number };

  // --- meta systems (all survive prestige) ---
  cards: Record<string, CardState>;
  chests: {
    /** Unopened chests by id. */
    owned: Record<string, number>;
    /**
     * Free chests recharge from this moment (epoch ms): one is ready for each full recharge
     * period since then, up to the storage limit. 0 = not started yet.
     */
    freeAnchor: number;
    /** Free chests claimed so far (the first few recharge faster). */
    freeClaimed: number;
    /** Day key and count for the rewarded-ad chest limit, and when the next one is allowed. */
    adDay: string | null;
    adCount: number;
    adNextAt: number;
    /** Chests opened in a row without an epic (or better) card, and without a legendary, for bad-luck protection. */
    sinceEpic: number;
    sinceLegendary: number;
  };
  missions: {
    slots: MissionSlot[];
    /** How many times each template has been completed (its target ladder advances with it). */
    completed: Record<string, number>;
    /** Missions completed in total (for the every-Nth rewards) and today (for the daily limit). */
    total: number;
    day: string | null;
    doneToday: number;
  };
  deals: Record<string, DealState>;
  dailyShop: { day: string | null; offerIds: string[]; bought: string[] };
  /** Seed for every random roll (chests, daily shop). Advanced by each roll, saved with the game. */
  rng: number;

  stats: {
    taps: number;
    adsWatched: number;
    playSeconds: number;
    firstOpenAt: number;
    /** Guests served (sim) across all venues; fractional because off-screen venues are estimated. */
    served: number;
    levelsBought: number;
    hires: number;
    chestsOpened: number;
    bonusCaught: number;
    rushes: number;
    /** Play sessions (a new one starts after 30 minutes away). */
    sessions: number;
    /** Most venues ever open at once, across prestiges. */
    venuesEver: number;
  };
  lastSavedAt: number;
}

/** A fixed count, or as many as the player can afford. The UI offers 1, 10, 100 and max. */
export type BuyAmount = number | 'max';
