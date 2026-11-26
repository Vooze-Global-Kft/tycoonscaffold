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
import type { PlateDef } from '../../config/schema.salvage';
import { bayOf } from './bays';
import { partnerOf } from './create';
import { boostFactor, count, heard, numberBays, spend, type Ctx } from './clock';
import { legM, plateDef, plateKey, plateOut, sumStock, vpk } from './content';
import { hallApply, hallCheckReady, hallFromBays, hallsDated } from './halls';
import { mergedContent } from './layer';
import { roundMoney } from './money';
import { nearPlace, placeGap, spotPos } from './positions';
import { lotAct, lotActEnd, lotActHolds, lotsOpen } from './lots';
import { crateAct, crateActEnd, crateActHolds } from './crate';
import { rackActEnd, rackActHolds, rackLegEnd, reuseOpen } from './reuse';
import { bayDraw, refreshReserves } from './shredder';
import { dropOnPile, takeFromPile, thingGone, thingOf } from './things';
import { weighIn } from './scales';
import type { CarriedSkip, CrewMember, GroundPiece, MachineId, Piece, Spot, StationId, WorksState } from './types';

// ============================================================================================ rules-works (Phase B, wave 1)
//
// THE RULE AS BUILT (yard-stage2.md 2.5 to 2.8; notes/s2b-rules-works.md lists where it differs from the text):
// - A plate is ordered (orderPlate), arrives by its date (`commission` event: phase installed, commissionAt =
//   arrival + works.selfCommission_s), and starts up when the boss has stood still within reach.place of its plot
//   for works.commission_s (the act `commission`, live only) or by itself at commissionAt (present or away the
//   same). Only a RUNNING plate works.
// - A RATE plate works ONE PIECE AT A TIME from its hopper by the first yard's cumulative rule (machines.ts): out
//   grams = floor(share × processed) per output of the piece's input key (2.5.3, out per input), the piece's end
//   giving the exact remainder; the rest is waste. Rate = rate_kg_s (the shear: shear.P / the whole thing's
//   hardness `h`, 1 for a loose piece) × (1 + lev × (L − 1)), fixed at the piece's start; a level re-rates at once.
//   A hands-fed plate's outputs go to its TRAY as they are credited (a full tray stops it before its next piece,
//   nothing lost; yard hands carry the tray to the platform scale); a bay-fed plate's outputs are credited on its
//   belt and land in their grades' BAYS when the piece is done (its belt weigher), and its `stream` share becomes
//   the eddy current's outputs while the eddy current runs (else waste). Reagents are paid when a piece (a bay-fed plate's draw) or a heat starts, never by the clock; a
//   start the cash cannot pay waits.
// - A BAY-FED plate draws, when idle, ONE piece of at most `inbuf` kg from the first bay of its `in` list whose
//   route names it (shredder.ts bayDraw): the bay is debited at that instant (eagerly, once). A bay keeps a reserve
//   of the plate's inbuf (halls: their charge) for each station its grade is routed to (BayState.reserved): the
//   round collects only the stock above the reserves.
// - Routes (2.7.1): `s.routes[grade]` when set and its station runs (or 'bay'), else the running plate whose out
//   is worth most a kilogram over the input at p̄ after reagents (ties: content order), else none (the first
//   yard's own: the crucible takes from its bays as before). Read at a hand's departure, at the crane's move, at
//   each draw of a bay-fed plate and at each charge of a hall.
// - Yard hands serve the plates through the call sites as they are (notes: engine2-dispatch changes the order):
//   a plate's tray comes after the first yard's trays (stationTrays, fullest first); a feed of a hands-fed plate
//   is offered to a hand the first yard's order left idle (worksDepart), from the circles, the drop-off or the
//   floor, one pile a trip, best value first within his load and the hopper's room.
// - The magnet crane (2.7) moves, one dated move at a time, ferrous pieces and whole ferrous things from the
//   tipping floor into the hoppers of the hands-fed plates whose plot its reach holds (placeGap ≤ crane.reach_m,
//   the floor too), at most crane.load_kg a move at crane.rate × (1 + lev × (L − 1)) kg/s, never a thing of
//   crane.neverObjects nor a grade whose material is in crane.never. Move by move in every presence state.

/** The queue kinds the works date (types.ts QueuedKind, STAGE2_QUEUE_ORDER). */
export type WorksKind = 'plate' | 'hall' | 'commission' | 'crane';

/** How a feature gives a dated end to the derived queue: its yard second (null/undefined: none), its kind, its ref. */
export type DatedAdd<K extends string> = (at: number | null | undefined, kind: K, ref: string) => void;

/**
 * Every dated end of the works (the queue is derived from the state, never saved): a plate's arrival and its
 * self-commissioning (`commission`), a rate plate's piece end (`plate`), a hall's heat (`hall`, halls.ts), the
 * crane's move (`crane`). No allocation (the away pass asks thousands of times).
 */
export function worksDated(x: Ctx, add: DatedAdd<WorksKind>): void {
  const ws = x.s.works;
  for (const id in ws) {
    const w = ws[id];
    if (w.phase !== 'running') {
      add(w.commissionAt, 'commission', id);
      continue;
    }
    if (w.work) add(pieceEndsAt(w), 'plate', id);
    else if (w.car) add(w.car.end, 'plate', id);
    if (w.move) add(w.move.end, 'crane', id);
  }
  hallsDated(x, add as DatedAdd<'hall'>);
}

/** Apply one dated event of the works at its instant t (ref: the plate id). */
export function worksApply(x: Ctx, kind: WorksKind, ref: string, t: number): void {
  const w = x.s.works[ref];
  if (!w) return;
  if (kind === 'commission') {
    if (w.phase === 'arriving') plateArrive(x, ref, w, t);
    else if (w.phase === 'installed') commission(x, ref, 'self', t);
    return;
  }
  if (kind === 'plate') {
    if (!w.work && w.car) carDrained(x, ref, w, t);
    else finishPlatePiece(x, ref, w, t);
  }
  else if (kind === 'hall') hallApply(x, ref, t);
  else if (kind === 'crane') craneLand(x, ref, w, t);
}

