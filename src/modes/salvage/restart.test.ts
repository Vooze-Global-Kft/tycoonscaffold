/// <reference types="node" />
/**
 * "Start the yard again" through the real shared store (the lead, 27 November; the money attacker's M3; ruling 22):
 * what was paid for and what a parent answered survive a restart, in the same session. The store's reset() hands
 * the game the player had to the mode (EngineMode.onReset), which keeps the entitlements, the age band, the
 * packs-hidden lock and a chosen look that is an owned product (engine state2Money.ts restartKeeps); the cash, the
 * yard and every purchase still waiting are lost, as the restart card says. On the shipped game as a stage-2 build
 * writes it (fixtures/shipped2.ts), and at release.stage 1 as it is on the phone (nothing to keep: a fresh yard).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
const stage = vi.hoisted(() => ({ n: 2 }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async (k: string) => storage.get(k) ?? null, setItem: async (k: string, v: string) => void storage.set(k, v), removeItem: async (k: string) => void storage.delete(k) },
}));
vi.mock('../../generated/activeGame', async () => {
  const raw = (await import('../../../games/scrap-yard/game.json')).default;
  const { shipped2Raw } = await import('../../engine/fixtures/shipped2');
  return { ACTIVE_GAME_ID: 'scrap-yard', rawGame: stage.n === 2 ? shipped2Raw(raw) : raw, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null };
});
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, setAudience: () => {}, interstitials: true } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [], listing: async () => null, onTransactions: () => () => {} } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

type Game = { cash: number; entitlements: { products?: string[] } & Record<string, unknown>; salvage: { t: number; iap?: { ageBand?: unknown; hidden?: unknown; pending?: unknown[]; looks?: Record<string, unknown> }; counts: Record<string, number> } };

async function start() {
  vi.resetModules();
  const { baseGame } = await import('../../config/game');
  const { installEngineMode } = await import('../../engine/mode');
  const { salvageEngineMode } = await import('../../engine/salvageMode');
  Object.assign(baseGame, salvageEngineMode.config!(baseGame));
  const R = await import('./returning');
  installEngineMode(R.salvageReturningEngine);
  const { useGame } = await import('../../state/store');
  await useGame.getState().boot();
  const game = () => useGame.getState().game as unknown as Game;
  return { useGame, game };
}

beforeEach(() => {
  storage.clear();
  vi.useFakeTimers({ now: Date.UTC(2026, 10, 27, 9, 0, 0), toFake: ['Date'] });
});

afterEach(async () => {
  vi.useRealTimers();
  (await import('../../engine/mode')).installEngineMode(null);
});

describe('"Start the yard again" keeps what was paid for (stage 2)', () => {
  it('the owned looks, No ad videos, the age band and the lock stay; the cash, the yard and a waiting purchase go', async () => {
    stage.n = 2;
    const a = await start();
    const g = a.game();
    expect(g.salvage.iap, 'a stage-2 yard has the shop\'s state').toBeTruthy();
    const products = ['yard_colour1', 'yard_skipAds'];
    const played = {
      ...g,
      cash: 123_456,
      entitlements: { ...g.entitlements, products },
      salvage: {
        ...g.salvage,
        t: 9_999,
        counts: { ...g.salvage.counts, 'cut:washer': 7 },
        iap: { ...g.salvage.iap, ageBand: 't16', hidden: { hash: 'abc' }, pending: [{ id: 'q1' }], looks: { ...(g.salvage.iap?.looks ?? {}), colour: 'yard_colour1' } },
      },
    };
    a.useGame.setState({ game: played as never });
    await a.useGame.getState().reset();
    const f = a.game();
    expect(f.entitlements.products).toEqual(products);
    expect(f.salvage.iap?.ageBand).toBe('t16');
    expect(f.salvage.iap?.hidden).toEqual({ hash: 'abc' });
    expect(f.salvage.iap?.looks?.colour).toBe('yard_colour1');
    // Lost with the yard, as the card says.
    expect(f.cash).not.toBe(123_456);
    expect(f.salvage.t).toBeLessThan(9_999);
    expect(f.salvage.counts['cut:washer'] ?? 0).toBe(0);
    expect(f.salvage.iap?.pending ?? []).toEqual([]);
  });
});

describe('at release.stage 1 (the phone today) a restart is a fresh yard', () => {
  it('nothing of the shop is made or kept', async () => {
    stage.n = 1;
    const a = await start();
    const g = a.game();
    a.useGame.setState({ game: { ...g, cash: 5_000, salvage: { ...g.salvage, t: 500, counts: { ...g.salvage.counts, 'cut:washer': 3 } } } as never });
    await a.useGame.getState().reset();
    const f = a.game();
    expect(f.salvage.t).toBeLessThan(500);
    expect(f.salvage.counts['cut:washer'] ?? 0).toBe(0);
    expect(f.entitlements).toEqual(g.entitlements);
  });
});
