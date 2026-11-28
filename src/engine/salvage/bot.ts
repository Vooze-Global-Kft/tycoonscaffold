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
 *
 * Stage 2 (yard-stage2.md 8.2; content2-bots): once the works open (layer.ts worksOpened) every read goes through the
 * content at the state (contentAt) and the merged map's path graph, and `decide2` comes first: a hall's first pour, a
 * plate waiting to be started up (every side of its plot), a carried whole thing to the Yard sale, the sitting's money
 * habits (`ads`, `packs`), stage 2's own goals (the bath, an oversize piece, the picking table, the back field, a
 * "visited:" goal), the racker's lift, the finance habit (`finance` 'always': every Bank loan its goal's card offers).
 * Steel-max buys ferrous plates only. The money's actions are the rules' own (signFinance, quotePack and grantProduct as
 * Expo Go's simulated store does, adPaid), each checked shown = applied. Before the works open nothing of this runs.
 */
import { hash01 } from './board';
import { hashString } from '../rng';
import { dealTerms } from './cards';
import { carrierCap_g, cutTime, pieceSpec, pieceValue, tierOf, toolP, vpk } from './content';
import { advice, reserve, type AdviceW } from './advice';
import { buyCheck, hireCheck, levelCheck } from './ladder';
import { nextGoal } from './goals';
import { ackAway, buy, declineDeal, hire, level, noteSeen, setHold, setPresence, signDeal, skipGoal, stepOut } from './actions';
import { dayWordCfg } from './board';
import { advanceSalvage, jump } from './tick';
import { awayPass } from './away';
import { MAX_TICK } from './types';
import { createSalvage } from './create';
import { ratedCapacity } from './rate';
import { lanePath, mapAt, piecePos, pointOf, skipZone, thingPos } from './positions';
import { contentAt, worksOpened } from './layer';
import { financeKind, financeTerms, loanOffered, shownOf } from './bank';
import { adPaid, quotePack, setAgeBand, signFinance } from './actionsMoney';
import { setPlateRecipe, setRoute, stepOutForklift } from './actionsWorks';
import { ageDue, grantProduct, packProducts, packsShown, quoteCheck, secondSession, shopReachable } from './shop';
import { adOffer, adsAllowed, sellNow } from './ads';
import type { SalvageContent } from '../../config/schema.salvage';
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
  // ---- stage 2 (yard-stage2.md 8.2; content2-bots). Each is a habit on top of the first yard's; none acts before the works open.
  /** Plant finance (2.14): 'always' signs every Bank loan a works card it opens offers; 'never' (default) pays cash only. */
  finance?: 'always' | 'never';
  /** Packs on: at each sitting from rung 4 the largest scrip pack the shop offers, simulated through quotePack and grantProduct. */
  packs?: boolean;
  /** The ad watcher: the away bonus whenever it stands, and the spot buyer on its best bay as often as the day allows. */
  ads?: boolean;
  /** 'rack': walks to tagged things it can lift and takes them to the Yard sale; 'cut': leaves tagged things standing (the rules give the boss no cut of one while a rack place is free). Default: racks only what it already carries. */
  rack?: 'rack' | 'cut';
  /** Steel-max: ferrous plates (and every level, vehicle, tool and hire) only. */
  steelMax?: boolean;
  /** Stage-2 hard-promise checks that cost CPU (a tick against a jump at each sitting's end): on for the normal runs. */
  gate2?: boolean;
  /**
   * Measurements only (RULING2.md 21.1, content2-bots): the hand plays (cuts, carries, weighs, starts plates up, pours)
   * but buys, hires and levels nothing, so that two branches of one state differ by the one purchase measured.
   */
  noBuy?: boolean;
  /**
   * Tests only (s2g-halls, RULING2.md 29.1): the old recipe habit, which PINS a hall's recipe by a tap (recipeHabit). Off by
   * default: the reference bots leave every hall to choose its own recipe (halls.ts hallPick), as a player who never taps.
   */
  pinRecipe?: boolean;
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
  /**
   * s2e-bots (from the works' opening only; absent below it, so the first yard's record is unchanged): the payback in hours
   * the card or the advice line showed when it was bought (price over its calculated gain an hour), or 0 for a goal
   * purchase (a goal's machine is priced at tau_r x its measured gain: it pays back in tau_r by construction); absent where
   * neither named a gain.
   */
  payback_h?: number;
  /** s2e-bots: how it came to be bought (from the works' opening only): 'goal', 'advice', 'meanwhile', 'loan'. */
  via?: 'goal' | 'advice' | 'meanwhile' | 'loan';
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
  /** Stage 2 (8.2): finance offers seen (a financeable works card opened with P > cash − reserve after the letter), loans signed and repaid, packs, ads, Yard sale, lots. */
  s2: {
    letter?: number;
    offers: { t: number; plate: string; P: number; cash: number }[];
    loans: { t: number; plate: string; P: number; F: number; T: number }[];
    repaid: { t: number; plate: string }[];
    packs: { t: number; product: string; S: number }[];
    ads: { t: number; kind: string; amount: number }[];
    racked: number;
    rackSold: { t: number; money: number }[];
    lots: number;
    crates: number;
    commissioned: { t: number; plate: string; by: string }[];
    pours: { t: number; plate: string }[];
    skipped: { t: number; id: string }[];
    gate: string[];
  };
}

function emptyRecord(): BotRecord {
  return { first: {}, purchases: [], minutes: [], rungs: {}, passed: [], prompts: [], broken: [], refused: [], loads: 0, loadSpend: 0, hooks: [], legs: 0, reactS: 0, walkM: 0, hold: { gain: 0, held: 0 }, away: [], log: [], bossWeighed: 0, ceiling: [], bossIns: [], walks: [], s2: { offers: [], loans: [], repaid: [], packs: [], ads: [], racked: 0, rackSold: [], lots: 0, crates: 0, commissioned: [], pours: [], skipped: [], gate: [] } };
}

export interface Bot {
  cfg: SalvageConfig;
  g: SalvageGame;
  /** Device time, epoch ms. */
  now: number;
  opts: Required<Pick<BotOptions, 'hand' | 'habit' | 'route' | 'seed' | 'dt' | 'standDt'>> & Omit<BotOptions, 'hand' | 'habit' | 'route' | 'seed' | 'dt' | 'standDt'>;
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
  /** Stage 2: the sitting's number (yard-bot.ts counts them; once-a-sitting habits read it) and what this sitting already did. */
  sitting: number;
  sat: Set<string>;
  /**
   * s2-fix-small (R4, RULING2 24): THE GUARD. The leg under way (its label from `react`, whether the boss's own act ran or
   * a card was pressed with effect in it, his load at its start), how many legs of one label in a row came to nothing, and
   * the labels set aside (until a yard second) after two in a row came to nothing: the bot chooses something else.
   */
  leg: { what: string; acted: boolean; load0: number } | null;
  fruitless: { what: string; n: number };
  blocked: Record<string, number>;
}

/** s2-fix-small (R4): yard seconds a leg that came to nothing twice in a row is set aside (a bot's own habit, not a rule). */
export const GUARD_BLOCK_S = 180;

