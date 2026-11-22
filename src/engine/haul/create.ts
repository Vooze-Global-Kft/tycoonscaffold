/**
 * Creating a run, adding the haul fields to a shared game state, and repairing saves (section 2.2,
 * the head starts of 2.10 and the Hangar Expansion entitlement of 5.4). Pure.
 */
import type { GameState } from '../types';
import { emptyLoadout, normaliseSockets } from '../loadout';
import { hashString, rngMix } from '../rng';
import { droneCapFor, freighterCapacity, rigTier, rockAt, slotCount, starLevel, starPer, T } from './params';
import { openBoard } from './trade';
import type { HaulConfig, HaulGame, HaulLifetimeStats, HaulState, HaulStats, SlotState, StarMapState } from './types';

export const EMPTY_LIFETIME: HaulLifetimeStats = { hauled: 0, launches: 0, contractsMet: 0, depleted: 0, claims: 0, seamDrags: 0, transmissionsAcked: 0 };

function emptySlot(): SlotState {
  return { claimed: false, rigLevel: 1, haulers: 0, rockN: 0, ore: '', bonanza: false, life: 0, pile: 0, full: false, respawnAt: null, routeFrom: 0, delivered: 0 };
}

/** Puts rock `n` of the slot's stream on a slot (life x the rig tier's life multiplier). */
export function placeRock(cfg: HaulConfig, h: Pick<HaulState, 'seed' | 'trait'>, slot: number, s: SlotState, n: number, starMap: StarMapState | undefined): SlotState {
  const rock = rockAt(cfg, h.seed, slot, n, h.trait, starMap);
  return { ...s, rockN: n, ore: rock.ore, bonanza: rock.bonanza, life: rock.life * rigTier(cfg, s.rigLevel).life, pile: 0, full: false, respawnAt: null, delivered: 0 };
}

/** Starting credits of a run: economy.startingCash plus Seed Credits (per^(1+L) at level L ≥ 1). */
export function runStartCash(cfg: HaulConfig, starMap: StarMapState | undefined): number {
  const L = starLevel(cfg, starMap, 'seedCredits');
  const per = starPer(cfg, 'seedCredits');
  return cfg.economy.startingCash + (L > 0 && per > 0 ? Math.pow(per, 1 + L) : 0);
}

/** Slots claimed by the Afterburner head start: the list for its level, never more than `bestClaimed`. */
export function headStartSlots(cfg: HaulConfig, level: number, bestClaimed: number): number[] {
  if (level <= 0) return [];
  const lists = cfg.haul.starMap.headStart;
  const list = lists[Math.min(level, lists.length) - 1] ?? [];
  return list.slice(0, Math.max(1, bestClaimed));
}

/**
 * A fresh run (section 2.2): slot 0 claimed with rock 0 and a pile of `start.pile`; Afterburner
 * head-start slots claimed with rig level `headStartRig` (slot 0 included) and no drones; drones =
 * `start.drones` + Spare Drones + Hangar Expansion's start drones, all idle on the rack; the
 * autopilot online with Systems Preload; from galaxy 1 on, contracts are unlocked with a fresh board.
 */
