/**
 * THE SHOP'S RULES (stage 2, docs/design/yard-stage2.md 2.15; RULING2.md 15 to 15.13): the quote of a
 * scrip pack, the pending list (`iap.pending`, oldest = the list's order), headroom, the grant to the
 * right quote (shown equals applied), the ledger, the 24-hour refusal and the 72-hour withdrawal on the
 * store's clock, the age band, the code's hash, `iap.sessions2At`. Granted scrip goes through
 * `clock.ts credit(x, S, t, 'grant')`, never a lot payment. Owner: rules-money (Phase B).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no product is quoted or granted; each hook returns the SAME
 * state object (the shared store's "nothing changed"). The loop does not call this file: the mode's entry
 * (salvageMode.ts, rules-money's) hands these to the shared store.
 */
import type { ProductArrival, ProductListing, QuoteOutcome, SalvageConfig, SalvageGame } from './types';

/** The mode's quote at Buy (the shared store's QuoteFn). Stub: refused (the same object). */
export function quote(cfg: SalvageConfig, g: SalvageGame, now: number, known: readonly string[], askedMs: number): SalvageGame {
  void cfg;
  void now;
  void known;
  void askedMs;
  return g;
}

/** The sheet's outcome told to its quote (the shared store's SettleFn). Stub: nothing stands. */
export function settle(cfg: SalvageConfig, g: SalvageGame, outcome: QuoteOutcome, q: { product: string; atMs: number }): SalvageGame {
  void cfg;
  void outcome;
  void q;
  return g;
}

/** A purchase arriving (EngineMode.grantProduct). Stub: not this save's. */
export function grantProduct(cfg: SalvageConfig, g: SalvageGame, arrival: ProductArrival): SalvageGame {
  void cfg;
  void arrival;
  return g;
}

/** After every listing (EngineMode.afterListing): the 72 hours on the store's request time. Stub: nothing withdrawn. */
export function afterListing(cfg: SalvageConfig, g: SalvageGame, listing: ProductListing, now: number): SalvageGame {
  void cfg;
  void listing;
  void now;
  return g;
}
