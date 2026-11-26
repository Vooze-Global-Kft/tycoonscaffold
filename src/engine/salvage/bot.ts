/**
 * People-like bots on the real rules (yard-stage1.md 8.2, S24, E18, E24). A bot plays through the SAME
 * actions as the screen: presence samples (positions on the content map, standing and moving as a thumb
 * would) and the cards' buy, hire, level, signDeal, skipGoal, stepOut, ackAway. Nothing here changes the
 * state but those actions and the tick. Pure and deterministic: the hesitation draws come from
 * `hash01(seed, ...)`; device time advances with the ticks it plays. Owner: content.
 *
 * Hands (the fourth numbers pass's PROFILES, proto/yard4.py): a reaction before every leg (react + hes ×
 * an exponential draw × 0.5), path waste (walking at walk / detour), time at each card (card seconds).
 * The bot walks a path graph built from the content map (solid footprints and the container wall with its
 * gaps), drives the lane at the boss's truck speed, and follows the goal card (nextGoal) and, after the
 * fixed goals, the advice line (advice).
 *
 * Habits (E18): 'goal' buys the goal card's purchase the moment cash less the reserve covers it; 'all'
 * buys everything affordable at once (goal order, then the cheapest level). The card manager plays the
 * normal hand to the second hire, then only presses cards (the boss stands at the office). The day-word
 * holder holds a bay on a low day and releases it on the next day that is not.
 */
import { hash01 } from './board';
import { dealTerms } from './cards';
import { carrierCap_g, cutTime, pieceSpec, pieceValue, tierOf, toolP, vpk } from './content';
import { advice, reserve } from './advice';
import { buyCheck, hireCheck, levelCheck } from './ladder';
import { nextGoal } from './goals';
import { ackAway, buy, declineDeal, hire, level, noteSeen, setHold, setPresence, signDeal, skipGoal, stepOut } from './actions';
import { dayWordCfg } from './board';
import { advanceSalvage, jump } from './tick';
import { createSalvage } from './create';
import { ratedCapacity } from './rate';
import { lanePath, piecePos, pointOf, skipZone, thingPos } from './positions';
import type { CardAction, CrewRole, LevelTarget, Piece, SalvageConfig, SalvageEvent, SalvageGame, ShopKey, ThingState } from './types';

// ============================================================================================ hands

export type HandKind = 'brisk' | 'normal' | 'slow';
export type Habit = 'goal' | 'all';
export interface HandProfile {
  /** Seconds before every leg. */
  react: number;
  /** Seconds at each card before its button is pressed. */
  card: number;
  /** Mean extra hesitation (exponential, × 0.5). */
  hes: number;
  /** Path waste: walking takes this × the shortest path. */
  detour: number;
}
export const HANDS: Record<HandKind, HandProfile> = {
  brisk: { react: 0.5, card: 1.5, hes: 0.5, detour: 1.0 },
  normal: { react: 1.5, card: 3.0, hes: 1.5, detour: 1.1 },
  slow: { react: 3.0, card: 6.0, hes: 3.5, detour: 1.25 },
};

export interface BotOptions {
  hand: HandKind;
  habit: Habit;
  /** The opening (S10): A the drop-off's washer first, B the cable bundle first. */
  route: 'A' | 'B';
  seed: number;
  /** The card manager: the normal hand to the second hire, then cards only. */
  manager?: boolean;
  /** The day-word holder: Hold on a low day, release on the next day that is not. */
  holder?: boolean;
  /** Optional goals: taken (sign the deal) or put aside with Not now. Default: the slow hand puts them aside. */
  optional?: 'take' | 'skip';
  /** Measurements only: the boss works only this place (a zone id, `dropoff` or `floor`), buys nothing, never drives. */
  onlyZone?: string;
  /**
   * Measurements only (a what-if for the rules desk, REPORT6): after the fixed goals, when the cut pieces on
   * the tipping floor and loose about the yard outweigh two hand loads, buy a yard hand's level (or the
   * second yard hand) instead of what the advice line names.
   */
  handFirst?: boolean;
  /** Keep a log of every leg (debugging, the report's minute table). */
  trace?: boolean;
  /** Tick while walking (the screen's 0.1 s) and the sample spacing while standing (at most staleS / 2). */
  dt?: number;
  standDt?: number;
}

// ============================================================================================ the record

export interface Purchase {
  t: number;
  key: string;
  price: number;
  kind: 'buy' | 'hire' | 'level';
  goal: boolean;
  /** Cash after it was paid. */
  cashAfter: number;
  /** Cash when the boss set out for the card (P20: held at the card), and the seconds from that decision to the press (react, walk, read). */
  cashAtCard?: number;
  walkToBuy_s?: number;
}
export interface BotRecord {
  /** Yard seconds of each first (beats); absent when it never happened. */
  first: Record<string, number>;
  purchases: Purchase[];
  /** Minute marks: lifetime earnings, loads bought, cash, supplied grams, rank. */
  minutes: { t: number; earned: number; loads: number; cash: number; supplied_g: number; rank: number; reserve: number }[];
  rungs: Record<number, number>;
  passed: number[];
  /** Purchase goals made current, by minute. */
  prompts: number[];
  /** Hard-promise violations (8.3), each with its yard second. */
  broken: { t: number; what: string }[];
  /** Refusals pressed (shown not applied, or a card that refused). */
  refused: { t: number; key: string; what: string }[];
  loads: number;
  loadSpend: number;
  hooks: { t: number; by: string; partner: string; price: number }[];
  legs: number;
  reactS: number;
  walkM: number;
  hold: { gain: number; held: number };
  away: { t: number; seconds: number; earned: number; supplied_g: number }[];
  log: string[];
  /** Items a card showed locked by the capacity ceiling, first time each. */
  ceiling: { t: number; key: string }[];
  /** Today's value of the boss's own weigh-ins (the cycle measure). */
  bossWeighed: number;
  /** The boss's own weigh-ins, each (yard second, today's value): P20's "what a minute of work pays". */
  bossIns: { t: number; v: number }[];
  /** Every walk on foot (yard second at its start, metres walked, seconds): P20's longest walk. */
  walks: { t: number; m: number; s: number }[];
}

function emptyRecord(): BotRecord {
  return { first: {}, purchases: [], minutes: [], rungs: {}, passed: [], prompts: [], broken: [], refused: [], loads: 0, loadSpend: 0, hooks: [], legs: 0, reactS: 0, walkM: 0, hold: { gain: 0, held: 0 }, away: [], log: [], bossWeighed: 0, ceiling: [], bossIns: [], walks: [] };
}

export interface Bot {
  cfg: SalvageConfig;
  g: SalvageGame;
  /** Device time, epoch ms. */
  now: number;
  opts: Required<Omit<BotOptions, 'manager' | 'holder' | 'optional' | 'trace' | 'onlyZone' | 'handFirst'>> & Pick<BotOptions, 'manager' | 'holder' | 'optional' | 'trace' | 'onlyZone' | 'handFirst'>;
  P: HandProfile;
  k: number;
  standing: number;
  rec: BotRecord;
  graph: Graph;
  managing: boolean;
  /** Events of the transitions not yet observed. */
  ev: SalvageEvent[];
  lastGoal: string | null;
  lastMinute: number;
  heldDay: number | null;
  /** Zones the boss has seen on screen or been sent to by the goal card (a person works what he knows of). */
  known: Set<string>;
}

export function newBot(cfg: SalvageConfig, g: SalvageGame, now: number, opts: BotOptions): Bot {
  const o = { dt: 0.1, standDt: Math.min(0.3, cfg.salvage.feel.staleS / 2), ...opts };
  return { cfg, g, now, opts: o, P: HANDS[o.hand], k: 0, standing: 0, rec: emptyRecord(), graph: graphOf(cfg), managing: false, ev: [], lastGoal: null, lastMinute: -1, heldDay: null, known: new Set() };
}

