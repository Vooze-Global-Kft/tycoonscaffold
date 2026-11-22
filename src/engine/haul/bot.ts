/**
 * The balance bot of a haul game (docs/design/space-design.md section 8): plays the pure rules
 * (src/engine/haul.ts) at 1 s ticks like a good player and counts every gesture it would make on a
 * phone, then measures section 8's targets. Used by `npm run simulate -- <haul game>` (scripts/
 * simulate.ts through scripts/content/haul-bot.ts, which adds the command line), by
 * `build-space.py --table` and calibration runs (through `--json`), and by validate's pacing hook.
 * Pure (no Node import, no clock, no Math.random): the app's presets can build their states from
 * `runHaulBot` / `freshBotGame` (pass the app's `createInitialState` as `base`).
 *
 * How it plays (section 8, "Bot behaviour"):
 * - every idle drone goes at once to the slot with the highest marginal value (`bestSlotForDrone`);
 * - 2 drones are dragged onto each rich seam (natural or flare) and 1 onto each bonanza rock;
 * - with contracts open and none taken, it takes the offer with the highest bonus that it can
 *   deliver in `contracts.launches` launches once it routes for it (Decision 40), then drags drones
 *   onto rocks of its ores (from the routes that lose least) until every ore is on pace with 15 % to
 *   spare (what one launch carries × launches left ≥ units left), at most `contracts.fleetShare` of
 *   the fleet per contract; it never drops a taken contract;
 * - it swipes the freighter off the pad when the hold is full or holds everything the contract
 *   still needs until the Dock Autopilot is online, then sets the `contract` policy;
 * - it fires the free flare charge at the best rock;
 * - it buys the option with the best payback (Δ activeRate / cost, counted from now: the wait to
 *   afford it plus its payback time; a claim is valued with one new drone on it), and from 2:00
 *   saves for the autopilot;
 * - at a Jump it spends cores by a fixed priority (Preload, Assay Rights to its cap, Afterburner and
 *   Seed Credits in turn, then Prospect Survey and the cheapest capped node) and picks the offered
 *   condition with the highest activeRate at the new run's start.
 *
 * What counts as a gesture: drags (assign or move a drone: drag, flick or tap-tap), swipes (manual
 * launches), Upgrade taps (rig, fleet, freighter, claims, the autopilot), contract picks, sheet opens
 * (a rock tap for the Rig sheet, the Station sheet, the Contract Board, the ghost-slot tap before a
 * claim), flare drags and other taps (the policy chip). A sheet stays open while the bot keeps buying
 * from it within 3 s, so a burst of levels costs one open.
 *
 * Deterministic: the seed comes from the options, time from the loop.
 */
import * as H from '../haul';
import * as A from './advice';

type Run = H.HaulGame & { haul: H.HaulState };
export type GestureKind = 'drag' | 'swipe' | 'upgrade' | 'contract' | 'sheet' | 'flare' | 'tap';
export const GESTURE_KINDS: GestureKind[] = ['drag', 'swipe', 'upgrade', 'contract', 'sheet', 'flare', 'tap'];
type Counts = Record<GestureKind, number>;
const zero = (): Counts => ({ drag: 0, swipe: 0, upgrade: 0, contract: 0, sheet: 0, flare: 0, tap: 0 });

/** A thing the section 8 "nothing new" measure counts (an unlock, claim, new ore, system, socket, pod, rig tier, hull or segment). */
export interface Notable {
  t: number;
  run: number;
  what: string;
  /** Counts for "nothing new" (section 8's first list: unlock, claim, new ore, system, socket, pod, rig tier, hull or segment). */
  gap: boolean;
  /** Something new drawn on the map (section 8's second list). */
  drawn: boolean;
}

export interface HaulBotOptions {
  hours: number;
  /** Jump when it pays (first at `jumpReadyCores`, then when the gain at least doubles the cores earned). */
  prestige: boolean;
  /** Seed of the shared state the run starts from (`rng`; the haul seeds derive from it). */
  seed?: number;
  /** Epoch of t = 0, ms. */
  now?: number;
  /** Seconds of the minimum run length between Jumps. */
  minRun?: number;
  /** Called every `traceEvery` seconds with a status line. */
  trace?: (t: number, line: string) => void;
  traceEvery?: number;
  /** Bot seconds at which to keep a copy of the game (presets). */
  keepAt?: number[];
  /** A starting game (instead of a fresh one), e.g. to measure a later run. */
  start?: Run;
  /** Play without buying anything (routing, contracts, seams and launches only): the offline comparison. */
  noShop?: boolean;
  /** Pick contracts but never move a drone for one (section 8's "does nothing" check: few should be met). */
  passive?: boolean;
  /**
   * Only watching (Decision 42): the app open, the autopilot on `full`, nothing bought, no drone moved
   * or placed, no contract taken (one already taken stays), no flare fired. The second offline gate.
   */
  watch?: boolean;
  /**
   * Never take a contract (Decision 56, condition 6: the router's earnings are measured against this
   * player's): everything else as the bot, the autopilot on `full`.
   */
  noContracts?: boolean;
  /** Skip the offline comparison (nested runs). */
  noOffline?: boolean;
  /** Shared base state factory (the caller's createInitialState); the fixtures' shape is used when absent. */
  base?: (now: number, seed: number) => H.HaulGame;
}

export interface RunSummary {
  index: number;
  galaxy: number;
  trait: string | null;
  start: number;
  /** Bot second of the Jump that ended it (null: still running at the end). */
  end: number | null;
  /** runEarnings at the Jump (or at the end). */
  earnings: number;
  coresGained: number;
  buys: string[];
  /** Seconds into this run when its earnings reached the previous run's Jump earnings. */
  reachedPrevAt: number | null;
}

export interface Window10 {
  from: number;
  gestures: Counts;
  earned: number;
  depleted: number;
}

export interface HaulBotResult {
  hours: number;
  marks: Record<string, number>;
  notables: Notable[];
  windows: Window10[];
  runs: RunSummary[];
  gestures: Counts;
  limits: { drill: number; haul: number; freighter: number };
  payouts: { total: number; met: number; fillSum: number; launches: number };
  /** Decision 40: taken contracts met and lapsed, and the contract bonus paid (credits). */
  contracts: { taken: number; met: number; lapsed: number; bonus: number; earned: number };
  /** Bot seconds of every purchase (Upgrade taps: levels, claims, the autopilot). */
  buys: number[];
  /** Pods earned, by reason, per whole hour of bot time (index = hour). */
  podsByHour: Record<string, number>[];
  /**
   * One hour away against one hour of play from the same state: `offlinePerHour` without and
   * `offlineBoosted` with the Shift Log ad bonus (Decision 42), the bot playing on (`playPerHour`, the
   * first gate), only watching (`watchPerHour`, the second gate), without purchases (`noBuyPerHour`,
   * for the record) and activeRate × 3600.
   */
  offline: { at: number; offlinePerHour: number; offlineBoosted: number; activeRatePerHour: number; playPerHour: number; watchPerHour: number; noBuyPerHour: number }[];
  states: Record<number, Run>;
  /** activeRate at every whole minute of bot time (index = minute). */
  income: number[];
  /** lifetimeEarnings at every whole minute of bot time (index = minute). */
  lifetime: number[];
  end: Run;
}

/** A shared state shaped like economy.createInitialState's (the fixtures' shape), without importing economy.ts. */
function baseState(now: number, seed: number): H.HaulGame {
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
  } as unknown as H.HaulGame;
}

/** A new haul game for the bot. */
export function freshBotGame(cfg: H.HaulConfig, seed = 12345, now = Date.UTC(2026, 10, 22, 12), base = baseState): Run {
  return H.withHaulFields(cfg, base(now, seed) as never) as Run;
}

