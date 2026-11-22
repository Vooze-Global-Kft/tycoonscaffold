/**
 * Loading, payout and contracts (section 2.6 with Decision 40: a contract is delivered over several
 * launches). Pure.
 */
import { hashString, rngWeighted } from '../rng';
import { EPS, ringWeights, rngMix4, roll, sumUnits } from './params';
import type { Contract, ContractView, HaulConfig, HaulParams, HaulState, HaulStats } from './types';

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
 * What the station can put into one launch of each of a set of ores (section 2.6, the contract
 * rule): the hold fills in proportion to what the routes bring, so one launch carries about
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
 * Contract `k` of a run's stream (section 2.6, errata 27, Decision 40). Contract 0 is fixed: the
 * first buyer, min(units, F) of the first ore, its multiplier, taken. Later ones are offers: the
 * buyer from `rngMix4(seed, hashString('buyer'), k, 0)`, the rest from
 * `rngMix4(seed, hashString('contract'), k, n)` with n = 1 ring of ore 1, 2 ore 1, 3 one or two,
 * 4 ring of ore 2, 5 ore 2, 6 λ, 7 multiplier, 8 the order of other ores, 9 a quota's share.
 * Ores come from rings with a rock (weighted by ring number) and their weights after the condition
 * (with a `station`, among the ores of the ring's present rocks), as before.
 *
 * Units over the contract's L = `launches` launches (Decision 40), with `now_o` and `routed_o` per
 * launch from `station.reach`: `u_o = round(L now_o + λ (L − 1)(routed_o − now_o))`, λ = U(reach),
 * held between two bounds: never free, `u_o ≥ ceil(L now_o (1 + margin))` (at least 1), and always
 * reachable, `u_o ≤ floor(now_o + (L − 1) routed_o)` (the first launch as the routes are, then
 * routed). When they cannot both hold, `routed` widens first (a route's last drone counts as
 * movable, then the share rises by 0.1 up to `maxShare`), then a two-ore contract falls back to
 * either ore alone, then another present ore is drawn; a station with a single ore gets a quota
 * contract (`round(L F U(quota))` units, multiplier lowered by `quotaMultCut`, at least
 * `quotaMinMult`). A multi-ore station where no ore can be routed for (every rock that could take a
 * drone is drill-bound) gets the one-ore contract that misses the reachable bound by the smallest
 * share, at the never-free bound: it is met by upgrading that ore's rig, never by doing nothing. Without a station (a ring list only, as in tests) `now` is 0 and `routed` F / ores.
 * The multiplier is `mult[farthest ring] ± jitter`, rounded to 0.1.
 */
export function contractAt(cfg: HaulConfig, seed: number, k: number, rings: number[], F: number, trait: string | null, station?: ContractStation, avoid: string[] = []): Contract {
  const C = cfg.haul.contracts;
  const L = C.launches;
  if (k === 0) {
    const buyer = C.buyers[Math.min(C.first.buyer, C.buyers.length - 1)];
    return { k, buyer: buyer.id, wants: [{ ore: C.first.ore, units: Math.max(1, Math.min(C.first.units, Math.floor(F))), got: 0 }], mult: C.first.mult, launchesLeft: L, taken: true };
  }
  const buyerRoll = roll(rngMix4(seed, hashString('buyer'), k, 0));
  const hc = hashString('contract');
  const draw = (n: number) => rngMix4(seed, hc, k, n);
  // A buyer already on the board is skipped for the next one in the list (one call per buyer on the board).
  const b0 = Math.min(C.buyers.length - 1, Math.floor(buyerRoll * C.buyers.length));
  let bi = b0;
  for (let i = 0; i < C.buyers.length && avoid.includes(C.buyers[bi].id); i++) bi = (b0 + i + 1) % C.buyers.length;
  const buyer = avoid.includes(C.buyers[bi].id) ? C.buyers[b0] : C.buyers[bi];
  const pool = rings.length ? rings : [0];
  const pickRing = (from: number[], n: number) => from[rngWeighted(draw(n), from.map((r) => r + 1)).value];
  const weightsWithout = (ring: number, skip: string | null) => {
    const w = ringWeights(cfg, ring, trait);
    return { ores: w.ores, weights: w.weights.map((x, i) => (w.ores[i] === skip ? 0 : x)) };
  };
  const weightsOf = (ring: number, skip: string | null) => {
    const w = weightsWithout(ring, skip);
    const here = station?.present[ring];
    if (!here) return w;
    const live = w.weights.map((x, i) => (here[w.ores[i]] ? x : 0));
    return live.some((x) => x > 0) ? { ores: w.ores, weights: live } : w;
  };
  const pickOre = (ring: number, n: number, skip: string | null) => {
    const w = weightsOf(ring, skip);
    return w.ores[rngWeighted(draw(n), w.weights).value] ?? w.ores[0];
  };
  const offersOther = (ring: number, skip: string) => weightsOf(ring, skip).weights.some((x) => x > 0);
  const ring1 = pickRing(pool, 1);
  const ore1 = pickOre(ring1, 2, null);
  const picks: { ore: string; ring: number }[] = [{ ore: ore1, ring: ring1 }];
  if (roll(draw(3)) < C.twoOreChance) {
    const others = pool.filter((r) => r !== ring1 && offersOther(r, ore1));
    const from = others.length ? others : offersOther(ring1, ore1) ? [ring1] : [];
    if (from.length) {
      const ring2 = pickRing(from, 4);
      const ore2 = pickOre(ring2, 5, ore1);
      if (ore2 !== ore1) picks.push({ ore: ore2, ring: ring2 });
    }
  }
  const lambda = C.reach[0] + (C.reach[1] - C.reach[0]) * roll(draw(6));
  const multFor = (ps: { ring: number }[]) => {
    const far = Math.max(...ps.map((p) => p.ring));
    const base = C.mult[Math.min(far, C.mult.length - 1)];
    const jitter = (roll(draw(7)) * 2 - 1) * C.jitter;
    return Math.max(1, Math.round((base + jitter) * 10) / 10);
  };
  const make = (ps: { ore: string; ring: number }[], units: number[], mult = multFor(ps)): Contract => ({
    k,
    buyer: buyer.id,
    wants: ps.map((p, i) => ({ ore: p.ore, units: units[i], got: 0 })),
    mult,
    launchesLeft: C.offerLaunches,
    taken: false,
  });
  if (!station) {
    const units = picks.map(() => Math.max(1, Math.round((lambda * (L - 1) * F) / picks.length)));
    return make(picks, units);
  }
  // Present ores (any ring), for the single-ore test and the fallback draw.
  const ringOfOre: Record<string, number> = {};
  for (const [ring, row] of Object.entries(station.present)) for (const ore of Object.keys(row)) if (row[ore] > 0) ringOfOre[ore] = Math.max(ringOfOre[ore] ?? -1, Number(ring));
  const presentOres = cfg.haul.ores.map((o) => o.id).filter((o) => ringOfOre[o] !== undefined);
  if (presentOres.length <= 1) {
    const ore = presentOres[0] ?? ore1;
    const q = C.quota[0] + (C.quota[1] - C.quota[0]) * roll(draw(9));
    const units = Math.max(1, Math.round(L * F * q));
    const ps = [{ ore, ring: ringOfOre[ore] ?? ring1 }];
    return make(ps, [units], Math.max(C.quotaMinMult, Math.round((multFor(ps) - C.quotaMultCut) * 10) / 10));
  }
  const widen: { share?: number; last?: boolean }[] = [{}, { last: true }];
  for (let sh = Math.round((C.fleetShare + 0.1) * 10) / 10; sh <= C.maxShare + 1e-9; sh = Math.round((sh + 0.1) * 10) / 10) widen.push({ share: sh, last: true });
  // The fallback: among one-ore attempts, the one that misses the reachable bound by the smallest
  // share, never asking for nearly whole holds (that would need a bigger freighter).
  let best: { ps: { ore: string; ring: number }[]; units: number[]; gap: number } | null = null;
  const attempt = (ps: { ore: string; ring: number }[]): number[] | null => {
    const ores = ps.map((p) => p.ore);
    for (const opts of widen) {
      const r = station.reach(ores, opts);
      const lo = r.now.map((n) => Math.max(1, Math.ceil(L * n * (1 + C.margin) - 1e-9)));
      const hi = r.now.map((n, i) => Math.floor(n + (L - 1) * r.routed[i] + 1e-9));
      if (lo.every((x, i) => x <= hi[i])) return r.now.map((n, i) => Math.min(hi[i], Math.max(lo[i], Math.round(L * n + lambda * (L - 1) * (r.routed[i] - n)))));
      if (ps.length === 1 && lo[0] <= 0.9 * L * F) {
        const gap = (lo[0] - hi[0]) / lo[0];
        if (!best || gap < best.gap) best = { ps, units: [lo[0]], gap };
      }
    }
    return null;
  };
  const tries: { ore: string; ring: number }[][] = [picks];
  if (picks.length > 1) tries.push([picks[0]], [picks[1]]);
  const tried = new Set(picks.map((p) => p.ore));
  const rest = presentOres.filter((o) => !tried.has(o));
  // Other present ores in an order drawn from the contract's own roll.
  const off = Math.floor(roll(draw(8)) * Math.max(1, rest.length));
  for (let i = 0; i < rest.length; i++) {
    const ore = rest[(i + off) % rest.length];
    tries.push([{ ore, ring: ringOfOre[ore] }]);
  }
  for (const ps of tries) {
    const units = attempt(ps);
    if (units) return make(ps, units);
  }
  const b = best as { ps: { ore: string; ring: number }[]; units: number[] } | null;
  if (b) return make(b.ps, b.units);
  return make([picks[0]], [Math.max(1, Math.round(lambda * (L - 1) * F))]);
}

/**
 * Takes the next contract from the run's stream (and advances `next`). With the run's params the
 * units follow what the station can deliver (`contractStation`); without them (a run being built)
 * they are a share of F.
 */
export function drawContract(cfg: HaulConfig, h: HaulState, F: number, params?: HaulParams): { contract: Contract; next: number } {
  const station = params ? contractStation(cfg, params, h) : undefined;
  const contract = contractAt(cfg, h.seed, h.contracts.next, claimedRings(cfg, h), F, h.trait, station, (h.contracts.board ?? []).map((c) => c.buyer));
  return { contract, next: h.contracts.next + 1 };
}

/** A fresh board (contract 0 taken and active, then offers from the stream), as at the unlock or the start of a later galaxy. */
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
  return { unlocked: true, board, next, active: board[0]?.taken ? 0 : null };
}

