/**
 * The frame table (types.ts `FrameTable`): everything the world draws from the rules, as a pure function
 * of the content and the state. Sprites are manifest ENTRY ids from content (one table: the content);
 * frames and levels are the art's (stageOf, the bay's share). Everything that runs carries its span
 * (t0 its real start), so the world interpolates on the UI thread and decides no rule. The deprecated
 * fields of types.ts are still filled, so the screens compile while they move.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { dayWord, priceOf, sellAmount, sellOn } from './board';
import { frameMoney } from './frameMoney';
import { frameWorks } from './frameWorks';
import { contentAt, worksOpened } from './layer';
import { lineAmount, roundMoney } from './money';
import { carrierCap_g, owner1Rules, plateDef, tierOf } from './content';
import { idleWhyOf } from './crew';
import { bossHandleS, hookRefusal } from './truck';
import { fullestSkip } from './partners';
import { placeCardKind, skipLabelOf } from './cards';
import { truckFree } from './hand';
import { chevronOf } from './goals';
// C-FRAME (PLAN2 2.2): the works' readers the frame asks (tags, oversize pieces, the halls' charge, the drop-off's pace).
import type { Ctx } from './clock';
import { bossFresh } from './clock';
import { hallCap_g } from './halls';
import { lotValue } from './lots';
import { FIRST_UID, rackCap, rackCount, tagFigures, tagUid, tagged } from './reuse';
import { worksDropoffPeriod } from './things';
import { bayOrder, bayPos, bayStocked, circleCount, circlePos, drivePath, insideFence, isStillage, lanePath, machinePos, pathSplit, pathTimes, piecePos, placeNear, pointOf, skipZone, spotPos, stopOf, thingPos, tripLandingOf, tripPhasePath } from './positions';
import type {
  FrameArrival,
  FrameBay,
  FrameBoss,
  FrameCrew,
  FrameLabel,
  FrameMachine,
  FramePiece,
  FrameSkip,
  FrameTable,
  FrameThing,
  LoadFamily,
  MachineId,
  MachineLook,
  Piece,
  Pose,
  SalvageGame,
  SalvageConfig,
  TextKey,
  TxtArgs,
  ThingAt,
  ToolKind,
  Txt,
} from './types';
import { TEXT_KEYS } from './types';

const TEXT = new Set<string>(Object.values(TEXT_KEYS).flat());
const MACHINE_PLACE: Record<MachineId, string> = { hand_stripper: 'stripper', stripper: 'stripper', bench: 'bench', crucible: 'crucible' };

/** The art's stageOf (src/ui/salvage/art/manifest/things.ts), for the deprecated `stage` only. */
function stageOf(frames: number, off: number, total: number): number {
  if (off <= 0 || total <= 0 || frames <= 1) return 0;
  return Math.min(frames - 1, Math.max(1, Math.ceil((off / total) * (frames - 1))));
}

/** A grade's load family: content `grades.<id>.load`, else by the grade's material. */
export function loadFamily(c: SalvageContent, grade: string): LoadFamily {
  const gr = c.grades[grade];
  if (gr?.load) return gr.load;
  if (grade === 'cab' || grade === 'tcab') return 'cab';
  if (grade === 'mot') return 'mot';
  switch (gr?.material) {
    case 'copper':
      return 'cu';
    case 'brass':
      return 'br';
    case 'alu':
      return 'al';
    case 'castiron':
      return 'ci';
    case 'steel':
      return 'hms';
    default:
      return 'fe';
  }
}

/**
 * The tool a piece of this grade is worked with (2.4: the work animation follows the piece's family). C-FRAME (PLAN2
 * 2.2, ruling 28.7 a): a piece of the plasma cutter's tier (content `tools.plasma.tier`, the works layer's) is cut with
 * the plasma once it is owned (`owned`: the yard's shop keys), else the torch: the same rule as the lots' tier. Without
 * `owned` (and on the first yard's content, which has no plasma) the first yard's tools, unchanged.
 */
export function toolFor(c: SalvageContent, obj: string, grade: string | null, owned?: readonly string[]): ToolKind {
  const tier = c.objects[obj]?.tier ?? 1;
  const plasma = c.tools.plasma?.tier;
  if (owned && plasma !== undefined && tier >= plasma && owned.includes('plasma')) return 'plasma';
  if (tier >= 3) return 'torch';
  if (tier === 2) return c.grades[grade ?? '']?.material === 'castiron' ? 'sledge' : 'grinder';
  return 'spanner';
}

/** The manifest entry of a piece: its spec's sprite, else its grade's, else piece.<grade>. */
export function pieceSprite(c: SalvageContent, p: Pick<Piece, 'grade' | 'from' | 'spec'>, objOf: (uid: string) => string | null): string {
  const obj = p.from ? objOf(p.from) : null;
  const spec = obj ? c.objects[obj]?.pieces[p.spec] : undefined;
  return (spec && spec.length > 3 ? (spec[3] as string) : undefined) ?? c.grades[p.grade]?.sprite ?? `piece.${p.grade}`;
}

