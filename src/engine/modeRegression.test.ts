/**
 * Regression gate for the engine-mode seam (src/engine/mode.ts): the sim and classic engines
 * must give exactly the outputs they gave before the haul mode was wired in. The outputs below
 * were recorded on the tree before the seam existed (RECORD=1 npx vitest run
 * src/engine/modeRegression.test.ts writes them); this test replays the same scenario and
 * compares every output, bit for bit (as JSON).
 *
 * Configs: Pizza Empire's shipped game.json (sim) and a frozen copy of Space Miner's last classic
 * game.json (fixtures/classic-space.json), so classic stays covered after Space Miner moved to haul.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema, type GameConfig } from '../config/schema';
import { buildPreset } from '../dev/presets';
import * as E from './economy';
import * as M from './meta';
import classicSpace from './fixtures/classic-space.json';
import type { GameState } from './types';

const FILE = path.join(__dirname, 'fixtures', 'recorded-modes.json');
const NOW = Date.UTC(2026, 10, 1, 9, 0, 0);

function scenario(cfg: GameConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const fresh = E.createInitialState(cfg, NOW);
  out.fresh = fresh;
  // A few minutes of the preset bot (ticks, buys, hires), then the meta systems.
  const early = buildPreset(cfg, 'early', NOW);
  out.early = early;
  out.income = E.incomePerSecond(cfg, early, NOW);
  // Offline: two hours away.
  out.offline = E.computeOffline(cfg, { ...early, lastSavedAt: NOW - 2 * 3600_000 }, NOW);
  // A tick with events.
  const events: E.GameEvent[] = [];
  let s: GameState = early;
  for (let i = 0; i < 30; i++) s = E.tick(cfg, s, 0.1, NOW + i * 100, events);
  out.ticked = s;
  out.events = events;
  // Saves: the state itself, a v1-looking save, garbage.
  out.reconciled = E.reconcileState(cfg, JSON.parse(JSON.stringify(s)), NOW);
  out.reconciledV1 = E.reconcileState(cfg, { version: 1, cash: 12, businesses: { x: { owned: 3 } } }, NOW);
  out.reconciledJunk = E.reconcileState(cfg, { cash: 'lots', venues: 7, stats: null }, NOW);
  // Prestige with enough lifetime earnings for a few points.
  const rich = { ...s, lifetimeEarnings: E.lifetimeForPrestigePoints(cfg, 5) * 1.01 };
  out.prestige = E.prestige(cfg, rich, NOW);
  out.timeWarp = E.timeWarp(cfg, s, 2, NOW).cash;
  out.missions = M.refreshMissions(cfg, s, NOW).missions;
  out.cashForSeconds = M.cashForSeconds(cfg, s, 120, NOW);
  out.story = E.pendingStoryBeat(cfg, { ...s, storySeen: [] })?.id ?? null;
  return out;
}

const CONFIGS: Record<string, unknown> = { 'pizza-empire': pizza, 'classic-space': classicSpace };

describe('sim and classic engines are unchanged by the engine-mode seam', () => {
  const results: Record<string, unknown> = {};
  for (const [name, raw] of Object.entries(CONFIGS)) {
    const cfg = GameConfigSchema.parse(raw);
    results[name] = JSON.parse(JSON.stringify(scenario(cfg)));
  }
  if (process.env.RECORD === '1') {
    fs.writeFileSync(FILE, JSON.stringify(results));
    it('recorded', () => expect(true).toBe(true));
    return;
  }
  const recorded = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, Record<string, unknown>>;
  for (const name of Object.keys(CONFIGS)) {
    for (const key of Object.keys(recorded[name])) {
      it(`${name}: ${key}`, () => {
        expect((results[name] as Record<string, unknown>)[key]).toEqual(recorded[name][key]);
      });
    }
  }
  it('the parsed Pizza Empire config is the recorded one', () => {
    const parsedFile = path.join(__dirname, 'fixtures', 'recorded-pizza-config.json');
    const cfg = JSON.parse(JSON.stringify(GameConfigSchema.parse(pizza)));
    if (!fs.existsSync(parsedFile)) fs.writeFileSync(parsedFile, JSON.stringify(cfg));
    expect(cfg).toEqual(JSON.parse(fs.readFileSync(parsedFile, 'utf8')));
  });
});
