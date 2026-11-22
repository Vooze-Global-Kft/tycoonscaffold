/**
 * Derived values of a haul run (section 2.3), the rock stream (2.4 step 2), condition and Star Map
 * lookups, and the price of every purchase (2.5). Pure.
 */
import type { HaulCondition, HaulRing, StarEffect } from '../../config/schema.haul';
import { fittedBonus, fittedBonuses } from '../loadout';
import { hashString, rngFloat, rngMix, rngWeighted } from '../rng';
import type { HaulConfig, HaulGame, HaulParams, HaulState, SlotParams, StarMapState } from './types';

/** Tolerance of every "full" comparison (`≥ F − 1e-9`). */
export const EPS = 1e-9;

/**
 * True when a hold or a cargo of `total` units fills a freighter of capacity `F`. The tolerance is
 * relative as well as absolute: the units are a sum of floats, and at capacities in the tens of
 * millions that sum misses F by more than EPS (seen at F = 18,691,582 with a hold of
 * 18,691,581.999999996: the autopilot never launched again).
 */
export function fillsFreighter(total: number, F: number): boolean {
  return total >= F * (1 - 1e-9) - EPS;
}
/** Cash never goes above this (matches economy.MAX_CASH). */
export const MAX_CASH = Number.MAX_VALUE;

/** rngMix of four numbers; the specification's `rngMix4` (section 2 header). To move into rng.ts. */
export function rngMix4(a: number, b: number, c: number, d: number): number {
  return rngMix(rngMix(rngMix(a >>> 0, b >>> 0), c >>> 0), d >>> 0);
}

/** A float in [0, 1) from a mixed seed. */
export function roll(seed: number): number {
  return rngFloat(seed).value;
}

/** Same formula as economy.geometricCost: the price of the next `n` levels after `owned`. */
export function geometricCost(base: number, growth: number, owned: number, n = 1): number {
  if (!(n > 0)) return 0;
  const first = base * Math.pow(growth, owned);
  if (growth === 1) return first * n;
  return first * ((Math.pow(growth, n) - 1) / (growth - 1));
}

/** Clean number: NaN, ±Infinity and negatives become `fallback` (0). */
export function fin(x: number, fallback = 0): number {
  return Number.isFinite(x) && x >= 0 ? x : fallback;
}

// ---------------------------------------------------------------- slots and rings

/** Slot table: ring (0-based), index within the ring and angle, in slot order (ring 1 left, ring 1 right, ...). */
export function slotTable(cfg: HaulConfig): { ring: number; j: number; angle: number }[] {
  const out: { ring: number; j: number; angle: number }[] = [];
  cfg.haul.rings.forEach((r, ring) => r.slots.forEach((angle, j) => out.push({ ring, j, angle })));
  return out;
}

export function slotCount(cfg: HaulConfig): number {
  return cfg.haul.rings.reduce((a, r) => a + r.slots.length, 0);
}

/** Ring (0-based) of a slot. */
export function ringOf(cfg: HaulConfig, slot: number): number {
  let i = slot;
  for (let r = 0; r < cfg.haul.rings.length; r++) {
    if (i < cfg.haul.rings[r].slots.length) return r;
    i -= cfg.haul.rings[r].slots.length;
  }
  return cfg.haul.rings.length - 1;
}

// ---------------------------------------------------------------- conditions and Star Map

/** The condition entry of a trait id, or null. */
export function condition(cfg: HaulConfig, trait: string | null): HaulCondition | null {
  if (!trait) return null;
  return cfg.haul.conditions.find((c) => c.id === trait) ?? null;
}

type CondKey = 'drill' | 'life' | 'speed' | 'capacity' | 'distance' | 'pileCap' | 'interval' | 'freighterCap' | 'away';

/** T(x) of section 2.3: the condition's multiplier for a hook (1 when untouched). */
export function T(cfg: HaulConfig, trait: string | null, key: CondKey): number {
  const c = condition(cfg, trait);
  return c ? c[key] : 1;
}

/** T(oreValue_o): the condition's ore value multiplier ("*" and the ore's own entry multiply). */
export function Tore(cfg: HaulConfig, trait: string | null, ore: string): number {
  const c = condition(cfg, trait);
  if (!c) return 1;
  return (c.oreValue['*'] ?? 1) * (c.oreValue[ore] ?? 1);
}

