/**
 * Income rates and offline progress in closed or bounded form (section 2.11). No per-second
 * simulation: `fastForward` walks each slot's real rock stream with a bounded loop.
 */
import { placeRock } from './create';
import { EPS, haulParams, holdTotal, ringWeights, starLevel, sumUnits, T } from './params';
import { commit, draftOf, draftParams, grantPod, warpOut, type Draft } from './tick';
import type { HaulConfig, HaulGame, HaulParams, HaulState, OfflineReport, SlotState } from './types';

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

/** An empty Shift Log. */
function emptyReport(noAutopilot = false): OfflineReport {
  return { seconds: 0, effective: 0, unitsByOre: {}, rocksDry: 0, pods: 0, inFlight: 0, credits: 0, noAutopilot, shipped: 0, launches: 0 };
}

/**
 * The freighter's phases over `secs` real seconds away (errata 36, second pass). A climbing
 * freighter warps out (paid once, as IN FLIGHT, an ordinary warp-out: its contract is met and
 * replaced, its launch counted) only if its climb ends within the gap; an away or landing one docks
 * only if those phases end within the gap; otherwise the phase keeps the seconds that are left.
 * Returns the real seconds left after docking (0 when it is still out).
 */
function freighterAway(cfg: HaulConfig, d: Draft, secs: number, report: OfflineReport): number {
  const h = d.h;
  let left = secs;
  if (h.freighter.phase === 'climb') {
    if (h.freighter.t <= left + EPS) {
      left = Math.max(0, left - Math.max(0, h.freighter.t));
      const before = d.earned;
      warpOut(cfg, d, draftParams(cfg, d));
      report.inFlight = d.earned - before;
    } else {
      h.freighter = { ...h.freighter, t: h.freighter.t - left };
      return 0;
    }
  }
  if (h.freighter.phase === 'away') {
    if (h.freighter.t <= left + EPS) {
      left = Math.max(0, left - Math.max(0, h.freighter.t));
      h.freighter = { ...h.freighter, phase: 'land', t: draftParams(cfg, d).land };
    } else {
      h.freighter = { ...h.freighter, t: h.freighter.t - left };
      return 0;
    }
  }
  if (h.freighter.phase === 'land') {
    if (h.freighter.t <= left + EPS) {
      left = Math.max(0, left - Math.max(0, h.freighter.t));
      h.freighter = { ...h.freighter, phase: 'docked', t: 0, cargo: {}, payout: 0, met: false, away: 0, contract: null };
    } else {
      h.freighter = { ...h.freighter, t: h.freighter.t - left };
      return 0;
    }
  }
  return left;
}

/**
 * fastForward (section 2.11 with errata 18 and 36): what `seconds` away did, without simulating
 * each second. Never more than play over the same time:
 * - T = min(seconds, maxHours × 3600) × efficiency effective seconds of station work.
 * - The freighter moves through its phases by the real seconds away (`freighterAway`): a climbing
 *   one is paid once if its climb ends in the gap; it ships offline only once docked, and only with
 *   the autopilot online. Shipping time = (real seconds left after docking) × efficiency.
 * - Without the autopilot, or while the freighter is out for the whole gap: the routes fill the hold
 *   toward F and the rigs fill their piles, each bounded by what T seconds allow; nothing ships.
 * - With it, per slot, a bounded loop over its real rock stream: a rock's wall time is
 *   units / min(rb of that rock, h_i'), where h_i' is the route's haul rate, or λ h_i when the
 *   freighter limit throttles it (shareFreighter); each gap is the respawn time; at most
 *   `rockLoopMax` rocks, the rest valued with the closed form. The routes together never move more
 *   than the freighter can ship plus the room left in the hold.
 * - Shipped = min(hold + moved, Q × shipping time), the hold's ore first; the rest stays in the hold
 *   (never above F). Credits = Σ shipped_o × p_o × fullBonus × G (NOT added to cash: the store
 *   grants them, doubled after an ad). `stats.launches += floor(shipped / F)`. No contract is met or
 *   counted down by the offline shipping; seams, flares and met-only modules do not count.
 * - End state: each slot on the rock it reached with its remaining life; pile at cap when the drill
 *   outruns the drones, else what is left; `clock` unchanged; warm-ups and respawns shortened by the
 *   time away; dried rocks counted in the stats, with their Scrap Pods.
 */
