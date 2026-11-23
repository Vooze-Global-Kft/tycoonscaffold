/**
 * The tick's event queue (spec 2.4 with Decision M22): the next due event over (clock, clock + dt]
 * and what each one does. Events run strictly in time order, ties broken by (time, kind, index) in
 * the order of `EVENT_KINDS`, except that shelf releases at one time go to the HIGHEST open chain
 * first (M22: when several shelves wait for the same freed cell). Every follow-up time is computed
 * from the event's own time, never from the end of the tick, so tick(a + b) equals tick(a) then
 * tick(b) exactly.
 *
 * Eligible times (2.4): a release or gift placement that found no room (F = 0, or the loose cap)
 * records `blockedAt` and is due again at `freedAt` once `freedAt` > `blockedAt`; an empty counter
 * whose draw found no ticket records `blockedAt` and is due again at `changedAt` once `changedAt` >
 * `blockedAt`. A player action between ticks sets these to the current clock, so such an event can
 * be due at the clock itself: `nextEvent` reports it at the clock (it runs first in the next tick).
 *
 * The Parade (event 7): it is due while season clock ≥ `paradeAt` and no gold ticket is out; the
 * counter whose refill comes next draws it (event 6). The event itself only wakes a counter that
 * sat in "Setting up…" from before the Parade fell due, so it gets its draw now.
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: a refill calls ORDERS's `drawTicket`
 * and `drawParade` (./draw.ts; advancing `draws.ticket` or `draws.parade` by `used`, giving the
 * ticket `nextTicketId`); the till roll books coins through `commitCash` (./actions.ts). The draw
 * counts (`mstats.ticketsDrawn`, `mstats.setups`) are booked here, because a draw returns an outcome,
 * not a state.
 */
import { commitCash } from './actions';
import { dropCell, freeCells, isGood, placeGood } from './board';
import { drawParade, drawTicket } from './draw';
import { noteMade } from './drop';
import { currentMods } from './lanterns';
import { baseTier, ripeChance, saleAmount, saleInterval, streamValue } from './params';
import { CHAINS, EVENT_KINDS, type DrawOutcome, type EventKind, type Good, type MergeConfig, type MergeEvent, type MergeGame, type MergeState, type Mods, type QueuedEvent } from './types';

const KIND_ORDER: Record<EventKind, number> = Object.fromEntries(EVENT_KINDS.map((k, i) => [k, i])) as Record<EventKind, number>;

/** The tie key of an event's index: releases go highest chain first (M22), every other kind lowest index first. */
const indexKey = (e: QueuedEvent) => (e.kind === 'release' ? -e.index : e.index);

/** Whether event a runs before event b. */
export function before(a: QueuedEvent, b: QueuedEvent): boolean {
  if (a.at !== b.at) return a.at < b.at;
  if (a.kind !== b.kind) return KIND_ORDER[a.kind] < KIND_ORDER[b.kind];
  return indexKey(a) < indexKey(b);
}

/** A good of chain c at tier k is "loose" when b_c ≤ k ≤ b_c + 1 (2.3). */
function isLoose(cfg: MergeConfig, m: MergeState, c: number, k: number): boolean {
  const b = baseTier(cfg, m.chains[c].gear);
  return k >= b && k <= b + 1;
}

/** Loose_c (2.3). */
function loose(cfg: MergeConfig, m: MergeState, c: number): number {
  const b = baseTier(cfg, m.chains[c].gear);
  let n = 0;
  for (const cell of m.board) if (isGood(cell) && cell.c === c && cell.k >= b && cell.k <= b + 1) n++;
  return n;
}

/** Decision M50: with `gear.spare` set the board fills to its last `spare` cells whatever the chain (no loose cap). */
const fillFlow = (cfg: MergeConfig): boolean => cfg.merge.gear.spare !== undefined;

/**
 * Room for a good of (c, k) by the drop rules (2.4 events 1 to 3). With the loose cap (M43): F > 0, and
 * below the cap when the good is loose. With M50's flow: a good from a gear (a drop or a shelf release)
 * needs more than `spare` free cells; a gift good may take any free cell (the spare cells are the hand's).
 */
function roomForGood(cfg: MergeConfig, m: MergeState, c: number, k: number, fromGear = true): boolean {
  const F = freeCells(m).length;
  if (F === 0) return false;
  if (fillFlow(cfg)) return !fromGear || F > (cfg.merge.gear.spare ?? 0);
  return !isLoose(cfg, m, c, k) || loose(cfg, m, c) < cfg.merge.gear.looseCap;
}

