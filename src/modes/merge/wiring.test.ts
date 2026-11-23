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
import { dropRows, mergeFixtures, mergeState } from '../../engine/fixtures/merge';
import { applyProduct } from '../../engine/meta';
import type * as R from '../../engine/merge';
import { mergeEngineMode, withMergeContent } from '../../engine/mergeMode';

const played = vi.hoisted(() => [] as string[]);
/** A stand-in of the shared ads service with the real service's skip rule (src/services/ads.ts showRewarded: skipRewarded gives the reward with no video). */
const adsStub = vi.hoisted(() => ({ skipRewarded: false, noAds: false, videos: 0, async showRewarded() { if (this.skipRewarded) return true; this.videos++; return true; }, maybeShowInterstitial: () => {}, init: () => {}, interstitials: false }));
vi.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return { default: { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => void m.set(k, v), removeItem: async (k: string) => void m.delete(k) } };
});
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'night-market', rawGame: (await import('../../../games/night-market/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: (k: string) => void played.push(k) } }));
vi.mock('../../services/ads', () => ({ ads: adsStub }));
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

describe('away coins and the season close (Decision M49, the rules attack\'s first finding)', () => {
  it('an away report still waiting when the season closes is paid into the old purse and resets with it', async () => {
    const g = { ...filled(mergeFixtures(cfg).festivalNear), cash: 1000 };
    const { useGame, mergeActions } = await storeWith(g);
    // The "Close the season?" sheet was open when the app came back: the away sheet waits behind it.
    useGame.setState({ offline: { seconds: 36_000, earnings: 46_700_000 } });
    expect(mergeActions.closeSeason()).toBe(true);
    const after = useGame.getState().game as R.MergeGame;
    expect(after.merge.season).toBe(g.merge.season + 1);
    expect(after.cash).toBe(0);
    expect(useGame.getState().offline).toBeNull();
    // Nothing is left to collect into the new season.
    await useGame.getState().collectOffline(true);
    expect((useGame.getState().game as R.MergeGame).cash).toBe(0);
  });

  it('a close the rules refuse leaves the waiting away report alone', async () => {
    const g = mergeFixtures(cfg).festivalNear;
    const { useGame, mergeActions } = await storeWith(g);
    const offline = { seconds: 3600, earnings: 5000 };
    useGame.setState({ offline });
    expect(mergeActions.closeSeason()).toBe(false);
    expect(useGame.getState().offline).toBe(offline);
    expect(useGame.getState().game).toBe(g);
  });
});

describe('every row of the drop table by tap-tap through the store (2.5)', () => {
  it('arm a cell, tap a target: the store runs the same dropAt, stores the result, plays its key', async () => {
    const { useMergeUi } = await import('../../ui/merge/uiState');
    for (const row of dropRows(cfg)) {
      const { useGame, mergeActions } = await storeWith(row.game);
      played.length = 0;
      useMergeUi.getState().arm(row.from);
      const armed = useMergeUi.getState().armed;
      expect(armed).toBe(row.from);
      const result = mergeActions.dropAt(armed!, row.code);
      useMergeUi.getState().disarm();
      expect(result?.kind, row.name).toBe(row.kind);
      if (row.reason) expect(result, row.name).toEqual({ kind: 'return', reason: row.reason });
      const stored = useGame.getState().game;
      if (row.kind === 'return' || row.kind === 'ticketShake') {
        expect(stored, row.name).toBe(row.game);
        expect(played, row.name).toEqual(['return']);
      } else expect(stored, row.name).not.toBe(row.game);
    }
  });
});

describe('purchases, buttons and rewarded ads through the store (2.5, 5.7)', () => {
  afterEach(() => {
    adsStub.skipRewarded = false;
    adsStub.videos = 0;
  });

  it('a refused purchase plays ui_denied and stores nothing; a paid one stores the game and plays its key', async () => {
    const g = mergeState(cfg, { clock: 100, cash: 0, chains: [{ c: 0 }], goods: [] });
    const { useGame, mergeActions } = await storeWith(g);
    played.length = 0;
    expect(mergeActions.levelGear(0)).toBe(false);
    expect(played).toEqual(['ui_denied']);
    expect(useGame.getState().game).toBe(g);
    const rich = { ...g, cash: 10_000 };
    const s2 = await storeWith(rich);
    played.length = 0;
    expect(s2.mergeActions.levelGear(0)).toBe(true);
    expect(played).toEqual(['upgrade']);
    expect((s2.useGame.getState().game as R.MergeGame).merge.chains[0].gear).toBe(2);
  });

  it('"Watch ad" asks canWatchAd first: refused without a video; granted after the video; with Quiet Evening (skipAds) at once with no video', async () => {
    const g = mergeState(cfg, { clock: 100, chains: [{ c: 0, gear: 3, best: 5 }], goods: [], counters: [[[0, 5], [0, 3]], [[0, 4]]] });
    const { useGame, mergeActions } = await storeWith(g);
    played.length = 0;
    expect(await mergeActions.watchAd('fillLine', 1)).toBe(false); // one unfilled line: never the last
    expect(adsStub.videos).toBe(0);
    expect(played).toEqual(['ui_denied']);
    expect(await mergeActions.watchAd('fillLine', 0)).toBe(true);
    expect(adsStub.videos).toBe(1);
    expect((useGame.getState().game as R.MergeGame).merge.counters[0].ticket!.lines.filter((l) => l.filled)).toHaveLength(1);
    // Quiet Evening: the shared product kind skipAds sets the entitlement; the shared ads service then skips the video.
    const product = cfg.monetization.iap.products.find((p) => p.id === cfg.merge.products.quietEvening)!;
    expect(product.kind).toBe('skipAds');
    const owned = applyProduct(cfg, g, product, 0).state as R.MergeGame;
    expect(owned.entitlements.skipRewarded).toBe(true);
    const s2 = await storeWith(owned);
    adsStub.skipRewarded = owned.entitlements.skipRewarded;
    expect(await s2.mergeActions.watchAd('gearRush')).toBe(true);
    expect(adsStub.videos).toBe(1); // no second video
    expect((s2.useGame.getState().game as R.MergeGame).merge.ads.gearRush).toBe(100 + cfg.merge.ads.gearRushCooldown);
  });
});
