/// <reference types="node" />
/**
 * An away report that was not collected survives the app being closed (the shared store, so every
 * game): the report is saved with the game while it waits and comes back at the next start, with
 * any new absence added, and it is paid once. Before, the store only kept it in memory while the
 * save already said "that time is counted": closing the app on the report lost its earnings.
 *
 * The real store boots here from a stand-in disk, under node with the native services replaced.
 * "Closing the app" is a new copy of the store module (its module state is a process's memory)
 * booted from the same disk. First Pizza Empire (sim, no engine mode), then a stand-in mode with
 * its own engine, to pin what the store promises every such mode (src/engine/mode.ts): its report
 * is opaque, comes back as it was written and goes through `mergeReport`, `reportAlone` and
 * `offlineAdMultiplier` as a report that was never saved does. Orbit Haulers' own run of the same
 * cases is src/modes/haul/away.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { buildPreset } from '../dev/presets.web';
import * as E from '../engine/economy';
import type { EngineMode } from '../engine/mode';
import type { GameState } from '../engine/types';

/** What survives the app being closed: the device's storage. `lost`: writes that never reach it (the app ended first). */
const disk = vi.hoisted(() => new Map<string, string>());
const writes = vi.hoisted(() => ({ lost: false }));
const adResult = vi.hoisted(() => ({ ok: true }));
const crashes = vi.hoisted(() => [] as string[]);
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => disk.get(k) ?? null,
    setItem: async (k: string, v: string) => void (writes.lost || disk.set(k, v)),
    removeItem: async (k: string) => void disk.delete(k),
  },
}));
vi.mock('../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'pizza-empire', rawGame: (await import('../../games/pizza-empire/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../services/ads', () => ({ ads: { showRewarded: async () => adResult.ok, maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
vi.mock('../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: (_e: unknown, where: string) => void crashes.push(where) }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../services/region', () => ({ detectRegion: async () => null }));

const cfg = GameConfigSchema.parse(pizza);
const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** The key the store saves the waiting report under, inside the save. */
const KEY = 'pendingOffline';

type Store = Awaited<ReturnType<typeof launch>>;

/**
 * One run of the app: a fresh copy of the store, booted from the disk. `engine` is the mode's own
 * engine when the game has one (its entry installs it before the store boots).
 */
async function launch(engine: EngineMode | null = null) {
  vi.resetModules();
  const { installEngineMode } = await import('../engine/mode');
  installEngineMode(engine);
  const { useGame } = await import('./store');
  await useGame.getState().boot();
  return useGame;
}

/** The app goes to the background and is closed there (swiped away, or ended by the system): the store's last save. */
async function close(app: Store) {
  await app.getState().pause();
}

/** Lets a save that an action started (not awaited by it) reach the disk. */
const settle = () => new Promise<void>((r) => setTimeout(r, 0));

const saved = (key: string) => JSON.parse(disk.get(key) ?? 'null') as (GameState & Record<string, unknown>) | null;
const at = (time: number) => vi.setSystemTime(time);

beforeEach(() => {
  disk.clear();
  writes.lost = false;
  crashes.length = 0;
  adResult.ok = true;
  vi.useFakeTimers({ now: T0, toFake: ['Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Pizza Empire: an away report that was not collected survives the app being closed', () => {
  const SAVE = 'save:pizza-empire:v1';
  /** A mid game that earns while away, last saved at T0. */
  const mid = ((g) => ({ ...g, lastSavedAt: T0, stats: { ...g.stats, clockHigh: T0 } }))(buildPreset(cfg, 'mid', T0));
  /** What `seconds` away earn this game (the engine's own figure; the income does not change while away). */
  const earnedIn = (seconds: number) => E.computeOffline(cfg, mid, mid.lastSavedAt + seconds * 1000).earnings;

  beforeEach(() => {
    disk.set(SAVE, JSON.stringify(mid));
  });

  it('the game earns while away, and a start after 2 h shows the report (the cases below build on it)', async () => {
    expect(cfg.economy.offline).toMatchObject({ maxHours: 4, minSecondsToShow: 60 });
    expect(earnedIn(2 * 3600)).toBeGreaterThan(0);
    at(T0 + 2 * HOUR);
    const app = await launch();
    expect(app.getState().offline).toStrictEqual({ seconds: 7200, earnings: earnedIn(7200), report: undefined });
    // Not paid yet: the report waits for Collect.
    expect(app.getState().game.cash).toBe(mid.cash);
  });

  it('closed before the report is collected, then started: the report is back with the same earnings, and is paid once', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    at(T0 + 2 * HOUR + 20_000);
    await close(first);
    // The save says the time away is counted (lastSavedAt is now), and holds what it earned.
    expect(saved(SAVE)!.lastSavedAt).toBe(T0 + 2 * HOUR + 20_000);
    expect(saved(SAVE)![KEY]).toStrictEqual({ seconds: 7200, earnings: report.earnings });

    const second = await launch();
    expect(second.getState().offline).toStrictEqual({ seconds: 7200, earnings: report.earnings });
    expect(second.getState().game.cash).toBe(mid.cash);
    await second.getState().collectOffline(false);
    expect(second.getState().game.cash).toBe(mid.cash + report.earnings);
    expect(second.getState().offline).toBeNull();
    await settle();
    expect(saved(SAVE)![KEY]).toBeUndefined();

    // And it does not come back a third time.
    const third = await launch();
    expect(third.getState().offline).toBeNull();
    expect(third.getState().game.cash).toBe(mid.cash + report.earnings);
  });

  it('the autosave alone is enough: closed without ever reaching the background, the report is back', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    // The game runs on under the report (App.tsx ticks ten times a second and saves every 5 s).
    for (let i = 1; i <= 5; i++) {
      at(T0 + 2 * HOUR + i * 1000);
      first.getState().tick(1);
    }
    await first.getState().save();
    const played = first.getState().game.cash;
    expect(played).toBeGreaterThan(mid.cash);

    const second = await launch();
    expect(second.getState().offline).toStrictEqual({ seconds: 7200, earnings: report.earnings });
    expect(second.getState().game.cash).toBe(played);
  });

  it('closed before the report is collected, then a second absence: one report with both, paid once', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    await close(first);

    at(T0 + 5 * HOUR);
    const second = await launch();
    const both = second.getState().offline!;
    expect(both.seconds).toBe(7200 + 10800);
    expect(both.earnings).toBe(report.earnings + earnedIn(10800));
    // Two absences of 2 h and 3 h pay what 5 h of this income pay: nothing dropped, nothing twice.
    expect(both.earnings).toBeCloseTo(earnedIn(7200) * 2.5, 6);
    expect(second.getState().game.cash).toBe(mid.cash);

    await second.getState().collectOffline(false);
    expect(second.getState().game.cash).toBe(mid.cash + both.earnings);
    await settle();
    const third = await launch();
    expect(third.getState().offline).toBeNull();
    expect(third.getState().game.cash).toBe(mid.cash + both.earnings);
  });

  it('collected, then started: nothing is paid twice, and a later absence pays only itself', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    await first.getState().collectOffline(false);
    const paid = mid.cash + report.earnings;
    expect(first.getState().game.cash).toBe(paid);
    await close(first);
    expect(saved(SAVE)![KEY]).toBeUndefined();

    const second = await launch();
    expect(second.getState().offline).toBeNull();
    expect(second.getState().game.cash).toBe(paid);
    await close(second);

    at(T0 + 3 * HOUR);
    const third = await launch();
    expect(third.getState().offline).toStrictEqual({ seconds: 3600, earnings: earnedIn(3600), report: undefined });
    expect(third.getState().game.cash).toBe(paid);
  });

  it('collected, but the app ends before that save reaches the disk: the report is back and is paid once, never twice', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    await close(first);

    // The same run, opened again from the background: Collect pays in memory, and the save is lost with the app.
    first.getState().resume();
    writes.lost = true;
    await first.getState().collectOffline(false);
    await settle();
    expect(first.getState().game.cash).toBe(mid.cash + report.earnings);
    writes.lost = false;

    // The disk still holds the save from before: the cash without the report's earnings, and the report.
    const second = await launch();
    expect(second.getState().offline).toStrictEqual({ seconds: 7200, earnings: report.earnings });
    expect(second.getState().game.cash).toBe(mid.cash);
    await second.getState().collectOffline(false);
    await settle();
    expect(second.getState().game.cash).toBe(mid.cash + report.earnings);
    expect((await launch()).getState().game.cash).toBe(mid.cash + report.earnings);
  });

  it('the device clock moved back between the two starts: the same report, and its time is not paid again when the clock returns', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    await close(first);

    // An hour before the save: nothing new was earned, and the report is neither lost nor grown.
    at(T0 + 1 * HOUR);
    const back = await launch();
    expect(back.getState().offline).toStrictEqual({ seconds: 7200, earnings: report.earnings });
    // The latest time the game ran at is remembered (the shared guard), so those hours stay counted.
    expect(back.getState().game.stats.clockHigh).toBe(T0 + 2 * HOUR);
    await close(back);

    // Still back, a little later: the same report again.
    at(T0 + 1 * HOUR + 10 * MINUTE);
    const still = await launch();
    expect(still.getState().offline).toStrictEqual({ seconds: 7200, earnings: report.earnings });
    await close(still);

    // The clock is right again, 30 minutes after the first start: only those 30 minutes are added.
    at(T0 + 2 * HOUR + 30 * MINUTE);
    const forward = await launch();
    const both = forward.getState().offline!;
    expect(both.seconds).toBe(7200 + 1800);
    expect(both.earnings).toBe(report.earnings + earnedIn(1800));
    await forward.getState().collectOffline(false);
    expect(forward.getState().game.cash).toBe(mid.cash + both.earnings);
  });

  it('the device clock moved back, the report collected there: the clock returning pays only the time after the first start', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    await close(first);

    at(T0 + 1 * HOUR);
    const back = await launch();
    await back.getState().collectOffline(false);
    expect(back.getState().game.cash).toBe(mid.cash + report.earnings);
    await close(back);

    at(T0 + 2 * HOUR + 30 * MINUTE);
    const forward = await launch();
    expect(forward.getState().offline).toStrictEqual({ seconds: 1800, earnings: earnedIn(1800), report: undefined });
    expect(forward.getState().game.cash).toBe(mid.cash + report.earnings);
  });

  it('a second absence added by resume() (the app stayed open on the report) is saved with it', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    await first.getState().pause();
    at(T0 + 3 * HOUR);
    first.getState().resume();
    const both = first.getState().offline!;
    expect(both).toStrictEqual({ seconds: 10800, earnings: report.earnings + earnedIn(3600) });
    await settle();

    // Closed with no further save: what resume() saved is the whole report.
    const second = await launch();
    expect(second.getState().offline).toStrictEqual(both);
    expect(second.getState().game.cash).toBe(mid.cash);
  });

  it('a short absence after the app was closed on the report is added to it, as resume() adds one to an open report', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    await close(first);

    // 30 s: on its own too short for a report (minSecondsToShow), but there is one waiting.
    at(T0 + 2 * HOUR + 30_000);
    const second = await launch();
    expect(second.getState().offline).toStrictEqual({ seconds: 7230, earnings: report.earnings + earnedIn(30) });
  });

  it('the x2 ad doubles a report that came back, and a declined ad pays it once', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    await close(first);
    const second = await launch();
    await second.getState().collectOffline(true);
    expect(second.getState().game.cash).toBe(mid.cash + report.earnings * 2);

    // The same again from the start, with the ad declined.
    disk.set(SAVE, JSON.stringify(mid));
    await close(await launch());
    adResult.ok = false;
    const declined = await launch();
    await declined.getState().collectOffline(true);
    expect(declined.getState().game.cash).toBe(mid.cash + report.earnings);
  });

  it('closed before the first save after the start: the absence is computed again from the old save, never added to itself', async () => {
    at(T0 + 2 * HOUR);
    await launch();
    // Nothing was saved: the disk still holds the old save, with no report.
    expect(saved(SAVE)).toStrictEqual(JSON.parse(JSON.stringify(mid)));
    at(T0 + 3 * HOUR);
    const second = await launch();
    expect(second.getState().offline).toStrictEqual({ seconds: 10800, earnings: earnedIn(10800), report: undefined });
  });

  it('with nothing to collect the save is the game alone, as before, and a loaded game never carries the report', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    await first.getState().save();
    expect(Object.keys(saved(SAVE)!)).toContain(KEY);
    expect(KEY in first.getState().game).toBe(false);
    // The save with the report is the same game, plus the one key.
    const { [KEY]: _report, ...game } = saved(SAVE)!;
    expect(game).toStrictEqual(JSON.parse(JSON.stringify(first.getState().game)));

    await first.getState().collectOffline(false);
    await first.getState().save();
    expect(disk.get(SAVE)).toBe(JSON.stringify(first.getState().game));
    const second = await launch();
    expect(KEY in second.getState().game).toBe(false);
  });

  it('a record the save cannot be trusted on is no record: the game starts and the absence is paid as usual', async () => {
    const broken: unknown[] = [7, 'soon', null, [], {}, { seconds: 7200 }, { seconds: 7200, earnings: -5 }, { seconds: '7200', earnings: 100 }, { seconds: 7200, earnings: null }, { seconds: -1, earnings: 100 }];
    for (const record of broken) {
      disk.set(SAVE, JSON.stringify({ ...mid, [KEY]: record }));
      at(T0 + 2 * HOUR);
      const app = await launch();
      expect(app.getState().offline, JSON.stringify(record)).toStrictEqual({ seconds: 7200, earnings: earnedIn(7200), report: undefined });
      expect(app.getState().game.cash).toBe(mid.cash);
    }
    // A record that earned nothing and has nothing to say is not shown again either.
    disk.set(SAVE, JSON.stringify({ ...mid, [KEY]: { seconds: 7200, earnings: 0 } }));
    at(T0);
    expect((await launch()).getState().offline).toBeNull();
    expect(crashes).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------- a mode with its own engine

/** The stand-in mode's report: its own shape, which the store never reads. */
interface Ledger {
  visits: number;
  seconds: number;
  sold: Record<string, number>;
  notes: string[];
  idle: boolean;
}

const RATE = 3;

/**
 * A stand-in for a mode with its own engine (as haul has), installed for the active game's config:
 * it earns RATE a second while away (nothing when `earns` is false: then its report speaks alone),
 * stamps the game it returns as the real ones do, and records what `mergeReport` is handed.
 */
function standIn(opts: { earns?: boolean; report?: (ledger: Ledger) => unknown } = {}) {
  const merges: [unknown, unknown][] = [];
  const earns = opts.earns ?? true;
  const engine: EngineMode = {
    id: cfg.mode,
    saveTag: 'standin1',
    create: (_cfg, base) => base,
    reconcile: (_cfg, base) => base,
    tick: (_cfg, state) => state,
    income: () => (earns ? RATE : 0),
    activeIncome: () => RATE,
    offline: (c, state, now) => {
      const elapsed = (now - Math.max(state.lastSavedAt, state.stats.clockHigh ?? 0)) / 1000;
      if (!(elapsed > 0)) return { seconds: 0, earnings: 0, game: state };
      const seconds = Math.min(elapsed, c.economy.offline.maxHours * 3600);
      const ledger: Ledger = { visits: 1, seconds, sold: { tea: seconds / 60, silk: seconds / 600 }, notes: [`${seconds} s away`], idle: !earns };
      const game = { ...state, lastSavedAt: now, stats: { ...state.stats, clockHigh: Math.max(state.stats.clockHigh ?? 0, now) } };
      return { seconds, earnings: earns ? seconds * RATE : 0, game, report: opts.report ? opts.report(ledger) : ledger };
    },
    prestige: (_cfg, state) => state,
    mergeReport: (older, newer) => {
      merges.push([older, newer]);
      const a = older as Ledger;
      const b = newer as Ledger;
      const sold = { ...a.sold };
      for (const [k, n] of Object.entries(b.sold)) sold[k] = (sold[k] ?? 0) + n;
      return { visits: a.visits + b.visits, seconds: a.seconds + b.seconds, sold, notes: [...a.notes, ...b.notes], idle: a.idle && b.idle } satisfies Ledger;
    },
    reportAlone: (report) => (report as Ledger | undefined)?.idle === true,
    offlineAdMultiplier: () => 1.5,
  };
  return { engine, merges };
}

describe('a mode with its own engine: its report is saved as it is and handed back as it was', () => {
  const SAVE = 'save:pizza-empire:standin1';
  const start = E.createInitialState(cfg, T0);
  const ledger = (seconds: number, idle = false): Ledger => ({ visits: 1, seconds, sold: { tea: seconds / 60, silk: seconds / 600 }, notes: [`${seconds} s away`], idle });

  beforeEach(() => {
    disk.set(SAVE, JSON.stringify(start));
  });

  it('the mode has its own save, and the store reaches its rules for this config', async () => {
    const { engine } = standIn();
    at(T0 + 2 * HOUR);
    const app = await launch(engine);
    expect(app.getState().offline).toStrictEqual({ seconds: 7200, earnings: 7200 * RATE, report: ledger(7200) });
    expect(disk.has('save:pizza-empire:v1')).toBe(false);
  });

  it('closed before collect, then started: the same earnings and the same report, which the store never reads', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch(standIn().engine);
    await close(first);
    expect(saved(SAVE)![KEY]).toStrictEqual({ seconds: 7200, earnings: 7200 * RATE, report: ledger(7200) });

    const { engine, merges } = standIn();
    const second = await launch(engine);
    expect(second.getState().offline).toStrictEqual({ seconds: 7200, earnings: 7200 * RATE, report: ledger(7200) });
    // No new absence: the rules were not asked to merge anything.
    expect(merges).toStrictEqual([]);
    expect(second.getState().game.cash).toBe(start.cash);
  });

  it('closed before collect, then a second absence: mergeReport gets the saved report and the new one, and the sum is paid once with the mode\'s ad share', async () => {
    at(T0 + 2 * HOUR);
    await close(await launch(standIn().engine));

    at(T0 + 3 * HOUR);
    const { engine, merges } = standIn();
    const second = await launch(engine);
    expect(merges).toStrictEqual([[ledger(7200), ledger(3600)]]);
    const both = second.getState().offline!;
    expect(both).toStrictEqual({
      seconds: 10800,
      earnings: 10800 * RATE,
      report: { visits: 2, seconds: 10800, sold: { tea: 180, silk: 18 }, notes: ['7200 s away', '3600 s away'], idle: false },
    });

    await second.getState().collectOffline(true);
    expect(second.getState().game.cash).toBe(start.cash + 10800 * RATE * 1.5);
    await settle();
    const third = await launch(standIn().engine);
    expect(third.getState().offline).toBeNull();
    expect(third.getState().game.cash).toBe(start.cash + 10800 * RATE * 1.5);
  });

  it('collected, then started: nothing is paid twice', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch(standIn().engine);
    await first.getState().collectOffline(false);
    await close(first);
    const second = await launch(standIn().engine);
    expect(second.getState().offline).toBeNull();
    expect(second.getState().game.cash).toBe(start.cash + 7200 * RATE);
  });

  it('the device clock moved back between the two starts: the report as it was, and the time is not paid again', async () => {
    at(T0 + 2 * HOUR);
    await close(await launch(standIn().engine));

    at(T0 + 1 * HOUR);
    const { engine, merges } = standIn();
    const back = await launch(engine);
    expect(back.getState().offline).toStrictEqual({ seconds: 7200, earnings: 7200 * RATE, report: ledger(7200) });
    expect(merges).toStrictEqual([]);
    await close(back);

    at(T0 + 2 * HOUR + 30 * MINUTE);
    const forward = await launch(standIn().engine);
    expect(forward.getState().offline).toMatchObject({ seconds: 9000, earnings: 9000 * RATE });
    await forward.getState().collectOffline(false);
    expect(forward.getState().game.cash).toBe(start.cash + 9000 * RATE);
  });

  it('a report that speaks alone (it earned nothing) comes back too, and collecting it ends it', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch(standIn({ earns: false }).engine);
    expect(first.getState().offline).toStrictEqual({ seconds: 7200, earnings: 0, report: ledger(7200, true) });
    await close(first);

    const second = await launch(standIn({ earns: false }).engine);
    expect(second.getState().offline).toStrictEqual({ seconds: 7200, earnings: 0, report: ledger(7200, true) });
    await second.getState().collectOffline(false);
    expect(second.getState().game.cash).toBe(start.cash);
    await settle();
    expect((await launch(standIn({ earns: false }).engine)).getState().offline).toBeNull();
  });

  it('a report of any plain shape comes back as written (a list, a text, null)', async () => {
    for (const shape of [['a', 1, { b: null }], 'two hours of tea', null] as unknown[]) {
      disk.set(SAVE, JSON.stringify(start));
      at(T0 + 2 * HOUR);
      await close(await launch(standIn({ report: () => shape }).engine));
      const second = await launch(standIn({ report: () => shape }).engine);
      expect(second.getState().offline, JSON.stringify(shape)).toStrictEqual({ seconds: 7200, earnings: 7200 * RATE, report: shape });
    }
  });

  it('a report that cannot be written (not plain data) is left out: the game is saved, and what the absence earned with it', async () => {
    at(T0 + 2 * HOUR);
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    const first = await launch(standIn({ report: () => loop }).engine);
    expect(first.getState().offline!.earnings).toBe(7200 * RATE);
    at(T0 + 2 * HOUR + 5000);
    await first.getState().save();
    expect(saved(SAVE)!.lastSavedAt).toBe(T0 + 2 * HOUR + 5000);
    expect(saved(SAVE)![KEY]).toStrictEqual({ seconds: 7200, earnings: 7200 * RATE });
    // The failure is reported, and nothing else went wrong.
    expect(crashes).toStrictEqual(['save.offline']);

    const second = await launch(standIn().engine);
    expect(second.getState().offline).toStrictEqual({ seconds: 7200, earnings: 7200 * RATE });
    await second.getState().collectOffline(false);
    expect(second.getState().game.cash).toBe(start.cash + 7200 * RATE);
  });
});

