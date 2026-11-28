/**
 * Sheet "works-small" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-SMALL's): the small skip things, the works grades' glyphs and pictograms, the manifest
 * part src/ui/salvage/art/manifest/worksSmall.ts drawn by src/ui/salvage/art/worksSmall.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-small.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-small
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksSmall') as typeof import('../../../src/ui/salvage/art/manifest/worksSmall');
  await x.contact('works-small', M.WORKS_SMALL);
}
