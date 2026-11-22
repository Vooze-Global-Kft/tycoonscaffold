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
  fitChain,
  resizeChain,
  ringBell,
  type ChainEvent,
  type ChainParams,
  type Stage,
} from './chain';
import { engineFor } from './mode';
import { rngMix, seedFrom } from './rng';
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
  const base: GameState = {
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
    chests: { owned: {}, freeAnchor: 0, freeClaimed: 0, adDay: null, adCount: 0, adNextAt: 0, sinceEpic: 0, sinceLegendary: 0, seed: rngMix(seedFrom(now), 0x43484553), opened: {} },
    missions: { slots: [], completed: {}, total: 0, day: null, doneToday: 0 },
    deals: {},
    dailyShop: { day: null, offerIds: [], bought: [] },
    rng: seedFrom(now),
    stats: { taps: 0, adsWatched: 0, playSeconds: 0, firstOpenAt: now, served: 0, levelsBought: 0, hires: 0, chestsOpened: 0, bonusCaught: 0, rushes: 0, sessions: 0, venuesEver: 1, clockHigh: now },
    lastSavedAt: now,
  };
  // A mode with its own rules (src/engine/mode.ts) adds its fields; sim and classic return `base` as before.
  const mode = engineFor(cfg);
  return mode ? mode.create(cfg, base) : base;
}

// ---------------------------------------------------------------- loading saves

/** Cash and earnings never go above this (the largest finite double), so they can never become Infinity or NaN. */
export const MAX_CASH = Number.MAX_VALUE;

type Plain = Record<string, unknown>;
const isPlain = (x: unknown): x is Plain => typeof x === 'object' && x !== null && !Array.isArray(x);
/** A finite number >= min, or the fallback. */
const finiteOr = (x: unknown, fallback: number, min = 0): number => (typeof x === 'number' && Number.isFinite(x) && x >= min ? x : fallback);
/** An integer >= min (rounded down), or the fallback. */
const intOr = (x: unknown, fallback: number, min = 0): number => (typeof x === 'number' && Number.isFinite(x) && x >= min ? Math.floor(x) : fallback);
const boolOr = (x: unknown, fallback: boolean): boolean => (typeof x === 'boolean' ? x : fallback);
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);

/**
 * Takes `saved` where it has the same shape as `fresh`, key by key: numbers must be finite and
 * not negative, strings, booleans and arrays must be of that type, an empty object in `fresh`
 * (a record) accepts any object, and nested objects merge the same way. Anything else keeps the
 * fresh value. Used for the parts of the state this file does not know in detail (meta systems),
 * so a field added there later is still loaded, and still protected from wrong types.
 */
function mergeShape<T>(fresh: T, saved: unknown): T {
  if (!isPlain(fresh)) return fresh;
  if (!isPlain(saved)) return fresh;
  const out: Plain = { ...fresh };
  for (const [k, f] of Object.entries(fresh)) {
    const v = saved[k];
    if (v === undefined) continue;
    if (typeof f === 'number') out[k] = finiteOr(v, f);
    else if (typeof f === 'string') out[k] = typeof v === 'string' ? v : f;
    else if (typeof f === 'boolean') out[k] = boolOr(v, f);
    else if (f === null) out[k] = v === null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v)) ? v : f;
    else if (Array.isArray(f)) out[k] = Array.isArray(v) ? v : f;
    else if (isPlain(f)) out[k] = Object.keys(f).length === 0 ? (isPlain(v) ? { ...v } : f) : mergeShape(f, v);
  }
  return out as T;
}

function loadBusiness(fresh: BusinessState, saved: unknown): BusinessState {
  if (!isPlain(saved)) return fresh;
  const progress = finiteOr(saved.progress, 0);
  return {
    owned: intOr(saved.owned, fresh.owned),
    progress: progress < 1 ? progress : 0,
    running: boolOr(saved.running, fresh.running),
    managed: boolOr(saved.managed, fresh.managed),
  };
}

