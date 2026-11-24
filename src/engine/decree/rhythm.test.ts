/**
 * The rules lead's pass of 24 November (afternoon): the attack's findings (notes/rules-attack.md, D41) and the
 * desk's rhythm (D42 (a) to (h)), each with the regression that failed before its fix. On the frozen test content
 * (lesson 4: no tuned number is pinned).
 */
import { describe, expect, it, vi } from 'vitest';
import * as R from '../decree';
import { decreeEngineMode as M } from '../decreeMode';
import { baseGameState, built, decreeStateProblems, decreeTestConfig, DECREE_TEST_DECK, FIXTURE_NOW } from '../fixtures/decree';

const cfg = decreeTestConfig();
const c = cfg.decree;
const deskPaper = (g: R.DecreeGame) => (g.decree.desk?.type === 'paper' ? g.decree.desk.paper : null);
const deskSlip = (g: R.DecreeGame) => (g.decree.desk?.type === 'slip' ? g.decree.desk.slip : null);
const withSlip = (g: R.DecreeGame, slip: R.Slip): R.DecreeGame => ({ ...g, decree: { ...g.decree, desk: { type: 'slip', slip, landedAt: g.stats.playSeconds }, emptySince: null } });
const mayorIds = (arch: string) => c.deck.papers.filter((p) => p.office === 'mayor' && p.archetype === arch).map((p) => p.id);

/** Decides whatever lies on the desk (`choice`; a refused sign becomes a refusal) and commits a pending paper. */
function flick(cf: R.DecreeConfig, g: R.DecreeGame, choice: R.Choice, events: R.DecreeEvent[] = []): R.DecreeGame {
  let s = R.decide(cf, g, choice, g.stats.playSeconds, events);
  if (s === g) s = R.decide(cf, g, 'refuse', g.stats.playSeconds, events);
  return s.decree.pending ? R.commitPending(cf, s, s.stats.playSeconds, events) : s;
}

