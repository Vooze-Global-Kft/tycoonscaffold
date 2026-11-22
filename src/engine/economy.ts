/**
 * The idle economy. Pure functions only: (config, state, ...) -> new state.
 * No React, no native modules, so it is unit-tested in Node and identical in
 * every game built from this repo.
 *
 * Two modes share these functions:
 * - classic: one venue (MAIN_VENUE); a business pays straight into cash.
 * - sim: several venues; a business is a station whose output enters a
 *   production chain (see chain.ts) and becomes cash only when a guest pays.
 *   Global multipliers (prestige, boost, purchases, cards) are applied at that
 *   moment, so they always raise income whatever the bottleneck is.
 */
import type { Business, GameConfig, SimConfig, StoryBeat } from '../config/schema';
import { cardBonus } from './cards';
import {
  advanceChain,
  chainThroughput,
  createChain,
  resizeChain,
  ringBell,
  type ChainEvent,
  type ChainParams,
  type Stage,
} from './chain';
import { seedFrom } from './rng';
import { MAIN_VENUE, type BusinessState, type BuyAmount, type GameState, type VenueChain, type VenueState } from './types';

export { MAIN_VENUE };

/** What happened during a tick, for sounds and effects. Chain events are reported for the venue on screen only. */
export type GameEvent =
  /** A business finished a cycle. `amount` is cash in classic mode and chain value in sim mode. */
  | { type: 'cycle'; venue: string; business: string; amount: number }
  | { type: 'load'; venue: string; worker: number; amount: number }
  | { type: 'unload'; venue: string; worker: number; amount: number }
  | { type: 'arrive'; venue: string; seat: number; guest: number }
  | { type: 'served'; venue: string; seat: number; amount: number }
  /** A guest paid. `cash` is what actually reached the player (after multipliers). */
  | { type: 'pay'; venue: string; seat: number; amount: number; cash: number }
  | { type: 'leave'; venue: string; seat: number };

// ---------------------------------------------------------------- venues

export function isSim(cfg: GameConfig): cfg is GameConfig & { sim: SimConfig } {
  return cfg.mode === 'sim' && cfg.sim !== undefined;
}

export function venueIds(cfg: GameConfig): string[] {
  return isSim(cfg) ? cfg.sim.venues.map((v) => v.id) : [MAIN_VENUE];
}

/** Multiplier on every cost and base value in a venue (1 in classic mode). */
export function venueScale(cfg: GameConfig, venueId: string): number {
  if (!isSim(cfg)) return 1;
  return cfg.sim.venues.find((v) => v.id === venueId)?.scale ?? 1;
}

function venue(state: GameState, venueId: string): VenueState {
  const v = state.venues[venueId];
  if (!v) throw new Error(`unknown venue ${venueId}`);
  return v;
}

function withVenue(state: GameState, venueId: string, patch: Partial<VenueState>): GameState {
  return { ...state, venues: { ...state.venues, [venueId]: { ...state.venues[venueId], ...patch } } };
}

function withBusiness(state: GameState, venueId: string, id: string, patch: Partial<BusinessState>): GameState {
  const v = venue(state, venueId);
  return withVenue(state, venueId, { businesses: { ...v.businesses, [id]: { ...v.businesses[id], ...patch } } });
}

function withChain(state: GameState, venueId: string, patch: Partial<VenueChain>): GameState {
  const v = venue(state, venueId);
  if (!v.chain) return state;
  return withVenue(state, venueId, { chain: { ...v.chain, ...patch } });
}

/** How many entries of a "joins at these levels" list have been reached. */
export function countAtLevel(levels: number[], level: number): number {
  let n = 0;
  for (const l of levels) if (level >= l) n++;
  return n;
}

function createVenueState(cfg: GameConfig, unlocked: boolean): VenueState {
  const businesses: Record<string, BusinessState> = {};
  cfg.businesses.forEach((b, i) => {
    // The first business starts with one unit so the player can tap straight away.
    businesses[b.id] = { owned: i === 0 && unlocked ? 1 : 0, progress: 0, running: false, managed: false };
  });
  let chain: VenueChain | null = null;
  if (isSim(cfg)) {
    const workers = countAtLevel(cfg.sim.transport.workersAt, 1);
    const seats = countAtLevel(cfg.sim.sales.seatsAt, 1);
    chain = { ...createChain(workers, seats), transportLevel: 1, transportManaged: false, salesLevel: 1 };
  }
  return { unlocked, businesses, chain };
}

// ---------------------------------------------------------------- setup