export function createHaul(
  cfg: HaulConfig,
  seed: number,
  galaxy: number,
  trait: string | null,
  starMap: StarMapState,
  haulStats: Pick<HaulStats, 'bestClaimed'>,
  entitlements: { products: string[] },
): HaulState {
  const H = cfg.haul;
  const base = { seed: seed >>> 0, trait };
  const head = new Set(headStartSlots(cfg, starLevel(cfg, starMap, 'headStart'), haulStats.bestClaimed));
  const slots: SlotState[] = [];
  for (let i = 0; i < slotCount(cfg); i++) {
    let s = emptySlot();
    if (i === 0 || head.has(i)) {
      s = { ...s, claimed: true, rigLevel: head.has(i) ? H.starMap.headStartRig : 1 };
      s = placeRock(cfg, base, i, s, 0, starMap);
    }
    slots.push(s);
  }
  if (!head.has(0)) slots[0] = { ...slots[0], pile: H.start.pile };
  const hangar = H.hangar && entitlements.products.includes(H.hangar.product) ? H.hangar.startDrones : 0;
  const spare = Math.round(starLevel(cfg, starMap, 'spareDrones') * (starPer(cfg, 'spareDrones') || 1));
  const cap = droneCapFor(cfg, galaxy, entitlements.products);
  const drones = Math.min(cap, H.start.drones + spare + hangar);
  const h: HaulState = {
    clock: 0,
    seed: seed >>> 0,
    galaxy,
    trait,
    slots,
    fleet: { drones, capLevel: 1, engineLevel: 1 },
    idle: drones,
    hold: {},
    freighter: { level: 1, phase: 'docked', t: 0, cargo: {}, payout: 0, met: false, away: 0, contract: null },
    autopilot: { online: starLevel(cfg, starMap, 'preload') > 0, policy: 'full' },
    contracts: { unlocked: false, board: [], next: 0, active: null },
    vein: { slot: null, until: 0, guests: [], nextAt: H.seam.first * T(cfg, trait, 'interval'), count: 0 },
    flare: { slot: null, until: 0, guests: [], charges: 0, nextFreeAt: H.flare.firstAt, adsToday: 0, adDay: '', adNextAt: 0 },
    keeper: 0,
    flags: {},
    hintsShown: {},
    marks: { idleSince: drones > 0 ? 0 : null, holdFullSince: null, noContractSince: null, flareReadySince: null },
    counters: { launches: 0, contractsMet: 0, depleted: 0, hauled: 0, claims: 0, drilled: 0, shipped: 0 },
  };
  // Units already on piles at the start count as drilled (conservation: drilled = piles + hold + cargo + shipped).
  h.counters.drilled = slots.reduce((a, s) => a + s.pile, 0);
  if (galaxy > 0) h.contracts = openBoard(cfg, h, freighterCapacity(cfg, 1, 0, trait));
  return h;
}

/**
 * Adds the haul fields to a shared game state made by `createInitialState` (the store's new game):
 * metaSeed, an empty loadout, an empty Star Map, haulStats, the lifetime counters, and run 0 in
 * galaxy 0 (no condition). Cash becomes the run's starting cash.
 */
export function withHaulFields(cfg: HaulConfig, base: GameState): HaulGame & { haul: HaulState } {
  const metaSeed = rngMix(base.rng >>> 0, hashString('meta'));
  const starMap: StarMapState = { levels: {}, spent: 0 };
  const haulStats: HaulStats = { bestClaimed: 1, jumps: 0, galaxiesVisited: [0], ring2Pod: false };
  const haul = createHaul(cfg, rngMix(base.rng >>> 0, hashString('run')), 0, null, starMap, haulStats, base.entitlements);
  return {
    ...base,
    cash: runStartCash(cfg, starMap),
    stats: { ...base.stats, ...EMPTY_LIFETIME },
    haul,
    metaSeed,
    loadout: emptyLoadout(),
    starMap,
    haulStats,
  };
}

const num = (x: unknown, fallback: number, min = 0): number => (typeof x === 'number' && Number.isFinite(x) && x >= min ? x : fallback);
const int = (x: unknown, fallback: number, min = 0): number => Math.floor(num(x, fallback, min));
const units = (x: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (x && typeof x === 'object') for (const [k, v] of Object.entries(x as Record<string, unknown>)) if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
  return out;
};

/**
 * Repairs the haul fields of a loaded save on top of a shared state the shared reconcile already
 * fixed (`base`): missing or broken values get defaults, numbers are made finite and non-negative,
 * slots added to the config later are appended unclaimed, a broken run is replaced by a fresh one.
 * Never throws.
 */
