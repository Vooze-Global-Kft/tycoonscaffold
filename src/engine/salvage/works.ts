/**
 * THE WORKS (stage 2, docs/design/yard-stage2.md 2.5 to 2.8): works plates on their plots, their life
 * (arriving, installed, running: 2.6.3), their pieces, segments and trays, the halls' heats, the magnet
 * crane's moves, the back field fed from the bays. Owner: rules-works (Phase B fills the bodies).
 *
 * PHASE A STUB (engine2-hooks, 26 November): every function below does nothing and returns what "no works"
 * means, so the first yard advances exactly as before. The loop calls each at its one place (it is the
 * loop's engineer's to move, `requests.md` to engine2):
 * - `worksDated` from the DERIVED queue (tick.ts firstEvent and nextEvent): every dated end of the works,
 *   each given to `add(at, kind, ref)` with its queue kind (`plate`, `hall`, `commission`, `crane`) and a
 *   ref (the plate id). It must be a pure function of `x.c` and `x.s` (nextEvent hands it a view with no
 *   events, cash or away card) and must not allocate per call if it can help it (the away pass asks the
 *   queue thousands of times). A date it gives must move (or go) once its event is applied, or the instant
 *   repeats until the loop's guard.
 * - `worksApply` at the instant of one of those events, in the queue's order within one instant (B9: the
 *   new kinds after `machine`, before `round`, in STAGE2_QUEUE_ORDER; tick.ts QUEUE_ORDER).
 * - `worksCredit` wherever the loop brings the rate machines' stocks to an instant (tick.ts advance, before
 *   anything reads them, and at the horizon): a bay-fed plate's cumulative draw (2.8.1) is credited here.
 * - `worksDepart` after the first yard's departures of one instant (cutters, yard hands, the driver): the
 *   works' own agents (the crane's next move, a hall's refill from the bays, a bay-fed plate's segment) and
 *   any yard hand still idle after the first yard's order chose nothing for him (S12's order gains the
 *   plates AFTER the first yard's machines, 2.5.3; a plate's tray among the stations' trays, fullest first,
 *   needs a call inside crew.ts handDepart: ask engine2).
 * - `worksOpen` from the checks (rate.ts checks) at every instant they run while the yard stands at or
 *   above the works layer's rung (`worksRungOf`, from content) and `counts.bathSet` is absent (2.20, B14:
 *   derived from the state, never from the rung event, so a layout-2 save at rung 3 opens at its first
 *   tick): `backFieldOpen`, the bath, `lots.nextAt` (2.10.1) and the `stage2` goals belong here. Until it
 *   sets `counts.bathSet` it is called at every such check.
 */
import type { Ctx } from './clock';

/** The queue kinds the works date (types.ts QueuedKindV3, STAGE2_QUEUE_ORDER). */
export type WorksKind = 'plate' | 'hall' | 'commission' | 'crane';

/** How a feature gives a dated end to the derived queue: its yard second (null/undefined: none), its kind, its ref. */
export type DatedAdd<K extends string> = (at: number | null | undefined, kind: K, ref: string) => void;

/** Every dated end of the works (the queue is derived from the state, never saved). Stub: none. */
export function worksDated(x: Ctx, add: DatedAdd<WorksKind>): void {
  void x;
  void add;
}

/** Apply one dated event of the works at its instant t (ref: the plate id). Stub: nothing dates one. */
export function worksApply(x: Ctx, kind: WorksKind, ref: string, t: number): void {
  void x;
  void kind;
  void ref;
  void t;
}

/** Bring the works' rate stocks (a bay-fed plate's cumulative draw) to yard second t. Stub: none. */
export function worksCredit(x: Ctx, t: number): void {
  void x;
  void t;
}

/** The works' departures at the end of one instant, after the first yard's (cutters, yard hands, driver). Stub: none. */
export function worksDepart(x: Ctx, t: number): void {
  void x;
  void t;
}

/** The works layer opens (2.6.1, 2.20): called by the checks while rung >= worksRungOf and counts.bathSet is absent. Stub: nothing opens. */
export function worksOpen(x: Ctx, t: number): void {
  void x;
  void t;
}
