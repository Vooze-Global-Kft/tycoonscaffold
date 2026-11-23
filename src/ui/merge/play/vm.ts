/**
 * What the play canvas shows, read from the rules (spec 4.2), as small view models. Each layer has a
 * signature (a string of the few values it shows) that a store selector computes ten times a second
 * and React compares; the layer's picture is re-recorded only when its signature changes. Every
 * figure comes from the rules (ticketPrice, mergeParams, roundCoins) and the project's number
 * format; every name from the config; every word from strings.ts. Pure: no React.
 */
import * as R from '../../../engine/merge';
import { formatShort } from '../../../engine/format';
import { awningFor, type Awning } from '../art/stalls.draw';
import { S } from '../strings';
import type { BannerVM, CellKind, FrontVM, ShutterTag, TicketVM } from './pictures';
import { EMPTY_TICKET } from './pictures';

/** Every amount on the canvas: the rules' rounding (M19) then the project's short number format. */
export function coins(cfg: R.MergeConfig, x: number): string {
  return formatShort(R.roundCoins(cfg, x));
}

/**
 * The awning look of a stall level (Decision M29), from the config's `stalls.awningLevels`. A local
 * stand-in for the rules' `awningLook` (named in schema.merge.ts, not exported yet: requested), with
 * the art kit's own mapping when the config has no levels.
 */
export function awningLook(cfg: R.MergeConfig, stallLevel: number): Awning {
  const lv = (cfg.merge as { stalls?: { awningLevels?: number[] } }).stalls?.awningLevels;
  if (!lv || lv.length < 2) return awningFor(stallLevel);
  return stallLevel >= lv[1] ? 2 : stallLevel >= lv[0] ? 1 : 0;
}

const clockOf = (g: R.MergeGame) => g.stats.playSeconds ?? 0;

/** The till's fill 0..4 (5.4): empty right after a roll, rising through the minute to the next. */
export function tillLevel(cfg: R.MergeConfig, g: R.MergeGame): number {
  const m = g.merge;
  if (m.till <= 0) return 0;
  const roll = (cfg.merge as { minders?: { tillRoll?: number } }).minders?.tillRoll ?? 0;
  if (!(roll > 0)) return 2;
  const left = Math.max(0, Math.min(roll, m.tillAt - clockOf(g)));
  return Math.max(1, Math.min(4, 1 + Math.floor((1 - left / roll) * 4)));
}

export function frontsVM(cfg: R.MergeConfig, g: R.MergeGame): FrontVM[] {
  const m = g.merge;
  const silk = g.entitlements.products.includes(cfg.merge.products.awnings);
  const till = tillLevel(cfg, g);
  return m.chains.map((ch) => ({
    open: ch.open,
    awning: awningLook(cfg, ch.stall),
    silk,
    minder: ch.minder > 0,
    till: ch.minder > 0 ? till : 0,
    shelf: ch.shelf.length,
    waiting: ch.open && ch.waiting,
  }));
}

export function frontsSig(cfg: R.MergeConfig, g: R.MergeGame): string {
  return frontsVM(cfg, g)
    .map((f) => `${f.open ? 1 : 0}${f.awning}${f.silk ? 1 : 0}${f.minder ? 1 : 0}${f.till}.${f.shelf}${f.waiting ? 1 : 0}`)
    .join('|');
}

/** The chain whose opening shows the banner's line icons (4.2: "until the Steamer opens"). */
const STEAMER = 2;

export function bannerVM(g: R.MergeGame): BannerVM {
  const f = g.merge.festival;
  const filled = f.lines.filter((l) => l.filled).length;
  return {
    lines: f.lines.map((l) => ({ c: l.c, k: l.k, filled: l.filled })),
    showLines: !!g.merge.chains[STEAMER]?.open,
    lit: f.filledAt !== null,
    count: S.play.festivalCount(filled, f.lines.length),
  };
}

export function bannerSig(g: R.MergeGame): string {
  const f = g.merge.festival;
  return `${g.merge.chains[STEAMER]?.open ? 1 : 0}${f.filledAt !== null ? 1 : 0}:${f.lines.map((l) => `${l.c}.${l.k}.${l.filled ? 1 : 0}`).join(',')}|${g.merge.counters.length}`;
}

export function ticketVM(cfg: R.MergeConfig, g: R.MergeGame, j: number): TicketVM {
  const ct = g.merge.counters[j];
  if (!ct) return EMPTY_TICKET;
  const t = ct.ticket;
  if (!t) return ct.blockedAt !== null ? { ...EMPTY_TICKET, kind: 'setup' } : EMPTY_TICKET;
  const customers = cfg.merge.tickets.customers;
  return {
    kind: 'ticket',
    gold: t.gold,
    lines: t.lines.map((l) => ({ c: l.c, k: l.k, filled: l.filled, stretch: newLine(g, l) })),
    price: coins(cfg, R.ticketPrice(cfg, g, t)),
    species: customers[t.customer % Math.max(1, customers.length)] ?? customers[0],
    coat: t.coat,
  };
}

/**
 * A line shows NEW (2.7's stretch line) only while its good is not yet in the Ladder Book: a stretch
 * line the player has made before (the H+1 rule at a season's start asks for tiers long found) would
 * otherwise call a familiar good new.
 */
export function newLine(g: R.MergeGame, l: R.TicketLine): boolean {
  return !!l.stretch && !g.merge.book[l.c]?.[l.k - 1];
}