/** Bring the works' rate stocks to yard second t (every running plate's piece by the cumulative rule; the bays' reserves). */
export function worksCredit(x: Ctx, t: number): void {
  const ws = x.s.works;
  let any = false;
  for (const id in ws) {
    any = true;
    const w = ws[id];
    if (w.work && w.phase === 'running') creditPlate(x, id, w, t);
  }
  if (any) refreshReserves(x);
}

/**
 * The works' departures at the end of one instant, after the first yard's: each running plate in content
 * order (a rate plate takes its next piece or draws from its bays; a hall charges from its bays; the crane
 * makes its next move), then the yard hands the first yard's order left idle feed the hands-fed plates.
 */
export function worksDepart(x: Ctx, t: number): void {
  const ws = x.s.works;
  let any = false;
  for (const _ in ws) {
    any = true;
    break;
  }
  if (!any) return;
  for (const id of plateIds(x)) {
    const w = ws[id];
    if (!w || w.phase !== 'running') continue;
    const d = plateDef(x.c, id)!;
    if (d.kind === 'rate' && d.feedBy !== 'stream') {
      if (!w.work && d.feedBy === 'bays') bayDraw(x, id, w, t);
      if (!w.work) startPlate(x, id, w, t);
    } else if (d.kind === 'batch') hallFromBays(x, id, t);
    else if (d.kind === 'station' && !w.car) carStart(x, id, w, t);
    else if (d.kind === 'handling' && !w.move) craneDepart(x, id, w, t);
  }
  for (const m of x.s.crew) if (m.role === 'hand' && m.phase === 'wait' && m.job === 'idle' && !m.run) handToPlate(x, m, t);
  refreshReserves(x);
}

/**
 * The works layer opens (2.6.1, 2.20): called by the checks (live only) while rung >= worksRungOf and
 * counts.bathSet is absent. From this instant the state reads the merged content (layer.ts contentAt); the
 * Ctx of this transition switches to it at once, so a tick and a jump read the same content from here.
 * `backFieldOpen`; oversize pieces dated (lots.ts lotsOpen) and the Yard sale's first moment (reuse.ts
 * reuseOpen; the bath, wave 2).
 */
export function worksOpen(x: Ctx, t: number): void {
  const s = x.s;
  // A content with no works (the first yard's frozen test content) opens nothing.
  if (s.counts!.bathSet !== undefined || !x.cfg.salvage.works) return;
  s.counts!.bathSet = 1;
  x.c = mergedContent(x.cfg.salvage);
  x.dirty = true;
  x.ev.push({ type: 'backFieldOpen' });
  // Wave 2 (2.9): the works layer's partners (the bridge partners) get their state now, closed until their
  // purchase (the three-axle hook-lift) opens them (partners.ts openPartners at the checks).
  for (const id of Object.keys(x.c.partners)) if (!s.partners[id]) s.partners[id] = partnerOf(x.c, id);
  lotsOpen(x, t);
  reuseOpen(x, t);
}

// ============================================================================================ rules-works: the plates' engine

/** The content's plate ids in their order (rows, then slots as the content lists them), memoised per content. */
const PLATE_IDS = new WeakMap<object, readonly string[]>();
export function plateIds(x: Pick<Ctx, 'c'>): readonly string[] {
  let v = PLATE_IDS.get(x.c);
  if (!v) {
    const ps = x.c.works?.plates ?? {};
    const rows = ['yard', 'shredder', 'melt', 'lead'];
    v = Object.keys(ps).sort((a, b) => rows.indexOf(ps[a].row) - rows.indexOf(ps[b].row) || ps[a].slot - ps[b].slot || (a < b ? -1 : 1));
    PLATE_IDS.set(x.c, v);
  }
  return v;
}

const running = (w: WorksState | undefined): w is WorksState => !!w && w.phase === 'running';

/** A fresh plate as ordered (2.6.3): on the machine flatbed until `commissionAt`. */
function freshWorks(x: Ctx, plate: string, d: PlateDef, t: number): WorksState {
  const w: WorksState = { owned: true, level: 1, hopper: [], work: null, tray_g: {}, trayClaim_g: {}, status: 'arriving', since: t, plate, phase: 'arriving', commissionAt: t + d.deliver_s };
  if (d.kind === 'batch') {
    const recipe = Object.keys(d.recipes ?? {})[0] ?? '';
    w.heat = { recipe, fromBays: true, charge_g: 0, chargeBy: {}, heel_g: 0, phase: 'empty', phaseSince: t, endsAt: null, lastFeedAt: t, firstPoured: false, cooling: null };
  }
  if (d.kind === 'handling') w.move = null;
  void x;
  return w;
}

/** The machine flatbed sets the plate down (2.6.3): installed, doing nothing; it starts up by itself at + works.selfCommission_s. */
function plateArrive(x: Ctx, id: string, w: WorksState, t: number): void {
  w.phase = 'installed';
  w.since = t;
  w.status = 'idle';
  w.commissionAt = t + (x.c.works?.selfCommission_s ?? 0);
  x.ev.push({ type: 'plateArrived', plate: id });
  x.dirty = true;
}

/** Started up (2.6.3): by the boss (his act's end) or by itself at its date. A plate that brings a permit adds its rota row from now (cards read `commissioned`). */
export function commission(x: Ctx, id: string, by: 'boss' | 'self', t: number): void {
  const w = x.s.works[id];
  if (!w || w.phase !== 'installed') return;
  w.phase = 'running';
  w.commissionAt = null;
  w.commissionedBy = by;
  w.since = t;
  count(x, `commissioned:${id}`);
  x.ev.push({ type: 'commissioned', plate: id, by });
}

