/**
 * The Lantern Gate (spec 5.3 with M5 and M24; tests of 10.2): every feat lights its lantern once
 * and never unlights it; every effect reaches Mods (through `currentMods` and `mergeParams`);
 * M5's two changes; M24's lantern 19; the progress bars; the hooks MECHANICS calls.
 * Package META.
 */
import { describe, expect, it } from 'vitest';
import { freshState, mergeTestConfig } from '../fixtures/merge';
import { checkLanterns, currentMods, discoveredCount, featMet, featProgress, giftEverySooner, laddersComplete, lanternMods, neutralMods, onMerged, onTicketPaid, onTierMade } from './lanterns';
import { mergeParams } from './params';
import type { MergeConfig, MergeEvent, MergeGame, Mods, Ticket } from './types';

const cfg = mergeTestConfig({ gift: { every: 25, slots: 3, odds: { coins: 0.5, good: 0.35, spark: 0.15 }, goodSteps: [2, 3, 4], goodOdds: [0.6, 0.3, 0.1], coinPace: 0.5 } });

const shutterTotal = (c: MergeConfig) => c.merge.board.shutterGroups.reduce((a, g) => a + g.cells.length, 0);

/** A fresh game where lantern n's feat is met (`ok`) or one short of it. */
function withFeat(n: number, ok: boolean): MergeGame {
  const g = freshState(cfg);
  const m = g.merge;
  const l = cfg.merge.lanterns.find((x) => x.n === n)!;
  const f = l.feat;
  const d = ok ? 0 : 1;
  const book = m.book.map((row) => row.slice());
  let merge = { ...m, book };
  switch (f.type) {
    case 'tickets':
    case 'merges':
    case 'parades':
    case 'threeLineTickets':
    case 'seasonsClosed':
      merge = { ...merge, feats: { ...merge.feats, [f.type]: f.count - d } };
      break;
    case 'tier8sInSeason':
      merge = { ...merge, feats: { ...merge.feats, tier8sThisSeason: f.count - d } };
      break;
    case 'tierMade':
      book[2][f.tier - 1 - d] = true;
      break;
    case 'discover': {
      for (const row of book) row.fill(false);
      let left = f.count - d;
      for (const row of book) for (let k = 0; k < row.length && left > 0; k++, left--) row[k] = true;
      break;
    }
    case 'ladderComplete':
      book[3].fill(true);
      if (!ok) book[3][7] = false;
      break;
    case 'allMinders': {
      const chains = merge.chains.map((ch, c) => (c <= 4 ? { ...ch, open: true, minder: c === 4 && !ok ? 0 : 1 } : ch));
      merge = { ...merge, chains };
      break;
    }
    case 'allShutters': {
      const sizes = cfg.merge.board.shutterGroups.map((grp) => grp.cells.length);
      if (!ok) sizes[3] -= 1;
      merge = { ...merge, shuttersOpened: sizes };
      break;
    }
  }
  return { ...g, merge };
}

/** The field each lantern changes, and its value (5.3 with M5 and M24). */
const EFFECTS: Record<number, Partial<Mods>> = {
  1: { counters: 3 },
  2: { basketShare: 0.4 },
  3: { shelfCap: 8 },
  4: { counters: 4 },
  5: { paradeEvery: 480 },
  6: { awayHours: 2 },
  7: { luckyOdds: 20 },
  8: { startOpen: [1] },
  9: { seasonedMax: cfg.merge.seasons.maxSteps + 1 },
  10: { paradeMultiplier: 2.5 },
  11: { mindersStartHired: true },
  12: { ripeAdd: 0.05 },
  13: { betaAdd: 0.1 },
  14: { giftSlots: 4 },
  15: { minderIntervalMult: 0.8 },
  16: { luckyOdds: 16 },
  17: { sparkTiers: 2 },
  18: { festivalSparks: 5 },
  19: { giftEvery: 20 },
  20: { ticketPay: 1.05 },
};