function loadVenue(cfg: GameConfig, fresh: VenueState, saved: unknown): VenueState {
  const s = isPlain(saved) ? saved : {};
  const savedBiz = isPlain(s.businesses) ? s.businesses : {};
  const businesses: Record<string, BusinessState> = {};
  for (const b of cfg.businesses) businesses[b.id] = loadBusiness(fresh.businesses[b.id], savedBiz[b.id]);
  let chain = fresh.chain;
  if (chain && isSim(cfg) && isPlain(s.chain)) {
    const c = s.chain;
    const transportLevel = intOr(c.transportLevel, chain.transportLevel, 1);
    const salesLevel = intOr(c.salesLevel, chain.salesLevel, 1);
    const fitted = fitChain(c as unknown as VenueChain, countAtLevel(cfg.sim.transport.workersAt, transportLevel), countAtLevel(cfg.sim.sales.seatsAt, salesLevel));
    chain = {
      buffer: fitted.buffer,
      served: fitted.served,
      workers: fitted.workers,
      seats: fitted.seats,
      guests: fitted.guests,
      transportLevel,
      salesLevel,
      transportManaged: boolOr(c.transportManaged, false),
    };
  }
  return { unlocked: boolOr(s.unlocked, fresh.unlocked), businesses, chain };
}

/**
 * Brings a saved state in line with the current config and state version:
 * new businesses, venues, workers and seats appear; removed ones are dropped;
 * unknown ids are filtered. Purchases (gems, entitlements) are never lost.
 * Lets you ship content and economy updates without wiping saves.
 *
 * The save is untrusted (an old build, a corrupted file, a player with a text
 * editor): every field is type-checked, numbers must be finite and not
 * negative, and anything unusable falls back to the fresh value, so this never
 * throws and the result always runs. `now` is only used when the save does not
 * say when the game was first opened (the engine never reads the clock).
 */
