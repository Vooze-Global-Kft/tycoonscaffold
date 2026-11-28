/// <reference types="node" />
/**
 * C-ACTIONS (PLAN2 2.3, 6.3; phasec/s2c-plan-wiring.md a.2): every press of the works through the mode's actions, on a
 * stage-2 state, through the real shared store (its async store calls replaced by stand-ins the test drives).
 * - No CardAction variant answers `notBuilt` (NOT_SALVAGE) on a stage-2 state: each reaches a rules function.
 * - The routes: a hall's tab pins (setPlateRecipe), "Let the hall choose" unpins (letHallChoose), the crucible's tab
 *   stays the crucible's; a hall's "Take from bays" is refused `nothing`; signFinance signs; setAgeBand keeps a band;
 *   setPacksHidden hides behind the code; buyPack hands the rules' quote (with the country) and settle to buyQuoted.
 * - The async presses (buyPack, buyProduct, restorePurchases, watchAd) are held while they run: a second press, of
 *   any card, is `nothing` and changes nothing; once they land, presses work again.
 * - While the return counts every press is `nothing` and changes nothing; a video that ended while it counted pays
 *   after the count, never onto the old state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } }));
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'scrap-yard', rawGame: (await import('../../../games/scrap-yard/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
const video = vi.hoisted(() => ({ next: null as null | ((ok: boolean) => void), calls: [] as string[], instant: null as boolean | null }));
vi.mock('../../services/ads', () => ({
  ads: {
    showRewarded: (placement: string) => {
      video.calls.push(placement);
      if (video.instant !== null) return Promise.resolve(video.instant);
      return new Promise<boolean>((r) => (video.next = r));
    },
    maybeShowInterstitial: () => {},
    init: () => {},
    interstitials: true,
  },
}));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: (e: unknown) => { throw e; } }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [], listing: async () => null, onTransactions: () => () => {} } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null, storefrontCountry: async () => 'US' }));
// The counted return's hold, driven by the test (the real one is set by a waiting absence).
const hold = vi.hoisted(() => ({ on: false, fs: new Set<() => void>() }));
vi.mock('./returning', async (orig) => ({
  ...(await orig<typeof import('./returning')>()),
  heldForCount: () => hold.on,
  onPending: (f: () => void) => {
    hold.fs.add(f);
    return () => hold.fs.delete(f);
  },
}));
function setHold(on: boolean): void {
  hold.on = on;
  for (const f of [...hold.fs]) f();
}

type Mod = {
  R: typeof import('../../engine/salvage');
  F: typeof import('../../engine/fixtures/salvage2money');
  useGame: typeof import('../../state/store').useGame;
  A: typeof import('./actions');
};
async function load(): Promise<Mod> {
  return {
    R: await import('../../engine/salvage'),
    F: await import('../../engine/fixtures/salvage2money'),
    useGame: (await import('../../state/store')).useGame,
    A: await import('./actions'),
  };
}
type G = import('../../engine/salvage').SalvageGame;
type CA = import('../../engine/salvage').CardAction;

function put(m: Mod, cfg: unknown, g: G): void {
  m.useGame.setState({ cfg: cfg as never, game: g as never, hydrated: true, offline: null });
}
const game = (m: Mod) => m.useGame.getState().game as unknown as G;
const flush = () => new Promise((r) => setTimeout(r, 0));

/** A shop yard (r4 of the works' test content, second session begun, band a18) with an away bonus waiting. */
function adGame(m: Mod, amount = 1234): G {
  const g = m.F.shopGame();
  return { ...g, salvage: { ...g.salvage, ads: { ...g.salvage.ads, awayOffer: { amount, I: 1000 } } } };
}

/** One of every CardAction variant (the Record makes the list complete: a new variant fails the typecheck here). */
function everyVariant(m: Mod, g: G): Record<CA['act'], CA> {
  const grade = Object.keys(g.salvage.bays)[0] as never;
  return {
    buy: { act: 'buy', item: 'truck' as never, price: 1 },
    hire: { act: 'hire', role: 'hand' as never, price: 1 },
    level: { act: 'level', target: { plate: 'rotary' } as never, price: 1 },
    setHold: { act: 'setHold', grade, on: true },
    sell: { act: 'sell', grade, shown: { price: 1 } as never },
    setRecipe: { act: 'setRecipe', recipe: 'alu' as never, confirmHeel: false, plate: 'rotary' as never },
    setFromBays: { act: 'setFromBays', on: true, plate: 'rotary' as never },
    signDeal: { act: 'signDeal', terms: {} as never },
    declineDeal: { act: 'declineDeal' },
    skipGoal: { act: 'skipGoal', id: 'none' },
    ackAway: { act: 'ackAway' },
    open: { act: 'open', card: { kind: 'works', plate: 'rotary' } as never },
    signFinance: { act: 'signFinance', plate: 'rotary' as never, shown: { P: 1, F: 1, charge: 1 } as never },
    setRoute: { act: 'setRoute', grade, to: 'bay' },
    buyPack: { act: 'buyPack', product: 'pack2', S: 1 },
    buyProduct: { act: 'buyProduct', product: 'colour1' },
    restorePurchases: { act: 'restorePurchases' },
    chooseLook: { act: 'chooseLook', slot: Object.keys(g.salvage.iap.looks)[0] as never, id: null },
    watchAd: { act: 'watchAd', kind: 'away', amount: 1 },
    setPacksHidden: { act: 'setPacksHidden', on: true },
  };
}

