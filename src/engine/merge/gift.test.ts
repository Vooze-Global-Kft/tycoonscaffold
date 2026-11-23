/**
 * Gift boxes (spec 5.5 with M5 and M24; tests of 10.2): one every N paid tickets with N and m from
 * config; contents fixed at the earning, so a later or reloaded opening gives the same; the odds
 * within 0.5 points over 100k boxes; opening (coins through commitCash, goods in order, Sparks);
 * boxes waiting without limit; lantern 14's fourth slot. Package META.
 */
import { describe, expect, it } from 'vitest';
import { freshState, mergeTestConfig } from '../fixtures/merge';
import { countGiftTicket, giftBoxAt, giftCoinAmount, giftOdds, openGiftBox } from './gift';
import { paceUnit, roundCoins } from './params';
import type { MergeConfig, MergeEvent, MergeGame } from './types';

const GIFT = { every: 25, slots: 3, odds: { coins: 0.5, good: 0.35, spark: 0.15 }, goodSteps: [2, 3, 4], goodOdds: [0.6, 0.3, 0.1], coinPace: 0.5 };
const cfg = mergeTestConfig({ gift: GIFT });

/** A game with chains 0 to 2 open at the given gear levels and best tiers. */
function midGame(c: MergeConfig = cfg, best = [6, 5, 4]): MergeGame {
  const g = freshState(c);
  const chains = g.merge.chains.map((ch, i) => (i < best.length ? { ...ch, open: true, gear: i === 0 ? 11 : 1, best: best[i] } : ch));
  return { ...g, stats: { ...g.stats, playSeconds: 900 }, merge: { ...g.merge, chains } };
}

/** Pays `n` tickets into the gift counter. */
function pay(c: MergeConfig, g: MergeGame, n: number, events?: MergeEvent[]): MergeGame {
  let out = g;
  for (let i = 0; i < n; i++) out = countGiftTicket(c, out, events);
  return out;
}

describe('earning (5.5, M24)', () => {
  it('earns one box every N paid tickets, N from config', () => {
    const g = midGame();
    expect(g.merge.gift.ticketsToBox).toBe(25);
    const a = pay(cfg, g, 24);
    expect(a.merge.gift.boxes).toHaveLength(0);
    expect(a.merge.gift.ticketsToBox).toBe(1);
    const events: MergeEvent[] = [];
    const b = countGiftTicket(cfg, a, events);
    expect(b.merge.gift.boxes).toHaveLength(1);
    expect(b.merge.gift.ticketsToBox).toBe(25);
    expect(b.merge.draws.gift).toBe(1);
    expect(events).toEqual([{ type: 'giftEarned', box: 0 }]);
    const c15 = mergeTestConfig({ gift: { ...GIFT, every: 15 } });
    const g15 = midGame(c15);
    expect(pay(c15, g15, 15).merge.gift.boxes).toHaveLength(1);
    expect(pay(c15, g15, 15).merge.gift.ticketsToBox).toBe(15);
  });

  it('with lantern 19 the count restarts at N lowered by a fifth', () => {
    const g = midGame();
    const lit = { ...g, merge: { ...g.merge, lanterns: [19], gift: { ...g.merge.gift, ticketsToBox: 1 } } };
    expect(countGiftTicket(cfg, lit).merge.gift.ticketsToBox).toBe(20);
  });

  it('a coin slot holds roundCoins(m × U) at the earning, m from config', () => {
    const g = midGame();
    const U = paceUnit(cfg, g);
    expect(giftCoinAmount(cfg, g)).toBe(roundCoins(cfg, 0.5 * U));
    const c15 = mergeTestConfig({ gift: { ...GIFT, coinPace: 1.5 } });
    expect(giftCoinAmount(c15, midGame(c15))).toBe(roundCoins(c15, 1.5 * paceUnit(c15, midGame(c15))));
    const box = pay(cfg, { ...g, merge: { ...g.merge, gift: { ...g.merge.gift, ticketsToBox: 1 } } }, 1).merge.gift.boxes[0];
    expect(box.coins).toBe(roundCoins(cfg, 0.5 * U));
    expect(giftOdds(cfg, g)).toEqual({ coins: 0.5, good: 0.35, spark: 0.15, coinAmount: box.coins });
  });

  it('three slots, four with lantern 14; goods of open chains at b + 2 to b + 4 capped at best', () => {
    const g = midGame();
    const lit = { ...g, merge: { ...g.merge, lanterns: [14] } };
    for (let n = 0; n < 300; n++) {
      expect(giftBoxAt(cfg, g, n).slots).toHaveLength(3);
      const box = giftBoxAt(cfg, lit, n);
      expect(box.slots).toHaveLength(4);
      for (const s of box.slots) {
        if (s.kind !== 'good') continue;
        const ch = g.merge.chains[s.good.c];
        expect(ch.open).toBe(true);
        expect(s.good.k).toBeLessThanOrEqual(ch.best);
        const b = s.good.c === 0 ? 2 : 1;
        expect(s.good.k).toBeLessThanOrEqual(b + 4);
        expect(s.good.k === ch.best || s.good.k >= b + 2).toBe(true);
      }
    }
  });

  it('boxes wait without limit', () => {
    const g = midGame();
    const many = pay(cfg, g, 25 * 60);
    expect(many.merge.gift.boxes).toHaveLength(60);
    expect(many.merge.draws.gift).toBe(60);
  });
});

