/**
 * Regression gate for the first game (and the classic mode): the sim and classic engines on this
 * tree must give exactly the outputs the MAIN branch's engine gives. The recordings were made by
 * scripts/lib/recordModes.ts on a git archive of the main branch's commit (cc11615, before the
 * engine-mode seam), with that commit's own game files; the commit's full hash is stored in each
 * fixture. This test replays the same scenario (scripts/lib/modeScenario.ts) on this tree and
 * compares every output strictly. It never writes a fixture: a missing one fails (pizza-1).
 *
 * Configs here: Pizza Empire's shipped game.json (sim) and a frozen copy of Space Miner's last
 * classic game.json (fixtures/classic-space.json, the commit's games/space-miner/game.json plus the
 * soundPack key), so classic stays covered after Space Miner moved to haul.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { modeScenario, pinnedConfig, withoutAddedBlocks, CONFIG_ADDED_NOT_RULES, CONFIG_UNPINNED, INTENDED_DIFFERENCES, type ScenarioEngine } from '../../scripts/lib/modeScenario';
import { GameConfigSchema } from '../config/schema';
// The web build's presets (the bot): the phone file ./presets.ts has none.
import { buildPreset } from '../dev/presets.web';
import * as E from './economy';
import * as M from './meta';
import classicSpace from './fixtures/classic-space.json';

const FIXTURES = path.join(__dirname, 'fixtures');
const MAIN_COMMIT = /^cc11615[0-9a-f]{33}$/;

function fixture(name: string): Record<string, unknown> {
  const file = path.join(FIXTURES, name);
  if (!fs.existsSync(file)) throw new Error(`${name} is missing: record it from the main branch with "npx tsx scripts/lib/recordModes.ts" (never from this tree)`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const CONFIGS: Record<string, unknown> = { 'pizza-empire': pizza, 'classic-space': classicSpace };
const engine = { E, M, buildPreset } as unknown as ScenarioEngine;

describe('sim and classic engines give what the main branch gives', () => {
  const recorded = fixture('recorded-modes.json') as { commit: string; recordedBy: string; results: Record<string, Record<string, unknown>> };

  it('the recordings come from the main branch commit, by the recorder', () => {
    expect(recorded.commit).toMatch(MAIN_COMMIT);
    expect(recorded.recordedBy).toBe('scripts/lib/recordModes.ts');
    expect(Object.keys(recorded.results).sort()).toStrictEqual(Object.keys(CONFIGS).sort());
  });

  for (const [name, raw] of Object.entries(CONFIGS)) {
    const results = modeScenario(engine, GameConfigSchema.parse(raw));
    const keys = Object.keys(recorded.results[name] ?? {});
    it(`${name}: the scenario has the recorded outputs, no more and no fewer`, () => {
      expect(Object.keys(results).sort()).toStrictEqual(keys.sort());
    });
    for (const key of keys) {
      if ((INTENDED_DIFFERENCES as readonly string[]).includes(key)) continue;
      it(`${name}: ${key}`, () => {
        expect(results[key]).toStrictEqual(recorded.results[name][key]);
      });
    }

    // guard:new:3: the one intended difference from the main branch. With income, the gem Time Warp
    // is the main branch's to the bit; with zero income the main branch charged the gems for a warp
    // worth 0, and this tree refuses it: the same state with the gems still there.
    it(`${name}: buyWarpZero (intended difference: a warp worth 0 is refused, not charged)`, () => {
      const cfg = GameConfigSchema.parse(raw);
      const rec = recorded.results[name].buyWarpZero as { income: number; state: { gems: number } };
      const ours = results.buyWarpZero as { income: number; state: { gems: number } };
      expect(ours.income).toBe(rec.income);
      if (rec.income > 0) {
        expect(ours).toStrictEqual(rec);
        return;
      }
      // What the main branch did: 1000 gems in, the warp's price out, cash untouched.
      expect(rec.state.gems).toBe(1000 - cfg.economy.timeWarp.gemCost);
      expect(ours.state).toStrictEqual({ ...rec.state, gems: 1000 });
    });
  }

  it('the zero-income warp is really exercised for Pizza Empire (its early preset earns nothing yet)', () => {
    expect((recorded.results['pizza-empire'].buyWarpZero as { income: number }).income).toBe(0);
  });

  it('the parsed Pizza Empire config is the main branch one (store, app release ids, tracking text and soundPack aside)', () => {
    const pinned = fixture('recorded-pizza-config.json') as { commit: string; unpinned: string[]; config: unknown };
    expect(pinned.commit).toMatch(MAIN_COMMIT);
    expect(pinned.unpinned).toStrictEqual([...CONFIG_UNPINNED]);
    const parsed = GameConfigSchema.parse(pizza);
    // Blocks added after the main branch that no rule reads (the next test proves it) are not in the
    // recording, which is never re-recorded: they are taken out of this tree's config, nothing else is.
    for (const k of CONFIG_ADDED_NOT_RULES) expect(pinned.config, `the recording has no "${k}" block`).not.toHaveProperty(k);
    expect(pinnedConfig(withoutAddedBlocks(parsed))).toStrictEqual(pinned.config);
    expect(parsed.soundPack).toBe('warm');
    // The name under the icon and the slug are pinned (guard:new:2), not left out with the ids.
    expect((pinned.config as { app: unknown }).app).toStrictEqual({ displayName: 'Pizza Empire', slug: 'pizza-empire-idle' });
  });

  it('the blocks added since (reminders, leaderboards) are not gameplay: the scenario plays the same without them', () => {
    const parsed = GameConfigSchema.parse(pizza);
    for (const k of CONFIG_ADDED_NOT_RULES) expect(parsed, `Pizza Empire has a "${k}" block`).toHaveProperty(k);
    expect(modeScenario(engine, withoutAddedBlocks(parsed))).toStrictEqual(modeScenario(engine, parsed));
  });
});
