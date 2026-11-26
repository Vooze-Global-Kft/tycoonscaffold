/**
 * E40 (stage 2 2.2; RULING2.md 10.5; H1): Hold never stops the yard, on the frozen test content (no tuned
 * number pinned). While the boss is away and the cash cannot pay the next load, the held bay worth most
 * at today's price rejoins the merchant's round, one bay at a time; the away card names it. The bots'
 * case (REPORT6 C5: every bay held, cash spent, the absence paid §0) now earns in line with the same
 * absence without Hold. Owner: engine2-income.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../fixtures/salvage';
import * as R from '../salvage';
import { awayLines, type AwayData } from '../../ui/salvage/overlays/marketLines';
import { holdRelease, resolveDown, freeOf } from './bays';
import { begin, priceAt, dayAt } from './clock';
import { fullestSkip } from './partners';
import { stockValue } from './rate';
import type { AwayCard, SalvageConfig, SalvageGame } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const C = SALVAGE_TEST;
const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
type Held = AwayCard & { heldSold?: string[] };

/**
 * The bots' case on the test content: the played m30 yard (driver, truck, both partners) with every bay
 * holding stock and held, the driver parked, a partner's skip full, the cash spent.
 */
function stuck(held = true, cash = 0): SalvageGame {
  const g = fixtureGame('m30', base, FIXTURE_NOW);
  const s = g.salvage;
  let k = 0;
  for (const grade of Object.keys(C.grades)) {
    if (C.grades[grade].family === 'pm') continue;
    const b = (s.bays[grade] ??= { g: 0, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 });
    b.g += 40_000 + 10_000 * (k++ % 5);
    b.held = held;
  }
  s.away = null;
  return { ...g, cash };
}

/** A context at the state's clock with the boss away, the driver parked and a skip full (the pass's checks). */
function atCheck(g: SalvageGame) {
  const x = begin(cfg, g, [], false);
  const s = x.s;
  const d = s.crew.find((m) => m.role === 'driver')!;
  s.truck.trip = null;
  s.truck.by = null;
  s.truck.skip = null;
  s.truck.earmark = null;
  d.job = 'idle';
  d.phase = 'wait';
  s.merchant = { phase: 'waiting', since: s.t, endsAt: null, lot: [] };
  const pid = Object.keys(s.partners).find((id) => s.partners[id].open)!;
  const sk = s.partners[pid].skips[0];
  sk.phase = 'full';
  sk.price = Math.max(sk.price, 500);
  sk.contents = { ...C.partners[pid].skip };
  return { x, pid };
}

describe('Hold never stops the yard (E40)', () => {
  it('lets go the held bay worth most at today’s price, one bay a check, and records it', () => {
    const { x, pid } = atCheck(stuck());
    expect(fullestSkip(x, pid)).not.toBeNull();
    const day = dayAt(x, x.s.t);
    const worth = Object.entries(x.s.bays)
      .filter(([, b]) => b.held && freeOf(b) > 0)
      .map(([grade, b]) => ({ grade, v: (resolveDown(freeOf(b)) / 1000) * priceAt(x, grade, day) }))
      .sort((a, b) => b.v - a.v || (a.grade < b.grade ? -1 : 1));
    const got = holdRelease(x, x.s.t);
    expect(got).toBe(worth[0].grade);
    expect(x.s.bays[got!].held).toBe(false);
    expect(x.s.counts![`holdSold:${got}`]).toBe(x.s.t);
    expect(x.ev).toContainEqual({ type: 'heldBay', grade: got, on: false });
    // The released bay is collectable now: no second bay goes at the same check.
    expect(holdRelease(x, x.s.t)).toBeNull();
    expect(Object.values(x.s.bays).filter((b) => b.held).length).toBe(worth.length - 1);
  });

  it('holds while the boss is in the yard, while the cash pays the next load, and while nothing waits to be bought', () => {
    const live = atCheck(stuck());
    live.x.live = true;
    expect(holdRelease(live.x, live.x.s.t)).toBeNull();
    const rich = atCheck(stuck(true, 1e7));
    expect(holdRelease(rich.x, rich.x.s.t)).toBeNull();
    const none = atCheck(stuck());
    for (const ps of Object.values(none.x.s.partners)) for (const sk of ps.skips) sk.phase = 'filling';
    expect(holdRelease(none.x, none.x.s.t)).toBeNull();
    const busy = atCheck(stuck());
    busy.x.s.merchant = { phase: 'away', since: busy.x.s.t, endsAt: busy.x.s.t + 20, lot: [] };
    expect(holdRelease(busy.x, busy.x.s.t)).toBeNull();
  });

  it('the bots’ case: every bay held, the cash spent, the absence earns in line with the same absence without Hold', () => {
    const away = (g: SalvageGame) => R.salvageOffline(cfg, g, g.salvage.clock.highMs + 11.75 * 3600_000).game;
    const a = stuck(false);
    const b = stuck(true);
    const ga = away(a);
    const gb = away(b);
    const ca = ga.salvage.away as Held;
    const cb = gb.salvage.away as Held;
    expect(cb.money).toBeGreaterThan(0);
    expect(cb.heldSold?.length).toBeGreaterThan(0);
    expect(ca.heldSold).toBeUndefined();
    // What the absence earned: the cash it moved and the stock it left, at usual prices.
    const earned = (g0: SalvageGame, g1: SalvageGame) => g1.cash - g0.cash + stockValue(C, g1.salvage) - stockValue(C, g0.salvage);
    const ea = earned(a, ga);
    const eb = earned(b, gb);
    expect(ea).toBeGreaterThan(0);
    expect(Math.abs(eb / ea - 1)).toBeLessThan(0.1);
    // Each released bay left Hold for good; the others stay held.
    for (const grade of cb.heldSold!) expect(gb.salvage.bays[grade].held).toBe(false);
  });

  it('the away card prints one line a bay sold from hold, only when there was one', () => {
    const gb = R.salvageOffline(cfg, stuck(true), stuck(true).salvage.clock.highMs + 4 * 3600_000).game;
    const card = gb.salvage.away as Held;
    const v = R.awayView(cfg, gb)!;
    expect(v.heldSold).toEqual(card.heldSold);
    const lines = awayLines({ ...(card as AwayData), heldSold: v.heldSold });
    expect(lines.held.map((t) => t.key)).toEqual(card.heldSold!.map(() => 'away.heldSold'));
    expect(lines.held[0].args).toEqual({ grade: { grade: card.heldSold![0] } });
    const plain = R.salvageOffline(cfg, stuck(false), stuck(false).salvage.clock.highMs + 4 * 3600_000).game;
    expect(awayLines(plain.salvage.away as AwayData).held).toEqual([]);
    expect(R.awayView(cfg, plain)!.heldSold).toEqual([]);
  });

  it('a save with a card naming sold bays reloads with it (plain data)', () => {
    const gb = R.salvageOffline(cfg, stuck(true), stuck(true).salvage.clock.highMs + 4 * 3600_000).game;
    const again = R.reconcileSalvage(cfg, base, JSON.parse(JSON.stringify(gb)), gb.salvage.clock.highMs);
    expect((again.salvage.away as Held).heldSold).toEqual((gb.salvage.away as Held).heldSold);
    expect((gb.salvage.away as Held).heldSold!.length).toBeLessThanOrEqual(Object.keys(C.grades).length);
  });
});
