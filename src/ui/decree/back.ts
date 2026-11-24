/**
 * Android back and the app's life over the desk (spec 4.4, 2.7, 2.15), without React Native so it can
 * be tested; ./platform.tsx registers `onBack` with BackHandler and `onAppState` with AppState.
 *
 * Android back (4.4), one press closes the top layer:
 * - the away report first (it is collected without the ad: its earnings are already in the treasury);
 * - then uiState `closeTop`: an armed strip, the in-tray peek, a sheet, a full-screen view (Election
 *   Night's own handler jumps to its result first);
 * - on the bare desk a pending take-back commits, and the app leaves (the system default).
 * A kit Sheet is a native Modal and gets the key itself (its onRequestClose = its close button).
 *
 * The app's life (2.7, 2.15):
 * - to the background: a pending take-back commits ("it commits ... when the app goes to the
 *   background"), then the game is saved (App.tsx's own handler saves too; this one saves after the
 *   commit so the saved game holds it);
 * - back to the foreground: nothing here. App.tsx's handler runs the shared offline path once
 *   (store.resume → EngineMode.offline → decreeOffline, paid on compute); a take-back a killed app
 *   left pending is committed by the rules' away path first (offline.ts `settlePending`).
 *
 * Owned by the hints and platform package (PLATFORM).
 */
import * as R from '../../engine/decree';
import { decreeActions } from '../../modes/decree/actions';
import { useGame } from '../../state/store';
import { useDecreeUi } from './uiState';

/** A signed paper rests in its take-back window now. */
export function pendingNow(): boolean {
  const { cfg, game } = useGame.getState();
  const g = game as R.DecreeGame;
  return R.isDecree(cfg) && !!g.decree?.pending;
}

/** Commits a pending take-back (silently); true when there was one and it committed. */
export function commitPendingIfAny(): boolean {
  if (!pendingNow()) return false;
  return decreeActions.commitPending();
}

/**
 * One press of Android back (4.4). True when it closed a layer (the app stays), false on the bare
 * desk (the system default: the app goes to the background), after committing a pending take-back.
 */
export function onBack(): boolean {
  const s = useGame.getState();
  const ui = useDecreeUi.getState();
  if (s.offline !== null && ui.sheet?.type === 'away') {
    void decreeActions.collectAway(false);
    ui.closeSheet();
    return true;
  }
  if (ui.closeTop()) return true;
  commitPendingIfAny();
  return false;
}

/** The app's state changed (react-native AppState): to the background, a pending take-back commits and the game is saved. */
export function onAppState(state: string): void {
  if (state !== 'background') return;
  const committed = commitPendingIfAny();
  // Anything the desk was holding is let go: a finger cannot stay down across the background.
  const ui = useDecreeUi.getState();
  if (ui.fingerDown) ui.setFinger(false);
  if (ui.armed !== null) ui.disarm();
  if (committed) void useGame.getState().save();
}