// ---------------------------------------------------------------------------------------- rate plates

/** The plate's rate for a piece now, kg/s (fixed at the piece's start). */
export function plateRate(x: Ctx, id: string, w: WorksState, p: Pick<Piece, 'whole'> | null): number {
  const d = plateDef(x.c, id);
  if (!d || !running(w)) return 0;
  let base = d.rate_kg_s;
  if (base === undefined) {
    // The shear (2.7): shear.P ÷ the hardness of what it cuts (a whole thing's object `h`; a loose piece 1).
    const P = x.c.shear?.P ?? 0;
    const h = p?.whole ? (x.c.objects[p.whole]?.h ?? 1) : 1;
    base = P / Math.max(1e-9, h);
  }
  return base * (1 + d.lev * Math.max(0, w.level - 1));
}

const hopperG = (w: WorksState): number => {
  let g = 0;
  for (const p of w.hopper) g += p.g;
  return g;
};

/** Room in a plate's hopper, grams (the piece in work counts against inbuf too). */
export function plateRoom(x: Ctx, id: string, w: WorksState): number {
  const d = plateDef(x.c, id);
  if (!d) return 0;
  return d.inbuf * 1000 - hopperG(w) - (w.work ? w.work.piece.g - (w.work.base_g ?? 0) : 0);
}

/** May this piece go into a hands-fed plate's hopper now (running, its input, routed here, room for it whole)? */
export function plateAccepts(x: Ctx, id: string, p: Pick<Piece, 'grade' | 'whole' | 'g'>): boolean {
  const w = x.s.works[id];
  const d = plateDef(x.c, id);
  if (!d || !running(w) || d.kind !== 'rate' || d.feedBy !== 'hands') return false;
  const key = plateKey(d, p);
  if (key === null) return false;
  if (key === p.grade && routeOf(x, p.grade) !== id) return false;
  return plateRoom(x, id, w) >= p.g;
}

/** Put a piece into a plate's hopper (the caller checked plateAccepts); an idle plate starts. */
export function feedPlate(x: Ctx, id: string, p: Piece, t: number): void {
  const w = x.s.works[id];
  w.hopper.push(p);
  if (!w.work) startPlate(x, id, w, t);
}

function setStatus(x: Ctx, id: string, w: WorksState, status: WorksState['status'], t: number): void {
  if (w.status === status) return;
  w.status = status;
  w.since = t;
  if (heard(x)) x.ev.push({ type: 'plateState', plate: id, status });
}

/** Reagents of one input's grams (§; 2.5.3): Σ kg a kg × kg × § a kg, rounded once. */
export function reagentCost(d: PlateDef, g: number): number {
  return reagentCostOf(d.reagents, g);
}

/** The same for a list of reagents (a hall's recipe). */
export function reagentCostOf(reagents: readonly (readonly [string, number, number])[], g: number): number {
  let a = 0;
  for (const r of reagents) a += r[1] * (g / 1000) * r[2];
  return roundMoney(a);
}

const trayFull = (x: Ctx, id: string, w: WorksState): boolean => {
  const d = plateDef(x.c, id)!;
  return d.feedBy === 'hands' && sumStock(w.tray_g) - sumStock(w.trayClaim_g) >= d.tray * 1000;
};

/** An idle running plate takes its next hopper piece (unless its tray is full, or the cash cannot pay the piece's reagents). */
export function startPlate(x: Ctx, id: string, w: WorksState, t: number): void {
  if (!running(w) || w.work) return;
  const d = plateDef(x.c, id)!;
  if (!w.hopper.length) return setStatus(x, id, w, 'idle', t);
  if (trayFull(x, id, w)) return setStatus(x, id, w, 'trayFull', t);
  const piece = w.hopper[0];
  const cost = reagentCost(d, piece.g);
  if (cost > 0 && x.cash < cost) return setStatus(x, id, w, 'waiting', t);
  w.hopper.shift();
  if (cost > 0) spend(x, cost);
  w.work = { piece, startAt: t, rate_kg_s: plateRate(x, id, w, piece), credited: {}, base_g: 0 };
  setStatus(x, id, w, w.work.rate_kg_s > 0 ? 'working' : 'waiting', t);
}

/** The piece in work ends at (null when the rate is 0 or nothing works). */
export function pieceEndsAt(w: Pick<WorksState, 'work'>): number | null {
  const k = w.work;
  if (!k || k.rate_kg_s <= 0) return null;
  return k.startAt + (k.piece.g - (k.base_g ?? 0)) / (k.rate_kg_s * 1000);
}

function processedG(w: WorksState, t: number): number {
  const k = w.work!;
  return Math.min(k.piece.g, (k.base_g ?? 0) + Math.max(0, t - k.startAt) * k.rate_kg_s * 1000);
}

/** Where a credited output goes: a hands-fed plate's tray; a bay-fed plate's bays (its belt weigher); the stream to the eddy current's outputs (while it runs). */
function deliver(x: Ctx, id: string, w: WorksState, to: string, add: number): void {
  const d = plateDef(x.c, id)!;
  if (to === 'stream') {
    const credited = w.work!.credited;
    const S = credited.stream ?? 0;
    const eddy = d.feeds?.stream;
    const e = eddy ? x.s.works[eddy] : undefined;
    if (!eddy || !running(e)) return;
    for (const [g2, sh2] of plateOut(x.c, eddy, 'stream')) {
      if (g2 === 'stream') continue;
      const key = `>${g2}`;
      const target = Math.floor(sh2 * S + 1e-6);
      const a2 = target - (credited[key] ?? 0);
      if (a2 > 0) credited[key] = (credited[key] ?? 0) + a2;
    }
    void add;
    return;
  }
  // A bay-fed plate's credited grams stay on its belt (work.credited) and land in their bays when the piece is
  // done (finishPlatePiece): a bay changes only at an instant of the queue, so a tick equals a jump (the bays'
  // first-stock numbering, the round's lots) however the clock is cut.
  if (d.feedBy === 'hands') w.tray_g[to] = (w.tray_g[to] ?? 0) + add;
}

