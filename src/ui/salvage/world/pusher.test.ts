/**
 * The owner's review of 26 November, point 1 ("helper laggy"), the screen's side of RULING-owner1 L1 / L2:
 * the rules' frame is read once per store change and shared; a presence sample that moved only the boss
 * pushes no scene to the UI thread; the scene's atlas items are pushed only when the list changed.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

const F = await import('../../../engine/fixtures/salvage');
const R = await import('../../../engine/salvage');
const { makeRulesPusher } = await import('./useRulesTable');
const { yardLayout } = await import('./yard');
const content = F.SALVAGE_TEST;
const cfg = { mode: 'salvage', salvage: content } as unknown as import('../../../engine/salvage').SalvageConfig;
const yard = yardLayout(content);
const RES = () => 1;

/** One second of the store: ten ticks, and the boss's presence sampled twice between each (he walks). */
function oneSecond(start: import('../../../engine/salvage').SalvageGame, walk: boolean) {
  let g = start;
  const store = { cfg: cfg as unknown, game: g as unknown };
  const pushed: { scenes: number; items: number[][] } = { scenes: 0, items: [] };
  const P = makeRulesPusher(yard, () => store, { scene: () => pushed.scenes++, items: (a) => pushed.items.push(a) }, () => RES);
  P.read();
  const readers: unknown[] = [];
  let x = 20;
  for (let k = 0; k < 10; k++) {
    for (let s = 0; s < 2; s++) {
      if (walk) x += 0.05;
      g = R.setPresence(cfg, g, { x, y: 20, driving: false, moving: walk, standingFor: walk ? 0 : 5, heading: 1 } as never, g.salvage.t);
      store.game = g;
      P.read();
      // The hud, the rings, the hints and the labels read the frame at this change: the same object.
      readers.push(R.frame(cfg, g) === R.frame(cfg, g));
    }
    g = R.tick(cfg, g, 0.1, F.FIXTURE_NOW + k * 100).game;
    store.game = g;
    P.read();
  }
  return { stats: P.stats, pushed, readers };
}

describe('point 1: what the rules hand the screen, once a change', () => {
  it('a quiet yard over one second of ticks and presence samples: one frame a change, a scene only at the ticks, the items once', () => {
    const fresh = { cash: 0, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: R.freshSalvage(cfg, 0) } as unknown as import('../../../engine/salvage').SalvageGame;
    // (the very first tick of a new yard settles its things once: start after it)
    const g0 = R.tick(cfg, fresh, 0.1, F.FIXTURE_NOW - 100).game;
    const { stats, pushed, readers } = oneSecond(g0, true);
    // 1 + 20 presence samples + 10 ticks: every change read once, one frame each.
    expect(stats.reads).toBe(31);
    expect(stats.frames).toBe(31);
    expect(readers.every(Boolean)).toBe(true);
    // A presence-only change pushes no scene: the first, then one per tick.
    expect(pushed.scenes).toBe(11);
    // Nothing in the yard changed: the item list went to the UI thread once.
    expect(pushed.items.length).toBe(1);
  });

  it('a working yard (minute 30): presence samples still push nothing; the items only when the list changed', () => {
    const fx = F.FIXTURE_STATES.m30 as unknown as { salvage: import('../../../engine/salvage').SalvageState; cash: number };
    const g0 = { cash: fx.cash, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: structuredClone(fx.salvage) } as unknown as import('../../../engine/salvage').SalvageGame;
    const { stats, pushed } = oneSecond(g0, false);
    expect(stats.frames).toBe(stats.reads);
    expect(pushed.scenes).toBeLessThanOrEqual(11);
    // Each pushed list is a new list (never the same one twice).
    expect(new Set(pushed.items).size).toBe(pushed.items.length);
    expect(pushed.items.length).toBeLessThanOrEqual(pushed.scenes);
  });
});
