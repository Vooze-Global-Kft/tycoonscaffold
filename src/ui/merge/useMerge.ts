/**
 * Selecting from the merge game in the shared store (AGENTS.md: select the few values a component
 * shows; the game changes ten times a second). `useMerge(fn, fallback)` calls `fn` with the merge
 * config and game, or returns `fallback` outside a merge game; it must return a primitive or a
 * reference the rules keep stable (the board array, a counter: the tick returns the same objects
 * while they do not change). `useMergeShallow` compares a small object or array by its entries.
 *
 * Below them, the small selectors every package needs (the purse, the season chip, the gift count,
 * the play clock, the advised goal, a stall's rows, a shutter, a ticket's rows, the ads): each
 * returns a primitive or a flat object of primitives compared with useShallow, never the whole game.
 * Their builders, pure and reading every figure from the rules, are in ./sheets/views.ts.
 *
 * Written by the skeleton; owned afterwards by the bars package (BARS, 7a).
 */
import { useShallow } from 'zustand/react/shallow';
import * as R from '../../engine/merge';
import { useGame } from '../../state/store';
import * as V from './sheets/views';

function pick<T>(fn: (cfg: R.MergeConfig, g: R.MergeGame) => T, fallback: T) {
  return (s: { cfg: unknown; game: unknown }): T => {
    const cfg = s.cfg as R.MergeConfig;
    const g = s.game as R.MergeGame;
    return R.isMerge(cfg) && g.merge ? fn(cfg, g) : fallback;
  };
}

export function useMerge<T>(fn: (cfg: R.MergeConfig, g: R.MergeGame) => T, fallback: T): T {
  return useGame(pick(fn, fallback));
}

export function useMergeShallow<T extends object>(fn: (cfg: R.MergeConfig, g: R.MergeGame) => T, fallback: T): T {
  return useGame(useShallow(pick(fn, fallback)));
}

/** The same, made safe while the rules are integrated: a selector that throws gives `fallback` (no red screen). */
function safe<T>(fn: (cfg: R.MergeConfig, g: R.MergeGame) => T, fallback: T) {
  return (cfg: R.MergeConfig, g: R.MergeGame): T => {
    try {
      return fn(cfg, g);
    } catch {
      return fallback;
    }
  };
}

/** The merge config, or null outside a merge game (it does not change while the game runs). */
export function useMergeCfg(): R.MergeConfig | null {
  return useGame((s) => (R.isMerge(s.cfg) ? s.cfg : null));
}

/** The purse: the shared cash (the till joins it with every paid ticket and each minute, 2.4). */
export function usePurse(): number {
  return useMerge((_c, g) => g.cash, 0);
}

const NO_CHIP: V.ChipView = { season: '', filled: 0, lines: 0, done: false };
/** The season chip's values: the season's name, the Festival's filled and total lines. */
export function useSeasonChip(): V.ChipView {
  return useMergeShallow(safe(V.chipView, NO_CHIP), NO_CHIP);
}

/** Gift boxes waiting (M35: the bag shows only while this is above 0). */
export function useGiftCount(): number {
  return useMerge((_c, g) => g.merge.gift.boxes.length, 0);
}

/** The play clock in whole seconds (cooldowns "ready after 4 min of play", M10): one render a second at most. */
export function usePlaySecond(): number {
  return useMerge((_c, g) => Math.floor(g.stats.playSeconds), 0);
}

const NO_GOAL: V.GoalView = { kind: 'none', target: -1, cost: 0, costText: '', estN: -1, estUnit: 's', name: '', level: 0, tier: '', have: 0, need: 0, festivalGear: false };
/** The advised goal (2.10) as the goal line shows it ('none' when the rules name nothing). */
export function useGoal(): V.GoalView {
  return useMergeShallow(heldGoal, NO_GOAL);
}

/** The goal line's hold (views.ts holdGoal): one per app, advanced by whichever reader sees a new game first. */
let hold: V.GoalHold | null = null;
let holdFor: unknown = null;
function heldGoal(cfg: R.MergeConfig, g: R.MergeGame): V.GoalView {
  if (holdFor !== g) {
    hold = V.holdGoal(hold, V.goalView(cfg, g), g);
    holdFor = g;
  }
  return hold ? hold.view : NO_GOAL;
}

/** A stall's rows (gear, stall level, minder, shelf, ads, opening); `exists` false outside a merge game or for a chain that does not exist. */
export function useStallView(c: number): (V.StallView & { exists: true }) | { exists: false } {
  return useMergeShallow<(V.StallView & { exists: true }) | { exists: false }>(
    safe((cfg, g) => (g.merge.chains[c] ? { ...V.stallView(cfg, g, c), exists: true as const } : NOT), NOT),
    NOT,
  );
}
const NOT = { exists: false } as const;

/** The next shutter of a group, for its confirm. */
export function useShutterView(group: number): V.ShutterView {
  return useMergeShallow(
    safe((cfg, g) => V.shutterView(cfg, g, group), NO_SHUTTER),
    NO_SHUTTER,
  );
}
const NO_SHUTTER: V.ShutterView = { exists: false, allowed: false, cost: 0, cash: 0, holdsGood: false, condKind: 'open', condName: '' };

/** A counter's ticket rows (lines, values, price, Not tonight, the fill-one-line ad). */
export function useTicketView(counter: number): V.TicketView {
  return useMergeShallow(
    safe((cfg, g) => V.ticketView(cfg, g, counter), NO_TICKET),
    NO_TICKET,
  );
}
const NO_TICKET: V.TicketView = { exists: false, id: -1, gold: false, species: '', coat: 0, lines: '', price: '', bonusPct: 0, parade: '', unfilled: 0, ntGoods: 0, ntRoom: true, ntWait: 0, adOk: false, adWait: 0 };

/** The rewarded ads' readiness (5.7, M10, M14). */
export function useAdsView(): V.AdsView {
  return useMergeShallow(safe(V.adsView, NO_ADS), NO_ADS);
}
const NO_ADS: V.AdsView = { fillWait: 0, fillTicket: false, rushOk: false, rushWait: 0, dragonOk: false, dragonWait: 0, dragonOut: false };
