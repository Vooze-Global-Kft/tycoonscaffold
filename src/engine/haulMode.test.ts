/**
 * The haul engine reached through the shared engine functions (src/engine/mode.ts): what the
 * store calls (createInitialState, reconcileState, tick, computeOffline, prestige, the incomes,
 * story and missions) runs the haul rules for a haul config once the haul engine is installed,
 * and the built-in rules for every other config even while it is installed.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import * as E from './economy';
import { FIXTURE_NOW, haulFixtures, haulTestConfig } from './fixtures/haul';
import * as H from './haul';
import { defaultJumpChoice, haulEngineMode } from './haulMode';
import * as M from './meta';
import { engineFor, installEngineMode } from './mode';
import type { GameState } from './types';

const cfg = haulTestConfig();
const pizzaCfg = GameConfigSchema.parse(pizza);

describe('engine-mode seam with the haul engine installed', () => {
  beforeAll(() => installEngineMode(haulEngineMode));
  afterAll(() => installEngineMode(null));

  it('dispatches only configs of its own mode', () => {
    expect(engineFor(cfg)).toBe(haulEngineMode);
    expect(engineFor(pizzaCfg)).toBeNull();
  });

  it('createInitialState builds a haul run', () => {
    const g = E.createInitialState(cfg, FIXTURE_NOW);
    expect(g.haul).toBeTruthy();
    expect(g.haul!.slots[0].claimed).toBe(true);
    expect(g.loadout?.sockets).toHaveLength(3);
    expect(g.stats.launches).toBe(0);
    // A sim config is untouched by the installed haul engine.
    expect(E.createInitialState(pizzaCfg, FIXTURE_NOW).haul).toBeUndefined();
  });

  it('reconcileState repairs a haul save and keeps a valid one', () => {
    const g = E.createInitialState(cfg, FIXTURE_NOW);
    const back = E.reconcileState(cfg, JSON.parse(JSON.stringify(g)), FIXTURE_NOW);
    expect(back.haul!.slots.length).toBe(g.haul!.slots.length);
    const junk = E.reconcileState(cfg, { haul: 'nope', cash: -3 }, FIXTURE_NOW);
    expect(junk.haul).toBeTruthy();
    expect(junk.cash).toBeGreaterThanOrEqual(0);
  });

  it('tick runs advanceHaul and reports haul events', () => {
    let g: GameState = E.createInitialState(cfg, FIXTURE_NOW);
    g = H.assignDrone(cfg, g as H.HaulGame, 0) as unknown as GameState;
    const events: unknown[] = [];
    for (let i = 0; i < 300; i++) g = E.tick(cfg, g, 0.1, FIXTURE_NOW, events as E.GameEvent[]);
    expect(g.haul!.clock).toBeCloseTo(30, 6);
    expect(g.stats.playSeconds).toBeCloseTo(30, 6);
    expect(events.some((e) => (e as H.HaulEvent).type === 'unload')).toBe(true);
  });

  it('incomes: steady (offline) and active come from the haul rates', () => {
    const { minute3, fresh } = haulFixtures(cfg);
    const g = minute3 as unknown as GameState;
    expect(E.activeIncomePerSecond(cfg, g, FIXTURE_NOW)).toBeCloseTo(H.haulIncome(cfg, minute3), 9);
    expect(E.incomePerSecond(cfg, g, FIXTURE_NOW)).toBeCloseTo(H.steadyRate(cfg, H.haulParams(cfg, minute3), minute3.haul), 9);
    // Without the autopilot the station earns nothing on its own.
    expect(E.incomePerSecond(cfg, fresh as unknown as GameState, FIXTURE_NOW)).toBe(0);
  });

  it('computeOffline returns the fast-forwarded game and the Shift Log report', () => {
    const { minute3 } = haulFixtures(cfg);
    const g = minute3 as unknown as GameState;
    const away = { ...g, lastSavedAt: FIXTURE_NOW - 3600_000, stats: { ...g.stats, clockHigh: FIXTURE_NOW - 3600_000 } };
    const r = E.computeOffline(cfg, away, FIXTURE_NOW);
    expect(r.seconds).toBeCloseTo(3600, 3);
    expect(r.game).toBeTruthy();
    expect(r.report).toBeTruthy();
    expect(r.earnings).toBeGreaterThanOrEqual(0);
  });

  it('prestige delegates to prestigeHaul with the given or the default condition', () => {
    const { late } = haulFixtures(cfg);
    const choice = defaultJumpChoice(cfg, late)!;
    expect(choice).toBeTruthy();
    const traitId = 'traitId' in choice ? choice.traitId : '';
    const after = E.prestige(cfg, late as unknown as GameState, FIXTURE_NOW, choice);
    expect(after.haul!.galaxy).toBe(1);
    expect(after.haul!.trait).toBe(traitId);
    expect(E.prestige(cfg, late as unknown as GameState, FIXTURE_NOW).haul!.galaxy).toBe(1);
  });

  it('the Jump in steps (errata 17): confirm through prestige, then the Star Map and startGalaxy; a restart comes back to the choice', () => {
    const { late } = haulFixtures(cfg);
    const gain = H.coresAvailable(cfg, late);
    const confirmed = E.prestige(cfg, late as unknown as GameState, FIXTURE_NOW, { step: 'confirm' }) as unknown as H.HaulGame;
    expect(confirmed.haul).toBeNull();
    expect(confirmed.prestigePoints).toBe(late.prestigePoints + gain);
    const pending = confirmed.haulStats.pendingJump!;
    expect(pending.offers.length).toBeGreaterThan(0);
    // The saved, restarted game is still waiting for its condition (reconcile keeps haul = null).
    const back = E.reconcileState(cfg, JSON.parse(JSON.stringify(confirmed)), FIXTURE_NOW) as unknown as H.HaulGame;
    expect(back.haul).toBeNull();
    expect(back.haulStats.pendingJump?.offers).toEqual(pending.offers);
    // Story triggers and incomes cope with the run-less state.
    expect(E.incomePerSecond(cfg, back as unknown as GameState, FIXTURE_NOW)).toBe(0);
    // A second confirm is refused; the start builds galaxy 1 with the chosen condition.
    expect(E.prestige(cfg, back as unknown as GameState, FIXTURE_NOW, { step: 'confirm' })).toBe(back);
    const started = H.startGalaxy(cfg, back, FIXTURE_NOW, pending.offers[0]);
    expect(started.haul!.galaxy).toBe(1);
    expect(started.haul!.trait).toBe(pending.offers[0]);
    expect(started.haulStats.pendingJump).toBeNull();
  });

  it('story triggers and mission usability of the haul mode', () => {
    const { fresh, minute3 } = haulFixtures(cfg);
    const beat = (trigger: unknown) => ({ ...cfg, story: [{ id: 'b', characterId: 'x', lines: ['l'], rewardGems: 0, trigger }] }) as typeof cfg;
    expect(E.pendingStoryBeat(beat({ type: 'system' }), minute3 as unknown as GameState)?.id).toBe('b');
    expect(E.pendingStoryBeat(beat({ type: 'system' }), fresh as unknown as GameState)).toBeNull();
    expect(E.pendingStoryBeat(beat({ type: 'ring', ring: 1 }), fresh as unknown as GameState)?.id).toBe('b');
    expect(E.pendingStoryBeat(beat({ type: 'galaxy', index: 1 }), fresh as unknown as GameState)).toBeNull();
    // Lifetime readings (haulStats): they hold after a Jump, while the new run has none of it yet.
    const { late, afterJump } = haulFixtures(cfg);
    const ringNow = late.haulStats.bestRing;
    expect(ringNow).toBeGreaterThan(1);
    expect(E.pendingStoryBeat(beat({ type: 'ring', ring: ringNow }), afterJump as unknown as GameState)?.id).toBe('b');
    expect(E.pendingStoryBeat(beat({ type: 'ring', ring: ringNow + 1 }), late as unknown as GameState)).toBeNull();
    expect(E.pendingStoryBeat(beat({ type: 'galaxy', index: 1 }), afterJump as unknown as GameState)?.id).toBe('b');
    expect(E.pendingStoryBeat(beat({ type: 'jumpReady', cores: cfg.haul.jumpReadyCores }), late as unknown as GameState)?.id).toBe(H.jumpPreview(cfg, late).ready ? 'b' : undefined);
    // Mission counters read the lifetime stats.
    const g = minute3 as unknown as GameState;
    const missions = M.refreshMissions(cfg, g, FIXTURE_NOW);
    expect(Array.isArray(missions.missions.slots)).toBe(true);
  });
});

describe('without an installed engine', () => {
  it('a haul config falls back to the built-in rules without throwing', () => {
    installEngineMode(null);
    const g = E.createInitialState(cfg, FIXTURE_NOW);
    expect(g.haul).toBeUndefined();
    expect(E.tick(cfg, g, 1, FIXTURE_NOW)).toBeTruthy();
  });
});