/**
 * How long the frame shows a pour, yard seconds (desk1). The rules pour in one instant (crucible.ts pour:
 * heating or ready -> cooling); the picture shows the tilted pot, the stream into the mould and whoever is
 * at the pot in the pour pose (face shield and aluminised apron) for this long after it. A look only:
 * nothing of the rules waits on it.
 */
export const POUR_LOOK_S = 6;

/** Is the crucible's pour on the picture at yard second t (the instant pour plus POUR_LOOK_S)? */
export function pourShown(g: SalvageGame, t = g.salvage.t): boolean {
  const cr = g.salvage.machines.crucible;
  return cr.phase === 'pouring' || (cr.phase === 'cooling' && cr.cooling?.since !== undefined && t - cr.cooling.since < POUR_LOOK_S);
}

function machineLook(g: SalvageGame, id: MachineId): MachineLook {
  const m = g.salvage.machines[id];
  if (g.salvage.arriving.some((a) => a.item === id)) return 'arriving';
  if (!m.owned) return 'padlock';
  if (id === 'crucible') {
    const p = g.salvage.machines.crucible.phase;
    if (pourShown(g)) return 'pour';
    return p === 'heating' ? 'heating' : p === 'ready' ? 'ready' : p === 'cooling' ? 'cooling' : 'idle';
  }
  return m.status === 'working' ? 'working' : m.status === 'trayFull' ? 'trayFull' : 'idle';
}

/**
 * The boss's pose by his act. C-FRAME (PLAN2 2.2): the works' acts: commission (standing at the plate; at the analyser,
 * a plate of kind `assay`, the analyse pose), rack (push), lot (the tool the piece is cut with: plasma or torch), crate
 * (feed). The first yard's acts as before.
 */
const poseOf = (act: string, tool: ToolKind | null, loaded: boolean, moving: boolean, c?: SalvageContent, target?: string | null): Pose => {
  if (act === 'work' && tool) return tool;
  if (act === 'commission') return c && target && plateDef(c, target)?.kind === 'assay' ? 'analyse' : 'stand';
  if (act === 'rack') return 'push';
  if (act === 'lot') return tool ?? 'torch';
  if (act === 'crate') return 'feed';
  if (act === 'feed' || act === 'strip') return 'feed';
  if (act === 'weigh') return 'weigh';
  if (act === 'drive' || act === 'hook' || act === 'tip') return 'drive';
  if (moving) return loaded ? 'push' : 'walk';
  return loaded ? 'carry' : 'stand';
};

