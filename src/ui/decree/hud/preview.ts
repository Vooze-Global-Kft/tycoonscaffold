/**
 * The side whose outcome the bars preview (4.1: while a strip is armed, the club rings and the approval
 * chip show that outcome's values from the rules' strip data): the second path's armed strip
 * (uiState `armed`), or a drag armed past 40 pt (uiState `preview` once PLATFORM adds it; the bars'
 * stand-in localUi `preview` meanwhile). Owned by the bars package (BARS).
 */
import { useDecreeUi } from '../uiState';
import { useBarsUi } from './localUi';

export function usePreviewSide(): 'sign' | 'refuse' | null {
  const ui = useDecreeUi((s) => (s as { preview?: 'sign' | 'refuse' | null }).preview ?? s.armed);
  const local = useBarsUi((s) => s.preview);
  return ui ?? local;
}
