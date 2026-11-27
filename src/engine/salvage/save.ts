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
  // s2-fix-loop (E4 a): the driver's departures a partner's skip has waited through, a whole number of at least 1, else none.
  for (const ps of Object.values(s.partners)) {
    if (ps.fairWait === undefined) continue;
    const w = Math.floor(num(ps.fairWait));
    if (w >= 1) ps.fairWait = Math.min(w, 1_000_000);
    else delete ps.fairWait;
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
  // s2-fix-loop (X6): a save that has seen stage 2 is kept and frozen by a build at release.stage 1, and put back by a build at stage 2.
  if ((c.release?.stage ?? 2) < 2) {
    if (obj<Record<string, unknown>>(raw.counts).bathSet !== undefined) freezeStage2(c, raw, s, fresh2);
    else if (frozenOf(raw)) s.stage2Frozen = JSON.parse(JSON.stringify(frozenOf(raw)));
  } else if (frozenOf(raw)) thawStage2(c, raw, s, fresh2);
  return s;
}

// ------------------------------------------------------------------------------------------------ X6: kept and frozen

/** The first yard's own places of a whole thing (types.ts ThingAt); every other is stage 2's. */
const FIRST_AT = new Set(['zone', 'dropoff', 'floor']);
/** A first yard's pile key (types.ts PileKey). */
const firstPile = (p: unknown): boolean => typeof p === 'string' && (p === 'dropoff' || p === 'floor' || p.startsWith('beside.') || p.startsWith('zone.') || p.startsWith('circle.'));
/** The first yard's boss acts (types.ts ActKind). */
const FIRST_ACTS = new Set(['none', 'work', 'pickup', 'weigh', 'feed', 'strip', 'circle', 'hook', 'tip', 'drive']);

function frozenOf(raw: Partial<SalvageState>): SalvageState['stage2Frozen'] | null {
  const f = (raw as { stage2Frozen?: unknown }).stage2Frozen;
  return f && typeof f === 'object' && !Array.isArray(f) && (f as { v?: unknown }).v === 1 ? (f as SalvageState['stage2Frozen']) : null;
}

const copy = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

/**
 * RULING2.md 22 X6: a save that has seen stage 2 (counts.bathSet), loaded by a build at release.stage 1. Everything the
 * first yard does not own goes into `stage2Frozen` untouched: the stage-2 fields AS SAVED, counts.bathSet, the rung and the
 * tool tier as saved, the things the first yard cannot hold (the works layer's objects, the stage's places), the pieces
 * and bays of the works layer's grades and the pieces on the stage's piles, the bridge partners, the works layer's shop
 * keys, a bridge skip on the truck, a first-yard partner's skip things of the works layer. The running state is the
 * first yard's: the stage-2 fields fresh (nothing of stage 2 dates, pays or shows), no bathSet (the first yard's rules
 * and content), the rung at most the first yard's top. A crew member on the stage's work stops where he is (idle); what
 * he carried is put down on the tipping floor (the first yard's to weigh in; a works-layer grade goes aside); the boss's
 * stage-2 act ends.
 */
