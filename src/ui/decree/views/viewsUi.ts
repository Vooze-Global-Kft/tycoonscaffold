/**
 * Opening the monument offer (spec 5.8) as uiState's `monument` sheet: only while the rules offer one
 * this term (an invisible sheet would hold every other dialog back) and only when no other sheet or
 * view is open (4.4: one at a time). Owned by the screens lead (was the views package's stand-in).
 */
import { decreeNow } from '../../../modes/decree/actions';
import { useDecreeUi } from '../uiState';
import { monumentModel } from './model';

/** Opens the monument sheet if the rules offer a monument now and nothing else is open; says whether it opened. */
export function openMonument(): boolean {
  const ui = useDecreeUi.getState();
  if (ui.sheet || ui.view) return false;
  const now = decreeNow();
  if (!now || !monumentModel(now.cfg, now.g)) return false;
  ui.openSheet({ type: 'monument' });
  return true;
}
