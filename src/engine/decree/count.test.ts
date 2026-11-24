/**
 * Shares, the poll and the count (2.4, 2.10, 2.11, D15, D25, D26; spec 10.2 `count`): shares against a
 * hand calculation, the 50.0 tie held, the announcement order, the poll equal to the count number for
 * number on 10^4 random states, the certain-win bound computed from the numbers. Frozen test content
 * only (lesson 4): mixes, pulls and the utility come from the test config.
 */
import { describe, expect, it } from 'vitest';
import { rngMix4 } from '../rng';
import * as R from '../decree';
import { built, decreeTestConfig, decreeTestContent } from '../fixtures/decree';

const cfg = decreeTestConfig();
const c = cfg.decree;
const u = (m: number) => (m >= c.count.huffBelow ? m : c.count.huffBelow - c.count.huffSlope * (c.count.huffBelow - m));

/** share_d by hand: Σ w × u(m) + C + Y − R, held between 0 and 100, in hundredths. */
function handShares(office: 0 | 1 | 2, moods: number[], C: number[], losses: number): number[] {
  const row = c.offices[office];
  const Y = R.disarray(losses, c.paperRules.disarray);
  return row.districts.map((d, k) => {
    let x = 0;
    d.mix.forEach((w, gi) => (x += w * u(moods[gi])));
    x += 100 * ((C[k] ?? 0) + Y - row.rivalPull);
    return Math.min(10000, Math.max(0, Math.round(x)));
  });
}

describe('shares (2.4 with D25)', () => {
  it('equal a hand calculation, with campaign points, disarray and a club in a huff', () => {
    const moods = [62, 25, 41];
    const g0 = built({ moods, losses: 2 }, cfg);
    const C = [4, 0, 8, 0, 0];
    const g = { ...g0, decree: { ...g0.decree, phase: 'campaign' as const, campaign: { C, papersLeft: 0, rallyDone: true } } };
    expect(R.shares(cfg, g)).toEqual(handShares(0, moods, C, 2));
    // The utility: m from huffBelow up, slope times as far below (D25).
    expect(R.moodUtility(c.count, c.count.huffBelow)).toBe(c.count.huffBelow);
    expect(R.moodUtility(c.count, c.count.huffBelow - 10)).toBe(c.count.huffBelow - 10 * c.count.huffSlope);
    // Approval (and so income) still reads the plain moods.
    const p = R.decreeParams(cfg, g);
    expect(p.approval).toBe(Math.round(p.W.reduce((s, w, gi) => s + w * moods[gi], 0)));
  });

  it('a share of exactly 50.0 is held; 49.99 is not', () => {
    // Every club at m: the share is m − R (the mixes sum to 1).
    const m = 50 + c.offices[0].rivalPull;
    const g = built({ moods: [m, m, m] }, cfg);
    expect(R.shares(cfg, g).every((s) => s === 5000)).toBe(true);
    expect(R.count(cfg, g).held).toBe(c.offices[0].districts.length);
    const low = built({ moods: [m - 1, m - 1, m - 1] }, cfg);
    expect(R.count(cfg, low).held).toBe(0);
  });

  it('the poll lists what a club in a huff costs each district (D25)', () => {
    const g = built({ moods: [50, 25, 50] }, cfg);
    const poll = R.poll(cfg, g);
    expect(poll.huffing).toEqual([1]);
    poll.rows.forEach((r, k) => expect(r.huffs).toEqual([{ club: 1, cost: Math.round(c.offices[0].districts[k].mix[1] * (u(25) - 25)) }]));
    expect(R.poll(cfg, built({ moods: [50, 50, 50] }, cfg)).huffing).toEqual([]);
    // A boycotting club (below 20) is not "in a huff" on screen, but still counts by u.
    expect(R.poll(cfg, built({ moods: [50, 15, 50] }, cfg)).huffing).toEqual([]);
  });
});

