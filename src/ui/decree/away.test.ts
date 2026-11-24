/// <reference types="node" />
/**
 * The away report and the app's life on the screen's own path (spec 2.15, 4.4, 10.1 item 6, lesson 5):
 * the real shared store (src/state/store.ts) with the real decree engine mode on the frozen test
 * content, the native services replaced by stand-ins (as src/state/store.seams.test.ts):
 * - the earnings are in the treasury when the report opens (before anything is collected), and the
 *   report's words say "collected";
 * - killing the app with the report open loses nothing and pays nothing twice (save, then boot again);
 * - a clock moved back and forward pays the hours once;
 * - two returns while the report is open show as one report;
 * - the ad adds exactly the extra the sheet prints; Android back closes it without the ad;
 * - going to the background commits a pending take-back and saves it.
 * No tuned number is pinned (lesson 4): every expectation is the rules' own figure.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as R from '../../engine/decree';
import { decreeEngineMode } from '../../engine/decreeMode';
import { decreeFixtures, decreeTestConfig } from '../../engine/fixtures/decree';
import type { GameState } from '../../engine/types';
import { awayView } from './away';

const adResult = vi.hoisted(() => ({ ok: true }));
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async (k: string) => storage.get(k) ?? null, setItem: async (k: string, v: string) => void storage.set(k, v), removeItem: async (k: string) => void storage.delete(k) },
}));
vi.mock('../../generated/activeGame', async () => {
  const { decreeTestConfig: make } = await import('../../engine/fixtures/decree');
  return { ACTIVE_GAME_ID: 'high-office', rawGame: make(), fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null };
});
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => adResult.ok, maybeShowInterstitial: () => {}, init: () => {}, interstitials: true, onChange: () => () => {} } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

const cfg = decreeTestConfig();
const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);
let clock = T0;
/** Each test starts at its own later moment, so the store's module clock (lastTickAt) never covers it. */
const nextMoment = () => (clock += 30 * 86_400_000);
const HOUR = 3_600_000;
const SAVE_KEY = 'save:high-office:decree1';

/** The mid-term fixture, last saved `ms` before `now`. */
function savedAt(now: number, ms: number): R.DecreeGame {
  const { mayorMidTerm } = decreeFixtures(cfg);
  return { ...mayorMidTerm, lastSavedAt: now - ms, stats: { ...mayorMidTerm.stats, clockHigh: now - ms } };
}

async function storeWith(g: R.DecreeGame, now: number) {
  const { installEngineMode } = await import('../../engine/mode');
  installEngineMode(decreeEngineMode);
  vi.useFakeTimers({ now, toFake: ['Date'] });
  const { useGame } = await import('../../state/store');
  useGame.setState({ cfg: cfg as never, game: g as unknown as GameState, hydrated: true, offline: null });
  return useGame;
}

const decreeOf = (useGame: { getState(): { game: GameState } }) => useGame.getState().game as R.DecreeGame;

afterEach(async () => {
  vi.useRealTimers();
  adResult.ok = true;
  (await import('../../engine/mode')).installEngineMode(null);
});