export function createInitialState(cfg: GameConfig, now: number): GameState {
  const ids = venueIds(cfg);
  const venues: Record<string, VenueState> = {};
  ids.forEach((id, i) => (venues[id] = createVenueState(cfg, i === 0)));
  return {
    version: 2,
    cash: cfg.economy.startingCash,
    gems: 0,
    runEarnings: 0,
    lifetimeEarnings: 0,
    prestigePoints: 0,
    prestigeCount: 0,
    venues,
    activeVenue: ids[0],
    upgrades: [],
    boostUntil: 0,
    rush: { until: 0, readyAt: 0 },
    storySeen: [],
    entitlements: { noAds: false, skipRewarded: false, products: [], multipliers: {} },
    daily: { lastClaimDay: null, streak: 0 },
    cards: {},
    chests: { owned: {}, freeAnchor: 0, freeClaimed: 0, adDay: null, adCount: 0, adNextAt: 0, sinceEpic: 0, sinceLegendary: 0 },
    missions: { slots: [], completed: {}, total: 0, day: null, doneToday: 0 },
    deals: {},
    dailyShop: { day: null, offerIds: [], bought: [] },
    rng: seedFrom(now),
    stats: { taps: 0, adsWatched: 0, playSeconds: 0, firstOpenAt: now, served: 0, levelsBought: 0, hires: 0, chestsOpened: 0, bonusCaught: 0, rushes: 0, sessions: 0, venuesEver: 1 },
    lastSavedAt: now,
  };
}

/** Shape of a version-1 save (before venues). Only what migration reads. */
interface SavedV1 {
  version?: number;
  businesses?: Record<string, Partial<BusinessState>>;
  [key: string]: unknown;
}

/**
 * Brings a saved state in line with the current config and state version:
 * new businesses, venues, workers and seats appear; removed ones are dropped;
 * unknown ids are filtered. Purchases (gems, entitlements) are never lost.
 * Lets you ship content and economy updates without wiping saves.
 */
export function reconcileState(cfg: GameConfig, savedRaw: unknown): GameState {
  const saved = (savedRaw ?? {}) as Partial<GameState> & SavedV1;
  const savedStats = (saved.stats ?? {}) as Partial<GameState['stats']>;
  const fresh = createInitialState(cfg, savedStats.firstOpenAt ?? Date.now());
  const paid = {
    gems: typeof saved.gems === 'number' ? saved.gems : 0,
    entitlements: { ...fresh.entitlements, ...(saved.entitlements ?? {}) },
    daily: { ...fresh.daily, ...(saved.daily ?? {}) },
    stats: { ...fresh.stats, ...savedStats },
  };

  if (saved.version !== 2) {
    // Version 1 had a single flat list of businesses.
    if (isSim(cfg)) {
      // A classic save cannot be mapped onto a production chain: start the run again, keep what was paid for.
      return { ...fresh, ...paid };
    }
    const v1 = { ...(saved as Record<string, unknown>) };
    delete v1.businesses;
    const businesses: Record<string, BusinessState> = {};
    for (const b of cfg.businesses) businesses[b.id] = { ...fresh.venues[MAIN_VENUE].businesses[b.id], ...(saved.businesses?.[b.id] ?? {}) };
    const upgradeIds = new Set(cfg.upgrades.map((u) => u.id));
    return {
      ...fresh,
      ...(v1 as Partial<GameState>),
      ...paid,
      version: 2,
      venues: { [MAIN_VENUE]: { unlocked: true, businesses, chain: null } },
      activeVenue: MAIN_VENUE,
      upgrades: ((saved.upgrades as string[] | undefined) ?? []).filter((id) => upgradeIds.has(id)),
    };
  }

  const venues: Record<string, VenueState> = {};
  for (const id of venueIds(cfg)) {
    const f = fresh.venues[id];
    const s = saved.venues?.[id];
    const businesses: Record<string, BusinessState> = {};
    for (const b of cfg.businesses) businesses[b.id] = { ...f.businesses[b.id], ...(s?.businesses?.[b.id] ?? {}) };
    let chain = f.chain;
    if (chain && isSim(cfg)) {
      const merged: VenueChain = {
        ...chain,
        ...(s?.chain ?? {}),
        workers: s?.chain?.workers ?? chain.workers,
        seats: s?.chain?.seats ?? chain.seats,
      };
      const sized = resizeChain(merged, countAtLevel(cfg.sim.transport.workersAt, merged.transportLevel), countAtLevel(cfg.sim.sales.seatsAt, merged.salesLevel));
      chain = { ...merged, ...sized };
    }
    venues[id] = { unlocked: s?.unlocked ?? f.unlocked, businesses, chain };
  }
  const upgradeIds = new Set(cfg.upgrades.map((u) => u.id));
  const cardIds = new Set(cfg.meta.cards.map((c) => c.id));
  const cards: GameState['cards'] = {};
  for (const [id, c] of Object.entries(saved.cards ?? {})) if (cardIds.has(id)) cards[id] = { level: c.level ?? 0, copies: c.copies ?? 0 };
  return {
    ...fresh,
    ...saved,
    ...paid,
    version: 2,
    venues,
    activeVenue: saved.activeVenue && venues[saved.activeVenue]?.unlocked ? saved.activeVenue : fresh.activeVenue,
    upgrades: (saved.upgrades ?? []).filter((id) => upgradeIds.has(id)),
    rush: { ...fresh.rush, ...(saved.rush ?? {}) },
    cards,
    chests: { ...fresh.chests, ...(saved.chests ?? {}), owned: { ...(saved.chests?.owned ?? {}) } },
    missions: { ...fresh.missions, ...(saved.missions ?? {}) },
    deals: { ...(saved.deals ?? {}) },
    dailyShop: { ...fresh.dailyShop, ...(saved.dailyShop ?? {}) },
    rng: typeof saved.rng === 'number' ? saved.rng : fresh.rng,
  };
}

