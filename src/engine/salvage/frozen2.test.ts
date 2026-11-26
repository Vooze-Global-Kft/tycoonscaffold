/**
 * engine2-hooks (stage 2, 8.1): the loop's three frozen states `r3`, `r3plain` and `held14`, played by the
 * balance bot on the game's content as it stood when they were frozen and kept with that content
 * (src/engine/fixtures/salvage-stage2.json; fixtures/salvage.ts STAGE2_*). Each loads (directly and through
 * the save) and advances by 0.1 s ticks and by jumps alike, the boss stale and the boss walking in and out of
 * sight of the crews' runs; `r3` six hours away with `group.ahead` true and false keeps every gram in both
 * (the difference printed, not gated: single trajectories are chaotic, ruling 14.9); `held14`'s absence pays
 * and names the bays it sold from while every held bay stays held (E40 as amended, 14.6). They run on the
 * content they were played on: tuning game.json moves nothing here. Owner: engine2-hooks.
 */
import { describe, expect, it } from 'vitest';
import { STAGE2_EVENTS, STAGE2_NAMES, STAGE2_STATES, stage2Cfg, stage2Content, stage2Game, type Stage2Name } from '../fixtures/salvage';
import * as R from '../salvage';
import { awayPass } from './away';
import { begin, finish } from './clock';
import { pieceCount, pieceSpec } from './content';
import { reconcileSalvage } from './save';
import { advanceNoBoss } from './tick';
import type { AwayCard, SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from './types';

const whole = (g: SalvageGame): unknown => {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), s };
};

/** The boss's sample at second k of a walk: a loop through the yard's working places, standing a while at each. */
function walk(cfg: SalvageConfig, k: number): { x: number; y: number; moving: boolean } {
  const P = cfg.salvage.map.points;
  const pts = ['floor', 'dropoff', 'scale', 'office'].map((id) => ({ x: P[id][0], y: P[id][1] + 2 }));
  const i = Math.floor(k / 30) % pts.length;
  const a = pts[i];
  const b = pts[(i + 1) % pts.length];
  const u = (k % 30) / 30;
  const moving = u > 0.5;
  const f = moving ? (u - 0.5) * 2 : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, moving };
}

const presence = (cfg: SalvageConfig, g: SalvageGame, p: { x: number; y: number; moving: boolean }) =>
  R.setPresence(cfg, g, { x: p.x, y: p.y, moving: p.moving, standingFor: p.moving ? 0 : 3, driving: false } as never, g.salvage.t);

