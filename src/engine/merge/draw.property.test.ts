/**
 * The ticket draw's property test (spec 2.7, 10.2, decisions M4 and M26): 10^5 random valid states
 * (full and empty boards, one chain and six chains, gear at a base step, best at 8, every lantern
 * lit, each season character, chains just opened), every candidate of every fallback step
 * re-checked by an independent checker written here (bound (b) by the exact fast check of
 * ./solver.test.ts, not by `missing()`):
 * - 0 breaches of (a) to (d1) by an accepted ticket, and the draw's verdict on every step equal to
 *   the independent one;
 * - every accepted ticket fillable from the board plus drops within (b) and (c);
 * - the H+1 candidate, the stretch mark, best_c of a newly opened chain;
 * - the draw never returns a line the player cannot ever make;
 * - determinism from the ticket stream (`used`), and the draw reads no cell positions (one room
 *   check, the board's `roomFor`; the draw has none of its own);
 * - the share of "Setting up…" outcomes, reported.
 * A second block measures the draw on mid-game states (line counts, tiers, fallback steps, tickets
 * payable from stock) and prints the numbers for the handover notes.
 *
 * Package ORDERS. The modifiers come through `currentMods` (META's lanterns.ts): mocked so the
 * lantern and character cases set their numbers here and do not depend on META's unfinished body.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { freshState, mergeTestConfig } from '../fixtures/merge';
import { rngFloat } from '../rng';
import { checkBounds, drawParade, drawParadeTraced, drawTicket, drawTicketTraced, scriptedTicket, type BoundFailures, type DrawStep } from './draw';
import { missingDetail, popsNeeded } from './missing';
import { mergeParams } from './params';
import type { Cell, Good, MergeConfig, MergeGame, MergeParams, Mods, Ticket, TicketLine } from './types';

const modsOverride: { value: Partial<Mods> | null } = { value: null };
vi.mock('./lanterns', async (orig) => {
  const actual = await orig<typeof import('./lanterns')>();
  return {
    ...actual,
    currentMods: (cfg: MergeConfig, m: MergeGame['merge']) => (modsOverride.value ? { ...actual.neutralMods(cfg), ...modsOverride.value } : actual.currentMods(cfg, m)),
  };
});

const cfg = mergeTestConfig();
const BASE = freshState(cfg);

function gen(seed: number) {
  let s = seed >>> 0;
  return () => {
    const r = rngFloat(s);
    s = r.seed;
    return r.value;
  };
}
type Rand = () => number;
const int = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

// ----------------------------------------------------------------------------- the independent checker

/** Is the pool plus `drops` goods of tier `base` enough for the demand? (the fast exact check of solver.test.ts) */
function carryFeasible(pool: readonly number[], demand: readonly number[], base: number, drops: number): boolean {
  const n = new Array(10).fill(0);
  const d = new Array(10).fill(0);
  for (const t of pool) n[t]++;
  for (const k of demand) d[k]++;
  n[base] += drops;
  let carry = 0;
  for (let t = 1; t <= 8; t++) {
    const a = n[t] + carry;
    if (a < d[t]) return false;
    carry = t < 8 ? Math.floor((a - d[t]) / 2) : 0;
  }
  return true;
}
function carryMinDrops(pool: readonly number[], demand: readonly number[], base: number): number {
  const limit = demand.reduce((a, k) => a + Math.ceil(Math.pow(2, k - 1) / Math.pow(2, base - 1)), 0) + 1;
  for (let p = 0; p <= limit; p++) if (carryFeasible(pool, demand, base, p)) return p;
  return Infinity;
}

function allGoods(g: MergeGame): Good[] {
  const out: Good[] = [];
  for (const cell of g.merge.board) if (cell && typeof cell === 'object') out.push(cell);
  g.merge.chains.forEach((ch, c) => ch.shelf.forEach((k) => out.push({ c, k })));
  for (const x of g.merge.gift.pendingGoods) out.push(x);
  return out;
}

