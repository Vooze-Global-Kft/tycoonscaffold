/**
 * Real-money arithmetic for the shop, computed from the prices the store really shows
 * (`iap.price(product)`), never from numbers typed into the config:
 * - the real-money equivalent shown beside every gem price (EU consumer authorities ask for it,
 *   at the undiscounted rate, i.e. the smallest gem pack: docs/design/research/policy.md §2);
 * - the "+x %" on bigger gem packs, measured against that same smallest pack.
 * Store price strings are localised ("$1.99", "1,99 €", "¥200", "CHF 2.00"), so they are parsed
 * defensively; when a string cannot be read the hint is simply left out rather than guessed.
 */
import type { GameConfig, IapProduct } from '../../../config/schema';
import { iap } from '../../../services/iap';

interface ParsedPrice {
  value: number;
  /** The text before and after the number, e.g. "$" and "" or "" and " €". */
  prefix: string;
  suffix: string;
  decimals: number;
  decimalSep: '.' | ',';
}

/** Reads a localised price string. Null when it holds no recognisable number. */
export function parsePrice(text: string): ParsedPrice | null {
  const m = /\d[\d.,\s  ']*\d|\d/.exec(text);
  if (!m) return null;
  const raw = m[0].replace(/[\s  ']/g, '');
  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  let decimalSep: '.' | ',' = '.';
  let intPart = raw;
  let frac = '';
  const sepAt = Math.max(lastDot, lastComma);
  if (sepAt >= 0) {
    const tail = raw.slice(sepAt + 1);
    const both = lastDot >= 0 && lastComma >= 0;
    // "1,000" or "1.000" alone is a thousands separator; two digits after it is a decimal part.
    if (both || tail.length !== 3) {
      decimalSep = raw[sepAt] as '.' | ',';
      intPart = raw.slice(0, sepAt);
      frac = tail;
    }
  }
  const value = Number(intPart.replace(/[.,]/g, '') + (frac ? '.' + frac : ''));
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, prefix: text.slice(0, m.index), suffix: text.slice(m.index + m[0].length), decimals: frac.length, decimalSep };
}

/** Writes an amount in the same style as a parsed store price. */
function formatLike(p: ParsedPrice, amount: number): string {
  const decimals = p.decimals > 0 ? p.decimals : amount < 10 ? 2 : 0;
  let num = amount.toFixed(decimals);
  if (p.decimalSep === ',') num = num.replace('.', ',');
  return `${p.prefix}${num}${p.suffix}`;
}

/** The smallest gem pack: the undiscounted rate every gem price is compared with. */
export function baseGemPack(cfg: GameConfig): IapProduct | null {
  const packs = cfg.monetization.iap.products.filter((p) => p.kind === 'gems');
  if (packs.length === 0) return null;
  return packs.reduce((a, b) => (b.value < a.value ? b : a));
}

/** Price of one gem in the smallest pack, with the format to print amounts in. */
function gemRate(cfg: GameConfig): { perGem: number; style: ParsedPrice } | null {
  const pack = baseGemPack(cfg);
  if (!pack) return null;
  const parsed = parsePrice(iap.price(pack));
  if (!parsed) return null;
  return { perGem: parsed.value / pack.value, style: parsed };
}

/** "≈ $0.50": what `gems` cost in real money at the smallest pack's rate. Null when unknown. */
export function gemsInMoney(cfg: GameConfig, gems: number): string | null {
  if (gems <= 0) return null;
  const rate = gemRate(cfg);
  if (!rate) return null;
  return `≈ ${formatLike(rate.style, gems * rate.perGem)}`;
}

/**
 * How many more gems per unit of money a pack gives than the smallest pack, in whole percent.
 * 0 for the smallest pack itself, for packs that are not better, and when a price cannot be read.
 * Only meaningful when both prices are in the same currency, which store prices always are.
 */
export function gemPackBonus(cfg: GameConfig, pack: IapProduct): number {
  const base = baseGemPack(cfg);
  if (!base || base.id === pack.id) return 0;
  const a = parsePrice(iap.price(base));
  const b = parsePrice(iap.price(pack));
  if (!a || !b) return 0;
  const ratio = pack.value / b.value / (base.value / a.value);
  const pct = Math.floor((ratio - 1) * 100);
  return pct >= 1 ? pct : 0;
}