export function fastForward(cfg: HaulConfig, g: HaulGame, seconds: number, efficiency: number): { game: HaulGame; report: OfflineReport } {
  const report = emptyReport();
  if (!g.haul) return { game: g, report };
  const secs = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, cfg.economy.offline.maxHours * 3600));
  const eff = Math.max(0, Math.min(Number.isFinite(efficiency) ? efficiency : 0, 1));
  const Teff = secs * eff;
  report.seconds = secs;
  report.effective = Teff;
  const d = draftOf(g as Run);
  const h = d.h;
  const podsBefore = sumUnits(d.chests.owned);
  if (!(secs > 0)) return { game: commit(d), report };
  const afterDock = freighterAway(cfg, d, secs, report);
  const docked = h.freighter.phase === 'docked';
  const p = draftParams(cfg, d);
  // Warm-ups run on while away (by real seconds, never past the clock).
  const warm = (s: SlotState): SlotState => ({ ...s, routeFrom: s.routeFrom > h.clock ? Math.max(h.clock, s.routeFrom - secs) : s.routeFrom, full: false });
  if (!(Teff > 0)) {
    h.slots = h.slots.map((s) => (s.claimed ? warm(s) : s));
    return { game: commit(d), report };
  }
  if (!h.autopilot.online || !docked) {
    report.noAutopilot = !h.autopilot.online;
    fillTimed(cfg, d, p, Teff);
    h.slots = h.slots.map((s) => (s.claimed ? warm(s) : s));
    if (!h.autopilot.online) h.flags.offlineNoAutopilot = true;
    report.pods = sumUnits(d.chests.owned) - podsBefore;
    return { game: commit(d), report };
  }
  const rates = slotRates(cfg, p, h);
  const Q = freighterRate(p);
  const share = shareFreighter(rates, Q);
  const shipTime = afterDock * eff;
  const limit = Q * shipTime;
  const hold0 = holdTotal(h);
  // The routes move at most what the freighter can take plus the room left in the hold.
  const budget = Math.max(0, limit + Math.max(0, p.F - hold0));
  const sumX = share.x.reduce((a, b) => a + b, 0);
  const moved: Record<string, number> = {};
  const add = (ore: string, n: number) => {
    if (n > 0) moved[ore] = (moved[ore] ?? 0) + n;
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
    let room = k >= 0 && sumX > 0 ? (budget * share.x[k]) / sumX : 0;
    let t = Teff;
    const pileBefore = s.pile;
    let delivered = 0;
    const capOf = () => {
      const pp = haulParams(cfg, { ...d.g, haul: { ...h, slots: h.slots.map((x, j) => (j === i ? s : x)) } });
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
    // Drones on the route wait out the rest of their warm-up before they deliver.
    if (s.haulers > 0 && s.routeFrom > h.clock) t = Math.max(0, t - (s.routeFrom - h.clock));
    if (!(hEff > 0) || !(room > EPS)) {
      // No drones (or nothing can ship): the rig fills its pile to cap and stalls.
      if (s.respawnAt === null && Teff > 0) {
        const { rb, cap } = capOf();
        const drill = Math.max(0, Math.min(s.life * rb, cap - s.pile, rb * Teff));
        if (rb > 0 && drill > 0) s = { ...s, pile: s.pile + drill, life: Math.max(0, s.life - drill / rb) };
      }
    } else {
      let rocks = 0;
      while (t > EPS && s.respawnAt === null && room > EPS) {
        const { rb, cap } = capOf();
        const unitsLeft = s.life * rb + s.pile;
        const rate = Math.min(rb > 0 ? rb : Infinity, hEff);
        if (!(rate > 0) || !Number.isFinite(rate)) break;
        const wall = unitsLeft / rate;
        if (wall <= t && unitsLeft <= room) {
          delivered += unitsLeft;
          room -= unitsLeft;
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
            const n = Math.min(room, (k >= 0 ? share.x[k] : 0) * t);
            delivered += n;
            room -= n;
            add(s.ore, n);
            t = 0;
            break;
          }
        } else {
          const byRoom = rate * t > room;
          const take = Math.min(rate * t, room, unitsLeft);
          delivered += take;
          room -= take;
          add(s.ore, take);
          const remaining = unitsLeft - take;
          // Drilled ore never goes back into the rock: the pile drains at most by what was moved.
          // When the freighter is the limit the drones wait and the rig fills its pile.
          const target = rb > hEff || byRoom ? cap : 0;
          const pile = Math.min(remaining, Math.max(target, s.pile - take));
          s = { ...s, pile, life: rb > 0 ? Math.max(0, (remaining - pile) / rb) : 0 };
          t = 0;
        }
      }
    }
    s = warm(s);
    h.counters.drilled += delivered + s.pile - pileBefore;
    h.counters.hauled += delivered;
    d.stats.hauled += delivered;
    h.slots[i] = s;
  });
  // Ship: the hold's ore first, then what the routes moved, up to the freighter limit.
  const walked = sumUnits(moved);
  const shippedTotal = Math.min(hold0 + walked, limit);
  const fromHold = Math.min(hold0, shippedTotal);
  const fromMoved = shippedTotal - fromHold;
  const shipped: Record<string, number> = {};
  const hold: Record<string, number> = {};
  const split = (src: Record<string, number>, total: number, take: number) => {
    const f = total > 0 ? take / total : 0;
    for (const [ore, n] of Object.entries(src)) {
      const out = n * f;
      if (out > 0) shipped[ore] = (shipped[ore] ?? 0) + out;
      const keep = n - out;
      if (keep > EPS) hold[ore] = (hold[ore] ?? 0) + keep;
    }
  };
  split(h.hold, hold0, fromHold);
  split(moved, walked, fromMoved);
  // Conservation: what is shipped plus what stays equals hold + moved (sub-EPS rests count as shipped).
  const kept = sumUnits(hold);
  const shippedUnits = hold0 + walked - kept;
  h.hold = hold;
  h.counters.shipped += shippedUnits;
  const value = Object.entries(shipped).reduce((a, [ore, n]) => a + n * (p.prices[ore] ?? 0), 0);
  const credits = value * p.fullBonus * p.G;
  const loads = p.F > 0 ? Math.floor(shippedUnits / p.F + EPS) : 0;
  h.counters.launches += loads;
  d.stats.launches += loads;
  report.unitsByOre = shipped;
  report.shipped = shippedUnits;
  report.launches = loads;
  report.credits = Number.isFinite(credits) ? Math.max(0, credits) : Number.MAX_VALUE;
  report.pods = sumUnits(d.chests.owned) - podsBefore;
  return { game: commit(d), report };
}

