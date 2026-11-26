/**
 * WHAT THE WORLD DRAWS OF THE WORKS (stage 2, yard-stage2.md 2.18's FrameTable additions, 4.3, 4.6, 4.7):
 * the plates (FrameTable.works), the tags on things, the magnet crane, the forklift, the visitors, the van,
 * the picking table. Owner: rules-works (Phase B). frame.ts `frameCfg` is the closed dispatcher (s2a-fix, the
 * lead's ruling of 26 Nov 09:50): it builds the first yard's table, then hands it here to ADD these fields.
 * Pure: a function of the content and the state; never a tuned number of its own.
 *
 * PHASE A STUB: adds nothing (the frame is the first yard's, field for field).
 */
import type { SalvageContent } from '../../config/schema.salvage';
import type { FrameTable, SalvageGame } from './types';

/** Add the works' fields to the frame `f` of game g (content c: the state's own, layer.ts contentAt). Stub: nothing. */
export function frameWorks(c: SalvageContent, g: SalvageGame, f: FrameTable): void {
  void c;
  void g;
  void f;
}
