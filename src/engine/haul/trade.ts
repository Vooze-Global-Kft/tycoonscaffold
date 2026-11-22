/**
 * Loading, payout and contracts (section 2.6 with Decision 40: a contract is delivered over several
 * launches). Pure.
 */
import { hashString } from '../rng';
import { EPS, fillsFreighter, manualCycleExtra, ringWeights, rngMix4, roll, sumUnits } from './params';
import type { Contract, ContractView, HaulConfig, HaulEvent, HaulParams, HaulState, HaulStats } from './types';

/**
 * A want counts as delivered when less than half a unit is missing (units are fractional, contracts
 * whole): what the screens show rounded as "70 / 70" is complete, and no screen ever shows "1 to
 * go" for a unit that cannot arrive (rules-10).
 */
export const UNIT_TOL = 0.5;

/** Units of a want still to deliver (fractional; 0 once within UNIT_TOL). */
export function wantLeft(w: { units: number; got: number }, aboard = 0): number {
  const x = w.units - (w.got ?? 0) - aboard;
  return x < UNIT_TOL + EPS ? 0 : x;
}

/** True when `cargo` completes `contract`: with what it already got, every want is delivered. */
export function contractMet(cargo: Record<string, number>, contract: Contract | null): boolean {
  if (!contract) return false;
  return contract.wants.every((w) => wantLeft(w, cargo[w.ore] ?? 0) === 0);
}

/** The active (taken) contract of a run, or null. */
export function activeContract(h: HaulState): Contract | null {
  return h.contracts.active === null ? null : h.contracts.board[h.contracts.active] ?? null;
}

/** What of `cargo` counts toward `contract`: min(cargo_o, units_o − got_o) per wanted ore. */
export function towardContract(cargo: Record<string, number>, contract: Contract | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!contract) return out;
  for (const w of contract.wants) {
    const n = Math.min(cargo[w.ore] ?? 0, Math.max(0, w.units - (w.got ?? 0)));
    if (n > 0) out[w.ore] = (out[w.ore] ?? 0) + n;
  }
  return out;
}

/**
 * Loading on launch: the freighter takes at most F units from the hold, first each wanted ore of
 * the contract up to what it still needs (units − got), then the rest of the hold by ore price,
 * highest first (ties in config order). Returns the cargo and what stays in the hold.
 */
export function loadCargo(cfg: HaulConfig, params: HaulParams, hold: Record<string, number>, contract: Contract | null): { cargo: Record<string, number>; hold: Record<string, number> } {
  const left: Record<string, number> = { ...hold };
  const cargo: Record<string, number> = {};
  let room = params.F;
  const take = (ore: string, max: number) => {
    const n = Math.min(max, left[ore] ?? 0, room);
    if (!(n > 0)) return;
    cargo[ore] = (cargo[ore] ?? 0) + n;
    left[ore] = (left[ore] ?? 0) - n;
    room -= n;
  };
  if (contract) for (const w of contract.wants) take(w.ore, Math.max(0, w.units - (w.got ?? 0)));
  const order = cfg.haul.ores.map((o, i) => ({ id: o.id, i, p: params.prices[o.id] ?? 0 })).sort((a, b) => b.p - a.p || a.i - b.i);
  for (const o of order) take(o.id, Infinity);
  // Ores the config no longer lists (an old save) still ship, at price 0.
  for (const ore of Object.keys(left)) take(ore, Infinity);
  for (const ore of Object.keys(left)) if (!(left[ore] > EPS)) delete left[ore];
  return { cargo, hold: left };
}

/**
 * The contract bonus (Decision 40): `Σ_o units_o × p_o × (M' − 1) × G` with `M' = mult + contractAdd`.
 * Paid once, at the warp-out that completes the contract, on top of the cargo's own price, so over
 * its life the contract's own units are paid at M'. Fixed for a contract at the current prices: the
 * board, the strip and the receipt show this one figure (before the day-shift double, Decision 53).
 */
export function contractBonus(cfg: HaulConfig, params: HaulParams, c: Contract): number {
  void cfg;
  return bonusOf(params, c);
}

function bonusOf(params: HaulParams, c: Contract): number {
  const M = c.mult + params.contractAdd;
  let sum = 0;
  for (const w of c.wants) sum += w.units * (params.prices[w.ore] ?? 0);
  const v = sum * Math.max(0, M - 1) * params.G;
  return Number.isFinite(v) ? Math.max(0, v) : Number.MAX_VALUE;
}

/**
 * Payout of a launch (section 2.6 with Decision 40): every unit is paid at its price,
 * `Σ n_o p_o × (full ? fullBonus : 1) × (1 + keeper) × G`; when this launch completes `contract`
 * (`met`), the cargo that does not count toward it keeps the delivery fee (× (1 + fee)) and `bonus`
 * is the contract bonus (paid at the warp-out, not included in `payout`). `plain` is the payout
 * without the fee, `toward` what of the cargo counts toward the contract. `forceMet` prices the
 * cargo as completing whatever it holds.
 */
export function payoutFor(
  params: HaulParams,
  cargo: Record<string, number>,
  contract: Contract | null,
  keeper: number,
  forceMet = false,
): { payout: number; met: boolean; plain: number; bonus: number; toward: Record<string, number> } {
  const met = !!contract && (forceMet || contractMet(cargo, contract));
  const toward = towardContract(cargo, contract);
  let sum = 0;
  let plain = 0;
  for (const [ore, n] of Object.entries(cargo)) {
    if (!(n > 0)) continue;
    const p = params.prices[ore] ?? 0;
    const w = Math.min(n, toward[ore] ?? 0);
    plain += n * p;
    sum += met ? w * p + (n - w) * p * (1 + params.fee) : n * p;
  }
  const k = (fillsFreighter(sumUnits(cargo), params.F) ? params.fullBonus : 1) * (1 + Math.max(0, keeper)) * params.G;
  const clamp = (x: number) => (Number.isFinite(x) ? Math.max(0, x) : Number.MAX_VALUE);
  const bonus = met && contract ? bonusOf(params, contract) : 0;
  return { payout: clamp(sum * k), met, plain: clamp(plain * k), bonus, toward };
}

/** Rings (0-based) with a claimed slot whose rock is present (errata 27: a ring "with a rock"). */
export function claimedRings(cfg: HaulConfig, h: HaulState): number[] {
  const out = new Set<number>();
  let i = 0;
  cfg.haul.rings.forEach((r, ring) => {
    for (let j = 0; j < r.slots.length; j++, i++) {
      const s = h.slots[i];
      if (s?.claimed && s.respawnAt === null && s.rockN >= 0) out.add(ring);
    }
  });
  return [...out].sort((a, b) => a - b);
}

/**
 * NOT THE CONTRACT RULE since Decision 56 (contracts are drawn from what the station really ships,
 * `contractBasis`); kept only for the balance bot's routing estimate until it moves to the views.
 * What the station can put into one launch of each of a set of ores (the rule of Decision 40): the hold fills in proportion to what the routes bring, so one launch carries about
 * `F × r_o / R` of ore o, with r_o the rate of the routes on rocks of that ore and R that of every
 * route (each route `min(drill, drones × capacity / trip)`, no seam, no module). `now` is that with
 * the routes as they are; `routed` after a player sends `share` of the fleet (default
 * `fleetShare`) to the ores' rocks, split evenly between two ores: idle drones first, then the
 * least useful drones of the routes of other ores (a route's last drone only with `last`), and for
 * two ores, when no other route can give one, the other wanted ore's least useful drone; each to
 * the rock of its ore where it adds most, and only while it adds something there (a drill-bound
 * ore is not routed for).
 */