describe('the frozen states r3, r3plain, held14 (8.1)', () => {
  it('each holds what it is named for', () => {
    const c = stage2Content();
    const kinds = new Set(Object.keys((c as unknown as { reuse: { kinds: Record<string, unknown> } }).reuse.kinds));
    for (const n of STAGE2_NAMES) {
      const s = STAGE2_STATES[n].salvage;
      expect(s.ladder.rung, n).toBe(3);
      expect(s.v, n).toBe(3);
      expect(STAGE2_EVENTS[n].length, n).toBeGreaterThan(0);
    }
    const plain = STAGE2_STATES.r3plain.salvage;
    const hs = plain.machines.hand_stripper;
    expect(hs.work).toBeFalsy();
    expect(hs.hopper.length).toBe(0);
    expect(plain.foreman.used_s).toBeGreaterThanOrEqual(c.foreman.minutesPerDay * 60 - 1e-6);
    expect(Object.values(plain.bays).some((b) => b.held)).toBe(false);
    expect(plain.things.some((th) => kinds.has(th.obj) && (th.at.at === 'dropoff' || th.at.at === 'floor'))).toBe(false);
    const held = STAGE2_STATES.held14;
    expect(Object.values(held.salvage.bays).filter((b) => b.held).length).toBe(14);
    // The cash pays no partner's load (yard-bots.md C5's dead absence before E40; the farm's skip is the cheapest).
    const skips = held.salvage.partners;
    const cheapest = Math.min(...Object.values(skips).flatMap((p) => p.skips.map((k) => k.price)));
    expect(held.cash).toBeLessThan(cheapest);
    expect(STAGE2_EVENTS.held14.some((e) => e.type === 'awayReport')).toBe(true);
    expect(STAGE2_EVENTS.r3.some((e) => e.type === 'rung')).toBe(true);
  });

  for (const n of STAGE2_NAMES) {
    it(`${n}: loads (as it stands and through the save) and advances by ticks and by jumps alike, the boss stale and walking`, () => {
      const cfg = stage2Cfg(n);
      const g0 = stage2Game(n);
      // Through the save (layout 3): the same yard.
      const loaded = reconcileSalvage(cfg, { ...g0, salvage: undefined } as never, JSON.parse(JSON.stringify({ salvage: g0.salvage })), g0.salvage.clock.highMs);
      // (A load resets the boss's presence by design: he is not standing anywhere until his first sample.)
      const noBoss = (g: SalvageGame) => {
        const w = whole(g) as { s: Record<string, unknown> };
        delete w.s.presence;
        delete w.s.presenceAt;
        return w;
      };
      expect(noBoss({ ...loaded, cash: g0.cash, lifetimeEarnings: g0.lifetimeEarnings } as SalvageGame)).toEqual(noBoss(g0));
      // 60 s: the boss as the play left him (he goes stale), 0.1 s ticks against one jump.
      {
        let a = g0;
        let ms = a.salvage.clock.highMs;
        for (let i = 0; i < 600; i++) {
          ms += 100;
          a = R.advanceSalvage(cfg, a, 0.1, ms);
        }
        const b = R.jump(cfg, g0, a.salvage.t);
        expect(whole(b), `${n} stale`).toEqual(whole(a));
      }
      // 3 minutes: the boss walking in and out of sight of the floor, the drop-off and the scale, a sample a second.
      {
        let a = g0;
        let b = g0;
        let ms = a.salvage.clock.highMs;
        for (let k = 0; k < 180; k++) {
          const p = walk(cfg, k);
          a = presence(cfg, a, p);
          b = presence(cfg, b, p);
          for (let i = 0; i < 10; i++) {
            ms += 100;
            a = R.advanceSalvage(cfg, a, 0.1, ms);
          }
          b = R.jump(cfg, b, a.salvage.t);
          if (k % 60 === 59) expect(whole(b), `${n} walking at ${k} s`).toEqual(whole(a));
        }
        expect(a.lifetimeEarnings).toBeGreaterThan(g0.lifetimeEarnings);
      }
    }, 300_000);
  }
});

/** Grams in the yard (things left, pieces, loads, hoppers, work, trays, bays, the pot, the flatbed, an unweighed or weighed skip on the truck, waste). */
function inYard(cfg: SalvageConfig, s: SalvageState): number {
  const C = cfg.salvage;
  let g = 0;
  for (const th of s.things) {
    g += C.objects[th.obj].waste_g;
    for (let k = th.cut; k < pieceCount(C, th.obj); k++) g += pieceSpec(C, th.obj, k)!.g;
  }
  for (const p of s.pieces) g += p.g;
  for (const p of s.load) g += p.g;
  for (const m of s.crew) for (const p of m.load) g += p.g;
  for (const m of Object.values(s.machines)) {
    for (const p of m.hopper) g += p.g;
    if (m.work) g += m.work.piece.g - Object.values(m.work.credited).reduce((a, x) => a + x, 0);
    g += Object.values(m.tray_g).reduce((a, x) => a + x, 0);
  }
  for (const b of Object.values(s.bays)) g += b.g;
  g += s.machines.crucible.charge_g + s.machines.crucible.heel_g;
  for (const l of s.merchant.lot) g += l.g;
  if (s.truck.skip) g += s.truck.skip.mass_g;
  g += s.waste_g;
  return g;
}

