/**
 * RULING2.md 14.4 (the attack on the engine step, finding 2; stage 2 2.17): THE CHECKS FOLLOW THE STATE,
 * NOT THE PASS. An absence played as one away pass equals the same absence cut into several passes back to
 * back, ALSO when a rung is reached inside it (the rung decides when the crew's runs begin, 14.1). Before
 * the fix the checks ran on a 60 s timer that restarted with every pass, plus a forced check at each pass's
 * end, so the yard second at which rung 3 was noticed depended on where the absence was cut (15 of 20
 * states differed, by up to 8.8 % in cash). The attacker's split, split2 and split3 tests
 * (attack/engine2/), on the real content as the bots play it. Owner: engine2-fixB.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { awayPass } from './away';
import { newBot, playTo, seededCfg, startGame, type Bot } from './bot';
import type { SalvageConfig, SalvageGame } from './types';

const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);
let raw: Record<string, unknown> | null = null;

/** The real content, seeded; `group` replaces the content's run settings when given (a new object each call). */
function cfgOf(seed: number, group?: Record<string, number>): SalvageConfig {
  if (!raw) raw = SalvageSchema.parse(JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage) as Record<string, unknown>;
  const c = { ...raw, ...(group ? { group: { ...((raw.group as Record<string, number>) ?? {}), ...group } } : {}) };
  return seededCfg({ mode: 'salvage', salvage: c } as unknown as SalvageConfig, seed);
}

const botOf = (cfg: SalvageConfig, seed: number): Bot => newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed });

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

/** Paths where two plain values differ (the first few). */
function diff(a: unknown, b: unknown, path = '', out: string[] = []): string[] {
  if (out.length >= 6) return out;
  if (typeof a === 'number' && typeof b === 'number') {
    if (!(a === b || Math.abs(a - b) <= 1e-6)) out.push(`${path}: ${a} vs ${b}`);
    return out;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (a !== b) out.push(`${path}: ${JSON.stringify(a)?.slice(0, 60)} vs ${JSON.stringify(b)?.slice(0, 60)}`);
    return out;
  }
  for (const k of new Set([...Object.keys(a as object), ...Object.keys(b as object)])) {
    const va = (a as Record<string, unknown>)[k];
    const vb = (b as Record<string, unknown>)[k];
    if (va !== undefined || vb !== undefined) diff(va, vb, `${path}.${k}`, out);
  }
  return out;
}

/** The game without what legitimately differs between one pass and several: the card, the epoch, the clock, the act's start. */
function core(g: SalvageGame): unknown {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['away', 'epoch', 'clock']) delete s[k];
  // Each pass ends the boss's act at its start (away.ts cancelAct): when it was ended is no part of the yard.
  if (s.act) delete (s.act as Record<string, unknown>).since;
  return { cash: Math.round(g.cash * 100), earned: Math.round(g.lifetimeEarnings * 100), s };
}

/** One pass of `T` ms against the same absence cut at the given fractions (back to back). */
function cut(cfg: SalvageConfig, g0: SalvageGame, T: number, at: number[]): { whole: SalvageGame; parts: SalvageGame } {
  const from = g0.salvage.clock.highMs;
  const whole = awayPass(cfg, g0, from + T);
  let parts = g0;
  for (const c of [...at, 1].sort((a, b) => a - b)) parts = awayPass(cfg, parts, from + Math.round(c * T));
  return { whole, parts };
}

const leave = (g: SalvageGame): SalvageGame => ({ ...g, lastSavedAt: g.salvage.clock.highMs }) as SalvageGame;

