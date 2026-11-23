/**
 * Advice and hints (spec 2.10 with M22; tests of 10.2): each gain formula against a hand
 * calculation; the score; the goal the bot would buy is the goal the line shows; no estimate at
 * R = 0; never advises something unaffordable forever or already bought; the extras; the firefly's
 * hints. Package META. States are built here on MECHANICS's fresh state; `mergeParams` (built) gives
 * the costs.
 */
import { describe, expect, it } from 'vitest';
import { freshState, mergeFixtures, mergeTestConfig } from '../fixtures/merge';
import { advice, adviceCandidates, adviceExtras, basketCell, festivalAdvice, incomeRate, nearestTicket, purchaseAdvice, waitEstimate } from './advice';
import { hintsFor } from './hints';
import { awningLook, lineUnmakeable, mergeParams, RECENT_BUCKETS } from './params';
import type { Advice, ChainState, MergeGame, Ticket } from './types';

const base = mergeTestConfig();
// Every number a hand calculation below uses, pinned (the starting content may be retuned).
const cfg = mergeTestConfig({
  values: { base: 5, chainStep: 4, tierGrowth: 2.4 },
  gear: { ...base.merge.gear, interval: 4, step: 10, ripePerLevel: 0.05, ripeMax: 0.6, maxBase: 4 },
  stalls: { bonusPerLevel: 0.1, bonusMax: 3.9, awningLevels: [5, 10, 20] },
  minders: { interval: 15, tillRoll: 60 },
  advice: { newStallPhi: 40, shutterKappa: 1 },
});

type ChainSpec = Partial<ChainState> & { c: number };

/** A game at clock 600 (season clock 600) with these chains, cash, and ticket coins of the last five minutes per chain. */
function game(chains: ChainSpec[], cash = 0, recentPerChain: number[] = []): MergeGame {
  const g = freshState(cfg);
  const clock = 600;
  const coins = Array.from({ length: 6 }, (_, c) => Array.from({ length: RECENT_BUCKETS }, (_, j) => (j === RECENT_BUCKETS - 1 ? recentPerChain[c] ?? 0 : 0)));
  return {
    ...g,
    cash,
    stats: { ...g.stats, playSeconds: clock },
    merge: {
      ...g.merge,
      chains: g.merge.chains.map((ch, c) => {
        const s = chains.find((x) => x.c === c);
        return s ? { ...ch, open: true, best: 1, ...s } : ch;
      }),
      recent: { at: Math.floor(clock / 5), coins },
    },
  };
}

const find = (list: Advice[], kind: Advice['kind'], target: number | null) => list.find((a) => a.kind === kind && a.target === target);

describe('the rate R (2.9, 2.10)', () => {
  it('is the recent ticket coins over min(300, season clock) plus the minder rate', () => {
    const g = game([{ c: 0, gear: 1, minder: 1, stall: 1 }], 0, [300]);
    // Minder K = 1, b = 1: house tier min(2, 2) = 2, value 5 × 2.4 = 12, every 15 s.
    expect(incomeRate(cfg, g)).toBeCloseTo(300 / 300 + 12 / 15, 10);
    expect(incomeRate(cfg, freshState(cfg))).toBe(0);
  });
});

