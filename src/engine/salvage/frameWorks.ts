/**
 * WHAT THE WORLD DRAWS OF THE WORKS (stage 2, yard-stage2.md 2.18's FrameTable additions, 4.3, 4.6, 4.7):
 * the plates (FrameTable.works), the tags on things, the magnet crane, the forklift, the visitors, the van,
 * the picking table. Owner: rules-works (Phase B). frame.ts `frameCfg` is the closed dispatcher (s2a-fix, the
 * lead's ruling of 26 Nov 09:50): it builds the first yard's table, then hands it here to ADD these fields.
 * Pure: a function of the content and the state; never a tuned number of its own.
 *
 * PHASE A STUB otherwise: the plates, tags, crane, visitors and the table are Phase C's (the frame is the first yard's).
 *
 * E2 (RULING2 22, lesson 12): THE BOSS IN THE FORKLIFT. In it his acts are the forklift's (forklift.ts forkliftStep):
 * he cuts no oversize piece, sorts no picking table, picks nothing up. So that a boss who stands still and does
 * nothing is never left without a reason on screen: while he sits in it the one button is Step out
 * (actionsWorks.ts stepOutForklift), and standing within reach of an oversize piece or at the picking table the
 * frame carries the refusal `refusal.inForklift` ("Step out of the forklift first"; its words are asked of the
 * words' owner, requests.md 27 Nov: shown once the key exists).
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { nearPlace, pointOf, thingPos } from './positions';
import { TEXT_KEYS } from './textKeys';
import { worksOpened } from './layer';
import { gateRefusal, gateRung, shopItem, topRungOf } from './ladder';
import { carDueAt, carLabelPrice, lineOf, pieceEndsAt, recoveryOf } from './works';
import { lotsWaiting } from './lots';
import { rackCap } from './reuse';
import { thingsAt } from './lookup';
import { hallWhy, heatView } from './heatView';
import type { Ctx } from './clock';
import type { FrameLine, FrameTable, FrameVisitor, FrameWorks, PlateId, RecoveryView, SalvageGame, TextKey, Txt, WorksLook, WorksState } from './types';

const IN_FORKLIFT = 'refusal.inForklift';
const HAS_IN_FORKLIFT = (Object.values(TEXT_KEYS) as readonly (readonly string[])[]).some((ks) => ks.includes(IN_FORKLIFT));

/**
 * Add the works' fields to the frame `f` of game g (content c: the state's own, layer.ts contentAt).
 *
 * C-FRAMEWORKS (PLAN2 2.2, batch 0b; s2c-plan-world.md 2.2 and 2.4, s2c-plan-wiring.md a.1): from the works' opening
 * (layer.ts worksOpened) the frame carries the works as dated rules data. Below the opening NOTHING is added (the first
 * yard's frame is today's, field for field: BASELINE's snap.mts check). Every look is a pure function of the state and
 * holds for its whole span (the rules decide, the screen follows: lesson 13); every thing that stands still carries its
 * reason in words (`why`), from the rules' own predicates. Nothing is written for a dark item (a plate whose shop item
 * is gated past the stage's top rung, or not sold at all).
 */
export function frameWorks(c: SalvageContent, g: SalvageGame, f: FrameTable): void {
  const s = g.salvage;
  if (s.forklift?.by === 'boss') {
    f.boss.button = 'stepOut';
    if (HAS_IN_FORKLIFT && !f.boss.refusal && forkliftBlocks(c, g)) f.boss.refusal = { key: IN_FORKLIFT as TextKey };
  }
  if (!worksOpened(s) || !c.works) return;
  worksTable(c, g, f);
}

// ------------------------------------------------------------------------------------------- C-FRAMEWORKS (batch 0b)

/** A read-only Ctx over the state as it stands (no clone: only the rules' READ functions are given it). */
function readCtx(c: SalvageContent, g: SalvageGame): Ctx {
  const s = g.salvage;
  return { cfg: { mode: 'salvage', salvage: c } as unknown as Ctx['cfg'], c, s, cash: g.cash, earned: 0, ev: [], live: false, ms0: s.clock.highMs, t0: s.t, away: null, dirty: false, prices: new Map(), rung0: s.ladder.rung };
}

const SOLD = new WeakMap<SalvageContent, readonly PlateId[]>();
/**
 * The plates the stage sells, in content order: a plate whose shop item's gate is within the stage's top rung (ladder.ts
 * topRungOf), and the plates that come `with` such a plate (the line's depollution bay). Memoised per content. A plate a
 * save owns is drawn whatever its gate (frameWorks adds it).
 */
