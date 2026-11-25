/// <reference types="node" />
/**
 * The stick's responder with synthetic touches (two fingers, the steering one lifts, a new one lands),
 * and the camera's margins: the worker's sprite stays inside the safe area at all four corners of the
 * test yard (docs/design/yard-ground.md). On the scrap-yard placeholder block.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SalvageSchema } from '../../../config/schema.salvage';

vi.mock('react', () => ({ useMemo: (f: () => unknown) => f(), useRef: (v: unknown) => ({ current: v }) }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }) }));

// The rules' frozen test content (never the tuned game.json: tests pin no tuned number, BRIEF lesson 4).
const { SALVAGE_TEST: content } = await import('../../../engine/fixtures/salvage');
void fs;
void path;
void SalvageSchema;

type T = { identifier: number; pageX: number; pageY: number };
const ev = (changed: T[], touches: T[]) => ({ nativeEvent: { ...changed[0], changedTouches: changed, touches } }) as never;

describe('the stick responder', async () => {
  const { useStickResponder, stick } = await import('./stick');
  const z = { x: 0, y: 100, width: 380, height: 290, minX: 76, maxX: 328, minY: 76, maxY: 314 };

  it('ignores a second finger, stops when the steering one lifts, and adopts a thumb put back down', () => {
    const r = useStickResponder(() => z, () => true);
    const a = { identifier: 1, pageX: 120, pageY: 300 };
    const b = { identifier: 2, pageX: 700, pageY: 200 };
    expect(r.onStartShouldSetResponder!(ev([a], [a]))).toBe(true);
    r.onResponderGrant!(ev([a], [a]));
    expect(stick.value.on).toBe(1);
    // A second finger lands (outside the zone, on the right): nothing changes.
    r.onResponderStart!(ev([b], [a, b]));
    r.onResponderMove!(ev([{ ...a, pageX: 150 }], [{ ...a, pageX: 150 }, b]));
    expect(stick.value.bx).toBe(120);
    expect(stick.value.kx).toBe(30);
    // The steering finger lifts while the other rests: the stick stops.
    r.onResponderEnd!(ev([a], [b]));
    expect(stick.value.on).toBe(0);
    // A thumb comes down in the zone again (no new grant from React Native): it steers.
    const c = { identifier: 3, pageX: 100, pageY: 320 };
    r.onResponderStart!(ev([c], [b, c]));
    expect(stick.value.on).toBe(1);
    r.onResponderMove!(ev([{ ...c, pageX: 130 }], [b, { ...c, pageX: 130 }]));
    expect(stick.value.kx).toBe(30);
    // Moves of the resting finger do not steer.
    r.onResponderMove!(ev([{ ...b, pageX: 760 }], [{ ...b, pageX: 760 }, { ...c, pageX: 130 }]));
    expect(stick.value.kx).toBe(30);
    // A touch landing outside the zone while nothing steers does not steer either.
    r.onResponderEnd!(ev([c], [b]));
    r.onResponderStart!(ev([{ identifier: 4, pageX: 600, pageY: 320 }], [b]));
    expect(stick.value.on).toBe(0);
    r.onResponderRelease!(ev([b], []));
    expect(stick.value.on).toBe(0);
  });
});

describe('the camera at the yard\'s edges', async () => {
  const { cameraBounds, EDGE_ROOM_M } = await import('./camera');
  const { yardLayout } = await import('./yard');
  const y = yardLayout(content);
  const r = content.worker.radius;
  const P = y.ppm;
  // The worker's sprite round its feet (./atlas.ts: hw 0.4, hd 0.4, h 1.95, extra 0.1).
  const spriteL = -(0.5 * P);
  const spriteR = 0.5 * P;
  const spriteT = -(1.95 * y.lift + 0.4 * y.tilt + 0.1) * P - 8;
  const spriteB = (0.4 * y.tilt + 0.1) * P + 4;
  const topPx = (1.95 * y.lift + 0.4 * y.tilt + 0.1) * P + 8;

  for (const [SW, SH] of [[844, 390], [667, 375]] as const)
    for (const [L, R] of [[59, 0], [0, 59]] as const)
      it(`keeps the worker inside the safe area at all four corners (${SW}x${SH}, insets ${L}/${R}/21)`, () => {
        const T = 0;
        const B = 21;
        const cam = [0, 0, 0, 0];
        cameraBounds(cam, y.pxW, y.pxH, SW, SH, L, T, R, B, EDGE_ROOM_M * P, topPx);
        for (const [wx, wy] of [[r, r], [y.width - r, r], [r, y.depth - r], [y.width - r, y.depth - r]]) {
          // The camera wants the body in the middle of the screen; the clamp holds it back.
          const cx = Math.max(cam[0], Math.min(cam[1], wx * P - SW / 2));
          const cy = Math.max(cam[2], Math.min(cam[3], wy * P * y.tilt - SH / 2));
          const sx = wx * P - cx;
          const sy = wy * P * y.tilt - cy;
          expect(sx + spriteL).toBeGreaterThanOrEqual(L);
          expect(sx + spriteR).toBeLessThanOrEqual(SW - R);
          expect(sy + spriteT).toBeGreaterThanOrEqual(T);
          expect(sy + spriteB).toBeLessThanOrEqual(SH - B);
        }
      });
});

describe('the phone\'s development switches', async () => {
  const { phoneSwitches, yardSwitches } = await import('../dev/switches');
  it('are off without the variables (and off under node, where __DEV__ is not defined)', () => {
    expect(phoneSwitches(undefined, undefined)).toEqual({ panel: false, actors: null, sprites: 0, insets: null });
    expect(yardSwitches.panel).toBe(false);
  });
  it('read EXPO_PUBLIC_YARD_DEV=1 and EXPO_PUBLIC_YARD_STRESS=actors,sprites', () => {
    expect(phoneSwitches('1', undefined)).toEqual({ panel: true, actors: null, sprites: 0, insets: null });
    expect(phoneSwitches(undefined, '40,300')).toEqual({ panel: true, actors: 40, sprites: 300, insets: null });
    expect(phoneSwitches(undefined, '999,99999')).toEqual({ panel: true, actors: 200, sprites: 600, insets: null });
    expect(phoneSwitches(undefined, 'x')).toEqual({ panel: false, actors: null, sprites: 0, insets: null });
  });
});
