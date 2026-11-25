/**
 * The frame table (types.ts `FrameTable`): everything the world draws from the rules, as a pure function
 * of the content and the state. HOUR 0: complete in shape and positions (things, pieces, the load,
 * machines, bays, crew, the truck, the flatbed, the skips on the lane, labels, the chevron); the looks
 * that need the rate engine (crew legs, the flatbed's motion) follow the state as the stub leaves it.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { piecePos, pointOf, thingPos } from './positions';
import type { FrameBay, FrameCrew, FrameLabel, FrameMachine, FramePiece, FrameSkip, FrameTable, FrameThing, MachineId, MachineLook, SalvageGame, TextKey, ThingAt } from './types';
import { TEXT_KEYS } from './types';

/** Pieces drawn a pile and grade at most (a heap of 40 kg of light iron is a few panels, not 40). */
const MAX_DRAWN = 6;
const PLACE_KEYS = new Set<string>(TEXT_KEYS.place);
const MACHINE_PLACE: Record<MachineId, string> = { hand_stripper: 'stripper', stripper: 'stripper', bench: 'bench', crucible: 'crucible' };

/** The usual piece mass of a grade (its smallest piece in content), grams, for how many pieces a pile draws. */
function pieceMass(c: SalvageContent, grade: string): number {
  let m = Infinity;
  for (const o of Object.values(c.objects)) for (const [gr, g] of o.pieces) if (gr === grade && g < m) m = g;
  return Number.isFinite(m) ? m : 10_000;
}

function machineLook(g: SalvageGame, id: MachineId): MachineLook {
  const m = g.salvage.machines[id];
  if (!m.owned) return 'padlock';
  if (id === 'crucible') {
    const p = g.salvage.machines.crucible.phase;
    return p === 'heating' ? 'heating' : p === 'ready' ? 'ready' : p === 'pouring' ? 'pour' : p === 'cooling' ? 'cooling' : 'idle';
  }
  return m.status === 'working' ? 'working' : m.status === 'trayFull' ? 'trayFull' : 'idle';
}