// ---------------------------------------------------------------- multipliers

export function milestoneMults(cfg: GameConfig, owned: number): { speed: number; revenue: number } {
  let speed = 1;
  let revenue = 1;
  let last = 0;
  for (const m of cfg.economy.milestones) {
    if (m.owned > last) last = m.owned;
    if (owned >= m.owned) {
      speed *= m.speedMult;
      revenue *= m.revenueMult;
    }
  }
  const repeat = cfg.economy.milestoneRepeat;
  if (repeat && owned > last) {
    const times = Math.floor((owned - last) / repeat.every);
    if (times > 0) {
      speed *= Math.pow(repeat.speedMult, times);
      revenue *= Math.pow(repeat.revenueMult, times);
    }
  }
  return { speed, revenue };
}

export function nextMilestone(cfg: GameConfig, owned: number): number | null {
  const listed = cfg.economy.milestones.map((m) => m.owned).filter((o) => o > owned).sort((a, b) => a - b)[0];
  if (listed !== undefined) return listed;
  const repeat = cfg.economy.milestoneRepeat;
  if (!repeat) return null;
  const last = cfg.economy.milestones.reduce((a, m) => Math.max(a, m.owned), 0);
  return last + (Math.floor((owned - last) / repeat.every) + 1) * repeat.every;
}

/** The milestone at or below `owned` (0 when none), for progress bars. */
export function previousMilestone(cfg: GameConfig, owned: number): number {
  const listed = cfg.economy.milestones.map((m) => m.owned).filter((o) => o <= owned);
  const last = cfg.economy.milestones.reduce((a, m) => Math.max(a, m.owned), 0);
  const repeat = cfg.economy.milestoneRepeat;
  if (repeat && owned > last) return last + Math.floor((owned - last) / repeat.every) * repeat.every;
  return listed.length ? Math.max(...listed) : 0;
}

export function isBoostActive(state: GameState, now: number): boolean {
  return state.boostUntil > now;
}

export function prestigeMultiplier(cfg: GameConfig, state: GameState): number {
  return 1 + state.prestigePoints * cfg.economy.prestige.bonusPerPoint;
}

export function entitlementMultiplier(state: GameState): number {
  return Object.values(state.entitlements.multipliers).reduce((a, b) => a * b, 1);
}

/** Upgrades that target one business raise what that business produces. */
function upgradeMultiplier(cfg: GameConfig, state: GameState, businessId: string): number {
  let mult = 1;
  for (const u of cfg.upgrades) {
    if (u.target === businessId && state.upgrades.includes(u.id)) mult *= u.revenueMult;
  }
  return mult;
}

/**
 * Upgrades that target "all" multiply income itself. In classic mode that is the same as raising
 * every business; in sim mode it means they pay off at once instead of first needing more
 * transport and sales capacity.
 */
export function sharedUpgradeMultiplier(cfg: GameConfig, state: GameState): number {
  let mult = 1;
  for (const u of cfg.upgrades) {
    if (u.target === 'all' && state.upgrades.includes(u.id)) mult *= u.revenueMult;
  }
  return mult;
}

/** Everything that multiplies cash as it is created: prestige, purchases, the ad boost, shared upgrades and global-income cards. */
export function globalMultiplier(cfg: GameConfig, state: GameState, now: number): number {
  const boost = isBoostActive(state, now) ? cfg.economy.boost.multiplier : 1;
  return (
    prestigeMultiplier(cfg, state) *
    entitlementMultiplier(state) *
    boost *
    sharedUpgradeMultiplier(cfg, state) *
    cardBonus(cfg, state, 'globalIncome')
  );
}

// ---------------------------------------------------------------- per business

function bizCfg(cfg: GameConfig, id: string): Business {
  const b = cfg.businesses.find((x) => x.id === id);
  if (!b) throw new Error(`unknown business ${id}`);
  return b;
}

export function cycleSeconds(cfg: GameConfig, state: GameState, venueId: string, id: string): number {
  const b = bizCfg(cfg, id);
  return b.cycleSeconds / milestoneMults(cfg, venue(state, venueId).businesses[id].owned).speed;
}

/** Value one cycle produces, before global multipliers. In sim mode this is what enters the chain. */
export function stationValue(cfg: GameConfig, state: GameState, venueId: string, id: string): number {
  const b = bizCfg(cfg, id);
  const owned = venue(state, venueId).businesses[id].owned;
  if (owned === 0) return 0;
  return (
    b.baseRevenue *
    owned *
    milestoneMults(cfg, owned).revenue *
    upgradeMultiplier(cfg, state, id) *
    venueScale(cfg, venueId) *
    cardBonus(cfg, state, 'stationValue')
  );
}

/** Cash one cycle is worth right now (station value times global multipliers). */
export function revenuePerCycle(cfg: GameConfig, state: GameState, venueId: string, id: string, now: number): number {
  return stationValue(cfg, state, venueId, id) * globalMultiplier(cfg, state, now);
}

