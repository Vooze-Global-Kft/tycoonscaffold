/**
 * What a tick does (2.5, `EngineMode.tick`). Package P1b (docs/design/office-build-plan.md).
 *
 * cash += I × dt exactly: between two events cash is `cash + I × (t − at)` from the last event (the
 * state's `cashAnchor`), never a sum of frames. The events of (clock, clock + dt], each at its own time:
 * - the take-back's 2 s: a pending paper commits at `pending.until` (decide.ts `commitPending`, P1a);
 * - an arrival at `nextArrivalAt` while governing and the tray has room (draw.ts `drawNext`, P1a); the
 *   next comes τ after it (also when the draw had nothing to bring: the visitor simply did not come);
 *   with a full tray the arrival clock stops (null) and the next paper comes τ after a place frees; no
 *   ordinary arrivals during the run-up, the count and the result;
 * - in the run-up, `nextArrivalAt` brings the K campaign papers τ apart and then the rally (2.10;
 *   draw.ts `drawCampaignPaper`, `drawRally`; the first came at the call, term.ts);
 * - the slip's 1.0 s: a budget slip lands slipDelay after the desk and the tray became empty
 *   (`emptySince`), or later at the moment cash first pays a purchase above what a slip keeps back
 *   (advice.ts `slipNeed`; slips.ts `slipFor`, P1a, carries it);
 * - the Standing Order (5.10): it buys the advised level at the moment cash reaches 3 × its price plus
 *   the reserve (grants.ts); never while away (the away rules never tick).
 * Nothing else moves with time. Every event time follows from the state and the anchor alone, never
 * from where a tick ends, so tick(a + b) = tick(a) then tick(b) bit for bit (tick.split.test.ts); the
 * bot steps from event to event with `nextStop`. Events due at the same moment run in the order
 * above. An event its rule refuses (the other package's function returns the same object) is not
 * retried in the same tick.
 *
 * SEAM, what it calls of P1a: draw.ts `drawNext`, `landNext`, `drawCampaignPaper`, `drawRally`,
 * slips.ts `slipFor`, decide.ts `commitPending`, params.ts `decreeParams`. The tick books its dibs
 * exactly as commitCash would (runEarnings, lifetimeEarnings, the rules' book under 'tick'), from
 * the anchor, so the books are exact too.
 */
import { advice, slipNeed, standingOrderPick, reserveNow } from './advice';
import { commitPending } from './decide';
import { drawCampaignPaper, drawNext, drawRally, landNext } from './draw';
import { standingOrderActive, standingOrderStep } from './grants';
import { standIn } from './notBuilt';
import { decreeParams } from './params';
import { slipFor } from './slips';
import { MAX_TICK, type CashAnchor, type DecreeConfig, type DecreeEvent, type DecreeGame, type Paper } from './types';

/** Events one tick may run before it stops (a guard against a rule that re-arms itself at one time; never reached by the rules). */
export const MAX_EVENTS_PER_TICK = 100_000;

/** The kinds of timed event, in the order they run when due at the same moment. */
export const TICK_EVENTS = ['pending', 'campaign', 'arrival', 'slip', 'order'] as const;
export type TickEvent = (typeof TICK_EVENTS)[number];

const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/** Cash at play time `t` from the anchor. */
export function cashAt(a: CashAnchor, t: number): number {
  return a.cash + a.I * (t - a.at);
}

/** The state paid up to play time `t` from the anchor, with the clock at `t` (cash, the run's and lifetime earnings, the 'tick' book). */
function payTo(g: DecreeGame, a: CashAnchor, t: number): DecreeGame {
  const gain = a.I * (t - a.at);
  const stats = g.decree.stats;
  const book = { ...(stats.book ?? {}), tick: a.book + gain };
  return {
    ...g,
    cash: a.cash + gain,
    runEarnings: a.run + gain,
    lifetimeEarnings: a.life + gain,
    stats: g.stats.playSeconds === t ? g.stats : { ...g.stats, playSeconds: t },
    decree: { ...g.decree, stats: { ...stats, book } },
  };
}

const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/**
 * The anchor of `g` at its clock: kept when the state is still exactly what it says (nothing changed
 * cash, the books or I since), else a new one at the clock (an action, a load, the store's away pay).
 */
export function anchorOf(cfg: DecreeConfig, g: DecreeGame, I: number = decreeParams(cfg, g).I): CashAnchor {
  const t = g.stats.playSeconds;
  const a = g.decree.cashAnchor;
  const bookTick = g.decree.stats.book?.tick ?? 0;
  if (a && finite(a.at) && finite(a.cash) && finite(a.run) && finite(a.life) && finite(a.book) && finite(a.I) && a.at <= t && a.I === I) {
    const gain = a.I * (t - a.at);
    if (a.cash + gain === g.cash && a.run + gain === g.runEarnings && a.life + gain === g.lifetimeEarnings && a.book + gain === bookTick) return a;
  }
  return { at: t, cash: g.cash, run: g.runEarnings, life: g.lifetimeEarnings, book: bookTick, I: Math.max(0, finite(I) ? I : 0) };
}

