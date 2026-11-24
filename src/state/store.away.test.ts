/// <reference types="node" />
/**
 * Away earnings survive the app being closed before they are collected, in every game of the
 * factory (the path is the shared store, so the same scenarios run for all three: Pizza Empire on
 * the built-in sim rules, Orbit Haulers and Lantern Row on their own engine modes).
 *
 * The report waiting to be collected is saved with the game and comes back at the next start,
 * joined with any new time away the way resume() joins a second absence into an open report, and
 * time already counted is never counted again (the `stats.clockHigh` guard).
 *
 * The real store runs under node with the native services replaced by stand-ins. The disk (the
 * AsyncStorage stand-in) outlives a "kill"; everything else of the app is loaded afresh by
 * `launch`, as a new process would.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameConfig } from '../config/schema';
import type { EngineMode } from '../engine/mode';
import type { GameState } from '../engine/types';

const disk = vi.hoisted(() => new Map<string, string>());
/** Writes fail while this is on (a full disk); what the disk holds stays as it was. */
const diskFull = vi.hoisted(() => ({ on: false }));
const crashes = vi.hoisted(() => [] as string[]);
/** The rewarded ad: it plays to the end and gives the reward, unless a test puts another one here. */
const ad = vi.hoisted(() => ({ show: (async () => true) as () => Promise<boolean> }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => disk.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      if (diskFull.on) throw new Error('disk full');
      disk.set(k, v);
    },
    removeItem: async (k: string) => void disk.delete(k),
  },
}));
vi.mock('../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../services/ads', () => ({ ads: { showRewarded: () => ad.show(), maybeShowInterstitial: () => {}, init: () => {}, interstitials: false } }));
vi.mock('../services/firebase', () => ({
  analytics: { log: () => {} },
  // Every engine call of the store is wrapped (`safe`): a mode's hook that threw on a report read back from the save would only show here.
  crash: { record: (e: unknown, where?: string) => void crashes.push(`${where ?? ''}: ${String(e)}`) },
  fetchRemoteOverrides: async () => ({}),
}));
vi.mock('../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../services/region', () => ({ detectRegion: async () => null }));

type Away = { seconds: number; earnings: number; report?: unknown };
type Store = typeof import('./store').useGame;

interface Game {
  id: string;
  title: string;
  /** games/<id>/game.json, as src/generated/activeGame.ts imports it for the selected game. */
  file(): Promise<{ default: unknown }>;
  /** The mode's own engine, as its entry installs it (none: the built-in sim rules). */
  engine: (() => Promise<EngineMode>) | null;
  /** A game played far enough to earn while away, last touched at `at`. */
  played(cfg: GameConfig, at: number): Promise<GameState>;
  /** A game that earns nothing while away but whose mode reports the absence all the same (`reportAlone`); none for the sim. */
  idle?(cfg: GameConfig, at: number): Promise<GameState>;
}

const GAMES: Game[] = [
  {
    id: 'pizza-empire',
    title: 'Pizza Empire (sim, no engine mode)',
    file: () => import('../../games/pizza-empire/game.json'),
    engine: null,
    played: async (cfg, at) => (await import('../dev/presets.web')).buildPreset(cfg, 'mid', at),
  },
  {
    id: 'space-miner',
    title: 'Orbit Haulers (haul engine mode)',
    file: () => import('../../games/space-miner/game.json'),
    engine: async () => (await import('../engine/haulMode')).haulEngineMode,
    played: async (cfg, at) => {
      const F = await import('../engine/fixtures/haul');
      // 25 minutes of the scripted player: rigs, drones and the dock autopilot (nothing ships while away without it).
      return F.playFor(cfg as never, F.freshHaulGame(cfg as never, 12345, at), 25 * 60, at) as unknown as GameState;
    },
    // The first minute: drones haul, the dock autopilot is not bought yet ("Hold full. Nothing shipped.").
    idle: async (cfg, at) => {
      const F = await import('../engine/fixtures/haul');
      return F.playFor(cfg as never, F.freshHaulGame(cfg as never, 12345, at), 60, at) as unknown as GameState;
    },
  },
  {
    id: 'night-market',
    title: 'Lantern Row (merge engine mode)',
    file: () => import('../../games/night-market/game.json'),
    engine: async () => (await import('../engine/mergeMode')).mergeEngineMode,
    played: async (cfg, at) => {
      const F = await import('../engine/fixtures/merge');
      // Two minders hired: they sell house goods while the player is away.
      const g = F.mergeState(cfg as never, { clock: 300, cash: 0, chains: [{ c: 0, gear: 3, minder: 2 }, { c: 1, gear: 2, minder: 1 }] });
      return { ...g, lastSavedAt: at, stats: { ...g.stats, firstOpenAt: at, clockHigh: at } } as unknown as GameState;
    },
    // No minder hired: nothing is sold while away, but the gear fills its shelf ("your gear filled its shelves").
    idle: async (cfg, at) => {
      const F = await import('../engine/fixtures/merge');
      const g = F.mergeState(cfg as never, { clock: 300, cash: 0, chains: [{ c: 0, gear: 3 }] });
      return { ...g, lastSavedAt: at, stats: { ...g.stats, firstOpenAt: at, clockHigh: at } } as unknown as GameState;
    },
  },
];