export function soldPlates(c: SalvageContent): readonly PlateId[] {
  let out = SOLD.get(c);
  if (out) return out;
  const ps = c.works?.plates ?? {};
  const top = topRungOf(c);
  const sold = new Set<string>();
  for (const id in ps) {
    const it = shopItem(c, id);
    if (it && it.kind === 'works' && gateRung(it.gate) <= top) {
      sold.add(id);
      for (const q of ps[id].with ?? []) sold.add(q);
    }
  }
  out = Object.keys(ps).filter((id) => sold.has(id));
  SOLD.set(c, out);
  return out;
}

const secsTo = (at: number, t: number) => ({ secs: Math.max(0, Math.ceil(at - t - 1e-9)) });
const key = (k: string, args?: Txt['args']): Txt => (args ? { key: k as TextKey, args } : { key: k as TextKey });

/** Metres along a polyline. */
function pathLen(p: readonly (readonly [number, number])[]): number {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return L;
}

/**
 * Why the garage's recovery truck brings no car to station `id` now (RecoveryView; works.ts carRecover's own predicates:
 * the car's due date carDueAt, the apron taken by a car, the car's label price against the cash less the driver's reserve).
 * 'coming' and arrivesAt are FIX-PASS's (D2): never written here.
 */
export function recoveryView(x: Ctx, id: PlateId, w: WorksState, t: number): RecoveryView {
  const due = carDueAt(x, id, w);
  const none: RecoveryView = { nextAt: null, waitsFor: null, arrivesAt: null, short: null };
  if (due === null) return none;
  const nextAt = Number.isFinite(due) ? due : null;
  for (const th of thingsAt(x.s.things, 'apron')) if (th.at.at === 'apron' && th.at.plate === id) return { ...none, nextAt, waitsFor: 'apron' };
  if (nextAt !== null && nextAt > t + 1e-9) return { ...none, nextAt, waitsFor: 'period' };
  const price = carLabelPrice(x, id, t);
  const can = x.cash - (x.s.truck.earmark?.money ?? 0);
  if (price !== null && price > can + 1e-9) return { ...none, nextAt, waitsFor: 'cash', short: price - can };
  return { ...none, nextAt };
}

/** The words of a RecoveryView (s2c-plan-world 2.4: "Next car in {t}", "Next car when cash is §x", "Apron taken"), or null. */
function recoveryWhy(x: Ctx, id: PlateId, rv: RecoveryView, t: number): Txt | null {
  if (rv.waitsFor === 'apron') return key('plate.works.apronTaken');
  if (rv.waitsFor === 'period' && rv.nextAt !== null) return key('plate.works.nextCar', { t: secsTo(rv.nextAt, t) });
  if (rv.waitsFor === 'cash') {
    const p = carLabelPrice(x, id, t);
    return p !== null ? key('plate.works.carCash', { x: { money: p } }) : null;
  }
  return null;
}

/** The first input of a plate that is a grade (its "Waiting for {grade}"), or null. */
function firstGrade(c: SalvageContent, id: PlateId): string | null {
  for (const k of c.works?.plates[id]?.in ?? []) if (c.grades[k]) return k;
  // A plate fed by another's stream (the eddy current by the shredder: `feeds`) waits for what that plate takes.
  const ps = c.works?.plates ?? {};
  for (const q in ps) if (q !== id && Object.values(ps[q].feeds ?? {}).includes(id)) return firstGrade(c, q);
  return null;
}

/** Does the yard own a line of a lot kind (lots.ts ownsLine's rule; a [seam] asks lots.ts to export it): a first-yard machine owned or a plate ordered; none named: always. */
function ownsLine(s: SalvageGame['salvage'], line: readonly string[]): boolean {
  if (!line.length) return true;
  for (const id of line) if ((s.machines as Record<string, { owned: boolean } | undefined>)[id]?.owned || s.works[id]) return true;
  return false;
}

