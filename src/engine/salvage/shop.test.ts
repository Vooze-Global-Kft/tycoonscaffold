/**
 * The shop's rules on the REAL mode (yard-stage2.md 2.15, 8.1 row 2.15; RULING2 15 to 15.13; owner rules-money):
 * the quote, the pending list, headroom, the grant to the right quote, the ledger, the 24 and the 72 hours, who
 * sees packs, the age band, the code. Each a pure function of the save (15.10). The shared store's tests hold a
 * double of a mode (src/state/store.grant.test.ts); here the SAME stories (its six attack cases A1 to B3 and
 * ruling 15.12's A to E) run on the salvage mode's own hooks, called in the order the shared store calls them
 * (quote, settle, grantProduct with `own` for the sheet's result, grantProduct with `own` null for every
 * later arrival, afterListing after every listing). Frozen test content (fixtures/salvage2money.ts shopCfg,
 * the works' test content with the product list); every S is read from the rules, never pinned.
 */
import { describe, expect, it } from 'vitest';
import { salvageEngineMode } from '../salvageMode';
import { shopCfg, shopGame, SHOP_NOW, u13Game } from '../fixtures/salvage2money';
import { quotePack, setAgeBand, setPacksHidden, settleQuote } from './actionsMoney';
import { cardOf } from './cards';
import { noteSeen } from './actions';
import { reconcileSalvage } from './save';
import { ageBandOf, codeHash, EXPIRE_MS, expireState, headroomU, HOUR_MS, packHours, packS, quoteFn, settleState, standingS, WAIT_MS } from './shop';
import type { GameConfig } from '../../config/schema';
import type { GameState } from '../types';
import type { ProductArrival, QuoteOutcome, SalvageEvent, SalvageGame } from './types';

const cfg = shopCfg();
const US = { country: 'US' };
const T0 = SHOP_NOW;
const DAY = 24 * HOUR_MS;
/** r4 with no cash, so the small packs are inside headroom (U is what the cards sell next, not the cash). */
const g0 = (): SalvageGame => shopGame({ cash: 0 });
const S2 = packS(cfg, g0(), packHours(cfg, 'pack2')!);
const S5 = packS(cfg, g0(), packHours(cfg, 'pack5')!);

// ---- the shared store's calls, as src/state/store.ts buyQuoted makes them (no store, no clock of its own)
const quote = (g: SalvageGame, product: string, now: number, known: string[] = [], askedMs = now, shownS = packS(cfg, g, packHours(cfg, product)!), ev?: SalvageEvent[]) => quotePack(cfg, g, product, shownS, now, known, askedMs, g.salvage.t, ev, US);
const settle = (g: SalvageGame, outcome: QuoteOutcome, product: string, atMs: number) => settleQuote(cfg, g, outcome, { product, atMs });
const arrive = (g: SalvageGame, productId: string, txId: string, own: { atMs: number } | null = null): SalvageGame => salvageEngineMode.grantProduct!(cfg as unknown as GameConfig, g as GameState, { productId, txId, purchasedMs: null, own } satisfies ProductArrival) as SalvageGame;
const listing = (g: SalvageGame, txs: [string, string][], fresh: boolean, requestMs: number | null, now = T0) => {
  let out = g;
  for (const [productId, txId] of txs) out = arrive(out, productId, txId);
  return salvageEngineMode.afterListing!(cfg as unknown as GameConfig, out as GameState, { txs: txs.map(([productId, txId]) => ({ productId, txId, purchasedMs: null })), fresh, requestMs }, now) as SalvageGame;
};
/** A save written and read back (a kill keeps what was on disk). */
const reload = (g: SalvageGame): SalvageGame => reconcileSalvage(cfg, { ...g, salvage: undefined } as unknown as GameState, JSON.parse(JSON.stringify(g)), g.salvage.clock.highMs);
const pending = (g: SalvageGame) => g.salvage.iap.pending.map((q) => [q.product, q.state, q.atMs]);

