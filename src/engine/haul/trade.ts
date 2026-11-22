/**
 * Loading, payout and contracts (section 2.6). Pure.
 */
import { hashString, rngWeighted } from '../rng';
import { EPS, ringWeights, rngMix4, roll, sumUnits } from './params';
import type { Contract, HaulConfig, HaulParams, HaulState } from './types';

/** True when `cargo` holds at least the wanted units of every ore of `contract`. */
export function contractMet(cargo: Record<string, number>, contract: Contract | null): boolean {
  if (!contract) return false;
  return contract.wants.every((w) => (cargo[w.ore] ?? 0) >= w.units - EPS);
}

/** The active contract of a run, or null. */
export function activeContract(h: HaulState): Contract | null {
  return h.contracts.active === null ? null : h.contracts.board[h.contracts.active] ?? null;
}

/**
 * Loading on launch: the freighter takes at most F units from the hold, first each wanted ore of
 * the contract up to its wanted units, then the rest of the hold by ore price, highest first (ties
 * in config order). Returns the cargo and what stays in the hold.
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
  if (contract) for (const w of contract.wants) take(w.ore, w.units);
  const order = cfg.haul.ores.map((o, i) => ({ id: o.id, i, p: params.prices[o.id] ?? 0 })).sort((a, b) => b.p - a.p || a.i - b.i);
  for (const o of order) take(o.id, Infinity);
  // Ores the config no longer lists (an old save) still ship, at price 0.
  for (const ore of Object.keys(left)) take(ore, Infinity);
  for (const ore of Object.keys(left)) if (!(left[ore] > EPS)) delete left[ore];
  return { cargo, hold: left };
}

/**
 * Payout at the warp-out (section 2.6):
 * `[Σ w_o p_o (met ? M' : 1) + Σ x_o p_o (met ? 1 + fee : 1)] × (full ? fullBonus : 1) × (1 + keeper) × G`,
 * with `w_o = min(cargo_o, wanted_o)`, `x_o` the rest and `M' = mult + contractAdd`. `forceMet` prices
 * the cargo as met whatever it holds (for `contractGain`).
 */
export function payoutFor(params: HaulParams, cargo: Record<string, number>, contract: Contract | null, keeper: number, forceMet = false): { payout: number; met: boolean } {
  const met = !!contract && (forceMet || contractMet(cargo, contract));
  const wanted: Record<string, number> = {};
  if (contract) for (const w of contract.wants) wanted[w.ore] = (wanted[w.ore] ?? 0) + w.units;
  const M = contract ? contract.mult + params.contractAdd : 1;
  let sum = 0;
  for (const [ore, n] of Object.entries(cargo)) {
    if (!(n > 0)) continue;
    const p = params.prices[ore] ?? 0;
    const w = Math.min(n, wanted[ore] ?? 0);
    const x = n - w;
    sum += met ? w * p * M + x * p * (1 + params.fee) : n * p;
  }
  const full = sumUnits(cargo) >= params.F - EPS ? params.fullBonus : 1;
  const payout = sum * full * (1 + Math.max(0, keeper)) * params.G;
  return { payout: Number.isFinite(payout) ? Math.max(0, payout) : Number.MAX_VALUE, met };
}

/**
 * What a board contract adds to the next launch if met ("+₵420 if met", errata 26):
 * payout(cargo′, met) − payout(cargo′, unmet), where cargo′ is the loading rule applied to the
 * current hold plus the contract's missing units (the total held at F). The full bonus and `keeper`
 * are the same in both terms. 0 for an index that is not on the board.
 */
export function contractGain(cfg: HaulConfig, params: HaulParams, h: HaulState, index: number): number {
  const c = h.contracts.board[index];
  if (!c) return 0;
  const hold: Record<string, number> = { ...h.hold };
  let room = Math.max(0, params.F - sumUnits(hold));
  for (const w of c.wants) {
    const add = Math.min(room, Math.max(0, w.units - (hold[w.ore] ?? 0)));
    if (add > 0) {
      hold[w.ore] = (hold[w.ore] ?? 0) + add;
      room -= add;
    }
  }
  const { cargo } = loadCargo(cfg, params, hold, c);
  return payoutFor(params, cargo, c, h.keeper, true).payout - payoutFor(params, cargo, null, h.keeper).payout;
}