/** T(contractAdd): added to met contract multipliers. */
export function TcontractAdd(cfg: HaulConfig, trait: string | null): number {
  return condition(cfg, trait)?.contractAdd ?? 0;
}

/** Ore weights of a ring after the condition (ring 0-based). */
export function ringWeights(cfg: HaulConfig, ring: number, trait: string | null): { ores: string[]; weights: number[] } {
  const r = cfg.haul.rings[ring];
  const c = condition(cfg, trait);
  const ores = Object.keys(r.weights);
  const weights = ores.map((o) => {
    let w = r.weights[o];
    if (c) for (const m of c.oreWeight) if (m.ore === o && m.rings.includes(ring + 1)) w *= m.mult;
    return w;
  });
  return { ores, weights };
}

/** Level of the Star Map node with this effect (0 when none). */
export function starLevel(cfg: HaulConfig, starMap: StarMapState | undefined, effect: StarEffect): number {
  const node = cfg.haul.starMap.nodes.find((n) => n.effect === effect);
  if (!node) return 0;
  const l = starMap?.levels?.[node.id] ?? 0;
  return Number.isFinite(l) && l > 0 ? Math.floor(l) : 0;
}

/** The per-level number of the node with this effect. */
export function starPer(cfg: HaulConfig, effect: StarEffect): number {
  return cfg.haul.starMap.nodes.find((n) => n.effect === effect)?.per ?? 0;
}

/** Bonanza chance of a new rock: min(maxChance, 1 − (1 − base) × per^S(prospect)) (section 2.4 step 2, errata 71). */
export function bonanzaChance(cfg: HaulConfig, starMap: StarMapState | undefined): number {
  const per = starPer(cfg, 'bonanza') || 1;
  const c = 1 - (1 - cfg.haul.bonanza.chance) * Math.pow(per, starLevel(cfg, starMap, 'bonanza'));
  return Math.max(0, Math.min(cfg.haul.bonanza.maxChance, c));
}

// ---------------------------------------------------------------- rock stream

export interface Rock {
  ore: string;
  /** Seconds of drilling, after the condition and the bonanza x1.5 (Deep Bore is applied on arrival). */
  life: number;
  bonanza: boolean;
}

/**
 * Rock `n` of slot `slot` (section 2.4 step 2): from `rngMix4(seed, hashString('rock'), slot, n)`, so
 * it never depends on what the player did. Ore from the ring's weights after the condition, life
 * uniform in the ring's range times T(life) (and x`bonanza.life` for a bonanza rock), bonanza with
 * `bonanzaChance`. Three independent draws from one mixed seed.
 */
export function rockAt(cfg: HaulConfig, seed: number, slot: number, n: number, trait: string | null, starMap: StarMapState | undefined): Rock {
  const ring = ringOf(cfg, slot);
  const r: HaulRing = cfg.haul.rings[ring];
  const base = rngMix4(seed, hashString('rock'), slot, Math.max(0, n));
  const { ores, weights } = ringWeights(cfg, ring, trait);
  const pick = rngWeighted(rngMix(base, 1), weights).value;
  const u = roll(rngMix(base, 2));
  const bonanza = roll(rngMix(base, 3)) < bonanzaChance(cfg, starMap);
  let life = (r.life[0] + (r.life[1] - r.life[0]) * u) * T(cfg, trait, 'life');
  if (bonanza) life *= cfg.haul.bonanza.life;
  return { ore: ores[pick] ?? ores[0], life, bonanza };
}

// ---------------------------------------------------------------- rig tiers

/** Rig tier multipliers reached at level L: drill (with stripes past the last tier), life, seam weight, pile cap. */
export function rigTier(cfg: HaulConfig, level: number): { drill: number; life: number; seamWeight: number; pileCap: number; reached: number } {
  const t = cfg.haul.rig;
  let drill = 1;
  let life = 1;
  let seamWeight = 1;
  let pileCap = 1;
  let reached = 0;
  for (const tier of t.tiers) {
    if (level < tier.level) continue;
    drill *= tier.drill;
    life *= tier.life;
    seamWeight *= tier.seamWeight;
    pileCap *= tier.pileCap;
    reached++;
  }
  if (t.tiers.length) {
    const last = t.tiers[t.tiers.length - 1].level;
    drill *= Math.pow(t.stripeMult, Math.floor(Math.max(0, level - last) / t.stripeEvery));
  }
  return { drill, life, seamWeight, pileCap, reached };
}