/**
 * Nothing ships (no autopilot, or the freighter is out for the whole gap): over `T` effective
 * seconds each route moves at most `h_i × T` from its pile and rock into the hold (all routes
 * together at most the room left below F), and each rig drills at most `rb_i × T` onto its pile.
 */
function fillTimed(cfg: HaulConfig, d: Draft, p: HaulParams, T: number): void {
  const h = d.h;
  const n = h.slots.length;
  const drillable: number[] = new Array(n).fill(0);
  const want: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const s = h.slots[i];
    if (!s.claimed || s.respawnAt !== null || s.rockN < 0) continue;
    const sp = p.slots[i];
    drillable[i] = s.life > 0 && sp.rb > 0 ? Math.min(sp.rb * T, s.life * sp.rb) : 0;
    const tHaul = Math.max(0, T - Math.max(0, s.routeFrom - h.clock));
    want[i] = s.haulers > 0 ? Math.min(sp.h * tHaul, s.pile + drillable[i]) : 0;
  }
  const sumWant = want.reduce((a, b) => a + b, 0);
  const free = Math.max(0, p.F - holdTotal(h));
  const scale = sumWant > 0 ? Math.min(1, free / sumWant) : 0;
  for (let i = 0; i < n; i++) {
    const s = h.slots[i];
    if (!s.claimed || s.respawnAt !== null || s.rockN < 0) continue;
    const sp = p.slots[i];
    const take = want[i] * scale;
    let pile = s.pile;
    let life = s.life;
    const fromPile = Math.min(pile, take);
    const fromRock = take - fromPile;
    pile -= fromPile;
    if (sp.rb > 0) life = Math.max(0, life - fromRock / sp.rb);
    if (take > 0) {
      h.hold[s.ore] = (h.hold[s.ore] ?? 0) + take;
      h.counters.hauled += take;
      d.stats.hauled += take;
    }
    const cap = sp.cap / (sp.seam ? cfg.haul.seam.pileCap : 1);
    const refill = sp.rb > 0 ? Math.max(0, Math.min(cap - pile, drillable[i] - fromRock, life * sp.rb)) : 0;
    pile += refill;
    if (sp.rb > 0) life = Math.max(0, life - refill / sp.rb);
    if (life <= 1e-9) life = 0;
    h.counters.drilled += fromRock + refill;
    h.slots[i] = { ...s, pile, life };
  }
}

/**
 * Offline for a haul game (`engineMode.offline`): seconds since the last save (or the latest time
 * the game ran at, if later), capped at maxHours; efficiency = min(offline.efficiencyCap,
 * economy.offline.efficiency). Returns the advanced game (in-flight payout already in cash), the
 * credits to grant and the Shift Log report. The returned game is stamped with `lastSavedAt = now`
 * (and `stats.clockHigh ≥ now`), so calling it again on that game at the same moment pays nothing.
 */
export function haulOffline(cfg: HaulConfig, g: HaulGame, now: number): { seconds: number; earnings: number; report: OfflineReport; game: HaulGame } {
  const from = Math.max(g.lastSavedAt, g.stats.clockHigh ?? 0);
  const elapsed = (now - from) / 1000;
  if (!(elapsed > 0) || !g.haul) return { seconds: 0, earnings: 0, report: emptyReport(!g.haul?.autopilot.online), game: g };
  const seconds = Math.min(elapsed, cfg.economy.offline.maxHours * 3600);
  const eff = Math.min(cfg.haul.offline.efficiencyCap, cfg.economy.offline.efficiency);
  const { game, report } = fastForward(cfg, g, seconds, eff);
  const stamped: HaulGame = { ...game, lastSavedAt: Number.isFinite(now) ? Math.max(game.lastSavedAt, now) : game.lastSavedAt, stats: { ...game.stats, clockHigh: Math.max(game.stats.clockHigh ?? 0, now) } };
  return { seconds, earnings: report.credits, report, game: stamped };
}

/** Re-exported for the bot: Seam Sense level (seams 10 s more often, 5 s longer per level). */
export function seamSenseLevel(cfg: HaulConfig, g: HaulGame): number {
  return starLevel(cfg, g.starMap, 'seamSense');
}
