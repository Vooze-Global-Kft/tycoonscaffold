/**
 * The figures a leaderboard may rank (src/engine/scores.ts): whole numbers a platform can store,
 * the shared ones for every game and each mode's own.
 */
import { afterEach, describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { buildPreset } from '../dev/presets.web';
import * as E from './economy';
import { haulFixtures, haulTestConfig } from './fixtures/haul';
import { mergeFixtures, mergeTestConfig } from './fixtures/merge';
import { haulEngineMode } from './haulMode';
import { mergeEngineMode } from './mergeMode';
import { installEngineMode } from './mode';
import { SHARED_METRICS, asScore, metricNames, scoresOf } from './scores';

const cfg = GameConfigSchema.parse(pizza);
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

afterEach(() => installEngineMode(null));

const whole = (scores: Record<string, number>) => Object.values(scores).every((v) => Number.isSafeInteger(v) && v >= 0);

describe('a score as a platform stores it', () => {
  it('is a whole number from 0 up', () => {
    expect(asScore(12.9)).toBe(12);
    expect(asScore(0)).toBe(0);
    expect(asScore(-3)).toBe(0);
    expect(asScore(NaN)).toBe(0);
    expect(asScore(Infinity)).toBe(0);
    expect(asScore('7')).toBe(0);
    expect(asScore(undefined)).toBe(0);
  });

  it('never leaves the range both platforms keep exactly', () => {
    expect(asScore(1e300)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('the figures of a sim game (Pizza Empire)', () => {
  it('are the shared ones and nothing else', () => {
    const mid = buildPreset(cfg, 'mid', NOW);
    expect(metricNames(cfg, mid)).toEqual([...SHARED_METRICS]);
    const s = scoresOf(cfg, mid);
    expect(whole(s)).toBe(true);
    expect(s.sales).toBe(Math.floor(mid.stats.served));
    expect(s.levels).toBe(mid.stats.levelsBought);
    expect(s.levels).toBeGreaterThan(0);
  });

  it('start at zero', () => {
    expect(scoresOf(cfg, E.createInitialState(cfg, NOW))).toEqual({ prestiges: 0, sales: 0, levels: 0 });
  });

  it('never fall at the run reset', () => {
    const late = buildPreset(cfg, 'late', NOW);
    const before = scoresOf(cfg, late);
    const after = scoresOf(cfg, E.prestige(cfg, { ...late, lifetimeEarnings: cfg.economy.prestige.threshold * 1e6 }, NOW));
    for (const name of SHARED_METRICS) expect(after[name]).toBeGreaterThanOrEqual(before[name]);
    expect(after.prestiges).toBe(before.prestiges + 1);
  });
});

describe("a mode's own figures", () => {
  it('merge: tickets, parades, merges, seasons, lanterns and goods, beside the shared ones', () => {
    const mcfg = mergeTestConfig();
    installEngineMode(mergeEngineMode);
    const g = mergeFixtures(mcfg).minute10;
    const s = scoresOf(mcfg, g);
    expect(Object.keys(s)).toEqual([...SHARED_METRICS, 'tickets', 'parades', 'merges', 'seasons', 'lanterns', 'goods']);
    expect(whole(s)).toBe(true);
    expect(s.tickets).toBe(g.merge.feats.tickets);
    expect(s.lanterns).toBe(g.merge.lanterns.length);
    expect(s.tickets).toBeGreaterThan(0);
  });

  it('haul: launches, contracts, hauled, depleted and jumps, beside the shared ones', () => {
    const hcfg = haulTestConfig();
    installEngineMode(haulEngineMode);
    const g = haulFixtures(hcfg).minute3 as never;
    const s = scoresOf(hcfg, g);
    expect(Object.keys(s)).toEqual([...SHARED_METRICS, 'launches', 'contracts', 'hauled', 'depleted', 'jumps']);
    expect(whole(s)).toBe(true);
    expect(s.launches).toBeGreaterThan(0);
  }, 120_000);

  it('are not read for a config of another mode', () => {
    installEngineMode(mergeEngineMode);
    expect(metricNames(cfg, E.createInitialState(cfg, NOW))).toEqual([...SHARED_METRICS]);
  });
});
