/**
 * Sheet "card-marks" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-CARDMARKS's): the marks of the works' cards. Card art has no
 * manifest part (it is drawn on cards and cached as images, PLAN2 2.7); its drawings will be src/ui/salvage/art/cardMarks.draw.ts,
 * which ART-CARDMARKS creates. Until then this sheet says so and writes nothing.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> card-marks
 */
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  console.log(`card-marks: nothing drawn yet (ART-CARDMARKS draws src/ui/salvage/art/cardMarks.draw.ts; out ${x.out})`);
}