export function newBot(cfg: SalvageConfig, g: SalvageGame, now: number, opts: BotOptions): Bot {
  const o = { dt: 0.1, standDt: Math.min(0.3, cfg.salvage.feel.staleS / 2), ...opts };
  return { cfg, g, now, opts: o, P: HANDS[o.hand], k: 0, standing: 0, rec: emptyRecord(), graph: graphOf(cfg), managing: false, ev: [], lastGoal: null, lastMinute: -1, heldDay: null, known: new Set(), sitting: 0, sat: new Set(), leg: null, fruitless: { what: '', n: 0 }, blocked: {} };
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
const graphs2 = new WeakMap<object, Graph>();

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

/**
 * The solid rectangles of the content map, inflated by the body: solid places and the container wall. With
 * `opened` (stage 2, once the works layer has opened: layer.ts worksOpened) the merged map (positions.ts mapAt):
 * the works' solid places too, the walls the layer drops gone, the back field west to `map.works.x0` behind the
 * fence at `map.works.fence.x` with its openings. Before the works open it is the first yard's graph, bit for bit.
 */
export function graphOf(cfg: SalvageConfig, opened = false): Graph {
  const c = cfg.salvage;
  const wl = opened ? c.map.works : undefined;
  const cache = wl ? graphs2 : graphs;
  const hit = cache.get(c);
  if (hit) return hit;
  const rects: Rect[] = [];
  const dropped = wl ? new Set(mapAt(c, true).dropProps) : null;
  for (const [id, pl] of Object.entries(c.map.places)) {
    if (!pl.solid) continue;
    if (dropped?.has(id) || (wl && (wl.places as Record<string, unknown>)[id])) continue;
    const p = c.map.points[id];
    if (!p) continue;
    rects.push(inflate(p[0], p[1], pl.w, pl.d, BODY));
  }
  const walls = wl ? mapAt(c, true).walls : c.map.walls;
  for (const w of walls) rects.push(inflate(w.x, w.y, w.w, w.d, BODY));
  const W = c.yard.width;
  const D = c.yard.depth;
  const X0 = wl ? wl.x0 : 0;
  if (wl) {
    for (const [id, pl] of Object.entries(wl.places as Record<string, { w: number; d: number; solid?: boolean }>)) {
      if (!pl.solid) continue;
      const p = (wl.points as Record<string, [number, number]>)[id];
      if (p) rects.push(inflate(p[0], p[1], pl.w, pl.d, BODY));
    }
    // The fence between the yard and the back field: solid along y but for its openings.
    const f = wl.fence as { x: number; openings: [number, number][] };
    const open = [...f.openings].sort((a, q) => a[0] - q[0]);
    let y = 0;
    for (const [a, q] of [...open, [D, D] as [number, number]]) {
      if (a > y + 1e-6) rects.push({ x0: f.x - 0.15 - BODY, y0: y - BODY, x1: f.x + 0.15 + BODY, y1: a + BODY });
      y = Math.max(y, q);
    }
  }
  // MAP.md M1: the back wall at map.north is one solid across the whole width (its south face 0.4 m south
  // of the line, as the world's yard.ts has it); nobody walks north of it.
  const north = (c.map as { north?: number }).north;
  if (typeof north === 'number' && north > 0) rects.push({ x0: X0 - 40, y0: -40, x1: W + 40, y1: north + NORTH_HALF_D + BODY });
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
      if (x < X0 + 0.3 || y < 0.3 || x > W - 0.3 || y > D - 0.3) continue;
      if (rects.some((o) => inside(o, q))) continue;
      nodes.push(q);
    }
  }
  for (const [gx, gy] of c.map.gaps) {
    nodes.push({ x: gx - 2, y: gy });
    nodes.push({ x: gx + 2, y: gy });
  }
  if (wl) {
    // Either side of each fence opening, at its middle.
    const f = wl.fence as { x: number; openings: [number, number][] };
    for (const [a, q] of f.openings) {
      nodes.push({ x: f.x - 1.2, y: (a + q) / 2 });
      nodes.push({ x: f.x + 1.2, y: (a + q) / 2 });
    }
  }
  const adj = nodes.map((a, i) => nodes.map((b, j) => (i === j ? 0 : rects.some((r) => crosses(r, a, b)) ? Infinity : Math.hypot(a.x - b.x, a.y - b.y))));
  const gr: Graph = { rects, nodes, adj, w: W, d: D };
  cache.set(c, gr);
  return gr;
}

/** The content the rules read for the bot's state (layer.ts contentAt): the base content itself before the works open. */
const C = (b: Bot): SalvageContent => contentAt(b.cfg.salvage, b.g.salvage);
/** The path graph for the state: the first yard's until the works open, then the merged map's. */
const graphFor = (b: Bot): Graph => (worksOpened(b.g.salvage) && b.cfg.salvage.map.works ? graphOf(b.cfg, true) : b.graph);
/** The west edge of the walkable ground (0 in the first yard; the back field's x0 once the works open). */
const westOf = (b: Bot): number => (worksOpened(b.g.salvage) && b.cfg.salvage.map.works ? b.cfg.salvage.map.works.x0 : 0);

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
  const cash0 = b.g.cash;
  const e0 = b.g.lifetimeEarnings;
  b.g = advanceSalvage(b.cfg, b.g, dt, b.now, b.ev);
  if (b.leg && (b.g.salvage.act.kind !== 'none' || driving(b))) b.leg.acted = true;
  // Hard promise (8.3): cash rises only by what was earned or credited (lot payments, ads, grants: lifetime earnings).
  if (b.g.cash - cash0 > b.g.lifetimeEarnings - e0 + 0.011) b.rec.broken.push({ t: b.g.salvage.t, what: `cash rose ${(b.g.cash - cash0).toFixed(2)} with earnings up ${(b.g.lifetimeEarnings - e0).toFixed(2)}` });
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

/**
 * owner1 V3: the boss drives his truck at truck.bossYardV inside the fence and truck.bossV on the lane (as the world
 * drives him): each leg is split where it crosses the fence (x = yard.width) and driven at its side's speed.
 */
function drive(b: Bot, pts: { x: number; y: number }[]): void {
  const c = C(b);
  const lane = c.truck.bossV ?? c.truck.v;
  const yard = c.truck.bossYardV ?? lane;
  const W = c.yard.width;
  let at = pos(b);
  for (const q of pts) {
    if ((at.x - W) * (q.x - W) < 0) {
      const u = (W - at.x) / (q.x - at.x);
      const m = { x: W, y: at.y + u * (q.y - at.y) };
      travel(b, [m], at.x <= W ? yard : lane);
      at = m;
    }
    travel(b, [q], at.x <= W && q.x <= W ? yard : lane);
    at = q;
  }
}

/** Walk on foot to a point round the solids, with the hand's path waste. */
function walk(b: Bot, to: { x: number; y: number }): void {
  if (driving(b)) return;
  const pts = pathOf(graphFor(b), pos(b), to);
  const m = pathLen(pos(b), pts) * b.P.detour;
  b.rec.walkM += m;
  const t0 = b.g.salvage.t;
  travel(b, pts, C(b).walk / b.P.detour);
  if (m > 0.5) b.rec.walks.push({ t: t0, m, s: b.g.salvage.t - t0 });
  // R4: he walked into the forklift on the way (entering is by walking near it): every act of the bot is his own, not
  // the forklift's, so he steps out where he arrived before standing to work.
  if (inForklift(b)) leaveForklift(b);
}

const inForklift = (b: Bot) => b.g.salvage.forklift?.by === 'boss';

/** R4: Step out of the forklift (the one button while he sits in it: the facade's stepOutForklift). */
function leaveForklift(b: Bot): void {
  // Still first (the rules refuse Step out while he moves: stopFirst).
  const p = pos(b);
  if (b.g.salvage.presence.moving) sample(b, p.x, p.y, false);
  b.g = stepOutForklift(b.cfg, b.g, b.g.salvage.t, b.ev);
  stand(b, b.opts.standDt);
}

/** R4's guard: is this leg (its `react` label, or `press <action>`) set aside now? Exported for bot.test.ts. */
export function isBlocked(b: Bot, what: string): boolean {
  const until = b.blocked[what];
  return until !== undefined && b.g.salvage.t < until;
}