describe('the quote (2.15.4; 15.3, 15.12)', () => {
  it('a quote is {id q<n>, product, S, I, atMs, askedMs, known, state open} appended to the end of iap.pending, at S = roundMoney(H × I)', () => {
    const g = quote(g0(), 'pack2', T0, ['old1'], T0 - 5_000);
    const g2 = quote(g, 'pack2', T0 + 1, [], T0);
    expect(g2.salvage.iap.pending.map((q) => ({ id: q.id, product: q.product, S: q.S, atMs: q.atMs, askedMs: q.askedMs, known: q.known, state: q.state }))).toEqual([
      { id: 'q1', product: 'pack2', S: S2, atMs: T0, askedMs: T0 - 5_000, known: ['old1'], state: 'open' },
      { id: 'q2', product: 'pack2', S: S2, atMs: T0 + 1, askedMs: T0, known: [], state: 'open' },
    ]);
    expect(g2.salvage.iap.pending[0].I).toBeGreaterThan(0);
  });

  it('refusals keep the SAME object: a changed S (quoteUpdated with a → b and a retry), above headroom (packHeadroom), packs off (packOff)', () => {
    const ev: SalvageEvent[] = [];
    const g = g0();
    expect(quote(g, 'pack2', T0, [], T0, S2 + 1, ev)).toBe(g);
    expect(ev).toEqual([
      { type: 'quoteUpdated', product: 'pack2', a: S2 + 1, b: S2 },
      { type: 'refused', key: 'quoteUpdated', args: { a: { money: S2 + 1 }, b: { money: S2 } }, retry: { act: 'buyPack', product: 'pack2', S: S2 } },
    ]);
    const rich = shopGame({ cash: headroomU(cfg, g) });
    const ev2: SalvageEvent[] = [];
    expect(quotePack(cfg, rich, 'pack2', S2, T0, [], T0, 0, ev2, US)).toBe(rich);
    expect(ev2.at(-1)).toMatchObject({ key: 'packHeadroom' });
    const ev3: SalvageEvent[] = [];
    expect(quotePack(cfg, g, 'pack2', S2, T0, [], T0, 0, ev3, { country: 'DE' })).toBe(g);
    expect(quotePack(cfg, g, 'pack2', S2, T0, [], T0, 0, ev3)).toBe(g);
    expect(quotePack(cfg, g, 'colour1', S2, T0, [], T0, 0, ev3, US)).toBe(g);
    expect(ev3.map((e) => e.type === 'refused' && e.key)).toEqual(['packOff', 'packOff', 'packOff']);
  });

  it('headroom counts every standing quote, open and waiting, of every product, a superseded open one included (E10)', () => {
    const U = headroomU(cfg, g0());
    expect(S2 * 2).toBeLessThanOrEqual(U);
    let g = quote(g0(), 'pack2', T0);
    g = quote(g, 'pack2', T0 + 1); // supersedes nothing: both stand
    expect(standingS(g)).toBeCloseTo(2 * S2, 2);
    const room = U - 2 * S2;
    const ev: SalvageEvent[] = [];
    const third = quotePack(cfg, g, 'pack2', S2, T0 + 2, [], T0, 0, ev, US);
    if (room >= S2) expect(third).not.toBe(g);
    else expect(ev.at(-1)).toMatchObject({ key: 'packHeadroom' });
    // A pack whose S alone is above U is never offered.
    const S20 = packS(cfg, g0(), packHours(cfg, 'pack20')!);
    expect(S20).toBeGreaterThan(U);
    const rows = cardOf(cfg, g0(), { kind: 'shop' }, T0, US).shop!.packs!;
    expect(rows.find((r) => r.product === 'pack20')).toMatchObject({ state: 'noRoom', button: null, S: S20 });
    expect(rows.find((r) => r.product === 'pack2')).toMatchObject({ state: 'offer', S: S2, button: { action: { act: 'buyPack', product: 'pack2', S: S2 } } });
    // a standing quote takes its S out of the room the next row has
    const full = quote(quote(quote(g0(), 'pack10', T0), 'pack10', T0 + 1), 'pack5', T0 + 2);
    const left = U - standingS(full);
    const r2 = cardOf(cfg, full, { kind: 'shop' }, T0 + 3, US).shop!.packs!.find((r) => r.product === 'pack2')!;
    expect(r2.state).toBe(left >= S2 ? 'offer' : 'noRoom');
  });

  it('a new Buy never withdraws an older quote; at most iap.maxStanding (3) quotes of a pack stand, a fourth Buy refused with packPending while another pack still sells', () => {
    const big = shopGame({ cash: 0 });
    const cfgBig = cfg;
    let g = big;
    const many = (gg: SalvageGame, at: number) => quotePack(cfgBig, gg, 'pack2', S2, at, [], T0, 0, undefined, US);
    // Headroom permitting, three quotes; the fourth is refused for the count, not the room (U raised by hand: a yard with more for sale).
    const U = headroomU(cfg, big);
    if (3 * S2 + S2 > U) {
      // the test content's U is small: lift it by testing quoteCheck through the count only (three standing, room left by stripping S)
      g = { ...big, salvage: { ...big.salvage, iap: { ...big.salvage.iap, pending: [1, 2, 3].map((n) => ({ id: `q${n}`, product: 'pack2', S: 0, I: 1, atMs: T0 + n, askedMs: T0, known: [], state: 'open' as const, wait: null })) } } };
    } else for (const at of [T0, T0 + 1, T0 + 2]) g = many(g, at);
    expect(g.salvage.iap.pending.filter((q) => q.product === 'pack2')).toHaveLength(3);
    const ev: SalvageEvent[] = [];
    expect(quotePack(cfg, g, 'pack2', S2, T0 + 10, [], T0, 0, ev, US)).toBe(g);
    expect(ev.at(-1)).toMatchObject({ key: 'packPending' });
    const pack10 = { ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap } } };
    expect(cardOf(cfg, pack10, { kind: 'shop' }, T0, US).shop!.packs!.find((r) => r.product === 'pack2')!.state).toBe('waiting');
  });

  it('a WAITING quote refuses Buy (packPending) for 24 hours of the device clock and not after; a clock earlier than its atMs counts as elapsed; the old quote keeps standing', () => {
    let g = settle(quote(g0(), 'pack2', T0), 'pending', 'pack2', T0);
    expect(pending(g)).toEqual([['pack2', 'waiting', T0]]);
    const ev: SalvageEvent[] = [];
    expect(quote(g, 'pack2', T0 + WAIT_MS - 1, [], T0, S2, ev)).toBe(g);
    expect(ev.at(-1)).toMatchObject({ key: 'packPending' });
    const after = quote(g, 'pack2', T0 + WAIT_MS);
    expect(pending(after)).toEqual([['pack2', 'waiting', T0], ['pack2', 'open', T0 + WAIT_MS]]);
    // The clock a year ahead when the waiting quote was made, then set right: Buy at once (15.12 c).
    g = settle(quote(g0(), 'pack2', T0 + 365 * DAY), 'pending', 'pack2', T0 + 365 * DAY);
    expect(pending(quote(g, 'pack2', T0 + HOUR_MS))).toEqual([['pack2', 'waiting', T0 + 365 * DAY], ['pack2', 'open', T0 + HOUR_MS]]);
    // The row says why: "Waiting for approval" (pending) or the store's "not confirmed" words (unconfirmed), no Buy.
    const un = settle(quote(g0(), 'pack2', T0), 'unconfirmed', 'pack2', T0);
    expect(cardOf(cfg, un, { kind: 'shop' }, T0 + 1, US).shop!.packs![0]).toMatchObject({ state: 'unconfirmed', button: null });
    expect(cardOf(cfg, settle(quote(g0(), 'pack2', T0), 'pending', 'pack2', T0), { kind: 'shop' }, T0 + 1, US).shop!.packs![0]).toMatchObject({ state: 'waiting', button: null });
  });
});

