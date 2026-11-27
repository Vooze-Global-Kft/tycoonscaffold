/**
 * s2f-copper (27 November; RULING2.md 27.5 and 28.7 c; notes/s2f-copper.md): THE COPPER REFINING HALL. A tilting furnace
 * that fire-refines No.2 copper, copper cylinders and thin cable (chopped to granules inside it: the granulator alone stays
 * dark) into fire-refined copper ingot under a bag-house filter; bare bright is not charged. A hall is data: works.ts and
 * halls.ts run it as they run the rotary and the induction halls, and rate.ts's plates' terms read it as they read theirs.
 * It ships only by its gate (salvage.content.ts COPPER_GATE, ruling 27.2 b), so everything here holds with it sold AND
 * reads the dark form where it differs. Read from the SHIPPED content for its shape and its promises (mass kept, the
 * margin's floor, the price grid's order, one switch), never for a tuned number; the rules on the bots' state seed1-s6
 * (the normal hand at rung 4 with the rotary hall poured: the hall's planned moment; s2e-fix1's fixture).
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, withWorksLayer, type SalvageContent } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import { shipped2Config } from '../fixtures/shipped2';
import { TEXT } from '../../ui/salvage/strings';
import * as R from '../salvage';
import { seededCfg } from './bot';
import { checkGoals, goalBuyNow } from './goals';
import { boughtState, buyCheck, gateRung, topRungOf } from './ladder';
import { contentAt } from './layer';
import { ratedIncome, replayTerms } from './rate';
import { jump } from './tick';
import { TEXT_KEYS } from './types';
import type { SalvageConfig, SalvageGame } from './types';

const S2 = withWorksLayer(shipped2Config((x) => SalvageSchema.parse(x)).salvage as SalvageContent);
const HALL = S2.works!.plates.copper;
const SOLD = gateRung(HALL.gate) <= topRungOf(S2);
const pbar = (g: string) => S2.grades[g]?.pbar ?? 0;
const reagentCost = (rs: readonly (readonly [string, number, number])[]) => rs.reduce((a, r) => a + r[1] * r[2], 0);

let CFG: SalvageConfig | null = null;
const shippedCfg = () => (CFG ??= seededCfg(shipped2Config((x) => SalvageSchema.parse(x)), 1));
const s6 = (): SalvageGame => JSON.parse(fs.readFileSync(new URL('./__fixtures__/s2e-fix1/seed1-s6.json', import.meta.url), 'utf8')).g as SalvageGame;
const cfgAt = (cfg: SalvageConfig, g: SalvageGame): SalvageConfig => ({ ...cfg, salvage: contentAt(cfg.salvage, g.salvage) });

describe('the hall in the content: real physics, real money (2.8; 5.2 (1), (11), (12))', () => {
  it('a batch plate of the melt row with a recipe for No.2 copper, cylinders and thin cable; bare bright is never charged', () => {
    expect(HALL.kind).toBe('batch');
    expect(HALL.row).toBe('melt');
    expect(HALL.feedBy).toBe('bays');
    const ins = Object.values(HALL.recipes ?? {}).flatMap((r) => r.in).sort();
    expect(ins).toEqual(['cyl', 'no2', 'tcab']);
    for (const p of Object.values(S2.works!.plates)) for (const r of Object.values(p.recipes ?? {})) expect(r.in, 'bare bright is charged nowhere').not.toContain('bb');
    // the granulator alone stays dark: its step is the hall's (RULING2.md 28.7 c)
    expect(gateRung(S2.works!.plates.granulator.gate)).toBeGreaterThan(topRungOf(S2));
    // the hall makes one sellable grade: the ingot, a product of the works with a bay
    for (const r of Object.values(HALL.recipes ?? {})) expect(r.out.map(([g]) => g)).toEqual(['cui']);
    expect(S2.grades.cui.kind).toBe('product');
    expect(S2.grades.cui.material).toBe('copper');
    expect(S2.grades.cui.bay?.place).toBeTruthy();
  });

  it('mass is kept in every recipe: out + waste = 1 + reagents (5.2 (1))', () => {
    for (const [rid, r] of Object.entries(HALL.recipes ?? {})) {
      const sum = r.out.reduce((a, [, x]) => a + x, 0) + r.waste.reduce((a, [, x]) => a + x, 0);
      expect(sum, rid).toBeCloseTo(1 + r.reagents.reduce((a, q) => a + q[1], 0), 9);
    }
  });

  it('every recipe nets at least +5 % on its input after the flux, and an ingot is never worth less than what was charged for it plus the flux', () => {
    for (const [rid, r] of Object.entries(HALL.recipes ?? {})) {
      const out = r.out.reduce((a, [g, x]) => a + x * pbar(g), 0);
      for (const gin of r.in) {
        expect(out - reagentCost(r.reagents), `${rid} on ${gin}`).toBeGreaterThan(pbar(gin));
        expect((out - reagentCost(r.reagents)) / pbar(gin), `${rid} on ${gin}`).toBeGreaterThanOrEqual(1.05);
      }
    }
  });

  it("the price grid a trader would read: No.2 at about nine tenths of the refined ingot, bare bright between them, the ingot over every copper grade", () => {
    const cui = pbar('cui');
    expect(pbar('no2') / cui).toBeGreaterThan(0.85);
    expect(pbar('no2') / cui).toBeLessThan(0.93);
    expect(pbar('bb')).toBeGreaterThan(pbar('no2'));
    expect(pbar('bb')).toBeLessThan(cui);
    for (const [g, d] of Object.entries(S2.grades)) if (d.material === 'copper' && g !== 'cui') expect(pbar(g), g).toBeLessThan(cui);
    // bare bright through the hall would not clear the +5 % floor: nobody melts it (RULING2.md 27.5)
    const cu = HALL.recipes!.copper;
    expect((cu.out[0][1] * cui - reagentCost(cu.reagents)) / pbar('bb')).toBeLessThan(1.05);
  });

  it('its words by key: the hall\'s name, its plot, its recipes, its goals', () => {
    const keys = new Set<string>(Object.values(TEXT_KEYS).flat() as string[]);
    const strings = TEXT as unknown as Record<string, string>;
    for (const k of ['title.works.copper', 'place.copperHall', 'recipe.copper', 'recipe.cylinders', 'recipe.cable', 'goal.buyCopper', 'goal.pourCopper']) {
      expect(keys.has(k), k).toBe(true);
      expect(typeof strings[k], k).toBe('string');
    }
  });
});

describe('ONE SWITCH: its gate (RULING2.md 27.2 b: it ships only if its measured gain passes the entry rule)', () => {
  const C = S2 as unknown as { stage2?: { id: string; buy: string | null; done: string }[] };
  const ids = (C.stage2 ?? []).map((d) => d.id);
  it(SOLD ? 'sold: financeable, drawn with its filter and apron, its two goals after the rotary hall\'s' : 'dark: not financeable, not drawn, no goal names it', () => {
    const places = S2.map.works?.places ?? {};
    if (SOLD) {
      expect(HALL.financeable).toBe(true);
      expect(places.copper && places['copper.filter'] && places['copper.apron']).toBeTruthy();
      expect(ids.indexOf('buyCopper')).toBe(ids.indexOf('pourRotary') + 1);
      expect(ids.indexOf('pourCopper')).toBe(ids.indexOf('buyCopper') + 1);
    } else {
      expect(HALL.financeable).not.toBe(true);
      expect(places.copper).toBeUndefined();
      expect(ids).not.toContain('buyCopper');
      expect(ids).not.toContain('pourCopper');
    }
  });

  it('the first yard never reads it: game.json keeps release.stage 1 and an empty shared product list', () => {
    const raw = gameJson as unknown as { salvage: { release?: { stage?: number } }; monetization?: { iap?: { products?: unknown[] } } };
    expect(raw.salvage.release?.stage).toBe(1);
    expect(raw.monetization?.iap?.products ?? []).toHaveLength(0);
  });
});

describe('the hall at its planned moment (the bots\' state seed1-s6: rung 4, the rotary hall poured)', () => {
  it.runIf(SOLD)('the goal card names it next, and its card sells it at its content price (shown = applied)', () => {
    const cfg = shippedCfg();
    const g = s6();
    expect(g.salvage.goals.done).toContain('pourRotary');
    // the goal's purchase is the copper hall (goals.ts goalBuyNow: the first open goal with an unmet buy)
    expect(goalBuyNow(cfg, g)).toBe('copper');
    const ck = buyCheck(cfgAt(cfg, g), g, 'copper');
    expect(ck.price).toBe(HALL.price);
    expect(ck.refusal).toBeNull();
    const after = R.buy(cfg, { ...g, cash: 1e9 } as SalvageGame, 'copper', ck.price!, g.salvage.t);
    expect(1e9 - after.cash).toBe(HALL.price);
    // done once it is set down (plate:copper)
    const set = checkGoals(cfg, jump(cfg, after, after.salvage.t + HALL.deliver_s + 1));
    expect(set.goals.done).toContain('buyCopper');
  });

  it.runIf(SOLD)('RATED INCOME reads its term as it reads the other halls\' (the plates\' terms: its capacity on the copper the replay sells, at each recipe\'s margin), and never falls with it', () => {
    const cfg = shippedCfg();
    const g = s6();
    const c = contentAt(cfg.salvage, g.salvage);
    const without = replayTerms(c, g.salvage);
    const withG = boughtState(c, g, 'copper');
    const withT = replayTerms(c, withG.salvage);
    // the term by hand: the hall's capacity an hour (batch.kg / batch.s) shared over its recipes' inputs, best margin a kg first
    const kg = withT.detail!.kgBy;
    let cap = (3600 * HALL.batch!.kg) / HALL.batch!.s;
    const ways = Object.values(HALL.recipes!).flatMap((r) => r.in.map((gin) => ({ gin, m: r.out.reduce((a, [o, x]) => a + x * pbar(o), 0) - pbar(gin) - reagentCost(r.reagents) })));
    ways.sort((a, b) => b.m - a.m);
    let term = 0;
    for (const w of ways) {
      const x = Math.min(kg[w.gin] ?? 0, cap);
      cap -= x;
      term += x * w.m;
    }
    expect(term).toBeGreaterThan(0);
    // I0 (the replay with the plates' terms, before the Yard sale's premium): moved by the hall's term (the Yard sale's
    // racking is replayed with its things counted from I0, so the hands' seconds move a little with it: within 2 %)
    expect(withT.I0! - without.I0!).toBeGreaterThan(0.98 * term);
    expect(withT.I0! - without.I0!).toBeLessThan(1.02 * term);
    // no purchase lowers rated income (ruling 17)
    expect(ratedIncome(c, withG.salvage)).toBeGreaterThanOrEqual(ratedIncome(c, g.salvage));
  });

  it.runIf(SOLD)('bought, set down, started up and poured by the rules as any hall; a tick equals a jump through its heats (stale boss)', () => {
    const cfg = shippedCfg();
    const g0 = s6();
    const ck = buyCheck(cfgAt(cfg, g0), g0, 'copper');
    const bought = R.buy(cfg, { ...g0, cash: 1e9 } as SalvageGame, 'copper', ck.price!, g0.salvage.t);
    // past its delivery, its own start-up and its first heat's self-pour (nobody at the yard)
    const W = cfg.salvage.works!;
    const g = jump(cfg, bought, bought.salvage.t + HALL.deliver_s + 3 * W.selfCommission_s + 3 * HALL.batch!.s);
    const w = g.salvage.works.copper;
    expect(w?.phase).toBe('running');
    expect(w?.heat?.recipe).toBe('copper');
    expect(g.salvage.counts?.['poured:copper'] ?? 0).toBeGreaterThan(0);
    // copper supplied went on: the ingot is sold as copper
    expect(g.salvage.ladder.worth.copper).toBeGreaterThan(g0.salvage.ladder.worth.copper);
    // 300 s of 0.5 s ticks against one jump, from that state
    const span = 300;
    let a = { ...g, salvage: { ...g.salvage, presenceAt: g.salvage.t - 100 } } as SalvageGame;
    const start = a;
    let ms = a.lastSavedAt ?? 0;
    for (let i = 0; i < span * 2; i++) {
      ms += 500;
      a = R.advanceSalvage(cfg, a, 0.5, ms);
    }
    const j = jump(cfg, start, start.salvage.t + span);
    expect(a.salvage.t).toBeCloseTo(j.salvage.t, 6);
    expect(a.cash).toBeCloseTo(j.cash, 2);
    expect(a.salvage.waste_g).toBe(j.salvage.waste_g);
    expect(a.salvage.ladder.supplied_g).toBe(j.salvage.ladder.supplied_g);
    for (const k of Object.keys(a.salvage.bays)) expect(a.salvage.bays[k].g, k).toBe(j.salvage.bays[k].g);
    expect(JSON.stringify(a.salvage.works.copper.heat)).toBe(JSON.stringify(j.salvage.works.copper.heat));
  });
});