describe('r3 six hours away, planned ahead and trip by trip (2.1.13: every gram kept in both, the difference printed)', () => {
  it('group.ahead true and false', () => {
    const out: Record<string, { sales: number; supplied_t: number; loads: number }> = {};
    for (const ahead of [true, false]) {
      const base = stage2Cfg('r3');
      const c = base.salvage as unknown as { group: Record<string, unknown> };
      const cfg = { ...base, salvage: { ...base.salvage, group: { ...c.group, ahead } } } as unknown as SalvageConfig;
      const g0 = stage2Game('r3');
      const ev: SalvageEvent[] = [];
      // Time away's engine with every event heard (no away card: the sink keeps all).
      const x = begin(cfg, g0, ev, true);
      advanceNoBoss(x, 6 * 3600);
      const g = finish(g0, x);
      const s0 = g0.salvage;
      const s = g.salvage;
      // What came in: the drop-off's arrivals and the skips hooked (each at its label: the trial the first time).
      let came = inYard(cfg, s0) + s0.ladder.supplied_g - s0.scaleRound_g;
      const trial = new Set(Object.entries(s0.partners).filter(([, p]) => !p.trialUsed).map(([id]) => id));
      let loads = 0;
      for (const e of ev) {
        if (e.type === 'arrival' && e.kind === 'dropoff' && e.what) came += cfg.salvage.objects[e.what].gross_g;
        if (e.type === 'hook') {
          const pt = cfg.salvage.partners[e.partner];
          const contents = trial.has(e.partner) ? pt.trial : pt.skip;
          trial.delete(e.partner);
          for (const [o, n] of Object.entries(contents)) came += cfg.salvage.objects[o].gross_g * n;
          loads++;
        }
      }
      expect(inYard(cfg, s) + s.ladder.supplied_g - s.scaleRound_g, `ahead ${ahead}: every gram`).toBe(came);
      expect(s.t - s0.t).toBeCloseTo(6 * 3600, 6);
      out[String(ahead)] = { sales: Math.round(g.lifetimeEarnings - g0.lifetimeEarnings), supplied_t: (s.ladder.supplied_g - s0.ladder.supplied_g) / 1e6, loads };
    }
    const d = (k: 'sales' | 'supplied_t' | 'loads') => (((out.true[k] - out.false[k]) / Math.max(1e-9, out.false[k])) * 100).toFixed(2);
    process.stderr.write(`r3, six hours with no boss: planned ahead ${JSON.stringify(out.true)}; trip by trip ${JSON.stringify(out.false)}; difference sales ${d('sales')} %, supplied ${d('supplied_t')} %, loads ${d('loads')} % (not gated, 14.9)\n`);
    expect(out.true.sales).toBeGreaterThan(0);
    expect(out.false.sales).toBeGreaterThan(0);
  }, 600_000);
});

describe('held14: an absence pays and names the bays it sold from; every held bay stays held (E40 as amended, 14.6)', () => {
  it('twelve hours away (the cap runs it for part of them)', () => {
    const cfg = stage2Cfg('held14');
    const g0 = stage2Game('held14');
    const held0 = Object.entries(g0.salvage.bays).filter(([, b]) => b.held).map(([gr]) => gr);
    const out = awayPass(cfg, g0, g0.salvage.clock.highMs + 12 * 3600_000);
    const card = out.salvage.away as AwayCard & { heldSold?: string[] };
    expect(card.money).toBeGreaterThan(0);
    expect(card.loads).toBeGreaterThan(0);
    expect(card.heldSold?.length ?? 0).toBeGreaterThan(0);
    for (const gr of card.heldSold ?? []) expect(held0).toContain(gr);
    for (const gr of held0) expect(out.salvage.bays[gr].held, gr).toBe(true);
    expect(out.cash).toBeGreaterThanOrEqual(0);
  }, 300_000);
});

void (null as unknown as Stage2Name);