/** The plot of a sold or owned plate (FrameWorks), every field from the rules' state at yard second t. */
function plotOf(c: SalvageContent, g: SalvageGame, x: Ctx, id: PlateId, rv: RecoveryView | null, stationOf: Map<PlateId, PlateId>): FrameWorks | null {
  const s = g.salvage;
  const t = s.t;
  const d = c.works!.plates[id];
  if (!d) return null;
  const p = pointOf(c, d.plot);
  const w = s.works[id];
  const out: FrameWorks = { plate: id, place: d.plot, look: 'buyable', x: p.x, y: p.y, ring: null, bankRing: null, span: null, trayShare: 0, why: null, startsAt: null };
  if (!w) {
    // Not ordered: the line's own item for a plate that comes `with` it (its gate, needs and price are the line's).
    const lead = lineOf(c, id)[0];
    const it = shopItem(c, lead);
    const gate = it ? gateRefusal(c, g, it.gate) : null;
    const needs = c.works!.plates[lead]?.needs ?? it?.needsItem ?? null;
    if (gate) {
      out.look = 'padlock';
      out.why = key('plate.works.opensRung', { n: { n: gateRung(it!.gate) }, x: { money: it!.price } });
    } else if (needs && !s.works[needs]) {
      out.look = 'padlock';
      out.why = key('refusal.needsItem', { item: { text: `title.works.${needs}` as TextKey } });
    }
    return out;
  }
  if (w.phase === 'arriving') {
    out.look = 'arriving';
    out.span = w.commissionAt !== null ? { t0: w.since, t1: w.commissionAt } : null;
    out.why = key('plate.works.arriving');
    return out;
  }
  if (w.phase === 'installed') {
    out.look = 'installed';
    out.startsAt = w.commissionAt;
    out.span = w.commissionAt !== null ? { t0: w.since, t1: w.commissionAt } : null;
    if (s.act.kind === 'commission' && s.act.target === id && s.act.endsAt !== null) out.ring = { t0: s.act.since, t1: s.act.endsAt, p0: 0 };
    out.why = w.commissionAt !== null ? key('plate.works.selfStart', { t: secsTo(w.commissionAt, t) }) : key('plate.works.commission', { n: { n: c.works!.commission_s } });
    return out;
  }
  // Running.
  const trayCap = d.tray * 1000;
  if (trayCap > 0) {
    let tg = 0;
    for (const k in w.tray_g) tg += w.tray_g[k];
    out.trayShare = Math.min(1, tg / trayCap);
  }
  if (d.kind === 'batch') {
    const v = heatView(c, s, id, t);
    if (!v) return out;
    out.heat = v;
    out.look = ({ empty: 'idle', filling: 'idle', heating: 'heating', ready: 'ready', pour: 'pour', cooling: 'cooling' } as const)[v.phase];
    out.span = v.span;
    out.why = hallWhy(c, s, g.cash, id, v, t);
    return out;
  }
  if (d.kind === 'assay') {
    // The analyser works on demand at the scale house (no hopper, nothing waits): started up, it is on.
    out.look = 'working';
    return out;
  }
  if (d.kind === 'handling') {
    const mv = w.move;
    if (mv) {
      out.look = 'working';
      out.span = { t0: mv.t0, t1: mv.end };
    } else {
      out.look = 'idle';
      out.why = key('card.crewWhy.uncut');
    }
    return out;
  }
  if (d.kind === 'station') {
    if (w.car) {
      out.look = 'working';
      out.span = { t0: w.car.t0, t1: w.car.end };
      return out;
    }
    out.look = 'idle';
    out.why = (rv ? recoveryWhy(x, id, rv, t) : null) ?? (rv && rv.waitsFor === null && rv.nextAt === null && recoveryOf(c, id) ? key('plate.works.nextCar', { t: { secs: 0 } }) : key('card.works.noCar'));
    return out;
  }
  // A rate plate: its status (works.ts setStatus).
  if (w.status === 'working' && w.work) {
    out.look = 'working';
    const end = pieceEndsAt(w);
    out.span = end !== null ? { t0: w.work.startAt, t1: end } : null;
    return out;
  }
  if (w.status === 'trayFull') {
    out.look = 'trayFull';
    out.why = key('plate.works.trayFull');
    return out;
  }
  out.look = 'idle';
  // A plate of the line waits for the car the recovery truck does not bring (its period or the cash): the line's reason.
  const st = stationOf.get(id);
  const lineWhy = st && rv && (rv.waitsFor === 'period' || rv.waitsFor === 'cash') && !s.works[st]?.car ? recoveryWhy(x, st, rv, t) : null;
  const gr = firstGrade(c, id);
  out.why = lineWhy ?? (gr ? key('plate.works.waiting', { grade: { grade: gr } }) : key('card.crewWhy.uncut'));
  return out;
}

