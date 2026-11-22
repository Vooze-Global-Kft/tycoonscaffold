/**
 * Read-only helpers for screens: numbers and guidance derived from the game state, worded the way
 * the UI shows them. Nothing here changes state. Pure and deterministic like the rest of the engine.
 */
import type { GameConfig } from '../config/schema';
import { transportRate, type Stage } from './chain';
import * as E from './economy';
import * as M from './meta';
import type { GameState } from './types';

// ---------------------------------------------------------------- the three stages

export interface StageReadout {
  /**
   * Cash per second each stage can handle at full speed, global multipliers included (so the
   * numbers match the income shown in the header). In classic mode transport and sales are Infinity.
   */
  production: number;
  transport: number;
  sales: number;
  /** The stage that limits income right now. */
  limiting: Stage;
  /** What the venue earns per second in steady state: the smallest of the three. */
  rate: number;
  /**
   * True while transport still waits for the player's signal (the automation hire is missing).
   * `transport` is then what the workers COULD carry: show the signal prompt ("Ring the bell")
   * instead of a rate, and never call transport the limiting stage for that alone.
   */
  manualTransport: boolean;
}

/** The read-out of the three stages for one venue, for the stage strip and the stage lists. */
export function stageReadout(cfg: GameConfig, state: GameState, venueId: string, now: number): StageReadout {
  const mult = E.globalMultiplier(cfg, state, now);
  const rates = E.venueRates(cfg, state, venueId);
  const chain = state.venues[venueId]?.chain ?? null;
  const params = E.chainParams(cfg, state, venueId);
  if (!chain || !params) {
    return { production: rates.production * mult, transport: Infinity, sales: Infinity, limiting: 'production', rate: rates.production * mult, manualTransport: false };
  }
  const manualTransport = !chain.transportManaged;
  // With the hire missing the engine reports transport as 0; the screen shows what it could do.
  const transport = transportRate(params, chain.workers.length);
  const { production, sales } = rates;
  const rate = Math.min(production, transport, sales);
  const limiting: Stage = rate === production ? 'production' : rate === transport ? 'transport' : 'sales';
  return { production: production * mult, transport: transport * mult, sales: sales * mult, limiting, rate: rate * mult, manualTransport };
}

// ---------------------------------------------------------------- prestige

export interface PrestigePreview {
  /** Points a reset would give right now (0 = not worth it yet). */
  points: number;
  /** Income multiplier from points held now, and after the reset. */
  multNow: number;
  multAfter: number;
  /** Lifetime earnings still missing for the next point (0 when none is missing). */
  toNextPoint: number;
}

export function prestigePreview(cfg: GameConfig, state: GameState): PrestigePreview {
  const points = E.prestigePointsAvailable(cfg, state);
  const multNow = E.prestigeMultiplier(cfg, state);
  const multAfter = E.prestigeMultiplier(cfg, { ...state, prestigePoints: state.prestigePoints + points });
  // points = floor(scale * sqrt(lifetime / threshold))  =>  lifetime for k points = threshold * (k / scale)^2
  const { threshold, scale } = cfg.economy.prestige;
  const nextTotal = E.totalPrestigePoints(cfg, state.lifetimeEarnings) + 1;
  const needed = threshold * Math.pow(nextTotal / scale, 2);
  return { points, multNow, multAfter, toNextPoint: Math.max(0, needed - state.lifetimeEarnings) };
}

// ---------------------------------------------------------------- guidance

/**
 * What the pointing hand should show. The first kinds come from `nextHint` (the loop a new player
 * learns in the first minutes). The rest are "first time" lessons: each one shows only until the
 * player has done that thing once, whenever nothing more urgent is pending.
 */
export type GuideHint =
  | M.Hint
  | { kind: 'startRush' }
  | { kind: 'buyUpgrade'; upgradeId: string }
  | { kind: 'unlockVenue'; venueId: string }
  | { kind: 'levelUpCard'; cardId: string };

/** The one thing to point at right now, or null. Poll about once a second. */
export function guideHint(cfg: GameConfig, state: GameState, now: number): GuideHint | null {
  return M.nextHint(cfg, state, now) ?? firstTimeHint(cfg, state, now);
}

function firstTimeHint(cfg: GameConfig, state: GameState, now: number): GuideHint | null {
  // Claiming and opening are taught by nextHint while the player is new; these cover the player who
  // automated quickly and reached "veteran" before the first mission or chest was ready.
  if (state.missions.total === 0) {
    const done = M.missionViews(cfg, state).find((m) => m.done);
    if (done) return { kind: 'claimMission', index: done.index };
  }
  if (state.stats.chestsOpened === 0 && (M.chestCount(state) > 0 || (M.freeChestStatus(cfg, state, now)?.ready ?? 0) > 0)) {
    return { kind: 'openChest' };
  }
  if (state.prestigeCount > 0) return null;

  const venue = state.venues[state.activeVenue];
  if (E.isSim(cfg) && state.stats.rushes === 0 && venue?.chain?.transportManaged && E.canStartRush(cfg, state, now)) {
    return { kind: 'startRush' };
  }
  const ownsCashUpgrade = cfg.upgrades.some((u) => !u.premium && state.upgrades.includes(u.id));
  if (!ownsCashUpgrade) {
    let best: { id: string; cost: number } | null = null;
    for (const u of cfg.upgrades) {
      if (u.premium || state.upgrades.includes(u.id) || !E.canAfford(state.cash, u.cost)) continue;
      // Only upgrades that do something yet: "all", or a business the player owns somewhere.
      const useful = u.target === 'all' || Object.values(state.venues).some((v) => (v.businesses[u.target]?.owned ?? 0) > 0);
      if (useful && (!best || u.cost < best.cost)) best = { id: u.id, cost: u.cost };
    }
    if (best) return { kind: 'buyUpgrade', upgradeId: best.id };
  }
  if (!Object.values(state.cards).some((c) => c.level > 1)) {
    const card = cfg.meta.cards.find((c) => M.canLevelUpCard(cfg, state, c.id));
    if (card) return { kind: 'levelUpCard', cardId: card.id };
  }
  if (state.stats.venuesEver <= 1) {
    const next = E.nextVenueToUnlock(cfg, state);
    if (next && E.canAfford(state.cash, E.venueUnlockCost(cfg, next))) return { kind: 'unlockVenue', venueId: next };
  }
  return null;
}

/** A stable string for a hint, used to find the control it points at (e.g. "buyBusiness:margherita"). */
export function hintKey(h: GuideHint): string {
  switch (h.kind) {
    case 'tapStation':
    case 'buyBusiness':
    case 'hireBusiness':
      return `${h.kind}:${h.businessId}`;
    case 'claimMission':
      return `${h.kind}:${h.index}`;
    case 'buyUpgrade':
      return `${h.kind}:${h.upgradeId}`;
    case 'unlockVenue':
      return `${h.kind}:${h.venueId}`;
    case 'levelUpCard':
      return `${h.kind}:${h.cardId}`;
    default:
      return h.kind;
  }
}
