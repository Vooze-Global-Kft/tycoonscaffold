/// <reference types="node" />
/**
 * The shared shop seams of yard-stage2.md 2.15.4, 2.15.5 and 9.1 (`store-shared`), as RULING2 section 15
 * amends them (`store-fix`), mode-agnostic: a test double of a mode that follows section 15 to the letter
 * (quotes with their `known` ids and a state, OPEN or WAITING; a ledger by id; an own result to its own
 * quote; a later arrival to the OLDEST standing quote whose `known` lacks it; at most one open quote per
 * product; 24 hours of WAITING refuse a new Buy; a fresh listing withdraws a quote at least 72 hours
 * old that it shows nothing new for), on Pizza Empire's data with `hoursOfIncome` products and a look
 * added in memory. The real store runs under node with the native services replaced by stand-ins whose
 * purchase, listing and listener each test drives.
 *
 * Shown here: granted exactly once by id; no clock decides a grant; the purchase read through the
 * listing returned with it; a quote never granted with an id it knew; arrivals held while a sheet is
 * open and replayed after; a withdraw names its quote; a store error that may follow a charge keeps the
 * quote; a look waiting for approval says so and appears when approved; the check at start reads a
 * fresh listing and runs once more after the listener; one subscription per JS context; the quote on
 * disk before the sheet; the games and modes without the seams as before; initOn and the age band.
 * The block "after the attack" holds store-attack-money's six tests (A1 to A3, B1 to B3), moved here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import type { EngineMode, ProductArrival, ProductListing } from '../engine/mode';
import type { GameState } from '../engine/types';
import type { PurchaseResult, StoreListing, StoreTransaction } from '../services/iap';
import type { QuoteOutcome } from './store';

const PACK = { id: 'test_pack2', title: 'Test pack', kind: 'hoursOfIncome', value: 2, fallbackPrice: '$1.99' };
const PACK5 = { id: 'test_pack5', title: 'Test pack 5', kind: 'hoursOfIncome', value: 5, fallbackPrice: '$4.99' };
const LOOK = { id: 'test_look', title: 'Test look', kind: 'cosmetic', value: 1, fallbackPrice: '$1.99' };

const h = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  /** The game data the mocked active game hands over (rewritten per test). */
  raw: null as unknown,
  purchase: null as null | ((id: string) => Promise<PurchaseResult | boolean>),
  purchases: [] as string[],
  /** What the store's listing shows (every call of listing()). */
  txs: [] as StoreTransaction[],
  fresh: true,
  /** listing() answers null (the store cannot be asked). */
  unreachable: false,
  /** Awaited inside listing() before it reads `txs` (the n-th call), so a test can decide when a read answers. */
  gate: null as null | ((n: number) => Promise<void>),
  live: false,
  owned: [] as string[],
  listeners: [] as ((l: StoreListing) => void)[],
  restoreIds: [] as string[],
  calls: { listing: 0, onTransactions: 0, unsubscribed: 0, init: 0, setAudience: [] as unknown[] },
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
    owned: async () => h.owned,
    get live() {
      return h.live;
    },
    get lastFailure() {
      return h.lastFailure;
    },
    purchase: async (p: { id: string }) => {
      h.purchases.push(p.id);
      h.lastFailure = null;
      return h.purchase ? h.purchase(p.id) : { ok: false };
    },
    restore: async () => h.restoreIds,
    listing: async () => {
      const n = ++h.calls.listing;
      if (h.gate) await h.gate(n);
      return h.unreachable ? null : { txs: [...h.txs], fresh: h.fresh };
    },
    onTransactions: (fn: (l: StoreListing) => void) => {
      h.calls.onTransactions++;
      h.listeners.push(fn);
      return () => {
        h.calls.unsubscribed++;
        h.listeners = h.listeners.filter((l) => l !== fn);
      };
    },
  },
}));
vi.mock('../services/region', () => ({ detectRegion: async () => null }));

