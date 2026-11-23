/**
 * The figures a leaderboard may rank. A board in game.json (`leaderboards.boards[].metric`) names
 * one; the platform's own service (Game Center, Play Games) keeps the ranking, the game only sends
 * the number (src/services/boards.ts). Pure.
 *
 * Every figure is a lifetime counter: a whole number that never falls, so the best score a
 * platform keeps is always the latest one. None is money (an idle game's earnings outgrow the 64-bit
 * scores both platforms store, and rank nothing but time played).
 */
import type { GameConfig } from '../config/schema';
import { engineFor } from './mode';
import type { GameState } from './types';

/**
 * The figures every mode has (the built-in sim and classic rules count nothing else): run resets,
 * sales completed (a sim game's paying customers; 0 in a game that counts none) and levels bought.
 */
export const SHARED_METRICS = ['prestiges', 'sales', 'levels'] as const;

/** A score as a platform stores it: a whole number from 0 to 2^53 - 1; anything else is 0. */
export function asScore(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), Number.MAX_SAFE_INTEGER);
}

/** Every figure of this game by name: the shared ones, then the mode's own (src/engine/mode.ts `scores`). */
export function scoresOf(cfg: GameConfig, state: GameState): Record<string, number> {
  const out: Record<string, number> = {
    prestiges: asScore(state.prestigeCount),
    sales: asScore(state.stats.served),
    levels: asScore(state.stats.levelsBought),
  };
  const own = engineFor(cfg)?.scores;
  if (own) for (const [name, value] of Object.entries(own(cfg, state))) out[name] = asScore(value);
  return out;
}

/** The names a board of this game may use (the same list `scoresOf` gives, without a state). */
export function metricNames(cfg: GameConfig, state: GameState): string[] {
  return Object.keys(scoresOf(cfg, state));
}
