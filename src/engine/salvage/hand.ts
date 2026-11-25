/**
 * The hand: the boss's acts from presence (yard-stage1.md 2.1, 2.12 "The boss", D12, S9). Work needs no
 * button: within reach.work of a workable thing with the stick released for feel.workDelay he works the
 * nearest with his best tool; moving cancels and keeps the progress on that thing. Pickup is automatic
 * within reach.pickup, moving or still, one piece every pick_s, best per kilogram first (cable at its
 * copper, ties heavier); the swap trades the lowest carried piece for a better one only when still.
 * On the scale, in a hopper zone or in a chalk circle he does only that. Owner: rules-sim.
 */
import { bossFresh, count, standingFor, type Ctx } from './clock';
import { byValue, carrierCap_g, cutTime, pieceSpec, toolKey, toolP, vpk } from './content';
import { crucibleCheckReady, meltPiece } from './crucible';
import { accepts, atPlace, bossWorked, feedPiece, rerate, takeTray, trayFree } from './machines';
import { circleCount, circlePos, piecePos, thingNear, thingPos } from './positions';
import { weighIn } from './scales';
import { cutOff, dropOnPile, nextPiece, takeFromPile, thingOf } from './things';
import { truckBossStep, truckBossActEnd } from './truck';
import type { MachineId, Piece, ThingState } from './types';

const load_g = (x: Ctx): number => x.s.load.reduce((a, p) => a + p.g, 0);
const room_g = (x: Ctx): number => carrierCap_g(x.c, x.s) - load_g(x);

/** The machines whose hopper zone is a place. */
const PLACE_MACHINES: Record<string, MachineId[]> = { stripper: ['stripper', 'hand_stripper'], bench: ['bench'], crucible: ['crucible'] };

function setAct(x: Ctx, kind: Ctx['s']['act']['kind'], target: string | null, t: number, endsAt: number | null): void {
  x.s.act = { kind, target, since: t, endsAt };
  if (WORK_ACTS.has(kind)) bossWorked(x, t);
}

/** The boss's acts that count as work for the foreman (2.6: cut, fed, weighed, stripping by hand). */
const WORK_ACTS = new Set<string>(['work', 'feed', 'weigh', 'strip']);

/** Cancel the act in progress (moving, leaving, a stale sample): work keeps its progress on the thing. */
export function cancelAct(x: Ctx, t: number): void {
  const a = x.s.act;
  if (a.kind === 'work' && a.target) {
    const th = thingOf(x, a.target);
    if (th && th.by === 'boss') {
      th.progress += Math.max(0, t - a.since);
      th.by = null;
      x.ev.push({ type: 'workStop', thing: th.uid, by: 'boss' });
    }
  }
  if (a.kind !== 'drive') setAct(x, 'none', null, t, null);
}

/** Ground pieces and loose (tier 0) things the boss may pick up now, best first. */
function pickables(x: Ctx, px: number, py: number): { uid: string; grade: string; g: number; thing: ThingState | null }[] {
  const c = x.c;
  const reach = c.reach.pickup;
  const at = (uid: string) => x.s.things.find((t) => t.uid === uid)?.at ?? null;
  const out: { uid: string; grade: string; g: number; thing: ThingState | null }[] = [];
  for (const q of x.s.pieces) {
    if (q.claim) continue;
    if (q.pile.startsWith('circle.')) continue; // the circles hand pieces to the crew
    const pp = piecePos(c, q.pile, q.k, at);
    if (Math.hypot(pp.x - px, pp.y - py) <= reach) out.push({ uid: q.uid, grade: q.grade, g: q.g, thing: null });
  }
  for (const th of x.s.things) {
    if (th.by) continue;
    const o = c.objects[th.obj];
    if (!o || o.tier !== 0) continue;
    const p = thingPos(c, th.at);
    const d = Math.hypot(Math.max(0, Math.abs(px - p.x) - o.size.w / 2), Math.max(0, Math.abs(py - p.y) - o.size.d / 2));
    if (d > reach) continue;
    const sp = pieceSpec(c, th.obj, th.cut);
    if (sp) out.push({ uid: `${th.uid}.p${th.cut}`, grade: sp.grade, g: sp.g, thing: th });
  }
  return out.sort(byValue(c));
}

/** The chalk circle the boss stands in, or -1 (circles work only once a yard hand is hired, 2.1). */
function circleAt(x: Ctx, px: number, py: number): number {
  if (!x.s.crew.some((m) => m.role === 'hand')) return -1;
  for (let n = 0; n < circleCount(x.c); n++) {
    const k = circlePos(x.c, n);
    if (Math.hypot(px - k.x, py - k.y) <= k.r) return n;
  }
  return -1;
}

