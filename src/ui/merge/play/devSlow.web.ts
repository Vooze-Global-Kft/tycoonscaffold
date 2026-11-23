/**
 * Web preview only (Metro takes ./devSlow.ts on phones):
 * - `?fxSlow=5` plays the play canvas's beats five times slower, so a screenshot (about a second
 *   each) can catch a stamp or a fold;
 * - `globalThis.__lanternPlay.game()` hands a test driver the store's current merge game, so a
 *   scripted play-through can find a pair to merge or a good a ticket wants (the merge-layout
 *   rectangles give the points to drag between).
 */
import * as R from '../../../engine/merge';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { targets } from '../../hints/targets';
import { useMergeUi } from '../uiState';
import { devInsets } from '../devInsets';
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

/** Every fx key played, with the page time (a driver checks that each beat sounds once). */
const sounds: { key: string; t: number }[] = [];
const play0 = fx.play;
fx.play = (name, opts) => {
  sounds.push({ key: String(name), t: Date.now() });
  if (sounds.length > 4000) sounds.splice(0, 1000);
  return play0(name, opts);
};

(globalThis as { __lanternPlay?: unknown }).__lanternPlay = {
  game: () => useGame.getState().game,
  cfg: () => useGame.getState().cfg,
  /** The rules' goal (what the goal line names), the UI state, a hint target's rectangle, the sounds so far. */
  advice: () => {
    const { cfg, game } = useGame.getState();
    return R.isMerge(cfg) ? R.advice(cfg, game as R.MergeGame) : null;
  },
  ui: () => {
    const u = useMergeUi.getState();
    return { armed: u.armed, chip: u.chip, sheet: u.sheet, spoke: u.spoke, fingerDown: u.fingerDown, undoHidden: u.undoHidden };
  },
  target: (key: string) => targets.get(key),
  sounds: (since = 0) => sounds.filter((s) => s.t >= since),
  /** The points a finger uses (the preview has no safe-area insets): cells, counter columns, banner, Basket. */
  points: () => {
    const L = mergeLayout(window.innerWidth, window.innerHeight, devInsets ?? { top: 0, bottom: 0 });
    const g = useGame.getState().game as { merge?: { counters: unknown[] } };
    const cols = L.counters[counterCount(g.merge?.counters.length ?? 2)];
    const mid = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    return { cells: Array.from({ length: 56 }, (_, i) => cellCentre(L, i)), counters: cols.map(mid), banner: mid(L.banner), basket: mid(L.basket), fronts: L.fronts.map(mid) };
  },
};

/** `?fs=1.3` (or `?fontScale=1.3`, the bars' switch): the long-press chip sized as on a phone with larger text (the browser has no font scale). */
export const fontScaleOverride: number | null = (() => {
  try {
    const u = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    const q = u ? (u.get('fs') ?? u.get('fontScale')) : null;
    const v = q ? Number(q) : NaN;
    return Number.isFinite(v) && v >= 1 && v <= 2 ? v : null;
  } catch {
    return null;
  }
})();