/** M50: among shelf releases due at the same time, the chain with the fewest loose goods on the board goes first (ties: the higher chain). */
function beforeByFlow(cfg: MergeConfig, m: MergeState, a: QueuedEvent, b: QueuedEvent): boolean {
  if (fillFlow(cfg) && a.at === b.at && a.kind === 'release' && b.kind === 'release') {
    const la = loose(cfg, m, a.index);
    const lb = loose(cfg, m, b.index);
    if (la !== lb) return la < lb;
  }
  return before(a, b);
}

/** The time a retry is due: the first freed (or changed) time after it was blocked, else never. */
const retryAt = (blockedAt: number, clockAt: number) => (clockAt > blockedAt ? clockAt : null);

/** The absolute game-clock time the Parade falls due. */
export const paradeDueAt = (m: MergeState) => m.seasonStartedAt + m.paradeAt;
/** A gold ticket is out at some counter. */
export const paradeOut = (m: MergeState) => m.counters.some((ct) => ct.ticket?.gold);
/** The Parade is due at game clock `t` (2.7): season clock ≥ paradeAt and none is out. */
export const paradeDue = (m: MergeState, t: number) => !paradeOut(m) && t >= paradeDueAt(m);

/** The first pending gift good whose chain is open (a good of a chain not yet open waits for it, 2.11). */
function pendingIndex(m: MergeState): number {
  return m.gift.pendingGoods.findIndex((gd) => m.chains[gd.c]?.open);
}

/**
 * Every event of the queue with its time (overdue ones at the clock), unsorted. Pure; for
 * `nextEvent`, the tests and the bot.
 */
export function dueEvents(cfg: MergeConfig, g: MergeGame): QueuedEvent[] {
  const m = g.merge;
  const clock = g.stats.playSeconds ?? 0;
  const out: QueuedEvent[] = [];
  const push = (at: number | null, kind: EventKind, index: number) => {
    if (at === null || !Number.isFinite(at)) return;
    out.push({ at: Math.max(at, clock), kind, index });
  };
  for (let c = 0; c < CHAINS; c++) {
    const ch = m.chains[c];
    if (!ch?.open) continue;
    if (!ch.waiting) push(ch.nextPopAt, 'drop', c);
    if (ch.shelf.length) push(ch.blockedAt !== null ? retryAt(ch.blockedAt, m.freedAt) : ch.releaseAt ?? clock, 'release', c);
    if (ch.minder > 0) push(ch.nextSaleAt, 'sale', c);
  }
  if (m.gift.pendingGoods.length) push(m.gift.blockedAt !== null ? retryAt(m.gift.blockedAt, m.freedAt) : m.gift.nextAt ?? clock, 'giftGood', 0);
  push(m.tillAt, 'till', 0);
  m.counters.forEach((ct, j) => {
    if (ct.ticket) return;
    push(ct.blockedAt !== null ? retryAt(ct.blockedAt, m.changedAt) : ct.refillAt, 'refill', j);
  });
  if (!paradeOut(m)) {
    const due = paradeDueAt(m);
    const j = m.counters.findIndex((ct) => !ct.ticket && ct.blockedAt !== null && ct.blockedAt < due);
    if (j >= 0) push(due, 'parade', j);
  }
  if (m.basketUndo) push(m.basketUndo.until, 'expiry', 0);
  return out;
}

/** The earliest due event at or before `until` (game clock), or null; an overdue event is reported at the clock. */
export function nextEvent(cfg: MergeConfig, g: MergeGame, until: number): QueuedEvent | null {
  let best: QueuedEvent | null = null;
  for (const e of dueEvents(cfg, g)) if (e.at <= until && (!best || beforeByFlow(cfg, g.merge, e, best))) best = e;
  return best;
}

// ----------------------------------------------------------------------------- the events

const withM = (g: MergeGame, m: MergeState): MergeGame => ({ ...g, merge: m });
const setChain = (m: MergeState, c: number, patch: Partial<MergeState['chains'][number]>): MergeState => ({ ...m, chains: m.chains.map((ch, i) => (i === c ? { ...ch, ...patch } : ch)) });

/** The tier of chain c's next drop from the drop stream (2.3: n = that chain's drops, x = c): b + 1 with probability p, else b. */
export function drawDropTier(cfg: MergeConfig, m: MergeState, mods: Pick<Mods, 'ripeAdd'>, c: number, n: number): number {
  const L = m.chains[c].gear;
  const b = baseTier(cfg, L);
  return streamValue(m, 'drop', n, c) < ripeChance(cfg, mods, L) ? b + 1 : b;
}

