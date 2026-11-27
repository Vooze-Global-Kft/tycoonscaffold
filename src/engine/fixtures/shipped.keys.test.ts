/**
 * s2-fix-content (27 Nov): THE KEYS THIS PASS ADDED TO THE SHIPPED CONTENT DO NOT REACH THE FIRST YARD (the owner's phone,
 * release.stage 1). The pass added truck.fairAfter_trips (E4 (a), the loop's rule from the works' opening),
 * ladder.supply (build-yard.py's supply check, L2 with E4 (c); read by no rule), ads.minOffer_min and ads.dayHours_h at
 * rungs 1 and 2 (M8; the ads block is dark at stage 1) and iap.products (M1; dark at stage 1). Pinned here: the content
 * a stage-1 build reads differs from the same content without those keys only by the two that no rule reads, and twenty
 * minutes of the normal hand play the same, state for state.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lintSalvage, SalvageSchema } from '../../config/schema.salvage';
import { newBot, playTo, seededCfg, startGame } from '../salvage/bot';
import type { SalvageConfig } from '../salvage/types';

const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);
const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;

/** The shipped content without this pass's keys (as it was before s2-fix-content). */
function withoutPassKeys(raw: Record<string, any>): Record<string, any> {
  const r = structuredClone(raw);
  delete r.truck.fairAfter_trips;
  delete r.ladder.supply;
  delete r.iap.products;
  delete r.ads.minOffer_min;
  r.ads.dayHours_h = [null, null, ...r.ads.dayHours_h.slice(2)];
  return r;
}

describe('the first yard does not read this pass\'s keys (release.stage 1)', () => {
  it('the shipped content is at stage 1 and carries the keys', () => {
    expect(RAW.release.stage).toBe(1);
    // 12 since the lead's ruling 23.1 (4 cost the normal hand a quarter of its lifetime earnings by day 6).
    expect(RAW.truck.fairAfter_trips).toBe(12);
    expect(RAW.ladder.supply.trips_h).toBeGreaterThan(0);
    expect(RAW.ads.minOffer_min).toBe(2);
    expect(RAW.ads.dayHours_h.slice(0, 2).every((h: unknown) => typeof h === 'number')).toBe(true);
  });

  it('the stage-1 content differs only by truck.fairAfter_trips and ladder.supply; stage 2\'s blocks stay dark', () => {
    const a = SalvageSchema.parse(RAW) as Record<string, any>;
    const b = SalvageSchema.parse(withoutPassKeys(RAW)) as Record<string, any>;
    expect(a.ads).toBeUndefined();
    expect(a.iap).toBeUndefined();
    const { fairAfter_trips, ...truck } = a.truck;
    const { supply, ...ladder } = a.ladder;
    expect(fairAfter_trips).toBe(12);
    expect(supply).toBeDefined();
    expect({ ...a, truck, ladder }).toEqual(b);
  });

  it('twenty minutes of the normal hand at stage 1 play the same with and without them', () => {
    const run = (raw: Record<string, unknown>) => {
      const c = seededCfg({ mode: 'salvage', salvage: SalvageSchema.parse(raw) } as unknown as SalvageConfig, 3);
      const b = newBot(c, startGame(c, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 3 } as never);
      playTo(b, 20 * 60);
      return b.g;
    };
    expect(run(RAW)).toEqual(run(withoutPassKeys(RAW)));
  });
});

describe('the content checks of this pass (schema.salvage.ts lintStage2)', () => {
  const at2 = (raw: Record<string, any>) => lintSalvage(SalvageSchema.parse({ ...raw, release: { stage: 2 } }));
  it('the shipped content is clean at stage 2', () => {
    expect(at2(RAW)).toEqual([]);
  });
  it('M8: a rung-1 or rung-2 day off the habit is refused; null there is allowed', () => {
    const r = structuredClone(RAW);
    r.ads.dayHours_h[0] = 9;
    expect(at2(r).some((e) => e.includes('ads.dayHours_h[0] (rung 1)'))).toBe(true);
    r.ads.dayHours_h[0] = null;
    expect(at2(r)).toEqual([]);
  });
  it('M1: a look that is not a cosmetic product of iap.products, two prefixes, a pack without hours', () => {
    const r = structuredClone(RAW);
    r.iap.products = r.iap.products.filter((p: { id: string }) => p.id !== 'yard_plaque');
    expect(at2(r).some((e) => e.includes('iap.lookOf yard_plaque'))).toBe(true);
    const q = structuredClone(RAW);
    q.iap.products[0].id = 'other_colour1';
    expect(at2(q).some((e) => e.includes('one prefix'))).toBe(true);
    const w = structuredClone(RAW);
    delete w.iap.products.find((p: { kind: string }) => p.kind === 'hoursOfIncome').value;
    expect(at2(w).some((e) => e.includes('without its hours'))).toBe(true);
  });
});