export function reconcileState(cfg: GameConfig, savedRaw: unknown, now?: number): GameState {
  const saved: Plain = isPlain(savedRaw) ? savedRaw : {};
  const savedStats = isPlain(saved.stats) ? saved.stats : {};
  const clock = finiteOr(now, finiteOr(saved.lastSavedAt, 0));
  const fresh = createInitialState(cfg, finiteOr(savedStats.firstOpenAt, clock));
  const ids = venueIds(cfg);

  const entitlementsRaw = isPlain(saved.entitlements) ? saved.entitlements : {};
  const multipliers: Record<string, number> = {};
  if (isPlain(entitlementsRaw.multipliers)) {
    for (const [k, v] of Object.entries(entitlementsRaw.multipliers)) if (typeof v === 'number' && v > 0 && Number.isFinite(v)) multipliers[k] = v;
  }
  const dailyRaw = isPlain(saved.daily) ? saved.daily : {};
  // What the player paid for or earned for good: kept even when the run itself cannot be migrated.
  const paid = {
    gems: intOr(saved.gems, 0),
    entitlements: {
      ...fresh.entitlements,
      noAds: boolOr(entitlementsRaw.noAds, false),
      skipRewarded: boolOr(entitlementsRaw.skipRewarded, false),
      products: [...new Set(strings(entitlementsRaw.products))],
      multipliers,
    },
    daily: {
      lastClaimDay: typeof dailyRaw.lastClaimDay === 'string' ? dailyRaw.lastClaimDay : null,
      streak: intOr(dailyRaw.streak, 0),
    },
    stats: mergeShape(fresh.stats, savedStats),
  };

  // Version 1 had a single flat list of businesses. A save without a version is v1 only if it looks like one;
  // a save from a NEWER build (version 3+) is read as version 2 rather than thrown away.
  const v1 = saved.version === 1 || (typeof saved.version !== 'number' && isPlain(saved.businesses) && !isPlain(saved.venues));
  let venues: Record<string, VenueState>;
  if (v1) {
    // A classic save cannot be mapped onto a production chain: start the run again, keep what was paid for.
    if (isSim(cfg)) return { ...fresh, ...paid };
    venues = { [MAIN_VENUE]: loadVenue(cfg, fresh.venues[MAIN_VENUE], { unlocked: true, businesses: saved.businesses }) };
  } else {
    const savedVenues = isPlain(saved.venues) ? saved.venues : {};
    venues = {};
    for (const id of ids) venues[id] = loadVenue(cfg, fresh.venues[id], savedVenues[id]);
  }
  // The first venue is always open (a save that says otherwise would leave nothing to play).
  if (!venues[ids[0]].unlocked) venues[ids[0]] = { ...venues[ids[0]], unlocked: true };

  const upgradeIds = new Set(cfg.upgrades.map((u) => u.id));
  const cardIds = new Set(cfg.meta.cards.map((c) => c.id));
  const cards: GameState['cards'] = {};
  if (isPlain(saved.cards)) {
    for (const [id, c] of Object.entries(saved.cards)) {
      if (cardIds.has(id) && isPlain(c)) cards[id] = { level: intOr(c.level, 0), copies: intOr(c.copies, 0) };
    }
  }
  const rushRaw = isPlain(saved.rush) ? saved.rush : {};
  const chests = mergeShape(fresh.chests, saved.chests);
  const chestIds = new Set(cfg.meta.chests.map((c) => c.id));
  const owned: Record<string, number> = {};
  for (const [id, n] of Object.entries(chests.owned)) if (chestIds.has(id) && intOr(n, 0) > 0) owned[id] = intOr(n, 0);
  const opened: Record<string, number> = {};
  for (const [id, n] of Object.entries(chests.opened)) if (intOr(n, 0) > 0) opened[id] = intOr(n, 0);
  const chestSeed = typeof chests.seed === 'number' && Number.isInteger(chests.seed) ? chests.seed >>> 0 : fresh.chests.seed;
  const deals: GameState['deals'] = {};
  if (isPlain(saved.deals)) {
    for (const [id, d] of Object.entries(saved.deals)) {
      const deal = cfg.meta.deals.find((x) => x.id === id);
      if (!deal || !isPlain(d)) continue;
      // A broken start time counts as long ago (an offer is never restarted by a bad save).
      const startedAt = finiteOr(d.startedAt, 0);
      const endsAt =
        d.endsAt === null ? (deal.durationHours === undefined ? null : startedAt + deal.durationHours * 3_600_000)
        : typeof d.endsAt === 'number' && Number.isFinite(d.endsAt) ? d.endsAt
        : deal.durationHours !== undefined ? startedAt + deal.durationHours * 3_600_000 : null;
      deals[id] = { startedAt, endsAt, purchases: Math.min(intOr(d.purchases, 0), deal.maxPurchases), seen: boolOr(d.seen, false) };
    }
  }

  // Fields this file does not know about (added by the meta systems) still load, shape-checked.
  const known = new Set(['version', 'cash', 'gems', 'runEarnings', 'lifetimeEarnings', 'prestigePoints', 'prestigeCount', 'venues', 'activeVenue', 'upgrades', 'boostUntil', 'rush', 'storySeen', 'entitlements', 'daily', 'cards', 'chests', 'deals', 'rng', 'stats', 'lastSavedAt']);
  const rest: Plain = {};
  for (const [k, f] of Object.entries(fresh)) if (!known.has(k)) rest[k] = mergeShape({ [k]: f }, { [k]: saved[k] })[k];

  // Meta records from the save, checked entry by entry (mergeShape only checked their outer shape).
  const restMissions = (rest.missions ?? fresh.missions) as GameState['missions'];
  const templateIds = new Set(cfg.meta.missions.templates.map((t) => t.id));
  const missionSlots: GameState['missions']['slots'] = [];
  for (const sl of Array.isArray(restMissions.slots) ? (restMissions.slots as unknown[]) : []) {
    if (!isPlain(sl) || typeof sl.templateId !== 'string' || !templateIds.has(sl.templateId)) continue;
    if (missionSlots.some((x) => x.templateId === sl.templateId)) continue;
    const target = typeof sl.target === 'number' && Number.isFinite(sl.target) && sl.target >= 1 && sl.target <= MAX_CASH ? sl.target : null;
    if (target === null) continue;
    missionSlots.push({ templateId: sl.templateId, target, start: finiteOr(sl.start, 0) });
  }
  const completed: Record<string, number> = {};
  for (const [id, n] of Object.entries(isPlain(restMissions.completed) ? restMissions.completed : {})) if (typeof n === 'number' && n >= 0 && Number.isFinite(n)) completed[id] = Math.floor(n);
  const missions: GameState['missions'] = {
    slots: missionSlots,
    completed,
    total: intOr(restMissions.total, 0),
    day: typeof restMissions.day === 'string' ? restMissions.day : null,
    doneToday: intOr(restMissions.doneToday, 0),
  };
  const restShop = (rest.dailyShop ?? fresh.dailyShop) as GameState['dailyShop'];
  const offerIds = new Set(cfg.meta.dailyShop.offers.map((o) => o.id));
  const shopIds = [...new Set(strings(restShop.offerIds).filter((id) => offerIds.has(id)))];
  const dailyShop: GameState['dailyShop'] = {
    day: typeof restShop.day === 'string' ? restShop.day : null,
    offerIds: shopIds,
    bought: [...new Set(strings(restShop.bought).filter((id) => shopIds.includes(id)))],
  };
  const stats = { ...paid.stats, venuesEver: Math.min(Math.max(1, paid.stats.venuesEver), ids.length) };

  const activeVenue = typeof saved.activeVenue === 'string' && venues[saved.activeVenue]?.unlocked ? saved.activeVenue : ids[0];
  const reconciled: GameState = {
    ...fresh,
    ...(rest as Partial<GameState>),
    ...paid,
    version: 2,
    cash: Math.min(finiteOr(saved.cash, fresh.cash), MAX_CASH),
    runEarnings: finiteOr(saved.runEarnings, 0),
    lifetimeEarnings: finiteOr(saved.lifetimeEarnings, 0),
    prestigePoints: finiteOr(saved.prestigePoints, 0),
    prestigeCount: intOr(saved.prestigeCount, 0),
    venues,
    activeVenue,
    upgrades: [...new Set(strings(saved.upgrades).filter((id) => upgradeIds.has(id)))],
    boostUntil: finiteOr(saved.boostUntil, 0),
    rush: { until: finiteOr(rushRaw.until, 0), readyAt: finiteOr(rushRaw.readyAt, 0) },
    storySeen: [...new Set(strings(saved.storySeen))],
    cards,
    chests: { ...chests, owned, opened, seed: chestSeed },
    deals,
    missions,
    dailyShop,
    stats,
    rng: typeof saved.rng === 'number' && Number.isInteger(saved.rng) ? saved.rng >>> 0 : fresh.rng,
    lastSavedAt: finiteOr(saved.lastSavedAt, fresh.lastSavedAt),
  };
  // A mode with its own rules repairs its own fields on top (src/engine/mode.ts).
  const mode = engineFor(cfg);
  return mode ? mode.reconcile(cfg, reconciled, savedRaw) : reconciled;
}