/** Freighter hull and segment levels that change the drawing (spec 4.3, errata 41: hulls 1, 10, 25, 50; segments from 75 every 25 up to 250). */
function freighterLook(cfg: H.HaulConfig, level: number): boolean {
  const f = cfg.haul.freighter;
  if (f.hulls.includes(level)) return true;
  const last = f.hulls[f.hulls.length - 1] ?? 50;
  return level > last && (level - last) % f.segmentEvery === 0 && (level - last) / f.segmentEvery <= f.segmentMax;
}

/** Rig levels that change the rig's look: the tiers, then a stripe every `stripeEvery` levels past the last. */
function rigLook(cfg: H.HaulConfig, level: number): boolean {
  const tiers = cfg.haul.rig.tiers.map((t) => t.level);
  if (tiers.includes(level)) return true;
  const last = tiers[tiers.length - 1] ?? Infinity;
  return level > last && (level - last) % cfg.haul.rig.stripeEvery === 0;
}

const sumUnits = (u: Record<string, number>) => Object.values(u).reduce((a, b) => a + b, 0);
/** The calendar day of a wall time, as economy.dayKey writes it, in UTC (the bot's "local" day). */
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function runHaulBot(cfg: H.HaulConfig, opts: HaulBotOptions): HaulBotResult {
  const NOW = opts.now ?? Date.UTC(2026, 10, 22, 12);
  const seed = opts.seed ?? 12345;
  const horizon = Math.round(opts.hours * 3600);
  let g: Run = opts.start ?? freshBotGame(cfg, seed, NOW, opts.base ?? baseState);
  const marks: Record<string, number> = {};
  const mark = (k: string, t: number) => {
    if (marks[k] === undefined) marks[k] = t;
  };
  const notables: Notable[] = [];
  const windows: Window10[] = [];
  const gestures = zero();
  const limits = { drill: 0, haul: 0, freighter: 0 };
  const payouts = { total: 0, met: 0, fillSum: 0, launches: 0 };
  const contracts = { taken: 0, met: 0, lapsed: 0, bonus: 0, earned: 0 };
  const podsByHour: Record<string, number>[] = [];
  const offline: HaulBotResult['offline'] = [];
  const states: Record<number, Run> = {};
  const income: number[] = [];
  const lifetime: number[] = [];
  const keepAt = new Set(opts.keepAt ?? []);
  const runs: RunSummary[] = [{ index: 0, galaxy: g.haul.galaxy, trait: g.haul.trait, start: 0, end: null, earnings: 0, coresGained: 0, buys: [], reachedPrevAt: null }];

  let t = 0;
  let win: Window10 = { from: 0, gestures: zero(), earned: 0, depleted: 0 };
  const buys: number[] = [];
  const count = (k: GestureKind, n = 1) => {
    gestures[k] += n;
    win.gestures[k] += n;
    if (k === 'upgrade') buys.push(t);
  };
  // Sheets stay open while the bot keeps buying from them (3 s).
  let openSheet: { key: string; until: number } | null = null;
  const sheet = (key: string) => {
    if (!openSheet || openSheet.key !== key || openSheet.until < t) count('sheet');
    openSheet = { key, until: t + 3 };
  };
  const note = (what: string, gap: boolean, drawn: boolean) => notables.push({ t, run: runs.length - 1, what, gap, drawn });

  // Per run: ores seen, seams already served, bonanza rocks already served.
  let oresSeen = new Set<string>();
  let seamsServed = new Set<string>();
  let bonanzaServed = new Set<string>();
  let policySet = false;
  let prevF = 0;

  const startRun = () => {
    oresSeen = new Set(g.haul.slots.filter((s) => s.claimed && s.rockN >= 0).map((s) => s.ore));
    seamsServed = new Set();
    bonanzaServed = new Set();
    policySet = false;
  };
  startRun();

  const params = () => H.haulParams(cfg, g);

  /** Handle the events of a tick or an action: notables, payouts, the first marks. */
  const onEvents = (ev: H.HaulEvent[]) => {
    for (const e of ev) {
      switch (e.type) {
        case 'arrive': {
          if (!oresSeen.has(e.ore)) {
            oresSeen.add(e.ore);
            note(`new ore ${e.ore}`, true, true);
          } else if (e.oreChanged) note(`T-${e.slot + 1} is ${e.ore} now`, false, true);
          if (e.bonanza) {
            mark('firstBonanza', t);
            note(`bonanza T-${e.slot + 1}`, false, true);
          }
          break;
        }
        case 'warp': {
          warpedSince = true;
          mark('firstPayout', t);
          payouts.total += 1;
          if (e.met) payouts.met += 1;
          win.earned += e.payout;
          contracts.earned += e.payout;
          contracts.bonus += e.bonus ?? 0;
          break;
        }
        case 'contractMet':
          contracts.met += 1;
          break;
        case 'contractLapsed':
          if (e.wasActive && !e.dropped) contracts.lapsed += 1;
          break;
        case 'launch': {
          payouts.launches += 1;
          payouts.fillSum += sumUnits(e.cargo) / Math.max(1, params().F);
          break;
        }
        case 'contractsUnlocked':
          mark('contractsUnlocked', t);
          note('contracts unlocked', true, false);
          break;
        case 'podEarned': {
          mark(`pod ${e.reason}`, t);
          note(`pod (${e.reason})`, true, false);
          const hr = (podsByHour[Math.floor(t / 3600)] ??= {});
          hr[e.reason] = (hr[e.reason] ?? 0) + 1;
          break;
        }
        case 'depleted':
          win.depleted += 1;
          break;
        case 'vein':
          mark(e.flare ? 'firstFlare' : 'firstSeam', t);
          break;
        default:
          break;
      }
    }
  };

  const act = (next: H.HaulGame, ev: H.HaulEvent[]): boolean => {
    if (next === g) return false;
    g = next as Run;
    onEvents(ev);
    return true;
  };

  /** Place idle drones on the best slots. */
  const placeIdle = () => {
    for (let k = 0; k < 60 && g.haul.idle > 0; k++) {
      // While the taken contract's light is not green, a new drone goes to the ore it is short of.
      const best = (opts.passive || opts.noContracts ? null : shortRock()) ?? H.bestSlotForDrone(cfg, g);
      if (best === null) break;
      const ev: H.HaulEvent[] = [];
      if (!act(H.assignDrone(cfg, g, best, ev), ev)) break;
      count('drag');
    }
  };

  const cheapestSource = (except: number[]): number | null => A.cheapestSource(cfg, g, except);

  /** The taken contract's view, when one is taken. */
  const activeView = () => (g.haul.contracts.active === null ? undefined : H.contractViews(cfg, params(), g.haul, g.haulStats).find((v) => v.active));
  /** The rock of `ore` where one more drone adds most (null when none adds anything). */
  const bestRockOf = (ore: string): number | null => {
    const p = params();
    let to: number | null = null;
    let best = 1e-9;
    g.haul.slots.forEach((s, k) => {
      if (!s.claimed || s.respawnAt !== null || s.ore !== ore || !(s.life > 0)) return;
      const sp = p.slots[k];
      const e = sp.cBase / sp.trip;
      const add = Math.min(sp.rb, (s.haulers + 1) * e) - Math.min(sp.rb, s.haulers * e);
      if (add > best) {
        best = add;
        to = k;
      }
    });
    return to;
  };
  /** The rock of the ore the taken contract is short of, when its light is not green and a drone adds there. */
  const shortRock = (): number | null => {
    const v = activeView();
    return v && !v.onPace && v.shortOre ? bestRockOf(v.shortOre) : null;
  };

  const moveTo = (to: number, n: number, avoid: number[] = []): number => {
    let moved = 0;
    for (let k = 0; k < n; k++) {
      const from = cheapestSource([to, ...avoid]);
      if (from === null || g.haul.slots[from].haulers < 2) break;
      if (!act(H.moveDrone(cfg, g, from, to), [])) break;
      count('drag');
      moved++;
    }
    return moved;
  };

  /**
   * Every 20 s a good player looks at the field again (section 8, finishing round): rocks dried and
   * came back, rigs grew, so one drone moves from the route that loses least to the slot where it adds
   * most, when that raises the income line by more than 2 % (`routeGain`, the drag preview's figure),
   * at most 3 drones a look. While a contract is taken it never takes a drone off an ore it wants.
   */
  const rebalance = () => {
    const c = opts.passive || opts.noContracts ? null : H.activeContract(g.haul);
    const keep = c ? g.haul.slots.map((s, k) => (s.claimed && c.wants.some((w) => w.ore === s.ore) ? k : -1)).filter((k) => k >= 0) : [];
    for (let k = 0; k < 3; k++) {
      const to = H.bestSlotForDrone(cfg, g);
      if (to === null) return;
      const from = cheapestSource([to, ...keep]);
      if (from === null || g.haul.slots[from].haulers < 2) return;
      const gain = H.routeGain(cfg, g, from, to).delta;
      if (!(gain > 0.02 * H.haulIncome(cfg, g))) return;
      if (!act(H.moveDrone(cfg, g, from, to), [])) return;
      count('drag');
    }
  };

  /** 2 drones onto every new seam (natural or flare), 1 onto every new bonanza rock. */
  const serveSeamsAndBonanzas = () => {
    const h = g.haul;
    for (const [rec, tag] of [
      [h.vein, 'v'],
      [h.flare, 'f'],
    ] as const) {
      if (rec.slot === null) continue;
      const id = `${tag}:${rec.slot}:${Math.round(rec.until)}`;
      if (seamsServed.has(id)) continue;
      seamsServed.add(id);
      moveTo(rec.slot, 2);
    }
    h.slots.forEach((s, i) => {
      if (!s.claimed || !s.bonanza || s.respawnAt !== null) return;
      const id = `${i}:${s.rockN}`;
      if (bonanzaServed.has(id)) return;
      bonanzaServed.add(id);
      moveTo(i, 1);
    });
  };

  /**
   * Routes for the taken contract until its light is green (Decision 56, the pace light): each step
   * is the move that raises the contract's pace (`paceRatio` of its view) most for the income it
   * costs, among: an idle drone onto a rock of the ore furthest behind, a drone from a route of
   * another ore onto it (taking drones off other ores is how a share of the freighter rises), and one
   * level of that rock's rig when it can be paid now. At most `budget` steps; returns the steps made.
   */
  const paceOf = (x: Run): number => {
    const v = H.contractViews(cfg, H.haulParams(cfg, x), x.haul, x.haulStats).find((y) => y.active);
    return v ? (v.onPace ? Infinity : v.paceRatio) : -Infinity;
  };
  const routeStep = (budget: number): number => {
    let steps = 0;
    for (let guard = 0; guard < 30 && steps < budget; guard++) {
      const view = activeView();
      if (!view || view.onPace || !view.shortOre) break;
      const short = view.shortOre;
      const income = H.haulIncome(cfg, g);
      const rocks = g.haul.slots.map((s, i) => (s.claimed && s.respawnAt === null && s.ore === short && s.life > 0 ? i : -1)).filter((i) => i >= 0);
      let best: { next: Run; kind: 'drag' | 'upgrade'; sheet?: string } | null = null;
      let bestScore = 0;
      // The move that raises the pace most; between moves that put it on pace, the one that costs the
      // least income.
      const consider = (next: H.HaulGame, kind: 'drag' | 'upgrade', sheetKey?: string) => {
        if (next === g) return;
        const pace = paceOf(next as Run);
        const gain = Math.min(1, pace) - view.paceRatio;
        if (!(gain > 1e-6)) return;
        const score = pace >= 1 ? 10 + H.haulIncome(cfg, next) / Math.max(income, 1e-9) : gain;
        if (score > bestScore) {
          bestScore = score;
          best = { next: next as Run, kind, sheet: sheetKey };
        }
      };
      for (const to of rocks) {
        if (g.haul.idle > 0) consider(H.assignDrone(cfg, g, to), 'drag');
        g.haul.slots.forEach((s, from) => {
          if (s.claimed && s.haulers >= 1 && s.ore !== short) consider(H.moveDrone(cfg, g, from, to), 'drag');
        });
        if (H.affordable(g.cash, H.rigCost(cfg, g, to))) consider(H.upgradeRig(cfg, g, to), 'upgrade', `rig ${to}`);
      }
      const pick = best as { next: Run; kind: 'drag' | 'upgrade'; sheet?: string } | null;
      if (!pick) break;
      if (pick.sheet) sheet(pick.sheet);
      g = pick.next;
      count(pick.kind);
      steps += 1;
    }
    return steps;
  };


  /**
   * Contracts (section 8, Decision 56): with none taken, it takes the offer with the highest bonus
   * that has a route for every ore it wants (a finite raise); then it routes for it (`routeStep`) at
   * the take and after every warp-out while its light is not green, at most `contracts.fleetShare` of
   * the fleet per contract, and new drones go to the ore it is short of. It reads only what the board
   * shows (`contractViews`: the steady figure and the hold), so later surprises (a rock that dries, a
   * freighter level, drones bought for other ores) can still make it lapse. It never drops one.
   * With `passive` it takes the best-paying offer and never moves a drone for it (the "does nothing"
   * player: it should meet few); with `watch` or `noContracts` it takes nothing.
   */
  let routedFor = -1;
  let routedMoves = 0;
  let warpedSince = true;
  /**
   * When a contract ends (met or lapsed), the drones moved for it go back where they were at the take,
   * as far as the routes still exist (a person puts the field back; section 8, finishing round).
   */
  let parked: number[] | null = null;
  const unpark = () => {
    if (!parked) return;
    const want = parked;
    parked = null;
    for (let k = 0; k < 80; k++) {
      const to = g.haul.slots.findIndex((s, i) => s.claimed && s.respawnAt === null && s.haulers < (want[i] ?? 0));
      const from = g.haul.slots.findIndex((s, i) => s.claimed && s.haulers > (want[i] ?? 0) && s.haulers > 0);
      if (to < 0 || from < 0) break;
      if (!act(H.moveDrone(cfg, g, from, to), [])) break;
      count('drag');
    }
  };
  const handleContracts = () => {
    const h = g.haul;
    if (!h.contracts.unlocked || opts.watch || opts.noContracts) return;
    if (h.contracts.active === null) unpark();
    let fresh = false;
    if (h.contracts.active === null) {
      let pick = -1;
      let pickBonus = 0;
      for (const v of H.contractViews(cfg, params(), h, g.haulStats)) {
        if (v.contract.taken || !(v.bonus > pickBonus)) continue;
        if (!opts.passive && !Number.isFinite(v.raise)) continue;
        pick = v.index;
        pickBonus = v.bonus;
      }
      if (pick < 0) return;
      sheet('contracts');
      if (!act(H.pickContract(cfg, g, pick), [])) return;
      count('contract');
      contracts.taken += 1;
      fresh = true;
    }
    if (opts.passive) return;
    const c = H.activeContract(g.haul);
    if (!c) return;
    if (routedFor !== c.k) {
      routedFor = c.k;
      routedMoves = 0;
      parked = g.haul.slots.map((s) => (s.claimed ? s.haulers : 0));
    }
    if (!fresh && !warpedSince) return;
    warpedSince = false;
    const budget = Math.ceil(cfg.haul.contracts.fleetShare * g.haul.fleet.drones);
    routedMoves += routeStep(budget - routedMoves);
  };



  const useFreeFlare = () => {
    const h = g.haul;
    if (h.flare.charges <= 0) return;
    const p = params();
    let best = -1;
    let bestV = 0;
    h.slots.forEach((s, i) => {
      if (!s.claimed || !H.canFlare(g, i)) return;
      const v = p.slots[i].rb * (p.slots[i].price || 0);
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    });
    if (best < 0) return;
    const ev: H.HaulEvent[] = [];
    if (act(H.useFlare(cfg, g, best, ev), ev)) count('flare');
  };

  const manualLaunch = () => {
    const h = g.haul;
    if (h.autopilot.online || !H.canLaunch(g)) return;
    const p = params();
    const full = H.holdTotal(h) >= p.F - H.EPS;
    // Decision 40: the hold holds everything the taken contract still needs.
    const met = H.contractMet(h.hold, H.activeContract(h));
    if (!full && !met) return;
    const ev: H.HaulEvent[] = [];
    if (act(H.launch(cfg, g, ev), ev)) count('swipe');
  };

  const withDrones = (x: Run): Run => A.withDrones(cfg, x);

  /** Best-payback shopping (advice.ts, the estimate the hints share: Decision 57); true when something was bought. */
  const shop = (): boolean => {
    let bought = false;
    for (let k = 0; k < 24; k++) {
      const pick = A.bestPurchase(cfg, g);
      const pickTotal = pick?.total ?? 0;
      if (!pick || !H.affordable(g.cash, pick.cost) || !H.affordable(g.cash, pickTotal - (pick.extraDrone ? H.droneCost(cfg, g) : 0))) break;
      const ev: H.HaulEvent[] = [];
      const lvlBefore = pick.key.startsWith('rig ') ? g.haul.slots[Number(pick.key.slice(4))].rigLevel : 0;
      let next: H.HaulGame = g;
      if (pick.key === 'drone') next = H.buyDrone(cfg, g, ev);
      else if (pick.key === 'capacity') next = H.buyCapacity(cfg, g, ev);
      else if (pick.key === 'engine') next = H.buyEngine(cfg, g, ev);
      else if (pick.key === 'freighter') next = H.buyFreighter(cfg, g, ev);
      else if (pick.key.startsWith('rig ')) next = H.upgradeRig(cfg, g, Number(pick.key.slice(4)), ev);
      else if (pick.key.startsWith('claim ')) next = H.claimSlot(cfg, g, Number(pick.key.slice(6)), ev);
      sheet(pick.sheet);
      if (!act(next, ev)) break;
      count('upgrade');
      bought = true;
      if (pick.key.startsWith('claim ')) {
        const slot = Number(pick.key.slice(6));
        const ring = H.ringOf(cfg, slot) + 1;
        mark(`ring${ring}`, t);
        mark(`claim${slot}`, t);
        note(`claim T-${slot + 1} (ring ${ring})`, true, true);
        // Move a drone there at once if one can come from a route that has spares (the bot buys one next).
        if (g.haul.idle === 0) moveTo(slot, 1);
      } else if (pick.key.startsWith('rig ')) {
        const slot = Number(pick.key.slice(4));
        const lvl = g.haul.slots[slot].rigLevel;
        if (lvl > lvlBefore && rigLook(cfg, lvl)) note(`rig T-${slot + 1} L${lvl}`, true, true);
      } else if (pick.key === 'freighter') {
        const lvl = g.haul.freighter.level;
        if (freighterLook(cfg, lvl)) note(`freighter L${lvl}`, true, true);
      }
      placeIdle();
    }
    return bought;
  };

  const ensurePolicy = () => {
    if (!g.haul.autopilot.online || policySet) return;
    policySet = true;
    const want = opts.watch || opts.noContracts ? 'full' : 'contract';
    if (g.haul.autopilot.policy !== want) {
      sheet('station');
      if (act(H.setPolicy(cfg, g, want), [])) count('tap');
    }
  };

  // ----------------------------------------------------------- the Jump
  let coresEarned = 0; // total cores gained over all Jumps so far
  const priorityBuys = (x: H.HaulGame): { game: H.HaulGame; buys: string[] } => {
    let s = x;
    const buys: string[] = [];
    const tryBuy = (id: string): boolean => {
      const next = H.buyStarNode(cfg, s, id);
      if (next === s) return false;
      s = next;
      buys.push(id);
      return true;
    };
    tryBuy('preload');
    while (tryBuy('assay'));
    // Afterburner and Seed Credits in turn.
    for (let k = 0; k < 20; k++) {
      const a = tryBuy('afterburner');
      const b = tryBuy('seedcredits');
      if (!a && !b) break;
    }
    // Then Prospect Survey and the cheapest capped node.
    for (let k = 0; k < 60; k++) {
      if (tryBuy('prospect')) continue;
      const view = H.starMapView(cfg, s).filter((n) => n.cost !== null);
      view.sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity));
      let any = false;
      for (const n of view) if (tryBuy(n.id)) {
        any = true;
        break;
      }
      if (!any) break;
    }
    return { game: s, buys };
  };

  const doJump = (): boolean => {
    const now = NOW + t * 1000;
    const gain = H.coresAvailable(cfg, g);
    const runEarn = g.runEarnings;
    const confirmed = H.confirmJump(cfg, g, now);
    if (confirmed === g || !confirmed.haulStats.pendingJump) return false;
    const { game: spent, buys } = priorityBuys(confirmed);
    const offers = spent.haulStats.pendingJump!.offers;
    let best: Run | null = null;
    let bestRate = -1;
    let bestTrait = offers[0];
    for (const trait of offers) {
      const started = H.startGalaxy(cfg, spent, now, trait) as Run;
      if (!started.haul) continue;
      const placed = withDrones(started);
      const rate = H.haulIncome(cfg, placed);
      if (rate > bestRate) {
        bestRate = rate;
        best = started;
        bestTrait = trait;
      }
    }
    if (!best) return false;
    const cur = runs[runs.length - 1];
    cur.end = t;
    cur.earnings = runEarn;
    cur.coresGained = gain;
    coresEarned += gain;
    g = best;
    runs.push({ index: runs.length, galaxy: g.haul.galaxy, trait: bestTrait, start: t, end: null, earnings: 0, coresGained: 0, buys, reachedPrevAt: null });
    note(`jump to galaxy ${g.haul.galaxy + 1} (${bestTrait}), drone cap ${params().droneCap}`, true, true);
    for (const id of new Set(buys)) if (H.starNodeLevel(confirmed, id) === 0) note(`station part ${id}`, false, true);
    count('sheet'); // the Star Map spoke
    count('tap', 2 + buys.length); // Jump, condition pick, a tap per node level
    startRun();
    prevF = 0;
    return true;
  };

  // The supply drop (5.2: the shared free-chest timer with this game's numbers): a pod the player sees
  // land, the Nth after `firstMinutes[N − 1]` minutes and then every `everyHours`, collected at once.
  // Counted from t = 0 of a fresh game only (a run started from a state does not know its timer).
  const supply: number[] = [];
  const fc = cfg.meta.freeChest;
  if (fc && !opts.start) {
    for (let at = 0, n = 1; n < 200; n++) {
      const first = fc.firstMinutes[n - 1];
      at += first !== undefined ? first * 60 : fc.everyHours * 3600;
      if (at >= horizon) break;
      supply.push(Math.round(at));
    }
  }
  let nextSupply = 0;

  // ----------------------------------------------------------- the loop
  for (t = 0; t < horizon; t++) {
    if (nextSupply < supply.length && t >= supply[nextSupply]) {
      nextSupply++;
      mark('pod supply', t);
      note('pod (supply)', true, false);
      const hr = (podsByHour[Math.floor(t / 3600)] ??= {});
      hr.supply = (hr.supply ?? 0) + 1;
    }
    if (t > 0 && t % 600 === 0) {
      windows.push(win);
      win = { from: t, gestures: zero(), earned: 0, depleted: 0 };
    }
    if (keepAt.has(t)) states[t] = g;
    if (t % 60 === 0) {
      income.push(H.haulIncome(cfg, g));
      lifetime.push(g.lifetimeEarnings);
    }
    const now = NOW + t * 1000;

    if (!opts.watch) {
      placeIdle();
      if (t % 20 === 0) rebalance();
      serveSeamsAndBonanzas();
    }
    handleContracts();
    if (!opts.watch) {
      useFreeFlare();
      manualLaunch();
    }
    const wasOnline = g.haul.autopilot.online;
    if (opts.watch) {
      /* nothing bought */
    } else if (!g.haul.autopilot.online && g.haul.clock >= 120) {
      if (H.affordable(g.cash, H.autopilotCost(cfg, g))) {
        sheet('station');
        const ev: H.HaulEvent[] = [];
        if (act(H.buyAutopilot(cfg, g, ev), ev)) count('upgrade');
      }
    } else if (!opts.noShop) shop();
    if (!wasOnline && g.haul.autopilot.online) {
      mark(runs.length === 1 ? 'autopilot' : `autopilot run ${runs.length}`, t);
      note('dock autopilot online', true, false);
    }
    ensurePolicy();

    // The day shift (Decision 53, rules:new:5): the app starts one on every tick (haulMode) with the
    // wall time and the local day; the bot does the same once a minute with its simulated wall time
    // (its local day is the UTC day of that time, so a run is the same on every machine).
    if (t % 60 === 0) g = H.haulShift(cfg, g, now, utcDay(now)) as Run;

    const ev: H.HaulEvent[] = [];
    g = H.advanceHaul(cfg, g, 1, now, ev) as Run;
    onEvents(ev);
    const F = params().F;
    prevF = F;

    // Bound-by-one-limit, every 10 s.
    if (t % 10 === 0) for (const r of H.routeLimits(cfg, g)) limits[r.limit] += 10;

    // Offline against active play at the same state (minutes 30, 60, 120; then every 2 h): one hour
    // away (haulOffline) against one hour of the bot playing on from the same state (no Jump). The
    // no-purchase hour is kept too (`noShop`), for the record.
    if (!opts.noOffline && (t === 1800 || t === 3600 || t === 7200 || (t > 7200 && t % 7200 === 0))) {
      const snap = { ...g, lastSavedAt: now, stats: { ...g.stats, clockHigh: now } } as Run;
      const off = H.haulOffline(cfg, snap, now + 3600_000);
      const played = runHaulBot(cfg, { hours: 1, prestige: false, noOffline: true, start: g, now });
      const watched = runHaulBot(cfg, { hours: 1, prestige: false, watch: true, noOffline: true, start: g, now });
      const still = runHaulBot(cfg, { hours: 1, prestige: false, noShop: true, noOffline: true, start: g, now });
      offline.push({
        at: t,
        offlinePerHour: off.earnings,
        offlineBoosted: off.earnings * (1 + (cfg.haul.offline.adBonus ?? 0)),
        activeRatePerHour: H.haulIncome(cfg, g) * 3600,
        playPerHour: played.end.lifetimeEarnings - g.lifetimeEarnings,
        watchPerHour: watched.end.lifetimeEarnings - g.lifetimeEarnings,
        noBuyPerHour: still.end.lifetimeEarnings - g.lifetimeEarnings,
      });
    }

    // Run summaries: when this run's earnings pass the previous run's Jump earnings.
    const cur = runs[runs.length - 1];
    if (cur.index > 0 && cur.reachedPrevAt === null && g.runEarnings >= runs[cur.index - 1].earnings) cur.reachedPrevAt = t - cur.start;

    // The Jump.
    const avail = H.coresAvailable(cfg, g);
    if (avail >= cfg.haul.jumpReadyCores) mark(runs.length === 1 ? 'jumpReady' : `jumpReady run ${runs.length}`, t);
    if (opts.prestige && avail >= cfg.haul.jumpReadyCores && avail >= coresEarned && t - cur.start >= (opts.minRun ?? 900)) doJump();

    if (opts.trace && opts.traceEvery && t % opts.traceEvery === 0) {
      const h = g.haul;
      const claimed = h.slots.filter((s) => s.claimed).length;
      opts.trace(
        t,
        `run ${runs.length} cash ${g.cash.toPrecision(3)} life ${g.lifetimeEarnings.toPrecision(3)} income ${H.haulIncome(cfg, g).toPrecision(3)}/s claimed ${claimed} drones ${h.fleet.drones} cap L${h.fleet.capLevel} eng L${h.fleet.engineLevel} F L${h.freighter.level} rigs ${h.slots
          .filter((s) => s.claimed)
          .map((s) => s.rigLevel)
          .join('/')} cores +${H.coresAvailable(cfg, g)}`,
      );
    }
  }
  windows.push(win);
  const cur = runs[runs.length - 1];
  cur.earnings = g.runEarnings;
  void prevF;
  return { hours: opts.hours, marks, notables, windows, runs, gestures, limits, payouts, contracts, buys, podsByHour, offline, states, income, lifetime, end: g };
}

