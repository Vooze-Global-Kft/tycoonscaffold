/**
 * Meta systems on top of the economy: staff cards, rewards, purchases,
 * chests, missions, deals, the daily shop and tutorial hints.
 * Pure functions, like the rest of the engine. Randomness comes only from the
 * seed saved in the state (see rng.ts).
 */
import type { DailyOffer, Deal, GameConfig, IapProduct, Rarity, Reward } from '../config/schema';
import { copiesForNextLevel } from './cards';
import { grantCash, incomePerSecond, tapValue } from './economy';
import { rngPick } from './rng';
import type { GameState } from './types';

// ---------------------------------------------------------------- cards

/** Adds copies of a card. The first copy unlocks it at level 1; the rest count towards the next level. */
export function addCardCopies(cfg: GameConfig, state: GameState, cardId: string, copies: number): GameState {
  if (!cfg.meta.cards.some((c) => c.id === cardId) || copies <= 0) return state;
  const cur = state.cards[cardId] ?? { level: 0, copies: 0 };
  const next = cur.level === 0 ? { level: 1, copies: cur.copies + copies - 1 } : { level: cur.level, copies: cur.copies + copies };
  return { ...state, cards: { ...state.cards, [cardId]: next } };
}

export function canLevelUpCard(cfg: GameConfig, state: GameState, cardId: string): boolean {
  const c = state.cards[cardId];
  return !!c && c.level > 0 && c.copies >= copiesForNextLevel(cfg, c.level);
}

/** Spends copies to raise a card one level. */
export function levelUpCard(cfg: GameConfig, state: GameState, cardId: string): GameState {
  if (!canLevelUpCard(cfg, state, cardId)) return state;
  const c = state.cards[cardId];
  return { ...state, cards: { ...state.cards, [cardId]: { level: c.level + 1, copies: c.copies - copiesForNextLevel(cfg, c.level) } } };
}

// ---------------------------------------------------------------- rewards

/** Cash a "seconds of income" reward is worth right now. Never less than a handful of taps, so it matters early on. */
export function cashForSeconds(cfg: GameConfig, state: GameState, seconds: number, now: number): number {
  return Math.max(incomePerSecond(cfg, state, now) * seconds, tapValue(cfg, state, now) * Math.min(seconds, 60));
}

/** What a reward turned into once granted (random cards are resolved), for the UI to show. */
export type GrantedReward =
  | { type: 'gems'; amount: number }
  | { type: 'cash'; amount: number }
  | { type: 'chest'; chestId: string; count: number }
  | { type: 'card'; cardId: string; copies: number; isNew: boolean }
  | { type: 'noAds' }
  | { type: 'multiplier'; value: number };

/** Grants one reward. Returns the new state and what was actually given. */
export function applyReward(cfg: GameConfig, state: GameState, reward: Reward, now: number, sourceId = 'reward'): { state: GameState; granted: GrantedReward } {
  switch (reward.type) {
    case 'gems':
      return { state: { ...state, gems: state.gems + reward.amount }, granted: { type: 'gems', amount: reward.amount } };
    case 'cash': {
      const amount = cashForSeconds(cfg, state, reward.seconds, now);
      return { state: grantCash(state, amount), granted: { type: 'cash', amount } };
    }
    case 'chest': {
      const owned = { ...state.chests.owned, [reward.chestId]: (state.chests.owned[reward.chestId] ?? 0) + reward.count };
      return { state: { ...state, chests: { ...state.chests, owned } }, granted: { type: 'chest', chestId: reward.chestId, count: reward.count } };
    }
    case 'card': {
      const isNew = (state.cards[reward.cardId]?.level ?? 0) === 0;
      return { state: addCardCopies(cfg, state, reward.cardId, reward.copies), granted: { type: 'card', cardId: reward.cardId, copies: reward.copies, isNew } };
    }
    case 'randomCard': {
      const pool = cfg.meta.cards.filter((c) => c.rarity === reward.rarity);
      if (pool.length === 0) return { state, granted: { type: 'gems', amount: 0 } };
      const roll = rngPick(state.rng, pool);
      const isNew = (state.cards[roll.value.id]?.level ?? 0) === 0;
      return {
        state: addCardCopies(cfg, { ...state, rng: roll.seed }, roll.value.id, reward.copies),
        granted: { type: 'card', cardId: roll.value.id, copies: reward.copies, isNew },
      };
    }
    case 'noAds':
      return { state: { ...state, entitlements: { ...state.entitlements, noAds: true } }, granted: { type: 'noAds' } };
    case 'multiplier':
      return {
        state: { ...state, entitlements: { ...state.entitlements, multipliers: { ...state.entitlements.multipliers, [sourceId]: reward.value } } },
        granted: { type: 'multiplier', value: reward.value },
      };
  }
}

