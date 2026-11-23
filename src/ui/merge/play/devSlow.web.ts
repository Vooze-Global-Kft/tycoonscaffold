/**
 * Web preview only (Metro takes ./devSlow.ts on phones):
 * - `?fxSlow=5` plays the play canvas's beats five times slower, so a screenshot (about a second
 *   each) can catch a stamp or a fold;
 * - `globalThis.__lanternPlay.game()` hands a test driver the store's current merge game, so a
 *   scripted play-through can find a pair to merge or a good a ticket wants (the merge-layout
 *   rectangles give the points to drag between).
 */
import { useGame } from '../../../state/store';
import { mergeLayout } from '../layout';
import { cellCentre, counterCount } from './geometry';

function read(): number {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('fxSlow') : null;
    const v = q ? Number(q) : 1;
    return Number.isFinite(v) && v >= 1 && v <= 20 ? v : 1;
  } catch {
    return 1;
  }
}
export const fxSlow = read();

(globalThis as { __lanternPlay?: unknown }).__lanternPlay = {
  game: () => useGame.getState().game,
  cfg: () => useGame.getState().cfg,
  /** The points a finger uses (the preview has no safe-area insets): cells, counter columns, banner, Basket. */
  points: () => {
    const L = mergeLayout(window.innerWidth, window.innerHeight, { top: 0, bottom: 0 });
    const g = useGame.getState().game as { merge?: { counters: unknown[] } };
    const cols = L.counters[counterCount(g.merge?.counters.length ?? 2)];
    const mid = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    return { cells: Array.from({ length: 56 }, (_, i) => cellCentre(L, i)), counters: cols.map(mid), banner: mid(L.banner), basket: mid(L.basket), fronts: L.fronts.map(mid) };
  },
};
