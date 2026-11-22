/**
 * What to buy next (section 8's shopping rule, Decision 57): the pure estimate the balance bot buys
 * by, shared with the hint engine so a person who follows the "the limit is ..." hints plays close to
 * the bot's first minutes. Every option is priced from now: the wait to afford it plus the time it
 * takes to pay back (`1 / (wait + price / gain)`), with the gain measured on the income line
 * (`haulIncome`) after the purchase and after the idle drones are placed.
 *
 * Pure and deterministic. Imported by hints.ts (phone bundles) and bot.ts (Node only): it must never
 * import bot.ts.
 */
import { buyCapacity, buyDrone, buyEngine, buyFreighter, claimSlot, assignDrone, moveDrone, upgradeRig } from './actions';
import { affordable, capacityCost, claimCost, droneCost, engineCost, freighterCost, haulParams, rigCost } from './params';
import { haulIncome } from './rates';
import type { HaulConfig, HaulGame, HaulState } from './types';

type Run = HaulGame & { haul: HaulState };

/**
 * The claimed slot (with a rock or about to get one) where one more drone adds the most value:
 * `[min(r, (n+1)c/trip) − min(r, n c/trip)] × price` (the bot's rule, section 8). Null when none.
 */
export function bestSlotForDrone(cfg: HaulConfig, g: HaulGame): number | null {
  if (!g.haul) return null;
  const p = haulParams(cfg, g as Run);
  let best: number | null = null;
  let bestV = -1;
  g.haul.slots.forEach((s, i) => {
    if (!s.claimed) return;
    const sp = p.slots[i];
    const r = sp.r > 0 ? sp.r : sp.rb0;
    const gain = (Math.min(r, ((s.haulers + 1) * sp.c) / sp.trip) - Math.min(r, (s.haulers * sp.c) / sp.trip)) * (sp.price || p.prices[cfg.haul.ores[0].id] || 0);
    if (gain > bestV + 1e-12) {
      bestV = gain;
      best = i;
    }
  });
  return best;
}

/** The route whose drone is worth least where it is (a drone loses the least there), never one of `except`. */
export function cheapestSource(cfg: HaulConfig, g: Run, except: number[]): number | null {
  const p = haulParams(cfg, g);
  let best: number | null = null;
  let bestLoss = Infinity;
  g.haul.slots.forEach((s, i) => {
    if (!s.claimed || s.haulers < 1 || except.includes(i)) return;
    const sp = p.slots[i];
    const r = sp.r > 0 ? sp.r : sp.rb0;
    const c = sp.c / sp.trip;
    const loss = (Math.min(r, s.haulers * c) - Math.min(r, (s.haulers - 1) * c)) * (sp.price || 0);
    // Keep at least one drone on a route unless it carries nothing.
    const penalty = s.haulers === 1 ? 1e6 : 0;
    if (loss + penalty < bestLoss) {
      bestLoss = loss + penalty;
      best = i;
    }
  });
  return best;
}

/** The game with its idle drones placed on the best slots (at most 8). */
export function withDrones(cfg: HaulConfig, x: Run): Run {
  let s = x;
  for (let j = 0; j < 8 && s.haul.idle > 0; j++) {
    const b = bestSlotForDrone(cfg, s);
    if (b === null) break;
    s = assignDrone(cfg, s, b) as Run;
  }
  return s;
}

/** One thing that can be bought now. `key`: 'drone' | 'capacity' | 'engine' | 'freighter' | 'rig <slot>' | 'claim <slot>'. */
export interface PurchaseOption {
  key: string;
  /** The sheet it is bought from: 'station', 'rig <slot>' or 'ghost <slot>' (the ghost-slot tap). */
  sheet: string;
  /** Price of this purchase alone. */
  cost: number;
  /** A claim is valued with one new drone on it, bought with it when the rack is empty. */
  extraDrone?: boolean;
  apply: (x: Run) => Run;
}

/** A priced option: alone, or with one level of a partner (freighter, drone or capacity) that it only pays with. */
export interface RankedPurchase extends PurchaseOption {
  /** Price of everything it needs: the option, its extra drone and its partner. */
  total: number;
  /** Credits a second it adds to the income line (with the partner, when there is one). */
  gain: number;
  /** 1 / (seconds to afford it + seconds to pay it back); the bot buys the highest. */
  score: number;
  bundle?: PurchaseOption;
}

