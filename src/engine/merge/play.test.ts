/**
 * The whole merge engine PLAYED through its public interface (src/engine/merge.ts) only, the way
 * the store actions and the screens reach it: no file under src/engine/merge/ is imported here and
 * nothing is replaced by a stand-in.
 *
 * 1. A scripted hand plays the first ten minutes as specification 3.1 tells them (with section 11:
 *    6 Pepper Skewers, M18; drops every 4 s, M3): merge, the fox's Twin Skewer, the hedgehog's
 *    Glazed Skewer, the first gear level, a shutter, the Tea stall, a minder, a gift box, the first
 *    Parade. The times are printed (3.1's are placeholders; section 8 is the gate), the order and
 *    the amounts are checked.
 * 2. A long random-but-legal player (10^4 actions over simulated hours: every action type, refusals
 *    included, season closes, time away) checked after EVERY action and tick:
 *    - the invariants of the fixtures' checker (`fixtureProblems`), cash finite and never negative;
 *    - coins only through the named sources (M37: five), coin for coin;
 *    - every ticket drawn (by the tick, the opening script or "Call the dragon") inside bounds (a)
 *      to (d) on the exact state it was drawn on (`checkBounds`);
 *    - a ticket's lines never change, its shown price never falls, and the paid price is the shown
 *      one (M19, M26);
 *    - a refused action returns the same object, and only a refused one (predicates from what a
 *      screen can see);
 *    - tick(a + b) = tick(a) then tick(b), and = stepping event by event, around the actions.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, fixtureProblems, freshState, mergeFixtures, mergeTestConfig, testPrng } from '../fixtures/merge';
import * as R from '../merge';

const cfg = mergeTestConfig();
const INCOME: readonly R.CoinSource[] = ['ticket', 'gift', 'till', 'basket', 'away'];
const OUT: readonly R.CoinSource[] = ['spend', 'undo'];

const goodAt = (g: R.MergeGame, i: number) => {
  const x = g.merge.board[i];
  return R.isGood(x) ? x : null;
};
const clockOf = (g: R.MergeGame) => g.stats.playSeconds;

/** Cells holding (c, k). */
function cellsOf(g: R.MergeGame, c: number, k: number): number[] {
  const out: number[] = [];
  g.merge.board.forEach((x, i) => R.isGood(x) && x.c === c && x.k === k && out.push(i));
  return out;
}

/** The lowest identical pair below tier 8 (a merge), or null. */
function lowestPair(g: R.MergeGame, chain?: number): [number, number] | null {
  let best: [number, number, number] | null = null;
  const seen = new Map<number, number>();
  g.merge.board.forEach((x, i) => {
    if (!R.isGood(x) || x.k >= R.TIERS || (chain !== undefined && x.c !== chain)) return;
    const key = x.c * 8 + x.k;
    const j = seen.get(key);
    if (j === undefined) seen.set(key, i);
    else if (!best || x.k < best[2]) best = [j, i, x.k];
  });
  return best ? [best[0], best[1]] : null;
}

/** A delivery: a good on the board that an unfilled line wants, as [cell, target code]; tickets before the Festival (only the opening script's with `scripted`). */
function delivery(g: R.MergeGame, scripted = false): [number, R.TargetCode] | null {
  const wanted = (code: R.TargetCode) => code >= R.TARGET_COUNTER && (!scripted || (code < R.TARGET_FESTIVAL && !!g.merge.counters[code - R.TARGET_COUNTER]?.ticket?.scripted));
  for (let i = 0; i < g.merge.board.length; i++) {
    const t = R.isGood(g.merge.board[i]) ? R.targetsFor(cfg, g, i).find(wanted) : undefined;
    if (t !== undefined) return [i, t];
  }
  return null;
}

// ============================================================================================ 1. the first ten minutes

