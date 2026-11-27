/// <reference types="node" />
/**
 * s2c-fix-money (M4, RULING2 22): opening a works card through the MODE'S action (press({act: 'open'})) reports its
 * plate, so the lender's letter falls due from a real screen and its `letter` event reaches the mode's listeners. The
 * money attacker showed that the screen's call ({card: data.kind}, no plate) could never set it (the bots called the
 * rules' onSeen directly). Through the real shared store, native services replaced by stand-ins.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } }));
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'scrap-yard', rawGame: (await import('../../../games/scrap-yard/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: (e: unknown) => { throw e; } }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [], listing: async () => null, onTransactions: () => () => {} } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

afterEach(async () => {
  (await import('../../engine/mode')).installEngineMode(null);
});

describe('M4: the works card opened from the screen reports its plate', () => {
  it('press({act: "open", card: {kind: "works", plate}}) at letterDue sets letterSeen and emits `letter`', async () => {
    const { moneyCfg, r3loan, R3FIN_PLATE } = await import('../../engine/fixtures/salvage2money');
    const { letterDue } = await import('../../engine/salvage/bank');
    const { installEngineMode } = await import('../../engine/mode');
    const { salvageEngineMode } = await import('../../engine/salvageMode');
    const { useGame } = await import('../../state/store');
    const { modeEvents } = await import('../../state/modeEvents');
    const { salvageActions } = await import('./actions');
    installEngineMode(salvageEngineMode);
    const cfg = moneyCfg();
    const g0 = r3loan(R3FIN_PLATE);
    const g = { ...g0, salvage: { ...g0.salvage, bank: { ...g0.salvage.bank, letterSeen: false } } };
    expect(letterDue(cfg, g, R3FIN_PLATE)).toBe(true);
    useGame.setState({ cfg: cfg as never, game: g as never, hydrated: true, offline: null });
    const heard: unknown[] = [];
    const off = modeEvents.subscribe((ev) => heard.push(...ev));
    const out = salvageActions.press({ act: 'open', card: { kind: 'works', plate: R3FIN_PLATE } });
    off();
    expect(out).toBeNull();
    const after = useGame.getState().game as unknown as typeof g;
    expect(after.salvage.bank.letterSeen).toBe(true);
    expect(heard.some((e) => (e as { type: string }).type === 'letter')).toBe(true);
    // Opened again: nothing more (the letter falls due once).
    const heard2: unknown[] = [];
    const off2 = modeEvents.subscribe((ev) => heard2.push(...ev));
    salvageActions.press({ act: 'open', card: { kind: 'works', plate: R3FIN_PLATE } });
    off2();
    expect(heard2.some((e) => (e as { type: string }).type === 'letter')).toBe(false);
  });

  it('a place card still reports its place, and no plate (the first yard\'s call as merged)', async () => {
    const R = await import('../../engine/salvage');
    const { moneyCfg, r3open } = await import('../../engine/fixtures/salvage2money');
    const { useGame } = await import('../../state/store');
    const { salvageActions } = await import('./actions');
    const cfg = moneyCfg();
    const g = r3open();
    const place = Object.keys((cfg.salvage as unknown as { map: { places: Record<string, unknown> } }).map.places ?? {})[0] as R.PlaceId | undefined;
    useGame.setState({ cfg: cfg as never, game: g as never, hydrated: true, offline: null });
    if (!place) return;
    salvageActions.press({ act: 'open', card: { kind: 'place', place } });
    const after = useGame.getState().game as unknown as typeof g;
    expect(after.salvage.seen.places).toContain(place);
    expect(after.salvage.bank.letterSeen).toBe(g.salvage.bank.letterSeen);
  });
});
