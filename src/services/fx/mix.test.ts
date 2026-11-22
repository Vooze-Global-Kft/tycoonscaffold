import { describe, expect, it } from 'vitest';
import { FX, type FxDef } from './catalog';
import { MUSIC, planSounds, preloadFirst, voicesOf } from './mix';
import { fileKeys } from './variants';

const catalog: Record<string, FxDef> = FX;
const names = Object.keys(catalog);
const PRELOAD_FIRST = preloadFirst(catalog);
const VOICES = voicesOf(catalog);
const PULSES = ['light', 'medium', 'heavy', 'soft', 'rigid', 'select', 'success', 'warning', 'error'];

/** A bundle with a file for every catalogue entry: key -> a made-up asset id. */
function fullBundle(): Record<string, number> {
  const files: Record<string, number> = {};
  let id = 1;
  for (const name of names) for (const key of fileKeys(name, catalog[name])) files[key] = id++;
  return files;
}

describe('the catalogue', () => {
  it('has sane numbers in every entry', () => {
    for (const name of names) {
      const def = catalog[name];
      expect(name, 'keys are lowercase snake_case, like the files').toMatch(/^[a-z][a-z0-9_]*$/);
      expect(def.volume, name).toBeGreaterThan(0);
      expect(def.volume, name).toBeLessThanOrEqual(1);
      if (def.minIntervalMs !== undefined) expect(def.minIntervalMs, name).toBeGreaterThan(0);
      if (def.files !== undefined) expect(Number.isInteger(def.files) && def.files >= 1, name).toBe(true);
      if ((def.files ?? 1) > 1) expect(def.pick, `${name} has several files, so it needs a pick mode`).toBeDefined();
      for (const step of def.haptic ?? []) {
        if (typeof step === 'number') expect(step, name).toBeGreaterThan(0);
        else expect(PULSES, name).toContain(step);
      }
      if (def.haptic) expect(typeof def.haptic[def.haptic.length - 1], `${name} ends on a pulse`).toBe('string');
    }
  });

  it('no file key belongs to two entries', () => {
    const keys = names.flatMap((name) => fileKeys(name, catalog[name]));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps the keys the UI and the synth script were promised', () => {
    // Keys may be added, never renamed or removed.
    for (const key of ['ui_tap', 'tap', 'combo_up', 'coin', 'cash', 'buy', 'milestone', 'unlock', 'prestige', 'bell', 'chest_open', 'reveal_legendary', 'blip_mid', 'music_main']) {
      expect(names).toContain(key);
    }
    expect(catalog.tap).toMatchObject({ files: 8, pick: 'ladder' });
    expect(catalog.coin).toMatchObject({ files: 3, pick: 'random' });
    expect(catalog[MUSIC].loop).toBe(true);
  });

  it('the preload order and voices read from the catalogue are the ones the mix always had', () => {
    expect(PRELOAD_FIRST).toEqual([
      'ui_tap', 'tap', 'buy', 'coin', 'ui_tab', 'ui_denied', 'cash', 'bell', 'cook_done', 'toss', 'serve',
      'pickup', 'happy', 'door', 'ui_open', 'ui_close', 'card_flip', 'blip_mid', 'blip_low', 'blip_high', 'chest_shake', 'hint',
    ]);
    expect(VOICES).toEqual({ tap: 2, buy: 3, cash: 2, bell: 3, cook_done: 2, card_flip: 2, reveal_common: 2, reveal_rare: 2 });
  });

  it('the engine tables only name real one-shot events', () => {
    for (const name of [...PRELOAD_FIRST, ...Object.keys(VOICES)]) {
      expect(names).toContain(name);
      expect(catalog[name].loop).not.toBe(true);
    }
    expect(new Set(PRELOAD_FIRST).size).toBe(PRELOAD_FIRST.length);
  });
});

