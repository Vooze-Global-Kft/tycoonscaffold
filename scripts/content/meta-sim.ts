/**
 * The meta economy of a free player, with the real engine, day by day.
 *
 *   npx tsx scripts/content/meta-sim.ts pizza-empire [--days 90] [--seeds 3] [--json]
 *
 * The player: 5 sessions a day (08:00, 11:00, 14:00, 17:30, 21:00) of 7 minutes each, offline
 * earnings in between (not doubled), and in every session: plays by hand where nothing is
 * automated, taps 2 times a second, catches the bonus once a minute, uses the rush when ready,
 * shops with the greedy bot (scripts/content/bot.ts), claims every finished mission, every ready
 * free chest and the daily gift, watches the 3 rewarded-ad chests a day, takes the free daily
 * item and spends gems on named card copies in the daily shop (rarest first), opens every chest,
 * levels every card it can, and resets (prestige) at the end of a session when that at least
 * doubles its prestige multiplier. Never pays. Missions only progress through real play.
 * Seeds vary the chest and shop rolls. Prints checkpoints at days 1, 7, 14, 30, 60 and 90.
 */
import { GameConfigSchema, RARITIES, type Rarity } from '../../src/config/schema';
import * as E from '../../src/engine/economy';
import { formatMoney } from '../../src/engine/format';
import * as M from '../../src/engine/meta';
import type { GameState } from '../../src/engine/types';
import { args, fail } from '../lib/cli';
import { makeBot } from './bot';

const games = require('../lib/games.js');
const { positional, flags } = args();
const id = positional[0] ?? fail('Usage: npx tsx scripts/content/meta-sim.ts <game-id> [--days 90] [--seeds 3]');
const cfg = GameConfigSchema.parse(games.readGameJson(id));
const DAYS = Number(flags.days ?? 90);
const SEEDS = Number(flags.seeds ?? 3);
const SESSION_MIN = Number(flags.session ?? 7);
const HOUR = 3_600_000;
const SESSIONS = [8, 11, 14, 17.5, 21];
const CHECKPOINTS = [1, 7, 14, 30, 60, 90].filter((d) => d <= DAYS);

interface Snap {
  day: number;
  gemsIn: Record<string, number>;
  gemsOut: number;
  gemsHeld: number;
  chests: Record<string, number>;
  owned: number;
  levels: Record<Rarity, number>;
  cardMult: number;
  allOwnedDay: number | null;
  prestiges: number;
  points: number;
  venues: number;
  income: number;
  lifetime: number;
  finite: boolean;
}

