/**
 * Income rates and offline progress in closed or bounded form (section 2.11). No per-second
 * simulation: `fastForward` walks each slot's real rock stream with a bounded loop.
 */
import { placeRock } from './create';
import { EPS, haulParams, holdTotal, ringWeights, starLevel, sumUnits, T } from './params';
import { commit, draftOf, draftParams, grantPod, warpOut } from './tick';
import type { HaulConfig, HaulGame, HaulParams, HaulState, OfflineReport } from './types';

type Run = HaulGame & { haul: HaulState };

/** The steady-state picture of one slot: expected drill r̄, delivered d, uptime u, rate q and mean price. */
export interface SlotRate {
  slot: number;
  /** Expected base drill rate of the ring's stream on this rig (bonanza share included, no seam). */
  rbar: number;
  /** Haul rate without contract effects. */
  h: number;
  /** min(r̄, h). */
  d: number;
  /** Wall seconds per rock W and uptime W / (W + gap). */
  wall: number;
  uptime: number;
  /** Units per second over a rock cycle, before the freighter limit. */
  q: number;
  /** Weight-averaged ore price of the ring after the condition. */
  price: number;
  /** What limits this route now: the drill or the drones. */
  limit: 'drill' | 'haul';
}

/** Ring-stream means: mean life after the condition (before tiers and bonanza) and the average price. */
function ringMeans(cfg: HaulConfig, ring: number, trait: string | null, prices: Record<string, number>): { life: number; price: number } {
  const r = cfg.haul.rings[ring];
  const { ores, weights } = ringWeights(cfg, ring, trait);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const price = wsum > 0 ? ores.reduce((a, o, i) => a + (prices[o] ?? 0) * weights[i], 0) / wsum : 0;
  return { life: ((r.life[0] + r.life[1]) / 2) * T(cfg, trait, 'life'), price };
}

/** Per-slot steady rates (section 2.11). Unclaimed slots and slots without drones have q = 0. */
export function slotRates(cfg: HaulConfig, params: HaulParams, h: HaulState): SlotRate[] {
  const B = cfg.haul.bonanza;
  const c = params.bonanzaChance;
  const b = (c * B.life) / (c * B.life + 1 - c);
  const out: SlotRate[] = [];
  h.slots.forEach((s, i) => {
    if (!s.claimed) return;
    const sp = params.slots[i];
    const m = ringMeans(cfg, sp.ring, h.trait, params.prices);
    const rbar = sp.rb0 * (1 - b + b * B.drill);
    const d = Math.min(rbar, sp.hBase);
    const meanLife = m.life * sp.tierLife * (1 - c + c * B.life);
    const wall = d > 0 ? (meanLife * rbar) / d : 0;
    const uptime = wall > 0 ? wall / (wall + cfg.haul.respawnSeconds) : 0;
    out.push({ slot: i, rbar, h: sp.hBase, d, wall, uptime, q: d * uptime, price: m.price, limit: sp.hBase < rbar ? 'haul' : 'drill' });
  });
  return out;
}

/** Freighter limit Q = F / (climb + away + land), units per second. */
export function freighterRate(params: HaulParams): number {
  return params.F / (params.climb + params.away + params.land);
}

/**
 * The freighter limit shared out (section 2.11, refined): when Σ q_i exceeds Q, each route ships
 * `x_i = min(q_i, λ × h_i)` with λ chosen so that Σ x_i = Q ("water-filling"). This is what hold
 * sharing does in play: the hold refills in proportion to each route's haul rate, and a route
 * whose drones outrun its drill catches up from its pile while the freighter is away, so it loses
 * nothing. The specification's uniform scale min(1, Q / Σ q) undercounts such stations by up to
 * 13 % against the simulation (see the notes). Returns x_i per entry of `rates`, and λ (Infinity
 * when the freighter does not bind).
 */