describe('planSounds', () => {
  it('with every file present: one spec per one-shot file, music apart, nothing missing', () => {
    const files = fullBundle();
    const plan = planSounds(catalog, files);
    const oneShotKeys = names.filter((n) => !catalog[n].loop).flatMap((n) => fileKeys(n, catalog[n]));
    expect(plan.sounds.map((s) => s.key).sort()).toEqual([...oneShotKeys].sort());
    expect(plan.music).toEqual({ key: 'music_main', source: files.music_main, volume: catalog.music_main.volume });
    expect(plan.missing).toEqual([]);
    expect(plan.unused).toEqual([]);
    const tap3 = plan.sounds.find((s) => s.key === 'tap_3');
    expect(tap3).toEqual({ key: 'tap_3', source: files.tap_3, volume: catalog.tap.volume, maxVoices: 2, hot: true });
    expect(plan.sounds.find((s) => s.key === 'prestige')).toMatchObject({ maxVoices: 1, hot: false });
  });

  it('preloads what a finger is waiting for first, then extra voices, then the rest', () => {
    const plan = planSounds(catalog, fullBundle());
    const order = plan.preload;
    expect(order.slice(0, 10)).toEqual(['ui_tap', 'tap_1', 'tap_2', 'tap_3', 'tap_4', 'tap_5', 'tap_6', 'tap_7', 'tap_8', 'buy']);
    // Every frequent sound has its first voice before any sound gets a second one.
    const firstRepeat = order.findIndex((key, i) => order.indexOf(key) < i);
    expect(order.indexOf('hint')).toBeLessThan(firstRepeat);
    expect(order[firstRepeat]).toBe('tap_1');
    // Rare sounds come after all of that, each once.
    expect(order.lastIndexOf('buy')).toBeLessThan(order.indexOf('prestige'));
    expect(order.filter((key) => key === 'prestige')).toHaveLength(1);
    // A key appears once per voice.
    expect(order.filter((key) => key === 'buy')).toHaveLength(3);
    expect(order.filter((key) => key === 'tap_5')).toHaveLength(2);
    expect(order.filter((key) => key === 'coin_2')).toHaveLength(1);
    expect(order).not.toContain('music_main');
  });

  it('events with a minimum interval count as frequent even if the table does not list them', () => {
    const custom: Record<string, FxDef> = {
      rare: { brief: '', volume: 0.5 },
      listed: { brief: '', volume: 0.5 },
      rapid: { brief: '', volume: 0.5, minIntervalMs: 50 },
    };
    const plan = planSounds(custom, { rare: 1, listed: 2, rapid: 3 }, ['listed'], {});
    expect(plan.preload).toEqual(['listed', 'rapid', 'rare']);
    expect(plan.sounds.map((s) => [s.key, s.hot])).toEqual([
      ['rare', false],
      ['listed', true],
      ['rapid', true],
    ]);
  });

  it('missing files are reported and left out; the events stay silent', () => {
    const files = fullBundle();
    delete files.tap_7;
    delete files.prestige;
    delete files.music_main;
    const plan = planSounds(catalog, files);
    expect(plan.missing.sort()).toEqual(['music_main', 'prestige', 'tap_7']);
    expect(plan.music).toBeUndefined();
    expect(plan.sounds.some((s) => s.key === 'tap_7' || s.key === 'prestige')).toBe(false);
    expect(plan.preload).not.toContain('tap_7');
    expect(plan.preload).toContain('tap_8');
  });

  it('an empty bundle gives an empty plan', () => {
    const plan = planSounds(catalog, {});
    expect(plan.sounds).toEqual([]);
    expect(plan.preload).toEqual([]);
    expect(plan.music).toBeUndefined();
    expect(plan.missing.length).toBeGreaterThan(50);
  });

  it('files that no entry uses are reported, not planned', () => {
    const plan = planSounds(catalog, { ...fullBundle(), tap: 900, tap_9: 901, jingle: 902 });
    expect(plan.unused.sort()).toEqual(['jingle', 'tap', 'tap_9']);
    expect(plan.sounds.some((s) => s.source >= 900)).toBe(false);
  });
});
