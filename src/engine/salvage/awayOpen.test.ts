/**
 * X2 (RULING2.md 22; the exactness attacker's a2b-card.test.ts): AN OPEN AWAY CARD TAKES EVERY PASS. A card waits (two
 * hours away), the phone goes away again for 30 s (over away.gapS, under away.cardS) with the card still open: the
 * second pass is added to the open card (its sold rows, its loads, its net, its time away), so the card always equals
 * what the cash moved, to the cent. At release.stage 1 on the shipped content (the first yard on the owner's phone)
 * and at stage 2 (rackFull, the works' test content). Owner: the loop (s2-fix-loop).
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { rackFull, worksCfg } from '../fixtures/salvage2works';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../fixtures/salvage';
import { awayPass } from './away';
import { newBot, playTo, seededCfg, startGame } from './bot';
import { roundMoney } from './money';
import { advanceSalvage } from './tick';
import type { SalvageConfig, SalvageGame } from './types';

const NOW = Date.UTC(2026, 10, 25, 9);

/** The shipped content as the phone reads it today (release.stage 1). */
function shipped1(): SalvageConfig {
  const raw = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8'));
  return { mode: 'salvage', salvage: SalvageSchema.parse(raw.salvage), monetization: raw.monetization } as unknown as SalvageConfig;
}

/** What the card says the cash moved by: its sales less the bank's share less what it spent. */
const said = (g: SalvageGame) => {
  const c = g.salvage.away!;
  return roundMoney(c.money - (c.bank ?? 0) - (c.spent ?? 0));
};

/** Two hours away, then `gapS` more with the card still open; through the pass itself and through the tick's seam (dt 0). */
function twoPasses(cfg: SalvageConfig, g0: SalvageGame, gapS: number, viaTick: boolean): { a: SalvageGame; b: SalvageGame } {
  const g = { ...g0, lastSavedAt: g0.salvage.clock.highMs };
  const step = (h: SalvageGame, ms: number) => (viaTick ? advanceSalvage(cfg, h, 0, h.salvage.clock.highMs + ms) : awayPass(cfg, h, h.salvage.clock.highMs + ms));
  const a = step(g, 2 * 3600_000);
  const b = step(a, gapS * 1000);
  return { a, b };
}

function expectCardIsCash(cfg: SalvageConfig, g0: SalvageGame, viaTick: boolean): void {
  const { a, b } = twoPasses(cfg, g0, 30, viaTick);
  expect(a.salvage.away).toBeTruthy();
  expect(said(a)).toBe(roundMoney(a.cash - g0.cash));
  // The 30 s pass is on the card: its time away and its money.
  expect(b.salvage.away!.seconds).toBeCloseTo(a.salvage.away!.seconds + 30, 6);
  expect(b.salvage.away!.absentS).toBeCloseTo((a.salvage.away!.absentS ?? 0) + 30, 6);
  expect(said(b)).toBe(roundMoney(b.cash - g0.cash));
  expect(b.salvage.away!.net).toBe(roundMoney(b.salvage.away!.money - (b.salvage.away!.spent ?? 0)));
}

describe('X2: an open away card takes every pass', () => {
  it('stage 1, the shipped content (the owner\'s phone): a played hour, two hours away, then 30 s more with the card open: the card equals the cash to the cent', () => {
    const cfg = seededCfg(shipped1(), 707);
    expect(cfg.salvage.release?.stage ?? 1).toBe(1);
    const b = newBot(cfg, startGame(cfg, NOW), NOW, { seed: 707, hand: 'normal', habit: 'goal', route: 'A' } as Parameters<typeof newBot>[3]);
    playTo(b, 3600);
    for (const viaTick of [false, true]) expectCardIsCash(cfg, b.g, viaTick);
    // The 30 s pass earned or spent something on this yard (else the case shows nothing).
    const { a, b: b2 } = twoPasses(cfg, b.g, 30, false);
    expect(b2.cash).not.toBe(a.cash);
    // Several short passes in a row while the card waits: still equal.
    let g = a;
    for (let k = 0; k < 6; k++) g = awayPass(cfg, g, g.salvage.clock.highMs + (11 + 7 * k) * 1000);
    expect(said(g)).toBe(roundMoney(g.cash - b.g.cash));
  }, 300_000);

  it('stage 1, the frozen test content (m30): the same', () => {
    const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
    const g0 = fixtureGame('m30', { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never, FIXTURE_NOW);
    for (const viaTick of [false, true]) expectCardIsCash(cfg, g0, viaTick);
  });

  it('stage 2 (rackFull, the works\' test content): the card, the bank\'s line and the gate\'s sales equal the cash', () => {
    for (const viaTick of [false, true]) expectCardIsCash(worksCfg(), rackFull(), viaTick);
  });

  it('a closed card is not reopened by a short pass (under away.cardS, no card open): as before', () => {
    const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
    const g0 = fixtureGame('m30', { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never, FIXTURE_NOW);
    const g = { ...g0, salvage: { ...g0.salvage, away: null } };
    const out = awayPass(cfg, g, g.salvage.clock.highMs + 30_000);
    expect(out.salvage.away).toBeNull();
  });
});
