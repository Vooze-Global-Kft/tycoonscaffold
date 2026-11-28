/**
 * Sheet "works-plots" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-PLOTS's): the plots by look, the plates' crates, the analyser's cradle, the manifest
 * part src/ui/salvage/art/manifest/worksPlots.ts drawn by src/ui/salvage/art/worksPlots.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-plots.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-plots
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksPlots') as typeof import('../../../src/ui/salvage/art/manifest/worksPlots');
  await x.contact('works-plots', M.WORKS_PLOTS);
}
