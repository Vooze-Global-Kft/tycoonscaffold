/**
 * Derived values and the random streams (spec 2.2, 2.3): `mergeParams(cfg, state)` and the
 * numbers it is made of, read by every other rules file, the screens and the bot.
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: ORDERS calls `mergeParams`,
 * `value`, `ticketPrice`, `paceUnit` and `streamValue` from here; this file reads the modifiers
 * through ONE object, `Mods`, from ORDERS's `currentMods` (src/engine/merge/lanterns.ts).
 *
 * Skeleton bodies: `isMerge` and `streamValue` are built; every other function throws
 * notBuilt('<name>') until MECHANICS writes it.
 */
import type { GameConfig } from '../../config/schema';
import { rngMix4 } from '../rng';
import { notBuilt } from './notBuilt';
import { SITE, type MergeConfig, type MergeGame, type MergeParams, type MergeState, type StreamSite, type Ticket, type TicketLine } from './types';

/** Cash never goes above this (as economy.MAX_CASH). */
export const MAX_CASH = Number.MAX_VALUE;
/** Floating tolerance of comparisons. */
export const EPS = 1e-9;

/** A merge game's config (mode "merge" with its parsed block). Built. */
export function isMerge(cfg: GameConfig): cfg is MergeConfig {
  return cfg.mode === 'merge' && !!cfg.merge && Array.isArray((cfg.merge as { chains?: unknown }).chains);
}

/**
 * One value in [0, 1) of a random site (spec 2.3): `rngMix4(seed, site, n, x)` scaled, with the
 * site's own counter n (drops: that chain's drops, x = chain; Lucky: lifetime merges,
 * x = c × 8 + k; gift: the box index; ticket, shutter, Parade: their counters). Pure: the order of
 * events cannot change a result. Built.
 */
export function streamValue(m: Pick<MergeState, 'seed'>, site: StreamSite, n: number, x = 0): number {
  return rngMix4(m.seed, SITE[site], n, x) / 4294967296;
}

/**
 * Every derived value of spec 2.3 at this state (chains' base tiers, ripe chances, values, stall
 * bonuses, house tiers, costs, Loose_c, O, F, U, the minder rate, β and the modifiers).
 * MECHANICS. Skeleton: throws notBuilt('mergeParams').
 */
export function mergeParams(cfg: MergeConfig, g: MergeGame): MergeParams {
  void cfg;
  void g;
  throw notBuilt('mergeParams');
}

/** value(c, k) = v_c × g^(k−1) × S_c × lanternPay (spec 2.3). MECHANICS. Skeleton: throws notBuilt('value'). */
export function value(cfg: MergeConfig, g: MergeGame, c: number, k: number): number {
  void cfg;
  void g;
  void c;
  void k;
  throw notBuilt('value');
}

/**
 * A ticket's price now (spec 2.1 rule 4, 2.3): Σ value(lines) × (1 + β × (lines − 1)), × the
 * Parade multiplier for a gold ticket. Always the current P: it never falls (a stall level raises it
 * live) and the shown price is the paid one. MECHANICS. Skeleton: throws notBuilt('ticketPrice').
 */
export function ticketPrice(cfg: MergeConfig, g: MergeGame, ticket: Pick<Ticket, 'gold'> & { lines: readonly Pick<TicketLine, 'c' | 'k'>[] }): number {
  void cfg;
  void g;
  void ticket;
  throw notBuilt('ticketPrice');
}

/** U = Σ over open chains of value(c, max(2, best_c − 1)) (spec 2.3). MECHANICS. Skeleton: throws notBuilt('paceUnit'). */
export function paceUnit(cfg: MergeConfig, g: MergeGame): number {
  void cfg;
  void g;
  throw notBuilt('paceUnit');
}

/** Gear base tier b = min(maxBase, 1 + floor((L − 1)/s)) (spec 2.2). MECHANICS. Skeleton: throws notBuilt('baseTier'). */
export function baseTier(cfg: MergeConfig, gearLevel: number): number {
  void cfg;
  void gearLevel;
  throw notBuilt('baseTier');
}

/** A price rounded as 2.2 says (below 1,000 half up to a whole coin, above to 3 significant digits; shown = paid). MECHANICS. Skeleton: throws notBuilt('roundCost'). */
export function roundCost(cfg: MergeConfig, x: number): number {
  void cfg;
  void x;
  throw notBuilt('roundCost');
}
