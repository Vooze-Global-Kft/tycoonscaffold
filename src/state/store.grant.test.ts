/// <reference types="node" />
/**
 * The shared shop seams of yard-stage2.md 2.15.4, 2.15.5 and 9.1 (`store-shared`), mode-agnostic: a test
 * double of a mode (`grantProduct` with its own ledger and pending quotes, in the save) on Pizza Empire's
 * data with one `hoursOfIncome` product added in memory. The real store runs under node with the native
 * services replaced by stand-ins whose purchase, listener and transaction list each test drives.
 *
 * Shown here: granted exactly once by txId (the purchase's result, the listener and the reconcile all
 * deliver it); a pending purchase approved later reaches the mode with its own txId and purchasedMs; the
 * quote is on disk before the store's sheet opens; a kill between the sheet and the grant, or between the
 * grant and the save, is granted once at the next start; a transaction of another save is not granted;
 * cancel and failure withdraw the quote; a non-consumable restores as today; a mode without grantProduct,
 * or a game without the kind, never asks the store for transactions; `initOn` decides whether boot starts
 * the ad service; the mode's age band reaches the ad service.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import type { EngineMode } from '../engine/mode';
import type { GameState } from '../engine/types';
import type { PurchaseResult, StoreTransaction } from '../services/iap';

const PACK = { id: 'test_pack2', title: 'Test pack', kind: 'hoursOfIncome', value: 2, fallbackPrice: '$1.99' };

const h = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  /** The game data the mocked active game hands over (rewritten per test). */
  raw: null as unknown,
  purchase: null as null | ((id: string) => Promise<PurchaseResult | boolean>),
  purchases: [] as string[],
  txs: [] as StoreTransaction[],
  listeners: [] as ((txs: StoreTransaction[]) => void)[],
  restoreIds: [] as string[],
  calls: { transactions: 0, onTransactions: 0, init: 0, setAudience: [] as unknown[] },
  lastFailure: null as null | 'failed' | 'unavailable',
  played: [] as string[],
  failWrites: false,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => h.storage.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      if (h.failWrites) throw new Error('disk full');
      h.storage.set(k, v);
    },
    removeItem: async (k: string) => void h.storage.delete(k),
  },
}));
// A getter: the factory's object outlives vi.resetModules, and each boot reads the data its test set.
vi.mock('../generated/activeGame', () => ({
  ACTIVE_GAME_ID: 'pizza-empire',
  get rawGame() {
    return h.raw;
  },
  fxTable: {},
  gameAssets: {},
  gameSounds: {},
  displayFontMetrics: null,
}));
vi.mock('../services/fx', () => ({ fx: { play: (k: string) => void h.played.push(k) } }));
vi.mock('../services/ads', () => ({
  ads: {
    showRewarded: async () => true,
    maybeShowInterstitial: () => {},
    init: () => void h.calls.init++,
    setAudience: (a: unknown) => void h.calls.setAudience.push(a),
    interstitials: true,
  },
}));
vi.mock('../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../services/iap', () => ({
  iap: {
    init: async () => {},
    owned: async () => [],
    get lastFailure() {
      return h.lastFailure;
    },
    purchase: async (p: { id: string }) => {
      h.purchases.push(p.id);
      return h.purchase ? h.purchase(p.id) : { ok: false };
    },
    restore: async () => h.restoreIds,
    transactions: async () => (h.calls.transactions++, h.txs),
    onTransactions: (fn: (txs: StoreTransaction[]) => void) => {
      h.calls.onTransactions++;
      h.listeners.push(fn);
      return () => {};
    },
  },
}));
vi.mock('../services/region', () => ({ detectRegion: async () => null }));

/** The double's own record in the save: when the save began, quotes waiting, transactions granted. */
interface Shop {
  createdMs: number;
  pending: { product: string; S: number; atMs: number }[];
  ledger: { txId: string; product: string; S: number; purchasedMs: number }[];
}
type WithShop = GameState & { shop: Shop };
const shopOf = (g: GameState) => (g as WithShop).shop;

const S_QUOTE = 7_200;
const T0 = Date.UTC(2026, 10, 26, 12, 0, 0);
let clock = T0;
const nextMoment = () => (clock += 30 * 86_400_000);