/** True when the day shift would double the bonus of a contract met now (Decision 53). */
export function shiftDoubles(cfg: HaulConfig, hs: Pick<HaulStats, 'shift'> | undefined): boolean {
  const s = hs?.shift;
  return !!s && cfg.haul.shift.mult > 1 && s.met < cfg.haul.shift.contracts;
}

/**
 * What the board, the strip and the hints show for each contract on the board (Decision 40). An
 * offer is shown as if it were taken now (got 0, `launches` launches). `aboard` is the cargo of a
 * freighter loaded for the taken contract and not yet warped out; the launch it is on counts as one
 * of the launches left, so the pace uses the launches after it.
 */
export function contractViews(cfg: HaulConfig, params: HaulParams, h: HaulState, haulStats?: Pick<HaulStats, 'shift'>): ContractView[] {
  const L = cfg.haul.contracts.launches;
  const station = contractStation(cfg, params, h);
  const f = h.freighter;
  const inFlight = f.phase === 'climb' && f.contract !== null;
  const shift = shiftDoubles(cfg, haulStats);
  return h.contracts.board.map((c, index) => {
    const active = h.contracts.active === index && c.taken;
    const r = station.reach(c.wants.map((w) => w.ore));
    const carrying = active && inFlight && f.contract === c.k;
    const toward = carrying ? (f.toward ?? towardContract(f.cargo, { ...c })) : {};
    const launchesLeft = c.launchesLeft;
    const after = c.taken ? Math.max(0, c.launchesLeft - (carrying ? 1 : 0)) : L;
    const wants = c.wants.map((w, i) => {
      const got = c.taken ? (w.got ?? 0) : 0;
      const aboard = Math.min(toward[w.ore] ?? 0, Math.max(0, w.units - got));
      const rest = wantLeft({ units: w.units, got }, aboard);
      return { ore: w.ore, units: w.units, got, aboard, left: rest > 0 ? Math.ceil(rest - EPS) : 0, perLaunch: r.now[i] ?? 0 };
    });
    let paceRatio = Infinity;
    let shortOre: string | null = null;
    for (const w of wants) {
      if (!(w.left > 0)) continue;
      const x = (w.perLaunch * after) / w.left;
      if (x < paceRatio) {
        paceRatio = x;
        shortOre = w.ore;
      }
    }
    const onPace = paceRatio >= 1;
    return { index, contract: c, active, bonus: bonusOf(params, c), shift, launches: L, launchesLeft, wants, paceRatio, onPace, shortOre: onPace ? null : shortOre };
  });
}
