/// <reference types="node" />
/**
 * The PLACEHOLDER salvage rules and engine mode (src/engine/salvage.ts, src/engine/salvageMode.ts): the
 * ground work's test loop (docs/design/yard-ground.md), on a frozen test content written here (lesson 4:
 * no test reads the game's own numbers). The rules engineers replace these with the specification's.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GameConfigSchema, type GameConfig } from '../config/schema';
import { SalvageSchema, lintSalvage } from '../config/schema.salvage';
import * as E from './economy';
import { installEngineMode } from './mode';
import * as R from './salvage';
import { salvageEngineMode, withSalvageContent } from './salvageMode';
import type { GameState } from './types';

const NOW = Date.UTC(2026, 10, 25, 12);
const content = {
  yard: { width: 30, depth: 20 },
  loop: { cutSeconds: 2, pieces: 3, capacity: 4, unloadSeconds: 0.5, pieceValue: 7, respawnSeconds: 10, staleSeconds: 0.6 },
  props: [
    { id: 'm', kind: 'machine', x: 5, y: 5, shape: 'box', w: 4, d: 2 },
    { id: 'w1', kind: 'wreck', x: 20, y: 5, shape: 'box', w: 4, d: 2 },
    { id: 'w2', kind: 'wreck', x: 20, y: 15, shape: 'circle', r: 1 },
  ],
};
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'games', 'scrap-yard', 'game.json'), 'utf8'));
const cfg = withSalvageContent(GameConfigSchema.parse({ ...raw, salvage: content })) as R.SalvageConfig;
const M = salvageEngineMode;

beforeAll(() => installEngineMode(M));
afterAll(() => installEngineMode(null));

const fresh = (): R.SalvageGame => E.createInitialState(cfg, NOW) as R.SalvageGame;
/** Stands next to `near` (on its lower edge) and ticks `seconds` in steps of 0.1 s, re-sampling every step as the screen does. */
function stand(g: R.SalvageGame, near: string | null, seconds: number, driving = false, moving = false): { g: R.SalvageGame; events: R.SalvageEvent[] } {
  const p = cfg.salvage.props.find((x) => x.id === near);
  const at = p ? { x: p.x, y: p.y + (p.shape === 'box' ? p.d / 2 : p.r) + 0.4 } : { x: 12, y: 12 };
  const events: R.SalvageEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    g = R.setPresence(cfg, g, { near, driving, moving, ...at });
    g = M.tick(cfg, g, 0.1, NOW, events) as R.SalvageGame;
  }
  return { g, events };
}