/** Value per second from automated businesses in a venue, before global multipliers. */
export function productionRate(cfg: GameConfig, state: GameState, venueId: string): number {
  const v = venue(state, venueId);
  let total = 0;
  for (const b of cfg.businesses) {
    const s = v.businesses[b.id];
    if (s.managed && s.owned > 0) total += stationValue(cfg, state, venueId, b.id) / cycleSeconds(cfg, state, venueId, b.id);
  }
  return total;
}

/** Cost of `n` more levels of something with geometric pricing, starting from `owned` (0-based count already bought). */
export function geometricCost(baseCost: number, growth: number, owned: number, n: number, scale = 1): number {
  if (n <= 0) return 0;
  return (baseCost * scale * Math.pow(growth, owned) * (Math.pow(growth, n) - 1)) / (growth - 1);
}

export function geometricMaxAffordable(baseCost: number, growth: number, owned: number, cash: number, scale = 1): number {
  const first = baseCost * scale * Math.pow(growth, owned);
  if (!(cash >= first)) return 0;
  const n = Math.floor(Math.log((cash * (growth - 1)) / first + 1) / Math.log(growth));
  // Floating point can land one over; step back if so.
  return geometricCost(baseCost, growth, owned, n, scale) > cash ? Math.max(0, n - 1) : n;
}

/** Cost of buying `n` more units when `owned` are already owned. */
export function costFor(b: Business, owned: number, n: number, scale = 1): number {
  return geometricCost(b.baseCost, b.costGrowth, owned, n, scale);
}

export function maxAffordable(b: Business, owned: number, cash: number, scale = 1): number {
  return geometricMaxAffordable(b.baseCost, b.costGrowth, owned, cash, scale);
}

export function resolveBuyAmount(cfg: GameConfig, state: GameState, venueId: string, id: string, amount: BuyAmount): number {
  const b = bizCfg(cfg, id);
  const owned = venue(state, venueId).businesses[id].owned;
  return amount === 'max' ? Math.max(1, maxAffordable(b, owned, state.cash, venueScale(cfg, venueId))) : amount;
}

export function businessCost(cfg: GameConfig, state: GameState, venueId: string, id: string, n: number): number {
  return costFor(bizCfg(cfg, id), venue(state, venueId).businesses[id].owned, n, venueScale(cfg, venueId));
}

export function managerCost(cfg: GameConfig, venueId: string, id: string): number {
  return bizCfg(cfg, id).managerCost * venueScale(cfg, venueId);
}

// ---------------------------------------------------------------- actions

function earn(state: GameState, amount: number): GameState {
  if (!(amount > 0)) return state;
  return {
    ...state,
    cash: state.cash + amount,
    runEarnings: state.runEarnings + amount,
    lifetimeEarnings: state.lifetimeEarnings + amount,
  };
}

function bumpStat(state: GameState, key: keyof GameState['stats'], by = 1): GameState {
  return { ...state, stats: { ...state.stats, [key]: state.stats[key] + by } };
}

export function buyBusiness(cfg: GameConfig, state: GameState, venueId: string, id: string, amount: BuyAmount): GameState {
  const v = venue(state, venueId);
  if (!v.unlocked) return state;
  const owned = v.businesses[id].owned;
  const n = resolveBuyAmount(cfg, state, venueId, id, amount);
  const cost = businessCost(cfg, state, venueId, id, n);
  if (cost > state.cash) return state;
  return bumpStat(withBusiness({ ...state, cash: state.cash - cost }, venueId, id, { owned: owned + n }), 'levelsBought', n);
}

export function hireManager(cfg: GameConfig, state: GameState, venueId: string, id: string): GameState {
  const s = venue(state, venueId).businesses[id];
  const cost = managerCost(cfg, venueId, id);
  if (s.managed || s.owned === 0 || state.cash < cost) return state;
  return bumpStat(withBusiness({ ...state, cash: state.cash - cost }, venueId, id, { managed: true, running: true }), 'hires');
}

export function buyUpgrade(cfg: GameConfig, state: GameState, upgradeId: string): GameState {
  const u = cfg.upgrades.find((x) => x.id === upgradeId);
  if (!u || state.upgrades.includes(upgradeId)) return state;
  if (u.premium) {
    if (state.gems < u.cost) return state;
    return { ...state, gems: state.gems - u.cost, upgrades: [...state.upgrades, upgradeId] };
  }
  if (state.cash < u.cost) return state;
  return { ...state, cash: state.cash - u.cost, upgrades: [...state.upgrades, upgradeId] };
}

/** Tapping an unmanaged business starts one production cycle. */
export function startBusiness(state: GameState, venueId: string, id: string): GameState {
  const s = venue(state, venueId).businesses[id];
  if (s.owned === 0 || s.running) return state;
  return withBusiness(state, venueId, id, { running: true });
}

export function tapValue(cfg: GameConfig, state: GameState, now: number): number {
  return (
    (cfg.economy.tapBase * globalMultiplier(cfg, state, now) + cfg.economy.tapPercentOfIncome * incomePerSecond(cfg, state, now)) *
    cardBonus(cfg, state, 'tapValue')
  );
}