export function reconcileHaul(cfg: HaulConfig, base: GameState, raw: unknown): HaulGame & { haul: HaulState } {
  const fresh = withHaulFields(cfg, base);
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const sm = (r.starMap ?? {}) as Record<string, unknown>;
  const starMap: StarMapState = { levels: {}, spent: num(sm.spent, 0) };
  for (const n of cfg.haul.starMap.nodes) {
    const l = int((sm.levels as Record<string, unknown> | undefined)?.[n.id], 0);
    if (l > 0) starMap.levels[n.id] = n.cap === null ? l : Math.min(n.cap, l);
  }
  const hs = (r.haulStats ?? {}) as Record<string, unknown>;
  const visited = Array.isArray(hs.galaxiesVisited) ? (hs.galaxiesVisited as unknown[]).filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0) : [0];
  const haulStats: HaulStats = { bestClaimed: int(hs.bestClaimed, 1, 1), jumps: int(hs.jumps, 0), galaxiesVisited: visited.length ? [...new Set(visited)] : [0], ring2Pod: hs.ring2Pod === true };
  const st = (r.stats ?? {}) as Record<string, unknown>;
  const lifetime = Object.fromEntries(Object.keys(EMPTY_LIFETIME).map((k) => [k, num(st[k], 0)])) as unknown as HaulLifetimeStats;
  const out = {
    ...fresh,
    cash: base.cash,
    stats: { ...base.stats, ...lifetime },
    metaSeed: int(r.metaSeed, fresh.metaSeed) >>> 0,
    loadout: { sockets: normaliseSockets((r.loadout as { sockets?: unknown } | undefined)?.sockets) },
    starMap,
    haulStats,
  };
  const h = reconcileRun(cfg, r.haul, out);
  return { ...out, haul: h ?? createHaul(cfg, fresh.haul.seed, 0, null, starMap, haulStats, base.entitlements) };
}