beforeEach(async () => {
  setHold(false);
  video.next = null;
  video.calls = [];
  video.instant = true;
  const { useGame } = await import('../../state/store');
  useGame.setState({
    buyQuoted: async () => 'granted',
    purchase: async () => true,
    restorePurchases: async () => 0,
    save: async () => {},
  } as never);
});

afterEach(async () => {
  setHold(false);
  // Let any press a test left running land (the module keeps one running press).
  video.next?.(false);
  await flush();
});

describe('C-ACTIONS: no press of a stage-2 card answers notBuilt', () => {
  it('every CardAction variant reaches a rules function (sync and async) on a stage-2 state', async () => {
    const m = await load();
    const cfg = m.F.shopCfg();
    for (const [act, a] of Object.entries(everyVariant(m, m.F.shopGame()))) {
      put(m, cfg, m.F.shopGame());
      const out = m.A.salvageActions.pressAsync(a);
      expect(out.sync?.key, act).not.toBe('notBuilt');
      const done = await out.done;
      expect(done?.key, act).not.toBe('notBuilt');
      expect(m.A.pressRunning(), act).toBe(false);
    }
  });

  it('outside a salvage game a press is still notBuilt and nothing runs', async () => {
    const m = await load();
    m.useGame.setState({ hydrated: false } as never);
    expect(m.A.salvageActions.press({ act: 'restorePurchases' })?.key).toBe('notBuilt');
    expect(m.A.pressRunning()).toBe(false);
    m.useGame.setState({ hydrated: true } as never);
  });
});

describe('C-ACTIONS: the routes', () => {
  it('a hall tab pins its recipe (setPlateRecipe); "Let the hall choose" unpins it (letHallChoose); the crucible keeps its own', async () => {
    const m = await load();
    const cfg = m.F.shopCfg();
    const g0 = m.F.shopGame();
    const rotary = g0.salvage.works.rotary!;
    expect(rotary.heat).toBeTruthy();
    put(m, cfg, g0);
    const recipe = rotary.heat!.recipe as never;
    expect(m.A.salvageActions.press({ act: 'setRecipe', recipe, confirmHeel: false, plate: 'rotary' as never })).toBeNull();
    expect(game(m).salvage.works.rotary!.heat!.pinned).toBe(true);
    expect(m.A.salvageActions.press({ act: 'setRecipe', recipe, confirmHeel: false, plate: 'rotary' as never, choose: true })).toBeNull();
    expect(game(m).salvage.works.rotary!.heat!.pinned).toBeUndefined();
    // Again: the hall already chooses, the rules' own `nothing`.
    expect(m.A.salvageActions.press({ act: 'setRecipe', recipe, confirmHeel: false, plate: 'rotary' as never, choose: true })?.key).toBe('nothing');
    // Without a plate it is the crucible's action (here a works recipe the crucible does not know: refused, not a hall's change).
    const before = game(m);
    m.A.salvageActions.press({ act: 'setRecipe', recipe, confirmHeel: false });
    expect(game(m).salvage.works.rotary).toEqual(before.salvage.works.rotary);
  });

  it("a hall's Take from bays is refused nothing and changes nothing", async () => {
    const m = await load();
    const g0 = m.F.shopGame();
    put(m, m.F.shopCfg(), g0);
    expect(m.A.salvageActions.press({ act: 'setFromBays', on: true, plate: 'rotary' as never })).toEqual({ key: 'nothing', args: {}, retry: null });
    expect(game(m)).toBe(g0);
  });

  it('signFinance signs the finance card at the terms shown', async () => {
    const m = await load();
    const { financeTerms, shownOf } = await import('../../engine/salvage/bank');
    const cfg = m.F.moneyCfg();
    const g0 = m.F.r3loan(m.F.R3FIN_PLATE);
    put(m, cfg, g0);
    const tm = financeTerms(cfg, g0, m.F.R3FIN_PLATE)!;
    expect(m.A.salvageActions.press({ act: 'signFinance', plate: m.F.R3FIN_PLATE as never, shown: shownOf(tm) })).toBeNull();
    expect(game(m).salvage.bank.agreement).toBeTruthy();
  });

  it('setAgeBand keeps a band (never the year); setPacksHidden hides behind the code from the pad', async () => {
    const m = await load();
    const cfg = m.F.shopCfg();
    put(m, cfg, m.F.shopGame({ ageBand: null }));
    expect(m.A.salvageActions.setAgeBand(1980)).toBeNull();
    expect(game(m).salvage.iap.ageBand).toBe('a18');
    put(m, cfg, m.F.shopGame());
    expect(m.A.salvageActions.press({ act: 'setPacksHidden', on: true }, { code: '1234' })).toBeNull();
    expect(game(m).salvage.iap.hidden).toBeTruthy();
    // Shown again only with the same code.
    expect(m.A.salvageActions.setPacksHidden(false, '9999')?.key).toBe('packCode');
    expect(m.A.salvageActions.setPacksHidden(false, '1234')).toBeNull();
    expect(game(m).salvage.iap.hidden ?? null).toBeNull();
  });

  it("buyPack hands the store the rules' quote for the shop's country and the rules' settle", async () => {
    const m = await load();
    const cfg = m.F.shopCfg();
    const g0 = m.F.shopGame();
    put(m, cfg, g0);
    const seen: { product: string; quoted: boolean; settled: boolean } = { product: '', quoted: false, settled: false };
    m.useGame.setState({
      buyQuoted: async (p: { id: string }, quote: (...a: unknown[]) => unknown, settle: (...a: unknown[]) => unknown) => {
        seen.product = p.id;
        const s = m.useGame.getState();
        const q = quote(s.cfg, s.game, Date.now(), [], Date.now());
        seen.quoted = typeof q === 'object' && q !== null;
        const back = settle(s.cfg, q, 'cancelled', { product: p.id, atMs: Date.now() });
        seen.settled = typeof back === 'object' && back !== null;
        return 'cancelled';
      },
    } as never);
    const out = m.A.salvageActions.pressAsync({ act: 'buyPack', product: 'pack2', S: 1 }, { country: 'US' });
    expect(out.sync).toBeNull();
    await out.done;
    expect(seen).toEqual({ product: 'pack2', quoted: true, settled: true });
  });
});