/** A test double of a mode: earns nothing; its grant follows 2.15.5 (ledger by txId, oldest quote, after the save's creation). */
function doubleMode(seams: Partial<EngineMode> = {}, withGrant = true): EngineMode {
  const mode: EngineMode = {
    id: 'sim',
    saveTag: 'grant1',
    create: (_c, b) => ({ ...b, shop: { createdMs: b.lastSavedAt, pending: [], ledger: [] } }) as GameState,
    reconcile: (_c, b, raw) => {
      const r = (raw as { shop?: Shop }).shop;
      return { ...b, shop: r ? { createdMs: r.createdMs, pending: [...r.pending], ledger: [...r.ledger] } : shopOf(b) } as GameState;
    },
    tick: (_c, s) => s,
    income: () => 0,
    activeIncome: () => 0,
    offline: (_c, s) => ({ seconds: 0, earnings: 0, game: s }),
    prestige: (_c, s) => s,
    ...seams,
  };
  if (withGrant)
    mode.grantProduct = (_c, s, productId, txId, purchasedMs) => {
      const shop = shopOf(s);
      if (shop.ledger.some((l) => l.txId === txId)) return s;
      if (!(purchasedMs > shop.createdMs)) return s;
      const i = shop.pending.findIndex((p) => p.product === productId);
      if (i < 0) return s;
      const q = shop.pending[i];
      return {
        ...s,
        cash: s.cash + q.S,
        shop: { ...shop, pending: shop.pending.filter((_, j) => j !== i), ledger: [...shop.ledger, { txId, product: productId, S: q.S, purchasedMs }] },
      } as GameState;
    };
  return mode;
}

const quote = (_c: unknown, g: GameState, now: number) => {
  const shop = shopOf(g);
  if (shop.pending.some((p) => p.product === PACK.id)) return g; // packPending: one quote per product
  return { ...g, shop: { ...shop, pending: [...shop.pending, { product: PACK.id, S: S_QUOTE, atMs: now }] } } as GameState;
};
const withdrawn: string[] = [];
const withdraw = (_c: unknown, g: GameState, outcome: string) => {
  withdrawn.push(outcome);
  const shop = shopOf(g);
  return { ...g, shop: { ...shop, pending: shop.pending.slice(0, -1) } } as GameState;
};

const KEY = 'save:pizza-empire:grant1';
const onDisk = () => JSON.parse(h.storage.get(KEY)!) as WithShop;

/** A fresh store module booted with `mode` on the given data, from the save in storage (if any). */
async function boot(mode: EngineMode | null, opts: { pack?: boolean; initOn?: 'boot' | 'firstOffer' } = {}) {
  vi.resetModules();
  const raw = JSON.parse(JSON.stringify(pizza));
  if (opts.pack !== false) raw.monetization.iap.products.push(PACK);
  if (opts.initOn) raw.monetization.ads.initOn = opts.initOn;
  h.raw = raw;
  const { installEngineMode } = await import('../engine/mode');
  installEngineMode(mode);
  const { useGame } = await import('./store');
  useGame.setState({ hydrated: false, offline: null });
  await useGame.getState().boot();
  const product = useGame.getState().cfg.monetization.iap.products.find((p) => p.id === PACK.id)!;
  return { useGame, product };
}

beforeEach(() => {
  const now = nextMoment();
  vi.useFakeTimers({ now, toFake: ['Date'] });
  h.storage.clear();
  h.purchase = null;
  h.purchases = [];
  h.txs = [];
  h.listeners = [];
  h.restoreIds = [];
  h.calls = { transactions: 0, onTransactions: 0, init: 0, setAudience: [] };
  h.lastFailure = null;
  h.played = [];
  h.failWrites = false;
  withdrawn.length = 0;
});

afterEach(async () => {
  vi.useRealTimers();
  (await import('../engine/mode')).installEngineMode(null);
});

