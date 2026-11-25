/**
 * Phones: the hud's preview switches hold nothing (the web preview's twin, ./dev.web.ts, fires sample
 * tickets with `?hudDemo=1`).
 */
import type { SalvageConfig, SalvageGame } from '../../../engine/salvage';

export function hudDemo(cfg: SalvageConfig, g: SalvageGame): (() => void) | null {
  void cfg;
  void g;
  return null;
}