function reconcileRun(cfg: HaulConfig, raw: unknown, g: HaulGame): HaulState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.slots)) return null;
  const galaxy = int(r.galaxy, 0);
  const trait = typeof r.trait === 'string' && cfg.haul.conditions.some((c) => c.id === r.trait) ? r.trait : null;
  const fresh = createHaul(cfg, int(r.seed, 1) >>> 0, galaxy, trait, g.starMap, g.haulStats, g.entitlements);
  const ores = new Set(cfg.haul.ores.map((o) => o.id));
  const slots = fresh.slots.map((def, i) => {
    const s = (r.slots as unknown[])[i] as Record<string, unknown> | undefined;
    if (!s || typeof s !== 'object') return i === 0 ? def : { ...def, claimed: false };
    const respawnAt = s.respawnAt === null ? null : num(s.respawnAt, NaN);
    const slot: SlotState = {
      claimed: s.claimed === true || i === 0,
      rigLevel: int(s.rigLevel, 1, 1),
      haulers: int(s.haulers, 0),
      rockN: int(s.rockN, 0, -1),
      ore: typeof s.ore === 'string' && ores.has(s.ore) ? s.ore : def.ore || cfg.haul.ores[0].id,
      bonanza: s.bonanza === true,
      life: num(s.life, 0),
      pile: num(s.pile, 0),
      full: s.full === true,
      respawnAt: respawnAt === null || Number.isFinite(respawnAt) ? respawnAt : null,
      routeFrom: num(s.routeFrom, 0),
      delivered: num(s.delivered, 0),
    };
    if (!slot.claimed) return { ...def, claimed: false, haulers: 0 };
    return slot;
  });
  const fleet = (r.fleet ?? {}) as Record<string, unknown>;
  const drones = int(fleet.drones, fresh.fleet.drones);
  const onRoutes = slots.reduce((a, s) => a + (s.claimed ? s.haulers : 0), 0);
  const fr = (r.freighter ?? {}) as Record<string, unknown>;
  const phases = ['docked', 'climb', 'away', 'land'];
  const ap = (r.autopilot ?? {}) as Record<string, unknown>;
  const ct = (r.contracts ?? {}) as Record<string, unknown>;
  const board = Array.isArray(ct.board)
    ? (ct.board as Record<string, unknown>[])
        .filter((c) => c && Array.isArray(c.wants))
        .map((c) => ({
          k: int(c.k, 0),
          buyer: typeof c.buyer === 'string' ? c.buyer : cfg.haul.contracts.buyers[0].id,
          wants: (c.wants as Record<string, unknown>[]).filter((w) => w && typeof w.ore === 'string').map((w) => ({ ore: w.ore as string, units: int(w.units, 1, 1) })),
          mult: num(c.mult, 1, 1),
          launchesLeft: int(c.launchesLeft, 1, 0),
        }))
    : [];
  const activeRaw = typeof ct.active === 'number' && Number.isInteger(ct.active) && ct.active >= 0 && ct.active < board.length ? ct.active : null;
  const seam = (x: unknown) => {
    const v = (x ?? {}) as Record<string, unknown>;
    const slot = typeof v.slot === 'number' && Number.isInteger(v.slot) && v.slot >= 0 && v.slot < slots.length ? v.slot : null;
    const guests = Array.isArray(v.guests) ? (v.guests as unknown[]).filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= -1 && x < slots.length) : [];
    return { slot, until: num(v.until, 0), guests: slot === null ? [] : guests, v };
  };
  const vein = seam(r.vein);
  const flare = seam(r.flare);
  const marks = (r.marks ?? {}) as Record<string, unknown>;
  const mark = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const counters = (r.counters ?? {}) as Record<string, unknown>;
  const bools = (x: unknown) => Object.fromEntries(Object.entries((x ?? {}) as Record<string, unknown>).filter(([, v]) => typeof v === 'boolean')) as Record<string, boolean>;
  const nums = (x: unknown) => Object.fromEntries(Object.entries((x ?? {}) as Record<string, unknown>).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))) as Record<string, number>;
  const h: HaulState = {
    ...fresh,
    clock: num(r.clock, 0),
    slots,
    fleet: { drones: Math.max(drones, onRoutes), capLevel: int(fleet.capLevel, 1, 1), engineLevel: int(fleet.engineLevel, 1, 1) },
    idle: Math.max(0, Math.max(drones, onRoutes) - onRoutes),
    hold: units(r.hold),
    freighter: {
      level: int(fr.level, 1, 1),
      phase: (phases.includes(fr.phase as string) ? fr.phase : 'docked') as HaulState['freighter']['phase'],
      t: num(fr.t, 0),
      cargo: units(fr.cargo),
      payout: num(fr.payout, 0),
      met: fr.met === true,
      away: num(fr.away, 0),
      contract: typeof fr.contract === 'number' ? fr.contract : null,
    },
    autopilot: { online: ap.online === true || fresh.autopilot.online, policy: ap.policy === 'contract' ? 'contract' : 'full' },
    contracts: { unlocked: ct.unlocked === true || fresh.contracts.unlocked, board: ct.unlocked === true ? board : fresh.contracts.board, next: int(ct.next, fresh.contracts.next), active: ct.unlocked === true ? activeRaw : fresh.contracts.active },
    vein: { slot: vein.slot, until: vein.until, guests: vein.guests, nextAt: num(vein.v.nextAt, fresh.vein.nextAt), count: int(vein.v.count, 0) },
    flare: {
      slot: flare.slot,
      until: flare.until,
      guests: flare.guests,
      charges: int(flare.v.charges, 0),
      nextFreeAt: num(flare.v.nextFreeAt, fresh.flare.nextFreeAt),
      adsToday: int(flare.v.adsToday, 0),
      adDay: typeof flare.v.adDay === 'string' ? flare.v.adDay : '',
      adNextAt: num(flare.v.adNextAt, 0),
    },
    keeper: num(r.keeper, 0),
    flags: bools(r.flags),
    hintsShown: nums(r.hintsShown),
    marks: { idleSince: mark(marks.idleSince), holdFullSince: mark(marks.holdFullSince), noContractSince: mark(marks.noContractSince), flareReadySince: mark(marks.flareReadySince) },
    counters: {
      launches: num(counters.launches, 0),
      contractsMet: num(counters.contractsMet, 0),
      depleted: num(counters.depleted, 0),
      hauled: num(counters.hauled, 0),
      claims: num(counters.claims, 0),
      drilled: num(counters.drilled, 0),
      shipped: num(counters.shipped, 0),
    },
  };
  if (h.freighter.phase === 'docked') h.freighter = { ...h.freighter, t: 0, cargo: {}, payout: 0 };
  return h;
}
