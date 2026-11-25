/**
 * The crucible's recipe change (finding R1, blocking): the heel pours WITHOUT refilling, the new recipe
 * is set, and only then the pot takes from the bays; an unmelted charge goes back to each grade's own
 * bay. Frozen test content (no tuned number pinned). Owner: rules-sim-a.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST } from '../fixtures/salvage';
import * as R from '../salvage';
import type { SalvageConfig, SalvageEvent, SalvageGame } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const base = (cash = 0) => ({ cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;
const recipes = SALVAGE_TEST.machines.crucible.recipes as unknown as Record<string, readonly [string | readonly string[], string, number, string]>;
const inputs = (r: string) => {
  const i = recipes[r][0];
  return Array.isArray(i) ? [...i] : [i as string];
};

function yardWith(recipe: string, heel_g: number, fromBays = true): SalvageGame {
  const g = R.createSalvage(cfg, base(0), FIXTURE_NOW);
  const s = structuredClone(g.salvage);
  s.owned.push('crucible', ...Object.keys(recipes));
  const cr = s.machines.crucible;
  cr.owned = true;
  cr.level = 1;
  cr.recipe = recipe;
  cr.fromBays = fromBays;
  cr.phase = 'cooling';
  cr.heel_g = heel_g;
  cr.firstPoured = true;
  for (const r of Object.keys(recipes)) for (const gr of inputs(r)) s.bays[gr] = { g: 40_000, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 };
  return { ...g, salvage: s };
}

describe('a recipe change (R1)', () => {
  const names = Object.keys(recipes);
  expect(names.length).toBeGreaterThanOrEqual(2);
  for (const from of names)
    for (const to of names)
      if (from !== to)
        it(`${from} -> ${to} with a heel and Take from bays: the old input's bays are untouched, the pot holds only the new input`, () => {
          const g = yardWith(from, 3000);
          const ev: SalvageEvent[] = [];
          const g1 = R.setRecipe(cfg, g, to, true, g.salvage.t, ev);
          const cr = g1.salvage.machines.crucible;
          expect(cr.recipe).toBe(to);
          const oldOnly = inputs(from).filter((gr) => !inputs(to).includes(gr));
          for (const gr of oldOnly) expect(g1.salvage.bays[gr].g, gr).toBe(40_000);
          // The heel poured as the OLD recipe's output (a short ingot), never as the new one's.
          expect(cr.tray_g[recipes[from][1]] ?? 0).toBe(3000);
          // What the pot took came from the new recipe's input bays only.
          const taken = inputs(to).reduce((a, gr) => a + (40_000 - g1.salvage.bays[gr].g), 0);
          expect(cr.charge_g).toBe(taken);
          // After an hour (the round collects the bays meanwhile): the new output is never more than what left the new input's bays.
          const g2 = R.jump(cfg, g1, g1.salvage.t + 3600);
          const c2 = g2.salvage.machines.crucible;
          const made = (c2.tray_g[recipes[to][1]] ?? 0) + c2.heel_g;
          const takenAll = inputs(to).reduce((a, gr) => a + (40_000 - g2.salvage.bays[gr].g), 0) - c2.charge_g;
          expect(made).toBeLessThanOrEqual(takenAll + 1e-6);
        });

  it('an unmelted charge goes back to each grade\'s own bay (never all as the first input)', () => {
    const multi = names.find((r) => inputs(r).length > 1);
    if (!multi) return;
    const [a, b] = inputs(multi);
    const g = yardWith(multi, 0, false);
    const s = structuredClone(g.salvage);
    s.machines.crucible.phase = 'filling';
    s.machines.crucible.charge_g = 5000;
    s.machines.crucible.chargeBy = { [a]: 1000, [b]: 4000 };
    const other = names.find((r) => r !== multi)!;
    const g1 = R.setRecipe(cfg, { ...g, salvage: s }, other, true, g.salvage.t);
    expect(g1.salvage.bays[a].g).toBe(41_000);
    expect(g1.salvage.bays[b].g).toBe(44_000);
    expect(g1.salvage.machines.crucible.charge_g).toBe(0);
  });

  it('Take from bays records the charge by grade', () => {
    const multi = names.find((r) => inputs(r).length > 1) ?? names[0];
    const g = yardWith(multi, 0, true);
    const s = structuredClone(g.salvage);
    s.machines.crucible.phase = 'empty';
    const g1 = R.setFromBays(cfg, { ...g, salvage: { ...s, machines: { ...s.machines, crucible: { ...s.machines.crucible, fromBays: false } } } }, true, g.salvage.t);
    const cr = g1.salvage.machines.crucible;
    const sum = Object.values(cr.chargeBy ?? {}).reduce((x, y) => x + y, 0);
    expect(sum).toBe(cr.charge_g);
  });
});
