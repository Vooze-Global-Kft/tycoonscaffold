/// <reference types="node" />
/**
 * The haul mode's fx table (catalog.haul.ts, spec 6.2) against the sound package: the same keys
 * as scripts/audio/recipes_haul.py EVENTS (the table the sounds were rendered from), one file per
 * key in games/space-miner/assets/sfx, no file equal to one of Pizza Empire's, and the haptics rule
 * of 6.3 (no vibration for passive events).
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import fxCatalog from '../../../scripts/lib/fxCatalog.js';
import games from '../../../scripts/lib/games.js';
import { FX } from './catalog.haul';

const ROOT = path.join(__dirname, '..', '..', '..');
const recipeKeys = () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/audio/recipes_haul.py'), 'utf8');
  const body = src.slice(src.indexOf('EVENTS = {'), src.indexOf('\n}', src.indexOf('EVENTS = {')));
  return [...body.matchAll(/^\s+'([a-z0-9_]+)': \(/gm)].map((m) => m[1]);
};
const hash = (rel: string) => createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');

describe('the haul fx table', () => {
  it('has exactly the sound package\'s keys (recipes_haul.py EVENTS), 56 of them', () => {
    expect(Object.keys(FX).sort()).toEqual(recipeKeys().sort());
    expect(Object.keys(FX)).toHaveLength(56);
  });

  it('is what a haul game plays, briefs left out', () => {
    const table = fxCatalog.fxTableFor('haul');
    expect(Object.keys(table)).toEqual(Object.keys(FX));
    expect(JSON.stringify(table)).not.toMatch(/brief/);
  });

  it('every key has its own sound file, and none is a copy of a Pizza Empire file', () => {
    const sounds = games.listSounds('space-miner') as Record<string, string>;
    for (const key of Object.keys(FX)) expect(sounds[key], key).toBeDefined();
    const pizza = new Set(Object.values(games.listSounds('pizza-empire') as Record<string, string>).map(hash));
    for (const rel of Object.values(sounds)) expect(pizza.has(hash(rel)), rel).toBe(false);
  });

  it('passive events never vibrate (6.3)', () => {
    for (const key of ['rock_crumble', 'bonanza', 'vein_start', 'vein_end', 'hold_full', 'pod_arrive', 'freighter_land', 'hold_tick', 'credit_tick', 'rock_arrive']) {
      expect((FX as Record<string, { haptic?: unknown }>)[key].haptic, key).toBeUndefined();
    }
  });
});