export function shareFreighter(rates: SlotRate[], Q: number): { x: number[]; lambda: number } {
  const sumQ = rates.reduce((a, r) => a + r.q, 0);
  if (!(sumQ > Q)) return { x: rates.map((r) => r.q), lambda: Infinity };
  const order = rates.map((r, i) => ({ i, t: r.h > 0 ? r.q / r.h : Infinity })).sort((a, b) => a.t - b.t);
  const x = rates.map(() => 0);
  let left = Q;
  let hLeft = rates.reduce((a, r) => a + (r.q > 0 ? r.h : 0), 0);
  let lambda = Infinity;
  for (const { i, t } of order) {
    const r = rates[i];
    if (!(r.q > 0)) continue;
    const lam = hLeft > 0 ? left / hLeft : 0;
    if (t <= lam) {
      x[i] = r.q;
      left -= r.q;
      hLeft -= r.h;
    } else {
      lambda = lam;
      break;
    }
  }
  if (lambda !== Infinity) for (const { i } of order) if (x[i] === 0 && rates[i].q > 0) x[i] = lambda * rates[i].h;
  return { x, lambda };
}

/**
 * activeRate (section 2.11): Σ x_i p̄_i × fullBonus × G with x_i the routes' shares of the freighter
 * limit (shareFreighter; x_i = q_i when the freighter does not bind), ignoring the autopilot flag.
 * Used for every income-denominated reward, the Time Warp and the income readout. Contracts, seams,
 * flares and met-only modules do not count. The full-launch bonus counts, because a steady station
 * ships full holds (see the notes: the specification's formula leaves it out).
 */
export function activeRate(cfg: HaulConfig, params: HaulParams, h: HaulState): number {
  const rates = slotRates(cfg, params, h);
  const { x } = shareFreighter(rates, freighterRate(params));
  const v = rates.reduce((a, r, i) => a + x[i] * r.price, 0) * params.fullBonus * params.G;
  return Number.isFinite(v) ? Math.max(0, v) : Number.MAX_VALUE;
}

/** steadyRate: activeRate with the autopilot online, otherwise 0 (a full hold stops the station). Offline only. */
export function steadyRate(cfg: HaulConfig, params: HaulParams, h: HaulState): number {
  return h.autopilot.online ? activeRate(cfg, params, h) : 0;
}

/** activeRate of a game (convenience for the store and the screens). */
export function haulIncome(cfg: HaulConfig, g: HaulGame): number {
  return g.haul ? activeRate(cfg, haulParams(cfg, g as Run), g.haul) : 0;
}

/**
 * fastForward (section 2.11): what `seconds` away did, without simulating each second.
 * - T = min(seconds, maxHours × 3600) × efficiency effective seconds.
 * - A freighter that was climbing completes its warp-out first (its payout is `inFlight`, added to cash).
 * - Without the autopilot: the hold fills to F from the piles, piles fill to cap, credits 0.
 * - With it, per slot, a bounded loop over its real rock stream: a rock's wall time is
 *   units / min(rb of that rock, h_i'), where h_i' is the route's haul rate, or λ h_i when the
 *   freighter limit throttles it (shareFreighter; a refinement of the specification, see the
 *   notes); each gap is the respawn time;
 *   at most `rockLoopMax` rocks, the rest valued with the closed form.
 * - Credits = Σ units × p_o × min(1, Q × T / Σ units) × fullBonus × G (NOT added to cash: the store
 *   grants them, doubled after an ad).
 * - End state: each slot on the rock it reached with its remaining life; pile at cap when the drill
 *   outruns the drones, else 0; hold empty (shipped); freighter docked; `clock` unchanged, warm-ups
 *   finished; dried rocks counted in the stats, with their Scrap Pods.
 */
