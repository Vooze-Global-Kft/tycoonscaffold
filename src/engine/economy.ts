/**
 * The idle economy. Pure functions only: (config, state, ...) -> new state.
 * No React, no native modules, so it is unit-tested in Node and identical in
 * every game built from this repo.
 */
import type { Business, GameConfig, IapProduct, StoryBeat } from '../config/schema';
import type { BusinessState, BuyAmount, GameState } from './types';

// ---------------------------------------------------------------- setup

export function createInitialState(cfg: GameConfig, now: number): GameState {
  const businesses: Record<string, BusinessState> = {};
  cfg.businesses.forEach((b, i) => {
    // The first business starts with one unit so the player can tap straight away.
    businesses[b.id] = { owned: i === 0 ? 1 : 0, progress: 0, running: false, managed: false };
  });
  return {
    version: 1,
    cash: cfg.economy.startingCash,
    gems: 0,
    runEarnings: 0,
    lifetimeEarnings: 0,
    prestigePoints: 0,
    prestigeCount: 0,
    businesses,
    upgrades: [],
    boostUntil: 0,
    storySeen: [],
    entitlements: { noAds: false, products: [], multipliers: {} },
    daily: { lastClaimDay: null, streak: 0 },
    stats: { taps: 0, adsWatched: 0, playSeconds: 0, firstOpenAt: now },
    lastSavedAt: now,
  };
}

/**
 * Brings a saved state in line with the current config: new businesses added
 * by a content update appear, removed ones are dropped. Lets you ship economy
 * updates without wiping saves.
 */
export function reconcileState(cfg: GameConfig, saved: GameState): GameState {
  const fresh = createInitialState(cfg, saved.stats?.firstOpenAt ?? Date.now());
  const businesses: Record<string, BusinessState> = {};
  for (const b of cfg.businesses) {
    businesses[b.id] = { ...fresh.businesses[b.id], ...saved.businesses?.[b.id] };
  }
  const upgradeIds = new Set(cfg.upgrades.map((u) => u.id));
  return {
    ...fresh,
    ...saved,
    businesses,
    upgrades: (saved.upgrades ?? []).filter((id) => upgradeIds.has(id)),
    entitlements: { ...fresh.entitlements, ...saved.entitlements },
    daily: { ...fresh.daily, ...saved.daily },
    stats: { ...fresh.stats, ...saved.stats },
  };
}

// ---------------------------------------------------------------- multipliers

export function milestoneMults(cfg: GameConfig, owned: number): { speed: number; revenue: number } {
  let speed = 1;
  let revenue = 1;
  for (const m of cfg.economy.milestones) {
    if (owned >= m.owned) {
      speed *= m.speedMult;
      revenue *= m.revenueMult;
    }
  }
  return { speed, revenue };
}