describe('each gain formula against a hand calculation (2.10)', () => {
  it('gear L → L + 1: Δu × vb', () => {
    const g = game([{ c: 0, gear: 5, stall: 2, best: 5 }], 0, [60]);
    // u(5) = 1.20 / 4, u(6) = 1.25 / 4; k* = max(2, 4) = 4; vb = 5 × 2.4^3 × 1.1 / 2^3.
    const gain = (1.25 / 4 - 1.2 / 4) * ((5 * 2.4 ** 3 * 1.1) / 8);
    expect(find(adviceCandidates(cfg, g), 'gear', 0)!.gain).toBeCloseTo(gain, 10);
    // A base step: L10 → L11: u = 1.45 / 4 × 1 → 1 / 4 × 2; k* = max(2, best − 1 = 3) = 3.
    const step = game([{ c: 0, gear: 10, stall: 1, best: 4 }], 0, [60]);
    expect(find(adviceCandidates(cfg, step), 'gear', 0)!.gain).toBeCloseTo((2 / 4 - 1.45 / 4) * ((5 * 2.4 ** 2) / 4), 10);
  });

  it('stall M → M + 1: (0.1 / S) × (the chain\'s recent ticket rate + its minder rate)', () => {
    const g = game([{ c: 0, gear: 1, stall: 2, minder: 1, best: 2 }], 0, [300]);
    // The minder's rate as params.ts gives it (house tier 2: 5 × 2.4 × 1.1 per 15 s, a sale rounded by M19's one rule).
    const minder = mergeParams(cfg, g).chains[0].minderRate;
    expect(minder).toBeCloseTo(13 / 15, 1);
    expect(find(adviceCandidates(cfg, g), 'stall', 0)!.gain).toBeCloseTo((0.1 / 1.1) * (1 + minder), 10);
  });

  it('minder hire and level: (value(c, h′) − value(c, h)) / Q', () => {
    const g = game([{ c: 0, gear: 11, stall: 1, minder: 1, best: 3 }, { c: 1, gear: 1, stall: 2, minder: 0, best: 1 }], 0, [60, 60]);
    const list = adviceCandidates(cfg, g);
    // Grill b = 2: h = min(2, 3) = 2 → h′ = min(3, 3) = 3.
    expect(find(list, 'minderLevel', 0)!.gain).toBeCloseTo((5 * 2.4 ** 2 - 5 * 2.4) / 15, 10);
    // Tea hire: h′ = min(2, 2) = 2 at stall 2.
    expect(find(list, 'minderHire', 1)!.gain).toBeCloseTo((20 * 2.4 * 1.1) / 15, 10);
    // Held back by the gear (b = 1, K = 1): a level gains nothing and is never advised.
    const held = game([{ c: 0, gear: 1, minder: 1, best: 1 }], 0, [60]);
    expect(find(adviceCandidates(cfg, held), 'minderLevel', 0)).toBeUndefined();
  });

  it('a new stall: ΔU / Φ', () => {
    const g = game([{ c: 0, gear: 3, best: 2 }, { c: 1, gear: 1, best: 1 }], 0, [60, 60]);
    // Steamer at gear 1: maxPop 1, ΔU = value(2, max(2, 0)) = 80 × 2.4 at stall 1.
    expect(find(adviceCandidates(cfg, g), 'openStall', 2)!.gain).toBeCloseTo((80 * 2.4) / 40, 10);
  });

  it('a shutter: κ × R / O (offered while a shelf holds goods, Decision M50)', () => {
    const g0 = game([{ c: 0, gear: 3, best: 3, shelf: [1] }], 0, [150]);
    const g = { ...g0, merge: { ...g0.merge, book: g0.merge.book.map((row, c) => (c === 0 ? row.map((_, k) => k < 3) : row)) } };
    const R = incomeRate(cfg, g);
    expect(R).toBeCloseTo(150 / 300, 10);
    expect(find(adviceCandidates(cfg, g), 'shutter', 0)!.gain).toBeCloseTo((1 * R) / mergeParams(cfg, g).O, 10);
    expect(mergeParams(cfg, g).O).toBe(30);
  });

  it('Decision M50 (5): a shutter is never the goal while every shelf is empty (cells stand free)', () => {
    // Grill 3 made, so the first shutter group's condition holds.
    const made = (x: MergeGame): MergeGame => ({ ...x, merge: { ...x.merge, book: x.merge.book.map((row, c) => (c === 0 ? row.map((_, k) => k < 3) : row)) } });
    const empty = made(game([{ c: 0, gear: 3, best: 3 }], 1e6, [150]));
    expect(adviceCandidates(cfg, empty).some((a) => a.kind === 'shutter')).toBe(false);
    const shelved = made(game([{ c: 0, gear: 3, best: 3, shelf: [1, 1] }], 1e6, [150]));
    expect(adviceCandidates(cfg, shelved).some((a) => a.kind === 'shutter')).toBe(true);
  });

  it('the score is max(0, cost − cash) / R + cost / gain, lowest first', () => {
    const g = game([{ c: 0, gear: 5, stall: 2, minder: 1, best: 5 }, { c: 1, gear: 2, best: 2 }], 40, [200, 100]);
    const R = incomeRate(cfg, g);
    const list = adviceCandidates(cfg, g);
    expect(list.length).toBeGreaterThan(3);
    for (const a of list) {
      expect(a.score).toBeCloseTo(Math.max(0, a.cost - g.cash) / R + a.cost / a.gain, 9);
      expect(a.wait).toBeCloseTo(Math.max(0, a.cost - g.cash) / R, 9);
    }
    for (let i = 1; i < list.length; i++) expect(list[i].score).toBeGreaterThanOrEqual(list[i - 1].score);
  });
});

