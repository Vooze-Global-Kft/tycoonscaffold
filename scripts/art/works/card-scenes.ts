/**
 * Sheet "card-scenes" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-SCENES's): the baked vignettes of the works' cards (a hall pouring, ingots stacked, the pad with its pieces, a car on the apron, a visitor paying, the hook-lift with a partner's skip, the bank's ring on a plate; two sizes, card row 44 pt and card head 120 pt). Card art has no
 * manifest part (it is drawn on cards and cached as images, PLAN2 2.7); its drawings will be src/ui/salvage/art/cardScenes.draw.ts,
 * which ART-SCENES creates. Until then this sheet says so and writes nothing.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> card-scenes
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  console.log(`card-scenes: nothing drawn yet (ART-SCENES draws src/ui/salvage/art/cardScenes.draw.ts; out ${x.out})`);
}