/** The bounds of 2.7 as the specification writes them, computed without draw.ts. */
function independent(g: MergeGame, P: MergeParams, counter: number, lines: readonly { c: number; k: number }[], parade: boolean): BoundFailures {
  const W = parade ? cfg.merge.parade.outputWindow : cfg.merge.tickets.outputWindow;
  const H = parade ? cfg.merge.parade.handActions : cfg.merge.tickets.handActions;
  const f: BoundFailures = { a: false, bOutput: false, bHand: false, c: false, d: false };
  const queue: { c: number; k: number }[] = [];
  g.merge.counters.forEach((ct, j) => {
    if (j !== counter && ct.ticket) for (const l of ct.ticket.lines) if (!l.filled) queue.push({ c: l.c, k: l.k });
  });
  for (const l of lines) {
    const ch = g.merge.chains[l.c];
    if (!ch.open || l.k < 1 || l.k > Math.min(8, ch.best + 1)) f.a = true;
    if (l.k < P.chains[l.c].base + 1) f.d = true;
  }
  let cells = cfg.merge.tickets.spareCells;
  for (const l of [...queue, ...lines]) cells += Math.max(1, l.k - P.chains[l.c].base + 1);
  for (let c = 0; c < 6; c++) {
    if (!g.merge.chains[c].open) continue;
    let loose = 0;
    for (const cell of g.merge.board) if (cell && typeof cell === 'object' && cell.c === c && cell.k >= P.chains[c].base && cell.k <= P.chains[c].base + 1) loose++;
    cells += Math.min(cfg.merge.gear.looseCap, loose);
  }
  let O = 0;
  for (const cell of g.merge.board) if (cell !== 'shutter' && cell !== 'block') O++;
  if (cells > O) f.c = true;
  if (f.a) return f;
  const goods = allGoods(g);
  for (const c of new Set(lines.map((l) => l.c))) {
    const demand = [...queue, ...lines].filter((l) => l.c === c).map((l) => l.k);
    const pool = goods.filter((x) => x.c === c).map((x) => x.k);
    const drops = carryMinDrops(pool, demand, P.chains[c].base);
    if ((drops * cfg.merge.gear.interval) / (1 + P.chains[c].ripe) > W + 1e-9) f.bOutput = true;
  }
  // The hand: Σ (goods used + pops − 1 merges + 1 delivery) over this ticket's lines (2.7 defines it through missing()).
  const all = [...queue, ...lines];
  const det = missingDetail(all, goods);
  let hand = 0;
  for (let i = queue.length; i < all.length; i++) hand += det.used[i] + popsNeeded(det.units[i], P.chains[all[i].c].base);
  if (hand > H + 1e-9) f.bHand = true;
  return f;
}
const anyFail = (f: BoundFailures) => f.a || f.bOutput || f.bHand || f.c || f.d;
const same = (x: BoundFailures, y: BoundFailures) => x.a === y.a && x.bOutput === y.bOutput && x.bHand === y.bHand && x.c === y.c && x.d === y.d;

// ----------------------------------------------------------------------------- random valid states

const KINDS = ['any', 'full', 'empty', 'oneChain', 'sixChains', 'baseStep', 'best8', 'allLanterns', 'fireflies', 'harvest', 'warmGear', 'lateCrowd', 'marketDay', 'newlyOpened', 'midGame'] as const;
type Kind = (typeof KINDS)[number];

function modsFor(kind: Kind): Partial<Mods> | null {
  const s = cfg.merge.seasons;
  switch (kind) {
    case 'allLanterns':
      // Every lantern's number at once (5.3 with M5), with no season character.
      return { counters: 4, basketShare: 0.4, shelfCap: 8, paradeEvery: 480, awayHours: 2, luckyOdds: 16, startOpen: [1], seasonedMax: 4, paradeMultiplier: 2.5, mindersStartHired: true, ripeAdd: 0.05, betaAdd: 0.1, giftSlots: 4, minderIntervalMult: 0.8, sparkTiers: 2, festivalPurseMult: 2, giftEvery: 20, ticketPay: 1.05 };
    case 'fireflies':
      return { luckyOdds: s.fireflies.luckyOdds };
    case 'harvest':
      return { threeLineShare: s.harvest.threeLineShare, betaAdd: s.harvest.betaAdd };
    case 'warmGear':
      return { ripeAdd: s.warmGear.ripeAdd };
    case 'lateCrowd':
      return { minderIntervalMult: s.lateCrowd.minderIntervalMult };
    case 'marketDay':
      return { paradeEvery: s.marketDay.paradeEvery };
    default:
      return null;
  }
}