describe('feats (5.3)', () => {
  for (let n = 1; n <= 20; n++) {
    it(`lantern ${n}: lit by its feat, once, and never unlit`, () => {
      const short = withFeat(n, false);
      expect(featMet(cfg, short, n)).toBe(false);
      const evShort: MergeEvent[] = [];
      expect(checkLanterns(cfg, short, 0, evShort).merge.lanterns).not.toContain(n);
      const g = withFeat(n, true);
      expect(featMet(cfg, g, n)).toBe(true);
      const events: MergeEvent[] = [];
      const lit = checkLanterns(cfg, g, 0, events);
      expect(lit.merge.lanterns.filter((x) => x === n)).toHaveLength(1);
      expect(events.filter((e) => e.type === 'lanternLit' && e.n === n)).toHaveLength(1);
      // Again: nothing more lights (the same object), no second event.
      const again: MergeEvent[] = [];
      expect(checkLanterns(cfg, lit, 0, again)).toBe(lit);
      expect(again).toEqual([]);
      // Never unlit: the feat's counters fall back, the lantern stays.
      const reset = { ...lit, merge: { ...lit.merge, feats: { ...freshState(cfg).merge.feats } } };
      expect(checkLanterns(cfg, reset, 0).merge.lanterns).toContain(n);
    });
  }

  it('lights in number order', () => {
    const g = freshState(cfg);
    const events: MergeEvent[] = [];
    checkLanterns(cfg, { ...g, merge: { ...g.merge, feats: { ...g.merge.feats, tickets: 100 } } }, 0, events);
    expect(events.map((e) => (e.type === 'lanternLit' ? e.n : 0))).toEqual([1, 2, 4]);
  });

  it('every minder means every chain of the season (5 in season 1, 6 from season 2)', () => {
    const g = withFeat(11, true);
    expect(featMet(cfg, g, 11)).toBe(true);
    expect(featMet(cfg, { ...g, merge: { ...g.merge, season: 1 } }, 11)).toBe(false);
  });

  it('the Ladder Book counts: discoveries and complete ladders (5.2)', () => {
    const g = withFeat(9, true);
    expect(laddersComplete(g.merge)).toEqual([3]);
    expect(discoveredCount(g.merge)).toBe(9); // the Grill's tier 1 and the Sweets ladder
    expect(featMet(cfg, withFeat(17, true), 17)).toBe(true);
  });

  it('progress: the next three unlit feats', () => {
    const g = freshState(cfg);
    const g2 = { ...g, merge: { ...g.merge, feats: { ...g.merge.feats, tickets: 2 } } };
    expect(featProgress(cfg, g2)).toEqual([
      { n: 1, have: 2, need: 3 },
      { n: 2, have: 2, need: 25 },
      { n: 3, have: 1, need: 6 },
    ]);
    const lit = { ...g2, merge: { ...g2.merge, lanterns: [1, 3] } };
    expect(featProgress(cfg, lit).map((f) => f.n)).toEqual([2, 4, 5]);
  });
});

describe('effects reach Mods (5.3, M5, M24)', () => {
  const neutral = neutralMods(cfg);
  for (let n = 1; n <= 20; n++) {
    it(`lantern ${n} changes exactly ${Object.keys(EFFECTS[n]).join(', ')}`, () => {
      const mods = currentMods(cfg, { season: 0, lanterns: [n] });
      expect(mods).toEqual({ ...neutral, ...EFFECTS[n] });
      const g = freshState(cfg);
      expect(mergeParams(cfg, { ...g, merge: { ...g.merge, lanterns: [n] } }).mods).toEqual(mods);
      expect(lanternMods(cfg, [n])).toEqual(EFFECTS[n]);
    });
  }

  it('M5: no Pocket; lantern 14 gives a fourth gift slot, lantern 16 Lucky 1 in 16 (the better of it and lantern 7)', () => {
    expect('pocket' in neutral).toBe(false);
    expect(currentMods(cfg, { season: 0, lanterns: [14] }).giftSlots).toBe(4);
    expect(currentMods(cfg, { season: 0, lanterns: [7, 16] }).luckyOdds).toBe(16);
    expect(currentMods(cfg, { season: 0, lanterns: [16, 7] }).luckyOdds).toBe(16);
    expect(shutterTotal(cfg)).toBe(26);
  });

  it('M24: lantern 19 lowers N by a fifth, rounded up, and brings the next box nearer', () => {
    expect(giftEverySooner(cfg, 25)).toBe(20);
    expect(giftEverySooner(cfg, 10)).toBe(8);
    expect(giftEverySooner(cfg, 23)).toBe(19);
    expect(giftEverySooner(cfg, 15)).toBe(12);
    const g = withFeat(19, true);
    const near = checkLanterns(cfg, { ...g, merge: { ...g.merge, gift: { ...g.merge.gift, ticketsToBox: 12 } } }, 0);
    expect(near.merge.gift.ticketsToBox).toBe(7);
    const close = checkLanterns(cfg, { ...g, merge: { ...g.merge, gift: { ...g.merge.gift, ticketsToBox: 3 } } }, 0);
    expect(close.merge.gift.ticketsToBox).toBe(1);
  });
});

