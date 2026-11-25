/**
 * The hud's triggers for cards the overlay engineers draw (yard-stage1.md 4.3, 4.4):
 * - the rung sign: on the rules' `rung` event, the centred card {kind: 'rung', n};
 * - the away card: on an `awayReport` event, and once at start when the save holds a waiting away card,
 *   as soon as the loading curtain has parted (never under it).
 * Both through uiState's `openCard`; the cards themselves are overlays-b's.
 */
import { useEffect } from 'react';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { loadingClock } from '../loading/clock';
import { useSalvageUi } from '../uiState';
import { yardEvents } from './pump';

export function useHudTriggers(): void {
  useEffect(() => {
    const off = yardEvents.on(['rung', 'awayReport'], (e) => {
      const ui = useSalvageUi.getState();
      if (e.type === 'rung') ui.openCard({ kind: 'rung', n: e.n });
      else ui.openCard({ kind: 'away' });
    });
    // A waiting away card from the save (time away computed at start): shown once the gate has parted.
    let timer: ReturnType<typeof setInterval> | undefined;
    const check = () => {
      if (!loadingClock.done.value) return false;
      const g = useGame.getState().game as R.SalvageGame;
      if (g?.salvage && R.awayCard(g)) useSalvageUi.getState().openCard({ kind: 'away' });
      return true;
    };
    if (!check()) {
      timer = setInterval(() => {
        if (check()) clearInterval(timer);
      }, 250);
    }
    return () => {
      off();
      clearInterval(timer);
    };
  }, []);
}
