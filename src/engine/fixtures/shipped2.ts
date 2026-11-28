/**
 * THE ONE WAY a test or a bot gets the SHIPPED game at stage 2 (s2-fix-content, M1; rulings 19.9, 21.8 and 22 M1).
 *
 * games/scrap-yard/game.json keeps `salvage.release.stage` 1 (the first yard on the owner's phone) and, at stage 1,
 * an EMPTY shared product list (`monetization.iap.products`): the sixteen products are defined in the mode's own
 * content (`salvage.iap.products`) and scripts/content/build-yard.py mirrors them into the shared list only at
 * release.stage 2 or more. A test or a bot that plays stage 2 on the shipped content therefore reads the game through
 * these two functions: the content with release.stage 2 AND the shared list filled from the mode's block, entry for
 * entry, exactly as the build writes it at stage 2. Nothing else of the game changes.
 *
 *   shipped2Raw(raw?)     the raw game.json (a deep copy) as a stage-2 build would write it
 *   shipped2Config(parse, raw?)  { mode, salvage (parsed with `parse`, SalvageSchema.parse, at stage 2), monetization }: the light
 *                         configuration the rules and the bots read (scripts/content/yard-bot.ts --stage 2)
 *
 * Default `raw`: the real games/scrap-yard/game.json. The parser is passed in (SalvageSchema.parse), as before.
 * C-MODE (PLAN2 2.4, 28 Nov): the two lines themselves live in the mode's pure src/modes/salvage/stage2Raw.ts, which the
 * works' development switch (src/modes/salvage/returning.ts) applies to the running game; this file adds the default
 * and stays the one helper of the tests and bots. It is now listed under the salvage mode (scripts/lib/modes.js), which
 * lets it import the mode's file (check:bundle layering); nothing outside the salvage mode imports it.
 */
import gameJson from '../../../games/scrap-yard/game.json';
import { modeProductsOf, stage2RawOf } from '../../modes/salvage/stage2Raw';
import type { SalvageConfig } from '../salvage/types';

type Raw = { salvage: Record<string, unknown> & { release?: { stage: number }; iap?: { products?: unknown[] } }; monetization: Record<string, unknown> & { iap?: Record<string, unknown> } };

/** The mode's own product list (salvage.iap.products), as build-yard.py writes it (titles from the names register). */
export function modeProducts(raw: unknown = gameJson): Record<string, unknown>[] {
  return modeProductsOf(raw);
}

/** The raw game as a build at release.stage 2 writes it: release.stage 2 and the shared list mirrored from the mode's block. */
export function shipped2Raw<T = typeof gameJson>(raw: unknown = gameJson): T {
  return stage2RawOf<T>(raw);
}

/** The light stage-2 configuration of the shipped content (what the rules and the bots read). */
export function shipped2Config(parse: (salvage: unknown) => unknown, raw: unknown = gameJson): SalvageConfig {
  const g = shipped2Raw<Raw>(raw);
  return { mode: 'salvage', salvage: parse(g.salvage), monetization: g.monetization } as unknown as SalvageConfig;
}