/** The double's own record in the save (RULING2 15.10: the contract's `{id, product, S, atMs, known, state}`). */
interface Quote {
  id: string;
  product: string;
  S: number;
  atMs: number;
  known: string[];
  state: 'open' | 'waiting';
}
interface Shop {
  createdMs: number;
  pending: Quote[];
  ledger: { txId: string; product: string; S: number; atMs: number; purchasedMs: number | null }[];
}
type WithShop = GameState & { shop: Shop };
const shopOf = (g: GameState) => (g as WithShop).shop;
const withShop = (g: GameState, shop: Shop) => ({ ...g, shop }) as GameState;

const S_OF: Record<string, number> = { [PACK.id]: 7_200, [PACK5.id]: 18_000 };
const S_QUOTE = S_OF[PACK.id];
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 10, 26, 12, 0, 0);
const WITHDRAW: readonly QuoteOutcome[] = ['cancelled', 'declined', 'unavailable', 'unsaved'];

/** The double's grant: section 15.5 to the letter. */
function grant(s: GameState, a: ProductArrival): GameState {
  const shop = shopOf(s);
  if (shop.ledger.some((l) => l.txId === a.txId)) return s;
  const q = a.own
    ? shop.pending.find((p) => p.product === a.productId && p.atMs === a.own!.atMs && !p.known.includes(a.txId))
    : [...shop.pending].sort((x, y) => x.atMs - y.atMs).find((p) => p.product === a.productId && !p.known.includes(a.txId));
  if (!q) return s;
  return withShop({ ...s, cash: s.cash + q.S }, {
    ...shop,
    pending: shop.pending.filter((p) => p !== q),
    ledger: [...shop.ledger, { txId: a.txId, product: a.productId, S: q.S, atMs: q.atMs, purchasedMs: a.purchasedMs }],
  });
}

/** The double's 15.6 withdrawal: a fresh listing, a quote 72 h old or more, nothing new for it. */
function sweep(s: GameState, l: ProductListing, now: number): GameState {
  if (!l.fresh) return s;
  const shop = shopOf(s);
  const granted = new Set(shop.ledger.map((x) => x.txId));
  const keep = shop.pending.filter((q) => now - q.atMs < 72 * HOUR || l.txs.some((t) => t.productId === q.product && !q.known.includes(t.txId) && !granted.has(t.txId)));
  return keep.length === shop.pending.length ? s : withShop(s, { ...shop, pending: keep });
}

/** A test double of a mode that earns nothing and sells by section 15. */
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
  if (withGrant) {
    mode.grantProduct = (_c, s, a) => grant(s, a);
    mode.afterListing = (_c, s, l, now) => sweep(s, l, now);
  }
  return mode;
}

/** The double's quote (15.3, 15.6): refused for 24 h while a WAITING quote of the product stands; a new Buy withdraws an older OPEN one. */
const quoteOf = (product: string) => (_c: unknown, g: GameState, now: number, known: readonly string[]) => {
  const shop = shopOf(g);
  if (shop.pending.some((p) => p.product === product && p.state === 'waiting' && now - p.atMs < DAY)) return g;
  const pending = shop.pending.filter((p) => !(p.product === product && p.state === 'open'));
  return withShop(g, { ...shop, pending: [...pending, { id: `q${now}`, product, S: S_OF[product], atMs: now, known: [...known], state: 'open' }] });
};
const quote = quoteOf(PACK.id);
const settled: [QuoteOutcome, string, number][] = [];
/** The double's settle: names its quote; withdraws on the outcomes that prove nothing was charged, else WAITING. */
const settle = (_c: unknown, g: GameState, outcome: QuoteOutcome, q: { product: string; atMs: number }) => {
  settled.push([outcome, q.product, q.atMs]);
  const shop = shopOf(g);
  const mine = shop.pending.find((p) => p.product === q.product && p.atMs === q.atMs);
  if (!mine) return g;
  const pending = WITHDRAW.includes(outcome) ? shop.pending.filter((p) => p !== mine) : shop.pending.map((p) => (p === mine ? { ...p, state: 'waiting' as const } : p));
  return withShop(g, { ...shop, pending });
};

