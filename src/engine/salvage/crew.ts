/**
 * Crew as agents on legs (yard-stage1.md 2.6, 2.12, E17, S12, E4): each leg is chosen when it starts and
 * ends at a time computed then; the crew member the player sees walking IS that leg. Yard hands carry by
 * S12's priority and claim at departure; cutters cut at the drop-off, then on the tipping floor, never
 * what the boss works; the driver is truck.ts's. Owner: rules-sim.
 */
import { boostFactor, bossFresh, type Ctx } from './clock';
import { byValue, cutTime, legM, machineInputs, tierOf, machinePlace, pieceCount, pieceSpec, sumStock, toolP } from './content';
import { meltPiece } from './crucible';
import { accepts, atPlace, feedPiece, hopperRoom, takeTray, trayFree } from './machines';
import { piecePos, pointOf, spotPos, thingPos } from './positions';
import { weighIn } from './scales';
import { cutOff, dropOnPile, floorMass_g, takeFromPile, thingGone, thingOf, dropoffCount } from './things';
import type { CrewJob, CrewMember, CrewPhase, GroundPiece, MachineId, Piece, Spot, ThingState } from './types';

const RATE_FED: MachineId[] = ['stripper', 'bench'];

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
  if (role === 'hand') handDepart(x, m, t);
  else if (role === 'cutter') cutterDepart(x, m, t);
  return m;
}

// ---------------------------------------------------------------------------------------- yard hands

const pileOrder = (p: GroundPiece) => (p.pile.startsWith('circle.') ? 0 : p.pile === 'dropoff' ? 1 : p.pile === 'floor' ? 2 : 3);

