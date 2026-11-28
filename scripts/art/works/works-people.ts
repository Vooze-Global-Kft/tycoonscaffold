/**
 * Sheet "works-people" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-PEOPLE's): visitors, the boss's plasma and analyse poses, the dealer's van, the plasma rack, the manifest
 * part src/ui/salvage/art/manifest/worksPeople.ts drawn by src/ui/salvage/art/visitors.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-people.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-people
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const M = require('../../../src/ui/salvage/art/manifest/worksPeople') as typeof import('../../../src/ui/salvage/art/manifest/worksPeople');
  await x.contact('works-people', M.WORKS_PEOPLE);
}
