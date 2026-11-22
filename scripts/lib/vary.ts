/**
 * Per-game variation of a copied economy, used by new-game.ts and generate-game.ts.
 *
 * The stores reject families of apps that differ only in their skin (research/policy.md 4), and
 * `npm run validate` fails two games whose business tables are identical or a constant multiple
 * of each other. So a game made from a base gets the base's balanced numbers with a seeded
 * jitter: every cost and value moves by 2 to 6 % up or down, independently per row, then the
 * ordering rules are restored (each business, venue and venue scale larger than the one before).
 * Pacing stays close to the base (check it with `npm run simulate`); the numbers are its own.
 * Same seed, same numbers: the seed is the new game's id.
 */
import { economyTableClash } from './checks';

type Json = any; // raw game.json, before zod defaults

/** Google's published sample AdMob app ids: what a new game starts with until it has its own. */
export const TEST_ADMOB = { ios: 'ca-app-pub-3940256099942544~1458002511', android: 'ca-app-pub-3940256099942544~3347511713' };

/** mulberry32 seeded from a string. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Three significant digits: enough to keep the jitter, few enough to look hand-picked. */
const sig3 = (x: number) => (x === 0 ? 0 : Number(x.toPrecision(3)));

function jitterer(rand: () => number, min = 0.02, max = 0.06) {
  return (x: number) => {
    const pct = min + (max - min) * rand();
    return sig3(x * (1 + (rand() < 0.5 ? -pct : pct)));
  };
}

/** Makes each value of `key` in `rows` strictly larger than the one before (by at least 5 %). */
function keepIncreasing(rows: Json[], key: string, from = 0) {
  for (let i = Math.max(1, from); i < rows.length; i++) {
    if (rows[i][key] <= rows[i - 1][key]) rows[i][key] = sig3(rows[i - 1][key] * 1.05);
  }
}

/**
 * Returns a copy of `game` with its economy varied for `seed`. Touches only numbers that set
 * prices and income (never ids, counts, timings or level lists), so the game stays valid.
 */
export function varyEconomy(game: Json, seed: string): Json {
  for (let attempt = 0; attempt < 20; attempt++) {
    const out = structuredClone(game);
    const j = jitterer(seededRandom(`${seed}#${attempt}`));
    for (const b of out.businesses) {
      b.baseCost = j(b.baseCost);
      b.baseRevenue = j(b.baseRevenue);
      b.managerCost = j(b.managerCost);
    }
    keepIncreasing(out.businesses, 'baseCost');
    for (const u of out.upgrades ?? []) if (!u.premium) u.cost = j(u.cost);
    if (out.economy?.prestige?.threshold) out.economy.prestige.threshold = j(out.economy.prestige.threshold);
    const sim = out.sim;
    if (sim) {
      for (const k of ['baseCost', 'baseCapacity', 'managerCost']) sim.transport[k] = j(sim.transport[k]);
      for (const k of ['baseCost', 'baseSpend']) sim.sales[k] = j(sim.sales[k]);
      sim.venues.forEach((v: Json, i: number) => {
        if (i === 0) return; // the first venue is scale 1 and free, by definition
        v.scale = j(v.scale);
        v.unlockCost = j(v.unlockCost);
      });
      keepIncreasing(sim.venues, 'scale', 1);
      keepIncreasing(sim.venues, 'unlockCost', 1);
    }
    // The point of the exercise: never the same table as the base (validate would reject it).
    if (!economyTableClash(game.businesses, out.businesses)) return out;
  }
  throw new Error(`could not vary the economy for seed "${seed}"`);
}
