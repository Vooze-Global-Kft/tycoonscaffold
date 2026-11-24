/**
 * Boycotts (spec 10.2 `strike`; 2.8): the trigger after a commit (a club below 20, armed), the warning
 * on the strip first, the grievance on top of the tray (past the cap by 1), the ministry's s_i = 0;
 * both exits with their counts in decided papers ("Return the scissors": 20 s of B, the club +10
 * fixed, ended; "Keep the scissors": 8 more decided papers, counted from the paper after the grievance,
 * then the end with no mood change); the end at 25 by any means and the re-arm at 30; the Courier ad
 * touches no mood; a campaign paper counts nothing; no picket twice a term. Frozen test content only.
 *
 * Joined (rules-lead): every rules module is the real one (no module mock); a slip the real advice.ts
 * lands between two papers (D18) is put back by the test's helper where a test counts papers.
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { built, decreeTestConfig } from '../fixtures/decree';

const cfg = decreeTestConfig();
const VEG = 2; // mayor clubs: bus 0, shops 1, veg 2; the Benches & Bandstands (ministry 2) serve veg.
const BENCHES = 2;
const b = cfg.decree.boycott;
const deskPaper = (g: R.DecreeGame) => (g.decree.desk?.type === 'paper' ? g.decree.desk.paper : null);
const filler = (n: number) => Array.from({ length: n }, (_, k) => `test-mayor-bus-swap-${(k % 3) + 1}`);

/** decide and commit at once (a short sign becomes a refusal). */
/** A slip lying on the desk (D18, the real advice.ts) goes back, so the waiting paper lands. */
const putBackSlip = (g: R.DecreeGame, clock = 0): R.DecreeGame => (g.decree.desk?.type === 'slip' ? R.decide(cfg, g, 'refuse', clock, []) : g);
function decideNow(g: R.DecreeGame, choice: R.Choice, events: R.DecreeEvent[] = []): R.DecreeGame {
  let s = R.decide(cfg, g, choice, 0, events);
  if (s === g) s = R.decide(cfg, g, 'refuse', 0, events);
  return putBackSlip(s.decree.pending ? R.commitPending(cfg, s, 0, events) : s);
}

/** A refreshed desk: the bus swap papers move only bus and shops (2.7 7.5 paper 3), never veg. */
function withTray(g: R.DecreeGame, n: number): R.DecreeGame {
  let s = g;
  const tray: R.Paper[] = [...s.decree.tray];
  for (const id of filler(n)) {
    const r = R.comicPaper(cfg, s, id);
    s = r.g;
    tray.push(r.paper);
  }
  return { ...s, decree: { ...s.decree, tray } };
}