/** The works' fields of the frame (see frameWorks). */
function worksTable(c: SalvageContent, g: SalvageGame, f: FrameTable): void {
  const s = g.salvage;
  const t = s.t;
  const x = readCtx(c, g);
  const W = c.map.works;

  // THE LINE (FrameTable.line): the truck-fed station (the depollution bay) owned, its line's lead (the shredder).
  let line: FrameLine | undefined;
  let rv: RecoveryView | null = null;
  const stationOf = new Map<PlateId, PlateId>();
  for (const id in s.works) {
    if (!recoveryOf(c, id)) continue;
    const w = s.works[id];
    rv = recoveryView(x, id, w, t);
    for (const q of lineOf(c, id)) stationOf.set(q, id);
    let car: FrameLine['car'] = null;
    for (const th of thingsAt(s.things, 'apron')) {
      if (th.at.at !== 'apron' || th.at.plate !== id) continue;
      car = w.car && w.car.thing === th.uid ? { uid: th.uid, stage: 'draining', span: { t0: w.car.t0, t1: w.car.end } } : { uid: th.uid, stage: 'whole', span: null };
      break;
    }
    const lead = lineOf(c, id)[0];
    const lw = lead !== id ? s.works[lead] : undefined;
    const end = lw?.work ? pieceEndsAt(lw) : null;
    line = { car, shredding: lw?.work && end !== null ? { t0: lw.work.startAt, t1: end } : null, recovery: rv };
    break;
  }
  if (line) f.line = line;

  // THE PLOTS (FrameTable.works): every sold plate, and every plate the save owns.
  const ids = [...soldPlates(c)];
  for (const id in s.works) if (!ids.includes(id) && c.works!.plates[id]) ids.push(id);
  const works: FrameWorks[] = [];
  for (const id of ids) {
    const pl = plotOf(c, g, x, id, stationOf.has(id) ? rv : null, stationOf);
    if (pl) works.push(pl);
  }
  f.works = works;

  // THE OVERSIZE PAD (lots.ts): pieces waiting, its places, the next piece's date, and why nothing comes.
  if (c.lots && s.lots) {
    const n = lotsWaiting(x);
    const max = c.lots.max;
    const nextAt = s.lots.nextAt;
    let why: Txt | null = null;
    if (s.act.kind !== 'lot') {
      const opens = c.lots.kinds.some((k) => {
        const o = c.objects[k.obj];
        return !!o && o.tier <= s.tier && ownsLine(s, k.line);
      });
      if (n >= max) why = key('plate.pad.full', { n: { n }, m: { n: max } });
      else if (!opens) why = key('plate.pad.noKind');
      else if (nextAt !== null) why = key('plate.pad.next', { t: secsTo(nextAt, t) });
    }
    f.pad = { n, max, nextAt, why };
  }

  // THE YARD SALE'S RACK (reuse.ts): things set out, its places, the next visitor (only while it holds a thing).
  const racked = c.reuse && s.reuse ? thingsAt(s.things, 'rack') : [];
  if (c.reuse && s.reuse) {
    const n = racked.length;
    const nextVisitorAt = n > 0 ? s.reuse.nextAt : null;
    const why = n === 0 ? key('plate.rack.empty') : nextVisitorAt !== null ? key('plate.rack.next', { t: secsTo(nextVisitorAt, t) }) : null;
    f.rack = { n, max: rackCap(x), nextVisitorAt, why };
  }

  // THE WORKS' BUNKERS (content grades.<id>.bay.kind 'bunker'): their kilograms, their capacity, "Full · sold at the next round".
  let kg = 0;
  let max_kg = 0;
  let full = false;
  let any = false;
  for (const gr in c.grades) {
    if ((c.grades[gr].bay as { kind?: string } | undefined)?.kind !== 'bunker') continue;
    any = true;
    const have = s.bays[gr]?.g ?? 0;
    kg += have / 1000;
    const cap = c.bays[gr];
    if (cap !== undefined) {
      max_kg += cap;
      if (have >= cap * 1000 - 1e-6) full = true;
    }
  }
  if (any) f.bunker = { kg, max_kg, why: full ? key('plate.bunker.full') : null };

  // THE PICKING TABLE (crate.ts): things on it and its places.
  if (c.crate) {
    const cp = pointOf(c, 'crate');
    f.crate = { x: cp.x, y: cp.y, n: thingsAt(s.things, 'crate').length, max: c.crate.max };
  }

  // THE VISITORS (reuse.ts visitorBuys): the sale at reuse.nextAt is certain once the rack holds a thing, so the walk in is
  // dated back from it; the walk out from each sale's ticket. A walk is the visitor path at a yard hand's pace (crew.hand.v).
  if (c.reuse && s.reuse && W?.visitorPath) {
    const walk = pathLen(W.visitorPath) / Math.max(1e-6, c.crew.hand.v);
    const visitors: FrameVisitor[] = [];
    for (const tk of s.tickets) {
      if (tk.kind !== 'rackSale' || tk.at > t + 1e-9 || tk.at + walk <= t) continue;
      visitors.push({ id: `visitor.${tk.uid}`, t0: tk.at - walk, payAt: tk.at, t1: tk.at + walk, obj: tk.thing, g: c.objects[tk.thing]?.gross_g ?? 0 });
    }
    const at = s.reuse.nextAt;
    if (racked.length && at !== null && t >= at - walk - 1e-9) {
      let old = racked[0];
      for (const q of racked) {
        const a = q.at as { since: number };
        const b = old.at as { since: number };
        if (a.since < b.since || (a.since === b.since && q.uid < old.uid)) old = q;
      }
      if (!visitors.some((v) => v.id === `visitor.${old.uid}`)) visitors.push({ id: `visitor.${old.uid}`, t0: at - walk, payAt: at, t1: at + walk, obj: old.obj, g: c.objects[old.obj]?.gross_g ?? 0 });
    }
    f.visitors = visitors;
  }

  // THE RECLAMATION DEALER'S VAN (reuse.ts vanCollects at reuse.vanAt): in to its lane stop before the date, loading after it
  // (two people to the corner and back along the van path), out. The drive is the lane from its nearest site at the
  // lane's pace (STAND-IN until a content key: a [seam] line), the load the van path there and back at a hand's pace.
  if (c.reuse && s.reuse && W?.vanPath) {
    const stopXY = W.laneStops?.van ?? W.vanPath[0];
    const stop = { x: stopXY[0], y: stopXY[1] };
    const laneMin = Math.min(...Object.values({ ...c.map.lane, ...(W.lane ?? {}) }).filter((v) => v > 0));
    const drive = Number.isFinite(laneMin) ? laneMin / Math.max(1e-6, c.truck.v) : 0;
    const load = (2 * pathLen(W.vanPath)) / Math.max(1e-6, c.crew.hand.v) + c.crew.hand.handle_s;
    let van: FrameTable['van'] = null;
    let last: number | null = null;
    for (const tk of s.tickets) if (tk.kind === 'vanCollection' && tk.at <= t + 1e-9 && (last === null || tk.at > last)) last = tk.at;
    if (last !== null && t < last + load) van = { phase: 'load', span: { t0: last, t1: last + load }, stop };
    else if (last !== null && t < last + load + drive) van = { phase: 'out', span: { t0: last + load, t1: last + load + drive }, stop };
    else if (s.reuse.vanAt !== null && t >= s.reuse.vanAt - drive - 1e-9) van = { phase: 'in', span: { t0: s.reuse.vanAt - drive, t1: s.reuse.vanAt }, stop };
    f.van = van;
  }

  // FIXTURES: the analyser's cradle at its plot (dark until it is started up, then lit) and the plasma cutter on the tool rack once owned.
  for (const id in s.works) {
    const d = c.works!.plates[id];
    if (d?.kind !== 'assay' || s.works[id].phase === 'arriving') continue;
    const p = pointOf(c, d.plot);
    f.fixtures.push({ id: 'works.analyser.cradle', sprite: s.works[id].phase === 'running' ? 'works.analyser.cradle.lit' : 'works.analyser.cradle.dark', x: p.x, y: p.y });
    break;
  }
  for (const k in c.tools) {
    if (c.tools[k].tier < 4 || !s.owned.includes(k)) continue;
    const it = shopItem(c, k);
    const rp = pointOf(c, it?.place ?? 'rack');
    f.fixtures.push({ id: 'works.plasma.rack', sprite: 'works.plasma.rack', x: rp.x, y: rp.y });
    break;
  }
}

/** The plot looks a test may expect to carry no standing reason (the plate works, heats or pours). */
export const WORKING_LOOKS: ReadonlySet<WorksLook> = new Set<WorksLook>(['working', 'heating', 'pour']);

/**
 * Is the boss, sitting in the forklift, where on foot he would cut an oversize piece or sort the picking table (the
 * lots' reach.work of a lot's footprint; the table within reach.place)? The rules' own nearness (lots.ts, crate.ts).
 */
export function forkliftBlocks(c: SalvageContent, g: SalvageGame): boolean {
  const s = g.salvage;
  if (s.forklift?.by !== 'boss') return false;
  const p = s.presence;
  if (c.crate && s.things.some((th) => th.at.at === 'crate') && nearPlace(c, 'crate', p.x, p.y, c.reach.place)) return true;
  for (const th of s.things) {
    if (th.at.at !== 'lot') continue;
    const o = c.objects[th.obj];
    if (!o) continue;
    const q = thingPos(c, th.at);
    if (Math.hypot(Math.max(0, Math.abs(p.x - q.x) - o.size.w / 2), Math.max(0, Math.abs(p.y - q.y) - o.size.d / 2)) <= c.reach.work) return true;
  }
  return false;
}
