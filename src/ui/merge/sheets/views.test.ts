/**
 * The bars' and sheets' views read every figure from the rules (spec 4.4, "no number of our own"):
 * on the rules' own fixtures, each price equals the rules' price, each ticket's shown price is the
 * rules' ticketPrice, the next levels' figures equal the rules' figures on the state after the
 * purchase, and the word helpers make the names the sheets print.
 */
import { describe, expect, it } from 'vitest';
import { formatShort } from '../../../engine/format';
import { mergeFixtures, mergeTestConfig } from '../../../engine/fixtures/merge';
import * as R from '../../../engine/merge';
import { article, plural } from '../strings';
import { adsView, chipView, coins, GOAL_HOLD_S, goalView, holdGoal, nextBaseLevel, parseLines, shutterView, stallView, ticketView, type GoalView } from './views';

const cfg = mergeTestConfig();
const f = mergeFixtures(cfg);
const states = { fresh: f.fresh, minute3: f.minute3, minute10: f.minute10, festivalNear: f.festivalNear } as Record<string, R.MergeGame>;

describe('views read the rules', () => {
  for (const [name, g] of Object.entries(states)) {
    it(`${name}: stall rows are the rules' prices and figures`, () => {
      const p = R.mergeParams(cfg, g);
      g.merge.chains.forEach((ch, c) => {
        const v = stallView(cfg, g, c);
        expect(v.open).toBe(ch.open);
        expect(v.gearCost).toBe(p.chains[c].gearCost ?? 0);
        expect(v.stallCost).toBe(p.chains[c].stallCost ?? 0);
        expect(v.minderCost).toBe(p.chains[c].minderCost ?? 0);
        expect(v.openCost).toBe(p.chains[c].openCost ?? 0);
        if (!ch.open) return;
        expect(v.dropTier).toBe(cfg.merge.chains[c].tiers[p.chains[c].base - 1]);
        expect(v.interval).toBe(String(cfg.merge.gear.interval));
        if (ch.minder > 0) expect(v.sale).toBe(coins(cfg, R.saleAmount(cfg, g, c)));
        if (p.chains[c].stallCost !== null) {
          const after = { ...g, merge: { ...g.merge, chains: g.merge.chains.map((x, i) => (i === c ? { ...x, stall: x.stall + 1 } : x)) } };
          expect(Number(v.stallNext)).toBeCloseTo(R.mergeParams(cfg, after).chains[c].stallBonus, 2);
        }
        const step = nextBaseLevel(cfg, ch.gear);
        if (step !== null) expect(R.baseTier(cfg, step)).toBe(R.baseTier(cfg, ch.gear) + 1);
      });
    });

    it(`${name}: each ticket's price is the rules' ticketPrice, each line's value the rules' value`, () => {
      g.merge.counters.forEach((ct, j) => {
        const v = ticketView(cfg, g, j);
        expect(v.exists).toBe(!!ct.ticket);
        if (!ct.ticket) return;
        expect(v.price).toBe(formatShort(R.ticketPrice(cfg, g, ct.ticket)));
        const lines = parseLines(v.lines);
        expect(lines.length).toBe(ct.ticket.lines.length);
        lines.forEach((l, i) => {
          const tl = ct.ticket!.lines[i];
          expect([l.c, l.k, l.filled]).toEqual([tl.c, tl.k, tl.filled]);
          expect(l.value).toBe(formatShort(R.roundCoins(cfg, R.value(cfg, g, tl.c, tl.k))));
          expect(l.gone).toBe(R.lineUnmakeable(cfg, g, tl));
        });
        const nt = R.notTonightRoom(g, j);
        expect(v.ntGoods).toBe(nt.goods);
        expect(v.ntRoom).toBe(nt.room);
        expect(v.adOk).toBe(R.canWatchAd(cfg, g, 'fillLine', j));
      });
    });

    it(`${name}: shutters, the chip, the ads and the goal`, () => {
      const p = R.mergeParams(cfg, g);
      p.shutters.forEach((s, group) => {
        const v = shutterView(cfg, g, group);
        expect(v.exists).toBe(!!s);
        if (s) expect([v.cost, v.allowed]).toEqual([s.cost, s.allowed]);
      });
      const chip = chipView(cfg, g);
      expect(chip.lines).toBe(g.merge.festival.lines.length);
      expect(chip.season).toBe(R.seasonRow(cfg, g.merge.season).name);
      const a = adsView(cfg, g);
      expect(a.rushOk).toBe(R.canWatchAd(cfg, g, 'gearRush'));
      expect(a.dragonOk).toBe(R.canWatchAd(cfg, g, 'callDragon'));
      const goal = goalView(cfg, g);
      const adv = R.advice(cfg, g);
      expect(goal.kind).toBe(adv ? adv.kind : 'none');
      if (adv && adv.cost > 0) expect(goal.costText).toBe(formatShort(R.roundCoins(cfg, adv.cost)));
      // Cached per game object: one computation per tick for every reader.
      expect(goalView(cfg, g)).toBe(goal);
    });
  }
});

describe('word helpers', () => {
  it('plurals of the goods', () => {
    expect(plural('Twin Skewer')).toBe('Twin Skewers');
    expect(plural('Tea Leaf')).toBe('Tea Leaves');
    expect(plural('Cup of Tea')).toBe('Cups of Tea');
    expect(plural('Candy Posy')).toBe('Candy Posies');
    expect(plural('Twin Puffs')).toBe('Twin Puffs');
    expect(plural('Milk Tea')).toBe('Milk Teas');
  });
  it('articles', () => {
    expect(article('Ember Plate')).toBe('an Ember Plate');
    expect(article('Pepper Skewer')).toBe('a Pepper Skewer');
  });
});

describe('the goal line holds a purchase for a few seconds (player review: it flickered between two goals)', () => {
  const g0 = f.minute3;
  const at = (g: R.MergeGame, t: number, cash = g.cash): R.MergeGame => ({ ...g, cash, stats: { ...g.stats, playSeconds: t } });
  const goal = (kind: GoalView['kind'], target: number, cost: number): GoalView => ({ ...goalView(cfg, g0), kind, target, cost, costText: String(cost) });
  const tea = goal('openStall', 1, 120);
  const gear = goal('gear', 0, 29);
  const t0 = g0.stats.playSeconds;
  it('another purchase replaces it only after the hold, with the same purse and nothing bought', () => {
    const h0 = holdGoal(null, tea, at(g0, t0, 50));
    expect(holdGoal(h0, gear, at(g0, t0 + 1, 50)).view).toBe(tea);
    expect(holdGoal(h0, gear, at(g0, t0 + GOAL_HOLD_S + 0.1, 50)).view).toBe(gear);
  });
  it('the purse crossing a price, a purchase, or a goal that is not a purchase shows at once', () => {
    const h0 = holdGoal(null, tea, at(g0, t0, 25));
    expect(holdGoal(h0, gear, at(g0, t0 + 1, 30)).view).toBe(gear);
    const bought = { ...g0, merge: { ...g0.merge, chains: g0.merge.chains.map((ch, i) => (i === 0 ? { ...ch, gear: ch.gear + 1 } : ch)) } };
    expect(holdGoal(h0, gear, at(bought, t0 + 1, 25)).view).toBe(gear);
    const basket = goal('basket', 3, 0);
    expect(holdGoal(h0, basket, at(g0, t0 + 1, 25)).view).toBe(basket);
  });
});