// ============================================================================================ the path graph

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface Graph {
  rects: Rect[];
  nodes: { x: number; y: number }[];
  /** Node-to-node visibility (distance or Infinity). */
  adj: number[][];
  w: number;
  d: number;
}

const BODY = 0.45;
/** The back wall's half depth (src/ui/salvage/world/yard.ts WALL_HALF_D; the world's limit for walkers). */
const NORTH_HALF_D = 0.4;
const graphs = new WeakMap<object, Graph>();

function inflate(x: number, y: number, w: number, d: number, m: number): Rect {
  return { x0: x - w / 2 - m, y0: y - d / 2 - m, x1: x + w / 2 + m, y1: y + d / 2 + m };
}

function inside(r: Rect, p: { x: number; y: number }): boolean {
  return p.x > r.x0 + 1e-6 && p.x < r.x1 - 1e-6 && p.y > r.y0 + 1e-6 && p.y < r.y1 - 1e-6;
}

/** Does the segment a-b pass through the open rectangle r (Liang-Barsky)? */
function crosses(r: Rect, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const e = 1e-6;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - (r.x0 + e), r.x1 - e - a.x, a.y - (r.y0 + e), r.y1 - e - a.y];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-12) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t1 - t0 > 1e-9;
}

/** The solid rectangles of the content map, inflated by the body: solid places and the container wall. */
export function graphOf(cfg: SalvageConfig): Graph {
  const hit = graphs.get(cfg.salvage);
  if (hit) return hit;
  const c = cfg.salvage;
  const rects: Rect[] = [];
  for (const [id, pl] of Object.entries(c.map.places)) {
    if (!pl.solid) continue;
    const p = c.map.points[id];
    if (!p) continue;
    rects.push(inflate(p[0], p[1], pl.w, pl.d, BODY));
  }
  for (const w of c.map.walls) rects.push(inflate(w.x, w.y, w.w, w.d, BODY));
  const W = c.yard.width;
  const D = c.yard.depth;
  // MAP.md M1: the back wall at map.north is one solid across the whole width (its south face 0.4 m south
  // of the line, as the world's yard.ts has it); nobody walks north of it.
  const north = (c.map as { north?: number }).north;
  if (typeof north === 'number' && north > 0) rects.push({ x0: -40, y0: -40, x1: W + 40, y1: north + NORTH_HALF_D + BODY });
  // The parked truck: walking within truck.enter of it gets the boss in (hand.ts bossStep), so a person
  // on foot keeps clear of the truck's parking place unless he means to drive (truckLeg walks INTO it).
  const park = c.map.points.park;
  if (park) {
    const m = c.truck.enter + 0.3;
    rects.push({ x0: park[0] - m, y0: park[1] - m, x1: park[0] + m, y1: park[1] + m });
  }
  const nodes: { x: number; y: number }[] = [];
  for (const r of rects) {
    for (const [x, y] of [
      [r.x0 - 0.05, r.y0 - 0.05],
      [r.x1 + 0.05, r.y0 - 0.05],
      [r.x0 - 0.05, r.y1 + 0.05],
      [r.x1 + 0.05, r.y1 + 0.05],
    ]) {
      const q = { x, y };
      if (x < 0.3 || y < 0.3 || x > W - 0.3 || y > D - 0.3) continue;
      if (rects.some((o) => inside(o, q))) continue;
      nodes.push(q);
    }
  }
  for (const [gx, gy] of c.map.gaps) {
    nodes.push({ x: gx - 2, y: gy });
    nodes.push({ x: gx + 2, y: gy });
  }
  const adj = nodes.map((a, i) => nodes.map((b, j) => (i === j ? 0 : rects.some((r) => crosses(r, a, b)) ? Infinity : Math.hypot(a.x - b.x, a.y - b.y))));
  const gr: Graph = { rects, nodes, adj, w: W, d: D };
  graphs.set(cfg.salvage, gr);
  return gr;
}

function free(gr: Graph, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  for (const r of gr.rects) {
    if (inside(r, a) || inside(r, b)) continue; // a body standing at a solid's edge leaves it
    if (crosses(r, a, b)) return false;
  }
  return true;
}

/** The shortest walk from a to b round the solids: the waypoints after a, ending at b. */
export function pathOf(gr: Graph, a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number }[] {
  if (free(gr, a, b)) return [b];
  const n = gr.nodes.length;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const done = new Array(n).fill(false);
  for (let i = 0; i < n; i++) if (free(gr, a, gr.nodes[i])) dist[i] = Math.hypot(a.x - gr.nodes[i].x, a.y - gr.nodes[i].y);
  let best = Infinity;
  let bestI = -1;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] >= best) break;
    done[u] = true;
    const nu = gr.nodes[u];
    if (free(gr, nu, b)) {
      const tot = dist[u] + Math.hypot(nu.x - b.x, nu.y - b.y);
      if (tot < best) {
        best = tot;
        bestI = u;
      }
    }
    for (let v = 0; v < n; v++) {
      const w = gr.adj[u][v];
      if (w < Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    }
  }
  if (bestI < 0) return [b];
  const out: { x: number; y: number }[] = [b];
  for (let i = bestI; i >= 0; i = prev[i]) out.unshift(gr.nodes[i]);
  return out;
}

export function pathLen(a: { x: number; y: number }, pts: { x: number; y: number }[]): number {
  let L = 0;
  let p = a;
  for (const q of pts) {
    L += Math.hypot(q.x - p.x, q.y - p.y);
    p = q;
  }
  return L;
}

// ============================================================================================ the thumb

const pos = (b: Bot) => ({ x: b.g.salvage.presence.x, y: b.g.salvage.presence.y });
const driving = (b: Bot) => b.g.salvage.truck.by === 'boss';
const headingOf = (dx: number, dy: number) => ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;

function sample(b: Bot, x: number, y: number, moving: boolean, heading = b.g.salvage.presence.heading ?? 0): void {
  b.g = setPresence(b.cfg, b.g, { x, y, moving, driving: driving(b), standingFor: moving ? 0 : b.standing, heading: heading as never }, b.g.salvage.t, b.ev);
}

function step(b: Bot, dt: number): void {
  b.now += dt * 1000;
  b.g = advanceSalvage(b.cfg, b.g, dt, b.now, b.ev);
  observe(b);
}

/** Walk (or drive) along waypoints at `speed`, a sample before every tick. */
function travel(b: Bot, pts: { x: number; y: number }[], speed: number): void {
  for (const q of pts) {
    let lastD = Infinity;
    let stuck = 0;
    for (let guard = 0; guard < 200_000; guard++) {
      const p = pos(b);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      // A thumb that pushes and gets nowhere (the rules clamp the sample: a point outside the yard) lets go.
      if (d > lastD - 1e-3) {
        if (++stuck > 20) break;
      } else stuck = 0;
      lastD = Math.min(lastD, d);
      const stepM = speed * b.opts.dt;
      b.standing = 0;
      if (d <= stepM) {
        sample(b, q.x, q.y, true, headingOf(q.x - p.x, q.y - p.y));
        step(b, (d / speed) || 0.001);
        break;
      }
      sample(b, p.x + ((q.x - p.x) * stepM) / d, p.y + ((q.y - p.y) * stepM) / d, true, headingOf(q.x - p.x, q.y - p.y));
      step(b, b.opts.dt);
    }
  }
  const p = pos(b);
  sample(b, p.x, p.y, false);
}

