/**
 * The rate engine's measures and the instant's checks (yard-stage1.md 2.11, 2.12, 2.14 step 6): rated
 * capacity R (the throughput of the crew and machines with full feed and no boss), purchases arriving,
 * rungs, rivals passed, the deal offer, partners opening, goals by id. Owner: rules-sim.
 */
import { checkGoals } from './goals';
import { levelled, rungReached } from './ladder';
import { passedNow } from './rivals';
import { CHECK_EVERY_S, count, dayAt, type Ctx } from './clock';
import { assayOf, convAssay, cutTime, driverRoundF, laneM, legM, machineShares, pieceCount, pieceSpec, routeM, specsOf, toolP } from './content';
import { roundMoney } from './money';
import { crucibleCharged } from './crucible';
import { dealOffer, gateReached } from './deal';
import { defOf } from './machines';
import { openPartners, pickFromRung, ratedLoadNet } from './partners';
import { FLOOR_CLEAR_SHARE, orderFromRung } from './crew';
import { holdRelease } from './bays';
import { roundTry } from './round';
import { routesChanged } from './memo';
import { worksOpen, worksOwn } from './works';
import { shareIAt } from './reuse';
import { floorSlots, pointOf, thingPos } from './positions';
import { contentAt } from './layer';
import { driverRoundS, fairPick, fairTripsOf, fairWaitNext, fullerFirst } from './truck';
import { worksDropoffPeriod } from './things';
import type { LevelTarget, MachineId, SalvageConfig, SalvageGame } from './types';

/**
 * R, t/h (2.11, 2.12; the prototype's rated_R, proto/yard4.py): the yard's throughput at full feed with no
 * boss = 3.6 × min(the yard hands' carrying, kg/s, the material arriving: the drop-off's mix over its
 * period plus each open partner's skip over max(fill_s, the driver's round trip)); 0 without a yard hand.
 * Machines transform what is carried and add no throughput; their levels show their own rate on their card.
 */
export function ratedOf(c: Ctx['c'], s: Ctx['s']): number {
  const hands = s.crew.filter((m) => m.role === 'hand');
  if (!hands.length) return 0;
  const h = c.crew.hand;
  const leg = routeM(c, 'dropoff', 'scale');
  let carry = 0;
  for (const m of hands) {
    const v = h.v * (1 + h.lev * Math.max(0, m.level - 1));
    carry += h.load / ((2 * leg) / v + h.handle_s);
  }
  const mix = c.dropoff.mix;
  const wsum = mix.reduce((a, [, w]) => a + w, 0) || 1;
  let arrive = mix.reduce((a, [o, w]) => a + (w / wsum) * ((c.objects[o]?.gross_g ?? 0) / 1000), 0) / c.dropoff.period;
  const driver = s.crew.find((m) => m.role === 'driver');
  if (driver && s.truck.owned) {
    const F = driverRoundF(c, driver.level);
    const dv = c.truck.v * c.truck.driverFactor * F;
    for (const [id, p] of Object.entries(c.partners)) {
      const ps = s.partners[id];
      if (!ps?.open) continue;
      const mass = Object.entries(p.skip).reduce((a, [o, n]) => a + (c.objects[o]?.gross_g ?? 0) * n, 0) / 1000;
      const trip = (2 * (c.map.lane[p.lane] ?? 0)) / dv + c.truck.handle_s / F;
      arrive += (Math.max(1, ps.level) * mass) / Math.max(p.fill_s, trip);
    }
  }
  return 3.6 * Math.min(carry, arrive);
}

export function ratedCapacity(cfg: SalvageConfig, g: SalvageGame): number {
  return ratedOf(cfg.salvage, g.salvage);
}

/** A thing's remaining value at usual prices (its pieces still on it at usual prices, and its shell), § (stage 2 2.3.3). */
function thingValue(c: Ctx['c'], obj: string, cut: number, shell: boolean): number {
  const o = c.objects[obj];
  if (!o) return 0;
  if (shell) return 0; // a stripped shell's grams are already in its bay (weighed in whole where it stands)
  let v = o.shell ? (o.shell.g / 1000) * usualP(c, o.shell.grade) : 0;
  const n = pieceCount(c, obj);
  for (let k = Math.max(0, cut); k < n; k++) {
    const sp = pieceSpec(c, obj, k);
    if (sp) v += (sp.g / 1000) * usualP(c, sp.grade);
  }
  return v;
}

/**
 * The value at usual prices (p̄, the converter at its assay: usualP) of every unsold stock in the
 * yard, § (stage 2 2.3.3, ruling I5: the gate's "value of unsold stock"): the bays, the trays, the hoppers
 * and the piece in work, the pot, the merchant's flatbed, pieces on the ground and carried, things in the
 * yard at the value of the pieces still on them, the skip on the truck. Skips standing at a partner are
 * not the yard's (unpaid). A pure function of the state.
 */
export function stockValue(c: Ctx['c'], s: Ctx['s']): number {
  let v = 0;
  for (const [grade, b] of Object.entries(s.bays)) v += (b.g / 1000) * usualP(c, grade);
  const pv = (p: { grade: string; g: number }) => (p.g / 1000) * usualP(c, p.grade);
  for (const id of ['hand_stripper', 'stripper', 'bench', 'crucible'] as const) {
    const m = s.machines[id];
    for (const [grade, g] of Object.entries(m.tray_g)) v += (g / 1000) * usualP(c, grade);
    for (const p of m.hopper) v += p.whole ? thingValue(c, p.whole, 0, false) : pv(p);
    const w = m.work;
    if (w) {
      // The piece in work less what is already credited to the tray (outputs by its shares).
      const share = id === 'crucible' ? 1 : machineShares(c, id, w.piece.grade).reduce((a, [, q]) => a + q, 0);
      const done = Object.values(w.credited).reduce((a, g) => a + g, 0);
      const left = share > 0 ? Math.max(0, 1 - done / (share * w.piece.g)) : 1;
      v += left * (w.piece.whole ? thingValue(c, w.piece.whole, 0, false) : pv(w.piece));
    }
  }
  const cr = s.machines.crucible;
  const rec = c.machines.crucible.recipes[cr.recipe];
  if (rec) {
    const ins = Array.isArray(rec[0]) ? (rec[0] as string[]) : [rec[0] as string];
    const out = rec[1] as string;
    if (cr.chargeBy) for (const [grade, g] of Object.entries(cr.chargeBy)) v += (g / 1000) * usualP(c, grade);
    else v += (cr.charge_g / 1000) * usualP(c, ins[0]);
    v += (cr.heel_g / 1000) * usualP(c, out);
  }
  // s2e-rate: from the works' opening the plates' own stock too (a hall's charge and heel at its recipe's first input and
  // output, a plate's hopper, tray and piece in work): measured, a heat under way at the end of the bots' window moved G by
  // up to §2,000 an hour (the charge left the bays and was counted nowhere). Nothing of it in the first yard.
  if (worksOn(c, s)) for (const [id, w] of Object.entries(s.works ?? {})) {
    for (const [grade, g] of Object.entries(w.tray_g ?? {})) v += (g / 1000) * usualP(c, grade);
    for (const p of w.hopper ?? []) v += p.whole ? thingValue(c, p.whole, 0, false) : pv(p);
    if (w.work) v += w.work.piece.whole ? thingValue(c, w.work.piece.whole, 0, false) : pv(w.work.piece);
    const h = w.heat;
    const rec = h ? c.works?.plates[id]?.recipes?.[h.recipe] : undefined;
    if (h && rec) {
      if (h.chargeBy) for (const [grade, g] of Object.entries(h.chargeBy)) v += (g / 1000) * usualP(c, grade);
      else v += (h.charge_g / 1000) * usualP(c, rec.in[0]);
      if (rec.out[0]) v += (h.heel_g / 1000) * usualP(c, rec.out[0][0]);
    }
  }
  for (const l of s.merchant.lot) v += (l.g / 1000) * usualP(c, l.grade);
  for (const p of s.pieces) v += p.whole ? thingValue(c, p.whole, 0, false) : pv(p);
  for (const p of s.load) v += p.whole ? thingValue(c, p.whole, 0, false) : pv(p);
  for (const m of s.crew) for (const p of m.load) v += p.whole ? thingValue(c, p.whole, 0, false) : pv(p);
  for (const th of s.things) if (th.at.at !== 'zone') v += thingValue(c, th.obj, th.cut, th.shell === true);
  const sk = s.truck.skip;
  if (sk) for (const [obj, n] of Object.entries(sk.contents)) v += n * thingValue(c, obj, 0, false);
  return roundMoney(v);
}

// ---------------------------------------------------------------------------------------- purchases

/** What owning a shop item does (2.15): the tier, the carrier, a machine on its pad, the truck, a recipe. */
export function own(x: Ctx, item: string, t: number): void {
  const s = x.s;
  if (!s.owned.includes(item)) s.owned.push(item);
  const tool = x.c.tools[item];
  if (tool) s.tier = Math.max(s.tier, tool.tier);
  if (x.c.carriers[item] !== undefined && (x.c.carriers[item] ?? 0) > (x.c.carriers[s.carrier] ?? 0)) s.carrier = item;
  if (item === 'stripper' || item === 'bench' || item === 'crucible') {
    const m = s.machines[item as MachineId];
    m.owned = true;
    m.level = Math.max(1, m.level);
    m.status = 'idle';
    m.since = t;
    void defOf;
  }
  if (item === 'truck') s.truck.owned = true;
  // engine3: what is owned is read by the kept routes (the crucible's owned flag): works.ts routeOf.
  routesChanged(x);
  // Stage 2's purchases (a plate never comes here: works.ts orderPlate; the three-axle truck, the forklift, the
  // pallet truck, the plasma cutter's own parts): the feature's file (s2a-fix; a stub: nothing).
  worksOwn(x, item, t);
  x.ev.push({ type: 'owned', item });
  x.dirty = true;
  openPartners(x, t);
}

/** A purchase arrives (its arrival event). */
export function arrive(x: Ctx, item: string, t: number): void {
  const i = x.s.arriving.findIndex((a) => a.item === item);
  if (i < 0) return;
  const a = x.s.arriving[i];
  x.s.arriving.splice(i, 1);
  x.ev.push({ type: 'arrival', kind: a.by, what: item });
  own(x, item, t);
}

// ---------------------------------------------------------------------------------------- checks

/** The game a book reader sees mid-transition (the draft's cash and state). */
const view = (x: Ctx): SalvageGame => ({ cash: x.cash, lifetimeEarnings: 0, salvage: x.s }) as unknown as SalvageGame;

/**
 * Are the goals due at yard second t in the away pass (RULING2.md 14.4, stage 2 2.17)? When the yard's clock
 * has entered a new minute (CHECK_EVERY_S) since `counts.goalsAt`, the yard second (floored) the away pass
 * last checked them; never checked: due. A function of the STATE, so an absence cut into passes checks them
 * at the same instants as one pass. The key is a whole second so that a save's sanitising (save.ts floors
 * counts) keeps it exactly.
 */
export function goalsDue(s: Ctx['s'], t: number): boolean {
  const at = s.counts?.goalsAt;
  return at === undefined || Math.floor(t / CHECK_EVERY_S) > Math.floor(at / CHECK_EVERY_S);
}

/**
 * 2.14 step 6 (stage 2 2.17, RULING2.md 14.4: THE CHECKS FOLLOW THE STATE, NOT THE PASS): at every instant
 * at which something they read changed (`x.dirty`), live and away alike: partners opening, the rung
 * (ladder.ts rungReached), rivals passed (rivals.ts passedNow), the deal's offer. The goals (goals.ts
 * checkGoals) at the same instants live; away only when the clock has entered a new minute since
 * `counts.goalsAt` (goalsDue). Nothing is forced at the end of an away pass (tick.ts advance).
 */
