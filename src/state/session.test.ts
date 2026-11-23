/**
 * The session wiring (src/state/session.ts): what the reminders, the rating prompt and the
 * leaderboards do at each moment the store reports. The services are stand-ins; the store, its
 * rules and the lifecycle emitter are the real ones (Pizza Empire, a sim game).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { buildPreset } from '../dev/presets.web';
import { REMINDER_RULES } from '../engine/reminders';

const calls = vi.hoisted(() => ({
  log: [] as string[],
  planned: [] as { kind: string; at: number; title: string; body: string }[][],
  submitted: [] as Record<string, number>[],
  prefs: { reminders: null as boolean | null, reviewAsks: [] as number[], sent: {} as Record<string, number> },
  remindersAvailable: true,
  overlayOpen: false,
}));

vi.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return { default: { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => void m.set(k, v), removeItem: async (k: string) => void m.delete(k) } };
});
vi.mock('../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'pizza-empire', rawGame: (await import('../../games/pizza-empire/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
vi.mock('../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: (e: unknown) => void calls.log.push(`crash:${String(e)}`) }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../services/region', () => ({ detectRegion: async () => null }));
vi.mock('../services/prefs', () => ({ prefs: { load: async () => {}, get: () => calls.prefs, set: (p: object) => void Object.assign(calls.prefs, p) } }));
vi.mock('../services/reminders', () => ({
  reminders: {
    get available() {
      return calls.remindersAvailable;
    },
    init: async () => void calls.log.push('reminders.init'),
    clear: async () => void calls.log.push('reminders.clear'),
    plan: async (list: (typeof calls.planned)[number]) => {
      calls.log.push('reminders.plan');
      calls.planned.push(list);
    },
    ask: async () => {
      calls.log.push('reminders.ask');
      calls.prefs.reminders = true;
      return true;
    },
  },
}));
vi.mock('../services/review', () => ({ review: { maybeAsk: async () => void calls.log.push('review.maybeAsk') } }));
vi.mock('../services/boards', () => ({
  boards: {
    configure: () => void calls.log.push('boards.configure'),
    start: async () => void calls.log.push('boards.start'),
    submit: async (scores: Record<string, number>) => {
      calls.log.push('boards.submit');
      calls.submitted.push(scores);
    },
    show: async (scores: Record<string, number>) => {
      calls.log.push('boards.show');
      calls.submitted.push(scores);
      return true;
    },
  },
}));
vi.mock('./overlays', () => ({ overlays: { anyOpen: () => calls.overlayOpen, msSinceClose: () => Infinity, subscribe: () => () => {} } }));

const cfg = GameConfigSchema.parse(pizza);
/** 10:00 local time, so nothing here falls into the quiet hours by accident. */
const NOW = new Date(2026, 10, 23, 10, 0, 0, 0).getTime();
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

async function wired() {
  const { installEngineMode } = await import('../engine/mode');
  const { setModeReminderTexts } = await import('../services/reminderTexts');
  installEngineMode(null);
  setModeReminderTexts(null);
  const { useGame } = await import('./store');
  useGame.setState({ cfg: cfg as never, game: buildPreset(cfg, 'mid', NOW) as never, hydrated: true, offline: null });
  const session = await import('./session');
  session.wireSession();
  const { lifecycle } = await import('./lifecycle');
  return { useGame, lifecycle, session };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  calls.log.length = 0;
  calls.planned.length = 0;
  calls.submitted.length = 0;
  Object.assign(calls.prefs, { reminders: null, reviewAsks: [], sent: {} });
  calls.remindersAvailable = true;
  calls.overlayOpen = false;
});
afterEach(() => vi.useRealTimers());