describe('odds (gate 13): within 0.5 points over 100k boxes', () => {
  it('slot kinds at 50 / 35 / 15 and good steps at 60 / 30 / 10', () => {
    // One open chain at base tier 1 with best 8, so no good is capped and the step shows in the tier.
    const g0 = freshState(cfg);
    const g = { ...g0, merge: { ...g0.merge, chains: g0.merge.chains.map((ch, i) => (i === 0 ? { ...ch, gear: 1, best: 8 } : ch)) } };
    const kinds = { coins: 0, good: 0, spark: 0 };
    const steps = [0, 0, 0];
    const N = 100_000;
    for (let n = 0; n < N; n++) {
      for (const s of giftBoxAt(cfg, g, n).slots) {
        kinds[s.kind]++;
        if (s.kind === 'good') steps[s.good.k - 3]++;
      }
    }
    const slots = N * 3;
    expect(Math.abs(kinds.coins / slots - 0.5)).toBeLessThan(0.005);
    expect(Math.abs(kinds.good / slots - 0.35)).toBeLessThan(0.005);
    expect(Math.abs(kinds.spark / slots - 0.15)).toBeLessThan(0.005);
    const goods = steps.reduce((a, b) => a + b, 0);
    expect(Math.abs(steps[0] / goods - 0.6)).toBeLessThan(0.005);
    expect(Math.abs(steps[1] / goods - 0.3)).toBeLessThan(0.005);
    expect(Math.abs(steps[2] / goods - 0.1)).toBeLessThan(0.005);
  });
});

describe('opening (5.5)', () => {
  /** A game holding one earned box with every kind of slot. */
  function withBox(): { g: MergeGame; earnedAt: MergeGame } {
    let g = midGame();
    // Earn boxes until one holds a coin slot, a good and a Spark (deterministic: the stream is fixed).
    for (let i = 0; i < 400; i++) {
      const box = giftBoxAt(cfg, g, g.merge.draws.gift);
      const kinds = new Set(box.slots.map((s) => s.kind));
      if (kinds.size === 3) break;
      g = { ...g, merge: { ...g.merge, draws: { ...g.merge.draws, gift: g.merge.draws.gift + 1 } } };
    }
    const earnedAt = { ...g, merge: { ...g.merge, gift: { ...g.merge.gift, ticketsToBox: 1 } } };
    return { g: countGiftTicket(cfg, earnedAt), earnedAt };
  }

  it('pays coin slots through commitCash, queues goods in order, counts Sparks; the same object with no box', () => {
    const { g } = withBox();
    const box = g.merge.gift.boxes[0];
    const coinSlots = box.slots.filter((s) => s.kind === 'coins').length;
    const events: MergeEvent[] = [];
    const out = openGiftBox(cfg, g, events);
    expect(out.cash).toBe(g.cash + coinSlots * box.coins);
    expect(out.merge.mstats.coins.gift).toBe(g.merge.mstats.coins.gift + coinSlots * box.coins);
    expect(out.merge.gift.pendingGoods).toEqual(box.slots.flatMap((s) => (s.kind === 'good' ? [s.good] : [])));
    expect(out.merge.gift.nextAt).toBe(g.stats.playSeconds + cfg.merge.gear.release);
    expect(out.merge.luckySparks).toBe(g.merge.luckySparks + box.slots.filter((s) => s.kind === 'spark').length);
    expect(out.merge.gift.boxes).toHaveLength(0);
    expect(out.merge.mstats.giftBoxesOpened).toBe(1);
    expect(events).toEqual([{ type: 'giftOpened', box }]);
    expect(openGiftBox(cfg, out)).toBe(out);
  });

  it('contents are fixed at the earning: a later or reloaded opening gives the same', () => {
    const { g } = withBox();
    const box = g.merge.gift.boxes[0];
    // Later: the street has grown (U is larger), the gift stream has moved on.
    const later: MergeGame = {
      ...g,
      stats: { ...g.stats, playSeconds: 5000 },
      merge: { ...g.merge, chains: g.merge.chains.map((ch) => (ch.open ? { ...ch, stall: 9, best: 8 } : ch)), draws: { ...g.merge.draws, gift: 77 } },
    };
    expect(paceUnit(cfg, later)).toBeGreaterThan(paceUnit(cfg, g));
    const reloaded = JSON.parse(JSON.stringify(later)) as MergeGame;
    const a = openGiftBox(cfg, later);
    const b = openGiftBox(cfg, reloaded);
    expect(a.cash - later.cash).toBe(box.slots.filter((s) => s.kind === 'coins').length * box.coins);
    expect(b.cash).toBe(a.cash);
    expect(b.merge.gift.pendingGoods).toEqual(a.merge.gift.pendingGoods);
    expect(b.merge.luckySparks).toBe(a.merge.luckySparks);
    // And earning the same box index from the same state gives the same box.
    expect(giftBoxAt(cfg, g, 0)).toEqual(giftBoxAt(cfg, JSON.parse(JSON.stringify(g)) as MergeGame, 0));
  });

  it('opening while a placement waits keeps its time (the queue goes on in order)', () => {
    const { g } = withBox();
    const busy = { ...g, merge: { ...g.merge, gift: { ...g.merge.gift, pendingGoods: [{ c: 1, k: 3 }], nextAt: 905 } } };
    const out = openGiftBox(cfg, busy);
    expect(out.merge.gift.nextAt).toBe(905);
    expect(out.merge.gift.pendingGoods[0]).toEqual({ c: 1, k: 3 });
  });
});