// ----------------------------------------------------------- section 8's targets

export interface Target {
  name: string;
  target: string;
  value: string;
  ok: boolean;
  hard: boolean;
}

const mmss = (s: number | null | undefined): string => {
  if (s === null || s === undefined || !Number.isFinite(s)) return 'never';
  s = Math.round(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
export const formatClock = mmss;

const within = (v: number | undefined, lo: number, hi: number) => v !== undefined && v >= lo && v <= hi;
/** Seconds a first Jump must keep from each edge of its window in the gate (Decision 62). */
export const JUMP_MARGIN = 180;

/**
 * Lifetime earnings of a run of the bot at `hours`, from a result that covers them without a Jump
 * before then; null when it does not (then the caller runs one without Jumps).
 */
export function earnedBy(r: HaulBotResult, hours: number): number | null {
  const min = Math.round(hours * 60);
  const jumped = r.runs[0].end !== null && r.runs[0].end < min * 60;
  return !jumped && r.lifetime[min] !== undefined ? r.lifetime[min] : null;
}

/** Longest stretch between notables in [from, to) (both ends count as boundaries). */
function longestGap(times: number[], from: number, to: number): { len: number; end: number } {
  const ts = [from, ...times.filter((x) => x > from && x < to), to].sort((a, b) => a - b);
  let gap = { len: 0, end: from };
  for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] > gap.len) gap = { len: ts[i] - ts[i - 1], end: ts[i] };
  return gap;
}

