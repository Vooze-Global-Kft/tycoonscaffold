/**
 * Gossip and the scandal (spec 10.2 `scandal`; 2.8): gossip rises only by printed effects (never by
 * low approval), falls by 1 after 8 decisions without a gain; at G_max the front page goes on top (the
 * strip warns first); "Apologise on the steps" (every club −3 as one chip, sized f− per club, gossip
 * 0); "Say nothing" (I × 0.8 for 10 decided papers after the front page, then gossip 0) does not block
 * the call; no second scandal while one runs or a front page waits; "Call the Spin Doctor" touches no
 * mood. Frozen test content only.
 *
 * Joined (rules-lead): every rules module is the real one (no module mock); a slip the real advice.ts
 * lands between two papers (D18) is put back by the test's helper where a test counts papers.
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { built, decreeTestConfig } from '../fixtures/decree';

const cfg = decreeTestConfig();
const sc = cfg.decree.scandal;
const GMAX = cfg.decree.offices[0].gossipMax;
const deskPaper = (g: R.DecreeGame) => (g.decree.desk?.type === 'paper' ? g.decree.desk.paper : null);

/** A slip lying on the desk (D18, the real advice.ts) goes back, so the waiting paper lands. */
const putBackSlip = (g: R.DecreeGame, clock = 0): R.DecreeGame => (g.decree.desk?.type === 'slip' ? R.decide(cfg, g, 'refuse', clock, []) : g);
function decideNow(g: R.DecreeGame, choice: R.Choice, events: R.DecreeEvent[] = []): R.DecreeGame {
  let s = R.decide(cfg, g, choice, 0, events);
  if (s === g) s = R.decide(cfg, g, 'refuse', 0, events);
  return putBackSlip(s.decree.pending ? R.commitPending(cfg, s, 0, events) : s);
}

/** Papers that move no gossip (swaps of the bus spotters and the shops), for counting. */
function withTray(g: R.DecreeGame, n: number, id = (k: number) => `test-mayor-${k % 2 ? 'shops' : 'bus'}-swap-${(k % 3) + 1}`): R.DecreeGame {
  let s = g;
  const tray: R.Paper[] = [...s.decree.tray];
  for (let k = 0; k < n; k++) {
    const r = R.comicPaper(cfg, s, id(k));
    s = r.g;
    tray.push(r.paper);
  }
  return { ...s, decree: { ...s.decree, tray } };
}

/** A state whose front page is on the desk: gossip G_max − 1 and a treat signed (+1). */
function atFrontPage(moods = [52, 46, 50]): R.DecreeGame {
  const g = withTray(built({ office: 0, moods, gossip: GMAX - 1, ministries: [10, 7, 6, 0], cash: 1e6, desk: 'test-mayor-bus-treat-1' }), 14);
  return decideNow(g, 'sign');
}

describe('gossip (2.8)', () => {
  it('rises only by printed effects: low approval adds none (no spiral)', () => {
    let g = withTray(built({ office: 0, moods: [0, 0, 0], ministries: [10, 7, 6, 0], desk: 'test-mayor-bus-swap-1' }), 30);
    expect(R.decreeParams(cfg, g).approval).toBe(0);
    for (let k = 0; k < 25; k++) g = decideNow(g, k % 2 ? 'sign' : 'refuse');
    expect(g.decree.gossip).toBe(0);
    expect(g.decree.scandal).toBeNull();
  });

  it('falls by 1 after 8 decisions without a gain; a gain starts the count again', () => {
    let g = withTray(built({ office: 0, gossip: 3, ministries: [10, 7, 6, 0], desk: 'test-mayor-bus-swap-1' }), 20);
    for (let k = 1; k < sc.quietDecay; k++) {
      g = decideNow(g, 'refuse');
      expect(g.decree.gossip).toBe(3);
    }
    g = decideNow(g, 'refuse');
    expect(g.decree.gossip).toBe(2);
    expect(g.decree.quiet).toBe(0);
    // A treat signed (+1) resets the quiet count.
    let h = withTray(built({ office: 0, gossip: 1, ministries: [10, 7, 6, 0], desk: 'test-mayor-bus-swap-1' }), 3);
    h = { ...h, decree: { ...h.decree, quiet: sc.quietDecay - 2 } };
    const t = R.comicPaper(cfg, h, 'test-mayor-bus-treat-2');
    h = { ...t.g, decree: { ...t.g.decree, tray: [t.paper, ...t.g.decree.tray] } };
    h = decideNow(h, 'refuse');
    h = decideNow(h, 'sign');
    expect(h.decree.gossip).toBe(2);
    expect(h.decree.quiet).toBe(0);
  });
});

