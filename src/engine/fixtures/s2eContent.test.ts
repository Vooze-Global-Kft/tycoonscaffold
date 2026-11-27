/**
 * THE STAGE'S CONTENT AS BUILT AGAIN (s2e-content, 27 November; yard-stage2-economy.md packages 2 and 3; RULING2.md 27).
 * Owner: the content engineer. What these tests hold, without pinning a tuned number (every number is read from the
 * content it is checked on):
 *  - the frozen fixture (./salvage-report9.json, ruling 27.7) parses at stage 2 and still sells what REPORT9 measured;
 *  - the shipped stage 2 sells the hook-lift, the plasma cutter, the analyser, the shredder and the two halls, and nothing
 *    else: every other plate and shop item is gated past the ladder (defined, dark); financeable marks only what earns;
 *    no plate levels, no Yard sale levels, the 2- and 5-hour packs only; the stage's own rung 5 is read only from the
 *    works' opening (the merged view) and the first yard's ladder keeps its own; the new keys are stripped at release.stage 1;
 *  - with no breaker and no depollution bay sold, no partner's load brings a battery or a car (the garage's condition is
 *    never met: ruling 27.3 D2);
 *  - the three heavy oversize pieces (2.10): real masses inside their kinds' ranges, under the low-loader's; the tier-3
 *    kinds come before the plasma cutter; a tick equals a jump across their arrivals (on the works' frozen test content
 *    with the shipped kinds laid over it).
 */
import { describe, expect, it } from 'vitest';
import { SalvageSchema, withWorksLayer, type SalvageContent } from '../../config/schema.salvage';
import { report9Config, report9Frozen } from './report9';
import { shipped2Config, shipped2Raw } from './shipped2';
import { r3Works, worksCfg } from './salvage2works';
import { begin, finish } from '../salvage/clock';
import { contentAt } from '../salvage/layer';
import { lotMassRange } from '../salvage/lots';
import { gateRung, rungsOf } from '../salvage/ladder';
import { advance, advanceSalvage, jump } from '../salvage/tick';
import type { SalvageConfig, SalvageGame, SalvageState } from '../salvage/types';

const parse = (x: unknown) => SalvageSchema.parse(x);
const S2 = shipped2Config(parse).salvage as SalvageContent;
const R9 = report9Config(parse).salvage as SalvageContent;
const top = (c: SalvageContent) => c.ladder.topRung ?? 3;
const sold = (c: SalvageContent) => ({
  plates: Object.entries(c.works?.plates ?? {}).filter(([, p]) => gateRung(p.gate) <= top(c)).map(([k]) => k).sort(),
  items: (c.worksLayer?.shop ?? []).filter((i) => i.kind !== 'works' && gateRung(i.gate) <= top(c)).map((i) => i.key).sort(),
});

describe('ruling 27.7: the stage as REPORT9 measured it, frozen', () => {
  it('parses at release.stage 2 and sells every plate, vehicle and tool REPORT9 measured, with its old goal list and four packs', () => {
    expect((report9Frozen().salvage as { release: { stage: number } }).release.stage).toBe(1);
    expect(R9.release?.stage).toBe(2);
    const s = sold(R9);
    expect(s.plates).toEqual(Object.keys(R9.works!.plates).sort());
    expect(s.plates).toEqual(expect.arrayContaining(['crane', 'baler', 'shear', 'granulator', 'depollution', 'eddy', 'sorter', 'breaker', 'smelter']));
    expect(s.items).toEqual(['forklift', 'pallet', 'plasma', 'truckBridge']);
    expect(R9.works!.maxLevel).toBeGreaterThan(1);
    expect((R9.stage2 ?? []).map((d) => d.id)).toEqual(expect.arrayContaining(['buyBaler', 'startBaler', 'buyCrane', 'buyBreaker', 'pourLead']));
    expect((R9.iap?.products ?? []).filter((p) => p.kind === 'hoursOfIncome').map((p) => p.value)).toEqual([2, 5, 10, 20]);
    const raw = report9Config(parse) as unknown as { monetization: { iap: { products: unknown[] } } };
    expect(raw.monetization.iap.products.length).toBe((R9.iap?.products ?? []).length);
  });
});

