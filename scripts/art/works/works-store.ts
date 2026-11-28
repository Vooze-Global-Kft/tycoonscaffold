/**
 * Sheet "works-store" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-STORE's): the works bunkers, heaps, stillage layers, big bags and roofs, the manifest
 * part src/ui/salvage/art/manifest/worksStore.ts drawn by src/ui/salvage/art/worksStore.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-store.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-store
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksStore') as typeof import('../../../src/ui/salvage/art/manifest/worksStore');
  await x.contact('works-store', M.WORKS_STORE);
}