describe('the attack on the rules (notes/rules-attack.md)', () => {
  it('finding 1 (D33): the Standing Order keeps back every waiting paper on the state AFTER its own purchase', () => {
    const ids = c.deck.papers.filter((p) => p.office === 'mayor' && (p.archetype === 'project' || p.archetype === 'committee' || p.archetype === 'vanity')).map((p) => p.id);
    for (const ministries of [[1, 1], [6, 4, 2, 1], [20, 15, 10, 5]]) {
      let g = built({ day: 10, ministries, desk: ids[0], tray: ids.slice(1, 11), cash: 0 });
      g = R.setStandingOrder(cfg, { ...g, entitlements: { ...g.entitlements, products: [c.products.standingOrder] } }, true);
      const pick = R.standingOrderPick(cfg, g)!;
      // At the old threshold (3 × the price plus every paper at today's B) it no longer buys when the level would leave a paper short.
      const old = c.standingOrder.times * pick.price + R.standingOrderReserve(cfg, g) + 1e-6;
      const atOld = { ...g, cash: old };
      const after = R.afterPurchase(cfg, atOld, pick.purchase);
      const shortAfter = old - pick.price < R.standingOrderReserve(cfg, after);
      expect(R.standingOrderStep(cfg, atOld, []) === atOld).toBe(shortAfter);
      // At its threshold it buys, and every paper on the desk and in the tray is still affordable when flicked at once.
      const need = R.standingOrderNeed(cfg, g, pick);
      const ev: R.DecreeEvent[] = [];
      const s0 = R.advanceDecree(cfg, { ...g, cash: need * (1 + 1e-12) + 1e-6 }, 0.01, 0, ev);
      expect(ev.some((e) => e.type === 'levelBought')).toBe(true);
      expect(s0.cash + 1e-6).toBeGreaterThanOrEqual(R.standingOrderReserve(cfg, s0));
      let s = R.setStandingOrder(cfg, s0, false);
      // Only the papers that were waiting when it bought (a follow-up a signed Committee brings back is a new paper).
      const waiting = new Set([deskPaper(s0)!.id, ...s0.decree.tray.map((p) => p.id)]);
      let unaffordable = 0;
      let seen = 0;
      for (let k = 0; k < 40 && s.decree.desk; k++) {
        if (s.decree.desk.type === 'slip') {
          s = R.decide(cfg, s, 'refuse', s.stats.playSeconds, []);
          continue;
        }
        const mine = waiting.has(deskPaper(s)!.id);
        if (mine) seen++;
        if (mine && !R.stripOf(cfg, s, 'sign')!.affordable) unaffordable++;
        s = flick(cfg, s, mine ? 'sign' : 'refuse');
      }
      expect(seen).toBe(waiting.size);
      expect(unaffordable).toBe(0);
    }
  });

  it('finding 2 (2.8): a "Say nothing" chosen in the run-up ends with the term (at the count), never runs into the next', () => {
    const C = R.callDay(cfg, built({}));
    let g = built({ day: C, gossip: cfg.decree.offices[0].gossipMax, cash: 1e6, desk: null, ministries: [10, 5] });
    g = R.checkScandal(cfg, g, []);
    g = R.landNext(cfg, g, g.stats.playSeconds, []);
    g = R.callElection(cfg, g, g.stats.playSeconds, []);
    expect(deskPaper(g)?.kind).toBe('scandal');
    g = flick(cfg, g, 'refuse');
    expect(g.decree.scandal).not.toBeNull();
    for (let k = 0; k < 400 && g.decree.phase === 'campaign'; k++) {
      if (R.canCount(cfg, g)) {
        g = R.countVotes(cfg, g, []);
        break;
      }
      if (g.decree.desk) g = flick(cfg, g, 'refuse');
      else g = R.advanceDecree(cfg, g, 1, 0, []);
    }
    expect(g.decree.phase).toBe('count');
    expect(g.decree.scandal).toBeNull();
    expect(R.decreeParams(cfg, g).sayNothing).toBe(1);
    g = R.chooseAfterResult(cfg, R.endElectionNight(cfg, g), 'stay', 0, []);
    expect(g.decree.scandal).toBeNull();
    // An older save on the result sheet with the scandal still running: the new term ends it.
    const old = { ...g, decree: { ...g.decree, phase: 'result' as const, count: R.count(cfg, g), result: { won: true, nrGained: 0, meritHeld: 0, meritSweep: false, carried: [], resigned: null }, scandal: { papersLeft: 10, factor: 0.8 } } };
    expect(R.newTerm(cfg, old, []).decree.scandal).toBeNull();
  });

  it('finding 3: a corrupted save never freezes the term or crashes the poll and the ribbon', () => {
    const base = baseGameState(FIXTURE_NOW);
    const g = built({ day: 5, ministries: [5, 3], cash: 500 });
    const save = JSON.parse(JSON.stringify(g)) as { decree: Record<string, unknown> };
    const cases: [string, unknown][] = [
      ['nextArrivalAt', undefined],
      ['nextArrivalAt', 'x'],
      ['nextArrivalAt', {}],
      ['campaign', 'x'],
      ['campaign', {}],
      ['scandal', 'x'],
      ['count', { held: 'x' }],
      ['emptySince', []],
      ['nr', -1000],
      ['losses', -3],
      ['phase', 'nonsense'],
      ['monumentOffer', 42],
      ['day', 'x'],
    ];
    for (const [field, value] of cases) {
      const raw = JSON.parse(JSON.stringify(save)) as { decree: Record<string, unknown> };
      if (value === undefined) delete raw.decree[field];
      else raw.decree[field] = value;
      const r = M.reconcile(cfg, base, raw) as R.DecreeGame;
      expect(decreeStateProblems(cfg, r), field).toEqual([]);
      expect(() => R.poll(cfg, r)).not.toThrow();
      expect(() => R.termRibbon(cfg, r)).not.toThrow();
      expect(r.decree.nr).toBeGreaterThanOrEqual(0);
      expect(r.decree.losses).toBeGreaterThanOrEqual(0);
      expect(R.decreeParams(cfg, r).B).toBeGreaterThan(0);
      // Visitors keep coming: in two minutes of play the day moves on.
      let x = r;
      for (let t = 0; t < 120 * 4 && x.decree.day < r.decree.day + 3; t++) {
        x = R.advanceDecree(cfg, x, 0.25, 0, []);
        if (x.decree.desk) x = flick(cfg, x, 'refuse');
      }
      expect(x.decree.day, field).toBeGreaterThan(r.decree.day);
    }
    // A run-up without its campaign is over: the count can be held once the desk is clear.
    const runUp = JSON.parse(JSON.stringify({ ...g, decree: { ...g.decree, phase: 'campaign', campaign: null, tray: [], desk: null } }));
    const ru = M.reconcile(cfg, base, runUp) as R.DecreeGame;
    expect(ru.decree.campaign).toEqual({ C: new Array(cfg.decree.offices[0].districts.length).fill(0), papersLeft: 0, rallyDone: true });
    expect(R.canCount(cfg, ru)).toBe(true);
  });

  it('finding 17 (the regression engineer): a save the rules cannot read starts afresh with one console warning naming the field', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const base = baseGameState(FIXTURE_NOW);
    const g = built({ day: 5 });
    const r = M.reconcile(cfg, base, { ...JSON.parse(JSON.stringify(g)), decree: { ...JSON.parse(JSON.stringify(g.decree)), seed: 'x' } }) as R.DecreeGame;
    expect(r.decree.day).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('decree.seed');
    warn.mockClear();
    M.reconcile(cfg, base, JSON.parse(JSON.stringify(g)));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('D41: nothing is bought on election night or on the result sheet; the Ledger stays open through the run-up', () => {
    const C = R.callDay(cfg, built({}));
    let g = built({ day: C, cash: 1e9, ministries: [10, 5, 5, 5], desk: null });
    g = R.callElection(cfg, g, 0, []);
    expect(g.decree.phase).toBe('campaign');
    expect(R.raise(cfg, g, 1, [])).not.toBe(g);
    for (let k = 0; k < 400 && g.decree.phase === 'campaign'; k++) {
      if (R.canCount(cfg, g)) g = R.countVotes(cfg, g, []);
      else if (g.decree.desk) g = flick(cfg, g, 'sign');
      else g = R.advanceDecree(cfg, g, 1, 0, []);
    }
    for (const night of [g, R.endElectionNight(cfg, g)]) {
      expect(['count', 'result']).toContain(night.decree.phase);
      expect(R.raise(cfg, night, 1, [])).toBe(night);
      expect(R.openMinistry(cfg, night, 3, [])).toBe(night);
      const offer = { ...night, decree: { ...night.decree, monumentOffer: 'bust' } };
      expect(R.buyVanity(cfg, offer, [])).toBe(offer);
      expect(R.canBuy(cfg, night, { type: 'level', ministry: 1 }, null)).toBe('closed');
      const l = R.ledger(cfg, night);
      expect(l.shut).toBe(true);
      expect(l.rows.every((row) => row.refusal === 'closed')).toBe(true);
    }
    expect(R.ledger(cfg, built({ cash: 1e9 })).shut).toBe(false);
  });

  it('D41: a grievance and a front page go on top of the tray whatever its cap; `desk.eventOverCap` is gone and an old game.json with it still loads', () => {
    const full = c.desk.trayCap;
    let g = built({ day: 5, moods: [15, 15, 15], ministries: [5, 3, 3, 3], desk: mayorIds('swap')[0], tray: mayorIds('project').concat(mayorIds('fee')).concat(mayorIds('treat')).slice(0, full) });
    g = R.checkStrikes(cfg, g, []);
    expect(g.decree.tray.length).toBe(full + 3);
    expect(g.decree.tray.slice(0, 3).every((p) => p.kind === 'strike')).toBe(true);
    expect('eventOverCap' in c.desk).toBe(false);
    expect(() => decreeTestConfig({ desk: { ...c.desk, eventOverCap: 1 } } as never)).not.toThrow();
  });
});

describe('D42 (a): a slip carries a bundle of levels', () => {
  it('prints the number of levels, their summed price and gain, up to the next storey; up applies exactly what it printed', () => {
    let checked = 0;
    for (const level of [1, 3, 7, 11, 12, 30]) {
      for (const cash of [200, 2_000, 20_000, 2e6]) {
        const g0 = built({ office: 0, ministries: [level, level, 2, 1], cash });
        // On an empty desk with an empty tray the slip lands 1.0 s after (tick.ts); it is a bundle of advice's level.
        const g = R.advanceDecree(cfg, g0, c.desk.slipDelay + 0.001, 0, []);
        const slip = deskSlip(g);
        if (!slip || slip.purchase.type !== 'level') continue;
        const i = slip.purchase.ministry;
        const L = g.decree.ministries[i].level;
        expect(slip.levels).toBeGreaterThanOrEqual(1);
        expect(slip.levels).toBeLessThanOrEqual(R.bundleRoom(cfg, L));
        expect(Math.floor((L + slip.levels - 1) / c.ministry.storeyEvery)).toBeLessThanOrEqual(Math.floor(L / c.ministry.storeyEvery) + 1);
        let price = 0;
        let x = g;
        for (let k = 0; k < slip.levels; k++) {
          price += R.levelCost(cfg, x, i);
          x = { ...x, decree: { ...x.decree, ministries: x.decree.ministries.map((m, j) => (j === i ? { open: true, level: m.level + 1 } : m)) } };
        }
        expect(slip.price).toBe(price);
        // It is the largest bundle the treasury pays above the slip's reserve (one more level would not be).
        if (slip.levels < R.bundleRoom(cfg, L)) {
          const more = price + R.levelCost(cfg, x, i);
          // (on the desk as it was when the slip landed: empty, so D16's 15 s of B are kept back too)
          const after = { ...x, decree: { ...x.decree, desk: null, ministries: x.decree.ministries.map((m, j) => (j === i ? { open: true, level: m.level + 1 } : m)) } };
          expect(g.cash - more).toBeLessThan(R.slipReserve(cfg, after) + 1e-9);
        }
        const I0 = R.decreeParams(cfg, g).I;
        const events: R.DecreeEvent[] = [];
        const up = R.decide(cfg, g, 'sign', g.stats.playSeconds, events);
        expect(up.decree.ministries[i].level).toBe(L + slip.levels);
        expect(up.cash).toBe(g.cash - slip.price);
        expect(R.decreeParams(cfg, up).I - I0).toBeCloseTo(slip.rateGain, 6);
        expect(Math.abs(R.decreeParams(cfg, up).I - I0 - slip.rateGain)).toBeLessThanOrEqual(1e-9 * Math.max(1, I0));
        expect(events.filter((e) => e.type === 'levelBought').length).toBe(slip.levels);
        expect(up.decree.stats.slipsTaken).toBe(g.decree.stats.slipsTaken + 1);
        if (slip.levels > 1) checked++;
      }
    }
    expect(checked).toBeGreaterThan(3);
  });

  it('an opening is a slip of its own (one level); a level slip that reaches a storey brings its ribbon form', () => {
    const g0 = built({ office: 0, ministries: [1, 0, 0, 0], cash: 1e9 });
    const open = R.bundleOf(cfg, g0, R.slipOf(cfg, g0, { type: 'open', ministry: 1 })!);
    expect(open.levels).toBe(1);
    const g1 = built({ office: 0, ministries: [10, 5, 0, 0], cash: 1e9 });
    const slip = R.bundleOf(cfg, g1, R.slipOf(cfg, g1, { type: 'level', ministry: 0 })!);
    expect(slip.levels).toBe(2);
    const up = R.decide(cfg, withSlip(g1, slip), 'sign', 0, []);
    expect(up.decree.ministries[0].level).toBe(12);
    expect(up.decree.ribbonsDue).toEqual([{ ministry: 0, storey: 1 }]);
  });

  it('D40 stands for a bundle: a landed bundle is bought at its printed price whenever the treasury holds it, else "Short by"', () => {
    const g0 = built({ office: 0, ministries: [3, 0, 0, 0], cash: 1e9 });
    const slip = R.bundleOf(cfg, g0, R.slipOf(cfg, g0, { type: 'level', ministry: 0 })!);
    expect(slip.levels).toBeGreaterThan(1);
    const lying = withSlip({ ...g0, cash: slip.price }, slip);
    expect(R.canBuy(cfg, lying, slip.purchase, slip.price)).toBeNull();
    const up = R.decide(cfg, lying, 'sign', 0, []);
    expect(up.cash).toBe(0);
    expect(up.decree.ministries[0].level).toBe(3 + slip.levels);
    const short = withSlip({ ...g0, cash: slip.price - 1 }, slip);
    expect(R.canBuy(cfg, short, slip.purchase, slip.price)).toBe('cash');
    expect(R.decide(cfg, short, 'sign', 0, [])).toBe(short);
    // A bundle is bought only from the desk: the Ledger's own Raise stays one level.
    expect(R.raise(cfg, g0, 0, []).decree.ministries[0].level).toBe(4);
    expect(R.buy(cfg, g0, { type: 'level', ministry: 0 }, slip.price, [], { levels: slip.levels })).toBe(g0);
  });

  it('a slip saved before bundles (no `levels`) reloads as one level', () => {
    const g0 = built({ office: 0, ministries: [3, 0, 0, 0], cash: 1e9 });
    const one = R.slipOf(cfg, g0, { type: 'level', ministry: 0 })!;
    const { levels: _drop, ...old } = one;
    void _drop;
    const raw = JSON.parse(JSON.stringify(withSlip(g0, old as R.Slip)));
    const r = M.reconcile(cfg, { ...baseGameState(FIXTURE_NOW), cash: 1e9 }, raw) as R.DecreeGame;
    expect(deskSlip(r)?.levels).toBe(1);
    expect(R.decide(cfg, r, 'sign', 0, []).decree.ministries[0].level).toBe(4);
  });
});

describe('D42 (b): between papers, a slip only every `slips.betweenEvery` decided papers', () => {
  it('lands after the second decided paper (2 by default), then counts again from the slip', () => {
    expect(c.slips.betweenEvery).toBe(2);
    const tray = mayorIds('swap').slice(1, 7);
    let g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e9, desk: mayorIds('swap')[0], tray });
    const kinds: string[] = [];
    for (let k = 0; k < 9; k++) {
      kinds.push(g.decree.desk?.type ?? '-');
      g = flick(cfg, g, g.decree.desk?.type === 'slip' ? 'sign' : 'refuse');
    }
    expect(kinds).toEqual(['paper', 'paper', 'slip', 'paper', 'paper', 'slip', 'paper', 'paper', 'slip']);
    // A form that leaves with no effect is not a decided paper (D39): it does not count toward the next slip.
    const three = decreeTestConfig({ slips: { betweenEvery: 3 } } as never);
    let h = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e9, desk: mayorIds('swap')[0], tray }, three);
    const k3: string[] = [];
    for (let k = 0; k < 8; k++) {
      k3.push(h.decree.desk?.type ?? '-');
      h = flick(three, h, h.decree.desk?.type === 'slip' ? 'sign' : 'refuse');
    }
    expect(k3).toEqual(['paper', 'paper', 'paper', 'slip', 'paper', 'paper', 'paper', 'slip']);
  });

  it('the field has a default, so a game.json without it loads; its range is 2 to 4', () => {
    const r = R.decreeParams(cfg, built({})); // the test config itself has no `slips` block
    expect(r).toBeTruthy();
    expect(Object.keys(DECREE_TEST_DECK).length).toBeGreaterThan(0);
    expect(decreeTestConfig().decree.slips.betweenEvery).toBe(2);
  });
});