/** The hopper-zone place the boss stands at (strippers, bench, crucible), or null. */
function hopperPlace(x: Ctx, px: number, py: number): string | null {
  for (const place of Object.keys(PLACE_MACHINES)) {
    const ms = PLACE_MACHINES[place];
    if (!ms.some((m) => x.s.machines[m].owned)) continue;
    if (atPlace(x, place, px, py)) return place;
  }
  return null;
}

/** The best carried piece a machine at this place takes now. */
function feedable(x: Ctx, place: string): { piece: Piece; machine: MachineId } | null {
  const sorted = [...x.s.load].sort(byValue(x.c));
  for (const p of sorted) {
    for (const m of PLACE_MACHINES[place]) {
      if (m === 'crucible') {
        const cr = x.s.machines.crucible;
        const inputs = (() => {
          const rec = x.c.machines.crucible.recipes[cr.recipe];
          return rec ? (Array.isArray(rec[0]) ? rec[0] : [rec[0]]) : [];
        })();
        if (cr.owned && inputs.includes(p.grade) && !['heating', 'ready', 'pouring'].includes(cr.phase) && cr.charge_g + cr.heel_g + p.g <= x.c.machines.crucible.pot * 1000 * (1 + x.c.machines.crucible.lev * Math.max(0, cr.level - 1))) return { piece: p, machine: m };
        continue;
      }
      if (accepts(x, m, p)) return { piece: p, machine: m };
    }
  }
  return null;
}

/**
 * Decide or continue the boss's act at yard second t from the last presence sample (2.1). Called by the
 * presence action and by the tick after every instant (live play only).
 */
