/**
 * Plausible haul states for tests, screens, galleries and the bot (section 9.1: "the UI packages
 * code against the fixture"). Built by playing the real engine with a fixed seed and a simple
 * scripted player, so every fixture is a state the rules can actually reach:
 * - `fresh`: a new game at 0:00 (slot 0, one idle drone).
 * - `minute3`: about 3:00 in, tutorial done, autopilot online, contracts unlocked.
 * - `midGame`: about 25 min in, rings 1 to 3 claimed, a module fitted, a seam running when possible.
 * - `late`: about 2 h 20 in, all 12 slots claimed, a Jump available.
 * - `afterJump`: just after the first Jump (galaxy 1, a condition, Star Map nodes bought).
 *
 * The config is the specification's starting content on top of a frozen classic fixture
 * (`base-game.json`), with this game's modules and pods; it never reads the shipped game.json.
 */
import { GameConfigSchema } from '../../config/schema';
import { HAUL_STARTING_CONTENT, HaulSchema, type HaulContentInput } from '../../config/schema.haul';
import * as H from '../haul';
import type { GameState } from '../types';
import baseGame from './base-game.json';

/** A fixed epoch for fixtures (22 Nov 2026, 12:00 UTC). */
export const FIXTURE_NOW = Date.UTC(2026, 10, 22, 12, 0, 0);

const MODULE_CARDS = [
  { id: 'diamondbit', name: 'Diamond Bit', title: 'Drill head', rarity: 'common' },
  { id: 'bayracks', name: 'Bay Racks', title: 'Cargo rack', rarity: 'common' },
  { id: 'thrusters', name: 'Tuned Thrusters', title: 'Thruster pack', rarity: 'common' },
  { id: 'clamps', name: 'Cargo Clamps', title: 'Dock clamp', rarity: 'common' },
  { id: 'chute', name: 'Overflow Chute', title: 'Rig chute', rarity: 'rare' },
  { id: 'keeper', name: 'Contract Keeper', title: 'Dock ledger', rarity: 'rare' },
  { id: 'sorter', name: 'Ore Sorter', title: 'Fleet sorter', rarity: 'epic' },
  { id: 'quickclamp', name: 'Quick Clamp', title: 'Dock clamp', rarity: 'epic' },
] as const;

const range = (a: number, b: number) => [a, b] as [number, number];
const POD = (id: string, name: string, tier: 'wood' | 'silver', slots: number, weights: [number, number, number]) => ({
  id,
  name,
  icon: `art:pod_${id}`,
  tier,
  slots,
  slotWeights: { card: weights[0], gems: weights[1], cash: weights[2] },
  rarityWeights: tier === 'wood' ? { common: 80, rare: 18, epic: 2, legendary: 0 } : { common: 62, rare: 30, epic: 8, legendary: 0 },
  cardCopies: { common: range(1, 3), rare: range(1, 2), epic: range(1, 1), legendary: range(1, 1) },
  gems: range(2, 5),
  cashSeconds: range(120, 120),
});

/**
 * The test config: shared fields from the frozen fixture, mode "haul", bonusPerPoint 0 (set after
 * parsing: the shared schema still requires a positive value), the starting haul content with
 * `overrides` merged on top (shallow per top-level key of the haul block).
 */
export function haulTestConfig(overrides: Partial<HaulContentInput> = {}): H.HaulConfig {
  const raw = {
    ...(baseGame as Record<string, unknown>),
    mode: 'haul',
    meta: {
      cards: MODULE_CARDS.map((c) => ({ ...c, icon: `art:mod_${c.id}`, stat: 'stationValue' })),
      cardEffect: { common: { base: 5, perLevel: 3 }, rare: { base: 10, perLevel: 5 }, epic: { base: 15, perLevel: 6 }, legendary: { base: 20, perLevel: 8 } },
      chests: [POD('scrap', 'Scrap Pod', 'wood', 2, [80, 10, 10]), POD('derelict', 'Derelict Cache', 'silver', 3, [85, 15, 0])],
    },
  };
  const cfg = GameConfigSchema.parse(raw);
  cfg.economy.prestige = { ...cfg.economy.prestige, bonusPerPoint: 0, threshold: 2e6, scale: 5, exponent: 0.5 };
  cfg.economy.startingCash = 0;
  cfg.economy.offline = { ...cfg.economy.offline, maxHours: 6, efficiency: 0.45 };
  const haul = HaulSchema.parse({ ...HAUL_STARTING_CONTENT, ...overrides });
  return { ...cfg, haul };
}