describe('D42 (c): no stale slip', () => {
  it('a Raise in the Ledger of the ministry a landed slip names takes the slip back at once, with the Clerk\'s note, and the next paper lands', () => {
    const tray = [mayorIds('swap')[0]];
    const g0 = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e9, tray });
    const g = withSlip(g0, R.bundleOf(cfg, g0, R.slipOf(cfg, g0, { type: 'level', ministry: 1 })!));
    const events: R.DecreeEvent[] = [];
    const after = R.raise(cfg, g, 1, events);
    expect(after.decree.ministries[1].level).toBe(8);
    expect(events).toContainEqual({ type: 'slipReturned', reason: 'done' });
    expect(deskPaper(after)?.source).toBe(tray[0]);
    // Another ministry's Raise leaves the slip where it is.
    const other = R.raise(cfg, g, 0, []);
    expect(deskSlip(other)).toEqual(deskSlip(g));
  });

  it('on an empty desk the next slip is offered by the same rules (after 1.0 s); the Standing Order\'s purchase takes a stale slip back too', () => {
    const g0 = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e9 });
    const g = withSlip(g0, R.slipOf(cfg, g0, { type: 'level', ministry: 1 })!);
    const after = R.raise(cfg, g, 1, []);
    expect(after.decree.desk).toBeNull();
    expect(after.decree.emptySince).toBe(after.stats.playSeconds);
    const later = R.advanceDecree(cfg, after, c.desk.slipDelay + 0.01, 0, []);
    expect(deskSlip(later)).not.toBeNull();
    expect(R.slipVoid(cfg, later, later.decree.desk as R.DeskItem & { type: 'slip' })).toBeNull();
    // The Standing Order (governor term 2) buys the ministry a slip names: the slip goes back.
    const gov0 = built({ office: 1, term: c.standingOrder.fromGovernorTerm, ministries: [5, 3, 1, 1, 1, 1], cash: 1e12 });
    const gov = R.setStandingOrder(cfg, gov0, true);
    const pick = R.standingOrderPick(cfg, gov)!;
    const lying = withSlip(gov, R.slipOf(cfg, gov, pick.purchase)!);
    const ev: R.DecreeEvent[] = [];
    const bought = R.standingOrderStep(cfg, lying, ev);
    expect(bought).not.toBe(lying);
    expect(ev).toContainEqual({ type: 'slipReturned', reason: 'done' });
    expect(bought.decree.desk?.type === 'slip' && R.slipVoid(cfg, bought, bought.decree.desk)).toBeFalsy();
  });
});