/** The first ten minutes of `seed`'s new game (see the file comment); returns what happened when. */
function firstMinutes(seed: number) {
  {
    let g = freshState(cfg, seed);
    const times: Record<string, number> = {};
    const mark = (what: string) => (times[what] ??= clockOf(g));
    const paid: { id: number; coins: number; gold: boolean; at: number }[] = [];
    let luckyOpening = false;
    const ACT = 1.5;
    const check = () => expect(fixtureProblems(cfg, g, { afterPlay: true }), `at ${clockOf(g)} s`).toEqual([]);
    const onEvents = (ev: R.MergeEvent[]) => {
      for (const e of ev) {
        if (e.type === 'ticketPaid') paid.push({ id: e.ticket.id, coins: e.coins, gold: e.ticket.gold, at: clockOf(g) });
        if (e.type === 'paradeArrive') mark('parade');
        if (e.type === 'giftEarned') mark('giftEarned');
      }
    };
    const tick = (dt: number) => {
      const ev: R.MergeEvent[] = [];
      g = R.advanceMerge(cfg, g, dt, 0, ev);
      onEvents(ev);
      check();
    };
    /** One player action; it must be accepted (a new object), then the hand rests ACT seconds. */
    const act = (what: string, f: (x: R.MergeGame, ev: R.MergeEvent[]) => R.MergeGame) => {
      const ev: R.MergeEvent[] = [];
      const next = f(g, ev);
      expect(next, what).not.toBe(g);
      g = next;
      onEvents(ev);
      check();
      tick(ACT);
    };
    const drop = (from: number, code: R.TargetCode) => (x: R.MergeGame, ev: R.MergeEvent[]) => R.dropAt(cfg, x, from, R.decodeTarget(code), ev).game;

    // 0:00. Six Pepper Skewers (M18), the fox holds a Twin Skewer ticket (+12), the hedgehog waits for the first merge.
    expect(cellsOf(g, 0, 1)).toHaveLength(6);
    const fox = g.merge.counters[0].ticket!;
    expect(cfg.merge.tickets.customers[fox.customer]).toBe('fox');
    expect(fox.lines).toEqual([{ c: 0, k: 2, filled: false }]);
    expect(R.ticketPrice(cfg, g, fox)).toBe(12);
    expect(g.merge.counters[1].ticket).toBeNull();
    expect(R.hintsFor(cfg, g)[0]).toMatchObject({ kind: 'drag', id: 'merge:0:1' });
    expect(g.cash).toBe(0);

    // The first merge: a Twin Skewer (a Ladder Book stamp, no coins; a Glazed one on a Lucky roll, 1 in 25);
    // the hedgehog steps up with a Glazed Skewer (+29).
    const [a, b] = lowestPair(g)!;
    const first = R.dropAt(cfg, g, a, { kind: 'cell', cell: b });
    expect(first.result.kind).toBe('merge');
    luckyOpening = first.result.kind === 'merge' && first.result.lucky;
    act('the first merge', () => first.game);
    expect(goodAt(g, b)).toEqual({ c: 0, k: luckyOpening ? 3 : 2 });
    expect(g.merge.book[0][1]).toBe(true); // a tier Lucky skipped is stamped too
    expect(g.cash).toBe(0);
    const hedgehog = g.merge.counters[1].ticket!;
    expect(cfg.merge.tickets.customers[hedgehog.customer]).toBe('hedgehog');
    expect(hedgehog.lines).toEqual([{ c: 0, k: 3, filled: false }]);
    expect(R.ticketPrice(cfg, g, hedgehog)).toBe(29);
    expect(R.checkBounds(cfg, g, 1, hedgehog.lines, { scripted: true })).toEqual({ a: false, bOutput: false, bHand: false, c: false, d: false });

    // Both scripted tickets from the opening board (2.7: they need exactly 6 Pepper Skewers): deliver, else merge.
    const scriptedPaid = () => paid.filter((p) => p.id === fox.id || p.id === hedgehog.id);
    while (scriptedPaid().length < 2) {
      const d = delivery(g, true);
      if (d) act('deliver a scripted ticket', drop(d[0], d[1]));
      else if (lowestPair(g, 0)) act('merge toward the scripted tickets', drop(...lowestPair(g, 0)!));
      else tick(ACT); // another counter's ticket took a good the script needed: wait for the next drop
    }
    // The first coins come from the first ticket, under 15 s (gate 1, 10.1 item 1).
    expect(paid[0].at).toBeLessThanOrEqual(15);
    expect(scriptedPaid().map((p) => [p.id, p.coins]).sort((x, y) => x[0] - y[0])).toEqual([
      [fox.id, 12],
      [hedgehog.id, 29],
    ]);
    expect(g.cash).toBe(paid.reduce((a, p) => a + p.coins, 0)); // nothing else paid yet: no merge, discovery or lantern pays
    expect(g.merge.script).toBe('done');

    // Then a plain hand until the first Parade is paid and a gift box opened: the scripted purchases
    // of 3.1 in order as soon as each is affordable, deliver, the gift box, the advised purchase,
    // merge the lowest pair, the Basket only when the board is deadlocked.
    const goals: [string, (x: R.MergeGame) => R.MergeGame][] = [
      ['gear2', (x) => R.levelGear(cfg, x, 0)],
      ['shutter', (x) => R.openShutter(cfg, x, 0)],
      ['tea', (x) => R.openStall(cfg, x, 1)],
      ['minder', (x) => R.hireMinder(cfg, x, 0)],
    ];
    for (let n = 0; n < 2000 && !(paid.some((p) => p.gold) && times.giftOpened !== undefined && clockOf(g) >= 600); n++) {
      const goal = goals.find(([what]) => times[what] === undefined);
      if (goal) {
        const next = goal[1](g);
        if (next !== g) {
          mark(goal[0]);
          act(goal[0], () => next);
          continue;
        }
      }
      const d = delivery(g);
      if (d) {
        act('deliver', drop(d[0], d[1]));
        continue;
      }
      if (g.merge.gift.boxes.length) {
        const box = g.merge.gift.boxes[0];
        const cash = g.cash;
        act('open the gift box', (x, ev) => R.openGiftBox(cfg, x, ev));
        mark('giftOpened');
        expect(g.cash).toBe(cash + box.coins * box.slots.filter((s) => s.kind === 'coins').length);
        continue;
      }
      if (!goal) {
        const adv = R.advice(cfg, g);
        if (adv && adv.cost > 0 && adv.cost <= g.cash) {
          const buy: Partial<Record<R.AdviceKind, (x: R.MergeGame, t: number) => R.MergeGame>> = {
            gear: (x, t) => R.levelGear(cfg, x, t),
            stall: (x, t) => R.levelStall(cfg, x, t),
            minderHire: (x, t) => R.hireMinder(cfg, x, t),
            minderLevel: (x, t) => R.levelMinder(cfg, x, t),
            openStall: (x, t) => R.openStall(cfg, x, t),
            shutter: (x, t) => R.openShutter(cfg, x, t),
          };
          const f = buy[adv.kind];
          if (f && adv.target !== null) {
            act(`advised ${adv.kind}`, (x) => f(x, adv.target!));
            continue;
          }
        }
      }
      const pair = lowestPair(g);
      if (pair) {
        act('merge', drop(pair[0], pair[1]));
        continue;
      }
      const basket = R.basketCell(cfg, g);
      if (basket !== null) {
        act('the Basket (deadlock)', drop(basket, R.TARGET_BASKET));
        continue;
      }
      tick(ACT);
    }
    console.log(`[play] seed ${seed} first minutes (s): ${Object.entries(times).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ')}; tickets paid by 10:00: ${paid.filter((p) => p.at <= 600).length}${luckyOpening ? '; the first merge was Lucky' : ''}`);
    // 3.1's order: the first gear level, then a shutter, then Tea, then a minder.
    expect(times.gear2).toBeLessThan(times.shutter);
    expect(times.shutter).toBeLessThan(times.tea);
    expect(times.tea).toBeLessThan(times.minder);
    expect(times.minder).toBeLessThan(600);
    expect(g.merge.chains[1].open).toBe(true);
    // The first Parade: due at season clock 360 s, a gold ticket, paid by the hand.
    expect(times.parade).toBeGreaterThanOrEqual(cfg.merge.parade.first);
    expect(paid.some((p) => p.gold)).toBe(true);
    expect(times.giftOpened).toBeGreaterThan(times.giftEarned);
    expect(g.merge.feats.tickets).toBeGreaterThanOrEqual(cfg.merge.gift.every);
    expect(g.merge.lanterns).toContain(1); // three tickets: a third counter
    expect(g.merge.counters.length).toBeGreaterThanOrEqual(3);
    return { times, luckyOpening };
  }
}