// ---------------------------------------------------------------- global multiplier

/**
 * Global multiplier of a haul game: what economy.globalMultiplier gives a haul game (prestige
 * points x bonusPerPoint, which is 0 here; purchase multipliers; shared "all" upgrades). There is no
 * ad boost and no global-income card in this mode. Kept here so the haul engine never imports
 * economy.ts, which still imports the restaurant chain.
 */
export function haulGlobalMultiplier(cfg: HaulConfig, g: HaulGame): number {
  const prestige = 1 + (g.prestigePoints || 0) * cfg.economy.prestige.bonusPerPoint;
  let ent = 1;
  for (const m of Object.values(g.entitlements?.multipliers ?? {})) if (Number.isFinite(m) && m > 0) ent *= m;
  let up = 1;
  for (const u of cfg.upgrades ?? []) if (u.target === 'all' && g.upgrades.includes(u.id)) up *= u.revenueMult;
  const m = prestige * ent * up;
  return Number.isFinite(m) && m > 0 ? m : 1;
}

// ---------------------------------------------------------------- derived values

/** Drone speed multiplier from engine levels (capped at `speedMax`). */
export function engineMult(cfg: HaulConfig, engineLevel: number): number {
  const d = cfg.haul.drone;
  return Math.min(d.speedMax, 1 + d.speedPerLevel * (Math.max(1, engineLevel) - 1));
}

/** Freighter capacity F at a level, with the module bonus and condition (at least 1). */
export function freighterCapacity(cfg: HaulConfig, level: number, bonus: number, trait: string | null): number {
  const f = cfg.haul.freighter;
  const F = Math.floor(f.capacity * Math.pow(f.growth, Math.max(1, level) - 1) * (1 + bonus) * T(cfg, trait, 'freighterCap') + EPS);
  return Number.isFinite(F) ? Math.max(1, F) : MAX_CASH;
}

/** Base away time of a freighter level (before the condition and Quick Clamp). */
export function awayBase(cfg: HaulConfig, level: number): number {
  let s = cfg.haul.freighter.away[0].seconds;
  for (const a of cfg.haul.freighter.away) if (level >= a.from) s = a.seconds;
  return s;
}

/** Drone cap: capBase + capPerGalaxy × galaxy (+ Hangar Expansion). */
export function droneCapFor(cfg: HaulConfig, galaxy: number, products: string[]): number {
  const d = cfg.haul.drone;
  const hangar = cfg.haul.hangar && products.includes(cfg.haul.hangar.product) ? cfg.haul.hangar.droneCap : 0;
  return d.capBase + d.capPerGalaxy * Math.max(0, galaxy) + hangar;
}

/** The ores the active contract still wants (empty when none is active). */
export function wantedOres(h: HaulState): Set<string> {
  const c = h.contracts.active === null ? null : h.contracts.board[h.contracts.active];
  // Decision 40: only wants still to deliver (a want within half a unit is delivered).
  return new Set(c ? c.wants.filter((w) => w.units - (w.got ?? 0) >= 0.5 + EPS).map((w) => w.ore) : []);
}

/** The slot carrying a seam now (natural or flare). */
export function seamOn(h: HaulState, slot: number): boolean {
  return (h.vein.slot === slot && h.vein.until > h.clock) || (h.flare.slot === slot && h.flare.until > h.clock);
}

/** Ore price p_o (section 2.3): value × T(oreValue_o) × (1 + B(orePrice)) × (1 + per × S(assay)). */
export function orePrice(cfg: HaulConfig, g: HaulGame, ore: string, trait: string | null, bonus = fittedBonus(cfg, g, 'orePrice')): number {
  const o = cfg.haul.ores.find((x) => x.id === ore);
  if (!o) return 0;
  return o.value * Tore(cfg, trait, ore) * (1 + bonus) * (1 + starPer(cfg, 'orePrice') * starLevel(cfg, g.starMap, 'orePrice'));
}

const tableCache = new WeakMap<HaulConfig['haul'], { ring: number; j: number; angle: number }[]>();
function cachedTable(cfg: HaulConfig): { ring: number; j: number; angle: number }[] {
  let t = tableCache.get(cfg.haul);
  if (!t) {
    t = slotTable(cfg);
    tableCache.set(cfg.haul, t);
  }
  return t;
}

/**
 * Every derived value of section 2.3 for the current state. Recomputed once per engine step (it is
 * O(slots)); ticks, rates, payouts and the screens all read it, so they always agree.
 */