function runSeed(seed: number): Snap[] {
  const bot = makeBot(cfg, 0);
  const day0 = new Date(2026, 0, 5, 0, 0, 0).getTime();
  let s: GameState = E.createInitialState(cfg, day0 + 8 * HOUR + seed);
  const gemsIn: Record<string, number> = {};
  let gemsOut = 0;
  const chests: Record<string, number> = {};
  let allOwnedDay: number | null = null;
  const snaps: Snap[] = [];
  const addGems = (src: string, n: number) => n > 0 && (gemsIn[src] = (gemsIn[src] ?? 0) + n);
  const withGems = (src: string, next: GameState) => { addGems(src, next.gems - s.gems); s = next; };

  const openAll = (now: number) => {
    for (const c of cfg.meta.chests) {
      while ((s.chests.owned[c.id] ?? 0) > 0) {
        const r = M.openChest(cfg, s, c.id, now)!;
        chests[c.id] = (chests[c.id] ?? 0) + 1;
        withGems('chests', r.state);
      }
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of cfg.meta.cards) {
        const n = M.levelUpCard(cfg, s, c.id);
        if (n !== s) { s = n; changed = true; }
      }
    }
  };
  const meta = (now: number) => {
    s = M.refreshMissions(cfg, M.refreshDailyShop(cfg, M.refreshDeals(cfg, s, now), now), now);
    for (let k = 0; k < 10; k++) {
      const done = M.missionViews(cfg, s).find((v) => v.done);
      if (!done) break;
      const r = M.claimMission(cfg, s, done.index, now)!;
      withGems('missions', r.state);
    }
    for (let beat = E.pendingStoryBeat(cfg, s); beat; beat = E.pendingStoryBeat(cfg, s)) withGems('story', E.markStorySeen(s, beat));
    for (let k = 0; k < 3; k++) {
      const n = M.claimFreeChest(cfg, s, now);
      if (n === s) break;
      s = n;
    }
    s = M.grantAdChest(cfg, s, now);
    const offers = M.dailyOffers(cfg, s).filter((o) => !o.bought);
    for (const o of offers.filter((x) => x.offer.gemCost === 0)) withGems('shop', M.buyDailyOffer(cfg, s, o.offer.id, now)!.state);
    for (const o of offers.filter((x) => x.offer.gemCost > 0 && x.offer.reward.type === 'card').sort((a, b) => b.offer.gemCost - a.offer.gemCost)) {
      const r = M.buyDailyOffer(cfg, s, o.offer.id, now);
      if (r) { gemsOut += o.offer.gemCost; s = r.state; }
    }
    openAll(now);
  };

  for (let day = 0; day < DAYS; day++) {
    for (const [si, h] of SESSIONS.entries()) {
      const start = day0 + day * 24 * HOUR + h * HOUR;
      // Offline earnings since the last session.
      if (day > 0 || si > 0) {
        s = E.clampClock(cfg, s, start);
        const off = E.computeOffline(cfg, s, start);
        if (off.earnings > 0) s = E.grantCash(s, off.earnings);
      }
      s = M.startFreeChestTimer(cfg, M.registerSession(s, start), start);
      if (si === 0) withGems('gift', E.claimDaily(cfg, s, start));
      meta(start);
      let nextBonus = 60;
      for (let t = 0; t < SESSION_MIN * 60; t++) {
        const now = start + t * 1000;
        const v = s.activeVenue;
        for (const b of cfg.businesses) s = E.startBusiness(s, v, b.id);
        const chain = s.venues[v].chain;
        if (chain && !chain.transportManaged && chain.buffer > 0) s = E.ringVenueBell(s, v);
        for (let k = 0; k < 2; k++) s = E.tapHero(cfg, s, now).state;
        if (t >= nextBonus) { s = E.collectBonus(cfg, s, now).state; nextBonus += 60; }
        if (E.isSim(cfg) && E.canStartRush(cfg, s, now)) s = E.startRush(cfg, s, now);
        s = E.tick(cfg, s, 1, now);
        if (t % 10 === 0) s = bot.shop(s, 1500, 60, 10).state;
        if (t % 30 === 0) meta(now);
        // Watch the newest venue (that is where the bot builds).
        const open = E.venueIds(cfg).filter((x) => s.venues[x].unlocked);
        if (open[open.length - 1] !== s.activeVenue) s = E.setActiveVenue(s, open[open.length - 1]);
      }
      const end = start + SESSION_MIN * 60 * 1000;
      meta(end);
      s = { ...s, stats: { ...s.stats, playSeconds: s.stats.playSeconds + SESSION_MIN * 60 }, lastSavedAt: end };
      // Reset when it at least doubles the prestige multiplier.
      const avail = E.prestigePointsAvailable(cfg, s);
      const b = cfg.economy.prestige.bonusPerPoint;
      if (avail > 0 && (1 + b * (s.prestigePoints + avail)) / (1 + b * s.prestigePoints) >= 2) {
        s = M.refreshDeals(cfg, E.prestige(cfg, s, end), end);
      }
    }
    if (allOwnedDay === null && cfg.meta.cards.every((c) => (s.cards[c.id]?.level ?? 0) > 0)) allOwnedDay = day + 1;
    if (CHECKPOINTS.includes(day + 1)) {
      const levels = {} as Record<Rarity, number>;
      for (const r of RARITIES) {
        const cs = cfg.meta.cards.filter((c) => c.rarity === r);
        levels[r] = cs.length ? cs.reduce((a, c) => a + (s.cards[c.id]?.level ?? 0), 0) / cs.length : 0;
      }
      const at = day0 + (day + 1) * 24 * HOUR;
      const income = E.incomePerSecond(cfg, s, at);
      const noCards = E.incomePerSecond(cfg, { ...s, cards: {} }, at);
      snaps.push({
        day: day + 1, gemsIn: { ...gemsIn }, gemsOut, gemsHeld: s.gems, chests: { ...chests },
        owned: cfg.meta.cards.filter((c) => (s.cards[c.id]?.level ?? 0) > 0).length, levels,
        cardMult: noCards > 0 ? income / noCards : 1, allOwnedDay, prestiges: s.prestigeCount, points: s.prestigePoints,
        venues: E.venueIds(cfg).filter((x) => s.venues[x].unlocked).length, income, lifetime: s.lifetimeEarnings,
        finite: [s.cash, s.lifetimeEarnings, income, s.gems].every(Number.isFinite),
      });
    }
  }
  return snaps;
}

const runs = Array.from({ length: SEEDS }, (_, i) => runSeed(1 + i * 7919));
const mean = (f: (x: Snap) => number, i: number) => runs.reduce((a, r) => a + f(r[i]), 0) / runs.length;
const f1 = (x: number) => x.toFixed(1);
if (flags.json === 'true') {
  console.log(JSON.stringify(runs));
  process.exit(0);
}
console.log(`${cfg.store.title}: free player, ${SESSIONS.length} sessions of ${SESSION_MIN} min a day, ${SEEDS} seeds\n`);
console.log('| Day | Gems in / day (gift, missions, chests, shop, story) | Gems out / day | Chests / day (' + cfg.meta.chests.map((c) => c.id).join(', ') + ') | Cards owned | Level C / R / E / L | Income x from cards | Resets (points) | Venues | Income/s |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
CHECKPOINTS.forEach((d, i) => {
  const src = ['gift', 'missions', 'chests', 'shop', 'story'];
  const parts = src.map((k) => f1(mean((x) => (x.gemsIn[k] ?? 0) / d, i)));
  const total = mean((x) => Object.values(x.gemsIn).reduce((a, b) => a + b, 0) / d, i);
  const ch = cfg.meta.chests.map((c) => mean((x) => (x.chests[c.id] ?? 0) / d, i).toFixed(2)).join(', ');
  const lv = RARITIES.map((r) => f1(mean((x) => x.levels[r], i))).join(' / ');
  console.log(`| ${d} | ${f1(total)} (${parts.join(', ')}) | ${f1(mean((x) => x.gemsOut / d, i))} | ${ch} | ${f1(mean((x) => x.owned, i))} / ${cfg.meta.cards.length} | ${lv} | x${mean((x) => x.cardMult, i).toFixed(2)} | ${f1(mean((x) => x.prestiges, i))} (${f1(mean((x) => x.points, i))}) | ${f1(mean((x) => x.venues, i))} | ${formatMoney(mean((x) => x.income, i), cfg.strings.currencySymbol)} |`);
});
const owned = runs.map((r) => r[r.length - 1].allOwnedDay);
console.log(`\nEvery card owned on day: ${owned.map((x) => x ?? 'never').join(', ')}`);
console.log(`All numbers finite: ${runs.every((r) => r.every((x) => x.finite))}`);