export interface ContractStation {
  /** Ores of the rocks present on claimed slots, by ring (0-based), with their count. */
  present: Record<number, Record<string, number>>;
  reach(ores: string[], opts?: { share?: number; last?: boolean }): { now: number[]; routed: number[] };
}

export function contractStation(cfg: HaulConfig, params: HaulParams, h: HaulState): ContractStation {
  const routes: { ore: string; rb: number; e: number; n: number }[] = [];
  const present: Record<number, Record<string, number>> = {};
  h.slots.forEach((s, i) => {
    const sp = params.slots[i];
    if (!s?.claimed || s.respawnAt !== null || s.rockN < 0 || !sp) return;
    const row = (present[sp.ring] ??= {});
    row[s.ore] = (row[s.ore] ?? 0) + 1;
    routes.push({ ore: s.ore, rb: sp.rb, e: sp.trip > 0 ? sp.cBase / sp.trip : 0, n: s.haulers });
  });
  const f = (r: { rb: number; e: number }, n: number) => Math.min(r.rb, n * r.e);
  const shares = (ns: number[], ores: string[]) => {
    let R = 0;
    const by = ores.map(() => 0);
    routes.forEach((r, i) => {
      const x = f(r, ns[i]);
      R += x;
      const k = ores.indexOf(r.ore);
      if (k >= 0) by[k] += x;
    });
    return by.map((x) => (R > 0 ? (params.F * x) / R : 0));
  };
  return {
    present,
    reach(ores: string[], opts?: { share?: number; last?: boolean }) {
      const ns = routes.map((r) => r.n);
      const now = shares(ns, ores);
      const fleet = h.fleet.drones;
      let idle = Math.max(0, h.idle);
      const share = opts?.share ?? cfg.haul.contracts.fleetShare;
      const keep = opts?.last ? 0 : 1;
      const per = Math.ceil((share * fleet) / Math.max(1, ores.length));
      const cheapest = (ok: (ore: string) => boolean) => {
        let from = -1;
        let loss = Infinity;
        routes.forEach((r, i) => {
          if (!ok(r.ore) || ns[i] <= keep) return;
          const l = f(r, ns[i]) - f(r, ns[i] - 1);
          if (l < loss) {
            loss = l;
            from = i;
          }
        });
        return from;
      };
      ores.forEach((ore) => {
        const mine = routes.map((r, i) => (r.ore === ore ? i : -1)).filter((i) => i >= 0);
        if (!mine.length) return;
        let need = per - mine.reduce((a, i) => a + ns[i], 0);
        for (let guard = 0; need > 0 && guard < 400; guard++) {
          let from = -1;
          if (idle <= 0) {
            from = cheapest((o) => !ores.includes(o));
            // Two ores and nothing else to take from: the other wanted ore gives its least useful drone.
            if (from < 0 && ores.length > 1) from = cheapest((o) => o !== ore && ores.includes(o));
            if (from < 0) break;
          }
          let to = mine[0];
          let gain = -1;
          for (const i of mine) {
            const g = f(routes[i], ns[i] + 1) - f(routes[i], ns[i]);
            if (g > gain) {
              gain = g;
              to = i;
            }
          }
          // Every rock of this ore is drill-bound: another drone adds nothing there, so a player
          // routing for it gains nothing (only slowing the other ores would raise the share).
          if (!(gain > 1e-9 * Math.max(1, routes[to].rb))) break;
          if (from >= 0) ns[from] -= 1;
          else idle -= 1;
          ns[to] += 1;
          need -= 1;
        }
      });
      return { now, routed: shares(ns, ores) };
    },
  };
}

/**
 * The steady figure of the contract rule (Decision 56): what one launch carries of each ore with the
 * routes as they are, `F × r_o / R`, with each route `min(drill, drones × capacity / trip)` (base
 * drill, no seam, no module, no pile buffer; a warming route counts with its drones). `rate` is R in
 * units per second. A rock that is respawning or dry is no route.
 */
export function steadyPerLaunch(params: HaulParams, h: HaulState): { perLaunch: Record<string, number>; rate: number } {
  const by: Record<string, number> = {};
  let R = 0;
  h.slots.forEach((s, i) => {
    const sp = params.slots[i];
    if (!s?.claimed || s.respawnAt !== null || s.rockN < 0 || !sp || !(s.haulers > 0) || !(s.life > 0 || s.pile > 0)) return;
    const e = sp.trip > 0 ? sp.cBase / sp.trip : 0;
    const x = Math.min(sp.rb, s.haulers * e);
    if (!(x > 0) || !Number.isFinite(x)) return;
    by[s.ore] = (by[s.ore] ?? 0) + x;
    R += x;
  });
  const perLaunch: Record<string, number> = {};
  for (const ore of Object.keys(by)) perLaunch[ore] = R > 0 ? (params.F * by[ore]) / R : 0;
  return { perLaunch, rate: R };
}

/**
 * Decision 64, "the pace figures count a rock only for as long as it lives": what each of the next
 * `n` launches carries of each ore with the routes as they are. Each route ships `F × x / R` a launch
 * (x = `min(drill, drones × capacity / trip)`, base drill, no seam, no pile buffer; R the routes still
 * feeding) until what its rock has left (`life × drill + pile`) runs out; what arrives after it (a
 * respawn) is not counted, and the other routes' shares grow once it stops. A launch takes
 * `max(cycle, F / R)` seconds, the cycle with the hand's allowance on a station without the autopilot.
 * `first[ore]` is the first routed rock of that ore to stop feeding inside the `n` launches (its slot
 * and the seconds until then); `horizon` the seconds of the `n` launches.
 */
export interface RouteSchedule {
  byLaunch: Record<string, number[]>;
  /** Average units per launch of each ore over the `n` launches (the figure the views show). */
  perLaunch: Record<string, number>;
  intervals: number[];
  horizon: number;
  first: Record<string, { slot: number; seconds: number }>;
}

export function routeSchedule(cfg: HaulConfig, params: HaulParams, h: HaulState, n: number): RouteSchedule {
  const routes: { slot: number; ore: string; x: number; u: number }[] = [];
  h.slots.forEach((s, i) => {
    const sp = params.slots[i];
    if (!s?.claimed || s.respawnAt !== null || s.rockN < 0 || !sp || !(s.haulers > 0) || !(s.life > 0 || s.pile > 0)) return;
    const e = sp.trip > 0 ? sp.cBase / sp.trip : 0;
    const x = Math.min(sp.rb, s.haulers * e);
    if (!(x > 0) || !Number.isFinite(x)) return;
    const drill = sp.r > 0 ? sp.r : sp.rb;
    const u = Math.max(0, s.life) * drill + Math.max(0, s.pile);
    routes.push({ slot: i, ore: s.ore, x, u: Number.isFinite(u) ? u : Infinity });
  });
  const F = params.F;
  const cycle = params.climb + params.away + params.land + manualCycleExtra(cfg, h);
  const N = Math.max(0, Math.min(1000, Math.floor(n)));
  const byLaunch: Record<string, number[]> = {};
  for (const r of routes) byLaunch[r.ore] ??= new Array(N).fill(0);
  const intervals: number[] = [];
  const first: Record<string, { slot: number; seconds: number }> = {};
  let t = 0;
  for (let k = 0; k < N; k++) {
    let R = 0;
    for (const r of routes) if (r.u > EPS) R += r.x;
    const dt = R > 0 ? Math.max(cycle, F / R) : cycle;
    intervals.push(dt);
    if (R > 0) {
      for (const r of routes) {
        if (!(r.u > EPS)) continue;
        const share = (F * r.x) / R;
        const take = Math.min(r.u, share);
        r.u -= take;
        byLaunch[r.ore][k] += take;
        if (!(r.u > EPS)) {
          const at = t + dt * (share > 0 ? take / share : 1);
          if (!first[r.ore] || at < first[r.ore].seconds) first[r.ore] = { slot: r.slot, seconds: at };
        }
      }
    }
    t += dt;
  }
  const perLaunch: Record<string, number> = {};
  for (const [ore, xs] of Object.entries(byLaunch)) perLaunch[ore] = N > 0 ? xs.reduce((a, x) => a + x, 0) / N : 0;
  return { byLaunch, perLaunch, intervals, horizon: t, first };
}