/** Walk on foot to a point round the solids, with the hand's path waste. */
function walk(b: Bot, to: { x: number; y: number }): void {
  if (driving(b)) return;
  const pts = pathOf(b.graph, pos(b), to);
  const m = pathLen(pos(b), pts) * b.P.detour;
  b.rec.walkM += m;
  const t0 = b.g.salvage.t;
  travel(b, pts, b.cfg.salvage.walk / b.P.detour);
  if (m > 0.5) b.rec.walks.push({ t: t0, m, s: b.g.salvage.t - t0 });
}

/** Stand still for `seconds` (samples at most every standDt). */
function stand(b: Bot, seconds: number): void {
  let left = seconds;
  while (left > 1e-9) {
    const dt = Math.min(b.opts.standDt, left);
    const p = pos(b);
    sample(b, p.x, p.y, false);
    step(b, dt);
    b.standing += dt;
    left -= dt;
  }
}

/** Stand until a condition holds (or `max` seconds); true when it held. */
function standUntil(b: Bot, cond: () => boolean, max: number): boolean {
  let t = 0;
  while (t < max) {
    if (cond()) return true;
    const p = pos(b);
    sample(b, p.x, p.y, false);
    step(b, b.opts.standDt);
    b.standing += b.opts.standDt;
    t += b.opts.standDt;
  }
  return cond();
}

/** A person's reaction before a leg: react + hes × an exponential draw × 0.5 (yard4.py reaction()). */
function react(b: Bot, what = ''): void {
  b.k += 1;
  if (b.opts.trace) b.rec.log.push(`${b.g.salvage.t.toFixed(1)} ${what} cash ${b.g.cash.toFixed(0)} load ${(loadG(b) / 1000).toFixed(1)}`);
  const u = hash01(b.opts.seed, b.opts.hand.length * 7 + 3, b.k);
  const r = b.P.react + b.P.hes * -Math.log(1 - 0.999 * u) * 0.5;
  b.rec.reactS += r;
  b.rec.legs += 1;
  stand(b, r);
}

// ============================================================================================ watching

const loadG = (b: Bot) => b.g.salvage.load.reduce((a, p) => a + p.g, 0);
const capG = (b: Bot) => carrierCap_g(b.cfg.salvage, b.g.salvage);

function mark(b: Bot, key: string, t = b.g.salvage.t): void {
  if (b.rec.first[key] === undefined) b.rec.first[key] = t;
}

/** Read the events of the transitions just made: beats, loads, hard promises. */
function observe(b: Bot): void {
  const s = b.g.salvage;
  const t = s.t;
  for (const e of b.ev) {
    switch (e.type) {
      case 'collected':
        if (e.ticket.kind === 'collection') {
          mark(b, 'ticket', t);
          if (e.ticket.lines.some((l) => l.grade === 'bb' || l.grade === 'no2')) mark(b, 'copper', t);
        }
        break;
      case 'weighIn':
        if (e.by === 'boss' && e.ticket.kind === 'weighIn') {
          b.rec.bossWeighed += e.ticket.todaysValue;
          b.rec.bossIns.push({ t, v: e.ticket.todaysValue });
        }
        if (e.ticket.kind === 'weighIn') mark(b, 'weighIn', t);
        break;
      case 'owned':
        mark(b, 'purchase', t);
        mark(b, `owned:${e.item}`, t);
        break;
      case 'crewLeg': {
        const m = s.crew.find((q) => q.id === e.id);
        if (m?.role === 'hand' && e.job !== 'idle') mark(b, 'helperCarrying', e.t0);
        break;
      }
      case 'hook':
        mark(b, 'drive', t);
        b.rec.loads += 1;
        b.rec.loadSpend += e.price;
        b.rec.hooks.push({ t, by: e.by, partner: e.partner, price: e.price });
        break;
      case 'pour':
        mark(b, 'pour', t);
        break;
      case 'rung':
        b.rec.rungs[e.n] ??= t;
        mark(b, `rung${e.n}`, t);
        break;
      case 'passed':
        b.rec.passed.push(t);
        break;
      case 'goal':
        break;
      default:
        break;
    }
  }
  b.ev.length = 0;
  // The storyboard's beats read from the state (1.2): 2 the washer taken apart, 4 the hand stripper turning.
  if (b.rec.first.washerDone === undefined && (s.counts?.['cut:washer'] ?? 0) >= 1) mark(b, 'washerDone', t);
  if (b.rec.first.stripping === undefined && s.act.kind === 'strip') mark(b, 'stripping', t);
  if (b.rec.first.pass1 === undefined && (s.ladder.passed ?? 0) >= 1) mark(b, 'pass1', t);
  // Hard promises read from the state (8.3): no negative cash or stock, supplied never falls.
  if (b.g.cash < -1e-9) b.rec.broken.push({ t, what: `cash ${b.g.cash}` });
  const m = Math.floor(t / 60);
  if (m !== b.lastMinute) {
    b.lastMinute = m;
    const prev = b.rec.minutes[b.rec.minutes.length - 1];
    if (prev && s.ladder.supplied_g < prev.supplied_g) b.rec.broken.push({ t, what: 'supplied fell' });
    b.rec.minutes.push({ t, earned: b.g.lifetimeEarnings, loads: b.rec.loadSpend, cash: b.g.cash, supplied_g: s.ladder.supplied_g, rank: rankOf(b), reserve: reserve(b.cfg, b.g) });
    for (const [gr, bay] of Object.entries(s.bays)) if (bay.g < 0 || bay.n < 0) b.rec.broken.push({ t, what: `bay ${gr} negative` });
  }
  const goal = nextGoal(b.cfg, b.g);
  const id = goal?.id ?? null;
  if (id !== b.lastGoal) {
    b.lastGoal = id;
    if (goal?.buy) {
      const mi = Math.floor(t / 60);
      b.rec.prompts[mi] = (b.rec.prompts[mi] ?? 0) + 1;
    }
  }
}

function rankOf(b: Bot): number {
  const c = b.cfg.salvage;
  const passed = b.g.salvage.ladder.passed ?? 0;
  return c.rivals.list.length + 1 - passed;
}

// ============================================================================================ the cards (the same actions as the screen)

/** Press a card's button as the screen does (modes/salvage/actions.ts press): the action with its shown price. */
export function press(b: Bot, a: CardAction, goal: boolean): boolean {
  const before = b.g;
  const cash0 = b.g.cash;
  const ev: SalvageEvent[] = [];
  const clock = b.g.salvage.t;
  switch (a.act) {
    case 'buy':
      b.g = buy(b.cfg, b.g, a.item, a.price, clock, ev);
      break;
    case 'hire':
      b.g = hire(b.cfg, b.g, a.role, a.price, clock, ev);
      break;
    case 'level':
      b.g = level(b.cfg, b.g, a.target, a.price, clock, ev);
      break;
    case 'signDeal':
      b.g = signDeal(b.cfg, b.g, a.terms, b.now, clock, ev);
      break;
    case 'declineDeal':
      b.g = declineDeal(b.cfg, b.g, clock, ev);
      break;
    case 'skipGoal':
      b.g = skipGoal(b.cfg, b.g, a.id, clock, ev);
      break;
    case 'ackAway':
      b.g = ackAway(b.cfg, b.g);
      break;
    case 'setHold':
      b.g = setHold(b.cfg, b.g, a.grade, a.on, clock, ev);
      break;
    default:
      return false;
  }
  const refused = ev.find((e) => e.type === 'refused');
  b.ev.push(...ev);
  if (refused && refused.type === 'refused') {
    b.rec.refused.push({ t: clock, key: refused.key, what: JSON.stringify(a) });
    if (refused.key === 'priceUpdated') b.rec.broken.push({ t: clock, what: `shown price not applied: ${JSON.stringify(a)}` });
    observe(b);
    return false;
  }
  if (a.act === 'buy' || a.act === 'hire' || a.act === 'level') {
    // Shown equals applied: cash fell by exactly the price shown.
    if (Math.abs(cash0 - b.g.cash - a.price) > 0.005) b.rec.broken.push({ t: clock, what: `paid ${cash0 - b.g.cash} for shown ${a.price}` });
    const key = a.act === 'buy' ? a.item : a.act === 'hire' ? `hire:${a.role}` : `lev:${targetKey(a.target)}`;
    b.rec.purchases.push({ t: clock, key: a.act === 'hire' ? hireKey(b, before, a.role) : key, price: a.price, kind: a.act, goal, cashAfter: b.g.cash });
  }
  observe(b);
  return before !== b.g;
}

