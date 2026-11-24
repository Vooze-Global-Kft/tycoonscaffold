/**
 * The VIEWS package's one mount (overlays/Overlays.tsx, its VIEWS block): the face picker, Election
 * Night and the Office wall (full-screen views of uiState), the result and move sheets (uiState
 * sheets) and the monument offer (a local stand-in until uiState has its sheet type: ./viewsUi.ts),
 * and the moments the game stops for, opened as the rules' phase asks:
 * - no face yet on the first day (3.1): the face picker;
 * - the run-up done (the rules' canCount): the votes are counted (decreeActions.countVotes) and
 *   Election Night opens; a reload in the count opens it again;
 * - Election Night closed while the votes are being counted (Android back, 4.4): the night ends
 *   (decreeActions.endElectionNight) and the result follows, never out mid-count;
 * - phase result: the result sheet, until a choice ("Stand for …" opens the move sheet first);
 * - after the choice, this term's monument offer, if there is one.
 * Nothing opens by itself while a strip is armed, a paper rests in its take-back window, or another
 * sheet or view is open (4.4: one at a time). Owned by the views package (VIEWS).
 */
import { useEffect, useRef } from 'react';
import { decreeActions } from '../../../modes/decree/actions';
import { MonumentSheet } from '../sheets/Monument';
import { MoveSheet } from '../sheets/Move';
import { ResultSheet } from '../sheets/Result';
import { useDecreeUi } from '../uiState';
import { useDecree } from '../useDecree';
import * as R from '../../../engine/decree';
import { ElectionNight } from './ElectionNight';
import { FacePicker } from './FacePicker';
import { OfficeWall } from './Office';
import { applyViewsDevParams } from './dev';
import { useViewsUi } from './viewsUi';

// The preview's &night=, &result=, &wall=, &monument=, &face= switches (nothing on a phone).
applyViewsDevParams();

/** The pause after the run-up's last paper before the count begins (the paper leaves the desk first). Presentation only. */
const COUNT_AFTER_MS = 1400;

export function ViewsHost() {
  const view = useDecreeUi((s) => s.view);
  const sheet = useDecreeUi((s) => s.sheet?.type ?? null);
  const armed = useDecreeUi((s) => s.armed !== null);
  const monument = useViewsUi((s) => s.monument);
  const isDecree = useDecree(() => true, false);
  // The first day only (3.1): a save past it without a face (a web preset) is never stopped for one.
  const noFace = useDecree((_c, g) => g.decree.face === null && g.decree.office === 0 && g.decree.term === 1 && g.decree.day === 0, false);
  const phase = useDecree((_c, g) => g.decree.phase, null);
  const countable = useDecree((c, g) => R.canCount(c, g), false);
  const pending = useDecree((_c, g) => g.decree.pending !== null, false);
  const free = !view && !sheet && !monument && !armed && !pending;
  const nightOpen = useRef(false);

  // 3.1: the face picker on the first day.
  useEffect(() => {
    if (!isDecree || !noFace || !free) return;
    const t = setTimeout(() => {
      const ui = useDecreeUi.getState();
      if (!ui.view && !ui.sheet) ui.openView('facePicker');
    }, 600);
    return () => clearTimeout(t);
  }, [isDecree, noFace, free]);
  // A state that is not the first day any more (a save loaded over a new game) closes a picker nobody used.
  const faceless = useDecree((_c, g) => g.decree.face === null, false);
  useEffect(() => {
    if (view === 'facePicker' && faceless && !noFace) useDecreeUi.getState().closeView();
  }, [view, faceless, noFace]);

  // The run-up done: count, then election night.
  useEffect(() => {
    if (!countable || !free) return;
    const t = setTimeout(() => {
      const ui = useDecreeUi.getState();
      if (ui.view || ui.sheet || ui.armed || useViewsUi.getState().monument) return;
      if (decreeActions.countVotes()) {
        nightOpen.current = true;
        ui.openView('electionNight');
      }
    }, COUNT_AFTER_MS);
    return () => clearTimeout(t);
  }, [countable, free]);

  // In the count: the night is shown; closed before its end (Android back), the night ends and the result follows.
  useEffect(() => {
    if (phase !== 'count') {
      nightOpen.current = false;
      return;
    }
    if (view === 'electionNight') {
      nightOpen.current = true;
      return;
    }
    if (nightOpen.current) {
      nightOpen.current = false;
      decreeActions.endElectionNight();
      return;
    }
    if (!view && !sheet && !monument) {
      nightOpen.current = true;
      useDecreeUi.getState().openView('electionNight');
    }
  }, [phase, view, sheet, monument]);

  // Phase result: the result sheet until a choice is made (it comes back when another sheet closes).
  useEffect(() => {
    if (phase !== 'result' || view || sheet || monument) return;
    const t = setTimeout(() => {
      const ui = useDecreeUi.getState();
      if (!ui.view && !ui.sheet && !useViewsUi.getState().monument) ui.openSheet({ type: 'result' });
    }, 450);
    return () => clearTimeout(t);
  }, [phase, view, sheet, monument]);

  // Phase result left (a choice was made): the result and move sheets close.
  useEffect(() => {
    if (phase !== 'result' && (sheet === 'result' || sheet === 'move')) useDecreeUi.getState().closeSheet();
  }, [phase, sheet]);

  const ui = useDecreeUi.getState;
  const endNight = () => {
    nightOpen.current = false;
    decreeActions.endElectionNight();
    ui().closeView();
  };
  const afterChoice = (moved: boolean) => {
    ui().closeSheet();
    if (!moved) return;
    // This term's monument, offered once the choice is made (5.8), after the sheet has slid away.
    setTimeout(() => useViewsUi.getState().openMonument(), 500);
  };
  const stay = () => afterChoice(decreeActions.chooseAfterResult('stay'));
  const moveUp = () => afterChoice(decreeActions.chooseAfterResult('moveUp'));

  if (!isDecree) return null;
  return (
    <>
      <ResultSheet visible={sheet === 'result' && phase === 'result'} onClose={() => ui().closeSheet()} onStand={() => ui().openSheet({ type: 'move' })} onStay={stay} />
      <MoveSheet visible={sheet === 'move' && phase === 'result'} onClose={() => ui().openSheet({ type: 'result' })} onConfirm={moveUp} />
      <MonumentSheet visible={monument} onClose={() => useViewsUi.getState().closeMonument()} />
      <FacePicker visible={view === 'facePicker'} onDone={() => ui().closeView()} />
      <ElectionNight visible={view === 'electionNight'} onEnd={endNight} />
      <OfficeWall
        visible={view === 'office'}
        onClose={() => ui().closeView()}
        onOffer={() => {
          ui().closeView();
          setTimeout(() => useViewsUi.getState().openMonument(), 50);
        }}
      />
    </>
  );
}
