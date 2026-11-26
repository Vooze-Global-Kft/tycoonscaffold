/**
 * A loaded save repaired against the content (yard-stage1.md 2.13, 10 "the save reconciles forward
 * and positions are never rules"). Owner: rules-book. Save tag `salvage1` (types.ts SAVE_TAG); layout
 * `salvage.v` 2.
 *
 * FORWARD: a save of layout 2 keeps everything the content still knows: unknown things, pieces, grades,
 * crew roles, partners and shop keys are dropped (their mass is not invented elsewhere); partners,
 * machines and fields the content or the layout added since are filled from a fresh yard; numbers are
 * clamped (no negative grams, no NaN, levels within their tops, at most 50 tickets). A save of another
 * layout, or one that cannot be read, starts afresh. The market clock never goes back (highMs is the
 * larger of the save's and now). POSITIONS ARE NEVER TRUSTED: the boss's presence goes back to a
 * point of the map when it lies outside the yard; the truck's last stop likewise (to its park).
 * The epoch is bumped, so the world snaps.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import type { GameState } from '../types';
import { freshSalvage } from './create';
import { pointOf } from './positions';
import type { BayState, CrewMember, CrewRole, MachineId, PartnerState, SalvageConfig, SalvageGame, SalvageState } from './types';

const num = (x: unknown, d = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const grams = (x: unknown): number => Math.max(0, Math.round(num(x)));
const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
const obj = <T extends object>(x: unknown): Partial<T> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Partial<T>) : {});

/** Inside the yard (with a margin for the lane east of the gate)? */
function inYard(c: SalvageContent, x: unknown, y: unknown): boolean {
  const lane = Math.max(0, ...Object.values(c.map.lane));
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= c.yard.width + lane + 40 && y <= c.yard.depth;
}

function bayOf(c: SalvageContent, b: Partial<BayState>): BayState {
  const g = grams(b.g);
  const aside = arr<{ g: number; price: number; day: number }>(b.aside)
    .map((a) => ({ g: grams(a.g), price: Math.max(0, num(a.price)), day: Math.floor(num(a.day)) }))
    .filter((a) => a.g > 0);
  void c;
  return { g, n: Math.max(0, Math.floor(num(b.n))), held: !!b.held, aside, forCrucible_g: Math.min(g, grams(b.forCrucible_g)), forDeal_g: Math.min(g, grams(b.forDeal_g)) };
}

