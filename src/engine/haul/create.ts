/**
 * Creating a run, adding the haul fields to a shared game state, and repairing saves (section 2.2,
 * the head starts of 2.10 and the Hangar Expansion entitlement of 5.4). Pure.
 */
import type { GameState } from '../types';
import { emptyLoadout, normaliseSockets } from '../loadout';
import { hashString, rngMix } from '../rng';
import { droneCapFor, freighterCapacity, haulParams, rigTier, ringOf, rockAt, slotCount, starLevel, starPer, T } from './params';
import { topUpBoard } from './trade';
import type { Contract, HaulConfig, HaulGame, HaulLifetimeStats, HaulState, HaulStats, SlotState, StarMapState } from './types';

export const EMPTY_LIFETIME: HaulLifetimeStats = { hauled: 0, launches: 0, contractsMet: 0, depleted: 0, claims: 0, seamDrags: 0, transmissionsAcked: 0 };

function emptySlot(): SlotState {
  return { claimed: false, rigLevel: 1, haulers: 0, rockN: 0, ore: '', bonanza: false, life: 0, pile: 0, full: false, respawnAt: null, routeFrom: 0, delivered: 0 };
}

/**
 * Puts rock `n` of the slot's stream on a slot (life x the rig tier's life multiplier, applied at
 * arrival: errata 31; rock 0 of a ring-1 slot lives at least `start.firstLife` in every galaxy, Decisions 58 and 64). `noBonanza` forces a plain rock (slot 0's starting rock, errata 28): same ore
 * and draw, without the bonanza flag and its life factor.
 */
export function placeRock(cfg: HaulConfig, h: Pick<HaulState, 'seed' | 'trait'> & { galaxy?: number }, slot: number, s: SlotState, n: number, starMap: StarMapState | undefined, noBonanza = false): SlotState {
  const rock = rockAt(cfg, h.seed, slot, n, h.trait, starMap);
  const bonanza = rock.bonanza && !noBonanza;
  let life = rock.bonanza && !bonanza ? rock.life / cfg.haul.bonanza.life : rock.life;
  // Decisions 58 and 64: in every galaxy the first rock of each ring-1 slot lasts at least `start.firstLife`.
  const first = cfg.haul.start.firstLife ?? 0;
  if (n === 0 && first > 0 && ringOf(cfg, slot) === 0) life = Math.max(life, first);
  return { ...s, rockN: n, ore: rock.ore, bonanza, life: life * rigTier(cfg, s.rigLevel).life, pile: 0, full: false, respawnAt: null, delivered: 0 };
}

/** Highest ring (1-based) among a run's claimed slots. */
export function claimedRingMax(cfg: HaulConfig, h: HaulState): number {
  let best = 0;
  h.slots.forEach((s, i) => {
    if (s.claimed) best = Math.max(best, ringOf(cfg, i) + 1);
  });
  return best;
}