describe('the session wiring', () => {
  it('is wired once: a second call adds no second listener', async () => {
    await wired();
    const { wireSession } = await import('./session');
    wireSession();
    const { lifecycle } = await import('./lifecycle');
    lifecycle.emit('resume');
    await flush();
    expect(calls.log.filter((c) => c === 'reminders.clear')).toHaveLength(1);
  });

  it('at boot: clears what an earlier session scheduled, signs in quietly and sends the figures', async () => {
    const { lifecycle } = await wired();
    lifecycle.emit('boot');
    await flush();
    expect(calls.log).toEqual(['reminders.init', 'boards.start', 'reminders.clear', 'boards.submit']);
    expect(calls.submitted[0]).toMatchObject({ prestiges: expect.any(Number), sales: expect.any(Number), levels: expect.any(Number) });
  });

  it("when the player leaves: plans the reminders with the game's own words and sends the figures", async () => {
    const { lifecycle } = await wired();
    lifecycle.emit('pause');
    await flush();
    expect(calls.log).toEqual(['reminders.plan', 'boards.submit']);
    const [full, later] = calls.planned[0];
    expect(full).toEqual({ kind: 'awayFull', at: NOW + cfg.economy.offline.maxHours * 3600_000, title: cfg.reminders!.awayFull.title, body: cfg.reminders!.awayFull.body });
    expect(later).toMatchObject({ kind: 'later', at: NOW + REMINDER_RULES.laterHours * 3600_000, title: cfg.reminders!.later.title });
  });

  it('a game without reminder words plans nothing', async () => {
    const { useGame, lifecycle } = await wired();
    useGame.setState({ cfg: { ...cfg, reminders: undefined } as never });
    lifecycle.emit('pause');
    await flush();
    expect(calls.log).toEqual(['boards.submit']);
  });

  it('when the player is back: nothing scheduled stays', async () => {
    const { lifecycle } = await wired();
    lifecycle.emit('resume');
    await flush();
    expect(calls.log).toEqual(['reminders.clear']);
  });

  it('the first collect of away earnings asks about reminders, once, and asks for nothing else then', async () => {
    const { lifecycle } = await wired();
    lifecycle.emit('offlineCollected');
    await flush();
    vi.advanceTimersByTime(5000);
    await flush();
    expect(calls.log).toEqual(['reminders.ask']);
  });

  it('a later collect may ask for the rating prompt, after a moment, and never over a dialog', async () => {
    const { lifecycle } = await wired();
    calls.prefs.reminders = false;
    lifecycle.emit('offlineCollected');
    await flush();
    expect(calls.log).toEqual([]);
    vi.advanceTimersByTime(1500);
    await flush();
    expect(calls.log).toEqual(['review.maybeAsk']);

    calls.log.length = 0;
    calls.overlayOpen = true;
    lifecycle.emit('offlineCollected');
    await flush();
    vi.advanceTimersByTime(5000);
    await flush();
    expect(calls.log).toEqual([]);
  });

  it('where the phone cannot show reminders, the player is never asked about them', async () => {
    const { lifecycle } = await wired();
    calls.remindersAvailable = false;
    lifecycle.emit('offlineCollected');
    await flush();
    vi.advanceTimersByTime(1500);
    await flush();
    expect(calls.log).toEqual(['review.maybeAsk']);
  });

  it('the run reset sends the figures', async () => {
    const { lifecycle } = await wired();
    lifecycle.emit('prestige');
    await flush();
    expect(calls.log).toEqual(['boards.submit']);
  });

  it('the leaderboard button opens the board with the latest figures', async () => {
    const { session, useGame } = await wired();
    await expect(session.openLeaderboard()).resolves.toBe(true);
    expect(calls.log).toEqual(['boards.show']);
    expect(calls.submitted[0].levels).toBe(useGame.getState().game.stats.levelsBought);
  });
});

describe('the store reports its session moments', () => {
  it('pause, resume and an offline collect each say so', async () => {
    const { useGame, lifecycle } = await wired();
    const seen: string[] = [];
    const stop = lifecycle.subscribe((e) => seen.push(e));
    await useGame.getState().pause();
    useGame.getState().resume();
    useGame.setState({ offline: { seconds: 3600, earnings: 100 } });
    await useGame.getState().collectOffline(false);
    stop();
    expect(seen).toEqual(['pause', 'resume', 'offlineCollected']);
  });
});