export function bossStep(x: Ctx, t: number): void {
  const c = x.c;
  const s = x.s;
  if (!bossFresh(x, t)) {
    if (s.act.kind !== 'none' && s.act.kind !== 'drive') cancelAct(x, t);
    rerate(x, 'hand_stripper', t);
    return;
  }
  const p = s.presence;
  for (const id of Object.keys(c.map.points)) {
    const key = `visited:${id}`;
    if (!s.counts![key] && atPlace(x, id, p.x, p.y)) s.counts![key] = 1;
  }
  // After Step out he stands beside the truck, inside `enter`: entering is armed again only once he has
  // walked farther than enter + rearm away (as the yard view does; the bots engineer's 17:30 case).
  if (s.counts!['truck:out'] && s.truck.by !== 'boss' && Math.hypot(p.x - s.truck.x, p.y - s.truck.y) > c.truck.enter + c.truck.rearm) delete s.counts!['truck:out'];
  if (s.truck.by === 'boss') {
    truckBossStep(x, t);
    return;
  }
  rerate(x, 'hand_stripper', t);
  crucibleCheckReady(x, t);
  const still = !p.moving;
  const stood = standingFor(x, t);
  // An act in progress: continue or cancel.
  const a = s.act;
  if (a.kind !== 'none' && a.endsAt !== null) {
    let ok = true;
    if (a.kind === 'work') {
      const th = thingOf(x, a.target);
      ok = still && !!th && thingNear(c, [th], p.x, p.y, c.reach.work) === th.uid;
    } else if (a.kind === 'pickup') {
      if (a.target?.startsWith('tray.')) ok = atPlace(x, a.target.slice(5) === 'hand_stripper' ? 'stripper' : a.target.slice(5), p.x, p.y);
      else ok = pickables(x, p.x, p.y).some((q) => q.uid === a.target?.replace(/^swap:/, ''));
    } else if (a.kind === 'weigh') ok = still && atPlace(x, 'scale', p.x, p.y);
    else if (a.kind === 'feed') ok = still && !!a.target && atPlace(x, a.target, p.x, p.y);
    else if (a.kind === 'circle') ok = still && circleAt(x, p.x, p.y) >= 0;
    if (ok) return;
    cancelAct(x, t);
  }
  // Enter the truck by walking into it.
  const tr = s.truck;
  const dTruck = Math.hypot(p.x - tr.x, p.y - tr.y);
  if (tr.owned && tr.by === null && !tr.trip && !s.counts?.['truck:out'] && !s.arriving.some((r) => r.item === 'truck') && dTruck <= c.truck.enter) {
    tr.by = 'boss';
    setAct(x, 'drive', null, t, null);
    x.ev.push({ type: 'enterTruck' });
    return;
  }
  const loaded = s.load.length > 0;
  // The scale: only weighing.
  if (atPlace(x, 'scale', p.x, p.y)) {
    if (loaded && still) setAct(x, 'weigh', 'scale', t, t + c.weigh_s);
    return;
  }
  // A hopper zone: only feeding, then the tray.
  const hp = hopperPlace(x, p.x, p.y);
  if (hp) {
    const f = still ? feedable(x, hp) : null;
    if (f) {
      setAct(x, 'feed', hp, t, t + c.pick_s);
      return;
    }
    for (const m of PLACE_MACHINES[hp]) {
      if (trayFree(x, m) > 0 && room_g(x) >= Math.min(trayFree(x, m), 100)) {
        setAct(x, 'pickup', `tray.${m}`, t, t + c.pick_s);
        return;
      }
    }
    if (hp === 'stripper' && s.machines.hand_stripper.owned && (s.machines.hand_stripper.work || s.machines.hand_stripper.hopper.length)) {
      if (s.act.kind !== 'strip') setAct(x, 'strip', 'hand_stripper', t, null);
      else bossWorked(x, t);
      return;
    }
    if (s.act.kind === 'strip') setAct(x, 'none', null, t, null);
    // Not a hopper for anything he carries: the zone is still a place to pick up and work around (fall through).
  } else if (s.act.kind === 'strip') setAct(x, 'none', null, t, null);
  // A chalk circle: put the load down for the crew.
  const ci = circleAt(x, p.x, p.y);
  if (ci >= 0) {
    if (loaded && stood >= c.feel.workDelay) setAct(x, 'circle', `circle.${ci}`, t, t + c.pick_s);
    return;
  }
  // Pickup (moving or still) and the swap (still).
  const room = room_g(x);
  const cands = pickables(x, p.x, p.y);
  const fit = cands.find((q) => q.g <= room);
  if (fit) {
    setAct(x, 'pickup', fit.uid, t, t + c.pick_s);
    return;
  }
  if (loaded && stood >= c.feel.workDelay && cands.length) {
    const worst = [...s.load].sort(byValue(c)).pop()!;
    const better = cands.find((q) => vpk(c, q.grade) > vpk(c, worst.grade) && q.g <= room + worst.g && q.g * vpk(c, q.grade) >= worst.g * vpk(c, worst.grade));
    if (better) {
      setAct(x, 'pickup', `swap:${better.uid}`, t, t + c.pick_s);
      return;
    }
  }
  // Work: the nearest workable thing (not a cutter's), after the stick has been released for workDelay.
  if (!still || stood < c.feel.workDelay) {
    if (!still && s.act.kind === 'none' && s.act.target) s.act.target = null;
    return;
  }
  // 2.1: among the things in reach he works the nearest WORKABLE one (its tier at most his best tool); a
  // thing above his tier refuses (tool2 / tool3) only when none in reach is workable (content 17:58: a
  // radiator nearer than the washer beside it held him for the hour).
  const other = (th: ThingState) => (th.by !== null && th.by !== 'boss') || (c.objects[th.obj]?.tier ?? 0) === 0;
  const uid =
    thingNear(c, s.things, p.x, p.y, c.reach.work, (th) => other(th) || (c.objects[th.obj]?.tier ?? 0) > s.tier) ??
    thingNear(c, s.things, p.x, p.y, c.reach.work, other);
  if (!uid) return;
  const th = thingOf(x, uid)!;
  const o = c.objects[th.obj];
  if (o.tier > s.tier) {
    if (s.act.target !== uid) {
      x.ev.push({ type: 'refused', key: o.tier >= 3 ? 'tool3' : 'tool2', args: {}, retry: null });
      setAct(x, 'none', uid, t, null);
    }
    return;
  }
  startWork(x, th, t);
}

function startWork(x: Ctx, th: ThingState, t: number): void {
  const c = x.c;
  const sp = pieceSpec(c, th.obj, th.cut);
  if (!sp) return;
  const P = toolP(c, x.s.tier);
  const full = cutTime(c, th.obj, sp.g, P);
  const left = Math.max(0, full - th.progress);
  th.by = 'boss';
  setAct(x, 'work', th.uid, t, t + left);
  x.ev.push({ type: 'workStart', thing: th.uid, obj: th.obj, grade: sp.grade, tool: toolKey(c, Math.min(x.s.tier, c.objects[th.obj]?.tier ?? 1)), by: 'boss', ring: { t0: t, t1: t + left, p0: full > 0 ? th.progress / full : 0 } });
}