export function tapHero(cfg: GameConfig, state: GameState, now: number, comboMult = 1): { state: GameState; earned: number } {
  const earned = tapValue(cfg, state, now) * comboMult;
  return { state: bumpStat(earn(state, earned), 'taps'), earned };
}

/** Combo multiplier after `taps` quick taps in a row: 1, then +1 per level, capped. */
export function comboMultiplier(cfg: GameConfig, taps: number): number {
  const { tapsPerLevel, maxMultiplier } = cfg.economy.combo;
  return Math.min(maxMultiplier, 1 + Math.floor(taps / tapsPerLevel));
}

/** What the flying bonus pays right now. */
export function bonusValue(cfg: GameConfig, state: GameState, now: number): number {
  const { incomeSeconds, minTaps } = cfg.economy.bonus;
  return Math.max(incomePerSecond(cfg, state, now) * incomeSeconds, tapValue(cfg, state, now) * minTaps) * cardBonus(cfg, state, 'bonusValue');
}

export function collectBonus(cfg: GameConfig, state: GameState, now: number): { state: GameState; earned: number } {
  const earned = bonusValue(cfg, state, now);
  return { state: bumpStat(earn(state, earned), 'bonusCaught'), earned };
}

// ---------------------------------------------------------------- sim: transport, sales, venues, rush

/** Value one transport worker carries per trip in a venue. */
export function transportCapacity(cfg: GameConfig, state: GameState, venueId: string): number {
  const chain = venue(state, venueId).chain;
  if (!isSim(cfg) || !chain) return 0;
  const t = cfg.sim.transport;
  return t.baseCapacity * Math.pow(t.capacityGrowth, chain.transportLevel - 1) * venueScale(cfg, venueId) * cardBonus(cfg, state, 'transportCapacity');
}

/** Value one guest takes and pays for in a venue, before global multipliers. */
export function salesSpend(cfg: GameConfig, state: GameState, venueId: string): number {
  const chain = venue(state, venueId).chain;
  if (!isSim(cfg) || !chain) return 0;
  const s = cfg.sim.sales;
  return s.baseSpend * Math.pow(s.spendGrowth, chain.salesLevel - 1) * venueScale(cfg, venueId) * cardBonus(cfg, state, 'salesSpend');
}

export function chainParams(cfg: GameConfig, state: GameState, venueId: string): ChainParams | null {
  const chain = venue(state, venueId).chain;
  if (!isSim(cfg) || !chain) return null;
  return {
    capacity: transportCapacity(cfg, state, venueId),
    tripSeconds: cfg.sim.transport.tripSeconds,
    transportAuto: chain.transportManaged,
    spend: salesSpend(cfg, state, venueId),
    serveSeconds: cfg.sim.sales.serveSeconds,
  };
}

export interface VenueRates {
  /** Value per second each stage can handle, before global multipliers. */
  production: number;
  transport: number;
  sales: number;
  /** The chain's steady-state throughput: the smallest of the three. */
  rate: number;
  bottleneck: Stage;
}

/** Steady-state rates of a venue. In classic mode there is only production. */
export function venueRates(cfg: GameConfig, state: GameState, venueId: string): VenueRates {
  const v = venue(state, venueId);
  const production = v.unlocked ? productionRate(cfg, state, venueId) : 0;
  const p = chainParams(cfg, state, venueId);
  if (!p || !v.chain) return { production, transport: Infinity, sales: Infinity, rate: production, bottleneck: 'production' };
  return chainThroughput(production, p, v.chain.workers.length, v.chain.seats.length);
}

/** Cost of `n` more transport levels in a venue. */
export function transportCost(cfg: GameConfig, state: GameState, venueId: string, n: number): number {
  const chain = venue(state, venueId).chain;
  if (!isSim(cfg) || !chain) return Infinity;
  const t = cfg.sim.transport;
  return geometricCost(t.baseCost, t.costGrowth, chain.transportLevel - 1, n, venueScale(cfg, venueId));
}

export function salesCost(cfg: GameConfig, state: GameState, venueId: string, n: number): number {
  const chain = venue(state, venueId).chain;
  if (!isSim(cfg) || !chain) return Infinity;
  const s = cfg.sim.sales;
  return geometricCost(s.baseCost, s.costGrowth, chain.salesLevel - 1, n, venueScale(cfg, venueId));
}

export function resolveStageAmount(cfg: GameConfig, state: GameState, venueId: string, stage: 'transport' | 'sales', amount: BuyAmount): number {
  if (amount !== 'max') return amount;
  const chain = venue(state, venueId).chain;
  if (!isSim(cfg) || !chain) return 1;
  const c = stage === 'transport' ? cfg.sim.transport : cfg.sim.sales;
  const level = stage === 'transport' ? chain.transportLevel : chain.salesLevel;
  return Math.max(1, geometricMaxAffordable(c.baseCost, c.costGrowth, level - 1, state.cash, venueScale(cfg, venueId)));
}