/**
 * Repairs timers after the device clock moved. A clock set backwards would otherwise leave the
 * boost, the rush and its cooldown running for as long as the clock moved (a rush lasting a day,
 * or no rush for a day), and a save "from the future" would stop offline earnings until that
 * moment. Every timer is capped at the longest it can legally be from `now`. Call on load and
 * whenever the app returns to the foreground. Returns the same object when nothing was wrong.
 */
export function clampClock(cfg: GameConfig, state: GameState, now: number): GameState {
  if (!Number.isFinite(now)) return state;
  const boostCap = now + cfg.economy.boost.maxMinutes * 60_000;
  const boostUntil = Math.min(state.boostUntil, boostCap);
  const rushCap = now + rushSeconds(cfg, state) * 1000;
  const until = Math.min(state.rush.until, rushCap);
  const cooldown = isSim(cfg) ? cfg.sim.rush.cooldownSeconds * 1000 : 0;
  const readyAt = Math.min(state.rush.readyAt, Math.max(until, now) + cooldown);
  const lastSavedAt = Math.min(state.lastSavedAt, now);
  // Remember the latest time seen, so offline time already paid is not paid again (computeOffline).
  const clockHigh = Math.max(state.stats.clockHigh ?? 0, state.lastSavedAt);
  if (boostUntil === state.boostUntil && until === state.rush.until && readyAt === state.rush.readyAt && lastSavedAt === state.lastSavedAt && clockHigh === state.stats.clockHigh) return state;
  return { ...state, boostUntil, rush: { until, readyAt }, lastSavedAt, stats: clockHigh === state.stats.clockHigh ? state.stats : { ...state.stats, clockHigh } };
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
  if (!(n > 0)) return 0;
  const first = baseCost * scale * Math.pow(growth, owned);
  if (growth === 1) return first * n;
  // first x (sum of the series): dividing before multiplying keeps it finite as long as the answer is.
  return first * ((Math.pow(growth, n) - 1) / (growth - 1));
}

/** True when `cash` covers `cost`. False for a NaN, infinite or negative cost, and for NaN cash. */
export function canAfford(cash: number, cost: number): boolean {
  return cost >= 0 && cost < Infinity && cash >= cost;
}