export function checks(x: Ctx, t: number, force = true): void {
  // E40 (stage 2 2.2, RULING2.md 14.6): while the boss is away and Hold would stop the yard, one held bay
  // sets aside just what the next load needs (bays.ts holdRelease); the round loads it at once.
  if (holdRelease(x, t)) roundTry(x, t);
  if (!force && !x.dirty) return;
  x.dirty = false;
  const s = x.s;
  openPartners(x, t);
  const rung = rungReached(x.cfg, view(x));
  while (s.ladder.rung < rung) {
    s.ladder.rung += 1;
    x.ev.push({ type: 'rung', n: s.ladder.rung });
  }
  // Stage 2 (2.20, B14): the works layer opens from the STATE, not from the rung event: at every check while
  // the yard stands at or above the works layer's rung and the bath has not been set (works.ts worksOpen).
  // Only in LIVE play (s2a-fix, the critic's finding 4): the opening is beat 1 of 1.3 (sign, padlock, bath, goal)
  // and the away pass's events never reach a screen (salvageOffline passes none; the sink keeps only the away
  // report, passed, rung and repaid), so opened away its event would be lost and bathSet would keep it from
  // ever firing again. A rung-3 save opened after hours away therefore opens at its first live instant.
  // join2b (the dispatch check's F5): the opening's DATE (the first lot's nextAt) is the instant the condition
  // first held: the start of the transition when the yard already stood at the works' rung then (a save at the
  // rung, or a rung reached away: the first check of a tick and of a jump fall at different instants, the
  // transition's start does not), else this instant (the rung reached inside the transition, at the same event
  // in a tick, a jump and ten jumps).
  if (x.live && s.ladder.rung >= worksRungOf(x.c) && s.counts!.bathSet === undefined) worksOpen(x, t, (x.rung0 ?? s.ladder.rung) >= worksRungOf(x.c) ? x.t0 : t);
  const passed = passedNow(x.cfg, view(x));
  if (passed > s.ladder.passed) {
    const list = x.c.rivals.list;
    for (let k = s.ladder.passed; k < passed; k++) {
      const r = list[k];
      x.ev.push({ type: 'passed', rival: r.id, rank: list.length + 1 - (k + 1) });
      if (x.away) x.away.passed.push(r.id);
    }
    s.ladder.passed = passed;
  }
  if (gateReached(x, x.c.deal.gate)) dealOffer(x, t);
  if (x.live || goalsDue(s, t)) {
    if (!x.live) s.counts!.goalsAt = Math.floor(t);
    const before = s.t;
    s.t = Math.max(s.t, t);
    const r = checkGoals(x.cfg, view(x));
    s.t = before;
    if (r.goals !== s.goals) {
      s.goals = r.goals;
      const all = [...x.c.goals, ...x.c.dayOne];
      for (const id of r.done) x.ev.push({ type: 'goal', n: all.findIndex((d) => d.id === id) + 1, id });
    }
  }
  // What the checks themselves changed (a partner opened, a rung, the offer) needs no second look at the
  // next instant: each check is a function of the state and gives the same answer again.
  x.dirty = false;
}

/**
 * The rung the works layer opens at (stage 2, 1.4 and 2.6.1: rung 3 on the game's content), from the content:
 * the lowest `rung<n>` gate among `works.plates`; Infinity for a content with no plates (the first yard's
 * test content: nothing opens). Memoised per content object.
 */
const WORKS_RUNG = new WeakMap<object, number>();
export function worksRungOf(c: Ctx['c']): number {
  let r = WORKS_RUNG.get(c);
  if (r === undefined) {
    r = Infinity;
    const plates = (c as unknown as { works?: { plates?: Record<string, { gate?: string }> } }).works?.plates ?? {};
    for (const id in plates) {
      const m = /^rung(\d+)$/.exec(plates[id]?.gate ?? '');
      if (m) r = Math.min(r, Number(m[1]));
    }
    WORKS_RUNG.set(c, r);
  }
  return r;
}

void count;
void crucibleCharged;
void dayAt;

// ---------------------------------------------------------------------------------------- rated income I (stage 2 2.3)

/** A grade's lot price a kilogram at usual prices (2.3: p̄; the converter at its unstepped assay per unit's kg). */
function usualP(c: Ctx['c'], grade: string): number {
  const gr = c.grades[grade];
  if (!gr) return 0;
  if (gr.family === 'pm') return convAssay(c, 1) / Math.max(1e-9, c.wholeUnits_kg[grade] ?? 1);
  return gr.pbar;
}

/** What the material of one feed unit (one thing, or one load's things) needs and becomes (2.3.1 items 1, 2). */
interface Unit {
  /** Cutter seconds (whole cuts at the cutters' mean power, and the walks between things). */
  cut: number;
  /** Yard-hand trips by kind (2.3.1 item 2): pieces to the scale (kg), whole things to the scale (kg), machine feeds (things), tray trips (things). */
  scaleKg: number;
  wholeKg: number;
  feeds: Record<'stripper' | 'bench', number>;
  /** Grams a kilogram of each grade weighed in or fed (kg by grade); machine inputs by machine. */
  kg: Record<string, number>;
  machKg: Record<'stripper' | 'bench', number>;
  /** Of machKg: whole things that need no cutting carried off the floor to the hopper (E35: several a trip, up to a load). */
  machWholeKg: Record<'stripper' | 'bench', number>;
  /** Mean piece mass of what goes to the scale (for the trip's fill), kg·kg (Σ m²; ÷ scaleKg is the mass-weighted mean). */
  m2: number;
}

const emptyUnit = (): Unit => ({ cut: 0, scaleKg: 0, wholeKg: 0, feeds: { stripper: 0, bench: 0 }, kg: {}, machKg: { stripper: 0, bench: 0 }, machWholeKg: { stripper: 0, bench: 0 }, m2: 0 });

function addUnit(a: Unit, b: Unit, k: number): void {
  a.cut += k * b.cut;
  a.scaleKg += k * b.scaleKg;
  a.wholeKg += k * b.wholeKg;
  a.m2 += k * b.m2;
  for (const id of ['stripper', 'bench'] as const) {
    a.feeds[id] += k * b.feeds[id];
    a.machKg[id] += k * b.machKg[id];
    a.machWholeKg[id] += k * b.machWholeKg[id];
  }
  for (const [g, v] of Object.entries(b.kg)) a.kg[g] = (a.kg[g] ?? 0) + k * v;
}

/** The mean distance between two of a place's waiting slots (the cutter's walk from thing to thing), metres. */
function slotSpacing(c: Ctx['c'], at: 'floor' | 'dropoff', n: number): number {
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k < n; k++) pts.push(thingPos(c, at === 'floor' ? { at: 'floor', slot: k } : { at: 'dropoff', slot: k }));
  let d = 0;
  let m = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    d += legM(c, pts[i], pts[j]);
    m++;
  }
  return m ? d / m : 0;
}

/**
 * One thing of `obj` lying at `where` with the present assets and no boss (2.3.1 item 2): cut whole by a
 * cutter when it needs cutting and the tools reach it (E17), else carried whole at its whole grade (E4);
 * a thing that needs no cutting is carried as it is (E35: from the floor to the bench's or the powered
 * stripper's hopper when it is their input and they are owned; from the drop-off to the scale).
 */
function unitOf(c: Ctx['c'], s: Ctx['s'], obj: string, where: 'floor' | 'dropoff', cutP: number, cutV: number, walkM: number, raw = false, assay = false): Unit {
  const u = emptyUnit();
  const o = c.objects[obj];
  if (!o) return u;
  const cutters = s.crew.some((m) => m.role === 'cutter');
  const n = pieceCount(c, obj);
  const owns = (id: 'stripper' | 'bench') => s.machines[id].owned;
  const dest = (grade: string): 'stripper' | 'bench' | null => (grade === 'cab' && owns('stripper') ? 'stripper' : grade === 'mot' && owns('bench') ? 'bench' : null);
  const put = (grade: string, kg: number) => {
    u.kg[grade] = (u.kg[grade] ?? 0) + kg;
  };
  // s2e-rate (2.3 item 2): with the analyser running every piece weighs in at its spec's assay grade (assay.ts assayGrade).
  const weighed = (sp: { grade: string; g: number; spec: number }) => (assay ? assayOf(c, { grade: sp.grade, spec: sp.spec, g: sp.g, whole: null } as never) ?? sp.grade : sp.grade);
  if (o.tier === 0) {
    // Loose: carried as it is. From the floor a machine's input goes to its hopper (E35); from the drop-off to the scale.
    for (let k = 0; k < n; k++) {
      const sp = pieceSpec(c, obj, k);
      if (!sp) continue;
      const d = where === 'floor' ? dest(sp.grade) : null;
      if (d) {
        u.machKg[d] += sp.g / 1000;
        u.machWholeKg[d] += sp.g / 1000;
      } else {
        u.scaleKg += sp.g / 1000;
        u.m2 += (sp.g / 1000) * (o.gross_g / 1000);
        put(weighed(sp), sp.g / 1000);
      }
    }
    for (const d of ['stripper', 'bench'] as const) if (u.machKg[d] > 0) u.feeds[d] += 1;
    return u;
  }
  const cuttable = cutters && (o.tier ?? 1) <= s.tier && !(o.pieceTiers ?? []).some((q) => q > s.tier);
  if (!cuttable) {
    if (!o.whole) return u;
    u.wholeKg += o.gross_g / 1000;
    put(o.whole, o.gross_g / 1000);
    return u;
  }
  u.cut += walkM / Math.max(1e-9, cutV);
  for (let k = 0; k < n; k++) {
    const sp = pieceSpec(c, obj, k);
    if (!sp) continue;
    u.cut += cutTime(c, obj, sp.g, cutP);
    // `raw` (RULING2.md 17.4, the hands' rule on a floor over half full): the floor's cut pieces go to the scale with
    // the floor's pile (crew.ts floorStep), not to their machine.
    const d = raw && where === 'floor' ? null : dest(sp.grade);
    if (d) u.machKg[d] += sp.g / 1000;
    else {
      u.scaleKg += sp.g / 1000;
      u.m2 += (sp.g / 1000) ** 2;
      put(weighed(sp), sp.g / 1000);
    }
  }
  for (const d of ['stripper', 'bench'] as const) if (u.machKg[d] > 0) u.feeds[d] += 1;
  if (o.shell) put(o.shell.grade, o.shell.g / 1000);
  return u;
}

/** The terms of I (2.3.1), for the gate's table and the cards. */
export interface RatedTerms {
  /** § an hour, net (lot payments less loads bought). */
  I: number;
  /** Feed: drop-off things an hour and loads an hour by partner (I2, I3). */
  dropoff: number;
  loads: Record<string, number>;
  /** What bound the yard's throughput: 'feed' (every feed taken), 'cut', 'carry' or 'truck'. */
  bind: 'feed' | 'cut' | 'carry' | 'truck' | 'none';
  /** Seconds an hour each step has and would need at full feed. */
  cut: { have: number; need: number };
  carry: { have: number; need: number };
  truck: { have: number; need: number };
  /** The yard hands' seconds an hour on the feed TAKEN, by kind of trip (the gate's table; engine2-fixB). */
  carryBy: { scale: number; whole: number; feed: number; tray: number };
  /** § an hour: sales at usual prices and loads' label prices. */
  sales: number;
  spent: number;
  /**
   * engine2-income2 (RULING2.md 14.10), the terms beside the gate's measured table (yard-bot.ts --only income):
   * the yard hands' trips an hour by kind on the feed taken, the mass a trip to the scale carries (kg), kg an
   * hour sold by grade (the machines' and the crucible's outputs as sold), the hours an hour each machine
   * works, the share of the truck's hour the loads' round trips take, the replay's mean floor mass (kg), and
   * the share of the cutters' and of the hands' hour the feed taken uses.
   */
  detail?: {
    trips: { scale: number; whole: number; feed: number; tray: number };
    kgTrip: number;
    kgBy: Record<string, number>;
    machH: Record<string, number>;
    truckShare: number;
    floorKg: number;
    cutUse: number;
    carryUse: number;
    /** s2e-rate: what the crucible melts by input grade (kg an hour) and its gain a kilogram (valueOf), for the plates' terms. */
    melt?: Record<string, { kg: number; gain: number }>;
  };
  /**
   * RULING2.md 16.5: each open partner's RANK, § a second: its rated net a load (partners.ts ratedLoadNet) over the
   * time the load costs the yard's slowest step for it: the greatest of the truck's round trip, its cutting seconds
   * over the cutters the yard has and its carrying seconds over the yard hands it has (this replay's own per-load
   * terms). The hired driver's rank from truck.pickFromRung (truck.ts bestLoad) and this replay's (rateQueue).
   */
  rank?: Record<string, number>;
  /** join2b (2.12): I before the Yard sale's premium (the plates' terms included); absent in the first yard (I₀ = I). */
  I0?: number;
}