/** Buys transport levels: more capacity per trip, and more workers at the configured levels. */
export function buyTransport(cfg: GameConfig, state: GameState, venueId: string, amount: BuyAmount): GameState {
  const v = venue(state, venueId);
  if (!isSim(cfg) || !v.chain || !v.unlocked) return state;
  const n = resolveStageAmount(cfg, state, venueId, 'transport', amount);
  const cost = transportCost(cfg, state, venueId, n);
  if (cost > state.cash) return state;
  const level = v.chain.transportLevel + n;
  const sized = resizeChain(v.chain, countAtLevel(cfg.sim.transport.workersAt, level), v.chain.seats.length);
  return bumpStat(withChain({ ...state, cash: state.cash - cost }, venueId, { ...sized, transportLevel: level }), 'levelsBought', n);
}

/** Buys sales levels: guests spend more, and more seats open at the configured levels. */
export function buySales(cfg: GameConfig, state: GameState, venueId: string, amount: BuyAmount): GameState {
  const v = venue(state, venueId);
  if (!isSim(cfg) || !v.chain || !v.unlocked) return state;
  const n = resolveStageAmount(cfg, state, venueId, 'sales', amount);
  const cost = salesCost(cfg, state, venueId, n);
  if (cost > state.cash) return state;
  const level = v.chain.salesLevel + n;
  const sized = resizeChain(v.chain, v.chain.workers.length, countAtLevel(cfg.sim.sales.seatsAt, level));
  return bumpStat(withChain({ ...state, cash: state.cash - cost }, venueId, { ...sized, salesLevel: level }), 'levelsBought', n);
}

export function transportManagerCost(cfg: GameConfig, venueId: string): number {
  return isSim(cfg) ? cfg.sim.transport.managerCost * venueScale(cfg, venueId) : Infinity;
}

/** The transport automation hire: workers stop waiting for the bell. */
export function hireTransportManager(cfg: GameConfig, state: GameState, venueId: string): GameState {
  const v = venue(state, venueId);
  const cost = transportManagerCost(cfg, venueId);
  if (!v.chain || !v.unlocked || v.chain.transportManaged || state.cash < cost) return state;
  return bumpStat(withChain({ ...state, cash: state.cash - cost }, venueId, { transportManaged: true }), 'hires');
}

/** Sends every idle transport worker in a venue on one trip. */
export function ringVenueBell(state: GameState, venueId: string): GameState {
  const chain = venue(state, venueId).chain;
  if (!chain) return state;
  const rung = ringBell(chain);
  return rung === chain ? state : withChain(state, venueId, rung);
}

export function venueUnlockCost(cfg: GameConfig, venueId: string): number {
  return isSim(cfg) ? (cfg.sim.venues.find((v) => v.id === venueId)?.unlockCost ?? Infinity) : Infinity;
}

/** The next venue the player can open (venues open in order), or null when all are open. */
export function nextVenueToUnlock(cfg: GameConfig, state: GameState): string | null {
  return venueIds(cfg).find((id) => !state.venues[id].unlocked) ?? null;
}

export function unlockVenue(cfg: GameConfig, state: GameState, venueId: string): GameState {
  if (nextVenueToUnlock(cfg, state) !== venueId) return state;
  const cost = venueUnlockCost(cfg, venueId);
  if (state.cash < cost) return state;
  const venues = { ...state.venues, [venueId]: createVenueState(cfg, true) };
  const open = Object.values(venues).filter((v) => v.unlocked).length;
  return {
    ...state,
    cash: state.cash - cost,
    venues,
    activeVenue: venueId,
    stats: { ...state.stats, venuesEver: Math.max(state.stats.venuesEver, open) },
  };
}

export function setActiveVenue(state: GameState, venueId: string): GameState {
  if (!state.venues[venueId]?.unlocked || state.activeVenue === venueId) return state;
  return { ...state, activeVenue: venueId };
}

export function isRushActive(state: GameState, now: number): boolean {
  return state.rush.until > now;
}

/** How much faster the chain runs right now (1 outside a rush and in classic mode). */
export function rushMultiplier(cfg: GameConfig, state: GameState, now: number): number {
  return isSim(cfg) && isRushActive(state, now) ? cfg.sim.rush.multiplier : 1;
}

export function rushSeconds(cfg: GameConfig, state: GameState): number {
  return isSim(cfg) ? cfg.sim.rush.seconds * cardBonus(cfg, state, 'rushDuration') : 0;
}

export function canStartRush(cfg: GameConfig, state: GameState, now: number): boolean {
  return isSim(cfg) && now >= state.rush.readyAt && !isRushActive(state, now);
}

/** Starts the rush skill: the whole chain runs faster for a while, then the skill cools down. */
export function startRush(cfg: GameConfig, state: GameState, now: number): GameState {
  if (!isSim(cfg) || !canStartRush(cfg, state, now)) return state;
  const until = now + rushSeconds(cfg, state) * 1000;
  return bumpStat({ ...state, rush: { until, readyAt: until + cfg.sim.rush.cooldownSeconds * 1000 } }, 'rushes');
}

/** Makes the rush skill available again at once (the reward for a rewarded ad). */
export function resetRushCooldown(state: GameState, now: number): GameState {
  if (isRushActive(state, now)) return state;
  return { ...state, rush: { ...state.rush, readyAt: now } };
}

