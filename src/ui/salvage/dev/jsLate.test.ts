/** owner1 phone 3: the development panel's 'js late' line (./jsLate.ts). */
import { describe, expect, it, vi } from 'vitest';

let listener: ((s: { game: unknown }) => void) | null = null;
vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({
  useGame: {
    getState: () => ({}),
    subscribe: (f: (s: { game: unknown }) => void) => {
      listener = f;
      return () => (listener = null);
    },
  },
}));

const J = await import('./jsLate');
const { pushCounts } = await import('../world/useRulesTable');

describe('owner1 phone 3: js late', () => {
  it('lateness is each gap between ticks less 100 ms (never below 0): mean and worst', () => {
    expect(J.lateOf([0, 100, 200, 300])).toEqual({ meanMs: 0, worstMs: 0 });
    expect(J.lateOf([0, 112, 212, 492])).toEqual({ meanMs: (12 + 0 + 180) / 3, worstMs: 180 });
    expect(J.lateOf([0, 90])).toEqual({ meanMs: 0, worstMs: 0 });
    expect(J.lateOf([5])).toEqual({ meanMs: 0, worstMs: 0 });
  });

  it('the meter counts a tick only when the yard second moved, over five seconds, and the pushes a second', () => {
    let now = 0;
    const m = J.startJsLate(() => now);
    const at = (ms: number, t: number) => {
      now = ms;
      listener?.({ game: { salvage: { t } } });
    };
    at(0, 1);
    at(50, 1); // a presence sample: same second, no tick
    at(120, 1.1);
    at(220, 1.2);
    at(500, 1.3);
    pushCounts.scenes = 0;
    pushCounts.items = 0;
    now = 500;
    m.read();
    pushCounts.scenes = 10;
    pushCounts.items = 1;
    now = 1500;
    const r = m.read();
    expect(r.worstMs).toBe(180);
    expect(r.meanMs).toBeCloseTo((20 + 0 + 180) / 3, 6);
    expect(r.scenesPerS).toBeCloseTo(10, 6);
    expect(r.itemsPerS).toBeCloseTo(1, 6);
    expect(J.jsLateLine(r)).toBe('js +67/+180 ms  push 10.0/1.0 /s');
    m.stop();
    expect(listener).toBeNull();
  });
});
