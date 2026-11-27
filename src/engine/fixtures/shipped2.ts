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
 * Default `raw`: the real games/scrap-yard/game.json. The parser is passed in (SalvageSchema.parse): this file is shared
 * (scripts/lib/modes.js does not list it under the salvage mode), so it must not import the mode's schema itself
 * (npm run check:bundle, shared-imports-mode).
 */
import gameJson from '../../../games/scrap-yard/game.json';
import type { SalvageConfig } from '../salvage/types';

type Raw = { salvage: Record<string, unknown> & { release?: { stage: number }; iap?: { products?: unknown[] } }; monetization: Record<string, unknown> & { iap?: Record<string, unknown> } };

/** The mode's own product list (salvage.iap.products), as build-yard.py writes it (titles from the names register). */
export function modeProducts(raw: unknown = gameJson): Record<string, unknown>[] {
  return structuredClone(((raw as Raw).salvage.iap?.products ?? []) as Record<string, unknown>[]);
}

/** The raw game as a build at release.stage 2 writes it: release.stage 2 and the shared list mirrored from the mode's block. */
export function shipped2Raw<T = typeof gameJson>(raw: unknown = gameJson): T {
  const g = structuredClone(raw) as Raw;
  g.salvage.release = { ...(g.salvage.release ?? {}), stage: 2 };
  g.monetization = { ...g.monetization, iap: { ...(g.monetization.iap ?? {}), products: modeProducts(g) } };
  return g as unknown as T;
}

/** The light stage-2 configuration of the shipped content (what the rules and the bots read). */
export function shipped2Config(parse: (salvage: unknown) => unknown, raw: unknown = gameJson): SalvageConfig {
  const g = shipped2Raw<Raw>(raw);
  return { mode: 'salvage', salvage: parse(g.salvage), monetization: g.monetization } as unknown as SalvageConfig;
}