// ---------------------------------------------------------------- any order of events

/** The books of one copy of the game (on the disk, or in a running app): what is in the purse, what waits, and up to when time away is counted. */
interface Books {
  last: number;
  paid: number;
  waiting: { seconds: number; earnings: number } | null;
}

/** A small seeded generator (mulberry32), so a failing run can be replayed by its seed. */
function dice(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { chance: (p: number) => next() < p, pick: <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)] };
}

describe('any order of starting, leaving, returning, collecting and closing: time away is paid once, and never lost', () => {
  const SAVE = 'save:pizza-empire:standin1';
  const start = E.createInitialState(cfg, T0);
  const CAP = cfg.economy.offline.maxHours * 3600;
  const SHOW = cfg.economy.offline.minSecondsToShow;
  /** Seconds away: too short for a report, short, long, and past the cap. */
  const GAPS = [3, 20, 45, 90, 600, 3600, 3 * 3600, 7 * 3600];

  /**
   * What the store promises, as plainly as it can be written. A copy of the books is on the disk
   * and one in the running app; a save copies the app's onto the disk; a start copies the disk's
   * into the app. Time away is added to the report that waits (or starts one, when it is long
   * enough to show); Collect moves the report into the purse. Nothing else moves coins.
   */
  function model() {
    let disk: Books = { last: T0, paid: 0, waiting: null };
    let app: Books | null = null;
    const away = (now: number, onStart: boolean) => {
      const b = app!;
      const seconds = Math.min((now - b.last) / 1000, CAP);
      const earnings = seconds * RATE;
      if (earnings > 0) {
        if (b.waiting) b.waiting = { seconds: b.waiting.seconds + seconds, earnings: b.waiting.earnings + earnings };
        else if (seconds >= SHOW) b.waiting = { seconds, earnings };
        // Too short for a report: a return from the background is paid at once, a start earns nothing (as before).
        else if (!onStart) b.paid += earnings;
      }
      b.last = now;
    };
    return {
      get app() {
        return app!;
      },
      get disk() {
        return disk;
      },
      boot(now: number) {
        app = { ...disk, waiting: disk.waiting && { ...disk.waiting } };
        away(now, true);
      },
      resume: (now: number) => away(now, false),
      save(now: number, lost: boolean) {
        app!.last = now;
        if (!lost) disk = { ...app!, waiting: app!.waiting && { ...app!.waiting } };
      },
      collect(share: number) {
        app!.paid += app!.waiting!.earnings * share;
        app!.waiting = null;
      },
      kill() {
        app = null;
      },
    };
  }

  it('120 random runs of the app against the plain model', async () => {
    for (let seed = 1; seed <= 120; seed++) {
      const d = dice(seed);
      const m = model();
      const steps: string[] = [];
      disk.clear();
      disk.set(SAVE, JSON.stringify(start));
      let now = T0;
      let app: Store | null = null;
      let background = false;
      const step = (name: string) => void steps.push(`${name}@${(now - T0) / 1000}`);
      /** The running app and the disk hold what the model says, to the coin. */
      const check = () => {
        const where = `seed ${seed}: ${steps.join(' ')}`;
        if (app) {
          const s = app.getState();
          expect(s.game.cash, where).toBeCloseTo(start.cash + m.app.paid, 6);
          expect(s.offline ? { seconds: s.offline.seconds, earnings: s.offline.earnings } : null, where).toStrictEqual(m.app.waiting);
        }
        const onDisk = saved(SAVE)!;
        expect(onDisk.cash, where).toBeCloseTo(start.cash + m.disk.paid, 6);
        const record = onDisk[KEY] as { seconds: number; earnings: number } | undefined;
        expect(record ? { seconds: record.seconds, earnings: record.earnings } : null, where).toStrictEqual(m.disk.waiting);
      };
      /** Runs something that ends with the store saving; `lost`: that write never reaches the disk (the app ended first). */
      const saving = async (lost: boolean, act: () => unknown) => {
        writes.lost = lost;
        await act();
        await settle();
        writes.lost = false;
        m.save(now, lost);
      };

      for (let i = 0; i < 14; i++) {
        if (!app) {
          now += d.pick(GAPS) * 1000;
          at(now);
          step('start');
          app = await launch(standIn().engine);
          background = false;
          m.boot(now);
        } else if (background) {
          if (d.chance(0.35)) {
            step('closed');
            app = null;
            m.kill();
          } else {
            now += d.pick(GAPS) * 1000;
            at(now);
            step('return');
            // resume() saves; that write is sometimes lost with the app.
            m.resume(now);
            await saving(d.chance(0.15), () => app!.getState().resume());
            background = false;
          }
        } else {
          const what = d.pick(['wait', 'leave', 'leave', 'collect', 'collect', 'crash'] as const);
          if (what === 'wait') {
            now += 5000;
            at(now);
            step('autosave');
            await saving(false, () => app!.getState().save());
          } else if (what === 'leave') {
            now += d.pick([1000, 4000, 9000]);
            at(now);
            step('leave');
            await saving(d.chance(0.1), () => app!.getState().pause());
            background = true;
          } else if (what === 'collect' && app.getState().offline) {
            const withAd = d.chance(0.5);
            adResult.ok = d.chance(0.7);
            step(withAd ? (adResult.ok ? 'collect+ad' : 'collect(ad declined)') : 'collect');
            m.collect(withAd && adResult.ok ? 1.5 : 1);
            await saving(d.chance(0.2), () => app!.getState().collectOffline(withAd));
          } else if (what === 'crash') {
            step('crash');
            app = null;
            m.kill();
          }
        }
        check();
      }

      // At the end, whatever happened: one more start and Collect leave the purse with what the model paid.
      if (!app) {
        now += 1000;
        at(now);
        step('last start');
        app = await launch(standIn().engine);
        m.boot(now);
      } else if (background) {
        m.resume(now);
        await saving(false, () => app!.getState().resume());
      }
      if (app.getState().offline) {
        m.collect(1);
        await saving(false, () => app!.getState().collectOffline(false));
      }
      check();
      expect(app.getState().offline).toBeNull();
    }
  }, 120_000);
});