describe('the first ten minutes, played as 3.1 by a scripted hand', () => {
  it('merge, the fox, the hedgehog, gear level 2, a shutter, Tea, a minder, a gift box, the first Parade', () => {
    // M42: no merge of the opening is Lucky, on any seed (seed 12345's first merge rolled Lucky before M42).
    for (const seed of [4, 12345, 99, 7, 2026]) expect(firstMinutes(seed).luckyOpening).toBe(false);
  }, 120_000);
});

describe('the opening script is deterministic on every seed (M42, regression of the integration check)', () => {
  /** The opening of `seed` played by the shortest hand: merge the lowest pair, deliver to a scripted ticket. */
  function opening(seed: number) {
    let g = freshState(cfg, seed);
    const goals: string[] = [];
    const ordinary: { id: number; at: number }[] = [];
    let hedgehogPaidAt: number | null = null;
    let lucky = false;
    for (let n = 0; n < 60 && hedgehogPaidAt === null; n++) {
      const adv = R.advice(cfg, g);
      goals.push(adv ? `${adv.kind}:${adv.target}` : 'none');
      const ev: R.MergeEvent[] = [];
      const d = delivery(g, true);
      const pair = lowestPair(g, 0);
      if (d) g = R.dropAt(cfg, g, d[0], R.decodeTarget(d[1]), ev).game;
      else if (pair) {
        const res = R.dropAt(cfg, g, pair[0], { kind: 'cell', cell: pair[1] }, ev);
        if (res.result.kind === 'merge' && res.result.lucky) lucky = true;
        g = res.game;
      }
      g = R.advanceMerge(cfg, g, 1.5, 0, ev);
      for (const e of ev) {
        if (e.type === 'ticketDrawn' && !e.ticket.scripted) ordinary.push({ id: e.ticket.id, at: clockOf(g) });
        if (e.type === 'ticketPaid' && e.ticket.scripted && cfg.merge.tickets.customers[e.ticket.customer] === 'hedgehog') hedgehogPaidAt = clockOf(g);
      }
      expect(fixtureProblems(cfg, g, { afterPlay: true }), `seed ${seed} at ${clockOf(g)}`).toEqual([]);
    }
    return { g, goals, ordinary, hedgehogPaidAt, lucky };
  }

  it('on 300 seeds: no Lucky merge, both scripted tickets paid from the 6 opening goods, no ordinary ticket before the hedgehog is paid, the goal line on the tickets', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const o = opening(seed);
      expect(o.lucky, `seed ${seed}`).toBe(false);
      expect(o.hedgehogPaidAt, `seed ${seed}: the hedgehog paid from the opening board`).not.toBeNull();
      expect(o.hedgehogPaidAt!, `seed ${seed}`).toBeLessThanOrEqual(20); // M18: the first 20 s are merges and two paid tickets
      expect(o.g.merge.script).toBe('done');
      expect(o.ordinary, `seed ${seed}: an ordinary ticket while the script waited`).toEqual([]);
      // Every goal before the first coins is a scripted ticket (never a lantern, M42 with 2.10).
      const beforeCoins = o.goals.slice(0, 2);
      for (const goal of beforeCoins) expect(goal, `seed ${seed}`).toMatch(/^fillTicket:/);
      // The first ordinary ticket comes refillDelay after the hedgehog's is paid (at most one tick later).
      let g = o.g;
      let first: number | null = null;
      for (let n = 0; n < 20 && first === null; n++) {
        const ev: R.MergeEvent[] = [];
        g = R.advanceMerge(cfg, g, 0.5, 0, ev);
        const drawn = ev.find((e) => e.type === 'ticketDrawn');
        if (drawn) first = clockOf(g);
      }
      expect(first, `seed ${seed}`).not.toBeNull();
      expect(first! - o.hedgehogPaidAt!).toBeGreaterThanOrEqual(cfg.merge.tickets.refillDelay - 1.5 - 1e-9);
      expect(first! - o.hedgehogPaidAt!).toBeLessThanOrEqual(cfg.merge.tickets.refillDelay + 0.5 + 1e-9);
    }
  }, 120_000);

  it('a scripted ticket sent off with "Not tonight" holds the counter while the other waits, and ends the script when it was the last', () => {
    let g = freshState(cfg, 4);
    const [a, b] = lowestPair(g)!;
    g = R.dropAt(cfg, g, a, { kind: 'cell', cell: b }).game; // the hedgehog steps up
    expect(g.merge.script).toBe('hedgehog');
    g = R.notTonight(cfg, g, 0);
    expect(g.merge.counters[0]).toMatchObject({ ticket: null, refillAt: null, blockedAt: null });
    expect(g.merge.script).toBe('hedgehog');
    g = R.advanceMerge(cfg, g, 30, 0);
    expect(g.merge.counters[0].ticket).toBeNull();
    g = R.notTonight(cfg, g, 1);
    expect(g.merge.script).toBe('done');
    expect(g.merge.counters.every((ct) => ct.ticket || ct.refillAt === clockOf(g) + cfg.merge.tickets.refillDelay)).toBe(true);
    expect(fixtureProblems(cfg, g, { afterPlay: true })).toEqual([]);
  });
});

