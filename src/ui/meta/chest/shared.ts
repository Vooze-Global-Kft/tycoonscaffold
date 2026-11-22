/**
 * Small helpers shared by the chest and card screens: looking cards up, the rarity of a granted
 * reward, how a card stat is worded for players, and the progressive card state during a reveal.
 * Pure functions on the config and state, so every screen words things the same way.
 */
import { RARITIES, type Card, type CardStat, type GameConfig, type Rarity } from '../../../config/schema';
import { cardPercent, copiesForNextLevel } from '../../../engine/cards';
import type { GrantedReward } from '../../../engine/meta';
import type { GameState } from '../../../engine/types';
import { stageInfo } from '../../theme';

export function cardOf(cfg: GameConfig, cardId: string): Card | undefined {
  return cfg.meta.cards.find((c) => c.id === cardId);
}

export function rarityIndex(r: Rarity): number {
  return RARITIES.indexOf(r);
}

/** Rarity of a granted reward, or null for cash, gems and everything that is not a card. */
export function rewardRarity(cfg: GameConfig, g: GrantedReward): Rarity | null {
  if (g.type !== 'card') return null;
  return cardOf(cfg, g.cardId)?.rarity ?? null;
}

/** The best rarity really inside a chest's result (drives the lid glow: the tell always equals the result). */
export function bestRarity(cfg: GameConfig, rewards: GrantedReward[]): Rarity | null {
  let best = -1;
  for (const g of rewards) {
    const r = rewardRarity(cfg, g);
    if (r) best = Math.max(best, rarityIndex(r));
  }
  return best >= 0 ? RARITIES[best] : null;
}

/**
 * Lid glow and particle colours per rarity. Brighter than RARITY_COLORS (which are for frames and
 * text on cream): a glow has to read as light over a dark backdrop.
 */
export const RARITY_GLOW: Record<Rarity, string> = { common: '#FFF1D6', rare: '#5CB8FF', epic: '#C77DFF', legendary: '#FFC93C' };

/** What a stat is called for players, in the game's own stage names where one applies. */
export function statLabel(cfg: GameConfig, stat: CardStat): string {
  const st = stageInfo(cfg);
  const sim = cfg.mode === 'sim' && !!cfg.sim;
  switch (stat) {
    case 'stationValue':
      return sim ? `${st.production.name} value` : 'business profits';
    case 'transportCapacity':
      return sim ? `${st.transport.name} capacity` : 'delivery capacity';
    case 'salesSpend':
      return sim ? `${st.sales.name} spending` : 'sales';
    case 'globalIncome':
      return 'all income';
    case 'tapValue':
      return 'tap earnings';
    case 'offlineEarnings':
      return 'earnings while away';
    case 'bonusValue':
      return `${cfg.economy.bonus.name} value`;
    case 'rushDuration':
      return cfg.sim?.rush ? `${cfg.sim.rush.name} length` : 'rush length';
  }
}

/** The icon of the thing a stat raises (stage icon, bonus icon, ...), for the effect lines. */
export function statIcon(cfg: GameConfig, stat: CardStat): string {
  const st = stageInfo(cfg);
  switch (stat) {
    case 'stationValue':
      return st.production.icon;
    case 'transportCapacity':
      return st.transport.icon;
    case 'salesSpend':
      return st.sales.icon;
    case 'globalIncome':
      return cfg.strings.currencyIcon;
    case 'tapValue':
      return '👆';
    case 'offlineEarnings':
      return cfg.theme.icons.offline;
    case 'bonusValue':
      return cfg.theme.icons.bonus;
    case 'rushDuration':
      return cfg.sim?.rush?.icon ?? '⏱️';
  }
}

/** "+12 %" with at most one decimal, the way every card screen shows a bonus. */
export function formatPercent(p: number): string {
  const v = Math.round(p * 10) / 10;
  return `+${Number.isInteger(v) ? v : v.toFixed(1)} %`;
}

export function cardEffectLine(cfg: GameConfig, card: Card, level: number): string {
  return `${formatPercent(cardPercent(cfg, card, Math.max(1, level)))} ${statLabel(cfg, card.stat)}`;
}

/** A card's level and copies after one reveal of a chest, counting only the copies revealed so far. */
export interface CardProgress {
  level: number;
  copies: number;
  needed: number;
  canLevel: boolean;
}

/**
 * The chest's rewards are already applied to the state when the overlay starts, so the card state
 * holds every copy of the whole chest. For the level bar under reveal `i`, take away the copies of
 * the same card that are revealed later.
 */
export function progressAfterReveal(cfg: GameConfig, cards: GameState['cards'], rewards: GrantedReward[], i: number): CardProgress | null {
  const g = rewards[i];
  if (!g || g.type !== 'card') return null;
  const final = cards[g.cardId] ?? { level: 1, copies: 0 };
  let later = 0;
  for (let j = i + 1; j < rewards.length; j++) {
    const o = rewards[j];
    if (o.type === 'card' && o.cardId === g.cardId) later += o.copies;
  }
  const level = Math.max(1, final.level);
  const copies = Math.max(0, final.copies - later);
  const needed = copiesForNextLevel(cfg, level);
  return { level, copies, needed, canLevel: copies >= needed };
}

/** Cards a player can level up right now (for badges). */
export function levelReadyCount(cfg: GameConfig, cards: GameState['cards']): number {
  let n = 0;
  for (const c of cfg.meta.cards) {
    const s = cards[c.id];
    if (s && s.level > 0 && s.copies >= copiesForNextLevel(cfg, s.level)) n++;
  }
  return n;
}
