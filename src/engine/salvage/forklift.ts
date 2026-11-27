/**
 * THE FORKLIFT (stage 2, docs/design/yard-stage2.md 2.9): the boss's only, entered by walking into it and
 * left with "Step out"; whole things and pieces up to `forklift.load`, a car from the car pad onto the
 * depollution apron; `SalvageState.forklift` (null until owned). Owner: rules-works (Phase B).
 *
 * THE RULE AS BUILT (wave 2, 26 Nov; hand.ts bossStep calls forkliftStep after the truck's step, s2a-fix):
 * - Owned (works.ts worksOwn): parked on its bay. A fresh boss who walks within truck.enter of it (not at the
 *   truck's wheel, the forklift empty of anyone) is in it (`by` 'boss', event `forklift` on); after Step out
 *   (actionsWorks.ts stepOutForklift) entering is armed again once he is farther than truck.enter + truck.rearm.
 * - In it, the forklift is where the boss is (the world drives it as it drives the truck) and his acts are the
 *   forklift's: standing still on the car pad (within reach.place) with the forks empty he lifts the car; standing
 *   still at a running station plate's apron whose apron is free he sets it there (a car reaches an apron only so,
 *   T1). Nothing else is carried in this stage (hoppers by forklift: not built).
 * - The forks hold at most forklift.load kg. Nothing is dated: every move is a presence step (live only).
 */
import type { Ctx } from './clock';
import { bossFresh } from './clock';
import { plateDef } from './content';
import { nearPlace } from './positions';
import { carStart, plateIds } from './works';
import { pushThing, spliceThing, thingsAt } from './lookup';

/** The boss in (or entering) the forklift at yard second t: true when this step was the forklift's. */
export function forkliftStep(x: Ctx, t: number): boolean {
  const f = x.s.forklift;
  if (!f || !bossFresh(x, t)) return false;
  const p = x.s.presence;
  const c = x.c;
  if (f.by !== 'boss') {
    const d = Math.hypot(p.x - f.x, p.y - f.y);
    if (x.s.counts!['forklift:out'] && d > c.truck.enter + c.truck.rearm) delete x.s.counts!['forklift:out'];
    if (x.s.truck.by === 'boss' || x.s.counts!['forklift:out'] || d > c.truck.enter) return false;
    f.by = 'boss';
    x.s.act = { kind: 'none', target: null, since: t, endsAt: null };
    x.ev.push({ type: 'forklift', on: true });
    x.dirty = true;
    return true;
  }
  f.x = p.x;
  f.y = p.y;
  if (p.heading !== undefined) f.heading = p.heading;
  if (p.moving) return true;
  const reach = c.reach.place;
  const capG = (c.forklift?.load ?? 0) * 1000;
  if (!f.load.length) {
    const car = thingsAt(x.s.things, 'elvPad').find((q) => q.at.at === 'elvPad' && !q.by);
    const o = car ? c.objects[car.obj] : undefined;
    if (car && o && o.gross_g <= capG && nearPlace(c, 'elvPad', p.x, p.y, reach)) {
      spliceThing(x.s.things, x.s.things.indexOf(car));
      f.load.push({ uid: car.uid, grade: o.shell?.grade ?? o.pieces[0]?.[0] ?? 'waste', g: o.gross_g, from: null, spec: -1, whole: car.obj });
      x.ev.push({ type: 'pickup', piece: car.uid, grade: f.load[0].grade, g: o.gross_g, by: 'boss' });
      x.dirty = true;
    }
    return true;
  }
  const load = f.load[0];
  for (const id of plateIds(x)) {
    const w = x.s.works[id];
    const d = plateDef(c, id);
    if (!w || w.phase !== 'running' || !d || d.kind !== 'station' || d.feedBy !== 'forklift' || !load.whole || !d.in.includes(load.whole)) continue;
    if (thingsAt(x.s.things, 'apron').some((q) => q.at.at === 'apron' && q.at.plate === id)) continue;
    if (!nearPlace(c, `${id}.apron`, p.x, p.y, reach)) continue;
    f.load = [];
    pushThing(x.s.things, { uid: load.uid, obj: load.whole, at: { at: 'apron', plate: id }, cut: 0, progress: 0, by: null });
    // The bay starts on it at this instant (its drain dated: works.ts carStart).
    if (!w.car) carStart(x, id, w, t);
    x.dirty = true;
    return true;
  }
  return true;
}

/** Step out of the forklift (actionsWorks.ts stepOutForklift): parked where it stands, its load kept on the forks. */
export function forkliftOut(x: Ctx): boolean {
  const f = x.s.forklift;
  if (!f || f.by !== 'boss') return false;
  f.by = null;
  x.s.counts!['forklift:out'] = 1;
  x.s.act = { kind: 'none', target: null, since: x.s.t, endsAt: null };
  x.ev.push({ type: 'forklift', on: false });
  x.dirty = true;
  return true;
}
