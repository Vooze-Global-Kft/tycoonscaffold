/**
 * The rate engine's measures and the instant's checks (yard-stage1.md 2.11, 2.12, 2.14 step 6): rated
 * capacity R (the throughput of the crew and machines with full feed and no boss), purchases arriving,
 * rungs, rivals passed, the deal offer, partners opening, goals by id. Owner: rules-sim.
 */
import { checkGoals } from './goals';
import { rungReached } from './ladder';
import { passedNow } from './rivals';
import { CHECK_EVERY_S, count, dayAt, type Ctx } from './clock';
import { convAssay, cutTime, driverRoundF, laneM, legM, machineShares, pieceCount, pieceSpec, routeM, specsOf, toolP } from './content';
import { roundMoney } from './money';
import { crucibleCharged } from './crucible';
import { dealOffer, gateReached } from './deal';
import { defOf } from './machines';
import { openPartners } from './partners';
import { holdRelease } from './bays';
import { roundTry } from './round';
import { worksOpen } from './works';
import { floorSlots, pointOf, thingPos } from './positions';
import type { MachineId, SalvageConfig, SalvageGame } from './types';

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
  if (s.ladder.rung >= worksRungOf(x.c) && s.counts!.bathSet === undefined) worksOpen(x, t);
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
function unitOf(c: Ctx['c'], s: Ctx['s'], obj: string, where: 'floor' | 'dropoff', cutP: number, cutV: number, walkM: number): Unit {
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
        put(sp.grade, sp.g / 1000);
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
    const d = dest(sp.grade);
    if (d) u.machKg[d] += sp.g / 1000;
    else {
      u.scaleKg += sp.g / 1000;
      u.m2 += (sp.g / 1000) ** 2;
      put(sp.grade, sp.g / 1000);
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
}

/**
 * RATED INCOME I (stage 2 2.3; RULING2.md 2.1, 10.6, section 12: I1 to I6; ECONOMY E38), § an hour, NET:
 * what the yard keeps an hour with its present assets, no boss, at usual prices. A pure function of the
 * ASSETS (crew and levels, tools, machines and levels, partners and levels, the truck): never of recent
 * sales (the built incomeRate), of stock, cash, prices of the day or a switch the player can flip.
 *
 * 1. Feed (I3): the drop-off's arrivals (one a period, by its mix) and the partners' loads: at most
 *    3,600 × L ÷ fill_s an hour each, within ONE truck's hour (I2: each load costs the planned round trip
 *    the driver's run uses, truck.ts planTrip: out, hook, back, weigh, tip, park, at his level's F).
 * 2. Steps: cutting (the cutters' seconds: each piece's cut time at their mean power, and the walk between
 *    things) and carrying (the yard hands' seconds: pieces to the scale in trips as full as whole pieces
 *    allow, whole things one a trip; RULING2.md 14.5: a powered machine's input from a load in ONE feed
 *    trip (the floor's one pile; a thing's pieces at the drop-off: a trip a thing), whole things that need
 *    no cutting carried off the floor to the hopper several a trip, and its tray fetched at every hand's
 *    choice while it works through the batch: batch seconds ÷ (one trip ÷ the hands), at least what full
 *    loads of the output need), each trip 2 × the walk ÷ his speed + 2 × handle_s.
 * 3. The feed is taken as the yard takes it: the drop-off's (nothing paid) first, then the partners' loads
 *    by the driver's own rule played over three hours (queue below: the skip full first that the tipping
 *    floor has room for; the floor cleared at the pace of the slower of the cutters and the hands), I3:
 *    capacity beyond the feed adds nothing.
 * 4. Value (I4): each kilogram at usual prices as weighed, the powered stripper's and the bench's inputs
 *    at their outputs, the crucible's brass and aluminium inputs at the ingot (the recipe that pays more a
 *    kilogram first, within the crucible's s_per_kg; only once poured at least once, RULING2.md 14.5),
 *    whatever the switches say; less the loads' label
 *    prices (k × the as-found value at usual prices).
 * 0 before the first yard hand (2.3.1).
 */
export function ratedTerms(c: Ctx['c'], s: Ctx['s']): RatedTerms {
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
  const handV = hands.reduce((a, m) => a + speed(m.level), 0) / hands.length;
  const floorWalk = slotSpacing(c, 'floor', floorSlots(c));
  const dropWalk = legM(c, pointOf(c, 'floor'), pointOf(c, 'dropoff')) / 2;

  // 1. Feed units: an hour of the drop-off's arrivals, and one load of each open partner.
  const per = 3600 / Math.max(1e-9, c.dropoff.period);
  const wsum = c.dropoff.mix.reduce((a, [, w]) => a + w, 0) || 1;
  const drop = emptyUnit();
  for (const [obj, w] of c.dropoff.mix) addUnit(drop, unitOf(c, s, obj, 'dropoff', cutP, cutV, dropWalk), (per * w) / wsum);
  const driver = s.crew.find((m) => m.role === 'driver');
  const F = driverRoundF(c, driver?.level ?? 1);
  const dv = c.truck.v * c.truck.driverFactor * F;
  const parts: { id: string; max: number; trip: number; hookS: number; tipS: number; fill_s: number; level: number; price: number; mass: number; u: Unit }[] = [];
  if (driver && s.truck.owned) {
    for (const [id, p] of Object.entries(c.partners)) {
      const ps = s.partners[id];
      if (!ps?.open && !s.owned.includes(p.opens)) continue;
      const lane = laneM(c, id);
      const hookS = (routeM(c, 'park', 'gate') + lane) / dv + c.truck.handle_s / F;
      const tipS = hookS + (lane + routeM(c, 'gate', 'weighbridge')) / dv + c.weigh_s / F + routeM(c, 'weighbridge', 'floor') / dv + c.truck.handle_s / F;
      const trip = tipS + routeM(c, 'floor', 'park') / dv;
      const u = emptyUnit();
      let asFound = 0;
      for (const [obj, n] of Object.entries(p.skip)) {
        addUnit(u, unitOf(c, s, obj, 'floor', cutP, cutV, floorWalk), n);
        for (const [grade, g, k] of specsOf(c, obj)) asFound += n * k * (g / 1000) * usualP(c, grade) * (c.grades[grade]?.asFound ?? 1);
      }
      const mass = Object.entries(p.skip).reduce((a, [o, n]) => a + (c.objects[o]?.gross_g ?? 0) * n, 0);
      parts.push({ id, max: (3600 * Math.max(1, ps?.level ?? 1)) / Math.max(1e-9, p.fill_s), trip, hookS, tipS, fill_s: p.fill_s, level: Math.max(1, ps?.level ?? 1), price: roundMoney(p.k * asFound), mass: mass / 1000, u });
    }
  }

  // 2. What a unit needs of each step, seconds.
  const tripS = (m: number) => (2 * m) / handV + 2 * h.handle_s;
  const scaleFrom = { floor: routeM(c, 'floor', 'scale'), dropoff: routeM(c, 'dropoff', 'scale') };
  const machFrom = (id: 'stripper' | 'bench', where: 'floor' | 'dropoff') => routeM(c, where, id);
  const trayTo = (id: 'stripper' | 'bench') => routeM(c, id, 'scale');
  const carryParts = (u: Unit, where: 'floor' | 'dropoff') => {
    const mean = u.scaleKg > 0 ? u.m2 / u.scaleKg : 0;
    const fill = Math.max(1, h.load - mean / 2);
    const out = { scale: (u.scaleKg / fill) * tripS(scaleFrom[where]), whole: u.wholeKg > 0 ? (u.wholeKg / Math.min(h.load, u.wholeKg)) * tripS(scaleFrom[where]) : 0, feed: 0, tray: 0 };
    for (const id of ['stripper', 'bench'] as const) {
      if (!u.feeds[id]) continue;
      // E35: whole things off the floor to the hopper, several a trip up to a load (crew.ts floorStep);
      // the cut pieces of the machine's input as below.
      const wholeKg = where === 'floor' ? u.machWholeKg[id] : 0;
      const pieceKg = u.machKg[id] - wholeKg;
      // RULING2.md 14.5 (engine2-fixB): the machine trips as the yard hands make them (crew.ts handDepart's
      // order: feed (1) and the out trays (3) come before the drop-off and the floor). A load's things are cut
      // on the tipping floor and their pieces lie in its ONE pile, so a load's input goes to the hopper in one
      // feed trip (a batch); at the drop-off each thing's pieces lie beside it (a batch a thing). While the
      // machine works through a batch every hand's choice finds grams in its tray, so the tray is fetched once
      // a choice: batch seconds ÷ the seconds between the hands' choices (one trip ÷ the hands), and at least
      // as often as full loads of the batch's output need.
      const batches = where === 'floor' ? 1 : u.feeds[id];
      const d = c.machines[id] as { rate: number; lev?: number };
      const rate = d.rate * (1 + (d.lev ?? 0) * Math.max(0, s.machines[id].level - 1));
      const batchS = u.machKg[id] / batches / Math.max(1e-9, rate);
      const chooseS = tripS(scaleFrom.floor) / hands.length;
      if (pieceKg > 1e-9) out.feed += batches * tripS(machFrom(id, where));
      if (wholeKg > 1e-9) out.feed += (wholeKg / h.load) * tripS(machFrom(id, where));
      out.tray += batches * Math.max(u.machKg[id] / batches / h.load, batchS / chooseS) * tripS(trayTo(id));
    }
    return out;
  };
  const carryNeed = (u: Unit, where: 'floor' | 'dropoff') => {
    const q = carryParts(u, where);
    return q.scale + q.whole + q.feed + q.tray;
  };
  const cutHave = 3600 * cutters.length;
  const carryHave = 3600 * hands.length;
  const truckHave = driver && s.truck.owned ? 3600 : 0;
  // 3. Take the feed best first while every step has seconds left.
  let cutLeft = cutHave;
  let carryLeft = carryHave;
  let bind: RatedTerms['bind'] = 'feed';
  const took = emptyUnit();
  const share = (need: number, left: number) => (need > 1e-9 ? Math.max(0, left / need) : Infinity);
  const dCut = drop.cut;
  const dCarry = carryNeed(drop, 'dropoff');
  let f = Math.min(1, share(dCut, cutLeft), share(dCarry, carryLeft));
  if (f < 1) bind = share(dCut, cutLeft) <= share(dCarry, carryLeft) ? 'cut' : 'carry';
  addUnit(took, drop, f);
  cutLeft -= f * dCut;
  carryLeft -= f * dCarry;
  const dropTaken = f * per;
  const carryBy = { scale: 0, whole: 0, feed: 0, tray: 0 };
  const addBy = (q: typeof carryBy, k: number) => {
    carryBy.scale += k * q.scale;
    carryBy.whole += k * q.whole;
    carryBy.feed += k * q.feed;
    carryBy.tray += k * q.tray;
  };
  addBy(carryParts(drop, 'dropoff'), f);
  /**
   * The partners' loads AS THE YARD TAKES THEM (RULING2.md 14.5, engine2-fixB; it replaces I2's "the order
   * that keeps the most", which the attack measured overstating by up to a fifth on yards played with the
   * normal board). The driver's own rule (truck.ts driverDepart, hookRefusal 'floor'), played over a few
   * hours with the assets alone: each partner's L skips fill in fill_s from the moment the driver hooks the
   * one before; when he is free he hooks the skip that was full FIRST among those the tipping floor has room
   * for (its grams now plus the skip's within floorRoom_kg); the load is on the floor from its tip; the floor
   * is cleared load after load at the pace of the slower of the cutters and the yard hands (the seconds each
   * load needs of each, at what the drop-off leaves them). Counted: the loads hooked in the second and third
   * hours (the first fills the floor).
   */
  const queue = () => {
    if (!parts.length) return { n: {} as Record<string, number>, u: emptyUnit(), paid: 0, why: bind };
    const room = c.floorRoom_kg;
    const cutRate = cutLeft / 3600;
    const carryRate = carryLeft / 3600;
    const work = parts.map((p) => {
      const wc = p.u.cut > 1e-9 ? (cutRate > 1e-9 ? p.u.cut / cutRate : Infinity) : 0;
      const wh = carryNeed(p.u, 'floor');
      const wh2 = wh > 1e-9 ? (carryRate > 1e-9 ? wh / carryRate : Infinity) : 0;
      return { W: Math.max(wc, wh2), wc, wh: wh2 };
    });
    const skips: { k: number; fullAt: number }[] = [];
    parts.forEach((p, k) => {
      for (let q = 0; q < p.level; q++) skips.push({ k, fullAt: (q * p.fill_s) / p.level });
    });
    const floor: { k: number; at: number; rem: number }[] = []; // loads tipped (or to be tipped at `at`), FIFO
    let clock = 0;
    let workedTo = 0;
    const massNow = () => {
      let m = 0;
      for (const L of floor) if (L.at <= clock + 1e-9) m += work[L.k].W > 0 && Number.isFinite(work[L.k].W) ? parts[L.k].mass * (L.rem / work[L.k].W) : parts[L.k].mass;
      return m;
    };
    const clearTo = (t: number) => {
      // FIFO: the head load is worked; the next starts when it is done (and tipped).
      let now = workedTo;
      for (const L of floor) {
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
    const n = parts.map(() => 0);
    let busy = 0;
    for (let guard = 0; clock < H && guard < 100_000; guard++) {
      clearTo(clock);
      const m = massNow();
      let pick = -1;
      for (let i = 0; i < skips.length; i++) {
        const sk = skips[i];
        if (sk.fullAt > clock + 1e-9 || m + parts[sk.k].mass > room + 1e-9) continue;
        if (pick < 0 || sk.fullAt < skips[pick].fullAt - 1e-9 || (Math.abs(sk.fullAt - skips[pick].fullAt) <= 1e-9 && parts[sk.k].id < parts[skips[pick].k].id)) pick = i;
      }
      if (pick < 0) {
        // Wait for the next skip to fill, or for the floor to clear room for the lightest full skip.
        let next = Infinity;
        let lightest = Infinity;
        for (const sk of skips) {
          if (sk.fullAt > clock + 1e-9) next = Math.min(next, sk.fullAt);
          else lightest = Math.min(lightest, parts[sk.k].mass);
        }
        if (Number.isFinite(lightest)) {
          let D = m + lightest - room;
          let dt = 0;
          for (const L of floor) {
            const W = work[L.k].W;
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
      if (Number.isFinite(work[sk.k].W)) floor.push({ k: sk.k, at: clock + p.tipS, rem: work[sk.k].W });
      clock += p.trip;
    }
    const u = emptyUnit();
    const out: Record<string, number> = {};
    let paid = 0;
    let wc = 0;
    let wh = 0;
    parts.forEach((p, k) => {
      const q = n[k] / 2;
      if (q <= 0) return;
      out[p.id] = q;
      addUnit(u, p.u, q);
      paid += q * p.price;
      wc += q * work[k].wc;
      wh += q * work[k].wh;
    });
    const short = parts.some((p, k) => n[k] / 2 < p.max - 1e-9);
    const why: RatedTerms['bind'] = !short ? bind : busy / (2 * 3600) > 0.97 ? 'truck' : wc >= wh ? 'cut' : 'carry';
    return { n: out, u, paid, why };
  };
  const best = queue();
  const loads = best.n;
  const spent = best.paid;
  bind = best.why;
  addUnit(took, best.u, 1);
  for (const p of parts) if (loads[p.id]) addBy(carryParts(p.u, 'floor'), loads[p.id]);
  const v = valueOf(c, s, took);
  const fullCut = drop.cut + parts.reduce((a, p) => a + p.max * p.u.cut, 0);
  const fullCarry = dCarry + parts.reduce((a, p) => a + p.max * carryNeed(p.u, 'floor'), 0);
  const fullTruck = parts.reduce((a, p) => a + p.max * p.trip, 0);
  return {
    I: roundMoney(v.sales - spent),
    dropoff: dropTaken,
    loads,
    bind,
    cut: { have: cutHave, need: fullCut },
    carry: { have: carryHave, need: fullCarry },
    truck: { have: truckHave, need: fullTruck },
    carryBy,
    sales: roundMoney(v.sales),
    spent: roundMoney(spent),
  };
}

/**
 * The value at usual prices of an hour's (or a unit's) material (I4): each machine's input assigned to
 * its capacity (kg/s × 3,600, level included; the crucible 1 ÷ s_per_kg), the rest sold as weighed.
 */
function valueOf(c: Ctx['c'], s: Ctx['s'], u: Unit): { sales: number } {
  let sales = 0;
  const kg: Record<string, number> = { ...u.kg };
  for (const id of ['stripper', 'bench'] as const) {
    const m = u.machKg[id];
    if (m <= 0) continue;
    const d = c.machines[id] as { rate: number; lev?: number };
    const cap = s.machines[id].owned ? 3600 * d.rate * (1 + (d.lev ?? 0) * Math.max(0, s.machines[id].level - 1)) : 0;
    const inG = id === 'stripper' ? 'cab' : 'mot';
    const run = Math.min(m, cap);
    for (const [g, q] of machineShares(c, id, inG)) kg[g] = (kg[g] ?? 0) + run * q;
    kg[inG] = (kg[inG] ?? 0) + (m - run);
  }
  // The crucible: from the bays, the recipe paying more a kilogram first, within its hour (s_per_kg); only
  // once it can run with nobody there (RULING2.md 14.5): owned AND poured at least once (its first heat waits
  // at 'ready' for the boss, so a crucible never poured earns nothing away).
  if (s.machines.crucible.owned && (s.counts?.poured ?? 0) > 0) {
    const d = c.machines.crucible;
    let left = 3600 / Math.max(1e-9, d.s_per_kg);
    const recs = Object.values(d.recipes).map((r) => {
      const ins = Array.isArray(r[0]) ? (r[0] as string[]) : [r[0] as string];
      const [, out, y, dross] = r as unknown as [unknown, string, number, string];
      return { ins, gain: (inp: string) => y * usualP(c, out) + (1 - y) * usualP(c, dross) - usualP(c, inp) };
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
    }
  }
  for (const [g, m] of Object.entries(kg)) sales += m * usualP(c, g);
  return { sales };
}

/** I, § an hour (2.3; the facade's ratedIncome). */
export function ratedIncome(c: Ctx['c'], s: Ctx['s']): number {
  return ratedTerms(c, s).I;
}

/** Facade `ratedIncome(cfg, g)`: I, § an hour, net (2.3). */
export function ratedIncomeCfg(cfg: SalvageConfig, g: SalvageGame): number {
  return ratedIncome(cfg.salvage, g.salvage);
}

/** Facade `ratedTerms(cfg, g)`: I and its terms (feed taken, what binds, each step's seconds). */
export function ratedTermsCfg(cfg: SalvageConfig, g: SalvageGame): RatedTerms {
  return ratedTerms(cfg.salvage, g.salvage);
}

/** Facade `stockValue(cfg, g)`: unsold stock at usual prices, § (the gate's G, 2.3.3). */
export function stockValueCfg(cfg: SalvageConfig, g: SalvageGame): number {
  return stockValue(cfg.salvage, g.salvage);
}