/** The hands' carrying a unit needs, by kind of trip: seconds and trips (2.3.1 item 2, as corrected). */
interface Carry {
  scale: number;
  whole: number;
  feed: number;
  tray: number;
  n: { scale: number; whole: number; feed: number; tray: number };
}

/** The state's ASSETS as I reads them (2.3.1): the cache's key (rateCache). */
function assetKey(c: Ctx['c'], s: Ctx['s']): string {
  const crew = s.crew.map((m) => `${m.role}${m.level}`).sort().join(',');
  const mach = (['stripper', 'bench', 'crucible'] as const).map((id) => (s.machines[id]?.owned ? `${id}${s.machines[id].level}` : '')).join(',');
  const parts = Object.entries(c.partners).map(([id, p]) => (s.partners[id]?.open || s.owned.includes(p.opens) ? `${id}${Math.max(1, s.partners[id]?.level ?? 1)}` : '')).join(',');
  // RULING2.md 16.2, 17.4: which of the driver's and the hands' rules the yard's rung runs (dispatch.ts's keys).
  const rules = `${s.ladder.rung >= pickFromRung(c) ? 1 : 0}${s.ladder.rung >= orderFromRung(c) ? 1 : 0}`;
  return `${crew}|${s.tier}|${mach}|${parts}|${s.truck.owned ? 1 : 0}|${(s.counts?.poured ?? 0) > 0 ? 1 : 0}|${rules}${worksKey(c, s)}`;
}

/** join2b: the plates' part of the asset key (each running plate's level, a hall's first pour, the rung for the Yard sale's share); empty in the first yard. */
function worksKey(c: Ctx['c'], s: Ctx['s']): string {
  if (!c.works || s.counts?.bathSet === undefined) return '';
  let k = `|r${s.ladder.rung}`;
  // s2e-rate: every plate the yard has, whatever its phase (a skip's `grows` read its presence: skipContents, carTerm).
  for (const [id, w] of Object.entries(s.works ?? {})) k += `,${id}${w.phase === 'running' ? `${w.level}${(s.counts?.[`poured:${id}`] ?? 0) > 0 ? 'p' : ''}` : w.phase[0]}`;
  return k;
}

/**
 * join2b (2.3.1 step 5; rules-works' request of 11:10, built here): THE PLATES' TERMS of I, a pure post-pass over the
 * first yard's replay. The flow a plate can take is what the replay sells as weighed (`detail.kgBy`, kg an hour by
 * grade) plus what other plates make (the shredder's stream, zorba, twitch, paste); each plate takes at most its
 * capacity an hour (rate × (1 + lev × (L − 1)); a hall batch.kg × the same / batch.s, counted only once poured, 14.5);
 * a grade several plates take goes to the best margin a kilogram first (I4, E2; never the set route); each kilogram
 * taken adds (Σ out share × p̄ − p̄ of the input − the reagents a kilogram). What is NOT counted (said in the join's
 * account): the yard hands' carrying to and from the yard plates (so a hands-fed plate's term is an upper bound), whole
 * objects as inputs (the shear's beams and tanks, the depollution bay's cars: 0), the analyser and the magnet crane (0).
 * No plate lowers I: every term is ≥ 0 (a content check holds every plate's margin ≥ 1.05 × its input).
 */
function plateTerms(c: Ctx['c'], s: Ctx['s'], kgBy: Record<string, number>, melt?: Readonly<Record<string, { kg: number; gain: number }>>): number {
  const plates = c.works?.plates;
  if (!plates || s.counts?.bathSet === undefined) return 0;
  const pbar = (g: string) => c.grades[g]?.pbar ?? 0;
  const lev = (d: { lev: number }, L: number) => 1 + d.lev * Math.max(0, L - 1);
  type Way = { id: string; grade: string; out: [string, number][]; margin: number };
  const cap = new Map<string, number>();
  const ways: Way[] = [];
  for (const [id, w] of Object.entries(s.works ?? {})) {
    const d = plates[id];
    if (!d || w.phase !== 'running') continue;
    if (d.kind === 'rate' && d.feedBy !== 'stream') {
      const r = d.rate_kg_s ?? (c.shear ? c.shear.P : 0);
      cap.set(id, 3600 * r * lev(d, w.level));
    } else if (d.kind === 'rate') cap.set(id, Infinity);
    else if (d.kind === 'batch' && d.batch && (s.counts?.[`poured:${id}`] ?? 0) > 0) cap.set(id, (3600 * d.batch.kg * lev(d, w.level)) / d.batch.s);
    else continue;
    const reag = (rs: readonly (readonly [string, number, number])[] | undefined) => (rs ?? []).reduce((a, r) => a + r[1] * r[2], 0);
    if (d.kind === 'batch') {
      for (const rec of Object.values(d.recipes ?? {})) for (const gin of rec.in) ways.push({ id, grade: gin, out: rec.out.map(([o, sh]) => [o, sh] as [string, number]), margin: 0 });
    } else for (const gin of d.in) if (d.out?.[gin]) ways.push({ id, grade: gin, out: d.out[gin].map(([o, sh]) => [o, sh] as [string, number]), margin: -reag(d.reagents) });
    if (d.kind === 'batch') for (const wy of ways) if (wy.id === id) wy.margin = -reag(Object.values(d.recipes ?? {}).find((r) => r.in.includes(wy.grade))?.reagents);
  }
  if (!ways.length) return 0;
  // The stream's worth is what the plate that takes it makes (the eddy current); every other output at p̄.
  const streamTaker = ways.find((wy) => wy.grade === 'stream');
  const worth = (o: string): number => (o === 'stream' ? (streamTaker ? streamTaker.out.reduce((a, [q, sh]) => a + sh * pbar(q), 0) : 0) : pbar(o));
  for (const wy of ways) wy.margin += wy.out.reduce((a, [o, sh]) => a + sh * (wy.grade === 'stream' ? pbar(o) : worth(o)), 0) - (wy.grade === 'stream' ? 0 : pbar(wy.grade));
  ways.sort((a, b) => b.margin - a.margin || (a.id < b.id ? -1 : 1));
  const avail: Record<string, number> = { ...kgBy };
  // s2e-rate (2.3 item 2, the rotary hall): what the first yard's crucible melts (valueOf: its best recipe first, I4) a plate
  // may take instead where it pays more a kilogram than the crucible's gain on it (a hall built for that metal); each such
  // kilogram adds the plate's margin less the crucible's gain it forgoes.
  const meltLeft: Record<string, number> = {};
  for (const [g, m] of Object.entries(melt ?? {})) meltLeft[g] = m.kg;
  let add = 0;
  // A few passes, so that what one plate makes (the stream, zorba, twitch, paste) reaches the plate after it.
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const wy of ways) {
      if (wy.margin <= 0) continue;
      const m = melt?.[wy.grade];
      if (m && wy.margin > m.gain + 1e-9 && (cap.get(wy.id) ?? 0) > (avail[wy.grade] ?? 0) + 1e-9 && (meltLeft[wy.grade] ?? 0) > 1e-9) {
        const y = Math.min(meltLeft[wy.grade], (cap.get(wy.id) ?? 0) - (avail[wy.grade] ?? 0));
        meltLeft[wy.grade] -= y;
        avail[wy.grade] = (avail[wy.grade] ?? 0) + y;
        add -= y * m.gain;
      }
      const x = Math.min(avail[wy.grade] ?? 0, cap.get(wy.id) ?? 0);
      if (x <= 1e-9) continue;
      avail[wy.grade] -= x;
      cap.set(wy.id, (cap.get(wy.id) ?? 0) - x);
      // The stream's value is counted at the eddy current's term, not at the shredder's.
      add += x * wy.margin - (wy.grade === 'stream' ? 0 : x * wy.out.reduce((a, [o, sh]) => a + (o === 'stream' ? sh * worth(o) : 0), 0));
      for (const [o, sh] of wy.out) avail[o] = (avail[o] ?? 0) + x * sh;
      moved = true;
    }
    if (!moved) break;
  }
  return Math.max(0, add);
}

/**
 * THE YARD SALE'S PREMIUM (2.12; s2e-rate, replacing join2b's 0.6 of the ceiling): what the public pays an hour for the
 * tagged things the feed taken brings (reuse.ts tagUid: a thing of `reuse.kinds` not barred by `reuse.never`, a share
 * `reuse.share` of them; a `fromPartnerOnly` kind only from a load), each at `reuse.factor` × its prepared value, at most
 * the ceiling reuse.ts shareIAt × max(I₀, floorI); less what those things would have sold for as scrap (the replay counts
 * them cut: ÷ factor). Read from reuse.ts's own share by rung (shareI_r), so the term follows the rule.
 */
function yardSaleTerm(c: Ctx['c'], s: Ctx['s'], I0: number, t: RatedTerms): number {
  const sale = yardSaleFlow(c, s, I0, t).sale;
  return Math.max(0, sale - sale / (c.reuse?.factor ?? 1));
}

/** The Yard sale's money an hour (yardSaleTerm's) and the things an hour it sells (racked: the mean tagged thing's price). */
function yardSaleFlow(c: Ctx['c'], s: Ctx['s'], I0: number, t: RatedTerms): { sale: number; things: number } {
  const R = c.reuse;
  const none = { sale: 0, things: 0 };
  if (!R || s.counts?.bathSet === undefined) return none;
  const sh = shareIAt({ c, s });
  if (!sh || !(R.factor > 0)) return none;
  const tagV = (obj: string, fromLoad: boolean): number => {
    const k = R.kinds[obj];
    if (!k || (k.fromPartnerOnly && !fromLoad)) return 0;
    if ((c.objects[obj]?.tags ?? []).some((tg) => R.never.includes(tg))) return 0;
    return R.share * thingValue(c, obj, 0, false);
  };
  let v = 0;
  let n = 0;
  const add = (k: number, obj: string, fromLoad: boolean) => {
    const q = tagV(obj, fromLoad);
    if (q <= 0) return;
    v += k * q;
    n += k * R.share;
  };
  const wsum = c.dropoff.mix.reduce((a, [, w]) => a + w, 0) || 1;
  for (const [obj, w] of c.dropoff.mix) add(t.dropoff * (w / wsum), obj, false);
  for (const [id, k] of Object.entries(t.loads)) for (const [obj, q] of Object.entries(skipContents(c, s, id))) add(k * q, obj, true);
  if (!(v > 0)) return none;
  const sale = Math.min(R.factor * v, sh * Math.max(I0, R.floorI));
  return { sale, things: (n * sale) / (R.factor * v) };
}

/**
 * THE VAN (2.12; s2e-rate): a partner's reusable batch (`reuseBatch`) rides each of its loads from the works' opening, goes
 * to the trade corner at the tip and is paid `reuse.batchFactor` × its prepared value by the van; the load's price counts
 * it at k × its as-found value (partners.ts fillSkip prices it with the rest).
 */
