/**
 * Meta systems on top of the economy: staff cards, rewards, purchases,
 * chests, missions, deals, the daily shop and tutorial hints.
 * Pure functions, like the rest of the engine. Randomness comes only from the
 * seed saved in the state (see rng.ts).
 */
import { RARITIES, type Chest, type DailyOffer, type Deal, type GameConfig, type IapProduct, type MissionTemplate, type Rarity, type Reward } from '../config/schema';
import { copiesForNextLevel } from './cards';
import { idleWorkers, salesRate, transportRate } from './chain';
import {
  businessCost,
  chainParams,
  cycleSeconds,
  dayKey,
  grantCash,
  incomePerSecond,
  isSim,
  managerCost,
  salesCost,
  stationValue,
  tapValue,
  transportCost,
  transportManagerCost,
  venueIds,
} from './economy';
import { formatNumber } from './format';
import { rngFloat, rngInt, rngPick, rngWeighted } from './rng';
import type { DealState, GameState } from './types';

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
// Chests, missions, deals, the daily shop, sessions and hints. The signatures and doc
// comments are the contract the store and UI are written against. Where the contract
// left a choice open, the choice is written into the comment ("Choice: ...").
//
// Clock rules shared by everything below: `now` is the device clock and can jump. A
// clock moved BACKWARDS never grants anything: elapsed times are clamped at 0, and a
// day key earlier than the one saved is treated as the saved day (so the daily shop,
// the ad-chest limit and the mission limit cannot be reset by winding the clock back).
// =====================================================================================

const HOUR = 3_600_000;
const MINUTE = 60_000;

const rank = (r: Rarity): number => RARITIES.indexOf(r);

/** The later of two day keys (YYYY-MM-DD sorts as text). A clock moved back keeps the saved day. */
function laterDay(today: string, saved: string | null): string {
  return saved !== null && saved > today ? saved : today;
}

/** Round to two significant digits so targets look hand-picked (1234 -> 1200). */
function twoDigits(x: number): number {
  if (!(x > 0)) return 0;
  const f = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / f) * f;
}

// ---------------------------------------------------------------- chests

export interface RarityOdds {
  rarity: Rarity;
  /** 0..100. The four rarities add up to 100 (or all 0 when the chest has no card slots). */
  percent: number;
}

function chestCfg(cfg: GameConfig, chestId: string): Chest | undefined {
  return cfg.meta.chests.find((c) => c.id === chestId);
}

/** Rarity weights as the roll uses them: a rarity with no cards in the game weighs 0. */
function effectiveRarityWeights(cfg: GameConfig, chest: Chest): number[] {
  return RARITIES.map((r) => (cfg.meta.cards.some((c) => c.rarity === r) ? Math.max(0, chest.rarityWeights[r]) : 0));
}

/** Slot weights as the roll uses them: card slots weigh 0 when no rarity can be rolled. */
function effectiveSlotWeights(cfg: GameConfig, chest: Chest): [number, number, number] {
  const cardsPossible = effectiveRarityWeights(cfg, chest).some((w) => w > 0);
  return [cardsPossible ? Math.max(0, chest.slotWeights.card) : 0, Math.max(0, chest.slotWeights.gems), Math.max(0, chest.slotWeights.cash)];
}

/**
 * Chance of each rarity for one card slot of a chest, in percent, exactly as the roll uses it.
 * This is what the drop-rate screen shows (store rules require it), so it must never drift
 * from openChest. Rarities with no cards in the game count as 0.
 * Choice: an unknown chest, or one whose card slots can never roll, gives four zeros. The odds
 * are those of a normal roll; the guarantee and bad-luck protection only ever raise a slot, and
 * the drop-rate screen states them next to these numbers (see chestRules).
 */
export function chestCardOdds(cfg: GameConfig, chestId: string): RarityOdds[] {
  const chest = chestCfg(cfg, chestId);
  const weights = chest && effectiveSlotWeights(cfg, chest)[0] > 0 ? effectiveRarityWeights(cfg, chest) : [0, 0, 0, 0];
  const total = weights.reduce((a, b) => a + b, 0);
  return RARITIES.map((rarity, i) => ({ rarity, percent: total > 0 ? (weights[i] / total) * 100 : 0 }));
}

/**
 * Chance of each kind of slot, in percent (adds up to 100).
 * Choice: every slot is rolled independently with these odds. A card slot that cannot roll
 * (no cards in the game) counts as 0. Unknown chest: all 0. When a chest has a guarantee and
 * no slot rolled a card, its last slot becomes a card slot (see openChest).
 */
export function chestSlotOdds(cfg: GameConfig, chestId: string): { card: number; gems: number; cash: number } {
  const chest = chestCfg(cfg, chestId);
  if (!chest) return { card: 0, gems: 0, cash: 0 };
  const [card, gems, cash] = effectiveSlotWeights(cfg, chest);
  const total = card + gems + cash;
  if (!(total > 0)) return { card: 0, gems: 0, cash: 0 };
  return { card: (card / total) * 100, gems: (gems / total) * 100, cash: (cash / total) * 100 };
}

/** The rules the drop-rate screen states under the odds, as data (the UI words them). */
export interface ChestRules {
  /** At least one card of this rarity or better in every chest. */
  guaranteed: Rarity | null;
  /** Bad-luck protection: an epic (or better) at the latest in this many chests with cards; null = none. */
  epicWithin: number | null;
  legendaryWithin: number | null;
  /** Card copies are multiplied by this (it grows with the most venues ever open). */
  copiesMultiplier: number;
}