export function frameOf(c: SalvageContent, g: SalvageGame): FrameTable {
  const s = g.salvage;
  const t = s.t;
  const day = s.clock.day;
  const byUid = new Map(s.things.map((th) => [th.uid, th]));
  const thingAt = (uid: string): ThingAt | null => byUid.get(uid)?.at ?? null;
  // A piece's thing may be gone; its object is then read from the uid's thing part when it still names one.
  const objOfPiece = (from: string | null): string | null => {
    if (!from) return null;
    const th = byUid.get(from);
    if (th) return th.obj;
    const m = /^(?:[A-Za-z0-9]+\.)?([a-z]+)\.\d+$/.exec(from);
    return m && c.objects[m[1]] ? m[1] : null;
  };

  const workRing = (uid: string): { t0: number; t1: number; p0: number } | null => {
    const th = byUid.get(uid);
    if (!th || !th.by) return null;
    const o = c.objects[th.obj];
    const spec = o ? pieceAt(o.pieces, th.cut) : null;
    if (!o || !spec) return null;
    const tool = Object.values(c.tools).filter((x) => x.tier <= s.tier).sort((a, b) => b.P - a.P)[0];
    const len = Math.max(c.cut.minS, ((spec[1] / 1000) * o.h) / Math.max(0.01, tool?.P ?? 1));
    if (th.by === 'boss') {
      if (s.act.kind !== 'work' || s.act.target !== uid) return null;
      const t1 = s.act.endsAt ?? s.act.since + len - th.progress;
      return { t0: s.act.since, t1, p0: Math.min(1, th.progress / len) };
    }
    const m = s.crew.find((x) => x.id === th.by);
    return m ? { t0: m.t0, t1: m.t1, p0: Math.min(1, th.progress / len) } : null;
  };

  // owner1 L1: things and pieces change only at events: their entries are reused while the state's lists are the same
  // (a thing's work share follows the clock: recomputed when any thing is being worked).
  const thingsHit = THINGS.get(s.things);
  const reuseThings = !!thingsHit && thingsHit.c === c && thingsHit.crew === s.crew && thingsHit.act === s.act && thingsHit.tier === s.tier && !thingsHit.rings;
  const things: FrameThing[] = reuseThings ? thingsHit!.out : s.things.map((th) => {
    const o = c.objects[th.obj];
    const p = thingPos(c, th.at);
    const total = o ? o.pieces.reduce((a, sp) => a + sp[2], 0) : 1;
    // W9 (rules-sim-b 20:10): the tier of the thing's NEXT piece; a stripped shell is not workable and shows no padlock.
    const tier = th.shell ? 0 : tierOf(c, th);
    const ring = workRing(th.uid);
    const spec = o ? pieceAt(o.pieces, th.cut) : null;
    return {
      uid: th.uid,
      obj: th.obj,
      sprite: o?.sprite ?? `thing.${th.obj}`,
      off: th.cut,
      total,
      stage: stageOf(o?.stages ?? 1, th.cut, total),
      x: p.x,
      y: p.y,
      locked: tier > s.tier ? (tier >= 3 ? 'tool3' : 'tool2') : null,
      ring,
      work: ring ? Math.max(0, Math.min(1, ring.p0 + (1 - ring.p0) * ((t - ring.t0) / Math.max(1e-6, ring.t1 - ring.t0)))) : null,
      grade: th.by && spec ? spec[0] : null,
      by: th.by,
      // C-FRAME (PLAN2 2.2, 4.7): an oversize piece's plate: its sender, its fixed mass and about § once cut (lots.ts
      // lotValue, the card's own figure). Only a lot carries it (stage 2: nothing is a lot in the first yard).
      ...(th.at.at === 'lot' ? { lot: { sender: th.sender ?? null, g: th.g ?? o?.gross_g ?? 0, value: roundMoney(lotValue({ c }, th)) } } : {}),
    };
  });
  if (!reuseThings) THINGS.set(s.things, { c, crew: s.crew, act: s.act, tier: s.tier, rings: things.some((f) => f.ring !== null), out: things });
  // C-FRAME (PLAN2 2.2, 4.6): the Yard sale's tags, from the works' opening only (below it nothing is tagged: the list as built).
  const thingsOut = worksOpened(s) && c.reuse ? withTags(c, g, things) : things;

  const piecesHit = PIECES.get(s.pieces);
  const pieces: FramePiece[] = piecesHit && piecesHit.c === c && piecesHit.things === s.things ? piecesHit.out : s.pieces.map((pc) => {
    const p = piecePos(c, pc.pile, pc.k, thingAt);
    return { uid: pc.uid, sprite: pieceSprite(c, pc, objOfPiece), grade: pc.grade, load: loadFamily(c, pc.grade), pile: pc.pile, k: pc.k, x: p.x, y: p.y };
  });
  if (!(piecesHit && piecesHit.c === c && piecesHit.things === s.things)) PIECES.set(s.pieces, { c, things: s.things, out: pieces });

  const kg = s.load.reduce((a, p) => a + p.g, 0) / 1000;
  const load = {
    pieces: s.load.map((p) => ({ uid: p.uid, sprite: pieceSprite(c, p, objOfPiece), grade: p.grade, g: p.g, load: loadFamily(c, p.grade) })),
    kg,
    cap: c.carriers[s.carrier] ?? 0,
    carrier: s.carrier,
    sprite: `carrier.${s.carrier}`,
  };

  const cr = s.machines.crucible;
  const machines: FrameMachine[] = (Object.keys(s.machines) as MachineId[])
    .filter((id) => id !== 'stripper' || s.machines.stripper.owned || s.arriving.some((a) => a.item === 'stripper'))
    .map((id) => {
      const p = machinePos(c, id);
      const look = machineLook(g, id);
      const trayG = Object.values(s.machines[id].tray_g).reduce((a, x) => a + x, 0);
      const cap = ((c.machines[id] as { tray?: number }).tray ?? 200) * 1000;
      const cool = id === 'crucible' ? cr.cooling : null;
      const coolSpan = cool && cool.since !== undefined && cool.until !== undefined ? { t0: cool.since, t1: cool.until } : null;
      return {
        machine: id,
        place: MACHINE_PLACE[id],
        look,
        sprite: `plant.${id === 'hand_stripper' ? 'handstripper' : id}.${look}`,
        x: id === 'hand_stripper' && !s.machines.stripper.owned ? pointOf(c, 'stripper').x : p.x,
        y: p.y,
        tray: trayG <= 0 ? 0 : trayG < cap / 3 ? 1 : trayG < (2 * cap) / 3 ? 2 : 3,
        trayShare: Math.min(1, trayG / Math.max(1, cap)),
        ingots: cool ? { grade: cool.grade, n: cool.n, cool: coolSpan ? Math.max(0, Math.min(1, (t - coolSpan.t0) / Math.max(1e-6, coolSpan.t1 - coolSpan.t0))) : 1, span: coolSpan } : null,
        pourer: id === 'crucible' && look === 'pour' ? (cr.cooling?.by ?? 'boss') : id === 'crucible' && cr.phase === 'ready' ? 'boss' : null,
        span: id === 'crucible' && cr.endsAt !== null ? { t0: cr.phaseSince, t1: cr.endsAt } : null,
      };
    });

  // The lead's stillage ruling (17:10): a stillage stands only for a grade that has had stock, in the block
  // in the order of first stock (bayPos with the state); a ferrous heap with nothing shows fill 0 (its walls).
  const grades = [...bayOrder(c), ...Object.keys(s.bays).filter((gr) => !bayOrder(c).includes(gr))].filter((gr) => !isStillage(c, gr) || bayStocked(s, gr));
  const bays: FrameBay[] = grades.map((gr) => {
    const b = s.bays[gr] ?? { g: 0, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 };
    const p = bayPos(c, gr, s);
    const cap = (c.bays[gr] ?? 2000) * 1000;
    const def = c.grades[gr];
    const isFe = def?.family === 'fe';
    const kind = def?.bay?.kind ?? (gr === 'conv' ? 'cage' : isFe ? 'heap' : 'stillage');
    const fill = b.g <= 0 ? 0 : Math.min(4, 1 + Math.floor((3 * b.g) / cap));
    const price = priceOf(c, gr, day);
    const aside_g = b.aside.reduce((a, x) => a + x.g, 0);
    const deal = s.deal.phase === 'running' && gr === c.deal.grade ? { a_g: b.forDeal_g, q_g: s.deal.q_g } : null;
    const cru = cr.owned && cr.fromBays && b.forCrucible_g > 0 ? { a_g: b.forCrucible_g, b_g: Math.round(c.machines.crucible.pot * 1000) } : null;
    return {
      grade: gr,
      kind,
      // C-FRAME (PLAN2 2.2, 2.7 worksStore / worksLine): the works' bay kinds without a sprite of their own take their kind's look.
      look: def?.bay?.sprite ?? (kind === 'heap' ? `plant.heap.${gr}` : kind === 'cage' ? 'plant.cage.converter' : (WORKS_BAY_LOOK[kind] ?? 'plant.stillage')),
      x: p.x,
      y: p.y,
      share: Math.min(1, b.g / Math.max(1, cap)),
      sprite: isFe ? `bay.ferrous.${fill}` : `stillage.${Math.min(3, fill)}`,
      fill,
      held: b.held,
      g: b.g,
      // L10 / S4 / W4: what Sell would pay now, the board's own number (the bay less its reservations and what is set aside).
      value: sellAmount(sellOn(c, g, gr, day)),
      price,
      word: dayWord(c, gr, day),
      forDeal: deal,
      forCrucible: cru,
      aside_g,
      // C-FRAME (PLAN2 2.2): "For the {hall} a / b kg": a hall's charge kept from this bay (works.ts refreshReserves). Stage 2 only.
      ...(b.reserved ? forPlateOf(c, s, b.reserved) : {}),
    };
  });

  const crew: FrameCrew[] = s.crew.map((m) => {
    const from = spotPos(c, m.from, s.things, s.truck);
    const to = spotPos(c, m.to, s.things, s.truck);
    const loadOut = m.load.map((p) => ({ uid: p.uid, sprite: pieceSprite(c, p, objOfPiece), grade: p.grade, g: p.g, load: loadFamily(c, p.grade), ...(p.whole ? { thing: c.objects[p.whole]?.sprite ?? `thing.${p.whole}` } : {}) }));
    const cutting = m.cut ? byUid.get(m.cut.thing) : undefined;
    const tool = m.role === 'cutter' && m.phase === 'work' && cutting ? toolFor(c, cutting.obj, pieceAt(c.objects[cutting.obj]?.pieces ?? [], cutting.cut)?.[0] ?? null, s.owned) : null;
    const moving = m.phase === 'walkTo' || m.phase === 'walkBack';
    const pose: Pose = tool ?? (m.job === 'pour' ? 'pour' : moving ? (m.load.length ? 'push' : 'walk') : m.phase === 'pick' || m.phase === 'drop' ? 'feed' : 'stand');
    const why = idleWhyOf(c, s, m);
    const idleText = why ? ({ key: (why.why === 'tool' ? ((why.tier ?? 2) >= 3 ? 'card.crewWhy.tool3' : 'card.crewWhy.tool2') : `card.crewWhy.${why.why}`) as TextKey }) : null;
    // C-FRAME (PLAN2 2.2, s2c-plan-world 2.4): the hired driver waiting while the bridge partners' skips fill says so
    // (stand-in idleWhy 'nothing' until types.ts FrameCrew.idleWhy gains its own value: requests.md [seam] 28 Nov, C-FRAME).
    const bridge = !why && m.role === 'driver' ? driverBridgeWhy(c, s, m) : null;
    return { id: m.id, role: m.role, pose, tool, sprite: `person.${m.role}`, job: m.job, phase: m.phase, from, to, t0: m.t0, t1: m.t1, carries: m.carries ? (c.grades[m.carries]?.sprite ?? null) : null, load: loadOut, ...(why && idleText ? { idleWhy: why.why, idleText } : bridge ? { idleWhy: 'nothing' as const, idleText: bridge } : {}) };
  });

  const tk = s.truck;
  const park = pointOf(c, 'park');
  const tripTo = tk.trip ? skipZone(c, tk.trip.partner, tk.trip.slot) : null;
  const tripPath = tk.trip ? lanePath(c, { x: tk.x, y: tk.y }, tk.trip.partner, tk.trip.slot) : [];
  const back = tk.trip && (tk.trip.phase === 'back' || tk.trip.phase === 'weigh' || tk.trip.phase === 'tip' || tk.trip.phase === 'park');
  // owner1 V1, V3: the phase's own path from where the truck stands at its start, and when it passes each point.
  const ownLeg = (() => {
    if (!tk.trip || !tk.trip.speeds || c.truck.yardV === undefined) return null;
    const trip = tk.trip;
    // s2e-join (s2e-line's request): a car's 'tip' phase drives round the turning loop to the bay's apron, as the rules do.
    const path = tripPhasePath(c, trip.phase, trip.partner, trip.slot, { x: tk.x, y: tk.y }, tripLandingOf(c, s));
    const sp = trip.speeds!;
    const L = pathSplit(c, path);
    const drive = L.yard / sp.vy + L.lane / sp.vl;
    // back and weigh (the driver walking to a parked truck first: R2) end with their drive; the others start with it.
    const start = trip.phase === 'back' || trip.phase === 'weigh' ? Math.max(trip.t0, trip.endsAt - drive) : trip.t0;
    const at = pathTimes(c, path, start, sp.vy, sp.vl);
    return { phase: trip.phase, partner: trip.partner, t0: trip.t0, t1: trip.endsAt, from: path[0], to: path[path.length - 1], path, at };
  })();
  const bossHook = bossHandleS(c);
  const truck = {
    owned: tk.owned,
    x: tk.x,
    y: tk.y,
    heading: tk.heading,
    load: tk.skip ? { state: tk.skip.trial ? ('trial' as const) : ('full' as const), partner: tk.skip.partner } : null,
    skip: !tk.skip ? ('none' as const) : tk.skip.trial ? ('trial' as const) : ('full' as const),
    by: tk.by,
    leg: ownLeg ?? (tk.trip && tripTo
      ? { phase: tk.trip.phase, partner: tk.trip.partner, t0: tk.trip.t0, t1: tk.trip.endsAt, from: back ? { x: tripTo.x, y: tripTo.y } : { x: tk.x, y: tk.y }, to: back ? park : { x: tripTo.x, y: tripTo.y }, path: back ? [...tripPath].reverse() : tripPath }
      : null),
    // owner1 T3: the boss's hook ring lasts truck.bossHandle_s (hookSince is his alone).
    hookSpan: tk.hookSince !== null ? { t0: tk.hookSince, t1: tk.hookSince + bossHook } : null,
    hook: tk.hookSince !== null ? Math.max(0, Math.min(1, (t - tk.hookSince) / Math.max(1e-6, bossHook))) : null,
    // C-FRAME (PLAN2 2.1 S4): the body drawn, named by the shop key owned; written from the works' opening (absent = 'truck').
    ...(worksOpened(s) ? { model: s.owned.includes('truckBridge') ? ('truckBridge' as const) : ('truck' as const) } : {}),
  };

  const yardV = owner1Rules(c) ? c.truck.yardV : undefined;
  const mp = pointOf(c, 'merchant');
  const gate = pointOf(c, 'gate');
  const off = { x: gate.x + 30, y: gate.y };
  const lotG = s.merchant.lot.reduce((a, l) => a + l.g, 0);
  const away = s.merchant.phase === 'away';
  const flatbed = {
    phase: s.merchant.phase,
    t0: s.merchant.since,
    t1: s.merchant.endsAt ?? s.merchant.since,
    x: mp.x,
    y: mp.y,
    from: away ? { x: mp.x, y: mp.y } : { x: mp.x, y: mp.y },
    to: away ? off : { x: mp.x, y: mp.y },
    path: away ? (yardV ? drivePath(c, { x: mp.x, y: mp.y }, off) : [{ x: mp.x, y: mp.y }, { x: gate.x - 2, y: gate.y }, off]) : [],
    load: lotG <= 0 ? 0 : lotG < 50_000 ? 1 : lotG < 200_000 ? 2 : 3,
  };
  // owner1 V3: the flatbed leaves along the drive line at the yard's speed, the lane at the driver's.
  if (yardV && away) (flatbed as FrameTable['flatbed']).at = pathTimes(c, flatbed.path, flatbed.t0, yardV, c.truck.v);

  const arrivals: FrameArrival[] = s.arriving.map((a) => {
    const to = pointOf(c, a.place);
    const set = Math.min(a.at, a.since + Math.max(0, (a.at - a.since) * 0.7));
    const base: FrameArrival = { item: a.item, kind: a.by, place: a.place, from: { x: gate.x + 20, y: gate.y }, to, span: { t0: a.since, t1: a.at }, phase: t < set ? 'in' : 'setDown' };
    if (!yardV || a.by === 'crew') return base;
    // owner1 V4: along the drive line to the stop nearest the place; set down there.
    const stop = nearestStop(c, to);
    const path = drivePath(c, base.from, stop);
    const L = pathSplit(c, path);
    const D = Math.max(1e-3, set - a.since);
    const laneMin = L.lane / (c.truck.v * (c.truck.laneMaxF ?? 4));
    const laneT = L.lane > 0 ? Math.max(laneMin, D - L.yard / yardV) : 0;
    const vy = L.yard > 0 ? L.yard / Math.max(1e-3, D - laneT) : yardV;
    const vl = L.lane > 0 ? L.lane / Math.max(1e-3, laneT) : c.truck.v;
    return { ...base, from: path[0], path, at: pathTimes(c, path, a.since, vy, vl), stop };
  });

  const skips: FrameSkip[] = [];
  for (const [pid, ps] of Object.entries(s.partners)) {
    for (const sk of ps.skips) {
      const plate = skipLabelOf(c, g, pid, sk.slot);
      if (!plate) continue;
      const z = skipZone(c, pid, sk.slot);
      const state = plate.state === 'onTruck' ? 'full' : plate.state;
      const key: TextKey = state === 'filling' ? 'refusal.filling' : state === 'trial' ? 'ticket.trial' : 'card.skipState';
      skips.push({ partner: pid, slot: sk.slot, x: z.x, y: z.y, state, fullAt: sk.fullAt, plate, label: { key, args: state === 'filling' ? { t: { secs: plate.fullInS ?? 0 } } : { partner: { name: pid } } } });
    }
  }

  const labels: FrameLabel[] = [];
  for (const [id, pl] of Object.entries(c.map.places)) {
    const key = pl.label ?? `place.${id}`;
    if (!TEXT.has(key)) continue;
    const p = pointOf(c, id);
    labels.push({ id: `place.${id}`, x: p.x, y: p.y, kind: 'place', text: { key: key as TextKey }, first: !s.seen.places.includes(id) });
  }
  for (const [zone, z] of Object.entries(c.zones)) {
    if (z.tier <= s.tier) continue;
    labels.push({ id: `padlock.${zone}`, x: z.centre[0], y: z.centre[1] - z.r, kind: 'padlock', text: { key: z.tier >= 3 ? 'refusal.tool3' : 'refusal.tool2' } });
  }
  // A bay's chip (L10, S4, W4): at most two lines. Line 1 the grade, its kilograms and what Sell would pay
  // now (the board's number; "held" on a held bay; no value when nothing is free to sell). Line 2 at most
  // one reserve: the deal's, the crucible's, or what is set aside (at its own prices). The day word is the
  // board's alone.
  for (const b of bays) {
    if (b.g <= 0) continue;
    const kg = { mass_g: b.g, step: 'lot' as const, ...(b.kind === 'heap' ? { ferrous: true } : {}) };
    const line1: Txt = b.value > 0
      ? { key: b.held ? 'chip.bayHeld' : 'chip.bay', args: { grade: { grade: b.grade }, kg, x: { money: b.value } } }
      : { key: b.held ? 'chip.bayKgHeld' : 'chip.bayKg', args: { grade: { grade: b.grade }, kg } };
    labels.push({ id: `bay.${b.grade}`, x: b.x, y: b.y, kind: 'bay', text: line1 });
    const aside = s.bays[b.grade]?.aside ?? [];
    const line2: FrameLabel | null = b.forDeal
      ? { id: `bay.${b.grade}.deal`, x: b.x, y: b.y, kind: 'bay', text: { key: 'chip.reservedDeal', args: { foundry: { name: c.deal.partner }, a: { mass_g: b.forDeal.a_g, step: 'lot' }, b: { mass_g: b.forDeal.q_g, step: 'lot' } } } }
      : b.forCrucible
        ? { id: `bay.${b.grade}.crucible`, x: b.x, y: b.y, kind: 'bay', text: { key: 'chip.forCrucible', args: { a: { mass_g: b.forCrucible.a_g, step: 'lot' }, b: { mass_g: b.forCrucible.b_g, step: 'lot' } } } }
        : b.aside_g > 0
          ? { id: `bay.${b.grade}.aside`, x: b.x, y: b.y, kind: 'bay', text: { key: 'chip.aside', args: { kg: { mass_g: b.aside_g, step: 'lot' }, x: { money: aside.reduce((a, x) => a + lineAmount(x.g, x.price), 0) } } } }
          : null;
    if (line2) labels.push(line2);
  }

  const hired = s.crew.some((m) => m.role === 'hand');
  const circles = hired ? Array.from({ length: circleCount(c) }, (_, n) => circlePos(c, n)) : [];

  const pr = s.presence;
  const driving = tk.by === 'boss';
  const place = driving ? null : placeNear(c, pr.x, pr.y);
  const act = s.act;
  const target = act.target;
  const workThing = act.kind === 'work' && target ? byUid.get(target) : undefined;
  const workSpec = workThing ? pieceAt(c.objects[workThing.obj]?.pieces ?? [], workThing.cut) : null;
  // C-FRAME (PLAN2 2.2): cutting an oversize piece (act `lot`), the boss holds the tool of its tier (plasma or torch).
  const lotThing = act.kind === 'lot' && target ? byUid.get(target) : undefined;
  const tool = workThing ? toolFor(c, workThing.obj, workSpec?.[0] ?? null, s.owned) : lotThing ? toolFor(c, lotThing.obj, null, s.owned) : null;
  const ring = workThing ? workRing(workThing.uid) : act.endsAt !== null ? { t0: act.since, t1: act.endsAt, p0: 0 } : null;
  const pk = place ? c.map.places[place]?.card : false;
  const boss: FrameBoss = {
    x: driving ? tk.x : pr.x,
    y: driving ? tk.y : pr.y,
    heading: pr.heading ?? (driving ? tk.heading : 0),
    act: act.kind,
    target,
    tool,
    pose: poseOf(act.kind, tool, s.load.length > 0, pr.moving, c, target),
    grade: workSpec?.[0] ?? null,
    ring,
    near: workThing ? { kind: 'thing', id: workThing.uid } : place ? { kind: 'place', id: place } : null,
    button: driving ? 'stepOut' : getInHere(c, s, place) ? 'getIn' : place && pk ? 'open' : null,
    place,
    refusal: refusalOf(c, g),
  };

  const fm = s.foreman;
  const left = Math.max(0, c.foreman.minutesPerDay * 60 - fm.used_s);
  const active = fm.day === day && left > 0 && fm.lastWorkAt >= 0 && t - fm.lastWorkAt < c.foreman.windowS && s.crew.length > 0;

  // Equipment rung 2 adds (2.11: the radiation portal at the gate, the ID desk's window at the scale house, the crane's rung sign).
  const fixtures: FrameTable['fixtures'] = [];
  if (s.ladder.rung >= 2) {
    const gp = pointOf(c, 'gate');
    const sh = pointOf(c, c.map.points.scalehouse ? 'scalehouse' : 'scale');
    fixtures.push({ id: 'portal', sprite: 'plant.portal', x: gp.x - 2, y: gp.y }, { id: 'desk', sprite: 'plant.desk.id', x: sh.x, y: sh.y + 1 });
    const board = pointOf(c, c.map.points.noticeboard ? 'noticeboard' : 'office');
    fixtures.push({ id: `sign.rung${s.ladder.rung}`, sprite: 'plant.sign.rung', x: board.x, y: board.y - 1 });
  }

  return { t, epoch: s.epoch, boss, things: thingsOut, pieces, load, machines, bays, crew, truck, flatbed, dropoffCar: dropoffCarOf(c, s), arrivals, fixtures, skips, labels, chevron: chevronOf({ salvage: c } as SalvageConfig, g), circles, foreman: { active, left_s: left } };
}