describe('settle: the named quote and only it (15.4, 15.13 b)', () => {
  it('a cancel, a store refusal, no sheet and an unwritten save withdraw THAT quote, each with quoteWithdrawn and its why; the other quotes stand; a quote no longer standing: the same object', () => {
    let g = quote(quote(g0(), 'pack2', T0), 'pack2', T0 + 1);
    const ev: SalvageEvent[] = [];
    const out = (o: QuoteOutcome, at: number) => {
      const r = (settleQuote as unknown as (...a: unknown[]) => SalvageGame)(cfg, g, o, { product: 'pack2', atMs: at });
      return r;
    };
    for (const o of ['cancelled', 'declined', 'unavailable', 'unsaved'] as const) {
      const r = out(o, T0);
      expect(pending(r)).toEqual([['pack2', 'open', T0 + 1]]);
    }
    // events through the shop's own function
    settleState(cfg, g, 'cancelled', { product: 'pack2', atMs: T0 }, ev);
    settleState(cfg, g, 'declined', { product: 'pack2', atMs: T0 + 1 }, ev);
    expect(ev).toEqual([
      { type: 'quoteWithdrawn', product: 'pack2', atMs: T0, why: 'cancelled' },
      { type: 'quoteWithdrawn', product: 'pack2', atMs: T0 + 1, why: 'refused' },
    ]);
    expect(out('cancelled', T0 + 99)).toBe(g);
    g = settle(g, 'pending', 'pack2', T0 + 1);
    expect(pending(g)).toEqual([['pack2', 'open', T0], ['pack2', 'waiting', T0 + 1]]);
    expect(settle(g, 'pending', 'pack2', T0 + 1)).toBe(g);
  });

  it('a cancel shows nothing: no line on the row (the row is an offer again)', () => {
    const g = settle(quote(g0(), 'pack2', T0), 'cancelled', 'pack2', T0);
    const row = cardOf(cfg, g, { kind: 'shop' }, T0, US).shop!.packs![0];
    expect(row).toMatchObject({ state: 'offer', updated: null });
    expect(cardOf(cfg, g, { kind: 'shop' }, T0, US).shop!.expired).toBe(false);
  });
});