describe('C-ACTIONS: async presses are held while they run (PLAN2 6.3)', () => {
  it('watchAd: while the video shows a second press (any card) is nothing; it pays once on the latest state', async () => {
    const m = await load();
    const cfg = m.F.shopCfg();
    const g0 = adGame(m);
    put(m, cfg, g0);
    video.instant = null;
    const first = m.A.salvageActions.pressAsync({ act: 'watchAd', kind: 'away', amount: 1234 });
    expect(first.sync).toBeNull();
    expect(m.A.pressRunning()).toBe(true);
    expect(video.calls).toEqual(['salvage_away']);
    // A second press of the same button, and a press of another card: nothing, the state untouched, no second video.
    expect(m.A.salvageActions.press({ act: 'watchAd', kind: 'away', amount: 1234 })).toEqual({ key: 'nothing', args: {}, retry: null });
    expect(m.A.salvageActions.press({ act: 'restorePurchases' })?.key).toBe('nothing');
    expect(m.A.salvageActions.press({ act: 'chooseLook', slot: Object.keys(g0.salvage.iap.looks)[0] as never, id: null })?.key).toBe('nothing');
    expect(video.calls).toHaveLength(1);
    expect(game(m)).toBe(g0);
    video.next!(true);
    expect(await first.done).toBeNull();
    expect(m.A.pressRunning()).toBe(false);
    expect(game(m).cash).toBeCloseTo(g0.cash + 1234, 2);
    expect(game(m).salvage.ads.awayOffer).toBeNull();
    // The offer is used: pressed again it is refused BEFORE any video shows.
    const again = m.A.salvageActions.pressAsync({ act: 'watchAd', kind: 'away', amount: 1234 });
    expect(again.sync?.key).toBe('nothing');
    expect(video.calls).toHaveLength(1);
  });

  it('watchAd: a video that did not show is "No video right now" and changes nothing', async () => {
    const m = await load();
    const g0 = adGame(m);
    put(m, m.F.shopCfg(), g0);
    video.instant = false;
    const out = m.A.salvageActions.pressAsync({ act: 'watchAd', kind: 'away', amount: 1234 });
    const r = await out.done;
    expect(r?.txt).toEqual(m.A.NO_VIDEO_TXT);
    expect(game(m)).toBe(g0);
  });

  it('watchAd: a moved amount is refused before the video, with the amount now as retry', async () => {
    const m = await load();
    put(m, m.F.shopCfg(), adGame(m, 1234));
    const out = m.A.salvageActions.pressAsync({ act: 'watchAd', kind: 'away', amount: 999 });
    expect(out.sync?.key).toBe('nothing');
    expect(out.sync?.retry).toEqual({ act: 'watchAd', kind: 'away', amount: 1234 });
    expect(video.calls).toHaveLength(0);
  });

  it('buyPack, buyProduct and restorePurchases: held until the store answers; a second press is nothing', async () => {
    const m = await load();
    const cfg = m.F.shopCfg();
    for (const a of [
      { act: 'buyPack', product: 'pack2', S: 1 },
      { act: 'buyProduct', product: 'colour1' },
      { act: 'restorePurchases' },
    ] as CA[]) {
      put(m, cfg, m.F.shopGame());
      let answer: (v: unknown) => void = () => {};
      const wait = () => new Promise((r) => (answer = r));
      let calls = 0;
      m.useGame.setState({
        buyQuoted: async () => (calls++, await wait(), 'granted'),
        purchase: async () => (calls++, await wait(), true),
        restorePurchases: async () => (calls++, await wait(), 0),
      } as never);
      const first = m.A.salvageActions.pressAsync(a, { country: 'US' });
      expect(first.sync, a.act).toBeNull();
      await flush();
      expect(m.A.pressRunning(), a.act).toBe(true);
      expect(m.A.salvageActions.press(a)?.key, a.act).toBe('nothing');
      expect(m.A.salvageActions.press({ act: 'buyProduct', product: 'colour2' })?.key, a.act).toBe('nothing');
      await flush();
      expect(calls, a.act).toBe(1);
      answer(undefined);
      expect(await first.done, a.act).toBeNull();
      expect(m.A.pressRunning(), a.act).toBe(false);
    }
  });

  it('a product the shared list does not hold is refused nothing; the store is not asked', async () => {
    const m = await load();
    put(m, m.F.shopCfg(), m.F.shopGame());
    let calls = 0;
    m.useGame.setState({ purchase: async () => (calls++, true) } as never);
    expect((await m.A.salvageActions.pressAsync({ act: 'buyProduct', product: 'noSuchProduct' }).done)?.key).toBe('nothing');
    expect(calls).toBe(0);
  });

  it('opening a card still works while a press runs (open is the screen\'s)', async () => {
    const m = await load();
    put(m, m.F.shopCfg(), adGame(m));
    video.instant = null;
    const first = m.A.salvageActions.pressAsync({ act: 'watchAd', kind: 'away', amount: 1234 });
    expect(m.A.salvageActions.press({ act: 'open', card: { kind: 'works', plate: 'rotary' } as never })?.key).not.toBe('notBuilt');
    video.next!(false);
    await first.done;
  });
});