interface Built {
  g: MergeGame;
  counter: number;
  kind: Kind;
  /** A chain opened just now (best = maxPop, none of its goods anywhere), or −1. */
  fresh: number;
}

/** A random state that keeps the invariants of a reachable one (fixtures' `fixtureProblems`): goods of open chains only, never above best; best ≥ maxPop; shelves within the cap; tickets drawn by the rules themselves. */
function randomState(r: Rand, kind: Kind): Built {
  modsOverride.value = modsFor(kind);
  const mid = kind === 'midGame';
  const nOpen = kind === 'oneChain' ? 1 : kind === 'sixChains' ? 6 : mid ? int(r, 3, 4) : int(r, 1, 6);
  const season = nOpen === 6 ? int(r, 1, 9) : int(r, 0, 9);
  const seasonClock = mid ? 600 + r() * 4800 : r() * 7200;
  const playSeconds = seasonClock + r() * 30000;
  // Shutters and blocks.
  const shuttersOpened = cfg.merge.board.shutterGroups.map((grp) => (kind === 'full' || kind === 'empty' ? int(r, 0, grp.cells.length) : r() < 0.3 ? grp.cells.length : int(r, 0, grp.cells.length)));
  const board: Cell[] = BASE.merge.board.map(() => null);
  const shutCells = new Set<number>();
  cfg.merge.board.shutterGroups.forEach((grp, i) => grp.cells.forEach((cell, n) => n >= shuttersOpened[i] && shutCells.add(cell)));
  for (let i = 0; i < board.length; i++) if (shutCells.has(i)) board[i] = 'shutter';
  const blocks = r() < 0.2 ? 2 : r() < 0.2 ? 4 : 0;
  for (let b = 0; b < blocks; b++) {
    const i = int(r, 0, 55);
    if (board[i] === null) board[i] = 'block';
  }
  // Chains: gear, then best ≥ maxPop (read from mergeParams so the modifiers in force apply).
  const step = cfg.merge.gear.step;
  const chains = BASE.merge.chains.map((ch, c) => {
    if (c >= nOpen) return { ...ch, open: false, best: 0, shelf: [] as number[] };
    const gear = kind === 'baseStep' ? 1 + step * int(r, 0, 3) : mid ? int(r, 3, 25) : int(r, 1, cfg.merge.costs.gearMaxLevel - (cfg.merge.costs.gearMaxLevel > 40 ? 1 : 0));
    return { ...ch, open: true, gear, stall: int(r, 1, 12), minder: int(r, 0, 4), shelf: [] as number[], best: 1 };
  });
  let g: MergeGame = { ...BASE, stats: { ...BASE.stats, playSeconds }, merge: { ...BASE.merge, season, seasonStartedAt: playSeconds - seasonClock, board, shuttersOpened, chains, counters: [], script: 'done', gift: { ...BASE.merge.gift, pendingGoods: [] }, draws: { ...BASE.merge.draws, ticket: int(r, 0, 1_000_000), parade: int(r, 0, 1_000_000) } } };
  let P = mergeParams(cfg, g);
  const fresh = kind === 'newlyOpened' && nOpen >= 2 ? nOpen - 1 : -1;
  const chains2 = g.merge.chains.map((ch, c) => {
    if (!ch.open) return ch;
    const pop = P.chains[c].maxPop;
    const best = c === fresh ? pop : kind === 'best8' ? 8 : mid ? Math.min(8, pop + int(r, 1, 3)) : Math.min(8, pop + (r() < 0.25 ? 0 : int(r, 0, 8 - pop)));
    return { ...ch, best };
  });
  g = { ...g, merge: { ...g.merge, chains: chains2 } };
  P = mergeParams(cfg, g);
  // Goods: a fill share, chains among the open ones (none of a just-opened chain), tiers mostly in b..best.
  const fill = kind === 'full' ? 1 : kind === 'empty' ? 0 : mid ? 0.4 + r() * 0.4 : r();
  const sources = chains2.map((ch, c) => (ch.open && c !== fresh ? c : -1)).filter((c) => c >= 0);
  const tierOf = (c: number) => {
    const b = P.chains[c].base;
    const best = chains2[c].best;
    return r() < 0.15 ? int(r, 1, best) : int(r, Math.min(b, best), best);
  };
  const board2 = g.merge.board.slice();
  if (sources.length) for (let i = 0; i < board2.length; i++) if (board2[i] === null && r() < fill) {
    const c = sources[int(r, 0, sources.length - 1)];
    board2[i] = { c, k: tierOf(c) };
  }
  const chains3 = chains2.map((ch, c) => {
    if (!ch.open || c === fresh || r() < 0.6) return ch;
    const n = int(r, 1, P.mods.shelfCap);
    const b = P.chains[c].base;
    return { ...ch, shelf: Array.from({ length: n }, () => Math.min(ch.best, b + (r() < P.chains[c].ripe ? 1 : 0))) };
  });
  const pending: Good[] = [];
  if (sources.length && r() < 0.2) for (let i = int(r, 1, 3); i > 0; i--) {
    const c = sources[int(r, 0, sources.length - 1)];
    pending.push({ c, k: tierOf(c) });
  }
  const nCounters = kind === 'allLanterns' ? 4 : int(r, 2, 4);
  g = { ...g, merge: { ...g.merge, board: board2, chains: chains3, gift: { ...g.merge.gift, pendingGoods: pending }, counters: Array.from({ length: nCounters }, () => ({ ticket: null, refillAt: null, blockedAt: null, notTonightAt: 0 })) } };
  // The other counters hold tickets the rules drew, in turn, some lines filled; one may hold the Parade.
  const target = nCounters - 1;
  let paradeOut = false;
  for (let j = 0; j < target; j++) {
    if (r() < 0.2) continue;
    const parade = !paradeOut && r() < 0.2;
    const out = parade ? drawParade(cfg, g, j) : drawTicket(cfg, g, j);
    if (!out.ticket) continue;
    paradeOut ||= parade;
    const lines = out.ticket.lines.map((l, i, all) => ({ ...l, filled: i < all.length - 1 && r() < 0.2 }));
    const counters = g.merge.counters.slice();
    counters[j] = { ...counters[j], ticket: { ...out.ticket, lines } };
    const draws = parade ? { ...g.merge.draws, parade: g.merge.draws.parade + out.used } : { ...g.merge.draws, ticket: g.merge.draws.ticket + out.used };
    g = { ...g, merge: { ...g.merge, counters, draws, nextTicketId: g.merge.nextTicketId + 1 } };
  }
  return { g, counter: target, kind, fresh };
}