describe('the goal line and the bot agree', () => {
  it('the goal shown is the purchase the bot buys, whenever a purchase is affordable', () => {
    const f = mergeFixtures(cfg);
    const states = [
      f.minute3,
      f.minute10,
      f.festivalNear,
      game([{ c: 0, gear: 5, stall: 2, best: 5 }], 500, [300]),
      game([{ c: 0, gear: 12, stall: 4, minder: 2, best: 5 }, { c: 1, gear: 3, best: 3 }], 2000, [300, 200]),
    ];
    for (const g of states) {
      const bot = purchaseAdvice(cfg, g);
      const line = advice(cfg, g);
      if (bot && bot.cost <= g.cash) expect(line).toEqual(bot);
      // Not affordable, no Festival goal: the line shows the same best purchase with its wait.
      if (bot && bot.cost > g.cash && !festivalAdvice(cfg, g) && !basketCell(cfg, g)) expect(line).toEqual(bot);
    }
  });

  it('no estimate when R = 0, and nothing that cannot be reached', () => {
    const fresh = freshState(cfg);
    expect(incomeRate(cfg, fresh)).toBe(0);
    // Cash 0, R 0: no purchase can be reached; the goal is the fox's ticket.
    expect(adviceCandidates(cfg, fresh)).toEqual([]);
    expect(advice(cfg, fresh)).toMatchObject({ kind: 'fillTicket', target: 0, wait: null });
    // Cash 25, R 0: the gear (20) is affordable and shown without an estimate; the rest is out of reach.
    const rich = { ...fresh, cash: 25 };
    const list = adviceCandidates(cfg, rich);
    expect(list.length).toBeGreaterThan(0);
    for (const a of list) {
      expect(a.wait).toBeNull();
      expect(a.cost).toBeLessThanOrEqual(25);
    }
    expect(waitEstimate(null)).toBeNull();
  });

  it('never advises what is already bought or at its top', () => {
    const top = cfg.merge.costs.gearMaxLevel;
    const g0 = game([{ c: 0, gear: top, stall: cfg.merge.costs.stallMaxLevel, minder: cfg.merge.costs.minderMaxLevel, best: 8, shelf: [4] }, { c: 1, gear: 1, best: 1 }], 1e9, [300, 300]);
    const g = { ...g0, merge: { ...g0.merge, book: g0.merge.book.map((row, c) => (c === 0 ? row.map(() => true) : row)) } };
    const list = adviceCandidates(cfg, g);
    expect(find(list, 'gear', 0)).toBeUndefined();
    expect(find(list, 'stall', 0)).toBeUndefined();
    expect(find(list, 'minderLevel', 0)).toBeUndefined();
    expect(list.some((a) => a.kind === 'openStall' && (a.target === 0 || a.target === 1))).toBe(false);
    // Puffs cannot open in season 1, and a shutter group whose condition fails is not advised.
    expect(find(list, 'openStall', 5)).toBeUndefined();
    expect(list.filter((a) => a.kind === 'shutter').map((a) => a.target)).toEqual([0]);
    for (const a of list) expect(Number.isFinite(a.score)).toBe(true);
  });
});

