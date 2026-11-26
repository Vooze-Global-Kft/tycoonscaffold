/**
 * Crew as agents on legs (yard-stage1.md 2.6, 2.12, E17, S12, E4): each leg is chosen when it starts and
 * ends at a time computed then; the crew member the player sees walking IS that leg. Yard hands carry by
 * S12's priority and claim at departure; cutters cut at the drop-off, then on the tipping floor, never
 * what the boss works; the driver is truck.ts's. Owner: rules-sim.
 */
import { boostFactor, bossFresh, heard, type Ctx } from './clock';
import { cutTime, legM, machineInputs, machineShares, tierOf, machinePlace, pieceCount, pieceSpec, sumStock, toolP, vpk } from './content';
import { meltPiece } from './crucible';
import { bossSees, groupCfg, grouping, planAhead, RUN_EPS, RUN_MAX } from './group';
import { accepts, atPlace, defOf, feedPiece, hopperRoom, inputSet, start as startMachine, takeTray, trayFree } from './machines';
import { rackChoice } from './reuse';
import { stationTrays, worksLegEnd, worksTrayTrip } from './works';
import { piecePos, pointOf, spotPos, thingPos } from './positions';
import { weighIn } from './scales';
import { countOf, cutOff, dropAllOnPile, dropOnPile, floorMass_g, remainingG, specAt, thingGone, thingOf, dropoffCount } from './things';
import type { CrewJob, CrewMember, CrewPhase, GroundPiece, MachineId, Piece, RunCourse, RunCut, RunKind, RunLoad, Spot, ThingState } from './types';

const RATE_FED: Exclude<MachineId, 'crucible'>[] = ['stripper', 'bench'];
function posOf(x: Ctx, spot: Spot): { x: number; y: number } {
  return spotPos(x.c, spot, x.s.things, x.s.truck);
}

function handV(x: Ctx, m: CrewMember): number {
  const h = x.c.crew.hand;
  return h.v * (1 + h.lev * Math.max(0, m.level - 1)) * boostFactor(x, x.s.t);
}

function leg(x: Ctx, m: CrewMember, job: CrewJob, phase: CrewPhase, to: Spot, t: number, extra: number, fromXY?: { x: number; y: number }): void {
  const from = fromXY ?? posOf(x, m.to);
  const dest = posOf(x, to);
  const dur = legM(x.c, from, dest) / handV(x, m) + extra;
  m.job = job;
  m.phase = phase;
  m.from = { xy: [from.x, from.y] };
  m.to = to;
  m.t0 = t;
  m.t1 = t + Math.max(1e-3, dur);
  x.ev.push({ type: 'crewLeg', id: m.id, job, from: m.from, to, t0: m.t0, t1: m.t1 });
}

function idle(m: CrewMember, t: number, at: { x: number; y: number }): void {
  m.job = 'idle';
  m.phase = 'wait';
  m.from = { xy: [at.x, at.y] };
  m.to = { xy: [at.x, at.y] };
  m.t0 = t;
  m.t1 = t;
  m.carries = null;
}

/** The office's door: the middle of its south face (content map.places.office), where the crew come out. */
export function officeDoor(x: Ctx): { x: number; y: number } {
  const o = pointOf(x.c, 'office');
  return { x: o.x, y: o.y + (x.c.map.places.office?.d ?? 0) / 2 + 0.3 };
}

/**
 * A new crew member walks out of the office's door (2.6). Finding P11: a yard hand SETS OUT at once, on
 * the tick he is hired, to the nearest waiting work (he no longer stands idle until the next event).
 */
export function newCrew(x: Ctx, role: CrewMember['role'], t: number): CrewMember {
  const slot = x.s.crew.filter((m) => m.role === role).length;
  const door = officeDoor(x);
  const m: CrewMember = { id: `${role}.${slot}`, role, slot, name: x.s.crew.length, level: 1, job: 'idle', phase: 'wait', from: { place: 'office' }, to: { xy: [door.x, door.y] }, t0: t, t1: t, carries: null, load: [], claims: [], cut: null };
  x.s.crew.push(m);
  x.s.crew.sort((a, b) => (a.id < b.id ? -1 : 1));
  if (role === 'hand') offer(x, m, t, departHand);
  else if (role === 'cutter') offer(x, m, t, cutterDepart);
  return m;
}

// ---------------------------------------------------------------------------------------- yard hands

const pileOrder = (p: GroundPiece) => (p.pile.startsWith('circle.') ? 0 : p.pile === 'dropoff' ? 1 : p.pile === 'floor' ? 2 : 3);

/**
 * Pick from a set of pieces best first while they fit `room` grams (byValue's order: value per kilogram,
 * then heavier, then uid). Without sorting them all: walking the sorted list and taking each piece that
 * still fits is the same as taking, again and again, the best remaining piece that fits (a piece too heavy
 * for the room left stays too heavy: the room only shrinks), so the result and its order are the same.
 */
function choose(x: Ctx, pieces: GroundPiece[], room: number): GroundPiece[] {
  const out: GroundPiece[] = [];
  const n = pieces.length;
  if (!n) return out;
  const val = new Array<number>(n);
  const v = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const g = pieces[i].grade;
    let q = v.get(g);
    if (q === undefined) v.set(g, (q = vpk(x.c, g)));
    val[i] = q;
  }
  const taken = new Uint8Array(n);
  for (;;) {
    let best = -1;
    for (let i = 0; i < n; i++) {
      if (taken[i]) continue;
      const p = pieces[i];
      if (p.g > room) {
        taken[i] = 1;
        continue;
      }
      if (best < 0) {
        best = i;
        continue;
      }
      const b = pieces[best];
      const d = val[i] - val[best] || p.g - b.g;
      if (d > 0 || (d === 0 && p.uid < b.uid)) best = i;
    }
    if (best < 0) return out;
    taken[best] = 1;
    out.push(pieces[best]);
    room -= pieces[best].g;
  }
}

/**
 * The place a ground piece waits at for a yard hand: a circle, the drop-off or the floor, and (finding
 * P11) the pieces the boss left BESIDE a thing standing at the drop-off or on the floor count as that
 * place's; pieces beside a thing in a zone stay the boss's (2.6: never from the heaps). Else null.
 */
function waitsAt(x: Ctx, p: GroundPiece): 'circle' | 'dropoff' | 'floor' | null {
  if (p.pile.startsWith('circle.')) return 'circle';
  if (p.pile === 'dropoff' || p.pile === 'floor') return p.pile;
  if (p.pile.startsWith('beside.')) {
    const at = thingOf(x, p.pile.slice(7))?.at.at;
    if (at === 'dropoff' || at === 'floor') return at;
  }
  return null;
}

/** Cable (an input of the strippers): a yard hand never takes it to the scale while the boss is in the yard (finding P11). */
function isCable(x: Ctx, grade: string): boolean {
  return inputSet(x, 'hand_stripper').has(grade);
}

/**
 * owner1 (RULING-owner1 H1 to H5): the review's rules run on a content that carries `crew.hand.leaveM` (the shipped
 * content; a frozen test content without it keeps the first yard's rules bit for bit, as orderFromRung does).
 */
export function owner1Rules(c: Ctx['c']): boolean {
  return typeof (c.crew.hand as { leaveM?: unknown }).leaveM === 'number';
}

/**
 * Is the boss "in the yard" for P11 and E35? A fresh presence; with the review's rules (H4) also INSIDE THE FENCE: a
 * boss driving on the lane beyond the gate, or standing at a partner's site, is away for the yard hands.
 */
export function bossInYard(x: Ctx, t: number): boolean {
  if (!bossFresh(x, t)) return false;
  return !owner1Rules(x.c) || x.s.presence.x <= x.c.yard.width + 1e-9;
}

/**
 * H1: a cut piece lying in a heap's bed (a zone's pile, or beside a thing that stands in a zone) that a yard hand may
 * carry: the boss in the yard leaves it more than `crew.hand.leaveM` from him (pieces within that are his), and cable
 * stays the boss's while he is in the yard (P11). Only with the review's rules; never a piece of a place (waitsAt's).
 */
function heapFree(x: Ctx, p: GroundPiece, inYard: boolean, at: (uid: string) => ThingState['at'] | null): boolean {
  if (!owner1Rules(x.c)) return false;
  if (!(p.pile.startsWith('zone.') || p.pile.startsWith('beside.'))) return false;
  if (!inYard) return true;
  if (isCable(x, p.grade)) return false;
  const pp = piecePos(x.c, p.pile, p.k, at);
  return Math.hypot(pp.x - x.s.presence.x, pp.y - x.s.presence.y) > ((x.c.crew.hand as { leaveM?: number }).leaveM ?? 0) + 1e-9;
}

/** H3: the powered stripper takes a loose cable bundle (owned, with room in its hopper) while the boss is in the yard. */
function stripperTakes(x: Ctx): boolean {
  return owner1Rules(x.c) && !!x.s.machines.stripper?.owned && hopperRoom(x, 'stripper') > 0;
}

/**
 * Loose things (tier 0) waiting at a place for a yard hand, oldest uid first (cable not while the boss is in the yard).
 * Stage 2 (2.12, ruling 13.1; s2a-fix): a tagged thing the Yard sale takes is kept off (reuse.ts rackChoice
 * with the thing: true = not his to carry as scrap; the stub never keeps one off). Asked last, of a candidate.
 */
