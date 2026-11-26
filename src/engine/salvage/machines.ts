/**
 * Machines as rates (yard-stage1.md 2.5, 2.12): the strippers and the motor bench. A hopper holds whole
 * pieces up to `inbuf` kg; an idle machine takes the next piece into work; its outputs are credited to
 * the tray by the cumulative rule out_g = floor(share × processed) per grade from `work.startAt` at the
 * fixed `rate_kg_s` (plus `base_g` worked before a rate change), the piece's last credit giving the
 * exact remainder (the rest is waste), so ticking and jumping credit the same grams. A full tray stops
 * it, nothing lost. Owner: rules-sim. The crucible is crucible.ts's.
 */
import { boostFactor, boostOn, bossFresh, count, heard, type Ctx } from './clock';
import { machineInputs, machinePlace, machineShares, sumStock } from './content';
import { bossSees, grouping } from './group';
import { pointOf } from './positions';
import type { MachineId, MachineState, Piece } from './types';

export const RATE_MACHINES: readonly MachineId[] = ['hand_stripper', 'stripper', 'bench'];

type RateDef = { rate: number; inbuf: number; tray: number; lev?: number };

export function defOf(x: Ctx, id: MachineId): RateDef {
  return (x.c.machines as unknown as Record<string, RateDef>)[id];
}

/** Is the boss at a place (within reach.place of its footprint's edge), from the last presence sample? */
export function bossAt(x: Ctx, place: string, t: number, reach = x.c.reach.place): boolean {
  if (!bossFresh(x, t) || x.s.presence.driving || x.s.truck.by === 'boss') return false;
  return atPlace(x, place, x.s.presence.x, x.s.presence.y, reach);
}

/** Is (px, py) within `reach` of a place's footprint (content map.places, else its point)? */
export function atPlace(x: Ctx, place: string, px: number, py: number, reach = x.c.reach.place): boolean {
  const pt = x.c.map.points[place];
  if (!pt) return false;
  const pl = x.c.map.places[place];
  const w = pl?.w ?? 0;
  const d = pl?.d ?? 0;
  const dx = Math.max(0, Math.abs(px - pt[0]) - w / 2);
  const dy = Math.max(0, Math.abs(py - pt[1]) - d / 2);
  return Math.hypot(dx, dy) <= reach;
}

/** The rate now, kg/s (2.12): rate × (1 + lev × (L − 1)); the hand stripper only while the boss stands at it (R1); 0 when not owned. */
export function rateOf(x: Ctx, id: MachineId, t: number): number {
  const m = x.s.machines[id];
  if (!m.owned) return 0;
  const d = defOf(x, id);
  const base = d.rate * (1 + (d.lev ?? 0) * Math.max(0, m.level - 1)) * boostFactor(x, t);
  if (id === 'hand_stripper') return bossAt(x, machinePlace(id), t) ? base : 0;
  return base;
}

/** Re-rate every machine with a piece in work (a level, the foreman's boost starting or ending). */
export function rerateAll(x: Ctx, t: number): void {
  for (const id of RATE_MACHINES) if (x.s.machines[id].work) rerate(x, id, t);
}

/**
 * The boss worked at t (a cut, a feed, a weigh-in, the hand stripper; 2.6): the foreman's window restarts;
 * when the boost was off it starts now and the machines are re-rated (crew take it from their next leg).
 */
export function bossWorked(x: Ctx, t: number): void {
  const fm = x.s.foreman;
  if (fm.day !== x.s.clock.day) {
    fm.day = x.s.clock.day;
    fm.used_s = 0;
  }
  const was = boostOn(x, t);
  fm.lastWorkAt = t;
  if (!was && boostOn(x, t)) rerateAll(x, t);
}

export const hopper_g = (m: MachineState): number => m.hopper.reduce((a, p) => a + p.g, 0);

/** Room in the hopper, grams (the piece in work counts against inbuf too). */
export function hopperRoom(x: Ctx, id: MachineId): number {
  const m = x.s.machines[id];
  return defOf(x, id).inbuf * 1000 - hopper_g(m) - (m.work ? m.work.piece.g - (m.work.base_g ?? 0) : 0);
}

