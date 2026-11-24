/**
 * The joined engine PLAYS (rules-lead): everything here goes through the public index
 * (src/engine/decree.ts) and the engine mode (src/engine/decreeMode.ts), never a rules file directly.
 *
 * 1. A scripted hand plays the first minutes as 3.1 and 2.13 have them: refuse paper 1, sign paper 2
 *    and let its take-back pass, take the first slip, the scripted fee (Till's Teas, a fixed +60) and
 *    the basket, open the second ministry, appoint the first minister, meet a follow-up, reach the
 *    call day, call, the run-up, the count.
 * 2. A long random-but-legal player (10^4 actions over simulated hours, all three offices, every
 *    action type, wins, losses, moves, time away) checks after EVERY action: the fixtures' state
 *    invariants (`decreeStateProblems`); cash ≥ 0; dibs only through the named sources (the rules'
 *    book plus the away pay this harness grants as the store does, H5); printed equals applied on
 *    every commit and 0 clamps (H1); the poll equals the count (H2); a refused action returns the
 *    same object; a serialise-and-parse round trip through the engine mode's reconcile changes
 *    nothing; tick(a + b) = tick(a) then tick(b) around the action.
 *
 * Frozen test content only (lesson 4): no tuned number is pinned.
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import * as R from '../decree';
import { decreeEngineMode } from '../decreeMode';
import { DECREE_TEST_NUMBERS, FIXTURE_NOW, decreeStateProblems, decreeTestConfig, freshState } from '../fixtures/decree';

const cfg = decreeTestConfig();

/** JSON with sorted keys (what a save holds, independent of the order fields were spread in). */
function canon(x: unknown): string {
  return JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]])) : v));
}