// ============================================================================================ 2. the long random player

type Kind =
  | 'merge'
  | 'deliver'
  | 'festival'
  | 'move'
  | 'anyDrop'
  | 'basket'
  | 'undo'
  | 'levelGear'
  | 'levelStall'
  | 'hireMinder'
  | 'levelMinder'
  | 'openStall'
  | 'openShutter'
  | 'advised'
  | 'notTonight'
  | 'fillLine'
  | 'gearRush'
  | 'callDragon'
  | 'giftBox'
  | 'close'
  | 'away';

/** Lines and the highest shown price of every ticket seen, by id. */
type Seen = Map<number, { lines: string; price: number }>;

interface Run {
  g: R.MergeGame;
  seen: Seen;
  accepted: Map<Kind, number>;
  refused: Map<Kind, number>;
  drawn: number;
  /** Every event type the rules reported. */
  events: Set<R.MergeEvent['type']>;
  closes: number;
  ticks: number;
  splits: number;
}

const linesKey = (t: R.Ticket) => JSON.stringify(t.lines.map((l) => [l.c, l.k, !!l.stretch]));
const ok = { a: false, bOutput: false, bHand: false, c: false, d: false };

/** The checks of every step: invariants, cash, the coins' sources, lines and prices of the tickets out. */
function checkStep(run: Run, before: R.MergeGame, after: R.MergeGame, what: string): void {
  expect(fixtureProblems(cfg, after, { afterPlay: true }), what).toEqual([]);
  expect(Number.isFinite(after.cash) && after.cash >= 0, `${what}: cash ${after.cash}`).toBe(true);
  if (after.merge.season === before.merge.season) {
    const a = before.merge.mstats.coins;
    const b = after.merge.mstats.coins;
    let booked = 0;
    for (const s of Object.keys(b) as R.CoinSource[]) {
      const d = b[s] - a[s];
      if (d === 0) continue;
      booked += d;
      if (INCOME.includes(s)) expect(d, `${what}: ${s}`).toBeGreaterThan(0);
      else {
        expect(OUT, `${what}: source ${s}`).toContain(s);
        expect(d, `${what}: ${s}`).toBeLessThan(0);
      }
    }
    expect(Object.keys(b).sort(), what).toEqual([...INCOME, ...OUT].sort());
    expect(Math.abs(after.cash - before.cash - booked), `${what}: cash moved ${after.cash - before.cash}, booked ${booked}`).toBeLessThanOrEqual(1e-6 * Math.max(1, after.cash));
  }
  for (const ct of after.merge.counters) {
    const t = ct.ticket;
    if (!t) continue;
    const price = R.ticketPrice(cfg, after, t);
    const prev = run.seen.get(t.id);
    if (prev) {
      expect(linesKey(t), `${what}: ticket ${t.id} lines`).toBe(prev.lines);
      expect(price, `${what}: ticket ${t.id} price fell`).toBeGreaterThanOrEqual(prev.price);
    }
    run.seen.set(t.id, { lines: linesKey(t), price: Math.max(price, prev?.price ?? 0) });
  }
}

