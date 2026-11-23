/**
 * Budget slips, the purchases of 2.6, the reserve and the Ledger (2.5, 2.6, 2.7 "Budget slips",
 * 4.4). Package P1a (docs/design/office-build-plan.md).
 *
 * 1.0 s after desk and tray become empty, Gwendolyn Abacus slides advice()'s purchase onto the desk
 * if it is affordable above the reserve ("Benches & Bandstands +1 level · −120 · +8/s"); up buys it at
 * the printed price, down puts it back; a visitor's arrival returns an undragged slip. Every purchase
 * other than a paper keeps back the reserve, the sign cost of the desk paper plus the next waiting
 * one ("Kept for the desk: 540"), and is refused when it would cut into it. A purchase that would
 * change nothing is refused (merge M45). D16: from the call day C until the count the reserve also
 * keeps back what the run-up can ask (K campaign papers and the rally at their prices), "Kept for the
 * run-up"; a slip on an empty desk with an empty tray keeps back desk.slipReserveSeconds of B. D18: a
 * slip may land between two papers (after a commit, a paper waiting, a purchase affordable above the
 * reserve, no slip since the last decided paper: `DecreeState.slipOffered`), at most one per paper.
 *
 * SEAM: `slipFor` reads advice.ts (P1b) `advice(...).slip`; `reserve` / `reserveParts` are read by
 * advice.ts, the Standing Order (grants.ts, P1b) and the Ledger; `buy` is the one purchase path
 * (Ledger "Raise", slips, the Standing Order, the monument); `ledger` reads ministers.ts (P1b)
 * `cabinet` for each row's minister and strike state for its picket. `slipFor` is called by tick.ts
 * (P1b: 1.0 s after the desk and tray empty) and by decide.ts `commitItem` step 5 (D18).
 */
import { notBuilt } from './notBuilt';
import type { DecreeConfig, DecreeEvent, DecreeGame, Ledger, Purchase, Slip } from './types';

/** "Kept for the desk": the sign cost of the desk paper plus the next waiting one (2.6). Skeleton: throws notBuilt. */
export function reserve(cfg: DecreeConfig, g: DecreeGame): number {
  return notBuilt('reserve');
}

/** The two parts of the reserve (2.6, D16): "Kept for the desk" and "Kept for the run-up" (0 outside day C to the count). Skeleton: throws notBuilt. */
export function reserveParts(cfg: DecreeConfig, g: DecreeGame): { desk: number; runUp: number } {
  return notBuilt('reserveParts');
}

/** The slip that would land now (advice's purchase, affordable above the reserve), or null. Skeleton: throws notBuilt. */
export function slipFor(cfg: DecreeConfig, g: DecreeGame): Slip | null {
  return notBuilt('slipFor');
}

/**
 * The one purchase path: `purchase` at `price` (a slip's printed price; null: the live price) if
 * affordable above the reserve and not void; the same object when refused. Skeleton: throws notBuilt.
 */
export function buy(cfg: DecreeConfig, g: DecreeGame, purchase: Purchase, price: number | null, events: DecreeEvent[]): DecreeGame {
  return notBuilt('buy');
}

/** 2.6 `raise(i)`: the Ledger's untaught button, ministry i +1 level at the live price. Skeleton: throws notBuilt. */
export function raise(cfg: DecreeConfig, g: DecreeGame, ministry: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('raise');
}

/** 2.6 `openMinistry(i)`. Skeleton: throws notBuilt. */
export function openMinistry(cfg: DecreeConfig, g: DecreeGame, ministry: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('openMinistry');
}

/** 2.6 `buyVanity()`: this term's monument (5.8), ×1.02 income for good. Skeleton: throws notBuilt. */
export function buyVanity(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  return notBuilt('buyVanity');
}

/** The Ledger's rows (4.4): level, storeys, rate, club, minister, picket, price, why "Raise" is refused; the record; the reserve. Skeleton: throws notBuilt. */
export function ledger(cfg: DecreeConfig, g: DecreeGame): Ledger {
  return notBuilt('ledger');
}
