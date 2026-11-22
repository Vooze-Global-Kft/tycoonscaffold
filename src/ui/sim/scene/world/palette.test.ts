import { describe, expect, it } from 'vitest';
import { rotateHue, venuePalette } from './palette';

describe('venue palettes', () => {
  it('gives every venue its own room, even far beyond the hand-picked ones', () => {
    const walls = new Set(Array.from({ length: 24 }, (_, i) => venuePalette(i).wall ?? 'default'));
    expect(walls.size).toBe(24);
  });

  it('lets game.json colours win, trim becoming the accent', () => {
    const p = venuePalette(3, { wall: '#112233', trim: '#AABBCC' });
    expect(p.wall).toBe('#112233');
    expect(p.accent).toBe('#AABBCC');
    expect(p.floorA).toBe(venuePalette(3).floorA);
  });

  it('turns hues without changing a grey', () => {
    expect(rotateHue('#808080', 90)).toBe('#808080');
    expect(rotateHue('#FF0000', 120)).toBe('#00FF00');
  });
});
