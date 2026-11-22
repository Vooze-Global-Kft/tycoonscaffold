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
  // points = floor(scale * (lifetime / threshold)^exponent)  =>  lifetime for k points = threshold * (k / scale)^(1 / exponent)
  const nextTotal = E.totalPrestigePoints(cfg, state.lifetimeEarnings) + 1;
  const needed = E.lifetimeForPrestigePoints(cfg, nextTotal);
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

/**
 * The one thing to point at right now, or null. Poll about once a second. It follows the first-session
 * script (critique-fun.md section 2): tap the station, ring the bell, buy, hire the station's cook,
 * save for and hire the transport automation, then the lessons in order (the rush, the next station,
 * its hire, the first upgrade, the first mission, the first chest), then the first-time hints below.
 * Every hint is something the player can do right now.
 */
export function guideHint(cfg: GameConfig, state: GameState, now: number): GuideHint | null {
  const base = M.nextHint(cfg, state, now);
  if (base && (base.kind === 'claimMission' || base.kind === 'openChest' || base.kind === 'hireBusiness' || base.kind === 'hireTransport')) return base;
  const limit = bottleneckHint(cfg, state, now);
  if (limit) return limit;
  if (base) return earlyLesson(cfg, state, now) ?? base;
  return firstTimeHint(cfg, state, now);
}

/**
 * Income must be below this share of what the kitchen makes before the hand points at the stage
 * that limits it: a small mismatch is normal and not worth a nudge.
 */
export const BOTTLENECK_SHARE = 0.8;

/**
 * "Buy waiters" (or tables) when that stage clearly limits income and a level of it is affordable
 * (play-test D1: dishes piled up on the pass at flat income for minutes and no hint said so). Only
 * once the venue's transport runs by itself: before that the bell is the lesson. Applies to veterans
 * too, because it is the one hint that says where income is lost; it stops as soon as the stage
 * keeps up again.
 */
function bottleneckHint(cfg: GameConfig, state: GameState, now: number): GuideHint | null {
  if (!E.isSim(cfg)) return null;
  const venueId = state.activeVenue;
  const venue = state.venues[venueId];
  if (!venue?.unlocked || !venue.chain?.transportManaged) return null;
  const r = stageReadout(cfg, state, venueId, now);
  // What the kitchen makes and the room does not turn into income.
  if (r.limiting === 'production' || r.rate >= r.production * BOTTLENECK_SHARE) return null;
  if (r.limiting === 'transport') return E.canAfford(state.cash, E.transportCost(cfg, state, venueId, 1)) ? { kind: 'buyTransport' } : null;
  return E.canAfford(state.cash, E.salesCost(cfg, state, venueId, 1)) ? { kind: 'buySales' } : null;
}

/** First-session lessons once the first venue is automated, ahead of the plain buy and manual-loop hints. */
function earlyLesson(cfg: GameConfig, state: GameState, now: number): GuideHint | null {
  if (state.prestigeCount > 0) return null;
  const venue = state.venues[state.activeVenue];
  if (!venue?.unlocked) return null;
  const automated = E.isSim(cfg) ? venue.chain?.transportManaged === true : venue.businesses[cfg.businesses[0].id]?.managed === true;
  if (!automated) return null;
  if (E.isSim(cfg) && state.stats.rushes === 0 && E.canStartRush(cfg, state, now)) return { kind: 'startRush' };
  // The next station once every station so far has its hire (the hire is the lesson before it).
  const allHired = cfg.businesses.every((b) => (venue.businesses[b.id]?.owned ?? 0) === 0 || venue.businesses[b.id].managed);
  const next = cfg.businesses.find((b) => (venue.businesses[b.id]?.owned ?? 0) === 0);
  if (allHired && next && E.canAfford(state.cash, E.businessCost(cfg, state, state.activeVenue, next.id, 1))) return { kind: 'buyBusiness', businessId: next.id };
  const upgrade = firstUpgradeHint(cfg, state);
  if (upgrade) return upgrade;
  return null;
}

/** The cheapest useful cash upgrade the player can afford, while they have never bought one. */
function firstUpgradeHint(cfg: GameConfig, state: GameState): GuideHint | null {
  if (cfg.upgrades.some((u) => !u.premium && state.upgrades.includes(u.id))) return null;
  let best: { id: string; cost: number } | null = null;
  for (const u of cfg.upgrades) {
    if (u.premium || state.upgrades.includes(u.id) || !E.canAfford(state.cash, u.cost)) continue;
    // Only upgrades that do something yet: "all", or a business the player owns somewhere.
    const useful = u.target === 'all' || Object.values(state.venues).some((v) => (v.businesses[u.target]?.owned ?? 0) > 0);
    if (useful && (!best || u.cost < best.cost)) best = { id: u.id, cost: u.cost };
  }
  return best ? { kind: 'buyUpgrade', upgradeId: best.id } : null;
}

function firstTimeHint(cfg: GameConfig, state: GameState, now: number): GuideHint | null {
  // Claiming and opening are taught by nextHint while the player is new; these cover the player who
  // automated quickly and reached "veteran" before the first mission or chest was ready.
  // Not before the first venue is automated: the loop comes first (nextHint's rule too).
  const firstVenue = state.venues[E.venueIds(cfg)[0]];
  const automated = E.isSim(cfg) ? firstVenue?.chain?.transportManaged === true : firstVenue?.businesses[cfg.businesses[0].id]?.managed === true;
  if (!automated && state.prestigeCount === 0) return null;
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
  const upgrade = firstUpgradeHint(cfg, state);
  if (upgrade) return upgrade;
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
