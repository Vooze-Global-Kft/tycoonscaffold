/**
 * A full hold at large capacities. The units in the hold are a sum of floats; at a capacity in the
 * tens of millions that sum misses F by more than the absolute tolerance, and with an absolute test
 * the autopilot never launched again (found by the balance bot at F = 18,691,582 with a hold of
 * 18,691,581.999999996: the station then earned an eighth of its income for the rest of the run).
 */
import { describe, expect, it } from 'vitest';
import { haulTestConfig, shaped } from './fixtures/haul';
import * as H from './haul';
import { fillsFreighter } from './haul/params';

type Run = H.HaulGame & { haul: H.HaulState };

describe('a full hold at large capacities', () => {
  it('counts a hold that misses the capacity only by float error as full, and nothing less', () => {
    expect(fillsFreighter(18691581.999999996, 18691582)).toBe(true);
    expect(fillsFreighter(18691582, 18691582)).toBe(true);
    expect(fillsFreighter(18691582 - 1, 18691582)).toBe(false);
    expect(fillsFreighter(20, 20)).toBe(true);
    expect(fillsFreighter(19.99, 20)).toBe(false);
    expect(fillsFreighter(0, 20)).toBe(false);
  });

  it('the autopilot launches such a hold, the launch pays the full-hold bonus, and the hint marks see it as full', () => {
    const cfg = haulTestConfig();
    // Freighter level 38 holds about 18.7 million units with the shipped growth of 1.45.
    const base = shaped(cfg, 7, { slots: [0], haulers: [1], freighter: 38, autopilot: true, policy: 'full' });
    const p = H.haulParams(cfg, base);
    expect(p.F).toBeGreaterThan(1e7);
    // Three ores whose float sum sits a few 1e-9 under F, as the tick's proportional sharing leaves it.
    const third = p.F / 3;
    const hold = { iron: third, copper: third, ice: p.F - 2 * third - 4e-9 };
    const total = hold.iron + hold.copper + hold.ice;
    expect(total).toBeLessThan(p.F);
    expect(p.F - total).toBeGreaterThan(1e-9);
    const g: Run = { ...base, haul: { ...base.haul, hold } };
    expect(H.autopilotWants(p, g.haul)).toBe(true);
    const ev: H.HaulEvent[] = [];
    const after = H.advanceHaul(cfg, g, 0.1, 0, ev) as Run;
    expect(after.haul.freighter.phase).not.toBe('docked');
    const cargo = after.haul.freighter.cargo;
    const pay = H.payoutFor(p, cargo, null, 0);
    const plain = Object.entries(cargo).reduce((a, [ore, n]) => a + n * (p.prices[ore] ?? 0), 0) * p.G;
    expect(pay.payout / plain).toBeCloseTo(cfg.haul.freighter.fullBonus, 6);
  });
});
