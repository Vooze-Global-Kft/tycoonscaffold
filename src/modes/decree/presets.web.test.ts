/**
 * The web presets (presets.web.ts): fresh is a new game; early, mid and late are a reader's state or,
 * while a rule a run needs is not built (or the run never gets there), the rules' fixtures. Runs on the
 * frozen test content (lesson 4); it never pins which of the two a preset is today.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as R from '../../engine/decree';
import { decreeEngineMode } from '../../engine/decreeMode';
import { installEngineMode } from '../../engine/mode';
import { decreeTestConfig } from '../../engine/fixtures/decree';
import { PRESET_STOPS, botPresetState, decreePreset } from './presets.web';

describe('decree web presets', () => {
  const cfg = decreeTestConfig();
  const now = Date.UTC(2026, 10, 24, 12);
  // The app's entry installs the decree rules before any preset is built (src/modes/decree/index.tsx).
  beforeAll(() => installEngineMode(decreeEngineMode));
  afterAll(() => installEngineMode(null));
  it('fresh is a new decree game dated now', () => {
    const g = decreePreset(cfg, 'fresh', now) as R.DecreeGame;
    expect(g.decree.office).toBe(0);
    expect(g.lastSavedAt).toBe(now);
  });
  it('early, mid and late give a decree state dated now, from the bot or the fixtures', () => {
    for (const name of ['early', 'mid', 'late'] as const) {
      const g = decreePreset(cfg, name, now) as R.DecreeGame;
      expect(g.decree, name).toBeTruthy();
      expect(g.lastSavedAt).toBe(now);
      expect(g.stats.clockHigh).toBe(now);
      expect(g.stats.playSeconds).toBeGreaterThan(0);
    }
  });
  it('a bot state is the reader stopped at its moment, or names why not', () => {
    const r = botPresetState(cfg, 'early');
    if (r.game) expect(r.game.stats.playSeconds).toBeGreaterThan(0);
    else expect(r.why).toMatch(/not built|crashed|did not reach/);
    const g0 = r.game ?? (decreePreset(cfg, 'mid', now) as R.DecreeGame);
    expect(PRESET_STOPS.mid.stop({ ...g0, stats: { ...g0.stats, playSeconds: 27 * 60 }, decree: { ...g0.decree, office: 1, phase: 'governing' } } as R.DecreeGame)).toBe(true);
    expect(PRESET_STOPS.late.stop({ ...g0, decree: { ...g0.decree, office: 2, term: 3, phase: 'governing' } } as R.DecreeGame)).toBe(true);
  });
}, 120_000);
