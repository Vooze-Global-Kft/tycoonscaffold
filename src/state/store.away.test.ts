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
 *
 * Two more rules of the same accounting are pinned here (each was a leak before). A start too
 * soon after the save for a report pays a mode with its own engine at once what the absence
 * earned, as a return from the background does (its engine has moved the run through those
 * seconds; under the built-in rules nothing moved, and the absence does not count). And a save
 * while the app is in the background keeps the moment the app left (the save's `lastSavedAt`): the
 * autosave timer, or a rewarded ad's result that arrives before the app is back on screen, no
 * longer swallows the seconds before it, on the return or at the next start.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { buildPreset } from '../dev/presets.web';
import * as E from '../engine/economy';
import type { EngineMode } from '../engine/mode';
import type { GameState } from '../engine/types';

/** What survives the app being closed: the device's storage. `lost`: writes that never reach it (the app ended first); `refused`: the device refuses them. */
const disk = vi.hoisted(() => new Map<string, string>());
const writes = vi.hoisted(() => ({ lost: false, refused: false }));
/** The rewarded ad: `ok` is whether it is watched to the end; `open`, when set, is an ad still on screen (it ends when the promise does). */
const adResult = vi.hoisted(() => ({ ok: true, open: null as Promise<boolean> | null }));
const crashes = vi.hoisted(() => [] as string[]);
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => disk.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      if (writes.refused) throw new Error('the device refused the write');
      if (!writes.lost) disk.set(k, v);
    },
    removeItem: async (k: string) => void disk.delete(k),
  },
}));
vi.mock('../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'pizza-empire', rawGame: (await import('../../games/pizza-empire/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../services/ads', () => ({ ads: { showRewarded: () => adResult.open ?? Promise.resolve(adResult.ok), maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
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

/** Pizza Empire's save (sim: the built-in rules), and a mid game that earns while away, last saved at T0. */
const PIZZA = 'save:pizza-empire:v1';
const mid = ((g) => ({ ...g, lastSavedAt: T0, stats: { ...g.stats, clockHigh: T0 } }))(buildPreset(cfg, 'mid', T0));
/** What `seconds` away earn that game (the engine's own figure; the income does not change while away). */
const earnedIn = (seconds: number) => E.computeOffline(cfg, mid, mid.lastSavedAt + seconds * 1000).earnings;

beforeEach(() => {
  disk.clear();
  writes.lost = false;
  writes.refused = false;
  crashes.length = 0;
  adResult.ok = true;
  adResult.open = null;
  vi.useFakeTimers({ now: T0, toFake: ['Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Pizza Empire: an away report that was not collected survives the app being closed', () => {
  const SAVE = PIZZA;

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
    // resume() saved it at once: the save counts the hour, and holds the whole report.
    expect(saved(SAVE)!.lastSavedAt).toBe(T0 + 3 * HOUR);
    expect(saved(SAVE)![KEY]).toStrictEqual(both);

    // Closed with no further save.
    const second = await launch();
    expect(second.getState().offline).toStrictEqual(both);
    expect(second.getState().game.cash).toBe(mid.cash);
  });

  it('a return from the background while the ad is open: its absence is added, and the whole is paid once (the ad doubles what it was offered for)', async () => {
    at(T0 + 2 * HOUR);
    await close(await launch());
    const app = await launch();
    const report = app.getState().offline!;
    let endAd: (watched: boolean) => void = () => {};
    adResult.open = new Promise<boolean>((r) => (endAd = r));
    const collecting = app.getState().collectOffline(true);
    // The ad covers the app (on Android it goes to the background for it), and the player is away ten minutes.
    await app.getState().pause();
    expect(saved(SAVE)![KEY]).toStrictEqual(report);
    at(T0 + 2 * HOUR + 10 * MINUTE);
    app.getState().resume();
    const grown = app.getState().offline!;
    expect(grown).toStrictEqual({ seconds: 7200 + 600, earnings: report.earnings + earnedIn(600) });
    endAd(true);
    await collecting;
    expect(app.getState().game.cash).toBe(mid.cash + (report.earnings * 2 + (grown.earnings - report.earnings)));
    expect(app.getState().offline).toBeNull();
    await settle();
    expect(saved(SAVE)![KEY]).toBeUndefined();
    expect((await launch()).getState().offline).toBeNull();
  });

  it('closed while the ad is open: the report is back, not paid, and can be collected', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const report = first.getState().offline!;
    adResult.open = new Promise<boolean>(() => {});
    void first.getState().collectOffline(true);
    await close(first);
    adResult.open = null;

    const second = await launch();
    expect(second.getState().offline).toStrictEqual({ seconds: 7200, earnings: report.earnings });
    expect(second.getState().game.cash).toBe(mid.cash);
    await second.getState().collectOffline(false);
    expect(second.getState().game.cash).toBe(mid.cash + report.earnings);
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

    // A game loaded from that save does not carry the key either (the engine keeps only what it knows).
    const second = await launch();
    expect(second.getState().offline).not.toBeNull();
    expect(KEY in second.getState().game).toBe(false);

    await second.getState().collectOffline(false);
    await second.getState().save();
    expect(disk.get(SAVE)).toBe(JSON.stringify(second.getState().game));
  });

  it('a report too large for a save to hold (Infinity) is saved as the most the purse takes, not dropped', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    first.setState({ offline: { seconds: 7200, earnings: Infinity } });
    await close(first);
    expect(saved(SAVE)![KEY]).toStrictEqual({ seconds: 7200, earnings: Number.MAX_VALUE });

    const second = await launch();
    expect(second.getState().offline).toStrictEqual({ seconds: 7200, earnings: Number.MAX_VALUE });
    await second.getState().collectOffline(false);
    expect(second.getState().game.cash).toBe(E.MAX_CASH);
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
    // Text a save can hold and a game cannot: 1e999 reads as Infinity.
    for (const field of ['seconds', 'earnings']) {
      disk.set(SAVE, JSON.stringify({ ...mid, [KEY]: { seconds: 7200, earnings: 100, [field]: 'HUGE' } }).replace('"HUGE"', '1e999'));
      expect(JSON.parse(disk.get(SAVE)!)[KEY][field]).toBe(Infinity);
      at(T0 + 2 * HOUR);
      const app = await launch();
      expect(app.getState().offline, field).toStrictEqual({ seconds: 7200, earnings: earnedIn(7200), report: undefined });
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

/** The stand-in mode's save (its own tag), its game at the start, last saved at T0, and the report it writes for `seconds` away. */
const MODE = 'save:pizza-empire:standin1';
const start = E.createInitialState(cfg, T0);
const ledger = (seconds: number, idle = false): Ledger => ({ visits: 1, seconds, sold: { tea: seconds / 60, silk: seconds / 600 }, notes: [`${seconds} s away`], idle });

/**
 * A stand-in for a mode with its own engine (as haul has), installed for the active game's config:
 * it earns RATE a second while away (nothing when `earns` is false: then its report speaks alone,
 * unless `alone` says otherwise), moves the run through the absence in the game it returns (the
 * seconds it worked are counted in `stats.served`) and stamps that game as the real ones do, and
 * records what `mergeReport` is handed. `ticks`: it also earns RATE a second while played, so
 * every second since the save is worth the same. `advances: false`: it returns no advanced game,
 * which is the store's path for the built-in rules (sim and classic).
 */
function standIn(opts: { earns?: boolean; alone?: boolean; report?: (ledger: Ledger) => unknown; ticks?: boolean; advances?: boolean } = {}) {
  const merges: [unknown, unknown][] = [];
  const earns = opts.earns ?? true;
  const alone = opts.alone ?? !earns;
  const engine: EngineMode = {
    id: cfg.mode,
    saveTag: 'standin1',
    create: (_cfg, base) => base,
    reconcile: (_cfg, base) => base,
    tick: (_cfg, state, dt) => (opts.ticks ? { ...state, cash: state.cash + dt * RATE } : state),
    income: () => (earns ? RATE : 0),
    activeIncome: () => RATE,
    offline: (c, state, now) => {
      const elapsed = (now - Math.max(state.lastSavedAt, state.stats.clockHigh ?? 0)) / 1000;
      if (!(elapsed > 0)) return { seconds: 0, earnings: 0, game: state };
      const seconds = Math.min(elapsed, c.economy.offline.maxHours * 3600);
      const written = ledger(seconds, alone);
      const game = { ...state, lastSavedAt: now, stats: { ...state.stats, served: state.stats.served + seconds, clockHigh: Math.max(state.stats.clockHigh ?? 0, now) } };
      const away = { seconds, earnings: earns ? seconds * RATE : 0, report: opts.report ? opts.report(written) : written };
      return opts.advances === false ? (away as typeof away & { game: GameState }) : { ...away, game };
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
  const SAVE = MODE;

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

  it('a second absence added by resume() goes through mergeReport the same way: the report on screen first, the new one second', async () => {
    at(T0 + 2 * HOUR);
    const { engine, merges } = standIn();
    const app = await launch(engine);
    await app.getState().pause();
    at(T0 + 3 * HOUR);
    app.getState().resume();
    expect(merges).toStrictEqual([[ledger(7200), ledger(3600)]]);
    const both = { seconds: 10800, earnings: 10800 * RATE, report: { visits: 2, seconds: 10800, sold: { tea: 180, silk: 18 }, notes: ['7200 s away', '3600 s away'], idle: false } };
    expect(app.getState().offline).toStrictEqual(both);
    await settle();
    expect(saved(SAVE)![KEY]).toStrictEqual(both);
  });

  it('an absence that earned nothing is added to a waiting report only when its own report speaks alone', async () => {
    at(T0 + 2 * HOUR);
    await close(await launch(standIn().engine));

    // Two hours that earned nothing and say nothing: the waiting report is as it was.
    at(T0 + 4 * HOUR);
    const silent = standIn({ earns: false, alone: false });
    const second = await launch(silent.engine);
    expect(second.getState().offline).toStrictEqual({ seconds: 7200, earnings: 7200 * RATE, report: ledger(7200) });
    expect(silent.merges).toStrictEqual([]);
    await close(second);

    // Two more that earned nothing and have something to say: their time and their words are added.
    at(T0 + 6 * HOUR);
    const speaking = standIn({ earns: false });
    const third = await launch(speaking.engine);
    expect(speaking.merges).toStrictEqual([[ledger(7200), ledger(7200, true)]]);
    expect(third.getState().offline).toStrictEqual({
      seconds: 14400,
      earnings: 7200 * RATE,
      report: { visits: 2, seconds: 14400, sold: { tea: 240, silk: 24 }, notes: ['7200 s away', '7200 s away'], idle: false },
    });
    await third.getState().collectOffline(false);
    expect(third.getState().game.cash).toBe(start.cash + 7200 * RATE);
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

// ---------------------------------------------------------------- a start too soon for a report

describe('a start too soon after the save for a report: a mode whose engine moved the run on is paid at once', () => {
  /** Seconds away: fewer than economy.offline.minSecondsToShow, so no report is shown for them. */
  const SHORT = 45;

  beforeEach(() => {
    disk.set(MODE, JSON.stringify(start));
  });

  it('the engine moved the run through the absence, so what that earned is paid at once, as a return from the background pays it', async () => {
    expect(SHORT).toBeLessThan(cfg.economy.offline.minSecondsToShow);
    at(T0 + SHORT * 1000);
    const started = await launch(standIn().engine);
    // No report: the absence is too short to show one. The run has moved on by those seconds,
    // and what they earned came with it (before, the run moved on and the earnings were dropped).
    expect(started.getState().offline).toBeNull();
    expect(started.getState().game.stats.served - start.stats.served).toBe(SHORT);
    expect(started.getState().game.cash).toBe(start.cash + SHORT * RATE);
    expect(started.getState().game.runEarnings).toBe(start.runEarnings + SHORT * RATE);
    expect(started.getState().game.lifetimeEarnings).toBe(start.lifetimeEarnings + SHORT * RATE);

    // The same seconds with the app in the background instead of closed: resume() pays the same.
    disk.set(MODE, JSON.stringify(start));
    at(T0);
    const returned = await launch(standIn().engine);
    await returned.getState().pause();
    at(T0 + SHORT * 1000);
    returned.getState().resume();
    expect(returned.getState().offline).toBeNull();
    expect(returned.getState().game.stats.served).toBe(started.getState().game.stats.served);
    expect(returned.getState().game.cash).toBe(started.getState().game.cash);
  });

  it('closed again before anything was saved: the next start pays the whole time since the save, once', async () => {
    at(T0 + 45_000);
    const first = await launch(standIn().engine);
    expect(first.getState().game.cash).toBe(start.cash + 45 * RATE);
    // A start saves nothing by itself: the disk still holds the save of T0, so nothing is counted yet.
    expect(saved(MODE)).toStrictEqual(JSON.parse(JSON.stringify(start)));

    at(T0 + 50_000);
    const second = await launch(standIn().engine);
    expect(second.getState().game.cash).toBe(start.cash + 50 * RATE);
    // Saved now: the 50 s are counted, and what they earned is in the same save.
    await second.getState().save();
    expect(saved(MODE)).toMatchObject({ cash: start.cash + 50 * RATE, lastSavedAt: T0 + 50_000 });

    at(T0 + 58_000);
    const third = await launch(standIn().engine);
    expect(third.getState().game.cash).toBe(start.cash + 58 * RATE);
    expect(third.getState().offline).toBeNull();
  });

  it('a report waits to be collected: the short absence joins it, and is paid with it, once', async () => {
    at(T0 + 2 * HOUR);
    await close(await launch(standIn().engine));

    at(T0 + 2 * HOUR + SHORT * 1000);
    const { engine, merges } = standIn();
    const app = await launch(engine);
    expect(merges).toStrictEqual([[ledger(7200), ledger(SHORT)]]);
    expect(app.getState().offline).toMatchObject({ seconds: 7200 + SHORT, earnings: (7200 + SHORT) * RATE });
    // In the report, so not also paid at once.
    expect(app.getState().game.cash).toBe(start.cash);
    await app.getState().collectOffline(false);
    expect(app.getState().game.cash).toBe(start.cash + (7200 + SHORT) * RATE);
  });

  it('an absence that earned nothing pays nothing, and is too short for its report to be shown (as before)', async () => {
    at(T0 + SHORT * 1000);
    // This mode's report speaks alone (reportAlone) when it earned nothing: after a minute it would be shown.
    const app = await launch(standIn({ earns: false }).engine);
    expect(app.getState().offline).toBeNull();
    expect(app.getState().game.cash).toBe(start.cash);
  });

  it('the built-in rules return no advanced game, and the absence does not count, as before: Pizza Empire starts where it was saved', async () => {
    disk.set(PIZZA, JSON.stringify(mid));
    // By the rules the absence was worth something; a start does not pay it, and moves nothing.
    expect(earnedIn(SHORT)).toBeGreaterThan(0);
    at(T0 + SHORT * 1000);
    const pizzaApp = await launch();
    const { game, offline } = pizzaApp.getState();
    expect(offline).toBeNull();
    expect(game.cash).toBe(mid.cash);
    expect(game.lifetimeEarnings).toBe(mid.lifetimeEarnings);
    expect(game.venues).toStrictEqual(mid.venues);
    expect(game.stats.playSeconds).toBe(mid.stats.playSeconds);

    // The store's path for those rules, with a stand-in that returns no advanced game: the same.
    const plain = await launch(standIn({ advances: false }).engine);
    expect(plain.getState().offline).toBeNull();
    expect(plain.getState().game.cash).toBe(start.cash);
    expect(plain.getState().game.stats.served).toBe(start.stats.served);
  });
});

// ---------------------------------------------------------------- a save in the background

describe('a save while the app is in the background keeps the moment the app left: the seconds before it are still paid', () => {
  /**
   * Pizza Empire leaves the screen at T0 and is back 30.1 s later. `saves`: the seconds after
   * leaving at which something saves in the background. Every such save holds the moment the app
   * left, in memory and on the disk.
   */
  const trip = async (saves: number[]) => {
    disk.set(PIZZA, JSON.stringify(mid));
    at(T0);
    const app = await launch();
    await app.getState().pause();
    for (const second of saves) {
      at(T0 + second * 1000);
      await app.getState().save();
      expect(app.getState().game.lastSavedAt).toBe(T0);
      expect(saved(PIZZA)!.lastSavedAt).toBe(T0);
    }
    at(T0 + 30_100);
    app.getState().resume();
    return app.getState().game;
  };

  /** A rewarded ad that stays open until `end` is called (it covers the app, which on Android goes to the background for it). */
  const openAd = () => {
    let end: (watched: boolean) => void = () => {};
    adResult.open = new Promise<boolean>((r) => (end = r));
    return (watched: boolean) => end(watched);
  };

  it('Pizza Empire: the autosave timer runs on in the background, or one save lands just before the return: the same game as without them', async () => {
    const plain = await trip([]);
    // A trip this short is played at full speed on the return (resume(), as before): 30.1 s of the kitchens.
    expect(plain.stats.playSeconds - mid.stats.playSeconds).toBeCloseTo(30.1, 9);
    expect(plain.cash).toBeGreaterThan(mid.cash);
    // App.tsx saves every 5 s for as long as the loop runs, and on Android it can run on in the background.
    expect(await trip([5, 10, 15, 20, 25, 30])).toStrictEqual(plain);
    // One save 0.1 s before the return: before, the return then played those 0.1 s only.
    expect(await trip([30])).toStrictEqual(plain);
  });

  it('Pizza Empire: closed in the background after such a save: the next start counts from the moment the app left', async () => {
    disk.set(PIZZA, JSON.stringify(mid));
    at(T0);
    const first = await launch();
    await first.getState().pause();
    at(T0 + 30_000);
    await first.getState().save();
    expect(saved(PIZZA)!.lastSavedAt).toBe(T0);

    at(T0 + 10 * MINUTE);
    const second = await launch();
    expect(second.getState().offline).toStrictEqual({ seconds: 600, earnings: earnedIn(600), report: undefined });
    expect(second.getState().game.cash).toBe(mid.cash);
  });

  it('Pizza Empire: back after two hours, and the timers restart before the app is told it is on screen: the overdue autosave runs first, and the report still holds the two hours', async () => {
    disk.set(PIZZA, JSON.stringify(mid));
    at(T0);
    const app = await launch();
    await app.getState().pause();

    // The loop's timers fire again (on iOS they restart when the app enters the foreground, before
    // it is reported active): a tick, which plays nothing while paused, and the autosave.
    at(T0 + 2 * HOUR);
    app.getState().tick(1);
    await app.getState().save();
    expect(app.getState().game.cash).toBe(mid.cash);
    expect(saved(PIZZA)!.lastSavedAt).toBe(T0);

    // Then the return is announced. Before, that save had just said "counted up to now": no report, and two hours gone.
    app.getState().resume();
    expect(app.getState().offline).toStrictEqual({ seconds: 7200, earnings: earnedIn(7200), report: undefined });
    expect(app.getState().game.cash).toBe(mid.cash);
  });

  /** The rewarded ads whose reward the store grants and saves the moment the ad ends, each on a game that offers it. */
  const ADS: { name: string; game: GameState; watch: (app: Store) => Promise<void>; granted: (app: Store, now: number) => boolean }[] = [
    { name: 'the boost', game: mid, watch: (app) => app.getState().watchBoostAd(), granted: (app, now) => app.getState().game.boostUntil > now },
    {
      name: 'the rush made ready again',
      game: { ...mid, rush: { until: T0 - MINUTE, readyAt: T0 + 4 * MINUTE } },
      watch: (app) => app.getState().adResetRush(),
      granted: (app, now) => app.getState().game.rush.readyAt <= now,
    },
    { name: 'the ad chest', game: mid, watch: (app) => app.getState().watchAdChest(), granted: (app) => app.getState().chestOpening !== null },
  ];

  it.each(ADS)("Pizza Empire, $name: the ad's result arrives before the app is back on screen: granted and saved there, and the ad's seconds are still played on the return", async ({ game, watch, granted }) => {
    disk.set(PIZZA, JSON.stringify(game));
    at(T0);
    const app = await launch();
    // Offered, and not granted yet.
    expect(granted(app, T0)).toBe(false);
    const endAd = openAd();
    const watching = watch(app);
    await app.getState().pause();
    const played = app.getState().game.stats.playSeconds;

    at(T0 + 30_000);
    endAd(true);
    await watching;
    await settle();
    expect(granted(app, T0 + 30_000)).toBe(true);
    // The save the reward made still says the app left at T0.
    expect(app.getState().game.lastSavedAt).toBe(T0);
    expect(saved(PIZZA)!.lastSavedAt).toBe(T0);

    // 0.1 s later the app is back on screen, and the whole 30.1 s are played.
    at(T0 + 30_100);
    app.getState().resume();
    expect(app.getState().game.stats.playSeconds - played).toBeCloseTo(30.1, 9);
  });

  it("Pizza Empire, the report's x2: the ad ends before the app is back on screen: the report is paid there, and the ad's seconds are still played on the return", async () => {
    disk.set(PIZZA, JSON.stringify(mid));
    const left = T0 + 2 * HOUR;
    at(left);
    const app = await launch();
    const report = app.getState().offline!;
    const endAd = openAd();
    const collecting = app.getState().collectOffline(true);
    await app.getState().pause();

    at(left + 30_000);
    endAd(true);
    await collecting;
    await settle();
    expect(app.getState().offline).toBeNull();
    expect(app.getState().game.cash).toBe(mid.cash + report.earnings * 2);
    // The save made there holds the cash and no report, and still says the app left at `left`.
    expect(saved(PIZZA)).toMatchObject({ cash: mid.cash + report.earnings * 2, lastSavedAt: left });
    expect(saved(PIZZA)![KEY]).toBeUndefined();

    const played = app.getState().game.stats.playSeconds;
    at(left + 30_100);
    app.getState().resume();
    expect(app.getState().game.stats.playSeconds - played).toBeCloseTo(30.1, 9);
    expect(app.getState().offline).toBeNull();
  });

  it('Pizza Empire: the device clock moved back while the app was in the background, and a save there: it keeps the later moment, and no time is paid twice when the clock returns', async () => {
    disk.set(PIZZA, JSON.stringify(mid));
    const left = T0 + 2 * HOUR;
    at(left);
    const first = await launch();
    const report = first.getState().offline!;
    await first.getState().collectOffline(false);
    const paid = mid.cash + report.earnings;
    await first.getState().pause();

    // The clock is set back an hour, and something saves 30 s after the app left.
    at(left - HOUR + 30_000);
    await first.getState().save();
    expect(saved(PIZZA)!.lastSavedAt).toBe(left);

    // Closed, and started ten minutes after leaving with the clock still back: no time before the save's is paid.
    at(left - HOUR + 10 * MINUTE);
    const back = await launch();
    expect(back.getState().offline).toBeNull();
    expect(back.getState().game.cash).toBe(paid);
    expect(back.getState().game.stats.clockHigh).toBe(left);
    await close(back);

    // The clock is right again, 30 minutes after the app left: those 30 minutes, once.
    at(left + 30 * MINUTE);
    const forward = await launch();
    expect(forward.getState().offline).toStrictEqual({ seconds: 1800, earnings: earnedIn(1800), report: undefined });
    expect(forward.getState().game.cash).toBe(paid);
  });

  it('a mode with its own engine: saves in the background, then the return: its rules are asked for the whole time since the app left', async () => {
    disk.set(MODE, JSON.stringify(start));
    at(T0);
    const app = await launch(standIn().engine);
    await app.getState().pause();
    for (const second of [5, 10, 15, 20, 25, 30]) {
      at(T0 + second * 1000);
      await app.getState().save();
      expect(app.getState().game.lastSavedAt).toBe(T0);
      expect(saved(MODE)!.lastSavedAt).toBe(T0);
    }
    at(T0 + 30_100);
    app.getState().resume();
    // 30.1 s, paid at once (too short for a report). Before: the 0.1 s after the last save.
    expect(app.getState().game.stats.served - start.stats.served).toBeCloseTo(30.1, 9);
    expect(app.getState().game.cash).toBeCloseTo(start.cash + 30.1 * RATE, 9);
    expect(app.getState().offline).toBeNull();
  });

  it('a mode with its own engine: a long absence with a save in its first minute: one report for all of it', async () => {
    disk.set(MODE, JSON.stringify(start));
    at(T0);
    const app = await launch(standIn().engine);
    await app.getState().pause();
    at(T0 + 30_000);
    await app.getState().save();
    at(T0 + HOUR);
    app.getState().resume();
    expect(app.getState().offline).toStrictEqual({ seconds: 3600, earnings: 3600 * RATE, report: ledger(3600) });
    expect(app.getState().game.cash).toBe(start.cash);
  });

  it('a report waits, and the app is closed in the background after such a save: the save is the one made on leaving, and the next start adds the whole time since', async () => {
    disk.set(MODE, JSON.stringify(start));
    const left = T0 + 2 * HOUR;
    at(left);
    const first = await launch(standIn().engine);
    const report = first.getState().offline!;
    await first.getState().pause();
    const onLeaving = disk.get(MODE);
    expect(saved(MODE)![KEY]).toStrictEqual(report);

    at(left + 30_000);
    await first.getState().save();
    // To the letter: the game, the report that waits, and the moment the app left.
    expect(disk.get(MODE)).toBe(onLeaving);
    expect(saved(MODE)!.lastSavedAt).toBe(left);

    at(left + HOUR);
    const { engine, merges } = standIn();
    const second = await launch(engine);
    expect(merges).toStrictEqual([[ledger(7200), ledger(3600)]]);
    expect(second.getState().offline).toMatchObject({ seconds: 10800, earnings: 10800 * RATE });
    expect(second.getState().game.cash).toBe(start.cash);
  });
});

// ---------------------------------------------------------------- any order of events

/**
 * The books of one copy of the game (on the disk, or in a running app): the purse, the part of it
 * that an ad added, what waits, the seconds that count for nothing by rule, and the moment up to
 * which every second is in one of them.
 */
interface Books {
  last: number;
  paid: number;
  bonus: number;
  waiting: { seconds: number; earnings: number } | null;
  dropped: number;
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

describe('any order of starting, playing, leaving, returning, collecting and closing: every second is paid once, and none is lost', () => {
  const SAVE = MODE;
  const CAP = cfg.economy.offline.maxHours * 3600;
  const SHOW = cfg.economy.offline.minSecondsToShow;
  /** Seconds away: too short for a report, short, long, and past the cap. */
  const GAPS = [3, 20, 45, 90, 600, 3600, 3 * 3600, 7 * 3600];
  /** Seconds in the background before something happens there: a save, or the end of an ad. */
  const WAITS = [1, 5, 30, 120];

  /**
   * What the store promises, as plainly as it can be written. One copy of the books is on the disk
   * and one in the running app; a save copies the app's onto the disk; a start copies the disk's
   * into the app. A second played goes into the purse. Time away is added to the report that waits
   * (or starts one, when it is long enough to show); Collect moves the report into the purse.
   * In the background nothing is played and the books stand at the moment the app left: a save
   * there writes them as they stand, so the whole time away is still counted, on the return or at
   * the next start.
   * The game here earns the same every second, played or away, so the books always add up to the
   * time since the save began, less what counts for nothing by rule: the part of an absence past
   * the cap and, under the built-in rules only (`advances` false), an absence too short for a
   * report at a start. A mode's engine has moved its run through such an absence, so it is paid at
   * once there too, as it is on a return from the background.
   */
  function model(advances: boolean) {
    let disk: Books = { last: T0, paid: 0, bonus: 0, waiting: null, dropped: 0 };
    let app: Books | null = null;
    const copy = (b: Books): Books => ({ ...b, waiting: b.waiting && { ...b.waiting } });
    const away = (now: number, onStart: boolean) => {
      const b = app!;
      const elapsed = (now - b.last) / 1000;
      const seconds = Math.min(elapsed, CAP);
      const earnings = seconds * RATE;
      b.dropped += elapsed - seconds;
      if (earnings > 0) {
        if (b.waiting) b.waiting = { seconds: b.waiting.seconds + seconds, earnings: b.waiting.earnings + earnings };
        else if (seconds >= SHOW) b.waiting = { seconds, earnings };
        // Too short for a report. At a start under the built-in rules it counts for nothing (the
        // game did not move). Everywhere else it is paid at once: a return from the background,
        // and a start of a mode whose engine has moved the run through it.
        else if (onStart && !advances) b.dropped += seconds;
        else b.paid += earnings;
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
        app = copy(disk);
        away(now, true);
      },
      resume: (now: number) => away(now, false),
      play(now: number, seconds: number) {
        app!.paid += seconds * RATE;
        app!.last = now;
      },
      /** A save: the app's books onto the disk, when the write lands. On screen they are up to now; in the background they stand where the app left. */
      save(now: number, landed: boolean, inBackground = false) {
        if (!inBackground) app!.last = now;
        if (landed) disk = copy(app!);
      },
      /** Collect: the report into the purse. An ad adds its share of what it was `offered` for; time added to the report since is paid once. */
      collect(share: number, offered = app!.waiting!.earnings) {
        const extra = offered * (share - 1);
        app!.paid += app!.waiting!.earnings + extra;
        app!.bonus += extra;
        app!.waiting = null;
      },
      kill() {
        app = null;
      },
    };
  }

  /** Every second up to `b.last` is in the purse (the ad's share aside), in the waiting report, or dropped by rule. */
  const accounted = (b: Books) => b.paid - b.bonus + (b.waiting?.earnings ?? 0) + b.dropped * RATE;

  it('120 random runs of the app against the plain model, on both of the store\'s paths', async () => {
    for (let seed = 1; seed <= 120; seed++) {
      const d = dice(seed);
      // Half the runs with an engine that returns the advanced game (a mode's), half without (the built-in rules' path).
      const advances = seed % 2 === 0;
      const m = model(advances);
      const engine = () => standIn({ ticks: true, advances }).engine;
      const steps: string[] = [];
      disk.clear();
      disk.set(SAVE, JSON.stringify(start));
      let now = T0;
      let app: Store | null = null;
      let background = false;
      /** The report's rewarded ad while it is open: what it was offered for, and how it ends (the collect then runs to its end). */
      let ad: { offered: number; end: (watched: boolean) => Promise<void> } | null = null;
      const step = (name: string) => void steps.push(`${name}@${(now - T0) / 1000}`);
      const check = () => {
        const where = `seed ${seed}: ${steps.join(' ')}`;
        // The running app and the disk hold what the model says, to the coin.
        if (app) {
          const s = app.getState();
          expect(s.game.cash, where).toBeCloseTo(start.cash + m.app.paid, 4);
          expect(s.offline ? { seconds: s.offline.seconds, earnings: s.offline.earnings } : null, where).toStrictEqual(m.app.waiting);
          // The game's own stamp is the moment its books are up to: time away is counted from there.
          expect(s.game.lastSavedAt, where).toBe(m.app.last);
          // Whatever the model says: never more than every second since the beginning, once (the ad's share aside).
          expect(s.game.cash - start.cash - m.app.bonus + (s.offline?.earnings ?? 0), where).toBeLessThanOrEqual(((now - T0) / 1000) * RATE + 1e-4);
          expect(accounted(m.app), where).toBeCloseTo(((m.app.last - T0) / 1000) * RATE, 4);
        }
        const onDisk = saved(SAVE)!;
        expect(onDisk.cash, where).toBeCloseTo(start.cash + m.disk.paid, 4);
        const record = onDisk[KEY] as { seconds: number; earnings: number } | undefined;
        expect(record ? { seconds: record.seconds, earnings: record.earnings } : null, where).toStrictEqual(m.disk.waiting);
        expect(onDisk.lastSavedAt, where).toBe(m.disk.last);
        expect(accounted(m.disk), where).toBeCloseTo(((m.disk.last - T0) / 1000) * RATE, 4);
      };
      /** Runs something that ends with the store saving. `fate`: the write lands, is lost with the app, or is refused by the device. */
      const saving = async (fate: 'lands' | 'lost' | 'refused', act: () => unknown) => {
        writes.lost = fate === 'lost';
        writes.refused = fate === 'refused';
        await act();
        await settle();
        writes.lost = writes.refused = false;
        m.save(now, fate === 'lands', background);
      };
      const fate = (pLost: number) => (d.chance(pLost) ? d.pick(['lost', 'refused'] as const) : 'lands');
      /** The open ad ends, watched to its end or closed early: the collect runs on, pays and saves, wherever the app is. */
      const adEnds = async (how: 'lands' | 'lost' | 'refused') => {
        const { offered, end } = ad!;
        ad = null;
        const watched = d.chance(0.7);
        step(`${watched ? 'ad watched' : 'ad closed'}${background ? ' in the background' : ''}`);
        m.collect(watched ? 1.5 : 1, offered);
        await saving(how, () => end(watched));
      };
      /** The app is on screen for `seconds`: the loop ticks them (App.tsx; the store takes at most 5 s a tick). */
      const play = (seconds: number) => {
        for (let left = seconds; left > 0; left -= 5) {
          const dt = Math.min(5, left);
          now += dt * 1000;
          at(now);
          app!.getState().tick(dt);
          m.play(now, dt);
        }
      };

      for (let i = 0; i < 18; i++) {
        if (!app) {
          now += d.pick(GAPS) * 1000;
          at(now);
          step('start');
          app = await launch(engine());
          background = false;
          m.boot(now);
        } else if (background) {
          // With the report's ad open over the app, it mostly ends there, before the return.
          const what = d.pick(ad ? (['closed', 'return', 'return', 'save', 'ad', 'ad', 'ad'] as const) : (['closed', 'closed', 'return', 'return', 'return', 'save', 'save'] as const));
          if (what === 'closed') {
            step('closed');
            app = null;
            ad = null;
            m.kill();
          } else if (what === 'return') {
            now += d.pick(GAPS) * 1000;
            at(now);
            step('return');
            background = false;
            // resume() saves; that write is sometimes lost with the app.
            m.resume(now);
            await saving(fate(0.15), () => app!.getState().resume());
            // An ad still open over the app ends now, after the return: its share is of what it was offered for.
            if (ad) await adEnds(fate(0.2));
          } else {
            // Still in the background some seconds later. The ad ends there, before the return, and
            // the collect saves; or the autosave timer fires (App.tsx: every 5 s while the loop runs).
            now += d.pick(WAITS) * 1000;
            at(now);
            if (what === 'ad') await adEnds(fate(0.2));
            else {
              step('saved in the background');
              await saving(fate(0.15), () => app!.getState().save());
            }
          }
        } else {
          const what = d.pick(['play', 'leave', 'leave', 'collect', 'collect', 'ad', 'crash'] as const);
          if (what === 'play') {
            play(d.pick([2, 5, 12]));
            step('autosave');
            await saving(fate(0.1), () => app!.getState().save());
          } else if (what === 'leave') {
            play(d.pick([1, 4, 9]));
            step('leave');
            await saving(fate(0.1), () => app!.getState().pause());
            background = true;
          } else if (what === 'collect' && app.getState().offline) {
            const withAd = d.chance(0.5);
            adResult.ok = d.chance(0.7);
            step(withAd ? (adResult.ok ? 'collect+ad' : 'collect(ad declined)') : 'collect');
            m.collect(withAd && adResult.ok ? 1.5 : 1);
            await saving(fate(0.2), () => app!.getState().collectOffline(withAd));
          } else if (what === 'ad' && app.getState().offline) {
            // The report's ad opens and stays open: it covers the app, which goes to the background
            // for it (Android). It ends later, there or after the return, or never (the app is closed).
            let finish: (watched: boolean) => void = () => {};
            adResult.open = new Promise<boolean>((r) => (finish = r));
            const collecting = app.getState().collectOffline(true);
            adResult.open = null;
            ad = { offered: app.getState().offline!.earnings, end: async (watched) => (finish(watched), await collecting) };
            step('ad opens, leave');
            await saving(fate(0.1), () => app!.getState().pause());
            background = true;
          } else if (what === 'crash') {
            play(d.pick([0, 3]));
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
        app = await launch(engine());
        m.boot(now);
      } else if (background) {
        step('last return');
        background = false;
        m.resume(now);
        await saving('lands', () => app!.getState().resume());
        if (ad) await adEnds('lands');
      }
      if (app.getState().offline) {
        m.collect(1);
        await saving('lands', () => app!.getState().collectOffline(false));
      }
      check();
      expect(app.getState().offline).toBeNull();
    }
    // The only failures on the way were the refused writes.
    expect(crashes.every((where) => where === 'save')).toBe(true);
  }, 120_000);
});