/** A shared state shaped like economy.createInitialState's, without importing economy.ts. */
export function baseGameState(now: number, seed = 12345): GameState {
  return {
    version: 2,
    cash: 0,
    gems: 0,
    runEarnings: 0,
    lifetimeEarnings: 0,
    prestigePoints: 0,
    prestigeCount: 0,
    venues: {},
    activeVenue: 'main',
    upgrades: [],
    boostUntil: 0,
    rush: { until: 0, readyAt: 0 },
    storySeen: [],
    entitlements: { noAds: false, skipRewarded: false, products: [], multipliers: {} },
    daily: { lastClaimDay: null, streak: 0 },
    cards: {},
    chests: { owned: {}, freeAnchor: 0, freeClaimed: 0, adDay: null, adCount: 0, adNextAt: 0, sinceEpic: 0, sinceLegendary: 0, seed: seed ^ 0x4348, opened: {} },
    missions: { slots: [], completed: {}, total: 0, day: null, doneToday: 0 },
    deals: {},
    dailyShop: { day: null, offerIds: [], bought: [] },
    rng: seed >>> 0,
    stats: { taps: 0, adsWatched: 0, playSeconds: 0, firstOpenAt: now, served: 0, levelsBought: 0, hires: 0, chestsOpened: 0, bonusCaught: 0, rushes: 0, sessions: 0, venuesEver: 1, clockHigh: now },
    lastSavedAt: now,
  };
}

/** A new haul game. */
export function freshHaulGame(cfg: H.HaulConfig, seed = 12345, now = FIXTURE_NOW): H.HaulGame & { haul: H.HaulState } {
  return H.withHaulFields(cfg, baseGameState(now, seed));
}

type Run = H.HaulGame & { haul: H.HaulState };

/**
 * One second of a simple, good player (the bot's rules, simplified): place idle drones on the best
 * slot, launch a full hold by hand, buy the autopilot when affordable (from 2:00), pick the best
 * contract when none is active, flare the best rock, drag one drone onto each seam, then buy the
 * purchase with the best payback. Deterministic.
 */
export function playerStep(cfg: H.HaulConfig, g: Run): Run {
  let s: Run = g;
  const h = () => s.haul;
  // Drones.
  for (let k = 0; k < 40 && h().idle > 0; k++) {
    const best = H.bestSlotForDrone(cfg, s);
    if (best === null) break;
    s = H.assignDrone(cfg, s, best) as Run;
  }
  const seam = h().vein.slot;
  if (seam !== null && h().vein.guests.length === 0) {
    const from = H.busiestRoute(h(), seam);
    if (from !== null && h().slots[from].haulers > 1) s = H.moveDrone(cfg, s, from, seam) as Run;
  }
  if (h().contracts.unlocked && h().contracts.active === null) {
    const p = H.haulParams(cfg, s);
    let best = 0;
    let bestGain = -1;
    h().contracts.board.forEach((_, i) => {
      const gain = H.contractGain(cfg, p, h(), i);
      if (gain > bestGain) {
        bestGain = gain;
        best = i;
      }
    });
    s = H.pickContract(cfg, s, best) as Run;
  }
  if (h().flare.charges > 0) {
    const target = h().slots.reduce((b, sl, i) => (sl.claimed && H.canFlare(s, i) && (b < 0 || i > b) ? i : b), -1);
    if (target >= 0) s = H.useFlare(cfg, s, target) as Run;
  }
  const p = H.haulParams(cfg, s);
  if (!h().autopilot.online && H.holdTotal(h()) >= p.F - H.EPS && H.canLaunch(s)) s = H.launch(cfg, s) as Run;
  if (!h().autopilot.online && h().clock >= 120) {
    if (H.affordable(s.cash, H.autopilotCost(cfg, s))) s = H.buyAutopilot(cfg, s) as Run;
    return s; // saving for the autopilot
  }
  // Best payback purchase.
  for (let k = 0; k < 8; k++) {
    const before = H.haulIncome(cfg, s);
    const options: { cost: number; apply: (x: Run) => Run }[] = [
      { cost: H.droneCost(cfg, s), apply: (x) => H.buyDrone(cfg, x) as Run },
      { cost: H.capacityCost(cfg, s), apply: (x) => H.buyCapacity(cfg, x) as Run },
      { cost: H.engineCost(cfg, s), apply: (x) => H.buyEngine(cfg, x) as Run },
      { cost: H.freighterCost(cfg, s), apply: (x) => H.buyFreighter(cfg, x) as Run },
    ];
    h().slots.forEach((sl, i) => {
      if (sl.claimed) options.push({ cost: H.rigCost(cfg, s, i), apply: (x) => H.upgradeRig(cfg, x, i) as Run });
      else options.push({ cost: H.claimCost(cfg, s, i), apply: (x) => H.claimSlot(cfg, x, i) as Run });
    });
    let pick: { cost: number; apply: (x: Run) => Run } | null = null;
    let bestScore = -1;
    for (const o of options) {
      if (!(o.cost < Infinity)) continue;
      // Payback with the new state's income (drones placed), priced by cost.
      let next = o.apply({ ...s, cash: o.cost + 1e-9 } as Run);
      for (let j = 0; j < 4 && next.haul.idle > 0; j++) {
        const b = H.bestSlotForDrone(cfg, next);
        if (b === null) break;
        next = H.assignDrone(cfg, next, b) as Run;
      }
      const gain = H.haulIncome(cfg, next) - before;
      const score = (gain > 0 ? gain : 1e-9) / o.cost;
      if (score > bestScore) {
        bestScore = score;
        pick = o;
      }
    }
    if (!pick || !H.affordable(s.cash, pick.cost)) break;
    s = pick.apply(s);
  }
  return s;
}