const T0 = Date.UTC(2026, 10, 24, 9, 0, 0);
const HOUR = 3600_000;

interface App {
  useGame: Store;
  engine: EngineMode | null;
  cfg: GameConfig;
  offline(): Away | null;
  cash(): number;
  /** What "Collect" adds to the cash for an amount (a mode that rounds what it shows grants the rounded figure). */
  pays(amount: number): number;
  /** What the rewarded ad multiplies the collect by (2 for the sim, the mode's own otherwise). */
  adMultiplier(): number;
}

/**
 * A cold start: nothing of the last process is left in memory (the store's module state, the
 * installed engine), the disk is. What index.ts and App.tsx do before the first screen: the mode
 * entry installs its engine and parses its block of game.json (src/modes/contract.ts
 * `installMode`), then the store boots.
 */
async function launch(game: Game): Promise<App> {
  vi.resetModules();
  // One game per bundle: the generated file names the selected game (a mock's result is kept across resetModules, so it is set anew).
  vi.doMock('../generated/activeGame', async () => ({ ACTIVE_GAME_ID: game.id, rawGame: (await game.file()).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
  const { installEngineMode } = await import('../engine/mode');
  const engine = game.engine ? await game.engine() : null;
  installEngineMode(engine);
  if (engine?.config) {
    const { baseGame } = await import('../config/game');
    Object.assign(baseGame, engine.config(baseGame));
  }
  const { useGame } = await import('./store');
  await useGame.getState().boot();
  const cfg = useGame.getState().cfg;
  return {
    useGame,
    engine,
    cfg,
    offline: () => useGame.getState().offline,
    cash: () => useGame.getState().game.cash,
    pays: (amount) => (engine?.roundPayout ? engine.roundPayout(cfg, amount) : amount),
    adMultiplier: () => (engine?.offlineAdMultiplier ? engine.offlineAdMultiplier(cfg) : 2),
  };
}

/** The app goes to the background (it saves, as App.tsx's handler does) and is swiped away. */
async function swipeAway(app: App): Promise<void> {
  await app.useGame.getState().pause();
}

const played = new Map<string, GameState>();

/** A device on which the game was played until T0 and then closed, with nothing waiting. The clock is left at T0. */
async function install(game: Game, state: 'played' | 'idle' = 'played'): Promise<void> {
  disk.clear();
  vi.setSystemTime(T0);
  const app = await launch(game);
  const key = `${game.id}:${state}`;
  if (!played.has(key)) played.set(key, await (state === 'idle' ? game.idle! : game.played)(app.cfg, T0));
  app.useGame.setState({ game: played.get(key)!, offline: null });
  await swipeAway(app);
}

/** Opens the app at `at` and returns it with the report it shows (or null). */
async function openAt(game: Game, at: number): Promise<App> {
  vi.setSystemTime(at);
  return launch(game);
}

const near = (a: number, b: number, what?: string) => expect(Math.abs(a - b), what ?? `${a} against ${b}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(a), Math.abs(b)));

beforeEach(() => {
  vi.useFakeTimers({ now: T0, toFake: ['Date'] });
  crashes.length = 0;
  ad.show = async () => true;
  diskFull.on = false;
});
afterEach(() => {
  vi.useRealTimers();
  expect(crashes).toEqual([]);
});

describe.each(GAMES)('away earnings and a closed app: $title', (game) => {
  it('the scenario is real: three hours away earn something, and the save is the mode\'s own', async () => {
    await install(game);
    const app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline();
    expect(first).not.toBeNull();
    expect(first!.earnings).toBeGreaterThan(0);
    expect(first!.seconds).toBeCloseTo(3 * 3600, 0);
    expect([...disk.keys()]).toEqual([`save:${game.id}:${app.engine?.saveTag ?? 'v1'}`]);
    expect(app.cfg.mode).toBe(app.engine?.id ?? 'sim');
  });

  it('kill before collect, then boot: the report comes back with the same earnings', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    expect(first.earnings).toBeGreaterThan(0);
    // The report is on screen; the app is swiped away and opened again at once.
    await swipeAway(app);
    app = await launch(game);
    expect(app.offline()).toEqual(first);
    expect(app.cash()).toBe(cash);
    // And once more: closing it again loses nothing either.
    await swipeAway(app);
    app = await launch(game);
    expect(app.offline()).toEqual(first);
    expect(app.cash()).toBe(cash);
    // Collected now, it pays what the report says, once.
    await app.useGame.getState().collectOffline(false);
    expect(app.offline()).toBeNull();
    expect(app.cash()).toBe(cash + app.pays(first.earnings));
    await swipeAway(app);
    app = await launch(game);
    expect(app.offline()).toBeNull();
    expect(app.cash()).toBe(cash + app.pays(first.earnings));
  });

  it('killed in the first seconds, before any save: the next start counts the same absence again, once', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    const key = [...disk.keys()][0];
    // boot() itself writes nothing: the disk still holds the game as it was left at T0, with no report.
    expect(JSON.parse(disk.get(key)!)).toMatchObject({ lastSavedAt: T0 });
    expect(JSON.parse(disk.get(key)!)).not.toHaveProperty('pendingAway');
    app = await launch(game);
    expect(app.offline()).toEqual(first);
    expect(app.cash()).toBe(cash);
    await app.useGame.getState().collectOffline(false);
    expect(app.cash()).toBe(cash + app.pays(first.earnings));
    app = await launch(game);
    expect(app.offline()).toBeNull();
    expect(app.cash()).toBe(cash + app.pays(first.earnings));
  });

  it('a crash with the report open (no chance to save on the way out) keeps it from the last autosave', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    // App.tsx saves every five seconds; then the process dies.
    vi.setSystemTime(T0 + 3 * HOUR + 5000);
    await app.useGame.getState().save();
    app = await launch(game);
    expect(app.offline()).toEqual(first);
    expect(app.cash()).toBe(cash);
  });

  it('the rewarded ad still adds its share to a report that came back', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    await swipeAway(app);
    app = await launch(game);
    const cash = app.cash();
    expect(app.adMultiplier()).toBe(game.engine ? 1.5 : 2);
    await app.useGame.getState().collectOffline(true);
    expect(app.cash()).toBe(cash + app.pays(first.earnings * app.adMultiplier()));
    expect(app.offline()).toBeNull();
  });

  it('killed while the rewarded ad plays: the report comes back and nothing was paid yet', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    // "Watch ad" was pressed; the video never ends for this process (the system kills the app under it).
    ad.show = () => new Promise<boolean>(() => {});
    void app.useGame.getState().collectOffline(true);
    // A full-screen ad puts the app in the background on Android: it saves, with the report still waiting.
    await swipeAway(app);
    expect(app.offline()).toEqual(first);
    ad.show = async () => true;
    app = await launch(game);
    expect(app.offline()).toEqual(first);
    expect(app.cash()).toBe(cash);
    await app.useGame.getState().collectOffline(true);
    expect(app.cash()).toBe(cash + app.pays(first.earnings * app.adMultiplier()));
  });

  it('a collect whose save fails, then a kill: the last good save still holds the report and the old cash, so it is paid once', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    await app.useGame.getState().save();
    // The disk fills up; the player collects. In memory the coins are paid, on the disk nothing changed.
    diskFull.on = true;
    await app.useGame.getState().collectOffline(false);
    await app.useGame.getState().save();
    expect(app.cash()).toBe(cash + app.pays(first.earnings));
    expect(crashes.length).toBeGreaterThan(0);
    expect(crashes.every((c) => c.startsWith('save: '))).toBe(true);
    crashes.length = 0;
    diskFull.on = false;
    // Killed: the game comes back as it was last saved, report and cash together. Nothing was lost and nothing is doubled.
    app = await launch(game);
    expect(app.offline()).toEqual(first);
    expect(app.cash()).toBe(cash);
    await app.useGame.getState().collectOffline(false);
    await swipeAway(app);
    app = await launch(game);
    expect(app.offline()).toBeNull();
    expect(app.cash()).toBe(cash + app.pays(first.earnings));
  });

  it('kill before collect, then a second absence: one report for both, paid once', async () => {
    // The player who collected in time: three hours away, collect, two more hours away.
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    await app.useGame.getState().collectOffline(false);
    await swipeAway(app);
    app = await openAt(game, T0 + 5 * HOUR);
    const second = app.offline()!;
    expect(second.earnings).toBeGreaterThan(0);
    expect(second.seconds).toBeCloseTo(2 * 3600, 0);

    // The same days, but the app was closed with the first report still on screen.
    await install(game);
    app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    await swipeAway(app);
    app = await openAt(game, T0 + 5 * HOUR);
    const both = app.offline()!;
    expect(both).not.toBeNull();
    near(both.earnings, first.earnings + second.earnings);
    expect(both.seconds).toBeCloseTo(first.seconds + second.seconds, 0);
    // The mode's own report is one report of both absences (its mergeReport), not the newer one alone.
    if (game.engine) {
      const report = both.report as { seconds: number };
      expect(report.seconds).toBeCloseTo((first.report as { seconds: number }).seconds + (second.report as { seconds: number }).seconds, 0);
    } else expect(both.report).toBeUndefined();
    expect(app.cash()).toBe(cash);
    await app.useGame.getState().collectOffline(false);
    const paid = cash + app.pays(both.earnings);
    expect(app.cash()).toBe(paid);
    // Paid once: nothing is left at the next start, a moment or an hour later.
    await swipeAway(app);
    app = await launch(game);
    expect(app.offline()).toBeNull();
    expect(app.cash()).toBe(paid);
  });

  it('collect, then boot: nothing is paid twice', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    await app.useGame.getState().collectOffline(false);
    const paid = cash + app.pays(first.earnings);
    expect(app.cash()).toBe(paid);
    // collectOffline saved by itself: the app is killed without another save.
    app = await launch(game);
    expect(app.offline()).toBeNull();
    expect(app.cash()).toBe(paid);
    await swipeAway(app);
    // An hour later only that hour is reported: the three hours already paid are not in it.
    app = await openAt(game, T0 + 4 * HOUR);
    expect(app.offline()!.seconds).toBeCloseTo(3600, 0);
    expect(app.offline()!.earnings).toBeLessThan(first.earnings);
    expect(app.cash()).toBe(paid);
  });

  it('the device clock moved back between two boots: the report comes back as it was, and the hours wound back are not paid again', async () => {
    // The player who collected in time, with the same clock changes: what the hour after the first return earns.
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    await app.useGame.getState().collectOffline(false);
    const collected = app.cash();
    await swipeAway(app);
    app = await openAt(game, T0 + 1 * HOUR);
    expect(app.offline()).toBeNull();
    expect(app.cash()).toBe(collected);
    await swipeAway(app);
    app = await openAt(game, T0 + 4 * HOUR);
    const hour = app.offline()!;
    expect(hour.seconds).toBeCloseTo(3600, 0);
    expect(hour.earnings).toBeGreaterThan(0);

    // Closed with the report open; the clock is set back two hours before the next start.
    await install(game);
    app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    await swipeAway(app);
    app = await openAt(game, T0 + 1 * HOUR);
    expect(app.offline()).toEqual(first);
    expect(app.cash()).toBe(cash);
    // Closed again, still not collected; the clock is right again an hour after the first return.
    await swipeAway(app);
    app = await openAt(game, T0 + 4 * HOUR);
    const both = app.offline()!;
    near(both.earnings, first.earnings + hour.earnings);
    expect(both.seconds).toBeCloseTo(first.seconds + 3600, 0);
    await app.useGame.getState().collectOffline(false);
    expect(app.cash()).toBe(cash + app.pays(both.earnings));
    await swipeAway(app);
    app = await launch(game);
    expect(app.offline()).toBeNull();
  });

  it('back in the foreground with a report that came back: resume() joins the new time as it always did', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    await swipeAway(app);
    app = await launch(game);
    // The report is open again; the app goes to the background for an hour and returns (no restart).
    await app.useGame.getState().pause();
    vi.setSystemTime(T0 + 4 * HOUR);
    app.useGame.getState().resume();
    const both = app.offline()!;
    expect(both.seconds).toBeCloseTo(first.seconds + 3600, 0);
    expect(both.earnings).toBeGreaterThan(first.earnings);
    // resume() saved: killed now, the joined report is the one that comes back.
    app = await launch(game);
    expect(app.offline()).toEqual(both);
  });

  it('a save holds the report only while it waits, next to the game and never inside it', async () => {
    await install(game);
    const key = [...disk.keys()][0];
    expect(JSON.parse(disk.get(key)!).pendingAway).toBeUndefined();
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    await swipeAway(app);
    expect(JSON.parse(disk.get(key)!).pendingAway).toEqual(first);
    app = await launch(game);
    // The engine never sees it: the game in memory has no such field, so nothing but the store reads or writes it.
    expect(app.useGame.getState().game).not.toHaveProperty('pendingAway');
    await app.useGame.getState().collectOffline(false);
    await swipeAway(app);
    expect(JSON.parse(disk.get(key)!)).not.toHaveProperty('pendingAway');
  });

  it('a report that cannot be written (a mode\'s bug) costs neither the save nor the coins', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    const knot: { self?: unknown } = {};
    knot.self = knot;
    app.useGame.setState({ offline: { ...first, report: knot } });
    vi.setSystemTime(T0 + 3 * HOUR + 5000);
    await swipeAway(app);
    // Reported, and the game was saved all the same (stamped with the time of that save).
    expect(crashes).toHaveLength(1);
    expect(crashes[0]).toContain('save-away');
    crashes.length = 0;
    const key = [...disk.keys()][0];
    expect(JSON.parse(disk.get(key)!).lastSavedAt).toBe(T0 + 3 * HOUR + 5000);
    app = await launch(game);
    expect(app.offline()).toEqual({ seconds: first.seconds, earnings: first.earnings });
    expect(app.cash()).toBe(cash);
  });

  it('a save is untrusted: a record that is not one is dropped, and one with a broken report still pays its coins', async () => {
    await install(game);
    let app = await openAt(game, T0 + 3 * HOUR);
    const first = app.offline()!;
    const cash = app.cash();
    await swipeAway(app);
    const key = [...disk.keys()][0];
    const saved = JSON.parse(disk.get(key)!);
    for (const bad of ['coins', 7, null, [], {}, { seconds: 3600 }, { seconds: 3600, earnings: 'many' }, { seconds: 3600, earnings: null }, { seconds: 3600, earnings: -500 }, { seconds: 3600, earnings: 0 }]) {
      disk.set(key, JSON.stringify({ ...saved, pendingAway: bad }));
      app = await launch(game);
      expect(app.offline(), JSON.stringify(bad)).toBeNull();
      expect(app.cash(), JSON.stringify(bad)).toBe(cash);
    }
    // The time is repaired, the coins are kept; a report the mode cannot read is the mode's to ignore.
    disk.set(key, JSON.stringify({ ...saved, pendingAway: { seconds: 'long', earnings: first.earnings, report: 'torn' } }));
    app = await launch(game);
    expect(app.offline()).toEqual({ seconds: 0, earnings: first.earnings, report: 'torn' });
    await app.useGame.getState().collectOffline(false);
    expect(app.cash()).toBe(cash + app.pays(first.earnings));
  });
});

describe.each(GAMES.filter((g) => g.idle))('a report with no coins that speaks alone: $title', (game) => {
  it('comes back too when the app was closed on it, and is gone once put away', async () => {
    // The player who put the first report away in time: what a second hour away shows by itself, if anything.
    await install(game, 'idle');
    let app = await openAt(game, T0 + 1 * HOUR);
    await app.useGame.getState().collectOffline(false);
    await swipeAway(app);
    app = await openAt(game, T0 + 2 * HOUR);
    const second = app.offline();
    // The station without its autopilot reports a full hold again; the gear's shelf was full after the first hour, so the second has nothing to say.
    expect(second !== null).toBe(game.id === 'space-miner');

    await install(game, 'idle');
    app = await openAt(game, T0 + 1 * HOUR);
    const first = app.offline()!;
    // Nothing to collect, and still a report: the mode says so (src/engine/mode.ts `reportAlone`).
    expect(first).not.toBeNull();
    expect(first.earnings).toBe(0);
    expect(app.engine!.reportAlone!(first.report)).toBe(true);
    const cash = app.cash();
    await swipeAway(app);
    app = await launch(game);
    expect(app.offline()).toEqual(first);
    expect(app.engine!.reportAlone!(app.offline()!.report)).toBe(true);
    // Another hour away joins it when it has something to report (as a return to the foreground would), else the report stays as it was.
    await swipeAway(app);
    app = await openAt(game, T0 + 2 * HOUR);
    const both = app.offline()!;
    expect(both.earnings).toBe(0);
    if (second) expect((both.report as { seconds: number }).seconds).toBeCloseTo((first.report as { seconds: number }).seconds + (second.report as { seconds: number }).seconds, 0);
    else expect(both).toEqual(first);
    expect(app.engine!.reportAlone!(both.report)).toBe(true);
    await app.useGame.getState().collectOffline(false);
    expect(app.cash()).toBe(cash);
    await swipeAway(app);
    app = await launch(game);
    expect(app.offline()).toBeNull();
    expect(app.cash()).toBe(cash);
  });
});
