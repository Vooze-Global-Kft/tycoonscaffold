/**
 * Tickets: the draw, the bounds, the fallback, the Parade and the scripted start (spec 2.7 with
 * decisions M4, M18 and M26).
 *
 * Package ORDERS (docs/design/market-build-plan.md). Seam: MECHANICS calls `drawTicket` (a counter's
 * refill, 2.4 event 6) and advances `draws.ticket` by `used`; `drawParade` (a refill while a Parade
 * is due and none is out, and the "Call the dragon" ad) draws from the Parade stream, so the caller
 * advances `draws.parade` by its `used`; `scriptedTicket` (create() and the first merge of a new
 * game). Both draws give the ticket `nextTicketId`. This file reads `missingDetail()`
 * (./missing.ts), `mergeParams` and `streamValue` (./params.ts) and nothing else of the state's
 * machinery: the draw has no room check of its own (bound (c) is over O, the cells that are open,
 * not over F; the one room check, `roomFor`, is the board's, ./board.ts).
 *
 * The bounds (2.7), checked on every draw and after every fallback step:
 * - (a) possible: every line has k ≤ min(8, best_c + 1), on an open chain;
 * - (b) output and hand: per chain on the ticket, the pops still needed by every open ticket's
 *   unfilled lines on that chain (the Parade's included) together with this ticket's, from one
 *   joint `missing()` over the goods at hand, × T/(1 + p_c) ≤ W; and this ticket's hand actions
 *   Σ (goods used + pops − 1 merges + 1 delivery) ≤ H;
 * - (c) space, over the whole board: Σ over the unfilled lines of every open ticket, this one
 *   included, of cells(k) = k − b_c + 1, + Σ_c min(λ, Loose_c), + R ≤ O;
 * - (d) = (d1) only (decision M4): every line has k ≥ b_c + 1. The scripted fox and hedgehog are
 *   exempt from (d) only.
 * Fallback: (1) lower the highest line that is above its kmin by one tier; (2) when no line can be
 * lowered, drop the last line and go on with (1); (3) when no line is left, redraw with one open
 * chain as the only chain (the next open chain after the first drawn line's, cyclically, the
 * first drawn chain last), each redraw going through (1) and (2); (4) no chain passes: "Setting
 * up…" (`ticket: null`), which the caller retries at the next board change (2.4 `changedAt`).
 */
import { missingDetail, goodsAtHand, popsNeeded } from './missing';
import { mergeParams, streamValue } from './params';
import type { DrawOutcome, Good, MergeConfig, MergeGame, MergeParams, MergeState, StreamSite, Ticket, TicketLine } from './types';

/**
 * The scripted opening tickets of 2.7 (a new game's first season only): the fox at counter 1 asks
 * for a Twin Skewer (grill 2); the hedgehog at counter 2, who steps up at the first merge, for a
 * Glazed Skewer (grill 3). Exempt from bound (d) only. The opening board's 6 Pepper Skewers
 * (decision M18) make both. Built.
 */
export function scriptedTicket(cfg: MergeConfig, which: 'fox' | 'hedgehog', id: number): Ticket {
  const beast = cfg.merge.tickets.customers.indexOf(which);
  return { id, lines: [{ c: 0, k: which === 'fox' ? 2 : 3, filled: false }], gold: false, customer: Math.max(0, beast), coat: 0, scripted: true };
}

// ----------------------------------------------------------------------------- the bounds

/** Which bounds a candidate breaks (all false: accepted). */
export interface BoundFailures {
  a: boolean;
  /** (b), the output part: some chain's queue × T/(1 + p) exceeds W. */
  bOutput: boolean;
  /** (b), the hand part: this ticket's hand actions exceed H. */
  bHand: boolean;
  c: boolean;
  d: boolean;
}

/** Everything a draw reads, computed once per draw. */
interface DrawContext {
  cfg: MergeConfig;
  m: MergeState;
  P: MergeParams;
  /** Open chains, ascending. */
  open: number[];
  /** Unfilled lines of every other counter's ticket (the Parade's included). */
  queue: Pick<TicketLine, 'c' | 'k'>[];
  goods: Good[];
  /** Σ_c min(λ, Loose_c) + Σ cells(k) of the queue + R: the cells (c) has used before this ticket. */
  cellsBefore: number;
  W: number;
  H: number;
  /** The stream this draw reads, and where it starts. */
  site: StreamSite;
  start: number;
  used: number;
}

/** cells(k) = k − b + 1 (a binary carry from drops of tier b needs at most that many cells at once); at least 1. */
const cellsOf = (k: number, base: number) => Math.max(1, k - base + 1);