/** Every ticket an action or an event drew, checked on the state it was drawn on. */
function checkDrawn(run: Run, state: R.MergeGame, ev: readonly R.MergeEvent[], opts: { scripted?: boolean } = {}): void {
  for (const e of ev) {
    if (e.type !== 'ticketDrawn') continue;
    run.drawn++;
    expect(run.seen.has(e.ticket.id), `ticket ${e.ticket.id} drawn twice`).toBe(false);
    const f = R.checkBounds(cfg, state, e.counter, e.ticket.lines, { parade: e.ticket.gold, scripted: opts.scripted || !!e.ticket.scripted });
    expect(f, `ticket ${e.ticket.id} (${linesKey(e.ticket)}) at ${clockOf(state)} s`).toEqual(ok);
  }
}

/**
 * A tick of `dt` three ways: in one call, split at `a`, and event by event (checking every ticket
 * drawn on the exact state before its refill). All three must be the same game with the same events.
 */
function tickThreeWays(run: Run, g: R.MergeGame, dt: number, a: number): R.MergeGame {
  const evOne: R.MergeEvent[] = [];
  const one = R.advanceMerge(cfg, g, dt, 0, evOne);
  const evSplit: R.MergeEvent[] = [];
  const split = R.advanceMerge(cfg, R.advanceMerge(cfg, g, a, 0, evSplit), dt - a, 0, evSplit);
  expect(split, `tick(${a} + ${dt - a}) at ${clockOf(g)}`).toEqual(one);
  expect(evSplit).toEqual(evOne);
  run.splits++;
  // Event by event (2.4): the queue's next event at its own time, then the clock to the end.
  const end = clockOf(g) + dt;
  let x = g;
  const evSteps: R.MergeEvent[] = [];
  for (let n = 0; n < 1_000_000; n++) {
    const e = R.nextEvent(cfg, x, end);
    if (!e) break;
    const at = x.stats.playSeconds === e.at ? x : { ...x, stats: { ...x.stats, playSeconds: e.at } };
    const ev: R.MergeEvent[] = [];
    x = R.runEvent(cfg, at, e, ev);
    checkDrawn(run, at, ev);
    evSteps.push(...ev);
  }
  x = x.stats.playSeconds === end ? x : { ...x, stats: { ...x.stats, playSeconds: end } };
  expect(x, `event stepping over ${dt} s at ${clockOf(g)}`).toEqual(one);
  expect(evSteps).toEqual(evOne);
  for (const e of evOne) run.events.add(e.type);
  run.ticks++;
  checkStep(run, g, one, `tick at ${clockOf(g)}`);
  return one;
}

