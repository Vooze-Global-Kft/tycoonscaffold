/**
 * The receipt row's words after a warp-out (Decision 59), pure so they are tested
 * (./receipt.test.ts): every ore shipped in short figures, the contract's first, and a met
 * contract's bonus in the board's own figure ("+₵35 x2" under the day shift).
 */
import type * as H from '../../../engine/haul';
import { moneyShort, unitsShort } from '../sheets/format';
import { HAUL_STRINGS } from '../strings';

const bayWord = (k: keyof typeof HAUL_STRINGS): string => HAUL_STRINGS[k];
const fillIn = (text: string, values: Record<string, string | number>): string => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
const unitShort = unitsShort;

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
    .map(([ore, u]) => `${unitShort(u)} ${names.get(ore) ?? ore.toUpperCase()}`);
}

/**
 * The receipt line for a warp-out, longest first: the manifest (every ore, the contract's first)
 * and the payout. The ticker shows the longest that fits its row at a readable size; the words go
 * before any ore does, and only a row too narrow for every ore ends on "+N".
 */
export function receiptTexts(cfg: H.HaulConfig, cargo: Record<string, number>, payout: number, first: readonly string[] = []): string[] {
  const lots = manifestLots(cfg, cargo, first);
  const money = moneyShort(cfg, payout);
  const warped = bayWord('receiptWarped');
  const all = lots.join(' · ');
  if (!lots.length) return [[warped, money].join(' · ')];
  const out = [[warped, `${bayWord('receiptManifest')} ${all}`, money].join(' · '), [warped, all, money].join(' · '), [all, money].join(' · '), all];
  if (lots.length > 2) out.push(`${lots.slice(0, 2).join(' · ')} +${lots.length - 2}`);
  if (lots.length > 1) out.push(`${lots[0]} +${lots.length - 1}`);
  return out;
}

/**
 * The receipt row of a warp-out that met the contract, longest first (Decision 59): the bonus in
 * the board's figure ("+₵35", and "+₵35 x2" when the day shift doubles it: `base` is the bonus
 * before the shift, so the figure is the board's, never a second rounding), then every ore shipped.
 */
export function metTexts(cfg: H.HaulConfig, cargo: Record<string, number>, base: number, shiftMult: number | null, first: readonly string[] = []): string[] {
  const bonus = base > 0 ? `+${moneyShort(cfg, base)}${shiftMult ? ` ${fillIn(bayWord('receiptTimes'), { n: shiftMult })}` : ''}` : '';
  const lots = manifestLots(cfg, cargo, first);
  const all = lots.join(' · ');
  const met = [bayWord('receiptMet'), bonus].filter(Boolean).join(' ');
  const short = [bayWord('receiptMetShort'), bonus].filter(Boolean).join(' ');
  const out: string[] = [];
  if (all) out.push(`${met} · ${all}`, `${short} · ${all}`, ...(bonus ? [`${bonus} · ${all}`] : []));
  if (lots.length > 1) out.push(`${short} · ${lots[0]} +${lots.length - 1}`);
  out.push(met, short);
  return out;
}