/** A card the bot wanted was locked by the capacity ceiling (8.4: at most once in the hour): counted once per item. */
function ceilingSeen(b: Bot, key: string): void {
  if (!b.rec.ceiling.some((q) => q.key === key)) b.rec.ceiling.push({ t: b.g.salvage.t, key });
}

function targetKey(t: LevelTarget): string {
  return t.kind === 'crew' ? t.id : t.kind === 'machine' ? t.machine : t.partner;
}

function hireKey(b: Bot, g: SalvageGame, role: CrewRole): string {
  const keys = b.cfg.salvage.shop.concat(b.cfg.salvage.dayOneList).filter((i) => i.kind === 'crew' && roleOfKey(i.key) === role).map((i) => i.key);
  const n = g.salvage.crew.filter((m) => m.role === role).length;
  return keys[n] ?? `hire:${role}`;
}

function roleOfKey(key: string): CrewRole {
  return key.startsWith('hand') ? 'hand' : key.startsWith('cutter') ? 'cutter' : 'driver';
}

const CREW: Record<string, CrewRole> = {};
function crewRole(b: Bot, key: string): CrewRole | null {
  const it = b.cfg.salvage.shop.concat(b.cfg.salvage.dayOneList).find((i) => i.key === key);
  if (!it || it.kind !== 'crew') return null;
  return CREW[key] ?? roleOfKey(key);
}

/** The card action that buys a shop key now, with its price, or null when it is refused. */
function actionFor(b: Bot, key: ShopKey): CardAction | null {
  const role = crewRole(b, key);
  if (role) {
    const ch = hireCheck(b.cfg, b.g, role);
    if (ch.refusal?.key === 'ceiling') ceilingSeen(b, key);
    return ch.refusal || ch.price === null ? null : { act: 'hire', role, price: ch.price };
  }
  const ch = buyCheck(b.cfg, b.g, key);
  if (ch.refusal?.key === 'ceiling') ceilingSeen(b, key);
  return ch.refusal || ch.price === null ? null : { act: 'buy', item: key, price: ch.price };
}

/** Every level target the player could buy now, with its price (refused ones left out). */
function levels(b: Bot): { action: CardAction & { act: 'level' }; price: number }[] {
  const out: { action: CardAction & { act: 'level' }; price: number }[] = [];
  const s = b.g.salvage;
  const targets: LevelTarget[] = [
    ...s.crew.map((m) => ({ kind: 'crew', id: m.id }) as LevelTarget),
    ...(['stripper', 'bench', 'crucible'] as const).filter((m) => s.machines[m]?.owned).map((m) => ({ kind: 'machine', machine: m }) as LevelTarget),
    ...Object.entries(s.partners)
      .filter(([, p]) => p.open)
      .map(([id]) => ({ kind: 'partner', partner: id }) as LevelTarget),
  ];
  for (const t of targets) {
    const ch = levelCheck(b.cfg, b.g, t);
    if (ch.refusal?.key === 'ceiling') ceilingSeen(b, `lev:${targetKey(t)}`);
    if (!ch.refusal && ch.price !== null) out.push({ action: { act: 'level', target: t, price: ch.price }, price: ch.price });
  }
  return out.sort((a, b2) => a.price - b2.price);
}

/** Where the card of an action opens (the place the boss walks to). */
function cardPlace(b: Bot, a: CardAction): string {
  if (a.act === 'buy') return b.cfg.salvage.shop.concat(b.cfg.salvage.dayOneList).find((i) => i.key === a.item)?.place ?? 'office';
  return 'office';
}

/** Walk to the card's place (unless managing from cards), read the card, press. */
function purchase(b: Bot, a: CardAction, goal: boolean): boolean {
  const t0 = b.g.salvage.t;
  const cash0 = b.g.cash;
  if (!b.managing) {
    react(b, `buy ${JSON.stringify(a)}`);
    walk(b, placeSpot(b, cardPlace(b, a)));
  }
  b.g = noteSeen(b.cfg, b.g, { card: a.act === 'buy' ? 'rack' : 'rota' }, b.g.salvage.t);
  stand(b, b.P.card);
  // The card re-reads its price at the moment of the press (cardOf every 500 ms).
  const fresh = a.act === 'level' ? levels(b).find((l) => JSON.stringify(l.action.target) === JSON.stringify(a.target))?.action ?? null : a.act === 'buy' ? actionFor(b, a.item) : a.act === 'hire' ? (() => {
    const ch = hireCheck(b.cfg, b.g, a.role);
    return ch.refusal || ch.price === null ? null : ({ act: 'hire', role: a.role, price: ch.price } as CardAction);
  })() : a;
  if (!fresh) return false;
  if ('price' in fresh && b.g.cash - reserveFor(b) < (fresh as { price: number }).price - 1e-9) return false;
  const n = b.rec.purchases.length;
  const ok = press(b, fresh, goal);
  if (ok && b.rec.purchases.length > n) {
    const p = b.rec.purchases[n];
    p.cashAtCard = cash0;
    p.walkToBuy_s = p.t - t0;
  }
  return ok;
}

/** The reserve a person keeps (E19, E29): the price of a load full within reserveS, once a driver fetches. */
function reserveFor(b: Bot): number {
  return reserve(b.cfg, b.g);
}

// ============================================================================================ places and spots

/** Where the boss stands to use a place: its point, or beside a solid footprint on the side nearest him. */
function placeSpot(b: Bot, place: string): { x: number; y: number } {
  const c = b.cfg.salvage;
  const p = pointOf(c, place);
  const pl = c.map.places[place];
  if (!pl || !pl.solid) return p;
  const m = Math.min(c.reach.place - 0.2, BODY + 0.4);
  const here = pos(b);
  // join2's door (content map.places.<id>.door): a place with a door is opened from that side only.
  const door = (pl as { door?: 'n' | 's' | 'e' | 'w' }).door;
  const sides = { s: { x: p.x, y: p.y + pl.d / 2 + m }, n: { x: p.x, y: p.y - pl.d / 2 - m }, w: { x: p.x - pl.w / 2 - m, y: p.y }, e: { x: p.x + pl.w / 2 + m, y: p.y } };
  const cands = (door ? [sides[door]] : [sides.s, sides.n, sides.w, sides.e]).filter((q) => q.x > 0.5 && q.y > 0.5 && q.x < c.yard.width - 0.5 && q.y < c.yard.depth - 0.5 && !b.graph.rects.some((r) => inside(r, q) && !(Math.abs(r.x0 + BODY - (p.x - pl.w / 2)) < 1e-6 && Math.abs(r.y0 + BODY - (p.y - pl.d / 2)) < 1e-6)));
  cands.sort((a, q) => pathLen(here, pathOf(b.graph, here, a)) - pathLen(here, pathOf(b.graph, here, q)));
  return cands[0] ?? p;
}

/** Is a point on the platform scale's ground (machines.ts atPlace with reach.place, padded 0.15 m)? */
function onScale(b: Bot, q: { x: number; y: number }): boolean {
  const c = b.cfg.salvage;
  const pt = c.map.points.scale;
  if (!pt) return false;
  const pl = c.map.places.scale;
  const dx = Math.max(0, Math.abs(q.x - pt[0]) - (pl?.w ?? 0) / 2);
  const dy = Math.max(0, Math.abs(q.y - pt[1]) - (pl?.d ?? 0) / 2);
  return Math.hypot(dx, dy) <= c.reach.place + 0.15;
}

