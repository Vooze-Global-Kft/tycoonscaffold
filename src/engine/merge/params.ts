/**
 * Derived values and the random streams (spec 2.2, 2.3): `mergeParams(cfg, state)` and the
 * numbers it is made of, read by every other rules file, the screens and the bot.
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: ORDERS calls `mergeParams`,
 * `value`, `ticketPrice`, `paceUnit`, `baseTier`, `ripeChance`, `maxPopAt`, `roundCost`,
 * `recentCoins`, `recentRate` and `streamValue` from here; this file reads the modifiers through ONE
 * object, `Mods`, from ORDERS's `currentMods` (src/engine/merge/lanterns.ts), and the season's
 * numbers from ORDERS's `familiarFactor` (src/engine/merge/season.ts).
 *
 * Skeleton bodies: every function here is BUILT (closed-form formulas of 2.2 and 2.3), so ORDERS
 * can test its draw bounds, purse, gift coins and advice on real numbers without MECHANICS. The
 * values move with `currentMods`, which is neutral until ORDERS writes it. MECHANICS owns and
 * tests them (src/engine/mergeMode.test.ts "params").
 *
 * Rounding (spec 2.2): only costs are rounded (`roundCost`: below 1,000 half up to a whole coin,
 * above to 3 significant digits; shown = paid). `value` and `ticketPrice` are not rounded; how a
 * screen prints a ticket's P is the bars package's (src/ui/merge/hud), and it must print what is paid.
 */
import type { GameConfig } from '../../config/schema';
import { rngMix4 } from '../rng';
import { freeCells, isGood } from './board';
import { currentMods } from './lanterns';
import { familiarFactor } from './season';
import { CHAINS, SITE, type ChainParams, type MergeConfig, type MergeGame, type MergeParams, type MergeState, type Mods, type StreamSite, type Ticket, type TicketLine } from './types';

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

// ----------------------------------------------------------------------------- the gear (2.2)

/** Gear base tier b = min(maxBase, 1 + floor((L − 1)/s)) (spec 2.2). Built. */
export function baseTier(cfg: MergeConfig, gearLevel: number): number {
  const { maxBase, step } = cfg.merge.gear;
  return Math.min(maxBase, 1 + Math.floor((Math.max(1, gearLevel) - 1) / step));
}

/**
 * Ripe chance p = ripePerLevel × ((L − 1) mod s) + mods.ripeAdd, at most ripeMax (spec 2.2, 2.3).
 * Built, literally as 2.2 writes it. Known gap of the text (requests.md, for the lead): at the
 * last level, L = 41, the uncapped base would be 5, so b stays 4 and p falls from 0.45 (L = 40) to
 * 0: the last gear purchase makes drops worse. MECHANICS applies the lead's answer here.
 */
export function ripeChance(cfg: MergeConfig, mods: Pick<Mods, 'ripeAdd'>, gearLevel: number): number {
  const { ripePerLevel, ripeMax, step } = cfg.merge.gear;
  return Math.min(ripeMax, ripePerLevel * ((Math.max(1, gearLevel) - 1) % step) + mods.ripeAdd);
}

/** maxPop = b + (p > 0 ? 1 : 0) at a gear level (2.2), pure: best_c when a chain opens or a season starts (seasoned gear). Built. */
export function maxPopAt(cfg: MergeConfig, mods: Pick<Mods, 'ripeAdd'>, gearLevel: number): number {
  return Math.min(8, baseTier(cfg, gearLevel) + (ripeChance(cfg, mods, gearLevel) > EPS ? 1 : 0));
}

// ----------------------------------------------------------------------------- values and prices (2.3)

/** v_c = base × chainStep^c, the tier-1 value before the stall bonus (2.2). */
const chainValue = (cfg: MergeConfig, c: number) => cfg.merge.values.base * Math.pow(cfg.merge.values.chainStep, c);
/** r_c = v_c / 5 (2.2: 5 is the Grill's tier-1 value, `values.base`). */
const chainRatio = (cfg: MergeConfig, c: number) => chainValue(cfg, c) / cfg.merge.values.base;

/** S_c = 1 + bonusPerLevel × (M − 1), at most bonusMax (2.2). */
function stallBonus(cfg: MergeConfig, stall: number): number {
  const { bonusPerLevel, bonusMax } = cfg.merge.stalls;
  return Math.min(bonusMax, 1 + bonusPerLevel * (Math.max(1, stall) - 1));
}