function looseAt(x: Ctx, m: CrewMember, t: number, where: 'dropoff' | 'floor', cap: number, inYard: boolean, cableOk = false): ThingState | null {
  // H3 (`cableOk`: a trip chosen by the order, not a run's next trip): a cable bundle goes to the powered stripper.
  const looseCable = (th: ThingState) => inYard && !(cableOk && stripperTakes(x)) && (pieceSpec(x.c, th.obj, th.cut) ? isCable(x, pieceSpec(x.c, th.obj, th.cut)!.grade) : false);
  return x.s.things.filter((th) => th.at.at === where && !th.by && !th.shell && (x.c.objects[th.obj]?.tier ?? 1) === 0 && (x.c.objects[th.obj]?.gross_g ?? Infinity) <= cap && !looseCable(th) && !rackChoice(x, m, t, th)).sort((a, b) => (a.uid < b.uid ? -1 : 1))[0] ?? null;
}

/** A whole workable thing at a place carried at its whole grade (E4), best whole grade first; a thing the Yard sale takes kept off (rackChoice, s2a-fix). */
function wholeAt(x: Ctx, m: CrewMember, t: number, where: 'dropoff' | 'floor', cap: number, ok?: (th: ThingState) => boolean): ThingState | null {
  const cands = x.s.things.filter((th) => th.at.at === where && !th.by && !th.shell && th.cut === 0 && x.c.objects[th.obj]?.whole && (x.c.objects[th.obj]?.gross_g ?? Infinity) <= cap && (x.c.objects[th.obj]?.tier ?? 0) > 0 && (!ok || ok(th)) && !rackChoice(x, m, t, th));
  return cands.sort((a, b) => (x.c.grades[x.c.objects[b.obj].whole!]?.pbar ?? 0) - (x.c.grades[x.c.objects[a.obj].whole!]?.pbar ?? 0) || (a.uid < b.uid ? -1 : 1))[0] ?? null;
}

/** The first yard's machines with an out tray, in a yard hand's order (handDepart step 3; works.ts stationTrays orders the stations from it). */
const OUT_TRAYS: readonly MachineId[] = ['stripper', 'hand_stripper', 'bench', 'crucible'];

/** What kind of trip the last successful handDepart chose: the kind of the run it starts (2.1, 14.1). */
type HandKind = Exclude<RunKind, { k: 'cut' }>;
let PLAN: HandKind | null = null;

/**
 * A yard hand's departure (2.12, S12's order). Returns true when he set off. Finding P11 (ruling): while
 * the boss is in the yard (a fresh presence) he carries PIECES only: cable only to a stripper that runs
 * by itself (the powered stripper's hopper), else he leaves it for the boss; a whole workable thing only
 * when every waiting place of the drop-off is taken. While the boss is away E4 stands as before (whole
 * things at their whole grade when no cutter is hired or the drop-off is full; cable to the scale).
 */