describe('C-ACTIONS: held while the return counts', () => {
  it('every variant pressed while counting is nothing and changes nothing (async ones start nothing)', async () => {
    const m = await load();
    const cfg = m.F.shopCfg();
    const g0 = adGame(m);
    let calls = 0;
    m.useGame.setState({ buyQuoted: async () => (calls++, 'granted'), purchase: async () => (calls++, true), restorePurchases: async () => (calls++, 0) } as never);
    setHold(true);
    for (const [act, a] of Object.entries(everyVariant(m, g0))) {
      if (act === 'open') continue;
      put(m, cfg, g0);
      const out = m.A.salvageActions.pressAsync(a, { code: '1234', country: 'US' });
      expect(out.sync, act).toEqual({ key: 'nothing', args: {}, retry: null });
      expect(await out.done, act).toEqual({ key: 'nothing', args: {}, retry: null });
      expect(game(m), act).toBe(g0);
      expect(m.A.pressRunning(), act).toBe(false);
    }
    expect(m.A.salvageActions.setAgeBand(1980)?.key).toBe('nothing');
    expect(calls).toBe(0);
    expect(video.calls).toHaveLength(0);
  });

  it('a video that ends while the return counts pays after the count, onto the counted state', async () => {
    const m = await load();
    const cfg = m.F.shopCfg();
    const g0 = adGame(m);
    put(m, cfg, g0);
    video.instant = null;
    const out = m.A.salvageActions.pressAsync({ act: 'watchAd', kind: 'away', amount: 1234 });
    setHold(true);
    video.next!(true);
    await flush();
    await flush();
    // Still waiting: nothing applied to the old state.
    expect(game(m)).toBe(g0);
    expect(m.A.pressRunning()).toBe(true);
    // The count lands (a new state), then the hold ends: the pay goes onto that state.
    const counted = { ...g0, cash: g0.cash + 10 };
    put(m, cfg, counted);
    setHold(false);
    expect(await out.done).toBeNull();
    expect(game(m).cash).toBeCloseTo(counted.cash + 1234, 2);
  });
});