/**
 * Exponential average of what the station ships (Decision 56), updated at each warp-out with its
 * cargo. With `steady` (the routes' steady figure at that warp-out) an ore's average is at least
 * that: drones added to an ore count at once, and drones taken off just before a warp-out do not
 * lower what the routes delivered until then (an average lagging behind a recent routing would let a
 * contract drawn while those drones sit on the rack be met once they go back).
 */
export function noteShipped(cfg: HaulConfig, h: HaulState, cargo: Record<string, number>, steady?: Record<string, number>): void {
  const C = h.contracts;
  // The highest routes' figure of each ore since the last warp-out counts too (drones recalled just
  // before the warp-out still count), then it starts again from the routes as they are.
  if (steady) steady = Object.fromEntries(Object.entries(steady).filter(([, x]) => Number.isFinite(x) && x > 0));
  if (steady && C.peak) {
    const top: Record<string, number> = { ...steady };
    for (const [o, x] of Object.entries(C.peak)) if (x > (top[o] ?? 0) && Number.isFinite(x)) top[o] = x;
    // (The peaks of different moments may add up to more than one hold; each ore keeps its own:
    // scaling them back would hand the ore whose drones were recalled a smaller figure.)
    C.peak = { ...steady };
    steady = top;
  } else if (steady) C.peak = { ...steady };
  const n = C.measured ?? 0;
  const a = n <= 0 ? 1 : Math.max(2 / (cfg.haul.contracts.recentLaunches + 1), 1 / (n + 1));
  const prev = C.recent ?? {};
  const next: Record<string, number> = {};
  for (const ore of new Set([...Object.keys(prev), ...Object.keys(cargo)])) {
    const x = (1 - a) * (prev[ore] ?? 0) + a * Math.max(0, cargo[ore] ?? 0);
    if (x > 1e-9 && Number.isFinite(x)) next[ore] = x;
  }
  if (steady) {
    // Raised to the routes' figure; the ores not raised then give way so a launch stays one hold
    // (the routes' figures add up to F).
    const F = Object.values(steady).reduce((a, x) => a + (Number.isFinite(x) ? x : 0), 0);
    const up = new Set<string>();
    for (const [ore, x] of Object.entries(steady)) {
      if (x > (next[ore] ?? 0) && Number.isFinite(x)) {
        next[ore] = x;
        up.add(ore);
      }
    }
    const fixed = [...up].reduce((a, o) => a + next[o], 0);
    const rest = Object.keys(next).filter((o) => !up.has(o)).reduce((a, o) => a + next[o], 0);
    if (F > 0 && up.size && fixed + rest > F && rest > 0) {
      const k = Math.max(0, F - fixed) / rest;
      for (const o of Object.keys(next)) if (!up.has(o)) next[o] *= k;
      for (const o of Object.keys(next)) if (!(next[o] > 1e-9)) delete next[o];
    }
  }
  C.recent = next;
  C.measured = n + 1;
}

/** Keeps the highest routes' figure of each ore since the last warp-out (Decision 56; called after every action). */
export function notePeak(params: HaulParams, h: HaulState): void {
  const C = h.contracts;
  if (!C.unlocked && (C.measured ?? 0) < 1) return;
  const st = steadyPerLaunch(params, h).perLaunch;
  const peak = { ...(C.peak ?? {}) };
  let changed = !C.peak;
  for (const [o, x] of Object.entries(st)) {
    if (Number.isFinite(x) && x > (peak[o] ?? 0)) {
      peak[o] = x;
      changed = true;
    }
  }
  if (changed) C.peak = peak;
}

/** What a draw reads of the station (Decision 56). Built by `contractBasis`; tests may build one by hand. */
export interface ContractBasis {
  galaxy: number;
  F: number;
  /** Units of each ore per launch the station really shipped lately (the steady figure until three launches are measured). */
  recent: Record<string, number>;
  /** The steady figure of the routes as they are (`steadyPerLaunch`). */
  steady: Record<string, number>;
  /**
   * Decision 64: the routes' figure over the contract's launches counting each rock only while it
   * lives (`routeSchedule(…, L).perLaunch`, the views' figure). Optional (a basis built by hand reads
   * `steady`): the cap of an offer's units and the eligibility of an ore whose rocks dried use it.
   */
  lasting?: Record<string, number>;
  /** The same once rocks of a ring's minor ore that dry within the contract come back as the ring's main ore (optional). */
  future?: Record<string, number>;
  prices: Record<string, number>;
  /** Global multiplier and the met contract's added multiplier (Broker Seat, the condition), for the bonus test. */
  G: number;
  contractAdd: number;
  /** Farthest ring (0-based) with a present rock of each ore on a claimed slot. */
  ringOf: Record<string, number>;
  /** Longest life left (seconds) among the present rocks of each ore. */
  lifeOf: Record<string, number>;
  /** Drill rate (units/s, base, no seam) of the present rocks of each ore: with one more rig level each, the most a launch can carry of it is `drill × levelGrowth × interval`. */
  drillOf: Record<string, number>;
  /**
   * What full piles of each ore can add over a contract's launches on top of the routes' figure: the
   * hold fills by haul rates while piles last, so at most `L × (F × H_o / H − steady_o)`, and never
   * more than the ore's pile capacity.
   */
  pileOf: Record<string, number>;
  /** Ores that are the main ore (half the weight or more) of the ring of a claimed slot holding a rock of it: its slots keep bringing it. */
  mainOf: Record<string, boolean>;
  /** Seconds per launch, about: max(climb + away + land, F / R). */
  interval: number;
  /** Credits per second of the station, about: the recent launch's value / interval. */
  income: number;
}