describe('the trigger (2.8)', () => {
  it('a commit that brings an armed club below 20 starts its boycott: warning first, picket, grievance on top, its ministry earns nothing', () => {
    // Shops swap: shops +4, veg (other) −4; veg at 21 loses round(4 × 0.42) = 2 → 19.
    const g = built({ office: 0, moods: [50, 50, 21], ministries: [10, 7, 6, 0], cash: 1e6, desk: 'test-mayor-shops-swap-1' });
    expect(R.stripOf(cfg, g, 'sign')!.notes[0]).toEqual({ kind: 'boycott', club: VEG });
    expect(R.stripOf(cfg, g, 'refuse')!.notes).toEqual([]);
    const events: R.DecreeEvent[] = [];
    const s = decideNow(g, 'sign', events);
    expect(s.decree.moods[VEG]).toBe(19);
    expect(events).toContainEqual({ type: 'boycottStart', club: VEG });
    expect(s.decree.strikes[VEG]).toMatchObject({ papersLeft: b.papers, picket: 'GIVE THEM BACK', grievance: 'griev-scissors', waiting: true });
    expect(s.decree.armed[VEG]).toBe(false);
    expect(deskPaper(s)?.kind).toBe('strike');
    expect(deskPaper(s)?.sign.label).toBe('Return the scissors');
    const p = R.decreeParams(cfg, s);
    expect(p.served[BENCHES]).toBe(0);
    expect(p.rates[BENCHES]).toBeGreaterThan(0);
    expect(p.I).toBeCloseTo(p.multiplier * p.mN * p.V * (p.rates.reduce((a, x) => a + x, 0) - p.rates[BENCHES]), 9);
    expect(s.decree.stats.boycotts).toBe(1);
  });

  it('the grievance goes on top of a full tray (past the cap by 1)', () => {
    let g = built({ office: 0, moods: [50, 50, 21], ministries: [10, 7, 6, 0], cash: 1e6, desk: 'test-mayor-shops-swap-1' });
    g = withTray(g, cfg.decree.desk.trayCap);
    const s = decideNow(g, 'sign');
    // The grievance landed on the desk at once (2.17 step 5); the ten waiting papers still wait.
    expect(deskPaper(s)?.kind).toBe('strike');
    expect(s.decree.tray.length).toBe(cfg.decree.desk.trayCap);
    // While a paper rests in the take-back window, the grievance waits on top of the full tray.
    const busy = { ...s, decree: { ...s.decree, strikes: s.decree.strikes.map(() => null), armed: s.decree.armed.map(() => true), desk: null, pending: { item: g.decree.desk as R.DeskItem & { type: 'paper' }, until: 99 } } };
    const r = R.checkStrikes(cfg, busy, []);
    expect(r.decree.tray.length).toBe(cfg.decree.desk.trayCap + 1);
    expect(r.decree.tray[0].kind).toBe('strike');
  });

  it('a club below 20 that is not armed does not boycott; no picket twice a term', () => {
    const g = built({ office: 0, moods: [50, 50, 10] });
    const unarmed = { ...g, decree: { ...g.decree, armed: [true, true, false] } };
    expect(R.checkStrikes(cfg, unarmed, [])).toBe(unarmed);
    const first = R.checkStrikes(cfg, g, []);
    const second = R.checkStrikes(cfg, { ...first, decree: { ...first.decree, strikes: [null, null, null], armed: [true, true, true], tray: [] } }, []);
    expect(first.decree.strikes[VEG]!.picket).not.toBe(second.decree.strikes[VEG]!.picket);
  });
});