/** Credit a plate's piece to yard second t by the cumulative rule (nothing at a rate of 0). */
export function creditPlate(x: Ctx, id: string, w: WorksState, t: number): void {
  const k = w.work;
  if (!k) return;
  const d = plateDef(x.c, id);
  if (!d) return;
  const key = plateKey(d, k.piece) ?? k.piece.grade;
  const done = processedG(w, t);
  for (const [to, share] of plateOut(x.c, id, key)) {
    const target = Math.floor(share * done + 1e-6);
    const add = target - (k.credited[to] ?? 0);
    if (add > 0) {
      k.credited[to] = (k.credited[to] ?? 0) + add;
      deliver(x, id, w, to, add);
    }
  }
}

/** The piece in work is done at t: the exact remainder credited, the rest waste; the next piece starts (a bay-fed plate draws at the tail). */
function finishPlatePiece(x: Ctx, id: string, w: WorksState, t: number): void {
  const k = w.work;
  if (!k) return;
  const d = plateDef(x.c, id)!;
  const key = plateKey(d, k.piece) ?? k.piece.grade;
  creditPlate(x, id, w, t);
  let outSum = 0;
  const toBays = d.feedBy !== 'hands';
  for (const [to, share] of plateOut(x.c, id, key)) {
    const total = Math.floor(share * k.piece.g + 1e-6);
    const add = total - (k.credited[to] ?? 0);
    if (add > 0) {
      k.credited[to] = total;
      deliver(x, id, w, to, add);
    }
    if (to !== 'stream') {
      outSum += total;
      if (toBays && total > 0) bayOf(x, to).g += total;
      if (total > 0) {
        count(x, `made:${to}`);
        if (heard(x)) x.ev.push({ type: 'plateOut', plate: id, grade: to, g: total });
      }
    }
  }
  // The stream's own outputs (the eddy current's, credited on the belt as the stream was credited) land too.
  for (const kk in k.credited) if (kk.startsWith('>') && k.credited[kk] > 0) {
    const g2 = kk.slice(1);
    outSum += k.credited[kk];
    bayOf(x, g2).g += k.credited[kk];
    count(x, `made:${g2}`);
    if (heard(x)) x.ev.push({ type: 'plateOut', plate: d.feeds?.stream ?? id, grade: g2, g: k.credited[kk] });
  }
  x.s.waste_g += k.piece.g - outSum;
  w.work = null;
  count(x, `worked:${id}`);
  if (d.feedBy !== 'hands') numberBays(x);
  startPlate(x, id, w, t);
}

/** A level or a route changed at t: credit to t and restart the piece's segment at the new rate. */
export function reratePlate(x: Ctx, id: string, w: WorksState, t: number): void {
  if (!w.work) return startPlate(x, id, w, t);
  const r = plateRate(x, id, w, w.work.piece);
  if (Math.abs(r - w.work.rate_kg_s) < 1e-12) return;
  creditPlate(x, id, w, t);
  w.work.base_g = processedG(w, t);
  w.work.startAt = t;
  w.work.rate_kg_s = r;
}

// ---------------------------------------------------------------------------------------- routes (2.7.1)

/** What a kilogram of `grade` gains at p̄ in a plate (its out at usual prices, the stream at the eddy current's while it runs, less reagents, less the input). */
export function plateMargin(x: Ctx, id: string, grade: string): number {
  const d = plateDef(x.c, id);
  if (!d) return -Infinity;
  let out = 0;
  let reag = 0;
  if (d.kind === 'batch') {
    const rec = d.recipes?.[x.s.works[id]?.heat?.recipe ?? ''];
    if (!rec || !rec.in.includes(grade)) return -Infinity;
    for (const [g, sh] of rec.out) out += sh * (x.c.grades[g]?.pbar ?? 0);
    for (const r of rec.reagents) reag += r[1] * r[2];
  } else {
    if (!d.in.includes(grade)) return -Infinity;
    for (const [to, sh] of plateOut(x.c, id, grade)) {
      if (to !== 'stream') out += sh * (x.c.grades[to]?.pbar ?? 0);
      else {
        const eddy = d.feeds?.stream;
        if (eddy && running(x.s.works[eddy])) for (const [g2, sh2] of plateOut(x.c, eddy, 'stream')) out += sh * sh2 * (x.c.grades[g2]?.pbar ?? 0);
      }
    }
    for (const r of d.reagents) reag += r[1] * r[2];
  }
  return out - reag - (x.c.grades[grade]?.pbar ?? 0);
}

/** Does this station take this grade at all (its inputs; a hall's current recipe; the crucible's recipe)? */
export function takesGrade(x: Ctx, id: string, grade: string): boolean {
  if (id === 'crucible') {
    const rec = x.c.machines.crucible.recipes[x.s.machines.crucible.recipe];
    return !!rec && (Array.isArray(rec[0]) ? (rec[0] as string[]).includes(grade) : rec[0] === grade);
  }
  const d = plateDef(x.c, id);
  if (!d) return false;
  if (d.kind === 'batch') return !!d.recipes?.[x.s.works[id]?.heat?.recipe ?? '']?.in.includes(grade);
  return (d.kind === 'rate' && d.feedBy !== 'stream') && d.in.includes(grade);
}

/**
 * Where a grade goes (2.7.1): the route set on its bay card while its station still runs (or 'bay'); else
 * the running plate that gains most a kilogram on it (I's allocation, E2; ties in content order; a hall only
 * with Take from bays on); else null (no plate takes it: the first yard's own, the crucible's Take from bays).
 */
