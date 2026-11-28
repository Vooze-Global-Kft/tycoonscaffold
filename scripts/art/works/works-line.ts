/**
 * Sheet "works-line" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-LINE's): the shredder line, the depollution bay, the car stages, the battery box, the manifest
 * part src/ui/salvage/art/manifest/worksLine.ts drawn by src/ui/salvage/art/worksLine.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-line.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-line
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksLine') as typeof import('../../../src/ui/salvage/art/manifest/worksLine');
  await x.contact('works-line', M.WORKS_LINE);
}
