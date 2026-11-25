/**
 * Hour 0's contract (yard-stage1.md section 9): the frozen test content names only keys the contract
 * declares (text keys of its goals and lessons, sprite ids in the art manifest's form), every refusal
 * key has a text key, and the content types keep the prototype's units (grams in pieces).
 */
import { describe, expect, it } from 'vitest';
import { SALVAGE_TEST } from '../fixtures/salvage';
import { REFUSAL_KEYS, TEXT_KEYS } from './types';

const ALL = new Set<string>(Object.values(TEXT_KEYS).flat());

describe('the hour-0 contract', () => {
  it('goals and lessons of the test content are text keys', () => {
    for (const g of SALVAGE_TEST.goals) expect(ALL.has(g.text), g.text).toBe(true);
    for (const k of Object.values(SALVAGE_TEST.lessons)) expect(ALL.has(k), k).toBe(true);
  });
  it('every refusal key has its text key, and text keys are unique', () => {
    for (const k of REFUSAL_KEYS) expect(ALL.has(`refusal.${k}`)).toBe(true);
    expect(ALL.size).toBe(Object.values(TEXT_KEYS).flat().length);
  });
  it('sprites are dotted art-manifest ids; pieces are whole grams', () => {
    for (const g of Object.values(SALVAGE_TEST.grades)) expect(g.sprite).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
    for (const o of Object.values(SALVAGE_TEST.objects)) for (const [, g, n] of o.pieces) expect(Number.isInteger(g) && Number.isInteger(n)).toBe(true);
  });
});
