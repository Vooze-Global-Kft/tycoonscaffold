/**
 * Loading, payout and contracts (section 2.6 with Decision 40: a contract is delivered over several
 * launches). Pure.
 */
import { hashString } from '../rng';
import { EPS, rngMix4, roll, sumUnits } from './params';
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
  const k = (sumUnits(cargo) >= params.F - EPS ? params.fullBonus : 1) * (1 + Math.max(0, keeper)) * params.G;
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

/** Exponential average of what the station ships (Decision 56), updated at each warp-out with its cargo. */
export function noteShipped(cfg: HaulConfig, h: HaulState, cargo: Record<string, number>): void {
  const C = h.contracts;
  const n = C.measured ?? 0;
  const a = n <= 0 ? 1 : Math.max(2 / (cfg.haul.contracts.recentLaunches + 1), 1 / (n + 1));
  const prev = C.recent ?? {};
  const next: Record<string, number> = {};
  for (const ore of new Set([...Object.keys(prev), ...Object.keys(cargo)])) {
    const x = (1 - a) * (prev[ore] ?? 0) + a * Math.max(0, cargo[ore] ?? 0);
    if (x > 1e-9 && Number.isFinite(x)) next[ore] = x;
  }
  C.recent = next;
  C.measured = n + 1;
}

/** What a draw reads of the station (Decision 56). Built by `contractBasis`; tests may build one by hand. */
export interface ContractBasis {
  galaxy: number;
  F: number;
  /** Units of each ore per launch the station really shipped lately (the steady figure until three launches are measured). */
  recent: Record<string, number>;
  /** The steady figure of the routes as they are (`steadyPerLaunch`). */
  steady: Record<string, number>;
  prices: Record<string, number>;
  /** Global multiplier and the met contract's added multiplier (Broker Seat, the condition), for the bonus test. */
  G: number;
  contractAdd: number;
  /** Farthest ring (0-based) with a present rock of each ore on a claimed slot. */
  ringOf: Record<string, number>;
  /** Longest life left (seconds) among the present rocks of each ore. */
  lifeOf: Record<string, number>;
  /** Seconds per launch, about: max(climb + away + land, F / R). */
  interval: number;
  /** Credits per second of the station, about: the recent launch's value / interval. */
  income: number;
}

