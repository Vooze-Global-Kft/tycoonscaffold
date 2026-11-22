/**
 * The receipt row's words after a warp-out (Decision 59), pure so they are tested
 * (./receipt.test.ts): every ore shipped in short figures, the contract's first, and a met
 * contract's bonus in the board's own figure ("+₵35 x2" under the day shift).
 *
 * The row is one line of fixed height. When every ore does not fit it at a readable size, the
 * receipt turns into pages that the ticker shows one after the other ("58.4K IRON · 12.5K COPPER",
 * then "17 ICE · ₵123K"), so no ore is ever hidden behind a "+1".
 */
import type * as H from '../../../engine/haul';
import { moneyShort, unitsShort } from '../sheets/format';
import { HAUL_STRINGS } from '../strings';

const bayWord = (k: keyof typeof HAUL_STRINGS): string => HAUL_STRINGS[k];
const fillIn = (text: string, values: Record<string, string | number>): string => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
const SEP = ' · ';
const join = (parts: readonly string[]) => parts.filter(Boolean).join(SEP);

/** A receipt before it is fitted to the row: its heads (longest first), the ores, the payout. */
export interface ReceiptParts {
  met: boolean;
  /** Words before the ores, longest first; '' allows none. A met receipt always keeps one. */
  heads: string[];
  lots: string[];
  /** The payout, shown when it fits ('' for none). */
  tail: string;
}

/**
 * The manifest of a warp-out (Decision 59): every ore it shipped in short figures, the contract's
 * ores first (in the contract's order), then the rest by units. "5 COPPER · 15 IRON".
 */
export function manifestLots(cfg: H.HaulConfig, cargo: Record<string, number>, first: readonly string[] = []): string[] {
  const names = new Map(cfg.haul.ores.map((o) => [o.id, o.name.toUpperCase()]));
  const rank = (ore: string) => {
    const i = first.indexOf(ore);
    return i < 0 ? first.length : i;
  };
  return Object.entries(cargo)
    .filter(([, u]) => u >= 0.5)
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1])
    .map(([ore, u]) => `${unitsShort(u)} ${names.get(ore) ?? ore.toUpperCase()}`);
}

/** A plain warp-out: "WARPED · 5 COPPER · 15 IRON · ₵43". */
export function receiptParts(cfg: H.HaulConfig, cargo: Record<string, number>, payout: number, first: readonly string[] = []): ReceiptParts {
  return { met: false, heads: [bayWord('receiptWarped'), ''], lots: manifestLots(cfg, cargo, first), tail: moneyShort(cfg, payout) };
}

/**
 * A warp-out that met the contract: the bonus in the board's figure ("+₵35", and "+₵35 x2" when the
 * day shift doubles it: `base` is the bonus before the shift, so the figure is the board's, never a
 * second rounding), then every ore shipped.
 */
export function metParts(cfg: H.HaulConfig, cargo: Record<string, number>, base: number, shiftMult: number | null, first: readonly string[] = []): ReceiptParts {
  const bonus = base > 0 ? `+${moneyShort(cfg, base)}${shiftMult ? ` ${fillIn(bayWord('receiptTimes'), { n: shiftMult })}` : ''}` : '';
  const heads = [[bayWord('receiptMet'), bonus].filter(Boolean).join(' '), [bayWord('receiptMetShort'), bonus].filter(Boolean).join(' ')];
  if (bonus) heads.push(bonus);
  return { met: true, heads, lots: manifestLots(cfg, cargo, first), tail: '' };
}

/**
 * The pages the ticker shows, given whether a line `fits` the row at a readable size. One page when
 * the whole receipt fits: the longest form (head, ores, payout; then without the head; then without
 * the payout). Otherwise the ores in as few pages as fit, the shortest head on the first page and
 * the payout on the last when they fit. Never an empty page; a lot too wide on its own still gets one.
 */
export function receiptPages(p: ReceiptParts, fits: (line: string) => boolean): string[] {
  const all = p.lots.join(SEP);
  if (!p.lots.length) return [join([p.heads[0] ?? '', p.tail])];
  const heads = p.heads;
  const singles: string[] = [];
  for (const h of heads) singles.push(join([h, all, p.tail]));
  if (!p.met) singles.push(all);
  for (const line of singles) if (fits(line)) return [line];
  // Pages: the shortest head that is not empty leads a met receipt; a plain one leads with ores.
  const head = p.met ? (heads[heads.length - 1] ?? '') : '';
  const pages: string[][] = [head ? [head] : []];
  for (const lot of p.lots) {
    const page = pages[pages.length - 1];
    const lotsOnPage = page.filter((x) => x !== head).length;
    if (lotsOnPage === 0 || fits(join([...page, lot]))) page.push(lot);
    else pages.push([lot]);
  }
  const last = pages[pages.length - 1];
  if (p.tail && fits(join([...last, p.tail]))) last.push(p.tail);
  return pages.map(join);
}