/** Dyadic times keep the split exact (2.4; MECHANICS's note: equal clock values at the split points). */
const q = (x: number) => Math.max(1 / 64, Math.round(x * 64) / 64);

/** One random legal action of `kind`, with the rules' verdict checked against what the screens can see. */
function actOnce(run: Run, kind: Kind, r: () => number): void {
  const g = run.g;
  const m = g.merge;
  const P = R.mergeParams(cfg, g);
  const ev: R.MergeEvent[] = [];
  const clock = clockOf(g);
  const randCell = () => Math.floor(r() * R.BOARD_CELLS);
  const goods = m.board.map((x, i) => (R.isGood(x) ? i : -1)).filter((i) => i >= 0);
  const anyGood = () => goods[Math.floor(r() * goods.length)];
  let out: R.MergeGame = g;
  let refusedBy: boolean;
  const chainR = Math.floor(r() * R.CHAINS);
  const ch = P.chains[chainR];
  const afford = (cost: number | null) => cost !== null && cost <= g.cash + 1e-9;
  switch (kind) {
    case 'merge':
    case 'deliver':
    case 'festival':
    case 'move':
    case 'anyDrop':
    case 'basket': {
      if (!goods.length) return;
      let from = anyGood();
      let code: R.TargetCode;
      if (kind === 'merge') {
        const p = r() < 0.7 ? lowestPair(g) : null;
        const targets = R.targetsFor(cfg, g, from).filter((c) => c < R.BOARD_CELLS);
        if (p) [from, code] = p;
        else code = targets.length ? targets[Math.floor(r() * targets.length)] : randCell();
      } else if (kind === 'deliver' || kind === 'festival') {
        const d = kind === 'deliver' ? delivery(g) : null;
        const f = kind === 'festival' ? goods.find((i) => R.targetsFor(cfg, g, i).includes(R.TARGET_FESTIVAL)) : undefined;
        if (d) [from, code] = d;
        else if (f !== undefined) [from, code] = [f, R.TARGET_FESTIVAL];
        else code = R.TARGET_COUNTER + Math.floor(r() * 4); // a ticket with no matching line shakes
      } else if (kind === 'move') code = randCell();
      else if (kind === 'basket') code = R.TARGET_BASKET;
      else code = [R.TARGET_NONE, R.TARGET_FESTIVAL, R.TARGET_BASKET, R.TARGET_COUNTER, R.TARGET_COUNTER + 3, 57, -5, randCell()][Math.floor(r() * 8)];
      const res = R.dropAt(cfg, g, from, R.decodeTarget(code), ev);
      out = res.game;
      refusedBy = res.result.kind === 'return' || res.result.kind === 'ticketShake';
      // M42: no merge is Lucky while the opening script's tickets wait.
      if (res.result.kind === 'merge' && m.script !== 'done') expect(res.result.lucky, `a Lucky merge in the opening at ${clock}`).toBe(false);
      // Paid = shown: a ticket that paid in this drop paid the price it showed just before.
      for (const e of ev) {
        if (e.type !== 'ticketPaid') continue;
        const shown = m.counters[e.counter].ticket!;
        expect(shown.id).toBe(e.ticket.id);
        expect(e.coins, `ticket ${e.ticket.id}`).toBe(R.ticketPrice(cfg, g, shown));
        expect(e.coins).toBeGreaterThanOrEqual(run.seen.get(e.ticket.id)?.price ?? 0);
      }
      checkDrawn(run, out, ev, { scripted: true }); // the hedgehog of the opening script steps up at the first merge
      break;
    }
    case 'undo': {
      out = R.undoBasket(cfg, g, ev);
      const u = m.basketUndo;
      refusedBy = !u || clock >= u.until || g.cash + 1e-9 < u.refund || m.board[u.cell] !== null;
      break;
    }
    case 'levelGear':
      out = R.levelGear(cfg, g, chainR, ev);
      refusedBy = !afford(ch.gearCost);
      break;
    case 'levelStall':
      out = R.levelStall(cfg, g, chainR, ev);
      refusedBy = !afford(ch.stallCost);
      break;
    case 'hireMinder':
      out = R.hireMinder(cfg, g, chainR, ev);
      refusedBy = m.chains[chainR].minder !== 0 || !afford(ch.minderCost);
      break;
    case 'levelMinder':
      out = R.levelMinder(cfg, g, chainR, ev);
      // M45: a level the gear holds back (or at its top) changes nothing and is refused; the sheet shows why.
      refusedBy = m.chains[chainR].minder < 1 || R.minderLevelBlock(cfg, g, chainR) !== null || !afford(ch.minderCost);
      break;
    case 'openStall':
      out = R.openStall(cfg, g, chainR, ev);
      refusedBy = !afford(ch.openCost);
      break;
    case 'openShutter': {
      const grp = Math.floor(r() * 4);
      const s = P.shutters[grp];
      out = R.openShutter(cfg, g, grp, ev);
      refusedBy = !s || !s.allowed || !afford(s.cost);
      break;
    }
    case 'advised': {
      const adv = R.advice(cfg, g);
      if (!adv || adv.target === null || adv.cost <= 0 || adv.cost > g.cash) return;
      const t = adv.target;
      const f = { gear: R.levelGear, stall: R.levelStall, minderHire: R.hireMinder, minderLevel: R.levelMinder, openStall: R.openStall, shutter: R.openShutter }[adv.kind as 'gear'];
      if (!f) return;
      out = f(cfg, g, t, ev);
      refusedBy = false; // an affordable advised purchase is never refused (the goal line never contradicts the sheet)
      break;
    }
    case 'notTonight': {
      const j = Math.floor(r() * m.counters.length);
      const ct = m.counters[j];
      out = R.notTonight(cfg, g, j, ev);
      refusedBy = !ct.ticket || clock + 1e-9 < ct.notTonightAt || !R.notTonightRoom(g, j).room;
      break;
    }
    case 'fillLine':
    case 'gearRush':
    case 'callDragon': {
      const counter = kind === 'fillLine' && r() < 0.5 ? Math.floor(r() * m.counters.length) : undefined;
      const can = R.canWatchAd(cfg, g, kind, counter);
      out = R.grantAd(cfg, g, kind, counter, ev);
      refusedBy = !can;
      checkDrawn(run, g, ev); // the dragon's gold ticket, on the state it was drawn on
      break;
    }
    case 'giftBox':
      out = R.openGiftBox(cfg, g, ev);
      refusedBy = m.gift.boxes.length === 0;
      break;
    case 'close': {
      const can = R.canCloseSeason(cfg, g);
      out = R.closeSeason(cfg, g, FIXTURE_NOW + clock * 1000, ev);
      refusedBy = !can;
      if (!refusedBy) {
        run.closes++;
        expect(out.merge.season).toBe(m.season + 1);
        expect(out.merge.gift.boxes).toEqual([]); // M36
        run.seen.clear(); // the close resets the tickets
      }
      break;
    }
    case 'away': {
      const hours = r() * 6;
      const now = Math.max(g.lastSavedAt, g.stats.clockHigh) + hours * 3600_000;
      const off = R.mergeOffline(cfg, g, now);
      expect(off.game.cash).toBe(g.cash);
      expect(clockOf(off.game)).toBe(clock);
      out = R.bookAway({ ...off.game, lastSavedAt: now, stats: { ...off.game.stats, clockHigh: now } }, off.earnings);
      // Time already paid is never paid again.
      expect(R.mergeOffline(cfg, out, now).earnings).toBe(0);
      refusedBy = false;
      break;
    }
  }
  if (refusedBy) expect(out, `${kind} at ${clock}: refused must return the same object`).toBe(g);
  else expect(out, `${kind} at ${clock}: accepted must return a new object`).not.toBe(g);
  for (const e of ev) run.events.add(e.type);
  const tally = refusedBy ? run.refused : run.accepted;
  tally.set(kind, (tally.get(kind) ?? 0) + 1);
  checkStep(run, g, out, `${kind} at ${clock}`);
  run.g = out;
}

