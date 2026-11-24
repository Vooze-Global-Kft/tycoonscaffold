/**
 * The desk's switches in the web preview (web only: Metro takes ./dev.ts, which does nothing, for iOS
 * and Android), applied once the preset is in the store (`devParamsApplied`). Each lands a paper of a
 * kind no preset shows, drawn and landed by the RULES (src/engine/decree.ts), so what the preview
 * shows is a paper the game can hold:
 *   &desk=front        the comic front page (2.8)
 *   &desk=grievance    the first club's grievance, its boycott running (2.8)
 *   &desk=requisition  a requisition for ministry 1 (2.2 routine papers)
 *   &desk=ribbon       a ribbon-cutting for ministry 1
 *   &desk=application  the next minister's application (2.9)
 *   &desk=rally        the run-up's rally (2.10)
 * Also `&fs=1.3` (./fontScale.web.ts) and `&buttons=1` (./devButtons.web.ts). Owned by the desk package.
 */
import { Platform } from 'react-native';
import { devOncePerPageLoad, devParamsApplied } from '../../../dev/devtools';
import * as R from '../../../engine/decree';
import type { GameState } from '../../../engine/types';
import { useGame } from '../../../state/store';
import { useDecreeUi } from '../uiState';

function param(): string | null {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get('desk');
}

export function applyDeskDevParams(): void {
  // The preview's play log reads the state through this (web only; a phone bundle never holds it).
  (globalThis as { __decreeDev?: unknown }).__decreeDev = { game: () => useGame.getState().game, cfg: () => useGame.getState().cfg, R, ui: () => useDecreeUi.getState() };
  const kind = param();
  if (!kind || !devOncePerPageLoad('decree-desk')) return;
  void devParamsApplied().then(() => setTimeout(() => land(kind), 400));
}

function land(kind: string): void {
  const { cfg, game } = useGame.getState();
  if (!R.isDecree(cfg)) return;
  const g = game as R.DecreeGame;
  const clock = g.stats.playSeconds;
  let drawn: { paper: R.Paper; g: R.DecreeGame } | null = null;
  try {
    if (kind === 'front') drawn = R.frontPagePaper(cfg, g);
    else if (kind === 'requisition') drawn = R.requisitionPaper(cfg, g, 1);
    else if (kind === 'ribbon') drawn = R.ribbonPaper(cfg, g, 1);
    else if (kind === 'application') drawn = R.applicationPaper(cfg, g, cfg.decree.ministers.find((m) => !g.decree.applicationsDelivered.includes(m.id))?.id ?? '');
    else if (kind === 'rally') drawn = R.drawRally(cfg, g, []);
    else if (kind === 'grievance') {
      const def = cfg.decree.deck.grievances.find((x) => R.clubIndex(cfg, g.decree.office, x.club) === 0) ?? cfg.decree.deck.grievances[0];
      const club = def ? R.clubIndex(cfg, g.decree.office, def.club) : -1;
      if (def && club !== null && club >= 0) {
        const strikes = g.decree.strikes.slice();
        strikes[club] = { papersLeft: cfg.decree.boycott.papers, picket: def.picket, grievance: def.id };
        const moods = g.decree.moods.slice();
        moods[club] = Math.min(moods[club], 18);
        drawn = R.grievancePaper(cfg, { ...g, decree: { ...g.decree, strikes, moods } }, club, def);
      }
    }
  } catch {
    drawn = null;
  }
  if (!drawn) return;
  const landed = R.landPaper(cfg, { ...drawn.g, decree: { ...drawn.g.decree, desk: null, pending: null } }, drawn.paper, clock);
  useGame.setState({ game: landed as GameState });
}