/**
 * owner2-hud (ruling 18.4): the one button GETS IN. On foot, the truck free (hand.ts truckFree), no away card
 * waiting, and his presence within truck.enter + truck.rearm of the truck: "Get in", unless the place whose card
 * would open (a card kind of its own) has its point nearer him than the truck (a tie goes to the truck; the rack with the truck two metres
 * off still opens the rack; at the park, whose point the parked truck stands on, the truck wins). The door's
 * re-arming does not matter: a press sends the cab flag, which seats at the door (actions.ts setPresence).
 */
function getInHere(c: SalvageContent, s: SalvageGame['salvage'], place: string | null): boolean {
  if (s.away || !truckFree(s)) return false;
  const pr = s.presence;
  const dt = Math.hypot(pr.x - s.truck.x, pr.y - s.truck.y);
  if (dt > c.truck.enter + c.truck.rearm) return false;
  if (!place || placeCardKind(c, place) === null) return true;
  const p = pointOf(c, place);
  return dt <= Math.hypot(pr.x - p.x, pr.y - p.y);
}

/** owner1 V4: the drive line's stop nearest a point (content map.driveLine.stops; none: the gate). */
function nearestStop(c: SalvageContent, p: { x: number; y: number }): { x: number; y: number } {
  const stops = Object.entries((c.map.driveLine?.stops ?? {}) as Record<string, [number, number]>).filter(([k]) => k !== 'turn');
  let best = pointOf(c, 'gate');
  let bd = Infinity;
  for (const [k, [x, y]] of stops) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bd - 1e-9 && insideFence(c, { x, y })) {
      bd = d;
      best = stopOf(c, k);
    }
  }
  return best;
}

