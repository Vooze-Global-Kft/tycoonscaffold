/**
 * Balance check: plays a game with a simple greedy bot and reports pacing.
 *
 *   npm run simulate -- pizza-empire [--hours 12] [--taps 3] [--prestige] [--quiet] [--trace 300] [--json]
 *
 * The bot plays like an attentive player: it taps a few times a second,
 * restarts businesses that have no automation hire, rings the bell when goods
 * wait and workers are idle (sim mode), and always buys whatever pays back
 * fastest. With --prestige it also resets whenever that doubles its bonus.
 *
 * What to look for: no long gaps in the timeline (players quit there), the
 * first automation within a couple of minutes, a new venue well inside the
 * first hour (sim), the first prestige after a few hours, and in sim mode a
 * meaningful but not dominant share of spending on transport and sales.
 */
import { GameConfigSchema } from '../src/config/schema';
import * as E from '../src/engine/economy';
import { formatDuration, formatMoney } from '../src/engine/format';
import type { GameState } from '../src/engine/types';
import { args, fail } from './lib/cli';

const games = require('./lib/games.js');
const { positional, flags } = args();
const id = positional[0] ?? fail('Usage: npm run simulate -- <game-id> [--hours 12] [--taps 3] [--prestige] [--quiet]');
const cfg = GameConfigSchema.parse(games.readGameJson(id));
const hours = Number(flags.hours ?? 12);
const tapsPerSec = Number(flags.taps ?? 3);
const autoPrestige = flags.prestige === 'true';
const quiet = flags.quiet === 'true';
/** Print a status line every this many simulated seconds (0 = off). */
const trace = Number(flags.trace ?? 0);
const NOW = 0; // boosts and the rush skill are not simulated, so the clock value doesn't matter
const sim = E.isSim(cfg);
/** The bot ignores purchases that take longer than this (seconds) to pay for themselves. */
const PAYBACK_HORIZON = Number(flags.horizon ?? 1500);
const sym = cfg.strings.currencySymbol;
const money = (n: number) => formatMoney(n, sym);

type Kind = 'station' | 'transport' | 'sales' | 'hire' | 'upgrade' | 'venue';
interface Option {
  label: string;
  kind: Kind;
  cost: number;
  /** Extra steady income per second this purchase is worth. */
  gain: number;
  apply: (s: GameState) => GameState;
  /** Log this purchase in the timeline. */
  notable?: string;
}

let state = E.createInitialState(cfg, NOW);
const timeline: string[] = [];
/** Seconds at which each notable thing happened, for --json. */
const marks: Record<string, number> = {};
const log = (t: number, msg: string) => timeline.push(`${formatDuration(t).padStart(9)}  ${msg}`);
const spend: Record<Kind, number> = { station: 0, transport: 0, sales: 0, hire: 0, upgrade: 0, venue: 0 };
const bottleneckSeconds: Record<string, number> = { production: 0, transport: 0, sales: 0 };

/**
 * Income per second as if every owned business and the transport stage were
 * automated: a fair yardstick for comparing purchases before the hires exist.
 */