describe('the two exits, counted in decided papers', () => {
  it('"Return the scissors": 20 s of B, the club +10 (fixed), the boycott ends; it re-arms only at 30', () => {
    let g = built({ office: 0, moods: [50, 50, 21], ministries: [10, 7, 6, 0], cash: 1e6, desk: 'test-mayor-shops-swap-1' });
    g = decideNow(g, 'sign');
    const B = R.decreeParams(cfg, g).B;
    const cash = g.cash;
    const events: R.DecreeEvent[] = [];
    const s = decideNow(g, 'sign', events);
    expect(s.decree.moods[VEG]).toBe(29);
    expect(s.cash).toBe(cash - Math.max(5, R.roundDibs(cfg, 20 * B)));
    expect(s.decree.strikes[VEG]).toBeNull();
    expect(events).toContainEqual({ type: 'boycottEnd', club: VEG, how: 'settled' });
    expect(s.decree.armed[VEG]).toBe(false);
    expect(R.decreeParams(cfg, s).served[BENCHES]).toBe(1);
  });

  it('"Keep the scissors": it runs 8 more decided papers from the paper after the grievance, then ends with no mood change', () => {
    let g = built({ office: 0, moods: [50, 50, 21], ministries: [10, 7, 6, 0], cash: 1e6, desk: 'test-mayor-shops-swap-1' });
    g = decideNow(g, 'sign');
    g = withTray(g, 12);
    g = decideNow(g, 'refuse');
    expect(g.decree.strikes[VEG]).toMatchObject({ papersLeft: b.papers });
    expect(g.decree.strikes[VEG]!.waiting).toBeFalsy();
    for (let k = 1; k < b.papers; k++) {
      g = decideNow(g, 'refuse');
      expect(g.decree.strikes[VEG]!.papersLeft).toBe(b.papers - k);
    }
    const veg = g.decree.moods[VEG];
    const events: R.DecreeEvent[] = [];
    g = decideNow(g, 'refuse', events);
    expect(g.decree.strikes[VEG]).toBeNull();
    expect(events).toContainEqual({ type: 'boycottEnd', club: VEG, how: 'count' });
    expect(g.decree.moods[VEG]).toBe(veg);
  });

  it('the count does not run while the grievance waits, nor on a campaign paper or the rally', () => {
    let g = built({ office: 0, moods: [50, 50, 15], ministries: [10, 7, 6, 0], cash: 1e6, boycott: { club: VEG, waiting: true }, desk: 'test-mayor-bus-swap-1' });
    const gr = R.grievancePaper(cfg, g, VEG, cfg.decree.deck.grievances.find((x) => x.id === 'griev-scissors')!);
    g = R.onTop(gr.g, gr.paper);
    g = decideNow(g, 'refuse');
    expect(g.decree.strikes[VEG]).toMatchObject({ papersLeft: b.papers, waiting: true });
    // A running boycott and the rally: no count.
    const running = built({ office: 0, moods: [50, 50, 15], ministries: [10, 7, 6, 0], cash: 1e6, boycott: { club: VEG, papersLeft: 3 } });
    const rally = R.drawRally(cfg, running, []);
    const onDesk = R.landPaper(cfg, rally.g, rally.paper, 0);
    const after = decideNow(onDesk, 'sign');
    expect(after.decree.strikes[VEG]!.papersLeft).toBe(3);
  });

  it('it ends at once when the club reaches 25 by any means, re-arms at 30, and boycotts again only once re-armed', () => {
    let g = built({ office: 0, moods: [50, 50, 23], ministries: [10, 7, 6, 0], cash: 1e6, boycott: { club: VEG, papersLeft: 5 }, desk: 'test-mayor-veg-swap-1' });
    // Veg swap signed: veg +round(4 × 1.4) = +6 → 29 ≥ 25.
    const events: R.DecreeEvent[] = [];
    g = decideNow(g, 'sign', events);
    expect(g.decree.moods[VEG]).toBe(29);
    expect(g.decree.strikes[VEG]).toBeNull();
    expect(events).toContainEqual({ type: 'boycottEnd', club: VEG, how: 'mood' });
    expect(g.decree.armed[VEG]).toBe(false);
    // Down below 20 again, not armed: nothing.
    const low = { ...g, decree: { ...g.decree, moods: [50, 50, 15] } };
    expect(R.checkStrikes(cfg, low, [])).toBe(low);
    // At 30 it re-arms; then below 20 a new boycott starts.
    const up = R.checkStrikes(cfg, { ...g, decree: { ...g.decree, moods: [50, 50, b.rearmAt] } }, []);
    expect(up.decree.armed[VEG]).toBe(true);
    const again = R.checkStrikes(cfg, { ...up, decree: { ...up.decree, moods: [50, 50, 15] } }, []);
    expect(again.decree.strikes[VEG]).not.toBeNull();
  });

  it('"Send a Courier" (endStrike how ad) ends it now, touching no mood, and takes the grievance back', () => {
    let g = built({ office: 0, moods: [50, 50, 15], boycott: { club: VEG, waiting: true } });
    const gr = R.grievancePaper(cfg, g, VEG, cfg.decree.deck.grievances.find((x) => x.id === 'griev-scissors')!);
    g = R.onTop(gr.g, gr.paper);
    const events: R.DecreeEvent[] = [];
    const s = R.endStrike(cfg, g, VEG, 'ad', events);
    expect(s.decree.moods).toEqual(g.decree.moods);
    expect(s.decree.strikes[VEG]).toBeNull();
    expect(s.decree.tray.some((p) => p.kind === 'strike')).toBe(false);
    expect(events).toEqual([{ type: 'boycottEnd', club: VEG, how: 'ad' }]);
    expect(R.endStrike(cfg, s, VEG, 'ad', [])).toBe(s);
  });
});
