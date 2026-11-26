/**
 * Partners and their skips (yard-stage1.md 2.7, 2.12, E3, E13b, E20, E26): a partner opens with its
 * `opens` purchase (the trial load full then); it has as many skips in rotation as its level, each full
 * `fill_s` after it was set down, its contents fixed when it fills and printed on its label with its
 * price: roundMoney(k × the as-found value at the day's prices). Owner: rules-sim.
 */
import { dayAt, type Ctx } from './clock';
import { convAssay, lotPrice, specsOf } from './content';
import { roundMoney } from './money';
import type { SkipState } from './types';
import type { SalvageContent } from '../../config/schema.salvage';

/** The as-found value of whole things at day D's prices (E3): Σ pieces kg × price × the grade's asFound share. */
export function asFoundValue(x: Ctx, contents: Record<string, number>, day: number): number {
  let v = 0;
  for (const [obj, n] of Object.entries(contents)) {
    // Stage 2 (content `objects.<id>.asFound`, the undrained car): a whole-thing share of its prepared value (pieces and
    // shell) at the day's prices, as the content check values it. No first-yard object has one.
    const whole = x.c.objects[obj]?.asFound;
    if (whole !== undefined) {
      let p = 0;
      for (const [grade, g, k] of specsOf(x.c, obj)) p += k * (g / 1000) * lotPrice(x.c, grade, day);
      const sh = x.c.objects[obj]?.shell;
      if (sh) p += (sh.g / 1000) * lotPrice(x.c, sh.grade, day);
      v += n * whole * p;
      continue;
    }
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
  const contents = x.s.counts?.bathSet !== undefined ? grownContents(x, partner) : { ...p.skip };
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

/**
 * Stage 2 (2.9, 2.12; rules-works wave 2): what a skip of this partner carries once the works are open. A load
 * of its own body (`grows` with body 'flatrack' or 'batteryBox' whose plate is owned) takes its turn in the
 * partner's rotation (counts['fills:<partner>'] modulo 1 + the bodies owned), its contents only (a car on the
 * flatrack only while no other car waits anywhere: the car pad holds one); otherwise the skip's own contents,
 * plus every `grows` of body 'skip' whose plate is owned, plus the partner's reusable batch (`reuseBatch`), which
 * the label prints and prices as the rest. Below the works' opening fillSkip reads the skip as before.
 */
export function grownContents(x: Ctx, partner: string): Record<string, number> {
  const p = x.c.partners[partner];
  const owned = (id: string): boolean => !!x.s.works?.[id];
  const bodies = (p.grows ?? []).filter((gr) => gr.body !== 'skip' && owned(gr.needs));
  if (bodies.length) {
    const key = `fills:${partner}`;
    const k = x.s.counts![key] ?? 0;
    x.s.counts![key] = k + 1;
    const pick = k % (bodies.length + 1);
    if (pick > 0) {
      const gr = bodies[pick - 1];
      if (gr.body !== 'flatrack' || !carWaiting(x)) return { ...gr.contents };
    }
  }
  const contents: Record<string, number> = { ...p.skip };
  for (const gr of p.grows ?? []) if (gr.body === 'skip' && owned(gr.needs)) for (const [o, n] of Object.entries(gr.contents)) contents[o] = (contents[o] ?? 0) + n;
  if (p.reuseBatch && x.c.reuse && x.c.objects[p.reuseBatch.obj]) contents[p.reuseBatch.obj] = (contents[p.reuseBatch.obj] ?? 0) + p.reuseBatch.n;
  return contents;
}

/** A car (an object that arrives on the flatrack) waits anywhere: on the pad or an apron, in a full skip, on the truck. */
function carWaiting(x: Ctx): boolean {
  const pad = (obj: string): boolean => x.c.objects[obj]?.arrives === 'pad';
  for (const th of x.s.things) if (pad(th.obj)) return true;
  for (const ps of Object.values(x.s.partners)) for (const q of ps.skips) if (q.phase === 'full' && Object.keys(q.contents).some(pad)) return true;
  const tr = x.s.truck.skip;
  if (tr && Object.keys(tr.contents).some(pad)) return true;
  for (const p of x.s.forklift?.load ?? []) if (p.whole && pad(p.whole)) return true;
  return false;
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

// ---------------------------------------------------------------------------------------- the driver's ranking (RULING2.md 16)

/** A grade's price a kilogram at usual prices (p̄; a whole unit of the pm family at the converter's unstepped assay): rate.ts usualP's rule. */
function usualKg(c: SalvageContent, grade: string): number {
  const gr = c.grades[grade];
  if (!gr) return 0;
  if (gr.family === 'pm') return convAssay(c, 1) / Math.max(1e-9, c.wholeUnits_kg[grade] ?? 1);
  return gr.pbar;
}

const LOAD_NET = new WeakMap<SalvageContent, Map<string, number>>();

/**
 * RULING2.md 16.1 (a): a partner's RATED NET A LOAD, §, from the content alone: its skip's contents at usual prices
 * as they weigh in (every piece at its grade, and a thing's shell) less the load's price at usual prices
 * (roundMoney(k × the as-found value at usual prices), as fillSkip prices it on a day of usual prices). Memoised per
 * content object; a partner not in the content nets -Infinity. The driver (truck.ts driverDepart) and rated
 * income's replay (rate.ts rateQueue) rank partners by it; a new partner needs no code.
 */
export function ratedLoadNet(c: SalvageContent, partner: string): number {
  let byId = LOAD_NET.get(c);
  if (!byId) LOAD_NET.set(c, (byId = new Map()));
  let v = byId.get(partner);
  if (v === undefined) {
    const p = c.partners[partner];
    if (!p) v = -Infinity;
    else {
      let worth = 0;
      let asFound = 0;
      for (const [obj, n] of Object.entries(p.skip)) {
        const o = c.objects[obj];
        if (!o) continue;
        for (const [grade, g, k] of specsOf(c, obj)) {
          worth += n * k * (g / 1000) * usualKg(c, grade);
          asFound += n * k * (g / 1000) * usualKg(c, grade) * (c.grades[grade]?.asFound ?? 1);
        }
        if (o.shell) worth += n * (o.shell.g / 1000) * usualKg(c, o.shell.grade);
      }
      v = roundMoney(worth - roundMoney(p.k * asFound));
    }
    byId.set(partner, v);
  }
  return v;
}

/** The first rung on which the hired driver ranks partners by ratedLoadNet (content `truck.pickFromRung`; absent: never, the first yard's rule). */
export function pickFromRung(c: SalvageContent): number {
  const r = (c.truck as { pickFromRung?: unknown }).pickFromRung;
  return typeof r === 'number' && Number.isFinite(r) ? r : Infinity;
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
