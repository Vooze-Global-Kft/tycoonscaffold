/**
 * A loaded save repaired against the content (yard-stage1.md 2.13, 10 "the save reconciles forward
 * and positions are never rules"). Owner: rules-book. Save tag `salvage1` (types.ts SAVE_TAG); layout
 * `salvage.v` 3 (stage 2, 2.20; contract2): layouts 2 and 3 load. A LAYOUT-2 SAVE (the first yard, the owner's
 * phone) keeps every field it has and gets the stage-2 fields fresh (./state2.ts `freshStage2`: createdMs the
 * load's time, sessions2At null, lots.nextAt null); a layout-3 save's stage-2 fields are repaired
 * (`repairStage2`). On a layout-2 save: a merchant's round under way ends no later than the save's clock +
 * `merchant.load_s` + `merchant.round_s` (a save of the unmerged branch's old long round, 14.3).
 *
 * FORWARD: a save of layout 2 keeps everything the content still knows: unknown things, pieces, grades,
 * crew roles, partners and shop keys are dropped (their mass is not invented elsewhere); partners,
 * machines and fields the content or the layout added since are filled from a fresh yard; numbers are
 * clamped (no negative grams, no NaN, levels within their tops, at most 50 tickets). A save of a NEWER
 * layout (v > 3, finite: an over-the-air rollback of the app) loads as layout 3, its unknown fields kept
 * (s2a-fix: it used to start a fresh yard and wipe it). A save of an older layout, or one that cannot be
 * read, starts afresh. WHAT IS KNOWN is the content WITH the works layer (./layer.ts mergedContent, s2a-fix):
 * a save may already hold stage-2 grades, things, shop keys, carriers or the tier-4 tool, which are kept
 * (nothing of the layer is ADDED: partners and machines are filled from the base content's fresh yard). The market clock never goes back (highMs is the
 * larger of the save's and now). POSITIONS ARE NEVER TRUSTED: the boss's presence goes back to a
 * point of the map when it lies outside the yard; the truck's last stop likewise (to its park).
 * The epoch is bumped, so the world snaps.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import type { GameState } from '../types';
import { freshSalvage } from './create';
import { RUN_MAX } from './group';
import { mergedContent, topToolTier } from './layer';
import { mapAt, pointOf } from './positions';
import { repairStage2, STAGE2_KEYS, type Stage2Fields } from './state2';
import type { BayState, CrewJob, CrewMember, CrewRole, CrewRun, MachineId, PartnerState, RunCourse, RunKind, SalvageConfig, SalvageGame, SalvageState, TripPlan } from './types';

const num = (x: unknown, d = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const grams = (x: unknown): number => Math.max(0, Math.round(num(x)));
const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
const obj = <T extends object>(x: unknown): Partial<T> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Partial<T>) : {});

/** Inside the yard (with a margin for the lane east of the gate)? */
function inYard(c: SalvageContent, x: unknown, y: unknown, x0 = 0): boolean {
  const lane = Math.max(0, ...Object.values(c.map.lane));
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && x >= x0 && y >= 0 && x <= c.yard.width + lane + 40 && y <= c.yard.depth;
}

function bayOf(c: SalvageContent, b: Partial<BayState>): BayState {
  const g = grams(b.g);
  const aside = arr<{ g: number; price: number; day: number }>(b.aside)
    .map((a) => ({ g: grams(a.g), price: Math.max(0, num(a.price)), day: Math.floor(num(a.day)) }))
    .filter((a) => a.g > 0);
  void c;
  const bay: BayState = { g, n: Math.max(0, Math.floor(num(b.n))), held: !!b.held, aside, forCrucible_g: Math.min(g, grams(b.forCrucible_g)), forDeal_g: Math.min(g, grams(b.forDeal_g)) };
  // v3 (2.8.1): reserves by station, kept when readable (a layout-2 save has none; Phase B maps forCrucible_g to reserved.crucible).
  if (b.reserved !== undefined) bay.reserved = Object.fromEntries(Object.entries(obj<Record<string, number>>(b.reserved)).filter(([k]) => typeof k === 'string' && k.length > 0 && k.length <= 64).map(([k, x]) => [k, Math.min(g, grams(x))]));
  return bay;
}