/**
 * Section 8's targets. `passive` is a run of the "does nothing" player (`passive: true`: it picks
 * contracts but never moves a drone for one); with it, the met share of that player is a target too
 * (a contract met without routing is no choice).
 */
export function evaluate(cfg: H.HaulConfig, r: HaulBotResult, passive?: HaulBotResult, compare?: { router: number; never: number; hours: number }): Target[] {
  const m = r.marks;
  const out: Target[] = [];
  const add = (name: string, target: string, value: string, ok: boolean, hard: boolean) => out.push({ name, target, value, ok, hard });
  add('First payout', '≤ 0:35', mmss(m.firstPayout), (m.firstPayout ?? Infinity) <= 35, true);
  add('Dock Autopilot', '≤ 3:30', mmss(m.autopilot), (m.autopilot ?? Infinity) <= 210, true);
  add('Contracts unlock', '1:30 to 2:00', mmss(m.contractsUnlocked), within(m.contractsUnlocked, 90, 120), false);
  add('First ring-2 slot', '5:00 to 8:00', mmss(m.ring2), within(m.ring2, 300, 480), false);
  add('First ring-3 slot', '15:00 to 22:00', mmss(m.ring3), within(m.ring3, 900, 1320), false);
  add('First ring-4 slot', '40 to 55 min', mmss(m.ring4), within(m.ring4, 2400, 3300), false);
  add('First ring-5 slot', '1 h 30 to 1 h 55', mmss(m.ring5), within(m.ring5, 5400, 6900), false);
  const run1 = r.runs[0];
  const firstRunEnd = run1.end ?? r.hours * 3600;
  const claims = Object.entries(m).filter(([k, v]) => k.startsWith('claim') && v <= firstRunEnd).map(([, v]) => v);
  const slots = H.slotCount(cfg);
  const allAt = claims.length >= slots - 1 ? Math.max(...claims) : undefined;
  add('All slots claimed', '1 h 50 to 2 h 20', mmss(allAt), within(allAt, 6600, 8400), false);
  // Decision 62: the gate keeps three minutes from each edge of the window, so a seed outside the gate's
  // five does not fall out of it.
  add('First Jump available (cores ≥ 20)', '2 h 15 to 2 h 45 (gate: 2 h 18 to 2 h 42, Decision 62)', mmss(m.jumpReady), within(m.jumpReady, 8100 + JUMP_MARGIN, 9900 - JUMP_MARGIN), true);
  const run2 = r.runs[1];
  const run1Time = run1.end ? run1.end - run1.start : null;
  const r2 = run2?.reachedPrevAt ?? null;
  // Decision 1 (lead, integration step): the hard gate is 65 %; 60 % stays the target.
  add('Run 2 reaches run 1’s Jump earnings', '≤ 60 % of run 1 (gate 65 %)', run1Time && r2 !== null ? `${((r2 / run1Time) * 100).toFixed(0)} % (${mmss(r2)} of ${mmss(run1Time)})` : 'not reached', !!run1Time && r2 !== null && r2 <= 0.65 * run1Time, true);
  const run3 = r.runs[2];
  const run2Time = run2?.end ? run2.end - run2.start : null;
  const r3 = run3?.reachedPrevAt ?? null;
  add('Run 3 reaches run 2’s Jump earnings', '≤ 70 % of run 2', run2Time && r3 !== null ? `${((r3 / run2Time) * 100).toFixed(0)} % (${mmss(r3)} of ${mmss(run2Time)})` : 'not reached', !!run2Time && r3 !== null && r3 <= 0.7 * run2Time, false);

  const drags = [30, 60, 120].map((min) => r.windows.find((w) => w.from === (min - 10) * 60));
  add('Drags per 10 min at minutes 30, 60, 120', '≥ 4 at each', drags.map((w) => (w ? w.gestures.drag : '–')).join(' / '), drags.every((w) => !!w && w.gestures.drag >= 4), true);
  const shares = r.windows.filter((w) => w.from >= 600).map((w) => {
    const all = GESTURE_KINDS.reduce((a, k) => a + w.gestures[k], 0);
    return all ? w.gestures.upgrade / all : 0;
  });
  const worst = shares.length ? Math.max(...shares) : 0;
  const worstAt = r.windows.filter((w) => w.from >= 600)[shares.indexOf(worst)]?.from ?? 0;
  add('Upgrade taps share, every 10 min after minute 10', '≤ 60 %', `max ${(worst * 100).toFixed(0)} % (window from ${mmss(worstAt)})`, worst <= 0.6, true);

  const nt = r.notables.filter((n) => n.run === 0 && n.gap).map((n) => n.t);
  const g1 = longestGap(nt, 0, firstRunEnd);
  const g30 = longestGap(nt, 0, Math.min(1800, firstRunEnd));
  add('Longest stretch with nothing new to the first Jump', '≤ 12 min; ≤ 6 in the first 30', `${mmss(g1.len)} (to ${mmss(g1.end)}); ${mmss(g30.len)} (to ${mmss(g30.end)})`, g1.len <= 720 && g30.len <= 360, true);
  const drawnT = r.notables.filter((n) => n.drawn && (r.runs[n.run]?.galaxy ?? 0) <= 2).map((n) => n.t);
  const lastG2 = r.runs.find((x) => x.galaxy > 2)?.start ?? r.hours * 3600;
  const gd = longestGap(drawnT, 0, lastG2);
  add('Something new drawn on the map', 'once per 30 min, through galaxy index 2', `longest ${mmss(gd.len)} (to ${mmss(gd.end)})`, gd.len <= 1800, true);
  const after = r.notables.filter((n) => n.run > 0 && n.gap).map((n) => n.t);
  const ga = run1.end !== null ? longestGap(after, run1.end, r.hours * 3600) : null;
  add('Longest stretch with nothing new after the first Jump', '≤ 25 min', ga ? `${mmss(ga.len)} (to ${mmss(ga.end)})` : 'no Jump', !!ga && ga.len <= 1500, true);
  const lim = r.limits;
  const tot = lim.drill + lim.haul + lim.freighter || 1;
  const top = Math.max(lim.drill, lim.haul, lim.freighter) / tot;
  add('Route-minutes bound by one limit', 'no kind above 60 %', `drill ${((lim.drill / tot) * 100).toFixed(0)} %, haul ${((lim.haul / tot) * 100).toFixed(0)} %, freighter ${((lim.freighter / tot) * 100).toFixed(0)} %`, top <= 0.6, true);
  // Decision 40: the share of TAKEN contracts that are met (met / (met + lapsed)).
  const metOf = (x: HaulBotResult) => (x.contracts.met + x.contracts.lapsed ? x.contracts.met / (x.contracts.met + x.contracts.lapsed) : 0);
  const metShare = metOf(r);
  add('Taken contracts met (the bot that routes for them)', '60 to 85 %', `${(metShare * 100).toFixed(0)} % (${r.contracts.met} met, ${r.contracts.lapsed} lapsed)`, metShare >= 0.6 && metShare <= 0.85, false);
  if (passive) {
    const ps = metOf(passive);
    add('Taken contracts met without routing for them', '≤ 25 %', `${(ps * 100).toFixed(0)} % (${passive.contracts.met} met, ${passive.contracts.lapsed} lapsed, first ${passive.hours} h)`, ps <= 0.25, false);
  }
  // Decision 56, condition 6: what contracts are worth to a player who routes for them, as an outcome
  // (run earnings over the first hours against a player who never takes one), not as a share.
  if (compare) {
    const x = compare.never > 0 ? compare.router / compare.never : Infinity;
    add(`Earnings with contracts against never taking one, first ${compare.hours} h`, '1.3 to 1.7 times', `${x.toFixed(2)} (${compare.router.toPrecision(3)} against ${compare.never.toPrecision(3)})`, x >= 1.3 && x <= 1.7, false);
  }
  const bonusShare = r.contracts.earned ? r.contracts.bonus / r.contracts.earned : 0;
  add('Contract bonus as a share of income', '10 to 25 % (aim)', `${(bonusShare * 100).toFixed(1)} %`, bonusShare >= 0.1 && bonusShare <= 0.25, false);
  const fill = r.payouts.launches ? r.payouts.fillSum / r.payouts.launches : 0;
  add('Average launch fill', '70 to 95 %', `${(fill * 100).toFixed(0)} %`, fill >= 0.7 && fill <= 0.95, false);
  // Decision 42: an hour away WITH the Shift Log bonus against an hour of play (the bot that buys and
  // routes: at most 0.6) and against an hour of only watching (autopilot on full, nothing bought or
  // routed: at most 0.9), at every measurement.
  const playR = r.offline.map((o) => (o.playPerHour ? o.offlineBoosted / o.playPerHour : Infinity));
  const watchR = r.offline.map((o) => (o.watchPerHour ? o.offlineBoosted / o.watchPerHour : Infinity));
  const fx2 = (xs: number[]) => xs.map((x) => x.toFixed(2)).join(' / ') || 'not measured';
  add('Offline with the ad bonus vs an hour of play', '≤ 0.60', `${fx2(playR)} (no bonus: max ${Math.max(0, ...r.offline.map((o) => o.offlinePerHour / (o.playPerHour || 1))).toFixed(2)})`, playR.length > 0 && Math.max(...playR) <= 0.6, true);
  add('Offline with the ad bonus vs an hour of watching', '≤ 0.90', fx2(watchR), watchR.length > 0 && Math.max(...watchR) <= 0.9, true);
  // rules-3, Decision 45: pods and Dark Matter per hour in hours 1 to 3 (from 1:00 to 3:00 of bot time).
  const podsIn = (h: number) => Object.values(r.podsByHour[h] ?? {}).reduce((a, b) => a + b, 0);
  const pods = [1, 2].map(podsIn);
  const dmPer = (chestId: string) => {
    const c = cfg.meta.chests.find((x) => x.id === chestId);
    if (!c) return 0;
    const w = c.slotWeights.card + c.slotWeights.gems + c.slotWeights.cash;
    return w > 0 ? c.slots * (c.slotWeights.gems / w) * ((c.gems[0] + c.gems[1]) / 2) : 0;
  };
  const dm = [1, 2].map((h) => Object.entries(r.podsByHour[h] ?? {}).reduce((a, [why, n]) => a + n * dmPer(why === 'transmissions' || why === 'galaxy' ? cfg.haul.pods.derelict : cfg.haul.pods.scrap), 0));
  add('Pods per hour, hours 1 to 3', '3 to 10 each hour', `${pods.join(' / ')} (${[1, 2].map((h) => Object.entries(r.podsByHour[h] ?? {}).map(([k, n]) => `${k} ${n}`).join(', ')).join('; ')})`, pods.every((x) => x >= 3 && x <= 10), false);
  add('Dark Matter per hour from pods, hours 1 to 3', '2 to 8 each hour (expected)', dm.map((x) => x.toFixed(1)).join(' / '), dm.every((x) => x >= 2 && x <= 8), false);
  // play-18: the longest wait between two purchases in the first 5 minutes (from the first payout).
  const early = r.buys.filter((x) => x <= 300);
  const gap5 = longestGap(early, Math.min(r.marks.firstPayout ?? 0, 300), 300);
  add('Longest wait between purchases, first 5 min', '≤ 30 s (about)', `${mmss(gap5.len)} (to ${mmss(gap5.end)})`, gap5.len <= 35, false);
  const w30 = r.windows.find((w) => w.from === 1200);
  const dried = w30 ? w30.depleted * 6 : 0;
  add('Rocks dried per hour at minute 30', '8 to 20', `${dried}`, dried >= 8 && dried <= 20, false);
  return out;
}