/** The mix of actions: mostly a hand that plays (deliveries, merges, purchases), and every other action now and then. */
const MIX: [Kind, number][] = [
  ['deliver', 22],
  ['festival', 6],
  ['merge', 28],
  ['advised', 8],
  ['levelGear', 1.5],
  ['levelStall', 1],
  ['hireMinder', 1],
  ['levelMinder', 1],
  ['openStall', 1],
  ['openShutter', 1.5],
  ['move', 3],
  ['anyDrop', 3],
  ['basket', 1.5],
  ['undo', 1],
  ['notTonight', 2],
  ['fillLine', 1],
  ['gearRush', 1],
  ['callDragon', 1],
  ['giftBox', 2],
  ['close', 2],
  ['away', 0.3],
];

function pickKind(r: () => number): Kind {
  const total = MIX.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [k, w] of MIX) {
    if (x < w) return k;
    x -= w;
  }
  return 'merge';
}

function play(start: R.MergeGame, seed: number, actions: number): Run {
  const r = testPrng(seed);
  const run: Run = { g: start, seen: new Map(), accepted: new Map(), refused: new Map(), drawn: 0, events: new Set(), closes: 0, ticks: 0, splits: 0 };
  checkStep(run, start, start, 'start');
  for (let n = 0; n < actions; n++) {
    let kind = pickKind(r);
    // A basket sale is often followed at once by its undo (the undo path needs the chip alive).
    if (kind === 'basket' && r() < 0.5) {
      actOnce(run, 'basket', r);
      kind = 'undo';
    }
    // A filled Festival is closed soon (the close is the player's choice; this player takes it).
    if (R.canCloseSeason(cfg, run.g) && r() < 0.2) kind = 'close';
    actOnce(run, kind, r);
    // The hand rests 0.5 to 3 s (dyadic), sometimes a long pause with the game running.
    const dt = r() < 0.02 ? q(30 + r() * 600) : q(0.5 + r() * 2.5);
    run.g = tickThreeWays(run, run.g, dt, q(r() * dt) >= dt ? dt / 2 : q(r() * dt));
  }
  return run;
}

