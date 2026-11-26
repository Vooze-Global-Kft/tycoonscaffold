/**
 * The owner's review of 26 November, point 1 ("helper laggy"), the screen's side of RULING-owner1 L1 / L2:
 * the rules' frame is read once per store change and shared; a presence sample that moved only the boss
 * pushes no scene to the UI thread; the scene's atlas items are pushed only when the list changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SalvageSchema } from '../../../config/schema.salvage';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

const F = await import('../../../engine/fixtures/salvage');
const R = await import('../../../engine/salvage');
const { makeRulesPusher, rulesTable } = await import('./useRulesTable');
const { yardLayout } = await import('./yard');
const content = F.SALVAGE_TEST;
const cfg = { mode: 'salvage', salvage: content } as unknown as import('../../../engine/salvage').SalvageConfig;
const yard = yardLayout(content);
const RES = () => 1;
const eqNums = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i] || (v !== v && b[i] !== b[i]));

/** One second of the store: ten ticks, and the boss's presence sampled twice between each (he walks). */
function oneSecond(start: import('../../../engine/salvage').SalvageGame, walk: boolean, C = cfg, Y = yard, seconds = 1, at?: { x: number; y: number }) {
  let g = start;
  const store = { cfg: C as unknown, game: g as unknown };
  const pushed: { scenes: number; items: number[][] } = { scenes: 0, items: [] };
  const P = makeRulesPusher(Y, () => store, { scene: () => pushed.scenes++, items: (a) => pushed.items.push([...a]) }, () => RES);
  const cfg = C;
  P.read();
  const readers: unknown[] = [];
  let x = 20;
  let working = 0;
  let changes = 0;
  let prev: number[] | null = null;
  for (let k = 0; k < 10 * seconds; k++) {
    for (let s = 0; s < 2; s++) {
      if (walk) x += 0.05;
      g = R.setPresence(cfg, g, { x: at?.x ?? x, y: at?.y ?? 20, driving: false, moving: walk, standingFor: walk ? 0 : 5, heading: 1 } as never, g.salvage.t);
      store.game = g;
      P.read();
      // The hud, the rings, the hints and the labels read the frame at this change: the same object.
      readers.push(R.frame(cfg, g) === R.frame(cfg, g));
    }
    g = R.tick(cfg, g, 0.1, F.FIXTURE_NOW + k * 100).game;
    store.game = g;
    P.read();
    if (R.frame(cfg, g).things.some((t) => t.work !== null && t.by !== null)) working++;
    // The real changes, counted apart from the pusher: the content of the scene's items at each tick.
    const now = [...rulesTable(Y, R.frame(cfg, g), cfg.salvage, RES, 0).items];
    if (prev && !eqNums(prev, now)) changes++;
    prev = now;
  }
  return { stats: P.stats, pushed, readers, working, changes };
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

  it('owner1 phone 2: the played minute 30 on the game\'s own content, somebody cutting: an item list is pushed only when its content changed', () => {
    const GAME = SalvageSchema.parse(JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage);
    const gcfg = { mode: 'salvage', salvage: GAME } as unknown as import('../../../engine/salvage').SalvageConfig;
    const gyard = yardLayout(GAME);
    const played = F.playedOn(gcfg);
    const g0 = { cash: played.games.m30.cash, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: structuredClone(played.games.m30.salvage) } as unknown as import('../../../engine/salvage').SalvageGame;
    // Two working seconds (20 ticks, 40 presence samples), the boss standing where he cuts (minute 30 leaves him at work).
    const pr = g0.salvage.presence;
    const { pushed, working, stats, changes } = oneSecond(g0, false, gcfg, gyard, 2, { x: pr.x, y: pr.y });
    expect(working).toBe(20);
    expect(stats.reads).toBeGreaterThan(20);
    // No two consecutive pushes carry equal content: every push after the first is a real change.
    for (let i = 1; i < pushed.items.length; i++) expect(eqNums(pushed.items[i - 1], pushed.items[i])).toBe(false);
    // As many item pushes as real changes (and the first); the phone engineer measured an equal copy on ~95 % of ticks before.
    expect(pushed.items.length).toBe(1 + changes);
    expect(pushed.items.length).toBeLessThan(10);
  });
});
