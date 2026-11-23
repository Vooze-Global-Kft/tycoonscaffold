/// <reference types="node" />
/**
 * Orbit Haulers: a Shift Log that was not collected survives the app being closed. The shared store
 * saves the waiting report with the game and hands it back at the next start (the cases of
 * src/state/store.away.test.ts, here with the haul rules and the shipped game data): the credits and
 * the log's own lines come back as they were, a new absence is added through `mergeShiftLogs`, the
 * ad adds its share once, and a clock moved back pays nothing again.
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
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: false } }));
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
const log = (app: App) => app.useGame.getState().offline;
const cash = (app: App) => app.useGame.getState().game.cash;
const report = (app: App) => log(app)!.report as H.OfflineReport;

beforeEach(() => {
  disk.clear();
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
