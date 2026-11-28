/**
 * Sheet "works-things" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-LOTS's): the seven lot kinds in their cut stages, the pad, the picking table, the manifest
 * part src/ui/salvage/art/manifest/worksThings.ts drawn by src/ui/salvage/art/lots.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-things.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-things
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksThings') as typeof import('../../../src/ui/salvage/art/manifest/worksThings');
  await x.contact('works-things', M.WORKS_THINGS);
}
