/**
 * Sheet "works-hall-parts" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-HALLPARTS's): the halls' filters, moulds, charge boxes, slag skips and the drums, the manifest
 * part src/ui/salvage/art/manifest/worksHallParts.ts drawn by src/ui/salvage/art/hallParts.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-hall-parts.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-hall-parts
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksHallParts') as typeof import('../../../src/ui/salvage/art/manifest/worksHallParts');
  await x.contact('works-hall-parts', M.WORKS_HALL_PARTS);
}
