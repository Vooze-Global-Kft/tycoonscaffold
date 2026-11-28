/**
 * Sheet "works-truck3" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-TRUCK3's): the three-axle hook-lift and the bridge partners' skip loads, the manifest
 * part src/ui/salvage/art/manifest/worksTruck3.ts drawn by src/ui/salvage/art/truck3.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-truck3.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-truck3
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksTruck3') as typeof import('../../../src/ui/salvage/art/manifest/worksTruck3');
  await x.contact('works-truck3', M.WORKS_TRUCK3);
}