/** A thing's distance from a point, from its footprint's edge (positions.thingNear's measure). */
function edgeDist(b: Bot, th: ThingState, x: number, y: number): number {
  const c = b.cfg.salvage;
  const p = thingPos(c, th.at);
  const o = c.objects[th.obj];
  return Math.hypot(Math.max(0, Math.abs(x - p.x) - (o?.size.w ?? 1) / 2), Math.max(0, Math.abs(y - p.y) - (o?.size.d ?? 1) / 2));
}

/**
 * Where the boss stands to work a thing: beside its footprint, within reach, on a side where it is the
 * nearest thing (a person steps up to the washer, not to the radiator beside it), the shortest walk first.
 */
function thingSpot(b: Bot, th: ThingState): { x: number; y: number } {
  const c = b.cfg.salvage;
  const p = thingPos(c, th.at);
  const o = c.objects[th.obj];
  const here = pos(b);
  const others = b.g.salvage.things.filter((q) => q.uid !== th.uid && Math.hypot(thingPos(c, q.at).x - p.x, thingPos(c, q.at).y - p.y) < 4);
  let best: { x: number; y: number } | null = null;
  let bestL = Infinity;
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    for (const r of [0.35, 0.8]) {
      const q = { x: p.x + Math.cos(a) * ((o?.size.w ?? 1) / 2 + r), y: p.y + Math.sin(a) * ((o?.size.d ?? 1) / 2 + r) };
      if (q.x < 0.4 || q.y < 0.4 || q.x > c.yard.width - 0.4 || q.y > c.yard.depth - 0.4) continue;
      const mine = edgeDist(b, th, q.x, q.y);
      // A loose (tier 0) thing is lifted within reach.pickup; a workable one is worked within reach.work.
      if (mine > ((o?.tier ?? 0) === 0 ? c.reach.pickup : c.reach.work) - 0.1) continue;
      // Not on the platform scale's ground: there the rules only weigh (hand.ts bossStep), so a person
      // steps past it (the cable bundle stands 1.9 m from the scale since the map moved, MAP.md M5).
      if (onScale(b, q)) continue;
      if (others.some((t) => edgeDist(b, t, q.x, q.y) <= mine + 1e-6)) continue;
      const L = Math.hypot(q.x - here.x, q.y - here.y);
      if (L < bestL) {
        bestL = L;
        best = q;
      }
    }
  }
  if (best) return best;
  const dx = here.x - p.x;
  const dy = here.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const r = Math.min(Math.max(o?.size.w ?? 1, o?.size.d ?? 1) / 2 + 0.4, c.reach.work + 0.2);
  return { x: p.x + (dx / d) * r, y: p.y + (dy / d) * r };
}

// ============================================================================================ sources

interface Source {
  score: number;
  kind: 'cut' | 'lift';
  spot: { x: number; y: number };
  thing?: ThingState;
  obj?: string;
  pile?: string;
  value: number;
  g: number;
}

const zoneOf = (th: ThingState) => (th.at.at === 'zone' ? th.at.zone : th.at.at);

/**
 * What a person knows of (MAP.md M7's first view; 40 points a metre, tilt 0.7 at 844 x 390: 21.1 m by
 * 13.9 m of ground, the boss at 61 % of the height): a zone is known once part of its bed has been on
 * screen (within VIEW_X east or west, VIEW_N north or VIEW_S south of where he stood), or once the goal
 * card names a thing that lies in it. The bots no longer walk to stock a person has never seen.
 */
const VIEW_X = 10.5;
const VIEW_N = 8.5;
const VIEW_S = 5.4;
function look(b: Bot, goalObj: string | null): void {
  const c = b.cfg.salvage;
  const here = pos(b);
  for (const [id, z] of Object.entries(c.zones)) {
    if (b.known.has(id)) continue;
    const bed = (z as { bed?: { x0: number; y0: number; w: number; d: number } }).bed;
    const r = bed ? { x0: bed.x0, y0: bed.y0, x1: bed.x0 + bed.w, y1: bed.y0 + bed.d } : { x0: z.centre[0] - z.r, y0: z.centre[1] - z.r, x1: z.centre[0] + z.r, y1: z.centre[1] + z.r };
    const seen = r.x1 >= here.x - VIEW_X && r.x0 <= here.x + VIEW_X && r.y1 >= here.y - VIEW_N && r.y0 <= here.y + VIEW_S;
    const sent = goalObj !== null && b.g.salvage.things.some((th) => th.obj === goalObj && th.at.at === 'zone' && th.at.zone === id);
    if (seen || sent) b.known.add(id);
  }
}

/** Every source the boss could work now (yard4.py source_options on the real state), best §/s first. */
function sources(b: Bot, prefer: string | null): Source[] {
  const c = b.cfg.salvage;
  const s = b.g.salvage;
  const room = capG(b) - loadG(b);
  if (room < 500) return [];
  const v = c.walk / b.P.detour;
  const here = pos(b);
  const scale = pointOf(c, 'scale');
  const P = toolP(c, s.tier);
  const best = new Map<string, Source>();
  const cutterHas = new Set(s.crew.map((m) => m.cut?.thing).filter(Boolean) as string[]);
  for (const th of s.things) {
    if (th.by && th.by !== 'boss') continue;
    if (cutterHas.has(th.uid)) continue;
    if (b.opts.onlyZone && zoneOf(th) !== b.opts.onlyZone) continue;
    if (th.at.at === 'zone' && !b.known.has(th.at.zone) && !b.opts.onlyZone) continue;
    const o = c.objects[th.obj];
    // Finding W9: the tier of the NEXT piece (the car's wheels and loom by hand, its converter with the
    // torch); a stripped shell is nobody's work.
    if (!o || th.shell || tierOf(c, th) > s.tier) continue;
    // Nothing a person can reach: a thing laid outside the yard (the tipping floor's slots run on past its
    // footprint when it holds many small things; REPORT6) is not a source.
    {
      const tp0 = thingPos(c, th.at);
      if (tp0.x < 0.3 || tp0.y < 0.3 || tp0.x > c.yard.width - 0.3 || tp0.y > c.yard.depth - 0.3) continue;
    }
    const n = th.cut + 64;
    let g = 0;
    let val = 0;
    let work = 0;
    for (let k = th.cut; k < n; k++) {
      const sp = pieceSpec(c, th.obj, k);
      if (!sp) break;
      if (c.grades[sp.grade] === undefined) continue;
      if ((o.pieceTiers?.[sp.spec] ?? o.tier) > s.tier) break;
      if (g + sp.g > room) break;
      g += sp.g;
      val += pieceValue(c, sp);
      work += o.tier === 0 ? c.pick_s : cutTime(c, th.obj, sp.g, P);
    }
    if (g <= 0) continue;
    work = Math.max(0, work - (o.tier === 0 ? 0 : th.progress));
    let extra = 0;
    const cable = o.pieces.some((q) => q[0] === 'cab');
    if (cable && !s.machines.stripper.owned) extra = g / 1000 / Math.max(1e-6, c.machines.hand_stripper.rate) + 15 / v;
    const tp = thingPos(c, th.at);
    const T = Math.hypot(tp.x - here.x, tp.y - here.y) * 1.15 / v + work + Math.hypot(tp.x - scale.x, tp.y - scale.y) * 1.15 / v + extra + 2 * b.P.react;
    let score = val / T;
    if (prefer && th.obj === prefer) score *= 4;
    const key = `${zoneOf(th)}`;
    const cur = best.get(key);
    // Within a place the boss takes the thing of best value per cutting second (nearest on ties).
    const rate = val / Math.max(0.5, work);
    const curRate = cur ? cur.value / Math.max(0.5, cur.g) : -1;
    void curRate;
    if (!cur || score > cur.score || (prefer && th.obj === prefer && cur.obj !== prefer)) best.set(key, { score, kind: 'cut', spot: { x: tp.x, y: tp.y }, thing: th, obj: th.obj, value: val, g });
    void rate;
  }
  // Loose pieces on the ground (not in a chalk circle, not claimed).
  const piles = new Map<string, Piece[]>();
  for (const q of s.pieces) {
    if (q.claim || q.pile.startsWith('circle.') || q.pile.startsWith('tray.')) continue;
    (piles.get(q.pile) ?? piles.set(q.pile, []).get(q.pile)!).push(q);
  }
  const at = (uid: string) => s.things.find((t) => t.uid === uid)?.at ?? null;
  for (const [pile, ps] of piles) {
    const sorted = [...ps].sort((a, q) => vpk(c, q.grade) - vpk(c, a.grade));
    let g = 0;
    let val = 0;
    let n = 0;
    for (const q of sorted) {
      if (g + q.g > room) continue;
      g += q.g;
      val += pieceValue(c, q);
      n++;
    }
    if (g <= 0) continue;
    if (pile.startsWith('zone.') && !b.known.has(pile.slice(5)) && !b.opts.onlyZone) continue;
    if (b.opts.onlyZone && !(pile === `zone.${b.opts.onlyZone}` || pile === b.opts.onlyZone || pile.startsWith(`beside.${b.opts.onlyZone}.`))) continue;
    const first = sorted[0] as Piece & { k: number };
    const pp = piecePos(c, pile, first.k, at);
    if (pp.x < 0.3 || pp.y < 0.3 || pp.x > c.yard.width - 0.3 || pp.y > c.yard.depth - 0.3) continue;
    const T = Math.hypot(pp.x - here.x, pp.y - here.y) * 1.15 / v + n * c.pick_s + Math.hypot(pp.x - scale.x, pp.y - scale.y) * 1.15 / v + 2 * b.P.react;
    best.set(`pile:${pile}`, { score: val / T, kind: 'lift', spot: pp, pile, value: val, g });
  }
  return [...best.values()].sort((a, q) => q.score - a.score);
}

