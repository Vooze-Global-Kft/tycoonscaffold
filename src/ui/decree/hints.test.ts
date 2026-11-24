/**
 * The pen's script (./hints.ts; spec 3.1, 4.5): each guided step's condition, each ending by ANY path,
 * the quiet and idle waits, never while a dialog, a view, the peek, an armed strip or a finger, and a
 * player who ignores the pen is never stuck. On the frozen test content only (lesson 4): no text and
 * no tuned number is pinned.
 */
import { describe, expect, it } from 'vitest';
import * as R from '../../engine/decree';
import { decreeFixtures, decreeTestConfig, freshState } from '../../engine/fixtures/decree';
import { deskLayout } from './layout';
import { paperMetrics } from './paperMetrics';
import { IDLE_MS, QUIET_MS, guidedHint, idleHint, paperMiddle, penHint, penPath, penReach, penTail, shouldPlay, strokeAt, STROKE_TOTAL, type PenUi } from './hints';

const cfg = decreeTestConfig();
const calm: PenUi = {
  sheetOpen: false,
  viewOpen: false,
  peek: false,
  armed: false,
  fingerDown: false,
  idleMs: QUIET_MS,
};
const idle: PenUi = { ...calm, idleMs: IDLE_MS };

/** One decision by the rules (any path: the flick, the tap-tap, the buttons all end here), the take-back window committed. */
function decided(g: R.DecreeGame, choice: R.Choice): R.DecreeGame {
  const ev: R.DecreeEvent[] = [];
  let next = R.decide(cfg, g, choice, g.stats.playSeconds, ev);
  if (next.decree.pending) next = R.commitPending(cfg, next, next.stats.playSeconds, ev);
  return next;
}

/** Plays on until the desk holds a paper (slips put back down; the clock advanced by the rules' tick). */
function nextPaper(g: R.DecreeGame): R.DecreeGame {
  for (let i = 0; i < 200; i++) {
    const desk = g.decree.desk;
    if (desk?.type === 'paper') return g;
    if (desk?.type === 'slip') g = R.decide(cfg, g, 'refuse', g.stats.playSeconds, []);
    else g = R.advanceDecree(cfg, g, 0.5, 0, []);
  }
  return g;
}

describe('the guided steps (3.1)', () => {
  it('paper 1 teaches refusal: the pen pulls the paper down', () => {
    const g = freshState(cfg);
    const h = guidedHint(cfg, g);
    expect(h?.kind).toBe('pull');
    expect(h?.target).toBe('paper');
    expect(h?.guided).toBe(true);
  });

  it('refusing paper 1 ends the step; paper 2 teaches signing: the pen pushes it up', () => {
    const g = nextPaper(decided(freshState(cfg), 'refuse'));
    expect(g.decree.stats.refused).toBe(1);
    const h = guidedHint(cfg, g);
    expect(h?.kind).toBe('push');
    expect(h?.id).not.toBe(guidedHint(cfg, freshState(cfg))?.id);
  });

  it('while a signed paper rests in the take-back window, the pen keeps away', () => {
    const g1 = nextPaper(decided(freshState(cfg), 'refuse'));
    const resting = R.decide(cfg, g1, 'sign', g1.stats.playSeconds, []);
    if (resting.decree.pending) expect(penHint(cfg, resting, idle)).toBeNull();
  });

  it("signing paper 2 ends the signing step, by the rules' count and not the gesture", () => {
    const g2 = decided(nextPaper(decided(freshState(cfg), 'refuse')), 'sign');
    expect(g2.decree.stats.signed).toBe(1);
    const h = guidedHint(cfg, g2);
    expect(h === null || h.kind === 'point').toBe(true);
  });

  it('a player who signs paper 1 (the other way) has done the signing step too: no push is taught afterwards', () => {
    const g = decided(freshState(cfg), 'sign');
    expect(g.decree.stats.signed).toBe(1);
    expect(guidedHint(cfg, g)?.kind).not.toBe('push');
  });

  it('the first slip on the desk: the pen points at it, until a slip is taken (bought by any path)', () => {
    // After paper 1 the rules slide a slip onto the empty desk (2.7) before paper 2 arrives.
    let g = decided(freshState(cfg), 'refuse');
    for (let i = 0; i < 40 && g.decree.desk?.type !== 'slip'; i++) g = R.advanceDecree(cfg, g, 0.25, 0, []);
    expect(g.decree.desk?.type, 'a slip lands on the empty desk').toBe('slip');
    const h = guidedHint(cfg, g);
    expect(h?.kind).toBe('point');
    expect(h?.target).toBe('slip');
    const bought = R.decide(cfg, g, 'sign', g.stats.playSeconds, []);
    if (bought !== g) {
      expect(bought.decree.stats.slipsTaken).toBe(1);
      expect(guidedHint(cfg, bought)?.kind).not.toBe('point');
    }
    // Put back (down) instead: not taken, so the next slip is still pointed at.
    const putBack = R.decide(cfg, g, 'refuse', g.stats.playSeconds, []);
    expect(putBack.decree.stats.slipsTaken).toBe(0);
  });

  it('outside the first term of the first office nothing is taught', () => {
    const { governorAtCall, presidentTerm3 } = decreeFixtures(cfg);
    expect(guidedHint(cfg, governorAtCall)).toBeNull();
    expect(guidedHint(cfg, presidentTerm3)).toBeNull();
  });
});