export function routeOf(x: Ctx, grade: string): StationId | 'bay' | null {
  const set = x.s.routes[grade];
  if (set === 'bay') return 'bay';
  if (set !== undefined) {
    if (set === 'crucible' ? x.s.machines.crucible.owned : running(x.s.works[set])) return set;
  }
  let best: string | null = null;
  let bm = -Infinity;
  const ws = x.s.works;
  for (const id of plateIds(x)) {
    const w = ws[id];
    if (!running(w) || !takesGrade(x, id, grade)) continue;
    if (w.heat && !w.heat.fromBays) continue;
    const m = plateMargin(x, id, grade);
    if (m > bm + 1e-12) {
      bm = m;
      best = id;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------------------- yard hands at the plates

function handV(x: Ctx, m: CrewMember): number {
  const h = x.c.crew.hand;
  return h.v * (1 + h.lev * Math.max(0, m.level - 1)) * boostFactor(x, x.s.t);
}

/** A yard hand's leg (as crew.ts's own: the same speed, handling and event). */
export function handLeg(x: Ctx, m: CrewMember, job: CrewMember['job'], phase: CrewMember['phase'], to: Spot, t: number, fromXY?: { x: number; y: number }): void {
  const from = fromXY ?? spotPos(x.c, m.to, x.s.things, x.s.truck);
  const dest = spotPos(x.c, to, x.s.things, x.s.truck);
  const dur = legM(x.c, from, dest) / handV(x, m) + x.c.crew.hand.handle_s;
  m.job = job;
  m.phase = phase;
  m.from = { xy: [from.x, from.y] };
  m.to = to;
  m.t0 = t;
  m.t1 = t + Math.max(1e-3, dur);
  x.ev.push({ type: 'crewLeg', id: m.id, job, from: m.from, to, t0: m.t0, t1: m.t1 });
}

export function handIdle(m: CrewMember, t: number, at: { x: number; y: number }): void {
  m.job = 'idle';
  m.phase = 'wait';
  m.from = { xy: [at.x, at.y] };
  m.to = { xy: [at.x, at.y] };
  m.t0 = t;
  m.t1 = t;
  m.carries = null;
  delete m.dest;
}

/** Where a ground piece waits for a yard hand (crew.ts waitsAt's rule): a circle, the drop-off, the floor, or beside a thing standing there. */
function waitsFor(x: Ctx, p: GroundPiece): number {
  if (p.pile.startsWith('circle.')) return 0;
  if (p.pile === 'dropoff') return 1;
  if (p.pile === 'floor') return 2;
  if (p.pile.startsWith('beside.')) {
    const at = thingOf(x, p.pile.slice(7))?.at.at;
    if (at === 'dropoff') return 1;
    if (at === 'floor') return 2;
  }
  return -1;
}

/** Best value first while they fit (crew.ts choose's order: value a kilogram, then heavier, then uid). */
function chooseFit(x: Ctx, ps: GroundPiece[], room: number): GroundPiece[] {
  const sorted = ps.slice().sort((a, b) => vpk(x.c, b.grade) - vpk(x.c, a.grade) || b.g - a.g || (a.uid < b.uid ? -1 : 1));
  const out: GroundPiece[] = [];
  for (const p of sorted) {
    if (p.g > room) continue;
    out.push(p);
    room -= p.g;
  }
  return out;
}

/**
 * A yard hand the first yard's order left idle feeds a hands-fed plate (2.5.3: the plates after the first
 * yard's machines, in slot order): its input lying free in a circle, at the drop-off or on the floor, one
 * pile a trip (the first by that order), best value first within his load and the hopper's room.
 */
function handToPlate(x: Ctx, m: CrewMember, t: number): boolean {
  const cap = x.c.crew.hand.load * 1000;
  for (const id of plateIds(x)) {
    const w = x.s.works[id];
    const d = plateDef(x.c, id)!;
    if (!running(w) || d.kind !== 'rate' || d.feedBy !== 'hands') continue;
    const room = plateRoom(x, id, w);
    if (room <= 0) continue;
    let pile: string | null = null;
    let order = Infinity;
    for (const p of x.s.pieces) {
      if (p.claim || p.g > room) continue;
      const o = waitsFor(x, p);
      if (o < 0 || o >= order || !plateAccepts(x, id, p)) continue;
      order = o;
      pile = p.pile;
    }
    if (pile === null) continue;
    const src = x.s.pieces.filter((p) => p.pile === pile && !p.claim && plateAccepts(x, id, p));
    const pick = chooseFit(x, src, Math.min(cap, room));
    if (!pick.length) continue;
    for (const p of pick) p.claim = m.id;
    m.claims = pick.map((p) => p.uid);
    m.cut = null;
    handLeg(x, m, 'feed', 'walkTo', { pile, k: pick[0].k }, t);
    m.dest = id;
    return true;
  }
  return false;
}

/** The plate's own tray claims of a trip (`tray.<plate>.<grade>.<g>`), or null. */
function plateTrayOf(x: Ctx, claim: string | undefined): string | null {
  if (!claim || !claim.startsWith('tray.')) return null;
  const id = claim.split('.')[1];
  return id in x.s.machines ? null : id;
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
  void t;
  // The forklift (2.9): parked on its bay, nobody in it, empty. The three-axle hook-lift opens the bridge partners
  // through openPartners (their `opens`), the pallet truck is a carrier and the plasma cutter a tool (rate.ts own).
  if (item === 'forklift' && !x.s.forklift) {
    const p = spotPos(x.c, { place: 'forklift' }, x.s.things, x.s.truck);
    x.s.forklift = { x: p.x, y: p.y, heading: 0, by: null, load: [] };
  }
}

/**
 * THE ONE WAY A PLATE IS ORDERED (2.6.3, 2.14.3; s2a-fix, the critic's findings 2 and 10): `actions.ts buy` of
 * a shop item of kind 'works' and `signFinance` both call it after the money is taken. A plate's arrival is
 * `works[plate] = {phase 'arriving', commissionAt: t + deliver_s, ...}`, dated ONLY by worksDated (queue kind
 * `commission`, whose first event is the flatbed setting it down: phase 'installed', commissionAt = that
 * instant + works.selfCommission_s); `s.arriving` never holds a plate's key. A plate already ordered is not
 * ordered again.
 */
export function orderPlate(x: Ctx, plate: string, t: number): void {
  const d = plateDef(x.c, plate);
  if (!d || x.s.works[plate]) return;
  x.s.works[plate] = freshWorks(x, plate, d, t);
  x.dirty = true;
  if (heard(x)) x.ev.push({ type: 'plateState', plate, status: 'arriving' });
}

/**
 * The boss's stage-2 acts START (hand.ts bossStep, after the scale, the hopper zones and the chalk circles, before
 * racking and pickup): true when one began (the step ends). A hall's first heat at "Ready to pour" pours when he
 * comes within machines.crucible.first_wait_m of its plot (S11; this is no act and the step goes on). Standing
 * still within reach.place of an installed plate's plot starts the act `commission` (works.commission_s).
 * Racking, an oversize piece and the picking table are wave 2's (reuse.ts, lots.ts, crate.ts).
 */
export function worksAct(x: Ctx, t: number): boolean {
  if (x.s.counts!.bathSet === undefined) return false;
  // Wave 2: the picking table and an oversize piece (crate.ts, lots.ts), before the plates.
  if (crateAct(x, t) || lotAct(x, t)) return true;
  const ws = x.s.works;
  let any = false;
  for (const _ in ws) {
    any = true;
    break;
  }
  if (!any) return false;
  hallCheckReady(x, t);
  const p = x.s.presence;
  if (p.moving) return false;
  const reach = x.c.reach.place;
  for (const id of plateIds(x)) {
    const w = ws[id];
    if (!w || w.phase !== 'installed') continue;
    const d = plateDef(x.c, id)!;
    if (!nearPlace(x.c, d.plot, p.x, p.y, reach)) continue;
    x.s.act = { kind: 'commission', target: id, since: t, endsAt: t + (x.c.works?.commission_s ?? 0) };
    return true;
  }
  return false;
}

/** A stage-2 act IN PROGRESS still holds at t (hand.ts bossStep: false cancels it): commissioning while he stands still at the installed plate. */
export function worksActHolds(x: Ctx, kind: WorksActKind, t: number): boolean {
  if (kind === 'rack') return rackActHolds(x, t);
  if (kind === 'lot') return lotActHolds(x, t);
  if (kind === 'crate') return crateActHolds(x, t);
  const id = x.s.act.target;
  const w = id ? x.s.works[id] : undefined;
  const d = id ? plateDef(x.c, id) : undefined;
  if (!w || !d || w.phase !== 'installed') return false;
  const p = x.s.presence;
  return !p.moving && nearPlace(x.c, d.plot, p.x, p.y, x.c.reach.place);
}

/** A stage-2 act ENDS at t (hand.ts bossActEnd): commissioning starts the plate up, by the boss. */
export function worksActEnd(x: Ctx, kind: WorksActKind, t: number): void {
  if (kind === 'rack') return rackActEnd(x, t);
  if (kind === 'lot') return lotActEnd(x, t);
  if (kind === 'crate') return crateActEnd(x, t);
  if (kind !== 'commission') return;
  const id = x.s.act.target;
  if (id) commission(x, id, 'boss', t);
}

/**
 * A crew member's ordinary leg ends at t (crew.ts crewLegEnd, BEFORE the first yard's handLegEnd and
 * cutterLegEnd): true when the works took it. A yard hand's trip to a plate (dest a plate id): at its pick he
 * takes what he claimed and walks to the plate's plot; at the plot what the hopper takes goes in, the rest goes on
 * to the platform scale as the first yard's feed does. A plate's tray trip: at its pick he takes the claimed
 * grams; the walk to the scale and the weigh-in are the first yard's.
 */
export function worksLegEnd(x: Ctx, m: CrewMember, t: number): boolean {
  if (m.role !== 'hand') return false;
  // Wave 2 (2.12): a yard hand's trip to the Yard sale (reuse.ts rackChoice set him off).
  if (m.job === 'rack') {
    rackLegEnd(x, m, t);
    return true;
  }
  const dest = m.dest;
  const toPlate = !!dest && dest !== 'scale' && !(dest in x.s.machines) && !!x.s.works[dest];
  const trayPlate = m.phase === 'walkTo' ? plateTrayOf(x, m.claims[0]) : null;
  if (!toPlate && !trayPlate) return false;
  const at = spotPos(x.c, m.to, x.s.things, x.s.truck);
  if (m.phase === 'walkTo') {
    const load = pickPlateClaims(x, m, t);
    m.claims = [];
    m.load = load;
    m.carries = load[0]?.grade ?? null;
    if (!load.length) {
      handIdle(m, t, at);
      return true;
    }
    const to: Spot = toPlate ? { place: plateDef(x.c, dest!)!.plot } : { place: 'scale' };
    handLeg(x, m, m.job, 'walkBack', to, t, at);
    return true;
  }
  if (m.phase === 'walkBack' && toPlate) {
    const left: Piece[] = [];
    for (const p of m.load) {
      if (plateAccepts(x, dest!, p)) feedPlate(x, dest!, p, t);
      else left.push(p);
    }
    m.load = left;
    if (left.length) {
      // A hopper full on arrival takes what fits; the rest goes on to the platform (the first yard's walk and weigh-in).
      m.carries = left[0].grade;
      m.dest = 'scale';
      handLeg(x, m, m.job, 'walkBack', { place: 'scale' }, t, at);
      return true;
    }
    handIdle(m, t, at);
    return true;
  }
  return false;
}

/** What a yard hand claimed for a plate trip, picked up now: ground pieces in his claims' order, or a plate's tray grams. */
function pickPlateClaims(x: Ctx, m: CrewMember, t: number): Piece[] {
  const s = x.s;
  const load: Piece[] = [];
  for (const c of m.claims) {
    const id = plateTrayOf(x, c);
    if (id) {
      const [, , grade, gs] = c.split('.');
      const w = s.works[id];
      if (!w) continue;
      const want = Number(gs) || 0;
      w.trayClaim_g[grade] = Math.max(0, (w.trayClaim_g[grade] ?? 0) - want);
      if (!w.trayClaim_g[grade]) delete w.trayClaim_g[grade];
      const take = Math.min(w.tray_g[grade] ?? 0, want);
      if (take > 0) {
        w.tray_g[grade] -= take;
        if (!w.tray_g[grade]) delete w.tray_g[grade];
        const n = (s.counts![`tray:${id}`] ?? 0) + 1;
        s.counts![`tray:${id}`] = n;
        load.push({ uid: `${id}.t${n}`, grade, g: take, from: id, spec: -1 });
      }
      if (w.status === 'trayFull') startPlate(x, id, w, t);
      continue;
    }
    const gp = s.pieces.find((q) => q.uid === c && q.claim === m.id);
    if (!gp) continue;
    const p = takeFromPile(x, gp.uid);
    if (p) load.push(p);
  }
  if (heard(x)) for (const p of load) x.ev.push({ type: 'pickup', piece: p.uid, grade: p.grade, g: p.g, by: m.id });
  return load;
}

/**
 * The stations whose out trays a yard hand empties, in his order (crew.ts handDepart step 3, 2.5.3, S12): the
 * first yard's list as it is, then the running hands-fed plates with free tray grams, fullest first (ties in
 * content order). The first yard's list itself while no plate holds tray grams (no allocation).
 */
export function stationTrays(x: Ctx, base: readonly MachineId[]): readonly StationId[] {
  let out: { id: string; g: number }[] | null = null;
  for (const id in x.s.works) {
    const w = x.s.works[id];
    if (!running(w)) continue;
    const g = sumStock(w.tray_g) - sumStock(w.trayClaim_g);
    if (g <= 0) continue;
    (out ??= []).push({ id, g });
  }
  if (!out) return base;
  const order = plateIds(x);
  out.sort((a, b) => b.g - a.g || order.indexOf(a.id) - order.indexOf(b.id));
  return [...base, ...out.map((o) => o.id)];
}

/** A yard hand sets off for a plate's tray (crew.ts handDepart step 3): he claims its free grams up to his load, dearest grade first, and walks there; the scale is the first yard's. */
export function worksTrayTrip(x: Ctx, m: CrewMember, t: number, plate: StationId): boolean {
  const w = x.s.works[plate];
  const d = plateDef(x.c, plate);
  if (!w || !d || !running(w)) return false;
  let left = x.c.crew.hand.load * 1000;
  const claims: string[] = [];
  for (const grade of Object.keys(w.tray_g).sort((a, b) => (x.c.grades[b]?.pbar ?? 0) - (x.c.grades[a]?.pbar ?? 0) || (a < b ? -1 : 1))) {
    const avail = (w.tray_g[grade] ?? 0) - (w.trayClaim_g[grade] ?? 0);
    const take = Math.min(avail, left);
    if (take <= 0) continue;
    w.trayClaim_g[grade] = (w.trayClaim_g[grade] ?? 0) + take;
    claims.push(`tray.${plate}.${grade}.${take}`);
    left -= take;
  }
  if (!claims.length) return false;
  m.claims = claims;
  m.cut = null;
  handLeg(x, m, 'tray', 'walkTo', { place: d.plot }, t);
  m.dest = 'scale';
  return true;
}

// ---------------------------------------------------------------------------------------- the magnet crane (2.7)

/** May the crane lift this grade or thing (crane.never by material, crane.neverObjects by object)? */
function craneMayLift(x: Ctx, grade: string, obj?: string): boolean {
  const k = x.c.crane;
  if (!k) return false;
  if (obj && k.neverObjects.includes(obj)) return false;
  const mat = x.c.grades[grade]?.material;
  return !(mat && k.never.includes(mat));
}

/** The crane's next move (one dated move at a time): the first served plate in content order with room, from the tipping floor, best value first within crane.load_kg and the hopper's room. */
function craneDepart(x: Ctx, id: string, w: WorksState, t: number): void {
  const k = x.c.crane;
  const d = plateDef(x.c, id)!;
  if (!k || placeGap(x.c, d.plot, 'floor') > k.reach_m) return;
  for (const to of plateIds(x)) {
    const tw = x.s.works[to];
    const td = plateDef(x.c, to)!;
    if (!running(tw) || td.kind !== 'rate' || td.feedBy !== 'hands' || placeGap(x.c, d.plot, td.plot) > k.reach_m) continue;
    let room = Math.min(k.load_kg * 1000, plateRoom(x, to, tw));
    if (room <= 0) continue;
    const items: string[] = [];
    let g = 0;
    // Whole things on the floor first (the shear's beams and tanks), then loose pieces on the floor.
    const things = x.s.things
      .filter((th) => th.at.at === 'floor' && !th.by && !th.shell && th.cut === 0 && x.c.objects[th.obj]?.whole)
      .map((th) => ({ th, o: x.c.objects[th.obj] }))
      .filter(({ th, o }) => craneMayLift(x, o.whole!, th.obj) && plateAccepts(x, to, { grade: o.whole!, whole: th.obj, g: o.gross_g }))
      .sort((a, b) => b.o.gross_g - a.o.gross_g || (a.th.uid < b.th.uid ? -1 : 1));
    for (const { th, o } of things) {
      if (o.gross_g > room) continue;
      th.by = `crane.${id}`;
      items.push(th.uid);
      g += o.gross_g;
      room -= o.gross_g;
    }
    const ps = x.s.pieces.filter((p) => !p.claim && waitsFor(x, p) === 2 && craneMayLift(x, p.grade, p.whole) && plateAccepts(x, to, p));
    for (const p of chooseFit(x, ps, room)) {
      p.claim = `crane.${id}`;
      items.push(p.uid);
      g += p.g;
      room -= p.g;
    }
    if (!items.length) continue;
    const rate = k.rate * (1 + d.lev * Math.max(0, w.level - 1));
    w.move = { items, g, from: 'floor', to, t0: t, end: t + Math.max(1e-3, g / 1000 / rate) };
    return;
  }
}

/** The crane's move lands at t: what it holds goes into the hopper; what no longer fits is set down on the floor again (nothing lost). */
function craneLand(x: Ctx, id: string, w: WorksState, t: number): void {
  const mv = w.move;
  if (!mv) return;
  w.move = null;
  const by = `crane.${id}`;
  for (const uid of mv.items) {
    let p: Piece | null = null;
    const gp = x.s.pieces.find((q) => q.uid === uid && q.claim === by);
    if (gp) p = takeFromPile(x, uid);
    else {
      const th = thingOf(x, uid);
      if (th && th.by === by) {
        const o = x.c.objects[th.obj];
        thingGone(x, th, by, t, true);
        p = { uid: th.uid, grade: o.whole!, g: o.gross_g, from: null, spec: -1, whole: th.obj };
      }
    }
    if (!p) continue;
    if (mv.to !== 'bay' && plateAccepts(x, mv.to, p)) feedPlate(x, mv.to, p, t);
    else dropOnPile(x, p, 'floor');
  }
}

/**
 * A load that is not a skip lands (truck.ts tipNow, before the floor: 2.9's flatrack to the car pad, the
 * closed battery box to the lead line's box): true when the works landed it (tipNow then ends the trip as for
 * a tipped skip: no floor slot is taken). Stub: never (every load is a skip). Phase B also owns the trip's
 * route to that place (truck.ts planTrip, replayTrip and driverLegEnd go weighbridge -> floor -> park
 * today): a request to engine2.
 */
export function landBody(x: Ctx, skip: CarriedSkip, t: number): boolean {
  const objs = Object.keys(skip.contents);
  if (!objs.length) return false;
  const by = (o: string): string => x.c.objects[o]?.arrives ?? 'tip';
  if (objs.every((o) => by(o) === 'pad')) {
    // The flatrack (T1, ruling 13.4): the car is set down on the car pad, never tipped (one car at a time: the
    // partners' rotation sends a car only while none waits, partners.ts grownContents).
    for (const [obj, n] of Object.entries(skip.contents))
      for (let i = 0; i < n; i++) {
        const k = (x.s.counts!.floorThings ?? 0) + 1;
        x.s.counts!.floorThings = k;
        x.s.things.push({ uid: `f${k}`, obj, at: { at: 'elvPad', k: 0 }, cut: 0, progress: 0, by: null });
      }
    x.dirty = true;
    return true;
  }
  if (objs.every((o) => by(o) === 'batteryBox')) {
    // The closed battery box (T1): set down unopened, weighed as one weigh-in, the batteries whole into their bay.
    const pieces: Piece[] = [];
    for (const [obj, n] of Object.entries(skip.contents)) {
      const o = x.c.objects[obj];
      if (!o) continue;
      for (let i = 0; i < n; i++) {
        const k = (x.s.counts!.floorThings ?? 0) + 1;
        x.s.counts!.floorThings = k;
        pieces.push({ uid: `f${k}`, grade: o.whole ?? o.pieces[0][0], g: o.gross_g, from: null, spec: -1, whole: obj });
      }
    }
    weighIn(x, pieces, x.s.truck.by === 'boss' ? 'boss' : (x.s.crew.find((m) => m.role === 'driver')?.id ?? 'driver'), t);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------- the depollution bay (2.7, 2.9; wave 2)

/** A station plate (the depollution bay) starts draining the car the forklift set on its apron: depollution.s ÷ the level factor. */
export function carStart(x: Ctx, id: string, w: WorksState, t: number): void {
  const th = x.s.things.find((q) => q.at.at === 'apron' && q.at.plate === id && !q.by);
  if (!th) return;
  const d = plateDef(x.c, id)!;
  const s = (x.c.depollution?.s ?? 0) / (1 + d.lev * Math.max(0, w.level - 1));
  th.by = id;
  w.car = { thing: th.uid, t0: t, end: t + Math.max(1e-3, s) };
  setStatus(x, id, w, 'working', t);
}

/**
 * The car is drained at t (event `depolluted`): its pieces (the battery, the wheels, the loom, the converter) and its
 * drained shell go WHOLE into their bays (the object's own yield, the one definition of a car's yield), its fluids
 * and tyres to the licensed waste carrier. Mass kept: pieces + shell + waste = the car.
 */
function carDrained(x: Ctx, id: string, w: WorksState, t: number): void {
  const car = w.car!;
  w.car = null;
  const th = x.s.things.find((q) => q.uid === car.thing);
  if (th) {
    const o = x.c.objects[th.obj];
    x.s.things.splice(x.s.things.indexOf(th), 1);
    if (o) {
      for (const sp of o.pieces) {
        const b = bayOf(x, sp[0]);
        b.g += sp[1] * sp[2];
        if (x.c.wholeUnits_kg[sp[0]] !== undefined) b.n += sp[2];
      }
      if (o.shell) bayOf(x, o.shell.grade).g += o.shell.g;
      x.s.waste_g += o.waste_g;
      numberBays(x);
    }
    count(x, `worked:${id}`);
    count(x, 'depolluted');
    x.ev.push({ type: 'depolluted', thing: car.thing, plate: id });
  }
  setStatus(x, id, w, 'idle', t);
  carStart(x, id, w, t);
}
