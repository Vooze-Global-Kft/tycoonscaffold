/**
 * The balance bot of a haul game (docs/design/space-design.md section 8): plays the pure rules
 * (src/engine/haul.ts) at 1 s ticks like a good player and counts every gesture it would make on a
 * phone, then measures section 8's targets. Used by `npm run simulate -- <haul game>` (scripts/
 * simulate.ts), by `build-space.py --table` and calibration runs (through `--json`), and by validate's
 * pacing hook. It imports only the engine, so its states can seed the preview's presets.
 *
 * How it plays (section 8, "Bot behaviour"):
 * - every idle drone goes at once to the slot with the highest marginal value (`bestSlotForDrone`);
 * - 2 drones are dragged onto each rich seam (natural or flare) and 1 onto each bonanza rock;
 * - with contracts open and none active, it picks the board contract with the highest
 *   `contractGain` it can meet within 3 launches and moves up to 2 drones to routes of its ore;
 * - it swipes the freighter off the pad when the hold is full or the contract is met until the Dock
 *   Autopilot is online, then sets the `contract` policy;
 * - it fires the free flare charge at the best rock;
 * - it buys the option with the best payback (Δ activeRate / cost; a claim is valued with one new
 *   drone on it), and from 2:00 saves for the autopilot;
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
import * as H from '../../src/engine/haul';

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
  /** One hour away against one hour of play from the same state: with purchases (the gate), without, and activeRate × 3600. */
  offline: { at: number; offlinePerHour: number; activeRatePerHour: number; playPerHour: number; noBuyPerHour: number }[];
  states: Record<number, Run>;
  /** activeRate at every whole minute of bot time (index = minute). */
  income: number[];
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
  const offline: HaulBotResult['offline'] = [];
  const states: Record<number, Run> = {};
  const income: number[] = [];
  const keepAt = new Set(opts.keepAt ?? []);
  const runs: RunSummary[] = [{ index: 0, galaxy: g.haul.galaxy, trait: g.haul.trait, start: 0, end: null, earnings: 0, coresGained: 0, buys: [], reachedPrevAt: null }];

  let t = 0;
  let win: Window10 = { from: 0, gestures: zero(), earned: 0, depleted: 0 };
  const count = (k: GestureKind, n = 1) => {
    gestures[k] += n;
    win.gestures[k] += n;
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
          mark('firstPayout', t);
          payouts.total += 1;
          if (e.met) payouts.met += 1;
          win.earned += e.payout;
          break;
        }
        case 'launch': {
          payouts.launches += 1;
          payouts.fillSum += sumUnits(e.cargo) / Math.max(1, params().F);
          break;
        }
        case 'contractsUnlocked':
          mark('contractsUnlocked', t);
          note('contracts unlocked', true, false);
          break;
        case 'podEarned':
          mark(`pod ${e.reason}`, t);
          note(`pod (${e.reason})`, true, false);
          break;
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
      const best = H.bestSlotForDrone(cfg, g);
      if (best === null) break;
      const ev: H.HaulEvent[] = [];
      if (!act(H.assignDrone(cfg, g, best, ev), ev)) break;
      count('drag');
    }
  };

  /** The route whose drone is worth least where it is (a drone loses the least there), never `except`. */
  const cheapestSource = (except: number[]): number | null => {
    const p = params();
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

  /** Pick a contract it can meet within 3 launches (highest gain), then move up to 2 drones to its ore. */
  const handleContracts = () => {
    const h = g.haul;
    if (!h.contracts.unlocked || h.contracts.active !== null) return;
    const p = params();
    let pick = -1;
    let pickGain = 0;
    h.contracts.board.forEach((c, i) => {
      const gain = H.contractGain(cfg, p, h, i);
      if (!(gain > pickGain)) return;
      const missing = H.contractMissing(h, i);
      // Met means one hold carries the wanted units: the hold fills in proportion to the routes'
      // rates, so the ore's share of the haul (after moving up to 2 drones to it) must cover them.
      const room = Math.max(0, p.F - H.holdTotal(h));
      let total = 0;
      h.slots.forEach((s, k) => {
        if (s.claimed && s.respawnAt === null) total += Math.min(p.slots[k].r, p.slots[k].h);
      });
      let spare = 2;
      const ok = missing.every((m) => {
        if (m.units <= 0) return true;
        let rate = 0;
        let extra = 0;
        h.slots.forEach((s, k) => {
          if (!s.claimed || s.respawnAt !== null || s.ore !== m.ore) return;
          const sp = p.slots[k];
          rate += Math.min(sp.r, sp.h);
          extra = Math.max(extra, Math.min(sp.r, sp.h + (spare * sp.c) / sp.trip) - Math.min(sp.r, sp.h));
        });
        if (rate <= 0 && extra <= 0) return false;
        if (extra > 0) spare = Math.max(0, spare - 1);
        return total > 0 && room * Math.min(1, (rate + extra) / total) >= m.units - 1e-9;
      });
      if (ok) {
        pick = i;
        pickGain = gain;
      }
    });
    if (pick < 0) return;
    sheet('contracts');
    if (!act(H.pickContract(cfg, g, pick), [])) return;
    count('contract');
    // Up to 2 drones to the wanted ore's best route when its drones (not its drill) limit it.
    const want = g.haul.contracts.board[pick]?.wants ?? [];
    const wanted = want.map((w) => w.ore);
    let moves = 2;
    for (const w of want) {
      if (moves <= 0) break;
      const p2 = params();
      let to: number | null = null;
      let gap = 0;
      g.haul.slots.forEach((s, k) => {
        if (!s.claimed || s.respawnAt !== null || s.ore !== w.ore) return;
        const sp = p2.slots[k];
        if (sp.r - sp.h > gap) {
          gap = sp.r - sp.h;
          to = k;
        }
      });
      if (to === null) continue;
      const avoid = g.haul.slots.map((s, k) => (s.claimed && wanted.includes(s.ore) ? k : -1)).filter((k) => k >= 0);
      moves -= moveTo(to, Math.min(moves, Math.max(1, Math.ceil(gap / (p2.slots[to as number].c / p2.slots[to as number].trip)))), avoid);
    }
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
    const c = H.activeContract(h);
    const met = c ? c.wants.every((w) => (h.hold[w.ore] ?? 0) >= w.units - H.EPS) : false;
    if (!full && !met) return;
    const ev: H.HaulEvent[] = [];
    if (act(H.launch(cfg, g, ev), ev)) count('swipe');
  };

  type Option = { key: string; sheet: string; cost: number; apply: (x: Run) => Run; extraDrone?: boolean };
  const withDrones = (x: Run): Run => {
    let s = x;
    for (let j = 0; j < 8 && s.haul.idle > 0; j++) {
      const b = H.bestSlotForDrone(cfg, s);
      if (b === null) break;
      s = H.assignDrone(cfg, s, b) as Run;
    }
    return s;
  };

  /** Best-payback shopping; true when something was bought. */
  const shop = (): boolean => {
    let bought = false;
    for (let k = 0; k < 24; k++) {
      const before = H.haulIncome(cfg, g);
      const h = g.haul;
      const options: Option[] = [
        { key: 'drone', sheet: 'station', cost: H.droneCost(cfg, g), apply: (x) => H.buyDrone(cfg, x) as Run },
        { key: 'capacity', sheet: 'station', cost: H.capacityCost(cfg, g), apply: (x) => H.buyCapacity(cfg, x) as Run },
        { key: 'engine', sheet: 'station', cost: H.engineCost(cfg, g), apply: (x) => H.buyEngine(cfg, x) as Run },
        { key: 'freighter', sheet: 'station', cost: H.freighterCost(cfg, g), apply: (x) => H.buyFreighter(cfg, x) as Run },
      ];
      h.slots.forEach((sl, i) => {
        if (sl.claimed) options.push({ key: `rig ${i}`, sheet: `rig ${i}`, cost: H.rigCost(cfg, g, i), apply: (x) => H.upgradeRig(cfg, x, i) as Run });
        else {
          const cc = H.claimCost(cfg, g, i);
          if (!(cc < Infinity)) return;
          // A claim is valued with one new drone on it (and priced with that drone when one can be bought).
          const dc = H.droneCost(cfg, g);
          const withDrone = dc < Infinity && h.idle === 0;
          // At the drone cap the new route gets a drone moved from the route that loses least.
          const src = !withDrone && h.idle === 0 ? cheapestSource([i]) : null;
          options.push({
            key: `claim ${i}`,
            sheet: `ghost ${i}`,
            cost: cc,
            extraDrone: withDrone,
            apply: (x) => {
              let s = H.claimSlot(cfg, x, i) as Run;
              if (s === x) return x;
              if (withDrone) s = H.buyDrone(cfg, { ...s, cash: s.cash + dc } as Run) as Run;
              if (s.haul.idle > 0) s = H.assignDrone(cfg, s, i) as Run;
              else if (src !== null && s.haul.slots[src].haulers >= 2) s = H.moveDrone(cfg, s, src, i) as Run;
              return s;
            },
          });
        }
      });
      let pick: Option | null = null;
      let bestScore = -1;
      for (const o of options) {
        if (!(o.cost < Infinity)) continue;
        const price = o.cost + (o.extraDrone ? H.droneCost(cfg, g) : 0);
        const next = withDrones(o.apply({ ...g, cash: o.cost + 1e-6 } as Run));
        if (next.haul === g.haul) continue;
        const gain = H.haulIncome(cfg, next) - before;
        const score = (gain > 0 ? gain : 1e-12) / price;
        if (score > bestScore) {
          bestScore = score;
          pick = o;
        }
      }
      if (!pick || !H.affordable(g.cash, pick.cost)) break;
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
    if (g.haul.autopilot.policy !== 'contract') {
      sheet('station');
      if (act(H.setPolicy(cfg, g, 'contract'), [])) count('tap');
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

  // ----------------------------------------------------------- the loop
  for (t = 0; t < horizon; t++) {
    if (t > 0 && t % 600 === 0) {
      windows.push(win);
      win = { from: t, gestures: zero(), earned: 0, depleted: 0 };
    }
    if (keepAt.has(t)) states[t] = g;
    if (t % 60 === 0) income.push(H.haulIncome(cfg, g));
    const now = NOW + t * 1000;

    placeIdle();
    serveSeamsAndBonanzas();
    handleContracts();
    useFreeFlare();
    manualLaunch();
    const wasOnline = g.haul.autopilot.online;
    if (!g.haul.autopilot.online && g.haul.clock >= 120) {
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
      const still = runHaulBot(cfg, { hours: 1, prestige: false, noShop: true, noOffline: true, start: g, now });
      offline.push({
        at: t,
        offlinePerHour: off.earnings,
        activeRatePerHour: H.haulIncome(cfg, g) * 3600,
        playPerHour: played.end.lifetimeEarnings - g.lifetimeEarnings,
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
  return { hours: opts.hours, marks, notables, windows, runs, gestures, limits, payouts, offline, states, income, end: g };
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

/** Longest stretch between notables in [from, to) (both ends count as boundaries). */
function longestGap(times: number[], from: number, to: number): { len: number; end: number } {
  const ts = [from, ...times.filter((x) => x > from && x < to), to].sort((a, b) => a - b);
  let gap = { len: 0, end: from };
  for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] > gap.len) gap = { len: ts[i] - ts[i - 1], end: ts[i] };
  return gap;
}

export function evaluate(cfg: H.HaulConfig, r: HaulBotResult): Target[] {
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
  add('First Jump available (cores ≥ 20)', '2 h 15 to 2 h 45', mmss(m.jumpReady), within(m.jumpReady, 8100, 9900), true);
  const run2 = r.runs[1];
  const run1Time = run1.end ? run1.end - run1.start : null;
  const r2 = run2?.reachedPrevAt ?? null;
  add('Run 2 reaches run 1’s Jump earnings', '≤ 60 % of run 1', run1Time && r2 !== null ? `${((r2 / run1Time) * 100).toFixed(0)} % (${mmss(r2)} of ${mmss(run1Time)})` : 'not reached', !!run1Time && r2 !== null && r2 <= 0.6 * run1Time, true);
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
  const metShare = r.payouts.total ? r.payouts.met / r.payouts.total : 0;
  add('Payouts with a met contract', '40 to 70 %', `${(metShare * 100).toFixed(0)} %`, metShare >= 0.4 && metShare <= 0.7, false);
  const fill = r.payouts.launches ? r.payouts.fillSum / r.payouts.launches : 0;
  add('Average launch fill', '70 to 95 %', `${(fill * 100).toFixed(0)} %`, fill >= 0.7 && fill <= 0.95, false);
  const offRatios = r.offline.map((o) => (o.playPerHour ? o.offlinePerHour / o.playPerHour : 0));
  const offMax = offRatios.length ? Math.max(...offRatios) : 0;
  const still = r.offline.map((o) => (o.noBuyPerHour ? o.offlinePerHour / o.noBuyPerHour : 0));
  add('Offline credits per hour vs active play', '≤ 0.45', `${offRatios.map((x) => x.toFixed(2)).join(' / ') || 'not measured'} (no purchases: max ${(still.length ? Math.max(...still) : 0).toFixed(2)}; vs activeRate: max ${Math.max(0, ...r.offline.map((o) => o.offlinePerHour / (o.activeRatePerHour || 1))).toFixed(2)})`, offRatios.length > 0 && offMax <= 0.45, true);
  const w30 = r.windows.find((w) => w.from === 1200);
  const dried = w30 ? w30.depleted * 6 : 0;
  add('Rocks dried per hour at minute 30', '8 to 20', `${dried}`, dried >= 8 && dried <= 20, false);
  return out;
}

// ----------------------------------------------------------- the simulate command's haul branch

/**
 * `npm run simulate -- <haul game> [--hours 12] [--prestige] [--seed n] [--quiet] [--trace 300] [--json] [--states dir]`.
 * Prints the timeline of notable things, the gesture counts per 10 minutes, the runs, and every
 * section 8 target with its value. `--json` prints one line for scripts (validate, build-space.py).
 * Exit code 0 (the gate is validate's).
 */
export function simulateHaulCli(cfg: H.HaulConfig, flags: Record<string, string>): void {
  const hours = Number(flags.hours ?? 12);
  const prestige = flags.prestige === 'true';
  const seed = flags.seed ? Number(flags.seed) : 12345;
  const traceEvery = Number(flags.trace ?? 0);
  const lines: string[] = [];
  const keepAt = flags.states ? [0, 180, 25 * 60, 140 * 60] : [];
  const r = runHaulBot(cfg, { hours, prestige, seed, traceEvery, keepAt, trace: traceEvery ? (t, l) => lines.push(`${mmss(t).padStart(9)}  · ${l}`) : undefined });
  const targets = evaluate(cfg, r);
  if (flags.table === 'true') {
    console.log(workedTables(cfg, r, runTutorialHuman(cfg, { seed })));
    return;
  }
  if (flags.states) {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    fs.mkdirSync(flags.states, { recursive: true });
    const names: Record<number, string> = { 0: 'fresh', 180: 'early', 1500: 'mid', 8400: 'late' };
    for (const [t, s] of Object.entries(r.states)) fs.writeFileSync(path.join(flags.states, `${names[Number(t)] ?? t}.json`), JSON.stringify(s));
    // The late preset: the first Jump's state just before it is taken, if the run got there.
  }
  if (flags.json === 'true') {
    // validate's pacing check (scripts/validate.ts, written for the classic bot) reads `marks`: its
    // "first automation hire" is this game's Dock Autopilot, so the mark is offered under that name too.
    const marks: Record<string, number> = { ...r.marks };
    if (r.marks.autopilot !== undefined) marks['hire dock autopilot'] = r.marks.autopilot;
    console.log(
      JSON.stringify({
        marks,
        hardMissed: targets.filter((x) => x.hard && !x.ok).map((x) => `${x.name}: ${x.value} (target ${x.target})`),
        targets,
        runs: r.runs,
        gestures: r.gestures,
        windows: r.windows.map((w) => ({ from: w.from, ...w.gestures, earned: w.earned, depleted: w.depleted })),
        limits: r.limits,
        payouts: r.payouts,
        offline: r.offline,
        notables: r.notables.filter((n) => n.gap || n.drawn).map((n) => [n.t, n.run, n.what, n.gap ? 1 : 0, n.drawn ? 1 : 0]),
      }),
    );
    return;
  }
  const quiet = flags.quiet === 'true';
  console.log(`\n${cfg.store.title} [haul] — ${hours} h simulated, seed ${seed}${prestige ? ', Jumps' : ''}\n`);
  if (!quiet) {
    const timeline = r.notables.filter((n) => n.gap && !n.what.startsWith('rig ')).map((n) => `${mmss(n.t).padStart(9)}  ${n.what}`);
    console.log([...timeline, ...lines].sort().join('\n'));
    console.log('\n   window   drags swipes upgrades picks sheets flares taps  upgrade share  earned');
    for (const w of r.windows) {
      const all = GESTURE_KINDS.reduce((a, k) => a + w.gestures[k], 0);
      const gg = w.gestures;
      console.log(
        `${mmss(w.from).padStart(9)}  ${String(gg.drag).padStart(5)} ${String(gg.swipe).padStart(6)} ${String(gg.upgrade).padStart(8)} ${String(gg.contract).padStart(5)} ${String(gg.sheet).padStart(6)} ${String(gg.flare).padStart(6)} ${String(gg.tap).padStart(4)}  ${(all ? (gg.upgrade / all) * 100 : 0).toFixed(0).padStart(12)} %  ${w.earned.toPrecision(3)}`,
      );
    }
  }
  console.log('\nRuns:');
  for (const run of r.runs)
    console.log(
      `  run ${run.index + 1}: galaxy ${run.galaxy + 1}${run.trait ? ` (${run.trait})` : ''}, from ${mmss(run.start)} to ${run.end === null ? 'the end' : mmss(run.end)}, earned ${run.earnings.toPrecision(3)}${run.coresGained ? `, +${run.coresGained} cores` : ''}${run.buys.length ? `, bought ${run.buys.join(' ')}` : ''}${run.reachedPrevAt !== null ? `, passed the previous run's Jump earnings at ${mmss(run.reachedPrevAt)}` : ''}`,
    );
  console.log('\nSection 8 targets:');
  for (const x of targets) console.log(`  ${x.ok ? '✔' : x.hard ? '✖' : '·'} ${x.name.padEnd(54)} ${x.target.padEnd(34)} ${x.value}${x.hard ? '' : '   (soft)'}`);
  const hardMissed = targets.filter((x) => x.hard && !x.ok).length;
  console.log(`\n${hardMissed ? `✖ ${hardMissed} hard target(s) missed` : '✔ every hard target met'}`);
}

// ----------------------------------------------------------- the tutorial human (spec 2.12, first table)

export interface TutorialRow {
  t: number;
  what: string;
  numbers: string;
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
        what = `Buy drone ${(next as Run).haul.fleet.drones} (${cfg.strings.currencySymbol}${fmt(cost)})`;
        numbers = `cash left ${fmt(next.cash)}`;
      } else if (hint.key === 'slot:1') {
        const cost = H.claimCost(cfg, g, 1);
        next = H.claimSlot(cfg, g, 1, ev);
        what = `Claim slot 1 (${cfg.strings.currencySymbol}${fmt(cost)})`;
      } else if (hint.key === 'station:autopilot') {
        next = H.buyAutopilot(cfg, g, ev);
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
        if (what) rows.push({ t, what, numbers });
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
      } else if (e.type === 'warp') rows.push({ t, what: `Warp-out${e.met ? ', contract met' : ''}`, numbers: `${cfg.strings.currencySymbol}${fmt(e.payout)}` });
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
  out.push('**The tutorial path (a person who does only what the hints ask, reacting in 2.5 s; 0.05 s ticks):**', '', '| Time | What happens | Numbers |', '|---|---|---|');
  for (const row of human) out.push(`| ${mmss(Math.round(row.t * 10) / 10)} | ${row.what} | ${row.numbers} |`);
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
