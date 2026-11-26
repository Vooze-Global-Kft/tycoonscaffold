/**
 * The hud's triggers for cards the overlay engineers draw (yard-stage1.md 4.3, 4.4):
 * - the rung sign: on the rules' `rung` event, the centred card {kind: 'rung', n};
 * - the away card: on an `awayReport` event, and once at start when the save holds a waiting away card,
 *   as soon as the loading curtain has parted (never under it).
 * - H2: on a WARM resume the store's resume() pays the away pass without an event (salvageMode.offline takes
 *   no events array), so the waiting card is also watched in the store: a new one opens once the curtain
 *   has parted.
 * Both through the overlay engineers' `openCard` (../overlays/cardStack.ts); the cards are theirs.
 */
import { useEffect } from 'react';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { loadingClock } from '../loading/clock';
import { openCard } from '../overlays/cardStack';
import { yardEvents } from './pump';

export function useHudTriggers(): void {
  useEffect(() => {
    const off = yardEvents.on(['rung', 'awayReport'], (e) => {
      if (e.type === 'rung') openCard({ kind: 'rung', n: e.n });
      else openCard({ kind: 'away' });
    });
    // A waiting away card from the save (time away computed at start): shown once the gate has parted.
    let timer: ReturnType<typeof setInterval> | undefined;
    const check = () => {
      if (!loadingClock.done.value) return false;
      const g = useGame.getState().game as R.SalvageGame;
      if (g?.salvage && R.awayCard(g)) openCard({ kind: 'away' });
      return true;
    };
    // Compared by what it says, not by identity (a copied state must not open it twice).
    const card = (s: { game: unknown }) => {
      const g = s.game as R.SalvageGame;
      const a = g?.salvage ? R.awayCard(g) : null;
      return a ? `${a.seconds}|${a.absentS ?? ''}|${a.money}|${a.supplied_g}|${a.loads}` : null;
    };
    let last = card(useGame.getState());
    if (!check()) {
      timer = setInterval(() => {
        if (check()) clearInterval(timer);
      }, 250);
    }
    // A warm resume (H2): a waiting away card that appears in the store opens (once the curtain has parted).
    const offStore = useGame.subscribe((s) => {
      const a = card(s);
      if (a && a !== last && loadingClock.done.value) openCard({ kind: 'away' });
      last = a;
    });
    return () => {
      off();
      offStore();
      clearInterval(timer);
    };
  }, []);
}
