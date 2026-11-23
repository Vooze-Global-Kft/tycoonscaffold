/**
 * The merge mode's hint source (spec 3.1), handed to the shared hint layer by the mode entry
 * (`hints`). The firefly on the main screen is the mode's own layer (./FireflyPointer.tsx
 * `FireflyLayer`, driven by the pure script ./hintScript.ts); this source answers the shared
 * HintOverlay that every kit Sheet carries, for the one control inside an open sheet that finishes a
 * guided step (M44: the purchase the goal line names, for the first three purchases): the stall
 * sheet's buttons (`sheet:gear`, `sheet:stall`, `sheet:minder`, `sheet:open`) and the shutter
 * confirm's (`confirm:shutter`). The bars package registers those buttons with useTarget (keys in
 * src/ui/hints/targets.ts).
 *
 * Note: the shared HintOverlay draws, inside a dialog, only keys of its own list (DIALOG_KEYS); until
 * the wiring package lets a source name its dialog keys (requests.md, [screens-platform]) these
 * answers are not drawn, and the step's pointer on the main screen (the stall front, the goal line,
 * the shutter) is what guides.
 * Owned by the screens lead since the join (written by the hints and platform package).
 */
import * as R from '../../engine/merge';
import { useGame } from '../../state/store';
import type { Hint, HintSource } from '../hints/source';
import { currentStep } from './hintScript';
import { useMergeUi } from './uiState';

/** The sheet button that buys each kind of goal (src/ui/hints/targets.ts keys, registered by the bars package). */
const BUTTON: Partial<Record<R.AdviceKind, string>> = { gear: 'sheet:gear', stall: 'sheet:stall', minderHire: 'sheet:minder', minderLevel: 'sheet:minder', openStall: 'sheet:open', shutter: 'confirm:shutter' };

/**
 * The in-sheet control that finishes the current guided step (M44: one of the first three
 * purchases, the one the goal line names), as a shared hint (route: the control itself); only when
 * the open sheet is the one that sells it.
 */
export function sheetHints(): Hint[] {
  const { cfg, game } = useGame.getState();
  const g = game as R.MergeGame;
  if (!R.isMerge(cfg) || !g.merge) return [];
  const sheet = useMergeUi.getState().sheet;
  if (!sheet) return [];
  const step = currentStep(g);
  if (step !== 'buy1' && step !== 'buy2' && step !== 'buy3') return [];
  const goal = R.advice(cfg, g);
  const key = goal ? BUTTON[goal.kind] : undefined;
  if (!goal || !key || goal.cost > g.cash) return [];
  const here = goal.kind === 'shutter' ? sheet.type === 'shutter' && sheet.group === goal.target : sheet.type === 'stall' && sheet.chain === goal.target;
  return here ? [{ key, route: [key], row: null }] : [];
}

export const mergeHints: HintSource = {
  ask: () => {
    try {
      return sheetHints();
    } catch {
      return [];
    }
  },
};