describe('a hoursOfIncome product is granted exactly once by txId', () => {
  it('the purchase grants at the saved quote; the listener and the next start deliver it again and nothing more is granted', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    const at = Date.now() + 1000;
    h.purchase = async () => ({ ok: true, txId: 'tx-1', purchasedMs: at });
    expect(await useGame.getState().buyQuoted(product, quote, withdraw)).toBe('granted');
    expect(useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
    expect(shopOf(useGame.getState().game).ledger.map((l) => l.txId)).toEqual(['tx-1']);
    expect(shopOf(onDisk()).ledger.map((l) => l.txId), 'the grant is saved').toEqual(['tx-1']);
    // The listener delivers the same transaction (RevenueCat reports it after the purchase too).
    h.listeners.forEach((l) => l([{ productId: PACK.id, txId: 'tx-1', purchasedMs: at }]));
    expect(useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
    // The next start: the reconcile lists it once more.
    h.txs = [{ productId: PACK.id, txId: 'tx-1', purchasedMs: at }];
    const again = await boot(doubleMode());
    expect(again.useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
    expect(shopOf(again.useGame.getState().game).ledger).toHaveLength(1);
  });

  it('a second Buy while the first is on the sheet is refused, and no second sheet opens', async () => {
    const { useGame, product } = await boot(doubleMode());
    let release: (r: PurchaseResult) => void = () => {};
    h.purchase = () => new Promise((r) => (release = r));
    const first = useGame.getState().buyQuoted(product, quote, withdraw);
    await vi.waitFor(() => expect(h.purchases).toHaveLength(1));
    expect(await useGame.getState().buyQuoted(product, quote, withdraw)).toBe('refused');
    release({ ok: true, txId: 'tx-2', purchasedMs: Date.now() + 1 });
    expect(await first).toBe('granted');
    expect(h.purchases).toHaveLength(1);
  });
});

describe('the quote, the save and the sheet (B6)', () => {
  it('the quote is on disk before the store\'s sheet opens', async () => {
    const { useGame, product } = await boot(doubleMode());
    let seen: Shop | null = null;
    h.purchase = async () => {
      seen = shopOf(onDisk());
      return { ok: false };
    };
    await useGame.getState().buyQuoted(product, quote, withdraw);
    expect(seen).not.toBeNull();
    expect(seen!.pending).toEqual([{ product: PACK.id, S: S_QUOTE, atMs: expect.any(Number) }]);
  });

  it('a save that cannot be written opens no sheet and takes the quote back', async () => {
    const { useGame, product } = await boot(doubleMode());
    h.failWrites = true;
    expect(await useGame.getState().buyQuoted(product, quote, withdraw)).toBe('unsaved');
    expect(h.purchases).toEqual([]);
    expect(withdrawn).toEqual(['unsaved']);
    expect(shopOf(useGame.getState().game).pending).toEqual([]);
  });

  it('a quote the mode refuses opens no sheet', async () => {
    const { useGame, product } = await boot(doubleMode());
    const refuse = (_c: unknown, g: GameState) => g;
    expect(await useGame.getState().buyQuoted(product, refuse, withdraw)).toBe('refused');
    expect(h.purchases).toEqual([]);
  });

  it('the sheet cancelled: the quote is withdrawn, nothing granted; a store failure likewise, and says so', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => ({ ok: false });
    expect(await useGame.getState().buyQuoted(product, quote, withdraw)).toBe('cancelled');
    expect(shopOf(useGame.getState().game).pending).toEqual([]);
    expect(shopOf(onDisk()).pending, 'the withdrawal is saved').toEqual([]);
    h.purchase = async () => ((h.lastFailure = 'failed'), { ok: false });
    expect(await useGame.getState().buyQuoted(product, quote, withdraw)).toBe('failed');
    expect(withdrawn).toEqual(['cancelled', 'failed']);
    expect(h.played).toContain('ui_denied');
    expect(useGame.getState().game.cash).toBe(cash0);
  });

  it('the plain purchase action never opens a sheet for a hoursOfIncome product', async () => {
    const { useGame, product } = await boot(doubleMode());
    expect(await useGame.getState().purchase(product)).toBe(false);
    expect(h.purchases).toEqual([]);
  });
});

describe('approval later, kills and other saves', () => {
  it('a pending purchase keeps its quote and, approved hours later, reaches the mode with its own txId and purchasedMs', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => ({ ok: false, pending: true });
    expect(await useGame.getState().buyQuoted(product, quote, withdraw)).toBe('pending');
    expect(withdrawn).toEqual([]);
    expect(shopOf(onDisk()).pending).toHaveLength(1);
    // A second Buy while it waits: the mode's quote refuses it (packPending), no sheet.
    expect(await useGame.getState().buyQuoted(product, quote, withdraw)).toBe('refused');
    expect(h.purchases).toHaveLength(1);
    const approvedAt = Date.now() + 5 * 3_600_000;
    h.listeners.forEach((l) => l([{ productId: PACK.id, txId: 'tx-late', purchasedMs: approvedAt }]));
    const g = useGame.getState().game;
    expect(g.cash, 'the frozen quote, however late').toBe(cash0 + S_QUOTE);
    expect(shopOf(g).ledger).toEqual([{ txId: 'tx-late', product: PACK.id, S: S_QUOTE, purchasedMs: approvedAt }]);
    expect(shopOf(onDisk()).ledger, 'saved at once').toHaveLength(1);
  });

  it('killed between the sheet and the grant, or between the grant and the save: the next start grants it once', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    let atSheet = '';
    const at = Date.now() + 1000;
    h.purchase = async () => {
      atSheet = h.storage.get(KEY)!;
      return { ok: true, txId: 'tx-kill', purchasedMs: at };
    };
    await useGame.getState().buyQuoted(product, quote, withdraw);
    // The disk as a kill left it: before the grant, or after the grant but before its save (the same bytes).
    h.storage.set(KEY, atSheet);
    h.txs = [{ productId: PACK.id, txId: 'tx-kill', purchasedMs: at }];
    const next = await boot(doubleMode());
    expect(next.useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
    expect(shopOf(next.useGame.getState().game).ledger.map((l) => l.txId)).toEqual(['tx-kill']);
    // And once more from that start's save: nothing further.
    await next.useGame.getState().save();
    const third = await boot(doubleMode());
    expect(third.useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
  });

  it('a transaction of another save (dated before this save began, or with no quote here) is not granted', async () => {
    const { useGame } = await boot(doubleMode());
    const created = shopOf(useGame.getState().game).createdMs;
    const cash0 = useGame.getState().game.cash;
    await useGame.getState().save();
    h.txs = [
      { productId: PACK.id, txId: 'tx-old', purchasedMs: created - 1 },
      { productId: PACK.id, txId: 'tx-elsewhere', purchasedMs: created + 1 },
    ];
    const next = await boot(doubleMode());
    expect(next.useGame.getState().game.cash).toBe(cash0);
    expect(shopOf(next.useGame.getState().game).ledger).toEqual([]);
  });

  it('a restore on a new device restores the non-consumables as today and never a consumable', async () => {
    const { useGame } = await boot(doubleMode());
    h.restoreIds = ['pizza_express_pass', PACK.id, 'pizza_gems_100'];
    const gems0 = useGame.getState().game.gems;
    expect(await useGame.getState().restorePurchases()).toBe(1);
    const g = useGame.getState().game;
    expect(g.entitlements.products).toEqual(['pizza_express_pass']);
    expect(g.entitlements.skipRewarded).toBe(true);
    expect(g.gems).toBe(gems0);
    expect(shopOf(g).ledger).toEqual([]);
  });
});

describe('games and modes without the seams start, sell and restore as before', () => {
  it('a mode without grantProduct: no transaction list, no listener, the pack refused before any sheet', async () => {
    const { useGame, product } = await boot(doubleMode({}, false));
    expect(h.calls.transactions).toBe(0);
    expect(h.calls.onTransactions).toBe(0);
    expect(await useGame.getState().buyQuoted(product, quote, withdraw)).toBe('refused');
    expect(h.purchases).toEqual([]);
  });

  it('a game without a hoursOfIncome product: no transaction list, no listener, even with a mode that grants', async () => {
    await boot(doubleMode(), { pack: false });
    expect(h.calls.transactions).toBe(0);
    expect(h.calls.onTransactions).toBe(0);
  });

  it('no engine at all (Pizza Empire as shipped): its products sell through purchase as before', async () => {
    const { useGame } = await boot(null, { pack: false });
    h.purchase = async () => true; // the old boolean result still reads as paid
    const x2 = useGame.getState().cfg.monetization.iap.products.find((p) => p.id === 'pizza_express_pass')!;
    expect(await useGame.getState().purchase(x2)).toBe(true);
    expect(useGame.getState().game.entitlements.skipRewarded).toBe(true);
    expect(h.calls.transactions + h.calls.onTransactions).toBe(0);
    expect(h.calls.setAudience, 'no mode, no audience').toEqual([]);
  });
});

describe('the ad service at boot', () => {
  it('initOn absent: boot starts it, once, as today', async () => {
    await boot(null, { pack: false });
    expect(h.calls.init).toBe(1);
  });

  it("initOn 'firstOffer': boot starts nothing", async () => {
    await boot(null, { pack: false, initOn: 'firstOffer' });
    expect(h.calls.init).toBe(0);
  });

  it("the mode's age band reaches the ad service; a mode without adAudience hands nothing", async () => {
    let band: 'child' | 'teen' | null = 'child';
    const { useGame } = await boot(doubleMode({ adAudience: () => band }));
    expect(h.calls.setAudience.at(-1)).toBe('child');
    band = 'teen';
    // Any state change hands it over again (here: the quote of a Buy, then its withdrawal).
    h.purchase = async () => ({ ok: false });
    await useGame.getState().buyQuoted(useGame.getState().cfg.monetization.iap.products.find((p) => p.id === PACK.id)!, quote, withdraw);
    expect(h.calls.setAudience).toContain('teen');
    band = null;
    await useGame.getState().buyQuoted(useGame.getState().cfg.monetization.iap.products.find((p) => p.id === PACK.id)!, quote, withdraw);
    expect(h.calls.setAudience.at(-1)).toBeNull();
    h.calls.setAudience = [];
    await boot(doubleMode());
    expect(h.calls.setAudience).toEqual([]);
  });
});
