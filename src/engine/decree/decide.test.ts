/**
 * Decide, take back and commit (spec 10.2 `decide`): applied equals shown on 10^5 random states built
 * with the builders (H1, every club of an "every club" chip included, 0 clamps); sign refused while
 * cash is short (the SAME object); refuse never costs money; the take-back restores the frozen paper
 * byte for byte and the commit applies once; a stale form leaves with no effect, a capped one as "No
 * longer needed"; a slip up buys at its printed price and down puts it back; 2.17's order (a day paper
 * counts, a campaign paper and a slip do not). Frozen test content only (lesson 4).
 *
 * Joined (rules-lead): every rules module is the real one (no module mock); a slip the real advice.ts
 * lands between two papers (D18) is put back by the test's helper where a test counts papers.
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { built, decreeTestConfig } from '../fixtures/decree';

const cfg = decreeTestConfig();

/** A tiny seeded generator for the random states (the rules' own sites are not used here). */
function lcg(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** decide, then commit a pending take-back at once. */
function decideNow(g: R.DecreeGame, choice: R.Choice, clock = g.stats.playSeconds, events: R.DecreeEvent[] = []): R.DecreeGame {
  const s = R.decide(cfg, g, choice, clock, events);
  return s.decree.pending ? R.commitPending(cfg, s, clock, events) : s;
}

const deskShown = (g: R.DecreeGame) => (g.decree.desk?.type === 'paper' ? g.decree.desk.shown : null);

describe('applied equals shown (H1) on 10^5 random states', () => {
  it('moods, money and gossip change by exactly the frozen values; no clamp ever bites; refuse never costs', () => {
    const rnd = lcg(2026);
    // One base per office, with a pool of papers of every kind drawn by the rules' own builders.
    const bases = ([0, 1, 2] as const).map((office) => {
      const ministries = office === 0 ? [9, 7, 4, 2] : office === 1 ? [20, 14, 11, 9, 6, 3] : [30, 26, 22, 20, 16, 12, 9, 5];
      let g = built({ office, ministries, cash: 0 });
      const pool: R.Paper[] = [];
      const take = (r: { paper: R.Paper; g: R.DecreeGame } | null) => {
        if (!r) return;
        g = r.g;
        pool.push(r.paper);
      };
      for (const p of cfg.decree.deck.papers) if (p.office === cfg.decree.offices[office].id) take(R.comicPaper(cfg, g, p.id));
      for (let i = 0; i < ministries.length; i++) {
        take(R.requisitionPaper(cfg, g, i));
        take(R.ribbonPaper(cfg, g, i));
      }
      take(R.frontPagePaper(cfg, g));
      take(R.drawRally(cfg, g, []));
      take(R.applicationPaper(cfg, g, 'pockle'));
      return { g, pool };
    });
    let checked = 0;
    let refusedShort = 0;
    for (let k = 0; k < 100_000; k++) {
      const { g: base, pool } = bases[Math.floor(rnd() * 3)];
      const paper = pool[Math.floor(rnd() * pool.length)];
      const n = base.decree.moods.length;
      const moods = Array.from({ length: n }, () => Math.floor(rnd() * 101));
      const gossip = Math.floor(rnd() * 4);
      const B = R.decreeParams(cfg, base).B;
      const cash = rnd() < 0.2 ? Math.floor(rnd() * 3) : Math.floor(rnd() * 200 * B);
      const g0: R.DecreeGame = { ...base, cash, decree: { ...base.decree, moods, gossip, quiet: 0, tray: [] } };
      const g = R.landPaper(cfg, g0, paper, 0);
      const shown = deskShown(g)!;
      const choice: R.Choice = rnd() < 0.5 ? 'sign' : 'refuse';
      const after = decideNow(g, choice);
      if (after === g) {
        // Only a sign the treasury cannot pay is refused.
        expect(choice).toBe('sign');
        expect(cash).toBeLessThan(R.costOf(shown.sign));
        refusedShort++;
        continue;
      }
      const side = shown[choice];
      const moodsWant = moods.slice();
      let money = 0;
      let dg = 0;
      for (const e of side) {
        if (e.type === 'moods') e.deltas.forEach((x, gi) => (moodsWant[gi] += x));
        else if (e.type === 'money') money += e.amount;
        else if (e.type === 'gossip') dg += e.delta;
      }
      expect(after.decree.moods).toEqual(moodsWant);
      expect(after.cash).toBeCloseTo(cash + money, 6);
      if (!after.decree.desk || after.decree.desk.type !== 'paper' || after.decree.desk.paper.kind !== 'scandal') expect(after.decree.gossip).toBe(gossip + dg);
      expect(after.decree.stats.clamps).toBe(0);
      if (choice === 'refuse') expect(after.cash).toBeGreaterThanOrEqual(cash);
      checked++;
    }
    expect(checked + refusedShort).toBe(100_000);
    expect(refusedShort).toBeGreaterThan(0);
  }, 120_000);
});

describe('sign, refuse, take back, commit (2.6, 2.7 "Decide")', () => {
  it('refuses a sign the treasury cannot pay with the SAME object; refuse is always possible and free', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 0, desk: 'test-mayor-bus-project-1' });
    expect(R.costOf(deskShown(g)!.sign)).toBeGreaterThan(0);
    const events: R.DecreeEvent[] = [];
    expect(R.decide(cfg, g, 'sign', 0, events)).toBe(g);
    expect(events).toEqual([]);
    const r = decideNow(g, 'refuse');
    expect(r).not.toBe(g);
    expect(r.cash).toBe(0);
    expect(r.decree.drawerCount).toBe(1);
    expect(R.decide(cfg, built({ office: 0 }), 'sign', 0, [])).toEqual(built({ office: 0 }));
  });

  it('a signed day paper rests in the take-back window; a tap restores it byte for byte; it commits once', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6, desk: 'test-mayor-veg-project-1', tray: ['test-mayor-bus-swap-1'] });
    const before = JSON.stringify(g.decree.desk);
    const events: R.DecreeEvent[] = [];
    const signed = R.decide(cfg, g, 'sign', 5, events);
    expect(signed.decree.desk).toBeNull();
    expect(signed.decree.pending?.until).toBe(5 + cfg.decree.desk.takeBackSeconds);
    expect(signed.cash).toBe(g.cash);
    expect(signed.decree.moods).toEqual(g.decree.moods);
    // Take it back: the very object, the state as before.
    const back = R.takeBack(cfg, signed, 6, events);
    expect(back.decree.desk).toBe(g.decree.desk);
    expect(JSON.stringify(back.decree.desk)).toBe(before);
    expect(back.decree.pending).toBeNull();
    expect(JSON.stringify(back.decree)).toBe(JSON.stringify(g.decree));
    // After its window a take-back is refused (the same object).
    expect(R.takeBack(cfg, signed, 7.5, [])).toBe(signed);
    // Commit applies once: a second commit is the same object.
    const once = R.commitPending(cfg, signed, 7, events);
    expect(once.decree.pending).toBeNull();
    expect(once.cash).toBe(g.cash + (deskShown(g)!.sign.find((e) => e.type === 'money') as { amount: number }).amount);
    expect(R.commitPending(cfg, once, 7, [])).toBe(once);
    expect(once.decree.stats.signed).toBe(1);
    expect(once.decree.day).toBe(g.decree.day + 1);
    // The next paper landed after the commit (2.17 step 5), behind D18's slip when one is affordable.
    const next = once.decree.desk?.type === 'slip' ? R.decide(cfg, once, 'refuse', 7, []) : once;
    expect(next.decree.desk?.type === 'paper' && next.decree.desk.paper.source).toBe('test-mayor-bus-swap-1');
  });

  it('every purchase commits a pending paper first (the next action)', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6, desk: 'test-mayor-bus-swap-1' });
    const signed = R.decide(cfg, g, 'sign', 0, []);
    const raised = R.raise(cfg, signed, 1, []);
    expect(raised.decree.pending).toBeNull();
    expect(raised.decree.stats.signed).toBe(1);
    expect(raised.decree.ministries[1].level).toBe(8);
  });

  it('a stale requisition leaves with no effect ("Already done"), a capped one as "No longer needed"', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 5000 });
    const r = R.requisitionPaper(cfg, g, 1);
    const landed = R.landPaper(cfg, r.g, r.paper, 0);
    const raised = R.raise(cfg, landed, 1, []);
    expect(raised.decree.ministries[1].level).toBe(8);
    for (const choice of ['sign', 'refuse'] as const) {
      const events: R.DecreeEvent[] = [];
      const after = decideNow(raised, choice, 0, events);
      expect(events).toContainEqual({ type: 'formVoid', paper: r.paper.id, reason: 'done' });
      expect(after.cash).toBe(raised.cash);
      expect(after.decree.moods).toEqual(raised.decree.moods);
      expect(after.decree.ministries[1].level).toBe(8);
    }
    const cap = cfg.decree.ministry.levelCap;
    const c = built({ office: 0, ministries: [10, cap - 1, 0, 0], cash: 1e15 });
    const rc = R.requisitionPaper(cfg, c, 1);
    const lc = R.landPaper(cfg, rc.g, rc.paper, 0);
    const atCap = { ...lc, decree: { ...lc.decree, ministries: lc.decree.ministries.map((m, i) => (i === 1 ? { open: true, level: cap } : m)) } };
    const events: R.DecreeEvent[] = [];
    const after = decideNow(atCap, 'sign', 0, events);
    expect(events).toContainEqual({ type: 'formVoid', paper: rc.paper.id, reason: 'cap' });
    expect(after.cash).toBe(atCap.cash);
    // A requisition that holds buys exactly the printed level at the printed price.
    const ok = decideNow(landed, 'sign');
    expect(ok.decree.ministries[1].level).toBe(8);
    expect(ok.cash).toBe(landed.cash - R.levelCost(cfg, g, 1));
  });

  it('a slip: up buys at the printed price, down puts it back; neither is a day', () => {
    const g0 = built({ office: 0, ministries: [10, 7, 0, 0], cash: 5000 });
    const slip = R.slipOf(cfg, g0, { type: 'level', ministry: 1 })!;
    const g = { ...g0, decree: { ...g0.decree, desk: { type: 'slip' as const, slip, landedAt: 0 }, emptySince: null } };
    const up = decideNow(g, 'sign');
    expect(up.cash).toBe(g.cash - slip.price);
    expect(up.decree.ministries[1].level).toBe(8);
    expect(up.decree.day).toBe(g.decree.day);
    expect(up.decree.stats.decisions).toBe(g.decree.stats.decisions);
    expect(up.decree.stats.slipsTaken).toBe(1);
    const down = decideNow(g, 'refuse');
    expect(down.cash).toBe(g.cash);
    expect(down.decree.ministries[1].level).toBe(7);
    expect(down.decree.day).toBe(g.decree.day);
    expect(down.decree.drawerCount).toBe(0);
    // A slip the treasury cannot pay is refused with the same object.
    const poor = { ...g, cash: slip.price - 1 };
    expect(R.decide(cfg, poor, 'sign', 0, [])).toBe(poor);
    // A stale slip (its level moved) leaves with no effect.
    const moved = { ...g, decree: { ...g.decree, ministries: g.decree.ministries.map((m, i) => (i === 1 ? { open: true, level: 8 } : m)) } };
    const ev: R.DecreeEvent[] = [];
    const stale = decideNow(moved, 'sign', 0, ev);
    expect(ev).toContainEqual({ type: 'formVoid', paper: 'slip', reason: 'done' });
    expect(stale.cash).toBe(moved.cash);
  });

  it("2.17: a day paper counts (day, decisions ever); a campaign paper and the rally do not; refusals commit at once", () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6, desk: 'test-mayor-bus-swap-1', day: 5, decisions: 40 });
    const r = R.decide(cfg, g, 'refuse', 0, []);
    expect(r.decree.pending).toBeNull();
    expect(r.decree.day).toBe(6);
    expect(r.decree.stats.decisions).toBe(41);
    const rally = R.drawRally(cfg, g, []);
    const onDesk = R.landPaper(cfg, { ...rally.g, decree: { ...rally.g.decree, desk: null } }, rally.paper, 0);
    const signed = R.decide(cfg, onDesk, 'sign', 0, []);
    expect(signed.decree.pending).toBeNull();
    expect(signed.decree.day).toBe(5);
    expect(signed.decree.stats.decisions).toBe(40);
    expect(signed.cash).toBe(onDesk.cash + (deskShown(onDesk)!.sign.find((e) => e.type === 'money') as { amount: number }).amount);
  });

  it('a follow-up is scheduled at the commit, due its drawn delay of decided papers later', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6, desk: 'may-pumpkin-freedom', decisions: 12 });
    const paper = g.decree.desk?.type === 'paper' ? g.decree.desk.paper : null;
    const ref = paper!.sign.followUp!;
    expect(ref).toMatchObject({ kind: 'chain', chainId: 'the-pumpkin' });
    const after = decideNow(g, 'sign');
    expect(after.decree.followUps).toEqual([{ kind: 'chain', chainId: 'the-pumpkin', step: 1, choice: 'sign', dueAt: 12 + 1 + ref.delay }]);
  });
});