export function applyRewards(cfg: GameConfig, state: GameState, rewards: Reward[], now: number, sourceId = 'reward'): { state: GameState; granted: GrantedReward[] } {
  const granted: GrantedReward[] = [];
  let s = state;
  for (const r of rewards) {
    const res = applyReward(cfg, s, r, now, sourceId);
    s = res.state;
    granted.push(res.granted);
  }
  return { state: s, granted };
}

// ---------------------------------------------------------------- purchases

/** Non-consumable kinds are granted once and restored from the store; the rest are granted on every purchase. */
export function isNonConsumable(product: IapProduct): boolean {
  return product.kind === 'noAds' || product.kind === 'skipAds' || product.kind === 'multiplier' || product.kind === 'starterPack';
}

/**
 * Applies a purchased product. Non-consumables apply once; consumables on each purchase.
 * Products of kind "deal" grant nothing here: call grantDeal for the deal that uses them.
 */
export function applyProduct(cfg: GameConfig, state: GameState, product: IapProduct, now: number): { state: GameState; granted: GrantedReward[] } {
  let s = state;
  if (isNonConsumable(product)) {
    if (s.entitlements.products.includes(product.id)) return { state, granted: [] };
    s = { ...s, entitlements: { ...s.entitlements, products: [...s.entitlements.products, product.id] } };
  }
  switch (product.kind) {
    case 'noAds':
      return applyRewards(cfg, s, [{ type: 'noAds' }], now, product.id);
    case 'skipAds':
      return { state: { ...s, entitlements: { ...s.entitlements, skipRewarded: true } }, granted: [] };
    case 'multiplier':
      return applyRewards(cfg, s, [{ type: 'multiplier', value: product.value }], now, product.id);
    case 'gems':
      return applyRewards(cfg, s, [{ type: 'gems', amount: product.value }], now, product.id);
    case 'timeWarp':
      return applyRewards(cfg, s, [{ type: 'cash', seconds: product.value * 3600 }], now, product.id);
    case 'starterPack':
      // A starter pack removes ads and grants gems; `value` is the gem amount.
      return applyRewards(cfg, s, [{ type: 'noAds' }, { type: 'gems', amount: product.value }], now, product.id);
    case 'deal':
      return { state: s, granted: [] };
  }
}

/** True when the player already owns a non-consumable product. */
export function productOwned(state: GameState, product: IapProduct): boolean {
  return state.entitlements.products.includes(product.id);
}

// =====================================================================================
// CONTRACT. Everything below is specified but not yet implemented: the signatures and
// doc comments are the contract the store and UI are written against. Keep the names,
// parameters and return shapes; replace each `todo()` with the real thing.
// =====================================================================================

function todo(): never {
  throw new Error('meta: not implemented yet');
}

// ---------------------------------------------------------------- chests

export interface RarityOdds {
  rarity: Rarity;
  /** 0..100. The four rarities add up to 100 (or all 0 when the chest has no card slots). */
  percent: number;
}

/**
 * Chance of each rarity for one card slot of a chest, in percent, exactly as the roll uses it.
 * This is what the drop-rate screen shows (store rules require it), so it must never drift
 * from openChest. Rarities with no cards in the game count as 0.
 */
export function chestCardOdds(cfg: GameConfig, chestId: string): RarityOdds[] {
  void cfg; void chestId;
  return todo();
}

