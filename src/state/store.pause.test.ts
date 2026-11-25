/// <reference types="node" />
/**
 * The start of the time away while the app is in the background (finding H1 of the first yard's review):
 * a save() while the store is paused (App.tsx's 5 s autosave firing in the background on Android, or
 * an overdue one firing on iOS between will-enter-foreground and did-become-active) still writes the
 * game, but never moves `lastSavedAt` to "now". resume() after ten minutes pays ten minutes.
 * The real shared store runs under node with the native services replaced by stand-ins (as
 * store.seams.test.ts); the stand-in engine earns 3 per second away.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { buildPreset } from '../dev/presets.web';
import type { EngineMode } from '../engine/mode';
import type { GameState } from '../engine/types';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async (k: string) => storage.get(k) ?? null, setItem: async (k: string, v: string) => void storage.set(k, v), removeItem: async (k: string) => void storage.delete(k) },
}));
vi.mock('../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'pizza-empire', rawGame: (await import('../../games/pizza-empire/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
vi.mock('../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../services/region', () => ({ detectRegion: async () => null }));

const cfg = GameConfigSchema.parse(pizza);
const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);
let clock = T0;
/** Each test starts at its own later moment, so the store's module clock (lastTickAt) never covers it. */
const nextMoment = () => (clock += 30 * 86_400_000);
const TEN_MIN = 600;

const awayEngine: EngineMode = {
  id: 'sim',
  saveTag: 'pause1',
  create: (_c, b) => b,
  reconcile: (_c, b) => b,
  tick: (_c, s, dt) => ({ ...s, cash: s.cash + 10 * dt }),
  income: () => 3,
  activeIncome: () => 10,
  offline: (_c, s, now) => {
    const seconds = Math.max(0, (now - Math.max(s.lastSavedAt, s.stats.clockHigh ?? 0)) / 1000);
    return { seconds, earnings: 3 * seconds, game: s as GameState };
  },
  prestige: (_c, s) => s,
  offlineAdMultiplier: () => 2,
};

async function running() {
  const { installEngineMode } = await import('../engine/mode');
  const now = nextMoment();
  vi.useFakeTimers({ now, toFake: ['Date'] });
  const { useGame } = await import('./store');
  installEngineMode(awayEngine);
  const game = { ...buildPreset(cfg, 'mid', now), cash: 1000, lastSavedAt: now };
  useGame.setState({ cfg: cfg as never, game: game as never, hydrated: true, offline: null });
  return { useGame, now };
}

const later = (ms: number) => vi.setSystemTime(Date.now() + ms);

afterEach(async () => {
  vi.useRealTimers();
  (await import('../engine/mode')).installEngineMode(null);
});

describe('save() while paused never moves the start of the time away', () => {
  it('pause, an autosave in the background, resume after ten minutes: ten minutes are paid', async () => {
    const { useGame, now } = await running();
    await useGame.getState().pause();
    expect(useGame.getState().game.lastSavedAt).toBe(now);
    later(5_000);
    await useGame.getState().save(); // App.tsx's autosave, its timer still alive in the background
    expect(useGame.getState().game.lastSavedAt).toBe(now);
    later(TEN_MIN * 1000 - 5_000);
    useGame.getState().resume();
    const offline = useGame.getState().offline!;
    expect(offline).not.toBeNull();
    expect(offline.seconds).toBeCloseTo(TEN_MIN, 6);
    expect(offline.earnings).toBeCloseTo(3 * TEN_MIN, 6);
  });

  it('an overdue autosave that wins the race to the foreground (iOS) does not eat the time away', async () => {
    const { useGame } = await running();
    await useGame.getState().pause();
    later(TEN_MIN * 1000 - 50);
    await useGame.getState().save(); // fired at will-enter-foreground, before AppState 'active'
    later(50);
    useGame.getState().resume();
    expect(useGame.getState().offline?.seconds).toBeCloseTo(TEN_MIN, 6);
  });

  it('the save on disk keeps the moment of pause, so a cold start after the kill pays the time away', async () => {
    const { useGame, now } = await running();
    later(2_000);
    await useGame.getState().pause();
    later(30_000);
    await useGame.getState().save();
    const onDisk = [...storage.values()].map((v) => JSON.parse(v) as GameState).pop()!;
    expect(onDisk.lastSavedAt).toBe(now + 2_000);
    useGame.getState().resume();
  });

  it('a save while running still stamps the moment of the save', async () => {
    const { useGame, now } = await running();
    later(7_000);
    await useGame.getState().save();
    expect(useGame.getState().game.lastSavedAt).toBe(now + 7_000);
  });
});
