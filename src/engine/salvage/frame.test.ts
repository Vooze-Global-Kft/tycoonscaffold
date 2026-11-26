/**
 * frame.ts (the FrameTable): the frame of each frozen state names only sprites and places that exist in
 * content, every position is a finite point, every span runs forward, the boss is placed, crew legs and
 * arrivals carry their ends, and the chevron points at the goal's target.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, SALVAGE_TEST, fixtureGame, withTestContent } from '../fixtures/salvage';
import { sellAmount, sellOn } from './board';
import { frameCfg, frameOf } from './frame';
import { goalOf } from './goals';
import { bayPos, bayStocked, isStillage } from './positions';
import type { SalvageGame } from './types';
import { TEXT_KEYS } from './types';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const C = SALVAGE_TEST;
const KEYS = new Set<string>(Object.values(TEXT_KEYS).flat());

const SPRITES = new Set<string>([
  ...Object.values(C.objects).map((o) => o.sprite ?? ''),
  ...Object.values(C.objects).flatMap((o) => o.pieces.map((p) => (p.length > 3 ? (p[3] as string) : ''))),
  ...Object.values(C.grades).map((gr) => gr.sprite ?? ''),
  ...Object.values(C.grades).map((gr) => gr.bay?.sprite ?? ''),
  ...Object.values(C.map.places).map((p) => p.sprite),
  'plant.portal',
  'plant.desk.id',
  'plant.sign.rung',
]);
const finite = (p: { x: number; y: number }) => Number.isFinite(p.x) && Number.isFinite(p.y);

describe('the frame of each frozen state', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name}: sprites and places of content, finite points, forward spans`, () => {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      const f = frameOf(C, g);
      expect(f.t).toBe(g.salvage.t);
      expect(f.epoch).toBe(g.salvage.epoch);
      expect(finite(f.boss)).toBe(true);
      for (const th of f.things) {
        expect(SPRITES.has(th.sprite), th.sprite).toBe(true);
        expect(finite(th)).toBe(true);
        if (th.ring) expect(th.ring.t1).toBeGreaterThanOrEqual(th.ring.t0);
      }
      for (const p of f.pieces) {
        expect(SPRITES.has(p.sprite), p.sprite).toBe(true);
        expect(finite(p)).toBe(true);
      }
      for (const p of f.load.pieces) expect(SPRITES.has(p.sprite), p.sprite).toBe(true);
      for (const b of f.bays) {
        expect(SPRITES.has(b.look), b.look).toBe(true);
        expect(finite(b)).toBe(true);
        expect(b.share).toBeGreaterThanOrEqual(0);
      }
      for (const m of f.machines) {
        expect(C.map.places[m.place], m.place).toBeDefined();
        expect(finite(m)).toBe(true);
      }
      for (const m of f.crew) {
        expect(finite(m.from) && finite(m.to)).toBe(true);
        expect(m.t1).toBeGreaterThanOrEqual(m.t0);
        for (const p of m.load) expect(SPRITES.has(p.sprite), p.sprite).toBe(true);
      }
      for (const a of f.arrivals) {
        expect(C.map.points[a.place], a.place).toBeDefined();
        expect(a.span.t1).toBeGreaterThanOrEqual(a.span.t0);
      }
      if (f.truck.leg) expect(f.truck.leg.t1).toBeGreaterThanOrEqual(f.truck.leg.t0);
      for (const fx of f.fixtures) expect(SPRITES.has(fx.sprite), fx.sprite).toBe(true);
      for (const l of f.labels) {
        expect(KEYS.has(l.text.key), l.text.key).toBe(true);
        expect(finite(l)).toBe(true);
      }
      for (const sk of f.skips) expect(C.partners[sk.partner]).toBeDefined();
      const goal = goalOf(cfg, g);
      if (f.chevron) {
        expect(finite(f.chevron)).toBe(true);
        expect([goal?.target, 'truck']).toContain(f.chevron.id);
      }
    });
  }
});

describe('the frame bays (the lead stillage ruling of 17:10; the integrator 17:57)', () => {
  it('lists no stillage before its grade had stock, each stocked one where bayPos(c, grade, s) puts it, and an empty heap at fill 0', () => {
    const g0 = fixtureGame('fresh', base(), FIXTURE_NOW);
    const f0 = frameOf(C, g0);
    expect(f0.bays.filter((b) => isStillage(C, b.grade))).toEqual([]);
    for (const b of f0.bays) if (b.g <= 0) expect(b.fill, b.grade).toBe(0);
    for (const n of FIXTURE_NAMES) {
      const g = fixtureGame(n, base(), FIXTURE_NOW);
      const f = frameOf(C, g);
      for (const b of f.bays) {
        if (!isStillage(C, b.grade)) continue;
        expect(bayStocked(g.salvage, b.grade), `${n} ${b.grade}`).toBe(true);
        expect({ x: b.x, y: b.y }, `${n} ${b.grade}`).toEqual(bayPos(C, b.grade, g.salvage));
      }
      // Every stillage grade with stock is drawn.
      for (const [gr, bay] of Object.entries(g.salvage.bays)) if (isStillage(C, gr) && bay.g > 0) expect(f.bays.some((b) => b.grade === gr), `${n} ${gr}`).toBe(true);
    }
  });
});

describe('the bay chips (L10, S4, W4) and the memo (H13)', () => {
  const day = (g: SalvageGame) => g.salvage.clock.day;
  for (const name of FIXTURE_NAMES) {
    it(`${name}: at most two lines a bay; line 1 prints what Sell would pay now; never §0 for a stocked bay`, () => {
      const g0 = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      // Every bay held and not held: the chip's value is the board's Sell (sellOn on the frame's day).
      for (const held of [false, true]) {
        const bays = Object.fromEntries(Object.entries(g0.salvage.bays).map(([k, b]) => [k, { ...b, held }]));
        const g = { ...g0, salvage: { ...g0.salvage, bays } } as SalvageGame;
        const f = frameOf(C, g);
        for (const b of f.bays) {
          const ls = f.labels.filter((l) => l.kind === 'bay' && l.id.split('.')[1] === b.grade);
          if (b.g <= 0) {
            expect(ls.length).toBe(0);
            continue;
          }
          expect(ls.length, b.grade).toBeGreaterThanOrEqual(1);
          expect(ls.length, b.grade).toBeLessThanOrEqual(2);
          expect(ls[0].id).toBe(`bay.${b.grade}`);
          const want = sellAmount(sellOn(C, g, b.grade, day(g)));
          expect(b.value).toBe(want);
          const x = ls[0].text.args?.x as { money: number } | undefined;
          if (want > 0) {
            expect(x?.money).toBe(want);
            expect(ls[0].text.key).toBe(held ? 'chip.bayHeld' : 'chip.bay');
          } else expect(ls[0].text.key).toBe(held ? 'chip.bayKgHeld' : 'chip.bayKg');
          // No day word and no separate "held" line on the chip.
          for (const l of ls) expect(['chip.held', 'chip.lowDay', 'chip.highDay']).not.toContain(l.text.key);
        }
      }
    });
  }
  it('a held bay with stock and no reserve shows its value, not §0 (the review: "today §0.00 held")', () => {
    const g0 = fixtureGame('m30', base(), FIXTURE_NOW) as SalvageGame;
    const grade = Object.keys(g0.salvage.bays)[0];
    const g = { ...g0, salvage: { ...g0.salvage, bays: { ...g0.salvage.bays, [grade]: { g: 4_500_000, n: 0, held: true, aside: [], forCrucible_g: 0, forDeal_g: 0 } } } } as SalvageGame;
    const l = frameOf(C, g).labels.find((x) => x.id === `bay.${grade}`)!;
    expect(l.text.key).toBe('chip.bayHeld');
    expect((l.text.args?.x as { money: number }).money).toBeGreaterThan(0);
  });
  it('the facade frame is memoised on the state (and on cash)', () => {
    const g = fixtureGame('m30', base(), FIXTURE_NOW) as SalvageGame;
    const a = frameCfg(cfg, g);
    expect(frameCfg(cfg, { ...g })).toBe(a);
    expect(frameCfg(cfg, { ...g, cash: g.cash + 1 })).not.toBe(a);
    expect(frameCfg(cfg, { ...g, salvage: { ...g.salvage } })).not.toBe(a);
    // owner1 L2: the facade adds the scene stamp (frameCfg); everything else is frameOf's.
    const { scene, ...f } = frameCfg(cfg, { ...g, salvage: { ...g.salvage } });
    expect(typeof scene).toBe('number');
    expect(f).toEqual(frameOf(cfg.salvage, g));
  });
});