const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isSpot = (v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * engine2-group (stage 2, 2.1): a grouped run saved mid-way is kept when it is well formed and bounded
 * (at most RUN_MAX loads or things, finite instants in order, string claims); its end is never before the
 * save's clock (it lands at the first instant). A stage-1 save has no run: nothing to migrate.
 */
function runOf(raw: unknown, t: number): CrewRun | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<CrewRun>;
  if (!fin(r.t0) || !fin(r.end) || !Array.isArray(r.start) || r.start.length !== 2 || !r.start.every(fin) || r.end < r.t0) return null;
  const loads = r.loads;
  const cuts = r.cuts;
  if ((loads === undefined) === (cuts === undefined)) return null;
  if (loads !== undefined) {
    if (!Array.isArray(loads) || !loads.length || loads.length > RUN_MAX) return null;
    for (const L of loads) {
      if (!L || !Array.isArray(L.claims) || L.claims.length > RUN_MAX * 4 || !L.claims.every((c) => typeof c === 'string')) return null;
      if (!fin(L.pickAt) || !fin(L.dropAt) || L.dropAt < L.pickAt || !isSpot(L.spot)) return null;
    }
    if (typeof r.dest !== 'string') return null;
  }
  if (cuts !== undefined) {
    if (!Array.isArray(cuts) || !cuts.length || cuts.length > RUN_MAX) return null;
    for (const C of cuts) if (!C || typeof C.thing !== 'string' || !fin(C.walkEnd) || !fin(C.cutEnd) || C.cutEnd < C.walkEnd) return null;
  }
  const n = (loads ?? cuts)!.length;
  return { ...(r as CrewRun), end: Math.max(r.end, t), k: n, legS: fin(r.legS) ? r.legS : 0 };
}

const JOBS = new Set(['feed', 'circle', 'tray', 'dropoff', 'wholeThing', 'floor', 'cutDropoff', 'cutFloor']);
const WHERE = new Set(['dropoff', 'floor']);
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;

/**
 * 14.1 (d): a crew member's run (its kind, place, destination and start) is kept when well formed and of
 * a kind his role makes, its start not after the save's clock and its machines known; else dropped (he
 * chooses by the first yard's order at his next departure). A stage-1 save has none.
 */
function courseOf(raw: unknown, role: string, t: number, machines: Set<string>): RunCourse | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<RunCourse>;
  if (!fin(r.t0) || r.t0 > t || !str(r.job) || !JOBS.has(r.job) || !r.kind || typeof r.kind !== 'object') return null;
  const k = r.kind as Record<string, unknown>;
  const mach = (v: unknown) => str(v) && machines.has(v);
  let kind: RunKind | null = null;
  if (role === 'cutter') kind = k.k === 'cut' && WHERE.has(k.where as string) ? { k: 'cut', where: k.where as 'dropoff' | 'floor' } : null;
  else if (role === 'hand') {
    if (k.k === 'feed' && str(k.pile) && mach(k.dest)) kind = { k: 'feed', pile: k.pile, dest: k.dest as MachineId };
    else if (k.k === 'pile' && str(k.pile)) kind = { k: 'pile', pile: k.pile };
    else if (k.k === 'tray' && mach(k.id)) kind = { k: 'tray', id: k.id as MachineId };
    else if ((k.k === 'loose' || k.k === 'whole') && WHERE.has(k.where as string)) kind = { k: k.k, where: k.where as 'dropoff' | 'floor' };
    else if (k.k === 'floorWhole' && (k.dest === 'scale' || mach(k.dest))) kind = { k: 'floorWhole', dest: k.dest as MachineId | 'scale' };
  }
  return kind ? { t0: r.t0, job: r.job as CrewJob, kind } : null;
}

function planOf(raw: unknown, t: number): TripPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<TripPlan>;
  if (!fin(p.t0) || !fin(p.x) || !fin(p.y) || !Array.isArray(p.ends) || p.ends.length !== 7 || !p.ends.every(fin)) return null;
  for (let i = 1; i < 7; i++) if (p.ends[i] < p.ends[i - 1]) return null;
  const ends = [...p.ends];
  if (ends[6] < t) ends[6] = t;
  return { t0: p.t0, x: p.x, y: p.y, ends };
}

