/**
 * The haul engine as an engine mode (src/engine/mode.ts): how the shared engine functions reach
 * the haul rules (src/engine/haul.ts, the rules package's public index) without importing them.
 *
 * Haul mode only (scripts/lib/modes.js lists this file with the haul folders): the haul mode
 * entry (src/modes/haul/index.tsx) installs it, so only a haul game's bundle carries the haul
 * rules. Pure TypeScript, no React. Written by the tech lead's skeleton; owned afterwards by the
 * integration package (docs/design/space-build-plan.md).
 */
import type { GameConfig, StoryBeat } from '../config/schema';
import * as H from './haul';
import type { EngineMode } from './mode';
import type { GameState } from './types';

/** The Jump the shared `prestige(cfg, state, now, choice)` is asked for: the condition and the Star Map nodes to buy first. */
export interface HaulJumpChoice {
  traitId: string;
  buys?: string[];
}

const asCfg = (cfg: GameConfig) => cfg as H.HaulConfig;
const asGame = (g: GameState) => g as unknown as H.HaulGame;
const asState = (g: H.HaulGame) => g as unknown as GameState;

/** The default Jump choice: the first offered condition, no node bought (the bot and the screens pass their own). */
export function defaultJumpChoice(cfg: H.HaulConfig, g: H.HaulGame): HaulJumpChoice | null {
  if (!g.haul) return null;
  const offers = H.offersFor(cfg, g.metaSeed, g.haulStats.jumps, g.haul.trait);
  return offers.length ? { traitId: offers[0] } : null;
}

function storyTrigger(cfg: GameConfig, state: GameState, t: StoryBeat['trigger']): boolean {
  const c = asCfg(cfg);
  const g = asGame(state);
  const h = g.haul;
  if (!h || !H.isHaul(cfg)) return false;
  // Each beat fires once ever (storySeen), so the current run's state is enough: no lifetime flags.
  switch (t.type) {
    case 'launches':
      return (g.stats.launches ?? 0) >= t.count;
    case 'ring':
      return h.slots.some((s, i) => s.claimed && H.ringOf(c, i) + 1 >= t.ring);
    case 'contracts':
      return h.contracts.unlocked;
    case 'system':
      return h.autopilot.online;
    case 'galaxy':
      return h.galaxy >= t.index;
    case 'jumpReady':
      return H.coresAvailable(c, g) >= t.cores;
    default:
      return false;
  }
}

function missionUsable(cfg: GameConfig, state: GameState, type: string): boolean | undefined {
  const g = asGame(state);
  const h = g.haul;
  switch (type) {
    // Haul has no tapping and no flying bonus.
    case 'taps':
    case 'bonus':
      return false;
    case 'contracts':
      return !!h?.contracts.unlocked || (g.stats.contractsMet ?? 0) > 0;
    case 'seamDrags':
      return (g.stats.seamDrags ?? 0) > 0 || (h?.vein.count ?? 0) > 0;
    case 'claims':
      return !!h?.slots.some((s) => !s.claimed);
    default:
      return undefined;
  }
}

export const haulEngineMode: EngineMode = {
  id: 'haul',
  // Space Miner's old classic saves (key "v1") are not read: the game was never published (spec Decisions).
  saveTag: 'haul1',
  create: (cfg, base) => (H.isHaul(cfg) ? asState(H.withHaulFields(cfg, base)) : base),
  reconcile: (cfg, base, raw) => (H.isHaul(cfg) ? asState(H.reconcileHaul(cfg, base, raw)) : base),
  tick: (cfg, state, dt, now, events) => (H.isHaul(cfg) ? asState(H.advanceHaul(cfg, asGame(state), dt, now, events as H.HaulEvent[] | undefined)) : state),
  income: (cfg, state) => {
    const g = asGame(state);
    if (!H.isHaul(cfg) || !g.haul) return 0;
    return H.steadyRate(cfg, H.haulParams(cfg, g as H.HaulGame & { haul: H.HaulState }), g.haul);
  },
  activeIncome: (cfg, state) => (H.isHaul(cfg) ? H.haulIncome(cfg, asGame(state)) : 0),
  offline: (cfg, state, now) => {
    if (!H.isHaul(cfg)) return { seconds: 0, earnings: 0, game: state };
    const r = H.haulOffline(cfg, asGame(state), now);
    return { seconds: r.seconds, earnings: r.earnings, game: asState(r.game), report: r.report };
  },
  prestige: (cfg, state, now, choice) => {
    if (!H.isHaul(cfg)) return state;
    const g = asGame(state);
    const c = (choice as HaulJumpChoice | undefined) ?? defaultJumpChoice(cfg, g);
    if (!c) return state;
    return asState(H.prestigeHaul(cfg, g, now, c.traitId, c.buys ?? []));
  },
  storyTrigger,
  missionUsable,
};