function handDepart(x: Ctx, m: CrewMember, t: number): boolean {
  const s = x.s;
  const cap = x.c.crew.hand.load * 1000;
  const inYard = bossInYard(x, t);
  const cable = inYard ? inputSet(x, 'hand_stripper') : null;
  const thAt = (uid: string) => thingOf(x, uid)?.at ?? null;
  // H1: the cut pieces in the heaps' beds he may carry (after the tipping floor in his order).
  const heap: GroundPiece[] = [];
  // Nothing anywhere to carry: stay at the stand (offered work again at every later event).
  // Only the piles a yard hand takes from count (2.6: never from the heaps; pieces beside a thing in a zone are the boss's).
  // One pass sorts the free pieces by where they wait (in their order): every list below is a filter of `free`.
  const free: GroundPiece[] = [];
  const circles: GroundPiece[] = [];
  const floor: GroundPiece[] = [];
  const drop: GroundPiece[] = [];
  let floorG = 0;
  for (const p of s.pieces) {
    if (p.claim) continue;
    const w = waitsAt(x, p);
    if (!w) {
      if (heapFree(x, p, inYard, thAt)) heap.push(p);
      continue;
    }
    free.push(p);
    if (cable && cable.has(p.grade)) continue;
    if (w === 'floor') {
      floor.push(p);
      floorG += p.g;
    } else if (w === 'dropoff') drop.push(p);
    else if (p.pile.startsWith('circle.')) circles.push(p);
  }
  let any = free.length > 0 || heap.length > 0;
  if (!any) for (const id of ['stripper', 'hand_stripper', 'bench', 'crucible'] as MachineId[]) if (trayFree(x, id) > 0) {
    any = true;
    break;
  }
  if (!any) for (const th of s.things) if (!th.by && th.at.at !== 'zone') {
    any = true;
    break;
  }
  if (!any) return false;
  // Stage 2 (2.12, ruling 13.1): a tagged thing for the Yard sale comes FIRST in a yard hand's order while a
  // place is free (reuse.ts rackChoice sets him off with it; the stub never does).
  if (rackChoice(x, m, t, null)) return true;
  // RULING2.md 17.2 (from rung crew.orderFromRung): while the floor is over half full, which machines' feeds and trays wait for it.
  const plan = orderPlan(x);
  // (1) feed: a machine with room for its input lying in a circle, at the drop-off or on the floor.
  if (feedStep(x, m, t, cap, free, plan ? (id) => plan.first(id, 'feed') : null)) return true;
  // (2) chalk circles.
  if (circles.length) {
    const pile = circles[0].pile;
    const pick = choose(x, circles.filter((p) => p.pile === pile), cap);
    if (pick.length) {
      claimPieces(m, pick);
      PLAN = { k: 'pile', pile };
      leg(x, m, 'circle', 'walkTo', { pile, k: pick[0].k }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  // (3) out trays (mass, up to his load). Stage 2 (2.5.3, S12; s2a-fix): the stations' order is works.ts
  // stationTrays' (the first yard's list itself while no plate exists); a plate's tray is worksTrayTrip's.
  if (trayStep(x, m, t, cap, plan ? (id) => plan.first(id, 'tray') : null)) return true;
  // (6) the tipping floor (E35): its pieces and its whole things that need no cutting. While more than half
  // of the floor's room is used the floor comes BEFORE the drop-off (4, 5): else a drop-off that never runs
  // dry (the public's things arriving all the absence) keeps the hands off a full floor for good and the
  // truck tips nothing more.
  const floorFirst = floorMass_g(x) > FLOOR_CLEAR_SHARE * x.c.floorRoom_kg * 1000;
  if (floorFirst && floorStep(x, m, t, cap, inYard, floorFirst, floor, floorG)) return true;
  // RULING2.md 17.2: what waited for the floor goes now, before the drop-off (the feeds, then the trays).
  if (plan) {
    if (feedStep(x, m, t, cap, free, (id) => plan.later(id, 'feed'))) return true;
    if (trayStep(x, m, t, cap, (id) => plan.later(id, 'tray'), false)) return true;
  }
  if (handDepartRest(x, m, t, cap, inYard, floorFirst, floor, floorG, drop)) return true;
  return owner1Rules(x.c) ? heapStep(x, m, t, cap, inYard, heap) : false;
}

/**
 * H1 and H2 (RULING-owner1), after everything else of his order: (H1) cut pieces in a heap's bed that the boss left
 * (heapFree), the nearest pile to him first, best pieces first; (H2) else, with the boss in the yard, a whole thing at
 * the drop-off at its whole grade when the boss is beyond `reach.sight` of it.
 */
function heapStep(x: Ctx, m: CrewMember, t: number, cap: number, inYard: boolean, heap: GroundPiece[]): boolean {
  const s = x.s;
  if (heap.length) {
    const me = posOf(x, m.to);
    const at = (uid: string) => thingOf(x, uid)?.at ?? null;
    let near = heap[0];
    let nd = Infinity;
    for (const p of heap) {
      const pp = piecePos(x.c, p.pile, p.k, at);
      const d = Math.hypot(pp.x - me.x, pp.y - me.y);
      if (d < nd || (d === nd && p.uid < near.uid)) {
        near = p;
        nd = d;
      }
    }
    const pick = choose(x, heap.filter((p) => p.pile === near.pile), cap);
    if (pick.length) {
      claimPieces(m, pick);
      PLAN = { k: 'pile', pile: near.pile };
      leg(x, m, 'dropoff', 'walkTo', { pile: near.pile, k: pick[0].k }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  if (inYard) {
    const th = wholeAt(x, m, t, 'dropoff', cap, (q) => {
      const tp = thingPos(x.c, q.at);
      return Math.hypot(tp.x - s.presence.x, tp.y - s.presence.y) > x.c.reach.sight + 1e-9;
    });
    if (th) {
      th.by = m.id;
      m.claims = [th.uid];
      PLAN = null;
      leg(x, m, 'wholeThing', 'walkTo', { thing: th.uid }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  return false;
}

/** RULING2.md 17.2's order (orderPlan): the machines whose feed and tray keep their first-yard place, and those that wait for the floor. */
interface OrderPlan {
  first: (id: MachineId, kind: 'feed' | 'tray') => boolean;
  later: (id: MachineId, kind: 'feed' | 'tray') => boolean;
}

/**
 * What a machine's work does to the worth of what it takes (RULING2.md 17.2's exception), from the content at usual
 * prices: a kilogram of its input's outputs (the bench's and the strippers' shares; the crucible's best recipe, yield
 * and dross) over the kilogram's own p̄. Memoised per content object. On the first yard's content none doubles (bench
 * 1.43, strippers 1.18, crucible 1.79): every machine waits for a floor over half full.
 */
const WORTH = new WeakMap<object, Record<string, number>>();
export function machineWorth(c: Ctx['c'], id: MachineId): number {
  let w = WORTH.get(c);
  if (!w) WORTH.set(c, (w = {}));
  if (w[id] === undefined) {
    const p = (g: string) => c.grades[g]?.pbar ?? 0;
    if (id === 'crucible') {
      let r = 0;
      for (const rec of Object.values(c.machines.crucible.recipes)) {
        const [ins, out, y, dross] = rec as unknown as [string | string[], string, number, string];
        for (const g of Array.isArray(ins) ? ins : [ins]) r = Math.max(r, (y * p(out) + (1 - y) * p(dross)) / Math.max(1e-9, p(g)));
      }
      w[id] = r;
    } else {
      const input = id === 'bench' ? 'mot' : 'cab';
      w[id] = machineShares(c, id, input).reduce((a, [g, q]) => a + q * p(g), 0) / Math.max(1e-9, p(input));
    }
  }
  return w[id];
}

/**
 * RULING2.md 17.2, from rung `crew.orderFromRung` (engine2-dispatch, measured against a second candidate: the account
 * notes/dispatch-engine2.md): WHILE THE TIPPING FLOOR IS MORE THAN HALF FULL, a yard hand clears the floor BEFORE he
 * feeds a machine or empties its tray, except a machine whose work at least doubles the worth of what it takes
 * (machineWorth, from the content at usual prices), and a tray that is full; what waited goes after the floor, before
 * the drop-off. One rule in every presence state; it chooses the first trip of a run only (14.1: the run then goes on
 * as built). Below the rung, or with the floor at most half full: null (S12 as in the first yard). Stage 2's plates
 * keep their places (their feed and tray are not yet in this order: rules-works' request of 11:10 stands).
 */
function orderPlan(x: Ctx): OrderPlan | null {
  if (x.s.ladder.rung < orderFromRung(x.c)) return null;
  if (!(floorMass_g(x) > FLOOR_CLEAR_SHARE * x.c.floorRoom_kg * 1000)) return null;
  // A FULL tray keeps its first-yard place (measured: the crucible, which a full tray does not stop, piled 3.4 t of
  // ingots in four hours behind a floor that never fell to half; a full tray is also a machine stopped).
  const full = (id: MachineId) => trayFree(x, id) >= defOf(x, id).tray * 1000 - 1e-9;
  const waits = (id: MachineId, kind: 'feed' | 'tray') => machineWorth(x.c, id) < 2 && !(kind === 'tray' && full(id));
  return { first: (id, kind) => !waits(id, kind), later: (id, kind) => waits(id, kind) };
}

/**
 * RULING2.md 16.6 (the card's reason; no words here): are the yard hands clearing the tipping floor before this
 * machine's feed and tray (17.2's order holds: the rung reached, the floor over half full, and the machine one that
 * waits for it)? A read of the state: nothing is changed.
 */
export function waitsForFloor(c: Ctx['c'], s: Ctx['s'], id: MachineId): boolean {
  if (!s.machines[id]?.owned || !s.crew.some((m) => m.role === 'hand')) return false;
  const plan = orderPlan({ c, s } as unknown as Ctx);
  return !!plan && plan.later(id, 'feed');
}

/** handDepart's (1): feed a machine with room for its input (`only`: the machines asked now; null: all). */
function feedStep(x: Ctx, m: CrewMember, t: number, cap: number, free: GroundPiece[], only: ((id: MachineId) => boolean) | null): boolean {
  const s = x.s;
  for (const id of RATE_FED) {
    const mach = s.machines[id];
    if (!mach.owned) continue;
    if (only && !only(id)) continue;
    // accepts(x, id, p) for each piece, with the machine's inputs and its hopper's room looked up once.
    const room = hopperRoom(x, id);
    const inputs = inputSet(x, id);
    let pile: string | null = null;
    let order = Infinity;
    for (const p of free) {
      if (!inputs.has(p.grade) || room < p.g) continue;
      const o = pileOrder(p);
      if (o < order) {
        order = o;
        pile = p.pile;
      }
    }
    if (pile === null) continue;
    const src: GroundPiece[] = [];
    for (const p of free) if (p.pile === pile && inputs.has(p.grade) && room >= p.g) src.push(p);
    const pick = choose(x, src, Math.min(cap, (x.c.machines as unknown as Record<string, { inbuf: number }>)[id].inbuf * 1000));
    if (!pick.length) continue;
    claimPieces(m, pick);
    m.cut = null;
    PLAN = { k: 'feed', pile, dest: id };
    leg(x, m, 'feed', 'walkTo', { pile, k: pick[0].k }, t, x.c.crew.hand.handle_s);
    m.dest = id;
    return true;
  }
  return false;
}

/**
 * handDepart's (3): an out tray (`only`: the first yard's machines asked now, null: all). A plate's tray (stage 2,
 * worksTrayTrip) keeps its place in the stations' order whatever `only` says, and is not offered again by the pass
 * after the floor (`plates` false).
 */
function trayStep(x: Ctx, m: CrewMember, t: number, cap: number, only: ((id: MachineId) => boolean) | null, plates = true): boolean {
  const s = x.s;
  for (const sid of stationTrays(x, OUT_TRAYS)) {
    if (!(sid in s.machines)) {
      if (plates && worksTrayTrip(x, m, t, sid)) return true;
      continue;
    }
    const id = sid as MachineId;
    if (only && !only(id)) continue;
    const g = trayFree(x, id);
    if (g <= 0) continue;
    const mach = s.machines[id];
    let left = cap;
    const claimed: Record<string, number> = {};
    for (const grade of Object.keys(mach.tray_g).sort((a, b) => (x.c.grades[b]?.pbar ?? 0) - (x.c.grades[a]?.pbar ?? 0))) {
      const avail = (mach.tray_g[grade] ?? 0) - (mach.trayClaim_g[grade] ?? 0);
      const take = Math.min(avail, left);
      if (take <= 0) continue;
      claimed[grade] = take;
      mach.trayClaim_g[grade] = (mach.trayClaim_g[grade] ?? 0) + take;
      left -= take;
    }
    if (!sumStock(claimed)) continue;
    m.claims = Object.entries(claimed).map(([grade, gg]) => `tray.${id}.${grade}.${gg}`);
    PLAN = { k: 'tray', id };
    leg(x, m, 'tray', 'walkTo', { pile: `tray.${id}` }, t, x.c.crew.hand.handle_s);
    m.dest = 'scale';
    return true;
  }
  return false;
}

/** handDepart's (4) to the end: the drop-off, its whole things (E4), the floor when it was not first, E4's floor things. */
function handDepartRest(x: Ctx, m: CrewMember, t: number, cap: number, inYard: boolean, floorFirst: boolean, floor: GroundPiece[], floorG: number, drop: GroundPiece[]): boolean {
  const s = x.s;
  // (4) the drop-off's pieces. Loose things (tier 0: a cable bundle, a crate of taps) are pieces to carry:
  // they go with the pieces of their place.
  if (!drop.length) {
    const looseDrop = looseAt(x, m, t, 'dropoff', cap, inYard, true);
    if (looseDrop) return takeLoose(x, m, t, looseDrop, 'dropoff');
  }
  if (drop.length) {
    // One pile a trip (the drop-off's own pile or the pieces beside one thing there): the nearest to him first.
    const me = posOf(x, m.to);
    const at = (uid: string) => thingOf(x, uid)?.at ?? null;
    let near: GroundPiece | null = null;
    let nd = Infinity;
    for (const p of drop) {
      const pp = piecePos(x.c, p.pile, p.k, at);
      const d = Math.hypot(pp.x - me.x, pp.y - me.y);
      if (near === null || d < nd || (d === nd && p.uid < near.uid)) {
        near = p;
        nd = d;
      }
    }
    const pile = near!.pile;
    const pick = choose(x, drop.filter((p) => p.pile === pile), cap);
    if (pick.length) {
      claimPieces(m, pick);
      PLAN = { k: 'pile', pile };
      leg(x, m, 'dropoff', 'walkTo', { pile, k: pick[0].k }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  // (5) a whole thing at the drop-off at its whole grade, when no cutter is hired or every place is taken (E4).
  const noCutter = !s.crew.some((c) => c.role === 'cutter');
  const full = dropoffCount(x) >= x.c.dropoff.places;
  if (inYard ? full : noCutter || full) {
    const th = wholeAt(x, m, t, 'dropoff', cap);
    if (th) {
      th.by = m.id;
      m.claims = [th.uid];
      PLAN = { k: 'whole', where: 'dropoff' };
      leg(x, m, 'wholeThing', 'walkTo', { thing: th.uid }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  if (!floorFirst && floorStep(x, m, t, cap, inYard, floorFirst, floor, floorG)) return true;
  if (!inYard && noCutter) {
    const th = wholeAt(x, m, t, 'floor', cap);
    if (th) {
      th.by = m.id;
      m.claims = [th.uid];
      PLAN = { k: 'whole', where: 'floor' };
      leg(x, m, 'wholeThing', 'walkTo', { thing: th.uid }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  return false;
}

function claimPieces(m: CrewMember, ps: GroundPiece[]): void {
  for (const p of ps) p.claim = m.id;
  m.claims = ps.map((p) => p.uid);
}

function takeLoose(x: Ctx, m: CrewMember, t: number, th: ThingState, job: CrewJob): boolean {
  th.by = m.id;
  m.claims = [`loose:${th.uid}`];
  // H3: a cable bundle goes to the powered stripper's hopper when it takes it (what does not fit goes on to the
  // scale at the hopper, handLegEnd); such a trip starts no run (a run's next loose trip goes to the scale).
  const sp = pieceSpec(x.c, th.obj, th.cut);
  const toStripper = stripperTakes(x) && !!sp && isCable(x, sp.grade);
  PLAN = toStripper ? null : { k: 'loose', where: th.at.at === 'dropoff' ? 'dropoff' : 'floor' };
  leg(x, m, job, 'walkTo', { thing: th.uid }, t, x.c.crew.hand.handle_s);
  m.dest = toStripper ? 'stripper' : 'scale';
  return true;
}

/** handDepart's (6): the tipping floor's whole things (E35), its loose things, then its pieces. */
function floorStep(x: Ctx, m: CrewMember, t: number, cap: number, inYard: boolean, floorFirst: boolean, floor: GroundPiece[], floorG: number): boolean {
  // E35: whole things that need no cutting leave the floor whenever the boss is away, and while he is in
  // the yard once more than half of the floor's room is used; the bigger waiting heap goes first.
  if (!inYard || floorFirst) {
    const trip = floorWholeTrip(x, m, t, cap);
    if (trip && trip.waiting_g >= floorG) {
      for (const th of trip.things) th.by = m.id;
      m.claims = trip.things.map((th) => `loose:${th.uid}`);
      m.cut = null;
      PLAN = { k: 'floorWhole', dest: trip.dest };
      leg(x, m, 'floor', 'walkTo', { thing: trip.things[0].uid }, t, x.c.crew.hand.handle_s);
      m.dest = trip.dest;
      return true;
    }
  }
  if (!floor.length) {
    const looseFloor = looseAt(x, m, t, 'floor', cap, inYard, true);
    if (looseFloor) return takeLoose(x, m, t, looseFloor, 'floor');
    return false;
  }
  let pile = floor[0].pile;
  for (const p of floor) if (p.pile === 'floor') {
    pile = 'floor';
    break;
  }
  const pick = choose(x, floor.filter((p) => p.pile === pile), cap);
  if (pick.length) {
    claimPieces(m, pick);
    PLAN = { k: 'pile', pile };
    leg(x, m, 'floor', 'walkTo', { pile, k: pick[0].k }, t, x.c.crew.hand.handle_s);
    m.dest = 'scale';
    return true;
  }
  return false;
}

/** The first rung of the hands' order of work of RULING2.md 17.2 (content `crew.orderFromRung`; absent: never, the first yard's S12). */
export function orderFromRung(c: Ctx['c']): number {
  const r = (c.crew as { orderFromRung?: unknown }).orderFromRung;
  return typeof r === 'number' && Number.isFinite(r) ? r : Infinity;
}

/** E35: the floor's room share above which a yard hand clears whole uncut things off it while the boss is in the yard. */
export const FLOOR_CLEAR_SHARE = 0.5;

/** Where a whole thing that needs no cutting goes from the floor (E35): motors to the bench's hopper, cable to the powered stripper's, else the scale. */
function floorWholeDest(x: Ctx, th: ThingState): MachineId | 'scale' {
  const grade = pieceSpec(x.c, th.obj, th.cut)?.grade ?? '';
  for (const id of ['bench', 'stripper'] as const) {
    if (x.s.machines[id]?.owned && inputSet(x, id).has(grade) && hopperRoom(x, id) > 0) return id;
  }
  return 'scale';
}

/** Grams still in a thing (its pieces not yet off, and its waste). */
function thingLeft_g(x: Ctx, th: ThingState): number {
  return remainingG(x.c, th.obj, th.cut);
}

/**
 * One trip of whole tier-0 things off the tipping floor (E35): the oldest such thing fixes where the trip
 * goes; more things for the same place join it while they fit his load (and the hopper's room); `waiting_g`
 * is all such things' grams (the heap the floor's pieces are weighed against). Null when none waits.
 */
function floorWholeTrip(x: Ctx, m: CrewMember, t: number, cap: number): { things: ThingState[]; dest: MachineId | 'scale'; g: number; waiting_g: number } | null {
  const cands: ThingState[] = [];
  // A thing the Yard sale takes is kept off (reuse.ts rackChoice, s2a-fix; the stub never keeps one off).
  for (const th of x.s.things) if (th.at.at === 'floor' && !th.by && !th.shell && (x.c.objects[th.obj]?.tier ?? 1) === 0 && thingLeft_g(x, th) <= cap && !rackChoice(x, m, t, th)) cands.push(th);
  if (!cands.length) return null;
  cands.sort((a, b) => (a.uid.length - b.uid.length) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  const dest = floorWholeDest(x, cands[0]);
  let room = dest === 'scale' ? cap : Math.min(cap, Math.max(hopperRoom(x, dest), thingLeft_g(x, cands[0])));
  const things: ThingState[] = [];
  let g = 0;
  for (const th of cands) {
    if (floorWholeDest(x, th) !== dest) continue;
    const w = thingLeft_g(x, th);
    if (w > room) continue;
    things.push(th);
    room -= w;
    g += w;
  }
  const waiting_g = cands.reduce((a, th) => a + thingLeft_g(x, th), 0);
  return things.length ? { things, dest, g, waiting_g } : null;
}

/** Take what a trip claimed (pieces off their pile, tray grams, loose things cut off, whole things) onto his carrier. */
function pickClaims(x: Ctx, m: CrewMember, claims: readonly string[], t: number): Piece[] {
  const s = x.s;
  const load: Piece[] = [];
  // A trip's claims are all ground pieces, all tray grams or all things (handDepart never mixes them): the
  // claimed pieces are found in one look at the piles and taken off in the claims' order, as one by one.
  const want = new Set<string>();
  for (const c of claims) if (!c.startsWith('tray.') && !c.startsWith('loose:')) want.add(c);
  const found = new Map<string, number>();
  if (want.size) for (let i = 0; i < s.pieces.length; i++) if (s.pieces[i].claim === m.id && want.has(s.pieces[i].uid)) found.set(s.pieces[i].uid, i);
  if (found.size) {
    const byUid = new Map<string, GroundPiece>();
    for (const [uid, i] of found) byUid.set(uid, s.pieces[i]);
    const idx = [...found.values()].sort((p, q) => q - p);
    for (const i of idx) s.pieces.splice(i, 1);
    for (const c of claims) {
      const q = byUid.get(c);
      if (!q) continue;
      const p: Piece = { uid: q.uid, grade: q.grade, g: q.g, from: q.from, spec: q.spec };
      if (q.whole) p.whole = q.whole;
      load.push(p);
    }
  }
  for (const c of claims) {
    if (found.has(c)) continue;
    if (c.startsWith('tray.')) {
      const [, id, grade, gs] = c.split('.');
      const mach = s.machines[id as MachineId];
      const want = Number(gs) || 0;
      mach.trayClaim_g[grade] = Math.max(0, (mach.trayClaim_g[grade] ?? 0) - want);
      if (!mach.trayClaim_g[grade]) delete mach.trayClaim_g[grade];
      // Take exactly the claimed grade's grams.
      const avail = mach.tray_g[grade] ?? 0;
      const take = Math.min(avail, want);
      if (take > 0) {
        mach.tray_g[grade] = avail - take;
        if (!mach.tray_g[grade]) delete mach.tray_g[grade];
        const n = (s.counts![`tray:${id}`] ?? 0) + 1;
        s.counts![`tray:${id}`] = n;
        load.push({ uid: `${id}.t${n}`, grade, g: take, from: id, spec: -1 });
      }
      if (mach.status === 'trayFull') takeTray(x, id as MachineId, 0, t);
      continue;
    }
    if (c.startsWith('loose:')) {
      const th = thingOf(x, c.slice(6));
      if (th && th.by === m.id) {
        th.by = null;
        for (let guard = 0; guard < 100; guard++) {
          const r = cutOff(x, th, m.id, t);
          if (!r) break;
          load.push(r.piece);
          if (r.gone) break;
        }
      }
      continue;
    }
    const th = thingOf(x, c);
    if (th && th.by === m.id) {
      const o = x.c.objects[th.obj];
      thingGone(x, th, m.id, t, true);
      load.push({ uid: th.uid, grade: o.whole!, g: o.gross_g, from: null, spec: -1, whole: th.obj });
    }
  }
  if (heard(x)) for (const p of load) x.ev.push({ type: 'pickup', piece: p.uid, grade: p.grade, g: p.g, by: m.id });
  return load;
}

/** Give back what a planned trip claimed and will not take (an opened run's later trips, a save's broken run). */
export function releaseClaims(x: Ctx, id: string, claims: readonly string[]): void {
  const s = x.s;
  for (const c of claims) {
    if (c.startsWith('tray.')) {
      const [, mid, grade, gs] = c.split('.');
      const mach = s.machines[mid as MachineId];
      if (!mach) continue;
      mach.trayClaim_g[grade] = Math.max(0, (mach.trayClaim_g[grade] ?? 0) - (Number(gs) || 0));
      if (!mach.trayClaim_g[grade]) delete mach.trayClaim_g[grade];
      continue;
    }
    const uid = c.startsWith('loose:') ? c.slice(6) : c;
    const gp = s.pieces.find((p) => p.uid === uid && p.claim === id);
    if (gp) {
      gp.claim = null;
      continue;
    }
    const th = thingOf(x, uid);
    if (th && th.by === id) th.by = null;
  }
}

const destSpotOf = (dest: string): Spot => (dest === 'scale' ? { place: 'scale' } : { place: machinePlace(dest as MachineId) });

/** A yard hand's leg ends: pick (claimed items onto his carrier, then to the scale or the machine), or drop. */
function handLegEnd(x: Ctx, m: CrewMember, t: number): void {
  const dest = m.dest ?? 'scale';
  if (m.phase === 'walkTo') {
    const at = posOf(x, m.to);
    const load = pickClaims(x, m, m.claims, t);
    m.claims = [];
    m.load = load;
    m.carries = load[0]?.grade ?? null;
    if (!load.length) {
      idle(m, t, at);
      return;
    }
    const to: Spot = destSpotOf(dest);
    leg(x, m, m.job, 'walkBack', to, t, x.c.crew.hand.handle_s, at);
    return;
  }
  if (m.phase === 'walkBack') {
    const at = posOf(x, m.to);
    let rest = m.load;
    m.load = [];
    if (dest !== 'scale') {
      const left: Piece[] = [];
      for (const p of rest) {
        if (dest === 'crucible') {
          if (!meltPiece(x, p, m.id, t)) left.push(p);
        } else if (accepts(x, dest as MachineId, p)) feedPiece(x, dest as MachineId, p, m.id, t);
        else left.push(p);
      }
      rest = left;
      if (rest.length) {
        // A hopper full on arrival takes what fits; the rest goes on to the platform (a new leg).
        m.load = rest;
        m.carries = rest[0].grade;
        m.dest = 'scale';
        leg(x, m, m.job, 'walkBack', { place: 'scale' }, t, x.c.crew.hand.handle_s, at);
        return;
      }
    } else weighIn(x, rest, m.id, t);
    delete m.dest;
    idle(m, t, at);
  }
}

// ---------------------------------------------------------------------------------------- grouped runs (2.1)

/** The grams a trip's claims hold (pieces and tray claims; things count their remaining grams). */
function claimGrams(x: Ctx, claims: readonly string[]): number {
  let g = 0;
  for (const c of claims) {
    if (c.startsWith('tray.')) g += Number(c.split('.')[3]) || 0;
    else {
      const uid = c.startsWith('loose:') ? c.slice(6) : c;
      const p = x.s.pieces.find((q) => q.uid === uid);
      if (p) g += p.g;
      else {
        const th = thingOf(x, uid);
        if (th) g += thingLeft_g(x, th);
      }
    }
  }
  return g;
}

function claimGrade(x: Ctx, claims: readonly string[]): string | null {
  const c = claims[0];
  if (!c) return null;
  if (c.startsWith('tray.')) return c.split('.')[2] ?? null;
  const uid = c.startsWith('loose:') ? c.slice(6) : c;
  const p = x.s.pieces.find((q) => q.uid === uid);
  if (p) return p.grade;
  const th = thingOf(x, uid);
  if (!th) return null;
  return x.c.objects[th.obj]?.whole ?? pieceSpec(x.c, th.obj, th.cut)?.grade ?? null;
}

type Cand = { spot: Spot; grade: string | null; g: number; take: () => string[] };

function piecesCand(m: CrewMember, pick: GroundPiece[], pile: string): Cand | null {
  if (!pick.length) return null;
  return {
    spot: { pile, k: pick[0].k },
    grade: pick[0].grade,
    g: pick.reduce((a, p) => a + p.g, 0),
    take: () => {
      for (const p of pick) p.claim = m.id;
      return pick.map((p) => p.uid);
    },
  };
}

/** The next trip of the same kind from the same place (the in-place choice of 2.1.2), or null. Claims nothing until `take`. */
function sameAgain(x: Ctx, m: CrewMember, t: number, kind: HandKind, cap: number, inYard: boolean, feedRoom: number): Cand | null {
  const s = x.s;
  switch (kind.k) {
    case 'feed': {
      if (feedRoom <= 0) return null;
      const inputs = machineInputs(x.c, s, kind.dest);
      const inbuf = (x.c.machines as unknown as Record<string, { inbuf: number }>)[kind.dest].inbuf * 1000;
      const src = s.pieces.filter((p) => !p.claim && p.pile === kind.pile && inputs.includes(p.grade));
      return piecesCand(m, choose(x, src, Math.min(cap, inbuf, feedRoom)), kind.pile);
    }
    case 'pile': {
      const heapPile = kind.pile.startsWith('zone.') || kind.pile.startsWith('beside.');
      const at = (uid: string) => thingOf(x, uid)?.at ?? null;
      const src = s.pieces.filter((p) => !p.claim && p.pile === kind.pile && !(inYard && isCable(x, p.grade)) && (!heapPile || waitsAt(x, p) !== null || heapFree(x, p, inYard, at)));
      return piecesCand(m, choose(x, src, cap), kind.pile);
    }
    case 'tray': {
      const mach = s.machines[kind.id];
      if (trayFree(x, kind.id) <= 0) return null;
      let left = cap;
      const claimed: Record<string, number> = {};
      for (const grade of Object.keys(mach.tray_g).sort((a, b) => (x.c.grades[b]?.pbar ?? 0) - (x.c.grades[a]?.pbar ?? 0))) {
        const avail = (mach.tray_g[grade] ?? 0) - (mach.trayClaim_g[grade] ?? 0);
        const take = Math.min(avail, left);
        if (take <= 0) continue;
        claimed[grade] = take;
        left -= take;
      }
      const g = sumStock(claimed);
      if (!g) return null;
      return {
        spot: { pile: `tray.${kind.id}` },
        grade: Object.keys(claimed)[0] ?? null,
        g,
        take: () => {
          for (const [grade, gg] of Object.entries(claimed)) mach.trayClaim_g[grade] = (mach.trayClaim_g[grade] ?? 0) + gg;
          return Object.entries(claimed).map(([grade, gg]) => `tray.${kind.id}.${grade}.${gg}`);
        },
      };
    }
    case 'loose': {
      const th = looseAt(x, m, t, kind.where, cap, inYard);
      if (!th) return null;
      return { spot: { thing: th.uid }, grade: pieceSpec(x.c, th.obj, th.cut)?.grade ?? null, g: thingLeft_g(x, th), take: () => ((th.by = m.id), [`loose:${th.uid}`]) };
    }
    case 'floorWhole': {
      // E35 at this departure: in the yard only while more than half of the floor's room is used.
      if (inYard && !(floorMass_g(x) > FLOOR_CLEAR_SHARE * x.c.floorRoom_kg * 1000)) return null;
      const trip = floorWholeTrip(x, m, t, cap);
      if (!trip || trip.dest !== kind.dest) return null;
      return {
        spot: { thing: trip.things[0].uid },
        grade: pieceSpec(x.c, trip.things[0].obj, trip.things[0].cut)?.grade ?? null,
        g: trip.g,
        take: () => {
          for (const th of trip.things) th.by = m.id;
          return trip.things.map((th) => `loose:${th.uid}`);
        },
      };
    }
    case 'whole': {
      // E4's whole thing goes while no cutter is hired, or (the drop-off) while every place is taken by a
      // thing nobody has claimed: once one is claimed the place is as good as free, so a leg-by-leg hand
      // would go elsewhere next (the drop-off arrives again, the cutter cuts it).
      // P11 at this departure: in the yard only while every place of the drop-off is taken.
      const noCutter = !inYard && !s.crew.some((q) => q.role === 'cutter');
      if (!noCutter) {
        if (kind.where !== 'dropoff') return null;
        let free = 0;
        for (const th of s.things) if (th.at.at === 'dropoff' && !th.by) free++;
        if (free < x.c.dropoff.places) return null;
      }
      const th = wholeAt(x, m, t, kind.where, cap);
      if (!th) return null;
      return { spot: { thing: th.uid }, grade: x.c.objects[th.obj]?.whole ?? null, g: x.c.objects[th.obj]?.gross_g ?? 0, take: () => ((th.by = m.id), [th.uid]) };
    }
  }
}

/**
 * 2.1 (14.1 b, c): PLAN AHEAD the rest of a run from the trip just set out on, when no boss is within
 * sight of its start, its source or its destination: more trips of the same kind from the same place to
 * the same destination while each ends by the run's t0 + group.handRun_s, each with its own two leg ends;
 * one dated end. The trip just set out on always goes (it was chosen by the first yard's order, or it fits).
 */
function groupHand(x: Ctx, m: CrewMember, t: number, start: { x: number; y: number }, kind: HandKind, t0: number): void {
  const dest = m.dest ?? 'scale';
  const destSpot = destSpotOf(dest);
  const dpos = posOf(x, destSpot);
  const src = posOf(x, m.to);
  if (bossSees(x, t, [start, src, dpos])) return;
  const v = handV(x, m);
  const h = x.c.crew.hand.handle_s;
  const dur = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(1e-3, legM(x.c, a, b) / v + h);
  const cap = x.c.crew.hand.load * 1000;
  const inYard = bossInYard(x, t);
  const loads: RunLoad[] = [{ claims: m.claims, spot: m.to, grade: claimGrade(x, m.claims), pickAt: m.t1, dropAt: m.t1 + dur(src, dpos) }];
  let feedRoom = dest !== 'scale' ? hopperRoom(x, dest as MachineId) - claimGrams(x, m.claims) : 0;
  const maxRun = groupCfg(x.c).handRun_s;
  while (loads.length < RUN_MAX) {
    const c = sameAgain(x, m, t, kind, cap, inYard, feedRoom);
    if (!c) break;
    const last = loads[loads.length - 1];
    const sp = posOf(x, c.spot);
    // Ruling 14.1 (b), engine2-hooks: nothing a person can see is claimed ahead. The departure's test above
    // saw only the start, the FIRST pick-up spot and the destination; a later trip of the same pile (another
    // spot of it) may lie within his sight: the plan stops before it (that trip is then made as an ordinary
    // trip of the run at its own departure, 2.1.2). The same points openCrewInSight tests (runPoints).
    if (bossSees(x, t, [sp])) break;
    const pickAt = last.dropAt + dur(dpos, sp);
    const dropAt = pickAt + dur(sp, dpos);
    if (dropAt - t0 > maxRun + RUN_EPS) break;
    loads.push({ claims: c.take(), spot: c.spot, grade: c.grade, pickAt, dropAt });
    feedRoom -= c.g;
  }
  const end = loads[loads.length - 1].dropAt;
  m.run = { t0: t, end, start: [start.x, start.y], k: loads.length, legS: (end - t) / loads.length, dest, loads };
  m.claims = [];
  // The tray's claimed grams are his from this departure: a machine stopped by a full tray goes on now.
  if (kind.k === 'tray' && x.s.machines[kind.id].status === 'trayFull') startMachine(x, kind.id, t);
  showRun(x, m, t);
}

/** Deliver one landed load of a run: weighed in (dated at its own drop) or fed; what a hopper cannot take is weighed in. */
function deliverLoad(x: Ctx, m: CrewMember, items: Piece[], dest: string, t: number, at: number): void {
  if (!items.length) return;
  if (dest === 'scale') {
    weighIn(x, items, m.id, t, at);
    return;
  }
  const left: Piece[] = [];
  for (const p of items) {
    if (dest === 'crucible') {
      if (!meltPiece(x, p, m.id, t)) left.push(p);
    } else if (accepts(x, dest as MachineId, p)) feedPiece(x, dest as MachineId, p, m.id, t);
    else left.push(p);
  }
  if (left.length) weighIn(x, left, m.id, t, at);
}

/** Land a hand's run's loads whose drop is at or before `upto`, in order, at yard second t. Returns the first not landed. */
function landLoads(x: Ctx, m: CrewMember, t: number, upto: number): number {
  const run = m.run!;
  const loads = run.loads ?? [];
  const dest = run.dest ?? 'scale';
  let i = 0;
  for (; i < loads.length; i++) {
    const L = loads[i];
    if (L.dropAt > upto + RUN_EPS) break;
    deliverLoad(x, m, pickClaims(x, m, L.claims, t), dest, t, L.dropAt);
  }
  return i;
}

/** Land a cutter's run's things whose cut ends at or before `upto`: each cut whole, its pieces on its place's pile. */
function landCuts(x: Ctx, m: CrewMember, t: number, upto: number): number {
  const cuts = m.run!.cuts ?? [];
  let i = 0;
  for (; i < cuts.length; i++) {
    const C = cuts[i];
    if (C.cutEnd > upto + RUN_EPS) break;
    const th = thingOf(x, C.thing);
    if (!th || th.by !== m.id) continue;
    const pile = th.at.at === 'dropoff' ? 'dropoff' : 'floor';
    const off: Piece[] = [];
    for (let guard = 0; guard < 1000; guard++) {
      const r = cutOff(x, th, m.id, t);
      if (!r) break;
      off.push(r.piece);
      if (heard(x)) x.ev.push({ type: 'pieceOff', thing: th.uid, piece: r.piece.uid, grade: r.piece.grade, g: r.piece.g, to: 'ground', by: m.id });
      if (r.gone) break;
    }
    dropAllOnPile(x, off, pile);
  }
  return i;
}

/** The points a run's sight is tested at: its start, every source and its destination. */
function runPoints(x: Ctx, m: CrewMember): { x: number; y: number }[] {
  const run = m.run!;
  const pts = [{ x: run.start[0], y: run.start[1] }];
  for (const L of run.loads ?? []) pts.push(posOf(x, L.spot));
  for (const C of run.cuts ?? []) pts.push(posOf(x, { thing: C.thing }));
  if (run.dest) pts.push(posOf(x, destSpotOf(run.dest)));
  return pts;
}

/** A run's dated end: everything lands in order; he stands where his last leg ended. */
function landRun(x: Ctx, m: CrewMember, t: number): void {
  const run = m.run!;
  if (run.cuts) {
    const last = run.cuts[run.cuts.length - 1];
    const at = last ? posOf(x, { thing: last.thing }) : { x: run.start[0], y: run.start[1] };
    landCuts(x, m, t, Infinity);
    delete m.run;
    m.claims = [];
    m.cut = null;
    idle(m, t, at);
    return;
  }
  const at = posOf(x, destSpotOf(run.dest ?? 'scale'));
  landLoads(x, m, t, Infinity);
  delete m.run;
  delete m.dest;
  m.claims = [];
  m.load = [];
  idle(m, t, at);
}

/**
 * 2.1: OPEN a run at t (the boss came within sight of it): what its plan finished by t lands now, in
 * order; the leg under way goes on as one ordinary leg with its planned times; the rest is released.
 */
export function openRun(x: Ctx, m: CrewMember, t: number): void {
  const run = m.run;
  if (!run) return;
  const startXY = { x: run.start[0], y: run.start[1] };
  if (run.cuts) {
    const cuts = run.cuts;
    const pos = cuts.map((C) => posOf(x, { thing: C.thing }));
    const i = landCuts(x, m, t, t);
    delete m.run;
    if (i >= cuts.length) {
      m.claims = [];
      m.cut = null;
      idle(m, t, pos[pos.length - 1] ?? startXY);
      return;
    }
    for (let j = i + 1; j < cuts.length; j++) releaseClaims(x, m.id, [cuts[j].thing]);
    const C = cuts[i];
    const prev = i === 0 ? startXY : pos[i - 1];
    const prevEnd = i === 0 ? run.t0 : cuts[i - 1].cutEnd;
    m.claims = [C.thing];
    if (t < C.walkEnd - RUN_EPS) {
      m.phase = 'walkTo';
      m.cut = null;
      m.from = { xy: [prev.x, prev.y] };
      m.to = { thing: C.thing };
      m.t0 = prevEnd;
      m.t1 = C.walkEnd;
    } else {
      m.phase = 'work';
      m.cut = { thing: C.thing, whole: true };
      m.from = { thing: C.thing };
      m.to = { thing: C.thing };
      m.t0 = C.walkEnd;
      m.t1 = C.cutEnd;
    }
    return;
  }
  const loads = run.loads ?? [];
  const dest = run.dest ?? 'scale';
  const destSpot = destSpotOf(dest);
  const dpos = posOf(x, destSpot);
  const spots = loads.map((L) => posOf(x, L.spot));
  const i = landLoads(x, m, t, t);
  delete m.run;
  m.load = [];
  m.carries = null;
  if (i >= loads.length) {
    delete m.dest;
    m.claims = [];
    idle(m, t, dpos);
    return;
  }
  for (let j = i + 1; j < loads.length; j++) releaseClaims(x, m.id, loads[j].claims);
  const L = loads[i];
  m.dest = dest;
  if (t < L.pickAt - RUN_EPS) {
    const prev = i === 0 ? startXY : dpos;
    m.phase = 'walkTo';
    m.claims = L.claims;
    m.from = { xy: [prev.x, prev.y] };
    m.to = L.spot;
    m.t0 = i === 0 ? run.t0 : loads[i - 1].dropAt;
    m.t1 = L.pickAt;
    return;
  }
  const at = spots[i];
  const items = pickClaims(x, m, L.claims, t);
  m.claims = [];
  if (!items.length) {
    delete m.dest;
    idle(m, t, at);
    return;
  }
  m.load = items;
  m.carries = items[0].grade;
  m.phase = 'walkBack';
  m.from = { xy: [at.x, at.y] };
  m.to = destSpot;
  m.t0 = L.pickAt;
  m.t1 = L.dropAt;
}

/** Open every crew run the boss can see now (hand.ts bossStep, live only). */
export function openCrewInSight(x: Ctx, t: number): void {
  for (const m of x.s.crew) if (m.run && bossSees(x, t, runPoints(x, m))) openRun(x, m, t);
}

/**
 * The leg of a run under way at t, written into the member's shown fields (phase, from, to, t0, t1,
 * carries; a cutter's `cut`): what the frame draws. A pure function of the plan and the clock, set at
 * the end of every advance (tick, jump and away alike); nothing decides from these fields while a run
 * holds them (the queue reads `run.end`).
 */
function showRun(x: Ctx, m: CrewMember, t: number): void {
  const run = m.run!;
  const startXY = { x: run.start[0], y: run.start[1] };
  if (run.cuts) {
    const cuts = run.cuts;
    let i = cuts.findIndex((C) => C.cutEnd > t + RUN_EPS);
    if (i < 0) i = cuts.length - 1;
    const C = cuts[i];
    if (t < C.walkEnd - RUN_EPS) {
      const prev = i === 0 ? startXY : posOf(x, { thing: cuts[i - 1].thing });
      m.phase = 'walkTo';
      m.cut = null;
      m.from = { xy: [prev.x, prev.y] };
      m.to = { thing: C.thing };
      m.t0 = i === 0 ? run.t0 : cuts[i - 1].cutEnd;
      m.t1 = C.walkEnd;
    } else {
      m.phase = 'work';
      m.cut = { thing: C.thing, whole: true };
      m.from = { thing: C.thing };
      m.to = { thing: C.thing };
      m.t0 = C.walkEnd;
      m.t1 = C.cutEnd;
    }
    return;
  }
  const loads = run.loads ?? [];
  let i = loads.findIndex((L) => L.dropAt > t + RUN_EPS);
  if (i < 0) i = loads.length - 1;
  const L = loads[i];
  const destSpot = destSpotOf(run.dest ?? 'scale');
  if (t < L.pickAt - RUN_EPS) {
    const prev = i === 0 ? startXY : posOf(x, destSpot);
    m.phase = 'walkTo';
    m.from = { xy: [prev.x, prev.y] };
    m.to = L.spot;
    m.t0 = i === 0 ? run.t0 : loads[i - 1].dropAt;
    m.t1 = L.pickAt;
    m.carries = null;
  } else {
    const at = posOf(x, L.spot);
    m.phase = 'walkBack';
    m.from = { xy: [at.x, at.y] };
    m.to = destSpot;
    m.t0 = L.pickAt;
    m.t1 = L.dropAt;
    m.carries = L.grade;
  }
}

/** Every running member's shown leg at the draft's clock (tick.ts, at the end of every advance). */
export function showCrewRuns(x: Ctx): void {
  for (const m of x.s.crew) if (m.run) showRun(x, m, x.s.t);
}

// ---------------------------------------------------------------------------------------- cutters

/** A cutter's power, kg/s at hardness 1: P × share × (1 + lev × (L − 1)), at most cap × P (2.12). */
export function cutterP(x: Ctx, m: CrewMember): number {
  const P = toolP(x.c, x.s.tier);
  const k = x.c.crew.cutter;
  return Math.min(k.cap * P, P * k.share * (1 + k.lev * Math.max(0, m.level - 1))) * boostFactor(x, x.s.t);
}

/** The time to cut what is left of a thing at power P. */
function cutLeft(x: Ctx, th: ThingState, P: number): number {
  let t = 0;
  const n = countOf(x.c, th.obj);
  for (let k = th.cut; k < n; k++) {
    const sp = specAt(x.c, th.obj, k);
    if (sp) t += cutTime(x.c, th.obj, sp.g, P);
  }
  return Math.max(0, t - th.progress);
}

/**
 * The things a cutter may take at a place, best score first (value per second of cutting, then uid). Stage 2
 * (2.12, ruling 13.1): he keeps off a tagged thing the boss or a yard hand racks (reuse.ts rackChoice).
 */
function cutCands(x: Ctx, m: CrewMember, t: number, where: 'dropoff' | 'floor', P: number): ThingState[] {
  const s = x.s;
  const cands = s.things.filter((th) => th.at.at === where && !th.by && !th.shell && (x.c.objects[th.obj]?.tier ?? 0) >= 1 && tierOf(x.c, th) <= s.tier && !rackChoice(x, m, t, th));
  if (cands.length < 2) return cands;
  // The score is a pure function of the thing (memoised for the sort; the order is the same).
  const scores = new Map<ThingState, number>();
  const score = (th: ThingState) => {
    let v = scores.get(th);
    if (v === undefined) scores.set(th, (v = (x.c.objects[th.obj]?.preparedValue ?? 0) / Math.max(1e-6, cutLeft(x, th, P))));
    return v;
  };
  cands.sort((a, b) => score(b) - score(a) || (a.uid < b.uid ? -1 : 1));
  return cands;
}

/**
 * A cutter's departure (2.12; 2.1 and 14.1 from group.fromRung): inside a run he takes the next thing at
 * the run's place in score order if its cut would end by t0 + group.cutRun_s; else the first yard's order
 * (the drop-off first, then the floor, best score first) chooses and a new run starts here. Out of sight
 * (and group.ahead) the rest of the run is planned (groupCutter); in sight it is an ordinary leg.
 */
function cutterDepart(x: Ctx, m: CrewMember, t: number): boolean {
  const P = cutterP(x, m);
  const runs = grouping(x);
  if (!runs && m.course) delete m.course;
  const c = runs ? m.course : undefined;
  if (c && c.kind.k === 'cut') {
    const where = c.kind.where;
    const cands = cutCands(x, m, t, where, P);
    if (cands.length) {
      const start = posOf(x, m.to);
      const walkEnd = t + Math.max(1e-3, legM(x.c, start, posOf(x, { thing: cands[0].uid })) / handV(x, m));
      const cutEnd = walkEnd + Math.max(1e-3, cutLeft(x, cands[0], P));
      if (cutEnd - c.t0 <= groupCfg(x.c).cutRun_s + RUN_EPS) {
        startCut(x, m, t, c.job, where, cands, P, start, c.t0);
        return true;
      }
    }
  }
  if (c) delete m.course;
  for (const where of ['dropoff', 'floor'] as const) {
    const cands = cutCands(x, m, t, where, P);
    if (!cands.length) continue;
    const job: CrewJob = where === 'dropoff' ? 'cutDropoff' : 'cutFloor';
    if (runs) m.course = { t0: t, job, kind: { k: 'cut', where } };
    startCut(x, m, t, job, where, cands, P, posOf(x, m.to), t);
    return true;
  }
  return false;
}

/** Set out on the first of `cands` (a leg), or plan the run from it when out of sight and planned ahead. */
function startCut(x: Ctx, m: CrewMember, t: number, job: CrewJob, where: 'dropoff' | 'floor', cands: ThingState[], P: number, start: { x: number; y: number }, t0: number): void {
  if (planAhead(x) && !bossSees(x, t, [start], [where])) {
    groupCutter(x, m, t, job, cands, P, start, t0);
    return;
  }
  const th = cands[0];
  th.by = m.id;
  m.claims = [th.uid];
  m.cut = null;
  leg(x, m, job, 'walkTo', { thing: th.uid }, t, 0);
}

/**
 * 2.1 (14.1 b, c): the rest of a cutter's run PLANNED at this departure (no boss within sight of him or of
 * the place): things of one place in his score order, each walked to and cut whole, while each cut ends by
 * the run's t0 + group.cutRun_s (the first always: it was chosen by the first yard's order, or it fits).
 */
function groupCutter(x: Ctx, m: CrewMember, t: number, job: CrewJob, sorted: ThingState[], P: number, start: { x: number; y: number }, t0: number): void {
  const v = handV(x, m);
  const maxRun = groupCfg(x.c).cutRun_s;
  const cuts: RunCut[] = [];
  let here = start;
  let tt = t;
  for (const th of sorted) {
    if (cuts.length >= RUN_MAX) break;
    const p = posOf(x, { thing: th.uid });
    const walkEnd = tt + Math.max(1e-3, legM(x.c, here, p) / v);
    const cutEnd = walkEnd + Math.max(1e-3, cutLeft(x, th, P));
    if (cuts.length && cutEnd - t0 > maxRun + RUN_EPS) break;
    th.by = m.id;
    cuts.push({ thing: th.uid, walkEnd, cutEnd });
    here = p;
    tt = cutEnd;
  }
  const end = cuts[cuts.length - 1].cutEnd;
  m.job = job;
  m.claims = [];
  m.cut = null;
  m.run = { t0: t, end, start: [start.x, start.y], k: cuts.length, legS: (end - t) / cuts.length, cuts };
  showRun(x, m, t);
  x.ev.push({ type: 'crewLeg', id: m.id, job, from: m.from, to: m.to, t0: m.t0, t1: m.t1 });
}

function bossWithin(x: Ctx, th: ThingState, t: number): boolean {
  if (!bossFresh(x, t)) return false;
  const p = thingPos(x.c, th.at);
  return Math.hypot(x.s.presence.x - p.x, x.s.presence.y - p.y) <= x.c.reach.sight;
}

function cutterLegEnd(x: Ctx, m: CrewMember, t: number): void {
  const th = thingOf(x, m.claims[0] ?? null);
  const at = posOf(x, m.to);
  if (!th || th.by !== m.id) {
    m.claims = [];
    m.cut = null;
    idle(m, t, at);
    return;
  }
  const P = cutterP(x, m);
  const pile = th.at.at === 'dropoff' ? 'dropoff' : 'floor';
  if (m.phase === 'walkTo') {
    // Decided when he starts it, never recomputed (notes/contract.md item 4).
    const whole = !bossWithin(x, th, t);
    m.cut = { thing: th.uid, whole };
    const sp = pieceSpec(x.c, th.obj, th.cut);
    const dur = whole ? cutLeft(x, th, P) : Math.max(0, (sp ? cutTime(x.c, th.obj, sp.g, P) : 0) - th.progress);
    m.phase = 'work';
    m.from = { thing: th.uid };
    m.to = { thing: th.uid };
    m.t0 = t;
    m.t1 = t + Math.max(1e-3, dur);
    x.ev.push({ type: 'workStart', thing: th.uid, obj: th.obj, grade: sp?.grade ?? '', tool: 'cutter', by: m.id, ring: { t0: t, t1: m.t1, p0: 0 } });
    return;
  }
  if (m.phase === 'work') {
    const whole = m.cut?.whole ?? true;
    let gone = false;
    do {
      const r = cutOff(x, th, m.id, t);
      if (!r) break;
      dropOnPile(x, r.piece, pile);
      if (heard(x)) x.ev.push({ type: 'pieceOff', thing: th.uid, piece: r.piece.uid, grade: r.piece.grade, g: r.piece.g, to: 'ground', by: m.id });
      gone = r.gone;
    } while (whole && !gone);
    if (!gone) {
      const sp = pieceSpec(x.c, th.obj, th.cut);
      m.t0 = t;
      m.t1 = t + Math.max(1e-3, sp ? cutTime(x.c, th.obj, sp.g, P) : 0);
      return;
    }
    m.claims = [];
    m.cut = null;
    idle(m, t, at);
  }
}

// ---------------------------------------------------------------------------------------- the crew together

/** A crew member's leg ends at t (his t1). */
export function crewLegEnd(x: Ctx, m: CrewMember, t: number): void {
  if (m.run) landRun(x, m, t);
  // Stage 2 (s2a-fix): an ordinary leg the works take (a 'rack' job, a plate's feed or tray: works.ts worksLegEnd; the stub never does).
  else if (worksLegEnd(x, m, t)) return;
  else if (m.role === 'hand') handLegEnd(x, m, t);
  else if (m.role === 'cutter') cutterLegEnd(x, m, t);
  else {
    m.t0 = t;
    m.t1 = t;
  }
}

/**
 * Departures of idle agents in id order: cutters, then yard hands (2.12 order step 5). The driver is truck.ts's.
 * owner1 H5: an agent on his way to his waiting place (job 'idle', walking) is offered work too, from where he is on
 * that leg; one with nothing to do walks to his waiting place (an ordinary dated leg) and waits there.
 */
export function crewDepart(x: Ctx, t: number): void {
  for (const m of x.s.crew) if (m.role === 'cutter' && m.job === 'idle' && !m.run) offer(x, m, t, cutterDepart);
  for (const m of x.s.crew) if (m.role === 'hand' && m.job === 'idle' && !m.run) offer(x, m, t, departHand);
}

/** Is anybody of the yard's crew (a yard hand or a cutter) idle now? (actions.ts: a presence sample offers work again, H5.) */
export function anyIdle(s: Ctx['s']): boolean {
  for (const m of s.crew) if ((m.role === 'hand' || m.role === 'cutter') && m.job === 'idle' && !m.run) return true;
  return false;
}

/** The waiting places of the map (content `map.points` wait1, wait2, ...), in order; none: the first yard's (he stands where he is). */
const WAITS = new WeakMap<object, { x: number; y: number }[]>();
function waitPlaces(c: Ctx['c']): { x: number; y: number }[] {
  let w = WAITS.get(c);
  if (!w) {
    w = [];
    for (let n = 1; c.map.points[`wait${n}`]; n++) w.push(pointOf(c, `wait${n}`));
    WAITS.set(c, w);
  }
  return w;
}

/** H5: a crew member's own waiting place: the yard hands from the first, the cutters from the last; null without places. */
export function waitPlaceOf(c: Ctx['c'], m: Pick<CrewMember, 'role' | 'slot'>): { x: number; y: number } | null {
  const w = waitPlaces(c);
  if (!w.length || (m.role !== 'hand' && m.role !== 'cutter')) return null;
  const n = w.length;
  return m.role === 'hand' ? w[m.slot % n] : w[(n - 1 - (m.slot % n) + n) % n];
}

/** Where a member on a straight leg is at t (the leg's interpolation, the frame's from-to). */
function legAt(x: Ctx, m: CrewMember, t: number): { x: number; y: number } {
  const a = spotPos(x.c, m.from, x.s.things, x.s.truck);
  const b = posOf(x, m.to);
  if (m.phase === 'wait' || m.t1 <= m.t0) return b;
  const u = Math.max(0, Math.min(1, (t - m.t0) / (m.t1 - m.t0)));
  return { x: a.x + u * (b.x - a.x), y: a.y + u * (b.y - a.y) };
}

/**
 * Offer an idle member work at t (H5). Walking to his waiting place, he is taken off that leg where he is; if nothing
 * is offered, the leg goes on unchanged. Standing with nothing to do away from his waiting place, he walks there.
 */
function offer(x: Ctx, m: CrewMember, t: number, depart: (x: Ctx, m: CrewMember, t: number) => boolean): void {
  if (m.phase === 'wait') {
    if (depart(x, m, t)) return;
    walkToWait(x, m, t);
    return;
  }
  // On his way to the waiting place (job 'idle', walking): from where he is now.
  const keep = { phase: m.phase, from: m.from, to: m.to, t0: m.t0, t1: m.t1 };
  idle(m, t, legAt(x, m, t));
  if (depart(x, m, t)) return;
  m.phase = keep.phase;
  m.from = keep.from;
  m.to = keep.to;
  m.t0 = keep.t0;
  m.t1 = keep.t1;
}

/** H5: an idle member not at his waiting place walks there (an ordinary dated leg, job 'idle'); the leg's end leaves him waiting there. */
function walkToWait(x: Ctx, m: CrewMember, t: number): void {
  if (!owner1Rules(x.c)) return;
  const w = waitPlaceOf(x.c, m);
  if (!w) return;
  const here = posOf(x, m.to);
  if (Math.hypot(here.x - w.x, here.y - w.y) < 0.05) return;
  leg(x, m, 'idle', 'walkTo', { xy: [w.x, w.y] }, t, 0, here);
  m.claims = [];
  m.carries = null;
  delete m.dest;
}

/**
 * A yard hand's departure (2.1, RULING2.md 14.1). Below group.fromRung: the first yard's order alone
 * (handDepart). From it, inside a run (`course`) he takes the next trip of the run's kind if it ends by
 * t0 + group.handRun_s (nextHand); else the run is over, the first yard's order chooses and a new run
 * starts at this departure. Out of sight (and group.ahead) the rest of the run is planned here (groupHand);
 * in sight the trip is an ordinary trip.
 */
function departHand(x: Ctx, m: CrewMember, t: number): boolean {
  const start = posOf(x, m.to);
  PLAN = null;
  if (!grouping(x)) {
    if (m.course) delete m.course;
    return handDepart(x, m, t);
  }
  // Stage 2 (2.12, ruling 13.1; s2a-fix): a tagged thing for the Yard sale comes first in his order also INSIDE a
  // run (reuse.ts rackChoice sets him off with it and the run is over; the stub never does). Outside a run
  // handDepart asks it first itself.
  const c = m.course;
  if (c && rackChoice(x, m, t, null)) {
    delete m.course;
    return true;
  }
  if (c && c.kind.k !== 'cut' && nextHand(x, m, t, start, c, c.kind)) return true;
  if (c) delete m.course;
  if (!handDepart(x, m, t)) return false;
  const kind = PLAN as HandKind | null;
  PLAN = null;
  if (kind) {
    m.course = { t0: t, job: m.job, kind };
    if (planAhead(x)) groupHand(x, m, t, start, kind, t);
  }
  return true;
}

/** The destination of a hand's run of this kind: 'scale' or a machine. */
function kindDest(kind: HandKind): string {
  return kind.k === 'feed' || kind.k === 'floorWhole' ? kind.dest : 'scale';
}

/**
 * 14.1 (a): the next trip of a hand's run, by the planner's own in-place choice (sameAgain) at this
 * departure, if it would end (his drop) no later than the run's t0 + group.handRun_s. Sets out on it as an
 * ordinary trip (claims for this trip only) and, out of sight, plans the rest of the run from it. False:
 * none, or it would end later (the run is over).
 */
function nextHand(x: Ctx, m: CrewMember, t: number, start: { x: number; y: number }, c: RunCourse, kind: HandKind): boolean {
  const dest = kindDest(kind);
  const cap = x.c.crew.hand.load * 1000;
  const cand = sameAgain(x, m, t, kind, cap, bossInYard(x, t), kind.k === 'feed' ? hopperRoom(x, kind.dest) : 0);
  if (!cand) return false;
  const v = handV(x, m);
  const h = x.c.crew.hand.handle_s;
  const sp = posOf(x, cand.spot);
  const pickAt = t + Math.max(1e-3, legM(x.c, start, sp) / v + h);
  const dropAt = pickAt + Math.max(1e-3, legM(x.c, sp, posOf(x, destSpotOf(dest))) / v + h);
  if (dropAt - c.t0 > groupCfg(x.c).handRun_s + RUN_EPS) return false;
  m.claims = cand.take();
  if (kind.k === 'feed' || kind.k === 'floorWhole') m.cut = null;
  leg(x, m, c.job, 'walkTo', cand.spot, t, h);
  m.dest = dest;
  if (planAhead(x)) groupHand(x, m, t, start, kind, c.t0);
  return true;
}

/** Is this crew member's leg pending (a dated end in the future or now)? */
export const crewPending = (m: CrewMember): boolean => !!m.run || (m.phase !== 'wait' && m.t1 > m.t0 - 1e-9);

void atPlace;
void piecePos;

// ---------------------------------------------------------------------------------------- why a worker waits (owner1 H6)

/** Why a yard hand or cutter stands idle (RULING-owner1 H6): the frame's crew entry and the rota's row carry it. */
export type IdleWhy = 'nothing' | 'uncut' | 'yours' | 'tool';

/**
 * H6: why an idle yard hand or cutter waits, a read of the state (nothing is changed). A yard hand: 'yours' when what
 * lies about is the boss's for now (pieces within `crew.hand.leaveM` of him in a heap, cable left for him, a whole thing
 * at the drop-off within his sight); else 'uncut' when only things that need cutting (or a tool the yard lacks) wait;
 * else 'nothing'. A cutter: 'tool' when a thing at the drop-off or on the floor needs a tier the yard has not (its tier
 * in `tier`), else 'yours' when the boss works the only things there, else 'nothing'. Null for anybody not idle, the
 * driver, or a content without the review's rules.
 */
export function idleWhyOf(c: Ctx['c'], s: Ctx['s'], m: CrewMember, live = true): { why: IdleWhy; tier?: number } | null {
  if (m.job !== 'idle' || m.run || !owner1Rules(c) || (m.role !== 'hand' && m.role !== 'cutter')) return null;
  const x = { c, s, live, cash: 0 } as unknown as Ctx;
  const t = s.t;
  const things = s.things.filter((th) => !th.shell && th.at.at !== 'crate' && th.at.at !== 'canopy');
  if (m.role === 'cutter') {
    let need = 0;
    let boss = false;
    for (const th of things) {
      if (th.at.at !== 'dropoff' && th.at.at !== 'floor') continue;
      if ((c.objects[th.obj]?.tier ?? 0) < 1) continue;
      const tr = tierOf(c, th);
      if (tr > s.tier) need = need ? Math.min(need, tr) : tr;
      else if (th.by === 'boss') boss = true;
    }
    if (need) return { why: 'tool', tier: need };
    return { why: boss ? 'yours' : 'nothing' };
  }
  const inYard = bossInYard(x, t);
  const at = (uid: string) => thingOf(x, uid)?.at ?? null;
  for (const p of s.pieces) {
    if (p.claim) continue;
    if (!inYard) continue;
    const w = waitsAt(x, p);
    if (w ? isCable(x, p.grade) : (p.pile.startsWith('zone.') || p.pile.startsWith('beside.')) && !heapFree(x, p, inYard, at)) return { why: 'yours' };
  }
  let uncut = false;
  for (const th of things) {
    if (th.by && th.by !== 'boss') continue;
    if (th.by === 'boss') return inYard ? { why: 'yours' } : { why: 'uncut' };
    const o = c.objects[th.obj];
    if (!o) continue;
    if (th.at.at === 'dropoff' && inYard && o.whole && th.cut === 0 && (o.tier ?? 0) > 0) {
      const tp = thingPos(c, th.at);
      if (Math.hypot(tp.x - s.presence.x, tp.y - s.presence.y) <= c.reach.sight + 1e-9) return { why: 'yours' };
    }
    if ((o.tier ?? 0) === 0 && inYard && (th.at.at === 'dropoff' || th.at.at === 'floor')) {
      const sp = pieceSpec(c, th.obj, th.cut);
      if (sp && isCable(x, sp.grade)) return { why: 'yours' };
    }
    if ((o.tier ?? 0) >= 1 && th.at.at !== 'zone') uncut = true;
    if ((o.tier ?? 0) >= 1 && th.at.at === 'zone') uncut = true;
  }
  return { why: uncut ? 'uncut' : 'nothing' };
}