export function contractBasis(cfg: HaulConfig, params: HaulParams, h: HaulState): ContractBasis {
  const st = steadyPerLaunch(params, h);
  const ringOf: Record<string, number> = {};
  const lifeOf: Record<string, number> = {};
  const mainOf: Record<string, boolean> = {};
  const drillOf: Record<string, number> = {};
  const pileOf: Record<string, number> = {};
  const haulOf: Record<string, number> = {};
  let haulAll = 0;
  h.slots.forEach((s, i) => {
    const sp = params.slots[i];
    if (!s?.claimed || s.respawnAt !== null || s.rockN < 0 || !sp) return;
    ringOf[s.ore] = Math.max(ringOf[s.ore] ?? -1, sp.ring);
    lifeOf[s.ore] = Math.max(lifeOf[s.ore] ?? 0, s.life);
    if (s.life > 0 && sp.rb > 0) drillOf[s.ore] = (drillOf[s.ore] ?? 0) + sp.rb;
    if (sp.rb > 0) pileOf[s.ore] = (pileOf[s.ore] ?? 0) + sp.cap / (sp.seam ? cfg.haul.seam.pileCap : 1);
    if (s.haulers > 0 && sp.trip > 0 && (s.life > 0 || s.pile > 0)) {
      const x = (s.haulers * sp.cBase) / sp.trip;
      if (Number.isFinite(x)) {
        haulOf[s.ore] = (haulOf[s.ore] ?? 0) + x;
        haulAll += x;
      }
    }
    const w = ringWeights(cfg, sp.ring, h.trait);
    const sum = w.weights.reduce((a, x) => a + x, 0);
    const mine = w.weights[w.ores.indexOf(s.ore)] ?? 0;
    if (sum > 0 && mine >= 0.5 * sum) mainOf[s.ore] = true;
  });
  const L = cfg.haul.contracts.launches;
  for (const ore of Object.keys(pileOf)) {
    const byHaul = haulAll > 0 ? (params.F * (haulOf[ore] ?? 0)) / haulAll : 0;
    pileOf[ore] = Math.min(pileOf[ore], L * Math.max(0, byHaul - (st.perLaunch[ore] ?? 0)));
  }
  const measured = (h.contracts.measured ?? 0) >= 3 && h.contracts.recent;
  const recent = measured ? { ...h.contracts.recent } : { ...st.perLaunch };
  // Decision 64: a station without the autopilot counts the hand's allowance in its cycle.
  const cycle = params.climb + params.away + params.land + manualCycleExtra(cfg, h);
  const interval = st.rate > 0 ? Math.max(cycle, params.F / st.rate) : Infinity;
  let value = 0;
  for (const [ore, n] of Object.entries(recent)) value += n * (params.prices[ore] ?? 0);
  const income = Number.isFinite(interval) && interval > 0 ? (value * params.fullBonus * params.G) / interval : 0;
  // The routes' figure once the rocks that will not last the contract are replaced: a rock of a
  // ring's minor ore that dries within the launches most likely comes back as the ring's main ore.
  const future: Record<string, number> = {};
  let R = 0;
  h.slots.forEach((s, i) => {
    const sp = params.slots[i];
    if (!s?.claimed || s.respawnAt !== null || s.rockN < 0 || !sp || !(s.haulers > 0) || !(s.life > 0 || s.pile > 0)) return;
    const x = Math.min(sp.rb, (s.haulers * (sp.trip > 0 ? sp.cBase / sp.trip : 0)));
    if (!(x > 0) || !Number.isFinite(x)) return;
    let ore = s.ore;
    if (!(s.life >= L * interval)) {
      const w = ringWeights(cfg, sp.ring, h.trait);
      const top = w.ores[w.weights.indexOf(Math.max(...w.weights))];
      if (top && top !== ore && (w.weights[w.ores.indexOf(ore)] ?? 0) < 0.5 * w.weights.reduce((a, y) => a + y, 0)) ore = top;
    }
    future[ore] = (future[ore] ?? 0) + x;
    R += x;
  });
  for (const ore of Object.keys(future)) future[ore] = R > 0 ? (params.F * future[ore]) / R : 0;
  const lasting = routeSchedule(cfg, params, h, L).perLaunch;
  return { galaxy: h.galaxy, F: params.F, recent, steady: st.perLaunch, lasting, future, prices: params.prices, G: params.G, contractAdd: params.contractAdd, ringOf, lifeOf, mainOf, drillOf, pileOf, interval, income };
}

/**
 * Contract `k` of a run's stream (section 2.6, errata 27, Decisions 40 and 56). In galaxy 1,
 * contract 0 is fixed: the first buyer, min(units, F) of the first ore, its multiplier, taken; from
 * galaxy 2 on there is none. Later ones are offers drawn from `rngMix4(seed, hashString('contract'),
 * k, n)` (n = 1 the ore, 2 the raise, 3 one or two ores, 4 the second ore, 5 its hold, 6 jitter, 9 a
 * quota's share) and the buyer from `rngMix4(seed, hashString('buyer'), k, 0)`, skipping buyers in
 * `avoid` (those already on the board).
 *
 * From what the station really ships (`basis.recent`, Decision 56). An ore is eligible when it is at
 * least `minValueShare` of a recent launch's value, its share of a launch raised by `raise[0]` stays
 * under `maxShare`, one of its present rocks lasts the contract's launches, and its contract at the
 * largest raise pays at least `minBonusSeconds` of income. The ore is drawn among the eligible ones
 * not in `avoidOres` (the ores other offers want) when any is left. "Raise it": `units = round(L ×
 * recent × (1 + g))`, g in `raise` capped by `maxShare` (and raised until the bonus passes the
 * income test), never below `L × steady × (1 + raise[0] / 2)`. A two-ore contract (chance
 * `twoOreChance`, three ores shipped, a second eligible ore): the second ore "holds",
 * `round(L × recent × U(holdShare))`, and g is capped so both fit in the launches with the third ore's
 * share. A station that ships a single ore (or offers nothing eligible) gets the quota contract of
 * Decision 40 (`round(L × F × U(quota))` units of its main ore, the multiplier lowered). The
 * multiplier is `mult[farthest ring] ± jitter + raiseMult × g`, rounded to 0.1.
 */
export function contractAt(cfg: HaulConfig, seed: number, k: number, basis: ContractBasis, avoid: string[] = [], avoidOres: string[] = [], rivals: Rival[] = []): Contract {
  return drawAt(cfg, seed, k, basis, avoid, avoidOres, false, rivals) as Contract;
}

/**
 * The offer a warp-out draws. Since the lead's finishing note ("a player must never sit in front of
 * an empty board") it is always `contractAt`'s contract: when no ore passes, the rules relax in order
 * (value share, then the drill limit) and the last resort is the quota. The `| null` stays so a
 * later rule may leave a place empty; callers handle it.
 */
export function offerAt(cfg: HaulConfig, seed: number, k: number, basis: ContractBasis, avoid: string[] = [], avoidOres: string[] = [], rivals: Rival[] = []): Contract | null {
  return drawAt(cfg, seed, k, basis, avoid, avoidOres, true, rivals);
}

/** An offer already on the board, as a new draw compares itself with it (Decision 64: no dominated offers). */
export interface Rival {
  ores: string[];
  /** Its raise over the routes' figure (`lasting`): the largest `units / (L × figure) − 1` of its wants. */
  raise: number;
  bonus: number;
  mult: number;
}

/** True when a basis's station ships a single ore (Decision 64: one buyer on such a station). */
export function shipsOneOre(cfg: HaulConfig, basis: ContractBasis): boolean {
  const recent = basis.recent;
  const total = Object.values(recent).reduce((a, x) => a + x, 0);
  return cfg.haul.ores.filter((o) => total > 0 && (recent[o.id] ?? 0) > 0.02 * total).length <= 1;
}

