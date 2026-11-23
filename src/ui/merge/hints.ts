/**
 * The merge mode's hint source (spec 3.1): what the firefly points at. The rules decide which hints
 * apply (src/engine/merge `hintsFor`, a pure function of the state); this file orders them and hands
 * them to the shared HintOverlay (point hints inside a sheet) and to the play canvas's own hint
 * layer (drag trails on the board). Target keys: src/ui/hints/targets.ts, "KEYS of the merge mode".
 * PLACEHOLDER of the skeleton: no hint yet (hintsFor is not built).
 * Owned by the hints and platform package (docs/design/market-build-plan.md).
 */
import type { HintSource } from '../hints/source';

export const mergeHints: HintSource = {
  ask: () => [],
};