function context(cfg: MergeConfig, g: MergeGame, counter: number, W: number, H: number, site: StreamSite, start: number): DrawContext {
  const m = g.merge;
  const P = mergeParams(cfg, g);
  const open: number[] = [];
  m.chains.forEach((ch, c) => ch.open && open.push(c));
  const queue: Pick<TicketLine, 'c' | 'k'>[] = [];
  m.counters.forEach((ct, j) => {
    if (j === counter || !ct.ticket) return;
    for (const l of ct.ticket.lines) if (!l.filled) queue.push({ c: l.c, k: l.k });
  });
  let cellsBefore = cfg.merge.tickets.spareCells;
  for (const l of queue) cellsBefore += cellsOf(l.k, P.chains[l.c]?.base ?? 1);
  for (const c of open) cellsBefore += Math.min(cfg.merge.gear.looseCap, P.chains[c].loose);
  return { cfg, m, P, open, queue, goods: goodsAtHand(m), cellsBefore, W, H, site, start, used: 0 };
}

/**
 * Checks a candidate's lines against (a) to (d) on the draw's context. `scripted` skips (d) only.
 * Exported for the tests through `checkBounds`.
 */
function check(ctx: DrawContext, lines: readonly Pick<TicketLine, 'c' | 'k'>[], scripted = false): BoundFailures {
  const { P, cfg } = ctx;
  const f: BoundFailures = { a: false, bOutput: false, bHand: false, c: false, d: false };
  let cells = ctx.cellsBefore;
  for (const l of lines) {
    const ch = P.chains[l.c];
    const best = ctx.m.chains[l.c]?.best ?? 0;
    if (!ch || !ch.open || !(l.k >= 1) || l.k > Math.min(8, best + 1)) f.a = true;
    if (!scripted && ch && l.k < ch.base + 1) f.d = true;
    cells += cellsOf(l.k, ch?.base ?? 1);
  }
  if (cells > P.O) f.c = true;
  if (f.a) return f;
  // (b): one joint missing() over the queue and this ticket (the queue first: on equal tiers the
  // waiting lines take the goods at hand before this one, the conservative order).
  const all = ctx.queue.concat(lines);
  const det = missingDetail(all, ctx.goods);
  const q = ctx.queue.length;
  const T = cfg.merge.gear.interval;
  const chainsOnTicket = new Set(lines.map((l) => l.c));
  for (const c of chainsOnTicket) {
    const ch = P.chains[c];
    let pops = 0;
    for (let i = 0; i < all.length; i++) {
      if (all[i].c !== c) continue;
      // A waiting line below the base tier (two base steps after its draw) cannot be helped by drops.
      if (all[i].k < ch.base) continue;
      pops += popsNeeded(det.units[i], ch.base);
    }
    if ((pops * T) / (1 + ch.ripe) > ctx.W + 1e-9) f.bOutput = true;
  }
  let hand = 0;
  for (let i = q; i < all.length; i++) hand += det.used[i] + popsNeeded(det.units[i], P.chains[all[i].c].base);
  if (hand > ctx.H + 1e-9) f.bHand = true;
  return f;
}

const fails = (f: BoundFailures) => f.a || f.bOutput || f.bHand || f.c || f.d;

/**
 * The bounds of 2.7 for `lines` as a new ticket at `counter` (the other counters' tickets are the
 * queue), with the ticket's W and H (the Parade's with `parade`). For the tests, the bot and the
 * hints; the draw uses the same check.
 */
export function checkBounds(cfg: MergeConfig, g: MergeGame, counter: number, lines: readonly Pick<TicketLine, 'c' | 'k'>[], opts: { parade?: boolean; scripted?: boolean } = {}): BoundFailures {
  const t = opts.parade ? cfg.merge.parade : cfg.merge.tickets;
  return check(context(cfg, g, counter, t.outputWindow, t.handActions, 'ticket', 0), lines, opts.scripted);
}

// ----------------------------------------------------------------------------- the draw

/** One step of a draw, for the tests and the measurements (`drawTicketTraced`). */
export interface DrawStep {
  step: 'draw' | 'lower' | 'dropLine' | 'redraw';
  lines: { c: number; k: number }[];
  failures: BoundFailures;
}

/** The next value of the draw's stream. */
function next(ctx: DrawContext): number {
  return streamValue(ctx.m, ctx.site, ctx.start + ctx.used++);
}

/** Picks an index by weight from a value in [0, 1). */
function pick(weights: readonly number[], v: number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = v * total;
  for (let i = 0; i < weights.length; i++) {
    if (x < weights[i]) return i;
    x -= weights[i];
  }
  return weights.length - 1;
}

/** kmin_c = b_c + 1 (bound (d1)). */
const kmin = (ctx: DrawContext, c: number) => ctx.P.chains[c].base + 1;

/**
 * One line's tier on chain c (2.7): k from kmin to best with P(k) ∝ γ^(k − kmin), or, with the
 * stretch chance, a stretch line at best + 1; when kmin > best the only candidate is best + 1 (the
 * H+1 rule). Always reads two stream values (the stretch roll, the tier), so a draw uses a fixed
 * number of values for its line count.
 */