function drawAt(cfg: HaulConfig, seed: number, k: number, basis: ContractBasis, avoid: string[], avoidOres: string[], none: boolean, rivals: Rival[] = []): Contract | null {
  const C = cfg.haul.contracts;
  const L = C.launches;
  const F = Math.max(1, basis.F);
  if (k === 0 && basis.galaxy === 0) {
    const buyer = C.buyers[Math.min(C.first.buyer, C.buyers.length - 1)];
    return { k, buyer: buyer.id, wants: [{ ore: C.first.ore, units: Math.max(1, Math.min(C.first.units, Math.floor(F))), got: 0 }], mult: C.first.mult, launchesLeft: L, taken: true };
  }
  const buyerRoll = roll(rngMix4(seed, hashString('buyer'), k, 0));
  const hc = hashString('contract');
  const draw = (n: number) => roll(rngMix4(seed, hc, k, n));
  const b0 = Math.min(C.buyers.length - 1, Math.floor(buyerRoll * C.buyers.length));
  let bi = b0;
  for (let i = 0; i < C.buyers.length && avoid.includes(C.buyers[bi].id); i++) bi = (b0 + i + 1) % C.buyers.length;
  const buyer = avoid.includes(C.buyers[bi].id) ? C.buyers[b0] : C.buyers[bi];
  const oreIds = cfg.haul.ores.map((o) => o.id);
  const recent = basis.recent;
  const total = Object.values(recent).reduce((a, x) => a + x, 0);
  const valueOf = (ore: string) => (recent[ore] ?? 0) * (basis.prices[ore] ?? 0);
  const launchValue = oreIds.reduce((a, o) => a + valueOf(o), 0);
  const shipped = oreIds.filter((o) => (recent[o] ?? 0) > 0.02 * total && total > 0);
  // Decision 64: the routes' figure over the contract's launches, each rock counted only while it
  // lives (the views' figure). An ore whose routes now ship less than half what it shipped lately
  // (its rocks dried) is not asked for, and no offer asks more than L × that figure × (1 + raise.hi).
  const fig = (ore: string) => Math.max(0, (basis.lasting ? basis.lasting[ore] : basis.steady[ore]) ?? 0);
  const alive = (ore: string) => fig(ore) > 0 && fig(ore) >= 0.5 * (recent[ore] ?? 0);
  const capUnits = (ore: string) => (fig(ore) > 0 ? Math.max(1, Math.floor(L * fig(ore) * (1 + C.raise[1]))) : Infinity);
  // Rocks that last the contract: drying inside its launches costs the ore under a tenth of its figure.
  const firm = (ore: string) => fig(ore) >= 0.9 * (basis.steady[ore] ?? 0);
  // The share of a launch an ore has now: what it shipped, or the routes as they are when those carry
  // more (the last pass of the draw reads what it shipped only).
  let shipShareOnly = false;
  const share = (ore: string) => (shipShareOnly ? (recent[ore] ?? 0) : Math.max(recent[ore] ?? 0, basis.steady[ore] ?? 0, basis.future?.[ore] ?? 0)) / F;
  const multBase = (ores: string[]) => {
    const far = Math.max(0, ...ores.map((o) => basis.ringOf[o] ?? 0));
    const base = C.mult[Math.min(far, C.mult.length - 1)];
    return base + (draw(6) * 2 - 1) * C.jitter;
  };
  const round1 = (x: number) => Math.max(1, Math.round(x * 10) / 10);
  const bonusOfUnits = (wants: { ore: string; units: number }[], mult: number) => wants.reduce((a, w) => a + w.units * (basis.prices[w.ore] ?? 0), 0) * Math.max(0, mult + basis.contractAdd - 1) * basis.G;
  const make = (wants: { ore: string; units: number }[], mult: number): Contract => ({
    k,
    buyer: buyer.id,
    wants: wants.map((w) => ({ ore: w.ore, units: Math.max(1, w.units), got: 0 })),
    mult,
    launchesLeft: C.offerLaunches,
    taken: false,
  });
  const quota = (): Contract => {
    const live = shipped.filter(alive);
    const ore = (live.length ? live : shipped).slice().sort((a, b) => valueOf(b) - valueOf(a))[0] ?? C.first.ore;
    const q = C.quota[0] + (C.quota[1] - C.quota[0]) * draw(9);
    return make([{ ore, units: Math.min(capUnits(ore), Math.round(L * F * q)) }], Math.max(C.quotaMinMult, round1(multBase([ore]) - C.quotaMultCut)));
  };
  // A station that ships a single ore gets the quota of Decision 40 (the last resort: never an empty board).
  void none;
  if (shipped.length <= 1) return quota();
  const lifeNeed = L * basis.interval;
  // The most a launch can carry of an ore: under maxShare, and what its rocks drill with one more rig level each.
  const step = cfg.haul.rig.levelGrowth;
  const most = (ore: string) => Math.min(C.maxShare * F, (basis.drillOf[ore] ?? 0) * step * basis.interval);
  const gMax = (ore: string) => Math.min(C.raise[1], most(ore) / Math.max(1e-9, share(ore) * F) - 1);
  // One-ore units at raise g over what it shipped, and over the routes as they are (the never-free
  // floor: Decision 56 sets it at least at 1 + raise[0] / 2; the full raise keeps a rich seam on a
  // busy rock from meeting it alone, and the ore's full piles are added: the loading takes them first),
  // never over the cap of Decision 64.
  const unitsAt = (ore: string, g: number) =>
    Math.min(capUnits(ore), Math.max(Math.round(L * (recent[ore] ?? 0) * (1 + g)), Math.ceil(L * Math.max(basis.steady[ore] ?? 0, basis.future?.[ore] ?? 0, fig(ore)) * (1 + Math.max(C.raise[0], g)) + (basis.pileOf[ore] ?? 0))));
  const minBonus = C.minBonusSeconds * basis.income;
  // Ores that matter (a tenth of a launch's value), whose routes still ship them and whose rocks last the contract.
  const worth = oreIds.filter((ore) => recent[ore] > 0 && launchValue > 0 && valueOf(ore) >= C.minValueShare * launchValue && alive(ore) && (!!basis.mainOf[ore] || (basis.lifeOf[ore] ?? 0) >= lifeNeed));
  const paysAt = (ore: string, g: number) => bonusOfUnits([{ ore, units: unitsAt(ore, g) }], multBase([ore]) + C.raiseMult * g) >= minBonus;
  let eligible = worth.filter((ore) => share(ore) * F * (1 + C.raise[0]) < most(ore) && paysAt(ore, gMax(ore)));
  // The lead's order when nothing passes (finishing round): a board is never left empty. First the
  // value share (and with it the bonus test) is relaxed to any ore the station ships (2 % of a launch
  // or more, its rocks lasting), with the drill limit kept.
  const lasting = shipped.filter((ore) => alive(ore) && (!!basis.mainOf[ore] || (basis.lifeOf[ore] ?? 0) >= lifeNeed));
  if (!eligible.length) eligible = lasting.filter((ore) => share(ore) * F * (1 + C.raise[0]) < most(ore));
  // Then the drill limit: the rig contract. The ores that still have room in a launch are asked for
  // anyway; the player meets it with more rig levels on that ore.
  let cap = gMax;
  if (!eligible.length) {
    cap = (ore: string) => Math.min(C.raise[1], C.maxShare / Math.max(1e-9, share(ore)) - 1);
    eligible = worth.filter((ore) => share(ore) * (1 + C.raise[0]) < C.maxShare && paysAt(ore, cap(ore)));
    if (!eligible.length) eligible = lasting.filter((ore) => share(ore) * (1 + C.raise[0]) < C.maxShare);
  }
  // Still nothing (the routes as they are fill a launch with one ore, e.g. another ore's drones are
  // on the rack): what it shipped decides. Never a quota on a station that ships several ores: a
  // quota is met by full holds alone.
  if (!eligible.length) {
    shipShareOnly = true;
    eligible = worth.filter((ore) => share(ore) * (1 + C.raise[0]) < C.maxShare);
  }
  if (!eligible.length && worth.length <= 1) {
    // One ore carries the value and fills the launch: the quota, never free. It asks for more of
    // the launch than that ore already has (the other ores' drones go to it), not for full holds
    // a full-hold autopilot meets anyway.
    const live = shipped.filter(alive);
    const main = worth[0] ?? (live.length ? live : shipped).slice().sort((a, b) => valueOf(b) - valueOf(a))[0];
    shipShareOnly = false;
    const sh = main ? Math.min(1, share(main)) : 1;
    if (!main || sh >= 0.95) return quota();
    const q = sh + (1 - sh) * (0.5 + 0.4 * draw(9));
    return make([{ ore: main, units: Math.min(capUnits(main), Math.round(L * F * q)) }], Math.max(C.quotaMinMult, round1(multBase([main]) - C.quotaMultCut)));
  }
  // Several ores matter but none has room by what it shipped either (a station bent for the draw):
  // the one with the most room, raised over what it shipped, whatever the cap.
  if (!eligible.length) {
    eligible = worth.slice().sort((a, b) => share(a) - share(b)).slice(0, 1);
    cap = () => C.raise[1];
  }
  const fresh = eligible.filter((o) => !avoidOres.includes(o));
  const pool0 = fresh.length ? fresh : eligible;
  // Decision 64: ores whose rocks last the contract first.
  const firmPool = pool0.filter(firm);
  const pool = firmPool.length ? firmPool : pool0;
  const drawn = pool[Math.min(pool.length - 1, Math.floor(draw(1) * pool.length))];

  const build = (ore1: string, two = false) => {
    // What ore 1 can gain with `o2` held at h2 of its share: the ores not wanted, and what o2 gives up.
    const roomWith = (o2: string, h2: number) => (shipped.filter((o) => o !== ore1 && o !== o2).reduce((a, o) => a + share(o), 0) + share(o2) * (1 - h2)) / Math.max(1e-9, share(ore1));
    // A second ore that holds (Decision 56, "raise one, hold the other"): another ore that matters, and
    // room for the raise. Drawn with `twoOreChance`, and always when the board already wants ore 1 and
    // nothing else could be drawn (so the offers want at least two ores).
    let ore2: string | null = null;
    let hold = 0;
    const others = worth.filter((o) => o !== ore1);
    if (others.length && (draw(3) < C.twoOreChance || !fresh.length || two)) {
      const o2 = others[Math.min(others.length - 1, Math.floor(draw(4) * others.length))];
      const h2 = C.holdShare[0] + (C.holdShare[1] - C.holdShare[0]) * draw(5);
      if (roomWith(o2, h2) * 0.8 >= C.raise[0]) {
        ore2 = o2;
        hold = h2;
      }
    }
    let hi = cap(ore1);
    if (ore2) hi = Math.min(hi, roomWith(ore2, hold) * 0.8);
    // A clamp below the smallest raise (little room) keeps a raise of at least a tenth of it: never at or under what it ships.
    hi = Math.max(hi, C.raise[0] / 10);
    const lo = Math.min(C.raise[0], hi);
    let g = lo + (hi - lo) * draw(2);
    // The held ore holds what it ships, or what its routes will ship when that is less (Decision 64).
    const held = (o2: string) => Math.max(1, Math.round(L * Math.min(recent[o2] ?? 0, fig(o2) > 0 ? fig(o2) : Infinity) * hold));
    const wantsAt = (x: number) => {
      const w = [{ ore: ore1, units: unitsAt(ore1, x) }];
      if (ore2) w.push({ ore: ore2, units: held(ore2) });
      return w;
    };
    const ores = ore2 ? [ore1, ore2] : [ore1];
    const mb = multBase(ores);
    // Condition 5: a bonus under `minBonusSeconds` of income is raised (within the cap) until it passes.
    for (let i = 0; i < 8 && g < hi && bonusOfUnits(wantsAt(g), mb + C.raiseMult * g) < minBonus; i++) g = Math.min(hi, g + (hi - lo) / 8 + 0.01);
    let wants = wantsAt(g);
    // Two ores leave at least a unit a launch for the rest (the held ore gives way, down to half its
    // smallest hold, else it is dropped); one ore stays under maxShare.
    if (wants.length > 1) {
      const fit = Math.floor(L * F) - 2 * L - wants[0].units;
      if (wants[1].units > fit) {
        if (fit >= L * (recent[wants[1].ore] ?? 0) * C.holdShare[0] * 0.5) wants[1].units = Math.max(1, fit);
        else {
          ore2 = null;
          wants = wantsAt(g);
        }
      }
    }
    const room = Math.floor(L * F * C.maxShare);
    if (wants[0].units > room) wants[0].units = Math.max(1, room);
    return { wants, mb, g };
  };

  // Decision 64, no dominated offers: two offers never want the same ores with raises closer than
  // `raiseGap`, and a larger order of the same ores never pays less.
  const keyOf = (ores: string[]) => [...ores].sort().join('+');
  const raiseOf = (ws: { ore: string; units: number }[]) => Math.max(0, ...ws.map((w) => (fig(w.ore) > 0 ? w.units / (L * fig(w.ore)) - 1 : C.raise[1])));
  const gap = C.raiseGap;
  const sameOres = (ws: { ore: string }[]) => rivals.filter((r) => keyOf(r.ores) === keyOf(ws.map((w) => w.ore)));
  const clashes = (ws: { ore: string; units: number }[]) => sameOres(ws).some((r) => Math.abs(r.raise - raiseOf(ws)) < gap - 1e-9);
  // Moves the raised ore's units to the nearest raise at least `gap` away from the rivals it clashes
  // with, within the cap and not under the never-green half of the smallest raise (Decision 56).
  const moved = (ws: { ore: string; units: number }[]) => {
    const f = fig(ws[0].ore);
    if (!(f > 0)) return null;
    const now = raiseOf(ws);
    const tries: number[] = [];
    for (let r = C.raise[0] / 2; r <= C.raise[1] + 1e-9; r += 0.01) tries.push(r);
    tries.sort((x, y) => Math.abs(x - now) - Math.abs(y - now));
    for (const r of tries) {
      const raw = L * f * (1 + r);
      const units = Math.min(capUnits(ws[0].ore), r >= now ? Math.ceil(raw) : Math.max(1, Math.floor(raw)));
      const next = ws.map((w, i) => (i === 0 ? { ...w, units } : { ...w }));
      if (raiseOf(next) >= C.raise[0] / 2 - 1e-9 && !clashes(next)) return { wants: next, g: Math.max(0, raiseOf(next)) };
    }
    return null;
  };
  const order = [drawn, ...pool.filter((o) => o !== drawn), ...eligible.filter((o) => !pool.includes(o))];
  let pick: { wants: { ore: string; units: number }[]; mb: number; g: number } | null = null;
  for (const ore1 of order) {
    const b = build(ore1);
    if (!clashes(b.wants)) {
      pick = b;
      break;
    }
    const m = moved(b.wants);
    if (m) {
      pick = { ...b, wants: m.wants, g: m.g };
      break;
    }
  }
  // Every one-ore shape clashes (no room left between the raises): the same ore with a second one held.
  if (!pick)
    for (const ore1 of order) {
      const b = build(ore1, true);
      if (b.wants.length > 1 && !clashes(b.wants)) {
        pick = b;
        break;
      }
    }
  // Every candidate clashes (one ore can be asked for and the raises between the offers are taken):
  // a warp-out's draw leaves the place empty (the next warp-out draws again, with a new raise);
  // `contractAt` keeps the drawn one as built.
  if (!pick && none) return null;
  pick ??= build(drawn);
  // A moved raise keeps the room of the launches: the held ore gives way, else it goes.
  if (pick.wants.length > 1) {
    const fit = Math.floor(L * F) - 2 * L - pick.wants[0].units;
    if (pick.wants[1].units > fit) pick.wants = fit >= 1 ? [pick.wants[0], { ...pick.wants[1], units: fit }] : [pick.wants[0]];
  }
  const roomAll = Math.floor(L * F * C.maxShare);
  if (pick.wants[0].units > roomAll) pick.wants[0] = { ...pick.wants[0], units: Math.max(1, roomAll) };
  let mult = round1(pick.mb + C.raiseMult * pick.g);
  const mine = raiseOf(pick.wants);
  for (const r of sameOres(pick.wants)) {
    // Whole tenths: the larger order gets at least the rival's rate, the smaller at most it, then the bonus decides.
    if (mine > r.raise && mult < r.mult) mult = r.mult;
    if (mine < r.raise && mult > r.mult) mult = r.mult;
    for (let i = 0; i < 6 && mine > r.raise && bonusOfUnits(pick.wants, mult) <= r.bonus; i++) mult = Math.round((mult + 0.1) * 10) / 10;
    for (let i = 0; i < 6 && mine < r.raise && mult > 1.1 && bonusOfUnits(pick.wants, mult) >= r.bonus; i++) mult = Math.round((mult - 0.1) * 10) / 10;
  }
  return make(pick.wants, mult);
}

