/**
 * The merge mode's hint source (spec 3.1), handed to the shared hint layer by the mode entry
 * (`hints`). The firefly on the main screen is the mode's own layer (./FireflyPointer.tsx
 * `FireflyLayer`, driven by the pure script ./hintScript.ts); this source answers the shared
 * HintOverlay that every kit Sheet carries, for the one control inside an open sheet that finishes a
 * guided step: the stall sheet's gear button (`sheet:gear`, the first gear level), its open button
 * (`sheet:open`, the Tea stall), the shutter confirm's buy button (`confirm:shutter`). The bars
 * package registers those buttons with useTarget (keys in src/ui/hints/targets.ts).
 *
 * Note: the shared HintOverlay draws, inside a dialog, only keys of its own list (DIALOG_KEYS); until
 * the wiring package lets a source name its dialog keys (requests.md, [screens-platform]) these
 * answers are not drawn, and the step's pointer on the main screen (the stall front, the goal line,
 * the shutter) is what guides.
 * Owned by the hints and platform package (docs/design/market-build-plan.md).
 */
import * as R from '../../engine/merge';
import { useGame } from '../../state/store';
import type { Hint, HintSource } from '../hints/source';
import { currentStep } from './hintScript';
import { useMergeUi } from './uiState';

/** The in-sheet control that finishes the current guided step, as a shared hint (route: the control itself). */
export function sheetHints(): Hint[] {
  const { cfg, game } = useGame.getState();
  const g = game as R.MergeGame;
  if (!R.isMerge(cfg) || !g.merge) return [];
  const sheet = useMergeUi.getState().sheet;
  if (!sheet) return [];
  const step = currentStep(g);
  const key =
    step === 'gear' && sheet.type === 'stall' && sheet.chain === 0
      ? 'sheet:gear'
      : step === 'tea' && sheet.type === 'stall' && sheet.chain === 1
        ? 'sheet:open'
        : step === 'shutter' && sheet.type === 'shutter'
          ? 'confirm:shutter'
          : null;
  return key ? [{ key, route: [key], row: null }] : [];
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