// ----------------------------------------------------------------------------- the property

interface Tally {
  states: number;
  drawn: number;
  setups: number;
  setupsByKind: Record<string, [number, number]>;
  mismatches: string[];
  breaches: string[];
  steps: Record<DrawStep['step'], number>;
  ticketsWithStep: Record<DrawStep['step'], number>;
  lineCounts: number[];
  tiersAboveBase: number[];
  stretch: number;
  lines: number;
  payable: number;
}

function newTally(): Tally {
  return { states: 0, drawn: 0, setups: 0, setupsByKind: {}, mismatches: [], breaches: [], steps: { draw: 0, lower: 0, dropLine: 0, redraw: 0 }, ticketsWithStep: { draw: 0, lower: 0, dropLine: 0, redraw: 0 }, lineCounts: [0, 0, 0, 0], tiersAboveBase: new Array(9).fill(0), stretch: 0, lines: 0, payable: 0 };
}

/** Payable from stock: every line has its own exact good on the board now (one drag each). */
function payableFromStock(g: MergeGame, t: Ticket): boolean {
  const left = new Map<string, number>();
  for (const cell of g.merge.board) if (cell && typeof cell === 'object') left.set(`${cell.c},${cell.k}`, (left.get(`${cell.c},${cell.k}`) ?? 0) + 1);
  for (const l of t.lines) {
    const key = `${l.c},${l.k}`;
    const n = left.get(key) ?? 0;
    if (n <= 0) return false;
    left.set(key, n - 1);
  }
  return true;
}

