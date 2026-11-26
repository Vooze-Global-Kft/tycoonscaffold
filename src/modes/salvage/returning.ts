/**
 * No frozen screen on returning (owner2-hud, the second update, item 2). After hours away the first advance
 * computes the whole absence at once (the away pass: 0.2 to 0.4 s of CPU in node at stages 1's rungs, more on a
 * phone: notes/owner2-hud.md). Before this, that pass ran inside the store's resume() (and boot()) through the
 * engine's `offline`, or inside the first tick after a gap (advanceSalvage), with the screen frozen on the yard as
 * the player left it.
 *
 * THE SEAM. The mode hands the store its engine wrapped (`deferAway`): when an advance would make the away pass
 * of an absence that shows the away card, it does not make it. It records ONE pending absence (`from`, the instant
 * the yard last ran) and returns the state unchanged; while it is pending every tick returns the state unchanged
 * (no tick of live play with the old clock) and the presence and the card buttons are not applied
 * (./actions.ts asks `heldForCount`). The screen (src/ui/salvage/overlays/counting.ts) paints the counting card
 * in the away card's frame and, two frames after it is on screen, calls `runPending`: the pass, exactly once,
 * through the engine's own `offline`, to the device time of that moment. The away card then opens in its place.
 *
 * Shorter absences (no away card) take the old path unchanged: the pass, if any, runs where it ran.
 *
 * Never two passes: a return while one is pending adds nothing (the one pass to come covers the whole absence
 * from `from`); `runPending` clears it before it runs. Never a lost one: the store stamps `lastSavedAt` on every
 * save while the yard waits, so the pass is handed the state with `lastSavedAt` and `clockHigh` no later than
 * `from`, and the store's own stamps are put back on the result. And if the app is killed while the absence waits
 * (the save then holds a `lastSavedAt` far later than the yard's own clock, `clock.highMs`, which only a tick or a
 * pass moves), the next start sees that signature and counts from the yard's clock (`absenceOf`).
 *
 * Module state, one per JavaScript context (as the store). Owner: owner2-hud.
 */
import type { EngineMode } from '../../engine/mode';
import * as R from '../../engine/salvage';
import { awaySeconds } from '../../engine/salvage/away';
import { salvageEngineMode } from '../../engine/salvageMode';
import type { GameState } from '../../engine/types';
import { crash } from '../../services/firebase';
import { useGame } from '../../state/store';

/** The absence that waits for its pass: the device ms the yard last ran (the pass counts from here). */
export interface PendingAbsence {
  from: number;
}

let pending: PendingAbsence | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  for (const f of [...listeners]) f();
}

/** The waiting absence, or null. */
export function pendingAbsence(): PendingAbsence | null {
  return pending;
}