export function haulParams(cfg: HaulConfig, g: HaulGame & { haul: HaulState }): HaulParams {
  const h = g.haul;
  const trait = h.trait;
  const H = cfg.haul;
  const B = fittedBonuses(cfg, g);
  const bDrill = B.drillRate;
  const bCap = B.haulerCapacity;
  const bSpeed = B.haulerSpeed;
  const bFreighter = B.freighterCapacity;
  const bSorter = B.contractOreCapacity;
  const bReturn = Math.min(0.5, B.metReturn);
  const v = H.drone.speed * engineMult(cfg, h.fleet.engineLevel) * (1 + bSpeed) * T(cfg, trait, 'speed');
  const cBase = H.drone.capacity * Math.pow(H.drone.capacityGrowth, Math.max(1, h.fleet.capLevel) - 1) * (1 + bCap) * T(cfg, trait, 'capacity');
  const wanted = wantedOres(h);
  const prices: Record<string, number> = {};
  for (const o of H.ores) prices[o.id] = orePrice(cfg, g, o.id, trait, B.orePrice);
  const table = cachedTable(cfg);
  const slots: SlotParams[] = table.map((t, i) => {
    const s = h.slots[i];
    const ring = H.rings[t.ring];
    const tier = rigTier(cfg, s?.rigLevel ?? 1);
    const distance = ring.distance * T(cfg, trait, 'distance');
    const trip = (2 * distance) / v + H.drone.loadSeconds + H.drone.unloadSeconds;
    const hasRock = !!s && s.claimed && s.respawnAt === null && s.rockN >= 0;
    const seam = !!s && hasRock && seamOn(h, i);
    const rb0 = s && s.claimed ? ring.drill * Math.pow(H.rig.levelGrowth, Math.max(1, s.rigLevel) - 1) * tier.drill * (1 + bDrill) * T(cfg, trait, 'drill') : 0;
    const rb = hasRock ? rb0 * (s.bonanza ? H.bonanza.drill : 1) : 0;
    const r = rb * (seam ? H.seam.drill : 1);
    const cap = Math.max(H.pile.min, H.pile.seconds * rb) * T(cfg, trait, 'pileCap') * tier.pileCap * (seam ? H.seam.pileCap : 1);
    const c = cBase * (s && wanted.has(s.ore) ? 1 + bSorter : 1);
    const n = s && s.claimed ? s.haulers : 0;
    return {
      ring: t.ring,
      j: t.j,
      distance,
      rb,
      rb0,
      r,
      cap,
      c,
      cBase,
      trip,
      h: (n * c) / trip,
      hBase: (n * cBase) / trip,
      seam,
      tierLife: tier.life,
      tierSeamWeight: tier.seamWeight,
      price: s ? prices[s.ore] ?? 0 : 0,
    };
  });
  const away = awayBase(cfg, h.freighter.level) * T(cfg, trait, 'away');
  return {
    slots,
    v,
    F: freighterCapacity(cfg, h.freighter.level, bFreighter, trait),
    away,
    awayMet: away * (1 - bReturn),
    climb: H.freighter.climb,
    land: H.freighter.land,
    droneCap: droneCapFor(cfg, h.galaxy, g.entitlements?.products ?? []),
    prices,
    contractAdd: starPer(cfg, 'contractMult') * starLevel(cfg, g.starMap, 'contractMult') + TcontractAdd(cfg, trait),
    fee: H.contracts.fee,
    fullBonus: H.freighter.fullBonus,
    G: haulGlobalMultiplier(cfg, g),
    spill: B.overflowSpill,
    keeperValue: B.metCarryover,
    bonanzaChance: bonanzaChance(cfg, g.starMap),
  };
}

/** Units in the hold. */
export function holdTotal(h: HaulState): number {
  let t = 0;
  for (const v of Object.values(h.hold)) t += v;
  return t;
}

/** Sum of a units-by-ore record. */
export function sumUnits(r: Record<string, number>): number {
  let t = 0;
  for (const v of Object.values(r)) t += v;
  return t;
}

// ---------------------------------------------------------------- prices (section 2.5)