describe('the grant (2.15.5, 15.5): who gets an arriving purchase', () => {
  it("the sheet's own result goes to its own quote at the S on the row, however late; cash += S exactly through credit (granted:c), the ledger gains it, the bank takes nothing", () => {
    const g = quote(g0(), 'pack2', T0);
    const out = arrive(g, 'pack2', 'tx1', { atMs: T0 });
    expect(out.cash).toBe(g.cash + S2);
    expect(out.salvage.iap.pending).toEqual([]);
    expect(out.salvage.iap.ledger).toEqual([{ txId: 'tx1', product: 'pack2', S: S2, atMs: T0, quote: 'q1' }]);
    expect(out.salvage.counts!['granted:c']).toBe((g.salvage.counts!['granted:c'] ?? 0) + Math.round(S2 * 100));
    expect(out.lifetimeEarnings).toBeCloseTo((g.lifetimeEarnings ?? 0) + S2, 2);
  });

  it('a later arrival goes to the OLDEST standing quote of its product whose known lacks it (the list order, never atMs); none: not granted', () => {
    // Two waiting quotes whose atMs are out of order (the clock set back two days before the second).
    let g = settle(quote(g0(), 'pack2', T0), 'pending', 'pack2', T0);
    g = settle(quote(g, 'pack2', T0 - 2 * DAY), 'pending', 'pack2', T0 - 2 * DAY);
    expect(pending(g).map((p) => p[2])).toEqual([T0, T0 - 2 * DAY]);
    const out = arrive(g, 'pack2', 'tx-first-approved');
    expect(out.salvage.iap.ledger.map((l) => [l.txId, l.atMs])).toEqual([['tx-first-approved', T0]]);
    expect(pending(out).map((p) => p[2])).toEqual([T0 - 2 * DAY]);
    // known: the oldest whose known lacks the id
    const k = quote(quote(g0(), 'pack2', T0, ['old']), 'pack2', T0 + 1, []);
    expect(arrive(k, 'pack2', 'old').salvage.iap.ledger.map((l) => l.atMs)).toEqual([T0 + 1]);
    // no standing quote: another save's purchase
    const none = g0();
    expect(arrive(none, 'pack2', 'tx-elsewhere')).toBe(none);
  });

  it('never twice by id, through the listener and the check at start alike; never with an id in its known', () => {
    const g = arrive(quote(g0(), 'pack2', T0), 'pack2', 'tx1', { atMs: T0 });
    const again = quote(g, 'pack2', T0 + 1);
    expect(arrive(again, 'pack2', 'tx1')).toBe(again);
    expect(arrive(again, 'pack2', 'tx1', { atMs: T0 + 1 })).toBe(again);
    const k = quote(g0(), 'pack2', T0, ['tx-before']);
    expect(arrive(k, 'pack2', 'tx-before')).toBe(k);
    expect(arrive(k, 'pack2', 'tx-before', { atMs: T0 })).toBe(k);
  });

  it('no clock decides a grant: a save created with the clock a day ahead (or behind) loses nothing and gains nothing; purchasedMs is information', () => {
    for (const createdMs of [T0 + DAY, T0 - DAY]) {
      const g = { ...g0(), salvage: { ...g0().salvage, iap: { ...g0().salvage.iap, createdMs } } };
      const q = quote(g, 'pack2', T0);
      const out = salvageEngineMode.grantProduct!(cfg as unknown as GameConfig, q as GameState, { productId: 'pack2', txId: 'tx-real', purchasedMs: T0 - 10 * DAY, own: { atMs: T0 } }) as SalvageGame;
      expect(out.cash).toBe(q.cash + S2);
    }
  });

  it('rewards and grants never repay: with an agreement open, a grant leaves `taken` as it was', () => {
    const base = quote(g0(), 'pack2', T0);
    const g = { ...base, salvage: { ...base.salvage, bank: { ...base.salvage.bank, agreement: { kind: 'bank' as const, plate: 'shear', P: 1000, F: 800, c: 64, T: 864, taken: 10, signedAt: 0, I: 100 } } } };
    const out = arrive(g, 'pack2', 'tx1', { atMs: T0 });
    expect(out.salvage.bank.agreement!.taken).toBe(10);
    expect(out.cash).toBe(g.cash + S2);
  });
});