describe('a long random-but-legal player, checked after every action and tick', () => {
  const report = (name: string, run: Run) =>
    console.log(
      `[play] ${name}: ${run.ticks} ticks over ${(clockOf(run.g) / 3600).toFixed(2)} h of play, season ${run.g.merge.season + 1}, ${run.closes} closes, ${run.drawn} tickets drawn, ${run.g.merge.feats.tickets} paid, cash ${run.g.cash}; accepted ${JSON.stringify(Object.fromEntries(run.accepted))}; refused ${JSON.stringify(Object.fromEntries(run.refused))}`,
    );

  it('from a new game: 6,000 actions over hours of play', () => {
    const run = play(freshState(cfg, 777), 777, 6000);
    report('from a new game', run);
    // Every action type was taken at least once (a purchase directly or as the advised one), and refused too.
    for (const k of ['merge', 'deliver', 'move', 'anyDrop', 'basket', 'undo', 'levelGear', 'advised', 'notTonight', 'fillLine', 'gearRush', 'callDragon', 'giftBox', 'away'] as Kind[]) {
      expect(run.accepted.get(k) ?? 0, `accepted ${k}`).toBeGreaterThan(0);
    }
    const kinds: R.MergeEvent['type'][] = ['merge', 'move', 'swap', 'lineFill', 'ticketShake', 'ticketPaid', 'basketSell', 'undo', 'undoExpired', 'stallOpen', 'gearLevel', 'stallLevel', 'minderHire', 'minderLevel', 'shutterOpen', 'notTonight', 'adGranted', 'giftEarned', 'giftOpened', 'giftGoodPlaced', 'lanternLit', 'discovery', 'drop', 'shelved', 'released', 'sale', 'tillRoll', 'ticketDrawn', 'paradeArrive'];
    for (const k of kinds) expect(run.events.has(k), `event ${k}`).toBe(true);
    for (const k of ['levelGear', 'openStall', 'openShutter', 'undo', 'notTonight', 'close', 'anyDrop'] as Kind[]) expect(run.refused.get(k) ?? 0, `refused ${k}`).toBeGreaterThan(0);
    expect(clockOf(run.g)).toBeGreaterThan(3 * 3600);
    expect(run.g.merge.chains.filter((ch) => ch.open).length).toBeGreaterThanOrEqual(3);
  }, 600_000);

  it('from the Festival one line short: 4,000 actions with season closes', () => {
    const run = play(mergeFixtures(cfg).festivalNear, 2026, 4000);
    report('from the Festival one line short', run);
    expect(run.closes).toBeGreaterThanOrEqual(1);
    for (const k of ['festivalLine', 'festivalDone', 'seasonClosed'] as R.MergeEvent['type'][]) expect(run.events.has(k), `event ${k}`).toBe(true);
    expect(run.accepted.get('festival') ?? 0).toBeGreaterThan(0);
    expect(run.g.merge.season).toBeGreaterThanOrEqual(1);
  }, 600_000);
});
