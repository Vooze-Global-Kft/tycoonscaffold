/**
 * Sheet "works-sale" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-SALE's): the Yard sale (canopy, rack, rails, reader, wicket, pallets, heaps), the manifest
 * part src/ui/salvage/art/manifest/worksSale.ts drawn by src/ui/salvage/art/yardsale.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-sale.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-sale
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksSale') as typeof import('../../../src/ui/salvage/art/manifest/worksSale');
  await x.contact('works-sale', M.WORKS_SALE);
}