export function chestRules(cfg: GameConfig, state: GameState, chestId: string): ChestRules | null {
  const chest = chestCfg(cfg, chestId);
  if (!chest) return null;
  const has = (r: Rarity) => cfg.meta.cards.some((c) => c.rarity === r);
  return {
    guaranteed: chest.guaranteed ?? null,
    epicWithin: cfg.meta.pity.epic !== undefined && (has('epic') || has('legendary')) ? cfg.meta.pity.epic : null,
    legendaryWithin: cfg.meta.pity.legendary !== undefined && has('legendary') ? cfg.meta.pity.legendary : null,
    copiesMultiplier: copiesMultiplier(cfg, state),
  };
}

/** Adds unopened chests to the player's inventory. Unknown chest ids are ignored. */
export function grantChest(cfg: GameConfig, state: GameState, chestId: string, count = 1): GameState {
  if (!chestCfg(cfg, chestId) || !(count > 0)) return state;
  const n = Math.floor(count);
  return { ...state, chests: { ...state.chests, owned: { ...state.chests.owned, [chestId]: (state.chests.owned[chestId] ?? 0) + n } } };
}

/** Total unopened chests of all kinds. */
export function chestCount(state: GameState): number {
  let n = 0;
  for (const v of Object.values(state.chests.owned)) n += v > 0 ? v : 0;
  return n;
}

function copiesMultiplier(cfg: GameConfig, state: GameState): number {
  return 1 + cfg.meta.chestGrowthPerVenue * Math.max(0, (state.stats.venuesEver ?? 1) - 1);
}

interface RolledCard {
  rarity: number;
  cardId: string;
  copies: number;
}

/** Rolls the card and the copies for a card slot of a given rarity (index into RARITIES). */
function rollCard(cfg: GameConfig, chest: Chest, rarityIndex: number, mult: number, seed: number): { card: RolledCard; seed: number } {
  const rarity = RARITIES[rarityIndex];
  const pool = cfg.meta.cards.filter((c) => c.rarity === rarity);
  const pick = rngPick(seed, pool);
  const [lo, hi] = chest.cardCopies[rarity];
  const copies = rngInt(pick.seed, lo, hi);
  return { card: { rarity: rarityIndex, cardId: pick.value.id, copies: Math.max(1, Math.round(copies.value * mult)) }, seed: copies.seed };
}