describe('2.6.4, 2.7 to 2.9 (ruling 27.2 b, 27.3 D1, D2): what the shipped stage 2 sells', () => {
  it('the hook-lift, the plasma cutter, the analyser, the shredder and the two halls; everything else is gated past the ladder', () => {
    expect(sold(S2)).toEqual({ plates: ['analyser', 'induction', 'rotary', 'shredder'], items: ['plasma', 'truckBridge'] });
    const ladderTop = Math.max(...rungsOf(S2).map((r) => r.n));
    for (const [k, p] of Object.entries(S2.works!.plates)) if (!sold(S2).plates.includes(k)) expect(gateRung(p.gate), k).toBeGreaterThan(ladderTop);
    for (const i of S2.worksLayer!.shop) if (i.kind !== 'works' && !sold(S2).items.includes(i.key)) expect(gateRung(i.gate), i.key).toBeGreaterThan(ladderTop);
  });

  it('financeable marks the hook-lift and the machines that earn, never a tool or a dark plate (2.14.2)', () => {
    const shop = new Map(S2.worksLayer!.shop.map((i) => [i.key, i]));
    expect(shop.get('truckBridge')!.financeable).toBe(true);
    expect(shop.get('plasma')!.financeable).not.toBe(true);
    for (const k of ['analyser', 'shredder', 'induction', 'rotary']) expect(S2.works!.plates[k].financeable, k).toBe(true);
    for (const [k, p] of Object.entries(S2.works!.plates)) if (!sold(S2).plates.includes(k)) expect(p.financeable, k).not.toBe(true);
  });

  it('no plate levels, no Yard sale levels, the 2- and 5-hour packs only; the bank lends up to min(maxF_h, maxF_tau x tau_r) hours', () => {
    expect(S2.works!.maxLevel).toBe(1);
    expect(S2.reuse!.levels).toBe(0);
    expect((S2.iap!.products ?? []).filter((p) => p.kind === 'hoursOfIncome').map((p) => p.value)).toEqual([2, 5]);
    const prods = (shipped2Raw() as unknown as { monetization: { iap: { products: { id: string }[] } } }).monetization.iap.products.map((p) => p.id);
    expect(prods).toEqual((S2.iap!.products ?? []).map((p) => p.id));
    expect(S2.bank!.maxF_h).toBeGreaterThan(R9.bank!.maxF_h);
    expect(S2.rate!.kappa.slice(2).every((k) => k !== null && k >= 0.85 && k <= 1.15)).toBe(true);
  });

  it('the stage\'s own rungs (works.rungs) are read only from the works\' opening; the first yard\'s ladder keeps its own', () => {
    const own = S2.works!.rungs!;
    const merged = withWorksLayer(S2);
    for (const r of own) {
      expect(rungsOf(merged).find((x) => x.n === r.n)).toEqual(r);
    }
    const r5 = own.find((r) => r.n === 5)!;
    expect(rungsOf(S2).find((x) => x.n === 5)!.range).not.toBe(r5.range);
    const closed = { counts: {} } as unknown as SalvageState;
    const open = { counts: { bathSet: 1 } } as unknown as SalvageState;
    expect(contentAt(S2, closed)).toBe(S2);
    expect(rungsOf(contentAt(S2, open)).find((x) => x.n === 5)!.range).toBe(r5.range);
  });

  it('at release.stage 1 the new keys are stripped: the first yard parses what it parsed', () => {
    const raw = structuredClone((shipped2Raw() as unknown as { salvage: Record<string, unknown> }).salvage);
    const c1 = SalvageSchema.parse({ ...raw, release: { stage: 1 } }) as unknown as Record<string, Record<string, unknown> | undefined>;
    for (const k of ['works', 'rate', 'tau_h', 'lots', 'bank', 'iap', 'reuse']) expect(c1[k], k).toBeUndefined();
    expect(c1.group && 'aheadWorks' in c1.group).toBe(false);
    expect(c1.levels && ('minShareI' in c1.levels || 'book' in c1.levels)).toBe(false);
    const c2 = SalvageSchema.parse({ ...raw, release: { stage: 2 } }) as unknown as Record<string, Record<string, unknown>>;
    expect(c2.group.aheadWorks).toBe(false);
    expect(c2.levels.minShareI).toBeGreaterThan(0);
  });

  it('refuses a kappa outside 0.85 to 1.15 (ruling 27.4)', () => {
    const raw = structuredClone((shipped2Raw() as unknown as { salvage: Record<string, unknown> }).salvage);
    expect(SalvageSchema.safeParse({ ...raw, rate: { kappa: [null, null, 1.2, 1, 1] } }).success).toBe(false);
    expect(SalvageSchema.safeParse({ ...raw, rate: { kappa: [null, null, 0.9, 1, 1.1] } }).success).toBe(true);
  });

  it('D2: with no breaker and no depollution bay sold, no partner brings a battery or a car (the garage\'s condition is never met)', () => {
    const m = withWorksLayer(S2);
    const sell = new Set(sold(S2).plates);
    for (const [pid, p] of Object.entries(m.partners)) {
      const loads = [p.trial, p.skip, ...(p.grows ?? []).filter((x) => sell.has(x.needs)).map((x) => x.contents)];
      for (const ld of loads) for (const o of Object.keys(ld)) expect(['pbb', 'elv'], `${pid} brings ${o}`).not.toContain(o);
      for (const x of p.grows ?? []) if (Object.keys(x.contents).some((o) => o === 'pbb' || o === 'elv')) expect(sell.has(x.needs), `${pid} grows on ${x.needs}`).toBe(false);
    }
    // ... and every lot kind's line is a machine or plate the stage sells (or none): nothing waits for a machine not sold
    const lines = new Set([...sell, ...Object.keys(S2.machines)]);
    for (const k of S2.lots!.kinds) for (const l of k.line) expect(lines.has(l), `${k.obj} waits for ${l}`).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------- 2.10: the heavy pieces

const HEAVY = ['boilerDrum', 'pressFrame', 'transformerCore'];
const shippedKinds = () => S2.lots!.kinds.filter((k) => HEAVY.includes(k.obj));

/** The works' frozen test content with the shipped heavy kinds (and their objects) in place of its own lot kinds. */
function heavyCfg(): SalvageConfig {
  const base = worksCfg();
  const L = base.salvage.worksLayer!;
  const objects = { ...L.objects };
  for (const o of HEAVY) objects[o] = S2.worksLayer!.objects[o];
  const salvage = { ...base.salvage, worksLayer: { ...L, objects }, lots: { ...base.salvage.lots!, kinds: shippedKinds() } } as SalvageContent;
  return { ...base, salvage };
}
function quiet(g: SalvageGame): SalvageGame {
  const s = structuredClone(g.salvage) as SalvageState;
  s.crew = [];
  s.dropoff.nextAt = -1;
  s.truck.trip = null;
  s.truck.by = null;
  s.truck.earmark = null;
  for (const p of Object.values(s.partners)) p.open = false;
  s.presenceAt = -1;
  s.reuse = { ...s.reuse, nextAt: null, vanAt: null };
  return { ...g, salvage: s };
}
const lotsOf = (s: SalvageState) => s.things.filter((t) => t.at.at === 'lot');

describe('2.10 (ruling 27.3 D12): the three heavy oversize pieces', () => {
  it('real masses: each kind\'s range holds its object\'s own mass, is at most the low-loader\'s, and the boiler drum is certified empty', () => {
    const lorry = S2.lots!.lorry_kg!;
    expect(shippedKinds().map((k) => k.obj).sort()).toEqual([...HEAVY].sort());
    for (const k of shippedKinds()) {
      const o = S2.worksLayer!.objects[k.obj];
      const [lo, hi] = lotMassRange({ c: S2 }, k);
      expect(lo, k.obj).toBeLessThanOrEqual(o.gross_g);
      expect(hi, k.obj).toBeGreaterThanOrEqual(o.gross_g);
      expect(hi, k.obj).toBeLessThanOrEqual(lorry * 1000);
      expect(k.line, k.obj).toEqual([]);
    }
    expect(S2.worksLayer!.objects.boilerDrum.certifiedEmpty).toBe(true);
    expect(S2.worksLayer!.objects.boilerDrum.tier).toBe(3);
    expect(S2.worksLayer!.objects.pressFrame.tier).toBe(3);
    expect(S2.worksLayer!.objects.transformerCore.tier).toBe(4);
  });

  it('before the plasma cutter (the torch\'s tier 3) only the tier-3 kinds come, each inside its range; with the plasma the core may come too', () => {
    const cfg = heavyCfg();
    const period = cfg.salvage.lots!.period_s;
    for (const seed of [11, 23, 37]) {
      const c2 = { ...cfg, salvage: { ...cfg.salvage, worldSeed: seed } } as SalvageConfig;
      for (const tier of [3, 4]) {
        const g0 = quiet(r3Works());
        const g = { ...g0, salvage: { ...g0.salvage, tier } };
        const x = begin(c2, g, [], false);
        advance(x, g.salvage.lots.nextAt! + 3 * period + 0.001);
        const h = finish(g, x);
        const lots = lotsOf(h.salvage);
        expect(lots.length, `seed ${seed} tier ${tier}`).toBeGreaterThan(0);
        for (const l of lots) {
          const k = shippedKinds().find((q) => q.obj === l.obj)!;
          const [lo, hi] = lotMassRange({ c: c2.salvage }, k);
          expect(l.g!, `${seed} ${l.obj}`).toBeGreaterThanOrEqual(lo);
          expect(l.g!, `${seed} ${l.obj}`).toBeLessThanOrEqual(hi);
          if (tier === 3) expect(['boilerDrum', 'pressFrame'], `${seed}`).toContain(l.obj);
        }
      }
    }
  });

  it('a tick equals a jump across their arrivals', () => {
    const cfg = heavyCfg();
    const base = quiet(r3Works());
    const g = { ...base, salvage: { ...base.salvage, tier: 3 } };
    const T = g.salvage.lots.nextAt! + 2 * cfg.salvage.lots!.period_s + 1;
    let a = g;
    let ms = a.salvage.clock.highMs;
    const steps = Math.ceil((T - a.salvage.t) / 5);
    for (let i = 0; i < steps; i++) {
      ms += 5000;
      a = advanceSalvage(cfg, a, 5, ms);
    }
    const b = jump(cfg, g, a.salvage.t);
    const whole = (q: SalvageGame) => {
      const s = JSON.parse(JSON.stringify(q.salvage)) as Record<string, unknown>;
      for (const k of ['clock', 'epoch', 'away']) delete s[k];
      return { cash: Math.round(q.cash * 100), s };
    };
    expect(whole(b)).toEqual(whole(a));
    expect(lotsOf(a.salvage).length).toBe(3);
  }, 300_000);
});
