/**
 * The player's drop (spec 2.5): `dropAt(fromCell, target)` resolved at the finger point (M9), for a
 * drag and for tap-tap alike (tap-tap is the same call: the screens arm a cell, then call `dropAt`
 * with the tapped target), and the targets an armed good would accept. No Pocket row (M5).
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: a merge calls ORDERS's `onTierMade`
 * (./lanterns.ts, META) for each (c, k) it makes first this season or ever, then `onMerged`; the
 * last line of a ticket pays through `commitCash`, books `recent`, then calls `countGiftTicket`
 * (./gift.ts) and `onTicketPaid` (./lanterns.ts), in that order (the plan's seam table); a Festival
 * line calls `festivalLineFilled` (./festival.ts).
 *
 * Every function here is pure: it returns a new game, or the SAME object when the drop changes
 * nothing (a `return` result, or a ticket shake). A drop happens between ticks, at the current
 * clock (`stats.playSeconds`), and sets both `freedAt` and `changedAt` when it changes the board
 * (2.4: the retries of blocked releases, gift goods and empty counters).
 */
import { commitCash } from './actions';
import { isGood } from './board';
import { festivalLineFilled } from './festival';
import { countGiftTicket } from './gift';
import { onMerged, onTicketPaid, onTierMade, currentMods } from './lanterns';
import { basketPrice, RECENT_BUCKET, RECENT_BUCKETS, streamValue, ticketPrice, value } from './params';
import { BOARD_CELLS, CHAINS, TARGET_BASKET, TARGET_COUNTER, TARGET_FESTIVAL, TIERS, type DropOutcome, type DropResult, type DropTarget, type Good, type MergeConfig, type MergeEvent, type MergeGame, type MergeState, type RecentCoins, type TargetCode, type Ticket } from './types';

/** The hit test's number back to a target (types.ts TargetCode). */
export function decodeTarget(code: TargetCode): DropTarget {
  if (Number.isInteger(code) && code >= 0 && code < BOARD_CELLS) return { kind: 'cell', cell: code };
  if (Number.isInteger(code) && code >= TARGET_COUNTER && code < TARGET_COUNTER + 4) return { kind: 'counter', counter: code - TARGET_COUNTER };
  if (code === TARGET_FESTIVAL) return { kind: 'festival' };
  if (code === TARGET_BASKET) return { kind: 'basket' };
  return { kind: 'none' };
}

const clockOf = (g: MergeGame) => g.stats.playSeconds ?? 0;
const ret = (g: MergeGame, reason: Extract<DropResult, { kind: 'return' }>['reason']): DropOutcome => ({ game: g, result: { kind: 'return', reason } });

/** The board with `cells` changed, and both retry clocks set to now (a player action changed the board, 2.4). */
function withBoard(g: MergeGame, board: MergeState['board'], extra: Partial<MergeState> = {}): MergeGame {
  const t = clockOf(g);
  return { ...g, merge: { ...g.merge, ...extra, board, freedAt: t, changedAt: t } };
}

/**
 * A good of chain `good.c` at tier `good.k` was made (a merge, a drop, a shelf release, a gift
 * good, a shutter's good, a gear rush): best_c rises to it, the Ladder Book is stamped, and ORDERS's
 * `onTierMade` runs when it is the first of this (c, k) this season (best rose) or ever. Returns
 * the same object when it is neither. MECHANICS; used by events.ts and actions.ts too.
 */
export function noteMade(cfg: MergeConfig, g: MergeGame, good: Good, events?: MergeEvent[]): MergeGame {
  const m = g.merge;
  const ch = m.chains[good.c];
  if (!ch || good.k < 1 || good.k > TIERS) return g;
  const firstEver = !m.book[good.c]?.[good.k - 1];
  const rose = good.k > ch.best;
  if (!firstEver && !rose) return g;
  let book = m.book;
  if (firstEver) {
    book = m.book.map((row, c) => (c === good.c ? row.map((v, i) => v || i === good.k - 1) : row));
    events?.push({ type: 'discovery', good: { c: good.c, k: good.k } });
  }
  const chains = rose ? m.chains.map((x, c) => (c === good.c ? { ...x, best: good.k } : x)) : m.chains;
  return onTierMade(cfg, { ...g, merge: { ...m, book, chains } }, { c: good.c, k: good.k }, firstEver, events);
}

/** `recent` rolled forward so its newest bucket is the one of game clock `clock` (stale buckets become 0). */
export function rollRecent(r: RecentCoins, clock: number): RecentCoins {
  const now = Math.floor(clock / RECENT_BUCKET);
  const rows = r.coins.length === CHAINS && r.coins.every((row) => row.length === RECENT_BUCKETS) ? r.coins : Array.from({ length: CHAINS }, () => Array.from({ length: RECENT_BUCKETS }, () => 0));
  const shift = now - r.at;
  if (shift <= 0 && rows === r.coins) return r;
  if (shift <= 0) return { at: r.at, coins: rows };
  const coins = rows.map((row) => (shift >= RECENT_BUCKETS ? Array.from({ length: RECENT_BUCKETS }, () => 0) : row.slice(shift).concat(Array.from({ length: shift }, () => 0))));
  return { at: now, coins };
}

