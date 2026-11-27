/**
 * s2e-crew (the economy designed again, 2.17; the owner's review: the away card "looks too simple, plain text no design"):
 * THE AWAY REPORT OF THE WORKS. From the works' opening the card the rules hand the screen also carries gross, to the bank
 * and to the yard, left to repay or "repaid" once, each hall's pours, oversize pieces waiting (n of max), things on the
 * picking table and the material that grew most; every number the one applied; a card open across passes merges them. At
 * release.stage 1 the card's shape does not change (no `works` field). Frozen test contents (fixtures/salvage2works.ts,
 * fixtures/salvage.ts): no tuned number of the game is pinned. Owner: s2e-crew.
 */
import { describe, expect, it } from 'vitest';
import { r4Game, worksCfg } from '../fixtures/salvage2works';
import { FIXTURE_NOW, SALVAGE_TEST, playedGame } from '../fixtures/salvage';
import { awayPass } from './away';
import { crateCount } from './crate';
import { worksOpened } from './layer';
import { lotsWaiting } from './lots';
import { roundMoney } from './money';
import type { AwayCard, SalvageConfig, SalvageGame } from './types';

const cfg = worksCfg();
const H = 3600_000;

/** r4 (every plate, the halls stocked) left at its clock, with an agreement of total T put in by hand (none taken). */
function left(T: number | null, taken = 0): SalvageGame {
  const g = structuredClone(r4Game()) as SalvageGame;
  const s = g.salvage;
  if (T !== null) s.bank = { ...s.bank, agreement: { kind: 'bank', plate: 'rotary', P: T, F: T, c: 0, T, taken, signedAt: s.t, I: 1 } };
  return { ...g, lastSavedAt: s.clock.highMs, stats: { ...g.stats, clockHigh: s.clock.highMs } } as SalvageGame;
}

const poursOf = (a: SalvageGame, b: SalvageGame): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(b.salvage.counts ?? {})) {
    if (!k.startsWith('poured:')) continue;
    const n = (v ?? 0) - (a.salvage.counts?.[k] ?? 0);
    if (n > 0) out[k.slice(7)] = n;
  }
  return out;
};

