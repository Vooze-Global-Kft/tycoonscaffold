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
