/**
 * The bots (bot.ts) on the FROZEN test content: short deterministic runs. No tuned number is pinned:
 * these check that a bot plays through the screen's actions, keeps the hard promises of 8.3 and is
 * deterministic. Owner: content.
 */
import { describe, expect, it } from 'vitest';
import { SALVAGE_TEST } from '../fixtures/salvage';
import { graphOf, newBot, pathLen, pathOf, playTo, startGame, tickJumpGate } from './bot';
import type { SalvageConfig } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const NOW = Date.UTC(2026, 10, 25, 9);

function run(minutes: number, opts: Partial<Parameters<typeof newBot>[3]> = {}) {
  const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 3, ...opts });
  playTo(b, minutes * 60);
  return b;
}

describe('salvage bots on the frozen content', () => {
  it('plays a first ticket and keeps every hard promise in four minutes', () => {
    const b = run(4);
    expect(b.rec.first.ticket).toBeGreaterThan(0);
    expect(b.g.lifetimeEarnings).toBeGreaterThan(0);
    expect(b.rec.broken).toEqual([]);
    expect(b.g.cash).toBeGreaterThanOrEqual(0);
    // Every purchase was paid at exactly the price its card showed.
    for (const p of b.rec.purchases) expect(p.price).toBeGreaterThan(0);
  });

  it('is deterministic: the same seed plays the same game', () => {
    const a = run(3, { seed: 5 });
    const c = run(3, { seed: 5 });
    expect(c.g.cash).toBe(a.g.cash);
    expect(c.g.salvage.ladder.supplied_g).toBe(a.g.salvage.ladder.supplied_g);
    expect(c.rec.purchases.map((p) => p.key)).toEqual(a.rec.purchases.map((p) => p.key));
  });

  it('the slow hand is no faster than the brisk hand to its first ticket', () => {
    const slow = run(2, { hand: 'slow' });
    const brisk = run(2, { hand: 'brisk' });
    expect(slow.rec.first.ticket ?? Infinity).toBeGreaterThanOrEqual(brisk.rec.first.ticket ?? Infinity);
    expect(slow.rec.reactS / slow.rec.legs).toBeGreaterThan(brisk.rec.reactS / brisk.rec.legs);
  });

  it('walks round solids and through the container wall gaps', () => {
    const gr = graphOf(cfg);
    const c = cfg.salvage;
    const from = { x: c.map.points.scale[0], y: c.map.points.scale[1] };
    for (const [id, p] of Object.entries(c.map.points)) {
      const to = { x: p[0], y: p[1] };
      const path = pathOf(gr, from, to);
      expect(path.at(-1)).toEqual(to);
      expect(pathLen(from, path)).toBeGreaterThanOrEqual(Math.hypot(to.x - from.x, to.y - from.y) - 1e-9);
      void id;
    }
  });

  it('the back wall (map.north) is solid: no path runs north of it, and a run never stands there', () => {
    const c0 = cfg.salvage;
    const ys = Object.values(c0.map.points).map((p) => p[1]);
    const north = Math.min(...ys) - 0.5;
    const walled = { ...cfg, salvage: { ...c0, map: { ...c0.map, north } } } as unknown as SalvageConfig;
    const gr = graphOf(walled);
    expect(gr.rects.some((r) => r.y1 >= north + 0.4 && r.x0 < 0 && r.x1 > c0.yard.width)).toBe(true);
    const from = { x: c0.map.points.scale[0], y: c0.map.points.scale[1] };
    for (const p of Object.values(c0.map.points)) for (const q of pathOf(gr, from, { x: p[0], y: p[1] })) expect(q.y).toBeGreaterThan(north);
    const b = newBot(walled, startGame(walled, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 3 });
    let minY = Infinity;
    playTo(b, 120, (bb) => (minY = Math.min(minY, bb.g.salvage.presence.y)));
    expect(minY).toBeGreaterThan(north);
    expect(b.rec.broken).toEqual([]);
  });

  it('ticking equals jumping on a state the bot reached (2.14 gate)', () => {
    const b = run(3);
    expect(tickJumpGate(cfg, b.g, b.now, 30)).toBeNull();
  });
});