// ============================================================================================ legs

/** Work a thing: walk beside it and stand while the rules cut (and pick up), until nothing more happens. */
function cutLeg(b: Bot, src: Source): void {
  react(b, `cut ${src.thing?.uid}`);
  const th = src.thing!;
  walk(b, thingSpot(b, th));
  let idle = 0;
  const max = 240;
  let t = 0;
  while (t < max) {
    const a = b.g.salvage.act;
    if (a.kind === 'none') idle += b.opts.standDt;
    else idle = 0;
    if (idle > b.cfg.salvage.feel.workDelay + 0.6) break;
    // He works this kind of thing until the load is full (yard4.py's cut leg); another kind is a new decision.
    if (a.kind === 'work' && a.target) {
      const on = b.g.salvage.things.find((q) => q.uid === a.target);
      if (on && on.obj !== th.obj) break;
    }
    stand(b, b.opts.standDt);
    t += b.opts.standDt;
  }
}

/** Lift loose pieces: walk to the pile, stand while the pickups run. */
function liftLeg(b: Bot, src: Source): void {
  react(b, `lift ${src.pile ?? src.thing?.uid}`);
  walk(b, src.spot);
  let idle = 0;
  for (let t = 0; t < 60; t += b.opts.standDt) {
    if (b.g.salvage.act.kind === 'none') idle += b.opts.standDt;
    else idle = 0;
    if (idle > b.cfg.salvage.feel.workDelay + 0.6) break;
    stand(b, b.opts.standDt);
  }
}

function weighLeg(b: Bot): void {
  react(b, 'weigh');
  walk(b, placeSpot(b, 'scale'));
  standUntil(b, () => b.g.salvage.load.length === 0, 10);
}

/** Cable to the stripper pad: the hand stripper turns while he stands there (R1); the powered one is fed. */
function stripLeg(b: Bot): void {
  react(b, 'strip');
  walk(b, placeSpot(b, 'stripper'));
  const s0 = () => b.g.salvage;
  const powered = s0().machines.stripper.owned;
  standUntil(
    b,
    () => {
      const s = s0();
      const cab = s.load.some((p) => p.grade === 'cab');
      if (powered) return !cab || s.act.kind === 'none';
      const hs = s.machines.hand_stripper;
      const tray = Object.values(hs.tray_g).reduce((a, x) => a + x, 0);
      return !cab && hs.hopper.length === 0 && !hs.work && (tray <= 0 || capG(b) - loadG(b) < 100);
    },
    600,
  );
  stand(b, b.opts.standDt);
}

function feedLeg(b: Bot, place: string, grade: string): void {
  react(b, `feed ${place}`);
  walk(b, placeSpot(b, place));
  standUntil(b, () => !b.g.salvage.load.some((p) => p.grade === grade) || (b.g.salvage.act.kind === 'none' && b.standing > 1), 60);
}

function pourLeg(b: Bot): void {
  react(b, 'pour');
  walk(b, placeSpot(b, 'crucible'));
  standUntil(b, () => b.g.salvage.machines.crucible.firstPoured, 90);
}

function hookable(b: Bot, partner: string): { slot: number; price: number } | null {
  const s = b.g.salvage;
  const ps = s.partners[partner];
  if (!ps?.open || s.truck.skip || s.truck.trip || s.truck.by === 'driver') return null;
  const sk = ps.skips.filter((q) => q.phase === 'full').sort((a, q) => a.fullAt - q.fullAt || a.slot - q.slot)[0];
  if (!sk) return null;
  const held = s.truck.earmark?.money ?? 0;
  if (sk.price > b.g.cash - held + 1e-9) return null;
  let floor = 0;
  for (const th of s.things) if (th.at.at === 'floor') floor += (b.cfg.salvage.objects[th.obj]?.gross_g ?? 0) - piecesOff(b, th);
  for (const q of s.pieces) if (q.pile === 'floor' || q.pile.startsWith('beside.f')) floor += q.g;
  if (floor + sk.mass_g > b.cfg.salvage.floorRoom_kg * 1000) return null;
  return { slot: sk.slot, price: sk.price };
}

function piecesOff(b: Bot, th: ThingState): number {
  let g = 0;
  for (let k = 0; k < th.cut; k++) g += pieceSpec(b.cfg.salvage, th.obj, k)?.g ?? 0;
  return g;
}

/** A drive out (the boss with no driver): into the truck, the lane, hook, the weighbridge, tip, park, step out. */
function truckLeg(b: Bot, partner: string, slot: number): void {
  const c = b.cfg.salvage;
  react(b, `drive ${partner}`);
  const tr = b.g.salvage.truck;
  walk(b, { x: tr.x, y: tr.y });
  if (!driving(b)) stand(b, b.opts.standDt);
  if (!driving(b)) return;
  // P10: the boss drives at truck.bossV (the driver's truck.v is the hired driver's); R7 clamps faster samples.
  const v = c.truck.bossV ?? c.truck.v;
  const path = lanePath(c, pos(b), partner, slot).slice(1);
  travel(b, path, v);
  standUntil(b, () => !!b.g.salvage.truck.skip || (b.g.salvage.act.target ?? '').startsWith('refused'), c.truck.handle_s + 8);
  const gate = pointOf(c, 'gate');
  const z = skipZone(c, partner, slot);
  // MAP.md M4: inside the yard the truck keeps to the drive line: its stops (content map.driveLine.stops),
  // else the old points.
  const stops = (c.map as { driveLine?: { stops?: Record<string, [number, number]> } }).driveLine?.stops ?? {};
  const st = (id: string, dflt: string) => (stops[id] ? { x: stops[id][0], y: stops[id][1] } : pointOf(c, dflt));
  const wb = st('weighbridge', 'weighbridge');
  const floor = st('floor', 'floor');
  const park = st('park', 'park');
  const turn = stops.turn ? { x: stops.turn[0], y: stops.turn[1] } : null;
  travel(b, [{ x: z.x, y: gate.y }, { x: gate.x + 2, y: gate.y }, { x: gate.x - 2, y: gate.y }], v);
  if (b.g.salvage.truck.skip) {
    travel(b, [wb], v);
    standUntil(b, () => !!b.g.salvage.truck.skip?.weighed, 10);
    travel(b, turn ? [{ x: floor.x, y: wb.y }, floor] : [floor], v);
    standUntil(b, () => !b.g.salvage.truck.skip, c.truck.handle_s + 8);
  }
  const here = pos(b);
  travel(b, turn ? [{ x: here.x, y: turn.y }, turn, park] : [park], v);
  leaveTruck(b);
}

