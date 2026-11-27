/**
 * THE WORKS' PART OF A SAVE (state2Works.ts repairWorks; RULING2 22 findings X4 and X5, the exactness attacker's
 * probe-corrupt.ts and a5-save.test.ts 5a moved here). On the works' frozen test content (fixtures/salvage2works.ts).
 * Owner: rules-works.
 */
import { describe, expect, it } from 'vitest';
import { r4Game, rackFull, worksCfg } from '../fixtures/salvage2works';
import { reconcileSalvage } from './save';
import { advanceSalvage, jump } from './tick';
import type { SalvageGame } from './types';

const cfg = worksCfg();
const load = (g: SalvageGame, edit: (s: Record<string, any>) => void = () => {}): SalvageGame => {
  const raw = { salvage: JSON.parse(JSON.stringify(g.salvage)) };
  edit(raw.salvage);
  return reconcileSalvage(cfg, { ...g, salvage: undefined } as never, raw, g.salvage.clock.highMs);
};
const whole = (g: SalvageGame): string => {
  const { clock, presenceAt, ...rest } = g.salvage as unknown as Record<string, unknown>;
  void clock;
  void presenceAt;
  return JSON.stringify({ cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), s: rest });
};

describe('X4: a corrupt works.<plate>.work is repaired (kept only when well formed, else null); the yard never throws', () => {
  const g = r4Game();
  const busy = Object.entries(g.salvage.works).filter(([, w]) => w.work);
  it('the frozen r4 has plates in work, and a reload keeps every well-formed work as it was', () => {
    expect(busy.length).toBeGreaterThan(0);
    const L = load(g);
    for (const [id, w] of busy) expect(L.salvage.works[id].work).toEqual(JSON.parse(JSON.stringify(w.work)));
  });
  const bad: [string, (w: Record<string, any>) => void][] = [
    ['true', (w) => (w.work = true)],
    ['a string', (w) => (w.work = 'x')],
    ['{}', (w) => (w.work = {})],
    ['[]', (w) => (w.work = [])],
    ['-5', (w) => (w.work = -5)],
    ['its piece without grams', (w) => (w.work = { ...w.work, piece: { ...w.work.piece, g: 'x' } })],
    ['NaN grams', (w) => (w.work = { ...w.work, piece: { ...w.work.piece, g: NaN } })],
    ['no grade', (w) => (w.work = { ...w.work, piece: { ...w.work.piece, grade: 7 } })],
    ['a rate that is not a number', (w) => (w.work = { ...w.work, rate_kg_s: null })],
    ['a start that is not a number', (w) => (w.work = { ...w.work, startAt: 'soon' })],
    ['base_g above the piece', (w) => (w.work = { ...w.work, base_g: w.work.piece.g + 1 })],
  ];
  for (const [what, f] of bad)
    it(`work = ${what}: loaded as null, and an hour of the yard runs`, () => {
      const [id] = busy[0];
      const L = load(g, (s) => f(s.works[id]));
      expect(L.salvage.works[id].work).toBeNull();
      expect(() => jump(cfg, L, L.salvage.t + 3600)).not.toThrow();
    });
});

describe('X5: a save and reload goes on bit for bit when the next visitor\'s date lies in the past with the rack empty', () => {
  // Both racked radiators sold, then the yard runs on past the next visitor's date with nothing racked.
  const g0 = rackFull();
  const sold = (() => {
    let g = g0;
    for (let k = 0; k < 400 && g.salvage.things.some((t) => t.at.at === 'rack'); k++) g = jump(cfg, g, g.salvage.t + 60);
    return jump(cfg, g, Math.max(g.salvage.t, g.salvage.reuse.nextAt ?? g.salvage.t) + 120);
  })();

  it('the state: the rack empty and reuse.nextAt before the clock', () => {
    expect(sold.salvage.things.some((t) => t.at.at === 'rack')).toBe(false);
    expect(sold.salvage.reuse.nextAt).not.toBeNull();
    expect(sold.salvage.reuse.nextAt!).toBeLessThan(sold.salvage.t);
  });

  it('save = unsaved: the reloaded yard keeps the date as saved', () => {
    const L = load(sold);
    expect(L.salvage.reuse).toEqual(JSON.parse(JSON.stringify(sold.salvage.reuse)));
  });

  it('save = unsaved two minutes on, and a tick equals a jump on the reloaded yard', () => {
    const L = load(sold);
    const T = sold.salvage.t + 120;
    expect(whole(jump(cfg, L, T)).length).toBeGreaterThan(0);
    expect(jump(cfg, L, T).salvage.reuse).toEqual(jump(cfg, sold, T).salvage.reuse);
    expect(whole(jump(cfg, L, T))).toBe(whole(jump(cfg, load(sold), T)));
    let a = { ...L, salvage: { ...L.salvage, presenceAt: -1 } } as SalvageGame;
    let ms = a.salvage.clock.highMs;
    for (let i = 0; i < 24; i++) {
      ms += 5000;
      a = advanceSalvage(cfg, a, 5, ms);
    }
    const b = jump(cfg, { ...L, salvage: { ...L.salvage, presenceAt: -1 } } as SalvageGame, a.salvage.t);
    expect(whole(a)).toBe(whole(b));
  }, 120_000);

  it('a rack that holds a thing still has a past date clamped to the save\'s clock (the feature never stops)', () => {
    const g = rackFull();
    const L = load(g, (s) => (s.reuse.nextAt = s.t - 50));
    expect(L.salvage.reuse.nextAt).toBe(g.salvage.t);
  });
});
