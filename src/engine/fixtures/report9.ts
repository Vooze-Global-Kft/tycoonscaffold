/**
 * THE STAGE AS REPORT9 MEASURED IT (s2e-content, 27 November; ruling 27.7). Owner: the content engineer.
 *
 * `salvage-report9.json` beside this file is the `salvage` and `monetization` blocks of games/scrap-yard/game.json at
 * commit 8666853, frozen BEFORE the stage's economy was built again (yard-stage2-economy.md): every plate, vehicle and
 * tool sold then (the crane, baler, shear, granulator, forklift, pallet truck, eddy current, sorter, breaker, smelter
 * with their prices), plate levels to 10, tau 9 / 22 / 45 h, the bank's old reach, the old goal list, all four packs.
 * The tests of what this build makes dark or reprices read it here, so the rules of those things stay tested while the
 * shipped content no longer sells them. It is never re-recorded and never edited (a test of a NEW rule reads the
 * shipped content through ./shipped2.ts or the frozen test content of ./salvage.ts).
 *
 *   report9Raw()          the raw game (salvage and monetization blocks) as a stage-2 build wrote it on 27 November:
 *                         release.stage 2 and the shared product list mirrored from the mode's (./shipped2.ts shipped2Raw)
 *   report9Config(parse)  { mode, salvage (parsed with `parse`, SalvageSchema.parse), monetization }, as shipped2Config
 *
 * The parser is passed in, as in ./shipped2.ts.
 */
import frozen from './salvage-report9.json';
import { shipped2Config, shipped2Raw } from './shipped2';
import type { SalvageConfig } from '../salvage/types';

/** The frozen blocks as written (release.stage 1, empty shared list), a deep copy. */
export function report9Frozen(): { salvage: Record<string, unknown>; monetization: Record<string, unknown> } {
  const { salvage, monetization } = frozen as unknown as { salvage: Record<string, unknown>; monetization: Record<string, unknown> };
  return structuredClone({ salvage, monetization });
}

/** The frozen game as a stage-2 build wrote it (release.stage 2, the shared list mirrored). */
export function report9Raw<T = ReturnType<typeof report9Frozen>>(): T {
  return shipped2Raw<T>(report9Frozen());
}

/** The light stage-2 configuration of the frozen content (what the rules and the bots read). */
export function report9Config(parse: (salvage: unknown) => unknown): SalvageConfig {
  return shipped2Config(parse, report9Frozen());
}
