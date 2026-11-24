/**
 * The pen's hints (3.1's timed script, 4.5 "Hints never cover a number"): which target keys of
 * src/ui/hints/targets.ts the tutorial pen points at now, as data for the screens' hint script.
 * Package P1b (docs/design/office-build-plan.md); the pen itself is P8's (`parts.HintPointer`,
 * src/ui/decree/hints.ts), which draws it and decides how long it waits.
 *
 * The script (3.1), each step only while it is still to be learnt:
 * - 0:02 paper 1 (the first scripted paper of the mayor) teaches refusal: the pen draws the paper
 *   down once toward the drawer: ['paper', 'drawer'];
 * - 0:10 paper 2 teaches signing: the pen pushes it up into the out-tray: ['paper', 'outTray'];
 * - 0:16 the first budget slip (none taken yet): the pen points at it once: ['slip'];
 * - "Gossip 0/5" appears at 0:38 with no lecture, so nothing points at it; no other step points.
 * The first key is where the pen rests; a second key, when there is one, is where it moves to.
 */
import type { DecreeConfig, DecreeGame } from './types';

/** The scripted slots of the mayor whose paper teaches a flick (3.1): slot 1 refusal, slot 2 signing. */
export const TEACHING_SLOTS = { refuse: 1, sign: 2 } as const;

/** The hint target keys to point at now, most important first (empty when nothing is to be taught). Built. */
export function hintsFor(cfg: DecreeConfig, g: DecreeGame): string[] {
  const d = g.decree;
  if (d.office !== 0 || d.term !== 1 || d.phase !== 'governing' || d.pending) return [];
  const desk = d.desk;
  if (desk?.type === 'paper' && desk.paper.kind === 'scripted') {
    const def = cfg.decree.deck.scripted.find((p) => p.id === desk.paper.source);
    if (def?.office === 'mayor' && def.slot === TEACHING_SLOTS.refuse && d.stats.refused === 0) return ['paper', 'drawer'];
    if (def?.office === 'mayor' && def.slot === TEACHING_SLOTS.sign && d.stats.signed === 0) return ['paper', 'outTray'];
    return [];
  }
  if (desk?.type === 'slip' && d.stats.slipsTaken === 0) return ['slip'];
  return [];
}
