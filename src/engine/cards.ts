/**
 * Staff cards: what a card is worth. Collecting, levelling and chests live in
 * meta.ts; this file is only the maths the economy needs, so it has no
 * dependency on the rest of the engine.
 */
import type { Card, CardStat, GameConfig } from '../config/schema';
import type { GameState } from './types';

/** Bonus in percent a card gives at a level (0 when not owned). */
export function cardPercent(cfg: GameConfig, card: Card, level: number): number {
  if (level <= 0) return 0;
  const e = cfg.meta.cardEffect[card.rarity];
  return e.base + e.perLevel * (level - 1);
}

/** Multiplier (1 or more) from every owned card that improves `stat`. Cards multiply together. */
export function cardBonus(cfg: GameConfig, state: GameState, stat: CardStat): number {
  let mult = 1;
  for (const card of cfg.meta.cards) {
    if (card.stat !== stat) continue;
    const level = state.cards[card.id]?.level ?? 0;
    if (level > 0) mult *= 1 + cardPercent(cfg, card, level) / 100;
  }
  return mult;
}

/** Copies needed to take a card from `level` to `level + 1`. The first copy unlocks it (level 0 to 1). */
export function copiesForNextLevel(cfg: GameConfig, level: number): number {
  if (level <= 0) return 1;
  const { base, growth } = cfg.meta.cardCopies;
  return Math.max(1, Math.round(base * Math.pow(growth, level - 1)));
}