// ---------------------------------------------------------------- income

/** Steady cash per second of one venue: automated businesses, limited by the slowest chain stage in sim mode. */
export function venueIncomePerSecond(cfg: GameConfig, state: GameState, venueId: string, now: number): number {
  if (!venue(state, venueId).unlocked) return 0;
  return venueRates(cfg, state, venueId).rate * globalMultiplier(cfg, state, now);
}

/** Steady cash per second across all venues. The rush skill is not included (it is temporary). */
export function incomePerSecond(cfg: GameConfig, state: GameState, now: number): number {
  let total = 0;
  for (const id of venueIds(cfg)) total += venueIncomePerSecond(cfg, state, id, now);
  return total;
}

// ---------------------------------------------------------------- simulation

/** Advances every business timer in a venue. Returns the new map (or the same one) and the value finished. */
function tickBusinesses(
  cfg: GameConfig,
  state: GameState,
  venueId: string,
  dt: number,
  value: (id: string) => number,
  events: GameEvent[] | undefined,
): { businesses: Record<string, BusinessState>; produced: number } {
  const v = venue(state, venueId);
  let businesses = v.businesses;
  let produced = 0;
  for (const b of cfg.businesses) {
    const s = businesses[b.id];
    if (s.owned === 0 || !(s.running || s.managed)) continue;
    const cycle = cycleSeconds(cfg, state, venueId, b.id);
    const advanced = s.progress + dt / cycle;
    let next: BusinessState;
    let completions = 0;
    if (s.managed) {
      completions = Math.floor(advanced);
      next = { ...s, progress: advanced - completions };
    } else if (advanced >= 1) {
      completions = 1;
      next = { ...s, progress: 0, running: false };
    } else {
      next = { ...s, progress: advanced };
    }
    if (completions > 0) {
      const amount = completions * value(b.id);
      produced += amount;
      events?.push({ type: 'cycle', venue: venueId, business: b.id, amount });
    }
    if (businesses === v.businesses) businesses = { ...businesses };
    businesses[b.id] = next;
  }
  return { businesses, produced };
}

/**
 * Advances the simulation by dt seconds. Call at 10 Hz or so.
 * Pass an array as `events` to collect what happened (for sounds and effects).
 *
 * In sim mode only the venue on screen is simulated worker by worker; the
 * other open venues earn at their steady-state rate.
 */
export function tick(cfg: GameConfig, state: GameState, dt: number, now: number, events?: GameEvent[]): GameState {
  if (!(dt > 0)) return state;
  const mult = globalMultiplier(cfg, state, now);
  let earned = 0;
  let served = 0;
  let venues = state.venues;

  for (const venueId of venueIds(cfg)) {
    const v = state.venues[venueId];
    if (!v.unlocked) continue;

    if (!isSim(cfg) || !v.chain) {
      const r = tickBusinesses(cfg, state, venueId, dt, (id) => stationValue(cfg, state, venueId, id) * mult, events);
      earned += r.produced;
      if (r.businesses !== v.businesses) venues = { ...venues, [venueId]: { ...v, businesses: r.businesses } };
      continue;
    }

    const rush = rushMultiplier(cfg, state, now);
    if (venueId !== state.activeVenue) {
      // Off screen: steady-state earnings, no per-worker simulation.
      const rates = venueRates(cfg, state, venueId);
      earned += rates.rate * dt * rush * mult;
      const spend = salesSpend(cfg, state, venueId);
      if (spend > 0) served += (rates.rate * dt * rush) / spend;
      continue;
    }

    const sdt = dt * rush;
    const r = tickBusinesses(cfg, state, venueId, sdt, (id) => stationValue(cfg, state, venueId, id), events);
    const params = chainParams(cfg, state, venueId)!;
    const chainEvents: ChainEvent[] | undefined = events ? [] : undefined;
    const advanced = advanceChain(v.chain, params, sdt, r.produced, chainEvents);
    earned += advanced.paid * mult;
    if (chainEvents) {
      for (const e of chainEvents) {
        if (e.type === 'pay') {
          served += 1;
          events!.push({ ...e, venue: venueId, cash: e.amount * mult });
        } else events!.push({ ...e, venue: venueId });
      }
    } else if (advanced.paid > 0 && params.spend > 0) {
      served += advanced.paid / params.spend;
    }
    if (r.businesses !== v.businesses || advanced.chain !== v.chain) {
      venues = { ...venues, [venueId]: { ...v, businesses: r.businesses, chain: { ...v.chain, ...advanced.chain } } };
    }
  }

  const next = earn(venues === state.venues ? state : { ...state, venues }, earned);
  return { ...next, stats: { ...next.stats, playSeconds: next.stats.playSeconds + dt, served: next.stats.served + served } };
}

// ---------------------------------------------------------------- offline

