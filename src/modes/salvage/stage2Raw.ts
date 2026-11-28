/**
 * The raw game as a build at release.stage 2 writes it (C-MODE, PLAN2 2.4): the ONE definition, pure, with no import,
 * so that both the mode (./returning.ts: the works' development switch) and the tests' and bots' helper
 * (src/engine/fixtures/shipped2.ts, which adds the real game.json as the default) apply exactly the same two lines:
 *   - `salvage.release.stage` 2;
 *   - the shared product list (`monetization.iap.products`) mirrored from the mode's own block (`salvage.iap.products`),
 *     entry for entry, as scripts/content/build-yard.py writes it at stage 2 (so the store's product fetch and the
 *     simulated purchase find the sixteen products).
 * Nothing else of the game changes. The input is never changed (a deep copy is made). Owner: C-MODE.
 */

type Raw = { salvage: Record<string, unknown> & { release?: { stage: number }; iap?: { products?: unknown[] } }; monetization: Record<string, unknown> & { iap?: Record<string, unknown> } };

/** A deep copy of plain JSON data (structuredClone is not on every phone engine; the config is JSON). */
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** The mode's own product list (salvage.iap.products) of a raw game, a copy. */
export function modeProductsOf(raw: unknown): Record<string, unknown>[] {
  return copy(((raw as Raw).salvage?.iap?.products ?? []) as Record<string, unknown>[]);
}

/** The raw game (a copy) with release.stage 2 and the shared product list mirrored from the mode's block. */
export function stage2RawOf<T>(raw: unknown): T {
  const g = copy(raw) as Raw;
  g.salvage.release = { ...(g.salvage.release ?? {}), stage: 2 };
  g.monetization = { ...g.monetization, iap: { ...(g.monetization.iap ?? {}), products: modeProductsOf(g) } };
  return g as unknown as T;
}
