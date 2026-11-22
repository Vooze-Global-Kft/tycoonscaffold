/**
 * Seeded random numbers (mulberry32). The seed lives in the game state, so
 * every roll is reproducible in tests and a chest cannot be re-rolled by
 * reloading a save.
 */
export interface Roll<T> {
  value: T;
  /** Pass this seed to the next roll. */
  seed: number;
}

/** A float in [0, 1). */
export function rngFloat(seed: number): Roll<number> {
  let a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: a >>> 0 };
}

/** An integer in [min, max], both inclusive. */
export function rngInt(seed: number, min: number, max: number): Roll<number> {
  const r = rngFloat(seed);
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return { value: lo + Math.floor(r.value * (hi - lo + 1)), seed: r.seed };
}

/** Picks an index with probability proportional to its weight. Zero-weight entries are never picked. */
export function rngWeighted(seed: number, weights: number[]): Roll<number> {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  const r = rngFloat(seed);
  if (!(total > 0)) return { value: 0, seed: r.seed };
  let x = r.value * total;
  let last = 0;
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i]);
    if (w <= 0) continue;
    last = i;
    if (x < w) return { value: i, seed: r.seed };
    x -= w;
  }
  return { value: last, seed: r.seed };
}

/** Picks one element. */
export function rngPick<T>(seed: number, items: readonly T[]): Roll<T> {
  const r = rngInt(seed, 0, items.length - 1);
  return { value: items[r.value], seed: r.seed };
}

/** A seed from a timestamp (for a new game). */
export function seedFrom(n: number): number {
  return (Math.floor(n) ^ 0x9e3779b9) >>> 0;
}