/** Plays `seconds` of the scripted player at 1 s ticks. */
export function playFor(cfg: H.HaulConfig, g: Run, seconds: number, now = FIXTURE_NOW): Run {
  let s = g;
  for (let t = 0; t < seconds; t++) {
    s = playerStep(cfg, s);
    s = H.advanceHaul(cfg, s, 1, now + t * 1000) as Run;
  }
  return s;
}

function fitAll(cfg: H.HaulConfig, g: Run, cards: string[]): Run {
  let s: Run = { ...g, cards: { ...g.cards } };
  for (const id of cards) s.cards[id] = { level: 2, copies: 0 };
  for (const id of cards) {
    const mod = cfg.haul.modules.find((m) => m.card === id);
    if (mod) s = H.fitModule(cfg, s, ['rig', 'fleet', 'dock'].indexOf(mod.socket), id) as Run;
  }
  return s;
}

let cache: Record<'fresh' | 'minute3' | 'midGame' | 'late' | 'afterJump', Run> | null = null;

/** The five fixture states (built once, lazily: `late` plays about 2 h 20 of game time). */
export function haulFixtures(cfg: H.HaulConfig = haulTestConfig()): Record<'fresh' | 'minute3' | 'midGame' | 'late' | 'afterJump', Run> {
  if (cache) return cache;
  const fresh = freshHaulGame(cfg);
  const minute3 = playFor(cfg, fresh, 180);
  let midGame = playFor(cfg, minute3, 25 * 60 - 180);
  midGame = fitAll(cfg, midGame, ['diamondbit', 'bayracks', 'clamps']);
  let late = playFor(cfg, midGame, 140 * 60 - 25 * 60);
  // Late game: every slot claimed (the scripted player is simpler than the balance bot).
  for (let i = 0; i < late.haul.slots.length; i++) {
    if (late.haul.slots[i].claimed) continue;
    const cost = H.claimCost(cfg, late, i);
    late = H.claimSlot(cfg, { ...late, cash: late.cash + cost }, i) as Run;
    late = { ...late, cash: Math.max(0, late.cash), lifetimeEarnings: late.lifetimeEarnings + cost, runEarnings: late.runEarnings + cost };
  }
  late = playFor(cfg, late, 60);
  if (H.coresAvailable(cfg, late) < 1) late = { ...late, lifetimeEarnings: Math.max(late.lifetimeEarnings, cfg.economy.prestige.threshold * 25) };
  const offers = H.offersFor(cfg, late.metaSeed, late.haulStats.jumps, late.haul.trait);
  const afterJump = H.prestigeHaul(cfg, late, FIXTURE_NOW + 140 * 60_000, offers[0], ['preload', 'assay', 'assay', 'afterburner', 'seedcredits']) as Run;
  cache = { fresh, minute3, midGame, late, afterJump };
  return cache;
}

// ---------------------------------------------------------------- test helpers

/** Puts a game into a chosen shape: claimed slots with rock 0, drones per slot, levels. */
export function shaped(
  c: H.HaulConfig,
  seed: number,
  opts: { slots: number[]; haulers?: number[]; rig?: number[]; capLevel?: number; engineLevel?: number; freighter?: number; autopilot?: boolean; policy?: H.AutopilotPolicy; idle?: number },
): Run {
  const g = freshHaulGame(c, seed);
  const h: H.HaulState = JSON.parse(JSON.stringify(g.haul));
  opts.slots.forEach((i, k) => {
    h.slots[i] = H.placeRock(c, h, i, { ...h.slots[i], claimed: true, rigLevel: opts.rig?.[k] ?? 1 }, 0, g.starMap);
    h.slots[i].haulers = opts.haulers?.[k] ?? 0;
  });
  h.counters.drilled = h.slots.reduce((a, s) => a + s.pile, 0);
  const onRoutes = h.slots.reduce((a, s) => a + s.haulers, 0);
  h.idle = opts.idle ?? 0;
  h.fleet = { drones: onRoutes + h.idle, capLevel: opts.capLevel ?? 1, engineLevel: opts.engineLevel ?? 1 };
  h.freighter.level = opts.freighter ?? 1;
  h.autopilot = { online: opts.autopilot ?? false, policy: opts.policy ?? 'full' };
  return { ...g, haul: h };
}

/** Ticks `seconds` in steps of `dt`, calling `each` after every tick. */
export function run(c: H.HaulConfig, g: Run, seconds: number, dt = 1, each?: (g: Run, ev: H.HaulEvent[]) => void): Run {
  let s = g;
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) {
    const ev: H.HaulEvent[] = [];
    s = H.advanceHaul(c, s, dt, FIXTURE_NOW + i * dt * 1000, ev) as Run;
    each?.(s, ev);
  }
  return s;
}

/** drilled − (piles + hold + cargo + shipped), relative. */
export function conservationError(g: Run): number {
  const h = g.haul;
  const piles = h.slots.reduce((a, s) => a + s.pile, 0);
  const total = piles + H.holdTotal(h) + H.sumUnits(h.freighter.cargo) + h.counters.shipped;
  return Math.abs(h.counters.drilled - total) / Math.max(1, h.counters.drilled);
}

