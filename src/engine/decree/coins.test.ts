/**
 * Coins (H5; spec 10.2 `coins`): on a long random run (papers, slips, the Standing Order, elections, a
 * move, absences, Check the Sofa) dibs enter only through the named sources: the tick, paper gains,
 * the away payout and its ad top-up (paid by the store, booked here by the harness as the store does),
 * Check the Sofa and the transition fund. The rules' book adds up to the cash exactly; cash is never
 * below zero; refusing never costs. Frozen test content only (lesson 4).
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { decreeEngineMode } from '../decreeMode';
import { FIXTURE_NOW, decreeTestConfig, freshState } from '../fixtures/decree';
import { act } from './testPlay';

const cfg = decreeTestConfig();
const SOURCES: R.CashSource[] = ['tick', 'paper', 'away', 'awayAd', 'checkSofa', 'transition', 'spend'];
const GAINS = new Set<R.CashSource>(['tick', 'paper', 'away', 'awayAd', 'checkSofa', 'transition']);

describe('dibs enter only through the named sources (H5)', () => {
  it('a long random run: the book adds up to the cash, inflows only from the named sources, cash ≥ 0, refusing never costs', () => {
    let g = freshState(cfg, 4242);
    const start = g.cash;
    /** The harness's own book of what the store pays (away, awayAd) and what the rules set aside at a move. */
    const harness: Partial<Record<R.CashSource, number>> = {};
    let resetLoss = 0;
    let wall = FIXTURE_NOW;
    let refusals = 0;
    for (let round = 0; round < 24; round++) {
      // Ten minutes of play, the player checked at every action.
      const end = g.stats.playSeconds + 600;
      while (g.stats.playSeconds < end) {
        const before = g;
        const ev: R.DecreeEvent[] = [];
        const r = act(cfg, g, ev);
        if (r.g !== g) {
          if (r.act === 'refuse') {
            refusals++;
            expect(r.g.cash, 'refusing never costs').toBeGreaterThanOrEqual(before.cash);
          }
          if (r.act === 'moveUp') resetLoss += before.cash;
          g = r.g;
        } else {
          g = R.advanceDecree(cfg, g, 0.5, 0);
        }
        expect(g.cash).toBeGreaterThanOrEqual(0);
      }
      // Check the Sofa once a term when it may be offered.
      if (R.canWatchAd(cfg, g, 'checkSofa')) {
        const s = R.grantAd(cfg, g, 'checkSofa', []);
        expect(s.cash).toBeGreaterThan(g.cash);
        g = s;
      }
      // An absence of 7 minutes to 2 hours, paid on compute as the store does, with its ad every other time.
      const away = (7 + ((round * 37) % 113)) * 60_000;
      const saved = { ...g, lastSavedAt: wall, stats: { ...g.stats, clockHigh: wall } };
      wall += away;
      const off = decreeEngineMode.offline(cfg, saved, wall);
      g = off.game as R.DecreeGame;
      g = { ...g, cash: g.cash + off.earnings };
      harness.away = (harness.away ?? 0) + off.earnings;
      if (round % 2 && off.earnings > 0 && R.canWatchAd(cfg, g, 'awayBonus')) {
        const extra = off.earnings * (decreeEngineMode.offlineAdMultiplier!(cfg) - 1);
        g = { ...g, cash: g.cash + extra };
        harness.awayAd = (harness.awayAd ?? 0) + extra;
      }
      g = { ...g, lastSavedAt: wall };
    }
    const book = g.decree.stats.book;
    for (const k of Object.keys(book) as R.CashSource[]) expect(SOURCES).toContain(k);
    for (const k of Object.keys(book) as R.CashSource[]) if (!GAINS.has(k)) expect(book[k]!, k).toBeLessThanOrEqual(0);
    expect(book.tick).toBeGreaterThan(0);
    expect(refusals).toBeGreaterThan(50);
    expect(g.decree.stats.elections).toBeGreaterThan(0);
    const total = start + Object.values(book).reduce((s, x) => s + (x ?? 0), 0) + (harness.away ?? 0) + (harness.awayAd ?? 0) - resetLoss;
    expect(Math.abs(g.cash - total)).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(g.cash)));
  });
});
