/**
 * THE WORKS' PLATES AND CHIPS IN THE WORLD (PLAN2 2.8; a stub of C-WORLD-1, filled by WLD-LABELS): every plot, hall, the
 * line, the pad, the rack and the bunker that stands still says why ("Waiting for brass · 380 / 600 kg", "Next car in
 * 4 m", "Pours by itself in 12 m": the frame's `why` and its dates; the owner's review, point 2), and every label fits its
 * box at text size 1.3 (point 4; the words are keys of the family `world`, src/ui/salvage/strings/world.ts).
 *
 * The contract: labels.ts (C-WORLD-2) appends `worksLabels(cfg, g, f)` to its own list; nothing below the works' opening
 * (the frame carries no `works`). Pure. Today: none.
 */
import type * as R from '../../../engine/salvage';
import type { LabelItem } from './labels';

const NONE: LabelItem[] = [];

/** The works' labels of a frame (stub: none). */
export function worksLabels(_cfg: R.SalvageConfig, _g: R.SalvageGame, f: R.FrameTable): LabelItem[] {
  if (f.works === undefined) return NONE;
  return NONE;
}
