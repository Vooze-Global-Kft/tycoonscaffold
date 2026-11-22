/**
 * "At most one every N ms" per key. Many game events fire several times a
 * frame (coins, customers, typewriter text); the limiter lets the first one
 * through and drops the rest, so sounds never stack into noise.
 *
 * Pure: the caller supplies the time.
 */
export class RateLimiter {
  private last = new Map<string, number>();

  /** True, and the hit is recorded, unless `key` already fired less than `minIntervalMs` ago. */
  allow(key: string, minIntervalMs: number, now: number): boolean {
    const prev = this.last.get(key);
    // `now < prev` means the clock went backwards: let it through rather than lock the key out.
    if (prev !== undefined && now >= prev && now - prev < minIntervalMs) return false;
    this.last.set(key, now);
    return true;
  }

  reset(): void {
    this.last.clear();
  }
}
