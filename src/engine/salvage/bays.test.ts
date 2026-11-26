/**
 * E40 (stage 2 2.2; RULING2.md 10.5 as amended by 14.6; H1): Hold never stops the yard, AND STAYS ON, on the
 * frozen test content (no tuned number pinned). While the boss is away and the cash cannot pay the next
 * load, the yard sets aside from ONE held bay (first a bay whose word of the day is not low, then the one
 * worth most at today's price) just what that load needs at today's price, as the Sell button sets a lot
 * aside; the bay stays held; the away card names it. The bots' case (REPORT6 C5: every bay held, cash
 * spent, the absence paid §0) now earns in line with the same absence without Hold. Owners: engine2-income,
 * engine2-fixB (14.6).
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../fixtures/salvage';
import * as R from '../salvage';
import { awayLines, type AwayData } from '../../ui/salvage/overlays/marketLines';
import { asideOf, holdRelease, resolveDown, freeOf } from './bays';
import { dayWord } from './board';
import { begin, priceAt, dayAt } from './clock';
import { fullestSkip } from './partners';
import { lineAmount } from './money';
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
  it('sets aside from ONE held bay (not low first, then worth most) just what the cheapest full skip needs, at today’s price; Hold stays on (14.6)', () => {
    const { x, pid } = atCheck(stuck(true, 37.5));
    expect(fullestSkip(x, pid)).not.toBeNull();
    const day = dayAt(x, x.s.t);
    const worth = Object.entries(x.s.bays)
      .filter(([, b]) => b.held && freeOf(b) > 0)
      .map(([grade, b]) => ({ grade, low: dayWord(C, grade, day) === 'low', v: (resolveDown(freeOf(b)) / 1000) * priceAt(x, grade, day) }))
      .sort((a, b) => Number(a.low) - Number(b.low) || b.v - a.v || (a.grade < b.grade ? -1 : 1));
    let cheapest = Infinity;
    for (const id of Object.keys(x.s.partners)) cheapest = Math.min(cheapest, fullestSkip(x, id)?.price ?? Infinity);
    const need = cheapest - 37.5;
    const held0 = Object.values(x.s.bays).filter((b) => b.held).length;
    const got = holdRelease(x, x.s.t);
    expect(got).toBe(worth[0].grade);
    const b = x.s.bays[got!];
    // Hold stays on; no heldBay event; the release is dated for the card.
    expect(b.held).toBe(true);
    expect(Object.values(x.s.bays).filter((q) => q.held).length).toBe(held0);
    expect(x.ev.some((e) => e.type === 'heldBay')).toBe(false);
    expect(x.s.counts![`holdSold:${got}`]).toBe(Math.floor(x.s.t));
    // The lot: one, at today's price and day, whole 0.1 kg steps, enough for the skip and not a step more.
    expect(b.aside).toHaveLength(1);
    const lot = b.aside[0];
    const price = priceAt(x, got!, day);
    expect(lot).toEqual({ g: lot.g, price, day });
    expect(lot.g % 100).toBe(0);
    expect(lot.g).toBeGreaterThanOrEqual(100);
    expect(lineAmount(lot.g, price)).toBeGreaterThanOrEqual(need - 1e-9);
    if (lot.g > 100) expect(lineAmount(lot.g - 100, price)).toBeLessThan(need);
    expect(asideOf(b)).toBe(lot.g);
    // The lot is collectable now: nothing more is set aside at the same check.
    expect(holdRelease(x, x.s.t)).toBeNull();
    expect(b.aside).toHaveLength(1);
  });

  it('a bay whose word of the day is low goes only when no other held bay has stock; a lot never takes more than the bay holds free', () => {
    const { x } = atCheck(stuck(true, 0));
    const day = dayAt(x, x.s.t);
    const grades = Object.keys(x.s.bays).filter((g) => x.s.bays[g].held && freeOf(x.s.bays[g]) > 0);
    const low = grades.filter((g) => dayWord(C, g, day) === 'low');
    const other = grades.filter((g) => dayWord(C, g, day) !== 'low');
    // Only low bays keep their stock: the lot comes from one of them, and from a bay of 0.3 kg at most 0.3 kg.
    for (const g of other) x.s.bays[g].g = 0;
    const pick = low.length ? low : grades;
    for (const g of pick) x.s.bays[g].g = 300;
    const got = holdRelease(x, x.s.t);
    expect(pick).toContain(got);
    expect(x.s.bays[got!].aside[0].g).toBeLessThanOrEqual(300);
    expect(x.s.bays[got!].held).toBe(true);
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
    // 14.6: every held bay is still held at the end, and no more was sold than the loads needed: each lot covers
    // one load's shortfall, within one 0.1 kg step of its grade a load.
    for (const b of Object.values(gb.salvage.bays)) if (b.g > 0) expect(b.held).toBe(true);
    const sold = cb.lines.reduce((a, l) => a + l.money, 0);
    const step = Math.max(...Object.keys(C.grades).map((g) => lineAmount(100, priceAt(atCheck(b).x, g, gb.salvage.clock.day))));
    expect(cb.loads).toBeGreaterThan(0);
    expect(sold).toBeLessThanOrEqual((cb.spent ?? 0) + cb.loads * step + 1e-6);
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