describe('D42 (d): advice opens ministries', () => {
  it('an opening the treasury can pay is advised over a level whose payback is at most half as long; the record weighting never wins against it', () => {
    let seen = 0;
    for (const L of [1, 2, 3, 4, 6, 9]) {
      for (const cash of [160, 400, 3000]) {
        const g = built({ office: 0, ministries: [L, 0, 0, 0], cash });
        const p = R.decreeParams(cfg, g);
        const res = R.slipReserve(cfg, g, p);
        const cs = R.candidates(cfg, g, p);
        const pb = (x: R.Candidate) => x.price / x.gain;
        const level = cs.filter((x) => x.purchase.type === 'level')[0];
        const opens = cs.filter((x) => x.purchase.type === 'open' && cash >= x.price + res && pb(x) <= R.OPENING_FACTOR * pb(level));
        const slip = R.advice(cfg, g).slip;
        if (opens.length && cash >= level.price + res) {
          seen++;
          expect(slip?.purchase.type).toBe('open');
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a reader who never opens the Ledger is offered "Open Potholes" by the slips: the treasury saves for it instead of buying slower levels', () => {
    // A fresh game past the opening script, played by the slips alone (every slip taken, every paper refused).
    let g = built({ office: 0, ministries: [1, 0, 0, 0], cash: c.desk.treasury });
    let offeredAt: number | null = null;
    for (let t = 0; t < 600 && offeredAt === null; t += 0.5) {
      g = R.advanceDecree(cfg, g, 0.5, 0, []);
      const s = deskSlip(g);
      if (s?.purchase.type === 'open' && s.purchase.ministry === 1) offeredAt = g.stats.playSeconds;
      if (g.decree.desk) g = flick(cfg, g, g.decree.desk.type === 'slip' ? 'sign' : 'refuse');
    }
    expect(offeredAt).not.toBeNull();
    // Saving: while the opening pays back faster than every level, no slip offers a slower level.
    const s = built({ office: 0, ministries: [6, 0, 0, 0], cash: 60 });
    const cs = R.candidates(cfg, s);
    const save = R.savingFor(cs);
    expect(save?.purchase).toEqual({ type: 'open', ministry: 1 });
    const slip = R.advice(cfg, s).slip;
    if (slip) expect(slip.purchase.type === 'open' || slip.price / slip.rateGain <= save!.price / save!.gain).toBe(true);
  });
});

describe('D42 (e) and (f): the draw', () => {
  it('(f) the comic draw passes over the visitors of the last two papers when another eligible paper exists; a frame takes the spokesperson seen longer ago', () => {
    // A deck of three visitors only, so every draw has a choice to make.
    const names = ['Visitor One', 'Visitor Two', 'Visitor Three'];
    const papers = DECREE_TEST_DECK.papers!.map((p, k) => ({ ...p, visitor: { ...p.visitor, name: names[k % 3] } }));
    const three = decreeTestConfig({ deck: { ...DECREE_TEST_DECK, papers } } as never);
    let g = built({ office: 0, ministries: [3, 1, 1, 1], cash: 1e9 }, three);
    const order: string[] = [];
    for (let k = 0; k < 30; k++) {
      const before = R.recentVisitors(three, g);
      const next = R.drawNext(three, { ...g, decree: { ...g.decree, stats: { ...g.decree.stats, drawn: 1 } } }, k, []);
      const p = next.decree.tray[next.decree.tray.length - 1] ?? deskPaper(next)!;
      if (p.kind === 'comic') {
        expect(before.has(p.visitor.name)).toBe(false);
        order.push(p.visitor.name);
      }
      g = { ...next, decree: { ...next.decree, tray: [], desk: null } };
    }
    expect(order.length).toBeGreaterThan(20);
    // A frame without a visitor: the club's two spokespeople take turns (the one seen longer ago).
    const gov = decreeTestConfig({ offices: cfg.decree.offices.map((o, i) => (i === 1 ? { ...o, templateShare: 1 } : o)) } as never);
    let h = built({ office: 1, ministries: [5, 1, 1, 1, 1, 1], cash: 1e9, handLanded: 100 }, gov);
    const byClub: Record<string, string[]> = {};
    for (let k = 0; k < 60; k++) {
      h = R.drawNext(gov, { ...h, decree: { ...h.decree, stats: { ...h.decree.stats, drawn: 1 } } }, k, []);
      const p = h.decree.tray[h.decree.tray.length - 1] ?? deskPaper(h)!;
      if (p.kind === 'template') (byClub[p.visitor.club ?? '-'] ??= []).push(p.visitor.name);
      h = { ...h, decree: { ...h.decree, tray: [], desk: null } };
    }
    for (const list of Object.values(byClub)) for (let k = 1; k < list.length; k++) expect(list[k]).not.toBe(list[k - 1]);
  });

  it('(f) the draw stays a pure function of the save: a reload draws the same paper', () => {
    let g = built({ office: 0, ministries: [3, 1, 1, 1], cash: 1e9, tray: mayorIds('swap').slice(0, 2) });
    g = R.drawNext(cfg, g, 1, []);
    const raw = JSON.parse(JSON.stringify(g));
    const back = M.reconcile(cfg, baseGameState(FIXTURE_NOW), raw) as R.DecreeGame;
    expect(JSON.stringify(R.drawNext(cfg, back, 2, []).decree)).toBe(JSON.stringify(R.drawNext(cfg, g, 2, []).decree));
    expect(back.decree.visitorsSeen).toEqual(g.decree.visitorsSeen);
  });

  it('(e) a save from before the count of hand-written papers counts its decisions', () => {
    const g = built({ decisions: 55 });
    const raw = JSON.parse(JSON.stringify(g));
    delete raw.decree.handLanded;
    expect((M.reconcile(cfg, baseGameState(FIXTURE_NOW), raw) as R.DecreeGame).decree.handLanded).toBe(55);
    expect(R.landPaper(cfg, built({}), R.comicPaper(cfg, built({}), mayorIds('swap')[0]).paper, 0).decree.handLanded).toBe(1);
  });
});

describe('D42 (g): a due follow-up lands next', () => {
  it('ahead of the tray, behind a grievance or a front page', () => {
    const tray = mayorIds('swap').slice(0, 4);
    const g0 = built({ office: 0, ministries: [5, 3, 1, 1], cash: 1e6, desk: mayorIds('fee')[0], tray, decisions: 50 });
    const due = { ...g0, decree: { ...g0.decree, followUps: [{ kind: 'chain' as const, chainId: 'the-pumpkin', step: 1, choice: 'refuse' as const, dueAt: 50 }], slipOffered: true, papersSinceSlip: -100 } };
    const a = flick(cfg, due, 'refuse');
    expect(deskPaper(a)?.kind).toBe('followup');
    expect(a.decree.tray.map((p) => p.source)).toEqual(tray);
    expect(a.decree.followUps).toEqual([]);
    // Behind a grievance on top of the tray.
    const angry = R.checkStrikes(cfg, { ...due, decree: { ...due.decree, moods: [50, 50, 15] } }, []);
    expect(angry.decree.tray[0].kind).toBe('strike');
    const b = flick(cfg, angry, 'refuse');
    expect(deskPaper(b)?.kind).toBe('strike');
    expect(deskPaper(flick(cfg, b, 'refuse'))?.kind).toBe('followup');
    // A follow-up already drawn into the tray goes ahead of the papers before it.
    const drawn = R.followUpPaper(cfg, due, due.decree.followUps[0])!;
    const inTray = { ...drawn.g, decree: { ...drawn.g.decree, followUps: [], tray: [...due.decree.tray, drawn.paper] } };
    expect(deskPaper(flick(cfg, inTray, 'refuse'))?.id).toBe(drawn.paper.id);
    // The sticky note names it, unless its visitor's paper already lies on the desk (review finding 63).
    expect(R.stickyNote(cfg, due)?.chainId).toBe('the-pumpkin');
    const hildaDesk = built({ office: 0, ministries: [5, 3, 1, 1], cash: 1e6, desk: 'may-pumpkin-freedom', tray, decisions: 50 });
    const same = { ...hildaDesk, decree: { ...hildaDesk.decree, followUps: due.decree.followUps } };
    expect(R.stickyNote(cfg, same)).toBeNull();
  });
});

describe('D42 (h): Open the Doors only at half a tray or less', () => {
  it('is offered while the tray holds at most half its cap, never above', () => {
    const cap = c.desk.trayCap;
    const ids = c.deck.papers.filter((p) => p.office === 'mayor').map((p) => p.id);
    for (let n = 0; n <= cap; n++) {
      const g = built({ office: 0, ministries: [3, 1], desk: ids[20], tray: ids.slice(0, n) });
      expect(R.canWatchAd(cfg, g, 'openDoors'), `tray ${n}`).toBe(n * 2 <= cap);
      expect(R.openDoorsUseful(cfg, g)).toBe(n * 2 <= cap);
    }
  });
});

describe('the whole: a long careless game keeps every invariant with the new rhythm', () => {
  it('no state problem, printed equals applied on every slip, in 20 minutes of a fast player', () => {
    let g = built({ office: 0, ministries: [1, 0, 0, 0], cash: c.desk.treasury });
    let slips = 0;
    for (let t = 0; t < 1200; t += 0.5) {
      g = R.advanceDecree(cfg, g, 0.5, 0, []);
      const s = deskSlip(g);
      if (s) {
        const before = g;
        const up = R.decide(cfg, g, 'sign', g.stats.playSeconds, []);
        if (up !== before && !(before.decree.desk?.type === 'slip' && R.slipVoid(cfg, before, before.decree.desk))) {
          slips++;
          expect(up.cash).toBe(before.cash - s.price);
          if (s.purchase.type === 'level') expect(up.decree.ministries[s.purchase.ministry].level).toBe(s.drawnLevel + s.levels);
        }
        g = up === before ? R.decide(cfg, g, 'refuse', g.stats.playSeconds, []) : up;
      } else if (g.decree.desk) g = flick(cfg, g, t % 3 < 1 ? 'sign' : 'refuse');
      if (R.canCount(cfg, g)) g = R.chooseAfterResult(cfg, R.endElectionNight(cfg, R.countVotes(cfg, g, [])), 'stay', 0, []);
      else if (R.callNow(cfg, g)) g = R.callElection(cfg, g, g.stats.playSeconds, []);
      expect(decreeStateProblems(cfg, g)).toEqual([]);
    }
    expect(slips).toBeGreaterThan(20);
  });
});

describe('D46 (c): the Clerk\'s forms come when they can be paid', () => {
  const n = c.offices[0].requisitionEvery;
  const at = (g: R.DecreeGame, patch: Partial<R.DecreeGame['decree']>, cash: number): R.DecreeGame => ({ ...g, cash, decree: { ...g.decree, ...patch } });
  const lastDrawn = (g: R.DecreeGame) => g.decree.tray[g.decree.tray.length - 1] ?? deskPaper(g)!;

  it('regression: a requisition whose turn comes while no level can be paid waits (its turn kept, another paper drawn), then comes once one can', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], decisions: 50, day: 1 });
    const poor = at(g, { stats: { ...g.decree.stats, drawn: n - 1 } }, 0);
    expect(R.requisitionMinistry(cfg, poor)).toBeNull();
    const s = R.drawNext(cfg, poor, 1, []);
    expect(lastDrawn(s).kind).not.toBe('requisition');
    expect(s.decree.requisitionOwed).toBe(true);
    // Off its turn, the next draw that can pay a level brings it, at a price the treasury holds.
    const rich = at(s, { desk: null, tray: [] }, 1e6);
    const r = R.drawNext(cfg, rich, 2, []);
    expect(deskPaper(r)!.kind).toBe('requisition');
    expect(r.decree.requisitionOwed).toBe(false);
    expect(R.costOf(r.decree.desk!.type === 'paper' ? r.decree.desk.shown.sign : [])).toBeLessThanOrEqual(r.cash);
    // A move gives the turn up with the office.
    expect(R.MOVE_RESETS.some((x) => x.fields.includes('requisitionOwed'))).toBe(true);
  });

  it('regression: a ribbon is drawn only when the treasury holds its price; until then it waits with the Clerk and other papers come', () => {
    const g = built({ office: 0, ministries: [12, 7, 0, 0], decisions: 50, day: 1 });
    const poor = at(g, { ribbonsDue: [{ ministry: 0, storey: 1 }] }, 0);
    const s = R.drawNext(cfg, poor, 1, []);
    expect(lastDrawn(s).kind).not.toBe('ribbon');
    expect(s.decree.ribbonsDue).toEqual([{ ministry: 0, storey: 1 }]);
    const r = R.drawNext(cfg, at(s, { desk: null, tray: [] }, 1e6), 2, []);
    expect(deskPaper(r)!.kind).toBe('ribbon');
    expect(r.decree.ribbonsDue).toEqual([]);
  });

  it('a ribbon in the tray the treasury can no longer pay goes back to the Clerk: other papers land; alone, the desk waits and the ribbon lands once it can be paid', () => {
    const g = built({ office: 0, ministries: [12, 7, 0, 0], decisions: 50, day: 1, cash: 1e6 });
    const rib = R.ribbonPaper(cfg, g, 0);
    const com = R.comicPaper(cfg, rib.g, mayorIds('swap')[0]);
    // Behind it a comic paper: the comic lands, the ribbon waits with the Clerk; the sticky note never names it.
    const two = at(com.g, { desk: null, tray: [rib.paper, com.paper] }, 0);
    expect(R.nextLanding(cfg, two)).toMatchObject({ kind: 'tray', paper: { id: com.paper.id } });
    const landed = R.landNext(cfg, two, 0, []);
    expect(deskPaper(landed)!.id).toBe(com.paper.id);
    expect(landed.decree.tray).toEqual([]);
    expect(landed.decree.ribbonsDue.map((x) => x.ministry)).toEqual([0]);
    // Alone in the tray: nothing lands, the desk waits; with income the next arrival that can pay brings it (no deadlock).
    const alone = at(com.g, { desk: null, tray: [rib.paper], nextArrivalAt: 5 }, 0);
    expect(R.nextLanding(cfg, alone)).toBeNull();
    const w = R.landNext(cfg, alone, 0, []);
    expect(w.decree.desk).toBeNull();
    expect(w.decree.ribbonsDue.length).toBe(1);
    const ev: R.DecreeEvent[] = [];
    const later = R.advanceDecree(cfg, w, 3000, 0, ev);
    const ribbons = [deskPaper(later), ...later.decree.tray].filter((p) => p?.kind === 'ribbon');
    expect(ribbons.length).toBe(1);
    expect(later.decree.ribbonsDue).toEqual([]);
  });
});