/** R4's guard: the leg that ends here came to nothing (no act of his ran, no card took effect, his load unchanged)? Twice in a row for one label sets it aside. Exported for bot.test.ts. */
export function closeLeg(b: Bot): void {
  const L = b.leg;
  b.leg = null;
  if (!L || !L.what) return;
  const none = !L.acted && Math.abs(loadG(b) - L.load0) < 1;
  if (!none) {
    b.fruitless = { what: '', n: 0 };
    return;
  }
  const n = b.fruitless.what === L.what ? b.fruitless.n + 1 : 1;
  b.fruitless = { what: L.what, n };
  if (n >= 2) {
    b.blocked[L.what] = b.g.salvage.t + GUARD_BLOCK_S;
    b.rec.refused.push({ t: b.g.salvage.t, key: 'guard', what: `${L.what}: came to nothing twice in a row; set aside ${GUARD_BLOCK_S} s` });
    b.fruitless = { what: '', n: 0 };
  }
  for (const [k, until] of Object.entries(b.blocked)) if (b.g.salvage.t >= until) delete b.blocked[k];
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
  closeLeg(b);
  b.leg = { what, acted: false, load0: loadG(b) };
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
const capG = (b: Bot) => carrierCap_g(C(b), b.g.salvage);

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
        if (e.plate) {
          mark(b, `poured:${e.plate}`, t);
          if (e.first) b.rec.s2.pours.push({ t, plate: e.plate });
        }
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
      // Stage 2 (8.2): what the bots' table counts.
      case 'commissioned':
        b.rec.s2.commissioned.push({ t, plate: e.plate, by: e.by });
        mark(b, `commissioned:${e.plate}`, t);
        break;
      case 'racked':
        b.rec.s2.racked += 1;
        break;
      case 'rackSold':
        if (e.ticket.kind === 'rackSale') b.rec.s2.rackSold.push({ t, money: e.ticket.paid });
        break;
      case 'lotOpened':
        b.rec.s2.lots += 1;
        break;
      case 'crateSorted':
        b.rec.s2.crates += 1;
        break;
      case 'repaid':
        b.rec.s2.repaid.push({ t, plate: e.plate });
        break;
      case 'letter':
        b.rec.s2.letter ??= t;
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
  const c = C(b);
  const passed = b.g.salvage.ladder.passed ?? 0;
  return c.rivals.list.length + 1 - passed;
}

// ============================================================================================ the cards (the same actions as the screen)

/** Press a card's button as the screen does (modes/salvage/actions.ts press): the action with its shown price. */
export function press(b: Bot, a: CardAction, goal: boolean): boolean {
  // R4's guard: a card press refused twice in a row is not pressed again for a while (the bot chooses something else).
  const pk = `press ${JSON.stringify(a)}`;
  if (isBlocked(b, pk)) return false;
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
    const n = b.fruitless.what === pk ? b.fruitless.n + 1 : 1;
    b.fruitless = { what: pk, n };
    if (n >= 2) {
      b.blocked[pk] = clock + GUARD_BLOCK_S;
      b.rec.refused.push({ t: clock, key: 'guard', what: `${pk}: refused twice in a row; set aside ${GUARD_BLOCK_S} s` });
      b.fruitless = { what: '', n: 0 };
    }
    observe(b);
    return false;
  }
  if (b.leg && before !== b.g) b.leg.acted = true;
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
  return t.kind === 'crew' ? t.id : t.kind === 'machine' ? t.machine : t.kind === 'partner' ? t.partner : t.kind === 'plate' ? `plate:${t.plate}` : 'reuse';
}

function hireKey(b: Bot, g: SalvageGame, role: CrewRole): string {
  const keys = C(b).shop.concat(C(b).dayOneList).filter((i) => i.kind === 'crew' && roleOfKey(i.key) === role).map((i) => i.key);
  const n = g.salvage.crew.filter((m) => m.role === role).length;
  return keys[n] ?? `hire:${role}`;
}

function roleOfKey(key: string): CrewRole {
  return key.startsWith('hand') ? 'hand' : key.startsWith('cutter') ? 'cutter' : 'driver';
}

const CREW: Record<string, CrewRole> = {};
function crewRole(b: Bot, key: string): CrewRole | null {
  const it = C(b).shop.concat(C(b).dayOneList).find((i) => i.key === key);
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
    // Stage 2: every running plate's level and the Yard sale's room (nothing before the works open).
    ...(worksOpened(s) ? Object.keys(s.works).filter((id) => s.works[id].phase === 'running' && allowed(b, id)).map((id) => ({ kind: 'plate', plate: id }) as LevelTarget) : []),
    ...(worksOpened(s) && s.reuse ? [{ kind: 'reuse' } as LevelTarget] : []),
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
  if (a.act === 'buy') return C(b).shop.concat(C(b).dayOneList).find((i) => i.key === a.item)?.place ?? 'office';
  // Stage 2: a plate's level is on its works card (at its plot); the Yard sale's room on the rack's.
  if (a.act === 'level' && a.target.kind === 'plate') return C(b).works?.plates[a.target.plate]?.plot ?? 'office';
  if (a.act === 'level' && a.target.kind === 'reuse') return 'reuseRack';
  return 'office';
}

/** s2e-bots: why a stage-2 purchase was made and the payback it was shown with (recorded on the purchase; nothing below the works' opening). */
type Why = { via: NonNullable<Purchase['via']>; payback_h?: number };

/** The card's action as the card shows it NOW (cardOf re-reads every 500 ms): a level's, a buy's or a hire's price read again, or null when refused. */
function freshAction(b: Bot, a: CardAction): CardAction | null {
  return a.act === 'level' ? levels(b).find((l) => JSON.stringify(l.action.target) === JSON.stringify(a.target))?.action ?? null : a.act === 'buy' ? actionFor(b, a.item) : a.act === 'hire' ? (() => {
    const ch = hireCheck(b.cfg, b.g, a.role);
    return ch.refusal || ch.price === null ? null : ({ act: 'hire', role: a.role, price: ch.price } as CardAction);
  })() : a;
}

/** s2e-bots: a purchase's record gets its reason and shown payback (from the works' opening only). */
function noteWhy(b: Bot, n: number, why: Why | undefined): void {
  if (!why || !worksOpened(b.g.salvage) || b.rec.purchases.length <= n) return;
  const p = b.rec.purchases[n];
  p.via = why.via;
  if (why.payback_h !== undefined && Number.isFinite(why.payback_h)) p.payback_h = +why.payback_h.toFixed(2);
}

