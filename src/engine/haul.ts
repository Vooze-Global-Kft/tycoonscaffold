/**
 * Haul mode rules (Orbit Haulers, docs/design/space-design.md section 2): the one public index of
 * src/engine/haul/*. Pure TypeScript, deterministic: time comes in as arguments (`dt`, `now`),
 * randomness from seeds in state. It never imports economy.ts or chain.ts, so a haul build carries
 * none of the restaurant engine. The interface is frozen in docs/design/space-engine-notes.md.
 */
import type { GameConfig } from '../config/schema';
import type { HaulContent } from '../config/schema.haul';
import { haulParams } from './haul/params';
import { slotRates } from './haul/rates';
import type { HaulConfig, HaulGame, HaulState } from './haul/types';

export type * from './haul/types';

export {
  EPS,
  MAX_CASH,
  rngMix4,
  geometricCost,
  slotTable,
  slotCount,
  ringOf,
  condition,
  T,
  Tore,
  ringWeights,
  starLevel,
  bonanzaChance,
  rockAt,
  rigTier,
  haulGlobalMultiplier,
  engineMult,
  freighterCapacity,
  awayBase,
  droneCapFor,
  wantedOres,
  seamOn,
  orePrice,
  haulParams,
  holdTotal,
  sumUnits,
  rigCost,
  claimCost,
  highestClaimedRing,
  ghostSlots,
  droneCost,
  capacityCost,
  engineCost,
  freighterCost,
  autopilotCost,
  affordable,
  type Rock,
} from './haul/params';
export { EMPTY_LIFETIME, emptyHaulStats, claimedRingMax, placeRock, runStartCash, headStartSlots, createHaul, withHaulFields, reconcileHaul } from './haul/create';
export {
  UNIT_TOL,
  wantLeft,
  towardContract,
  contractMet,
  activeContract,
  loadCargo,
  payoutFor,
  contractBonus,
  contractViews,
  shiftDoubles,
  claimedRings,
  contractAt,
  offerAt,
  openBoard,
  drawContract,
  topUpBoard,
  contractBasis,
  steadyPerLaunch,
  noteShipped,
  resizeOrders,
  type ContractBasis,
  // Not the contract rule since Decision 56; the balance bot's routing estimate only.
  contractStation,
  type ContractStation,
} from './haul/trade';
export { STEP, MAX_TICK, advanceHaul, autopilotWants } from './haul/tick';
export {
  assignDrone,
  moveDrone,
  recallDrone,
  canLaunch,
  launch,
  upgradeRig,
  claimSlot,
  CLAIM_DRIFT,
  buyDrone,
  buyCapacity,
  buyEngine,
  buyFreighter,
  buyAutopilot,
  setPolicy,
  pickContract,
  haulShift,
  shiftView,
  canFlare,
  useFlare,
  canAdFlare,
  grantAdFlare,
  fitModule,
  ackTransmission,
  markHintShown,
  grantHangarDrones,
} from './haul/actions';
export { slotRates, freighterRate, shareFreighter, activeRate, steadyRate, haulIncome, routeGain, fastForward, haulOffline, type SlotRate } from './haul/rates';
export { totalCores, coresAvailable, coresInHand, coresAfterJump, starNodeLevel, starNodeCost, starMapView, buyStarNode, offersFor, galaxyName, jumpPreview, confirmJump, startGalaxy, prestigeHaul } from './haul/jump';
export { IDLE_HINT_SECONDS, HOLD_HINT_SECONDS, CONTRACT_HINT_SECONDS, FLARE_HINT_SECONDS, LIMITED_HINTS, bestSlotForDrone, busiestRoute, hintsFor, nextHint, hintKey } from './haul/hints';

/** True for a config with mode "haul" and a haul block. */
export function isHaul(cfg: GameConfig): cfg is HaulConfig {
  return (cfg as { mode?: string }).mode === 'haul' && !!(cfg as { haul?: HaulContent }).haul;
}

/** What the Rig sheet shows for one slot (section 4.5). Null for an unclaimed slot. */
export interface SlotReadout {
  slot: number;
  ring: number;
  ore: string;
  rigLevel: number;
  /** Drill now (with a seam), base drill, drones' haul rate, units/s. */
  drill: number;
  baseDrill: number;
  haul: number;
  pile: number;
  cap: number;
  capacity: number;
  trip: number;
  /** "Drones are waiting on the drill." / "Ore is piling up." / "Balanced." */
  verdict: 'drill' | 'haul' | 'balanced';
  /** Wall seconds until the rock is dry at the current rates (Infinity when nothing drills or hauls). */
  dryIn: number;
}

/** The Rig sheet's numbers for a slot. Balanced = haul and drill within 10 % of each other. */
export function slotReadout(cfg: HaulConfig, g: HaulGame & { haul: HaulState }, slot: number): SlotReadout | null {
  const s = g.haul.slots[slot];
  if (!s || !s.claimed) return null;
  const p = haulParams(cfg, g);
  const sp = p.slots[slot];
  const ratio = sp.r > 0 ? sp.h / sp.r : 0;
  const verdict = ratio < 0.9 ? 'haul' : ratio > 1.1 ? 'drill' : 'balanced';
  const rate = Math.min(sp.r, sp.h > 0 ? sp.h : sp.r);
  const units = s.life * sp.r + s.pile;
  return {
    slot,
    ring: sp.ring,
    ore: s.ore,
    rigLevel: s.rigLevel,
    drill: sp.r,
    baseDrill: sp.rb,
    haul: sp.h,
    pile: s.pile,
    cap: sp.cap,
    capacity: sp.c,
    trip: sp.trip,
    verdict: s.haulers === 0 ? 'haul' : verdict,
    dryIn: s.respawnAt !== null ? 0 : sp.h > 0 && rate > 0 ? units / Math.min(rate, sp.h) : sp.r > 0 ? s.life : Infinity,
  };
}

/** What limits each claimed route now (for the bot's bound-by-one-limit measure). */
export function routeLimits(cfg: HaulConfig, g: HaulGame & { haul: HaulState }): { slot: number; limit: 'drill' | 'haul' | 'freighter' }[] {
  const p = haulParams(cfg, g);
  const rates = slotRates(cfg, p, g.haul);
  const sumQ = rates.reduce((a, r) => a + r.q, 0);
  const freighterBound = sumQ > p.F / (p.climb + p.away + p.land);
  return rates.filter((r) => r.h > 0).map((r) => ({ slot: r.slot, limit: freighterBound ? 'freighter' : r.limit }));
}

/** Display route table for the scene (angle, distance, trip, drones, warm-up), one row per claimed slot. */
export function routeTable(cfg: HaulConfig, g: HaulGame & { haul: HaulState }): { slot: number; ring: number; angle: number; distance: number; trip: number; n: number; routeFrom: number }[] {
  const p = haulParams(cfg, g);
  const table = cfg.haul.rings.flatMap((r) => r.slots);
  return g.haul.slots.flatMap((s, i) => (s.claimed ? [{ slot: i, ring: p.slots[i].ring, angle: table[i], distance: p.slots[i].distance, trip: p.slots[i].trip, n: s.haulers, routeFrom: s.routeFrom }] : []));
}

export type { HaulConfig, HaulGame, HaulState };