function freezeStage2(c: SalvageContent, raw: Partial<SalvageState>, s: SalvageState, fresh2: Stage2Fields): void {
  const known = (gr: unknown) => typeof gr === 'string' && !!c.grades[gr];
  const knownObj = (o: unknown) => typeof o === 'string' && !!c.objects[o];
  const shopKeys = new Set([...c.shop, ...c.dayOneList].map((i) => i.key));
  const t = s.t;
  const F: Record<string, unknown> & { v: 1 } = { v: 1 };
  F.fields = copy(Object.fromEntries(STAGE2_KEYS.map((k) => [k, (raw as Record<string, unknown>)[k]])));
  Object.assign(s, copy(fresh2));
  const counts = (s.counts ??= {});
  F.bathSet = counts.bathSet;
  delete counts.bathSet;
  F.rung = s.ladder.rung;
  s.ladder = { ...s.ladder, rung: Math.min(s.ladder.rung, (c.ladder as { topRung?: number }).topRung ?? 3) };
  F.tier = Math.floor(num(raw.tier, 1));
  // The yard second it froze: a build at stage 2 moves every stage-2 date on by the time the first yard ran since (thawStage2).
  F.t = t;
  // Whole things: the works layer's objects (save.ts dropped them above) and the stage's places.
  const rawThings = arr<SalvageState['things'][number]>(raw.things);
  const aside = rawThings.filter((th) => th && th.at && typeof th.uid === 'string' && (!knownObj(th.obj) || !FIRST_AT.has(th.at.at)));
  const gone = new Set(aside.map((th) => th.uid));
  s.things = s.things.filter((th) => !gone.has(th.uid));
  F.things = copy(aside);
  // Pieces: the works layer's grades (dropped above) and the stage's piles.
  F.pieces = copy(arr<SalvageState['pieces'][number]>(raw.pieces).filter((p) => p && grams(p.g) > 0 && (!known(p.grade) || !firstPile(p.pile))));
  s.pieces = s.pieces.filter((p) => firstPile(p.pile));
  F.bays = copy(Object.fromEntries(Object.entries(obj<Record<string, BayState>>(raw.bays)).filter(([gr]) => !known(gr))));
  F.load = copy(arr<SalvageState['load'][number]>(raw.load).filter((p) => !known(p?.grade) && grams(p?.g) > 0));
  const rawP = obj<Record<string, PartnerState>>(raw.partners);
  F.partners = copy(Object.fromEntries(Object.entries(rawP).filter(([id]) => !c.partners[id])));
  F.owned = copy(arr<string>(raw.owned).filter((k) => !shopKeys.has(k)));
  F.arriving = copy(arr<SalvageState['arriving'][number]>(raw.arriving).filter((a) => !shopKeys.has(a?.item)));
  F.lessonsSeen = copy(arr<string>(raw.lessonsSeen).filter((g) => !known(g)));
  // Machines' hoppers and trays of the works layer's grades.
  const mach: Record<string, { hopper: unknown[]; tray_g: Record<string, number | undefined> }> = {};
  for (const [id, m] of Object.entries(obj<Record<string, SalvageState['machines'][MachineId]>>(raw.machines))) {
    if (!m || typeof m !== 'object') continue;
    const hopper = arr<SalvageState['load'][number]>(m.hopper).filter((p) => !known(p?.grade));
    const tray_g = Object.fromEntries(Object.entries(obj<Record<string, number>>(m.tray_g)).filter(([gr]) => !known(gr)));
    if (hopper.length || Object.keys(tray_g).length) mach[id] = copy({ hopper, tray_g });
  }
  F.machines = mach;
  // A first-yard partner's waiting skip may hold the works layer's things (2.9's grows): they wait aside, by slot and fullAt.
  const skipExtra: Record<string, { slot: number; fullAt: number; contents: Record<string, number> }[]> = {};
  for (const [id, ps] of Object.entries(s.partners)) {
    for (const sk of ps.skips) {
      const extra = Object.fromEntries(Object.entries(sk.contents ?? {}).filter(([o]) => !knownObj(o)));
      if (!Object.keys(extra).length) continue;
      (skipExtra[id] ??= []).push({ slot: sk.slot, fullAt: sk.fullAt, contents: extra });
      sk.contents = Object.fromEntries(Object.entries(sk.contents).filter(([o]) => knownObj(o)));
    }
  }
  F.skipExtra = skipExtra;
  // The truck on a bridge trip, or with a skip of the stage's things on it: the trip ends, the skip (paid) waits aside.
  const tr = s.truck;
  const bridgeTrip = !!tr.trip && !c.partners[tr.trip.partner];
  const skipAside = !!tr.skip && (!c.partners[tr.skip.partner] || Object.keys(tr.skip.contents).some((o) => !knownObj(o)));
  if (bridgeTrip || skipAside) {
    if (tr.skip) F.truckSkip = copy(tr.skip);
    s.truck = { ...tr, trip: null, skip: null, earmark: null, by: null };
    for (const m of s.crew) if (m.role === 'driver' && m.job === 'drive') idle(m, t);
  }
  // Crew on the stage's work: stopped where they are; what they carried is put down on the tipping floor.
  const first = new Set<string>(['scale', ...Object.keys(s.machines)]);
  const onStage2 = (m: CrewMember) => m.job === 'rack' || (typeof m.dest === 'string' && !first.has(m.dest)) || (!!m.run && typeof m.run.dest === 'string' && !first.has(m.run.dest));
  let k = s.pieces.reduce((a, p) => (p.pile === 'floor' ? Math.max(a, p.k + 1) : a), 0);
  for (const m of s.crew) {
    if (!onStage2(m)) continue;
    for (const p of arr<SalvageState['load'][number]>(m.load)) {
      if (known(p.grade)) s.pieces.push({ ...p, pile: 'floor', k: k++, claim: null });
      else (F.pieces as unknown[]).push(copy({ ...p, pile: 'floor', k: -1, claim: null }));
    }
    for (const p of s.pieces) if (p.claim === m.id) p.claim = null;
    for (const th of s.things) if (th.by === m.id) th.by = null;
    idle(m, t);
  }
  // The boss's act of the stage (commission, rack, lot, crate) ends; nothing of the stage stays claimed by him.
  if (!FIRST_ACTS.has(s.act.kind)) s.act = { kind: 'none', target: null, since: t, endsAt: null };
  // The boss may have stood in the back field (west of the old fence): he goes back to a point of the first yard's map.
  if (!inYard(c, s.presence.x, s.presence.y)) s.presence = { ...freshSalvage(c, 0).presence };
  // In the forklift (stage 2's) he is on foot now: the first yard has no forklift.
  if (obj<{ by?: unknown }>(raw.forklift).by === 'boss' && s.truck.by !== 'boss') s.presence = { ...s.presence, driving: false };
  s.stage2Frozen = F;
}

