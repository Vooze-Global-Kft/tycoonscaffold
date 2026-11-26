/**
 * WHICH CONTENT A STATE READS (s2a-fix, 26 November; the critic's blocking finding 1). Owner: engine2 (the
 * loop's engineer), through Phase A and Phase B; a change is a line in requests.md to engine2.
 *
 * Stage 2's additions to the first yard's families stand apart in `worksLayer` (content2's decision: the
 * first yard's readers take grades, objects, partners, shop, tools, carriers and bays whole). They join the
 * families from the instant the works open (`counts.bathSet`, set by works.ts worksOpen with
 * `backFieldOpen`, 2.20, B14). This file is the ONE place that decides it:
 *
 * - `contentAt(c, s)`: the content the rules read for state s: the merged view once `counts.bathSet` is
 *   set, else the base content itself (the same object: the first yard reads exactly what it read).
 *   clock.ts `begin` (every transition's Ctx) and tick.ts `nextEvent`'s read-only view use it; the facade's
 *   reads (cardOf, frame, shopPrice, levelPrice) must use it too (a request to rules-money, its owner).
 * - `mergedContent(c)`: the merged view (schema.salvage.ts `withWorksLayer`), MEMOISED per base content
 *   object, so that every cache keyed by the content object (rate.ts's rated income and walks, group.ts,
 *   worksRungOf, rungReached) keeps hitting across transitions. Without a layer it is `c` itself.
 *   save.ts filters a loaded save against it ALWAYS (a save may already hold stage-2 grades, things,
 *   partners, shop keys or the tier 4 tool).
 *
 * In Phase A nothing sets `counts.bathSet` (worksOpen is a stub), so `contentAt` is always the base content
 * and the first yard advances bit for bit as before.
 */
import { withWorksLayer, type SalvageContent } from '../../config/schema.salvage';
import type { SalvageState } from './types';

const MERGED = new WeakMap<SalvageContent, SalvageContent>();

/** The base content with the works layer joined (memoised per content object; `c` itself when there is no layer). */
export function mergedContent(c: SalvageContent): SalvageContent {
  if (!c.worksLayer) return c;
  let m = MERGED.get(c);
  if (!m) {
    m = withWorksLayer(c);
    MERGED.set(c, m);
    // The merged view is its own fixed point: asking again with it gives it back.
    MERGED.set(m, m);
  }
  return m;
}

/** Has the works layer opened in this state (2.20: derived from the state, set once at `backFieldOpen`)? */
export function worksOpened(s: Pick<SalvageState, 'counts'>): boolean {
  return s.counts?.bathSet !== undefined;
}

/** The content the rules read for state s (see the head of this file). */
export function contentAt(c: SalvageContent, s: Pick<SalvageState, 'counts'>): SalvageContent {
  return worksOpened(s) ? mergedContent(c) : c;
}

/** The highest tool tier a content offers (at least 1): save.ts clamps a loaded tier to the merged content's. */
export function topToolTier(c: SalvageContent): number {
  let t = 1;
  for (const k in c.tools) t = Math.max(t, Math.floor(c.tools[k].tier));
  return t;
}
