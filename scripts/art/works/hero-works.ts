/**
 * Sheet "hero-works" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-HERO's): the second hero frame (content map.works.heroWorks: the rotary hall pouring with the boss in shield and apron, its filter, the works road, a charge box, ingots cooling). Card art has no
 * manifest part (it is drawn on cards and cached as images, PLAN2 2.7); its drawings will be src/ui/salvage/art/proofWorks.draw.ts,
 * which ART-HERO creates. Until then this sheet says so and writes nothing.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> hero-works
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  console.log(`hero-works: nothing drawn yet (ART-HERO draws src/ui/salvage/art/proofWorks.draw.ts; out ${x.out})`);
}