/** Step out (the button) and walk off: the world sets him down beside the truck (frameLoop: truckR + workerR + 0.25 m). */
function leaveTruck(b: Bot): void {
  const c = b.cfg.salvage;
  stand(b, b.opts.standDt);
  const p = pos(b);
  b.g = stepOut(b.cfg, b.g, { x: p.x, y: p.y, heading: (b.g.salvage.truck.heading ?? 0) as never }, b.g.salvage.t, b.ev);
  const off = c.truck.radius + BODY + 0.25;
  // West of the truck, or east when west is outside the yard.
  const out = p.x - off - 1 > 0.5 ? { x: p.x - off - 1, y: p.y } : { x: p.x + off + 1, y: p.y };
  sample(b, out.x, out.y, true, 4);
  step(b, b.opts.dt);
}

// ============================================================================================ deciding

function goalDef(b: Bot, id: string | null) {
  if (!id) return null;
  return b.cfg.salvage.goals.find((d) => d.id === id) ?? b.cfg.salvage.dayOne.find((d) => d.id === id) ?? null;
}

/** One decision and its leg (yard4.py decide on the real state). */
export function decide(b: Bot): void {
  const c = b.cfg.salvage;
  const s = b.g.salvage;
  const o = b.opts;
  // The card manager takes over after the second hire.
  if (o.manager && s.crew.length >= 2) b.managing = true;
  if (b.managing) return manage(b);
  // In the truck without meaning to drive (he walked into it beside the scale as it arrived, REPORT6's slow
  // hand sat there for 70 minutes): a person presses Step out and walks on.
  if (driving(b)) {
    // He parks it first: left on the scale it would take him in again on his next weigh-in.
    const park = pointOf(c, 'park');
    if (Math.hypot(pos(b).x - park.x, pos(b).y - park.y) > 1) travel(b, [park], c.truck.bossV ?? c.truck.v);
    return leaveTruck(b);
  }
  if (o.holder) holdByWord(b);
  if (s.away) press(b, { act: 'ackAway' }, false);
  // The opening (S10).
  if (b.k === 0) {
    if (o.route === 'A') {
      const th = s.things.find((t) => t.at.at === 'dropoff');
      if (th) return cutLeg(b, { score: 0, kind: 'cut', spot: thingPos(c, th.at), thing: th, value: 0, g: 0 });
    } else {
      const th = s.things.find((t) => t.at.at === 'zone' && t.at.zone === 'bundle1');
      if (th) return liftLeg(b, { score: 0, kind: 'lift', spot: thingSpot(b, th), value: 0, g: 0 });
    }
  }
  const cr = s.machines.crucible;
  if (cr.owned && cr.phase === 'ready' && !cr.firstPoured && loadG(b) < 1000) return pourLeg(b);
  if (s.load.some((p) => p.grade === 'cab')) return stripLeg(b);
  const goal = nextGoal(b.cfg, b.g);
  const def = goalDef(b, goal?.id ?? null);
  const done = def?.done ?? '';
  if (goal && def?.optional) {
    const take = (o.optional ?? (o.hand === 'slow' ? 'skip' : 'take')) === 'take';
    if (take && done.startsWith('deal:signed')) {
      const terms = dealTerms(b.cfg, b.g, b.now);
      if (terms) {
        react(b);
        walk(b, placeSpot(b, 'office'));
        stand(b, b.P.card);
        if (press(b, { act: 'signDeal', terms }, true)) return;
      }
    }
    if (!take || !goal.buy) {
      press(b, { act: 'skipGoal', id: goal.id }, false);
      return;
    }
  }
  // "Weigh it on the scale", "Weigh the copper": a person weighs in what the goal names as soon as he holds it.
  // Route B went to the cable for its copper: he weighs the copper in first (E14's copper ticket).
  if (o.route === 'B' && !(s.counts?.weighIns ?? 0) && s.load.some((p) => p.grade === 'bb')) return weighLeg(b);
  if (loadG(b) > 0 && (done.startsWith('weighIns:') || (done.startsWith('weighed:') && s.load.some((p) => p.grade === done.split(':')[1])))) return weighLeg(b);
  if (done.startsWith('worked:bench') && s.machines.bench.owned && s.load.some((p) => p.grade === 'mot')) return feedLeg(b, 'bench', 'mot');
  const half = loadG(b) >= 0.5 * capG(b) - 1;
  look(b, done.startsWith('cut:') ? done.split(':')[1] : null);
  const opts = sources(b, done.startsWith('cut:') ? done.split(':')[1] : null);
  if (half || (loadG(b) > 0 && !opts.length)) return weighLeg(b);
  if (o.onlyZone) {
    if (!opts.length) {
      if (loadG(b) > 0) return weighLeg(b);
      react(b);
      return stand(b, 5);
    }
    return opts[0].kind === 'cut' ? cutLeg(b, opts[0]) : liftLeg(b, opts[0]);
  }
  // Purchases (E18: no waiting rule).
  const res = reserveFor(b);
  if (o.habit === 'all') {
    for (const key of [...c.goalOrder, ...c.dayOneList.map((i) => i.key)]) {
      const a = actionFor(b, key);
      if (a && 'price' in a && b.g.cash - res >= a.price - 1e-9) {
        if (purchase(b, a, true)) return;
      }
    }
    const lv = levels(b)[0];
    if (lv && b.g.cash - res >= lv.price - 1e-9) {
      if (purchase(b, lv.action, false)) return;
    }
  } else {
    if (goal?.buy) {
      const a = actionFor(b, goal.buy);
      if (a && 'price' in a && b.g.cash - res >= a.price - 1e-9) {
        if (purchase(b, a, true)) return;
      }
    } else if (!goal || def?.repeat || goalListDone(b)) {
      if (o.handFirst && s.crew.some((m) => m.role === 'hand')) {
        const waiting = s.pieces.filter((p) => !p.claim && !p.pile.startsWith('zone.') && !p.pile.startsWith('tray.')).reduce((a, p) => a + p.g, 0);
        if (waiting > 2 * c.crew.hand.load * 1000) {
          const hire = actionFor(b, 'hand2');
          const lv = levels(b).filter((l) => l.action.target.kind === 'crew' && s.crew.find((m) => m.id === (l.action.target as { id: string }).id)?.role === 'hand')[0];
          const pick = hire && 'price' in hire && (!lv || (hire as { price: number }).price <= lv.price * 1.5) ? hire : lv?.action ?? null;
          if (pick && 'price' in pick && b.g.cash - res >= (pick as { price: number }).price - 1e-9) {
            if (purchase(b, pick, false)) return;
          }
          if (pick) {
            // saving for it: fall through to work
          }
        }
      }
      const adv = advice(b.cfg, b.g, b.now);
      if (adv && b.g.cash - res >= adv.price - 1e-9) {
        if (purchase(b, adv.action, false)) return;
      }
    }
  }
  // The goal card first (a person follows it): "Cut up the car" and the like, while the thing can be worked.
  const goalObj = done.startsWith('cut:') ? done.split(':')[1] : null;
  const focus = goalObj ? opts.find((q) => q.obj === goalObj) : undefined;
  if (focus && !half) return cutLeg(b, focus);
  // A drive out with the truck and no driver, whenever a load is affordable and he carries nothing.
  if (s.truck.owned && !s.crew.some((m) => m.role === 'driver') && loadG(b) <= 0 && !s.arriving.some((r) => r.item === 'truck')) {
    const order = Object.keys(c.partners).sort((a, q) => (done === `fetched:${q}:1` ? 1 : 0) - (done === `fetched:${a}:1` ? 1 : 0));
    for (const p of order) {
      const h = hookable(b, p);
      if (h) return truckLeg(b, p, h.slot);
    }
  }
  if (!opts.length) {
    if (loadG(b) > 0) return weighLeg(b);
    react(b);
    stand(b, 5);
    return;
  }
  const src = opts[0];
  const scale = pointOf(c, 'scale');
  const here = pos(b);
  if (loadG(b) > 0 && Math.hypot(src.spot.x - here.x, src.spot.y - here.y) > 15 && Math.hypot(scale.x - here.x, scale.y - here.y) < Math.hypot(src.spot.x - here.x, src.spot.y - here.y)) return weighLeg(b);
  if (src.kind === 'cut') return cutLeg(b, src);
  return liftLeg(b, src);
}

