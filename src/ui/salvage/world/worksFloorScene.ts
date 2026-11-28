/**
 * THE TIPPING FLOOR AND THE CORNER, AGGREGATED (PLAN2 2.8; s2c-plan-world.md 3.3 rule 4; a stub of C-WORLD-1, filled by
 * WLD-FLOOR): from the works' opening the floor holds 160 to 245 things and up to 400 pieces, too many to draw one sprite
 * each. The floor's things are then drawn as a heap decal by count (four sizes by tonnes) with at most 30 whole on top,
 * its loose pieces as heaps by family (at most 40), the corner as at most 4 pallets.
 *
 * The contract: `floorOverride(c, f, res)` returns null (draw the frame's things and pieces as the first yard does) or an
 * override: `things` and `pieces`, the lists actors.ts rulesScene draws whole in place of the frame's (keep each list the
 * SAME object while it holds the same entries: rulesScene caches their items by identity), and `items`, the extra atlas
 * items (the heaps; actors.ts ITEM layout). Called by ./worksScene.ts only, and only from the works' opening. Pure. The
 * picture never contradicts the floor chip's kilograms (the rules'). Today: null (no override).
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import type * as R from '../../../engine/salvage';
import type { WorksResolver } from './worksTable';

export interface FloorOverride {
  things: readonly R.FrameThing[];
  pieces: readonly R.FramePiece[];
  items: number[];
}

/** The floor's override for a frame (stub: none). */
export function floorOverride(_c: SalvageContent, _f: R.FrameTable, _res: WorksResolver): FloorOverride | null {
  return null;
}
