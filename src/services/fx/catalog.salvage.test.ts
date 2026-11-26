/// <reference types="node" />
/**
 * The salvage mode's fx table (./catalog.salvage.ts, written by scripts/audio/yard/render_yard.py --catalog):
 * every key of docs/design/yard-stage1.md section 7 is there, every key has its file in
 * games/scrap-yard/assets/sfx (and no file lacks a key), the haptics are section 7's, the segments can be
 * chained at their period, and the event map (src/modes/salvage/soundKeys.ts) names only keys of this table.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import fxCatalog from '../../../scripts/lib/fxCatalog.js';
import { SALVAGE_LOADING_SOUNDS, SALVAGE_SEGMENT_MS, SALVAGE_SHARED_SOUNDS } from '../../modes/salvage/soundKeys';
import type { FxDef } from './catalog';
import { FX } from './catalog.salvage';
import { fileKeys } from './variants';

const table: Record<string, FxDef> = FX;
const SFX = path.resolve(__dirname, '../../../games/scrap-yard/assets/sfx');

/** yard-stage1.md 7, as a list (the keys and the music). */
const SECTION_7 = [
  'step_concrete', 'step_gravel', 'step_asphalt',
  'cut_spanner', 'cut_sledge', 'cut_grinder', 'cut_torch',
  'piece_steel', 'piece_cast', 'piece_alu', 'piece_copper', 'piece_brass', 'thud_waste',
  'pickup', 'swap', 'load_full', 'feed',
  'scale_beeps', 'scale_print', 'slip',
  'flatbed_arrive', 'flatbed_load', 'coin', 'coin_big',
  'lesson', 'deal_stamp',
  'ui_open', 'ui_close', 'buy', 'denied',
  'van', 'set_down', 'crane_set', 'door', 'crew_hello',
  'stripper_hand', 'stripper_power', 'bench_knock',
  'furnace_roar', 'ready_chime', 'pour_glug', 'cool_ticks',
  'truck_diesel', 'truck_reverse', 'hook_swap', 'skip_tip',
  'chip_slide', 'rung_sign',
  'load_crane', 'load_clank', 'load_beeps', 'load_pour', 'load_loop', 'gate_open',
  'amb_yard',
  'music_main',
];
/** Keys this table adds (named in the sound notes for the screens engineers). */
const ADDED = ['goal_tick', 'load_cool'];

function filesOnDisk(): Set<string> {
  return new Set(fs.readdirSync(SFX).filter((f) => /\.(wav|m4a)$/.test(f)).map((f) => f.replace(/\.(wav|m4a)$/, '')));
}

describe('the salvage fx table', () => {
  it('holds every key of section 7 and the two it adds, nothing else', () => {
    expect(Object.keys(table).sort()).toEqual([...SECTION_7, ...ADDED].sort());
  });

  it('is what the app gets (scripts/lib/fxCatalog.js reads the same numbers)', () => {
    const runtime = fxCatalog.fxTableFor('salvage');
    for (const [key, def] of Object.entries(table)) {
      const { brief: _b, modes: _m, ...rest } = def;
      expect(runtime[key]).toEqual(rest);
    }
  });

  it('every file a key plays exists, and every file belongs to a key', () => {
    const disk = filesOnDisk();
    const wanted = new Set<string>();
    for (const [key, def] of Object.entries(table)) for (const f of fileKeys(key, def)) wanted.add(f);
    expect([...wanted].filter((f) => !disk.has(f))).toEqual([]);
    expect([...disk].filter((f) => !wanted.has(f))).toEqual([]);
  });

  it('the music is the one loop, and only music loops', () => {
    expect(Object.entries(table).filter(([, d]) => d.loop).map(([k]) => k)).toEqual(['music_main']);
    expect(fs.existsSync(path.join(SFX, 'music_main.m4a'))).toBe(true);
  });

  it('volumes are in the house range and several files take turns or form a ladder', () => {
    for (const [key, def] of Object.entries(table)) {
      expect(def.volume, key).toBeGreaterThan(0.1);
      expect(def.volume, key).toBeLessThanOrEqual(0.9);
      if ((def.files ?? 1) > 1) expect(['random', 'ladder'], key).toContain(def.pick);
    }
    expect(table.furnace_roar).toMatchObject({ files: 3, pick: 'ladder' });
    expect(table.truck_diesel).toMatchObject({ files: 3, pick: 'ladder' });
  });

  it('haptics are section 7\'s: light on a finished piece, medium on a collection, success on a rung', () => {
    for (const k of ['piece_steel', 'piece_cast', 'piece_alu', 'piece_copper', 'piece_brass', 'thud_waste']) expect(table[k].haptic, k).toEqual(['light']);
    for (const k of ['coin', 'coin_big']) expect(table[k].haptic, k).toEqual(['medium']);
    expect(table.rung_sign.haptic).toEqual(['success']);
    // what the yard does on its own never vibrates
    for (const k of ['amb_yard', 'flatbed_arrive', 'flatbed_load', 'van', 'truck_diesel', 'furnace_roar', 'stripper_power', 'pickup', 'step_concrete'])
      expect(table[k].haptic, k).toBeUndefined();
    const withHaptic = Object.entries(table).filter(([, d]) => d.haptic).map(([k]) => k);
    expect(withHaptic.length).toBeLessThanOrEqual(11);
    for (const [k, d] of Object.entries(table)) if (d.haptic) expect(d.haptic.filter((s) => typeof s === 'string').length, k).toBe(1);
  });

  it('sounds that repeat within a second have variants', () => {
    for (const k of ['step_concrete', 'step_gravel', 'step_asphalt', 'piece_steel', 'piece_cast', 'piece_alu', 'piece_copper', 'piece_brass', 'pickup', 'coin', 'feed'])
      expect(table[k].files ?? 1, k).toBeGreaterThanOrEqual(2);
  });

  it('segments: each chained key exists and its minimum interval is under its period', () => {
    for (const [key, every] of Object.entries(SALVAGE_SEGMENT_MS)) {
      expect(table[key], key).toBeDefined();
      expect(table[key].minIntervalMs ?? 30, key).toBeLessThan(every);
      expect(table[key].voices ?? 1, key).toBeGreaterThanOrEqual(2);
    }
  });

  it('the shared map and the loading ids point at keys of this table', () => {
    for (const v of Object.values(SALVAGE_SHARED_SOUNDS)) expect(table[v], v).toBeDefined();
    for (const v of Object.values(SALVAGE_LOADING_SOUNDS)) expect(table[v], v).toBeDefined();
  });

  it('the pack stays within its budget (3.0 MB, music included)', () => {
    let bytes = 0;
    for (const f of fs.readdirSync(SFX)) bytes += fs.statSync(path.join(SFX, f)).size;
    expect(bytes).toBeLessThanOrEqual(3_000_000);
  });
});