const KEY = 'save:pizza-empire:grant1';
const onDisk = () => JSON.parse(h.storage.get(KEY)!) as WithShop;
const flush = () => new Promise((r) => setTimeout(r, 0));
const tx = (txId: string, productId = PACK.id, purchasedMs: number | null = Date.now()): StoreTransaction => ({ productId, txId, purchasedMs });
/** A paid sheet: the store's listing returned with it (the ids every later listing uses). */
const paid = (listed: StoreTransaction[], txId = 'GPA.result'): PurchaseResult => ({ ok: true, txId, purchasedMs: Date.now(), listed });
/** The listener reports the account's listing (never fresh). */
const deliver = (txs: StoreTransaction[]) => [...h.listeners].forEach((l) => l({ txs, fresh: false }));
const banners = (useGame: { getState(): { celebrations: { title: string; subtitle: string }[] } }) => useGame.getState().celebrations.map((c) => `${c.title}: ${c.subtitle}`);

/** A fresh store module booted with `mode` on the given data, from the save in storage (if any). */
async function boot(mode: EngineMode | null, opts: { pack?: boolean; initOn?: 'boot' | 'firstOffer' } = {}) {
  vi.resetModules();
  const raw = JSON.parse(JSON.stringify(pizza));
  if (opts.pack !== false) raw.monetization.iap.products.push(PACK, PACK5, LOOK);
  if (opts.initOn) raw.monetization.ads.initOn = opts.initOn;
  h.raw = raw;
  const { installEngineMode } = await import('../engine/mode');
  installEngineMode(mode);
  const { useGame } = await import('./store');
  useGame.setState({ hydrated: false, offline: null });
  await useGame.getState().boot();
  await flush(); // the listing read once more after the listener is subscribed
  const p = (id: string) => useGame.getState().cfg.monetization.iap.products.find((x) => x.id === id)!;
  return { useGame, product: p(PACK.id), p };
}

/** Buy, then the app is killed while the store's sheet is open: the disk as the kill left it. */
async function killAtSheet(useGame: Awaited<ReturnType<typeof boot>>['useGame'], product: Parameters<ReturnType<Awaited<ReturnType<typeof boot>>['useGame']['getState']>['buyQuoted']>[0], q = quote) {
  let atSheet = '';
  h.purchase = () => {
    atSheet = h.storage.get(KEY)!;
    return new Promise(() => {}); // never answers: the kill
  };
  void useGame.getState().buyQuoted(product, q, settle);
  await vi.waitFor(() => expect(atSheet).not.toBe(''));
  h.storage.set(KEY, atSheet);
}

beforeEach(() => {
  vi.useFakeTimers({ now: T0, toFake: ['Date'] });
  h.storage.clear();
  h.purchase = null;
  h.purchases = [];
  h.txs = [];
  h.fresh = true;
  h.unreachable = false;
  h.gate = null;
  h.live = false;
  h.owned = [];
  h.listeners = [];
  h.restoreIds = [];
  h.calls = { listing: 0, onTransactions: 0, unsubscribed: 0, init: 0, setAudience: [] };
  h.lastFailure = null;
  h.played = [];
  h.failWrites = false;
  settled.length = 0;
  delete (globalThis as Record<string, unknown>).__itfStoreTxUnsubscribe;
});

afterEach(async () => {
  vi.useRealTimers();
  (await import('../engine/mode')).installEngineMode(null);
});