/** The yard-second dates of what freezeStage2 set aside, moved on by `d` (the works' plates, the lots, the Yard sale, the stage's things, the bridge partners' skips, what was arriving). */
function shiftDates(F: Record<string, unknown>, d: number): void {
  if (!(d > 0)) return;
  const on = (o: Record<string, unknown> | null | undefined, ...keys: string[]) => {
    if (!o || typeof o !== 'object') return;
    for (const key of keys) if (fin(o[key])) o[key] = (o[key] as number) + d;
  };
  const f = obj<Record<string, Record<string, unknown>>>(F.fields);
  for (const w of Object.values(obj<Record<string, Record<string, unknown>>>(f.works))) {
    if (!w || typeof w !== 'object') continue;
    on(w, 'since', 'commissionAt', 'segStart');
    on(w.work as Record<string, unknown>, 'startAt');
    const h = w.heat as Record<string, unknown> | undefined;
    on(h, 'phaseSince', 'endsAt', 'lastFeedAt');
    on(h?.cooling as Record<string, unknown>, 'since', 'until');
    on(w.car as Record<string, unknown>, 't0', 'end');
    const mv = w.move as Record<string, unknown> | undefined;
    on(mv, 't0', 'end');
    for (const q of arr<Record<string, unknown>>(mv?.planned)) on(q, 'end');
    on(w.course as Record<string, unknown>, 't0');
  }
  on(f.lots, 'nextAt');
  on(f.reuse, 'nextAt', 'vanAt');
  for (const th of arr<{ at: Record<string, unknown> }>(F.things)) on(th?.at, 'since');
  for (const p of Object.values(obj<Record<string, { skips?: unknown }>>(F.partners))) for (const sk of arr<Record<string, unknown>>(p?.skips)) on(sk, 'setAt', 'fullAt');
  for (const a of arr<Record<string, unknown>>(F.arriving)) on(a, 'at');
}

function idle(m: CrewMember, t: number): void {
  const at: [number, number] = m.from && 'xy' in m.from ? [m.from.xy[0], m.from.xy[1]] : [0, 0];
  delete m.run;
  delete m.dest;
  delete m.course;
  Object.assign(m, { job: 'idle', phase: 'wait', from: { xy: at }, to: { xy: at }, t0: t, t1: t, carries: null, load: [], claims: [], cut: null });
}

/**
 * RULING2.md 22 X6, the other way: a frozen save loaded by a build at stage 2 goes on from where it was. The stage-2
 * fields come back as saved (repaired as any layout-3 save's), with counts.bathSet, the rung (never lower than the first
 * yard reached meanwhile), the tool tier, the things and pieces set aside (a uid or a pile place taken meanwhile gets the
 * next free one; nothing of them stays claimed), the bays, partners, shop keys, the machines' works-layer grades; a
 * bridge skip waits on the truck when the truck is free (else it stays aside for the next load); a first-yard partner's
 * skip things of the works layer go back to the skip they came from while it still waits there.
 */