/** owner1 T4: the refusal the boss's act holds now (`refused.<partner>`: the hook's reason with its figure; `refused.floor`: weigh it first), or null. */
function refusalOf(c: SalvageContent, g: SalvageGame): Txt | null {
  const s = g.salvage;
  const target = s.act.target ?? '';
  if (!target.startsWith('refused.')) return null;
  const what = target.slice(8);
  if (what === 'floor') return { key: 'refusal.weighFirst' };
  const x = { c, s, cash: g.cash, live: true } as unknown as Parameters<typeof hookRefusal>[0];
  const why = hookRefusal(x, what);
  if (!why) return null;
  const sk = fullestSkip(x, what);
  const args: TxtArgs | undefined = why === 'loadCash' && sk ? { x: { money: sk.price - g.cash } } : why === 'floor' && sk ? { kg: { mass_g: sk.mass_g } } : undefined;
  return { key: `refusal.${why}` as TextKey, ...(args ? { args } : {}) };
}

/** The piece spec of the n-th piece cut off a thing (cut order over [grade, g, n] specs), or null when all are off. */
export function pieceAt<T extends readonly unknown[]>(specs: readonly T[], k: number): T | null {
  let i = k;
  for (const sp of specs) {
    const n = sp[2] as number;
    if (i < n) return sp;
    i -= n;
  }
  return null;
}

