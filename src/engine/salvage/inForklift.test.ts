/**
 * s2-fix-small (R4, RULING2.md 24): the refusal 'inForklift' exists (refusals.ts REFUSAL_KEYS_V3, its text key
 * `refusal.inForklift` in textKeys.ts and strings.ts), so the frame holds it while the boss, seated in the forklift,
 * stands where on foot he would cut an oversize piece (frameWorks.ts reads the key at run time); and nowhere else.
 */
import { describe, expect, it } from 'vitest';
import { lots4, worksCfg } from '../fixtures/salvage2works';
import { frameCfg } from './frame';
import { thingPos } from './positions';
import { REFUSAL_KEYS_V3 } from './refusals';
import { TEXT_KEYS } from './textKeys';

describe('R4: Step out of the forklift first', () => {
  it('the key and its text key', () => {
    expect(REFUSAL_KEYS_V3).toContain('inForklift');
    expect(TEXT_KEYS.refusal).toContain('refusal.inForklift');
    // Its words ("Step out of the forklift first") are strings.ts TEXT's: the typecheck holds TEXT to exactly TEXT_KEYS.
  });

  const cfg = worksCfg();
  const seated = (dx: number) => {
    const g = structuredClone(lots4());
    const s = g.salvage;
    const lot = s.things.find((th) => th.at.at === 'lot')!;
    const q = thingPos(cfg.salvage, lot.at);
    s.presence = { ...s.presence, x: q.x + dx, y: q.y, moving: false, driving: false, standingFor: 3 };
    s.forklift = { x: q.x + dx, y: q.y, heading: 0 as never, by: 'boss', load: [] };
    return g;
  };

  it('seated in the forklift beside an oversize piece: the one button is Step out and the frame holds the refusal', () => {
    const f = frameCfg(cfg, seated(1));
    expect(f.boss.button).toBe('stepOut');
    expect(f.boss.refusal).toEqual({ key: 'refusal.inForklift' });
  });

  it('seated far from any piece: Step out, no refusal; on foot beside it: no refusal', () => {
    const far = frameCfg(cfg, seated(40));
    expect(far.boss.button).toBe('stepOut');
    expect(far.boss.refusal ?? null).not.toEqual({ key: 'refusal.inForklift' });
    const foot = seated(1);
    foot.salvage.forklift = { ...foot.salvage.forklift!, by: null, x: 0, y: 0 };
    expect(frameCfg(cfg, foot).boss.refusal ?? null).not.toEqual({ key: 'refusal.inForklift' });
  });
});