describe('the salvage engine mode (placeholder)', () => {
  it('is mode "salvage" with its own save key, paid when computed, no full-speed catch-up', () => {
    expect(M.id).toBe('salvage');
    expect(M.saveTag).toBe('salvage0');
    expect(M.paysOnCompute).toBe(true);
    expect(M.catchUpSeconds).toBe(0);
  });

  it('config parses the opaque block with its defaults and throws on an invalid or missing one', () => {
    expect(cfg.salvage.worker.speed).toBe(4.2);
    expect(cfg.salvage.props).toHaveLength(3);
    expect(() => withSalvageContent({ ...cfg, salvage: { props: 'none' } } as unknown as GameConfig)).toThrow(/invalid/);
    expect(() => withSalvageContent({ ...cfg, salvage: undefined } as unknown as GameConfig)).toThrow(/no "salvage" block/);
    expect(withSalvageContent({ ...cfg, mode: 'sim' } as GameConfig).mode).toBe('sim');
  });

  it('the game\'s own placeholder block parses and lints clean', () => {
    const s = SalvageSchema.parse(raw.salvage);
    expect(lintSalvage(s)).toEqual([]);
    expect(lintSalvage({ ...s, props: [] })).toContain('the yard has no machine');
  });

  it('a fresh game has every wreck whole and nothing carried', () => {
    const g = fresh();
    expect(g.salvage.carried).toBe(0);
    expect(g.salvage.wrecks.map((w) => w.id)).toEqual(['w1', 'w2']);
    expect(g.salvage.wrecks.every((w) => w.cut === 0 && w.cutAt === null)).toBe(true);
  });

  it('reconcile never throws and repairs what it can', () => {
    const base = fresh();
    for (const bad of [null, 7, 'x', {}, { salvage: null }, { salvage: { v: 9 } }, { salvage: { v: 1, wrecks: 'no', carried: 'many' } }]) {
      const g = M.reconcile(cfg, base, bad) as R.SalvageGame;
      expect(g.salvage.carried).toBe(0);
      expect(g.salvage.wrecks).toHaveLength(2);
    }
    const g = M.reconcile(cfg, base, { salvage: { v: 1, carried: 99, unloaded: 3, wrecks: [{ id: 'w2', cut: 1, cutAt: 4 }, { id: 'gone', cut: 1, cutAt: 1 }] } }) as R.SalvageGame;
    expect(g.salvage.carried).toBe(4);
    expect(g.salvage.wrecks).toEqual([{ id: 'w1', cut: 0, cutAt: null }, { id: 'w2', cut: 1, cutAt: 4 }]);
  });

  it('standing next to a wreck for cutSeconds cuts it into pieces the worker carries', () => {
    const half = stand(fresh(), 'w1', 1);
    expect(half.g.salvage.wrecks[0].cut).toBeCloseTo(0.5, 5);
    expect(half.g.salvage.carried).toBe(0);
    const { g, events } = stand(half.g, 'w1', 1.05);
    expect(g.salvage.wrecks[0].cutAt).not.toBeNull();
    expect(g.salvage.carried).toBe(3);
    expect(events).toContainEqual({ type: 'cut', wreck: 'w1', pieces: 3 });
  });

  it('the stack stops at the capacity, and a full worker cuts nothing', () => {
    let g = stand(fresh(), 'w1', 2.1).g;
    g = stand(g, 'w2', 2.1).g;
    expect(g.salvage.carried).toBe(4);
    expect(g.salvage.wrecks[1].cutAt).not.toBeNull();
    g = stand({ ...g, salvage: { ...g.salvage, wrecks: g.salvage.wrecks.map((w) => ({ ...w, cut: 0, cutAt: null })) } }, 'w1', 3).g;
    expect(g.salvage.wrecks[0].cut).toBe(0);
  });

  it('next to the machine the stack unloads one piece every unloadSeconds, each paying pieceValue', () => {
    const cut = stand(fresh(), 'w1', 2.1).g;
    const { g, events } = stand(cut, 'm', 1.05);
    expect(g.salvage.carried).toBe(1);
    expect(g.cash - cut.cash).toBe(14);
    expect(g.lifetimeEarnings - cut.lifetimeEarnings).toBe(14);
    expect(events.filter((e) => e.type === 'unload')).toHaveLength(2);
    const done = stand(g, 'm', 2).g;
    expect(done.salvage.carried).toBe(0);
    expect(done.cash - cut.cash).toBe(21);
  });

  it('the truck does not cut, a stale or far sample does nothing, and walking away lets a half cut fade', () => {
    expect(stand(fresh(), 'w1', 3, true).g.salvage.wrecks[0].cut).toBe(0);
    // Walking past (the stick held): no cut; stopping beside it cuts.
    expect(stand(fresh(), 'w1', 3, false, true).g.salvage.wrecks[0].cut).toBe(0);
    expect(stand(stand(fresh(), 'w1', 1, false, true).g, 'w1', 1).g.salvage.wrecks[0].cut).toBeCloseTo(0.5, 5);
    // Far away: the rules check the distance again.
    let g = R.setPresence(cfg, fresh(), { near: 'w1', driving: false, moving: false, x: 2, y: 18 });
    g = M.tick(cfg, g, 0.1, NOW) as R.SalvageGame;
    expect(g.salvage.wrecks[0].cut).toBe(0);
    // Stale: one sample, then no more for a second.
    g = R.setPresence(cfg, fresh(), { near: 'w1', driving: false, moving: false, x: 20, y: 6.4 });
    for (let i = 0; i < 20; i++) g = M.tick(cfg, g, 0.1, NOW) as R.SalvageGame;
    // At most 0.6 s of cutting (0.3), then it fades back to nothing.
    expect(g.salvage.wrecks[0].cut).toBe(0);
    const half = stand(fresh(), 'w1', 1).g;
    const left = stand(half, null, 0.5).g;
    expect(left.salvage.wrecks[0].cut).toBeCloseTo(0.25, 5);
  });

  it('a cut wreck is whole again after respawnSeconds', () => {
    const cut = stand(fresh(), 'w1', 2.1);
    const { g, events } = stand(cut.g, null, 10.1);
    expect(g.salvage.wrecks[0]).toEqual({ id: 'w1', cut: 0, cutAt: null });
    expect(events).toContainEqual({ type: 'whole', wreck: 'w1' });
  });

  it('the tick adds the play seconds itself', () => {
    const g = M.tick(cfg, fresh(), 0.5, NOW) as GameState;
    expect(g.stats.playSeconds).toBeCloseTo(0.5, 9);
  });

  it('time away earns nothing and measures the absence from the later of the last save and the latest clock seen', () => {
    const f = fresh();
    const g = { ...f, lastSavedAt: NOW - 60_000, stats: { ...f.stats, clockHigh: 0 } } as GameState;
    expect(M.offline(cfg, g, NOW)).toMatchObject({ seconds: 60, earnings: 0 });
    expect(M.offline(cfg, { ...g, stats: { ...g.stats, clockHigh: NOW - 10_000 } }, NOW).seconds).toBe(10);
    expect(M.offline(cfg, { ...g, lastSavedAt: NOW + 5_000 }, NOW).seconds).toBe(0);
    expect(M.income(cfg, g, NOW)).toBe(0);
  });
});
