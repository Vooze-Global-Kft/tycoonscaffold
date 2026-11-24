/**
 * The views' switches in the web preview (web only: Metro takes ./dev.ts, which does nothing, for iOS
 * and Android), applied once the preset is in the store (`devParamsApplied`). Each drives the RULES
 * (src/engine/decree.ts) to the moment it shows, so what the preview shows is a state the game can be in:
 *   &face=<player id>       the portrait (a preset's bot never picks one)
 *   &night=play|win|lose    from a run-up (preset=mid): every run-up paper refused, then the count and
 *                           Election Night; win / lose first set every mood to 90 / 5 (a sure result)
 *   &result=play|win|lose   the same, straight to the result sheet (election night ended)
 *   &move=1                 with &result=win: the next office's requirements met first (Name Recognition
 *                           set to it, levels bought free through the rules' buy), then the move sheet
 *   &wall=1                 the Office wall
 *   &monument=1             this term's monument offer (when the rules have one)
 * Owned by the views package (VIEWS).
 */
import { Platform } from 'react-native';
import { devOncePerPageLoad, devParamsApplied } from '../../../dev/devtools';
import * as R from '../../../engine/decree';
import type { GameState } from '../../../engine/types';
import { useGame } from '../../../state/store';
import { useDecreeUi } from '../uiState';
import { openMonument } from './viewsUi';

function params(): URLSearchParams | null {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search);
}

export function applyViewsDevParams(): void {
  if (!params() || !devOncePerPageLoad('decree-views')) return;
  void devParamsApplied().then(() => setTimeout(applyNow, 500));
}

/** Refuses every run-up paper (signing costs nothing for the count's tests here) until the votes may be counted. */
function finishRunUp(cfg: R.DecreeConfig, g0: R.DecreeGame): R.DecreeGame {
  let s = g0;
  for (let k = 0; k < 600 && !R.canCount(cfg, s); k++) {
    const clock = s.stats.playSeconds;
    if (s.decree.desk) {
      s = R.decide(cfg, s, 'refuse', clock, []);
      if (s.decree.pending) s = R.commitPending(cfg, s, clock, []);
    } else s = R.advanceDecree(cfg, s, 1, 0);
  }
  return s;
}

/** The next office's requirements met (a preview of the move sheet): NR at its need, levels bought free by the rules until the record is met. */
function meetRequirements(cfg: R.DecreeConfig, g0: R.DecreeGame): R.DecreeGame {
  const req = R.moveRequirements(cfg, g0);
  if (!req) return g0;
  let g: R.DecreeGame = { ...g0, decree: { ...g0.decree, nr: Math.max(g0.decree.nr, req.nrNeeded) } };
  for (let k = 0; k < 2000 && (R.moveRequirements(cfg, g)?.record ?? Infinity) < req.recordNeeded; k++) {
    const i = g.decree.ministries.findIndex((m, j) => j < cfg.decree.offices[g.decree.office].ministries.length && (!m.open || m.level < cfg.decree.ministry.levelCap));
    if (i < 0) break;
    const m = g.decree.ministries[i];
    const next = R.buy(cfg, g, m.open ? { type: 'level', ministry: i } : { type: 'open', ministry: i }, null, [], { free: true });
    if (next === g) break;
    g = next;
  }
  return g;
}

function applyNow(): void {
  const q = params();
  if (!q) return;
  const { cfg } = useGame.getState();
  if (!R.isDecree(cfg)) return;
  let g = useGame.getState().game as R.DecreeGame;
  if (!g.decree) return;
  const face = q.get('face');
  if (face) g = R.pickFace(cfg, g, face);
  const which = q.get('night') ?? q.get('result');
  if (which && g.decree.phase === 'campaign') {
    if (q.get('move') === '1') g = meetRequirements(cfg, g);
    if (which === 'win' || which === 'lose') g = { ...g, decree: { ...g.decree, moods: g.decree.moods.map(() => (which === 'win' ? 90 : 5)) } };
    g = finishRunUp(cfg, g);
    if (R.canCount(cfg, g)) g = R.countVotes(cfg, g, []);
    if (q.get('result')) g = R.endElectionNight(cfg, g);
  }
  useGame.setState({ game: g as GameState });
  const ui = useDecreeUi.getState();
  if (q.get('night') && g.decree.phase === 'count') ui.openView('electionNight');
  if (q.get('result') && q.get('move') === '1' && R.canMoveUp(cfg, g)) setTimeout(() => ui.openSheet({ type: 'move' }), 900);
  if (q.get('wall') === '1') ui.openView('office');
  if (q.get('monument') === '1') openMonument();
}
