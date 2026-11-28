/**
 * THE WORKS' PLANT IN THE RULES' PICTURE (PLAN2 2.8; a stub of C-WORLD-1, filled by WLD-PLANT / WLD-HALLS): the halls, their
 * furnaces, glow, streams, moulds and charge boxes, the shredder line, the depollution bay with its car, the bunkers, the
 * stillages and their layers, the plots by WorksLook, the analyser's cradle, the pad and the picking table, as atlas items
 * (actors.ts ITEM layout; ./worksTable.ts worksSprite appends one).
 *
 * The contract: `plantItems(c, f, res)` returns the items of the works' plant for one frame; called by ./worksScene.ts only,
 * and only from the works' opening (the frame carries `works`). Pure, deterministic, from the frame's facts only (the
 * screen decides nothing: lesson 13). Keep the returned array the SAME object while its inputs are the same (the scene's
 * list is compared by content before every push: owner1 phone 2). Today: nothing.
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import type * as R from '../../../engine/salvage';
import type { WorksResolver } from './worksTable';

const NONE: number[] = [];

/** The works' plant items for a frame (stub: none). */
export function plantItems(_c: SalvageContent, _f: R.FrameTable, _res: WorksResolver): number[] {
  return NONE;
}
