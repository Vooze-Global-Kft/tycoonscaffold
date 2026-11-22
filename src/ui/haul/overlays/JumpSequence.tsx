/** SKELETON (package "spokes"). The Jump sequence (spec 4.6): stars streak into lines (1.5 s), the station shudders, the new galaxy's name types out (1 s); jump_warp plays with it. Opened by the Star Map's confirm (uiState overlay 'jump'). Registers with useOverlay. Renders nothing yet. */
import { useHaulUi } from '../uiState';

export function JumpSequence() {
  const open = useHaulUi((s) => s.overlay === 'jump');
  if (!open) return null;
  return null;
}
