/**
 * s2-fix-small (R5, RULING2.md 24): on ANY load goals.done and goals.skipped are lists of known goal ids, each once,
 * in their order; anything else is dropped (the first yard too: it matters only for a corrupt save). The exactness
 * attacker's two corruptions (attack/s2/s2-attack-exact probe-corrupt.ts: `goals.done = NaN` made goals.ts throw) load
 * and an hour runs. At release.stage 1 a stage-2 goal id waits aside in stage2Frozen (X6) and comes back at stage 2.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NOW, stage2Cfg, stage2Game } from '../fixtures/salvage';
import { shipped2Config } from '../fixtures/shipped2';
import * as R from '../salvage';
import { reconcileSalvage } from './save';
import { jump } from './tick';
import type { SalvageConfig, SalvageGame } from './types';

const cfg1 = { ...GameConfigSchema.parse(gameJson), salvage: SalvageSchema.parse(gameJson.salvage) } as unknown as SalvageConfig;
const cfg2 = shipped2Config(SalvageSchema.parse);
const ids = (c: SalvageConfig, list: 'goals' | 'dayOne' | 'stage2') => ((c.salvage as unknown as Record<string, { id: string }[] | undefined>)[list] ?? []).map((d) => d.id);

/** Load `g` with its goals corrupted by `f`, then run an hour of the yard (jump) and read the goal card. */
function loadRun(cfg: SalvageConfig, g: SalvageGame, f: (goals: Record<string, unknown>) => void): SalvageGame {
  const raw = { salvage: JSON.parse(JSON.stringify(g.salvage)) };
  f(raw.salvage.goals);
  const L = reconcileSalvage(cfg, { ...g, salvage: undefined } as never, raw, g.salvage.clock.highMs);
  const J = jump(cfg, L, L.salvage.t + 3600);
  R.nextGoal(cfg, J);
  R.goalList(cfg, J);
  return L;
}

describe('R5: goals.done and goals.skipped are lists of known goal ids on any load', () => {
  it('the release.stage 1 content really is the first yard (no stage-2 goal list)', () => {
    expect(cfg1.salvage.release?.stage).toBe(1);
    expect(ids(cfg1, 'stage2')).toEqual([]);
    expect(ids(cfg2, 'stage2').length).toBeGreaterThan(0);
  });

  const corruptions: [string, (gs: Record<string, unknown>) => void][] = [
    ['done = NaN (the attacker)', (gs) => (gs.done = NaN)],
    ['skipped = NaN', (gs) => (gs.skipped = NaN)],
    ['done = "x", skipped = {}', (gs) => ((gs.done = 'x'), (gs.skipped = {}))],
    ['done = null, skipped = true', (gs) => ((gs.done = null), (gs.skipped = true))],
    ['lastPromptAt and repeats NaN', (gs) => ((gs.lastPromptAt = NaN), (gs.repeats = 'x'))],
  ];
  for (const [what, f] of corruptions) {
    it(`stage 2 (the frozen r3): ${what} loads and an hour runs`, () => {
      const L = loadRun(stage2Cfg('r3'), stage2Game('r3'), f);
      expect(Array.isArray(L.salvage.goals.done) && Array.isArray(L.salvage.goals.skipped)).toBe(true);
      expect(Number.isFinite(L.salvage.goals.lastPromptAt) && Number.isFinite(L.salvage.goals.repeats)).toBe(true);
    });
    it(`the first yard (release.stage 1, shipped): ${what} loads and an hour runs`, () => {
      const g = R.createSalvage(cfg1, E.createInitialState(cfg1 as never, FIXTURE_NOW), FIXTURE_NOW);
      const L = loadRun(cfg1, g, f);
      expect(Array.isArray(L.salvage.goals.done) && Array.isArray(L.salvage.goals.skipped)).toBe(true);
    });
  }
  // The whole-goals corruption too (goals itself not an object).
  it('goals = NaN loads as the fresh yard\'s goal state', () => {
    const g = stage2Game('r3');
    const raw = { salvage: { ...JSON.parse(JSON.stringify(g.salvage)), goals: NaN } };
    const L = reconcileSalvage(stage2Cfg('r3'), { ...g, salvage: undefined } as never, raw, g.salvage.clock.highMs);
    expect(L.salvage.goals).toEqual({ done: [], skipped: [], lastPromptAt: -1e9, repeats: 0 });
  });

  it('a mixed list keeps the known ids once, in their order; unknown strings, numbers and objects go', () => {
    const [a, b, c] = ids(cfg1, 'goals');
    const g = R.createSalvage(cfg1, E.createInitialState(cfg1 as never, FIXTURE_NOW), FIXTURE_NOW);
    const L = loadRun(cfg1, g, (gs) => ((gs.done = [b, 5, null, a, 'nope', b, {}, [c]]), (gs.skipped = [c, c, 7])));
    expect(L.salvage.goals.done).toEqual([b, a]);
    expect(L.salvage.goals.skipped).toEqual([c]);
  });

  it('a well-formed save keeps its goal state exactly (the first yard on the phone: nothing changes)', () => {
    const one = ids(cfg1, 'goals').slice(0, 4);
    const g = R.createSalvage(cfg1, E.createInitialState(cfg1 as never, FIXTURE_NOW), FIXTURE_NOW);
    const goals = { done: one.slice(0, 3), skipped: one.slice(3), lastPromptAt: 812.5, repeats: 2 };
    const L = reconcileSalvage(cfg1, { ...g, salvage: undefined } as never, { salvage: { ...JSON.parse(JSON.stringify(g.salvage)), goals } }, FIXTURE_NOW);
    expect(L.salvage.goals).toEqual(goals);
    expect(L.salvage.stage2Frozen).toBeUndefined();
  });

  it('release.stage 1: a stage-2 goal id waits aside (stage2Frozen.goals) and comes back at stage 2, in place after the first yard\'s', () => {
    const one = ids(cfg1, 'goals').slice(0, 2);
    const two = ids(cfg2, 'stage2').slice(0, 3);
    const g = R.createSalvage(cfg1, E.createInitialState(cfg1 as never, FIXTURE_NOW), FIXTURE_NOW);
    const goals = { done: [one[0], two[0], one[1], two[1]], skipped: [two[2]], lastPromptAt: -1e9, repeats: 0 };
    const L1 = reconcileSalvage(cfg1, { ...g, salvage: undefined } as never, { salvage: { ...JSON.parse(JSON.stringify(g.salvage)), goals } }, FIXTURE_NOW);
    expect(L1.salvage.goals.done).toEqual(one);
    expect(L1.salvage.goals.skipped).toEqual([]);
    expect((L1.salvage.stage2Frozen as { goals?: unknown }).goals).toEqual({ done: [two[0], two[1]], skipped: [two[2]] });
    // Loaded at stage 1 again: still aside, not doubled.
    const again = reconcileSalvage(cfg1, { ...L1, salvage: undefined } as never, JSON.parse(JSON.stringify({ salvage: L1.salvage })), FIXTURE_NOW);
    expect((again.salvage.stage2Frozen as { goals?: unknown }).goals).toEqual({ done: [two[0], two[1]], skipped: [two[2]] });
    // A build at stage 2: they come back.
    const L2 = reconcileSalvage(cfg2, { ...again, salvage: undefined } as never, JSON.parse(JSON.stringify({ salvage: again.salvage })), FIXTURE_NOW);
    expect(L2.salvage.goals.done).toEqual([...one, two[0], two[1]]);
    expect(L2.salvage.goals.skipped).toEqual([two[2]]);
    expect(L2.salvage.stage2Frozen).toBeUndefined();
  });
});
