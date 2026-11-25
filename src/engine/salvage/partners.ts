/**
 * Partners and their skips (yard-stage1.md 2.7, 2.12, E3, E13b, E20, E26): a partner opens with its
 * `opens` purchase (the trial load full then); it has as many skips in rotation as its level, each full
 * `fill_s` after it was set down, its contents fixed when it fills and printed on its label with its
 * price: roundMoney(k × the as-found value at the day's prices). Owner: rules-sim.
 */
import { dayAt, type Ctx } from './clock';
import { lotPrice, specsOf } from './content';
import { roundMoney } from './money';
import type { SkipState } from './types';

/** The as-found value of whole things at day D's prices (E3): Σ pieces kg × price × the grade's asFound share. */
export function asFoundValue(x: Ctx, contents: Record<string, number>, day: number): number {
  let v = 0;
  for (const [obj, n] of Object.entries(contents)) {
    for (const [grade, g, k] of specsOf(x.c, obj)) v += n * k * (g / 1000) * lotPrice(x.c, grade, day) * (x.c.grades[grade]?.asFound ?? 1);
  }
  return v;
}

export function contentsMass_g(x: Ctx, contents: Record<string, number>): number {
  let g = 0;
  for (const [obj, n] of Object.entries(contents)) g += (x.c.objects[obj]?.gross_g ?? 0) * n;
  return g;
}

/** A skip of a partner fills now (2.12): its contents and price fixed, printed on its label. */
export function fillSkip(x: Ctx, partner: string, sk: SkipState, t: number): void {
  const p = x.c.partners[partner];
  const contents = { ...p.skip };
  const day = dayAt(x, t);
  sk.phase = 'full';
  sk.fullAt = t;
  sk.contents = contents;
  sk.mass_g = contentsMass_g(x, contents);
  sk.price = roundMoney(p.k * asFoundValue(x, contents, day));
  sk.priceDay = day;
  sk.trial = false;
  sk.n += 1;
  x.ev.push({ type: 'skipFull', partner, slot: sk.slot });
}

/** An empty skip goes down at slot `slot` at t: full fill_s later. */
export function setSkipDown(x: Ctx, partner: string, slot: number, t: number): void {
  const ps = x.s.partners[partner];
  let sk = ps.skips.find((q) => q.slot === slot);
  if (!sk) {
    sk = { slot, phase: 'filling', setAt: t, fullAt: t + x.c.partners[partner].fill_s, contents: {}, mass_g: 0, price: 0, priceDay: 0, trial: false, n: 0 };
    ps.skips.push(sk);
    ps.skips.sort((a, b) => a.slot - b.slot);
    return;
  }
  sk.phase = 'filling';
  sk.setAt = t;
  sk.fullAt = t + x.c.partners[partner].fill_s;
  sk.contents = {};
  sk.mass_g = 0;
  sk.price = 0;
  sk.trial = false;
}

/** The skip a truck takes at a partner: the one full longest (2.7, the lead's ruling). */
export function fullestSkip(x: Ctx, partner: string): SkipState | null {
  const ps = x.s.partners[partner];
  if (!ps?.open) return null;
  return ps.skips.filter((q) => q.phase === 'full').sort((a, b) => a.fullAt - b.fullAt || a.slot - b.slot)[0] ?? null;
}

/** Partners open with their purchase (checks, 2.14 step 6). */
export function openPartners(x: Ctx, t: number): void {
  for (const [id, def] of Object.entries(x.c.partners)) {
    const ps = x.s.partners[id];
    if (!ps || ps.open) continue;
    if (!x.s.owned.includes(def.opens)) continue;
    ps.open = true;
    ps.level = Math.max(1, ps.level);
    const trial = ps.skips.find((q) => q.trial);
    if (trial) {
      trial.fullAt = t;
      x.ev.push({ type: 'skipFull', partner: id, slot: trial.slot });
    }
    for (let slot = 1; slot < ps.level; slot++) if (!ps.skips.some((q) => q.slot === slot)) setSkipDown(x, id, slot, t);
  }
}