/** Chance of each kind of slot, in percent (adds up to 100). */
export function chestSlotOdds(cfg: GameConfig, chestId: string): { card: number; gems: number; cash: number } {
  void cfg; void chestId;
  return todo();
}

/** Adds unopened chests to the player's inventory. Unknown chest ids are ignored. */
export function grantChest(cfg: GameConfig, state: GameState, chestId: string, count = 1): GameState {
  void cfg; void state; void chestId; void count;
  return todo();
}

/** Total unopened chests of all kinds. */
export function chestCount(state: GameState): number {
  void state;
  return todo();
}

/**
 * Opens one owned chest: rolls every slot with the seed saved in the state (so reloading a save
 * cannot change the result), applies the rewards, and returns them in reveal order (the best
 * card last). Rules, all of which the drop-rate screen must be able to state truthfully:
 * - `guaranteed`: at least one card slot of that rarity or better; if the roll did not produce
 *   one, the last card slot is upgraded to exactly that rarity.
 * - Bad-luck protection (cfg.meta.pity): `state.chests.sinceEpic` / `sinceLegendary` count chests
 *   with card slots opened in a row without that rarity (or better). When a counter has reached
 *   its limit minus one, this chest's last card slot is upgraded. Counters reset when the rarity
 *   appears (by luck, guarantee or protection). Chests without card slots do not count.
 * - Card copies are multiplied by 1 + chestGrowthPerVenue * (stats.venuesEver - 1), rounded.
 * - A rarity with no cards in the game is never rolled.
 * Counts stats.chestsOpened. Returns null when the player has no such chest.
 */
export function openChest(cfg: GameConfig, state: GameState, chestId: string, now: number): { state: GameState; rewards: GrantedReward[] } | null {
  void cfg; void state; void chestId; void now;
  return todo();
}

/** Buys a chest with gems (it goes to the inventory). Returns the same state when it can't be bought. */
export function buyChest(cfg: GameConfig, state: GameState, chestId: string): GameState {
  void cfg; void state; void chestId;
  return todo();
}

export interface FreeChestStatus {
  /** Free chests ready to claim right now (0..stored). */
  ready: number;
  /** The storage limit. */
  stored: number;
  /** Milliseconds until the next one is ready, or 0 when storage is full. */
  nextInMs: number;
}

/**
 * The free chest recharges on a timer and up to `stored` wait for the player. Mechanics: charges
 * accrue from `state.chests.freeAnchor`, one per recharge period. The period is `everyHours`,
 * except that the Nth chest ever (N = freeClaimed + 1) uses `firstMinutes[N - 1]` when that entry
 * exists. An anchor of 0 means "start counting now" (treat it as `now`, i.e. nothing ready yet,
 * unless firstMinutes[0] is 0). Returns null when the game has no free chest.
 */
export function freeChestStatus(cfg: GameConfig, state: GameState, now: number): FreeChestStatus | null {
  void cfg; void state; void now;
  return todo();
}

/** Starts the free-chest timer if it has not started (anchor 0). Call on boot. */
export function startFreeChestTimer(cfg: GameConfig, state: GameState, now: number): GameState {
  void cfg; void state; void now;
  return todo();
}

/**
 * Claims one ready free chest into the inventory. If storage was full the timer restarts from
 * now; otherwise the anchor moves forward one period, so partial progress is kept. No-op when
 * none is ready.
 */
export function claimFreeChest(cfg: GameConfig, state: GameState, now: number): GameState {
  void cfg; void state; void now;
  return todo();
}

export interface AdChestStatus {
  /** Rewarded-ad chests still available today. */
  left: number;
  /** Milliseconds until the next one may be watched (0 = now). */
  nextInMs: number;
}

/** The rewarded-ad chest: `perDay` per local day, at least `cooldownMinutes` apart. Null when the game has none. */
export function adChestStatus(cfg: GameConfig, state: GameState, now: number): AdChestStatus | null {
  void cfg; void state; void now;
  return todo();
}

