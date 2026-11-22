/**
 * The reset (section 2.10): Warp Cores, the Star Map, galaxy conditions and the Jump. Pure.
 */
import { hashString } from '../rng';
import { createHaul, runStartCash } from './create';
import { rngMix4, roll } from './params';
import type { HaulConfig, HaulGame, HaulState, JumpPreview, StarMapState, StarNodeView } from './types';

/** Total cores the lifetime earnings are worth: floor(scale × (lifetime / threshold)^exponent) (the shared formula). */
export function totalCores(cfg: HaulConfig, lifetime: number): number {
  const p = cfg.economy.prestige;
  const v = Math.floor(p.scale * Math.pow(Math.max(0, lifetime) / p.threshold, p.exponent) + 1e-9);
  return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER;
}

/** Cores a Jump would add now (total − already gained). */
export function coresAvailable(cfg: HaulConfig, g: HaulGame): number {
  return Math.max(0, totalCores(cfg, g.lifetimeEarnings) - g.prestigePoints);
}

/** Cores in hand: prestigePoints − starMap.spent. */
export function coresInHand(g: HaulGame): number {
  return Math.max(0, g.prestigePoints - (g.starMap?.spent ?? 0));
}

/** Level of a Star Map node by id. */
export function starNodeLevel(g: HaulGame, nodeId: string): number {
  const l = g.starMap?.levels?.[nodeId] ?? 0;
  return Number.isFinite(l) && l > 0 ? Math.floor(l) : 0;
}

/** Cost of a node's next level: ceil(base × growth^L); null at its cap or for an unknown node. */
export function starNodeCost(cfg: HaulConfig, nodeId: string, level: number): number | null {
  const n = cfg.haul.starMap.nodes.find((x) => x.id === nodeId);
  if (!n || (n.cap !== null && level >= n.cap)) return null;
  return Math.ceil(n.base * Math.pow(n.growth, level) - 1e-9);
}

/** Every node as the Star Map shows it. */
export function starMapView(cfg: HaulConfig, g: HaulGame): StarNodeView[] {
  const hand = coresInHand(g);
  return cfg.haul.starMap.nodes.map((n) => {
    const level = starNodeLevel(g, n.id);
    const cost = starNodeCost(cfg, n.id, level);
    return { id: n.id, level, cap: n.cap, cost, canBuy: cost !== null && cost <= hand };
  });
}

/**
 * Buys one level of a Star Map node with cores in hand. Refused (state unchanged) at the cap or
 * without enough cores. Head starts and run-start effects apply from the next run; price, contract,
 * bonanza and seam effects apply at once.
 */
export function buyStarNode(cfg: HaulConfig, g: HaulGame, nodeId: string): HaulGame {
  const level = starNodeLevel(g, nodeId);
  const cost = starNodeCost(cfg, nodeId, level);
  if (cost === null || cost > coresInHand(g)) return g;
  const starMap: StarMapState = { levels: { ...g.starMap.levels, [nodeId]: level + 1 }, spent: g.starMap.spent + cost };
  return { ...g, starMap };
}

/**
 * The three galaxy conditions offered at Jump `jumpIndex`: a seeded shuffle
 * (`rngMix4(metaSeed, hashString('traits'), jumpIndex, 0)`) of every condition except the current
 * one, first three. The same for the preview, after a reload, and never re-rolled.
 */
export function offersFor(cfg: HaulConfig, metaSeed: number, jumpIndex: number, currentTrait: string | null): string[] {
  const ids = cfg.haul.conditions.map((c) => c.id).filter((id) => id !== currentTrait);
  const base = rngMix4(metaSeed, hashString('traits'), jumpIndex, 0);
  // Fisher-Yates with independent draws.
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(roll(rngMix4(base, i, 0, 0)) * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, 3);
}

