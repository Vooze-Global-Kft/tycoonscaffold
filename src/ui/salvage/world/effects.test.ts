/**
 * Effects by event (effects.ts, ONE table) and the chevron's place (chevron.ts): what each event starts
 * and stops, where it starts and ends, and that the edge arrow stays inside the free world.
 */
import { describe, expect, it } from 'vitest';
import { SALVAGE_TEST } from '../../../engine/fixtures/salvage';
import type * as R from '../../../engine/salvage';
import { chevronPlace } from './chevron';
import { FX, WORK, arcAt, effectsFor, type FxContext } from './effects';

const frame = {
  things: [{ uid: 'Z1.washer.0', obj: 'washer', sprite: 'thing.washer.whole', stage: 0, x: 30, y: 28, locked: null, work: 0.4, by: 'boss' }],
  bays: [{ grade: 'li', x: 46, y: 18, sprite: 'bay.ferrous.1', fill: 1, held: false, g: 20000 }, { grade: 'ci', x: 47.7, y: 18, sprite: 'bay.ferrous.1', fill: 1, held: true, g: 9000 }],
  flatbed: { phase: 'waiting', t0: 0, t1: 0, x: 47, y: 21, load: 0 },
  machines: [{ machine: 'crucible', place: 'crucible', sprite: 'plant.crucible.pour', look: 'pour', x: 36, y: 24, tray: 0, ingots: null }],
} as unknown as R.FrameTable;
const ctx: FxContext = { content: SALVAGE_TEST, frame, boss: { x: 31, y: 28.5 }, grades: Object.keys(SALVAGE_TEST.grades) };
const tool = (tier: number) => Object.entries(SALVAGE_TEST.tools).find(([, t]) => t.tier === tier)![0];