function vanTerm(c: Ctx['c'], s: Ctx['s'], loads: Record<string, number>): number {
  const R = c.reuse;
  if (!R || s.counts?.bathSet === undefined) return 0;
  let v = 0;
  for (const [id, n] of Object.entries(loads)) {
    const b = c.partners[id]?.reuseBatch;
    if (!b || !c.objects[b.obj]) continue;
    let asFound = 0;
    for (const [grade, g, k] of specsOf(c, b.obj)) asFound += k * (g / 1000) * usualP(c, grade) * (c.grades[grade]?.asFound ?? 1);
    v += n * b.n * (R.batchFactor * thingValue(c, b.obj, 0, false) - c.partners[id].k * asFound);
  }
  return v;
}

/**
 * THE SHREDDER LINE'S CARS (2.3 item 2; s2e-rate; RULING2.md 27.3 D1): while a station plate fed by the truck (the
 * depollution bay) runs and a partner's flatrack `grows` needs a plate the yard has (partners.ts grownContents), that
 * partner's loads alternate skip and car, one car anywhere at a time (carWaiting). Cars an hour: at most half its loads,
 * and at most one a cycle: the bay's drain (`depollution.s` over the level factor), the next car's fill (`fill_s`) and its
 * wait in the driver's queue behind the partner's other full skips ((L + 1) of its load spacings). Each car brings its
 * drained grades whole into the bays (works.ts carDrained: pieces and shell; the shredder takes the shell in the plates'
 * terms) at usual prices, less its price (k x as-found, partners.ts ratedLoadNet's rule) and less the skip it displaces
 * on the truck (that partner's rated net a load). The truck's time is unchanged (a car's trip is a skip's: owner1 V3).
 */
export function carTerm(c: Ctx['c'], s: Ctx['s'], loads: Record<string, number>): { net: number; kg: Record<string, number>; cars: number } {
  const out = { net: 0, kg: {} as Record<string, number>, cars: 0 };
  const plates = c.works?.plates;
  if (!plates) return out;
  let drainS = 0;
  for (const [id, w] of Object.entries(s.works ?? {})) {
    const d = plates[id];
    if (d?.kind !== 'station' || d.feedBy !== 'truck' || w.phase !== 'running') continue;
    drainS = ((c as { depollution?: { s?: number } }).depollution?.s ?? 0) / (1 + d.lev * Math.max(0, w.level - 1));
  }
  if (!(drainS > 0)) return out;
  // s2f-plasma-cars (RULING2.md 28.7 b): THE PARTNER'S OWN RECOVERY TRUCK (works.ts carRecover) sets a car on the apron
  // whenever it is free, at most one a period: cars an hour 3600 / max(period, the bay's drain); each at usual prices less
  // its label price (k x as found); no skip displaced (the hook-lift fetches no car). The flatrack's rule below stays for
  // the frozen contents (no shipped partner has both).
  for (const p of Object.values(c.partners)) {
    const r = p.recovery;
    if (!r || !s.works?.[r.needs] || !c.objects[r.obj]) continue;
    const cars = 3600 / Math.max(r.period_s, drainS);
    const v = carWorth(c, { [r.obj]: 1 }, cars, out.kg);
    out.cars += cars;
    out.net += cars * (v.worth - roundMoney(p.k * v.asFound));
  }
  for (const [pid, n] of Object.entries(loads)) {
    const p = c.partners[pid];
    const gr = (p?.grows ?? []).find((q) => q.body === 'flatrack' && s.works?.[q.needs]);
    if (!gr || !(n > 0)) continue;
    const L = Math.max(1, s.partners[pid]?.level ?? 1);
    const cars = Math.min(n / 2, 3600 / (drainS + p.fill_s + ((L + 1) * 3600) / n));
    const { worth, asFound } = carWorth(c, gr.contents, cars, out.kg);
    out.cars += cars;
    out.net += cars * (worth - roundMoney(p.k * asFound) - ratedLoadNet(c, pid));
  }
  return out;
}

/** A car load's worth at usual prices and its as-found value (asFoundValue's rule), its drained grades' kg an hour at `cars` an hour added to `kg`. */
function carWorth(c: Ctx['c'], contents: Record<string, number>, cars: number, kg: Record<string, number>): { worth: number; asFound: number } {
  let worth = 0;
  let asFound = 0;
  for (const [obj, q] of Object.entries(contents)) {
    const o = c.objects[obj];
    if (!o) continue;
    let thing = 0;
    for (const [grade, g, k] of specsOf(c, obj)) {
      kg[grade] = (kg[grade] ?? 0) + cars * q * k * (g / 1000);
      thing += k * (g / 1000) * usualP(c, grade);
      if (o.asFound === undefined) asFound += q * k * (g / 1000) * usualP(c, grade) * (c.grades[grade]?.asFound ?? 1);
    }
    if (o.shell) {
      kg[o.shell.grade] = (kg[o.shell.grade] ?? 0) + cars * q * (o.shell.g / 1000);
      thing += (o.shell.g / 1000) * usualP(c, o.shell.grade);
    }
    worth += q * thing;
    if (o.asFound !== undefined) asFound += q * o.asFound * thing;
  }
  return { worth, asFound };
}

/** rate.kappa at the rung (s2e-rate, 2.3 item 3): the content's factor at rungs 3 to 5 (a rung past the list reads its last), 1 where none is given. */
function kappaAt(c: Ctx['c'], rung: number): number {
  const k = (c as { rate?: { kappa?: readonly (number | null)[] } }).rate?.kappa;
  if (!k?.length) return 1;
  for (let r = Math.min(Math.max(1, rung), k.length); r >= 1; r--) {
    const v = k[r - 1];
    if (typeof v === 'number' && v > 0) return v;
  }
  return 1;
}

/**
 * The cache of I by assets (engine2-income2, step 4): per content object (a WeakMap, so a content no longer
 * used drops its entries), the terms by the state's asset key (assetKey: crew roles and levels, the tool
 * tier, machines owned and levels, partners open (or whose opening item is owned) and levels, the truck, and
 * whether the crucible has poured). I reads nothing else of the state, so two states with one key have one
 * I. At most RATE_CACHE_MAX keys a content (the oldest is dropped first). A card that reads I every 500 ms
 * pays one lookup; a purchase, hire, level or partner opening makes a new key (computed once).
 */
const RATE_CACHE_MAX = 64;
const rateCache = new WeakMap<object, Map<string, RatedTerms>>();

const copyTerms = (t: RatedTerms): RatedTerms => ({
  ...t,
  loads: { ...t.loads },
  cut: { ...t.cut },
  carry: { ...t.carry },
  truck: { ...t.truck },
  carryBy: { ...t.carryBy },
  detail: t.detail ? { ...t.detail, trips: { ...t.detail.trips }, kgBy: { ...t.detail.kgBy }, machH: { ...t.detail.machH } } : undefined,
  rank: t.rank ? { ...t.rank } : undefined,
});

/**
 * RATED INCOME I (stage 2 2.3; RULING2.md 2.1, 10.6, section 12: I1 to I6, 14.5, 14.10; ECONOMY E38), § an
 * hour, NET: what the yard keeps an hour with its present assets, no boss, at usual prices. A pure function of
 * the ASSETS (crew and levels, tools, machines and levels, partners and levels, the truck): never of recent
 * sales (the built incomeRate), of stock, cash, prices of the day or a switch the player can flip. Cached by
 * the assets (rateCache).
 *
 * 1. Feed (I3): the partners' loads (at most 3,600 × L ÷ fill_s an hour each, within ONE truck's hour, I2: each
 *    load costs the planned round trip the driver's run uses, truck.ts planTrip: out, hook, back, weigh, tip,
 *    park, at his level's F) and the drop-off's arrivals (one a period, by its mix).
 * 2. Steps: cutting (the cutters' seconds: each piece's cut time at their mean power, and the walk between
 *    things) and carrying (the yard hands' seconds, each trip 2 × the walk ÷ his speed + 2 × handle_s):
 *    pieces to the scale in trips as full as whole pieces allow, whole things one a trip; a powered machine's
 *    input from a load in ONE feed trip (the floor's one pile; a thing's pieces at the drop-off: a trip a
 *    thing), whole things that need no cutting off the floor to the hopper several a trip; each such delivery
 *    is a batch whose out tray costs the hands the batch's own seconds and one trip more (from rung 3 a hand
 *    who finds grams in a working machine's tray at the start of a run keeps at it, trip after trip, while
 *    the machine works through the batch, RULING2.md 14.1; measured within 7 % on day 1 to day 3, the
 *    account's table); the crucible's ingots fetched a load a trip.
 * 3. The feed is taken as the yard takes it (engine2-income2, measured): the partners' loads FIRST, by the
 *    driver's own rule played over three hours (rateQueue: the skip full first that the tipping floor has
 *    room for; the floor cleared at the pace of the slower of the cutters and the hands); the drop-off's
 *    things with the seconds the loads leave (while the floor is over half full the hands serve it before the
 *    drop-off, crew.ts FLOOR_CLEAR_SHARE, and the drop-off's places fill and stop its arrivals). I3: capacity
 *    beyond the feed adds nothing. NOT MONOTONE in every asset (RULING2.md 14.10 is owed, the account
 *    notes/s2a-engine2-income2.md): a partner's level can lower it, as it lowers what the yard itself keeps
 *    (the driver's rule takes the skip that fits first, and more farm skips crowd out the demolition loads).
 * 4. Value (I4): each kilogram at usual prices as weighed, the powered stripper's and the bench's inputs
 *    at their outputs, the crucible's brass and aluminium inputs at the ingot (the recipe that pays more a
 *    kilogram first, within the crucible's s_per_kg; only once poured at least once, RULING2.md 14.5),
 *    whatever the switches say; less the loads' label prices (k × the as-found value at usual prices).
 * 0 before the first yard hand (2.3.1).
 * FROM THE WORKS' OPENING (s2e-rate; yard-stage2-economy.md 2.3, RULING2.md 27.4; below it every term is the first yard's,
 * bit for bit): the replay plays the driver the yard ships (truck.ts fullerFirst, fairPick, fairWaitNext) over the truck's
 * round as dated (truck.ts driverRoundS); a skip carries its grown contents; the analyser's assay grades at the weigh-in;
 * the drop-off takes every second the loads leave (a full drop-off refills the instant a thing is taken; with
 * works.dropoffPeriod_s, s2e-dropoff, RULING2.md 28.3, at most one arrival a works period, as the yard); the Yard sale's
 * racking takes the hands' seconds first; the shredder line's cars (carTerm), the halls taking the crucible's metal where
 * they pay more (plateTerms), the Yard sale (yardSaleTerm) and the van (vanTerm); all of it times kappa_r (rate.kappa).
 */