/** Walk to the card's place (unless managing from cards), read the card, press. */
function purchase(b: Bot, a: CardAction, goal: boolean, why?: Why): boolean {
  if (b.opts.noBuy) return false;
  const t0 = b.g.salvage.t;
  const cash0 = b.g.cash;
  if (!b.managing) {
    react(b, `buy ${JSON.stringify(a)}`);
    walk(b, placeSpot(b, cardPlace(b, a)));
  }
  if (a.act === 'buy' && a.item in (C(b).works?.plates ?? {})) openWorks(b, a.item);
  else b.g = noteSeen(b.cfg, b.g, { card: a.act === 'buy' ? 'rack' : 'rota' }, b.g.salvage.t);
  stand(b, b.P.card);
  // The card re-reads its price at the moment of the press (cardOf every 500 ms).
  const fresh = freshAction(b, a);
  if (!fresh) return false;
  if ('price' in fresh && b.g.cash - reserveFor(b) < (fresh as { price: number }).price - 1e-9) return false;
  const n = b.rec.purchases.length;
  const ok = press(b, fresh, goal);
  if (ok && b.rec.purchases.length > n) {
    const p = b.rec.purchases[n];
    p.cashAtCard = cash0;
    p.walkToBuy_s = p.t - t0;
    noteWhy(b, n, why);
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
  const c = C(b);
  const p = pointOf(c, place);
  // Stage 2: a works place (map.works.places) once the works are open; the first layer's first (pointOf's order).
  const wpl = worksOpened(b.g.salvage) && !c.map.places[place] ? (c.map.works?.places as Record<string, { w: number; d: number; solid?: boolean }> | undefined)?.[place] : undefined;
  const pl = (c.map.places[place] ?? wpl) as { w: number; d: number; solid?: boolean } | undefined;
  if (!pl || !pl.solid) return p;
  const m = Math.min(c.reach.place - 0.2, BODY + 0.4);
  const here = pos(b);
  // join2's door (content map.places.<id>.door): a place with a door is opened from that side only.
  const door = (pl as { door?: 'n' | 's' | 'e' | 'w' }).door;
  const sides = { s: { x: p.x, y: p.y + pl.d / 2 + m }, n: { x: p.x, y: p.y - pl.d / 2 - m }, w: { x: p.x - pl.w / 2 - m, y: p.y }, e: { x: p.x + pl.w / 2 + m, y: p.y } };
  const cands = (door ? [sides[door]] : [sides.s, sides.n, sides.w, sides.e]).filter((q) => q.x > westOf(b) + 0.5 && q.y > 0.5 && q.x < c.yard.width - 0.5 && q.y < c.yard.depth - 0.5 && !graphFor(b).rects.some((r) => inside(r, q) && !(Math.abs(r.x0 + BODY - (p.x - pl.w / 2)) < 1e-6 && Math.abs(r.y0 + BODY - (p.y - pl.d / 2)) < 1e-6)));
  cands.sort((a, q) => pathLen(here, pathOf(graphFor(b), here, a)) - pathLen(here, pathOf(graphFor(b), here, q)));
  return cands[0] ?? p;
}

/** Is a point on the platform scale's ground (machines.ts atPlace with reach.place, padded 0.15 m)? */
function onScale(b: Bot, q: { x: number; y: number }): boolean {
  const c = C(b);
  const pt = c.map.points.scale;
  if (!pt) return false;
  const pl = c.map.places.scale;
  const dx = Math.max(0, Math.abs(q.x - pt[0]) - (pl?.w ?? 0) / 2);
  const dy = Math.max(0, Math.abs(q.y - pt[1]) - (pl?.d ?? 0) / 2);
  return Math.hypot(dx, dy) <= c.reach.place + 0.15;
}

/** A thing's distance from a point, from its footprint's edge (positions.thingNear's measure). */
function edgeDist(b: Bot, th: ThingState, x: number, y: number): number {
  const c = C(b);
  const p = thingPos(c, th.at);
  const o = c.objects[th.obj];
  return Math.hypot(Math.max(0, Math.abs(x - p.x) - (o?.size.w ?? 1) / 2), Math.max(0, Math.abs(y - p.y) - (o?.size.d ?? 1) / 2));
}

/**
 * Where the boss stands to work a thing: beside its footprint, within reach, on a side where it is the
 * nearest thing (a person steps up to the washer, not to the radiator beside it), the shortest walk first.
 */
function thingSpot(b: Bot, th: ThingState): { x: number; y: number } {
  const c = C(b);
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
  const c = C(b);
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
  const c = C(b);
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
  // R4's guard: a source whose leg came to nothing twice in a row is set aside (cutLeg's and liftLeg's labels).
  return [...best.values()].filter((q) => !isBlocked(b, q.kind === 'cut' ? `cut ${q.thing?.uid}` : `lift ${q.pile ?? q.thing?.uid}`)).sort((a, q) => q.score - a.score);
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
    if (idle > C(b).feel.workDelay + 0.6) break;
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
    if (idle > C(b).feel.workDelay + 0.6) break;
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
  for (const th of s.things) if (th.at.at === 'floor') floor += (C(b).objects[th.obj]?.gross_g ?? 0) - piecesOff(b, th);
  for (const q of s.pieces) if (q.pile === 'floor' || q.pile.startsWith('beside.f')) floor += q.g;
  if (floor + sk.mass_g > C(b).floorRoom_kg * 1000) return null;
  return { slot: sk.slot, price: sk.price };
}

function piecesOff(b: Bot, th: ThingState): number {
  let g = 0;
  for (let k = 0; k < th.cut; k++) g += pieceSpec(C(b), th.obj, k)?.g ?? 0;
  return g;
}

/** A drive out (the boss with no driver): into the truck, the lane, hook, the weighbridge, tip, park, step out. */
function truckLeg(b: Bot, partner: string, slot: number): void {
  const c = C(b);
  react(b, `drive ${partner}`);
  const tr = b.g.salvage.truck;
  walk(b, { x: tr.x, y: tr.y });
  if (!driving(b)) stand(b, b.opts.standDt);
  if (!driving(b)) return;
  // P10: the boss drives at truck.bossV (the driver's truck.v is the hired driver's); R7 clamps faster samples.
  const path = lanePath(c, pos(b), partner, slot).slice(1);
  drive(b, path);
  standUntil(b, () => !!b.g.salvage.truck.skip || (b.g.salvage.act.target ?? '').startsWith('refused'), (c.truck.bossHandle_s ?? c.truck.handle_s) + 8);
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
  drive(b, [{ x: z.x, y: gate.y }, { x: gate.x + 2, y: gate.y }, { x: gate.x - 2, y: gate.y }]);
  if (b.g.salvage.truck.skip) {
    drive(b, [wb]);
    standUntil(b, () => !!b.g.salvage.truck.skip?.weighed, 10);
    drive(b, turn ? [{ x: floor.x, y: wb.y }, floor] : [floor]);
    standUntil(b, () => !b.g.salvage.truck.skip, c.truck.handle_s + 8);
  }
  const here = pos(b);
  drive(b, turn ? [{ x: here.x, y: turn.y }, turn, park] : [park]);
  leaveTruck(b);
}

/** Step out (the button) and walk off: the world sets him down beside the truck (frameLoop: truckR + workerR + 0.25 m). */
function leaveTruck(b: Bot): void {
  const c = C(b);
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
  const c = C(b);
  const st2 = worksOpened(b.g.salvage) ? ((c as unknown as { stage2?: { id: string; done: string; optional?: boolean; repeat?: boolean; buy?: string | null; via?: string | null }[] }).stage2 ?? []) : [];
  return c.goals.find((d) => d.id === id) ?? c.dayOne.find((d) => d.id === id) ?? st2.find((d) => d.id === id) ?? null;
}

/** One decision and its leg (yard4.py decide on the real state). */
export function decide(b: Bot): void {
  const c = C(b);
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
    if (Math.hypot(pos(b).x - park.x, pos(b).y - park.y) > 1) drive(b, [park]);
    return leaveTruck(b);
  }
  // R4: in the forklift (he walked into it): every act of the bot is his own, so he steps out first.
  if (inForklift(b)) return leaveForklift(b);
  if (o.holder) holdByWord(b);
  if (s.away) press(b, { act: 'ackAway' }, false);
  // Stage 2 (8.2): the works' own legs and the money's habits come first once the works are open; below that, nothing.
  if (decide2(b)) return;
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
  if (goal && def?.optional && !stage2Goal(b, goal.id)) {
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
    if (goal?.buy && allowed(b, goal.buy)) {
      const a = actionFor(b, goal.buy);
      if (a && 'price' in a && b.g.cash - res >= a.price - 1e-9) {
        if (purchase(b, a, true, { via: 'goal' })) return;
      }
      // s2e-bots (yard-stage2-economy.md 2.13 (b)): while the goal's item costs more than the cash, the advice line's second
      // line "For now: {item}" names what the cash buys without delaying it; a person who follows the line buys it.
      if (worksOpened(s) && meanwhile(b, res)) return;
    } else if (!goal || def?.repeat || goalListDone(b) || (worksOpened(s) && (!goal.buy || !allowed(b, goal.buy)))) {
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
      const adv = adviceFor(b);
      if (adv && b.g.cash - res >= adv.price - 1e-9) {
        if (purchase(b, adv.action, false, { via: 'advice', payback_h: (adv as AdviceW).works?.payback_h })) return;
      }
      if (worksOpened(s) && meanwhile(b, res)) return;
    }
  }
  // The goal card first (a person follows it): "Cut up the car" and the like, while the thing can be worked.
  const goalObj = done.startsWith('cut:') ? done.split(':')[1] : null;
  const focus = goalObj ? opts.find((q) => q.obj === goalObj) : undefined;
  if (focus && !half) return cutLeg(b, focus);
  // A drive out with the truck and no driver, whenever a load is affordable and he carries nothing.
  if (s.truck.owned && !s.crew.some((m) => m.role === 'driver') && loadG(b) <= 0 && !s.arriving.some((r) => r.item === 'truck')) {
    const order = Object.keys(c.partners).filter((p) => s.partners[p]?.open).sort((a, q) => (done === `fetched:${q}:1` ? 1 : 0) - (done === `fetched:${a}:1` ? 1 : 0));
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

/**
 * s2e-bots: the advice line's "For now: {item}" (advice.ts works.meanwhile; from the works' opening only) bought when the
 * cash less the reserve covers it. True when it was bought.
 */
function meanwhile(b: Bot, res: number): boolean {
  const m = (adviceFor(b) as AdviceW | null)?.works?.meanwhile;
  if (!m || b.g.cash - res < m.price - 1e-9) return false;
  const key = m.action.act === 'buy' ? m.action.item : m.action.act === 'level' && m.action.target.kind === 'plate' ? m.action.target.plate : null;
  if (key !== null && !allowed(b, key)) return false;
  return purchase(b, m.action, false, { via: 'meanwhile', payback_h: m.gain_h > 0 ? m.price / m.gain_h : undefined });
}

function goalListDone(b: Bot): boolean {
  const gs = b.g.salvage.goals;
  return C(b).goals.filter((d) => !d.repeat && !d.done.startsWith('rung')).every((d) => gs.done.includes(d.id) || gs.skipped.includes(d.id));
}

/** The card manager (yard4.py manage): from the office's cards only, the boss standing there. */
function manage(b: Bot): void {
  const c = C(b);
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
  // s2e-bots: from the works' opening the manager taps ONLY what the goal card and the advice line name (the goal's item,
  // the line's purchase, its "For now"), each at the price the card shows when he presses (read again after reading it).
  if (worksOpened(s)) return manageWorks(b, res);
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

/** s2e-bots: the card manager from the works' opening (see manage). */
function manageWorks(b: Bot, res: number): void {
  const tap = (a: CardAction | null, goal: boolean, why: Why): boolean => {
    if (!a || !('price' in a) || b.g.cash - res < (a as { price: number }).price - 1e-9) return false;
    stand(b, b.P.card);
    // The card re-reads its price at the press (a level priced from its gain moves with the assets while he reads).
    const f = freshAction(b, a);
    if (!f || !('price' in f) || b.g.cash - reserveFor(b) < (f as { price: number }).price - 1e-9) return false;
    const n = b.rec.purchases.length;
    const ok = press(b, f, goal);
    if (ok) noteWhy(b, n, why);
    return ok;
  };
  const goal = nextGoal(b.cfg, b.g);
  // s2e-measure (RULING2.md 28.4 f): the goal card stood on a first-yard OPTIONAL goal ("Sign the deal") all stage long,
  // because the manager only ever tapped purchases. A person who plays from the cards answers the card in front of him:
  // he signs the deal at the office he stands in (as the normal hand does), else presses Not now. From the works' opening
  // only (the first yard's manager is unchanged: first-yard.sh).
  const def = goal ? goalDef(b, goal.id) : null;
  if (goal && def?.optional && !stage2Goal(b, goal.id)) {
    if ((def.done ?? '').startsWith('deal:signed')) {
      const terms = dealTerms(b.cfg, b.g, b.now);
      if (terms) {
        stand(b, b.P.card);
        if (press(b, { act: 'signDeal', terms }, true)) return;
      }
    }
    if (!goal.buy) {
      press(b, { act: 'skipGoal', id: goal.id }, false);
      return;
    }
  }
  if (goal?.buy && tap(actionFor(b, goal.buy), true, { via: 'goal' })) return;
  const adv = advice(b.cfg, b.g, b.now) as AdviceW | null;
  if (adv && tap(adv.action, false, { via: 'advice', payback_h: adv.works?.payback_h })) return;
  const m = adv?.works?.meanwhile;
  if (m && tap(m.action, false, { via: 'meanwhile', payback_h: m.gain_h > 0 ? m.price / m.gain_h : undefined })) return;
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

// ============================================================================================ stage 2 (yard-stage2.md 8.2; content2-bots)

/** The plates a steel-max bot buys (8.2: "ferrous plates and levels only"): the ones whose outputs are ferrous grades. */
const FERROUS_PLATES = new Set(['crane', 'shear', 'baler', 'shredder']);

/** May this bot buy this shop key or level this plate? Every key for every bot but steel-max, which leaves non-ferrous plates alone. */
function allowed(b: Bot, key: string): boolean {
  if (!b.opts.steelMax) return true;
  const plates = C(b).works?.plates ?? {};
  return !(key in plates) || FERROUS_PLATES.has(key);
}

/** The advice line as this bot reads it: the rules' advice, unless steel-max refuses its plate (then the cheapest level it may buy). */
function adviceFor(b: Bot): ReturnType<typeof advice> {
  const a = advice(b.cfg, b.g, b.now);
  if (!a) return a;
  const key = a.action.act === 'buy' ? a.action.item : a.action.act === 'level' && a.action.target.kind === 'plate' ? a.action.target.plate : null;
  if (key === null || allowed(b, key)) return a;
  const lv = levels(b)[0];
  return lv ? { ...a, action: lv.action, price: lv.price } : null;
}

/** Stage 2's goals the layer works itself (optional or not): racking the bath, an oversize piece, the picking table, the back field. */
function stage2Goal(b: Bot, id: string): boolean {
  return worksOpened(b.g.salvage) && ['rackBath', 'cutLot', 'sortCrate', 'walkBackfield'].includes(id);
}

const s2Note = (b: Bot, key: string) => {
  if (b.sat.has(key)) return false;
  b.sat.add(key);
  return true;
};

/** A plate's card is opened (the goal card's order, E8): noteSeen with the plate, so the lender's letter and the finance card see it. */
function openWorks(b: Bot, plate: string): void {
  b.g = noteSeen(b.cfg, b.g, { card: 'works', plate } as never, b.g.salvage.t, b.ev);
  if (b.rec.s2.letter === undefined && b.g.salvage.bank.letterSeen) b.rec.s2.letter = b.g.salvage.t;
}

/** Walk beside a place and stand until `cond` holds (or `max` seconds): the plots, the aprons, the rack's chalk zone. */
function standAt(b: Bot, place: string, cond: () => boolean, max: number, what: string): boolean {
  react(b, what);
  walk(b, placeSpot(b, place));
  return standUntil(b, cond, max);
}

/** A plate set down and waiting to be started up: the boss stands at its plot (2.6.3). */
function commissionLeg(b: Bot, id: string): void {
  const c = C(b);
  const plot = c.works!.plates[id].plot;
  const run = () => b.g.salvage.works[id]?.phase === 'running';
  const max = (c.works?.commission_s ?? 0) + 6;
  if (standAt(b, plot, run, max, `commission ${id}`)) return;
  // The spot beside it did nothing (the analyser on the scale house: its south side is the platform scale's approach,
  // s2c-join2b 6): a person tries the plot's other sides, 0.6 m out of its footprint.
  const f = (mapAt(c, true).footprints as Record<string, { x: number; y: number; w: number; d: number }>)[plot];
  const tried: string[] = [JSON.stringify(pos(b))];
  if (f) {
    for (const q of [{ x: f.x, y: f.y - f.d / 2 - 0.6 }, { x: f.x + f.w / 2 + 0.6, y: f.y }, { x: f.x - f.w / 2 - 0.6, y: f.y }, { x: f.x, y: f.y + f.d / 2 + 0.6 }]) {
      walk(b, q);
      if (standUntil(b, run, max)) {
        b.rec.refused.push({ t: b.g.salvage.t, key: 'commissionSide', what: `${id}: started from ${q.x.toFixed(1)},${q.y.toFixed(1)} after ${tried.join(' ')} did nothing` });
        return;
      }
      tried.push(JSON.stringify(pos(b)));
    }
  }
  b.rec.refused.push({ t: b.g.salvage.t, key: 'commission', what: `${id}: standing at ${tried.join(' ')} did not start it` });
}

/** A hall's first heat at "Ready to pour" waits for the boss (S11): he walks to its apron. */
function pourLeg2(b: Bot, id: string): void {
  const c = C(b);
  const apron = `${id}.apron`;
  const place = c.map.works?.points?.[apron] ? apron : c.works!.plates[id].plot;
  standAt(b, place, () => !!b.g.salvage.works[id]?.heat?.firstPoured, 20, `pour ${id}`);
}

/** A whole tagged thing in his load goes to the Yard sale's chalk zone (reuse.ts bossRack). */
function rackLeg(b: Bot): void {
  const uid = b.g.salvage.load.find((p) => p.whole && p.spec === -1)?.uid;
  standAt(b, 'reuseRack.zone', () => !b.g.salvage.load.some((p) => p.uid === uid), 8, 'rack');
}

/** The racker: lift a tagged thing he can carry (standing still beside it lifts it whole while a place is free). */
function liftTagged(b: Bot, th: ThingState): void {
  react(b, `lift whole ${th.uid}`);
  walk(b, thingSpot(b, th));
  standUntil(b, () => b.g.salvage.load.some((p) => p.uid === th.uid), 6);
}

const loadWhole = (b: Bot) => b.g.salvage.load.some((p) => p.whole && p.spec === -1);

/** Tagged things the boss may lift now (reuse.ts tagged: whole, uncut, where things wait; light enough for his carrier). */
function taggedThings(b: Bot): ThingState[] {
  const c = C(b);
  const R = c.reuse;
  if (!R) return [];
  const room = capG(b) - loadG(b);
  return b.g.salvage.things.filter((th) => {
    if (th.by || th.cut !== 0 || th.shell || th.sender !== undefined) return false;
    if (!['floor', 'dropoff', 'zone', 'canopy'].includes(th.at.at)) return false;
    if ((c.objects[th.obj]?.gross_g ?? Infinity) > room) return false;
    if (th.uid === 'reuse.first') return th.obj === R.firstThing;
    const k = R.kinds[th.obj];
    if (!k || (k.fromPartnerOnly && !/^f\d+$/.test(th.uid))) return false;
    return hash01(c.worldSeed, hashString('reuse'), hashString(th.uid)) < R.share;
  });
}


function rackRoom(b: Bot): boolean {
  const c = C(b);
  const R = c.reuse;
  const s = b.g.salvage;
  if (!R || !s.reuse) return false;
  const cap = R.slots + R.levelSlots * Math.min(s.reuse.level, R.levels);
  const n = s.things.filter((th) => th.at.at === 'rack').length + s.crew.filter((m) => m.job === 'rack').length + s.load.filter((p) => p.whole && p.spec === -1).length;
  return n < cap;
}

/**
 * Finance (2.14; 8.2 "Always / never finances"): the goal's (or the advice line's) plate when cash cannot pay it outright.
 * s2e-bots (yard-stage2-economy.md 2.14.2; s2e-bank): also a financeable VEHICLE (the three-axle hook-lift), whose card is
 * the truck park's (noteSeen {card: 'park', place}): the letter, the offer and signFinance exactly as for a plate.
 * Exported for bot.test.ts.
 */
export function financeHabit(b: Bot, plate: string): boolean {
  const s = b.g.salvage;
  const kind = financeKind(C(b), plate);
  if (kind === null || s.bank.agreement) return false;
  if (kind === 'plate' && s.works[plate]) return false;
  if (kind === 'vehicle' && (s.owned.includes(plate as never) || s.arriving.some((q) => q.item === plate))) return false;
  const tm = financeTerms(b.cfg, b.g, plate);
  if (!tm) return false;
  const room = b.g.cash - reserveFor(b);
  if (!(tm.P > room)) return false;
  // Once a sitting a person opens the goal's card to see what it costs (E8): the letter and the offer are read there.
  if (!s2Note(b, `open:${plate}`)) return false;
  react(b, `open ${plate}`);
  if (kind === 'plate') {
    walk(b, placeSpot(b, C(b).works!.plates[plate].plot));
    openWorks(b, plate);
  } else {
    const place = C(b).shop.find((i) => i.key === plate)?.place ?? 'park';
    walk(b, placeSpot(b, place));
    // He walked into the truck at the park (the park's card is read from beside it): out first, as a person would.
    if (driving(b)) leaveTruck(b);
    b.g = noteSeen(b.cfg, b.g, { card: 'park', place } as never, b.g.salvage.t, b.ev);
    if (b.rec.s2.letter === undefined && b.g.salvage.bank.letterSeen) b.rec.s2.letter = b.g.salvage.t;
  }
  stand(b, b.P.card);
  if (!loanOffered(b.cfg, b.g, plate)) return true;
  const t2 = financeTerms(b.cfg, b.g, plate)!;
  b.rec.s2.offers.push({ t: b.g.salvage.t, plate, P: t2.P, cash: b.g.cash });
  if (b.opts.finance !== 'always') return true;
  const cash0 = b.g.cash;
  const ev: SalvageEvent[] = [];
  b.g = signFinance(b.cfg, b.g, plate, shownOf(t2), b.g.salvage.t, ev);
  b.ev.push(...ev);
  const r = ev.find((e) => e.type === 'refused');
  if (r && r.type === 'refused') {
    b.rec.refused.push({ t: b.g.salvage.t, key: r.key, what: `signFinance ${plate}` });
    if (r.key === 'bankTerms') b.rec.broken.push({ t: b.g.salvage.t, what: `finance card shown not applied: ${plate}` });
  } else {
    // Shown equals applied: the deposit P − F, exactly.
    if (Math.abs(cash0 - b.g.cash - (t2.P - t2.F)) > 0.005) b.rec.broken.push({ t: b.g.salvage.t, what: `signFinance took ${cash0 - b.g.cash} for a deposit shown ${t2.P - t2.F}` });
    b.rec.s2.loans.push({ t: b.g.salvage.t, plate, P: t2.P, F: t2.F, T: t2.T });
    b.rec.purchases.push({ t: b.g.salvage.t, key: plate, price: t2.P - t2.F, kind: 'buy', goal: true, cashAfter: b.g.cash, via: 'loan' });
  }
  observe(b);
  return true;
}

/** Packs on (8.2): at each sitting from rung 4 the largest pack the shop offers (quote, then the simulated store's grant, as Expo Go does). */
function packHabit(b: Bot): void {
  const ctx = { country: 'US' };
  const now = b.now;
  // s2e-fix1 (RULING2 28.2 a): the age question is due from the second session's start (shop.ts ageDue), not at a pack row.
  if (ageDue(b.cfg, b.g, ctx)) {
    b.g = setAgeBand(b.cfg, b.g, 1985, now, b.g.salvage.t, b.ev);
  }
  if (!packsShown(b.cfg, b.g, ctx)) return;
  const packs = [...packProducts(b.cfg)].sort((a, q) => q.H - a.H);
  for (const { product } of packs) {
    const ch = quoteCheck(b.cfg, b.g, product, null, now, ctx);
    if (ch.refusal) continue;
    const ev: SalvageEvent[] = [];
    const g1 = quotePack(b.cfg, b.g, product, ch.S, now, [], now, b.g.salvage.t, ev, ctx);
    if (g1 === b.g) {
      b.rec.refused.push({ t: b.g.salvage.t, key: 'pack', what: product });
      continue;
    }
    const cash0 = g1.cash;
    const txId = `bot-${b.opts.seed}-${b.rec.s2.packs.length + 1}`;
    b.g = grantProduct(b.cfg, g1, { productId: product, txId, purchasedMs: null, own: { atMs: now } });
    // Shown equals applied: the pack's S, exactly.
    if (Math.abs(b.g.cash - cash0 - ch.S) > 0.005) b.rec.broken.push({ t: b.g.salvage.t, what: `pack ${product} paid ${b.g.cash - cash0} for S shown ${ch.S}` });
    b.rec.s2.packs.push({ t: b.g.salvage.t, product, S: ch.S });
    observe(b);
    return;
  }
}

/** The ad watcher (8.2): the away bonus whenever it stands; the spot buyer on the bay of most worth, as often as the day allows. */
function adHabit(b: Bot): void {
  const amount = adOffer(b.cfg, b.g, 'away');
  if (amount !== null) watch(b, 'away', amount, {});
  for (let k = 0; k < 4 && adsAllowed(b.cfg, b.g); k++) {
    const s = b.g.salvage;
    const grades = Object.entries(s.bays).filter(([, bay]) => bay.g > 100_000).sort((a, q) => q[1].g * vpk(C(b), q[0]) - a[1].g * vpk(C(b), a[0]));
    const gr = grades[0]?.[0];
    if (!gr) return;
    const wasHeld = s.bays[gr].held;
    if (!wasHeld) press(b, { act: 'setHold', grade: gr, on: true }, false);
    const shown = sellNow(b.cfg, b.g, gr);
    const x = adOffer(b.cfg, b.g, 'spot', { grade: gr });
    if (shown && x !== null) watch(b, 'spot', x, { grade: gr, sell: shown });
    if (!wasHeld && b.g.salvage.bays[gr]?.held) press(b, { act: 'setHold', grade: gr, on: false }, false);
    if (x === null) return;
  }
}

function watch(b: Bot, kind: 'away' | 'spot', amount: number, ref: { grade?: string; sell?: ReturnType<typeof sellNow> }): void {
  stand(b, 30); // a rewarded video
  const again = kind === 'away' ? adOffer(b.cfg, b.g, 'away') : adOffer(b.cfg, b.g, 'spot', { grade: ref.grade });
  if (again === null) return;
  const ev: SalvageEvent[] = [];
  const e0 = b.g.lifetimeEarnings;
  b.g = adPaid(b.cfg, b.g, kind, again, { grade: ref.grade, sell: ref.sell ?? undefined } as never, b.g.salvage.t, ev);
  b.ev.push(...ev);
  const r = ev.find((e) => e.type === 'refused');
  if (r && r.type === 'refused') {
    b.rec.refused.push({ t: b.g.salvage.t, key: r.key, what: `ad ${kind}` });
    observe(b);
    return;
  }
  void e0;
  b.rec.s2.ads.push({ t: b.g.salvage.t, kind, amount: again });
  observe(b);
}

/**
 * One stage-2 decision (true: a leg was made). Nothing before the works open, so the first yard plays exactly as merged.
 * In order: a hall's first pour, a plate to start up, a whole tagged thing carried to the rack, the sitting's money
 * habits (ads, packs), stage 2's own goals (the bath, an oversize piece, the picking table, the back field), the
 * racker's lift, the finance habit on the goal's plate. Everything else is the first yard's decide (the goal's
 * purchase, the advice line, the hand's work).
 */
function decide2(b: Bot): boolean {
  const s = b.g.salvage;
  if (!worksOpened(s)) return false;
  const c = C(b);
  const o = b.opts;
  // Hard promise (2.15.2, 13.2): nothing of money or ads before the second session.
  if (!secondSession(b.g) && (adOffer(b.cfg, b.g, 'away') !== null || shopReachable(b.g) || packsShown(b.cfg, b.g, { country: 'US' }))) b.rec.broken.push({ t: s.t, what: 'money or ads shown before the second session' });
  for (const [id, w] of Object.entries(s.works)) {
    if (w.heat?.phase === 'ready' && !w.heat.firstPoured) {
      pourLeg2(b, id);
      return true;
    }
  }
  for (const [id, w] of Object.entries(s.works)) {
    if (w.phase === 'installed' && s2Note(b, `comm:${id}:${b.sitting}`)) {
      commissionLeg(b, id);
      return true;
    }
  }
  // REPORT9: a car waiting on the car pad and a running station plate fed by the forklift with a free apron: the boss
  // drives the forklift (2.9; the only way a car reaches the apron, T1). s2e-bots: DROPPED IN USE at stage 2 as built (no
  // forklift is sold and no car pad drawn; the hook-lift sets each car on the bay's apron, D1 a): forkliftPlate is null
  // without a forklift in the state, so this runs only on the frozen REPORT9 content (its tests).
  const fp = forkliftPlate(b);
  if (fp && !isBlocked(b, 'forklift')) {
    forkliftLeg(b, fp);
    return true;
  }
  if (loadWhole(b) && rackRoom(b) && o.rack !== 'cut') {
    rackLeg(b);
    return true;
  }
  if (o.ads && s2Note(b, `ads:${b.sitting}`)) adHabit(b);
  if (o.packs && s.ladder.rung >= 4 && s2Note(b, `packs:${b.sitting}`)) packHabit(b);
  const goal = nextGoal(b.cfg, b.g);
  const id = goal?.id ?? '';
  const take = (o.optional ?? (o.hand === 'slow' ? 'skip' : 'take')) === 'take';
  const skip = () => {
    b.rec.s2.skipped.push({ t: s.t, id });
    press(b, { act: 'skipGoal', id }, false);
    return true;
  };
  if (id === 'rackBath') {
    const bath = s.things.find((th) => th.uid === 'reuse.first');
    if (!take || !bath || o.rack === 'cut') return skip();
    if (loadG(b) > 0) {
      weighLeg(b);
      return true;
    }
    liftTagged(b, bath);
    if (!loadWhole(b)) return skip();
    return true;
  }
  if (id === 'cutLot') {
    const lot = s.things.find((th) => th.at.at === 'lot' && !th.by);
    if (!take || !lot || tierOf(c, lot) > s.tier) return skip();
    if (isBlocked(b, 'lot')) return false;
    const n0 = s.things.filter((th) => th.at.at === 'lot').length;
    react(b, 'lot');
    walk(b, thingSpot(b, lot));
    standUntil(b, () => b.g.salvage.things.filter((th) => th.at.at === 'lot').length < n0, 40);
    return true;
  }
  if (id === 'sortCrate') {
    const n0 = s.things.filter((th) => th.at.at === 'crate').length;
    if (!take || n0 === 0) return skip();
    if (isBlocked(b, 'crate')) return false;
    standAt(b, 'crate', () => b.g.salvage.things.filter((th) => th.at.at === 'crate').length === 0, 90, 'crate');
    return true;
  }
  // A place the goal card sends him to (the day-1 list's "visited:" goals: the back field's gateway).
  const def = goalDef(b, id);
  if (def?.done.startsWith('visited:') && s2Note(b, `visit:${id}:${b.sitting}`)) {
    react(b, `visit ${def.done}`);
    walk(b, placeSpot(b, def.done.slice(8)));
    stand(b, 1);
    return true;
  }
  if (id === 'walkBackfield') {
    if (!take) return skip();
    if (s2Note(b, 'backfield')) {
      react(b, 'back field');
      walk(b, pointOf(c, 'backfield'));
      stand(b, 1);
      return true;
    }
    return skip();
  }
  // s2e-bots (yard-stage2-economy.md 2.10, D4; gate G8): THE BOSS'S OWN HAND. Every oversize piece waiting on the pad that
  // his tool can open is cut, whatever the goal (a person who comes back to pieces on the pad cuts them: 2 to 3 a return,
  // 4 to 10 s each); once a sitting he sorts the picking table if it holds things. He never taps a hall's recipe: from
  // ruling 29.1 a hall chooses its own at each heat's start (the old tapping habit, recipeHabit, runs only with the test
  // option pinRecipe). Each is a habit of the bot, not a rule.
  if (lotHabit(b)) return true;
  if (crateHabit(b)) return true;
  if (recipeHabit(b)) return true;
  // The racker: a tagged thing he can lift, while the rack has a place (8.2 Racker).
  if (o.rack === 'rack' && loadG(b) === 0 && rackRoom(b)) {
    const th = taggedThings(b).sort((a, q) => Math.hypot(thingPos(c, a.at).x - pos(b).x, thingPos(c, a.at).y - pos(b).y) - Math.hypot(thingPos(c, q.at).x - pos(b).x, thingPos(c, q.at).y - pos(b).y))[0];
    if (th && s2Note(b, `lift:${th.uid}`)) {
      liftTagged(b, th);
      return true;
    }
  }
  // Finance: the goal's plate, or the advice line's, when the cash in hand cannot pay it.
  const plate = goal?.buy && allowed(b, goal.buy) ? goal.buy : null;
  if (plate && financeHabit(b, plate)) return true;
  // The goal's works purchase opens its card at the plot (the letter reads the card it was seen on).
  if (plate && plate in (c.works?.plates ?? {}) && s2Note(b, `seen:${plate}`)) openWorks(b, plate);
  return false;
}

/** s2e-bots: an oversize piece the boss's tool opens, waiting on the pad: walk beside it and stand while he cuts it (true: a leg). */
function lotHabit(b: Bot): boolean {
  const s = b.g.salvage;
  const c = C(b);
  if (isBlocked(b, 'lot')) return false;
  const lot = s.things.filter((th) => th.at.at === 'lot' && !th.by && tierOf(c, th) <= s.tier).sort((a, q) => a.uid < q.uid ? -1 : 1)[0];
  if (!lot) return false;
  const n0 = s.things.filter((th) => th.at.at === 'lot').length;
  react(b, 'lot');
  walk(b, thingSpot(b, lot));
  standUntil(b, () => b.g.salvage.things.filter((th) => th.at.at === 'lot').length < n0, 40);
  return true;
}

/** s2e-bots: once a sitting, the picking table sorted when it holds things (the boss stands at it). */
function crateHabit(b: Bot): boolean {
  const s = b.g.salvage;
  if (!s.things.some((th) => th.at.at === 'crate') || isBlocked(b, 'crate') || !s2Note(b, `crate:${b.sitting}`)) return false;
  standAt(b, 'crate', () => !b.g.salvage.things.some((th) => th.at.at === 'crate'), 90, 'crate');
  return true;
}

/**
 * s2g-halls (RULING2.md 29.1): ONLY with the option pinRecipe (tests): a hall chooses its own recipe at each heat's start
 * (halls.ts hallPick) and a tap pins it, so the reference bots never tap. As built by s2e-bots: once a sitting, each running
 * hall with more than one recipe is set on the recipe whose input grades the bays hold
 * the most worth of at usual prices, when that is over twice the current recipe's (no switching back and forth on a small
 * difference); the boss walks to the hall's plot and presses the card's recipe (actionsWorks.ts setPlateRecipe, the charge
 * confirmed back to its bays). Refused presses are recorded.
 */
function recipeHabit(b: Bot): boolean {
  if (!b.opts.pinRecipe) return false;
  const s = b.g.salvage;
  const c = C(b);
  for (const [id, w] of Object.entries(s.works)) {
    const d = c.works?.plates[id];
    const recs = Object.entries(d?.recipes ?? {});
    if (!d || !w.heat || w.phase !== 'running' || recs.length < 2) continue;
    if (!s2Note(b, `recipe:${id}:${b.sitting}`)) continue;
    const worth = (ins: string[]) => ins.reduce((a, gr) => a + (s.bays[gr]?.g ?? 0) * vpk(c, gr), 0);
    const cur = d.recipes?.[w.heat.recipe];
    const best = recs.sort((a, q) => worth(q[1].in) - worth(a[1].in))[0];
    if (!best || best[0] === w.heat.recipe || worth(best[1].in) <= 2 * (cur ? worth(cur.in) : 0) + 1e-9) continue;
    react(b, `recipe ${id}`);
    walk(b, placeSpot(b, d.plot));
    stand(b, b.P.card);
    const ev: SalvageEvent[] = [];
    b.g = setPlateRecipe(b.cfg, b.g, id, best[0] as never, true, b.g.salvage.t, ev);
    b.ev.push(...ev);
    const r = ev.find((e) => e.type === 'refused');
    if (r && r.type === 'refused') b.rec.refused.push({ t: b.g.salvage.t, key: r.key, what: `setPlateRecipe ${id} ${best[0]}` });
    observe(b);
    return true;
  }
  return false;
}

/** The station plate a car on the pad can be set on now (the forklift owned and empty, the plate running, its apron free), or null. */
function forkliftPlate(b: Bot): string | null {
  const s = b.g.salvage;
  const f = s.forklift;
  if (!f || f.load.length || !s.things.some((th) => th.at.at === 'elvPad' && !th.by)) return null;
  const c = C(b);
  for (const [id, w] of Object.entries(s.works)) {
    const d = c.works?.plates[id];
    if (w.phase !== 'running' || !d || d.kind !== 'station' || d.feedBy !== 'forklift') continue;
    if (s.things.some((th) => th.at.at === 'apron' && th.at.plate === id)) continue;
    return id;
  }
  return null;
}

/**
 * REPORT9 (the bots drive the forklift; RULING2.md 21.1 measures the depollution chain): walk into the forklift (entering is
 * by walking near it), drive it to the car pad and stand (the forks lift the car), drive to the plate's apron and stand
 * (the car is set there and the bay starts), Step out.
 */
function forkliftLeg(b: Bot, plate: string): void {
  const c = C(b);
  const f = b.g.salvage.forklift!;
  react(b, 'forklift');
  if (!inForklift(b)) {
    travel(b, pathOf(graphFor(b), pos(b), { x: f.x, y: f.y }), c.walk / b.P.detour);
    stand(b, b.opts.standDt);
  }
  if (!inForklift(b)) return;
  const v = c.forklift?.v ?? c.walk;
  travel(b, pathOf(graphFor(b), pos(b), pointOf(c, 'elvPad')), v);
  stand(b, 1);
  if (b.g.salvage.forklift?.load.length) {
    travel(b, pathOf(graphFor(b), pos(b), pointOf(c, `${plate}.apron`)), v);
    stand(b, 1);
  }
  leaveForklift(b);
}

/** The start of a sitting (yard-bot.ts): once-a-sitting habits read it. */
export function newSitting(b: Bot): void {
  b.sitting += 1;
  b.sat = new Set([...b.sat].filter((k) => !/:\d+$/.test(k) && !k.startsWith('open:') && k !== 'backfield'));
}

void setRoute;

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
  const cash0 = b.g.cash;
  b.now += seconds * 1000;
  // Hard promise (8.3, stage 2): time away is paid once inside the state, and the card says what the cash moved by:
  // money (gross) − the bank's share − what was spent. The tick does the away pass first, then 0.1 s of live play
  // (tick.ts advanceSalvage); the bot makes the same two steps apart, so that the card is compared with the pass alone
  // (a load the driver hooks in that live tenth is not the card's). The state is the same bit for bit.
  const c = b.cfg.salvage;
  const dt = Math.max(0, Math.min(Math.max(MAX_TICK, c.away.gapS), b.opts.dt));
  // step() below ticks at now + dt: the tick's gap and its pass's end are measured from there (tick.ts advanceSalvage).
  const gapS = (b.now + dt * 1000 - (b.g.salvage.clock.highMs + dt * 1000)) / 1000;
  if (worksOpened(b.g.salvage) && gapS > c.away.gapS) {
    b.g = awayPass(b.cfg, b.g, b.now, b.ev);
    const card = b.g.salvage.away;
    if (card) {
      const moved = b.g.cash - cash0;
      const said = card.money - (card.bank ?? 0) - (card.spent ?? 0);
      if (Math.abs(moved - said) > 0.011) b.rec.broken.push({ t: b.g.salvage.t, what: `away card says ${said.toFixed(2)}, cash moved ${moved.toFixed(2)}` });
    }
  }
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

/** Play until `cond` holds or yard second `tMax` (the same decisions as playTo: a run stopped here and continued is the same run). */
export function playUntil(b: Bot, cond: (b: Bot) => boolean, tMax: number): void {
  let guard = 0;
  while (b.g.salvage.t < tMax && !cond(b) && guard++ < 200_000) {
    const t0 = b.g.salvage.t;
    decide(b);
    if (b.g.salvage.t <= t0 + 1e-9) stand(b, b.opts.standDt);
  }
}

/** A bot's play so far as plain data (yard-bot.ts --cache: runs that differ only from the works' opening share their first part). */
export interface BotSnap {
  g: SalvageGame;
  now: number;
  k: number;
  standing: number;
  rec: BotRecord;
  known: string[];
  lastGoal: string | null;
  lastMinute: number;
  heldDay: number | null;
  managing: boolean;
  sitting: number;
  sat: string[];
  /** R4's guard (absent in an older snapshot: none). */
  fruitless?: { what: string; n: number };
  blocked?: Record<string, number>;
}
export function snapBot(b: Bot): BotSnap {
  return JSON.parse(JSON.stringify({ g: b.g, now: b.now, k: b.k, standing: b.standing, rec: b.rec, known: [...b.known], lastGoal: b.lastGoal, lastMinute: b.lastMinute, heldDay: b.heldDay, managing: b.managing, sitting: b.sitting, sat: [...b.sat], fruitless: b.fruitless, blocked: b.blocked })) as BotSnap;
}
/** A bot with `opts` resumed from a snapshot (the state is data: the content may be another variant's). */
export function resumeBot(cfg: SalvageConfig, snap: BotSnap, opts: BotOptions): Bot {
  const b = newBot(cfg, snap.g, snap.now, opts);
  Object.assign(b, { k: snap.k, standing: snap.standing, rec: snap.rec, known: new Set(snap.known), lastGoal: snap.lastGoal, lastMinute: snap.lastMinute, heldDay: snap.heldDay, managing: snap.managing, sitting: snap.sitting, sat: new Set(snap.sat), fruitless: snap.fruitless ?? { what: '', n: 0 }, blocked: { ...(snap.blocked ?? {}) } });
  return b;
}

export { ratedCapacity };
