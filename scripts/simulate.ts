/**
 * Balance check: plays a game with a simple greedy bot and reports pacing.
 *
 *   npm run simulate -- pizza-empire [--hours 12] [--taps 3]
 *
 * The bot taps the hero `--taps` times a second, restarts unmanaged
 * businesses, and always buys whatever pays back fastest. Look for big gaps
 * in the unlock timeline (players quit there) and check the first prestige
 * lands somewhere around hour 2 to 6 of play.
 */
import { GameConfigSchema } from '../src/config/schema';
import * as E from '../src/engine/economy';
import { formatDuration, formatMoney } from '../src/engine/format';
import { args, fail } from './lib/cli';

const games = require('./lib/games.js');
const { positional, flags } = args();
const id = positional[0] ?? fail('Usage: npm run simulate -- <game-id> [--hours 12] [--taps 3]');
const cfg = GameConfigSchema.parse(games.readGameJson(id));
const hours = Number(flags.hours ?? 12);
const tapsPerSec = Number(flags.taps ?? 3);
const NOW = 0; // boosts are not simulated, so the clock value doesn't matter

type Option = { label: string; cost: number; gain: number; apply: (s: typeof state) => typeof state };
let state = E.createInitialState(cfg, NOW);
const events: string[] = [];
const log = (t: number, msg: string) => events.push(`${formatDuration(t).padStart(8)}  ${msg}`);

/** Income/sec as if every owned business were automated, a fair yardstick for unmanaged ones too. */
function potential(s: typeof state) {
  let total = 0;
  for (const b of cfg.businesses) {
    if (s.businesses[b.id].owned > 0) total += E.revenuePerCycle(cfg, s, b.id, NOW) / E.cycleSeconds(cfg, s, b.id);
  }
  return total;
}

function options(s: typeof state): Option[] {
  const out: Option[] = [];
  const base = potential(s);
  for (const b of cfg.businesses) {
    const bs = s.businesses[b.id];
    const cost = E.costFor(b, bs.owned, 1);
    const next = E.buyBusiness(cfg, { ...s, cash: Infinity }, b.id, 1);
    out.push({ label: `buy ${b.name}`, cost, gain: potential(next) - base, apply: (x) => E.buyBusiness(cfg, x, b.id, 1) });
    if (!bs.managed && bs.owned > 0) {
      // A manager is worth the share of income lost to idle time between taps; weight it generously.
      const own = E.revenuePerCycle(cfg, s, b.id, NOW) / E.cycleSeconds(cfg, s, b.id);
      out.push({ label: `hire ${b.managerName ?? b.name + ' manager'}`, cost: b.managerCost, gain: own * 0.8, apply: (x) => E.hireManager(cfg, x, b.id) });
    }
  }
  for (const u of cfg.upgrades) {
    if (u.premium || s.upgrades.includes(u.id)) continue;
    const next = E.buyUpgrade(cfg, { ...s, cash: Infinity }, u.id);
    out.push({ label: `upgrade ${u.name}`, cost: u.cost, gain: potential(next) - base, apply: (x) => E.buyUpgrade(cfg, x, u.id) });
  }
  return out.filter((o) => o.gain > 0);
}

let firstPrestigeAt: number | null = null;
const unlocked = new Set<string>();
for (let t = 0; t < hours * 3600; t++) {
  for (const b of cfg.businesses) state = E.startBusiness(state, b.id);
  for (let i = 0; i < tapsPerSec; i++) state = E.tapHero(cfg, state, NOW).state;
  state = E.tick(cfg, state, 1, NOW);

  // Buy the best payback option, if affordable; otherwise wait for it.
  for (let guard = 0; guard < 200; guard++) {
    const best = options(state).sort((a, b) => a.cost / a.gain - b.cost / b.gain)[0];
    if (!best || best.cost > state.cash) break;
    state = best.apply(state);
    if (best.label.startsWith('hire') || best.label.startsWith('upgrade')) log(t, best.label);
  }
  for (const b of cfg.businesses) {
    if (state.businesses[b.id].owned > 0 && !unlocked.has(b.id)) {
      unlocked.add(b.id);
      log(t, `UNLOCK ${b.name}`);
    }
  }
  if (firstPrestigeAt === null && E.prestigePointsAvailable(cfg, state) > 0) {
    firstPrestigeAt = t;
    log(t, `first ${cfg.strings.prestigeName} available`);
  }
}

console.log(`\n${cfg.store.title} — ${hours}h simulated, ${tapsPerSec} taps/s\n`);
console.log(events.join('\n'));
console.log(`\nEnd: ${formatMoney(state.cash, cfg.strings.currencySymbol)} cash, ${formatMoney(E.incomePerSecond(cfg, state, NOW), cfg.strings.currencySymbol)}/s, ` +
  `${unlocked.size}/${cfg.businesses.length} businesses, ${E.prestigePointsAvailable(cfg, state)} ${cfg.strings.prestigeName} available`);
if (firstPrestigeAt === null) console.log(`⚠ No prestige within ${hours}h — consider lowering economy.prestige.threshold.`);
else if (firstPrestigeAt < 3600) console.log('⚠ First prestige in under an hour — consider raising economy.prestige.threshold.');
