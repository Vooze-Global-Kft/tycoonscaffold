/**
 * Development switches of the haul screens in the web preview (on top of src/dev/devtools.ts's
 * `?preset=` and `&speed=`): `&sheet=rig|station|contracts` (`&slot=<n>` for the rig),
 * `&spoke=fitting|starmap|salvage|comms|trade`, `&overlay=jump`, `&menu=1` (the station menu), and
 * `&away=<seconds>`: the app comes back after that long in the background, through the store's
 * real resume path (spec 10.1 #7: `preset=mid&away=600` shows the Shift Log). Nothing here runs on
 * a phone.
 */
import { Platform } from 'react-native';
import { useGame } from '../../state/store';
import { useHaulUi, type HaulSpoke } from './uiState';

export function applyHaulDevParams(): void {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return;
  const q = new URLSearchParams(location.search);
  const ui = useHaulUi.getState();
  const sheet = q.get('sheet');
  if (sheet === 'rig') ui.openSheet({ type: 'rig', slot: Number(q.get('slot') ?? 0) || 0 });
  if (sheet === 'station' || sheet === 'contracts') ui.openSheet({ type: sheet });
  const spoke = q.get('spoke');
  if (spoke && ['fitting', 'starmap', 'salvage', 'comms', 'trade'].includes(spoke)) ui.openSpoke(spoke as HaulSpoke);
  if (q.get('overlay') === 'jump') ui.openOverlay('jump');
  if (q.get('menu') === '1') ui.setMenu(true);
  const away = Number(q.get('away'));
  if (Number.isFinite(away) && away > 0) {
    // After the preset switches have landed: pretend the last save was `away` seconds ago, then resume.
    setTimeout(() => {
      const { game } = useGame.getState();
      const then = Date.now() - away * 1000;
      useGame.setState({ game: { ...game, lastSavedAt: then, stats: { ...game.stats, clockHigh: then } } });
      useGame.getState().resume();
    }, 600);
  }
}