export function fastForward(cfg: HaulConfig, g: HaulGame, seconds: number, efficiency: number): { game: HaulGame; report: OfflineReport } {
  const report: OfflineReport = { seconds: 0, effective: 0, unitsByOre: {}, rocksDry: 0, pods: 0, inFlight: 0, credits: 0, noAutopilot: false };
  if (!g.haul) return { game: g, report };
  const secs = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, cfg.economy.offline.maxHours * 3600));
  const eff = Math.max(0, Math.min(Number.isFinite(efficiency) ? efficiency : 0, 1));
  const Teff = secs * eff;
  report.seconds = secs;
  report.effective = Teff;
  const d = draftOf(g as Run);
  const h = d.h;
  const podsBefore = sumUnits(d.chests.owned);
  // A climbing freighter warps out first; away or landing ones already paid.
  if (h.freighter.phase === 'climb') {
    const before = d.earned;
    warpOut(cfg, d, draftParams(cfg, d));
    report.inFlight = d.earned - before;
  }
  h.freighter = { ...h.freighter, phase: 'docked', t: 0, cargo: {}, payout: 0, met: false, away: 0, contract: null };
  const p = draftParams(cfg, d);
  if (!(Teff > 0)) {
    return { game: commit(d), report };
  }
  if (!h.autopilot.online) {
    report.noAutopilot = true;
    fillWithoutAutopilot(cfg, d, p);
    h.flags.offlineNoAutopilot = true;
    report.pods = sumUnits(d.chests.owned) - podsBefore;
    return { game: commit(d), report };
  }
  const rates = slotRates(cfg, p, h);
  const Q = p.F / (p.climb + p.away + p.land);
  const share = shareFreighter(rates, Q);
  const units: Record<string, number> = {};
  const add = (ore: string, n: number) => {
    if (n > 0) units[ore] = (units[ore] ?? 0) + n;
  };
  const loopMax = cfg.haul.offline.rockLoopMax;
  const gap = cfg.haul.respawnSeconds;
  const seamCap = cfg.haul.seam.pileCap;
  h.slots.forEach((s0, i) => {
    if (!s0.claimed) return;
    let s = s0;
    const k = rates.findIndex((r) => r.slot === i);
    const throttled = k >= 0 && share.lambda !== Infinity && share.x[k] < rates[k].q - 1e-12;
    const hEff = throttled ? share.lambda * p.slots[i].hBase : p.slots[i].hBase;
    let t = Teff;
    const pileBefore = s.pile;
    let delivered = 0;
    const capOf = () => {
      const pp = haulParams(cfg, { ...d.g, haul: { ...h, slots: h.slots.map((x, k) => (k === i ? s : x)) } });
      const sp = pp.slots[i];
      return { rb: sp.rb, cap: sp.cap / (sp.seam ? seamCap : 1) };
    };
    const dry = () => {
      report.rocksDry += 1;
      h.counters.depleted += 1;
      d.stats.depleted += 1;
      if (d.stats.depleted % cfg.haul.pods.depletedEvery === 0) grantPod(cfg, d, cfg.haul.pods.scrap, 'depleted');
    };
    if (s.rockN < 0 || s.respawnAt !== null) {
      const wait = Math.max(0, (s.respawnAt ?? h.clock) - h.clock);
      if (t < wait) {
        s = { ...s, respawnAt: h.clock + (wait - t) };
        t = 0;
      } else {
        t -= wait;
        s = placeRock(cfg, h, i, s, s.rockN + 1, d.g.starMap);
      }
    }
    if (!(hEff > 0)) {
      // No drones: the rig fills its pile to cap and stalls.
      if (s.respawnAt === null && t > 0) {
        const { rb, cap } = capOf();
        const drill = Math.max(0, Math.min(s.life * rb, cap - s.pile, rb * t));
        if (rb > 0 && drill > 0) s = { ...s, pile: s.pile + drill, life: Math.max(0, s.life - drill / rb) };
      }
    } else {
      let rocks = 0;
      while (t > EPS && s.respawnAt === null) {
        const { rb, cap } = capOf();
        const unitsLeft = s.life * rb + s.pile;
        const rate = Math.min(rb > 0 ? rb : Infinity, hEff);
        if (!(rate > 0) || !Number.isFinite(rate)) break;
        const wall = unitsLeft / rate;
        if (wall <= t) {
          delivered += unitsLeft;
          add(s.ore, unitsLeft);
          t -= wall;
          dry();
          if (t < gap) {
            s = { ...s, life: 0, pile: 0, full: false, respawnAt: h.clock + (gap - t) };
            t = 0;
            break;
          }
          t -= gap;
          s = placeRock(cfg, h, i, { ...s, respawnAt: null }, s.rockN + 1, d.g.starMap);
          rocks += 1;
          if (rocks >= loopMax) {
            // Bounded: the rest of T at the closed-form rate of this slot.
            const n = (k >= 0 ? share.x[k] : 0) * t;
            delivered += n;
            add(s.ore, n);
            t = 0;
            break;
          }
        } else {
          const moved = rate * t;
          delivered += moved;
          add(s.ore, moved);
          const remaining = unitsLeft - moved;
          // Drilled ore never goes back into the rock: the pile drains at most by what was moved.
          const target = rb > hEff ? cap : 0;
          const pile = Math.min(remaining, Math.max(target, s.pile - moved));
          s = { ...s, pile, life: rb > 0 ? Math.max(0, (remaining - pile) / rb) : 0 };
          t = 0;
        }
      }
    }
    s = { ...s, routeFrom: Math.min(s.routeFrom, h.clock), full: false };
    h.counters.drilled += delivered + s.pile - pileBefore;
    h.counters.hauled += delivered;
    d.stats.hauled += delivered;
    h.slots[i] = s;
  });
  // The hold ships too.
  for (const [ore, n] of Object.entries(h.hold)) add(ore, n);
  const shipped = sumUnits(units);
  h.counters.shipped += shipped;
  h.hold = {};
  const value = Object.entries(units).reduce((a, [ore, n]) => a + n * (p.prices[ore] ?? 0), 0);
  const limit = shipped > 0 ? Math.min(1, (Q * Teff) / shipped) : 1;
  const credits = value * limit * p.fullBonus * p.G;
  report.unitsByOre = units;
  report.credits = Number.isFinite(credits) ? Math.max(0, credits) : Number.MAX_VALUE;
  report.pods = sumUnits(d.chests.owned) - podsBefore;
  return { game: commit(d), report };
}