/** The index of the spec of the n-th piece (Piece.spec). */
export function specIndex(specs: readonly (readonly unknown[])[], k: number): number {
  let i = k;
  for (let s = 0; s < specs.length; s++) {
    const n = specs[s][2] as number;
    if (i < n) return s;
    i -= n;
  }
  return -1;
}

// ============================================================================ the facade's entry (the seam, 16:20)

/** Facade `frame(cfg, g)`: everything the world draws (types.ts FrameTable). */
export function frameCfg(cfg: import('./types').SalvageConfig, g: SalvageGame): FrameTable {
  // H13: memoised on the state's identity (and the content's): the world, the fx canvas, the hints and the
  // labels ask for the same frame several times a change. FrameTable is read-only for every caller.
  // The frame reads g.cash besides the salvage state (a skip's load-cash refusal, the advice behind the chevron).
  let byCfg = FRAMES.get(g.salvage);
  if (!byCfg) FRAMES.set(g.salvage, (byCfg = new WeakMap()));
  const hit = byCfg.get(cfg.salvage);
  if (hit && hit.cash === g.cash) return hit.f;
  // s2a-fix: the content the state reads (layer.ts contentAt: the works layer joined once the works opened), and
  // stage 2's fields added by their owners' files (the dispatcher, the lead's ruling of 26 Nov 09:50; stubs add nothing).
  const c = contentAt(cfg.salvage, g.salvage);
  const f = frameOf(c, g);
  frameWorks(c, g, f);
  frameMoney(c, g, f);
  // owner1 L2: the scene stamp (the same across a presence-only change that leaves the chevron where it was).
  const last = LAST.get(cfg.salvage);
  f.scene = last && last.cash === g.cash && presenceOnly(last.s, g.salvage) && last.f.chevron?.id === f.chevron?.id && last.f.chevron?.x === f.chevron?.x ? (last.f.scene ?? 0) : (last?.f.scene ?? 0) + 1;
  LAST.set(cfg.salvage, { s: g.salvage, cash: g.cash, f });
  byCfg.set(cfg.salvage, { cash: g.cash, f });
  return f;
}

const FRAMES = new WeakMap<SalvageGame['salvage'], WeakMap<SalvageContent, { cash: number; f: FrameTable }>>();
const THINGS = new WeakMap<object, { c: SalvageContent; crew: object; act: object; tier: number; rings: boolean; out: FrameThing[] }>();
const PIECES = new WeakMap<object, { c: SalvageContent; things: object; out: FramePiece[] }>();
/** owner1 L2: the last frame built per content, to keep its scene stamp across a presence-only change. */
const LAST = new WeakMap<SalvageContent, { s: SalvageGame['salvage']; cash: number; f: FrameTable }>();

/** Did only the boss's presence change between two states (every other part the same object)? */
function presenceOnly(a: SalvageGame['salvage'], b: SalvageGame['salvage']): boolean {
  if (a === b) return true;
  if (a.t !== b.t) return false;
  for (const k of Object.keys(b) as (keyof typeof b)[]) {
    if (k === 'presence' || k === 'presenceAt') continue;
    if (a[k] !== b[k]) return false;
  }
  return Object.keys(a).length === Object.keys(b).length;
}
