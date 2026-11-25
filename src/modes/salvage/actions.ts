/**
 * PLACEHOLDER store actions of the salvage mode (AGENTS.md: every state change goes through an
 * action). The ground work has one: `presence`, the screen's sample of where the worker stands
 * (src/ui/salvage/world/frameLoop.ts `onSample`, passed on by src/ui/salvage/SalvageShell.tsx, at most
 * ten a second). The rules decide what standing there does
 * (src/engine/salvage.ts). The rules engineers add the real actions here once docs/design/yard-design.md
 * exists. No sound yet (the salvage table is empty, src/services/fx/catalog.salvage.ts).
 */
import * as R from '../../engine/salvage';
import type { GameState } from '../../engine/types';
import { crash } from '../../services/firebase';
import { useGame } from '../../state/store';

/** The current salvage config and game, or null outside a salvage game. */
export function salvageNow(): { cfg: R.SalvageConfig; g: R.SalvageGame } | null {
  const { cfg, game, hydrated } = useGame.getState();
  const g = game as R.SalvageGame;
  return hydrated && R.isSalvage(cfg) && g.salvage ? { cfg, g } : null;
}

export const salvageActions = {
  /** Where the worker stands (sampled by the screen). Returns false outside a salvage game or when nothing changed. */
  presence(p: R.Presence): boolean {
    const now = salvageNow();
    if (!now) return false;
    let next: R.SalvageGame;
    try {
      next = R.setPresence(now.cfg, now.g, p);
    } catch (e) {
      crash.record(e, 'salvage.presence');
      return false;
    }
    if (next === now.g) return false;
    useGame.setState({ game: next as GameState });
    return true;
  },
};