/** Places a good of chain c at its drop cell at time t and notes it as made. null when no cell is free. */
function placeMade(cfg: MergeConfig, g: MergeGame, good: Good, t: number, events?: MergeEvent[]): { g: MergeGame; cell: number } | null {
  const placed = placeGood(g.merge, good, t);
  if (!placed) return null;
  return { g: noteMade(cfg, withM(g, placed.m), good, events), cell: placed.cell };
}

/** 2.4 event 1: a gear drop. Exported for the away stepping of offline.ts (board frozen: `shelveOnly`). */
export function runDrop(cfg: MergeConfig, g: MergeGame, c: number, t: number, events?: MergeEvent[], shelveOnly = false): MergeGame {
  let m = g.merge;
  const ch = m.chains[c];
  const mods = currentMods(cfg, m);
  const T = cfg.merge.gear.interval;
  const n = m.draws.drop[c] ?? 0;
  const k = drawDropTier(cfg, m, mods, c, n);
  const counted = (mm: MergeState): MergeState => ({ ...mm, draws: { ...mm.draws, drop: mm.draws.drop.map((v, i) => (i === c ? n + 1 : v)) }, mstats: { ...mm.mstats, drops: mm.mstats.drops + 1 } });
  if (!shelveOnly && (fillFlow(cfg) ? freeCells(m).length > (cfg.merge.gear.spare ?? 0) : freeCells(m).length > 0 && loose(cfg, m, c) < cfg.merge.gear.looseCap)) {
    const r = placeMade(cfg, withM(g, counted(m)), { c, k }, t, events);
    if (r) {
      events?.push({ type: 'drop', c, k, cell: r.cell });
      return withM(r.g, setChain(r.g.merge, c, { nextPopAt: t + T }));
    }
  }
  if (ch.shelf.length < mods.shelfCap) {
    m = counted(m);
    // The good goes to the shelf because it found no room: its release waits for a freed cell.
    const patch = ch.shelf.length === 0 && !shelveOnly ? { blockedAt: t, releaseAt: null } : {};
    events?.push({ type: 'shelved', c, k });
    return withM(g, setChain(m, c, { ...patch, shelf: ch.shelf.concat(k), nextPopAt: t + T }));
  }
  // The shelf is full: the gear waits (no next drop, the drawn tier is not used, the stream does not move).
  events?.push({ type: 'gearWaiting', c });
  return withM(g, setChain(m, c, { waiting: true }));
}

/** 2.4 event 2: a shelf release; a waiting gear restarts. */
function runRelease(cfg: MergeConfig, g: MergeGame, c: number, t: number, events?: MergeEvent[]): MergeGame {
  const m = g.merge;
  const ch = m.chains[c];
  const k = ch.shelf[0];
  if (k === undefined) return withM(g, setChain(m, c, { releaseAt: null, blockedAt: null }));
  if (!roomForGood(cfg, m, c, k)) return withM(g, setChain(m, c, { blockedAt: t, releaseAt: null }));
  const r = placeMade(cfg, g, { c, k }, t, events);
  if (!r) return withM(g, setChain(m, c, { blockedAt: t, releaseAt: null }));
  const shelf = ch.shelf.slice(1);
  const restart = ch.waiting ? { waiting: false, nextPopAt: t + cfg.merge.gear.interval } : {};
  events?.push({ type: 'released', c, k, cell: r.cell });
  return withM(r.g, setChain(r.g.merge, c, { ...restart, shelf, releaseAt: shelf.length ? t + cfg.merge.gear.release : null, blockedAt: null }));
}

/** 2.4 event 3: the first pending gift good whose chain is open; the next is due 0.5 s later. */
function runGiftGood(cfg: MergeConfig, g: MergeGame, t: number, events?: MergeEvent[]): MergeGame {
  const m = g.merge;
  const blocked = () => withM(g, { ...m, gift: { ...m.gift, blockedAt: t, nextAt: null } });
  const i = pendingIndex(m);
  if (i < 0) return blocked();
  const good = m.gift.pendingGoods[i];
  if (!roomForGood(cfg, m, good.c, good.k, false) || dropCell(m, good.c) === null) return blocked();
  const r = placeMade(cfg, g, good, t, events);
  if (!r) return blocked();
  const pendingGoods = r.g.merge.gift.pendingGoods.filter((_, j) => j !== i);
  events?.push({ type: 'giftGoodPlaced', good, cell: r.cell });
  return withM(r.g, { ...r.g.merge, gift: { ...r.g.merge.gift, pendingGoods, nextAt: pendingGoods.length ? t + cfg.merge.gear.release : null, blockedAt: null } });
}