describe('an absence cut into passes equals one pass when a rung is reached inside it (14.4; the attacker split2)', () => {
  for (const seed of [31, 47, 63, 77, 101]) {
    it(`seed ${seed}: rung-2 states at minutes 40, 45, 50, 54, 1.9 h away, one pass against eleven`, () => {
      const cfg = cfgOf(seed);
      const b = botOf(cfg, seed);
      let crossed = 0;
      for (const m of [40, 45, 50, 54]) {
        playTo(b, m * 60);
        if (b.g.salvage.ladder.rung >= 3) break;
        const g0 = leave(b.g);
        const rnd = lcg(seed * 7 + m);
        const { whole, parts } = cut(cfg, g0, 1.9 * 3600_000, Array.from({ length: 10 }, () => rnd()));
        if (whole.salvage.ladder.rung > g0.salvage.ladder.rung) crossed++;
        expect(diff(core(whole), core(parts)), `minute ${m}`).toEqual([]);
      }
      // The case the finding is about: a rung reached while away.
      expect(crossed).toBeGreaterThan(0);
    }, 600_000);
  }
});

describe('the same with runs off and with runs from rung 1 (the attacker split3)', () => {
  for (const seed of [31, 47]) {
    for (const [name, grp] of [
      ['no runs', { fromRung: 99 }],
      ['runs from rung 1', { fromRung: 1 }],
      ['the content', undefined],
    ] as const) {
      it(`seed ${seed}, ${name}: minute 40, 1.9 h away, one pass against two and against eleven`, () => {
        const b = botOf(cfgOf(seed), seed);
        playTo(b, 40 * 60);
        const cfg = cfgOf(seed, grp as Record<string, number> | undefined);
        const g0 = leave(b.g);
        const rnd = lcg(seed * 7 + 40);
        const ten = cut(cfg, g0, 1.9 * 3600_000, Array.from({ length: 10 }, () => rnd()));
        const two = cut(cfg, g0, 1.9 * 3600_000, [0.5]);
        expect(diff(core(ten.whole), core(ten.parts))).toEqual([]);
        expect(diff(core(two.whole), core(two.parts))).toEqual([]);
      }, 600_000);
    }
  }
});

describe('at a fixed rung (the attacker split) and what the checks still do away', () => {
  it('seeds 31 and 63 at minute 60: 3.9 h away, one pass against two and against eleven', () => {
    for (const seed of [31, 63]) {
      const cfg = cfgOf(seed);
      const b = botOf(cfg, seed);
      playTo(b, 3600);
      const g0 = leave(b.g);
      const rnd = lcg(seed * 13 + 3);
      const two = cut(cfg, g0, 3.9 * 3600_000, [0.5]);
      expect(diff(core(two.whole), core(two.parts)), `seed ${seed} two`).toEqual([]);
      const ten = cut(cfg, g0, 3.9 * 3600_000, Array.from({ length: 10 }, () => rnd()));
      expect(diff(core(ten.whole), core(ten.parts)), `seed ${seed} ten`).toEqual([]);
    }
  }, 600_000);

  it('away, the rung is noticed at the instant of the lot that crosses it and the goals at the minute; goalsAt is a whole second the away card does not count as play', () => {
    const seed = 31;
    const cfg = cfgOf(seed);
    const b = botOf(cfg, seed);
    playTo(b, 40 * 60);
    const g0 = leave(b.g);
    expect(g0.salvage.ladder.rung).toBe(2);
    const out = awayPass(cfg, g0, g0.salvage.clock.highMs + 1.9 * 3600_000);
    expect(out.salvage.ladder.rung).toBe(3);
    const at = out.salvage.counts!.goalsAt;
    expect(Number.isInteger(at)).toBe(true);
    expect(Math.floor(out.salvage.t / 60) - Math.floor(at / 60)).toBeLessThanOrEqual(1);
    // A game in which nothing was done: the goals' second alone is no play, so no away card.
    const fresh = startGame(cfg, NOW);
    const once = awayPass(cfg, fresh, NOW + 2 * 60_000);
    const twice = awayPass(cfg, leave(once), once.salvage.clock.highMs + 2 * 60_000);
    expect(twice.salvage.away ?? null).toBeNull();
  }, 600_000);
});