describe("ruling 15's stories on the real mode (the shared store's six attack cases A1 to B3, and 15.12's A to E)", () => {
  it("A1: another pack's listed transaction arrives while a sheet is open (held), the sheet is cancelled: no scrip; the waiting pack 5's quote still stands for its approval", () => {
    const cash0 = 0;
    // pack 5 cannot be quoted inside this yard's headroom: a yard with a larger U is the same rule; use pack 2 twice under two products' names is not possible, so the waiting quote is put in by hand at its S.
    let g = g0();
    g = { ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap, pending: [{ id: 'q9', product: 'pack5', S: S5, I: 1, atMs: T0 - 1, askedMs: T0 - 1, known: [], state: 'waiting', wait: 'pending' }] } } };
    g = quote(g, 'pack2', T0, []);
    // the arrival is held by the store while the sheet is open; the sheet is cancelled; then it is replayed as a later arrival
    g = settle(g, 'cancelled', 'pack2', T0);
    g = listing(g, [['pack2', 'rc-other']], false, T0);
    expect(g.cash).toBe(cash0);
    expect(g.salvage.iap.pending.map((q) => q.product)).toEqual(['pack5']);
    g = listing(g, [['pack2', 'rc-other'], ['pack5', 'tx-pack5']], false, T0);
    expect(g.cash).toBe(cash0 + S5);
  });

  it('A2: the clock a day behind at creation; killed at the sheet (nothing paid): the next start does not grant the quote with an older purchase it knew', () => {
    let g = { ...g0(), salvage: { ...g0().salvage, iap: { ...g0().salvage.iap, createdMs: T0 - DAY } } };
    g = quote(g, 'pack2', T0, ['rc-earlier']);
    const after = listing(g, [['pack2', 'rc-earlier']], true, T0 + HOUR_MS);
    expect(after.cash).toBe(g.cash);
    expect(pending(after)).toEqual([['pack2', 'open', T0]]);
  });

  it('A3: the purchase result and the listing name one purchase with two ids: one payment, one grant', () => {
    let g = quote(g0(), 'pack2', T0, []);
    g = arrive(g, 'pack2', 'o1_abcdef', { atMs: T0 }); // the store hands the id NEW in the listing, not the result's GPA id
    const cash1 = g.cash;
    g = quote(g, 'pack2', T0 + 1, ['o1_abcdef']); // the next Buy, killed at the sheet
    g = listing(g, [['pack2', 'o1_abcdef']], true, T0 + 2);
    expect(g.cash).toBe(cash1);
    expect(g.salvage.iap.ledger.map((l) => l.txId)).toEqual(['o1_abcdef']);
  });

  it('B1: a store error that may follow a charge keeps the quote WAITING ("not confirmed", never "Nothing was charged"); the later arrival is granted to it', () => {
    let g = settle(quote(g0(), 'pack2', T0), 'unconfirmed', 'pack2', T0);
    expect(g.salvage.iap.pending[0]).toMatchObject({ state: 'waiting', wait: 'unconfirmed' });
    g = listing(g, [['pack2', 'tx-charged']], false, T0 + 1);
    expect(g.cash).toBe(S2);
  });

  it("B2: the clock a day ahead when the save was created, then set right: this save's own sheet is granted", () => {
    const g = quote({ ...g0(), salvage: { ...g0().salvage, iap: { ...g0().salvage.iap, createdMs: T0 + DAY } } }, 'pack2', T0);
    expect(arrive(g, 'pack2', 'tx-real', { atMs: T0 }).cash).toBe(S2);
  });

  it('B3: a look or No ad videos is not the mode\'s to grant (the shared entitlements are); once the entitlements hold it the shop shows it owned, with Use', () => {
    const g = g0();
    expect(arrive(g, 'colour2', 'tx-look')).toBe(g);
    const owned = { ...g, entitlements: { noAds: false, skipRewarded: false, products: ['colour2'], multipliers: {} } } as SalvageGame;
    const row = cardOf(cfg, owned, { kind: 'shop' }, T0, US).shop!.looks.find((l) => l.product === 'colour2')!;
    expect(row).toMatchObject({ owned: true, inUse: false, button: { action: { act: 'chooseLook', slot: 'colour', id: 'colour2' } } });
  });

  it('15.12 A: an approval waits; the device clock goes three days forward; a fresh listing only an hour later by the STORE\'s clock withdraws nothing; the approval is granted at its S', () => {
    let g = settle(quote(g0(), 'pack2', T0, [], T0 - 5 * 60_000), 'pending', 'pack2', T0);
    g = listing(g, [], true, T0 - 5 * 60_000 + HOUR_MS, T0 + 3 * DAY + HOUR_MS);
    expect(pending(g)).toEqual([['pack2', 'waiting', T0]]);
    g = listing(g, [['pack2', 'tx-parent-approved']], false, null);
    expect(g.salvage.iap.ledger.map((l) => [l.txId, l.S, l.atMs])).toEqual([['tx-parent-approved', S2, T0]]);
  });

  it("15.12 B: a sheet paid and the app killed before the store lists it; a new Buy (S changed meanwhile) is cancelled; the first payment then arrives: granted at the FIRST quote's S", () => {
    let g = quote(g0(), 'pack2', T0);
    const S1 = g.salvage.iap.pending[0].S;
    // the yard's I moved (an asset bought): the second quote's S differs; quote at the S shown now
    g = { ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap, pending: g.salvage.iap.pending.map((q) => ({ ...q, S: S1 })) } } };
    const g2 = quotePack(cfg, g, 'pack2', S2, T0 + HOUR_MS, [], T0 + HOUR_MS, 0, undefined, US);
    const cancelled = settle(g2, 'cancelled', 'pack2', T0 + HOUR_MS);
    expect(pending(cancelled)).toEqual([['pack2', 'open', T0]]);
    const out = listing(cancelled, [['pack2', 'tx-paid-at-the-killed-sheet']], false, null);
    expect(out.salvage.iap.ledger.map((l) => [l.S, l.atMs])).toEqual([[S1, T0]]);
  });

  it('15.12 D (the mode\'s half): no listing, no quote: nothing stands and nothing can be granted', () => {
    const g = g0();
    expect(arrive(g, 'pack2', 'tx-live')).toBe(g);
  });

  it('the 72 hours: a FRESH listing whose requestMs is at least 72 h after a quote\'s askedMs withdraws every quote still standing after its arrivals are routed (quoteWithdrawn expired; the shop card\'s one line until closed); a listener\'s listing, requestMs null and a younger quote never; now is never read', () => {
    let g = settle(quote(g0(), 'pack2', T0, [], T0), 'pending', 'pack2', T0);
    g = quote(g, 'pack2', T0 + WAIT_MS, [], T0 + 70 * HOUR_MS); // a younger quote (store time)
    expect(listing(g, [], false, T0 + EXPIRE_MS)).toBe(g);
    expect(listing(g, [], true, null)).toBe(g);
    expect(listing(g, [], true, T0 + EXPIRE_MS - 1, 0)).toBe(g);
    const ev: SalvageEvent[] = [];
    const out = expireState(cfg, g, { txs: [], fresh: true, requestMs: T0 + EXPIRE_MS }, Number.NaN, ev);
    expect(pending(out)).toEqual([['pack2', 'open', T0 + WAIT_MS]]);
    expect(ev).toEqual([{ type: 'quoteWithdrawn', product: 'pack2', atMs: T0, why: 'expired' }]);
    expect(cardOf(cfg, out, { kind: 'shop' }, T0, US).shop!.expired).toBe(true);
    // its arrival in that same listing is routed first: granted, nothing withdrawn
    const routed = listing(g, [['pack2', 'tx-just-in-time']], true, T0 + EXPIRE_MS);
    expect(routed.salvage.iap.ledger).toHaveLength(1);
    expect(routed.salvage.iap.expired ?? []).toEqual([]);
    // closing the shop card (noteSeen {card: 'shop'}) clears the line
    expect(cardOf(cfg, noteSeen(cfg, out, { card: 'shop' }, 0), { kind: 'shop' }, T0, US).shop!.expired).toBe(false);
  });

  it('the store\'s QuoteFn closure (quoteFn) quotes the product at the S on the row with the country the shop was opened with', () => {
    const f = quoteFn('pack2', S2, US);
    expect(pending(f(cfg, g0(), T0, [], T0))).toEqual([['pack2', 'open', T0]]);
    const off = quoteFn('pack2', S2, { country: null });
    const g = g0();
    expect(off(cfg, g, T0, [], T0)).toBe(g);
  });
});