describe('the away report on the store path (2.15)', () => {
  it('an hour away: the earnings are in the treasury when the report opens; the sheet says collected', async () => {
    const now = nextMoment();
    const before = savedAt(now, HOUR);
    const expected = R.decreeOffline(cfg, before, now).earnings;
    expect(expected).toBeGreaterThan(0);
    const useGame = await storeWith(before, now);
    useGame.getState().resume();
    const offline = useGame.getState().offline!;
    expect(offline, 'the report opens').not.toBeNull();
    expect(offline.earnings).toBe(expected);
    expect(useGame.getState().game.cash, 'paid when computed, before any collect').toBe(before.cash + expected);
    const v = awayView(cfg, decreeOf(useGame), offline, 1.5, true)!;
    expect(v.lines[0]).toMatch(/collected/);
    expect(v.lines[0]).not.toMatch(/\bcollect\b/);
    expect(v.amount).not.toBeNull();
  });

  it('killing the app with the report open loses nothing and pays nothing twice', async () => {
    const now = nextMoment();
    const before = savedAt(now, HOUR);
    const useGame = await storeWith(before, now);
    useGame.getState().resume();
    const paid = useGame.getState().game.cash;
    expect(useGame.getState().offline).not.toBeNull();
    await useGame.getState().save();
    // The app is killed with the report open: a fresh store boots from the save a minute later.
    const saved = storage.get(SAVE_KEY)!;
    expect(JSON.parse(saved).cash, 'the save holds the paid treasury').toBe(paid);
    vi.resetModules();
    const { installEngineMode } = await import('../../engine/mode');
    installEngineMode(decreeEngineMode);
    vi.setSystemTime(now + 60_000);
    const { useGame: again } = await import('../../state/store');
    again.setState({ hydrated: false, offline: null });
    await again.getState().boot();
    const g = again.getState().game as R.DecreeGame;
    const minute = R.decreeOffline(cfg, { ...(JSON.parse(saved) as R.DecreeGame) }, now + 60_000).earnings;
    expect(g.cash, 'the hour stays paid; only the minute since is added').toBe(paid + minute);
  });

  it('a clock moved back and forward pays the hours once', async () => {
    const now = nextMoment();
    const before = savedAt(now, HOUR);
    const useGame = await storeWith(before, now);
    useGame.getState().resume();
    const afterHour = useGame.getState().game.cash;
    const hour = afterHour - before.cash;
    await useGame.getState().collectOffline(false);
    // Back two hours, then forward to where it was: nothing more.
    vi.setSystemTime(now - 2 * HOUR);
    useGame.getState().resume();
    vi.setSystemTime(now);
    useGame.getState().resume();
    expect(useGame.getState().game.cash, 'no second payment for the same hour').toBe(afterHour);
    // A real hour later: paid once more, as much as the first hour.
    if (useGame.getState().offline) await useGame.getState().collectOffline(false);
    vi.setSystemTime(now + HOUR);
    useGame.getState().resume();
    expect(useGame.getState().game.cash - afterHour).toBeCloseTo(hour, 6);
  });

  it('two returns while the report is open show as one report', async () => {
    const now = nextMoment();
    const before = savedAt(now, HOUR);
    const useGame = await storeWith(before, now);
    useGame.getState().resume();
    const first = useGame.getState().offline!;
    vi.setSystemTime(now + HOUR);
    useGame.getState().resume();
    const both = useGame.getState().offline!;
    expect(both.earnings).toBeGreaterThan(first.earnings);
    expect(both.seconds).toBeCloseTo(first.seconds + 3600, 3);
    expect((both.report as R.AwayReport).seconds).toBeCloseTo(first.seconds + 3600, 3);
    expect(useGame.getState().game.cash).toBe(before.cash + both.earnings);
  });

  it("the ad adds exactly the extra the sheet prints (the rules' multiplier), and only when it completes", async () => {
    const now = nextMoment();
    const before = savedAt(now, HOUR);
    const useGame = await storeWith(before, now);
    useGame.getState().resume();
    const offline = useGame.getState().offline!;
    const mult = decreeEngineMode.offlineAdMultiplier!(cfg);
    const v = awayView(cfg, decreeOf(useGame), offline, mult, true)!;
    const extra = R.roundDibs(cfg, offline.earnings * (mult - 1));
    expect(v.ad).toEqual({ pct: Math.round((mult - 1) * 100), extra: expect.any(String) });
    const paid = useGame.getState().game.cash;
    const { decreeActions } = await import('../../modes/decree/actions');
    adResult.ok = false;
    await decreeActions.collectAway(true);
    expect(useGame.getState().game.cash, 'a declined ad adds nothing').toBe(paid);
    useGame.setState({ offline });
    adResult.ok = true;
    await decreeActions.collectAway(true);
    expect(useGame.getState().game.cash).toBe(paid + extra);
  });

  it('from the call to the end of election night the ad is "closed", not offered', () => {
    const { governorAtCall } = decreeFixtures(cfg);
    expect(governorAtCall.decree.phase).not.toBe('governing');
    const v = awayView(
      cfg,
      governorAtCall,
      { seconds: 3600, earnings: 500, report: { seconds: 3600, capped: false, earnings: 500, arrived: 0, waiting: 0, line: null } },
      1.5,
      R.canWatchAd(cfg, governorAtCall, 'awayBonus'),
    );
    expect(v?.ad).toBe('closed');
  });

  it('the report alone when papers arrived and nothing was earned; nothing for an empty absence', () => {
    const { mayorMidTerm } = decreeFixtures(cfg);
    const alone = awayView(cfg, mayorMidTerm, { seconds: 700, earnings: 0, report: { seconds: 700, capped: false, earnings: 0, arrived: 1, waiting: 2, line: null } }, 1.5, true);
    expect(alone?.amount).toBeNull();
    expect(alone?.ad).toBeNull();
    expect(alone?.lines.length).toBe(2);
    expect(awayView(cfg, mayorMidTerm, { seconds: 30, earnings: 0, report: { seconds: 30, capped: false, earnings: 0, arrived: 0, waiting: 0, line: null } }, 1.5, true)).toBeNull();
  });
});

