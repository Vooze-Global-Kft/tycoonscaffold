/**
 * The rate engine's measures and the instant's checks (yard-stage1.md 2.11, 2.12, 2.14 step 6): rated
 * capacity R (the throughput of the crew and machines with full feed and no boss), purchases arriving,
 * rungs, rivals passed, the deal offer, partners opening, goals by id. Owner: rules-sim.
 */
import { checkGoals } from './goals';
import { rungReached } from './ladder';
import { passedNow } from './rivals';
import { count, dayAt, type Ctx } from './clock';
import { legM, toolP } from './content';
import { crucibleCharged } from './crucible';
import { dealOffer, gateReached } from './deal';
import { defOf } from './machines';
import { openPartners } from './partners';
import { pointOf } from './positions';
import type { MachineId, SalvageConfig, SalvageGame } from './types';

/** R, t/h (2.12): machines at full feed plus the crew's carrying and cutting, from the same rates. */
export function ratedOf(c: Ctx['c'], s: Ctx['s']): number {
  let kgS = 0;
  for (const id of ['stripper', 'bench'] as MachineId[]) {
    const m = s.machines[id];
    if (!m.owned) continue;
    const d = (c.machines as unknown as Record<string, { rate: number; lev?: number }>)[id];
    kgS += d.rate * (1 + (d.lev ?? 0) * Math.max(0, m.level - 1));
  }
  const cr = s.machines.crucible;
  if (cr.owned) {
    const d = c.machines.crucible;
    kgS += 1 / d.s_per_kg;
  }
  const scale = pointOf(c, 'scale');
  const drop = pointOf(c, 'dropoff');
  for (const m of s.crew) {
    if (m.role === 'hand') {
      const h = c.crew.hand;
      const v = h.v * (1 + h.lev * Math.max(0, m.level - 1));
      const trip = (2 * legM(c, scale, drop)) / v + 2 * h.handle_s;
      kgS += h.load / Math.max(1e-6, trip);
    } else if (m.role === 'cutter') {
      const k = c.crew.cutter;
      const P = toolP(c, s.tier);
      kgS += Math.min(k.cap * P, P * k.share * (1 + k.lev * Math.max(0, m.level - 1)));
    }
  }
  return (kgS * 3600) / 1000;
}

export function ratedCapacity(cfg: SalvageConfig, g: SalvageGame): number {
  return ratedOf(cfg.salvage, g.salvage);
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
export function checks(x: Ctx, t: number): void {
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