/** Units still missing from the hold for each ore of a board contract ("12 Ice to go"). */
export function contractMissing(h: HaulState, index: number): { ore: string; units: number }[] {
  const c = h.contracts.board[index];
  if (!c) return [];
  return c.wants.map((w) => ({ ore: w.ore, units: Math.max(0, Math.ceil(w.units - (h.hold[w.ore] ?? 0) - EPS)) }));
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
 * Contract `k` of a run's stream (section 2.6, errata 27). Contract 0 is fixed: the first buyer,
 * min(units, F) of the first ore, its multiplier. Later ones: the buyer from
 * `rngMix4(seed, hashString('buyer'), k, 0)`, the rest from `rngMix4(seed, hashString('contract'), k, n)`
 * with n = 1 ring of ore 1, 2 ore 1, 3 one or two, 4 ring of ore 2, 5 ore 2, 6 units, 7 multiplier.
 * Ores come from rings with a rock (weighted by ring number) and their weights after the condition,
 * so every contract can be met by routing. A two-ore contract has two different ores: the second
 * comes from another ring with a rock that offers an ore other than the first (else from the first
 * ring), and it is a one-ore contract only when no such ring offers one. Units total
 * `round(F × U(units))`, split evenly (at least 1 each); the multiplier is `mult[farthest ring] ±
 * jitter`, rounded to 0.1.
 */
export function contractAt(cfg: HaulConfig, seed: number, k: number, rings: number[], F: number, trait: string | null): Contract {
  const C = cfg.haul.contracts;
  if (k === 0) {
    const buyer = C.buyers[Math.min(C.first.buyer, C.buyers.length - 1)];
    return { k, buyer: buyer.id, wants: [{ ore: C.first.ore, units: Math.max(1, Math.min(C.first.units, Math.floor(F))) }], mult: C.first.mult, launchesLeft: C.lifetime };
  }
  const buyerRoll = roll(rngMix4(seed, hashString('buyer'), k, 0));
  const hc = hashString('contract');
  const draw = (n: number) => rngMix4(seed, hc, k, n);
  const buyer = C.buyers[Math.min(C.buyers.length - 1, Math.floor(buyerRoll * C.buyers.length))];
  const pool = rings.length ? rings : [0];
  const pickRing = (from: number[], n: number) => from[rngWeighted(draw(n), from.map((r) => r + 1)).value];
  const weightsWithout = (ring: number, skip: string | null) => {
    const w = ringWeights(cfg, ring, trait);
    return { ores: w.ores, weights: w.weights.map((x, i) => (w.ores[i] === skip ? 0 : x)) };
  };
  const pickOre = (ring: number, n: number, skip: string | null) => {
    const w = weightsWithout(ring, skip);
    return w.ores[rngWeighted(draw(n), w.weights).value] ?? w.ores[0];
  };
  const offersOther = (ring: number, skip: string) => weightsWithout(ring, skip).weights.some((x) => x > 0);
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
  const total = Math.max(picks.length, Math.round(F * (C.units[0] + (C.units[1] - C.units[0]) * roll(draw(6)))));
  const first = Math.max(1, Math.ceil(total / picks.length));
  const wants = picks.map((p, i) => ({ ore: p.ore, units: i === 0 ? first : Math.max(1, total - first) }));
  const far = Math.max(...picks.map((p) => p.ring));
  const base = C.mult[Math.min(far, C.mult.length - 1)];
  const jitter = (roll(draw(7)) * 2 - 1) * C.jitter;
  const mult = Math.max(1, Math.round((base + jitter) * 10) / 10);
  return { k, buyer: buyer.id, wants, mult, launchesLeft: C.lifetime };
}

/** Takes the next contract from the run's stream (and advances `next`). */
export function drawContract(cfg: HaulConfig, h: HaulState, F: number): { contract: Contract; next: number } {
  const contract = contractAt(cfg, h.seed, h.contracts.next, claimedRings(cfg, h), F, h.trait);
  return { contract, next: h.contracts.next + 1 };
}

/** A fresh board (contract 0 active, then the stream), as at the unlock or the start of a later galaxy. */
export function openBoard(cfg: HaulConfig, h: HaulState, F: number): HaulState['contracts'] {
  const board: Contract[] = [];
  let next = 0;
  const hh = { ...h, contracts: { ...h.contracts, next: 0 } };
  for (let i = 0; i < cfg.haul.contracts.board; i++) {
    hh.contracts.next = next;
    const d = drawContract(cfg, hh, F);
    board.push(d.contract);
    next = d.next;
  }
  return { unlocked: true, board, next, active: 0 };
}
