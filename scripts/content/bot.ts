/**
 * The greedy shopping bot shared by scripts/simulate.ts and scripts/content/meta-sim.ts: values
 * every purchase by the steady income it adds and buys the best payback first.
 */
import type { GameConfig } from '../../src/config/schema';
import * as E from '../../src/engine/economy';
import type { GameState } from '../../src/engine/types';

export type Kind = 'station' | 'transport' | 'sales' | 'hire' | 'upgrade' | 'venue';
export interface Option {
  label: string;
  kind: Kind;
  cost: number;
  /** Extra steady income per second this purchase is worth. */
  gain: number;
  apply: (s: GameState) => GameState;
  /** Log this purchase in the timeline. */
  notable?: string;
}

/**
 * A smooth stand-in for min(): when two stages are level, raising either one
 * still shows a gain. With a hard min the bot would freeze at every balance
 * point, where no single purchase raises income on its own; a person just
 * buys both.
 */
export function softMin(...xs: number[]): number {
  const k = 6;
  if (xs.some((x) => !(x > 0))) return 0;
  const lo = Math.min(...xs);
  let sum = 0;
  for (const x of xs) sum += Math.pow(x / lo, -k);
  return lo * Math.pow(sum, -1 / k);
}

export function makeBot(cfg: GameConfig, now = 0) {
  const sim = E.isSim(cfg);
  /**
   * Income per second as if every owned business and the transport stage were
   * automated: a fair yardstick for comparing purchases before the hires exist.
   */
  function potential(s: GameState): number {
    const mult = E.globalMultiplier(cfg, s, now);
    let total = 0;
    for (const venueId of E.venueIds(cfg)) {
      const v = s.venues[venueId];
      if (!v.unlocked) continue;
      let production = 0;
      for (const b of cfg.businesses) {
        if (v.businesses[b.id].owned > 0) production += E.stationValue(cfg, s, venueId, b.id) / E.cycleSeconds(cfg, s, venueId, b.id);
      }
      if (!sim || !v.chain) {
        total += production * mult;
        continue;
      }
      const auto: GameState = { ...s, venues: { ...s.venues, [venueId]: { ...v, chain: { ...v.chain, transportManaged: true } } } };
      const r = E.venueRates(cfg, auto, venueId);
      total += softMin(production, r.transport, r.sales) * mult;
    }
    return total;
  }

  /** Every purchase on offer; `step` levels at a time for stations, transport and sales (1 or 10, like the buttons). */
  function options(s: GameState, step = 1): Option[] {
    const out: Option[] = [];
    const base = potential(s);
    const gainOf = (next: GameState) => potential(next) - base;
    const rich = { ...s, cash: Infinity };

    for (const venueId of E.venueIds(cfg)) {
      const v = s.venues[venueId];
      if (!v.unlocked) continue;
      const tag = sim ? ` @${venueId}` : '';
      for (const b of cfg.businesses) {
        const bs = v.businesses[b.id];
        out.push({
          label: `${b.name}${tag}`,
          kind: 'station',
          cost: E.businessCost(cfg, s, venueId, b.id, bs.owned === 0 ? 1 : step),
          gain: gainOf(E.buyBusiness(cfg, rich, venueId, b.id, bs.owned === 0 ? 1 : step)),
          apply: (x) => E.buyBusiness(cfg, x, venueId, b.id, bs.owned === 0 ? 1 : step),
          notable: bs.owned === 0 ? `UNLOCK ${b.name}${tag}` : undefined,
        });
        if (!bs.managed && bs.owned > 0) {
          // An automation hire is worth the income lost to idle time between taps; weight it generously.
          const own = (E.stationValue(cfg, s, venueId, b.id) / E.cycleSeconds(cfg, s, venueId, b.id)) * E.globalMultiplier(cfg, s, now);
          out.push({
            label: `hire ${b.managerName ?? b.name + ' manager'}${tag}`,
            kind: 'hire',
            cost: E.managerCost(cfg, venueId, b.id),
            gain: own * 0.8,
            apply: (x) => E.hireManager(cfg, x, venueId, b.id),
            notable: `hire ${b.managerName ?? b.name + ' manager'}${tag}`,
          });
        }
      }
      if (sim && v.chain) {
        const t = cfg.sim!.transport;
        const sa = cfg.sim!.sales;
        const afterT = E.buyTransport(cfg, rich, venueId, step);
        const moreWorkers = afterT.venues[venueId].chain!.workers.length > v.chain.workers.length;
        out.push({
          label: `${t.name}${tag}`,
          kind: 'transport',
          cost: E.transportCost(cfg, s, venueId, step),
          gain: gainOf(afterT),
          apply: (x) => E.buyTransport(cfg, x, venueId, step),
          notable: moreWorkers ? `+1 ${t.workerName.toLowerCase()} (${v.chain.workers.length + 1})${tag}` : undefined,
        });
        const afterS = E.buySales(cfg, rich, venueId, step);
        const moreSeats = afterS.venues[venueId].chain!.seats.length > v.chain.seats.length;
        out.push({
          label: `${sa.name}${tag}`,
          kind: 'sales',
          cost: E.salesCost(cfg, s, venueId, step),
          gain: gainOf(afterS),
          apply: (x) => E.buySales(cfg, x, venueId, step),
          notable: moreSeats ? `+1 ${sa.seatName.toLowerCase()} (${v.chain.seats.length + 1})${tag}` : undefined,
        });
        if (!v.chain.transportManaged) {
          out.push({
            label: `hire ${t.managerName}${tag}`,
            kind: 'hire',
            cost: E.transportManagerCost(cfg, venueId),
            // Without it the whole venue only earns while the player rings the bell.
            gain: Math.max(base * 0.5, E.venueRates(cfg, { ...s, venues: { ...s.venues, [venueId]: { ...v, chain: { ...v.chain, transportManaged: true } } } }, venueId).rate * 0.8),
            apply: (x) => E.hireTransportManager(cfg, x, venueId),
            notable: `hire ${t.managerName}${tag}`,
          });
        }
      }
    }
    for (const u of cfg.upgrades) {
      if (u.premium || s.upgrades.includes(u.id)) continue;
      out.push({ label: `upgrade ${u.name}`, kind: 'upgrade', cost: u.cost, gain: gainOf(E.buyUpgrade(cfg, rich, u.id)), apply: (x) => E.buyUpgrade(cfg, x, u.id), notable: `upgrade ${u.name}` });
    }
    const nextVenue = sim ? E.nextVenueToUnlock(cfg, s) : null;
    if (nextVenue) {
      const cost = E.venueUnlockCost(cfg, nextVenue);
      // A new venue starts empty, so its own gain is zero today; value it at the income it will soon match.
      out.push({ label: `open ${nextVenue}`, kind: 'venue', cost, gain: base * 0.6 + 1e-9, apply: (x) => E.unlockVenue(cfg, x, nextVenue), notable: `OPEN VENUE ${nextVenue}` });
    }
    return out.filter((o) => o.gain > 0 && Number.isFinite(o.cost));
  }

  /**
   * One shopping pass: the best-payback purchase worth having, repeatedly; saves for a big unlock
   * only when nothing else is worth buying. Returns the new state and what was bought.
   */
  function shop(state: GameState, horizon: number, maxBuys = 400, step = 1): { state: GameState; bought: Option[] } {
    const bought: Option[] = [];
    if (step > 1) {
      // Big amounts first (a player with a pile of offline cash taps x10), then single levels.
      const big = shop(state, horizon, maxBuys, -step);
      state = big.state;
      bought.push(...big.bought);
    }
    const n = Math.abs(step) > 1 && step < 0 ? -step : 1;
    for (let guard = 0; guard < maxBuys; guard++) {
      const all = options(state, n);
      const income = Math.max(potential(state), 1e-9);
      const worth = all.filter((o) => o.kind !== 'venue' && o.cost / o.gain <= horizon).sort((a, b) => a.cost / a.gain - b.cost / b.gain);
      let best: Option | undefined;
      if (worth.length > 0) {
        // Wait for the top pick if it is only a minute away; otherwise take the best one in reach.
        if (worth[0].cost > state.cash && worth[0].cost <= state.cash + income * 60) break;
        best = worth.find((o) => o.cost <= state.cash);
      }
      best ??= all.find((o) => o.kind === 'venue' && o.cost <= state.cash);
      if (!best) break;
      const before = state;
      state = best.apply(state);
      if (state === before) break;
      bought.push(best);
    }
    return { state, bought };
  }

  return { potential, options, shop };
}