/** Next rig level of a slot: base × ringFactor^(ring) × growth^(L−1). */
export function rigCost(cfg: HaulConfig, g: HaulGame & { haul: HaulState }, slot: number): number {
  const s = g.haul.slots[slot];
  if (!s || !s.claimed) return Infinity;
  const c = cfg.haul.rig.cost;
  return c.base * Math.pow(c.ringFactor, ringOf(cfg, slot)) * Math.pow(c.growth, s.rigLevel - 1);
}

/** Highest claimed ring of the run (0-based; -1 when none). */
export function highestClaimedRing(cfg: HaulConfig, h: HaulState): number {
  let best = -1;
  h.slots.forEach((s, i) => {
    if (s.claimed) best = Math.max(best, ringOf(cfg, i));
  });
  return best;
}

/**
 * Ghost slots (errata 29): every unclaimed slot on rings up to the highest claimed ring of this run
 * + 1, in slot order. These are the slots the scene draws as dashed ghosts and the only ones
 * `claimSlot` accepts.
 */
export function ghostSlots(cfg: HaulConfig, g: HaulGame & { haul: HaulState }): number[] {
  const top = highestClaimedRing(cfg, g.haul) + 1;
  const out: number[] = [];
  g.haul.slots.forEach((s, i) => {
    if (!s.claimed && ringOf(cfg, i) <= top) out.push(i);
  });
  return out;
}

/** Claim price of a slot: base × ringFactor^(ring) × jFactor^j (Infinity once claimed, or beyond the next ring: errata 29). */
export function claimCost(cfg: HaulConfig, g: HaulGame & { haul: HaulState }, slot: number): number {
  if (!Number.isInteger(slot)) return Infinity;
  const s = g.haul.slots[slot];
  if (!s || s.claimed) return Infinity;
  const t = slotTable(cfg)[slot];
  if (!t || t.ring > highestClaimedRing(cfg, g.haul) + 1) return Infinity;
  const c = cfg.haul.claim;
  return c.base * Math.pow(c.ringFactor, t.ring) * Math.pow(c.jFactor, t.j) * (c.ringMult?.[t.ring] ?? 1);
}

/** Next drone: base × growth^(n−1), n = drones owned; Infinity at the drone cap. */
export function droneCost(cfg: HaulConfig, g: HaulGame & { haul: HaulState }): number {
  const h = g.haul;
  if (h.fleet.drones >= droneCapFor(cfg, h.galaxy, g.entitlements?.products ?? [])) return Infinity;
  const c = cfg.haul.drone.cost;
  return c.base * Math.pow(c.growth, Math.max(1, h.fleet.drones) - 1);
}

/** Next drone capacity level. */
export function capacityCost(cfg: HaulConfig, g: HaulGame & { haul: HaulState }): number {
  const c = cfg.haul.drone.capacityCost;
  return c.base * Math.pow(c.growth, g.haul.fleet.capLevel - 1);
}

/** Next drone engine level; Infinity once the speed multiplier reached its cap. */
export function engineCost(cfg: HaulConfig, g: HaulGame & { haul: HaulState }): number {
  if (engineMult(cfg, g.haul.fleet.engineLevel) >= cfg.haul.drone.speedMax - EPS) return Infinity;
  const c = cfg.haul.drone.engineCost;
  return c.base * Math.pow(c.growth, g.haul.fleet.engineLevel - 1);
}

/** Next freighter level. */
export function freighterCost(cfg: HaulConfig, g: HaulGame & { haul: HaulState }): number {
  const c = cfg.haul.freighter.cost;
  return c.base * Math.pow(c.growth, g.haul.freighter.level - 1);
}

/** The Dock Autopilot; Infinity once online. */
export function autopilotCost(cfg: HaulConfig, g: HaulGame & { haul: HaulState }): number {
  return g.haul.autopilot.online ? Infinity : cfg.haul.autopilot.cost;
}

/** True when `cash` covers `cost` (false for NaN, negative or infinite costs). */
export function affordable(cash: number, cost: number): boolean {
  return cost >= 0 && cost < Infinity && cash >= cost;
}


/**
 * Decision 64: seconds added to each launch cycle of a station without the autopilot (arming the
 * swipe, reacting to a full hold): `haul.freighter.manualAllowance`, 0 with the autopilot online.
 */
export function manualCycleExtra(cfg: HaulConfig, h: Pick<HaulState, 'autopilot'>): number {
  if (h.autopilot?.online) return 0;
  const x = cfg.haul.freighter.manualAllowance ?? 0;
  return Number.isFinite(x) && x > 0 ? x : 0;
}
