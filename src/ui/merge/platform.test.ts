/// <reference types="node" />
/**
 * The platform pieces of the merge screen, through the real shared store (native services replaced
 * by stand-ins, as src/modes/merge/wiring.test.ts): Android back closes layers in spec 4.5's order
 * and leaves only from the bare board; the away report's path (App.tsx's foreground handler →
 * store.resume → the rules' offline → the report's words) pays once, also when the device clock is
 * moved back and forward again; two reports of one absence show as one; an empty absence shows
 * nothing. Owned by the hints and platform package.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import night from '../../../games/night-market/game.json';
import { GameConfigSchema } from '../../config/schema';
import { mergeState } from '../../engine/fixtures/merge';
import type * as R from '../../engine/merge';
import { mergeEngineMode, withMergeContent } from '../../engine/mergeMode';

const played = vi.hoisted(() => [] as string[]);
const adsStub = vi.hoisted(() => ({ skipRewarded: false, noAds: false, rewardedReady: true, async showRewarded() { return true; }, maybeShowInterstitial: () => {}, init: () => {}, interstitials: false, onChange: () => () => {} }));
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
const T0 = Date.UTC(2026, 10, 23, 12, 0, 0);
const H = 3600 * 1000;

async function storeWith(game: R.MergeGame) {
  const { installEngineMode } = await import('../../engine/mode');
  installEngineMode(mergeEngineMode);
  const { useGame } = await import('../../state/store');
  useGame.setState({ cfg: cfg as never, game: game as never, hydrated: true, offline: null });
  const { useMergeUi } = await import('./uiState');
  useMergeUi.setState({ armed: null, chip: null, undoHidden: null, sheet: null, spoke: null, fingerDown: false });
  return { useGame, useMergeUi, back: await import('./back'), lines: await import('./sheets/awayLines'), actions: (await import('../../modes/merge/actions')).mergeActions };
}

/** A game with Old Brindle and Pim hired, last saved at T0. */
function minded(): R.MergeGame {
  const g = mergeState(cfg, { clock: 300, cash: 0, chains: [{ c: 0, gear: 3, minder: 2 }, { c: 1, gear: 2, minder: 1 }] });
  return { ...g, lastSavedAt: T0, stats: { ...g.stats, clockHigh: T0 } };
}