export function nextMilestone(cfg: GameConfig, owned: number): number | null {
  const next = cfg.economy.milestones.map((m) => m.owned).filter((o) => o > owned).sort((a, b) => a - b)[0];
  return next ?? null;
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

function upgradeMultiplier(cfg: GameConfig, state: GameState, businessId: string): number {
  let mult = 1;
  for (const u of cfg.upgrades) {
    if ((u.target === businessId || u.target === 'all') && state.upgrades.includes(u.id)) mult *= u.revenueMult;
  }
  return mult;
}

export function globalMultiplier(cfg: GameConfig, state: GameState, now: number): number {
  const boost = isBoostActive(state, now) ? cfg.economy.boost.multiplier : 1;
  return prestigeMultiplier(cfg, state) * entitlementMultiplier(state) * boost;
}

// ---------------------------------------------------------------- per business

function bizCfg(cfg: GameConfig, id: string): Business {
  const b = cfg.businesses.find((x) => x.id === id);
  if (!b) throw new Error(`unknown business ${id}`);
  return b;
}

export function cycleSeconds(cfg: GameConfig, state: GameState, id: string): number {
  const b = bizCfg(cfg, id);
  return b.cycleSeconds / milestoneMults(cfg, state.businesses[id].owned).speed;
}

export function revenuePerCycle(cfg: GameConfig, state: GameState, id: string, now: number): number {
  const b = bizCfg(cfg, id);
  const owned = state.businesses[id].owned;
  if (owned === 0) return 0;
  return (
    b.baseRevenue *
    owned *
    milestoneMults(cfg, owned).revenue *
    upgradeMultiplier(cfg, state, id) *
    globalMultiplier(cfg, state, now)
  );
}

/** Income per second from managed (automated) businesses. */
export function incomePerSecond(cfg: GameConfig, state: GameState, now: number): number {
  let total = 0;
  for (const b of cfg.businesses) {
    const s = state.businesses[b.id];
    if (s.managed && s.owned > 0) total += revenuePerCycle(cfg, state, b.id, now) / cycleSeconds(cfg, state, b.id);
  }
  return total;
}

/** Cost of buying `n` more units when `owned` are already owned (geometric series). */
export function costFor(b: Business, owned: number, n: number): number {
  if (n <= 0) return 0;
  const g = b.costGrowth;
  return (b.baseCost * Math.pow(g, owned) * (Math.pow(g, n) - 1)) / (g - 1);
}

export function maxAffordable(b: Business, owned: number, cash: number): number {
  const g = b.costGrowth;
  const first = b.baseCost * Math.pow(g, owned);
  if (cash < first) return 0;
  const n = Math.floor(Math.log((cash * (g - 1)) / first + 1) / Math.log(g));
  // Floating point can land one over; step back if so.
  return costFor(b, owned, n) > cash ? Math.max(0, n - 1) : n;
}

export function resolveBuyAmount(cfg: GameConfig, state: GameState, id: string, amount: BuyAmount): number {
  const b = bizCfg(cfg, id);
  const owned = state.businesses[id].owned;
  return amount === 'max' ? Math.max(1, maxAffordable(b, owned, state.cash)) : amount;
}

// ---------------------------------------------------------------- actions

function withBusiness(state: GameState, id: string, patch: Partial<BusinessState>): GameState {
  return { ...state, businesses: { ...state.businesses, [id]: { ...state.businesses[id], ...patch } } };
}

function earn(state: GameState, amount: number): GameState {
  return {
    ...state,
    cash: state.cash + amount,
    runEarnings: state.runEarnings + amount,
    lifetimeEarnings: state.lifetimeEarnings + amount,
  };
}

export function buyBusiness(cfg: GameConfig, state: GameState, id: string, amount: BuyAmount): GameState {
  const b = bizCfg(cfg, id);
  const owned = state.businesses[id].owned;
  const n = resolveBuyAmount(cfg, state, id, amount);
  const cost = costFor(b, owned, n);
  if (cost > state.cash) return state;
  return withBusiness({ ...state, cash: state.cash - cost }, id, { owned: owned + n });
}

export function hireManager(cfg: GameConfig, state: GameState, id: string): GameState {
  const b = bizCfg(cfg, id);
  const s = state.businesses[id];
  if (s.managed || s.owned === 0 || state.cash < b.managerCost) return state;
  return withBusiness({ ...state, cash: state.cash - b.managerCost }, id, { managed: true, running: true });
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
export function startBusiness(state: GameState, id: string): GameState {
  const s = state.businesses[id];
  if (s.owned === 0 || s.running) return state;
  return withBusiness(state, id, { running: true });
}

export function tapValue(cfg: GameConfig, state: GameState, now: number): number {
  return (
    (cfg.economy.tapBase + cfg.economy.tapPercentOfIncome * incomePerSecond(cfg, state, now)) *
    globalMultiplier(cfg, state, now)
  );
}

export function tapHero(cfg: GameConfig, state: GameState, now: number, comboMult = 1): { state: GameState; earned: number } {
  const earned = tapValue(cfg, state, now) * comboMult;
  const next = earn(state, earned);
  return { state: { ...next, stats: { ...next.stats, taps: next.stats.taps + 1 } }, earned };
}

/** Combo multiplier after `taps` quick taps in a row: 1, then +1 per level, capped. */
export function comboMultiplier(cfg: GameConfig, taps: number): number {
  const { tapsPerLevel, maxMultiplier } = cfg.economy.combo;
  return Math.min(maxMultiplier, 1 + Math.floor(taps / tapsPerLevel));
}

/** What the flying bonus pays right now. */
export function bonusValue(cfg: GameConfig, state: GameState, now: number): number {
  const { incomeSeconds, minTaps } = cfg.economy.bonus;
  return Math.max(incomePerSecond(cfg, state, now) * incomeSeconds, tapValue(cfg, state, now) * minTaps);
}

export function collectBonus(cfg: GameConfig, state: GameState, now: number): { state: GameState; earned: number } {
  const earned = bonusValue(cfg, state, now);
  return { state: earn(state, earned), earned };
}

// ---------------------------------------------------------------- simulation

/** Advances the simulation by dt seconds. Call at 10 Hz or so. */
export function tick(cfg: GameConfig, state: GameState, dt: number, now: number): GameState {
  let earned = 0;
  const businesses: Record<string, BusinessState> = { ...state.businesses };
  for (const b of cfg.businesses) {
    const s = businesses[b.id];
    if (s.owned === 0 || !(s.running || s.managed)) continue;
    const cycle = cycleSeconds(cfg, state, b.id);
    const advanced = s.progress + dt / cycle;
    if (s.managed) {
      const completions = Math.floor(advanced);
      if (completions > 0) earned += completions * revenuePerCycle(cfg, state, b.id, now);
      businesses[b.id] = { ...s, progress: advanced - completions };
    } else if (advanced >= 1) {
      earned += revenuePerCycle(cfg, state, b.id, now);
      businesses[b.id] = { ...s, progress: 0, running: false };
    } else {
      businesses[b.id] = { ...s, progress: advanced };
    }
  }
  const next = earn({ ...state, businesses }, earned);
  return { ...next, stats: { ...next.stats, playSeconds: next.stats.playSeconds + dt } };
}

// ---------------------------------------------------------------- offline

export function computeOffline(cfg: GameConfig, state: GameState, now: number): { seconds: number; earnings: number } {
  const elapsed = Math.max(0, (now - state.lastSavedAt) / 1000);
  const seconds = Math.min(elapsed, cfg.economy.offline.maxHours * 3600);
  // Offline income ignores the ad boost so the boost can't be farmed by closing the app.
  const noBoost = { ...state, boostUntil: 0 };
  const earnings = incomePerSecond(cfg, noBoost, now) * seconds * cfg.economy.offline.efficiency;
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

/** Resets the run, keeps lifetime earnings, gems, entitlements, story and stats. */
export function prestige(cfg: GameConfig, state: GameState, now: number): GameState {
  const gained = prestigePointsAvailable(cfg, state);
  if (gained <= 0) return state;
  const fresh = createInitialState(cfg, state.stats.firstOpenAt);
  return {
    ...fresh,
    gems: state.gems,
    lifetimeEarnings: state.lifetimeEarnings,
    prestigePoints: state.prestigePoints + gained,
    prestigeCount: state.prestigeCount + 1,
    // Premium (gem) upgrades are kept; cash upgrades reset.
    upgrades: state.upgrades.filter((id) => cfg.upgrades.find((u) => u.id === id)?.premium),
    boostUntil: state.boostUntil,
    storySeen: state.storySeen,
    entitlements: state.entitlements,
    daily: state.daily,
    stats: state.stats,
    lastSavedAt: now,
  };
}

// ---------------------------------------------------------------- boosts, gems, daily

export function activateBoost(cfg: GameConfig, state: GameState, now: number): GameState {
  const { minutesPerAd, maxMinutes } = cfg.economy.boost;
  const from = Math.max(now, state.boostUntil);
  const until = Math.min(from + minutesPerAd * 60_000, now + maxMinutes * 60_000);
  return { ...state, boostUntil: until, stats: { ...state.stats, adsWatched: state.stats.adsWatched + 1 } };
}

export function canBoost(cfg: GameConfig, state: GameState, now: number): boolean {
  return state.boostUntil < now + (cfg.economy.boost.maxMinutes - cfg.economy.boost.minutesPerAd) * 60_000;
}

/** Instantly earns `hours` of managed income. */
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

// ---------------------------------------------------------------- IAP

/** Applies a purchased product. Consumables (gems, warps) apply once per purchase. */
export function applyProduct(cfg: GameConfig, state: GameState, product: IapProduct, now: number): GameState {
  if (product.kind === 'noAds' || product.kind === 'multiplier' || product.kind === 'starterPack') {
    if (state.entitlements.products.includes(product.id)) return state;
    state = { ...state, entitlements: { ...state.entitlements, products: [...state.entitlements.products, product.id] } };
  }
  switch (product.kind) {
    case 'noAds':
      return { ...state, entitlements: { ...state.entitlements, noAds: true } };
    case 'multiplier':
      return {
        ...state,
        entitlements: {
          ...state.entitlements,
          multipliers: { ...state.entitlements.multipliers, [product.id]: product.value },
        },
      };
    case 'gems':
      return { ...state, gems: state.gems + product.value };
    case 'timeWarp':
      return timeWarp(cfg, state, product.value, now);
    case 'starterPack':
      // A starter pack removes ads and grants gems; tune `value` as the gem amount.
      return {
        ...state,
        gems: state.gems + product.value,
        entitlements: { ...state.entitlements, noAds: true },
      };
  }
}

// ---------------------------------------------------------------- story

function beatTriggered(beat: StoryBeat, state: GameState): boolean {
  const t = beat.trigger;
  switch (t.type) {
    case 'start':
      return true;
    case 'lifetimeEarnings':
      return state.lifetimeEarnings >= t.amount;
    case 'owned':
      return (state.businesses[t.businessId]?.owned ?? 0) >= t.count;
    case 'prestige':
      return state.prestigeCount >= t.count;
  }
}

export function pendingStoryBeat(cfg: GameConfig, state: GameState): StoryBeat | null {
  return cfg.story.find((b) => !state.storySeen.includes(b.id) && beatTriggered(b, state)) ?? null;
}

export function markStorySeen(state: GameState, beat: StoryBeat): GameState {
  if (state.storySeen.includes(beat.id)) return state;
  return { ...state, storySeen: [...state.storySeen, beat.id], gems: state.gems + beat.rewardGems };
}
