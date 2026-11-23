/**
 * Where coins come from (spec 2.3, gate 8's sources: five since Decision M37, 10.2 `coins.test.ts`): on a long random
 * run of play (merges, deliveries, every purchase and button of 2.5, Basket sales and undos,
 * "Not tonight", the three rewarded ads, gift boxes, season closes, time away), cash moves only
 * through `commitCash` with a named source: every change of `cash` is matched, coin for coin, by
 * the change of `mstats.coins`; income is booked only under ticket, gift, till, basket and away
 * (the Festival pays none, M37); spending only under spend and undo. No merge, discovery, lantern,
 * level or Festival pays coins.
 *
 * Time away is granted by the shared store (`E.grantCash`), not by the rules; this run books it
 * the way a trace must, with `bookAway` (commitCash 'away') on `mergeOffline`'s earnings.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, freshState, mergeTestConfig, playOnce, testPrng } from '../fixtures/merge';
import * as R from '../merge';
import { mergeEngineMode } from '../mergeMode';

const cfg = mergeTestConfig();
const INCOME: readonly R.CoinSource[] = ['ticket', 'gift', 'till', 'basket', 'away'];
const OUT: readonly R.CoinSource[] = ['spend', 'undo'];
const sum = (c: Record<R.CoinSource, number>) => Object.values(c).reduce((a, b) => a + b, 0);

describe('cash moves only through the named sources (2.3, gate 8)', () => {
  it('on a long random run: every change of cash is booked, under one of the five sources or spending', () => {
    for (const seed of [1, 2026]) {
      const rnd = testPrng(seed);
      let g = freshState(cfg, seed);
      const seen = new Set<R.CoinSource>();
      let closes = 0;
      for (let step = 0; step < 20_000; step++) {
        const before = g;
        const r = rnd();
        const ev: R.MergeEvent[] = [];
        if (r < 0.45) g = R.advanceMerge(cfg, g, 0.25 + rnd() * 3, 0, ev);
        else if (r < 0.4502) {
          // Time away: the closed form returns earnings; the trace books them as 'away'.
          const away = R.mergeOffline(cfg, g, FIXTURE_NOW + (1 + rnd() * 5) * 3600_000);
          expect(away.game.cash).toBe(g.cash);
          g = R.bookAway(away.game, away.earnings);
        } else {
          g = playOnce(cfg, g, rnd(), ev, {
            close: (x) => {
              closes++;
              return mergeEngineMode.prestige(cfg, x, FIXTURE_NOW) as R.MergeGame;
            },
          });
        }
        if (g.merge.season !== before.merge.season) continue; // the close resets cash (2.11), not a coin source
        const dCash = g.cash - before.cash;
        const dBook = sum(g.merge.mstats.coins) - sum(before.merge.mstats.coins);
        expect(Math.abs(dCash - dBook), `step ${step}: cash moved ${dCash}, booked ${dBook}`).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(g.cash)));
        for (const s of Object.keys(g.merge.mstats.coins) as R.CoinSource[]) {
          const d = g.merge.mstats.coins[s] - before.merge.mstats.coins[s];
          if (d === 0) continue;
          seen.add(s);
          if (INCOME.includes(s)) expect(d, s).toBeGreaterThan(0);
          else expect(OUT, s).toContain(s);
          if (OUT.includes(s)) expect(d, s).toBeLessThan(0);
        }
        // Merges, discoveries, lanterns and levels pay nothing: a step whose events hold only those keeps the purse.
        if (ev.length && ev.every((e) => ['merge', 'discovery', 'lanternLit', 'move', 'swap', 'drop', 'shelved', 'released', 'gearWaiting', 'festivalLine', 'festivalDone'].includes(e.type))) expect(g.cash).toBe(before.cash);
      }
      expect([...seen].sort()).toEqual(expect.arrayContaining(['away', 'basket', 'spend', 'ticket', 'till', 'undo']));
      void closes;
    }
  }, 120_000);
});