describe('Android back (4.5)', () => {
  beforeEach(() => {
    // A fresh store per test: its module keeps the last tick's wall time (lastTickAt), as an app does.
    vi.resetModules();
    vi.useFakeTimers({ now: T0 });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('closes armed, chip, undo chip (not undone), sheet, spoke in that order, then leaves the app', async () => {
    const g0 = minded();
    const clock = g0.stats.playSeconds;
    const g = { ...g0, merge: { ...g0.merge, basketUndo: { cell: 20, good: { c: 0, k: 1 }, refund: 1, until: clock + 3 } } } as R.MergeGame;
    const { useMergeUi, back, useGame } = await storeWith(g);
    useMergeUi.setState({ armed: 17, chip: 18, sheet: { type: 'shop' }, spoke: 'book' });
    const order: (string | null)[] = [];
    for (let i = 0; i < 6; i++) {
      order.push(useMergeUi.getState().topLayer(back.undoShowing(useGame.getState().game as R.MergeGame)));
      const closed = back.onBack();
      expect(closed).toBe(i < 5);
    }
    expect(order).toEqual(['armed', 'chip', 'undo', 'sheet', 'spoke', null]);
    // The undo chip was put away, not undone: the sale stands.
    expect((useGame.getState().game as R.MergeGame).merge.basketUndo).not.toBeNull();
  });

  it('an expired undo chip is not a layer', async () => {
    const g0 = minded();
    const g = { ...g0, merge: { ...g0.merge, basketUndo: { cell: 20, good: { c: 0, k: 1 }, refund: 1, until: g0.stats.playSeconds - 1 } } } as R.MergeGame;
    const { back } = await storeWith(g);
    expect(back.onBack()).toBe(false);
  });

  it('collects the away report first, without the ad', async () => {
    const { useGame, back } = await storeWith(minded());
    useGame.setState({ offline: { seconds: 600, earnings: 40, report: undefined } });
    const cash0 = useGame.getState().game.cash;
    expect(back.onBack()).toBe(true);
    await vi.runAllTimersAsync();
    expect(useGame.getState().offline).toBeNull();
    expect(useGame.getState().game.cash).toBe(cash0 + 40);
  });
});

describe('the away report through the store (2.9, M8, 10.1 item 7)', () => {
  beforeEach(() => {
    // A fresh store per test: its module keeps the last tick's wall time (lastTickAt), as an app does.
    vi.resetModules();
    vi.useFakeTimers({ now: T0 });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('on return it shows the minders, the goods and the coins, worded as the specification', async () => {
    const { useGame, lines } = await storeWith(minded());
    vi.setSystemTime(T0 + 3 * H + 10 * 60 * 1000);
    useGame.getState().resume();
    const off = useGame.getState().offline;
    expect(off).not.toBeNull();
    const v = lines.awayView(cfg, off!, 1 + cfg.merge.ads.awayBonus, 4 * 3600);
    expect(v).not.toBeNull();
    expect(v!.lines[0]).toMatch(/^While you were away \(3 h 10 m\): Old Brindle and Pim sold [\d,]+ house goods, \+[\d.]+K?\.$/);
    expect(v!.adPercent).toBe(50);
  });

  it('a device clock moved back pays nothing, and forward again pays only the new time', async () => {
    const { useGame, actions } = await storeWith(minded());
    vi.setSystemTime(T0 + 4 * H);
    useGame.getState().resume();
    const first = useGame.getState().offline!;
    expect(first.earnings).toBeGreaterThan(0);
    await actions.collectAway(false);
    const cash1 = useGame.getState().game.cash;
    expect(cash1).toBeCloseTo(first.earnings, 6);
    // The clock moved back an hour: nothing is paid, no report.
    vi.setSystemTime(T0 + 3 * H);
    useGame.getState().resume();
    expect(useGame.getState().offline).toBeNull();
    expect(useGame.getState().game.cash).toBe(cash1);
    // Forward again to 10 minutes past the first return: only those 10 minutes pay.
    vi.setSystemTime(T0 + 4 * H + 10 * 60 * 1000);
    useGame.getState().resume();
    const again = useGame.getState().offline;
    const paid = (again?.earnings ?? 0) + (useGame.getState().game.cash - cash1);
    // At most what 10 minutes earn (4 h earned `first.earnings`; the minders' rate is constant): no double pay.
    expect(paid).toBeLessThanOrEqual((first.earnings * 10) / 240 + first.earnings * 0.02 + 1);
  });

  it('two reports of one absence show as one', async () => {
    const { useGame, lines } = await storeWith(minded());
    vi.setSystemTime(T0 + 2 * H);
    useGame.getState().resume();
    const one = useGame.getState().offline!;
    vi.setSystemTime(T0 + 3 * H);
    useGame.getState().resume();
    const both = useGame.getState().offline!;
    expect(both.seconds).toBeCloseTo(one.seconds + 3600, 0);
    const v = lines.awayView(cfg, both, 1.5, 4 * 3600)!;
    expect(v.lines.filter((l) => l.startsWith('While you were away')).length).toBe(1);
    expect(v.lines[0]).toContain('(3 h 0 m)');
  });

  it('the report alone when only the shelves filled; nothing for an empty absence', async () => {
    const { lines } = await storeWith(minded());
    const alone = lines.awayView(cfg, { seconds: 1200, earnings: 0, report: { seconds: 1200, effective: 1200, sales: [], earnings: 0, shelved: [{ c: 0, goods: 6 }], waiting: [0] } }, 1.5, 14400);
    expect(alone?.lines).toEqual(['While you were away (20 m): your gear filled its shelves.']);
    expect(alone?.amount).toBeNull();
    expect(alone?.withAd).toBeNull();
    const empty = lines.awayView(cfg, { seconds: 1200, earnings: 0, report: { seconds: 1200, effective: 1200, sales: [], earnings: 0, shelved: [], waiting: [] } }, 1.5, 14400);
    expect(empty).toBeNull();
  });

  it('a report back from a save reads as it did (the app was closed on the sheet), and a damaged one never breaks the sheet', async () => {
    const { lines } = await storeWith(minded());
    const report: R.AwayReport = { seconds: 3 * 3600, effective: 3 * 3600, sales: [{ c: 0, goods: 720, coins: 8640 }, { c: 1, goods: 720, coins: 34560 }], earnings: 43200, shelved: [{ c: 0, goods: 6 }], waiting: [0] };
    // The store saves the report with the game while it waits and reads it back at the next start (src/state/store.ts).
    const saved = JSON.parse(JSON.stringify(report)) as unknown;
    expect(saved).toEqual(report);
    const view = lines.awayView(cfg, { seconds: report.seconds, earnings: report.earnings, report }, 1.5, 4 * 3600)!;
    expect(lines.awayView(cfg, { seconds: report.seconds, earnings: report.earnings, report: saved }, 1.5, 4 * 3600)).toEqual(view);
    expect(view.lines[0]).toContain('Old Brindle and Pim sold 1,440 house goods');
    // A save is untrusted: every field in turn missing or of the wrong kind, and things that are no report at all.
    const junk: unknown[] = [null, 'x', 5, -1, true, {}, [], [null], [5], ['x'], [{}], [[]], [{ c: 'x', goods: 'y', coins: {} }]];
    const damaged: unknown[] = [...junk];
    for (const key of Object.keys(report)) {
      for (const j of junk) damaged.push({ ...report, [key]: j });
      damaged.push(Object.fromEntries(Object.entries(report).filter(([k]) => k !== key)));
    }
    // A row that names no chain but something every list has: `chains["length"]` is a number, `chains["map"]` a function.
    for (const name of ['length', 'map', 'constructor', '__proto__', 'toString']) {
      damaged.push({ ...report, sales: [{ c: name, goods: 3, coins: 9 }] }, { ...report, shelved: [{ c: name, goods: 3 }] }, { ...report, sales: [{ c: name, goods: 3, coins: 1e9 }, ...report.sales] });
    }
    for (const bad of damaged) {
      // As the sheet gets it (the record's report as saved), and joined with the next absence by the rules.
      for (const shown of [bad, mergeEngineMode.mergeReport!(mergeEngineMode.reconcileReport!(cfg as never, bad), report)]) {
        const v = lines.awayView(cfg, { seconds: 600, earnings: 40, report: shown }, 1.5, 4 * 3600);
        // Whatever the report says, the amounts are the record's own: what Collect pays, and with the ad.
        expect(v, JSON.stringify(bad)).toMatchObject({ amount: '40', withAd: '60', adPercent: 50 });
        for (const line of v!.lines) expect(line, JSON.stringify(bad)).not.toMatch(/NaN|∞|undefined|Infinity/);
        expect(v!.lead === null || (Number.isInteger(v!.lead) && v!.lead >= 0 && v!.lead < cfg.merge.chains.length), JSON.stringify(bad)).toBe(true);
      }
    }
  });

  it('figures as figures: 1,520 goods; one name, two names, three names', async () => {
    const { lines } = await storeWith(minded());
    expect(lines.groupDigits(1520)).toBe('1,520');
    expect(lines.groupDigits(1234567)).toBe('1,234,567');
    expect(lines.joinNames(['Old Brindle'])).toBe('Old Brindle');
    expect(lines.joinNames(['Old Brindle', 'Pim'])).toBe('Old Brindle and Pim');
    expect(lines.joinNames(['Old Brindle', 'Pim', 'Nettle'])).toBe('Old Brindle, Pim and Nettle');
    expect(lines.awayDuration(3 * 3600 + 10 * 60 + 5)).toBe('3 h 10 m');
    expect(lines.awayDuration(42 * 60)).toBe('42 m');
  });
});