describe('2.17 the works\' away report (from the works\' opening)', () => {
  it('two hours away at r4 with a loan open: gross, to the bank, to the yard, left to repay, pours, pieces, table, growth: each the one applied', () => {
    const g0 = left(1e9);
    expect(worksOpened(g0.salvage)).toBe(true);
    const g = awayPass(cfg, g0, g0.salvage.clock.highMs + 2 * H);
    const card = g.salvage.away!;
    const w = card.works!;
    expect(w).toBeDefined();
    expect(w.gross).toBe(card.money);
    expect(w.gross).toBeGreaterThan(0);
    expect(w.toBank).toBe(card.bank ?? 0);
    expect(w.toBank).toBeGreaterThan(0);
    expect(w.toYard).toBe(roundMoney(w.gross - w.toBank));
    // The bank's part is what the agreement took over the pass.
    const a = g.salvage.bank.agreement!;
    expect(w.toBank).toBe(roundMoney(a.taken));
    expect(w.loan).toEqual({ plate: 'rotary', left: roundMoney(a.T - a.taken), T: a.T });
    // Each hall's pours are the counts the pass added, in the content's plate order.
    const order = Object.keys(cfg.salvage.works!.plates);
    expect(Object.fromEntries(w.pours.map((p) => [p.plate, p.n]))).toEqual(poursOf(g0, g));
    expect(w.pours.length).toBeGreaterThan(0);
    expect(w.pours.map((p) => order.indexOf(p.plate))).toEqual([...w.pours.map((p) => order.indexOf(p.plate))].sort((p, q) => p - q));
    // The pad and the table at the card's end.
    expect(w.lots).toEqual({ n: lotsWaiting({ s: g.salvage }), max: cfg.salvage.lots!.max });
    expect(w.crate).toBe(crateCount({ s: g.salvage }));
    // Growth by material: the ladder's supplied worth, largest first; the cash the card says is the cash moved.
    const grew = Object.entries(g.salvage.ladder.worth)
      .map(([material, v]) => ({ material, worth: roundMoney(v - (g0.salvage.ladder.worth[material] ?? 0)) }))
      .filter((r) => r.worth > 0)
      .sort((p, q) => q.worth - p.worth || (p.material < q.material ? -1 : 1));
    expect(w.grown).toEqual(grew);
    expect(w.grown.length).toBeGreaterThan(0);
    expect(roundMoney(g.cash - g0.cash)).toBe(card.net);
  }, 300_000);

  it('"repaid" once, on the absence in which the total was reached; the next absence\'s card has no loan', () => {
    const g0 = left(50);
    const g1 = awayPass(cfg, g0, g0.salvage.clock.highMs + 2 * H);
    const w1 = g1.salvage.away!.works!;
    expect(g1.salvage.bank.agreement).toBeNull();
    expect(w1.loan).toEqual({ plate: 'rotary', repaid: true });
    expect(w1.toBank).toBe(50);
    // The card acknowledged (closed), then another absence: no loan line.
    const back = { ...g1, lastSavedAt: g1.salvage.clock.highMs, salvage: { ...g1.salvage, away: null } } as SalvageGame;
    const g2 = awayPass(cfg, back, back.salvage.clock.highMs + H);
    expect(g2.salvage.away!.works!.loan).toBeNull();
    expect(g2.salvage.away!.works!.toBank).toBe(0);
    // Without an agreement at all: no loan, nothing to the bank, the yard gets the gross.
    const g3 = awayPass(cfg, left(null), left(null).salvage.clock.highMs + H);
    const w3 = g3.salvage.away!.works!;
    expect(w3.loan).toBeNull();
    expect(w3.toBank).toBe(0);
    expect(w3.toYard).toBe(w3.gross);
  }, 300_000);

  it('a card open across passes merges the works\' report: the money and the pours add up, the pad and the table are the latest, a loan repaid on the first pass stays "repaid"', () => {
    const g0 = left(50);
    const from = g0.salvage.clock.highMs;
    // One absence of 2 h, then a 30 s gap while its card is still open (over away.gapS, under cardS): one card.
    const a = awayPass(cfg, g0, from + 2 * H);
    const b = awayPass(cfg, { ...a, lastSavedAt: a.salvage.clock.highMs } as SalvageGame, a.salvage.clock.highMs + 30_000);
    const ca = a.salvage.away!;
    const cb = b.salvage.away!;
    expect(cb.seconds).toBeGreaterThan(ca.seconds);
    const wa = ca.works!;
    const wb = cb.works!;
    expect(wb.gross).toBe(cb.money);
    expect(wb.toBank).toBe(cb.bank ?? 0);
    expect(wb.toYard).toBe(roundMoney(wb.gross - wb.toBank));
    expect(wb.loan).toEqual({ plate: 'rotary', repaid: true });
    const sumPours = poursOf(g0, b);
    expect(Object.fromEntries(wb.pours.map((p) => [p.plate, p.n]))).toEqual(sumPours);
    expect(wb.lots).toEqual({ n: lotsWaiting({ s: b.salvage }), max: cfg.salvage.lots!.max });
    expect(wb.crate).toBe(crateCount({ s: b.salvage }));
    // Growth adds up by material over both passes.
    for (const r of wb.grown) expect(r.worth).toBeCloseTo(roundMoney(b.salvage.ladder.worth[r.material] - (g0.salvage.ladder.worth[r.material] ?? 0)), 2);
    expect(wb.gross).toBeGreaterThanOrEqual(wa.gross);
    // The merged card's net is still what the cash moved over both passes.
    expect(roundMoney(b.cash - g0.cash)).toBe(cb.net);
  }, 300_000);
});

describe('at release.stage 1 the away card keeps its shape (the owner\'s phone)', () => {
  it('two hours away from a played first-yard state: no works field, the keys the first yard always had', () => {
    const c1 = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
    const g0 = playedGame(c1, 'm30', { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never);
    const from = Math.max(g0.lastSavedAt || 0, g0.stats.clockHigh ?? 0, g0.salvage.clock.highMs);
    const g = awayPass(c1, { ...g0, lastSavedAt: from } as SalvageGame, from + 2 * H);
    const card = g.salvage.away as AwayCard;
    expect(card).toBeTruthy();
    expect(worksOpened(g.salvage)).toBe(false);
    expect('works' in card).toBe(false);
  }, 300_000);
});
