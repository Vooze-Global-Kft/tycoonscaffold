/**
 * The lead's rule changes of 18:30 (ECONOMY.md E31a, E32), on the frozen test content (no tuned number
 * pinned): a driver's level shortens his WHOLE round (walk, drive, hook, weigh-in, tip) by the level's
 * factor; a held bay rejoins the round by itself at the first high day or after two market days, live and
 * away alike, and its board row says so. Owner: rules-sim (rules desk).
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST } from '../fixtures/salvage';
import * as R from '../salvage';
import { dayWord } from './board';
import { driverRoundF } from './content';
import type { SalvageConfig, SalvageEvent, SalvageGame } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const C = SALVAGE_TEST;
const base = (cash = 0) => ({ cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;
const fresh = (cash = 0): SalvageGame => R.createSalvage(cfg, base(cash), FIXTURE_NOW);

function yardWithDriver(level: number): SalvageGame {
  let g = fresh(100_000);
  for (const item of ['sack', 'truck', 'torch']) g = R.buy(cfg, g, item, R.shopPrice(cfg, g, item) ?? 0, g.salvage.t);
  g = R.hire(cfg, g, 'driver', C.shop.find((i) => i.key === 'driver')!.price, g.salvage.t);
  // His level set before anything runs (the trial load is full at once: he leaves at the next instant).
  return { ...g, salvage: { ...g.salvage, crew: g.salvage.crew.map((m) => (m.role === 'driver' ? { ...m, level } : m)) } };
}

/** The phases of the driver's first trip and how long each lasted. */
function firstTrip(g0: SalvageGame): Record<string, number> {
  let g = g0;
  const out: Record<string, number> = {};
  let started = false;
  for (let i = 0; i < 4000; i++) {
    const tr = g.salvage.truck.trip;
    if (tr) {
      started = true;
      out[tr.phase] = tr.endsAt - tr.t0;
      g = R.jump(cfg, g, tr.endsAt + 1e-6);
    } else if (started) break;
    else g = R.jump(cfg, g, g.salvage.t + 1);
  }
  return out;
}

describe('E31a: the driver level shortens his whole round', () => {
  it('walk, drive, hook, weigh-in and tip all take 1 / F of level 1 at level 4', () => {
    const F = driverRoundF(C, 4);
    expect(F).toBeGreaterThan(1);
    const a = firstTrip(yardWithDriver(1));
    const b = firstTrip(yardWithDriver(4));
    expect(Object.keys(a).sort()).toEqual(['back', 'hook', 'out', 'park', 'tip', 'walk', 'weigh']);
    for (const ph of Object.keys(a)) expect(b[ph], ph).toBeCloseTo(a[ph] / F, 6);
    expect(a.hook).toBeCloseTo(C.truck.handle_s, 6);
  });
});

describe('E32: Hold waits for a better day and then lets go', () => {
  const D = 86_400_000;
  const grade = Object.keys(C.grades).find((gr) => C.grades[gr].family === 'fe')!;
  /** A yard at the start of a market day d (UTC), the bay held there. */
  const heldAt = (dayStartMs: number): SalvageGame => {
    let g = R.createSalvage(cfg, { ...(base(0) as object), lastSavedAt: dayStartMs, stats: { playSeconds: 0, clockHigh: dayStartMs } } as never, dayStartMs + 60_000);
    g = R.setHold(cfg, g, grade, true, g.salvage.t);
    expect(g.salvage.bays[grade].held).toBe(true);
    return g;
  };
  const day0 = (ms: number) => R.marketDay(cfg, ms);
  const releaseDay = (d: number): number => (dayWord(C, grade, d + 1) === 'high' ? d + 1 : d + 2);

  it('releases at the first high day or after two market days (live, jumped)', () => {
    let checked = 0;
    for (let k = 0; k < 12; k++) {
      const start = (Math.floor(FIXTURE_NOW / D) + k) * D;
      const g = heldAt(start);
      const d = g.salvage.clock.day;
      expect(d).toBe(day0(start + 60_000));
      const want = releaseDay(d);
      const ev: SalvageEvent[] = [];
      // Jump live to just before and just after each boundary.
      let h = g;
      for (let dd = d + 1; dd <= d + 3; dd++) {
        const at = h.salvage.t + (C.board.epochMs + dd * D - h.salvage.clock.highMs) / 1000;
        h = R.jump(cfg, h, at - 1, ev);
        expect(h.salvage.bays[grade].held, `k ${k} before day ${dd}`).toBe(dd <= want);
        h = R.jump(cfg, h, at + 1, ev);
        expect(h.salvage.bays[grade].held, `k ${k} at day ${dd}`).toBe(dd < want);
      }
      expect(ev.filter((e) => e.type === 'heldBay' && !e.on).length).toBe(1);
      checked += want === d + 1 ? 1 : 0;
    }
    // Both branches are reached on the test content's twelve days (a high day next, and not).
    expect(checked).toBeGreaterThan(0);
    expect(checked).toBeLessThan(12);
  });

  it('releases away as well, and the board row says how long Hold lasts', () => {
    const start = Math.floor(FIXTURE_NOW / D) * D;
    const g = heldAt(start);
    const row = R.priceBoard(cfg, g, start + 60_000).rows.find((r) => r.grade === grade);
    if (row) expect(row.heldLine).toEqual({ key: 'board.heldUntil' });
    // Three days away: the away pass runs the same day events.
    const back = R.advanceSalvage(cfg, g, 0.1, start + 60_000 + 3 * D);
    expect(back.salvage.bays[grade].held).toBe(false);
    const row2 = R.priceBoard(cfg, back, start + 3 * D).rows.find((r) => r.grade === grade);
    if (row2) expect(row2.heldLine).toBeNull();
  });
});