/**
 * True when randomised chests may be sold (for gems or money) to this player: the game has
 * `meta.chestsForSale` on AND the country is not in `chestSalesBlockedIn`. `region` is an ISO
 * 3166-1 alpha-2 code, or null when unknown; an unknown country counts as blocked (we only sell
 * random items where we know it is allowed). Where this is false the UI must hide chest prices
 * and every deal or paid daily offer that contains a chest; chests can still be earned, and a
 * FREE daily item may still be a chest.
 */
export function chestSalesAllowed(cfg: GameConfig, region: string | null): boolean {
  void cfg; void region;
  return todo();
}

/** True when a reward list contains a chest (such offers are hidden where chest sales are not allowed). */
export function containsChest(rewards: Reward[]): boolean {
  void rewards;
  return todo();
}

/** Grants the rewarded-ad chest (call after the ad was watched). No-op when the daily limit is used up or the cooldown is running. */
export function grantAdChest(cfg: GameConfig, state: GameState, now: number): GameState {
  void cfg; void state; void now;
  return todo();
}

// ---------------------------------------------------------------- missions

export interface MissionView {
  /** Slot index, for claimMission. */
  index: number;
  templateId: string;
  /** The template text with {n} replaced by the formatted target. */
  text: string;
  /** Clamped to 0..target. */
  progress: number;
  target: number;
  done: boolean;
  reward: Reward;
}

/**
 * Fills empty mission slots (up to cfg.meta.missions.slots) and drops slots whose template no
 * longer exists. Rules:
 * - A template is never in two slots at once; prefer templates of types not already on offer,
 *   and among those the ones completed least often (so the list stays varied without randomness).
 * - Target: `template.targets[min(timesCompleted, last)]`. For "earn" that number is seconds of
 *   income: target cash = max(incomePerSecond * seconds, tapValue * seconds), rounded to two
 *   significant digits. Other types are counts.
 * - Daily limit: when `missions.doneToday` has reached `perDay` for the current local day, no
 *   new missions are handed out until the day changes (slots stay empty). A new day resets it.
 * - Types that cannot progress in this game are skipped ("rush" and "serve" outside sim mode,
 *   "chests" without chests).
 * Call on boot, after every claim, and now and then (the day can change while playing).
 */
export function refreshMissions(cfg: GameConfig, state: GameState): GameState {
  void cfg; void state;
  return todo();
}

/**
 * The missions on offer, with live progress. Counters: serve = stats.served, earn =
 * lifetimeEarnings, levels = stats.levelsBought, taps = stats.taps, bonus = stats.bonusCaught,
 * chests = stats.chestsOpened, rush = stats.rushes, hires = stats.hires. Progress is the counter
 * now minus its value when the mission was handed out.
 */
export function missionViews(cfg: GameConfig, state: GameState): MissionView[] {
  void cfg; void state;
  return todo();
}

/**
 * Claims a finished mission: grants its reward, plus the reward of every `milestones` entry whose
 * `every` divides the new total of completed missions; counts the completion (per template, in
 * total and for today); frees the slot and refills. Null when the mission is not done.
 */
export function claimMission(cfg: GameConfig, state: GameState, index: number, now: number): { state: GameState; granted: GrantedReward[] } | null {
  void cfg; void state; void index; void now;
  return todo();
}

// ---------------------------------------------------------------- deals

export interface DealView {
  deal: Deal;
  /** Epoch ms when the offer really ends, or null for a permanent shop item. */
  endsAt: number | null;
  purchasesLeft: number;
}

/**
 * Starts every deal whose trigger has fired and that has not started yet (records startedAt).
 * Triggers: always; playSeconds (stats.playSeconds); sessions (stats.sessions); prestige
 * (prestigeCount); lifetimeEarnings; venue (that venue is open).
 * A deal is active from then until startedAt + durationHours (forever without a duration),
 * while purchases are left. Timers are real: an expired deal never comes back.
 * Call on boot, after prestige and now and then while playing.
 */
export function refreshDeals(cfg: GameConfig, state: GameState, now: number): GameState {
  void cfg; void state; void now;
  return todo();
}

/** Deals the player can buy right now, soonest-ending first. */
export function activeDeals(cfg: GameConfig, state: GameState, now: number): DealView[] {
  void cfg; void state; void now;
  return todo();
}

