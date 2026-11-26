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
 * THE PRINCIPLE (owner2-fix-hud, finding A1): `salvage.clock.highMs` is the device time up to which the yard has
 * been computed, and an absence is always counted from it. The store's stamps (`lastSavedAt`, `stats.clockHigh`)
 * only guard against a clock set back. So the load keeps the SAVED yard clock when the save shows the signature
 * (the mode's `reconcile`, wrapped below: the shared reconcile would otherwise raise highMs to the save's stamp).
 *
 * A pass that throws (A3) is recorded and the yard's clock is raised to `now`: that absence is lost, the yard runs
 * on, and no second counting card waits for it. A SAFETY NET: an absence never waits for the screen for ever;
 * a tick that arrives more than HOLD_MAX_MS of device time after it began waiting runs the pass itself.
 *
 * IMPORTS (finding L1): the mode's entry (./index.tsx) imports this file, and src/modes/entries.test.ts loads the
 * entry in node with only the drawn pieces stood in. So this file must import nothing that reaches a native
 * module at load (src/services/firebase -> native -> expo-constants): the crash recorder is handed in by the
 * screen (`recordPassErrorsWith`, from ../../ui/salvage/overlays/counting.ts). The rule for the next file the
 * entry imports: only the engine, the store and pure files; a service is handed in, never imported.
 *
 * Module state, one per JavaScript context (as the store). Owner: owner2-hud.
 */
import type { EngineMode } from '../../engine/mode';
import * as R from '../../engine/salvage';
import { awaySeconds } from '../../engine/salvage/away';
import { salvageEngineMode } from '../../engine/salvageMode';
import type { GameState } from '../../engine/types';
import { useGame } from '../../state/store';

/** The absence that waits for its pass: the device ms the yard last ran (the pass counts from here). */
export interface PendingAbsence {
  from: number;
  /** The device ms it began waiting (the safety net's clock). */
  since?: number;
}

/** A3's safety net: a tick this long (device ms) after the absence began waiting runs the pass itself. */
export const HOLD_MAX_MS = 8000;

let pending: PendingAbsence | null = null;
let record: (e: unknown, where: string) => void = () => {};

/** The screen hands in the crash recorder (L1: this file imports no service). */
export function recordPassErrorsWith(f: (e: unknown, where: string) => void): void {
  record = f;
}
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
  // A save stamped long after the yard's own clock last moved: the yard waited for a pass that never ran (only
  // a tick or a pass moves clock.highMs; the saves of a running yard are at most an autosave apart from it).
  if (killedWhileWaiting(cfg, g.lastSavedAt, yardMs)) return yardMs;
  return Math.max(g.lastSavedAt || 0, g.stats.clockHigh ?? 0, yardMs);
}

