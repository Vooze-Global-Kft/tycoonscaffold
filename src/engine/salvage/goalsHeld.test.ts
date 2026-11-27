/**
 * s2g-halls (27 November; RULING2.md 29.5 b; REPORT10 item 8): FROM THE WORKS' OPENING THE STAGE'S GOALS SHOW PAST A FIRST-YARD
 * GOAL THAT IS NOT MET. The card-only player's goal card read "cut a car" from hour 3 to hour 60 (the list ticks in order and
 * stops at the first goal not met). Now: from the works' opening (layer.ts worksOpened) the goal card shows the first open goal
 * of the stage's list; a first-yard goal left open is never ahead of it, ticks the moment it is met, and stays on the
 * clipboard's list where the first yard shows it. Below the works' opening nothing changes. On the bots' state seed1-s1
 * (the normal hand at rung 3, the works open; s2e-fix1's fixture) read with the shipped content at stage 2, "cut a car"
 * taken back as never done. No tuned number is pinned. Owner: s2g-halls.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { shipped2Config } from '../fixtures/shipped2';
import { seededCfg } from './bot';
import { checkGoals, goalBuyNow, goalListOf, goalOf, goalSpecs } from './goals';
import { worksOpened } from './layer';
import type { SalvageConfig, SalvageGame } from './types';

let CFG: SalvageConfig | null = null;
const cfg = (): SalvageConfig => (CFG ??= seededCfg(shipped2Config((x) => SalvageSchema.parse(x)), 1));
const s1 = (): SalvageGame => JSON.parse(fs.readFileSync(new URL('./__fixtures__/s2e-fix1/seed1-s1.json', import.meta.url), 'utf8')).g as SalvageGame;

/** seed1-s1 as if "cut a car" had never been done (the card-only player): the goal back open and its count at 0. */
function noCar(opened = true): SalvageGame {
  const g = structuredClone(s1());
  const s = g.salvage;
  s.counts = { ...s.counts, 'cut:car': 0 };
  if (!opened) delete s.counts.bathSet;
  // the goals from cutCar on in the first yard's list back open, as a list that stopped there would have left them
  const yard = goalSpecs(cfg().salvage).goals.map((d) => d.id);
  const from = yard.indexOf('cutCar');
  const reopened = new Set(yard.slice(from));
  s.goals = { ...s.goals, done: s.goals.done.filter((id) => !reopened.has(id) && !goalSpecs(cfg().salvage).stage2.some((d) => d.id === id)) };
  return g;
}
const withGoals = (g: SalvageGame): SalvageGame => ({ ...g, salvage: { ...g.salvage, goals: checkGoals(cfg(), g).goals } });

describe('29.5 b the stage\'s goals show past a first-yard goal not met', () => {
  it('the premise: the works open, "cut a car" not met, the stage\'s list offered', () => {
    const g = noCar();
    expect(worksOpened(g.salvage)).toBe(true);
    expect(g.salvage.goals.done).not.toContain('cutCar');
    expect(goalSpecs(cfg().salvage).stage2.length).toBeGreaterThan(0);
  });

  it('the check ticks the stage\'s goals and the first yard\'s met ones; "cut a car" stays open and holds nothing back', () => {
    const g = noCar();
    const r = checkGoals(cfg(), g);
    expect(r.done).not.toContain('cutCar');
    // the first yard's goals after it that are met are ticked (supply rung 3: the yard stands at rung 3), the stage's first too
    expect(r.done).toContain('supplyRung3');
    expect(r.done).toContain('rackBath');
    // the first yard's repeating goal is passed over once the goal after it is done, as below the works
    expect(r.done).toContain('widen');
    // met later: ticked at the next check
    const met = { ...g, salvage: { ...g.salvage, goals: r.goals, counts: { ...g.salvage.counts, 'cut:car': 1 } } };
    expect(checkGoals(cfg(), met).done).toContain('cutCar');
  });

  it('the goal card shows the first open goal of the STAGE\'s list, never the first yard\'s; the clipboard lists "cut a car" where it stands', () => {
    const g = withGoals(noCar());
    const card = goalOf(cfg(), g)!;
    const gs = g.salvage.goals;
    const firstStage = goalSpecs(cfg().salvage).stage2.find((d) => !gs.done.includes(d.id) && !gs.skipped.includes(d.id))!;
    expect(card.id).toBe(firstStage.id);
    expect(card.id).not.toBe('cutCar');
    const list = goalListOf(cfg(), g);
    const at = (id: string) => list.findIndex((l) => l.id === id);
    expect(list[at('cutCar')].state).toBe('later');
    expect(list.filter((l) => l.state === 'current').map((l) => l.id)).toEqual([card.id]);
    // in the first yard's order: before the stage's goals
    expect(at('cutCar')).toBeLessThan(at(firstStage.id));
    // the advice's target (goalBuyNow) reads the stage's purchases first
    const buyFirst = goalSpecs(cfg().salvage).stage2.find((d) => !gs.done.includes(d.id) && d.buy);
    expect(goalBuyNow(cfg(), g)).toBe(buyFirst?.buy ?? null);
  });

  it('below the works\' opening the first yard\'s card and check are as they were: the list stops at "cut a car"', () => {
    const g = noCar(false);
    expect(worksOpened(g.salvage)).toBe(false);
    const r = checkGoals(cfg(), g);
    expect(r.done).toEqual([]);
    expect(goalOf(cfg(), g)!.id).toBe('cutCar');
    expect(goalListOf(cfg(), g).find((l) => l.id === 'cutCar')!.state).toBe('current');
  });
});