export function ratedTerms(c: Ctx['c'], s: Ctx['s']): RatedTerms {
  const key = assetKey(c, s);
  let byKey = rateCache.get(c);
  if (!byKey) rateCache.set(c, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return copyTerms(hit);
  const raw = rawTerms(c, s, key);
  // s2c-fix-money (E6): from the works' opening, I never falls when the yard gains (the envelope below); the first yard reads the replay as merged.
  const t = c.works && s.counts?.bathSet !== undefined ? envelope(c, s, raw) : raw;
  if (byKey.size >= RATE_CACHE_MAX) byKey.delete(byKey.keys().next().value as string);
  byKey.set(key, t);
  return copyTerms(t);
}

/**
 * The replay's terms for the state's assets as they are (the first yard's replay, then the plates' terms and the Yard
 * sale's premium once the works are open: join2b), cached by asset key apart from the envelope's cache (RAW_CACHE_MAX
 * keys a content), so that the envelope's sub-states and the driver's ranks (loadRanks) are computed once. Read-only:
 * callers copy.
 */
const RAW_CACHE_MAX = 512;
const rawCache = new WeakMap<object, Map<string, RatedTerms>>();
function rawTerms(c: Ctx['c'], s: Ctx['s'], key = assetKey(c, s)): RatedTerms {
  let byKey = rawCache.get(c);
  if (!byKey) rawCache.set(c, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return hit;
  let t = ratedCompute(c, s);
  // s2e-rate: the Yard sale's things are racked by the yard hands (reuse.ts: FIRST in their order), whole, one a trip from
  // where they wait to the rack: measured 274 s an hour of the hands' 7,200 on a day-3 yard that the replay gave the loads.
  // The replay is played once more with those seconds taken from the hands (the count from the first replay's I0).
  if (worksOn(c, s) && c.reuse) {
    const n = yardSaleFlow(c, s, roundMoney(kappaAt(c, s.ladder.rung) * (t.I + plateTerms(c, s, t.detail?.kgBy ?? {}))), t).things;
    if (n > 1e-9) t = ratedCompute(c, s, n);
  }
  // join2b: the plates' terms and the Yard sale's premium on top of the first yard's replay (nothing in the first yard).
  if (c.works && s.counts?.bathSet !== undefined) {
    const I1 = t.I;
    // s2e-rate (2.3 item 3): the rung's one bounded factor kappa_r (content rate.kappa), on the whole of I from the works'
    // opening (the first yard's part with it); below the works' opening nothing is scaled.
    const kappa = kappaAt(c, s.ladder.rung);
    // s2e-rate (2.3 item 2): THE SHREDDER LINE's cars (carTerm), their drained grades handed to the plates' terms with the rest.
    const car = carTerm(c, s, t.loads);
    const kgAll: Record<string, number> = { ...(t.detail?.kgBy ?? {}) };
    for (const [g, kg] of Object.entries(car.kg)) kgAll[g] = (kgAll[g] ?? 0) + kg;
    const I0 = roundMoney(kappa * (t.I + car.net + plateTerms(c, s, kgAll, t.detail?.melt)));
    t.I0 = I0;
    t.I = roundMoney(I0 + kappa * (yardSaleTerm(c, s, I0, t) + vanTerm(c, s, t.loads)));
    // the same terms are gross sales too (G_r, the bank's "Save up" with an agreement open, E9)
    t.sales = roundMoney(t.sales + (t.I - I1));
  }
  if (byKey.size >= RAW_CACHE_MAX) byKey.delete(byKey.keys().next().value as string);
  byKey.set(key, t);
  return t;
}

/**
 * RATED INCOME NEVER FALLS WHEN THE YARD GAINS (s2c-fix-money E6, RULING2 22; from the works' opening only). The
 * replay plays the driver's own rule (full first, truck.ts), under which more skips of one partner can crowd another's
 * heavier loads off the tipping floor, and a faster driver or cutter can change which loads fit, so one level more could
 * LOWER the replay's I (the economy attacker: partnerFarm L2 -> L3 at rung 3, 61,911 -> 60,545). Packs, ads, the bank
 * and the lots read I, so I takes new capacity only where it adds: the yard may leave any capacity unused, so I is the
 * best replay over EFFECTIVE assets at most the state's own: each open partner's level, the driver's and each cutter's
 * level, and the tool tier, each between 1 and its own value ("at least what it was without the new capacity"). The
 * best is sought by coordinate ascent from the state's own assets (each dimension in turn at its best value with the
 * others held, until a round changes nothing, at most ENVELOPE_ROUNDS rounds); every replay is cached (rawTerms). The
 * terms returned are those of the replay that gives that I; the driver's ranks (`rank`) stay the state's own. A search,
 * not the full box (exponential): measured on the frozen stage-2 states and the bots' states (fixMoney.test.ts E6).
 */
const ENVELOPE_ROUNDS = 2;
/** The effective levels a dimension of the envelope tries: top, top − 1, top − 2, top − 4, ... and 1 (a few, not every level: its cost). */
function envelopeLevels(top: number): number[] {
  // s2e-rate: EVERY level from top down to 1 (the earlier top, top - 1, top - 2, top - 4, ..., 1 was not monotone in the top:
  // one level more dropped a level the search had found, measured on the bots' states: the garage at 3 of 5 lost at 6).
  const out: number[] = [];
  for (let e = top; e >= 1; e--) out.push(e);
  return out;
}
function envelope(c: Ctx['c'], s: Ctx['s'], raw: RatedTerms): RatedTerms {
  type Dim = { top: number; at: (st: Ctx['s'], e: number) => Ctx['s'] };
  const dims: Dim[] = [];
  for (const [id, p] of Object.entries(c.partners)) {
    const ps = s.partners[id];
    if (!ps || !(ps.open || s.owned.includes(p.opens)) || ps.level <= 1) continue;
    dims.push({ top: ps.level, at: (st, e) => ({ ...st, partners: { ...st.partners, [id]: { ...st.partners[id], level: e } } }) });
  }
  for (const m of s.crew) {
    if (m.level <= 1) continue;
    dims.push({ top: m.level, at: (st, e) => ({ ...st, crew: st.crew.map((x) => (x.id === m.id ? { ...x, level: e } : x)) }) });
  }
  if (s.tier > 1) dims.push({ top: s.tier, at: (st, e) => ({ ...st, tier: e }) });
  if (!dims.length) return copyTerms(raw);
  let best = raw;
  // Two ascents: from the state's own assets, and from the LEAN start (every dimension at 1), so that the dimension a
  // purchase adds (a cutter's first level, a better tool) cannot keep the search from what the yard had before it.
  for (const lean of [false, true]) {
    let cur = s;
    const now = dims.map((d) => d.top);
    if (lean) {
      dims.forEach((d, k) => {
        cur = d.at(cur, 1);
        now[k] = 1;
      });
      const t = rawTerms(c, cur);
      if (t.I > best.I + 1e-9) best = t;
    }
    for (let round = 0; round < ENVELOPE_ROUNDS; round++) {
      let moved = false;
      dims.forEach((d, k) => {
        let bestE = now[k];
        let here = rawTerms(c, cur).I;
        for (const e of envelopeLevels(d.top)) {
          if (e === now[k]) continue;
          const t = rawTerms(c, d.at(cur, e));
          if (t.I > best.I + 1e-9) best = t;
          if (t.I > here + 1e-9) {
            here = t.I;
            bestE = e;
          }
        }
        if (bestE !== now[k]) {
          now[k] = bestE;
          cur = d.at(cur, bestE);
          moved = true;
        }
      });
      if (!moved) break;
    }
  }
  if (best === raw) return copyTerms(raw);
  const out = copyTerms(best);
  out.rank = raw.rank ? { ...raw.rank } : undefined;
  return out;
}

/** The walks of the yard's map that I reads (content only; memoised per content object). */
const walkMemo = new WeakMap<object, { floorWalk: number; dropWalk: number }>();
function walksOf(c: Ctx['c']): { floorWalk: number; dropWalk: number } {
  let w = walkMemo.get(c);
  if (!w) walkMemo.set(c, (w = { floorWalk: slotSpacing(c, 'floor', floorSlots(c)), dropWalk: legM(c, pointOf(c, 'floor'), pointOf(c, 'dropoff')) / 2 }));
  return w;
}

function ratedCompute(c: Ctx['c'], s: Ctx['s'], racked = 0): RatedTerms {
  const none: RatedTerms = { I: 0, dropoff: 0, loads: {}, bind: 'none', cut: { have: 0, need: 0 }, carry: { have: 0, need: 0 }, truck: { have: 0, need: 0 }, carryBy: { scale: 0, whole: 0, feed: 0, tray: 0 }, sales: 0, spent: 0 };
  const hands = s.crew.filter((m) => m.role === 'hand');
  if (!hands.length) return none;
  const h = c.crew.hand;
  const speed = (lv: number) => h.v * (1 + h.lev * Math.max(0, lv - 1));
  const cutters = s.crew.filter((m) => m.role === 'cutter');
  const P = toolP(c, s.tier);
  const kc = c.crew.cutter;
  const cutPs = cutters.map((m) => Math.min(kc.cap * P, P * kc.share * (1 + kc.lev * Math.max(0, m.level - 1))));
  const cutP = cutPs.length ? cutPs.reduce((a, q) => a + q, 0) / cutPs.length : P;
  const cutV = cutters.length ? cutters.reduce((a, m) => a + speed(m.level), 0) / cutters.length : h.v;
  // The hands' trips at their mean pace: the harmonic mean of their speeds (each hand's trips an hour add).
  const handV = hands.length / hands.reduce((a, m) => a + 1 / speed(m.level), 0);
  const { floorWalk, dropWalk } = walksOf(c);

  const works = worksOn(c, s);
  // 1. Feed units: an hour of the drop-off's arrivals, and one load of each open partner.
  const per = 3600 / Math.max(1e-9, c.dropoff.period);
  const wsum = c.dropoff.mix.reduce((a, [, w]) => a + w, 0) || 1;
  const drop = emptyUnit();
  const assay = works && analyserRunning(c, s);
  for (const [obj, w] of c.dropoff.mix) addUnit(drop, unitOf(c, s, obj, 'dropoff', cutP, cutV, dropWalk, false, assay), (per * w) / wsum);
  const driver = s.crew.find((m) => m.role === 'driver');
  const F = driverRoundF(c, driver?.level ?? 1);
  const dv = c.truck.v * c.truck.driverFactor * F;
  const buildParts = (raw: boolean): QueuePart[] => {
  const parts: QueuePart[] = [];
  if (driver && s.truck.owned) {
    for (const [id, p] of Object.entries(c.partners)) {
      const ps = s.partners[id];
      if (!ps?.open && !s.owned.includes(p.opens)) continue;
      const lane = laneM(c, id);
      let hookS = (routeM(c, 'park', 'gate') + lane) / dv + c.truck.handle_s / F;
      let tipS = hookS + (lane + routeM(c, 'gate', 'weighbridge')) / dv + c.weigh_s / F + routeM(c, 'weighbridge', 'floor') / dv + c.truck.handle_s / F;
      let trip = tipS + routeM(c, 'floor', 'park') / dv;
      // s2e-rate (2.3 item 1): from the works' opening the truck's round is counted AS SHIPPED (truck.ts driverRoundS: the
      // dated trip's own drive, the lane at the speed the yard leaves it, the hook, the weighbridge and the tip), the mean
      // over the partner's skip slots. Below the works' opening the first yard's legs, bit for bit.
      if (works) ({ hookS, tipS, trip } = shippedRound(c, id, Math.max(1, ps?.level ?? 1), driver.level));
      const u = emptyUnit();
      let asFound = 0;
      // s2e-rate: from the works' opening a skip carries what partners.ts grownContents fills it with (the `grows` of body
      // 'skip' whose plate is owned: the plumber's sinks once the analyser is, the garage's bushings once the induction
      // hall is); the partner's reusable batch rides it too but goes to the trade corner (vanTerm), never to the floor.
      const contents = works ? skipContents(c, s, id) : p.skip;
      for (const [obj, n] of Object.entries(contents)) {
        addUnit(u, unitOf(c, s, obj, 'floor', cutP, cutV, floorWalk, raw, assay), n);
        for (const [grade, g, k] of specsOf(c, obj)) asFound += n * k * (g / 1000) * usualP(c, grade) * (c.grades[grade]?.asFound ?? 1);
      }
      const mass = Object.entries(contents).reduce((a, [o, n]) => a + (c.objects[o]?.gross_g ?? 0) * n, 0);
      parts.push({ id, max: (3600 * Math.max(1, ps?.level ?? 1)) / Math.max(1e-9, p.fill_s), trip, hookS, tipS, fill_s: p.fill_s, level: Math.max(1, ps?.level ?? 1), price: roundMoney(p.k * asFound), mass: mass / 1000, u, wc: 0, wh: 0, cq: null as unknown as Carry, net: ratedLoadNet(c, id), rank: 0 });
    }
  }
  return parts;
  };
  let parts = buildParts(false);

  // 2. What a unit needs of each step, seconds.
  const tripS = (m: number) => (2 * m) / handV + 2 * h.handle_s;
  const scaleFrom = { floor: routeM(c, 'floor', 'scale'), dropoff: routeM(c, 'dropoff', 'scale') };
  const crucibleOn = s.machines.crucible.owned && (s.counts?.poured ?? 0) > 0;
  const meltIns = new Set<string>();
  if (crucibleOn) for (const r of Object.values(c.machines.crucible.recipes)) for (const g of Array.isArray(r[0]) ? (r[0] as string[]) : [r[0] as string]) meltIns.add(g);
  const handsRule = s.ladder.rung >= orderFromRung(c);
  let rawFloor = false;
  const carryOf = (u: Unit, where: 'floor' | 'dropoff'): Carry => {
    const mean = u.scaleKg > 0 ? u.m2 / u.scaleKg : 0;
    const fill = Math.max(1, h.load - mean / 2);
    const n = { scale: u.scaleKg / fill, whole: u.wholeKg > 0 ? u.wholeKg / Math.min(h.load, u.wholeKg) : 0, feed: 0, tray: 0 };
    const out: Carry = { scale: n.scale * tripS(scaleFrom[where]), whole: n.whole * tripS(scaleFrom[where]), feed: 0, tray: 0, n };
    for (const id of ['stripper', 'bench'] as const) {
      if (!u.feeds[id]) continue;
      // E35: whole things off the floor to the hopper, several a trip up to a load (crew.ts floorStep); a
      // load's cut pieces of the machine's input lie in the floor's one pile: one feed trip (crew.ts
      // handDepart (1)); at the drop-off a thing's pieces lie beside it: a trip a thing. Each delivery is a
      // batch for the machine.
      const wholeKg = where === 'floor' ? u.machWholeKg[id] : 0;
      const pieceKg = u.machKg[id] - wholeKg;
      const feeds = (pieceKg > 1e-9 ? (where === 'floor' ? 1 : u.feeds[id]) : 0) + (wholeKg > 1e-9 ? wholeKg / h.load : 0);
      const d = c.machines[id] as { rate: number; lev?: number };
      const rate = d.rate * (1 + (d.lev ?? 0) * Math.max(0, s.machines[id].level - 1));
      const tray = tripS(routeM(c, id, 'scale'));
      out.feed += feeds * tripS(routeM(c, where, id));
      n.feed += feeds;
      if (handsRule) {
        // RULING2.md 17.4 (engine2-dispatch): under the hands' rule the tray waits for a floor at most half full or for
        // the tray to be full, so it is fetched in full loads (measured: the batch-and-a-trip term charged twice the
        // real tray seconds on the carry-bound day-1 yards).
        // On a floor over half full (rawFloor) the tray waits until it is full (crew.ts orderPlan): full loads only.
        const k = u.machKg[id] / h.load + (rawFloor ? 0 : feeds);
        out.tray += k * tray;
        n.tray += k;
      } else {
        // The tray (engine2-income2, measured): a batch costs the hands its own seconds and one trip more.
        out.tray += u.machKg[id] / Math.max(1e-9, rate) + feeds * tray;
        n.tray += feeds + u.machKg[id] / Math.max(1e-9, rate) / tray;
      }
    }
    // The crucible charges itself from the bays; its ingots are fetched from its tray, a load a trip.
    if (crucibleOn) {
      let melt = 0;
      for (const [g, kg] of Object.entries(u.kg)) if (meltIns.has(g)) melt += kg;
      if (melt > 0) {
        const k = melt / h.load;
        out.tray += k * tripS(routeM(c, 'crucible', 'scale'));
        n.tray += k;
      }
    }
    return out;
  };
  const sumC = (q: Carry) => q.scale + q.whole + q.feed + q.tray;
  const dCarryQ = carryOf(drop, 'dropoff');
  const dCarry = sumC(dCarryQ);
  let fullCut = 0;
  let fullCarry = 0;
  let fullTruck = 0;
  const cutHave = 3600 * cutters.length;
  // s2e-rate: the hands' seconds an hour the Yard sale's racking takes first (rawTerms), a trip a thing from the floor to the rack.
  const carryHave = Math.max(0, 3600 * hands.length - racked * tripS(routeM(c, 'floor', 'rack')));
  const truckHave = driver && s.truck.owned ? 3600 : 0;
  let rank: Record<string, number> = {};
  const prep = () => {
  rank = {};
  for (const p of parts) {
    p.cq = carryOf(p.u, 'floor');
    p.wc = p.u.cut;
    p.wh = sumC(p.cq);
    // RULING2.md 16.5: net over the slowest step's time for the load (the truck's round trip, the cutting at the
    // yard's cutters, the carrying at its hands).
    p.rank = p.net / Math.max(1e-9, p.trip, cutters.length ? p.wc / cutters.length : 0, p.wh / hands.length);
    rank[p.id] = p.rank;
  }
  fullCut = drop.cut + parts.reduce((a, p) => a + p.max * p.wc, 0);
  fullCarry = dCarry + parts.reduce((a, p) => a + p.max * p.wh, 0);
  fullTruck = parts.reduce((a, p) => a + p.max * p.trip, 0);
  };
  // 3. The partners' loads first (rateQueue), at the steps' whole hour; then the drop-off with what they leave.
  const finish = (q: QueueResult, f: number): RatedTerms => {
    const took = emptyUnit();
    const carryBy = { scale: 0, whole: 0, feed: 0, tray: 0 };
    const nBy = { scale: 0, whole: 0, feed: 0, tray: 0 };
    const addBy = (k: number, cq: Carry) => {
      for (const kk of ['scale', 'whole', 'feed', 'tray'] as const) {
        carryBy[kk] += k * cq[kk];
        nBy[kk] += k * cq.n[kk];
      }
    };
    let spent = 0;
    let cutUsed = f * drop.cut;
    let carryUsed = f * dCarry;
    const loads: Record<string, number> = {};
    for (const p of parts) {
      const n = q.n[p.id] ?? 0;
      if (n <= 0) continue;
      loads[p.id] = n;
      addUnit(took, p.u, n);
      addBy(n, p.cq);
      cutUsed += n * p.wc;
      carryUsed += n * p.wh;
      spent += n * p.price;
    }
    addUnit(took, drop, f);
    addBy(f, dCarryQ);
    let bind: RatedTerms['bind'] = 'feed';
    const short = parts.some((p) => (q.n[p.id] ?? 0) < p.max - 1e-9);
    if (short || f < 1 - 1e-9) {
      const cutUse = cutHave > 0 ? cutUsed / cutHave : 0;
      const carryUse = carryUsed / carryHave;
      bind = q.truckShare > 0.97 ? 'truck' : cutHave > 0 && cutUse >= carryUse ? 'cut' : 'carry';
    }
    const v = valueOf(c, s, took);
    return {
      I: roundMoney(v.sales - spent),
      dropoff: f * per,
      loads,
      bind,
      cut: { have: cutHave, need: fullCut },
      carry: { have: carryHave, need: fullCarry },
      truck: { have: truckHave, need: fullTruck },
      carryBy,
      sales: roundMoney(v.sales),
      spent: roundMoney(spent),
      rank,
      detail: { ...(works ? { melt: v.melt } : {}), trips: nBy, kgTrip: nBy.scale > 0 ? took.scaleKg / nBy.scale : 0, kgBy: v.kg, machH: v.machH, truckShare: q.truckShare, floorKg: q.floorKg, cutUse: cutHave > 0 ? cutUsed / cutHave : 0, carryUse: carryUsed / carryHave },
    };
  };
  const share = (need: number, left: number) => (need > 1e-9 ? Math.max(0, left / need) : Infinity);
  prep();
  // The partners' loads FIRST (engine2-income2, measured: the drop-off's things arrived 11 an hour against
  // its 72 on day 1, 38 to 60 at rung 3's entry): while the tipping floor is over half full the hands serve
  // it before the drop-off (crew.ts handDepart, FLOOR_CLEAR_SHARE), so the loads are replayed at the steps'
  // whole hour, and the drop-off's things are taken with the seconds the loads leave (nothing is paid for
  // them).
  // RULING2.md 16.2 and 17.4 (engine2-dispatch): from the rung of either rule the replay follows the yard as it now
  // works. The driver's rule (byNet). The hands' rule keeps them on a floor over half full, so the loads still take the
  // hands first; but the CUTTERS' own order (crew.ts cutterDepart: the drop-off, then the floor) is no longer hidden
  // behind the hands: they cut the drop-off's things first and the loads get the cutting seconds left (measured: with
  // the loads first, I ran 13 % (flat board) to 19 % (normal board) under G on both rules, the replay buying the
  // demolition loads the cutters had no seconds for).
  const rules = s.ladder.rung >= pickFromRung(c) || s.ladder.rung >= orderFromRung(c);
  // s2e-dropoff (RULING2.md 28.3): with works.dropoffPeriod_s, from the works' opening, the drop-off brings at most one arrival
  // a works period (things.ts worksDropoffPeriod): f (arrivals an hour over 3600 / dropoff.period) is at most dropCap, and the
  // cutters' seconds kept for the drop-off's things first are kept for no more than it brings. Key absent: Infinity (as built).
  const dropP = works ? worksDropoffPeriod(c, s) : null;
  const dropCap = dropP === null ? Infinity : c.dropoff.period / dropP;
  const fCut = rules ? Math.min(1, dropCap, share(drop.cut, cutHave)) : 1;
  const cutForLoads = rules ? Math.max(0, cutHave - fCut * drop.cut) : cutHave;
  const play = (): { q: QueueResult; f: number } => {
    // s2c-fix-money (E6, RULING2 22): from the works' opening the VALUATION ranks the partners' loads by net per truck-second
    // (the driver's own rule is the loop's, truck.ts; its ranks, `rank`, are unchanged), so a skip of lesser worth for the
    // truck's time never crowds a better load off the floor.
    // s2e-rate (yard-stage2-economy.md 2.3 item 1; RULING2.md 27): from the works' opening the replay plays THE DRIVER THE
    // YARD SHIPS (the skip full longest that fits the floor, with the fair count truck.fairAfter_trips, through truck.ts's own
    // rule: fullerFirst, fairPick, fairWaitNext), never a rank by net per truck-second (s2c-fix-money's valueRank, retired:
    // it read the yard's truck as serving the richest partner, which the driver does not do).
    const q = rateQueue(c, parts, cutForLoads, carryHave, s.ladder.rung >= pickFromRung(c), undefined, works ? fairTripsOf(c) : null);
    const cutLeft = Math.max(0, cutHave - parts.reduce((a, p) => a + (q.n[p.id] ?? 0) * p.wc, 0));
    const carryLeft = Math.max(0, carryHave - parts.reduce((a, p) => a + (q.n[p.id] ?? 0) * p.wh, 0));
    // s2e-rate (measured on the bots' rung-4 and day-3 yards: 640 drop-off arrivals an hour against the 72 of its period, the
    // hands busy 100 %): a full drop-off takes its next thing the instant one is taken (things.ts: nextAt = t), so from the
    // works' opening the drop-off is not bounded by its period: it takes every second the loads leave the hands and the
    // cutters, and a level that brings more loads displaces drop-off work (what the yard itself does).
    // s2e-dropoff (RULING2.md 28.3): with works.dropoffPeriod_s the yard's drop-off brings at most one arrival a works period
    // (things.ts worksDropoffPeriod), so the replay reads the same bound: at most 3600 / P arrivals an hour (f x per). Key
    // absent: unbounded, as above.
    if (works) return { q, f: Math.min(dropCap, share(drop.cut, cutLeft), share(dCarry, carryLeft)) };
    return { q, f: rules ? Math.min(fCut, share(dCarry, carryLeft)) : Math.min(1, share(drop.cut, cutLeft), share(dCarry, carryLeft)) };
  };
  let r = play();
  // RULING2.md 17.4 (engine2-dispatch, after the check: finding F3): under the hands' rule, while the replay's floor is
  // over half full the yard hands clear it first (crew.ts orderPlan) and the floor's cut pieces of a machine's input go
  // to the scale with the floor's pile (floorStep): the machines get the floor's whole things only (E35) and their
  // trays wait. The loads are replayed again so (measured, seed 104 minute 30: the hands' feed and tray seconds 189 an
  // hour in the yard against 880 in the replay that fed every piece).
  if (handsRule && r.q.floorKg > FLOOR_CLEAR_SHARE * c.floorRoom_kg) {
    parts = buildParts(true);
    rawFloor = true;
    prep();
    r = play();
  }
  return finish(r.q, r.f);
}

/** One open partner as the replay sees it (rateQueue): its load's unit, price, mass, truck phases and work. */
interface QueuePart {
  id: string;
  /** Loads an hour its skips can fill (3,600 × L ÷ fill_s). */
  max: number;
  trip: number;
  hookS: number;
  tipS: number;
  fill_s: number;
  level: number;
  price: number;
  /** Kilograms a load. */
  mass: number;
  u: Unit;
  /** Cutter and yard-hand seconds a load (all cutters' and all hands' seconds), the hands' by kind. */
  wc: number;
  wh: number;
  cq: Carry;
  /** Its rated net a load (partners.ts ratedLoadNet): the driver's rank from truck.pickFromRung (RULING2.md 16.2). */
  net: number;
  /** Its rank (RULING2.md 16.5: net over the slowest step's seconds for the load; RatedTerms.rank). */
  rank: number;
}

/** s2e-rate: is an analyser (a plate of kind 'assay') running (assay.ts analyserOn)? */
function analyserRunning(c: Ctx['c'], s: Ctx['s']): boolean {
  for (const id in s.works ?? {}) if (s.works[id].phase === 'running' && c.works?.plates[id]?.kind === 'assay') return true;
  return false;
}

/** s2e-rate: a skip's contents from the works' opening (partners.ts grownContents without its rotation: the skip's own body). */
function skipContents(c: Ctx['c'], s: Ctx['s'], partner: string): Record<string, number> {
  const p = c.partners[partner];
  const out: Record<string, number> = { ...p.skip };
  for (const gr of p.grows ?? []) if (gr.body === 'skip' && s.works?.[gr.needs]) for (const [o, n] of Object.entries(gr.contents)) out[o] = (out[o] ?? 0) + n;
  return out;
}

/** s2e-rate: have the works opened in this state, for a content with a works layer (the rule of every stage-2 term of I)? */
function worksOn(c: Ctx['c'], s: Ctx['s']): boolean {
  return !!c.works && s.counts?.bathSet !== undefined;
}

/**
 * s2e-rate: the shipped round of one load of `partner` (truck.ts driverRoundS) at its level `L` (its skips at slots 0 to
 * L - 1) and the driver's level, the mean over the slots; memoised per content object (a pure function of the content).
 */
const ROUND = new WeakMap<object, Map<string, { hookS: number; tipS: number; trip: number }>>();
function shippedRound(c: Ctx['c'], partner: string, L: number, driverLevel: number): { hookS: number; tipS: number; trip: number } {
  let m = ROUND.get(c);
  if (!m) ROUND.set(c, (m = new Map()));
  const key = `${partner}|${L}|${driverLevel}`;
  let r = m.get(key);
  if (!r) {
    r = { hookS: 0, tipS: 0, trip: 0 };
    for (let slot = 0; slot < L; slot++) {
      const q = driverRoundS(c, partner, slot, driverLevel);
      r.hookS += q.hookS / L;
      r.tipS += q.tipS / L;
      r.trip += q.trip / L;
    }
    m.set(key, r);
  }
  return { ...r };
}

/** s2e-rate: for each part (index k), the index of its skip full longest at `clock` (truck.ts fullestSkip: earliest fullAt, then the lower slot), or -1. */
function fullestOf(skips: readonly { k: number; fullAt: number }[], clock: number, n: number, buf?: number[]): number[] {
  // engine6: into `buf` (n long) when given, every entry set to -1 first: the same entries as a new array.
  const out: number[] = buf ? buf.fill(-1) : new Array(n).fill(-1);
  for (let i = 0; i < skips.length; i++) {
    const sk = skips[i];
    if (sk.fullAt > clock + 1e-9) continue;
    const j = out[sk.k];
    if (j < 0 || sk.fullAt < skips[j].fullAt) out[sk.k] = i;
  }
  return out;
}

/** engine6: parts.findIndex((p) => p.id === id), without a closure. */
function partIndex(parts: readonly { id: string }[], id: string): number {
  for (let k = 0; k < parts.length; k++) if (parts[k].id === id) return k;
  return -1;
}

interface QueueResult {
  /** Loads an hour by partner. */
  n: Record<string, number>;
  /** The share of the truck's hour the counted loads' round trips take. */
  truckShare: number;
  /** The tipping floor's mean mass over the counted hours, kg. */
  floorKg: number;
}

/**
 * The partners' loads AS THE YARD TAKES THEM (RULING2.md 14.5, engine2-fixB; it replaces I2's "the order that
 * keeps the most"). The driver's own rule (truck.ts driverDepart, hookRefusal 'floor'), played over three
 * hours with the assets alone: each partner's `skips[k]` skips fill in fill_s from the moment the driver hooks
 * the one before; when he is free he hooks the skip that was full FIRST among those the tipping floor has
 * room for (its grams now plus the skip's within floorRoom_kg); the load is on the floor from its tip; the
 * floor is cleared load after load at the pace of the slower of the cutters and the yard hands (engine2-
 * income2: at the steps' WHOLE hour: while the floor is busy the hands serve it before the drop-off).
 * Counted: the loads hooked in the second and third hours (the first fills the floor), halved.
 */
function rateQueue(c: Ctx['c'], parts: QueuePart[], cutHave: number, carryHave: number, byNet = false, rankOf: (p: QueuePart) => number = (p) => p.rank, fairN: number | null = null): QueueResult {
  const room = c.floorRoom_kg;
  const cutRate = cutHave / 3600;
  const carryRate = carryHave / 3600;
  const work = parts.map((p) => {
    const wc = p.wc > 1e-9 ? (cutRate > 1e-9 ? p.wc / cutRate : Infinity) : 0;
    const wh = p.wh > 1e-9 ? (carryRate > 1e-9 ? p.wh / carryRate : Infinity) : 0;
    return Math.max(wc, wh);
  });
  const skips: { k: number; fullAt: number }[] = [];
  parts.forEach((p, k) => {
    for (let q = 0; q < p.level; q++) skips.push({ k, fullAt: (q * p.fill_s) / p.level });
  });
  const floor: { k: number; at: number; rem: number }[] = []; // loads tipped (or to be tipped at `at`), FIFO
  let clock = 0;
  let workedTo = 0;
  // engine6: each part's test `work > 0 && finite` and its mass read once for the replay (constants of it), the floor walked
  // by index: the same terms added in the same order.
  const workOn = work.map((w) => w > 0 && Number.isFinite(w));
  const massOf = parts.map((p) => p.mass);
  const massNow = () => {
    let m = 0;
    const lim = clock + 1e-9;
    for (let j = 0; j < floor.length; j++) {
      const L = floor[j];
      if (L.at <= lim) {
        const k = L.k;
        m += workOn[k] ? massOf[k] * (L.rem / work[k]) : massOf[k];
      }
    }
    return m;
  };
  const clearTo = (t: number) => {
    // FIFO: the head load is worked; the next starts when it is done (and tipped).
    let now = workedTo;
    for (let j = 0; j < floor.length; j++) {
      const L = floor[j];
      if (now >= t) break;
      if (L.rem <= 0) continue;
      const start = Math.max(now, L.at);
      if (start >= t) break;
      const d = Math.min(L.rem, t - start);
      L.rem -= d;
      now = start + d;
    }
    workedTo = Math.max(workedTo, Math.min(t, now));
    while (floor.length && floor[0].rem <= 1e-9) floor.shift();
  };
  const H = 3 * 3600;
  // engine6: the fair rule's kept buffers (see the step below).
  const fullBuf: number[] = new Array(parts.length).fill(-1);
  const waitBuf: { id: string; r: number; fullAt: number; fits: boolean }[] = [];
  const waitRows: { id: string; r: number; fullAt: number; fits: boolean }[] = [];
  const bestRow = { k: 0, fullAt: 0 };
  const n = parts.map(() => 0);
  const fairW = parts.map(() => 0);
  let busy = 0;
  let massT = 0;
  let lastT = 3600;
  let lastM = 0;
  for (let guard = 0; clock < H && guard < 100_000; guard++) {
    clearTo(clock);
    const m = massNow();
    if (clock > 3600) massT += lastM * (clock - lastT);
    if (clock >= 3600) {
      lastT = clock;
      lastM = m;
    }
    let pick = -1;
    // RULING2.md 16.2, 16.5: from truck.pickFromRung the replay follows the driver's rule (truck.ts bestLoad): the full
    // skip of the best-ranked partner (QueuePart.rank; equal: full first), taken when it fits, else waited for
    // (a lesser load is not taken while it waits; a load heavier than the whole floor is passed over, as there).
    let wantMass = Infinity;
    if (byNet) {
      for (let i = 0; i < skips.length; i++) {
        const sk = skips[i];
        if (sk.fullAt > clock + 1e-9 || parts[sk.k].mass > room + 1e-9) continue;
        if (pick < 0) {
          pick = i;
          continue;
        }
        const a = parts[sk.k];
        const b = parts[skips[pick].k];
        const ra = rankOf(a);
        const rb = rankOf(b);
        if (ra > rb || (ra === rb && (sk.fullAt < skips[pick].fullAt - 1e-9 || (Math.abs(sk.fullAt - skips[pick].fullAt) <= 1e-9 && a.id < b.id)))) pick = i;
      }
      if (pick >= 0 && m + parts[skips[pick].k].mass > room + 1e-9) {
        wantMass = parts[skips[pick].k].mass;
        pick = -1;
      }
    } else if (fairN !== null) {
      // s2e-rate: the shipped driver (truck.ts driverDepart from the works' opening). Each partner's fullest skip; the rule's
      // own choice is the one full longest that fits (fullerFirst, in the partners' order); the fair rule may take a more
      // urgent one instead, or wait for the floor's room for it (fairPick); at the departure every other waiting partner
      // counts a trip more (fairWaitNext).
      // engine6: the same choice without new objects at each step (the replay takes about 900 steps, 268 replays at a
      // rung-5 yard's first absence): `full`, `waiting` and its rows and the best so far are kept for the whole replay.
      const full = fullestOf(skips, clock, parts.length, fullBuf);
      let best: { k: number; fullAt: number } | null = null;
      const waiting = waitBuf;
      waiting.length = 0;
      for (let k = 0; k < parts.length; k++) {
        const i = full[k];
        if (i < 0) continue;
        const fits = m + parts[k].mass <= room + 1e-9;
        if (fits && fullerFirst(skips[i].fullAt, best)) {
          bestRow.k = k;
          bestRow.fullAt = skips[i].fullAt;
          best = bestRow;
        }
        if (parts[k].mass <= room + 1e-9) {
          const row = waitRows[waiting.length] ?? (waitRows[waiting.length] = { id: '', r: 0, fullAt: 0, fits: false });
          row.id = parts[k].id;
          row.r = fairN - fairW[k];
          row.fullAt = skips[i].fullAt;
          row.fits = fits;
          waiting.push(row);
        }
      }
      const f = fairPick(waiting, best ? parts[best.k].id : null);
      if (f !== null && typeof f === 'object') {
        wantMass = parts[partIndex(parts, f.wait)].mass;
      } else if (f !== null) {
        const k = partIndex(parts, f);
        pick = full[k];
        for (let j = 0; j < parts.length; j++) fairW[j] = fairWaitNext(parts[j].id, f, fairW[j], full[j] >= 0 && parts[j].mass <= room + 1e-9);
      }
    } else
      for (let i = 0; i < skips.length; i++) {
        const sk = skips[i];
        if (sk.fullAt > clock + 1e-9 || m + parts[sk.k].mass > room + 1e-9) continue;
        if (pick < 0 || sk.fullAt < skips[pick].fullAt - 1e-9 || (Math.abs(sk.fullAt - skips[pick].fullAt) <= 1e-9 && parts[sk.k].id < parts[skips[pick].k].id)) pick = i;
      }
    if (pick < 0) {
      // Wait for the next skip to fill, or for the floor to clear room for the lightest full skip.
      let next = Infinity;
      let lightest = Infinity;
      for (let i = 0; i < skips.length; i++) {
        const sk = skips[i];
        if (sk.fullAt > clock + 1e-9) next = Math.min(next, sk.fullAt);
        else lightest = Math.min(lightest, parts[sk.k].mass);
      }
      if ((byNet || fairN !== null) && Number.isFinite(wantMass)) lightest = wantMass;
      if (Number.isFinite(lightest)) {
        let D = m + lightest - room;
        let dt = 0;
        for (const L of floor) {
          const W = work[L.k];
          if (L.rem <= 0 || !(W > 0) || !Number.isFinite(W)) continue;
          const rate = parts[L.k].mass / W;
          const avail = rate * L.rem;
          if (avail >= D - 1e-9) {
            dt += Math.max(0, D) / rate;
            D = 0;
            break;
          }
          D -= avail;
          dt += L.rem;
        }
        if (D <= 1e-9) next = Math.min(next, clock + dt + 1e-6);
      }
      if (!Number.isFinite(next)) break;
      clock = Math.max(next, clock + 1e-6);
      continue;
    }
    const sk = skips[pick];
    const p = parts[sk.k];
    if (clock >= 3600) {
      n[sk.k] += 1;
      busy += Math.min(p.trip, H - clock);
    }
    sk.fullAt = clock + p.hookS + p.fill_s;
    if (Number.isFinite(work[sk.k])) floor.push({ k: sk.k, at: clock + p.tipS, rem: work[sk.k] });
    clock += p.trip;
  }
  if (clock > lastT) massT += lastM * (Math.min(H, clock) - lastT);
  const out: Record<string, number> = {};
  parts.forEach((p, k) => {
    if (n[k] > 0) out[p.id] = n[k] / 2;
  });
  return { n: out, truckShare: busy / (2 * 3600), floorKg: massT / (2 * 3600) };
}

/**
 * The value at usual prices of an hour's (or a unit's) material (I4): each machine's input assigned to
 * its capacity (kg/s × 3,600, level included; the crucible 1 ÷ s_per_kg), the rest sold as weighed. `kg` is
 * what that sells by grade, kg (the crucible's inputs moved to its ingot; the table's).
 */
function valueOf(c: Ctx['c'], s: Ctx['s'], u: Unit): { sales: number; kg: Record<string, number>; machH: Record<string, number>; melt: Record<string, { kg: number; gain: number }> } {
  let sales = 0;
  const machH: Record<string, number> = {};
  const kg: Record<string, number> = { ...u.kg };
  for (const id of ['stripper', 'bench'] as const) {
    const m = u.machKg[id];
    if (m <= 0) continue;
    const d = c.machines[id] as { rate: number; lev?: number };
    const cap = s.machines[id].owned ? 3600 * d.rate * (1 + (d.lev ?? 0) * Math.max(0, s.machines[id].level - 1)) : 0;
    const inG = id === 'stripper' ? 'cab' : 'mot';
    const run = Math.min(m, cap);
    machH[id] = cap > 0 ? run / cap : 0;
    for (const [g, q] of machineShares(c, id, inG)) kg[g] = (kg[g] ?? 0) + run * q;
    kg[inG] = (kg[inG] ?? 0) + (m - run);
  }
  const moved: [string, string, number][] = [];
  const melt: Record<string, { kg: number; gain: number }> = {};
  // The crucible: from the bays, the recipe paying more a kilogram first, within its hour (s_per_kg); only
  // once it can run with nobody there (RULING2.md 14.5): owned AND poured at least once (its first heat waits
  // at 'ready' for the boss, so a crucible never poured earns nothing away).
  if (s.machines.crucible.owned && (s.counts?.poured ?? 0) > 0) {
    const d = c.machines.crucible;
    const all = 3600 / Math.max(1e-9, d.s_per_kg);
    let left = all;
    const recs = Object.values(d.recipes).map((r) => {
      const ins = Array.isArray(r[0]) ? (r[0] as string[]) : [r[0] as string];
      const [, out, y, dross] = r as unknown as [unknown, string, number, string];
      return { ins, out, gain: (inp: string) => y * usualP(c, out) + (1 - y) * usualP(c, dross) - usualP(c, inp) };
    });
    const opts: { grade: string; gain: number; r: (typeof recs)[number] }[] = [];
    for (const r of recs) for (const g of r.ins) opts.push({ grade: g, gain: r.gain(g), r });
    opts.sort((a, b) => b.gain - a.gain);
    for (const o of opts) {
      if (o.gain <= 0 || left <= 0) continue;
      const m = Math.min(kg[o.grade] ?? 0, left);
      if (m <= 0) continue;
      left -= m;
      sales += m * o.gain;
      moved.push([o.grade, o.r.out, m]);
      melt[o.grade] = { kg: (melt[o.grade]?.kg ?? 0) + m, gain: o.gain };
    }
  }
  for (const [g, m] of Object.entries(kg)) sales += m * usualP(c, g);
  if (s.machines.crucible.owned && (s.counts?.poured ?? 0) > 0) machH.crucible = moved.reduce((a, [, , m]) => a + m, 0) * c.machines.crucible.s_per_kg / 3600;
  for (const [a, b, m] of moved) {
    kg[a] -= m;
    kg[b] = (kg[b] ?? 0) + m;
  }
  return { sales, kg, machH, melt };
}

/**
 * RULING2.md 16.5: the hired driver's rank of each open partner (RatedTerms.rank), read from the cache of I without a
 * copy (the idle driver asks at every instant he waits). Null when I has no replay of the loads (no yard hand, no
 * driver, no truck): the driver then ranks by the rated net a load alone.
 */
export function loadRanks(c: Ctx['c'], s: Ctx['s']): Readonly<Record<string, number>> | null {
  const key = assetKey(c, s);
  let byKey = rateCache.get(c);
  if (!byKey) rateCache.set(c, (byKey = new Map()));
  // s2c-fix-money (E6): the ranks are the state's own replay's (rawTerms), never the envelope's; the same values as before.
  const t = byKey.get(key) ?? rawTerms(c, s, key);
  return t.rank && Object.keys(t.rank).length ? t.rank : null;
}

/**
 * The REPLAY's income for the assets as they are (s2c-fix-money): rated income before the envelope of E6 (the yard's
 * capacity all in use). What a purchase's rated gain is read from (the advice line's payback, a partner level's price,
 * the card's "not the bottleneck now": ladder.ts ratedGain), at one replay a state; I itself (packs, ads, the bank, the
 * lots) is ratedIncome. The same as ratedIncome in the first yard.
 */
export function replayIncome(c: Ctx['c'], s: Ctx['s']): number {
  return rawTerms(c, s).I;
}

/** The REPLAY's terms for the assets as they are (replayIncome's, before E6's envelope; a copy): the loads the shipped driver takes, what binds (s2e-rate). */
export function replayTerms(c: Ctx['c'], s: Ctx['s']): RatedTerms {
  return copyTerms(rawTerms(c, s));
}

/** I, § an hour (2.3; the facade's ratedIncome). */
export function ratedIncome(c: Ctx['c'], s: Ctx['s']): number {
  return ratedTerms(c, s).I;
}

/** I₀ (2.12): rated income before the Yard sale's (and the van's) terms; the Yard sale's ceiling reads it, so nothing is circular. */
export function ratedIncome0(c: Ctx['c'], s: Ctx['s']): number {
  const t = ratedTerms(c, s);
  return t.I0 ?? t.I;
}

/** Facade `ratedIncome(cfg, g)`: I, § an hour, net (2.3). */
export function ratedIncomeCfg(cfg: SalvageConfig, g: SalvageGame): number {
  // s2c-fix-money (19.2, E6): the content at the state (layer.ts contentAt; the base content itself in the first yard).
  return ratedIncome(contentAt(cfg.salvage, g.salvage), g.salvage);
}

/** Facade `ratedTerms(cfg, g)`: I and its terms (feed taken, what binds, each step's seconds). */
export function ratedTermsCfg(cfg: SalvageConfig, g: SalvageGame): RatedTerms {
  return ratedTerms(contentAt(cfg.salvage, g.salvage), g.salvage);
}

/** Facade `stockValue(cfg, g)`: unsold stock at usual prices, § (the gate's G, 2.3.3). */
export function stockValueCfg(cfg: SalvageConfig, g: SalvageGame): number {
  return stockValue(contentAt(cfg.salvage, g.salvage), g.salvage);
}

// ---------------------------------------------------------------------------------------- a level's gain (RULING2.md 27.4)

/**
 * The id of a level's LADDER in the content's gain book (`levels.book`, s2e-content's schema: "a crew role, a partner,
 * `driver`, ..."): a crew member's role (`cutter`, `hand`, `driver`), a first-yard machine's id, a partner's id, a works
 * plate's id, `reuse` for the Yard sale's rack.
 */
export function levelLadderOf(s: Ctx['s'], target: LevelTarget): string {
  if (target.kind === 'crew') return s.crew.find((m) => m.id === target.id)?.role ?? target.id;
  if (target.kind === 'machine') return target.machine;
  if (target.kind === 'partner') return target.partner;
  if (target.kind === 'plate') return target.plate;
  return 'reuse';
}

/** The level a target stands at now (the step bought takes it from L to L + 1), or null when it has none. */
function levelOf(s: Ctx['s'], target: LevelTarget): number | null {
  if (target.kind === 'crew') return s.crew.find((m) => m.id === target.id)?.level ?? null;
  if (target.kind === 'machine') return s.machines[target.machine]?.level ?? null;
  if (target.kind === 'partner') return s.partners[target.partner]?.level ?? null;
  if (target.kind === 'plate') return s.works?.[target.plate]?.level ?? null;
  return s.reuse?.level ?? null;
}

/**
 * THE ONE MEASURE OF A LEVEL'S GAIN (RULING2.md 27.2 d and 27.4; yard-stage2-economy.md 2.3, 2.11, 2.13), § an hour: what
 * every level's price, its card ("+§x an hour on your yard's figures") and the advice line read from the works' opening.
 * - THE GAIN BOOK, for a ladder with an entry in the content's `levels.book` ({g1, d}, written by the bots where the
 *   driver-level check of G2 R fails for that ladder): the measured ladder g1 x d^(L-1), L the level now (the first step
 *   bought, 1 to 2, gains g1).
 * - ELSE THE CALCULATED GAIN on the player's own state: rated income's replay (replayIncome: the yard's assets all in use,
 *   before E6's envelope; kappa_r included) with the level one step up less now, never below 0.
 * A pure function of the content and the state's assets. Below the works' opening no first-yard rule reads it (the first
 * yard prices its levels by levels.margin_per_kg, ladder.ts levelPrice, pinned); the book is stripped at release.stage 1.
 */
export function levelGain(c: Ctx['c'], s: Ctx['s'], target: LevelTarget): number {
  const L = levelOf(s, target);
  if (L === null) return 0;
  const book = (c.levels as { book?: Record<string, { g1: number; d: number }> }).book;
  const e = book?.[levelLadderOf(s, target)];
  if (e && Number.isFinite(e.g1) && e.d > 0) return Math.max(0, e.g1 * e.d ** (Math.max(1, L) - 1));
  const up = levelled({ salvage: s } as unknown as SalvageGame, target).salvage;
  return Math.max(0, replayIncome(c, up) - replayIncome(c, s));
}

/** Facade `levelGain(cfg, g, target)`: the content at the state (layer.ts contentAt). */
export function levelGainCfg(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): number {
  return levelGain(contentAt(cfg.salvage, g.salvage), g.salvage, target);
}