/** Books a paid ticket's coins in `recent` (2.3), split over its lines' chains in proportion to each line's value. */
function bookRecent(cfg: MergeConfig, g: MergeGame, ticket: Ticket, coins: number): RecentCoins {
  const r = rollRecent(g.merge.recent, clockOf(g));
  const vals = ticket.lines.map((l) => value(cfg, g, l.c, l.k));
  const total = vals.reduce((a, b) => a + b, 0);
  const add = Array.from({ length: CHAINS }, () => 0);
  ticket.lines.forEach((l, i) => (add[l.c] += total > 0 ? (coins * vals[i]) / total : coins / ticket.lines.length));
  return { at: r.at, coins: r.coins.map((row, c) => (add[c] ? row.map((v, j) => (j === RECENT_BUCKETS - 1 ? v + add[c] : v)) : row)) };
}

/**
 * Pays the full ticket of counter `j` (2.7 "Paying"): P computed now by `ticketPrice` (the shown
 * price, M19), `commitCash` as 'ticket', the till rolls in ('till'), `recent` booked, the counter
 * emptied (refill after `refillDelay`), then ORDERS's `countGiftTicket` and `onTicketPaid` (which
 * counts the feats and restarts the Parade clock after a gold ticket). Returns the game and P.
 */
function payTicket(cfg: MergeConfig, g: MergeGame, j: number, events?: MergeEvent[]): { g: MergeGame; coins: number } {
  const ticket = g.merge.counters[j].ticket as Ticket;
  const t = clockOf(g);
  const coins = ticketPrice(cfg, g, ticket);
  let x = commitCash(g, coins, 'ticket');
  const recent = bookRecent(cfg, x, ticket, coins);
  const till = x.merge.till;
  x = { ...x, merge: { ...x.merge, till: 0, recent } };
  if (till > 0) {
    x = commitCash(x, till, 'till');
    events?.push({ type: 'tillRoll', coins: till });
  }
  const counters = x.merge.counters.map((ct, i) => (i === j ? { ...ct, ticket: null, refillAt: t + cfg.merge.tickets.refillDelay, blockedAt: null } : ct));
  x = { ...x, merge: { ...x.merge, counters, changedAt: t, mstats: { ...x.merge.mstats, ticketsThisSeason: x.merge.mstats.ticketsThisSeason + 1 } } };
  events?.push({ type: 'ticketPaid', counter: j, ticket, coins });
  x = countGiftTicket(cfg, x, events);
  x = onTicketPaid(cfg, x, j, ticket, coins, events);
  return { g: x, coins };
}

/** Merges the good of `from` into the identical good of `to` (2.5 row 1). Assumes both hold (c, k), k < 8. */
function merge(cfg: MergeConfig, g: MergeGame, from: number, to: number, good: Good, events?: MergeEvent[]): DropOutcome {
  const m = g.merge;
  const mods = currentMods(cfg, m);
  const n = m.feats.merges;
  let up = 1;
  let spark = false;
  if (m.luckySparks > 0) {
    // A held Lucky Spark is spent first, on the next merge: +1 tier (+2 with lantern 17).
    spark = true;
    up += mods.sparkTiers;
  }
  // The Lucky stream: n = lifetime merges, x = c × 8 + k (2.3).
  const roll = streamLucky(m, n, good);
  const lucky = roll < 1 / mods.luckyOdds;
  if (lucky) up += 1;
  const made: Good = { c: good.c, k: Math.min(TIERS, good.k + up) };
  const board = m.board.slice();
  board[from] = null;
  board[to] = made;
  let x = withBoard(g, board, {
    luckySparks: spark ? m.luckySparks - 1 : m.luckySparks,
    feats: { ...m.feats, merges: n + 1, tier8sThisSeason: m.feats.tier8sThisSeason + (made.k === TIERS ? 1 : 0) },
    mstats: { ...m.mstats, luckies: m.mstats.luckies + (lucky ? 1 : 0) },
  });
  events?.push({ type: 'merge', cell: to, made, lucky, spark });
  const discovered: Good[] = [];
  for (let k = good.k + 1; k <= made.k; k++) {
    if (!x.merge.book[good.c][k - 1]) discovered.push({ c: good.c, k });
    x = noteMade(cfg, x, { c: good.c, k }, events);
  }
  x = onMerged(cfg, x, made, to, events);
  return { game: x, result: { kind: 'merge', cell: to, made, lucky, spark, discovered } };
}

/** One value of the Lucky stream for merge number n of `good`: n = lifetime merges, x = c × 8 + k (2.3). */
function streamLucky(m: MergeState, n: number, good: Good): number {
  return streamValue(m, 'lucky', n, good.c * 8 + good.k);
}

/**
 * Drops the good of `from` on `target` (every row of 2.5's table, without the Pocket: a merge with
 * Lucky and Sparks, a move, a swap, a ticket line or a shake, a Festival line, the Basket with its
 * undo chip, a return). A refused drop returns the same game object with a `return` result.
 */
