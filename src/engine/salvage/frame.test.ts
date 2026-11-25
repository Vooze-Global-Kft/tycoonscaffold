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
import { frameOf } from './frame';
import { goalOf } from './goals';
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
