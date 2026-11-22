import { describe, expect, it } from 'vitest';
import { VariantPicker, fileKeys, ladderStep } from './variants';

const all = () => true;
const only =
  (...keys: string[]) =>
  (key: string) =>
    keys.includes(key);

describe('fileKeys', () => {
  it('one file is named after the event', () => {
    expect(fileKeys('buy', {})).toEqual(['buy']);
    expect(fileKeys('buy', { files: 1 })).toEqual(['buy']);
  });
  it('several files are numbered from 1', () => {
    expect(fileKeys('coin', { files: 3 })).toEqual(['coin_1', 'coin_2', 'coin_3']);
  });
});

describe('VariantPicker: single file', () => {
  it('plays the file, or nothing when it is missing', () => {
    const picker = new VariantPicker();
    expect(picker.pick('buy', {}, undefined, all)).toBe('buy');
    expect(picker.pick('buy', {}, undefined, only())).toBeNull();
  });
});

describe('VariantPicker: ladder', () => {
  const tap = { files: 8, pick: 'ladder' } as const;

  it('step 0 (or no step) is the first rung', () => {
    const picker = new VariantPicker();
    expect(picker.pick('tap', tap, undefined, all)).toBe('tap_1');
    expect(picker.pick('tap', tap, 0, all)).toBe('tap_1');
    expect(picker.pick('tap', tap, 3, all)).toBe('tap_4');
  });

  it('clamps to the ladder and floors fractions', () => {
    const picker = new VariantPicker();
    expect(picker.pick('tap', tap, 7, all)).toBe('tap_8');
    expect(picker.pick('tap', tap, 99, all)).toBe('tap_8');
    expect(picker.pick('tap', tap, -4, all)).toBe('tap_1');
    expect(picker.pick('tap', tap, 2.9, all)).toBe('tap_3');
    expect(picker.pick('tap', tap, Number.NaN, all)).toBe('tap_1');
    expect(picker.pick('tap', tap, Number.POSITIVE_INFINITY, all)).toBe('tap_8');
    expect(picker.pick('tap', tap, Number.NEGATIVE_INFINITY, all)).toBe('tap_1');
  });

  it('a missing rung falls back to the nearest one below, then above', () => {
    const picker = new VariantPicker();
    const has = only('tap_2', 'tap_3', 'tap_6');
    expect(picker.pick('tap', tap, 4, has)).toBe('tap_3');
    expect(picker.pick('tap', tap, 7, has)).toBe('tap_6');
    expect(picker.pick('tap', tap, 0, has)).toBe('tap_2');
    expect(picker.pick('tap', tap, 0, only())).toBeNull();
  });
});

describe('VariantPicker: random', () => {
  const coin = { files: 3, pick: 'random' } as const;

  it('never plays the same variant twice in a row', () => {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const picker = new VariantPicker(random);
    const seen = new Set<string>();
    let last: string | null = null;
    for (let i = 0; i < 300; i++) {
      const key = picker.pick('coin', coin, undefined, all);
      expect(key).not.toBe(last);
      last = key;
      seen.add(key as string);
    }
    expect([...seen].sort()).toEqual(['coin_1', 'coin_2', 'coin_3']);
  });

  it('survives a random source that returns its extremes', () => {
    for (const value of [0, 0.999999, 1]) {
      const picker = new VariantPicker(() => value);
      for (let i = 0; i < 5; i++) expect(picker.pick('coin', coin, undefined, all)).toMatch(/^coin_[123]$/);
    }
  });

  it('only picks variants that exist', () => {
    const picker = new VariantPicker();
    for (let i = 0; i < 20; i++) expect(picker.pick('coin', coin, undefined, only('coin_2'))).toBe('coin_2');
    const two = only('coin_1', 'coin_3');
    const first = picker.pick('coin', coin, undefined, two);
    expect(picker.pick('coin', coin, undefined, two)).not.toBe(first);
    expect(picker.pick('coin', coin, undefined, only())).toBeNull();
  });

  it('several files without a pick mode are random', () => {
    const picker = new VariantPicker(() => 0);
    const first = picker.pick('happy', { files: 2 }, undefined, all);
    expect(picker.pick('happy', { files: 2 }, undefined, all)).not.toBe(first);
  });

  it('remembers the last variant per event', () => {
    const picker = new VariantPicker(() => 0);
    expect(picker.pick('coin', coin, undefined, all)).toBe('coin_1');
    expect(picker.pick('gem', coin, undefined, all)).toBe('gem_1');
    expect(picker.pick('coin', coin, undefined, all)).toBe('coin_2');
  });
});

describe('ladderStep', () => {
  it('spreads a five-level combo over eight rungs, bottom to top', () => {
    expect([0, 1, 2, 3, 4].map((level) => ladderStep(level, 5, 8))).toEqual([0, 2, 4, 5, 7]);
  });
  it('is the identity when the scale and the ladder are the same length', () => {
    expect([0, 1, 2, 3].map((level) => ladderStep(level, 4, 4))).toEqual([0, 1, 2, 3]);
  });
  it('clamps and handles degenerate input', () => {
    expect(ladderStep(12, 5, 8)).toBe(7);
    expect(ladderStep(-1, 5, 8)).toBe(0);
    expect(ladderStep(3, 1, 8)).toBe(0);
    expect(ladderStep(3, 5, 1)).toBe(0);
    expect(ladderStep(Number.NaN, 5, 8)).toBe(0);
  });
});
