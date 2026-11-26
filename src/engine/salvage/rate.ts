/**
 * The rate engine's measures and the instant's checks (yard-stage1.md 2.11, 2.12, 2.14 step 6): rated
 * capacity R (the throughput of the crew and machines with full feed and no boss), purchases arriving,
 * rungs, rivals passed, the deal offer, partners opening, goals by id. Owner: rules-sim.
 */
import { checkGoals } from './goals';
import { rungReached } from './ladder';
import { passedNow } from './rivals';
import { CHECK_EVERY_S, count, dayAt, type Ctx } from './clock';
import { driverRoundF, machineShares, pieceCount, pieceSpec, routeM, vpk } from './content';
import { roundMoney } from './money';
import { crucibleCharged } from './crucible';
import { dealOffer, gateReached } from './deal';
import { defOf } from './machines';
import { openPartners } from './partners';
import { pointOf } from './positions';
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

/** A thing's remaining value at usual prices (its pieces still on it at vpk, and its shell), § (stage 2 2.3.3). */
function thingValue(c: Ctx['c'], obj: string, cut: number, shell: boolean): number {
  const o = c.objects[obj];
  if (!o) return 0;
  if (shell) return 0; // a stripped shell's grams are already in its bay (weighed in whole where it stands)
  let v = o.shell ? (o.shell.g / 1000) * vpk(c, o.shell.grade) : 0;
  const n = pieceCount(c, obj);
  for (let k = Math.max(0, cut); k < n; k++) {
    const sp = pieceSpec(c, obj, k);
    if (sp) v += (sp.g / 1000) * vpk(c, sp.grade);
  }
  return v;
}

/**
 * The value at usual prices (p̄, the converter at its assay; content.ts vpk) of every unsold stock in the
 * yard, § (stage 2 2.3.3, ruling I5: the gate's "value of unsold stock"): the bays, the trays, the hoppers
 * and the piece in work, the pot, the merchant's flatbed, pieces on the ground and carried, things in the
 * yard at the value of the pieces still on them, the skip on the truck. Skips standing at a partner are
 * not the yard's (unpaid). A pure function of the state.
 */
export function stockValue(c: Ctx['c'], s: Ctx['s']): number {
  let v = 0;
  for (const [grade, b] of Object.entries(s.bays)) v += (b.g / 1000) * vpk(c, grade);
  const pv = (p: { grade: string; g: number }) => (p.g / 1000) * vpk(c, p.grade);
  for (const id of ['hand_stripper', 'stripper', 'bench', 'crucible'] as const) {
    const m = s.machines[id];
    for (const [grade, g] of Object.entries(m.tray_g)) v += (g / 1000) * vpk(c, grade);
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
    if (cr.chargeBy) for (const [grade, g] of Object.entries(cr.chargeBy)) v += (g / 1000) * vpk(c, grade);
    else v += (cr.charge_g / 1000) * vpk(c, ins[0]);
    v += (cr.heel_g / 1000) * vpk(c, out);
  }
  for (const l of s.merchant.lot) v += (l.g / 1000) * vpk(c, l.grade);
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

/** 2.14 step 6: partners opening, the rung (ladder.ts rungReached), rivals passed (rivals.ts passedNow), the deal offer, goals (goals.ts checkGoals). */
export function checks(x: Ctx, t: number, force = true): void {
  if (!force && !x.dirty) return;
  if (!force && !x.live && t - x.checkedAt < CHECK_EVERY_S) return;
  x.dirty = false;
  x.checkedAt = t;
  const s = x.s;
  openPartners(x, t);
  const rung = rungReached(x.cfg, view(x));
  while (s.ladder.rung < rung) {
    s.ladder.rung += 1;
    x.ev.push({ type: 'rung', n: s.ladder.rung });
  }
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

void count;
void crucibleCharged;
void dayAt;
