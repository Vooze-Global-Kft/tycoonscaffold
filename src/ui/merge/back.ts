/**
 * Android back over the merge screen (spec 4.5), without React Native so it can be tested: one press
 * closes the top layer (the away report first, collected without the ad; then uiState `closeTop`:
 * armed tap-tap, long-press chip, undo chip put away, sheet, spoke) and leaves the app only from the
 * bare board. ./platform.tsx registers `onBack` with BackHandler. Owned by the hints and platform package.
 */
import * as R from '../../engine/merge';
import { mergeActions } from '../../modes/merge/actions';
import { useGame } from '../../state/store';
import { useMergeUi } from './uiState';

/** The Basket undo chip's `until` while it shows (game clock), else null: what Android back puts away (4.5). */
export function undoShowing(g: R.MergeGame | null | undefined): number | null {
  const u = g?.merge?.basketUndo;
  if (!u) return null;
  const clock = g.stats?.playSeconds ?? 0;
  return u.until > clock ? u.until : null;
}

/**
 * One press of Android back (4.5). True when it closed a layer (the app stays), false on the bare
 * board (the system default: the app goes to the background). Exported for tests.
 */
export function onBack(): boolean {
  const s = useGame.getState();
  if (s.offline) {
    void mergeActions.collectAway(false);
    return true;
  }
  const ui = useMergeUi.getState();
  const until = undoShowing(s.game as R.MergeGame);
  // The sheet and the spoke play their own ui_close when they go (sheets/parts.tsx MergeSheet).
  return ui.closeTop(until);
}