describe('who sees packs (2.15.2, 2.15.3; P1, P8, P13, P17)', () => {
  it('pack rows only at rung ≥ 4, a known country not in packsOff, the band a18, not hidden; else no header and no word (packs null)', () => {
    const shop = (g: SalvageGame, country: string | null) => cardOf(cfg, g, { kind: 'shop' }, T0, { country }).shop!;
    expect(shop(g0(), 'US').packs).not.toBeNull();
    expect(shop(g0(), 'us').packs).not.toBeNull();
    for (const c of ['DE', 'CH', 'NO', null]) expect(shop(g0(), c).packs).toBeNull();
    const r3 = { ...g0(), salvage: { ...g0().salvage, ladder: { ...g0().salvage.ladder, rung: 3 } } };
    expect(shop(r3, 'US').packs).toBeNull();
    expect(shop(shopGame({ ageBand: 't13', cash: 0 }), 'US').packs).toBeNull();
    const hidden = { ...g0(), salvage: { ...g0().salvage, iap: { ...g0().salvage.iap, hidden: { codeHash: codeHash('1234') } } } };
    expect(shop(hidden, 'US').packs).toBeNull();
  });

  it('the age question is due the first time a pack row would show (no band kept); it keeps a band, never the year; asked once', () => {
    const noBand = shopGame({ ageBand: null, cash: 0 });
    expect(cardOf(cfg, noBand, { kind: 'shop' }, T0, US).shop!).toMatchObject({ askAge: true, packs: null });
    expect(cardOf(cfg, noBand, { kind: 'shop' }, T0, { country: 'DE' }).shop!.askAge).toBe(false);
    expect(cardOf(cfg, noBand, { kind: 'ageQuestion' }, T0, US).ageQuestion).toEqual({ minYear: 1900, maxYear: 2026 });
    const ev: SalvageEvent[] = [];
    const a = setAgeBand(cfg, noBand, 1990, T0, 0, ev);
    expect(a.salvage.iap.ageBand).toBe('a18');
    expect(JSON.stringify(a.salvage.iap)).not.toContain('1990');
    expect(ev).toEqual([{ type: 'ageAsked' }]);
    expect(setAgeBand(cfg, a, 2020, T0, 0)).toBe(a);
    const bad: SalvageEvent[] = [];
    expect(setAgeBand(cfg, noBand, 1899, T0, 0, bad)).toBe(noBand);
    expect(setAgeBand(cfg, noBand, 2027, T0, 0, bad)).toBe(noBand);
    expect(bad.map((e) => e.type === 'refused' && e.key)).toEqual(['badYear', 'badYear']);
  });

  it('the band follows the younger of the two ages a year gives (2026: born 2013 is under 13, 2012 is 13 to 17, 2008 is 13 to 17, 2007 is 18 or over)', () => {
    expect([2026, 2014, 2013, 2012, 2009, 2008, 2007, 1950].map((y) => ageBandOf(y, T0))).toEqual(['u13', 'u13', 'u13', 't13', 't13', 't13', 'a18', 'a18']);
  });

  it('from u13 no CardData has a shop entry; ad requests child-treated, t13 teen-treated', () => {
    const g = u13Game();
    const walk = (cd: ReturnType<typeof cardOf>) => JSON.stringify(cd);
    for (const ref of [{ kind: 'office', tab: 'rota' }, { kind: 'settings' }, { kind: 'shop' }, { kind: 'packSheet', product: 'pack2' }, { kind: 'help' }] as const) {
      const cd = cardOf(cfg, g, ref, T0, US);
      expect(cd.shop, ref.kind).toBeUndefined();
      expect(walk(cd), ref.kind).not.toMatch(/"card":\{"kind":"shop"|buyPack|buyProduct|restorePurchases|setPacksHidden/);
    }
    expect(salvageEngineMode.adAudience!(cfg as unknown as GameConfig, g as GameState)).toBe('child');
    expect(salvageEngineMode.adAudience!(cfg as unknown as GameConfig, shopGame({ ageBand: 't13' }) as GameState)).toBe('teen');
    expect(salvageEngineMode.adAudience!(cfg as unknown as GameConfig, g0() as GameState)).toBeNull();
  });

  it('the Settings switch stands from the second session where the country is on, whatever the rung; not for u13 or t13; Help\'s pages on packs and the code only where the country is on', () => {
    const rows = (g: SalvageGame, country: string | null, kind: 'settings' | 'help' = 'settings') => cardOf(cfg, g, { kind }, T0, { country }).rows.map((r) => r.id).filter((id) => id.startsWith('money.'));
    const r2 = { ...g0(), salvage: { ...g0().salvage, ladder: { ...g0().salvage.ladder, rung: 2 } } };
    expect(rows(r2, 'US')).toEqual(['money.shop', 'money.packs']);
    expect(rows(g0(), 'DE')).toEqual(['money.shop']);
    expect(rows(g0(), null)).toEqual(['money.shop']);
    expect(rows(shopGame({ ageBand: 't13' }), 'US')).toEqual(['money.shop']);
    expect(rows(u13Game(), 'US')).toEqual([]);
    expect(rows(g0(), 'US', 'help')).toEqual(['money.packs', 'money.packsHour', 'money.code', 'money.packLost']);
    expect(rows(g0(), 'DE', 'help')).toEqual([]);
    expect(rows(g0(), null, 'help')).toEqual([]);
    expect(rows(u13Game(), 'US', 'help')).toEqual([]);
  });

  it('the code: hiding keeps a hash (never the digits); showing again asks for it (a wrong one: packCode); four digits only', () => {
    const ev: SalvageEvent[] = [];
    const hid = setPacksHidden(cfg, g0(), true, '4821', 0, ev);
    expect(hid.salvage.iap.hidden).toEqual({ codeHash: codeHash('4821') });
    expect(JSON.stringify(hid.salvage.iap)).not.toContain('4821');
    expect(setPacksHidden(cfg, hid, false, '0000', 0, ev)).toBe(hid);
    expect(setPacksHidden(cfg, g0(), true, '12a4', 0, ev)).toEqual(g0());
    expect(ev.filter((e) => e.type === 'refused').map((e) => e.type === 'refused' && e.key)).toEqual(['packCode', 'packCode']);
    expect(setPacksHidden(cfg, hid, false, '4821', 0).salvage.iap.hidden).toBeNull();
    expect(setPacksHidden(cfg, u13Game(), true, '4821', 0)).toEqual(u13Game());
  });
});

describe('the state', () => {
  it('pending quotes, the ledger, the band, the hidden code, the expired line and the deferred offer survive a save and a reload', () => {
    let g = settle(quote(g0(), 'pack2', T0, ['k1'], T0 - 3), 'unconfirmed', 'pack2', T0);
    g = arrive(quote(g, 'pack2', T0 + 1), 'pack2', 'tx9', { atMs: T0 + 1 });
    g = { ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap, hidden: { codeHash: codeHash('1234') }, expired: [{ product: 'pack5', atMs: 7 }] }, ads: { ...g.salvage.ads, awayOffer: { amount: 12, I: 100, centred: false } } } };
    const r = reload(g);
    expect(r.salvage.iap).toEqual(g.salvage.iap);
    expect(r.salvage.ads.awayOffer).toEqual({ amount: 12, I: 100, centred: false });
  });
});
