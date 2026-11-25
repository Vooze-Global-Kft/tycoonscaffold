/**
 * A loaded save repaired against the content (yard-stage1.md 2.13). Owner: rules-book. Moved from the
 * facade at the seam (16:20); the STUB body still lives in create.ts (`reconcileSalvage`): replace it here.
 */
import type { GameState } from '../types';
import { reconcileSalvage as reconcileStub } from './create';
import type { SalvageConfig, SalvageGame } from './types';

/** A loaded save repaired against the content; never throws for readable input (salvageMode catches the rest). STUB(hour 0). */
export function reconcileSalvage(cfg: SalvageConfig, base: GameState, raw: unknown, now: number): SalvageGame {
  return reconcileStub(cfg, base, raw, now);
}
