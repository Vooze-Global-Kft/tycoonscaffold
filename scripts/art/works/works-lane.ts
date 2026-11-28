/**
 * Sheet "works-lane" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-LANE's): the garage's and the plumber's sites, the axle-weight sign, the manifest
 * part src/ui/salvage/art/manifest/worksLane.ts drawn by src/ui/salvage/art/worksLane.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-lane.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-lane
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksLane') as typeof import('../../../src/ui/salvage/art/manifest/worksLane');
  await x.contact('works-lane', M.WORKS_LANE);
}