export function contractBasis(cfg: HaulConfig, params: HaulParams, h: HaulState): ContractBasis {
  const st = steadyPerLaunch(params, h);
  const ringOf: Record<string, number> = {};
  const lifeOf: Record<string, number> = {};
  h.slots.forEach((s, i) => {
    const sp = params.slots[i];
    if (!s?.claimed || s.respawnAt !== null || s.rockN < 0 || !sp) return;
    ringOf[s.ore] = Math.max(ringOf[s.ore] ?? -1, sp.ring);
    lifeOf[s.ore] = Math.max(lifeOf[s.ore] ?? 0, s.life);
  });
  const measured = (h.contracts.measured ?? 0) >= 3 && h.contracts.recent;
  const recent = measured ? { ...h.contracts.recent } : { ...st.perLaunch };
  const cycle = params.climb + params.away + params.land;
  const interval = st.rate > 0 ? Math.max(cycle, params.F / st.rate) : Infinity;
  let value = 0;
  for (const [ore, n] of Object.entries(recent)) value += n * (params.prices[ore] ?? 0);
  const income = Number.isFinite(interval) && interval > 0 ? (value * params.fullBonus * params.G) / interval : 0;
  return { galaxy: h.galaxy, F: params.F, recent, steady: st.perLaunch, prices: params.prices, G: params.G, contractAdd: params.contractAdd, ringOf, lifeOf, interval, income };
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
export function contractAt(cfg: HaulConfig, seed: number, k: number, basis: ContractBasis, avoid: string[] = [], avoidOres: string[] = []): Contract {
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
  const share = (ore: string) => (recent[ore] ?? 0) / F;
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
    const ore = shipped.slice().sort((a, b) => valueOf(b) - valueOf(a))[0] ?? C.first.ore;
    const q = C.quota[0] + (C.quota[1] - C.quota[0]) * draw(9);
    return make([{ ore, units: Math.round(L * F * q) }], Math.max(C.quotaMinMult, round1(multBase([ore]) - C.quotaMultCut)));
  };
  if (shipped.length <= 1) return quota();
  const lifeNeed = L * basis.interval;
  const gMax = (ore: string) => Math.min(C.raise[1], (C.maxShare * F) / Math.max(1e-9, recent[ore] ?? 0) - 1);
  // One-ore units at raise g (with the never-free floor).
  const unitsAt = (ore: string, g: number) => Math.max(Math.round(L * (recent[ore] ?? 0) * (1 + g)), Math.ceil(L * (basis.steady[ore] ?? 0) * (1 + C.raise[0] / 2)));
  const minBonus = C.minBonusSeconds * basis.income;
  const eligible = oreIds.filter((ore) => {
    if (!(recent[ore] > 0) || !(launchValue > 0)) return false;
    if (valueOf(ore) < C.minValueShare * launchValue) return false;
    if (share(ore) * (1 + C.raise[0]) >= C.maxShare) return false;
    if (!((basis.lifeOf[ore] ?? 0) >= lifeNeed)) return false;
    const g = gMax(ore);
    return bonusOfUnits([{ ore, units: unitsAt(ore, g) }], multBase([ore]) + C.raiseMult * g) >= minBonus;
  });
  if (!eligible.length) return quota();
  const fresh = eligible.filter((o) => !avoidOres.includes(o));
  const pool = fresh.length ? fresh : eligible;
  const ore1 = pool[Math.min(pool.length - 1, Math.floor(draw(1) * pool.length))];
  // A second ore that holds: three ores shipped, another eligible ore.
  let ore2: string | null = null;
  let hold = 0;
  if (shipped.length >= 3 && draw(3) < C.twoOreChance) {
    const others = eligible.filter((o) => o !== ore1);
    if (others.length) {
      const o2 = others[Math.min(others.length - 1, Math.floor(draw(4) * others.length))];
      const h2 = C.holdShare[0] + (C.holdShare[1] - C.holdShare[0]) * draw(5);
      // What ore 1 can gain: the share of the ores not wanted, and what ore 2 gives up.
      const rest = shipped.filter((o) => o !== ore1 && o !== o2).reduce((a, o) => a + share(o), 0);
      const room = (rest + share(o2) * (1 - h2)) / Math.max(1e-9, share(ore1));
      if (room * 0.8 >= C.raise[0]) {
        ore2 = o2;
        hold = h2;
      }
    }
  }
  let hi = gMax(ore1);
  if (ore2) {
    const rest = shipped.filter((o) => o !== ore1 && o !== ore2).reduce((a, o) => a + share(o), 0);
    hi = Math.min(hi, ((rest + share(ore2) * (1 - hold)) / Math.max(1e-9, share(ore1))) * 0.8);
  }
  const lo = Math.min(C.raise[0], hi);
  let g = lo + (hi - lo) * draw(2);
  const wantsAt = (x: number) => {
    const w = [{ ore: ore1, units: unitsAt(ore1, x) }];
    if (ore2) w.push({ ore: ore2, units: Math.max(1, Math.round(L * (recent[ore2] ?? 0) * hold)) });
    return w;
  };
  const ores = ore2 ? [ore1, ore2] : [ore1];
  const mb = multBase(ores);
  // Condition 5: a bonus under `minBonusSeconds` of income is raised (within the cap) until it passes.
  for (let i = 0; i < 8 && g < hi && bonusOfUnits(wantsAt(g), mb + C.raiseMult * g) < minBonus; i++) g = Math.min(hi, g + (hi - lo) / 8 + 0.01);
  return make(wantsAt(g), round1(mb + C.raiseMult * g));
}

/** Ores the contracts on the board (offers and the taken one) want. */
function boardOres(h: HaulState): string[] {
  return [...new Set((h.contracts.board ?? []).flatMap((c) => c.wants.map((w) => w.ore)))];
}

/**
 * Takes the next contract from the run's stream (and advances `next`), drawn on the station's basis
 * (`contractBasis`, with the run's params; without them, a run being built, the steady figure is
 * unknown and the draw is a quota of F).
 */