describe('the extras (2.10, M22)', () => {
  it('sells a spare tier 8 in the Basket when the board is full and no merge exists', () => {
    const g0 = game([{ c: 0, gear: 1, best: 8 }, { c: 1, gear: 1, best: 8 }, { c: 2, gear: 1, best: 8 }, { c: 3, gear: 1, best: 8 }], 0, []);
    // Fill every open cell with distinct goods: no two alike.
    const pool: { c: number; k: number }[] = [];
    for (let c = 0; c < 4; c++) for (let k = 1; k <= 8; k++) pool.push({ c, k });
    let n = 0;
    const board = g0.merge.board.map((cell) => (cell === 'shutter' ? cell : pool[n++]));
    // The ticket asks for a Candy tier 8 that is not on the board; the Festival is filled: nothing to deliver.
    const ticket: Ticket = { id: 1, lines: [{ c: 3, k: 8, filled: false }], gold: false, customer: 0, coat: 0 };
    const g = { ...g0, merge: { ...g0.merge, board, festival: { ...g0.merge.festival, filledAt: 1 }, counters: g0.merge.counters.map((ct, j) => (j === 0 ? { ...ct, ticket } : { ...ct, ticket: null })) } };
    expect(mergeParams(cfg, g).F).toBe(0);
    const cell = basketCell(cfg, g);
    expect(cell).not.toBeNull();
    const sold = g.merge.board[cell!] as { c: number; k: number };
    expect(sold.k).toBe(8); // an unwanted tier 8 first (M22)
    expect(advice(cfg, g)).toMatchObject({ kind: 'basket', target: cell });
    // M33: the Basket comes first on a deadlock, even with an affordable purchase.
    expect(advice(cfg, { ...g, cash: 1e9 })).toMatchObject({ kind: 'basket', target: cell });
    // A delivery exists (a good fills a line): not deadlocked.
    const deliverable = { ...g, merge: { ...g.merge, counters: g.merge.counters.map((ct, j) => (j === 0 ? { ...ct, ticket: { ...ticket, lines: [{ c: 2, k: 8, filled: false }] } } : ct)) } };
    expect(basketCell(cfg, deliverable)).toBeNull();
    // With a free cell, no Basket advice.
    const roomy = { ...g, merge: { ...g.merge, board: g.merge.board.map((c, i) => (i === cell ? null : c)) } };
    expect(basketCell(cfg, roomy)).toBeNull();
  });

  it('offers "Fill the Festival" once its chains are open, and a lantern feat within reach', () => {
    const f = mergeFixtures(cfg).festivalNear;
    expect(adviceExtras(cfg, f).map((a) => a.kind)).toContain('festival');
    const early = mergeFixtures(cfg).minute3;
    expect(adviceExtras(cfg, early).map((a) => a.kind)).not.toContain('festival');
    // 20 of 25 tickets: lantern 2 is within reach.
    const near = { ...early, merge: { ...early.merge, feats: { ...early.merge.feats, tickets: 20 } } };
    expect(find(adviceExtras(cfg, near), 'lantern', 2)).toBeDefined();
  });

  it('M31: names the Festival\'s missing good, and the gear level that halves its work, when no purchase is within reach', () => {
    const f = mergeFixtures(cfg).festivalNear;
    // Nothing affordable: the Festival goal. Its only unfilled line is Noodles 5 (lines 0 to 2 filled).
    const poor = { ...f, cash: 0 };
    const fest = festivalAdvice(cfg, poor)!;
    expect(fest.line).toBe(3);
    expect(fest.good).toEqual({ c: f.merge.festival.lines[3].c, k: f.merge.festival.lines[3].k });
    // Noodles gear 3: base 1; level 11 makes base 2 and halves the work.
    expect(fest.gear).toEqual({ c: 4, level: 11, cost: mergeParams(cfg, poor).chains[4].gearCost });
    const a = advice(cfg, poor)!;
    expect(a).toMatchObject({ kind: 'gear', target: 4, cost: fest.gear!.cost });
    // At the top base tier no level halves it: the line itself.
    const top = { ...poor, merge: { ...poor.merge, chains: poor.merge.chains.map((ch, c) => (c === 4 ? { ...ch, gear: 31 } : ch)) } };
    expect(festivalAdvice(cfg, top)!.gear).toBeNull();
    expect(advice(cfg, top)).toMatchObject({ kind: 'festival', target: 3 });
    // An affordable purchase comes first.
    const rich = { ...f, cash: 1e12 };
    expect(advice(cfg, rich)).toEqual(purchaseAdvice(cfg, rich));
    // A chain the Festival asks for is closed: no Festival goal.
    expect(festivalAdvice(cfg, mergeFixtures(cfg).minute10)).toBeNull();
  });

  it('rounds the wait as the goal line prints it', () => {
    expect(waitEstimate(0)).toEqual({ n: 0, unit: 's' });
    expect(waitEstimate(3)).toEqual({ n: 10, unit: 's' });
    expect(waitEstimate(18)).toEqual({ n: 20, unit: 's' });
    expect(waitEstimate(130)).toEqual({ n: 2, unit: 'min' });
    expect(waitEstimate(4000)).toEqual({ n: 1, unit: 'h' });
  });
});