/** Repair a layout-2 salvage state against the content. */
export function reconcileState(cfg: SalvageConfig, raw: Partial<SalvageState>, now: number): SalvageState {
  const c = cfg.salvage;
  const fresh = freshSalvage(c, now);
  const r = { ...fresh, ...raw } as SalvageState;
  const knownGrade = (gr: unknown) => typeof gr === 'string' && !!c.grades[gr];
  const knownObj = (o: unknown) => typeof o === 'string' && !!c.objects[o];
  const shopKeys = new Set([...c.shop, ...c.dayOneList].map((i) => i.key));

  const clock = obj<SalvageState['clock']>(raw.clock);
  const t = Math.max(0, num(raw.t));
  const s: SalvageState = {
    ...r,
    v: 2,
    t,
    epoch: Math.max(0, Math.floor(num(raw.epoch))) + 1,
    clock: { highMs: Math.max(fresh.clock.highMs, num(clock.highMs)), day: Math.floor(num(clock.day, fresh.clock.day)), startDay: Math.floor(num(clock.startDay, fresh.clock.startDay)) },
    owned: arr<string>(raw.owned).filter((k) => shopKeys.has(k)),
    arriving: arr<SalvageState['arriving'][number]>(raw.arriving).filter((a) => shopKeys.has(a.item) && Number.isFinite(a.at)),
    tier: Math.max(1, Math.min(3, Math.floor(num(raw.tier, 1)))),
    carrier: typeof raw.carrier === 'string' && c.carriers[raw.carrier] ? raw.carrier : fresh.carrier,
    load: arr<SalvageState['load'][number]>(raw.load).filter((p) => knownGrade(p.grade) && grams(p.g) > 0),
    things: arr<SalvageState['things'][number]>(raw.things).filter((th) => knownObj(th.obj) && th.at && typeof th.uid === 'string'),
    pieces: arr<SalvageState['pieces'][number]>(raw.pieces).filter((p) => knownGrade(p.grade) && grams(p.g) > 0),
    waste_g: grams(raw.waste_g),
    scaleRound_g: Math.round(num(raw.scaleRound_g)),
    bays: Object.fromEntries(Object.entries(obj<Record<string, BayState>>(raw.bays)).filter(([gr]) => knownGrade(gr)).map(([gr, b]) => [gr, bayOf(c, obj<BayState>(b))])),
    ladder: { ...fresh.ladder, ...obj(raw.ladder), supplied_g: grams(obj<SalvageState['ladder']>(raw.ladder).supplied_g), rung: Math.max(1, Math.min(9, Math.floor(num(obj<SalvageState['ladder']>(raw.ladder).rung, 1)))), passed: Math.max(0, Math.min(c.rivals.list.length, Math.floor(num(obj<SalvageState['ladder']>(raw.ladder).passed)))) },
    tickets: arr<SalvageState['tickets'][number]>(raw.tickets).slice(-50),
    ticketNo: Math.max(1, Math.floor(num(raw.ticketNo, 1))),
    lessonsSeen: arr<string>(raw.lessonsSeen).filter(knownGrade),
    seen: { places: arr<string>(obj<SalvageState['seen']>(raw.seen).places).filter((p) => typeof p === 'string'), cards: arr<SalvageState['seen']['cards'][number]>(obj<SalvageState['seen']>(raw.seen).cards) },
  };

  // Machines: every machine of the layout, levels within the top.
  const machines = { ...fresh.machines } as SalvageState['machines'];
  const rawM = obj<SalvageState['machines']>(raw.machines);
  for (const id of Object.keys(fresh.machines) as MachineId[]) {
    const m = rawM[id];
    if (!m || typeof m !== 'object') continue;
    const merged = { ...fresh.machines[id], ...m } as never as SalvageState['machines'][typeof id];
    merged.level = merged.owned ? Math.max(1, Math.min(c.levels.maxLevel, Math.floor(num(merged.level, 1)))) : 0;
    merged.hopper = arr<SalvageState['load'][number]>(merged.hopper).filter((p) => knownGrade(p.grade));
    merged.tray_g = Object.fromEntries(Object.entries(obj<Record<string, number>>(merged.tray_g)).filter(([gr]) => knownGrade(gr)).map(([gr, x]) => [gr, grams(x)]));
    (machines as Record<string, unknown>)[id] = merged;
  }
  if (!c.machines.crucible.recipes[machines.crucible.recipe]) machines.crucible = { ...machines.crucible, recipe: fresh.machines.crucible.recipe };
  s.machines = machines;

  // Crew: known roles only, levels within the role's top.
  const roles = new Set(Object.keys(c.crew));
  s.crew = arr<CrewMember>(raw.crew)
    .filter((m) => roles.has(m.role))
    .map((m) => ({ ...m, level: Math.max(1, Math.min(c.crew[m.role as CrewRole].maxlev, Math.floor(num(m.level, 1)))), load: arr(m.load), claims: arr(m.claims) }));

  // Partners: every partner of content (a new one starts as a fresh yard has it).
  const rawP = obj<Record<string, PartnerState>>(raw.partners);
  s.partners = Object.fromEntries(Object.keys(c.partners).map((id) => [id, rawP[id] && typeof rawP[id] === 'object' ? { ...fresh.partners[id], ...rawP[id], skips: arr(rawP[id].skips).length ? arr<PartnerState['skips'][number]>(rawP[id].skips) : fresh.partners[id].skips } : fresh.partners[id]]));

  // Positions are never trusted.
  const pr = obj<SalvageState['presence']>(raw.presence);
  if (!inYard(c, pr.x, pr.y)) s.presence = { ...fresh.presence };
  else s.presence = { x: pr.x as number, y: pr.y as number, driving: !!pr.driving, moving: false, standingFor: 0, heading: Math.floor(num(pr.heading)) };
  s.presenceAt = -1;
  const tk = obj<SalvageState['truck']>(raw.truck);
  if (!inYard(c, tk.x, tk.y)) {
    const park = pointOf(c, 'park');
    s.truck = { ...fresh.truck, ...tk, x: park.x, y: park.y } as SalvageState['truck'];
  }

  // Lifetime counters (goals.ts) survive as they are; a save without them gets none.
  const counts = (raw as { counts?: Record<string, unknown> }).counts;
  if (counts && typeof counts === 'object') (s as unknown as { counts: Record<string, number> }).counts = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Math.max(0, Math.floor(num(v)))]));
  return s;
}

/** A loaded save repaired against the content; never throws for readable input (salvageMode catches the rest). */
export function reconcileSalvage(cfg: SalvageConfig, base: GameState, raw: unknown, now: number): SalvageGame {
  const r = (raw as { salvage?: Partial<SalvageState> } | null)?.salvage;
  if (!r || typeof r !== 'object' || r.v !== 2 || !Array.isArray(r.things) || typeof r.clock !== 'object' || r.clock === null) return { ...base, salvage: freshSalvage(cfg.salvage, now) };
  return { ...base, salvage: reconcileState(cfg, r, now) };
}