export function drawContract(cfg: HaulConfig, h: HaulState, F: number, params?: HaulParams): { contract: Contract; next: number } {
  const basis: ContractBasis = params
    ? contractBasis(cfg, params, h)
    : { galaxy: h.galaxy, F, recent: {}, steady: {}, prices: {}, G: 1, contractAdd: 0, ringOf: {}, lifeOf: {}, interval: Infinity, income: 0 };
  const contract = contractAt(cfg, h.seed, h.contracts.next, basis, (h.contracts.board ?? []).map((c) => c.buyer), boardOres(h));
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
  for (let i = 0; i < cfg.haul.contracts.board; i++) {
    hh.contracts.next = next;
    hh.contracts.board = board;
    const d = drawContract(cfg, hh, F, params);
    board.push(d.contract);
    next = d.next;
  }
  const taken = board.findIndex((c) => c.taken);
  return { ...h.contracts, unlocked: true, board, next, active: taken >= 0 ? taken : null, sizedF: F };
}

/** Fills the board's empty places (after a drop, Decision 56) with new offers; returns their indexes. */
export function topUpBoard(cfg: HaulConfig, h: HaulState, params: HaulParams): number[] {
  const C = h.contracts;
  const out: number[] = [];
  C.next = Math.max(C.next, ...C.board.map((c) => c.k + 1));
  while (C.board.length < cfg.haul.contracts.board) {
    const d = drawContract(cfg, h, params.F, params);
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
 * What the board, the strip and the hints show for each contract on the board (Decisions 40 and
 * 56); only the contracts (an empty place after a drop has no view). One pace for offers and the
 * taken contract: `perLaunch` is the steady figure of the routes as they are; an offer is shown as
 * if taken now (got 0, `launches` launches, every launch at the steady figure); for the taken one the
 * next launch is counted from what is really in the hold (`hold_o + (F − hold) × perLaunch_o / F`,
 * loaded first and at most what is left), the launches after it at the steady figure. `aboard` is the
 * cargo of a freighter loaded for the taken contract and not yet warped out; that launch counts as one
 * of the launches left. `expected = nextLaunch + (launches after it − 1) × perLaunch`; on pace when
 * expected covers what is left for every ore; `raise = left / expected − 1` otherwise.
 */
export function contractViews(cfg: HaulConfig, params: HaulParams, h: HaulState, haulStats?: Pick<HaulStats, 'shift'>): ContractView[] {
  const L = cfg.haul.contracts.launches;
  const st = steadyPerLaunch(params, h).perLaunch;
  const F = params.F;
  const f = h.freighter;
  const inFlight = f.phase === 'climb' && f.contract !== null;
  const shift = shiftDoubles(cfg, haulStats);
  let holdT = 0;
  for (const x of Object.values(h.hold)) holdT += x > 0 ? x : 0;
  return h.contracts.board.map((c, index) => {
    const active = h.contracts.active === index && c.taken;
    const carrying = active && inFlight && f.contract === c.k;
    const toward = carrying ? (f.toward ?? towardContract(f.cargo, { ...c })) : {};
    const launchesLeft = c.launchesLeft;
    const after = c.taken ? Math.max(0, c.launchesLeft - (carrying ? 1 : 0)) : L;
    let room = F;
    const wants = c.wants.map((w) => {
      const got = c.taken ? (w.got ?? 0) : 0;
      const aboard = Math.min(toward[w.ore] ?? 0, Math.max(0, w.units - got));
      const rest = wantLeft({ units: w.units, got }, aboard);
      const left = rest > 0 ? Math.ceil(rest - EPS) : 0;
      const perLaunch = st[w.ore] ?? 0;
      let nextLaunch = perLaunch;
      if (c.taken) {
        const est = Math.max(0, h.hold[w.ore] ?? 0) + Math.max(0, F - holdT) * (F > 0 ? perLaunch / F : 0);
        nextLaunch = Math.max(0, Math.min(rest, est, room));
        room -= nextLaunch;
      }
      const expected = after > 0 ? nextLaunch + (after - 1) * perLaunch : 0;
      const raise = !(left > 0) || expected >= rest - EPS ? 0 : expected > 0 ? rest / expected - 1 : Infinity;
      return { ore: w.ore, units: w.units, got, aboard, left, perLaunch, nextLaunch, expected, raise };
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
