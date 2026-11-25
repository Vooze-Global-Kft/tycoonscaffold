/**
 * ECONOMY.md E35, the tipping floor never silts up (the lead's 21:47 ruling on the bots engineer's 21:30
 * case, scratchpad bots/floor.ts): a yard hand takes whole things that need no cutting (tier 0: motors,
 * cable, fittings) off the floor whenever the boss is away, and while he is in the yard once more than
 * half of the floor's room is used (motors to the bench's hopper, cable to the powered stripper's, else
 * the platform scale); the floor's slots stay inside its footprint (past the last slot things share
 * slots); room stays by mass. Owner: desk1 (crew.ts, positions.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import { FIXTURE_NOW, SALVAGE_TEST } from '../fixtures/salvage';
import * as R from '../salvage';
import { away, newBot, playTo, seededCfg, startGame } from './bot';
import { pieceCount, pieceSpec } from './content';
import { FLOOR_CLEAR_SHARE } from './crew';
import { hand, stand } from './play';
import { floorSlotPos, floorSlots, pointOf, thingPos } from './positions';
import type { SalvageConfig, SalvageEvent, SalvageGame, SalvageState, ThingState } from './types';

/** The frozen test content with a whole electric motor (the real content's tier-0 motor) added. */
const C: SalvageContent = {
  ...SALVAGE_TEST,
  objects: {
    ...SALVAGE_TEST.objects,
    motor: { ...SALVAGE_TEST.objects.taps, name: 'Electric motor', pieces: [['mot', 6000, 2, 'piece.motor']], whole: 'mot', gross_g: 12000, text: 'two small electric motors, whole (bench)', sprite: 'piece.motor' },
  },
} as SalvageContent;
const cfg = { mode: 'salvage', salvage: C } as unknown as SalvageConfig;
const base = (cash = 0) => ({ cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;

function inside(c: SalvageContent, p: { x: number; y: number }): boolean {
  const o = pointOf(c, 'floor');
  const pl = c.map.places.floor!;
  return Math.abs(p.x - o.x) <= pl.w / 2 + 1e-9 && Math.abs(p.y - o.y) <= pl.d / 2 + 1e-9;
}

/** Grams in the yard (tick.test.ts's inYard, on this file's content). */
function inYard(s: SalvageState): number {
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

/** A yard with two yard hands, the bench and the powered stripper (no truck, no cutter), and `n` of each tier-0 thing tipped on the floor. */
function floorYard(n: number, machines = ['stripper', 'bench'], objs = ['motor', 'cable', 'taps']): SalvageGame {
  let g = R.createSalvage(cfg, base(100_000), FIXTURE_NOW);
  const ev: SalvageEvent[] = [];
  for (const item of ['sack', ...machines]) g = R.buy(cfg, g, item, R.shopPrice(cfg, g, item) ?? 0, g.salvage.t, ev);
  g = R.hire(cfg, g, 'hand', C.shop.find((i) => i.key === 'hand1')!.price, g.salvage.t, ev);
  g = R.jump(cfg, g, g.salvage.t + 30, ev);
  const things: ThingState[] = g.salvage.things.filter((t) => t.at.at !== 'floor');
  let k = 0;
  for (const obj of objs) for (let i = 0; i < n; i++, k++) things.push({ uid: `f${900 + k}`, obj, at: { at: 'floor', slot: k }, cut: 0, progress: 0, by: null });
  return { ...g, salvage: { ...g.salvage, things } };
}

const tier0OnFloor = (s: SalvageState) => s.things.filter((t) => t.at.at === 'floor' && C.objects[t.obj].tier === 0);

describe('E35: the floor slots stay inside the footprint', () => {
  it('every one of 300 slots lies inside the floor (test and real content); past the last slot things share slots', () => {
    const real = SalvageSchema.parse(JSON.parse(fs.readFileSync(path.join(__dirname, '../../../games/scrap-yard/game.json'), 'utf8')).salvage);
    for (const c of [C, real]) {
      const n = floorSlots(c);
      expect(n).toBeGreaterThan(0);
      for (let k = 0; k < 300; k++) {
        const p = thingPos(c, { at: 'floor', slot: k });
        expect(inside(c, p), `slot ${k} at ${p.x.toFixed(2)},${p.y.toFixed(2)}`).toBe(true);
        expect(p).toEqual(floorSlotPos(c, k));
      }
      // The first N slots are the grid (as before); slot N shares slot 0's place, set a little off it.
      const a = floorSlotPos(c, 0);
      const b = floorSlotPos(c, n);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.6);
    }
  });
});

describe('E35: whole tier-0 things leave the floor', () => {
  it('boss away: motors go to the bench, cable to the powered stripper, the rest to the scale; mass kept', () => {
    const g = floorYard(6);
    expect(tier0OnFloor(g.salvage).length).toBe(18);
    const ev: SalvageEvent[] = [];
    const g1 = R.jump(cfg, g, g.salvage.t + 3600, ev);
    expect(tier0OnFloor(g1.salvage).length).toBe(0);
    const fed = ev.filter((e) => e.type === 'feed') as Extract<SalvageEvent, { type: 'feed' }>[];
    expect(fed.some((e) => e.machine === 'bench' && e.grade === 'mot')).toBe(true);
    expect(fed.some((e) => e.machine === 'stripper' && e.grade === 'cab')).toBe(true);
    // The taps (no machine takes brass) were weighed in at their as-found grade.
    expect(g1.salvage.counts?.['weighed:brs'] ?? 0).toBeGreaterThan(0);
    const s0 = g.salvage;
    const s1 = g1.salvage;
    let cameIn = inYard(s0) + s0.ladder.supplied_g - s0.scaleRound_g;
    for (const e of ev) if (e.type === 'arrival' && e.kind === 'dropoff' && e.what) cameIn += C.objects[e.what].gross_g;
    expect(inYard(s1) + s1.ladder.supplied_g - s1.scaleRound_g).toBe(cameIn);
  });

  it('boss away with no machine: everything goes to the scale at its as-found grade', () => {
    const g = floorYard(4, []);
    const g1 = R.jump(cfg, g, g.salvage.t + 3600);
    expect(tier0OnFloor(g1.salvage).length).toBe(0);
    for (const grade of ['mot', 'cab', 'brs']) expect(g1.salvage.counts?.[`weighed:${grade}`] ?? 0, grade).toBeGreaterThan(0);
  });

  it('boss in the yard: over half the floor\'s room, the hands clear them (cable included); at or under half, cable stays for the boss', () => {
    // Over half: enough motors, cable and taps to pass FLOOR_CLEAR_SHARE of the floor's room.
    // No powered stripper: the cable goes to the scale.
    const per = Math.ceil((FLOOR_CLEAR_SHARE * C.floorRoom_kg * 1000) / 10000) + 2;
    const full = hand(cfg, floorYard(per, ['bench'], ['cable']), FIXTURE_NOW);
    const cable0 = tier0OnFloor(full.g.salvage).filter((t) => t.obj === 'cable').length;
    stand(full, 240);
    const cable1 = tier0OnFloor(full.g.salvage).filter((t) => t.obj === 'cable').length;
    expect(cable1).toBeLessThan(cable0);
    // Under half: the hand takes the motors and taps one at a time (the old rule), the cable waits for the boss.
    const few = hand(cfg, floorYard(2), FIXTURE_NOW);
    stand(few, 240);
    const left = tier0OnFloor(few.g.salvage);
    expect(left.filter((t) => t.obj === 'cable').length).toBe(2);
    expect(left.filter((t) => t.obj !== 'cable').length).toBe(0);
  });
});

describe('E35 on the real content: the bots engineer\'s case (seed 3, an hour, then 11.75 h away, twice)', () => {
  it('the floor ends no absence holding tier-0 things nobody moves, stays inside its footprint, and the second absence pays at least four fifths of the first', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../games/scrap-yard/game.json'), 'utf8'));
    const cfg0 = { mode: 'salvage', salvage: SalvageSchema.parse(raw.salvage) } as unknown as SalvageConfig;
    const rc = seededCfg(cfg0, 3);
    const c = rc.salvage;
    const NOW = Date.UTC(2026, 10, 25, 9);
    const b = newBot(rc, startGame(rc, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 3 });
    const t0 = (s: SalvageState) => s.things.filter((t) => t.at.at === 'floor' && (c.objects[t.obj]?.tier ?? 1) === 0);
    playTo(b, 3600);
    away(b, 11.75 * 3600);
    const back1 = new Set(t0(b.g.salvage).map((t) => t.uid));
    for (const th of b.g.salvage.things) if (th.at.at === 'floor') expect(inside(c, thingPos(c, th.at))).toBe(true);
    playTo(b, b.g.salvage.t + 5);
    away(b, 11.75 * 3600);
    // Every tier-0 thing on the floor at the end of the first absence was moved during the second (a flow, not a sink).
    expect(t0(b.g.salvage).filter((t) => back1.has(t.uid)).length).toBe(0);
    for (const th of b.g.salvage.things) if (th.at.at === 'floor') expect(inside(c, thingPos(c, th.at))).toBe(true);
    const [a1, a2] = b.rec.away;
    expect(a1.earned).toBeGreaterThan(0);
    expect(a2.earned).toBeGreaterThanOrEqual(0.8 * a1.earned);
  }, 180_000);
});