describe('the hooks MECHANICS calls', () => {
  it('onMerged: the hedgehog steps up at counter 2 at the first merge of a new game, once', () => {
    const g = freshState(cfg);
    expect(g.merge.script).toBe('fox');
    const events: MergeEvent[] = [];
    const a = onMerged(cfg, g, { c: 0, k: 2 }, 20, events);
    const t = a.merge.counters[1].ticket!;
    expect(t.scripted).toBe(true);
    expect(t.lines).toEqual([{ c: 0, k: 3, filled: false }]);
    expect(t.id).toBe(g.merge.nextTicketId);
    expect(a.merge.nextTicketId).toBe(g.merge.nextTicketId + 1);
    expect(a.merge.script).toBe('hedgehog');
    expect(events.filter((e) => e.type === 'ticketDrawn')).toHaveLength(1);
    const b = onMerged(cfg, a, { c: 0, k: 2 }, 21);
    expect(b.merge.counters[1].ticket).toBe(t);
  });

  it('onMerged lights lantern 7 at 1,000 merges (MECHANICS counted them)', () => {
    const g = freshState(cfg);
    const m = { ...g, merge: { ...g.merge, script: 'done' as const, feats: { ...g.merge.feats, merges: 1000 } } };
    expect(onMerged(cfg, m, { c: 0, k: 2 }, 20).merge.lanterns).toContain(7);
  });

  it('onTierMade lights lanterns 3 and 6 from the book', () => {
    const g = withFeat(6, true);
    const out = onTierMade(cfg, g, { c: 2, k: 8 }, true);
    expect(out.merge.lanterns).toEqual(expect.arrayContaining([3, 6]));
  });

  it('onTicketPaid counts tickets, three-line tickets and Parades, restarts the Parade clock, ends the script', () => {
    const g0 = freshState(cfg);
    const g = { ...g0, stats: { ...g0.stats, playSeconds: 700 }, merge: { ...g0.merge, seasonStartedAt: 100 } };
    const gold: Ticket = { id: 9, lines: [{ c: 0, k: 2, filled: true }, { c: 0, k: 3, filled: true }, { c: 0, k: 2, filled: true }], gold: true, customer: 0, coat: 0 };
    const out = onTicketPaid(cfg, g, 0, gold, 100);
    expect(out.merge.feats.tickets).toBe(1);
    expect(out.merge.feats.threeLineTickets).toBe(1);
    expect(out.merge.feats.parades).toBe(1);
    expect(out.merge.paradeAt).toBe(600 + currentMods(cfg, g.merge).paradeEvery);
    const plain: Ticket = { id: 10, lines: [{ c: 0, k: 2, filled: true }], gold: false, customer: 0, coat: 0 };
    const p = onTicketPaid(cfg, g, 0, plain, 12);
    expect(p.merge.feats.parades).toBe(0);
    expect(p.merge.paradeAt).toBe(g.merge.paradeAt);
    // Script: the fox paid while the hedgehog still waits keeps it; the hedgehog paid last ends it.
    const hh = onMerged(cfg, g, { c: 0, k: 2 }, 20);
    const fox = hh.merge.counters[0].ticket!;
    const afterFox = onTicketPaid(cfg, hh, 0, fox, 12);
    expect(afterFox.merge.script).toBe('hedgehog');
    const noFox = { ...afterFox, merge: { ...afterFox.merge, counters: afterFox.merge.counters.map((c, j) => (j === 0 ? { ...c, ticket: null } : c)) } };
    expect(onTicketPaid(cfg, noFox, 1, noFox.merge.counters[1].ticket!, 29).merge.script).toBe('done');
    // Lantern 1 at the third paid ticket.
    let t = g;
    for (let i = 0; i < 3; i++) t = onTicketPaid(cfg, t, 0, plain, 12);
    expect(t.merge.lanterns).toContain(1);
  });
});