/** Every single purchase on offer now (levels, claims of reachable slots), unpriced. */
export function purchaseOptions(cfg: HaulConfig, g: Run): PurchaseOption[] {
  const h = g.haul;
  const options: PurchaseOption[] = [
    { key: 'drone', sheet: 'station', cost: droneCost(cfg, g), apply: (x) => buyDrone(cfg, x) as Run },
    { key: 'capacity', sheet: 'station', cost: capacityCost(cfg, g), apply: (x) => buyCapacity(cfg, x) as Run },
    { key: 'engine', sheet: 'station', cost: engineCost(cfg, g), apply: (x) => buyEngine(cfg, x) as Run },
    { key: 'freighter', sheet: 'station', cost: freighterCost(cfg, g), apply: (x) => buyFreighter(cfg, x) as Run },
  ];
  h.slots.forEach((sl, i) => {
    if (sl.claimed) options.push({ key: `rig ${i}`, sheet: `rig ${i}`, cost: rigCost(cfg, g, i), apply: (x) => upgradeRig(cfg, x, i) as Run });
    else {
      const cc = claimCost(cfg, g, i);
      if (!(cc < Infinity)) return;
      // A claim is valued with one new drone on it (and priced with that drone when one can be bought).
      const dc = droneCost(cfg, g);
      const withDrone = dc < Infinity && h.idle === 0;
      // At the drone cap the new route gets a drone moved from the route that loses least.
      const src = !withDrone && h.idle === 0 ? cheapestSource(cfg, g, [i]) : null;
      options.push({
        key: `claim ${i}`,
        sheet: `ghost ${i}`,
        cost: cc,
        extraDrone: withDrone,
        apply: (x) => {
          let s = claimSlot(cfg, x, i) as Run;
          if (s === x) return x;
          if (withDrone) s = buyDrone(cfg, { ...s, cash: s.cash + dc } as Run) as Run;
          if (s.haul.idle > 0) s = assignDrone(cfg, s, i) as Run;
          else if (src !== null && s.haul.slots[src].haulers >= 2) s = moveDrone(cfg, s, src, i) as Run;
          return s;
        },
      });
    }
  });
  return options;
}

/**
 * Every option priced by the bot's rule, best first (ties keep the order of `purchaseOptions`, then
 * the pairs). Pairs: a drill, a route and the freighter only pay together when the other limit binds
 * (a rig level on a freighter-bound station adds nothing alone), so each option is also priced with
 * one level of the freighter, a drone or drone capacity. With `singles` the pairs are left out.
 */
export function rankPurchases(cfg: HaulConfig, g: Run, singles = false): RankedPurchase[] {
  const before = haulIncome(cfg, g);
  const options = purchaseOptions(cfg, g);
  const dc = droneCost(cfg, g);
  const candidates: (PurchaseOption & { total: number; bundle?: PurchaseOption })[] = options.map((o) => ({ ...o, total: o.cost + (o.extraDrone ? dc : 0) }));
  if (!singles) {
    const partners = options.filter((o) => o.key === 'freighter' || o.key === 'drone' || o.key === 'capacity');
    for (const o of options) {
      if (!(o.cost < Infinity)) continue;
      for (const q of partners) {
        if (q.key === o.key || !(q.cost < Infinity)) continue;
        candidates.push({ ...o, total: o.cost + q.cost + (o.extraDrone ? dc : 0), bundle: q, apply: (x) => o.apply(q.apply({ ...x, cash: x.cash + q.cost } as Run)) });
      }
    }
  }
  const out: RankedPurchase[] = [];
  for (const o of candidates) {
    if (!(o.cost < Infinity)) continue;
    const next = withDrones(cfg, o.apply({ ...g, cash: o.cost + 1e-6 } as Run));
    if (next.haul === g.haul) continue;
    const gain = haulIncome(cfg, next) - before;
    // Best payback counted from now: the wait to afford it plus the time it takes to pay back
    // (a good player does not sit on cash for an option minutes away when a cheaper one pays now).
    const wait = Math.max(0, o.total - g.cash) / Math.max(before, 1e-9);
    const score = gain > 0 ? 1 / (wait + o.total / gain) : 1e-12 / o.total;
    out.push({ ...o, gain, score });
  }
  // A stable sort: the first of equal scores wins, as in the bot's own loop.
  return out.map((o, i) => ({ o, i })).sort((a, b) => b.o.score - a.o.score || a.i - b.i).map((x) => x.o);
}

/** The bot's pick now (it may not be affordable yet: the bot then waits for it), or null. */
export function bestPurchase(cfg: HaulConfig, g: Run): RankedPurchase | null {
  return rankPurchases(cfg, g)[0] ?? null;
}

/**
 * Decision 57: the purchase to name on the radio. The best single purchase by the same rule that is
 * affordable now and raises the income line by at least `minGain` (a share, 0.15), never `skip`
 * (the purchase made last). Null when none.
 */
export function advisedPurchase(cfg: HaulConfig, g: Run, minGain = 0.15, skip: string | null = null): RankedPurchase | null {
  const before = haulIncome(cfg, g);
  if (!(before > 0)) return null;
  for (const o of rankPurchases(cfg, g, true)) {
    if (o.key === skip || !affordable(g.cash, o.total)) continue;
    if (o.gain >= minGain * before) return o;
  }
  return null;
}