/** The earliest play time at which cash reaches `need` from the anchor (the anchor's time when it already has; Infinity at I = 0). */
export function timeCashReaches(a: CashAnchor, need: number): number {
  if (a.cash >= need) return a.at;
  if (!(a.I > 0) || !Number.isFinite(need)) return Infinity;
  let t = a.at + (need - a.cash) / a.I;
  for (let k = 0; k < 64 && cashAt(a, t) < need; k++) t += Math.max(Math.abs(t) * Number.EPSILON, Number.MIN_VALUE);
  return t;
}

/** The rules that restart by themselves at play time `t` (the arrival clock after a place freed, the empty desk's moment) and the anchor. */
function settle(cfg: DecreeConfig, g: DecreeGame, t: number): DecreeGame {
  let x = g;
  const d = x.decree;
  const full = d.tray.length >= cfg.decree.desk.trayCap;
  // The arrival clock stops at a full tray (2.5) and starts τ after a place frees.
  if (d.phase === 'governing' && full && d.nextArrivalAt !== null) x = withDecree(x, { nextArrivalAt: null });
  else if (d.phase === 'governing' && d.nextArrivalAt === null && !full) x = withDecree(x, { nextArrivalAt: t + decreeParams(cfg, x).tau });
  const e = x.decree;
  if (!e.desk && !e.tray.length && !e.pending && e.emptySince === null && (e.phase === 'governing' || e.phase === 'campaign')) x = withDecree(x, { emptySince: t });
  const a = anchorOf(cfg, x);
  return x.decree.cashAnchor === a ? x : withDecree(x, { cashAnchor: a });
}

/** The time of each timed event of a settled state (Infinity when it is not due), before the clock applies. */
function eventTimes(cfg: DecreeConfig, g: DecreeGame): Record<TickEvent, number> {
  const d = g.decree;
  const a = d.cashAnchor ?? anchorOf(cfg, g);
  const out: Record<TickEvent, number> = { pending: Infinity, campaign: Infinity, arrival: Infinity, slip: Infinity, order: Infinity };
  if (d.pending) out.pending = d.pending.until;
  if (d.phase === 'campaign' && d.nextArrivalAt !== null) out.campaign = d.nextArrivalAt;
  if (d.phase === 'governing' && d.nextArrivalAt !== null && d.tray.length < cfg.decree.desk.trayCap) out.arrival = d.nextArrivalAt;
  const live = d.phase === 'governing' || d.phase === 'campaign';
  if (live && !d.desk && !d.tray.length && !d.pending && d.emptySince !== null) {
    const need = slipNeed(cfg, g);
    if (need !== null) out.slip = Math.max(d.emptySince + cfg.decree.desk.slipDelay, timeCashReaches(a, need));
  }
  if (live && standingOrderActive(cfg, g)) {
    const pick = standingOrderPick(cfg, g);
    if (pick) out.order = timeCashReaches(a, cfg.decree.standingOrder.times * pick.price + reserveNow(cfg, g));
  }
  return out;
}

/** The next event to run in [clock, end] (a due event runs at the clock), or null. */
function nextEvent(cfg: DecreeConfig, g: DecreeGame, end: number, blocked: ReadonlySet<TickEvent>): { kind: TickEvent; at: number } | null {
  const clock = g.stats.playSeconds;
  const times = eventTimes(cfg, g);
  let best: { kind: TickEvent; at: number } | null = null;
  for (const kind of TICK_EVENTS) {
    if (blocked.has(kind)) continue;
    const at = Math.max(clock, times[kind]);
    if (at <= end && (best === null || at < best.at)) best = { kind, at };
  }
  return best;
}

/** A run-up paper arrives (2.10): a slip lying on the desk goes back, the paper waits behind what is there, and lands on a free desk. */
function arriveRunUp(cfg: DecreeConfig, g: DecreeGame, paper: Paper, t: number, events: DecreeEvent[]): DecreeGame {
  let x = g;
  if (x.decree.desk?.type === 'slip') {
    events.push({ type: 'slipReturned' });
    x = withDecree(x, { desk: null });
  }
  x = withDecree(x, { tray: [...x.decree.tray, paper] });
  if (!x.decree.desk && !x.decree.pending) return landNext(cfg, x, t, events);
  events.push({ type: 'paperArrived', paper: paper.id, toDesk: false });
  return x;
}