/** The signature of an absence killed while it waited: a save stamped more than cardS after the yard's clock. */
function killedWhileWaiting(cfg: R.SalvageConfig, savedAt: unknown, highMs: unknown): boolean {
  const saved = Number(savedAt);
  const hi = Number(highMs);
  return Number.isFinite(saved) && Number.isFinite(hi) && saved - hi > cardS(cfg) * 1000;
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

/** Begin waiting (the store's advance found an absence with a card) at device time `at`. */
function hold(p: PendingAbsence, at: number): void {
  if (pending) return;
  pending = { ...p, since: Number.isFinite(at) ? at : p.from };
  tell();
}

/**
 * The pass itself, on `g` to device time `now`, counting from `from`: the engine's own `offline`, with the store's
 * own stamps put back on the result. A throw is recorded and the yard's clock raised to `now` (A3: that absence is
 * lost, the yard runs on, nothing waits again for it).
 */
function pass(engine: EngineMode, cfg: R.SalvageConfig, g: R.SalvageGame, from: number, now: number): GameState {
  let next: GameState;
  try {
    next = engine.offline(cfg, countingFrom(g, from), now).game ?? g;
  } catch (e) {
    record(e, 'salvage.awayPass');
    const hi = Math.max(g.salvage.clock.highMs, Number.isFinite(now) ? now : g.salvage.clock.highMs);
    return { ...g, salvage: { ...g.salvage, clock: { ...g.salvage.clock, highMs: hi } } } as GameState;
  }
  if (next === g) return g;
  // The store's own stamps stay its own (the next resume counts from them as before).
  return { ...next, lastSavedAt: g.lastSavedAt, stats: { ...next.stats, clockHigh: g.stats.clockHigh } };
}

/** The engine mode, with the away pass of a carded absence deferred to the screen (see above). */
export function deferAway(mode: EngineMode): EngineMode {
  return {
    ...mode,
    // A1: a save killed while its absence waited keeps its own yard clock (the shared reconcile raises highMs to
    // the save's stamp), so the next start counts the absence from the instant the yard last ran.
    reconcile: (cfg, base, raw) => {
      const g = mode.reconcile(cfg, base, raw);
      if (!R.isSalvage(cfg) || !(g as R.SalvageGame).salvage) return g;
      const r = raw as { lastSavedAt?: unknown; salvage?: { clock?: { highMs?: unknown } } } | null;
      const hi = Number(r?.salvage?.clock?.highMs);
      if (!killedWhileWaiting(cfg, r?.lastSavedAt, hi) || !(hi > 0)) return g;
      const s = g as R.SalvageGame;
      return { ...s, salvage: { ...s.salvage, clock: { ...s.salvage.clock, highMs: hi } } } as GameState;
    },
    offline: (cfg, state, now) => {
      if (!R.isSalvage(cfg) || !(state as R.SalvageGame).salvage) return mode.offline(cfg, state, now);
      // One pending absence covers every return until its pass runs.
      if (pending) return { seconds: 0, earnings: 0, game: state };
      const p = absenceOf(cfg, state as R.SalvageGame, now);
      if (!p) return mode.offline(cfg, state, now);
      hold(p, now);
      return { seconds: 0, earnings: 0, game: state };
    },
    tick: (cfg, state, dt, now, events) => {
      if (!R.isSalvage(cfg) || !(state as R.SalvageGame).salvage) return mode.tick(cfg, state, dt, now, events);
      const g = state as R.SalvageGame;
      if (pending) {
        // A3's safety net: the loop runs (the screen is up) and the absence has waited too long for the counting
        // card: this tick makes the one pass (the away card opens from the store as it would have).
        const p = pending;
        if (!(Number.isFinite(now) && now - (p.since ?? now) > HOLD_MAX_MS)) return state;
        pending = null;
        const next = pass(mode, cfg, g, p.from, now);
        queueMicrotask(tell);
        return next;
      }
      // The tick's own seam (advanceSalvage): a gap over away.gapS becomes the away pass up to now - dt.
      const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
      const end = now - step * 1000;
      if (Number.isFinite(now) && (end - g.salvage.clock.highMs) / 1000 > cfg.salvage.away.gapS) {
        const p = absenceOf(cfg, g, end);
        if (p) {
          hold(p, now);
          return state;
        }
      }
      return mode.tick(cfg, state, dt, now, events);
    },
  };
}

/**
 * The engine the salvage entry hands the store: the rules themselves with their three time-away seams (reconcile,
 * offline, tick) deferred as above, and everything else the rules' own. One object for the life of this module
 * (src/modes/entries.test.ts pins that the entry hands over exactly this). The lead, 26 November: a plain wrapper,
 * not the rules' object changed in place: whoever imports salvageEngineMode gets the rules as they are.
 */
export const salvageReturningEngine: EngineMode = deferAway(salvageEngineMode);

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
    const next = pass(engine, cfg, g, p.from, now);
    if (next !== g) {
      useGame.setState({ game: next });
      void useGame.getState().save();
    }
  }
  tell();
  return true;
}

/**
 * Web preview only (src/ui/salvage/overlays/devOpen.web.ts `?counting=`): make the yard's clock `hours` old and
 * wait, as a return after that long would (`holdForever`: ?counting=hold). Never called on a phone.
 */
export function devBeginAbsence(hours: number, holdForever = false): void {
  const { cfg, game } = useGame.getState();
  const g = game as R.SalvageGame;
  if (!R.isSalvage(cfg) || !g?.salvage || pending) return;
  const from = Date.now() - hours * 3_600_000;
  useGame.setState({ game: { ...g, lastSavedAt: Math.min(g.lastSavedAt, from), stats: { ...g.stats, clockHigh: Math.min(g.stats.clockHigh ?? 0, from) }, salvage: { ...g.salvage, clock: { ...g.salvage.clock, highMs: from } } } as GameState });
  // ?counting=hold keeps the card for pictures: the safety net never fires for it.
  pending = { from, since: holdForever ? Infinity : Date.now() };
  tell();
}

/** Tests only: forget a waiting absence. */
export function resetPendingForTests(): void {
  pending = null;
}
