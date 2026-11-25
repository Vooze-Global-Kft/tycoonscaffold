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

import type { PriceBoard, SalvageConfig } from './types';

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

/** The price board (4.4): today's rows, five days, day words, Hold and Sell; the first opening's hint while `seen.cards` lacks 'board'. STUB(hour 0): the rows of the bays with today's prices, no Sell. */
export function priceBoard(cfg: SalvageConfig, g: SalvageGame, now: number): PriceBoard {
  // STUB(hour 0)
  const ms = marketTime(g, now);
  const day = marketDay(cfg.salvage, ms);
  const rows = Object.entries(g.salvage.bays).map(([grade, b]) => ({
    grade,
    icon: cfg.salvage.grades[grade]?.sprite ?? 'piece.unknown',
    price: priceOf(cfg.salvage, grade, day),
    days: [4, 3, 2, 1, 0].map((k) => priceOf(cfg.salvage, grade, day - k)),
    pbar: cfg.salvage.grades[grade]?.pbar ?? 0,
    word: dayWord(cfg.salvage, grade, day),
    bay_g: b.g,
    held: b.held,
    reserved_g: b.forCrucible_g + b.forDeal_g,
    aside_g: b.aside.reduce((a, x) => a + x.g, 0),
    hold: { label: { key: 'card.hold' as const }, action: { act: 'setHold' as const, grade, on: !b.held }, refusal: null },
    sell: null,
  }));
  const hint = g.salvage.seen.cards.includes('board') ? null : { key: 'board.firstHint' as const, args: {} };
  return { day, nextInS: secondsToNextDay(cfg.salvage, ms), rows, hint };
}