export interface TutorialRow {
  t: number;
  what: string;
  numbers: string;
  /** The guided step this row carries out (1 to 6), when it is one. */
  step?: number;
  /** activeRate after the row (credits a second), for the rows that change it. */
  income?: number;
  /** Warp-outs so far, at the row. */
  warps?: number;
  /** A purchase named by Decision 57's hint. */
  advice?: boolean;
}

/**
 * A person who does only what the hints ask (section 3), each `reaction` seconds after the hint
 * shows, at 0.05 s ticks (errata table B). Point hints into a sheet are one action (the sheet open
 * and the button tap); the contract strip's hint picks the board's first contract. Stops at
 * `seconds`. Returns the rows of the first 2.12 table.
 */
export function runTutorialHuman(cfg: H.HaulConfig, opts: { reaction?: number; seconds?: number; seed?: number; now?: number } = {}): TutorialRow[] {
  const reaction = opts.reaction ?? 2.5;
  const DT = 0.05;
  const NOW = opts.now ?? Date.UTC(2026, 10, 22, 12);
  let g = freshBotGame(cfg, opts.seed ?? 12345, NOW);
  if ((g.haul.marks as { boughtAt?: number | null }).boughtAt === undefined) g = { ...g, haul: { ...g.haul, marks: { ...g.haul.marks, boughtAt: null, lastBuy: null } } } as Run;
  const rows: TutorialRow[] = [];
  const fmt = (x: number) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
  const p0 = H.haulParams(cfg, g);
  const s0 = p0.slots[0];
  rows.push({ t: 0, what: `Cash ${cfg.strings.currencySymbol}0. Slot 0 (ring 1, ${g.haul.slots[0].ore}): rig L1, r = ${fmt(s0.r)}/s, pile ${fmt(g.haul.slots[0].pile)}/${fmt(s0.cap)}. One drone idle on the rack. F = ${fmt(p0.F)}`, numbers: '' });
  let seen: { key: string; since: number } | null = null;
  let firstUnload = false;
  let fullNoted = false;
  let stripNoted = false;
  let launches = 0;
  let warps = 0;
  const steps = Math.round((opts.seconds ?? 240) / DT);
  for (let i = 0; i < steps; i++) {
    const t = i * DT;
    const hint = H.nextHint(cfg, g);
    const key = hint ? H.hintKey(hint) : '';
    if (!hint) seen = null;
    else if (!seen || seen.key !== key) seen = { key, since: t };
    if (hint && seen && t - seen.since >= reaction - 1e-9) {
      const ev: H.HaulEvent[] = [];
      let next: H.HaulGame = g;
      let what = '';
      let numbers = '';
      let bought: string | null = null;
      const rockOf = (k: string | undefined) => (k && k.startsWith('rock:') ? Number(k.slice(5)) : -1);
      if ((hint.kind === 'drag' || hint.kind === 'tapTap') && hint.from === 'drone:rack') {
        const slot = rockOf(hint.to);
        next = H.assignDrone(cfg, g, slot, ev);
        const sp = H.haulParams(cfg, next as Run).slots[slot];
        what = `${hint.kind === 'tapTap' ? 'Tap the drone, then' : 'Drag the drone onto'} rock T-${slot + 1}`;
        numbers = `trip = ${fmt(sp.trip)} s; c = ${fmt(sp.c)}; h = ${fmt(sp.h)}/s; first delivery at ${mmss(t + (next as Run).haul.slots[slot].routeFrom - (next as Run).haul.clock)}`;
      } else if (hint.kind === 'drag' && hint.from?.startsWith('chip:')) {
        const from = Number(hint.from.slice(5));
        const to = rockOf(hint.to);
        next = H.moveDrone(cfg, g, from, to, ev);
        what = `Move one drone from T-${from + 1}'s chip to T-${to + 1}`;
      } else if (hint.kind === 'swipe') {
        next = H.launch(cfg, g, ev);
        launches++;
        what = `Swipe up: launch ${launches}`;
        numbers = `cargo ${fmt(sumUnits((next as Run).haul.freighter.cargo))}, paid at the warp-out ${fmt((next as Run).haul.freighter.payout)}`;
      } else if (hint.key === 'station:buyDrone') {
        const cost = H.droneCost(cfg, g);
        next = H.buyDrone(cfg, g, ev);
        bought = 'drone';
        what = `Buy drone ${(next as Run).haul.fleet.drones} (${cfg.strings.currencySymbol}${fmt(cost)})`;
        numbers = `cash left ${fmt(next.cash)}`;
      } else if (hint.key.startsWith('slot:')) {
        const slot = Number(hint.key.slice(5));
        const cost = H.claimCost(cfg, g, slot);
        next = H.claimSlot(cfg, g, slot, ev);
        bought = `claim ${slot}`;
        what = `Claim slot ${slot}${H.ringOf(cfg, slot) > 0 ? ` (ring ${H.ringOf(cfg, slot) + 1})` : ''} (${cfg.strings.currencySymbol}${fmt(cost)})`;
      } else if (hint.key === 'station:capacity' || hint.key === 'station:engine' || hint.key === 'station:freighter') {
        const kind = hint.key.slice(8) as 'capacity' | 'engine' | 'freighter';
        const cost = kind === 'capacity' ? H.capacityCost(cfg, g) : kind === 'engine' ? H.engineCost(cfg, g) : H.freighterCost(cfg, g);
        next = kind === 'capacity' ? H.buyCapacity(cfg, g, ev) : kind === 'engine' ? H.buyEngine(cfg, g, ev) : H.buyFreighter(cfg, g, ev);
        bought = kind;
        what = `Upgrade ${kind === 'capacity' ? 'drone capacity' : kind === 'engine' ? 'the engines' : 'the freighter'} (${cfg.strings.currencySymbol}${fmt(cost)})`;
      } else if (hint.key === 'rig:upgrade') {
        const slot = rockOf(hint.route[0]) >= 0 ? rockOf(hint.route[0]) : 0;
        const cost = H.rigCost(cfg, g, slot);
        next = H.upgradeRig(cfg, g, slot, ev);
        bought = `rig ${slot}`;
        what = `Upgrade rig T-${slot + 1} to L${(next as Run).haul?.slots[slot].rigLevel ?? '?'} (${cfg.strings.currencySymbol}${fmt(cost)})`;
        numbers = `r = ${fmt(H.haulParams(cfg, next as Run).slots[slot].r)}/s`;
      } else if (hint.key === 'station:autopilot') {
        next = H.buyAutopilot(cfg, g, ev);
        bought = 'autopilot';
        what = `Dock Autopilot online (${cfg.strings.currencySymbol}${fmt(H.autopilotCost(cfg, g))})`;
        numbers = `cash ${fmt(g.cash)} before`;
      } else if (hint.key === 'bay:counter') {
        next = H.pickContract(cfg, g, 0);
        what = 'Pick contract 0 from the board';
      } else if (hint.key.startsWith('button:') || hint.key === 'bay:flare') {
        next = H.markHintShown(g, hint.key);
      }
      if (next !== g) {
        g = next as Run;
        // The marks of the last purchase (Decision 57), kept here as the rules keep them, so the path is
        // the same whether or not this build's rules write them.
        if (bought) g = { ...g, haul: { ...g.haul, marks: { ...g.haul.marks, boughtAt: g.haul.clock, lastBuy: bought } } } as Run;
        // A limited hint counts once each time it shows (the hint layer marks it).
        if (hint.limit) g = H.markHintShown(g, hint.key) as Run;
        if (what) rows.push({ t, what, numbers, step: hint.step > 0 ? hint.step : undefined, advice: hint.step === 0 && !!hint.limit && hint.key !== 'bay:counter' && hint.key !== 'bay:flare' ? true : undefined, income: H.haulIncome(cfg, g), warps });
        seen = null;
      }
    }
    const ev: H.HaulEvent[] = [];
    const before = g;
    g = H.advanceHaul(cfg, g, DT, NOW + t * 1000, ev) as Run;
    for (const e of ev) {
      if (e.type === 'unload' && !firstUnload) {
        firstUnload = true;
        rows.push({ t, what: 'First unload into the hold', numbers: `${fmt(e.units)} units` });
      } else if (e.type === 'warp') {
        warps++;
        rows.push({ t, what: `Warp-out${e.met ? ', contract met' : ''}`, numbers: `${cfg.strings.currencySymbol}${fmt(e.payout)}`, warps });
      }
      else if (e.type === 'contractsUnlocked' && !stripNoted) {
        stripNoted = true;
        const c = g.haul.contracts.board[0];
        rows.push({ t, what: 'The contract strip slides in', numbers: c ? `${cfg.haul.contracts.buyers.find((b) => b.id === c.buyer)?.name ?? c.buyer} · ${c.wants.map((w) => `${w.units} ${w.ore}`).join(' + ')} · x${c.mult}` : '' });
      } else if (e.type === 'holdFull' && !fullNoted) {
        fullNoted = true;
        rows.push({ t, what: `Hold ${fmt(H.holdTotal(g.haul))}/${fmt(H.haulParams(cfg, g).F)}, chevrons pulse`, numbers: '' });
      } else if (e.type === 'tutorialDone') rows.push({ t, what: 'Guided steps done', numbers: '' });
    }
    void before;
  }
  return rows;
}

