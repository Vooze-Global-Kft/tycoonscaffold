/**
 * The frame table (types.ts `FrameTable`): everything the world draws from the rules, as a pure function
 * of the content and the state. Sprites are manifest ENTRY ids from content (one table: the content);
 * frames and levels are the art's (stageOf, the bay's share). Everything that runs carries its span
 * (t0 its real start), so the world interpolates on the UI thread and decides no rule. The deprecated
 * fields of types.ts are still filled, so the screens compile while they move.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { dayWord, priceOf } from './board';
import { skipLabelOf } from './cards';
import { chevronOf } from './goals';
import { bayOrder, bayPos, circleCount, circlePos, lanePath, machinePos, piecePos, placeNear, pointOf, skipZone, spotPos, thingPos } from './positions';
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
  ThingAt,
  ToolKind,
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

/** The tool a piece of this grade is worked with (2.4: the work animation follows the piece's family). */
export function toolFor(c: SalvageContent, obj: string, grade: string | null): ToolKind {
  const tier = c.objects[obj]?.tier ?? 1;
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

function machineLook(g: SalvageGame, id: MachineId): MachineLook {
  const m = g.salvage.machines[id];
  if (g.salvage.arriving.some((a) => a.item === id)) return 'arriving';
  if (!m.owned) return 'padlock';
  if (id === 'crucible') {
    const p = g.salvage.machines.crucible.phase;
    return p === 'heating' ? 'heating' : p === 'ready' ? 'ready' : p === 'pouring' ? 'pour' : p === 'cooling' ? 'cooling' : 'idle';
  }
  return m.status === 'working' ? 'working' : m.status === 'trayFull' ? 'trayFull' : 'idle';
}

const poseOf = (act: string, tool: ToolKind | null, loaded: boolean, moving: boolean): Pose => {
  if (act === 'work' && tool) return tool;
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

  const things: FrameThing[] = s.things.map((th) => {
    const o = c.objects[th.obj];
    const p = thingPos(c, th.at);
    const total = o ? o.pieces.reduce((a, sp) => a + sp[2], 0) : 1;
    const tier = o?.tier ?? 0;
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
    };
  });

  const pieces: FramePiece[] = s.pieces.map((pc) => {
    const p = piecePos(c, pc.pile, pc.k, thingAt);
    return { uid: pc.uid, sprite: pieceSprite(c, pc, objOfPiece), grade: pc.grade, load: loadFamily(c, pc.grade), pile: pc.pile, k: pc.k, x: p.x, y: p.y };
  });

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
        pourer: id === 'crucible' && (cr.phase === 'ready' || cr.phase === 'pouring') ? 'boss' : null,
        span: id === 'crucible' && cr.endsAt !== null ? { t0: cr.phaseSince, t1: cr.endsAt } : null,
      };
    });

  const grades = [...bayOrder(c), ...Object.keys(s.bays).filter((gr) => !bayOrder(c).includes(gr))];
  const bays: FrameBay[] = grades.map((gr) => {
    const b = s.bays[gr] ?? { g: 0, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 };
    const p = bayPos(c, gr);
    const cap = (c.bays[gr] ?? 2000) * 1000;
    const def = c.grades[gr];
    const isFe = def?.family === 'fe';
    const kind = def?.bay?.kind ?? (gr === 'conv' ? 'cage' : isFe ? 'heap' : 'stillage');
    const fill = b.g <= 0 ? 0 : Math.min(4, 1 + Math.floor((3 * b.g) / cap));
    const price = priceOf(c, gr, day);
    const aside_g = b.aside.reduce((a, x) => a + x.g, 0);
    const collectable = b.held ? Math.max(0, b.g - cap) : Math.max(0, b.g - b.forCrucible_g - b.forDeal_g);
    const deal = s.deal.phase === 'running' && gr === c.deal.grade ? { a_g: b.forDeal_g, q_g: s.deal.q_g } : null;
    const cru = cr.owned && cr.fromBays && b.forCrucible_g > 0 ? { a_g: b.forCrucible_g, b_g: Math.round(c.machines.crucible.pot * 1000) } : null;
    return {
      grade: gr,
      kind,
      look: def?.bay?.sprite ?? (kind === 'heap' ? `plant.heap.${gr}` : kind === 'cage' ? 'plant.cage.converter' : 'plant.stillage'),
      x: p.x,
      y: p.y,
      share: Math.min(1, b.g / Math.max(1, cap)),
      sprite: isFe ? `bay.ferrous.${fill}` : `stillage.${Math.min(3, fill)}`,
      fill,
      held: b.held,
      g: b.g,
      value: Math.round(((collectable + aside_g) / 1000) * price * 100) / 100,
      price,
      word: dayWord(c, gr, day),
      forDeal: deal,
      forCrucible: cru,
      aside_g,
    };
  });

  const crew: FrameCrew[] = s.crew.map((m) => {
    const from = spotPos(c, m.from, s.things, s.truck);
    const to = spotPos(c, m.to, s.things, s.truck);
    const loadOut = m.load.map((p) => ({ uid: p.uid, sprite: pieceSprite(c, p, objOfPiece), grade: p.grade, g: p.g, load: loadFamily(c, p.grade), ...(p.whole ? { thing: c.objects[p.whole]?.sprite ?? `thing.${p.whole}` } : {}) }));
    const cutting = m.cut ? byUid.get(m.cut.thing) : undefined;
    const tool = m.role === 'cutter' && m.phase === 'work' && cutting ? toolFor(c, cutting.obj, pieceAt(c.objects[cutting.obj]?.pieces ?? [], cutting.cut)?.[0] ?? null) : null;
    const moving = m.phase === 'walkTo' || m.phase === 'walkBack';
    const pose: Pose = tool ?? (m.job === 'pour' ? 'pour' : moving ? (m.load.length ? 'push' : 'walk') : m.phase === 'pick' || m.phase === 'drop' ? 'feed' : 'stand');
    return { id: m.id, role: m.role, pose, tool, sprite: `person.${m.role}`, job: m.job, phase: m.phase, from, to, t0: m.t0, t1: m.t1, carries: m.carries ? (c.grades[m.carries]?.sprite ?? null) : null, load: loadOut };
  });

  const tk = s.truck;
  const park = pointOf(c, 'park');
  const tripTo = tk.trip ? skipZone(c, tk.trip.partner, tk.trip.slot) : null;
  const tripPath = tk.trip ? lanePath(c, { x: tk.x, y: tk.y }, tk.trip.partner, tk.trip.slot) : [];
  const back = tk.trip && (tk.trip.phase === 'back' || tk.trip.phase === 'weigh' || tk.trip.phase === 'tip' || tk.trip.phase === 'park');
  const truck = {
    owned: tk.owned,
    x: tk.x,
    y: tk.y,
    heading: tk.heading,
    load: tk.skip ? { state: tk.skip.trial ? ('trial' as const) : ('full' as const), partner: tk.skip.partner } : null,
    skip: !tk.skip ? ('none' as const) : tk.skip.trial ? ('trial' as const) : ('full' as const),
    by: tk.by,
    leg: tk.trip && tripTo
      ? { phase: tk.trip.phase, partner: tk.trip.partner, t0: tk.trip.t0, t1: tk.trip.endsAt, from: back ? { x: tripTo.x, y: tripTo.y } : { x: tk.x, y: tk.y }, to: back ? park : { x: tripTo.x, y: tripTo.y }, path: back ? [...tripPath].reverse() : tripPath }
      : null,
    hookSpan: tk.hookSince !== null ? { t0: tk.hookSince, t1: tk.hookSince + c.truck.handle_s } : null,
    hook: tk.hookSince !== null ? Math.max(0, Math.min(1, (t - tk.hookSince) / Math.max(1e-6, c.truck.handle_s))) : null,
  };

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
    path: away ? [{ x: mp.x, y: mp.y }, { x: gate.x - 2, y: gate.y }, off] : [],
    load: lotG <= 0 ? 0 : lotG < 50_000 ? 1 : lotG < 200_000 ? 2 : 3,
  };

  const arrivals: FrameArrival[] = s.arriving.map((a) => {
    const to = pointOf(c, a.place);
    const set = Math.min(a.at, a.since + Math.max(0, (a.at - a.since) * 0.7));
    return { item: a.item, kind: a.by, place: a.place, from: { x: gate.x + 20, y: gate.y }, to, span: { t0: a.since, t1: a.at }, phase: t < set ? 'in' : 'setDown' };
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
  for (const b of bays) {
    if (b.g <= 0) continue;
    labels.push({ id: `bay.${b.grade}`, x: b.x, y: b.y, kind: 'bay', text: { key: 'chip.bay', args: { grade: { grade: b.grade }, kg: { mass_g: b.g, step: 'lot' }, x: { money: b.value } } } });
    if (b.held) labels.push({ id: `bay.${b.grade}.held`, x: b.x, y: b.y, kind: 'bay', text: { key: 'chip.held' } });
    if (b.word !== 'usual') labels.push({ id: `bay.${b.grade}.word`, x: b.x, y: b.y, kind: 'bay', text: { key: b.word === 'low' ? 'chip.lowDay' : 'chip.highDay' } });
    if (b.forDeal) labels.push({ id: `bay.${b.grade}.deal`, x: b.x, y: b.y, kind: 'bay', text: { key: 'chip.reservedDeal', args: { foundry: { name: c.deal.partner }, a: { mass_g: b.forDeal.a_g, step: 'lot' }, b: { mass_g: b.forDeal.q_g, step: 'lot' } } } });
    if (b.forCrucible) labels.push({ id: `bay.${b.grade}.crucible`, x: b.x, y: b.y, kind: 'bay', text: { key: 'chip.forCrucible', args: { a: { mass_g: b.forCrucible.a_g, step: 'lot' }, b: { mass_g: b.forCrucible.b_g, step: 'lot' } } } });
    if (b.aside_g > 0) labels.push({ id: `bay.${b.grade}.aside`, x: b.x, y: b.y, kind: 'bay', text: { key: 'chip.aside', args: { kg: { mass_g: b.aside_g, step: 'lot' }, x: { money: b.value } } } });
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
  const tool = workThing ? toolFor(c, workThing.obj, workSpec?.[0] ?? null) : null;
  const ring = workThing ? workRing(workThing.uid) : act.endsAt !== null ? { t0: act.since, t1: act.endsAt, p0: 0 } : null;
  const pk = place ? c.map.places[place]?.card : false;
  const boss: FrameBoss = {
    x: driving ? tk.x : pr.x,
    y: driving ? tk.y : pr.y,
    heading: pr.heading ?? (driving ? tk.heading : 0),
    act: act.kind,
    target,
    tool,
    pose: poseOf(act.kind, tool, s.load.length > 0, pr.moving),
    grade: workSpec?.[0] ?? null,
    ring,
    near: workThing ? { kind: 'thing', id: workThing.uid } : place ? { kind: 'place', id: place } : null,
    button: driving ? 'stepOut' : place && pk ? 'open' : null,
    place,
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

  return { t, epoch: s.epoch, boss, things, pieces, load, machines, bays, crew, truck, flatbed, dropoffCar: null, arrivals, fixtures, skips, labels, chevron: chevronOf({ salvage: c } as SalvageConfig, g), circles, foreman: { active, left_s: left } };
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
  return frameOf(cfg.salvage, g);
}
