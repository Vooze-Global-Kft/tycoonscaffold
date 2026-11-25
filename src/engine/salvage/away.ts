/** Time away (yard-stage1.md 2.16). Owner: rules-sim. */
import type { SalvageConfig, SalvageGame } from './types';

/** The away cap, seconds: awayCap_h[0], or [1] with the Night watch. */
export function awayCapS(cfg: SalvageConfig, g: SalvageGame): number {
  return (g.salvage.owned.includes('night') ? cfg.salvage.awayCap_h[1] : cfg.salvage.awayCap_h[0]) * 3600;
}

/**
 * Time away (2.16): the same `advance` without the boss, capped at awayCap_h (Night watch: the second),
 * measured from max(lastSavedAt, clockHigh). MONEY IS PAID ONCE: `earnings` is ALWAYS 0 and `report`
 * always undefined; the cash is already in the returned game. STUB(hour 0): measures, earns nothing.
 */
export function salvageOffline(cfg: SalvageConfig, g: SalvageGame, now: number): { seconds: number; earnings: 0; game: SalvageGame; report: undefined } {
  // STUB(hour 0)
  const raw = (now - Math.max(g.lastSavedAt, g.stats.clockHigh ?? 0, g.salvage.clock.highMs)) / 1000;
  const seconds = Number.isFinite(raw) && raw > 0 ? Math.min(raw, awayCapS(cfg, g)) : 0;
  return { seconds, earnings: 0, game: g, report: undefined };
}