function thawStage2(c: SalvageContent, raw: Partial<SalvageState>, s: SalvageState, fresh2: Stage2Fields): void {
  const F = copy(frozenOf(raw)!) as Record<string, unknown>;
  const k = mergedContent(c);
  const t = s.t;
  // Stage 2 goes on from where it was: every date of what was set aside moves on by the yard time the first yard ran meanwhile.
  shiftDates(F, Math.max(0, t - num(F.t, t)));
  Object.assign(s, repairStage2({ ...raw, ...obj<Partial<SalvageState>>(F.fields) } as Partial<SalvageState>, fresh2, t));
  const plates = c.works?.plates;
  if (plates) for (const id of Object.keys(s.works)) if (!plates[id]) delete s.works[id];
  // Nobody sits in the forklift on a load (the boss is where the first yard left him).
  if (s.forklift && s.forklift.by === 'boss' && !s.presence.driving) s.forklift = { ...s.forklift, by: null };
  if (F.bathSet !== undefined) (s.counts ??= {}).bathSet = Math.max(0, Math.floor(num(F.bathSet)));
  s.ladder = { ...s.ladder, rung: Math.max(s.ladder.rung, Math.max(1, Math.min(9, Math.floor(num(F.rung, 1))))) };
  s.tier = Math.max(s.tier, Math.max(1, Math.min(topToolTier(k), Math.floor(num(F.tier, 1)))));
  const knownGrade = (gr: unknown) => typeof gr === 'string' && !!k.grades[gr];
  const knownObj = (o: unknown) => typeof o === 'string' && !!k.objects[o];
  const uids = new Set([...s.things.map((th) => th.uid), ...s.pieces.map((p) => p.uid)]);
  let n = 0;
  const fresh = (u: string) => {
    if (!uids.has(u)) return u;
    let v = `${u}~${n++}`;
    while (uids.has(v)) v = `${u}~${n++}`;
    return v;
  };
  for (const th of arr<SalvageState['things'][number]>(F.things)) {
    if (!th || !knownObj(th.obj) || !th.at) continue;
    const uid = fresh(th.uid);
    uids.add(uid);
    s.things.push({ ...th, uid, by: null });
  }
  const pileTop = new Map<string, Set<number>>();
  for (const p of s.pieces) (pileTop.get(p.pile) ?? pileTop.set(p.pile, new Set()).get(p.pile)!).add(p.k);
  for (const p of arr<SalvageState['pieces'][number]>(F.pieces)) {
    if (!p || !knownGrade(p.grade) || !(grams(p.g) > 0) || typeof p.pile !== 'string') continue;
    const used = pileTop.get(p.pile) ?? pileTop.set(p.pile, new Set()).get(p.pile)!;
    let pk = Number.isInteger(p.k) && p.k >= 0 ? p.k : 0;
    while (used.has(pk)) pk++;
    used.add(pk);
    const uid = fresh(p.uid);
    uids.add(uid);
    s.pieces.push({ ...p, uid, k: pk, claim: null });
  }
  for (const [gr, b] of Object.entries(obj<Record<string, BayState>>(F.bays))) {
    if (!knownGrade(gr)) continue;
    const had = s.bays[gr];
    const add = bayOf(c, obj<BayState>(b));
    s.bays[gr] = had ? { ...had, g: had.g + add.g, n: had.n + add.n, aside: [...had.aside, ...add.aside] } : add;
  }
  s.load = [...s.load, ...arr<SalvageState['load'][number]>(F.load).filter((p) => knownGrade(p?.grade))];
  for (const [id, p] of Object.entries(obj<Record<string, PartnerState>>(F.partners))) if (k.partners[id] && p && typeof p === 'object' && Array.isArray(p.skips)) s.partners[id] = { ...p, skips: arr(p.skips) };
  const shopKeys = new Set([...k.shop, ...k.dayOneList].map((i) => i.key));
  s.owned = [...new Set([...s.owned, ...arr<string>(F.owned).filter((key) => shopKeys.has(key))])];
  s.arriving = [...s.arriving, ...arr<SalvageState['arriving'][number]>(F.arriving).filter((a) => shopKeys.has(a?.item) && Number.isFinite(a.at)).map((a) => ({ ...a, at: Math.max(a.at, t) }))];
  s.lessonsSeen = [...new Set([...s.lessonsSeen, ...arr<string>(F.lessonsSeen).filter(knownGrade)])];
  for (const [id, m] of Object.entries(obj<Record<string, { hopper: SalvageState['load']; tray_g: Record<string, number> }>>(F.machines))) {
    const mm = (s.machines as Record<string, SalvageState['machines'][MachineId]>)[id];
    if (!mm || !m) continue;
    mm.hopper = [...mm.hopper, ...arr<SalvageState['load'][number]>(m.hopper).filter((p) => knownGrade(p?.grade))];
    for (const [gr, x] of Object.entries(obj<Record<string, number>>(m.tray_g))) if (knownGrade(gr)) mm.tray_g[gr] = (mm.tray_g[gr] ?? 0) + grams(x);
  }
  for (const [id, list] of Object.entries(obj<Record<string, { slot: number; fullAt: number; contents: Record<string, number> }[]>>(F.skipExtra))) {
    const ps = s.partners[id];
    if (!ps) continue;
    for (const e of arr<{ slot: number; fullAt: number; contents: Record<string, number> }>(list)) {
      const sk = ps.skips.find((q) => q.slot === e.slot && q.fullAt === e.fullAt);
      if (sk) for (const [o, cnt] of Object.entries(obj<Record<string, number>>(e.contents))) if (knownObj(o)) sk.contents[o] = (sk.contents[o] ?? 0) + Math.max(0, Math.floor(num(cnt)));
    }
  }
  delete s.stage2Frozen;
  const skip = F.truckSkip as SalvageState['truck']['skip'] | undefined;
  if (skip) {
    if (!s.truck.skip && !s.truck.trip && s.truck.by === null) s.truck = { ...s.truck, skip };
    else s.stage2Frozen = { v: 1, truckSkip: skip };
  }
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