/** Ores the contracts on the board (offers and the taken one) want. */
function boardOres(h: HaulState): string[] {
  return [...new Set((h.contracts.board ?? []).flatMap((c) => c.wants.map((w) => w.ore)))];
}

/** The untaken offers of a board as a draw compares itself with them (Decision 64). */
export function rivalsOf(cfg: HaulConfig, basis: ContractBasis, board: Contract[]): Rival[] {
  const L = cfg.haul.contracts.launches;
  const fig = (ore: string) => Math.max(0, (basis.lasting ? basis.lasting[ore] : basis.steady[ore]) ?? 0);
  return board
    .filter((c) => !c.taken)
    .map((c) => ({
      ores: c.wants.map((w) => w.ore),
      raise: Math.max(0, ...c.wants.map((w) => (fig(w.ore) > 0 ? w.units / (L * fig(w.ore)) - 1 : cfg.haul.contracts.raise[1]))),
      mult: c.mult,
      bonus: c.wants.reduce((a, w) => a + w.units * (basis.prices[w.ore] ?? 0), 0) * Math.max(0, c.mult + basis.contractAdd - 1) * basis.G,
    }));
}

/**
 * How many places of the board hold a contract (Decision 64): a station that ships a single ore has
 * one buyer, every other station `haul.contracts.board`.
 */
