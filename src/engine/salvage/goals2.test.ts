/**
 * The goals of stage 2 in goals.ts (yard-stage2.md 1.3, 2.13; requests.md [goals2] 26 Nov; owner rules-money):
 * the list `stage2` offered from the works' rung, after the hour's goals and before the day-one goals still open;
 * never below it (the first yard's card unchanged); the grammar's `at:` (the boss now, on the merged map), a buy
 * goal done by the plate in `works`, the chevron on a works point. goalsStage2.test.ts (goals2's) walks the
 * whole list against goals.json's reading; this file holds what that one does not. Frozen r3 and its content.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stage2Cfg, stage2Game } from '../fixtures/salvage';
import { checkGoals, chevronOf, conditionMet, goalListOf, nextGoal } from './goals';
import type { SalvageConfig, SalvageGame } from './types';

const LIST = (JSON.parse(readFileSync(join(__dirname, '../../../scripts/content/yard/goals.json'), 'utf8')) as { stage2: unknown[] }).stage2;
const base = stage2Cfg('r3');
const cfg = { ...base, salvage: { ...base.salvage, stage2: LIST } } as unknown as SalvageConfig;
const g0 = stage2Game('r3');
const rung = (g: SalvageGame, n: number): SalvageGame => ({ ...g, salvage: { ...g.salvage, ladder: { ...g.salvage.ladder, rung: n } } });
const works = (cfg.salvage as unknown as { map: { works: { footprints: Record<string, { x: number; y: number; w: number; d: number }>; points: Record<string, [number, number]> } } }).map.works;

describe('stage 2\'s goal list in goals.ts', () => {
  it('offered from the works\' rung: the card at r3 reads "Put the bath on the Yard sale"; below it the first yard\'s card as before', () => {
    expect(nextGoal(cfg, g0)?.id).toBe('rackBath');
    const r2 = rung(g0, 2);
    expect(nextGoal(cfg, r2)?.id).toBe(nextGoal(base, r2)?.id);
    expect(goalListOf(cfg, r2).map((l) => l.id)).toEqual(goalListOf(base, r2).map((l) => l.id));
  });
  it('after the hour\'s goals and before the day-one goals still open', () => {
    const ids = goalListOf(cfg, g0).map((l) => l.id);
    const hour = (base.salvage.goals as { id: string }[]).map((d) => d.id);
    const s2 = (LIST as { id: string }[]).map((d) => d.id);
    const dayOne = ids.filter((id) => !hour.includes(id) && !s2.includes(id));
    const iFirst = ids.indexOf('rackBath');
    for (const h of hour) expect(ids.indexOf(h)).toBeLessThan(iFirst);
    for (const d of dayOne) expect(ids.indexOf(d)).toBeGreaterThan(ids.indexOf('widenTop'));
  });
  it('a buy goal is done by the plate in works, however paid (plates never enter `owned`)', () => {
    const g = { ...g0, salvage: { ...g0.salvage, works: { baler: { phase: 'arriving' } as never } } };
    expect(conditionMet(cfg, g, 'owned:baler')).toBe(true);
    expect(conditionMet(cfg, g, 'plate:baler')).toBe(true);
    expect(conditionMet(cfg, g0, 'owned:baler')).toBe(false);
  });
  it('`at:backfield` is the boss now: on foot within reach of the footprint; not driving, not while an away card waits', () => {
    const f = works.footprints.backfield;
    const there = { ...g0, salvage: { ...g0.salvage, away: null, presence: { ...g0.salvage.presence, x: f.x, y: f.y, driving: false } } };
    expect(conditionMet(cfg, there, 'at:backfield')).toBe(true);
    expect(conditionMet(cfg, { ...there, salvage: { ...there.salvage, presence: { ...there.salvage.presence, driving: true } } }, 'at:backfield')).toBe(false);
    expect(conditionMet(cfg, { ...there, salvage: { ...there.salvage, presence: { ...there.salvage.presence, x: f.x + f.w / 2 + cfg.salvage.reach.place + 1 } } }, 'at:backfield')).toBe(false);
  });
  it('the chevron points at a works point (the bath by the canopy)', () => {
    const p = works.points.firstThing;
    expect(chevronOf(cfg, g0)).toEqual({ x: p[0], y: p[1], id: 'firstThing' });
  });
});

describe("the lead's rule (requests.md 26 Nov 11:10): day-one goals still open come first while stage 2 waits on a repeating goal", () => {
  const all = LIST as { id: string; repeat?: boolean; done: string }[];
  const iWait = all.findIndex((d) => d.repeat || d.done === 'repeat');
  const dayOneIds = ((cfg.salvage as unknown as { dayOne: { id: string }[] }).dayOne ?? []).map((d) => d.id);
  // r3 with every stage-2 goal before the first wait done: the stage's current goal is its first repeating goal.
  // buyNight is offered after the first away card (its `after` away:1): r3 is given one closed away card.
  const atWait = { ...g0, salvage: { ...g0.salvage, counts: { ...(g0.salvage.counts ?? {}), away: 1 }, goals: { ...g0.salvage.goals, done: [...g0.salvage.goals.done, ...all.slice(0, iWait).map((d) => d.id)] } } };
  const openD1 = goalListOf(cfg, atWait)
    .map((l) => l.id)
    .filter((id) => dayOneIds.includes(id) && !atWait.salvage.goals.done.includes(id) && !atWait.salvage.goals.skipped.includes(id));

  it('r3 holds buyNight and hireCutter2 open; during the first wait they are offered first, in the day-one order, before the wait', () => {
    expect(openD1).toEqual(expect.arrayContaining(['buyNight', 'hireCutter2']));
    expect(nextGoal(cfg, atWait)?.id).toBe(openD1[0]);
    const ids = goalListOf(cfg, atWait).map((l) => l.id);
    for (const d of openD1) expect(ids.indexOf(d)).toBeLessThan(ids.indexOf(all[iWait].id));
    expect(openD1).toEqual(dayOneIds.filter((id) => openD1.includes(id)));
  });

  it('the list never stalls: the supply goal after the wait ticks while day-one goals are still open, and they go back behind the list', () => {
    const next = all[iWait + 1];
    expect(next.done.startsWith('rung:')).toBe(true);
    const n = Number(next.done.split(':')[1]);
    const r = (cfg.salvage.ladder.rungs as unknown as { t: number }[])[n - 1];
    const met = { ...atWait, salvage: { ...atWait.salvage, ladder: { ...atWait.salvage.ladder, rung: n, supplied_g: Math.round(r.t * 1e6) + 1 } } };
    const out = checkGoals(cfg, met);
    expect(out.done).toEqual(expect.arrayContaining([all[iWait].id, next.id]));
    for (const d of openD1) expect(out.goals.done).not.toContain(d);
    const after = { ...met, salvage: { ...met.salvage, goals: out.goals } };
    expect(dayOneIds).not.toContain(nextGoal(cfg, after)?.id);
  });

  it('with every day-one goal done or skipped, the wait shows the repeating goal again', () => {
    const none = { ...atWait, salvage: { ...atWait.salvage, goals: { ...atWait.salvage.goals, skipped: [...atWait.salvage.goals.skipped, ...dayOneIds] } } };
    const ids = goalListOf(cfg, none).map((l) => l.id);
    expect(ids.indexOf(all[iWait].id)).toBeLessThan(Math.min(...dayOneIds.map((d) => (ids.indexOf(d) < 0 ? Infinity : ids.indexOf(d)))));
  });
});