describe("Android back and the app's life (4.4, 2.7)", () => {
  it('Android back closes the away report without the ad', async () => {
    const now = nextMoment();
    const useGame = await storeWith(savedAt(now, HOUR), now);
    useGame.getState().resume();
    const paid = useGame.getState().game.cash;
    const { useDecreeUi } = await import('./uiState');
    const { onBack } = await import('./back');
    useDecreeUi.getState().openSheet({ type: 'away' });
    expect(onBack()).toBe(true);
    await vi.waitFor(() => expect(useGame.getState().offline).toBeNull());
    expect(useGame.getState().game.cash).toBe(paid);
    expect(useDecreeUi.getState().sheet).toBeNull();
  });

  it("closeTop: armed strip, peek, sheet, view (the view's own step first), then the bare desk", async () => {
    const { useDecreeUi } = await import('./uiState');
    const ui = useDecreeUi.getState;
    ui().openView('electionNight');
    let skipped = false;
    ui().setViewBack(() => {
      if (skipped) return false;
      skipped = true;
      return true;
    });
    ui().openSheet({ type: 'poll' });
    ui().openPeek();
    ui().arm('sign');
    expect(ui().closeTop()).toBe(true);
    expect(ui().armed).toBeNull();
    ui().openHeadline();
    expect(ui().closeTop()).toBe(true);
    expect(ui().headline, 'the headline bubble before the peek').toBe(false);
    expect(ui().peek).toBe(false);
    ui().openPeek();
    expect(ui().closeTop()).toBe(true);
    expect(ui().peek).toBe(false);
    expect(ui().closeTop()).toBe(true);
    expect(ui().sheet).toBeNull();
    expect(ui().closeTop(), 'Election Night jumps to its result first').toBe(true);
    expect(ui().view).toBe('electionNight');
    expect(ui().closeTop()).toBe(true);
    expect(ui().view).toBeNull();
    expect(ui().closeTop(), 'the bare desk: the app may leave').toBe(false);
  });

  it('on the bare desk, back and the background commit a pending take-back; the background also saves it', async () => {
    const now = nextMoment();
    const { mayorMidTerm } = decreeFixtures(cfg);
    const signed = R.decide(cfg, mayorMidTerm, 'sign', mayorMidTerm.stats.playSeconds, []);
    expect(signed.decree.pending, 'the fixture paper can be signed').not.toBeNull();
    const useGame = await storeWith({ ...signed, lastSavedAt: now }, now);
    const { onAppState, onBack } = await import('./back');
    onAppState('background');
    expect(decreeOf(useGame).decree.pending).toBeNull();
    expect(decreeOf(useGame).decree.stats.signed).toBe(signed.decree.stats.signed + 1);
    await vi.waitFor(() => expect(JSON.parse(storage.get(SAVE_KEY) ?? '{}').decree?.pending).toBeNull());
    useGame.setState({ game: signed as unknown as GameState });
    expect(onBack(), 'the bare desk: the app leaves').toBe(false);
    expect(decreeOf(useGame).decree.pending).toBeNull();
  });
});