/** 2.4 event 4: a minder sale into the till. Exported for the away stepping (`toTill` false: the coins are the away earnings). */
export function runSale(cfg: MergeConfig, g: MergeGame, c: number, t: number, events?: MergeEvent[], toTill = true): { g: MergeGame; coins: number } {
  const coins = saleAmount(cfg, g, c);
  const m = g.merge;
  const next = setChain(m, c, { nextSaleAt: t + saleInterval(cfg, currentMods(cfg, m)) });
  events?.push({ type: 'sale', c, coins });
  return { g: withM(g, toTill ? { ...next, till: next.till + coins } : next), coins };
}

/** 2.4 event 5: the till joins the purse at each whole minute of the season clock. */
function runTill(cfg: MergeConfig, g: MergeGame, t: number, events?: MergeEvent[]): MergeGame {
  const m = g.merge;
  let x = withM(g, { ...m, till: 0, tillAt: m.tillAt + cfg.merge.minders.tillRoll });
  if (m.till > 0) {
    x = commitCash(x, m.till, 'till');
    events?.push({ type: 'tillRoll', coins: m.till });
  }
  void t;
  return x;
}

/**
 * Draws a ticket for empty counter j at time t and seats it: the Parade when it is due and none is
 * out (a Parade that cannot be drawn leaves it due and the counter draws an ordinary ticket), else
 * an ordinary draw; none at all is "Setting up…" (retried at the next board change). Exported for
 * "Call the dragon" (actions.ts) with `forceParade`.
 */
export function seatTicket(cfg: MergeConfig, g: MergeGame, j: number, t: number, events?: MergeEvent[], forceParade = false): MergeGame {
  let m = g.merge;
  let outcome: DrawOutcome | null = null;
  if (forceParade || paradeDue(m, t)) {
    outcome = drawParade(cfg, g, j);
    m = { ...m, draws: { ...m.draws, parade: m.draws.parade + Math.max(0, outcome.used) } };
  }
  if (!outcome?.ticket) {
    if (forceParade) return g;
    outcome = drawTicket(cfg, withM(g, m), j);
    m = { ...m, draws: { ...m.draws, ticket: m.draws.ticket + Math.max(0, outcome.used) } };
  }
  const drawn = outcome.ticket;
  if (!drawn) {
    events?.push({ type: 'settingUp', counter: j });
    m = { ...m, counters: m.counters.map((ct, i) => (i === j ? { ...ct, ticket: null, refillAt: null, blockedAt: t } : ct)), mstats: { ...m.mstats, setups: m.mstats.setups + 1 } };
    return withM(g, m);
  }
  const ticket = { ...drawn, id: m.nextTicketId };
  m = {
    ...m,
    nextTicketId: m.nextTicketId + 1,
    counters: m.counters.map((ct, i) => (i === j ? { ...ct, ticket, refillAt: null, blockedAt: null } : ct)),
    mstats: { ...m.mstats, ticketsDrawn: m.mstats.ticketsDrawn + 1 },
  };
  events?.push({ type: 'ticketDrawn', counter: j, ticket });
  if (ticket.gold) events?.push({ type: 'paradeArrive', counter: j });
  return withM(g, m);
}

/** Runs one event at its own time `e.at` (the caller has moved the clock to it). */
export function runEvent(cfg: MergeConfig, g: MergeGame, e: QueuedEvent, events?: MergeEvent[]): MergeGame {
  const t = e.at;
  const m = g.merge;
  switch (e.kind) {
    case 'drop':
      return runDrop(cfg, g, e.index, t, events);
    case 'release':
      return runRelease(cfg, g, e.index, t, events);
    case 'giftGood':
      return runGiftGood(cfg, g, t, events);
    case 'sale':
      return runSale(cfg, g, e.index, t, events).g;
    case 'till':
      return runTill(cfg, g, t, events);
    case 'refill':
      return m.counters[e.index] && !m.counters[e.index].ticket ? seatTicket(cfg, g, e.index, t, events) : g;
    case 'parade':
      // Wake the counter that sat in "Setting up…" from before the Parade fell due: it draws now.
      return withM(g, { ...m, counters: m.counters.map((ct, i) => (i === e.index ? { ...ct, blockedAt: null, refillAt: t } : ct)) });
    case 'expiry': {
      const u = m.basketUndo;
      if (!u) return g;
      events?.push({ type: 'undoExpired', cell: u.cell });
      return withM(g, { ...m, basketUndo: null, freedAt: t, changedAt: t });
    }
    default:
      return g;
  }
}
