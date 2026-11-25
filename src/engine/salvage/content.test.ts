/**
 * Content helpers the rules read (2.4, E21) on the frozen test content: the converter is paid by its
 * payables (metal grams × § a gram × payable, less fees), never by content's `paid` figure; the day's pm
 * step moves its metals; a lot pays the same per unit.
 */
import { describe, expect, it } from 'vitest';
import { SALVAGE_TEST } from '../fixtures/salvage';
import { boardX } from './board';
import { convAssay, convPaid, lotPrice } from './content';

const C = SALVAGE_TEST;

describe('the converter on assay', () => {
  it('is paid from its payables less the fees, not from content paid', () => {
    const v = C.converter;
    const metal = v.pt_g * v.pt * v.pay_pt + v.pd_g * v.pd * v.pay_pd + v.rh_g * v.rh * v.pay_rh;
    expect(convPaid(C, 0, false)).toBeCloseTo(metal - v.ceramic_kg * v.ceramic_fee - v.assay_fee, 2);
    const richer = { ...C, converter: { ...v, rh: v.rh * 2, paid: v.paid } } as typeof C;
    expect(convPaid(richer, 0, false)).toBeCloseTo(convPaid(C, 0, false) + v.rh_g * v.rh * v.pay_rh, 2);
    const otherPaid = { ...C, converter: { ...v, paid: v.paid * 3 } } as typeof C;
    expect(convPaid(otherPaid, 0, false)).toBe(convPaid(C, 0, false));
  });

  it("steps its metals by the day's pm move and the lot pays it per unit", () => {
    for (const day of [20_000, 20_001, 20_002]) {
      expect(convPaid(C, day)).toBeCloseTo(convAssay(C, 1 + boardX(C, 'pm', day)), 9);
      const kg = C.wholeUnits_kg.conv ?? 1;
      expect(Math.abs(lotPrice(C, 'conv', day) * kg - convPaid(C, day))).toBeLessThanOrEqual(0.005 * kg + 1e-9);
    }
  });
});