export function boardPlaces(cfg: HaulConfig, basis: ContractBasis): number {
  return shipsOneOre(cfg, basis) ? 1 : cfg.haul.contracts.board;
}

/**
 * What the board's empty places say (Decision 64): `'secondOre'` when the station ships a single ore
 * and the board therefore holds one contract ("MORE BUYERS WHEN A SECOND ORE SHIPS"), else null (an
 * empty place then waits for the next warp-out after a drop).
 */
export function boardNoteOf(cfg: HaulConfig, params: HaulParams, h: HaulState): 'secondOre' | null {
  const C = h.contracts;
  if (!C.unlocked || C.board.length >= cfg.haul.contracts.board) return null;
  return shipsOneOre(cfg, contractBasis(cfg, params, h)) ? 'secondOre' : null;
}

/**
 * Takes the next contract from the run's stream (and advances `next`), drawn on the station's basis
 * (`contractBasis`, with the run's params; without them, a run being built, the steady figure is
 * unknown and the draw is a quota of F).
 */
export function drawContract(cfg: HaulConfig, h: HaulState, F: number, params?: HaulParams): { contract: Contract | null; next: number } {
  const basis: ContractBasis = params
    ? contractBasis(cfg, params, h)
    : { galaxy: h.galaxy, F, recent: {}, steady: {}, prices: {}, G: 1, contractAdd: 0, ringOf: {}, lifeOf: {}, mainOf: {}, drillOf: {}, pileOf: {}, interval: Infinity, income: 0 };
  const contract = offerAt(cfg, h.seed, h.contracts.next, basis, (h.contracts.board ?? []).map((c) => c.buyer), boardOres(h), rivalsOf(cfg, basis, h.contracts.board ?? []));
  // A place left empty uses up its contract of the stream too, so the next warp-out draws anew.
  return { contract, next: h.contracts.next + 1 };
}

/**
 * A fresh board, as at the unlock: in galaxy 1 contract 0 taken and active, then offers; from galaxy
 * 2 on offers only (Decision 56). `sizedF` is set to F.
 */
export function openBoard(cfg: HaulConfig, h: HaulState, F: number, params?: HaulParams): HaulState['contracts'] {
  const board: Contract[] = [];
  let next = 0;
  const hh = { ...h, contracts: { ...h.contracts, next: 0 } };
  // Decision 64: a station that ships one ore has one buyer.
  const places = params ? boardPlaces(cfg, contractBasis(cfg, params, h)) : cfg.haul.contracts.board;
  for (let i = 0; i < places; i++) {
    hh.contracts.next = next;
    hh.contracts.board = board;
    const d = drawContract(cfg, hh, F, params);
    next = d.next;
    if (!d.contract) break;
    board.push(d.contract);
  }
  const taken = board.findIndex((c) => c.taken);
  return { ...h.contracts, unlocked: true, board, next, active: taken >= 0 ? taken : null, sizedF: F };
}

/** Fills the board's empty places (after a drop, Decision 56) with new offers; returns their indexes. */
export function topUpBoard(cfg: HaulConfig, h: HaulState, params: HaulParams): number[] {
  const C = h.contracts;
  const out: number[] = [];
  C.next = Math.max(C.next, ...C.board.map((c) => c.k + 1));
  // Decision 64: a station that ships one ore has one buyer (the other places say a second ore brings more).
  const places = boardPlaces(cfg, contractBasis(cfg, params, h));
  while (C.board.length < places) {
    const d = drawContract(cfg, h, params.F, params);
    C.next = d.next;
    if (!d.contract) break;
    // Contract 0 is the fixed first one; a topped-up board never takes it again.
    const c = d.contract.taken ? { ...d.contract, taken: false, launchesLeft: cfg.haul.contracts.offerLaunches } : d.contract;
    C.board.push(c);
    C.next = d.next;
    out.push(C.board.length - 1);
  }
  return out;
}

/**
 * Decision 56, "a freighter level does not meet a contract": when the freighter's capacity is not
 * the one the board was sized for, what every contract still needs is resized by F new / F old
 * (`got + round(left × factor)`), and so is `recent`; a `contractResized` event per contract.
 */
