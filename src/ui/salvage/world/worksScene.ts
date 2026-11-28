/**
 * THE WORKS IN THE RULES' PICTURE (PLAN2 2.8, C-WORLD-1; critic-build F14). FINAL: it only calls the plant's and the
 * floor's files (./worksPlantScene.ts, WLD-PLANT; ./worksFloorScene.ts, WLD-FLOOR), so neither package edits a shared file.
 * actors.ts rulesScene calls the two functions below at every store change:
 * - `worksItems(c, f, res)`: the works' items appended to the scene's list (before it is presorted);
 * - `floorItems(c, f, res)`: the floor's override (null: the first yard's things and pieces as they are).
 * Both answer nothing below the works' opening (the frame carries no `works` there: frameWorks.ts writes it only from the
 * opening), so a first-yard frame takes today's path bit for bit (scene.mts check). Pure.
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import type * as R from '../../../engine/salvage';
import { floorOverride, type FloorOverride } from './worksFloorScene';
import { plantItems } from './worksPlantScene';
import type { WorksResolver } from './worksTable';

export type { FloorOverride };

const NONE: number[] = [];

/** Has the frame the works (from the works' opening: frameWorks.ts writes `works`)? */
export const worksOpenIn = (f: R.FrameTable): boolean => f.works !== undefined;

/** The works' items of a frame (none below the opening). */
export function worksItems(c: SalvageContent, f: R.FrameTable, res: WorksResolver): number[] {
  if (!worksOpenIn(f)) return NONE;
  return plantItems(c, f, res);
}

/** The floor's override of a frame (null below the opening, or when the floor's package draws the first yard's way). */
export function floorItems(c: SalvageContent, f: R.FrameTable, res: WorksResolver): FloorOverride | null {
  if (!worksOpenIn(f)) return null;
  return floorOverride(c, f, res);
}