export function computeOffline(cfg: GameConfig, state: GameState, now: number): { seconds: number; earnings: number } {
  const elapsed = Math.max(0, (now - state.lastSavedAt) / 1000);
  const seconds = Math.min(elapsed, cfg.economy.offline.maxHours * 3600);
  // Offline income ignores the ad boost so the boost can't be farmed by closing the app.
  const noBoost = { ...state, boostUntil: 0 };
  const earnings = incomePerSecond(cfg, noBoost, now) * seconds * cfg.economy.offline.efficiency * cardBonus(cfg, state, 'offlineEarnings');
  return { seconds, earnings };
}

export function grantCash(state: GameState, amount: number): GameState {
  return earn(state, amount);
}

// ---------------------------------------------------------------- prestige

export function totalPrestigePoints(cfg: GameConfig, lifetime: number): number {
  const p = cfg.economy.prestige;
  return Math.floor(p.scale * Math.sqrt(lifetime / p.threshold));
}

export function prestigePointsAvailable(cfg: GameConfig, state: GameState): number {
  return Math.max(0, totalPrestigePoints(cfg, state.lifetimeEarnings) - state.prestigePoints);
}

/**
 * Resets the run: cash, every venue, cash upgrades and the rush skill.
 * Keeps lifetime earnings, gems, premium upgrades, entitlements, cards,
 * chests, missions, deals, story and stats.
 */
export function prestige(cfg: GameConfig, state: GameState, now: number): GameState {
  const gained = prestigePointsAvailable(cfg, state);
  if (gained <= 0) return state;
  const fresh = createInitialState(cfg, state.stats.firstOpenAt);
  return {
    ...state,
    cash: fresh.cash,
    runEarnings: 0,
    prestigePoints: state.prestigePoints + gained,
    prestigeCount: state.prestigeCount + 1,
    venues: fresh.venues,
    activeVenue: fresh.activeVenue,
    // Premium (gem) upgrades are kept; cash upgrades reset.
    upgrades: state.upgrades.filter((id) => cfg.upgrades.find((u) => u.id === id)?.premium),
    rush: fresh.rush,
    lastSavedAt: now,
  };
}

// ---------------------------------------------------------------- boosts, gems, daily

export function activateBoost(cfg: GameConfig, state: GameState, now: number): GameState {
  const { minutesPerAd, maxMinutes } = cfg.economy.boost;
  const from = Math.max(now, state.boostUntil);
  const until = Math.min(from + minutesPerAd * 60_000, now + maxMinutes * 60_000);
  return bumpStat({ ...state, boostUntil: until }, 'adsWatched');
}

export function canBoost(cfg: GameConfig, state: GameState, now: number): boolean {
  return state.boostUntil < now + (cfg.economy.boost.maxMinutes - cfg.economy.boost.minutesPerAd) * 60_000;
}

/** Instantly earns `hours` of steady income. */
export function timeWarp(cfg: GameConfig, state: GameState, hours: number, now: number): GameState {
  return earn(state, incomePerSecond(cfg, state, now) * hours * 3600);
}

export function buyTimeWarpWithGems(cfg: GameConfig, state: GameState, now: number): GameState {
  const { gemCost, hours } = cfg.economy.timeWarp;
  if (state.gems < gemCost) return state;
  return timeWarp(cfg, { ...state, gems: state.gems - gemCost }, hours, now);
}

export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function canClaimDaily(state: GameState, now: number): boolean {
  return state.daily.lastClaimDay !== dayKey(now);
}

export function dailyReward(cfg: GameConfig, state: GameState, now: number): { gems: number; streak: number } {
  const yesterday = dayKey(now - 86_400_000);
  const streak = state.daily.lastClaimDay === yesterday ? state.daily.streak + 1 : 1;
  const table = cfg.economy.daily.gems;
  return { gems: table[Math.min(streak, table.length) - 1], streak };
}

export function claimDaily(cfg: GameConfig, state: GameState, now: number): GameState {
  if (!canClaimDaily(state, now)) return state;
  const { gems, streak } = dailyReward(cfg, state, now);
  return { ...state, gems: state.gems + gems, daily: { lastClaimDay: dayKey(now), streak } };
}

// ---------------------------------------------------------------- story

function beatTriggered(beat: StoryBeat, state: GameState): boolean {
  const t = beat.trigger;
  const venues = Object.values(state.venues);
  switch (t.type) {
    case 'start':
      return true;
    case 'lifetimeEarnings':
      return state.lifetimeEarnings >= t.amount;
    case 'owned':
      return venues.some((v) => (v.businesses[t.businessId]?.owned ?? 0) >= t.count);
    case 'prestige':
      return state.prestigeCount >= t.count;
    case 'venue':
      return state.venues[t.venueId]?.unlocked === true;
    case 'hired':
      return venues.some((v) => v.businesses[t.businessId]?.managed === true);
    case 'transportHired':
      return venues.some((v) => v.chain?.transportManaged === true);
  }
}

export function pendingStoryBeat(cfg: GameConfig, state: GameState): StoryBeat | null {
  return cfg.story.find((b) => !state.storySeen.includes(b.id) && beatTriggered(b, state)) ?? null;
}

export function markStorySeen(state: GameState, beat: StoryBeat): GameState {
  if (state.storySeen.includes(beat.id)) return state;
  return { ...state, storySeen: [...state.storySeen, beat.id], gems: state.gems + beat.rewardGems };
}
