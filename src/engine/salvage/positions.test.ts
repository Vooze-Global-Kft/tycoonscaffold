/**
 * Positions (one module, pure, on the frozen test content): the stillage block of the lead's ruling of
 * 17:10 (a stillage only for a grade that has had stock, two rows of seven, 1.3 m apart, filled in the
 * order the grades first had stock from the end nearest the merchant), and a bay's slots inside its place.
 */
import { describe, expect, it } from 'vitest';
import { SALVAGE_TEST } from '../fixtures/salvage';
import { bayPos, isStillage, pointOf, stillageSlot } from './positions';

const C = SALVAGE_TEST;
const stills = Object.keys(C.grades).filter((g) => isStillage(C, g));

describe('the stillage block', () => {
  it('stands only for grades that had stock, in the order they first had it, 1.3 m apart from the merchant end', () => {
    expect(stills.length).toBeGreaterThanOrEqual(2);
    const [a, b] = [stills[1], stills[0]];
    const counts = { 'bay#': 2, [`bay#:${a}`]: 1, [`bay#:${b}`]: 2 };
    const s = { counts };
    expect(stillageSlot(C, { counts: {} }, a)).toBeNull();
    const pa = stillageSlot(C, s, a)!;
    const pb = stillageSlot(C, s, b)!;
    const row0 = pointOf(C, Object.keys(C.map.points).filter((id) => id.startsWith('stillage')).sort()[0]);
    expect(pa).toEqual({ x: row0.x, y: row0.y });
    expect(Math.abs(pb.x - pa.x)).toBeCloseTo(1.3, 9);
    // Away from the merchant's stand.
    const m = pointOf(C, 'merchant');
    expect(Math.abs(pb.x - m.x)).toBeGreaterThan(Math.abs(pa.x - m.x) - 1e-9);
    expect(bayPos(C, a, s)).toEqual(pa);
  });

  it('keeps every slot of a bay place inside its footprint', () => {
    for (const [g, gr] of Object.entries(C.grades)) {
      const place = gr.bay?.place;
      if (!place || !C.map.places[place]) continue;
      const p = pointOf(C, place);
      const w = C.map.places[place].w;
      expect(Math.abs(bayPos(C, g).x - p.x), g).toBeLessThanOrEqual(w / 2 + 1e-9);
    }
  });
});