export function dropAt(cfg: MergeConfig, g: MergeGame, from: number, target: DropTarget, events?: MergeEvent[]): DropOutcome {
  const m = g.merge;
  if (!Number.isInteger(from) || from < 0 || from >= BOARD_CELLS) return ret(g, 'noGood');
  const src = m.board[from];
  if (!isGood(src)) return ret(g, 'noGood');
  const good: Good = { c: src.c, k: src.k };
  const t = clockOf(g);
  switch (target.kind) {
    case 'cell': {
      const to = target.cell;
      if (!Number.isInteger(to) || to < 0 || to >= BOARD_CELLS) return ret(g, 'noTarget');
      if (to === from) return ret(g, 'sameCell');
      const dst = m.board[to];
      if (dst === 'shutter' || dst === 'block') return ret(g, 'closedCell');
      if (dst === null) {
        if (m.basketUndo?.cell === to) return ret(g, 'reserved');
        const board = m.board.slice();
        board[to] = src;
        board[from] = null;
        events?.push({ type: 'move', from, to });
        return { game: withBoard(g, board), result: { kind: 'move', cell: to } };
      }
      if (dst.c === good.c && dst.k === good.k) {
        if (good.k >= TIERS) return ret(g, 'tierMax');
        return merge(cfg, g, from, to, good, events);
      }
      const board = m.board.slice();
      board[to] = src;
      board[from] = dst;
      events?.push({ type: 'swap', from, to });
      return { game: withBoard(g, board), result: { kind: 'swap', cell: to } };
    }
    case 'counter': {
      const j = target.counter;
      const ticket = m.counters[j]?.ticket;
      if (!ticket) return ret(g, 'noTarget');
      const line = ticket.lines.findIndex((l) => !l.filled && l.c === good.c && l.k === good.k);
      if (line < 0) {
        events?.push({ type: 'ticketShake', counter: j });
        return { game: g, result: { kind: 'ticketShake', counter: j } };
      }
      const board = m.board.slice();
      board[from] = null;
      const filled: Ticket = { ...ticket, lines: ticket.lines.map((l, i) => (i === line ? { ...l, filled: true } : l)) };
      let x = withBoard(g, board, { counters: m.counters.map((ct, i) => (i === j ? { ...ct, ticket: filled } : ct)) });
      events?.push({ type: 'lineFill', counter: j, line });
      let paid: number | null = null;
      if (filled.lines.every((l) => l.filled)) {
        const r = payTicket(cfg, x, j, events);
        x = r.g;
        paid = r.coins;
      }
      return { game: x, result: { kind: 'lineFill', counter: j, line, paid } };
    }
    case 'festival': {
      const fest = m.festival;
      const line = fest.filledAt === null ? fest.lines.findIndex((l) => !l.filled && l.c === good.c && l.k === good.k) : -1;
      if (line < 0) return ret(g, 'noLine');
      const board = m.board.slice();
      board[from] = null;
      let x = withBoard(g, board, { festival: { ...fest, lines: fest.lines.map((l, i) => (i === line ? { ...l, filled: true } : l)) } });
      events?.push({ type: 'festivalLine', line });
      x = festivalLineFilled(cfg, x, line, events);
      return { game: x, result: { kind: 'festivalFill', line, done: x.merge.festival.filledAt !== null } };
    }
    case 'basket': {
      const coins = basketPrice(cfg, g, good);
      const board = m.board.slice();
      board[from] = null;
      // A second sale while a chip is out replaces it: the older reservation ends, its sale stands.
      let x = withBoard(g, board, {
        basketUndo: { cell: from, good, refund: coins, until: t + cfg.merge.basket.undoSeconds },
        mstats: { ...m.mstats, basketSales: m.mstats.basketSales + 1 },
      });
      x = commitCash(x, coins, 'basket');
      events?.push({ type: 'basketSell', cell: from, good, coins });
      return { game: x, result: { kind: 'basket', coins } };
    }
    default:
      return ret(g, 'noTarget');
  }
}

/**
 * The targets that would take the good of `from` now, for the glow while armed or dragging (4.2
 * "matches glow"): the cells holding an identical good below tier 8 (a merge), the counters whose
 * ticket has an unfilled line of exactly this good, and the Festival banner when one of its lines
 * is. Moves, swaps and the Basket accept every good, so they do not glow and are not listed.
 */
export function targetsFor(cfg: MergeConfig, g: MergeGame, from: number): TargetCode[] {
  void cfg;
  const m = g.merge;
  const src = m.board[from];
  if (!isGood(src)) return [];
  const out: TargetCode[] = [];
  if (src.k < TIERS) m.board.forEach((cell, i) => i !== from && isGood(cell) && cell.c === src.c && cell.k === src.k && out.push(i));
  m.counters.forEach((ct, j) => ct.ticket?.lines.some((l) => !l.filled && l.c === src.c && l.k === src.k) && out.push(TARGET_COUNTER + j));
  if (m.festival.filledAt === null && m.festival.lines.some((l) => !l.filled && l.c === src.c && l.k === src.k)) out.push(TARGET_FESTIVAL);
  return out;
}
