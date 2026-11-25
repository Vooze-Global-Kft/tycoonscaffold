/**
 * THE RATE ENGINE (yard-stage1.md 2.12, E17): stocks, rates constant between events, the derived event
 * queue, rated capacity. Owner: rules-sim.
 */
import type { SalvageConfig, SalvageGame } from './types';

/** Rated capacity R, t/h: the rate engine's throughput of the assets with full feed and no boss (2.11). STUB(hour 0): 0. */
export function ratedCapacity(cfg: SalvageConfig, g: SalvageGame): number {
  void cfg;
  void g;
  // STUB(hour 0)
  return 0;
}
