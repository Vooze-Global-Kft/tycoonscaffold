/**
 * goals.ts (2.10): the first unfinished goal; done conditions read from the state; never met by doing
 * nothing (a fresh yard ticks nothing however long it stands); goals met in order; the repeating goal;
 * the prompt gap. Frozen test content and states.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../fixtures/salvage';
import { bump, checkGoals, conditionMet, goalListOf, goalOf } from './goals';
import type { SalvageGame } from './types';
import { TEXT_KEYS } from './types';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const KEYS = new Set<string>(Object.values(TEXT_KEYS).flat());
const fresh = () => fixtureGame('fresh', base(), FIXTURE_NOW) as SalvageGame;
const withCounts = (g: SalvageGame, counts: Record<string, number>): SalvageGame => ({ ...g, salvage: { ...g.salvage, counts } });

describe('goals', () => {
  it('a fresh yard shows the first goal and doing nothing meets none', () => {
    const g = fresh();
    expect(goalOf(cfg, g)?.id).toBe(cfg.salvage.goals[0].id);
    const idle = { ...g, salvage: { ...g.salvage, t: 36_000 } };
    expect(checkGoals(cfg, idle).done).toEqual([]);
    for (const d of cfg.salvage.goals) expect(conditionMet(cfg, idle, d.done), d.done).toBe(false);
  });
  it('done conditions read lifetime counts; met goals tick in order, a later one waits', () => {
    const first = cfg.salvage.goals[0];
    const second = cfg.salvage.goals[1];
    let g = fresh();
    g = withCounts(g, bump({}, 'collected'));
    // The second goal (collected:1 in the test content) is met but waits for the first.
    expect(checkGoals(cfg, g).done).toEqual([]);
    g = withCounts(g, bump(bump({}, 'collected'), `cut:${first.done.split(':')[1]}`));
    const r = checkGoals(cfg, g);
    expect(r.done.slice(0, 2)).toEqual([first.id, second.id]);
  });
  it('a goal whose purchase is owned counts done', () => {
    const d = cfg.salvage.goals.find((x) => x.buy)!;
    const g = fresh();
    const owned = { ...g, salvage: { ...g.salvage, owned: [d.buy!] } };
    expect(conditionMet(cfg, owned, `owned:${d.buy}`)).toBe(true);
  });
  it('the goal card and the list print text keys in every frozen state; the list ticks done goals', () => {
    for (const name of FIXTURE_NAMES) {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      const goal = goalOf(cfg, g);
      if (goal) {
        expect(KEYS.has(goal.text.key)).toBe(true);
        if (goal.meter) expect(goal.meter.share).toBeGreaterThanOrEqual(0);
      }
      const list = goalListOf(cfg, g);
      expect(list.filter((l) => l.state === 'current').length).toBeLessThanOrEqual(1);
      for (const l of list) if (g.salvage.goals.done.includes(l.id)) expect(l.state).toBe('done');
    }
  });
  it('a purchase goal becoming current dates its prompt no sooner than the gap after the last', () => {
    const i = cfg.salvage.goals.findIndex((x) => x.buy);
    const g0 = fresh();
    const done = cfg.salvage.goals.slice(0, i).map((x) => x.id);
    const prev = cfg.salvage.goals[i - 1];
    const g = { ...g0, salvage: { ...g0.salvage, t: 100, goals: { ...g0.salvage.goals, done: done.slice(0, -1), lastPromptAt: 90 } } };
    const met = withCounts(g, { collected: 1, [`made:bb`]: 1, [`weighed:bb`]: 1 });
    void prev;
    const r = checkGoals(cfg, met);
    if (r.done.length) expect(r.goals.lastPromptAt).toBeGreaterThanOrEqual(90 + cfg.salvage.advice.promptGapS);
  });
});

describe('the first fetch and the tip (P14), and the list ticks what already holds (W24)', () => {
  const skip = (weighed: boolean) => ({ partner: 'partnerFarm', slot: 0, contents: {}, mass_g: 540_000, price: 0, trial: true, weighed });
  const onTruck = (g: SalvageGame, weighed: boolean, counts: Record<string, number>): SalvageGame => {
    const t = { no: 1, at: 0, day: 0, kind: 'skipWeighIn' as const, partner: 'partnerFarm', trial: true, gross_g: 0, tare_g: 0, net_g: 540_000, paid: 0, things: [] };
    return { ...g, salvage: { ...g.salvage, counts, tickets: weighed ? [...g.salvage.tickets, t] : g.salvage.tickets, truck: { ...g.salvage.truck, skip: skip(weighed) } } };
  };
  it('a skip over the weighbridge is bridged but not fetched until it is tipped', () => {
    const g = fresh();
    const weighed = onTruck(g, true, {});
    expect(conditionMet(cfg, weighed, 'bridged:partnerFarm:1')).toBe(true);
    // The weighbridge ticket alone no longer counts as fetched once the sim keeps counts.
    expect(conditionMet(cfg, weighed, 'fetched:partnerFarm:1')).toBe(false);
    expect(conditionMet(cfg, onTruck(g, false, {}), 'bridged:partnerFarm:1')).toBe(false);
    const tipped = { ...withCounts(g, { 'fetched:partnerFarm': 1 }), salvage: { ...withCounts(g, { 'fetched:partnerFarm': 1 }).salvage, truck: { ...g.salvage.truck, skip: null } } } as SalvageGame;
    expect(conditionMet(cfg, tipped, 'fetched:partnerFarm:1')).toBe(true);
    expect(conditionMet(cfg, tipped, 'bridged:partnerFarm:1')).toBe(true);
  });
  for (const name of FIXTURE_NAMES) {
    it(`${name}: every goal of the list whose condition holds is ticked; one current at most`, () => {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      const list = goalListOf(cfg, g);
      expect(list.filter((l) => l.state === 'current').length).toBeLessThanOrEqual(1);
      for (const l of list) {
        const d = cfg.salvage.goals.find((x) => x.id === l.id);
        if (!d || d.repeat || l.state === 'skipped') continue;
        const met = (d.buy && conditionMet(cfg, g, `owned:${d.buy}`)) || conditionMet(cfg, g, d.done);
        if (met) expect(l.state, l.id).toBe('done');
      }
    });
  }
});