/** Display name of a galaxy index: names[index mod n], then " II", " III", ... once the list runs out. */
export function galaxyName(cfg: HaulConfig, galaxy: number): string {
  const names = cfg.haul.galaxies.names;
  const g = Math.max(0, Math.floor(galaxy));
  const base = names[g % names.length];
  const round = Math.floor(g / names.length);
  return round === 0 ? base : `${base} ${roman(round + 1)}`;
}

function roman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let x = n;
  for (const [v, s] of table) while (x >= v) {
    out += s;
    x -= v;
  }
  return out;
}

/** Cores the Jump flow can spend: cores in hand plus this Jump's gain. */
export function coresAfterJump(cfg: HaulConfig, g: HaulGame): number {
  return coresInHand(g) + coresAvailable(cfg, g);
}

/** The Star Map's bottom panel (section 4.6). */
export function jumpPreview(cfg: HaulConfig, g: HaulGame): JumpPreview {
  const h = g.haul;
  const next = (h?.galaxy ?? 0) + 1;
  const gain = coresAvailable(cfg, g);
  return {
    gain,
    coresInHand: coresInHand(g),
    canJump: gain >= 1 && !!h,
    offers: offersFor(cfg, g.metaSeed, g.haulStats.jumps, h?.trait ?? null),
    nextGalaxy: next,
    nextGalaxyName: galaxyName(cfg, next),
  };
}

/**
 * The Jump (`engineMode.prestige`): needs at least 1 new core and `traitId` among the offers.
 * Resets cash (to the run's starting cash with Seed Credits), run earnings, the whole haul run and
 * cash upgrades; keeps cores, the Star Map, Dark Matter, modules, the loadout, pods, missions, story,
 * lifetime stats, haulStats and entitlements. The run seed becomes
 * `rngMix4(seed, hashString('jump'), jumpIndex + 1, 0)`. A Derelict Cache on the first arrival at
 * each galaxy index. Refused (state unchanged) otherwise.
 *
 * `buys` are Star Map node ids bought, in order, with the cores in hand after this Jump's gain and
 * before the new run is built, so a node bought in the Jump flow already shapes the run it starts
 * (Systems Preload, Afterburner, Seed Credits, Spare Drones). A buy that is not affordable is skipped.
 */
export function prestigeHaul(cfg: HaulConfig, g: HaulGame, now: number, traitId: string, buys: string[] = []): HaulGame {
  const h: HaulState | null = g.haul;
  const gained = coresAvailable(cfg, g);
  if (!h || gained < 1) return g;
  const jumpIndex = g.haulStats.jumps;
  if (!offersFor(cfg, g.metaSeed, jumpIndex, h.trait).includes(traitId)) return g;
  const galaxy = h.galaxy + 1;
  const seed = rngMix4(h.seed, hashString('jump'), jumpIndex + 1, 0);
  const first = !g.haulStats.galaxiesVisited.includes(galaxy);
  const haulStats = {
    ...g.haulStats,
    jumps: jumpIndex + 1,
    galaxiesVisited: first ? [...g.haulStats.galaxiesVisited, galaxy] : g.haulStats.galaxiesVisited,
  };
  let planned: HaulGame = { ...g, prestigePoints: g.prestigePoints + gained };
  for (const id of buys) planned = buyStarNode(cfg, planned, id);
  const starMap = planned.starMap;
  const haul = createHaul(cfg, seed, galaxy, traitId, starMap, haulStats, g.entitlements);
  let chests = g.chests;
  const pod = cfg.haul.pods.derelict;
  if (first && cfg.meta.chests.some((c) => c.id === pod)) chests = { ...chests, owned: { ...chests.owned, [pod]: (chests.owned[pod] ?? 0) + 1 } };
  return {
    ...g,
    cash: runStartCash(cfg, starMap),
    starMap,
    runEarnings: 0,
    prestigePoints: g.prestigePoints + gained,
    prestigeCount: g.prestigeCount + 1,
    upgrades: g.upgrades.filter((id) => cfg.upgrades.find((u) => u.id === id)?.premium),
    haul,
    haulStats,
    chests,
    lastSavedAt: now,
  };
}