/** Called when an absence starts or ends waiting. */
export function onPending(f: () => void): () => void {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

/** True while an absence waits for its pass: the presence and the actions are not applied to the old state. */
export function heldForCount(): boolean {
  return pending !== null;
}

/** The instant an absence of this state counts from (away.ts awaySeconds), with the killed-while-waiting signature. */
export function absenceFrom(cfg: R.SalvageConfig, g: R.SalvageGame): number {
  const yardMs = g.salvage.clock.highMs;
  const stamped = Math.max(g.lastSavedAt || 0, g.stats.clockHigh ?? 0);
  // A save stamped long after the yard's own clock last moved: the yard waited for a pass that never ran (only
  // a tick or a pass moves clock.highMs; the saves of a running yard are at most an autosave apart from it).
  if ((g.lastSavedAt || 0) - yardMs > cardS(cfg) * 1000) return yardMs;
  return Math.max(stamped, yardMs);
}

function cardS(cfg: R.SalvageConfig): number {
  const a = cfg.salvage.away as { gapS: number; cardS?: number };
  return Math.max(a.gapS, a.cardS ?? 60);
}

/** The state as the pass must see it: counting from `from` (the store's later stamps lowered to it). */
function countingFrom(g: R.SalvageGame, from: number): R.SalvageGame {
  const ch = g.stats.clockHigh ?? 0;
  if ((g.lastSavedAt || 0) <= from && ch <= from) return g;
  return { ...g, lastSavedAt: Math.min(g.lastSavedAt || 0, from), stats: { ...g.stats, clockHigh: Math.min(ch, from) } };
}

/**
 * Whether an absence at device time `now` would show the away card (away.ts awayPass: `raw > cardS` and a game in
 * which something was done), and from when; null otherwise.
 */
export function absenceOf(cfg: R.SalvageConfig, g: R.SalvageGame, now: number): PendingAbsence | null {
  if (!g?.salvage || !Number.isFinite(now)) return null;
  const from = absenceFrom(cfg, g);
  const raw = awaySeconds(countingFrom(g, from), now);
  if (!(raw > cardS(cfg))) return null;
  const played = Object.entries(g.salvage.counts ?? {}).some(([k, v]) => k !== 'goalsAt' && (v ?? 0) > 0);
  return played ? { from } : null;
}

/** Begin waiting (the store's advance found an absence with a card). */
function hold(p: PendingAbsence): void {
  if (pending) return;
  pending = p;
  tell();
}

/** The engine mode, with the away pass of a carded absence deferred to the screen (see above). */
export function deferAway(mode: EngineMode): EngineMode {
  return {
    ...mode,
    offline: (cfg, state, now) => {
      if (!R.isSalvage(cfg) || !(state as R.SalvageGame).salvage) return mode.offline(cfg, state, now);
      // One pending absence covers every return until its pass runs.
      if (pending) return { seconds: 0, earnings: 0, game: state };
      const p = absenceOf(cfg, state as R.SalvageGame, now);
      if (!p) return mode.offline(cfg, state, now);
      hold(p);
      return { seconds: 0, earnings: 0, game: state };
    },
    tick: (cfg, state, dt, now, events) => {
      if (!R.isSalvage(cfg) || !(state as R.SalvageGame).salvage) return mode.tick(cfg, state, dt, now, events);
      if (pending) return state;
      // The tick's own seam (advanceSalvage): a gap over away.gapS becomes the away pass up to now - dt.
      const g = state as R.SalvageGame;
      const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
      const end = now - step * 1000;
      if (Number.isFinite(now) && (end - g.salvage.clock.highMs) / 1000 > cfg.salvage.away.gapS) {
        const p = absenceOf(cfg, g, end);
        if (p) {
          hold(p);
          return state;
        }
      }
      return mode.tick(cfg, state, dt, now, events);
    },
  };
}

/**
 * The deferred pass, exactly once: the waiting absence is cleared first, then the engine's own `offline` runs on
 * the store's game to device time `now`, and the result is stored (with the store's own save stamps) and saved.
 * False when nothing waited. The screen calls it two frames after the counting card is on screen.
 */
export function runPending(now = Date.now(), engine: EngineMode = salvageEngineMode): boolean {
  const p = pending;
  if (!p) return false;
  pending = null;
  const { cfg, game, hydrated } = useGame.getState();
  const g = game as R.SalvageGame;
  if (hydrated && R.isSalvage(cfg) && g.salvage) {
    let next: GameState = g;
    try {
      next = engine.offline(cfg, countingFrom(g, p.from), now).game ?? g;
    } catch (e) {
      crash.record(e, 'salvage.awayPass');
    }
    if (next !== g) {
      // The store's own stamps stay its own (the next resume counts from them as before).
      next = { ...next, lastSavedAt: g.lastSavedAt, stats: { ...next.stats, clockHigh: g.stats.clockHigh } };
      useGame.setState({ game: next });
      void useGame.getState().save();
    }
  }
  tell();
  return true;
}

/**
 * Web preview only (src/ui/salvage/overlays/devOpen.web.ts `?counting=`): make the yard's clock `hours` old and
 * wait, as a return after that long would. Never called on a phone.
 */
export function devBeginAbsence(hours: number): void {
  const { cfg, game } = useGame.getState();
  const g = game as R.SalvageGame;
  if (!R.isSalvage(cfg) || !g?.salvage || pending) return;
  const from = Date.now() - hours * 3_600_000;
  useGame.setState({ game: { ...g, lastSavedAt: Math.min(g.lastSavedAt, from), stats: { ...g.stats, clockHigh: Math.min(g.stats.clockHigh ?? 0, from) }, salvage: { ...g.salvage, clock: { ...g.salvage.clock, highMs: from } } } as GameState });
  pending = { from };
  tell();
}

/** Tests only: forget a waiting absence. */
export function resetPendingForTests(): void {
  pending = null;
}