describe('the count (2.10)', () => {
  it('announces districts by |share − 50| largest first, ties in district order', () => {
    expect(R.announcementOrder([5000, 6200, 3800, 5100, 4900])).toEqual([1, 2, 3, 4, 0]);
    expect(R.announcementOrder([5500, 4500, 5500])).toEqual([0, 1, 2]);
    const g = built({ moods: [70, 40, 55] }, cfg);
    const r = R.count(cfg, g);
    const sh = R.shares(cfg, g);
    for (let i = 1; i < r.order.length; i++) expect(Math.abs(sh[r.order[i - 1]] - 5000)).toBeGreaterThanOrEqual(Math.abs(sh[r.order[i]] - 5000));
    expect(new Set(r.order).size).toBe(sh.length);
  });

  it('the poll equals the count, number for number, on 10^4 random states of every office (H2)', () => {
    for (let n = 0; n < 10_000; n++) {
      const office = (n % 3) as 0 | 1 | 2;
      const row = c.offices[office];
      const r = (k: number) => rngMix4(4242, n, k, 0) / 4294967296;
      const moods = row.clubs.map((_, gi) => Math.floor(r(gi) * 101));
      const losses = Math.floor(r(20) * 4);
      const g0 = built({ office, moods, losses, scripted: 'done' }, cfg);
      const C = row.districts.map((_, k) => (r(30 + k) < 0.3 ? 4 * Math.floor(r(40 + k) * 3) : 0));
      const g = r(50) < 0.5 ? { ...g0, decree: { ...g0.decree, phase: 'campaign' as const, campaign: { C, papersLeft: 0, rallyDone: true } } } : g0;
      const poll = R.poll(cfg, g);
      const cnt = R.count(cfg, g);
      expect(poll.rows.map((x) => x.share)).toEqual(cnt.districts.map((x) => x.share));
      expect(poll.rows.map((x) => x.held)).toEqual(cnt.districts.map((x) => x.held));
      expect(poll.held).toBe(cnt.held);
      expect(cnt.won).toBe(cnt.held >= row.majority);
      if (n % 97 === 0) expect(cnt.districts.map((x) => x.share)).toEqual(handShares(office, moods, g.decree.campaign?.C ?? [], losses));
    }
  });

  it("the strip's poll row uses the same function: heldAfter equals the count after the deltas", () => {
    const g = built({ moods: [48, 52, 47] }, cfg);
    const deltas = [4, -3, 0];
    const after = built({ moods: [52, 49, 47] }, cfg);
    expect(R.heldAfter(cfg, g, deltas, [])).toBe(R.count(cfg, after).held);
  });

  it('D26: Name Recognition counts only districts held without the disarray bonus', () => {
    const m = 50 + c.offices[0].rivalPull - 1;
    const g = built({ moods: [m, m, m], losses: 1 }, cfg);
    const merit = R.meritOf(cfg, g);
    expect(R.count(cfg, g).held).toBe(5);
    expect(merit.held).toBe(0);
    expect(merit.carried).toEqual([0, 1, 2, 3, 4]);
    expect(R.nrFor(cfg, 0, true, merit)).toBe(c.offices[0].winWeight * c.ladder.winBase);
    const sweep = built({ moods: [80, 80, 80] }, cfg);
    const ms = R.meritOf(cfg, sweep);
    expect(ms.sweep).toBe(true);
    expect(R.nrFor(cfg, 0, true, ms)).toBe(c.offices[0].winWeight * (c.ladder.winBase + 5) + c.ladder.sweepBonus * c.offices[0].winWeight);
    expect(R.nrFor(cfg, 1, false, ms)).toBe(c.offices[1].winWeight);
  });
});

describe('2.11: repeated losses end in a win (D15, D25)', () => {
  it('the bound computed from the numbers: after it, every district is held with every mood at 0', () => {
    for (const office of [0, 1, 2] as const) {
      const n = R.certainWinBound(c, office);
      expect(n).toBeLessThanOrEqual(c.ladder.maxLossesBound);
      const zero = built({ office, moods: c.offices[office].clubs.map(() => 0), losses: n }, cfg);
      expect(R.count(cfg, zero).held).toBe(c.offices[office].districts.length);
      if (n > 0) {
        const before = built({ office, moods: c.offices[office].clubs.map(() => 0), losses: n - 1 }, cfg);
        expect(R.count(cfg, before).won).toBe(false);
      }
    }
  });

  it('a pull of 12 (the range top) is still a certain win by the bound; the lint fails a rule that is not', () => {
    const high = decreeTestContent({ offices: cfg.decree.offices.map((o) => ({ ...o, rivalPull: 12 })) as never });
    for (const office of [0, 1, 2]) expect(R.certainWinBound(high, office)).toBeLessThanOrEqual(c.ladder.maxLossesBound);
    // The old linear rule (first 8, ratio 1, 2.11 before D15) with D25's utility needs more than the bound.
    const linear = decreeTestContent({ paperRules: { ...cfg.decree.paperRules, disarray: { first: 8, ratio: 1 } } });
    expect(R.certainWinBound(linear, 0)).toBeGreaterThan(c.ladder.maxLossesBound);
  });
});
