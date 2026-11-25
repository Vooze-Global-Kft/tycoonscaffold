/**
 * 8.3 and ECONOMY.md E17, "ticking equals jumping", on PLAYED states with a stale boss (the screen in the
 * background: no new presence samples). The earlier test (tick.test.ts) passed on its own built states
 * only; the bots engineer found a reachable state where the two disagreed (17:30, bots/gate5-state.json):
 * a yard hand left for the bench's tray at an instant the jump had not yet credited the bench to, so he
 * claimed 45 g where the ticked yard had 285 g. Fix: tick.ts `advance` credits the rate machines to every
 * instant before anything at it reads them. Owner: rules-sim (rules desk).
 */
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { FIXTURE_NOW, SALVAGE_TEST } from '../fixtures/salvage';
import gate5 from '../fixtures/salvage-gate5.json';
import * as R from '../salvage';
import { newBot, playTo, seededCfg, startGame } from './bot';
import type { SalvageConfig, SalvageGame } from './types';

/** The stale boss: his last sample 100 s old; `drop` also ends his act (the bots' form of the gate). */
function stale(g: SalvageGame, drop: boolean): SalvageGame {
  const s = g.salvage;
  return { ...g, salvage: { ...s, presenceAt: s.t - 100, ...(drop ? { act: { kind: 'none', target: null, since: s.t, endsAt: null } } : {}) } } as SalvageGame;
}

/** What differs after `seconds` of 0.1 s ticks against one jump (empty when they agree). */
function differs(cfg: SalvageConfig, g: SalvageGame, now: number, seconds: number): string[] {
  let a = g;
  let ms = now;
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    ms += 100;
    a = R.advanceSalvage(cfg, a, 0.1, ms);
  }
  const j = R.jump(cfg, g, g.salvage.t + seconds);
  const d: string[] = [];
  if (Math.abs(a.cash - j.cash) > 0.011) d.push(`cash ${a.cash} vs ${j.cash}`);
  if (a.salvage.ladder.supplied_g !== j.salvage.ladder.supplied_g) d.push(`supplied ${a.salvage.ladder.supplied_g} vs ${j.salvage.ladder.supplied_g}`);
  for (const k of Object.keys(a.salvage.bays)) if (a.salvage.bays[k].g !== j.salvage.bays[k].g) d.push(`bay ${k} ${a.salvage.bays[k].g} vs ${j.salvage.bays[k].g}`);
  if (a.salvage.things.length !== j.salvage.things.length) d.push('things');
  if (a.salvage.pieces.length !== j.salvage.pieces.length) d.push('pieces');
  if (a.salvage.waste_g !== j.salvage.waste_g) d.push('waste');
  const crew = (x: SalvageGame) => x.salvage.crew.map((m) => `${m.id}:${m.job}/${m.phase}/${m.load.map((p) => p.g).join('+')}`).join(',');
  if (crew(a) !== crew(j)) d.push(`crew ${crew(a)} vs ${crew(j)}`);
  const trays = (x: SalvageGame) => JSON.stringify(Object.values(x.salvage.machines).map((m) => m.tray_g));
  if (trays(a) !== trays(j)) d.push('trays');
  return d;
}

describe('ticking equals jumping on played states (stale boss)', () => {
  it("the bots engineer's state (17:30, seed 5, minute 31): 45 s of ticks equal one jump", () => {
    const c = SalvageSchema.parse(gate5.content);
    const cfg = { mode: 'salvage', salvage: { ...c, worldSeed: gate5.worldSeed } } as unknown as SalvageConfig;
    const g = gate5.g as unknown as SalvageGame;
    expect(differs(cfg, stale(g, true), gate5.now, 45)).toEqual([]);
    expect(differs(cfg, stale(g, false), gate5.now, 45)).toEqual([]);
  });

  it('the frozen played states m5, m15, m30 and back: 60 s each', async () => {
    const { fixtureGame } = await import('../fixtures/salvage');
    const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
    const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
    for (const n of ['m5', 'm15', 'm30', 'back'] as const) {
      const g = fixtureGame(n, base, FIXTURE_NOW);
      for (const drop of [false, true]) expect(differs(cfg, stale(g, drop), g.salvage.clock.highMs, 60), `${n} ${drop}`).toEqual([]);
    }
  }, 60_000);

  it("a bot's game on the test content, every three minutes to minute 24 (two seeds, both openings)", () => {
    const NOW = Date.UTC(2026, 10, 25, 9);
    for (const [seed, route] of [[3, 'A'], [8, 'B']] as const) {
      const cfg = seededCfg({ mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig, seed);
      const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route, seed });
      for (let m = 3; m <= 24; m += 3) {
        playTo(b, m * 60);
        for (const drop of [false, true]) expect(differs(cfg, stale(b.g, drop), b.now, 30), `seed ${seed} minute ${m} ${drop}`).toEqual([]);
      }
    }
  }, 60_000);
});