/** Pick from a set of pieces best first while they fit `room` grams. */
function choose(x: Ctx, pieces: GroundPiece[], room: number): GroundPiece[] {
  const out: GroundPiece[] = [];
  for (const p of [...pieces].sort(byValue(x.c))) {
    if (p.g <= room) {
      out.push(p);
      room -= p.g;
    }
  }
  return out;
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
  return machineInputs(x.c, x.s, 'hand_stripper').includes(grade);
}

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
  const inYard = bossFresh(x, t);
  const carryable = (p: GroundPiece) => !(inYard && isCable(x, p.grade));
  // Nothing anywhere to carry: stay at the stand (offered work again at every later event).
  // Only the piles a yard hand takes from count (2.6: never from the heaps; pieces beside a thing in a zone are the boss's).
  const free: GroundPiece[] = [];
  for (const p of s.pieces) if (!p.claim && waitsAt(x, p)) free.push(p);
  let any = free.length > 0;
  if (!any) for (const id of ['stripper', 'hand_stripper', 'bench', 'crucible'] as MachineId[]) if (trayFree(x, id) > 0) {
    any = true;
    break;
  }
  if (!any) for (const th of s.things) if (!th.by && th.at.at !== 'zone') {
    any = true;
    break;
  }
  if (!any) return false;
  const claim = (ps: GroundPiece[]) => {
    for (const p of ps) p.claim = m.id;
    m.claims = ps.map((p) => p.uid);
  };
  // (1) feed: a machine with room for its input lying in a circle, at the drop-off or on the floor.
  for (const id of [...RATE_FED, 'crucible' as MachineId]) {
    const mach = s.machines[id];
    if (!mach.owned) continue;
    const src = free.filter((p) => (id === 'crucible' ? false : accepts(x, id, p)));
    if (!src.length) continue;
    const pile = [...src].sort((a, b) => pileOrder(a) - pileOrder(b))[0].pile;
    const pick = choose(x, src.filter((p) => p.pile === pile), Math.min(cap, (x.c.machines as unknown as Record<string, { inbuf: number }>)[id].inbuf * 1000));
    if (!pick.length) continue;
    claim(pick);
    m.cut = null;
    leg(x, m, 'feed', 'walkTo', { pile, k: pick[0].k }, t, x.c.crew.hand.handle_s);
    m.dest = id;
    return true;
  }
  // (2) chalk circles.
  const circles = free.filter((p) => p.pile.startsWith('circle.') && carryable(p));
  if (circles.length) {
    const pile = circles[0].pile;
    const pick = choose(x, circles.filter((p) => p.pile === pile), cap);
    if (pick.length) {
      claim(pick);
      leg(x, m, 'circle', 'walkTo', { pile, k: pick[0].k }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  // (3) out trays (mass, up to his load).
  for (const id of ['stripper', 'hand_stripper', 'bench', 'crucible'] as MachineId[]) {
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
    leg(x, m, 'tray', 'walkTo', { pile: `tray.${id}` }, t, x.c.crew.hand.handle_s);
    m.dest = 'scale';
    return true;
  }
  // Loose things (tier 0: a cable bundle, a crate of taps) are pieces to carry: they go with the pieces of their place.
  const looseCable = (th: ThingState) => inYard && (pieceSpec(x.c, th.obj, th.cut) ? isCable(x, pieceSpec(x.c, th.obj, th.cut)!.grade) : false);
  const loose = (where: 'dropoff' | 'floor'): ThingState | null =>
    s.things.filter((th) => th.at.at === where && !th.by && !th.shell && (x.c.objects[th.obj]?.tier ?? 1) === 0 && (x.c.objects[th.obj]?.gross_g ?? Infinity) <= cap && !looseCable(th)).sort((a, b) => (a.uid < b.uid ? -1 : 1))[0] ?? null;
  const takeLoose = (th: ThingState, job: CrewJob): boolean => {
    th.by = m.id;
    m.claims = [`loose:${th.uid}`];
    leg(x, m, job, 'walkTo', { thing: th.uid }, t, x.c.crew.hand.handle_s);
    m.dest = 'scale';
    return true;
  };
  // (6) the tipping floor (E35): its pieces and its whole things that need no cutting. While more than half
  // of the floor's room is used the floor comes BEFORE the drop-off (4, 5): else a drop-off that never runs
  // dry (the public's things arriving all the absence) keeps the hands off a full floor for good and the
  // truck tips nothing more.
  const floorStep = (): boolean => {
    const floor = free.filter((p) => waitsAt(x, p) === 'floor' && carryable(p));
    // E35: whole things that need no cutting leave the floor whenever the boss is away, and while he is in
    // the yard once more than half of the floor's room is used; the bigger waiting heap goes first.
    if (!inYard || floorFirst) {
      const trip = floorWholeTrip(x, cap);
      if (trip && trip.waiting_g >= floor.reduce((a, p) => a + p.g, 0)) {
        for (const th of trip.things) th.by = m.id;
        m.claims = trip.things.map((th) => `loose:${th.uid}`);
        m.cut = null;
        leg(x, m, 'floor', 'walkTo', { thing: trip.things[0].uid }, t, x.c.crew.hand.handle_s);
        m.dest = trip.dest;
        return true;
      }
    }
    const looseFloor = loose('floor');
    if (!floor.length && looseFloor) return takeLoose(looseFloor, 'floor');
    if (floor.length) {
      const pile = floor.some((p) => p.pile === 'floor') ? 'floor' : floor[0].pile;
      const pick = choose(x, floor.filter((p) => p.pile === pile), cap);
      if (pick.length) {
        claim(pick);
        leg(x, m, 'floor', 'walkTo', { pile, k: pick[0].k }, t, x.c.crew.hand.handle_s);
        m.dest = 'scale';
        return true;
      }
    }
    return false;
  };
  const floorFirst = floorMass_g(x) > FLOOR_CLEAR_SHARE * x.c.floorRoom_kg * 1000;
  if (floorFirst && floorStep()) return true;
  // (4) the drop-off's pieces.
  const drop = free.filter((p) => waitsAt(x, p) === 'dropoff' && carryable(p));
  const looseDrop = loose('dropoff');
  if (!drop.length && looseDrop) return takeLoose(looseDrop, 'dropoff');
  if (drop.length) {
    // One pile a trip (the drop-off's own pile or the pieces beside one thing there): the nearest to him first.
    const me = posOf(x, m.to);
    const at = (uid: string) => thingOf(x, uid)?.at ?? null;
    const near = [...drop].sort((a, b) => {
      const pa = piecePos(x.c, a.pile, a.k, at);
      const pb = piecePos(x.c, b.pile, b.k, at);
      return Math.hypot(pa.x - me.x, pa.y - me.y) - Math.hypot(pb.x - me.x, pb.y - me.y) || (a.uid < b.uid ? -1 : 1);
    })[0].pile;
    const pick = choose(x, drop.filter((p) => p.pile === near), cap);
    if (pick.length) {
      claim(pick);
      leg(x, m, 'dropoff', 'walkTo', { pile: near, k: pick[0].k }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  // (5) a whole thing at the drop-off at its whole grade, when no cutter is hired or every place is taken (E4).
  const noCutter = !s.crew.some((c) => c.role === 'cutter');
  const wholeThing = (where: 'dropoff' | 'floor'): ThingState | null => {
    const cands = s.things.filter((th) => th.at.at === where && !th.by && !th.shell && th.cut === 0 && x.c.objects[th.obj]?.whole && (x.c.objects[th.obj]?.gross_g ?? Infinity) <= cap && (x.c.objects[th.obj]?.tier ?? 0) > 0);
    return cands.sort((a, b) => (x.c.grades[x.c.objects[b.obj].whole!]?.pbar ?? 0) - (x.c.grades[x.c.objects[a.obj].whole!]?.pbar ?? 0) || (a.uid < b.uid ? -1 : 1))[0] ?? null;
  };
  const full = dropoffCount(x) >= x.c.dropoff.places;
  if (inYard ? full : noCutter || full) {
    const th = wholeThing('dropoff');
    if (th) {
      th.by = m.id;
      m.claims = [th.uid];
      leg(x, m, 'wholeThing', 'walkTo', { thing: th.uid }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  if (!floorFirst && floorStep()) return true;
  if (!inYard && noCutter) {
    const th = wholeThing('floor');
    if (th) {
      th.by = m.id;
      m.claims = [th.uid];
      leg(x, m, 'wholeThing', 'walkTo', { thing: th.uid }, t, x.c.crew.hand.handle_s);
      m.dest = 'scale';
      return true;
    }
  }
  return false;
}

/** E35: the floor's room share above which a yard hand clears whole uncut things off it while the boss is in the yard. */
export const FLOOR_CLEAR_SHARE = 0.5;

/** Where a whole thing that needs no cutting goes from the floor (E35): motors to the bench's hopper, cable to the powered stripper's, else the scale. */
function floorWholeDest(x: Ctx, th: ThingState): MachineId | 'scale' {
  const grade = pieceSpec(x.c, th.obj, th.cut)?.grade ?? '';
  for (const id of ['bench', 'stripper'] as MachineId[]) {
    if (x.s.machines[id]?.owned && machineInputs(x.c, x.s, id).includes(grade) && hopperRoom(x, id) > 0) return id;
  }
  return 'scale';
}

/** Grams still in a thing (its pieces not yet off, and its waste). */
function thingLeft_g(x: Ctx, th: ThingState): number {
  let g = x.c.objects[th.obj]?.waste_g ?? 0;
  const n = pieceCount(x.c, th.obj);
  for (let k = th.cut; k < n; k++) g += pieceSpec(x.c, th.obj, k)?.g ?? 0;
  return g;
}

/**
 * One trip of whole tier-0 things off the tipping floor (E35): the oldest such thing fixes where the trip
 * goes; more things for the same place join it while they fit his load (and the hopper's room); `waiting_g`
 * is all such things' grams (the heap the floor's pieces are weighed against). Null when none waits.
 */
function floorWholeTrip(x: Ctx, cap: number): { things: ThingState[]; dest: MachineId | 'scale'; g: number; waiting_g: number } | null {
  const cands = x.s.things
    .filter((th) => th.at.at === 'floor' && !th.by && !th.shell && (x.c.objects[th.obj]?.tier ?? 1) === 0 && thingLeft_g(x, th) <= cap)
    .sort((a, b) => (a.uid.length - b.uid.length) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  if (!cands.length) return null;
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

/** A yard hand's leg ends: pick (claimed items onto his carrier, then to the scale or the machine), or drop. */
function handLegEnd(x: Ctx, m: CrewMember, t: number): void {
  const s = x.s;
  const dest = m.dest ?? 'scale';
  if (m.phase === 'walkTo') {
    const at = posOf(x, m.to);
    const load: Piece[] = [];
    for (const c of m.claims) {
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
      const gp = s.pieces.find((p) => p.uid === c && p.claim === m.id);
      if (gp) {
        const p = takeFromPile(x, c);
        if (p) load.push(p);
        continue;
      }
      const th = thingOf(x, c);
      if (th && th.by === m.id) {
        const o = x.c.objects[th.obj];
        thingGone(x, th, m.id, t, true);
        load.push({ uid: th.uid, grade: o.whole!, g: o.gross_g, from: null, spec: -1, whole: th.obj });
      }
    }
    m.claims = [];
    m.load = load;
    m.carries = load[0]?.grade ?? null;
    for (const p of load) x.ev.push({ type: 'pickup', piece: p.uid, grade: p.grade, g: p.g, by: m.id });
    if (!load.length) {
      idle(m, t, at);
      return;
    }
    const to: Spot = dest === 'scale' ? { place: 'scale' } : { place: machinePlace(dest as MachineId) };
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
  const n = pieceCount(x.c, th.obj);
  for (let k = th.cut; k < n; k++) {
    const sp = pieceSpec(x.c, th.obj, k);
    if (sp) t += cutTime(x.c, th.obj, sp.g, P);
  }
  return Math.max(0, t - th.progress);
}

function cutterDepart(x: Ctx, m: CrewMember, t: number): boolean {
  const s = x.s;
  const P = cutterP(x, m);
  for (const where of ['dropoff', 'floor'] as const) {
    const cands = s.things.filter((th) => th.at.at === where && !th.by && !th.shell && (x.c.objects[th.obj]?.tier ?? 0) >= 1 && tierOf(x.c, th) <= s.tier);
    if (!cands.length) continue;
    const score = (th: ThingState) => (x.c.objects[th.obj]?.preparedValue ?? 0) / Math.max(1e-6, cutLeft(x, th, P));
    const th = cands.sort((a, b) => score(b) - score(a) || (a.uid < b.uid ? -1 : 1))[0];
    th.by = m.id;
    m.claims = [th.uid];
    m.cut = null;
    leg(x, m, where === 'dropoff' ? 'cutDropoff' : 'cutFloor', 'walkTo', { thing: th.uid }, t, 0);
    return true;
  }
  return false;
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
      x.ev.push({ type: 'pieceOff', thing: th.uid, piece: r.piece.uid, grade: r.piece.grade, g: r.piece.g, to: 'ground', by: m.id });
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
  if (m.role === 'hand') handLegEnd(x, m, t);
  else if (m.role === 'cutter') cutterLegEnd(x, m, t);
  else {
    m.t0 = t;
    m.t1 = t;
  }
}

/** Departures of idle agents in id order: cutters, then yard hands (2.12 order step 5). The driver is truck.ts's. */
export function crewDepart(x: Ctx, t: number): void {
  const G = globalThis as any;
  for (const m of x.s.crew) if (m.role === 'cutter' && m.phase === 'wait' && m.job === 'idle') { const ok = cutterDepart(x, m, t); if (G.__eg) G.__eg[(ok ? 'cutOk' : 'cutFail')]++; }
  for (const m of x.s.crew) if (m.role === 'hand' && m.phase === 'wait' && m.job === 'idle') { const ok = handDepart(x, m, t); if (G.__eg) G.__eg[(ok ? 'handOk' : 'handFail')]++; }
}

/** Is this crew member's leg pending (a dated end in the future or now)? */
export const crewPending = (m: CrewMember): boolean => m.phase !== 'wait' && m.t1 > m.t0 - 1e-9;

void atPlace;
void piecePos;
