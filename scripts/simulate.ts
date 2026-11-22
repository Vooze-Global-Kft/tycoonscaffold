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
import { makeBot, type Kind } from './content/bot';
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

let state = E.createInitialState(cfg, NOW);
const timeline: string[] = [];
/** Seconds at which each notable thing happened, for --json. */
const marks: Record<string, number> = {};
const log = (t: number, msg: string) => timeline.push(`${formatDuration(t).padStart(9)}  ${msg}`);
const spend: Record<Kind, number> = { station: 0, transport: 0, sales: 0, hire: 0, upgrade: 0, venue: 0 };
const bottleneckSeconds: Record<string, number> = { production: 0, transport: 0, sales: 0 };

const bot = makeBot(cfg, NOW);
const potential = bot.potential;

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
  if (t % shopEvery === 0) {
    const r = bot.shop(state, PAYBACK_HORIZON);
    state = r.state;
    for (const best of r.bought) {
      spend[best.kind] += best.cost;
      if (best.notable) {
        log(t, best.notable);
        marks[best.notable] ??= t;
        if (t - lastNotableAt > longestGap.seconds) longestGap = { seconds: t - lastNotableAt, at: t };
        lastNotableAt = t;
      }
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
  // Reset when it at least doubles the prestige income multiplier (the moment the reset screen's
  // "x2 income" preview first appears), and not within 15 minutes of the last one.
  const bonus = cfg.economy.prestige.bonusPerPoint;
  const doubles = (1 + bonus * (state.prestigePoints + available)) / (1 + bonus * state.prestigePoints) >= 2;
  if (autoPrestige && available > 0 && doubles && t - lastPrestigeAt > 900) {
    log(t, `PRESTIGE #${prestiges + 1}: +${available} ${cfg.strings.prestigeName}, income x${E.prestigeMultiplier(cfg, state).toFixed(2)} -> x${(1 + bonus * (state.prestigePoints + available)).toFixed(2)} (run lasted ${formatDuration(t - lastPrestigeAt)})`);
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
