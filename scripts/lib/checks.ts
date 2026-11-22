/** Cross-game checks used by validate.ts: shared economy tables, near-identical listings, titles. */
import type { Business } from '../../src/config/schema';

/** "Idle Miner Tycoon", "Idle Pizza Shop Tycoon" ... (research/meta.md: registered as trademarks by another studio). */
export const IDLE_TYCOON_TITLE = /\bidle\b.{1,40}\btycoon\b/i;

/**
 * Words no store text may contain (policy P2): real trademarks a reviewer or a rights holder would
 * flag. Each entry is checked against every store field; add to the list, never special-case a game.
 */
export const BANNED_STORE_WORDS: { pattern: RegExp; why: string }[] = [
  { pattern: /\bmichelin\b/i, why: 'a registered trademark (the guide\'s stars)' },
  { pattern: /\bzagat\b/i, why: 'a registered trademark' },
  { pattern: /\b(?:domino'?s|pizza hut|papa john'?s|little caesars)\b/i, why: 'a real restaurant brand' },
  { pattern: /\b(?:supercell|kolibri|clash of|candy crush)\b/i, why: 'another studio\'s name or game' },
];

/** Problems with a game's store texts: banned words anywhere, the "Idle ... Tycoon" pattern in what the listing shows as a name. */
export function storeTextProblems(store: { title: string; subtitle?: string; shortDescription: string; description: string; keywords: string[]; promotionalText?: string; releaseNotes?: string }): string[] {
  const out: string[] = [];
  const fields: [string, string][] = [
    ['title', store.title],
    ['subtitle', store.subtitle ?? ''],
    ['shortDescription', store.shortDescription],
    ['description', store.description],
    ['keywords', store.keywords.join(', ')],
    ['promotionalText', store.promotionalText ?? ''],
    ['releaseNotes', store.releaseNotes ?? ''],
  ];
  // Apple's limits for the fields the schema does not bound (it bounds title, subtitle, short and long description).
  const keywordField = store.keywords.join(',');
  if (keywordField.length > 100) out.push(`store.keywords is ${keywordField.length} characters joined with commas (Apple allows 100)`);
  if ((store.promotionalText ?? '').length > 170) out.push(`store.promotionalText is ${store.promotionalText!.length} characters (Apple allows 170)`);
  if ((store.releaseNotes ?? '').length > 4000) out.push(`release notes are ${store.releaseNotes!.length} characters (both stores allow 4000; Google Play 500 per language)`);
  else if ((store.releaseNotes ?? '').length > 500) out.push(`release notes are ${store.releaseNotes!.length} characters (Google Play allows 500)`);
  for (const [name, text] of fields) {
    for (const b of BANNED_STORE_WORDS) {
      const m = text.match(b.pattern);
      if (m) out.push(`store.${name} contains "${m[0]}": ${b.why}`);
    }
  }
  for (const [name, text] of fields.slice(0, 3)) {
    const m = text.match(IDLE_TYCOON_TITLE);
    if (m) out.push(`store.${name} "${m[0]}" follows the "Idle <something> Tycoon" pattern, which another studio registers as trademarks (research/meta.md)`);
  }
  return out;
}

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
