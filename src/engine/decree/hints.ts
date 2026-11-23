/**
 * The pen's hints (3.1's timed script, 4.5 "Hints never cover a number"): which target keys of
 * src/ui/hints/targets.ts the tutorial pen points at now. Package P1b (docs/design/office-build-plan.md);
 * the pen itself is P8's (`parts.HintPointer`, src/ui/decree/hints.ts).
 *
 * 0:02 paper 1 teaches refusal (the pen draws it down once); 0:10 paper 2 teaches signing; 0:16
 * the first slip (the pen points at it once); 0:38 "Gossip 0/5" appears, no lecture.
 */
import type { DecreeConfig, DecreeGame } from './types';

/** The hint target keys to point at now, most important first. Skeleton: returns none (no hint until P1b writes the script). */
export function hintsFor(cfg: DecreeConfig, g: DecreeGame): string[] {
  return [];
}