function goalListDone(b: Bot): boolean {
  const gs = b.g.salvage.goals;
  return b.cfg.salvage.goals.filter((d) => !d.repeat && !d.done.startsWith('rung')).every((d) => gs.done.includes(d.id) || gs.skipped.includes(d.id));
}

/** The card manager (yard4.py manage): from the office's cards only, the boss standing there. */
function manage(b: Bot): void {
  const c = b.cfg.salvage;
  const s = b.g.salvage;
  if (s.away) press(b, { act: 'ackAway' }, false);
  const office = placeSpot(b, 'office');
  const here = pos(b);
  if (Math.hypot(office.x - here.x, office.y - here.y) > 0.5) {
    if (s.load.length) weighLeg(b);
    walk(b, office);
  }
  const goal = nextGoal(b.cfg, b.g);
  const res = reserveFor(b);
  for (const key of c.goalOrder) {
    const a = actionFor(b, key);
    if (!a) continue;
    if ('price' in a && b.g.cash - res >= a.price - 1e-9) {
      stand(b, b.P.card);
      if (press(b, a, true)) return;
    }
    break;
  }
  void goal;
  const adv = advice(b.cfg, b.g, b.now);
  if (adv && b.g.cash - res >= adv.price - 1e-9) {
    stand(b, b.P.card);
    if (press(b, adv.action, false)) return;
  }
  stand(b, 10);
}

/** The day-word holder: Hold every bay on a low day, release on a day that is not. */
function holdByWord(b: Bot): void {
  const s = b.g.salvage;
  const day = s.clock.day;
  if (b.heldDay === day) return;
  b.heldDay = day;
  for (const grade of Object.keys(s.bays)) {
    const word = dayWordCfg(b.cfg, grade, day);
    const want = word === 'low';
    if (s.bays[grade].held !== want) press(b, { act: 'setHold', grade, on: want }, false);
  }
}

// ============================================================================================ running

/** Play live for `seconds` of yard time (decisions and their legs; the last leg may run a little over). */
export function play(b: Bot, seconds: number): void {
  const end = b.g.salvage.t + seconds;
  let guard = 0;
  while (b.g.salvage.t < end && guard++ < 100_000) {
    const t0 = b.g.salvage.t;
    decide(b);
    if (b.g.salvage.t <= t0 + 1e-9) stand(b, b.opts.standDt);
  }
}

/** Put the phone away for `seconds` (device time jumps; the next tick runs the away pass). */
export function away(b: Bot, seconds: number): void {
  const earned0 = b.g.lifetimeEarnings;
  const sup0 = b.g.salvage.ladder.supplied_g;
  const t0 = b.g.salvage.t;
  b.now += seconds * 1000;
  step(b, b.opts.dt);
  b.rec.away.push({ t: t0, seconds, earned: b.g.lifetimeEarnings - earned0, supplied_g: b.g.salvage.ladder.supplied_g - sup0 });
}

/** The shop keys the record shows bought (goal purchases, in order). */
export function goalBuys(b: Bot): Purchase[] {
  return b.rec.purchases.filter((p) => p.goal);
}

// ============================================================================================ runs (the script's and the tests')

/** A fresh game at device time `now` (the shared GameState fields the salvage mode reads). */
export function startGame(cfg: SalvageConfig, now: number): SalvageGame {
  const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: now, stats: { playSeconds: 0, clockHigh: now } } as unknown as Parameters<typeof createSalvage>[1];
  return createSalvage(cfg, base, now);
}

/** The content with another world seed (the drop-off's draws and the board): one seed of the table. */
export function seededCfg(cfg: SalvageConfig, seed: number): SalvageConfig {
  return { ...cfg, salvage: { ...cfg.salvage, worldSeed: (cfg.salvage.worldSeed + seed * 7919) >>> 0 } };
}

/**
 * The gate of 2.14 on a state of a run: from `g`, sixty seconds by 0.1 s ticks (no new samples, as the
 * stale boss of a backgrounded screen) against one jump; returns what differs, or null.
 */
export function tickJumpGate(cfg: SalvageConfig, g: SalvageGame, now: number, seconds = 60): string | null {
  let a = g;
  let ms = now;
  const n = Math.round(seconds / 0.1);
  for (let i = 0; i < n; i++) {
    ms += 100;
    a = advanceSalvage(cfg, a, 0.1, ms);
  }
  const j = jump(cfg, g, g.salvage.t + seconds);
  const diffs: string[] = [];
  if (Math.abs(a.cash - j.cash) > 0.011) diffs.push(`cash ${a.cash} vs ${j.cash}`);
  if (a.salvage.ladder.supplied_g !== j.salvage.ladder.supplied_g) diffs.push(`supplied ${a.salvage.ladder.supplied_g} vs ${j.salvage.ladder.supplied_g}`);
  for (const k of Object.keys(a.salvage.bays)) if (a.salvage.bays[k].g !== j.salvage.bays[k].g) diffs.push(`bay ${k} ${a.salvage.bays[k].g} vs ${j.salvage.bays[k].g}`);
  if (a.salvage.things.length !== j.salvage.things.length) diffs.push(`things ${a.salvage.things.length} vs ${j.salvage.things.length}`);
  if (a.salvage.pieces.length !== j.salvage.pieces.length) diffs.push(`pieces ${a.salvage.pieces.length} vs ${j.salvage.pieces.length}`);
  return diffs.length ? diffs.join('; ') : null;
}

/** Play to yard second `t` (absolute), recording rated capacity at each minute when asked. */
export function playTo(b: Bot, t: number, onMinute?: (b: Bot, minute: number) => void): void {
  let guard = 0;
  let m = Math.floor(b.g.salvage.t / 60);
  while (b.g.salvage.t < t && guard++ < 200_000) {
    const t0 = b.g.salvage.t;
    decide(b);
    if (b.g.salvage.t <= t0 + 1e-9) stand(b, b.opts.standDt);
    const m2 = Math.floor(b.g.salvage.t / 60);
    if (onMinute) for (let k = m + 1; k <= m2; k++) onMinute(b, k);
    m = m2;
  }
}

export { ratedCapacity };