export function resizeOrders(h: HaulState, F: number, events?: HaulEvent[]): void {
  const C = h.contracts;
  const old = C.sizedF;
  if (!C.unlocked || !(F > 0) || !Number.isFinite(F)) return;
  if (!(old !== undefined && old > 0 && Number.isFinite(old))) {
    C.sizedF = F;
    return;
  }
  if (Math.abs(F - old) <= 1e-9 * Math.max(1, F)) return;
  const factor = F / old;
  C.sizedF = F;
  if (C.recent) C.recent = Object.fromEntries(Object.entries(C.recent).map(([o, x]) => [o, x * factor]));
  if (C.peak) C.peak = Object.fromEntries(Object.entries(C.peak).map(([o, x]) => [o, x * factor]));
  C.board.forEach((c, index) => {
    let before = 0;
    let left = 0;
    c.wants = c.wants.map((w) => {
      const got = c.taken ? (w.got ?? 0) : 0;
      const rest = Math.max(0, w.units - got);
      if (!(rest > 0)) return w;
      const now = Math.max(1, Math.round(rest * factor));
      before += rest;
      left += now;
      return { ...w, units: Math.max(1, Math.round(got + now)) };
    });
    if (before > 0) events?.push({ type: 'contractResized', contract: { ...c, wants: c.wants.map((w) => ({ ...w })) }, index, factor, before, left });
  });
}

/** True when the day shift would double the bonus of a contract met now (Decision 53). */
export function shiftDoubles(cfg: HaulConfig, hs: Pick<HaulStats, 'shift'> | undefined): boolean {
  const s = hs?.shift;
  return !!s && cfg.haul.shift.mult > 1 && s.met < cfg.haul.shift.contracts;
}

/**
 * What the board, the strip and the hints show for each contract on the board (Decisions 40, 56 and
 * 64); only the contracts (an empty place after a drop has no view). One pace for offers and the
 * taken contract, from `routeSchedule`: each launch carries what the routes as they are bring, each
 * rock counted only while it lives. An offer is shown as if taken now (got 0, `launches` launches);
 * for the taken one the next launch is counted from what is really in the hold (`hold_o + (F − hold)
 * × launch0_o / F`, loaded first and at most what is left), the launches after it from the schedule.
 * `aboard` is the cargo of a freighter loaded for the taken contract and not yet warped out; that
 * launch counts as one of the launches left. `perLaunch` is the schedule's average over the
 * contract's launches; on pace when expected covers what is left for every ore; `raise = left /
 * expected − 1` otherwise. `dries` names the first routed rock of the ore to stop feeding inside
 * those launches.
 */
export function contractViews(cfg: HaulConfig, params: HaulParams, h: HaulState, haulStats?: Pick<HaulStats, 'shift'>): ContractView[] {
  const L = cfg.haul.contracts.launches;
  const F = params.F;
  const f = h.freighter;
  const inFlight = f.phase === 'climb' && f.contract !== null;
  const shift = shiftDoubles(cfg, haulStats);
  let holdT = 0;
  for (const x of Object.values(h.hold)) holdT += x > 0 ? x : 0;
  const most = Math.max(L, ...h.contracts.board.map((c) => (c.taken ? c.launchesLeft : 0)));
  const sched = routeSchedule(cfg, params, h, most);
  const sumTo = (ore: string, from: number, to: number) => {
    const xs = sched.byLaunch[ore];
    let a = 0;
    if (xs) for (let k = Math.max(0, from); k < Math.min(to, xs.length); k++) a += xs[k];
    return a;
  };
  const horizonOf = (n: number) => sched.intervals.slice(0, Math.max(0, n)).reduce((a, x) => a + x, 0);
  return h.contracts.board.map((c, index) => {
    const active = h.contracts.active === index && c.taken;
    const carrying = active && inFlight && f.contract === c.k;
    const toward = carrying ? (f.toward ?? towardContract(f.cargo, { ...c })) : {};
    const launchesLeft = c.launchesLeft;
    const after = c.taken ? Math.max(0, c.launchesLeft - (carrying ? 1 : 0)) : L;
    const horizon = horizonOf(after);
    let room = F;
    const wants = c.wants.map((w) => {
      const got = c.taken ? (w.got ?? 0) : 0;
      const aboard = Math.min(toward[w.ore] ?? 0, Math.max(0, w.units - got));
      const rest = wantLeft({ units: w.units, got }, aboard);
      const left = rest > 0 ? Math.ceil(rest - EPS) : 0;
      const first = sched.byLaunch[w.ore]?.[0] ?? 0;
      const perLaunch = after > 0 ? sumTo(w.ore, 0, after) / after : first;
      let nextLaunch = first;
      if (c.taken) {
        const est = Math.max(0, h.hold[w.ore] ?? 0) + Math.max(0, F - holdT) * (F > 0 ? first / F : 0);
        nextLaunch = Math.max(0, Math.min(rest, est, room));
        room -= nextLaunch;
      }
      const expected = after > 0 ? nextLaunch + sumTo(w.ore, 1, after) : 0;
      const raise = !(left > 0) || expected >= rest - EPS ? 0 : expected > 0 ? rest / expected - 1 : Infinity;
      const d = sched.first[w.ore];
      const dries = d && d.seconds < horizon - EPS ? { slot: d.slot, seconds: d.seconds } : null;
      return { ore: w.ore, units: w.units, got, aboard, left, perLaunch, nextLaunch, expected, raise, dries };
    });
    let paceRatio = Infinity;
    let shortOre: string | null = null;
    let raise = 0;
    for (const w of wants) {
      if (!(w.left > 0)) continue;
      const x = w.expected / Math.max(EPS, w.units - w.got - w.aboard);
      if (x < paceRatio) {
        paceRatio = x;
        shortOre = w.ore;
      }
      if (w.raise > raise) raise = w.raise;
    }
    const onPace = raise === 0;
    return { index, contract: c, active, bonus: bonusOf(params, c), shift, launches: L, launchesLeft, wants, paceRatio, onPace, shortOre: onPace ? null : shortOre, raise };
  });
}

/**
 * Decision 64, "no green offers": at a warp-out, an untaken offer whose need has fallen to nothing
 * (the routes improved after it was drawn) is resized to the never-free floor: its first (raised)
 * ore asks `L × figure × (1 + raise[0])`, never over the cap `L × figure × (1 + raise[1])`. Returns
 * the indexes of the offers it resized (no event: an offer's figure simply changes on the board).
 */
export function refloorOffers(cfg: HaulConfig, params: HaulParams, h: HaulState): number[] {
  const C = cfg.haul.contracts;
  const L = C.launches;
  const out: number[] = [];
  for (const v of contractViews(cfg, params, h)) {
    if (v.contract.taken || !v.onPace) continue;
    const c = h.contracts.board[v.index];
    const w0 = v.wants.find((w) => w.perLaunch > 0);
    if (!c || !w0) continue;
    const units = Math.max(1, Math.ceil(L * w0.perLaunch * (1 + C.raise[0])));
    const want = c.wants.find((w) => w.ore === w0.ore);
    if (!want || !(units > want.units)) continue;
    want.units = Math.min(units, Math.max(want.units, Math.floor(L * w0.perLaunch * (1 + C.raise[1]))));
    out.push(v.index);
  }
  return out;
}
