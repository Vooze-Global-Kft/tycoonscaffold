import { describe, expect, it } from 'vitest';
import type { HaulHint } from '../../../engine/haul';
import { orderHints } from './hintOrder';

const drag = (from: string, to: string, step = 0): HaulHint => ({ kind: 'drag', key: to, route: [], row: null, from, to, step });
const point = (key: string, step = 0, limit?: number): HaulHint => ({ kind: 'point', key, route: [], row: null, step, limit });
const swipe = (step = 0): HaulHint => ({ kind: 'swipe', key: 'bay:launch', route: [], row: null, zone: 'bay:launch', step });

describe('hint order (errata 55)', () => {
  it('tutorial, hold full, seam, idle drone, contract, flare, then the rest', () => {
    const seam = drag('chip:0', 'rock:4');
    const idle = drag('drone:rack', 'rock:1');
    const got = orderHints([point('button:salvage', 0, 1), point('bay:flare', 0, 3), point('bay:counter', 0, 3), idle, seam, swipe(), point('station:autopilot'), drag('drone:rack', 'rock:0', 1)], [4]);
    expect(got.map((h) => `${h.kind}:${h.key}:${h.step}`)).toEqual([
      'drag:rock:0:1',
      'swipe:bay:launch:0',
      'drag:rock:4:0',
      'drag:rock:1:0',
      'point:bay:counter:0',
      'point:bay:flare:0',
      'point:button:salvage:0',
      'point:station:autopilot:0',
    ]);
  });
  it('keeps the rules order among equals', () => {
    const a = point('station:autopilot');
    const b = point('button:fitting', 0, 1);
    expect(orderHints([a, b], [])).toEqual([a, b]);
  });
});