/** The lowest rarity at or above `min` that has cards in the game, or -1. */
function rollableAtLeast(cfg: GameConfig, min: number): number {
  for (let i = min; i < RARITIES.length; i++) if (cfg.meta.cards.some((c) => c.rarity === RARITIES[i])) return i;
  return -1;
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
 *
 * Choices:
 * - Each slot's kind is rolled independently (chestSlotOdds). If a chest with a guarantee rolled
 *   no card slot at all, its last slot becomes a card slot, so the guarantee always holds.
 * - An upgraded slot rolls its card and copies again from the new rarity; upgrades only ever
 *   raise a slot. A guarantee or protection whose rarity has no cards moves up to the nearest
 *   rarity that has cards (and is skipped when none has).
 * - Gems slots grant at least 1 gem; cash slots pay a whole number of seconds of income.
 * - Reveal order: cash slots, then gems, then cards from the lowest rarity to the highest (ties
 *   keep slot order). Rewards are applied in that order, so `isNew` is true only on the first
 *   reveal of a card the player did not own.
 * - The unopened count for that chest drops by one (the key is removed at 0).
 */
export function openChest(cfg: GameConfig, state: GameState, chestId: string, now: number): { state: GameState; rewards: GrantedReward[] } | null {
  const chest = chestCfg(cfg, chestId);
  if (!chest || (state.chests.owned[chestId] ?? 0) < 1) return null;
  const mult = copiesMultiplier(cfg, state);
  const slotWeights = effectiveSlotWeights(cfg, chest);
  const rarityWeights = effectiveRarityWeights(cfg, chest);
  let seed = state.rng;

  type Slot = { kind: 'card'; card: RolledCard } | { kind: 'gems'; amount: number } | { kind: 'cash'; seconds: number };
  const slots: Slot[] = [];
  for (let i = 0; i < chest.slots; i++) {
    const kind = rngWeighted(seed, slotWeights);
    seed = kind.seed;
    if (kind.value === 0) {
      const r = rngWeighted(seed, rarityWeights);
      const rolled = rollCard(cfg, chest, r.value, mult, r.seed);
      seed = rolled.seed;
      slots.push({ kind: 'card', card: rolled.card });
    } else if (kind.value === 1) {
      const g = rngInt(seed, chest.gems[0], chest.gems[1]);
      seed = g.seed;
      slots.push({ kind: 'gems', amount: Math.max(1, g.value) });
    } else {
      const c = rngFloat(seed);
      seed = c.seed;
      const [lo, hi] = chest.cashSeconds;
      slots.push({ kind: 'cash', seconds: Math.max(1, Math.round(lo + c.value * (hi - lo))) });
    }
  }

  // Guarantee: convert the last slot into a card slot when the roll produced none.
  const guaranteed = chest.guaranteed ? rollableAtLeast(cfg, rank(chest.guaranteed)) : -1;
  if (guaranteed >= 0 && slots.length > 0 && !slots.some((s) => s.kind === 'card')) {
    const rolled = rollCard(cfg, chest, guaranteed, mult, seed);
    seed = rolled.seed;
    slots[slots.length - 1] = { kind: 'card', card: rolled.card };
  }

  const cardSlots = slots.filter((s): s is Extract<Slot, { kind: 'card' }> => s.kind === 'card');
  let sinceEpic = state.chests.sinceEpic;
  let sinceLegendary = state.chests.sinceLegendary;
  if (cardSlots.length > 0) {
    const best = () => Math.max(...cardSlots.map((s) => s.card.rarity));
    let target = -1;
    if (guaranteed >= 0 && best() < guaranteed) target = guaranteed;
    const { epic, legendary } = cfg.meta.pity;
    const epicAt = rollableAtLeast(cfg, rank('epic'));
    const legendaryAt = rollableAtLeast(cfg, rank('legendary'));
    if (epic !== undefined && epicAt >= 0 && sinceEpic >= epic - 1 && best() < epicAt) target = Math.max(target, epicAt);
    if (legendary !== undefined && legendaryAt >= 0 && sinceLegendary >= legendary - 1 && best() < legendaryAt) target = Math.max(target, legendaryAt);
    const last = cardSlots[cardSlots.length - 1];
    if (target > last.card.rarity) {
      const rolled = rollCard(cfg, chest, target, mult, seed);
      seed = rolled.seed;
      last.card = rolled.card;
    }
    const top = best();
    sinceEpic = top >= rank('epic') ? 0 : sinceEpic + 1;
    sinceLegendary = top >= rank('legendary') ? 0 : sinceLegendary + 1;
  }

  // Reveal order: cash, gems, then cards from common to legendary.
  const order = (s: Slot) => (s.kind === 'cash' ? -2 : s.kind === 'gems' ? -1 : s.card.rarity);
  const revealed = slots.map((s, i) => ({ s, i })).sort((a, b) => order(a.s) - order(b.s) || a.i - b.i).map((x) => x.s);

  const left = (state.chests.owned[chestId] ?? 0) - 1;
  const owned = { ...state.chests.owned };
  if (left > 0) owned[chestId] = left;
  else delete owned[chestId];
  let s: GameState = {
    ...state,
    rng: seed,
    chests: { ...state.chests, owned, sinceEpic, sinceLegendary },
    stats: { ...state.stats, chestsOpened: state.stats.chestsOpened + 1 },
  };
  const rewards: GrantedReward[] = [];
  for (const slot of revealed) {
    const reward: Reward =
      slot.kind === 'card'
        ? { type: 'card', cardId: slot.card.cardId, copies: slot.card.copies }
        : slot.kind === 'gems'
          ? { type: 'gems', amount: slot.amount }
          : { type: 'cash', seconds: slot.seconds };
    const res = applyReward(cfg, s, reward, now, `chest:${chestId}`);
    s = res.state;
    rewards.push(res.granted);
  }
  return { state: s, rewards };
}

/**
 * Haptic pulses for each revealed reward of a chest, following the research budget: none on a
 * flip or for gems and cash, 1 for a common or rare card, 2 for an epic, 4 for a legendary, and
 * never more than `budget` (10) for the whole chest; when over budget the lowest rarities lose
 * theirs first, so the best card always keeps its pulses. The UI fires them from the reveal
 * animation timeline, 80 ms or more apart.
 */
export function chestRevealPulses(cfg: GameConfig, rewards: GrantedReward[], budget = 10): number[] {
  const per: Record<Rarity, number> = { common: 1, rare: 1, epic: 2, legendary: 4 };
  const pulses = rewards.map((g) => {
    if (g.type !== 'card') return 0;
    const card = cfg.meta.cards.find((c) => c.id === g.cardId);
    return card ? per[card.rarity] : 0;
  });
  let total = pulses.reduce((a, b) => a + b, 0);
  // Reveal order is lowest rarity first, so trimming from the front keeps the best.
  for (let i = 0; i < pulses.length && total > budget; i++) {
    const cut = Math.min(pulses[i], total - budget);
    pulses[i] -= cut;
    total -= cut;
  }
  return pulses;
}

/**
 * Buys a chest with gems (it goes to the inventory). Returns the same state when it can't be bought.
 * Choice: only when the game sells chests at all (meta.chestsForSale) and the chest has a gem
 * price. The country check is the caller's (chestSalesAllowed needs the region, which is not in
 * the state).
 */
export function buyChest(cfg: GameConfig, state: GameState, chestId: string): GameState {
  const chest = chestCfg(cfg, chestId);
  if (!cfg.meta.chestsForSale || !chest || chest.gemCost === undefined || state.gems < chest.gemCost) return state;
  return grantChest(cfg, { ...state, gems: state.gems - chest.gemCost }, chestId, 1);
}

export interface FreeChestStatus {
  /** Free chests ready to claim right now (0..stored). */
  ready: number;
  /** The storage limit. */
  stored: number;
  /** Milliseconds until the next one is ready, or 0 when storage is full. */
  nextInMs: number;
}

/** Recharge time of the Nth free chest ever (1-based). */
function freePeriodMs(fc: NonNullable<GameConfig['meta']['freeChest']>, n: number): number {
  const first = fc.firstMinutes[n - 1];
  return first !== undefined ? first * MINUTE : fc.everyHours * HOUR;
}

/** Ready count and the moment the next one completes (or the moment storage filled). */
function freeCharges(fc: NonNullable<GameConfig['meta']['freeChest']>, anchor: number, claimed: number, now: number): { ready: number; nextAt: number } {
  let t = anchor;
  let ready = 0;
  const until = Math.max(now, anchor); // a clock moved back never counts as elapsed time
  while (ready < fc.stored) {
    const p = freePeriodMs(fc, claimed + ready + 1);
    if (t + p > until) return { ready, nextAt: t + p };
    t += p;
    ready++;
  }
  return { ready, nextAt: t };
}

/**
 * The free chest recharges on a timer and up to `stored` wait for the player. Mechanics: charges
 * accrue from `state.chests.freeAnchor`, one per recharge period. The period is `everyHours`,
 * except that the Nth chest ever (N = freeClaimed + 1) uses `firstMinutes[N - 1]` when that entry
 * exists. An anchor of 0 means "start counting now" (treat it as `now`, i.e. nothing ready yet,
 * unless firstMinutes[0] is 0). Returns null when the game has no free chest.
 * The countdown: show `nextInMs` (recompute it every second from the state and Date.now(); never
 * keep a separate timer). When the clock was moved back before the anchor, nothing is ready and
 * the countdown shows at most one full period.
 */
export function freeChestStatus(cfg: GameConfig, state: GameState, now: number): FreeChestStatus | null {
  const fc = cfg.meta.freeChest;
  if (!fc) return null;
  const anchor = state.chests.freeAnchor > 0 ? state.chests.freeAnchor : now;
  const { ready, nextAt } = freeCharges(fc, anchor, state.chests.freeClaimed, now);
  const full = ready >= fc.stored;
  const period = freePeriodMs(fc, state.chests.freeClaimed + ready + 1);
  return { ready, stored: fc.stored, nextInMs: full ? 0 : Math.min(period, Math.max(0, nextAt - Math.max(now, anchor))) };
}

/** Starts the free-chest timer if it has not started (anchor 0). Call on boot. */
export function startFreeChestTimer(cfg: GameConfig, state: GameState, now: number): GameState {
  if (!cfg.meta.freeChest || state.chests.freeAnchor > 0) return state;
  return { ...state, chests: { ...state.chests, freeAnchor: now } };
}

/**
 * Claims one ready free chest into the inventory. If storage was full the timer restarts from
 * now; otherwise the anchor moves forward one period, so partial progress is kept. No-op when
 * none is ready.
 * Choice: "restarts from now" applies to the chest that was not recharging while storage was
 * full; chests still waiting in storage stay ready (the anchor is set so that exactly they are
 * counted and the next one completes one period after now).
 */
export function claimFreeChest(cfg: GameConfig, state: GameState, now: number): GameState {
  const fc = cfg.meta.freeChest;
  if (!fc || !chestCfg(cfg, fc.chestId)) return state;
  const anchor = state.chests.freeAnchor > 0 ? state.chests.freeAnchor : now;
  const claimed = state.chests.freeClaimed;
  const { ready } = freeCharges(fc, anchor, claimed, now);
  if (ready < 1) return state;
  let nextAnchor: number;
  if (ready >= fc.stored) {
    nextAnchor = Math.max(now, anchor);
    for (let k = 0; k < ready - 1; k++) nextAnchor -= freePeriodMs(fc, claimed + 2 + k);
  } else {
    nextAnchor = anchor + freePeriodMs(fc, claimed + 1);
  }
  const s = grantChest(cfg, state, fc.chestId, 1);
  return { ...s, chests: { ...s.chests, freeAnchor: nextAnchor, freeClaimed: claimed + 1 } };
}

export interface AdChestStatus {
  /** Rewarded-ad chests still available today. */
  left: number;
  /** Milliseconds until the next one may be watched (0 = now). */
  nextInMs: number;
}

/** Today's ad-chest count, honouring a clock that was moved back. */
function adToday(state: GameState, now: number): { day: string; count: number } {
  const day = laterDay(dayKey(now), state.chests.adDay);
  return { day, count: state.chests.adDay === day ? state.chests.adCount : 0 };
}

/**
 * The rewarded-ad chest: `perDay` per local day, at least `cooldownMinutes` apart. Null when the game has none.
 * Choice: with none left today, `nextInMs` is the time until local midnight (or the cooldown, if
 * longer). The cooldown never shows more than its full length, even after the clock moved back.
 */
export function adChestStatus(cfg: GameConfig, state: GameState, now: number): AdChestStatus | null {
  const ac = cfg.meta.adChest;
  if (!ac) return null;
  const { count } = adToday(state, now);
  const left = Math.max(0, ac.perDay - count);
  const cooldown = Math.min(ac.cooldownMinutes * MINUTE, Math.max(0, state.chests.adNextAt - now));
  return { left, nextInMs: left > 0 ? cooldown : Math.max(cooldown, msUntilNextDay(now)) };
}

/**
 * True when randomised chests may be sold (for gems or money) to this player: the game has
 * `meta.chestsForSale` on AND the country is not in `chestSalesBlockedIn`. `region` is an ISO
 * 3166-1 alpha-2 code, or null when unknown; an unknown country counts as blocked (we only sell
 * random items where we know it is allowed). Where this is false the UI must hide chest prices
 * and every deal or paid daily offer that contains a chest; chests can still be earned, and a
 * FREE daily item may still be a chest.
 * Choice: codes compare case-insensitively; anything that is not two letters counts as unknown.
 * (src/services/region.ts says "unknown = nothing restricted"; for chest sales this contract wins.)
 */
export function chestSalesAllowed(cfg: GameConfig, region: string | null): boolean {
  if (!cfg.meta.chestsForSale || region === null) return false;
  const code = region.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return false;
  return !cfg.meta.chestSalesBlockedIn.some((c) => c.toUpperCase() === code);
}

/** True when a reward list contains a chest (such offers are hidden where chest sales are not allowed). */
export function containsChest(rewards: Reward[]): boolean {
  return rewards.some((r) => r.type === 'chest');
}

/** Grants the rewarded-ad chest (call after the ad was watched). No-op when the daily limit is used up or the cooldown is running. */
export function grantAdChest(cfg: GameConfig, state: GameState, now: number): GameState {
  const ac = cfg.meta.adChest;
  const status = adChestStatus(cfg, state, now);
  if (!ac || !status || status.left <= 0 || status.nextInMs > 0 || !chestCfg(cfg, ac.chestId)) return state;
  const { day, count } = adToday(state, now);
  const s = grantChest(cfg, state, ac.chestId, 1);
  return { ...s, chests: { ...s.chests, adDay: day, adCount: count + 1, adNextAt: now + ac.cooldownMinutes * MINUTE } };
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

type MissionType = MissionTemplate['type'];

/** The counter a mission type follows. */
function missionCounter(state: GameState, type: MissionType): number {
  switch (type) {
    case 'serve':
      return state.stats.served;
    case 'earn':
      return state.lifetimeEarnings;
    case 'levels':
      return state.stats.levelsBought;
    case 'taps':
      return state.stats.taps;
    case 'bonus':
      return state.stats.bonusCaught;
    case 'chests':
      return state.stats.chestsOpened;
    case 'rush':
      return state.stats.rushes;
    case 'hires':
      return state.stats.hires;
  }
}

/** False for types that cannot progress in this game (or, for hires, in this run any more). */
function missionTypeUsable(cfg: GameConfig, state: GameState, type: MissionType): boolean {
  switch (type) {
    case 'serve':
    case 'rush':
      return isSim(cfg);
    case 'chests':
      return cfg.meta.chests.length > 0;
    case 'hires':
      // Something is still left to hire: a venue not opened yet, or an open venue with a hire to buy.
      return venueIds(cfg).some((id) => {
        const v = state.venues[id];
        if (!v || !v.unlocked) return true;
        return cfg.businesses.some((b) => !v.businesses[b.id]?.managed) || (v.chain !== null && !v.chain.transportManaged);
      });
    default:
      return true;
  }
}

/** The clock refreshMissions works with when the caller gives none (see refreshMissions). */
function missionClock(state: GameState): { now: number; day: string } {
  const now = state.lastSavedAt;
  let day = laterDay(dayKey(now), state.missions.day);
  if (state.dailyShop.day !== null && state.dailyShop.day > day) day = state.dailyShop.day;
  return { now, day };
}

function missionTarget(cfg: GameConfig, state: GameState, t: MissionTemplate, now: number): number {
  const done = state.missions.completed[t.id] ?? 0;
  const n = t.targets[Math.min(done, t.targets.length - 1)];
  if (t.type !== 'earn') return Math.max(1, Math.round(n));
  const cash = Math.max(incomePerSecond(cfg, state, now) * n, tapValue(cfg, state, now) * n);
  return Math.max(1, twoDigits(cash));
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
 *
 * Choices:
 * - `now` is optional so existing callers keep working. Without it the clock is the state's own:
 *   `lastSavedAt` for income, and for the day the latest of that day, `missions.day` and
 *   `dailyShop.day` (the store refreshes the daily shop with the real clock right before this,
 *   so a new day is noticed on the same pass). Passing `now` is better.
 * - The limit counts missions handed out too: a slot is only filled while
 *   doneToday + filled slots < perDay, so exactly `perDay` can be claimed in a day and the list
 *   empties out at the end instead of leaving finished missions that cannot be claimed.
 * - Ties are broken by template order in the config. Slots beyond `slots` (config shrank) are
 *   dropped from the end. "hires" is also skipped while nothing at all is left to hire.
 */
export function refreshMissions(cfg: GameConfig, state: GameState, now?: number): GameState {
  const m = cfg.meta.missions;
  const clock = now === undefined ? missionClock(state) : { now, day: laterDay(dayKey(now), state.missions.day) };
  const byId = new Map(m.templates.map((t) => [t.id, t]));
  const slots = state.missions.slots.filter((sl) => byId.has(sl.templateId)).slice(0, m.slots);
  let doneToday = state.missions.doneToday;
  let day = state.missions.day;
  if (day !== clock.day) {
    day = clock.day;
    doneToday = 0;
  }
  while (slots.length < m.slots && doneToday + slots.length < m.perDay) {
    const used = new Set(slots.map((sl) => sl.templateId));
    const types = new Set(slots.map((sl) => byId.get(sl.templateId)!.type));
    let best: MissionTemplate | null = null;
    let bestKey: [number, number] = [Infinity, Infinity];
    for (const t of m.templates) {
      if (used.has(t.id) || !missionTypeUsable(cfg, state, t.type)) continue;
      const key: [number, number] = [types.has(t.type) ? 1 : 0, state.missions.completed[t.id] ?? 0];
      if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
        best = t;
        bestKey = key;
      }
    }
    if (!best) break;
    slots.push({ templateId: best.id, target: missionTarget(cfg, state, best, clock.now), start: missionCounter(state, best.type) });
  }
  const sameSlots = slots.length === state.missions.slots.length && slots.every((sl, i) => sl === state.missions.slots[i]);
  if (sameSlots && day === state.missions.day && doneToday === state.missions.doneToday) return state;
  return { ...state, missions: { ...state.missions, slots: sameSlots ? state.missions.slots : slots, day, doneToday } };
}

function missionText(cfg: GameConfig, t: MissionTemplate, target: number): string {
  const n = t.type === 'earn' ? cfg.strings.currencySymbol + formatNumber(target) : formatNumber(target);
  return t.text.replace('{n}', n);
}

/**
 * The missions on offer, with live progress. Counters: serve = stats.served, earn =
 * lifetimeEarnings, levels = stats.levelsBought, taps = stats.taps, bonus = stats.bonusCaught,
 * chests = stats.chestsOpened, rush = stats.rushes, hires = stats.hires. Progress is the counter
 * now minus its value when the mission was handed out.
 * Choice: progress is rounded down (guests served off screen are fractional estimates). Slots
 * whose template was removed from the config are left out (refreshMissions drops them).
 */
export function missionViews(cfg: GameConfig, state: GameState): MissionView[] {
  const views: MissionView[] = [];
  state.missions.slots.forEach((sl, index) => {
    const t = cfg.meta.missions.templates.find((x) => x.id === sl.templateId);
    if (!t) return;
    const progress = Math.min(sl.target, Math.max(0, Math.floor(missionCounter(state, t.type) - sl.start + 1e-9)));
    views.push({ index, templateId: t.id, text: missionText(cfg, t, sl.target), progress, target: sl.target, done: progress >= sl.target, reward: t.reward });
  });
  return views;
}

/**
 * Claims a finished mission: grants its reward, plus the reward of every `milestones` entry whose
 * `every` divides the new total of completed missions; counts the completion (per template, in
 * total and for today); frees the slot and refills. Null when the mission is not done.
 * Choice: the freed slot is removed (later slots move up one index) and the refill appends at
 * the end. Granted rewards: the mission's own first, then milestones in config order.
 */
export function claimMission(cfg: GameConfig, state: GameState, index: number, now: number): { state: GameState; granted: GrantedReward[] } | null {
  const view = missionViews(cfg, state).find((v) => v.index === index);
  if (!view || !view.done) return null;
  const today = laterDay(dayKey(now), state.missions.day);
  const doneToday = (state.missions.day === today ? state.missions.doneToday : 0) + 1;
  const total = state.missions.total + 1;
  let s: GameState = {
    ...state,
    missions: {
      ...state.missions,
      slots: state.missions.slots.filter((_, i) => i !== index),
      completed: { ...state.missions.completed, [view.templateId]: (state.missions.completed[view.templateId] ?? 0) + 1 },
      total,
      day: today,
      doneToday,
    },
  };
  const rewards: Reward[] = [view.reward, ...cfg.meta.missions.milestones.filter((ms) => total % ms.every === 0).map((ms) => ms.reward)];
  const res = applyRewards(cfg, s, rewards, now, `mission:${view.templateId}`);
  s = refreshMissions(cfg, res.state, now);
  return { state: s, granted: res.granted };
}

// ---------------------------------------------------------------- deals

export interface DealView {
  deal: Deal;
  /** Epoch ms when the offer really ends, or null for a permanent shop item. */
  endsAt: number | null;
  purchasesLeft: number;
}

function dealTriggered(cfg: GameConfig, state: GameState, deal: Deal): boolean {
  const t = deal.trigger;
  switch (t.type) {
    case 'always':
      return true;
    case 'playSeconds':
      return state.stats.playSeconds >= t.seconds;
    case 'sessions':
      return state.stats.sessions >= t.count;
    case 'prestige':
      return state.prestigeCount >= t.count;
    case 'lifetimeEarnings':
      return state.lifetimeEarnings >= t.amount;
    case 'venue':
      return isSim(cfg) && state.venues[t.venueId]?.unlocked === true;
  }
}

/** When a started deal ends: fixed at start; derived from the config only for old saves. */
function dealEndsAt(deal: Deal, ds: DealState): number | null {
  if (ds.endsAt !== undefined) return ds.endsAt;
  return deal.durationHours !== undefined ? ds.startedAt + deal.durationHours * HOUR : null;
}

/**
 * Starts every deal whose trigger has fired and that has not started yet (records startedAt).
 * Triggers: always; playSeconds (stats.playSeconds); sessions (stats.sessions); prestige
 * (prestigeCount); lifetimeEarnings; venue (that venue is open).
 * A deal is active from then until startedAt + durationHours (forever without a duration),
 * while purchases are left. Timers are real: an expired deal never comes back.
 * Call on boot, after prestige and now and then while playing.
 * Choice: `endsAt` is written once, at the start, and never recomputed; a "venue" trigger
 * counts the venue as open in the current run (a reset closes it, but a started deal stays).
 */
export function refreshDeals(cfg: GameConfig, state: GameState, now: number): GameState {
  let deals: GameState['deals'] | null = null;
  for (const d of cfg.meta.deals) {
    if (state.deals[d.id] || !dealTriggered(cfg, state, d)) continue;
    deals ??= { ...state.deals };
    deals[d.id] = { startedAt: now, endsAt: d.durationHours !== undefined ? now + d.durationHours * HOUR : null, purchases: 0, seen: false };
  }
  return deals ? { ...state, deals } : state;
}

function dealView(cfg: GameConfig, state: GameState, deal: Deal, now: number): DealView | null {
  const ds = state.deals[deal.id];
  if (!ds) return null;
  const endsAt = dealEndsAt(deal, ds);
  const purchasesLeft = deal.maxPurchases - ds.purchases;
  if (purchasesLeft <= 0 || (endsAt !== null && now >= endsAt)) return null;
  return { deal, endsAt, purchasesLeft };
}

/** Deals the player can buy right now, soonest-ending first. Choice: permanent items last, ties in config order. */
export function activeDeals(cfg: GameConfig, state: GameState, now: number): DealView[] {
  const list: DealView[] = [];
  for (const d of cfg.meta.deals) {
    const v = dealView(cfg, state, d, now);
    if (v) list.push(v);
  }
  return list.sort((a, b) => (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity));
}

/** An active time-limited deal the player has not been shown yet (for a one-time popup), or null. Permanent shop items never pop up. */
export function dealToShow(cfg: GameConfig, state: GameState, now: number): Deal | null {
  return activeDeals(cfg, state, now).find((v) => v.endsAt !== null && !state.deals[v.deal.id].seen)?.deal ?? null;
}

export function markDealSeen(state: GameState, dealId: string): GameState {
  const ds = state.deals[dealId];
  if (!ds || ds.seen) return state;
  return { ...state, deals: { ...state.deals, [dealId]: { ...ds, seen: true } } };
}

function countDealPurchase(state: GameState, deal: Deal, now: number): GameState {
  const ds: DealState = state.deals[deal.id] ?? {
    startedAt: now,
    endsAt: deal.durationHours !== undefined ? now + deal.durationHours * HOUR : null,
    purchases: 0,
    seen: true,
  };
  return { ...state, deals: { ...state.deals, [deal.id]: { ...ds, purchases: ds.purchases + 1, seen: true } } };
}

/** Buys a gem-priced deal. Null when it is not active, sold out, priced in money, or the player lacks gems. */
export function buyDealWithGems(cfg: GameConfig, state: GameState, dealId: string, now: number): { state: GameState; granted: GrantedReward[] } | null {
  const deal = cfg.meta.deals.find((d) => d.id === dealId);
  if (!deal || deal.productId || deal.gemCost === undefined || state.gems < deal.gemCost) return null;
  if (!dealView(cfg, state, deal, now)) return null;
  const paid = countDealPurchase({ ...state, gems: state.gems - deal.gemCost }, deal, now);
  return applyRewards(cfg, paid, deal.contents, now, `deal:${deal.id}`);
}

/**
 * Grants a money-priced deal after the store has confirmed payment: applies the contents and
 * counts the purchase. Null when the deal is unknown. (It still grants if the timer ran out
 * while the payment sheet was open: the player paid.)
 * Choice: it also grants past the purchase limit and for a deal that never started (a restored
 * or delayed transaction); the purchase is recorded either way.
 */
export function grantDeal(cfg: GameConfig, state: GameState, dealId: string, now: number): { state: GameState; granted: GrantedReward[] } | null {
  const deal = cfg.meta.deals.find((d) => d.id === dealId);
  if (!deal) return null;
  return applyRewards(cfg, countDealPurchase(state, deal, now), deal.contents, now, `deal:${deal.id}`);
}

// ---------------------------------------------------------------- daily shop

export interface DailyOfferView {
  offer: DailyOffer;
  bought: boolean;
}

/** Picks up to `n` distinct offers by weight. */
function pickOffers(pool: DailyOffer[], n: number, seed: number): { ids: string[]; seed: number } {
  const left = [...pool];
  const ids: string[] = [];
  while (ids.length < n && left.length > 0) {
    const r = rngWeighted(seed, left.map((o) => o.weight));
    seed = r.seed;
    ids.push(left[r.value].id);
    left.splice(r.value, 1);
  }
  return { ids, seed };
}

/**
 * On a new local day: picks today's offers with the seeded RNG (weights respected, no repeats;
 * when the config has free offers, exactly one free offer comes first) and clears what was
 * bought. Does nothing on the same day. Call on boot and when the day changes.
 * Choices: `slots` counts the free offer, and the other slots are filled from the priced offers
 * only (so there is exactly one free one). A day key earlier than the saved one (clock moved
 * back) is not a new day. The day is recorded even when the game has no offers.
 */
export function refreshDailyShop(cfg: GameConfig, state: GameState, now: number): GameState {
  const today = dayKey(now);
  if (state.dailyShop.day !== null && today <= state.dailyShop.day) return state;
  const offers = cfg.meta.dailyShop.offers;
  const free = offers.filter((o) => o.gemCost === 0);
  const paid = offers.filter((o) => o.gemCost > 0);
  const slots = cfg.meta.dailyShop.slots;
  let seed = state.rng;
  let ids: string[] = [];
  if (free.length > 0) {
    const f = pickOffers(free, 1, seed);
    const p = pickOffers(paid, slots - 1, f.seed);
    ids = [...f.ids, ...p.ids];
    seed = p.seed;
  } else {
    const p = pickOffers(paid, slots, seed);
    ids = p.ids;
    seed = p.seed;
  }
  return { ...state, rng: offers.length > 0 ? seed : state.rng, dailyShop: { day: today, offerIds: ids, bought: [] } };
}

export function dailyOffers(cfg: GameConfig, state: GameState): DailyOfferView[] {
  const views: DailyOfferView[] = [];
  for (const id of state.dailyShop.offerIds) {
    const offer = cfg.meta.dailyShop.offers.find((o) => o.id === id);
    if (offer) views.push({ offer, bought: state.dailyShop.bought.includes(id) });
  }
  return views;
}

/**
 * Buys (or claims, when free) one of today's offers, once per day. Null when it can't be bought.
 * Choice: when the saved shop is from an earlier day, the shop is refreshed first, so an offer
 * from yesterday can no longer be bought.
 */
export function buyDailyOffer(cfg: GameConfig, state: GameState, offerId: string, now: number): { state: GameState; granted: GrantedReward[] } | null {
  const s = refreshDailyShop(cfg, state, now);
  const offer = cfg.meta.dailyShop.offers.find((o) => o.id === offerId);
  if (!offer || !s.dailyShop.offerIds.includes(offerId) || s.dailyShop.bought.includes(offerId) || s.gems < offer.gemCost) return null;
  const paid: GameState = { ...s, gems: s.gems - offer.gemCost, dailyShop: { ...s.dailyShop, bought: [...s.dailyShop.bought, offerId] } };
  return applyRewards(cfg, paid, [offer.reward], now, `daily:${offerId}`);
}

/** Milliseconds until the local day changes (the shop's honest countdown). */
export function msUntilNextDay(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now;
}

// ---------------------------------------------------------------- sessions

/** Minutes away after which coming back counts as a new play session. */
export const SESSION_GAP_MINUTES = 30;

/**
 * Call once on boot with the loaded state: counts a new session when this is the first one or
 * the player was away longer than SESSION_GAP_MINUTES (measured from state.lastSavedAt).
 * Choice: exactly 30 minutes is not "longer"; a clock moved back is not a new session.
 */
export function registerSession(state: GameState, now: number): GameState {
  if (state.stats.sessions > 0 && now - state.lastSavedAt <= SESSION_GAP_MINUTES * MINUTE) return state;
  return { ...state, stats: { ...state.stats, sessions: state.stats.sessions + 1 } };
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

/** Play time after which a player who has automated the first venue is left alone. */
export const HINT_VETERAN_SECONDS = 180;

/**
 * Tutorial guidance for the first minutes, computed from state alone (no stored tutorial step):
 * the most useful action available right now in the venue on screen, in the priority order the
 * first session teaches (claim what is ready; run the chain by hand; fix the bottleneck; hire).
 * Returns null once the player clearly knows the loop (e.g. after `stats.playSeconds` passes a
 * few minutes AND the first venue's transport is automated), so veterans are never nagged.
 *
 * Choices, in priority order:
 * - null for a veteran: prestigeCount > 0, or playSeconds >= HINT_VETERAN_SECONDS and the first
 *   venue is automated (its transport hire in sim mode, its first business's hire in classic).
 * - claimMission (first finished one), then openChest (an unopened chest, or a free one ready).
 * - An affordable automation hire beats everything below it: a station's (in config order), then
 *   the transport's. Levels are always cheaper, so "hire" would otherwise never show.
 * - Buy at the bottleneck, if affordable: the stage with the lowest capacity (stations counted
 *   as if they ran non-stop, transport as if it never waited for the bell). For production, the
 *   cheapest affordable next level of an owned station, else the next station's first level.
 *   It comes before the manual loop because the manual loop is always available, so "buy"
 *   would otherwise never show; a new game starts with no cash, so the first hints are still
 *   tap and bell.
 * - bell: transport not automated, goods on the pass and an idle worker.
 * - tapStation: an owned, idle station without its hire (first in config order).
 * - Otherwise null (nothing useful to point at; the player is waiting for cash).
 */
export function nextHint(cfg: GameConfig, state: GameState, now: number): Hint | null {
  const sim = isSim(cfg);
  const firstVenue = state.venues[venueIds(cfg)[0]];
  const automated = sim ? firstVenue?.chain?.transportManaged === true : firstVenue?.businesses[cfg.businesses[0].id]?.managed === true;
  if (state.prestigeCount > 0 || (state.stats.playSeconds >= HINT_VETERAN_SECONDS && automated)) return null;

  const mission = missionViews(cfg, state).find((m) => m.done);
  if (mission) return { kind: 'claimMission', index: mission.index };
  if (chestCount(state) > 0 || (freeChestStatus(cfg, state, now)?.ready ?? 0) > 0) return { kind: 'openChest' };

  const venueId = state.activeVenue;
  const v = state.venues[venueId];
  if (!v || !v.unlocked) return null;
  const cash = state.cash;

  for (const b of cfg.businesses) {
    const bs = v.businesses[b.id];
    if (bs && bs.owned > 0 && !bs.managed && managerCost(cfg, venueId, b.id) <= cash) return { kind: 'hireBusiness', businessId: b.id };
  }
  const chain = v.chain;
  if (sim && chain && !chain.transportManaged && transportManagerCost(cfg, venueId) <= cash) return { kind: 'hireTransport' };

  // The bottleneck, with every stage at full speed.
  let production = 0;
  for (const b of cfg.businesses) {
    if ((v.businesses[b.id]?.owned ?? 0) > 0) production += stationValue(cfg, state, venueId, b.id) / cycleSeconds(cfg, state, venueId, b.id);
  }
  let stage: 'production' | 'transport' | 'sales' = 'production';
  const params = chainParams(cfg, state, venueId);
  if (sim && chain && params) {
    const transport = transportRate(params, chain.workers.length);
    const sales = salesRate(params, chain.seats.length);
    if (transport < production && transport <= sales) stage = 'transport';
    else if (sales < production && sales < transport) stage = 'sales';
  }
  const buy = bottleneckBuy();
  if (buy) return buy;

  if (sim && chain && !chain.transportManaged && chain.buffer > 1e-9 && idleWorkers(chain) > 0) return { kind: 'bell' };
  for (const b of cfg.businesses) {
    const bs = v.businesses[b.id];
    if (bs && bs.owned > 0 && !bs.managed && !bs.running) return { kind: 'tapStation', businessId: b.id };
  }

  return null;

  function bottleneckBuy(): Hint | null {
    if (stage === 'transport') return transportCost(cfg, state, venueId, 1) <= cash ? { kind: 'buyTransport' } : null;
    if (stage === 'sales') return salesCost(cfg, state, venueId, 1) <= cash ? { kind: 'buySales' } : null;
    let best: { id: string; cost: number } | null = null;
    for (const b of cfg.businesses) {
      if ((v!.businesses[b.id]?.owned ?? 0) === 0) continue;
      const cost = businessCost(cfg, state, venueId, b.id, 1);
      if (cost <= cash && (!best || cost < best.cost)) best = { id: b.id, cost };
    }
    if (best) return { kind: 'buyBusiness', businessId: best.id };
    const next = cfg.businesses.find((b) => (v!.businesses[b.id]?.owned ?? 0) === 0);
    if (next && businessCost(cfg, state, venueId, next.id, 1) <= cash) return { kind: 'buyBusiness', businessId: next.id };
    return null;
  }
}
