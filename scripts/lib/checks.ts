/** Cross-game checks used by validate.ts: shared economy tables, near-identical listings, titles. */
import type { Business } from '../../src/config/schema';

/** "Idle Miner Tycoon", "Idle Pizza Shop Tycoon" ... (research/meta.md: registered as trademarks by another studio). */
export const IDLE_TYCOON_TITLE = /\bidle\b.{1,40}\btycoon\b/i;

/** Relative spread of a list of ratios: max / min - 1. */
const spread = (xs: number[]) => Math.max(...xs) / Math.min(...xs) - 1;

/**
 * Whether two business tables are the same numbers: identical, or one a constant multiple of the
 * other (every cost, every revenue, every hire price and every cycle scaled by one factor per
 * column, the same cost growth). Compares the common prefix when the lengths differ, so a table
 * with rows cut off is still caught. Returns a phrase for the error message, or null.
 *
 * TOLERANCE is well below the per-game variation that new-game and generate apply (3 % or more
 * per row), so a varied copy passes and a straight copy fails.
 */
export function economyTableClash(a: Business[], b: Business[], TOLERANCE = 0.005): string | null {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  const rows = (t: Business[]) => t.slice(0, n);
  const [x, y] = [rows(a), rows(b)];
  const ratio = (k: 'baseCost' | 'baseRevenue' | 'managerCost' | 'cycleSeconds') => x.map((r, i) => y[i][k] / r[k]);
  const sameGrowth = x.every((r, i) => Math.abs(r.costGrowth - y[i].costGrowth) < 0.0015);
  if (!sameGrowth) return null;
  const cols = (['baseCost', 'baseRevenue', 'managerCost', 'cycleSeconds'] as const).map(ratio);
  if (cols.some((c) => spread(c) > TOLERANCE)) return null;
  const identical = cols.every((c) => c.every((v) => Math.abs(v - 1) <= TOLERANCE));
  const prefix = a.length === b.length ? '' : ` (first ${n} rows)`;
  return identical ? `is identical${prefix} to` : `is a constant multiple${prefix} of`;
}

/** Word 3-gram Jaccard similarity of two texts, 0 (nothing shared) to 1 (same text). */
export function textSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const w = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    const out = new Set<string>();
    for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' '));
    return out;
  };
  const [x, y] = [grams(a), grams(b)];
  if (x.size === 0 || y.size === 0) return 0;
  let shared = 0;
  for (const g of x) if (y.has(g)) shared++;
  return shared / (x.size + y.size - shared);
}
