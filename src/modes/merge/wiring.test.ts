/// <reference types="node" />
/**
 * The merge mode's wiring in the shared store: closing a season goes through the store's prestige
 * action, whose gate for a merge game is the engine mode's `canPrestige` (the Festival filled, 2.11),
 * not prestige points (a merge game earns none). The real store and actions run under node with the
 * native services replaced by stand-ins (as src/modes/haul/wiring.test.ts).
 * Written by the skeleton; owned by the rules package MECHANICS with src/modes/merge/actions.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import night from '../../../games/night-market/game.json';
import { GameConfigSchema } from '../../config/schema';
import { mergeFixtures } from '../../engine/fixtures/merge';
import type * as R from '../../engine/merge';
import { mergeEngineMode, withMergeContent } from '../../engine/mergeMode';

const played = vi.hoisted(() => [] as string[]);
vi.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return { default: { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => void m.set(k, v), removeItem: async (k: string) => void m.delete(k) } };
});
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'night-market', rawGame: (await import('../../../games/night-market/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: (k: string) => void played.push(k) } }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: false } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

const cfg = withMergeContent(GameConfigSchema.parse(night)) as unknown as R.MergeConfig;

async function storeWith(game: R.MergeGame) {
  const { installEngineMode } = await import('../../engine/mode');
  installEngineMode(mergeEngineMode);
  const { useGame } = await import('../../state/store');
  useGame.setState({ cfg: cfg as never, game: game as never, hydrated: true, offline: null });
  const { mergeActions } = await import('./actions');
  return { useGame, mergeActions };
}

const filled = (g: R.MergeGame): R.MergeGame => ({ ...g, merge: { ...g.merge, festival: { lines: g.merge.festival.lines.map((l) => ({ ...l, filled: true })), filledAt: 1000 } } });

describe('closing a season through the store (2.11)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a merge game has no prestige points to gate on (threshold 1e15)', async () => {
    const E = await import('../../engine/economy');
    expect(E.prestigePointsAvailable(cfg, filled(mergeFixtures(cfg).festivalNear))).toBe(0);
  });

  it('is refused while the Festival is not filled: the rules are not asked', async () => {
    const g = mergeFixtures(cfg).festivalNear;
    const { useGame, mergeActions } = await storeWith(g);
    const spy = vi.spyOn(mergeEngineMode, 'prestige');
    played.length = 0;
    expect(mergeActions.closeSeason()).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(played).toEqual(['ui_denied']);
    expect(useGame.getState().game).toBe(g);
  });

  it('reaches the rules once the Festival is filled, and the next season is stored', async () => {
    const g = filled(mergeFixtures(cfg).festivalNear);
    const { useGame, mergeActions } = await storeWith(g);
    // ORDERS writes closeSeason; until then a stand-in that starts the next season.
    const spy = vi.spyOn(mergeEngineMode, 'prestige').mockImplementation((_c, s) => ({ ...s, merge: { ...(s as R.MergeGame).merge, season: 1 } }) as never);
    played.length = 0;
    expect(mergeActions.closeSeason()).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect((useGame.getState().game as R.MergeGame).merge.season).toBe(1);
    expect(played).toContain('prestige');
  });

  it('a gate that passes while the rules refuse changes nothing and plays ui_denied', async () => {
    const g = filled(mergeFixtures(cfg).festivalNear);
    const { useGame, mergeActions } = await storeWith(g);
    vi.spyOn(mergeEngineMode, 'prestige').mockImplementation((_c, s) => s);
    played.length = 0;
    expect(mergeActions.closeSeason()).toBe(false);
    expect(played).toEqual(['ui_denied']);
    expect(useGame.getState().game).toBe(g);
  });
});