export function frameOf(c: SalvageContent, g: SalvageGame): FrameTable {
  const s = g.salvage;
  const t = g.stats.playSeconds;
  const byUid = new Map(s.things.map((th) => [th.uid, th.at]));
  const thingAt = (uid: string): ThingAt | null => byUid.get(uid) ?? null;

  const things: FrameThing[] = s.things.map((th) => {
    const o = c.objects[th.obj];
    const p = thingPos(c, th.at);
    const stages = o?.stages ?? 1;
    const n = o ? o.pieces.reduce((a, [, , k]) => a + k, 0) : 1;
    const stage = th.cut <= 0 ? 0 : Math.min(stages - 1, Math.max(1, Math.round((th.cut / n) * (stages - 1))));
    const tier = o?.tier ?? 0;
    return {
      uid: th.uid,
      obj: th.obj,
      sprite: `${o?.sprite ?? 'thing.unknown'}.${stage === 0 ? 'whole' : `cut${stage}`}`,
      stage,
      x: p.x,
      y: p.y,
      locked: tier > s.tier ? (tier >= 3 ? 'tool3' : 'tool2') : null,
      work: th.by ? Math.min(1, th.progress / Math.max(0.1, c.cut.minS * 4)) : null,
    };
  });

  const pieces: FramePiece[] = [];
  for (const [pile, stock] of Object.entries(s.piles)) {
    let k = 0;
    for (const [grade, grams] of Object.entries(stock)) {
      if (grams <= 0) continue;
      const n = Math.min(MAX_DRAWN, Math.max(1, Math.round(grams / pieceMass(c, grade))));
      for (let i = 0; i < n; i++, k++) {
        const p = piecePos(c, pile, k, thingAt);
        pieces.push({ sprite: c.grades[grade]?.sprite ?? 'piece.unknown', grade, pile, k, x: p.x, y: p.y });
      }
    }
  }

  const kg = s.load.reduce((a, p) => a + p.g, 0) / 1000;
  const load = {
    pieces: s.load.map((p) => ({ sprite: c.grades[p.grade]?.sprite ?? 'piece.unknown', grade: p.grade, g: p.g })),
    kg,
    cap: c.carriers[s.carrier] ?? 0,
    carrier: s.carrier,
    sprite: `carrier.${s.carrier}`,
  };

  const machines: FrameMachine[] = (Object.keys(s.machines) as MachineId[])
    .filter((id) => id !== 'stripper' || s.machines.stripper.owned)
    .map((id) => {
      const place = MACHINE_PLACE[id];
      const p = pointOf(c, place);
      const look = machineLook(g, id);
      const tray = Object.values(s.machines[id].tray_g).reduce((a, x) => a + x, 0);
      const cool = id === 'crucible' ? s.machines.crucible.cooling : null;
      return {
        machine: id,
        place,
        sprite: `plant.${id === 'hand_stripper' ? 'handstripper' : id}.${look}`,
        look,
        x: id === 'hand_stripper' && s.machines.stripper.owned ? p.x - 1.6 : p.x,
        y: p.y,
        tray: tray <= 0 ? 0 : tray < 20_000 ? 1 : tray < 60_000 ? 2 : 3,
        ingots: cool ? { grade: cool.grade, n: cool.n, cool: s.machines.crucible.endsAt ? Math.max(0, Math.min(1, 1 - (s.machines.crucible.endsAt - t) / 3)) : 1 } : null,
      };
    });

  const fe = Object.keys(s.bays).filter((gr) => c.grades[gr]?.family === 'fe');
  const other = Object.keys(s.bays).filter((gr) => c.grades[gr]?.family !== 'fe');
  const bp = pointOf(c, 'bays');
  const sp = c.map.points.stillage ? pointOf(c, 'stillage') : { x: bp.x, y: bp.y - 2.5 };
  const bays: FrameBay[] = [
    ...fe.map((gr, i) => ({ gr, x: bp.x - 2.5 + 1.7 * i, y: bp.y, fe: true })),
    ...other.map((gr, i) => ({ gr, x: sp.x - 1.5 + 1.1 * i, y: sp.y, fe: false })),
  ].map(({ gr, x, y, fe: isFe }) => {
    const b = s.bays[gr];
    const cap = (c.bays[gr] ?? 2000) * 1000;
    const fill = b.g <= 0 ? 0 : Math.min(4, 1 + Math.floor((3 * b.g) / cap));
    return { grade: gr, x, y, sprite: isFe ? `bay.ferrous.${fill}` : `stillage.${Math.min(3, fill)}`, fill, held: b.held, g: b.g };
  });

  const crew: FrameCrew[] = s.crew.map((m) => {
    const from = m.from ? pointOf(c, m.from) : pointOf(c, 'office');
    const to = m.to ? pointOf(c, m.to) : from;
    return { id: m.id, role: m.role, sprite: `person.${m.role}`, job: m.job, phase: m.phase, from, to, t0: m.t0, t1: m.t1, carries: m.carries ? (c.grades[m.carries]?.sprite ?? null) : null };
  });

  const tk = s.truck;
  const truck = {
    owned: tk.owned,
    x: tk.x,
    y: tk.y,
    heading: tk.heading,
    skip: !tk.skip ? ('none' as const) : tk.skip.trial ? ('trial' as const) : ('full' as const),
    by: tk.by,
    leg: tk.trip ? { phase: tk.trip.phase, t0: t, t1: tk.trip.endsAt } : null,
    hook: tk.hookRing > 0 ? Math.min(1, tk.hookRing) : null,
  };

  const mp = pointOf(c, 'merchant');
  const lotG = s.merchant.lot.reduce((a, l) => a + l.g, 0);
  const flatbed = { phase: s.merchant.phase, t0: t, t1: s.merchant.endsAt ?? t, x: mp.x, y: mp.y, load: lotG <= 0 ? 0 : lotG < 50_000 ? 1 : lotG < 200_000 ? 2 : 3 };

  const gate = pointOf(c, 'gate');
  const skips: FrameSkip[] = Object.entries(s.partners).map(([pid, ps]) => {
    const lane = c.map.lane[c.partners[pid]?.lane ?? ''] ?? 0;
    const state = ps.skip.phase === 'filling' ? ('filling' as const) : ps.skip.trial ? ('trial' as const) : ('full' as const);
    const key: TextKey = state === 'filling' ? 'refusal.filling' : state === 'trial' ? 'ticket.trial' : 'card.skipState';
    return { partner: pid, x: gate.x + lane, y: gate.y, state, label: { key, args: { partner: { name: pid } } } };
  });

  const labels: FrameLabel[] = [];
  for (const id of Object.keys(c.map.places)) {
    const key = `place.${id}`;
    if (!PLACE_KEYS.has(key)) continue;
    const p = pointOf(c, id);
    labels.push({ id: `place.${id}`, x: p.x, y: p.y, kind: 'place', text: { key: key as TextKey } });
  }
  for (const [zone, z] of Object.entries(c.zones)) {
    if (z.tier <= s.tier) continue;
    labels.push({ id: `padlock.${zone}`, x: z.centre[0], y: z.centre[1] - z.r, kind: 'padlock', text: { key: z.tier >= 3 ? 'refusal.tool3' : 'refusal.tool2' } });
  }
  for (const b of bays) labels.push({ id: `bay.${b.grade}`, x: b.x, y: b.y, kind: 'bay', text: { key: 'chip.bay', args: { grade: { grade: b.grade }, kg: { mass_g: b.g, step: 'lot' } } } });

  const circles = s.crew.some((m) => m.role === 'hand') ? [0, 1].map((n) => ({ ...piecePos(c, `circle.${n}`, 0), r: 0.8 })) : [];

  return { t, things, pieces, load, machines, bays, crew, truck, flatbed, dropoffCar: null, skips, labels, chevron: null, circles };
}