describe('a hoursOfIncome product is granted exactly once by id', () => {
  it('the purchase grants at the saved quote; the listener and the next start list it again and nothing more is granted', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => paid([tx('tx-1')]);
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('granted');
    expect(useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
    expect(shopOf(useGame.getState().game).ledger.map((l) => l.txId)).toEqual(['tx-1']);
    expect(shopOf(onDisk()).ledger.map((l) => l.txId), 'the grant is saved').toEqual(['tx-1']);
    deliver([tx('tx-1')]);
    expect(useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
    h.txs = [tx('tx-1')];
    const again = await boot(doubleMode());
    expect(again.useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
    expect(shopOf(again.useGame.getState().game).ledger).toHaveLength(1);
  });

  it("the sheet's own result is the id the purchase's listing shows new against the quote's known, whatever id the result itself carries", async () => {
    const { useGame, product } = await boot(doubleMode());
    h.txs = [tx('o1_old')];
    h.purchase = async () => paid([tx('o1_old'), tx('o1_new')], 'GPA.9999');
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('granted');
    expect(shopOf(useGame.getState().game).ledger.map((l) => l.txId)).toEqual(['o1_new']);
  });

  it('a second Buy while the first is on the sheet is refused, and no second sheet opens', async () => {
    const { useGame, product } = await boot(doubleMode());
    let release: (r: PurchaseResult) => void = () => {};
    h.purchase = () => new Promise((r) => (release = r));
    const first = useGame.getState().buyQuoted(product, quote, settle);
    await vi.waitFor(() => expect(h.purchases).toHaveLength(1));
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('refused');
    release(paid([tx('tx-2')]));
    expect(await first).toBe('granted');
    expect(h.purchases).toHaveLength(1);
  });
});

describe('the quote, the save and the sheet (B6, 15.3, 15.4)', () => {
  it("the quote is on disk before the store's sheet opens, with the product's known ids", async () => {
    const { useGame, product } = await boot(doubleMode());
    h.txs = [tx('old-1'), tx('look-1', LOOK.id)];
    let seen: Shop | null = null;
    h.purchase = async () => {
      seen = shopOf(onDisk());
      return { ok: false };
    };
    await useGame.getState().buyQuoted(product, quote, settle);
    expect(seen).not.toBeNull();
    expect(seen!.pending).toEqual([{ id: `q${T0}`, product: PACK.id, S: S_QUOTE, atMs: T0, known: ['old-1'], state: 'open' }]);
  });

  it('a real store that cannot be asked opens no sheet and makes no quote ("Nothing was charged")', async () => {
    const { useGame, product } = await boot(doubleMode());
    h.live = true;
    h.unreachable = true;
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('failed');
    expect(h.purchases).toEqual([]);
    expect(shopOf(useGame.getState().game).pending).toEqual([]);
    expect(banners(useGame)).toEqual(['Store not reachable: The store cannot be reached. Nothing was charged.']);
  });

  it('the simulated store (Expo Go: listing null, not live) still sells, with known empty', async () => {
    const { useGame, product } = await boot(doubleMode());
    h.unreachable = true;
    h.purchase = async () => paid([tx('sim:test_pack2:1:1')], 'sim:test_pack2:1:1');
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('granted');
  });

  it('a save that cannot be written opens no sheet and takes that quote back', async () => {
    const { useGame, product } = await boot(doubleMode());
    h.failWrites = true;
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('unsaved');
    expect(h.purchases).toEqual([]);
    expect(settled).toEqual([['unsaved', PACK.id, T0]]);
    expect(shopOf(useGame.getState().game).pending).toEqual([]);
  });

  it('a quote the mode refuses opens no sheet', async () => {
    const { useGame, product } = await boot(doubleMode());
    const refuse = (_c: unknown, g: GameState) => g;
    expect(await useGame.getState().buyQuoted(product, refuse, settle)).toBe('refused');
    expect(h.purchases).toEqual([]);
  });

  it('cancelled, refused by the store, or unavailable: the quote is withdrawn, nothing granted, and only these say "Nothing was charged"', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => ({ ok: false });
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('cancelled');
    expect(shopOf(useGame.getState().game).pending).toEqual([]);
    expect(shopOf(onDisk()).pending, 'the withdrawal is saved').toEqual([]);
    expect(banners(useGame), 'a cancel says nothing').toEqual([]);
    h.purchase = async () => ((h.lastFailure = 'failed'), { ok: false }); // PURCHASE_NOT_ALLOWED and the like
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('failed');
    h.purchase = async () => ((h.lastFailure = 'unavailable'), { ok: false });
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('failed');
    expect(settled.map((x) => x[0])).toEqual(['cancelled', 'declined', 'unavailable']);
    expect(shopOf(useGame.getState().game).pending).toEqual([]);
    expect(banners(useGame).every((b) => b.includes('Nothing was charged'))).toBe(true);
    expect(useGame.getState().game.cash).toBe(cash0);
  });

  it('the plain purchase action never opens a sheet for a hoursOfIncome product', async () => {
    const { useGame, product } = await boot(doubleMode());
    expect(await useGame.getState().purchase(product)).toBe(false);
    expect(h.purchases).toEqual([]);
  });
});

describe('approval later, kills, other saves, old quotes (15.5, 15.6)', () => {
  it('a pending purchase keeps its quote WAITING and, approved hours later, reaches it at the frozen S', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => ({ ok: false, pending: true });
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('pending');
    expect(settled).toEqual([['pending', PACK.id, T0]]);
    expect(shopOf(onDisk()).pending.map((q) => q.state)).toEqual(['waiting']);
    expect(banners(useGame)).toEqual(['Waiting for approval: The purchase arrives here once it is approved.']);
    // A second Buy within 24 hours: the mode refuses it, no sheet.
    vi.setSystemTime(T0 + 23 * HOUR);
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('refused');
    expect(h.purchases).toHaveLength(1);
    deliver([tx('tx-late')]);
    const g = useGame.getState().game;
    expect(g.cash, 'the frozen quote, however late').toBe(cash0 + S_QUOTE);
    expect(shopOf(g).ledger.map((l) => [l.txId, l.S, l.atMs])).toEqual([['tx-late', S_QUOTE, T0]]);
    expect(shopOf(onDisk()).ledger, 'saved at once').toHaveLength(1);
  });

  it('after 24 hours of WAITING a new Buy gets its own quote; an approval arriving while its sheet is open is held, and both land on the right quote', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => ({ ok: false, pending: true });
    await useGame.getState().buyQuoted(product, quote, settle);
    vi.setSystemTime(T0 + 25 * HOUR);
    h.purchase = async () => {
      deliver([tx('tx-approved')]); // the first one's approval, while the second sheet is open
      expect(useGame.getState().game.cash, 'held while the sheet is open').toBe(cash0);
      return paid([tx('tx-approved'), tx('tx-new')], 'tx-new');
    };
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('granted');
    const shop = shopOf(useGame.getState().game);
    expect(shop.ledger.map((l) => [l.txId, l.atMs])).toEqual([
      ['tx-new', T0 + 25 * HOUR],
      ['tx-approved', T0],
    ]);
    expect(shop.pending).toEqual([]);
    expect(useGame.getState().game.cash).toBe(cash0 + 2 * S_QUOTE);
  });

  it('killed between the sheet and the grant, or between the grant and the save: the next start grants it once', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    let atSheet = '';
    h.purchase = async () => {
      atSheet = h.storage.get(KEY)!;
      return paid([tx('tx-kill')]);
    };
    await useGame.getState().buyQuoted(product, quote, settle);
    h.storage.set(KEY, atSheet);
    h.txs = [tx('tx-kill')];
    const next = await boot(doubleMode());
    expect(next.useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
    expect(shopOf(next.useGame.getState().game).ledger.map((l) => l.txId)).toEqual(['tx-kill']);
    await next.useGame.getState().save();
    const third = await boot(doubleMode());
    expect(third.useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
  });

  it('a transaction with no standing quote, or one the quote already knew, is not granted (another save)', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    deliver([tx('tx-elsewhere')]);
    expect(useGame.getState().game.cash, 'no quote').toBe(cash0);
    h.txs = [tx('tx-before')];
    await killAtSheet(useGame, product);
    const next = await boot(doubleMode());
    expect(next.useGame.getState().game.cash, 'the quote knew it').toBe(cash0);
    expect(shopOf(next.useGame.getState().game).pending.map((q) => q.known)).toEqual([['tx-before']]);
  });

  it('at most one OPEN quote per product: a new Buy withdraws the one a kill left, and a purchase that did complete arrives at the newer quote', async () => {
    const first = await boot(doubleMode());
    const cash0 = first.useGame.getState().game.cash;
    await killAtSheet(first.useGame, first.product);
    const next = await boot(doubleMode());
    vi.setSystemTime(T0 + HOUR);
    h.purchase = async () => ({ ok: false, pending: true });
    await next.useGame.getState().buyQuoted(next.product, quote, settle);
    expect(shopOf(next.useGame.getState().game).pending.map((q) => q.atMs)).toEqual([T0 + HOUR]);
    deliver([tx('tx-from-the-killed-sheet')]);
    expect(next.useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
  });

  it('a fresh listing withdraws a standing quote 72 hours old that it shows nothing new for; the listener (not fresh) and a younger quote never', async () => {
    const { useGame, product } = await boot(doubleMode());
    h.purchase = async () => ({ ok: false, pending: true });
    await useGame.getState().buyQuoted(product, quote, settle);
    vi.setSystemTime(T0 + 71 * HOUR);
    await boot(doubleMode());
    expect(shopOf(onDisk()).pending, '71 hours: stands').toHaveLength(1);
    vi.setSystemTime(T0 + 73 * HOUR);
    const late = await boot(doubleMode({}, true));
    deliver([]);
    expect(shopOf(late.useGame.getState().game).pending, 'fresh listing at start, 73 hours: withdrawn').toEqual([]);
    // The same from the listener alone stands.
    h.storage.clear();
    vi.setSystemTime(T0);
    const again = await boot(doubleMode());
    await again.useGame.getState().buyQuoted(again.product, quote, settle);
    vi.setSystemTime(T0 + 80 * HOUR);
    deliver([]);
    expect(shopOf(again.useGame.getState().game).pending, 'the listener is not fresh').toHaveLength(1);
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

describe('the check at start and the listener (15.8)', () => {
  it('the check reads a fresh listing before the first frame and once more after the listener is subscribed', async () => {
    await boot(doubleMode());
    expect(h.calls.listing).toBe(2);
    expect(h.calls.onTransactions).toBe(1);
  });

  it('an approval that lands between the check and the subscription is granted by the second read', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => ({ ok: false, pending: true });
    await useGame.getState().buyQuoted(product, quote, settle);
    vi.resetModules();
    const raw = JSON.parse(JSON.stringify(pizza));
    raw.monetization.iap.products.push(PACK, PACK5, LOOK);
    h.raw = raw;
    (await import('../engine/mode')).installEngineMode(doubleMode());
    const { useGame: g2 } = await import('./store');
    let open: () => void = () => {};
    const second = new Promise<void>((r) => (open = r));
    const before = h.calls.listing;
    h.gate = (n) => (n === before + 2 ? second : Promise.resolve());
    g2.setState({ hydrated: false, offline: null });
    await g2.getState().boot(); // the check ran with an empty listing
    expect(g2.getState().game.cash).toBe(cash0);
    h.txs = [tx('tx-gap')]; // approved now, before the second read answers
    open();
    await flush();
    expect(g2.getState().game.cash).toBe(cash0 + S_QUOTE);
  });

  it('a store made again (a development reload) removes the earlier subscription: one per JS context', async () => {
    await boot(doubleMode());
    expect(h.listeners).toHaveLength(1);
    await boot(doubleMode());
    expect(h.calls.unsubscribed).toBe(1);
    expect(h.listeners).toHaveLength(1);
  });
});

describe('looks and No ad videos on the grant route (15.7)', () => {
  it('waiting for approval says so (not "did not go through"), and the look appears when its approval arrives', async () => {
    const { useGame, p } = await boot(doubleMode());
    h.purchase = async () => ((h.lastFailure = 'failed'), { ok: false, pending: true });
    await useGame.getState().purchase(p(LOOK.id));
    expect(banners(useGame)).toEqual(['Waiting for approval: The purchase arrives here once it is approved.']);
    deliver([tx('tx-look', LOOK.id)]);
    expect(useGame.getState().game.entitlements.products).toContain(LOOK.id);
    expect(shopOf(onDisk()) && JSON.parse(h.storage.get(KEY)!).entitlements.products, 'saved').toContain(LOOK.id);
  });

  it('No ad videos approved later takes effect at once; a store error that may follow a charge says "not confirmed"', async () => {
    const { useGame } = await boot(doubleMode());
    const x2 = useGame.getState().cfg.monetization.iap.products.find((x) => x.id === 'pizza_express_pass')!;
    h.purchase = async () => ((h.lastFailure = 'failed'), { ok: false, unconfirmed: true });
    await useGame.getState().purchase(x2);
    expect(banners(useGame)).toEqual(['Not confirmed yet: The store has not confirmed this purchase yet. If you were charged, it arrives when it does.']);
    deliver([tx('tx-x2', x2.id)]);
    expect(useGame.getState().game.entitlements.skipRewarded).toBe(true);
  });
});

describe('after the attack (store-attack-money A1 to A3, B1 to B3, moved here)', () => {
  it("A1: a listed transaction that is not this sheet's arrives while it is open, then the sheet is cancelled: no scrip, and the other pack's waiting quote still stands for its approval", async () => {
    const { useGame, p } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => ({ ok: false, pending: true });
    expect(await useGame.getState().buyQuoted(p(PACK5.id), quoteOf(PACK5.id), settle)).toBe('pending');
    h.purchase = async () => {
      deliver([tx('rc-other', PACK.id, Date.now() + 1000)]);
      return { ok: false };
    };
    expect(await useGame.getState().buyQuoted(p(PACK.id), quoteOf(PACK.id), settle)).toBe('cancelled');
    const g = useGame.getState().game;
    expect(g.cash, 'nothing was paid for this sheet: no scrip').toBe(cash0);
    expect(shopOf(g).pending.map((q) => q.product), "pack 5's quote still stands for its approval").toEqual([PACK5.id]);
    deliver([tx('rc-other', PACK.id), tx('tx-pack5', PACK5.id)]);
    expect(useGame.getState().game.cash, "pack 5's approval lands on pack 5's quote").toBe(cash0 + S_OF[PACK5.id]);
  });

  it('A2: the clock a day behind at creation; killed at the sheet (nothing paid): the next start does not grant the quote with an older purchase', async () => {
    vi.setSystemTime(T0 - DAY);
    const first = await boot(doubleMode());
    await first.useGame.getState().save();
    vi.setSystemTime(T0);
    const cash0 = first.useGame.getState().game.cash;
    // The account's history: one pack 2 from an hour ago, listed at Buy as at every later read.
    h.txs = [tx('rc-earlier', PACK.id, T0 - HOUR)];
    await killAtSheet(first.useGame, first.p(PACK.id));
    const next = await boot(doubleMode());
    expect(next.useGame.getState().game.cash, 'nothing was paid after the quote').toBe(cash0);
  });

  it('A3: the purchase result and the listing name one purchase with two ids: one payment, one grant', async () => {
    const first = await boot(doubleMode());
    const cash0 = first.useGame.getState().game.cash;
    h.purchase = async () => paid([tx('o1_abcdef')], 'GPA.1234-5678');
    expect(await first.useGame.getState().buyQuoted(first.p(PACK.id), quoteOf(PACK.id), settle)).toBe('granted');
    await killAtSheet(first.useGame, first.p(PACK.id));
    h.txs = [tx('o1_abcdef')];
    const next = await boot(doubleMode());
    expect(next.useGame.getState().game.cash, 'one payment, one grant').toBe(cash0 + S_OF[PACK.id]);
  });

  it('B1: the store fails in a way that may follow a charge (NETWORK_ERROR): the quote stays, and the transaction that arrives later is granted', async () => {
    const { useGame, p } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => ((h.lastFailure = 'failed'), { ok: false, unconfirmed: true });
    expect(await useGame.getState().buyQuoted(p(PACK.id), quoteOf(PACK.id), settle)).toBe('unconfirmed');
    expect(banners(useGame).join(' ')).not.toContain('Nothing was charged');
    expect(banners(useGame)).toEqual(['Not confirmed yet: The store has not confirmed this purchase yet. If you were charged, it arrives when it does.']);
    deliver([tx('tx-charged', PACK.id, Date.now() + 1000)]);
    expect(useGame.getState().game.cash, 'paid, so granted').toBe(cash0 + S_OF[PACK.id]);
  });

  it("B2: the clock a day ahead when the save was created, then set right: this save's own sheet is granted (no clock decides a grant)", async () => {
    vi.setSystemTime(T0 + DAY);
    const first = await boot(doubleMode());
    await first.useGame.getState().save();
    vi.setSystemTime(T0);
    const cash0 = first.useGame.getState().game.cash;
    h.purchase = async () => paid([tx('tx-real', PACK.id, Date.now())]);
    const out = await first.useGame.getState().buyQuoted(first.p(PACK.id), quoteOf(PACK.id), settle);
    expect({ out, cash: first.useGame.getState().game.cash }).toEqual({ out: 'granted', cash: cash0 + S_OF[PACK.id] });
  });

  it('B3: a look bought with Ask to Buy: no "did not go through", and the approval reaching the listener grants it', async () => {
    const { useGame, p } = await boot(doubleMode());
    h.purchase = async () => ((h.lastFailure = 'failed'), { ok: false, pending: true });
    await useGame.getState().purchase(p(LOOK.id));
    const said = banners(useGame);
    deliver([tx('tx-look', LOOK.id, Date.now() + HOUR)]);
    expect({ failed: said.some((b) => b.startsWith('Purchase did not go through')), owned: useGame.getState().game.entitlements.products.includes(LOOK.id) }).toEqual({ failed: false, owned: true });
  });

  it("another product's arrival in the listing returned with a pack's sheet is handed over once that sheet has answered", async () => {
    const { useGame, p } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => ({ ok: false, pending: true });
    await useGame.getState().buyQuoted(p(PACK5.id), quoteOf(PACK5.id), settle);
    h.purchase = async () => paid([tx('tx-2'), tx('tx-5', PACK5.id), tx('tx-look', LOOK.id)], 'tx-2');
    expect(await useGame.getState().buyQuoted(p(PACK.id), quoteOf(PACK.id), settle)).toBe('granted');
    const g = useGame.getState().game;
    expect(g.cash).toBe(cash0 + S_OF[PACK.id] + S_OF[PACK5.id]);
    expect(g.entitlements.products).toContain(LOOK.id);
  });

  it('paid, but the listing returned with it does not show the purchase yet: the quote stays WAITING and the listener brings it to that quote', async () => {
    const { useGame, product } = await boot(doubleMode());
    const cash0 = useGame.getState().game.cash;
    h.purchase = async () => paid([], 'GPA.x');
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('unconfirmed');
    expect(shopOf(useGame.getState().game).pending.map((q) => q.state)).toEqual(['waiting']);
    deliver([tx('o1_x')]);
    expect(useGame.getState().game.cash).toBe(cash0 + S_QUOTE);
  });
});

describe('games and modes without the seams start, sell and restore as before', () => {
  it('a mode without grantProduct: no listing, no listener, the pack refused before any sheet', async () => {
    const { useGame, product } = await boot(doubleMode({}, false));
    expect(h.calls.listing).toBe(0);
    expect(h.calls.onTransactions).toBe(0);
    expect(await useGame.getState().buyQuoted(product, quote, settle)).toBe('refused');
    expect(h.purchases).toEqual([]);
  });

  it('a game without a hoursOfIncome product: no listing, no listener, even with a mode that grants', async () => {
    await boot(doubleMode(), { pack: false });
    expect(h.calls.listing).toBe(0);
    expect(h.calls.onTransactions).toBe(0);
  });

  it('no engine at all (Pizza Empire as shipped): its products sell through purchase as before, and a pending one still says what it said', async () => {
    const { useGame } = await boot(null, { pack: false });
    h.purchase = async () => true; // the old boolean result still reads as paid
    const x2 = useGame.getState().cfg.monetization.iap.products.find((p) => p.id === 'pizza_express_pass')!;
    expect(await useGame.getState().purchase(x2)).toBe(true);
    expect(useGame.getState().game.entitlements.skipRewarded).toBe(true);
    const gems = useGame.getState().cfg.monetization.iap.products.find((p) => p.kind === 'gems')!;
    h.purchase = async () => ((h.lastFailure = 'failed'), { ok: false, pending: true });
    expect(await useGame.getState().purchase(gems)).toBe(false);
    h.purchase = async () => ((h.lastFailure = 'failed'), { ok: false, unconfirmed: true });
    expect(await useGame.getState().purchase(gems)).toBe(false);
    expect(banners(useGame)).toEqual([
      'Purchase did not go through: Nothing was charged. Please try again later.',
      'Purchase did not go through: Nothing was charged. Please try again later.',
    ]);
    expect(h.calls.listing + h.calls.onTransactions).toBe(0);
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
    useGame.setState({ game: { ...useGame.getState().game, cash: 1 } });
    expect(h.calls.setAudience.at(-1)).toBe('teen');
    band = null;
    useGame.setState({ game: { ...useGame.getState().game, cash: 2 } });
    expect(h.calls.setAudience.at(-1)).toBeNull();
    h.calls.setAudience = [];
    await boot(doubleMode());
    expect(h.calls.setAudience).toEqual([]);
  });
});
