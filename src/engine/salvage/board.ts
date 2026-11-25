/**
 * The posted board and the market clock (yard-stage1.md 2.8, S14). PURE functions of the market day D:
 * every phone shows the same board, nothing is saved. Families: fe, nf, pm (the converter's daily
 * step only, the lead's decision).
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { rngMix4, hashString } from '../rng';
import type { GradeId, SalvageGame } from './types';

const DAY_MS = 86_400_000;
const FAMILY: Record<string, number> = { fe: 1, nf: 2, pm: 3 };

/** hash01(worldSeed, family, n): uniform in [0, 1), the same on every phone. */
export function hash01(seed: number, family: number, n: number): number {
  return (rngMix4(seed | 0, family | 0, n | 0, 0x5a17) >>> 0) / 4294967296;
}

/** The market time t_m of a state at device time `now`, epoch ms: never behind the saved high mark. */
export function marketTime(g: SalvageGame, now: number): number {
  return Math.max(now, g.salvage.clock.highMs);
}

/** Market day D of a market time (ms). */
export function marketDay(c: SalvageContent, ms: number): number {
  return Math.floor((ms - c.board.epochMs) / DAY_MS);
}

/** Seconds from a market time to the next day's prices. */
export function secondsToNextDay(c: SalvageContent, ms: number): number {
  const d = marketDay(c, ms);
  return (c.board.epochMs + (d + 1) * DAY_MS - ms) / 1000;
}

/** x_f(D) = Σ_{k=0..29} 0.5^k a w_f(D−1−k), w = 2 hash01 − 1. */
export function boardX(c: SalvageContent, family: string, day: number): number {
  const f = FAMILY[family] ?? hashString(family);
  let x = 0;
  for (let k = 0; k < 30; k++) x += 0.5 ** k * c.board.a * (2 * hash01(c.worldSeed, f, day - 1 - k) - 1);
  return x;
}

/** p_g(D) = round(p̄ (1 + x_f(D))) in hundredths, § a kilogram. */
export function priceOf(c: SalvageContent, grade: GradeId, day: number): number {
  const gd = c.grades[grade];
  if (!gd) return 0;
  return Math.round(gd.pbar * (1 + boardX(c, gd.family, day)) * 100) / 100;
}

/** The day word (2.8): low below −wordBand, high above +wordBand, else usual. */
export function dayWord(c: SalvageContent, grade: GradeId, day: number): 'low' | 'usual' | 'high' {
  const gd = c.grades[grade];
  if (!gd) return 'usual';
  const x = boardX(c, gd.family, day);
  return x < -c.board.wordBand ? 'low' : x > c.board.wordBand ? 'high' : 'usual';
}

// ============================================================================ the facade's entries (the seam, 16:20)
// Moved unchanged from src/engine/salvage.ts; the facade re-exports them under their public names.

import type { BoardRow, CardButton, PriceBoard, SalvageConfig, SellShown } from './types';
import { floorGrams, lineAmount } from './money';
import { bayOrder } from './positions';

/** Facade `marketDay(cfg, ms)`. */
export function marketDayCfg(cfg: SalvageConfig, ms: number): number {
  return marketDay(cfg.salvage, ms);
}

/** Facade `priceOf(cfg, grade, day)`: the posted price of a grade on market day D, § a kilogram (2.8). */
export function priceOfCfg(cfg: SalvageConfig, grade: GradeId, day: number): number {
  return priceOf(cfg.salvage, grade, day);
}

/** Facade `dayWord(cfg, grade, day)`. */
export function dayWordCfg(cfg: SalvageConfig, grade: GradeId, day: number): 'low' | 'usual' | 'high' {
  return dayWord(cfg.salvage, grade, day);
}

/**
 * The step a Sell carries (2.8 "shown equals applied"): today's market day and price, and the grams the
 * card shows: the bay's grams not reserved (crucible, deal) and not already set aside, resolved DOWN to
 * 0.1 kg. The rules' `sell` compares what it receives with this, else `priceUpdated`.
 */
export function sellShown(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, now: number): SellShown {
  const day = marketDay(cfg.salvage, marketTime(g, now));
  const b = g.salvage.bays[grade];
  const aside = b ? b.aside.reduce((a, x) => a + x.g, 0) : 0;
  const free = b ? b.g - b.forCrucible_g - b.forDeal_g - aside : 0;
  return { day, price: priceOf(cfg.salvage, grade, day), grams: floorGrams(free) };
}

/** The bays' grades in the board's order: content's fixed bay order, then any other grade weighed in. */
function boardGrades(c: SalvageContent, g: SalvageGame): GradeId[] {
  const order = bayOrder(c).filter((gr) => g.salvage.bays[gr]);
  return [...order, ...Object.keys(g.salvage.bays).filter((gr) => !order.includes(gr))];
}

/**
 * The price board (4.4): "Market day {date} (UTC) · next prices in {t}"; per grade weighed in a row
 * with today's price, its day word, five days of prices (oldest first, today last) with the usual price
 * for the tick, the bay's stock, Hold, and on a held bay Sell with its total (the SellShown the rules
 * apply). The first opening's hint points at a low day while `seen.cards` lacks 'board'.
 */
export function priceBoard(cfg: SalvageConfig, g: SalvageGame, now: number): PriceBoard {
  const c = cfg.salvage;
  const ms = marketTime(g, now);
  const day = marketDay(c, ms);
  const rows: BoardRow[] = boardGrades(c, g).map((grade) => {
    const b = g.salvage.bays[grade];
    const aside_g = b.aside.reduce((a, x) => a + x.g, 0);
    const shown = sellShown(cfg, g, grade, now);
    const sell: CardButton | null = b.held && shown.grams > 0 ? { label: { key: 'board.sellTotal', args: { x: { money: lineAmount(shown.grams, shown.price) } } }, action: { act: 'sell', grade, shown }, refusal: null } : null;
    return {
      grade,
      icon: c.grades[grade]?.picto ?? c.grades[grade]?.sprite ?? `piece.${grade}`,
      price: priceOf(c, grade, day),
      days: [4, 3, 2, 1, 0].map((k) => priceOf(c, grade, day - k)),
      pbar: c.grades[grade]?.pbar ?? 0,
      word: dayWord(c, grade, day),
      bay_g: b.g,
      held: b.held,
      reserved_g: b.forCrucible_g + b.forDeal_g,
      aside_g,
      hold: { label: { key: 'card.hold' }, action: { act: 'setHold', grade, on: !b.held }, refusal: null },
      sell,
      heldLine: b.held ? { key: 'board.heldUntil' } : null,
    };
  });
  const low = rows.find((r) => r.word === 'low');
  const hint = g.salvage.seen.cards.includes('board') || !low ? null : { key: 'board.firstHint' as const, args: { grade: { grade: low.grade } } };
  return { day, nextInS: secondsToNextDay(c, ms), rows, hint };
}