export function geometricMaxAffordable(baseCost: number, growth: number, owned: number, cash: number, scale = 1): number {
  const budget = Math.min(cash, MAX_CASH);
  const first = baseCost * scale * Math.pow(growth, owned);
  if (!canAfford(budget, first)) return 0;
  let n = growth === 1 ? Math.floor(budget / first) : Math.floor(Math.log((budget * (growth - 1)) / first + 1) / Math.log(growth));
  if (!Number.isFinite(n) || n < 1) n = 1;
  // Floating point can land one either side; settle on the largest affordable n.
  while (n > 1 && !canAfford(budget, geometricCost(baseCost, growth, owned, n, scale))) n--;
  while (canAfford(budget, geometricCost(baseCost, growth, owned, n + 1, scale))) n++;
  return n;
}

/** A whole number of units to buy (fractions round down), or 0 for anything that is not at least 1. */
function wholeAmount(n: number): number {
  return n >= 1 && n < Infinity ? Math.floor(n) : 0;
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
  return amount === 'max' ? Math.max(1, maxAffordable(b, owned, state.cash, venueScale(cfg, venueId))) : wholeAmount(amount);
}

export function businessCost(cfg: GameConfig, state: GameState, venueId: string, id: string, n: number): number {
  return costFor(bizCfg(cfg, id), venue(state, venueId).businesses[id].owned, n, venueScale(cfg, venueId));
}

export function managerCost(cfg: GameConfig, venueId: string, id: string): number {
  return bizCfg(cfg, id).managerCost * venueScale(cfg, venueId);
}

// ---------------------------------------------------------------- actions

/** Adds earnings. Saturates at MAX_CASH: an Infinity here would turn into NaN at the first purchase (Infinity - Infinity). */
function earn(state: GameState, amount: number): GameState {
  if (!(amount > 0)) return state;
  const add = Math.min(amount, MAX_CASH);
  return {
    ...state,
    cash: Math.min(state.cash + add, MAX_CASH),
    runEarnings: Math.min(state.runEarnings + add, MAX_CASH),
    lifetimeEarnings: Math.min(state.lifetimeEarnings + add, MAX_CASH),
  };
}

function bumpStat(state: GameState, key: keyof GameState['stats'], by = 1): GameState {
  return { ...state, stats: { ...state.stats, [key]: (state.stats[key] ?? 0) + by } };
}

export function buyBusiness(cfg: GameConfig, state: GameState, venueId: string, id: string, amount: BuyAmount): GameState {
  const v = venue(state, venueId);
  if (!v.unlocked) return state;
  const owned = v.businesses[id].owned;
  const n = resolveBuyAmount(cfg, state, venueId, id, amount);
  if (n < 1) return state;
  const cost = businessCost(cfg, state, venueId, id, n);
  if (!canAfford(state.cash, cost)) return state;
  return bumpStat(withBusiness({ ...state, cash: state.cash - cost }, venueId, id, { owned: owned + n }), 'levelsBought', n);
}

export function hireManager(cfg: GameConfig, state: GameState, venueId: string, id: string): GameState {
  const v = venue(state, venueId);
  const s = v.businesses[id];
  const cost = managerCost(cfg, venueId, id);
  if (!v.unlocked || s.managed || s.owned === 0 || !canAfford(state.cash, cost)) return state;
  return bumpStat(withBusiness({ ...state, cash: state.cash - cost }, venueId, id, { managed: true, running: true }), 'hires');
}

