/// <reference types="node" />
/**
 * The runtime event table each game gets (scripts/lib/fxCatalog.js, written into
 * src/generated/activeGame.ts): the catalogue without the briefs, and without the events of
 * other modes. The synth scripts read the same catalogue (scripts/audio/make_sfx.py).
 */
import { describe, expect, it } from 'vitest';
import fxCatalog from '../../../scripts/lib/fxCatalog.js';
import games from '../../../scripts/lib/games.js';
import { FX, type FxDef } from './catalog';

const catalog: Record<string, FxDef> = FX;
const runtime = (def: FxDef) => {
  const { brief: _brief, modes: _modes, ...rest } = def;
  return rest;
};

describe('fx table per mode', () => {
  it('a sim game gets every event, in catalogue order, with the same numbers and no briefs', () => {
    const table = fxCatalog.fxTableFor('sim');
    expect(Object.keys(table)).toEqual(Object.keys(catalog));
    for (const [key, def] of Object.entries(catalog)) expect(table[key]).toEqual(runtime(def));
    expect(JSON.stringify(table)).not.toMatch(/brief|marimba|oven/i);
  });

  it('other modes do not get the restaurant scene\'s events', () => {
    const simOnly = Object.entries(catalog).filter(([, d]) => d.modes && !d.modes.includes('classic')).map(([k]) => k);
    expect(simOnly).toEqual(expect.arrayContaining(['cook_done', 'toss', 'bell', 'serve', 'door', 'rush_start']));
    for (const mode of ['classic', 'haul']) {
      const table = fxCatalog.fxTableFor(mode);
      for (const key of simOnly) expect(table[key]).toBeUndefined();
    }
    expect(fxCatalog.fxTableFor('classic').buy).toEqual(runtime(catalog.buy));
    // The haul mode plays its own catalogue only (catalog.haul.ts, tested in haulTable.test.ts).
    expect(fxCatalog.fxTableFor('haul').buy).toBeUndefined();
  });

  it('the generated file carries the table of the game\'s own mode', () => {
    expect(games.renderActiveGame('pizza-empire')).toContain('  cook_done: {');
    expect(games.renderActiveGame('space-miner')).not.toContain('cook_done');
    expect(games.renderModeEntry('pizza-empire')).toContain("import entry from '../modes/sim';");
    expect(games.renderModeEntry('space-miner')).toContain("import entry from '../modes/haul';");
  });
});