function valueWith(cfg: MergeConfig, m: MergeState, mods: Mods, c: number, k: number): number {
  return chainValue(cfg, c) * Math.pow(cfg.merge.values.tierGrowth, k - 1) * stallBonus(cfg, m.chains[c]?.stall ?? 1) * mods.ticketPay;
}

/** value(c, k) = v_c × g^(k−1) × S_c × lanternPay (spec 2.3), not rounded. Built. */
export function value(cfg: MergeConfig, g: MergeGame, c: number, k: number): number {
  return valueWith(cfg, g.merge, currentMods(cfg, g.merge), c, k);
}

function priceWith(cfg: MergeConfig, m: MergeState, mods: Mods, ticket: Pick<Ticket, 'gold'> & { lines: readonly Pick<TicketLine, 'c' | 'k'>[] }): number {
  const beta = cfg.merge.tickets.beta + mods.betaAdd;
  const sum = ticket.lines.reduce((a, l) => a + valueWith(cfg, m, mods, l.c, l.k), 0);
  return sum * (1 + beta * (ticket.lines.length - 1)) * (ticket.gold ? mods.paradeMultiplier : 1);
}

/**
 * A ticket's price now (spec 2.1 rule 4, 2.3): Σ value(lines) × (1 + β × (lines − 1)), × the
 * Parade multiplier for a gold ticket. Always the current P: it never falls (a stall level raises it
 * live) and the shown price is the paid one. Not rounded. Built.
 */
export function ticketPrice(cfg: MergeConfig, g: MergeGame, ticket: Pick<Ticket, 'gold'> & { lines: readonly Pick<TicketLine, 'c' | 'k'>[] }): number {
  return priceWith(cfg, g.merge, currentMods(cfg, g.merge), ticket);
}

function paceWith(cfg: MergeConfig, m: MergeState, mods: Mods): number {
  let u = 0;
  for (let c = 0; c < CHAINS; c++) if (m.chains[c]?.open) u += valueWith(cfg, m, mods, c, Math.max(2, m.chains[c].best - 1));
  return u;
}

/** U = Σ over open chains of value(c, max(2, best_c − 1)) (spec 2.3). Built. */
export function paceUnit(cfg: MergeConfig, g: MergeGame): number {
  return paceWith(cfg, g.merge, currentMods(cfg, g.merge));
}

/**
 * A price rounded as 2.2 says: below 1,000 half up to a whole coin, above to 3 significant digits;
 * shown = paid. Built. Note for the lead (requests.md): 2.2 prints the Noodles stall as 172,800,
 * while this rule gives 173,000; this function follows the rule.
 */
export function roundCost(cfg: MergeConfig, x: number): number {
  const { roundBelow, sigDigits } = cfg.merge.costs;
  if (!Number.isFinite(x) || x <= 0) return 0;
  if (x < roundBelow) return Math.floor(x + 0.5 + EPS);
  const f = Math.pow(10, Math.floor(Math.log10(x)) - sigDigits + 1);
  return Math.floor(x / f + 0.5 + EPS) * f;
}

// ----------------------------------------------------------------------------- recent ticket coins (2.3, 2.10)

/** Bucket length of `recent`, s, and the number of buckets (2.3: 60 of 5 s). */
export const RECENT_BUCKET = 5;
export const RECENT_BUCKETS = 60;

/**
 * Ticket coins in the last five minutes at game clock `clock`, for one chain or (no `c`) all of
 * them: the buckets of `recent` still inside the window (a tick that has not rolled the buckets
 * yet leaves stale ones, which are not counted). Built.
 */
export function recentCoins(m: Pick<MergeState, 'recent'>, clock: number, c?: number): number {
  const now = Math.floor(clock / RECENT_BUCKET);
  const oldest = now - RECENT_BUCKETS + 1;
  let sum = 0;
  const rows = c === undefined ? m.recent.coins : [m.recent.coins[c] ?? []];
  for (const row of rows) {
    for (let j = 0; j < row.length; j++) {
      const at = m.recent.at - (row.length - 1 - j);
      if (at >= oldest && at <= now) sum += row[j];
    }
  }
  return sum;
}

/** R_t of 2.10: the recent ticket coins ÷ min(300, season clock), per s (0 at the season's first instant); per chain with `c` (the stall-level gain). Built. */
export function recentRate(g: MergeGame, c?: number): number {
  const clock = g.stats.playSeconds;
  const window = Math.min(RECENT_BUCKET * RECENT_BUCKETS, clock - g.merge.seasonStartedAt);
  return window > EPS ? recentCoins(g.merge, clock, c) / window : 0;
}