function drawTier(ctx: DrawContext, c: number): number {
  const t = ctx.cfg.merge.tickets;
  const best = ctx.m.chains[c].best;
  const lo = kmin(ctx, c);
  const vStretch = next(ctx);
  const vTier = next(ctx);
  if (lo > best) return Math.min(8, best + 1);
  if (best + 1 <= 8 && vStretch < t.stretch) return best + 1;
  const weights: number[] = [];
  for (let k = lo; k <= best; k++) weights.push(Math.pow(t.gamma, k - lo));
  return lo + pick(weights, vTier);
}

/** The line count of a draw (2.7): early or late odds by the season clock; Harvest's 3-line share (mods) replaces the third and scales the others. One stream value. */
function drawCount(ctx: DrawContext, g: MergeGame): number {
  const t = ctx.cfg.merge.tickets;
  const seasonClock = g.stats.playSeconds - ctx.m.seasonStartedAt;
  let odds: number[] = (seasonClock < t.lateFrom ? t.lineOddsEarly : t.lineOddsLate).slice();
  const share = ctx.P.mods.threeLineShare;
  if (share !== null && share !== undefined) {
    const rest = odds[0] + odds[1];
    odds = rest > 0 ? [(odds[0] * (1 - share)) / rest, (odds[1] * (1 - share)) / rest, share] : [1 - share, 0, share];
  }
  return 1 + pick(odds, next(ctx));
}

/** The chain weights of 2.7: topChainWeight for the two highest open chains, 1 for the others. */
function chainWeights(ctx: DrawContext): number[] {
  const n = ctx.open.length;
  return ctx.open.map((_, i) => (i >= n - 2 ? ctx.cfg.merge.tickets.topChainWeight : 1));
}

/** Fallback steps (1) and (2) on `lines` (mutated copies), recording each step; the accepted lines or null. */
function settle(ctx: DrawContext, lines: { c: number; k: number }[], trace: DrawStep[] | null): { c: number; k: number }[] | null {
  let cur = lines.map((l) => ({ ...l }));
  let f = check(ctx, cur);
  for (;;) {
    if (!fails(f)) return cur;
    if (cur.length === 0) return null;
    // (1) lower the highest line that is above its kmin (ties: the last such line).
    let at = -1;
    for (let i = 0; i < cur.length; i++) if (cur[i].k > kmin(ctx, cur[i].c) && (at < 0 || cur[i].k >= cur[at].k)) at = i;
    // (a) and (d) cannot be mended by lowering a line that keeps (a): when (a) fails on a line at
    // or below kmin it is dropped instead (it never happens with lines the draw makes).
    if (at >= 0) {
      cur = cur.map((l, i) => (i === at ? { c: l.c, k: l.k - 1 } : l));
      f = check(ctx, cur);
      trace?.push({ step: 'lower', lines: cur.map((l) => ({ ...l })), failures: f });
      continue;
    }
    // (2) no line can be lowered: drop the last line.
    cur = cur.slice(0, -1);
    if (cur.length === 0) return null;
    f = check(ctx, cur);
    trace?.push({ step: 'dropLine', lines: cur.map((l) => ({ ...l })), failures: f });
  }
}

/** The stretch mark (NEW): a line above the chain's best this season (2.7). */
function toLines(ctx: DrawContext, lines: { c: number; k: number }[]): TicketLine[] {
  return lines.map((l) => (l.k > ctx.m.chains[l.c].best ? { c: l.c, k: l.k, filled: false, stretch: true } : { c: l.c, k: l.k, filled: false }));
}

/**
 * Draws counter `counter`'s next ticket (spec 2.7 with M4) with its fallback, and the steps it
 * took (`trace`, for the tests and the measurements). Pure.
 */
export function drawTicketTraced(cfg: MergeConfig, g: MergeGame, counter: number): DrawOutcome & { trace: DrawStep[] } {
  const trace: DrawStep[] = [];
  const out = drawTicketWith(cfg, g, counter, trace);
  return { ...out, trace };
}