function checkOne(b: Built, tally: Tally, i: number, full: boolean) {
  const { g, counter } = b;
  modsOverride.value = modsFor(b.kind);
  const P = mergeParams(cfg, g);
  const out = drawTicketTraced(cfg, g, counter);
  tally.states++;
  const kindTally = (tally.setupsByKind[b.kind] ??= [0, 0]);
  kindTally[1]++;
  const seen = new Set<DrawStep['step']>();
  for (const s of out.trace) {
    tally.steps[s.step]++;
    seen.add(s.step);
    if (full) {
      const ind = independent(g, P, counter, s.lines, false);
      if (!same(ind, s.failures) && tally.mismatches.length < 5) tally.mismatches.push(`state ${i} (${b.kind}) step ${s.step} ${JSON.stringify(s.lines)}: draw ${JSON.stringify(s.failures)} vs independent ${JSON.stringify(ind)}`);
    }
  }
  if (!out.ticket) {
    tally.setups++;
    kindTally[0]++;
    return;
  }
  tally.drawn++;
  for (const st of seen) tally.ticketsWithStep[st]++;
  const t = out.ticket;
  tally.lineCounts[t.lines.length]++;
  if (payableFromStock(g, t)) tally.payable++;
  const fail = (msg: string) => tally.breaches.length < 5 && tally.breaches.push(`state ${i} (${b.kind}): ${msg} ${JSON.stringify(t.lines)}`);
  if (t.lines.length < 1 || t.lines.length > 3) fail('line count');
  if (t.gold || t.scripted) fail('gold or scripted');
  if (t.id !== g.merge.nextTicketId) fail('id');
  if (!(out.used > 0)) fail('used');
  if (t.customer < 0 || t.customer >= cfg.merge.tickets.customers.length || t.coat < 0 || t.coat >= cfg.merge.tickets.coats) fail('customer');
  for (const l of t.lines as TicketLine[]) {
    const ch = g.merge.chains[l.c];
    const base = P.chains[l.c].base;
    tally.lines++;
    if (l.filled) fail('filled at the draw');
    if (!ch.open) fail('a closed chain');
    // Never a line the player cannot ever make: an open chain, at least one above its base drop, at most best + 1 and 8.
    if (!(l.k >= base + 1 && l.k <= Math.min(8, ch.best + 1))) fail(`tier ${l.k} outside ${base + 1}..${Math.min(8, ch.best + 1)}`);
    // H+1: when kmin > best, the only candidate is best + 1.
    if (base + 1 > ch.best && l.k !== ch.best + 1) fail('H+1');
    if (!!l.stretch !== l.k > ch.best) fail('stretch mark');
    if (l.stretch) tally.stretch++;
    tally.tiersAboveBase[l.k - base]++;
    // A chain opened just now: best_c = maxPop, so its lines are b + 1 (and b + 2 as a stretch when p > 0).
    if (l.c === b.fresh && !(ch.best === P.chains[l.c].maxPop && l.k <= P.chains[l.c].maxPop + 1)) fail('newly opened chain');
  }
  if (full) {
    const ind = independent(g, P, counter, t.lines, false);
    if (anyFail(ind)) fail(`breach ${JSON.stringify(ind)}`);
    // Fillable from the board plus drops within (b): the exact check with the drops (b) allows.
    for (const c of new Set(t.lines.map((l) => l.c))) {
      const queue = g.merge.counters.flatMap((ct, j) => (j !== counter && ct.ticket ? ct.ticket.lines.filter((l) => !l.filled && l.c === c).map((l) => l.k) : []));
      const demand = [...queue, ...t.lines.filter((l) => l.c === c).map((l) => l.k)];
      const allowed = Math.floor((cfg.merge.tickets.outputWindow * (1 + P.chains[c].ripe)) / cfg.merge.gear.interval + 1e-9);
      const pool = allGoods(g).filter((x) => x.c === c).map((x) => x.k);
      if (!carryFeasible(pool, demand, P.chains[c].base, allowed)) fail(`not fillable within (b) on chain ${c}`);
    }
  }
  if (i % 97 === 0) {
    // Determinism: the same state gives the same ticket and the same `used`, with or without the trace.
    const again = drawTicket(cfg, g, counter);
    if (JSON.stringify(again) !== JSON.stringify({ ticket: out.ticket, used: out.used })) fail('not deterministic');
  }
}