/** The two worked tables of spec 2.12 (Decision 16) as Markdown, from the tutorial human and a bot run. */
export function workedTables(cfg: H.HaulConfig, r: HaulBotResult, human: TutorialRow[]): string {
  const sym = cfg.strings.currencySymbol;
  const out: string[] = [];
  out.push('**The tutorial path (a person who does only what the hints ask, reacting in 2.5 s; 0.05 s ticks; after the guided steps the limit hints of Decision 57):**', '', '| Time | What happens | Numbers |', '|---|---|---|');
  for (const row of human) out.push(`| ${mmss(Math.round(row.t * 10) / 10)} | ${row.what}${row.advice ? ' (limit hint, Decision 57)' : ''} | ${row.numbers} |`);
  out.push('', `**The bot (section 8's bot, seed 12345, 1 s ticks; income is activeRate):**`, '', '| Time | Event | Income |', '|---|---|---|');
  const m = r.marks;
  const run1 = r.runs[0];
  const inc = (min: number) => (r.income[min] !== undefined ? `about ${sym}${r.income[min] >= 100 ? r.income[min].toPrecision(3) : r.income[min].toFixed(1)}/s` : '');
  const rows: [number, string, string][] = [];
  const ev = (k: string, label: string) => m[k] !== undefined && rows.push([m[k], label, '']);
  ev('firstPayout', 'first payout');
  ev('contractsUnlocked', 'contracts unlock');
  ev('autopilot', 'Dock Autopilot online');
  ev('claim1', 'slot 1 claimed');
  ev('ring2', 'first ring-2 slot (copper)');
  ev('pod ring2', 'the guaranteed Scrap Pod (first ring-2 claim)');
  ev('firstSeam', 'first rich seam');
  ev('firstBonanza', 'first bonanza rock');
  ev('firstFlare', 'first Survey Flare');
  ev('ring3', 'first ring-3 slot (ice)');
  ev('ring4', 'first ring-4 slot (titanium)');
  ev('ring5', 'first ring-5 slot (platinum)');
  ev('jumpReady', `first Jump available (${cfg.haul.jumpReadyCores} cores)`);
  for (const min of [1, 2, 4, 6, 8, 10, 15, 20, 30, 45, 60, 90, 120]) if (r.income[min] !== undefined && (run1.end === null || min * 60 <= run1.end)) rows.push([min * 60, '', inc(min)]);
  rows.sort((a, b) => a[0] - b[0]);
  for (const [t, e, i] of rows) out.push(`| ${mmss(t)} | ${e} | ${i} |`);
  if (run1.end !== null) {
    out.push(`| ${mmss(run1.end)} | Jump 1: +${run1.coresGained} cores; run 1 earned ${sym}${run1.earnings.toPrecision(3)} | |`);
    const run2 = r.runs[1];
    if (run2?.reachedPrevAt !== null && run2?.reachedPrevAt !== undefined) out.push(`| ${mmss(run2.start + run2.reachedPrevAt)} | run 2 (${run2.trait}) passes run 1's earnings, ${mmss(run2.reachedPrevAt)} into the run (${((run2.reachedPrevAt / (run1.end - run1.start)) * 100).toFixed(0)} % of run 1) | |`);
  }
  return out.join('\n');
}
