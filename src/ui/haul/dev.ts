/**
 * Development switches of the haul screens in the web preview (on top of src/dev/devtools.ts's
 * `?preset=` and `&speed=`): `&sheet=rig|station|contracts` (`&slot=<n>` for the rig),
 * `&spoke=fitting|starmap|salvage|comms|trade`, `&overlay=jump`. Nothing here runs on a phone.
 */
import { Platform } from 'react-native';
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
}
