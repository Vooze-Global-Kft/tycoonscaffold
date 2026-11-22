/**
 * Small rules the play layer shares: when the extra scene buttons (skill, chest, missions) may
 * show, when the flying bonus may appear, and the "a new venue just opened" signal.
 */
import type { GameConfig } from '../../../../config/schema';
import * as E from '../../../../engine/economy';
import type { GameState } from '../../../../engine/types';
import { overlays } from '../../../../state/overlays';
import { useGame } from '../../../../state/store';

/**
 * In a sim game, new players learn the loop (tap, ring, buy, hire) before anything else appears,
 * so the skill, chest and missions buttons wait for the first venue's transport automation hire.
 * Once it has been bought they stay for good: a prestige or a second venue proves it happened.
 * Classic games have no such step and show them from the start.
 */
export function extrasUnlocked(cfg: GameConfig, game: GameState): boolean {
  if (!E.isSim(cfg)) return true;
  if (game.prestigeCount > 0 || game.stats.venuesEver > 1) return true;
  const first = cfg.sim.venues[0]?.id;
  return Boolean(first && game.venues[first]?.chain?.transportManaged);
}

/** The flying bonus never interrupts a dialog (any of them, see src/state/overlays.ts), a chest, a story beat or a player still learning the loop. */
export function canSpawnBonus(): boolean {
  const s = useGame.getState();
  if (!s.hydrated || s.modal || s.chestOpening || s.offline || s.dealPopup || overlays.anyOpen()) return false;
  if (s.bonus.activeId !== null || Date.now() < s.bonus.nextAt) return false;
  if (E.pendingStoryBeat(s.cfg, s.game)) return false;
  return extrasUnlocked(s.cfg, s.game);
}

/**
 * A venue that just opened, for the grand-opening moment. The unlock happens on another tab and
 * the home tab (with this layer) mounts right after, so the signal is caught here at module level
 * from the store's own "venue" celebration rather than by a component that may not exist yet.
 * Preset loads and save restores add no celebration, so they never trigger it.
 */
export interface Opening {
  seq: number;
  name: string;
  icon: string;
  at: number;
}

let lastCelebrationId = Math.max(0, ...useGame.getState().celebrations.map((c) => c.id));
let pending: Opening | null = null;
let openingSeq = 0;
const listeners = new Set<(o: Opening) => void>();

useGame.subscribe((s, prev) => {
  if (s.celebrations === prev.celebrations) return;
  for (const c of s.celebrations) {
    if (c.id <= lastCelebrationId) continue;
    lastCelebrationId = c.id;
    if (c.kind !== 'venue') continue;
    pending = { seq: ++openingSeq, name: c.title, icon: c.icon, at: Date.now() };
    const o = pending;
    listeners.forEach((l) => l(o));
  }
});

/** How long after the unlock a grand opening may still start (the tab switch takes a moment). */
const OPENING_FRESH_MS = 3000;

export const openings = {
  /** The opening not yet shown, if it is still fresh; taking it marks it shown. */
  take(): Opening | null {
    const o = pending;
    pending = null;
    return o && Date.now() - o.at < OPENING_FRESH_MS ? o : null;
  },
  subscribe(l: (o: Opening) => void): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