// ----------------------------------------------------------------------------- mergeParams (2.3)

/** Whether shutter group `group`'s printed condition holds now (2.2): a tier ever made, or a stall open. */
function shutterAllowed(cfg: MergeConfig, m: MergeState, group: number): boolean {
  const cond = cfg.merge.board.shutterGroups[group].condition;
  return cond.type === 'tierMade' ? !!m.book[cond.chain]?.[cond.tier - 1] : !!m.chains[cond.chain]?.open;
}

/** The chain whose stall opens next (2.5 "only the next chain"): the lowest closed one, or −1. */
function nextStall(m: MergeState): number {
  return m.chains.findIndex((ch) => !ch.open);
}

/**
 * Every derived value of spec 2.3 at this state (chains' base tiers, ripe chances, values, stall
 * bonuses, house tiers, costs, Loose_c, O, F, U, the minder rate, β, the next shutters, F_s, the
 * away cap and the modifiers). Built.
 */
export function mergeParams(cfg: MergeConfig, g: MergeGame): MergeParams {
  const m = g.merge;
  const mods = currentMods(cfg, m);
  const k = cfg.merge;
  const familiar = familiarFactor(cfg, m.feats.seasonsClosed);
  const saleInterval = k.minders.interval * mods.minderIntervalMult;
  const next = nextStall(m);
  const chains: ChainParams[] = m.chains.map((ch, c) => {
    const r = chainRatio(cfg, c);
    const base = baseTier(cfg, ch.gear);
    const ripe = ripeChance(cfg, mods, ch.gear);
    const values = Array.from({ length: 8 }, (_, i) => valueWith(cfg, m, mods, c, i + 1));
    const houseTier = ch.minder > 0 ? Math.min(ch.minder + 1, base + 1) : 0;
    let loose = 0;
    for (const cell of m.board) if (isGood(cell) && cell.c === c && cell.k >= base && cell.k <= base + 1) loose++;
    const openCost = !ch.open && c >= 1 && c === next && m.season >= k.chains[c].fromSeason ? roundCost(cfg, k.costs.stallBase * Math.pow(k.costs.stallRatio, c - 1) * familiar) : null;
    return {
      c,
      open: ch.open,
      r,
      v: chainValue(cfg, c),
      base,
      ripe,
      maxPop: Math.min(8, base + (ripe > EPS ? 1 : 0)),
      stallBonus: stallBonus(cfg, ch.stall),
      values,
      houseTier,
      heldBy: ch.minder > 0 ? (ch.minder < base ? 'minder' : 'gear') : null,
      saleInterval,
      minderRate: houseTier > 0 ? values[houseTier - 1] / saleInterval : 0,
      loose,
      gearCost: ch.open && ch.gear < k.costs.gearMaxLevel ? roundCost(cfg, k.costs.gearBase * r * Math.pow(k.costs.gearGrowth, ch.gear - 1)) : null,
      stallCost: ch.open && ch.stall < k.costs.stallMaxLevel ? roundCost(cfg, k.costs.stallLevelBase * r * Math.pow(k.costs.stallLevelGrowth, ch.stall - 1)) : null,
      minderCost: !ch.open || ch.minder >= k.costs.minderMaxLevel ? null : roundCost(cfg, k.costs.minderBase * r * (ch.minder === 0 ? 1 : Math.pow(k.costs.minderGrowth, ch.minder))),
      openCost,
    };
  });
  let O = 0;
  for (const cell of m.board) if (cell !== 'shutter' && cell !== 'block') O++;
  let n0 = 0;
  const shutters = k.board.shutterGroups.map((grp, i) => {
    const opened = m.shuttersOpened[i] ?? 0;
    const n = n0 + opened;
    n0 += grp.cells.length;
    if (opened >= grp.cells.length) return null;
    return { n, cell: grp.cells[opened], cost: roundCost(cfg, k.board.shutterBase * Math.pow(k.board.shutterGrowth, n)), allowed: shutterAllowed(cfg, m, i) };
  });
  const lateHours = g.entitlements.products.includes(k.products.lateHours);
  return {
    mods,
    chains,
    beta: k.tickets.beta + mods.betaAdd,
    O,
    F: freeCells(m).length,
    U: paceWith(cfg, m, mods),
    minderRate: chains.reduce((a, ch) => a + ch.minderRate, 0),
    shutters,
    familiar,
    awayCap: (k.away.capHours + mods.awayHours + (lateHours ? k.away.lateHoursHours : 0)) * 3600,
  };
}