/** An active time-limited deal the player has not been shown yet (for a one-time popup), or null. Permanent shop items never pop up. */
export function dealToShow(cfg: GameConfig, state: GameState, now: number): Deal | null {
  void cfg; void state; void now;
  return todo();
}

export function markDealSeen(state: GameState, dealId: string): GameState {
  void state; void dealId;
  return todo();
}

/** Buys a gem-priced deal. Null when it is not active, sold out, priced in money, or the player lacks gems. */
export function buyDealWithGems(cfg: GameConfig, state: GameState, dealId: string, now: number): { state: GameState; granted: GrantedReward[] } | null {
  void cfg; void state; void dealId; void now;
  return todo();
}

/**
 * Grants a money-priced deal after the store has confirmed payment: applies the contents and
 * counts the purchase. Null when the deal is unknown. (It still grants if the timer ran out
 * while the payment sheet was open: the player paid.)
 */
export function grantDeal(cfg: GameConfig, state: GameState, dealId: string, now: number): { state: GameState; granted: GrantedReward[] } | null {
  void cfg; void state; void dealId; void now;
  return todo();
}

// ---------------------------------------------------------------- daily shop

export interface DailyOfferView {
  offer: DailyOffer;
  bought: boolean;
}

/**
 * On a new local day: picks today's offers with the seeded RNG (weights respected, no repeats;
 * when the config has free offers, exactly one free offer comes first) and clears what was
 * bought. Does nothing on the same day. Call on boot and when the day changes.
 */
export function refreshDailyShop(cfg: GameConfig, state: GameState, now: number): GameState {
  void cfg; void state; void now;
  return todo();
}

export function dailyOffers(cfg: GameConfig, state: GameState): DailyOfferView[] {
  void cfg; void state;
  return todo();
}

/** Buys (or claims, when free) one of today's offers, once per day. Null when it can't be bought. */
export function buyDailyOffer(cfg: GameConfig, state: GameState, offerId: string, now: number): { state: GameState; granted: GrantedReward[] } | null {
  void cfg; void state; void offerId; void now;
  return todo();
}

/** Milliseconds until the local day changes (the shop's honest countdown). */
export function msUntilNextDay(now: number): number {
  void now;
  return todo();
}

// ---------------------------------------------------------------- sessions

/** Minutes away after which coming back counts as a new play session. */
export const SESSION_GAP_MINUTES = 30;

/**
 * Call once on boot with the loaded state: counts a new session when this is the first one or
 * the player was away longer than SESSION_GAP_MINUTES (measured from state.lastSavedAt).
 */
export function registerSession(state: GameState, now: number): GameState {
  void state; void now;
  return todo();
}

// ---------------------------------------------------------------- hints

/** The one thing a new player should do next. The UI points a hand at it. */
export type Hint =
  /** Tap this station to run a cycle (it has no automation hire yet and is idle). */
  | { kind: 'tapStation'; businessId: string }
  /** Ring the bell: goods are waiting and transport workers are idle. */
  | { kind: 'bell' }
  /** Buy a level here: it is affordable and it is the best next step. */
  | { kind: 'buyBusiness'; businessId: string }
  | { kind: 'buyTransport' }
  | { kind: 'buySales' }
  /** An automation hire is affordable. */
  | { kind: 'hireBusiness'; businessId: string }
  | { kind: 'hireTransport' }
  | { kind: 'openChest' }
  | { kind: 'claimMission'; index: number };

/**
 * Tutorial guidance for the first minutes, computed from state alone (no stored tutorial step):
 * the most useful action available right now in the venue on screen, in the priority order the
 * first session teaches (claim what is ready; run the chain by hand; fix the bottleneck; hire).
 * Returns null once the player clearly knows the loop (e.g. after `stats.playSeconds` passes a
 * few minutes AND the first venue's transport is automated), so veterans are never nagged.
 */
export function nextHint(cfg: GameConfig, state: GameState, now: number): Hint | null {
  void cfg; void state; void now;
  return todo();
}
