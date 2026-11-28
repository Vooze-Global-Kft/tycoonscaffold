/**
 * Sheet "card-paper" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-CARDPAPER's): the papers of the works' cards (the away docket's works lines among them). Card art has no
 * manifest part (it is drawn on cards and cached as images, PLAN2 2.7); its drawings will be src/ui/salvage/art/cardPaper.draw.ts,
 * which ART-CARDPAPER creates. Until then this sheet says so and writes nothing.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> card-paper
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  console.log(`card-paper: nothing drawn yet (ART-CARDPAPER draws src/ui/salvage/art/cardPaper.draw.ts; out ${x.out})`);
}