/**
 * A rate machine's input grades as a set (content.ts machineInputs, memoised per content: the strippers'
 * and the bench's inputs depend on the content only; a yard hand's departure asks this per piece).
 */
const INPUTS = new WeakMap<object, Map<MachineId, Set<string>>>();
export function inputSet(x: Ctx, id: Exclude<MachineId, 'crucible'>): Set<string> {
  let byId = INPUTS.get(x.c);
  if (!byId) INPUTS.set(x.c, (byId = new Map()));
  let set = byId.get(id);
  if (!set) byId.set(id, (set = new Set(machineInputs(x.c, x.s, id))));
  return set;
}

/** May this piece go into the machine's hopper now (its input, owned, room for it whole)? */
export function accepts(x: Ctx, id: MachineId, p: Piece): boolean {
  if (id === 'crucible') return false;
  const m = x.s.machines[id];
  if (!m.owned) return false;
  return inputSet(x, id).has(p.grade) && hopperRoom(x, id) >= p.g;
}

/** Which rate machine a piece goes to (the powered stripper fed first, 2.5), or null. */
export function machineFor(x: Ctx, p: Piece): MachineId | null {
  for (const id of ['stripper', 'hand_stripper', 'bench'] as MachineId[]) if (accepts(x, id, p)) return id;
  return null;
}

/** content.ts machineShares, memoised per content, machine and input grade (a pure function of the content; read only). */
const SHARES = new WeakMap<object, Map<string, [string, number][]>>();
function sharesOf(x: Ctx, id: MachineId, input: string): [string, number][] {
  let m = SHARES.get(x.c);
  if (!m) SHARES.set(x.c, (m = new Map()));
  const k = `${id}|${input}`;
  let v = m.get(k);
  if (!v) m.set(k, (v = machineShares(x.c, id, input)));
  return v;
}

/** Processed grams of the piece in work at yard second t. */
function processed(m: MachineState, t: number): number {
  const w = m.work!;
  return Math.min(w.piece.g, (w.base_g ?? 0) + Math.max(0, t - w.startAt) * w.rate_kg_s * 1000);
}

/** Credit a machine's work to yard second t by the cumulative rule (nothing at a rate of 0). */
export function credit(x: Ctx, id: MachineId, t: number): void {
  const m = x.s.machines[id];
  const w = m.work;
  if (!w) return;
  const done = processed(m, t);
  for (const [g, share] of sharesOf(x, id, w.piece.grade)) {
    const target = Math.floor(share * done + 1e-6);
    const add = target - (w.credited[g] ?? 0);
    if (add > 0) {
      w.credited[g] = (w.credited[g] ?? 0) + add;
      m.tray_g[g] = (m.tray_g[g] ?? 0) + add;
    }
  }
}

/** The piece in work ends at (null when the rate is 0 or nothing works). */
export function workEndsAt(m: MachineState): number | null {
  const w = m.work;
  if (!w || w.rate_kg_s <= 0) return null;
  return w.startAt + (w.piece.g - (w.base_g ?? 0)) / (w.rate_kg_s * 1000);
}

/** A rate change at t (the boss left the hand stripper, a level): credit to t and restart the segment from it. */
export function rerate(x: Ctx, id: MachineId, t: number): void {
  const m = x.s.machines[id];
  if (!m.work) {
    start(x, id, t);
    return;
  }
  const r = rateOf(x, id, t);
  if (Math.abs(r - m.work.rate_kg_s) < 1e-12) return;
  credit(x, id, t);
  m.work.base_g = processed(m, t);
  m.work.startAt = t;
  m.work.rate_kg_s = r;
  const status = r > 0 ? 'working' : 'waiting';
  if (m.status !== status) {
    m.status = status;
    m.since = t;
    x.ev.push({ type: 'machineState', machine: id, status });
  }
}

const trayFull = (x: Ctx, id: MachineId): boolean => sumStock(x.s.machines[id].tray_g) - sumStock(x.s.machines[id].trayClaim_g) >= defOf(x, id).tray * 1000;

