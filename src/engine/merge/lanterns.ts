/**
 * The Lantern Gate (spec 5.3 with Decision M5): feats, lighting lanterns, and the modifiers.
 *
 * Package ORDERS (docs/design/market-build-plan.md). Seam:
 * - `neutralMods`, `lanternMods` and `currentMods` produce THE modifier object `Mods` (one object:
 *   every number a lantern or a season character can change, neutral by default) that params.ts
 *   consumes; `currentMods` applies the precedence of 2.3 (season character against lantern: the
 *   better one, never both);
 * - MECHANICS calls `onMerged` after every merge (lifetime merges are already counted in
 *   `feats.merges`; the scripted hedgehog of 2.7 steps up here at the first merge), `onTierMade`
 *   when a merge, a drop or a gift good makes a (c, k) for the first time this season or ever
 *   (`firstEver`: MECHANICS already stamped `book`), and `onTicketPaid` after a ticket paid (after
 *   gift.ts `countGiftTicket`).
 *
 * Skeleton bodies: `neutralMods` is built (config defaults); `lanternMods` returns {} and
 * `currentMods` returns `neutralMods` (no lantern and no character changes anything yet);
 * `onMerged`, `onTierMade`, `onTicketPaid` return the state unchanged; `featProgress` throws
 * notBuilt('featProgress').
 */
import { notBuilt } from './notBuilt';
import type { Good, MergeConfig, MergeEvent, MergeGame, MergeState, Mods, Ticket } from './types';

/** The modifiers with no lantern lit and no season character: every field from the config. Built. */
export function neutralMods(cfg: MergeConfig): Mods {
  const m = cfg.merge;
  return {
    counters: m.tickets.counters,
    basketShare: m.basket.share,
    shelfCap: m.gear.shelf,
    paradeEvery: m.parade.every,
    awayHours: 0,
    luckyOdds: m.merges.luckyOdds,
    startOpen: [],
    seasonedMax: m.seasons.maxSteps,
    paradeMultiplier: m.parade.multiplier,
    mindersStartHired: false,
    ripeAdd: 0,
    betaAdd: 0,
    threeLineShare: null,
    giftSlots: m.gift.slots,
    minderIntervalMult: 1,
    sparkTiers: 1,
    festivalPurseMult: 1,
    giftEvery: m.gift.every,
    ticketPay: 1,
  };
}

/** What the lit lanterns change (5.3, M5), only the fields they change. ORDERS. Skeleton: returns {}. */
export function lanternMods(cfg: MergeConfig, lit: readonly number[]): Partial<Mods> {
  void cfg;
  void lit;
  return {};
}

/**
 * The modifiers in force: neutral, then the lit lanterns and the season's character
 * (season.ts `seasonMods`) with the precedence of 2.3. ORDERS. Skeleton: returns `neutralMods(cfg)`.
 */
export function currentMods(cfg: MergeConfig, m: MergeState): Mods {
  void m;
  return neutralMods(cfg);
}

/** After a merge made `made` at `cell` (spec 2.5): feats, the scripted hedgehog (2.7). ORDERS. Skeleton: returns the state unchanged. */
export function onMerged(cfg: MergeConfig, g: MergeGame, made: Good, cell: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void made;
  void cell;
  void events;
  return g;
}

/** A tier was made: the first of this (c, k) this season (best rose) or ever (`firstEver`; the book is stamped). Feats of 5.3 (lanterns 3, 5, 6, 9, 17, 20). ORDERS. Skeleton: returns the state unchanged. */
export function onTierMade(cfg: MergeConfig, g: MergeGame, good: Good, firstEver: boolean, events?: MergeEvent[]): MergeGame {
  void cfg;
  void good;
  void firstEver;
  void events;
  return g;
}

/** A ticket was just paid `coins` at `counter` (after the gift counter): feats (lanterns 1, 2, 4, 10, 12, 13, 16, 19). ORDERS. Skeleton: returns the state unchanged. */
export function onTicketPaid(cfg: MergeConfig, g: MergeGame, counter: number, ticket: Ticket, coins: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void counter;
  void ticket;
  void coins;
  void events;
  return g;
}

/** The next three unlit feats with progress (the Lantern Gate, and `advice`). ORDERS. Skeleton: throws notBuilt('featProgress'). */
export function featProgress(cfg: MergeConfig, g: MergeGame): { n: number; have: number; need: number }[] {
  void cfg;
  void g;
  throw notBuilt('featProgress');
}