describe('drawTicket over 10^5 random valid states (2.7, 10.2)', () => {
  it('0 breaches of (a) to (d1), the verdict re-checked after every fallback step, every ticket fillable', () => {
    const tally = newTally();
    const r = gen(777);
    const N = 100_000;
    for (let i = 0; i < N; i++) checkOne(randomState(r, KINDS[i % KINDS.length]), tally, i, true);
    modsOverride.value = null;
    expect(tally.mismatches).toEqual([]);
    expect(tally.breaches).toEqual([]);
    expect(tally.states).toBe(N);
    const share = tally.setups / tally.states;
    const byKind = Object.entries(tally.setupsByKind)
      .map(([k, [s, n]]) => `${k} ${((100 * s) / n).toFixed(1)}%`)
      .join(', ');
    console.log(`[draw.property] ${N} random states: "Setting up…" ${(100 * share).toFixed(2)}% (${byKind}); steps ${JSON.stringify(tally.steps)}`);
    // Every kind of state produced tickets.
    for (const [k, [s, n]] of Object.entries(tally.setupsByKind)) expect(s, k).toBeLessThan(n);
  }, 600_000);
});

describe('the draw: the scripted tickets, the Parade, the stream, the room check', () => {
  it('the scripted fox and hedgehog are exempt from (d) only', () => {
    modsOverride.value = null;
    const g = freshState(cfg);
    for (const which of ['fox', 'hedgehog'] as const) {
      const t = scriptedTicket(cfg, which, 1);
      expect(t.scripted).toBe(true);
      const exempt = checkBounds(cfg, g, 1, t.lines, { scripted: true });
      const normal = checkBounds(cfg, g, 1, t.lines);
      expect(normal.d, which).toBe(true);
      expect({ ...normal, d: false }).toEqual(exempt);
    }
    // (a) still holds for them: a Glazed Skewer needs best 2, which the first merge makes (2.7).
    const atStart = checkBounds(cfg, g, 1, scriptedTicket(cfg, 'hedgehog', 1).lines, { scripted: true });
    expect(atStart.a).toBe(true);
    const afterMerge = { ...g, merge: { ...g.merge, chains: g.merge.chains.map((ch, c) => (c === 0 ? { ...ch, best: 2 } : ch)) } };
    expect(checkBounds(cfg, afterMerge, 1, scriptedTicket(cfg, 'hedgehog', 1).lines, { scripted: true }).a).toBe(false);
    // Exempt from (d) only: on a board too small for it, (c) still refuses it.
    const tiny = { ...afterMerge, merge: { ...afterMerge.merge, board: afterMerge.merge.board.map((cell, i) => (cell === null && i > 25 ? ('block' as const) : cell)) } };
    expect(checkBounds(cfg, tiny, 1, scriptedTicket(cfg, 'hedgehog', 1).lines, { scripted: true }).c).toBe(true);
  });

  it('the Parade: different open chains, tiers best − 1 to best, inside its own bounds, gold, the Parade stream', () => {
    const r = gen(4242);
    let drawn = 0;
    let none = 0;
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 20_000; i++) {
      const b = randomState(r, KINDS[i % KINDS.length]);
      modsOverride.value = modsFor(b.kind);
      const P = mergeParams(cfg, b.g);
      const out = drawParadeTraced(cfg, b.g, b.counter);
      for (const s of out.trace) expect(same(independent(b.g, P, b.counter, s.lines, true), s.failures)).toBe(true);
      if (!out.ticket) {
        none++;
        continue;
      }
      drawn++;
      const t = out.ticket;
      expect(t.gold).toBe(true);
      expect(out.used).toBe(2 * cfg.merge.parade.lines);
      const open = b.g.merge.chains.filter((ch) => ch.open).length;
      expect(t.lines.length).toBeLessThanOrEqual(Math.min(cfg.merge.parade.lines, open));
      counts[t.lines.length]++;
      expect(new Set(t.lines.map((l) => l.c)).size).toBe(t.lines.length);
      for (const l of t.lines) {
        const ch = b.g.merge.chains[l.c];
        const lo = P.chains[l.c].base + 1;
        expect(l.k).toBeGreaterThanOrEqual(lo);
        if (lo > ch.best) expect(l.k).toBe(ch.best + 1);
        else expect(l.k).toBeLessThanOrEqual(ch.best);
      }
      expect(anyFail(independent(b.g, P, b.counter, t.lines, true))).toBe(false);
      // The Parade reads its own stream: the ticket stream's position does not change it.
      const moved = { ...b.g, merge: { ...b.g.merge, draws: { ...b.g.merge.draws, ticket: b.g.merge.draws.ticket + 17 } } };
      if (i % 50 === 0) expect(drawParade(cfg, moved, b.counter)).toEqual({ ticket: out.ticket, used: out.used });
    }
    modsOverride.value = null;
    console.log(`[draw.property] Parade over 20000 states: drawn ${drawn}, none ${none}; lines 1/2/3: ${counts.slice(1).join('/')}`);
    expect(drawn).toBeGreaterThan(none);
  }, 300_000);

  it('the stream decides the ticket: a different position gives other tickets, the same position the same', () => {
    const r = gen(99);
    const b = randomState(r, 'midGame');
    modsOverride.value = null;
    const seen = new Set<string>();
    for (let n = 0; n < 50; n++) {
      const g = { ...b.g, merge: { ...b.g.merge, draws: { ...b.g.merge.draws, ticket: n * 31 } } };
      const a = drawTicket(cfg, g, b.counter);
      expect(drawTicket(cfg, g, b.counter)).toEqual(a);
      seen.add(JSON.stringify(a.ticket?.lines));
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('the draw reads no cell positions and has no room check of its own (one roomFor, the board’s)', () => {
    // Behaviour: the same goods in other cells give the same ticket.
    const r = gen(5150);
    for (let i = 0; i < 300; i++) {
      const b = randomState(r, KINDS[i % KINDS.length]);
      modsOverride.value = modsFor(b.kind);
      const goods = b.g.merge.board.map((c, j) => ({ c, j })).filter((x) => x.c !== 'shutter' && x.c !== 'block');
      const cells = goods.map((x) => x.c);
      // A fixed shuffle of the open cells' contents.
      for (let j = cells.length - 1; j > 0; j--) {
        const s = Math.floor(rngFloat(i * 1000 + j).value * (j + 1));
        [cells[j], cells[s]] = [cells[s], cells[j]];
      }
      const board = b.g.merge.board.slice();
      goods.forEach((x, n) => (board[x.j] = cells[n]));
      const moved = { ...b.g, merge: { ...b.g.merge, board } };
      expect(drawTicket(cfg, moved, b.counter)).toEqual(drawTicket(cfg, b.g, b.counter));
    }
    modsOverride.value = null;
    // Source: draw.ts counts no free cells itself.
    const src = readFileSync(join(__dirname, 'draw.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(src).not.toMatch(/freeCells\s*\(|\.F\b|=== null/);
  });
});

describe('measurements on mid-game states (for the handover notes)', () => {
  it('line counts, tiers, fallback steps and tickets payable from stock over 10^5 draws', () => {
    const tally = newTally();
    const r = gen(2026);
    const N = 100_000;
    for (let i = 0; i < N; i++) checkOne(randomState(r, 'midGame'), tally, i, false);
    modsOverride.value = null;
    const pct = (n: number, d: number) => `${((100 * n) / Math.max(1, d)).toFixed(1)}%`;
    const report = [
      `[draw.measure] ${N} mid-game draws (3 to 4 stalls, gear 3 to 25, season clock 10 to 90 min, board 40 to 80 % full):`,
      `  tickets ${tally.drawn}, "Setting up…" ${pct(tally.setups, N)}`,
      `  lines 1/2/3: ${pct(tally.lineCounts[1], tally.drawn)} / ${pct(tally.lineCounts[2], tally.drawn)} / ${pct(tally.lineCounts[3], tally.drawn)}`,
      `  tier above base (k − b) 1..7: ${tally.tiersAboveBase.slice(1, 8).map((n) => pct(n, tally.lines)).join(' ')}; stretch lines ${pct(tally.stretch, tally.lines)}`,
      `  draws where a step fired: lower ${pct(tally.ticketsWithStep.lower, tally.drawn)} of tickets (${tally.steps.lower} steps), dropLine ${pct(tally.ticketsWithStep.dropLine, tally.drawn)} (${tally.steps.dropLine}), redraw ${pct(tally.ticketsWithStep.redraw, tally.drawn)} (${tally.steps.redraw}); setting up ${tally.setups}`,
      `  payable from stock at the draw (each line's exact good on the board): ${pct(tally.payable, tally.drawn)}`,
    ].join('\n');
    console.log(report);
    expect(tally.breaches).toEqual([]);
  }, 600_000);
});