/** A tiny seeded generator for the player (never a rules site). */
function lcg(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Advances `dt` seconds of play in ticks of at most MAX_TICK. */
function advance(g: R.DecreeGame, dt: number, events: R.DecreeEvent[] = []): R.DecreeGame {
  let s = g;
  let left = dt;
  while (left > 1e-12) {
    const step = Math.min(R.MAX_TICK, left);
    s = R.advanceDecree(cfg, s, step, 0, events);
    left -= step;
  }
  return s;
}

/** Every paper playUntil decided: its follow-up reference and the decisions ever at its landing. */
const decidedLog: { paper: R.Paper; decisions: number }[] = [];

/** Play until `until(g)` holds, deciding with `choose` a few seconds after each landing (at most `maxSeconds` of play). */
function playUntil(g0: R.DecreeGame, until: (g: R.DecreeGame) => boolean, choose: (g: R.DecreeGame) => R.Choice, maxSeconds = 4 * 3600): R.DecreeGame {
  let g = g0;
  const end = g.stats.playSeconds + maxSeconds;
  while (!until(g)) {
    if (g.stats.playSeconds > end) throw new Error('playUntil: the condition was never met');
    const d = g.decree;
    const clock = g.stats.playSeconds;
    if (d.phase === 'campaign' && R.canCount(cfg, g)) return g;
    if (d.desk && clock >= d.desk.landedAt + 3) {
      if (d.desk.type === 'paper') decidedLog.push({ paper: d.desk.paper, decisions: d.stats.decisions });
      let s = R.decide(cfg, g, choose(g), clock, []);
      if (s === g) s = R.decide(cfg, g, 'refuse', clock, []);
      g = s.decree.pending ? R.commitPending(cfg, s, clock, []) : s;
      continue;
    }
    const stop = R.nextStop(cfg, g);
    const due = d.desk ? d.desk.landedAt + 3 : Infinity;
    const next = Math.min(stop ?? Infinity, due, clock + 30);
    g = advance(g, Math.max(1 / 64, next - clock));
  }
  return g;
}

const deskPaper = (g: R.DecreeGame) => (g.decree.desk?.type === 'paper' ? g.decree.desk : null);
const moodSum = (s: R.ShownEffect[], n: number) => {
  const out = new Array<number>(n).fill(0);
  for (const e of s) if (e.type === 'moods') e.deltas.forEach((x, gi) => (out[gi] += x));
  return out;
};
const moneyOf = (s: R.ShownEffect[]) => s.reduce((a, e) => a + (e.type === 'money' ? e.amount : 0), 0);

describe('the first minutes, scripted (3.1, 2.13)', () => {
  it('refuse 1, sign 2 and let the take-back pass, the first slip, the fee, the basket, Potholes, a minister, a follow-up, the call, the run-up, the count', () => {
    let g = freshState(cfg, 12345);
    const n = g.decree.moods.length;
    // 0:02 paper 1 teaches refusal: what the strip printed is applied.
    expect(deskPaper(g)?.paper.source).toBe('may-practise');
    g = advance(g, 2);
    const strip1 = R.stripOf(cfg, g, 'refuse')!;
    const moods0 = g.decree.moods.slice();
    g = R.decide(cfg, g, 'refuse', g.stats.playSeconds, []);
    expect(g.decree.moods).toEqual(moods0.map((m, gi) => m + moodSum(deskShownOf(strip1, n), n)[gi]));
    expect(g.decree.moods).toEqual(moods0.map((m) => m + 1));
    expect(g.decree.drawerCount).toBe(1);
    // 0:10 paper 2 teaches signing: it rests 2 s, then commits by itself.
    g = playUntil(g, (s) => deskPaper(s)?.paper.source === 'may-welcome', () => 'refuse', 60);
    const welcome = deskPaper(g)!;
    const before2 = g.decree.moods.slice();
    g = R.decide(cfg, g, 'sign', g.stats.playSeconds, []);
    expect(g.decree.pending?.item).toBe(welcome);
    expect(g.decree.moods).toEqual(before2);
    const events: R.DecreeEvent[] = [];
    g = advance(g, cfg.decree.desk.takeBackSeconds + 0.01, events);
    expect(g.decree.pending).toBeNull();
    expect(events).toContainEqual({ type: 'committed', paper: welcome.paper.id, choice: 'sign' });
    expect(g.decree.moods).toEqual(before2.map((m, gi) => m + moodSum(welcome.shown.sign, n)[gi]));
    // The first slip: the Town Clock's next level at its printed price.
    g = playUntil(g, (s) => s.decree.desk?.type === 'slip' || !!deskPaper(s), () => 'refuse', 120);
    if (deskPaper(g)) g = playUntil(g, (s) => s.decree.desk?.type === 'slip', () => 'refuse', 120);
    const slip = g.decree.desk?.type === 'slip' ? g.decree.desk.slip : null;
    expect(slip).not.toBeNull();
    const lv = g.decree.ministries[0].level;
    const cash0 = g.cash;
    g = R.decide(cfg, g, 'sign', g.stats.playSeconds, []);
    expect(g.cash).toBeCloseTo(cash0 - slip!.price, 9);
    if (slip!.purchase.type === 'level') expect(g.decree.ministries[slip!.purchase.ministry].level).toBe(slip!.purchase.ministry === 0 ? lv + 1 : g.decree.ministries[slip!.purchase.ministry].level);
    // Paper 3, Till's Teas: the fixed +60; paper 4, the basket, refused (its own follow-up, the grape, comes back).
    const takeSlips = (s: R.DecreeGame): R.Choice => (s.decree.desk?.type === 'slip' ? 'sign' : 'refuse');
    g = playUntil(g, (s) => deskPaper(s)?.paper.source === 'may-tills-teas', takeSlips, 120);
    const teas = deskPaper(g)!;
    expect(moneyOf(teas.shown.sign)).toBe(60);
    const paper0 = g.decree.stats.book.paper ?? 0;
    g = R.decide(cfg, g, 'sign', g.stats.playSeconds, []);
    g = R.commitPending(cfg, g, g.stats.playSeconds, []);
    expect((g.decree.stats.book.paper ?? 0) - paper0).toBe(60);
    g = playUntil(g, (s) => deskPaper(s)?.paper.source === 'may-basket', takeSlips, 120);
    const basketAt = g.decree.stats.decisions;
    g = R.decide(cfg, g, 'refuse', g.stats.playSeconds, []);
    expect(g.decree.followUps.some((f) => f.chainId === 'the-basket' && f.choice === 'refuse')).toBe(true);
    // Potholes opens (2.13 ~1:05), by a slip or the Ledger.
    g = playUntil(
      g,
      (s) => s.decree.ministries[1].open,
      (s) => {
        if (s.decree.desk?.type === 'slip') return 'sign';
        return 'refuse';
      },
      600,
    );
    // The first application (day 9): signing appoints the minister.
    g = playUntil(g, (s) => deskPaper(s)?.paper.kind === 'application', takeSlips, 1200);
    const app = deskPaper(g)!;
    g = R.decide(cfg, g, 'sign', g.stats.playSeconds, []);
    g = R.commitPending(cfg, g, g.stats.playSeconds, []);
    const minister = app.paper.sign.effects.find((e) => e.type === 'appoint') as { minister: string };
    expect(g.decree.cabinet[minister.minister]).toBeTruthy();
    expect(R.cabinet(cfg, g).find((c) => c.minister === minister.minister)?.appointed).toBe(true);
    // A follow-up: the basket's grape comes back after its delay of decided papers.
    const grapeSeen = () => decidedLog.find((x) => x.paper.followUpOf?.chainId === 'the-basket');
    if (!grapeSeen()) g = playUntil(g, (s) => deskPaper(s)?.paper.followUpOf?.chainId === 'the-basket', takeSlips, 1200);
    const grape = grapeSeen()?.paper ?? deskPaper(g)!.paper;
    expect(grape.followUpOf!.choice).toBe('refuse');
    expect(grapeSeen()?.decisions ?? g.decree.stats.decisions).toBeGreaterThanOrEqual(basketAt + 10);
    expect(grape.text).toMatch(/grape/);
    // The call day: the ribbon offers the call; the confirmation is the poll as it stands.
    g = playUntil(g, (s) => R.canCall(cfg, s), takeSlips, 3600);
    expect(g.decree.day).toBe(R.callDay(cfg, g));
    expect(R.termRibbon(cfg, g).canCall).toBe(true);
    const callEvents: R.DecreeEvent[] = [];
    if (g.decree.pending) g = R.commitPending(cfg, g, g.stats.playSeconds, []);
    g = R.callElection(cfg, g, g.stats.playSeconds, callEvents);
    expect(g.decree.phase).toBe('campaign');
    expect(callEvents).toContainEqual({ type: 'callElection' });
    // The run-up: K campaign papers and the rally, none of them a day.
    const day = g.decree.day;
    g = playUntil(g, (s) => R.canCount(cfg, s), (s) => (deskPaper(s)?.paper.kind === 'campaign' || deskPaper(s)?.paper.kind === 'rally' ? 'sign' : 'refuse'), 3600);
    expect(g.decree.day).toBe(day);
    expect(g.decree.campaign!.papersLeft).toBe(0);
    expect(g.decree.campaign!.rallyDone).toBe(true);
    // The count is the poll, number for number (H2), announced safest first.
    const p = R.poll(cfg, g);
    g = R.countVotes(cfg, g, []);
    expect(g.decree.phase).toBe('count');
    expect(g.decree.count!.districts.map((x) => x.share)).toEqual(p.rows.map((r) => r.share));
    expect(g.decree.count!.held).toBe(p.held);
    const gaps = g.decree.count!.order.map((k) => Math.abs(g.decree.count!.districts[k].share - 5000));
    expect(gaps).toEqual([...gaps].sort((a, b) => b - a));
    g = R.endElectionNight(cfg, g);
    expect(R.resultSheet(cfg, g)?.won).toBe(g.decree.count!.won);
    g = R.chooseAfterResult(cfg, g, 'stay', FIXTURE_NOW, []);
    expect(g.decree.term).toBe(2);
    expect(decreeStateProblems(cfg, g)).toEqual([]);
  });
});

/** The shown effects behind a strip (the strip is data derived from them; here the desk paper's). */
function deskShownOf(strip: R.Strip, n: number): R.ShownEffect[] {
  // A strip's chips carry the resulting values: from them, the deltas per club.
  const deltas = new Array<number>(n).fill(0);
  for (const c of strip.chips) {
    if (c.kind === 'every') c.deltas.forEach((x, gi) => (deltas[gi] += x));
    else if (c.kind === 'club') deltas[c.club] += c.to - c.from;
  }
  return [{ type: 'moods', every: false, deltas }];
}

// ----------------------------------------------------------------------------- the long random player

type Kind =
  | 'sign'
  | 'refuse'
  | 'slipUp'
  | 'slipBack'
  | 'takeBack'
  | 'commitPending'
  | 'raise'
  | 'open'
  | 'vanity'
  | 'call'
  | 'count'
  | 'night'
  | 'stay'
  | 'moveUp'
  | 'order'
  | 'ad'
  | 'face'
  | 'away'
  | 'wait'
  | 'reload';

const ALL_KINDS: Kind[] = ['sign', 'refuse', 'slipUp', 'slipBack', 'takeBack', 'commitPending', 'raise', 'open', 'vanity', 'call', 'count', 'night', 'stay', 'moveUp', 'order', 'ad', 'face', 'away', 'wait', 'reload'];

/** Cash the rules booked (commitCash and the tick) plus what this harness paid as the store does (away). */
function booked(g: R.DecreeGame, away: number): number {
  const b = g.decree.stats.book ?? {};
  return Object.values(b).reduce((a: number, x) => a + (x ?? 0), 0) + away;
}

interface LongRun {
  kinds: Map<Kind, number>;
  wins: number;
  losses: number;
  moves: number;
  reached: Set<number>;
  g: R.DecreeGame;
  /** Boycotts and scandals that started; Couriers granted with the grievance on the desk; grievances settled and kept; actions taken during a boycott or "Say nothing". */
  trouble: { boycotts: number; scandals: number; courierOnDesk: number; settled: number; kept: number; spin: number; apologies: number; awayInTrouble: number; reloadInTrouble: number };
}

/**
 * The long random-but-legal player on `cfg`, with every check after every action. `careless`: a mayor
 * who signs whatever angers a club (the side that LOWERS approval most of the time), the habit D38
 * wants to meet boycotts and scandals; the reader of sorts otherwise.
 */
function longPlayer(cfg: R.DecreeConfig, opts: { seed: number; actions: number; careless?: boolean }): LongRun {
  const advance = (x: R.DecreeGame, dt: number, events: R.DecreeEvent[] = []): R.DecreeGame => {
    let s = x;
    let left = dt;
    while (left > 1e-12) {
      const step = Math.min(R.MAX_TICK, left);
      s = R.advanceDecree(cfg, s, step, 0, events);
      left -= step;
    }
    return s;
  };
  const trouble = { boycotts: 0, scandals: 0, courierOnDesk: 0, settled: 0, kept: 0, spin: 0, apologies: 0, awayInTrouble: 0, reloadInTrouble: 0 };
  {
    const rnd = lcg(opts.seed);
    let g = freshState(cfg, 777);
    const start = g.cash;
    let away = 0;
    let wall = FIXTURE_NOW;
    const kinds = new Map<Kind, number>();
    let wins = 0;
    let losses = 0;
    let moves = 0;
    const reached = new Set<number>([0]);
    const allowed = new Set(['tick', 'paper', 'spend', 'checkSofa', 'transition', 'reset']);
    const n0 = () => g.decree.moods.length;
    const ACTIONS = opts.actions;

    const fail = (what: string, k: number, kind: string) => {
      throw new Error(`action ${k} (${kind}) at ${g.stats.playSeconds.toFixed(2)} s, office ${g.decree.office} term ${g.decree.term} day ${g.decree.day}: ${what}`);
    };

    for (let k = 0; k < ACTIONS; k++) {
      const d = g.decree;
      const clock = g.stats.playSeconds;
      const before = g;
      const events: R.DecreeEvent[] = [];
      let kind: Kind = 'wait';
      let next: R.DecreeGame = g;
      let expectSame = false;
      // What a commit in this action must apply (H1): the item and side, read before the action.
      let commit: { shown: R.ShownEffect[]; void: boolean } | null = null;
      let slipPrice: number | null = null;
      const r = rnd();
      const desk = d.desk;
      if (d.phase === 'count') {
        kind = 'night';
        next = R.endElectionNight(cfg, g);
      } else if (d.phase === 'result') {
        const up = R.canMoveUp(cfg, g);
        kind = up && r < 0.9 ? 'moveUp' : 'stay';
        if (kind === 'stay' && r < 0.02) {
          // A refused move: the same object.
          if (!up) {
            expect(R.chooseAfterResult(cfg, g, 'moveUp', wall, [])).toBe(g);
          }
        }
        next = R.chooseAfterResult(cfg, g, kind, wall, events);
      } else if (R.canCount(cfg, g) && r < 0.9) {
        kind = 'count';
        const p = R.poll(cfg, g);
        const c = R.count(cfg, g);
        // H2: the poll is the count, number for number.
        if (canon(c.districts.map((x) => [x.share, x.held])) !== canon(p.rows.map((x) => [x.share, x.held])) || c.held !== p.held) fail('the poll differs from the count', k, kind);
        next = R.countVotes(cfg, g, events);
        if (canon(next.decree.count) !== canon(c)) fail('the count applied differs from the count shown', k, kind);
        if (next.decree.result?.won) wins++;
        else losses++;
      } else if (d.pending && r < 0.5) {
        if (r < 0.1) {
          kind = 'takeBack';
          next = R.takeBack(cfg, g, clock, events);
          if (next === g) fail('a take-back inside its window was refused', k, kind);
          if (next.decree.desk !== d.pending.item) fail('a take-back did not restore the very paper', k, kind);
        } else {
          kind = 'commitPending';
          commit = { shown: d.pending.item.shown.sign, void: !!R.formVoid(cfg, g, d.pending.item.shown.sign) };
          next = R.commitPending(cfg, g, clock, events);
        }
      } else if (opts.careless && desk?.type === 'paper' && desk.paper.kind === 'strike' && r < 0.25 && R.canWatchAd(cfg, g, 'courier')) {
        // The careless mayor sends a Courier for the grievance on the desk (the goal line names it then).
        kind = 'ad';
        next = R.grantAd(cfg, g, 'courier', events);
        if (next === g) fail('the Courier was refused while offered', k, kind);
        trouble.courierOnDesk++;
        if ([next.decree.desk?.type === 'paper' ? next.decree.desk.paper : null, next.decree.pending?.item.paper ?? null, ...next.decree.tray].some((p) => p?.kind === 'strike' && p.petitioner === desk.paper.petitioner)) fail('the Courier left the grievance behind', k, kind);
        if (next.cash !== g.cash) fail('the Courier cost or paid money', k, kind);
      } else if (desk && desk.type === 'paper' && r < 0.6) {
        // Mostly the side that raises approval (a reader of sorts), sometimes the other.
        const sa = R.stripOf(cfg, g, 'sign')!;
        const ra = R.stripOf(cfg, g, 'refuse')!;
        const better: R.Choice = sa.approval.to + (sa.poll ? 3 * (sa.poll.to - sa.poll.from) : 0) >= ra.approval.to + (ra.poll ? 3 * (ra.poll.to - ra.poll.from) : 0) ? 'sign' : 'refuse';
        const worse: R.Choice = better === 'sign' ? 'refuse' : 'sign';
        // The careless mayor: the side that lowers approval, but the exits of a boycott and a scandal by a coin.
        const event = desk.paper.kind === 'strike' || desk.paper.kind === 'scandal';
        const choice: R.Choice = opts.careless && !event ? (rnd() < 0.85 ? worse : better) : opts.careless ? (rnd() < 0.5 ? 'sign' : 'refuse') : rnd() < 0.8 ? better : worse;
        if (desk.paper.kind === 'strike') trouble[choice === 'sign' ? 'settled' : 'kept']++;
        if (desk.paper.kind === 'scandal' && choice === 'sign') trouble.apologies++;
        kind = choice;
        if (choice === 'sign' && !sa.affordable) {
          // A short sign is refused: the same object.
          expectSame = true;
          next = R.decide(cfg, g, 'sign', clock, events);
        } else {
          if (!(choice === 'sign' && R.isDay(desk))) commit = { shown: desk.shown[choice], void: !!R.formVoid(cfg, g, desk.shown.sign) };
          next = R.decide(cfg, g, choice, clock, events);
          if (choice === 'sign' && R.isDay(desk) && next.decree.pending?.item !== desk) fail('a signed day paper did not rest in its take-back window', k, kind);
        }
      } else if (desk && desk.type === 'slip' && r < 0.6) {
        kind = r < 0.5 ? 'slipUp' : 'slipBack';
        if (kind === 'slipUp') slipPrice = desk.slip.price;
        next = R.decide(cfg, g, kind === 'slipUp' ? 'sign' : 'refuse', clock, events);
      } else if (r < 0.66) {
        // The Ledger: Raise or open a ministry, or the monument; refused purchases return the same object.
        const i = Math.floor(rnd() * d.ministries.length);
        const m = d.ministries[i];
        kind = r < 0.645 ? (m.open ? 'raise' : 'open') : 'vanity';
        const purchase: R.Purchase | null = kind === 'vanity' ? (d.monumentOffer ? { type: 'monument', monument: d.monumentOffer } : null) : m.open ? { type: 'level', ministry: i } : { type: 'open', ministry: i };
        const why = purchase && !d.pending ? R.canBuy(cfg, g, purchase, null) : null;
        next = kind === 'vanity' ? R.buyVanity(cfg, g, events) : m.open ? R.raise(cfg, g, i, events) : R.openMinistry(cfg, g, i, events);
        if (!d.pending && (purchase === null || why !== null) && next !== g) fail(`a refused purchase (${why}) changed the state`, k, kind);
      } else if (r < 0.68) {
        kind = 'call';
        const can = R.canCall(cfg, g);
        next = R.callElection(cfg, g, clock, events);
        if (!can && next !== g) fail('a call before day C or outside governing was accepted', k, kind);
      } else if (r < 0.69) {
        kind = 'order';
        next = R.setStandingOrder(cfg, g, rnd() < 0.7);
      } else if (r < 0.7) {
        kind = 'ad';
        const ads: R.DecreeAdKind[] = ['checkSofa', 'spinDoctor', 'courier', 'openDoors'];
        const ad = ads[Math.floor(rnd() * ads.length)];
        const can = R.canWatchAd(cfg, g, ad);
        next = R.grantAd(cfg, g, ad, events);
        if (ad === 'courier' && next !== g && desk?.type === 'paper' && desk.paper.kind === 'strike') {
          trouble.courierOnDesk++;
          // The grievance leaves with the boycott: none is left anywhere, and nothing was paid.
          if ([next.decree.desk?.type === 'paper' ? next.decree.desk.paper : null, next.decree.pending?.item.paper ?? null, ...next.decree.tray].some((p) => p?.kind === 'strike' && p.petitioner === desk.paper.petitioner)) fail('the Courier left the grievance behind', k, kind);
          if (next.cash !== g.cash) fail('the Courier cost or paid money', k, kind);
        }
        if (ad === 'spinDoctor' && next !== g) trouble.spin++;
        if (!can && next !== g) fail(`the ad ${ad} was granted while not offered`, k, kind);
        if (d.phase === 'campaign' && next !== g) fail('an ad was granted from the call to the end of election night', k, kind);
      } else if (r < 0.705) {
        kind = 'face';
        next = R.pickFace(cfg, g, cfg.decree.cast.players[Math.floor(rnd() * cfg.decree.cast.players.length)].id);
      } else if (r < 0.715) {
        kind = 'away';
        if (d.strikes.some(Boolean) || d.scandal) trouble.awayInTrouble++;
        const seconds = [30, 299, 301, 1800, 4 * 3600, 9 * 3600][Math.floor(rnd() * 6)];
        // The store saved at the wall time of the last frame; the absence ends `seconds` later.
        const left = { ...g, lastSavedAt: wall, stats: { ...g.stats, clockHigh: wall } };
        wall += seconds * 1000;
        const res = R.decreeOffline(cfg, left, wall);
        const cap = R.awayCap(cfg, left);
        if (res.seconds > cap + 1e-9) fail('time away beyond the cap', k, kind);
        let s = res.game;
        // Unchanged while away: moods, gossip, the day, the counters (a pending take-back committed first is a decision, not away time).
        const ref = left.decree.pending ? R.commitPending(cfg, left, clock, []) : left;
        if (canon(s.decree.moods) !== canon(ref.decree.moods) || s.decree.gossip !== ref.decree.gossip || s.decree.day !== ref.decree.day || s.decree.stats.decisions !== ref.decree.stats.decisions) fail('time away moved a mood, gossip, the day or a counter', k, kind);
        if (res.earnings !== R.roundDibs(cfg, R.decreeIncome(cfg, ref) * res.seconds)) fail('away earnings differ from the closed form', k, kind);
        // Paid when computed, as the store's paysOnCompute seam does (grantCash).
        s = { ...s, cash: s.cash + res.earnings, runEarnings: s.runEarnings + res.earnings, lifetimeEarnings: s.lifetimeEarnings + res.earnings, lastSavedAt: wall, stats: { ...s.stats, clockHigh: wall } };
        away += res.earnings;
        if (left.decree.pending) commit = { shown: left.decree.pending.item.shown.sign, void: !!R.formVoid(cfg, left, left.decree.pending.item.shown.sign) };
        next = s;
      } else if (r < 0.72) {
        kind = 'reload';
        if (d.strikes.some(Boolean) || d.scandal) trouble.reloadInTrouble++;
        next = decreeEngineMode.reconcile(cfg, { ...g } as GameState, JSON.parse(JSON.stringify(g))) as R.DecreeGame;
        if (canon(next.decree) !== canon(JSON.parse(JSON.stringify(g.decree)))) fail('a reload changed the decree state', k, kind);
      } else {
        // Time passes: to the next thing that happens by itself, or a hand's few seconds.
        kind = 'wait';
        const stop = R.nextStop(cfg, g);
        const dt = stop !== null && rnd() < 0.7 ? Math.max(1 / 1024, stop - clock) : (1 + Math.floor(rnd() * 8 * 64)) / 64;
        if (d.pending && clock + dt >= d.pending.until) commit = { shown: d.pending.item.shown.sign, void: !!R.formVoid(cfg, g, d.pending.item.shown.sign) };
        next = advance(g, Math.min(dt, 600), events);
        wall += Math.min(dt, 600) * 1000;
      }
      kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
      if (expectSame && next !== g) fail('a refused action did not return the same object', k, kind);
      // An action that is not refused changes something (a refused one is the same object, never an equal copy).
      if (next !== g && kind !== 'reload' && kind !== 'wait' && kind !== 'away' && canon(next) === canon(g)) fail('an action returned an equal copy instead of the same object', k, kind);
      g = next;

      // ---- the checks after every action
      const problems = decreeStateProblems(cfg, g);
      if (problems.length) fail(problems.join('; '), k, kind);
      // H5: every dib through a named source.
      for (const key of Object.keys(g.decree.stats.book ?? {})) if (!allowed.has(key)) fail(`dibs booked under ${key}`, k, kind);
      const want = start + booked(g, away);
      if (Math.abs(g.cash - want) > 1e-9 * Math.max(1, Math.abs(g.cash), Math.abs(want), ...Object.values(g.decree.stats.book ?? {}).map((x) => Math.abs(x ?? 0)))) fail(`cash ${g.cash} is not the booked ${want}`, k, kind);
      // H1: what the commit printed is what it applied (moods per club, money), 0 clamps.
      const committed = events.filter((e) => e.type === 'committed');
      if (commit && committed.length && before.decree.office === g.decree.office) {
        const n = n0();
        const dm = commit.void ? new Array<number>(n).fill(0) : moodSum(commit.shown, n);
        const halfway = events.some((e) => e.type === 'termStarted');
        if (!halfway && canon(g.decree.moods.map((m, gi) => m - before.decree.moods[gi])) !== canon(dm)) fail(`moods moved ${canon(g.decree.moods.map((m, gi) => m - before.decree.moods[gi]))}, printed ${canon(dm)}`, k, kind);
        const paid = (g.decree.stats.book.paper ?? 0) - (before.decree.stats.book.paper ?? 0);
        const printed = commit.void ? 0 : moneyOf(commit.shown);
        if (Math.abs(paid - printed) > 1e-9 * Math.max(1, Math.abs(printed))) fail(`paper money applied ${paid}, printed ${printed}`, k, kind);
      }
      if (slipPrice !== null && events.some((e) => e.type === 'levelBought' || e.type === 'ministryOpened' || e.type === 'monument')) {
        const spent = (g.decree.stats.book.spend ?? 0) - (before.decree.stats.book.spend ?? 0);
        if (Math.abs(spent + slipPrice) > 1e-9 * Math.max(1, slipPrice)) fail(`a slip printed ${slipPrice}, spent ${-spent}`, k, kind);
      }
      // The save round trip through the engine mode's reconcile changes nothing.
      const raw = JSON.parse(JSON.stringify(g));
      const back = decreeEngineMode.reconcile(cfg, { ...g } as GameState, raw) as R.DecreeGame;
      if (canon(back.decree) !== canon(raw.decree)) {
        const diff = Object.keys(raw.decree).filter((key) => canon((back.decree as unknown as Record<string, unknown>)[key]) !== canon(raw.decree[key]));
        fail(`a serialise-and-parse round trip changed the decree state (${diff.map((key) => `${key}: ${canon(raw.decree[key]).slice(0, 300)} -> ${canon((back.decree as unknown as Record<string, unknown>)[key]).slice(0, 300)}`).join('; ')})`, k, kind);
      }
      // tick(a + b) = tick(a) then tick(b), from here.
      const a = (1 + Math.floor(rnd() * 20 * 64)) / 64;
      const b = (1 + Math.floor(rnd() * 20 * 64)) / 64;
      const whole = R.advanceDecree(cfg, g, a + b, 0, []);
      const split = R.advanceDecree(cfg, R.advanceDecree(cfg, g, a, 0, []), b, 0, []);
      if (canon(whole) !== canon(split)) fail(`tick(${a} + ${b}) differs from tick(${a}) then tick(${b})`, k, kind);

      if (g.decree.office > before.decree.office) moves++;
      reached.add(g.decree.office);
      for (const e of events) {
        if (e.type === 'boycottStart') trouble.boycotts++;
        if (e.type === 'scandalStart') trouble.scandals++;
      }
    }
    return { kinds, wins, losses, moves, reached, g, trouble };
  }
}

describe('a long random but legal player through all three offices', () => {
  it('10^4 actions: invariants, H1, H2, H5, refusals, the save round trip and tick splits after every action', { timeout: 600_000 }, () => {
    const { kinds, wins, losses, moves, reached, g } = longPlayer(cfg, { seed: 4242, actions: 10_000 });

    // The run went everywhere it should.
    for (const kind of ALL_KINDS) expect(kinds.get(kind) ?? 0, kind).toBeGreaterThan(0);
    expect([...reached].sort()).toEqual([0, 1, 2]);
    expect(moves).toBe(2);
    expect(wins).toBeGreaterThan(0);
    expect(losses).toBeGreaterThan(0);
    expect(g.decree.stats.clamps).toBe(0);
  });
});

describe('a careless mayor meets boycotts and scandals (D38; rules-lead-check 5)', () => {
  // D38's levers moved within their ranges, so that the trouble paths run: the grievance, both exits, the
  // Courier with the grievance on the desk, the Spin Doctor, time away and a reload during the trouble.
  const careless = decreeTestConfig({
    boycott: { ...DECREE_TEST_NUMBERS.boycott, below: 25 },
    mood: { ...DECREE_TEST_NUMBERS.mood, termReset: 1 / 3 },
    paperRules: { sizing: { scale: 50, pull: 0.5 } },
  });
  it('3 × 3,000 actions with every check after every action; the trouble paths all run', { timeout: 600_000 }, () => {
    const runs = [9191, 9192, 9193].map((seed) => longPlayer(careless, { seed, actions: 3_000, careless: true }));
    const sum = (k: keyof LongRun['trouble']) => runs.reduce((a, r) => a + r.trouble[k], 0);
    const run = { trouble: Object.fromEntries(Object.keys(runs[0].trouble).map((k) => [k, sum(k as keyof LongRun['trouble'])])) as LongRun['trouble'], g: runs[0].g };
    for (const r of runs) expect(r.g.decree.stats.clamps).toBe(0);
    expect(run.trouble.boycotts).toBeGreaterThan(0);
    expect(run.trouble.scandals).toBeGreaterThan(0);
    expect(run.trouble.settled).toBeGreaterThan(0);
    expect(run.trouble.kept).toBeGreaterThan(0);
    expect(run.trouble.courierOnDesk).toBeGreaterThan(0);
    expect(run.trouble.awayInTrouble).toBeGreaterThan(0);
    expect(run.trouble.reloadInTrouble).toBeGreaterThan(0);
    expect(run.g.decree.stats.clamps).toBe(0);
  });
});