/** The next campaign paper or the rally (2.10), with the run-up's clock moved on. */
export function runUpArrival(cfg: DecreeConfig, g: DecreeGame, t: number, events: DecreeEvent[]): DecreeGame {
  const c = g.decree.campaign;
  if (!c) return withDecree(g, { nextArrivalAt: null });
  const K = cfg.decree.offices[g.decree.office].campaignPapers;
  if (c.papersLeft > 0) {
    const r = drawCampaignPaper(cfg, g, K - c.papersLeft, events);
    const x = withDecree(r.g, { campaign: { ...c, papersLeft: c.papersLeft - 1 }, nextArrivalAt: t + decreeParams(cfg, r.g).tau });
    return arriveRunUp(cfg, x, r.paper, t, events);
  }
  if (!c.rallyDone) {
    const r = drawRally(cfg, g, events);
    const x = withDecree(r.g, { campaign: { ...c, rallyDone: true }, nextArrivalAt: null });
    return arriveRunUp(cfg, x, r.paper, t, events);
  }
  return withDecree(g, { nextArrivalAt: null });
}

/** One timed event at play time `t` (the state already paid up to `t`). */
function runEvent(cfg: DecreeConfig, g: DecreeGame, kind: TickEvent, t: number, events: DecreeEvent[]): DecreeGame {
  switch (kind) {
    case 'pending':
      return standIn(commitPending, () => commitPending(cfg, g, t, events), () => g);
    case 'campaign':
      return runUpArrival(cfg, g, t, events);
    case 'arrival': {
      const x = drawNext(cfg, g, t, events);
      const room = x.decree.phase === 'governing' && x.decree.tray.length < cfg.decree.desk.trayCap;
      return withDecree(x, { nextArrivalAt: room ? t + decreeParams(cfg, x).tau : null });
    }
    case 'slip': {
      const slip = standIn(slipFor, () => slipFor(cfg, g), () => advice(cfg, g).slip);
      if (!slip) return g;
      events.push({ type: 'slipArrived' });
      return withDecree(g, { desk: { type: 'slip', slip, landedAt: t }, emptySince: null, slipOffered: true });
    }
    case 'order':
      return standingOrderStep(cfg, g, events);
  }
}

/**
 * Advances the game by `dt` seconds of play (EngineMode.tick, cut to [0, MAX_TICK]), adding
 * `stats.playSeconds` itself: every timed event of (clock, clock + dt] at its own time, cash exact from
 * the anchor between them. `now` (the wall clock) is not read. Built.
 */
export function advanceDecree(cfg: DecreeConfig, g: DecreeGame, dt: number, now: number, events?: DecreeEvent[]): DecreeGame {
  void now;
  const step = Math.min(MAX_TICK, Math.max(0, Number.isFinite(dt) ? dt : 0));
  if (step <= 0) return g;
  const ev = events ?? [];
  const end = g.stats.playSeconds + step;
  let x = settle(cfg, g, g.stats.playSeconds);
  const blocked = new Set<TickEvent>();
  for (let n = 0; n < MAX_EVENTS_PER_TICK; n++) {
    const e = nextEvent(cfg, x, end, blocked);
    if (!e) break;
    const paid = payTo(x, x.decree.cashAnchor!, e.at);
    const after = runEvent(cfg, paid, e.kind, e.at, ev);
    if (after === paid) blocked.add(e.kind);
    else blocked.clear();
    x = settle(cfg, after, e.at);
  }
  return payTo(x, x.decree.cashAnchor!, end);
}

/** "Next visitor 0:07" on the door glass (3.1, 5.1): seconds of play until the next arrival, or null while the arrival clock is stopped. Built. */
export function nextVisitorIn(cfg: DecreeConfig, g: DecreeGame): number | null {
  const d = g.decree;
  if (d.nextArrivalAt === null || (d.phase === 'governing' && d.tray.length >= cfg.decree.desk.trayCap)) return null;
  return Math.max(0, d.nextArrivalAt - g.stats.playSeconds);
}

/**
 * The play-clock time of the next thing that happens by itself (a pending commit, an arrival or a
 * run-up paper, a slip, the Standing Order), strictly after the clock, or null: the bot steps to it
 * (`advanceDecree(cfg, g, stop − clock, …)` then runs exactly what a 10 Hz run runs up to `stop`; an
 * event due at the clock itself runs first in that same tick). Built.
 */
export function nextStop(cfg: DecreeConfig, g: DecreeGame): number | null {
  const clock = g.stats.playSeconds;
  const x = settle(cfg, g, clock);
  const times = eventTimes(cfg, x);
  let best: number | null = null;
  for (const kind of TICK_EVENTS) {
    const t = times[kind];
    if (t > clock && Number.isFinite(t) && (best === null || t < best)) best = t;
  }
  return best;
}