/** Repair a layout-2 or layout-3 salvage state against the content (it comes out as layout 3). */
export function reconcileState(cfg: SalvageConfig, raw: Partial<SalvageState>, now: number): SalvageState {
  const c = cfg.salvage;
  // What a save may hold: the families WITH the works layer (s2a-fix; the base content itself without one).
  const k = mergedContent(c);
  const fresh = freshSalvage(c, now);
  const r = { ...fresh, ...raw } as SalvageState;
  const knownGrade = (gr: unknown) => typeof gr === 'string' && !!k.grades[gr];
  const knownObj = (o: unknown) => typeof o === 'string' && !!k.objects[o];
  const shopKeys = new Set([...k.shop, ...k.dayOneList].map((i) => i.key));

  const clock = obj<SalvageState['clock']>(raw.clock);
  const t = Math.max(0, num(raw.t));
  const s: SalvageState = {
    ...r,
    v: 3,
    t,
    epoch: Math.max(0, Math.floor(num(raw.epoch))) + 1,
    clock: { highMs: Math.max(fresh.clock.highMs, num(clock.highMs)), day: Math.floor(num(clock.day, fresh.clock.day)), startDay: Math.floor(num(clock.startDay, fresh.clock.startDay)) },
    owned: arr<string>(raw.owned).filter((k) => shopKeys.has(k)),
    arriving: arr<SalvageState['arriving'][number]>(raw.arriving).filter((a) => shopKeys.has(a.item) && Number.isFinite(a.at)),
    // The tool tier within the merged content's highest tool's (the plasma cutter's 4 once the layer has it; 3 on the first yard's content).
    tier: Math.max(1, Math.min(topToolTier(k), Math.floor(num(raw.tier, 1)))),
    carrier: typeof raw.carrier === 'string' && k.carriers[raw.carrier] ? raw.carrier : fresh.carrier,
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
  // A grouped run (2.1): kept when well formed; a broken one is dropped, its member idle where it began,
  // what it claimed released (pieces and things it held go back to their piles; nothing is invented).
  for (const m of s.crew) {
    if (m.course === undefined) continue;
    const course = courseOf(m.course, m.role, t, new Set(Object.keys(machines)));
    if (course) m.course = course;
    else delete m.course;
  }
  for (const m of s.crew) {
    if (m.run === undefined) continue;
    const run = runOf(m.run, t);
    if (run) {
      m.run = run;
      continue;
    }
    const st = Array.isArray((m.run as Partial<CrewRun> | null)?.start) ? (m.run as CrewRun).start : null;
    delete m.run;
    delete m.dest;
    for (const p of s.pieces) if (p.claim === m.id) p.claim = null;
    for (const th of s.things) if (th.by === m.id) th.by = null;
    const at: [number, number] = st && st.every(fin) ? [st[0], st[1]] : [0, 0];
    Object.assign(m, { job: 'idle', phase: 'wait', from: { xy: at }, to: { xy: at }, t0: t, t1: t, carries: null, load: [], claims: [], cut: null });
  }

  // Partners: every partner of content (a new one starts as a fresh yard has it).
  const rawP = obj<Record<string, PartnerState>>(raw.partners);
  s.partners = Object.fromEntries(Object.keys(c.partners).map((id) => [id, rawP[id] && typeof rawP[id] === 'object' ? { ...fresh.partners[id], ...rawP[id], skips: arr(rawP[id].skips).length ? arr<PartnerState['skips'][number]>(rawP[id].skips) : fresh.partners[id].skips } : fresh.partners[id]]));
  // A works-layer partner (the bridge partners, 2.9) the save ALREADY holds is kept as saved (s2a-fix): none is
  // added here (Phase B's worksOpen makes their states when the layer opens). Its skips must be a list.
  for (const id of Object.keys(k.partners)) {
    if (id in c.partners) continue;
    const p = rawP[id];
    if (p && typeof p === 'object' && Array.isArray(p.skips)) s.partners[id] = { ...p, skips: arr<PartnerState['skips'][number]>(p.skips) };
  }

  // Positions are never trusted.
  const pr = obj<SalvageState['presence']>(raw.presence);
  // join2b: once the works opened the boss may stand in the back field, west of the old fence (the merged map's x0).
  const west = obj<Record<string, number>>(raw.counts).bathSet !== undefined ? mapAt(c, true).x0 : 0;
  if (!inYard(c, pr.x, pr.y, west)) s.presence = { ...fresh.presence };
  else s.presence = { x: pr.x as number, y: pr.y as number, driving: !!pr.driving, moving: false, standingFor: 0, heading: Math.floor(num(pr.heading)) };
  s.presenceAt = -1;
  const tk = obj<SalvageState['truck']>(raw.truck);
  if (!inYard(c, tk.x, tk.y)) {
    const park = pointOf(c, 'park');
    s.truck = { ...fresh.truck, ...tk, x: park.x, y: park.y } as SalvageState['truck'];
  }
  // A planned trip (2.1): kept when well formed; else the trip starts again from its walk at the save's clock.
  if (s.truck?.trip && (s.truck.trip as { plan?: unknown }).plan !== undefined) {
    const plan = planOf(s.truck.trip.plan, t);
    if (plan) s.truck = { ...s.truck, trip: { ...s.truck.trip, plan } };
    else {
      const { plan: _drop, ...trip } = s.truck.trip;
      void _drop;
      s.truck = { ...s.truck, trip: { ...trip, phase: 'walk', t0: t, endsAt: t } };
    }
  }

  // Stage 2 (contract v3, 2.20): a layout-2 save gets the stage's fields fresh (from `fresh`, already in `r`
  // for every key it lacks: and it lacks them all); a layout-3 save's are repaired. Nothing of the first yard is touched.
  const fresh2 = Object.fromEntries(STAGE2_KEYS.map((k) => [k, fresh[k]])) as Stage2Fields;
  const v = (raw as { v?: unknown }).v;
  Object.assign(s, typeof v === 'number' && v >= 3 ? repairStage2(raw, fresh2, t) : fresh2);
  // A NEWER layout (the lead's ruling 4): the raw save kept aside untouched (a copy, without a copy it held itself).
  if (typeof v === 'number' && v > 3) {
    const { newerSave: _nested, ...rest } = raw as Partial<SalvageState>;
    void _nested;
    s.newerSave = { v, raw: JSON.parse(JSON.stringify(rest)) };
  } else if (v === 3 && (raw as Partial<SalvageState>).newerSave) {
    const n = (raw as Partial<SalvageState>).newerSave!;
    if (typeof n === 'object' && n && typeof n.v === 'number' && Number.isFinite(n.v) && n.v > 3) s.newerSave = { v: n.v, raw: n.raw };
    else delete s.newerSave;
  }
  // The plates a save holds: those the content knows (with `works` in the content), levels within the plate's top.
  const plates = c.works?.plates;
  if (plates) {
    for (const id of Object.keys(s.works)) {
      const def = plates[id];
      if (!def) delete s.works[id];
      else s.works[id].level = s.works[id].owned ? Math.max(1, Math.min(def.maxLevel, s.works[id].level)) : 0;
    }
  }
  // The merchant's round under way ends no later than the save's clock + loading + the round (RULING2 14.3:
  // a save written on the unmerged branch during the old long round would otherwise load with it under way).
  // Only a LAYOUT-2 save can hold the old long round (it was removed before layout 3 existed).
  const mEnd = t + c.merchant.load_s + c.merchant.round_s;
  if ((raw as { v?: unknown }).v === 2 && s.merchant && s.merchant.phase !== 'waiting' && (typeof s.merchant.endsAt !== 'number' || !Number.isFinite(s.merchant.endsAt) || s.merchant.endsAt > mEnd)) s.merchant = { ...s.merchant, endsAt: mEnd };

  // Lifetime counters (goals.ts) survive as they are; a save without them gets none.
  const counts = (raw as { counts?: Record<string, unknown> }).counts;
  if (counts && typeof counts === 'object') (s as unknown as { counts: Record<string, number> }).counts = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Math.max(0, Math.floor(num(v)))]));
  return s;
}

/** A loaded save repaired against the content; never throws for readable input (salvageMode catches the rest). */
export function reconcileSalvage(cfg: SalvageConfig, base: GameState, raw: unknown, now: number): SalvageGame {
  const r = (raw as { salvage?: Partial<SalvageState> } | null)?.salvage;
  const v = (r as { v?: unknown } | undefined)?.v;
  // Layouts 2 and 3; a NEWER layout (finite v > 3: the app rolled back over the air) loads as layout 3, never a fresh yard.
  const layoutOk = v === 2 || (typeof v === 'number' && Number.isFinite(v) && v >= 3);
  if (!r || typeof r !== 'object' || !layoutOk || !Array.isArray(r.things) || typeof r.clock !== 'object' || r.clock === null) return { ...base, salvage: freshSalvage(cfg.salvage, now) };
  return { ...base, salvage: reconcileState(cfg, r, now) };
}
