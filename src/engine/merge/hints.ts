/**
 * The rules' hints (spec 3.1, 4.4): what the firefly should point at, as target keys of
 * src/ui/hints/targets.ts (`cell:<i>`, `counter:<j>`, `banner`, `basket`, `front:<c>`,
 * `shutter:<group>`, `goal`, `giftbox`). Pure: a function of the state; the screens'
 * hint script (src/ui/merge/hints.ts, the hints package) times, orders and draws them.
 *
 * Package META (docs/design/market-build-plan.md names ORDERS; the lead gave this file to META).
 *
 * The hints, most useful first: a delivery (a good on the board that an unfilled line asks for:
 * the ticket nearest completion first, then the Festival), a merge that serves the open line
 * nearest completion (the lowest pair of that line's chain below its tier), the Basket when the
 * board is stuck (M22), the advised purchase (its stall front or shutter, else the goal line), a
 * gift box waiting. Nothing while a sheet is open or a good is armed (the screens say so in `ui`).
 */
import { advice } from './advice';
import { isGood } from './board';
import type { Good, MergeConfig, MergeGame, MergeHint, TicketLine } from './types';

/** The ticket lines in the order of "nearest completion": tickets with fewer unfilled lines first (then the lower counter), each ticket's lines highest tier first. */
function linesByNearness(g: MergeGame): { counter: number; line: TicketLine }[] {
  const tickets = g.merge.counters
    .map((ct, j) => ({ j, left: ct.ticket ? ct.ticket.lines.filter((l) => !l.filled) : [] }))
    .filter((t) => t.left.length > 0)
    .sort((a, b) => a.left.length - b.left.length || a.j - b.j);
  return tickets.flatMap((t) => [...t.left].sort((a, b) => b.k - a.k).map((line) => ({ counter: t.j, line })));
}

/** The first cell holding exactly `good`. */
function cellOf(g: MergeGame, good: Good, except = -1): number {
  return g.merge.board.findIndex((cell, i) => i !== except && isGood(cell) && cell.c === good.c && cell.k === good.k);
}

/** Every hint that applies now, most useful first; [] while a sheet is open or a good is armed (`ui`, from the screens). */
export function hintsFor(cfg: MergeConfig, g: MergeGame, ui?: { sheetOpen?: boolean; armed?: boolean }): MergeHint[] {
  if (ui?.sheetOpen || ui?.armed) return [];
  const out: MergeHint[] = [];
  const lines = linesByNearness(g);
  // A delivery: ticket lines, then the Festival.
  for (const { counter, line } of lines) {
    const from = cellOf(g, line);
    if (from >= 0) {
      out.push({ id: `deliver:${counter}`, kind: 'drag', from: `cell:${from}`, to: `counter:${counter}` });
      break;
    }
  }
  const fest = g.merge.festival;
  if (fest.filledAt === null) {
    for (const l of fest.lines) {
      if (l.filled) continue;
      const from = cellOf(g, l);
      if (from >= 0) {
        out.push({ id: 'deliver:festival', kind: 'drag', from: `cell:${from}`, to: 'banner' });
        break;
      }
    }
  }
  // A merge on the path to the line nearest completion: the lowest identical pair of its chain below its tier.
  merge: for (const { line } of lines) {
    for (let k = 1; k < Math.min(8, line.k); k++) {
      const a = cellOf(g, { c: line.c, k });
      const b = a >= 0 ? cellOf(g, { c: line.c, k }, a) : -1;
      if (a >= 0 && b >= 0) {
        out.push({ id: `merge:${line.c}:${k}`, kind: 'drag', from: `cell:${a}`, to: `cell:${b}` });
        break merge;
      }
    }
  }
  const goal = advice(cfg, g);
  if (goal?.kind === 'basket' && goal.target !== null) out.push({ id: 'basket', kind: 'drag', from: `cell:${goal.target}`, to: 'basket' });
  else if (goal && goal.cost > 0 && goal.cost <= g.cash) {
    const to = goal.kind === 'shutter' ? `shutter:${goal.target}` : goal.target !== null ? `front:${goal.target}` : 'goal';
    out.push({ id: `buy:${goal.kind}:${goal.target}`, kind: 'point', to });
  }
  if (g.merge.gift.boxes.length) out.push({ id: 'giftbox', kind: 'point', to: 'giftbox' });
  return out;
}
