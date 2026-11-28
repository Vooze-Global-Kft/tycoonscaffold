/**
 * Sheet "works-halls" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-HALLS's): the three halls (sheds, furnaces, glow, pour streams), the manifest
 * part src/ui/salvage/art/manifest/worksHalls.ts drawn by src/ui/salvage/art/halls.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-halls.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-halls
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksHalls') as typeof import('../../../src/ui/salvage/art/manifest/worksHalls');
  await x.contact('works-halls', M.WORKS_HALLS);
}
