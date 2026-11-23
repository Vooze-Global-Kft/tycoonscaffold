/// <reference types="node" />
/**
 * Orbit Haulers: a Shift Log that was not collected survives the app being closed. The shared store
 * saves the waiting report with the game and hands it back at the next start (the cases of
 * src/state/store.away.test.ts, here with the haul rules and the shipped game data): the credits and
 * the log's own lines come back as they were, a new absence is added through `mergeShiftLogs`, the
 * ad adds its share once, and a clock moved back pays nothing again.
 *
 * Two more rules of the store's time-away accounting, with this game's own figures (each was a
 * leak before): a start within a minute of the save pays at once what the station shipped
 * meanwhile (the hold was emptied and the credits never came), and a save while the app is in the
 * background (the autosave timer, a rewarded ad's result that arrives before the app is back on
 * screen) no longer swallows the seconds before it.
 *
 * The real store and the real haul engine boot from a stand-in disk, under node with the native
 * services replaced. "Closing the app" is a new copy of the store module booted from the same disk.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import space from '../../../games/space-miner/game.json';
import { GameConfigSchema } from '../../config/schema';
import { shaped } from '../../engine/fixtures/haul';
import * as H from '../../engine/haul';
import { haulEngineMode, mergeShiftLogs, withHaulContent } from '../../engine/haulMode';
import { shiftLogRows } from '../../ui/haul/sheets/shellLogic';

/** What survives the app being closed: the device's storage. */
const disk = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async (k: string) => disk.get(k) ?? null, setItem: async (k: string, v: string) => void disk.set(k, v), removeItem: async (k: string) => void disk.delete(k) },
}));
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'space-miner', rawGame: (await import('../../../games/space-miner/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
/** The rewarded ad: watched to its end at once, unless `open` holds an ad still on screen (it ends when that promise does). */
const adShown = vi.hoisted(() => ({ open: null as Promise<boolean> | null }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: () => adShown.open ?? Promise.resolve(true), maybeShowInterstitial: () => {}, init: () => {}, interstitials: false } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

const cfg = withHaulContent(GameConfigSchema.parse(space)) as unknown as H.HaulConfig;
const SAVE = 'save:space-miner:haul1';
const KEY = 'pendingOffline';
const T0 = Date.UTC(2026, 10, 22, 12, 0, 0);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

type Run = H.HaulGame & { haul: H.HaulState };
type App = Awaited<ReturnType<typeof launch>>;

/** A station that ships by itself (two rocks, three drones, the autopilot online), last saved at T0. */
function station(opts: { autopilot?: boolean } = {}): Run {
  const g = shaped(cfg, 7, { slots: [0, 1], haulers: [2, 1], rig: [3, 2], autopilot: opts.autopilot ?? true, freighter: 5 });
  return { ...g, lastSavedAt: T0, stats: { ...g.stats, clockHigh: T0 } };
}

/** One run of the app, as App.tsx starts it: the haul engine installed and its block parsed, then the store booted from the disk. */
async function launch() {
  vi.resetModules();
  const { installEngineMode } = await import('../../engine/mode');
  installEngineMode(haulEngineMode);
  const { baseGame } = await import('../../config/game');
  Object.assign(baseGame, haulEngineMode.config!(baseGame));
  const { useGame } = await import('../../state/store');
  await useGame.getState().boot();
  const { haulActions } = await import('./actions');
  return { useGame, haulActions };
}

/** The app goes to the background and is closed there: the store's last save. */
async function close(app: App) {
  await app.useGame.getState().pause();
}

const settle = () => new Promise<void>((r) => setTimeout(r, 0));
const at = (time: number) => vi.setSystemTime(time);
const savedRecord = () => (JSON.parse(disk.get(SAVE)!) as Record<string, unknown>)[KEY];
const savedRun = () => JSON.parse(disk.get(SAVE)!) as Run;
const log = (app: App) => app.useGame.getState().offline;
const cash = (app: App) => app.useGame.getState().game.cash;
const report = (app: App) => log(app)!.report as H.OfflineReport;
const run = (app: App) => app.useGame.getState().game as unknown as Run;

/** A rewarded ad that stays on screen until the function it returns is called (it covers the app, which on Android goes to the background for it). */
function openAd() {
  let end: (watched: boolean) => void = () => {};
  adShown.open = new Promise<boolean>((r) => (end = r));
  return (watched: boolean) => end(watched);
}

beforeEach(() => {
  disk.clear();
  adShown.open = null;
  disk.set(SAVE, JSON.stringify(station()));
  vi.useFakeTimers({ now: T0, toFake: ['Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Orbit Haulers: a Shift Log that was not collected survives the app being closed', () => {
  it('a start after 2 h prints the Shift Log the rules compute for the saved station', async () => {
    const rules = H.haulOffline(cfg, station(), T0 + 2 * HOUR);
    expect(rules.earnings).toBeGreaterThan(0);
    at(T0 + 2 * HOUR);
    const app = await launch();
    expect(log(app)).toStrictEqual({ seconds: 7200, earnings: rules.earnings, report: rules.report });
    expect(report(app).credits).toBe(rules.earnings);
    // The credits wait for Collect.
    expect(cash(app)).toBe(rules.game.cash);
  });

  it('closed before collect, then started: the same credits and the same printed lines, paid once', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const shown = log(first)!;
    const rows = shiftLogRows(cfg, shown);
    const before = cash(first);
    at(T0 + 2 * HOUR + 15_000);
    await close(first);
    expect(savedRecord()).toStrictEqual(JSON.parse(JSON.stringify(shown)));

    const second = await launch();
    expect(log(second)).toStrictEqual(shown);
    expect(shiftLogRows(cfg, log(second)!)).toStrictEqual(rows);
    expect(cash(second)).toBe(before);

    await second.haulActions.collectShiftLog(false);
    expect(cash(second)).toBe(before + shown.earnings);
    expect(log(second)).toBeNull();
    await settle();
    expect(savedRecord()).toBeUndefined();

    const third = await launch();
    expect(log(third)).toBeNull();
    expect(cash(third)).toBe(before + shown.earnings);
  });

  it('closed before collect, then a second absence: one Shift Log (mergeShiftLogs), paid once with the ad share', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const shown = log(first)!;
    await close(first);
    const afterFirst = first.useGame.getState().game as unknown as Run;

    at(T0 + 5 * HOUR);
    // What the rules pay for the three hours that follow, on the station as it was saved.
    const next = H.haulOffline(cfg, afterFirst, T0 + 5 * HOUR);
    expect(next.seconds).toBe(10800);
    expect(next.earnings).toBeGreaterThan(0);
    const second = await launch();
    const both = log(second)!;
    expect(both.seconds).toBe(7200 + 10800);
    expect(both.earnings).toBe(shown.earnings + next.earnings);
    expect(both.report).toStrictEqual(mergeShiftLogs(shown.report, next.report));
    expect(report(second).seconds).toBe(18000);
    expect(report(second).credits).toBe(both.earnings);
    // One AWAY line and one CREDITS line, for the whole time and the whole sum.
    const rows = shiftLogRows(cfg, both).rows;
    expect(rows.filter((r) => r.strong)).toHaveLength(1);
    expect(rows[0].value).toBe(shiftLogRows(cfg, { seconds: 18000, earnings: 0 }).rows[0].value);

    const before = cash(second);
    await second.haulActions.collectShiftLog(true);
    expect(cfg.haul.offline.adBonus).toBe(0.5);
    expect(cash(second) - before).toBeCloseTo(both.earnings * 1.5, 6);
    await settle();
    const paid = cash(second);
    const third = await launch();
    expect(log(third)).toBeNull();
    expect(cash(third)).toBe(paid);
  });

  it('collected, then started: nothing is paid twice, and a later absence pays only itself', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const shown = log(first)!;
    const before = cash(first);
    await first.haulActions.collectShiftLog(false);
    expect(cash(first)).toBe(before + shown.earnings);
    await close(first);
    expect(savedRecord()).toBeUndefined();

    const second = await launch();
    expect(log(second)).toBeNull();
    expect(cash(second)).toBe(before + shown.earnings);
    await close(second);

    // The hour that follows pays what the rules give that hour on the station as it was saved, and no more.
    const later = H.haulOffline(cfg, second.useGame.getState().game as unknown as Run, T0 + 3 * HOUR);
    expect(later.earnings).toBeGreaterThan(0);
    at(T0 + 3 * HOUR);
    const third = await launch();
    expect(log(third)).toStrictEqual({ seconds: 3600, earnings: later.earnings, report: later.report });
    expect(cash(third)).toBe(later.game.cash);
  });

  it('the device clock moved back between the two starts: the same Shift Log, and its time is not paid again when the clock returns', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const shown = log(first)!;
    const before = cash(first);
    await close(first);
    const afterFirst = first.useGame.getState().game as unknown as Run;

    at(T0 + 1 * HOUR);
    const back = await launch();
    expect(log(back)).toStrictEqual(shown);
    expect(cash(back)).toBe(before);
    expect(back.useGame.getState().game.stats.clockHigh).toBeGreaterThanOrEqual(T0 + 2 * HOUR);
    await close(back);

    // The clock is right again, 30 minutes after the first start: only those 30 minutes are added.
    at(T0 + 2 * HOUR + 30 * MINUTE);
    const more = H.haulOffline(cfg, afterFirst, T0 + 2 * HOUR + 30 * MINUTE);
    expect(more.seconds).toBe(1800);
    const forward = await launch();
    expect(log(forward)!.seconds).toBe(7200 + 1800);
    expect(log(forward)!.earnings).toBe(shown.earnings + more.earnings);
    const cashBefore = cash(forward);
    await forward.haulActions.collectShiftLog(false);
    expect(cash(forward)).toBe(cashBefore + shown.earnings + more.earnings);
  });

  it('a Shift Log an earlier build saved (figures added since are missing) comes back, prints and adds up without a broken number', async () => {
    const ore = cfg.haul.ores[0].id;
    disk.set(SAVE, JSON.stringify({ ...station(), [KEY]: { seconds: 7200, earnings: 500, report: { seconds: 7200, unitsByOre: { [ore]: 120 }, credits: 500 } } }));
    const first = await launch();
    expect(log(first)).toStrictEqual({ seconds: 7200, earnings: 500, report: { seconds: 7200, unitsByOre: { [ore]: 120 }, credits: 500 } });
    const printed = (app: App) => shiftLogRows(cfg, log(app)!).rows.map((r) => `${r.label} ${r.value}`);
    expect(printed(first).join(' | ')).not.toMatch(/NaN|∞|undefined/);
    const afterFirst = first.useGame.getState().game as unknown as Run;
    await close(first);

    at(T0 + 1 * HOUR);
    const next = H.haulOffline(cfg, afterFirst, T0 + 1 * HOUR);
    const second = await launch();
    expect(log(second)!.earnings).toBe(500 + next.earnings);
    const merged = report(second);
    expect(merged.seconds).toBe(7200 + 3600);
    expect(merged.credits).toBe(500 + next.report.credits);
    expect(merged.unitsByOre[ore]).toBe(120 + (next.report.unitsByOre[ore] ?? 0));
    for (const [key, value] of Object.entries(merged)) if (typeof value === 'number') expect(Number.isFinite(value), key).toBe(true);
    expect(printed(second).join(' | ')).not.toMatch(/NaN|∞|undefined/);
    const before = cash(second);
    await second.haulActions.collectShiftLog(false);
    expect(cash(second)).toBe(before + 500 + next.earnings);
  });

  it('"Nothing shipped" (no autopilot: the log speaks alone, with no credits) comes back too', async () => {
    disk.set(SAVE, JSON.stringify(station({ autopilot: false })));
    at(T0 + 2 * HOUR);
    const first = await launch();
    expect(log(first)).toMatchObject({ seconds: 7200, earnings: 0 });
    expect(report(first).noAutopilot).toBe(true);
    const shown = log(first)!;
    await close(first);

    const second = await launch();
    expect(log(second)).toStrictEqual(shown);
    expect(shiftLogRows(cfg, log(second)!).note).not.toBeNull();
    const before = cash(second);
    await second.haulActions.collectShiftLog(false);
    expect(cash(second)).toBe(before);
    await settle();
    expect(log(await launch())).toBeNull();
  });
});

describe('Orbit Haulers: a start within a minute of the save pays what the station shipped meanwhile', () => {
  it('a start 45 s after the save: the autopilot shipped, and the credits are paid at once, as a return from the background pays them', async () => {
    const rules = H.haulOffline(cfg, station(), T0 + 45_000);
    // Too short for a Shift Log (economy.offline.minSecondsToShow): 34.47 units shipped, worth 37.92 credits.
    expect(rules.seconds).toBe(45);
    expect(rules.seconds).toBeLessThan(cfg.economy.offline.minSecondsToShow);
    expect(rules.game.haul!.counters.shipped).toBeCloseTo(34.47, 2);
    expect(rules.earnings).toBeCloseTo(37.92, 2);

    at(T0 + 45_000);
    const started = await launch();
    expect(log(started)).toBeNull();
    // The station is where the rules put it after the 45 s, and the credits for what it shipped
    // came with it (before: shipped 34.47, paid 0).
    expect(run(started).haul.counters.shipped).toBe(rules.game.haul!.counters.shipped);
    expect(cash(started)).toBe(rules.game.cash + rules.earnings);
    expect(run(started).lifetimeEarnings).toBe(rules.game.lifetimeEarnings + rules.earnings);

    // The same 45 s with the app in the background instead of closed: resume() leaves the same station and the same purse.
    disk.set(SAVE, JSON.stringify(station()));
    at(T0);
    const returned = await launch();
    await returned.useGame.getState().pause();
    at(T0 + 45_000);
    returned.useGame.getState().resume();
    expect(log(returned)).toBeNull();
    expect(cash(returned)).toBe(cash(started));
    expect(run(returned).haul).toStrictEqual(run(started).haul);
  });

  it('closed again before anything was saved: the next start pays the whole time since the save, once', async () => {
    at(T0 + 45_000);
    const first = await launch();
    expect(cash(first)).toBeGreaterThan(0);
    // A start saves nothing by itself: the disk still holds the station of T0.
    expect(savedRun()).toStrictEqual(JSON.parse(JSON.stringify(station())));

    const rules = H.haulOffline(cfg, station(), T0 + 55_000);
    at(T0 + 55_000);
    const second = await launch();
    expect(log(second)).toBeNull();
    expect(cash(second)).toBe(rules.game.cash + rules.earnings);
    expect(run(second).haul.counters.shipped).toBe(rules.game.haul!.counters.shipped);
  });

  it('with a Shift Log waiting, the 45 s join it and are paid with it, once', async () => {
    at(T0 + 2 * HOUR);
    const first = await launch();
    const shown = log(first)!;
    await close(first);
    const afterFirst = run(first);

    const next = H.haulOffline(cfg, afterFirst, T0 + 2 * HOUR + 45_000);
    expect(next.seconds).toBe(45);
    expect(next.earnings).toBeGreaterThan(0);
    at(T0 + 2 * HOUR + 45_000);
    const second = await launch();
    const both = log(second)!;
    expect(both.seconds).toBe(7200 + 45);
    expect(both.earnings).toBe(shown.earnings + next.earnings);
    expect(both.report).toStrictEqual(mergeShiftLogs(shown.report, next.report));
    // In the log, so not paid at once as well.
    const before = cash(second);
    expect(before).toBe(next.game.cash);
    await second.haulActions.collectShiftLog(false);
    expect(cash(second)).toBe(before + both.earnings);
  });

  it('no autopilot: nothing shipped in so short a time, so nothing is paid, and no log is printed for it (as before)', async () => {
    disk.set(SAVE, JSON.stringify(station({ autopilot: false })));
    const rules = H.haulOffline(cfg, station({ autopilot: false }), T0 + 45_000);
    expect(rules.earnings).toBe(0);
    expect(rules.report.noAutopilot).toBe(true);
    at(T0 + 45_000);
    const app = await launch();
    // "Nothing shipped" speaks alone after a minute away; 45 s are not worth a log.
    expect(log(app)).toBeNull();
    expect(cash(app)).toBe(rules.game.cash);
    // The drones filled the hold meanwhile, and it waits for the swipe.
    expect(H.holdTotal(run(app).haul)).toBeGreaterThan(0);
    expect(run(app).haul.hold).toStrictEqual(rules.game.haul!.hold);
    expect(run(app).haul.counters.shipped).toBe(0);
  });
});

describe('Orbit Haulers: a save while the app is in the background does not swallow the seconds before it', () => {
  /**
   * The station leaves the screen at T0 and is back 30.1 s later. `saves`: the seconds after
   * leaving at which something saves in the background; every such save holds the moment the app
   * left, in memory and on the disk.
   */
  const trip = async (saves: number[]) => {
    disk.set(SAVE, JSON.stringify(station()));
    at(T0);
    const app = await launch();
    await app.useGame.getState().pause();
    for (const second of saves) {
      at(T0 + second * 1000);
      await app.useGame.getState().save();
      expect(run(app).lastSavedAt).toBe(T0);
      expect(savedRun().lastSavedAt).toBe(T0);
    }
    at(T0 + 30_100);
    app.useGame.getState().resume();
    return app;
  };

  it('the autosave timer runs on in the background, or one save lands just before the return: the return pays the whole 30.1 s', async () => {
    const whole = H.haulOffline(cfg, station(), T0 + 30_100);
    expect(whole.earnings).toBeCloseTo(25.36, 2);
    const plain = await trip([]);
    expect(log(plain)).toBeNull();
    expect(cash(plain)).toBe(whole.game.cash + whole.earnings);
    expect(run(plain).haul.counters.shipped).toBe(whole.game.haul!.counters.shipped);

    // App.tsx saves every 5 s for as long as the loop runs, and on Android it can run on in the background.
    expect(run(await trip([5, 10, 15, 20, 25, 30]))).toStrictEqual(run(plain));
    // One save 0.1 s before the return (before: 0.08 credits for the 30.1 s).
    expect(run(await trip([30]))).toStrictEqual(run(plain));
  });

  it('back after two hours, and the timers restart before the app is told it is on screen: the overdue autosave runs first, and the Shift Log still holds the two hours', async () => {
    at(T0);
    const app = await launch();
    await app.useGame.getState().pause();
    const rules = H.haulOffline(cfg, run(app), T0 + 2 * HOUR);
    expect(rules.earnings).toBeGreaterThan(0);

    // The loop's timers fire again (on iOS they restart when the app enters the foreground, before
    // it is reported active): a tick, which moves nothing while paused, and the autosave.
    at(T0 + 2 * HOUR);
    app.useGame.getState().tick(1);
    await app.useGame.getState().save();
    expect(run(app).haul.counters.shipped).toBe(0);
    expect(savedRun().lastSavedAt).toBe(T0);

    // Then the return is announced. Before, that save had just said "counted up to now": no log, and two hours gone.
    app.useGame.getState().resume();
    expect(log(app)).toStrictEqual({ seconds: 7200, earnings: rules.earnings, report: rules.report });
    expect(cash(app)).toBe(rules.game.cash);
  });

  it("the flare ad's result arrives before the app is back on screen: the charge is granted and saved there, and the ad's seconds are paid on the return", async () => {
    at(T0);
    const app = await launch();
    const charges = run(app).haul.flare.charges;
    const endAd = openAd();
    const watching = app.haulActions.watchFlareAd();
    await app.useGame.getState().pause();

    at(T0 + 30_000);
    endAd(true);
    expect(await watching).toBe(true);
    await settle();
    expect(run(app).haul.flare.charges).toBe(charges + 1);
    // The save the reward made holds the charge, and still says the app left at T0.
    expect(savedRun().haul.flare.charges).toBe(charges + 1);
    expect(savedRun().lastSavedAt).toBe(T0);
    expect(run(app).lastSavedAt).toBe(T0);

    const whole = H.haulOffline(cfg, run(app), T0 + 30_100);
    expect(whole.seconds).toBe(30.1);
    expect(whole.earnings).toBeCloseTo(25.36, 2);
    at(T0 + 30_100);
    app.useGame.getState().resume();
    expect(cash(app)).toBe(whole.game.cash + whole.earnings);
  });

  it("the Shift Log's ad ends before the app is back on screen: the log is paid there with the ad's share, and the ad's seconds are paid on the return", async () => {
    const left = T0 + 2 * HOUR;
    at(left);
    const app = await launch();
    const shown = log(app)!;
    const before = cash(app);
    const endAd = openAd();
    const collecting = app.haulActions.collectShiftLog(true);
    await app.useGame.getState().pause();
    expect(savedRecord()).toStrictEqual(JSON.parse(JSON.stringify(shown)));

    at(left + 30_000);
    endAd(true);
    await collecting;
    await settle();
    expect(log(app)).toBeNull();
    const paid = cash(app);
    expect(paid - before).toBeCloseTo(shown.earnings * 1.5, 6);
    // The save made there holds the credits and no log, and still says the app left at `left`.
    expect(savedRecord()).toBeUndefined();
    expect(savedRun().cash).toBe(paid);
    expect(savedRun().lastSavedAt).toBe(left);

    const whole = H.haulOffline(cfg, run(app), left + 30_100);
    expect(whole.seconds).toBe(30.1);
    expect(whole.earnings).toBeGreaterThan(0);
    at(left + 30_100);
    app.useGame.getState().resume();
    expect(cash(app)).toBe(whole.game.cash + whole.earnings);
    expect(log(app)).toBeNull();
  });

  it('closed in the background after such a save: the next start prints one Shift Log for the whole time since the app left', async () => {
    at(T0);
    const first = await launch();
    await first.useGame.getState().pause();
    const left = run(first);
    at(T0 + 30_000);
    await first.useGame.getState().save();
    expect(savedRun().lastSavedAt).toBe(T0);

    const rules = H.haulOffline(cfg, left, T0 + 10 * MINUTE);
    expect(rules.seconds).toBe(600);
    at(T0 + 10 * MINUTE);
    const second = await launch();
    expect(log(second)).toStrictEqual({ seconds: 600, earnings: rules.earnings, report: rules.report });
    expect(cash(second)).toBe(rules.game.cash);
  });
});