describe('the firefly (hintsFor)', () => {
  it('points at the merge on the path at the start, then at the delivery; nothing while a sheet is open', () => {
    const g = freshState(cfg);
    const hints = hintsFor(cfg, g);
    expect(hints[0]).toMatchObject({ kind: 'drag', id: 'merge:0:1' });
    expect(hints[0].from).toMatch(/^cell:\d+$/);
    expect(hintsFor(cfg, g, { sheetOpen: true })).toEqual([]);
    expect(hintsFor(cfg, g, { armed: true })).toEqual([]);
    // A Twin Skewer on the board: the delivery to the fox comes first.
    const cell = g.merge.board.findIndex((c) => c === null);
    const twin = { ...g, merge: { ...g.merge, board: g.merge.board.map((c, i) => (i === cell ? { c: 0, k: 2 } : c)) } };
    expect(hintsFor(cfg, twin)[0]).toEqual({ id: 'deliver:0', kind: 'drag', from: `cell:${cell}`, to: 'counter:0' });
  });

  it('points at the advised purchase when it is affordable, and at a waiting gift box', () => {
    const g = game([{ c: 0, gear: 5, stall: 2, best: 5 }], 5000, [300]);
    const goal = advice(cfg, g)!;
    const hints = hintsFor(cfg, { ...g, merge: { ...g.merge, gift: { ...g.merge.gift, boxes: [{ coins: 5, slots: [{ kind: 'spark' }] }] } } });
    expect(hints.find((h) => h.id.startsWith('buy:'))).toMatchObject({ kind: 'point', to: goal.kind === 'shutter' ? `shutter:${goal.target}` : `front:${goal.target}` });
    expect(hints[hints.length - 1]).toEqual({ id: 'giftbox', kind: 'point', to: 'giftbox' });
  });
});