describe('effects by event', () => {
  it('work starts by tool and stops on workStop and thingGone', () => {
    const s = effectsFor({ type: 'workStart', thing: 'Z1.washer.0', obj: 'washer', tool: tool(1), by: 'boss' }, ctx);
    expect(s.start).toHaveLength(1);
    expect(s.start[0]).toMatchObject({ kind: FX.work, id: 'work.Z1.washer.0', ax: 30, ay: 28, look: WORK.ticks });
    expect(effectsFor({ type: 'workStart', thing: 'Z1.washer.0', obj: 'washer', tool: tool(3), by: 'boss' }, ctx).start[0].look).toBe(WORK.torch);
    expect(effectsFor({ type: 'workStop', thing: 'Z1.washer.0', by: 'boss' }, ctx).stop).toEqual(['work.Z1.washer.0']);
    expect(effectsFor({ type: 'thingGone', thing: 'Z1.washer.0' }, ctx).stop).toEqual(['work.Z1.washer.0']);
  });

  it('the sledge raises dust on cast iron, the grinder sparks on steel', () => {
    const ci = Object.entries(SALVAGE_TEST.objects).find(([, o]) => /^ci/.test(o.pieces[0]?.[0] ?? ''));
    const steel = Object.entries(SALVAGE_TEST.objects).find(([, o]) => o.tier === 2 && !/^ci/.test(o.pieces[0]?.[0] ?? ''));
    const f = { ...frame, things: [{ ...frame.things[0], uid: 'x', obj: ci?.[0] ?? 'radiator' }] } as R.FrameTable;
    if (ci) expect(effectsFor({ type: 'workStart', thing: 'x', obj: ci[0], tool: tool(2), by: 'boss' }, { ...ctx, frame: f }).start[0].look).toBe(WORK.dust);
    if (steel) expect(effectsFor({ type: 'workStart', thing: 'x', obj: steel[0], tool: tool(2), by: 'boss' }, { ...ctx, frame: f }).start[0].look).toBe(WORK.sparks);
  });

  it('a piece arcs onto the load (following the boss), beside the thing, or into the rubble skip', () => {
    const off = (to: 'load' | 'ground' | 'waste') => effectsFor({ type: 'pieceOff', thing: 'Z1.washer.0', piece: 'p', grade: 'li', g: 4000, to, by: 'boss' }, ctx).start[0];
    expect(off('load')).toMatchObject({ kind: FX.arc, toBoss: 1, bx: 31, by: 28.5 });
    expect(off('ground')).toMatchObject({ kind: FX.arc, toBoss: 0, bz: 0 });
    const rubble = SALVAGE_TEST.map.points.rubble;
    expect(off('waste')).toMatchObject({ bx: rubble[0], by: rubble[1] });
    expect(off('load').look).toBe(ctx.grades.indexOf('li'));
  });

  it("the weigh-in's muted value slides to its bay chip; the round's into the flatbed's bed", () => {
    const ticket = { no: 7, at: 0, day: 0, kind: 'weighIn' as const, by: 'boss', lines: [{ grade: 'ci', g: 9000, price: 1, amount: 9 }], todaysValue: 9, lesson: null };
    const s = effectsFor({ type: 'weighIn', ticket, by: 'boss' }, ctx).start[0];
    expect(s).toMatchObject({ kind: FX.slide, bx: 47.7, by: 18, money: 9 });
    const out = effectsFor({ type: 'roundLoad', grams: 20000 }, ctx).start;
    // The held cast-iron bay stays out of the round.
    expect(out.map((x) => x.id)).toEqual(['slide.out.li']);
    expect(out[0]).toMatchObject({ bx: 47, by: 21 });
  });

  it("a collection's coins arc to the cash counter (a window point), more on a big one", () => {
    const ticket = { no: 8, at: 0, day: 0, kind: 'collection' as const, buyer: 'merchant', lines: [], paid: 20 };
    const s = effectsFor({ type: 'collected', ticket, big: false }, ctx).start;
    expect(s.length).toBe(3);
    expect(s.every((x) => x.kind === FX.coin && x.screenEnd === 1)).toBe(true);
    expect(effectsFor({ type: 'collected', ticket, big: true }, ctx).start.length).toBeGreaterThan(3);
  });

  it("the pour's glow and the ingot cooling at the crucible", () => {
    const s = effectsFor({ type: 'pour', ingots: 3, grade: 'bri', short_g: 0, dross_g: 100, first: true }, ctx).start;
    expect(s.map((x) => x.kind)).toEqual([FX.glow, FX.cool]);
    expect(s[0]).toMatchObject({ ax: 36 });
    expect(effectsFor({ type: 'pour', ingots: 3, grade: 'ali', short_g: 0, dross_g: 100, first: false }, ctx).start[1].look).toBe(1);
  });

  it('events outside the table start nothing', () => {
    expect(effectsFor({ type: 'loadFull' }, ctx)).toEqual({ start: [], stop: [] });
    expect(effectsFor({ type: 'workStart', thing: 'gone', obj: 'washer', tool: tool(1), by: 'boss' }, ctx).start).toEqual([]);
  });

  it('an arc starts and ends where it says and rises in the middle', () => {
    const p = [0, 0, 0];
    arcAt(p, 0, 0, 0, 10, 4, 1, 0, 2);
    expect(p).toEqual([0, 0, 0]);
    arcAt(p, 0, 0, 0, 10, 4, 1, 1, 2);
    expect(p).toEqual([10, 4, 1]);
    arcAt(p, 0, 0, 0, 10, 4, 1, 0.5, 2);
    expect(p[2]).toBeCloseTo(2.5);
  });
});

describe('the chevron', () => {
  const box = [47, 64, 797, 301];
  const lift = Math.sqrt(1 - 0.49);
  it('over the target when it is in view', () => {
    const out = [0, 0, 0, 0];
    chevronPlace(out, 1, 10, 10, 0, 0, 40, 0.7, lift, box);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(400);
  });
  it('an edge arrow inside the free world when it is not', () => {
    const out = [0, 0, 0, 0];
    chevronPlace(out, 1, 100, 10, 0, 0, 40, 0.7, lift, box);
    expect(out[0]).toBe(2);
    expect(out[1]).toBeLessThanOrEqual(797);
    expect(out[1]).toBeGreaterThan(700);
    expect(out[2]).toBeGreaterThanOrEqual(64);
    expect(out[2]).toBeLessThanOrEqual(301);
    expect(Math.abs(out[3])).toBeLessThan(0.5);
  });
  it('nothing without a target', () => {
    const out = [9, 9, 9, 9];
    chevronPlace(out, 0, 10, 10, 0, 0, 40, 0.7, lift, box);
    expect(out[0]).toBe(0);
  });
});
