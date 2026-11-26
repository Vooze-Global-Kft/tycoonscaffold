/**
 * The counting card's driver (owner2-hud, the second update, item 2). While an absence waits for its away pass
 * (src/modes/salvage/returning.ts), and once the loading curtain has parted, the card in the away card's frame is
 * shown (uiState.counting: the stick and the one button are off); two frames after it is on screen the pass runs
 * (returning.ts runPending), the away card opens from the store (../hud/useTriggers.ts, the warm-resume watch) and
 * the counting card goes in the same update: one dialog at a time, no frame with neither. An open card is closed
 * when counting begins (the away card would replace it anyway).
 *
 * The order is a plain object over injected steps (./countingOrder.ts `createCounting`), checked by ./counting.test.ts.
 */
import { useEffect, useMemo } from 'react';
import { devBeginAbsence, onPending, pendingAbsence, recordPassErrorsWith, runPending } from '../../../modes/salvage/returning';
import { crash } from '../../../services/firebase';
import { loadingClock } from '../loading/clock';
import { useSalvageUi } from '../uiState';
import { closeCard, useCards } from './cardStack';
import { createCounting, type Counting } from './countingOrder';
import { devCounting } from './devOpen';

// L1: the mode's returning.ts imports no service; the screen hands it the crash recorder.
recordPassErrorsWith((e, where) => crash.record(e, where));

/** The overlay host's hook: drives the counting card; true while it shows. */
export function useCounting(): boolean {
  const counting = useSalvageUi((s) => s.counting);
  const dev = devCounting();
  const ctl = useMemo(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const c: Counting = createCounting({
      pending: () => pendingAbsence() !== null,
      curtainDone: () => !!loadingClock.done.value,
      show: (on) => useSalvageUi.getState().setCounting(on),
      closeOpenCard: () => void closeCard(),
      frame: (f) => {
        const id = requestAnimationFrame(f);
        return () => cancelAnimationFrame(id);
      },
      run: () => void runPending(),
      poll: (on) => {
        clearInterval(timer);
        timer = on ? setInterval(() => c.sync(), 250) : undefined;
      },
      hold: dev?.mode === 'hold',
    });
    return c;
  }, [dev?.mode]);
  useEffect(() => {
    const off = onPending(ctl.sync);
    ctl.sync();
    return off;
  }, [ctl]);
  // The web preview's ?counting= switch: a return after `hours`, once the curtain has parted.
  useEffect(() => {
    if (!dev) return;
    const t = setInterval(() => {
      if (!loadingClock.done.value) return;
      clearInterval(t);
      devBeginAbsence(dev.hours, dev.mode === 'hold');
    }, 250);
    return () => clearInterval(t);
  }, [dev]);
  // A2: the pass is scheduled only for the counting card that was painted (no card drawn in its place).
  const covered = useCards((s) => s.ref !== null);
  useEffect(() => (counting && !covered ? ctl.painted() : undefined), [counting, covered, ctl]);
  return counting;
}
