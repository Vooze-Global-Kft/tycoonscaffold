/**
 * The counting card's order (owner2-hud, item 2; ./counting.ts): the card is shown before the pass, the pass runs
 * exactly once two frames after the card was painted, the card goes with it; nothing while the curtain holds; a
 * return that leaves nothing waiting (a short absence) shows nothing; the preview's hold never runs the pass.
 */
import { describe, expect, it } from 'vitest';
import { createCounting, type CountingSteps } from './countingOrder';

function rig(over: Partial<CountingSteps> = {}) {
  const log: string[] = [];
  const frames: (() => void)[] = [];
  const st = { pending: true, curtain: true };
  const steps: CountingSteps = {
    pending: () => st.pending,
    curtainDone: () => st.curtain,
    show: (on) => log.push(on ? 'show' : 'hide'),
    closeOpenCard: () => log.push('close'),
    frame: (f) => {
      frames.push(f);
      return () => {
        const i = frames.indexOf(f);
        if (i >= 0) frames.splice(i, 1);
      };
    },
    run: () => {
      log.push('run');
      st.pending = false;
    },
    poll: (on) => log.push(on ? 'poll' : 'unpoll'),
    hold: false,
    ...over,
  };
  const tick = () => {
    const f = frames.shift();
    f?.();
  };
  return { c: createCounting(steps), log, st, tick, frames };
}

describe('the counting card comes first, the pass two frames later, once', () => {
  it('show, painted, frame, frame: run then hide; never a second run', () => {
    const { c, log, tick, frames } = rig();
    c.sync();
    expect(log).toEqual(['close', 'show']);
    c.painted();
    expect(log).not.toContain('run');
    tick();
    expect(log).not.toContain('run');
    tick();
    expect(log).toEqual(['close', 'show', 'run', 'hide']);
    // The waiting ended with the pass: a later sync or paint changes nothing.
    c.sync();
    c.painted();
    expect(frames.length).toBe(0);
    expect(log.filter((x) => x === 'run')).toHaveLength(1);
  });

  it('the pass never runs before the card was painted', () => {
    const { c, log, frames } = rig();
    c.sync();
    c.sync();
    expect(frames.length).toBe(0);
    expect(log).toEqual(['close', 'show']);
  });

  it('under the loading curtain: nothing shows, it polls, and shows once the curtain has parted', () => {
    const { c, log, st } = rig();
    st.curtain = false;
    c.sync();
    expect(log).toEqual(['poll']);
    st.curtain = true;
    c.sync();
    expect(log).toEqual(['poll', 'unpoll', 'close', 'show']);
  });

  it('nothing waiting (a short absence, no away card): no counting card, no pass', () => {
    const { c, log, st } = rig();
    st.pending = false;
    c.sync();
    c.painted();
    expect(log).toEqual([]);
  });

  it('a paint cancelled (the host unmounted) runs nothing', () => {
    const { c, log, tick } = rig();
    c.sync();
    const cancel = c.painted();
    tick();
    cancel();
    tick();
    expect(log).not.toContain('run');
  });

  it("the preview's hold keeps the card and never runs the pass", () => {
    const { c, log, frames } = rig({ hold: true });
    c.sync();
    c.painted();
    expect(frames.length).toBe(0);
    expect(log).toEqual(['close', 'show']);
  });
});