/** Without the autopilot: piles fill to cap, the hold fills to F from them, nothing ships. */
function fillWithoutAutopilot(cfg: HaulConfig, d: ReturnType<typeof draftOf>, p: HaulParams): void {
  const h = d.h;
  const avail: number[] = h.slots.map((s, i) => (s.claimed && s.respawnAt === null && s.haulers > 0 ? s.pile + s.life * p.slots[i].rb : 0));
  const demand = h.slots.map((s, i) => (avail[i] > 0 ? p.slots[i].h : 0));
  const sumD = demand.reduce((a, b) => a + b, 0);
  let free = Math.max(0, p.F - holdTotal(h));
  h.slots.forEach((s, i) => {
    if (!s.claimed || s.respawnAt !== null) return;
    const sp = p.slots[i];
    let pile = s.pile;
    let life = s.life;
    if (sumD > 0 && demand[i] > 0 && free > 0) {
      const take = Math.min(avail[i], (free * demand[i]) / sumD);
      const fromPile = Math.min(pile, take);
      pile -= fromPile;
      const fromRock = take - fromPile;
      if (sp.rb > 0) life = Math.max(0, life - fromRock / sp.rb);
      h.hold[s.ore] = (h.hold[s.ore] ?? 0) + take;
      h.counters.drilled += fromRock;
      h.counters.hauled += take;
      d.stats.hauled += take;
    }
    const cap = sp.cap / (sp.seam ? cfg.haul.seam.pileCap : 1);
    const refill = sp.rb > 0 ? Math.max(0, Math.min(cap - pile, life * sp.rb)) : 0;
    pile += refill;
    life = sp.rb > 0 ? Math.max(0, life - refill / sp.rb) : life;
    h.counters.drilled += refill;
    h.slots[i] = { ...s, pile, life, routeFrom: Math.min(s.routeFrom, h.clock) };
  });
  free = Math.max(0, p.F - holdTotal(h));
  void free;
}

/**
 * Offline for a haul game (`engineMode.offline`): seconds since the last save (or the latest time
 * the game ran at, if later), capped at maxHours; efficiency = min(offline.efficiencyCap,
 * economy.offline.efficiency). Returns the advanced game (in-flight payout already in cash), the
 * credits to grant and the Shift Log report.
 */
export function haulOffline(cfg: HaulConfig, g: HaulGame, now: number): { seconds: number; earnings: number; report: OfflineReport; game: HaulGame } {
  const elapsed = (now - Math.max(g.lastSavedAt, g.stats.clockHigh ?? 0)) / 1000;
  if (!(elapsed > 0) || !g.haul) return { seconds: 0, earnings: 0, report: { seconds: 0, effective: 0, unitsByOre: {}, rocksDry: 0, pods: 0, inFlight: 0, credits: 0, noAutopilot: !g.haul?.autopilot.online }, game: g };
  const seconds = Math.min(elapsed, cfg.economy.offline.maxHours * 3600);
  const eff = Math.min(cfg.haul.offline.efficiencyCap, cfg.economy.offline.efficiency);
  const { game, report } = fastForward(cfg, g, seconds, eff);
  return { seconds, earnings: report.credits, report, game };
}

/** Re-exported for the bot: Seam Sense level (seams 10 s more often, 5 s longer per level). */
export function seamSenseLevel(cfg: HaulConfig, g: HaulGame): number {
  return starLevel(cfg, g.starMap, 'seamSense');
}
