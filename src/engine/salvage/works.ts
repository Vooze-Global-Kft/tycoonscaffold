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
import type { CarriedSkip, CrewMember, MachineId, StationId } from './types';

/** The queue kinds the works date (types.ts QueuedKind, STAGE2_QUEUE_ORDER). */
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

// ============================================================================================ s2a-fix: the rest of the call sites
//
// s2a-fix (26 November, the critic's finding 3): the call sites Phase B's features need in the loop's files,
// each with a stub here that changes nothing (so the first yard advances bit for bit as before). The loop's
// engineer (engine2) owns the CALLS; rules-works fills the BODIES (it may move a body into its feature's file,
// lots.ts, crate.ts, reuse.ts, forklift.ts, and call it from here). EVERY DATE a body writes into the state
// for the queue (commissionAt, a heat's endsAt, lots.nextAt, reuse.nextAt / vanAt, a crane move's end) must be
// AT LEAST the yard second t it is written at: the loop never applies a date before s.t (tick.ts drops it), so
// a date in the past stops its feature for ever (state2.ts repairStage2 clamps a saved one to the save's clock).

/** The boss's stage-2 act kinds (ActKind v3): standing at a plate to start it up, racking, cutting an oversize piece, sorting the picking table. */
export type WorksActKind = 'commission' | 'rack' | 'lot' | 'crate';
export const WORKS_ACTS: ReadonlySet<string> = new Set<WorksActKind>(['commission', 'rack', 'lot', 'crate']);

/**
 * A purchase is OWNED (rate.ts own, after the first yard's parts, before the `owned` event): the three-axle
 * truck, the forklift (SalvageState.forklift from null), the pallet truck, the plasma cutter's own parts. A
 * plate never comes here (orderPlate). Stub: nothing.
 */
export function worksOwn(x: Ctx, item: string, t: number): void {
  void x;
  void item;
  void t;
}

/**
 * THE ONE WAY A PLATE IS ORDERED (2.6.3, 2.14.3; s2a-fix, the critic's findings 2 and 10): `actions.ts buy` of
 * a shop item of kind 'works' and `signFinance` both call it after the money is taken. A plate's arrival is
 * `works[plate] = {phase 'arriving', commissionAt: t + deliver_s, ...}`, dated ONLY by worksDated (queue kind
 * `commission`, whose first event is the flatbed setting it down: phase 'installed', commissionAt = that
 * instant + works.selfCommission_s); `s.arriving` never holds a plate's key. Stub: nothing (no plate is on
 * sale before the works open, and nothing opens them in Phase A).
 */
export function orderPlate(x: Ctx, plate: string, t: number): void {
  void x;
  void plate;
  void t;
}

/** The boss's stage-2 acts START (hand.ts bossStep, after the scale, the hopper zones and the chalk circles, before racking and pickup): true when one began (the step ends). Stub: never. */
export function worksAct(x: Ctx, t: number): boolean {
  void x;
  void t;
  return false;
}

/** A stage-2 act IN PROGRESS still holds at t (hand.ts bossStep: false cancels it, as walking off a piece does). Stub: it holds. */
export function worksActHolds(x: Ctx, kind: WorksActKind, t: number): boolean {
  void x;
  void kind;
  void t;
  return true;
}

/** A stage-2 act ENDS at t (hand.ts bossActEnd: its effect; the boss's next step follows). Stub: nothing. */
export function worksActEnd(x: Ctx, kind: WorksActKind, t: number): void {
  void x;
  void kind;
  void t;
}

/**
 * A crew member's ordinary leg ends at t (crew.ts crewLegEnd, BEFORE the first yard's handLegEnd and
 * cutterLegEnd; a planned run's landing is landRun's): true when the works took it (a job the first yard does
 * not know, 'rack', or a station destination: a plate's feed, its tray). Stub: never.
 */
export function worksLegEnd(x: Ctx, m: CrewMember, t: number): boolean {
  void x;
  void m;
  void t;
  return false;
}

/**
 * The stations whose out trays a yard hand empties, in his order (crew.ts handDepart step 3: "the trays of
 * every station, fullest first", 2.5.3, S12). Given the first yard's machines in their order, it returns the
 * order to use; an id that is not a first-yard machine is taken by `worksTrayTrip`. Stub: the first yard's
 * list itself (the same array: no allocation).
 */
export function stationTrays(x: Ctx, base: readonly MachineId[]): readonly StationId[] {
  void x;
  return base;
}

/** A yard hand sets off for a plate's tray (crew.ts handDepart step 3, for a station of stationTrays that is a plate): true when he did. Stub: never. */
export function worksTrayTrip(x: Ctx, m: CrewMember, t: number, plate: StationId): boolean {
  void x;
  void m;
  void t;
  void plate;
  return false;
}

/**
 * A load that is not a skip lands (truck.ts tipNow, before the floor: 2.9's flatrack to the car pad, the
 * closed battery box to the lead line's box): true when the works landed it (tipNow then ends the trip as for
 * a tipped skip: no floor slot is taken). Stub: never (every load is a skip). Phase B also owns the trip's
 * route to that place (truck.ts planTrip, replayTrip and driverLegEnd go weighbridge -> floor -> park
 * today): a request to engine2.
 */
export function landBody(x: Ctx, skip: CarriedSkip, t: number): boolean {
  void x;
  void skip;
  void t;
  return false;
}