/** The boss's act ends at t (act.endsAt): apply it, then decide the next. */
export function bossActEnd(x: Ctx, t: number): void {
  const s = x.s;
  const a = s.act;
  const c = x.c;
  s.act = { ...a, endsAt: null };
  if (a.kind === 'hook' || a.kind === 'tip' || (a.kind === 'weigh' && s.truck.by === 'boss')) {
    truckBossActEnd(x, a.kind, t);
    return;
  }
  if (!bossFresh(x, t)) {
    cancelAct(x, t);
    return;
  }
  if (WORK_ACTS.has(a.kind)) bossWorked(x, t);
  if (a.kind === 'work') {
    const th = thingOf(x, a.target);
    if (th) {
      th.by = null;
      const r = cutOff(x, th, 'boss', t);
      if (r) {
        if (r.piece.g <= room_g(x)) {
          s.load.push(r.piece);
          x.ev.push({ type: 'pieceOff', thing: th.uid, piece: r.piece.uid, grade: r.piece.grade, g: r.piece.g, to: 'load', by: 'boss' });
        } else {
          dropOnPile(x, r.piece, r.gone ? (th.at.at === 'zone' ? `zone.${th.at.zone}` : th.at.at === 'dropoff' ? 'dropoff' : 'floor') : `beside.${th.uid}`);
          x.ev.push({ type: 'pieceOff', thing: th.uid, piece: r.piece.uid, grade: r.piece.grade, g: r.piece.g, to: 'ground', by: 'boss' });
          x.ev.push({ type: 'loadFull' });
        }
      }
    }
  } else if (a.kind === 'pickup' && a.target) {
    if (a.target.startsWith('tray.')) {
      const m = a.target.slice(5) as MachineId;
      for (const p of takeTray(x, m, room_g(x), t)) {
        s.load.push(p);
        x.ev.push({ type: 'pickup', piece: p.uid, grade: p.grade, g: p.g, by: 'boss' });
      }
    } else {
      const swap = a.target.startsWith('swap:');
      const uid = swap ? a.target.slice(5) : a.target;
      if (swap) {
        const worst = [...s.load].sort(byValue(c)).pop();
        if (worst) {
          s.load.splice(s.load.indexOf(worst), 1);
          const at = (u: string) => s.things.find((q) => q.uid === u)?.at ?? null;
          const near = s.pieces.find((q) => q.uid === uid);
          const pile = near?.pile ?? 'dropoff';
          dropOnPile(x, worst, pile);
          void at;
          x.ev.push({ type: 'swap', down: worst.uid, up: uid });
        }
      }
      const gp = s.pieces.find((q) => q.uid === uid);
      let piece: Piece | null = null;
      if (gp) piece = takeFromPile(x, uid);
      else {
        const thUid = uid.replace(/\.p\d+$/, '');
        const th = thingOf(x, thUid);
        if (th && (c.objects[th.obj]?.tier ?? 1) === 0) {
          const np = nextPiece(x, th);
          if (np && np.uid === uid) piece = cutOff(x, th, 'boss', t)?.piece ?? null;
        }
      }
      if (piece) {
        s.load.push(piece);
        x.ev.push({ type: 'pickup', piece: piece.uid, grade: piece.grade, g: piece.g, by: 'boss' });
        if (room_g(x) <= 0) x.ev.push({ type: 'loadFull' });
      }
    }
  } else if (a.kind === 'weigh') {
    const pieces = s.load;
    s.load = [];
    weighIn(x, pieces, 'boss', t);
  } else if (a.kind === 'feed' && a.target) {
    const f = feedable(x, a.target);
    if (f) {
      s.load.splice(s.load.indexOf(f.piece), 1);
      if (f.machine === 'crucible') {
        if (!meltPiece(x, f.piece, 'boss', t)) s.load.push(f.piece);
      } else feedPiece(x, f.machine, f.piece, 'boss', t);
    }
  } else if (a.kind === 'circle' && a.target) {
    const n = Number(a.target.slice(7)) || 0;
    const pieces = s.load;
    s.load = [];
    for (const p of pieces) dropOnPile(x, p, `circle.${n}`);
    x.ev.push({ type: 'circleDrop', circle: n, pieces: pieces.map((p) => p.uid), g: pieces.reduce((q, p) => q + p.g, 0) });
  }
  s.act = { kind: 'none', target: null, since: t, endsAt: null };
  count(x, 'bossActs');
  bossStep(x, t);
}