/** A fresh HaulStats (a new game). */
export function emptyHaulStats(): HaulStats {
  return { bestClaimed: 1, jumps: 0, galaxiesVisited: [0], ring2Pod: false, bestRing: 1, contractsSeen: false, autopilotSeen: false, pendingJump: null };
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
  const base = { seed: seed >>> 0, trait, galaxy };
  const head = new Set(headStartSlots(cfg, starLevel(cfg, starMap, 'headStart'), haulStats.bestClaimed));
  const slots: SlotState[] = [];
  for (let i = 0; i < slotCount(cfg); i++) {
    let s = emptySlot();
    if (i === 0 || head.has(i)) {
      s = { ...s, claimed: true, rigLevel: head.has(i) ? H.starMap.headStartRig : 1 };
      s = placeRock(cfg, base, i, s, 0, starMap, i === 0);
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
    vein: { slot: null, until: 0, guests: [], peak: 0, nextAt: (galaxy > 0 ? (H.seam.firstLater ?? H.seam.first) : H.seam.first) * T(cfg, trait, 'interval'), count: 0 },
    flare: { slot: null, until: 0, guests: [], peak: 0, charges: 0, nextFreeAt: H.flare.firstAt, adsToday: 0, adDay: '', adNextAt: 0 },
    keeper: 0,
    // A run that starts with Hangar Expansion's drones has had them (no second mid-run grant).
    flags: hangar > 0 ? { hangarDrones: true } : {},
    hintsShown: {},
    marks: { idleSince: drones > 0 ? 0 : null, holdFullSince: null, noContractSince: null, flareReadySince: null, boughtAt: null, lastBuy: null },
    counters: { launches: 0, contractsMet: 0, depleted: 0, hauled: 0, claims: 0, drilled: 0, shipped: 0 },
  };
  // Units already on piles at the start count as drilled (conservation: drilled = piles + hold + cargo + shipped).
  h.counters.drilled = slots.reduce((a, s) => a + s.pile, 0);
  // Decision 56: no fixed first contract from galaxy 2 on; the board opens once three launches are measured.
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
  const haulStats: HaulStats = emptyHaulStats();
  const haul = createHaul(cfg, rngMix(base.rng >>> 0, hashString('run')), 0, null, starMap, haulStats, base.entitlements);
  haulStats.bestRing = Math.max(haulStats.bestRing, claimedRingMax(cfg, haul));
  haulStats.autopilotSeen = haul.autopilot.online;
  haulStats.contractsSeen = haul.contracts.unlocked;
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
 * Never throws. The run is null only while a confirmed Jump waits for its condition
 * (`haulStats.pendingJump`, errata 17); any other save gets a run.
 */
export function reconcileHaul(cfg: HaulConfig, base: GameState, raw: unknown): HaulGame {
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
  const pj = (hs.pendingJump ?? null) as Record<string, unknown> | null;
  const condIds = new Set(cfg.haul.conditions.map((c) => c.id));
  const pjOffers = pj && Array.isArray(pj.offers) ? (pj.offers as unknown[]).filter((x): x is string => typeof x === 'string' && condIds.has(x)) : [];
  const pendingJump =
    pj && typeof pj === 'object' && pjOffers.length > 0 ? { index: int(pj.index, 0), galaxy: int(pj.galaxy, 1, 1), seed: int(pj.seed, 1) >>> 0, offers: pjOffers } : null;
  const haulStats: HaulStats = {
    bestClaimed: int(hs.bestClaimed, 1, 1),
    jumps: int(hs.jumps, 0),
    galaxiesVisited: visited.length ? [...new Set(visited)] : [0],
    ring2Pod: hs.ring2Pod === true,
    bestRing: Math.min(cfg.haul.rings.length, int(hs.bestRing, 1, 1)),
    contractsSeen: hs.contractsSeen === true,
    autopilotSeen: hs.autopilotSeen === true,
    pendingJump,
  };
  const sh = (hs.shift ?? null) as Record<string, unknown> | null;
  if (sh && typeof sh === 'object' && typeof sh.day === 'string') haulStats.shift = { day: sh.day, startedAt: num(sh.startedAt, 0), met: int(sh.met, 0) };
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
  // Between a confirmed Jump and the condition pick the run is null on purpose (errata 17).
  if (pendingJump && (r.haul === null || r.haul === undefined)) return { ...out, haul: null };
  if (!pendingJump && r.haul === null) haulStats.pendingJump = null;
  const h = reconcileRun(cfg, r.haul, out) ?? createHaul(cfg, fresh.haul.seed, 0, null, starMap, haulStats, base.entitlements);
  if (pendingJump) haulStats.pendingJump = null; // a run exists: the Jump was finished
  haulStats.bestRing = Math.max(haulStats.bestRing, claimedRingMax(cfg, h));
  haulStats.bestClaimed = Math.max(haulStats.bestClaimed, h.slots.filter((s) => s.claimed).length);
  if (h.autopilot.online) haulStats.autopilotSeen = true;
  if (h.contracts.unlocked) haulStats.contractsSeen = true;
  return { ...out, haul: h };
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
  const L = cfg.haul.contracts.launches;
  const activeIn = typeof ct.active === 'number' && Number.isInteger(ct.active) && ct.active >= 0 ? ct.active : null;
  const board: Contract[] = [];
  let activeRaw: number | null = null;
  if (Array.isArray(ct.board))
    (ct.board as Record<string, unknown>[]).forEach((c, i) => {
      if (!c || typeof c !== 'object' || !Array.isArray(c.wants)) return;
      const wants = (c.wants as Record<string, unknown>[])
        .filter((w) => w && typeof w.ore === 'string')
        .map((w) => {
          const u = int(w.units, 1, 1);
          return { ore: w.ore as string, units: u, got: Math.min(u, num(w.got, 0)) };
        });
      if (!wants.length) return;
      // Before Decision 40 a save had no `taken`: its active contract is the taken one.
      const taken = c.taken === true || (c.taken === undefined && i === activeIn);
      if (taken && activeRaw !== null) return; // at most one taken contract
      if (taken) activeRaw = board.length;
      // Before Decision 40 an active contract kept a short life; taken now, it gets the full launches (rules-8).
      const oldActive = taken && c.taken === undefined;
      board.push({
        k: int(c.k, 0),
        buyer: typeof c.buyer === 'string' && cfg.haul.contracts.buyers.some((b) => b.id === c.buyer) ? c.buyer : cfg.haul.contracts.buyers[0].id,
        wants: taken ? wants : wants.map((w) => ({ ...w, got: 0 })),
        mult: num(c.mult, 1, 1),
        launchesLeft: oldActive ? L : Math.max(1, Math.min(taken ? L : cfg.haul.contracts.offerLaunches, int(c.launchesLeft, 1, 1))),
        taken,
      });
    });
  const seam = (x: unknown) => {
    const v = (x ?? {}) as Record<string, unknown>;
    const slot = typeof v.slot === 'number' && Number.isInteger(v.slot) && v.slot >= 0 && v.slot < slots.length ? v.slot : null;
    let guests = Array.isArray(v.guests) ? (v.guests as unknown[]).filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= -1 && x < slots.length) : [];
    // Never more guests than drones on the seam slot, and the slot must be claimed.
    const ok = slot !== null && slots[slot].claimed;
    if (!ok) guests = [];
    else if (guests.length > slots[slot].haulers) guests = guests.slice(guests.length - slots[slot].haulers);
    return { slot: ok ? slot : null, until: num(v.until, 0), guests, peak: Math.max(guests.length, ok ? int(v.peak, 0) : 0), v };
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
      toward: units(fr.toward),
      bonus: num(fr.bonus, 0),
      plain: num(fr.plain, num(fr.payout, 0)),
    },
    autopilot: { online: ap.online === true || fresh.autopilot.online, policy: ap.policy === 'contract' ? 'contract' : 'full' },
    contracts: {
      unlocked: ct.unlocked === true || fresh.contracts.unlocked,
      board: ct.unlocked === true ? board : fresh.contracts.board,
      next: int(ct.next, fresh.contracts.next),
      active: ct.unlocked === true ? activeRaw : fresh.contracts.active,
      recent: units(ct.recent),
      measured: int(ct.measured, 0),
      peak: units(ct.peak),
      ...(typeof ct.sizedF === 'number' && Number.isFinite(ct.sizedF) && ct.sizedF > 0 ? { sizedF: ct.sizedF } : {}),
    },
    vein: { slot: vein.slot, until: vein.until, guests: vein.guests, peak: vein.peak, nextAt: num(vein.v.nextAt, fresh.vein.nextAt), count: int(vein.v.count, 0) },
    flare: {
      slot: flare.slot,
      until: flare.until,
      guests: flare.guests,
      peak: flare.peak,
      charges: Math.min(cfg.haul.flare.maxCharges, int(flare.v.charges, 0)),
      nextFreeAt: num(flare.v.nextFreeAt, fresh.flare.nextFreeAt),
      adsToday: int(flare.v.adsToday, 0),
      adDay: typeof flare.v.adDay === 'string' ? flare.v.adDay : '',
      adNextAt: num(flare.v.adNextAt, 0),
    },
    keeper: num(r.keeper, 0),
    flags: bools(r.flags),
    hintsShown: nums(r.hintsShown),
    marks: {
      idleSince: mark(marks.idleSince),
      holdFullSince: mark(marks.holdFullSince),
      noContractSince: mark(marks.noContractSince),
      flareReadySince: mark(marks.flareReadySince),
      boughtAt: mark(marks.boughtAt),
      lastBuy: typeof marks.lastBuy === 'string' && /^(drone|capacity|engine|freighter|autopilot|(rig|claim) \d+)$/.test(marks.lastBuy) ? marks.lastBuy : null,
    },
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
  if (h.freighter.phase === 'docked') h.freighter = { ...h.freighter, t: 0, cargo: {}, payout: 0, toward: {}, bonus: 0, plain: 0 };
  // A board longer than haul.contracts.board (a board size that shrank, a damaged save) is cut back
  // to it, the taken contract kept (rules-8). A shorter one is a place left empty by a drop (Decision
  // 56) and fills at the next warp-out; an unlocked board with nothing on it is opened now.
  if (h.contracts.unlocked && h.contracts.board.length > cfg.haul.contracts.board) {
    const C = { ...h.contracts, board: [...h.contracts.board] };
    const keep = C.active !== null ? C.board[C.active] : null;
    C.board = C.board.filter((c) => c !== keep).slice(0, cfg.haul.contracts.board - (keep ? 1 : 0));
    if (keep) {
      C.board.unshift(keep);
      C.active = 0;
    }
    h.contracts = C;
  }
  if (h.contracts.unlocked && h.contracts.board.length === 0) {
    const C = { ...h.contracts, board: [] as Contract[], active: null };
    const p = haulParams(cfg, { ...g, haul: { ...h, contracts: C } } as HaulGame & { haul: HaulState });
    topUpBoard(cfg, { ...h, contracts: C }, p);
    h.contracts = C;
  }
  if (h.contracts.unlocked && h.contracts.sizedF === undefined) {
    // Sized for the freighter it was loaded with (the next resize starts from here).
    const p = haulParams(cfg, { ...g, haul: h } as HaulGame & { haul: HaulState });
    h.contracts = { ...h.contracts, sizedF: p.F };
  }
  if (h.contracts.active !== null && !h.contracts.board[h.contracts.active]?.taken) h.contracts = { ...h.contracts, active: null };
  if (h.vein.slot !== null && h.vein.slot === h.flare.slot) h.flare = { ...h.flare, slot: null, guests: [], peak: 0 };
  // A claimed slot waiting for its first rock with no time set (an interrupted claim) gets it now.
  h.slots.forEach((s, i) => {
    if (s.claimed && s.respawnAt === null && s.rockN < 0) h.slots[i] = { ...s, respawnAt: h.clock, life: 0, pile: 0 };
  });
  return h;
}
