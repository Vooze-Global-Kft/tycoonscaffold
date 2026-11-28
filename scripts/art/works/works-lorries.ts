/**
 * Sheet "works-lorries" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-LORRIES's): the crane lorry, its crane frames and loads, the manifest
 * part src/ui/salvage/art/manifest/worksLorries.ts drawn by src/ui/salvage/art/lorries.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-lorries.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-lorries
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksLorries') as typeof import('../../../src/ui/salvage/art/manifest/worksLorries');
  await x.contact('works-lorries', M.WORKS_LORRIES);
}