describe('when the pen shows', () => {
  const g = freshState(cfg);
  it('a guided step waits for a quiet hand (QUIET_MS)', () => {
    expect(penHint(cfg, g, { ...calm, idleMs: QUIET_MS - 1 })).toBeNull();
    expect(penHint(cfg, g, calm)).not.toBeNull();
  });

  it('never while a sheet, a view or the peek is open, a strip is armed or a finger is down', () => {
    for (const k of ['sheetOpen', 'viewOpen', 'peek', 'armed', 'fingerDown'] as const) expect(penHint(cfg, g, { ...idle, [k]: true }), k).toBeNull();
  });

  it('after the guided steps: only after IDLE_MS without a touch, on the paper or the slip', () => {
    const { mayorMidTerm } = decreeFixtures(cfg);
    expect(guidedHint(cfg, mayorMidTerm)).toBeNull();
    expect(penHint(cfg, mayorMidTerm, { ...calm, idleMs: IDLE_MS - 1 })).toBeNull();
    const h = penHint(cfg, mayorMidTerm, idle);
    expect(h?.guided).toBe(false);
    expect(h?.kind).toBe('rock');
    expect(
      idleHint({
        ...mayorMidTerm,
        decree: { ...mayorMidTerm.decree, desk: null },
      }),
    ).toBeNull();
  });

  it('each teaching moment plays once; again only after IDLE_MS of quiet and IDLE_MS since it played', () => {
    const h = penHint(cfg, g, calm)!;
    expect(shouldPlay(h, calm, { lastId: null, msSinceLast: 0 })).toBe(true);
    expect(shouldPlay(h, calm, { lastId: h.id, msSinceLast: 1000 })).toBe(false);
    expect(shouldPlay(h, idle, { lastId: h.id, msSinceLast: IDLE_MS - 1 })).toBe(false);
    expect(shouldPlay(h, idle, { lastId: h.id, msSinceLast: IDLE_MS })).toBe(true);
    expect(shouldPlay(null, idle, { lastId: null, msSinceLast: 0 })).toBe(false);
  });
});

describe('a player who ignores the pen is never stuck', () => {
  it('with the pen showing, the paper can be refused and signed, and the game goes on without the gesture taught', () => {
    let g = freshState(cfg);
    // Ignore the pen for ten decisions, choosing the other side each time: every decision is accepted.
    for (let i = 0; i < 10; i++) {
      const desk = g.decree.desk;
      if (!desk) break;
      const choice: R.Choice = i % 2 === 0 ? 'sign' : 'refuse';
      let next = decided(g, choice);
      if (next === g) next = decided(g, 'refuse');
      expect(next, `decision ${i} accepted`).not.toBe(g);
      g = next;
    }
    // Refusal is always possible and free: the desk can always be cleared.
    expect(g.decree.stats.signed + g.decree.stats.refused + g.decree.stats.slipsTaken).toBeGreaterThan(0);
  });

  it('a pen that keeps showing never blocks: the script only returns data, the step remains decidable', () => {
    const g = freshState(cfg);
    expect(penHint(cfg, g, idle)).not.toBeNull();
    expect(decided(g, 'refuse')).not.toBe(g);
  });
});

describe('never over a number (4.5)', () => {
  for (const [w, h, top, bottom] of [
    [375, 667, 20, 0],
    [390, 844, 47, 34],
  ] as const) {
    for (const fs of [1, 1.3]) {
      it(`${w} × ${h} at font scale ${fs}: every stroke stays between the two strips, inside the paper`, () => {
        const layout = deskLayout(w, h, { top, bottom }, fs);
        const m = paperMetrics(layout.paper.h, layout.s);
        const signBottom = layout.paper.y + m.sign.y + m.sign.h;
        const refuseTop = layout.paper.y + m.refuse.y;
        const mid = paperMiddle(layout);
        expect(mid.y).toBeGreaterThanOrEqual(signBottom);
        for (const kind of ['pull', 'push', 'rock'] as const) {
          const p = penPath({ id: 'x', kind, target: 'paper', guided: true }, layout);
          const r = penReach(p, 0);
          expect(r.y, kind).toBeGreaterThanOrEqual(signBottom);
          expect(r.y + r.h, kind).toBeLessThanOrEqual(refuseTop);
          expect(r.x, kind).toBeGreaterThanOrEqual(layout.paper.x);
          expect(r.x + r.w, kind).toBeLessThanOrEqual(layout.paper.x + layout.paper.w);
          if (kind === 'pull') expect(p.b.y).toBeGreaterThan(p.a.y);
          if (kind === 'push') expect(p.b.y).toBeLessThan(p.a.y);
        }
      });
    }
  }

  it('on a slip the nib stays below its lower edge and the body to its lower right', () => {
    const layout = deskLayout(375, 667, { top: 20, bottom: 0 }, 1);
    const slip = { x: 60, y: 300, w: 240, h: 110 };
    const p = penPath({ id: 's', kind: 'point', target: 'slip', guided: true }, layout, (k) => (k === 'slip' ? slip : null));
    expect(Math.min(p.a.y, p.b.y)).toBeGreaterThan(slip.y + slip.h);
    const t = penTail(p.angle, p.len);
    expect(t.x).toBeGreaterThan(0);
    expect(t.y).toBeGreaterThan(0);
  });

  it('the stroke ends faded out, and goes there and back for a rock', () => {
    expect(strokeAt(STROKE_TOTAL, 0, 0, 0, 100, false).o).toBe(0);
    expect(strokeAt(0, 0, 0, 0, 100, false).y).toBe(0);
    const end = strokeAt(STROKE_TOTAL - 300, 0, 0, 0, 100, false);
    expect(end.y).toBeCloseTo(100, 5);
    expect(strokeAt(STROKE_TOTAL - 300, 0, 0, 0, 100, true).y).toBeCloseTo(0, 5);
  });
});
