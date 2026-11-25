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
  it('sprites are dotted art-manifest ENTRY ids (no frame suffix); pieces are whole grams', () => {
    for (const g of Object.values(SALVAGE_TEST.grades)) if (g.sprite) expect(g.sprite).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
    for (const o of Object.values(SALVAGE_TEST.objects)) {
      expect(o.sprite ?? '').not.toMatch(/\.(whole|cut\d+)$/);
      for (const [, g, n] of o.pieces) expect(Number.isInteger(g) && Number.isInteger(n)).toBe(true);
    }
  });
  it('content3.json parses (but for the battery grade the build drops)', async () => {
    const fs = await import('node:fs');
    const file = '/tmp/claude-0/-home-user/f22d4cbe-c353-58da-a893-27d84a9b8342/scratchpad/yard/proto/content3.json';
    if (!fs.existsSync(file)) return;
    const { SalvageSchema } = await import('../../config/schema.salvage');
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    delete raw.grades.batt;
    const r = SalvageSchema.safeParse(raw);
    expect(r.success ? '' : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')).toBe('');
  });
  it('the formatters print the yard units', async () => {
    const M = await import('./money');
    expect(M.fmtTonnes(150_000)).toBe('0.15 t');
    expect(M.fmtKg(28_640)).toBe('28.6');
    expect(M.fmtRate(1_200_000)).toBe('1.2 t');
    expect(M.fmtRate(640_000)).toBe('640 kg');
    expect(M.fmtDay(0, Date.UTC(2026, 10, 25))).toBe('25 Nov');
    expect(M.fmtDay(37, Date.UTC(2026, 0, 5))).toBe('11 Feb');
    expect(M.fmtHours(4)).toBe('4 h');
    expect(M.fmtHours(1.5)).toBe('1.5 h');
  });
});