/** An idle machine takes the next piece from its hopper (unless its tray is full). */
export function start(x: Ctx, id: MachineId, t: number): void {
  const m = x.s.machines[id];
  if (!m.owned || m.work) return;
  let status: MachineState['status'] = 'idle';
  if (m.hopper.length) {
    if (trayFull(x, id)) status = 'trayFull';
    else {
      let piece = m.hopper.shift()!;
      const r = rateOf(x, id, t);
      // 2.1: a segment started with no boss within sight of the machine takes every hopper piece of its
      // grade with it (one dated end; credited by the cumulative rule over their summed grams). The hand
      // stripper runs only while the boss stands at it, so it is never grouped.
      let n = 1;
      if (id !== 'hand_stripper' && m.hopper.length && grouping(x) && !bossSees(x, t, [], [machinePlace(id)])) {
        let g = piece.g;
        const rest: Piece[] = [];
        for (const q of m.hopper) {
          if (q.grade === piece.grade) {
            g += q.g;
            n++;
          } else rest.push(q);
        }
        if (n > 1) {
          m.hopper = rest;
          piece = { ...piece, g };
        }
      }
      m.work = { piece, startAt: t, rate_kg_s: r, credited: {}, base_g: 0, ...(n > 1 ? { n } : {}) };
      status = r > 0 ? 'working' : 'waiting';
    }
  }
  if (m.status !== status) {
    m.status = status;
    m.since = t;
    x.ev.push({ type: 'machineState', machine: id, status });
  }
}

/** The piece in work is done at t: the exact remainder credited, the rest waste; the next piece starts. */
export function finishPiece(x: Ctx, id: MachineId, t: number): void {
  const m = x.s.machines[id];
  const w = m.work;
  if (!w) return;
  let outSum = 0;
  for (const [g, share] of sharesOf(x, id, w.piece.grade)) {
    const total = Math.floor(share * w.piece.g + 1e-6);
    const add = total - (w.credited[g] ?? 0);
    if (add > 0) m.tray_g[g] = (m.tray_g[g] ?? 0) + add;
    outSum += total;
    if (total > 0) {
      if (heard(x)) x.ev.push({ type: 'machineOut', machine: id, grade: g, g: total });
      count(x, `made:${g}`);
    }
  }
  x.s.waste_g += w.piece.g - outSum;
  m.work = null;
  count(x, `worked:${id}`, w.n ?? 1);
  start(x, id, t);
}

/** Put a piece into a machine's hopper (the caller checked `accepts`); an idle machine starts. */
export function feedPiece(x: Ctx, id: MachineId, p: Piece, by: string, t: number): void {
  const m = x.s.machines[id];
  m.hopper.push(p);
  if (heard(x)) x.ev.push({ type: 'feed', machine: id, piece: p.uid, grade: p.grade, g: p.g, by });
  if (!m.work) start(x, id, t);
}

/** Take a tray's mass as whole pieces (one per grade) up to `room` grams: uids `${machine}.t${n}`. */
export function takeTray(x: Ctx, id: MachineId, room: number, t: number, claimed = false): Piece[] {
  const m = x.s.machines[id];
  const out: Piece[] = [];
  const grades = Object.keys(m.tray_g).sort((a, b) => (x.c.grades[b]?.pbar ?? 0) - (x.c.grades[a]?.pbar ?? 0));
  let left = room;
  for (const g of grades) {
    const avail = (m.tray_g[g] ?? 0) - (claimed ? 0 : (m.trayClaim_g[g] ?? 0));
    const take = Math.min(avail, left);
    if (take <= 0) continue;
    m.tray_g[g] -= take;
    if (m.tray_g[g] <= 0) delete m.tray_g[g];
    left -= take;
    const n = (x.s.counts![`tray:${id}`] ?? 0) + 1;
    x.s.counts![`tray:${id}`] = n;
    out.push({ uid: `${id}.t${n}`, grade: g, g: take, from: id, spec: -1 });
  }
  if (out.length && m.status === 'trayFull') start(x, id, t);
  return out;
}

/** Grams a tray holds that nobody has claimed. */
export function trayFree(x: Ctx, id: MachineId): number {
  const m = x.s.machines[id];
  return Math.max(0, sumStock(m.tray_g) - sumStock(m.trayClaim_g));
}

/** Machine positions for legs. */
export function machinePoint(x: Ctx, id: MachineId): { x: number; y: number } {
  return pointOf(x.c, machinePlace(id));
}
