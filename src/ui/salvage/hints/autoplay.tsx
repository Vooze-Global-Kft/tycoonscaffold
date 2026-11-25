/**
 * Phone twin of ./autoplay.web.tsx (the web preview's scripted thumb and beat demos): holds nothing, so no
 * phone bundle carries the preview's tools (AGENTS.md: development tools live in .web files).
 */
import type { SalvageConfig } from '../../../engine/salvage';
import type { StickZone } from '../world/stick';
import type { HintView } from './rules';

export interface HintDemo {
  /** Forced parts of the hints' view (a beat shown from a preset), or null. */
  force(now: number): Partial<HintView> | null;
}

export const hintDemo: HintDemo | null = null;

export function Autoplay(_props: { cfg: SalvageConfig; zone: StickZone }): null {
  return null;
}
