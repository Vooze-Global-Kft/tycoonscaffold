/**
 * Development switches of the haul screens in the web preview (web only: Metro takes ./dev.ts, which does nothing, for iOS and Android) (on top of src/dev/devtools.ts's
 * `?preset=` and `&speed=`): `&sheet=rig|station|contracts` (`&slot=<n>` for the rig),
 * `&spoke=fitting|starmap|salvage|comms|trade`, `&overlay=jump`, (`?view=boot`, the loading screen, is the haul entry's dev view: src/modes/haul/devViews.web.ts), `&menu=1` (the station menu), `&drained=<slot>` (a drilled-out rock with a pile), and
 * `&away=<seconds>`: the app opens on a save that old, with the store's own offline computation
 * (spec 10.1 #7: `preset=mid&away=600` shows the Shift Log). They are applied once the shared
 * switches (the preset) are in the store (`devParamsApplied`, play-10), never on a timer, so a
 * preset cannot overwrite them. Nothing here runs on a phone.
 */
import { Platform } from 'react-native';
import { devParamsApplied } from '../../dev/devtools';
import * as E from '../../engine/economy';
import { useGame } from '../../state/store';
import { useHaulUi, type HaulSpoke } from './uiState';

export function applyHaulDevParams(): void {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return;
  void devParamsApplied().then(applyNow);
}

function applyNow(): void {
  const q = new URLSearchParams(location.search);
  const ui = useHaulUi.getState();
  const sheet = q.get('sheet');
  if (sheet === 'rig') ui.openSheet({ type: 'rig', slot: Number(q.get('slot') ?? 0) || 0 });
  if (sheet === 'station' || sheet === 'contracts') ui.openSheet({ type: sheet });
  const spoke = q.get('spoke');
  if (spoke && ['fitting', 'starmap', 'salvage', 'comms', 'trade'].includes(spoke)) ui.openSpoke(spoke as HaulSpoke);
  const overlay = q.get('overlay');
  if (overlay === 'jump' || overlay === 'leave') ui.openOverlay(overlay);
  if (q.get('menu') === '1') ui.setMenu(true);
  // `&drained=<slot>`: that rock is drilled to nothing with ore left on its pile (check3 NEW[8], the Rig sheet's "Drilled out").
  const drained = q.get('drained');
  if (drained !== null) {
    const i = Number(drained) || 0;
    const { game } = useGame.getState();
    const h = (game as unknown as { haul?: { slots: { life: number; pile: number }[] } }).haul;
    const s = h?.slots[i];
    if (h && s) {
      const slots = h.slots.slice();
      slots[i] = { ...s, life: 0, pile: Math.max(s.pile, 4000) };
      useGame.setState({ game: { ...game, haul: { ...h, slots } } as typeof game });
    }
  }
  const away = Number(q.get('away'));
  if (Number.isFinite(away) && away > 0) {
    // The same offline computation the store runs when the app opens on a save `away` seconds old
    // (store.boot: E.computeOffline, then `offline` is set when it lasted at least
    // economy.offline.minSecondsToShow and earned something).
    const { cfg, game } = useGame.getState();
    const now = Date.now();
    const then = now - away * 1000;
    const old = {
      ...game,
      lastSavedAt: then,
      stats: { ...game.stats, clockHigh: then },
    };
    const off = E.computeOffline(cfg, old, now);
    const show = off.seconds >= cfg.economy.offline.minSecondsToShow && off.earnings > 0;
    useGame.setState({
      game: off.game ?? old,
      offline: show ? { seconds: off.seconds, earnings: off.earnings, report: off.report } : null,
    });
  }
}