function potential(s: GameState): number {
  const mult = E.globalMultiplier(cfg, s, NOW);
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

/**
 * A smooth stand-in for min(): when two stages are level, raising either one
 * still shows a gain. With a hard min the bot would freeze at every balance
 * point, where no single purchase raises income on its own; a person just
 * buys both.
 */
function softMin(...xs: number[]): number {
  const k = 6;
  if (xs.some((x) => !(x > 0))) return 0;
  const lo = Math.min(...xs);
  let sum = 0;
  for (const x of xs) sum += Math.pow(x / lo, -k);
  return lo * Math.pow(sum, -1 / k);
}

function options(s: GameState): Option[] {
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
        cost: E.businessCost(cfg, s, venueId, b.id, 1),
        gain: gainOf(E.buyBusiness(cfg, rich, venueId, b.id, 1)),
        apply: (x) => E.buyBusiness(cfg, x, venueId, b.id, 1),
        notable: bs.owned === 0 ? `UNLOCK ${b.name}${tag}` : undefined,
      });
      if (!bs.managed && bs.owned > 0) {
        // An automation hire is worth the income lost to idle time between taps; weight it generously.
        const own = (E.stationValue(cfg, s, venueId, b.id) / E.cycleSeconds(cfg, s, venueId, b.id)) * E.globalMultiplier(cfg, s, NOW);
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
      const afterT = E.buyTransport(cfg, rich, venueId, 1);
      const moreWorkers = afterT.venues[venueId].chain!.workers.length > v.chain.workers.length;
      out.push({
        label: `${t.name}${tag}`,
        kind: 'transport',
        cost: E.transportCost(cfg, s, venueId, 1),
        gain: gainOf(afterT),
        apply: (x) => E.buyTransport(cfg, x, venueId, 1),
        notable: moreWorkers ? `+1 ${t.workerName.toLowerCase()} (${v.chain.workers.length + 1})${tag}` : undefined,
      });
      const afterS = E.buySales(cfg, rich, venueId, 1);
      const moreSeats = afterS.venues[venueId].chain!.seats.length > v.chain.seats.length;
      out.push({
        label: `${sa.name}${tag}`,
        kind: 'sales',
        cost: E.salesCost(cfg, s, venueId, 1),
        gain: gainOf(afterS),
        apply: (x) => E.buySales(cfg, x, venueId, 1),
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

let firstPrestigeAt: number | null = null;
let lastPrestigeAt = 0;
let prestiges = 0;
let lastNotableAt = 0;
let longestGap = { seconds: 0, at: 0 };

for (let t = 0; t < hours * 3600; t++) {
  // Play by hand: restart idle businesses, ring the bell, tap.
  const active = state.activeVenue;
  for (const b of cfg.businesses) state = E.startBusiness(state, active, b.id);
  const chain = state.venues[active].chain;
  if (chain && !chain.transportManaged && chain.buffer > 0) state = E.ringVenueBell(state, active);
  for (let i = 0; i < tapsPerSec; i++) state = E.tapHero(cfg, state, NOW).state;
  state = E.tick(cfg, state, 1, NOW);
  if (sim) bottleneckSeconds[E.venueRates(cfg, state, state.activeVenue).bottleneck] += 1;

  // Buy like a person: the best-payback purchase that is worth having; save for a big unlock
  // only when nothing else is worth buying. Later in a long run the bot shops less often
  // (purchases are rarer by then), which keeps multi-day simulations quick.
  const shopEvery = t < 1800 ? 1 : t < 4 * 3600 ? 4 : 12;
  for (let guard = 0; guard < 400 && t % shopEvery === 0; guard++) {
    const all = options(state);
    const income = Math.max(potential(state), 1e-9);
    const worth = all.filter((o) => o.kind !== 'venue' && o.cost / o.gain <= PAYBACK_HORIZON).sort((a, b) => a.cost / a.gain - b.cost / b.gain);
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
    spend[best.kind] += best.cost;
    if (best.notable) {
      log(t, best.notable);
      marks[best.notable] ??= t;
      if (t - lastNotableAt > longestGap.seconds) longestGap = { seconds: t - lastNotableAt, at: t };
      lastNotableAt = t;
    }
  }

  if (trace > 0 && t % trace === 0) {
    const v = state.activeVenue;
    const r = E.venueRates(cfg, state, v);
    const levels = cfg.businesses.map((b) => state.venues[v].businesses[b.id].owned).join('/');
    const c = state.venues[v].chain;
    log(t, `  · ${v}: cash ${money(state.cash)}, income ${money(E.incomePerSecond(cfg, state, NOW))}/s, levels ${levels}` +
      (c ? `, T${c.transportLevel} S${c.salesLevel}, P ${r.production.toPrecision(3)} T ${r.transport.toPrecision(3)} S ${r.sales.toPrecision(3)} → ${r.bottleneck}, backlog ${(c.buffer + c.served).toPrecision(3)}` : '') +
      `, spend st/tr/sa ${(['station', 'transport', 'sales'] as const).map((k) => ((spend[k] / (Object.values(spend).reduce((x, y) => x + y, 0) || 1)) * 100).toFixed(0)).join('/')}%`);
  }

  const available = E.prestigePointsAvailable(cfg, state);
  if (firstPrestigeAt === null && available > 0) {
    firstPrestigeAt = t;
    marks.firstPrestige = t;
    log(t, `first ${cfg.strings.prestigeName} available`);
  }
  if (autoPrestige && available >= Math.max(3, state.prestigePoints) && t - lastPrestigeAt > 900) {
    log(t, `PRESTIGE #${prestiges + 1}: +${available} ${cfg.strings.prestigeName} (run lasted ${formatDuration(t - lastPrestigeAt)})`);
    state = E.prestige(cfg, state, NOW);
    prestiges++;
    lastPrestigeAt = t;
    lastNotableAt = t;
  }
}

if (flags.json === 'true') {
  // Machine-readable result for calibration scripts.
  console.log(JSON.stringify({ marks, spend, income: E.incomePerSecond(cfg, state, NOW), lifetime: state.lifetimeEarnings, prestigeAvailable: E.prestigePointsAvailable(cfg, state) }));
  process.exit(0);
}

console.log(`\n${cfg.store.title} [${cfg.mode}] — ${hours}h simulated, ${tapsPerSec} taps/s${autoPrestige ? ', auto-prestige' : ''}\n`);
if (!quiet) console.log(timeline.join('\n'));

const totalSpend = Object.values(spend).reduce((a, b) => a + b, 0) || 1;
const pct = (n: number) => `${((n / totalSpend) * 100).toFixed(0)}%`;
console.log(`\nEnd: ${money(state.cash)} cash, ${money(E.incomePerSecond(cfg, state, NOW))}/s, lifetime ${money(state.lifetimeEarnings)}`);
console.log(`     ${state.prestigePoints} ${cfg.strings.prestigeName} held, ${E.prestigePointsAvailable(cfg, state)} available${autoPrestige ? `, ${prestiges} prestiges` : ''}`);
if (sim) {
  const open = E.venueIds(cfg).filter((v) => state.venues[v].unlocked);
  console.log(`     venues open: ${open.length}/${E.venueIds(cfg).length}`);
  for (const v of open) {
    const c = state.venues[v].chain!;
    const r = E.venueRates(cfg, state, v);
    const levels = cfg.businesses.map((b) => state.venues[v].businesses[b.id].owned).join('/');
    console.log(`       ${v.padEnd(10)} stations ${levels}  transport L${c.transportLevel} (${c.workers.length})  sales L${c.salesLevel} (${c.seats.length})  bottleneck: ${r.bottleneck}`);
  }
  console.log(`     spend: stations ${pct(spend.station)}, transport ${pct(spend.transport)}, sales ${pct(spend.sales)}, hires ${pct(spend.hire)}, upgrades ${pct(spend.upgrade)}, venues ${pct(spend.venue)}`);
  const bt = Object.values(bottleneckSeconds).reduce((a, b) => a + b, 0) || 1;
  console.log(`     time as bottleneck (venue on screen): production ${((bottleneckSeconds.production / bt) * 100).toFixed(0)}%, transport ${((bottleneckSeconds.transport / bt) * 100).toFixed(0)}%, sales ${((bottleneckSeconds.sales / bt) * 100).toFixed(0)}%`);
} else {
  const owned = cfg.businesses.filter((b) => state.venues[E.MAIN_VENUE].businesses[b.id].owned > 0).length;
  console.log(`     businesses: ${owned}/${cfg.businesses.length}`);
}
console.log(`     longest gap between notable events: ${formatDuration(longestGap.seconds)} (ending at ${formatDuration(longestGap.at)})`);

if (firstPrestigeAt === null) console.log(`⚠ No prestige within ${hours}h — consider lowering economy.prestige.threshold.`);
else if (firstPrestigeAt < 3600) console.log('⚠ First prestige in under an hour — consider raising economy.prestige.threshold.');