describe('a line left behind by two base steps (Decision M34)', () => {
  /** A Tea ticket of tier 2 drawn at gear 1 (b = 1), now at gear 21 (b = 3): no new drop makes a Cup of Tea. */
  function leftBehind(onBoard: boolean): MergeGame {
    const g = game([{ c: 0, gear: 3, best: 4 }, { c: 1, gear: 21, best: 4 }], 0);
    const ticket: Ticket = { id: 7, lines: [{ c: 1, k: 2, filled: false }, { c: 0, k: 3, filled: false }], gold: false, customer: 0, coat: 0 };
    const board = g.merge.board.map((cell, i) => (onBoard && i === g.merge.board.findIndex((x) => x === null) ? { c: 1, k: 2 } : cell));
    return { ...g, merge: { ...g.merge, board, counters: g.merge.counters.map((ct, j) => (j === 0 ? { ...ct, ticket, refillAt: null } : ct)) } };
  }

  it('lineUnmakeable is the one test: below the base tier and unfilled; one base step (k = b) is still makeable', () => {
    const g = leftBehind(false);
    expect(lineUnmakeable(cfg, g, { c: 1, k: 2, filled: false })).toBe(true);
    expect(lineUnmakeable(cfg, g, { c: 1, k: 2, filled: true })).toBe(false);
    expect(lineUnmakeable(cfg, g, { c: 1, k: 3 })).toBe(false); // exactly b: a base drop fills it by a drag
    expect(lineUnmakeable(cfg, g, { c: 0, k: 3 })).toBe(false);
  });

  it('the advice never counts it as within reach, and the firefly points at its ticket (Not tonight) unless the good is at hand', () => {
    const g = leftBehind(false);
    expect(nearestTicket(cfg, g)).toBeNull();
    expect(hintsFor(cfg, g)).toContainEqual({ id: 'notTonight:0', kind: 'point', to: 'counter:0' });
    const held = leftBehind(true);
    expect(nearestTicket(cfg, held)).toBe(0);
    expect(hintsFor(cfg, held).some((h) => h.id === 'notTonight:0')).toBe(false);
    expect(hintsFor(cfg, held)[0]).toMatchObject({ id: 'deliver:0', to: 'counter:0' });
  });
});

describe('the awning looks (Decision M29)', () => {
  it('three looks: stall levels 1 to 4 plain, 5 to 9 scalloped, 10 and up double', () => {
    expect([1, 4, 5, 9, 10, 20, 31].map((L) => awningLook(cfg, L))).toEqual([0, 0, 1, 1, 2, 2, 2]);
    expect([1, 4, 5, 9, 10, 31].map((L) => awningLook(base, L))).toEqual([0, 0, 1, 1, 2, 2]);
  });
});

describe('the opening goal line (regression of the integration check, M42)', () => {
  /** A new game whose first merge made a Glazed Skewer (as a Lucky roll did before M42), the fox still waiting. */
  function glazedOpening(script: MergeGame['merge']['script']): MergeGame {
    const g = freshState(cfg, 12345);
    const board = g.merge.board.slice();
    const cells = board.map((x, i) => (x && typeof x === 'object' ? i : -1)).filter((i) => i >= 0);
    board[cells[0]] = null;
    board[cells[1]] = { c: 0, k: 3 };
    const book = g.merge.book.map((row, c) => (c === 0 ? row.map((v, i) => v || i < 3) : row));
    const chains = g.merge.chains.map((ch, c) => (c === 0 ? { ...ch, best: 3 } : ch));
    return { ...g, merge: { ...g.merge, board, book, chains, script } };
  }

  it('while the scripted tickets wait, the goal is the ticket, never a lantern', () => {
    const g = glazedOpening('fox');
    expect(advice(cfg, g)).toMatchObject({ kind: 'fillTicket', target: 0 });
    expect(adviceExtras(cfg, g)[0].kind).toBe('fillTicket');
  });

  it('a "make tier k" feat is measured in basic goods: a tier 3 is not within reach of a tier 6', () => {
    const g = glazedOpening('done');
    expect(adviceExtras(cfg, g).some((a) => a.kind === 'lantern')).toBe(false);
    // A tier 5 is half of a tier 6 in basic goods: within reach (meta.lanternReach 0.5).
    const five = { ...g, merge: { ...g.merge, chains: g.merge.chains.map((ch, c) => (c === 0 ? { ...ch, best: 5 } : ch)), book: g.merge.book.map((row, c) => (c === 0 ? row.map((v, i) => v || i < 5) : row)) } };
    expect(adviceExtras(cfg, five).find((a) => a.kind === 'lantern')?.target).toBe(3);
  });
});