describe('the scandal (2.8)', () => {
  it('the strip warns first; a commit that brings gossip to G_max puts the front page on top', () => {
    const g = built({ office: 0, gossip: GMAX - 1, ministries: [10, 7, 6, 0], cash: 1e6, desk: 'test-mayor-bus-treat-1' });
    expect(R.stripOf(cfg, g, 'sign')!.notes).toEqual([{ kind: 'scandal', gossip: GMAX, max: GMAX }]);
    const events: R.DecreeEvent[] = [];
    const s = decideNow(withTray(g, 2), 'sign', events);
    expect(events).toContainEqual({ type: 'scandalStart' });
    expect(deskPaper(s)?.kind).toBe('scandal');
    expect(s.decree.stats.scandals).toBe(1);
    expect(s.decree.scandal).toBeNull();
  });

  it('"Apologise on the steps": every club −3 as one chip (f− per club), gossip to 0', () => {
    const g = atFrontPage([52, 46, 30]);
    const strip = R.stripOf(cfg, g, 'sign')!;
    const chip = strip.chips.find((c) => c.kind === 'every');
    expect(chip && chip.kind === 'every' && chip.deltas).toEqual(g.decree.moods.map((m) => R.sizeMood(cfg, m, -3)));
    expect(strip.chips.find((c) => c.kind === 'gossip')).toMatchObject({ from: GMAX, to: 0 });
    const s = decideNow(g, 'sign');
    expect(s.decree.moods).toEqual(g.decree.moods.map((m) => m + R.sizeMood(cfg, m, -3)));
    expect(s.decree.gossip).toBe(0);
    expect(s.decree.scandal).toBeNull();
  });

  it('"Say nothing": I × 0.8 for 10 decided papers after the front page, then gossip 0; no mood moves; the call stays open', () => {
    let g = atFrontPage();
    const I0 = R.decreeParams(cfg, g).I;
    const moods = g.decree.moods.slice();
    expect(R.stripOf(cfg, g, 'refuse')!.notes).toContainEqual({ kind: 'sayNothing', papers: sc.sayNothingPapers, factor: sc.sayNothingFactor });
    g = decideNow(g, 'refuse');
    expect(g.decree.moods).toEqual(moods);
    expect(g.decree.scandal).toMatchObject({ papersLeft: sc.sayNothingPapers, factor: sc.sayNothingFactor });
    for (let k = 0; k < sc.sayNothingPapers - 1; k++) {
      expect(R.decreeParams(cfg, g).I).toBeCloseTo(I0 * sc.sayNothingFactor * (R.decreeParams(cfg, { ...g, decree: { ...g.decree, scandal: null } }).I / I0), 9);
      g = decideNow(g, 'refuse');
      expect(g.decree.scandal).not.toBeNull();
      // The quiet decay still runs (2.8 does not pause it); gossip only goes to 0 when "Say nothing" ends.
      expect(g.decree.gossip).toBeGreaterThan(0);
    }
    // Nothing of the scandal blocks the call.
    const C = R.callFrom(cfg, g);
    expect(R.canCall(cfg, { ...g, decree: { ...g.decree, day: C } })).toBe(true);
    const events: R.DecreeEvent[] = [];
    g = decideNow(g, 'refuse', events);
    expect(events).toContainEqual({ type: 'scandalEnd', how: 'count' });
    expect(g.decree.scandal).toBeNull();
    expect(g.decree.gossip).toBe(0);
    expect(R.decreeParams(cfg, g).sayNothing).toBe(1);
  });

  it('no second scandal while one runs or a front page waits; gossip gains print 0 at the limit', () => {
    const g = atFrontPage();
    // A front page waits: a further check adds none.
    expect(R.checkScandal(cfg, g, [])).toBe(g);
    const running = decideNow(g, 'refuse');
    expect(R.checkScandal(cfg, running, [])).toBe(running);
    // A basket during "Say nothing" prints no gossip gain (gossip never passes G_max).
    const b = R.comicPaper(cfg, running, 'test-mayor-bus-basket-1');
    const landed = R.landPaper(cfg, { ...b.g, decree: { ...b.g.decree, desk: null } }, b.paper, 0);
    const shown = landed.decree.desk?.type === 'paper' ? landed.decree.desk.shown.sign : [];
    expect(shown).toContainEqual({ type: 'gossip', delta: 0 });
    const after = decideNow(landed, 'sign');
    expect(after.decree.stats.scandals).toBe(1);
    expect(after.decree.tray.filter((p) => p.kind === 'scandal').length).toBe(0);
  });

  it('"Call the Spin Doctor" (endScandal how ad) ends "Say nothing" now: gossip 0, no mood change', () => {
    const g = decideNow(atFrontPage(), 'refuse');
    const events: R.DecreeEvent[] = [];
    const s = R.endScandal(cfg, g, 'ad', events);
    expect(s.decree.moods).toEqual(g.decree.moods);
    expect(s.decree.scandal).toBeNull();
    expect(s.decree.gossip).toBe(0);
    expect(events[0]).toEqual({ type: 'scandalEnd', how: 'ad' });
    expect(R.endScandal(cfg, s, 'ad', [])).toBe(s);
  });
});