export function buyUpgrade(cfg: GameConfig, state: GameState, upgradeId: string): GameState {
  const u = cfg.upgrades.find((x) => x.id === upgradeId);
  if (!u || state.upgrades.includes(upgradeId)) return state;
  if (u.premium) {
    if (!canAfford(state.gems, u.cost)) return state;
    return { ...state, gems: state.gems - u.cost, upgrades: [...state.upgrades, upgradeId] };
  }
  if (!canAfford(state.cash, u.cost)) return state;
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

/**
 * Rates depend only on the venue object, the upgrades and the cards (global multipliers are applied
 * on top), all of which are replaced, never mutated, when they change. Off-screen venues keep the
 * same object for minutes, so their rates are remembered per object: the idle tick and every
 * income display stop recomputing six stations x cards x upgrades x milestones per venue per frame.
 * The cache is invisible (same inputs, same result) and holds no reference that outlives the state.
 */
const ratesCache = new WeakMap<VenueState, { cfg: GameConfig; upgrades: string[]; cards: GameState['cards']; rates: VenueRates }>();

/** Steady-state rates of a venue. In classic mode there is only production. */
export function venueRates(cfg: GameConfig, state: GameState, venueId: string): VenueRates {
  const v = venue(state, venueId);
  const hit = ratesCache.get(v);
  if (hit && hit.cfg === cfg && hit.upgrades === state.upgrades && hit.cards === state.cards) return hit.rates;
  const rates = computeVenueRates(cfg, state, venueId, v);
  Object.freeze(rates);
  ratesCache.set(v, { cfg, upgrades: state.upgrades, cards: state.cards, rates });
  return rates;
}

function computeVenueRates(cfg: GameConfig, state: GameState, venueId: string, v: VenueState): VenueRates {
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
  if (amount !== 'max') return wholeAmount(amount);
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
  if (n < 1) return state;
  const cost = transportCost(cfg, state, venueId, n);
  if (!canAfford(state.cash, cost)) return state;
  const level = v.chain.transportLevel + n;
  const sized = resizeChain(v.chain, countAtLevel(cfg.sim.transport.workersAt, level), v.chain.seats.length);
  return bumpStat(withChain({ ...state, cash: state.cash - cost }, venueId, { ...sized, transportLevel: level }), 'levelsBought', n);
}

/** Buys sales levels: guests spend more, and more seats open at the configured levels. */
export function buySales(cfg: GameConfig, state: GameState, venueId: string, amount: BuyAmount): GameState {
  const v = venue(state, venueId);
  if (!isSim(cfg) || !v.chain || !v.unlocked) return state;
  const n = resolveStageAmount(cfg, state, venueId, 'sales', amount);
  if (n < 1) return state;
  const cost = salesCost(cfg, state, venueId, n);
  if (!canAfford(state.cash, cost)) return state;
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
  if (!v.chain || !v.unlocked || v.chain.transportManaged || !canAfford(state.cash, cost)) return state;
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
  if (!canAfford(state.cash, cost)) return state;
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

/**
 * Seconds of simulation a tick of `dt` real seconds ending at `now` is worth: the part of the tick
 * inside a rush runs `multiplier` times faster. (Testing the rush at `now` alone gave a tick that
 * ends just after the rush no rush at all, and a long tick that ends inside one rush all through.)
 */
export function simSeconds(cfg: GameConfig, state: GameState, dt: number, now: number): number {
  // `until` is 0 until the first rush (and again after a prestige): no window then, whatever `now` is.
  if (!isSim(cfg) || !(dt > 0) || !(state.rush.until > 0)) return dt;
  const start = now - dt * 1000;
  const begin = Math.max(start, state.rush.until - rushSeconds(cfg, state) * 1000);
  const end = Math.min(now, state.rush.until);
  const inside = end > begin ? (end - begin) / 1000 : 0;
  return dt + inside * (cfg.sim.rush.multiplier - 1);
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
  const mode = engineFor(cfg);
  if (mode) return mode.income(cfg, state, now);
  let total = 0;
  for (const id of venueIds(cfg)) total += venueIncomePerSecond(cfg, state, id, now);
  return total;
}

/**
 * Income per second while the game is played: what "seconds of income" rewards, mission targets
 * and the Time Warp are priced in. The same as incomePerSecond for sim and classic; a mode with
 * its own rules may earn more while played than on its own (haul: before the dock autopilot).
 */
export function activeIncomePerSecond(cfg: GameConfig, state: GameState, now: number): number {
  const mode = engineFor(cfg);
  return mode ? mode.activeIncome(cfg, state, now) : incomePerSecond(cfg, state, now);
}

/**
 * Income per second "seconds of income" rewards are priced with (mission targets, cash rewards):
 * activeIncomePerSecond, or, when that is 0 in a mode with its own rules, the mode's floor
 * (src/engine/mode.ts `pricingFloor`; haul: the run's rate once its idle drones are placed). Sim and
 * classic install no engine: exactly activeIncomePerSecond.
 */
export function pricingIncomePerSecond(cfg: GameConfig, state: GameState, now: number): number {
  const active = activeIncomePerSecond(cfg, state, now);
  if (active > 0) return active;
  const floor = engineFor(cfg)?.pricingFloor?.(cfg, state, now) ?? 0;
  return Number.isFinite(floor) && floor > 0 ? floor : active;
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
  // A mode with its own rules runs its own tick (its events are its own, not GameEvent).
  const mode = engineFor(cfg);
  if (mode) return mode.tick(cfg, state, dt, now, events as unknown[] | undefined);
  const mult = globalMultiplier(cfg, state, now);
  let earned = 0;
  let served = 0;
  let venues = state.venues;
  /** Simulated seconds (dt sped up by a rush); computed once, for sim venues only. */
  let sdt: number | undefined;

  for (const venueId of venueIds(cfg)) {
    const v = state.venues[venueId];
    if (!v.unlocked) continue;

    if (!isSim(cfg) || !v.chain) {
      const r = tickBusinesses(cfg, state, venueId, dt, (id) => stationValue(cfg, state, venueId, id) * mult, events);
      earned += r.produced;
      if (r.businesses !== v.businesses) venues = { ...venues, [venueId]: { ...v, businesses: r.businesses } };
      continue;
    }

    sdt ??= simSeconds(cfg, state, dt, now);
    if (venueId !== state.activeVenue) {
      // Off screen: steady-state earnings, no per-worker simulation. Guests are estimated as portions.
      const rates = venueRates(cfg, state, venueId);
      earned += rates.rate * sdt * mult;
      const spend = salesSpend(cfg, state, venueId);
      if (spend > 0) served += (rates.rate * sdt) / spend;
      continue;
    }

    const r = tickBusinesses(cfg, state, venueId, sdt, (id) => stationValue(cfg, state, venueId, id), events);
    const params = chainParams(cfg, state, venueId)!;
    const chainEvents: ChainEvent[] | undefined = events ? [] : undefined;
    const advanced = advanceChain(v.chain, params, sdt, r.produced, chainEvents);
    earned += advanced.paid * mult;
    // Counted the same way whether or not the caller collects events (it used to differ, so the app and the
    // balance bot disagreed about missions).
    served += advanced.guestsPaid;
    if (chainEvents) {
      for (const e of chainEvents) {
        if (e.type === 'pay') events!.push({ ...e, venue: venueId, cash: e.amount * mult });
        else events!.push({ ...e, venue: venueId });
      }
    }
    if (r.businesses !== v.businesses || advanced.chain !== v.chain) {
      venues = { ...venues, [venueId]: { ...v, businesses: r.businesses, chain: { ...v.chain, ...advanced.chain } } };
    }
  }

  const next = earn(venues === state.venues ? state : { ...state, venues }, earned);
  return { ...next, stats: { ...next.stats, playSeconds: next.stats.playSeconds + dt, served: next.stats.served + served } };
}

// ---------------------------------------------------------------- offline

/**
 * Time away. `earnings` is not added yet (the store grants it, doubled with an ad). A mode with its
 * own rules also returns the advanced `game` (the store keeps it) and its own `report`.
 */
export function computeOffline(cfg: GameConfig, state: GameState, now: number): { seconds: number; earnings: number; game?: GameState; report?: unknown } {
  const mode = engineFor(cfg);
  if (mode) return mode.offline(cfg, state, now);
  // Counted from the last save, or from the latest time the game ever ran at if that is later
  // (the clock was moved back: hours already paid are not paid again).
  const elapsed = (now - Math.max(state.lastSavedAt, state.stats.clockHigh ?? 0)) / 1000;
  // A save from the future (clock moved back) or a broken timestamp earns nothing, rather than NaN.
  if (!(elapsed > 0)) return { seconds: 0, earnings: 0 };
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
  // A hair of tolerance so that lifetimeForPrestigePoints(k) really gives k points despite rounding.
  return Math.floor(p.scale * Math.pow(lifetime / p.threshold, p.exponent) + 1e-9);
}

/** Lifetime earnings at which `points` points in total exist (the inverse of totalPrestigePoints). */
export function lifetimeForPrestigePoints(cfg: GameConfig, points: number): number {
  const p = cfg.economy.prestige;
  return p.threshold * Math.pow(points / p.scale, 1 / p.exponent);
}

export function prestigePointsAvailable(cfg: GameConfig, state: GameState): number {
  return Math.max(0, totalPrestigePoints(cfg, state.lifetimeEarnings) - state.prestigePoints);
}

/**
 * Resets the run: cash, every venue, cash upgrades and the rush skill.
 * Keeps lifetime earnings, gems, premium upgrades, entitlements, cards,
 * chests, missions, deals, story and stats.
 */
export function prestige(cfg: GameConfig, state: GameState, now: number, choice?: unknown): GameState {
  const mode = engineFor(cfg);
  if (mode) return mode.prestige(cfg, state, now, choice);
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
  return earn(state, activeIncomePerSecond(cfg, state, now) * hours * 3600);
}

export function buyTimeWarpWithGems(cfg: GameConfig, state: GameState, now: number): GameState {
  const { gemCost, hours } = cfg.economy.timeWarp;
  if (!canAfford(state.gems, gemCost)) return state;
  // A warp worth nothing is refused, not charged (rules-7: a haul run before any drone is on a route,
  // or a Jump waiting for its condition). Sim and classic always earn once they have a station.
  if (!(activeIncomePerSecond(cfg, state, now) * hours * 3600 > 0)) return state;
  return timeWarp(cfg, { ...state, gems: state.gems - gemCost }, hours, now);
}

export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * True when today's gift can be claimed: once per local day, and only on a day LATER than the last
 * claim (day keys sort as text), so moving the clock back and forth never pays twice.
 */
export function canClaimDaily(state: GameState, now: number): boolean {
  return state.daily.lastClaimDay === null || dayKey(now) > state.daily.lastClaimDay;
}

/**
 * The gift the next claim pays. `streak` is the number of days claimed including this one (it is
 * never reset by a missed day: research meta.md section 5, "counted in days played"). The table
 * `economy.daily.gems` cycles: claim N pays entry (N - 1) mod length, so a 7-entry table is a
 * weekly calendar. `day` is that entry, 1-based (show "Day 3 of 7"). Before a claim is possible it
 * describes the next one.
 */
export function dailyReward(cfg: GameConfig, state: GameState, now: number): { gems: number; streak: number; day: number } {
  void now;
  const streak = state.daily.streak + 1;
  const table = cfg.economy.daily.gems;
  if (table.length === 0) return { gems: 0, streak, day: 1 };
  const i = (streak - 1) % table.length;
  return { gems: table[i], streak, day: i + 1 };
}

/** One day of the daily-gift row. */
export interface DailyDay {
  /** The claim number (1 = the first gift ever). */
  claim: number;
  /** Its position in the table, 1-based ("Day 3"). */
  day: number;
  gems: number;
  /** Already claimed. */
  claimed: boolean;
  /** The one to claim today (only when it can be claimed now). */
  today: boolean;
}

/**
 * The row of gifts to draw: the current cycle of `economy.daily.gems` (one entry per table entry),
 * with what is claimed, what is today's, and what comes next. Exactly what claimDaily pays, so the
 * row never shows a different number from the one granted.
 */
export function dailyCalendar(cfg: GameConfig, state: GameState, now: number): DailyDay[] {
  const table = cfg.economy.daily.gems;
  const len = table.length;
  const can = canClaimDaily(state, now);
  // The cycle that holds the next claim; once today's gift is claimed, the one that holds it.
  const ref = can ? state.daily.streak + 1 : Math.max(1, state.daily.streak);
  const start = Math.floor((ref - 1) / len) * len + 1;
  return table.map((gems, i) => {
    const claim = start + i;
    return { claim, day: i + 1, gems, claimed: claim <= state.daily.streak, today: can && claim === state.daily.streak + 1 };
  });
}

/** Whether the game has a daily gift at all (Decision 53: a game whose `economy.daily.gems` is empty has none). */
export function dailyOffered(cfg: GameConfig): boolean {
  return cfg.economy.daily.gems.length > 0;
}

export function claimDaily(cfg: GameConfig, state: GameState, now: number): GameState {
  if (!dailyOffered(cfg) || !canClaimDaily(state, now)) return state;
  const { gems, streak } = dailyReward(cfg, state, now);
  return { ...state, gems: state.gems + gems, daily: { lastClaimDay: dayKey(now), streak } };
}

// ---------------------------------------------------------------- story

function beatTriggered(cfg: GameConfig, beat: StoryBeat, state: GameState): boolean {
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
    default:
      // Triggers of a mode with its own rules (src/engine/mode.ts); false for any other mode.
      return engineFor(cfg)?.storyTrigger?.(cfg, state, t) ?? false;
  }
}

export function pendingStoryBeat(cfg: GameConfig, state: GameState): StoryBeat | null {
  return cfg.story.find((b) => !state.storySeen.includes(b.id) && beatTriggered(cfg, b, state)) ?? null;
}

export function markStorySeen(state: GameState, beat: StoryBeat): GameState {
  if (state.storySeen.includes(beat.id)) return state;
  return { ...state, storySeen: [...state.storySeen, beat.id], gems: state.gems + beat.rewardGems };
}