function drawTicketWith(cfg: MergeConfig, g: MergeGame, counter: number, trace: DrawStep[] | null): DrawOutcome {
  const t = cfg.merge.tickets;
  const ctx = context(cfg, g, counter, t.outputWindow, t.handActions, 'ticket', g.merge.draws.ticket);
  if (ctx.open.length === 0) return { ticket: null, used: 0 };
  const weights = chainWeights(ctx);
  const count = drawCount(ctx, g);
  const drawn: { c: number; k: number }[] = [];
  for (let i = 0; i < count; i++) {
    const c = ctx.open[pick(weights, next(ctx))];
    drawn.push({ c, k: drawTier(ctx, c) });
  }
  const customer = Math.floor(next(ctx) * t.customers.length);
  const coat = Math.floor(next(ctx) * t.coats);
  if (trace) trace.push({ step: 'draw', lines: drawn.map((l) => ({ ...l })), failures: check(ctx, drawn) });
  let lines = settle(ctx, drawn, trace);
  if (!lines) {
    // (3) redraw with one open chain as the only chain: the next open chain after the first drawn
    // line's, cyclically, the first drawn chain last.
    const first = ctx.open.indexOf(drawn[0].c);
    for (let s = 1; s <= ctx.open.length && !lines; s++) {
      const c = ctx.open[(first + s) % ctx.open.length];
      const n = drawCount(ctx, g);
      const re: { c: number; k: number }[] = [];
      for (let i = 0; i < n; i++) re.push({ c, k: drawTier(ctx, c) });
      if (trace) trace.push({ step: 'redraw', lines: re.map((l) => ({ ...l })), failures: check(ctx, re) });
      lines = settle(ctx, re, trace);
    }
  }
  // (4) no chain passes: "Setting up…".
  if (!lines) return { ticket: null, used: ctx.used };
  return { ticket: { id: g.merge.nextTicketId, lines: toLines(ctx, lines), gold: false, customer, coat }, used: ctx.used };
}

/**
 * Draws counter `counter`'s next ticket (spec 2.7): lines by the season clock's odds, chains by
 * weight, tiers from kmin_c = b_c + 1 to best_c with the stretch line (NEW) and the H+1 rule;
 * bounds (a) to (d1) on every draw and after every fallback step; the fallback's four steps;
 * `ticket: null` is "Setting up…". `used` is the number of ticket-stream values read (the caller
 * advances `draws.ticket` by it); the ticket's id is `nextTicketId`. Pure. ORDERS.
 */
export function drawTicket(cfg: MergeConfig, g: MergeGame, counter: number): DrawOutcome {
  return drawTicketWith(cfg, g, counter, null);
}

/**
 * The Paper Dragon Parade's gold ticket for `counter` (spec 2.7): min(3, open chains) lines from
 * as many different open chains (picked by the chain weights of 2.7 without repeats), each tier
 * drawn evenly from best_c − 1 to best_c and kept inside kmin_c to min(8, best_c + 1) (best_c + 1
 * alone by the H+1 rule), then the bounds (a) to (d1) with the Parade's W and H and the fallback's
 * steps (1) and (2). `ticket: null` when no line survives: the caller keeps the Parade due and may
 * draw an ordinary ticket. Reads the Parade stream (2.3): the caller advances `draws.parade` by
 * `used`. Pure. ORDERS.
 */
export function drawParade(cfg: MergeConfig, g: MergeGame, counter: number): DrawOutcome {
  return drawParadeWith(cfg, g, counter, null);
}

/** `drawParade` with its steps, for the tests. */
export function drawParadeTraced(cfg: MergeConfig, g: MergeGame, counter: number): DrawOutcome & { trace: DrawStep[] } {
  const trace: DrawStep[] = [];
  const out = drawParadeWith(cfg, g, counter, trace);
  return { ...out, trace };
}

function drawParadeWith(cfg: MergeConfig, g: MergeGame, counter: number, trace: DrawStep[] | null): DrawOutcome {
  const p = cfg.merge.parade;
  const ctx = context(cfg, g, counter, p.outputWindow, p.handActions, 'parade', g.merge.draws.parade);
  if (ctx.open.length === 0) return { ticket: null, used: 0 };
  const n = Math.min(p.lines, ctx.open.length);
  const pool = ctx.open.slice();
  const weights = chainWeights(ctx);
  const drawn: { c: number; k: number }[] = [];
  for (let i = 0; i < p.lines; i++) {
    const vChain = next(ctx);
    const vTier = next(ctx);
    if (i >= n) continue;
    const j = pick(weights, vChain);
    const c = pool[j];
    pool.splice(j, 1);
    weights.splice(j, 1);
    const best = ctx.m.chains[c].best;
    const lo = kmin(ctx, c);
    const top = Math.min(8, best + 1);
    const k = lo > best ? top : Math.max(lo, Math.min(best, best - 1 + (vTier < 0.5 ? 0 : 1)));
    drawn.push({ c, k });
  }
  // Highest chains first on the ticket, so step (2) drops the lowest chain's line.
  drawn.sort((x, y) => y.c - x.c);
  if (trace) trace.push({ step: 'draw', lines: drawn.map((l) => ({ ...l })), failures: check(ctx, drawn) });
  const lines = settle(ctx, drawn, trace);
  if (!lines) return { ticket: null, used: ctx.used };
  return { ticket: { id: g.merge.nextTicketId, lines: toLines(ctx, lines), gold: true, customer: 0, coat: 0 }, used: ctx.used };
}