/** One counter's signature: the ticket's id, its filled lines, NEW marks and its live price (a stall level may raise it). */
export function ticketSig(cfg: R.MergeConfig, g: R.MergeGame, j: number): string {
  const ct = g.merge.counters[j];
  if (!ct) return '-';
  const t = ct.ticket;
  if (!t) return ct.blockedAt !== null ? 's' : 'e';
  return `${t.id}:${t.lines.map((l) => (l.filled ? 1 : 0) + (newLine(g, l) ? 2 : 0)).join('')}:${R.ticketPrice(cfg, g, t)}`;
}

export function cellKinds(cfg: R.MergeConfig, g: R.MergeGame, p: R.MergeParams = R.mergeParams(cfg, g)): CellKind[] {
  const m = g.merge;
  const next = new Set(p.shutters.filter((s): s is NonNullable<typeof s> => !!s).map((s) => s.cell));
  const shape = R.seasonRow(cfg, m.season).shape;
  return m.board.map((cell, i) => {
    if (cell === 'shutter') return next.has(i) ? 'next' : 'shutter';
    if (cell === 'block') {
      if (shape === 'moonGate') return m.board[i + R.BOARD_COLS] === 'block' ? 'gateTop' : 'gateBottom';
      return 'brazier';
    }
    return 'open';
  });
}

/**
 * The next shutter of each group and what its paper tag says (2.2, the review's blocking finding):
 * while the group's condition does not hold, the condition alone, written as one ("After Steamer",
 * or "Make" over the good's icon with its pips); once it holds, the shutter glyph and the price
 * alone. A price is never printed beside a stall's name, so no tag reads as a stall's price.
 */
export function shutterTags(cfg: R.MergeConfig, g: R.MergeGame, p: R.MergeParams = R.mergeParams(cfg, g)): ShutterTag[] {
  const names = cfg.merge.chains;
  const out: ShutterTag[] = [];
  p.shutters.forEach((s, gi) => {
    if (!s) return;
    const cond = cfg.merge.board.shutterGroups[gi]?.condition;
    if (!cond) return;
    if (s.allowed) out.push({ cell: s.cell, allowed: true, price: coins(cfg, s.cost), lines: [], good: null });
    else if (cond.type === 'tierMade') out.push({ cell: s.cell, allowed: false, price: '', lines: [S.play.shutterMake], good: { c: cond.chain, k: cond.tier } });
    // "After" and the stall's name on two lines (a 47 pt tag holds about 8 letters a line).
    else out.push({ cell: s.cell, allowed: false, price: '', lines: S.play.shutterAfter(names[cond.chain]?.name ?? '').split(' '), good: null });
  });
  return out;
}

/**
 * The board layer's signature. Computed ten times a second by a store selector, so it reads the
 * rules' parameters once and is cached on what it depends on: the board array (the rules replace it
 * on every change), the shutters opened, the season, the Ladder Book and which stalls are open
 * with their best tiers (a shutter's condition).
 */
let cellsKey: { board: unknown; opened: unknown; book: unknown; season: number; chains: string; cfg: unknown } | null = null;
let cellsVal = '';
export function cellsSig(cfg: R.MergeConfig, g: R.MergeGame): string {
  const m = g.merge;
  const chains = m.chains.map((ch) => `${ch.open ? 1 : 0}${ch.best}`).join('');
  const k = cellsKey;
  if (k && k.board === m.board && k.opened === m.shuttersOpened && k.book === m.book && k.season === m.season && k.chains === chains && k.cfg === cfg) return cellsVal;
  const p = R.mergeParams(cfg, g);
  const kinds = cellKinds(cfg, g, p)
    .map((kd) => kd[0] + (kd === 'gateBottom' ? 'b' : ''))
    .join('');
  const tags = shutterTags(cfg, g, p)
    .map((t) => `${t.cell}.${t.allowed ? t.price : t.lines.join(' ')}`)
    .join(',');
  cellsKey = { board: m.board, opened: m.shuttersOpened, book: m.book, season: m.season, chains, cfg };
  cellsVal = `${kinds}|${tags}`;
  return cellsVal;
}

/** The gear rail's notches: each open stall's anchor column (2.4), found by the rules' own drop-cell rule on an empty board. */
const railCache = new Map<string, number[]>();
export function railColumns(g: R.MergeGame): number[] {
  const m = g.merge;
  // The anchor columns depend only on which stalls are open (an empty board): cached by that.
  const key = `${m.board.length}:${m.chains.map((ch) => (ch.open ? 1 : 0)).join('')}`;
  const hit = railCache.get(key);
  if (hit) return hit;
  const empty = { board: m.board.map(() => null) as R.Cell[], basketUndo: null, chains: m.chains };
  const out: number[] = [];
  m.chains.forEach((ch, c) => {
    if (!ch.open) return;
    const cell = R.dropCell(empty, c);
    if (cell !== null) out.push(cell % R.BOARD_COLS);
  });
  railCache.set(key, out);
  return out;
}

export function backdropSig(g: R.MergeGame): string {
  return `${railColumns(g).join(',')}|${g.merge.lanterns.length}`;
}

/** The long-press chip's words: the good's name (game.json) and what it is worth on a ticket line, rounded as paid. */
export function chipWords(cfg: R.MergeConfig, g: R.MergeGame, cell: number): { name: string; worth: string } | null {
  const good = g.merge.board[cell];
  if (!R.isGood(good)) return null;
  const name = cfg.merge.chains[good.c]?.tiers[good.k - 1] ?? '';
  return { name, worth: S.play.chipWorth(coins(cfg, R.value(cfg, g, good.c, good.k))) };
}
