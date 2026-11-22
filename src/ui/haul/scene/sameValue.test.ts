/**
 * The run selectors' value compare (perf-4: no JSON.stringify per selector per tick).
 */
import { describe, expect, it } from 'vitest';
import { sameValue } from './sameValue';

describe('sameValue', () => {
  it('compares primitives, arrays and plain objects by value, all the way down', () => {
    expect(sameValue(1, 1)).toBe(true);
    expect(sameValue(NaN, NaN)).toBe(true);
    expect(sameValue(0, -0)).toBe(true);
    expect(sameValue('a', 'b')).toBe(false);
    expect(sameValue(null, null)).toBe(true);
    expect(sameValue(null, {})).toBe(false);
    expect(sameValue([1, [2, { a: 3 }]], [1, [2, { a: 3 }]])).toBe(true);
    expect(sameValue([1, [2, { a: 3 }]], [1, [2, { a: 4 }]])).toBe(false);
    expect(sameValue([1, 2], [1, 2, 3])).toBe(false);
    expect(sameValue({ a: 1, b: [1] }, { b: [1], a: 1 })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameValue([], {})).toBe(false);
    expect(sameValue({ parts: [['drone', 2]], idle: 0 }, { parts: [['drone', 3]], idle: 0 })).toBe(false);
  });
});
