/**
 * The play canvas's hit test and moments (spec 4.3, 2.5): the pure twin of the worklet hit test
 * resolves every rectangle of mergeLayout to the rules' target codes at both phone sizes, the
 * outline covers what the drop resolves to, and the tween maths and queue behave.
 */
import { describe, expect, it } from 'vitest';
import { decodeTarget, TARGET_BASKET, TARGET_COUNTER, TARGET_FESTIVAL, TARGET_NONE } from '../../../engine/merge';
import { cellRect, mergeLayout } from '../layout';
import { E_BACK, E_LINEAR, ease, sprite, tweenAt, TweenQueue, type Tween } from './effects';
import { FRONT_BASE, hitGeo, hitTest, tapTest, targetRect } from './geometry';

const phones = [mergeLayout(375, 667, { top: 20, bottom: 0 }), mergeLayout(390, 844, { top: 47, bottom: 34 })];

describe('hitTest (the finger point, M9)', () => {
  it('every cell, counter column, the banner and the Basket resolve to their codes, and decode back', () => {
    for (const L of phones) {
      for (const n of [2, 3, 4]) {
        const g = hitGeo(L, n);
        for (let i = 0; i < 56; i++) {
          const r = cellRect(L, i);
          for (const [dx, dy] of [[0.5, 0.5], [1, 1], [r.w - 1, r.h - 1]]) expect(hitTest(r.x + dx, r.y + dy, g)).toBe(i);
          expect(decodeTarget(i)).toEqual({ kind: 'cell', cell: i });
        }
        L.counters[n as 2 | 3 | 4].forEach((r, j) => {
          expect(hitTest(r.x + 1, r.y + 1, g)).toBe(TARGET_COUNTER + j);
          expect(hitTest(r.x + r.w - 1, r.y + r.h - 1, g)).toBe(TARGET_COUNTER + j);
          expect(decodeTarget(TARGET_COUNTER + j)).toEqual({ kind: 'counter', counter: j });
        });
        expect(hitTest(L.banner.x + 2, L.banner.y + L.banner.h / 2, g)).toBe(TARGET_FESTIVAL);
        expect(hitTest(L.basket.x + 2, L.basket.y + 2, g)).toBe(TARGET_BASKET);
      }
    }
  });

  it('the stall fronts, the bars, the gaps and outside are no target; a tap on a front finds it with slop', () => {
    for (const L of phones) {
      const g = hitGeo(L, 4);
      expect(hitTest(L.width / 2, L.topBar.y + 5, g)).toBe(TARGET_NONE);
      expect(hitTest(L.width / 2, L.goalLine.y + 5, g)).toBe(TARGET_NONE);
      expect(hitTest(-5, L.board.y + 10, g)).toBe(TARGET_NONE);
      expect(hitTest(L.buttons[0].x + 5, L.buttons[0].y + 5, g)).toBe(TARGET_NONE);
      L.fronts.forEach((f, c) => {
        expect(hitTest(f.x + f.w / 2, f.y + f.h / 2, g)).toBe(TARGET_NONE);
        expect(tapTest(f.x + f.w / 2, f.y + f.h / 2, L, g)).toBe(FRONT_BASE + c);
        expect(tapTest(f.x + f.w / 2, f.y - 1, L, g)).toBe(FRONT_BASE + c);
      });
    }
  });

  it('the outline drawn under the finger is the rectangle of the code the drop resolves to', () => {
    for (const L of phones) {
      const g = hitGeo(L, 3);
      for (let y = 0; y < L.height; y += 7) {
        for (let x = 0; x < L.width; x += 7) {
          const code = hitTest(x, y, g);
          const r = targetRect(code, g);
          if (code === TARGET_NONE) expect(r).toBeNull();
          else {
            expect(r).not.toBeNull();
            expect(x >= r!.x && x < r!.x + r!.w && y >= r!.y && y < r!.y + r!.h).toBe(true);
          }
        }
      }
    }
  });
});

describe('tweens', () => {
  const t: Tween = { id: 1, ...sprite(0, 'good-grill-1', { x: 0, y: 0 }, { x: 100, y: 50 }, 0.5, { a0: 1, a1: 2, o0: 1, o1: 0, delay: 0.1, hold: 0.2, ease: E_LINEAR }) };
  it('waits for its delay, moves, holds, ends', () => {
    expect(tweenAt(t, 0.05)).toBeNull();
    expect(tweenAt(t, 0.1)).toMatchObject({ x: 0, y: 0, a: 1, o: 1 });
    const mid = tweenAt(t, 0.35)!;
    expect(mid.x).toBeCloseTo(50);
    expect(mid.y).toBeCloseTo(25);
    expect(mid.a).toBeCloseTo(1.5);
    expect(mid.o).toBeCloseTo(0.5);
    expect(tweenAt(t, 0.7)).toMatchObject({ x: 100, y: 50, a: 2, o: 0 });
    expect(tweenAt(t, 0.81)).toBeNull();
  });
  it('the back ease overshoots and lands on 1; every ease starts at 0', () => {
    expect(ease(E_BACK, 0)).toBeCloseTo(0);
    expect(ease(E_BACK, 1)).toBeCloseTo(1);
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map((u) => ease(E_BACK, u)))).toBeGreaterThan(1);
  });
  it('the queue drops ended tweens, keeps ids growing and stays bounded', () => {
    let clock = 0;
    let last: Tween[] = [];
    const q = new TweenQueue((l) => (last = l), () => clock, 10);
    q.push([sprite(1, 'coin', { x: 0, y: 0 }, { x: 1, y: 1 }, 0.5)]);
    clock = 3;
    q.push([sprite(1, 'coin', { x: 0, y: 0 }, { x: 1, y: 1 }, 0.5)]);
    expect(last.map((x) => x.id)).toEqual([2]);
    q.push(Array.from({ length: 20 }, () => sprite(1, 'coin', { x: 0, y: 0 }, { x: 1, y: 1 }, 0.5)));
    expect(last).toHaveLength(10);
    expect(last[9].id).toBe(22);
  });
});
