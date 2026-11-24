/**
 * The side whose outcome the bars preview (4.1: while a strip is armed, the club rings and the approval
 * chip show that outcome's values from the rules' strip data): a drag armed past 40 pt (uiState
 * `preview`, set by the desk) or the second path's armed strip (uiState `armed`).
 * Owned by the bars package (BARS).
 */
import { useDecreeUi } from '../uiState';

export function usePreviewSide(): 'sign' | 'refuse' | null {
  return useDecreeUi((s) => s.preview ?? s.armed);
}
