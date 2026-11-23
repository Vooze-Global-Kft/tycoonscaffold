/**
 * The board (spec 2.2, 2.4, 2.7): cells, the drop cell of a chain, placing a good, room.
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: ORDERS calls `placeGood` (gift goods,
 * the opening board), `looseCount` (bound (c)), `roomFor` (the draw, the swap and gift goods
 * use this one function, 2.7) and `freeCells`.
 *
 * Skeleton bodies: every function here is built (create() places the opening goods with them;
 * small, MECHANICS owns and tests them). "Not tonight" (a MECHANICS action) returns filled lines
 * with `placeGood` too.
 */
import { BOARD_COLS, BOARD_ROWS, type Cell, type Good, type MergeConfig, type MergeState } from './types';

export const rowOf = (i: number) => Math.floor(i / BOARD_COLS);
export const colOf = (i: number) => i % BOARD_COLS;
export const cellAt = (row: number, col: number) => row * BOARD_COLS + col;

/** A cell that holds a good. */
export function isGood(c: Cell): c is Good {
  return c !== null && typeof c === 'object';
}

/** The open cells that are empty and not reserved by the Basket's undo chip (F of 2.3), in index order. */
export function freeCells(m: Pick<MergeState, 'board' | 'basketUndo'>): number[] {
  const out: number[] = [];
  const reserved = m.basketUndo?.cell ?? -1;
  for (let i = 0; i < m.board.length; i++) if (m.board[i] === null && i !== reserved) out.push(i);
  return out;
}

/** roomFor(n) = F ≥ n (spec 2.7): the one room check of the draw, the swap and gift goods. */
export function roomFor(m: Pick<MergeState, 'board' | 'basketUndo'>, n: number): boolean {
  return freeCells(m).length >= n;
}

/**
 * The drop cell for chain c (spec 2.4): its anchor column a_c = round(index × 6 / (open stalls − 1))
 * (one stall: column 3), where index is its place among the open stalls; among free cells the
 * smallest (row, |col − a_c|, col). null when there is no free cell.
 */
export function dropCell(m: Pick<MergeState, 'board' | 'basketUndo' | 'chains'>, c: number): number | null {
  const open = m.chains.map((ch, i) => (ch.open ? i : -1)).filter((i) => i >= 0);
  const index = Math.max(0, open.indexOf(c));
  const anchor = open.length <= 1 ? 3 : Math.round((index * (BOARD_COLS - 1)) / (open.length - 1));
  let best: number | null = null;
  let key: [number, number, number] | null = null;
  for (const i of freeCells(m)) {
    const k: [number, number, number] = [rowOf(i), Math.abs(colOf(i) - anchor), colOf(i)];
    if (!key || k[0] < key[0] || (k[0] === key[0] && (k[1] < key[1] || (k[1] === key[1] && k[2] < key[2])))) {
      key = k;
      best = i;
    }
  }
  return best;
}

/**
 * Places a good at `cell`, or at its chain's drop cell when `cell` is omitted. Returns the new
 * state and the cell, or null when there is no room (the cell is taken or nothing is free). Sets
 * `changedAt` to `at` (2.4: every placed good sets it). Does not check the loose cap (the drop
 * event does).
 */
export function placeGood(m: MergeState, good: Good, at: number, cell?: number): { m: MergeState; cell: number } | null {
  const target = cell ?? dropCell(m, good.c);
  if (target === null || target < 0 || target >= BOARD_COLS * BOARD_ROWS || m.board[target] !== null || m.basketUndo?.cell === target) return null;
  const board = m.board.slice();
  board[target] = { c: good.c, k: good.k };
  return { m: { ...m, board, changedAt: at }, cell: target };
}

/**
 * Loose_c: chain-c goods on the board with b_c ≤ k ≤ b_c + 1 (spec 2.3; bound (c) of 2.7 and the
 * drop's loose cap λ). Built. b_c is params.ts `baseTier`, written out here so this file does not
 * import params.ts (which imports this one); `mergeParams().chains[c].loose` gives the same number.
 */
export function looseCount(cfg: MergeConfig, m: Pick<MergeState, 'board' | 'chains'>, c: number): number {
  const { maxBase, step } = cfg.merge.gear;
  const b = Math.min(maxBase, 1 + Math.floor((Math.max(1, m.chains[c]?.gear ?? 1) - 1) / step));
  let n = 0;
  for (const cell of m.board) if (isGood(cell) && cell.c === c && cell.k >= b && cell.k <= b + 1) n++;
  return n;
}
